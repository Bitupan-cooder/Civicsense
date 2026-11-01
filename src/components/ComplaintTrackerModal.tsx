import React, { useState, useEffect } from 'react';
import {
  getAllComplaints,
  getComplaintById,
} from '@/lib/governanceStore';
import { Complaint } from '@/types/governance';
import {
  Search,
  X,
  CheckCircle2,
  Clock,
  MapPin,
  Building2,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface ComplaintTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialComplaintId?: string;
}

export const ComplaintTrackerModal: React.FC<ComplaintTrackerModalProps> = ({
  isOpen,
  onClose,
  initialComplaintId,
}) => {
  const [complaintIdInput, setComplaintIdInput] = useState<string>(initialComplaintId || 'CS-8921');
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const allComplaints = getAllComplaints();

  useEffect(() => {
    if (initialComplaintId) {
      setComplaintIdInput(initialComplaintId);
      const found = getComplaintById(initialComplaintId);
      if (found) {
        setActiveComplaint(found);
      }
    } else {
      const defaultOne = getComplaintById('CS-8921') || allComplaints[0];
      if (defaultOne) setActiveComplaint(defaultOne);
    }
  }, [initialComplaintId, isOpen]);

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintIdInput.trim()) return;
    const found = getComplaintById(complaintIdInput);
    if (found) {
      setActiveComplaint(found);
      setSearchError(null);
    } else {
      setSearchError(`Complaint #${complaintIdInput.trim().toUpperCase()} was not found. Please check the ID.`);
    }
  };

  const isSolved = activeComplaint?.status === 'resolved' || activeComplaint?.status === 'closed';
  const isInProgress = activeComplaint?.status === 'in_progress' || activeComplaint?.status === 'investigating' || activeComplaint?.status === 'escalated';

  // Latest reply or resolution note
  const latestReply = activeComplaint?.replies && activeComplaint.replies.length > 0
    ? activeComplaint.replies[activeComplaint.replies.length - 1]
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-[#0036FF]/20 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tracker-title"
    >
      <div className="relative w-full max-w-2xl bg-[#FFFFFF] border-2 border-[#1EA854] shadow-2xl overflow-hidden text-[#1EA854] flex flex-col max-h-[90vh]">
        {/* Header - Simple & Clean */}
        <div className="bg-[#1EA854] text-[#FFFFFF] px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#B5F800]" />
            <h2 id="tracker-title" className="font-anton text-xl tracking-wide uppercase">
              COMPLAINT STATUS TRACKER
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#FFFFFF] hover:text-[#B5F800] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar - Simple */}
        <div className="bg-[#FAF2EB] p-4 border-b border-[#1EA854]/20 shrink-0">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={complaintIdInput}
                onChange={(e) => setComplaintIdInput(e.target.value)}
                placeholder="Enter Complaint ID (e.g. CS-8921)..."
                className="w-full bg-[#FFFFFF] border-2 border-[#1EA854] px-3.5 py-2 text-sm font-mono font-bold text-[#1EA854] uppercase focus:outline-none focus:border-[#0036FF]"
              />
              <Search className="w-4 h-4 text-[#1EA854]/40 absolute right-3 top-3" />
            </div>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0036FF] text-[#B5F800] font-archivo font-black text-xs uppercase tracking-wider hover:bg-[#1EA854] hover:text-[#FFFFFF] transition-colors cursor-pointer shrink-0"
            >
              Check Status
            </button>
          </form>

          {/* Quick Recent Cases */}
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto text-xs font-mono">
            <span className="text-[#0036FF] font-bold text-[11px] shrink-0">Quick Check:</span>
            {allComplaints.slice(0, 4).map((comp) => {
              const compSolved = comp.status === 'resolved' || comp.status === 'closed';
              return (
                <button
                  key={comp.id}
                  onClick={() => {
                    setComplaintIdInput(comp.id);
                    setActiveComplaint(comp);
                    setSearchError(null);
                  }}
                  className={`px-2 py-0.5 text-[10px] font-bold border transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                    activeComplaint?.id === comp.id
                      ? 'bg-[#1EA854] text-[#FFFFFF] border-[#1EA854]'
                      : 'bg-[#FFFFFF] text-[#1EA854] border-[#1EA854]/30 hover:border-[#0036FF]'
                  }`}
                >
                  <span>#{comp.id}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${compSolved ? 'bg-[#1EA854]' : 'bg-[#0036FF]'}`} />
                </button>
              );
            })}
          </div>

          {searchError && (
            <div className="mt-2 text-xs font-mono font-bold text-[#0036FF] bg-[#B5F800]/30 p-2 border border-[#0036FF]">
              {searchError}
            </div>
          )}
        </div>

        {/* Status Body - Clear, simple, answers: IS IT SOLVED OR NOT? */}
        {activeComplaint ? (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
            {/* Top Big Answer: Is it Solved or Not? */}
            <div
              className={`p-5 border-2 shadow-sm ${
                isSolved
                  ? 'bg-[#B5F800]/15 border-[#1EA854]'
                  : 'bg-[#0036FF]/5 border-[#0036FF]'
              }`}
            >
              <div className="flex items-start gap-3.5">
                {isSolved ? (
                  <CheckCircle2 className="w-8 h-8 text-[#1EA854] shrink-0 mt-0.5" />
                ) : (
                  <Clock className="w-8 h-8 text-[#0036FF] shrink-0 mt-0.5" />
                )}

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs font-bold text-[#0036FF]">
                      TICKET #{activeComplaint.id}
                    </span>
                    <span
                      className={`text-xs font-archivo font-black uppercase px-2.5 py-0.5 border ${
                        isSolved
                          ? 'bg-[#1EA854] text-[#FFFFFF] border-[#1EA854]'
                          : 'bg-[#0036FF] text-[#B5F800] border-[#0036FF]'
                      }`}
                    >
                      {isSolved ? 'STATUS: SOLVED' : 'STATUS: NOT SOLVED YET'}
                    </span>
                  </div>

                  <h3 className="font-anton text-2xl uppercase tracking-normal text-[#1EA854]">
                    {isSolved ? 'COMPLAINT HAS BEEN SOLVED' : 'WORK IS IN PROGRESS'}
                  </h3>

                  <p className="font-serif italic text-xs sm:text-sm text-[#1EA854] mt-1">
                    {isSolved
                      ? 'Campus maintenance staff inspected and resolved this issue. All work is complete.'
                      : 'Our team has confirmed this report and staff is actively assigned to resolve it.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Simple 3-Step Visual Progress Bar */}
            <div className="bg-[#FAF2EB] p-4 border border-[#1EA854]/20 space-y-2">
              <span className="font-archivo font-black text-[11px] uppercase tracking-wider text-[#0036FF] block">
                COMPLAINT PROGRESS
              </span>

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                {/* Step 1: Reported */}
                <div className="bg-[#FFFFFF] border-2 border-[#1EA854] p-2.5">
                  <div className="flex items-center justify-center gap-1 font-bold text-[#1EA854]">
                    <CheckCircle2 className="w-4 h-4 text-[#1EA854]" />
                    <span>1. Reported</span>
                  </div>
                  <div className="text-[10px] text-[#1EA854]/70 mt-0.5">Received</div>
                </div>

                {/* Step 2: In Progress */}
                <div
                  className={`border-2 p-2.5 ${
                    isSolved || isInProgress
                      ? 'bg-[#FFFFFF] border-[#0036FF] text-[#0036FF] font-bold'
                      : 'bg-[#FFFFFF]/50 border-[#1EA854]/20 text-[#1EA854]/50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {isSolved ? (
                      <CheckCircle2 className="w-4 h-4 text-[#1EA854]" />
                    ) : isInProgress ? (
                      <Clock className="w-4 h-4 text-[#0036FF]" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-current inline-block" />
                    )}
                    <span>2. In Progress</span>
                  </div>
                  <div className="text-[10px] mt-0.5">
                    {isSolved ? 'Completed' : isInProgress ? 'Active Work' : 'Queued'}
                  </div>
                </div>

                {/* Step 3: Solved */}
                <div
                  className={`border-2 p-2.5 ${
                    isSolved
                      ? 'bg-[#1EA854] text-[#FFFFFF] border-[#1EA854] font-bold shadow-xs'
                      : 'bg-[#FFFFFF]/50 border-[#1EA854]/20 text-[#1EA854]/50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {isSolved ? (
                      <CheckCircle2 className="w-4 h-4 text-[#B5F800]" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-current inline-block" />
                    )}
                    <span>3. Solved</span>
                  </div>
                  <div className="text-[10px] mt-0.5">
                    {isSolved ? 'Fixed & Verified' : 'Pending'}
                  </div>
                </div>
              </div>
            </div>

            {/* Simple Complaint Details Card */}
            <div className="bg-[#FFFFFF] border border-[#1EA854]/30 p-4 space-y-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#0036FF] uppercase block">
                  ISSUE REPORTED
                </span>
                <h4 className="font-anton text-lg uppercase text-[#1EA854]">
                  {activeComplaint.title}
                </h4>
                <p className="font-serif italic text-xs text-[#1EA854] mt-0.5">
                  "{activeComplaint.description}"
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#1EA854]/15 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#0036FF] shrink-0" />
                  <div>
                    <div className="text-[9px] text-[#1EA854]/70 uppercase">Location</div>
                    <div className="font-bold text-[#1EA854]">{activeComplaint.location}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#0036FF] shrink-0" />
                  <div>
                    <div className="text-[9px] text-[#1EA854]/70 uppercase">Assigned Team</div>
                    <div className="font-bold text-[#0036FF]">{activeComplaint.aiAnalysis.owningPost}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Simple Latest Update message if any */}
            {latestReply && (
              <div className="bg-[#FAF2EB] border-l-4 border-[#0036FF] p-3.5 text-xs">
                <div className="font-mono font-bold text-[#0036FF] text-[11px] mb-1">
                  UPDATE FROM {latestReply.author.toUpperCase()}:
                </div>
                <div className="font-serif italic text-[#1EA854]">
                  "{latestReply.message}"
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-xs font-serif italic text-[#1EA854]/70">
            Enter a complaint ID above to view status.
          </div>
        )}

        {/* Simple Footer */}
        <div className="bg-[#FAF2EB] border-t border-[#1EA854]/20 p-4 flex items-center justify-between shrink-0">
          <span className="text-xs font-mono text-[#1EA854]/70">
            Public Campus Tracker
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1EA854] text-[#FFFFFF] font-bold text-xs uppercase hover:bg-[#0036FF] hover:text-[#B5F800] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
