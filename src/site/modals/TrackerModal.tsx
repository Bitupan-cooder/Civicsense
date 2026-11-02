// Complaint tracker modal, rendered from ../tracker.ts. The list cards, result view, stages bar and history
// reproduce the markup the original page script built with innerHTML.
import type { Complaint, Routing } from '../../civicAuth';
import { useState } from 'react';
import { AiPanel, Replies, RouteTracker } from '../../RouteTracker';
import { ReadingLanguageSwitch } from '../components/StudentAuthWidgets';
import { useLanguage } from '../../i18n';
import { TrackerAuthStatus } from '../components/StudentAuthWidgets';
import {
  closeTracker, confirmResolution, filteredComplaints, searchComplaint, searchFor, setFilterStatus, setFilterText, setTrackerQuery,
  switchTrackerMode, toggleComplaintDetail, useTracker, viewEvidenceFile,
} from '../tracker';

const STAGES: [string, string][] = [
  ['submitted', '1. Submitted'],
  ['under_verification', '2. Under Verification'],
  ['accepted', '3. Accepted'],
  ['in_progress', '4. In Progress'],
  ['resolved', '5. Resolved'],
];

function formatTime(ts: string | null | undefined): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

const statusLabel = (status: string | null) => (status || 'submitted').replace('_', ' ');
const shortRef = (id: string) => 'CS-' + id.slice(0, 8).toUpperCase();
const scrollToReport = () => document.getElementById('report')?.scrollIntoView({ behavior: 'smooth' });

function TimelineStages({ status }: { status: string | null }) {
  const current = STAGES.findIndex(([key]) => key === status);
  return (
    <>
      <div className="timeline-stages">
        {STAGES.map(([key, label], i) => {
          let cls = 'timeline-stage-step';
          if (status === 'rejected') {
            if (i === 0) cls += ' completed';
            else if (i === 1) cls += ' rejected';
          } else if (current !== -1) {
            if (i < current) cls += ' completed';
            else if (i === current) cls += ' active';
          }
          return <div key={key} className={cls}>{label}</div>;
        })}
      </div>
      {status === 'rejected' && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, marginTop: '6px' }}>
          This complaint has been rejected by the reviewing official. Review remarks below.
        </div>
      )}
    </>
  );
}

function TimelineItem({ h }: { h: NonNullable<Complaint['complaint_status_history']>[number] }) {
  return (
    <div className="timeline-item">
      <div className="timeline-title">{statusLabel(h.status).toUpperCase()}</div>
      <div className="timeline-time">{formatTime(h.created_at)}</div>
      {h.remark && <div className="timeline-desc">{h.remark}</div>}
    </div>
  );
}

function EvidenceRow({ complaintId, publicId, n, background, border }: { complaintId: string; publicId: string; n: number; background: string; border: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background, padding: '6px 10px', borderRadius: '6px', border, fontSize: '12px' }}>
      <span>Evidence Document #{n}</span>
      <button type="button" className="btn" onClick={() => viewEvidenceFile(complaintId, publicId)} style={{ height: '26px', fontSize: '11px', padding: '0 10px', background: 'var(--olive)' }}>View Protected File</button>
    </div>
  );
}

const SECTION_LABEL = { fontSize: '11px', fontWeight: 700, color: 'var(--olive)', textTransform: 'uppercase' } as const;

/** PRD: the reporter confirms the fix (closes it) or reopens it with a note. */
function ConfirmFixed({ id }: { id: string }) {
  const [reopening, setReopening] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const act = async (action: 'confirm' | 'reopen') => { setBusy(true); await confirmResolution(id, action, note); setBusy(false); };
  return (
    <div style={{ background: '#eef8e5', border: '1px solid #c0e8a8', borderRadius: '12px', padding: '12px 14px', fontSize: '12.5px' }}>
      <strong>Is it fixed?</strong> The responsible post marked this complaint resolved.
      {reopening ? (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What is still wrong?" style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid var(--line)', borderRadius: '8px', fontFamily: 'inherit', fontSize: '12.5px' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn" disabled={busy || note.trim().length < 3} onClick={() => act('reopen')} style={{ height: '30px', fontSize: '12px' }}>Reopen complaint</button>
            <button type="button" className="btn-outline" onClick={() => setReopening(false)} style={{ height: '30px', fontSize: '12px' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="btn" disabled={busy} onClick={() => act('confirm')} style={{ height: '30px', fontSize: '12px' }}>Yes, it's fixed</button>
          <button type="button" className="btn-outline" onClick={() => setReopening(true)} style={{ height: '30px', fontSize: '12px' }}>No, reopen it</button>
        </div>
      )}
    </div>
  );
}

function ComplaintCard({ c, expanded, routing }: { c: Complaint; expanded: boolean; routing?: Routing }) {
  const { lang } = useLanguage();
  const evidence = c.complaint_evidence || [];
  const history = c.complaint_status_history || [];
  const visLabel = c.visibility === 'administration' ? 'Administration Only' : c.visibility === 'department' ? 'Department' : 'Social Service (DUSU)';
  return (
    <div className="complaint-card">
      <div className="complaint-header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong style={{ fontSize: '13px', color: 'var(--olive)', letterSpacing: '-0.01em' }}>#{shortRef(c.id)}</strong>
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>{formatTime(c.created_at)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className={'visibility-pill ' + c.visibility}>{visLabel}</span>
          <span className={'status-pill ' + (c.status || 'submitted')}>{statusLabel(c.status)}</span>
        </div>
      </div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>{c.title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4a6142' }}>
        <span style={{ background: 'var(--pill)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>{c.category}</span>
        <span>{evidence.length > 0 ? evidence.length + ' evidence file(s)' : 'No evidence files'}</span>
      </div>
      <div style={{ marginTop: '6px' }}>
        <button type="button" className="btn-outline" onClick={() => toggleComplaintDetail(c.id)} style={{ fontSize: '11.5px', height: '30px', padding: '0 12px', borderRadius: '6px' }}>
          {expanded ? 'Hide Details' : 'View Status Timeline & Details'}
        </button>
      </div>
      <div className="complaint-detail-drawer" style={{ display: expanded ? 'block' : 'none', marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
        <div style={{ ...SECTION_LABEL, marginBottom: '4px' }}>Grievance Description</div>
        <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: 1.5, background: '#f8faf6', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2ebd8', marginBottom: '12px' }}>{c.description}</div>
        {evidence.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ ...SECTION_LABEL, marginBottom: '6px' }}>Attached Evidence (Cloudinary Authenticated)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {evidence.map((ev, i) => <EvidenceRow key={i} complaintId={c.id} publicId={ev.cloudinary_public_id} n={i + 1} background="#f8faf6" border="1px solid #e2ebd8" />)}
            </div>
          </div>
        )}
        {routing && <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}><AiPanel routing={routing} /><RouteTracker routes={routing.routes} status={c.status} /><Replies replies={routing.replies} lang={lang} showInternal={false} />{c.status === 'resolved' && <ConfirmFixed id={c.id} />}</div>}
        <div style={{ ...SECTION_LABEL, marginBottom: '6px' }}>Resolution Lifecycle Milestone Tracker</div>
        <TimelineStages status={c.status} />
        <div style={{ ...SECTION_LABEL, marginTop: '12px', marginBottom: '6px' }}>Status History &amp; Official Remarks</div>
        {history.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#64748b', padding: '6px 0' }}>No status changes recorded yet.</div>
        ) : (
          <div className="timeline" style={{ marginTop: '6px' }}>
            {history.map((h, i) => <TimelineItem key={i} h={h} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function TrackerResult({ c, routing }: { c: Complaint; routing?: Routing }) {
  const { lang } = useLanguage();
  const evidence = c.complaint_evidence || [];
  const history = c.complaint_status_history || [];
  const bannerClass = c.status === 'resolved' ? 'status-solved' : c.status === 'rejected' ? 'status-escalated' : 'status-in-progress';
  const visLabel = c.visibility === 'administration' ? 'Administration Only (Registrar & Proctor)'
    : c.visibility === 'department' ? 'Assigned Department Authority' : 'Social Service (DUSU Council)';
  return (
    <>
      <div id="trackerBanner" className={'status-banner ' + bannerClass}>
        <strong>{statusLabel(c.status).toUpperCase()}</strong> · {c.status === 'resolved' ? 'Resolution verified by authorized department' : 'Active campus grievance tracking'}
      </div>
      <TimelineStages status={c.status} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} id="trackerDetails">
        <div className="detail-row"><span className="detail-label">Complaint ID:</span><strong>#{shortRef(c.id)} ({c.id})</strong></div>
        <div className="detail-row"><span className="detail-label">Title:</span><strong>{c.title}</strong></div>
        <div className="detail-row"><span className="detail-label">Category:</span><span>{c.category}</span></div>
        <div className="detail-row"><span className="detail-label">Privacy Level:</span><span>{visLabel}</span></div>
        <div className="detail-row"><span className="detail-label">Submission Date:</span><span>{formatTime(c.created_at)}</span></div>
        <div className="detail-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', marginTop: '6px' }}>
          <span className="detail-label">Description:</span>
          <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: 1.5, background: '#f8faf6', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2ebd8', width: '100%', boxSizing: 'border-box' }}>{c.description}</div>
        </div>
      </div>
      {routing && <AiPanel routing={routing} />}
      {routing && <RouteTracker routes={routing.routes} status={c.status} />}
      {routing && <Replies replies={routing.replies} lang={lang} showInternal={false} />}
      <TrackerEvidence c={c} evidence={evidence} />
      <div id="trackerTimelineWrap" style={{ display: history.length > 0 ? 'block' : 'none', background: '#f8faf4', borderRadius: '12px', padding: '14px 16px', border: '1px solid var(--line)' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--olive)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '8px' }}>
          Institutional Status Timeline &amp; Remarks
        </div>
        <div className="timeline" id="trackerTimeline">
          {history.map((h, i) => <TimelineItem key={i} h={h} />)}
        </div>
      </div>
    </>
  );
}

function TrackerEvidence({ c, evidence }: { c: Complaint; evidence: NonNullable<Complaint['complaint_evidence']> }) {
  return (
    <div id="trackerEvidenceWrap" style={{ display: evidence.length > 0 ? 'block' : 'none', background: '#f8faf4', borderRadius: '10px', padding: '12px 14px', border: '1px solid var(--line)' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--olive)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '8px' }}>
        Attached Evidence (Authenticated Delivery)
      </div>
      <div id="trackerEvidenceList" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {evidence.map((ev, i) => <EvidenceRow key={i} complaintId={c.id} publicId={ev.cloudinary_public_id} n={i + 1} background="#ffffff" border="1px solid var(--line)" />)}
      </div>
    </div>
  );
}

/** The result area before any search: the original static markup (hidden). */
function EmptyResult() {
  return (
    <>
      <div id="trackerBanner" className="status-banner pending" />
      <div className="timeline-stages" id="trackerStagesBar">
        {STAGES.map(([key, label], i) => <div key={key} className="timeline-stage-step" id={'stageStep' + (i + 1)}>{label}</div>)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} id="trackerDetails" />
      <TrackerEvidence c={{} as Complaint} evidence={[]} />
      <div id="trackerTimelineWrap" style={{ display: 'none', background: '#f8faf4', borderRadius: '12px', padding: '14px 16px', border: '1px solid var(--line)' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--olive)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '8px' }}>
          Institutional Status Timeline &amp; Remarks
        </div>
        <div className="timeline" id="trackerTimeline" />
      </div>
    </>
  );
}

export function TrackerModal() {
  const t = useTracker();
  const mine = t.mode === 'my_complaints';
  const list = filteredComplaints(t);
  const showEmpty = t.mineLoaded && !t.mineLoading && (!!t.mineError || list.length === 0);
  const tabStyle = (active: boolean) => (active ? { background: '#ffffff', color: 'var(--ink)' } : { background: 'transparent', color: '#4a6142' });

  return (
    <div className={t.open ? 'modal-overlay' : 'modal-overlay hidden'} id="trackerModal" role="dialog" aria-modal="true" aria-labelledby="trackerTitle">
      {" "}
      <div className="modal" style={{ maxWidth: "700px" }}>
        {" "}
        <div className="modal-header">
          {" "}
          <div className="modal-title" id="trackerTitle">
            {" "}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            {" "}Student Complaints &amp; Redressal Tracker{" "}
          </div>
          {" "}
          <button className="modal-close" onClick={() => closeTracker()} aria-label="Close">
            ×
          </button>
          {" "}
        </div>
        {" "}
        <div className="modal-body" style={{ padding: "18px 20px" }}>
          {" "}
          {/* Student Auth Indicator */}
          {" "}
          <div id="studentAuthIndicator" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8faf4", border: "1px solid var(--line)", borderRadius: "10px", padding: "10px 14px", marginBottom: "14px", fontSize: "12.5px", flexWrap: "wrap", gap: "8px" }}>
            {" "}
            <TrackerAuthStatus />
            {" "}
          </div>
          {" "}
          {/* Mode Tabs (My Complaints vs Track Single ID) */}
          {" "}
          <div id="trackerModeTabs" style={{ display: "flex", gap: "6px", background: "#f2f8ec", padding: "4px", borderRadius: "10px", marginBottom: "14px" }}>
            {" "}
            <button type="button" id="tabMyComplaints" onClick={() => switchTrackerMode('my_complaints')} style={{ flex: "1", height: "34px", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "700", cursor: "pointer", ...tabStyle(mine), boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
              My Complaints (
              <span id="myComplaintsCount">
                {t.mine.length}
              </span>
              )
            </button>
            {" "}
            <button type="button" id="tabTrackSingle" onClick={() => switchTrackerMode('track_single')} style={{ flex: "1", height: "34px", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "600", cursor: "pointer", ...tabStyle(!mine) }}>
              Track by Complaint ID
            </button>
            {" "}
          </div>
          {" "}
          {/* 1. MY COMPLAINTS DASHBOARD VIEW */}
          {" "}
          <div id="myComplaintsView" style={{ display: mine ? 'block' : 'none' }}>
            {" "}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
              {" "}
              <input className="track-input" id="complaintsFilterText" type="text" placeholder="Filter by title, category, or ID..." style={{ flex: "2", minWidth: "200px", borderRadius: "8px", height: "38px", fontSize: "12.5px" }} value={t.filterText} onChange={(e) => setFilterText(e.target.value)} />
              {" "}
              <select className="form-select" id="complaintsStatusSelect" style={{ flex: "1", minWidth: "140px", borderRadius: "8px", height: "38px", fontSize: "12px", padding: "6px 28px 6px 10px" }} value={t.filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="ALL">
                  All Statuses
                </option>
                <option value="submitted">
                  Submitted
                </option>
                <option value="under_verification">
                  Under Verification
                </option>
                <option value="accepted">
                  Accepted
                </option>
                <option value="in_progress">
                  In Progress
                </option>
                <option value="resolved">
                  Resolved
                </option>
                <option value="rejected">
                  Rejected
                </option>
              </select><ReadingLanguageSwitch />
              {" "}
            </div>
            {" "}
            <div id="studentComplaintsLoading" style={{ display: t.mineLoading ? "block" : "none", padding: "30px", textAlign: "center", fontSize: "13px", color: "#4a6142" }}>
              {" "}Loading your submitted complaints from database...{" "}
            </div>
            {" "}
            <div id="studentComplaintsEmpty" style={{ display: showEmpty ? "block" : "none", background: "#fcfdfa", border: "1.5px dashed var(--line)", borderRadius: "12px", padding: "32px 20px", textAlign: "center" }}>
              {" "}
              <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--olive)", marginBottom: "6px" }}>
                No complaints found
              </div>
              {" "}
              <p style={{ fontSize: "12.5px", color: "#4a6142", margin: "0 0 14px", lineHeight: "1.5" }}>
                {t.mineError ?? 'You have not submitted any complaints yet under this student account.'}
              </p>
              {" "}
              <button className="btn" onClick={() => { closeTracker(); scrollToReport(); }} style={{ fontSize: "12px", height: "34px", padding: "0 16px" }}>
                File a Campus Issue
              </button>
              {" "}
            </div>
            {" "}
            <div id="studentComplaintsList" style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "480px", overflowY: "auto", paddingRight: "4px" }}>
              {t.mineLoaded && !t.mineLoading && !t.mineError && list.map((c) => <ComplaintCard key={c.id} c={c} expanded={t.expanded.includes(c.id)} routing={t.routing[c.id]} />)}
            </div>
            {" "}
          </div>
          {" "}
          {/* 2. TRACK BY ID VIEW */}
          {" "}
          <div id="trackSingleView" style={{ display: mine ? "none" : "block" }}>
            {" "}
            <div style={{ display: "flex", gap: "8px" }}>
              {" "}
              <input className="track-input" id="trackerInput" type="text" placeholder="Enter Complaint ID (e.g. CS-8921 or UUID)" style={{ flex: "1", borderRadius: "10px", height: "42px" }} value={t.query} onChange={(e) => setTrackerQuery(e.target.value)} />
              {" "}
              <button className="btn" onClick={() => searchComplaint()} style={{ height: "42px", borderRadius: "10px" }}>
                Search
              </button>
              {" "}
            </div>
            {" "}
            <div id="trackerError" style={{ display: t.searchError ? "block" : "none", marginTop: "10px" }} className="error-msg">
              {t.searchError}
            </div>
            {" "}
            {/* Result */}
            {" "}
            <div id="trackerResult" style={{ display: t.result ? "flex" : "none", flexDirection: "column", gap: "14px", marginTop: "14px" }}>
              {t.result ? <TrackerResult c={t.result} routing={t.routing[t.result.id]} /> : <EmptyResult />}
              <div style={{ textAlign: "right" }}>
                {" "}
                <button className="btn-outline" onClick={() => { scrollToReport(); closeTracker(); }} style={{ fontSize: "12px", height: "32px", padding: "0 14px" }}>
                  + File New Report
                </button>
                {" "}
              </div>
            </div>
            {" "}
            {/* Sample IDs */}
            {" "}
            <div style={{ background: "#f8faf4", borderRadius: "10px", padding: "12px 14px", marginTop: "14px" }}>
              {" "}
              <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--olive)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: "8px" }}>
                Demo Complaints
              </div>
              {" "}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }} id="demoIds">
                {t.demoIds.map((id) => (
                  <button key={id} className="btn-outline" style={{ fontSize: '11px', height: '24px', padding: '0 8px' }} onClick={() => searchFor(id)}>{id}</button>
                ))}
              </div>
              {" "}
            </div>
            {" "}
          </div>
          {" "}
        </div>
        {" "}
      </div>
      {" "}
    </div>
  );
}
