// State and actions of the complaint tracker modal ("My Complaints" and "Track by Complaint ID").
import { useSyncExternalStore } from 'react';
import { civicAuth, routingApi, type Complaint, type Routing } from '../civicAuth';
import { showToast } from '../toast';
import { resolveLocationId } from '../locations';
import { isStudentSignedIn } from './studentSession';

export type TrackerMode = 'my_complaints' | 'track_single';

export interface TrackerState {
  open: boolean;
  mode: TrackerMode;
  /** Demo IDs from the page's local sample data, shown as chips under the search. */
  demoIds: string[];
  query: string;
  searchError: string | null;
  result: Complaint | null;
  mine: Complaint[];
  /** false until the student's complaints have been loaded once (nothing is shown before). */
  mineLoaded: boolean;
  mineLoading: boolean;
  mineError: string | null;
  filterText: string;
  filterStatus: string;
  /** Complaint cards whose details drawer is open. */
  expanded: string[];
  /** AI analysis and route tracker per complaint id (empty until migration 001 is run). */
  routing: Record<string, Routing>;
}

let state: TrackerState = {
  open: false, mode: 'my_complaints', demoIds: [], query: '', searchError: null, result: null,
  mine: [], mineLoaded: false, mineLoading: false, mineError: null, filterText: '', filterStatus: 'ALL', expanded: [], routing: {},
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

function demoIds(): string[] {
  return state.mine.slice(0, 4).map((c) => 'CS-' + c.id.slice(0, 8).toUpperCase());
}

export function clearTrackerSession(): void {
  sessionGeneration++;
  update({ mine: [], routing: {}, result: null, demoIds: [], mineLoaded: false, mineLoading: false, mineError: null });
}

/** The public landing map shows only reports already visible to the signed-in student. */
export function getMapComplaints() {
  return state.mine.map((c) => ({ ...c, location_id: resolveLocationId(state.routing[c.id]?.location_id),
    urgency: state.routing[c.id]?.priority === 1 ? 'Urgent' : state.routing[c.id]?.priority === 2 ? 'High' : 'Normal',
  }));
}

export function openTracker(): void {
  const view = isStudentSignedIn() ? 'mine' : 'track';
  window.location.assign(`/login?view=${view}#report-tracker`);
}

export function closeTracker(): void {
  update({ open: false });
}

export function switchTrackerMode(mode: TrackerMode): void {
  update({ mode });
}

export function openTrackerWithId(id: string | null | undefined): void {
  if (!id?.trim()) { openTracker(); return; }
  window.location.assign(`/login?track=${encodeURIComponent(id.trim())}#report-tracker`);
}

export async function loadStudentComplaints(): Promise<void> {
  const generation = sessionGeneration;
  update({ mineLoading: true, mineError: null, expanded: [] });
  try {
    const mine = (await civicAuth().fetchStudentComplaints()) || [];
    if (generation !== sessionGeneration) return;
    update({ mine, mineLoaded: true, mineLoading: false, demoIds: mine.slice(0, 4).map((c) => 'CS-' + c.id.slice(0, 8).toUpperCase()) });
    await loadRouting(mine.map((c) => c.id));
  } catch (err) {
    if (generation !== sessionGeneration) return;
    update({ mineLoaded: true, mineLoading: false, mineError: (err as Error).message || 'Failed to load complaints.' });
  }
}

async function loadRouting(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const generation = sessionGeneration;
  const routing = await routingApi().fetchRouting(ids);
  if (generation !== sessionGeneration) return;
  update({ routing: { ...state.routing, ...routing } });
}

export function setFilterText(filterText: string): void {
  update({ filterText, expanded: [] });
}

export function setFilterStatus(filterStatus: string): void {
  update({ filterStatus, expanded: [] });
}

/** The student's complaints after the filter box and status filter (was filterStudentComplaints). */
export function filteredComplaints(s: TrackerState): Complaint[] {
  const text = s.filterText.toLowerCase().trim();
  return s.mine.filter((c) => {
    if (s.filterStatus !== 'ALL' && c.status !== s.filterStatus) return false;
    if (!text) return true;
    return c.id.toLowerCase().includes(text) || (c.title || '').toLowerCase().includes(text) || (c.category || '').toLowerCase().includes(text);
  });
}

export function toggleComplaintDetail(id: string): void {
  update({ expanded: state.expanded.includes(id) ? state.expanded.filter((x) => x !== id) : [...state.expanded, id] });
}

export function setTrackerQuery(query: string): void {
  update({ query });
}

export function searchFor(id: string): void {
  update({ query: id });
  searchComplaint();
}

export async function searchComplaint(): Promise<void> {
  const generation = sessionGeneration;
  const id = state.query.trim();
  if (!id) {
    update({ searchError: 'Please enter a valid Complaint ID.', result: null });
    return;
  }
  update({ searchError: null });
  try {
    const found = await civicAuth().fetchComplaintById(id);
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
    const res = await civicAuth().getViewableEvidenceUrl(complaintId, publicId);
    if (res?.signedUrl) window.open(res.signedUrl, '_blank', 'noopener,noreferrer');
  } catch (err) {
    showToast((err as Error).message || 'Access denied to evidence file.', 'error');
  }
}

/** Startup (was buildDemoIds at load and the ?track= handler on DOMContentLoaded). */
export function initTracker(): void {
  update({ demoIds: demoIds() });
  const openFromUrl = () => {
    const trackId = new URLSearchParams(window.location.search).get('track');
    if (trackId) setTimeout(() => openTrackerWithId(trackId), 250);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', openFromUrl);
  else openFromUrl();
}

/** Reporter confirms a resolved complaint is fixed (closed) or reopens it with a note (PRD step 7). */
export async function confirmResolution(complaintId: string, action: 'confirm' | 'reopen', note = ''): Promise<boolean> {
  try {
    await routingApi().confirmComplaint(complaintId, action, note);
    showToast(action === 'confirm' ? 'Thanks: the complaint is now closed.' : 'Complaint reopened and sent back to the responsible post.', 'success');
    await loadStudentComplaints();
    return true;
  } catch (err) {
    showToast((err as Error).message || 'Failed.', 'error');
    return false;
  }
}
