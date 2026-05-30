"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

export default function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === "loading") return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Something went wrong.");
        setStatus("error");
        return;
      }

      setMessage(data.message || "You're on the list!");
      setStatus("success");
    } catch {
      setMessage("Network error. Please try again.");
      setStatus("error");
    }
  };

  return (
    <section id="waitlist" ref={ref} className="relative py-32 px-6">
      {/* Background */}
      <div className="gradient-orb w-[600px] h-[600px] bg-[#00ff88]/[0.04] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="mx-auto max-w-2xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-white/30 mb-6">
            Stay in the Loop
          </p>

          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl mb-4">
            Get updates on
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ff88] to-[#00cc6a]">
              new releases.
            </span>
          </h2>

          <p className="text-lg text-white/40 mb-12 max-w-lg mx-auto">
            Sign up to hear about new features, CLI updates, and integrations as we build them.
          </p>

          {status === "success" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-3 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 px-6 py-3">
                <span className="text-[#00ff88]">✓</span>
                <span className="text-sm text-white/80">{message}</span>
              </div>

              <p className="text-sm text-white/30">
                In the meantime, install the CLI:
              </p>
              <button
                onClick={() => navigator.clipboard.writeText("npm install -g backspace-ai")}
                className="group font-mono text-sm text-white/70 hover:text-white transition-colors"
              >
                <span className="text-white/40">$ </span>
                npm install -g backspace-ai
                <span className="ml-2 text-white/30 group-hover:text-[#00ff88] transition-colors">⎘</span>
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                disabled={status === "loading"}
                className="flex-1 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00ff88]/30 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="rounded-full bg-white px-8 py-3 text-sm font-medium text-black hover:bg-white/90 transition-colors disabled:opacity-70 whitespace-nowrap"
              >
                {status === "loading" ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Joining...
                  </span>
                ) : (
                  "Get Updates"
                )}
              </button>
            </form>
          )}

          {status === "error" && (
            <p className="mt-4 text-sm text-[#ff4444]">{message}</p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
