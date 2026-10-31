import React from 'react';
import { campusConfig } from '@/config';
import { ArrowUpRight } from 'lucide-react';

interface CategoriesProps {
  onSelectCategory: (categoryId: string) => void;
}

export const Categories: React.FC<CategoriesProps> = ({ onSelectCategory }) => {
  const getOfficeName = (officeId: string) => {
    const office = campusConfig.offices.find((o) => o.id === officeId);
    return office ? office.name : officeId;
  };

  const handleCategoryClick = (categoryId: string) => {
    onSelectCategory(categoryId);
    const reportSection = document.getElementById('report');
    if (reportSection) {
      reportSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="categories"
      className="relative w-full bg-[#FAF2EB] text-[#1EA854] py-20 md:py-32 px-4 md:px-0 border-b border-[#1EA854]/15"
      aria-label="Issue Categories"
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
        <span className="label-mono-tracking rotate-[-90deg] origin-center text-[#0036FF]">03 / 06</span>
        <span className="label-mono-tracking rotate-[-90deg] origin-center text-[#1EA854]">CATEGORIES</span>
        <span className="label-mono-tracking rotate-[-90deg] origin-center text-[#1EA854]">CAMPUS ROUTING</span>
        <span className="label-mono-tracking rotate-[-90deg] origin-center text-[#0036FF]">03 / 06</span>
      </div>
      <div
        className="hidden md:flex flex-col items-center justify-between absolute top-12 bottom-12 pointer-events-none z-10"
        style={{ right: 'calc(var(--side) / 2)', transform: 'translateX(50%)' }}
        aria-hidden="true"
      >
        <span className="label-mono-tracking rotate-90 origin-center text-[#0036FF]">03 / 06</span>
        <span className="label-mono-tracking rotate-90 origin-center text-[#1EA854]">CAMPUS ROUTING</span>
        <span className="label-mono-tracking rotate-90 origin-center text-[#1EA854]">CATEGORIES</span>
        <span className="label-mono-tracking rotate-90 origin-center text-[#0036FF]">03 / 06</span>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 md:px-16">
        {/* Section Heading */}
        <div className="mb-14 md:mb-20 text-center max-w-2xl mx-auto">
          <span className="font-archivo font-black text-xs tracking-widest text-[#0036FF] uppercase">
            [ 03 / ISSUE ROUTING DIRECTORY ]
          </span>
          <h2 className="font-anton text-4xl sm:text-5xl md:text-6xl text-[#1EA854] tracking-wide mt-2 uppercase">
            CAMPUS JURISDICTIONS
          </h2>
          <p className="mt-3 font-serif italic text-sm sm:text-base text-[#1EA854]">
            Every concern is automatically assigned to its dedicated campus engineering or administration desk.
          </p>
        </div>

        {/* Categories Stack */}
        <div className="divide-y divide-[#1EA854]/15 border-y border-[#1EA854]/20">
          {campusConfig.categories.map((cat, idx) => (
            <div
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className="category-row group bg-[#FFFFFF] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer transition-all duration-200 hover:bg-[#0036FF] hover:text-[#FFFFFF] shadow-2xs my-1.5"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCategoryClick(cat.id);
                }
              }}
              aria-label={`Select category ${cat.name}`}
            >
              {/* Left Column: Number & Name */}
              <div className="flex items-start sm:items-center gap-4 sm:gap-6">
                <span className="font-archivo font-black text-sm sm:text-base text-[#0036FF] group-hover:text-[#B5F800] transition-colors">
                  [0{idx + 1}]
                </span>
                <div>
                  <h3 className="font-anton text-2xl sm:text-3xl md:text-4xl uppercase tracking-normal text-[#1EA854] group-hover:text-[#FFFFFF] transition-colors">
                    {cat.name}
                  </h3>
                  <p className="font-serif italic text-xs sm:text-sm text-[#1EA854] group-hover:text-[#FFFFFF]/90 mt-1 transition-colors">
                    {cat.description}
                  </p>
                </div>
              </div>

              {/* Right Column: Responsible Office & Arrow Action */}
              <div className="flex items-center justify-between md:justify-end gap-4 sm:gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-[#1EA854]/15 group-hover:border-transparent">
                <div className="text-left md:text-right">
                  <div className="font-archivo font-extrabold text-[10px] tracking-wider uppercase text-[#1EA854] group-hover:text-[#FFFFFF]/80 transition-colors">
                    ROUTES DIRECTLY TO:
                  </div>
                  <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[#1EA854] group-hover:text-[#B5F800] transition-colors mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9ABC05] group-hover:bg-[#B5F800]" />
                    {getOfficeName(cat.officeId)}
                  </div>
                </div>

                <div className="w-10 h-10 border border-[#1EA854]/20 group-hover:border-[#B5F800] group-hover:bg-[#B5F800] group-hover:text-[#0036FF] flex items-center justify-center transition-all flex-shrink-0">
                  <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
