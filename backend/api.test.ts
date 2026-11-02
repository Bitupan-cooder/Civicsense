// Exercise the real request handler with a mock Supabase HTTP boundary. Never uses .env.local or a live account.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://database.example.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';
delete process.env.GEMINI_API_KEY;
delete process.env.CRON_SECRET;
const originalFetch = globalThis.fetch;
let tables: Record<string, any[]>;
let failRoutes = false;
let writes: { table: string; method: string; body: any }[];
function reset() {
  failRoutes = false; writes = [];
  tables = {
    profiles: [{ id: 'student-a', role: 'student', is_active: true, email: 'student@example.test' }, { id: 'admin-a', role: 'administration', is_active: true, email: 'admin@example.test' }],
    complaints: [], complaint_routes: [], complaint_evidence: [], complaint_status_history: [], activity_log: [], ai_logs: [], notifications: [], complaint_replies: [],
    authorities: [{ id: 'head', post_key: 'head', post_title: 'Head', active: true }, { id: 'sports', post_key: 'sports', post_title: 'Sports Secretary', active: true }, { id: 'gs', post_key: 'general_secretary', post_title: 'General Secretary', active: true }],
    routing_rules: [{ category: 'sports', primary_authority_id: 'sports', copy_authority_ids: ['gs'], active: true }, { category: 'other', primary_authority_id: 'head', copy_authority_ids: [], active: true }],
  };
}
reset();
globalThis.fetch = (async (input: string | URL | Request, init: any = {}) => {
  const url = new URL(String(input));
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
    if (['select', 'order', 'limit', 'on_conflict', 'or'].includes(key)) return true;
    if (value.startsWith('eq.')) return String(row[key]) === value.slice(3);
    if (value.startsWith('neq.')) return String(row[key]) !== value.slice(4);
    if (value.startsWith('not.in.')) return !value.slice(8, -1).split(',').includes(String(row[key]));
    if (value.startsWith('in.')) return value.slice(4, -1).split(',').includes(String(row[key]));
    return true;
  });
  if (method !== 'GET') writes.push({ table, method, body: structuredClone(body) });
  if (failRoutes && table === 'complaint_routes' && method === 'POST') return json({ message: 'Simulated routing outage' }, 500);
  let result: any[] = [];
  if (method === 'GET') result = tables[table].filter(match);
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
const { handleApiRequest } = await import('./api.ts');

async function request(path: string, body: unknown, token: string | null = 'student-token') {
  const req = Readable.from([JSON.stringify(body)]) as IncomingMessage;
  req.url = path; req.method = 'POST'; req.headers = token ? { authorization: `Bearer ${token}` } : {};
  let status = 0, payload = '';
  const res = { writeHead(code: number) { status = code; }, end(value: string) { payload = value; } } as unknown as ServerResponse;
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
