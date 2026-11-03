// /my (PRD "My complaints"): the reporter's complaints with status, who each is waiting on, and confirm/reopen
// once resolved. UNSTYLED ON PURPOSE: styling is done by the frontend.
//
// Data: tracker.ts store (loadStudentComplaints → mine, mineLoading, mineError, routing[id]); refreshes live on
// notifications (StudentNotifications calls loadStudentComplaints).
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { categoryLabel, priorityLabel } from '../../RouteTracker';
import { STATUS_NAMES, ticketRef, waitingOn } from '../../logic';
import { useLanguage } from '../../i18n';
import { useStudentSession } from '../studentSession';
import { loadStudentComplaints, useTracker } from '../tracker';
import { ConfirmOrReopen } from './ComplaintPage';
import { PageShell, SignInRequired } from './PageShell';

export function MyComplaintsPage() {
  const { t, lang } = useLanguage();
  const { profile } = useStudentSession();
  const tr = useTracker();

  useEffect(() => { if (profile) loadStudentComplaints(); }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (profile === undefined) return <PageShell title={t('my.title')}><p>{t('common.loading')}</p></PageShell>;
  if (!profile) return <PageShell title={t('my.title')}><SignInRequired next="/my" /></PageShell>;

  return (
    <PageShell title={t('my.title')}>
      {tr.mineLoading && <p>{t('common.loading')}</p>}
      {tr.mineError && <p role="alert">{tr.mineError} <button type="button" onClick={() => loadStudentComplaints()}>{t('common.retry')}</button></p>}
      {tr.mineLoaded && !tr.mineLoading && !tr.mineError && tr.mine.length === 0 && (
        <p>{t('my.empty')} <Link to="/report">{t('nav.report')}</Link></p>
      )}
      <ul>
        {tr.mine.map((c) => {
          const r = tr.routing[c.id];
          const status = c.status || 'submitted';
          const waiting = r ? waitingOn(r.routes, status) : null;
          return (
            <li key={c.id} data-status={status}>
              <Link to={`/report?track=${encodeURIComponent(c.id)}#report-tracker`}>{ticketRef(c.id)} · {c.title}</Link>
              <span data-field="status">{STATUS_NAMES[status]?.[lang] ?? status}</span>
              {r?.analysed_at && <span data-field="ai">{categoryLabel(r.ai_category)} · {priorityLabel(r.priority)}</span>}
              {waiting && <span data-field="waiting">Waiting on: {waiting}</span>}
              <time dateTime={c.created_at}>{new Date(c.created_at).toLocaleDateString(lang === 'as' ? 'as-IN' : 'en-IN')}</time>
              {status === 'resolved' && r && <ConfirmOrReopen complaintId={c.id} />}
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
