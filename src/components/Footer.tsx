import React, { useState } from 'react';
import { ArrowUp, X } from 'lucide-react';

export const Footer: React.FC = () => {
  const [showCredits, setShowCredits] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <footer
        className="w-full bg-[#EEF7EE] text-[#134E2C] py-12 px-4 sm:px-8 md:px-14 border-t border-[#0036FF]/20 relative z-20"
        role="contentinfo"
      >
        <div className="max-w-[1480px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left: Impeccable-style Spaced Wordmark in Blue + Green */}
          <div className="flex items-center gap-3">
            <svg
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className="shrink-0 border border-[#0036FF]"
            >
              <rect width="20" height="20" fill="#B5F800" />
              <polygon points="0,0 13,0 7,20 0,20" fill="#0036FF" />
            </svg>
            <span className="font-archivo font-bold text-xs tracking-[0.28em] uppercase text-[#538306]">
              CIVICSENSE
            </span>
          </div>

          {/* Center Links */}
          <div className="flex flex-wrap items-center gap-6 font-archivo font-semibold text-xs text-[#1EA854]">
            <a href="#categories" className="hover:text-[#0036FF] transition-colors">
              Categories
            </a>
            <a href="#how" className="hover:text-[#0036FF] transition-colors">
              How it works
            </a>
            <a href="#report" className="hover:text-[#0036FF] transition-colors">
              Report Issue
            </a>
            <a href="#tracker" className="hover:text-[#0036FF] transition-colors">
              Status Tracker
            </a>
            <button
              type="button"
              onClick={() => setShowCredits(true)}
              className="hover:text-[#0036FF] underline underline-offset-4 cursor-pointer"
            >
              Vector Credits
            </button>
          </div>

          {/* Right: Back to Top */}
          <div className="flex items-center gap-4">
            <span className="font-archivo font-semibold text-xs text-[#0036FF]">
              Campus Redressal Portal
            </span>
            <button
              type="button"
              onClick={scrollToTop}
              className="bg-[#0036FF] text-[#B5F800] hover:bg-[#1EA854] hover:text-[#FFFFFF] px-3 py-1.5 font-archivo font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              aria-label="Scroll back to top"
            >
              <span>Top</span>
              <ArrowUp className="w-3.5 h-3.5 text-[#B5F800]" />
            </button>
          </div>
        </div>
      </footer>

      {/* Vector Credits Modal */}
      {showCredits && (
        <div
          className="fixed inset-0 z-50 bg-[#134E2C]/65 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="credits-title"
        >
          <div className="bg-[#FFFFFF] text-[#134E2C] max-w-lg w-full p-6 sm:p-8 border-2 border-[#0036FF] shadow-xl relative">
            <button
              type="button"
              onClick={() => setShowCredits(false)}
              className="absolute top-4 right-4 p-1 hover:bg-[#0036FF] hover:text-[#B5F800] transition-colors cursor-pointer"
              aria-label="Close Credits Modal"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="imp-badge mb-2">CREDITS & LICENSES</span>
            <h3 id="credits-title" className="font-anton text-2xl text-[#134E2C] mb-3">
              Illustration Attribution
            </h3>

            <div className="space-y-3 font-archivo text-xs text-[#134E2C] max-h-[60vh] overflow-y-auto pr-2">
              <p>
                All illustrations and iconography used in CivicSense adhere strictly to open licenses:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-[#0036FF]">campus-base.svg</strong>: Custom CivicSense Vector Quad (MIT License).
                </li>
                <li>
                  <strong className="text-[#0036FF]">tap-fix.svg, lamp-fix.svg, wifi-fix.svg, bins-fix.svg, safety-fix.svg</strong>: Custom vector fix models adapted under the unDraw Open License.
                </li>
                <li>
                  <strong className="text-[#0036FF]">student-reporter.svg</strong>: Pablo Stanley Open Doodles (CC0 1.0 Universal Public Domain).
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-[#1EA854]/20 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCredits(false)}
                className="bg-[#0036FF] text-[#B5F800] px-4 py-2 font-archivo font-bold text-xs hover:bg-[#1EA854] hover:text-[#FFFFFF] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
