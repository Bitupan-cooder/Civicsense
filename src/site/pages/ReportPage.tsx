import { useEffect, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ReportAuthGate } from '../components/ReportForm';
import { signOutStudent, switchStudentAuthTab, useStudentSession } from '../studentSession';
import { ReportSection } from '../sections/ReportSection';
import { ShaderCanvas } from '../../components/ui/ShaderCanvas';
import { SiteNav } from '../components/SiteNav';
import { Footer } from '../sections/Footer';
import { ReportTrackerSection } from '../sections/ReportTrackerSection';

/** /login: student sign-in / registration and the tracker. ?mode=signup opens Register; ?next=<page> returns there after sign-in. */
export function ReportPage() {
  const { profile } = useStudentSession();
  const [params] = useSearchParams();
  const mode = params.get('mode');
  const next = params.get('next');
  useEffect(() => { switchStudentAuthTab(mode === 'signup' ? 'signup' : 'signin'); }, [mode]);

  // only same-site paths: never //host or backslash tricks
  if (profile && next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')) return <Navigate to={next} replace />;
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
          <p className="report-entry-description">
            Sign in with your verified student account, or register with your student ID, to continue.
          </p>
          {profile === undefined ? (
            <div className="report-entry-card" role="status">Checking your student account…</div>
          ) : profile ? (
            <div className="report-entry-card report-entry-ready">
              <p>Signed in as <strong>{profile.name}</strong>. Your verified account is ready to submit a report.</p>
              <div className="report-entry-actions">
                <Link className="report-start-button" to="/report/new">Report an issue <span aria-hidden="true">→</span></Link>
                <button type="button" className="report-entry-logout" onClick={() => void signOutStudent()}>Log out</button>
              </div>
            </div>
          ) : (
            <ReportAuthGate />
          )}
        </div>
      </section>
      <ReportTrackerSection />
    </ReportPageLayout>
  );
}

export function ReportFormPage() {
  const { profile } = useStudentSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (profile === null) navigate('/login?next=%2Freport%2Fnew', { replace: true });
  }, [profile, navigate]);

  if (profile === null) return null;
  return (
    <ReportPageLayout>
      {profile === undefined ? <div className="report-page-loading" role="status">Checking your student account…</div> : <ReportSection />}
      {profile && <ReportTrackerSection />}
    </ReportPageLayout>
  );
}

function ReportPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="standalone-report-page">
      <header className="report-page-header">
        <SiteNav standalone />
      </header>
      {children}
      <Footer />
    </div>
  );
}
