import React, { useState } from 'react';
import {
  OfficialUser,
  OfficialRole,
  Complaint,
  ComplaintStatus,
} from '@/types/governance';
import {
  getAllComplaints,
  updateComplaintStatus,
  addOfficialReply,
  escalateComplaint,
  mergeComplaints,
  logoutOfficial,
  DEFAULT_ROUTING_RULES,
  PRESET_OFFICIALS,
} from '@/lib/governanceStore';
import {
  ShieldCheck,
  Building2,
  UserCheck,
  ShieldAlert,
  LogOut,
  CheckCircle2,
  Clock,
  AlertTriangle,
  GitMerge,
  Send,
  ArrowRight,
  TrendingUp,
  Download,
  Filter,
  RefreshCw,
  Search,
  ExternalLink,
  Bot,
  Activity,
  FileSpreadsheet,
  MapPin,
} from 'lucide-react';

interface OfficialWorkspaceProps {
  currentUser: OfficialUser;
  onLogout: () => void;
  onSwitchUser: (newUser: OfficialUser) => void;
}

export const OfficialWorkspace: React.FC<OfficialWorkspaceProps> = ({
  currentUser,
  onLogout,
  onSwitchUser,
}) => {
  const [complaints, setComplaints] = useState<Complaint[]>(getAllComplaints());
  const [activeTab, setActiveTab] = useState<string>('default');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState<string>('');
  const [escalationReason, setEscalationReason] = useState<string>('');
  const [showEscalateModal, setShowEscalateModal] = useState<boolean>(false);
  const [mergeSelectedIds, setMergeSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [adminStatusFilter, setAdminStatusFilter] = useState<'all' | 'not_solved' | 'solved'>('all');
  const [notice, setNotice] = useState<string | null>(null);

  const refreshData = () => {
    setComplaints(getAllComplaints());
  };

  const showFeedback = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  // Determine which mode the current user is in
  const role = currentUser.role;

  // -------------------------------------------------------------
  // MODE 1 FILTERING: "Own category complaints only"
  // -------------------------------------------------------------
  const mode1Complaints = complaints.filter((c) => {
    if (!currentUser.departmentId) return true;
    return c.category === currentUser.departmentId || c.aiAnalysis.detectedCategory === currentUser.departmentId;
  });

  // -------------------------------------------------------------
  // MODE 2 FILTERING: "Pending and escalated list" + "Sees all complaints"
  // -------------------------------------------------------------
  const escalatedComplaints = complaints.filter((c) => c.status === 'escalated' || c.escalation?.isEscalated);
  const pendingComplaints = complaints.filter((c) => c.status !== 'resolved' && c.status !== 'closed');

  // Active complaint object for inspection drawer
  const activeComplaint = complaints.find((c) => c.id === selectedComplaintId) || null;

  // Handle Status Update (Mode 1 & Mode 3)
  const handleStatusChange = (newStatus: ComplaintStatus) => {
    if (!activeComplaint) return;
    const note = `Status changed to ${newStatus.replace('_', ' ').toUpperCase()} by ${currentUser.name} (${currentUser.roleTitle}).`;
    updateComplaintStatus(activeComplaint.id, newStatus, currentUser.name, note);
    refreshData();
    showFeedback(`Ticket #${activeComplaint.id} status updated to ${newStatus.replace('_', ' ').toUpperCase()}.`);
  };

  // Handle Official Reply
  const handlePostReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComplaint || !replyInput.trim()) return;
    addOfficialReply(activeComplaint.id, `${currentUser.name} (${currentUser.roleTitle})`, currentUser.roleTitle, replyInput);
    setReplyInput('');
    refreshData();
    showFeedback(`Official reply dispatched to public tracker for #${activeComplaint.id}.`);
  };

  // Handle Escalation (Mode 1 to Mode 2)
  const handleEscalateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComplaint || !escalationReason.trim()) return;
    escalateComplaint(activeComplaint.id, escalationReason.trim(), `${currentUser.name} (${currentUser.roleTitle})`);
    setShowEscalateModal(false);
    setEscalationReason('');
    refreshData();
    showFeedback(`Case #${activeComplaint.id} escalated directly to Mode 2: President / GS.`);
  };

  // Handle Merging Duplicates (Mode 3)
  const handleMergeSubmit = () => {
    if (!activeComplaint || mergeSelectedIds.length === 0) return;
    mergeComplaints(activeComplaint.id, mergeSelectedIds, currentUser.name);
    setMergeSelectedIds([]);
    refreshData();
    showFeedback(`Successfully merged duplicate tickets [${mergeSelectedIds.join(', ')}] into #${activeComplaint.id}.`);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Complaint ID', 'Title', 'Category', 'Location', 'Status', 'Urgency', 'Owning Post', 'Student', 'Lodged Date'];
    const rows = complaints.map((c) => [
      c.id,
      `"${c.title.replace(/"/g, '""')}"`,
      c.categoryName,
      `"${c.location.replace(/"/g, '""')}"`,
      c.status,
      c.urgency,
      `"${c.aiAnalysis.owningPost}"`,
      c.studentName || 'Anonymous',
      new Date(c.timestamp).toISOString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `civicsense_campus_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showFeedback('Campus audit report downloaded as CSV.');
  };

  return (
    <div className="w-full min-h-screen bg-[#FAF2EB] text-[#1EA854] flex flex-col">
      {/* Top Navigation & Role Bar */}
      <header className="sticky top-0 z-40 bg-[#FFFFFF] border-b-2 border-[#1EA854] shadow-xs px-4 md:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Active Mode Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-[#0036FF] inline-block" />
            <span className="font-archivo font-black text-sm tracking-widest text-[#1EA854]">
              CIVICSENSE GOVERNANCE
            </span>
          </div>

          {/* Active Mode Pill as per Architecture Diagram */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#0036FF] text-[#B5F800] border border-[#0036FF] font-mono text-xs font-black uppercase shadow-2xs">
            {role === 'dept_head' && <Building2 className="w-3.5 h-3.5" />}
            {role === 'president_gs' && <UserCheck className="w-3.5 h-3.5" />}
            {role === 'admin' && <ShieldAlert className="w-3.5 h-3.5" />}
            <span>
              {role === 'dept_head' && 'MODE 1 · DEPARTMENT HEAD'}
              {role === 'president_gs' && 'MODE 2 · PRESIDENT / GS'}
              {role === 'admin' && 'MODE 3 · ADMIN PANEL'}
            </span>
          </div>
        </div>

        {/* Officer Switcher & Utilities */}
        <div className="flex items-center gap-3 text-xs font-mono">
          {/* Quick Role Switcher (For demo convenience) */}
          <div className="flex items-center gap-1.5 bg-[#FAF2EB] border border-[#1EA854]/30 px-2 py-1">
            <span className="text-[#1EA854]/70 hidden md:inline">Switch Mode:</span>
            <select
              value={currentUser.id}
              onChange={(e) => {
                const found = PRESET_OFFICIALS.find((u) => u.id === e.target.value);
                if (found) onSwitchUser(found);
              }}
              className="bg-transparent font-bold text-[#0036FF] focus:outline-none cursor-pointer"
            >
              {PRESET_OFFICIALS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.role === 'dept_head' ? 'Mode 1: ' : u.role === 'president_gs' ? 'Mode 2: ' : 'Mode 3: '}
                  {u.name} ({u.roleTitle.split(',')[0]})
                </option>
              ))}
            </select>
          </div>

          {/* Logout & Exit */}
          <button
            onClick={onLogout}
            className="px-3 py-1 bg-[#1EA854] text-[#FFFFFF] font-bold uppercase hover:bg-[#0036FF] hover:text-[#B5F800] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit to Public Home</span>
          </button>
        </div>
      </header>

      {/* Notice Banner */}
      {notice && (
        <div className="bg-[#B5F800] text-[#0036FF] px-6 py-2.5 font-mono text-xs font-bold border-b border-[#0036FF] flex items-center justify-between animate-in fade-in">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="cursor-pointer font-bold">×</button>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto p-4 md:p-8 flex flex-col gap-6">

        {/* -------------------------------------------------------------
            MODE 1: DEPARTMENT HEAD WORKSPACE
            "Own category complaints only · Reply, update status, resolve · Route tracker · Escalate if stuck"
            ------------------------------------------------------------- */}
        {role === 'dept_head' && (
          <div className="space-y-6">
            {/* Mode 1 Header */}
            <div className="bg-[#FFFFFF] border-2 border-[#1EA854] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="font-archivo font-black text-xs text-[#0036FF] uppercase tracking-widest">
                  [ MODE 1 · DEPARTMENTAL ACTION DESK ]
                </span>
                <h1 className="font-anton text-2xl sm:text-3xl uppercase tracking-wide text-[#1EA854] mt-1">
                  {currentUser.departmentName || 'Own Category Redressal Desk'}
                </h1>
                <p className="font-serif italic text-xs sm:text-sm text-[#1EA854]">
                  Officer In-Charge: <span className="font-sans font-bold text-[#0036FF]">{currentUser.name}</span> · Filtered to your department's jurisdiction only.
                </p>
              </div>

              {/* Status Counters */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <div className="bg-[#FAF2EB] border border-[#1EA854]/30 px-3 py-2 text-center">
                  <div className="text-[10px] text-[#1EA854]/70 uppercase">Total Assigned</div>
                  <div className="font-anton text-xl text-[#0036FF]">{mode1Complaints.length}</div>
                </div>
                <div className="bg-[#FAF2EB] border border-[#1EA854]/30 px-3 py-2 text-center">
                  <div className="text-[10px] text-[#1EA854]/70 uppercase">In Progress</div>
                  <div className="font-anton text-xl text-[#1EA854]">
                    {mode1Complaints.filter((c) => c.status === 'in_progress').length}
                  </div>
                </div>
                <div className="bg-[#FAF2EB] border border-[#1EA854]/30 px-3 py-2 text-center">
                  <div className="text-[10px] text-[#1EA854]/70 uppercase">Resolved</div>
                  <div className="font-anton text-xl text-[#1EA854]">
                    {mode1Complaints.filter((c) => c.status === 'resolved').length}
                  </div>
                </div>
              </div>
            </div>

            {/* Complaints List + Action Drawer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Complaint Cards */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between font-archivo font-black text-xs uppercase text-[#0036FF] tracking-wider mb-2">
                  <span>[ YOUR CATEGORY QUEUE ({mode1Complaints.length}) ]</span>
                  <button onClick={refreshData} className="flex items-center gap-1 hover:text-[#1EA854] cursor-pointer">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync</span>
                  </button>
                </div>

                {mode1Complaints.length === 0 ? (
                  <div className="bg-[#FFFFFF] border border-[#1EA854]/20 p-8 text-center text-xs font-serif italic text-[#1EA854]/70">
                    No active complaints currently routed to your department desk.
                  </div>
                ) : (
                  mode1Complaints.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedComplaintId(c.id)}
                      className={`p-4 border-2 transition-all cursor-pointer bg-[#FFFFFF] ${
                        selectedComplaintId === c.id
                          ? 'border-[#0036FF] shadow-md ring-2 ring-[#0036FF]/20'
                          : 'border-[#1EA854]/25 hover:border-[#1EA854] shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-archivo font-black text-xs text-[#0036FF]">#{c.id}</span>
                          <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 border ${
                            c.status === 'resolved'
                              ? 'bg-[#1EA854] text-[#FFFFFF] border-[#1EA854]'
                              : c.status === 'in_progress'
                              ? 'bg-[#B5F800] text-[#0036FF] border-[#0036FF]'
                              : 'bg-[#FAF2EB] text-[#0036FF] border-[#0036FF]'
                          }`}>
                            {c.status === 'resolved' ? 'SOLVED' : c.status === 'in_progress' ? 'IN PROGRESS' : 'CONFIRMED'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-[#0036FF] bg-[#FAF2EB] px-1.5 py-0.5 border border-[#1EA854]/20">
                          PRIORITY: {c.urgency}
                        </span>
                      </div>

                      <h3 className="font-anton text-base uppercase text-[#1EA854] mb-1">
                        {c.title}
                      </h3>
                      <p className="font-serif italic text-xs text-[#1EA854]/80 line-clamp-2 mb-2">
                        "{c.description}"
                      </p>

                      <div className="flex items-center justify-between text-[11px] font-mono text-[#1EA854]/70 pt-2 border-t border-[#1EA854]/15">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#0036FF]" />
                          <span>{c.location}</span>
                        </span>
                        <span>{c.replies.length} Official Replies</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Right Column: Case Action Drawer */}
              <div className="lg:col-span-5">
                {activeComplaint ? (
                  <div className="bg-[#FFFFFF] border-2 border-[#1EA854] p-5 shadow-sm space-y-5 sticky top-20">
                    <div className="flex items-center justify-between border-b border-[#1EA854]/20 pb-3">
                      <div>
                        <span className="font-archivo font-black text-xs text-[#0036FF]">CASE #{activeComplaint.id}</span>
                        <div className="font-anton text-lg text-[#1EA854] uppercase">{activeComplaint.title}</div>
                      </div>
                      <button
                        onClick={() => setSelectedComplaintId(null)}
                        className="text-xs font-mono font-bold text-[#1EA854]/60 hover:text-[#1EA854] cursor-pointer"
                      >
                        Deselect
                      </button>
                    </div>

                    {/* AI Dispatch Recap */}
                    <div className="bg-[#0036FF]/5 border border-[#0036FF]/30 p-3 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[#0036FF] font-archivo text-[11px] uppercase">
                        <Bot className="w-3.5 h-3.5" />
                        <span>AI Dispatch Summary</span>
                      </div>
                      <p className="font-serif italic text-[#1EA854] text-[11px]">{activeComplaint.aiAnalysis.summary}</p>
                      <div className="text-[10px] font-mono text-[#0036FF]">SLA TARGET: {activeComplaint.aiAnalysis.slaHours} HOURS</div>
                    </div>

                    {/* Action 1: Status Authority Checklist */}
                    <div className="bg-[#FAF2EB] border-2 border-[#1EA854] p-4 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="font-archivo font-black text-xs uppercase tracking-wider text-[#0036FF]">
                          STATUS AUTHORITY CHECKLIST
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 border ${
                            activeComplaint.status === 'resolved'
                              ? 'bg-[#1EA854] text-[#FFFFFF] border-[#1EA854]'
                              : 'bg-[#0036FF] text-[#B5F800] border-[#0036FF]'
                          }`}
                        >
                          {activeComplaint.status === 'resolved' ? 'SOLVED' : 'NOT SOLVED'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                        <button
                          onClick={() => handleStatusChange('investigating')}
                          className={`p-2 border font-bold uppercase text-center transition-colors cursor-pointer text-[11px] ${
                            activeComplaint.status === 'investigating'
                              ? 'bg-[#0036FF] text-[#FFFFFF] border-[#0036FF]'
                              : 'bg-[#FFFFFF] text-[#1EA854] border-[#1EA854]/40 hover:bg-[#FAF2EB]'
                          }`}
                          title="Step 1: Confirm Receipt"
                        >
                          1. Confirmed
                        </button>
                        <button
                          onClick={() => handleStatusChange('in_progress')}
                          className={`p-2 border font-bold uppercase text-center transition-colors cursor-pointer text-[11px] ${
                            activeComplaint.status === 'in_progress'
                              ? 'bg-[#B5F800] text-[#0036FF] border-[#0036FF]'
                              : 'bg-[#FFFFFF] text-[#1EA854] border-[#1EA854]/40 hover:bg-[#FAF2EB]'
                          }`}
                          title="Step 2: Work in Progress on Site"
                        >
                          2. In Progress
                        </button>
                        <button
                          onClick={() => handleStatusChange('resolved')}
                          className={`p-2 border font-bold uppercase text-center transition-colors cursor-pointer text-[11px] flex items-center justify-center gap-1 ${
                            activeComplaint.status === 'resolved'
                              ? 'bg-[#1EA854] text-[#FFFFFF] border-[#1EA854]'
                              : 'bg-[#FFFFFF] text-[#1EA854] border-[#1EA854] hover:bg-[#1EA854] hover:text-[#FFFFFF]'
                          }`}
                          title="Step 3: Delivered & Complete"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>3. Complete</span>
                        </button>
                      </div>
                    </div>

                    {/* Action 2: Reply to Student */}
                    <form onSubmit={handlePostReply} className="space-y-2">
                      <label className="block font-archivo font-black text-xs uppercase text-[#0036FF]">
                        [ REPLY TO CITIZEN / DISPATCH UPDATE ]
                      </label>
                      <textarea
                        value={replyInput}
                        onChange={(e) => setReplyInput(e.target.value)}
                        placeholder="Write official response visible on public Complaint Tracker..."
                        rows={3}
                        className="w-full bg-[#FAF2EB] border border-[#1EA854]/40 p-2.5 text-xs font-serif text-[#1EA854] focus:outline-none focus:border-[#0036FF]"
                      />
                      <button
                        type="submit"
                        className="w-full py-2 bg-[#0036FF] text-[#B5F800] font-archivo font-black text-xs uppercase tracking-wider hover:bg-[#1EA854] hover:text-[#FFFFFF] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Post Public Desk Reply</span>
                      </button>
                    </form>

                    {/* Action 3: Escalate If Stuck */}
                    <div className="pt-2 border-t border-[#1EA854]/20">
                      <button
                        type="button"
                        onClick={() => setShowEscalateModal(true)}
                        className="w-full py-2 bg-[#FAF2EB] border border-[#0036FF] text-[#0036FF] font-archivo font-black text-xs uppercase tracking-wider hover:bg-[#0036FF] hover:text-[#B5F800] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Escalate Case to President / GS</span>
                      </button>
                    </div>

                    {/* Route History Preview */}
                    <div className="text-xs font-mono space-y-1.5 pt-2 border-t border-[#1EA854]/20">
                      <div className="font-bold text-[#0036FF] uppercase text-[10px]">CASE ROUTE TRACKER</div>
                      {activeComplaint.routeHistory.slice(-3).map((m) => (
                        <div key={m.id} className="text-[11px] font-serif text-[#1EA854]/80">
                          • <span className="font-bold font-sans">{m.stage}</span>: {m.note}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#FFFFFF] border-2 border-dashed border-[#1EA854]/30 p-8 text-center text-xs font-serif italic text-[#1EA854]/70">
                    Select any case from your queue to inspect its AI routing slip, update resolution status, post citizen replies, or escalate.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            MODE 2: PRESIDENT / GS WORKSPACE
            "Sees all complaints and routes · Replies and follows up · Pending and escalated list · Statistics"
            ------------------------------------------------------------- */}
        {role === 'president_gs' && (
          <div className="space-y-6">
            {/* Mode 2 Header */}
            <div className="bg-[#FFFFFF] border-2 border-[#0036FF] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="font-archivo font-black text-xs text-[#0036FF] uppercase tracking-widest">
                  [ MODE 2 · STUDENT UNION EXECUTIVE GOVERNANCE ]
                </span>
                <h1 className="font-anton text-2xl sm:text-3xl uppercase tracking-wide text-[#1EA854] mt-1">
                  PRESIDENT & GENERAL SECRETARY DESK
                </h1>
                <p className="font-serif italic text-xs sm:text-sm text-[#1EA854]">
                  Executive Officer: <span className="font-sans font-bold text-[#0036FF]">{currentUser.name}</span> · Full campus oversight, escalated bottleneck resolution, and SLA velocity audits.
                </p>
              </div>

              {/* Statistics Pill Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="bg-[#FAF2EB] border border-[#1EA854]/30 p-2 text-center">
                  <div className="text-[10px] text-[#1EA854]/70 uppercase">Total Reports</div>
                  <div className="font-anton text-xl text-[#0036FF]">{complaints.length}</div>
                </div>
                <div className="bg-[#FAF2EB] border border-[#1EA854]/30 p-2 text-center">
                  <div className="text-[10px] text-[#1EA854]/70 uppercase">Escalated / Stuck</div>
                  <div className="font-anton text-xl text-[#0036FF]">{escalatedComplaints.length}</div>
                </div>
                <div className="bg-[#FAF2EB] border border-[#1EA854]/30 p-2 text-center">
                  <div className="text-[10px] text-[#1EA854]/70 uppercase">Pending SLA</div>
                  <div className="font-anton text-xl text-[#1EA854]">{pendingComplaints.length}</div>
                </div>
                <div className="bg-[#B5F800]/40 border border-[#0036FF] p-2 text-center">
                  <div className="text-[10px] text-[#0036FF] font-bold uppercase">SLA Velocity</div>
                  <div className="font-anton text-xl text-[#0036FF]">94.2%</div>
                </div>
              </div>
            </div>

            {/* Mode 2 Tabs */}
            <div className="flex items-center gap-2 border-b-2 border-[#1EA854]/25 pb-2">
              <button
                onClick={() => setActiveTab('escalated')}
                className={`px-4 py-2 font-archivo font-black text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'escalated' || activeTab === 'default'
                    ? 'bg-[#0036FF] text-[#B5F800]'
                    : 'bg-[#FFFFFF] text-[#1EA854] border border-[#1EA854]/30'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Pending & Escalated List ({escalatedComplaints.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 font-archivo font-black text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-[#0036FF] text-[#B5F800]'
                    : 'bg-[#FFFFFF] text-[#1EA854] border border-[#1EA854]/30'
                }`}
              >
                <span>All Campus Routes ({complaints.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-2 font-archivo font-black text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'stats'
                    ? 'bg-[#0036FF] text-[#B5F800]'
                    : 'bg-[#FFFFFF] text-[#1EA854] border border-[#1EA854]/30'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Campus SLA Analytics</span>
              </button>
            </div>

            {/* Mode 2 Tab 1: Pending & Escalated List (Core requirement from Diagram) */}
            {(activeTab === 'escalated' || activeTab === 'default') && (
              <div className="space-y-4">
                <div className="bg-[#FAF2EB] border-l-4 border-[#0036FF] p-3.5 text-xs font-serif italic text-[#1EA854]">
                  These cases have breached standard turnaround time or were explicitly escalated by Department Heads due to budget, procurement, or inter-departmental hurdles.
                </div>

                <div className="space-y-3">
                  {escalatedComplaints.map((c) => (
                    <div
                      key={c.id}
                      className="bg-[#FFFFFF] border-2 border-[#0036FF] p-5 shadow-sm space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0036FF]/20 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-archivo font-black text-base text-[#0036FF]">#{c.id}</span>
                          <span className="bg-[#0036FF] text-[#B5F800] text-xs font-mono font-bold px-2.5 py-0.5 flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            ESCALATED BOTTLENECK
                          </span>
                          <span className="font-mono text-xs text-[#1EA854] bg-[#FAF2EB] px-2 py-0.5 border border-[#1EA854]/20">
                            {c.categoryName}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-[#0036FF] font-bold">
                          OWNING POST: {c.aiAnalysis.owningPost}
                        </span>
                      </div>

                      <h3 className="font-anton text-xl uppercase text-[#1EA854]">{c.title}</h3>
                      <p className="font-serif italic text-xs sm:text-sm text-[#1EA854]">"{c.description}"</p>

                      {c.escalation?.reason && (
                        <div className="bg-[#FAF2EB] border border-[#0036FF]/30 p-3 text-xs">
                          <span className="font-bold text-[#0036FF] font-mono uppercase block text-[10px]">
                            ESCALATION REASON FROM {c.escalation.escalatedBy || 'DEPARTMENT HEAD'}:
                          </span>
                          <span className="font-serif italic text-[#1EA854]">{c.escalation.reason}</span>
                        </div>
                      )}

                      {/* Executive Follow-Up & Reply Box */}
                      <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-[#1EA854]/15">
                        <input
                          type="text"
                          placeholder="Post executive directive or follow-up note..."
                          id={`input-exec-${c.id}`}
                          className="flex-1 bg-[#FAF2EB] border border-[#1EA854]/30 px-3 py-2 text-xs font-serif text-[#1EA854] focus:outline-none focus:border-[#0036FF]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const inputEl = document.getElementById(`input-exec-${c.id}`) as HTMLInputElement;
                            if (inputEl && inputEl.value.trim()) {
                              addOfficialReply(c.id, `${currentUser.name} (President / GS)`, 'Student Union Executive', `EXECUTIVE DIRECTIVE: ${inputEl.value.trim()}`);
                              inputEl.value = '';
                              refreshData();
                              showFeedback(`Executive directive posted to #${c.id}.`);
                            }
                          }}
                          className="px-4 py-2 bg-[#0036FF] text-[#B5F800] font-archivo font-black text-xs uppercase hover:bg-[#1EA854] hover:text-[#FFFFFF] transition-colors cursor-pointer"
                        >
                          Send Directive
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateComplaintStatus(c.id, 'resolved', currentUser.name, 'Executive intervention resolved this bottleneck.');
                            refreshData();
                            showFeedback(`Case #${c.id} marked resolved by President / GS.`);
                          }}
                          className="px-4 py-2 bg-[#1EA854] text-[#FFFFFF] font-archivo font-black text-xs uppercase hover:bg-[#0036FF] hover:text-[#B5F800] transition-colors cursor-pointer"
                        >
                          Resolve Case
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mode 2 Tab 2: All Campus Routes */}
            {activeTab === 'all' && (
              <div className="bg-[#FFFFFF] border-2 border-[#1EA854]/30 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-[#1EA854] text-[#FFFFFF] uppercase tracking-wider text-[11px]">
                      <th className="p-3">ID</th>
                      <th className="p-3">Title & Issue</th>
                      <th className="p-3">Owning Post</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">SLA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1EA854]/15">
                    {complaints.map((c) => (
                      <tr key={c.id} className="hover:bg-[#FAF2EB] transition-colors">
                        <td className="p-3 font-bold text-[#0036FF]">#{c.id}</td>
                        <td className="p-3">
                          <div className="font-bold text-[#1EA854]">{c.title}</div>
                          <div className="font-serif italic text-[#1EA854]/75 text-[11px] line-clamp-1">{c.description}</div>
                        </td>
                        <td className="p-3">{c.aiAnalysis.owningPost}</td>
                        <td className="p-3 font-bold text-[#0036FF]">{c.urgency}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                            c.status === 'resolved' ? 'bg-[#1EA854] text-[#FFFFFF]' :
                            c.status === 'escalated' ? 'bg-[#0036FF] text-[#B5F800]' :
                            'bg-[#FAF2EB] text-[#1EA854] border border-[#1EA854]/30'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3">{c.aiAnalysis.slaHours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Mode 2 Tab 3: Campus Analytics */}
            {activeTab === 'stats' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#FFFFFF] border-2 border-[#1EA854] p-5 space-y-3">
                  <div className="font-anton text-lg uppercase text-[#1EA854]">Category Distribution</div>
                  <div className="space-y-2 text-xs font-mono">
                    {['water', 'power', 'waste', 'safety', 'wifi'].map((cat) => {
                      const count = complaints.filter((c) => c.category === cat).length;
                      const pct = ((count / complaints.length) * 100).toFixed(0);
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-[#1EA854]">
                            <span className="uppercase">{cat}</span>
                            <span>{count} cases ({pct}%)</span>
                          </div>
                          <div className="w-full h-2 bg-[#FAF2EB] overflow-hidden">
                            <div className="h-full bg-[#1EA854]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-[#FFFFFF] border-2 border-[#0036FF] p-5 space-y-3">
                  <div className="font-anton text-lg uppercase text-[#0036FF]">Owning Desk SLA Compliance</div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span>Estates & Sanitation:</span>
                      <span className="font-bold text-[#1EA854]">100% on-time</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Horticulture & Grounds:</span>
                      <span className="font-bold text-[#1EA854]">92% on-time</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Electrical Maintenance:</span>
                      <span className="font-bold text-[#0036FF]">78% (Delayed)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Central IT NOC:</span>
                      <span className="font-bold text-[#1EA854]">96% on-time</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#FFFFFF] border-2 border-[#1EA854] p-5 space-y-3">
                  <div className="font-anton text-lg uppercase text-[#1EA854]">Export Governance Audit</div>
                  <p className="text-xs font-serif italic text-[#1EA854]/80">
                    Download full resolution audit trail including AI timestamps, owning posts, and official milestone signatures.
                  </p>
                  <button
                    onClick={handleExportCSV}
                    className="w-full py-2.5 bg-[#0036FF] text-[#B5F800] font-archivo font-black text-xs uppercase tracking-wider hover:bg-[#1EA854] hover:text-[#FFFFFF] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download CSV Audit Report</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------
            MODE 3: ADMIN PANEL WORKSPACE
            "Full access to all complaints · Users, posts and routing rules · Merge duplicates, close cases · Translations and reports"
            ------------------------------------------------------------- */}
        {role === 'admin' && (
          <div className="space-y-6">
            {/* Mode 3 Header */}
            <div className="bg-[#FFFFFF] border-2 border-[#1EA854] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="font-archivo font-black text-xs text-[#0036FF] uppercase tracking-widest">
                  [ MODE 3 · SUPERADMIN & OMBUDSMAN CONTROL ]
                </span>
                <h1 className="font-anton text-2xl sm:text-3xl uppercase tracking-wide text-[#1EA854] mt-1">
                  CENTRAL REDRESSAL ADMIN PANEL
                </h1>
                <p className="font-serif italic text-xs sm:text-sm text-[#1EA854]">
                  Chief Administrator: <span className="font-sans font-bold text-[#0036FF]">{currentUser.name}</span> · Full access to complaints, duplicate merging, owning posts, routing rules, and translations.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-[#0036FF] text-[#B5F800] font-archivo font-black text-xs uppercase tracking-wider hover:bg-[#1EA854] hover:text-[#FFFFFF] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Report</span>
                </button>
              </div>
            </div>

            {/* Mode 3 Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b-2 border-[#1EA854]/25 pb-2">
              <button
                onClick={() => setActiveTab('master')}
                className={`px-4 py-2 font-archivo font-black text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'master' || activeTab === 'default'
                    ? 'bg-[#1EA854] text-[#FFFFFF]'
                    : 'bg-[#FFFFFF] text-[#1EA854] border border-[#1EA854]/30'
                }`}
              >
                <span>Full Complaints Registry ({complaints.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('merge')}
                className={`px-4 py-2 font-archivo font-black text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'merge'
                    ? 'bg-[#0036FF] text-[#B5F800]'
                    : 'bg-[#FFFFFF] text-[#1EA854] border border-[#1EA854]/30'
                }`}
              >
                <GitMerge className="w-4 h-4" />
                <span>Merge Duplicates Tool</span>
              </button>
              <button
                onClick={() => setActiveTab('rules')}
                className={`px-4 py-2 font-archivo font-black text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'rules'
                    ? 'bg-[#1EA854] text-[#FFFFFF]'
                    : 'bg-[#FFFFFF] text-[#1EA854] border border-[#1EA854]/30'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Posts & Routing Rules</span>
              </button>
            </div>

            {/* Mode 3 Tab 1: Master Registry */}
            {(activeTab === 'master' || activeTab === 'default') && (
              <div className="bg-[#FFFFFF] border-2 border-[#1EA854] shadow-sm p-4 space-y-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  {/* Status Filter Tabs for Admin */}
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <button
                      onClick={() => setAdminStatusFilter('all')}
                      className={`px-3 py-1.5 font-bold uppercase transition-colors cursor-pointer border ${
                        adminStatusFilter === 'all'
                          ? 'bg-[#0036FF] text-[#B5F800] border-[#0036FF]'
                          : 'bg-[#FAF2EB] text-[#1EA854] border-[#1EA854]/30 hover:bg-[#FFFFFF]'
                      }`}
                    >
                      All ({complaints.length})
                    </button>
                    <button
                      onClick={() => setAdminStatusFilter('not_solved')}
                      className={`px-3 py-1.5 font-bold uppercase transition-colors cursor-pointer border ${
                        adminStatusFilter === 'not_solved'
                          ? 'bg-[#0036FF] text-[#B5F800] border-[#0036FF]'
                          : 'bg-[#FAF2EB] text-[#1EA854] border-[#1EA854]/30 hover:bg-[#FFFFFF]'
                      }`}
                    >
                      Not Solved ({complaints.filter((c) => c.status !== 'resolved' && c.status !== 'closed').length})
                    </button>
                    <button
                      onClick={() => setAdminStatusFilter('solved')}
                      className={`px-3 py-1.5 font-bold uppercase transition-colors cursor-pointer border ${
                        adminStatusFilter === 'solved'
                          ? 'bg-[#1EA854] text-[#FFFFFF] border-[#1EA854]'
                          : 'bg-[#FAF2EB] text-[#1EA854] border-[#1EA854]/30 hover:bg-[#FFFFFF]'
                      }`}
                    >
                      Solved ({complaints.filter((c) => c.status === 'resolved' || c.status === 'closed').length})
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full md:w-80">
                    <input
                      type="text"
                      placeholder="Search tickets by ID, keyword, location..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-[#FAF2EB] border border-[#1EA854]/40 px-3 py-1.5 text-xs font-mono text-[#1EA854] focus:outline-none focus:border-[#0036FF]"
                    />
                    <Search className="w-3.5 h-3.5 text-[#1EA854]/50 absolute right-2.5 top-2.5" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="bg-[#FAF2EB] text-[#0036FF] uppercase text-[10px] border-b border-[#1EA854]/20">
                        <th className="p-2.5">ID</th>
                        <th className="p-2.5">Title & Description</th>
                        <th className="p-2.5">Owning Post</th>
                        <th className="p-2.5">Current Status</th>
                        <th className="p-2.5">Admin Authority Checklist</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1EA854]/15">
                      {complaints
                        .filter((c) => {
                          const matchesSearch =
                            !searchTerm ||
                            c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.location.toLowerCase().includes(searchTerm.toLowerCase());
                          if (!matchesSearch) return false;
                          if (adminStatusFilter === 'solved') return c.status === 'resolved' || c.status === 'closed';
                          if (adminStatusFilter === 'not_solved') return c.status !== 'resolved' && c.status !== 'closed';
                          return true;
                        })
                        .map((c) => {
                          const isSolved = c.status === 'resolved' || c.status === 'closed';
                          const isInProgress = c.status === 'in_progress';
                          const isConfirmed = c.status === 'investigating' || c.status === 'analyzed';

                          return (
                            <tr key={c.id} className="hover:bg-[#FAF2EB]/60">
                              <td className="p-2.5 font-bold text-[#0036FF]">#{c.id}</td>
                              <td className="p-2.5 max-w-xs">
                                <div className="font-bold text-[#1EA854] line-clamp-1">{c.title}</div>
                                <div className="font-serif italic text-[11px] text-[#1EA854]/75 line-clamp-1">{c.description}</div>
                                <div className="text-[10px] text-[#0036FF] mt-0.5">{c.location}</div>
                              </td>
                              <td className="p-2.5">
                                <span className="font-bold text-[#1EA854]">{c.aiAnalysis.owningPost}</span>
                              </td>
                              <td className="p-2.5">
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-bold uppercase inline-block border ${
                                    isSolved
                                      ? 'bg-[#1EA854] text-[#FFFFFF] border-[#1EA854]'
                                      : isInProgress
                                      ? 'bg-[#B5F800] text-[#0036FF] border-[#0036FF]'
                                      : 'bg-[#FAF2EB] text-[#0036FF] border-[#0036FF]'
                                  }`}
                                >
                                  {isSolved ? 'SOLVED' : isInProgress ? 'IN PROGRESS' : 'CONFIRMED'}
                                </span>
                              </td>
                              <td className="p-2.5">
                                <div className="flex items-center gap-1">
                                  {/* Step 1: Confirm */}
                                  <button
                                    onClick={() => {
                                      updateComplaintStatus(c.id, 'investigating', currentUser.name, 'Admin confirmed receipt of complaint.');
                                      refreshData();
                                      showFeedback(`Ticket #${c.id} marked as Confirmed.`);
                                    }}
                                    className={`px-2 py-1 text-[10px] font-bold uppercase transition-colors cursor-pointer border ${
                                      isConfirmed
                                        ? 'bg-[#0036FF] text-[#FFFFFF] border-[#0036FF]'
                                        : 'bg-[#FFFFFF] text-[#1EA854] border-[#1EA854]/30 hover:bg-[#FAF2EB]'
                                    }`}
                                    title="Step 1: Confirm Receipt"
                                  >
                                    Confirm
                                  </button>

                                  {/* Step 2: In Progress */}
                                  <button
                                    onClick={() => {
                                      updateComplaintStatus(c.id, 'in_progress', currentUser.name, 'Admin assigned work to field crew.');
                                      refreshData();
                                      showFeedback(`Ticket #${c.id} marked In Progress.`);
                                    }}
                                    className={`px-2 py-1 text-[10px] font-bold uppercase transition-colors cursor-pointer border ${
                                      isInProgress
                                        ? 'bg-[#B5F800] text-[#0036FF] border-[#0036FF]'
                                        : 'bg-[#FFFFFF] text-[#1EA854] border-[#1EA854]/30 hover:bg-[#FAF2EB]'
                                    }`}
                                    title="Step 2: Work in Progress"
                                  >
                                    In Progress
                                  </button>

                                  {/* Step 3: Complete / Solved */}
                                  <button
                                    onClick={() => {
                                      updateComplaintStatus(c.id, 'resolved', currentUser.name, 'Admin verified delivery and marked solved.');
                                      refreshData();
                                      showFeedback(`Ticket #${c.id} marked as Complete & Solved!`);
                                    }}
                                    className={`px-2 py-1 text-[10px] font-bold uppercase transition-colors cursor-pointer border flex items-center gap-1 ${
                                      isSolved
                                        ? 'bg-[#1EA854] text-[#FFFFFF] border-[#1EA854]'
                                        : 'bg-[#FAF2EB] text-[#1EA854] border-[#1EA854] hover:bg-[#1EA854] hover:text-[#FFFFFF]'
                                    }`}
                                    title="Step 3: Delivered & Complete (Solved)"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Complete (Solved)</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Mode 3 Tab 2: Merge Duplicates Tool (As per Diagram) */}
            {activeTab === 'merge' && (
              <div className="bg-[#FFFFFF] border-2 border-[#0036FF] p-6 shadow-sm space-y-5">
                <div>
                  <div className="flex items-center gap-2 text-[#0036FF]">
                    <GitMerge className="w-5 h-5 text-[#0036FF]" />
                    <h2 className="font-anton text-xl uppercase text-[#0036FF]">
                      Case Deduplication & Merging Engine
                    </h2>
                  </div>
                  <p className="font-serif italic text-xs text-[#1EA854] mt-1">
                    Select a master case on the left, then select duplicate reports to consolidate into a single resolution thread.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Select Master Case */}
                  <div className="space-y-2">
                    <label className="block font-archivo font-black text-xs uppercase text-[#0036FF]">
                      [ 1. SELECT MASTER TICKET ]
                    </label>
                    <div className="border border-[#1EA854]/25 max-h-72 overflow-y-auto divide-y divide-[#1EA854]/15">
                      {complaints.filter((c) => c.status !== 'closed').map((c) => (
                        <div
                          key={c.id}
                          onClick={() => setSelectedComplaintId(c.id)}
                          className={`p-3 text-xs font-mono cursor-pointer transition-colors ${
                            selectedComplaintId === c.id ? 'bg-[#0036FF] text-[#FFFFFF]' : 'hover:bg-[#FAF2EB]'
                          }`}
                        >
                          <div className="font-bold">#{c.id} · {c.title}</div>
                          <div className="text-[11px] opacity-80">{c.location} · {c.categoryName}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Select Duplicates to Merge */}
                  <div className="space-y-2">
                    <label className="block font-archivo font-black text-xs uppercase text-[#0036FF]">
                      [ 2. SELECT CANDIDATE DUPLICATES TO MERGE ]
                    </label>
                    <div className="border border-[#1EA854]/25 max-h-72 overflow-y-auto divide-y divide-[#1EA854]/15">
                      {complaints
                        .filter((c) => c.id !== selectedComplaintId && c.status !== 'closed')
                        .map((c) => (
                          <label
                            key={c.id}
                            className={`p-3 text-xs font-mono flex items-start gap-2.5 cursor-pointer transition-colors ${
                              mergeSelectedIds.includes(c.id) ? 'bg-[#B5F800]/40' : 'hover:bg-[#FAF2EB]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={mergeSelectedIds.includes(c.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setMergeSelectedIds([...mergeSelectedIds, c.id]);
                                } else {
                                  setMergeSelectedIds(mergeSelectedIds.filter((id) => id !== c.id));
                                }
                              }}
                              className="mt-0.5"
                            />
                            <div>
                              <div className="font-bold text-[#1EA854]">#{c.id} · {c.title}</div>
                              <div className="text-[11px] font-serif italic text-[#1EA854]/75">"{c.description}"</div>
                            </div>
                          </label>
                        ))}
                    </div>

                    <button
                      type="button"
                      disabled={!selectedComplaintId || mergeSelectedIds.length === 0}
                      onClick={handleMergeSubmit}
                      className="w-full py-2.5 bg-[#0036FF] text-[#B5F800] font-archivo font-black text-xs uppercase tracking-wider hover:bg-[#1EA854] hover:text-[#FFFFFF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 mt-3"
                    >
                      <GitMerge className="w-4 h-4" />
                      <span>Merge {mergeSelectedIds.length} Duplicates into #{selectedComplaintId || '...'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Mode 3 Tab 3: Posts & Routing Rules */}
            {activeTab === 'rules' && (
              <div className="bg-[#FFFFFF] border-2 border-[#1EA854] p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-anton text-xl uppercase text-[#1EA854]">
                      Owning Posts & Automated Dispatch Matrix
                    </h2>
                    <p className="font-serif italic text-xs text-[#1EA854]/80">
                      AI analyzes student issue text and dispatches directly to the configured owning post and designated officer.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="bg-[#1EA854] text-[#FFFFFF] uppercase text-[10px]">
                        <th className="p-3">Category</th>
                        <th className="p-3">Owning Post & Location</th>
                        <th className="p-3">Designated Head</th>
                        <th className="p-3">SLA Threshold</th>
                        <th className="p-3">Key Trigger Signals</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1EA854]/15">
                      {DEFAULT_ROUTING_RULES.map((rule) => (
                        <tr key={rule.categoryId} className="hover:bg-[#FAF2EB]">
                          <td className="p-3 font-bold text-[#0036FF]">{rule.categoryName}</td>
                          <td className="p-3 font-bold">{rule.owningPost}</td>
                          <td className="p-3">
                            <div>{rule.headName}</div>
                            <div className="text-[10px] text-[#1EA854]/70">{rule.headEmail}</div>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-[#1EA854]">{rule.defaultSlaHours}h Normal</span> / <span className="text-[#0036FF]">{rule.escalationThresholdHours}h Escalate</span>
                          </td>
                          <td className="p-3 text-[11px] text-[#1EA854]/75">
                            {rule.keywords.slice(0, 5).join(', ')}...
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------
          ESCALATE REASON MODAL (Mode 1 to Mode 2)
          ------------------------------------------------------------- */}
      {showEscalateModal && activeComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0036FF]/30 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] border-2 border-[#0036FF] p-6 max-w-lg w-full space-y-4 shadow-xl text-[#1EA854]">
            <div className="flex items-center gap-2 text-[#0036FF]">
              <AlertTriangle className="w-5 h-5 text-[#0036FF]" />
              <h3 className="font-anton text-lg uppercase text-[#0036FF]">
                Escalate Case #{activeComplaint.id} to President / GS
              </h3>
            </div>
            <p className="text-xs font-serif italic text-[#1EA854]">
              State the structural blocker (e.g. awaiting budget approval, vendor part backordered, inter-departmental dispute) so the Student Union President / GS can intervene.
            </p>
            <form onSubmit={handleEscalateSubmit} className="space-y-3">
              <textarea
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                placeholder="Reason for escalation..."
                rows={4}
                className="w-full bg-[#FAF2EB] border border-[#1EA854]/40 p-2.5 text-xs font-serif text-[#1EA854] focus:outline-none focus:border-[#0036FF]"
                required
              />
              <div className="flex justify-end gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setShowEscalateModal(false)}
                  className="px-3 py-1.5 border border-[#1EA854]/30 hover:bg-[#FAF2EB] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0036FF] text-[#B5F800] font-bold uppercase hover:bg-[#1EA854] hover:text-[#FFFFFF] cursor-pointer"
                >
                  Confirm Escalation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
