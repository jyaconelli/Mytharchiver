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

alter table if exists public.myth_folders
  add column if not exists contributor_instructions text not null default '';

create table if not exists public.myth_contribution_requests (
  id uuid primary key default gen_random_uuid(),
  myth_id uuid references public.myth_folders(id) on delete cascade,
  email text not null,
  token uuid not null default gen_random_uuid(),
  status text not null default 'draft' check (status in ('draft','submitted','expired')),
  draft_payload jsonb not null default '{"name":"","source":"","plotPoints":[]}'::jsonb,
  submitted_variant_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.myth_contribution_requests enable row level security;

create policy "Owners read contribution requests"
  on public.myth_contribution_requests
  for select
  using (
    auth.uid() = (
      select user_id from public.myth_folders where id = myth_contribution_requests.myth_id
    )
  );

create policy "Owners insert contribution requests"
  on public.myth_contribution_requests
  for insert
  with check (
    auth.uid() = (
      select user_id from public.myth_folders where id = myth_contribution_requests.myth_id
    )
  );

create policy "Owners update contribution requests"
  on public.myth_contribution_requests
  for update
  using (
    auth.uid() = (
      select user_id from public.myth_folders where id = myth_contribution_requests.myth_id
    )
  )
  with check (
    auth.uid() = (
      select user_id from public.myth_folders where id = myth_contribution_requests.myth_id
    )
  );

create policy "Owners delete contribution requests"
  on public.myth_contribution_requests
  for delete
  using (
    auth.uid() = (
      select user_id from public.myth_folders where id = myth_contribution_requests.myth_id
    )
  );

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
  from public.myth_contribution_requests r
  join public.myth_folders m on m.id = r.myth_id
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

  if request_record.status <> 'draft' then
    return query select coalesce(request_record.submitted_variant_id, '');
  end if;

  select coalesce(max(sort_order), -1) + 1
  into target_sort_order
  from public.myth_variants
  where myth_id = request_record.myth_id;

  new_variant_id := gen_random_uuid()::text;

  insert into public.myth_variants (id, myth_id, name, source, sort_order)
  values (
    new_variant_id,
    request_record.myth_id,
    coalesce(request_record.draft_payload->>'name', ''),
    coalesce(request_record.draft_payload->>'source', ''),
    target_sort_order
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

-- Edge function email invites
-- Deploy supabase/functions/send-contribution-invite to automatically email contributors
-- after inserting records into myth_contribution_requests.

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

## Email invite automation

To send contributor invites automatically when you add email addresses inside the app, deploy the included Edge Function and configure the required secrets:

1. Deploy the function (after logging in with the Supabase CLI):
   ```bash
   supabase functions deploy send-contribution-invite
   ```
2. Set the secrets the function relies on (replace the placeholders with your values):
   ```bash
   supabase secrets set \
     RESEND_API_KEY=your-resend-api-key \
     CONTRIBUTION_INVITE_FROM_EMAIL="Myth Archive <invites@example.com>" \
     CONTRIBUTION_INVITE_APP_URL=https://your-app-hostname \
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

   - `RESEND_API_KEY` – API key from Resend (or update the function to call a different provider).
   - `CONTRIBUTION_INVITE_FROM_EMAIL` – The verified sender address.
   - `CONTRIBUTION_INVITE_APP_URL` – Public base URL of the web app (used to build invite links).
   - `SUPABASE_SERVICE_ROLE_KEY` – Service role key so the Edge Function can read myth + request details. Keep this secret safe.

Once deployed, every new entry in **Contribution Requests** triggers an email automatically. You can also resend an invitation from the UI at any time.
