// Navigation between the officials' routes (PRD "Pages"), by role. Hidden until migration 001 has been run.
// UNSTYLED ON PURPOSE: styling is done by the frontend.
import { NavLink } from 'react-router-dom';
import { LanguageToggle, useLanguage } from '../../i18n';
import { useFeatures } from '../../NotificationBell';
import { useConsole } from '../console';

export function ConsoleNav() {
  const { t } = useLanguage();
  const { routing } = useFeatures();
  const { profile, complaints } = useConsole();
  if (!routing || !profile) return null;
  const isAdmin = profile.role === 'administration';
  const review = complaints.filter((c) => c.status === 'needs_review').length;
  return (
    <nav id="consoleNav" aria-label="Console">
      {isAdmin ? <NavLink to="/admin" end>{t('nav.queue')}</NavLink> : <NavLink to="/authority">{t('nav.queue')}</NavLink>}
      {isAdmin && <NavLink to="/admin/review">{t('nav.review')}{review ? ` (${review})` : ''}</NavLink>}
      {isAdmin && <NavLink to="/admin/duplicates">{t('nav.duplicates')}</NavLink>}
      {isAdmin && <NavLink to="/admin/stats">{t('nav.stats')}</NavLink>}
      {isAdmin && <NavLink to="/admin/routing">{t('nav.routing')}</NavLink>}
      <LanguageToggle />
    </nav>
  );
}

/** Wraps an admin page: loading, "not set up yet", and error states shared by all of them. */
export function PageState({ loading, error, notInstalled }: { loading?: boolean; error?: string | null; notInstalled?: boolean }) {
  const { t } = useLanguage();
  if (notInstalled) return <p role="status">{t('common.notInstalled')}</p>;
  if (loading) return <p role="status">{t('common.loading')}</p>;
  if (error) return <p role="alert">{error}</p>;
  return null;
}
