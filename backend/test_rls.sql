-- ====================================================================
-- PHASE 1: RLS Verification Tests and First Admin Setup
-- ====================================================================

-- ────────────────────────────────────────────────────────────────────
-- SECTION A: Create First Administration Profile Manually
-- ────────────────────────────────────────────────────────────────────
-- Instructions:
-- 1. Create a user in Supabase Studio -> Authentication -> Users (e.g. admin@dibru.ac.in).
-- 2. Copy the generated User UID.
-- 3. Replace 'PASTE_ADMIN_AUTH_USER_UUID_HERE' below with that UID and execute.

/*
insert into public.profiles (
  id,
  role,
  name,
  email,
  unit_name,
  must_change_password,
  is_active
) values (
  'PASTE_ADMIN_AUTH_USER_UUID_HERE'::uuid,
  'administration',
  'Central Administration',
  'admin@dibru.ac.in',
  'Office of the Registrar',
  false,
  true
)
on conflict (id) do update set
  role = 'administration',
  is_active = true;
*/

-- ────────────────────────────────────────────────────────────────────
-- SECTION B: Automated RLS Test Suite (Safe Rollback Transaction)
-- Run this block in the Supabase SQL Editor.
-- It creates temporary test users and complaints, simulates queries
-- under each role, and rolls back everything cleanly.
-- ────────────────────────────────────────────────────────────────────

begin;

-- Create deterministic test UUIDs
do $$
declare
  u_admin uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
  u_dept_civil uuid := 'b0000000-0000-0000-0000-000000000001'::uuid;
  u_dept_hostel uuid := 'b0000000-0000-0000-0000-000000000002'::uuid;
  u_social uuid := 'c0000000-0000-0000-0000-000000000001'::uuid;
  u_student_1 uuid := 'd0000000-0000-0000-0000-000000000001'::uuid;
  u_student_2 uuid := 'd0000000-0000-0000-0000-000000000002'::uuid;

  c_admin_only uuid := 'e0000000-0000-0000-0000-000000000001'::uuid;
  c_dept_civil uuid := 'e0000000-0000-0000-0000-000000000002'::uuid;
  c_dept_hostel uuid := 'e0000000-0000-0000-0000-000000000003'::uuid;
  c_social_pub uuid := 'e0000000-0000-0000-0000-000000000004'::uuid;

  v_count integer;
begin
  -- 1. Insert mock profiles in public.profiles (service context)
  insert into public.profiles (id, role, name, email, unit_name, is_active) values
    (u_admin, 'administration', 'Admin Officer', 'admin@test.edu', 'Central Administration', true),
    (u_dept_civil, 'department', 'Civil Eng Dept', 'civil@test.edu', 'Civil Engineering', true),
    (u_dept_hostel, 'department', 'Hostel Warden', 'hostel@test.edu', 'Hostel Affairs', true),
    (u_social, 'social_service', 'DUSU Service Desk', 'dusu@test.edu', 'DUSU Welfare', true),
    (u_student_1, 'student', 'Student One', 'student1@test.edu', null, true),
    (u_student_2, 'student', 'Student Two', 'student2@test.edu', null, true);

  -- 2. Insert mock complaints
  insert into public.complaints (id, student_id, title, description, category, visibility, target_unit_id, status) values
    (c_admin_only, u_student_1, 'Confidential Staff Grievance', 'Direct report to administration', 'Conduct', 'administration', null, 'submitted'),
    (c_dept_civil, u_student_1, 'Broken Pathway Slab', 'Pavement cracked near library', 'Infrastructure', 'department', u_dept_civil, 'submitted'),
    (c_social_pub, u_student_1, 'Canteen Sanitation', 'Hygiene in central canteen', 'Sanitation', 'social_service', null, 'submitted'),
    (c_dept_hostel, u_student_2, 'Water Leak in Block B', 'Pipe broken on floor 2', 'Plumbing', 'department', u_dept_hostel, 'submitted');

  -- ── TEST 1: Student 1 Queries Complaints ──────────────────────────
  -- Expectation: Student 1 sees ONLY complaints where student_id = Student 1 (c_admin_only, c_dept_civil, c_social_pub).
  -- Must NOT see Student 2's complaint (c_dept_hostel).
  perform set_config('request.jwt.claim.sub', u_student_1::text, true);
  select count(*) into v_count from public.complaints;
  assert v_count = 3, 'Test 1 Failed: Student 1 expected 3 complaints, got ' || v_count;

  -- ── TEST 2: Student 2 Queries Complaints ──────────────────────────
  -- Expectation: Student 2 sees ONLY c_dept_hostel (count = 1).
  -- Must NOT see any of Student 1's complaints regardless of visibility level.
  perform set_config('request.jwt.claim.sub', u_student_2::text, true);
  select count(*) into v_count from public.complaints;
  assert v_count = 1, 'Test 2 Failed: Student 2 expected 1 complaint, got ' || v_count;

  -- ── TEST 3: Department (Civil) Queries Complaints ─────────────────
  -- Expectation: Sees c_dept_civil (targeted to Civil) and c_social_pub (social_service visibility).
  -- Must NOT see c_admin_only (admin-only) or c_dept_hostel (targeted to Hostel). Count = 2.
  perform set_config('request.jwt.claim.sub', u_dept_civil::text, true);
  select count(*) into v_count from public.complaints;
  assert v_count = 2, 'Test 3 Failed: Civil Dept expected 2 complaints, got ' || v_count;

  -- ── TEST 4: Department (Hostel) Queries Complaints ────────────────
  -- Expectation: Sees c_dept_hostel (targeted to Hostel) and c_social_pub (social_service visibility).
  -- Must NOT see c_admin_only (admin-only) or c_dept_civil (targeted to Civil). Count = 2.
  perform set_config('request.jwt.claim.sub', u_dept_hostel::text, true);
  select count(*) into v_count from public.complaints;
  assert v_count = 2, 'Test 4 Failed: Hostel Dept expected 2 complaints, got ' || v_count;

  -- ── TEST 5: Social Service (DUSU) Queries Complaints ──────────────
  -- Expectation: Sees ONLY c_social_pub (social_service visibility).
  -- Must NOT see c_admin_only, c_dept_civil, or c_dept_hostel. Count = 1.
  perform set_config('request.jwt.claim.sub', u_social::text, true);
  select count(*) into v_count from public.complaints;
  assert v_count = 1, 'Test 5 Failed: Social Service expected 1 complaint, got ' || v_count;

  -- ── TEST 6: Administration Queries Complaints ─────────────────────
  -- Expectation: Sees all complaints without restriction. Count = 4.
  perform set_config('request.jwt.claim.sub', u_admin::text, true);
  select count(*) into v_count from public.complaints;
  assert v_count = 4, 'Test 6 Failed: Administration expected 4 complaints, got ' || v_count;

  raise notice 'All 6 RLS Privacy verification tests passed successfully.';
end $$;

-- Rollback keeps your database completely untouched
rollback;

