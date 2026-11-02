// Markup converted 1:1 from the original admin.html (React migration, step 1).
import { useState } from 'react';
import { closeCreateOfficial, createOfficial, generateRandomPassword, useConsole } from '../console';

export function CreateOfficialModal() {
  const { createOpen, formKey } = useConsole();
  return <CreateForm key={formKey} open={createOpen} />;
}

function CreateForm({ open }: { open: boolean }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('department');
  const [unit, setUnit] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(() => (open ? generateRandomPassword() : ''));
  const o = { name: name.trim(), role, unit: unit.trim(), email: email.trim(), password };
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!o.name || !o.unit || !o.email || !o.password) { setError('All fields are mandatory.'); return; }
    if (o.password.length < 8) { setError('Temporary password must be at least 8 characters long.'); return; }
    setBusy(true);
    setError('');
    try {
      await createOfficial(o);
    } catch (err) {
      setBusy(false);
      setError((err as Error).message || 'Failed to create official account.');
    }
  };
  return (
    <div className={open ? "modal-overlay" : "modal-overlay hidden"} id="createOfficialModal">
      {" "}
      <div className="auth-box" style={{ maxWidth: "540px" }}>
        {" "}
        <div className="modal-head" style={{ background: "#ffffff" }}>
          {" "}
          <div>
            {" "}
            <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--ink)" }}>
              Provision Official Account
            </div>
            {" "}
            <div style={{ fontSize: "12px", color: "#4a6142" }}>
              Create authorized Department or Social Service profile
            </div>
            {" "}
          </div>
          {" "}
          <button type="button" onClick={() => closeCreateOfficial()} style={{ background: "none", border: "none", color: "#4a6142", fontSize: "22px", fontWeight: "700", cursor: "pointer" }}>
            ×
          </button>
          {" "}
        </div>
        {" "}
        <form onSubmit={submit}>
          {" "}
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {" "}
            <div>
              {" "}
              <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "var(--olive)", textTransform: "uppercase", marginBottom: "4px" }}>
                Official Full Name
              </label>
              {" "}
              <input type="text" id="createOffName" required placeholder="e.g. Prof. B. K. Sarma" className="form-input-pass" style={{ marginTop: "0" }} value={name} onChange={(e) => setName(e.target.value)} />
              {" "}
            </div>
            {" "}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {" "}
              <div>
                {" "}
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "var(--olive)", textTransform: "uppercase", marginBottom: "4px" }}>
                  Role Type
                </label>
                {" "}
                <select id="createOffRole" required className="form-input-pass" style={{ marginTop: "0", cursor: "pointer" }} value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="department">
                    Department Head
                  </option>
                  <option value="social_service">
                    Social Service (DUSU)
                  </option>
                </select>
                {" "}
              </div>
              {" "}
              <div>
                {" "}
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "var(--olive)", textTransform: "uppercase", marginBottom: "4px" }}>
                  Unit / Desk Name
                </label>
                {" "}
                <input type="text" id="createOffUnit" required placeholder={"e.g. Electrical & Power Works"} className="form-input-pass" style={{ marginTop: "0" }} value={unit} onChange={(e) => setUnit(e.target.value)} />
                {" "}
              </div>
              {" "}
            </div>
            {" "}
            <div>
              {" "}
              <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "var(--olive)", textTransform: "uppercase", marginBottom: "4px" }}>
                Official Email
              </label>
              {" "}
              <input type="email" id="createOffEmail" required placeholder="e.g. electrical@dibru.ac.in" className="form-input-pass" style={{ marginTop: "0" }} value={email} onChange={(e) => setEmail(e.target.value)} />
              {" "}
            </div>
            {" "}
            <div>
              {" "}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                {" "}
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "var(--olive)", textTransform: "uppercase" }}>
                  Temporary Password
                </label>
                {" "}
                <button type="button" onClick={() => setPassword(generateRandomPassword())} style={{ background: "none", border: "none", fontSize: "11px", fontWeight: "600", color: "var(--blue)", cursor: "pointer" }}>
                  Generate Strong Password
                </button>
                {" "}
              </div>
              {" "}
              <input type="text" id="createOffPassword" required minLength={8} placeholder="Enter temporary password (min 8 chars)" className="form-input-pass" style={{ marginTop: "0" }} value={password} onChange={(e) => setPassword(e.target.value)} />
              {" "}
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                Created via server route using Supabase Service Role. Handled securely and hashed by Supabase Auth.
              </div>
              {" "}
            </div>
            {" "}
            <div id="createOffErrBox" style={{ display: error ? "block" : "none", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", lineHeight: "1.4" }}>
            {error}
          </div>
            {" "}
          </div>
          {" "}
          <div className="modal-foot">
            {" "}
            <button type="button" className="btn-outline" onClick={() => closeCreateOfficial()}>
              Cancel
            </button>
            {" "}
            <button type="submit" className="btn" id="createOffSubmitBtn" disabled={busy}>
              {busy ? 'Provisioning profile...' : 'Create Official Account'}
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
