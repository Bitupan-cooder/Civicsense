// Student app routes (PRD "Pages"). The landing page (/) stays mounted, only hidden, while another route shows:
// animations.js and campusMap.js set it up once at startup and change its DOM directly, so it must not be re-created.
import { memo, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { refreshAnimations } from './animations.js';
import { ComplaintPage } from './pages/ComplaintPage';
import { LoginPage } from './pages/LoginPage';
import { MyComplaintsPage } from './pages/MyComplaintsPage';
import './pages/routes.css';
import { Hero } from './sections/Hero';
import { Stats } from './sections/Stats';
import { HowItWorks } from './sections/HowItWorks';
import { Categories } from './sections/Categories';
import { ReportSection } from './sections/ReportSection';
import { CallToAction } from './sections/CallToAction';
import { Footer } from './sections/Footer';
import { TrackerModal } from './modals/TrackerModal';
import { StudentAuthModal } from './modals/StudentAuthModal';
import { ReuploadIdModal } from './modals/ReuploadIdModal';

/** /report is the landing page scrolled to its report form, which shares the campus map with it. */
function ReportRoute() {
  useEffect(() => { document.getElementById('report')?.scrollIntoView({ block: 'start' }); }, []);
  return null;
}

const LANDING_PATHS = ['/', '/report'];

export function SiteApp() {
  const { pathname } = useLocation();
  const onLanding = LANDING_PATHS.includes(pathname);
  useEffect(() => {
    document.body.classList.toggle('route-page', !onLanding);
    if (onLanding) refreshAnimations(); else window.scrollTo(0, 0);
  }, [onLanding]);
  return (
    <>
      <Landing />
      <Routes>
        <Route path="/" element={null} />
        <Route path="/report" element={<ReportRoute />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/my" element={<MyComplaintsPage />} />
        <Route path="/complaints/:id" element={<ComplaintPage />} />
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
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
        {/* ════════════ REPORT FORM ════════════ */}
        <ReportSection />
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
