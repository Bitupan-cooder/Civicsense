import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStudentSession } from '../studentSession';
import { StudentWelcomeCard } from '../components/StudentAuthWidgets';
import { loadStudentComplaints, useTracker } from '../tracker';
import { ticketRef } from '../../logic';
import { LayeredText } from '../../components/ui/layered-text';

export function StudentSignInSection() {
  const { profile } = useStudentSession();
  const tracker = useTracker();

  useEffect(() => {
    if (profile && !tracker.mineLoaded && !tracker.mineLoading) loadStudentComplaints();
  }, [profile?.id, tracker.mineLoaded, tracker.mineLoading]);

  const publicReplies = profile ? tracker.mine.flatMap((complaint) => {
    const replies = (tracker.routing[complaint.id]?.replies ?? [])
      .filter((reply) => reply.visibility === 'public')
      .map((reply) => {
        const translated = profile.preferred_language === 'as' ? reply.body_as : reply.body_en;
        return {
          complaint,
          id: reply.id,
          from: reply.from,
          body: translated || reply.body_original,
          lang: translated ? profile.preferred_language : reply.body_language === 'as' ? 'as' : 'en',
          created_at: reply.created_at,
        };
      });
    const officialRemarks = (complaint.complaint_status_history ?? [])
      .filter((entry) => entry.remark && entry.status !== 'submitted')
      .map((entry) => ({
        complaint,
        id: `status-${entry.status}-${entry.created_at}`,
        from: 'Official status update',
        body: entry.remark!,
        lang: 'en',
        created_at: entry.created_at,
      }));
    return [...replies, ...officialRemarks];
  }) : [];

  return (
    <section className="student-signin-section" id="student-signin">
      <div className="student-signin-inner">
        <div className="student-portal-layout">
          <LayeredText className="student-portal-art" />
          <div className="student-portal-content">
            {profile ? <StudentWelcomeCard /> : (
              <div className="student-signin-card student-signin-ready">
                <div>
                  <h2>Have an issue on campus?</h2>
                  <p>Tell us what happened. We’ll guide you through signing in and submitting your report.</p>
                </div>
                <div className="student-signin-actions">
                  <Link className="student-signin-report-button" to="/report/new">Report here <span aria-hidden="true">→</span></Link>
                </div>
              </div>
            )}
          </div>
        </div>
        {profile && <section className="index-confirmed-replies" aria-labelledby="index-confirmed-replies-title">
              <div className="index-replies-heading">
                <p>Report updates</p>
                <h3 id="index-confirmed-replies-title">Official replies &amp; status updates</h3>
                <span>Public authority replies and report notes appear here as your reports are updated.</span>
              </div>
              {publicReplies.length ? (
                <div className="reply-marquee" aria-label="Public replies on your reports">
                  <div className="reply-marquee-tilt">
                    {Array.from({ length: 4 }, (_, column) => {
                      const entries = publicReplies.filter((_, index) => index % 4 === column);
                      const columnItems = entries.length ? entries : publicReplies.slice(column % publicReplies.length, (column % publicReplies.length) + 1);
                      const loopItems = [...columnItems, ...columnItems];
                      return (
                        <div className={`reply-marquee-column${column % 2 ? ' is-reversed' : ''}`} key={column}>
                          <div className="reply-marquee-track">
                            {loopItems.map(({ complaint, id, from, body, lang, created_at }, index) => {
                              return (
                                <article className="index-reply-card" key={`${id}-${index}`}>
                                  <div className="index-reply-card-author">
                                    <span className="index-reply-avatar" aria-hidden="true">{from.trim().charAt(0).toUpperCase()}</span>
                                    <div><strong>{from}</strong><small>Official update</small></div>
                                  </div>
                                  <Link to={`/report/new?track=${encodeURIComponent(complaint.id)}#report-tracker`}>{ticketRef(complaint.id)} · {complaint.title}</Link>
                                  <blockquote lang={lang}>{body}</blockquote>
                                  <time dateTime={created_at}>{new Date(created_at).toLocaleDateString(profile.preferred_language === 'as' ? 'as-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                                </article>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="reply-marquee-fade" aria-hidden="true" />
                </div>
              ) : (
                <div className="index-replies-empty" role="status">
                  {tracker.mineLoading ? 'Loading your report updates…' : 'Public admin replies on your reports will appear here.'}
                </div>
              )}
        </section>}
      </div>
    </section>
  );
}
