-- Multi-company support.
--
-- Every record now belongs to one organisation (a care agency using CareSync Pro).
-- People see and change only records of their own organisation. This is enforced by
-- a RESTRICTIVE policy on every table, which is combined (AND) with the existing
-- access rules, so admin / worker / client rules keep working exactly as before,
-- but only inside the person's own organisation.
--
-- How people join an organisation:
--   * An admin adds a worker or client record with the person's email, or sends an
--     invitation. When that person signs up (or if they already signed up and are
--     not in any organisation yet) they are linked to that organisation.
--   * A platform admin (the CareSync Pro owner) creates new organisations and invites
--     their first admin. Platform admin is set by hand in the database only.
-- One sign-in account belongs to one organisation.

-- ---------------------------------------------------------------- organisations
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  abn text,
  ndis_registration_number text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create trigger set_updated_date before update on public.organisations for each row execute function public.set_updated_date();

-- Existing records all belong to the first organisation. Rename it in the app or database.
insert into public.organisations (id, name) values ('00000000-0000-4000-8000-000000000001', 'CareSync Pro');

alter table public.profiles
  add column organisation_id uuid references public.organisations(id) on delete restrict,
  add column is_platform_admin boolean not null default false;
update public.profiles set organisation_id = '00000000-0000-4000-8000-000000000001';
-- The app's owner (currently the only owner) runs the platform and can add organisations.
update public.profiles set is_platform_admin = true where is_owner and role = 'admin';
create index on public.profiles (organisation_id);

-- ---------------------------------------------------------------- helpers
create or replace function private.my_organisation_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organisation_id from public.profiles where id = auth.uid()
$$;

create or replace function private.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_platform_admin from public.profiles where id = auth.uid()), false)
$$;

-- True when the given account id is a person in the caller's organisation (used for files).
create or replace function private.in_my_organisation(account_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id::text = account_id and p.organisation_id is not null
      and p.organisation_id = private.my_organisation_id()
  )
$$;

revoke all on function private.my_organisation_id(), private.is_platform_admin(), private.in_my_organisation(text) from public, anon;
grant execute on function private.my_organisation_id(), private.is_platform_admin(), private.in_my_organisation(text) to authenticated, service_role;

-- ---------------------------------------------------------------- every data table
do $$
declare t text;
begin
  foreach t in array array[
    'care_notes', 'clients', 'complaints', 'goals', 'home_assessments', 'invoices',
    'policy_documents', 'role_activations', 'roster_acknowledgements', 'shifts',
    'shift_histories', 'staff_access_assignments', 'support_requests', 'support_team_members',
    'time_corrections', 'workers', 'worker_leave_requests', 'worker_payments'
  ] loop
    execute format('alter table public.%I add column organisation_id uuid references public.organisations(id) on delete restrict', t);
    execute format('update public.%I set organisation_id = %L', t, '00000000-0000-4000-8000-000000000001');
    execute format('alter table public.%I alter column organisation_id set not null', t);
    -- New rows made by a signed-in person go to their organisation. Server code using the
    -- service role must set it explicitly (it has no signed-in person), or the insert fails.
    execute format('alter table public.%I alter column organisation_id set default private.my_organisation_id()', t);
    execute format('create index on public.%I (organisation_id)', t);
    execute format(
      'create policy "same organisation" on public.%I as restrictive for all to authenticated '
      'using (organisation_id = private.my_organisation_id()) '
      'with check (organisation_id = private.my_organisation_id())', t);
  end loop;
end $$;

-- One role activation row per level per organisation.
drop index public.role_activations_level_key;
create unique index role_activations_organisation_level_key on public.role_activations (organisation_id, level);

-- ---------------------------------------------------------------- profiles
-- People see their own profile, and (subject to the existing rules) others in their organisation.
create policy "same organisation" on public.profiles as restrictive for all to authenticated
  using (id = auth.uid() or organisation_id = private.my_organisation_id())
  with check (organisation_id is not distinct from private.my_organisation_id() or (id = auth.uid() and organisation_id is null));

-- Nobody signed in may change the organisation or platform admin flag of a profile
-- (including their own); those change only through invitations, records and the server.
-- The trigger now runs as the caller (security invoker) so it can tell a direct change
-- from the app (current_user = authenticated) from the joining logic below, which runs
-- as the database owner. The helpers it calls are security definer themselves.
create or replace function public.guard_profile_update()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if current_user = 'authenticated' and (new.organisation_id is distinct from old.organisation_id
      or new.is_platform_admin is distinct from old.is_platform_admin) then
    raise exception 'Organisation membership cannot be changed here';
  end if;
  if auth.uid() is null or private.is_admin() then
    if not private.is_owner() and auth.uid() is not null and new.is_owner is distinct from old.is_owner then
      raise exception 'Only the owner can change the owner flag';
    end if;
    return new;
  end if;
  if (to_jsonb(new) - array['phone','address','full_name','availability','updated_date'])
     is distinct from (to_jsonb(old) - array['phone','address','full_name','availability','updated_date']) then
    raise exception 'You can only change your own contact details';
  end if;
  return new;
end $$;
revoke all on function public.guard_profile_update() from public, anon, authenticated;

-- ---------------------------------------------------------------- organisations access
alter table public.organisations enable row level security;
create policy "read" on public.organisations for select to authenticated
  using (id = private.my_organisation_id() or private.is_platform_admin());
create policy "update" on public.organisations for update to authenticated
  using ((id = private.my_organisation_id() and private.is_owner()) or private.is_platform_admin())
  with check ((id = private.my_organisation_id() and private.is_owner()) or private.is_platform_admin());
create policy "create" on public.organisations for insert to authenticated
  with check (private.is_platform_admin());
-- No delete from the app: removing an organisation is done deliberately in the database.

-- ---------------------------------------------------------------- invitations
create table public.organisation_invitations (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  organisation_id uuid not null default private.my_organisation_id() references public.organisations(id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  role text not null default 'user' check (role in ('admin', 'user')),
  is_owner boolean not null default false,
  accepted_at timestamptz,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text default auth.uid()::text
);
create unique index organisation_invitations_open_email on public.organisation_invitations (lower(email)) where accepted_at is null;
create index on public.organisation_invitations (organisation_id);
create trigger set_updated_date before update on public.organisation_invitations for each row execute function public.set_updated_date();
alter table public.organisation_invitations enable row level security;
-- Admins manage their own organisation's invitations; only an owner can invite an owner.
-- A platform admin can invite the first admin of any organisation.
create policy "read" on public.organisation_invitations for select to authenticated
  using ((organisation_id = private.my_organisation_id() and private.is_admin()) or private.is_platform_admin());
create policy "create" on public.organisation_invitations for insert to authenticated
  with check (accepted_at is null and (
    (organisation_id = private.my_organisation_id() and private.is_admin() and (not is_owner or private.is_owner()))
    or private.is_platform_admin()));
create policy "delete" on public.organisation_invitations for delete to authenticated
  using ((organisation_id = private.my_organisation_id() and private.is_admin()) or private.is_platform_admin());
grant select, insert, delete on public.organisation_invitations to authenticated, service_role;
grant select, insert, update on public.organisations to authenticated;
grant all on public.organisations, public.organisation_invitations to service_role;

-- ---------------------------------------------------------------- joining an organisation
-- Links a profile that has no organisation yet, using (in order) an open invitation,
-- or a worker / client record with the same email in exactly one organisation.
create or replace function private.link_profile_to_organisation(profile_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  p public.profiles;
  inv public.organisation_invitations;
  orgs uuid[];
begin
  select * into p from public.profiles where id = profile_id;
  if not found or p.organisation_id is not null or coalesce(p.email, '') = '' then return; end if;

  select * into inv from public.organisation_invitations
    where lower(email) = lower(p.email) and accepted_at is null
    order by created_date desc limit 1;
  if found then
    update public.profiles set organisation_id = inv.organisation_id, role = inv.role, is_owner = inv.is_owner
      where id = p.id;
    update public.organisation_invitations set accepted_at = now() where id = inv.id;
    return;
  end if;

  select array_agg(distinct organisation_id) into orgs from (
    select organisation_id from public.workers where lower(email) = lower(p.email)
    union
    select organisation_id from public.clients where lower(email) = lower(p.email)
  ) matches;
  if array_length(orgs, 1) = 1 then
    update public.profiles set organisation_id = orgs[1] where id = p.id;
  end if;
end $$;
revoke all on function private.link_profile_to_organisation(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  perform private.link_profile_to_organisation(new.id);
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- When an invitation, worker or client record is added for someone who already signed
-- up but has no organisation yet, link them straight away.
create or replace function public.link_existing_account()
returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  if coalesce(new.email, '') = '' then return new; end if;
  for pid in select id from public.profiles where organisation_id is null and lower(email) = lower(new.email) loop
    perform private.link_profile_to_organisation(pid);
  end loop;
  return new;
end $$;
revoke all on function public.link_existing_account() from public, anon, authenticated;

create trigger link_existing_account after insert on public.organisation_invitations
  for each row execute function public.link_existing_account();
create trigger link_existing_account after insert or update of email on public.workers
  for each row execute function public.link_existing_account();
create trigger link_existing_account after insert or update of email on public.clients
  for each row execute function public.link_existing_account();

-- ---------------------------------------------------------------- files
-- Admins could read every uploaded file; now only files uploaded by people in their organisation.
drop policy "documents read" on storage.objects;
drop policy "documents upload" on storage.objects;
drop policy "documents delete" on storage.objects;
create policy "documents read" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and ((storage.foldername(name))[1] = auth.uid()::text
    or (private.is_admin() and private.in_my_organisation((storage.foldername(name))[1]))));
create policy "documents upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and ((storage.foldername(name))[1] = auth.uid()::text
    or (private.is_admin() and private.in_my_organisation((storage.foldername(name))[1]))));
create policy "documents delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and private.is_admin() and private.in_my_organisation((storage.foldername(name))[1]));
