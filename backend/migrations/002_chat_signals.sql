-- ====================================================================
-- Migration 002: Agent tag (issues raised in Telegram / Discord groups)
-- Run once in the Supabase SQL Editor, after 001. Safe to re-run. Additive only.
--
-- Adds:
--   * chat_links: a student's Telegram or Discord account, linked once through a signed link the bot sends privately
--   * signals: an issue raised by tagging the bot in a group, analysed and routed like a complaint but not one yet
--   * signal_supporters: the linked students who raised or +1'd a signal (corroboration and rate limit)
-- All three are read and written only by the server (service role): RLS is on and there are no policies.
-- ====================================================================

create table if not exists public.chat_links (
  platform text not null check (platform in ('telegram', 'discord')),
  external_user_id text not null,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (platform, external_user_id)
);
create index if not exists chat_links_student_idx on public.chat_links (student_id);

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('telegram', 'discord')),
  chat_id text not null,
  chat_title text,
  message_id text,                                          -- the tag message the bot replies to
  bot_message_id text,                                      -- the bot's reply: a "+1" reply to it supports the signal
  text text not null,                                       -- only the tagged message, never the surrounding chat
  summary_en text,
  summary_as text,
  ai_category text not null,
  priority integer not null,
  is_sensitive boolean not null default false,
  location_text text,
  confidence numeric,
  embedding jsonb,                                          -- same model as complaints.embedding, for matching
  authority_ids uuid[] not null default '{}',               -- posts it is routed to (routing_rules, as for complaints)
  status text not null default 'pending' check (status in ('pending', 'open', 'acknowledged', 'converted', 'dismissed')),
  complaint_id uuid references public.complaints(id) on delete set null,
  handled_by uuid references public.profiles(id) on delete set null,
  handled_note text,
  handled_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists signals_status_idx on public.signals (status, ai_category, created_at desc);
create index if not exists signals_bot_message_idx on public.signals (platform, chat_id, bot_message_id);

create table if not exists public.signal_supporters (
  signal_id uuid not null references public.signals(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (signal_id, student_id)
);
create index if not exists signal_supporters_student_idx on public.signal_supporters (student_id, created_at desc);

alter table public.chat_links enable row level security;
alter table public.signals enable row level security;
alter table public.signal_supporters enable row level security;
