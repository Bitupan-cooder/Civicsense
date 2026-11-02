// Markup converted 1:1 from the original admin.html (React migration, step 1).
import { useState } from 'react';
import { closeWorkflow, submitWorkflow, useConsole } from '../console';

// title, subtitle, notice heading, notice text, input label, hint, minimum characters, button label, button class
const ACTIONS: Record<string, [string, string, string, string, string, string, number, string, string]> = {
  rejected: ['Reject Campus Grievance', 'Mandatory justification required for audit log', 'Institutional Rule:', ' Rejection requires an explicit official reason (minimum 5 characters). This justification is permanently recorded in the university activity log and visible to the student.', 'Mandatory Rejection Reason', 'Minimum required characters: 5', 5, 'Confirm Rejection', 'btn btn-red'],
  resolved: ['Mark Grievance Resolved', 'Formal remediation sign-off', 'Resolution Sign-Off:', ' Provide a closing note summarizing the remediation work completed on campus (minimum 5 characters).', 'Mandatory Resolution Closing Note', 'Minimum required characters: 5', 5, 'Sign Off & Resolve', 'btn btn-blue'],
  in_progress: ['Update Remediation Progress', 'Log dispatch or milestone update', 'Progress Logging:', ' Record active work, maintenance crew dispatch, or inspection findings (minimum 3 characters).', 'Remediation Milestone Remark', 'Minimum required characters: 3', 3, 'Log Progress Update', 'btn'],
  accepted: ['Accept Campus Grievance', 'Acknowledge scope & responsibility', 'Department Acceptance:', ' Confirms that this authority has verified the issue and accepted remediation jurisdiction.', 'Official Acceptance Note (Optional)', 'Optional remark (default note applied if empty)', 0, 'Accept Grievance', 'btn'],
};

export function WorkflowActionModal() {
  const { workflow, formKey } = useConsole();
  return <WorkflowForm key={formKey} status={workflow?.status ?? null} />;
}

function WorkflowForm({ status }: { status: string | null }) {
  const [remark, setRemark] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const a = status ? ACTIONS[status] : null;
  const submit = async () => {
    if (!a) return;
    const text = remark.trim();
    if (a[6] > 0 && text.length < a[6]) { setError('Please enter at least ' + a[6] + ' characters for this action.'); return; }
    setBusy(true);
    setError('');
    try {
      await submitWorkflow(text);
    } catch (err) {
      setBusy(false);
      setError((err as Error).message || 'Failed to update workflow.');
    }
  };
  return (
    <div className={a ? "modal-overlay" : "modal-overlay hidden"} id="workflowActionModal">
      {" "}
      <div className="auth-box" style={{ maxWidth: "520px" }}>
        {" "}
        <div className="modal-head" style={{ background: "#ffffff" }}>
          {" "}
          <div>
            {" "}
            <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--ink)" }} id="actionModalTitle">
              {a ? a[0] : 'Action Title'}
            </div>
            {" "}
            <div style={{ fontSize: "12px", color: "#4a6142" }} id="actionModalSubtitle">
              {a ? a[1] : 'Subheading'}
            </div>
            {" "}
          </div>
          {" "}
          <button type="button" onClick={() => closeWorkflow()} style={{ background: "none", border: "none", color: "#4a6142", fontSize: "22px", fontWeight: "700", cursor: "pointer" }}>
            ×
          </button>
          {" "}
        </div>
        {" "}
        <div className="modal-body">
          {" "}
          <div id="actionModalNotice" style={{ background: "#FAF2EB", borderLeft: "3px solid var(--olive)", padding: "8px 12px", borderRadius: "0 6px 6px 0", fontSize: "12px", color: "#4a6142", marginBottom: "14px", lineHeight: "1.45" }}>
            {a ? <><strong>{a[2]}</strong>{a[3]}</> : <>{" "}Notice text{" "}</>}
          </div>
          {" "}
          <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "var(--olive)", textTransform: "uppercase", letterSpacing: "0.02em", marginBottom: "6px" }} id="actionModalInputLabel">
            {a ? a[4] : <>{" "}Official Remark{" "}</>}
          </label>
          {" "}
          <textarea id="actionRemarkInput" rows={4} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--line)", borderRadius: "8px", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box", outline: "none" }} placeholder="Enter official remark..." value={remark} onChange={(e) => setRemark(e.target.value)} />
          {" "}
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }} id="actionCharHint">
            {a ? a[5] : 'Minimum required characters: 5'}
          </div>
          {" "}
          <div id="actionModalErr" style={{ display: error ? "block" : "none", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", marginTop: "10px", lineHeight: "1.4" }}>
            {error}
          </div>
          {" "}
        </div>
        {" "}
        <div className="modal-foot">
          {" "}
          <button type="button" className="btn-outline" onClick={() => closeWorkflow()}>
            Cancel
          </button>
          {" "}
          <button type="button" className={a ? a[8] : 'btn'} id="actionModalSubmitBtn" disabled={busy} onClick={submit}>
            {busy ? 'Recording action...' : a ? a[7] : 'Confirm Action'}
          </button>
          {" "}
        </div>
        {" "}
      </div>
      {" "}
    </div>
  );
}
