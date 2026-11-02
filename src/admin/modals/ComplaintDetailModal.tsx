// Markup converted 1:1 from the original admin.html (React migration, step 1).
import { closeDocket, openIdCard, openReassign, openWorkflow, reviewIdCard, shortRef, useConsole, viewEvidenceAttachment } from '../console';
import { formatDate, formatRelative, unitName } from '../components/Queue';
import { useState } from 'react';
import { AiPanel, Replies, RouteTracker } from '../../RouteTracker';
import { CATEGORIES, CATEGORY_LABELS } from '../../logic';
import { postReply, routeByHand, type OfficialComplaint } from '../console';
import { routingApi } from '../../civicAuth';
import { loadOfficialComplaints } from '../console';

/** Reply to the reporter (translated into both languages) or add an internal note for officials. */
function ReplyBox({ complaintId }: { complaintId: string }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const send = async (visibility: 'public' | 'internal') => {
    setBusy(true); setError('');
    try { await postReply(complaintId, body, visibility); setBody(''); } catch (err) { setError((err as Error).message || 'Failed to send.'); }
    setBusy(false);
  };
  return (
    <div style={{ background: '#ffffff', border: '1px solid var(--line)', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--olive)', textTransform: 'uppercase', letterSpacing: '.03em' }}>Reply or internal note</div>
      <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write in English or Assamese. Replies are translated so the reporter can read them in their language." style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--line)', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
      {error && <div style={{ color: '#991b1b', fontSize: '12px', fontWeight: 600 }}>{error}</div>}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button type="button" className="btn" disabled={busy || body.trim().length < 2} onClick={() => send('public')} style={{ height: '32px', fontSize: '12px' }}>Reply to reporter</button>
        <button type="button" className="btn-outline" disabled={busy || body.trim().length < 2} onClick={() => send('internal')} style={{ height: '32px', fontSize: '12px' }}>Add internal note</button>
      </div>
    </div>
  );
}

/** AI analysis, route tracker and (administration) routing by hand from the review queue. */
function DocketRouting({ d, isAdmin }: { d: OfficialComplaint; isAdmin: boolean }) {
  const routing = useConsole().routing[d.id];
  const [category, setCategory] = useState(routing?.ai_category || 'other');
  const [priority, setPriority] = useState(routing?.priority || 3);
  const [editError, setEditError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!routing) return null; // migration 001 not run yet
  const canRoute = isAdmin && (d.status === 'needs_review' || !routing.routes.length);
  return (
    <>
      <AiPanel routing={routing} />
      {isAdmin && !['closed', 'merged', 'rejected'].includes(d.status) && <form onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setEditError('');
        try { await routingApi().editAnalysis(d.id, category, priority); await loadOfficialComplaints(); }
        catch (err) { setEditError((err as Error).message); }
        finally { setBusy(false); }
      }} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <label>Category <select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}</select></label>
        <label>Priority <select value={priority} onChange={(e) => setPriority(Number(e.target.value))}>{[1, 2, 3, 4].map((p) => <option key={p} value={p}>P{p}</option>)}</select></label>
        <button className="btn-outline" type="submit" disabled={busy}>Save correction</button>
        {editError && <p role="alert">{editError}</p>}
      </form>}
      <RouteTracker routes={routing.routes} status={d.status} />
      <Replies replies={routing.replies} lang="en" showInternal />
      <ReplyBox complaintId={d.id} />
      {canRoute && (
        <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '12px', padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', fontSize: '12.5px' }}>
          <strong style={{ color: '#9a3412' }}>{d.status === 'needs_review' ? 'In the review queue.' : 'Not routed yet.'}</strong>
          <span>Route as</span>
          <select className="form-input-pass" style={{ height: '32px', marginTop: 0, width: 'auto' }} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
          <button type="button" className="btn" disabled={busy} style={{ height: '32px', fontSize: '12px' }}
            onClick={async () => { setBusy(true); await routeByHand(d.id, category); setBusy(false); }}>
            {busy ? 'Routing...' : 'Route complaint'}
          </button>
        </div>
      )}
    </>
  );
}

const LIFECYCLE_STEPS = [
  { key: 'submitted', label: 'Complaint received', matches: ['submitted'] },
  { key: 'review', label: 'Initial review', matches: ['under_verification', 'needs_review'] },
  { key: 'accepted', label: 'Accepted by an official', matches: ['accepted'] },
  { key: 'in_progress', label: 'Remediation in progress', matches: ['in_progress'] },
  { key: 'resolved', label: 'Marked resolved', matches: ['resolved', 'closed'] },
] as const;

function AdminLifecycleChecklist({ complaint }: { complaint: OfficialComplaint }) {
  const status = complaint.status;
  const activeIndex = status === 'rejected' ? 1 : LIFECYCLE_STEPS.findIndex((step) => step.matches.includes(status as never));
  const events = [...(complaint.history || [])].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  return (
    <section className="admin-lifecycle" aria-label="Complaint lifecycle checklist">
      <h3>Resolution checklist</h3>
      <ol>
        {LIFECYCLE_STEPS.map((step, index) => {
          const completed = activeIndex > index || (status === 'closed' && index === LIFECYCLE_STEPS.length - 1);
          const active = activeIndex === index;
          const event = [...events].reverse().find((item) => step.matches.includes(item.status as never));
          return (
            <li key={step.key} className={completed ? 'is-complete' : active ? 'is-current' : ''}>
              <span className="admin-check-icon" aria-hidden="true">{completed ? '✓' : active ? '◷' : ''}</span>
              <div className="admin-check-copy">
                <strong>{step.label}</strong>
                <span>{event ? `${formatDate(event.created_at)}${event.actor?.name ? ` · ${event.actor.name}` : ''}` : completed ? 'Completed' : active ? 'Current step' : 'Pending'}</span>
                {event?.remark && <p>{event.remark}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      {status === 'rejected' && <p className="admin-check-alert">Complaint rejected. Review the official remarks below.</p>}
    </section>
  );
}

export function ComplaintDetailModal() {
  const s = useConsole();
  const d = s.complaints.find((c) => c.id === s.docketId) ?? null;
  const active = !!d && !['resolved', 'rejected', 'closed', 'merged'].includes(d.status);
  const shown = (on: boolean) => ({ display: on ? 'inline-flex' : 'none' });
  const idStatus = d ? d.idCard?.status ?? 'pending' : null;
  const nameHidden = !!d && !d.student && !!s.routing[d.id]?.hide_name_from_union;
  const studentName = d?.student ? d.student.name : nameHidden ? "Name hidden (reporter's choice)" : 'Registered Student';
  const studentEmail = d?.student ? d.student.email : 'No email';
  return (
    <div className={d ? "modal-overlay" : "modal-overlay hidden"} id="complaintDetailModal">
      {" "}
      <div className="modal-box-large">
        {" "}
        <div className="modal-head">
          {" "}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {" "}
            <span className="ticket-id-tag" id="modalDocketId">
              {d ? '#' + shortRef(d.id) : '#CS-0000'}
            </span>
            {" "}
            <h2 style={{ fontSize: "17px", fontWeight: "700", color: "var(--ink)", letterSpacing: "-0.02em" }} id="modalDocketTitle">
              {d ? d.title : 'Complaint Title'}
            </h2>
            {" "}
          </div>
          {" "}
          <button type="button" onClick={() => closeDocket()} style={{ background: "none", border: "none", color: "#4a6142", fontSize: "22px", fontWeight: "700", cursor: "pointer", padding: "4px 8px" }}>
            ×
          </button>
          {" "}
        </div>
        {" "}
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {" "}
          {/* Status & Categorization Meta Bar */}
          {" "}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", background: "#ffffff", padding: "12px 16px", borderRadius: "12px", border: "1px solid var(--line)" }}>
            {" "}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              {" "}
              <span id="modalDocketStatus" className={d ? 'chip chip-' + d.status : 'chip'}>
                {d ? d.status.replace('_', ' ').toUpperCase() : 'Status'}
              </span>
              {" "}
              <span id="modalDocketVisibility" className={d ? 'chip chip-vis-' + (d.visibility === 'administration' ? 'admin' : d.visibility === 'social_service' ? 'social' : 'dept') : 'chip'}>
                {d ? (d.visibility === 'social_service' ? 'Campus (Social Service)' : d.visibility === 'administration' ? 'Administration Vault' : 'Department Specific') : 'Visibility'}
              </span>
              {" "}
              <span id="modalDocketCategory" className="chip" style={{ background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1" }}>
                {d ? d.category : 'Category'}
              </span>
              {" "}
            </div>
            {" "}
            <div style={{ fontSize: "12px", color: "#64748b" }} id="modalDocketDate">
              {d ? 'Submitted: ' + formatDate(d.created_at) + ' (' + formatRelative(d.created_at) + ')' : 'Submitted: --'}
            </div>
            {" "}
          </div>
          {" "}
          {/* Student & Assigned Unit Grid */}
          {" "}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
            {" "}
            <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: "14px", border: "1px solid var(--line)" }}>
              {" "}
              <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--olive)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "6px" }}>
                Student Reporter
              </div>
              {" "}
              <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--ink)" }} id="modalStudentName">
                {d ? studentName : '--'}
              </div>
              {" "}
              <div style={{ fontSize: "12.5px", color: "#4b5563", marginTop: "2px" }} id="modalStudentEmail">
                {d ? studentEmail : '--'}
              </div>
              {" "}
            </div>
            {" "}
            <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: "14px", border: "1px solid var(--line)" }}>
              {" "}
              <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--olive)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "6px" }}>
                Assigned Redressal Unit
              </div>
              {" "}
              <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--ink)" }} id="modalAssignedUnit">
                {d ? unitName(d, 'Target Department', 'General Campus Desk') : '--'}
              </div>
              {" "}
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }} id="modalUnitJurisdiction">
                Jurisdiction verified
              </div>
              {" "}
            </div>
            {" "}
          </div>
          {" "}
          {/* Student ID Card Section */}
          {" "}
          <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "14px", border: "1.5px solid var(--line)" }}>
            {" "}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
              {" "}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {" "}
                <span style={{ fontSize: "12.5px", fontWeight: "700", color: "var(--ink)" }}>
                  Student Institutional ID Card
                </span>
                {" "}
                <span id="modalIdCardStatusBadge" className={'pill-id-' + (idStatus ?? 'pending')}>
                  {idStatus === null ? 'Pending' : idStatus === 'verified' ? 'ID Verified' : idStatus === 'not_valid' ? 'ID Not Valid' : 'ID Pending Review'}
                </span>
                {" "}
              </div>
              {" "}
              <button type="button" className="btn-outline" style={{ height: "30px", fontSize: "11.5px", padding: "0 12px" }} onClick={() => d && openIdCard(d.student_id, d.student ? d.student.name : 'Student', d.student ? d.student.email : '')}>
                {" "}View Student ID Card{" "}
              </button>
              {" "}
            </div>
            {" "}
            <p style={{ fontSize: "12px", color: "#4a6142", lineHeight: "1.45", marginBottom: "10px" }}>
              {" "}Institutional enrollment verification required prior to formal acceptance.{" "}
            </p>
            {" "}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              {" "}
              <button type="button" className="btn" style={{ height: "28px", fontSize: "11.5px", padding: "0 12px", background: "var(--olive)" }} onClick={() => d && reviewIdCard('verified', d.student_id)}>
                Mark ID as Verified
              </button>
              {" "}
              <button type="button" className="btn-outline btn-red" style={{ height: "28px", fontSize: "11.5px", padding: "0 12px" }} onClick={() => d && reviewIdCard('not_valid', d.student_id)}>
                Mark ID as Not Valid
              </button>
              {" "}
            </div>
            {" "}
          </div>
          {" "}
          {/* Description Box */}
          {" "}
          <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "14px", border: "1px solid var(--line)" }}>
            {" "}
            <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--olive)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "8px" }}>
              Grievance Narrative
            </div>
            {" "}
            <div style={{ fontSize: "13.5px", color: "var(--ink)", lineHeight: "1.6", whiteSpace: "pre-wrap" }} id="modalDocketDescription">
              {d ? d.description : '--'}
            </div>
            {" "}
          </div>
          {" "}
          {d && <DocketRouting key={d.id} d={d} isAdmin={s.profile?.role === 'administration'} />}
          {/* Evidence Attachments Box */}
          {" "}
          <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "14px", border: "1px solid var(--line)" }} id="modalEvidenceSection">
            {" "}
            <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--olive)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "8px" }}>
              Evidence Attachments (Authenticated Cloudinary)
            </div>
            {" "}
            <div id="modalEvidenceList" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {!d ? (
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  No evidence files attached to this complaint.
                </span>
              ) : d.evidence?.length ? d.evidence.map((ev, i) => (
                <button key={i} type="button" className="btn-outline" style={{ height: '30px', fontSize: '12px', padding: '0 12px' }} onClick={() => viewEvidenceAttachment(d.id, ev.cloudinary_public_id)}>View Attachment {i + 1}</button>
              )) : <span style={{ fontSize: '12.5px', color: '#64748b' }}>No evidence files attached to this grievance.</span>}
            </div>
            {" "}
          </div>
          {" "}
          {d && <AdminLifecycleChecklist complaint={d} />}
          {/* Resolution History Timeline */}
          {" "}
          <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "14px", border: "1px solid var(--line)" }}>
            {" "}
            <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--olive)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "8px" }}>
              Status Timeline &amp; Remarks History
            </div>
            {" "}
            <div className="timeline-list" id="modalTimelineList">
              {!d ? (
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  No history entries available.
                </div>
              ) : d.history?.length ? d.history.map((h, i) => (
                <div key={i} className="timeline-item">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                    <span className={'chip chip-' + h.status} style={{ fontSize: '10.5px' }}>{(h.status || '').replace('_', ' ').toUpperCase()}</span>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>{formatDate(h.created_at)} ({formatRelative(h.created_at)})</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--ink)', fontWeight: 600 }}>{h.actor ? h.actor.name + ' (' + (h.actor.unit_name || h.actor.role) + ')' : 'Authorized Official'}</div>
                  {h.remark && <div style={{ fontSize: '12.5px', color: '#334155', background: '#FAF2EB', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)', marginTop: '2px' }}>{h.remark}</div>}
                </div>
              )) : <div style={{ fontSize: '12.5px', color: '#64748b' }}>No previous remarks logged. Initial submission status recorded.</div>}
              {" "}
            </div>
            {" "}
          </div>
          {" "}
        </div>
        {" "}
        <div className="modal-foot" id="modalDocketActions">
          {" "}
          <button type="button" className="btn-outline" onClick={() => closeDocket()}>
            Close
          </button>
          {" "}
          <button type="button" className="btn-outline btn-red" id="modalActionRejectBtn" style={d ? shown(active) : undefined} onClick={() => d && openWorkflow(d.id, 'rejected')}>
            Reject Grievance
          </button>
          {" "}
          <button type="button" className="btn-outline" id="modalActionAcceptBtn" style={d ? shown(d.status === 'submitted' || d.status === 'under_verification') : undefined} onClick={() => d && openWorkflow(d.id, 'accepted')}>
            Accept Grievance
          </button>
          {" "}
          <button type="button" className="btn" id="modalActionProgressBtn" style={d ? shown(d.status === 'accepted' || d.status === 'in_progress') : undefined} onClick={() => d && openWorkflow(d.id, 'in_progress')}>
            Update Progress
          </button>
          {" "}
          <button type="button" className="btn btn-blue" id="modalActionResolveBtn" style={d ? shown(d.status === 'in_progress') : undefined} onClick={() => d && openWorkflow(d.id, 'resolved')}>
            Mark Resolved
          </button>
          {" "}
          <button type="button" className="btn-outline" id="modalActionReassignBtn" style={{ display: d && active && s.profile?.role === 'administration' ? 'inline-flex' : 'none', borderColor: "var(--blue)", color: "var(--blue)" }} onClick={() => d && openReassign(d.id)}>
            Reassign Unit
          </button>
          {" "}
        </div>
        {" "}
      </div>
      {" "}
    </div>
  );
}
