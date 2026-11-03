// Everything that shows who is signed in, rendered from the student session store.
import { handleNavStudentClick, openReuploadModal, openStudentAuth, signOutStudent, useStudentSession } from '../studentSession';
import { loadStudentComplaints, openTracker, switchTrackerMode } from '../tracker';
import { NotificationBell } from '../../NotificationBell';
import { useLanguage } from '../../i18n';
import { useNavigate } from 'react-router-dom';

function IdStatusLabel({ status }: { status?: string }) {
  if (status === 'verified') {
    return <>{' · '}<span style={{ color: '#1a7a3a', fontWeight: 700 }}>ID Verified</span></>;
  }
  if (status === 'not_valid') {
    return (
      <>
        {' · '}<span style={{ color: '#991b1b', fontWeight: 700 }}>ID Not Valid</span>{' ('}
        <button
          type="button"
          onClick={() => openReuploadModal()}
          style={{ background: 'none', border: 'none', color: '#b91c1c', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}
        >
          Re-upload
        </button>
        {')'}
      </>
    );
  }
  return <>{' · '}<span style={{ color: '#854d0e', fontWeight: 700 }}>ID Pending Verification</span></>;
}

/** Hero nav button. */
export function StudentNavButton({ standalone = false }: { standalone?: boolean }) {
  const { profile } = useStudentSession();
  const navigate = useNavigate();
  return (
    <button className="btn-outline nav-student-button" id={standalone ? undefined : 'navStudentBtn'} onClick={() => handleNavStudentClick(() => navigate('/login'))}>
      <span key={profile?.id ?? 'signed-out'} className="nav-account-label">
        {profile ? 'Student: ' + profile.name.split(' ')[0] : 'Student Sign In'}
      </span>
    </button>
  );
}

/** Status line and sign-in/out button at the top of the tracker. */
export function TrackerAuthStatus() {
  const { profile, idCardStatus } = useStudentSession();
  return (
    <>
      <span id="studentAuthStatusText" style={{ color: '#4a6142' }}>
        {profile ? (
          <>Signed in as <strong>{profile.name}</strong> ({profile.email})<IdStatusLabel status={idCardStatus} /></>
        ) : 'Not signed in as student'}
      </span>{' '}
      <button
        id="studentAuthToggleBtn"
        onClick={() => (profile ? signOutStudent() : openStudentAuth())}
        style={{ background: 'none', border: 'none', color: 'var(--olive)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
      >
        {profile ? 'Sign Out' : 'Sign In'}
      </button>
    </>
  );
}

/** Notice text and button above the report form. */
export function ReportAuthNotice() {
  const { profile, idCardStatus } = useStudentSession();
  let text;
  if (profile) {
    text = <>Submitting as authenticated student: <strong>{profile.name}</strong> ({profile.email})<IdStatusLabel status={idCardStatus} /></>;
  } else if (profile === null) {
    text = 'Notice: You must be signed in with your student account to register complaints.';
  } else {
    text = 'Not signed in as student.';
  }
  return (
    <>
      <span id="formStudentAuthText">{text}</span>{' '}
      <button
        type="button"
        className="btn"
        id="formStudentAuthBtn"
        onClick={() => {
          if (profile) {
            openTracker();
            switchTrackerMode('my_complaints');
          } else {
            openStudentAuth();
          }
        }}
        style={{ height: '30px', fontSize: '11.5px', padding: '0 12px', background: 'var(--olive)' }}
      >
        {profile ? 'My Complaints' : 'Sign In / Register with ID'}
      </button>
    </>
  );
}

/** Notification bell in the nav (signed-in students, once the PRD features are switched on). */
export function StudentNotifications() {
  const { profile } = useStudentSession();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  return (
    <NotificationBell
      userId={profile?.id}
      lang={lang}
      onOpen={(id) => navigate(`/login?track=${encodeURIComponent(id)}#report-tracker`)}
      onLive={(n) => {
        loadStudentComplaints();
        // route pages (e.g. /complaints/:id) refresh themselves on this event
        window.dispatchEvent(new CustomEvent('civicsense:notification', { detail: n }));
      }}
    />
  );
}

/** Which language complaint summaries and replies are shown in (saved to the profile). */
export function ReadingLanguageSwitch() {
  const { profile } = useStudentSession();
  const { lang, setLanguage } = useLanguage();
  if (!profile?.id || profile.preferred_language === undefined) return null; // not signed in, or migration not run
  const btn = (l: 'en' | 'as', label: string) => (
    <button type="button" lang={l} onClick={() => setLanguage(l)} aria-pressed={lang === l}
      style={{ border: 'none', borderRadius: '6px', padding: '2px 8px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer',
        background: lang === l ? '#ffffff' : 'transparent', color: lang === l ? 'var(--ink)' : '#4a6142' }}>
      {label}
    </button>
  );
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: '#f2f8ec', borderRadius: '8px', padding: '2px', fontSize: '11.5px' }}>
      <span style={{ color: '#4a6142', padding: '0 4px' }}>Read in</span>
      {btn('en', 'English')}{btn('as', 'অসমীয়া')}
    </span>
  );
}
