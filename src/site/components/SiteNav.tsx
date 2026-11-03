import { Link } from 'react-router-dom';
import { StudentNavButton, StudentNotifications } from './StudentAuthWidgets';
import { BrandMark } from './BrandMark';
import { LanguageToggle } from '../../i18n';
import { signOutStudent, useStudentSession } from '../studentSession';

/** Shared navigation used by the index hero and standalone report routes. */
export function SiteNav({ standalone = false, pageShell = false }: { standalone?: boolean; pageShell?: boolean }) {
  const home = standalone ? '/' : '#hero';
  const anchor = (id: string) => standalone ? `/#${id}` : `#${id}`;
  const { profile } = useStudentSession();

  return (
    <nav className={`nav${standalone ? ' report-page-nav' : ''}${pageShell ? ' page-shell-nav' : ''}`} aria-label="Main navigation">
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
        <a href={anchor('student-signin')}>Report</a>
        {' '}
      </div>
      {' '}
      <div className="nav-actions">
        {' '}
        <StudentNotifications />
        {pageShell ? (
          profile ? (
            <button className="btn-outline nav-student-button" type="button" onClick={() => void signOutStudent()} aria-label="Sign out">
              <span key={profile.id} className="nav-account-label">{profile.name}</span>
            </button>
          ) : (
            <>
              <Link className="btn-outline nav-track-link" to="/login">Sign In</Link>
              <Link className="btn nav-student-button" to="/login?mode=signup">Sign Up</Link>
            </>
          )
        ) : <StudentNavButton standalone={standalone} />}
        {pageShell && <LanguageToggle />}
        {' '}
        <Link className="btn-outline nav-track-link" to="/login?view=mine#report-tracker" aria-label="Track status">
          <span className="nav-track-long">Track Status</span>
          <span className="nav-track-short" aria-hidden="true">Track</span>
        </Link>
      </div>
      {' '}
    </nav>
  );
}

