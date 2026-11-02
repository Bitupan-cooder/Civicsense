// Local sample data from before the database existed: CS-8921 … (tracker demo chips, map markers) and campus landmarks.
// Moved verbatim from the original index.html page script (React migration); only imports/exports were added.

export var CAMPUS_LOCATIONS = [
  { id: 'du_hostel_1', name_en: 'Padmanath Gohain Baruah Chatra Nivas (Hostel 1)', name_as: 'পদ্মনাথ গোহাঞিবৰুৱা ছাত্ৰ নিৱাস (হোষ্টেল ১)', keys: ['hostel 1', 'pngb', 'padmanath', 'হোষ্টেল ১', '১ নম্বৰ হোষ্টেল', 'hostel 1 r'] },
  { id: 'du_hostel_2', name_en: 'Maniram Dewan Chatra Nivas (Hostel 2)', name_as: 'মণিৰাম দেৱান ছাত্ৰ নিৱাস (হোষ্টেল ২)', keys: ['hostel 2', 'maniram', 'হোষ্টেল ২', '২ নম্বৰ হোষ্টেল', 'hostel 2 r'] },
  { id: 'du_hostel_girls_1', name_en: 'Joymoti Chatri Nivas (Girls Hostel 1)', name_as: 'জয়মতী ছাত্ৰী নিৱাস (হোষ্টেল ১)', keys: ['joymoti', 'girls hostel 1', 'জয়মতী'] },
  { id: 'du_hostel_girls_2', name_en: 'Nalini Bala Devi Chatri Nivas (Girls Hostel 2)', name_as: 'নলিনীবালা দেৱী ছাত্ৰী নিৱাস', keys: ['nalini', 'girls hostel 2', 'নলিনীবালা'] },
  { id: 'du_ccsa', name_en: 'Centre for Computer Science & Applications (CCSA)', name_as: 'চি চি এছ এ (কম্পিউটাৰ অধ্যয়ন কেন্দ্ৰ)', keys: ['ccsa', 'computer centre', 'cs dept', 'চিচিএছএ'] },
  { id: 'du_library', name_en: 'Lakshminath Bezbaroa Central Library', name_as: 'লক্ষ্মীনাথ বেজবৰুৱা কেন্দ্ৰীয় গ্ৰন্থাগাৰ', keys: ['library', 'reading room', 'গ্ৰন্থাগাৰ', 'লাইব্ৰেৰী', 'bezbaroa'] },
  { id: 'du_admin', name_en: 'Administrative Building & Registrar Office', name_as: 'প্ৰশাসনিক ভৱন', keys: ['admin', 'registrar', 'প্ৰশাসনিক ভৱন'] },
  { id: 'du_canteen', name_en: 'Central Canteen & Student Activity Centre', name_as: 'কেন্দ্ৰীয় কেণ্টিন আৰু ছাত্ৰ সন্থাকক্ষ', keys: ['canteen', 'sac', 'কেণ্টিন'] },
  { id: 'du_sports_ground', name_en: 'University Sports Ground & Pavilion', name_as: 'বিশ্ববিদ্যালয় খেলপথাৰ', keys: ['ground', 'pavilion', 'sports ground', 'play ground', 'খেলপথাৰ', 'cricket ground'] },
  { id: 'du_science_quad', name_en: 'Science Block & Academic Quad', name_as: 'বিজ্ঞান ভৱন চত্বৰ', keys: ['science block', 'physics lab', 'chemistry', 'বিজ্ঞান ভৱন', 'duiet'] }
];

/* Seed complaints in localStorage with exact 15-key AI JSON */
export var SEED = [
  {
    id: 'CS-8921',
    ts: Date.now() - 1000 * 60 * 60 * 14,
    title: 'Water supply disruption at Maniram Dewan Chatra Nivas (Hostel 2)',
    desc: 'Hostel 2 r bathroom t pani nai 2 din dhori. Toilet flushes are completely dry and students cannot wash.',
    location: 'Maniram Dewan Chatra Nivas (Hostel 2)',
    cat: 'water',
    urgency: 'High',
    status: 'in_progress',
    studentName: 'Bikash Gogoi',
    studentContact: 'bikash.g@du.ac.in',
    dept: 'PHE & Facilities Operations Depot',
    aiAnalysis: {
      language: 'mixed',
      category: 'water',
      secondary_category: 'hostel',
      priority: 2,
      priority_reason: 'Facility unusable or large group of campus residents affected without immediate alternative.',
      location_id: 'du_hostel_2',
      location_text: 'Maniram Dewan Chatra Nivas (Hostel 2)',
      summary_en: 'Water supply disruption and plumbing defect reported at Maniram Dewan Chatra Nivas (Hostel 2).',
      summary_as: 'মণিৰাম দেৱান ছাত্ৰ নিৱাস (হোষ্টেল ২)ত পানী যোগান বন্ধ হোৱা আৰু টেপ বা পাইপৰ বিসংগতিৰ বিষয়ে আবেদন জনোৱা হৈছে।',
      assamese_quality: 'high',
      image_findings: null,
      sensitive: false,
      sensitive_reason: null,
      embedding_text: 'water issue at Maniram Dewan Chatra Nivas (Hostel 2) since 2 days',
      confidence: 0.96,
      needs_review: false
    },
    routeHistory: [
      { id: 'm1', ts: Date.now() - 1000 * 60 * 60 * 14, stage: 'Report Submitted', actor: 'Bikash Gogoi (Student)', role: 'Citizen', note: 'Report lodged in mixed Assamese/English.' },
      { id: 'm2', ts: Date.now() - 1000 * 60 * 60 * 13.9, stage: 'AI Triage & Route', actor: 'CivicSense Neural Dispatch', role: 'AI Engine', note: 'AI classified root cause: water (P2 High). Auto-dispatched to PHE Operations. Copy sent to General Secretary (DUSU).' },
      { id: 'm3', ts: Date.now() - 1000 * 60 * 60 * 8, stage: 'Owning Desk Acknowledged', actor: 'Shri Biren Gogoi', role: 'Officer in Charge', note: 'Main intake pipeline valve replaced. Overhead tank filling initiated.' }
    ],
    replies: [
      { id: 'r1', complaintId: 'CS-8921', author: 'Shri Biren Gogoi (PHE)', role: 'Department Head', message: 'Main line shutoff isolated at 09:30 AM. Plumbers fitted new PVC sleeve. Overhead tanks now 80% filled.', ts: Date.now() - 1000 * 60 * 60 * 4 }
    ]
  },
  {
    id: 'CS-8922',
    ts: Date.now() - 1000 * 60 * 60 * 22,
    title: 'Exposed sparking live wire outside CCSA computer lab entrance',
    desc: 'Sparking wire hanging low over walkway right at CCSA door. Immediate shock risk in rainy weather.',
    location: 'Centre for Computer Science & Applications (CCSA)',
    cat: 'electricity',
    urgency: 'Urgent',
    status: 'in_progress',
    studentName: 'Ritu Borah',
    studentContact: 'ritu.b@du.ac.in',
    dept: 'Electrical Maintenance & Substation Desk',
    aiAnalysis: {
      language: 'en',
      category: 'electricity',
      secondary_category: 'safety',
      priority: 1,
      priority_reason: 'Immediate risk to life, health or physical safety requiring emergency response.',
      location_id: 'du_ccsa',
      location_text: 'Centre for Computer Science & Applications (CCSA)',
      summary_en: 'Power outage and pathway fixture failure reported at Centre for Computer Science & Applications (CCSA).',
      summary_as: 'চি চি এছ এ চৌহদত বিদ্যুৎ বিভ্ৰাট আৰু লাইট বিকল হোৱাৰ সমস্যা দেখা গৈছে।',
      assamese_quality: 'high',
      image_findings: 'Photo visibly shows exposed electrical wiring and spark hazard.',
      sensitive: false,
      sensitive_reason: null,
      embedding_text: 'electricity issue at Centre for Computer Science & Applications (CCSA)',
      confidence: 0.98,
      needs_review: false
    },
    routeHistory: [
      { id: 'm21', ts: Date.now() - 1000 * 60 * 60 * 22, stage: 'Report Lodged', actor: 'Ritu Borah', role: 'Citizen', note: 'Report lodged with photo of sparking cable.' },
      { id: 'm22', ts: Date.now() - 1000 * 60 * 60 * 21.9, stage: 'AI P1 Emergency Route', actor: 'CivicSense Neural Dispatch', role: 'AI Engine', note: 'Classified as Priority 1 (Hazard). Direct priority alert dispatched to Electrical Maintenance Desk. Copy to DUSU GS.' }
    ],
    replies: [
      { id: 'r21', complaintId: 'CS-8922', author: 'Er. Deepshikha Kalita (Electrical)', role: 'Chief Engineer', message: 'Substation breaker tripped safely. Maintenance crew insulated the overhead cable run.', ts: Date.now() - 1000 * 60 * 60 * 18 }
    ]
  },
  {
    id: 'CS-8923',
    ts: Date.now() - 1000 * 60 * 60 * 6,
    title: 'গ্ৰন্থাগাৰত লাইট আৰু ফেন জ্বলা নাই',
    desc: 'লক্ষ্মীনাথ বেজবৰুৱা কেন্দ্ৰীয় গ্ৰন্থাগাৰৰ দ্বিতীয় মহলাত ফেন আৰু লাইট জ্বলা নাই, ছাত্ৰ-ছাত্ৰী পঢ়িব পৰা নাই।',
    location: 'Lakshminath Bezbaroa Central Library',
    cat: 'electricity',
    urgency: 'Medium',
    status: 'resolved',
    studentName: 'Priyam Saikia',
    studentContact: 'priyam.s@du.ac.in',
    dept: 'Electrical Maintenance & Substation Desk',
    aiAnalysis: {
      language: 'as',
      category: 'electricity',
      secondary_category: 'library',
      priority: 3,
      priority_reason: 'Standard campus service issue with available workaround.',
      location_id: 'du_library',
      location_text: 'Lakshminath Bezbaroa Central Library',
      summary_en: 'Power outage and pathway fixture failure reported at Lakshminath Bezbaroa Central Library.',
      summary_as: 'লক্ষ্মীনাথ বেজবৰুৱা কেন্দ্ৰীয় গ্ৰন্থাগাৰত বিদ্যুৎ বিভ্ৰাট আৰু লাইট বিকল হোৱাৰ সমস্যা দেখা গৈছে।',
      assamese_quality: 'high',
      image_findings: null,
      sensitive: false,
      sensitive_reason: null,
      embedding_text: 'electricity issue at Lakshminath Bezbaroa Central Library',
      confidence: 0.95,
      needs_review: false
    },
    routeHistory: [
      { id: 'm31', ts: Date.now() - 1000 * 60 * 60 * 6, stage: 'Report Lodged', actor: 'Priyam Saikia', role: 'Citizen', note: 'Filed in native Assamese script.' },
      { id: 'm32', ts: Date.now() - 1000 * 60 * 60 * 5.9, stage: 'AI Triage', actor: 'CivicSense Neural Dispatch', role: 'AI Engine', note: 'Assamese natural language classified as electricity. Dispatched to Electrical Desk.' },
      { id: 'm33', ts: Date.now() - 1000 * 60 * 60 * 2, stage: 'Resolved', actor: 'Er. Deepshikha Kalita', role: 'Chief Engineer', note: 'Replaced MCB fuse on 2nd floor distribution board.' }
    ],
    replies: [
      { id: 'r31', complaintId: 'CS-8923', author: 'Er. Deepshikha Kalita', role: 'Department Head', message: 'MCB breaker repaired and tested. Power restored to library reading floor.', ts: Date.now() - 1000 * 60 * 60 * 2 }
    ]
  }
];

export function getComplaints(){
  var raw = localStorage.getItem('civic_complaints');
  if(!raw){
    localStorage.setItem('civic_complaints', JSON.stringify(SEED));
    return SEED;
  }
  try { return JSON.parse(raw); } catch(e){ return SEED; }
}

/* Campus landmarks with GPS coordinates (map pins) */
export var CAMPUS_LOCATION_COORDS = {
  du_hostel_1: { lat: 27.4526, lng: 94.8904, name: 'Padmanath Gohain Baruah Chatra Nivas (Hostel 1)' },
  du_hostel_2: { lat: 27.4520, lng: 94.8910, name: 'Maniram Dewan Chatra Nivas (Hostel 2)' },
  du_hostel_girls_1: { lat: 27.4519, lng: 94.8938, name: 'Joymoti Chatri Nivas (Girls Hostel 1)' },
  du_hostel_girls_2: { lat: 27.4525, lng: 94.8942, name: 'Nalini Bala Devi Chatri Nivas (Girls Hostel 2)' },
  du_library: { lat: 27.4505, lng: 94.8931, name: 'Lakshminath Bezbaroa Central Library' },
  du_ccsa: { lat: 27.4510, lng: 94.8935, name: 'Centre for Computer Science & Applications (CCSA)' },
  du_admin: { lat: 27.4512, lng: 94.8918, name: 'Administrative Building & Registrar Office' },
  du_canteen: { lat: 27.4515, lng: 94.8925, name: 'Central Canteen & Student Activity Centre' },
  du_sports_ground: { lat: 27.4484, lng: 94.8912, name: 'University Sports Ground & Pavilion' },
  du_science_quad: { lat: 27.4514, lng: 94.8912, name: 'Science Block & Academic Quad' }
};
