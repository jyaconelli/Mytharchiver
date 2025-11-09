begin;

alter table public.myth_variants
  add column if not exists created_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists contributor_email text,
  add column if not exists contributor_name text,
  add column if not exists contributor_type text not null default 'owner' check (contributor_type in ('owner','collaborator','invitee','unknown')),
  add column if not exists contribution_request_id uuid references public.myth_contribution_requests(id) on delete set null;

create index if not exists myth_variants_contributor_email_idx
  on public.myth_variants (lower(contributor_email));

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

  insert into public.myth_variants (
    id,
    myth_id,
    name,
    source,
    sort_order,
    contributor_email,
    contributor_name,
    contributor_type,
    contribution_request_id
  )
  values (
    new_variant_id,
    request_record.myth_id,
    coalesce(request_record.draft_payload->>'name', ''),
    coalesce(request_record.draft_payload->>'source', ''),
    target_sort_order,
    lower(coalesce(request_record.email, '')),
    '',
    'invitee',
    request_record.id
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

create or replace function public.delete_contribution_request_with_variant(p_request_id uuid)
returns table (deleted_request_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  request_record public.myth_contribution_requests%rowtype;
  owner_id uuid;
begin
  select * into request_record
  from public.myth_contribution_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Contribution request not found';
  end if;

  select user_id into owner_id
  from public.myth_folders
  where id = request_record.myth_id;

  if owner_id is null or owner_id <> auth.uid() then
    raise exception 'not_authorized';
  end if;

  if request_record.submitted_variant_id is not null then
    delete from public.myth_variants where id = request_record.submitted_variant_id;
  end if;

  delete from public.myth_contribution_requests where id = p_request_id;

  return query select request_record.id;
end;
$$;

commit;
