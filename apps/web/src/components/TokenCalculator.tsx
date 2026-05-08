"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function TokenCalculator() {
  const [filesChanged, setFilesChanged] = useState(15);

  const debugIterations = Math.max(1, Math.floor(filesChanged / 2));
  const tokensPerIteration = 45000;
  const totalTokens = debugIterations * tokensPerIteration;
  const costSaved = ((totalTokens / 1_000_000) * 4.00).toFixed(2);
  const timeSavedMinutes = debugIterations * 3;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 1.4 }}
      className="mt-24 w-full max-w-3xl rounded-3xl border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-10 backdrop-blur-3xl"
    >
      <div className="mb-8 text-center">
        <h2 className="text-xl font-medium tracking-tight">The Cost of an AI Hallucination</h2>
        <p className="mt-2 text-sm text-white/40">Slide to see how much you save by reverting instantly.</p>
      </div>

      <div className="mb-12">
        <div className="flex justify-between mb-4 text-sm font-medium">
          <span className="text-white/70">Files modified by AI</span>
          <span className="text-[#00FF88]">{filesChanged} files</span>
        </div>
        <input 
          type="range" 
          min="1" 
          max="50" 
          value={filesChanged}
          onChange={(e) => setFilesChanged(parseInt(e.target.value))}
          className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-none accent-white focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-8 text-center">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-widest text-white/40">Tokens Saved</span>
          <span className="font-mono text-2xl font-light">{totalTokens.toLocaleString()}</span>
        </div>
        <div className="flex flex-col gap-2 border-x border-white/5">
          <span className="text-[10px] uppercase tracking-widest text-[#00FF88]">Money Saved</span>
          <span className="font-mono text-3xl font-medium text-[#00FF88]">${costSaved}</span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-widest text-white/40">Time Saved</span>
          <span className="font-mono text-2xl font-light">{timeSavedMinutes}m</span>
        </div>
      </div>
    </motion.div>
  );
}
