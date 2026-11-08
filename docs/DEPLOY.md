# Deploying Xohari to Vercel with a Namecheap domain

The app is ready for Vercel. `npm run vercel-build` (Vercel runs it automatically) produces `.vercel/output/` in Vercel's Build Output format:

| Part | What it is |
|---|---|
| `static/` | The built student site (`index.html`) and officials' console (`admin.html`), assets and images |
| `functions/api.func/` | The whole API (`backend/api.ts`) bundled into one Node 22 function, dependencies included |
| `config.json` | The same URL rules as the dev server: `/api/*` → the function; `/admin`, `/admin/*`, `/authority`, `/map` → `admin.html`; other page URLs → `index.html`; one daily cron for deadline escalation |

You can run `npm run vercel-build` locally to check it builds (it needs `.env.local` only for the type-check, not for the output).

## 1. Before going public

These matter more once the site is on the internet:

1. **Rotate the leaked keys** (Changelog action items 1–2): the Supabase `service_role` key and the Cloudinary API secret were once committed to GitHub. Rotate them, and put only the new values into Vercel.
2. **Delete the temporary console accounts** `zz-temp-admin@example.com` and `zz-temp-officer@example.com` (Supabase → Authentication → Users) once you have working official logins.
3. **Link the posts to real officials** on `/admin/routing` (action item 11), or routed complaints reach only the administrators.

## 2. Create the Vercel project

1. Sign in at [vercel.com](https://vercel.com) with GitHub. The repository is `github.com/Bitupan-cooder/Civicsense`. If it isn't in your GitHub account, the owner (Bitupan-cooder) must import it, or add you to the repository and grant Vercel access to it.
2. **Add New → Project → Import** the repository.
3. In **Configure Project**:
   - **Framework Preset:** `Other`
   - **Build Command:** `npm run vercel-build`. Vercel picks this up from `package.json` on its own; setting it explicitly is fine too.
   - **Output Directory:** leave empty. Vercel uses `.vercel/output` automatically.
   - **Install Command:** default (`npm install`)
   - **Node.js version** (Settings → General, after creation): **22.x**
4. Add the **Environment Variables** below (apply them to Production and Preview), then **Deploy**.

### Environment variables

Copy the values from your `.env.local` (after rotating the keys). All of these are server-only: the browser never sees them.

| Name | Required | Notes |
|---|---|---|
| `SUPABASE_URL` | yes | `https://mdywamyrxuuookaxksyv.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | the new key after rotation |
| `CLOUDINARY_CLOUD_NAME` | yes | |
| `CLOUDINARY_API_KEY` | yes | |
| `CLOUDINARY_API_SECRET` | yes | the new secret after rotation |
| `GEMINI_API_KEY` | recommended | without it, complaints are analysed by the keyword rules |
| `GEMINI_MODELS` | optional | model fallback chain, default `gemini-2.5-flash,gemini-2.5-flash-lite` (the next is tried on a quota or Google-side error) |
| `CRON_SECRET` | recommended | any long random string. Vercel's cron sends it automatically; without it the escalation cron is refused |
| `PUBLIC_SITE_URL` | after step 3 | `https://yourdomain.tld` (used in links the chat bot sends) |
| `TELEGRAM_BOT_TOKEN`, `DISCORD_BOT_TOKEN` | if you use the bots | the website sends the "linked" direct message and posts officials' updates back into the group. The bots themselves run elsewhere (section 5) |

Don't set these on Vercel: `CHAT_BOTS`, `LOCAL_MAINTENANCE`, `PORT`. They belong to the always-on bot process (section 5).

### Check the deployment

On the `*.vercel.app` address Vercel gives you:

- `https://<project>.vercel.app/api/health` should return `{"status":"ok","database":true}`. A "Server not configured" error means an environment variable is missing; add it and redeploy.
- `/api/features` should show `"routing": true` and `"gemini": true`.
- Open `/`, `/login` (student sign-in) and `/admin` (console sign-in).

Keep the `*.vercel.app` address as the demo fallback in case the domain isn't ready in time.

## 3. Connect the Namecheap domain

1. **In Vercel:** Project → **Settings → Domains → Add** → type `yourdomain.tld`. Vercel offers to add `www.yourdomain.tld` too: accept, and let one redirect to the other. Vercel then shows the DNS records to create.
2. **In Namecheap:** **Domain List → Manage** (next to the domain) → **Advanced DNS**.
   - Delete the default parking records: the `CNAME` for `www` pointing to `parkingpage.namecheap.com` and the `URL Redirect` record for `@`.
   - Add the records exactly as Vercel shows them. Usually:

     | Type | Host | Value | TTL |
     |---|---|---|---|
     | A Record | `@` | the IP Vercel shows (for example `76.76.21.21`) | Automatic |
     | CNAME Record | `www` | the target Vercel shows (for example `cname.vercel-dns.com.`) | Automatic |

   - Save all changes.
3. **Wait.** DNS can take minutes to a few hours. Vercel's Domains page turns green ("Valid Configuration") and issues the HTTPS certificate on its own.

Leave Namecheap's nameservers on "Namecheap BasicDNS". Switching the whole domain to Vercel's nameservers also works, but it moves all the domain's DNS (including email records) to Vercel.

## 4. After the domain works

1. **Supabase** → Authentication → **URL Configuration**:
   - **Site URL:** `https://yourdomain.tld`
   - **Redirect URLs:** add `https://yourdomain.tld/**` and `https://<project>.vercel.app/**`
2. **Vercel:** set `PUBLIC_SITE_URL=https://yourdomain.tld` and redeploy (Deployments → ⋯ → Redeploy).
3. Run through the demo once on the real domain: student sign-up / sign-in, file a complaint, see it routed, reply from `/admin`, confirm on the student side.

## Limits on Vercel (and what to do)

- **Deadline escalation runs once a day** (03:00 UTC). That is the most often a Vercel Hobby (free) project may run a cron. On a Pro plan, change the schedule in `scripts/vercel-output.mjs` to hourly (`0 * * * *`). An admin can always run it by hand: `/admin/stats` → **Run deadline check**.
- **The Telegram/Discord bots (Agent tag) don't run on Vercel.** They listen continuously, which needs an always-on process: see section 5. Everything else works without them.
- **Each API call can run for up to 60 seconds** (`maxDuration`), enough for the Gemini calls.

## 5. Running the chat bots (always-on process)

The bots connect **outwards**: Telegram long polling and the Discord Gateway. They need no public URL, open port or webhook, only a process that never sleeps. That process is `npm run server` (`backend/server.ts`) with `CHAT_BOTS=true`. It writes to the same Supabase database as the website, so signals appear on `/admin/signals` as usual.

**Rule: exactly one process may run the bots.** A second Telegram poller on the same bot is refused (HTTP 409). While a host runs them, keep `CHAT_BOTS` off in your local `.env.local`.

### Option A: your laptop (simplest, good for the demo)

1. In `.env.local`: `CHAT_BOTS=true`, `TELEGRAM_BOT_TOKEN=…`, `DISCORD_BOT_TOKEN=…`, `PUBLIC_SITE_URL=https://yourdomain.tld`.
2. Run `npm run server` and keep the laptop awake and online. The bots work while it runs and stop when it closes.

### Option B: Railway (always on, deploys from GitHub)

1. [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo** → this repository.
2. Service **Settings → Deploy → Custom Start Command:** `npm run server`. Don't generate a public domain; it isn't needed.
3. **Variables:**
   - the same server variables as Vercel: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, the three `CLOUDINARY_*`, `GEMINI_API_KEY`
   - `CHAT_BOTS=true`, `TELEGRAM_BOT_TOKEN`, `DISCORD_BOT_TOKEN`
   - `PUBLIC_SITE_URL=https://yourdomain.tld`
   - optional `LOCAL_MAINTENANCE=true`, which checks deadlines every minute instead of once a day (safe alongside the Vercel cron: each escalation is recorded once per day and stage)
4. **Deploy**, then open the service's **Logs**. You should see `[chatbots] Telegram: listening as @YourBot` (and the same for Discord).

Railway's Hobby plan is about $5 a month. Render's free tier doesn't work here: it sleeps after 15 minutes without web traffic, which stops the bots.

### Option C: any small Linux server (VPS)

On a $4–6/month VPS (Hetzner, DigitalOcean, …) or Oracle Cloud's free tier, with Node 22 installed:

```bash
git clone https://github.com/Bitupan-cooder/Civicsense.git && cd Civicsense && npm install
nano .env.local          # the variables from option B
npm install -g pm2
pm2 start "npm run server" --name xohari-bots
pm2 save && pm2 startup  # restart automatically after a reboot
```

`pm2 logs xohari-bots` shows the bots' log; `git pull && pm2 restart xohari-bots` updates them.

## Updating the site

Every push to the repository's main branch redeploys automatically. Other branches get their own preview addresses.
