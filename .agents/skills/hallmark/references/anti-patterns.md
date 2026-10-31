# Hallmark Anti-Patterns Catalog

This catalog documents the signature tells that reveal machine-generated code ("AI Slop") and how to correct them.

## 1. The Bracketed Eyebrow Addiction
* **The Tell**: Placing `[ 01 / INTRO ]`, `[ 02 / ABOUT ]`, `[ CATEGORY · TAG ]` in all-caps, tracked-out font directly above every single heading.
* **Why it's slop**: AI models use eyebrows as an easy crutch to add visual noise when they lack true layout confidence.
* **The Fix**: Remove the bracketed tracking blocks. Let the heading command the space directly, or use an authentic chapter / issue label in sentence case.

## 2. Glued Arrow Links
* **The Tell**: Appending raw Unicode arrows directly to link text like `SKIP TO FORM →` or `EXPLORE →`.
* **Why it's slop**: Every AI coding assistant appends `→` automatically.
* **The Fix**: Use dedicated Lucide icon components (e.g. `<ArrowRight className="w-4 h-4 ml-1 inline" />`) with proper spacing and hover translation micro-interactions.

## 3. Pulsing Radar Status Dots
* **The Tell**: Adding `animate-ping` or expanding radar rings to decorative status tags (`✦ 3D CAMPUS COMMUNITY · DRAG TO ORBIT`).
* **Why it's slop**: Glowing ambient radar rings imply critical real-time alerts or live calls, but LLMs put them everywhere as decorative glitter.
* **The Fix**: Use crisp, clean solid badges or subtle solid indicators without distracting endless looping animations.

## 4. Hallucinated Proof Points
* **The Tell**: Claiming specific fake stats like *"14-hour average SLA turnaround"* or *"50,000+ happy students"*.
* **Why it's slop**: Unverified marketing fiction erodes institutional trust.
* **The Fix**: Ground the copy in genuine campus features: verified routing to Estates, Electrical, IT, and Proctorial desks, zero intermediate servers, and browser-local privacy.

## 5. Viewport Fragility & Awkward Button Wrapping
* **The Tell**: Long button text like `COPIED TO CLIPBOARD` wrapping into 3 lines on mobile viewports (320px–375px).
* **Why it's slop**: AI generates buttons for 1440px desktop screens and forgets to test mobile tap flows.
* **The Fix**: Use responsive text scaling (`text-xs md:text-sm`), flex reflow, and concise action verbs.

