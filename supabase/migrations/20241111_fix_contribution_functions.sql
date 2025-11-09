begin;

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
    r.updated_at as updated_at
  from public.myth_contribution_requests as r
  join public.myth_folders as m on m.id = r.myth_id
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
  update public.myth_contribution_requests as r
  set draft_payload = normalized_payload,
      updated_at = timezone('utc', now())
  where r.token = p_token
    and r.status = 'draft'
  returning r.id as request_id, r.updated_at;
end;
$$;

commit;
