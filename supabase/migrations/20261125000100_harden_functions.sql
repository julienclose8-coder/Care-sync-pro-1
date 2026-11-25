-- Keep the access-rule helpers out of the public API and stop anyone calling the
-- trigger functions directly. Policies keep working: they refer to the functions
-- themselves, not their names.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

alter function public.is_admin() set schema private;
alter function public.is_owner() set schema private;
alter function public.my_client_ids() set schema private;
alter function private.is_admin() set search_path = public;
alter function private.is_owner() set search_path = public;
alter function private.my_client_ids() set search_path = public;
revoke all on function private.is_admin(), private.is_owner(), private.my_client_ids() from public, anon;
grant execute on function private.is_admin(), private.is_owner(), private.my_client_ids() to authenticated, service_role;

revoke all on function public.handle_new_user(), public.sync_profile_email(), public.guard_profile_update(), public.set_updated_date() from public, anon, authenticated;
alter function public.set_updated_date() set search_path = public;

-- This trigger calls the helpers by name, so point it at their new home.
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
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
