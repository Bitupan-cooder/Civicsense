'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Lang } from './i18n';

export type CategoryId = 'water' | 'power' | 'wifi' | 'hostel' | 'safety' | 'lab';
export type ReportStatus = 'submitted' | 'acknowledged' | 'in_progress' | 'resolved';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';
export type UserRole = 'reporter' | 'officer' | 'admin';

export interface Department {
  id: string;
  nameEn: string;
  nameAs: string;
  category: CategoryId;
  slaHours: number;
}

export interface StatusEvent {
  status: ReportStatus;
  by: string;
  at: string;
  noteEn: string;
  noteAs: string;
}

export interface CampusReport {
  id: string;
  title: string;
  description: string;
  detectedLang: Lang;
  category: CategoryId;
  departmentId: string;
  urgency: UrgencyLevel;
  status: ReportStatus;
  locationName: string;
  lat: number;
  lng: number;
  upvotes: number;
  duplicateOf?: string | null;
  needsTriage?: boolean;
  anonymous: boolean;
  reporterEmail: string;
  createdAt: string;
  events: StatusEvent[];
}

export const DEPARTMENTS: Department[] = [
  { id: 'dept-water', nameEn: 'PHE & Water Supply Cell', nameAs: 'PHE & Water Supply Cell', category: 'water', slaHours: 6 },
  { id: 'dept-power', nameEn: 'Campus Electrical Division', nameAs: 'Campus Electrical Division', category: 'power', slaHours: 4 },
  { id: 'dept-wifi', nameEn: 'CCSA & Campus Network Centre', nameAs: 'CCSA & Campus Network Centre', category: 'wifi', slaHours: 8 },
  { id: 'dept-hostel', nameEn: 'Hostel Warden & Estate Office', nameAs: 'Hostel Warden & Estate Office', category: 'hostel', slaHours: 12 },
  { id: 'dept-safety', nameEn: 'Campus Security & Proctorial Board', nameAs: 'Campus Security & Proctorial Board', category: 'safety', slaHours: 2 },
  { id: 'dept-lab', nameEn: 'Central Workshop & Lab Maintenance', nameAs: 'Central Workshop & Lab Maintenance', category: 'lab', slaHours: 10 },
];

export const INITIAL_REPORTS: CampusReport[] = [
  {
    id: 'DU-2601',
    title: 'Drinking water RO filter malfunctioning on 2nd floor of Padum Kunwari Girls Hostel',
    description: 'The RO drinking water unit near the 2nd floor common room is not dispensing water and has a minor electrical shock hazard on the casing. Please inspect immediately.',
    detectedLang: 'en',
    category: 'water',
    departmentId: 'dept-water',
    urgency: 'critical',
    status: 'in_progress',
    locationName: 'Padum Kunwari Girls Hostel',
    lat: 27.4512,
    lng: 94.8958,
    upvotes: 19,
    anonymous: false,
    reporterEmail: 'ashima.bora@dibru.ac.in',
    createdAt: '2026-10-31T06:30:00Z',
    events: [
      { status: 'submitted', by: 'Student Reporter', at: '08:10 AM', noteEn: 'Filed with campus map pin.', noteAs: 'Filed with campus map pin.' },
      { status: 'acknowledged', by: 'PHE Officer', at: '08:12 AM', noteEn: 'Auto-routed to PHE & Water Supply (Urgent).', noteAs: 'Auto-routed to PHE & Water Supply (Urgent).' },
      { status: 'in_progress', by: 'Er. P. Gogoi (PHE)', at: '09:30 AM', noteEn: 'Technician dispatched with replacement solenoid valve.', noteAs: 'Technician dispatched with replacement solenoid valve.' },
    ],
  },
  {
    id: 'DU-2602',
    title: 'Streetlight pole sparking near Bishnu Rabha Rangamancha',
    description: 'The halogen street lamp on the main road towards the auditorium is flickering and dropping sparks after rain.',
    detectedLang: 'en',
    category: 'power',
    departmentId: 'dept-power',
    urgency: 'critical',
    status: 'acknowledged',
    locationName: 'Bishnu Rabha Rangamancha Road',
    lat: 27.4489,
    lng: 94.8984,
    upvotes: 14,
    anonymous: false,
    reporterEmail: 'rituraj.kalita@dibru.ac.in',
    createdAt: '2026-10-31T07:45:00Z',
    events: [
      { status: 'submitted', by: 'Student Reporter', at: '09:15 AM', noteEn: 'Submitted with location pin.', noteAs: 'Submitted with location pin.' },
      { status: 'acknowledged', by: 'Electrical Division', at: '09:22 AM', noteEn: 'Feeder isolated; lineman assigned.', noteAs: 'Feeder isolated; lineman assigned.' },
    ],
  },
  {
    id: 'DU-2603',
    title: 'CCSA Computer Lab 2 Wi-Fi connectivity down since morning',
    description: 'Network connectivity is critically required for lab sessions, but the main access point is blinking red with no gateway response.',
    detectedLang: 'en',
    category: 'wifi',
    departmentId: 'dept-wifi',
    urgency: 'high',
    status: 'resolved',
    locationName: 'Centre for Computer Studies & Applications (CCSA)',
    lat: 27.4504,
    lng: 94.8965,
    upvotes: 31,
    anonymous: false,
    reporterEmail: 'manash.saikia@dibru.ac.in',
    createdAt: '2026-10-30T11:20:00Z',
    events: [
      { status: 'submitted', by: 'Student Reporter', at: 'Yesterday, 04:50 PM', noteEn: 'Reported via campus issue portal.', noteAs: 'Reported via campus issue portal.' },
      { status: 'acknowledged', by: 'CCSA Network Desk', at: 'Yesterday, 04:55 PM', noteEn: 'Switch port reset initiated.', noteAs: 'Switch port reset initiated.' },
      { status: 'in_progress', by: 'Network Engineer', at: 'Yesterday, 05:20 PM', noteEn: 'Replaced SFP fiber module on Floor 2.', noteAs: 'Replaced SFP fiber module on Floor 2.' },
      { status: 'resolved', by: 'CCSA Network Desk', at: 'Yesterday, 06:05 PM', noteEn: '300 Mbps link restored & verified.', noteAs: '300 Mbps link restored & verified.' },
    ],
  },
  {
    id: 'DU-2604',
    title: 'Water pipe burst causing flooding in Miles Bronson Boys Hostel ground floor',
    description: 'Pipeline leak in the south wing ground floor bathroom block is flooding the corridor and veranda.',
    detectedLang: 'en',
    category: 'hostel',
    departmentId: 'dept-hostel',
    urgency: 'high',
    status: 'submitted',
    locationName: 'Miles Bronson Boys Hostel',
    lat: 27.4478,
    lng: 94.8945,
    upvotes: 9,
    anonymous: true,
    reporterEmail: 'anonymous@dibru.ac.in',
    createdAt: '2026-10-31T10:15:00Z',
    events: [
      { status: 'submitted', by: 'Anonymous Student', at: '10:15 AM', noteEn: 'Filed anonymously via mobile.', noteAs: 'Filed anonymously via mobile.' },
    ],
  },
  {
    id: 'DU-2605',
    title: 'Oscilloscope bench earthing fault in Electronics Lab',
    description: 'Bench 4 in the Physics & Electronics instrumentation lab shows 45V leakage on chassis ground.',
    detectedLang: 'en',
    category: 'lab',
    departmentId: 'dept-lab',
    urgency: 'high',
    status: 'resolved',
    locationName: 'Department of Physics & Electronics',
    lat: 27.4509,
    lng: 94.8992,
    upvotes: 7,
    anonymous: false,
    reporterEmail: 'debajit.baruah@dibru.ac.in',
    createdAt: '2026-10-29T09:00:00Z',
    events: [
      { status: 'submitted', by: 'Lab Scholar', at: '29 Oct, 09:00 AM', noteEn: 'Filed with bench photo.', noteAs: 'Filed with bench photo.' },
      { status: 'resolved', by: 'Central Workshop', at: '29 Oct, 01:15 PM', noteEn: 'Re-terminated copper earth busbar.', noteAs: 'Re-terminated copper earth busbar.' },
    ],
  },
  {
    id: 'DU-2606',
    title: 'No lighting and malfunctioning CCTV at Lakshminath Bezbaroa Library cycle stand',
    description: 'The cycle stand area is completely unlit after 7:00 PM when students leave the library. Security floodlights required.',
    detectedLang: 'en',
    category: 'safety',
    departmentId: 'dept-safety',
    urgency: 'medium',
    status: 'in_progress',
    locationName: 'Lakshminath Bezbaroa Library',
    lat: 27.4496,
    lng: 94.8975,
    upvotes: 24,
    anonymous: false,
    reporterEmail: 'priyanka.dutta@dibru.ac.in',
    createdAt: '2026-10-30T14:00:00Z',
    events: [
      { status: 'submitted', by: 'Student Reporter', at: '30 Oct, 02:00 PM', noteEn: 'Filed via student portal.', noteAs: 'Filed via student portal.' },
      { status: 'in_progress', by: 'Security Officer', at: '30 Oct, 05:00 PM', noteEn: 'Temporary floodlight installed; CCTV PoE cable ordered.', noteAs: 'Temporary floodlight installed; CCTV PoE cable ordered.' },
    ],
  },
];

interface StoreCtx {
  reports: CampusReport[];
  role: UserRole;
  activeDeptId: string;
  setRole: (r: UserRole) => void;
  setActiveDeptId: (d: string) => void;
  addReport: (r: CampusReport) => void;
  updateStatus: (id: string, nextStatus: ReportStatus, noteEn: string, noteAs?: string, by?: string) => void;
  reassignDepartment: (id: string, departmentId: string, category: CategoryId) => void;
  upvoteReport: (id: string) => void;
}

const StoreContext = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [reports, setReports] = useState<CampusReport[]>(INITIAL_REPORTS);
  const [role, setRole] = useState<UserRole>('reporter');
  const [activeDeptId, setActiveDeptId] = useState<string>('dept-water');

  useEffect(() => {
    const saved = localStorage.getItem('civicsense_reports_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setReports(parsed);
        }
      } catch (e) {
        console.error('Failed to parse cached reports', e);
      }
    }
  }, []);

  const persist = (next: CampusReport[]) => {
    setReports(next);
    localStorage.setItem('civicsense_reports_v1', JSON.stringify(next));
  };

  const addReport = (report: CampusReport) => {
    const next = [report, ...reports];
    persist(next);
  };

  const updateStatus = (
    id: string,
    nextStatus: ReportStatus,
    noteEn: string,
    noteAs?: string,
    by: string = 'Campus Officer'
  ) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const next = reports.map((r) => {
      if (r.id !== id) return r;
      return {
        ...r,
        status: nextStatus,
        events: [...r.events, { status: nextStatus, by, at: now, noteEn, noteAs: noteAs || noteEn }],
      };
    });
    persist(next);
  };

  const reassignDepartment = (id: string, departmentId: string, category: CategoryId) => {
    const next = reports.map((r) =>
      r.id === id ? { ...r, departmentId, category, needsTriage: false } : r
    );
    persist(next);
  };

  const upvoteReport = (id: string) => {
    const next = reports.map((r) =>
      r.id === id
        ? {
            ...r,
            upvotes: r.upvotes + 1,
            urgency: r.upvotes + 1 >= 15 && r.urgency === 'medium' ? 'high' : r.urgency,
          }
        : r
    );
    persist(next);
  };

  return (
    <StoreContext.Provider
      value={{
        reports,
        role,
        activeDeptId,
        setRole,
        setActiveDeptId,
        addReport,
        updateStatus,
        reassignDepartment,
        upvoteReport,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

const DEFAULT_STORE_VALUE: StoreCtx = {
  reports: INITIAL_REPORTS,
  role: 'reporter',
  activeDeptId: 'all',
  setRole: () => {},
  setActiveDeptId: () => {},
  addReport: () => ({ id: '' } as any),
  updateStatus: () => {},
  reassignDepartment: () => {},
  upvoteReport: () => {},
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  return ctx || DEFAULT_STORE_VALUE;
};
