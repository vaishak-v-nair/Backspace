"use client";

import { motion } from "framer-motion";
import TerminalDemo from "./TerminalDemo";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-28 pb-20 overflow-hidden">
      {/* Background gradient orbs */}
      <div className="gradient-orb w-[600px] h-[600px] bg-[#00ff88]/[0.04] top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="gradient-orb w-[400px] h-[400px] bg-purple-500/[0.03] top-1/3 left-1/4" />

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 backdrop-blur-sm"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#00ff88] animate-pulse" />
        <span className="text-xs tracking-widest text-white/50 uppercase">
          Local-first · Privacy-first · Open Source
        </span>
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-4xl text-center text-5xl font-semibold tracking-tight leading-[1.1] md:text-7xl lg:text-[5.5rem]"
      >
        Undo Anything{" "}
        <br className="hidden md:block" />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ff88] via-[#00cc6a] to-[#00ff88]">
          Your AI Just Did.
        </span>
      </motion.h1>

      {/* Subheadline */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 max-w-2xl text-center text-lg text-white/40 leading-relaxed md:text-xl"
      >
        Claude broke your build? Cursor hallucinated across 47 files?
        <br className="hidden sm:block" />
        One command. Every file restored. Zero tokens wasted.
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="mt-10 flex flex-col sm:flex-row items-center gap-4"
      >
        {/* Primary: Install Command */}
        <button
          onClick={() => navigator.clipboard.writeText("npx backspace-ai init")}
          className="group flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 font-mono text-sm transition-all hover:border-[#00ff88]/30 hover:bg-white/[0.06]"
        >
          <span className="text-white/40">$</span>
          <span className="text-white">npx backspace-ai init</span>
          <span className="text-white/30 group-hover:text-[#00ff88] transition-colors">⎘</span>
        </button>

        {/* Secondary: GitHub */}
        <a
          href="https://github.com/vaishak-v-nair/backspace"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full px-6 py-3 text-sm text-white/50 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          View on GitHub
        </a>
      </motion.div>

      {/* Terminal Demo */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="mt-16 w-full max-w-2xl relative"
      >
        {/* Glow behind terminal */}
        <div className="absolute inset-0 -z-10 rounded-2xl bg-[#00ff88]/[0.03] blur-3xl scale-110" />
        <TerminalDemo />
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/20">Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-4 h-7 rounded-full border border-white/10 flex items-start justify-center p-1"
          >
            <div className="w-1 h-2 rounded-full bg-white/30" />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
