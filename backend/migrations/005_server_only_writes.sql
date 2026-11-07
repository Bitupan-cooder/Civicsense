-- ====================================================================
-- Migration 005: complaints and their evidence are written only by the server
-- Run once in the Supabase SQL Editor. Safe to re-run. Removes two old policies, adds nothing.
--
-- The student site files complaints through POST /api/complaints/create (service role): it checks the daily cap
-- (6 per student per 24 hours), the evidence files, the AI analysis and the routing. Two policies from the first
-- schema still let a signed-in student write those rows straight into the tables, around all of that:
--   * complaints_insert_policy: complaints with any visibility, no cap, no analysis
--   * complaint_evidence_insert_policy: evidence rows naming any Cloudinary file
-- Dropping them changes nothing for the site (the server uses the service role, which bypasses RLS).
-- Re-run this after any re-run of an older copy of schema.sql (the current schema.sql no longer creates them).
-- ====================================================================

drop policy if exists complaints_insert_policy on public.complaints;
drop policy if exists complaint_evidence_insert_policy on public.complaint_evidence;
