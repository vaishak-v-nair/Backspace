"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const rows = [
  { feature: "Deterministic rollback", us: true, them: false, note: null },
  { feature: "AES-256 encrypted snapshots", us: true, them: false, note: "local" },
  { feature: "MCP server for AI agents", us: true, them: false, note: null },
  { feature: "Works offline", us: true, them: true, note: null },
  { feature: "Free to use", us: true, them: true, note: null },
  { feature: "Zero config", us: true, them: false, note: null },
  { feature: "Session-level granularity", us: true, them: false, note: null },
];

function Check({ note }: { note: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[#00ff88]">✓</span>
      {note && <span className="text-[10px] text-white/30">({note})</span>}
    </span>
  );
}

function Cross() {
  return <span className="text-[#ff4444]">✗</span>;
}

export default function ComparisonTable() {
  const ref = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const ctx = gsap.context(() => {
      gsap.from(headingRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 80%",
          once: true,
        },
      });

      gsap.from(tableRef.current, {
        opacity: 0,
        y: 30,
        duration: 0.6,
        delay: 0.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: tableRef.current,
          start: "top 85%",
          once: true,
        },
      });
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <section id="compare" ref={ref} className="relative py-20 sm:py-32 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div ref={headingRef}>
          {/* Label */}
          <p className="text-center text-xs uppercase tracking-[0.3em] text-white/30 mb-6">
            Compare
          </p>

          {/* Headline */}
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-5xl mb-16">
            What you get with
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7c3aed] to-[#06b6d4]">Backspace.</span>
          </h2>
        </div>

        {/* Table */}
        <div
          ref={tableRef}
          className="rounded-2xl border border-white/[0.06] overflow-hidden"
        >
          {/* Table header */}
          <div className="grid grid-cols-3 text-xs uppercase tracking-[0.15em] text-white/30 border-b border-white/[0.04] bg-white/[0.02]">
            <div className="px-6 py-4">Feature</div>
            <div className="px-6 py-4 text-center">Backspace</div>
            <div className="px-6 py-4 text-center">Git stash / manual</div>
          </div>

          {/* Table rows */}
          {rows.map((row, i) => (
            <div
              key={row.feature}
              className={`grid grid-cols-3 text-sm ${
                i < rows.length - 1 ? "border-b border-white/[0.03]" : ""
              } ${i % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"}`}
            >
              <div className="px-6 py-4 text-white/60">{row.feature}</div>
              <div className="px-6 py-4 text-center">
                <Check note={row.note} />
              </div>
              <div className="px-6 py-4 text-center">
                {row.them ? <Check note={null} /> : <Cross />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
