'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from '@/lib/i18n';
import { useStore } from '@/lib/store';

export function ShellChrome() {
  const { lang, setLang, t } = useLang();
  const { role, setRole } = useStore();
  const pathname = usePathname();
  const [gridOn, setGridOn] = useState(false);
  const [metrics, setMetrics] = useState({ cols: 12, colw: '98.0', gut: 10, mar: 20, w: 1440, h: 900, pct: '0.0' });
  const markSvgRef = useRef<SVGSVGElement>(null);

  // Build Open Grid style 6-row modular slab wordmark for "XOHARI"
  useEffect(() => {
    const svg = markSvgRef.current;
    if (!svg) return;
    svg.innerHTML = '';
    const GLYPHS: Record<string, [number, number[][]]> = {
      C: [9, [[1, 0, 8, 1], [0, 1, 3, 4], [1, 5, 8, 1]]],
      I: [4, [[0, 0, 4, 1], [0.5, 1, 3, 4], [0, 5, 4, 1]]],
      V: [9, [[0, 0, 3, 4], [6, 0, 3, 4], [1.5, 4, 6, 2]]],
      S: [9, [[1, 0, 8, 1], [0, 1, 3, 2], [1, 2.5, 7, 1], [6, 3.5, 3, 1.5], [0, 5, 8, 1]]],
      E: [8, [[0, 0, 3, 6], [3, 0, 5, 1], [3, 2.5, 4, 1], [3, 5, 5, 1]]],
      N: [10, [[0, 0, 3, 6], [7, 0, 3, 6], [3, 0, 1.5, 2.5], [4.5, 2, 1.5, 2.5], [6, 3.5, 1.5, 2.5]]],
    };
    let x = 0;
    const GAP = 1.2;
    'XOHARI'.split('').forEach((ch, idx, arr) => {
      const g = GLYPHS[ch];
      if (!g) return;
      g[1].forEach((r) => {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(x + r[0]));
        rect.setAttribute('y', String(r[1]));
        rect.setAttribute('width', String(r[2]));
        rect.setAttribute('height', String(r[3]));
        svg.appendChild(rect);
      });
      x += g[0] + (idx < arr.length - 1 ? GAP : 0);
    });
    svg.setAttribute('viewBox', `0 0 ${x.toFixed(2)} 6`);
  }, []);

  // Keyboard shortcut 'G' for Live Grid Inspector
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(el.tagName))) return;
      if (e.key === 'g' || e.key === 'G') setGridOn((prev) => !prev);
      if (e.key === 'Escape') setGridOn(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!gridOn) return;
    const updateMetrics = () => {
      const w = document.documentElement.clientWidth;
      const h = window.innerHeight;
      const isMob = w < 768;
      const cols = isMob ? 4 : 12;
      const mar = isMob ? 12 : 20;
      const gut = 10;
      const colw = ((w - 2 * mar - (cols - 1) * gut) / cols).toFixed(1);
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - h);
      const pct = ((window.scrollY / maxScroll) * 100).toFixed(1);
      setMetrics({ cols, colw, gut, mar, w, h, pct });
    };
    updateMetrics();
    window.addEventListener('scroll', updateMetrics, { passive: true });
    window.addEventListener('resize', updateMetrics);
    return () => {
      window.removeEventListener('scroll', updateMetrics);
      window.removeEventListener('resize', updateMetrics);
    };
  }, [gridOn]);

  return (
    <>
      <a className="skip" href="#main-content">
        Skip to main content
      </a>

      <header className="nav" id="nav">
        <Link className="nav__brand" href="/" aria-label="Xohari DU Home">
          <svg viewBox="0 0 22 14" aria-hidden="true">
            <rect x="0" y="0" width="5" height="14" fill="#0A0A0A" />
            <rect x="6" y="0" width="16" height="5" fill="#FFC400" />
            <rect x="6" y="6" width="5" height="8" fill="#19C37D" />
            <rect x="12" y="9" width="10" height="5" fill="#0A0A0A" />
          </svg>
          <span>Xohari</span>
        </Link>

        <nav className="nav__links" aria-label="Primary Navigation">
          <Link href="/#index" className={pathname === '/' ? 'is-active' : ''}>
            {t.nav.index}
          </Link>
          <Link href="/report" className={pathname === '/report' ? 'is-active' : ''}>
            {t.nav.report}
          </Link>
          <Link href="/my-reports" className={pathname.startsWith('/my-reports') || pathname.startsWith('/track') ? 'is-active' : ''}>
            {t.nav.myReports}
          </Link>
          <Link href="/officer" className={pathname === '/officer' ? 'is-active' : ''}>
            {t.nav.officer}
          </Link>
          <Link href="/admin" className={pathname === '/admin' ? 'is-active' : ''}>
            {t.nav.admin}
          </Link>
        </nav>

        <span className="nav__meta mono">{t.eventBadge}</span>

        <button
          type="button"
          className="nav__lang mono"
          onClick={() => {
            const nextRole = role === 'reporter' ? 'officer' : role === 'officer' ? 'admin' : 'reporter';
            setRole(nextRole);
          }}
          title="Quick Demo Role Switcher"
        >
          <span>ROLE: {role.toUpperCase()}</span>
        </button>

        <button
          className="nav__grid mono"
          type="button"
          aria-pressed={gridOn}
          onClick={() => setGridOn(!gridOn)}
        >
          Grid <kbd>G</kbd>
        </button>

        <Link className="nav__cta" href="/report">
          {t.nav.report} <span aria-hidden="true">→</span>
        </Link>
      </header>

      {/* Live 12-Column Swiss Grid Inspector */}
      <div className={`inspector ${gridOn ? 'is-on' : ''}`} aria-hidden={!gridOn}>
        <div className="inspector__base" />
        <div className="inspector__cols">
          {Array.from({ length: metrics.cols }).map((_, i) => (
            <i key={i}>
              <b>{i === 0 ? `C1 ${metrics.colw}` : metrics.colw}</b>
            </i>
          ))}
        </div>
        <div className="inspector__read mono" role="status">
          <span>Columns</span>
          <em>{metrics.cols} × {metrics.colw} px</em>
          <span>Gutter / Margin</span>
          <em>{metrics.gut} / {metrics.mar} px</em>
          <span>Viewport</span>
          <em>{metrics.w} × {metrics.h}</em>
          <span>Active Lang / Role</span>
          <em>{lang.toUpperCase()} / {role.toUpperCase()}</em>
          <span>Scroll</span>
          <em>{metrics.pct}%</em>
        </div>
      </div>

      {/* Collapsing Slab Wordmark on the Landing Route */}
      {pathname === '/' && (
        <div className="mark" id="mark" aria-hidden="true">
          <svg ref={markSvgRef} preserveAspectRatio="none" />
        </div>
      )}
    </>
  );
}

