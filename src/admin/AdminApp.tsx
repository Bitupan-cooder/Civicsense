import { AuthLoading } from './components/AuthLoading';
import { AuthGate } from './components/AuthGate';
import { AdminHeader } from './components/AdminHeader';
import { AdminMain } from './components/AdminMain';
import { ReassignModal } from './modals/ReassignModal';
import { CreateOfficialModal } from './modals/CreateOfficialModal';
import { CredentialsModal } from './modals/CredentialsModal';
import { EditOfficialModal } from './modals/EditOfficialModal';
import { ResetPasswordModal } from './modals/ResetPasswordModal';
import { ComplaintDetailModal } from './modals/ComplaintDetailModal';
import { IdCardModal } from './modals/IdCardModal';
import { WorkflowActionModal } from './modals/WorkflowActionModal';
import { openDocket, useConsole } from './console';
import { useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { CampusMapPage } from './pages/CampusMapPage';
import { ConsoleNav } from './pages/ConsoleNav';
import { DuplicatesPage } from './pages/DuplicatesPage';
import { ReviewQueuePage } from './pages/ReviewQueuePage';
import { RoutingEditorPage } from './pages/RoutingEditorPage';
import { StatsPage } from './pages/StatsPage';

// Officials' routes (PRD "Pages"): officers land on /authority, the administration on /admin.
// The gate shows at whatever URL was opened, so signing in returns there (the PRD's ?next).
function AdminOnly({ children }: { children: ReactNode }) {
  const { profile } = useConsole();
  if (profile && profile.role !== 'administration') return <Navigate to="/authority" replace />;
  return <>{children}</>;
}

/** Unknown paths and /admin.html go to the role's home. */
function RoleHome() {
  const { profile } = useConsole();
  if (!profile) return null; // wait for sign-in: the gate shows, then the role decides
  return <Navigate to={profile.role === 'administration' ? '/admin' : '/authority'} replace />;
}

/** ?complaint=<id> opens that docket (links from notifications, e-mails, the map). */
function DocketFromUrl() {
  const [params] = useSearchParams();
  const { loaded } = useConsole();
  const id = params.get('complaint');
  useEffect(() => { if (loaded && id) openDocket(id); }, [loaded, id]);
  return null;
}

export function AdminApp() {
  const { auth } = useConsole();
  return (
    <>
      {/* ══════════ SESSION LOADING SPINNER ══════════ */}
      <AuthLoading />
      {/* ══════════ OFFICIAL AUTHENTICATION GATE (SHOWN WHEN NOT LOGGED IN) ══════════ */}
      <AuthGate />
      {/* ══════════ AUTHENTICATED WORKSPACE (HIDDEN UNTIL AUTHENTICATED) ══════════ */}
      <div id="authenticatedWorkspace" style={{ display: auth === 'workspace' ? "block" : "none" }}>
        {/* ══════════ FLOATING TOP NAVIGATION BAR (MATCHING HOME) ══════════ */}
        <AdminHeader />
        <ConsoleNav />
        <DocketFromUrl />
        {/* ══════════ MAIN WORKSPACE ══════════ */}
        <Routes>
          <Route path="/authority" element={<AdminMain />} />
          <Route path="/admin" element={<AdminOnly><AdminMain /></AdminOnly>} />
          <Route path="/admin/review" element={<AdminOnly><ReviewQueuePage /></AdminOnly>} />
          <Route path="/admin/duplicates" element={<AdminOnly><DuplicatesPage /></AdminOnly>} />
          <Route path="/admin/stats" element={<AdminOnly><StatsPage /></AdminOnly>} />
          <Route path="/admin/routing" element={<AdminOnly><RoutingEditorPage /></AdminOnly>} />
          <Route path="/map" element={<CampusMapPage />} />
          <Route path="*" element={<RoleHome />} />
        </Routes>
      </div>
      {/* /#authenticatedWorkspace */}
      {/* ══════════ REASSIGN UNIT MODAL (ADMIN ONLY) ══════════ */}
      <ReassignModal />
      {/* ══════════ PROVISION OFFICIAL ACCOUNT MODAL (ADMIN ONLY) ══════════ */}
      <CreateOfficialModal />
      {/* ══════════ ONE-TIME CREDENTIALS PRESENTATION MODAL ══════════ */}
      <CredentialsModal />
      {/* ══════════ EDIT OFFICIAL MODAL ══════════ */}
      <EditOfficialModal />
      {/* ══════════ RESET OFFICIAL PASSWORD MODAL ══════════ */}
      <ResetPasswordModal />
      {/* ══════════ COMPLAINT FULL DOCKET MODAL ══════════ */}
      <ComplaintDetailModal />
      {/* ══════════ STUDENT ID CARD PREVIEW MODAL ══════════ */}
      <IdCardModal />
      {/* ══════════ ACTION REMARK / REASON PROMPT MODAL ══════════ */}
      <WorkflowActionModal />
    </>
  );
}
