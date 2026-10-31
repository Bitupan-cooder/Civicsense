import React from 'react';

export const About: React.FC = () => {
  const facts = [
    { label: 'FOR', value: 'STUDENTS & STAFF' },
    { label: 'HANDLES', value: 'ALL CAMPUS INFRA' },
    { label: 'SENT VIA', value: 'EMAIL OR WHATSAPP' },
    { label: 'GOES TO', value: 'THE RIGHT OFFICE' },
    { label: 'ACCOUNT', value: 'ZERO REGISTRATION' },
    { label: 'COST', value: '100% FREE & OPEN' },
  ];

  return (
    <section
      id="about"
      className="relative w-full bg-[#FFFFFF] text-[#1EA854] py-20 md:py-32 px-4 md:px-0 border-b border-[#1EA854]/15"
      aria-label="About CivicSense"
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
        <span className="label-mono-tracking rotate-[-90deg] origin-center text-[#0036FF]">02 / 06</span>
        <span className="label-mono-tracking rotate-[-90deg] origin-center text-[#1EA854]">ABOUT</span>
        <span className="label-mono-tracking rotate-[-90deg] origin-center text-[#1EA854]">PLAIN FACTS</span>
        <span className="label-mono-tracking rotate-[-90deg] origin-center text-[#0036FF]">02 / 06</span>
      </div>
      <div
        className="hidden md:flex flex-col items-center justify-between absolute top-12 bottom-12 pointer-events-none z-10"
        style={{ right: 'calc(var(--side) / 2)', transform: 'translateX(50%)' }}
        aria-hidden="true"
      >
        <span className="label-mono-tracking rotate-90 origin-center text-[#0036FF]">02 / 06</span>
        <span className="label-mono-tracking rotate-90 origin-center text-[#1EA854]">PLAIN FACTS</span>
        <span className="label-mono-tracking rotate-90 origin-center text-[#1EA854]">ABOUT</span>
        <span className="label-mono-tracking rotate-90 origin-center text-[#0036FF]">02 / 06</span>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 md:px-16">
        {/* Top Biodata Row: Mark & 6 Facts in 2x3 grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 pb-16 md:pb-24 border-b border-[#0036FF]/20">
          {/* Left Block: CivicSense Mark */}
          <div className="lg:col-span-4 flex flex-col items-start justify-center">
            <span className="font-archivo font-black text-xs tracking-widest text-[#0036FF] uppercase mb-4">
              [ CIVICSENSE ]
            </span>
            <div className="w-24 h-24 md:w-32 md:h-32 bg-[#0036FF] p-2 flex items-center justify-center text-[#FFFFFF] shadow-md border-2 border-[#B5F800]">
              {/* Crest Seal */}
              <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
                <circle cx="50" cy="50" r="46" fill="none" stroke="#FFFFFF" strokeWidth="4"/>
                <circle cx="50" cy="50" r="38" fill="none" stroke="#B5F800" strokeWidth="2" strokeDasharray="4 3"/>
                <polygon points="50,18 60,38 82,38 65,52 72,74 50,60 28,74 35,52 18,38 40,38" fill="#FFFFFF"/>
                <text x="50" y="88" fill="#B5F800" fontFamily="sans-serif" fontWeight="900" fontSize="10" textAnchor="middle" letterSpacing="2">CAMPUS</text>
              </svg>
            </div>
            <p className="mt-4 font-serif italic text-xs md:text-sm text-[#1EA854] leading-relaxed max-w-xs">
              Direct campus issue dispatch. Zero logins, zero intermediate servers, 100% transparent hand-off.
            </p>
          </div>

          {/* Right Block: Six Plain Facts (2x3 Grid with animate hooks) */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-6 md:gap-8 items-center">
            {facts.map((fact, idx) => (
              <div key={idx} className="about-fact bg-[#FAF2EB] border-l-4 border-[#0036FF] p-4 shadow-2xs">
                <div className="font-archivo font-extrabold text-[10px] md:text-xs tracking-widest text-[#0036FF] uppercase mb-1">
                  {fact.label}
                </div>
                <div className="font-archivo font-black text-sm sm:text-base md:text-[calc(26*var(--u))] leading-tight text-[#1EA854] uppercase">
                  {fact.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Introduction / Statement Card with Palatino Linotype typography */}
        <div className="about-statement mt-16 md:mt-24 relative bg-[#F5E8DC] border-2 border-[#0036FF]/50 p-8 sm:p-12 md:p-16 shadow-lg">
          {/* Corner Circles in Electric Blue & Bright Lime */}
          <div className="absolute -top-3 -left-3 md:-top-4 md:-left-4 w-6 h-6 md:w-8 md:h-8 bg-[#0036FF] rounded-full border-2 border-[#B5F800] z-10" />
          <div className="absolute -top-3 -right-3 md:-top-4 md:-right-4 w-6 h-6 md:w-8 md:h-8 bg-[#0036FF] rounded-full border-2 border-[#B5F800] z-10" />
          <div className="absolute -bottom-3 -left-3 md:-bottom-4 md:-left-4 w-6 h-6 md:w-8 md:h-8 bg-[#0036FF] rounded-full border-2 border-[#B5F800] z-10" />
          <div className="absolute -bottom-3 -right-3 md:-bottom-4 md:-right-4 w-6 h-6 md:w-8 md:h-8 bg-[#0036FF] rounded-full border-2 border-[#B5F800] z-10" />

          {/* Top Center Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 text-[#0036FF]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <circle cx="12" cy="11" r="3"/>
              </svg>
            </div>
          </div>

          <h3 className="font-anton text-2xl sm:text-3xl md:text-5xl text-center uppercase tracking-normal text-[#1EA854] mb-8">
            RESTORING CIVIC PRIDE ACROSS CAMPUS GROUNDS
          </h3>

          <div className="max-w-3xl mx-auto space-y-6 text-[#1EA854] font-serif text-base sm:text-lg md:text-xl leading-relaxed text-center">
            <p>
              When a pathway lamp goes dark, a fountain line drips, or Wi-Fi drops in the library quad, university life slows down. Too often, problems go unaddressed because no one knows which desk holds the repair ticket.
            </p>
            <p className="font-serif-italic font-semibold text-[#0036FF]">
              CivicSense bridges that gap. We bypass confusing multi-layer ticketing software with direct, verified routing to Estates, Electrical, IT, and Proctorial duty officers.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
