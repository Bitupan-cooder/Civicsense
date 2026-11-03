// Navigation between the officials' routes (PRD "Pages"), by role. Hidden until migration 001 has been run.
// Styled in src/admin/console-redesign.css (hallmark redesign).
import { NavLink } from 'react-router-dom';
import { ChartNoAxesColumn, ClipboardCheck, Copy, LayoutDashboard, Route as RouteIcon } from 'lucide-react';
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
    <aside className="console-sidebar">
      <div className="console-sidebar-heading">Workspace</div>
      <nav id="consoleNav" aria-label="Official workspace">
        <NavLink to="/admin" end><LayoutDashboard aria-hidden="true" /><span>{t('nav.queue')}</span></NavLink>
        {isAdmin && <NavLink to="/admin/review"><ClipboardCheck aria-hidden="true" /><span>{t('nav.review')}{review ? <b className="console-nav-count">{review}</b> : null}</span></NavLink>}
        {isAdmin && <NavLink to="/admin/duplicates"><Copy aria-hidden="true" /><span>{t('nav.duplicates')}</span></NavLink>}
        {isAdmin && <NavLink to="/admin/stats"><ChartNoAxesColumn aria-hidden="true" /><span>{t('nav.stats')}</span></NavLink>}
        {isAdmin && <NavLink to="/admin/routing"><RouteIcon aria-hidden="true" /><span>{t('nav.routing')}</span></NavLink>}
      </nav>
      <div className="console-sidebar-language"><LanguageToggle /></div>
    </aside>
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
