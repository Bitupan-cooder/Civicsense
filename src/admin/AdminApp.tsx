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
import { useConsole } from './console';

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
        {/* ══════════ MAIN WORKSPACE ══════════ */}
        <AdminMain />
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
