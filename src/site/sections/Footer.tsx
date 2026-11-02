// Markup converted 1:1 from the original index.html (React migration, step 1).
import { FooterStudentLink } from '../components/StudentAuthWidgets';
import { openTracker } from '../tracker';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer id="footer">
      {" "}
      <div className="f-logo-wrap">
        {" "}
        <svg className="f-logo" viewBox="0 0 80 80" overflow="visible" aria-label="CivicSense">
          <circle id="fRing" cx="40" cy="40" r="37" fill="none" stroke="#0e3018" strokeWidth="2.4" strokeDasharray="233" strokeDashoffset="233" transform="rotate(-90 40 40)" />
          <circle className="fdot" cx="22" cy="40" r="4.5" fill="#0e3018" />
          <circle className="fdot" cx="40" cy="40" r="4.5" fill="#0e3018" />
          <circle className="fdot" cx="58" cy="40" r="4.5" fill="#0e3018" />
          <path id="fMark" d="M31 52 40 30 56 52" fill="none" stroke="#0e3018" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" strokeDashoffset="60" />
        </svg>
        {" "}CivicSense{" "}
      </div>
      {" "}
      <nav className="f-links" aria-label="Footer navigation">
        {" "}
        <Link to="/#hero">
          Home
        </Link>
        {" "}
        <Link to="/#how">
          Workflow
        </Link>
        {" "}
        <Link to="/#categories">
          Categories
        </Link>
        {" "}
        <Link to="/report">
          Report
        </Link>
        {" "}
        <a href="#" onClick={(e) => { openTracker(); e.preventDefault(); }}>
          Track
        </a>
        {" "}
        <FooterStudentLink />
        {" "}
      </nav>
      {" "}
      <div className="f-right">
        {" "}
        <span>
          Dibrugarh University, Rajabheta, Assam
        </span>
        {" "}
        <a href="mailto:network-helpdesk@dibru.ac.in" style={{ color: "var(--olive)", fontWeight: "600" }}>
          network-helpdesk@dibru.ac.in
        </a>
        {" "}
        <span>
          Emergency:{" "}
          <a href="tel:+913732370239" style={{ color: "var(--olive)", fontWeight: "600" }}>
            +91 373 237-0239
          </a>
        </span>
        {" "}
      </div>
      {" "}
      <p className="f-copy">
        CivicSense · Game of Codes | ANAZORI v16.0 · PS-04 · Dibrugarh University · © 2026 · All rights reserved.
      </p>
      {" "}
    </footer>
  );
}
