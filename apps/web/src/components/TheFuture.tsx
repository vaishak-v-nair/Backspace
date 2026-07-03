"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function TheFuture() {
  const ref = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      gsap.from(contentRef.current?.children || [], {
        opacity: 0, y: 20, duration: 0.8, stagger: 0.15, ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 80%", once: true },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="py-20 sm:py-32 px-4 sm:px-6 bg-[#0a0806]">
      <div className="divider mx-auto max-w-[1200px] mb-16 sm:mb-28" />
      <div className="mx-auto max-w-[800px] text-center" ref={contentRef}>
        <p className="section-tag mb-8">
          <span className="num">§ 06</span> · The Vision
        </p>
        <h2 className="text-4xl sm:text-6xl font-semibold tracking-[-0.03em] leading-tight mb-12 text-[#f5f0e8]">
          The Future
        </h2>
        
        <div className="space-y-6 text-left max-w-[600px] mx-auto text-[15px] sm:text-[17px] leading-[1.8] text-[#c8bfb0]">
          <p>
            Backspace started as an undo system.
          </p>
          <p>
            The long-term vision is becoming the <strong className="text-[#f5f0e8] font-medium">safety layer for AI-assisted software development.</strong>
          </p>
          <p>
            As AI agents become more autonomous, developers need absolute visibility, recovery, and control over machine-generated changes.
          </p>
          <p className="text-[#e8a830] font-medium">
            Backspace aims to provide that layer.
          </p>
        </div>
      </div>
    </section>
  );
}
