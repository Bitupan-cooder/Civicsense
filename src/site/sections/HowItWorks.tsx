// Markup converted 1:1 from the original index.html (React migration, step 1).
import how1ReportImg from '../../../Flat Assets/civic/how-1-report.webp';
import how2RoutingImg from '../../../Flat Assets/civic/how-2-routing.webp';
import how3ActionImg from '../../../Flat Assets/civic/how-3-action.webp';
import how4TrackImg from '../../../Flat Assets/civic/how-4-track.webp';

export function HowItWorks() {
  return (
    <section className="loop" id="how">
      <div className="loop-cloud" data-par="-50">
        <img className="drift-a" src="/images/cloud-a.webp" alt="" />
        <div className="glass" style={{ left: "6%", top: "30%", width: "15%", aspectRatio: "1" }} aria-hidden="true" />
        <div className="glass" style={{ left: "23%", top: "58%", width: "13%", aspectRatio: "1" }} aria-hidden="true" />
        <div className="glass" style={{ left: "38%", top: "24%", width: "13%", aspectRatio: "1" }} aria-hidden="true" />
      </div>
      <div className="loop-head">
        <h2 className="h2 split">
          Complaint filed to problem
          <br />
          <em style={{ color: "var(--olive)", fontStyle: "italic" }}>
            solved &amp; verified.
          </em>
        </h2>
      </div>
      <div className="track" id="track">
        <div className="panel is-active" tabIndex={0} aria-label="Step 1: Report">
          <div className="panel-in">
            <span className="num">1</span>
            <div className="step">
              <img className="mini-cloud" src="/images/cloud-b.webp" alt="" aria-hidden="true" />
              <h3>Report an Issue</h3>
              <p>
                Pick your campus landmark, describe what happened, and attach an optional photo. Submissions take less than a minute.
              </p>
            </div>
            <div className="panel-char-wrap" aria-hidden="true">
              <img
                className="panel-char-img"
                src={how1ReportImg}
                alt="Student taking a photo of a campus issue"
              />
            </div>
          </div>
        </div>
        <div className="panel" tabIndex={0} aria-label="Step 2: Routes">
          <div className="panel-in">
            <span className="num">2</span>
            <div className="step">
              <img className="mini-cloud" src="/images/cloud-a.webp" alt="" aria-hidden="true" />
              <h3>Triage &amp; Routing</h3>
              <p>
                Automated triage identifies urgency, checks for duplicate reports, and routes the ticket directly to the assigned department desk.
              </p>
            </div>
            <div className="panel-char-wrap" aria-hidden="true">
              <img
                className="panel-char-img"
                src={how2RoutingImg}
                alt="Automated triage and department routing desk"
              />
            </div>
          </div>
        </div>
        <div className="panel" tabIndex={0} aria-label="Step 3: Official Action">
          <div className="panel-in">
            <span className="num">3</span>
            <div className="step">
              <img className="mini-cloud" src="/images/cloud-b.webp" alt="" aria-hidden="true" />
              <h3>Official Action &amp; Updates</h3>
              <p>
                Department teams log each milestone from confirmation to repair. Updates stay visible on the live timeline, and overdue cases escalate automatically.
              </p>
            </div>
            <div className="panel-char-wrap" aria-hidden="true">
              <img
                className="panel-char-img"
                src={how3ActionImg}
                alt="Authorized teams taking action and verifying repairs"
              />
            </div>
          </div>
        </div>
        <div className="panel" tabIndex={0} aria-label="Step 4: Track Live">
          <div className="panel-in">
            <span className="num">4</span>
            <div className="step">
              <img className="mini-cloud" src="/images/cloud-a.webp" alt="" aria-hidden="true" />
              <h3>Track Live Status</h3>
              <p>
                Check your Complaint ID anytime to follow official responses, deadline countdowns, and community upvotes.
              </p>
            </div>
            <div className="panel-char-wrap" aria-hidden="true">
              <img
                className="panel-char-img"
                src={how4TrackImg}
                alt="Student tracking complaint progress and live status"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
