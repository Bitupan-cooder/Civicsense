// Markup converted 1:1 from the original admin.html (React migration, step 1).
import { loadOfficialComplaints, logoutAdmin, openDocket, useConsole } from '../console';
import { NotificationBell } from '../../NotificationBell';

const MODE_TEXT = { administration: 'Central Administration', social_service: 'Social Party (DUSU Council)' } as Record<string, string>;

export function AdminHeader() {
  const { profile } = useConsole();
  return (
    <div className="top-header-wrap">
      {" "}
      <header className="nav-pill-bar">
        {" "}
        <a href="index.html" className="brand">
          {" "}
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path d="M11 2C11 2 4 6 4 13a7 7 0 0014 0C18 6 11 2 11 2z" fill="currentColor" opacity=".9" />
            <line x1="11" y1="14" x2="11" y2="20" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {" "}CivicSense{" "}
          <span className="brand-sub">
            Official Portal
          </span>
          {" "}
        </a>
        {" "}
        <div className="nav-center-status">
          {" "}
          <span className="pill" id="headerModePill">
            {" "}
            <span className="pill-dot" />
            {" "}
            <span id="headerModeText">
              {profile ? MODE_TEXT[profile.role] ?? 'Department Head Console' : 'Official Console'}
            </span>
            {" "}
          </span>
          {" "}
          <NotificationBell userId={profile?.id} lang="en" onOpen={(id) => openDocket(id)} onLive={() => loadOfficialComplaints()} />          <div className="user-badge" id="headerUserBadge">
            {" "}
            <span id="headerAvatar">
              {profile ? profile.name.slice(0, 2).toUpperCase() : 'DU'}
            </span>
            {" "}
            <span id="headerUserName">
              {profile ? profile.name : 'Authorized Official'}
            </span>
            {" "}
          </div>
          {" "}
        </div>
        {" "}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {" "}
          <a href="index.html" className="btn btn-blue" style={{ height: "32px", fontSize: "12px", padding: "0 14px", textDecoration: "none" }}>
            ← Student Portal
          </a>
          {" "}
          <button className="btn-outline btn-red" onClick={() => logoutAdmin()} style={{ height: "32px", fontSize: "12px", padding: "0 10px" }}>
            Logout
          </button>
          {" "}
        </div>
        {" "}
      </header>
      {" "}
    </div>
  );
}
