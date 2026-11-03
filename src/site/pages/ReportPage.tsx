import { useEffect, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ReportAuthGate } from '../components/ReportForm';
import { useStudentSession } from '../studentSession';
import { ReportSection } from '../sections/ReportSection';
import { ShaderCanvas } from '../../components/ui/ShaderCanvas';
import { SiteNav } from '../components/SiteNav';
import { Footer } from '../sections/Footer';
import { ReportTrackerSection } from '../sections/ReportTrackerSection';

export function ReportPage() {
  const { profile } = useStudentSession();
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
              <Link className="report-start-button" to="/report/new">Report an issue <span aria-hidden="true">→</span></Link>
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
    if (profile === null) navigate('/report', { replace: true });
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
