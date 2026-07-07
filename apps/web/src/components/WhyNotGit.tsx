"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const scenarios = [
  {
    question: "Which of 15 edits broke the tests?",
    git: "Here are 15 diffs. Good luck.",
    backspace: "Session 'refactor auth' touched 15 files. auth/middleware.ts has a sync→async change — 34% breakage rate.",
  },
  {
    question: "Did the AI touch files I didn't ask about?",
    git: "Check every commit manually.",
    backspace: "⚠ Unrelated files modified: config/db.ts, .env.local",
  },
  {
    question: "I switched from Cursor to Claude Code. Where's my history?",
    git: "Different tools, different checkpoints.",
    backspace: "One timeline. Every tool. Every change.",
  },
];

export default function WhyNotGit() {
  const ref = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      gsap.from(contentRef.current?.children || [], {
        opacity: 0, y: 20, duration: 0.6, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 80%", once: true },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
      <div className="divider mx-auto max-w-[1200px] mb-12 sm:mb-20 md:mb-24" />
      <div className="mx-auto max-w-[1200px]" ref={contentRef}>
        <p className="section-tag mb-6">
          <span className="num">§ 02</span> · Git vs Backspace
        </p>

        <h2 className="text-3xl sm:text-[2.5rem] font-semibold tracking-[-0.025em] leading-[1.15] mb-4">
          Git tracks <span className="text-[#8a7f72]">commits.</span>
          <br />
          Backspace tracks <span className="serif-accent">AI actions.</span>
        </h2>
        <p className="text-[14px] sm:text-[15px] text-[#8a7f72] leading-[1.7] mb-10 max-w-[600px]">
          These are the three scenarios where <code className="text-[12px] text-[#c8bfb0] bg-[#171310] px-1.5 py-0.5 rounded">git checkout</code> fails
          and Backspace answers the question instantly.
        </p>

        <div className="space-y-6">
          {scenarios.map((s, i) => (
            <div key={i} className="rounded-lg border border-[#2a2520] bg-[#100e0b] p-4 sm:p-6">
              <p className="text-[13px] sm:text-[14px] font-medium text-[#f5f0e8] mb-4">
                &ldquo;{s.question}&rdquo;
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-[12px] sm:text-[13px]">
                <div className="rounded-md bg-[#0a0806] border border-[#2a2520] p-3 sm:p-4">
                  <span className="text-[10px] font-mono text-[#5c5347] uppercase tracking-wider">Git</span>
                  <p className="mt-2 text-[#8a7f72]">{s.git}</p>
                </div>
                <div className="rounded-md bg-[#0a0806] border border-[#8b5cf6]/20 p-3 sm:p-4">
                  <span className="text-[10px] font-mono text-[#8b5cf6] uppercase tracking-wider">Backspace</span>
                  <p className="mt-2 text-[#c8bfb0]">{s.backspace}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
