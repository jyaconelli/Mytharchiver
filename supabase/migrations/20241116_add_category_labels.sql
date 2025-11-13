begin;

alter table public.canonicalization_runs
  add column if not exists category_labels jsonb not null default '{}'::jsonb;

create or replace function public.canonicalization_set_label(
  p_run_id uuid,
  p_canonical_id text,
  p_label text
)
returns table(run_id uuid, category_labels jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_myth_id uuid;
  v_owner_id uuid;
begin
  select myth_id into v_myth_id from public.canonicalization_runs where id = p_run_id;
  if v_myth_id is null then
    raise exception 'Canonicalization run not found';
  end if;

  select user_id into v_owner_id from public.myth_folders where id = v_myth_id;
  if v_owner_id is null or v_owner_id <> auth.uid() then
    raise exception 'Not authorized to rename categories for this myth';
  end if;

  update public.canonicalization_runs as cr
    set category_labels = jsonb_set(
      coalesce(cr.category_labels, '{}'::jsonb),
      array[p_canonical_id],
      to_jsonb(coalesce(nullif(p_label, ''), format('Category %s', p_canonical_id))),
      true
    )
  where cr.id = p_run_id
  returning cr.id, cr.category_labels
  into run_id, category_labels;

  if run_id is null then
    raise exception 'Failed to update canonicalization run label';
  end if;

  return next;
end;
$$;

comment on function public.canonicalization_set_label is 'Owners can rename canonical categories for a given run.';

commit;
