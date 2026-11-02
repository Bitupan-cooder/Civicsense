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
| 4 | **Run `backend/schema.sql` again** | The database security fixes (section 3.3) only exist in the file until it's run. The live database still has the old rules. | Supabase → SQL Editor |
| 5 | Create a new admin login | The schema no longer creates an admin with a hardcoded password. Create one with a strong password, set its email in `v_admin_email` in the last block of `schema.sql`, then run that block. | Supabase → Authentication → Users → Add user |
| 6 | **Turn Confirm email off** | Student signup needs a session right after sign-up. It is currently **on** (checked 2026-11-02), so new students can't finish registering. Signup now stops with a clear error instead of failing silently. | Supabase → Authentication → Providers → Email |
| 7 | Consider removing the old keys from git history | Rotating (1–2) makes the leaked keys useless, which is the important part. Rewriting history (e.g. `git filter-repo`) is optional, needs a force-push and every teammate must re-clone. | GitHub repo |
| 8 | Check whether the GitHub repo is public | This couldn't be checked from the dev machine. If it's public, assume the keys were seen. | github.com/Bitupan-cooder/Civicsense → Settings |
| 9 | **Fix the Cloudinary cloud name** | `CLOUDINARY_CLOUD_NAME=Root` (copied from the old committed `.env.example`) is invalid: Cloudinary rejects every upload with "Invalid cloud_name Root". Found in the live test on 2026-11-02. **Until fixed, students can't attach evidence and student signup fails** (it uploads the ID card). | Cloudinary dashboard → the cloud name looks like `dxxxxxxxx` → put it in `.env.local` |
| 10 | **Run `backend/migrations/001_ai_routing_tracker.sql`** (after #4) | Turns on AI analysis, routing to posts and the route tracker (3.13). Additive: nothing is dropped or renamed. Until it runs, the site works exactly as before. If `schema.sql` is ever re-run, run this again afterwards. | Supabase → SQL Editor |
| 11 | Link posts to official accounts | Routed complaints reach an official only when their post's `authorities.email` matches their login. The Head / Chairperson post should be an administration account. Example in the README. | Supabase → SQL Editor |
| 12 | Add `GEMINI_API_KEY` (optional) | Without it, the keyword rules analyse complaints. They're weaker: for example, "No water in the Boys Hostel 2 bathroom" comes out as `hostel`, not `water`. | `.env.local` (key from aistudio.google.com) |

---

## 2. Decisions needed

| Question | Current state | Notes |
|---|---|---|
| **Can department accounts see DUSU (`social_service`) complaints?** | **No.** The API now follows the database rule, which says no. | `backend/test_rls.sql` (tests 3 and 4) expects **yes**, and the old API allowed it. If the answer is yes, change both `can_read_complaint()` in `backend/schema.sql` and `backend/access.ts` (and its test) together. |
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

### 3.3 Database rules ([backend/schema.sql](backend/schema.sql))

Not applied yet (section 1, item 4).

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
- **Not yet verified live:** the analysis, routing and tracker against the real database. That needs the migration run (action item 10). The SQL couldn't be run on this machine either: the local PostgreSQL needs a password and has no pgvector.

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
- Live behaviour of everything in 3.13 and 3.14 is still to be verified after action item 10.

**Next PRD steps:**
- duplicate detection (embeddings and pgvector)
- the English/Assamese UI toggle across the pages
- admin statistics (by category and status, average resolution time)
- P1: escalation job, routing editor, Leaflet map

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
| 6 | Database rule gaps: officials' emails public; any official could edit any ID card; students could fake statuses. | High | ✅ in file · ⏳ **run schema.sql** |
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
| 18 | `backend/test_rls.sql` can't run: it inserts profiles without `auth.users` rows, runs as superuser so the rules are skipped, and expects the opposite department/DUSU rule. | Medium | ⏳ open (section 5) |
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
| `backend/test_rls.sql` can't run. | Create matching `auth.users` rows, switch to the `authenticated` role before querying, and align tests 3–4 with the decision in section 2. |
| `map-data.js` is 7.6 MB on every page load. | Load it only when the map section is opened. |
| Large repo: the map kit (40 MB, includes an Android project and raw map data) and `Flat Assets/`. | Keep only the files the site uses, or move the rest to Git LFS / a separate repo. |
| ~~**React migration.**~~ | **Done (3.12).** Both pages are React; there is no page script left. |
| ~~Hero character cards call `selectCat()`, which never existed.~~ | Done in 3.12: the dead handler was removed. |
| ~~Searching a complaint ID in the tracker calls `renderTracker()`, which doesn't exist.~~ | Fixed in 3.10: unknown IDs now show "No complaint record found". Still to decide: remove the demo complaint chips (CS-8921 …) or add matching demo complaints to the database. |
| ~~Sign-out sometimes briefly showed the old session again.~~ | Fixed in 3.12: a session check that started before the latest sign-in/sign-out is ignored. |
| ~~`admin.html`'s `#authModal` calls functions that don't exist.~~ | Done in 3.11: deleted. |
| The admin category filter's **Library** option matches no student category (3.11). | Remove the option, or add a Library category to the student form. |

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
