import { Link } from 'react-router-dom';
import { StudentNavButton, StudentNotifications } from './StudentAuthWidgets';
import { BrandMark } from './BrandMark';
import { LanguageToggle } from '../../i18n';
import { useStudentSession } from '../studentSession';

/** Shared navigation used by the index hero and standalone report routes. */
export function SiteNav({ standalone = false }: { standalone?: boolean }) {
  const home = standalone ? '/' : '#hero';
  const anchor = (id: string) => standalone ? `/#${id}` : `#${id}`;
  // signed out it leads to sign-in and then the list; signed in it is the student's list
  const signedIn = !!useStudentSession().profile;

  return (
    <nav className={`nav${standalone ? ' report-page-nav' : ''}`} aria-label="Main navigation">
      {' '}
      {/* a plain link on purpose: from another page, going home is a full page load that plays the startup loader */}
      <a className="brand" href={home} aria-label="Xohari home">
        {' '}
        <BrandMark />
        {' '}Xohari{' '}
      </a>
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
        <LanguageToggle />
        <StudentNavButton />
        {' '}
        <Link className="btn-outline nav-track-link" to="/report/new?view=mine#report-tracker" aria-label={signedIn ? 'My complaints' : 'Track Complaint'}>
          <span className="nav-track-long">{signedIn ? 'My complaints' : 'Track Complaint'}</span>
          <span className="nav-track-short" aria-hidden="true">{signedIn ? 'Mine' : 'Track'}</span>
        </Link>
      </div>
      {' '}
    </nav>
  );
}

