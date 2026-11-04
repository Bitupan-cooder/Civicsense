// Student app routes (PRD "Pages"). The landing page (/) stays mounted, only hidden, while another route shows.
import { memo, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { refreshAnimations } from './animations.js';
import { ReportFormPage, ReportPage } from './pages/ReportPage';
import './pages/routes.css';
import { Hero } from './sections/Hero';
import { Stats } from './sections/Stats';
import { HowItWorks } from './sections/HowItWorks';
import { Categories } from './sections/Categories';
import { CallToAction } from './sections/CallToAction';
import { StudentSignInSection } from './sections/StudentSignInSection';
import { Footer } from './sections/Footer';
import { TrackerModal } from './modals/TrackerModal';
import { StudentAuthModal } from './modals/StudentAuthModal';
import { ReuploadIdModal } from './modals/ReuploadIdModal';
import { StartupLoader } from './components/StartupLoader';

const LANDING_PATHS = ['/'];

export function SiteApp() {
  const { pathname, hash } = useLocation();
  const onLanding = LANDING_PATHS.includes(pathname);
  useEffect(() => {
    document.body.classList.toggle('route-page', !onLanding);
    if (onLanding) {
      refreshAnimations();
      return;
    }

    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Route changes should reset to the top without visibly dragging the scrollbar.
      window.scrollTo(0, 0);
    }
  }, [pathname, hash, onLanding]);
  return (
    <>
      <StartupLoader />
      <Landing />
      <Routes>
        <Route path="/" element={null} />
        <Route path="/login" element={<ReportPage />} />
        <Route path="/report" element={<ReportRedirect />} />
        <Route path="/report/new" element={<ReportFormPage />} />
        {/* Tracking links reveal the tracker on /login; signed-in reporting keeps it below the form. */}
        <Route path="/my" element={<Navigate to="/report/new?view=mine#report-tracker" replace />} />
        <Route path="/complaints/:id" element={<ComplaintRedirect />} />
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function ComplaintRedirect() {
  const { id = '' } = useParams();
  return <Navigate to={`/report/new?track=${encodeURIComponent(id)}#report-tracker`} replace />;
}

/** Old /report links (bookmarks, shared tickets) keep working: the sign-in and tracker page is now /login. */
function ReportRedirect() {
  const { search, hash } = useLocation();
  return <Navigate to={`/login${search}${hash}`} replace />;
}

const Landing = memo(function Landing() {
  return (
    <>
      <div className="backdrop" aria-hidden="true" />
      <div id="app">
        {/* ════════════ HERO ════════════ */}
        <Hero />
        {/* ════════════ STATS ════════════ */}
        <Stats />
        {/* ════════════ HOW IT WORKS — ACCORDION ════════════ */}
        <HowItWorks />
        {/* ════════════ CATEGORIES & AI TRIAGE DIRECTORY ════════════ */}
        <Categories />
        <StudentSignInSection />
        {/* ════════════ REPORT FORM ════════════ */}
        {/* ════════════ CTA ════════════ */}
        <CallToAction />
        {/* ════════════ FOOTER ════════════ */}
        <Footer />
      </div>
      {/* /app */}
      {/* ═══════════════════════════════════════
     COMPLAINT TRACKER & STUDENT DASHBOARD MODAL
═══════════════════════════════════════ */}
      <TrackerModal />
      {/* ═══════════════════════════════════════
     STUDENT AUTHENTICATION MODAL (SIGN IN & SIGN UP WITH ID CARD)
═══════════════════════════════════════ */}
      <StudentAuthModal />
      {/* ═══════════════════════════════════════
     STUDENT ID RE-UPLOAD MODAL
═══════════════════════════════════════ */}
      <ReuploadIdModal />
    </>
  );
});
