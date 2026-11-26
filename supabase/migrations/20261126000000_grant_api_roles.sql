-- New Supabase projects don't grant table access to the API roles by default,
-- so signed-in users got "permission denied" on every table. Grant the normal
-- read/write privileges; Row Level Security still decides which rows each
-- person can see or change. TRUNCATE (which skips RLS) is removed.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, service_role;
