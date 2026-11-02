// Live test of the database rules and the PRD flow (replaces test_rls.sql), against the real Supabase project.
// Creates zz-migration-test-*@example.com accounts and "ZZ TEST" complaints, and ALWAYS deletes them again,
// then proves 0 rows are left. Never touches other users or complaints.
//
// usage: start the dev server (npm run dev), then: node backend/live-test.mjs [baseUrl, default http://localhost:3000]
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:3000';
process.loadEnvFile('.env.local');
const URL_ = process.env.SUPABASE_URL;
const ANON = readFileSync('public/js/civic-auth.js', 'utf8').match(/SUPABASE_ANON_KEY = '([^']+)'/)[1];
const db = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = (r, what) => { if (r.error) throw new Error(what + ': ' + r.error.message); return r.data; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra !== '' ? '  -> ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : ''}`); };

// The test links these posts to its own accounts. If a real official holds one, they would be notified about test
// complaints, so the test stops instead.
// ponytail: refuses to run once posts are linked (action item 11); seed test-only posts and rules if that blocks you
const TEST_POSTS = ['head', 'general_secretary', 'sports_secretary'];
const users = [];
const complaints = [];
let musicRule = null;

async function user(email, name, profile) {
  const password = 'Zz-' + randomBytes(12).toString('base64url');
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(email + ': ' + error.message);
  users.push(data.user.id);
  must(await db.from('profiles').insert({ id: data.user.id, email, name, is_active: true, must_change_password: false, ...profile }), 'profile ' + email);
  const client = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: s, error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2) throw new Error('sign in ' + email + ': ' + e2.message);
  return { id: data.user.id, email, client, token: s.session.access_token };
}

async function api(path, who, method = 'GET', body) {
  const res = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: 'Bearer ' + who.token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

// the writes the student site makes (public/js/civic-auth.js submitComplaint); analyse=true then runs the AI + routing
async function file(who, title, description, { hideName = false, analyse = true, ...extra } = {}) {
  const { data: c, error } = await who.client.from('complaints').insert({
    student_id: who.id, title, description, category: 'Other', visibility: 'administration', target_unit_id: null, status: 'submitted', ...extra,
  }).select().single();
  if (error) throw new Error('insert ' + title + ': ' + error.message);
  complaints.push(c.id);
  must(await who.client.from('complaint_status_history').insert({ complaint_id: c.id, status: 'submitted', remark: 'Complaint registered by student', changed_by: who.id }), 'history');
  const a = analyse ? await api('/api/complaints/analyse', who, 'POST', { complaintId: c.id, location: null, hideName }) : null;
  return { id: c.id, analysis: a };
}
const row = async (id) => must(await db.from('complaints').select('*').eq('id', id).single(), 'row');
const routesOf = async (id) => must(await db.from('complaint_routes').select('kind, delivered_at, seen_at, replied_at, resolved_at, authority:authorities(post_key)').eq('complaint_id', id), 'routes')
  .map((r) => ({ ...r, post: r.authority.post_key }));
const notes = async (uid, cid) => must(await db.from('notifications').select('message_en, complaint_id').eq('user_id', uid).eq('complaint_id', cid), 'notifications');
const sees = async (who, id) => (must(await who.client.from('complaints').select('id').eq('id', id), 'sel')).length === 1;
const seesProfile = async (who, id) => (must(await who.client.from('profiles').select('id').eq('id', id), 'sel')).length === 1;

async function cleanup() {
  for (const id of users) {
    const { error } = await db.auth.admin.deleteUser(id); // profiles, complaints and everything under them cascade
    if (error && !/not found/i.test(error.message)) console.log('cleanup: delete user', id, error.message);
  }
  await db.from('authorities').update({ user_id: null }).in('post_key', TEST_POSTS).in('user_id', users.length ? users : ['00000000-0000-0000-0000-000000000000']);
  if (musicRule) await db.from('routing_rules').update({ response_hours: musicRule.response_hours }).eq('category', 'music');
  const left = {};
  const count = async (name, q) => { const { data, error } = await q; left[name] = error ? 'ERR ' + error.message : data.length; };
  await count('profiles', db.from('profiles').select('id').like('email', 'zz-migration-test%'));
  await count('complaints', db.from('complaints').select('id').like('title', 'ZZ TEST%'));
  await count('linked test posts', db.from('authorities').select('id').in('user_id', users.length ? users : ['00000000-0000-0000-0000-000000000000']));
  if (complaints.length) for (const t of ['complaint_routes', 'complaint_replies', 'notifications', 'ai_logs', 'complaint_status_history']) await count(t, db.from(t).select('id').in('complaint_id', complaints));
  if (users.length) await count('activity_log', db.from('activity_log').select('id').in('actor_id', users));
  const { data: au } = await db.auth.admin.listUsers({ perPage: 1000 });
  left['auth users'] = (au?.users || []).filter((u) => (u.email || '').startsWith('zz-migration-test')).length;
  const dirty = Object.entries(left).filter(([, n]) => n !== 0);
  console.log(dirty.length ? 'CLEANUP LEFT ROWS: ' + JSON.stringify(left) : 'cleanup: 0 test rows left');
  if (dirty.length) fails++;
}

try {
  const f = await api('/api/features');
  if (f.status !== 200) throw new Error(`No API at ${base} (HTTP ${f.status}). Start the dev server first.`);
  check('GET /api/features: routing on', f.json.routing === true, f.json);
  const linked = must(await db.from('authorities').select('post_key, email, user_id').in('post_key', TEST_POSTS), 'posts').filter((p) => p.email || p.user_id);
  if (linked.length) throw new Error('Refusing to run: these posts are linked to real officials, who would be notified: ' + linked.map((p) => p.post_key).join(', '));
  const leftovers = must(await db.from('profiles').select('id').like('email', 'zz-migration-test%'), 'leftovers');
  if (leftovers.length) throw new Error('Test accounts from an earlier run still exist; delete zz-migration-test-* users first.');

  // ── accounts ──
  const st = await user('zz-migration-test-student@example.com', 'ZZ Test Student', { role: 'student' });
  const st2 = await user('zz-migration-test-student-b@example.com', 'ZZ Test Student B', { role: 'student' });
  const admin = await user('zz-migration-test-admin@example.com', 'ZZ Test Admin', { role: 'administration', unit_name: null });
  const dept = await user('zz-migration-test-dept@example.com', 'ZZ Test Dept', { role: 'department', unit_name: 'ZZ Migration Test Unit' });
  const deptB = await user('zz-migration-test-dept-b@example.com', 'ZZ Test Dept B', { role: 'department', unit_name: 'ZZ Migration Test Unit B' });
  const head = await user('zz-migration-test-head@example.com', 'ZZ Test Head', { role: 'department', unit_name: 'ZZ Migration Test Head Unit' });
  const gs = await user('zz-migration-test-gs@example.com', 'ZZ Test General Secretary', { role: 'social_service', unit_name: 'ZZ Migration Test DUSU' });
  const sports = await user('zz-migration-test-sports@example.com', 'ZZ Test Sports Secretary', { role: 'social_service', unit_name: 'ZZ Migration Test DUSU' });

  // ── 1. basic visibility rules (was test_rls.sql; departments do NOT see DUSU complaints, Changelog decision 2) ──
  const b1 = await file(st, 'ZZ TEST admin only', 'Visibility test (automated).', { analyse: false });
  const b2 = await file(st, 'ZZ TEST for dept', 'Visibility test (automated).', { analyse: false, visibility: 'department', target_unit_id: dept.id });
  const b3 = await file(st, 'ZZ TEST for DUSU', 'Visibility test (automated).', { analyse: false, visibility: 'social_service' });
  const b4 = await file(st2, 'ZZ TEST for dept B', 'Visibility test (automated).', { analyse: false, visibility: 'department', target_unit_id: deptB.id });
  const B = [b1, b2, b3, b4].map((x) => x.id);
  const visible = async (who) => (must(await who.client.from('complaints').select('id').in('id', B), 'sel')).length;
  check('rules: student 1 sees only their own 3', await visible(st) === 3);
  check('rules: student 2 sees only their own 1', await visible(st2) === 1);
  check('rules: department sees only the complaint targeted to it (not DUSU)', await visible(dept) === 1 && await sees(dept, b2.id));
  check('rules: department B sees only its own', await visible(deptB) === 1 && await sees(deptB, b4.id));
  check('rules: DUSU role sees only the social_service complaint', await visible(gs) === 1 && await sees(gs, b3.id));
  check('rules: administration sees all 4', await visible(admin) === 4);
  const fake = await st.client.from('complaints').insert({ student_id: st.id, title: 'ZZ TEST fake', description: 'x', category: 'Other', visibility: 'administration', status: 'resolved' }).select('id');
  if (fake.data?.[0]) complaints.push(fake.data[0].id);
  check('rules: a student cannot file a complaint as "resolved"', !!fake.error);
  const fakeHist = await st.client.from('complaint_status_history').insert({ complaint_id: b1.id, status: 'resolved', remark: 'fake', changed_by: st.id });
  check('rules: a student cannot add a "resolved" history entry', !!fakeHist.error);
  check('rules: logged-out visitors cannot list officials', (must(await createClient(URL_, ANON, { auth: { persistSession: false } }).from('profiles').select('id').in('id', [dept.id, gs.id]), 'anon')).length === 0);
  must(await db.from('complaints').delete().in('id', B), 'remove visibility complaints'); // they would blur the routing checks below

  // ── 2. routing: posts linked to the test accounts for this run only ──
  for (const [k, u] of [['head', head], ['general_secretary', gs], ['sports_secretary', sports]]) must(await db.from('authorities').update({ user_id: u.id }).eq('post_key', k), 'link ' + k);
  await sports.client.realtime.setAuth(sports.token);
  const live = [];
  const channel = sports.client.channel('zz-live-test').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + sports.id }, (p) => live.push(p.new));
  check('realtime: subscribed', await new Promise((resolve) => { channel.subscribe((s) => { if (s === 'SUBSCRIBED') resolve(true); if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') resolve(false); }); setTimeout(() => resolve(false), 15000); }));

  const A = await file(st, 'ZZ TEST football ground', 'The football ground goalposts are broken and the sports equipment room is locked during practice hours.',
    { hideName: true, ai_category: 'hostel', priority: 1, hide_name_from_union: true, summary_en: 'forged by client' });
  const a = A.analysis.json || {};
  check('analyse: sports P3, not sensitive, no review', A.analysis.status === 200 && a.category === 'sports' && a.priority === 3 && !a.is_sensitive && !a.needs_review, { status: A.analysis.status, source: a.source, category: a.category, error: a.error });
  const rA = await routesOf(A.id);
  check('routing: Sports Secretary primary + General Secretary copy', rA.length === 2 && rA.some((r) => r.post === 'sports_secretary' && r.kind === 'primary') && rA.some((r) => r.post === 'general_secretary' && r.kind === 'copy'), rA.map((r) => r.kind + ':' + r.post));
  const cA = await row(A.id);
  check('trigger: client-forged AI fields ignored; hide-name saved from the reporter\'s choice', cA.ai_category === 'sports' && cA.summary_en !== 'forged by client' && cA.hide_name_from_union === true);
  const Bx = await file(st, 'ZZ TEST harassment', 'A senior student keeps harassing and threatening me near the hostel every evening.', { hideName: true });
  const rB = await routesOf(Bx.id);
  check('routing: sensitive → Head only', Bx.analysis.json?.is_sensitive === true && rB.length === 1 && rB[0].post === 'head');
  const C = await file(st, 'ZZ TEST hmm', 'hello there');
  check('routing: low confidence → needs_review, no routes', (await row(C.id)).status === 'needs_review' && (await routesOf(C.id)).length === 0);
  const E = await file(st2, 'ZZ TEST cricket nets', 'The cricket practice nets are torn and the cricket pitch roller is missing.');
  const D = await file(st2, 'ZZ TEST football ground again', 'The football ground goalposts are broken and the sports equipment room is locked during practice time.');
  check('duplicates: D flagged as a possible duplicate of A', (await row(D.id)).possible_duplicate_of === A.id);

  // ── 3. notifications ──
  check('notifications: reporter, Sports + General Secretary on routing; Head only on B', (await notes(st.id, A.id)).length === 1 && (await notes(sports.id, A.id)).length === 1 && (await notes(gs.id, A.id)).length === 1 && (await notes(gs.id, Bx.id)).length === 0);
  for (let i = 0; i < 20 && !live.some((n) => n.complaint_id === A.id); i++) await sleep(500);
  check('realtime: Sports Secretary received the notification live', live.some((n) => n.complaint_id === A.id));

  // ── 4. "routed to my post" and hide-name ──
  check('rules: Sports Secretary reads A, not B or E', await sees(sports, A.id) && !(await sees(sports, Bx.id)) && !(await sees(sports, E.id)));
  check('rules: Head reads B, not A; unrelated department sees none', await sees(head, Bx.id) && !(await sees(head, A.id)) && (must(await dept.client.from('complaints').select('id').in('id', complaints), 'sel')).length === 0);
  check('hide-name: union posts cannot read the reporter of A; the Head (non-union) can read the reporter of B', !(await seesProfile(sports, st.id)) && !(await seesProfile(gs, st.id)) && await seesProfile(head, st.id));
  check('hide-name control: General Secretary can read reporter B (name not hidden on E)', await seesProfile(gs, st2.id));
  check('hide-name API: ID card refused to the Sports Secretary', (await api('/api/id-card/view?userId=' + st.id, sports)).status === 403);
  check('rules: match_duplicates() not callable by users; students cannot read ai_logs', !!(await st.client.rpc('match_duplicates', { p_complaint_id: A.id, p_limit: 1 })).error && (must(await st.client.from('ai_logs').select('id'), 'sel')).length === 0);
  await sports.client.from('complaints').update({ priority: 4, summary_en: 'tampered', hide_name_from_union: false }).eq('id', A.id);
  const cA2 = await row(A.id);
  check('trigger: an official cannot change AI or privacy fields', cA2.priority === 3 && cA2.summary_en !== 'tampered' && cA2.hide_name_from_union === true);

  // ── 5. route tracker, replies, resolve, reopen, confirm ──
  check('tracker: delivered, nothing seen yet', rA.every((r) => !!r.delivered_at && !r.seen_at));
  check('tracker: seen when the post opens it', (await api('/api/complaints/seen', sports, 'POST', { complaintId: A.id })).json?.marked === 1);
  const reply = await api('/api/complaints/replies', sports, 'POST', { complaintId: A.id, body: 'We will fix the goalposts this week.', visibility: 'public' });
  const note = await api('/api/complaints/replies', gs, 'POST', { complaintId: A.id, body: 'Internal: check the storeroom key.', visibility: 'internal' });
  check('replies: public reply and internal note saved', reply.status === 200 && note.status === 200, reply.json?.error || note.json?.error);
  check('tracker: reply marks the post replied', !!(await routesOf(A.id)).find((r) => r.post === 'sports_secretary').replied_at);
  check('rules: reporter sees the public reply only; the post sees both',
    (must(await st.client.from('complaint_replies').select('id').eq('complaint_id', A.id), 'sel')).length === 1 && (must(await sports.client.from('complaint_replies').select('id').eq('complaint_id', A.id), 'sel')).length === 2);
  check('resolve: a copied post cannot resolve (403)', (await api('/api/complaints/update-status', gs, 'POST', { complaintId: A.id, status: 'resolved', remark: 'Not my post to resolve' })).status === 403);
  await api('/api/complaints/update-status', sports, 'POST', { complaintId: A.id, status: 'resolved', remark: 'Goalposts repaired.' });
  check('resolve: primary post resolves, checkpoint set', (await row(A.id)).status === 'resolved' && !!(await routesOf(A.id)).find((r) => r.kind === 'primary').resolved_at);
  const reopen = await api('/api/complaints/confirm', st, 'POST', { complaintId: A.id, action: 'reopen', note: 'The left goalpost is still loose.' });
  check('reopen: back to submitted, checkpoints cleared', reopen.status === 200 && (await row(A.id)).status === 'submitted' && (await routesOf(A.id)).every((r) => !r.resolved_at));
  await api('/api/complaints/update-status', sports, 'POST', { complaintId: A.id, status: 'resolved', remark: 'Left goalpost fixed too.' });
  const confirm = await api('/api/complaints/confirm', st, 'POST', { complaintId: A.id, action: 'confirm' });
  const cA3 = await row(A.id);
  check('confirm: closed with closed_at', confirm.status === 200 && cA3.status === 'closed' && !!cA3.closed_at);

  // ── 6. admin: review queue, duplicates, routing editor, statistics ──
  const routed = await api('/api/admin/route-complaint', admin, 'POST', { complaintId: C.id, category: 'general' });
  const rC = (await routesOf(C.id)).map((r) => r.kind + ':' + r.post);
  check('review: routed by hand as general → General Secretary + Vice-President', routed.status === 200 && rC.includes('primary:general_secretary') && rC.includes('copy:vice_president') && (await row(C.id)).human_edited);
  const merge = await api('/api/admin/merge', admin, 'POST', { complaintId: D.id });
  check('duplicates: merge D into A', merge.status === 200 && (await row(D.id)).duplicate_of === A.id);
  await api('/api/complaints/replies', sports, 'POST', { complaintId: A.id, body: 'Thanks, closing this out.', visibility: 'public' });
  check('duplicates: reporter of D now gets updates on A', (await notes(st2.id, A.id)).length >= 1);
  const rg = await api('/api/admin/routing', admin);
  check('routing editor: 12 posts, 20 rules', rg.status === 200 && rg.json.authorities.length === 12 && rg.json.rules.length === 20);
  musicRule = rg.json.rules.find((r) => r.category === 'music');
  check('routing editor: invalid hours rejected', (await api('/api/admin/routing', admin, 'PUT', { authorities: [], rules: [{ ...musicRule, response_hours: 0 }] })).status === 400);
  const put = await api('/api/admin/routing', admin, 'PUT', { authorities: [], rules: [{ ...musicRule, response_hours: musicRule.response_hours + 1 }] });
  check('routing editor: save works', put.status === 200 && put.json.rules.find((r) => r.category === 'music').response_hours === musicRule.response_hours + 1);
  check('routing editor: non-admin gets 403', (await api('/api/admin/routing', gs)).status === 403);
  const stats = await api('/api/admin/stats', admin);
  check('statistics: the admin gets totals; others 403', stats.status === 200 && stats.json.total >= 5 && stats.json.prdInstalled && (await api('/api/admin/stats', head)).status === 403);
  await sports.client.removeAllChannels();
} catch (e) {
  fails++;
  console.log('ERROR', e.message);
} finally {
  await cleanup();
  console.log(`\n${fails ? fails + ' failure(s)' : 'all checks passed'}`);
  process.exit(fails ? 1 : 0);
}
