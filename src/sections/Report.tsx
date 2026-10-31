import React from 'react';
import { ReportForm } from '@/components/ReportForm';
import { MyReports } from '@/components/MyReports';

interface ReportProps {
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export const Report: React.FC<ReportProps> = ({ selectedCategory, onCategoryChange }) => {
  return (
    <section
      id="report"
      className="relative w-full bg-[#FAF2EB] text-[#1EA854] py-20 md:py-32 px-4 md:px-0 border-b border-[#1EA854]/15"
      aria-label="Submit Campus Report"
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
        <span className="label-mono-tracking rotate-[-90deg] origin-center text-[#0036FF]">05 / 06</span>
        <span className="label-mono-tracking rotate-[-90deg] origin-center text-[#1EA854]">REPORT</span>
        <span className="label-mono-tracking rotate-[-90deg] origin-center text-[#1EA854]">DISPATCH</span>
        <span className="label-mono-tracking rotate-[-90deg] origin-center text-[#0036FF]">05 / 06</span>
      </div>
      <div
        className="hidden md:flex flex-col items-center justify-between absolute top-12 bottom-12 pointer-events-none z-10"
        style={{ right: 'calc(var(--side) / 2)', transform: 'translateX(50%)' }}
        aria-hidden="true"
      >
        <span className="label-mono-tracking rotate-90 origin-center text-[#0036FF]">05 / 06</span>
        <span className="label-mono-tracking rotate-90 origin-center text-[#1EA854]">DISPATCH</span>
        <span className="label-mono-tracking rotate-90 origin-center text-[#1EA854]">REPORT</span>
        <span className="label-mono-tracking rotate-90 origin-center text-[#0036FF]">05 / 06</span>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 md:px-8">
        {/* Section Heading */}
        <div className="mb-10 text-center flex flex-col items-center">
          <span className="font-archivo font-black text-xs tracking-widest text-[#0036FF] uppercase">
            [ 05 / INSTANT ACTION ]
          </span>
          <h2 className="font-anton text-4xl sm:text-5xl md:text-6xl text-[#1EA854] tracking-wide uppercase mt-2">
            DISPATCH YOUR REPORT
          </h2>
          <p className="mt-2 font-serif italic text-sm sm:text-base text-[#1EA854] max-w-lg mx-auto">
            Fill the plain form below. Choose Email or WhatsApp to hand off directly to campus authorities.
          </p>
        </div>

        {/* The Main Report Form Card (Crisp White with Electric Blue Accent) */}
        <div className="report-form-card mb-16 shadow-lg">
          <ReportForm
            selectedCategory={selectedCategory}
            onCategoryChange={onCategoryChange}
          />
        </div>

        {/* Local My Reports Log */}
        <MyReports />
      </div>
    </section>
  );
};
