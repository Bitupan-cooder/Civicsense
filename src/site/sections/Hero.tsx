// Markup converted 1:1 from the original index.html (React migration, step 1).
import { StudentNavButton, StudentNotifications } from '../components/StudentAuthWidgets';
import char1RecyclingImg from '../../../Flat Assets/civic/char-1-recycling.png';
import char2PlantingImg from '../../../Flat Assets/civic/char-2-planting.png';
import char3MegaphoneImg from '../../../Flat Assets/civic/char-3-megaphone.png';
import char4AuditorImg from '../../../Flat Assets/civic/char-4-auditor.png';
import char5DispatchImg from '../../../Flat Assets/civic/char-5-dispatch.png';
import { openTracker } from '../tracker';

export function Hero() {
  return (
    <section className="hero" id="hero">
      {" "}
      <nav className="nav" aria-label="Main navigation">
        {" "}
        <a className="brand" href="#hero" aria-label="CivicSense home">
          {" "}
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path d="M11 2C11 2 4 6 4 13a7 7 0 0014 0C18 6 11 2 11 2z" fill="currentColor" opacity=".9" />
            <line x1="11" y1="14" x2="11" y2="20" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {" "}CivicSense{" "}
        </a>
        {" "}
        <div className="nav-links">
          {" "}
          <a href="#stats">
            Stats
          </a>
          {" "}
          <a href="#how">
            Workflow
          </a>
          {" "}
          <a href="#categories">
            Categories
          </a>
          {" "}
          <a href="#report">
            Report
          </a>
          {" "}
        </div>
        {" "}
        <div className="nav-actions">
          {" "}
          <StudentNotifications /><StudentNavButton />
          {" "}
          <button className="btn-outline" id="openTrackerBtn" onClick={() => openTracker()} style={{ height: "32px", fontSize: "12px", padding: "0 14px" }}>
            Track Status
          </button>
          {" "}
        </div>
        {" "}
      </nav>
      {" "}
      {/* Massive backdrop typography layered behind characters and clouds */}
      {" "}
      <div className="hero-backdrop-title" aria-hidden="true">
        Report Fearlessly
      </div>
      {" "}
      <div className="cloud cloud-l" data-par="-60">
        {" "}
        <img className="drift-a" src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261021_093216_44218665-b15e-4566-a2d4-2676ab03609d.png" alt="" />
        {" "}
      </div>
      {" "}
      <div className="cloud cloud-r" data-par="-90">
        {" "}
        <img className="drift-b" src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261021_093215_0f37c0c3-f82c-485b-87dd-5a35b75a8782.png" alt="" />
        {" "}
      </div>
      {" "}
      <h1 id="heroTitle" className="split">
        {" "}Say it. Direct to
        <br />
        <em>
          Campus Redressal.
        </em>
        {" "}
      </h1>
      {" "}
      {/* ════════════ 3D CIVIC CHARACTER STAGE (GSAP) ════════════ */}
      {" "}
      <div className="hero-3d-container" id="hero3dContainer">
        {" "}
        <div className="hero-stage-glow" aria-hidden="true" />
        {" "}
        <div className="hero-stage-ground" aria-hidden="true" />
        {" "}
        <div className="hero-3d-stage" id="hero3dStage">
          {" "}
          {/* 01: Clean Quad & Recycling */}
          {" "}
          <div className="hero-3d-card" id="charCard1" data-cat="waste" aria-label={"Clean Quad & Sanitation"}>
            {" "}
            <div className="char-img-wrap">
              {" "}
              <img className="char-img" src={char1RecyclingImg} alt="Student sorting recycling" />
              {" "}
            </div>
            {" "}
            <div className="char-pedestal" aria-hidden="true">
              {" "}
              <div className="char-pedestal-ring" />
              {" "}
              <div className="char-shadow" />
              {" "}
            </div>
            {" "}
          </div>
          {" "}
          {/* 02: Water & Grounds Care */}
          {" "}
          <div className="hero-3d-card" id="charCard2" data-cat="water" aria-label={"Water & Grounds Care"}>
            {" "}
            <div className="char-img-wrap">
              {" "}
              <img className="char-img" src={char2PlantingImg} alt="Student planting sapling" />
              {" "}
            </div>
            {" "}
            <div className="char-pedestal" aria-hidden="true">
              {" "}
              <div className="char-pedestal-ring" />
              {" "}
              <div className="char-shadow" />
              {" "}
            </div>
            {" "}
          </div>
          {" "}
          {/* 03: Power & Voice */}
          {" "}
          <div className="hero-3d-card" id="charCard3" data-cat="power" aria-label={"Power & Lighting"}>
            {" "}
            <div className="char-img-wrap">
              {" "}
              <img className="char-img" src={char3MegaphoneImg} alt="Student announcing alert with megaphone" />
              {" "}
            </div>
            {" "}
            <div className="char-pedestal" aria-hidden="true">
              {" "}
              <div className="char-pedestal-ring" />
              {" "}
              <div className="char-shadow" />
              {" "}
            </div>
            {" "}
          </div>
          {" "}
          {/* 04: Safety & SLA Audit */}
          {" "}
          <div className="hero-3d-card" id="charCard4" data-cat="safety" aria-label={"Safety & SLA Audit"}>
            {" "}
            <div className="char-img-wrap">
              {" "}
              <img className="char-img" src={char4AuditorImg} alt="Student auditor tracking turnaround" />
              {" "}
            </div>
            {" "}
            <div className="char-pedestal" aria-hidden="true">
              {" "}
              <div className="char-pedestal-ring" />
              {" "}
              <div className="char-shadow" />
              {" "}
            </div>
            {" "}
          </div>
          {" "}
          {/* 05: Hostel & Direct Dispatch */}
          {" "}
          <div className="hero-3d-card" id="charCard5" data-cat="hostel" aria-label="Hostel Dispatch">
            {" "}
            <div className="char-img-wrap">
              {" "}
              <img className="char-img" src={char5DispatchImg} alt="Student dispatching redressal ticket" />
              {" "}
            </div>
            {" "}
            <div className="char-pedestal" aria-hidden="true">
              {" "}
              <div className="char-pedestal-ring" />
              {" "}
              <div className="char-shadow" />
              {" "}
            </div>
            {" "}
          </div>
          {" "}
        </div>
        {" "}
      </div>
      {" "}
      <div className="hero-glass" id="heroGlass" aria-hidden="true" />
      {" "}
    </section>
  );
}
