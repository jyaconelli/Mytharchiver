begin;

create table if not exists public.canonicalization_runs (
  id uuid primary key default gen_random_uuid(),
  myth_id uuid not null references public.myth_folders(id) on delete cascade,
  mode text not null,
  params jsonb not null default '{}'::jsonb,
  assignments jsonb not null default '[]'::jsonb,
  prevalence jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  diagnostics jsonb not null default '{}'::jsonb,
  artifacts jsonb,
  status text not null default 'running' check (status in ('queued','running','succeeded','failed')),
  error_message text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists canonicalization_runs_myth_created_idx
  on public.canonicalization_runs (myth_id, created_at desc);

alter table if exists public.myth_folders
  add column if not exists last_canonical_run_id uuid references public.canonicalization_runs(id);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

do $$
begin
  create trigger canonicalization_runs_set_updated_at
    before update on public.canonicalization_runs
    for each row execute function public.set_updated_at_timestamp();
exception
  when duplicate_object then null;
end $$;

alter table public.canonicalization_runs enable row level security;

create policy "Owners can read canonicalization runs"
  on public.canonicalization_runs
  for select
  using (
    exists (
      select 1
      from public.myth_folders mf
      where mf.id = canonicalization_runs.myth_id
        and mf.user_id = auth.uid()
    )
  );

commit;
