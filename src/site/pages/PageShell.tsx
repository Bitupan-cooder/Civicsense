// Shell for the student app's route pages (PRD "Pages"): header with the main links, the English/Assamese toggle
// and notifications. UNSTYLED ON PURPOSE: markup and data only; styling is done by the frontend.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LanguageToggle, useLanguage } from '../../i18n';
import { StudentNotifications } from '../components/StudentAuthWidgets';
import { signOutStudent, useStudentSession } from '../studentSession';

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useLanguage();
  const { profile } = useStudentSession();
  return (
    <div data-page>
      <header>
        <nav aria-label="Main">
          <Link to="/">{t('nav.home')}</Link>
          <Link to="/report">{t('nav.report')}</Link>
          {profile ? (
            <>
              <Link to="/my">{t('nav.my')}</Link>
              <button type="button" onClick={() => signOutStudent()}>{profile.name}</button>
            </>
          ) : (
            <>
              <Link to="/login">{t('nav.login')}</Link>
              <Link to="/login?mode=signup">{t('nav.signup')}</Link>
            </>
          )}
          <LanguageToggle />
          <StudentNotifications />
        </nav>
      </header>
      <main>
        <h1>{title}</h1>
        {children}
      </main>
    </div>
  );
}

/** For pages behind login: "Log in or sign up to continue" and a link back here afterwards (PRD). */
export function SignInRequired({ next }: { next: string }) {
  const { t } = useLanguage();
  return (
    <p>
      {t('common.signInToContinue')}{' '}
      <Link to={`/login?next=${encodeURIComponent(next)}`}>{t('nav.login')}</Link>{' · '}
      <Link to={`/login?mode=signup&next=${encodeURIComponent(next)}`}>{t('nav.signup')}</Link>
    </p>
  );
}
