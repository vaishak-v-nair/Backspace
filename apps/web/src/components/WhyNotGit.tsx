"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const tableData = [
  { feature: "AI-aware", git: "❌", bs: "✅" },
  { feature: "Automatic snapshots", git: "❌", bs: "✅" },
  { feature: "Rollback AI actions", git: "❌", bs: "✅" },
  { feature: "Timeline of AI changes", git: "❌", bs: "✅" },
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
    <section ref={ref} className="py-16 sm:py-28 md:py-36 px-4 sm:px-6">
      <div className="divider mx-auto max-w-[1200px] mb-16 sm:mb-28" />
      <div className="mx-auto max-w-[1200px]" ref={contentRef}>
        <p className="section-tag mb-6">
          <span className="num">§ 02</span> · Why Not Git?
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
          <div>
            <h2 className="text-3xl sm:text-[2.5rem] font-semibold tracking-[-0.025em] leading-[1.15] mb-6">
              Git is for <span className="text-[#8a7f72]">humans.</span>
              <br />
              Backspace is for <span className="serif-accent">AI.</span>
            </h2>
            <p className="text-[14px] sm:text-[15px] text-[#8a7f72] leading-[1.7] mb-8">
              This is the first objection every developer has. But when an AI agent rapidly mutates your codebase, `git stash` is too coarse, and `git log` lacks the context of the AI's intent. You need a system that tracks actions exactly as the AI performed them.
            </p>
          </div>

          <div className="flex flex-col justify-center">
            <div className="rounded-lg border border-[#2a2520] bg-[#100e0b] overflow-hidden">
              <table className="w-full text-left text-[13px] sm:text-[14px]">
                <thead>
                  <tr className="border-b border-[#2a2520] bg-[#171310]">
                    <th className="py-4 px-6 font-medium text-[#8a7f72]">Feature</th>
                    <th className="py-4 px-6 font-medium text-[#8a7f72] text-center border-l border-[#2a2520]">Git</th>
                    <th className="py-4 px-6 font-medium text-[#f5f0e8] text-center border-l border-[#2a2520]">Backspace</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, i) => (
                    <tr key={row.feature} className={i !== tableData.length - 1 ? "border-b border-[#2a2520]" : ""}>
                      <td className="py-4 px-6 text-[#c8bfb0]">{row.feature}</td>
                      <td className="py-4 px-6 text-center border-l border-[#2a2520] text-[#8a7f72]">{row.git}</td>
                      <td className="py-4 px-6 text-center border-l border-[#2a2520] text-[#34d399]">{row.bs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
