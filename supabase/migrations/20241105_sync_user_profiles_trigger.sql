begin;

create or replace function public.sync_user_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  display_name text;
  avatar_url text;
begin
  if tg_op = 'UPDATE' then
    if new.email is not distinct from old.email
      and new.raw_user_meta_data is not distinct from old.raw_user_meta_data then
      return new;
    end if;
  end if;

  normalized_email := lower(new.email);
  if normalized_email is null or length(normalized_email) = 0 then
    return new;
  end if;

  display_name := coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name'
  );

  avatar_url := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );

  insert into public.user_profiles (email, display_name, avatar_url)
  values (normalized_email, display_name, avatar_url)
  on conflict (email) do update
    set display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists sync_user_profile_from_auth on auth.users;

create trigger sync_user_profile_from_auth
after insert or update on auth.users
for each row
execute function public.sync_user_profile_from_auth();

commit;
