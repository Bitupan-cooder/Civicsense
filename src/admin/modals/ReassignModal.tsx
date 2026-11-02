// Markup converted 1:1 from the original admin.html (React migration, step 1).
import { useEffect, useState } from 'react';
import type { DepartmentUnit } from '../../civicAuth';
import { closeReassign, fetchDepartmentUnits, shortRef, submitReassign, useConsole } from '../console';

export function ReassignModal() {
  const { reassignId, formKey } = useConsole();
  return <ReassignForm key={formKey} complaintId={reassignId} />;
}

function ReassignForm({ complaintId }: { complaintId: string | null }) {
  const { complaints } = useConsole();
  const complaint = complaints.find((c) => c.id === complaintId);
  const [units, setUnits] = useState<DepartmentUnit[] | string | null>(null); // string: load error
  const [target, setTarget] = useState('');
  const [remark, setRemark] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (complaintId) fetchDepartmentUnits().then(setUnits, (e) => setUnits((e as Error).message));
  }, [complaintId]);
  const submit = async () => {
    if (!target.trim()) { setError('Please select a destination department unit.'); return; }
    setBusy(true);
    setError('');
    try {
      await submitReassign(target.trim(), remark.trim());
    } catch (err) {
      setBusy(false);
      setError((err as Error).message || 'Reassignment failed.');
    }
  };
  return (
    <div className={complaintId ? "modal-overlay" : "modal-overlay hidden"} id="reassignModal">
      {" "}
      <div className="auth-box" style={{ maxWidth: "520px" }}>
        {" "}
        <div className="modal-head" style={{ background: "#ffffff" }}>
          {" "}
          <div>
            {" "}
            <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--ink)" }}>
              Reassign Redressal Solver Unit
            </div>
            {" "}
            <div style={{ fontSize: "12px", color: "#51684c" }} id="reassignModalSubtitle">
              {complaintId ? 'Complaint #' + shortRef(complaintId) + (complaint ? ': ' + complaint.title : '') : 'Complaint #--'}
            </div>
            {" "}
          </div>
          {" "}
          <button type="button" onClick={() => closeReassign()} style={{ background: "none", border: "none", color: "#4a6142", fontSize: "22px", fontWeight: "700", cursor: "pointer" }}>
            ×
          </button>
          {" "}
        </div>
        {" "}
        <div className="modal-body">
          {" "}
          <div style={{ background: "#f8faf4", borderLeft: "3px solid var(--blue)", padding: "8px 12px", borderRadius: "0 6px 6px 0", fontSize: "12px", color: "#1e3a8a", marginBottom: "14px", lineHeight: "1.45" }}>
            {" "}
            <strong>
              Administration Jurisdiction:
            </strong>
            {" "}Transferring this grievance re-routes notification and dispatch responsibilities to the targeted department head.{" "}
          </div>
          {" "}
          <div style={{ marginBottom: "14px" }}>
            {" "}
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "var(--olive)", textTransform: "uppercase", letterSpacing: "0.02em", marginBottom: "6px" }}>
              Target Department Unit
            </label>
            {" "}
            <select id="reassignTargetSelect" className="form-input-pass" style={{ width: "100%", height: "40px", marginTop: "0", cursor: "pointer" }} value={target} onChange={(e) => setTarget(e.target.value)}>
              {units === null ? <option value="">Loading department units...</option>
                : typeof units === 'string' ? <option value="">Failed to load units: {units}</option>
                : <>
                  <option value="">-- Select Destination Department Unit --</option>
                  {units.map((u) => <option key={u.id} value={u.id}>{(u.unit_name || u.name) + ' (' + u.name + ')' + (complaint?.target_unit_id === u.id ? ' [Current Unit]' : '')}</option>)}
                </>}
            </select>
            {" "}
          </div>
          {" "}
          <div>
            {" "}
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "var(--olive)", textTransform: "uppercase", letterSpacing: "0.02em", marginBottom: "6px" }}>
              Administrative Reassignment Remark
            </label>
            {" "}
            <textarea id="reassignRemarkInput" rows={3} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--line)", borderRadius: "8px", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box", outline: "none" }} placeholder="Reason for unit transfer..." value={remark} onChange={(e) => setRemark(e.target.value)} />
            {" "}
          </div>
          {" "}
          <div id="reassignErrBox" style={{ display: error ? "block" : "none", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", marginTop: "12px", lineHeight: "1.4" }}>
            {error}
          </div>
          {" "}
        </div>
        {" "}
        <div className="modal-foot">
          {" "}
          <button type="button" className="btn-outline" onClick={() => closeReassign()}>
            Cancel
          </button>
          {" "}
          <button type="button" className="btn btn-blue" id="reassignSubmitBtn" disabled={busy} onClick={submit}>
            {busy ? 'Reassigning...' : 'Confirm Reassignment'}
          </button>
          {" "}
        </div>
        {" "}
      </div>
      {" "}
    </div>
  );
}
