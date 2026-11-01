import React, { useState, useEffect } from 'react';
import {
  OfficialAccount,
  ComplaintRecord,
  RoutingRule,
  TIMELINE_STAGE_LABELS,
  authenticateOfficial,
  filterComplaintsForOfficial,
  approveIncomingComplaint,
  toggleTimelineChecklistStep,
  updateComplaintCase,
  mergeDuplicateComplaints,
  computePortalStatistics,
  loadPortalComplaints,
  savePortalComplaints,
  loadRoutingRules,
  saveRoutingRules,
  loadOfficialAccounts,
  saveOfficialAccounts,
} from '@/lib/portalStore';
import { copyToClipboard } from '@/lib/handoff';
import {
  ShieldCheck,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  GitMerge,
  Plus,
  Copy,
  Check,
  ArrowLeft,
  Square,
  CheckSquare,
  Clock,
  MapPin,
} from 'lucide-react';

interface OfficialPortalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfficialPortal: React.FC<OfficialPortalProps> = ({ isOpen, onClose }) => {
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [accounts, setAccounts] = useState<OfficialAccount[]>([]);

  const [loginId, setLoginId] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeAccount, setActiveAccount] = useState<OfficialAccount | null>(null);

  const [replyDrafts, setReplyDrafts] = useState<{ [complaintId: string]: string }>({});
  const [portalNotice, setPortalNotice] = useState<string | null>(null);

  const [queueFilter, setQueueFilter] = useState<'all' | 'incoming' | 'solving' | 'completed'>('all');
  const [adminTab, setAdminTab] = useState<'cases' | 'users_rules' | 'reports'>('cases');
  const [mergeSourceId, setMergeSourceId] = useState<string>('CMP-2604');
  const [mergeTargetId, setMergeTargetId] = useState<string>('CMP-2601');

  const [newOfficerId, setNewOfficerId] = useState<string>('');
  const [newOfficerName, setNewOfficerName] = useState<string>('');
  const [newOfficerEmail, setNewOfficerEmail] = useState<string>('');
  const [newOfficerMode] = useState<'dept_head' | 'president_gs' | 'admin'>('dept_head');
  const [newOfficerCategory] = useState<string>('water');

  const [ruleKeywordInput, setRuleKeywordInput] = useState<{ [catId: string]: string }>({});
  const [reportCopied, setReportCopied] = useState<boolean>(false);

  const syncAll = () => {
    setComplaints(loadPortalComplaints());
    setRules(loadRoutingRules());
    setAccounts(loadOfficialAccounts());
  };

  useEffect(() => {
    syncAll();
    const onUpdate = () => syncAll();
    window.addEventListener('civicsense_portal_updated', onUpdate);
    return () => window.removeEventListener('civicsense_portal_updated', onUpdate);
  }, []);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = authenticateOfficial(loginId, loginPassword, accounts);
    if (!res.ok) {
      setLoginError(res.error);
      return;
    }
    setLoginError(null);
    setActiveAccount(res.account);
    setPortalNotice(`Signed in as ${res.account.name} (${res.account.modeLabel})`);
  };

  const handleSampleQuickLogin = (acc: OfficialAccount) => {
    setLoginId(acc.id);
    setLoginPassword(acc.password);
    setLoginError(null);
    setActiveAccount(acc);
    setPortalNotice(`Signed in as ${acc.id} — ${acc.name} (${acc.modeLabel})`);
  };

  const handleLogout = () => {
    setActiveAccount(null);
    setPortalNotice(null);
    setLoginId('');
    setLoginPassword('');
  };

  const handleApproveComplaint = (complaintId: string) => {
    if (!activeAccount) return;
    const draft = (replyDrafts[complaintId] || '').trim();
    const updated = approveIncomingComplaint(
      complaints,
      complaintId,
      { name: activeAccount.name, roleLabel: activeAccount.modeLabel },
      draft || undefined
    );
    savePortalComplaints(updated);
    setComplaints(updated);
    setReplyDrafts({ ...replyDrafts, [complaintId]: '' });
    setPortalNotice(
      `Approved ${complaintId}: Marked "Problem Seen" & "Solving" on timeline.`
    );
  };

  const handleToggleChecklistStage = (complaintId: string, stepIndex: number) => {
    if (!activeAccount) return;
    const draft = (replyDrafts[complaintId] || '').trim();
    const updated = toggleTimelineChecklistStep(
      complaints,
      complaintId,
      stepIndex,
      { name: activeAccount.name, roleLabel: activeAccount.modeLabel },
      draft || undefined
    );
    savePortalComplaints(updated);
    setComplaints(updated);
    if (draft) {
      setReplyDrafts({ ...replyDrafts, [complaintId]: '' });
    }
    const stageName = TIMELINE_STAGE_LABELS[stepIndex];
    setPortalNotice(`Updated timeline checklist "${stageName}" for ${complaintId}.`);
  };

  const handleCaseAction = (
    complaintId: string,
    nextStatus: ComplaintRecord['status'],
    defaultNote: string
  ) => {
    if (!activeAccount) return;
    const draft = (replyDrafts[complaintId] || '').trim();
    const noteToUse = draft || defaultNote;

    const updated = updateComplaintCase(
      complaints,
      complaintId,
      nextStatus,
      { name: activeAccount.name, roleLabel: activeAccount.modeLabel },
      noteToUse,
      nextStatus === 'escalated' ? noteToUse : undefined
    );
    savePortalComplaints(updated);
    setComplaints(updated);
    setReplyDrafts({ ...replyDrafts, [complaintId]: '' });
    setPortalNotice(`Updated ${complaintId} status to ${nextStatus.replace('_', ' ').toUpperCase()}.`);
  };

  const handleMergeDuplicates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount || activeAccount.mode !== 'admin') return;
    if (mergeSourceId === mergeTargetId) {
      setPortalNotice('Select two different Complaint IDs to merge.');
      return;
    }
    const updated = mergeDuplicateComplaints(
      complaints,
      mergeSourceId,
      mergeTargetId,
      activeAccount.name
    );
    savePortalComplaints(updated);
    setComplaints(updated);
    setPortalNotice(`Merged ${mergeSourceId} into ${mergeTargetId}.`);
  };

  const handleAddOfficialAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfficerId.trim() || !newOfficerName.trim()) return;
    const cleanId = newOfficerId.trim().toUpperCase();
    const modeLabel =
      newOfficerMode === 'dept_head'
        ? 'Mode 1: Department Head'
        : newOfficerMode === 'president_gs'
        ? 'Mode 2: President / GS'
        : 'Mode 3: Admin Panel';
    const matchedRule = rules.find((r) => r.categoryId === newOfficerCategory) || rules[0];

    const newAcc: OfficialAccount = {
      id: cleanId,
      email: newOfficerEmail.trim() || `${cleanId.toLowerCase()}@campus.edu`,
      password: 'campus123',
      name: newOfficerName.trim(),
      postTitle:
        newOfficerMode === 'dept_head'
          ? `Department Head — ${matchedRule.categoryName}`
          : newOfficerMode === 'president_gs'
          ? 'President / General Secretary'
          : 'System Administrator',
      mode: newOfficerMode,
      modeLabel,
      categoryScope: newOfficerMode === 'dept_head' ? newOfficerCategory : undefined,
      officeId: newOfficerMode === 'dept_head' ? matchedRule.officeId : undefined,
    };

    const nextAccounts = [...accounts.filter((a) => a.id !== cleanId), newAcc];
    saveOfficialAccounts(nextAccounts);
    setAccounts(nextAccounts);
    setNewOfficerId('');
    setNewOfficerName('');
    setNewOfficerEmail('');
    setPortalNotice(`Added officer ${cleanId} (${newAcc.modeLabel}).`);
  };

  const handleAddRuleKeyword = (categoryId: string) => {
    const kw = (ruleKeywordInput[categoryId] || '').trim().toLowerCase();
    if (!kw) return;
    const nextRules = rules.map((r) => {
      if (r.categoryId !== categoryId) return r;
      if (r.keywords.includes(kw)) return r;
      return { ...r, keywords: [...r.keywords, kw] };
    });
    saveRoutingRules(nextRules);
    setRules(nextRules);
    setRuleKeywordInput({ ...ruleKeywordInput, [categoryId]: '' });
    setPortalNotice(`Added keyword "${kw}" to ${categoryId.toUpperCase()}.`);
  };

  const handleCopySummaryReport = async () => {
    const stats = computePortalStatistics(complaints, rules);
    const lines = [
      `CIVICSENSE SUMMARY REPORT`,
      `Total: ${stats.total} | Pending: ${stats.pending} | In Progress: ${stats.inProgress} | Escalated: ${stats.escalated} | Completed: ${stats.resolved + stats.closed}`,
      ...complaints.map(
        (c) => `${c.id} (${c.status.toUpperCase()}) - ${c.categoryName}: ${c.summary}`
      ),
    ];
    const ok = await copyToClipboard(lines.join('\n'));
    if (ok) {
      setReportCopied(true);
      setPortalNotice('Summary report copied to clipboard.');
      setTimeout(() => setReportCopied(false), 3000);
    }
  };

  const stats = computePortalStatistics(complaints, rules);
  const visibleComplaints = activeAccount
    ? filterComplaintsForOfficial(complaints, activeAccount)
    : [];

  const filteredQueue = visibleComplaints.filter((c) => {
    if (queueFilter === 'incoming') return !c.approved || c.status === 'routed' || c.status === 'submitted';
    if (queueFilter === 'solving') return c.approved && c.status !== 'resolved' && c.status !== 'closed';
    if (queueFilter === 'completed') return c.status === 'resolved' || c.status === 'closed';
    return true;
  });

  const deptHeadAccounts = accounts.filter((a) => a.mode === 'dept_head');
  const presidentAccounts = accounts.filter((a) => a.mode === 'president_gs');
  const adminAccounts = accounts.filter((a) => a.mode === 'admin');

  return (
    <div
      id="official-portal"
      className="min-h-screen w-full bg-[#FAF2EB] text-[#134E2C] flex flex-col"
    >
      {/* Dedicated Top Header Bar for Separate Official Portal Page in Blue + Green */}
      <header className="sticky top-0 z-40 bg-[#FAF2EB] border-b border-[#0036FF]/20 px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="bg-[#FFFFFF] text-[#0036FF] hover:bg-[#0036FF] hover:text-[#B5F800] border border-[#0036FF]/35 px-3.5 py-2 font-archivo font-bold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#1EA854]" />
            <span>Back to Public Website</span>
          </button>

          <div className="flex items-center gap-2.5">
            <svg
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className="shrink-0 border border-[#0036FF]"
            >
              <rect width="20" height="20" fill="#B5F800" />
              <polygon points="0,0 13,0 7,20 0,20" fill="#0036FF" />
            </svg>
            <span className="font-anton text-xl sm:text-2xl text-[#134E2C]">
              {activeAccount
                ? `${activeAccount.modeLabel} — Official Portal`
                : 'CivicSense Official Login Page'}
            </span>
          </div>
        </div>

        {activeAccount && (
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block font-archivo text-xs font-bold text-[#0036FF] bg-[#FFFFFF] px-3 py-1.5 border border-[#0036FF]/25">
              {activeAccount.name} ({activeAccount.id})
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="bg-[#0036FF] text-[#B5F800] hover:bg-[#1EA854] hover:text-[#FFFFFF] px-4 py-2 font-archivo font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-[#B5F800]" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Official Workspace Content */}
      <div className="flex-1 w-full max-w-[1320px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Status Toast Notice */}
        {portalNotice && (
          <div className="mb-6 p-3.5 bg-[#0036FF] text-[#FFFFFF] border border-[#1EA854] flex items-center justify-between gap-2 font-archivo text-xs font-semibold">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#B5F800] shrink-0" />
              <span>{portalNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setPortalNotice(null)}
              className="underline text-xs text-[#B5F800] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* IF NOT LOGGED IN: Separate Official Login Page */}
        {!activeAccount ? (
          <div className="max-w-lg mx-auto space-y-6 py-4">
            <form
              onSubmit={handleLoginSubmit}
              className="bg-[#FFFFFF] border-2 border-[#0036FF] p-6 sm:p-8 space-y-5 shadow-xs"
            >
              <div>
                <span className="imp-badge mb-2">OFFICIALS ONLY</span>
                <h2 className="font-anton text-3xl text-[#134E2C]">
                  Officer Sign In
                </h2>
                <p className="font-archivo text-xs sm:text-sm text-[#1EA854] font-medium mt-1">
                  Sign in to view incoming user complaints, approve issues, and check off the 4-stage resolution timeline.
                </p>
              </div>

              <div>
                <label
                  htmlFor="official-login-id"
                  className="block font-archivo font-bold text-xs text-[#134E2C] mb-1.5"
                >
                  Official ID or Email
                </label>
                <input
                  id="official-login-id"
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="e.g. DEPT-WATER, PRES-GS-01, ADMIN-01"
                  className="w-full bg-[#FAF2EB] border border-[#0036FF]/35 px-4 py-3 font-archivo text-sm font-semibold text-[#0036FF]"
                />
              </div>

              <div>
                <label
                  htmlFor="official-login-password"
                  className="block font-archivo font-bold text-xs text-[#134E2C] mb-1.5"
                >
                  Password
                </label>
                <input
                  id="official-login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Sample password: campus123"
                  className="w-full bg-[#FAF2EB] border border-[#0036FF]/35 px-4 py-3 font-archivo text-sm font-semibold text-[#134E2C]"
                />
              </div>

              {loginError && (
                <p className="font-archivo text-xs font-bold text-[#0036FF]" role="alert">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                className="w-full bg-[#0036FF] text-[#B5F800] hover:bg-[#1EA854] hover:text-[#FFFFFF] py-3.5 px-6 font-archivo font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#B5F800]" />
                <span>Sign In to Official Page</span>
              </button>
            </form>

            {/* Sample ID Quick Login Box */}
            <div className="bg-[#FFFFFF] border border-[#1EA854]/35 p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="imp-badge">SAMPLE OFFICER IDS</span>
                <span className="font-archivo text-xs font-semibold text-[#1EA854]">
                  Click to Sign In · Password: campus123
                </span>
              </div>

              <div>
                <span className="block font-archivo text-xs font-bold text-[#134E2C] mb-1.5">
                  Mode 1: Department Heads (Own Category Complaints)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {deptHeadAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleSampleQuickLogin(acc)}
                      className="px-3 py-1.5 font-archivo text-xs font-bold uppercase bg-[#FAF2EB] text-[#0036FF] border border-[#0036FF]/30 hover:bg-[#0036FF] hover:text-[#B5F800] cursor-pointer"
                    >
                      {acc.id}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="block font-archivo text-xs font-bold text-[#134E2C] mb-1.5">
                    Mode 2: President / GS (All Complaints)
                  </span>
                  {presidentAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleSampleQuickLogin(acc)}
                      className="w-full px-3 py-2 font-archivo text-xs font-bold uppercase bg-[#FAF2EB] text-[#0036FF] border border-[#0036FF]/30 hover:bg-[#0036FF] hover:text-[#B5F800] cursor-pointer text-left"
                    >
                      {acc.id} ({acc.name})
                    </button>
                  ))}
                </div>

                <div>
                  <span className="block font-archivo text-xs font-bold text-[#134E2C] mb-1.5">
                    Mode 3: Admin Panel (Full Control)
                  </span>
                  {adminAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleSampleQuickLogin(acc)}
                      className="w-full px-3 py-2 font-archivo text-xs font-bold uppercase bg-[#FAF2EB] text-[#0036FF] border border-[#0036FF]/30 hover:bg-[#0036FF] hover:text-[#B5F800] cursor-pointer text-left"
                    >
                      {acc.id} ({acc.name})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* SEPARATE FUNCTIONAL OFFICIAL WORKSPACE PAGE */
          <div className="space-y-8">
            {/* Officer Role & Quick Switcher Header */}
            <div className="bg-[#FFFFFF] border-2 border-[#0036FF] p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="imp-badge">{activeAccount.modeLabel}</span>
                  <span className="font-archivo font-bold text-xs px-2.5 py-0.5 bg-[#FAF2EB] text-[#0036FF] border border-[#0036FF]/25">
                    ID: {activeAccount.id}
                  </span>
                </div>
                <h2 className="font-anton text-2xl sm:text-3xl text-[#134E2C]">
                  {activeAccount.name} — {activeAccount.postTitle}
                </h2>
                <p className="font-archivo text-xs sm:text-sm text-[#1EA854] font-medium mt-0.5">
                  Review incoming user complaints, approve & start solving, and check off the 4-stage status timeline (Problem Seen, Solving, Delivered, Completed).
                </p>
              </div>

              {/* Quick Switch Officer Role for Demo Testing */}
              <div className="flex flex-wrap items-center gap-1.5">
                {activeAccount.mode === 'dept_head' &&
                  deptHeadAccounts.map((dAcc) => (
                    <button
                      key={dAcc.id}
                      type="button"
                      onClick={() => handleSampleQuickLogin(dAcc)}
                      className={`px-2.5 py-1.5 font-archivo text-xs font-bold uppercase border cursor-pointer ${
                        activeAccount.id === dAcc.id
                          ? 'bg-[#0036FF] text-[#B5F800] border-[#0036FF]'
                          : 'bg-[#FAF2EB] text-[#134E2C] border-[#1EA854]/30'
                      }`}
                    >
                      {dAcc.categoryScope?.toUpperCase()}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => handleSampleQuickLogin(presidentAccounts[0])}
                  className={`px-2.5 py-1.5 font-archivo text-xs font-bold uppercase border cursor-pointer ${
                    activeAccount.mode === 'president_gs'
                      ? 'bg-[#0036FF] text-[#B5F800] border-[#0036FF]'
                      : 'bg-[#FAF2EB] text-[#134E2C] border-[#1EA854]/30'
                  }`}
                >
                  Mode 2: Pres/GS
                </button>
                <button
                  type="button"
                  onClick={() => handleSampleQuickLogin(adminAccounts[0])}
                  className={`px-2.5 py-1.5 font-archivo text-xs font-bold uppercase border cursor-pointer ${
                    activeAccount.mode === 'admin'
                      ? 'bg-[#0036FF] text-[#B5F800] border-[#0036FF]'
                      : 'bg-[#FAF2EB] text-[#134E2C] border-[#1EA854]/30'
                  }`}
                >
                  Mode 3: Admin
                </button>
              </div>
            </div>

            {/* Summary KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-[#FFFFFF] border border-[#0036FF]/25 p-4 shadow-2xs">
                <div className="font-archivo text-xs font-bold text-[#1EA854]">
                  Assigned Complaints
                </div>
                <div className="font-anton text-3xl text-[#0036FF] mt-1">
                  {visibleComplaints.length}
                </div>
              </div>
              <div className="bg-[#FFFFFF] border border-[#0036FF]/25 p-4 shadow-2xs">
                <div className="font-archivo text-xs font-bold text-[#1EA854]">
                  Incoming (Needs Approval)
                </div>
                <div className="font-anton text-3xl text-[#0036FF] mt-1">
                  {visibleComplaints.filter((c) => !c.approved || c.status === 'routed').length}
                </div>
              </div>
              <div className="bg-[#FFFFFF] border border-[#0036FF]/25 p-4 shadow-2xs">
                <div className="font-archivo text-xs font-bold text-[#1EA854]">
                  Solving / Delivered
                </div>
                <div className="font-anton text-3xl text-[#0036FF] mt-1">
                  {visibleComplaints.filter((c) => c.status === 'in_progress' || c.status === 'escalated').length}
                </div>
              </div>
              <div className="bg-[#FFFFFF] border border-[#1EA854]/40 p-4 shadow-2xs">
                <div className="font-archivo text-xs font-bold text-[#1EA854]">
                  Completed
                </div>
                <div className="font-anton text-3xl text-[#1EA854] mt-1">
                  {visibleComplaints.filter((c) => c.status === 'resolved' || c.status === 'closed').length}
                </div>
              </div>
            </div>

            {/* Mode 3 Admin Sub-Tabs */}
            {activeAccount.mode === 'admin' && (
              <div className="flex flex-wrap gap-2 border-b border-[#1EA854]/25 pb-3">
                <button
                  type="button"
                  onClick={() => setAdminTab('cases')}
                  className={`px-4 py-2 font-archivo font-bold text-xs border cursor-pointer ${
                    adminTab === 'cases'
                      ? 'bg-[#0036FF] text-[#B5F800] border-[#0036FF]'
                      : 'bg-[#FFFFFF] text-[#134E2C] border-[#1EA854]/30'
                  }`}
                >
                  Incoming Complaints & Timeline Checklist
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab('users_rules')}
                  className={`px-4 py-2 font-archivo font-bold text-xs border cursor-pointer ${
                    adminTab === 'users_rules'
                      ? 'bg-[#0036FF] text-[#B5F800] border-[#0036FF]'
                      : 'bg-[#FFFFFF] text-[#134E2C] border-[#1EA854]/30'
                  }`}
                >
                  Officers & Routing Rules
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab('reports')}
                  className={`px-4 py-2 font-archivo font-bold text-xs border cursor-pointer ${
                    adminTab === 'reports'
                      ? 'bg-[#0036FF] text-[#B5F800] border-[#0036FF]'
                      : 'bg-[#FFFFFF] text-[#134E2C] border-[#1EA854]/30'
                  }`}
                >
                  Summary Report
                </button>
              </div>
            )}

            {/* Admin-only tabs for Officers/Rules and Summary Reports */}
            {activeAccount.mode === 'admin' && adminTab === 'users_rules' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#FFFFFF] border border-[#0036FF]/25 p-5 space-y-4">
                  <h3 className="font-anton text-2xl text-[#134E2C]">Add Officer Post</h3>
                  <form onSubmit={handleAddOfficialAccount} className="space-y-3">
                    <input
                      type="text"
                      value={newOfficerId}
                      onChange={(e) => setNewOfficerId(e.target.value)}
                      placeholder="Officer ID (e.g. DEPT-SPORTS)"
                      className="w-full bg-[#FAF2EB] border border-[#0036FF]/30 px-3.5 py-2.5 font-archivo text-xs text-[#134E2C]"
                    />
                    <input
                      type="text"
                      value={newOfficerName}
                      onChange={(e) => setNewOfficerName(e.target.value)}
                      placeholder="Officer Name"
                      className="w-full bg-[#FAF2EB] border border-[#0036FF]/30 px-3.5 py-2.5 font-archivo text-xs text-[#134E2C]"
                    />
                    <button
                      type="submit"
                      className="w-full bg-[#0036FF] text-[#B5F800] py-2.5 font-archivo font-bold text-xs cursor-pointer"
                    >
                      Add Officer (Password: campus123)
                    </button>
                  </form>
                </div>

                <div className="bg-[#FFFFFF] border border-[#0036FF]/25 p-5 space-y-3">
                  <h3 className="font-anton text-2xl text-[#134E2C]">Routing Rules</h3>
                  {rules.map((r) => (
                    <div key={r.categoryId} className="bg-[#FAF2EB] p-3 border border-[#1EA854]/30">
                      <div className="font-archivo font-bold text-xs text-[#0036FF]">
                        {r.categoryName} — {r.owningPost}
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        <input
                          type="text"
                          value={ruleKeywordInput[r.categoryId] || ''}
                          onChange={(e) =>
                            setRuleKeywordInput({
                              ...ruleKeywordInput,
                              [r.categoryId]: e.target.value,
                            })
                          }
                          placeholder="Add routing keyword..."
                          className="flex-1 bg-[#FFFFFF] border border-[#0036FF]/30 px-2.5 py-1.5 font-archivo text-xs text-[#134E2C]"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddRuleKeyword(r.categoryId)}
                          className="bg-[#0036FF] text-[#B5F800] px-3 py-1.5 font-archivo font-bold text-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeAccount.mode === 'admin' && adminTab === 'reports' ? (
              <div className="bg-[#FFFFFF] border border-[#0036FF]/25 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-anton text-2xl text-[#134E2C]">Campus Redressal Summary</h3>
                  <button
                    type="button"
                    onClick={handleCopySummaryReport}
                    className="bg-[#0036FF] text-[#B5F800] px-4 py-2 font-archivo font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {reportCopied ? <Check className="w-4 h-4 text-[#B5F800]" /> : <Copy className="w-4 h-4 text-[#B5F800]" />}
                    <span>{reportCopied ? 'Copied' : 'Copy Report'}</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {stats.byCategory.map((b) => (
                    <div key={b.categoryId} className="bg-[#FAF2EB] p-3 border border-[#1EA854]/30">
                      <div className="font-archivo font-bold text-[#134E2C]">
                        {b.categoryName}
                      </div>
                      <div className="font-archivo font-bold text-[#0036FF] mt-1">
                        {b.resolvedCount} / {b.count} Completed
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* INCOMING COMPLAINTS & OFFICIAL-ONLY 4-STAGE TIMELINE CHECKLIST */
              <div className="space-y-5">
                {/* Admin Duplicate Merge Bar */}
                {activeAccount.mode === 'admin' && (
                  <form
                    onSubmit={handleMergeDuplicates}
                    className="bg-[#FFFFFF] border border-[#0036FF]/25 p-4 flex flex-wrap items-end gap-3"
                  >
                    <div>
                      <label
                        htmlFor="merge-dup-select"
                        className="block font-archivo text-xs font-bold text-[#134E2C] mb-1"
                      >
                        Duplicate ID
                      </label>
                      <select
                        id="merge-dup-select"
                        value={mergeSourceId}
                        onChange={(e) => setMergeSourceId(e.target.value)}
                        className="bg-[#FAF2EB] border border-[#0036FF]/30 px-3 py-1.5 font-archivo text-xs font-bold text-[#0036FF]"
                      >
                        {complaints.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.id} ({c.categoryName})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="merge-primary-select"
                        className="block font-archivo text-xs font-bold text-[#134E2C] mb-1"
                      >
                        Primary ID
                      </label>
                      <select
                        id="merge-primary-select"
                        value={mergeTargetId}
                        onChange={(e) => setMergeTargetId(e.target.value)}
                        className="bg-[#FAF2EB] border border-[#0036FF]/30 px-3 py-1.5 font-archivo text-xs font-bold text-[#0036FF]"
                      >
                        {complaints.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.id} ({c.categoryName})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="bg-[#0036FF] text-[#B5F800] px-4 py-2 font-archivo font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <GitMerge className="w-3.5 h-3.5 text-[#B5F800]" />
                      <span>Merge Duplicate</span>
                    </button>
                  </form>
                )}

                {/* Queue Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1EA854]/25 pb-3">
                  <h3 className="font-anton text-2xl text-[#134E2C]">
                    Incoming User Complaints ({filteredQueue.length})
                  </h3>

                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'all', label: `All (${visibleComplaints.length})` },
                        {
                          id: 'incoming',
                          label: `Incoming / Unapproved (${
                            visibleComplaints.filter((c) => !c.approved || c.status === 'routed').length
                          })`,
                        },
                        {
                          id: 'solving',
                          label: `Solving (${
                            visibleComplaints.filter(
                              (c) => c.approved && c.status !== 'resolved' && c.status !== 'closed'
                            ).length
                          })`,
                        },
                        {
                          id: 'completed',
                          label: `Completed (${
                            visibleComplaints.filter((c) => c.status === 'resolved' || c.status === 'closed')
                              .length
                          })`,
                        },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setQueueFilter(tab.id)}
                        className={`px-3 py-1.5 font-archivo font-bold text-xs border cursor-pointer ${
                          queueFilter === tab.id
                            ? 'bg-[#0036FF] text-[#B5F800] border-[#0036FF]'
                            : 'bg-[#FFFFFF] text-[#134E2C] border-[#1EA854]/30'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Complaint Cards with Official Approval & 4-Stage Timeline Checklist */}
                {filteredQueue.length === 0 ? (
                  <div className="bg-[#FFFFFF] border border-[#1EA854]/30 p-10 text-center font-archivo text-sm text-[#1EA854] font-semibold">
                    No complaints in this filter view.
                  </div>
                ) : (
                  <div className="space-y-5">
                    {filteredQueue.map((c) => {
                      const isCompleted = c.status === 'resolved' || c.status === 'closed';
                      return (
                        <div
                          key={c.id}
                          className="bg-[#FFFFFF] border border-[#0036FF]/25 p-5 sm:p-6 space-y-4 shadow-2xs"
                        >
                          {/* Top Row: ID, Category, Approval Badge, Location */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1EA854]/20">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="imp-badge">{c.id}</span>
                              <span className="font-archivo font-bold text-xs px-2.5 py-0.5 bg-[#FAF2EB] text-[#0036FF] border border-[#0036FF]/25">
                                {c.categoryName}
                              </span>
                              <span
                                className={`font-archivo font-bold text-xs px-2.5 py-0.5 ${
                                  isCompleted
                                    ? 'bg-[#1EA854] text-[#FFFFFF]'
                                    : c.approved
                                    ? 'bg-[#0036FF] text-[#B5F800]'
                                    : 'bg-[#B5F800] text-[#0036FF] border border-[#0036FF]/25'
                                }`}
                              >
                                {isCompleted
                                  ? 'COMPLETED'
                                  : c.approved
                                  ? 'APPROVED & SOLVING'
                                  : 'INCOMING — AWAITING APPROVAL'}
                              </span>
                              <span className="font-archivo text-xs font-semibold text-[#1EA854]">
                                Priority: {c.priority}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 font-archivo text-xs font-semibold text-[#134E2C]">
                              <MapPin className="w-3.5 h-3.5 text-[#0036FF]" />
                              <span>{c.location}</span>
                            </div>
                          </div>

                          {/* Summary & Description */}
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div>
                              <h4 className="font-anton text-xl sm:text-2xl text-[#134E2C]">
                                {c.summary}
                              </h4>
                              <p className="font-archivo text-xs sm:text-sm text-[#134E2C] mt-1">
                                {c.description}
                              </p>
                              {c.reporterName && (
                                <p className="font-archivo text-xs font-semibold text-[#0036FF] mt-1">
                                  Reported by: {c.reporterName}{' '}
                                  {c.reporterContact ? `(${c.reporterContact})` : ''}
                                </p>
                              )}
                            </div>

                            {/* Step 1: Approve Incoming Complaint Button */}
                            {!c.approved && (
                              <button
                                type="button"
                                onClick={() => handleApproveComplaint(c.id)}
                                className="bg-[#0036FF] text-[#B5F800] hover:bg-[#1EA854] hover:text-[#FFFFFF] px-4 py-2.5 font-archivo font-bold text-xs inline-flex items-center gap-2 shrink-0 cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4 text-[#B5F800]" />
                                <span>Approve & Start Solving</span>
                              </button>
                            )}
                          </div>

                          {/* Official-Only Interactive 4-Stage Timeline Checklist */}
                          <div className="bg-[#FAF2EB] border border-[#1EA854]/30 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                              <span className="imp-badge">
                                OFFICIAL TIMELINE CHECKLIST (CLICK TO CHECK / UPDATE USER STATUS)
                              </span>
                              <span className="font-archivo text-xs font-semibold text-[#1EA854]">
                                Only officials can check these stages; users view live status in Tracker
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              {c.routeSteps.map((st, idx) => {
                                const stageLabel = TIMELINE_STAGE_LABELS[idx] || st.step;
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleToggleChecklistStage(c.id, idx)}
                                    className={`text-left p-3.5 border transition-all cursor-pointer flex flex-col justify-between ${
                                      st.completed
                                        ? 'bg-[#FFFFFF] border-2 border-[#1EA854] shadow-2xs'
                                        : 'bg-[#EEF7EE]/60 border-dashed border-[#0036FF]/35 hover:border-[#0036FF]'
                                    }`}
                                  >
                                    <div>
                                      <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <span className="font-archivo font-bold text-xs text-[#0036FF]">
                                          0{idx + 1}. {stageLabel}
                                        </span>
                                        {st.completed ? (
                                          <CheckSquare className="w-4 h-4 text-[#1EA854] shrink-0" />
                                        ) : (
                                          <Square className="w-4 h-4 text-[#0036FF] shrink-0" />
                                        )}
                                      </div>
                                      <p className="font-archivo text-xs text-[#134E2C] leading-snug">
                                        {st.note}
                                      </p>
                                    </div>

                                    <div className="mt-2.5 pt-2 border-t border-[#1EA854]/20 flex items-center justify-between text-[11px] font-archivo font-bold">
                                      <span className={st.completed ? 'text-[#1EA854]' : 'text-[#0036FF]'}>
                                        {st.completed ? 'Checked' : 'Click to Check'}
                                      </span>
                                      <span className="text-[#134E2C] flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-[#1EA854]" />
                                        {st.timestamp}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Official Note / Reply & Quick Status Controls */}
                          <div className="flex flex-col sm:flex-row gap-2 pt-1">
                            <input
                              type="text"
                              value={replyDrafts[c.id] || ''}
                              onChange={(e) =>
                                setReplyDrafts({ ...replyDrafts, [c.id]: e.target.value })
                              }
                              placeholder="Add official note or reply for the user..."
                              className="flex-1 bg-[#FAF2EB] border border-[#0036FF]/30 px-3.5 py-2 font-archivo text-xs text-[#134E2C]"
                            />

                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleCaseAction(
                                    c.id,
                                    'in_progress',
                                    `Official update by ${activeAccount.name} (${activeAccount.modeLabel}).`
                                  )
                                }
                                className="bg-[#FFFFFF] text-[#0036FF] border border-[#0036FF]/35 hover:bg-[#0036FF] hover:text-[#B5F800] px-3 py-2 font-archivo font-bold text-xs cursor-pointer"
                              >
                                Post Reply
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleCaseAction(
                                    c.id,
                                    'resolved',
                                    `Completed and verified by ${activeAccount.name}.`
                                  )
                                }
                                className="bg-[#1EA854] text-[#FFFFFF] hover:bg-[#0036FF] hover:text-[#B5F800] px-3.5 py-2 font-archivo font-bold text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark Completed</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleCaseAction(
                                    c.id,
                                    'escalated',
                                    `Escalated by ${activeAccount.name} for priority review.`
                                  )
                                }
                                className="bg-[#FAF2EB] text-[#0036FF] border border-[#0036FF]/35 hover:bg-[#B5F800] px-3 py-2 font-archivo font-bold text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Escalate</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
