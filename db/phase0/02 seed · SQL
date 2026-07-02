-- ============================================================
-- Phase 0 — Seed data: two isolated test restaurants
-- Run AFTER 01_schema.sql.
--
-- This creates two restaurants (A and B) and two users, each a
-- member of exactly one restaurant. The isolation test suite
-- (03_isolation_tests.sql) relies on these fixtures.
--
-- NOTE: In Supabase, auth.users rows are normally created via
-- the Auth API (sign-up), not raw SQL. For local/test setups you
-- can either:
--   (a) create two users through the Supabase Auth UI / API, then
--       paste their UUIDs into the variables below, OR
--   (b) insert directly into auth.users on a local instance (shown
--       here, guarded) — do NOT do this against production.
-- ============================================================

-- ---- Option B: direct insert (LOCAL/TEST ONLY) --------------
-- Comment this block out if you created users via the Auth API
-- and are pasting real UUIDs below instead.

do $$
declare
  user_a uuid := '11111111-1111-1111-1111-111111111111';
  user_b uuid := '22222222-2222-2222-2222-222222222222';
  rest_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  rest_b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
begin
  -- Test users (local only). Requires the pgcrypto extension.
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
  values
    (user_a, 'owner-a@test.dev', crypt('test-password-a', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
    (user_b, 'owner-b@test.dev', crypt('test-password-b', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated')
  on conflict (id) do nothing;

  -- Two restaurants
  insert into restaurants (id, name)
  values
    (rest_a, 'Test Restaurant A'),
    (rest_b, 'Test Restaurant B')
  on conflict (id) do nothing;

  -- One location each
  insert into locations (restaurant_id, name)
  values
    (rest_a, 'A — Main Street'),
    (rest_b, 'B — River Road')
  on conflict do nothing;

  -- Each user owns exactly one restaurant
  insert into memberships (user_id, restaurant_id, role)
  values
    (user_a, rest_a, 'owner'),
    (user_b, rest_b, 'owner')
  on conflict do nothing;
end $$;

-- Quick sanity check (run as service role / SQL editor):
--   select r.name, l.name as location, m.role, u.email
--   from restaurants r
--   join locations l   on l.restaurant_id = r.id
--   join memberships m on m.restaurant_id = r.id
--   join auth.users u  on u.id = m.user_id
--   order by r.name;
