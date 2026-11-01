import React, { useEffect, useRef, useState } from 'react';
import { setupScrollStory, runLoadReveal, focusCharacterWithGsap } from '@/lib/scrollStory';
import { FallingLeavesRenderer } from '@/lib/slips';
import {
  ArrowRight,
  Recycle,
  Sprout,
  Megaphone,
  Scale,
  FileCheck2,
  Search,
  Lock,
} from 'lucide-react';

interface HeroProps {
  onSelectCategory?: (categoryId: string) => void;
  onOpenOfficialModal?: () => void;
}

type CivicIconType = 'recycle' | 'sprout' | 'megaphone' | 'scale' | 'filecheck';

interface CivicCharacter {
  id: string;
  num: string;
  name: string;
  shortLabel: string;
  badge: string;
  category: string;
  dept: string;
  desc: string;
  iconType: CivicIconType;
  image: string;
}

const CIVIC_CHARACTERS: CivicCharacter[] = [
  {
    id: 'action-recycling',
    num: '01',
    name: 'Clean Campus & Sorting',
    shortLabel: 'Clean Quad',
    badge: '01 · CLEAN QUAD',
    category: 'waste',
    dept: 'Sanitation & Grounds Management',
    desc: 'Report waste, litter, or sanitation issues across campus.',
    iconType: 'recycle',
    image: '/flat-assets/civic-cutouts/char-1-recycling.png',
  },
  {
    id: 'action-plantation',
    num: '02',
    name: 'Water & Grounds Care',
    shortLabel: 'Water & Grounds',
    badge: '02 · WATER & GROUNDS',
    category: 'water',
    dept: 'Facility Operations & Plumbing (PHE)',
    desc: 'Report drinking water filters, pipe leaks, or grounds care.',
    iconType: 'sprout',
    image: '/flat-assets/civic-cutouts/char-2-planting.png',
  },
  {
    id: 'action-voice',
    num: '03',
    name: 'Power & Lighting',
    shortLabel: 'Power & Voice',
    badge: '03 · POWER & LIGHTS',
    category: 'power',
    dept: 'Electrical Maintenance & Power',
    desc: 'Report street lights, power outages, or faulty switches.',
    iconType: 'megaphone',
    image: '/flat-assets/civic-cutouts/char-3-megaphone.png',
  },
  {
    id: 'action-audit',
    num: '04',
    name: 'Safety & SLA Audit',
    shortLabel: 'Safety & SLA',
    badge: '04 · SAFETY & SLA',
    category: 'safety',
    dept: 'Campus Safety & Security Command',
    desc: 'Report dark pathways, gate hazards, or security concerns.',
    iconType: 'scale',
    image: '/flat-assets/civic-cutouts/char-4-auditor.png',
  },
  {
    id: 'action-dispatch',
    num: '05',
    name: 'Hostel & Direct Dispatch',
    shortLabel: 'Hostel Dispatch',
    badge: '05 · HOSTEL DISPATCH',
    category: 'hostel',
    dept: 'Hostels & Student Housing Board',
    desc: 'Report hostel maintenance, dining, or block facilities.',
    iconType: 'filecheck',
    image: '/flat-assets/civic-cutouts/char-5-dispatch.png',
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

export const Hero: React.FC<HeroProps> = ({ onSelectCategory, onOpenOfficialModal }) => {
  const heroRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeActionId, setActiveActionId] = useState<string>('action-recycling');
  const [activeCount, setActiveCount] = useState<number>(1);
  const onSelectCategoryRef = useRef(onSelectCategory);
  onSelectCategoryRef.current = onSelectCategory;

  useEffect(() => {
    const heroEl = heroRef.current;
    if (!heroEl) return;

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    runLoadReveal(heroEl, isReduced);

    const scrollStory = setupScrollStory(heroEl, isReduced, (stepActionId, count) => {
      setActiveActionId(stepActionId);
      setActiveCount(count);
    });

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

  const handleSelectCharacter = (character: CivicCharacter, idx: number) => {
    setActiveActionId(character.id);
    setActiveCount(idx + 1);
    focusCharacterWithGsap(heroRef.current, character.id);
    if (onSelectCategoryRef.current) {
      onSelectCategoryRef.current(character.category);
    }
  };

  const handleReportAction = (character: CivicCharacter) => {
    if (onSelectCategoryRef.current) {
      onSelectCategoryRef.current(character.category);
    }
    const reportTarget = document.getElementById('report');
    if (reportTarget) {
      reportTarget.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToSection = (id: string) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const activeChar = CIVIC_CHARACTERS.find((c) => c.id === activeActionId) || CIVIC_CHARACTERS[0];

  return (
    <section
      id="top"
      ref={heroRef}
      className="relative w-full min-h-screen bg-[#FAF2EB] text-[#134E2C] select-none pt-[calc(var(--nav)+16px)] pb-8 px-4 sm:px-8 md:px-14 flex flex-col justify-between overflow-x-hidden border-b border-[#0036FF]/15"
      aria-label="CivicSense Hero"
    >
      <h1 className="sr-only">CivicSense: Direct Campus Issue Redressal</h1>

      {/* 3D Botanical Falling Leaves Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        aria-hidden="true"
      />

      {/* FULL-SCREEN 5-CHARACTER STAGE WITH MONUMENTAL #538306 CIVICSENSE WORDMARK */}
      <div className="hero-stage relative mx-auto z-10 w-full max-w-[1600px] my-auto select-none">
        <div
          className="hero-stage-tilt relative w-full"
          style={{
            perspective: '1200px',
            transformStyle: 'preserve-3d',
          }}
        >
          <div className="hero-stage-inner relative w-full pt-8 sm:pt-12 pb-3">
            {/* Monumental Background Serif Wordmark ("CivicSense") in exact #538306 green from reference photo */}
            <div className="absolute inset-x-0 top-1 sm:top-3 bottom-8 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
              <span className="hero-bg-wordmark text-[18vw] sm:text-[16.5vw] md:text-[15vw] text-[#538306] whitespace-nowrap select-none">
                CivicSense
              </span>
            </div>

            {/* Full-Width Ground Quad Line */}
            <div className="absolute bottom-2 inset-x-0 h-1.5 bg-[#B5F800] border-b border-[#1EA854] pointer-events-none z-10" />

            {/* 5-Column Full-Screen Character Row */}
            <div className="relative z-20 grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 items-end pt-14 sm:pt-20 w-full">
              {CIVIC_CHARACTERS.map((char, idx) => {
                const isActive = activeActionId === char.id;
                return (
                  <div
                    key={char.id}
                    data-action-id={char.id}
                    className={`cursor-pointer group flex flex-col items-center justify-end w-full ${
                      idx === 4 ? 'col-span-2 sm:col-span-1' : ''
                    }`}
                    onMouseEnter={() => handleSelectCharacter(char, idx)}
                    onClick={() => handleSelectCharacter(char, idx)}
                  >
                    <div className="civic-char-actor relative w-full flex flex-col items-center justify-end">
                      {/* Blue + Bright Lime-Green Callout Tag above character */}
                      <div
                        className={`civic-char-bubble mb-3 px-2.5 py-1 border flex items-center gap-1.5 transition-all duration-200 ${
                          isActive
                            ? 'bg-[#0036FF] text-[#B5F800] border-[#B5F800] shadow-xs'
                            : 'bg-[#FFFFFF] text-[#1EA854] border-[#0036FF]/35 group-hover:bg-[#B5F800] group-hover:text-[#0036FF] group-hover:border-[#0036FF]'
                        }`}
                      >
                        {renderCivicIcon(char.iconType, 'w-3.5 h-3.5 shrink-0')}
                        <span className="font-archivo font-bold text-[10px] lg:text-xs uppercase tracking-wider whitespace-nowrap">
                          {char.num} · {char.shortLabel}
                        </span>
                      </div>

                      {/* Character Cutout Sprite */}
                      <div className="civic-char-sprite relative w-full h-[180px] sm:h-[220px] md:h-[260px] lg:h-[300px] xl:h-[330px] flex items-end justify-center">
                        <img
                          src={char.image}
                          alt={char.name}
                          className={`h-full w-auto max-w-full object-contain object-bottom select-none pointer-events-none transition-all duration-200 ${
                            isActive
                              ? 'drop-shadow-[0_12px_20px_rgba(0,54,255,0.22)]'
                              : 'drop-shadow-[0_6px_12px_rgba(30,168,84,0.16)]'
                          }`}
                        />
                      </div>

                      {/* Underfoot Ground Indicator Bar */}
                      <div
                        className={`mt-1.5 h-1.5 transition-all duration-200 pointer-events-none ${
                          isActive
                            ? 'w-4/5 bg-[#0036FF]'
                            : 'w-1/2 bg-[#1EA854]/45 group-hover:bg-[#0036FF]'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width Docked Action Bar below Characters */}
      <div className="relative z-20 w-full max-w-[1480px] mx-auto mt-4">
        {/* 5-Action Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {CIVIC_CHARACTERS.map((char, idx) => {
            const isSelected = activeActionId === char.id;
            return (
              <button
                key={char.id}
                type="button"
                onClick={() => handleSelectCharacter(char, idx)}
                className={`px-3 py-2 text-[11px] sm:text-xs font-archivo font-bold transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 border ${
                  isSelected
                    ? 'bg-[#0036FF] text-[#B5F800] border-[#0036FF]'
                    : 'bg-[#FFFFFF] text-[#1EA854] border-[#1EA854]/30 hover:border-[#0036FF] hover:text-[#0036FF]'
                }`}
              >
                {renderCivicIcon(
                  char.iconType,
                  `w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#B5F800]' : 'text-[#0036FF]'}`
                )}
                <span className="truncate">{char.badge}</span>
              </button>
            );
          })}
        </div>

        {/* Active Jurisdiction Bar */}
        <div className="mt-2.5 bg-[#FFFFFF] border-2 border-[#0036FF] px-5 py-4 sm:px-7 sm:py-5 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="imp-badge">{activeChar.badge}</span>
              <span className="font-anton text-2xl sm:text-3xl text-[#1EA854]">
                {activeChar.name}
              </span>
              <span className="text-xs font-archivo font-bold text-[#0036FF] bg-[#EEF7EE] px-2.5 py-0.5 border border-[#0036FF]/25">
                Owning Post: {activeChar.dept}
              </span>
            </div>
            <p className="font-archivo text-xs sm:text-sm text-[#134E2C] mt-1">
              {activeChar.desc}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleReportAction(activeChar)}
              className="inline-flex items-center gap-2 bg-[#0036FF] text-[#B5F800] hover:bg-[#1EA854] hover:text-[#FFFFFF] px-5 py-2.5 text-xs font-archivo font-bold transition-colors cursor-pointer"
            >
              <span>Report Issue</span>
              <ArrowRight className="w-4 h-4 text-[#B5F800]" />
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('tracker')}
              className="inline-flex items-center gap-2 bg-[#EEF7EE] text-[#1EA854] hover:bg-[#B5F800] hover:text-[#0036FF] border border-[#1EA854]/40 px-4 py-2.5 text-xs font-archivo font-bold transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-[#0036FF]" />
              <span>Track by ID</span>
            </button>
          </div>
        </div>

        {/* Hero Bottom Status Strip */}
        <div className="pt-3 flex items-center justify-between gap-2 text-[#1EA854]">
          <div className="flex items-center gap-2.5">
            <div className="w-24 sm:w-32 h-1.5 bg-[#DFEFE0] overflow-hidden">
              <div
                className="hero-fix-progress-bar h-full bg-[#0036FF] transition-all duration-300"
                style={{ width: `${activeCount * 20}%` }}
              />
            </div>
            <span className="hero-fix-counter font-archivo font-bold text-xs text-[#0036FF]">
              {activeCount} / 5 jurisdictions
            </span>
          </div>

          <span className="hidden sm:inline font-archivo font-semibold text-xs text-[#1EA854]">
            Scroll to explore
          </span>

          {onOpenOfficialModal && (
            <button
              type="button"
              onClick={onOpenOfficialModal}
              className="font-archivo font-bold text-xs text-[#0036FF] hover:text-[#1EA854] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-[#1EA854]" />
              <span>Official Login</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
