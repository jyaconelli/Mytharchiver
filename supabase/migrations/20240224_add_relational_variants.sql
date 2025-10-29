-- Create relational tables for myth variants and plot points and migrate existing JSON data.
-- Run this migration in Supabase after deploying the updated application code.

begin;

create table if not exists public.myth_variants (
  id text primary key,
  myth_id uuid not null references public.myth_folders(id) on delete cascade,
  name text not null,
  source text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists myth_variants_myth_id_sort_order_idx
  on public.myth_variants (myth_id, sort_order, created_at);

create table if not exists public.myth_plot_points (
  id text primary key,
  variant_id text not null references public.myth_variants(id) on delete cascade,
  position integer not null default 1,
  text text not null,
  category text not null default '',
  mytheme_refs text[] not null default '{}',
  canonical_category_id uuid references public.myth_categories(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists myth_plot_points_variant_position_idx
  on public.myth_plot_points (variant_id, position, created_at);

-- Migrate existing JSON data from myth_folders.variants into the new tables.
with expanded_variants as (
  select
    mf.id as myth_id,
    variant_elem.value as variant_json,
    variant_elem.ordinality - 1 as variant_index
  from public.myth_folders mf
  cross join lateral jsonb_array_elements(coalesce(mf.variants::jsonb, '[]'::jsonb))
    with ordinality as variant_elem(value, ordinality)
),
inserted_variants as (
  insert into public.myth_variants (id, myth_id, name, source, sort_order)
  select
    variant_json->>'id',
    myth_id,
    coalesce(variant_json->>'name', ''),
    coalesce(variant_json->>'source', ''),
    variant_index
  from expanded_variants
  where coalesce(variant_json->>'id', '') <> ''
  on conflict (id) do nothing
),
plot_point_source as (
  select
    variant_json->>'id' as variant_id,
    plot_point_elem.value as plot_point_json,
    row_number() over (
      partition by variant_json->>'id'
      order by coalesce((plot_point_elem.value->>'order')::int, 2147483647),
               plot_point_elem.value->>'id'
    ) as fallback_position
  from expanded_variants
  cross join lateral jsonb_array_elements(coalesce(variant_json->'plotPoints', '[]'::jsonb)) as plot_point_elem(value)
  where coalesce(variant_json->>'id', '') <> ''
)
insert into public.myth_plot_points (
  id,
  variant_id,
  position,
  text,
  category,
  mytheme_refs,
  canonical_category_id
)
select
  plot_point_json->>'id',
  variant_id,
  coalesce((plot_point_json->>'order')::int, fallback_position),
  coalesce(plot_point_json->>'text', ''),
  coalesce(plot_point_json->>'category', ''),
  coalesce(
    (
      select array_agg(value::text)
      from jsonb_array_elements_text(coalesce(plot_point_json->'mythemeRefs', '[]'::jsonb)) as value
    ),
    '{}'::text[]
  ),
  nullif(plot_point_json->>'canonicalCategoryId', '')::uuid
from plot_point_source
where coalesce(plot_point_json->>'id', '') <> ''
on conflict (id) do nothing;

-- Ensure dependent tables reference the new plot point records.
alter table public.myth_plot_point_categories
  alter column plot_point_id type text using plot_point_id::text;

alter table public.myth_collaborator_plot_point_categories
  alter column plot_point_id type text using plot_point_id::text;

-- Remove any orphaned category assignments that no longer have a backing plot point.
delete from public.myth_plot_point_categories mppc
where not exists (
  select 1
  from public.myth_plot_points mpp
  where mpp.id = mppc.plot_point_id
);

delete from public.myth_collaborator_plot_point_categories mcppc
where not exists (
  select 1
  from public.myth_plot_points mpp
  where mpp.id = mcppc.plot_point_id
);

do $$
begin
  alter table public.myth_plot_point_categories
    add constraint myth_plot_point_categories_plot_point_id_fkey
    foreign key (plot_point_id) references public.myth_plot_points(id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.myth_collaborator_plot_point_categories
    add constraint myth_collaborator_plot_point_categories_plot_point_id_fkey
    foreign key (plot_point_id) references public.myth_plot_points(id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

commit;
