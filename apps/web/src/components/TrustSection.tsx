"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function TrustSection() {
  const ref = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      if (innerRef.current) {
        gsap.from(innerRef.current.children, {
          opacity: 0, y: 20, duration: 0.6, stagger: 0.1, ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 80%", once: true },
        });
      }
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section id="trust" ref={ref} className="py-28 sm:py-36 px-6">
      <div className="divider mx-auto max-w-[1200px] mb-28" />
      <div className="mx-auto max-w-[1200px]" ref={innerRef}>
        {/* Section label */}
        <p className="section-tag mb-10">
          <span className="num">§ 01</span> · Why Backspace
        </p>

        {/* Split grid: text left, visual right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
          {/* Left: copy */}
          <div>
            <h2 className="text-3xl sm:text-[2.5rem] font-semibold tracking-[-0.025em] leading-[1.15] mb-6">
              Your code stays on
              <br />
              <span className="text-[#5c5347]">your machine.</span>
            </h2>
            <p className="text-[15px] text-[#8a7f72] leading-[1.7] mb-8">
              No cloud. No accounts. No telemetry. Backspace stores{" "}
              <span className="serif-accent">encrypted</span> snapshots in a local SQLite
              database. Everything is AES-256-GCM encrypted before it touches disk.
            </p>

            {/* Bullet list with dividers */}
            <div className="space-y-0">
              {[
                { label: "47ms", desc: "average revert time for 23 files" },
                { label: "AES-256-GCM", desc: "per-project encryption keys" },
                { label: "0 bytes", desc: "uploaded to any server, ever" },
              ].map((item, i) => (
                <div key={item.label} className={`flex items-baseline gap-4 py-4 ${i > 0 ? "border-t border-[#2a2520]" : ""}`}>
                  <span className="text-[13px] font-semibold text-[#8b5cf6] min-w-[100px]">{item.label}</span>
                  <span className="text-[13px] text-[#8a7f72]">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: terminal visual */}
          <div className="flex items-center">
            <div className="terminal w-full">
              <div className="terminal-bar">
                <div className="terminal-dot bg-[#ff5f57]" />
                <div className="terminal-dot bg-[#febc2e]" />
                <div className="terminal-dot bg-[#28c840]" />
                <span className="terminal-title">backspace-ai · status</span>
              </div>
              <div className="terminal-body">
                <div><span className="t-prompt">$</span> <span className="t-cmd">backspace-ai status</span></div>
                <div>&nbsp;</div>
                <div className="t-dim">  Backspace Status</div>
                <div>&nbsp;</div>
                <div className="t-dim">  Directory : <span className="t-cmd">.backspace</span></div>
                <div className="t-dim">  Database  : <span className="t-cmd">.backspace/local.db</span></div>
                <div className="t-dim">  Encryption: <span className="t-ok">AES-256-GCM ✓</span></div>
                <div className="t-dim">  Daemon    : <span className="t-ok">running (PID: 42891)</span></div>
                <div className="t-dim">  Snapshots : <span className="t-amber">14 captured</span></div>
                <div className="t-dim">  Uploaded  : <span className="t-cmd">0 bytes (local only)</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
