import React from 'react';
import { campusConfig } from '@/config';
import { ArrowRight, Building2 } from 'lucide-react';

interface CategoriesProps {
  onSelectCategory: (categoryId: string) => void;
}

export const Categories: React.FC<CategoriesProps> = ({ onSelectCategory }) => {
  const getOffice = (officeId: string) => {
    return campusConfig.offices.find((o) => o.id === officeId);
  };

  const handleSelectAndScroll = (categoryId: string) => {
    onSelectCategory(categoryId);
    const reportSection = document.getElementById('report');
    if (reportSection) {
      reportSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="categories"
      className="relative w-full bg-[#FAF2EB] text-[#134E2C] py-14 md:py-20 px-4 sm:px-8 md:px-14 border-b border-[#0036FF]/15"
      aria-label="Issue Categories"
    >
      <div className="max-w-[1480px] mx-auto">
        {/* Clean Minimal Section Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <span className="imp-badge mb-2">CAMPUS JURISDICTIONS</span>
            <h2 className="font-anton text-3xl sm:text-4xl text-[#134E2C]">
              Issue Categories
            </h2>
          </div>
          <p className="font-archivo text-xs sm:text-sm text-[#1EA854] font-semibold">
            Select a category to report directly to its owning campus department.
          </p>
        </div>

        {/* Simple, Easy-to-Understand Category Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {campusConfig.categories.map((cat, idx) => {
            const office = getOffice(cat.officeId);
            return (
              <div
                key={cat.id}
                onClick={() => handleSelectAndScroll(cat.id)}
                className="category-row bg-[#FFFFFF] border border-[#0036FF]/25 hover:border-[#0036FF] p-5 flex flex-col justify-between transition-all cursor-pointer group shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="imp-badge">0{idx + 1}</span>
                    <span className="font-archivo text-[11px] font-bold text-[#1EA854] flex items-center gap-1 truncate">
                      <Building2 className="w-3.5 h-3.5 text-[#0036FF] shrink-0" />
                      <span className="truncate">{office?.name || cat.officeId}</span>
                    </span>
                  </div>

                  <h3 className="font-anton text-xl text-[#134E2C] group-hover:text-[#0036FF] transition-colors">
                    {cat.name}
                  </h3>
                  <p className="font-archivo text-xs text-[#134E2C] mt-1.5 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1EA854]/20 flex items-center justify-between">
                  <span className="font-archivo font-bold text-xs text-[#0036FF] group-hover:text-[#1EA854]">
                    Report Issue
                  </span>
                  <div className="w-7 h-7 bg-[#0036FF] text-[#B5F800] group-hover:bg-[#1EA854] group-hover:text-[#FFFFFF] flex items-center justify-center transition-colors">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
