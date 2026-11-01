import { getCoordinatesForLocation, DIBRUGARH_UNIVERSITY_CENTER } from '../config';

export type OfficialMode = 'dept_head' | 'president_gs' | 'admin';
export type ComplaintStatus = 'submitted' | 'routed' | 'in_progress' | 'escalated' | 'resolved' | 'closed';
export type PriorityLevel = 'Low' | 'Normal' | 'Urgent' | 'Immediate Hazard';

export const TIMELINE_STAGE_LABELS = [
  'Problem Seen',
  'Solving',
  'Delivered',
  'Completed',
] as const;

export interface OfficialAccount {
  id: string;
  email: string;
  password: string;
  name: string;
  postTitle: string;
  mode: OfficialMode;
  modeLabel: string;
  categoryScope?: string; // Only for Mode 1: Department Head
  officeId?: string;
}

export interface RoutingRule {
  categoryId: string;
  categoryName: string;
  owningPost: string;
  officeId: string;
  keywords: string[];
  slaHours: number;
}

export interface ComplaintReply {
  id: string;
  authorName: string;
  authorRole: string;
  message: string;
  timestamp: string;
  statusAfter?: ComplaintStatus;
}

export interface RouteStep {
  step: string;
  post: string;
  timestamp: string;
  completed: boolean;
  note: string;
}

export interface ComplaintRecord {
  id: string;
  category: string;
  categoryName: string;
  owningPost: string;
  officeId: string;
  location: string;
  lat: number;
  lng: number;
  gpsAccuracyMeters?: number;
  priority: PriorityLevel;
  summary: string;
  description: string;
  photoDataUrl?: string;
  photoName?: string;
  reporterName?: string;
  reporterContact?: string;
  approved?: boolean;
  status: ComplaintStatus;
  escalated: boolean;
  escalationReason?: string;
  mergedIntoId?: string;
  createdAt: number;
  updatedAt: number;
  routeSteps: RouteStep[];
  replies: ComplaintReply[];
}

export interface AutoAnalysisResult {
  category: string;
  categoryName: string;
  priority: PriorityLevel;
  summary: string;
  owningPost: string;
  officeId: string;
  matchedKeywords: string[];
}

function createSampleLocationSvgDataUrl(
  _code: string,
  _spotLabel: string,
  _issueTitle: string,
  _coordsText: string
): string {
  return '';
}

export const INITIAL_ROUTING_RULES: RoutingRule[] = [
  {
    categoryId: 'water',
    categoryName: 'Water & Plumbing',
    owningPost: 'Facility Operations & Plumbing (PHE)',
    officeId: 'facilities',
    keywords: ['water', 'ro', 'filter', 'pipe', 'leak', 'leaking', 'tap', 'plumbing', 'washroom', 'tank', 'supply', 'drinking'],
    slaHours: 6,
  },
  {
    categoryId: 'power',
    categoryName: 'Power & Lighting',
    owningPost: 'Electrical Maintenance & Power',
    officeId: 'electrical',
    keywords: ['power', 'light', 'lamp', 'electricity', 'spark', 'sparking', 'voltage', 'socket', 'fan', 'breaker', 'switch', 'outage', 'blackout'],
    slaHours: 4,
  },
  {
    categoryId: 'wifi',
    categoryName: 'Wi-Fi & Connectivity',
    owningPost: 'Campus IT & Wi-Fi Services (CCSA)',
    officeId: 'it-network',
    keywords: ['wifi', 'wi-fi', 'internet', 'network', 'router', 'lan', 'ethernet', 'ccsa', 'signal', 'connectivity', 'server'],
    slaHours: 8,
  },
  {
    categoryId: 'safety',
    categoryName: 'Safety & Emergency Post',
    owningPost: 'Campus Safety & Security Command',
    officeId: 'security',
    keywords: ['safety', 'security', 'cctv', 'camera', 'guard', 'gate', 'emergency', 'hazard', 'fire', 'stray', 'unlit', 'theft'],
    slaHours: 2,
  },
  {
    categoryId: 'waste',
    categoryName: 'Waste & Sanitation',
    owningPost: 'Sanitation & Grounds Management',
    officeId: 'sanitation',
    keywords: ['waste', 'garbage', 'trash', 'bin', 'dustbin', 'cleaning', 'sanitation', 'sweeping', 'litter', 'drain', 'hygiene'],
    slaHours: 8,
  },
  {
    categoryId: 'hostel',
    categoryName: 'Hostel & Residence',
    owningPost: 'Hostels & Student Housing Board',
    officeId: 'hostels',
    keywords: ['hostel', 'dorm', 'warden', 'mess', 'room', 'bed', 'corridor', 'laundry', 'residence', 'dining'],
    slaHours: 12,
  },
  {
    categoryId: 'labs',
    categoryName: 'Labs & Classrooms',
    owningPost: 'Academic Labs & Classroom Tech',
    officeId: 'labs',
    keywords: ['lab', 'classroom', 'projector', 'oscilloscope', 'bench', 'microscope', 'ac', 'ventilation', 'equipment', 'instrument'],
    slaHours: 10,
  },
];

export const SAMPLE_OFFICIAL_ACCOUNTS: OfficialAccount[] = [
  {
    id: 'DEPT-WATER',
    email: 'head.water@campus.edu',
    password: 'campus123',
    name: 'Er. P. Gogoi',
    postTitle: 'Department Head — Water & Plumbing (PHE)',
    mode: 'dept_head',
    modeLabel: 'Mode 1: Department Head',
    categoryScope: 'water',
    officeId: 'facilities',
  },
  {
    id: 'DEPT-POWER',
    email: 'head.power@campus.edu',
    password: 'campus123',
    name: 'Er. R. Hazarika',
    postTitle: 'Department Head — Electrical & Power',
    mode: 'dept_head',
    modeLabel: 'Mode 1: Department Head',
    categoryScope: 'power',
    officeId: 'electrical',
  },
  {
    id: 'DEPT-WIFI',
    email: 'head.wifi@campus.edu',
    password: 'campus123',
    name: 'Dr. S. Baruah',
    postTitle: 'Department Head — Campus IT & Wi-Fi (CCSA)',
    mode: 'dept_head',
    modeLabel: 'Mode 1: Department Head',
    categoryScope: 'wifi',
    officeId: 'it-network',
  },
  {
    id: 'DEPT-HOSTEL',
    email: 'head.hostel@campus.edu',
    password: 'campus123',
    name: 'Prof. M. Bordoloi',
    postTitle: 'Department Head — Hostels & Student Housing',
    mode: 'dept_head',
    modeLabel: 'Mode 1: Department Head',
    categoryScope: 'hostel',
    officeId: 'hostels',
  },
  {
    id: 'DEPT-SAFETY',
    email: 'head.safety@campus.edu',
    password: 'campus123',
    name: 'Capt. D. Phukan',
    postTitle: 'Department Head — Campus Safety & Security',
    mode: 'dept_head',
    modeLabel: 'Mode 1: Department Head',
    categoryScope: 'safety',
    officeId: 'security',
  },
  {
    id: 'DEPT-LABS',
    email: 'head.labs@campus.edu',
    password: 'campus123',
    name: 'Dr. A. Konwar',
    postTitle: 'Department Head — Academic Labs & Tech',
    mode: 'dept_head',
    modeLabel: 'Mode 1: Department Head',
    categoryScope: 'labs',
    officeId: 'labs',
  },
  {
    id: 'DEPT-WASTE',
    email: 'head.waste@campus.edu',
    password: 'campus123',
    name: 'Mr. B. Sonowal',
    postTitle: 'Department Head — Waste & Sanitation',
    mode: 'dept_head',
    modeLabel: 'Mode 1: Department Head',
    categoryScope: 'waste',
    officeId: 'sanitation',
  },
  {
    id: 'PRES-GS-01',
    email: 'president@campus.edu',
    password: 'campus123',
    name: 'Ankurjyoti Deka',
    postTitle: 'President / General Secretary (DUPGSU)',
    mode: 'president_gs',
    modeLabel: 'Mode 2: President / GS',
  },
  {
    id: 'ADMIN-01',
    email: 'admin@campus.edu',
    password: 'campus123',
    name: 'Dr. K. Rajkhowa',
    postTitle: 'Registrar & System Administrator',
    mode: 'admin',
    modeLabel: 'Mode 3: Admin Panel',
  },
];

export const INITIAL_COMPLAINTS: ComplaintRecord[] = [
  {
    id: 'CMP-2601',
    category: 'water',
    categoryName: 'Water & Plumbing',
    owningPost: 'Facility Operations & Plumbing (PHE)',
    officeId: 'facilities',
    location: 'Padmanath Gohain Baruah Chatra Nivas (Hostel Block A)',
    lat: 27.4526,
    lng: 94.8904,
    gpsAccuracyMeters: 6,
    priority: 'Immediate Hazard',
    summary: 'RO drinking water filter malfunctioning with casing leakage on 2nd floor.',
    description: 'The RO drinking water unit near the 2nd floor common room is not dispensing water and has a minor electrical leakage on the metal tap. Immediate inspection needed.',
    photoName: 'hostel_block_a_ro_filter.jpg',
    photoDataUrl: createSampleLocationSvgDataUrl(
      'CMP-2601',
      'P.G. Baruah Chatra Nivas (Hostel A)',
      'RO Water Filter Leakage — 2nd Floor',
      '27.45260° N, 94.89040° E (±6m)'
    ),
    reporterName: 'Ashima Bora',
    reporterContact: 'ashima.bora@dibru.ac.in',
    approved: true,
    status: 'in_progress',
    escalated: false,
    createdAt: Date.now() - 1000 * 60 * 180,
    updatedAt: Date.now() - 1000 * 60 * 45,
    routeSteps: [
      {
        step: 'Problem Seen',
        post: 'Er. P. Gogoi (DEPT-WATER)',
        timestamp: '08:15 AM',
        completed: true,
        note: 'Complaint reviewed and approved by Water & Plumbing Head.',
      },
      {
        step: 'Solving',
        post: 'Er. P. Gogoi (DEPT-WATER)',
        timestamp: '09:30 AM',
        completed: true,
        note: 'Technician dispatched with replacement solenoid valve.',
      },
      {
        step: 'Delivered',
        post: 'Facility Operations & Plumbing (PHE)',
        timestamp: 'Pending',
        completed: false,
        note: 'Awaiting part installation and pressure test delivery.',
      },
      {
        step: 'Completed',
        post: 'Facility Operations & Plumbing (PHE)',
        timestamp: 'Pending',
        completed: false,
        note: 'Pending final completion sign-off.',
      },
    ],
    replies: [
      {
        id: 'rep-1',
        authorName: 'Er. P. Gogoi',
        authorRole: 'Mode 1: Department Head (Water & Plumbing)',
        message: 'Plumbing & electrical technician team has isolated the unit and is replacing the faulty solenoid valve right now.',
        timestamp: '09:30 AM',
        statusAfter: 'in_progress',
      },
    ],
  },
  {
    id: 'CMP-2602',
    category: 'power',
    categoryName: 'Power & Lighting',
    owningPost: 'Electrical Maintenance & Power',
    officeId: 'electrical',
    location: 'Rangghar Auditorium & Main Quadrangle',
    lat: 27.4501,
    lng: 94.8915,
    gpsAccuracyMeters: 5,
    priority: 'Immediate Hazard',
    summary: 'Pathway pole lamp sparking near Rangghar auditorium road after rain.',
    description: 'The street lamp pole on the main quadrangle pathway towards Rangghar auditorium is flickering and dropping sparks when the wind blows.',
    photoName: 'rangghar_pathway_pole_spark.jpg',
    photoDataUrl: createSampleLocationSvgDataUrl(
      'CMP-2602',
      'Rangghar Auditorium Pathway',
      'Street Lamp Pole Sparking Hazard',
      '27.45010° N, 94.89150° E (±5m)'
    ),
    reporterName: 'Rituraj Kalita',
    reporterContact: 'rituraj.kalita@dibru.ac.in',
    approved: true,
    status: 'escalated',
    escalated: true,
    escalationReason: 'Requires central transformer feeder shutdown approval from Estate Office.',
    createdAt: Date.now() - 1000 * 60 * 240,
    updatedAt: Date.now() - 1000 * 60 * 30,
    routeSteps: [
      {
        step: 'Problem Seen',
        post: 'Er. R. Hazarika (DEPT-POWER)',
        timestamp: '07:50 AM',
        completed: true,
        note: 'Flagged as Immediate Hazard and cordoned off.',
      },
      {
        step: 'Solving',
        post: 'Er. R. Hazarika (DEPT-POWER)',
        timestamp: '10:05 AM',
        completed: true,
        note: 'Escalated for 30-minute central feeder shutdown clearance.',
      },
      {
        step: 'Delivered',
        post: 'Electrical Maintenance & Power',
        timestamp: 'Pending',
        completed: false,
        note: 'Lineman standing by for feeder isolation delivery.',
      },
      {
        step: 'Completed',
        post: 'Electrical Maintenance & Power',
        timestamp: 'Pending',
        completed: false,
        note: 'Pending completion.',
      },
    ],
    replies: [
      {
        id: 'rep-2',
        authorName: 'Er. R. Hazarika',
        authorRole: 'Mode 1: Department Head (Power & Lighting)',
        message: 'Pole junction box cordoned off. Escalating for immediate 30-minute feeder shutdown clearance.',
        timestamp: '10:05 AM',
        statusAfter: 'escalated',
      },
      {
        id: 'rep-3',
        authorName: 'Ankurjyoti Deka',
        authorRole: 'Mode 2: President / GS',
        message: 'Followed up with Chief Engineer; shutdown clearance granted for 11:30 AM today.',
        timestamp: '10:25 AM',
      },
    ],
  },
  {
    id: 'CMP-2603',
    category: 'wifi',
    categoryName: 'Wi-Fi & Connectivity',
    owningPost: 'Campus IT & Wi-Fi Services (CCSA)',
    officeId: 'it-network',
    location: 'Lakshminath Bezbaroa Central Library',
    lat: 27.4505,
    lng: 94.8931,
    gpsAccuracyMeters: 8,
    priority: 'Urgent',
    summary: 'Library reading hall Wi-Fi access point blinking red with no gateway.',
    description: 'Students in the 2nd floor reading room cannot connect to Campus-WiFi. The ceiling router is blinking red continuously.',
    reporterName: 'Manash Saikia',
    reporterContact: 'manash@dibru.ac.in',
    approved: true,
    status: 'resolved',
    escalated: false,
    createdAt: Date.now() - 1000 * 60 * 500,
    updatedAt: Date.now() - 1000 * 60 * 120,
    routeSteps: [
      {
        step: 'Problem Seen',
        post: 'Dr. S. Baruah (DEPT-WIFI)',
        timestamp: 'Yesterday, 04:20 PM',
        completed: true,
        note: 'Seen and approved by Campus IT & Wi-Fi Head.',
      },
      {
        step: 'Solving',
        post: 'Dr. S. Baruah (DEPT-WIFI)',
        timestamp: 'Yesterday, 05:00 PM',
        completed: true,
        note: 'Replacing faulty PoE injector and uplink patch cord.',
      },
      {
        step: 'Delivered',
        post: 'Dr. S. Baruah (DEPT-WIFI)',
        timestamp: 'Yesterday, 05:30 PM',
        completed: true,
        note: 'New fiber uplink module installed on Floor 2 switch.',
      },
      {
        step: 'Completed',
        post: 'Dr. S. Baruah (DEPT-WIFI)',
        timestamp: 'Yesterday, 05:45 PM',
        completed: true,
        note: '300 Mbps link restored and verified across reading room.',
      },
    ],
    replies: [
      {
        id: 'rep-4',
        authorName: 'Dr. S. Baruah',
        authorRole: 'Mode 1: Department Head (Wi-Fi & Connectivity)',
        message: 'Replaced faulty fiber uplink module on Floor 2 switch. Wi-Fi signal is back at full strength.',
        timestamp: 'Yesterday, 05:45 PM',
        statusAfter: 'resolved',
      },
    ],
  },
  {
    id: 'CMP-2604',
    category: 'hostel',
    categoryName: 'Hostel & Residence',
    owningPost: 'Hostels & Student Housing Board',
    officeId: 'hostels',
    location: 'Joymati Chatri Nivas (Hostel Block B)',
    lat: 27.4519,
    lng: 94.8938,
    gpsAccuracyMeters: 7,
    priority: 'Urgent',
    summary: 'Ground floor corridor washbasin drainage blocked in Joymati Chatri Nivas.',
    description: 'Washbasin drain pipe in the West Wing ground floor is clogged and water is pooling near the staircase.',
    photoName: 'joymati_hostel_drainage.jpg',
    photoDataUrl: createSampleLocationSvgDataUrl(
      'CMP-2604',
      'Joymati Chatri Nivas (Hostel B)',
      'Ground Floor Washbasin Drain Blocked',
      '27.45190° N, 94.89380° E (±7m)'
    ),
    reporterName: 'Priyanka Dutta',
    approved: false,
    status: 'routed',
    escalated: false,
    createdAt: Date.now() - 1000 * 60 * 90,
    updatedAt: Date.now() - 1000 * 60 * 90,
    routeSteps: [
      {
        step: 'Problem Seen',
        post: 'Hostels & Student Housing Board',
        timestamp: 'Pending',
        completed: false,
        note: 'Incoming complaint awaiting official approval.',
      },
      {
        step: 'Solving',
        post: 'Hostels & Student Housing Board',
        timestamp: 'Pending',
        completed: false,
        note: 'Awaiting maintenance team assignment.',
      },
      {
        step: 'Delivered',
        post: 'Hostels & Student Housing Board',
        timestamp: 'Pending',
        completed: false,
        note: 'Pending repair delivery.',
      },
      {
        step: 'Completed',
        post: 'Hostels & Student Housing Board',
        timestamp: 'Pending',
        completed: false,
        note: 'Pending completion.',
      },
    ],
    replies: [],
  },
  {
    id: 'CMP-2605',
    category: 'safety',
    categoryName: 'Safety & Emergency Post',
    owningPost: 'Campus Safety & Security Command',
    officeId: 'security',
    location: 'North Academic Block & Science Complex',
    lat: 27.4514,
    lng: 94.8912,
    gpsAccuracyMeters: 4,
    priority: 'Urgent',
    summary: 'Broken perimeter floodlight and unlatched emergency exit gate at NAB.',
    description: 'The rear bicycle parking floodlight behind North Academic Block is dark after 6:30 PM and the gate latch is broken.',
    photoName: 'nab_floodlight_gate.jpg',
    photoDataUrl: createSampleLocationSvgDataUrl(
      'CMP-2605',
      'North Academic Block (NAB)',
      'Perimeter Floodlight & Exit Gate Latch',
      '27.45140° N, 94.89120° E (±4m)'
    ),
    reporterName: 'Debajit Baruah',
    approved: true,
    status: 'in_progress',
    escalated: false,
    createdAt: Date.now() - 1000 * 60 * 320,
    updatedAt: Date.now() - 1000 * 60 * 60,
    routeSteps: [
      {
        step: 'Problem Seen',
        post: 'Capt. D. Phukan (DEPT-SAFETY)',
        timestamp: 'Yesterday, 06:50 PM',
        completed: true,
        note: 'Approved by Campus Safety & Security Command.',
      },
      {
        step: 'Solving',
        post: 'Capt. D. Phukan (DEPT-SAFETY)',
        timestamp: 'Yesterday, 07:15 PM',
        completed: true,
        note: 'Night patrol stationed; temporary LED floodlight mounted.',
      },
      {
        step: 'Delivered',
        post: 'Capt. D. Phukan (DEPT-SAFETY)',
        timestamp: '09:00 AM',
        completed: true,
        note: 'Replacement floodlight and gate latch delivered to site.',
      },
      {
        step: 'Completed',
        post: 'Campus Safety & Security Command',
        timestamp: 'Pending',
        completed: false,
        note: 'Final gate latch welding verification in progress.',
      },
    ],
    replies: [
      {
        id: 'rep-5',
        authorName: 'Capt. D. Phukan',
        authorRole: 'Mode 1: Department Head (Safety & Security)',
        message: 'Temporary halogen floodlight is active and night guard post assigned. Gate latch welding is underway.',
        timestamp: 'Yesterday, 07:15 PM',
        statusAfter: 'in_progress',
      },
    ],
  },
  {
    id: 'CMP-2606',
    category: 'labs',
    categoryName: 'Labs & Classrooms',
    owningPost: 'Academic Labs & Classroom Tech',
    officeId: 'labs',
    location: 'DUIET Engineering Workshop & Maker Lab',
    lat: 27.4489,
    lng: 94.8945,
    gpsAccuracyMeters: 5,
    priority: 'Normal',
    summary: 'Bench 4 oscilloscope earthing and projector HDMI port fault in DUIET Lab.',
    description: 'The ceiling projector HDMI input flickers during lectures and Bench 4 power strip needs earth-pin replacement.',
    photoName: 'duiet_maker_lab_bench4.jpg',
    photoDataUrl: createSampleLocationSvgDataUrl(
      'CMP-2606',
      'DUIET Engineering Maker Lab',
      'Bench 4 Earthing & Projector HDMI Fault',
      '27.44890° N, 94.89450° E (±5m)'
    ),
    reporterName: 'Koushik Nath',
    approved: false,
    status: 'routed',
    escalated: false,
    createdAt: Date.now() - 1000 * 60 * 140,
    updatedAt: Date.now() - 1000 * 60 * 140,
    routeSteps: [
      {
        step: 'Problem Seen',
        post: 'Academic Labs & Classroom Tech',
        timestamp: 'Pending',
        completed: false,
        note: 'Incoming complaint awaiting official approval.',
      },
      {
        step: 'Solving',
        post: 'Academic Labs & Classroom Tech',
        timestamp: 'Pending',
        completed: false,
        note: 'Awaiting lab technician slot.',
      },
      {
        step: 'Delivered',
        post: 'Academic Labs & Classroom Tech',
        timestamp: 'Pending',
        completed: false,
        note: 'Pending hardware replacement delivery.',
      },
      {
        step: 'Completed',
        post: 'Academic Labs & Classroom Tech',
        timestamp: 'Pending',
        completed: false,
        note: 'Pending completion.',
      },
    ],
    replies: [],
  },
];

/**
 * Pure helper determining whether a complaint should be displayed as a Red Pin
 * on the Dibrugarh University OpenStreetMap.
 * When a problem is solved (status === 'resolved' | 'closed' or Stage 4 Completed is true),
 * the Red Pin is automatically removed.
 */
export function isComplaintActiveOnMap(complaint: ComplaintRecord): boolean {
  if (complaint.status === 'resolved' || complaint.status === 'closed') {
    return false;
  }
  const stage4Completed = complaint.routeSteps?.[3]?.completed === true;
  if (stage4Completed) {
    return false;
  }
  return true;
}

/**
 * Returns only active (unsolved) complaints that should render as Red Pins on the map.
 */
export function getActiveMapComplaints(complaints: ComplaintRecord[]): ComplaintRecord[] {
  return complaints.filter(isComplaintActiveOnMap);
}

/**
 * Pure deterministic rule-based analyser & router (no external LLM calls).
 */
export function analyzeAndRouteComplaint(
  description: string,
  selectedCategory: string,
  rules: RoutingRule[] = INITIAL_ROUTING_RULES,
  explicitPriority?: PriorityLevel
): AutoAnalysisResult {
  const cleanText = (description || '').trim();
  const lower = cleanText.toLowerCase();

  let bestRule = rules.find((r) => r.categoryId === selectedCategory) || rules[0];
  let maxHits = 0;
  let matchedKeywords: string[] = [];

  for (const rule of rules) {
    const hits = rule.keywords.filter((kw) => lower.includes(kw.toLowerCase()));
    if (hits.length > maxHits) {
      maxHits = hits.length;
      bestRule = rule;
      matchedKeywords = hits;
    }
  }

  if (maxHits === 0) {
    const fallback = rules.find((r) => r.categoryId === selectedCategory) || rules[0];
    bestRule = fallback;
    matchedKeywords = [fallback.categoryId];
  }

  const hazardTerms = ['spark', 'sparking', 'shock', 'fire', 'flood', 'burst', 'hazard', 'emergency', 'smoke', 'gas', 'live wire'];
  const urgentTerms = ['broken', 'down', 'no water', 'outage', 'blackout', 'dark', 'unlit', 'blocked', 'overflow', 'urgent', 'immediately'];

  let detectedPriority: PriorityLevel = explicitPriority || 'Normal';
  if (hazardTerms.some((t) => lower.includes(t))) {
    detectedPriority = 'Immediate Hazard';
  } else if (!explicitPriority && urgentTerms.some((t) => lower.includes(t))) {
    detectedPriority = 'Urgent';
  } else if (explicitPriority) {
    detectedPriority = explicitPriority;
  }

  const firstSentence = cleanText.split(/[.!?\n]/)[0]?.trim() || '';
  const summary =
    firstSentence.length > 95
      ? `${firstSentence.slice(0, 92)}...`
      : firstSentence.length > 0
      ? firstSentence
      : `${bestRule.categoryName} issue reported for ${bestRule.owningPost}`;

  return {
    category: bestRule.categoryId,
    categoryName: bestRule.categoryName,
    priority: detectedPriority,
    summary,
    owningPost: bestRule.owningPost,
    officeId: bestRule.officeId,
    matchedKeywords,
  };
}

/**
 * Authenticates an official by ID or Email + Password.
 */
export function authenticateOfficial(
  identifier: string,
  password: string,
  accounts: OfficialAccount[] = SAMPLE_OFFICIAL_ACCOUNTS
): { ok: true; account: OfficialAccount } | { ok: false; error: string } {
  const cleanId = (identifier || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (!cleanId || !cleanPass) {
    return { ok: false, error: 'Please enter both your Official ID / Email and password.' };
  }

  const matched = accounts.find(
    (acc) => acc.id.toLowerCase() === cleanId || acc.email.toLowerCase() === cleanId
  );

  if (!matched) {
    return { ok: false, error: 'No official post found for that ID or Email. Try one of the sample IDs below.' };
  }

  if (matched.password !== cleanPass) {
    return { ok: false, error: 'Incorrect password for this official account. (Sample password: campus123)' };
  }

  return { ok: true, account: matched };
}

/**
 * Filters complaints visible to a given official account.
 */
export function filterComplaintsForOfficial(
  complaints: ComplaintRecord[],
  account: OfficialAccount
): ComplaintRecord[] {
  if (account.mode === 'dept_head' && account.categoryScope) {
    return complaints.filter((c) => c.category === account.categoryScope);
  }
  return complaints;
}

/**
 * Creates a new ComplaintRecord with the 4-stage timeline and Dibrugarh University GPS coordinates:
 * 1. Problem Seen
 * 2. Solving
 * 3. Delivered
 * 4. Completed
 */
export function createComplaintRecord(input: {
  description: string;
  selectedCategory: string;
  location: string;
  lat?: number;
  lng?: number;
  gpsAccuracyMeters?: number;
  explicitPriority?: PriorityLevel;
  photoDataUrl?: string;
  photoName?: string;
  reporterName?: string;
  reporterContact?: string;
  rules?: RoutingRule[];
  existingCount?: number;
}): ComplaintRecord {
  const analysis = analyzeAndRouteComplaint(
    input.description,
    input.selectedCategory,
    input.rules || INITIAL_ROUTING_RULES,
    input.explicitPriority
  );

  const seq = 2607 + (input.existingCount || 0);
  const id = `CMP-${seq}`;

  const fallbackCoords = getCoordinatesForLocation(input.location || '') || DIBRUGARH_UNIVERSITY_CENTER;
  const lat = typeof input.lat === 'number' && !Number.isNaN(input.lat) ? input.lat : fallbackCoords.lat;
  const lng = typeof input.lng === 'number' && !Number.isNaN(input.lng) ? input.lng : fallbackCoords.lng;

  return {
    id,
    category: analysis.category,
    categoryName: analysis.categoryName,
    owningPost: analysis.owningPost,
    officeId: analysis.officeId,
    location: input.location,
    lat,
    lng,
    gpsAccuracyMeters: input.gpsAccuracyMeters,
    priority: analysis.priority,
    summary: analysis.summary,
    description: input.description.trim(),
    photoDataUrl: input.photoDataUrl,
    photoName: input.photoName,
    reporterName: input.reporterName?.trim() || undefined,
    reporterContact: input.reporterContact?.trim() || undefined,
    approved: false,
    status: 'routed',
    escalated: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    routeSteps: [
      {
        step: 'Problem Seen',
        post: analysis.owningPost,
        timestamp: 'Pending',
        completed: false,
        note: `Incoming complaint routed to ${analysis.owningPost}. Awaiting officer approval.`,
      },
      {
        step: 'Solving',
        post: analysis.owningPost,
        timestamp: 'Pending',
        completed: false,
        note: 'Awaiting officer action to begin solving.',
      },
      {
        step: 'Delivered',
        post: analysis.owningPost,
        timestamp: 'Pending',
        completed: false,
        note: 'Pending on-site repair / solution delivery.',
      },
      {
        step: 'Completed',
        post: analysis.owningPost,
        timestamp: 'Pending',
        completed: false,
        note: 'Pending final completion sign-off.',
      },
    ],
    replies: [],
  };
}

/**
 * Approves an incoming complaint (Official-only action) and marks "Problem Seen" & "Solving" active.
 */
export function approveIncomingComplaint(
  complaints: ComplaintRecord[],
  complaintId: string,
  actor: { name: string; roleLabel: string },
  note?: string
): ComplaintRecord[] {
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return complaints.map((c) => {
    if (c.id !== complaintId) return c;

    const updatedSteps = c.routeSteps.map((st, idx) => {
      if (idx === 0) {
        return {
          ...st,
          step: 'Problem Seen',
          post: `${actor.name} (${actor.roleLabel})`,
          timestamp: st.completed ? st.timestamp : nowStr,
          completed: true,
          note: note || `Problem seen and approved by ${actor.name}.`,
        };
      }
      if (idx === 1) {
        return {
          ...st,
          step: 'Solving',
          post: `${actor.name} (${actor.roleLabel})`,
          timestamp: nowStr,
          completed: true,
          note: note || `Approved and solving initiated by ${actor.name}.`,
        };
      }
      return st;
    });

    const newReplies = [...c.replies];
    if (note && note.trim().length > 0) {
      newReplies.push({
        id: `reply_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        authorName: actor.name,
        authorRole: actor.roleLabel,
        message: note.trim(),
        timestamp: nowStr,
        statusAfter: 'in_progress',
      });
    }

    return {
      ...c,
      approved: true,
      status: 'in_progress',
      updatedAt: Date.now(),
      routeSteps: updatedSteps,
      replies: newReplies,
    };
  });
}

/**
 * Official-only checklist toggle for the 4 timeline stages:
 * 0 = Problem Seen, 1 = Solving, 2 = Delivered, 3 = Completed
 */
export function toggleTimelineChecklistStep(
  complaints: ComplaintRecord[],
  complaintId: string,
  stepIndex: number,
  actor: { name: string; roleLabel: string },
  customNote?: string
): ComplaintRecord[] {
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const defaultNotes: Record<number, string> = {
    0: `Problem seen and acknowledged by ${actor.name}.`,
    1: `Actively solving issue — assigned by ${actor.name}.`,
    2: `Solution delivered on-site by ${actor.name}.`,
    3: `Completed and verified by ${actor.name}. Red pin automatically removed from campus map.`,
  };

  return complaints.map((c) => {
    if (c.id !== complaintId) return c;

    const targetStep = c.routeSteps[stepIndex];
    if (!targetStep) return c;

    const nextCompleted = !targetStep.completed;

    const updatedSteps = c.routeSteps.map((st, idx) => {
      if (nextCompleted && idx <= stepIndex) {
        return {
          ...st,
          step: TIMELINE_STAGE_LABELS[idx] || st.step,
          post: idx === stepIndex || !st.completed ? `${actor.name} (${actor.roleLabel})` : st.post,
          timestamp: idx === stepIndex || !st.completed ? nowStr : st.timestamp,
          completed: true,
          note:
            idx === stepIndex
              ? customNote?.trim() || defaultNotes[idx] || st.note
              : st.completed
              ? st.note
              : defaultNotes[idx] || st.note,
        };
      }
      if (!nextCompleted && idx >= stepIndex) {
        return {
          ...st,
          step: TIMELINE_STAGE_LABELS[idx] || st.step,
          timestamp: 'Pending',
          completed: false,
          note: `Pending ${TIMELINE_STAGE_LABELS[idx] || st.step}.`,
        };
      }
      return st;
    });

    const anyCompleted = updatedSteps.some((s) => s.completed);
    const allCompleted = updatedSteps.every((s) => s.completed);

    const nextStatus: ComplaintStatus = allCompleted
      ? 'resolved'
      : anyCompleted
      ? 'in_progress'
      : 'routed';

    const newReplies = [...c.replies];
    if (customNote && customNote.trim().length > 0) {
      newReplies.push({
        id: `reply_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        authorName: actor.name,
        authorRole: actor.roleLabel,
        message: customNote.trim(),
        timestamp: nowStr,
        statusAfter: nextStatus,
      });
    }

    return {
      ...c,
      approved: anyCompleted ? true : false,
      status: nextStatus,
      escalated: allCompleted ? false : c.escalated,
      updatedAt: Date.now(),
      routeSteps: updatedSteps,
      replies: newReplies,
    };
  });
}

/**
 * Updates complaint status, appends an optional reply, and advances routeSteps.
 */
export function updateComplaintCase(
  complaints: ComplaintRecord[],
  complaintId: string,
  nextStatus: ComplaintStatus,
  actor: { name: string; roleLabel: string },
  replyText?: string,
  escalationReason?: string
): ComplaintRecord[] {
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return complaints.map((c) => {
    if (c.id !== complaintId) return c;

    const isEscalating = nextStatus === 'escalated';
    const isResolvedOrClosed = nextStatus === 'resolved' || nextStatus === 'closed';
    const isInProgress = nextStatus === 'in_progress' || isResolvedOrClosed;

    const updatedSteps = c.routeSteps.map((st, idx) => {
      if (idx === 0 && (isInProgress || isEscalating || isResolvedOrClosed)) {
        return {
          ...st,
          step: 'Problem Seen',
          post: st.completed ? st.post : `${actor.name} (${actor.roleLabel})`,
          timestamp: st.completed ? st.timestamp : nowStr,
          completed: true,
          note: st.completed ? st.note : `Problem seen by ${actor.name}.`,
        };
      }
      if (idx === 1 && (isInProgress || isEscalating || isResolvedOrClosed)) {
        return {
          ...st,
          step: 'Solving',
          post: `${actor.name} (${actor.roleLabel})`,
          timestamp: nowStr,
          completed: true,
          note: isEscalating
            ? escalationReason || replyText || 'Escalated for higher administrative intervention.'
            : replyText || 'Solving in progress.',
        };
      }
      if ((idx === 2 || idx === 3) && isResolvedOrClosed) {
        return {
          ...st,
          step: idx === 2 ? 'Delivered' : 'Completed',
          post: `${actor.name} (${actor.roleLabel})`,
          timestamp: nowStr,
          completed: true,
          note: replyText || (idx === 2 ? 'Solution delivered.' : 'Issue completed and verified. Red pin removed from map.'),
        };
      }
      return st;
    });

    const newReplies = [...c.replies];
    if (replyText && replyText.trim().length > 0) {
      newReplies.push({
        id: `reply_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        authorName: actor.name,
        authorRole: actor.roleLabel,
        message: replyText.trim(),
        timestamp: nowStr,
        statusAfter: nextStatus,
      });
    }

    return {
      ...c,
      approved: true,
      status: nextStatus,
      escalated: isEscalating ? true : isResolvedOrClosed ? false : c.escalated,
      escalationReason: isEscalating ? (escalationReason || replyText || c.escalationReason) : c.escalationReason,
      updatedAt: Date.now(),
      routeSteps: updatedSteps,
      replies: newReplies,
    };
  });
}

/**
 * Merges a duplicate complaint into a primary target complaint (Mode 3 Admin capability).
 */
export function mergeDuplicateComplaints(
  complaints: ComplaintRecord[],
  duplicateId: string,
  targetId: string,
  adminName: string
): ComplaintRecord[] {
  if (duplicateId === targetId) return complaints;
  const dup = complaints.find((c) => c.id === duplicateId);
  const target = complaints.find((c) => c.id === targetId);
  if (!dup || !target) return complaints;

  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return complaints.map((c) => {
    if (c.id === duplicateId) {
      return {
        ...c,
        status: 'closed',
        mergedIntoId: targetId,
        updatedAt: Date.now(),
        replies: [
          ...c.replies,
          {
            id: `merge_${Date.now()}`,
            authorName: adminName,
            authorRole: 'Mode 3: Admin Panel',
            message: `Merged as duplicate into primary complaint ${targetId}.`,
            timestamp: nowStr,
            statusAfter: 'closed',
          },
        ],
      };
    }
    if (c.id === targetId) {
      return {
        ...c,
        updatedAt: Date.now(),
        replies: [
          ...c.replies,
          {
            id: `merge_ref_${Date.now()}`,
            authorName: adminName,
            authorRole: 'Mode 3: Admin Panel',
            message: `Consolidated duplicate report ${duplicateId} (${dup.location}) into this primary case.`,
            timestamp: nowStr,
          },
        ],
      };
    }
    return c;
  });
}

export interface PortalStatistics {
  total: number;
  pending: number;
  inProgress: number;
  escalated: number;
  resolved: number;
  closed: number;
  byCategory: { categoryId: string; categoryName: string; owningPost: string; count: number; resolvedCount: number }[];
}

export function computePortalStatistics(
  complaints: ComplaintRecord[],
  rules: RoutingRule[] = INITIAL_ROUTING_RULES
): PortalStatistics {
  const total = complaints.length;
  const resolved = complaints.filter((c) => c.status === 'resolved').length;
  const closed = complaints.filter((c) => c.status === 'closed').length;
  const escalated = complaints.filter((c) => c.escalated || c.status === 'escalated').length;
  const inProgress = complaints.filter((c) => c.status === 'in_progress').length;
  const pending = complaints.filter((c) => c.status === 'submitted' || c.status === 'routed').length;

  const byCategory = rules.map((r) => {
    const matching = complaints.filter((c) => c.category === r.categoryId);
    const resolvedMatching = matching.filter((c) => c.status === 'resolved' || c.status === 'closed');
    return {
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      owningPost: r.owningPost,
      count: matching.length,
      resolvedCount: resolvedMatching.length,
    };
  });

  return {
    total,
    pending,
    inProgress,
    escalated,
    resolved,
    closed,
    byCategory,
  };
}

const PORTAL_COMPLAINTS_STORAGE_KEY = 'civicsense_portal_complaints_v6';
const PORTAL_RULES_STORAGE_KEY = 'civicsense_portal_rules_v6';
const PORTAL_ACCOUNTS_STORAGE_KEY = 'civicsense_portal_accounts_v6';

export function loadPortalComplaints(): ComplaintRecord[] {
  if (typeof window === 'undefined') return INITIAL_COMPLAINTS;
  try {
    const raw = localStorage.getItem(PORTAL_COMPLAINTS_STORAGE_KEY);
    if (!raw) return INITIAL_COMPLAINTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_COMPLAINTS;
  } catch {
    return INITIAL_COMPLAINTS;
  }
}

export function savePortalComplaints(complaints: ComplaintRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PORTAL_COMPLAINTS_STORAGE_KEY, JSON.stringify(complaints));
    window.dispatchEvent(new Event('civicsense_portal_updated'));
  } catch (e) {
    console.error('Failed to save portal complaints', e);
  }
}

export function loadRoutingRules(): RoutingRule[] {
  if (typeof window === 'undefined') return INITIAL_ROUTING_RULES;
  try {
    const raw = localStorage.getItem(PORTAL_RULES_STORAGE_KEY);
    if (!raw) return INITIAL_ROUTING_RULES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ROUTING_RULES;
  } catch {
    return INITIAL_ROUTING_RULES;
  }
}

export function saveRoutingRules(rules: RoutingRule[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PORTAL_RULES_STORAGE_KEY, JSON.stringify(rules));
    window.dispatchEvent(new Event('civicsense_portal_updated'));
  } catch (e) {
    console.error('Failed to save routing rules', e);
  }
}

export function loadOfficialAccounts(): OfficialAccount[] {
  if (typeof window === 'undefined') return SAMPLE_OFFICIAL_ACCOUNTS;
  try {
    const raw = localStorage.getItem(PORTAL_ACCOUNTS_STORAGE_KEY);
    if (!raw) return SAMPLE_OFFICIAL_ACCOUNTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SAMPLE_OFFICIAL_ACCOUNTS;
  } catch {
    return SAMPLE_OFFICIAL_ACCOUNTS;
  }
}

export function saveOfficialAccounts(accounts: OfficialAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PORTAL_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    window.dispatchEvent(new Event('civicsense_portal_updated'));
  } catch (e) {
    console.error('Failed to save official accounts', e);
  }
}
