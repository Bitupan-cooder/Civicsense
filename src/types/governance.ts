export type OfficialRole = 'dept_head' | 'president_gs' | 'admin';

export interface OfficialUser {
  id: string;
  name: string;
  email: string;
  role: OfficialRole;
  roleTitle: string;
  departmentId?: string; // e.g. 'sanitation', 'facilities', 'electrical', 'security'
  departmentName?: string;
  avatarBadge: string;
}

export type ComplaintStatus =
  | 'submitted'
  | 'analyzed'
  | 'routed'
  | 'investigating'
  | 'in_progress'
  | 'escalated'
  | 'resolved'
  | 'closed';

export type PriorityLevel = 'Immediate Hazard' | 'Urgent' | 'Normal' | 'Low';

export interface RouteMilestone {
  id: string;
  timestamp: number;
  stage: string;
  actor: string;
  role: string;
  note: string;
}

export interface OfficialReply {
  id: string;
  complaintId: string;
  author: string;
  role: string;
  message: string;
  timestamp: number;
  isInternal?: boolean;
}

export interface AIAnalysisResult {
  detectedCategory: string;
  categoryName: string;
  priority: PriorityLevel;
  summary: string;
  owningPost: string;
  officeId: string;
  slaHours: number;
  confidenceScore: number;
  keySignals: string[];
}

export interface Complaint {
  id: string; // e.g. "CS-8921"
  timestamp: number;
  title: string;
  description: string;
  location: string;
  category: string;
  categoryName: string;
  photoUrl?: string;
  studentName?: string;
  studentContact?: string;
  urgency: PriorityLevel;
  status: ComplaintStatus;
  aiAnalysis: AIAnalysisResult;
  routeHistory: RouteMilestone[];
  replies: OfficialReply[];
  escalation?: {
    isEscalated: boolean;
    escalatedAt: number;
    reason: string;
    escalatedBy: string;
  };
  mergedInto?: string;
  mergedDuplicates?: string[];
  resolvedAt?: number;
  resolutionNote?: string;
  language?: string;
}

export interface RoutingRule {
  categoryId: string;
  categoryName: string;
  owningPost: string;
  officeId: string;
  headName: string;
  headEmail: string;
  defaultSlaHours: number;
  escalationThresholdHours: number;
  keywords: string[];
}

