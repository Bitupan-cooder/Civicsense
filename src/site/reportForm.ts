// State and actions of the complaint form. Shared by the form, the success card and the category cards.
import { useSyncExternalStore } from 'react';
import type { Analysis, DepartmentUnit } from '../civicAuth';
import * as auth from '../civicAuth';
import { loadStudentComplaints } from './tracker';
import { analyzeComplaint } from './analyzer.js';
import { showToast } from '../toast';
import { openStudentAuth } from './studentSession';

export type Visibility = 'department' | 'administration' | 'social_service';
export type FocusField = 'fTitle' | 'fTargetUnit' | 'fDesc';

export const LOCATION_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'Auto-Detect from complaint text' },
  { value: 'du_hostel_1', label: 'Padmanath Gohain Baruah Chatra Nivas (Hostel 1)' },
  { value: 'du_hostel_2', label: 'Maniram Dewan Chatra Nivas (Hostel 2)' },
  { value: 'du_hostel_girls_1', label: 'Joymoti Chatri Nivas (Girls Hostel 1)' },
  { value: 'du_hostel_girls_2', label: 'Nalini Bala Devi Chatri Nivas (Girls Hostel 2)' },
  { value: 'du_library', label: 'Lakshminath Bezbaroa Central Library' },
  { value: 'du_ccsa', label: 'Centre for Computer Science & Applications (CCSA)' },
  { value: 'du_admin', label: 'Administrative Building & Registrar Office' },
  { value: 'du_canteen', label: 'Central Canteen & Student Activity Centre' },
  { value: 'du_sports_ground', label: 'University Sports Ground & Pavilion' },
  { value: 'du_science_quad', label: 'Science Block & Academic Quad' },
  { value: 'OTHER', label: 'Other (specify below)' },
];

export interface ReportFormState {
  title: string;
  visibility: Visibility;
  targetUnit: string;
  desc: string;
  location: string;
  customLoc: string;
  files: File[];
  /** PRD privacy choice: union posts see the complaint but not who filed it */
  hideName: boolean;
  /** Detected language label; null until the first analysis (shows the placeholder). */
  language: string | null;
  /** null while the department list is still loading. */
  units: DepartmentUnit[] | null;
  titleError: boolean;
  descError: boolean;
  submitError: string;
  submitting: boolean;
  /** analysis: 'pending' while the AI files it, null when unavailable (migration not run or the call failed) */
  success: { ticket: string; summary: string; analysis: Analysis | 'pending' | null } | null;
  /** Bumped on reset so the file inputs are recreated empty, like form.reset() did. */
  resetCount: number;
}

const EMPTY_FIELDS = { hideName: false, title: '', visibility: 'department' as Visibility, targetUnit: '', desc: '', location: '', customLoc: '', files: [] as File[] };

let state: ReportFormState = {
  ...EMPTY_FIELDS, language: null, units: null, titleError: false, descError: false, submitError: '', submitting: false, success: null, resetCount: 0,
};
const listeners = new Set<() => void>();

function update(patch: Partial<ReportFormState>): void {
  state = { ...state, ...patch };
  listeners.forEach((notify) => notify());
}

export function useReportForm(): ReportFormState {
  return useSyncExternalStore(
    (notify) => { listeners.add(notify); return () => { listeners.delete(notify); }; },
    () => state,
  );
}

const LANGUAGE_LABELS: Record<string, string> = { as: 'অসমীয়া লিপি (Assamese)', mixed: 'Mixed / Romanised Assamese' };

/** Language + landmark detection on the description (was updateAI in the original page script). */
function analyse(): void {
  const loc = state.location === 'OTHER' ? state.customLoc : state.location;
  const analysis = analyzeComplaint(state.desc, null, loc, 'en');
  const patch: Partial<ReportFormState> = { language: LANGUAGE_LABELS[analysis.language] ?? 'English (en)' };
  // Select a landmark when the report text identifies one.
  if (analysis.location_id && state.location !== analysis.location_id) {
    patch.location = analysis.location_id;
  }
  update(patch);
}

export function setField(field: 'title' | 'targetUnit', value: string): void {
  update({ [field]: value });
}

export function setHideName(hideName: boolean): void {
  update({ hideName });
}

export function setDescription(desc: string): void {
  update({ desc });
  analyse();
}

export function setLocation(location: string): void {
  update({ location });
  analyse();
}

export function setCustomLocation(customLoc: string): void {
  update({ customLoc });
  analyse();
}

export function setVisibility(visibility: Visibility): void {
  update({ visibility });
  if (visibility === 'department') loadDepartmentUnits();
}

export async function loadDepartmentUnits(): Promise<void> {
  if (state.units?.length) return;
  try {
    update({ units: (await auth.fetchDepartmentUnits()) || [] });
  } catch (err) {
    console.error('Failed to load department units:', err);
  }
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function addEvidenceFiles(files: FileList | null): void {
  if (!files?.length) return;
  const accepted = [...files].filter((f) => {
    if (f.size > MAX_FILE_SIZE) {
      showToast('File "' + f.name + '" exceeds the 5 MB limit.', 'error');
      return false;
    }
    if (!ALLOWED_TYPES.includes(f.type) && !/\.(jpg|jpeg|png|webp|pdf)$/i.test(f.name)) {
      showToast('File "' + f.name + '" is not an accepted format (JPG, PNG, WEBP, PDF only).', 'error');
      return false;
    }
    return true;
  });
  if (state.files.length + accepted.length > 5) showToast('Attach up to five files per complaint.', 'info');
  update({ files: [...state.files, ...accepted].slice(0, 5) });
}

/** Camera photos skip the checks, as before. */
export function addCameraPhoto(files: FileList | null): void {
  addEvidenceFiles(files);
}

export function removeEvidenceFile(index: number): void {
  update({ files: state.files.filter((_, i) => i !== index) });
}

/** Validates and submits (was submitReport). Returns the field to focus when validation fails. */
export async function submitReport(): Promise<FocusField | null> {
  update({ submitError: '' });
  const sb = auth.getClient();
  const session = sb ? (await sb.auth.getSession()).data.session : null;
  if (!session?.user) {
    update({ submitError: 'You must be signed in with your student account to register and track a grievance.' });
    openStudentAuth();
    showToast('Please sign in or register with your student ID to submit complaints.', 'info');
    return null;
  }

  const title = state.title.trim();
  if (title.length < 5) { update({ titleError: true }); return 'fTitle'; }
  update({ titleError: false });

  const targetUnitId = state.visibility === 'department' ? state.targetUnit : null;
  const desc = state.desc.trim();
  if (desc.length < 8) { update({ descError: true }); return 'fDesc'; }
  update({ descError: false, submitting: true });

  try {
    const place = state.location === 'OTHER' ? state.customLoc.trim() : state.location;
    const complaint = await auth.submitStudentComplaint({
      title, description: desc, visibility: state.visibility, targetUnitId, evidenceFiles: state.files,
      location: place || null, hideName: state.hideName,
    });
    update({
      success: {
        analysis: complaint.analysis,
        ticket: 'CS-' + complaint.id.slice(0, 8).toUpperCase(),
        summary: complaint.warning || 'Your grievance "' + title + '" has been saved. Only administration and the responsible routed posts can access it.',
      },
      files: [],
    });
    showToast(complaint.warning ? 'Complaint saved for administration review.' : 'Complaint saved and analysed.', 'success');
    loadStudentComplaints(); // refresh the tracker in the background
  } catch (err) {
    update({ submitError: (err as Error).message || 'Failed to submit complaint.' });
  } finally {
    update({ submitting: false });
  }
  return null;
}

/** "File Another" (was resetForm). Like form.reset(), error messages are left as they are. */
export function resetReportForm(): void {
  update({ ...EMPTY_FIELDS, success: null, resetCount: state.resetCount + 1 });
  loadDepartmentUnits();
  analyse();
}

export function clearReportSuccess(): void {
  if (state.success) update({ success: null });
}

/** Startup, at the moment the old page script did it: first analysis now, department list once the page has loaded. */
export function initReportForm(): void {
  analyse();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => loadDepartmentUnits());
  else loadDepartmentUnits();
}
