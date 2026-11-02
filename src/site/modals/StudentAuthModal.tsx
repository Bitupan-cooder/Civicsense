// Markup converted 1:1 from the original index.html (React migration, step 1).
import { useRef, useState } from 'react';
import { closeStudentAuth, submitStudentLogin, submitStudentSignup, switchStudentAuthTab, useStudentSession } from '../studentSession';

export function StudentAuthModal() {
  const s = useStudentSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const idCard = useRef<HTMLInputElement>(null);
  const signin = s.authTab === 'signin';
  return (
    <div className={s.authOpen ? "modal-overlay" : "modal-overlay hidden"} id="studentAuthModal" role="dialog" aria-modal="true" aria-labelledby="studentAuthTitle">
      {" "}
      <div className="modal" style={{ maxWidth: "480px" }}>
        {" "}
        <div className="modal-header">
          {" "}
          <div className="modal-title" id="studentAuthTitle">
            {" "}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {" "}Student Portal Access{" "}
          </div>
          {" "}
          <button className="modal-close" onClick={() => closeStudentAuth()} aria-label="Close">
            ×
          </button>
          {" "}
        </div>
        {" "}
        <div className="modal-body" style={{ padding: "20px 22px" }}>
          {" "}
          {/* Tabs: Sign In / Register */}
          {" "}
          <div style={{ display: "flex", gap: "6px", background: "#f2f8ec", padding: "4px", borderRadius: "10px", marginBottom: "16px" }}>
            {" "}
            <button type="button" id="tabStudentSignIn" onClick={() => switchStudentAuthTab('signin')} style={{ flex: "1", height: "34px", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "700", cursor: "pointer", ...(signin ? { background: '#ffffff', color: 'var(--ink)' } : { background: 'transparent', color: '#4a6142' }), boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
              Sign In
            </button>
            {" "}
            <button type="button" id="tabStudentSignUp" onClick={() => switchStudentAuthTab('signup')} style={{ flex: "1", height: "34px", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "600", cursor: "pointer", ...(!signin ? { background: '#ffffff', color: 'var(--ink)' } : { background: 'transparent', color: '#4a6142' }) }}>
              Register with ID
            </button>
            {" "}
          </div>
          {" "}
          {/* Sign In View */}
          {" "}
          <div id="studentSignInView" style={{ display: signin ? "block" : "none" }}>
            {" "}
            <p style={{ fontSize: "12.5px", color: "#4a6142", lineHeight: "1.5", marginBottom: "14px" }}>
              {" "}Sign in to view your submitted complaints, live verification milestones, and progress updates.{" "}
            </p>
            {" "}
            <div className="form-group" style={{ marginBottom: "12px" }}>
              {" "}
              <label className="form-label" htmlFor="studentEmailInput">
                Student Email
              </label>
              {" "}
              <input className="track-input" id="studentEmailInput" type="email" placeholder="e.g. student@dibru.ac.in" style={{ width: "100%", height: "40px", borderRadius: "8px", padding: "0 12px", fontSize: "13px", boxSizing: "border-box" }} value={email} onChange={(e) => setEmail(e.target.value)} />
              {" "}
            </div>
            {" "}
            <div className="form-group" style={{ marginBottom: "14px" }}>
              {" "}
              <label className="form-label" htmlFor="studentPwInput">
                Password
              </label>
              {" "}
              <input className="track-input" id="studentPwInput" type="password" placeholder="Enter password" style={{ width: "100%", height: "40px", borderRadius: "8px", padding: "0 12px", fontSize: "13px", boxSizing: "border-box" }} value={password} onChange={(e) => setPassword(e.target.value)} />
              {" "}
            </div>
            {" "}
            <div id="studentAuthErr" style={{ display: s.loginError ? "block" : "none", color: "#b91c1c", fontSize: "12px", fontWeight: "600", marginBottom: "12px", lineHeight: "1.4" }}>
              {s.loginError}
            </div>
            {" "}
            <button className="btn" id="studentLoginBtn" disabled={s.loginBusy} onClick={() => submitStudentLogin(email, password)} style={{ width: "100%", height: "42px", fontSize: "13px", fontWeight: "700", borderRadius: "8px" }}>
              {s.loginBusy ? 'Signing in...' : <>{" "}Sign In as Student{" "}</>}
            </button>
            {" "}
          </div>
          {" "}
          {/* Register / Signup View */}
          {" "}
          <div id="studentSignUpView" style={{ display: signin ? "none" : "block" }}>
            {" "}
            <p style={{ fontSize: "12px", color: "#4a6142", lineHeight: "1.45", marginBottom: "14px" }}>
              {" "}Create a student account. Your student ID card is securely stored as authenticated (non-public) and verified by authorized officials.{" "}
            </p>
            {" "}
            <div className="form-group" style={{ marginBottom: "10px" }}>
              {" "}
              <label className="form-label" htmlFor="signupName">
                Full Name
              </label>
              {" "}
              <input className="track-input" id="signupName" type="text" placeholder="As printed on your student ID" style={{ width: "100%", height: "38px", borderRadius: "8px", padding: "0 12px", fontSize: "13px", boxSizing: "border-box" }} value={name} onChange={(e) => setName(e.target.value)} />
              {" "}
            </div>
            {" "}
            <div className="form-group" style={{ marginBottom: "10px" }}>
              {" "}
              <label className="form-label" htmlFor="signupEmail">
                Student Email
              </label>
              {" "}
              <input className="track-input" id="signupEmail" type="email" placeholder="e.g. rollnumber@dibru.ac.in" style={{ width: "100%", height: "38px", borderRadius: "8px", padding: "0 12px", fontSize: "13px", boxSizing: "border-box" }} value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} />
              {" "}
            </div>
            {" "}
            <div className="form-group" style={{ marginBottom: "10px" }}>
              {" "}
              <label className="form-label" htmlFor="signupPassword">
                Password
              </label>
              {" "}
              <input className="track-input" id="signupPassword" type="password" placeholder="Minimum 8 characters" style={{ width: "100%", height: "38px", borderRadius: "8px", padding: "0 12px", fontSize: "13px", boxSizing: "border-box" }} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} />
              {" "}
            </div>
            {" "}
            <div className="form-group" style={{ marginBottom: "12px" }}>
              {" "}
              <label className="form-label" htmlFor="signupIdCard">
                Student ID Card (Image or PDF, max 5 MB)
              </label>
              {" "}
              <input ref={idCard} className="track-input" id="signupIdCard" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ width: "100%", height: "38px", borderRadius: "8px", padding: "6px 10px", fontSize: "12px", boxSizing: "border-box", background: "#ffffff" }} />
              {" "}
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                Upload front of university student ID card or admission receipt (max 5 MB).
              </div>
              {" "}
            </div>
            {" "}
            <div id="signupErr" style={{ display: s.signupError ? "block" : "none", color: "#b91c1c", fontSize: "12px", fontWeight: "600", marginBottom: "12px", lineHeight: "1.4" }}>
              {s.signupError}
            </div>
            {" "}
            <button className="btn" id="studentRegisterBtn" disabled={s.signupBusy} onClick={() => submitStudentSignup({ name, email: signupEmail, password: signupPassword, file: idCard.current?.files?.[0] ?? null })} style={{ width: "100%", height: "42px", fontSize: "13px", fontWeight: "700", borderRadius: "8px" }}>
              {s.signupBusy ? 'Uploading ID card & creating account...' : <>{" "}Upload ID &amp; Create Student Account{" "}</>}
            </button>
            {" "}
          </div>
          {" "}
        </div>
        {" "}
      </div>
      {" "}
    </div>
  );
}
