import {
  Complaint,
  OfficialUser,
  OfficialRole,
  ComplaintStatus,
  PriorityLevel,
  AIAnalysisResult,
  RoutingRule,
  OfficialReply,
} from '@/types/governance';

// -------------------------------------------------------------
// 1. DEFAULT OFFICIAL USERS (For Demo & Password Check)
// -------------------------------------------------------------
export const PRESET_OFFICIALS: OfficialUser[] = [
  {
    id: 'off_sanitation',
    name: 'Dr. Mukul Barua',
    email: 'dept.sanitation@campus.edu',
    role: 'dept_head',
    roleTitle: 'Head, Estates & Sanitation Operations',
    departmentId: 'waste',
    departmentName: 'Clean Campus & Sanitation Desk',
    avatarBadge: 'ESTATES',
  },
  {
    id: 'off_electrical',
    name: 'Er. Deepshikha Kalita',
    email: 'dept.electrical@campus.edu',
    role: 'dept_head',
    roleTitle: 'Chief Engineer, Electrical & Power Maintenance',
    departmentId: 'power',
    departmentName: 'Power & Infrastructure Desk',
    avatarBadge: 'POWER',
  },
  {
    id: 'off_water',
    name: 'Shri Biren Gogoi',
    email: 'dept.water@campus.edu',
    role: 'dept_head',
    roleTitle: 'Officer in Charge, Water & Facilities Depot',
    departmentId: 'water',
    departmentName: 'Water & Facilities Depot',
    avatarBadge: 'WATER',
  },
  {
    id: 'off_president',
    name: 'Anupam Saikia',
    email: 'president.union@campus.edu',
    role: 'president_gs',
    roleTitle: 'President / General Secretary, Student Executive Council',
    avatarBadge: 'PRESIDENT',
  },
  {
    id: 'off_superadmin',
    name: 'Prof. Hemanga Sharma',
    email: 'superadmin.gov@campus.edu',
    role: 'admin',
    roleTitle: 'University Registrar & Chief Redressal Ombudsman',
    avatarBadge: 'OMBUDSMAN',
  },
];

// -------------------------------------------------------------
// 2. ROUTING RULES & OWNING POSTS (As per Diagram)
// -------------------------------------------------------------
export const DEFAULT_ROUTING_RULES: RoutingRule[] = [
  {
    categoryId: 'waste',
    categoryName: 'Clean Campus & Sorting',
    owningPost: 'Estates & Sanitation Operations Desk',
    officeId: 'sanitation',
    headName: 'Dr. Mukul Barua',
    headEmail: 'dept.sanitation@campus.edu',
    defaultSlaHours: 12,
    escalationThresholdHours: 24,
    keywords: ['dustbin', 'garbage', 'trash', 'waste', 'recycling', 'litter', 'smell', 'plastic', 'dump'],
  },
  {
    categoryId: 'water',
    categoryName: 'Green Grounds & Water Systems',
    owningPost: 'Horticulture & Water Engineering Bay',
    officeId: 'facilities',
    headName: 'Shri Biren Gogoi',
    headEmail: 'dept.water@campus.edu',
    defaultSlaHours: 18,
    escalationThresholdHours: 36,
    keywords: ['water', 'tap', 'leak', 'pipe', 'pipeline', 'drainage', 'toilet', 'flush', 'plumbing', 'sprinkler', 'sapling'],
  },
  {
    categoryId: 'power',
    categoryName: 'Campus Power & Pathway Lighting',
    owningPost: 'Electrical Maintenance & Substation Desk',
    officeId: 'electrical',
    headName: 'Er. Deepshikha Kalita',
    headEmail: 'dept.electrical@campus.edu',
    defaultSlaHours: 8,
    escalationThresholdHours: 16,
    keywords: ['light', 'dark', 'pathway', 'street light', 'power', 'socket', 'wire', 'spark', 'breaker', 'fan', 'ac'],
  },
  {
    categoryId: 'safety',
    categoryName: 'Proctorial & Student Welfare',
    owningPost: 'Proctorial Command & Campus Security House',
    officeId: 'security',
    headName: 'Col. Ranjit Dutta',
    headEmail: 'safety-control@campus.edu',
    defaultSlaHours: 4,
    escalationThresholdHours: 8,
    keywords: ['safety', 'security', 'guard', 'gate', 'stray dog', 'harassment', 'cctv', 'theft', 'locked', 'emergency'],
  },
  {
    categoryId: 'hostel',
    categoryName: 'Hostel & Residential Welfare',
    owningPost: 'Chief Warden & Housing Redressal Box',
    officeId: 'hostels',
    headName: 'Dr. Pranab Bora',
    headEmail: 'hostel-warden@campus.edu',
    defaultSlaHours: 24,
    escalationThresholdHours: 48,
    keywords: ['hostel', 'room', 'mess', 'food', 'geyser', 'bed', 'warden', 'curfew', 'dining', 'laundry'],
  },
  {
    categoryId: 'wifi',
    categoryName: 'Campus IT & Digital Connectivity',
    owningPost: 'Central IT Network Operations Centre',
    officeId: 'it-network',
    headName: 'Mr. Devabrata Hazarika',
    headEmail: 'network-helpdesk@campus.edu',
    defaultSlaHours: 24,
    escalationThresholdHours: 48,
    keywords: ['wifi', 'wi-fi', 'internet', 'network', 'router', 'portal', 'server', 'lan', 'ethernet'],
  },
];

// -------------------------------------------------------------
// 3. AI ANALYSIS & ROUTING SIMULATOR
// -------------------------------------------------------------
export function runAIAnalysis(description: string, selectedCatId?: string): AIAnalysisResult {
  const text = description.toLowerCase();

  // Keyword score match across rules
  let bestRule = DEFAULT_ROUTING_RULES[0];
  let maxScore = -1;
  const matchedKeywords: string[] = [];

  for (const rule of DEFAULT_ROUTING_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (text.includes(kw)) {
        score += 1;
        if (!matchedKeywords.includes(kw)) matchedKeywords.push(kw);
      }
    }
    // Boost if user explicitly clicked this category
    if (selectedCatId && rule.categoryId === selectedCatId) {
      score += 2;
    }
    if (score > maxScore) {
      maxScore = score;
      bestRule = rule;
    }
  }

  // Determine priority
  let priority: PriorityLevel = 'Normal';
  if (text.includes('spark') || text.includes('fire') || text.includes('shock') || text.includes('emergency') || text.includes('hazard')) {
    priority = 'Immediate Hazard';
  } else if (text.includes('urgent') || text.includes('dark') || text.includes('overflow') || text.includes('broken tap') || text.includes('leak')) {
    priority = 'Urgent';
  } else if (text.includes('slow') || text.includes('dust') || text.includes('routine')) {
    priority = 'Low';
  }

  // Build clean summary
  const cleanSnippet = description.trim().slice(0, 100);
  const summary = `AI detected ${bestRule.categoryName} concern requiring direct field assignment to ${bestRule.owningPost}. Context: "${cleanSnippet}${cleanSnippet.length >= 100 ? '...' : ''}"`;

  return {
    detectedCategory: bestRule.categoryId,
    categoryName: bestRule.categoryName,
    priority,
    summary,
    owningPost: bestRule.owningPost,
    officeId: bestRule.officeId,
    slaHours: bestRule.defaultSlaHours,
    confidenceScore: maxScore > 0 ? 0.94 : 0.82,
    keySignals: matchedKeywords.length > 0 ? matchedKeywords.slice(0, 4) : ['text_context', 'location_proximity'],
  };
}

// -------------------------------------------------------------
// 4. SEED COMPLAINTS (Realistic Campus Cases across All Modes)
// -------------------------------------------------------------
const SEED_COMPLAINTS: Complaint[] = [
  {
    id: 'CS-8921',
    timestamp: Date.now() - 1000 * 60 * 60 * 14, // 14 hrs ago
    title: 'High pressure water pipeline rupture near Science Quad',
    description: 'Irrigation pipe burst along pathway leading from Chemistry building to central lawn. Water pooling across footpath and flooding lawn saplings.',
    location: 'Science Quad, Lawn Pathway behind Chem Annex',
    category: 'water',
    categoryName: 'Green Grounds & Water Systems',
    urgency: 'Urgent',
    status: 'in_progress',
    studentName: 'Priyanka Das',
    studentContact: 'priyanka.d@campus.edu',
    language: 'en',
    aiAnalysis: {
      detectedCategory: 'water',
      categoryName: 'Green Grounds & Water Systems',
      priority: 'Urgent',
      summary: 'High priority water pipe rupture causing flooding. Assigned to Water & Facilities Depot.',
      owningPost: 'Horticulture & Water Engineering Bay',
      officeId: 'facilities',
      slaHours: 18,
      confidenceScore: 0.96,
      keySignals: ['pipe', 'leak', 'water', 'flooding'],
    },
    routeHistory: [
      {
        id: 'm1',
        timestamp: Date.now() - 1000 * 60 * 60 * 14,
        stage: 'Report Submitted',
        actor: 'Priyanka Das (Student)',
        role: 'Citizen',
        note: 'Report lodged with campus location tag.',
      },
      {
        id: 'm2',
        timestamp: Date.now() - 1000 * 60 * 60 * 13.8,
        stage: 'AI Analysis & Auto-Route',
        actor: 'CivicSense Neural Dispatch',
        role: 'AI Engine',
        note: 'Priority flagged as Urgent (SLA 18h). Routed directly to Horticulture & Water Engineering Bay.',
      },
      {
        id: 'm3',
        timestamp: Date.now() - 1000 * 60 * 60 * 8,
        stage: 'Owning Desk Acknowledged',
        actor: 'Shri Biren Gogoi',
        role: 'Officer in Charge',
        note: 'Plumbing field crew dispatched with replacement coupling joint.',
      },
    ],
    replies: [
      {
        id: 'r1',
        complaintId: 'CS-8921',
        author: 'Shri Biren Gogoi (Water Dept)',
        role: 'Department Head',
        message: 'Main line shutoff isolated at 09:30 AM. Plumbers are fitting a PVC sleeve now. Pressure will be restored by 03:00 PM.',
        timestamp: Date.now() - 1000 * 60 * 60 * 7,
      },
    ],
  },
  {
    id: 'CS-8922',
    timestamp: Date.now() - 1000 * 60 * 60 * 28, // 28 hrs ago
    title: 'Pathway streetlight dark behind Girls Hostel Block 3',
    description: 'Two consecutive lampposts completely dead on pedestrian lane from Block 3 to Library. Area pitch black after 07:00 PM, creating serious safety hazard.',
    location: 'Girls Hostel Block 3 Rear Lane to Central Library',
    category: 'power',
    categoryName: 'Campus Power & Pathway Lighting',
    urgency: 'Immediate Hazard',
    status: 'escalated',
    studentName: 'Ritu Borah',
    studentContact: 'ritu.b@campus.edu',
    language: 'en',
    aiAnalysis: {
      detectedCategory: 'power',
      categoryName: 'Campus Power & Pathway Lighting',
      priority: 'Immediate Hazard',
      summary: 'High vulnerability pathway darkness flagged behind residential hostel. SLA threshold breached.',
      owningPost: 'Electrical Maintenance & Substation Desk',
      officeId: 'electrical',
      slaHours: 8,
      confidenceScore: 0.98,
      keySignals: ['dark', 'street light', 'safety', 'lane'],
    },
    routeHistory: [
      {
        id: 'm21',
        timestamp: Date.now() - 1000 * 60 * 60 * 28,
        stage: 'Report Lodged',
        actor: 'Ritu Borah (Resident Student)',
        role: 'Citizen',
        note: 'Complaint lodged regarding dark pathway.',
      },
      {
        id: 'm22',
        timestamp: Date.now() - 1000 * 60 * 60 * 27.9,
        stage: 'AI Auto-Route',
        actor: 'CivicSense Neural Dispatch',
        role: 'AI Engine',
        note: 'Classified as Immediate Hazard. Dispatched to Electrical Maintenance Desk with 8h SLA target.',
      },
      {
        id: 'm23',
        timestamp: Date.now() - 1000 * 60 * 60 * 12,
        stage: 'Escalated to President / GS',
        actor: 'Er. Deepshikha Kalita',
        role: 'Dept Head (Electrical)',
        note: 'Escalated: Fixture control ballast damaged; purchase order awaiting finance dean clearance.',
      },
    ],
    replies: [
      {
        id: 'r21',
        complaintId: 'CS-8922',
        author: 'Er. Deepshikha Kalita (Electrical)',
        role: 'Department Head',
        message: 'Underground wiring checked; fixture head ballast burned out. Requisition filed under emergency spares.',
        timestamp: Date.now() - 1000 * 60 * 60 * 14,
      },
      {
        id: 'r22',
        complaintId: 'CS-8922',
        author: 'Anupam Saikia (President / GS)',
        role: 'Student Executive',
        message: 'ESCALATION INTERVENTION: Met Dean of Students this morning. Emergency cash float authorized. Electricians installing floodlight by 5 PM today.',
        timestamp: Date.now() - 1000 * 60 * 60 * 3,
      },
    ],
    escalation: {
      isEscalated: true,
      escalatedAt: Date.now() - 1000 * 60 * 60 * 12,
      reason: 'Awaiting finance clearance for high-lumen commercial ballasts; SLA exceeded by 20 hours.',
      escalatedBy: 'Er. Deepshikha Kalita (Dept Head)',
    },
  },
  {
    id: 'CS-8923',
    timestamp: Date.now() - 1000 * 60 * 60 * 6,
    title: 'Recycling bin overflowing outside Central Canteen',
    description: 'Dry waste and cardboard bins outside Student Activity Centre spilling onto sidewalk. Need additional sorting bins before lunch crowd.',
    location: 'Central Canteen Patio, West Entry',
    category: 'waste',
    categoryName: 'Clean Campus & Sorting',
    urgency: 'Normal',
    status: 'resolved',
    studentName: 'Bikash Medhi',
    studentContact: 'bikash.m@campus.edu',
    language: 'en',
    aiAnalysis: {
      detectedCategory: 'waste',
      categoryName: 'Clean Campus & Sorting',
      priority: 'Normal',
      summary: 'Overflowing collection bins at high-traffic cafeteria area.',
      owningPost: 'Estates & Sanitation Operations Desk',
      officeId: 'sanitation',
      slaHours: 12,
      confidenceScore: 0.95,
      keySignals: ['recycling', 'garbage', 'bin', 'canteen'],
    },
    routeHistory: [
      {
        id: 'm31',
        timestamp: Date.now() - 1000 * 60 * 60 * 6,
        stage: 'Report Submitted',
        actor: 'Bikash Medhi',
        role: 'Citizen',
        note: 'Report logged with photo.',
      },
      {
        id: 'm32',
        timestamp: Date.now() - 1000 * 60 * 60 * 5.9,
        stage: 'AI Auto-Route',
        actor: 'CivicSense Neural Dispatch',
        role: 'AI Engine',
        note: 'Dispatched to Estates & Sanitation Desk.',
      },
      {
        id: 'm33',
        timestamp: Date.now() - 1000 * 60 * 60 * 2,
        stage: 'Resolved',
        actor: 'Dr. Mukul Barua',
        role: 'Head, Estates & Sanitation',
        note: 'Bins cleared and two extra 120L sorting drums placed for weekend festival.',
      },
    ],
    replies: [
      {
        id: 'r31',
        complaintId: 'CS-8923',
        author: 'Dr. Mukul Barua (Sanitation)',
        role: 'Department Head',
        message: 'Resolved! Morning collection team cleared the patio and placed dedicated beverage cup containers.',
        timestamp: Date.now() - 1000 * 60 * 60 * 2,
      },
    ],
    resolvedAt: Date.now() - 1000 * 60 * 60 * 2,
    resolutionNote: 'Sanitation quad crew cleared overflow and deployed high-capacity sorting barrels.',
  },
  {
    id: 'CS-8924',
    timestamp: Date.now() - 1000 * 60 * 60 * 4,
    title: 'Wi-Fi AP dropped in 2nd floor Silent Study Area',
    description: 'Eduroam router AP-LIB-204 blinking red; zero signal in reading hall. Students studying for mid-term exams unable to access journals.',
    location: 'Central Library, 2nd Floor North Silent Wing',
    category: 'wifi',
    categoryName: 'Campus IT & Digital Connectivity',
    urgency: 'Normal',
    status: 'investigating',
    studentName: 'Kabir Ahmed',
    studentContact: 'kabir.a@campus.edu',
    language: 'en',
    aiAnalysis: {
      detectedCategory: 'wifi',
      categoryName: 'Campus IT & Digital Connectivity',
      priority: 'Normal',
      summary: 'Access point offline in exam study wing. Routed to IT NOC.',
      owningPost: 'Central IT Network Operations Centre',
      officeId: 'it-network',
      slaHours: 24,
      confidenceScore: 0.97,
      keySignals: ['wifi', 'router', 'network', 'reading hall'],
    },
    routeHistory: [
      {
        id: 'm41',
        timestamp: Date.now() - 1000 * 60 * 60 * 4,
        stage: 'Report Lodged',
        actor: 'Kabir Ahmed',
        role: 'Citizen',
        note: 'Report submitted via CivicSense web portal.',
      },
      {
        id: 'm42',
        timestamp: Date.now() - 1000 * 60 * 60 * 3.9,
        stage: 'AI Analysis & Auto-Route',
        actor: 'CivicSense Neural Dispatch',
        role: 'AI Engine',
        note: 'Identified IT switch issue. Assigned to Network Operations Desk.',
      },
    ],
    replies: [
      {
        id: 'r41',
        complaintId: 'CS-8924',
        author: 'Mr. Devabrata Hazarika (IT)',
        role: 'Department Head',
        message: 'PoE port reset remotely; investigating recurring switch reboot in rack 2.',
        timestamp: Date.now() - 1000 * 60 * 60 * 1,
      },
    ],
  },
  {
    id: 'CS-8925',
    timestamp: Date.now() - 1000 * 60 * 60 * 2,
    title: 'Duplicate: Leakage from irrigation line near Chemistry annex',
    description: 'Water leaking heavily near the science quad garden path.',
    location: 'Science Quad near Chemistry',
    category: 'water',
    categoryName: 'Green Grounds & Water Systems',
    urgency: 'Urgent',
    status: 'submitted',
    studentName: 'Dipankar Sharma',
    studentContact: 'dipankar.s@campus.edu',
    language: 'en',
    aiAnalysis: {
      detectedCategory: 'water',
      categoryName: 'Green Grounds & Water Systems',
      priority: 'Urgent',
      summary: 'Likely duplicate of CS-8921 (Science Quad irrigation leak). Candidate for admin merge.',
      owningPost: 'Horticulture & Water Engineering Bay',
      officeId: 'facilities',
      slaHours: 18,
      confidenceScore: 0.93,
      keySignals: ['water', 'leak', 'science quad'],
    },
    routeHistory: [
      {
        id: 'm51',
        timestamp: Date.now() - 1000 * 60 * 60 * 2,
        stage: 'Report Submitted',
        actor: 'Dipankar Sharma',
        role: 'Citizen',
        note: 'Report lodged.',
      },
    ],
    replies: [],
  },
];

// -------------------------------------------------------------
// 5. STORAGE & STATE MANAGEMENT
// -------------------------------------------------------------
const STORAGE_COMPLAINTS_KEY = 'civicsense_complaints_v3';
const STORAGE_USER_KEY = 'civicsense_active_official_v3';
const STORAGE_LANG_KEY = 'civicsense_preferred_lang_v3';

export function getAllComplaints(): Complaint[] {
  if (typeof window === 'undefined') return SEED_COMPLAINTS;
  try {
    const raw = localStorage.getItem(STORAGE_COMPLAINTS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_COMPLAINTS_KEY, JSON.stringify(SEED_COMPLAINTS));
      return SEED_COMPLAINTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_COMPLAINTS;
  } catch {
    return SEED_COMPLAINTS;
  }
}

export function saveComplaints(complaints: Complaint[]): void {
  try {
    localStorage.setItem(STORAGE_COMPLAINTS_KEY, JSON.stringify(complaints));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('civicsense_complaints_updated'));
    }
  } catch (e) {
    console.error('Error saving complaints', e);
  }
}

export function getComplaintById(id: string): Complaint | undefined {
  const all = getAllComplaints();
  const search = id.trim().toUpperCase().replace('#', '');
  return all.find((c) => c.id.toUpperCase().replace('#', '') === search);
}

export function createComplaint(data: {
  title?: string;
  description: string;
  location: string;
  category?: string;
  studentName?: string;
  studentContact?: string;
  photoUrl?: string;
  urgency?: PriorityLevel;
}): Complaint {
  const all = getAllComplaints();
  const newNum = 8920 + all.length + 1;
  const id = `CS-${newNum}`;

  const aiAnalysis = runAIAnalysis(data.description, data.category);

  const newComplaint: Complaint = {
    id,
    timestamp: Date.now(),
    title: data.title?.trim() || `${aiAnalysis.categoryName} at ${data.location}`,
    description: data.description.trim(),
    location: data.location.trim(),
    category: aiAnalysis.detectedCategory,
    categoryName: aiAnalysis.categoryName,
    photoUrl: data.photoUrl,
    studentName: data.studentName?.trim() || 'Campus Citizen (Anonymous)',
    studentContact: data.studentContact?.trim(),
    urgency: data.urgency || aiAnalysis.priority,
    status: 'analyzed',
    aiAnalysis,
    language: getLanguage(),
    routeHistory: [
      {
        id: `m_${Date.now()}_1`,
        timestamp: Date.now(),
        stage: 'Report Submitted',
        actor: data.studentName?.trim() || 'Campus Citizen (Anonymous)',
        role: 'Citizen',
        note: `Report registered at ${data.location}. No password required.`,
      },
      {
        id: `m_${Date.now()}_2`,
        timestamp: Date.now() + 500,
        stage: 'AI Analyses & Auto-Route',
        actor: 'CivicSense Neural Dispatch',
        role: 'AI Engine',
        note: `AI classified as ${aiAnalysis.categoryName} (${aiAnalysis.priority}). Dispatched directly to owning post: ${aiAnalysis.owningPost}.`,
      },
    ],
    replies: [],
  };

  saveComplaints([newComplaint, ...all]);
  return newComplaint;
}

export function updateComplaintStatus(
  id: string,
  newStatus: ComplaintStatus,
  authorName: string,
  note: string
): Complaint | null {
  const all = getAllComplaints();
  const index = all.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const target = all[index];
  const updated: Complaint = {
    ...target,
    status: newStatus,
    resolvedAt: newStatus === 'resolved' ? Date.now() : target.resolvedAt,
    resolutionNote: newStatus === 'resolved' ? note : target.resolutionNote,
    routeHistory: [
      ...target.routeHistory,
      {
        id: `m_${Date.now()}`,
        timestamp: Date.now(),
        stage: `Status updated to ${newStatus.replace('_', ' ').toUpperCase()}`,
        actor: authorName,
        role: 'Official',
        note: note || `Case transitioned to ${newStatus}.`,
      },
    ],
  };

  all[index] = updated;
  saveComplaints(all);
  return updated;
}

export function addOfficialReply(
  complaintId: string,
  author: string,
  role: string,
  message: string,
  isInternal: boolean = false
): OfficialReply | null {
  const all = getAllComplaints();
  const index = all.findIndex((c) => c.id === complaintId);
  if (index === -1) return null;

  const reply: OfficialReply = {
    id: `rep_${Date.now()}`,
    complaintId,
    author,
    role,
    message: message.trim(),
    timestamp: Date.now(),
    isInternal,
  };

  all[index].replies = [...all[index].replies, reply];
  all[index].routeHistory = [
    ...all[index].routeHistory,
    {
      id: `m_${Date.now()}`,
      timestamp: Date.now(),
      stage: 'Official Reply Posted',
      actor: author,
      role,
      note: `Reply dispatched to public complaint tracker: "${message.slice(0, 80)}..."`,
    },
  ];

  saveComplaints(all);
  return reply;
}

export function escalateComplaint(
  id: string,
  reason: string,
  authorName: string
): Complaint | null {
  const all = getAllComplaints();
  const index = all.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const target = all[index];
  const updated: Complaint = {
    ...target,
    status: 'escalated',
    escalation: {
      isEscalated: true,
      escalatedAt: Date.now(),
      reason,
      escalatedBy: authorName,
    },
    routeHistory: [
      ...target.routeHistory,
      {
        id: `m_${Date.now()}`,
        timestamp: Date.now(),
        stage: 'Escalated to President / GS',
        actor: authorName,
        role: 'Department Head',
        note: `Formal escalation raised: ${reason}`,
      },
    ],
  };

  all[index] = updated;
  saveComplaints(all);
  return updated;
}

export function mergeComplaints(
  masterId: string,
  duplicateIds: string[],
  adminName: string
): Complaint | null {
  const all = getAllComplaints();
  const masterIndex = all.findIndex((c) => c.id === masterId);
  if (masterIndex === -1) return null;

  const master = all[masterIndex];
  const mergedList = Array.from(new Set([...(master.mergedDuplicates || []), ...duplicateIds]));

  // Update master
  all[masterIndex] = {
    ...master,
    mergedDuplicates: mergedList,
    routeHistory: [
      ...master.routeHistory,
      {
        id: `m_${Date.now()}`,
        timestamp: Date.now(),
        stage: 'Merged Duplicate Reports',
        actor: adminName,
        role: 'Admin Panel',
        note: `Linked duplicate tickets [${duplicateIds.join(', ')}] into this master tracking case.`,
      },
    ],
  };

  // Update duplicate tickets
  for (const dupId of duplicateIds) {
    const dIndex = all.findIndex((c) => c.id === dupId);
    if (dIndex !== -1 && dIndex !== masterIndex) {
      all[dIndex] = {
        ...all[dIndex],
        status: 'closed',
        mergedInto: masterId,
        routeHistory: [
          ...all[dIndex].routeHistory,
          {
            id: `m_${Date.now()}`,
            timestamp: Date.now(),
            stage: `Merged into Master Case ${masterId}`,
            actor: adminName,
            role: 'Admin Panel',
            note: `Case merged into parent tracker #${masterId}. All further updates consolidated there.`,
          },
        ],
      };
    }
  }

  saveComplaints(all);
  return all[masterIndex];
}

// -------------------------------------------------------------
// 6. OFFICIAL AUTHENTICATION & SESSION
// -------------------------------------------------------------
export function getCurrentOfficial(): OfficialUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loginOfficial(emailOrId: string, _password?: string): OfficialUser | null {
  const input = emailOrId.toLowerCase().trim();
  const found = PRESET_OFFICIALS.find(
    (u) =>
      u.email.toLowerCase() === input ||
      u.id.toLowerCase() === input ||
      u.role.toLowerCase() === input ||
      (u.departmentId && u.departmentId.toLowerCase() === input)
  );

  if (found) {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(found));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('civicsense_auth_changed'));
    }
    return found;
  }
  return null;
}

export function logoutOfficial(): void {
  try {
    localStorage.removeItem(STORAGE_USER_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('civicsense_auth_changed'));
    }
  } catch (e) {
    console.error('Error logging out', e);
  }
}

// -------------------------------------------------------------
// 7. LANGUAGE & LOCALIZATION (English standard)
// -------------------------------------------------------------
export function getLanguage(): string {
  return 'en';
}

export function setLanguage(_lang: string): void {}

export const I18N = {
  en: {
    siteTitle: 'CivicSense',
    tagline: 'Campus Community Action · Redressal Portal',
    home: 'Home Page',
    reportComplaint: 'Report a Complaint',
    reportSub: 'Text, photo, location · No password needed',
    aiRouting: 'AI analyses and routes',
    aiRoutingSub: 'Category, priority, summary · Sent to the owning post',
    tracker: 'Complaint Tracker',
    trackerSub: 'Open with the complaint ID · Route status and replies',
    officialsPortal: 'Official Access',
    loginTitle: 'Officials Login',
    loginSub: 'Password-protected portal for Department Heads, Student Union, and Administrators',
    roleDeptHead: 'Mode 1: Department Head',
    rolePresident: 'Mode 2: President / GS',
    roleAdmin: 'Mode 3: Admin Panel',
    statusSubmitted: 'Submitted',
    statusAnalyzed: 'AI Analyzed',
    statusInvestigating: 'Under Investigation',
    statusInProgress: 'In Progress',
    statusEscalated: 'Escalated',
    statusResolved: 'Resolved',
    statusClosed: 'Closed',
    urgent: 'Urgent',
    normal: 'Normal',
    hazard: 'Immediate Hazard',
    low: 'Low',
  },
};

