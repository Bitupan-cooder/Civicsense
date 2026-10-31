import React, { useEffect, useState } from 'react';

interface NavbarProps {
  activeSection: string;
}

export const Navbar: React.FC<NavbarProps> = ({ activeSection }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'CATEGORIES', href: '#categories', id: 'categories' },
    { label: 'HOW', href: '#how', id: 'how' },
    { label: 'REPORT', href: '#report', id: 'report' },
    { label: 'CONTACT', href: '#contact', id: 'contact' },
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
      className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 md:px-8 border-b transition-colors duration-300"
      style={{
        height: 'var(--nav)',
        borderColor: scrolled ? 'rgba(30, 168, 84, 0.2)' : 'rgba(30, 168, 84, 0.12)',
        backgroundColor: scrolled ? 'rgba(250, 242, 235, 0.96)' : 'rgba(250, 242, 235, 0.82)',
        backdropFilter: 'blur(12px)',
      }}
      role="banner"
    >
      {/* Brand Wordmark in Civic Green */}
      <a
        href="#top"
        className="font-archivo font-black text-sm tracking-widest text-[#1EA854] hover:text-[#9ABC05] transition-colors nav-fade-in flex items-center gap-2"
        aria-label="CivicSense Home"
      >
        <span className="w-2.5 h-2.5 bg-[#9ABC05] inline-block" />
        CIVICSENSE
      </a>

      {/* Centred Navigation Links: Green & White typography */}
      <nav
        className="flex items-center gap-6 md:gap-12 mx-auto"
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
              className={`nav-fade-in font-archivo font-black tracking-wider uppercase text-xs sm:text-sm md:text-[calc(26*var(--u))] transition-all relative py-1 ${
                isActive ? 'text-[#1EA854]' : 'text-[#1EA854]/75 hover:text-[#9ABC05]'
              }`}
            >
              {item.label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 w-full h-[2.5px] bg-[#9ABC05]"
                  aria-hidden="true"
                />
              )}
            </a>
          );
        })}
      </nav>

      {/* Right Urgent Shortcut: Electric Blue with Bright Lime text */}
      <div className="hidden sm:flex items-center">
        <a
          href="#report"
          onClick={(e) => handleNavClick(e, '#report')}
          className="nav-fade-in font-archivo font-extrabold text-[10px] md:text-xs tracking-wider uppercase bg-[#0036FF] text-[#B5F800] px-3.5 py-1.5 hover:bg-[#1EA854] hover:text-[#FFFFFF] transition-colors focus-ring-blue shadow-xs"
        >
          QUICK REPORT
        </a>
      </div>
    </header>
  );
};
