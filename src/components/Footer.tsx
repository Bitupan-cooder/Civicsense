import React, { useState } from 'react';
import { ArrowUp, ShieldCheck, X } from 'lucide-react';

export const Footer: React.FC = () => {
  const [showCredits, setShowCredits] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <footer
        className="w-full bg-[#1EA854] text-[#FFFFFF] py-16 md:py-24 px-4 sm:px-8 border-t border-[#FFFFFF]/15 relative z-20"
        role="contentinfo"
      >
        <div className="max-w-[1200px] mx-auto">
          {/* Top Bar: Wordmark & Back to Top */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 border-b border-[#FFFFFF]/15">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 bg-[#B5F800]" />
                <span className="font-archivo font-extrabold text-xs tracking-widest text-[#B5F800] uppercase">
                  CIVICSENSE CAMPUS DISPATCH
                </span>
              </div>
              <h2 className="font-anton text-4xl sm:text-6xl md:text-8xl tracking-normal text-[#FFFFFF] uppercase leading-none">
                CIVICSENSE
              </h2>
              <p className="font-serif italic text-sm text-[#FAF2EB] mt-2">
                Crafted with Palatino Linotype typography for clear, legible campus governance.
              </p>
            </div>

            <button
              type="button"
              onClick={scrollToTop}
              className="self-start md:self-end border border-[#FFFFFF]/40 hover:border-[#B5F800] hover:bg-[#0036FF] hover:text-[#B5F800] px-5 py-3 font-archivo font-black text-xs uppercase tracking-wider text-[#FFFFFF] flex items-center gap-2 transition-colors focus-ring-lime"
              aria-label="Scroll back to top"
            >
              <span>BACK TO TOP</span>
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>

          {/* Middle & Bottom Notice */}
          <div className="pt-10 flex flex-col md:flex-row md:items-center justify-between gap-6 font-archivo text-xs text-[#FAF2EB]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#B5F800]" />
              <p className="font-bold uppercase tracking-wider text-[#FFFFFF]">
                Zero logins. Nothing is stored on intermediate servers.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <button
                type="button"
                onClick={() => setShowCredits(true)}
                className="hover:text-[#B5F800] underline uppercase font-bold flex items-center gap-1.5 focus-ring-lime text-[#FAF2EB]"
              >
                <span>Vector Credits</span>
              </button>

              <span className="mono opacity-80 text-[#FAF2EB]">
                CAMPUS DISPATCH PLATFORM
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Vector Credits Modal */}
      {showCredits && (
        <div
          className="fixed inset-0 z-50 bg-[#1EA854]/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="credits-title"
        >
          <div className="bg-[#FFFFFF] text-[#1EA854] max-w-lg w-full p-6 sm:p-8 border-2 border-[#1EA854] shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowCredits(false)}
              className="absolute top-4 right-4 p-1 hover:bg-[#1EA854] hover:text-[#FFFFFF] transition-colors"
              aria-label="Close Credits Modal"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="font-archivo font-black text-xs text-[#0036FF] tracking-widest uppercase">
              CREDITS & LICENSES
            </span>
            <h3 id="credits-title" className="font-anton text-2xl uppercase mt-1 mb-4 text-[#1EA854]">
              ILLUSTRATION ATTRIBUTION
            </h3>

            <div className="space-y-4 font-serif text-sm text-[#1EA854] max-h-[60vh] overflow-y-auto pr-2">
              <p>
                All illustrations and iconography used in CivicSense adhere strictly to open licenses:
              </p>
              <ul className="list-disc pl-5 space-y-2 font-mono text-xs">
                <li>
                  <strong>campus-base.svg</strong>: Custom CivicSense Vector Quad (MIT License).
                </li>
                <li>
                  <strong>tap-fix.svg, lamp-fix.svg, wifi-fix.svg, bins-fix.svg, safety-fix.svg</strong>: Custom vector fix models adapted under the unDraw Open License (Free for commercial and noncommercial use).
                </li>
                <li>
                  <strong>student-reporter.svg</strong>: Pablo Stanley Open Doodles (CC0 1.0 Universal Public Domain).
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-[#1EA854]/20 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCredits(false)}
                className="bg-[#0036FF] text-[#B5F800] px-4 py-2 font-archivo font-black text-xs uppercase tracking-wider hover:bg-[#1EA854] hover:text-[#FFFFFF] transition-colors"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
