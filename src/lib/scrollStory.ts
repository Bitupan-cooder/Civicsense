import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export interface CivicActionConfig {
  id: string;
  name: string;
  anchorX: number;
  anchorY: number;
  windowStart: number;
  windowEnd: number;
  startScaleX: number;
  startScaleY: number;
  ease: string;
  translateZ: number;
}

export const CIVIC_ACTIONS: CivicActionConfig[] = [
  {
    id: 'action-recycling',
    name: 'Clean Campus & Recycling',
    anchorX: 240,
    anchorY: 650,
    windowStart: 0.06,
    windowEnd: 0.26,
    startScaleX: 0.15,
    startScaleY: 0.15,
    ease: 'back.out(1.6)',
    translateZ: 50
  },
  {
    id: 'action-plantation',
    name: 'Grounds Care & Plantation',
    anchorX: 510,
    anchorY: 660,
    windowStart: 0.24,
    windowEnd: 0.44,
    startScaleX: 0.15,
    startScaleY: 0.15,
    ease: 'back.out(1.5)',
    translateZ: 65
  },
  {
    id: 'action-voice',
    name: 'Student Redressal Voice',
    anchorX: 800,
    anchorY: 620,
    windowStart: 0.42,
    windowEnd: 0.62,
    startScaleX: 0.2,
    startScaleY: 0.2,
    ease: 'back.out(1.6)',
    translateZ: 90
  },
  {
    id: 'action-audit',
    name: 'SLA Governance & Audit',
    anchorX: 1090,
    anchorY: 660,
    windowStart: 0.60,
    windowEnd: 0.80,
    startScaleX: 0.15,
    startScaleY: 0.15,
    ease: 'power3.out',
    translateZ: 65
  },
  {
    id: 'action-dispatch',
    name: 'Direct Resolution Box',
    anchorX: 1360,
    anchorY: 640,
    windowStart: 0.78,
    windowEnd: 0.98,
    startScaleX: 0.15,
    startScaleY: 0.15,
    ease: 'power3.out',
    translateZ: 75
  }
];

export function setupScrollStory(container: HTMLElement, isReducedMotion: boolean = false) {
  const stage = container.querySelector('.hero-stage') as HTMLElement;
  const stageTilt = container.querySelector('.hero-stage-tilt') as HTMLElement;
  const innerLayer = container.querySelector('.hero-stage-inner') as HTMLElement;
  if (!stage || !stageTilt || !innerLayer) return { destroy: () => {} };

  // Base 3D Isometric Pitch Angles
  const BASE_ROT_X = 18;
  const BASE_ROT_Y = 0;
  const BASE_ROT_Z = -1;

  if (isReducedMotion) {
    gsap.set(stageTilt, {
      transformPerspective: 1200,
      transformStyle: 'preserve-3d',
      rotateX: BASE_ROT_X,
      rotateY: BASE_ROT_Y,
      rotateZ: BASE_ROT_Z,
    });
    CIVIC_ACTIONS.forEach((action) => {
      const el = container.querySelector(`[data-action-id="${action.id}"]`) as HTMLElement;
      if (el) {
        gsap.set(el, {
          opacity: 1,
          scaleX: 1,
          scaleY: 1,
          z: action.translateZ,
          rotateX: -BASE_ROT_X,
          transformStyle: 'preserve-3d',
          force3D: true,
        });
      }
    });
    return { destroy: () => {} };
  }

  // 1. Initial 3D isometric states
  gsap.set(stageTilt, {
    transformPerspective: 1200,
    transformStyle: 'preserve-3d',
    rotateX: BASE_ROT_X,
    rotateY: BASE_ROT_Y,
    rotateZ: BASE_ROT_Z,
  });

  CIVIC_ACTIONS.forEach((action) => {
    const el = container.querySelector(`[data-action-id="${action.id}"]`) as HTMLElement;
    if (el) {
      gsap.set(el, {
        transformOrigin: '50% 90%',
        opacity: 1,
        scaleX: 1,
        scaleY: 1,
        z: action.translateZ,
        rotateX: -BASE_ROT_X, // Upright billboard facing user
        transformStyle: 'preserve-3d',
        force3D: true,
      });
    }
  });

  // 2. Interactive 3D Orbit: Passive Mouse Parallax + Active Drag to Rotate
  const tiltXTo = gsap.quickTo(stageTilt, 'rotateX', { duration: 0.5, ease: 'power2.out' });
  const tiltYTo = gsap.quickTo(stageTilt, 'rotateY', { duration: 0.5, ease: 'power2.out' });

  let curMouseX = 0;
  let curMouseY = 0;
  let isDragging = false;
  let startDragX = 0;
  let startDragY = 0;
  let dragRotX = BASE_ROT_X;
  let dragRotY = BASE_ROT_Y;

  const onMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const deltaX = (e.clientX - startDragX) * 0.28;
      const deltaY = (e.clientY - startDragY) * 0.28;
      const newPitch = Math.max(-10, Math.min(42, dragRotX - deltaY));
      const newYaw = dragRotY + deltaX;
      tiltXTo(newPitch);
      tiltYTo(newYaw);
      return;
    }

    curMouseX = (e.clientX / window.innerWidth) - 0.5;
    curMouseY = (e.clientY / window.innerHeight) - 0.5;

    // Passive 3D tilt tracking
    tiltXTo(BASE_ROT_X - curMouseY * 14);
    tiltYTo(BASE_ROT_Y + curMouseX * 20);
  };

  const onMouseDown = (e: MouseEvent) => {
    isDragging = true;
    startDragX = e.clientX;
    startDragY = e.clientY;
    dragRotX = gsap.getProperty(stageTilt, 'rotateX') as number || BASE_ROT_X;
    dragRotY = gsap.getProperty(stageTilt, 'rotateY') as number || BASE_ROT_Y;
  };

  const onMouseUp = () => {
    if (isDragging) {
      isDragging = false;
      tiltXTo(BASE_ROT_X - curMouseY * 14);
      tiltYTo(BASE_ROT_Y + curMouseX * 20);
    }
  };

  // Touch Support
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging = true;
      startDragX = e.touches[0].clientX;
      startDragY = e.touches[0].clientY;
      dragRotX = gsap.getProperty(stageTilt, 'rotateX') as number || BASE_ROT_X;
      dragRotY = gsap.getProperty(stageTilt, 'rotateY') as number || BASE_ROT_Y;
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      const deltaX = (e.touches[0].clientX - startDragX) * 0.28;
      const deltaY = (e.touches[0].clientY - startDragY) * 0.28;
      const newPitch = Math.max(-10, Math.min(42, dragRotX - deltaY));
      const newYaw = dragRotY + deltaX;
      tiltXTo(newPitch);
      tiltYTo(newYaw);
    }
  };

  const onTouchEnd = () => {
    isDragging = false;
    tiltXTo(BASE_ROT_X);
    tiltYTo(BASE_ROT_Y);
  };

  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('mouseup', onMouseUp);
  stage.addEventListener('mousedown', onMouseDown);
  stage.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('touchend', onTouchEnd);

  // 3. Master Scrubbed Scroll Story with Crisp, Natural Pinning
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: container,
      start: 'top top',
      end: '+=90%',
      pin: true,
      pinSpacing: true,
      scrub: 0.5,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const count = Math.min(5, Math.floor(self.progress * 5.4));
        const badge = container.querySelector('.hero-fix-counter');
        if (badge) {
          badge.textContent = `${count} / 5 CIVIC ACTIONS ACTIVE`;
        }
        const bar = container.querySelector('.hero-fix-progress-bar') as HTMLElement;
        if (bar) {
          bar.style.width = `${Math.min(100, Math.round(self.progress * 100))}%`;
        }
      }
    }
  });

  // Camera pushes in on innerLayer as user scrolls
  tl.to(innerLayer, {
    scale: 1.18,
    y: '-2.5%',
    rotateX: 4,
    ease: 'power2.inOut',
    duration: 1
  }, 0);

  // Animate each civic action in its window with authentic 3D Z elevation & highlight
  CIVIC_ACTIONS.forEach((action) => {
    const el = container.querySelector(`[data-action-id="${action.id}"]`) as HTMLElement;
    if (!el) return;

    const windowDuration = action.windowEnd - action.windowStart;
    const snapDuration = Math.max(0.04, windowDuration * 0.3);

    // Pulse forward and highlight when scrolled into view
    tl.to(el, {
      z: action.translateZ + 30,
      scale: 1.08,
      ease: 'back.out(2)',
      duration: snapDuration
    }, action.windowStart);

    tl.to(el, {
      z: action.translateZ,
      scale: 1,
      ease: 'power2.out',
      duration: snapDuration
    }, action.windowStart + snapDuration);
  });

  return {
    destroy: () => {
      tl.kill();
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === container) st.kill();
      });
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      stage.removeEventListener('mousedown', onMouseDown);
      stage.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    }
  };
}

export function runLoadReveal(container: HTMLElement, isReducedMotion: boolean = false) {
  if (isReducedMotion) return;

  const titleLines = container.querySelectorAll('.hero-title-line');
  const wordmark = container.querySelector('.hero-wordmark');
  const navItems = document.querySelectorAll('.nav-fade-in');
  const sideLabels = container.querySelectorAll('.hero-side-label');
  const stage = container.querySelector('.hero-stage');

  const ease = 'power3.out';

  if (wordmark) {
    gsap.fromTo(wordmark, 
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, delay: 0.08, ease }
    );
  }

  if (titleLines.length >= 2) {
    gsap.fromTo(titleLines[0],
      { yPercent: 100, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 1.0, delay: 0.15, ease }
    );
    gsap.fromTo(titleLines[1],
      { yPercent: 100, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 1.0, delay: 0.28, ease }
    );
  }

  const fadeGroup = [...Array.from(navItems), ...Array.from(sideLabels)];
  if (fadeGroup.length > 0) {
    gsap.fromTo(fadeGroup,
      { opacity: 0, y: -4 },
      { opacity: 1, y: 0, duration: 0.7, delay: 0.15, stagger: 0.02, ease }
    );
  }

  if (stage) {
    gsap.fromTo(stage,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.1, delay: 0.15, ease }
    );
  }
}

/**
 * Setup smooth entrance animations for all downstream sections
 */
export function setupSectionAnimations(isReducedMotion: boolean = false) {
  if (isReducedMotion) return { destroy: () => {} };

  const triggers: ScrollTrigger[] = [];

  // 1. About section facts stagger
  const facts = document.querySelectorAll('.about-fact');
  if (facts.length > 0) {
    const st = ScrollTrigger.create({
      trigger: '#about',
      start: 'top 80%',
      onEnter: () => {
        gsap.fromTo(facts,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out' }
        );
      },
      once: true
    });
    triggers.push(st);
  }

  // 2. About statement card
  const statement = document.querySelector('.about-statement');
  if (statement) {
    const st = ScrollTrigger.create({
      trigger: statement,
      start: 'top 85%',
      onEnter: () => {
        gsap.fromTo(statement,
          { opacity: 0, scale: 0.97, y: 24 },
          { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: 'power3.out' }
        );
      },
      once: true
    });
    triggers.push(st);
  }

  // 3. Categories rows stagger
  const catRows = document.querySelectorAll('.category-row');
  if (catRows.length > 0) {
    const st = ScrollTrigger.create({
      trigger: '#categories',
      start: 'top 80%',
      onEnter: () => {
        gsap.fromTo(catRows,
          { opacity: 0, x: -24 },
          { opacity: 1, x: 0, duration: 0.5, stagger: 0.07, ease: 'power2.out' }
        );
      },
      once: true
    });
    triggers.push(st);
  }

  // 4. How steps stagger
  const howSteps = document.querySelectorAll('.how-step-card');
  if (howSteps.length > 0) {
    const st = ScrollTrigger.create({
      trigger: '#how',
      start: 'top 80%',
      onEnter: () => {
        gsap.fromTo(howSteps,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'back.out(1.2)' }
        );
      },
      once: true
    });
    triggers.push(st);
  }

  // 5. Report form card entrance
  const reportForm = document.querySelector('.report-form-card');
  if (reportForm) {
    const st = ScrollTrigger.create({
      trigger: '#report',
      start: 'top 80%',
      onEnter: () => {
        gsap.fromTo(reportForm,
          { opacity: 0, y: 32 },
          { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }
        );
      },
      once: true
    });
    triggers.push(st);
  }

  // Refresh after small delay to ensure all heights are calculated
  setTimeout(() => {
    ScrollTrigger.refresh();
  }, 100);

  return {
    destroy: () => {
      triggers.forEach((t) => t.kill());
    }
  };
}
