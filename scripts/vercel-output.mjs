// Turns the Vite build (dist/) into Vercel's Build Output API v3 (.vercel/output), which Vercel deploys as-is:
//   static/                 the two apps (index.html, admin.html), assets and the map kit files
//   functions/api.func/     the whole API bundled into one file, dependencies included
//   config.json             the same URL rewrites the Vite dev server does, plus the daily escalation cron
// Run by `npm run vercel-build` (Vercel calls that script automatically).
import { build } from 'rolldown';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

const OUT = '.vercel/output';
if (!existsSync('dist/index.html') || !existsSync('dist/admin.html')) throw new Error('dist/ is missing: run `npm run build` first.');

rmSync(OUT, { recursive: true, force: true });
cpSync('dist', `${OUT}/static`, { recursive: true });

const fn = `${OUT}/functions/api.func`;
mkdirSync(fn, { recursive: true });
await build({
  input: 'backend/vercel.ts',
  platform: 'node',
  logLevel: 'warn',
  output: { file: `${fn}/index.mjs`, format: 'esm', minify: true },
});
writeFileSync(`${fn}/.vc-config.json`, JSON.stringify({
  runtime: 'nodejs22.x',
  handler: 'index.mjs',
  launcherType: 'Nodejs',
  shouldAddHelpers: false, // the API reads the raw request body itself
  maxDuration: 60,         // Gemini calls can take up to 30 s
}, null, 2));

writeFileSync(`${OUT}/config.json`, JSON.stringify({
  version: 3,
  routes: [
    { src: '^/assets/(.*)$', headers: { 'cache-control': 'public, max-age=31536000, immutable' }, continue: true },
    { src: '^/api/(.*)$', dest: '/api?__path=$1' },
    { handle: 'filesystem' },
    // same split as pageRewrite in vite.config.ts: officials' URLs → admin.html, other extensionless URLs → index.html
    { src: '^/(admin|authority|map)(/.*)?$', dest: '/admin.html' },
    { src: '^/[^.]*$', dest: '/index.html' },
  ],
  // Vercel sends "Authorization: Bearer $CRON_SECRET" when that env var is set (backend/api.ts checks it).
  // ponytail: daily is the Hobby-plan limit; on Pro make it hourly ("0 * * * *") so 4 h / 24 h deadlines escalate on time
  crons: [{ path: '/api/cron/escalations', schedule: '0 3 * * *' }],
}, null, 2));

console.log(`Vercel output ready in ${OUT}/ (static site + api function + routes).`);
