"use client";

import { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const ref = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      gsap.from(innerRef.current, {
        opacity: 0, y: 20, duration: 0.6, ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 80%", once: true },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === "loading") return;
    setStatus("loading"); setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || "Something went wrong."); setStatus("error"); return; }
      setMessage(data.message || "You're on the list!"); setStatus("success");
    } catch { setMessage("Network error. Try again."); setStatus("error"); }
  };

  return (
    <section id="updates" ref={ref} className="py-16 sm:py-28 md:py-36 px-4 sm:px-6">
      <div className="divider mx-auto max-w-[1200px] mb-16 sm:mb-28" />
      <div className="mx-auto max-w-[520px] text-center" ref={innerRef}>
        <p className="section-tag mb-6">
          <span className="num">§ 08</span> · Stay Updated
        </p>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] leading-[1.2] mb-3">
          Get notified on <span className="serif-accent">new releases.</span>
        </h2>
        <p className="text-[13px] text-[#8a7f72] mb-8">
          CLI updates, integrations, and feature drops. No spam.
        </p>

        {status === "success" ? (
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-md bg-[#34d399]/10 border border-[#34d399]/20 px-4 py-2">
              <span className="text-[#34d399] text-sm">✓</span>
              <span className="text-[13px] text-[#c8bfb0]">{message}</span>
            </div>
            <p className="text-[12px] text-[#5c5347]">
              Install now: <code className="text-[#8b5cf6]">npm i -g backspace-ai</code>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com" required disabled={status === "loading"}
              className="flex-1 rounded-md border border-[#2a2520] bg-[#100e0b] px-4 py-2.5 text-[13px] text-[#f5f0e8] placeholder-[#5c5347] focus:outline-none focus:border-[#8b5cf6]/30 transition-colors disabled:opacity-50"
            />
            <button type="submit" disabled={status === "loading"}
              className="rounded-md bg-[#8b5cf6] px-5 py-2.5 text-[13px] font-medium text-white hover:bg-[#7c3aed] transition-all disabled:opacity-60 whitespace-nowrap">
              {status === "loading" ? "..." : "Subscribe"}
            </button>
          </form>
        )}

        {status === "error" && <p className="mt-3 text-[12px] text-[#f87171]">{message}</p>}
      </div>
    </section>
  );
}
