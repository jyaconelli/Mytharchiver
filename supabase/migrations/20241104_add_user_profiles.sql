begin;

create table if not exists public.user_profiles (
  email text primary key,
  display_name text,
  avatar_url text,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists user_profiles_email_lower_idx
  on public.user_profiles (lower(email));

alter table public.user_profiles enable row level security;

do $$
begin
  create policy "Public profiles are readable"
    on public.user_profiles
    for select
    using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users manage their profile"
    on public.user_profiles
    for all
    using (lower(email) = lower(current_setting('request.jwt.claim.email', true)))
    with check (lower(email) = lower(current_setting('request.jwt.claim.email', true)));
exception
  when duplicate_object then null;
end $$;

commit;
