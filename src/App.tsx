import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/sections/Hero';
import { About } from '@/sections/About';
import { Categories } from '@/sections/Categories';
import { How } from '@/sections/How';
import { Report } from '@/sections/Report';
import { Contact } from '@/sections/Contact';
import { Footer } from '@/components/Footer';
import { setupSectionAnimations } from '@/lib/scrollStory';

export const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('top');
  const [selectedCategory, setSelectedCategory] = useState<string>('water');

  useEffect(() => {
    // 1. Setup downstream section entrance animations
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animCleanup = setupSectionAnimations(isReduced);

    // 2. Track active section for nav underline
    const sectionIds = ['top', 'about', 'categories', 'how', 'report', 'contact'];
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
          { threshold: 0.25 }
        );
        obs.observe(el);
        observers.push(obs);
      }
    });

    return () => {
      animCleanup.destroy();
      observers.forEach((obs) => obs.disconnect());
    };
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-[#FAF2EB] text-[#1EA854]">
      {/* Accessible Skip Link */}
      <a
        href="#report"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-[#0036FF] focus:text-[#FFFFFF] focus:px-4 focus:py-2 focus:font-bold focus:border-2 focus:border-[#B5F800]"
      >
        Skip directly to Report Form
      </a>

      {/* SVG Fractal Noise Grain Overlay (6% opacity, subtle organic texture) */}
      <svg className="grain-overlay" aria-hidden="true">
        <filter id="fractalNoise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#fractalNoise)" />
      </svg>

      {/* Fixed Nav */}
      <Navbar activeSection={activeSection} />

      {/* Main Content Area */}
      <main id="main-content">
        <Hero onSelectCategory={(catId) => setSelectedCategory(catId)} />
        <About />
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
