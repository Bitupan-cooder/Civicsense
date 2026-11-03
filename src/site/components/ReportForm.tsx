// Complaint form, its sign-in gate and the success card, rendered from ../reportForm.ts.
// These elements always stay mounted (only `display` changes): animations.js attaches GSAP reveal animations to them.
import { useEffect, useRef, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addCameraPhoto, addEvidenceFiles, clearReportSuccess, LOCATION_OPTIONS, removeEvidenceFile, resetReportForm,
  setCustomLocation, setDescription, setField, setHideName, setLocation, setVisibility, submitReport, useReportForm, type FocusField, type Visibility,
} from '../reportForm';
import { openStudentAuth, useStudentSession } from '../studentSession';
import { ReportAuthNotice } from './StudentAuthWidgets';
import type { Analysis } from '../../civicAuth';
import { categoryLabel, PriorityChip } from '../../RouteTracker';
import { useFeatures } from '../../NotificationBell';
import { SignInCard2 } from '@/components/ui/sign-in-card-2';

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
  const navigate = useNavigate();
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
        <button className="btn" onClick={() => success && navigate(`/report?track=${encodeURIComponent(success.ticket)}#report-tracker`)}>
          Track this report
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
    <div className="report-auth-gate-card reveal" id="reportAuthGate" style={{ width: "100%", marginTop: "20px", ...display }}>
      <SignInCard2 embedded={true} />
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
      <div id="formStudentAuthNotice" style={{ background: "#FAF2EB", border: "1px solid #cbe3b8", borderRadius: "10px", padding: "12px 14px", fontSize: "12.5px", color: "#1a3010", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
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
      {/* Automatic analysis and routing */}
      {" "}
      <div className="form-row">
        {" "}
        <div className="form-group" style={{ flex: 1 }}>
          <span className="form-label">Automatic category and routing</span>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>Describe the issue in your own words. CivicSense analyzes the report, assigns a category, and routes it to the responsible campus authority. Unclear or sensitive reports go to Administration for review.</p>
        </div>
      </div>
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
            <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FAF2EB", padding: "6px 10px", borderRadius: "6px", border: "1px solid #e0f0d0", fontSize: "12px" }}>
              <span><strong>{f.name}</strong> ({sizeLabel(f.size)})</span>
              <button type="button" onClick={() => removeEvidenceFile(idx)} style={{ background: "none", border: "none", color: "#b91c1c", fontWeight: 700, cursor: "pointer", fontSize: "11px", padding: "2px 6px" }}>Remove</button>
            </div>
          ))}
        </div>
        {" "}
      </div>
      {" "}
      {features.routing && (
        <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12.5px', color: '#1a3010', cursor: 'pointer', lineHeight: 1.45 }}>
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
