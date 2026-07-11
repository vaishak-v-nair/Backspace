"use client";

import { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Recovery Impact Calculator — AGENTS.md Data Rules
 *
 * tokensPerFile = 3000 — avg ~200 lines/file × ~15 tokens/line
 * debugIterations = 3 — conservative: AI typically needs 2-4 debug cycles
 *                       to fix its own mistake when the developer re-prompts
 * minutesPerFile = 1.5 — conservative estimate for manual investigation per file
 *
 * These are the same documented formulas from the original TokenCalculator,
 * reframed around recovery intelligence instead of cost savings.
 */
const TOKENS_PER_FILE = 3000;
const DEBUG_ITERATIONS = 3;
const MINUTES_PER_FILE = 1.5;

export default function TokenCalculator() {
  const [files, setFiles] = useState(20);
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

  const debugCycles = files * DEBUG_ITERATIONS;
  const recoveryTime = files * MINUTES_PER_FILE;
  const tokensWasted = files * TOKENS_PER_FILE * DEBUG_ITERATIONS;

  return (
    <section id="calculator" ref={ref} className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
      <div className="divider mx-auto max-w-[1200px] mb-12 sm:mb-20 md:mb-24" />
      <div className="mx-auto max-w-[1200px]" ref={innerRef}>
        <p className="section-tag mb-6">
          <span className="num">§ 06</span> · Recovery Impact
        </p>

        {/* Split grid: text left, calculator right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-20">
          {/* Left */}
          <div>
            <h2 className="text-3xl sm:text-[2.5rem] font-semibold tracking-[-0.025em] leading-[1.15] mb-6">
              See the <span className="serif-accent">blast radius</span>
              <br />
              <span className="text-[#5c5347]">before you debug.</span>
            </h2>
            <p className="text-[14px] text-[#8a7f72] leading-[1.7] mb-8">
              When AI breaks code, you spend time investigating which files changed,
              which changes are safe, and how many debug cycles it takes to fix.
              Backspace eliminates that — instant recovery, zero investigation.
            </p>

            {/* Formula breakdown */}
            <div className="space-y-0 text-[12px]">
              {[
                { left: "Files at risk", right: "Every file the AI touched in one session" },
                { left: "Debug cycles", right: `${DEBUG_ITERATIONS} avg re-prompts to fix AI mistakes` },
                { left: "Recovery time", right: `${MINUTES_PER_FILE} min / file to manually investigate` },
                { left: "With Backspace", right: "< 50ms — atomic revert, zero investigation" },
              ].map((row, i) => (
                <div key={row.left} className={`flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-4 py-3 ${i > 0 ? "border-t border-[#2a2520]" : ""}`}>
                  <span className="text-[#8a7f72]">{row.left}</span>
                  <span className="text-[#c8bfb0] font-mono text-[11px] sm:text-[12px]">{row.right}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: interactive calculator */}
          <div className="flex flex-col justify-center">
            <div className="rounded-lg border border-[#2a2520] bg-[#100e0b] p-4 sm:p-6">
              {/* Slider */}
              <div className="mb-6">
                <div className="flex justify-between items-baseline mb-3">
                  <span className="text-[12px] text-[#8a7f72]">Files changed by AI</span>
                  <span className="text-3xl font-bold text-[#f5f0e8] tabular-nums">{files}</span>
                </div>
                <input type="range" min="1" max="100" value={files}
                  onChange={(e) => setFiles(parseInt(e.target.value))} />
                <div className="flex justify-between text-[10px] text-[#5c5347] mt-1.5">
                  <span>1</span><span>50</span><span>100</span>
                </div>
              </div>

              {/* Results */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-md bg-[#0a0806] border border-[#2a2520] p-3 sm:p-4 text-center">
                  <div className="text-base sm:text-xl font-bold text-[#f87171] tabular-nums">{files}</div>
                  <div className="text-[10px] text-[#5c5347] mt-1">files at risk</div>
                </div>
                <div className="rounded-md bg-[#0a0806] border border-[#2a2520] p-3 sm:p-4 text-center">
                  <div className="text-base sm:text-xl font-bold text-[#e8a830] tabular-nums">{debugCycles}</div>
                  <div className="text-[10px] text-[#5c5347] mt-1">debug cycles</div>
                </div>
                <div className="rounded-md bg-[#0a0806] border border-[#2a2520] p-3 sm:p-4 text-center">
                  <div className="text-base sm:text-xl font-bold text-[#34d399] tabular-nums">{recoveryTime.toFixed(0)}m</div>
                  <div className="text-[10px] text-[#5c5347] mt-1">saved with ⌫</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
