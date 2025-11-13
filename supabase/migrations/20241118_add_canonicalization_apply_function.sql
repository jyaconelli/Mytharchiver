begin;

create or replace function public.canonicalization_apply_run(
  p_run_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_myth_id uuid;
  v_owner_id uuid;
  v_assignments jsonb;
  v_category_labels jsonb;
  v_variant_ids text[];
  v_new_category_names text[] := '{}'::text[];
  v_index integer := 0;
  v_category_id uuid;
  v_label text;
  v_plot_point_ids text[];
  v_group record;
begin
  select myth_id, assignments, category_labels
  into v_myth_id, v_assignments, v_category_labels
  from public.canonicalization_runs
  where id = p_run_id and status = 'succeeded';

  if v_myth_id is null then
    raise exception 'Canonicalization run not found or incomplete';
  end if;

  select user_id into v_owner_id from public.myth_folders where id = v_myth_id;
  if v_owner_id is null or v_owner_id <> auth.uid() then
    raise exception 'Not authorized to apply canonical categories for this myth';
  end if;

  v_assignments := coalesce(v_assignments, '[]'::jsonb);
  v_category_labels := coalesce(v_category_labels, '{}'::jsonb);

  if jsonb_array_length(v_assignments) = 0 then
    raise exception 'Canonicalization run has no assignments to apply';
  end if;

  select array_agg(id) into v_variant_ids from public.myth_variants where myth_id = v_myth_id;
  if v_variant_ids is null or array_length(v_variant_ids, 1) = 0 then
    raise exception 'Myth has no variants to update';
  end if;

  update public.myth_plot_points
    set canonical_category_id = null
  where variant_id = any(v_variant_ids);

  delete from public.myth_categories where myth_id = v_myth_id;

  for v_group in
    select canonical_id, plot_point_ids, size
    from (
      select
        canonical_id,
        array_agg(plot_point_id) as plot_point_ids,
        count(*) as size
      from (
        select
          assignment->>'canonicalId' as canonical_id,
          assignment->>'plotPointId' as plot_point_id
        from jsonb_array_elements(v_assignments) as assignment
        where assignment ? 'canonicalId'
          and assignment ? 'plotPointId'
          and coalesce(assignment->>'canonicalId', '') <> ''
          and coalesce(assignment->>'plotPointId', '') <> ''
      ) parsed
      group by canonical_id
    ) grouped
    order by size desc, canonical_id
  loop
    v_index := v_index + 1;
    v_plot_point_ids := v_group.plot_point_ids;

    v_label := coalesce(
      nullif(v_category_labels ->> v_group.canonical_id, ''),
      format('Category %s', v_index)
    );

    insert into public.myth_categories (myth_id, name, sort_order)
      values (v_myth_id, v_label, v_index - 1)
      returning id into v_category_id;

    v_new_category_names := array_append(v_new_category_names, v_label);

    if v_plot_point_ids is not null and array_length(v_plot_point_ids, 1) > 0 then
      update public.myth_plot_points
        set canonical_category_id = v_category_id,
            category = v_label
      where id = any(v_plot_point_ids);
    end if;
  end loop;

  if v_index = 0 then
    raise exception 'Canonicalization run has no canonical groups to apply';
  end if;

  update public.myth_folders
    set categories = coalesce(v_new_category_names, '{}'),
        last_canonical_run_id = p_run_id
    where id = v_myth_id;
end;
$$;

comment on function public.canonicalization_apply_run is 'Owners can persist canonical categories from a selected run to myth categories and plot points.';

commit;
