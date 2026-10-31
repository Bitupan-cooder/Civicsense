---
name: hallmark
description: Anti-AI-slop design skill for web projects that look human-crafted, not machine-generated. Enforces The Floor (strict tokenization, zero invented metrics, no tracked uppercase eyebrows, clean responsive stacking), quality gates, and automated slop linting.
---

# Hallmark: Anti-AI-Slop Design Skill

Makes web interfaces look intentionally designed rather than template-generated. Enforces a hard floor against machine defaults, ensures one clear idea per screen, and eliminates generic LLM design fingerprints.

## The Floor (Non-Waivable Quality Baseline)

Every interface in this project must satisfy The Floor before shipping:

1. **Strict Tokenization**: Every color and font passes through design tokens declared at `:root` or the Tailwind config. No untracked arbitrary hex values or unmapped fonts.
2. **Typography Hierarchy**:
   * Uses distinctive human font pairings (e.g. Palatino Linotype + Anton / Archivo).
   * **No Eyebrow Clichés**: Never an all-caps bracketed tracking label sitting directly over every headline (e.g., avoid `[ 03 / DIRECTORY ]`). Use natural, human section titles and context-aware captions.
   * **No Glued Punctuation**: Arrows and glyphs are separated with proper spacing or icons rather than raw unicode `→` glued to links.
3. **No Decorative AI Gimcracks**:
   * Never fake pulsing radar rings or glowing ambient dots (`animate-ping`) unless indicating a real live websocket connection.
   * Never middle-dot-joined generic meta strings (`TAG · SUBTAG · STATUS`).
   * Never invented metrics, fake testimonials, or hallucinated SLA numbers.
4. **Responsive Discipline**:
   * Mobile viewports stack cleanly with zero horizontal scroll (`overflow-x: hidden`).
   * CTAs and buttons never break or wrap words awkwardly on small mobile screens.
   * Touch targets meet the 44px minimum accessibility standard.
5. **Human Craft & Contrast**:
   * Adheres strictly to the user's authentic palette: Light Civic Green (`#1EA854`), Kiwi Green (`#9ABC05`), Bright Neon Lime (`#B5F800`), Electric Blue (`#0036FF`), Warm Skin (`#FAF2EB`), and Crisp White (`#FFFFFF`).
   * Zero dark black or murky grey text on light surfaces.

## Verbs

* **`audit`**: Analyze pages and components against Hallmark anti-pattern gates and produce a slop-score report.
* **`redesign`**: Polish and refine components into clean, human-crafted layouts while preserving all functional forms, local state, and routing.
* **`sloplint`**: Execute automated lint checks via `node .agents/skills/hallmark/scripts/sloplint.js`.

