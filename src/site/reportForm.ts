// State and actions of the complaint form. Shared by the form, the success card, the category cards
// (pre-filled examples) and the campus map (campusMap.js calls setReportPlace).
import { useSyncExternalStore } from 'react';
import { civicAuth, routingApi, type Analysis, type DepartmentUnit } from '../civicAuth';
import { loadStudentComplaints } from './tracker';
import { analyzeComplaint } from './analyzer.js';
import { focusMapOnLandmark } from './campusMap.js';
import { showToast } from '../toast';
import { openStudentAuth } from './studentSession';

export type Visibility = 'department' | 'administration' | 'social_service';
export type FocusField = 'fTitle' | 'fCategory' | 'fTargetUnit' | 'fDesc';

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
  category: string;
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

const EMPTY_FIELDS = { hideName: false, title: '', category: '', visibility: 'department' as Visibility, targetUnit: '', desc: '', location: '', customLoc: '', files: [] as File[] };

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
  // a landmark named in the text moves the map pin and selects that landmark
  if (analysis.location_id && focusMapOnLandmark(analysis.location_id) && state.location !== analysis.location_id) {
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

/** Picks a matching department for the chosen category if none is selected yet (was handleCategorySelect). */
export function setCategory(category: string): void {
  let targetUnit = state.targetUnit;
  if (category && state.units?.length && !targetUnit) {
    for (const u of state.units) {
      const name = (u.unit_name || u.name || '').toLowerCase();
      if ((category.includes('Water') && (name.includes('water') || name.includes('phe')))
        || (category.includes('Electrical') && name.includes('elect'))
        || (category.includes('Hostel') && name.includes('hostel'))
        || (category.includes('Network') && (name.includes('net') || name.includes('ccsa') || name.includes('it')))) {
        targetUnit = u.id;
        break;
      }
    }
  }
  update({ category, targetUnit });
}

export function setVisibility(visibility: Visibility): void {
  update({ visibility });
  if (visibility === 'department') loadDepartmentUnits();
}

export async function loadDepartmentUnits(): Promise<void> {
  if (state.units?.length) return;
  try {
    update({ units: (await civicAuth().fetchDepartmentUnits()) || [] });
  } catch (err) {
    console.error('Failed to load department units:', err);
  }
}

/** Example complaint from a category card (was testAIComplaint). */
export function fillReportDescription(text: string): void {
  setDescription(text);
  document.getElementById('report')?.scrollIntoView({ behavior: 'smooth' });
}

/** A place tapped on the campus map (was syncPlaceToForm). Same matching rule as before. */
export function setReportPlace(placeName: string): void {
  const name = placeName.toLowerCase();
  const match = LOCATION_OPTIONS.find(({ label }) => {
    const text = label.toLowerCase();
    return name.includes(text) || text.includes(name.slice(0, 10));
  });
  if (match) update({ location: match.value });
  else update({ location: 'OTHER', customLoc: placeName });
  analyse();
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
  update({ files: [...state.files, ...accepted] });
}

/** Camera photos skip the checks, as before. */
export function addCameraPhoto(files: FileList | null): void {
  if (files?.length) update({ files: [...state.files, files[0]] });
}

export function removeEvidenceFile(index: number): void {
  update({ files: state.files.filter((_, i) => i !== index) });
}

const VISIBILITY_TEXT: Record<Visibility, string> = {
  administration: 'Administration Only (confidential to Registrar / Proctorial Board)',
  department: 'Assigned Department and Central Administration',
  social_service: 'All Departments and DUSU Social Service Council',
};

/** Validates and submits (was submitReport). Returns the field to focus when validation fails. */
export async function submitReport(): Promise<FocusField | null> {
  update({ submitError: '' });
  const sb = civicAuth().getClient();
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

  if (!state.category) { update({ submitError: 'Please select an issue category.' }); return 'fCategory'; }

  const targetUnitId = state.visibility === 'department' ? state.targetUnit : null;
  if (state.visibility === 'department' && !targetUnitId) {
    update({ submitError: 'Please select the target university department.' });
    return 'fTargetUnit';
  }

  const desc = state.desc.trim();
  if (desc.length < 8) { update({ descError: true }); return 'fDesc'; }
  update({ descError: false, submitting: true });

  try {
    const complaint = await civicAuth().submitStudentComplaint({
      title, description: desc, category: state.category, visibility: state.visibility, targetUnitId, evidenceFiles: state.files,
    });
    // the landmark the reporter picked goes to the AI as a hint and is stored with the complaint
    const place = state.location === 'OTHER' ? state.customLoc.trim() : (LOCATION_OPTIONS.find((o) => o.value === state.location && o.value)?.label ?? '');
    update({
      success: {
        analysis: 'pending',
        ticket: 'CS-' + complaint.id.slice(0, 8).toUpperCase(),
        summary: 'Your grievance "' + title + '" has been registered in the database with visibility set to: ' + VISIBILITY_TEXT[state.visibility] + '. Permanent status tracking is active.',
      },
      files: [],
    });
    showToast('Complaint submitted with status: Submitted', 'success');
    loadStudentComplaints(); // refresh the tracker in the background
    const hideName = state.hideName;
    routingApi().analyseComplaint(complaint.id, place || null, hideName).then((analysis) => {
      if (state.success) update({ success: { ...state.success, analysis } });
      if (analysis) loadStudentComplaints();
    });
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
