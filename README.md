# Myth Archiving Tool

This is a code bundle for Myth Archiving Tool. The original project is available at https://www.figma.com/design/huJUlPLWN9gLJzOmh5EZWB/Myth-Archiving-Tool.

The app now persists data and handles authentication through Supabase.

## Quickstart

1. Install dependencies
   ```bash
   yarn install
   # or: npm install
   ```
2. Configure environment variables (see `.env.example`)
3. Run a development server
   ```bash
   yarn dev
   # or: npm run dev
   ```

## Supabase configuration

Create the following tables in your Supabase project (SQL view → New query):

```sql
create table if not exists public.myth_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  variants jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.mythemes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('character','event','place','object')),
  created_at timestamptz not null default now()
);

create table if not exists public.profile_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  categories text[] not null default array[]::text[],
  updated_at timestamptz not null default now()
);

create table if not exists public.myth_collaborators (
  id uuid primary key default gen_random_uuid(),
  myth_id uuid references public.myth_folders(id) on delete cascade,
  email text not null,
  role text not null check (role in ('viewer','editor','owner')),
  created_at timestamptz not null default now()
);

create unique index if not exists myth_collaborators_myth_email_idx
  on public.myth_collaborators (myth_id, lower(email));
```

Enable Row Level Security on each table and add policies so that authenticated users can manage only their own records, for example:

```sql
alter table public.myth_folders enable row level security;
alter table public.mythemes enable row level security;
alter table public.profile_settings enable row level security;
alter table public.myth_collaborators enable row level security;

create policy "Manage own myth folders"
  on public.myth_folders
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Collaborators can view shared myth folders"
  on public.myth_folders
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.myth_collaborators mc
      where mc.myth_id = myth_folders.id
        and lower(mc.email) = lower(current_setting('request.jwt.claim.email', true))
    )
  );

create policy "Manage own mythemes"
  on public.mythemes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Manage own profile settings"
  on public.profile_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Collaborators can read entries"
  on public.myth_collaborators
  for select using (
    lower(email) = lower(current_setting('request.jwt.claim.email', true))
    or auth.uid() = (
      select user_id from public.myth_folders where id = myth_id
    )
  );

create policy "Owners invite collaborators"
  on public.myth_collaborators
  for insert using (
    auth.uid() = (
      select user_id from public.myth_folders where id = myth_id
    )
  )
  with check (
    auth.uid() = (
      select user_id from public.myth_folders where id = myth_id
    )
  );

create policy "Owners update collaborator roles"
  on public.myth_collaborators
  for update using (
    auth.uid() = (
      select user_id from public.myth_folders where id = myth_id
    )
  )
  with check (
    auth.uid() = (
      select user_id from public.myth_folders where id = myth_id
    )
  );

create policy "Owners remove collaborators"
  on public.myth_collaborators
  for delete using (
    auth.uid() = (
      select user_id from public.myth_folders where id = myth_id
    )
  );

```

Finally, add at least one Supabase user (via the Dashboard → Authentication panel) or enable email sign-up so new visitors can create accounts directly from the app.
