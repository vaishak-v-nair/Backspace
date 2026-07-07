"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    title: "AI Session Awareness",
    description: "Changes grouped into meaningful sessions with intent labels. Not loose diffs — structured AI actions you can reason about.",
    icon: "📋",
    pillar: "Pillar 1",
  },
  {
    title: "Regression Isolation",
    description: "Find which AI session introduced a failure. Timeline, inspection, and event-level forensics to trace the exact moment things broke.",
    icon: "🔍",
    pillar: "Pillar 2",
  },
  {
    title: "Atomic Recovery",
    description: "Revert any session instantly. All files restored atomically — either everything rolls back or nothing does. No partial states.",
    icon: "⏪",
    pillar: "Pillar 3",
  },
  {
    title: "Suspicious Change Detection",
    description: "AI touched files outside your request? Backspace flags authentication, infrastructure, and database changes that weren't part of the prompt.",
    icon: "⚠️",
    pillar: "Pillar 4",
  },
  {
    title: "Risk Analysis",
    description: "Pre-flight prompt scanning and post-revert pattern analysis. Know the blast radius before you start and after you recover.",
    icon: "📊",
    pillar: "Pillar 5",
  },
  {
    title: "Cross-Tool, One Model",
    description: "Claude Code, Cursor, Aider, Copilot — one recovery model for every AI tool. Switch freely. Your history stays unified.",
    icon: "🔀",
    pillar: "Universal",
  },
];

export default function FeaturesSection() {
  const ref = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      if (gridRef.current) {
        gsap.from(gridRef.current.children, {
          opacity: 0, y: 20, duration: 0.6, stagger: 0.1, ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 80%", once: true },
        });
      }
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section id="features" ref={ref} className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
      <div className="divider mx-auto max-w-[1200px] mb-12 sm:mb-20 md:mb-24" />
      <div className="mx-auto max-w-[1200px]">
        <p className="section-tag mb-6">
          <span className="num">§ 04</span> · Core Capabilities
        </p>
        <h2 className="text-3xl sm:text-[2.5rem] font-semibold tracking-[-0.025em] leading-[1.15] mb-10 sm:mb-14">
          Built for AI
          <br />
          <span className="serif-accent">recovery intelligence.</span>
        </h2>

        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {features.map((f) => (
            <div key={f.title}
              className="group rounded-lg border border-[#2a2520] bg-[#100e0b] p-5 sm:p-6 hover:border-[#3a3530] transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xl">{f.icon}</span>
                <span className="text-[10px] font-mono text-[#5c5347] uppercase tracking-wider">{f.pillar}</span>
              </div>
              <h3 className="text-[15px] font-semibold text-[#f5f0e8] mb-2">{f.title}</h3>
              <p className="text-[12px] sm:text-[13px] text-[#8a7f72] leading-[1.7]">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
