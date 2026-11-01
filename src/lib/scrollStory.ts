import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export interface CivicActionConfig {
  id: string;
  name: string;
  windowStart: number;
  windowEnd: number;
}

export const CIVIC_ACTIONS: CivicActionConfig[] = [
  {
    id: 'action-recycling',
    name: 'Clean Campus & Recycling',
    windowStart: 0.0,
    windowEnd: 0.2,
  },
  {
    id: 'action-plantation',
    name: 'Grounds Care & Plantation',
    windowStart: 0.2,
    windowEnd: 0.4,
  },
  {
    id: 'action-voice',
    name: 'Student Redressal Voice',
    windowStart: 0.4,
    windowEnd: 0.6,
  },
  {
    id: 'action-audit',
    name: 'SLA Governance & Audit',
    windowStart: 0.6,
    windowEnd: 0.8,
  },
  {
    id: 'action-dispatch',
    name: 'Direct Resolution Box',
    windowStart: 0.8,
    windowEnd: 1.0,
  },
];

export function focusCharacterWithGsap(container: HTMLElement | null, activeId: string) {
  if (!container) return;
  CIVIC_ACTIONS.forEach((action) => {
    const wrapper = container.querySelector(`[data-action-id="${action.id}"]`) as HTMLElement | null;
    if (!wrapper) return;
    const actor = (wrapper.querySelector('.civic-char-actor') as HTMLElement) || wrapper;
    const bubble = wrapper.querySelector('.civic-char-bubble') as HTMLElement | null;
    const isTarget = action.id === activeId;

    gsap.to(actor, {
      y: isTarget ? -14 : 0,
      scale: isTarget ? 1.06 : 0.96,
      duration: 0.35,
      ease: 'back.out(1.6)',
      overwrite: 'auto',
    });

    if (bubble) {
      gsap.to(bubble, {
        y: isTarget ? -4 : 0,
        scale: isTarget ? 1.05 : 0.96,
        opacity: isTarget ? 1 : 0.88,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
  });
}

export function setupScrollStory(
  container: HTMLElement,
  isReducedMotion: boolean = false,
  onStepChange?: (actionId: string, activeCount: number, progress: number) => void
) {
  const stage = container.querySelector('.hero-stage') as HTMLElement;
  const stageTilt = container.querySelector('.hero-stage-tilt') as HTMLElement;
  const innerLayer = container.querySelector('.hero-stage-inner') as HTMLElement;
  if (!stage || !stageTilt || !innerLayer) return { destroy: () => {} };

  CIVIC_ACTIONS.forEach((action, idx) => {
    const wrapper = container.querySelector(`[data-action-id="${action.id}"]`) as HTMLElement | null;
    if (!wrapper) return;
    const actor = (wrapper.querySelector('.civic-char-actor') as HTMLElement) || wrapper;
    const bubble = wrapper.querySelector('.civic-char-bubble') as HTMLElement | null;

    gsap.set(actor, {
      transformOrigin: '50% 95%',
      opacity: 1,
      scale: idx === 0 ? 1.06 : 0.96,
      y: idx === 0 ? -12 : 0,
    });

    if (bubble) {
      gsap.set(bubble, {
        opacity: idx === 0 ? 1 : 0.88,
        scale: idx === 0 ? 1.05 : 0.96,
        y: idx === 0 ? -4 : 0,
      });
    }
  });

  if (isReducedMotion) {
    return { destroy: () => {} };
  }

  // Gentle interactive parallax on stageTilt without clipping or shrinking width
  const tiltXTo = gsap.quickTo(stageTilt, 'rotationX', { duration: 0.4, ease: 'power2.out' });
  const tiltYTo = gsap.quickTo(stageTilt, 'rotationY', { duration: 0.4, ease: 'power2.out' });

  const onMouseMove = (e: MouseEvent) => {
    const curMouseX = e.clientX / window.innerWidth - 0.5;
    const curMouseY = e.clientY / window.innerHeight - 0.5;
    tiltXTo(-curMouseY * 4);
    tiltYTo(curMouseX * 5);
  };

  window.addEventListener('mousemove', onMouseMove, { passive: true });

  let lastReportedIdx = 0;

  // Non-pinned ScrollTrigger so the Hero section ALWAYS stays 100% full-screen width and height
  // on any window/iframe resize without GSAP pin-spacer locking pixel dimensions.
  const st = ScrollTrigger.create({
    trigger: container,
    start: 'top top',
    end: 'bottom top',
    scrub: 0.3,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      const idx = Math.min(
        CIVIC_ACTIONS.length - 1,
        Math.max(0, Math.floor(self.progress * CIVIC_ACTIONS.length))
      );
      const activeCount = Math.min(5, Math.max(1, idx + 1));

      if (idx !== lastReportedIdx) {
        lastReportedIdx = idx;
        const targetId = CIVIC_ACTIONS[idx].id;
        focusCharacterWithGsap(container, targetId);
        if (onStepChange) {
          onStepChange(targetId, activeCount, self.progress);
        }
      }
    },
  });

  return {
    destroy: () => {
      st.kill();
      window.removeEventListener('mousemove', onMouseMove);
    },
  };
}

export function runLoadReveal(container: HTMLElement, isReducedMotion: boolean = false) {
  if (isReducedMotion) return;

  const actors = container.querySelectorAll('.civic-char-actor');
  const bubbles = container.querySelectorAll('.civic-char-bubble');

  if (actors.length > 0) {
    gsap.fromTo(
      actors,
      { opacity: 0, y: 24, scale: 0.9 },
      {
        opacity: 1,
        y: (i) => (i === 0 ? -12 : 0),
        scale: (i) => (i === 0 ? 1.06 : 0.96),
        duration: 0.6,
        delay: 0.08,
        stagger: 0.06,
        ease: 'back.out(1.4)',
      }
    );
  }

  if (bubbles.length > 0) {
    gsap.fromTo(
      bubbles,
      { opacity: 0, y: 10, scale: 0.88 },
      {
        opacity: (i) => (i === 0 ? 1 : 0.88),
        y: (i) => (i === 0 ? -4 : 0),
        scale: (i) => (i === 0 ? 1.05 : 0.96),
        duration: 0.5,
        delay: 0.18,
        stagger: 0.06,
        ease: 'back.out(1.6)',
      }
    );
  }
}

export function setupSectionAnimations(isReducedMotion: boolean = false) {
  if (isReducedMotion) return { destroy: () => {} };

  const triggers: ScrollTrigger[] = [];

  const facts = document.querySelectorAll('.about-fact');
  if (facts.length > 0) {
    const st = ScrollTrigger.create({
      trigger: '#about',
      start: 'top 85%',
      onEnter: () => {
        gsap.fromTo(
          facts,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.45, stagger: 0.05, ease: 'power2.out' }
        );
      },
      once: true,
    });
    triggers.push(st);
  }

  setTimeout(() => {
    ScrollTrigger.refresh();
  }, 100);

  return {
    destroy: () => {
      triggers.forEach((t) => t.kill());
    },
  };
}
