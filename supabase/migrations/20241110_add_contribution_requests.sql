begin;

alter table if exists public.myth_folders
  add column if not exists contributor_instructions text not null default '';

create table if not exists public.myth_contribution_requests (
  id uuid primary key default gen_random_uuid(),
  myth_id uuid not null references public.myth_folders(id) on delete cascade,
  email text not null,
  token uuid not null default gen_random_uuid(),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'expired')),
  draft_payload jsonb not null default '{"name":"","source":"","plotPoints":[]}'::jsonb,
  submitted_variant_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists myth_contribution_requests_token_idx
  on public.myth_contribution_requests (token);

create index if not exists myth_contribution_requests_myth_id_idx
  on public.myth_contribution_requests (myth_id);

alter table public.myth_contribution_requests enable row level security;

create policy "Owners read contribution requests"
  on public.myth_contribution_requests
  for select
  using (
    auth.uid() = (
      select user_id from public.myth_folders where id = myth_contribution_requests.myth_id
    )
  );

create policy "Owners insert contribution requests"
  on public.myth_contribution_requests
  for insert
  with check (
    auth.uid() = (
      select user_id from public.myth_folders where id = myth_contribution_requests.myth_id
    )
  );

create policy "Owners update contribution requests"
  on public.myth_contribution_requests
  for update
  using (
    auth.uid() = (
      select user_id from public.myth_folders where id = myth_contribution_requests.myth_id
    )
  )
  with check (
    auth.uid() = (
      select user_id from public.myth_folders where id = myth_contribution_requests.myth_id
    )
  );

create policy "Owners delete contribution requests"
  on public.myth_contribution_requests
  for delete
  using (
    auth.uid() = (
      select user_id from public.myth_folders where id = myth_contribution_requests.myth_id
    )
  );

create or replace function public.get_contribution_request(p_token uuid)
returns table (
  request_id uuid,
  myth_id uuid,
  email text,
  status text,
  draft_payload jsonb,
  myth_name text,
  myth_description text,
  contributor_instructions text,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    r.id as request_id,
    r.myth_id,
    r.email,
    r.status,
    r.draft_payload,
    coalesce(m.name, '') as myth_name,
    coalesce(m.description, '') as myth_description,
    coalesce(m.contributor_instructions, '') as contributor_instructions,
    r.updated_at
  from public.myth_contribution_requests r
  join public.myth_folders m on m.id = r.myth_id
  where r.token = p_token;
$$;

create or replace function public.save_contribution_draft(p_token uuid, p_payload jsonb)
returns table (
  request_id uuid,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  incoming jsonb;
  normalized_payload jsonb;
begin
  incoming := coalesce(p_payload, '{}'::jsonb);
  normalized_payload := jsonb_build_object(
    'name', coalesce(incoming->>'name', ''),
    'source', coalesce(incoming->>'source', ''),
    'plotPoints', coalesce(incoming->'plotPoints', '[]'::jsonb)
  );

  return query
  update public.myth_contribution_requests
  set draft_payload = normalized_payload,
      updated_at = timezone('utc', now())
  where token = p_token
    and status = 'draft'
  returning id, updated_at;
end;
$$;

create or replace function public.submit_contribution_request(p_token uuid)
returns table (variant_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  request_record public.myth_contribution_requests%rowtype;
  next_position integer := 1;
  plot_points jsonb;
  point_record jsonb;
  new_variant_id text;
  target_sort_order integer;
begin
  select * into request_record
  from public.myth_contribution_requests
  where token = p_token
  for update;

  if not found then
    raise exception 'Invalid contribution link';
  end if;

  if request_record.status <> 'draft' then
    return query select coalesce(request_record.submitted_variant_id, '');
  end if;

  select coalesce(max(sort_order), -1) + 1
  into target_sort_order
  from public.myth_variants
  where myth_id = request_record.myth_id;

  new_variant_id := gen_random_uuid()::text;

  insert into public.myth_variants (id, myth_id, name, source, sort_order)
  values (
    new_variant_id,
    request_record.myth_id,
    coalesce(request_record.draft_payload->>'name', ''),
    coalesce(request_record.draft_payload->>'source', ''),
    target_sort_order
  );

  plot_points := coalesce(request_record.draft_payload->'plotPoints', '[]'::jsonb);
  next_position := 1;

  for point_record in
    select value from jsonb_array_elements(plot_points)
  loop
    insert into public.myth_plot_points (
      id,
      variant_id,
      position,
      text,
      category,
      mytheme_refs
    )
    values (
      coalesce(point_record->>'id', gen_random_uuid()::text),
      new_variant_id,
      coalesce((point_record->>'order')::int, next_position),
      coalesce(point_record->>'text', ''),
      'Uncategorized',
      '{}'::text[]
    );
    next_position := next_position + 1;
  end loop;

  update public.myth_contribution_requests
  set status = 'submitted',
      submitted_variant_id = new_variant_id,
      updated_at = timezone('utc', now())
  where id = request_record.id;

  return query select new_variant_id;
end;
$$;

commit;
