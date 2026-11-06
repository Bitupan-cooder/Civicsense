// Navigation between the officials' routes (PRD "Pages"), by role. Hidden until migration 001 has been run.
// Desktop: a sidebar that collapses to an icon rail (remembered per browser).
// Phones (<= 700 px): a top bar whose menu button slides the same sidebar in as a drawer.
// Styled in src/admin/console-redesign.css (hallmark redesign).
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity, ChartNoAxesColumn, ClipboardCheck, Copy, Languages, LayoutDashboard, LogOut, Menu, MessagesSquare,
  PanelLeftClose, PanelLeftOpen, Route as RouteIcon, X,
} from 'lucide-react';
import { LanguageToggle, useLanguage } from '../../i18n';
import { useFeatures } from '../../NotificationBell';
import { logoutAdmin, useConsole } from '../console';

const RAIL_KEY = 'console-sidebar-rail';
const readRail = () => { try { return localStorage.getItem(RAIL_KEY) === '1'; } catch { return false; } };

export function ConsoleNav() {
  const { t, lang, setLanguage } = useLanguage();
  const { routing, signals } = useFeatures();
  const { profile, complaints } = useConsole();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [rail, setRail] = useState(readRail);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]); // picking a page closes the drawer
  useEffect(() => {
    if (!open) return;
    drawer.current?.querySelector<HTMLElement>('#consoleNav a')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); menuButton.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  const toggleRail = () => setRail((r) => {
    try { localStorage.setItem(RAIL_KEY, r ? '0' : '1'); } catch { /* storage unavailable */ }
    return !r;
  });

  if (!routing || !profile) return null;
  const isAdmin = profile.role === 'administration';
  const review = complaints.filter((c) => c.status === 'needs_review').length;
  const pages = [
    { to: '/admin', icon: LayoutDashboard, label: t('nav.queue'), show: true },
    { to: '/admin/review', icon: ClipboardCheck, label: t('nav.review'), show: isAdmin, count: review },
    { to: '/admin/signals', icon: MessagesSquare, label: t('nav.signals'), show: !!signals },
    { to: '/admin/duplicates', icon: Copy, label: t('nav.duplicates'), show: isAdmin },
    { to: '/admin/stats', icon: ChartNoAxesColumn, label: t('nav.stats'), show: isAdmin },
    { to: '/admin/routing', icon: RouteIcon, label: t('nav.routing'), show: isAdmin },
    { to: '/admin/system', icon: Activity, label: t('nav.system'), show: isAdmin },
  ].filter((p) => p.show);
  const tip = (label: string) => (rail ? label : undefined); // hover names for the icon rail

  return (
    <aside className={'console-sidebar' + (open ? ' is-open' : '') + (rail ? ' is-rail' : '')}>
      <div className="console-mobile-bar">
        <button ref={menuButton} className="console-menu-button" type="button" aria-expanded={open} aria-controls="consoleDrawer"
          aria-label={open ? t('nav.closeMenu') : t('nav.menu')} onClick={() => setOpen((o) => !o)}>
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
      {/* display: contents on desktop: the sidebar itself lays the parts out */}
      <div className="console-drawer" id="consoleDrawer" ref={drawer}>
        <div className="console-sidebar-head">
          <div className="console-sidebar-heading">Workspace</div>
          <button className="console-rail-toggle" type="button" aria-pressed={rail} aria-label={rail ? t('nav.expand') : t('nav.collapse')}
            title={rail ? t('nav.expand') : t('nav.collapse')} onClick={toggleRail}>
            {rail ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
          </button>
        </div>
        <nav id="consoleNav" aria-label="Official workspace">
          {pages.map(({ to, icon: Icon, label, count }) => (
            <NavLink key={to} to={to} end={to === '/admin'} title={tip(label)}>
              <Icon aria-hidden="true" /><span className="console-nav-label">{label}</span>
              {count ? <b className="console-nav-count">{count}</b> : null}
            </NavLink>
          ))}
        </nav>
        <div className="console-sidebar-footer">
          <div className="console-sidebar-language"><LanguageToggle /></div>
          {/* the rail has no room for the language name: same switch, as an icon */}
          <button className="console-rail-language" type="button" lang={lang === 'en' ? 'as' : 'en'} aria-label={t('lang.toggle')} title={t('lang.toggle')}
            onClick={() => setLanguage(lang === 'en' ? 'as' : 'en')}>
            <Languages aria-hidden="true" />
          </button>
          <button className="console-sidebar-logout" type="button" title={tip(t('nav.logout'))} onClick={() => void logoutAdmin()}>
            <LogOut aria-hidden="true" /><span className="console-nav-label">{t('nav.logout')}</span>
          </button>
        </div>
      </div>
      <div className="console-drawer-backdrop" aria-hidden="true" onClick={() => setOpen(false)} />
    </aside>
  );
}

/** Wraps an admin page: loading, "not set up yet", and error states shared by all of them. */
export function PageState({ loading, error, notInstalled }: { loading?: boolean; error?: string | null; notInstalled?: boolean }) {
  const { t } = useLanguage();
  if (notInstalled) return <p role="status">{t('common.notInstalled')}</p>;
  if (loading) return <p role="status" className="console-loading"><span className="console-spinner" aria-hidden="true" /><span className="sr-only">{t('common.loading')}</span></p>;
  if (error) return <p role="alert">{error}</p>;
  return null;
}
