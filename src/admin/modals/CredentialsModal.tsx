// Markup converted 1:1 from the original admin.html (React migration, step 1).
import { closeCredentials, copyCredentials, useConsole } from '../console';

const ROLE_LABEL: Record<string, string> = { department: 'Department Head', social_service: 'Social Service' };

export function CredentialsModal() {
  const { credentials: c } = useConsole();
  return (
    <div className={c ? "modal-overlay" : "modal-overlay hidden"} id="credentialsModal">
      {" "}
      <div className="auth-box" style={{ maxWidth: "500px" }}>
        {" "}
        <div className="modal-head" style={{ background: "#ffffff" }}>
          {" "}
          <div>
            {" "}
            <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--ink)" }}>
              Official Account Credentials
            </div>
            {" "}
            <div style={{ fontSize: "12px", color: "#4a6142" }}>
              One-time display verification
            </div>
            {" "}
          </div>
          {" "}
          <button type="button" onClick={() => closeCredentials()} style={{ background: "none", border: "none", color: "#4a6142", fontSize: "22px", fontWeight: "700", cursor: "pointer" }}>
            ×
          </button>
          {" "}
        </div>
        {" "}
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {" "}
          <div style={{ background: "#fffbeb", borderLeft: "3px solid #d97706", padding: "10px 12px", borderRadius: "0 6px 6px 0", fontSize: "12px", color: "#92400e", lineHeight: "1.45" }}>
            {" "}
            <strong>
              Security Notice:
            </strong>
            {" "}The temporary password is shown once and cannot be retrieved again. Securely convey these credentials to the officer. The user is required to set a permanent password upon first login.{" "}
          </div>
          {" "}
          <div style={{ background: "#ffffff", border: "1.5px solid var(--line)", borderRadius: "12px", padding: "14px 18px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {" "}
            <div>
              {" "}
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--olive)" }}>
                Official:
              </span>
              {" "}
              <span style={{ fontSize: "13.5px", fontWeight: "700", color: "var(--ink)", marginLeft: "6px" }} id="credName">
                {c ? c.name : '--'}
              </span>
              {" "}
            </div>
            {" "}
            <div>
              {" "}
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--olive)" }}>
                Email:
              </span>
              {" "}
              <span style={{ fontSize: "13px", color: "#334155", marginLeft: "6px" }} id="credEmail">
                {c ? c.email : '--'}
              </span>
              {" "}
            </div>
            {" "}
            <div>
              {" "}
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--olive)" }}>
                Unit:
              </span>
              {" "}
              <span style={{ fontSize: "13px", color: "#334155", marginLeft: "6px" }} id="credUnit">
                {c ? c.unit + ' (' + (ROLE_LABEL[c.role] ?? c.role) + ')' : '--'}
              </span>
              {" "}
            </div>
            {" "}
            <div style={{ marginTop: "6px", paddingTop: "10px", borderTop: "1px dashed var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {" "}
              <div>
                {" "}
                <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--olive)", display: "block" }}>
                  Temporary Password
                </span>
                {" "}
                <span style={{ fontFamily: "monospace", fontSize: "15px", fontWeight: "700", color: "#0e3018", background: "var(--pill)", padding: "2px 8px", borderRadius: "6px", display: "inline-block", marginTop: "2px" }} id="credPassword">
                  {c ? c.password : '--'}
                </span>
                {" "}
              </div>
              {" "}
              <button type="button" className="btn-outline" style={{ height: "32px", fontSize: "11.5px", padding: "0 12px" }} onClick={() => copyCredentials()}>
                {" "}Copy Credentials{" "}
              </button>
              {" "}
            </div>
            {" "}
          </div>
          {" "}
        </div>
        {" "}
        <div className="modal-foot">
          {" "}
          <button type="button" className="btn" onClick={() => closeCredentials()}>
            Done
          </button>
          {" "}
        </div>
        {" "}
      </div>
      {" "}
    </div>
  );
}
