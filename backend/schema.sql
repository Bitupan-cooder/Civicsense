-- ====================================================================
-- PHASE 1: Database schema, enums, indexes, and Row Level Security
-- ====================================================================

-- 1. ENUMS
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('administration', 'department', 'social_service', 'student');
  end if;

  if not exists (select 1 from pg_type where typname = 'id_card_status') then
    create type public.id_card_status as enum ('pending', 'verified', 'not_valid');
  end if;

  if not exists (select 1 from pg_type where typname = 'complaint_visibility') then
    create type public.complaint_visibility as enum ('administration', 'department', 'social_service');
  end if;

  if not exists (select 1 from pg_type where typname = 'complaint_status') then
    create type public.complaint_status as enum ('submitted', 'under_verification', 'accepted', 'in_progress', 'resolved', 'rejected');
  end if;
end $$;

-- 2. TABLES

-- Table: profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'student',
  name text not null,
  email text not null,
  unit_name text,
  must_change_password boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Table: id_cards
create table if not exists public.id_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  cloudinary_public_id text not null,
  status public.id_card_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Table: complaints
create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  visibility public.complaint_visibility not null,
  target_unit_id uuid references public.profiles(id) on delete set null,
  status public.complaint_status not null default 'submitted',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Table: complaint_evidence
create table if not exists public.complaint_evidence (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  cloudinary_public_id text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- Table: complaint_status_history
create table if not exists public.complaint_status_history (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  status public.complaint_status not null,
  remark text,
  changed_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- Table: activity_log
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  target text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 3. INDEXES
create index if not exists idx_profiles_role_active on public.profiles(role, is_active);
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_id_cards_user_id on public.id_cards(user_id);
create index if not exists idx_id_cards_status on public.id_cards(status);
create index if not exists idx_complaints_student_id on public.complaints(student_id);
create index if not exists idx_complaints_visibility on public.complaints(visibility);
create index if not exists idx_complaints_target_unit_id on public.complaints(target_unit_id);
create index if not exists idx_complaints_status on public.complaints(status);
create index if not exists idx_complaints_created_at on public.complaints(created_at desc);
create index if not exists idx_complaint_evidence_complaint_id on public.complaint_evidence(complaint_id);
create index if not exists idx_complaint_status_history_complaint_id on public.complaint_status_history(complaint_id, created_at asc);
create index if not exists idx_activity_log_actor_id on public.activity_log(actor_id, created_at desc);
create index if not exists idx_activity_log_created_at on public.activity_log(created_at desc);

-- 4. SECURITY DEFINER HELPER FUNCTIONS
-- These prevent recursive RLS evaluations when querying profiles.

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active = true limit 1;
$$;

create or replace function public.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_active from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.can_read_complaint(
  p_student_id uuid,
  p_visibility public.complaint_visibility,
  p_target_unit_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return false;
  end if;

  select role into v_role from public.profiles where id = v_uid and is_active = true;
  if v_role is null then
    return false;
  end if;

  -- 1. Student can ONLY ever see their own complaints
  if v_role = 'student' then
    return p_student_id = v_uid;
  end if;

  -- 2. Administration can see all complaints
  if v_role = 'administration' then
    return true;
  end if;

  -- 3. Department: strictly can only read complaints targeted to their assigned department unit
  if v_role = 'department' then
    if p_visibility = 'department' then
      if p_target_unit_id = v_uid then
        return true;
      end if;
      if p_target_unit_id is not null and exists (
        select 1 from public.profiles target_p
        join public.profiles my_p on my_p.id = v_uid
        where target_p.id = p_target_unit_id
          and target_p.unit_name is not null
          and target_p.unit_name = my_p.unit_name
      ) then
        return true;
      end if;
    end if;
    return false;
  end if;

  -- 4. Social Service (DUSU Council): strictly can only read complaints submitted with social_service visibility
  if v_role = 'social_service' then
    return p_visibility = 'social_service';
  end if;

  return false;
end;
$$;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable and force RLS on all tables
alter table public.profiles enable row level security;
alter table public.profiles force row level security;

alter table public.id_cards enable row level security;
alter table public.id_cards force row level security;

alter table public.complaints enable row level security;
alter table public.complaints force row level security;

alter table public.complaint_evidence enable row level security;
alter table public.complaint_evidence force row level security;

alter table public.complaint_status_history enable row level security;
alter table public.complaint_status_history force row level security;

alter table public.activity_log enable row level security;
alter table public.activity_log force row level security;

-- Drop existing policies to ensure clean re-runs
drop policy if exists profiles_select_policy on public.profiles;
drop policy if exists profiles_insert_policy on public.profiles;
drop policy if exists profiles_update_policy on public.profiles;
drop policy if exists profiles_delete_policy on public.profiles;

drop policy if exists id_cards_select_policy on public.id_cards;
drop policy if exists id_cards_insert_policy on public.id_cards;
drop policy if exists id_cards_update_policy on public.id_cards;
drop policy if exists id_cards_delete_policy on public.id_cards;

drop policy if exists complaints_select_policy on public.complaints;
drop policy if exists complaints_insert_policy on public.complaints;
drop policy if exists complaints_update_policy on public.complaints;
drop policy if exists complaints_delete_policy on public.complaints;

drop policy if exists complaint_evidence_select_policy on public.complaint_evidence;
drop policy if exists complaint_evidence_insert_policy on public.complaint_evidence;
drop policy if exists complaint_evidence_delete_policy on public.complaint_evidence;

drop policy if exists complaint_status_history_select_policy on public.complaint_status_history;
drop policy if exists complaint_status_history_insert_policy on public.complaint_status_history;

drop policy if exists activity_log_select_policy on public.activity_log;
drop policy if exists activity_log_insert_policy on public.activity_log;

-- ─── PROFILES POLICIES ──────────────────────────────────────
create policy profiles_select_policy on public.profiles
  for select
  using (
    id = auth.uid()
    or public.current_user_role() = 'administration'
    or (role in ('department', 'social_service') and is_active = true)
    or exists (
      select 1 from public.complaints c
      where c.student_id = profiles.id
        and public.can_read_complaint(c.student_id, c.visibility, c.target_unit_id)
    )
  );

create policy profiles_insert_policy on public.profiles
  for insert
  with check (
    (id = auth.uid() and role = 'student')
    or public.current_user_role() = 'administration'
  );

create policy profiles_update_policy on public.profiles
  for update
  using (
    id = auth.uid()
    or public.current_user_role() = 'administration'
  )
  with check (
    id = auth.uid()
    or public.current_user_role() = 'administration'
  );

create policy profiles_delete_policy on public.profiles
  for delete
  using (
    public.current_user_role() = 'administration'
  );

-- ─── ID CARDS POLICIES ──────────────────────────────────────
create policy id_cards_select_policy on public.id_cards
  for select
  using (
    user_id = auth.uid()
    or public.current_user_role() = 'administration'
    or (
      public.current_user_role() in ('department', 'social_service')
      and exists (
        select 1 from public.complaints c
        where c.student_id = id_cards.user_id
          and public.can_read_complaint(c.student_id, c.visibility, c.target_unit_id)
      )
    )
  );

create policy id_cards_insert_policy on public.id_cards
  for insert
  with check (
    user_id = auth.uid()
    and public.current_user_role() = 'student'
  );

create policy id_cards_update_policy on public.id_cards
  for update
  using (
    (user_id = auth.uid() and status = 'not_valid')
    or public.current_user_role() in ('administration', 'department', 'social_service')
  )
  with check (
    (user_id = auth.uid() and status = 'pending')
    or public.current_user_role() in ('administration', 'department', 'social_service')
  );

create policy id_cards_delete_policy on public.id_cards
  for delete
  using (
    public.current_user_role() = 'administration'
  );

-- ─── COMPLAINTS POLICIES ────────────────────────────────────
create policy complaints_select_policy on public.complaints
  for select
  using (
    public.can_read_complaint(student_id, visibility, target_unit_id)
  );

create policy complaints_insert_policy on public.complaints
  for insert
  with check (
    auth.uid() = student_id
    and public.current_user_role() = 'student'
  );

create policy complaints_update_policy on public.complaints
  for update
  using (
    public.current_user_role() = 'administration'
    or (
      public.current_user_role() in ('department', 'social_service')
      and public.can_read_complaint(student_id, visibility, target_unit_id)
    )
  )
  with check (
    public.current_user_role() = 'administration'
    or (
      public.current_user_role() in ('department', 'social_service')
      and public.can_read_complaint(student_id, visibility, target_unit_id)
    )
  );

create policy complaints_delete_policy on public.complaints
  for delete
  using (
    public.current_user_role() = 'administration'
  );

-- ─── COMPLAINT EVIDENCE POLICIES ────────────────────────────
create policy complaint_evidence_select_policy on public.complaint_evidence
  for select
  using (
    exists (
      select 1 from public.complaints c
      where c.id = complaint_evidence.complaint_id
        and public.can_read_complaint(c.student_id, c.visibility, c.target_unit_id)
    )
  );

create policy complaint_evidence_insert_policy on public.complaint_evidence
  for insert
  with check (
    exists (
      select 1 from public.complaints c
      where c.id = complaint_evidence.complaint_id
        and c.student_id = auth.uid()
    )
  );

create policy complaint_evidence_delete_policy on public.complaint_evidence
  for delete
  using (
    public.current_user_role() = 'administration'
  );

-- ─── COMPLAINT STATUS HISTORY POLICIES ──────────────────────
create policy complaint_status_history_select_policy on public.complaint_status_history
  for select
  using (
    exists (
      select 1 from public.complaints c
      where c.id = complaint_status_history.complaint_id
        and public.can_read_complaint(c.student_id, c.visibility, c.target_unit_id)
    )
  );

create policy complaint_status_history_insert_policy on public.complaint_status_history
  for insert
  with check (
    changed_by = auth.uid()
    and exists (
      select 1 from public.complaints c
      where c.id = complaint_status_history.complaint_id
        and (
          c.student_id = auth.uid()
          or public.current_user_role() = 'administration'
          or (
            public.current_user_role() in ('department', 'social_service')
            and public.can_read_complaint(c.student_id, c.visibility, c.target_unit_id)
          )
        )
    )
  );

-- ─── ACTIVITY LOG POLICIES ──────────────────────────────────
create policy activity_log_select_policy on public.activity_log
  for select
  using (
    public.current_user_role() = 'administration'
    or actor_id = auth.uid()
  );

create policy activity_log_insert_policy on public.activity_log
  for insert
  with check (
    actor_id = auth.uid()
    and public.current_user_is_active() = true
  );

-- ─── 6. SECURITY INTEGRITY TRIGGERS ─────────────────────────

-- Enforce profile integrity: prevents students or non-administrators
-- from self-elevating roles, modifying unit assignments, or tampering with active states
create or replace function public.enforce_profile_update_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role public.user_role;
begin
  -- Service role or background processes bypass
  if auth.uid() is null then
    NEW.updated_at = timezone('utc'::text, now());
    return NEW;
  end if;

  select role into v_caller_role from public.profiles where id = auth.uid() and is_active = true;

  if v_caller_role is null or v_caller_role != 'administration' then
    if NEW.role is distinct from OLD.role then
      raise exception 'Security violation: Only Central Administration can modify user roles.';
    end if;
    if NEW.is_active is distinct from OLD.is_active then
      raise exception 'Security violation: Only Central Administration can modify account activation status.';
    end if;
    if NEW.unit_name is distinct from OLD.unit_name then
      raise exception 'Security violation: Only Central Administration can modify official unit assignments.';
    end if;
  end if;

  NEW.updated_at = timezone('utc'::text, now());
  return NEW;
end;
$$;

drop trigger if exists trg_profile_update_integrity on public.profiles;
create trigger trg_profile_update_integrity
  before update on public.profiles
  for each row
  execute function public.enforce_profile_update_integrity();

-- ─── 7. INITIAL DEMO CENTRAL ADMINISTRATION PROFILE ─────────
do $$
declare
  v_user_id uuid := gen_random_uuid();
begin
  if not exists (select 1 from auth.users where email = 'admin@dibru.ac.in') then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'admin@dibru.ac.in',
      crypt('Admin@123456', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Registrar Office"}',
      now(),
      now()
    );
  else
    select id into v_user_id from auth.users where email = 'admin@dibru.ac.in';
    update auth.users set encrypted_password = crypt('Admin@123456', gen_salt('bf')) where id = v_user_id;
  end if;

  insert into public.profiles (id, role, name, email, unit_name, is_active, must_change_password)
  values (
    v_user_id,
    'administration',
    'Dr. P. K. Kakoty (Registrar)',
    'admin@dibru.ac.in',
    'Office of the Registrar & Proctor',
    true,
    false
  )
  on conflict (id) do update set
    role = 'administration',
    is_active = true,
    must_change_password = false;
end $$;
