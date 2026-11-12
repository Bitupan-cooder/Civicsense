<div align="center">

# <img src="public/favicon.svg" alt="" width="36" height="36"> Xohari

**Smart campus redressal for Dibrugarh University**

Students report campus problems in Assamese or English. AI sorts, summarises, de-duplicates and routes each one to every office responsible. Officials resolve it from one console, and the student watches it travel like a parcel.

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.6-339933?logo=node.js&logoColor=white)](package.json)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Tests](https://img.shields.io/badge/tests-59%20passing-brightgreen.svg)](#testing)

[**Live site**](https://xohari.me) · [Deployment guide](docs/DEPLOY.md) · [Frontend guide](docs/FRONTEND.md) · [Report a bug](https://github.com/Bitupan-cooder/Civicsense/issues) · [Request a feature](https://github.com/Bitupan-cooder/Civicsense/issues)

<br>

<a href="docs/media/xohari-promo.mp4"><img src="docs/media/xohari-promo-poster.jpg" alt="Xohari product film: Report Fearlessly. Every campus issue deserves a verified resolution." width="720"></a>

▶ **[Watch the 63-second product film](docs/media/xohari-promo.mp4)** (MP4, 1080p, with sound)

</div>

---

> Built for **Game of Codes, ANAZORI v16.0** at Dibrugarh University (problem statement PS-04). The repository codename is **CivicSense**, which is also the name of the xoharibot.

## Table of contents

- [Why Xohari](#why-xohari)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Deployment](#deployment)
- [Demo walkthrough](#demo-walkthrough)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## Why Xohari

On campus, a broken tap, a dead Wi-Fi router or a harassment case usually ends up as:

- a paper application that waits on someone's desk, or
- a message in a WhatsApp group that everyone sees and nobody owns.

Students don't know **who** is responsible, **whether** anyone saw it, or **when** it will be fixed. Officials, in turn, get scattered, duplicated, half-described reports, many of them in Assamese, with no priority order.

| For students | For officials |
|---|---|
| Report in under a minute: text, photo or both, in Assamese or English | A queue that arrives **already sorted**: category, priority, bilingual summary |
| Pick the place on a campus map | **Duplicates** flagged, even an Assamese report matching an English one |
| A **route tracker** for each office: delivered → seen → replied → resolved | Replies are translated automatically into the student's language |
| Live notifications; confirm the fix or reopen it | Statistics, routing editor, review queue for unclear cases |
| Raise an issue straight from a **Telegram, Discord or Moodle** group by tagging the bot | Issues discussed in groups reach the right office **before** anyone files a complaint |

## Features

- **Bilingual AI analysis.** One Gemini 2.5 Flash call reads the text and the photo and returns the category, priority 1–4, a sensitive flag, the location, an English and Assamese summary, and a confidence score. If that model is out of quota, Gemini 2.5 Flash-Lite answers instead.
- **Safety rules in code, not in the prompt.** Code enforces priority floors (exposed wires are always urgent) and never accepts invented details. Low-confidence results and non-complaints go to a human review queue instead of being routed. If Gemini is down, built-in keyword rules take over, so the app never stops.
- **Cross-language duplicate detection.** Multilingual embeddings (pgvector) catch "হোষ্টেল ৩ ত পানী নাই" and "No water in Hostel 3" as the same issue. The admin merges them in one click.
- **Multi-recipient routing with a route tracker.** Each complaint goes to the post that owns the category, with the General Secretary copied. The student sees every recipient's checkpoints, and overdue complaints escalate automatically.
- **Privacy by design.**
  - "Hide my name from the student union": union posts see the issue but not the reporter.
  - Sensitive cases (harassment, threats) go to the Head only.
  - Postgres Row Level Security decides who can read what, not the frontend.
- **Agent tag: complaints from group chats.** A student tags the bot in a Telegram or Discord group, or writes `@CivicSense` in a Moodle forum post. The bot analyses the message and routes it as a *signal*; when another affected student replies "+1", it reaches the office. The official answers, and the bot replies in the group. Guardrails:
  - The bot reads only messages meant for it.
  - Only linked student accounts can report.
  - Daily limits apply.
  - Sensitive issues are never answered publicly.
- **Developer monitoring.** The console's System page shows Gemini calls, tokens and estimated cost; latency, failure rates and how often the fallback took over; server errors and chat-bot health.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite; GSAP, Lenis and Framer Motion for motion; canvas campus map |
| Backend | Node 22 API (`backend/api.ts`), deployed as a single bundled function on Vercel |
| Database and auth | Supabase: Postgres with Row Level Security, Auth, Realtime, pgvector |
| AI | Google Gemini 2.5 Flash with Flash-Lite as quota fallback (analysis, translation); `gemini-embedding-001` (duplicates); keyword-rule fallback |
| Media | Cloudinary (signed uploads, private evidence files) |
| Chat integrations | Telegram Bot API (long polling), Discord Gateway, Moodle plugin `local_civicsense` (PHP) |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) **22.6 or newer** (the API runs TypeScript directly with `--experimental-strip-types`)
- A [Supabase](https://supabase.com) project
- A [Cloudinary](https://cloudinary.com) account for evidence uploads
- Optional: a [Gemini API key](https://aistudio.google.com/apikey), a Telegram or Discord bot, a Moodle site

### 1. Install

```bash
git clone https://github.com/Bitupan-cooder/Civicsense.git
cd Civicsense
npm install
cp .env.example .env.local   # then fill in your keys, see Configuration
```

`.env.local` is git-ignored. Never put real keys in `.env.example` or in code.

### 2. Set up the database (once, in the Supabase SQL Editor)

1. Run `backend/schema.sql`.
2. Create the admin login under **Authentication → Users → Add user**. Set its email in `v_admin_email` in the last block of `schema.sql`, and run that block again.
3. Turn **Confirm email** off (Authentication → Providers → Email). Student sign-up needs it off.
4. Run the migrations in order. Each one is additive and safe to re-run:

   | Migration | Adds |
   |---|---|
   | `backend/migrations/001_ai_routing_tracker.sql` | AI analysis, routing to posts, route tracker, replies, notifications. **Run it again whenever you re-run `schema.sql`.** |
   | `backend/migrations/002_chat_signals.sql` | Agent tag: chat account links, signals |
   | `backend/migrations/003_observability.sql` | Token counts and the server-error log for the System page |
   | `backend/migrations/005_server_only_writes.sql` | Removes the old policies that let students write complaints and evidence straight into the tables; the server does all writes. **Run it again after any re-run of an older `schema.sql`.** |
   | `backend/migrations/006_advisor_fixes.sql` | Supabase advisor fixes: faster RLS policies, foreign-key indexes, trigger functions removed from the API |

5. Link posts to official accounts by email, so officials see what is routed to them:

   ```sql
   update public.authorities set email = 'gs@dibru.ac.in' where post_key = 'general_secretary';
   update public.authorities set email = 'admin@dibru.ac.in' where post_key = 'head';
   ```

### 3. Run

```bash
npm run dev
```

The student site opens at http://localhost:3000 and the officials' console at http://localhost:3000/admin. Without a complete `.env.local` the pages still load, but every `/api/*` call returns "Server not configured".

## Configuration

All settings live in `.env.local`; [`.env.example`](.env.example) lists every variable with a comment.

| Variable | Required | Purpose |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Yes | Database and auth. The service-role key is **server only**. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Yes | Evidence uploads and short-lived viewing links |
| `GEMINI_API_KEY` | No | AI analysis. Without it, the keyword rules analyse everything. |
| `GEMINI_MODELS` | No | Model fallback chain (default `gemini-2.5-flash,gemini-2.5-flash-lite`) |
| `GEMINI_PRICE_INPUT_PER_M`, `GEMINI_PRICE_OUTPUT_PER_M` | No | US dollars per million tokens, to show estimated cost on the System page |
| `CRON_SECRET` | No | Protects `GET /api/cron/escalations` for scheduled escalation and closure |
| `LOCAL_MAINTENANCE` | No | `true` in the long-running `npm run server` process to run maintenance every minute |
| `CHAT_BOTS`, `TELEGRAM_BOT_TOKEN`, `DISCORD_BOT_TOKEN`, `PUBLIC_SITE_URL` | No | Telegram and Discord bots, see below |
| `MOODLE_URL`, `MOODLE_TOKEN`, `MOODLE_SECRET` | No | Moodle forum integration, see below |

### Chat integrations

- **Telegram:** create a bot with [@BotFather](https://t.me/BotFather) and set `TELEGRAM_BOT_TOKEN`. Keep the default privacy mode. `/report` always works; plain @mentions may need the bot to be a group admin.
- **Discord:** create an application and bot in the [Developer Portal](https://discord.com/developers/applications) and set `DISCORD_BOT_TOKEN`. Invite it with the `bot` scope and the *Send Messages* and *Read Message History* permissions. It needs no privileged intents.
- **Both bots:** set `PUBLIC_SITE_URL` (where students open their account link) and `CHAT_BOTS=true` in **one** process only. The bots need a long-running process (`npm run dev`, `preview` or `server`), not a Vercel function.
- **Moodle:** install [`moodle/local/civicsense`](moodle/local/civicsense/README.md) on the Moodle site, then set the three `MOODLE_*` variables. Moodle pushes posts to the API, so this also works on Vercel.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with the API at http://localhost:3000 |
| `npm run build` | Type-checks, then builds `index.html` and `admin.html` into `dist/` |
| `npm run preview` | Serves the production build **with** the API (needs `.env.local`) |
| `npm run server` | API only, on port 3001 (no static files) |
| `npm run vercel-build` | Production build plus the Vercel output in `.vercel/output` |
| `npm test` | Unit and integration tests |
| `npm run test:live -- <url>` | End-to-end test against the real Supabase project through a running server |

## Testing

```bash
npm test
```

59 tests cover the access rules, the routing and safety rules (against the PRD's demo scenarios), the AI module, the API handlers, the chat integrations and complaint completion. They use Node's built-in test runner.

```bash
npm run test:live -- http://localhost:3000
```

The live test checks the database rules and the full complaint flow against your real Supabase project, through a running dev server. It creates temporary `zz-migration-test-*` accounts and always deletes them again.

## Project structure

```text
.
├── index.html, admin.html     # Entry pages: student site, officials' console
├── src/
│   ├── site/                  # Student site: sections, report form, tracker, animations
│   ├── admin/                 # Officials' console: queue, stats, routing editor, system page
│   ├── components/ui/         # Shared visual components
│   ├── civicAuth.ts           # Supabase client and data access
│   ├── logic.ts               # Routing and safety rules (shared with the API)
│   └── i18n.ts, uiTranslations.ts   # English / Assamese
├── backend/
│   ├── api.ts                 # HTTP API (used by Vite in dev, Vercel in production)
│   ├── ai.ts                  # Gemini analysis, translation, embeddings
│   ├── chat.ts, chatbots.ts   # Telegram, Discord and Moodle agent tag
│   ├── schema.sql, migrations/  # Database schema and RLS policies
│   └── *.test.ts              # Tests
├── moodle/local/civicsense/   # Moodle plugin (PHP)
├── public/                    # Static images and icons
├── scripts/vercel-output.mjs  # Packages the Vercel build output
└── docs/                      # Deployment and frontend guides
```

## Deployment

The site and API deploy to Vercel as static pages plus one bundled function. [docs/DEPLOY.md](docs/DEPLOY.md) covers the Vercel project, environment variables, the custom domain, Vercel's limits, and running the chat bots in an always-on process.

## Demo walkthrough

A three-minute tour of the main features:

1. **Assamese report:** a student files "হোষ্টেল ৩ ত কালিৰ পৰা পানী নাই" with a photo. AI files it as *water*. The tracker shows *Head / Chairperson* and *General Secretary* (copied), both "delivered".
2. **Cross-language duplicate:** a second student files "No water in Hostel 3 since yesterday". The console flags it as a possible duplicate, and the admin merges it.
3. **Reply in the student's language:** the official replies in English. The student reads it in Assamese, and the tracker turns "replied".
4. **Sensitive report:** a harassment report reaches the Head only. The union never sees the reporter.
5. **Agent tag:** in a Telegram group, `@CivicSenseBot no Wi-Fi in the library`, then a second student replies "+1". The signal appears on the console; the official acknowledges it, and the bot answers in the group.
6. **System page:** the AI calls, tokens and cost of the whole demo.

## Contributing

Contributions are welcome: bug reports, fixes, translations and new features.

1. Open an [issue](https://github.com/Bitupan-cooder/Civicsense/issues) first for anything larger than a small fix, so we can agree on the approach.
2. Fork the repository and create a branch from `main`.
3. Make your change. Keep it focused, and follow the existing code style.
4. Run `npm run build` and `npm test`; both must pass.
5. Open a pull request that explains what changed and why. Add screenshots for visual changes.

Working on the student site's look? Read [docs/FRONTEND.md](docs/FRONTEND.md) first: it explains which screens are wired to the backend and which data hooks must stay as they are.

Assamese translations live in `src/uiTranslations.ts`; corrections from native speakers are especially appreciated.

## Security

Please **don't open a public issue** for security problems. Contact the maintainers privately through their GitHub profiles instead, and give us a chance to fix it before disclosure.

Never commit real keys. The Supabase service-role key and the Cloudinary and Gemini secrets are server only and must stay in `.env.local` or your hosting provider's environment settings.

## License

Released under the [MIT License](LICENSE)..

## Acknowledgements

- **Dibrugarh University** and **Game of Codes, ANAZORI v16.0**, for the problem statement.
- The startup logo reveal is adapted from [zanwei/glass-icon-reveal](https://github.com/zanwei/glass-icon-reveal) (MIT).
- Built on [Supabase](https://supabase.com), [Google Gemini](https://ai.google.dev), [Cloudinary](https://cloudinary.com), [GSAP](https://gsap.com), [Lenis](https://lenis.darkroom.engineering) and [Vite](https://vite.dev).
- Thanks to everyone who has [contributed](https://github.com/Bitupan-cooder/Civicsense/graphs/contributors).
