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

export interface AppConfig {
  siteName: string;
  campusName: string;
  emergencyPhone: string;
  offices: Office[];
  categories: Category[];
  locations: string[];
  faq: FAQItem[];
}

export const campusConfig: AppConfig = {
  siteName: "CivicSense",
  campusName: "University Campus Central",
  emergencyPhone: "+1 (800) 555-0199",
  offices: [
    {
      id: "facilities",
      name: "Facility Operations & Plumbing",
      email: "facilities@campus.edu",
      whatsapp: "15550198001",
      locationHint: "North Service Depot, Bay 2"
    },
    {
      id: "electrical",
      name: "Electrical Maintenance & Power",
      email: "power-maintenance@campus.edu",
      whatsapp: "15550198002",
      locationHint: "Substation West, Room 104"
    },
    {
      id: "it-network",
      name: "Campus IT & Wi-Fi Services",
      email: "network-helpdesk@campus.edu",
      whatsapp: "15550198003",
      locationHint: "Central Library, Level 1 IT Bar"
    },
    {
      id: "security",
      name: "Campus Safety & Security Command",
      email: "safety-control@campus.edu",
      whatsapp: "15550198004",
      locationHint: "Main Gate Security House"
    },
    {
      id: "sanitation",
      name: "Sanitation & Grounds Management",
      email: "grounds-waste@campus.edu",
      whatsapp: "15550198005",
      locationHint: "Environmental Services Building"
    },
    {
      id: "hostels",
      name: "Hostels & Student Housing Board",
      email: "hostel-warden@campus.edu",
      whatsapp: "15550198006",
      locationHint: "Student Residential Center, Desk A"
    },
    {
      id: "labs",
      name: "Academic Labs & Classroom Tech",
      email: "academic-tech@campus.edu",
      whatsapp: "15550198007",
      locationHint: "Science Complex, Rm 210"
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
      description: "Dormitory heating, broken furniture, lock repairs, laundry facility faults.",
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
    "North Academic Block (NAB)",
    "South Science & Research Complex",
    "Central Library & Study Commons",
    "Student Center & Dining Hall",
    "Hostel Block A (East Wing)",
    "Hostel Block B (West Wing)",
    "Graduate Residences",
    "Campus Recreation & Sports Arena",
    "Main Quadrangle & Outer Perimeter Path",
    "Engineering Workshop & Maker Lab"
  ],
  faq: [
    {
      question: "Do I need to sign up or create an account?",
      answer: "No. CivicSense requires no accounts, passwords, or logins. You fill out the report and it sends directly through your own email or WhatsApp."
    },
    {
      question: "Who receives my report?",
      answer: "Your message goes directly to the campus department responsible for that category (e.g. Facilities, IT Services, Hostel Office) using the verified contacts in our system."
    },
    {
      question: "How can I include photos or videos of the issue?",
      answer: "Since CivicSense does not store files on any server, please attach photos or videos directly inside your email client or WhatsApp chat when sending the hand-off message."
    },
    {
      question: "Is my data stored on a server?",
      answer: "No. CivicSense has no backend or database. Your reports remain strictly private and are only saved to your browser's local storage for your personal reference."
    },
    {
      question: "What if an issue is an immediate emergency?",
      answer: "For life-threatening hazards, fire, or acute medical emergencies, call the Campus Security Emergency Hotline directly rather than submitting a standard report."
    }
  ]
};

// Check if contacts are configured
export function isConfigured(config: AppConfig = campusConfig): boolean {
  if (!config.offices || config.offices.length === 0) return false;
  if (!config.categories || config.categories.length === 0) return false;
  if (!config.locations || config.locations.length === 0) return false;
  const hasValidOffice = config.offices.every(o => o.email.length > 0 || o.whatsapp.length > 0);
  return hasValidOffice;
}
