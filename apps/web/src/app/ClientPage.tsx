"use client";

import { motion } from "framer-motion";
import { useAuth, SignInButton, UserButton } from "@clerk/nextjs";
import Scene from "@/components/Scene";
import BetaKeyGenerator from "@/components/BetaKeyGenerator";
import TokenCalculator from "@/components/TokenCalculator";

export default function ClientPage() {
  const headlineWords = ["The", "Time", "Machine", "for", "Vibe", "Coding."];
  const { isSignedIn } = useAuth();

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#050505] text-white">
      {/* 3D WebGL Background */}
      <Scene />

      {/* Content Container - z-index 10 to sit above the 3D canvas */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6 pt-20 pb-32">
        
        {/* Auth Header */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute top-6 right-6 z-20"
        >
          {isSignedIn ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-white/50 hidden md:inline tracking-wide">Welcome back</span>
              <UserButton appearance={{ elements: { userButtonAvatarBox: "w-10 h-10 border border-white/20" } }} />
            </div>
          ) : (
            <SignInButton mode="modal">
              <button className="bg-transparent hover:bg-white/5 border border-white/20 text-white text-sm font-medium py-2 px-6 rounded-full transition-colors cursor-none hover:border-white/50 backdrop-blur-md">
                Developer Login
              </button>
            </SignInButton>
          )}
        </motion.div>

        {/* Animated MCP Badge */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs tracking-widest text-white/70 backdrop-blur-md uppercase flex items-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
          Backspace MCP Server is now live
        </motion.div>

        {/* Cluma-style Massive Masked Typography */}
        <h1 className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-center text-7xl font-medium tracking-tighter md:text-8xl lg:text-[10rem] leading-[0.9]">
          {headlineWords.map((word, i) => (
            <div key={i} className="overflow-hidden pb-4">
              <motion.span
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: 1.2,
                  delay: i * 0.1,
                  ease: [0.16, 1, 0.3, 1], // The signature "Cluma" easing curve
                }}
                className="inline-block"
              >
                {word}
              </motion.span>
            </div>
          ))}
        </h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-8 max-w-2xl text-center text-lg text-white/50 md:text-xl font-light tracking-wide"
        >
          Claude Code broke your build? Stop burning tokens trying to fix it. 
          One slider to snap your project back to safety.
        </motion.p>

        {/* Waitlist Component */}
        <BetaKeyGenerator />

        {/* Token Calculator Component */}
        <TokenCalculator />
        
      </div>
    </main>
  );
}
