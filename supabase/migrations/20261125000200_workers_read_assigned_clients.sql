-- Support workers can read the details of clients they are assigned to:
-- clients they have a shift with, or whose support team they belong to.
-- Read only. Admin and client-self access are unchanged.

create or replace function private.my_assigned_client_ids()
returns setof text language sql stable security definer set search_path = public as $$
  select client_id from public.shifts where worker_id = auth.uid()::text and client_id is not null
  union
  select client_id from public.support_team_members where worker_id = auth.uid()::text and client_id is not null
$$;
revoke all on function private.my_assigned_client_ids() from public, anon;
grant execute on function private.my_assigned_client_ids() to authenticated, service_role;

drop policy "read" on public.clients;
create policy "read" on public.clients for select to authenticated using (
  lower(email) = lower(auth.email()) or private.is_admin()
  or id in (select private.my_assigned_client_ids())
);

drop policy "read" on public.goals;
create policy "read" on public.goals for select to authenticated using (
  private.is_admin() or client_id in (select private.my_assigned_client_ids())
);

drop policy "read" on public.home_assessments;
create policy "read" on public.home_assessments for select to authenticated using (
  private.is_admin() or client_id in (select private.my_assigned_client_ids())
);
