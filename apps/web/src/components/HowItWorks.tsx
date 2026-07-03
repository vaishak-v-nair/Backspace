"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    num: "01",
    title: "Initialize",
    desc: "One command creates an encrypted local store. No YAML, no config files, no accounts required.",
    lines: [
      { text: "$ backspace-ai init", cls: "t-cmd" },
      { text: "✓ Backspace initialized", cls: "t-ok" },
      { text: "  .backspace/local.db · AES-256-GCM", cls: "t-dim" },
    ],
  },
  {
    num: "02",
    title: "Code with AI",
    desc: "Work normally with any AI coding tool. Backspace captures every file change silently in the background.",
    lines: [
      { text: "$ backspace-ai watch", cls: "t-cmd" },
      { text: "✓ Daemon started (PID: 42891)", cls: "t-ok" },
      { text: "  Watching for changes...", cls: "t-dim" },
      { text: "", cls: "" },
      { text: '  [snap] 4 files → "add auth"', cls: "t-cyan" },
      { text: '  [snap] 12 files → "refactor db"', cls: "t-cyan" },
      { text: '  [snap] 23 files → "migrate API"', cls: "t-cyan" },
    ],
  },
  {
    num: "03",
    title: "Revert Instantly",
    desc: "AI broke something? One command reverses every change. Atomically. In milliseconds.",
    lines: [
      { text: "$ backspace-ai revert", cls: "t-cmd" },
      { text: "? Select snapshot:", cls: "t-amber" },
      { text: '  ❯ 23 files — "migrate API"', cls: "t-ok" },
      { text: "", cls: "" },
      { text: "✓ 23 files reverted in 47ms", cls: "t-ok" },
    ],
  },
];

export default function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      gsap.from(headRef.current, {
        opacity: 0, y: 16, duration: 0.6, ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 80%", once: true },
      });
      if (listRef.current) {
        gsap.from(listRef.current.children, {
          opacity: 0, y: 20, duration: 0.5, stagger: 0.1, ease: "power3.out",
          scrollTrigger: { trigger: listRef.current, start: "top 85%", once: true },
        });
      }
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section id="how-it-works" ref={ref} className="py-16 sm:py-28 md:py-36 px-4 sm:px-6">
      <div className="divider mx-auto max-w-[1200px] mb-16 sm:mb-28" />
      <div className="mx-auto max-w-[1200px]">
        <div ref={headRef} className="mb-12 sm:mb-20">
          <p className="section-tag mb-6">
            <span className="num">§ 03</span> · How it Works
          </p>
          <h2 className="text-3xl sm:text-[2.5rem] font-semibold tracking-[-0.025em] leading-[1.15]">
            Three commands.
            <br />
            <span className="text-[#5c5347]">That&apos;s the</span> <span className="serif-accent">entire</span> <span className="text-[#5c5347]">workflow.</span>
          </h2>
        </div>

        {/* Steps — split grid like Caveman */}
        <div ref={listRef} className="space-y-6">
          {steps.map((step, i) => (
            <div key={step.num}
              className={`grid grid-cols-1 ${i % 2 === 0 ? "md:grid-cols-[1fr_1.2fr]" : "md:grid-cols-[1.2fr_1fr]"} gap-6 sm:gap-8 rounded-lg border border-[#2a2520] bg-[#100e0b]/50 p-5 sm:p-7 md:p-8`}>
              
              {/* Text — swap order on odd rows */}
              <div className={`flex flex-col justify-center ${i % 2 !== 0 ? "md:order-2" : ""}`}>
                <span className="text-[10px] tracking-[0.2em] uppercase text-[#8b5cf6] font-medium mb-3">
                  Step {step.num}
                </span>
                <h3 className="text-xl font-semibold text-[#f5f0e8] mb-2">{step.title}</h3>
                <p className="text-[13px] text-[#8a7f72] leading-relaxed">{step.desc}</p>
              </div>

              {/* Terminal */}
              <div className={`${i % 2 !== 0 ? "md:order-1" : ""}`}>
                <div className="terminal">
                  <div className="terminal-bar">
                    <div className="terminal-dot bg-[#ff5f57]" />
                    <div className="terminal-dot bg-[#febc2e]" />
                    <div className="terminal-dot bg-[#28c840]" />
                    <span className="terminal-title">terminal</span>
                  </div>
                  <div className="terminal-body">
                    {step.lines.map((line, j) => (
                      <div key={j} className={line.cls || "t-dim"}>
                        {line.text || "\u00A0"}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
