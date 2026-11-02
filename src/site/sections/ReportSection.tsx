// Report section layout. The form, sign-in gate and success card are React components (../components/ReportForm.tsx);
// the campus map canvas below is drawn by ../campusMap.js.
import { ReportAuthGate, ReportForm, ReportSuccessCard } from '../components/ReportForm';
import { campusMapFitCampus, campusMapZoom } from '../campusMap.js';
import { showToast } from '../../toast';

export function ReportSection() {
  return (
    <section className="report-section" id="report">
      {" "}
      <div className="sq-field" data-count="16" aria-hidden="true" />
      {" "}
      <div className="report-inner">
        {" "}
        <h2 className="h2 split reveal">
          Report a Campus Issue.
          <br />
          <em style={{ color: "var(--olive)", fontStyle: "italic" }}>
            Campus Redressal &amp; Grievance Tracking.
          </em>
        </h2>
        {" "}
        <p style={{ fontSize: "14px", color: "#2a3a1e", margin: "-10px 0 20px", lineHeight: "1.5" }} className="reveal">
          {" "}Submit your grievance directly to authorized university departments or central administration. Registered complaints are permanently tracked with milestone status updates.{" "}
        </p>
        {" "}
        {/* SUCCESS STATE (hidden by default) */}
        {" "}
        <ReportSuccessCard />
        {" "}
        {/* SIMPLE CLEAN CAMPUS MAP */}
        {" "}
        <div className="campus-map-clean-section reveal" id="campusMapCard">
          {" "}
          <h3 className="campus-map-simple-heading">
            Campus map
          </h3>
          {" "}
          <div className="campus-map-container" id="campusMap">
            {" "}
            <canvas id="campusMapCanvas" className="campus-canvas-map" role="img" aria-label="Campus map of Dibrugarh University. Drag to pan, scroll or pinch to zoom. Tap to pin." tabIndex={0} />
            {" "}
            <div className="map-clean-controls" aria-label="Map zoom controls">
              {" "}
              <button type="button" className="map-clean-btn" onClick={() => campusMapZoom(1.5)} title="Zoom in" aria-label="Zoom in">
                +
              </button>
              {" "}
              <button type="button" className="map-clean-btn" onClick={() => campusMapZoom(1/1.5)} title="Zoom out" aria-label="Zoom out">
                −
              </button>
              {" "}
              <button type="button" className="map-clean-btn" onClick={() => campusMapFitCampus(false)} title="Center Campus" aria-label="Center Campus">
                Center
              </button>
              {" "}
            </div>
            {" "}
            <button type="button" className="map-info-pill" title="Dibrugarh University Vector Map" aria-label="Map information" onClick={() => showToast('Dibrugarh University Vector Map: Drag to explore, scroll or pinch to zoom, tap to pin location.', 'info')}>
              ⓘ
            </button>
            {" "}
            <div id="mapComplaintPopover" className="map-popover" style={{ display: "none" }} />
            {" "}
          </div>
          {" "}
        </div>
        {" "}
        {/* STUDENT AUTH GATE (SHOWN WHEN NOT SIGNED IN) */}
        {" "}
        <ReportAuthGate />
        {" "}
        {/* FORM (SHOWN ONLY WHEN AUTHENTICATED) */}
        {" "}
        <ReportForm />
        {" "}
      </div>
      {" "}
    </section>
  );
}
