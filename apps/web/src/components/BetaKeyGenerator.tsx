"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function BetaKeyGenerator() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [betaKey, setBetaKey] = useState("");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    
    setTimeout(() => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let key = 'BK-';
      for (let i = 0; i < 12; i++) {
        if (i > 0 && i % 4 === 0) key += '-';
        key += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setBetaKey(key);
      setStatus("success");
    }, 1500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, delay: 1.2 }}
      className="mt-12 flex flex-col items-center w-full"
    >
      {status === "success" ? (
        <div className="flex flex-col sm:flex-row items-center gap-4 rounded-full border border-white/10 bg-black/40 p-2 pl-6 backdrop-blur-xl transition-colors hover:bg-white/5 hover:border-white/20">
          <span className="font-mono text-sm text-white/80">
            $ npx backspace-ai login --key {betaKey}
          </span>
          <button 
            onClick={() => navigator.clipboard.writeText(`npx backspace-ai login --key ${betaKey}`)}
            className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-black transition-transform hover:scale-105 cursor-none"
          >
            Copy Command
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md">
          <form onSubmit={handleJoin} className="flex gap-2 p-1 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl transition-colors focus-within:border-white/30">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="engineer@company.com"
              required
              className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none cursor-none"
              disabled={status === "loading"}
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="bg-white text-black font-semibold px-6 py-2 rounded-full text-sm hover:scale-105 transition-transform disabled:opacity-70 disabled:hover:scale-100 flex items-center gap-2 cursor-none"
            >
              {status === "loading" ? "Generating..." : "Join Waitlist"}
            </button>
          </form>
          <div className="text-center mt-4 text-xs text-white/30 font-light tracking-wide">
            Or generate via CLI directly: <span className="font-mono text-white/60">npx backspace-ai join</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
