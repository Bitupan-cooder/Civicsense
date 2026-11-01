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
    clearAllReports();
    setReports([]);
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

  return (
    <div className="bg-[#FFFFFF] border border-[#1EA854]/30 p-6 sm:p-8 text-[#134E2C] shadow-2xs">
      {/* Header */}
      <div className="border-b border-[#1EA854]/20 pb-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="imp-badge mb-1.5">LOCAL DEVICE RECORD</span>
          <h3 className="font-anton text-2xl text-[#134E2C]">
            My Reports on This Device
          </h3>
        </div>

        {reports.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs font-archivo font-bold text-[#0036FF] hover:text-[#1EA854] underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {reports.length === 0 ? (
        <div className="py-10 px-4 text-center border border-dashed border-[#1EA854]/30 bg-[#FAF2EB]">
          <Clock className="w-8 h-8 text-[#1EA854] mx-auto mb-2.5" />
          <h4 className="font-archivo font-bold text-sm text-[#134E2C]">
            No reports filed yet on this device
          </h4>
          <p className="font-archivo text-xs text-[#1EA854] max-w-md mx-auto mt-1 leading-relaxed">
            When you submit a campus report above, a private copy is saved in your browser so you can reference it anytime.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const isResolved = report.resolved;
            return (
              <div
                key={report.id}
                className={`p-4 border transition-all ${
                  isResolved
                    ? 'bg-[#EEF7EE] border-[#1EA854]'
                    : 'bg-[#FAF2EB] border-[#0036FF]/25'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-[#1EA854]/20">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="imp-badge">
                      {report.categoryName || report.category}
                    </span>
                    <span className="font-archivo font-bold text-xs px-2 py-0.5 bg-[#FFFFFF] border border-[#0036FF]/25 text-[#0036FF]">
                      {report.urgency}
                    </span>
                    <span className="font-archivo text-xs font-medium text-[#1EA854]">
                      {formatDate(report.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-archivo text-xs font-bold text-[#0036FF] flex items-center gap-1">
                      {report.channelUsed === 'email' && <Mail className="w-3.5 h-3.5 text-[#1EA854]" />}
                      {report.channelUsed === 'whatsapp' && <MessageCircle className="w-3.5 h-3.5 text-[#1EA854]" />}
                      {report.channelUsed === 'clipboard' && <Copy className="w-3.5 h-3.5 text-[#0036FF]" />}
                      <span>{(report.channelUsed || 'dispatch').toUpperCase()}</span>
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <span className="block font-archivo font-bold text-xs text-[#0036FF]">
                    {report.location}
                  </span>
                  <p className="font-archivo text-sm text-[#134E2C] mt-1 leading-snug">
                    {report.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#1EA854]/20">
                  <button
                    type="button"
                    onClick={() => handleToggle(report.id)}
                    className={`font-archivo font-bold text-xs flex items-center gap-1.5 py-1 px-2.5 transition-colors cursor-pointer ${
                      isResolved
                        ? 'bg-[#1EA854] text-[#FFFFFF]'
                        : 'bg-[#FFFFFF] border border-[#0036FF]/30 text-[#0036FF] hover:bg-[#0036FF] hover:text-[#B5F800]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isResolved ? 'Resolved' : 'Mark Resolved'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(report.id)}
                    className="text-[#1EA854] hover:text-[#0036FF] p-1 transition-colors cursor-pointer"
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
