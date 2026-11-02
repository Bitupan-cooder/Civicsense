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

export function SiteApp() {
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
}
