"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const features = [
  { icon: "↩", title: "Instant Rollback", desc: "Reverse an entire AI session atomically. No partial restores." },
  { icon: "📸", title: "Session Tracking", desc: "Every file change captured with AI prompt context in real-time." },
  { icon: "🔒", title: "AES-256 Encrypted", desc: "Snapshots encrypted with AES-256-GCM. Per-project keys, zero plaintext." },
  { icon: "🤖", title: "MCP Server", desc: "Built-in Model Context Protocol server for AI agent integration." },
  { icon: "🔀", title: "Git Compatible", desc: "Works alongside Git at finer granularity. Below the commit level." },
  { icon: "⚡", title: "Zero Config", desc: "One command to init. No YAML, no accounts. Works with every AI tool." },
];

export default function FeaturesSection() {
  const ref = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      gsap.from(headRef.current, {
        opacity: 0, y: 16, duration: 0.6, ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 80%", once: true },
      });
      if (gridRef.current) {
        gsap.from(gridRef.current.children, {
          opacity: 0, y: 20, duration: 0.4, stagger: 0.06, ease: "power3.out",
          scrollTrigger: { trigger: gridRef.current, start: "top 85%", once: true },
        });
      }
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section id="features" ref={ref} className="py-16 sm:py-28 md:py-36 px-4 sm:px-6">
      <div className="divider mx-auto max-w-[1200px] mb-16 sm:mb-28" />
      <div className="mx-auto max-w-[1200px]">
        <div ref={headRef} className="mb-16">
          <p className="section-tag mb-6">
            <span className="num">§ 02</span> · Features
          </p>
          <h2 className="text-3xl sm:text-[2.5rem] font-semibold tracking-[-0.025em] leading-[1.15]">
            Everything you need to code
            <br />
            <span className="serif-accent">fearlessly</span> <span className="text-[#5c5347]">with AI.</span>
          </h2>
          <p className="mt-4 text-[14px] text-[#8a7f72] max-w-md">
            Every feature listed here is built and shipping. No vaporware.
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#2a2520] rounded-xl overflow-hidden border border-[#2a2520]">
          {features.map(f => (
            <div key={f.title}
              className="bg-[#0a0806] p-6 hover:bg-[#100e0b] transition-colors duration-200">
              <div className="text-lg mb-3">{f.icon}</div>
              <h3 className="text-[14px] font-semibold text-[#f5f0e8] mb-1.5">{f.title}</h3>
              <p className="text-[12px] text-[#8a7f72] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
