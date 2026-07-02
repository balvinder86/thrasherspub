-- ============================================================
-- Phase 0 — Isolation test suite
-- Proves RLS actually isolates tenants. THIS IS THE GATE:
-- do not proceed to Phase 1 until every assertion passes.
--
-- Run AFTER 01_schema.sql and 02_seed.sql.
--
-- How it works: we impersonate each test user by setting the
-- request role + JWT claim the way Supabase does at runtime,
-- then assert what they can and cannot see/do.
-- ============================================================

-- Fixture IDs from 02_seed.sql
-- user_a = 11111111...  rest_a = aaaaaaaa...
-- user_b = 22222222...  rest_b = bbbbbbbb...

-- ------------------------------------------------------------
-- Helper: impersonate a user for the current transaction
-- ------------------------------------------------------------
-- Supabase evaluates auth.uid() from request.jwt.claim.sub and
-- runs queries as the "authenticated" role. We replicate that:

-- ============================================================
-- TEST 1 — User A reads only Restaurant A
-- ============================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

  do $$
  declare
    visible_restaurants int;
    visible_a int;
    visible_b int;
  begin
    select count(*) into visible_restaurants from restaurants;
    select count(*) into visible_a from restaurants where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    select count(*) into visible_b from restaurants where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    assert visible_restaurants = 1, 'FAIL: User A should see exactly 1 restaurant, saw ' || visible_restaurants;
    assert visible_a = 1,           'FAIL: User A should see Restaurant A';
    assert visible_b = 0,           'FAIL: User A must NOT see Restaurant B';
    raise notice 'TEST 1 PASSED: User A sees only Restaurant A';
  end $$;
rollback;

-- ============================================================
-- TEST 2 — User A reads only Restaurant A's locations
-- ============================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

  do $$
  declare
    leaked int;
  begin
    select count(*) into leaked
    from locations
    where restaurant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    assert leaked = 0, 'FAIL: User A can see Restaurant B locations (' || leaked || ' rows)';
    raise notice 'TEST 2 PASSED: User A cannot see Restaurant B locations';
  end $$;
rollback;

-- ============================================================
-- TEST 3 — User B is symmetric (reads only Restaurant B)
-- ============================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

  do $$
  declare
    visible_a int;
    visible_b int;
  begin
    select count(*) into visible_a from restaurants where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    select count(*) into visible_b from restaurants where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    assert visible_b = 1, 'FAIL: User B should see Restaurant B';
    assert visible_a = 0, 'FAIL: User B must NOT see Restaurant A';
    raise notice 'TEST 3 PASSED: User B sees only Restaurant B';
  end $$;
rollback;

-- ============================================================
-- TEST 4 — WITH CHECK: User A cannot INSERT into Restaurant B
-- This is the trap most people miss. A read-only policy would
-- still let A write a row tagged with B's restaurant_id.
-- ============================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

  do $$
  declare
    blocked boolean := false;
  begin
    begin
      insert into locations (restaurant_id, name)
      values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Malicious insert into B');
    exception when others then
      blocked := true;
    end;

    assert blocked, 'FAIL: User A was able to INSERT a location into Restaurant B';
    raise notice 'TEST 4 PASSED: WITH CHECK blocked cross-tenant insert';
  end $$;
rollback;

-- ============================================================
-- TEST 5 — User A cannot UPDATE Restaurant B's rows
-- (update matches 0 rows under RLS rather than erroring)
-- ============================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

  do $$
  declare
    affected int;
  begin
    with upd as (
      update locations set name = 'hijacked'
      where restaurant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
      returning 1
    )
    select count(*) into affected from upd;

    assert affected = 0, 'FAIL: User A updated ' || affected || ' of Restaurant B rows';
    raise notice 'TEST 5 PASSED: User A cannot update Restaurant B rows';
  end $$;
rollback;

-- ============================================================
-- If you reach here with 5 PASSED notices, isolation holds.
-- ============================================================
