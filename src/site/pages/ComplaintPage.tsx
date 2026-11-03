// /complaints/:id (PRD "Complaint detail", reporter view). :id is the full id or the short reference (CS-XXXXXXXX).
// Shows who it is waiting on, the original text, the summary in the reader's language, replies (translated, original
// on request), the route tracker, status history and the merge flag; confirm or reopen once resolved.
// UNSTYLED ON PURPOSE: styling is done by the frontend. (AiPanel / RouteTracker / Replies are shared components the
// official console also uses; restyle them in src/RouteTracker.tsx.)
//
// Data: auth.fetchComplaintById + auth.fetchRouting; reloads on live notifications for this complaint.
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Complaint, Routing } from '../../civicAuth';
import * as auth from '../../civicAuth';
import { useLanguage } from '../../i18n';
import { STATUS_NAMES, ticketRef, waitingOn } from '../../logic';
import { AiPanel, Replies, RouteTracker } from '../../RouteTracker';
import { useStudentSession } from '../studentSession';
import { confirmResolution, viewEvidenceFile } from '../tracker';
import { PageShell, SignInRequired } from './PageShell';

/** PRD step 7: the reporter confirms the fix (closed) or reopens it with a note. */
export function ConfirmOrReopen({ complaintId, onDone }: { complaintId: string; onDone?: () => void }) {
  const { t } = useLanguage();
  const [reopening, setReopening] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const act = async (action: 'confirm' | 'reopen') => {
    setBusy(true);
    if (await confirmResolution(complaintId, action, note)) onDone?.();
    setBusy(false);
  };
  return (
    <section aria-label={t('complaint.isFixed')}>
      <p>{t('complaint.isFixed')}</p>
      {reopening ? (
        <form onSubmit={(e) => { e.preventDefault(); act('reopen'); }}>
          <label>{t('complaint.reopenNote')} <textarea required minLength={3} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <button type="submit" disabled={busy || note.trim().length < 3}>{t('complaint.reopen')}</button>
          <button type="button" onClick={() => setReopening(false)}>{t('common.cancel')}</button>
        </form>
      ) : (
        <>
          <button type="button" disabled={busy} onClick={() => act('confirm')}>{t('complaint.confirm')}</button>
          <button type="button" onClick={() => setReopening(true)}>{t('complaint.reopen')}</button>
        </>
      )}
    </section>
  );
}

export function ComplaintPage() {
  const { id = '' } = useParams();
  const { t, lang } = useLanguage();
  const { profile } = useStudentSession();
  const [complaint, setComplaint] = useState<Complaint | null | undefined>(undefined); // undefined: loading, null: not found
  const [routing, setRouting] = useState<Routing | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const c = await auth.fetchComplaintById(id);
      setComplaint(c);
      setRouting(c ? (await auth.fetchRouting([c.id]))[c.id] ?? null : null);
    } catch (err) { setError((err as Error).message || 'Unable to load this complaint.'); }
  }, [id]);

  useEffect(() => { if (profile) load(); }, [profile?.id, load]); // eslint-disable-line react-hooks/exhaustive-deps

  // live: a notification about this complaint (status change, reply) reloads it
  useEffect(() => {
    const onNotification = (e: Event) => { if ((e as CustomEvent).detail?.complaint_id === complaint?.id) load(); };
    window.addEventListener('civicsense:notification', onNotification);
    return () => window.removeEventListener('civicsense:notification', onNotification);
  }, [complaint?.id, load]);

  if (profile === undefined) return <PageShell title={t('complaint.title')}><p>{t('common.loading')}</p></PageShell>;
  if (!profile) return <PageShell title={t('complaint.title')}><SignInRequired next={`/complaints/${id}`} /></PageShell>;
  if (error) return <PageShell title={t('complaint.title')}><p role="alert">{error}</p><button type="button" onClick={load}>{t('common.retry')}</button></PageShell>;
  if (complaint === undefined) return <PageShell title={t('complaint.title')}><p>{t('common.loading')}</p></PageShell>;
  if (!complaint) return <PageShell title={t('complaint.title')}><p role="alert">{t('complaint.notFound')}</p></PageShell>;

  const status = complaint.status || 'submitted';
  const waiting = routing ? waitingOn(routing.routes, status) : null;
  const summary = routing ? (lang === 'as' ? routing.summary_as : routing.summary_en) : null;

  return (
    <PageShell title={`${ticketRef(complaint.id)} · ${complaint.title}`}>
      <p data-field="status">{STATUS_NAMES[status]?.[lang] ?? status}{waiting ? ` · Waiting on: ${waiting}` : routing?.routes.length ? ' · Route complete' : ''}</p>
      {routing?.duplicate_of && (
        <p data-field="merged">{t('complaint.duplicateOf')} <Link to={`/complaints/${routing.duplicate_of}`}>{ticketRef(routing.duplicate_of)}</Link></p>
      )}

      <section aria-label={t('complaint.original')}>
        <h2>{t('complaint.original')}</h2>
        <p>{complaint.description}</p>
        {!!complaint.complaint_evidence?.length && <ul>{complaint.complaint_evidence.map((file, i) => <li key={file.cloudinary_public_id}><button type="button" onClick={() => viewEvidenceFile(complaint.id, file.cloudinary_public_id)}>View attachment {i + 1}</button></li>)}</ul>}
      </section>

      {summary && (
        <section aria-label={t('complaint.summary')}>
          <h2>{t('complaint.summary')}</h2>
          <p lang={lang}>{summary}</p>
        </section>
      )}

      {routing && <AiPanel routing={routing} />}
      {routing && <RouteTracker routes={routing.routes} status={status} />}
      {routing && <Replies replies={routing.replies} lang={lang} showInternal={false} />}
      {status === 'resolved' && routing && <ConfirmOrReopen complaintId={complaint.id} onDone={load} />}

      <section aria-label={t('complaint.history')}>
        <h2>{t('complaint.history')}</h2>
        <ol>
          {(complaint.complaint_status_history || []).map((h, i) => (
            <li key={i}>
              <span>{STATUS_NAMES[h.status || 'submitted']?.[lang] ?? h.status}</span>{' '}
              <time dateTime={h.created_at}>{new Date(h.created_at).toLocaleString(lang === 'as' ? 'as-IN' : 'en-IN')}</time>
              {h.remark && <p>{h.remark}</p>}
            </li>
          ))}
        </ol>
      </section>
    </PageShell>
  );
}
