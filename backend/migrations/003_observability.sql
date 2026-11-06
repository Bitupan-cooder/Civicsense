-- ====================================================================
-- Migration 003: developer monitoring (console page /admin/system)
-- Run once in the Supabase SQL Editor, after 001. Safe to re-run. Additive only.
--
-- Adds:
--   * ai_logs.input_tokens / output_tokens: Gemini token usage per call (output includes "thinking" tokens,
--     which Gemini bills as output). Empty for embeddings and the keyword rules, which report none.
--   * error_logs: every 500 the API returns (method, route without query string, message). Server only.
-- Until it runs, the page still shows calls, failures and latency; tokens and server errors stay empty.
-- ====================================================================

alter table public.ai_logs add column if not exists input_tokens integer;
alter table public.ai_logs add column if not exists output_tokens integer;
create index if not exists ai_logs_created_idx on public.ai_logs (created_at desc);

create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  method text,
  route text not null,
  status integer not null,
  message text,
  created_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists error_logs_created_idx on public.error_logs (created_at desc);

-- read and written only by the server (service role): RLS on, no policies
alter table public.error_logs enable row level security;
