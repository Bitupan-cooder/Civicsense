// Who is signed in as a student, and the sign-in / registration / ID re-upload dialogs.
import { useSyncExternalStore } from 'react';
import type { StudentProfile } from '../civicAuth';
import * as auth from '../civicAuth';
import { showToast } from '../toast';
import { setLanguage } from '../i18n';
import { clearTrackerSession, loadStudentComplaints } from './tracker';

export type { StudentProfile };

export interface StudentSession {
  /** undefined: not checked yet (initial markup), null: signed out */
  profile: StudentProfile | null | undefined;
  idCardStatus?: string;
  /** true right after registering, so the welcome card greets a new student rather than "Welcome back" */
  justRegistered: boolean;
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
  profile: undefined, justRegistered: false, authOpen: false, authTab: 'signin', loginError: '', signupError: '', loginBusy: false, signupBusy: false,
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

// /welcome is shown once per sign-in: the student it was shown to is remembered for this browser tab
const WELCOMED_KEY = 'xohari-welcomed';
export const welcomeSeen = (id = ''): boolean => { try { return !!id && sessionStorage.getItem(WELCOMED_KEY) === id; } catch { return false; } };
export const markWelcomeSeen = (id = ''): void => { try { sessionStorage.setItem(WELCOMED_KEY, id); } catch { /* storage blocked: shown again */ } };
const resetWelcome = (): void => { try { sessionStorage.removeItem(WELCOMED_KEY); } catch { /* storage blocked */ } };

/** Bumped on every sign-in/out, so a session check that started earlier can't overwrite the newer result. */
let sessionVersion = 0;

export function setStudentSession(profile: StudentProfile | null, idCardStatus?: string): void {
  sessionVersion++;
  if (state.profile && state.profile.id !== profile?.id) clearTrackerSession(); // a signed-out store holds nothing to clear
  update({ profile, idCardStatus });
  if (profile?.preferred_language) setLanguage(profile.preferred_language, { save: false });
}

export async function checkCurrentStudentSession(): Promise<void> {
  const startedAt = sessionVersion;
  try {
    const sb = auth.getClient();
    if (!sb) return;
    const session = (await sb.auth.getSession()).data?.session;
    if (session?.user) {
      const [res, card] = await Promise.all([ // both only need the user id
        sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
        sb.from('id_cards').select('status').eq('user_id', session.user.id).maybeSingle(),
      ]);
      if (res.data && res.data.role === 'student') {
        if (sessionVersion === startedAt) setStudentSession(res.data, card.data ? card.data.status : 'pending');
      } else if (sessionVersion === startedAt) setStudentSession(null);
    } else if (sessionVersion === startedAt) {
      setStudentSession(null);
    }
  } catch (e) {
    console.error('Session check error:', e);
    if (sessionVersion === startedAt) setStudentSession(null);
  }
}

/** Reading language for complaint summaries and replies, saved to the profile (PRD). */
export function setReadingLanguage(lang: 'en' | 'as'): void {
  const p = state.profile;
  if (!p) return;
  update({ profile: { ...p, preferred_language: lang } });
  if (p.id) auth.setPreferredLanguage(p.id, lang);
}

let signingOut = false; // this tab's own sign-out; other tabs' sign-outs reach followOtherTabs as SIGNED_OUT too

function clearSignedIn(): void {
  update({ justRegistered: false });
  resetWelcome();
  setStudentSession(null);
}

export async function signOutStudent(): Promise<void> {
  signingOut = true;
  try { await auth.logout(); } finally { signingOut = false; }
  showToast('Signed out of student session.', 'info');
  clearSignedIn();
}

/** Tabs of one browser share the sign-in (Supabase tells every tab when it changes): follow another tab's sign-out
 *  or sign-in. Runs inside Supabase's auth lock, so Supabase calls are deferred with setTimeout. */
export function followOtherTabs(): void {
  auth.getClient()?.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' && state.profile && !signingOut) {
      setTimeout(() => { clearSignedIn(); showToast('You signed out in another tab.', 'info'); });
    } else if (event === 'SIGNED_IN' && session?.user.id !== state.profile?.id && !state.loginBusy && !state.signupBusy) {
      setTimeout(() => void checkCurrentStudentSession());
    }
  });
}

// ── sign-in / registration dialog (typed values are kept between openings, as before) ──

export const openStudentAuth = () => update({ authOpen: true, loginError: '', signupError: '' });
export const closeStudentAuth = () => update({ authOpen: false });
export const switchStudentAuthTab = (authTab: 'signin' | 'signup') => update({ authTab });

export async function submitStudentLogin(email: string, password: string): Promise<boolean> {
  email = email.trim();
  if (!email || !password) {
    update({ loginError: 'Please enter both student email and password.' });
    return false;
  }
  update({ loginBusy: true, loginError: '' });
  try {
    const res = await auth.loginStudent(email, password);
    update({ loginBusy: false, authOpen: false, justRegistered: false });
    resetWelcome();
    showToast('Signed in as ' + res.profile.name, 'success');
    loadStudentComplaints(); // alongside the ID-card status, not after it
    const card = await auth.getClient().from('id_cards').select('status').eq('user_id', res.profile.id).maybeSingle();
    setStudentSession(res.profile, card.data ? card.data.status : 'pending');
    return true;
  } catch (err) {
    update({ loginBusy: false, loginError: (err as Error).message || 'Login failed.' });
    return false;
  }
}

export async function submitStudentSignup(f: { name: string; email: string; password: string; file: File | null }): Promise<boolean> {
  const name = f.name.trim();
  const email = f.email.trim();
  let error = '';
  if (!name || !email || !f.password) error = 'Please complete all registration fields.';
  else if (f.password.length < 8) error = 'Password must be at least 8 characters long.';
  else if (!f.file) error = 'Please select a student ID card file (image or PDF, max 5 MB).';
  if (error) { update({ signupError: error }); return false; }

  update({ signupBusy: true, signupError: '' });
  try {
    const registration = await auth.signUpStudent({ name, email, password: f.password, file: f.file! }) as { profile?: StudentProfile & { id: string } };
    update({ signupBusy: false, authOpen: false, justRegistered: true });
    resetWelcome();
    showToast('Registration complete. ID card uploaded for official verification.', 'success');
    if (registration.profile) {
      setStudentSession(registration.profile, 'pending');
      loadStudentComplaints();
    }
    return true;
  } catch (err) {
    update({ signupBusy: false, signupError: (err as Error).message || 'Registration failed.' });
    return false;
  }
}

// ── ID card re-upload dialog ──

export const openReuploadModal = () => update({ reuploadOpen: true, reuploadError: '' });
export const closeReuploadModal = () => update({ reuploadOpen: false });

export async function submitReuploadId(file: File | null): Promise<void> {
  if (!file) { update({ reuploadError: 'Please select a new valid ID card file.' }); return; }
  update({ reuploadBusy: true, reuploadError: '' });
  try {
    await auth.reuploadIdCard(file);
    update({ reuploadBusy: false, reuploadOpen: false });
    showToast('Student ID card re-uploaded. Status reset to pending verification.', 'success');
    checkCurrentStudentSession();
  } catch (err) {
    update({ reuploadBusy: false, reuploadError: (err as Error).message || 'Re-upload failed.' });
  }
}
