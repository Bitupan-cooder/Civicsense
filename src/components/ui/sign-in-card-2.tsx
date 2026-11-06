'use client'
import React, { useEffect, useRef, useState } from 'react';
import { Mail, Lock, Eye, EyeClosed, ArrowRight, User, Upload, FileText } from 'lucide-react';
import { submitStudentLogin, submitStudentSignup, switchStudentAuthTab, useStudentSession } from "@/site/studentSession";
import { openTracker } from "@/site/tracker";
import "./sign-in-card.css";

export interface SignInCardProps {
  embedded?: boolean;
  className?: string;
  defaultTab?: 'signin' | 'signup';
  onSuccess?: () => void;
}

export function Component({ embedded = false, className = "", defaultTab = 'signin', onSuccess }: SignInCardProps) {
  const session = useStudentSession();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(defaultTab);

  useEffect(() => {
    if (session?.authTab) {
      setActiveTab(session.authTab);
    }
  }, [session?.authTab]);

  // Sign In fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up fields
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [localError, setLocalError] = useState("");

  const handleSignInSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setLocalError("Please enter both student email and password.");
      return;
    }

    setIsLoading(true);
    try {
      if (typeof submitStudentLogin === 'function') {
        const succeeded = await submitStudentLogin(trimmedEmail, password);
        if (succeeded && onSuccess) onSuccess();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setLocalError((err as Error)?.message || "Sign in failed. Please verify credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError("");

    const trimmedName = signupName.trim();
    const trimmedEmail = signupEmail.trim();

    if (!trimmedName || !trimmedEmail || !signupPassword) {
      setLocalError("Please complete all registration fields.");
      return;
    }
    if (signupPassword.length < 8) {
      setLocalError("Password must be at least 8 characters long.");
      return;
    }
    if (!selectedFile) {
      setLocalError("Please select a student ID card file (image or PDF, max 5 MB).");
      return;
    }

    setIsLoading(true);
    try {
      if (typeof submitStudentSignup === 'function') {
        const succeeded = await submitStudentSignup({
          name: trimmedName,
          email: trimmedEmail,
          password: signupPassword,
          file: selectedFile
        });
        if (succeeded && onSuccess) onSuccess();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setLocalError((err as Error)?.message || "Registration failed. Please check details.");
    } finally {
      setIsLoading(false);
    }
  };

  const displayError = localError || (activeTab === 'signin' ? session?.loginError : session?.signupError) || "";
  const isBusy = isLoading || (activeTab === 'signin' ? session?.loginBusy : session?.signupBusy);

  const cardContent = (
    <div className="sic-card-outer">
      <div className="sic-card-inner">
        {/* Main Clean Solid White Card Surface */}
        <div className="sic-card-surface">
          {/* Header */}
          <div className="sic-header">
            <div className="sic-icon-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>

            <h2 className="sic-title">
              {activeTab === 'signin' ? "Student Sign In Required to Lodge Complaints" : "Student Portal Access"}
            </h2>

            <p className="sic-subtitle">
              {activeTab === 'signin'
                ? "To maintain accountability, protect student privacy, and enable real-time status tracking, you must sign in with your verified Dibrugarh University student account to submit a grievance."
                : "Create a student account. Your student ID card is securely stored as authenticated (non-public) and verified by authorized officials."}
            </p>
          </div>

          {/* Segmented Control / Tabs: Sign In | Register with ID */}
          <div className="sic-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'signin'}
              onClick={() => {
                setActiveTab('signin');
                switchStudentAuthTab('signin');
                setLocalError("");
              }}
              className={`sic-tab ${activeTab === 'signin' ? "is-active" : ""}`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'signup'}
              onClick={() => {
                setActiveTab('signup');
                switchStudentAuthTab('signup');
                setLocalError("");
              }}
              className={`sic-tab ${activeTab === 'signup' ? "is-active" : ""}`}
            >
              Register with ID
            </button>
          </div>

          {displayError && (
            <div className="sic-error-banner" role="alert">
              {displayError}
            </div>
          )}

          {/* TAB 1: SIGN IN VIEW */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignInSubmit} className="sic-form">
              {/* Email field */}
              <div className={`sic-input-group ${focusedInput === "email" ? "is-focused" : ""}`}>
                <Mail className="sic-input-icon" />
                <input
                  type="email"
                  placeholder="Student Email (e.g. student@dibru.ac.in)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                  className="sic-input"
                  autoComplete="email"
                />
              </div>

              {/* Password field */}
              <div className={`sic-input-group ${focusedInput === "password" ? "is-focused" : ""}`}>
                <Lock className="sic-input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Account Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                  className="sic-input has-toggle"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="sic-pw-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <Eye size={17} /> : <EyeClosed size={17} />}
                </button>
              </div>

              {/* Meta row */}
              <div className="sic-meta-row">
                <label className="sic-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sic-checkbox"
                  />
                  <span>Remember account</span>
                </label>

                <button
                  type="button"
                  onClick={() => openTracker()}
                  className="sic-link-btn"
                >
                  Track with Ticket ID
                </button>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isBusy}
                className="sic-btn-primary"
              >
                {isBusy ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span className="sic-spinner" />
                    <span>Signing in...</span>
                  </span>
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span>Sign In with Student ID</span>
                    <ArrowRight size={16} />
                  </span>
                )}
              </button>

              {/* Divider */}
              <div className="sic-divider">
                <div className="sic-divider-line" />
                <span className="sic-divider-text">or check existing grievance</span>
                <div className="sic-divider-line" />
              </div>

              {/* Secondary Action: Track Registered Grievance */}
              <button
                type="button"
                onClick={() => openTracker()}
                className="sic-btn-secondary"
              >
                Track Registered Grievance
              </button>

              {/* Register Prompt */}
              <div className="sic-register-prompt">
                First time lodging a complaint?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signup');
                    switchStudentAuthTab('signup');
                    setLocalError("");
                  }}
                  className="sic-link-btn"
                >
                  Register with Student ID
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: REGISTER WITH ID VIEW */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="sic-form">
              {/* Full Name */}
              <div className={`sic-input-group ${focusedInput === "signupName" ? "is-focused" : ""}`}>
                <User className="sic-input-icon" />
                <input
                  type="text"
                  placeholder="Full Name (as on student ID card)"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  onFocus={() => setFocusedInput("signupName")}
                  onBlur={() => setFocusedInput(null)}
                  className="sic-input"
                  autoComplete="name"
                />
              </div>

              {/* Student Email */}
              <div className={`sic-input-group ${focusedInput === "signupEmail" ? "is-focused" : ""}`}>
                <Mail className="sic-input-icon" />
                <input
                  type="email"
                  placeholder="Student Email (e.g. rollnumber@dibru.ac.in)"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  onFocus={() => setFocusedInput("signupEmail")}
                  onBlur={() => setFocusedInput(null)}
                  className="sic-input"
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className={`sic-input-group ${focusedInput === "signupPassword" ? "is-focused" : ""}`}>
                <Lock className="sic-input-icon" />
                <input
                  type={showSignupPassword ? "text" : "password"}
                  placeholder="Password (minimum 8 characters)"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  onFocus={() => setFocusedInput("signupPassword")}
                  onBlur={() => setFocusedInput(null)}
                  className="sic-input has-toggle"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="sic-pw-toggle"
                  aria-label={showSignupPassword ? "Hide password" : "Show password"}
                >
                  {showSignupPassword ? <Eye size={17} /> : <EyeClosed size={17} />}
                </button>
              </div>

              {/* Student ID Card File Picker */}
              <div className="sic-file-dropzone">
                <label className="sic-file-label">
                  Student ID Card (Image or PDF, max 5 MB)
                </label>
                <div
                  className="sic-file-input-wrap"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="sic-file-real-input"
                  />
                  {selectedFile ? (
                    <>
                      <FileText size={18} color="#1EA854" />
                      <span className="sic-file-text">{selectedFile.name}</span>
                    </>
                  ) : (
                    <>
                      <Upload size={18} color="#65845e" />
                      <span className="sic-file-text" style={{ color: "#728f6c" }}>
                        Choose student ID photo or PDF
                      </span>
                    </>
                  )}
                </div>
                <div className="sic-file-hint">
                  Upload front of university student ID card or admission receipt (max 5 MB).
                </div>
              </div>

              {/* Upload ID & Create Account Button */}
              <button
                type="submit"
                disabled={isBusy}
                className="sic-btn-primary"
              >
                {isBusy ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span className="sic-spinner" />
                    <span>Uploading ID card & creating account...</span>
                  </span>
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span>Upload ID &amp; Create Student Account</span>
                    <ArrowRight size={16} />
                  </span>
                )}
              </button>

              {/* Switch back to sign-in */}
              <div className="sic-register-prompt">
                Already have a verified account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signin');
                    switchStudentAuthTab('signin');
                    setLocalError("");
                  }}
                  className="sic-link-btn"
                >
                  Sign In as Student
                </button>
              </div>
            </form>
          )}

          {/* Footer */}
          <div className="sic-footer">
            <span>Official Dibrugarh University Redressal</span>
            <span>·</span>
            <span>Verified Student Accounts Only</span>
            <span>·</span>
            <span>Zero Spam Policy</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className={`sic-embedded-wrap ${className}`.trim()}>
        {cardContent}
      </div>
    );
  }

  return (
    <div className={`sic-standalone-wrap ${className}`.trim()}>
      {cardContent}
    </div>
  );
}

export const SignInCard2 = Component;
export default Component;
