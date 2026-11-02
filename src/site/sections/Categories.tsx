// Markup converted 1:1 from the original index.html (React migration, step 1).
import { fillReportDescription } from '../reportForm';

export function Categories() {
  return (
    <section className="categories-section" id="categories">
      {" "}
      <div className="sq-field" data-count="14" aria-hidden="true" />
      {" "}
      <div className="categories-inner">
        {" "}
        <h2 className="h2 split">
          AI Autonomous Triage.
          <br />
          Direct to the{" "}
          <em style={{ color: "var(--olive)", fontStyle: "italic" }}>
            Assigned Solver Desk.
          </em>
        </h2>
        {" "}
        <p style={{ fontSize: "14px", color: "#2a3a1e", maxWidth: "680px", margin: "-10px 0 24px", lineHeight: "1.55" }}>
          {" "}No manual category selection required. CivicSense AI reads your complaint in Assamese or English, classifies the root cause across 20 campus domains, and auto-dispatches directly to the responsible authority.{" "}
        </p>
        {" "}
        {/* Solver Desks Grid */}
        {" "}
        <div className="cat-grid" id="catGrid">
          {" "}
          <div className="cat-card" onClick={() => fillReportDescription('Water tap leaking heavily in Hostel washroom')}>
            {" "}
            <div className="cat-icon">
              <svg viewBox="0 0 24 24">
                <path d="M12 2s-6 6.5-6 11a6 6 0 0012 0C18 8.5 12 2 12 2z" />
                <path d="M8 16s1 2 4 2 4-2 4-2" />
              </svg>
            </div>
            {" "}
            <div>
              <div className="cat-name">
                Water &amp; Plumbing (water)
              </div>
              <div className="cat-desc">
                Pipeline bursts, leaking taps, washroom flush, drinking water coolers.
              </div>
            </div>
            {" "}
            <div className="cat-dept">
              → PHE · Facility Operations (Copy DUSU GS)
            </div>
            {" "}
          </div>
          {" "}
          <div className="cat-card" onClick={() => fillReportDescription('Pathway lights dark along library road, tripping breakers')}>
            {" "}
            <div className="cat-icon">
              <svg viewBox="0 0 24 24">
                <path d="M13 2L4.5 13.5H12L11 22l8.5-11.5H12L13 2z" />
              </svg>
            </div>
            {" "}
            <div>
              <div className="cat-name">
                Power &amp; Lighting (electricity)
              </div>
              <div className="cat-desc">
                Pathway lights, dead sockets, ceiling fans, power tripping, circuit hazards.
              </div>
            </div>
            {" "}
            <div className="cat-dept">
              → Electrical Maintenance Desk (Copy DUSU GS)
            </div>
            {" "}
          </div>
          {" "}
          <div className="cat-card" onClick={() => fillReportDescription('Wi-Fi connection dropped in central library reading hall')}>
            {" "}
            <div className="cat-icon">
              <svg viewBox="0 0 24 24">
                <path d="M5 12.5A10 10 0 0119 12.5" />
                <path d="M8 15.5A6 6 0 0116 15.5" />
                <circle cx="12" cy="20" r="1.2" fill="var(--olive)" stroke="none" />
              </svg>
            </div>
            {" "}
            <div>
              <div className="cat-name">
                Campus IT &amp; LAN (internet)
              </div>
              <div className="cat-desc">
                Campus Wi-Fi APs, lab LAN drops, gateway DNS issues, portal login errors.
              </div>
            </div>
            {" "}
            <div className="cat-dept">
              → CCSA · Central IT Services (Copy DUSU GS)
            </div>
            {" "}
          </div>
          {" "}
          <div className="cat-card" onClick={() => fillReportDescription('Campus security concern regarding broken lock on hostel back gate')}>
            {" "}
            <div className="cat-icon">
              <svg viewBox="0 0 24 24">
                <path d="M12 3l8 4.5V12c0 4.5-3.5 8.5-8 9.5C7.5 20.5 4 16.5 4 12V7.5L12 3z" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <circle cx="12" cy="15" r=".8" fill="var(--olive)" stroke="none" />
              </svg>
            </div>
            {" "}
            <div>
              <div className="cat-name">
                Safety &amp; Proctorial (safety)
              </div>
              <div className="cat-desc">
                Campus security, dark spots, unmonitored gates. Sensitive cases go to Proctor strictly.
              </div>
            </div>
            {" "}
            <div className="cat-dept">
              → Proctorial Board Command (Sensitive: Head Only)
            </div>
            {" "}
          </div>
          {" "}
          <div className="cat-card" onClick={() => fillReportDescription('Waste bins overflowing outside Central Canteen patio')}>
            {" "}
            <div className="cat-icon">
              <svg viewBox="0 0 24 24">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            {" "}
            <div>
              <div className="cat-name">
                Clean Campus (sanitation)
              </div>
              <div className="cat-desc">
                Overflowing bins, litter on pathways, garbage clearing, bio-waste sorting.
              </div>
            </div>
            {" "}
            <div className="cat-dept">
              → Sanitation &amp; Grounds Desk (Copy DUSU GS)
            </div>
            {" "}
          </div>
          {" "}
          <div className="cat-card" onClick={() => fillReportDescription('Hostel room window latch broken and water geyser cold')}>
            {" "}
            <div className="cat-icon">
              <svg viewBox="0 0 24 24">
                <path d="M3 21V9l9-6 9 6v12" />
                <rect x="9" y="13" width="6" height="8" />
              </svg>
            </div>
            {" "}
            <div>
              <div className="cat-name">
                Hostels &amp; Housing (hostel)
              </div>
              <div className="cat-desc">
                Dorm rooms, mess catering, geysers, furniture, warden redressal.
              </div>
            </div>
            {" "}
            <div className="cat-dept">
              → Hostels &amp; Housing Board (Copy DUSU GS)
            </div>
            {" "}
          </div>
          {" "}
          <div className="cat-card" onClick={() => fillReportDescription('Classroom projector lamp expired in Science Quad Room 204')}>
            {" "}
            <div className="cat-icon">
              <svg viewBox="0 0 24 24">
                <path d="M9 3v8L5 21h14L15 11V3" />
                <line x1="9" y1="3" x2="15" y2="3" />
              </svg>
            </div>
            {" "}
            <div>
              <div className="cat-name">
                Classrooms &amp; Labs (classroom)
              </div>
              <div className="cat-desc">
                Smart boards, projectors, benches, lab instruments, podium acoustics.
              </div>
            </div>
            {" "}
            <div className="cat-dept">
              → Academic Infrastructure Desk (Copy DUSU GS)
            </div>
            {" "}
          </div>
          {" "}
          <div className="cat-card" style={{ background: "var(--pill)", borderColor: "var(--olive)", justifyContent: "center", alignItems: "center", textAlign: "center", gap: "12px" }}>
            {" "}
            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--olive)" }}>
              20 Campus Domains · Direct AI Routing
              <br />
              Bilingual (অসমীয়া / English)
            </div>
            {" "}
            <button className="btn" onClick={() => document.getElementById('report')?.scrollIntoView({behavior:'smooth'})} style={{ fontSize: "12px", height: "32px", padding: "0 14px" }}>
              Report Issue Directly
            </button>
            {" "}
          </div>
          {" "}
        </div>
        {" "}
      </div>
      {" "}
    </section>
  );
}
