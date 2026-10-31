import { ReportPayload } from './handoff';

export interface StoredReport extends ReportPayload {
  id: string;
  timestamp: number;
  resolved: boolean;
  channelUsed: 'email' | 'whatsapp' | 'clipboard';
}

const STORAGE_KEY = 'civicsense_local_reports_v1';

export function getStoredReports(): StoredReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error('Error reading reports from localStorage', e);
    return [];
  }
}

export function saveReport(payload: ReportPayload, channel: 'email' | 'whatsapp' | 'clipboard'): StoredReport {
  const newReport: StoredReport = {
    ...payload,
    id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    resolved: false,
    channelUsed: channel
  };

  const existing = getStoredReports();
  const updated = [newReport, ...existing];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error writing report to localStorage', e);
  }

  // Dispatch custom event so reactive components can update instantly
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('civicsense_reports_updated'));
  }

  return newReport;
}

export function toggleReportResolved(id: string): StoredReport[] {
  const existing = getStoredReports();
  const updated = existing.map(r => r.id === id ? { ...r, resolved: !r.resolved } : r);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error updating report in localStorage', e);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('civicsense_reports_updated'));
  }
  return updated;
}

export function deleteReport(id: string): StoredReport[] {
  const existing = getStoredReports();
  const updated = existing.filter(r => r.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error deleting report from localStorage', e);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('civicsense_reports_updated'));
  }
  return updated;
}

export function clearAllReports(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Error clearing reports', e);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('civicsense_reports_updated'));
  }
}
