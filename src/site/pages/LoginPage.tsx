// /login (PRD "Login and sign-up"): two tabs; ?mode=signup opens Sign up; ?next=<page> returns there afterwards.
// Sign-up always creates a student (reporter) account. UNSTYLED ON PURPOSE: styling is done by the frontend.
//
// Data: studentSession.ts (submitStudentLogin / submitStudentSignup, loginError / signupError, loginBusy / signupBusy).
// After success: ?next, otherwise /report after sign-up and /my after log-in (PRD entry flow).
import { useEffect, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { setLanguage, useLanguage, type Language } from '../../i18n';
import { submitStudentLogin, submitStudentSignup, useStudentSession } from '../studentSession';
import { PageShell } from './PageShell';

export function LoginPage() {
  const { t, lang } = useLanguage();
  const s = useStudentSession();
  const [params, setParams] = useSearchParams();
  const signup = params.get('mode') === 'signup';
  const next = params.get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [readingLanguage, setReadingLanguage] = useState<Language>(lang);
  const idCard = useRef<HTMLInputElement>(null);
  const signedUpWith = useRef<Language | null>(null);

  // after sign-up, save the chosen reading language once the new profile is signed in
  useEffect(() => {
    if (s.profile && signedUpWith.current) { setLanguage(signedUpWith.current); signedUpWith.current = null; }
  }, [s.profile]);

  if (s.profile) return <Navigate to={next && next.startsWith('/') ? next : signup ? '/report' : '/my'} replace />;

  const tab = (mode: 'login' | 'signup') => () => {
    const p = new URLSearchParams(params);
    if (mode === 'signup') p.set('mode', 'signup'); else p.delete('mode');
    setParams(p, { replace: true });
  };

  return (
    <PageShell title={signup ? t('login.signupTitle') : t('login.title')}>
      <div role="tablist">
        <button type="button" role="tab" aria-selected={!signup} onClick={tab('login')}>{t('login.title')}</button>
        <button type="button" role="tab" aria-selected={signup} onClick={tab('signup')}>{t('login.signupTitle')}</button>
      </div>

      {!signup ? (
        <form onSubmit={(e) => { e.preventDefault(); submitStudentLogin(email, password); }}>
          <label>{t('login.email')} <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>{t('login.password')} <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {s.loginError && <p role="alert">{s.loginError}</p>}
          <button type="submit" disabled={s.loginBusy}>{s.loginBusy ? t('common.loading') : t('login.submit')}</button>
        </form>
      ) : (
        <form onSubmit={(e) => {
          e.preventDefault();
          signedUpWith.current = readingLanguage;
          submitStudentSignup({ name, email, password, file: idCard.current?.files?.[0] ?? null });
        }}>
          <label>{t('login.name')} <input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>{t('login.email')} <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>{t('login.password')} <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <label>{t('login.readingLanguage')}{' '}
            <select value={readingLanguage} onChange={(e) => setReadingLanguage(e.target.value as Language)}>
              <option value="en">English</option>
              <option value="as">অসমীয়া</option>
            </select>
          </label>
          {/* this project keeps student ID verification, which the PRD doesn't mention */}
          <label>{t('login.idCard')} <input ref={idCard} type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" /></label>
          {s.signupError && <p role="alert">{s.signupError}</p>}
          <button type="submit" disabled={s.signupBusy}>{s.signupBusy ? t('common.loading') : t('login.signupSubmit')}</button>
        </form>
      )}

      <p>{t('login.officials')} <a href="/authority">/authority</a></p>
    </PageShell>
  );
}
