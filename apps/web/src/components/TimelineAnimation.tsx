"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const events = [
  { time: "11:00", label: "Session started", detail: "\"Add JWT authentication\"", type: "start" as const },
  { time: "11:01", label: "4 files created", detail: "auth/, middleware/", type: "normal" as const },
  { time: "11:02", label: "8 files modified", detail: "routes/, config/, utils/", type: "normal" as const },
  { time: "11:03", label: "⚠ Suspicious change", detail: "db/schema.ts — not in original request", type: "warn" as const },
  { time: "11:20", label: "Tests fail", detail: "auth.test.ts — middleware signature mismatch", type: "error" as const },
  { time: "11:21", label: "Backspace revert", detail: "12 files restored in 31ms", type: "success" as const },
];

const dotColor = {
  start: "bg-[#8b5cf6]",
  normal: "bg-[#8a7f72]",
  warn: "bg-[#e8a830]",
  error: "bg-[#f87171]",
  success: "bg-[#34d399]",
};

const textColor = {
  start: "text-[#8b5cf6]",
  normal: "text-[#c8bfb0]",
  warn: "text-[#e8a830]",
  error: "text-[#f87171]",
  success: "text-[#34d399]",
};

export default function TimelineAnimation() {
  const ref = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".timeline-row", {
        opacity: 0, x: -20, duration: 0.6, stagger: 0.3, ease: "power3.out",
        scrollTrigger: { trigger: containerRef.current, start: "top 75%", once: true },
      });
      gsap.fromTo(".timeline-line",
        { height: 0 },
        {
          height: "100%", duration: 2.5, ease: "none",
          scrollTrigger: { trigger: containerRef.current, start: "top 75%", once: true },
        }
      );
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
      <div className="divider mx-auto max-w-[1200px] mb-12 sm:mb-20 md:mb-24" />
      <div className="mx-auto max-w-[800px]">
        <div className="text-center mb-12 sm:mb-16">
          <p className="section-tag mb-6">
            <span className="num">§ 03</span> · Session Timeline
          </p>
          <h2 className="text-3xl sm:text-[2.5rem] font-semibold tracking-[-0.025em] leading-[1.15]">
            See exactly where
            <br />
            <span className="serif-accent">things went wrong.</span>
          </h2>
        </div>

        <div ref={containerRef} className="relative ml-4 sm:ml-8 md:ml-0 md:max-w-[500px] md:mx-auto">
          {/* Vertical Line */}
          <div className="absolute left-[5px] top-2 bottom-2 w-[2px] bg-[#2a2520] overflow-hidden">
            <div className="timeline-line w-full bg-gradient-to-b from-[#8b5cf6] via-[#e8a830] to-[#34d399]" />
          </div>

          <div className="space-y-8 sm:space-y-10">
            {events.map((ev, i) => (
              <div key={i} className="timeline-row flex items-start gap-4 sm:gap-6 relative">
                <div className={`mt-1.5 w-3 h-3 rounded-full ${dotColor[ev.type]} relative z-10 flex-shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.5)]`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3">
                    <span className="text-[10px] font-mono text-[#5c5347] flex-shrink-0">{ev.time}</span>
                    <span className={`text-[13px] sm:text-[15px] font-medium ${textColor[ev.type]}`}>{ev.label}</span>
                  </div>
                  <p className="text-[11px] sm:text-[12px] text-[#8a7f72] mt-0.5">{ev.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
