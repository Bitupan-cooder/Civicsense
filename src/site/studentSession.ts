// Who is signed in as a student, and the sign-in / registration / ID re-upload dialogs.
import { useSyncExternalStore } from 'react';
import { civicAuth, routingApi, type StudentProfile } from '../civicAuth';
import { showToast } from '../toast';
import { setLanguage } from '../i18n';
import { loadStudentComplaints, openTracker, switchTrackerMode } from './tracker';

export type { StudentProfile };

export interface StudentSession {
  /** undefined: not checked yet (initial markup), null: signed out */
  profile: StudentProfile | null | undefined;
  idCardStatus?: string;
  authOpen: boolean;
  authTab: 'signin' | 'signup';
  loginError: string;
  signupError: string;
  loginBusy: boolean;
  signupBusy: boolean;
  reuploadOpen: boolean;
  reuploadError: string;
  reuploadBusy: boolean;
}

let state: StudentSession = {
  profile: undefined, authOpen: false, authTab: 'signin', loginError: '', signupError: '', loginBusy: false, signupBusy: false,
  reuploadOpen: false, reuploadError: '', reuploadBusy: false,
};
const listeners = new Set<() => void>();

function update(patch: Partial<StudentSession>): void {
  state = { ...state, ...patch };
  listeners.forEach((notify) => notify());
}

export function useStudentSession(): StudentSession {
  return useSyncExternalStore(
    (notify) => { listeners.add(notify); return () => { listeners.delete(notify); }; },
    () => state,
  );
}

/** Bumped on every sign-in/out, so a session check that started earlier can't overwrite the newer result. */
let sessionVersion = 0;

export function setStudentSession(profile: StudentProfile | null, idCardStatus?: string): void {
  sessionVersion++;
  update({ profile, idCardStatus });
  if (profile?.preferred_language) setLanguage(profile.preferred_language, { save: false });
}

export async function checkCurrentStudentSession(): Promise<void> {
  const startedAt = sessionVersion;
  try {
    const sb = civicAuth().getClient();
    if (!sb) return;
    const session = (await sb.auth.getSession()).data?.session;
    if (session?.user) {
      const res = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      if (res.data && res.data.role === 'student') {
        const card = await sb.from('id_cards').select('status').eq('user_id', session.user.id).maybeSingle();
        if (sessionVersion === startedAt) setStudentSession(res.data, card.data ? card.data.status : 'pending');
      }
    } else if (sessionVersion === startedAt) {
      setStudentSession(null);
    }
  } catch (e) {
    console.error('Session check error:', e);
  }
}

/** Reading language for complaint summaries and replies, saved to the profile (PRD). */
export function setReadingLanguage(lang: 'en' | 'as'): void {
  const p = state.profile;
  if (!p) return;
  update({ profile: { ...p, preferred_language: lang } });
  if (p.id) routingApi().setPreferredLanguage(p.id, lang);
}

export async function signOutStudent(): Promise<void> {
  await civicAuth().logout();
  showToast('Signed out of student session.', 'info');
  setStudentSession(null);
}

/** Nav button: the tracker when signed in as a student, otherwise the sign-in dialog. */
export function handleNavStudentClick(): void {
  if (civicAuth().getProfile()?.role === 'student') {
    openTracker();
    switchTrackerMode('my_complaints');
  } else {
    openStudentAuth();
  }
}

// ── sign-in / registration dialog (typed values are kept between openings, as before) ──

export const openStudentAuth = () => update({ authOpen: true, loginError: '', signupError: '' });
export const closeStudentAuth = () => update({ authOpen: false });
export const switchStudentAuthTab = (authTab: 'signin' | 'signup') => update({ authTab });

export async function submitStudentLogin(email: string, password: string): Promise<void> {
  email = email.trim();
  if (!email || !password) {
    update({ loginError: 'Please enter both student email and password.' });
    return;
  }
  update({ loginBusy: true, loginError: '' });
  try {
    const res = await civicAuth().loginStudent(email, password);
    update({ loginBusy: false, authOpen: false });
    showToast('Signed in as ' + res.profile.name, 'success');
    const card = await civicAuth().getClient().from('id_cards').select('status').eq('user_id', res.profile.id).maybeSingle();
    setStudentSession(res.profile, card.data ? card.data.status : 'pending');
    loadStudentComplaints();
  } catch (err) {
    update({ loginBusy: false, loginError: (err as Error).message || 'Login failed.' });
  }
}

export async function submitStudentSignup(f: { name: string; email: string; password: string; file: File | null }): Promise<void> {
  const name = f.name.trim();
  const email = f.email.trim();
  let error = '';
  if (!name || !email || !f.password) error = 'Please complete all registration fields.';
  else if (f.password.length < 8) error = 'Password must be at least 8 characters long.';
  else if (!f.file) error = 'Please select a student ID card file (image or PDF, max 5 MB).';
  if (error) { update({ signupError: error }); return; }

  update({ signupBusy: true, signupError: '' });
  try {
    await civicAuth().signUpStudent({ name, email, password: f.password, file: f.file! });
    update({ signupBusy: false, authOpen: false });
    showToast('Registration complete. ID card uploaded for official verification.', 'success');
    try { // sign the new student in
      const res = await civicAuth().loginStudent(email, f.password);
      setStudentSession(res.profile, 'pending');
      loadStudentComplaints();
    } catch { /* they can sign in manually */ }
  } catch (err) {
    update({ signupBusy: false, signupError: (err as Error).message || 'Registration failed.' });
  }
}

// ── ID card re-upload dialog ──

export const openReuploadModal = () => update({ reuploadOpen: true, reuploadError: '' });
export const closeReuploadModal = () => update({ reuploadOpen: false });

export async function submitReuploadId(file: File | null): Promise<void> {
  if (!file) { update({ reuploadError: 'Please select a new valid ID card file.' }); return; }
  update({ reuploadBusy: true, reuploadError: '' });
  try {
    await civicAuth().reuploadIdCard(file);
    update({ reuploadBusy: false, reuploadOpen: false });
    showToast('Student ID card re-uploaded. Status reset to pending verification.', 'success');
    checkCurrentStudentSession();
  } catch (err) {
    update({ reuploadBusy: false, reuploadError: (err as Error).message || 'Re-upload failed.' });
  }
}
