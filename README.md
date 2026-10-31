# CivicSense — AI Smart Campus Issue Management

**Dibrugarh University** · **Game of Codes | ANAZORI v16.0 (PS-04)**  
**Author:** @bi2 · **Demo Date:** 4 November 2026

---

## 🏛️ Overview

**CivicSense** is an AI-assisted web platform where Dibrugarh University students and staff report campus issues and follow them to resolution. Built for **Game of Codes | ANAZORI v16.0** (CCSA, Dibrugarh University, Problem Statement **PS-04**), it is designed as a working production platform with real-time department routing and SLA tracking.

The public interface implements a scroll-driven site whose layout, motion, and 3D visual language are adapted from the **Open Grid** brutalist Swiss design system. The entire functional application operates behind this cohesive shell.

---

## 📐 Brutalist Swiss Design System (Adapted from Open Grid)

CivicSense implements the brutalist Swiss grid identity with strict custom property design tokens:

- **Tokens (`:root`)**:
  - `--black`: `#0A0A0A` (Ink sections, text on paper)
  - `--paper`: `#F4F2EC` (Light sections, text on ink)
  - `--signal`: `#FFC400` (Open & in-progress issues, primary CTA)
  - `--resolve`: `#19C37D` (Resolved states, verified closure)
  - `--alert`: `#FF4B2B` (Urgent P1 priority, hazard alerts)
  - `--rule` / `--rule-paper`: Hairline column rules
  - `--cols`, `--mar`, `--gut`: 12 columns, 20px margin, 10px gutter (4 cols, 12px margin on mobile)
  - `--nav`: 44px fixed top bar (48px on mobile)
- **Typography**:
  - **Display**: Archivo 800, tight tracking, uppercase
  - **Body**: Archivo variable / Inter Tight
  - **Captions & Labels**: JetBrains Mono 500, 11px, uppercase, 0.06em tracking
- **Signature Live Grid Inspector (`G` key)**:
  - Press `G` anywhere or tap **Grid [G]** in the nav bar to activate the interactive 12-column grid overlay with live column widths, gutters, viewport dimensions, baseline, scroll %, and current section name.

---

## 🌟 Landing Page Structure (7 Sections)

1. **Index (`#index`)**:
   - Hero header: *"Say it. Direct to Campus Redressal."*
   - **3D Campus Block Cube**: 27 modules in a 3×3×3 block that glow with `--signal` (yellow) for active issues, `--resolve` (green) for resolved issues, and `--alert` (red) for P1 hazards. Fully interactive with mouse dragging and smooth idle rotation.
   - **Live Issue Index Table**: Real-time numbered rows (`No.` / `Issue` / `Dept` / `Status`) directly connected to the active database.
   - **Pinned "How a Report Travels" Lesson**: 4 interactive stages (Set the Columns ➔ AI Triage ➔ Department Routing ➔ Live Status Trail).
   - **Type Tumble**: Typography showcase with campus grid manifesto.
2. **Voices (`#voices`)**:
   - Word swap: `Report` ➔ `Route` ➔ `Resolve` with dynamic department cards and SLA commitments.
3. **Numbers (`#numbers`)**:
   - Swiss stat tiles with live count-up numbers: Active Open Issues, Verified Resolutions, Average Turnaround (14 hrs), and Connected Departments (6).
4. **Categories (`#categories`)**:
   - 6 university categories (Water Supply, Power & Electrical, Wi-Fi & IT, Hostel Infrastructure, Campus Safety, Labs & Classrooms) with live sample reports.
5. **Resolved (`#resolved`)**:
   - The Resolved Wall: Showcase cards of verified resolved campus problems with time-to-fix badges and audit details.
6. **How (`#how`)**:
   - Report in four simple steps (Describe Campus Issue ➔ Pin Landmark on Map ➔ Snap Photo Evidence ➔ Track to Resolution).
7. **Start (`#start`)**:
   - Direct CTAs and navigation to authenticated roles.

---

## ⚡ Application Routes

- `/report`: 60-second issue reporting wizard with landmark picker, camera capture, live AI triage preview, and duplicate warning.
- `/track/[id]`: End-to-end accountability route tracker (`Submitted ➔ Acknowledged ➔ In Progress ➔ Resolved`), official responses log, officer status controls, and student **"Me Too" (+1)** upvote escalation.
- `/my` & `/my-reports`: Student reporter dashboard with live status chips and filtering.
- `/officer`: Department officer queue (Estates, Electrical, IT, Hostels, Proctorial) with SLA timers, filter by assigned department, and one-click status transitions.
- `/authority`: DUSU General Secretary portfolio oversight queue.
- `/admin`: Central administration master ledger, live Leaflet hotspot map, and department routing override.
- `/map`: Full-screen interactive Leaflet campus map with status and priority pins.
- `/login`: Role-based persona gateway (Reporter, Department Officer, DUSU GS, Central Admin).
- `/api/triage`: Server-side issue triage and duplicate detection endpoint.

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Build for production
npm run build

# 3. Start production server
npm run start
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.
Press `G` on any screen to inspect the Swiss grid layout!
