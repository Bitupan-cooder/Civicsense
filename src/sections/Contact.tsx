import React, { useState } from 'react';
import { campusConfig, isConfigured } from '@/config';
import { Mail, MessageCircle, ChevronDown, PhoneCall, Building2 } from 'lucide-react';

export const Contact: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const configured = isConfigured();

  return (
    <section
      id="contact"
      className="relative w-full bg-[#FFFFFF] text-[#1EA854] py-20 md:py-32 px-4 md:px-0 border-b border-[#1EA854]/15"
      aria-label="Campus Directory and FAQ"
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
        <span className="label-mono-tracking rotate-[-90deg] origin-center text-[#0036FF]">06 / 06</span>
        <span className="label-mono-tracking rotate-[-90deg] origin-center text-[#1EA854]">CONTACT & FAQ</span>
        <span className="label-mono-tracking rotate-[-90deg] origin-center text-[#1EA854]">DUTY DESKS</span>
        <span className="label-mono-tracking rotate-[-90deg] origin-center text-[#0036FF]">06 / 06</span>
      </div>
      <div
        className="hidden md:flex flex-col items-center justify-between absolute top-12 bottom-12 pointer-events-none z-10"
        style={{ right: 'calc(var(--side) / 2)', transform: 'translateX(50%)' }}
        aria-hidden="true"
      >
        <span className="label-mono-tracking rotate-90 origin-center text-[#0036FF]">06 / 06</span>
        <span className="label-mono-tracking rotate-90 origin-center text-[#1EA854]">DUTY DESKS</span>
        <span className="label-mono-tracking rotate-90 origin-center text-[#1EA854]">CONTACT & FAQ</span>
        <span className="label-mono-tracking rotate-90 origin-center text-[#0036FF]">06 / 06</span>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 md:px-16">
        {/* Section Header */}
        <div className="mb-14 md:mb-20 text-center max-w-2xl mx-auto">
          <span className="font-archivo font-black text-xs tracking-widest text-[#0036FF] uppercase">
            [ 06 / CAMPUS DESKS & ANSWERS ]
          </span>
          <h2 className="font-anton text-3xl sm:text-4xl md:text-5xl text-[#1EA854] tracking-wide mt-2 uppercase">
            DUTY DIRECTORY & FAQ
          </h2>
          <p className="mt-2 font-serif italic text-xs sm:text-sm text-[#1EA854]">
            Direct institutional contact points for Dibrugarh University redressal.
          </p>
        </div>

        {/* Office Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {campusConfig.offices.map((office) => (
            <div
              key={office.id}
              className="bg-[#FAF2EB] border-t-4 border-[#0036FF] p-6 flex flex-col justify-between shadow-2xs hover:shadow-sm transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-8 h-8 bg-[#FFFFFF] border border-[#0036FF]/30 flex items-center justify-center text-[#0036FF]">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#B5F800] uppercase bg-[#1EA854] px-2 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B5F800]" />
                    ACTIVE DESK
                  </span>
                </div>

                <h3 className="font-anton text-xl uppercase tracking-normal text-[#1EA854] mb-2">
                  {office.name}
                </h3>
                {office.locationHint && (
                  <p className="font-serif italic text-xs text-[#1EA854] mb-6">
                    {office.locationHint}
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-4 border-t border-[#1EA854]/15 text-xs font-archivo">
                <a
                  href={`mailto:${office.email}`}
                  className="flex items-center gap-2 text-[#1EA854] hover:text-[#0036FF] font-bold transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-[#0036FF]" />
                  <span>{office.email}</span>
                </a>
                <a
                  href={`https://wa.me/${office.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#1EA854] hover:text-[#0036FF] font-bold transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-[#9ABC05]" />
                  <span>+{office.whatsapp}</span>
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto pt-8 border-t border-[#1EA854]/20">
          <h3 className="font-anton text-2xl uppercase tracking-normal text-[#1EA854] text-center mb-8">
            FREQUENTLY ASKED QUESTIONS
          </h3>

          <div className="divide-y divide-[#1EA854]/15 border-y border-[#1EA854]/20">
            {campusConfig.faq.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between text-left font-archivo font-black text-sm sm:text-base text-[#1EA854] hover:text-[#0036FF] transition-colors py-1"
                    aria-expanded={isOpen}
                  >
                    <span>{item.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#0036FF] transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="pt-2 pb-1 font-serif italic text-xs sm:text-sm text-[#1EA854] leading-relaxed">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
