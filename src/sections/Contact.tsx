import React, { useState } from 'react';
import { campusConfig } from '@/config';
import { Mail, MessageCircle, ChevronDown, Building2 } from 'lucide-react';

export const Contact: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <section
      id="contact"
      className="relative w-full bg-[#FAF2EB] text-[#134E2C] py-14 md:py-20 px-4 sm:px-8 md:px-14 border-b border-[#0036FF]/15"
      aria-label="Campus Directory and FAQ"
    >
      <div className="max-w-[1480px] mx-auto space-y-14">
        {/* Duty Offices Grid */}
        <div>
          <div className="flex flex-wrap items-end justify-between gap-2 mb-6">
            <div>
              <span className="imp-badge mb-2">CAMPUS DIRECTORY</span>
              <h2 className="font-anton text-3xl sm:text-4xl text-[#134E2C]">
                Campus Duty Offices
              </h2>
            </div>
            <span className="font-archivo text-xs font-semibold text-[#1EA854]">
              Direct Email & WhatsApp dispatch channels
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campusConfig.offices.map((office, idx) => (
              <div
                key={office.id}
                className="bg-[#FFFFFF] border border-[#1EA854]/30 p-5 flex flex-col justify-between shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 bg-[#EEF7EE] border border-[#1EA854]/35 flex items-center justify-center text-[#0036FF]">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span className="imp-badge">0{idx + 1} · ACTIVE DESK</span>
                  </div>

                  <h3 className="font-anton text-xl text-[#134E2C] mb-1">
                    {office.name}
                  </h3>
                  {office.locationHint && (
                    <p className="font-archivo text-xs text-[#1EA854] font-medium mb-4">
                      {office.locationHint}
                    </p>
                  )}
                </div>

                <div className="space-y-2 pt-3 border-t border-[#1EA854]/20 text-xs font-archivo">
                  <a
                    href={`mailto:${office.email}`}
                    className="flex items-center gap-2 text-[#0036FF] hover:text-[#1EA854] font-semibold transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#1EA854]" />
                    <span>{office.email}</span>
                  </a>
                  <a
                    href={`https://wa.me/${office.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[#1EA854] hover:text-[#0036FF] font-semibold transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#0036FF]" />
                    <span>+{office.whatsapp}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clean FAQ Accordion */}
        <div className="pt-8 border-t border-[#1EA854]/20 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <span className="imp-badge mb-2">QUESTIONS</span>
            <h3 className="font-anton text-2xl sm:text-3xl text-[#134E2C]">
              Common Questions
            </h3>
          </div>

          <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#0036FF]/25 divide-y divide-[#1EA854]/20 shadow-2xs">
            {campusConfig.faq.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="p-4 sm:p-5">
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between text-left gap-4 cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full font-archivo text-xs font-bold flex items-center justify-center shrink-0 ${
                          isOpen
                            ? 'bg-[#0036FF] text-[#B5F800]'
                            : 'bg-[#EEF7EE] text-[#1EA854] border border-[#1EA854]/30'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="font-archivo font-bold text-sm text-[#134E2C]">
                        {item.question}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-[#0036FF] transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="pl-9 pt-2.5 font-archivo text-xs sm:text-sm text-[#134E2C] leading-relaxed">
                      <p>{item.answer}</p>
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
