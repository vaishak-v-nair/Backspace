"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const events = [
  { time: "11:00 AM", text: "AI modifies 34 files", color: "text-[#c8bfb0]", dot: "bg-[#8a7f72]" },
  { time: "11:02 AM", text: "AI deletes auth logic", color: "text-[#e8a830]", dot: "bg-[#e8a830]" },
  { time: "11:03 AM", text: "AI breaks build", color: "text-[#f87171]", dot: "bg-[#f87171]" },
  { time: "11:04 AM", text: "Backspace restores state", color: "text-[#34d399]", dot: "bg-[#34d399]" },
];

export default function TimelineAnimation() {
  const ref = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      // Animate each event row sequentially
      gsap.from(".timeline-row", {
        opacity: 0,
        x: -20,
        duration: 0.6,
        stagger: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 75%",
          once: true,
        },
      });
      // Animate the connecting line growing
      gsap.fromTo(".timeline-line", 
        { height: 0 },
        {
          height: "100%",
          duration: 3,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 75%",
            once: true,
          }
        }
      );
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="py-16 sm:py-28 md:py-36 px-4 sm:px-6">
      <div className="divider mx-auto max-w-[1200px] mb-16 sm:mb-28" />
      <div className="mx-auto max-w-[800px]">
        <div className="text-center mb-16">
          <p className="section-tag mb-6">
            <span className="num">§ 03</span> · The Timeline
          </p>
          <h2 className="text-3xl sm:text-[2.5rem] font-semibold tracking-[-0.025em] leading-[1.15]">
            When things go wrong,
            <br />
            <span className="serif-accent">revert instantly.</span>
          </h2>
        </div>

        {/* Timeline Container */}
        <div ref={containerRef} className="relative max-w-[400px] mx-auto ml-12 sm:ml-auto">
          {/* Vertical Line */}
          <div className="absolute left-[5px] top-2 bottom-2 w-[2px] bg-[#2a2520] overflow-hidden">
            <div className="timeline-line w-full bg-gradient-to-b from-[#8a7f72] via-[#f87171] to-[#34d399]" />
          </div>

          <div className="space-y-12">
            {events.map((ev, i) => (
              <div key={i} className="timeline-row flex items-start gap-6 relative">
                {/* Dot */}
                <div className={`mt-1.5 w-3 h-3 rounded-full ${ev.dot} relative z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)]`} />
                {/* Content */}
                <div className="flex-1">
                  <span className="block text-[11px] font-mono text-[#8a7f72] mb-1">{ev.time}</span>
                  <span className={`text-[15px] sm:text-[17px] font-medium ${ev.color}`}>{ev.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
