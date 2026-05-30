"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const features = [
  {
    title: "Instant Rollback",
    description: "One command undoes an entire AI session. No diff-hunting. No cherry-picking. Every file, atomically restored.",
    icon: "↩",
    accent: "#00ff88",
    span: "col-span-1 md:col-span-2",
    code: "$ backspace-ai revert\n✓ Files reverted to pre-AI state",
  },
  {
    title: "Session Tracking",
    description: "Every file change is captured in real-time with Brotli-compressed diffs. Your AI's entire edit history, preserved.",
    icon: "◉",
    accent: "#8b5cf6",
    span: "col-span-1",
    code: null,
  },
  {
    title: "Prompt Tagging",
    description: "Every session is tagged with your natural language description of what the AI was doing, making sessions instantly searchable and scannable.",
    icon: "🏷️",
    accent: "#f59e0b",
    span: "col-span-1",
    code: null,
  },
  {
    title: "Local Only",
    description: "All snapshot data stays on your machine in a local SQLite file. Nothing is sent to any server. No account required to use the CLI.",
    icon: "💻",
    accent: "#06b6d4",
    span: "col-span-1 md:col-span-2",
    code: "$ ls .backspace/\nlocal.db    ← all data lives here, nowhere else",
  },
  {
    title: "Git Compatible",
    description: "Works alongside Git, doesn't replace it. Backspace captures the changes between commits — the messy middle that Git doesn't see.",
    icon: "⎇",
    accent: "#ec4899",
    span: "col-span-1 md:col-span-2",
    code: null,
  },
  {
    title: "Zero Config",
    description: "One command to start. No YAML. No config files. No CI pipeline changes. Initialize and forget.",
    icon: "▸",
    accent: "#00ff88",
    span: "col-span-1",
    code: "$ backspace-ai init\n✓ Backspace initialized",
  },
];

export default function FeaturesGrid() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="features" ref={ref} className="relative py-32 px-6">
      <div className="mx-auto max-w-5xl">
        {/* Section heading */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center text-xs uppercase tracking-[0.3em] text-white/30 mb-6"
        >
          Features
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center text-3xl font-semibold tracking-tight md:text-5xl mb-16"
        >
          Built for developers who
          <br />
          <span className="text-white/30">don&apos;t have time for this.</span>
        </motion.h2>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.1 }}
              className={`${feature.span} group relative rounded-2xl border border-white/[0.04] bg-white/[0.01] p-7 transition-all duration-300 hover:border-white/[0.08] hover:bg-white/[0.02] overflow-hidden`}
            >
              {/* Hover glow */}
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl"
                style={{ backgroundColor: `${feature.accent}10` }}
              />

              {/* Icon */}
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                style={{
                  backgroundColor: `${feature.accent}10`,
                  color: feature.accent,
                }}
              >
                {feature.icon}
              </div>

              {/* Content */}
              <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{feature.description}</p>

              {/* Code block */}
              {feature.code && (
                <div className="mt-5 rounded-lg bg-black/40 border border-white/[0.04] p-4 font-mono text-xs text-white/50 leading-relaxed">
                  {feature.code.split("\n").map((line, j) => (
                    <div key={j} className={line.startsWith("✓") ? "text-[#00ff88]" : ""}>
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
