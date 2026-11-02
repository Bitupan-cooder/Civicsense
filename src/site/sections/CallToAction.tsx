// Markup converted 1:1 from the original index.html (React migration, step 1).
import { openTracker, openTrackerWithId } from '../tracker';

export function CallToAction() {
  return (
    <section className="cta" id="cta">
      {" "}
      <div className="sq-field" data-count="14" aria-hidden="true" />
      {" "}
      <div className="cta-img">
        {" "}
        <img id="ctaImg" src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261021_093217_cc690198-ad8c-4127-8734-8485bd878351.png" alt="Moonlit campus" />
        {" "}
      </div>
      {" "}
      <div id="petals" aria-hidden="true" />
      {" "}
      <div className="cta-card" id="ctaCard">
        {" "}
        <h2 className="h2 split">
          Every campus issue deserves
          <br />
          a verified resolution.
        </h2>
        {" "}
        <p style={{ fontSize: "14px", color: "#1a2e10", lineHeight: "1.55" }} className="reveal">
          No login. No bureaucracy. Your report lands in the right inbox in seconds and stays public until it's fixed.
        </p>
        {" "}
        <div className="cta-btns">
          {" "}
          <button className="btn reveal" onClick={() => document.getElementById('report')?.scrollIntoView({behavior:'smooth'})} style={{ fontSize: "14px", height: "44px", padding: "0 26px" }}>
            File a Report Now
          </button>
          {" "}
          <button className="btn-outline reveal" onClick={() => openTracker()}>
            Track Complaint
          </button>
          {" "}
        </div>
        {" "}
        <div className="track-form reveal">
          {" "}
          <p>
            Already filed? Track your complaint:
          </p>
          {" "}
          <div className="track-input-row">
            {" "}
            <input className="track-input" id="ctaTrackInput" type="text" placeholder="Complaint ID (e.g. CS-8921)" />
            {" "}
            <button className="btn" onClick={() => openTrackerWithId((document.getElementById('ctaTrackInput') as HTMLInputElement).value)}>
              Track
            </button>
            {" "}
          </div>
          {" "}
        </div>
        {" "}
        <p className="reveal" style={{ marginTop: "18px", fontSize: "11.5px", color: "#2a3a10" }}>
          {" "}Emergency? Call Security:{" "}
          <a href="tel:+913732370239" style={{ color: "var(--olive)", fontWeight: "700" }}>
            +91 (373) 237-0239
          </a>
          {" "}
        </p>
        {" "}
      </div>
      {" "}
    </section>
  );
}
