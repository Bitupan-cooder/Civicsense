import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { STATUS_NAMES, ticketRef, waitingOn } from '../../logic';
import { useLanguage } from '../../i18n';
import { AiPanel, Replies, RouteTracker } from '../../RouteTracker';
import { ConfirmOrReopen } from '../pages/ComplaintPage';
import { useStudentSession } from '../studentSession';
import { loadStudentComplaints, searchFor, setTrackerQuery, useTracker, viewEvidenceFile } from '../tracker';

type TrackerView = 'mine' | 'track';

export function ReportTrackerSection() {
  const { profile } = useStudentSession();
  const tracker = useTracker();
  const { lang } = useLanguage();
  const [view, setView] = useState<TrackerView>('track');
  const [searchParams] = useSearchParams();
  const requestedId = searchParams.get('track');
  const requestedView = searchParams.get('view');

  useEffect(() => {
    if (profile && !tracker.mineLoaded && !tracker.mineLoading) loadStudentComplaints();
  }, [profile?.id, tracker.mineLoaded, tracker.mineLoading]);

  useEffect(() => {
    if (requestedView === 'mine' && profile) setView('mine');
    if (requestedId) {
      setView('track');
      searchFor(requestedId);
      window.setTimeout(() => document.getElementById('report-tracker')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
  }, [requestedId, requestedView, profile?.id]);

  useEffect(() => {
    const onNotification = (event: Event) => {
      const resultId = tracker.result?.id;
      if (resultId && (event as CustomEvent).detail?.complaint_id === resultId) searchFor(resultId);
    };
    window.addEventListener('civicsense:notification', onNotification);
    return () => window.removeEventListener('civicsense:notification', onNotification);
  }, [tracker.result?.id]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    searchFor(tracker.query);
  };

  const result = tracker.result;
  const status = result?.status || 'submitted';
  const routing = result ? tracker.routing[result.id] : undefined;
  const waiting = routing ? waitingOn(routing.routes, status) : null;

  return (
    <section className="report-tracker-section" id="report-tracker" aria-labelledby="report-tracker-title">
      <div className="report-tracker-inner">
        <div className="report-tracker-heading">
          <span className="report-tracker-kicker">Complaint tracking</span>
          <h2 id="report-tracker-title">Stay close to every update.</h2>
          <p>Follow your report’s progress or look up a complaint using its ticket ID.</p>
        </div>

        <div className="report-tracker-panel">
          {profile && (
            <div className="report-tracker-tabs" role="tablist" aria-label="Choose tracker view">
              <button type="button" role="tab" aria-selected={view === 'mine'} className={view === 'mine' ? 'is-active' : ''} onClick={() => setView('mine')}>
                My complaints <span>{tracker.mine.length}</span>
              </button>
              <button type="button" role="tab" aria-selected={view === 'track'} className={view === 'track' ? 'is-active' : ''} onClick={() => setView('track')}>
                Track by ticket ID
              </button>
            </div>
          )}

          {(!profile || view === 'track') ? (
            <div className="report-tracker-lookup">
              <form className="report-tracker-search" onSubmit={submitSearch}>
                <label className="sr-only" htmlFor="report-tracker-id">Complaint ticket ID</label>
                <input id="report-tracker-id" type="search" value={tracker.query} onChange={(event) => setTrackerQuery(event.target.value)} placeholder="Enter a ticket ID (e.g. CS-8921)" autoComplete="off" />
                <button type="submit" disabled={!tracker.query.trim()}>Track report <span aria-hidden="true">→</span></button>
              </form>
              {tracker.searchError && <p className="report-tracker-error" role="alert">{tracker.searchError}</p>}
              {profile && tracker.demoIds.length > 0 && (
                <div className="report-tracker-recent">
                  <span>Recent tickets</span>
                  <div>{tracker.demoIds.map((id) => <button type="button" key={id} onClick={() => searchFor(id)}>{id}</button>)}</div>
                </div>
              )}
              {result && (
                <article className="report-tracker-result" aria-live="polite">
                  <div className="report-tracker-result-top">
                    <span>{ticketRef(result.id)}</span>
                    <span className={`report-tracker-status status-${status}`}>{STATUS_NAMES[status]?.[lang] ?? status.replace(/_/g, ' ')}</span>
                  </div>
                  {waiting && <p className="report-tracker-waiting">Waiting on: {waiting}</p>}
                  <h3>{result.title}</h3>
                  <section className="report-tracker-detail-block">
                    <h4>What you wrote</h4>
                    <p>{result.description}</p>
                    {!!result.complaint_evidence?.length && (
                      <ul className="report-tracker-evidence">
                        {result.complaint_evidence.map((file, index) => (
                          <li key={file.cloudinary_public_id}>
                            <span>Evidence file {index + 1}</span>
                            <button type="button" onClick={() => viewEvidenceFile(result.id, file.cloudinary_public_id)}>View securely</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                  {routing?.duplicate_of && <p className="report-tracker-duplicate">This report was merged with ticket <button type="button" onClick={() => searchFor(routing.duplicate_of!)}>{ticketRef(routing.duplicate_of)}</button>.</p>}
                  {routing && <AiPanel routing={routing} />}
                  {routing && <RouteTracker routes={routing.routes} status={status} stepper />}
                  {routing && <Replies replies={routing.replies} lang={lang} showInternal={false} />}
                  {status === 'resolved' && routing && profile && <ConfirmOrReopen complaintId={result.id} onDone={() => searchFor(result.id)} />}
                  <section className="report-tracker-history" aria-label="Status history">
                    <h4>Status history</h4>
                    {result.complaint_status_history?.length ? (
                      <ol>
                        {result.complaint_status_history.map((entry, index) => (
                          <li key={`${entry.created_at}-${index}`}>
                            <strong>{STATUS_NAMES[entry.status || 'submitted']?.[lang] ?? entry.status}</strong>
                            <time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString(lang === 'as' ? 'as-IN' : 'en-IN')}</time>
                            {entry.remark && <p>{entry.remark}</p>}
                          </li>
                        ))}
                      </ol>
                    ) : <p>No status updates have been recorded yet.</p>}
                  </section>
                </article>
              )}
            </div>
          ) : (
            <div className="report-tracker-mine">
              {tracker.mineLoading ? <p className="report-tracker-empty" role="status">Loading your reports…</p> : tracker.mineError ? (
                <p className="report-tracker-error" role="alert">{tracker.mineError} <button type="button" onClick={() => loadStudentComplaints()}>Try again</button></p>
              ) : tracker.mine.length ? (
                <ul>
                  {tracker.mine.map((complaint) => {
                    const current = complaint.status || 'submitted';
                    return (
                      <li key={complaint.id}>
                        <button type="button" className="report-tracker-complaint-link" onClick={() => { setView('track'); searchFor(complaint.id); }}>
                          <span className="report-tracker-ticket">{ticketRef(complaint.id)}</span>
                          <strong>{complaint.title}</strong>
                          <span className="report-tracker-complaint-meta">{complaint.category} · {new Date(complaint.created_at).toLocaleDateString(lang === 'as' ? 'as-IN' : 'en-IN')}</span>
                        </button>
                        <span className={`report-tracker-status status-${current}`}>{STATUS_NAMES[current]?.[lang] ?? current.replace(/_/g, ' ')}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="report-tracker-empty">You haven’t filed a report yet. Once you do, its progress will appear here.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
