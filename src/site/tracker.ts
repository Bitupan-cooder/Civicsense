// State and actions of "My complaints" on /report/new: the student's list, its filters, and the ticket shown at ?track=<id>.
import { useSyncExternalStore } from 'react';
import type { Complaint, Routing } from '../civicAuth';
import * as auth from '../civicAuth';
import { showToast } from '../toast';
import { CATEGORY_LABELS, ticketRef, type Category } from '../logic';

export interface TrackerState {
  searchError: string | null;
  result: Complaint | null;
  mine: Complaint[];
  /** false until the student's complaints have been loaded once (nothing is shown before). */
  mineLoaded: boolean;
  mineLoading: boolean;
  mineError: string | null;
  filterText: string;
  filterStatus: string;
  /** AI analysis and route tracker per complaint id (empty until migration 001 is run). */
  routing: Record<string, Routing>;
}

let state: TrackerState = {
  searchError: null, result: null,
  mine: [], mineLoaded: false, mineLoading: false, mineError: null, filterText: '', filterStatus: 'ALL', routing: {},
};
const listeners = new Set<() => void>();
let sessionGeneration = 0;

function update(patch: Partial<TrackerState>): void {
  state = { ...state, ...patch };
  listeners.forEach((notify) => notify());
}

export function useTracker(): TrackerState {
  return useSyncExternalStore(
    (notify) => { listeners.add(notify); return () => { listeners.delete(notify); }; },
    () => state,
  );
}

export function clearTrackerSession(): void {
  sessionGeneration++;
  update({ mine: [], routing: {}, result: null, mineLoaded: false, mineLoading: false, mineError: null });
}

export async function loadStudentComplaints(): Promise<void> {
  const generation = sessionGeneration;
  update({ mineLoading: true, mineError: null });
  try {
    const mine = (await auth.fetchStudentComplaints()) || [];
    if (generation !== sessionGeneration) return;
    update({ mine, mineLoaded: true, mineLoading: false });
    await loadRouting(mine.map((c) => c.id));
  } catch (err) {
    if (generation !== sessionGeneration) return;
    update({ mineLoaded: true, mineLoading: false, mineError: (err as Error).message || 'Failed to load complaints.' });
  }
}

async function loadRouting(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const generation = sessionGeneration;
  const routing = await auth.fetchRouting(ids);
  if (generation !== sessionGeneration) return;
  update({ routing: { ...state.routing, ...routing } });
}

export function setFilterText(filterText: string): void {
  update({ filterText });
}

export function setFilterStatus(filterStatus: string): void {
  update({ filterStatus });
}

/** The student's complaints after the filter box and status filter (was filterStudentComplaints). */
export function filteredComplaints(s: TrackerState): Complaint[] {
  const text = s.filterText.toLowerCase().trim();
  return s.mine.filter((c) => {
    if (s.filterStatus !== 'ALL' && c.status !== s.filterStatus) return false;
    if (!text) return true;
    const ai = s.routing[c.id]?.ai_category as Category | undefined; // the category students see is the AI one
    return [ticketRef(c.id), c.id, c.title, c.category, ai, ai && CATEGORY_LABELS[ai]].some((v) => (v || '').toLowerCase().includes(text));
  });
}

export async function searchFor(ticket: string): Promise<void> {
  const generation = sessionGeneration;
  const id = ticket.trim();
  if (!id) {
    update({ searchError: 'Please enter a valid Complaint ID.', result: null });
    return;
  }
  update({ searchError: null });
  try {
    const found = await auth.fetchComplaintById(id);
    if (generation !== sessionGeneration) return;
    if (found) {
      update({ result: found });
      loadRouting([found.id]);
      return;
    }
  } catch (e) {
    console.error('Database query error:', e);
  }
  update({ searchError: 'No complaint record found matching ID "' + id + '". Please check the reference ID and try again.', result: null });
}

export async function viewEvidenceFile(complaintId: string, publicId: string): Promise<void> {
  try {
    showToast('Requesting secure signed delivery link...', 'info');
    const res = await auth.getViewableEvidenceUrl(complaintId, publicId);
    if (res?.signedUrl) window.open(res.signedUrl, '_blank', 'noopener,noreferrer');
  } catch (err) {
    showToast((err as Error).message || 'Access denied to evidence file.', 'error');
  }
}

/** Reporter confirms a resolved complaint is fixed (closed) or reopens it with a note (PRD step 7). */
export async function confirmResolution(complaintId: string, action: 'confirm' | 'reopen', note = ''): Promise<boolean> {
  try {
    await auth.confirmComplaint(complaintId, action, note);
    showToast(action === 'confirm' ? 'Thanks: the complaint is now closed.' : 'Complaint reopened and sent back to the responsible post.', 'success');
    await loadStudentComplaints();
    return true;
  } catch (err) {
    showToast((err as Error).message || 'Failed.', 'error');
    return false;
  }
}
