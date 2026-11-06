/**
 * Shared browser client for both pages: Supabase auth, complaints, uploads, calls to /api/*.
 * Supabase Auth with role checks, client-side rate limiting and the forced password change.
 */
import { createClient } from '@supabase/supabase-js';
import { showToast } from './toast';
import type { ActivityLog, OfficialComplaint, Profile } from './admin/console';

// backend/live-test.mjs reads SUPABASE_ANON_KEY from this file.
const SUPABASE_URL = 'https://mdywamyrxuuookaxksyv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_97gBSZ3CLy6r0E3thRZ85Q_b7xyQxj_';

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
export const getClient = () => client;

// ── Types ─────────────────────────────────────────────────────

export interface StudentProfile {
  id?: string;
  name: string;
  email: string;
  /** language complaint summaries and replies are shown in (column added by migration 001) */
  preferred_language?: 'en' | 'as';
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  visibility: string;
  status: string | null;
  created_at: string;
  complaint_evidence?: { cloudinary_public_id: string }[];
  complaint_status_history?: { status: string | null; remark: string | null; created_at: string }[];
}

export interface DepartmentUnit {
  id: string;
  name: string;
  unit_name: string | null;
  role: string;
}

/** One recipient of a complaint and its route tracker checkpoints. */
export interface ComplaintRoute {
  kind: 'primary' | 'copy' | 'escalation';
  post_title: string;
  person_name: string | null;
  delivered_at: string;
  seen_at: string | null;
  replied_at: string | null;
  resolved_at: string | null;
}

/** AI analysis and routing of a complaint (null fields until it has been analysed). */
export interface Routing {
  location_id: string | null;
  duplicate_of: string | null;
  possible_duplicate_of: string | null;
  hide_name_from_union: boolean;
  ai_category: string | null;
  priority: number | null;
  is_sensitive: boolean;
  location_text: string | null;
  summary_en: string | null;
  summary_as: string | null;
  image_findings: string | null;
  confidence: number | null;
  ai_source: string | null;
  human_edited: boolean;
  analysed_at: string | null;
  routes: ComplaintRoute[];
  replies: Reply[];
}

/** A reply (reporter can see it) or an internal note (officials only), stored in both languages when translated. */
export interface Reply {
  id: string;
  visibility: 'public' | 'internal';
  body_original: string;
  body_language: string | null;
  body_en: string | null;
  body_as: string | null;
  created_at: string;
  from: string;
}

export interface AppNotification {
  id: string;
  complaint_id: string | null;
  message_en: string;
  message_as: string | null;
  read: boolean;
  created_at: string;
}

/** What /api/complaints/create returns as `analysis` right after filing. */
export interface Analysis {
  category: string;
  priority: number;
  is_sensitive: boolean;
  location_text: string | null;
  summary_en: string;
  summary_as: string;
  confidence: number;
  source: string;
  needs_review: boolean;
  review_reason: string | null;
  routes: ComplaintRoute[];
}

/** GET /api/admin/stats */
export interface Stats {
  total: number;
  byStatus: Record<string, number>;
  byStatusAll: Record<string, number>;
  byUnit: Record<string, number>;
  byCategory: Record<string, number>;
  byLocation: Record<string, number>;
  byPriority: Record<string, number>;
  averageResolutionHours: number | null;
  resolvedCount: number;
  needsReview: number;
  possibleDuplicates: number;
  prdInstalled: boolean;
}

export interface DuplicateSide {
  id: string;
  title: string;
  description: string;
  summary_en: string | null;
  summary_as: string | null;
  ai_category: string | null;
  location_text: string | null;
  status: string;
  created_at: string;
}

/** GET /api/admin/duplicates */
export interface DuplicatePair {
  complaint: DuplicateSide & { possible_duplicate_of: string; duplicate_score: number | null };
  original: DuplicateSide | null;
  score: number | null;
}

/** GET /api/signals */
export interface Signal {
  id: string;
  platform: 'telegram' | 'discord' | 'moodle';
  chat_title: string | null;
  text: string;
  summary_en: string | null;
  summary_as: string | null;
  ai_category: string;
  priority: number;
  is_sensitive: boolean;
  location_text: string | null;
  status: 'pending' | 'open' | 'acknowledged' | 'converted' | 'dismissed';
  complaint_id: string | null;
  handled_note: string | null;
  created_at: string;
  supporters: number;
  posts: string[];
}

export interface Authority {
  id: string;
  post_key: string;
  post_title: string;
  person_name: string | null;
  level: number;
  is_union: boolean;
  email: string | null;
  active: boolean;
}

export interface RoutingRule {
  category: string;
  primary_authority_id: string;
  copy_authority_ids: string[];
  escalate_to_id: string | null;
  response_hours: number;
  active: boolean;
}

/** GET / PUT /api/admin/routing */
export interface RoutingConfig {
  authorities: Authority[];
  rules: RoutingRule[];
  categories?: string[];
}

// ── Rate limiter (per email, in localStorage) ─────────────────

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const rateKey = (email: string) => 'civic_ratelimit_' + (email || 'global').toLowerCase().trim();
interface RateState { count: number; lockedUntil: number; lastAttempt?: number }

function getRateLimitState(email: string): RateState {
  try {
    const raw = localStorage.getItem(rateKey(email));
    if (!raw) return { count: 0, lockedUntil: 0 };
    const data = JSON.parse(raw) as RateState;
    if (data.lockedUntil && Date.now() > data.lockedUntil) {
      localStorage.removeItem(rateKey(email));
      return { count: 0, lockedUntil: 0 };
    }
    return data;
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

function recordFailedAttempt(email: string) {
  try {
    const state = getRateLimitState(email);
    const now = Date.now();
    state.count = (state.count || 0) + 1;
    state.lastAttempt = now;
    if (state.count >= MAX_FAILED_ATTEMPTS) state.lockedUntil = now + LOCKOUT_DURATION_MS;
    localStorage.setItem(rateKey(email), JSON.stringify(state));
  } catch { /* storage unavailable */ }
}

function clearRateLimit(email: string) {
  try { localStorage.removeItem(rateKey(email)); } catch { /* storage unavailable */ }
}

/** Throws while the email is locked out. */
function assertNotLocked(email: string) {
  const state = getRateLimitState(email);
  if (state.lockedUntil && state.lockedUntil > Date.now()) {
    const remainingMin = Math.ceil((state.lockedUntil - Date.now()) / 60000);
    throw new Error('Too many failed login attempts. Account temporarily locked for ' + remainingMin + ' minute(s).');
  }
}

// ── Helpers ───────────────────────────────────────────────────

async function getSession() {
  return (await client.auth.getSession()).data.session;
}

/** Best-effort audit row; never blocks the action it records. */
async function logActivity(actorId: string, action: string, target: string) {
  try { await client.from('activity_log').insert({ actor_id: actorId, action, target }); } catch { /* non-blocking */ }
}

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  if (!session) throw new Error('You must be signed in to do this.');
  return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, { method, headers: await authHeaders(), body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || 'Request failed.'), { notInstalled: !!json.notInstalled });
  return json as T;
}
const getJson = <T>(path: string) => request<T>('GET', path);
const postJson = <T>(path: string, body: unknown) => request<T>('POST', path, body);

// ── Auth ──────────────────────────────────────────────────────

async function fetchProfile(userId: string): Promise<Profile | null> {
  const res = await client.from('profiles')
    .select('id, role, name, email, unit_name, must_change_password, is_active, created_at')
    .eq('id', userId).maybeSingle();
  if (res.error) {
    console.error('Failed to load profile:', res.error);
    return null;
  }
  return res.data;
}

export async function login(email: string, password: string, expectedRoles: string[]) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  assertNotLocked(normalizedEmail);

  const auth = await client.auth.signInWithPassword({ email: normalizedEmail, password });
  if (auth.error) {
    recordFailedAttempt(normalizedEmail);
    throw new Error(auth.error.message || 'Invalid email or password.');
  }

  const user = auth.data.user;
  const profile = await fetchProfile(user.id);
  const refuse = async (message: string) => {
    recordFailedAttempt(normalizedEmail);
    await client.auth.signOut();
    throw new Error(message);
  };
  if (!profile) return refuse('Your sign-in is valid, but student setup is incomplete. Choose “Register with ID”, enter the same email and password, and upload your student ID to finish setup.');
  if (!profile.is_active) return refuse('This account has been deactivated by the administration.');
  if (expectedRoles.length > 0 && !expectedRoles.includes(profile.role)) {
    return refuse('Unauthorized role access. This portal requires: ' + expectedRoles.join(' or ') + '.');
  }

  clearRateLimit(normalizedEmail);
  await logActivity(user.id, 'user_login', profile.role + ' login via ' + window.location.pathname);
  return { user, profile, session: auth.data.session };
}

export const loginStudent = (email: string, password: string) => login(email, password, ['student']);

export async function logout() {
  await client.auth.signOut();
}

export async function requestOfficialPasswordReset(email: string): Promise<void> {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail) throw new Error('Enter your official email address first.');
  const { error } = await client.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${window.location.origin}/admin?password-reset=1`,
  });
  if (error) {
    console.warn('Official password reset email could not be sent:', error.message);
    throw new Error('We could not send a reset email right now. Check the address and try again.');
  }
}

async function changePassword(newPassword: string) {
  if (!newPassword || newPassword.length < 8) throw new Error('Password must be at least 8 characters long.');
  const update = await client.auth.updateUser({ password: newPassword });
  if (update.error) throw new Error(update.error.message);

  const user = update.data.user;
  const profileRes = await client.from('profiles')
    .update({ must_change_password: false, updated_at: new Date().toISOString() })
    .eq('id', user.id);
  if (profileRes.error) console.warn('Could not reset must_change_password flag:', profileRes.error);
  await logActivity(user.id, 'password_change', 'Official password updated by account holder');
}

/** Blocking dialog for officials still on the temporary password the administration gave them. */
export function ensurePasswordChangeModal(recovery = false) {
  const existing = document.getElementById('forcePasswordModal');
  if (existing) return existing;

  const modal = document.createElement('div');
  modal.id = 'forcePasswordModal';
  modal.style.cssText =
    'position:fixed;inset:0;z-index:99999;background:rgba(18,20,16,0.7);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;';

  modal.innerHTML =
    '<div style="background:#ffffff;border:1.5px solid #1a7a3a;border-radius:16px;max-width:460px;width:100%;box-shadow:0 20px 40px rgba(0,0,0,0.2);overflow:hidden;">' +
    '  <div style="background:#1a7a3a;color:#ffffff;padding:16px 20px;font-weight:700;font-size:15px;letter-spacing:-0.01em;">' +
    '    ' + (recovery ? 'Reset Your Official Password' : 'Security Notice: Set Permanent Password') +
    '  </div>' +
    '  <div style="padding:22px 20px;">' +
    '    <p style="font-size:13px;color:#334155;line-height:1.5;margin-bottom:16px;">' +
    '      ' + (recovery
      ? 'Choose a new password for your official account to finish the reset and return to the console.'
      : 'Your account was provisioned with a temporary password by administration. You must set a personal password before accessing campus records.') +
    '    </p>' +
    '    <div style="margin-bottom:14px;">' +
    '      <label style="display:block;font-size:12px;font-weight:700;color:#1a7a3a;margin-bottom:6px;text-transform:uppercase;">New Password</label>' +
    '      <input type="password" id="forceNewPw" placeholder="Minimum 8 characters" style="width:100%;height:40px;padding:0 12px;border:1.5px solid #e0f0d0;border-radius:8px;font-size:13.5px;box-sizing:border-box;" />' +
    '    </div>' +
    '    <div style="margin-bottom:16px;">' +
    '      <label style="display:block;font-size:12px;font-weight:700;color:#1a7a3a;margin-bottom:6px;text-transform:uppercase;">Confirm New Password</label>' +
    '      <input type="password" id="forceConfirmPw" placeholder="Re-enter password" style="width:100%;height:40px;padding:0 12px;border:1.5px solid #e0f0d0;border-radius:8px;font-size:13.5px;box-sizing:border-box;" />' +
    '    </div>' +
    '    <div id="forcePwError" style="display:none;color:#b91c1c;font-size:12px;font-weight:600;margin-bottom:14px;"></div>' +
    '    <button id="forcePwSubmitBtn" style="width:100%;height:42px;background:#1a7a3a;color:#ffffff;border:none;border-radius:8px;font-size:13.5px;font-weight:700;cursor:pointer;">' +
    '      ' + (recovery ? 'Save New Password and Continue' : 'Update Password and Continue') +
    '    </button>' +
    '  </div>' +
    '</div>';

  document.body.appendChild(modal);

  const btn = modal.querySelector<HTMLButtonElement>('#forcePwSubmitBtn')!;
  const errBox = modal.querySelector<HTMLElement>('#forcePwError')!;
  const showError = (message: string) => { errBox.style.display = 'block'; errBox.textContent = message; };
  btn.onclick = async () => {
    const p1 = modal.querySelector<HTMLInputElement>('#forceNewPw')!.value;
    const p2 = modal.querySelector<HTMLInputElement>('#forceConfirmPw')!.value;
    if (!p1 || p1.length < 8) return showError('Password must be at least 8 characters long.');
    if (p1 !== p2) return showError('Passwords do not match.');

    btn.disabled = true;
    btn.textContent = 'Updating password...';
    errBox.style.display = 'none';
    try {
      await changePassword(p1);
      modal.remove();
      if (recovery) {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('password-reset');
        window.history.replaceState(window.history.state, '', cleanUrl.pathname + cleanUrl.search);
      }
      showToast('Password updated successfully.', 'success');
    } catch (err) {
      btn.disabled = false;
      btn.textContent = recovery ? 'Save New Password and Continue' : 'Update Password and Continue';
      showError((err as Error).message || 'Failed to update password.');
    }
  };
  return modal;
}

// ── Uploads (Cloudinary, authenticated delivery) ──────────────

/** Signs with the server, then uploads straight to Cloudinary. `folder` unset = the student ID-card folder. */
async function uploadToCloudinary(file: File, folder?: string) {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error(folder ? 'Evidence file size exceeds the 5 MB limit.' : 'ID card file size exceeds the 5 MB limit. Please select a file under 5 MB.');
  }
  const sign = await postJson<{ apiKey: string; timestamp: string; signature: string; folder: string; type: string; cloudName: string }>(
    '/api/cloudinary/sign-upload', folder ? { folder } : {});

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sign.apiKey);
  form.append('timestamp', sign.timestamp);
  form.append('signature', sign.signature);
  form.append('folder', sign.folder);
  form.append('type', sign.type);

  const res = await fetch('https://api.cloudinary.com/v1_1/' + sign.cloudName + '/auto/upload', { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message || (folder ? 'Failed to upload evidence file.' : 'Failed to upload ID card to storage.'));
  return { public_id: json.public_id as string, format: json.format as string };
}

function uploadIdCard(file: File) {
  if (!file) throw new Error('Student ID card file is required.');
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowed.includes(file.type) && !/\.(jpg|jpeg|png|webp|pdf)$/i.test(file.name)) {
    throw new Error('Invalid file format. Only JPG, PNG, WEBP, or PDF student ID cards are accepted.');
  }
  return uploadToCloudinary(file);
}

// ── Student ───────────────────────────────────────────────────

export async function signUpStudent(options: { name: string; email: string; password: string; file: File }) {
  const name = (options.name || '').trim();
  const email = (options.email || '').trim().toLowerCase();
  const password = options.password || '';
  const file = options.file;

  if (!name || name.length < 2) throw new Error('Please enter your full name as printed on your university ID.');
  if (!email || !email.includes('@')) throw new Error('Please enter a valid student email address.');
  if (!password || password.length < 8) throw new Error('Password must be at least 8 characters long.');
  if (!file) throw new Error('Please attach your student ID card image or PDF (max 5 MB).');

  const rateId = 'signup_' + email;
  assertNotLocked(rateId);

  // 1. Sign up with Supabase Auth (the upload signature below requires a signed-in session)
  const authRes = await client.auth.signUp({ email, password, options: { data: { name, role: 'student' } } });
  let user = authRes.data.user;
  let session = authRes.data.session;
  const alreadyRegistered = !!(authRes.error && /already registered|already exists|user_already_exists/i.test(authRes.error.message || ''))
    || !!(user && Array.isArray(user.identities) && user.identities.length === 0);
  if (authRes.error && !alreadyRegistered) {
    recordFailedAttempt(rateId);
    throw new Error(authRes.error.message);
  }

  // Supabase Auth can retain an account even when an earlier ID upload/profile insert failed.
  // Recover only after the person proves account ownership with that account's password.
  if (alreadyRegistered) {
    const recovery = await client.auth.signInWithPassword({ email, password });
    if (recovery.error || !recovery.data?.user || !recovery.data?.session) {
      recordFailedAttempt(rateId);
      throw new Error('This email already has an account. Switch to Sign In and use its existing password; if you have forgotten it, contact university administration.');
    }
    user = recovery.data.user;
    session = recovery.data.session;
  }

  if (!user) throw new Error('Registration failed. Please try again.');
  if (!session) {
    // Email confirmation is on: profile and ID card rows need a session (RLS), so they can't be created yet.
    throw new Error('Account created, but no session was returned because email confirmation is enabled in Supabase. Registration needs "Confirm email" turned off (Supabase -> Authentication -> Providers -> Email).');
  }

  const profileCheck = await client.from('profiles').select('id, role, name, email, is_active').eq('id', user.id).maybeSingle();
  if (profileCheck.error) throw new Error('Could not check your student setup: ' + profileCheck.error.message);
  if (profileCheck.data && (profileCheck.data.role !== 'student' || !profileCheck.data.is_active)) {
    await client.auth.signOut();
    throw new Error('This email belongs to a non-student or inactive account. Contact university administration.');
  }
  if (profileCheck.data) {
    const cardCheck = await client.from('id_cards').select('id').eq('user_id', user.id).maybeSingle();
    if (cardCheck.error) throw new Error('Could not check your ID-card status: ' + cardCheck.error.message);
    if (cardCheck.data) {
      await client.auth.signOut();
      throw new Error('Student setup is already complete. Switch to Sign In to use your account.');
    }
  }

  // 2. Upload the ID card
  const { public_id } = await uploadIdCard(file);

  // 3. Profile row
  if (!profileCheck.data) {
    const profileRes = await client.from('profiles').insert({
      id: user.id, role: 'student', name, email, unit_name: null, must_change_password: false, is_active: true,
    });
    if (profileRes.error) throw new Error('Your ID was uploaded, but student setup could not be completed: ' + profileRes.error.message + '. Use Register with ID again to resume.');
  }

  // 4. ID card row (only the public_id is stored)
  const idCardRes = await client.from('id_cards').insert({ user_id: user.id, cloudinary_public_id: public_id, status: 'pending' });
  if (idCardRes.error) throw new Error('Your student profile is saved, but the ID card could not be linked: ' + idCardRes.error.message + '. Use Register with ID again to resume.');

  await logActivity(user.id, 'student_signup', 'Student registration with ID card verification pending');
  clearRateLimit(rateId);
  return { user, public_id, profile: profileCheck.data || { id: user.id, role: 'student', name, email, is_active: true } };
}

export async function reuploadIdCard(file: File) {
  const session = await getSession();
  if (!session) throw new Error('You must be signed in to re-upload your student ID card.');

  const upload = await uploadIdCard(file);
  const res = await client.from('id_cards')
    .update({ cloudinary_public_id: upload.public_id, status: 'pending', reviewed_by: null, reviewed_at: null, updated_at: new Date().toISOString() })
    .eq('user_id', session.user.id);
  if (res.error) throw new Error(res.error.message || 'Failed to update ID card record.');

  await logActivity(session.user.id, 'id_card_reupload', 'Student re-uploaded ID card after previous invalid mark');
  return upload;
}

export async function submitStudentComplaint(options: {
  title: string; description: string; visibility: string; targetUnitId: string | null;
  evidenceFiles: File[]; location: string | null; hideName: boolean;
}) {
  const session = await getSession();
  if (!session) throw new Error('You must be signed in with your student account to submit a complaint.');

  const title = (options.title || '').trim();
  const description = (options.description || '').trim();
  if (title.length < 5) throw new Error('Please enter a descriptive complaint title (minimum 5 characters).');
  if (description.length < 8) throw new Error('Please describe the issue in detail (minimum 8 characters).');

  const evidencePublicIds: string[] = [];
  for (const file of options.evidenceFiles || []) {
    evidencePublicIds.push((await uploadToCloudinary(file, 'civicsense/complaint_evidence')).public_id);
  }

  // Save privacy and routing through the authenticated server before exposing the report.
  return postJson<{ id: string; analysis: Analysis | null; warning?: string }>('/api/complaints/create', {
    title, description, location: options.location || null, hideName: !!options.hideName, evidencePublicIds,
  });
}

const COMPLAINT_FIELDS = 'id, student_id, title, description, category, visibility, target_unit_id, status, created_at, updated_at, complaint_evidence(id, complaint_id, cloudinary_public_id, created_at), complaint_status_history(id, complaint_id, status, remark, changed_by, created_at)';

export async function fetchStudentComplaints(): Promise<Complaint[]> {
  const session = await getSession();
  if (!session) return [];
  const res = await client.from('complaints').select(COMPLAINT_FIELDS)
    .eq('student_id', session.user.id).order('created_at', { ascending: false });
  if (res.error) throw new Error(res.error.message || 'Failed to fetch complaints list.');
  return res.data || [];
}

/** By full UUID or by short reference "CS-E703D748" (the first 8 hex digits of the UUID). */
export async function fetchComplaintById(complaintId: string): Promise<Complaint | null> {
  const cleanId = (complaintId || '').trim();
  if (!cleanId) return null;

  let query = client.from('complaints').select(COMPLAINT_FIELDS);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId)) {
    query = query.eq('id', cleanId);
  } else {
    // `id` is a uuid column, so ilike (text matching) fails in Postgres; match the prefix as a UUID range instead.
    const prefix = cleanId.replace(/^CS-?/i, '').toLowerCase();
    if (!/^[0-9a-f]{1,8}$/.test(prefix)) return null;
    const pad = (ch: string) => (prefix + ch.repeat(8)).slice(0, 8);
    query = query.gte('id', pad('0') + '-0000-0000-0000-000000000000').lte('id', pad('f') + '-ffff-ffff-ffff-ffffffffffff');
  }

  const res = await query.maybeSingle();
  if (res.error) {
    console.error('Failed to query complaint:', res.error);
    return null;
  }
  return res.data;
}

export async function fetchDepartmentUnits(): Promise<DepartmentUnit[]> {
  const res = await client.from('profiles').select('id, name, unit_name, role')
    .in('role', ['department', 'social_service']).eq('is_active', true).order('name', { ascending: true });
  if (!res.error && res.data && res.data.length > 0) return res.data;

  const fallback = await fetch('/api/department-units');
  return fallback.ok ? (await fallback.json()).units || [] : [];
}

export const getViewableEvidenceUrl = (complaintId: string, publicId: string) =>
  getJson<{ signedUrl?: string }>('/api/complaint-evidence/view?complaintId=' + encodeURIComponent(complaintId) + '&publicId=' + encodeURIComponent(publicId));

/** Reporter: 'confirm' that a resolved complaint is fixed, or 'reopen' it with a note. */
export const confirmComplaint = (complaintId: string, action: 'confirm' | 'reopen', note?: string) =>
  postJson<{ status: string }>('/api/complaints/confirm', { complaintId, action, note: note || '' });

// ── Officials ─────────────────────────────────────────────────

export async function fetchOfficialComplaints(): Promise<OfficialComplaint[]> {
  if (!(await getSession())) throw new Error('Official login required to load redressal queue.');

  const res = await client.from('complaints').select(`
      id, student_id, title, description, category, visibility, target_unit_id, status, created_at, updated_at,
      student:profiles!student_id(id, name, email),
      target_unit:profiles!target_unit_id(id, name, unit_name),
      evidence:complaint_evidence(id, cloudinary_public_id, created_at),
      history:complaint_status_history(id, status, remark, created_at, changed_by, actor:profiles!changed_by(name, role, unit_name))
    `).order('created_at', { ascending: false });
  if (res.error) {
    console.error('Failed to load official complaints:', res.error);
    throw new Error(res.error.message || 'Failed to retrieve grievances from database.');
  }

  const complaints = (res.data || []) as unknown as OfficialComplaint[];
  // Attach each reporter's ID card.
  const studentIds = [...new Set(complaints.map((c) => c.student_id).filter(Boolean))];
  if (studentIds.length > 0) {
    const cards = await client.from('id_cards')
      .select('id, user_id, cloudinary_public_id, status, reviewed_by, reviewed_at').in('user_id', studentIds);
    if (!cards.error && cards.data) {
      const byUser = new Map(cards.data.map((card) => [card.user_id, card]));
      for (const c of complaints) c.idCard = byUser.get(c.student_id) || null;
    }
  }
  return complaints;
}

export const getViewableIdCardUrl = (userId: string) =>
  getJson<{ signedUrl: string; status?: string }>('/api/id-card/view?userId=' + encodeURIComponent(userId));
export const reviewStudentIdCard = (userId: string, status: string) => postJson('/api/id-card/review', { userId, status });
export const updateComplaintWorkflow = (complaintId: string, status: string | null, remark: string | null, idCardStatus?: string | null) =>
  postJson('/api/complaints/update-status', { complaintId, status: status || null, remark: remark || null, idCardStatus: idCardStatus || null });
export const reassignComplaint = (complaintId: string, targetUnitId: string, remark: string) =>
  postJson('/api/admin/reassign-complaint', { complaintId, targetUnitId, remark });

/** Official: a reply to the reporter ('public') or an internal note ('internal'). */
export const postReply = (complaintId: string, body: string, visibility: 'public' | 'internal') =>
  postJson<{ translated: boolean }>('/api/complaints/replies', { complaintId, body, visibility });

/** Marks the complaint seen for the posts the signed-in official holds (route tracker). */
export async function markComplaintSeen(complaintId: string) {
  try { await postJson('/api/complaints/seen', { complaintId }); } catch { /* best effort */ }
}

// ── Administration ────────────────────────────────────────────

export const fetchAdminOfficials = async () => (await getJson<{ officials?: Profile[] }>('/api/admin/list-officials')).officials || [];
export const createOfficialAccount = (data: { email: string; password: string; name: string; role: string; unitName: string }) =>
  // the API names the password field temporaryPassword
  postJson('/api/admin/create-official', { name: data.name, email: data.email, role: data.role, unitName: data.unitName, temporaryPassword: data.password });
export const editOfficialProfile = (userId: string, name: string, unitName: string) => postJson('/api/admin/edit-official', { userId, name, unitName });
export const toggleOfficialActive = (userId: string, isActive: boolean) => postJson('/api/admin/toggle-active', { userId, isActive });
export const deleteOfficialAccount = (userId: string) => postJson('/api/admin/delete-official', { userId });
export const resetOfficialPassword = (userId: string, newTemporaryPassword: string) => postJson('/api/admin/reset-password', { userId, newTemporaryPassword });
export const fetchActivityLogs = async (limit: number) => (await getJson<{ logs?: ActivityLog[] }>('/api/activity-logs?limit=' + (limit || 100))).logs || [];

/** Dashboard statistics (PRD: by status, category, place; average resolution time). */
export const fetchStats = () => getJson<Stats>('/api/admin/stats');
export const runMaintenance = () => postJson<{ escalated: number }>('/api/admin/maintenance', {});

/** Developer monitoring (/admin/system), shaped by summariseAi() in backend/system.ts. */
export interface SystemReport {
  days: number;
  gemini: boolean;
  tokensInstalled: boolean;
  ai: {
    calls: number; failed: number; inputTokens: number; outputTokens: number; cost: number | null; rulesCalls: number; rulesShare: number | null;
    steps: { step: string; calls: number; failed: number; inputTokens: number; outputTokens: number; p50: number | null; p95: number | null }[];
    models: { model: string; calls: number; inputTokens: number; outputTokens: number }[];
    daily: { day: string; calls: number; failed: number; tokens: number }[];
    recentFailures: { step: string; model: string | null; error: string | null; created_at: string }[];
  };
  complaints: Record<string, number>;
  signals: Record<string, number> | null;
  errors: { total: number; recent: { method: string | null; route: string; status: number; message: string | null; created_at: string }[] } | null;
  bots: { platform: 'telegram' | 'discord' | 'moodle'; configured: boolean; enabled: boolean; connected: boolean | null; lastTagAt: string | null; lastError: string | null }[];
}
export const fetchSystem = (days: 7 | 30) => getJson<SystemReport>(`/api/admin/system?days=${days}`);
export const editAnalysis = (complaintId: string, category: string, priority: number) => postJson('/api/admin/edit-analysis', { complaintId, category, priority });
/** Agent tag: issues raised by tagging the bot in Telegram / Discord groups or Moodle forums. */
export const fetchSignals = () => getJson<{ signals: Signal[] }>('/api/signals');
export const actOnSignal = (signalId: string, action: 'acknowledge' | 'convert' | 'dismiss', note?: string) =>
  postJson<{ complaintId: string | null; posted: boolean }>('/api/signals/act', { signalId, action, note: note || '' });
/** Links the chat account from the bot's private link to the signed-in student. */
export const linkChatAccount = (token: string) => postJson<{ platform: 'telegram' | 'discord' | 'moodle' }>('/api/chat/link', { token });
/** Possible duplicate pairs. */
export const fetchDuplicates = () => getJson<{ pairs: DuplicatePair[] }>('/api/admin/duplicates');
export const mergeComplaint = (complaintId: string, intoId?: string | null) => postJson<{ mergedInto: string }>('/api/admin/merge', { complaintId, intoId: intoId || null });
export const dismissDuplicate = (complaintId: string) => postJson('/api/admin/dismiss-duplicate', { complaintId });
/** Posts and routing rules. */
export const fetchRoutingConfig = () => getJson<RoutingConfig>('/api/admin/routing');
export const saveRoutingConfig = (config: RoutingConfig) => request<RoutingConfig>('PUT', '/api/admin/routing', config);
/** Routes a complaint from the review queue by hand. */
export const routeComplaintByHand = (complaintId: string, category: string) =>
  postJson<{ routes: ComplaintRoute[] }>('/api/admin/route-complaint', { complaintId, category });

// ── PRD AI analysis, routing, notifications ───────────────────
// These never throw for "not set up yet" (migration 001 not run): callers then simply show nothing extra.

let featuresPromise: Promise<{ routing: boolean; gemini: boolean; signals?: boolean }> | null = null;
/** Which PRD features the server has switched on. */
export function fetchFeatures() {
  featuresPromise ??= fetch('/api/features')
    .then((r) => (r.ok ? r.json() : { routing: false, gemini: false }))
    .catch(() => ({ routing: false, gemini: false }));
  return featuresPromise;
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const res = await client.from('notifications').select('id, complaint_id, message_en, message_as, read, created_at')
    .order('created_at', { ascending: false }).limit(30);
  return res.error ? [] : res.data || [];
}

export async function markNotificationsRead(ids: string[]) {
  if (ids.length) await client.from('notifications').update({ read: true }).in('id', ids);
}

let notificationChannelSeq = 0;
/** Live notifications (Supabase Realtime). Returns an unsubscribe function. */
export function subscribeNotifications(userId: string, onInsert: (n: AppNotification) => void) {
  if (!userId) return () => {};
  // unique topic: client.channel() hands back a still-registered channel of the same name (removeChannel is async),
  // and adding callbacks to an already-subscribed channel throws, e.g. when the bell remounts
  const channel = client.channel('notifications-' + userId + '-' + ++notificationChannelSeq)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + userId },
      (payload) => onInsert(payload.new as AppNotification))
    .subscribe();
  return () => { client.removeChannel(channel); };
}

/** The language complaint summaries and replies are shown in. */
export async function setPreferredLanguage(userId: string, lang: 'en' | 'as') {
  await client.from('profiles').update({ preferred_language: lang }).eq('id', userId);
}

/** AI fields and route tracker rows for the given complaints, keyed by complaint id ({} when unavailable). */
export async function fetchRouting(complaintIds: string[]): Promise<Record<string, Routing>> {
  if (!complaintIds?.length) return {};
  const ai = await client.from('complaints')
    .select('id, location_id, duplicate_of, possible_duplicate_of, hide_name_from_union, ai_category, priority, is_sensitive, location_text, summary_en, summary_as, image_findings, confidence, ai_source, input_language, human_edited, analysed_at, resolved_at')
    .in('id', complaintIds);
  if (ai.error) return {};
  const routes = await client.from('complaint_routes')
    .select('complaint_id, kind, delivered_at, seen_at, replied_at, resolved_at, authority:authorities(post_title, person_name)')
    .in('complaint_id', complaintIds);
  const replies = await client.from('complaint_replies')
    .select('id, complaint_id, visibility, body_original, body_language, body_en, body_as, created_at, author:profiles(name), authority:authorities(post_title)')
    .in('complaint_id', complaintIds)
    .order('created_at', { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Row = any; // untyped client: embedded relations come back as objects
  const out: Record<string, Routing> = {};
  for (const row of (ai.data || []) as Row[]) out[row.id] = { ...row, routes: [], replies: [] };
  for (const r of (replies.data || []) as Row[]) {
    out[r.complaint_id]?.replies.push({
      id: r.id, visibility: r.visibility, body_original: r.body_original, body_language: r.body_language, body_en: r.body_en, body_as: r.body_as,
      created_at: r.created_at, from: r.authority?.post_title || r.author?.name || 'University official',
    });
  }
  for (const r of (routes.data || []) as Row[]) {
    out[r.complaint_id]?.routes.push({
      kind: r.kind, delivered_at: r.delivered_at, seen_at: r.seen_at, replied_at: r.replied_at, resolved_at: r.resolved_at,
      post_title: r.authority ? r.authority.post_title : 'Unknown post', person_name: r.authority ? r.authority.person_name : null,
    });
  }
  for (const id in out) out[id].routes.sort((a, b) => (a.kind === 'primary' ? 0 : 1) - (b.kind === 'primary' ? 0 : 1));
  return out;
}
