# Frontend guide: routes, screens and how they connect to the backend

This is for whoever styles the app. Every screen in the PRD now exists and is **wired to the backend**:
- data loads
- buttons call the API
- loading, error, empty and "not set up yet" states are handled
- texts come from the English/Assamese dictionary

The **new screens are deliberately unstyled**: plain HTML elements, no classes, no CSS. Styling them is yours. Please keep the data hooks and handlers as they are (see "Rules" at the end).

Each new file starts with a comment that says where its data comes from.

## Two apps, one set of URLs

| App | Entry | Stylesheet | Serves |
|---|---|---|---|
| Student site | `index.html` → `src/site/main.tsx` → `SiteApp.tsx` | `src/site/site.css` | every URL not below |
| Officials' console | `admin.html` → `src/admin/main.tsx` → `AdminApp.tsx` | `src/admin/admin.css` | `/admin`, `/admin/*` (the old `/authority`, `/map` and `/admin.html` redirect to `/admin`) |

They stay separate because `site.css` and `admin.css` define the same class names (`.btn`, `.modal`, `.pill`…) differently.
- In development and `npm run preview`, `vite.config.ts` (`pageRewrite`) sends each URL to the right HTML file.
- **Production hosting needs the same rewrites.** Officials' paths go to `admin.html`, every other extensionless path to `index.html`, and `/api/*` to the backend.

Routing uses **React Router 6.28**. Links between pages inside one app use `<Link>`/`<NavLink>`; links across the two apps (student ↔ console) are plain `<a href>`.

## Routes

### Student site

| URL | File | Status | Data and actions |
|---|---|---|---|
| `/` | `SiteApp.tsx` → `Landing` (sections in `src/site/sections/`) | **styled** (existing) | unchanged; the report form, campus map and dialogs live here |
| `/login?link=<token>` (any page) | `SiteApp.tsx` → `ChatLink` | renders nothing | Agent tag: the bot's private account-link link. Once a student is signed in, it calls `linkChatAccount(token)` → `POST /api/chat/link` and shows a toast. Keep `ChatLink` mounted. |
| `/login`, `/login?mode=signup`, `?next=/path`, `?track=<id>`, `?view=mine` | `src/site/pages/ReportPage.tsx` → `ReportPage` | styled | Student sign-in / "Register with ID" card (`src/components/ui/sign-in-card-2.tsx`), then "Report an issue"; below it the tracker (`ReportTrackerSection`). `?mode=signup` opens Register, `?next` returns there after sign-in. The nav's "Student Sign In" button opens this page. |
| `/report/new` | `src/site/pages/ReportPage.tsx` → `ReportFormPage` | styled | The report form. Signed out → `/login?next=/report/new`. |
| `/report` | `SiteApp.tsx` → `ReportRedirect` | redirect | Old address: forwards to `/login` with its query and hash. |
| `/my` | `SiteApp.tsx` | redirect | Removed page: "My complaints" is the tracker below the sign-in on `/login` and `/report/new`. Forwards to `/login?view=mine#report-tracker`. |
| `/complaints/:id` (full id or `CS-XXXXXXXX`) | `SiteApp.tsx` → `ComplaintRedirect` | redirect | Forwards to `/login?track=<id>#report-tracker` (the tracker shows the complaint). `ComplaintPage.tsx` only supplies `ConfirmOrReopen` now. |

Shared shell for the new student pages: `src/site/pages/PageShell.tsx` (header nav, language toggle, notification bell) and `SignInRequired` ("Log in or sign up to continue", with `?next=` back to the page).

### Officials' console

| URL | Who | File | Status | Data and actions |
|---|---|---|---|---|
| `/admin` | everyone signed in to the console (officers see what is routed to their post; admins see all) | `src/admin/components/AdminMain.tsx` | **styled** (existing) | `console.ts` store. The old `/authority` redirects here. |
| `/admin/review` | administration | `src/admin/pages/ReviewQueuePage.tsx` | styled (`src/admin/console-redesign.css`) | complaints with status `needs_review`; `routeByHand(id, category)` → `POST /api/admin/route-complaint` |
| `/admin/signals` | every official (the API filters to their post); nav link only after migration 002 | `src/admin/pages/SignalsPage.tsx` | styled (shared card rules in `src/admin/console-redesign.css`) | `GET /api/signals`; `actOnSignal(id, action, note)` → `POST /api/signals/act` (acknowledge / convert / dismiss) |
| `/admin/duplicates` | administration | `src/admin/pages/DuplicatesPage.tsx` | styled (`src/admin/console-redesign.css`) | `GET /api/admin/duplicates`; `mergeComplaint(id, intoId)` → `POST /api/admin/merge`; `dismissDuplicate(id)` → `POST /api/admin/dismiss-duplicate` |
| `/admin/stats` | administration | `src/admin/pages/StatsPage.tsx` | styled (`src/admin/console-redesign.css`) | `GET /api/admin/stats`. The PRD suggests Recharts: every `byStatusAll` / `byCategory` / `byLocation` / `byPriority` object maps to chart data with `Object.entries(counts)`. |
| `/admin/system` | administration | `src/admin/pages/SystemPage.tsx` (English only, a developer tool) | styled (`.analytics-*` and `.system-*` in `src/admin/console-redesign.css`) | `fetchSystem(7 \| 30)` → `GET /api/admin/system?days=` → `SystemReport`: model calls, tokens and cost, latency by step, keyword-rule fallback share, complaints and signals by status, server errors, bot health. Tokens and errors need migration 003. |
| `/admin/routing` | administration | `src/admin/pages/RoutingEditorPage.tsx` | styled (`src/admin/console-redesign.css`) | `GET /api/admin/routing` → `{ authorities, rules, categories }`; save with `PUT /api/admin/routing` (the server validates and returns the saved config) |
| `/map` | officers and administration | `src/admin/pages/CampusMapPage.tsx` | **new, unstyled, no map drawn yet** | builds `pins` (lat/lng, worst priority, complaints) from the store and `CAMPUS_LOCATION_COORDS`. **Draw the map here** (PRD: Leaflet + OpenStreetMap): one marker per pin, colour by `pin.priority`, clusters by `pin.complaints.length`. |
| any other / `/admin.html` | | `AdminApp.tsx` → `RoleHome` | | sends the official to `/admin` after sign-in, keeping `?complaint=<id>` |

- Navigation between the console pages: `src/admin/pages/ConsoleNav.tsx` (styled in `src/admin/console-redesign.css`), rendered under the header.
- Shared loading/error/"not set up" states: `PageState` in the same file.
- `?complaint=<id>` on any console URL opens that complaint's docket.

### Shared pieces (both apps)

| File | What | Styling today |
|---|---|---|
| `src/RouteTracker.tsx` | `AiPanel` (AI category, priority, summaries), `RouteTracker` (recipients × delivered / seen / replied / resolved), `Replies` (translated, "Show original"), `PriorityChip` | inline styles, restyle freely |
| `src/NotificationBell.tsx` | bell with unread count and dropdown, live via Supabase Realtime; `useFeatures()` | inline styles, restyle freely |
| `src/i18n.ts` | dictionary, `useLanguage()` → `{ lang, setLanguage, t }`, `LanguageToggle` (unstyled) | n/a |

## Language (English / Assamese)

- Use `const { t, lang } = useLanguage()` and `t('nav.my')`. Add keys to **both** `en` and `as` in `src/i18n.ts`; a key missing from `as` is a type error.
- The choice is kept in `localStorage` (`civicsense-lang`). For a signed-in user it's also saved to `profiles.preferred_language`, and loaded from there at sign-in.
- The same setting picks which language complaint summaries and replies are shown in (the PRD's "AI output language").
- The existing landing page and console still have their English text in the markup. Move strings into `i18n.ts` as you go.
- **Assamese wording needs review by a native speaker.**

## "Not set up yet"

The migration (`backend/migrations/001_ai_routing_tracker.sql`) has been run on the live database (2026-11-02), so every feature below is switched on. These states only appear on a database where it hasn't been run:
- `GET /api/features` returns `{ routing: false }`
- `useFeatures()` reports that, and the console navigation, notification bell and "hide my name" checkbox stay hidden
- the new console pages show "This feature switches on after the database migration has been run"

## Backend contract

The client functions and their types are exports of `src/civicAuth.ts` (`import * as auth from ...`). The ones these screens use:

| Function | Endpoint | Returns |
|---|---|---|
| `fetchFeatures()` | `GET /api/features` | `{ routing, gemini }` |
| `fetchRouting(ids)` | Supabase (RLS) | `{ [id]: Routing }`: AI fields, `routes`, `replies`, `location_id`, `duplicate_of`, `hide_name_from_union` |
| `analyseComplaint(id, place, hideName)` | `POST /api/complaints/analyse` | `Analysis` |
| `postReply(id, body, 'public' \| 'internal')` | `POST /api/complaints/replies` | `{ translated }` |
| `confirmComplaint(id, 'confirm' \| 'reopen', note)` | `POST /api/complaints/confirm` | `{ status }` |
| `markComplaintSeen(id)` | `POST /api/complaints/seen` | |
| `routeComplaintByHand(id, category)` | `POST /api/admin/route-complaint` | `{ routes }` |
| `fetchStats()` | `GET /api/admin/stats` | `Stats` |
| `fetchSystem(days)` | `GET /api/admin/system?days=7\|30` | `SystemReport` |
| `fetchDuplicates()`, `mergeComplaint(id, intoId)`, `dismissDuplicate(id)` | `/api/admin/duplicates`, `/merge`, `/dismiss-duplicate` | `{ pairs }` … |
| `fetchRoutingConfig()`, `saveRoutingConfig(config)` | `GET` / `PUT /api/admin/routing` | `RoutingConfig` |
| `fetchNotifications()`, `markNotificationsRead(ids)`, `subscribeNotifications(userId, cb)` | Supabase (RLS + Realtime) | `AppNotification[]` |
| `setPreferredLanguage(userId, lang)` | Supabase (RLS) | |

Errors: these functions throw an `Error` with the server's message, which the screens show. Getters for not-yet-installed features throw with `err.notInstalled === true`.

## Console styling (signed-in `/admin` pages)

Redesigned on 2026-11-03 with the project's hallmark rules (`.agents/skills/hallmark/`, `npm run audit:slop`). All of it is in **`src/admin/console-redesign.css`**, loaded last (after `admin.css` and `workflow.css`), and scoped to `#authenticatedWorkspace` and the modals.

- **Same design system as the student site:** warm skin `--bg` page, white cards, `--olive` / `--green` / `--pill` / `--line`, `--radius`.
- **Fonts:** page titles use Cormorant Garamond (`--display-font`, now also loaded in `admin.html`); everything else, numbers included, uses Inter Tight. The serif's old-style 1 and 0 read as I and O.
- **New tokens:** `--muted` (secondary text), `--amber` (awaiting), `--danger`, `--surface`, `--console-width`.
- **Hallmark choices to keep:** sentence-case labels (no uppercase tracking), no decorative dots, icons instead of glued `←`/`→` arrows, no invented numbers (the old "Campus SLA: 48h" was removed), touch targets of at least 40px on desktop and 44px on phones, no sideways page scroll.
- Two hallmark rules deliberately **not** followed, because the PRD wins: Assamese text stays (bilingual is a requirement), and body text uses the dark `--ink` rather than white or green, for contrast.

## Rules: don't break these while styling

1. **The landing page (`/`) stays mounted while other routes show.** It's hidden with `body.route-page` (`src/site/pages/routes.css`), not unmounted. `animations.js` sets it up once at startup and changes its DOM directly, so don't move the landing into a route element.
2. **Don't rename these IDs or classes**; the animation code looks them up:
   - **`animations.js`:** `#app` `#hero` `#heroTitle` `#heroGlass` `.glass` `#hero3dStage` `.hero-3d-card` `.char-img-wrap` `.char-pedestal-ring` `.char-shadow` `.hero-backdrop-title` `.cloud-l` `.cloud-r` `.loop-cloud` `[data-par]` `.nav` `#petals` `.sq-field` `.split` (words become `.w`) `.reveal` `#stats` `#statsCards` `.stats-heading` `.card` `.card-value` `#tree` `#how` `.panel` `.panel-in` `#categories` `#catGrid` `.cat-card` `#report` `#cta` `#ctaCard` `#ctaImg` `#footer` `#fRing` `#fMark` `.fdot` `.backdrop`
3. **Keep form controls controlled**, with their `value` and `onChange` exactly as they are.
4. **Keep `data-*` attributes and `aria-*` labels** on the new pages; tests and screen readers use them. Add your own classes freely.
5. **Links:** keep `<Link>`/`<NavLink>` (in-app navigation without reloading), and plain `<a>` across the two apps.
6. **Test after styling:** `npm run dev`, then open each URL above, signed out and signed in as a student, a department head and an administrator. Then run `npm run build`.
