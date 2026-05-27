"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

export default function TokenCalculator() {
  const [filesChanged, setFilesChanged] = useState(15);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const debugIterations = Math.max(1, Math.floor(filesChanged / 2));
  const tokensPerIteration = 45000;
  const totalTokens = debugIterations * tokensPerIteration;
  const costSaved = ((totalTokens / 1_000_000) * 4.0).toFixed(2);
  const timeSavedMinutes = debugIterations * 3;

  return (
    <section id="calculator" ref={ref} className="relative py-32 px-6">
      {/* Background glow */}
      <div className="gradient-orb w-[500px] h-[500px] bg-[#00ff88]/[0.03] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 md:p-12 backdrop-blur-sm overflow-hidden"
        >
          {/* Corner glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-[#00ff88]/[0.05] blur-3xl" />

          {/* Header */}
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.3em] text-white/30 mb-4">
              Token Calculator
            </p>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              The Cost of Not Having Backspace
            </h2>
            <p className="mt-3 text-sm text-white/40">
              Drag the slider to see how much you save per AI hallucination.
            </p>
          </div>

          {/* Slider */}
          <div className="mb-12">
            <div className="flex justify-between mb-4">
              <span className="text-sm text-white/50">Files modified by AI</span>
              <span className="text-sm font-mono font-medium text-[#00ff88]">{filesChanged} files</span>
            </div>
            <input
              type="range"
              min="1"
              max="80"
              value={filesChanged}
              onChange={(e) => setFilesChanged(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-white/20">1 file</span>
              <span className="text-[10px] text-white/20">80 files</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-6 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-3">
                Tokens Saved
              </p>
              <p className="text-2xl font-mono font-light">{totalTokens.toLocaleString()}</p>
            </div>
            <div className="text-center p-6 rounded-xl bg-[#00ff88]/[0.03] border border-[#00ff88]/[0.08]">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#00ff88]/60 mb-3">
                Money Saved
              </p>
              <p className="text-3xl font-mono font-semibold text-[#00ff88]">${costSaved}</p>
            </div>
            <div className="text-center p-6 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-3">
                Time Saved
              </p>
              <p className="text-2xl font-mono font-light">{timeSavedMinutes}m</p>
            </div>
          </div>

          {/* Subtext */}
          <p className="mt-8 text-center text-xs text-white/20">
            Based on avg. ~45k tokens per debug iteration at $4.00/MTok (Claude Sonnet)
          </p>
        </motion.div>
      </div>
    </section>
  );
}
