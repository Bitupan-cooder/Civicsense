// Complaint form, its sign-in gate and the success card, rendered from ../reportForm.ts.
// These elements always stay mounted (only `display` changes): animations.js attaches GSAP reveal animations to them.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, FileText, ImagePlus, Info, Send, ShieldCheck, X } from 'lucide-react';
import {
  addCameraPhoto, addEvidenceFiles, clearReportSuccess, LOCATION_OPTIONS, removeEvidenceFile, resetReportForm,
  setCustomLocation, setDescription, setField, setHideName, setLocation, setVisibility, submitReport, useReportForm, type FocusField, type Visibility,
} from '../reportForm';
import { openStudentAuth, useStudentSession } from '../studentSession';
import { ReportAuthNotice, useDismiss } from './StudentAuthWidgets';
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
        <button className="btn" onClick={() => success && navigate(`/report/new?track=${encodeURIComponent(success.ticket)}#report-tracker`)}>
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
    <form className="report-form rf reveal" id="reportForm" onSubmit={submit} style={shown ? SHOWN_AS_COLUMN : { display: "none" }}>
      {/* who is filing */}
      <div id="formStudentAuthNotice" className="rf-identity">
        <span className="rf-avatar" aria-hidden="true">{profile?.name?.trim().charAt(0).toUpperCase() || '?'}</span>
        <div className="rf-identity-text"><ReportAuthNotice /></div>
      </div>

      <fieldset className="rf-step">
        <legend><span className="rf-step-num">1</span>What happened?</legend>
        <div className="form-group full">
          <label className="form-label" htmlFor="fTitle">Complaint title <span className="rf-req">*</span></label>
          <input className="form-input" id="fTitle" type="text" required placeholder="e.g. Water shortage in Hostel 2"
            ref={(el) => { fields.current.fTitle = el; }} value={form.title} onChange={(e) => setField('title', e.target.value)} />
          <span className="rf-hint">A short summary of the problem.</span>
          <span className="form-error" id="titleError" style={{ display: form.titleError ? "block" : "none" }}>
            Please enter a complaint title (minimum 5 characters).
          </span>
        </div>
        <div className="form-group full">
          <div className="rf-label-row">
            <label className="form-label" htmlFor="fDesc">Detailed description <span className="rf-req">*</span></label>
            <RoutingInfo />
            <span id="aiLangIndicator" className="rf-lang">{form.language ?? 'Assamese / English'}</span>
          </div>
          <textarea className="form-textarea" id="fDesc" required minLength={8} rows={5} placeholder="What is wrong, exactly where, and since when…"
            ref={(el) => { fields.current.fDesc = el; }} value={form.desc} onChange={(e) => setDescription(e.target.value)} />
          <span className="rf-hint">Write in English or Assamese. The more specific, the faster it reaches the right office.</span>
          <span className="form-error" id="descError" style={{ display: form.descError ? "block" : "none" }}>
            Please describe the issue (minimum 8 characters).
          </span>
        </div>
      </fieldset>

      <fieldset className="rf-step">
        <legend><span className="rf-step-num">2</span>Where is it? <span className="rf-optional">Optional</span></legend>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="fLocation">Campus landmark</label>
            <select className="form-select" id="fLocation" value={form.location} onChange={(e) => setLocation(e.target.value)}>
              {LOCATION_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="form-group" id="customLocGroup" style={{ display: form.location === 'OTHER' ? undefined : "none" }}>
            <label className="form-label" htmlFor="fCustomLoc">Exact location</label>
            <input className="form-input" id="fCustomLoc" type="text" placeholder="e.g. Room 210, Chemistry Lab" value={form.customLoc} onChange={(e) => setCustomLocation(e.target.value)} />
          </div>
        </div>
      </fieldset>

      <fieldset className="rf-step">
        <legend><span className="rf-step-num">3</span>Photos or files <span className="rf-optional">Optional</span></legend>
        <div className="rf-drop">
          <span className="rf-drop-icon" aria-hidden="true"><ImagePlus /></span>
          <div className="rf-drop-text">
            <strong>Add a photo of the problem</strong>
            <span>Images or PDF, up to 5 MB each</span>
          </div>
          <div className="rf-drop-actions">
            <input key={`files-${form.resetCount}`} type="file" id="fEvidenceFiles" className="rf-file-input" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => addEvidenceFiles(e.target.files)} />
            <label className="btn-outline rf-pick" htmlFor="fEvidenceFiles"><FileText aria-hidden="true" />Choose files</label>
            <button type="button" className="btn rf-pick" onClick={() => cameraInput.current?.click()}><Camera aria-hidden="true" />Take photo</button>
            <input key={`camera-${form.resetCount}`} ref={cameraInput} type="file" id="fCameraCapture" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => addCameraPhoto(e.target.files)} />
          </div>
        </div>
        {form.files.length > 0 && (
          <ul id="evidenceFilesPreviewList" className="rf-files">
            {form.files.map((f, idx) => (
              <li key={idx}>
                <FileText aria-hidden="true" />
                <span className="rf-file-name">{f.name}</span>
                <span className="rf-file-size">{sizeLabel(f.size)}</span>
                <button type="button" aria-label={'Remove ' + f.name} onClick={() => removeEvidenceFile(idx)}><X aria-hidden="true" /></button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {features.routing && (
        <label className="rf-privacy">
          <input type="checkbox" checked={form.hideName} onChange={(e) => setHideName(e.target.checked)} />
          <span className="rf-privacy-icon" aria-hidden="true"><ShieldCheck /></span>
          <span><strong>Hide my name from the student union</strong>Union posts see the complaint but not your name or email. The Head / Chairperson and the administration still do.</span>
        </label>
      )}

      <div id="submitError" className="rf-submit-error" role="alert" style={{ display: form.submitError ? undefined : "none" }}>
        {form.submitError}
      </div>
      <div className="rf-submit">
        <button className="btn" type="submit" id="submitBtn" disabled={form.submitting}>
          {form.submitting ? 'Uploading evidence & registering complaint…' : <><Send aria-hidden="true" />Submit complaint</>}
        </button>
        <p>You'll get a ticket ID to follow every update.</p>
      </div>
    </form>
  );
}

/** "How does routing work?": an info button beside the description label; opens on hover or tap, Esc / tapping away closes it. */
function RoutingInfo() {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useDismiss(box, open, () => setOpen(false)); // a tap elsewhere or Esc closes it (touch browsers don't always blur the button)
  return (
    <span ref={box} className={open ? 'rf-info is-open' : 'rf-info'} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="rf-info-btn" aria-label="How categories and routing work" aria-expanded={open} aria-controls="rfRoutingInfo"
        onClick={() => setOpen((o) => !o)} onBlur={() => setOpen(false)}>
        <Info aria-hidden="true" />
      </button>
      <span className="rf-info-pop" id="rfRoutingInfo">
        <strong>Automatic category and routing</strong>
        Describe the issue in your own words. Xohari analyzes the report, assigns a category, and routes it to the responsible
        campus authority. Unclear or sensitive reports go to Administration for review.
      </span>
    </span>
  );
}
