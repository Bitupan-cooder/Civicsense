import React, { useEffect, useRef, useState } from 'react';
import { setupScrollStory, runLoadReveal } from '@/lib/scrollStory';
import { FallingLeavesRenderer } from '@/lib/slips';
import {
  ArrowRight,
  Recycle,
  Sprout,
  Megaphone,
  Scale,
  FileCheck2,
} from 'lucide-react';

interface HeroProps {
  onSelectCategory?: (categoryId: string) => void;
}

type CivicIconType = 'recycle' | 'sprout' | 'megaphone' | 'scale' | 'filecheck';

interface CivicCharacter {
  id: string;
  num: string;
  name: string;
  badge: string;
  category: string;
  dept: string;
  desc: string;
  iconType: CivicIconType;
  image: string;
  left: string;
  bottom: string;
  width: string;
  bubbleLeft: string;
  bubbleTop: string;
  zElevation: number;
}

const CIVIC_CHARACTERS: CivicCharacter[] = [
  {
    id: 'action-recycling',
    num: '01',
    name: 'Clean Campus & Sorting',
    badge: '01 · CLEAN QUAD',
    category: 'waste',
    dept: 'Estates & Sanitation Operations',
    desc: 'Student sorting recyclable paper, plastics, and campus waste into collection bags.',
    iconType: 'recycle',
    image: '/flat-assets/civic-cutouts/char-1-recycling.png',
    left: '1%',
    bottom: '2%',
    width: '20%',
    bubbleLeft: '11%',
    bubbleTop: '20%',
    zElevation: 40,
  },
  {
    id: 'action-plantation',
    num: '02',
    name: 'Green Grounds & Plantation',
    badge: '02 · GREEN GROUNDS',
    category: 'water',
    dept: 'Horticulture & Quad Conservation',
    desc: 'Student nurturing quad saplings, tending green lawns, and reporting irrigation leaks.',
    iconType: 'sprout',
    image: '/flat-assets/civic-cutouts/char-2-planting.png',
    left: '19%',
    bottom: '2%',
    width: '22%',
    bubbleLeft: '29%',
    bubbleTop: '22%',
    zElevation: 35,
  },
  {
    id: 'action-voice',
    num: '03',
    name: 'Civic Megaphone Voice',
    badge: '03 · CIVIC VOICE',
    category: 'power',
    dept: 'Proctorial & Student Welfare Desk',
    desc: 'Student dispatching urgent alerts for pathway lighting, broken wifi, and campus safety.',
    iconType: 'megaphone',
    image: '/flat-assets/civic-cutouts/char-3-megaphone.png',
    left: '39%',
    bottom: '4%',
    width: '20%',
    bubbleLeft: '49%',
    bubbleTop: '16%',
    zElevation: 50,
  },
  {
    id: 'action-audit',
    num: '04',
    name: 'Fair SLA & Ledger Audit',
    badge: '04 · FAIR SLA AUDIT',
    category: 'safety',
    dept: 'Campus Safety & Redressal Audit',
    desc: 'Student auditing public redressal turnaround and maintaining open ledger transparency.',
    iconType: 'scale',
    image: '/flat-assets/civic-cutouts/char-4-auditor.png',
    left: '58%',
    bottom: '2%',
    width: '21%',
    bubbleLeft: '68%',
    bubbleTop: '22%',
    zElevation: 35,
  },
  {
    id: 'action-dispatch',
    num: '05',
    name: 'Resolution & Dispatch',
    badge: '05 · TICKET RESOLUTION',
    category: 'hostel',
    dept: 'Campus Direct Redressal Box',
    desc: 'Student dropping verified complaint ticket directly into the official redressal collection box.',
    iconType: 'filecheck',
    image: '/flat-assets/civic-cutouts/char-5-dispatch.png',
    left: '76%',
    bottom: '2%',
    width: '23%',
    bubbleLeft: '87%',
    bubbleTop: '18%',
    zElevation: 45,
  },
];

const renderCivicIcon = (type: CivicIconType, className: string = 'w-4 h-4') => {
  switch (type) {
    case 'recycle':
      return <Recycle className={className} />;
    case 'sprout':
      return <Sprout className={className} />;
    case 'megaphone':
      return <Megaphone className={className} />;
    case 'scale':
      return <Scale className={className} />;
    case 'filecheck':
      return <FileCheck2 className={className} />;
  }
};

export const Hero: React.FC<HeroProps> = ({ onSelectCategory }) => {
  const heroRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeActionId, setActiveActionId] = useState<string>('action-voice');

  useEffect(() => {
    const heroEl = heroRef.current;
    if (!heroEl) return;

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Initial Load Reveal
    runLoadReveal(heroEl, isReduced);

    // 2. Scroll Story Animation & 3D Tilt
    const scrollStory = setupScrollStory(heroEl, isReduced);

    // 3. 3D Tumbling Leaves Canvas
    let leavesRenderer: FallingLeavesRenderer | null = null;
    if (canvasRef.current && !isReduced) {
      leavesRenderer = new FallingLeavesRenderer(canvasRef.current);
      leavesRenderer.start();

      const handleResize = () => leavesRenderer?.resize();
      window.addEventListener('resize', handleResize);

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            leavesRenderer?.setOffScreen(!entry.isIntersecting);
          });
        },
        { threshold: 0.05 }
      );

      observer.observe(heroEl);

      return () => {
        window.removeEventListener('resize', handleResize);
        observer.disconnect();
        leavesRenderer?.destroy();
        scrollStory?.destroy();
      };
    }

    return () => {
      scrollStory?.destroy();
    };
  }, []);

  const handleSelectCharacter = (character: CivicCharacter) => {
    setActiveActionId(character.id);
    if (onSelectCategory) {
      onSelectCategory(character.category);
    }
  };

  const handleReportAction = (character: CivicCharacter) => {
    if (onSelectCategory) {
      onSelectCategory(character.category);
    }
    const reportTarget = document.getElementById('report');
    if (reportTarget) {
      reportTarget.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToReport = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById('report') || document.getElementById('about');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const activeChar = CIVIC_CHARACTERS.find((c) => c.id === activeActionId) || CIVIC_CHARACTERS[2];

  return (
    <section
      id="top"
      ref={heroRef}
      className="relative w-full bg-[#FAF2EB] text-[#1EA854] select-none pt-[calc(var(--nav)+14px)] pb-12 flex flex-col items-center justify-start overflow-hidden"
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d',
      }}
      aria-label="CivicSense Hero"
    >
      {/* Real accessible H1 (visually hidden for screen readers) */}
      <h1 className="sr-only">CivicSense: Campus Community Redressal</h1>

      {/* 3D Botanical Falling Leaves Canvas (Ambient background depth) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        aria-hidden="true"
      />

      {/* Top Tagline Pill */}
      <div className="relative z-10 w-full max-w-[1040px] mx-auto px-4 text-center">
        <span className="inline-block font-archivo font-black text-[11px] sm:text-xs md:text-sm text-[#0036FF] uppercase tracking-[0.24em] bg-[#FFFFFF] px-3.5 py-1 border border-[#0036FF]/30 shadow-2xs">
          [ CIVICSENSE · CAMPUS COMMUNITY ACTION ]
        </span>
      </div>

      {/* FRAMELESS 3D CAMPUS STAGE (No enclosing box, no frame, pure single character PNGs) */}
      <div
        className="hero-stage relative mx-auto z-10 w-full max-w-[1140px] h-[360px] sm:h-[420px] md:h-[480px] mt-2 cursor-grab active:cursor-grabbing select-none"
        style={{
          perspective: '1200px',
          perspectiveOrigin: '50% 50%',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Layer 1: Mouse & Drag Interactive 3D Tilt */}
        <div
          className="hero-stage-tilt relative w-full h-full"
          style={{
            transformStyle: 'preserve-3d',
            willChange: 'transform',
          }}
        >
          {/* Layer 2: ScrollTrigger Camera Push-In & Pitch */}
          <div
            className="hero-stage-inner relative w-full h-full"
            style={{
              transformStyle: 'preserve-3d',
              willChange: 'transform',
            }}
          >
            {/* Background Architectural Typography: CivicSense (Framed neatly at top) */}
            <div
              className="absolute top-1 sm:top-3 inset-x-0 flex flex-col items-center justify-center pointer-events-none select-none z-0"
              style={{
                transform: 'translateZ(-30px)',
              }}
            >
              <span className="font-anton text-6xl sm:text-8xl md:text-9xl text-[#1EA854]/20 tracking-tight uppercase leading-none select-none">
                CIVICSENSE
              </span>
              <span className="font-serif italic text-xs sm:text-sm md:text-base text-[#0036FF]/75 tracking-[0.24em] uppercase font-bold mt-1">
                Be Aware · Be Involved
              </span>
            </div>

            {/* 5 SINGLE CHARACTER PNGs: Frameless Cutouts with 3D Depth & Scroll Movement */}
            {CIVIC_CHARACTERS.map((char) => {
              const isActive = activeActionId === char.id;
              return (
                <div
                  key={char.id}
                  data-action-id={char.id}
                  className="absolute cursor-pointer pointer-events-auto z-30 group flex flex-col items-center justify-end"
                  style={{
                    left: char.left,
                    bottom: char.bottom,
                    width: char.width,
                    height: '76%',
                    transformOrigin: '50% 95%',
                    transform: isActive ? 'translateZ(75px)' : `translateZ(${char.zElevation}px)`,
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  }}
                  onMouseEnter={() => setActiveActionId(char.id)}
                  onClick={() => handleSelectCharacter(char)}
                >
                  {/* Underfoot Ground Shadow & Active Glow Spotlight */}
                  <div
                    className={`absolute -bottom-1 w-3/4 h-3 rounded-full transition-all duration-200 pointer-events-none ${
                      isActive
                        ? 'bg-[#B5F800] blur-[4px] scale-125'
                        : 'bg-[#1EA854]/20 blur-[2px] group-hover:bg-[#B5F800]/50'
                    }`}
                    style={{ transform: 'translateZ(-10px)' }}
                  />

                  {/* Single Character PNG Cutout (No frame, natural transparent cutout) */}
                  <img
                    src={char.image}
                    alt={char.name}
                    className={`w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(30,168,84,0.18)] transition-transform duration-200 select-none pointer-events-none ${
                      isActive ? 'scale-108 brightness-105' : 'group-hover:scale-104'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Docked Civic Action Dashboard: Placed cleanly below the stage (Never obscuring the characters) */}
      <div className="relative z-20 w-full max-w-[1040px] mx-auto px-4 mt-2">
        {/* 5-Action Quick Switcher Pill Bar (Zero Emojis, Pure Lucide Vector Icons) */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {CIVIC_CHARACTERS.map((char) => {
            const isSelected = activeActionId === char.id;
            return (
              <button
                key={char.id}
                type="button"
                onClick={() => handleSelectCharacter(char)}
                className={`px-3 py-1.5 text-[10px] sm:text-[11px] font-mono font-bold uppercase transition-all duration-150 cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-[#0036FF] text-[#B5F800] border-[#0036FF] shadow-xs scale-105'
                    : 'bg-[#FFFFFF] text-[#1EA854] border-[#1EA854]/30 hover:bg-[#B5F800] hover:text-[#0036FF] hover:border-[#0036FF]'
                }`}
              >
                {renderCivicIcon(char.iconType, 'w-3.5 h-3.5')}
                <span>{char.badge}</span>
              </button>
            );
          })}
        </div>

        {/* Clean Docked Action Detail Strip */}
        <div className="mt-2.5 bg-[#FFFFFF] border-2 border-[#0036FF] px-4 py-2.5 sm:px-6 sm:py-3 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fadeIn">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-[10px] font-black uppercase text-[#0036FF] tracking-wider flex items-center gap-1">
                {renderCivicIcon(activeChar.iconType, 'w-3.5 h-3.5 text-[#0036FF]')}
                {activeChar.badge}
              </span>
              <span className="text-[9px] font-mono font-bold text-[#1EA854] bg-[#FAF2EB] px-2 py-0.5 border border-[#1EA854]/30">
                {activeChar.dept}
              </span>
            </div>
            <h3 className="font-anton text-base sm:text-lg text-[#1EA854] uppercase tracking-normal">
              {activeChar.name}
            </h3>
            <p className="font-serif italic text-xs text-[#1EA854] mt-0.5 leading-relaxed">
              {activeChar.desc}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleReportAction(activeChar)}
              className="inline-flex items-center gap-1.5 bg-[#0036FF] text-[#B5F800] hover:bg-[#1EA854] hover:text-[#FFFFFF] px-4 py-2 text-[11px] font-archivo font-black uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
            >
              <span>Report This Issue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Hero Bottom Bar: Live Civic Actions Tracker & Accessible Action */}
      <div
        className="relative z-20 w-full max-w-[1200px] mx-auto px-4 sm:px-8 pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-[#1EA854]"
      >
        {/* Progress Tracker */}
        <div className="flex items-center gap-3">
          <div className="w-24 sm:w-32 h-2 bg-[#FFFFFF] border border-[#1EA854]/30 overflow-hidden shadow-2xs">
            <div
              className="hero-fix-progress-bar h-full bg-[#0036FF] transition-all duration-300"
              style={{ width: '0%' }}
            />
          </div>
          <span className="hero-fix-counter font-mono font-bold text-[10px] sm:text-xs tracking-wider uppercase text-[#0036FF]">
            0 / 5 CIVIC ACTIONS ACTIVE
          </span>
        </div>

        {/* Center Scroll Prompt */}
        <div className="flex items-center gap-2 text-center opacity-80 pointer-events-none">
          <span className="font-archivo font-extrabold text-[10px] sm:text-xs tracking-widest uppercase text-[#1EA854]">
            SCROLL TO ASSEMBLE
          </span>
          <div className="w-4 h-6 border border-[#1EA854]/40 flex items-start justify-center p-0.5">
            <div className="w-1 h-1.5 bg-[#0036FF] animate-bounce" />
          </div>
        </div>

        {/* Quick Skip Link: Electric Blue with Lucide Arrow */}
        <button
          type="button"
          onClick={scrollToReport}
          className="font-mono font-bold text-[10px] sm:text-xs tracking-wider uppercase text-[#0036FF] hover:text-[#9ABC05] underline underline-offset-4 transition-colors focus-ring-blue inline-flex items-center gap-1 cursor-pointer"
        >
          <span>SKIP TO REPORT FORM</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
};
