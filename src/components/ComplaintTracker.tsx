import React, { useState, useEffect } from 'react';
import {
  ComplaintRecord,
  TIMELINE_STAGE_LABELS,
  loadPortalComplaints,
} from '@/lib/portalStore';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageSquare,
  MapPin,
  Building2,
} from 'lucide-react';

interface ComplaintTrackerProps {
  initialComplaintId?: string;
}

export const ComplaintTracker: React.FC<ComplaintTrackerProps> = ({ initialComplaintId }) => {
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [searchId, setSearchId] = useState<string>(initialComplaintId || 'CMP-2601');
  const [activeComplaint, setActiveComplaint] = useState<ComplaintRecord | null>(null);

  const refreshList = () => {
    const list = loadPortalComplaints();
    setComplaints(list);
    const targetId = (searchId || initialComplaintId || list[0]?.id || '').trim().toUpperCase();
    const found = list.find((c) => c.id.toUpperCase() === targetId) || list[0] || null;
    setActiveComplaint(found);
  };

  useEffect(() => {
    refreshList();
    const onUpdate = () => refreshList();
    window.addEventListener('civicsense_portal_updated', onUpdate);
    window.addEventListener('civicsense_reports_updated', onUpdate);
    return () => {
      window.removeEventListener('civicsense_portal_updated', onUpdate);
      window.removeEventListener('civicsense_reports_updated', onUpdate);
    };
  }, []);

  useEffect(() => {
    if (initialComplaintId) {
      setSearchId(initialComplaintId);
      const list = loadPortalComplaints();
      const found = list.find((c) => c.id.toUpperCase() === initialComplaintId.toUpperCase());
      if (found) setActiveComplaint(found);
    }
  }, [initialComplaintId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchId.trim().toUpperCase();
    const found = complaints.find((c) => c.id.toUpperCase() === clean);
    setActiveComplaint(found || null);
  };

  const selectComplaint = (c: ComplaintRecord) => {
    setSearchId(c.id);
    setActiveComplaint(c);
  };

  const getPublicStatusLabel = (c: ComplaintRecord) => {
    const steps = c.routeSteps || [];
    if (steps[3]?.completed || c.status === 'resolved' || c.status === 'closed') return 'COMPLETED';
    if (steps[2]?.completed) return 'DELIVERED';
    if (steps[1]?.completed || c.status === 'in_progress') return 'SOLVING';
    if (steps[0]?.completed || c.approved) return 'PROBLEM SEEN';
    return 'AWAITING OFFICIAL APPROVAL';
  };

  return (
    <div
      id="tracker"
      className="bg-[#FFFFFF] border-2 border-[#0036FF] p-6 sm:p-8 text-[#134E2C] shadow-2xs"
    >
      {/* Tracker Header */}
      <div className="border-b border-[#1EA854]/20 pb-5 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-anton text-2xl sm:text-3xl text-[#134E2C]">
            Complaint Status Tracker
          </h3>
          <p className="font-archivo text-xs sm:text-sm text-[#1EA854] font-medium mt-0.5">
            View live report timeline (Problem Seen, Solving, Delivered, Completed). Updated by officials.
          </p>
        </div>

        {/* Search Input by Complaint ID */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 shrink-0">
          <label htmlFor="tracker-id-input" className="sr-only">
            Complaint ID
          </label>
          <input
            id="tracker-id-input"
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="e.g. CMP-2601"
            className="bg-[#FAF2EB] border border-[#0036FF]/35 px-3.5 py-2 font-archivo text-xs sm:text-sm font-bold text-[#0036FF] uppercase w-36 sm:w-44 focus-ring-blue"
          />
          <button
            type="submit"
            className="bg-[#0036FF] text-[#B5F800] hover:bg-[#1EA854] hover:text-[#FFFFFF] px-4 py-2 font-archivo font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-[#B5F800]" />
            <span>Check Status</span>
          </button>
        </form>
      </div>

      {/* Quick Sample ID Switcher Pills */}
      <div className="mb-6">
        <span className="block font-archivo font-semibold text-xs text-[#1EA854] mb-2">
          Recent Complaint IDs (Click to View Read-Only Timeline):
        </span>
        <div className="flex flex-wrap gap-2">
          {complaints.map((c) => {
            const isSelected = activeComplaint?.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => selectComplaint(c)}
                className={`px-3 py-1.5 font-archivo text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#0036FF] text-[#B5F800] border-[#0036FF] font-bold'
                    : 'bg-[#FAF2EB] text-[#134E2C] border-[#1EA854]/30 hover:border-[#0036FF] hover:text-[#0036FF]'
                }`}
              >
                <span>{c.id}</span>
                <span className="text-[10px] opacity-85">({getPublicStatusLabel(c)})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Complaint Read-Only Timeline & Replies View */}
      {!activeComplaint ? (
        <div className="py-10 px-4 text-center bg-[#FAF2EB] border border-dashed border-[#0036FF]/30">
          <p className="font-archivo font-bold text-sm text-[#0036FF]">
            No complaint found matching ID &ldquo;{searchId}&rdquo;
          </p>
        </div>
      ) : (
        <div className="bg-[#FAF2EB] border border-[#1EA854]/30 p-5 sm:p-6 space-y-6">
          {/* Top Summary Header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-[#1EA854]/20">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="imp-badge">ID · {activeComplaint.id}</span>
                <span className="font-archivo font-bold text-xs px-2.5 py-0.5 bg-[#0036FF] text-[#B5F800]">
                  STATUS: {getPublicStatusLabel(activeComplaint)}
                </span>
                {getPublicStatusLabel(activeComplaint) === 'COMPLETED' ? (
                  <span className="font-archivo font-bold text-xs px-2.5 py-0.5 bg-[#1EA854] text-[#FFFFFF]">
                    SOLVED · RED PIN REMOVED FROM MAP
                  </span>
                ) : (
                  <a
                    href="#campus-map"
                    className="font-archivo font-bold text-xs px-2.5 py-0.5 bg-[#DC2626] text-[#FFFFFF] inline-flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>RED PIN ACTIVE ON MAP</span>
                  </a>
                )}
                <span className="font-archivo font-semibold text-xs px-2.5 py-0.5 bg-[#FFFFFF] text-[#1EA854] border border-[#1EA854]/30">
                  Priority: {activeComplaint.priority}
                </span>
              </div>

              <h4 className="font-anton text-xl sm:text-2xl text-[#134E2C]">
                {activeComplaint.summary}
              </h4>
              <p className="font-archivo text-sm text-[#134E2C] leading-relaxed">
                {activeComplaint.description}
              </p>

              {activeComplaint.photoDataUrl && (
                <div className="pt-2">
                  <img
                    src={activeComplaint.photoDataUrl}
                    alt={`Location evidence for ${activeComplaint.id}`}
                    className="w-56 h-32 object-cover border-2 border-[#0036FF] bg-[#FFFFFF]"
                  />
                </div>
              )}
            </div>

            {/* Owning Post & GPS Coordinates Card */}
            <div className="bg-[#FFFFFF] border border-[#0036FF]/25 p-3.5 shrink-0 md:w-76 space-y-1.5">
              <div className="font-archivo font-bold text-[11px] uppercase tracking-wider text-[#1EA854] flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#0036FF]" />
                <span>Assigned Department</span>
              </div>
              <div className="font-archivo font-bold text-xs sm:text-sm text-[#0036FF]">
                {activeComplaint.owningPost}
              </div>
              <div className="font-archivo text-xs font-medium text-[#134E2C] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#1EA854] shrink-0" />
                <span>{activeComplaint.location}</span>
              </div>
              {typeof activeComplaint.lat === 'number' && typeof activeComplaint.lng === 'number' && (
                <div className="font-archivo text-[11px] font-bold text-[#0036FF] pt-1 border-t border-[#1EA854]/20">
                  GPS: {activeComplaint.lat.toFixed(5)}° N, {activeComplaint.lng.toFixed(5)}° E
                  {activeComplaint.gpsAccuracyMeters ? ` (±${activeComplaint.gpsAccuracyMeters}m)` : ''}
                </div>
              )}
            </div>
          </div>

          {/* 4-Stage Read-Only Timeline Status (Problem Seen -> Solving -> Delivered -> Completed) */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="imp-badge">
                REPORT TIMELINE STATUS (READ-ONLY VIEW FOR USER)
              </span>
              <span className="font-archivo text-xs font-semibold text-[#1EA854]">
                Only signed-in officials can check or modify these stages
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {activeComplaint.routeSteps.map((step, idx) => {
                const stageTitle = TIMELINE_STAGE_LABELS[idx] || step.step;
                return (
                  <div
                    key={idx}
                    className={`p-4 border transition-all ${
                      step.completed
                        ? 'bg-[#FFFFFF] border-2 border-[#1EA854] shadow-2xs'
                        : 'bg-[#EEF7EE]/60 border-dashed border-[#0036FF]/30 opacity-85'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-archivo font-bold text-xs text-[#0036FF]">
                        STAGE 0{idx + 1}
                      </span>
                      {step.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#1EA854]" />
                      ) : (
                        <Clock className="w-4 h-4 text-[#0036FF]" />
                      )}
                    </div>
                    <div className="font-anton text-lg text-[#134E2C]">
                      {stageTitle}
                    </div>
                    <div className="font-archivo text-[11px] font-bold text-[#0036FF] mt-0.5">
                      {step.post}
                    </div>
                    <p className="font-archivo text-xs text-[#134E2C] mt-1.5 leading-snug">
                      {step.note}
                    </p>
                    <div className="mt-3 pt-2 border-t border-[#1EA854]/20 flex items-center justify-between font-archivo text-[11px] font-bold">
                      <span className={step.completed ? 'text-[#1EA854]' : 'text-[#0036FF]'}>
                        {step.completed ? 'Completed' : 'Pending'}
                      </span>
                      <span className="text-[#134E2C]">{step.timestamp}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Escalation Alert if Stuck */}
          {activeComplaint.escalated && (
            <div className="bg-[#0036FF] text-[#FFFFFF] p-4 border border-[#B5F800] flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#B5F800] shrink-0 mt-0.5" />
              <div>
                <div className="font-archivo font-bold text-xs uppercase tracking-wider text-[#B5F800]">
                  Escalated to President / GS & Admin
                </div>
                <p className="font-archivo text-xs sm:text-sm text-[#FFFFFF] mt-0.5">
                  {activeComplaint.escalationReason || 'Escalated by Department Head for cross-department clearance.'}
                </p>
              </div>
            </div>
          )}

          {/* Official Replies Log */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-archivo font-bold text-xs uppercase tracking-wider text-[#0036FF] flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#1EA854]" />
                <span>Official Updates & Replies ({activeComplaint.replies.length})</span>
              </h5>
            </div>

            {activeComplaint.replies.length === 0 ? (
              <div className="bg-[#FFFFFF] border border-[#1EA854]/30 p-4 text-center font-archivo text-xs text-[#1EA854] font-semibold">
                No official replies posted yet. Your complaint is queued with {activeComplaint.owningPost}.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeComplaint.replies.map((rep) => (
                  <div
                    key={rep.id}
                    className="bg-[#FFFFFF] border border-[#0036FF]/25 p-3.5 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-archivo font-bold text-xs text-[#0036FF]">
                          {rep.authorName}
                        </span>
                        <span className="imp-badge">
                          {rep.authorRole}
                        </span>
                      </div>
                      <span className="font-archivo text-[11px] font-medium text-[#1EA854]">
                        {rep.timestamp}
                      </span>
                    </div>
                    <p className="font-archivo text-xs sm:text-sm text-[#134E2C] leading-relaxed">
                      {rep.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
