/** The parts of public/js/civic-auth.js (window.CivicAuth) that the student site uses. */
export interface CivicAuthApi {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getClient(): any;
  getProfile(): { role: string } | null;
  logout(): Promise<void>;
  loginStudent(email: string, password: string): Promise<{ profile: StudentProfile & { id: string } }>;
  signUpStudent(o: { name: string; email: string; password: string; file: File }): Promise<unknown>;
  reuploadIdCard(file: File): Promise<unknown>;
  fetchStudentComplaints(): Promise<Complaint[]>;
  fetchComplaintById(id: string): Promise<Complaint | null>;
  getViewableEvidenceUrl(complaintId: string, publicId: string): Promise<{ signedUrl?: string }>;
  fetchDepartmentUnits(): Promise<DepartmentUnit[]>;
  submitStudentComplaint(options: {
    title: string;
    description: string;
    visibility: string;
    targetUnitId: string | null;
    evidenceFiles: File[];
    location: string | null;
    hideName: boolean;
  }): Promise<{ id: string; analysis: Analysis | null; warning?: string }>;
}

export interface StudentProfile {
  id?: string;
  name: string;
  email: string;
  /** language complaint summaries and replies are shown in (column added by migration 001) */
  preferred_language?: 'en' | 'as';
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  visibility: string;
  status: string | null;
  created_at: string;
  complaint_evidence?: { cloudinary_public_id: string }[];
  complaint_status_history?: { status: string | null; remark: string | null; created_at: string }[];
}

export interface DepartmentUnit {
  id: string;
  name: string;
  unit_name: string | null;
  role: string;
}

/** One recipient of a complaint and its route tracker checkpoints. */
export interface ComplaintRoute {
  kind: 'primary' | 'copy' | 'escalation';
  post_title: string;
  person_name: string | null;
  delivered_at: string;
  seen_at: string | null;
  replied_at: string | null;
  resolved_at: string | null;
}

/** AI analysis and routing of a complaint (null fields until it has been analysed). */
export interface Routing {
  location_id: string | null;
  duplicate_of: string | null;
  possible_duplicate_of: string | null;
  hide_name_from_union: boolean;
  ai_category: string | null;
  priority: number | null;
  is_sensitive: boolean;
  location_text: string | null;
  summary_en: string | null;
  summary_as: string | null;
  image_findings: string | null;
  confidence: number | null;
  ai_source: string | null;
  human_edited: boolean;
  analysed_at: string | null;
  routes: ComplaintRoute[];
  replies: Reply[];
}

/** A reply (reporter can see it) or an internal note (officials only), stored in both languages when translated. */
export interface Reply {
  id: string;
  visibility: 'public' | 'internal';
  body_original: string;
  body_language: string | null;
  body_en: string | null;
  body_as: string | null;
  created_at: string;
  from: string;
}

export interface AppNotification {
  id: string;
  complaint_id: string | null;
  message_en: string;
  message_as: string | null;
  read: boolean;
  created_at: string;
}

/** What /api/complaints/analyse returns right after filing. */
export interface Analysis {
  category: string;
  priority: number;
  is_sensitive: boolean;
  location_text: string | null;
  summary_en: string;
  summary_as: string;
  confidence: number;
  source: string;
  needs_review: boolean;
  review_reason: string | null;
  routes: ComplaintRoute[];
}

/** GET /api/admin/stats */
export interface Stats {
  total: number;
  byStatus: Record<string, number>;
  byStatusAll: Record<string, number>;
  byUnit: Record<string, number>;
  byCategory: Record<string, number>;
  byLocation: Record<string, number>;
  byPriority: Record<string, number>;
  averageResolutionHours: number | null;
  resolvedCount: number;
  needsReview: number;
  possibleDuplicates: number;
  prdInstalled: boolean;
}

export interface DuplicateSide {
  id: string;
  title: string;
  description: string;
  summary_en: string | null;
  summary_as: string | null;
  ai_category: string | null;
  location_text: string | null;
  status: string;
  created_at: string;
}

/** GET /api/admin/duplicates */
export interface DuplicatePair {
  complaint: DuplicateSide & { possible_duplicate_of: string; duplicate_score: number | null };
  original: DuplicateSide | null;
  score: number | null;
}

export interface Authority {
  id: string;
  post_key: string;
  post_title: string;
  person_name: string | null;
  level: number;
  is_union: boolean;
  email: string | null;
  active: boolean;
}

export interface RoutingRule {
  category: string;
  primary_authority_id: string;
  copy_authority_ids: string[];
  escalate_to_id: string | null;
  response_hours: number;
  active: boolean;
}

/** GET / PUT /api/admin/routing */
export interface RoutingConfig {
  authorities: Authority[];
  rules: RoutingRule[];
  categories?: string[];
}

export interface RoutingApi {
  runMaintenance(): Promise<{ escalated: number }>;
  editAnalysis(complaintId: string, category: string, priority: number): Promise<void>;
  fetchFeatures(): Promise<{ routing: boolean; gemini: boolean }>;
  fetchStats(): Promise<Stats>;
  fetchDuplicates(): Promise<{ pairs: DuplicatePair[] }>;
  mergeComplaint(complaintId: string, intoId?: string | null): Promise<{ mergedInto: string }>;
  dismissDuplicate(complaintId: string): Promise<void>;
  fetchRoutingConfig(): Promise<RoutingConfig>;
  saveRoutingConfig(config: RoutingConfig): Promise<RoutingConfig>;
  analyseComplaint(complaintId: string, location: string | null, hideName?: boolean): Promise<Analysis | null>;
  postReply(complaintId: string, body: string, visibility: 'public' | 'internal'): Promise<{ translated: boolean }>;
  confirmComplaint(complaintId: string, action: 'confirm' | 'reopen', note?: string): Promise<{ status: string }>;
  fetchNotifications(): Promise<AppNotification[]>;
  markNotificationsRead(ids: string[]): Promise<void>;
  subscribeNotifications(userId: string, onInsert: (n: AppNotification) => void): () => void;
  setPreferredLanguage(userId: string, lang: 'en' | 'as'): Promise<void>;
  markComplaintSeen(complaintId: string): Promise<void>;
  routeComplaintByHand(complaintId: string, category: string): Promise<{ routes: ComplaintRoute[] }>;
  fetchRouting(complaintIds: string[]): Promise<Record<string, Routing>>;
}

export const routingApi = () => (window as unknown as { CivicAuth: RoutingApi }).CivicAuth;

export const civicAuth = () => (window as unknown as { CivicAuth: CivicAuthApi }).CivicAuth;
