"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export default function ProblemSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const stats = [
    { value: "47", label: "files modified", sublabel: "in a single AI session" },
    { value: "12", label: "debug iterations", sublabel: "trying to fix the mess" },
    { value: "$18", label: "burned in tokens", sublabel: "on failed recovery attempts" },
  ];

  return (
    <section ref={ref} className="relative py-32 px-6">
      {/* Separator line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-5xl">
        {/* Section label */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center text-xs uppercase tracking-[0.3em] text-white/30 mb-6"
        >
          The Problem
        </motion.p>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center text-3xl font-semibold tracking-tight md:text-5xl lg:text-6xl leading-tight"
        >
          AI rewrites your codebase.
          <br />
          <span className="text-white/30">You pray the build still passes.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-6 text-center text-lg text-white/40 max-w-2xl mx-auto"
        >
          Every AI coding tool — Claude, Cursor, Copilot, Aider — can modify dozens of files
          in seconds. When it hallucinates, you&apos;re left hunting through chaotic diffs,
          burning tokens on failed fixes, and losing hours of productive work.
        </motion.p>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.15 }}
              className="text-center p-8 rounded-2xl border border-white/[0.04] bg-white/[0.01]"
            >
              <div className="text-5xl font-semibold text-[#ff4444] font-mono mb-3">
                {stat.value}
              </div>
              <div className="text-sm text-white/70 font-medium">{stat.label}</div>
              <div className="text-xs text-white/30 mt-1">{stat.sublabel}</div>
            </motion.div>
          ))}
        </div>

        {/* Divider arrow */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 flex flex-col items-center"
        >
          <div className="w-px h-16 bg-gradient-to-b from-[#ff4444]/30 to-[#00ff88]/30" />
          <div className="mt-4 text-xs uppercase tracking-[0.3em] text-[#00ff88]/50">
            There&apos;s a better way
          </div>
        </motion.div>
      </div>
    </section>
  );
}
