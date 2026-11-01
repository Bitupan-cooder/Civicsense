import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/sections/Hero';
import { Categories } from '@/sections/Categories';
import { How } from '@/sections/How';
import { Report } from '@/sections/Report';
import { OfficialPortal } from '@/sections/OfficialPortal';
import { Contact } from '@/sections/Contact';
import { Footer } from '@/components/Footer';
import { setupSectionAnimations } from '@/lib/scrollStory';

export const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('top');
  const [selectedCategory, setSelectedCategory] = useState<string>('water');
  const [officialPageOpen, setOfficialPageOpen] = useState<boolean>(false);

  useEffect(() => {
    if (officialPageOpen) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      return;
    }

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animCleanup = setupSectionAnimations(isReduced);

    const sectionIds = ['top', 'categories', 'how', 'report', 'tracker', 'contact'];
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        const obs = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                setActiveSection(id);
              }
            });
          },
          { threshold: 0.2 }
        );
        obs.observe(el);
        observers.push(obs);
      }
    });

    return () => {
      animCleanup.destroy();
      observers.forEach((obs) => obs.disconnect());
    };
  }, [officialPageOpen]);

  if (officialPageOpen) {
    return (
      <OfficialPortal
        isOpen={true}
        onClose={() => setOfficialPageOpen(false)}
      />
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-[#FAF2EB] text-[#134E2C]">
      {/* Accessible Skip Link */}
      <a
        href="#report"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-[#0036FF] focus:text-[#B5F800] focus:px-4 focus:py-2 focus:font-semibold focus:border focus:border-[#1EA854]"
      >
        Skip directly to Report Form
      </a>

      {/* Fixed Nav */}
      <Navbar
        activeSection={activeSection}
        onOpenOfficialModal={() => setOfficialPageOpen(true)}
      />

      {/* Main Public Content Area */}
      <main id="main-content" className="w-full">
        <Hero
          onSelectCategory={(catId) => setSelectedCategory(catId)}
          onOpenOfficialModal={() => setOfficialPageOpen(true)}
        />
        <Categories onSelectCategory={(catId) => setSelectedCategory(catId)} />
        <How />
        <Report
          selectedCategory={selectedCategory}
          onCategoryChange={(catId) => setSelectedCategory(catId)}
        />
        <Contact />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default App;
