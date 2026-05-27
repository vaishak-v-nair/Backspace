"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

export default function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [betaKey, setBetaKey] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === "loading") return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setBetaKey(data.betaKey || "");
      setStatus("success");
    } catch (err: any) {
      setErrorMsg(err.message);
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
            Early Access
          </p>

          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl mb-4">
            Ready to stop fearing
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ff88] to-[#00cc6a]">
              AI edits?
            </span>
          </h2>

          <p className="text-lg text-white/40 mb-12 max-w-lg mx-auto">
            Join the waitlist to get early CLI access and help shape the future of AI-safe development.
          </p>

          {status === "success" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-3 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 px-6 py-3">
                <span className="text-[#00ff88]">✓</span>
                <span className="text-sm text-white/80">You&apos;re on the list!</span>
              </div>

              {betaKey && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                  <p className="text-xs text-white/30 mb-3 uppercase tracking-wider">Your beta key</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(`npx backspace-ai login --key ${betaKey}`)}
                    className="group font-mono text-sm text-white/70 hover:text-white transition-colors"
                  >
                    <span className="text-white/40">$ </span>
                    npx backspace-ai login --key {betaKey}
                    <span className="ml-2 text-white/30 group-hover:text-[#00ff88] transition-colors">⎘</span>
                  </button>
                </div>
              )}
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
                  "Join Waitlist"
                )}
              </button>
            </form>
          )}

          {status === "error" && (
            <p className="mt-4 text-sm text-[#ff4444]">{errorMsg}</p>
          )}

          <p className="mt-6 text-xs text-white/20">
            Or install directly:{" "}
            <code className="font-mono text-white/40">npx backspace-ai init</code>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
