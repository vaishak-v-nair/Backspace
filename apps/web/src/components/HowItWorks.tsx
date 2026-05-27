"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const steps = [
  {
    step: "01",
    title: "Initialize",
    description: "Run one command in your project root. Backspace creates a local encrypted database and starts tracking.",
    code: `$ backspace init
✓ Created .backspace/local.db
✓ Encryption key generated
✓ Ready to watch`,
    accent: "#00ff88",
  },
  {
    step: "02",
    title: "Code with AI",
    description: "Work normally. Use Claude, Cursor, Copilot — any AI tool. Backspace silently captures every change in the background.",
    code: `$ backspace watch
✓ Daemon running (PID 48291)
  Watching 1,247 files...

  [14:23:01] 4 files → "add auth"
  [14:23:45] 12 files → "refactor db"
  [14:24:12] 47 files → AI burst`,
    accent: "#8b5cf6",
  },
  {
    step: "03",
    title: "Revert Instantly",
    description: "AI broke something? Select a snapshot and every file snaps back to exactly how it was. Deterministic. Atomic. Instant.",
    code: `$ backspace revert
? Select snapshot:
  ❯ 14:24:12 — 47 files (AI burst)
    14:23:45 — 12 files (refactor)

✓ 47 files reverted in 0.3s
✓ Build passing. Tests green.`,
    accent: "#00ff88",
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="how-it-works" ref={ref} className="relative py-32 px-6">
      <div className="mx-auto max-w-5xl">
        {/* Section heading */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center text-xs uppercase tracking-[0.3em] text-white/30 mb-6"
        >
          How it Works
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center text-3xl font-semibold tracking-tight md:text-5xl mb-20"
        >
          Three commands.
          <br />
          <span className="text-white/30">That&apos;s the entire workflow.</span>
        </motion.h2>

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.15 }}
              className="relative grid grid-cols-1 md:grid-cols-2 gap-8 rounded-2xl border border-white/[0.04] bg-white/[0.01] p-8 md:p-10"
            >
              {/* Left: Text */}
              <div className="flex flex-col justify-center">
                <div
                  className="mb-4 inline-flex items-center gap-3"
                >
                  <span
                    className="text-xs font-mono font-bold tracking-wider px-2.5 py-1 rounded-md"
                    style={{
                      backgroundColor: `${step.accent}15`,
                      color: step.accent,
                    }}
                  >
                    STEP {step.step}
                  </span>
                </div>
                <h3 className="text-2xl font-semibold mb-3">{step.title}</h3>
                <p className="text-white/40 leading-relaxed">{step.description}</p>
              </div>

              {/* Right: Code */}
              <div className="terminal">
                <div className="terminal-header">
                  <div className="terminal-dot bg-[#ff5f57]" />
                  <div className="terminal-dot bg-[#febc2e]" />
                  <div className="terminal-dot bg-[#28c840]" />
                </div>
                <div className="terminal-body text-xs leading-relaxed">
                  {step.code.split("\n").map((line, j) => {
                    let className = "terminal-output";
                    if (line.startsWith("$")) className = "terminal-command";
                    else if (line.startsWith("✓")) className = "terminal-success";
                    else if (line.startsWith("  ❯")) className = "text-[#00ff88]";
                    else if (line.startsWith("?")) className = "text-[#8b5cf6]";
                    return (
                      <div key={j} className={className}>
                        {line}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
