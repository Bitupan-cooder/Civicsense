// "My complaints" on /report/new: the student's list (search + status filter), and one ticket's details at ?track=<id>.
// The page is behind sign-in (ReportFormPage sends guests to /login), so a student is always signed in here.
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Complaint } from '../../civicAuth';
import { STATUS_NAMES, ticketRef, waitingOn } from '../../logic';
import { useLanguage } from '../../i18n';
import { ArrowLeft, CalendarDays, ChevronDown, ChevronRight, FileText, History, Hourglass, MapPin, Paperclip, Search, Tag } from 'lucide-react';
import { AiPanel, categoryLabel, Replies, RouteTracker } from '../../RouteTracker';
import { useStudentSession } from '../studentSession';
import { confirmResolution, filteredComplaints, loadStudentComplaints, searchFor, setFilterStatus, setFilterText, useTracker, viewEvidenceFile } from '../tracker';

const statusName = (status: string, lang: 'en' | 'as') => STATUS_NAMES[status]?.[lang] ?? status.replace(/_/g, ' ');

export function ReportTrackerSection() {
  const { profile } = useStudentSession();
  const tracker = useTracker();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedId = searchParams.get('track');
  const locale = lang === 'as' ? 'as-IN' : 'en-IN';
  // one formatter per language: building one per date is slow on phones
  const dayFormat = useMemo(() => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }), [locale]);
  const day = (ts: string) => dayFormat.format(new Date(ts));
  const open = (id: string) => navigate(`/report/new?track=${encodeURIComponent(id)}#report-tracker`);

  useEffect(() => {
    if (profile && !tracker.mineLoaded && !tracker.mineLoading) loadStudentComplaints();
  }, [profile?.id, tracker.mineLoaded, tracker.mineLoading]);

  useEffect(() => {
    if (requestedId) searchFor(requestedId);
    document.getElementById('report-tracker')?.scrollIntoView({ block: 'start' });
  }, [requestedId, profile?.id]);

  useEffect(() => {
    const onNotification = (event: Event) => {
      const resultId = tracker.result?.id;
      if (resultId && (event as CustomEvent).detail?.complaint_id === resultId) searchFor(resultId);
    };
    window.addEventListener('civicsense:notification', onNotification);
    return () => window.removeEventListener('civicsense:notification', onNotification);
  }, [tracker.result?.id]);

  // Enter opens the complaint when the search leaves exactly one (students can only read their own, so there is nothing to look up beyond the list)
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const matches = filteredComplaints(tracker);
    if (matches.length === 1) open(matches[0].id);
  };

  if (requestedId) {
    // the previous ticket stays in the store until the new one arrives: only show the one asked for
    const want = requestedId.trim().replace(/^CS-?/i, '').toLowerCase();
    const result = tracker.result?.id.startsWith(want) ? tracker.result : null;
    return (
      <section className="report-tracker-section" id="report-tracker" aria-label="Complaint details">
        <div className="report-tracker-inner">
          <button type="button" className="tr-back" onClick={() => navigate('/report/new?view=mine#report-tracker')}>
            <ArrowLeft aria-hidden="true" />All my complaints
          </button>
          {tracker.searchError ? <p className="report-tracker-error" role="alert">{tracker.searchError}</p>
            : result ? <TicketDetails result={result} day={day} />
            : <p className="report-tracker-empty" role="status">Loading the complaint…</p>}
        </div>
      </section>
    );
  }

  const shown = filteredComplaints(tracker);
  const statuses = [...new Set(tracker.mine.map((c) => c.status || 'submitted'))];
  return (
    <section className="report-tracker-section" id="report-tracker" aria-labelledby="report-tracker-title">
      <div className="report-tracker-inner">
        <div className="report-tracker-heading">
          <span className="report-tracker-kicker">Complaint tracking</span>
          <h2 id="report-tracker-title">My complaints</h2>
          <p>Everything you've reported, and where each one stands.</p>
        </div>

        {tracker.mineLoading && !tracker.mineLoaded ? <p className="report-tracker-empty" role="status">Loading your reports…</p> : tracker.mineError ? (
          <p className="report-tracker-error" role="alert">{tracker.mineError} <button type="button" onClick={() => loadStudentComplaints()}>Try again</button></p>
        ) : (
          <>
            <form className="tr-search" role="search" onSubmit={submitSearch}>
              <Search aria-hidden="true" />
              <label className="sr-only" htmlFor="report-tracker-id">Search your complaints or enter a ticket ID</label>
              <input id="report-tracker-id" type="search" value={tracker.filterText} onChange={(event) => setFilterText(event.target.value)}
                placeholder="Search by title, category or ticket ID (e.g. CS-8921)" autoComplete="off" />
            </form>
            {statuses.length > 1 && (
              <div className="tr-filters" role="group" aria-label="Filter by status">
                {['ALL', ...statuses].map((s) => (
                  <button type="button" key={s} aria-pressed={tracker.filterStatus === s} onClick={() => setFilterStatus(s)}>
                    {s === 'ALL' ? 'All' : statusName(s, lang)}
                    <span>{s === 'ALL' ? tracker.mine.length : tracker.mine.filter((c) => (c.status || 'submitted') === s).length}</span>
                  </button>
                ))}
              </div>
            )}
            {shown.length ? (
              <ul className="tr-list">
                {shown.map((complaint) => {
                  const status = complaint.status || 'submitted';
                  const routing = tracker.routing[complaint.id];
                  const waiting = routing ? waitingOn(routing.routes, status) : null;
                  return (
                    <li key={complaint.id}>
                      <button type="button" className="tr-row" data-status={status} onClick={() => open(complaint.id)}>
                        <span className="tr-row-top">
                          <span className="report-tracker-ticket">{ticketRef(complaint.id)}</span>
                          <span className={`report-tracker-status status-${status}`}>{statusName(status, lang)}</span>
                        </span>
                        <strong>{complaint.title}</strong>
                        <span className="tr-row-meta">
                          <span><Tag aria-hidden="true" />{categoryLabel(routing?.ai_category ?? complaint.category)}</span>
                          <span><CalendarDays aria-hidden="true" />{day(complaint.created_at)}</span>
                          {waiting && <span className="tr-row-wait"><Hourglass aria-hidden="true" />Waiting on: {waiting}</span>}
                        </span>
                        <ChevronRight className="tr-row-go" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : tracker.mine.length ? (
              <p className="report-tracker-empty">No complaints match your search.</p>
            ) : (
              <p className="report-tracker-empty">You haven’t filed a report yet. Once you do, its progress will appear here.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function TicketDetails({ result, day }: { result: Complaint; day: (ts: string) => string }) {
  const tracker = useTracker();
  const { lang } = useLanguage();
  const status = result.status || 'submitted';
  const routing = tracker.routing[result.id];
  const waiting = routing ? waitingOn(routing.routes, status) : null;
  return (
    <article className="report-tracker-result" data-status={status} aria-live="polite">
      <header className="tr-head">
        <div className="report-tracker-result-top">
          <span>{ticketRef(result.id)}</span>
          <span className={`report-tracker-status status-${status}`}>{statusName(status, lang)}</span>
        </div>
        <h3>{result.title}</h3>
        <div className="tr-meta">
          <span><CalendarDays aria-hidden="true" />{day(result.created_at)}</span>
          <span><Tag aria-hidden="true" />{categoryLabel(routing?.ai_category ?? result.category)}</span>
          {routing?.location_text && <span><MapPin aria-hidden="true" />{routing.location_text}</span>}
        </div>
      </header>
      {waiting && (
        <div className="tr-now">
          <Hourglass aria-hidden="true" />
          <div>
            <strong>Waiting on: {waiting}</strong>
            <span>{waiting === 'Reporter confirmation' ? 'The office marked it fixed. Please tell us if it really is.' : "You'll get a notification as soon as it moves forward."}</span>
          </div>
        </div>
      )}
      {status === 'resolved' && routing && <div className="tr-card tr-confirm"><ConfirmOrReopen complaintId={result.id} onDone={() => searchFor(result.id)} /></div>}
      <div className="tr-body">
        <aside className="tr-side">
          <StatusChecklist complaint={result} />
          {!!result.complaint_status_history?.length && (
            <details className="report-tracker-history tr-card">
              <summary className="tr-label"><History aria-hidden="true" />Show full history<ChevronDown className="tr-chevron" aria-hidden="true" /></summary>
              <ol>
                {result.complaint_status_history.map((entry, index) => (
                  <li key={`${entry.created_at}-${index}`}>
                    <strong>{statusName(entry.status || 'submitted', lang)}</strong>
                    <time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString(lang === 'as' ? 'as-IN' : 'en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
                    {entry.remark && <p>{entry.remark}</p>}
                  </li>
                ))}
              </ol>
            </details>
          )}
        </aside>
        <div className="tr-main">
          <section className="tr-card">
            <h4 className="tr-label"><FileText aria-hidden="true" />What you wrote</h4>
            <p className="tr-narrative">{result.description}</p>
            {!!result.complaint_evidence?.length && (
              <div className="tr-files">
                {result.complaint_evidence.map((file, index) => (
                  <button type="button" key={file.cloudinary_public_id} title="View securely" onClick={() => viewEvidenceFile(result.id, file.cloudinary_public_id)}>
                    <Paperclip aria-hidden="true" />Evidence file {index + 1}
                  </button>
                ))}
              </div>
            )}
          </section>
          {routing?.duplicate_of && <p className="report-tracker-duplicate">This report was merged with ticket <strong>{ticketRef(routing.duplicate_of)}</strong>. <span>Updates continue there, and you'll be notified.</span></p>}
          {routing && <Replies replies={routing.replies} lang={lang} showInternal={false} />}
          {/* students see only the office that must resolve it; copied posts are for the admin docket */}
          {routing && <RouteTracker routes={routing.routes.filter((r) => r.kind === 'primary')} status={status} stepper title="Who's handling it" />}
          {routing && <AiPanel routing={routing} />}
        </div>
      </div>
    </article>
  );
}

function formatTime(ts: string | null | undefined): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_CHECKS = [
  { key: 'submitted', label: 'Complaint received', statuses: ['submitted'] },
  { key: 'review', label: 'Initial review', statuses: ['under_verification', 'needs_review'] },
  { key: 'accepted', label: 'Accepted by an official', statuses: ['accepted'] },
  { key: 'in_progress', label: 'Remediation in progress', statuses: ['in_progress'] },
  { key: 'resolved', label: 'Marked resolved', statuses: ['resolved', 'closed'] },
] as const;

function StatusChecklist({ complaint }: { complaint: Complaint }) {
  const status = complaint.status || 'submitted';
  const activeIndex = status === 'rejected' ? 1 : STATUS_CHECKS.findIndex((step) => step.statuses.includes(status as never));
  const history = [...(complaint.complaint_status_history || [])].sort((a, b) => Date.parse(a.created_at || '') - Date.parse(b.created_at || ''));
  return (
    <section className="student-status-checklist" aria-label="Complaint status checklist">
      <h3>Complaint progress</h3>
      <ol>
        {STATUS_CHECKS.map((step, index) => {
          const completed = activeIndex > index || (status === 'closed' && index === STATUS_CHECKS.length - 1);
          const current = activeIndex === index;
          const event = [...history].reverse().find((item) => step.statuses.includes(item.status as never));
          return (
            <li key={step.key} className={completed ? 'is-complete' : current ? 'is-current' : ''}>
              <span className="student-status-check-icon" aria-hidden="true">{completed ? '✓' : current ? '◷' : ''}</span>
              <div className="student-status-check-copy">
                <strong>{step.label}</strong>
                <span>{event?.created_at ? formatTime(event.created_at) : completed ? 'Completed' : current ? 'Current step' : 'Pending'}</span>
                {event?.remark && <p>{event.remark}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      {status === 'rejected' && <p className="student-status-alert">This complaint was rejected. See the latest status update for the official’s remarks.</p>}
      {status === 'merged' && <p className="student-status-alert">This report was combined with a related complaint. Updates continue there.</p>}
    </section>
  );
}

/** PRD step 7: the reporter confirms the fix (closed) or reopens it with a note. */
function ConfirmOrReopen({ complaintId, onDone }: { complaintId: string; onDone?: () => void }) {
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
