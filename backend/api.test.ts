// Exercise the real request handler with a mock Supabase HTTP boundary. Never uses .env.local or a live account.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createHmac } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://database.example.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';
delete process.env.GEMINI_API_KEY;
delete process.env.CRON_SECRET;
process.env.MOODLE_URL = 'https://moodle.example.test';
process.env.MOODLE_TOKEN = 'moodle-token';
process.env.MOODLE_SECRET = 'moodle-secret';
let moodleCalls: Record<string, string>[] = [];
const originalFetch = globalThis.fetch;
let tables: Record<string, any[]>;
let failRoutes = false;
let failTable: string | null = null;
let writes: { table: string; method: string; body: any }[];
function reset() {
  failRoutes = false; failTable = null; writes = [];
  tables = {
    profiles: [{ id: 'student-a', role: 'student', is_active: true, email: 'student@example.test', name: 'Student A' }, { id: 'student-b', role: 'student', is_active: true, email: 'b@example.test', name: 'Student B' }, { id: 'admin-a', role: 'administration', is_active: true, email: 'admin@example.test' }],
    complaints: [], complaint_routes: [], complaint_evidence: [], complaint_status_history: [], activity_log: [], ai_logs: [], notifications: [], complaint_replies: [],
    chat_links: [], signals: [], signal_supporters: [], error_logs: [], chat_tag_attempts: [],
    authorities: [{ id: 'head', post_key: 'head', post_title: 'Head', active: true, user_id: 'head-official' }, { id: 'sports', post_key: 'sports', post_title: 'Sports Secretary', active: true, user_id: 'sports-official' }, { id: 'gs', post_key: 'general_secretary', post_title: 'General Secretary', active: true }],
    routing_rules: [{ category: 'sports', primary_authority_id: 'sports', copy_authority_ids: ['gs'], active: true }, { category: 'other', primary_authority_id: 'head', copy_authority_ids: [], active: true }],
  };
}
reset();
globalThis.fetch = (async (input: string | URL | Request, init: any = {}) => {
  const url = new URL(String(input));
  if (url.hostname === 'moodle.example.test') {
    const call = Object.fromEntries(new URLSearchParams(String(init.body)));
    moodleCalls.push(call);
    return new Response(JSON.stringify(call.wsfunction === 'core_message_send_instant_messages' ? [{ msgid: 5 }] : { postid: 900 }));
  }
  assert.equal(url.hostname, 'database.example.test', 'No live service calls are allowed in this test.');
  const headers = new Headers(init.headers);
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
  if (url.pathname === '/auth/v1/user') {
    const admin = headers.get('authorization') === 'Bearer admin-token';
    return json({ id: admin ? 'admin-a' : 'student-a', email: admin ? 'admin@example.test' : 'student@example.test' });
  }
  const table = url.pathname.split('/').pop()!;
  assert.ok(table in tables, `Unexpected table ${table}`);
  const method = init.method || 'GET';
  const body = init.body ? JSON.parse(String(init.body)) : null;
  const match = (row: any) => [...url.searchParams].every(([key, value]) => {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'or'].includes(key)) return true;
    if (value.startsWith('eq.')) return String(row[key]) === value.slice(3);
    if (value.startsWith('neq.')) return String(row[key]) !== value.slice(4);
    if (value.startsWith('not.in.')) return !value.slice(8, -1).split(',').includes(String(row[key]));
    if (value.startsWith('in.')) return value.slice(4, -1).split(',').includes(String(row[key]));
    return true;
  });
  if (method !== 'GET') writes.push({ table, method, body: structuredClone(body) });
  if (failRoutes && table === 'complaint_routes' && method === 'POST') return json({ message: 'Simulated routing outage' }, 500);
  if (table === failTable) return json({ message: `Simulated ${table} outage` }, 500);
  if (table === 'signal_supporters' && method === 'POST' && tables.signal_supporters.some((r) => r.signal_id === body.signal_id && r.student_id === body.student_id)) {
    return json({ code: '23505', message: 'duplicate key value violates unique constraint' }, 409);
  }
  let result: any[] = [];
  if (method === 'GET') {
    // pages as PostgREST does (.range() sends offset and limit), so allRows() ends
    const offset = Number(url.searchParams.get('offset') || 0), limit = url.searchParams.get('limit');
    result = tables[table].filter(match).slice(offset, limit ? offset + Number(limit) : undefined);
  }
  if (method === 'POST') {
    for (const row of Array.isArray(body) ? body : [body]) {
      const existing = table === 'complaint_routes' ? tables[table].find((r) => r.complaint_id === row.complaint_id && r.authority_id === row.authority_id) : null;
      const saved = existing ? Object.assign(existing, row) : { id: `test-${tables[table].length + 1}`, created_at: new Date().toISOString(), ...row };
      if (!existing) tables[table].push(saved);
      result.push(saved);
    }
  }
  if (method === 'PATCH') result = tables[table].filter(match).map((r) => Object.assign(r, body));
  if (method === 'DELETE') tables[table] = tables[table].filter((r) => !match(r));
  if (table === 'complaint_routes' && method === 'GET') result = result.map((r) => ({ ...r, authority: tables.authorities.find((a) => a.id === r.authority_id) }));
  return json(headers.get('accept')?.includes('vnd.pgrst.object') ? result[0] ?? null : result);
}) as typeof fetch;
after(() => { globalThis.fetch = originalFetch; });
const { handleApiRequest, handleTag, saveBotMessage } = await import('./api.ts');
const { readLinkToken } = await import('./chat.ts');

async function request(path: string, body: unknown, token: string | null = 'student-token', method = 'POST') {
  const req = Readable.from([JSON.stringify(body)]) as IncomingMessage;
  req.url = path; req.method = method; req.headers = token ? { authorization: `Bearer ${token}` } : {};
  let status = 0, payload = '';
  const res = { req, writeHead(code: number) { status = code; }, end(value: string) { payload = value; } } as unknown as ServerResponse;
  await handleApiRequest(req, res);
  return { status, body: JSON.parse(payload) };
}
const report = { title: 'Football ground needs repair', description: 'The football ground has damaged sports equipment.', category: 'Other', hideName: true, location: 'du_sports_ground' };

test('creation denies anonymous callers and rejects foreign evidence before writing', async () => {
  reset();
  assert.equal((await request('/api/complaints/create', report, null)).status, 403);
  assert.equal((await request('/api/complaints/create', { ...report, evidencePublicIds: ['civicsense/complaint_evidence/someone-else/file'] })).status, 400);
  assert.equal(writes.length, 0);
});
test('a student can file 6 complaints in 24 hours; a 7th, and its evidence upload, is refused', async () => {
  reset();
  for (let i = 0; i < 6; i++) assert.equal((await request('/api/complaints/create', report)).status, 201);
  const seventh = await request('/api/complaints/create', report);
  assert.equal(seventh.status, 429);
  assert.match(seventh.body.error, /6 complaints in the last 24 hours/);
  assert.equal(tables.complaints.length, 6, 'the refused one is not saved');
  assert.equal((await request('/api/cloudinary/sign-upload', { folder: 'civicsense/complaint_evidence' })).status, 429, 'no evidence upload at the cap');
  assert.equal((await request('/api/complaints/create', report, 'admin-token')).status, 403, 'officials cannot file at all');
});

test("evidence viewer signs only the complaint owner's own files, never an ID card or another account's folder", async () => {
  reset();
  const otherFolder = 'civicsense/complaint_evidence/11111111-2222-4333-8444-555555555555/';
  const view = (complaintId: string, publicId: string, token = 'student-token') =>
    request(`/api/complaint-evidence/view?complaintId=${complaintId}&publicId=${encodeURIComponent(publicId)}`, null, token, 'GET');
  // the requester's own complaint, with evidence rows as a direct insert could have written them
  tables.complaints.push({ id: 'c-mine', student_id: 'student-a', visibility: 'administration', status: 'submitted' });
  tables.complaint_evidence.push(
    { id: 'e1', complaint_id: 'c-mine', cloudinary_public_id: 'civicsense/id_cards/someone-elses-card' },
    { id: 'e2', complaint_id: 'c-mine', cloudinary_public_id: otherFolder + 'their-photo' },
    { id: 'e3', complaint_id: 'c-mine', cloudinary_public_id: 'civicsense/complaint_evidence/old-flat-upload' },
  );
  assert.equal((await view('c-mine', 'civicsense/id_cards/someone-elses-card')).status, 403);
  assert.equal((await view('c-mine', otherFolder + 'their-photo')).status, 403);
  assert.equal((await view('c-mine', 'civicsense/complaint_evidence/old-flat-upload')).status, 200, 'older uploads without a per-account folder stay viewable');
  // that file on its real owner's complaint is signed (here for an administrator)
  tables.complaints.push({ id: 'c-theirs', student_id: '11111111-2222-4333-8444-555555555555', visibility: 'administration', status: 'submitted' });
  tables.complaint_evidence.push({ id: 'e4', complaint_id: 'c-theirs', cloudinary_public_id: otherFolder + 'their-photo' });
  assert.equal((await view('c-theirs', otherFolder + 'their-photo', 'admin-token')).status, 200);
});

test('creation saves privacy before analysis and routes without legacy visibility exposure', async () => {
  reset();
  const response = await request('/api/complaints/create', report);
  assert.equal(response.status, 201);
  assert.equal(response.body.analysis.category, 'sports');
  assert.equal(response.body.analysis.needs_review, false);
  const initial = writes.find((w) => w.table === 'complaints' && w.method === 'POST')!.body;
  assert.equal(initial.hide_name_from_union, true);
  assert.equal(initial.visibility, 'administration');
  assert.equal(initial.status, 'needs_review');
  assert.equal(tables.complaints[0].status, 'submitted');
  assert.deepEqual(tables.complaint_routes.map((r) => r.authority_id).sort(), ['gs', 'sports']);
});
test('routing failure returns the saved ticket and leaves a private review case', async () => {
  reset(); failRoutes = true;
  const response = await request('/api/complaints/create', report);
  assert.equal(response.status, 201);
  assert.ok(response.body.id);
  assert.equal(response.body.analysis, null);
  assert.match(response.body.warning, /saved/);
  assert.equal(tables.complaints.length, 1);
  assert.equal(tables.complaints[0].status, 'needs_review');
  assert.equal(tables.complaints[0].visibility, 'administration');
  assert.equal(tables.complaint_routes.length, 0);
});
test('sensitive reports only reach the head and remain hidden from legacy union visibility', async () => {
  reset();
  const response = await request('/api/complaints/create', { ...report, title: 'Harassment near hostel', description: 'A senior is harassing and threatening me near the hostel.' });
  assert.equal(response.status, 201);
  assert.equal(response.body.analysis.is_sensitive, true);
  assert.deepEqual(tables.complaint_routes.map((r) => r.authority_id), ['head']);
  assert.equal(tables.complaints[0].visibility, 'administration');
});
test('maintenance and analysis correction reject student callers', async () => {
  reset();
  assert.equal((await request('/api/admin/maintenance', {})).status, 403);
  assert.equal((await request('/api/admin/edit-analysis', {})).status, 403);
  assert.equal(writes.length, 0);
});
test('official deletion is blocked to preserve historical attribution', async () => {
  reset(); tables.profiles.push({ id: 'official-a', role: 'department', name: 'Example Officer' });
  const result = await request('/api/admin/delete-official', { userId: 'official-a' }, 'admin-token');
  assert.equal(result.status, 409);
  assert.equal(writes.length, 0);
});

test('reassigning makes the complaint visible to the new desk; sensitive complaints never go to DUSU', async () => {
  const { canAccessComplaint } = await import('./access.ts');
  reset();
  tables.profiles.push({ id: 'dusu-a', role: 'social_service', is_active: true, unit_name: 'DUSU Desk' }, { id: 'dept-a', role: 'department', is_active: true, unit_name: 'Electrical' });
  tables.complaints.push(
    { id: 'c-normal', student_id: 'student-a', visibility: 'administration', target_unit_id: null, is_sensitive: false },
    { id: 'c-sensitive', student_id: 'student-a', visibility: 'administration', target_unit_id: null, is_sensitive: true },
  );
  const c = () => tables.complaints.find((x) => x.id === 'c-normal');

  assert.equal((await request('/api/admin/reassign-complaint', { complaintId: 'c-normal', targetUnitId: 'dusu-a' }, 'admin-token')).status, 200);
  assert.equal(c().visibility, 'social_service');
  assert.ok(canAccessComplaint({ id: 'dusu-a', role: 'social_service' }, c()), 'the DUSU desk can now read it');

  assert.equal((await request('/api/admin/reassign-complaint', { complaintId: 'c-normal', targetUnitId: 'dept-a' }, 'admin-token')).status, 200);
  assert.equal(c().visibility, 'department');
  assert.ok(canAccessComplaint({ id: 'dept-a', role: 'department', unit_name: 'Electrical' }, c()), 'the department can now read it');
  assert.ok(!canAccessComplaint({ id: 'dusu-a', role: 'social_service' }, c()), 'and DUSU no longer can');

  const sensitive = await request('/api/admin/reassign-complaint', { complaintId: 'c-sensitive', targetUnitId: 'dusu-a' }, 'admin-token');
  assert.equal(sensitive.status, 400);
  assert.equal(tables.complaints.find((x) => x.id === 'c-sensitive').visibility, 'administration');
  assert.equal((await request('/api/admin/reassign-complaint', { complaintId: 'c-normal', targetUnitId: 'student-b' }, 'admin-token')).status, 400);
});

test('admin corrections preserve safety floors and replace previous recipients', async () => {
  reset();
  const created = await request('/api/complaints/create', report);
  tables.complaints[0].description = 'There are exposed wires and sparks at the sports ground.';
  const response = await request('/api/admin/edit-analysis', { complaintId: created.body.id, category: 'safety', priority: 4 }, 'admin-token');
  assert.equal(response.status, 200);
  assert.equal(tables.complaints[0].priority, 1);
  assert.equal(tables.complaints[0].human_edited, true);
  assert.deepEqual(tables.complaint_routes.map((r) => r.authority_id), ['head']);
});

test('deadline maintenance escalates overdue cases and does not repeat a daily notification', async () => {
  reset();
  tables.routing_rules[0].response_hours = 24;
  tables.routing_rules[0].escalate_to_id = 'gs';
  tables.complaints.push({ id: 'overdue', ai_category: 'sports', student_id: 'student-a', status: 'in_progress', priority: 3, is_sensitive: false, created_at: '2020-01-01T00:00:00Z' });
  tables.complaint_routes.push({ complaint_id: 'overdue', authority_id: 'sports', kind: 'primary' });
  const first = await request('/api/admin/maintenance', {}, 'admin-token');
  assert.equal(first.status, 200);
  assert.equal(first.body.escalated, 1);
  assert.ok(tables.complaint_routes.some((r) => r.authority_id === 'head'));
  const second = await request('/api/admin/maintenance', {}, 'admin-token');
  assert.equal(second.body.escalated, 0);
  assert.equal(tables.activity_log.filter((r) => r.action === 'complaint_escalated').length, 1);
});

// ── Agent tag (signals). Tag user ids differ per test: the in-memory attempt limit lives for the whole process. ──
const tag = (userId: string, text: string, extra: object = {}) => ({
  platform: 'telegram' as const, kind: 'report' as const, chatId: '-100', chatTitle: 'Hostel 3 Boys', messageId: '50', userId, text, botName: 'CivicSenseBot', ...extra,
});
const sportsIssue = 'The football ground has damaged sports equipment near the goal posts.';
const link = (userId: string, student: string) => tables.chat_links.push({ platform: 'telegram', external_user_id: userId, student_id: student });

test('signals: an unlinked tagger gets a private link for their own account and nothing is stored', async () => {
  reset();
  const r = await handleTag(tag('101', sportsIssue));
  assert.match(r.public!, /t\.me\/CivicSenseBot\?start=link/);
  const token = decodeURIComponent(r.private!.match(/link=(\S+)/)![1]);
  assert.deepEqual(readLinkToken(token, 'test-service-key'), { platform: 'telegram', userId: '101' });
  assert.equal(tables.signals.length, 0);
});

test('signals: linking needs a signed-in student and a valid token', async () => {
  reset();
  const r = await handleTag(tag('102', 'hi', { kind: 'private' }));
  const token = decodeURIComponent(r.private!.match(/link=(\S+)/)![1]);
  assert.equal((await request('/api/chat/link', { token }, 'admin-token')).status, 403);
  assert.equal((await request('/api/chat/link', { token: token + 'x' })).status, 400);
  assert.equal((await request('/api/chat/link', { token })).status, 200);
  assert.deepEqual(tables.chat_links.map((l) => [l.external_user_id, l.student_id]), [['102', 'student-a']]);
});

test('signals: a normal issue waits for a second student, then reaches its post', async () => {
  reset(); link('103', 'student-a'); link('104', 'student-b');
  const first = await handleTag(tag('103', sportsIssue));
  assert.match(first.public!, /once one more student confirms/);
  assert.equal(tables.signals.length, 1);
  assert.equal(tables.signals[0].status, 'pending');
  assert.deepEqual(tables.signals[0].authority_ids, ['sports', 'gs']);
  assert.equal(tables.notifications.length, 0);
  await saveBotMessage(first.signalId!, '51');

  assert.match((await handleTag(tag('103', '+1', { kind: 'support', replyToBotMessageId: '51' }))).public!, /already raised/);
  const second = await handleTag(tag('104', '+1', { kind: 'support', replyToBotMessageId: '51' }));
  assert.match(second.public!, /2 students .*Sports Secretary/);
  assert.equal(tables.signals[0].status, 'open');
  assert.deepEqual(tables.notifications.map((n) => n.user_id), ['sports-official']);
});

test('signals: the same issue raised in another group counts as support, not a new signal', async () => {
  reset(); link('105', 'student-a'); link('106', 'student-b');
  await handleTag(tag('105', sportsIssue));
  const again = await handleTag(tag('106', 'Damaged sports equipment at the football ground goal posts.', { chatId: '-200', chatTitle: 'Sports Club' }));
  assert.match(again.public!, /2 students/);
  assert.equal(tables.signals.length, 1);
  assert.equal(tables.signal_supporters.length, 2);
});

test('signals: an open complaint on the same issue is pointed to instead', async () => {
  reset(); link('107', 'student-a');
  tables.complaints.push({ id: 'abcdef12-0000', status: 'in_progress', ai_category: 'sports', is_sensitive: false, title: 'Football ground equipment damaged', description: sportsIssue, summary_en: null, created_at: new Date().toISOString() });
  const r = await handleTag(tag('107', sportsIssue));
  assert.match(r.public!, /already official complaint CS-ABCDEF12 \(in progress\)/);
  assert.equal(tables.signals.length, 0);
});

test('signals: sensitive issues go to the Head only and are answered privately', async () => {
  reset(); link('108', 'student-a');
  const r = await handleTag(tag('108', 'A senior is harassing and threatening me near the hostel.'));
  assert.equal(r.public, undefined);
  assert.match(r.private!, /privately to Head only/);
  assert.equal(tables.signals[0].status, 'open');
  assert.deepEqual(tables.signals[0].authority_ids, ['head']);
  assert.deepEqual(tables.notifications.map((n) => n.user_id), ['head-official']);
});

test('signals: too short or over the daily limit is refused before any AI call', async () => {
  reset(); link('109', 'student-a');
  assert.match((await handleTag(tag('109', 'water'))).public!, /what is wrong and where/);
  const issues = ['Library wifi is down on the first floor reading room.', 'The hostel 3 mess serves stale food every night.', 'Streetlight near the girls hostel gate is not working at night.'];
  for (const text of issues) await handleTag(tag('109', text));
  assert.equal(tables.signals.length, 3);
  const logsBefore = tables.ai_logs.length;
  assert.match((await handleTag(tag('109', 'Classroom 204 projector has been broken for a week.'))).public!, /daily limit/);
  assert.equal(tables.ai_logs.length, logsBefore);
});

test('signals: every tag attempt is counted in the database; the 11th in a day is ignored', async () => {
  reset();
  for (let i = 0; i < 10; i++) assert.ok((await handleTag(tag('555', 'The hostel 2 water tank has been leaking for days.'))).private, 'unlinked: a private link');
  assert.deepEqual(await handleTag(tag('555', 'The hostel 2 water tank has been leaking for days.')), {});
  assert.equal(tables.chat_tag_attempts.length, 11);
  assert.ok(tables.chat_tag_attempts.every((a) => a.platform === 'telegram' && a.chat_user_id === '555'));
});

test('signals: students cannot list them; administration converts one into a routed complaint for the first reporter', async () => {
  reset(); link('110', 'student-a'); link('111', 'student-b');
  await handleTag(tag('110', sportsIssue));
  await handleTag(tag('111', sportsIssue, { chatId: '-300' }));
  assert.equal((await request('/api/signals', null, 'student-token', 'GET')).status, 403);
  const list = await request('/api/signals', null, 'admin-token', 'GET');
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.signals[0].posts, ['Sports Secretary', 'General Secretary']);

  const done = await request('/api/signals/act', { signalId: tables.signals[0].id, action: 'convert' }, 'admin-token');
  assert.equal(done.status, 200);
  assert.equal(done.body.posted, false, 'no bot token in tests: nothing is sent');
  const complaint = tables.complaints.find((c) => c.id === done.body.complaintId);
  assert.equal(complaint.student_id, 'student-a');
  assert.match(complaint.description, /Raised in the Telegram group "Hostel 3 Boys" by 2 students/);
  assert.equal(tables.signals[0].status, 'converted');
  assert.deepEqual(tables.complaint_routes.filter((r) => r.complaint_id === complaint.id).map((r) => r.authority_id).sort(), ['gs', 'sports']);
  assert.ok(tables.notifications.some((n) => n.user_id === 'student-b' && /now official complaint/.test(n.message_en)));
  assert.equal((await request('/api/signals/act', { signalId: tables.signals[0].id, action: 'dismiss' }, 'admin-token')).status, 409);
});

test('moodle: the endpoint needs a valid signature; a tagged forum post is answered in Moodle', async () => {
  reset(); moodleCalls = [];
  const send = async (payload: object, secret = 'moodle-secret') => {
    const body = JSON.stringify(payload), time = String(Math.floor(Date.now() / 1000));
    const req = Readable.from([body]) as IncomingMessage;
    req.url = '/api/chat/moodle'; req.method = 'POST';
    req.headers = { 'x-civicsense-time': time, 'x-civicsense-signature': createHmac('sha256', secret).update(`${time}.${body}`).digest('hex') };
    let status = 0;
    await handleApiRequest(req, { writeHead(code: number) { status = code; }, end() {} } as unknown as ServerResponse);
    return status;
  };
  const post = { postid: 90, discussionid: 7, forum: 'Hostel forum', subject: 'Sports', userid: 31, text: '@CivicSense ' + sportsIssue, parentid: null, replytobot: false, parenttext: '' };
  assert.equal(await send(post, 'wrong-secret'), 401);
  assert.equal(moodleCalls.length, 0);

  // unlinked: the link goes as a private Moodle message, and the forum reply says so
  assert.equal(await send(post), 200);
  assert.equal(moodleCalls[0]['messages[0][touserid]'], '31');
  assert.match(moodleCalls[0]['messages[0][text]'], /login\?link=/);
  assert.equal(moodleCalls[1].wsfunction, 'mod_forum_add_discussion_post');
  assert.equal(moodleCalls[1].postid, '90');
  assert.equal(tables.signals.length, 0);

  // linked: a signal from the forum, with the bot's reply remembered so +1 replies to it count
  tables.chat_links.push({ platform: 'moodle', external_user_id: '31', student_id: 'student-a' });
  assert.equal(await send({ ...post, postid: 92 }), 200);
  assert.equal(tables.signals[0].platform, 'moodle');
  assert.equal(tables.signals[0].chat_title, 'Hostel forum: Sports');
  assert.equal(tables.signals[0].bot_message_id, '900');
});

test('system: admin-only model usage, cost, fallback share and latency; a 500 lands in error_logs', async () => {
  reset();
  const now = new Date().toISOString();
  tables.ai_logs.push(
    { step: 'understanding', model: 'gemini-2.5-flash', latency_ms: 800, ok: true, error: null, created_at: now, input_tokens: 1000, output_tokens: 200 },
    { step: 'understanding', model: 'gemini-2.5-flash', latency_ms: 3000, ok: false, error: 'Gemini HTTP 503', created_at: now, input_tokens: null, output_tokens: null },
    { step: 'understanding', model: 'keyword-rules', latency_ms: 1, ok: true, error: null, created_at: now },
    { step: 'translation', model: 'gemini-2.5-flash', latency_ms: 500, ok: true, error: null, created_at: now, input_tokens: 100, output_tokens: 50 },
  );
  process.env.GEMINI_PRICE_INPUT_PER_M = '0.3'; process.env.GEMINI_PRICE_OUTPUT_PER_M = '2.5';
  try {
    assert.equal((await request('/api/admin/system', null, 'student-token', 'GET')).status, 403);
    const { status, body } = await request('/api/admin/system?days=7', null, 'admin-token', 'GET');
    assert.equal(status, 200);
    assert.equal(body.tokensInstalled, true);
    assert.deepEqual([body.ai.calls, body.ai.failed, body.ai.inputTokens, body.ai.outputTokens, body.ai.rulesCalls], [3, 1, 1100, 250, 1]);
    assert.equal(body.ai.rulesShare, 0.5, 'one of two analyses came from the keyword rules');
    assert.ok(Math.abs(body.ai.cost - 0.000955) < 1e-9);
    assert.deepEqual(body.ai.steps.find((s: any) => s.step === 'understanding'), { step: 'understanding', calls: 2, failed: 1, inputTokens: 1000, outputTokens: 200, p50: 3000, p95: 3000 });
    assert.equal(body.ai.daily.length, 7);
    assert.deepEqual([body.ai.daily.at(-1).calls, body.ai.daily.at(-1).failed], [3, 1]);
    assert.equal(body.ai.recentFailures[0].error, 'Gemini HTTP 503');
    assert.deepEqual(body.bots.map((b: any) => [b.platform, b.configured, b.enabled]), [['telegram', false, false], ['discord', false, false], ['moodle', true, true]]);
  } finally {
    delete process.env.GEMINI_PRICE_INPUT_PER_M; delete process.env.GEMINI_PRICE_OUTPUT_PER_M;
  }

  failTable = 'ai_logs';
  assert.equal((await request('/api/admin/system', null, 'admin-token', 'GET')).status, 500);
  await new Promise((r) => setTimeout(r, 20)); // the error write is fire-and-forget
  assert.deepEqual(tables.error_logs.map((e) => [e.method, e.route, e.status]), [['GET', '/api/admin/system', 500]]);
});
