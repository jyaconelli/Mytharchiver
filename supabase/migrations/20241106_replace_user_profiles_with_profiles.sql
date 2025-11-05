begin;

drop trigger if exists sync_user_profile_from_auth on auth.users;
drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.sync_user_profile_from_auth();
drop function if exists public.handle_new_user();

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email))
  where email is not null;

alter table public.profiles enable row level security;

do $$
begin
  create policy "Profiles are readable"
    on public.profiles
    for select
    using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users manage their profile"
    on public.profiles
    for all
    using (auth.uid() = id)
    with check (auth.uid() = id);
exception
  when duplicate_object then null;
end $$;

insert into public.profiles (id, email, display_name, avatar_url, created_at, updated_at)
select
  u.id,
  case
    when u.email is null then null
    else lower(u.email)
  end as email,
  coalesce(
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name'
  ) as display_name,
  coalesce(
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture'
  ) as avatar_url,
  coalesce(u.created_at, timezone('utc', now())) as created_at,
  timezone('utc', now()) as updated_at
from auth.users u
on conflict (id) do update
  set email = excluded.email,
      display_name = excluded.display_name,
      avatar_url = excluded.avatar_url,
      updated_at = excluded.updated_at;

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profiles_updated_at();

create or replace function public.handle_user_profile_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text;
  display_name text;
  avatar_url text;
begin
  normalized_email := case
    when new.email is null then null
    else lower(new.email)
  end;

  display_name := coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name'
  );

  avatar_url := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );

  insert into public.profiles (id, email, display_name, avatar_url)
  values (new.id, normalized_email, display_name, avatar_url)
  on conflict (id) do update
    set email = coalesce(excluded.email, public.profiles.email),
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

create trigger on_auth_user_changed
  after insert or update on auth.users
  for each row
  execute function public.handle_user_profile_sync();

drop table if exists public.user_profiles;

commit;
