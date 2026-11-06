"use client"

import * as React from "react"
import { useLanguage } from "../../i18n"

/**
 * Sticker Slap Footer (stickers and social icons removed: CivicSense uses neither) — a cream frame, a
 * green panel with three columns (links, office, contact), and a giant fat script wordmark sinking into
 * the bottom edge.
 *
 * The storyboard: as the footer scrolls in, the panel grows out of the frame and its corners settle.
 * Then the column tags pop, the lines rise out of their masks and the wordmark writes itself in one
 * continuous marker stroke (t-crosses and i-dots last). Click the wordmark to write it again, copy the
 * email, open the credits.
 *
 * No dependencies and nothing fetched. The script is a built-in single-stroke alphabet drawn as SVG.
 */

// #region slap
// Pure: the script alphabet, its layout, and the star path.

/** A small deterministic hash → [0, 1), so every render places things the same way. */
const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

const round = (v: number): number => Math.round(v * 100) / 100

const clamp = (v: number, lo: number, hi: number): number => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo)

/**
 * A fat single-stroke script: [advance, main stroke, pen-lift strokes, lifts
 * after?]. x-height 10, baseline 0, y runs down. Every main stroke starts at
 * (0, -1) and, unless it lifts, ends at (advance, -1), so letters chain into
 * one continuous path. Absolute M / L / C only, so x and y simply alternate.
 */
const SCRIPT: Record<string, [number, string, string?, number?]> = {
  a: [10.2, "M0 -1C1.4 -1.4 1.4 -9.6 4.3 -10C2.5 -10 1 -7.8 1 -5C1 -2.2 2.5 0 4.3 0C6.1 0 7.6 -2.2 7.6 -5L7.8 -10L7.8 -3C7.8 -0.8 8.8 -1 10.2 -1"],
  b: [9.4, "M0 -1C2.8 -3 6.2 -12 6 -16.4C5.8 -19.8 1.8 -20 1.8 -16.4L1.8 -1L1.8 -6C2.4 -9 3.4 -10 4.8 -10C6.8 -10 8.2 -8 8.2 -5C8.2 -2 6.6 0 4.8 0C3.4 0 2.4 -0.6 1.8 -1.6C2.4 -0.6 3.4 0 4.8 0C6.6 0 7.8 -0.8 9.4 -1"],
  c: [8.8, "M0 -1C1.4 -1.4 1.4 -9.6 4.3 -10C5.6 -10 6.6 -9.6 7 -8.6C6.6 -9.6 5.6 -10 4.3 -10C2.5 -10 1 -7.8 1 -5C1 -2.2 2.5 0 4.3 0C6 0 7 -1 8.8 -1"],
  d: [10.2, "M0 -1C1.4 -1.4 1.4 -9.6 4.3 -10C2.5 -10 1 -7.8 1 -5C1 -2.2 2.5 0 4.3 0C6.1 0 7.6 -2.2 7.6 -5L7.8 -19L7.8 -3C7.8 -0.8 8.8 -1 10.2 -1"],
  e: [9.4, "M0 -1C3.4 -2.4 8 -4.4 8 -7.6C8 -9.4 6.6 -10.4 4.8 -10.4C2.2 -10.4 0.8 -7.8 0.8 -5C0.8 -1.8 2.6 0 5 0C6.8 0 8 -1 9.4 -1"],
  f: [7, "M0 -1C2.8 -3 6.2 -12 6 -16.4C5.8 -19.8 1.8 -20 1.8 -16.4L1.8 7.2C1.8 9.6 3.2 9.6 3.8 7.6C4.4 5 4.8 -1 7 -1", "M-0.4 -9.4L5.4 -9.4"],
  g: [9.6, "M0 -1C1.4 -1.4 1.4 -9.6 4.3 -10C2.5 -10 1 -7.8 1 -5C1 -2.2 2.5 0 4.3 0C6.1 0 7.6 -2.2 7.6 -5L7.8 -10L7.8 4C7.8 8.6 5.8 9.6 4.2 9.6C2 9.6 1.4 7.6 2.8 6C4.6 4 7.4 1.4 9.6 -1"],
  h: [10, "M0 -1C2.8 -3 6.2 -12 6 -16.4C5.8 -19.8 1.8 -20 1.8 -16.4L1.8 -1L1.8 -5.6C2.6 -8.6 4 -10 5.6 -10C7.2 -10 7.8 -8.8 7.8 -7L7.8 -3C7.8 -0.8 8.8 -1 10 -1"],
  i: [5, "M0 -1C1.2 -1.4 2 -6 2.2 -10L2.2 -3C2.2 -0.8 3.4 -1 5 -1", "M2.4 -15.2L2.5 -15.3"],
  j: [5.4, "M0 -1C1.2 -1.4 2 -6 2.2 -10L2.2 4.6C2.2 9.6 -0.6 9.8 -0.2 7.4C0.2 5 3.4 1.4 5.4 -1", "M2.4 -15.2L2.5 -15.3"],
  k: [9.6, "M0 -1C2.8 -3 6.2 -12 6 -16.4C5.8 -19.8 1.8 -20 1.8 -16.4L1.8 -1L1.8 -4.6C3 -8 5.6 -10.4 7 -9.6C8.4 -8.6 7 -5.6 3.6 -5C5.6 -4.6 6.6 -1 9.6 -1"],
  l: [6.4, "M0 -1C2.8 -3 6.2 -12 6 -16.4C5.8 -19.8 1.8 -20 1.8 -16.4L1.8 -3.2C1.8 -0.6 4 -1 6.4 -1"],
  m: [14.6, "M0 -1C1.2 -1.6 1.6 -6 1.8 -9.6L1.8 -1L1.8 -5.6C2.4 -8.6 3.4 -10 4.8 -10C6.2 -10 7 -9 7 -7L7 -1L7 -5.6C7.6 -8.6 8.6 -10 10 -10C11.4 -10 12.2 -9 12.2 -7L12.2 -3C12.2 -0.8 13.2 -1 14.6 -1"],
  n: [9.6, "M0 -1C1.2 -1.6 1.6 -6 1.8 -9.6L1.8 -1L1.8 -5.6C2.4 -8.6 3.4 -10 4.8 -10C6.4 -10 7.2 -9 7.2 -7L7.2 -3C7.2 -0.8 8.2 -1 9.6 -1"],
  o: [9, "M0 -1C1.4 -1.4 1.4 -9.6 4.3 -10C2.5 -10 1 -7.8 1 -5C1 -2.2 2.5 0 4.3 0C6.1 0 7.6 -2.2 7.6 -5C7.6 -7.8 6.1 -10 4.3 -10C6 -10 7.4 -9.2 9 -9", "", 1],
  p: [9.6, "M0 -1C1.2 -1.6 1.6 -6 1.8 -9.6L1.8 9L1.8 -5.6C2.4 -8.6 3.4 -10 5 -10C7 -10 8.2 -8 8.2 -5C8.2 -2 6.6 0 4.8 0C3.4 0 2.4 -0.6 1.8 -1.6C2.4 -0.6 3.4 0 4.8 0C6.6 0 7.8 -0.8 9.6 -1"],
  q: [10.4, "M0 -1C1.4 -1.4 1.4 -9.6 4.3 -10C2.5 -10 1 -7.8 1 -5C1 -2.2 2.5 0 4.3 0C6.1 0 7.6 -2.2 7.6 -5L7.8 -10L7.8 9C8.8 6 9 0 10.4 -1"],
  r: [8.6, "M0 -1C1.2 -1.6 1.6 -6 1.8 -9.6L1.8 -1L1.8 -5.6C2.6 -8.6 4.2 -10 5.8 -10C6.8 -10 7.6 -9.6 8.2 -8.8", "", 1],
  s: [8.4, "M0 -1C1.6 -2 3 -7 4.4 -10.2C5.6 -8 7.4 -6 7.4 -3.6C7.4 -1.2 5.6 0 3.6 0C2 0 1 -0.6 0.6 -1.6C1 -0.6 2 0 3.6 0C5.6 0 6.8 -0.8 8.4 -1"],
  t: [6.6, "M0 -1C1 -1.4 2.2 -8 2.4 -15L2.4 -3.2C2.4 -0.8 4 -1 6.6 -1", "M-0.8 -9.6L6.2 -9.6"],
  u: [10, "M0 -1C1.2 -1.6 1.6 -6 1.8 -9.6L1.8 -3.6C1.8 -1 3 0 4.6 0C6.2 0 7.4 -1.4 7.6 -4L7.6 -9.8L7.6 -3C7.6 -0.8 8.6 -1 10 -1"],
  v: [9, "M0 -1C1.2 -1.6 1.6 -6 1.6 -9.6C1.6 -6 2.6 0 4.4 0C6.4 0 7.6 -6 7.6 -9.6C8 -9 8.4 -8.8 9 -8.8", "", 1],
  w: [12.6, "M0 -1C1.2 -1.6 1.6 -6 1.6 -9.6L1.6 -3.6C1.6 -1 2.6 0 4 0C5.4 0 6.2 -1 6.2 -3.6L6.2 -8L6.2 -3.6C6.2 -1 7 0 8.4 0C9.8 0 10.8 -1 10.8 -3.6L10.8 -9.6C11.2 -9 11.8 -8.8 12.6 -8.8", "", 1],
  x: [9, "M0 -1C1.6 -2 2 -8.6 3 -9.6L7 -1C7.6 -0.4 8.4 -1 9 -1", "M7.4 -9.6L2.4 -0.4"],
  y: [9.6, "M0 -1C1.2 -1.6 1.6 -6 1.8 -9.6L1.8 -3.6C1.8 -1 3 0 4.6 0C6.2 0 7.4 -1.4 7.6 -4L7.6 -9.8L7.6 4.4C7.6 9 5.6 9.6 4.2 9.6C2 9.6 1.4 7.6 2.8 6C4.6 4 7.4 1.6 9.6 -1"],
  z: [8.8, "M0 -1C1 -2 1.4 -9.6 2.6 -9.6L7.4 -9.6L1.6 -0.2L6 -0.2C7 -0.2 7.8 -1 8.8 -1"],
  "!": [4, "M2 -16L2 -4.4", "M2 -0.6L2.1 -0.7", 1],
  ".": [3.6, "M1.8 -0.6L1.9 -0.7", "", 1],
}

/** Horizontal stretch and the gap between letters, in script units. */
const SX = 1.22
const TRACK = 1
const WORD_GAP = 6

/** Shifts and stretches every x in an absolute M/L/C path. */
const place = (d: string, dx: number, sx: number = SX): string => {
  let k = 0
  return d.replace(/-?\d*\.?\d+/g, (n) => (k++ % 2 === 0 ? String(round(+n * sx + dx)) : n))
}

type ScriptBox = { x0: number; x1: number; top: number }
type ScriptWord = { main: string; extra: string[]; width: number; top: number; bottom: number; boxes: ScriptBox[] }

const extent = (d: string): number[] => {
  const n = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number)
  return n.filter((_, i) => i % 2 === 1)
}

/**
 * Lays text out in the script: one continuous main stroke (moves only where a
 * letter lifts or a space falls) plus the pen-lift strokes, drawn after.
 * Case is ignored, accents are stripped, anything unknown is a space.
 */
const layoutScript = (text: string): ScriptWord => {
  const clean = String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
  let x = 0
  let main = ""
  const extra: string[] = []
  const boxes: ScriptBox[] = []
  let lift = true
  let top = 0
  let bottom = 0
  for (const ch of clean) {
    const g = SCRIPT[ch]
    if (!g) {
      if (main) x += WORD_GAP
      lift = true
      continue
    }
    const d = place(g[1], x)
    main += lift ? d : "L" + d.slice(1)
    if (g[2]) extra.push(place(g[2], x))
    const ys = extent(g[1] + (g[2] ?? ""))
    const t = Math.min(...ys)
    top = Math.min(top, t)
    bottom = Math.max(bottom, ...ys)
    boxes.push({ x0: round(x), x1: round(x + g[0] * SX), top: t })
    lift = !!g[3]
    x += g[0] * SX + TRACK
  }
  return { main, extra, width: boxes.length ? round(x - TRACK) : 0, top, bottom, boxes }
}

/** A closed star: `points` spikes, alternating radii. `wobble` makes the spikes uneven, like a hand-cut sticker. */
const starPath = (
  points: number,
  outer: number,
  inner: number,
  cx: number = 0,
  cy: number = 0,
  wobble: number = 0,
  seed: number = 0,
): string => {
  const n = Math.max(3, Math.floor(points) || 3)
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 ? inner : outer * (1 + (hash(i * 9.7 + seed) - 0.5) * wobble)
    pts.push(round(cx + Math.cos(a) * r) + " " + round(cy + Math.sin(a) * r))
  }
  return "M" + pts.join("L") + "Z"
}
// #endregion

/** Everything the footer shows. Edit here. */
const FOOTER = {
  /** The giant script wordmark. Letters a–z, `!` and `.`; anything else is a space. */
  wordmark: "xohari",
  /** Where the small wordmark in the top bar points. */
  homeHref: "/",
  /** The starburst link in the top-left corner. */
  navLabel: "Report an issue",
  navHref: "/login",
  /** Messaging link: the top-right bubble and the contact line. */
  chatHref: "mailto:network-helpdesk@dibru.ac.in",
  chatLabel: "Email the campus helpdesk",
  jobsLabel: "Explore Xohari",
  jobs: [
    { title: "Home", href: "/" },
    { title: "Workflow", href: "/#how" },
    { title: "Categories", href: "/#categories" },
    { title: "Track a complaint", href: "/report/new?view=mine#report-tracker" },
  ],
  officeLabel: "Associated with",
  officeLinkText: "Blitz",
  officeHref: "https://blitz.ccsdu.in",
  /** One entry per line. */
  address: ["Centre for Computer Science & Applications (CCSA)", "Dibrugarh University"],
  mapLabel: "Campus emergency: +91 373 237-0239",
  mapHref: "tel:+913732370239",
  contactLabel: "Campus helpdesk",
  /** Click copies it (falls back to `mailto:`). */
  email: "network-helpdesk@dibru.ac.in",
  copiedLabel: "Copied to clipboard",
  /** Small print under the contact lines, marked by an asterisk on the chat link. `""` hides it.
   * This is the template's placeholder, shown since the footer was added: replace or remove it. */
  note: "*phone calls give us the jitters. texts and voice notes are lovely.",
  credits: [
    { role: "Platform", name: "Xohari" },
    { role: "University", name: "Dibrugarh University" },
    { role: "Built by", name: "BLITZ" },
  ],
}

/** How far below the baseline the panel edge cuts the wordmark, in script units. */
const CUT = -1.2
const STROKE = 3.3
/** The script leans: tan(9°). */
const SLANT = 0.1584

const SQUIGGLE = "M1 5C7 1 11 1 15 4S24 8 29 4S38 0 43 4S52 8 57 4S66 1 71 4S80 7 87 3"

const CSS =
  // theme: frame, panel, text on the frame and tags, wordmark and panel text, nav starburst, font; height and the wordmark's height cap
  ".ssf{--ssf-paper:#f5f9ef;--ssf-panel:#1a7a3a;--ssf-ink:#12351d;--ssf-cream:#ffffff;--ssf-accent:#B5F800;--ssf-sans:'Inter Tight', system-ui, sans-serif;--ssf-wmh:36svh;min-height:min(820px, 100svh);position:relative;isolation:isolate;overflow:hidden;overflow:clip;container-type:inline-size;display:flex;flex-direction:column;width:100%;box-sizing:border-box;padding:0 clamp(6px,.9cqw,12px) clamp(6px,.9cqw,12px);background:var(--ssf-paper);color:var(--ssf-ink);font-family:var(--ssf-sans);font-weight:500;-webkit-font-smoothing:antialiased}" +
  ":where(.ssf) *,:where(.ssf) *::before,:where(.ssf) *::after{box-sizing:border-box}" +
  ":where(.ssf) button{appearance:none;background:none;border:0;padding:0;margin:0;font:inherit;color:inherit;cursor:pointer}" +
  ":where(.ssf) a{color:inherit;text-decoration:none}" +
  ":where(.ssf) ul,:where(.ssf) p,:where(.ssf) h3{margin:0;padding:0;list-style:none;font:inherit}" +
  ".ssf svg{display:block;max-width:none;overflow:visible}" +
  ".ssf :focus-visible{outline:2.5px solid var(--ssf-accent);outline-offset:3px;border-radius:6px}" +
  ".ssf-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}" +
  // top bar
  ".ssf-top{position:relative;z-index:2;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:clamp(14px,2cqw,26px) clamp(10px,1.6cqw,22px) clamp(24px,5cqw,80px)}" +
  ".ssf-nav{justify-self:start;position:relative;display:grid;place-items:center;width:clamp(58px,6.2cqw,80px);height:clamp(42px,4.4cqw,56px);font-weight:800;font-size:clamp(15px,1.6cqw,20px);letter-spacing:-.02em;color:var(--ssf-ink)}" +
  ".ssf-nav svg{position:absolute;left:-6%;top:-14%;width:72%;height:auto;color:var(--ssf-accent);transition:transform .7s cubic-bezier(.2,1.4,.3,1)}" +
  ".ssf-nav span{position:relative;transition:transform .4s cubic-bezier(.2,1.6,.3,1)}" +
  ".ssf-nav:hover svg{transform:rotate(72deg) scale(1.12)}" +
  ".ssf-nav:hover span{transform:rotate(-6deg) scale(1.06)}" +
  ".ssf-logo{display:block;color:var(--ssf-ink)}" +
  ".ssf-logo svg{height:clamp(24px,2.5cqw,34px);width:auto}" +
  ".ssf-logo path{fill:none;stroke:currentColor;stroke-width:3.3;stroke-linecap:round;stroke-linejoin:round}" +
  ".ssf-chat{justify-self:end;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;color:var(--ssf-ink);transition:transform .45s cubic-bezier(.2,1.6,.3,1)}" +
  ".ssf-chat svg{width:24px;height:24px}" +
  ".ssf-chat:hover{transform:rotate(-14deg) scale(1.12)}" +
  // panel
  ".ssf-panel{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;overflow:hidden;overflow:clip;border-radius:clamp(14px,1.8cqw,24px);background:var(--ssf-panel);color:var(--ssf-cream);transform-origin:50% 100%}" +
  ".ssf-cols{position:relative;z-index:2;display:grid;grid-template-columns:repeat(var(--ssf-n,3),minmax(0,1fr));gap:clamp(22px,3cqw,44px) clamp(16px,2.4cqw,36px);padding:clamp(26px,5.4cqw,72px) clamp(18px,1.8cqw,26px) clamp(20px,3cqw,40px)}" +
  ".ssf-col{display:flex;flex-direction:column;align-items:flex-start;min-width:0}" +
  ".ssf-tag{display:inline-block;margin-bottom:clamp(14px,1.6cqw,22px);padding:.28em .72em .32em;border-radius:999px;background:var(--ssf-cream);color:var(--ssf-ink);font-size:clamp(12px,1.05cqw,14px);font-weight:600;line-height:1.2;letter-spacing:-.005em}" +
  ".ssf-big{font-size:clamp(19px,2.1cqw,30px);font-weight:800;line-height:1.16;letter-spacing:-.022em}" +
  ".ssf-line{display:block;overflow:hidden;overflow:clip;padding:0 .08em .06em;margin:0 -.08em -.06em}" +
  ".ssf-line>*{display:inline-block}" +
  ".ssf-big a,.ssf-big button{position:relative;text-align:left;transition:color .2s}" +
  ".ssf-big a::after,.ssf-big button::after{content:'';position:absolute;left:0;right:0;bottom:-.02em;height:.09em;border-radius:1em;background:currentColor;transform:scaleX(0);transform-origin:100% 50%;transition:transform .45s cubic-bezier(.6,0,.2,1)}" +
  ".ssf-big a:hover::after,.ssf-big button:hover::after,.ssf-big a:focus-visible::after,.ssf-big button:focus-visible::after{transform:scaleX(1);transform-origin:0 50%}" +
  ".ssf-copy{display:inline-grid !important}" +
  ".ssf-copy>span{grid-area:1/1;transition:transform .5s cubic-bezier(.2,1.2,.3,1),opacity .3s}" +
  ".ssf-copy .ssf-done{transform:translateY(105%);opacity:0}" +
  ".ssf-copy.is-copied .ssf-addr{transform:translateY(-105%);opacity:0}" +
  ".ssf-copy.is-copied .ssf-done{transform:none;opacity:1}" +
  ".ssf-ast{display:inline-block;margin-left:.04em;transition:transform .6s cubic-bezier(.2,1.6,.3,1)}" +
  ".ssf-big a:hover .ssf-ast{transform:rotate(180deg) scale(1.2)}" +
  ".ssf-map{position:relative;display:inline-block;margin-top:clamp(16px,1.8cqw,24px);font-size:clamp(14px,1.25cqw,17px);font-weight:700;letter-spacing:-.01em;padding-bottom:.55em}" +
  ".ssf-map svg{position:absolute;left:-2%;bottom:0;width:104%;height:.5em}" +
  ".ssf-map path{fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-dasharray:var(--l,120px) var(--l,120px);stroke-dashoffset:0}" +
  ".ssf-map:hover path,.ssf-map:focus-visible path{animation:ssf-rewrite .7s cubic-bezier(.6,0,.3,1)}" +
  ".ssf-note{margin-top:clamp(12px,1.3cqw,18px);max-width:34ch;font-size:clamp(11px,.92cqw,13px);line-height:1.45;opacity:.82}" +
  // the wordmark stage
  ".ssf-stage{position:relative;z-index:1;margin-top:auto;width:min(100%,calc(var(--ssf-wmh) * var(--ssf-ar)));align-self:center;padding:0 clamp(6px,.8cqw,12px)}" +
  ".ssf-stage-in{position:relative;container-type:inline-size}" +
  ".ssf-wm-btn{display:block;width:100%;border-radius:0 !important;cursor:pointer;-webkit-tap-highlight-color:transparent}" +
  ".ssf-wm{width:100%;height:auto;color:var(--ssf-cream)}" +
  ".ssf-wm path{fill:none;stroke:currentColor;stroke-width:" + STROKE + ";stroke-linecap:round;stroke-linejoin:round}" +
  // credits
  ".ssf-credits{position:absolute;z-index:6;right:clamp(10px,1.2cqw,16px);bottom:clamp(10px,1.2cqw,16px)}" +
  ".ssf-pill{display:block;padding:.3em .8em .34em;border-radius:999px;background:var(--ssf-ink);color:var(--ssf-paper);font-size:clamp(12px,1cqw,14px);font-weight:600;transition:transform .4s cubic-bezier(.2,1.6,.3,1),background .2s}" +
  ".ssf-pill:hover{transform:rotate(-5deg) scale(1.06)}" +
  ".ssf-pop{position:absolute;right:0;bottom:calc(100% + 10px);width:max-content;max-width:min(300px,80cqw);padding:14px 16px;border-radius:16px;background:var(--ssf-paper);color:var(--ssf-ink);box-shadow:0 0 0 4px #fff,0 18px 40px rgba(10,16,60,.35);transform-origin:90% 100%;animation:ssf-popin .45s cubic-bezier(.2,1.5,.3,1)}" +
  ".ssf-pop li{display:flex;flex-direction:column;padding:6px 0;font-size:13px;line-height:1.3}" +
  ".ssf-pop li+li{border-top:1.5px dashed color-mix(in oklab,var(--ssf-ink) 22%,transparent)}" +
  ".ssf-pop b{font-size:11px;font-weight:600;opacity:.6;text-transform:lowercase}" +
  ".ssf-pop strong{font-weight:800;letter-spacing:-.01em}" +
  "@container (max-width: 760px){.ssf-cols{grid-template-columns:minmax(0,1fr)}.ssf-top{padding-bottom:24px}.ssf-stage{width:min(165%,calc(var(--ssf-wmh) * var(--ssf-ar)));max-width:none;margin-left:-6%}}" +
  "@container (max-width: 520px){.ssf-top{grid-template-columns:minmax(0,1fr) auto 32px;gap:8px;padding:14px 12px 24px}.ssf-nav{width:auto;min-height:40px;height:auto;font-size:clamp(12px,3.8cqw,15px)}.ssf-logo svg{height:26px}.ssf-chat{width:32px;height:32px}.ssf-cols{padding:22px 16px 24px;gap:20px}.ssf-big{font-size:clamp(17px,4.6cqw,22px);overflow-wrap:anywhere}.ssf-copy{max-width:100%;overflow-wrap:anywhere}.ssf-copy .ssf-addr{white-space:normal}.ssf-stage{width:100%;max-width:100%;margin-left:0;padding:0 8px}.ssf-credits{right:10px;bottom:10px}}" +
  "@keyframes ssf-rewrite{0%{stroke-dashoffset:var(--l,120px)}100%{stroke-dashoffset:0}}" +
  "@keyframes ssf-popin{from{opacity:0;transform:translateY(10px) scale(.7) rotate(4deg)}}" +
  // the storyboard: everything above is the finished state; motion only adds the way in
  "@media (prefers-reduced-motion: no-preference){" +
  ".ssf-panel{scale:calc(.9 + .1 * var(--ssf-sp,1));border-radius:calc(clamp(14px,1.8cqw,24px) + (1 - var(--ssf-sp,1)) * 60px)}" +
  ".ssf-stage-in{transform:translateY(calc((1 - var(--ssf-sp,1)) * 18%))}" +
  ".ssf:not(.is-in) .ssf-top>*,.ssf:not(.is-in) .ssf-tag,.ssf:not(.is-in) .ssf-line>*,.ssf:not(.is-in) .ssf-map,.ssf:not(.is-in) .ssf-note,.ssf:not(.is-in) .ssf-pill{opacity:0}" +
  ".ssf.is-in .ssf-top>*{animation:ssf-fall .8s cubic-bezier(.2,1.3,.3,1) both}" +
  ".ssf.is-in .ssf-top>:nth-child(2){animation-delay:.08s}.ssf.is-in .ssf-top>:nth-child(3){animation-delay:.16s}" +
  ".ssf.is-in .ssf-panel{animation:ssf-grow 1.1s cubic-bezier(.7,0,.2,1) both}" +
  ".ssf.is-in .ssf-tag{animation:ssf-pop .7s cubic-bezier(.2,1.7,.3,1) both;animation-delay:calc(.45s + var(--c) * .1s)}" +
  ".ssf.is-in .ssf-line>*{animation:ssf-rise .8s cubic-bezier(.2,.9,.2,1) both;animation-delay:calc(.55s + var(--c) * .1s + var(--i) * .07s)}" +
  ".ssf.is-in .ssf-map,.ssf.is-in .ssf-note{animation:ssf-fade .7s ease both;animation-delay:calc(.85s + var(--c) * .1s)}" +
  ".ssf.is-in .ssf-pill{animation:ssf-pop .6s cubic-bezier(.2,1.7,.3,1) both;animation-delay:var(--end)}" +
  ".ssf .ssf-wm path{stroke-dasharray:var(--l,3000px) calc(var(--l,3000px) + 8px);stroke-dashoffset:calc(var(--l,3000px) + 4px)}" +
  ".ssf:not(.is-in) .ssf-wm path{visibility:hidden}" +
  ".ssf.is-in .ssf-wm path{animation:ssf-write var(--dur) var(--at) cubic-bezier(.55,.1,.35,1) both}" +
  ".ssf-logo:hover path{animation:ssf-rewrite 1.1s cubic-bezier(.55,.1,.35,1)}" +
  ".ssf-logo path{stroke-dasharray:var(--l,3000px) calc(var(--l,3000px) + 8px)}" +
  "}" +
  "@keyframes ssf-write{0%{stroke-dashoffset:calc(var(--l,3000px) + 4px);visibility:visible}100%{stroke-dashoffset:0;visibility:visible}}" +
  "@keyframes ssf-fall{from{opacity:0;transform:translateY(-14px) rotate(-6deg)}}" +
  "@keyframes ssf-grow{0%{clip-path:inset(30% 12% 0 12% round 80px);transform:translateY(40px)}100%{clip-path:inset(0 0 0 0 round 0);transform:none}}" +
  "@keyframes ssf-pop{0%{opacity:0;transform:scale(.4) rotate(-12deg)}100%{opacity:1;transform:none}}" +
  "@keyframes ssf-rise{from{opacity:1;transform:translateY(110%)}to{opacity:1;transform:none}}" +
  "@keyframes ssf-fade{from{opacity:0;transform:translateY(8px)}}"

/** Stamps each path's real length into --l, for the draw-in. */
const useStrokeLengths = (ref: React.RefObject<Element | null>, key: string) =>
  React.useEffect(() => {
    ref.current?.querySelectorAll<SVGPathElement>("path[data-draw]").forEach((p) => {
      p.style.setProperty("--l", Math.ceil(p.getTotalLength()) + 1 + "px")
    })
  }, [ref, key])

/** Shared Xohari footer used on the landing, report, sign-in, and complaint pages. */
export function Footer() {
  const {
    wordmark, homeHref, navLabel, navHref, chatHref, chatLabel, jobsLabel, jobs, officeLabel, officeLinkText, officeHref,
    mapLabel, mapHref, contactLabel, email, copiedLabel, note, credits,
  } = FOOTER
  const { lang } = useLanguage()
  const address = lang === "as" ? ["পৰিকলন বিজ্ঞান আৰু প্ৰয়োগ কেন্দ্ৰ (CCSA)", "ডিব্ৰুগড় বিশ্ববিদ্যালয়"] : FOOTER.address
  const rootRef = React.useRef<HTMLElement>(null)
  const popRef = React.useRef<HTMLDivElement>(null)
  const [seen, setSeen] = React.useState(false)
  const [run, setRun] = React.useState(0)
  const [copied, setCopied] = React.useState(0)
  const [open, setOpen] = React.useState(false)

  const word = React.useMemo(() => layoutScript(wordmark), [wordmark])
  const pad = STROKE / 2 + 0.6
  const vbX = -1.4 - pad
  const vbY = word.top - pad
  const vbW = Math.max(word.width, 1) + 2.8 + pad * 2 - word.top * SLANT
  const vbH = word.bottom + pad - vbY
  const cutH = CUT - vbY
  const smallVb = [-pad - 1, word.top - pad, Math.max(word.width, 1) + pad * 2 + 2 - word.top * SLANT, -word.top + pad * 2 + 1].map(round).join(" ")

  const drawDur = clamp(0.7 + word.width / 45, 1.1, 2.6)
  const writeAt = 1.05
  const endAt = writeAt + drawDur + word.extra.length * 0.16 + 0.5

  useStrokeLengths(rootRef, wordmark + run)

  // The storyboard plays once, the first time a fifth of it is on screen.
  React.useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === "undefined") {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Scroll-linked: 0 while the footer is still below the fold, 1 once it fills
  // the screen (or is entirely in view), eased into --ssf-sp.
  React.useEffect(() => {
    const el = rootRef.current
    if (!el) return
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = document.documentElement.clientHeight || r.height
      const span = Math.min(r.height, vh) || 1
      const p = clamp((vh - r.top) / span, 0, 1)
      el.style.setProperty("--ssf-sp", (1 - Math.pow(1 - p, 2)).toFixed(4))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    addEventListener("scroll", onScroll, { passive: true, capture: true })
    addEventListener("resize", onScroll)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener("scroll", onScroll, { capture: true })
      removeEventListener("resize", onScroll)
    }
  }, [])

  React.useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(0), 2200)
    return () => clearTimeout(id)
  }, [copied])

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!popRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email)
      setCopied((c) => c + 1)
    } catch {
      window.location.href = "mailto:" + email
    }
  }

  // Write it again: the wordmark redraws.
  const replay = () => setRun((r) => r + 1)

  const style = { "--ssf-ar": String(round(vbW / cutH)) } as React.CSSProperties

  return (
    <footer id="footer" ref={rootRef} className={"ssf" + (seen ? " is-in" : "")} style={style}>
      <style>{CSS}</style>

      <div className="ssf-top">
        <a className="ssf-nav" href={navHref}>
          <svg viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">
            <path d={starPath(11, 48, 30, 0, 0, 0.3, 7)} fill="currentColor" />
          </svg>
          <span>{navLabel}</span>
        </a>
        <a className="ssf-logo" href={homeHref} aria-label={wordmark + ", home"}>
          <svg viewBox={smallVb} aria-hidden="true" focusable="false">
            <path d={word.main + word.extra.join("")} data-draw="" transform="skewX(-9)" />
          </svg>
        </a>
        <a className="ssf-chat" href={chatHref} aria-label={chatLabel}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 2.6A9.4 9.4 0 0 0 3.9 16.8L2.7 21.3L7.3 20.1A9.4 9.4 0 1 0 12 2.6Z" fill="currentColor" />
            <path d="M8.6 7.6C9.2 7.2 9.7 7.4 10 8L10.6 9.5C10.8 10 10.5 10.4 10.1 10.8C10.8 12.2 11.8 13.2 13.2 13.9C13.6 13.5 14 13.2 14.5 13.4L16 14C16.6 14.3 16.8 14.8 16.4 15.4C15.7 16.4 14.6 16.8 13.4 16.3C10.6 15.2 8.8 13.4 7.7 10.6C7.2 9.4 7.6 8.3 8.6 7.6Z" fill="var(--ssf-paper)" />
          </svg>
        </a>
      </div>

      <div className="ssf-panel">
        <div className="ssf-cols">
          <div className="ssf-col" style={{ "--c": 0 } as React.CSSProperties}>
            <h3 className="ssf-tag">{jobsLabel}</h3>
            <ul className="ssf-big">
              {jobs.map((j, i) => (
                <li key={i} className="ssf-line" style={{ "--i": i } as React.CSSProperties}>
                  <a href={j.href}>{j.title}</a>
                </li>
              ))}
            </ul>
          </div>
          <div className="ssf-col" style={{ "--c": 1 } as React.CSSProperties}>
            <h3 className="ssf-tag">
              {officeLabel} <a href={officeHref} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', textDecorationColor: 'var(--ssf-accent)', textUnderlineOffset: '.12em' }}>{officeLinkText}</a>
            </h3>
            <address className="ssf-big" style={{ fontStyle: "normal" }}>
              {address.map((l, i) => (
                <span key={i} className="ssf-line" style={{ "--i": i } as React.CSSProperties}>
                  <span>{l}</span>
                </span>
              ))}
            </address>
            <a className="ssf-map" href={mapHref}>
              {mapLabel}
              <svg viewBox="0 0 88 8" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <path d={SQUIGGLE} data-draw="" />
              </svg>
            </a>
          </div>
          <div className="ssf-col" style={{ "--c": 2 } as React.CSSProperties}>
            <h3 className="ssf-tag">{contactLabel}</h3>
            <ul className="ssf-big">
              <li className="ssf-line" style={{ "--i": 0 } as React.CSSProperties}>
                <button type="button" className={"ssf-copy" + (copied ? " is-copied" : "")} onClick={copy} title="Copy email address">
                  <span className="ssf-addr">{email}</span>
                  <span className="ssf-done" aria-hidden="true">
                    {copiedLabel}
                  </span>
                </button>
              </li>
              <li className="ssf-line" style={{ "--i": 1 } as React.CSSProperties}>
                <a href={chatHref}>
                  {chatLabel}
                  {note && <span className="ssf-ast">*</span>}
                </a>
              </li>
            </ul>
            {note && <p className="ssf-note">{note}</p>}
            <span className="ssf-sr" role="status">
              {copied ? "Email address copied" : ""}
            </span>
          </div>
        </div>

        <div className="ssf-stage">
          <div className="ssf-stage-in" style={{ marginBottom: round(-((vbH - cutH) / vbW) * 100) + "%" }}>
            <button type="button" className="ssf-wm-btn" onClick={replay} aria-label={"Write " + wordmark + " again"}>
              <svg key={run} className="ssf-wm" viewBox={[vbX, vbY, vbW, vbH].map(round).join(" ")} aria-hidden="true" focusable="false">
                <g transform={"skewX(-9)"}>
                <path d={word.main} data-draw="" style={{ "--dur": drawDur + "s", "--at": writeAt + "s" } as React.CSSProperties} />
                {word.extra.map((d, k) => (
                  <path key={k} d={d} data-draw="" style={{ "--dur": ".28s", "--at": round(writeAt + drawDur + k * 0.16) + "s" } as React.CSSProperties} />
                ))}
                </g>
              </svg>
            </button>
          </div>
        </div>

        <div className="ssf-credits" ref={popRef}>
          {open && (
            <ul className="ssf-pop">
              {credits.map((c, i) => (
                <li key={i}>
                  <b>{c.role}</b>
                  <strong>{c.name}</strong>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="ssf-pill"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            style={{ "--end": round(endAt) + "s" } as React.CSSProperties}
          >
            credits
          </button>
        </div>
      </div>
    </footer>
  )
}
