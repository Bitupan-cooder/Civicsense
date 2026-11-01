import React, { useEffect, useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';

interface NavbarProps {
  activeSection: string;
  onOpenOfficialModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeSection,
  onOpenOfficialModal,
}) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Categories', href: '#categories', id: 'categories' },
    { label: 'How it works', href: '#how', id: 'how' },
    { label: 'Campus Map', href: '#campus-map', id: 'campus-map' },
    { label: 'Report', href: '#report', id: 'report' },
    { label: 'Tracker', href: '#tracker', id: 'tracker' },
    { label: 'Directory', href: '#contact', id: 'contact' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className="fixed top-0 left-0 w-full z-50 flex items-center justify-between gap-6 px-4 sm:px-8 border-b transition-all duration-200"
      style={{
        height: 'var(--nav)',
        borderColor: scrolled ? 'rgba(0, 54, 255, 0.22)' : 'rgba(30, 168, 84, 0.18)',
        backgroundColor: '#FAF2EB',
      }}
      role="banner"
    >
      {/* Impeccable-style Diagonal Split Square Icon in Electric Blue (#0036FF) & Bright Lime-Green (#B5F800) */}
      <a
        href="#top"
        onClick={(e) => handleNavClick(e, '#top')}
        className="nav-fade-in flex items-center gap-3 text-[#1EA854] hover:text-[#0036FF] transition-colors shrink-0 whitespace-nowrap"
        aria-label="CivicSense Home"
      >
        <svg
          width="20"
          height="20"
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
      </a>

      {/* Clean Sentence-Case Navigation Links */}
      <nav
        className="hidden md:flex items-center gap-7"
        role="navigation"
        aria-label="Main Navigation"
      >
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <a
              key={item.id}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className={`nav-fade-in font-archivo text-xs transition-colors flex items-center gap-1.5 py-1 whitespace-nowrap shrink-0 ${
                isActive
                  ? 'font-bold text-[#0036FF]'
                  : 'font-semibold text-[#1EA854] hover:text-[#0036FF]'
              }`}
            >
              {isActive && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#1EA854]"
                  aria-hidden="true"
                />
              )}
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Right Primary Actions (#0036FF + #B5F800 + #1EA854) */}
      <div className="flex items-center gap-2.5 shrink-0">
        <a
          href="#report"
          onClick={(e) => handleNavClick(e, '#report')}
          className="hidden sm:inline-flex items-center gap-2 nav-fade-in font-archivo font-bold text-xs bg-[#0036FF] text-[#B5F800] px-3.5 py-2 hover:bg-[#1EA854] hover:text-[#FFFFFF] transition-colors whitespace-nowrap shrink-0"
        >
          <span>Report Issue</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#B5F800]" />
        </a>

        <button
          type="button"
          onClick={onOpenOfficialModal}
          className="inline-flex items-center gap-1.5 nav-fade-in font-archivo font-bold text-xs bg-[#FFFFFF] text-[#1EA854] border border-[#1EA854]/40 px-3 py-2 hover:border-[#0036FF] hover:bg-[#B5F800] hover:text-[#0036FF] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Lock className="w-3.5 h-3.5 text-[#0036FF]" />
          <span>Official Login</span>
        </button>
      </div>
    </header>
  );
};
