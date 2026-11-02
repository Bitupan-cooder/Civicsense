// Complaint form, its sign-in gate and the success card, rendered from ../reportForm.ts.
// These elements always stay mounted (only `display` changes): animations.js attaches GSAP reveal animations to them.
import { useEffect, useRef, type CSSProperties } from 'react';
import {
  addCameraPhoto, addEvidenceFiles, clearReportSuccess, LOCATION_OPTIONS, removeEvidenceFile, resetReportForm, setCategory,
  setCustomLocation, setDescription, setField, setHideName, setLocation, setVisibility, submitReport, useReportForm, type FocusField, type Visibility,
} from '../reportForm';
import { openStudentAuth, useStudentSession } from '../studentSession';
import { ReportAuthNotice } from './StudentAuthWidgets';
import { openTracker, openTrackerWithId } from '../tracker';
import type { Analysis } from '../../civicAuth';
import { categoryLabel, PriorityChip } from '../../RouteTracker';
import { useFeatures } from '../../NotificationBell';

/** PRD confirmation: the AI's category, place and summary, and the posts it went to (or that it went to review). */
function FiledAs({ analysis }: { analysis: Analysis | 'pending' }) {
  const box: CSSProperties = { textAlign: 'left', background: '#ffffff', border: '1px solid #cbe3b8', borderRadius: '10px', padding: '10px 12px', margin: '-6px 0 16px', fontSize: '12.5px', color: '#1a3010', lineHeight: 1.5 };
  if (analysis === 'pending') return <div style={box}>Filing your complaint: reading it and routing it to the right posts…</div>;
  return (
    <div style={box}>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', fontWeight: 700 }}>
        Filed as {categoryLabel(analysis.category)} <PriorityChip priority={analysis.priority} />
        {analysis.location_text && <span style={{ fontWeight: 500 }}>· {analysis.location_text}</span>}
      </div>
      <div style={{ marginTop: '4px' }}>{analysis.summary_en}</div>
      <div lang="as" style={{ color: '#334155' }}>{analysis.summary_as}</div>
      <div style={{ marginTop: '6px', fontWeight: 600 }}>
        {analysis.needs_review
          ? 'Sent to the administration for review before routing.'
          : 'Sent to: ' + analysis.routes.map((r) => r.post_title + (r.kind === 'copy' ? ' (copied)' : '')).join(', ')}
      </div>
    </div>
  );
}

const SHOWN_AS_COLUMN: CSSProperties = { display: 'flex', flexDirection: 'column' };

function sizeLabel(bytes: number): string {
  const kb = Math.round(bytes / 1024);
  return kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB';
}

export function ReportSuccessCard() {
  const { profile } = useStudentSession();
  const { success } = useReportForm();
  const shown = !!profile && !!success;
  return (
    <div className="success-card" id="successCard" style={shown ? { display: "flex", width: "100%", flexDirection: "column" } : { display: "none", width: "100%" }}>
      {" "}
      <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--olive)", marginBottom: "8px" }}>
        Complaint Registered &amp; Saved Permanently
      </div>
      {" "}
      <div className="ticket-id" id="ticketId">
        {success ? success.ticket : 'CS-0000'}
      </div>
      {" "}
      <div id="successSummary" style={{ fontSize: "13px", color: "#1a3010", margin: "10px 0 18px", lineHeight: "1.5" }}>
        {success ? success.summary : <>{" "}Your complaint has been submitted to the redressal portal.{" "}</>}
      </div>
      {success?.analysis && <FiledAs analysis={success.analysis} />}
      {" "}
      <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
        {" "}
        <button className="btn" onClick={() => openTrackerWithId(success ? success.ticket : 'CS-0000')}>
          View in Student Dashboard
        </button>
        {" "}
        <button className="btn-outline" onClick={() => resetReportForm()}>
          File Another
        </button>
        {" "}
      </div>
      {" "}
    </div>
  );
}

export function ReportAuthGate() {
  const { profile } = useStudentSession();
  // before the session check: no display override (visible), as in the original markup
  const display = profile === undefined ? {} : { display: profile ? 'none' : 'block' };
  return (
    <div className="report-auth-gate-card reveal" id="reportAuthGate" style={{ width: "100%", background: "#ffffff", border: "1.5px solid var(--line)", borderRadius: "22px", padding: "38px 28px", textAlign: "center", boxShadow: "0 8px 24px rgba(20,50,20,0.04)", marginTop: "20px", ...display }}>
      {" "}
      <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#eef8e5", color: "var(--olive)", display: "inline-flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
        {" "}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        {" "}
      </div>
      {" "}
      <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: "8px" }}>
        Student Sign In Required to Lodge Complaints
      </h3>
      {" "}
      <p style={{ fontSize: "13.5px", color: "#3d5236", lineHeight: "1.55", maxWidth: "540px", margin: "0 auto 20px" }}>
        {" "}To maintain accountability, protect student privacy, and enable real-time status tracking, you must sign in with your verified Dibrugarh University student account to submit a grievance.{" "}
      </p>
      {" "}
      <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
        {" "}
        <button type="button" className="btn" onClick={() => openStudentAuth()} style={{ height: "42px", fontSize: "13px", padding: "0 24px", fontWeight: "700" }}>
          {" "}Sign In / Register with Student ID{" "}
        </button>
        {" "}
        <button type="button" className="btn-outline" onClick={() => openTracker()} style={{ height: "42px", fontSize: "13px", padding: "0 18px", fontWeight: "600" }}>
          {" "}Track Registered Grievance{" "}
        </button>
        {" "}
      </div>
      {" "}
      <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #e2ebd8", fontSize: "11.5px", color: "#617a58", display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
        {" "}
        <span>
          Official Dibrugarh University Redressal
        </span>
        {" "}
        <span>
          ·
        </span>
        {" "}
        <span>
          Verified Student Accounts Only
        </span>
        {" "}
        <span>
          ·
        </span>
        {" "}
        <span>
          Zero Spam Policy
        </span>
        {" "}
      </div>
      {" "}
    </div>
  );
}

export function ReportForm() {
  const { profile } = useStudentSession();
  const form = useReportForm();
  const features = useFeatures();
  const fields = useRef<Partial<Record<FocusField, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>>({});
  const cameraInput = useRef<HTMLInputElement>(null);

  // signing out hides the success card, so signing back in shows an empty form again
  useEffect(() => { if (profile === null) clearReportSuccess(); }, [profile]);

  const shown = !!profile && !form.success;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = await submitReport();
    if (invalid) fields.current[invalid]?.focus();
  };

  return (
    <form className="report-form reveal" id="reportForm" onSubmit={submit} style={shown ? SHOWN_AS_COLUMN : { display: "none" }}>
      {" "}
      {/* Student Auth Banner */}
      {" "}
      <div id="formStudentAuthNotice" style={{ background: "#f4f9ef", border: "1px solid #cbe3b8", borderRadius: "10px", padding: "12px 14px", fontSize: "12.5px", color: "#204018", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        {" "}
        <ReportAuthNotice />
        {" "}
      </div>
      {" "}
      {/* Title */}
      {" "}
      <div className="form-group full">
        {" "}
        <label className="form-label" htmlFor="fTitle">
          Complaint Title *
        </label>
        {" "}
        <input className="form-input" id="fTitle" type="text" required placeholder="Brief summary of the issue (e.g. Water shortage in Hostel 2, Broken switchboard in CCSA)"
          ref={(el) => { fields.current.fTitle = el; }} value={form.title} onChange={(e) => setField('title', e.target.value)} />
        {" "}
        <span className="form-error" id="titleError" style={{ display: form.titleError ? "block" : "none" }}>
          Please enter a complaint title (minimum 5 characters).
        </span>
        {" "}
      </div>
      {" "}
      {/* Category and Visibility Row */}
      {" "}
      <div className="form-row">
        {" "}
        {/* Category */}
        {" "}
        <div className="form-group" style={{ flex: "1" }}>
          {" "}
          <label className="form-label" htmlFor="fCategory">
            Issue Category *
          </label>
          {" "}
          <select className="form-select" id="fCategory" required ref={(el) => { fields.current.fCategory = el; }} value={form.category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">
              Select Category
            </option>
            <option value="Hostel Facilities">
              Hostel Facilities &amp; Living
            </option>
            <option value={"Water & Plumbing"}>
              Water Supply &amp; Plumbing (PHE)
            </option>
            <option value={"Electrical & Lighting"}>
              Electrical Maintenance &amp; Lighting
            </option>
            <option value={"Sanitation & Waste"}>
              Sanitation &amp; Waste Disposal
            </option>
            <option value="Academic Labs">
              Academic Labs &amp; Quad
            </option>
            <option value={"Network & IT"}>
              Network, Wi-Fi &amp; IT Helpdesk
            </option>
            <option value="Campus Security">
              Campus Safety &amp; Security
            </option>
            <option value="Other">
              Other Campus Facilities
            </option>
          </select>
          {" "}
        </div>
        {" "}
        {/* Visibility Level */}
        {" "}
        <div className="form-group" style={{ flex: "1" }}>
          {" "}
          <label className="form-label" htmlFor="fVisibility">
            Privacy &amp; Visibility Level *
          </label>
          {" "}
          <select className="form-select" id="fVisibility" required value={form.visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
            <option value="department">
              Department (Administration + Assigned Department + You)
            </option>
            <option value="administration">
              Administration Only (Registrar &amp; Proctor + You)
            </option>
            <option value="social_service">
              Social Service (Administration + All Departments + DUSU + You)
            </option>
          </select>
          {" "}
        </div>
        {" "}
      </div>
      {" "}
      {/* Target Unit (Conditional on Visibility == department) */}
      {" "}
      <div className="form-group full" id="fTargetUnitContainer" style={form.visibility === 'department' ? SHOWN_AS_COLUMN : { display: 'none' }}>
        {" "}
        <label className="form-label" htmlFor="fTargetUnit">
          Target Department Unit *
        </label>
        {" "}
        <select className="form-select" id="fTargetUnit" ref={(el) => { fields.current.fTargetUnit = el; }} value={form.targetUnit} onChange={(e) => setField('targetUnit', e.target.value)}>
          {form.units ? (
            <>
              <option value="">Select University Department Unit</option>
              {form.units.map((u) => (
                <option key={u.id} value={u.id}>{u.name + (u.unit_name ? ' — ' + u.unit_name : ' (' + u.role + ')')}</option>
              ))}
            </>
          ) : (
            <option value="">
              Loading department units...
            </option>
          )}
        </select>
        {" "}
        <span style={{ fontSize: "11px", color: "#5a6e50", marginTop: "2px" }}>
          Select the university department responsible for resolving this grievance.
        </span>
        {" "}
      </div>
      {" "}
      {/* Description */}
      {" "}
      <div className="form-group full">
        {" "}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
          {" "}
          <label className="form-label" htmlFor="fDesc" style={{ margin: "0" }}>
            Detailed Description *
          </label>
          {" "}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {" "}
            <span id="aiLangIndicator" style={{ fontSize: "11px", fontWeight: "600", color: "var(--olive)", background: "var(--pill)", padding: "3px 9px", borderRadius: "999px" }}>
              {form.language ?? <>{" "}Assamese / English{" "}</>}
            </span>
            {" "}
          </div>
          {" "}
        </div>
        {" "}
        <textarea className="form-textarea" id="fDesc" required minLength={8} rows={4} placeholder="Describe the grievance in detail: exact location, duration, and defect..."
          ref={(el) => { fields.current.fDesc = el; }} value={form.desc} onChange={(e) => setDescription(e.target.value)} />
        {" "}
        <span className="form-error" id="descError" style={{ display: form.descError ? "block" : "none" }}>
          Please describe the issue (minimum 8 characters).
        </span>
        {" "}
      </div>
      {" "}
      {/* Location Row */}
      {" "}
      <div className="form-row">
        {" "}
        {/* Location */}
        {" "}
        <div className="form-group" style={{ flex: "1" }}>
          {" "}
          <label className="form-label" htmlFor="fLocation">
            Campus Landmark (Optional Match)
          </label>
          {" "}
          <select className="form-select" id="fLocation" value={form.location} onChange={(e) => setLocation(e.target.value)}>
            {LOCATION_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {" "}
        </div>
        {" "}
        {/* Custom location */}
        {" "}
        <div className="form-group" id="customLocGroup" style={{ display: form.location === 'OTHER' ? "block" : "none", flex: "1" }}>
          {" "}
          <label className="form-label" htmlFor="fCustomLoc">
            Specify Exact Location
          </label>
          {" "}
          <input className="form-input" id="fCustomLoc" type="text" placeholder="e.g. Room 210, Chemistry Lab" value={form.customLoc} onChange={(e) => setCustomLocation(e.target.value)} />
          {" "}
        </div>
        {" "}
      </div>
      {" "}
      {/* Evidence File Uploads (Cloudinary Authenticated) */}
      {" "}
      <div className="form-group full">
        {" "}
        <label className="form-label" htmlFor="fEvidenceFiles">
          Attach Evidence Files (Optional - Images or PDF, max 5 MB each)
        </label>
        {" "}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {" "}
          <input key={`files-${form.resetCount}`} type="file" id="fEvidenceFiles" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="form-input" style={{ padding: "8px", fontSize: "12px", flex: "1" }} onChange={(e) => addEvidenceFiles(e.target.files)} />
          {" "}
          <button type="button" className="btn" style={{ height: "38px", fontSize: "12px", padding: "0 14px", background: "var(--olive)", gap: "6px" }} onClick={() => cameraInput.current?.click()}>
            {" "}Open Camera{" "}
          </button>
          {" "}
          <input key={`camera-${form.resetCount}`} ref={cameraInput} type="file" id="fCameraCapture" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => addCameraPhoto(e.target.files)} />
          {" "}
        </div>
        {" "}
        <div id="evidenceFilesPreviewList" style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {form.files.map((f, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8faf6", padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2ebd8", fontSize: "12px" }}>
              <span><strong>{f.name}</strong> ({sizeLabel(f.size)})</span>
              <button type="button" onClick={() => removeEvidenceFile(idx)} style={{ background: "none", border: "none", color: "#b91c1c", fontWeight: 700, cursor: "pointer", fontSize: "11px", padding: "2px 6px" }}>Remove</button>
            </div>
          ))}
        </div>
        {" "}
      </div>
      {" "}
      {features.routing && (
        <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12.5px', color: '#204018', cursor: 'pointer', lineHeight: 1.45 }}>
          <input type="checkbox" checked={form.hideName} onChange={(e) => setHideName(e.target.checked)} style={{ marginTop: '3px' }} />
          <span><strong>Hide my name from the student union.</strong> Union posts will see your complaint but not your name or email; the Head / Chairperson and the administration still will.</span>
        </label>
      )}
      {/* Submission Error Box */}
      {" "}
      <div id="submitError" style={{ display: form.submitError ? "block" : "none", padding: "10px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", background: "#fef0ee", border: "1px solid #f0b0a0", color: "#c03020", lineHeight: "1.4" }}>
        {form.submitError}
      </div>
      {" "}
      <button className="btn" type="submit" id="submitBtn" disabled={form.submitting} style={{ height: "46px", fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "10px" }}>
        {form.submitting ? 'Uploading evidence & registering complaint...' : (
          <>
            {" "}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
            {" "}Submit Complaint for Official Redressal{" "}
          </>
        )}
      </button>
      {" "}
    </form>
  );
}
