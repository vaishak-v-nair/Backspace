"use client";

import { useEffect, useState, useRef } from "react";

interface TerminalLine {
  type: "prompt" | "command" | "output" | "success" | "error" | "blank";
  text: string;
  delay: number;
}

const sequences: TerminalLine[] = [
  { type: "prompt", text: "~/my-project", delay: 0 },
  { type: "command", text: " backspace-ai init", delay: 600 },
  { type: "success", text: "✓ Backspace initialized (.backspace/local.db created)", delay: 1200 },
  { type: "output", text: "  File watcher ready", delay: 1600 },
  { type: "blank", text: "", delay: 1900 },
  { type: "prompt", text: "~/my-project", delay: 2100 },
  { type: "command", text: " backspace-ai watch", delay: 2700 },
  { type: "success", text: "✓ Daemon started", delay: 3300 },
  { type: "output", text: "  Watching for changes...", delay: 3700 },
  { type: "blank", text: "", delay: 4000 },
  { type: "output", text: "  [Snapshot] 4 files changed — \"refactor auth middleware\"", delay: 4800 },
  { type: "output", text: "  [Snapshot] 12 files changed — \"add user dashboard\"", delay: 5600 },
  { type: "error", text: "  [Snapshot] 15 files changed — AI broke the build", delay: 6400 },
  { type: "blank", text: "", delay: 7000 },
  { type: "prompt", text: "~/my-project", delay: 7200 },
  { type: "command", text: " backspace-ai revert", delay: 7800 },
  { type: "success", text: "✓ Successfully reverted codebase to selected state.", delay: 8400 },
  { type: "success", text: "✓ Build passing. Crisis averted.", delay: 9000 },
];

export default function TerminalDemo() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true;
          startAnimation();
        }
      },
      { threshold: 0.3 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  function startAnimation() {
    sequences.forEach((line, index) => {
      setTimeout(() => {
        if (line.type === "command") setIsTyping(true);
        setVisibleLines(index + 1);
        if (line.type === "command") {
          setTimeout(() => setIsTyping(false), 400);
        }
      }, line.delay);
    });

    // Loop the animation
    const totalDuration = sequences[sequences.length - 1].delay + 3000;
    setTimeout(() => {
      setVisibleLines(0);
      hasStarted.current = false;
      // Re-trigger
      setTimeout(() => {
        hasStarted.current = true;
        startAnimation();
      }, 500);
    }, totalDuration);
  }

  return (
    <div ref={containerRef} className="terminal w-full max-w-2xl mx-auto shadow-2xl shadow-black/50">
      {/* Terminal Chrome */}
      <div className="terminal-header">
        <div className="terminal-dot bg-[#ff5f57]" />
        <div className="terminal-dot bg-[#febc2e]" />
        <div className="terminal-dot bg-[#28c840]" />
        <span className="ml-3 text-xs text-white/30 font-mono">backspace-ai — zsh</span>
      </div>

      {/* Terminal Body */}
      <div className="terminal-body min-h-[320px]">
        {sequences.slice(0, visibleLines).map((line, i) => {
          if (line.type === "blank") {
            return <div key={i} className="h-4" />;
          }

          if (line.type === "prompt") {
            return (
              <div key={i} className="flex items-center gap-0">
                <span className="terminal-prompt">❯ </span>
                <span className="text-white/40 text-xs">{line.text}</span>
              </div>
            );
          }

          if (line.type === "command") {
            const isLastCommand = i === visibleLines - 1;
            return (
              <span key={i} className="terminal-command font-medium">
                {line.text}
                {isLastCommand && isTyping && <span className="terminal-cursor" />}
              </span>
            );
          }

          return (
            <div
              key={i}
              className={`${
                line.type === "success"
                  ? "terminal-success"
                  : line.type === "error"
                  ? "terminal-error"
                  : "terminal-output"
              }`}
            >
              {line.text}
            </div>
          );
        })}

        {/* Blinking cursor at end */}
        {visibleLines === 0 && (
          <div className="flex items-center gap-0">
            <span className="terminal-prompt">❯ </span>
            <span className="terminal-cursor" />
          </div>
        )}
      </div>
    </div>
  );
}
