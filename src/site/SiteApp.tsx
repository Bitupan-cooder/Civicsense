// Student app routes (PRD "Pages"). The landing page (/) stays mounted, only hidden, while another route shows.
import { memo, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import * as auth from '../civicAuth';
import { showToast } from '../toast';
import { useStudentSession } from './studentSession';
import { refreshAnimations } from './animations.js';
import { ReportFormPage, ReportPage, WelcomePage } from './pages/ReportPage';
import './pages/routes.css';
import { Hero } from './sections/Hero';
import { Stats } from './sections/Stats';
import { HowItWorks } from './sections/HowItWorks';
import { Categories } from './sections/Categories';
import { CallToAction } from './sections/CallToAction';
import { StudentSignInSection } from './sections/StudentSignInSection';
import { Footer } from '../components/ui/sticker-slap-footer';
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
      <ChatLink />
      <Landing />
      <Routes>
        <Route path="/" element={null} />
        <Route path="/login" element={<ReportPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/report/new" element={<ReportFormPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

/**
 * Agent tag: the bot privately sends /login?link=<token>. Once a student is signed in, that Telegram or Discord
 * account is linked to theirs. Signed out, /login shows its sign-in form and the link waits in the URL.
 */
function ChatLink() {
  const [params, setParams] = useSearchParams();
  const { profile } = useStudentSession();
  const token = params.get('link');
  useEffect(() => {
    if (!token || profile === undefined) return;
    if (profile === null) { showToast('Sign in to link your chat account to CivicSense.', 'info'); return; }
    const drop = () => setParams((p) => { p.delete('link'); return p; }, { replace: true });
    auth.linkChatAccount(token).then(
      (r) => { drop(); showToast(`${{ telegram: 'Telegram', discord: 'Discord', moodle: 'Moodle' }[r.platform]} linked. You can now tag CivicSense in campus groups and forums.`, 'success'); },
      (err) => { drop(); showToast((err as Error).message, 'error'); },
    );
  }, [token, profile, setParams]);
  return null;
}

const Landing = memo(function Landing() {
  return (
    <>
      <div className="backdrop" aria-hidden="true" />
      <div id="app">
        {/* display: contents: a landmark only, no box, so the layout is unchanged */}
        <main style={{ display: 'contents' }}>
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
        </main>
        {/* ════════════ FOOTER ════════════ */}
        <Footer />
      </div>
      {/* /app */}
      {/* ═══════════════════════════════════════
     COMPLAINT TRACKER & STUDENT DASHBOARD MODAL
═══════════════════════════════════════ */}
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
