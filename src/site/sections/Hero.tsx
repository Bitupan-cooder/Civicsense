// Markup converted 1:1 from the original index.html (React migration, step 1).
import char1RecyclingImg from '../../../Flat Assets/civic/char-1-recycling.webp';
import char2PlantingImg from '../../../Flat Assets/civic/char-2-planting.webp';
import char3MegaphoneImg from '../../../Flat Assets/civic/char-3-megaphone.webp';
import char4AuditorImg from '../../../Flat Assets/civic/char-4-auditor.webp';
import char5DispatchImg from '../../../Flat Assets/civic/char-5-dispatch.webp';
import { SiteNav } from '../components/SiteNav';

export function Hero() {
  return (
    <section className="hero" id="hero">
      {" "}
      <SiteNav />
      {" "}
      {/* Massive backdrop typography layered behind characters and clouds */}
      {" "}
      <div className="hero-backdrop-title" aria-hidden="true">
        Report <span>Fearlessly</span>
      </div>
      {" "}
      <div className="cloud cloud-l" data-par="-60">
        {" "}
        <img className="drift-a" src="/images/cloud-a.webp" alt="" />
        {" "}
      </div>
      {" "}
      <div className="cloud cloud-r" data-par="-90">
        {" "}
        <img className="drift-b" src="/images/cloud-b.webp" alt="" />
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
