// Markup converted 1:1 from the original admin.html (React migration, step 1).
import { useState } from 'react';
import { gateLogin, setGateField, switchGateRole, useConsole, type GateRole } from '../console';
import { requestOfficialPasswordReset } from '../../civicAuth';

const ROLE_NOTICE: Record<GateRole, [string, string, string]> = {
  department: ['Department Head Console:', ' Manage maintenance dispatch, update resolution milestones, and verify assigned tickets.', 'e.g. electrical@dibru.ac.in'],
  administration: ['Central Administration Console:', ' Full triage oversight, department officer provisioning, reassignments, and executive logs.', 'e.g. admin@dibru.ac.in'],
  social_service: ['DUSU Social Service Desk:', ' Executive campus grievance oversight, ground audit checks, and union escalation.', 'e.g. dusu@dibru.ac.in'],
};

export function AuthGate() {
  const g = useConsole();
  const [showPassword, setShowPassword] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const sendResetLink = async () => {
    const emailInput = document.getElementById('gateEmail') as HTMLInputElement | null;
    if (!g.gateEmail.trim()) {
      setResetError('Enter your official email address first.');
      setResetMessage('');
      emailInput?.focus();
      return;
    }
    if (emailInput && !emailInput.checkValidity()) {
      emailInput.reportValidity();
      return;
    }
    setResetBusy(true);
    setResetError('');
    setResetMessage('');
    try {
      await requestOfficialPasswordReset(g.gateEmail);
      setResetMessage('If an official account exists for this email, a password reset link has been sent.');
    } catch (err) {
      setResetError((err as Error).message || 'Could not send the password reset email.');
    } finally {
      setResetBusy(false);
    }
  };
  const tab = (role: GateRole) => (g.gateRole === role
    ? { className: 'auth-subtab active', colors: { background: '#ffffff', color: 'var(--ink)' } }
    : { className: 'auth-subtab', colors: { background: 'transparent', color: '#4a6142' } });
  const [noticeTitle, noticeText, placeholder] = ROLE_NOTICE[g.gateRole];
  return (
    <div id="authGateContainer" style={{ display: g.auth === 'gate' ? "flex" : "none", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "24px 16px", background: "var(--bg)" }}>
      {" "}
      <div style={{ background: "#ffffff", border: "1.5px solid var(--line)", borderRadius: "var(--radius)", maxWidth: "520px", width: "100%", boxShadow: "0 12px 36px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        {" "}
        {/* Card Header */}
        {" "}
        <div style={{ background: "#ffffff", borderBottom: "1.5px solid var(--line)", padding: "22px 26px 18px" }}>
          {" "}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            {" "}
            <a href="/" className="brand" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "18px", fontWeight: "700", color: "var(--olive)", textDecoration: "none" }}>
              {" "}
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <path d="M11 2C11 2 4 6 4 13a7 7 0 0014 0C18 6 11 2 11 2z" fill="currentColor" opacity=".9" />
                <line x1="11" y1="14" x2="11" y2="20" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              {" "}CivicSense{" "}
              <span className="brand-sub" style={{ fontSize: "11px", background: "var(--pill)", color: "#0e3018", padding: "2px 8px", borderRadius: "999px", fontWeight: "600" }}>
                Official Portal
              </span>
              {" "}
            </a>
            {" "}
            <a href="/" className="btn-outline" style={{ height: "28px", fontSize: "11px", padding: "0 10px", textDecoration: "none" }}>
              ← Student Portal
            </a>
            {" "}
          </div>
          {" "}
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--ink)", letterSpacing: "-0.03em", marginBottom: "4px" }}>
            Official Redressal Console
          </h1>
          {" "}
          <p style={{ fontSize: "12.5px", color: "#4a6142", lineHeight: "1.45" }}>
            {" "}Restricted access for University Administration, Department Chairmen, and DUSU Council.{" "}
          </p>
          {" "}
        </div>
        {" "}
        {/* Card Body */}
        {" "}
        <div style={{ padding: "22px 26px 26px" }}>
          {" "}
          {/* 3 Role Tabs */}
          {" "}
          <div className="auth-subtabs" style={{ display: "flex", gap: "6px", background: "#f2f8ec", padding: "4px", borderRadius: "10px", marginBottom: "18px" }}>
            {" "}
            <button type="button" className={tab('department').className} id="gateTabDept" onClick={() => switchGateRole('department')} style={{ flex: "1", height: "34px", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "700", cursor: "pointer", ...tab('department').colors, boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
              Department
            </button>
            {" "}
            <button type="button" className={tab('administration').className} id="gateTabAdmin" onClick={() => switchGateRole('administration')} style={{ flex: "1", height: "34px", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "600", cursor: "pointer", ...tab('administration').colors }}>
              Administration
            </button>
            {" "}
            <button type="button" className={tab('social_service').className} id="gateTabSocial" onClick={() => switchGateRole('social_service')} style={{ flex: "1", height: "34px", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "600", cursor: "pointer", ...tab('social_service').colors }}>
              Social (DUSU)
            </button>
            {" "}
          </div>
          {" "}
          <div id="gateRoleNotice" style={{ background: "#FAF2EB", borderLeft: "3px solid var(--olive)", padding: "8px 12px", borderRadius: "0 6px 6px 0", fontSize: "12px", color: "#4a6142", marginBottom: "18px", lineHeight: "1.45" }}>
            {" "}
            <strong>
              {noticeTitle}
            </strong>
            {noticeText}
          </div>
          {" "}
          <form id="gateLoginForm" onSubmit={(e) => { e.preventDefault(); gateLogin(); }}>
            {" "}
            <div style={{ marginBottom: "14px" }}>
              {" "}
              <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "var(--olive)", textTransform: "uppercase", letterSpacing: "0.02em", marginBottom: "6px" }}>
                Official Email
              </label>
              {" "}
              <input type="email" id="gateEmail" required placeholder={placeholder} value={g.gateEmail} onChange={(e) => { setGateField('gateEmail', e.target.value); setResetMessage(''); setResetError(''); }} style={{ width: "100%", height: "40px", padding: "0 12px", border: "1.5px solid var(--line)", borderRadius: "8px", fontSize: "13px", boxSizing: "border-box", outline: "none" }} />
              {" "}
            </div>
            {" "}
            <div style={{ marginBottom: "16px" }}>
              {" "}
              <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "var(--olive)", textTransform: "uppercase", letterSpacing: "0.02em", marginBottom: "6px" }}>
                Authorized Password
              </label>
              {" "}
              <div style={{ position: "relative" }}>
                <input type={showPassword ? "text" : "password"} id="gatePassword" required autoComplete="current-password" placeholder="Enter password" value={g.gatePassword} onChange={(e) => setGateField('gatePassword', e.target.value)} style={{ width: "100%", height: "40px", padding: "0 72px 0 12px", border: "1.5px solid var(--line)", borderRadius: "8px", fontSize: "13px", boxSizing: "border-box", outline: "none" }} />
                <button type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} style={{ position: "absolute", top: 0, right: "8px", height: "40px", border: 0, background: "transparent", color: "var(--olive)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '7px' }}>
                <button type="button" onClick={sendResetLink} disabled={resetBusy} style={{ border: 0, padding: '3px 0', background: 'transparent', color: 'var(--olive)', fontSize: '12px', fontWeight: 650, cursor: resetBusy ? 'wait' : 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                  {resetBusy ? 'Sending reset link...' : 'Forgot password?'}
                </button>
              </div>
              {" "}
            </div>
            {" "}
            <div id="gateErrBox" style={{ display: g.gateError ? "block" : "none", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", marginBottom: "16px", lineHeight: "1.4" }}>
              {g.gateError}
            </div>
            {resetMessage && <p role="status" style={{ background: '#eff8f1', border: '1px solid #cde8d0', color: '#176c3a', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, marginBottom: '14px', lineHeight: 1.4 }}>{resetMessage}</p>}
            {resetError && <p role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, marginBottom: '14px', lineHeight: 1.4 }}>{resetError}</p>}
            {" "}
            <button type="submit" id="gateSubmitBtn" className="btn" disabled={g.gateBusy} style={{ width: "100%", height: "44px", fontSize: "13.5px", fontWeight: "700", borderRadius: "8px" }}>
              {g.gateBusy ? 'Verifying credentials...' : <>{" "}Sign In to Console{" "}</>}
            </button>
            {" "}
          </form>
          {" "}
          <div style={{ marginTop: "18px", paddingTop: "16px", borderTop: "1px solid var(--line)", fontSize: "11.5px", color: "#64748b", lineHeight: "1.5" }}>
            {" "}Note: Official accounts are provisioned exclusively by Central Administration. Students must submit and track complaints via the{" "}
            <a href="/" style={{ color: "var(--olive)", fontWeight: "600" }}>
              Student Portal
            </a>
            .{" "}
          </div>
          {" "}
        </div>
        {" "}
      </div>
      {" "}
    </div>
  );
}
