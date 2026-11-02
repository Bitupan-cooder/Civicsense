// Markup converted 1:1 from the original admin.html (React migration, step 1).
import {
  countByFilter, exportAuditCsv, loadActivityLogs, openCreateOfficial, setLogFilter, setQueueFilter, switchAdminSection, useConsole,
  type Section, type StatusFilter,
} from '../console';
import { AuditRows, Banner, KpiCards, OfficialRows, TicketsStack, UnitBreakdown } from './Queue';

const FILTERS: [StatusFilter, string, string][] = [
  ['all', 'All (', 'cAll'], ['needs_review', 'Needs Review (', 'cReview'], ['submitted', 'Submitted (', 'cSubmitted'], ['accepted', 'Accepted (', 'cAccepted'],
  ['in_progress', 'In Progress (', 'cIp'], ['resolved', 'Resolved (', 'cResolved'], ['rejected', 'Rejected (', 'cRejected'],
];

export function AdminMain() {
  const c = useConsole();
  const isAdmin = c.profile?.role === 'administration';
  const show = (section: Section) => ({ display: c.section === section ? 'block' : 'none' });
  const subTab = (section: Section) => (c.section === section ? 'btn' : 'btn-outline');
  return (
    <main className="admin-main">
      {" "}
      {/* OFFICIAL JURISDICTION BANNER */}
      {" "}
      <section className="jurisdiction-box" id="jurisdictionBox" style={c.profile ? { ['--kpi-col' as string]: c.profile.role === 'department' ? 'var(--olive)' : 'var(--blue)' } : undefined}>
        {" "}
        <div>
          {" "}
          <div className="pill" id="bannerModePill" style={{ marginBottom: "8px" }}>
            <Banner part="pill" />
          </div>
          {" "}
          <h2 className="jurisdiction-title" id="bannerDeptHeading">
            <Banner part="heading" />
          </h2>
          {" "}
          <div className="jurisdiction-desc" id="bannerSubtitle">
            {" "}
            <span>
              Official in Charge:{" "}
              <strong id="bannerName">
                <Banner part="name" />
              </strong>
            </span>
            {" "}
            <span>
              ·
            </span>
            {" "}
            <span id="bannerRole">
              <Banner part="role" />
            </span>
            {" "}
          </div>
          {" "}
        </div>
        {" "}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {" "}
          <div style={{ background: "var(--pill)", padding: "6px 16px", borderRadius: "999px", fontSize: "12px", fontWeight: "700", color: "#0e3018" }}>
            {" "}SLA Window:{" "}
            <span id="bannerSla">
              <Banner part="sla" />
            </span>
            {" "}
          </div>
          {" "}
          <button className="btn btn-outline" onClick={() => exportAuditCsv()}>
            Export Audit CSV
          </button>
          {" "}
        </div>
        {" "}
      </section>
      {" "}
      {/* ADMINISTRATION SUB-NAVIGATION ROW (ACTIVE IN ADMIN MODE) */}
      {" "}
      <div id="adminSubNavRow" style={{ display: isAdmin ? "block" : "none", marginBottom: "20px" }}>
        {" "}
        <div style={{ display: "flex", gap: "8px", background: "rgba(255,255,255,0.85)", padding: "6px", borderRadius: "14px", border: "1.5px solid var(--line)", flexWrap: "wrap" }}>
          {" "}
          <button type="button" className={subTab('complaints')} id="adminSubTabComplaints" onClick={() => switchAdminSection('complaints')} style={{ height: "34px", fontSize: "12.5px", padding: "0 18px" }}>
            {" "}Complaints &amp; Triage Docket{" "}
          </button>
          {" "}
          <button type="button" className={subTab('officials')} id="adminSubTabOfficials" onClick={() => switchAdminSection('officials')} style={{ height: "34px", fontSize: "12.5px", padding: "0 18px" }}>
            {" "}Manage Department &amp; Council Accounts{" "}
          </button>
          {" "}
          <button type="button" className={subTab('audit')} id="adminSubTabAudit" onClick={() => switchAdminSection('audit')} style={{ height: "34px", fontSize: "12.5px", padding: "0 18px" }}>
            {" "}University Activity Audit Log{" "}
          </button>
          {" "}
        </div>
        {" "}
      </div>
      {" "}
      {/* ══════════ SECTION 1: COMPLAINTS & TRIAGE DOCKET ══════════ */}
      {" "}
      <div id="sectionComplaints" style={show('complaints')}>
        {" "}
        {/* ADMINISTRATION UNIT BREAKDOWN CARD (VISIBLE IN ADMIN MODE) */}
        {" "}
        <section id="adminUnitBreakdownCard" style={{ display: isAdmin ? "block" : "none", background: "#ffffff", border: "1.5px solid var(--line)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: "20px", boxShadow: "0 4px 14px rgba(0,0,0,0.02)" }}>
          {" "}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
            {" "}
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--ink)", letterSpacing: "-0.02em" }}>
              Departmental Caseload &amp; Jurisdiction Distribution
            </h3>
            {" "}
            <span style={{ fontSize: "12px", color: "#4a6142", fontWeight: "600" }} id="unitBreakdownTotalText">
              <UnitBreakdown part="total" />
            </span>
            {" "}
          </div>
          {" "}
          <div id="unitBreakdownGrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
            <UnitBreakdown part="grid" />
          </div>
          {" "}
        </section>
        {" "}
        {/* KPI METRICS ROW */}
        {" "}
        <section className="kpi-row" id="kpiRow">
          <KpiCards />
        </section>
        {" "}
        {/* FILTER & SEARCH BAR */}
        {" "}
        <div className="toolbar-bar">
          {" "}
          <div className="filter-pills-group" id="filterGroup">
          {FILTERS.filter(([key]) => key !== 'needs_review' || c.filter === key || countByFilter(c.complaints, key) > 0).map(([key, label, id]) => (
            <button key={key} type="button" className={c.filter === key ? 'filter-pill-btn active' : 'filter-pill-btn'} onClick={() => setQueueFilter({ filter: key })}>
              {label}
              <span id={id}>
                {countByFilter(c.complaints, key)}
              </span>
              )
            </button>
          ))}
        </div>
          {" "}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {" "}
            <select id="categoryFilter" className="filter-select-pill" value={c.category} onChange={(e) => setQueueFilter({ category: e.target.value })}>
              <option value="all">
                All Categories
              </option>
              <option value={"Hostel Facilities"}>
                Hostel
              </option>
              <option value={"Electrical & Lighting"}>
                Electricity
              </option>
              <option value={"Water & Plumbing"}>
                Water
              </option>
              <option value={"Sanitation & Waste"}>
                Sanitation
              </option>
              <option value={"Network & IT"}>
                Internet &amp; IT
              </option>
              <option value="Library">
                Library
              </option>
              <option value={"Campus Security"}>
                Safety &amp; Security
              </option>
              <option value={"Academic Labs"}>
                Academic
              </option>
              <option value={"Other"}>
                General
              </option>
            </select>
            {" "}
            <select id="dateFilter" className="filter-select-pill" value={c.date} onChange={(e) => setQueueFilter({ date: e.target.value })}>
              <option value="all">
                All Dates
              </option>
              <option value="today">
                Today
              </option>
              <option value="week">
                Past 7 Days
              </option>
              <option value="month">
                Past 30 Days
              </option>
            </select>
            {" "}
            <div className="search-input-wrap">
              {" "}
              <svg className="search-svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              {" "}
              <input type="text" id="adminSearchInput" className="search-input-pill" placeholder="Search by Ticket ID, student, title..." value={c.search} onChange={(e) => setQueueFilter({ search: e.target.value })} />
              {" "}
            </div>
            {" "}
          </div>
          {" "}
        </div>
        {" "}
        {/* TICKETS DOCKET LIST */}
        {" "}
        <section className="tickets-stack" id="ticketsStack">
          <TicketsStack />
        </section>
        {" "}
      </div>
      {/* /#sectionComplaints */}
      {" "}
      {/* ══════════ SECTION 2: OFFICIAL ACCOUNT MANAGEMENT ══════════ */}
      {" "}
      <div id="sectionOfficials" style={show('officials')}>
        {" "}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
          {" "}
          <div>
            {" "}
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "var(--ink)", letterSpacing: "-0.03em" }}>
              Department &amp; Council Accounts
            </h2>
            {" "}
            <p style={{ fontSize: "12.5px", color: "#4a6142", marginTop: "2px" }}>
              Provision official accounts, toggle access, and manage department jurisdiction credentials.
            </p>
            {" "}
          </div>
          {" "}
          <button type="button" className="btn" onClick={() => openCreateOfficial()} style={{ height: "38px", padding: "0 18px", fontSize: "13px" }}>
            {" "}Provision New Official Profile{" "}
          </button>
          {" "}
        </div>
        {" "}
        <div className="admin-table-wrap">
          {" "}
          <table className="admin-table" id="officialsTable">
            <thead>
              <tr>
                <th>
                  Official Name
                </th>
                <th>
                  Role
                </th>
                <th>
                  Assigned Unit
                </th>
                <th>
                  Official Email
                </th>
                <th>
                  Account Status
                </th>
                <th>
                  Password State
                </th>
                <th style={{ textAlign: "right" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody id="officialsTableBody">
              <OfficialRows />
            </tbody>
          </table>
          {" "}
        </div>
        {" "}
      </div>
      {/* /#sectionOfficials */}
      {" "}
      {/* ══════════ SECTION 3: UNIVERSITY ACTIVITY AUDIT LOG ══════════ */}
      {" "}
      <div id="sectionAuditLog" style={show('audit')}>
        {" "}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
          {" "}
          <div>
            {" "}
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "var(--ink)", letterSpacing: "-0.03em" }}>
              University Activity Audit Trail
            </h2>
            {" "}
            <p style={{ fontSize: "12.5px", color: "#4a6142", marginTop: "2px" }}>
              Immutable record of all grievance verifications, reassignments, status changes, and administrative actions.
            </p>
            {" "}
          </div>
          {" "}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {" "}
            <select id="auditActionFilter" className="filter-select-pill" value={c.logFilter} onChange={(e) => setLogFilter(e.target.value)}>
              <option value="all">
                All Action Types
              </option>
              <option value="complaint_status_update">
                Status Updates
              </option>
              <option value="id_card_review">
                ID Card Reviews
              </option>
              <option value="complaint_reassigned">
                Unit Reassignments
              </option>
              <option value="official_account_created">
                Account Provisioning
              </option>
              <option value="official_password_reset">
                Password Resets
              </option>
              <option value="account_deactivated">
                Deactivations
              </option>
            </select>
            {" "}
            <button type="button" className="btn-outline" onClick={() => loadActivityLogs()} style={{ height: "36px", fontSize: "12.5px", padding: "0 14px" }}>
              {" "}Refresh Audit Log{" "}
            </button>
            {" "}
          </div>
          {" "}
        </div>
        {" "}
        <div className="admin-table-wrap">
          {" "}
          <table className="admin-table" id="auditTable">
            <thead>
              <tr>
                <th style={{ width: "160px" }}>
                  Timestamp
                </th>
                <th style={{ width: "200px" }}>
                  Actor / Official
                </th>
                <th style={{ width: "170px" }}>
                  Action
                </th>
                <th>
                  Target &amp; Details
                </th>
              </tr>
            </thead>
            <tbody id="auditTableBody">
              <AuditRows />
            </tbody>
          </table>
          {" "}
        </div>
        {" "}
      </div>
      {/* /#sectionAuditLog */}
      {" "}
    </main>
  );
}
