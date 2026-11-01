import React from 'react';
import { FileEdit, CheckSquare, ShieldCheck, BookmarkCheck } from 'lucide-react';

export const How: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Report an Issue',
      description: 'Describe the issue and select the campus spot. No login or password required.',
      icon: FileEdit,
      badge: 'Open to Everyone',
    },
    {
      num: '02',
      title: 'Routed to Department',
      description: 'Automatically assigns priority and sends the complaint to the owning campus post.',
      icon: CheckSquare,
      badge: 'Auto-Routed',
    },
    {
      num: '03',
      title: 'Official Approval & Action',
      description: 'Department officers approve the issue and check off Problem Seen, Solving, Delivered, and Completed.',
      icon: ShieldCheck,
      badge: 'Officials Only',
    },
    {
      num: '04',
      title: 'Track Live Status',
      description: 'Enter your Complaint ID below to view the 4-stage resolution timeline and official updates.',
      icon: BookmarkCheck,
      badge: 'Read-Only Tracker',
    },
  ];

  return (
    <section
      id="how"
      className="relative w-full bg-[#EEF7EE] text-[#134E2C] py-14 md:py-20 px-4 sm:px-8 md:px-14 border-b border-[#0036FF]/15"
      aria-label="How CivicSense Works"
    >
      <div className="max-w-[1480px] mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <span className="imp-badge mb-2">4-STEP WORKFLOW</span>
            <h2 className="font-anton text-3xl sm:text-4xl text-[#134E2C]">
              How It Works
            </h2>
          </div>
          <p className="font-archivo text-xs sm:text-sm text-[#1EA854] font-semibold">
            Simple reporting for students · Verified checklist for officials
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((st) => {
            const Icon = st.icon;
            return (
              <div
                key={st.num}
                className="how-step-card bg-[#FFFFFF] border border-[#0036FF]/25 p-5 flex flex-col justify-between shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="imp-badge">
                      {st.num} · {st.badge}
                    </span>
                    <div className="w-8 h-8 bg-[#0036FF] text-[#B5F800] flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="font-anton text-xl text-[#134E2C] mb-1.5">
                    {st.title}
                  </h3>
                  <p className="font-archivo text-xs text-[#134E2C] leading-relaxed">
                    {st.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
