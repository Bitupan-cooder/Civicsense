import { useEffect, useRef, type CSSProperties } from 'react';
import { gsap } from 'gsap';

export interface LayeredTextLine {
  top: string;
  bottom: string;
}

interface LayeredTextProps {
  lines?: LayeredTextLine[];
  className?: string;
}

const DEFAULT_LINES: LayeredTextLine[] = [
  { top: 'SPEAK UP', bottom: 'BE HEARD' },
  { top: 'BE HEARD', bottom: 'CAMPUS' },
  { top: 'CAMPUS', bottom: 'CHANGE' },
  { top: 'CHANGE', bottom: 'STARTS HERE' },
  { top: 'STARTS HERE', bottom: 'XOHARI' },
];

/** Hoverable layered type treatment for the student portal panel. */
export function LayeredText({ lines = DEFAULT_LINES, className = '' }: LayeredTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const paragraphs = container.querySelectorAll<HTMLElement>('[data-layer-copy]');
    const animation = gsap.timeline({ paused: true }).to(paragraphs, {
      y: () => -(paragraphs[0]?.offsetHeight || 56),
      color: '#7FBF00',
      duration: 0.65,
      ease: 'power2.out',
      stagger: 0.055,
    });
    const play = () => animation.play();
    const reverse = () => animation.reverse();
    container.addEventListener('mouseenter', play);
    container.addEventListener('mouseleave', reverse);
    container.addEventListener('focusin', play);
    container.addEventListener('focusout', reverse);

    return () => {
      container.removeEventListener('mouseenter', play);
      container.removeEventListener('mouseleave', reverse);
      container.removeEventListener('focusin', play);
      container.removeEventListener('focusout', reverse);
      animation.kill();
    };
  }, [lines]);

  const center = Math.floor(lines.length / 2);
  return (
    <div ref={containerRef} className={`layered-text ${className}`} aria-label="Speak up, be heard. Campus change starts here.">
      <ul>
        {lines.map((line, index) => (
          <li className={index % 2 === 0 ? 'layered-text-row is-wide' : 'layered-text-row'}
            key={`${line.top}-${line.bottom}-${index}`}
            style={{ '--layer-offset': `${(index - center) * 18}px` } as CSSProperties}>
            <p data-layer-copy>{line.top}</p>
            <p data-layer-copy>{line.bottom}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
