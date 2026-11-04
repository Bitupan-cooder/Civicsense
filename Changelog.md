# Changelog

All changes below were made on **2 November 2026** and are **not committed yet**. Review them with `git status` / `git diff`, then commit.

Contents:

1. [Action required (things the code can't do for you)](#1-action-required)
2. [Decisions needed](#2-decisions-needed)
3. [Changes made — 2026-11-02](#3-changes-made--2026-11-02)
4. [Findings from the project analyses](#4-findings-from-the-project-analyses)
5. [Still open](#5-still-open)
6. [How to run and verify](#6-how-to-run-and-verify)

---

## 1. Action required

Do these in order. The first one is urgent.

| # | Task | Why | Where |
|---|---|---|---|
| 1 | **Rotate the Supabase `service_role` key** | It was committed in `.env.example` and is in the GitHub history (first in commit `92b525e`, 2026-11-01). It bypasses all database security. It was confirmed working. | Supabase → Project Settings → API → reset the service_role key |
| 2 | **Rotate the Cloudinary API secret** | It was committed in `.env.example` and hardcoded in `backend/api.ts`. | Cloudinary → Settings → API Keys → generate a new key pair |
| 3 | Put the new keys in `.env.local` | `.env.local` is git-ignored and already holds the old values with the new variable names. Only replace the values. | `.env.local` (project root, local only; each teammate needs their own copy) |
| 4 | ~~Run `backend/schema.sql` again~~ **Done 2026-11-02** | The live database had an older version (the 3.3 fixes were missing, and department accounts could read every DUSU complaint). Re-run from the SQL Editor; all 3.3 rules verified live. | — |
| 5 | Create a new admin login | The schema no longer creates an admin with a hardcoded password. Create one with a strong password, set its email in `v_admin_email` in the last block of `schema.sql`, then run that block. | Supabase → Authentication → Users → Add user |
| 6 | **Turn Confirm email off** | Student signup needs a session right after sign-up. It is currently **on** (checked 2026-11-02), so new students can't finish registering. Signup now stops with a clear error instead of failing silently. | Supabase → Authentication → Providers → Email |
| 7 | Consider removing the old keys from git history | Rotating (1–2) makes the leaked keys useless, which is the important part. Rewriting history (e.g. `git filter-repo`) is optional, needs a force-push and every teammate must re-clone. | GitHub repo |
| 8 | Check whether the GitHub repo is public | This couldn't be checked from the dev machine. If it's public, assume the keys were seen. | github.com/Bitupan-cooder/Civicsense → Settings |
| 9 | ~~Fix the Cloudinary credentials~~ **Done 2026-11-02** | Corrected `CLOUDINARY_CLOUD_NAME=u8tktyoc` and `CLOUDINARY_API_SECRET` in `.env.local`. Cloudinary authenticated upload signature generation and live storage upload verified with status 200. | `.env.local` |
| 10 | ~~Run `backend/migrations/001_ai_routing_tracker.sql`~~ **Done 2026-11-02** | Applied after #4 and tested live end to end (3.16). If `schema.sql` is ever re-run, run this again afterwards. | — |
| 11 | Link posts to official accounts | Routed complaints reach an official only when their post's `authorities.email` matches their login. The Head / Chairperson post should be an administration account. Example in the README. | Supabase → SQL Editor |
| 12 | Add `GEMINI_API_KEY` (optional) | Without it, the keyword rules analyse complaints. They're weaker: for example, "No water in the Boys Hostel 2 bathroom" comes out as `hostel`, not `water`. | `.env.local` (key from aistudio.google.com) |

---

## 2. Decisions needed

| Question | Current state | Notes |
|---|---|---|
| **Can department accounts see DUSU (`social_service`) complaints?** | **No.** The API and the database both say no. (Until schema.sql was re-run on 2026-11-02, the *live* database still said yes; see 3.3.) The old API allowed it. If the answer becomes yes, change `can_read_complaint()` in `backend/schema.sql`, `backend/access.ts` (and its test) and the "department sees only…" check in `backend/live-test.mjs` together. |
| ~~Delete the old React app in `src/`?~~ | **Decided 2026-11-02:** switch to React. | The old `src/` (an older design) was replaced by a React version of the current site. See [3.7](#37-react-migration-step-1). |
| **Demo complaint chips in the tracker** (CS-8921 …) | Kept; clicking one shows "No complaint record found" (3.10). | They are local sample data from before the database existed. Remove them, or add matching demo complaints to the database. |
| **Real people's names in demo data** | Unchanged. | Names such as "Prof. A. K. Buragohain" and "Bikash Jyoti Saikia" appear in the student site's sample data (`src/site/legacy.js`) and in the live `profiles` table, with `@dibru.ac.in` emails. The admin page's unused copy was deleted in 3.11. Replace them with placeholders unless those people agreed. |
| **Keep the local "officials" demo in `index.html`?** | Kept, output escaped. | It uses the fixed passcode `civic2026` and only reads browser `localStorage`. No button opens it any more. The real official console is `admin.html`. |

---

## 3. Changes made — 2026-11-02

### 3.1 Secrets and configuration

| File | Change |
|---|---|
| [.env.example](.env.example) | All real values removed. Now a blank template with 5 variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. |
| `.env.local` (new, git-ignored) | Holds the current values under the new names so the app keeps working locally. **Rotate them** (section 1). |
| [backend/api.ts](backend/api.ts) | No longer loads `.env.example`. All hardcoded fallback keys removed. If a variable is missing, the server logs a warning and every `/api/*` call returns `500 "Server not configured"`. The static pages still load. |
| [public/js/civic-auth.js](public/js/civic-auth.js) | The Supabase *publishable* key stays. It's designed to be public, and the database rules protect the data. |

### 3.2 API security ([backend/api.ts](backend/api.ts), new [backend/access.ts](backend/access.ts))

| Endpoint | Problem | Fix |
|---|---|---|
| `POST /api/cloudinary/sign-upload` | Anyone could get a signature and upload to our Cloudinary account. | Login required. Evidence uploads also need an active student account. |
| `GET /api/complaint-evidence/view` | With `complaintId` + `publicId`, it never checked that the file belonged to that complaint. Anyone with access to one complaint could fetch **any** file, including other students' ID cards. | The file is always looked up in the `complaint_evidence` table. |
| `/api/complaint-evidence/view`, `/api/id-card/view`, `/api/id-card/review`, `/api/complaints/update-status` | The API (which runs with the service-role key) allowed more than the database: departments could act on DUSU complaints and on unassigned ones. | All four use one rule, `canAccessComplaint()` in `backend/access.ts`, which mirrors `can_read_complaint()` in `schema.sql`. |
| `POST /api/complaints/update-status` | Database write errors were ignored, so it always returned success. | Input is validated before any write, and every write is checked. |
| `/api/admin/reset-password`, `/toggle-active`, `/edit-official` | An admin could target any user, including other admins. | Only department / DUSU accounts can be targeted. |
| `POST /api/admin/reassign-complaint` | Could reassign to any user ID. | The target must be a department / DUSU account. |
| `POST /api/admin/delete-official` | Failures deleting the login were swallowed, so a "deleted" official could still sign in. | Fails clearly if the login can't be deleted. |
| `GET /api/health` | Publicly showed the database URL and user count. | Returns only `{status, database}`. |
| All POST routes | No body size limit. | Capped at 64 KB. |

[public/js/civic-auth.js](public/js/civic-auth.js) was updated to match:

- Upload signature requests send the login token.
- Signup creates the account first, then uploads the ID card.
- Synchronized Cloudinary signing parameters and active secret in `.env.local` to eliminate `Invalid Signature` upload rejections.

### 3.3 Database rules ([backend/schema.sql](backend/schema.sql))

Applied to the live database on 2026-11-02 (section 1, item 4) and verified: the 4 policies below, `can_read_complaint()`, forced RLS on all 6 tables, and the profile trigger. Re-running it also removed a live-only rule that let every department account read every DUSU (`social_service`) complaint; the live database now matches the file and the API (decision 2).

| Rule | Before | After |
|---|---|---|
| Read officials' profiles | Anyone, even logged out, could list names and emails. | Signed-in users only. |
| Update ID cards | Any official could edit any student's ID-card record. | Only officials who can see one of that student's complaints. A student re-upload must reset the review fields. |
| Create a complaint | A student could create it with any status, e.g. "resolved". | Status must be `submitted`. |
| Add status history | A student could add fake "in progress"/"resolved" entries. | Students can only add `submitted`. |
| Admin seed | Created `admin@dibru.ac.in` with password `Admin@123456`, reset it on every run, and never forced a change. | No password in the file. It only promotes an admin login you created yourself. |

### 3.4 Production build and tooling

| File | Change |
|---|---|
| [vite.config.ts](vite.config.ts) | The build now includes `admin.html` (it was missing from `dist/`). The map-kit files `index.html` loads are copied into `dist/`. The API also runs under `npm run preview`. |
| [index.html](index.html), [admin.html](admin.html) | Script path `public/js/civic-auth.js` → `/js/civic-auth.js` (it 404'd in production). Supabase CDN pinned to `2.118.0` instead of the floating `@2`. |
| [backend/server.ts](backend/server.ts) | Fixed the startup crash: `./api` → `./api.ts`. `npm run server` works again. |
| [tsconfig.json](tsconfig.json), [tsconfig.node.json](tsconfig.node.json) | The backend is now type-checked during `npm run build` (it wasn't before). |
| [package.json](package.json) | New `npm test`. `build` type-checks the backend. Requires Node ≥ 22.6. |
| [backend/access.test.ts](backend/access.test.ts) (new) | Tests for the complaint access rule. |
| [.gitignore](.gitignore) | Ignores `*.tsbuildinfo`. |

### 3.5 Bugs in the pages

| Where | Problem | Fix |
|---|---|---|
| [index.html](index.html) `splitWords()` | `cloneNode(false)` dropped the text in nested tags, so the italic second line of **4 headings** was blank (e.g. the hero showed "Say it. Direct to" without "*Campus Redressal.*"). | `cloneNode(true)`. |
| [index.html](index.html) campus-map popup and official workspace cards | Complaint title, description and location were inserted into the page without escaping (XSS risk). | Wrapped in `escapeHtml()`. |
| [admin.html](admin.html) activity log | Read columns that don't exist (`action_type`, `details`, `target_complaint_id`), so every row showed "undefined" and the filter never matched. | Reads `action` and `target`. Every logged action now has a label. |

### 3.6 Cleanup and docs

- **Deleted** (still recoverable from git history):
  - Next.js leftovers: `next.config.mjs`, `next-env.d.ts`, the root `components/` and `lib/`, `tailwind.config.ts`, `scripts/patch-font-loader.js`.
  - Junk: `powershell.cmd`, `__MACOSX/`, the `scratch_chars/`, `scratch_comp_test/` and `scratch_preview/` folders.
  - Build caches removed from git: `tsconfig.tsbuildinfo`, `tsconfig.node.tsbuildinfo`.
- **Rewritten:** [README.md](README.md) now describes the real app (it described a Next.js app that doesn't exist and a missing `npm run start` command), with setup, database steps and commands.

### 3.7 React migration (step 1)

The site now runs on React **with no change to how it looks or behaves**. This is step 1 of a phased migration; the [README](README.md#react-migration-in-progress) explains how it fits together and what the next steps are.

| What | Before | After |
|---|---|---|
| Markup | ~1,500 lines of HTML inside `index.html` / `admin.html` | 25 React components: [src/site/sections/](src/site/sections/), [src/site/modals/](src/site/modals/), [src/admin/components/](src/admin/components/), [src/admin/modals/](src/admin/modals/) |
| CSS | `<style>` blocks in the HTML | Unchanged, moved to [src/site/site.css](src/site/site.css) and [src/admin/admin.css](src/admin/admin.css) |
| Page logic | Inline `<script>` (5,600 lines) | Unchanged, in `src/site/legacy.js` and `src/admin/legacy.js` (the latter since replaced, see 3.11), started by `main.tsx` right after React renders |
| Inline `onclick="..."` handlers (124) | HTML attributes | React handlers calling the same functions via [src/legacy.ts](src/legacy.ts) |
| Character images | Relative paths that Vite rewrote | `import`ed in [Hero.tsx](src/site/sections/Hero.tsx) and friends (same files and hashes in the build) |
| `index.html` / `admin.html` | Whole pages | Thin shells: head, third-party scripts, React entry |
| Old `src/` (React app with an older design), `utils/supabase/` | Unused | Deleted (in git history) |
| npm packages | 21 | 10. Removed 11 unused: gsap, leaflet, lucide-react, 5 font packages, `@supabase/ssr`, Tailwind. GSAP still loads its original version (3.12.5) from the CDN. |

The markup was converted with an HTML parser rather than by hand, so nothing was retyped.

**One small fix, line 457 of `src/site/legacy.js`:** GSAP froze the nav's centring as a pixel value measured before the web font loaded, so the nav could end up slightly off-centre (0.13px on phones originally, more on slow connections). It now stays centred as a percentage.

**How it was verified (all on 2026-11-02):**

- **Structure:** all 916 elements of both pages compared with the original markup: identical tags, attributes, text and form defaults. A deliberately broken copy was used to prove the check catches differences.
- **Handlers:** all 124 inline handlers are present as React handlers (6 dead image fallbacks removed on purpose; their fallback paths never existed in production).
- **Looks:** every element's position, size, font, colour, opacity and transform compared with the original at 1440px and 390px, in development and in the production build: identical to within 0.05px. The only exceptions are the randomly placed decorations, the continuously floating characters, and the nav-centring fix above. Full-page screenshots were also compared.
- **Behaviour:** 16 scripted interactions (modals, tabs, tracker, categories, report form, map zoom, CTA, admin login tabs, wrong-password login) gave the same results on the original and on React, in development and production, with the same console output.
- **Live backend:** with temporary test accounts labelled "ZZ Migration Test", the following worked through the React pages: student sign-in, loading departments from the database, filing a complaint, seeing it in the tracker, an official signing in, seeing it in their queue, and changing its status (history recorded `submitted → in_progress`). All test accounts and rows were deleted afterwards, and the deletion was verified.
- Type-check, `npm test` and `npm run build` pass.

### 3.8 React migration (step 2): student sign-in state

Who is signed in is now **React state** instead of the page script editing the page.

| Part | Before | After |
|---|---|---|
| Session | `syncStudentAuthUI()` in `legacy.js` rewrote 6 elements with `innerHTML`, `textContent` and `.onclick =` | It reports the session to a small store, [src/site/studentSession.ts](src/site/studentSession.ts), and React renders from it |
| Nav button, footer link, tracker status line and sign-in/out button, report form notice and button | Static markup changed by the script | Components in [src/site/components/StudentAuthWidgets.tsx](src/site/components/StudentAuthWidgets.tsx) |
| Report form show/hide (`reportAuthGate`, `reportForm`, `successCard`) | Script | Still the script, because other parts of it toggle these too. They move with the report section. |

**Bugs fixed along the way:**

- **Double click handlers (introduced by step 1, never committed or shipped).** The script replaced handlers with `element.onclick = ...`. In the old HTML that *replaced* the inline `onclick`, but React's handler is a separate listener, so after step 1 both ran. Clicking the footer link while signed in would sign out *and* open the sign-in dialog, and the nav button ran its handler twice. These elements are React-only now, so each click runs exactly one handler (measured).
- **"Re-upload" ID button (bug in the original page).** It sat inside the report `<form>` with no `type`, so it was a submit button. Clicking it pulled focus into the empty title field while the browser validated the form, and with a filled-in form it would have submitted the complaint. It is now `type="button"` and only opens the re-upload dialog.

**Verified on 2026-11-02** with a labelled live test student (deleted afterwards): signed out, signed in with "ID Not Valid", nav click, Re-upload click, and footer sign-out all show the same text and do the same thing as the original page. Element positions are identical, and the 16-step behaviour test still passes.

### 3.9 React migration (step 3): complaint form

The complaint form, its sign-in gate and the success card are now **React with real state**. `legacy.js` lost 451 lines (17 functions and their variables) and no longer writes to any form element.

| Part | Before (`legacy.js`) | After |
|---|---|---|
| Field values, validation, errors, submit, success card, "File Another" | `submitReport`, `resetForm`, reading/writing DOM elements | Store [src/site/reportForm.ts](src/site/reportForm.ts) + components [src/site/components/ReportForm.tsx](src/site/components/ReportForm.tsx) (controlled inputs) |
| Department list and auto-routing by category | `loadDepartmentUnits`, `renderDepartmentUnitOptions`, `handleCategorySelect`, `handleVisibilityChange` | `loadDepartmentUnits`, `setCategory`, `setVisibility` in the store |
| Evidence files and camera photo | `selectedEvidenceFiles`, `renderEvidencePreview` (`innerHTML`) | `files` in the store, rendered as a list |
| Language and landmark detection while typing | `updateAI` | The store calls the unchanged detector `analyzeComplaint` (now exported from `legacy.js`). A detected landmark selects that location and moves the map pin via the new `focusMapOnLandmark`. |
| Category example cards | `testAIComplaint` | `fillReportDescription` |
| Map tap → location field | `syncPlaceToForm` wrote the fields | Calls `window.setReportPlace(name)`, same matching rule |
| Show form / gate / success depending on sign-in | `syncStudentAuthUI` toggled `display` | Derived from the session store (step 2). `syncStudentAuthUI` is now a single line. |

Still in `legacy.js`: the campus map (it only *reads* the selected location) and the GSAP reveal animations on the form and gate. These elements always stay mounted, so the animations keep working.

**Bug fixed (original page):** choosing **"Other (specify below)"** in the Location dropdown never showed the "Specify Exact Location" field; only a map tap could reveal it. Once shown, the field also stayed visible after the location changed back, even after "File Another". It now shows exactly while "Other" is selected.

**Removed dead code:** `updateAI` wrote to 12 elements of an AI preview card that was deleted earlier (only the language label still exists), and `handlePhotoUpload`/the "sample photo" path had no remaining callers.

**Verified on 2026-11-02**, original page and React page side by side, with a labelled live test student (all data deleted afterwards). The 16 steps were: signed out, sign in, description naming a landmark, Assamese description, category auto-routing, visibility toggle (both ways), add and remove evidence, both validation errors, a real tap on the campus map canvas, a category example card, a **real submission** (success card, ticket number, summary), "File Another", and footer sign-out.

- All visible text, field values, focus and errors are identical. The only difference is the "Other" location fix above.
- The "Open Camera" button opens the same camera input, and a picked photo appears in the list on both pages.
- Layout is identical at both widths, in development and production. The behaviour test is 16/16 and the sign-in widget test is identical (it needed a longer wait: Supabase sign-out sometimes takes more than 10 seconds).

### 3.10 React migration (step 4): complaint tracker

The tracker modal ("My Complaints" and "Track by Complaint ID") is now **React with real state**. `legacy.js` lost another 406 lines (16 functions and their variables) and no longer touches any tracker element.

| Part | Before (`legacy.js`) | After |
|---|---|---|
| Open/close, tabs, `?track=<id>` on page load | `openTracker`, `closeTracker`, `switchTrackerMode`, a `DOMContentLoaded` handler | Store [src/site/tracker.ts](src/site/tracker.ts) |
| "My Complaints" list, filters, details drawer | `loadStudentComplaints`, `renderStudentComplaintsList` (`innerHTML`), `filterStudentComplaints`, `toggleComplaintDetail` | Store + [src/site/modals/TrackerModal.tsx](src/site/modals/TrackerModal.tsx) (`ComplaintCard`, `TimelineStages`, …) |
| Search result: banner, stages bar, details, evidence, history | `searchComplaint`, `renderTrackerFromDatabase` (`innerHTML`/`outerHTML`) | `searchComplaint` + `TrackerResult` |
| Demo complaint chips, evidence links | `buildDemoIds`, `viewEvidenceFile` | Store |

`openTracker`, `openTrackerWithId`, `closeTracker`, `switchTrackerMode` and `loadStudentComplaints` are still put on `window` (in `main.tsx`), because `legacy.js` and its generated HTML (map popup, hidden officials workspace) call them by name. React components import them directly.

**Bugs fixed:**

- **Searching by the short complaint ID never worked (live site).** The ID shown on the success card (`CS-E703D748`) was looked up with `ilike` on the `id` column, which is a UUID. Postgres rejects that (`operator does not exist: uuid ~~* unknown`), so "View in Student Dashboard" after submitting, and any search by short ID, found nothing. The lookup in [public/js/civic-auth.js](public/js/civic-auth.js) now matches the 8-character prefix as a UUID range. Verified against the live database.
- **A second search showed the first complaint's stages (original page).** The script replaced the stages bar with `outerHTML` on the first search, so later searches couldn't find it to update. The stages now always match the complaint shown, including the "rejected" note.
- **Demo complaint chips did nothing (original page).** CS-8921 and the others are local sample data, not in the database. Their fallback called `renderTracker()`, which was deleted in commit `4545aaf`, so each click only logged an error. They now show the standard "No complaint record found" message. Decide whether to remove the chips or add matching demo complaints to the database (section 2).

**Verified on 2026-11-02**, original page and React page side by side, with a labelled live test student who had two seeded complaints (one resolved with history and evidence, one rejected; all deleted afterwards). The 13 steps were: open via nav button, text filter, status filter, clear filters, expand and collapse a card, Track-by-ID tab, search by full ID, a second search, search by short ID, empty search, "View Protected File", and close.

- Visible text **and the position of every visible element** in the tracker are identical, except the second-search stages fix above.
- The demo chip and call-to-action search differ only by the "not found" message instead of silently failing.
- The earlier suites still pass: layout (development and production), behaviour, sign-in widgets, and the report form (12/16, with only the "Other" location fix differing).

### 3.11 React migration (step 5): official console

`admin.html` is now **fully React**. Its 1,834-line page script (`src/admin/legacy.js`) is deleted.

| Part | After |
|---|---|
| State and actions (sign-in, queue, filters, docket, ID review, workflow, reassignment, official accounts, audit log, CSV export) | [src/admin/console.ts](src/admin/console.ts) |
| Banner, KPI cards, unit breakdown, ticket cards, officials table, audit table | [src/admin/components/Queue.tsx](src/admin/components/Queue.tsx), used by `AdminMain.tsx` |
| Gate, header, all 8 dialogs | Existing components, now rendering from the store. Form dialogs keep their fields in local state and start fresh each time they open. |
| Toasts | [src/toast.ts](src/toast.ts) (`civic-auth.js` still uses `window.showToast` for its password-change dialog) |

Removed as dead code: about 260 lines of unused sample data (`OFFICIALS`, `SEED`), a `window.alert` override (nothing calls `alert`), and the `#authModal` dialog (its functions never existed and nothing opened it).

**Bugs fixed:**

- **"Provision New Official Profile" always failed (live site).** The page sent the password as `password`, but the API expects `temporaryPassword`, so every attempt ended with "Missing required fields: name, email, role, temporaryPassword". Fixed in `createOfficialAccount` in [public/js/civic-auth.js](public/js/civic-auth.js), so it works on both the old and the new page. Verified live.
- **After logging out, you couldn't log back in without reloading.** The sign-in button stayed disabled on "Verifying credentials...".
- **After one workflow action (accept, reject, progress, resolve), every later Confirm button stayed disabled** until the page was reloaded.
- **The docket didn't update after an action.** For example, after accepting it still showed SUBMITTED, because it checked a value that had just been cleared. It now always shows the current state.
- **The category filter never matched anything.** Its options were "Hostel", "Water" and so on, but complaints are stored as "Hostel Facilities", "Water & Plumbing" and so on. The labels are unchanged; the values now match the categories students choose. **Library** has no matching student category, so it still matches nothing: remove it or add the category (section 2).
- **Logging out and back in as a different official** could leave the previous official's Officials or Audit section open. Each sign-in now starts on the complaints section with fresh data.
- Temporary passwords are now generated with `crypto.getRandomValues` instead of `Math.random`.

**One simplification:** "Copy Credentials" now uses only the clipboard API. On plain-http pages, where the browser blocks it, it shows "Please manually copy the temporary password." instead of trying the deprecated `execCommand('copy')`.

**Verified on 2026-11-02** with labelled live test accounts, re-created for each run and deleted afterwards (each run's cleanup confirmed 0 leftover complaints, profiles and audit rows). The test ran 40 steps on the original page and the React page:

- the sign-in gate: all three tabs and a wrong password
- as a department head: filters, docket, ID card view and verification, accept via the docket, reject with too-short and valid reasons, logout
- as an administrator: officials section; create, edit, reset the password of, deactivate and delete an official; the audit log and its filter; reassign to another unit; log progress; logout

It acted only on its own test records. Visible text, open dialogs, toasts, errors and element structure were compared at each step.

- **Every difference is one of the fixes above.** The stuck sign-in button, the stale docket and the category filter show up as differences. The audit log also records which page you signed in from (`/__baseline_admin.html` vs `/admin.html`).
- Everything else is identical. That includes all live account-management steps, once the provisioning fix above was in place.
- Sign-in page layout is identical at 1440px and 390px, in development and production. The only elements that differ are the deleted `#authModal`, React's `#root`, and a loading spinner in the two hidden table placeholders.
- The student site's suites are unchanged. Type-check, `npm test` and the build pass.

### 3.12 React migration (step 6, final): the rest of the student site

**The migration is complete.** `src/site/legacy.js` (the last 2,877 lines of the original page script) and the bridge `src/legacy.ts` are deleted. No page logic runs as a classic script any more, and React components no longer call functions through `window`.

| Part | Before (`legacy.js`) | After |
|---|---|---|
| Student sign-in, registration with ID card, ID re-upload | DOM-manipulating functions | React state in [src/site/studentSession.ts](src/site/studentSession.ts); `StudentAuthModal.tsx` and `ReuploadIdModal.tsx` render from it. Typed values are kept between openings, as before. |
| Campus map (canvas, pan/zoom/pinch, pins, GPS) | Script | ES module [src/site/campusMap.js](src/site/campusMap.js), code unchanged. Components import `campusMapZoom` and friends. Its popup button gets a real click listener instead of an `onclick` string. |
| Scroll animations, decorations, intro, 3D characters | Script + GSAP/Lenis from CDN `<script>` tags | ES module [src/site/animations.js](src/site/animations.js), code unchanged. **GSAP 3.12.5 and Lenis 1.1.13 now come from npm**, pinned to exactly the versions the CDN tags loaded. |
| Language/landmark detector | Script | [src/site/analyzer.js](src/site/analyzer.js), code unchanged |
| Sample complaints (CS-8921 …, tracker chips and map markers) and campus landmarks | Script | [src/site/demoData.js](src/site/demoData.js) |
| Toasts | Own copy (identical to the admin one) | Shared [src/toast.ts](src/toast.ts) |
| `CivicAuth` types | `src/legacy.ts` | [src/civicAuth.ts](src/civicAuth.ts) |

The canvas map and the GSAP animations were moved as plain-JS modules rather than rewritten as React state. They draw on a canvas or animate the page directly, which React doesn't help with, and keeping their code unchanged keeps the risk low.

**Removed as dead code:** the officials login dialog and "workspace" demo on the student site (about 800 lines plus `OfficialLoginModal.tsx` and `WorkspaceModal.tsx`). Nothing could open them; they were a pre-database demo that `admin.html` replaced. Also removed: their sample officials data, `SOLVER_MAP`, a `window.alert` override (nothing calls `alert`), and `toggleRawJson`.

**Fixes:**

- **Sign-out could briefly show the old session again** (an open item, also seen on the original page). A session check started earlier, for example by opening the tracker, could finish after the sign-out and re-apply the old profile. Results of a check that started before the latest sign-in/sign-out are now ignored.
- **Hero character cards** had `onClick` calling `selectCat()`, a function that never existed, so each click logged an error. Removed; the cards behave the same.
- **Links with `href="#"`** (footer "Track" and "Student Sign In") threw `'#' is not a valid selector` in the smooth-scroll handler. That handler now skips them; they already handle their own clicks.

**Verified on 2026-11-02**, original page and React page side by side, in development and production:

- **Startup with full motion:** the intro finishes, and both pages produce the same 38 heading words, 14 hero glass squares, 18 petals and 66 grid squares, with the campus map canvas drawn and no console errors.
- **Scrolling** through stats, how-it-works, categories, report, CTA and footer with full motion leaves every scroll-triggered element in the same end state: stats counters at their final values, CTA card and report gate revealed, heading words shown, footer logo animation finished.
- **Layout** is identical at 1440px and 390px. The 51 fewer elements are the two deleted dialogs at the end of the page, and the only moved elements come from the earlier nav-centring fix.
- **Behaviour suite:** the only differences are the active tab inside the deleted dialogs and the tracker's "not found" message (3.10).
- **Live suites** with temporary test accounts (all deleted afterwards):
  - sign-in widgets: 8/8 identical
  - tracker: 12/13 (the second-search stages fix from 3.10)
  - complaint form: 12/16 (only the "Other" location fix from 3.9)

  The suites now sign in the way a user does: they click the nav button and type.
- Type-check, `npm test` and `npm run build` pass, and the build no longer references any GSAP or Lenis CDN URL.

### 3.13 Towards the PRD (part 1): AI analysis, routing to posts, route tracker

First part of moving to `PRD-CivicSense.md` while **keeping everything already built**. The decisions, made 2026-11-02:
- Keep today's statuses and roles and add the PRD's (`needs_review`, `closed`, `merged`).
- Build Gemini with a fallback until a key is added.
- Database changes go into an additive SQL file for the team to run.

| PRD item | What was built |
|---|---|
| AI understanding (P0) | [backend/ai.ts](backend/ai.ts): one Gemini call with a strict JSON schema (language, is_complaint, category of 20, priority 1–4, is_sensitive, location, bilingual summary, image findings, confidence). The campus place list and an Assamese glossary are in the prompt, and the first evidence photo is sent inline. Without `GEMINI_API_KEY`, the site's keyword analyzer runs instead (moved to the server). |
| Safety rules and review queue (P0) | [src/logic.ts](src/logic.ts), shared by the app and the API. **Priority floors:** wires, sparks, fire, smoke, structural cracks, harassment and threats → P1; no water in a hostel, unusable toilets, food illness, unlit and unsafe at night → P2, in English, Assamese and romanised Assamese. **Never invent a place.** **Review queue:** not a complaint, confidence < 0.6, or a failed AI call → `needs_review`. **Sensitive:** harassment/threats, or safety at P1, → Head / Chairperson only. |
| Routing to posts (P0) | Tables `authorities` (posts) and `routing_rules`, seeded from the PRD's routing table. The owning post receives each complaint, with the General Secretary copied (except sensitive ones). Officials linked to a post see and act on complaints routed to it, **in addition to** today's department/visibility rules, which still work. |
| Route tracker (P0) | Table `complaint_routes`. The tracker shows delivered, seen (an official opened the docket), replied (an official recorded a remark) and resolved for each recipient, plus "Waiting on …" or "Route complete". It appears in the student tracker and the admin docket ([src/RouteTracker.tsx](src/RouteTracker.tsx)). |
| Confirmation (PRD `/report`) | After filing, the success card shows "Filed as {category} {priority} · {place}", both summaries, and the posts it was sent to (or that it went to review). |
| Admin review queue (P0, part) | "Needs Review" filter pill (shown when there is something to review). In the docket: an AI panel, the route tracker, and "Route as … / Route complaint" to route it by hand, which marks a corrected category as edited. |
| AI logging | Table `ai_logs`: every attempt with model, prompt version, latency, output or error. |
| Only the server writes AI fields | A database trigger blocks AI and routing fields from being set through the public API. Officials could previously update complaint rows directly. |
| Only the primary authority resolves | Officials who were only copied get "Only the primary authority or an administrator can mark this complaint resolved." |

New API routes: `POST /api/complaints/analyse` (the reporter after filing, or an admin to re-run), `POST /api/complaints/seen`, and `POST /api/admin/route-complaint`.

**Database:** [backend/migrations/001_ai_routing_tracker.sql](backend/migrations/001_ai_routing_tracker.sql).
- **Adds:** 3 statuses, AI columns on `complaints` (including a pgvector `embedding` column for duplicates later), and 4 tables with row-level security.
- **Widens** the existing policies with "or routed to my post".
- **Drops nothing.**

**Bug found while testing (fixed):** a `select(…, { head: true })` query returns no error for a missing table, so the "is the migration installed?" check said yes. The health check had the same pattern. Both now use plain queries.

**Verified on 2026-11-02 (before the migration has been run):**
- `npm test`: 12 tests, including the PRD's routing and safety rules checked against its demo scenarios A1, A2, A3, E2, X1, X2 and X5, and the Gemini request/response and fallback with a fake network.
- **The site behaves exactly as before** while the migration isn't installed. These all give the same results as before this work, with no new console errors:
  - behaviour suite
  - live complaint form: 12/16, only the "Other" location fix
  - live tracker: 12/13
  - live admin console: 26/40, only the earlier fixes
- The new endpoints reject anonymous calls. Type-checks and the production build pass.
- ~~Not yet verified live~~ **Verified live after the migration: see [3.16](#316-migration-001-applied-and-tested-live).**

### 3.14 Towards the PRD (part 2): privacy, replies, confirm/reopen, notifications

Added to the same migration file (it hasn't been run yet, so there's still only one SQL file to run).

| PRD item | What was built |
|---|---|
| "Hide my name from the student union" (P0) | A checkbox on the report form; the server stores it as `complaints.hide_name_from_union`. A new database rule, `can_see_reporter()`, now governs who can read the reporter's profile and ID card. Union posts and the DUSU role see the complaint but not the name; administrators, departments and the Head / Chairperson still do. The console shows "Name hidden (reporter's choice)". |
| Replies and internal notes (P0) | Table `complaint_replies`. In the docket: "Reply to reporter" or "Add internal note". A reply is translated with one Gemini call and stored in English and Assamese. Without a key, it's stored in its own language only. The reporter sees public replies in their reading language, with "Show original"; internal notes are visible only to officials. A reply marks the post's "replied" checkpoint. |
| Reading language (P0, part) | `profiles.preferred_language`, with a "Read in English \| অসমীয়া" switch in the student tracker. |
| Confirm or reopen (P0) | On a resolved complaint, the reporter sees "Is it fixed?". **Yes** closes it (status `closed`). **No** reopens it with a note: back to the primary post, its resolved checkpoint cleared. With no answer **7 days** after resolution, it closes automatically. That check runs on API traffic, at most hourly; there's no cron yet. |
| Notifications, live (P0) | Table `notifications`, published to Supabase Realtime. A bell appears in the student nav and the console header, with an unread count and messages in the reader's language; new ones arrive live and refresh the open view. They're sent when: <ul><li>a complaint is routed: to the reporter and every post holder</li><li>it's sent to review</li><li>its status changes</li><li>an official replies</li><li>the reporter confirms or reopens</li><li>it's auto-closed</li></ul> |

New API routes: `GET /api/features` (what's switched on), `POST /api/complaints/replies`, and `POST /api/complaints/confirm`.

**Security fix in part 1 (caught before anything was run):** posts were linked to officials by `profiles.email`, which users can edit on their own row. An official could have set their profile email to the General Secretary's and received that post's complaints. Both the database (`auth.jwt() ->> 'email'`) and the API (the verified `auth.getUser` email) now use the **login email**.

**Smaller decisions:**
- `complaint_status_history.changed_by` may now be empty, for the automatic close.
- The Assamese notification and UI strings in `src/logic.ts` and the components should be reviewed by a native speaker.
- **Known limit of the name hiding:** a reporter's profile is readable when *any* of their complaints may show their name to that official. So if a reporter hides their name on one complaint but not on another sent to the same union post, the hidden one can be linked to them. Fixing that fully needs the PRD's server-side "view" for union posts.

**Verified on 2026-11-02 (the migration still hasn't been run):**
- 13 tests pass. The new ones cover reply translation with a fake network (PRD X4) and the no-key fallback.
- All the new UI stays hidden while `/api/features` reports `routing: false`. The suites give the same results as before, with no console errors:
  - behaviour
  - live complaint form: 12/16
  - live tracker: 12/13
  - live admin console: 26/40
- The new endpoints reject anonymous calls. Type-checks and the production build pass.
- Live behaviour of everything in 3.13 and 3.14: **verified in [3.16](#316-migration-001-applied-and-tested-live).**

### 3.15 Towards the PRD (part 3): routes, missing screens, duplicates, routing editor, statistics

For the frontend teammate: every PRD screen now exists and is wired to the backend, but the **new screens are unstyled on purpose**. See [docs/FRONTEND.md](docs/FRONTEND.md).

- **React Router 6.28 with the PRD's URLs.**
  - Student app: `/`, `/report`, `/login` (`?mode=signup`, `?next=`), `/my`, `/complaints/:id`.
  - Officials' app: `/authority`, `/admin`, `/admin/review`, `/admin/duplicates`, `/admin/stats`, `/admin/routing`, `/map`.
  - The two apps keep separate stylesheets (their class names clash). The dev and preview servers route each URL to the right app; **production hosting needs the same rewrites**.
  - The landing page stays mounted (hidden) on other routes, because the animation and map code set it up once at startup.
  - Officials land on their role's home after sign-in; admin-only pages redirect officers; `/admin.html` and `?complaint=<id>` still work.
- **Asset paths are now absolute** (map-kit scripts, map data, links to the student site), so deep URLs like `/complaints/…` load correctly.
- **English/Assamese UI toggle** (`src/i18n.ts`): a typed dictionary for the new screens, remembered in the browser and saved to the user's profile. One setting with the reading language.
- **Duplicate detection (PRD P0):**
  - With Gemini, an embedding of the summary and the text is compared with pgvector, flagging matches at similarity ≥ 0.80 within the same category and campus area.
  - Without Gemini, word overlap ≥ 0.5 is used instead, which can't match Assamese with English.
  - Merging is never automatic: the admin merges or dismisses on `/admin/duplicates`. Reporters of a merged complaint receive the surviving complaint's status changes and replies.
  - Added to the migration: `possible_duplicate_of`, `duplicate_score`, `duplicate_dismissed`, `match_duplicates()`, and a trigger protecting those fields.
- **Routing editor (PRD P1):** `GET`/`PUT /api/admin/routing`, with validation.
- **Statistics:** `/api/admin/stats` adds counts by category, place and priority, the average resolution time, and the review and duplicate counts. The existing fields are unchanged.
- **SQL fix:** `match_duplicates()` compares statuses as text. A newly added enum value can't be used in the same transaction that adds it.

**Verified on 2026-11-02 (the migration still hasn't been run):**
- All routes open in development and production with the right app and no console errors.
- Signed in with temporary accounts (deleted afterwards):
  - `/login?next=/my` lands the student on `/my` with their complaint, and the complaint page shows its history
  - the language toggle switches to Assamese and back, and `/` shows the landing page again
  - the admin lands on `/admin` and the department head on `/authority`; admin-only pages redirect the department head
  - the statistics page shows totals
- The styled pages behave as before:
  - layout identical
  - behaviour: the only new difference is that, before sign-in, the console isn't built behind the gate (it's invisible either way)
  - live form 12/16, tracker 12/13, sign-in widgets 8/8 (React now without the old `href="#"` error)
  - admin console 22/40: the 4 new differences are the sign-in gate's hidden structure, with visible text identical
- 15 tests pass. Type-checks and the build pass.

**Next PRD steps:**
- tune the duplicate thresholds on scenarios A1, A3 and E3 once Gemini and the migration are live
- P1: the escalation job (Vercel Cron in the PRD) and drawing the map with Leaflet (frontend)
- production deployment config: page rewrites for the two apps

### 3.16 Migration 001 applied and tested live

**Applied 2026-11-02** to the live project (Civic sense, `mdywamyrxuuookaxksyv`), from the SQL Editor, in order:
1. `backend/schema.sql` (action item 4). The live database had an older version (see 3.3).
2. `backend/migrations/001_ai_routing_tracker.sql` (action item 10).

**Checked in the database afterwards:**
- 9 statuses: the 6 existing ones plus `needs_review`, `closed`, `merged`.
- `vector` 0.8.2 is installed.
- The 6 new tables exist, each with row-level security.
- All 22 new `complaints` columns exist, plus `profiles.preferred_language`; `changed_by` is now nullable.
- Both protection triggers are on `complaints`.
- 26 policies in total: 9 existing ones widened with `is_routed_to_me` / `can_see_reporter`, and 7 new ones.
- Seed data: 12 posts and 20 rules, none of them missing a copy or escalation post.
- `notifications` is in the `supabase_realtime` publication.
- `match_duplicates()` can't be called by `anon` or `authenticated`.
- `GET /api/features` returns `{ routing: true, gemini: false }`.

**Live end-to-end test.** It used 7 temporary `zz-migration-test-*@example.com` accounts: 2 students, an admin, and holders of the Head, General Secretary and Sports Secretary posts (linked by email for the test only), plus an unrelated department. There were 6 complaints titled "ZZ TEST …". No real user or complaint was touched.
- **API and database: 54 of 54 checks pass.**
- **Browser (headless Edge): 22 checks.** The first run found the bell bug below. After the fix, 21 passed. The other one read `/my` before its second request (route details) had returned; re-checked with a proper wait, 3 of 3 pass.

| Area | Result |
|---|---|
| Filing + analysis (keyword rules, no Gemini key) | "football ground…" → `sports` P3, conf 0.95. "cricket nets…" → `cricket`. "harassing and threatening…" → `safety` P1, sensitive. "hello there" → conf 0.45 → `needs_review` with "Low AI confidence (0.45)". Fields the client tried to forge on insert were ignored. A second analyse call returns the stored result. Every call is logged in `ai_logs`. |
| Routing | Owning post primary + General Secretary copied. Sensitive → Head / Chairperson **only**. Low confidence → review queue with no routes. On `/admin/review`, the admin routed it as `general` → General Secretary primary + Vice-President copy, status `submitted`, `human_edited`. |
| Route tracker | `delivered_at` is set on routing. Opening the complaint → seen. A public reply → replied. An internal note → seen but not replied. A post that was only copied can't resolve it (403). The primary post resolves → `resolved_at` is set on the route and the complaint. `/complaints/:id` shows "Waiting on: Reporter confirmation". |
| Replies and notes | The reporter reads public replies only (database rules and page). Officials read both. |
| Notifications | Sent to the reporter and every post holder on routing, review, reply, status change, reopen and merge. **Realtime:** a post holder received one live, and the student's open page got a new one without reloading (bell count +1). |
| Hide-name | Union posts (Sports, General Secretary) can read the complaint but **not** the reporter's profile, and the ID-card API returns 403. The Head (non-union) can read the reporter. Control: a reporter who didn't hide their name stays visible to the General Secretary. |
| Database rules | Posts read only what is routed to them. An unrelated department sees none of it. An official's direct update of AI, duplicate or privacy fields is reverted by the trigger. Students can't read `ai_logs` or other users' notifications. |
| Confirm/reopen | Confirming an unresolved complaint → 400; someone else's complaint → 404. Reopen with a note → `submitted`, both `resolved_at` cleared, the primary post notified. Confirm in the browser → `closed` with `closed_at`. |
| Duplicates | Word overlap flagged both pairs (0.86 and 0.88). On `/admin/duplicates`, **Merge** → `merged` + `duplicate_of`, and the merged reporter then received replies on the surviving complaint. **Not a duplicate** → dismissed. The list is empty afterwards. |
| Routing editor | 12 posts / 20 rules / 20 categories. Invalid hours → 400. Music 120 → 96 h was saved, then restored. Non-admins get 403. |
| Statistics | API and page: 6 complaints, review 1, duplicates 2, by category, by priority, average resolution time. Non-admins get 403. |
| New routes | `/login?next=/my`, `/my` (AI category, "Waiting on", merged state, "Is it fixed?"), `/complaints/:id` and `/complaints/CS-XXXXXXXX`, `/admin/review`, `/admin/duplicates`, `/admin/stats`, `/admin/routing`, `/map`. The DUSU post holder lands on `/authority` with only their routed complaint, and admin pages redirect them. No console errors on any page. |

**Bug found and fixed:** with routing switched on, the notification bell crashed the student pages: `/my` and `/complaints/:id` were blank. `subscribeNotifications` in [public/js/civic-auth.js](public/js/civic-auth.js) reused the channel name `notifications-<userId>`. `sb.channel()` returns a channel that is still registered under that name (`removeChannel` is async), and adding callbacks to an already-subscribed channel throws. That happens on every remount, including React StrictMode in dev. Each subscription now gets its own topic. Verified afterwards: no console errors.

**Cleanup:**
- The test accounts were deleted, with their complaints, routes, replies, notifications, logs and history removed with them.
- The 3 posts are unlinked again, and the music rule is back at 120 h.
- Verified: **0 rows left** in every table. The database is back to its 3 real officials and 0 complaints, plus the seed data.

**Supabase security advisor after the migration** (warnings only, nothing critical; see section 5):
- `vector` is in `public`. Expected: `match_duplicates()` pins `search_path = public`.
- The two protection trigger functions have no fixed `search_path`.
- The helper functions (`can_read_complaint`, `is_routed_to_me`, `can_see_reporter`, …) are callable through `/rest/v1/rpc`. They only answer yes/no about the caller.
- Leaked-password protection is off.

### 3.17 Clean-up from "Still open"

- **Admin category filter:** removed the **Library** option. No student category matches it ([src/admin/components/AdminMain.tsx](src/admin/components/AdminMain.tsx)).
- **Trigger functions** `protect_complaint_ai_fields` / `protect_complaint_duplicate_fields` now have `set search_path = public` in [the migration file](backend/migrations/001_ai_routing_tracker.sql). The live database still needs these two lines, run in the SQL Editor (safe, they change nothing else):
  ```sql
  alter function public.protect_complaint_ai_fields() set search_path = public;
  alter function public.protect_complaint_duplicate_fields() set search_path = public;
  ```
- **Campus map data loads on demand:**
  - Before: every student page loaded the 2.2 MB `map-data.js` through a `<script>` tag.
  - Now: [src/site/campusMap.js](src/site/campusMap.js) fetches `map-data.json` once the map comes within 600 px of the viewport.
  - The tag is gone from `index.html`, and the build no longer copies `map-data.js` (the file stays in the map kit).
  - Verified in headless Edge: there's no map-data request on page load; scrolling to the map fetches it and draws the map, with no console errors.
- **`backend/test_rls.sql` replaced by [backend/live-test.mjs](backend/live-test.mjs)** (`npm run test:live -- <dev server url>`).
  - It covers the 6 old visibility tests, updated to the current rule: departments don't see DUSU complaints.
  - It adds checks of the fixes from 3.3 (fake statuses, officials listed to logged-out visitors) and the PRD flow from 3.16: routing, tracker, replies, hide-name, confirm/reopen, review, merge, routing editor, statistics, realtime.
  - It always deletes its test data and fails if any row is left.
  - It links 3 posts to its test accounts for the run, so it **refuses to run** once those posts (Head, General Secretary, Sports Secretary) are linked to real officials. Otherwise they would be notified about test complaints.
  - Run on 2026-11-02: **43 of 43 checks pass, 0 rows left.** Type-check, build and `npm test` (15 tests) pass.

### 3.26 Group signals page brought up to the console standard (2026-11-04)

`/admin/signals` (3.24) was already built, routed and in the console sidebar. It had never rendered a real signal because the live database has none yet. Checked with sample signals injected in the browser only (no database writes), then fixed:

- **Status** in words, in both languages, instead of codes (`pending` → "Waiting for more students", `converted` → "Made a complaint", …), as coloured chips.
- **Dates:** "4 Nov, 03:30 pm" in the reader's language, instead of "4/11/2026, 3:28:22 pm".
- **"1 student"**, not "1 students".
- **No middle-dot strings** (hallmark): source and facts are spaced fields. Priority uses the same chip as the queue.
- **One primary action:** "Make official complaint" is filled; "Dismiss" is quiet.
- **Phones:** cards no longer run past the screen edge (a grid-item minimum-width issue, fixed for all console list pages); the note field stacks under its label.
- **Verified** desktop, phone and Assamese in headless Edge; no console errors; build and `npm test` (47) pass.
- **Noticed, not changed:**
  - The page intro still says "the CivicSense bot", though the app is now "Xohari".
  - On phones, the console's new top bar (sidebar layout) cuts off the "Log out" button at the right edge.

### 3.25 Ready for Vercel and a Namecheap domain (2026-11-04)

Step-by-step guide: [docs/DEPLOY.md](docs/DEPLOY.md): the Vercel project, environment variables, Namecheap DNS records, Supabase URL settings, and what doesn't run on Vercel.

- **`npm run vercel-build`** (Vercel runs it automatically) builds the site as before, then `scripts/vercel-output.mjs` writes Vercel's Build Output API format to `.vercel/output/`:
  - the static site;
  - **the API as a single bundled Node 22 function** (`backend/vercel.ts` wraps the existing `handleApiRequest()`; rolldown, already installed, bundles it with its dependencies). Bundling sidesteps Vercel compiling the backend's `.ts` imports;
  - **the routes:** `/api/*` → the function; `/admin`, `/admin/*`, `/authority`, `/map` → `admin.html`; other page URLs → `index.html`; long-term caching for `/assets/*`;
  - a **daily cron** for `/api/cron/escalations` (the Hobby-plan limit; it uses `CRON_SECRET`).
- `.vercel` added to `.gitignore`.
- **Fixed on the way:**
  - `index.html` and `admin.html` still loaded three scripts from the deleted `Dibrugarh-University-Map-Kit/` folder (404s on every page). Nothing live used them, so the tags were removed.
  - The "Track this report" button after filing, and old `/report?track=…` links, went to `/login`, which no longer has the tracker. Both now go to `/report/new?track=…`.
- **Verified locally**, with a small server that applies `config.json` the way Vercel does and runs the bundled function:
  - API: health and features (live database, Gemini on), query strings kept, 401/404 responses, cron refused without its secret.
  - Pages: every page URL maps to the right HTML; `/assets` gets the cache header; unknown files return 404.
  - In headless Edge: the student signs in, opens the report form, and sees their complaints in the tracker. The admin signs in, and `/admin`, `/admin/stats` (charts) and `/admin/routing` load data through the function. No console errors.
  - The build and `npm test` (47) pass.
- **Not done here:** creating the Vercel project, environment variables and DNS records. Those happen in your Vercel and Namecheap accounts (steps in the guide).
- **On Vercel:** the Telegram/Discord bots (3.24) don't run, because they need an always-on process; escalation runs daily, plus the "Run deadline check" button.

### 3.24 Agent tag: issues raised in Telegram and Discord groups (2026-11-04)

Students tag the CivicSense bot in a campus group (`@CivicSenseBot no water in Hostel 3 since morning`). The bot analyses the message with the same AI and rules as a complaint and routes it to the right post as a **signal**, before anyone files a complaint. Officials see signals on a new console page, **Group signals** (`/admin/signals`). They can acknowledge one (the bot answers in the group), turn it into an official complaint, or dismiss it.

- **How students tag:**
  - **Telegram:** `/report <issue>`, `@bot <issue>`, or either one as a reply to the message that describes the issue. Others reply `+1` to the bot's answer.
  - **Discord:** `@bot <issue>`, or a reply with `+1`.
- **Guardrails, in order:**
  1. The bot only reads messages meant for it; everything else is ignored and never stored. Discord needs no Message Content intent.
  2. **Linked students only.** An unlinked tagger gets a private, signed link (30 minutes, only for their chat account). They open it while signed in on CivicSense.
  3. At most 10 attempts per chat account per day, and 3 accepted issues per student per day.
  4. The issue must be at least 8 characters. The AI check and `applyRules` run next; something that is not a complaint is not stored.
  5. If the issue is already an open complaint, the bot points to the ticket instead. If another group already raised it, the tag counts as a +1.
  6. **Sensitive** issues go to the Head only. Nothing is posted in the group, and the bot answers the student privately.
  7. A normal issue reaches its post once **2 different students** raise it. Urgent ones (P1–P2) reach it at once, and the admin sees everything.
- **Turning a signal into a complaint:** the complaint is created for the first student who raised it, analysed and routed as usual. The other supporters are notified.
- **Files:**
  - New: `backend/chat.ts` (pure parts and send calls), `backend/chatbots.ts` (Telegram long polling, Discord Gateway), `backend/migrations/002_chat_signals.sql`, `src/admin/pages/SignalsPage.tsx`, `backend/chat.test.ts`.
  - Changed: `handleTag()` plus `/api/chat/link`, `/api/signals` and `/api/signals/act` in `backend/api.ts`; the `?link=` handler in `src/site/SiteApp.tsx` (renders nothing; toasts only); console nav and route; i18n; 3 notification messages in `src/logic.ts`.
- **Setup:** see README → "Agent tag".
- **Verified:**
  - `npm test`: 47 pass, 18 of them new. They cover the whole tag pipeline against the mock database: link, wait for a second student, cross-group +1, open-complaint match, sensitive routing, limits, convert.
  - Both type checks pass.
  - The dev server loads with the bots off, and `/api/features` reports `signals: false` until migration 002 runs.
- **Not yet verified:** a real Telegram or Discord bot. No bot tokens exist yet, and migration 002 is not applied to the live database.

### 3.23 Console redesign with hallmark (2026-11-03)

The signed-in console (`/admin`, `/admin/review`, `/admin/duplicates`, `/admin/stats`, `/admin/routing`, the complaint detail and the other modals) was redesigned with the project's hallmark skill. It uses the existing design system shared with the student site. Details are in `docs/FRONTEND.md` → "Console styling".

| Before | After |
|---|---|
| The "Welcome …" pop-up covered the header; on phones the header wrapped into 3 rows | Pop-ups appear at the bottom; the header is one row on phones (logo, bell, back, log out) |
| "← Student Portal" in off-palette electric blue (glued arrow) | "Student site" with an arrow icon, olive outline |
| About 100 px of empty space; two stacked nav bars; the nav was narrower than the content | One tab strip, aligned with the content |
| White page, black body-font titles | Warm skin `--bg` page, white cards, Cormorant Garamond titles (now loaded in `admin.html`) |
| Eyebrow pill over the queue heading; **"Campus SLA: 48h (Hazard: 4h)"**: hard-coded, not real data (routing rules say 120 h) | Both removed |
| 6–7 pills per complaint ("Other" next to "AI: Internet", "Administration Vault", …), middle-dot meta line, 32 px buttons | Status, one category (the AI's once analysed), priority, ID status; spaced meta fields; 40 px buttons (44 px on phones) |
| Uppercase tracked labels in the complaint detail and modals, "SUBMITTED" | Sentence case everywhere (22 labels) |
| Stats: plain list, thin bars | Summary tiles and real bars; the maintenance button is now "Run deadline check" |
| Routing editor overflowed sideways on desktop | Both tables fit; the "copied" lists are compact |
| Chips in Tailwind slate / fuchsia / sky colours | Chips in the system palette |

- **Files:**
  - New: `src/admin/console-redesign.css`, loaded last.
  - Markup touched only where hallmark required it, in `AdminHeader.tsx`, `AdminMain.tsx`, `Queue.tsx`, `StatsPage.tsx` and `ComplaintDetailModal.tsx`; uppercase labels in the other modals; `RouteTracker.tsx`, whose labels are also sentence case on the student tracker now.
  - All IDs, handlers, `data-*` and `aria-*` attributes kept.
- **Not followed on purpose:** hallmark's "no Assamese text" (the PRD requires both languages) and "white or green text only" (body text stays dark `--ink` for contrast).
- **Verified** in headless Edge as the temp admin, desktop (1440 px) and phone (390 px):
  - Every console page and the complaint detail; no sideways scroll; no console errors.
  - The 20 functional console checks from 3.22 still pass (admin and officer).
  - Build and `npm test` (29) pass.
  - `npm run audit:slop` finds nothing in the console. Its one failure is in the startup-loader animation (`src/components/ui/liquid-glass-logo-reveal.tsx`), outside this change.

### 3.22 One console route, no `/my`, nav "Report" scrolls (2026-11-03)

- **`/my` removed** (`MyComplaintsPage.tsx` deleted). "My complaints" is the tracker below the sign-in on `/login` and `/report/new`. Old `/my` links (including `?next=/my`) go to `/login?view=mine#report-tracker`.
- **Nav "Report" scrolls** to the "Have an issue on campus?" section (`#student-signin`) instead of opening `/login`. On the landing page that's a smooth scroll; from other pages it's `/#student-signin`.
  - New: after the landing intro finishes, the page scrolls to the `#section` in the URL. Before, the browser's own jump happened while the intro was still laying out the page, so links like `/#stats` from other pages landed about 350 px off. This fixes Stats, Workflow and Categories too.
- **`/admin` and `/authority` merged into `/admin`.** It's the queue for everyone in the console: officers see what is routed to their post, admins see all.
  - The `/admin/*` pages stay admin-only (officers are sent to `/admin`).
  - The old `/authority`, `/map` and `/admin.html` redirect to `/admin`, keeping `?complaint=<id>`.
  - The console nav has one "Queue" link.
  - The new-official credentials text now gives `/admin` as the portal URL.
- **Not changed, worth knowing:** the student site no longer shows the English/Assamese toggle on any page. It was only on `/my` and the old `/login`. `ComplaintPage.tsx` and `PageShell.tsx` are now used only for `ConfirmOrReopen`.
- `docs/FRONTEND.md` route tables updated.
- **Verified** in headless Edge:
  - The landing "Report" scrolls to the section (top at 0 px).
  - From `/login`, all four section links (`/#stats`, `/#how`, `/#categories`, `/#student-signin`) land at their section (0 px).
  - `/my` redirects, and signed in (student account) the tracker lists the student's complaints.
  - `/admin`, `/authority` and `/authority?complaint=…` show the console sign-in when signed out.
  - No console errors. The build and `npm test` (29) pass.
  - **Console signed in, 20 of 20,** with two temporary accounts created for this on the live database: `zz-temp-admin@example.com` (administration) and `zz-temp-officer@example.com` (department, no post linked). Passwords were shared privately, not in this file.
    - The admin lands on `/admin` with Queue + Review, Duplicates, Stats, Routing, and all four admin pages open.
    - `/authority` and `/map` redirect to `/admin`, and `/authority?complaint=<id>` opens that complaint on `/admin`.
    - The officer signs in at `/authority`, lands on `/admin`, sees only "Queue", and is sent back to `/admin` from every admin-only page.
    - No console errors. Database writes: one sign-in record per account; no complaint marked seen.
  - **Delete the two `zz-temp-*` accounts before the demo or a real launch** (Supabase → Authentication → Users), or reset the real officials' passwords and use those.

### 3.21 Student sign-in moves to `/login` (2026-11-03)

- **Nav "Student Sign In" button:** when signed out, it now opens `/login` in the app instead of scrolling the landing page to "Have an issue on campus?". Signed in, it still opens the student's complaints. `scrollToSignIn()` was removed, and so was the unused `FooterStudentLink`.
- **`/report` renamed to `/login`:** the sign-in / Register with ID card plus the tracker (`ReportPage`). All links now point there: nav, footer, call to action, landing section, `/my`, notifications, tracker search and the report confirmation.
  - `?mode=signup` opens the Register tab, and `?next=<path>` returns there after sign-in (same-site paths only). Both came over from the old login page.
  - `/report/new` (the form) is unchanged. Signed out, it sends the visitor to `/login?next=/report/new`.
  - Old `/report…` links still work: they redirect to `/login` with the same query and hash. `/complaints/:id` now redirects to `/login?track=<id>`.
- **The old unstyled `/login` page (`src/site/pages/LoginPage.tsx`) was deleted.** Its `login.*` dictionary strings, including the Assamese ones, are kept in `src/i18n.ts` for when the sign-in card's text moves into the dictionary. That page's reading-language choice and its link to the official console aren't on the new page.
- `docs/FRONTEND.md` route table updated.
- **Bug fixed (found while testing, older than this change):** after a page reload, a signed-in student's navbar button didn't open their complaints. The button and `openTracker()` asked `CivicAuth.getProfile()`, which the student site never fills when it restores a session (only a fresh log-in or the officials' console sets it). Both now use the student session store (`isStudentSignedIn()` in `src/site/studentSession.ts`). Before this change, the same bug showed up as the button scrolling down the page.
- **Verified** in headless Edge:
  - **Signed out, 10 of 10:** the nav button opens `/login` without a reload; all 4 redirects keep their query and hash; `?mode=signup` and the default tab open correctly.
  - **Signed in with a real student account, 14 of 14:**
    - Signing in from `/login?next=/my` and `/login?next=/report/new` returns to those pages.
    - `/login` shows "Signed in as …", and "Report an issue" opens the form.
    - The navbar button opens the student's complaints.
    - `?next` values pointing off the site (`//host`, backslashes, `https://…`) are ignored.
  - No console errors. The build and `npm test` (29) pass.
  - The only database writes were the account's sign-in entries in `activity_log`.

### 3.21 Cleanup: browser client as a module, dead files removed — 2026-11-03

| File | Change |
|---|---|
| [src/civicAuth.ts](src/civicAuth.ts) | Now *is* the browser client (was `public/js/civic-auth.js` on `window.CivicAuth`, plus three hand-written interfaces for it). Callers use `import * as auth from '…/civicAuth'`. Supabase comes from the npm package instead of the CDN `<script>`. Repeated fetch/auth-header code shares one `request()` helper; the two Cloudinary upload copies are one function. Unused functions dropped: `getProfile`, `getSession`, `loginDepartmentOrSocial`, `loginAdministration`, `enforceRoleGuard`, `checkRateLimit`/`clearRateLimit` exports, `fetchStudentIdCard`, `fetchAdminStats`, `analyseComplaint`. |
| `index.html`, `admin.html` | Supabase CDN and `civic-auth.js` `<script>` tags removed. `window.showToast` removed (the module imports `showToast`). |
| [backend/live-test.mjs](backend/live-test.mjs) | Reads the publishable key from `src/civicAuth.ts`. |
| removed | `public/halden.html` (unrelated page), `metadata.json` (unused), `src/lib/utils.ts` (`cn()` only wrapped `clsx`). |

Checked: type-check, `npm test`, build; both pages boot with no console errors; reads, signed-out errors and a failed login behave as before. Signed-in flows not re-run (they write to the live DB).

### 3.20 Student Sign-in 3D Card ([src/components/ui/sign-in-card-2.tsx](src/components/ui/sign-in-card-2.tsx))

- **Modern interactive 3D card component:**
  - Installed `lucide-react` dependency for clean institutional iconography (`Mail`, `Lock`, `Eye`, `EyeClosed`, `ArrowRight`).
  - Implemented 3D perspective tilt (`rotateX`, `rotateY`) driven by cursor motion values via Framer Motion.
  - Added 4-side perimeter traveling light beam animations and corner glow spots in Civic Green (`#1EA854`).
  - Added floating input focus highlight transitions (`layoutId="input-highlight"`), show/hide password toggle, and animated "Remember account" checkbox.
  - Placed `sign-in-card-2.tsx` in both [src/components/ui/sign-in-card-2.tsx](src/components/ui/sign-in-card-2.tsx) and [components/ui/sign-in-card-2.tsx](components/ui/sign-in-card-2.tsx).
  - Created [src/lib/utils.ts](src/lib/utils.ts) with `cn` utility combining `clsx`.
- **Institutional light-mode alignment (zero green bleed, zero AI slop):**
  - Crisp solid white card surface (`#ffffff`) with `border: 1.5px solid #e0ebd6` on warm cream backdrop (`#FAF6F0`).
  - Removed all green radial gradients, green blur layers, and border sheens that caused green wash bleeding.
  - Added full dual-mode segmented tabs: `Sign In` and `Register with ID` matching the student nav bar workflow:
    - **Sign In Tab**: Student Email, Password with show/hide toggle, Remember account, Direct login with loading spinner, Track Registered Grievance button.
    - **Register with ID Tab**: Full Name, Student Email, Password, and Student ID card file upload (JPG/PNG/PDF max 5 MB) calling `submitStudentSignup`.
    - Unified [src/site/modals/StudentAuthModal.tsx](src/site/modals/StudentAuthModal.tsx) to mount the same component when clicked from the hero nav bar (`StudentNavButton`).
- **Integration into student portal report gate:**
  - Updated `ReportAuthGate` in [src/site/components/ReportForm.tsx](src/site/components/ReportForm.tsx) to mount `<SignInCard2 embedded={true} />`, retaining session visibility gating and element IDs.
  - Updated [demo.tsx](demo.tsx) and [src/demo.tsx](src/demo.tsx) to export `DemoOne` previewing `Component` from `@/components/ui/sign-in-card-2`.
- **Verification:**
  - `npm test`: 29 of 29 automated tests pass.
  - `npm run build`: 0 TypeScript / bundling errors in 1.88s.
  - `npm run audit:slop` (sloplint): 0 critical violations, 0 warnings.

### 3.19 Modern Bento Grid for Categories section ([src/components/ui/bento.tsx](src/components/ui/bento.tsx))

- **Modern interactive Bento grid:**
  - Installed `clsx` and `framer-motion` dependencies.
  - Placed `bento.tsx` in [src/components/ui/bento.tsx](src/components/ui/bento.tsx) and [components/ui/bento.tsx](components/ui/bento.tsx).
  - Configured `tsconfig.json` with `"@/*": ["src/*"]` path alias resolution.
- **Real civic context & illustrations:**
  - Replaced prompt's mock sales placeholders with Dibrugarh University redressal solver desks (Water & Plumbing, Power & Lighting, Campus IT & Wi-Fi, Safety & Proctorial Command, Clean Campus & Sanitation).
  - Uses authentic vector illustration artwork from `/illustrations/` (`tap-fix.svg`, `lamp-fix.svg`, `wifi-fix.svg`, `safety-fix.svg`, `bins-fix.svg`).
  - Preserved interactive 1-click sample autofill via `fillReportDescription()` and direct smooth scroll to `#report`.
  - Retained `cat-card` and `#catGrid` triggers so GSAP entrance animations in `animations.js` continue to fire reliably.
- **Clean scoped styling ([src/components/ui/bento.css](src/components/ui/bento.css)):**
  - High-performance 6-column responsive layout with dark glass specular cards, Bright Lime (#B5F800) badges, and smooth Framer Motion hover elevation.
- **Quality verification:**
  - `npm test`: 29 of 29 tests pass.
  - `npm run build`: compiled in 1.39s with 0 errors.
  - `npm run audit:slop`: 0 critical violations, 0 warnings.

### 3.18 PRD completions: submission contract, maintenance scheduler, campus vector map, and workflow styling

- **Submission validation contract ([backend/submission.ts](backend/submission.ts)):**
  - Sanitizes and validates title (5–200 chars), description (8–10,000 chars), and category.
  - Verifies all evidence file public IDs belong strictly to the authenticated student (`civicsense/complaint_evidence/${userId}/...`) and rejects path traversal.
  - Resolves campus locations to stable canonical identifiers via [src/locations.ts](src/locations.ts) while preserving custom user descriptions.
- **Escalation & maintenance engine ([backend/maintenance.ts](backend/maintenance.ts), [backend/api.ts](backend/api.ts)):**
  - Automated deadline enforcement with priority caps: P1 emergency at 4 hours, P2 urgent at 24 hours.
  - Sensitive and P1 escalations route strictly to Central Administration / Head of Institution.
  - Terminal and review states (`closed`, `merged`, `resolved`, `rejected`, `needs_review`) are exempt from escalation.
  - Added `GET /api/cron/escalations` and optional in-process background worker (`runMaintenance()` when `LOCAL_MAINTENANCE=true`).
- **Official account preservation:**
  - Blocked destructive official account deletion in API to preserve immutable audit trail and historical status change logs.
- **Offline campus map for `/map` ([src/admin/components/ComplaintMap.tsx](src/admin/components/ComplaintMap.tsx)):**
  - Full vector SVG rendering of campus boundaries, roads, and university buildings using offline UTM Map Kit.
  - Interactive zoom, pan, campus re-centering, priority-coded badge pins, and complaint count aggregation.
- **Clean responsive workflow styling ([src/workflow.css](src/workflow.css)):**
  - Styled PRD workflow routes (`/my`, `/complaints/:id`, `/login`, `/admin/review`, `/admin/duplicates`, `/admin/stats`, `/admin/routing`, `/map`) matching DU design tokens.
  - Full accessibility: high-contrast text, focus rings, keyboard navigation, and responsive mobile layouts.
- **Hallmark anti-slop alignment ([src/site/sections/Stats.tsx](src/site/sections/Stats.tsx)):**
  - Replaced simulated telemetry with verified structural metrics (20 Issue Categories, 2 Languages, 4 Priority Levels, 1 Trackable Complaint).
  - Hallmark anti-slop linter (`npm run audit:slop`): **0 critical violations, 0 warnings**.
- **Expanded test suite ([backend/api.test.ts](backend/api.test.ts), [backend/completion.test.ts](backend/completion.test.ts)):**
  - 29 of 29 automated tests passing (`npm test`).
  - Full production build (`npm run build`) compiles cleanly in under 1.4s with 0 errors.

---

## 4. Findings from the project analyses

Status key: ✅ fixed · ⏳ open · ➖ no longer applies · ✏️ corrected (the original finding was wrong)

### 4.1 Second analysis — 2026-11-02 (current app: `index.html` + `admin.html` + Supabase)

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Live Supabase `service_role` key and Cloudinary secret committed and pushed; the backend was using them. | Critical | ✅ removed from code · ⏳ **rotate keys** |
| 2 | Hardcoded admin password `Admin@123456` in `schema.sql`. | Critical | ✅ |
| 3 | Unauthenticated Cloudinary upload signing. | High | ✅ |
| 4 | API allowed more than the database rules (departments acting on DUSU and unassigned complaints). | High | ✅ |
| 5 | Evidence viewer could return any file (found while fixing #4). | High | ✅ |
| 6 | Database rule gaps: officials' emails public; any official could edit any ID card; students could fake statuses. | High | ✅ (live since 2026-11-02) |
| 7 | Admin actions could target other admins. | Medium | ✅ |
| 8 | Unescaped complaint text in `index.html`. | Medium | ✅ |
| 9 | Production build broken: no `admin.html`, missing map files, wrong script path; API only ran in dev; `npm run server` crashed. | High | ✅ |
| 10 | Admin activity log showed "undefined". | Medium | ✅ |
| 11 | `update-status` reported success even when writes failed. | Medium | ✅ |
| 12 | Hero headline cut off at "Say it. Direct to". | Low | ✅ (it was the `splitWords` bug, which affected 4 headings) |
| 13 | Mobile page scrolls sideways / nav clipped. | — | ✏️ Not a bug. The character row is a deliberate swipe strip, and the nav fits on a properly emulated phone. |
| 14 | Local officials login with passcode `civic2026`. | Low | ✏️ No button opens it any more. Output escaped; removal is a team decision (section 2). |
| 15 | Real people's names in demo data. | Low | ⏳ team decision (section 2) |
| 16 | `src/` React app (~10k lines) is never loaded by `index.html`. | Low | ✅ replaced by a React version of the current site (3.7) |
| 17 | Tests in `src/lib/portalStore.test.ts` couldn't run (no test script, bad imports) and only cover `src/`. They pass when compiled separately (6/6). | Low | ➖ superseded by `npm test` for the backend rule |
| 18 | `backend/test_rls.sql` can't run: it inserts profiles without `auth.users` rows, runs as superuser so the rules are skipped, and expects the opposite department/DUSU rule. | Medium | ✅ replaced by `npm run test:live` (3.17) |
| 19 | README out of date. | Low | ✅ |
| 20 | Next.js leftovers and junk files. | Low | ✅ |
| 21 | `map-data.js` (7.6 MB) downloaded on every page load; repo history is 72 MB. | Low | ⏳ open (section 5) |
| 22 | Supabase loaded from an unpinned CDN version (`@2`). | Low | ✅ |
| 23 | `package-lock.json` changes when installing with npm 10.8 (only `libc` metadata). | Info | ➖ harmless; use the same npm version across the team |

### 4.2 First analysis — 2026-11-01 (old React version of the app)

Most of these became outdated when the app moved to `index.html` + Supabase.

| # | Finding | Status |
|---|---|---|
| 1 | README described Next.js routes, Leaflet, Supabase and Gemini that didn't exist; `npm run start` didn't exist. | ✅ README rewritten |
| 2 | `src/config.ts` used placeholder contacts (`@campus.edu`, `555` numbers); the "template mode" warning never showed. | ➖ `src/` is no longer shipped |
| 3 | Next.js leftovers (`next.config.mjs`, `components/`, `lib/`, `patch-font-loader.js`); broken re-exports. | ✅ deleted |
| 4 | Stray empty files (`{`, `!!lucide[i]))`, `f.toLowerCase()…`), `powershell.cmd`, `__MACOSX/`, `tsconfig.tsbuildinfo`. | ✅ deleted (`{` was already deleted in the working tree) |
| 5 | About 75 one-off image scripts, `scratch_*` folders, `Flat Assets/` duplicated in `public/`. | ✅ scratch folders deleted · ⏳ scripts and `Flat Assets/` kept |
| 6 | Mobile overflow and clipped characters in the old React hero. | ➖ that hero no longer exists |
| 7 | `tailwind.config.ts` ignored by Tailwind v4. | ✅ deleted |

---

## 5. Still open

| Item | Suggested fix |
|---|---|
| Deleting an official cascades to `complaint_status_history` and `activity_log`, erasing their history entries (`on delete cascade` in `schema.sql`). | Prefer deactivating over deleting, or change those foreign keys to `on delete set null`. |
| ~~`backend/test_rls.sql` can't run.~~ | Done in 3.17: replaced by `npm run test:live`. |
| ~~`map-data.js` (2.2 MB) loads on every student page.~~ | Done in 3.17: the map data loads when the map scrolls into view. |
| Large repo: the map kit (40 MB, includes an Android project and raw map data) and `Flat Assets/`. | Keep only the files the site uses, or move the rest to Git LFS / a separate repo. |
| ~~**React migration.**~~ | **Done (3.12).** Both pages are React; there is no page script left. |
| ~~Hero character cards call `selectCat()`, which never existed.~~ | Done in 3.12: the dead handler was removed. |
| ~~Searching a complaint ID in the tracker calls `renderTracker()`, which doesn't exist.~~ | Fixed in 3.10: unknown IDs now show "No complaint record found". Still to decide: remove the demo complaint chips (CS-8921 …) or add matching demo complaints to the database. |
| ~~Sign-out sometimes briefly showed the old session again.~~ | Fixed in 3.12: a session check that started before the latest sign-in/sign-out is ignored. |
| ~~`admin.html`'s `#authModal` calls functions that don't exist.~~ | Done in 3.11: deleted. |
| ~~The admin category filter's **Library** option matches no student category (3.11).~~ | Done in 3.17: removed. |
| Supabase advisor: the helper functions (`can_read_complaint`, `is_routed_to_me`, `can_see_reporter`, `current_user_role`, …) are callable through `/rest/v1/rpc` (3.16). Low risk: they answer only about the caller. | Probably leave as is. Don't simply `revoke execute … from anon`: the policies call these functions as `anon` too, so logged-out reads would then error instead of returning nothing. Test first if you change it. |
| Supabase advisor: `protect_complaint_ai_fields` / `protect_complaint_duplicate_fields` have no fixed `search_path`. | Fixed in the migration file (3.17). ⏳ **Still to run on the live database:** the two `alter function` lines in 3.17. |
| Supabase advisor: leaked-password protection is off. | Supabase → Authentication → Passwords → turn it on. |
| ⏳ Agent tag (3.24) is built but not live: migration 002 is not applied, and no bots exist yet. | Run `backend/migrations/002_chat_signals.sql`, create the bots, set the env vars (README → "Agent tag"), then test once in a real group. |
| Agent tag runs only in a long-running process (polling/Gateway). | If the app moves to Vercel functions, switch to a Telegram webhook and Discord interactions; `handleTag()` stays the same. |

---

## 6. How to run and verify

```bash
npm install
npm test          # access-rule tests (expect: pass 2, fail 0)
npm run build     # type-check app + backend, build dist/
npm run preview   # production build + API; open /, /admin.html, /api/health
```

What was checked on 2026-11-02:

- Type-check and build pass.
- `npm test` passes.
- In the production build, all page and map files load, `/api/health` reaches the database, and the API rejects missing or forged logins.
- Both pages render with no JavaScript errors.
- `npm run server` starts.
- The tracked files no longer contain the leaked secrets.
