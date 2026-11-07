// Everything that shows who is signed in, rendered from the student session store.
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { openReuploadModal, signOutStudent, useStudentSession } from '../studentSession';
import { loadStudentComplaints } from '../tracker';
import { NotificationBell } from '../../NotificationBell';
import { useLanguage } from '../../i18n';

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

/** Signed-in welcome card (landing page and /welcome): a new student is greeted differently from a returning one.
 *  /welcome also has Log out (to the landing page, like the nav name menu); the landing card has only "Report here". */
export function StudentWelcomeCard() {
  const { profile, justRegistered } = useStudentSession();
  const navigate = useNavigate();
  const onWelcomePage = useLocation().pathname === '/welcome';
  if (!profile) return null;
  return (
    <div className="student-signin-card student-signin-ready">
      <div>
        <h2>{justRegistered ? `Welcome aboard, ${profile.name}.` : `Welcome back, ${profile.name}.`}</h2>
        <p>{justRegistered
          ? 'Your account is created and your student ID is being verified. You can already submit a report.'
          : 'Your student account is ready to submit a report.'}</p>
      </div>
      <div className="student-signin-actions">
        {/* from /welcome: replace it, so Back from the form does not land on a page that is shown only once */}
        <Link className="student-signin-report-button" to="/report/new" replace={onWelcomePage}>
          {onWelcomePage ? 'Report an issue' : 'Report here'} <span aria-hidden="true">→</span>
        </Link>
        {onWelcomePage && <button type="button" className="student-signout-button" onClick={() => { navigate('/'); void signOutStudent(); }}>Log out</button>}
      </div>
    </div>
  );
}

/** Closes a popover on a click outside `box` or on Esc (nav account menu, the report form's routing info). */
export function useDismiss(box: RefObject<HTMLElement | null>, open: boolean, close: () => void): void {
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) close(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]); // close only ever sets open to false, so a stale one is fine
}

/** Nav account button: signed out it goes to sign-in; signed in it opens a small menu (who is signed in, Log out). */
export function StudentNavButton() {
  const { profile } = useStudentSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useDismiss(box, open, () => setOpen(false));
  useEffect(() => setOpen(false), [profile?.id]);

  const button = (
    <button className="btn-outline nav-student-button" type="button"
      aria-haspopup={profile ? 'menu' : undefined} aria-expanded={profile ? open : undefined}
      onClick={() => (profile ? setOpen((o) => !o) : navigate('/login'))}>
      <span key={profile?.id ?? 'signed-out'} className="nav-account-label">
        {profile ? 'Student: ' + profile.name.split(' ')[0] : 'Student Sign In'}
      </span>
    </button>
  );
  if (!profile) return button;
  return (
    <span className="nav-account" ref={box}>
      {button}
      {open && (
        <span className="nav-account-menu" role="menu">
          <span className="nav-account-who"><strong>{profile.name}</strong>{profile.email}</span>
          <button role="menuitem" type="button" onClick={() => { setOpen(false); navigate('/'); void signOutStudent(); }}><LogOut aria-hidden="true" />Log out</button>
        </span>
      )}
    </span>
  );
}

/** Notice text and button above the report form. */
export function ReportAuthNotice() {
  const { profile, idCardStatus } = useStudentSession();
  if (!profile) return null; // the report form only shows for a signed-in student
  return <>Submitting as authenticated student: <strong>{profile.name}</strong> ({profile.email})<IdStatusLabel status={idCardStatus} /></>;
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
      onOpen={(id) => navigate(`/report/new?track=${encodeURIComponent(id)}#report-tracker`)}
      onLive={(n) => {
        loadStudentComplaints();
        // the open ticket on My complaints refreshes itself on this event
        window.dispatchEvent(new CustomEvent('civicsense:notification', { detail: n }));
      }}
    />
  );
}
