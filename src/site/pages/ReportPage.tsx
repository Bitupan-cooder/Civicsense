import { useEffect, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ReportAuthGate } from '../components/ReportForm';
import { StudentWelcomeCard } from '../components/StudentAuthWidgets';
import { markWelcomeSeen, switchStudentAuthTab, useStudentSession, welcomeSeen } from '../studentSession';
import { ReportSection } from '../sections/ReportSection';
import { ShaderCanvas } from '../../components/ui/ShaderCanvas';
import { SiteNav } from '../components/SiteNav';
import { Footer } from '../../components/ui/sticker-slap-footer';
import { ReportTrackerSection } from '../sections/ReportTrackerSection';
import { useTracker } from '../tracker';

/** Page heading shared by /login and /welcome. */
function EntryPage({ children }: { children: ReactNode }) {
  return (
    <ReportPageLayout>
      <section className="report-section report-entry-section">
        <ShaderCanvas />
        <div className="report-inner">
          <h1 className="h2">
            Report a Campus Issue.
            <br />
            <em style={{ color: 'var(--olive)', fontStyle: 'italic' }}>Campus Redressal &amp; Grievance Tracking.</em>
          </h1>
          {children}
        </div>
      </section>
    </ReportPageLayout>
  );
}

const checking = <div className="report-entry-card" role="status">Checking your student account…</div>;

/** /login: student sign-in / registration only. Once signed in, the student moves on to ?next= or /welcome. */
export function ReportPage() {
  const { profile } = useStudentSession();
  const [params] = useSearchParams();
  const mode = params.get('mode');
  const next = params.get('next');
  useEffect(() => { switchStudentAuthTab(mode === 'signup' ? 'signup' : 'signin'); }, [mode]);

  // a chat-link token (?link=) is consumed by ChatLink first; it drops the param, and then the student moves on
  // only same-site paths for ?next=: never //host or backslash tricks
  if (profile && !params.has('link')) {
    const safeNext = next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : null;
    return <Navigate to={safeNext ?? (welcomeSeen(profile.id) ? '/report/new' : '/welcome')} replace />;
  }
  return (
    <EntryPage>
      {profile !== null ? checking : (
        <>
          <p className="report-entry-description">
            Sign in with your verified student account, or register with your student ID, to continue.
          </p>
          <ReportAuthGate />
        </>
      )}
    </EntryPage>
  );
}

/** /welcome: where a student lands after signing in or registering ("Welcome back" / "Welcome aboard").
 *  Shown once per sign-in: it counts as seen when the student leaves it (a reload is not leaving), and coming back
 *  afterwards (Back button, typed URL) goes to /report/new. */
export function WelcomePage() {
  const { profile } = useStudentSession();
  // on leaving the route; StrictMode's dev-only remount runs this too, but the URL is still /welcome then
  useEffect(() => () => { if (profile?.id && window.location.pathname !== '/welcome') markWelcomeSeen(profile.id); }, [profile?.id]);

  if (profile === null) return <Navigate to="/login" replace />;
  if (profile && welcomeSeen(profile.id)) return <Navigate to="/report/new" replace />;
  return <EntryPage>{profile ? <div className="report-entry-welcome"><StudentWelcomeCard /></div> : checking}</EntryPage>;
}

export function ReportFormPage() {
  const { profile } = useStudentSession();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedPage = `/report/new${location.search}${location.hash}`;
  useEffect(() => {
    if (profile === null) navigate(`/login?next=${encodeURIComponent(requestedPage)}`, { replace: true });
  }, [profile, navigate, requestedPage]);

  if (profile === null) return null;
  return (
    <ReportPageLayout>
      {profile === undefined ? <div className="report-page-loading" role="status">Checking your student account…</div> : <ReportWorkspace />}
    </ReportPageLayout>
  );
}

function ReportWorkspace() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const trackingView = params.get('view') === 'mine' || params.has('track');
  const { mine, mineLoaded } = useTracker();
  return (
    <div className="report-workspace-layout">
      <aside className="report-workspace-sidebar" aria-label="Report workspace">
        <span className="report-workspace-eyebrow">Student workspace</span>
        <strong>Campus redressal</strong>
        <nav>
          <Link className={!trackingView ? 'is-current' : undefined} to="/report/new#report">Submit a report</Link>
          <Link className={trackingView ? 'is-current' : undefined} to="/report/new?view=mine#report-tracker">
            My complaints{mineLoaded && <span className="report-workspace-count">{mine.length}</span>}
          </Link>
        </nav>
        <p>Your report and its updates stay together here.</p>
      </aside>
      <div className="report-workspace-main">
        {!trackingView ? <ReportSection /> : <ReportTrackerSection />}
      </div>
    </div>
  );
}
function ReportPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="standalone-report-page">
      <header className="report-page-header">
        <SiteNav standalone />
      </header>
      <main style={{ display: 'contents' }}>{children}</main>
      <Footer />
    </div>
  );
}
