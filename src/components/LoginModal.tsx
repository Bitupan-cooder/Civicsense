import React, { useState } from 'react';
import {
  PRESET_OFFICIALS,
  loginOfficial,
} from '@/lib/governanceStore';
import { OfficialUser, OfficialRole } from '@/types/governance';
import { Lock, ShieldCheck, ArrowRight, X, Building2, UserCheck, ShieldAlert, KeyRound } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: OfficialUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [selectedRole, setSelectedRole] = useState<OfficialRole>('dept_head');
  const [selectedOfficialId, setSelectedOfficialId] = useState<string>(PRESET_OFFICIALS[0].id);
  const [password, setPassword] = useState<string>('civic2026');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentOfficial = PRESET_OFFICIALS.find((u) => u.id === selectedOfficialId) || PRESET_OFFICIALS[0];

  const handleQuickSelect = (official: OfficialUser) => {
    setSelectedOfficialId(official.id);
    setSelectedRole(official.role);
    setPassword('civic2026');
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your authorized password.');
      return;
    }

    const user = loginOfficial(currentOfficial.email, password);
    if (user) {
      onLoginSuccess(user);
      onClose();
    } else {
      setError('Invalid credentials or unauthorized role access.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0036FF]/20 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-[#FFFFFF] border-2 border-[#1EA854] shadow-2xl overflow-hidden text-[#1EA854]">
        {/* Top Header Strip */}
        <div className="bg-[#1EA854] text-[#FFFFFF] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-[#B5F800]" />
            <div>
              <h2 id="login-modal-title" className="font-anton text-xl tracking-wide uppercase">
                OFFICIALS LOGIN
              </h2>
              <p className="font-archivo text-[11px] uppercase tracking-wider text-[#B5F800]">
                [ CIVICSENSE · OFFICIALS ACCESS PORTAL ]
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#FFFFFF] hover:text-[#B5F800] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {/* Subtitle instructions */}
          <div className="bg-[#FAF2EB] border border-[#1EA854]/20 p-3.5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#0036FF] shrink-0 mt-0.5" />
            <div className="text-xs font-serif italic text-[#1EA854]">
              Password-protected portal for Department Heads, Student Union, and Administrators. <span className="font-sans font-bold text-[#0036FF]">Role Check</span> dynamically routes authenticated personnel to their dedicated workspace mode.
            </div>
          </div>

          {/* Quick Preset Selector for the 3 Modes (As per Diagram) */}
          <div>
            <label className="block font-archivo font-black text-xs uppercase tracking-wider text-[#0036FF] mb-2.5">
              [ SELECT DEMO ROLE PRESET · 1-CLICK ACCESS ]
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {/* Mode 1: Department Head */}
              <button
                type="button"
                onClick={() => handleQuickSelect(PRESET_OFFICIALS[0])}
                className={`text-left p-3 border transition-all cursor-pointer ${
                  selectedOfficialId === PRESET_OFFICIALS[0].id
                    ? 'border-[#0036FF] bg-[#0036FF] text-[#FFFFFF] shadow-sm'
                    : 'border-[#1EA854]/25 bg-[#FFFFFF] hover:border-[#1EA854] text-[#1EA854]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 ${
                    selectedOfficialId === PRESET_OFFICIALS[0].id ? 'bg-[#B5F800] text-[#0036FF]' : 'bg-[#FAF2EB] text-[#1EA854]'
                  }`}>
                    MODE 1
                  </span>
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="font-anton text-sm uppercase">Department Head</div>
                <div className={`text-[11px] font-serif italic line-clamp-1 ${
                  selectedOfficialId === PRESET_OFFICIALS[0].id ? 'text-[#B5F800]' : 'text-[#1EA854]/80'
                }`}>
                  Estates & Sanitation
                </div>
              </button>

              {/* Mode 2: President / GS */}
              <button
                type="button"
                onClick={() => handleQuickSelect(PRESET_OFFICIALS[3])}
                className={`text-left p-3 border transition-all cursor-pointer ${
                  selectedOfficialId === PRESET_OFFICIALS[3].id
                    ? 'border-[#0036FF] bg-[#0036FF] text-[#FFFFFF] shadow-sm'
                    : 'border-[#1EA854]/25 bg-[#FFFFFF] hover:border-[#1EA854] text-[#1EA854]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 ${
                    selectedOfficialId === PRESET_OFFICIALS[3].id ? 'bg-[#B5F800] text-[#0036FF]' : 'bg-[#FAF2EB] text-[#1EA854]'
                  }`}>
                    MODE 2
                  </span>
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="font-anton text-sm uppercase">President / GS</div>
                <div className={`text-[11px] font-serif italic line-clamp-1 ${
                  selectedOfficialId === PRESET_OFFICIALS[3].id ? 'text-[#B5F800]' : 'text-[#1EA854]/80'
                }`}>
                  Student Union Executive
                </div>
              </button>

              {/* Mode 3: Admin Panel */}
              <button
                type="button"
                onClick={() => handleQuickSelect(PRESET_OFFICIALS[4])}
                className={`text-left p-3 border transition-all cursor-pointer ${
                  selectedOfficialId === PRESET_OFFICIALS[4].id
                    ? 'border-[#0036FF] bg-[#0036FF] text-[#FFFFFF] shadow-sm'
                    : 'border-[#1EA854]/25 bg-[#FFFFFF] hover:border-[#1EA854] text-[#1EA854]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 ${
                    selectedOfficialId === PRESET_OFFICIALS[4].id ? 'bg-[#B5F800] text-[#0036FF]' : 'bg-[#FAF2EB] text-[#1EA854]'
                  }`}>
                    MODE 3
                  </span>
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="font-anton text-sm uppercase">Admin Panel</div>
                <div className={`text-[11px] font-serif italic line-clamp-1 ${
                  selectedOfficialId === PRESET_OFFICIALS[4].id ? 'text-[#B5F800]' : 'text-[#1EA854]/80'
                }`}>
                  University Ombudsman
                </div>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-archivo text-xs font-bold uppercase tracking-wider text-[#1EA854] mb-1">
                Authorized Officer Identity / Email
              </label>
              <input
                type="text"
                value={currentOfficial.email}
                readOnly
                className="w-full bg-[#FAF2EB] border border-[#1EA854]/30 px-3.5 py-2.5 font-mono text-xs text-[#0036FF] font-bold focus:outline-none"
              />
              <p className="text-[11px] font-serif italic text-[#1EA854]/80 mt-1">
                {currentOfficial.name} · {currentOfficial.roleTitle}
              </p>
            </div>

            <div>
              <label className="block font-archivo text-xs font-bold uppercase tracking-wider text-[#1EA854] mb-1">
                Security Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter authorized password..."
                  className="w-full bg-[#FFFFFF] border-2 border-[#1EA854] px-3.5 py-2.5 font-mono text-sm text-[#1EA854] focus:outline-none focus:border-[#0036FF]"
                />
                <KeyRound className="w-4 h-4 text-[#1EA854]/50 absolute right-3 top-3.5" />
              </div>
              <p className="text-[10px] font-mono text-[#0036FF] mt-1">
                Demo Passcode: <span className="font-bold underline">civic2026</span> (Auto-filled)
              </p>
            </div>

            {error && (
              <div className="bg-[#B5F800]/20 border border-[#B5F800] p-2.5 text-xs text-[#0036FF] font-bold font-mono">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[#1EA854]/30 text-xs font-mono font-bold uppercase text-[#1EA854] hover:bg-[#FAF2EB] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#0036FF] text-[#B5F800] font-archivo font-black text-xs uppercase tracking-wider hover:bg-[#1EA854] hover:text-[#FFFFFF] transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Authenticate & Open Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

