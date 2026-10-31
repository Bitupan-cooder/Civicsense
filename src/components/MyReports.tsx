import React, { useState, useEffect } from 'react';
import { getStoredReports, toggleReportResolved, deleteReport, StoredReport, clearAllReports } from '@/lib/storage';
import { CheckCircle2, Clock, Trash2, Mail, MessageCircle, Copy } from 'lucide-react';

export const MyReports: React.FC = () => {
  const [reports, setReports] = useState<StoredReport[]>([]);

  const loadReports = () => {
    setReports(getStoredReports());
  };

  useEffect(() => {
    loadReports();

    const handleUpdate = () => {
      loadReports();
    };

    window.addEventListener('civicsense_reports_updated', handleUpdate);
    return () => window.removeEventListener('civicsense_reports_updated', handleUpdate);
  }, []);

  const handleToggle = (id: string) => {
    const updated = toggleReportResolved(id);
    setReports(updated);
  };

  const handleDelete = (id: string) => {
    const updated = deleteReport(id);
    setReports(updated);
  };

  const handleClearAll = () => {
    if (window.confirm('Delete all saved reports from this browser?')) {
      clearAllReports();
      setReports([]);
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'Immediate Hazard':
        return 'bg-[#0036FF] text-[#B5F800] border border-[#0036FF]';
      case 'Urgent':
        return 'bg-[#1EA854] text-[#FFFFFF]';
      case 'Low':
        return 'bg-[#FAF2EB] text-[#1EA854] border border-[#1EA854]/30';
      default:
        return 'bg-[#1EA854]/10 text-[#1EA854]';
    }
  };

  return (
    <div className="bg-[#FFFFFF] border-2 border-[#0036FF] p-6 sm:p-8 md:p-10 text-[#1EA854] mt-8 shadow-md">
      {/* Header */}
      <div className="border-b border-[#1EA854]/20 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="font-archivo font-extrabold text-[11px] tracking-widest text-[#0036FF] uppercase">
            [ PRIVATE LOCAL RECORD ]
          </span>
          <h3 className="font-archivo font-black text-xl sm:text-2xl text-[#1EA854] uppercase tracking-tight">
            MY REPORTS ON THIS DEVICE
          </h3>
        </div>

        {reports.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] font-archivo font-extrabold uppercase tracking-wider text-[#0036FF] hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            CLEAR ALL
          </button>
        )}
      </div>

      {/* Empty State */}
      {reports.length === 0 ? (
        <div className="py-12 px-4 text-center border border-dashed border-[#1EA854]/25 bg-[#FAF2EB]">
          <Clock className="w-10 h-10 text-[#0036FF]/50 mx-auto mb-3" />
          <h4 className="font-archivo font-black text-base uppercase text-[#1EA854]">
            No reports filed yet on this device
          </h4>
          <p className="font-serif italic text-xs sm:text-sm text-[#1EA854] max-w-md mx-auto mt-1 leading-relaxed">
            When you send a campus report via Email, WhatsApp, or Clipboard, a private copy is kept here in your browser’s local storage so you can reference or mark it resolved.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const isResolved = report.resolved;
            return (
              <div
                key={report.id}
                className={`p-4 sm:p-5 border transition-all ${
                  isResolved
                    ? 'bg-[#9ABC05]/15 border-[#9ABC05] text-[#1EA854]'
                    : 'bg-[#FAF2EB] border-[#1EA854]/20 hover:border-[#0036FF]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-[#1EA854]/15">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-archivo font-black text-xs uppercase px-2 py-0.5 bg-[#0036FF] text-[#FFFFFF]">
                      {report.categoryName || report.category}
                    </span>
                    <span className={`font-archivo font-black text-[10px] uppercase px-2 py-0.5 ${getUrgencyBadge(report.urgency)}`}>
                      {report.urgency}
                    </span>
                    <span className="font-serif text-[11px] text-[#1EA854]">
                      {formatDate(report.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-archivo text-[10px] uppercase font-bold text-[#1EA854] flex items-center gap-1">
                      {report.channelUsed === 'email' && <Mail className="w-3 h-3 text-[#0036FF]" />}
                      {report.channelUsed === 'whatsapp' && <MessageCircle className="w-3 h-3 text-[#9ABC05]" />}
                      {report.channelUsed === 'clipboard' && <Copy className="w-3 h-3 text-[#1EA854]" />}
                      {(report.channelUsed || 'dispatch').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <span className="block font-archivo font-extrabold text-xs uppercase tracking-wide text-[#0036FF]">
                    {report.location}
                  </span>
                  <p className="font-serif text-sm text-[#1EA854] mt-1 leading-snug">
                    {report.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#1EA854]/15">
                  <button
                    type="button"
                    onClick={() => handleToggle(report.id)}
                    className={`font-archivo font-black text-xs uppercase tracking-wider flex items-center gap-1.5 py-1 px-2.5 transition-colors ${
                      isResolved
                        ? 'bg-[#9ABC05] text-[#FFFFFF]'
                        : 'bg-transparent border border-[#1EA854] text-[#1EA854] hover:bg-[#9ABC05] hover:text-[#FFFFFF] hover:border-[#9ABC05]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isResolved ? 'RESOLVED' : 'MARK RESOLVED'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(report.id)}
                    className="text-[#1EA854] hover:text-[#0036FF] p-1 transition-colors"
                    title="Delete local record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
