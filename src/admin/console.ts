// State and actions of the official console (admin.html). Ported from the original admin.html page script.
import { useSyncExternalStore } from 'react';
import type { DepartmentUnit, Routing } from '../civicAuth';
import * as auth from '../civicAuth';
import { showToast } from '../toast';
import { setLanguage } from '../i18n';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'administration' | 'department' | 'social_service' | 'student';
  unit_name: string | null;
  is_active?: boolean;
  must_change_password?: boolean;
  preferred_language?: 'en' | 'as';
}

export interface OfficialComplaint {
  id: string;
  title: string;
  description: string;
  category: string;
  visibility: string;
  status: string;
  created_at: string;
  student_id: string;
  target_unit_id: string | null;
  student?: { name: string; email: string } | null;
  target_unit?: { name: string; unit_name: string | null } | null;
  evidence?: { cloudinary_public_id: string }[];
  history?: { status: string; remark: string | null; created_at: string; actor?: { name: string; role: string; unit_name: string | null } | null }[];
  idCard?: { status: string } | null;
}

export interface ActivityLog {
  created_at: string;
  action: string;
  target: string | null;
  actor?: { name: string; role: string; unit_name: string | null } | null;
}


export type GateRole = 'department' | 'administration' | 'social_service';
export type Section = 'complaints' | 'officials' | 'audit';
export type StatusFilter = 'all' | 'needs_review' | 'submitted' | 'accepted' | 'in_progress' | 'resolved' | 'rejected';
export interface Credentials { name: string; role: string; unit: string; email: string; password: string }

export interface ConsoleState {
  /** 'none': nothing shown (student account, redirecting to the student site). */
  auth: 'loading' | 'gate' | 'workspace' | 'none';
  gateRole: GateRole;
  gateEmail: string;
  gatePassword: string;
  gateError: string;
  gateBusy: boolean;
  profile: Profile | null;

  complaints: OfficialComplaint[];
  /** AI analysis and route tracker per complaint id (empty until migration 001 is run). */
  routing: Record<string, Routing>;
  /** false until the queue has loaded once (KPI cards and unit breakdown stay empty before). */
  loaded: boolean;
  loading: boolean;
  loadError: string | null;
  filter: StatusFilter;
  category: string;
  date: string;
  search: string;

  section: Section;
  /** null while loading */
  officials: Profile[] | null;
  officialsError: string | null;
  logs: ActivityLog[] | null;
  logsError: string | null;
  logFilter: string;

  docketId: string | null;
  idCard: { userId: string; name: string; email: string; loading: boolean; url: string | null; status: string | null; error: string | null } | null;
  workflow: { complaintId: string; status: string } | null;
  reassignId: string | null;
  createOpen: boolean;
  credentials: Credentials | null;
  editOfficial: { id: string; name: string; unit: string } | null;
  resetOfficial: { id: string; name: string; email: string; unit: string } | null;
  /** Bumped whenever a form modal opens, so its fields start fresh (used as React key). */
  formKey: number;
  /** Styled yes/no card in place of the browser's confirm() (see askConfirm). */
  confirm: ConfirmRequest | null;
}

export interface ConfirmRequest { title: string; message: string; confirmLabel: string; danger?: boolean; icon: 'logout' | 'warning' | 'check'; resolve: (ok: boolean) => void }

let state: ConsoleState = {
  auth: 'loading', gateRole: 'department', gateEmail: '', gatePassword: '', gateError: '', gateBusy: false, profile: null,
  complaints: [], routing: {}, loaded: false, loading: false, loadError: null, filter: 'all', category: 'all', date: 'all', search: '',
  section: 'complaints', officials: null, officialsError: null, logs: null, logsError: null, logFilter: 'all',
  docketId: null, idCard: null, workflow: null, reassignId: null, createOpen: false, credentials: null,
  editOfficial: null, resetOfficial: null, formKey: 0, confirm: null,
};
const listeners = new Set<() => void>();

function update(patch: Partial<ConsoleState>): void {
  state = { ...state, ...patch };
  listeners.forEach((notify) => notify());
}

/** Asks in the console's own confirm card: true on the confirm button, false on Cancel, Esc or a click outside. */
export function askConfirm(req: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  state.confirm?.resolve(false);
  return new Promise((resolve) => update({ confirm: { ...req, resolve } }));
}
export function answerConfirm(ok: boolean): void {
  const c = state.confirm;
  update({ confirm: null });
  c?.resolve(ok);
}

export function useConsole(): ConsoleState {
  return useSyncExternalStore(
    (notify) => { listeners.add(notify); return () => { listeners.delete(notify); }; },
    () => state,
  );
}

const errorText = (err: unknown, fallback: string) => (err as Error)?.message || fallback;
export const shortRef = (id: string) => 'CS-' + id.slice(0, 8).toUpperCase();

// ── AUTH ──

async function enterWorkspace(profile: Profile, welcome = false, passwordRecovery = false): Promise<void> {
  update({ auth: 'workspace', profile, section: 'complaints' });
  if (profile.preferred_language) setLanguage(profile.preferred_language, { save: false });
  await loadOfficialComplaints();
  if (welcome) showToast('Welcome, ' + profile.name, 'success');
  if (profile.must_change_password || passwordRecovery) auth.ensurePasswordChangeModal(passwordRecovery);
}

export async function initAuth(): Promise<void> {
  try {
    const passwordRecovery = new URLSearchParams(window.location.search).get('password-reset') === '1';
    const sb = auth.getClient();
    if (!sb) { update({ auth: 'gate' }); return; }
    const session = (await sb.auth.getSession()).data?.session;
    if (!session?.user) { update({ auth: 'gate' }); return; }

    const profile: Profile | null = (await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle()).data;
    if (!profile || !profile.is_active) {
      await sb.auth.signOut();
      update({ auth: 'gate' });
      showToast('Account not authorized or deactivated.', 'error');
      return;
    }
    if (profile.role === 'student') {
      update({ auth: 'none' });
      showToast('Access restricted: Student accounts cannot access the official administrative console.', 'error');
      setTimeout(() => { window.location.href = '/'; }, 1200);
      return;
    }
    await enterWorkspace(profile, false, passwordRecovery);
  } catch {
    update({ auth: 'gate' });
  }
}

export function switchGateRole(gateRole: GateRole): void {
  update({ gateRole, gateError: '' });
}

export function setGateField(field: 'gateEmail' | 'gatePassword', value: string): void {
  update({ [field]: value });
}

export async function gateLogin(): Promise<void> {
  const email = state.gateEmail.trim();
  if (!email || !state.gatePassword) {
    update({ gateError: 'Please enter both your official email and password.' });
    return;
  }
  update({ gateBusy: true, gateError: '' });
  try {
    const { profile } = await auth.login(email, state.gatePassword, ['administration', 'department', 'social_service']);
    update({ gateBusy: false });
    await enterWorkspace(profile, true);
  } catch (err) {
    const message = errorText(err, 'Authentication failed.');
    update({ gateBusy: false, gateError: /invalid login credentials/i.test(message)
      ? 'Email or password is incorrect. Check your details, or use Forgot password to reset it.'
      : message });
  }
}

let signingOut = false; // this tab's own log-out; other tabs' log-outs reach followOtherTabs as SIGNED_OUT too
const leaveWorkspace = () => update({ auth: 'gate', gateEmail: '', gatePassword: '', complaints: [], loaded: false, officials: null, logs: null, profile: null });

export async function logoutAdmin(): Promise<void> {
  if (!(await askConfirm({ title: 'Log out?', message: 'You will leave the Official Redressal Workspace and need to sign in again to continue.', confirmLabel: 'Log out', icon: 'logout' }))) return;
  signingOut = true;
  try { await auth.logout(); } finally { signingOut = false; }
  leaveWorkspace();
  showToast('Logged out of official console.', 'info');
}

/** Tabs of one browser share the sign-in (Supabase tells every tab when it changes): follow another tab's log-out
 *  or sign-in. Runs inside Supabase's auth lock, so Supabase calls are deferred with setTimeout. */
export function followOtherTabs(): void {
  auth.getClient()?.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' && state.auth === 'workspace' && !signingOut) {
      setTimeout(() => { leaveWorkspace(); showToast('You were logged out in another tab.', 'info'); });
    } else if (event === 'SIGNED_IN' && session?.user.id !== state.profile?.id && !state.gateBusy) {
      setTimeout(() => void initAuth());
    }
  });
}

// ── COMPLAINT QUEUE ──

export async function loadOfficialComplaints(): Promise<void> {
  update({ loading: true, loadError: null });
  try {
    const complaints = (await auth.fetchOfficialComplaints()) || [];
    update({ complaints, loaded: true, loading: false });
    update({ routing: await auth.fetchRouting(complaints.map((c) => c.id)) });
  } catch (err) {
    console.error('Failed to load official complaints:', err);
    update({ loading: false, loadError: errorText(err, 'Database connection error.') });
  }
}

export function setQueueFilter(patch: Partial<Pick<ConsoleState, 'filter' | 'category' | 'date' | 'search'>>): void {
  update(patch);
}

const isPending = (c: OfficialComplaint) => c.status === 'submitted' || c.status === 'under_verification';

export function countByFilter(all: OfficialComplaint[], filter: StatusFilter): number {
  return filter === 'all' ? all.length : all.filter((c) => (filter === 'submitted' ? isPending(c) : c.status === filter)).length;
}

export function filteredComplaints(s: ConsoleState): OfficialComplaint[] {
  const now = Date.now();
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const since = s.date === 'today' ? startOfToday : s.date === 'week' ? now - 7 * 86400e3 : s.date === 'month' ? now - 30 * 86400e3 : null;
  const q = s.search.toLowerCase().trim();
  return s.complaints.filter((c) => {
    if (s.category !== 'all' && (c.category || '').toLowerCase() !== s.category.toLowerCase()) return false;
    if (since !== null && new Date(c.created_at).getTime() < since) return false;
    if (s.filter !== 'all' && !(s.filter === 'submitted' ? isPending(c) : c.status === s.filter)) return false;
    if (q) {
      const corpus = [c.id, c.title, c.description, c.category, c.visibility, c.status, c.student?.name ?? '', c.student?.email ?? '', c.target_unit?.unit_name ?? '']
        .join(' ').toLowerCase();
      if (!corpus.includes(q)) return false;
    }
    return true;
  });
}

export function exportAuditCsv(): void {
  if (!state.complaints.length) {
    showToast('No complaint records available to export.', 'warning');
    return;
  }
  const q = (v: string | null | undefined) => '"' + (v || '').replace(/"/g, '""') + '"';
  const headers = ['Ticket ID', 'Title', 'Category', 'Visibility', 'Status', 'Student Name', 'Student Email', 'Assigned Unit', 'Logged Date', 'Description'];
  const rows = state.complaints.map((c) => [
    q(shortRef(c.id)), q(c.title), q(c.category), q(c.visibility), q(c.status), q(c.student?.name), q(c.student?.email),
    q(c.target_unit ? c.target_unit.unit_name || c.target_unit.name : ''), q(new Date(c.created_at).toISOString()), q(c.description),
  ].join(','));
  const link = document.createElement('a');
  link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent([headers.join(','), ...rows].join('\n'));
  link.download = 'civicsense_official_grievance_audit_' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast('Audit CSV exported successfully.', 'success');
}

// ── DOCKET, ID CARD, EVIDENCE ──

export function openDocket(docketId: string): void {
  update({ docketId });
  // route tracker: record that this official's post has seen it, then refresh its checkpoints
  auth.markComplaintSeen(docketId).then(() => refreshRouting(docketId));
}

async function refreshRouting(complaintId: string): Promise<void> {
  const r = await auth.fetchRouting([complaintId]);
  update({ routing: { ...state.routing, ...r } });
}

/** Review queue: the administration routes a complaint by hand, optionally correcting the AI category. */
export async function routeByHand(complaintId: string, category: string): Promise<void> {
  try {
    const res = await auth.routeComplaintByHand(complaintId, category);
    showToast('Complaint routed to ' + res.routes.map((r) => r.post_title).join(', ') + '.', 'success');
    await loadOfficialComplaints();
  } catch (err) {
    showToast(errorText(err, 'Failed to route complaint.'), 'error');
  }
}
export const closeDocket = () => update({ docketId: null });

export async function openIdCard(userId: string, name: string, email: string): Promise<void> {
  update({ idCard: { userId, name, email, loading: true, url: null, status: null, error: null } });
  try {
    const res = await auth.getViewableIdCardUrl(userId);
    if (state.idCard?.userId === userId) update({ idCard: { ...state.idCard, loading: false, url: res.signedUrl, status: res.status || 'pending' } });
  } catch (err) {
    if (state.idCard?.userId === userId) update({ idCard: { ...state.idCard, loading: false, error: errorText(err, 'Failed to load signed ID card from Cloudinary.') } });
  }
}

export const closeIdCard = () => update({ idCard: null });

export async function reviewIdCard(status: 'verified' | 'not_valid', userId = state.idCard?.userId): Promise<void> {
  if (!userId) return;
  try {
    await auth.reviewStudentIdCard(userId, status);
    showToast('Student ID card successfully marked as ' + status.toUpperCase(), 'success');
    update({
      complaints: state.complaints.map((c) => (c.student_id === userId ? { ...c, idCard: { ...c.idCard, status } } : c)),
      idCard: state.idCard?.userId === userId ? { ...state.idCard, status } : state.idCard,
    });
  } catch (err) {
    showToast(errorText(err, 'Failed to update student ID card verification status.'), 'error');
  }
}

export async function viewEvidenceAttachment(complaintId: string, publicId: string): Promise<void> {
  try {
    const res = await auth.getViewableEvidenceUrl(complaintId, publicId);
    if (res?.signedUrl) window.open(res.signedUrl, '_blank', 'noopener,noreferrer');
    else showToast('Unable to open evidence preview URL.', 'error');
  } catch (err) {
    showToast(errorText(err, 'Access denied to complaint evidence file.'), 'error');
  }
}

// ── WORKFLOW & REASSIGNMENT (the open docket refreshes by itself: it reads from `complaints`) ──

export const openWorkflow = (complaintId: string, status: string) => update({ workflow: { complaintId, status }, formKey: state.formKey + 1 });
export const closeWorkflow = () => update({ workflow: null });

/** Throws on failure (the modal shows the message). */
export async function submitWorkflow(remark: string): Promise<void> {
  const w = state.workflow;
  if (!w) return;
  await auth.updateComplaintWorkflow(w.complaintId, w.status, remark || (w.status === 'accepted' ? 'Grievance accepted by department authority.' : null));
  showToast('Complaint #' + w.complaintId.slice(0, 8).toUpperCase() + ' status calibrated to ' + w.status.toUpperCase(), 'success');
  closeWorkflow();
  await loadOfficialComplaints();
}

export const openReassign = (reassignId: string) => update({ reassignId, formKey: state.formKey + 1 });
export const closeReassign = () => update({ reassignId: null });

export async function submitReassign(targetUnitId: string, remark: string): Promise<void> {
  if (!state.reassignId) return;
  await auth.reassignComplaint(state.reassignId, targetUnitId, remark);
  showToast('Complaint reassigned successfully to destination department.', 'success');
  closeReassign();
  await loadOfficialComplaints();
}

export const fetchDepartmentUnits = () => auth.fetchDepartmentUnits();

// ── ADMINISTRATION: SECTIONS, OFFICIAL ACCOUNTS, AUDIT LOG ──

export function switchAdminSection(section: Section): void {
  update({ section });
  if (section === 'officials') loadAdminOfficials();
  else if (section === 'audit') loadActivityLogs();
}

export async function loadAdminOfficials(): Promise<void> {
  update({ officials: null, officialsError: null });
  try {
    update({ officials: (await auth.fetchAdminOfficials()) || [] });
  } catch (err) {
    update({ officials: [], officialsError: errorText(err, 'Server error.') });
  }
}

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
export function generateRandomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint32Array(9));
  return 'DU-' + Array.from(bytes, (n) => PASSWORD_CHARS[n % PASSWORD_CHARS.length]).join('');
}

export const openCreateOfficial = () => update({ createOpen: true, formKey: state.formKey + 1 });
export const closeCreateOfficial = () => update({ createOpen: false });

export async function createOfficial(o: { name: string; role: string; unit: string; email: string; password: string }): Promise<void> {
  await auth.createOfficialAccount({ email: o.email, password: o.password, name: o.name, role: o.role, unitName: o.unit });
  update({ createOpen: false, credentials: { name: o.name, role: o.role, unit: o.unit, email: o.email, password: o.password } });
  showToast('Official account for ' + o.name + ' created successfully.', 'success');
  await loadAdminOfficials();
}

export const closeCredentials = () => update({ credentials: null });

export async function copyCredentials(): Promise<void> {
  const c = state.credentials;
  if (!c) return;
  const text = 'Xohari Official Portal Access\n' +
    'Official Name: ' + c.name + '\nRole: ' + c.role + '\nUnit / Desk: ' + c.unit + '\nOfficial Email: ' + c.email + '\n' +
    'Temporary Password: ' + c.password + '\nPortal URL: ' + window.location.origin + '/admin\n\n' +
    'Note: You will be prompted to set a permanent password upon first sign-in.';
  try {
    await navigator.clipboard.writeText(text);
    showToast('Account credentials copied to clipboard.', 'success');
  } catch {
    showToast('Please manually copy the temporary password.', 'warning');
  }
}

export const openEditOfficial = (id: string, name: string, unit: string) => update({ editOfficial: { id, name, unit }, formKey: state.formKey + 1 });
export const closeEditOfficial = () => update({ editOfficial: null });

export async function editOfficial(name: string, unit: string): Promise<void> {
  if (!state.editOfficial) return;
  await auth.editOfficialProfile(state.editOfficial.id, name, unit);
  showToast('Official profile updated successfully.', 'success');
  closeEditOfficial();
  await loadAdminOfficials();
}

export async function toggleOfficialStatus(id: string, isActive: boolean): Promise<void> {
  if (!(await askConfirm(isActive
    ? { title: 'Deactivate this account?', message: 'The official will not be able to sign in until the account is activated again.', confirmLabel: 'Deactivate', danger: true, icon: 'warning' }
    : { title: 'Activate this account?', message: 'The official will be able to sign in again.', confirmLabel: 'Activate', icon: 'check' }))) return;
  try {
    await auth.toggleOfficialActive(id, !isActive);
    showToast('Official account ' + (isActive ? 'deactivated' : 'activated') + ' successfully.', 'success');
    await loadAdminOfficials();
  } catch (err) {
    showToast(errorText(err, 'Failed to update account status.'), 'error');
  }
}

export const openResetPassword = (id: string, name: string, email: string, unit: string) =>
  update({ resetOfficial: { id, name, email, unit }, formKey: state.formKey + 1 });
export const closeResetPassword = () => update({ resetOfficial: null });

export async function resetPassword(password: string): Promise<void> {
  const r = state.resetOfficial;
  if (!r) return;
  await auth.resetOfficialPassword(r.id, password);
  update({ resetOfficial: null, credentials: { name: r.name, role: 'Department / Council', unit: r.unit, email: r.email, password } });
  showToast('Password reset successfully for ' + r.name, 'success');
  await loadAdminOfficials();
}

export async function deleteOfficial(id: string, name: string): Promise<void> {
  if (!(await askConfirm({ title: 'Delete ' + name + '?', message: 'Their profile and login access are removed permanently. This cannot be undone.', confirmLabel: 'Delete account', danger: true, icon: 'warning' }))) return;
  try {
    await auth.deleteOfficialAccount(id);
    showToast('Official account permanently deleted.', 'success');
    await loadAdminOfficials();
  } catch (err) {
    showToast(errorText(err, 'Failed to delete official account.'), 'error');
  }
}

export async function loadActivityLogs(): Promise<void> {
  update({ logs: null, logsError: null });
  try {
    update({ logs: await auth.fetchActivityLogs(150) });
  } catch (err) {
    update({ logs: [], logsError: errorText(err, 'Server error.') });
  }
}

export const setLogFilter = (logFilter: string) => update({ logFilter });

/** Reply to the reporter ('public', translated into both languages) or an internal note. Throws on failure. */
export async function postReply(complaintId: string, body: string, visibility: 'public' | 'internal'): Promise<void> {
  const res = await auth.postReply(complaintId, body, visibility);
  showToast(visibility === 'public'
    ? 'Reply sent to the reporter' + (res.translated ? ' in both languages.' : '.')
    : 'Internal note added.', 'success');
  await refreshRouting(complaintId);
}

export const getSignedInOfficialId = () => state.profile?.id ?? null;
