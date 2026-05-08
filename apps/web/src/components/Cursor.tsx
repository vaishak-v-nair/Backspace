"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function Cursor() {
  const [isHovering, setIsHovering] = useState(false);
  
  // High-performance motion values that bypass React state renders
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  
  // Smooth spring physics tied directly to the motion values
  const springConfig = { damping: 25, stiffness: 300, mass: 0.2 };
  const smoothX = useSpring(cursorX, springConfig);
  const smoothY = useSpring(cursorY, springConfig);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      // Update motion values directly (does NOT trigger React re-render)
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      
      // We only update React state when the hover state actually changes
      const target = e.target as HTMLElement;
      const isInteractive = target.closest('button, a, input, [role="button"]');
      setIsHovering(!!isInteractive);
    };

    window.addEventListener("mousemove", updateMousePosition);
    return () => window.removeEventListener("mousemove", updateMousePosition);
  }, [cursorX, cursorY]);

  return (
    <motion.div
      className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full border border-white/50 mix-blend-difference flex items-center justify-center origin-center"
      style={{
        x: smoothX,
        y: smoothY,
        translateX: "-50%",
        translateY: "-50%",
      }}
      animate={{
        width: isHovering ? 48 : 32,
        height: isHovering ? 48 : 32,
        backgroundColor: isHovering ? "rgba(255,255,255,0.1)" : "transparent",
      }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <motion.div 
        className="w-1 h-1 bg-white rounded-full"
        animate={{ opacity: isHovering ? 0 : 1 }}
      />
    </motion.div>
  );
}
