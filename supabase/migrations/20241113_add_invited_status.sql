begin;

alter table public.myth_contribution_requests
  alter column status set default 'invited';

alter table public.myth_contribution_requests
  drop constraint if exists myth_contribution_requests_status_check;

alter table public.myth_contribution_requests
  add constraint myth_contribution_requests_status_check
  check (status in ('invited', 'draft', 'submitted', 'expired'));

update public.myth_contribution_requests
set status = 'invited'
where status = 'draft'
  and submitted_variant_id is null
  and draft_payload = '{"name":"","source":"","plotPoints":[]}'::jsonb;

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
  update public.myth_contribution_requests as r
  set draft_payload = normalized_payload,
      updated_at = timezone('utc', now()),
      status = case when r.status = 'invited' then 'draft' else r.status end
  where r.token = p_token
    and r.status in ('invited', 'draft')
  returning r.id as request_id, r.updated_at;
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

  if request_record.status not in ('draft', 'invited') then
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

commit;
