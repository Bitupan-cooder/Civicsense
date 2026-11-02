// Markup converted 1:1 from the original admin.html (React migration, step 1).
import { useState } from 'react';
import { closeResetPassword, generateRandomPassword, resetPassword, useConsole } from '../console';

export function ResetPasswordModal() {
  const { resetOfficial: target, formKey } = useConsole();
  return <ResetForm key={formKey} target={target} />;
}

function ResetForm({ target }: { target: { name: string } | null }) {
  const [password, setPassword] = useState(() => (target ? generateRandomPassword() : ''));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim().length < 8) { setError('Password must be at least 8 characters long.'); return; }
    setBusy(true);
    setError('');
    try {
      await resetPassword(password.trim());
    } catch (err) {
      setBusy(false);
      setError((err as Error).message || 'Failed to reset password.');
    }
  };
  return (
    <div className={target ? "modal-overlay" : "modal-overlay hidden"} id="resetPasswordModal">
      {" "}
      <div className="auth-box" style={{ maxWidth: "480px" }}>
        {" "}
        <div className="modal-head" style={{ background: "#ffffff" }}>
          {" "}
          <div>
            {" "}
            <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--ink)" }}>
              Reset Account Password
            </div>
            {" "}
            <div style={{ fontSize: "12px", color: "#4a6142" }} id="resetPwSubtitle">
              {target ? 'Official: ' + target.name : 'Official: --'}
            </div>
            {" "}
          </div>
          {" "}
          <button type="button" onClick={() => closeResetPassword()} style={{ background: "none", border: "none", color: "#4a6142", fontSize: "22px", fontWeight: "700", cursor: "pointer" }}>
            ×
          </button>
          {" "}
        </div>
        {" "}
        <form onSubmit={submit}>
          {" "}
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {" "}
            <div style={{ background: "#FAF2EB", borderLeft: "3px solid var(--olive)", padding: "8px 12px", borderRadius: "0 6px 6px 0", fontSize: "12px", color: "#4a6142", lineHeight: "1.45" }}>
              {" "}Assigns a new temporary password and flags account for mandatory password change on subsequent sign-in.{" "}
            </div>
            {" "}
            <div>
              {" "}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                {" "}
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "var(--olive)", textTransform: "uppercase" }}>
                  New Temporary Password
                </label>
                {" "}
                <button type="button" onClick={() => setPassword(generateRandomPassword())} style={{ background: "none", border: "none", fontSize: "11px", fontWeight: "600", color: "var(--blue)", cursor: "pointer" }}>
                  Generate Password
                </button>
                {" "}
              </div>
              {" "}
              <input type="text" id="resetNewPasswordInput" required minLength={8} placeholder="Enter new password (min 8 chars)" className="form-input-pass" style={{ marginTop: "0" }} value={password} onChange={(e) => setPassword(e.target.value)} />
              {" "}
            </div>
            {" "}
            <div id="resetPwErrBox" style={{ display: error ? "block" : "none", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>
            {error}
          </div>
            {" "}
          </div>
          {" "}
          <div className="modal-foot">
            {" "}
            <button type="button" className="btn-outline" onClick={() => closeResetPassword()}>
              Cancel
            </button>
            {" "}
            <button type="submit" className="btn" id="resetPwSubmitBtn" disabled={busy}>
              {busy ? 'Resetting password...' : 'Apply New Password'}
            </button>
            {" "}
          </div>
          {" "}
        </form>
        {" "}
      </div>
      {" "}
    </div>
  );
}
