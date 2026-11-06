// Complaint docket: everything about one complaint and its history, with the official's actions.
// Two columns on desktop (story and handling | people, ID check and progress); one column on phones.
import { useEffect, useState } from 'react';
import { Building2, Clock, IdCard, Paperclip, UserRound, X } from 'lucide-react';
import {
  closeDocket, loadOfficialComplaints, openIdCard, openReassign, openWorkflow, postReply, reviewIdCard, routeByHand, shortRef,
  useConsole, viewEvidenceAttachment, type OfficialComplaint,
} from '../console';
import { formatDate, formatRelative, unitName } from '../components/Queue';
import { AiPanel, Replies, RouteTracker } from '../../RouteTracker';
import { CATEGORIES, CATEGORY_LABELS, STATUS_NAMES } from '../../logic';
import * as auth from '../../civicAuth';

/** "in progress" → "In progress": sentence case, no shouting capitals. */
const statusText = (s: string | null | undefined) => { const t = STATUS_NAMES[s || 'submitted']?.en ?? (s || '').replace(/_/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };
const deskText = (v: string) => (v === 'social_service' ? 'DUSU desk' : v === 'administration' ? 'Administration' : 'Department desk');

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
    <section className="docket-card docket-reply">
      <h3 className="docket-label">Reply or internal note</h3>
      <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} aria-label="Reply or internal note"
        placeholder="Write in English or Assamese. Replies are translated so the reporter can read them in their language." />
      {error && <p className="docket-error" role="alert">{error}</p>}
      <div className="docket-reply-actions">
        <button type="button" className="btn-outline" disabled={busy || body.trim().length < 2} onClick={() => send('internal')}>Add internal note</button>
        <button type="button" className="btn" disabled={busy || body.trim().length < 2} onClick={() => send('public')}>Reply to reporter</button>
      </div>
    </section>
  );
}

/** AI analysis, route tracker, replies and (administration) routing by hand from the review queue. */
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
      {canRoute && (
        <section className="docket-card docket-route-now">
          <strong>{d.status === 'needs_review' ? 'In the review queue.' : 'Not routed yet.'}</strong>
          <label>Route as
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </label>
          <button type="button" className="btn" disabled={busy} onClick={async () => { setBusy(true); await routeByHand(d.id, category); setBusy(false); }}>
            {busy ? 'Routing…' : 'Route complaint'}
          </button>
        </section>
      )}
      <AiPanel routing={routing} />
      {isAdmin && !['closed', 'merged', 'rejected'].includes(d.status) && <form onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setEditError('');
        try { await auth.editAnalysis(d.id, category, priority); await loadOfficialComplaints(); }
        catch (err) { setEditError((err as Error).message); }
        finally { setBusy(false); }
      }} className="ai-correction-form">
        <label>Category <select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}</select></label>
        <label>Priority <select value={priority} onChange={(e) => setPriority(Number(e.target.value))}>{[1, 2, 3, 4].map((p) => <option key={p} value={p}>P{p}</option>)}</select></label>
        <button className="btn-outline" type="submit" disabled={busy}>Save correction</button>
        {editError && <p role="alert">{editError}</p>}
      </form>}
      <RouteTracker routes={routing.routes} status={d.status} />
      <Replies replies={routing.replies} lang="en" showInternal />
      <ReplyBox complaintId={d.id} />
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
      {status === 'rejected' && <p className="admin-check-alert">Complaint rejected. Review the official remarks in the history.</p>}
    </section>
  );
}

function History({ d }: { d: OfficialComplaint }) {
  const items = [...(d.history || [])].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  return (
    <section className="docket-card">
      <h3 className="docket-label">Status history &amp; remarks</h3>
      {items.length ? (
        <ol className="docket-timeline">
          {items.map((h, i) => (
            <li key={i} data-status={h.status}>
              <div className="docket-timeline-head">
                <span className={'chip chip-' + h.status}>{statusText(h.status)}</span>
                <time dateTime={h.created_at}>{formatDate(h.created_at)} · {formatRelative(h.created_at)}</time>
              </div>
              <div className="docket-timeline-actor">{h.actor ? h.actor.name + ' · ' + (h.actor.unit_name || h.actor.role) : 'Authorized official'}</div>
              {h.remark && <p className="docket-timeline-remark">{h.remark}</p>}
            </li>
          ))}
        </ol>
      ) : <p className="docket-muted">No remarks logged yet. Only the initial submission is recorded.</p>}
    </section>
  );
}

export function ComplaintDetailModal() {
  const s = useConsole();
  const d = s.complaints.find((c) => c.id === s.docketId) ?? null;
  const covered = !!(s.workflow || s.reassignId || s.idCard || s.confirm); // another dialog is open on top
  useEffect(() => {
    if (!d || covered) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDocket(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [d, covered]);
  if (!d) return null;

  const isAdmin = s.profile?.role === 'administration';
  const active = !['resolved', 'rejected', 'closed', 'merged'].includes(d.status);
  const idStatus = d.idCard?.status ?? 'pending';
  const nameHidden = !d.student && !!s.routing[d.id]?.hide_name_from_union;
  const studentName = d.student ? d.student.name : nameHidden ? "Name hidden (reporter's choice)" : 'Registered student';
  const studentEmail = d.student ? d.student.email : '';
  const files = d.evidence || [];

  return (
    <div className="modal-overlay" id="complaintDetailModal">
      <div className="docket" role="dialog" aria-modal="true" aria-labelledby="docketTitle">
        <header className="docket-head">
          <div className="docket-head-main">
            <div className="docket-head-tags">
              <span className="ticket-id-tag">#{shortRef(d.id)}</span>
              <span className={'chip chip-' + d.status}>{statusText(d.status)}</span>
              <span className={'chip chip-vis-' + (d.visibility === 'administration' ? 'admin' : d.visibility === 'social_service' ? 'social' : 'dept')}>{deskText(d.visibility)}</span>
            </div>
            <h2 id="docketTitle">{d.title}</h2>
            <p className="docket-head-meta"><Clock aria-hidden="true" />Filed <time dateTime={d.created_at}>{formatDate(d.created_at)}</time> · {formatRelative(d.created_at)}</p>
          </div>
          <button type="button" className="docket-close" aria-label="Close docket" onClick={() => closeDocket()}><X aria-hidden="true" /></button>
        </header>

        <div className="docket-body">
          <div className="docket-main">
            <section className="docket-card">
              <h3 className="docket-label">Grievance narrative</h3>
              <div className="docket-narrative">{d.description}</div>
              <div className="docket-files">
                {files.length ? files.map((ev, i) => (
                  <button key={i} type="button" className="docket-file" onClick={() => viewEvidenceAttachment(d.id, ev.cloudinary_public_id)}>
                    <Paperclip aria-hidden="true" />Attachment {i + 1}
                  </button>
                )) : <span className="docket-muted">No attachments.</span>}
              </div>
            </section>
            <DocketRouting key={d.id} d={d} isAdmin={isAdmin} />
            <History d={d} />
          </div>

          <aside className="docket-side">
            <section className="docket-card docket-people">
              <div>
                <h3 className="docket-label"><UserRound aria-hidden="true" />Reporter</h3>
                <strong>{studentName}</strong>
                {studentEmail && <span>{studentEmail}</span>}
              </div>
              <div>
                <h3 className="docket-label"><Building2 aria-hidden="true" />Assigned unit</h3>
                <strong>{unitName(d, 'Target department', 'General Campus Desk')}</strong>
                <span>Category: {d.category}</span>
              </div>
            </section>
            <section className="docket-card docket-id">
              <div className="docket-id-head">
                <h3 className="docket-label"><IdCard aria-hidden="true" />Student ID card</h3>
                <span className={'pill-id-' + idStatus}>{idStatus === 'verified' ? 'Verified' : idStatus === 'not_valid' ? 'Not valid' : 'Pending review'}</span>
              </div>
              <p className="docket-muted">Verify the student's enrolment before formally accepting the complaint.</p>
              <button type="button" className="btn-outline" onClick={() => openIdCard(d.student_id, d.student ? d.student.name : 'Student', d.student ? d.student.email : '')}>View student ID</button>
              <div className="docket-id-actions">
                <button type="button" className="btn" onClick={() => reviewIdCard('verified', d.student_id)}>Mark verified</button>
                <button type="button" className="btn-outline btn-red" onClick={() => reviewIdCard('not_valid', d.student_id)}>Not valid</button>
              </div>
            </section>
            <AdminLifecycleChecklist complaint={d} />
          </aside>
        </div>

        <footer className="docket-foot">
          <button type="button" className="btn-outline" onClick={() => closeDocket()}>Close</button>
          <div className="docket-foot-actions">
            {active && isAdmin && <button type="button" className="btn-outline" onClick={() => openReassign(d.id)}>Reassign unit</button>}
            {active && <button type="button" className="btn-outline btn-red" onClick={() => openWorkflow(d.id, 'rejected')}>Reject</button>}
            {(d.status === 'submitted' || d.status === 'under_verification') && <button type="button" className="btn" onClick={() => openWorkflow(d.id, 'accepted')}>Accept grievance</button>}
            {(d.status === 'accepted' || d.status === 'in_progress') && <button type="button" className={d.status === 'accepted' ? 'btn' : 'btn-outline'} onClick={() => openWorkflow(d.id, 'in_progress')}>Update progress</button>}
            {d.status === 'in_progress' && <button type="button" className="btn btn-blue" onClick={() => openWorkflow(d.id, 'resolved')}>Mark resolved</button>}
          </div>
        </footer>
      </div>
    </div>
  );
}
