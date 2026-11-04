"use client";
import React from "react";
import { clsx } from "clsx";
import { motion, type Variants } from "framer-motion";
import waterPlumbingPhoto from "../../../Flat Assets/civic/Water & Plumbing.jpeg";
import sanitationPhoto from "../../../Flat Assets/civic/Sanitation & Grounds.jpeg";
import powerLightingPhoto from "../../../Flat Assets/civic/Power & Lighting.jpeg";
import classroomsLabsPhoto from "../../../Flat Assets/civic/classroom and labs.jpeg";
import allCampusPhoto from "../../../Flat Assets/civic/all campus.jpeg";
import "./bento.css";

const bentoRevealVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.985, filter: "blur(7px)" },
  visible: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.72, delay: Math.min(index, 6) * 0.075, ease: [0.22, 1, 0.36, 1] },
  }),
  idle: {},
  active: { y: -4, transition: { duration: 0.24, ease: "easeOut" } },
};

function ArrowDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

export interface BentoCardProps {
  className?: string;
  title: string;
  description: string;
  imgSrc: string;
  imgAlt: string;
  onSelect?: () => void;
  revealIndex?: number;
}

export function BentoCard({
  className = "",
  title,
  description,
  imgSrc,
  imgAlt,
  onSelect,
  revealIndex = 0,
}: BentoCardProps) {
  const handleClick = () => {
    onSelect?.();
    document.getElementById("report")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.18 }}
      custom={revealIndex}
      whileHover="active"
      variants={bentoRevealVariants}
      onClick={handleClick}
      className={clsx("bento-card cat-card", className)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="bento-graphic-wrap">
        <motion.img
          variants={{ idle: { scale: 1 }, active: { scale: 1.05 } }}
          transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
          src={imgSrc}
          alt={imgAlt}
          className="bento-graphic-img"
          loading="lazy"
        />
        <div className="bento-fade-bottom" aria-hidden="true" />
      </div>
      <div className="bento-content">
        <h3 className="bento-title">{title}</h3>
        <p className="bento-desc">{description}</p>
      </div>
    </motion.div>
  );
}

export default function FUIBentoGridDark() {
  return (
    <div className="bento-container">
      <img
        className="university-seal-sticker"
        src="/images/dibrugarh-university-seal-sticker.png"
        alt="Dibrugarh University seal"
        loading="lazy"
      />
      {/* Header - Human-crafted & Un-slopped */}
      <div className="bento-header">
        <h2 className="h2 split">
          Common campus issues,
          <br />
          routed to the <em>right team.</em>
        </h2>
        <p>
          Report what you see in English or Assamese. Xohari identifies the problem and sends it directly to the department handling it.
        </p>
      </div>

      {/* 8 Clean Light-Mode Bento Cards (Pure Photographic Frames) */}
      <div id="catGrid" className="bento-grid">
        {/* Row 1, Card 1: Water & Plumbing (Span 3, Top-Left Rounded) */}
        <BentoCard
          revealIndex={0}
          className="bento-col-3 bento-rounded-tl"
          title="Water & Plumbing"
          description="Leaking taps, pipe bursts, washroom repairs, and drinking water coolers."
          imgSrc={waterPlumbingPhoto}
          imgAlt="University campus water station and drinking cooler"
        />

        {/* Row 1, Card 2: Power & Lighting (Span 3, Top-Right Rounded) */}
        <BentoCard
          revealIndex={1}
          className="bento-col-3 bento-rounded-tr"
          title="Power & Lighting"
          description="Dark walkways, failed streetlights, broken ceiling fans, and circuit trips."
          imgSrc={powerLightingPhoto}
          imgAlt="Campus pathway lighting and illumination fixtures"
        />

        {/* Row 2, Card 3: Campus IT & LAN (Span 2) */}
        <BentoCard
          revealIndex={2}
          className="bento-col-2"
          title="Campus Wi-Fi & IT"
          description="Library and hostel Wi-Fi, Ethernet connections, and student portal access."
          imgSrc="/images/categories/campus-it-wifi.jpg"
          imgAlt="Campus network rack and Ethernet LAN distribution"
        />

        {/* Row 2, Card 4: Safety & Proctorial (Span 2) */}
        <BentoCard
          revealIndex={3}
          className="bento-col-2"
          title="Safety & Security"
          description="Broken gate locks, unlit spots, perimeter concerns, and emergency security."
          imgSrc="/images/categories/safety-proctorial.jpg"
          imgAlt="Campus security monitoring and safety oversight"
        />

        {/* Row 2, Card 5: Clean Campus (Span 2) */}
        <BentoCard
          revealIndex={4}
          className="bento-col-2"
          title="Sanitation & Grounds"
          description="Overflowing bins, pathway litter, waste clearance, and campus groundskeeping."
          imgSrc={sanitationPhoto}
          imgAlt="Dual-stream waste sorting and campus recycling bins"
        />

        {/* Row 3, Card 6: Hostels & Housing (Span 2, Bottom-Left Rounded) */}
        <BentoCard
          revealIndex={5}
          className="bento-col-2 bento-rounded-bl"
          title="Hostel Facilities"
          description="Dorm room fixtures, hot water geysers, mess hall concerns, and room maintenance."
          imgSrc="/images/categories/hostels-housing.jpg"
          imgAlt="Student hostel dorm living quarters"
        />

        {/* Row 3, Card 7: Classrooms & Labs (Span 2) */}
        <BentoCard
          revealIndex={6}
          className="bento-col-2"
          title="Classrooms & Labs"
          description="Projectors, lab instruments, podium acoustics, student desks, and lecture halls."
          imgSrc={classroomsLabsPhoto}
          imgAlt="University lecture hall, student desks, and academic blackboard"
        />

        {/* Row 3, Card 8: 20 Campus Areas Action Card (Span 2, Bottom-Right Rounded) */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.18 }}
          custom={7}
          whileHover="active"
          variants={bentoRevealVariants}
          className="bento-card cat-card bento-col-2 bento-rounded-br bento-action-card"
          role="button"
          tabIndex={0}
          onClick={() => document.getElementById("report")?.scrollIntoView({ behavior: "smooth" })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              document.getElementById("report")?.scrollIntoView({ behavior: "smooth" });
            }
          }}
        >
          <div className="bento-graphic-wrap">
            <img
              src={allCampusPhoto}
              alt="Campus grounds and paths at Dibrugarh University"
              className="bento-graphic-img"
              loading="lazy"
            />
            <div className="bento-fade-bottom" aria-hidden="true" />
          </div>
          <div className="bento-content">
            <h3 className="bento-title">All 20 Campus Areas</h3>
            <p className="bento-desc">
              Write in English or Assamese. Your report routes straight to the responsible office.
            </p>
            <button
              type="button"
              className="bento-direct-btn"
              onClick={(e) => {
                e.stopPropagation();
                document.getElementById("report")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <span>Report an Issue</span>
              <ArrowDownIcon />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
