"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function AIEra() {
  const ref = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      gsap.from(textRef.current?.children || [], {
        opacity: 0,
        y: 20,
        duration: 0.8,
        stagger: 0.2,
        ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 80%", once: true },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="py-20 sm:py-32 px-4 sm:px-6">
      <div className="mx-auto max-w-[800px] text-center">
        <div ref={textRef} className="space-y-6 sm:space-y-8">
          <h2 className="text-2xl sm:text-4xl font-medium tracking-tight text-[#8a7f72]">
            Software development changed.
          </h2>
          <h2 className="text-2xl sm:text-4xl font-medium tracking-tight text-[#c8bfb0]">
            Developers now collaborate with <span className="serif-accent text-[#e8a830]">AI agents.</span>
          </h2>
          <h2 className="text-2xl sm:text-4xl font-medium tracking-tight text-[#8a7f72]">
            Yet recovery tools are still built around human workflows.
          </h2>
          <div className="pt-8">
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em] text-[#f5f0e8] leading-tight">
              Backspace is recovery infrastructure for AI-native development.
            </h2>
          </div>
        </div>
      </div>
    </section>
  );
}
