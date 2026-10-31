# Hallmark Quality Gates

## Gate 1: The Floor (Zero Tolerance)
* [x] **No dark black/grey text**: All text is pure white (`#FFFFFF`) or green (`#1EA854`, `#9ABC05`, `#B5F800`) on skin/white surfaces.
* [x] **No Assamese text**: English campus redressal terminology throughout.
* [x] **Tokens only**: Colors pass through `:root` and Tailwind theme configurations.
* [x] **Zero horizontal overflow**: `overflow-x: hidden` with fluid grid reflow across 360px–1920px viewports.
* [x] **Interactive integrity**: All forms, selectors, mailto links, WhatsApp links, and clipboard actions work 100%.

## Gate 2: Typography & Refinement
* [x] Distinctive typographic voice: Anton (display) + Palatino Linotype (editorial body) + Archivo (functional labels).
* [x] Clean label hierarchy: Elimination of repetitive bracketed eyebrows (`[ 01 / ... ]`).
* [x] Proper link glyphs: Replaced raw glued Unicode arrows with aligned icon elements.

## Gate 3: Motion & Accessibility
* [x] `prefers-reduced-motion`: All animations (GSAP ScrollTrigger, 3D tilts, paper canvas) respect user accessibility preferences.
* [x] Touch & Drag: Smooth 3D community stage interaction without scroll hijacking.

