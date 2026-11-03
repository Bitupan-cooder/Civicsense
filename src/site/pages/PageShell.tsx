// Shell for the student app's route pages (PRD "Pages"): header with the main links, the English/Assamese toggle
// and notifications. UNSTYLED ON PURPOSE: markup and data only; styling is done by the frontend.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n';
import { SiteNav } from '../components/SiteNav';
import { Footer } from '../sections/Footer';

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div data-page>
      <header className="report-page-header page-shell-header"><SiteNav standalone pageShell /></header>
      <main>
        <h1>{title}</h1>
        {children}
      </main>
      <Footer />
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
