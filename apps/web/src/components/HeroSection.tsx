"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";

export default function HeroSection() {
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    tl.from(tagRef.current, { opacity: 0, y: 14, duration: 0.5, delay: 0.2 })
      .from(h1Ref.current, { opacity: 0, y: 20, duration: 0.7 }, "-=0.2")
      .from(subRef.current, { opacity: 0, y: 14, duration: 0.6 }, "-=0.3")
      .from(actionsRef.current, { opacity: 0, y: 14, duration: 0.5 }, "-=0.2")
      .from(termRef.current, { opacity: 0, y: 24, duration: 0.8 }, "-=0.2");
  }, []);

  const copy = async () => {
    try { await navigator.clipboard.writeText("npm install -g backspace-ai"); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-28 pb-20">
      {/* Subtle warm orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-[#8b5cf6]/[0.03] blur-[120px] pointer-events-none" />

      <div ref={containerRef} className="relative max-w-3xl mx-auto text-center">
        {/* Status tag */}
        <div ref={tagRef} className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#2a2520] bg-[#100e0b] px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#34d399]" />
          <span className="text-[10px] tracking-[0.15em] uppercase text-[#8a7f72]">
            Available now · Claude Code · Cursor · Copilot
          </span>
        </div>

        {/* Headline — serif italic for emphasis words (Caveman-style) */}
        <h1 ref={h1Ref} className="text-[2.75rem] sm:text-5xl md:text-[3.75rem] font-semibold tracking-[-0.03em] leading-[1.1] text-[#f5f0e8]">
          undo anything
          <br />
          your <span className="serif-accent">AI</span> just did.
        </h1>

        {/* Sub */}
        <p ref={subRef} className="mt-6 text-[15px] text-[#8a7f72] leading-relaxed max-w-lg mx-auto">
          Claude broke the build? Cursor hallucinated across 23 files?
          <br className="hidden sm:block" />
          One command. Every file restored. Zero tokens wasted.
        </p>

        {/* Actions */}
        <div ref={actionsRef} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={copy}
            className="group flex items-center gap-3 rounded-md bg-[#8b5cf6] px-6 py-2.5 text-[13px] font-medium text-white hover:bg-[#7c3aed] transition-all">
            {copied ? "✓ Copied" : (
              <>Install Free <code className="text-[11px] text-white/50">npm i -g backspace-ai</code></>
            )}
          </button>
          <a href="#how-it-works"
            className="text-[12px] text-[#8a7f72] hover:text-[#f5f0e8] transition-colors border border-[#2a2520] hover:border-[#3a3530] rounded-md px-5 py-2.5">
            How it works →
          </a>
        </div>
      </div>

      {/* Terminal demo */}
      <div ref={termRef} className="mt-16 w-full max-w-2xl px-4 sm:px-0">
        <div className="terminal">
          <div className="terminal-bar">
            <div className="terminal-dot bg-[#ff5f57]" />
            <div className="terminal-dot bg-[#febc2e]" />
            <div className="terminal-dot bg-[#28c840]" />
            <span className="terminal-title">backspace-ai · demo</span>
          </div>
          <div className="terminal-body">
            <div><span className="t-prompt">$</span> <span className="t-cmd">backspace-ai init</span></div>
            <div className="t-ok">✓ Backspace initialized</div>
            <div className="t-dim">  .backspace/local.db created · AES-256-GCM</div>
            <div>&nbsp;</div>
            <div><span className="t-prompt">$</span> <span className="t-cmd">backspace-ai watch</span></div>
            <div className="t-ok">✓ Daemon started (PID: 42891)</div>
            <div className="t-dim">  Watching for changes...</div>
            <div>&nbsp;</div>
            <div className="t-dim">  <span className="t-cyan">[snap]</span> 4 files → &ldquo;add auth module&rdquo;</div>
            <div className="t-dim">  <span className="t-cyan">[snap]</span> 12 files → &ldquo;refactor db layer&rdquo;</div>
            <div className="t-dim">  <span className="t-cyan">[snap]</span> 23 files → &ldquo;migrate API routes&rdquo;</div>
            <div>&nbsp;</div>
            <div><span className="t-prompt">$</span> <span className="t-cmd">backspace-ai revert</span></div>
            <div className="t-ok">✓ 23 files reverted in 47ms</div>
            <div><span className="t-cursor" /></div>
          </div>
        </div>
      </div>
    </section>
  );
}
