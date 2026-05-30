"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

/*
 * Token Calculator — all constants are documented with their source.
 *
 * TOKENS_PER_FILE: A typical source file is ~150 lines, ~10 tokens/line.
 *   When an AI agent processes a file, it reads the full content as input context,
 *   plus outputs a modified version. We conservatively estimate 3,000 tokens
 *   of input per file touched (150 lines × 20 chars/line ÷ ~4 chars/token ≈ 750,
 *   but context includes surrounding files, prompts, and system messages, so 3× is used).
 *   Source: https://docs.anthropic.com/en/docs/build-with-claude/token-counting
 *
 * DEBUG_ITERATIONS: When an AI breaks a build, developers typically need ~3 rounds
 *   of "explain the error → AI proposes fix → test → fail again" before giving up
 *   and reverting manually. Conservative documented assumption.
 *
 * TOKEN_PRICE: Claude Sonnet 4.6 charges $3.00 per million input tokens.
 *   Source: https://www.anthropic.com/pricing (as of May 2026)
 *
 * MINUTES_PER_FILE: Time to manually diff one file against its previous state,
 *   understand what changed, and selectively revert. Documented assumption: 1.5 min.
 */
const TOKENS_PER_FILE = 3000;   // avg input tokens consumed per file in an AI debug cycle
const DEBUG_ITERATIONS = 3;     // conservative avg iterations to debug a hallucination
const TOKEN_PRICE = 3.00;       // USD per million input tokens (Claude Sonnet 4.6)
const MINUTES_PER_FILE = 1.5;   // minutes to manually diff and restore one file

export default function TokenCalculator() {
  const [filesChanged, setFilesChanged] = useState(15);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const tokensSaved = filesChanged * TOKENS_PER_FILE * DEBUG_ITERATIONS;
  const moneySaved = ((tokensSaved / 1_000_000) * TOKEN_PRICE).toFixed(2);
  const timeSavedMinutes = Math.round(filesChanged * MINUTES_PER_FILE);

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
              <p className="text-2xl font-mono font-light">{tokensSaved.toLocaleString()}</p>
            </div>
            <div className="text-center p-6 rounded-xl bg-[#00ff88]/[0.03] border border-[#00ff88]/[0.08]">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#00ff88]/60 mb-3">
                Money Saved
              </p>
              <p className="text-3xl font-mono font-semibold text-[#00ff88]">${moneySaved}</p>
            </div>
            <div className="text-center p-6 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-3">
                Time Saved
              </p>
              <p className="text-2xl font-mono font-light">{timeSavedMinutes}m</p>
            </div>
          </div>

          {/* Subtext — formula transparency */}
          <p className="mt-8 text-center text-xs text-white/20">
            Formula: {filesChanged} files × {TOKENS_PER_FILE.toLocaleString()} tokens × {DEBUG_ITERATIONS} iterations
            at ${TOKEN_PRICE.toFixed(2)}/MTok (Claude Sonnet 4.6)
          </p>
        </motion.div>
      </div>
    </section>
  );
}
