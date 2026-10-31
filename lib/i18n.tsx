'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Lang = 'en';

export const DICT = {
  en: {
    brand: 'CivicSense DU',
    eventBadge: 'ANAZORI v16.0 · PS-04',
    nav: {
      index: 'Index',
      voices: 'Flow',
      numbers: 'Live Stats',
      categories: 'Categories',
      resolved: 'Resolved Wall',
      report: 'Report Issue',
      myReports: 'My Reports',
      officer: 'Officer Queue',
      admin: 'Admin Map',
      login: 'Role Switch',
    },
    hero: {
      h1: 'Say it. Direct to Campus Redressal.',
      meta1: 'Dibrugarh University',
      meta2: 'AI Civic & Campus Issue Platform',
      lede: 'Report broken lights, water, Wi-Fi, hostel or lab faults in under 60 seconds. Auto-triaged by AI, routed to the exact department, tracked live.',
      tableNo: 'ID',
      tableIssue: 'Campus Issue',
      tableDept: 'Routed Dept',
      tableStatus: 'Status',
      figCaption: 'Fig. 1 — 3D Campus Block Cube. 27 modules: Signal (#FFC400) = Open, Green (#19C37D) = Resolved.',
      ctaPrimary: 'Report an Issue in 60s →',
      ctaTrack: 'Open Officer / Admin View',
    },
    lesson: {
      kicker: 'Pinned Walkthrough · How a Report Travels',
      steps: [
        { code: '01 / REPORT', title: 'File Issue in Under 60 Seconds', desc: 'Students file from a phone with a photo and a campus map pin in under 60 seconds.' },
        { code: '02 / AI TRIAGE', title: 'Intelligent AI Classification', desc: 'Assigns category & urgency, and flags duplicate reports across campus.' },
        { code: '03 / ROUTE', title: 'Direct to Department Queue', desc: 'Electrical, Water, IT/Wi-Fi, Hostel, Safety, or Lab officers see only their assigned queue.' },
        { code: '04 / RESOLVE', title: 'Live Status & Audit Trail', desc: 'Every state change notifies the reporter in real time with proof of fix and SLA tracking.' },
      ],
    },
    tumble: {
      enLine: 'SAY IT. DIRECT & ACTIONABLE.',
      asLine: 'DIBRUGARH UNIVERSITY CAMPUS GRID',
      sub: '— Verified SLA turnaround. Direct to the department officer.',
    },
    voices: {
      intro: 'Every campus report moves through three strict states on the same 12-column grid.',
      words: ['Report', 'Route', 'Resolve'],
      cards: [
        { wk: 'STEP 1 · < 60 SEC', dept: 'Student Reporter', body: 'Pin the exact hostel, department, or lane on the Dibrugarh University map and submit.' },
        { wk: 'STEP 2 · AI TRIAGE', dept: 'Auto-Categorised Queue', body: 'AI assigns category, SLA urgency, and duplicate score; human officers can override with one click.' },
        { wk: 'STEP 3 · VERIFIED', dept: 'Public Transparency', body: 'The reporter receives a live status trail, and the campus block cube turns green.' },
      ],
    },
    numbers: {
      title: 'Live Numbers',
      sub: 'REAL-TIME DATABASE METRICS · DIBRUGARH UNIVERSITY',
      openLabel: 'open & in-progress campus issues',
      resolvedLabel: 'issues resolved with full audit trail',
      avgHoursLabel: 'avg hours from report to resolution',
      deptsLabel: 'campus departments connected live',
      quote: '“Direct campus issue routing connected directly to university engineers and officers.”',
    },
    status: {
      submitted: 'Submitted',
      acknowledged: 'Acknowledged',
      in_progress: 'In Progress',
      resolved: 'Resolved',
    },
    urgency: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Urgent',
    },
  },
  as: {
    brand: 'CivicSense DU',
    eventBadge: 'ANAZORI v16.0 · PS-04',
    nav: {
      index: 'Index',
      voices: 'Flow',
      numbers: 'Live Stats',
      categories: 'Categories',
      resolved: 'Resolved Wall',
      report: 'Report Issue',
      myReports: 'My Reports',
      officer: 'Officer Queue',
      admin: 'Admin Map',
      login: 'Role Switch',
    },
    hero: {
      h1: 'Say it. Direct to Campus Redressal.',
      meta1: 'Dibrugarh University',
      meta2: 'AI Civic & Campus Issue Platform',
      lede: 'Report broken lights, water, Wi-Fi, hostel or lab faults in under 60 seconds. Auto-triaged by AI, routed to the exact department, tracked live.',
      tableNo: 'ID',
      tableIssue: 'Campus Issue',
      tableDept: 'Routed Dept',
      tableStatus: 'Status',
      figCaption: 'Fig. 1 — 3D Campus Block Cube. 27 modules: Signal (#FFC400) = Open, Green (#19C37D) = Resolved.',
      ctaPrimary: 'Report an Issue in 60s →',
      ctaTrack: 'Open Officer / Admin View',
    },
    lesson: {
      kicker: 'Pinned Walkthrough · How a Report Travels',
      steps: [
        { code: '01 / REPORT', title: 'File Issue in Under 60 Seconds', desc: 'Students file from a phone with a photo and a campus map pin in under 60 seconds.' },
        { code: '02 / AI TRIAGE', title: 'Intelligent AI Classification', desc: 'Assigns category & urgency, and flags duplicate reports across campus.' },
        { code: '03 / ROUTE', title: 'Direct to Department Queue', desc: 'Electrical, Water, IT/Wi-Fi, Hostel, Safety, or Lab officers see only their assigned queue.' },
        { code: '04 / RESOLVE', title: 'Live Status & Audit Trail', desc: 'Every state change notifies the reporter in real time with proof of fix and SLA tracking.' },
      ],
    },
    tumble: {
      enLine: 'SAY IT. DIRECT & ACTIONABLE.',
      asLine: 'DIBRUGARH UNIVERSITY CAMPUS GRID',
      sub: '— Verified SLA turnaround. Direct to the department officer.',
    },
    voices: {
      intro: 'Every campus report moves through three strict states on the same 12-column grid.',
      words: ['Report', 'Route', 'Resolve'],
      cards: [
        { wk: 'STEP 1 · < 60 SEC', dept: 'Student Reporter', body: 'Pin the exact hostel, department, or lane on the Dibrugarh University map and submit.' },
        { wk: 'STEP 2 · AI TRIAGE', dept: 'Auto-Categorised Queue', body: 'AI assigns category, SLA urgency, and duplicate score; human officers can override with one click.' },
        { wk: 'STEP 3 · VERIFIED', dept: 'Public Transparency', body: 'The reporter receives a live status trail, and the campus block cube turns green.' },
      ],
    },
    numbers: {
      title: 'Live Numbers',
      sub: 'REAL-TIME DATABASE METRICS · DIBRUGARH UNIVERSITY',
      openLabel: 'open & in-progress campus issues',
      resolvedLabel: 'issues resolved with full audit trail',
      avgHoursLabel: 'avg hours from report to resolution',
      deptsLabel: 'campus departments connected live',
      quote: '“Direct campus issue routing connected directly to university engineers and officers.”',
    },
    status: {
      submitted: 'Submitted',
      acknowledged: 'Acknowledged',
      in_progress: 'In Progress',
      resolved: 'Resolved',
    },
    urgency: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Urgent',
    },
  },
};

interface I18nCtx {
  lang: 'en';
  setLang: (l: any) => void;
  t: typeof DICT.en;
}

const LangContext = createContext<I18nCtx>({
  lang: 'en',
  setLang: () => {},
  t: DICT.en,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang] = useState<'en'>('en');

  useEffect(() => {
    document.documentElement.lang = 'en';
  }, []);

  const setLang = () => {};

  return (
    <LangContext.Provider value={{ lang: 'en', setLang, t: DICT.en }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
