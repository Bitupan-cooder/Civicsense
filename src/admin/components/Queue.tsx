// Dynamic parts of the workspace, rendered from ../console.ts. The markup reproduces what the old page
// script built with innerHTML.
import type { CSSProperties } from 'react';
import { categoryLabel, PriorityChip } from '../../RouteTracker';
import {
  deleteOfficial, filteredComplaints, loadOfficialComplaints, openDocket, openEditOfficial, openIdCard, openReassign, openResetPassword,
  openWorkflow, shortRef, toggleOfficialStatus, useConsole, type OfficialComplaint, type Profile,
} from '../console';

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '';
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return min + 'm ago';
  const hr = Math.floor(min / 60);
  return hr < 24 ? hr + 'h ago' : Math.floor(hr / 24) + 'd ago';
}

export const unitName = (c: OfficialComplaint, dept: string, general: string) =>
  c.target_unit ? c.target_unit.unit_name || c.target_unit.name : c.visibility === 'department' ? dept : general;

const Spinner = () => (
  <div style={{ width: '24px', height: '24px', border: '2.5px solid var(--line)', borderTopColor: 'var(--olive)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
);

function roleTitle(p: Profile): string {
  return p.unit_name || (p.role === 'administration' ? 'Central Administration & Registry' : 'DUSU Social Welfare Desk');
}

/** Texts of the jurisdiction banner. */
export function Banner({ part }: { part: 'heading' | 'name' | 'role' }) {
  const { profile: p } = useConsole();
  if (!p) {
    const defaults = { name: 'Authorized Official', role: 'Campus Jurisdiction' };
    return part === 'heading' ? <>Official Redressal{' '}<em id="bannerItalic">Workspace</em></> : <>{defaults[part]}</>;
  }
  const dept = p.unit_name || 'Official Desk';
  const heading = {
    administration: <>Central Administration <em>&amp; Registry</em></>,
    social_service: <>DUSU Executive Council <em>Oversight</em></>,
    department: <>{dept} <em>(Desk)</em></>,
  }[p.role === 'administration' || p.role === 'social_service' ? p.role : 'department'];
  if (part === 'name') return <>{p.name}</>;
  if (part === 'role') return <>{roleTitle(p)}</>;
  return heading;
}

const isActiveCase = (c: OfficialComplaint) => !['resolved', 'rejected', 'closed', 'merged'].includes(c.status);

export function UnitBreakdown({ part }: { part: 'total' | 'grid' }) {
  const { complaints, loaded, profile } = useConsole();
  const shown = loaded && profile?.role === 'administration';
  const counts: Record<string, number> = {};
  complaints.filter(isActiveCase).forEach((c) => {
    const name = (c.target_unit && (c.target_unit.unit_name || c.target_unit.name)) || 'Unassigned / General';
    counts[name] = (counts[name] || 0) + 1;
  });
  if (part === 'total') return <>{'Total: ' + (shown ? complaints.filter(isActiveCase).length : 0) + ' Active Cases'}</>;
  if (!shown) return null;
  const units = Object.keys(counts).sort();
  if (!units.length) return <div style={{ fontSize: '12.5px', color: '#64748b', gridColumn: '1/-1' }}>No pending complaints assigned to department desks.</div>;
  return <>{units.map((u) => <div key={u} className="unit-badge-card"><span className="unit-badge-name">{u}</span><span className="unit-badge-count">{counts[u]}</span></div>)}</>;
}

export function KpiCards() {
  const { complaints: all, loaded } = useConsole();
  if (!loaded) return null;
  const kpis: [number, string, string][] = [
    [all.length, 'Total Grievances in Queue', 'var(--olive)'],
    [all.filter((c) => c.status === 'submitted' || c.status === 'under_verification').length, 'Awaiting Verification & Review', 'var(--amber)'],
    [all.filter((c) => c.status === 'accepted' || c.status === 'in_progress').length, 'Under Active Remediation', 'var(--blue)'],
    [all.filter((c) => c.status === 'resolved').length, 'Resolved & Signed Off', 'var(--green)'],
  ];
  return <>{kpis.map(([val, lbl, color]) => (
    <div key={lbl} className="kpi-card" style={{ '--kpi-col': color } as CSSProperties}><div className="kpi-val">{val}</div><div className="kpi-lbl">{lbl}</div></div>
  ))}</>;
}

const STATUS_CHIP: Record<string, string> = {
  under_verification: 'Under Verification', accepted: 'Accepted', in_progress: 'In Progress', resolved: 'Resolved', rejected: 'Rejected', closed: 'Closed', merged: 'Merged',
};

function TicketCard({ c, isAdmin }: { c: OfficialComplaint; isAdmin: boolean }) {
  const ai = useConsole().routing[c.id];
  const studentName = c.student ? c.student.name : ai?.hide_name_from_union ? "Name hidden (reporter's choice)" : 'Registered Student';
  const studentEmail = c.student ? c.student.email : '';
  const evidenceCount = c.evidence?.length || 0;
  const id = c.idCard?.status;
  const statusChip = STATUS_CHIP[c.status]
    ? <span className={'chip chip-' + c.status}>{STATUS_CHIP[c.status]}</span>
    : <span className="chip chip-submitted">Submitted</span>;
  // the default (administration) needs no badge; only say so when a complaint was aimed at a desk
  const visChip = c.visibility === 'social_service' ? <span className="chip chip-vis-social">DUSU desk</span>
    : c.visibility === 'department' ? <span className="chip chip-vis-dept">Department desk</span>
    : null;
  const act = (status: string) => () => openWorkflow(c.id, status);
  let workflow;
  if (c.status === 'submitted' || c.status === 'under_verification') {
    workflow = <><button type="button" className="btn" onClick={act('accepted')}>Accept Grievance</button>
      <button type="button" className="btn-outline btn-red" onClick={act('rejected')}>Reject</button></>;
  } else if (c.status === 'accepted') {
    workflow = <><button type="button" className="btn" onClick={act('in_progress')}>Start Remediation</button>
      <button type="button" className="btn-outline btn-red" onClick={act('rejected')}>Reject</button></>;
  } else if (c.status === 'in_progress') {
    workflow = <><button type="button" className="btn-outline" onClick={act('in_progress')}>Log Progress Remark</button>
      <button type="button" className="btn btn-blue" onClick={act('resolved')}>Mark Resolved</button></>;
  } else if (c.status === 'resolved') {
    workflow = <span style={{ fontSize: '12px', color: 'var(--olive)', fontWeight: 700 }}>Remediation Complete</span>;
  } else if (c.status === 'rejected') {
    workflow = <span style={{ fontSize: '12px', color: '#991b1b', fontWeight: 700 }}>Grievance Rejected</span>;
  }

  return (
    <div className="ticket-card">
      <div className="ticket-card-header">
        <div className="ticket-title-row">
          <span className="ticket-id-tag">#{shortRef(c.id)}</span>
          <h3 className="ticket-heading">{c.title}</h3>
        </div>
        <div className="ticket-badges-group">
          {c.status === 'needs_review'
            ? <span className="chip chip-needs_review">Needs review</span>
            : statusChip}
          {/* the AI's category replaces the reporter's legacy one once the complaint is analysed */}
          <span className="chip chip-category">{ai?.analysed_at ? categoryLabel(ai.ai_category) : c.category}</span>
          {ai?.analysed_at && <PriorityChip priority={ai.priority} />}
          {visChip}
          {id === 'verified' ? <span className="pill-id-verified">ID Verified</span>
            : id === 'not_valid' ? <span className="pill-id-not_valid">ID Not Valid</span>
            : <span className="pill-id-pending">ID Pending Review</span>}
        </div>
      </div>
      <div className="ticket-meta-row">
        <span>Student <strong>{studentName}</strong>{studentEmail && <> ({studentEmail})</>}</span>
        <span>Unit <strong>{unitName(c, 'Assigned Department', 'General Campus')}</strong></span>
        <span>Filed <time dateTime={c.created_at}>{formatDate(c.created_at)}</time> ({formatRelative(c.created_at)})</span>
        {evidenceCount > 0 && <span className="ticket-evidence">{evidenceCount === 1 ? '1 attachment' : evidenceCount + ' attachments'}</span>}
      </div>
      <p className="ticket-description">
        {c.description}
      </p>
      <div className="ticket-actions-row">
        <button type="button" className="btn" onClick={() => openDocket(c.id)}>Open Docket &amp; History</button>
        <button type="button" className="btn-outline" onClick={() => openIdCard(c.student_id, studentName, studentEmail)}>View Student ID Card</button>
        {isAdmin && isActiveCase(c) && (
          <button type="button" className="btn-outline" onClick={() => openReassign(c.id)}>Reassign Unit</button>
        )}
        {workflow}
      </div>
    </div>
  );
}

export function TicketsStack() {
  const s = useConsole();
  if (s.loading) {
    return <div style={{ background: '#ffffff', border: '1.5px solid var(--line)', borderRadius: '18px', padding: '36px', textAlign: 'center', color: '#4a6142' }}><Spinner />Loading official grievance queue from database...</div>;
  }
  if (s.loadError) {
    return (
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '18px', padding: '32px', textAlign: 'center', color: '#991b1b' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>Unable to load complaints</h3>
        <p style={{ fontSize: '12.5px', lineHeight: 1.45 }}>{s.loadError}</p>
        <button type="button" className="btn" style={{ marginTop: '14px', height: '32px', fontSize: '12px' }} onClick={() => loadOfficialComplaints()}>Retry</button>
      </div>
    );
  }
  if (!s.loaded) return null;
  const list = filteredComplaints(s);
  if (!list.length) {
    return (
      <div style={{ background: '#ffffff', border: '1.5px dashed var(--line)', borderRadius: '20px', padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', marginBottom: '4px' }}>No complaints match the selected criteria</h3>
        <p style={{ fontSize: '13px', color: '#4a6142' }}>Adjust your search or filter settings to view other grievances.</p>
      </div>
    );
  }
  const isAdmin = s.profile?.role === 'administration';
  return <>{list.map((c) => <TicketCard key={c.id} c={c} isAdmin={isAdmin} />)}</>;
}

const ROLE_LABEL: Record<string, string> = { social_service: 'Social Service (DUSU)', administration: 'Administration' };
const TABLE_MSG = { textAlign: 'center', padding: '36px', color: '#64748b' } as const;

export function OfficialRows() {
  const { officials, officialsError } = useConsole();
  if (officials === null) return <tr><td colSpan={7} style={TABLE_MSG}><Spinner />Fetching official accounts from database...</td></tr>;
  if (officialsError) return <tr><td colSpan={7} style={{ ...TABLE_MSG, color: '#991b1b' }}>Failed to load officials: {officialsError}</td></tr>;
  if (!officials.length) return <tr><td colSpan={7} style={TABLE_MSG}>No official accounts found. Click "Provision New Official Profile" to create one.</td></tr>;
  return <>{officials.map((off) => {
    const active = off.is_active !== false;
    return (
      <tr key={off.id}>
        <td style={{ fontWeight: 700, color: 'var(--ink)' }}>{off.name}</td>
        <td><span className="chip" style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}>{ROLE_LABEL[off.role] ?? 'Department Head'}</span></td>
        <td>{off.unit_name || 'General Desk'}</td>
        <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#334155' }}>{off.email}</td>
        <td>{active ? <span className="chip chip-resolved">Active</span> : <span className="chip chip-rejected">Deactivated</span>}</td>
        <td>{off.must_change_password ? <span className="chip chip-submitted">Must Change</span> : <span className="chip chip-resolved">Configured</span>}</td>
        <td style={{ textAlign: 'right' }}>
          <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-sm btn-outline" onClick={() => openEditOfficial(off.id, off.name, off.unit_name || '')}>Edit</button>
            <button type="button" className={'btn-sm ' + (active ? 'btn-outline btn-red' : 'btn-outline')} onClick={() => toggleOfficialStatus(off.id, active)}>{active ? 'Deactivate' : 'Activate'}</button>
            <button type="button" className="btn-sm btn-outline" style={{ borderColor: 'var(--blue)', color: 'var(--blue)' }} onClick={() => openResetPassword(off.id, off.name, off.email || '', off.unit_name || '')}>Reset Password</button>
          </div>
        </td>
      </tr>
    );
  })}</>;
}

const AUDIT_ACTION_BADGES: Record<string, [string, string]> = {
  complaint_status_update: ['chip-accepted', 'Status Update'],
  complaint_submitted: ['chip-submitted', 'Complaint Submitted'],
  complaint_reassigned: ['chip-escalated', 'Reassigned'],
  id_card_review: ['chip-resolved', 'ID Review'],
  id_card_reupload: ['chip-under_verification', 'ID Re-upload'],
  official_account_created: ['chip-in_progress', 'Account Created'],
  official_account_deleted: ['chip-rejected', 'Account Deleted'],
  official_profile_edited: ['chip-ip', 'Profile Updated'],
  official_password_reset: ['chip-under_verification', 'Password Reset'],
  account_activated: ['chip-resolved', 'Activated'],
  account_deactivated: ['chip-rejected', 'Deactivated'],
  password_change: ['chip-ip', 'Password Changed'],
  student_signup: ['chip-submitted', 'Student Signup'],
  user_login: ['chip-submitted', 'Login'],
};

export function AuditRows() {
  const { logs, logsError, logFilter } = useConsole();
  if (logs === null) return <tr><td colSpan={4} style={TABLE_MSG}><Spinner />Loading audit trail from database...</td></tr>;
  if (logsError) return <tr><td colSpan={4} style={{ ...TABLE_MSG, color: '#991b1b' }}>Failed to load audit logs: {logsError}</td></tr>;
  const list = logFilter === 'all' ? logs : logs.filter((l) => l.action === logFilter);
  if (!list.length) return <tr><td colSpan={4} style={TABLE_MSG}>No audit records found for the selected filter.</td></tr>;
  return <>{list.map((item, i) => {
    const actor = item.actor ? item.actor.name + (item.actor.unit_name ? ' (' + item.actor.unit_name + ')' : ' [' + item.actor.role + ']') : 'System / Administrator';
    const [cls, label] = AUDIT_ACTION_BADGES[item.action] || ['chip-submitted', item.action || 'Unknown'];
    return (
      <tr key={i}>
        <td style={{ whiteSpace: 'nowrap', fontSize: '12px', color: '#64748b' }}>{formatDate(item.created_at)}</td>
        <td style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)' }}>{actor}</td>
        <td><span className={'chip ' + cls}>{label}</span></td>
        <td>{item.target ? <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>{item.target}</div> : <span style={{ color: '#94a3b8' }}>--</span>}</td>
      </tr>
    );
  })}</>;
}
