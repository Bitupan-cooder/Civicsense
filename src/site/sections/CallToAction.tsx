// Markup converted 1:1 from the original index.html (React migration, step 1).
import { Link } from 'react-router-dom';

export function CallToAction() {
  return (
    <section className="cta" id="cta">
      <div className="sq-field" data-count="14" aria-hidden="true" />
      <div className="cta-img">
        <img id="ctaImg" src="/images/campus-autumn-artwork.webp" alt="Illustrated Dibrugarh University campus in autumn" />
      </div>
      <div id="petals" aria-hidden="true" />
      <div className="cta-card" id="ctaCard">
        <h2 className="h2 split">
          Every campus issue deserves
          <br />
          a verified resolution.
        </h2>
        <p style={{ fontSize: "14px", color: "#0e3018", lineHeight: "1.55" }} className="reveal">
          Direct reporting to campus authorities. Your ticket is tracked openly from submission until the resolution is verified.
        </p>
        <div className="cta-btns">
          <Link className="btn reveal" to="/report/new" style={{ fontSize: "14px", height: "44px", padding: "0 26px" }}>
            File a Report Now
          </Link>
          <Link className="btn-outline reveal" to="/report/new?view=mine#report-tracker">
            Track Complaint
          </Link>
        </div>
        <p className="reveal" style={{ marginTop: "18px", fontSize: "11.5px", color: "#2a3820" }}>
          Emergency? Call Security:{" "}
          <a href="tel:+913732370239" style={{ color: "var(--olive)", fontWeight: "700" }}>
            +91 (373) 237-0239
          </a>
        </p>
      </div>
    </section>
  );
}
