-- ============================================================
-- Phase 2 — auth.users email lookup (service-role only)
-- ------------------------------------------------------------
-- manage-team's invite flow needs to add an *already-registered*
-- user to a restaurant by email (supabase.auth.admin.inviteUserByEmail
-- errors instead of returning a user id when the email already has an
-- account). auth.users isn't exposed over PostgREST, and scanning
-- admin.listUsers() client-side doesn't scale once this app has more
-- than a handful of total users across every tenant — this does the
-- lookup directly in Postgres instead, bounded to a single row.
-- ============================================================
create or replace function get_user_id_by_email(lookup_email text)
returns uuid
language sql
security definer
set search_path = auth, public
as $$
  select id
  from auth.users
  where email = lookup_email
  limit 1;
$$;

revoke all on function get_user_id_by_email(text) from public;
revoke all on function get_user_id_by_email(text) from anon;
revoke all on function get_user_id_by_email(text) from authenticated;
grant execute on function get_user_id_by_email(text) to service_role;
