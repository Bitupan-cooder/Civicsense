import { Link } from 'react-router-dom';
import { StudentNavButton, StudentNotifications } from './StudentAuthWidgets';

/** Shared navigation used by the index hero and standalone report routes. */
export function SiteNav({ standalone = false }: { standalone?: boolean }) {
  const home = standalone ? '/' : '#hero';
  const anchor = (id: string) => standalone ? `/#${id}` : `#${id}`;

  return (
    <nav className={`nav${standalone ? ' report-page-nav' : ''}`} aria-label="Main navigation">
      {' '}
      {standalone ? (
        <Link className="brand" to="/" aria-label="CivicSense home">
          {' '}
          <BrandMark />
          {' '}CivicSense{' '}
        </Link>
      ) : (
        <a className="brand" href={home} aria-label="CivicSense home">
          {' '}
          <BrandMark />
          {' '}CivicSense{' '}
        </a>
      )}
      {' '}
      <div className="nav-links">
        {' '}
        <a href={anchor('stats')}>Stats</a>
        {' '}
        <a href={anchor('how')}>Workflow</a>
        {' '}
        <a href={anchor('categories')}>Categories</a>
        {' '}
        <Link to="/report">Report</Link>
        {' '}
      </div>
      {' '}
      <div className="nav-actions">
        {' '}
        <StudentNotifications />
        <StudentNavButton standalone={standalone} />
        {' '}
        <Link className="btn-outline nav-track-link" to="/report?view=mine#report-tracker" aria-label="Track status">
          <span className="nav-track-long">Track Status</span>
          <span className="nav-track-short" aria-hidden="true">Track</span>
        </Link>
      </div>
      {' '}
    </nav>
  );
}

function BrandMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M11 2C11 2 4 6 4 13a7 7 0 0014 0C18 6 11 2 11 2z" fill="currentColor" opacity=".9" />
      <line x1="11" y1="14" x2="11" y2="20" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
