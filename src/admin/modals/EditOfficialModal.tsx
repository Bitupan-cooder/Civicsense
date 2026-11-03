// Markup converted 1:1 from the original admin.html (React migration, step 1).
import { useState } from 'react';
import { closeEditOfficial, editOfficial, useConsole } from '../console';

export function EditOfficialModal() {
  const { editOfficial: target, formKey } = useConsole();
  return <EditForm key={formKey} target={target} />;
}

function EditForm({ target }: { target: { name: string; unit: string } | null }) {
  const [name, setName] = useState(target?.name ?? '');
  const [unit, setUnit] = useState(target?.unit ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !unit.trim()) { setError('Both name and unit name are required.'); return; }
    setBusy(true);
    setError('');
    try {
      await editOfficial(name.trim(), unit.trim());
    } catch (err) {
      setBusy(false);
      setError((err as Error).message || 'Failed to update profile.');
    }
  };
  return (
    <div className={target ? "modal-overlay" : "modal-overlay hidden"} id="editOfficialModal">
      {" "}
      <div className="auth-box" style={{ maxWidth: "480px" }}>
        {" "}
        <div className="modal-head" style={{ background: "#ffffff" }}>
          {" "}
          <div>
            {" "}
            <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--ink)" }}>
              Edit Official Profile
            </div>
            {" "}
            <div style={{ fontSize: "12px", color: "#4a6142" }} id="editOffSubtitle">
              {target ? 'Profile: ' + target.name : 'Profile ID: --'}
            </div>
            {" "}
          </div>
          {" "}
          <button type="button" onClick={() => closeEditOfficial()} style={{ background: "none", border: "none", color: "#4a6142", fontSize: "22px", fontWeight: "700", cursor: "pointer" }}>
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
              <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "var(--olive)", marginBottom: "4px" }}>
                Official Name
              </label>
              {" "}
              <input type="text" id="editOffName" required className="form-input-pass" style={{ marginTop: "0" }} value={name} onChange={(e) => setName(e.target.value)} />
              {" "}
            </div>
            {" "}
            <div>
              {" "}
              <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "var(--olive)", marginBottom: "4px" }}>
                Unit / Desk Name
              </label>
              {" "}
              <input type="text" id="editOffUnit" required className="form-input-pass" style={{ marginTop: "0" }} value={unit} onChange={(e) => setUnit(e.target.value)} />
              {" "}
            </div>
            {" "}
            <div id="editOffErrBox" style={{ display: error ? "block" : "none", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>
            {error}
          </div>
            {" "}
          </div>
          {" "}
          <div className="modal-foot">
            {" "}
            <button type="button" className="btn-outline" onClick={() => closeEditOfficial()}>
              Cancel
            </button>
            {" "}
            <button type="submit" className="btn" id="editOffSubmitBtn" disabled={busy}>
              {busy ? 'Saving changes...' : 'Save Changes'}
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
