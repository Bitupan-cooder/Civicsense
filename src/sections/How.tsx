import React from 'react';
import { FileEdit, CheckSquare, Send, BookmarkCheck } from 'lucide-react';

export const How: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'DESCRIBE',
      description: 'Tell us what happened, note the exact building or spot, and set urgency.',
      icon: FileEdit,
      actionHint: 'Under 30 seconds'
    },
    {
      num: '02',
      title: 'CHOOSE',
      description: 'Pick the department category so the issue routes to the responsible team.',
      icon: CheckSquare,
      actionHint: 'Auto-mapped contacts'
    },
    {
      num: '03',
      title: 'SEND',
      description: 'Hand off a formatted message directly via your email client or WhatsApp.',
      icon: Send,
      actionHint: 'One-tap dispatch'
    },
    {
      num: '04',
      title: 'KEEP A COPY',
      description: 'Your report stays stored on your own device browser to track and mark resolved.',
      icon: BookmarkCheck,
      actionHint: 'Zero servers'
    },
  ];

  return (
    <section
      id="how"
      className="relative w-full bg-[#FFFFFF] text-[#1EA854] py-20 md:py-32 px-4 md:px-0 border-b border-[#1EA854]/15"
      aria-label="How CivicSense Works"
    >
      {/* Frame: Two vertical 1px rules at --side */}
      <div
        className="absolute top-0 bottom-0 w-[1px] pointer-events-none z-10 hidden md:block"
        style={{ left: 'var(--side)', backgroundColor: 'var(--rule-blue)' }}
        aria-hidden="true"
      />
      <div
        className="absolute top-0 bottom-0 w-[1px] pointer-events-none z-10 hidden md:block"
        style={{ right: 'var(--side)', backgroundColor: 'var(--rule-blue)' }}
        aria-hidden="true"
      />

      {/* Side labels */}
      <div
        className="hidden md:flex flex-col items-center justify-between absolute top-12 bottom-12 pointer-events-none z-10"
        style={{ left: 'calc(var(--side) / 2)', transform: 'translateX(-50%)' }}
        aria-hidden="true"
      >
        <span className="label-mono-tracking rotate-[-90deg] origin-center text-[#0036FF]">04 / 06</span>
        <span className="label-mono-tracking rotate-[-90deg] origin-center text-[#1EA854]">HOW IT WORKS</span>
        <span className="label-mono-tracking rotate-[-90deg] origin-center text-[#1EA854]">ZERO FRICTION</span>
        <span className="label-mono-tracking rotate-[-90deg] origin-center text-[#0036FF]">04 / 06</span>
      </div>
      <div
        className="hidden md:flex flex-col items-center justify-between absolute top-12 bottom-12 pointer-events-none z-10"
        style={{ right: 'calc(var(--side) / 2)', transform: 'translateX(50%)' }}
        aria-hidden="true"
      >
        <span className="label-mono-tracking rotate-90 origin-center text-[#0036FF]">04 / 06</span>
        <span className="label-mono-tracking rotate-90 origin-center text-[#1EA854]">ZERO FRICTION</span>
        <span className="label-mono-tracking rotate-90 origin-center text-[#1EA854]">HOW IT WORKS</span>
        <span className="label-mono-tracking rotate-90 origin-center text-[#0036FF]">04 / 06</span>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 md:px-16">
        {/* Section Heading */}
        <div className="mb-14 md:mb-20 text-center max-w-2xl mx-auto">
          <span className="font-archivo font-black text-xs tracking-widest text-[#0036FF] uppercase">
            [ 04 / FAST FOUR-STEP HAND-OFF ]
          </span>
          <h2 className="font-anton text-4xl sm:text-5xl md:text-6xl text-[#1EA854] tracking-wide mt-2 uppercase">
            HOW CIVICSENSE WORKS
          </h2>
          <p className="mt-3 font-serif italic text-sm sm:text-base text-[#1EA854]">
            No password resets, no app store downloads. Just instant civic accountability.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((st, idx) => {
            const Icon = st.icon;
            return (
              <div
                key={idx}
                className="how-step-card bg-[#FAF2EB] border-t-4 border-[#0036FF] p-6 sm:p-8 flex flex-col justify-between shadow-2xs hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-anton text-3xl sm:text-4xl text-[#0036FF]">
                      {st.num}
                    </span>
                    <div className="w-10 h-10 bg-[#FFFFFF] border border-[#0036FF]/30 flex items-center justify-center text-[#0036FF]">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="font-anton text-2xl uppercase tracking-normal text-[#1EA854] mb-2">
                    {st.title}
                  </h3>
                  <p className="font-serif italic text-sm text-[#1EA854] leading-relaxed">
                    {st.description}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-[#1EA854]/15 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#9ABC05]" />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0036FF]">
                    {st.actionHint}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
