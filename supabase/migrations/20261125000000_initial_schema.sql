-- CareSync Pro database schema for Supabase.
--
-- One table per record type the app uses. Every table has Row Level Security turned on, with
-- rules carried over from the original app and tightened where the original let any
-- signed-in user read other people's shifts, invoices, requests or support teams.
--
-- Record ids are text so existing records can be imported with their ids unchanged.
-- created_date / updated_date / created_by_id keep the field names the app already uses.

create extension if not exists pgcrypto;

create or replace function public.set_updated_date()
returns trigger language plpgsql as $$
begin
  new.updated_date := now();
  return new;
end $$;

-- Helpers used by the access rules. security definer lets them read profiles and
-- clients without going through those tables' own rules (which would recurse).
create or replace function public.is_admin()
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  return exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
end $$;

-- The business owner (CEO). Only they can change staff access levels and role activation.
create or replace function public.is_owner()
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  return exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_owner);
end $$;

-- Client records that belong to the signed-in person (matched on email, as before).
create or replace function public.my_client_ids()
returns setof text language plpgsql stable security definer set search_path = public as $$
begin
  return query select c.id from public.clients c
    where auth.email() is not null and lower(c.email) = lower(auth.email());
end $$;

-- profiles: the app's users (one row per sign-in account)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'user' check (role in ('admin','user')),
  is_owner boolean not null default false,
  legacy_id text unique,
  phone text,
  address text,
  availability jsonb,
  trainings text[],
  pay_account_name text,
  bsb text,
  account_number text,
  payroll_reference text,
  hourly_pay_rate double precision default 0,
  saturday_rate double precision default 0,
  sunday_rate double precision default 0,
  sleepover_flat_rate double precision default 0,
  overtime_rate double precision default 0,
  weekly_hour_limit double precision default 38,
  hour_limit_action text default 'warning' check (hour_limit_action in ('warning', 'block')),
  documents jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create trigger set_updated_date before update on public.profiles for each row execute function public.set_updated_date();

-- Every new sign-in account gets a profile with the ordinary 'user' role. Admins are
-- promoted by hand in the database, never from anything the browser sends.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the profile email in step with the sign-in email.
create or replace function public.sync_profile_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id and email is distinct from new.email;
  return new;
end $$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

-- People may edit only their own contact details. Role, owner flag, pay rates, bank
-- details and approved trainings change only through an admin.
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    if not public.is_owner() and auth.uid() is not null and new.is_owner is distinct from old.is_owner then
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

create trigger guard_profile_update before update on public.profiles
  for each row execute function public.guard_profile_update();

alter table public.profiles enable row level security;
create policy "read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "update" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy "delete" on public.profiles for delete to authenticated using (public.is_admin());

-- care_notes
create table public.care_notes (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  client_id text not null,
  shift_id text,
  author_id text not null,
  author_name text not null,
  note_category text default 'general' not null check (note_category in ('general', 'support', 'supports', 'progress', 'medication', 'observation', 'behavioural', 'behaviours', 'moods', 'locked_concern')),
  behavioural_subtype text check (behavioural_subtype in ('positive', 'negative')),
  content text not null,
  status text default 'final' check (status in ('draft', 'final')),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text default auth.uid()::text
);
create index on public.care_notes (client_id);
create index on public.care_notes (shift_id);
create index on public.care_notes (author_id);
create trigger set_updated_date before update on public.care_notes for each row execute function public.set_updated_date();
alter table public.care_notes enable row level security;
create policy "read" on public.care_notes for select to authenticated using (((note_category = 'locked_concern' and author_id = auth.uid()::text) or (note_category is distinct from 'locked_concern' and (author_id = auth.uid()::text or public.is_admin()))));
create policy "create" on public.care_notes for insert to authenticated with check (public.is_admin());
create policy "update" on public.care_notes for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "delete" on public.care_notes for delete to authenticated using (public.is_admin());

-- clients
create table public.clients (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  full_name text not null,
  email text,
  phone text,
  address text,
  date_of_birth date,
  funding_type text default 'NDIS' check (funding_type in ('NDIS', 'Home Care Package', 'Private', 'Other')),
  plan_manager text,
  hourly_charge_rate double precision default 0,
  support_rates jsonb,
  support_needs text,
  preferences text,
  emergency_contact text,
  in_home_support boolean default false,
  support_setting text check (support_setting in ('in_home', 'centre_based')),
  centre_name text,
  centre_address text,
  setting_supports jsonb,
  training_requirements text[],
  disability_info text,
  medication_info text,
  plan_instructions text,
  status text default 'active' check (status in ('active', 'on_hold', 'inactive')),
  onboarding jsonb,
  archived_at timestamptz,
  archive_reason text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text default auth.uid()::text
);
create trigger set_updated_date before update on public.clients for each row execute function public.set_updated_date();
alter table public.clients enable row level security;
create policy "read" on public.clients for select to authenticated using ((lower(email) = lower(auth.email()) or public.is_admin()));
create policy "create" on public.clients for insert to authenticated with check (public.is_admin());
create policy "update" on public.clients for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "delete" on public.clients for delete to authenticated using (public.is_admin());

-- complaints
create table public.complaints (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  reference text not null,
  title text not null,
  complaint_type text not null check (complaint_type in ('internal', 'external')),
  category text not null check (category in ('service', 'staff_conduct', 'safety', 'billing', 'privacy', 'other')),
  description text not null,
  desired_outcome text,
  reporter_id text not null,
  reporter_name text,
  complainant_name text,
  contact_details text,
  relationship text check (relationship in ('worker', 'client', 'caregiver', 'other')),
  received_via text check (received_via in ('app', 'phone', 'email', 'in_person', 'other')),
  received_date date,
  incident_date date,
  priority text default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text default 'received' not null check (status in ('received', 'acknowledged', 'investigating', 'resolved', 'closed')),
  assigned_handler text,
  follow_up_date date,
  internal_notes text,
  resolution text,
  resolved_at text,
  reviewed_by text,
  activity jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text default auth.uid()::text
);
create index on public.complaints (reporter_id);
create trigger set_updated_date before update on public.complaints for each row execute function public.set_updated_date();
alter table public.complaints enable row level security;
create policy "read" on public.complaints for select to authenticated using (public.is_admin());
create policy "create" on public.complaints for insert to authenticated with check (public.is_admin());
create policy "update" on public.complaints for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "delete" on public.complaints for delete to authenticated using (public.is_admin());

-- goals
create table public.goals (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  client_id text not null,
  title text not null,
  description text,
  status text default 'active' check (status in ('active', 'achieved', 'paused')),
  target_date date,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text default auth.uid()::text
);
create index on public.goals (client_id);
create trigger set_updated_date before update on public.goals for each row execute function public.set_updated_date();
alter table public.goals enable row level security;
create policy "read" on public.goals for select to authenticated using (public.is_admin());
create policy "create" on public.goals for insert to authenticated with check (public.is_admin());
create policy "update" on public.goals for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "delete" on public.goals for delete to authenticated using (public.is_admin());

-- home_assessments
create table public.home_assessments (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  client_id text not null,
  access_details text,
  pets text,
  smoke_alarms_ok boolean default false,
  pathways_clear boolean default false,
  electrical_safe boolean default false,
  bathroom_safe boolean default false,
  medications_secured boolean default false,
  hazard_notes text,
  other_notes text,
  last_reviewed date,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text default auth.uid()::text
);
create index on public.home_assessments (client_id);
create trigger set_updated_date before update on public.home_assessments for each row execute function public.set_updated_date();
alter table public.home_assessments enable row level security;
create policy "read" on public.home_assessments for select to authenticated using (public.is_admin());
create policy "create" on public.home_assessments for insert to authenticated with check (public.is_admin());
create policy "update" on public.home_assessments for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "delete" on public.home_assessments for delete to authenticated using (public.is_admin());

-- invoices
create table public.invoices (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  invoice_number text,
  client_id text not null,
  shift_ids text[],
  worker_ids text[],
  issue_date date,
  due_date date,
  description text,
  hours double precision default 0,
  hourly_rate double precision default 0,
  amount double precision default 0 not null,
  status text default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue')),
  notes text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text default auth.uid()::text
);
create index on public.invoices (client_id);
create trigger set_updated_date before update on public.invoices for each row execute function public.set_updated_date();
alter table public.invoices enable row level security;
create policy "read" on public.invoices for select to authenticated using (public.is_admin() or client_id in (select public.my_client_ids()));
create policy "create" on public.invoices for insert to authenticated with check (public.is_admin());
create policy "update" on public.invoices for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "delete" on public.invoices for delete to authenticated using (public.is_admin());

-- policy_documents
create table public.policy_documents (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  title text not null,
  content text,
  document_type text default 'policy' not null check (document_type in ('policy', 'procedure')),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text default auth.uid()::text
);
create trigger set_updated_date before update on public.policy_documents for each row execute function public.set_updated_date();
alter table public.policy_documents enable row level security;
create policy "read" on public.policy_documents for select to authenticated using (true);
create policy "create" on public.policy_documents for insert to authenticated with check (public.is_admin());
create policy "update" on public.policy_documents for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "delete" on public.policy_documents for delete to authenticated using (public.is_admin());

-- role_activations
create table public.role_activations (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  level text not null check (level in ('10', '9', '8', '7', '6', '5', '4', '3', '2')),
  active boolean default false not null,
  updated_by text,
  changed_at timestamptz,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text default auth.uid()::text
);
create trigger set_updated_date before update on public.role_activations for each row execute function public.set_updated_date();
alter table public.role_activations enable row level security;
create policy "read" on public.role_activations for select to authenticated using ((public.is_owner() and public.is_admin()));
create policy "create" on public.role_activations for insert to authenticated with check ((public.is_owner() and public.is_admin()));
create policy "update" on public.role_activations for update to authenticated using ((public.is_owner() and public.is_admin())) with check ((public.is_owner() and public.is_admin()));
create policy "delete" on public.role_activations for delete to authenticated using ((public.is_owner() and public.is_admin()));

-- roster_acknowledgements
create table public.roster_acknowledgements (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  shift_id text not null,
  revision text not null,
  worker_id text not null,
  worker_email text,
  change_type text not null check (change_type in ('assignment', 'change', 'removal')),
  client_name text,
  previous_summary text,
  current_summary text,
  shift_date date,
  status text default 'pending' not null check (status in ('pending', 'acknowledged', 'superseded')),
  requested_by text,
  acknowledged_at text,
  acknowledged_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text default auth.uid()::text
);
create index on public.roster_acknowledgements (shift_id);
create index on public.roster_acknowledgements (worker_id);
create trigger set_updated_date before update on public.roster_acknowledgements for each row execute function public.set_updated_date();
alter table public.roster_acknowledgements enable row level security;
create policy "read" on public.roster_acknowledgements for select to authenticated using ((public.is_admin() or worker_id = auth.uid()::text or lower(worker_email) = lower(auth.email())));
create policy "create" on public.roster_acknowledgements for insert to authenticated with check (public.is_admin());
create policy "update" on public.roster_acknowledgements for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "delete" on public.roster_acknowledgements for delete to authenticated using (public.is_admin());

-- shifts
create table public.shifts (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  client_id text not null,
  worker_id text,
  worker_name text,
  date date not null,
  start_time text not null,
  end_time text not null,
  clock_in text,
  clock_out text,
  service_type text default 'Personal Care',
  support_setting text check (support_setting in ('in_home', 'centre_based')),
  centre_name text,
  centre_address text,
  is_sleepover boolean default false,
  sleep_start text,
  sleep_end text,
  goal_ids text[],
  recurrence_series_id text,
  recurrence_mode text default 'none' check (recurrence_mode in ('none', 'end_date', 'week_count', 'ongoing')),
  recurrence_end_date date,
  recurrence_week_count integer,
  status text default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  notes text,
  roster_revision text,
  acknowledgement_status text default 'not_required' check (acknowledgement_status in ('not_required', 'pending', 'acknowledged')),
  acknowledged_at text,
  acknowledged_by text,
  needs_replacement boolean default false,
  replacement_reason text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text default auth.uid()::text
);
create index on public.shifts (client_id);
create index on public.shifts (worker_id);
create index on public.shifts (recurrence_series_id);
create index on public.shifts (date);
create trigger set_updated_date before update on public.shifts for each row execute function public.set_updated_date();
alter table public.shifts enable row level security;
create policy "read" on public.shifts for select to authenticated using (public.is_admin() or worker_id = auth.uid()::text or client_id in (select public.my_client_ids()));
create policy "create" on public.shifts for insert to authenticated with check (public.is_admin());
create policy "update" on public.shifts for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "delete" on public.shifts for delete to authenticated using (public.is_admin());

-- shift_histories
create table public.shift_histories (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  shift_id text not null,
  shift_date date,
  client_id text,
  action text not null check (action in ('created', 'updated', 'reassigned', 'moved', 'cancelled', 'deleted', 'called_in_sick', 'replacement_cleared')),
  actor_id text,
  actor_name text,
  actor_role text,
  locked_at_change boolean default false,
  detail text,
  changes jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text default auth.uid()::text
);
create index on public.shift_histories (shift_id);
create index on public.shift_histories (client_id);
create index on public.shift_histories (actor_id);
create trigger set_updated_date before update on public.shift_histories for each row execute function public.set_updated_date();
alter table public.shift_histories enable row level security;
create policy "read" on public.shift_histories for select to authenticated using (public.is_admin());
create policy "create" on public.shift_histories for insert to authenticated with check (public.is_admin());
create policy "update" on public.shift_histories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "delete" on public.shift_histories for delete to authenticated using (public.is_admin());

-- staff_access_assignments
create table public.staff_access_assignments (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  subject_id text not null,
  subject_type text not null check (subject_type in ('user', 'worker')),
  level text not null check (level in ('12', '11', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1', 'whs')),
  policy_version integer check (policy_version in (1, 2)),
  worker_pay_visible boolean default false,
  pay_visibility_by text,
  pay_visibility_at timestamptz,
  assigned_by text,
  assigned_at timestamptz,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text default auth.uid()::text
);
create index on public.staff_access_assignments (subject_id);
create trigger set_updated_date before update on public.staff_access_assignments for each row execute function public.set_updated_date();
alter table public.staff_access_assignments enable row level security;
create policy "read" on public.staff_access_assignments for select to authenticated using ((public.is_owner() and public.is_admin()));
create policy "create" on public.staff_access_assignments for insert to authenticated with check ((public.is_owner() and public.is_admin()));
create policy "update" on public.staff_access_assignments for update to authenticated using ((public.is_owner() and public.is_admin())) with check ((public.is_owner() and public.is_admin()));
create policy "delete" on public.staff_access_assignments for delete to authenticated using ((public.is_owner() and public.is_admin()));

-- support_requests
create table public.support_requests (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  client_id text not null,
  shift_id text,
  request_type text default 'new' not null check (request_type in ('new', 'change', 'cancel', 'goal')),
  service_type text default 'Personal Care' not null,
  support_setting text check (support_setting in ('in_home', 'centre_based')),
  centre_name text,
  centre_address text,
  details text,
  preferred_times text,
  goal text,
  outcome text,
  status text default 'pending' check (status in ('pending', 'approved', 'declined')),
  admin_notes text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text default auth.uid()::text
);
create index on public.support_requests (client_id);
create index on public.support_requests (shift_id);
create trigger set_updated_date before update on public.support_requests for each row execute function public.set_updated_date();
alter table public.support_requests enable row level security;
create policy "read" on public.support_requests for select to authenticated using (public.is_admin() or created_by_id = auth.uid()::text or client_id in (select public.my_client_ids()));
create policy "create" on public.support_requests for insert to authenticated with check (created_by_id = auth.uid()::text);
create policy "update" on public.support_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "delete" on public.support_requests for delete to authenticated using (public.is_admin());

-- support_team_members
create table public.support_team_members (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  client_id text not null,
  worker_id text not null,
  status text default 'pending' check (status in ('pending', 'approved')),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text default auth.uid()::text
);
create index on public.support_team_members (client_id);
create index on public.support_team_members (worker_id);
create trigger set_updated_date before update on public.support_team_members for each row execute function public.set_updated_date();
alter table public.support_team_members enable row level security;
create policy "read" on public.support_team_members for select to authenticated using (public.is_admin() or worker_id = auth.uid()::text or client_id in (select public.my_client_ids()));
create policy "create" on public.support_team_members for insert to authenticated with check (public.is_admin());
create policy "update" on public.support_team_members for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "delete" on public.support_team_members for delete to authenticated using (public.is_admin());

-- time_corrections
create table public.time_corrections (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  shift_id text not null,
  worker_id text not null,
  worker_name text,
  client_name text,
  shift_date date,
  original_clock_in text,
  original_clock_out text,
  original_status text,
  proposed_clock_in text not null,
  proposed_clock_out text not null,
  reason text not null,
  status text default 'pending' not null check (status in ('pending', 'approved', 'declined')),
  reviewed_by text,
  reviewed_at text,
  admin_notes text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text default auth.uid()::text
);
create index on public.time_corrections (shift_id);
create index on public.time_corrections (worker_id);
create trigger set_updated_date before update on public.time_corrections for each row execute function public.set_updated_date();
alter table public.time_corrections enable row level security;
create policy "read" on public.time_corrections for select to authenticated using ((worker_id = auth.uid()::text or public.is_admin()));
create policy "create" on public.time_corrections for insert to authenticated with check (public.is_admin());
create policy "update" on public.time_corrections for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "delete" on public.time_corrections for delete to authenticated using (public.is_admin());

-- workers
create table public.workers (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  full_name text not null,
  email text,
  phone text,
  address text,
  pay_account_name text,
  bsb text,
  account_number text,
  payroll_reference text,
  hourly_pay_rate double precision default 0,
  saturday_rate double precision default 0,
  sunday_rate double precision default 0,
  sleepover_flat_rate double precision default 0,
  overtime_rate double precision default 0,
  weekly_hour_limit double precision default 38,
  hour_limit_action text default 'warning' check (hour_limit_action in ('warning', 'block')),
  availability jsonb,
  trainings text[],
  documents jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text default auth.uid()::text
);
create trigger set_updated_date before update on public.workers for each row execute function public.set_updated_date();
alter table public.workers enable row level security;
create policy "read" on public.workers for select to authenticated using (public.is_admin());
create policy "create" on public.workers for insert to authenticated with check (public.is_admin());
create policy "update" on public.workers for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "delete" on public.workers for delete to authenticated using (public.is_admin());

-- worker_leave_requests
create table public.worker_leave_requests (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  worker_id text not null,
  worker_ids text[] not null,
  worker_name text not null,
  request_type text not null check (request_type in ('leave', 'unavailability')),
  start_date date not null,
  end_date date not null,
  all_day boolean default true not null,
  start_time text,
  end_time text,
  reason text,
  status text default 'pending' not null check (status in ('pending', 'approved', 'declined')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text default auth.uid()::text
);
create index on public.worker_leave_requests (worker_id);
create trigger set_updated_date before update on public.worker_leave_requests for each row execute function public.set_updated_date();
alter table public.worker_leave_requests enable row level security;
create policy "read" on public.worker_leave_requests for select to authenticated using ((worker_id = auth.uid()::text or public.is_admin()));
create policy "create" on public.worker_leave_requests for insert to authenticated with check (public.is_admin());
create policy "update" on public.worker_leave_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "delete" on public.worker_leave_requests for delete to authenticated using (public.is_admin());

-- worker_payments
create table public.worker_payments (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  worker_id text,
  worker_name text,
  period_start date,
  period_end date,
  hours double precision default 0,
  hourly_rate double precision default 0,
  amount double precision default 0 not null,
  status text default 'pending' check (status in ('pending', 'paid')),
  paid_date date,
  notes text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text default auth.uid()::text
);
create index on public.worker_payments (worker_id);
create trigger set_updated_date before update on public.worker_payments for each row execute function public.set_updated_date();
alter table public.worker_payments enable row level security;
create policy "read" on public.worker_payments for select to authenticated using (public.is_admin());
create policy "create" on public.worker_payments for insert to authenticated with check (public.is_admin());
create policy "update" on public.worker_payments for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "delete" on public.worker_payments for delete to authenticated using (public.is_admin());

-- One activation row per staff level (the role settings screen upserts on level).
create unique index role_activations_level_key on public.role_activations (level);

-- Private file storage for uploaded documents. Files are never public: the app
-- opens them through short-lived signed links. Each person uploads into a folder
-- named after their account id; admins can read and manage every file.
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 26214400)
on conflict (id) do nothing;

create policy "documents read" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text));
create policy "documents upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text));
create policy "documents delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.is_admin());

-- Live updates for the screens that refresh themselves. Realtime applies the same
-- access rules, so people only receive changes to rows they can already read.
alter publication supabase_realtime add table public.shifts, public.care_notes,
  public.roster_acknowledgements, public.worker_leave_requests;

-- Nothing is readable without signing in.
revoke all on all tables in schema public from anon;

