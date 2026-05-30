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
        AI modified dozens of files and broke the build?
        <br className="hidden sm:block" />
        One command. Every file restored. Zero tokens wasted.
      </motion.p>

      {/* CTAs — Install Now is primary. No waitlist here. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="mt-10 flex flex-col sm:flex-row items-center gap-4"
      >
        {/* Primary: Install Command (copy to clipboard) */}
        <button
          onClick={() => navigator.clipboard.writeText("npm install -g backspace-ai")}
          className="group flex items-center gap-3 rounded-full bg-white px-7 py-3.5 text-sm font-medium text-black hover:bg-white/90 transition-all"
        >
          Install Now
          <span className="text-black/40 group-hover:text-black/70 transition-colors text-xs font-mono">
            npm i -g backspace-ai
          </span>
        </button>

        {/* Secondary: Docs */}
        <a
          href="#how-it-works"
          className="flex items-center gap-2 rounded-full px-6 py-3 text-sm text-white/50 hover:text-white transition-colors border border-white/10 hover:border-white/20"
        >
          See how it works →
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
