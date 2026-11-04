# CivicSense — Campus Issue Reporting

**Dibrugarh University** · Game of Codes | ANAZORI v16.0 (PS-04)

Students report campus problems (water, power, Wi-Fi, hostel, safety, labs) and track them to resolution. Department heads, the DUSU council and central administration work the complaints from an official console.

## What's where

| Path | What it is |
|---|---|
| `src/site/` | Student site (React): landing page, sign-up with ID card, complaint form, campus map, status tracker. Sections in `sections/`, dialogs in `modals/`, state in `studentSession.ts`, `reportForm.ts` and `tracker.ts`. |
| `src/site/campusMap.js`, `animations.js`, `analyzer.js`, `demoData.js` | Plain-JS modules the components import: the canvas campus map, the GSAP/Lenis scroll animations, the language/landmark detector, and local sample data. |
| `docs/FRONTEND.md` | **For the frontend:** every route and screen, where its data comes from, and what not to break while styling. |
| `src/admin/` | Official console (React): department, DUSU (social service) and administration logins. State and actions in `console.ts`. |
| `src/toast.ts` | Toast notifications, shared by both pages. |
| `index.html`, `admin.html` | Thin HTML shells: `<head>`, the campus-map-data `<script>` tags, and the React entry point. |
| `src/civicAuth.ts` | Shared browser client (`import * as auth`): Supabase auth, complaints, uploads, calls to `/api/*`. |
| `backend/api.ts` | Server API (`/api/*`): Cloudinary upload signing, signed file URLs, complaint workflow, admin account management. Uses the Supabase service-role key. |
| `backend/access.ts` | Who-can-see-which-complaint rule used by the API. Mirrors `can_read_complaint()` in `schema.sql`; keep them in sync. |
| `backend/schema.sql` | Database tables, Row Level Security policies and triggers. |
| `Dibrugarh-University-Map-Kit/` | Campus map data and projection scripts loaded by `index.html`. |

## React migration (complete)

The site moved from hand-written HTML pages with a 5,600-line inline script to React, **without changing how it looks or behaves** (apart from listed bug fixes). The CSS is unchanged in `src/site/site.css` and `src/admin/admin.css`. Each step was checked side by side against the original pages; see `Changelog.md` sections 3.7–3.12.

How it fits together:

- Data-driven UI (sign-in state, dialogs, complaint form, tracker, official console) is React state: small stores (`useSyncExternalStore`) with actions, and components that render from them.
- Code that draws or animates the page directly stays imperative, as ES modules: `campusMap.js` (canvas) and `animations.js` (GSAP, ScrollTrigger and Lenis from npm, pinned to the versions the page always used). `main.tsx` renders React synchronously, then starts these in the order and at the moment the old page script did.
- `animations.js` changes some rendered elements directly (splits headings into words, adds decorations, sets inline transforms). Those components have no state, so React never re-renders them. Keep it that way, or move the animation for that element into the component.
- `window` is only used for the campus map data globals from `Dibrugarh-University-Map-Kit/`.

## Setup

Requires **Node 22.6+**.

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase and Cloudinary keys
```

`.env.local` is git-ignored. Never put real keys in `.env.example` or in code.

### Database (once, in the Supabase SQL editor)

1. Run `backend/schema.sql`.
2. Create the admin login in **Supabase → Authentication → Users → Add user** with a strong password.
3. Set `v_admin_email` in the last block of `schema.sql` to that email and run that block again to grant the administration role.
4. Student registration expects **Confirm email** to be off (Authentication → Providers → Email).
5. Run `backend/migrations/001_ai_routing_tracker.sql` (AI analysis, routing to posts, route tracker; see below). It is additive and safe to re-run. **If you run `schema.sql` again later, run the migration again afterwards**, because `schema.sql` recreates policies the migration widens.

### AI analysis and routing (PRD)

After a student files a complaint, the server analyses it (`backend/ai.ts`), applies the PRD's code rules (`src/logic.ts`: priority floors, never-invent, review queue, sensitive routing), and routes it:

- **Gemini** does the analysis when `GEMINI_API_KEY` is set in `.env.local`. Without a key, or when the call fails, the built-in keyword rules do it. A failed Gemini call also sends the complaint to the review queue. Every attempt is logged in `ai_logs`.
- **Routing** follows `routing_rules`: the post that owns the category, with the General Secretary copied. Sensitive complaints go to the Head / Chairperson only. Low-confidence results and non-complaints go to the administration's review queue (status `needs_review`, filter "Needs Review" in the console), to be routed by hand from the docket.
- **Posts are linked to official accounts by email.** An official sees the complaints routed to their post once that post's email matches their login, in addition to what they see today. For example:

  ```sql
  update public.authorities set email = 'gs@dibru.ac.in' where post_key = 'general_secretary';
  update public.authorities set email = 'admin@dibru.ac.in' where post_key = 'head';
  ```
- The **route tracker** (student tracker and admin docket) shows each recipient's checkpoints: delivered, seen (an official opened the docket), replied (an official recorded a remark) and resolved. Only the primary post or an administrator can mark a complaint resolved.

- **Privacy:** "Hide my name from the student union" on the report form. Union posts (and the DUSU role) then see the complaint but not the reporter (`can_see_reporter()` in the migration).
- **Replies and internal notes** from the docket; replies are translated (Gemini) and the reporter reads them in their chosen language. **Notifications** (bell in the student nav and the console header) arrive live through Supabase Realtime.
- **Confirm or reopen:** the reporter confirms a resolved complaint (closed) or reopens it; with no answer for 7 days it closes automatically.

Until the migration is run, none of this appears and the site works exactly as before.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with the API at http://localhost:3000 |
| `npm run build` | Type-checks, then builds `index.html` + `admin.html` into `dist/` |
| `npm run preview` | Serves the production build **with** the API (needs `.env.local`) |
| `npm run server` | API only, on port 3001 (no static files) |
| `npm test` | Tests for the access rule, the PRD routing/safety rules (against its demo scenarios) and the AI module |
| `npm run test:live -- <url>` | Live test of the database rules and the complaint flow against the real Supabase project, through a running dev server (default `http://localhost:3000`). Uses temporary `zz-migration-test-*` accounts and always deletes them again |

Without a complete `.env.local` the pages still load, but every `/api/*` call returns a "Server not configured" error.
hello