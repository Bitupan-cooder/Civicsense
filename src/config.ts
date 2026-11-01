export interface Office {
  id: string;
  name: string;
  email: string;
  whatsapp: string; // phone number formatted for wa.me, e.g. "15551234567"
  locationHint?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  officeId: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface CampusCoordinates {
  lat: number;
  lng: number;
}

export interface AppConfig {
  siteName: string;
  campusName: string;
  emergencyPhone: string;
  centerCoords: CampusCoordinates;
  offices: Office[];
  categories: Category[];
  locations: string[];
  faq: FAQItem[];
}

export const DIBRUGARH_UNIVERSITY_CENTER: CampusCoordinates = {
  lat: 27.4508,
  lng: 94.8926,
};

export const CAMPUS_LOCATION_COORDS: Record<string, CampusCoordinates> = {
  "Padmanath Gohain Baruah Chatra Nivas (Hostel Block A)": { lat: 27.4526, lng: 94.8904 },
  "Hostel Block A (East Wing)": { lat: 27.4526, lng: 94.8904 },
  "Joymati Chatri Nivas (Hostel Block B)": { lat: 27.4519, lng: 94.8938 },
  "Hostel Block B (West Wing)": { lat: 27.4519, lng: 94.8938 },
  "Lakshminath Bezbaroa Central Library": { lat: 27.4505, lng: 94.8931 },
  "Central Library & Study Commons": { lat: 27.4505, lng: 94.8931 },
  "DUIET Engineering Workshop & Maker Lab": { lat: 27.4489, lng: 94.8945 },
  "Engineering Workshop & Maker Lab": { lat: 27.4489, lng: 94.8945 },
  "North Academic Block & Science Complex": { lat: 27.4514, lng: 94.8912 },
  "North Academic Block (NAB)": { lat: 27.4514, lng: 94.8912 },
  "South Science & Biotechnology Complex": { lat: 27.4496, lng: 94.8929 },
  "South Science & Research Complex": { lat: 27.4496, lng: 94.8929 },
  "Rangghar Auditorium & Main Quadrangle": { lat: 27.4501, lng: 94.8915 },
  "Main Quadrangle & Outer Perimeter Path": { lat: 27.4501, lng: 94.8915 },
  "Administrative Building & Registrar Office": { lat: 27.4512, lng: 94.8918 },
  "University Health Centre & Main Security Gate": { lat: 27.4531, lng: 94.8922 },
  "Bhojraj Sethi Indoor Stadium & Sports Arena": { lat: 27.4484, lng: 94.8912 },
  "Campus Recreation & Sports Arena": { lat: 27.4484, lng: 94.8912 },
  "Vishnu Rabha Bhawan & Student Center": { lat: 27.4515, lng: 94.8925 },
  "Student Center & Dining Hall": { lat: 27.4515, lng: 94.8925 },
  "Research Scholars & Graduate Residences": { lat: 27.4522, lng: 94.8898 },
  "Graduate Residences": { lat: 27.4522, lng: 94.8898 },
};

export function getCoordinatesForLocation(locationName: string): CampusCoordinates {
  const exact = CAMPUS_LOCATION_COORDS[locationName];
  if (exact) return { ...exact };

  const lower = (locationName || '').toLowerCase();
  for (const [key, coords] of Object.entries(CAMPUS_LOCATION_COORDS)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return { ...coords };
    }
  }

  return { ...DIBRUGARH_UNIVERSITY_CENTER };
}

export const campusConfig: AppConfig = {
  siteName: "CivicSense",
  campusName: "Dibrugarh University, Rajabheta, Assam",
  emergencyPhone: "+91 (373) 237-0239",
  centerCoords: DIBRUGARH_UNIVERSITY_CENTER,
  offices: [
    {
      id: "facilities",
      name: "Facility Operations & Plumbing (PHE)",
      email: "facilities@dibru.ac.in",
      whatsapp: "913732370231",
      locationHint: "Estate & PHE Division, Near Main Gate"
    },
    {
      id: "electrical",
      name: "Electrical Maintenance & Power",
      email: "power-maintenance@dibru.ac.in",
      whatsapp: "913732370232",
      locationHint: "Electrical Substation, West Quadrangle"
    },
    {
      id: "it-network",
      name: "Campus IT & Wi-Fi Services (CCSA)",
      email: "network-helpdesk@dibru.ac.in",
      whatsapp: "913732370233",
      locationHint: "Centre for Computer Studies, Level 1"
    },
    {
      id: "security",
      name: "Campus Safety & Security Command",
      email: "safety-control@dibru.ac.in",
      whatsapp: "913732370234",
      locationHint: "NH-37 Rajabheta Main Security Gate"
    },
    {
      id: "sanitation",
      name: "Sanitation & Grounds Management",
      email: "grounds-waste@dibru.ac.in",
      whatsapp: "913732370235",
      locationHint: "University Estate & Horticulture Wing"
    },
    {
      id: "hostels",
      name: "Hostels & Student Housing Board",
      email: "hostel-warden@dibru.ac.in",
      whatsapp: "913732370236",
      locationHint: "Dean of Student Affairs, Chatra Nivas Complex"
    },
    {
      id: "labs",
      name: "Academic Labs & Classroom Tech",
      email: "academic-tech@dibru.ac.in",
      whatsapp: "913732370237",
      locationHint: "DUIET & Science Complex, Room 210"
    }
  ],
  categories: [
    {
      id: "water",
      name: "Water & Plumbing",
      description: "Leaking pipes, broken taps, washroom issues, low pressure or water supply failure.",
      officeId: "facilities"
    },
    {
      id: "power",
      name: "Power & Lighting",
      description: "Broken pathway lights, flickering fixtures, tripped breakers, dead electrical sockets.",
      officeId: "electrical"
    },
    {
      id: "wifi",
      name: "Wi-Fi & Connectivity",
      description: "Dead signal spots, frequent drops, authentication failures, damaged Ethernet ports.",
      officeId: "it-network"
    },
    {
      id: "safety",
      name: "Safety & Emergency Post",
      description: "Unlit corners, broken emergency call boxes, hazardous walkways, access door defects.",
      officeId: "security"
    },
    {
      id: "waste",
      name: "Waste & Sanitation",
      description: "Overflowing trash bins, broken recycling units, litter on walkways, bio-waste cleanup.",
      officeId: "sanitation"
    },
    {
      id: "hostel",
      name: "Hostel & Residence",
      description: "Dormitory maintenance, broken furniture, lock repairs, mess or laundry faults.",
      officeId: "hostels"
    },
    {
      id: "labs",
      name: "Labs & Classrooms",
      description: "Faulty projectors, lab ventilation fans, air conditioning, AV system outages.",
      officeId: "labs"
    }
  ],
  locations: [
    "Padmanath Gohain Baruah Chatra Nivas (Hostel Block A)",
    "Joymati Chatri Nivas (Hostel Block B)",
    "Lakshminath Bezbaroa Central Library",
    "DUIET Engineering Workshop & Maker Lab",
    "North Academic Block & Science Complex",
    "Rangghar Auditorium & Main Quadrangle",
    "Administrative Building & Registrar Office",
    "University Health Centre & Main Security Gate",
    "Bhojraj Sethi Indoor Stadium & Sports Arena",
    "Vishnu Rabha Bhawan & Student Center"
  ],
  faq: [
    {
      question: "Do I need to sign up or create an account?",
      answer: "No. Anyone on Dibrugarh University campus can report an issue without a password. Your report is pinned on the live OpenStreetMap as a Red Pin until solved."
    },
    {
      question: "How does the Red Pin on the Dibrugarh University map work?",
      answer: "When you report an issue (with GPS accuracy and an optional location photo), a Red Pin is placed at those exact coordinates on the Dibrugarh University OpenStreetMap. As soon as an official marks the issue Completed, the Red Pin is removed automatically."
    },
    {
      question: "How can I include a photo and GPS coordinates of the issue?",
      answer: "Use the 'Use Live GPS' button in the report form (or click directly on the Dibrugarh University map) and attach a photo of the problem spot. Your photo will appear inside the Red Pin popup on the map."
    }
  ]
};

export function isConfigured(config: AppConfig = campusConfig): boolean {
  if (!config.offices || config.offices.length === 0) return false;
  if (!config.categories || config.categories.length === 0) return false;
  if (!config.locations || config.locations.length === 0) return false;
  const hasValidOffice = config.offices.every(o => o.email.length > 0 || o.whatsapp.length > 0);
  return hasValidOffice;
}
