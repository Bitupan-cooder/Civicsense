-- ====================================================================
-- Migration 001: AI analysis, routing to posts, route tracker (PRD P0)
-- Run once in the Supabase SQL Editor, after backend/schema.sql. Safe to re-run.
-- If you ever run backend/schema.sql again, run this file again afterwards: schema.sql recreates
-- the policies that section 7 below widens.
-- Additive only: no table, column, status or role is dropped or renamed.
--
-- Adds:
--   * statuses needs_review, closed, merged (existing statuses stay)
--   * AI fields on complaints (written only by the server; a trigger enforces it)
--   * authorities (posts) and routing_rules, seeded from the PRD's routing table
--   * complaint_routes (one row per recipient: delivered / seen / replied / resolved)
--   * ai_logs (every AI call)
--   * officials linked to a post (authorities.user_id or authorities.email) can read
--     and update complaints routed to that post, in addition to today's rules
-- ====================================================================

-- 1. Statuses (ADD VALUE cannot be used in the same transaction, so nothing below uses them)
alter type public.complaint_status add value if not exists 'needs_review';
alter type public.complaint_status add value if not exists 'closed';
alter type public.complaint_status add value if not exists 'merged';

-- 2. pgvector, for duplicate detection (the embedding column is filled in a later step)
create extension if not exists vector;

-- 3. AI and lifecycle fields on complaints
alter table public.complaints
  add column if not exists location_id text,               -- landmark the reporter picked
  add column if not exists hide_name_from_union boolean not null default false, -- reporter's privacy choice
  add column if not exists input_language text,             -- 'as' | 'en' | 'mixed'
  add column if not exists is_complaint boolean,
  add column if not exists ai_category text,                -- one of the PRD's 20 categories
  add column if not exists priority smallint check (priority between 1 and 4),
  add column if not exists is_sensitive boolean not null default false,
  add column if not exists location_text text,
  add column if not exists summary_en text,
  add column if not exists summary_as text,
  add column if not exists image_findings text,
  add column if not exists confidence real,
  add column if not exists ai_source text,                  -- 'gemini' | 'rules'
  add column if not exists analysed_at timestamptz,
  add column if not exists embedding vector(768),
  add column if not exists duplicate_of uuid references public.complaints(id) on delete set null,
  add column if not exists human_edited boolean not null default false,
  add column if not exists resolved_at timestamptz,
  add column if not exists closed_at timestamptz;

-- 4. Posts that receive complaints (PRD: posts, not people; names are data)
create table if not exists public.authorities (
  id uuid primary key default gen_random_uuid(),
  post_key text not null unique,
  post_title text not null,
  person_name text,
  level smallint not null check (level between 1 and 3),   -- 1 secretary, 2 GS / VP, 3 Head
  is_union boolean not null default true,
  email text,                                               -- links the post to an official account by email
  user_id uuid references public.profiles(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.routing_rules (
  category text primary key,
  primary_authority_id uuid not null references public.authorities(id),
  copy_authority_ids uuid[] not null default '{}',
  escalate_to_id uuid references public.authorities(id),
  response_hours integer not null default 120,
  active boolean not null default true
);

create table if not exists public.complaint_routes (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  authority_id uuid not null references public.authorities(id),
  kind text not null check (kind in ('primary', 'copy', 'escalation')),
  delivered_at timestamptz not null default timezone('utc'::text, now()),
  seen_at timestamptz,
  replied_at timestamptz,
  resolved_at timestamptz,
  unique (complaint_id, authority_id)
);
create index if not exists complaint_routes_authority_idx on public.complaint_routes (authority_id);

create table if not exists public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid references public.complaints(id) on delete cascade,
  step text not null,                                       -- 'understanding' | 'embedding' | 'translation'
  model text,
  prompt_version text,
  latency_ms integer,
  ok boolean not null,
  raw_output text,
  error text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 5. Only the server writes AI and routing fields
create or replace function public.protect_complaint_ai_fields()
returns trigger
language plpgsql
as $$
declare
  v_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
begin
  -- service role (the API) and direct database sessions (SQL Editor) may write everything
  if v_role in ('', 'service_role') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.hide_name_from_union := false; -- set by the server from the reporter's choice
    new.input_language := null; new.is_complaint := null; new.ai_category := null; new.priority := null;
    new.is_sensitive := false; new.location_text := null; new.summary_en := null; new.summary_as := null;
    new.image_findings := null; new.confidence := null; new.ai_source := null; new.analysed_at := null;
    new.embedding := null; new.duplicate_of := null; new.human_edited := false;
    new.resolved_at := null; new.closed_at := null;
  else
    new.location_id := old.location_id; new.hide_name_from_union := old.hide_name_from_union;
    new.input_language := old.input_language; new.is_complaint := old.is_complaint; new.ai_category := old.ai_category;
    new.priority := old.priority; new.is_sensitive := old.is_sensitive; new.location_text := old.location_text;
    new.summary_en := old.summary_en; new.summary_as := old.summary_as; new.image_findings := old.image_findings;
    new.confidence := old.confidence; new.ai_source := old.ai_source; new.analysed_at := old.analysed_at;
    new.embedding := old.embedding; new.duplicate_of := old.duplicate_of; new.human_edited := old.human_edited;
    new.resolved_at := old.resolved_at; new.closed_at := old.closed_at;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_complaint_ai_fields on public.complaints;
create trigger trg_protect_complaint_ai_fields
  before insert or update on public.complaints
  for each row execute function public.protect_complaint_ai_fields();

-- 6. Is this complaint routed to a post held by the signed-in official?
create or replace function public.is_routed_to_me(p_complaint_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.complaint_routes r
    join public.authorities a on a.id = r.authority_id
    join public.profiles p on p.id = auth.uid()
    where r.complaint_id = p_complaint_id
      and p.is_active
      and p.role <> 'student'
      and a.active
      -- the login email from the JWT, not profiles.email: users can edit their own profile row
      and (a.user_id = p.id or (a.email is not null and lower(a.email) = lower(auth.jwt() ->> 'email')))
  );
$$;

-- 6b. May the signed-in user see who filed this complaint? (PRD privacy choice)
--     With hide_name_from_union, union posts (authorities.is_union, and the DUSU social_service role) see the
--     complaint but not the reporter; administrators, departments and non-union posts (Head) still do.
create or replace function public.can_see_reporter(p_complaint_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.complaints c
    join public.profiles me on me.id = auth.uid()
    where c.id = p_complaint_id
      and me.is_active
      and (
        c.student_id = me.id
        or me.role = 'administration'
        or (not c.hide_name_from_union
            and (public.can_read_complaint(c.student_id, c.visibility, c.target_unit_id) or public.is_routed_to_me(c.id)))
        or (c.hide_name_from_union and me.role = 'department'
            and public.can_read_complaint(c.student_id, c.visibility, c.target_unit_id))
        or (c.hide_name_from_union and exists (
              select 1 from public.complaint_routes r
              join public.authorities a on a.id = r.authority_id
              where r.complaint_id = c.id and a.active and not a.is_union
                and (a.user_id = me.id or (a.email is not null and lower(a.email) = lower(auth.jwt() ->> 'email')))))
      )
  );
$$;

-- 7. Widen the existing policies: "can read today" OR "routed to my post"
drop policy if exists complaints_select_policy on public.complaints;
create policy complaints_select_policy on public.complaints
  for select
  using (
    public.can_read_complaint(student_id, visibility, target_unit_id)
    or public.is_routed_to_me(id)
  );

drop policy if exists complaints_update_policy on public.complaints;
create policy complaints_update_policy on public.complaints
  for update
  using (
    public.current_user_role() = 'administration'
    or (
      public.current_user_role() in ('department', 'social_service')
      and (public.can_read_complaint(student_id, visibility, target_unit_id) or public.is_routed_to_me(id))
    )
  )
  with check (
    public.current_user_role() = 'administration'
    or (
      public.current_user_role() in ('department', 'social_service')
      and (public.can_read_complaint(student_id, visibility, target_unit_id) or public.is_routed_to_me(id))
    )
  );

drop policy if exists complaint_evidence_select_policy on public.complaint_evidence;
create policy complaint_evidence_select_policy on public.complaint_evidence
  for select
  using (
    exists (
      select 1 from public.complaints c
      where c.id = complaint_evidence.complaint_id
        and (public.can_read_complaint(c.student_id, c.visibility, c.target_unit_id) or public.is_routed_to_me(c.id))
    )
  );

drop policy if exists complaint_status_history_select_policy on public.complaint_status_history;
create policy complaint_status_history_select_policy on public.complaint_status_history
  for select
  using (
    exists (
      select 1 from public.complaints c
      where c.id = complaint_status_history.complaint_id
        and (public.can_read_complaint(c.student_id, c.visibility, c.target_unit_id) or public.is_routed_to_me(c.id))
    )
  );

drop policy if exists complaint_status_history_insert_policy on public.complaint_status_history;
create policy complaint_status_history_insert_policy on public.complaint_status_history
  for insert
  with check (
    changed_by = auth.uid()
    and exists (
      select 1 from public.complaints c
      where c.id = complaint_status_history.complaint_id
        and (
          (c.student_id = auth.uid() and complaint_status_history.status = 'submitted')
          or public.current_user_role() = 'administration'
          or (
            public.current_user_role() in ('department', 'social_service')
            and (public.can_read_complaint(c.student_id, c.visibility, c.target_unit_id) or public.is_routed_to_me(c.id))
          )
        )
    )
  );

drop policy if exists id_cards_select_policy on public.id_cards;
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
          and public.can_see_reporter(c.id)
      )
    )
  );

drop policy if exists profiles_select_policy on public.profiles;
create policy profiles_select_policy on public.profiles
  for select
  using (
    id = auth.uid()
    or public.current_user_role() = 'administration'
    or (auth.uid() is not null and role in ('department', 'social_service') and is_active = true)
    or exists (
      select 1 from public.complaints c
      where c.student_id = profiles.id
        and public.can_see_reporter(c.id)
    )
  );

-- 8. RLS on the new tables (all writes go through the server's service role)
alter table public.authorities enable row level security;
alter table public.routing_rules enable row level security;
alter table public.complaint_routes enable row level security;
alter table public.ai_logs enable row level security;

drop policy if exists authorities_select_policy on public.authorities;
create policy authorities_select_policy on public.authorities
  for select using (auth.uid() is not null);

drop policy if exists routing_rules_select_policy on public.routing_rules;
create policy routing_rules_select_policy on public.routing_rules
  for select using (auth.uid() is not null);

drop policy if exists complaint_routes_select_policy on public.complaint_routes;
create policy complaint_routes_select_policy on public.complaint_routes
  for select
  using (
    exists (
      select 1 from public.complaints c
      where c.id = complaint_routes.complaint_id
        and (public.can_read_complaint(c.student_id, c.visibility, c.target_unit_id) or public.is_routed_to_me(c.id))
    )
  );

drop policy if exists ai_logs_select_policy on public.ai_logs;
create policy ai_logs_select_policy on public.ai_logs
  for select using (public.current_user_role() = 'administration');

-- 9. Seed posts and routing from the PRD (names are data: confirm with each holder before a public demo).
--    To link a post to an official account, set authorities.email to that official's login email.
insert into public.authorities (post_key, post_title, person_name, level, is_union) values
  ('head', 'Head / Chairperson', null, 3, false),
  ('general_secretary', 'General Secretary', 'Partha Pratim Gohain', 2, true),
  ('vice_president', 'Vice-President', null, 2, true),
  ('sports_secretary', 'Sports Secretary', 'Biki Chetia', 1, true),
  ('cricket_secretary', 'Cricket Secretary', 'Sarat Kutum', 1, true),
  ('music_secretary', 'Music Secretary', 'Abhishree Parashar', 1, true),
  ('debating_secretary', 'Debating / Symposium Secretary', 'Karanraj Karmakar', 1, true),
  ('fine_arts_secretary', 'Fine Arts / Literary Secretary', 'Kristina Gogoi', 1, true),
  ('magazine_editor', 'Magazine Editor', 'Dipak Mandal', 1, true),
  ('girls_common_room_secretary', 'Girls'' Common Room Secretary', 'Jyotishmita Dowarah', 1, true),
  ('boys_common_room_secretary', 'Boys'' Common Room Secretary', 'Bedobrat Saikia', 1, true),
  ('social_service_secretary', 'Social Service Secretary', 'Diya Gogoi', 1, true)
on conflict (post_key) do nothing;

insert into public.routing_rules (category, primary_authority_id, copy_authority_ids, escalate_to_id)
select r.category, p.id, array_remove(array[c.id], null), e.id
from (values
  ('sports', 'sports_secretary', 'general_secretary', 'general_secretary'),
  ('cricket', 'cricket_secretary', 'general_secretary', 'general_secretary'),
  ('music', 'music_secretary', 'general_secretary', 'general_secretary'),
  ('debating', 'debating_secretary', 'general_secretary', 'general_secretary'),
  ('fine_arts_literary', 'fine_arts_secretary', 'general_secretary', 'general_secretary'),
  ('magazine', 'magazine_editor', 'general_secretary', 'general_secretary'),
  ('girls_common_room', 'girls_common_room_secretary', 'general_secretary', 'general_secretary'),
  ('boys_common_room', 'boys_common_room_secretary', 'general_secretary', 'general_secretary'),
  ('social_service', 'social_service_secretary', 'general_secretary', 'general_secretary'),
  ('general', 'general_secretary', 'vice_president', 'head'),
  ('other', 'general_secretary', 'vice_president', 'head'),
  ('electricity', 'head', 'general_secretary', 'head'),
  ('water', 'head', 'general_secretary', 'head'),
  ('sanitation', 'head', 'general_secretary', 'head'),
  ('hostel', 'head', 'general_secretary', 'head'),
  ('library', 'head', 'general_secretary', 'head'),
  ('classroom', 'head', 'general_secretary', 'head'),
  ('road_transport', 'head', 'general_secretary', 'head'),
  ('internet', 'head', 'general_secretary', 'head'),
  ('safety', 'head', 'general_secretary', 'head')
) as r(category, primary_key, copy_key, escalate_key)
join public.authorities p on p.post_key = r.primary_key
left join public.authorities c on c.post_key = r.copy_key
left join public.authorities e on e.post_key = r.escalate_key
on conflict (category) do nothing;

-- ====================================================================
-- 10. Replies and internal notes, notifications, reading language (PRD P0)
-- ====================================================================

-- Language the reporter reads complaint summaries and replies in (PRD "AI output language")
alter table public.profiles
  add column if not exists preferred_language text not null default 'en' check (preferred_language in ('en', 'as'));

-- Replies (visible to the reporter) and internal notes (officials only), stored in both languages
create table if not exists public.complaint_replies (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  authority_id uuid references public.authorities(id) on delete set null,   -- the post replying, when known
  visibility text not null check (visibility in ('public', 'internal')),
  body_original text not null,
  body_language text,                                                       -- 'as' | 'en' | 'mixed'
  body_en text,
  body_as text,
  created_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists complaint_replies_complaint_idx on public.complaint_replies (complaint_id, created_at);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  complaint_id uuid references public.complaints(id) on delete cascade,
  message_en text not null,
  message_as text,
  read boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists notifications_user_idx on public.notifications (user_id, read, created_at desc);

alter table public.complaint_replies enable row level security;
alter table public.notifications enable row level security;

-- Reporter: public replies on their own complaints. Officials: everything on complaints they can read.
drop policy if exists complaint_replies_select_policy on public.complaint_replies;
create policy complaint_replies_select_policy on public.complaint_replies
  for select
  using (
    exists (
      select 1 from public.complaints c
      where c.id = complaint_replies.complaint_id
        and (
          (c.student_id = auth.uid() and complaint_replies.visibility = 'public')
          or (public.current_user_role() <> 'student'
              and (public.can_read_complaint(c.student_id, c.visibility, c.target_unit_id) or public.is_routed_to_me(c.id)))
        )
    )
  );

-- Each user reads and marks read only their own notifications (the server creates them)
drop policy if exists notifications_select_policy on public.notifications;
create policy notifications_select_policy on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists notifications_update_policy on public.notifications;
create policy notifications_update_policy on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Live updates (PRD: Supabase Realtime): new notifications reach the browser without reloading
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

-- System actions (the 7-day auto-close) have no person behind them
alter table public.complaint_status_history alter column changed_by drop not null;
