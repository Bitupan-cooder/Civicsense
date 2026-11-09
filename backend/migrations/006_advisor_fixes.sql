-- 006: Supabase advisor fixes. Additive and safe to re-run.
--
-- 1. RLS policies call auth.uid() through (select auth.uid()), so Postgres evaluates it once per query
--    instead of once per row (advisor "Auth RLS Initialization Plan"). Same rules, same results.
--    schema.sql and 001 already define the policies this way; this brings an existing database in line.
-- 2. Indexes on the foreign keys the app filters by (advisor "Unindexed foreign keys").
-- 3. Trigger functions are not callable through the API (advisor "SECURITY DEFINER function executable").
--    Postgres checks EXECUTE only when a trigger is created, not when it fires, so the triggers keep working.

-- 1. Policies -------------------------------------------------------------------------------------------

alter policy activity_log_insert_policy on public.activity_log
  with check (actor_id = (select auth.uid()) and public.current_user_is_active() = true);

alter policy activity_log_select_policy on public.activity_log
  using (public.current_user_role() = 'administration' or actor_id = (select auth.uid()));

alter policy authorities_select_policy on public.authorities
  using ((select auth.uid()) is not null);

alter policy routing_rules_select_policy on public.routing_rules
  using ((select auth.uid()) is not null);

alter policy complaint_replies_select_policy on public.complaint_replies
  using (
    exists (
      select 1 from public.complaints c
      where c.id = complaint_replies.complaint_id
        and (
          (c.student_id = (select auth.uid()) and complaint_replies.visibility = 'public')
          or (public.current_user_role() <> 'student'
              and (public.can_read_complaint(c.student_id, c.visibility, c.target_unit_id) or public.is_routed_to_me(c.id)))
        )
    )
  );

alter policy complaint_status_history_insert_policy on public.complaint_status_history
  with check (
    changed_by = (select auth.uid())
    and exists (
      select 1 from public.complaints c
      where c.id = complaint_status_history.complaint_id
        and (
          (c.student_id = (select auth.uid()) and complaint_status_history.status = 'submitted')
          or public.current_user_role() = 'administration'
          or (
            public.current_user_role() in ('department', 'social_service')
            and (public.can_read_complaint(c.student_id, c.visibility, c.target_unit_id) or public.is_routed_to_me(c.id))
          )
        )
    )
  );

alter policy id_cards_insert_policy on public.id_cards
  with check (user_id = (select auth.uid()) and public.current_user_role() = 'student');

alter policy id_cards_select_policy on public.id_cards
  using (
    user_id = (select auth.uid())
    or public.current_user_role() = 'administration'
    or (
      public.current_user_role() in ('department', 'social_service')
      and exists (select 1 from public.complaints c where c.student_id = id_cards.user_id and public.can_see_reporter(c.id))
    )
  );

alter policy id_cards_update_policy on public.id_cards
  using (
    (user_id = (select auth.uid()) and status = 'not_valid')
    or public.current_user_role() = 'administration'
    or (
      public.current_user_role() in ('department', 'social_service')
      and exists (
        select 1 from public.complaints c
        where c.student_id = id_cards.user_id
          and public.can_read_complaint(c.student_id, c.visibility, c.target_unit_id)
      )
    )
  )
  with check (
    (user_id = (select auth.uid()) and status = 'pending' and reviewed_by is null)
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

alter policy notifications_select_policy on public.notifications
  using (user_id = (select auth.uid()));

alter policy notifications_update_policy on public.notifications
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy profiles_insert_policy on public.profiles
  with check ((id = (select auth.uid()) and role = 'student') or public.current_user_role() = 'administration');

alter policy profiles_select_policy on public.profiles
  using (
    id = (select auth.uid())
    or public.current_user_role() = 'administration'
    -- signed-in users only: anonymous visitors must not list officials' names and emails
    or ((select auth.uid()) is not null and role in ('department', 'social_service') and is_active = true)
    or exists (select 1 from public.complaints c where c.student_id = profiles.id and public.can_see_reporter(c.id))
  );

alter policy profiles_update_policy on public.profiles
  using (id = (select auth.uid()) or public.current_user_role() = 'administration')
  with check (id = (select auth.uid()) or public.current_user_role() = 'administration');

-- 2. Foreign-key indexes --------------------------------------------------------------------------------

create index if not exists idx_notifications_complaint_id on public.notifications(complaint_id);
create index if not exists idx_signals_complaint_id on public.signals(complaint_id);
create index if not exists idx_complaints_duplicate_of on public.complaints(duplicate_of);
create index if not exists idx_complaints_possible_duplicate_of on public.complaints(possible_duplicate_of);

-- 3. Trigger functions out of the API -------------------------------------------------------------------

revoke execute on function public.enforce_profile_update_integrity() from public, anon, authenticated;

do $$
begin
  -- created by the dashboard's "enable RLS automatically" setting, not by these files
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
