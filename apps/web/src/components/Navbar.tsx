"use client";

import { useState, useEffect, useRef } from "react";
import gsap from "gsap";

const links = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Calculator", href: "#calculator" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn, { passive: true });
    if (ref.current) gsap.from(ref.current, { y: -30, opacity: 0, duration: 0.5, ease: "power3.out" });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <>
      <nav ref={ref}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b ${
          scrolled ? "glass border-[#2a2520]" : "bg-transparent border-transparent"
        }`}>
        <div className="mx-auto max-w-[1200px] flex items-center justify-between px-6 py-3.5">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 group">
            <span className="text-[13px] font-semibold tracking-[0.02em] text-[#f5f0e8]">BACKSPACE</span>
            <span className="text-[10px] tracking-[0.15em] text-[#5c5347]">· CLI</span>
          </a>

          {/* Center links */}
          <div className="hidden md:flex items-center gap-6">
            {links.map(l => (
              <a key={l.label} href={l.href} onClick={e => go(e, l.href)}
                className="text-[12px] tracking-[0.04em] text-[#8a7f72] hover:text-[#f5f0e8] transition-colors">
                {l.label}
              </a>
            ))}
          </div>

          {/* Right */}
          <div className="hidden md:flex items-center gap-4">
            <a href="https://github.com/vaishak-v-nair/Backspace" target="_blank" rel="noopener noreferrer"
              className="text-[12px] text-[#8a7f72] hover:text-[#f5f0e8] transition-colors">
              GitHub
            </a>
            <a href="https://www.npmjs.com/package/backspace-ai" target="_blank" rel="noopener noreferrer"
              className="text-[11px] tracking-[0.08em] uppercase text-[#8b5cf6] border border-[#8b5cf6]/20 rounded-md px-3.5 py-1.5 hover:bg-[#8b5cf6]/10 transition-all">
              Install Backspace →
            </a>
          </div>

          {/* Mobile */}
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <div className="flex flex-col gap-1">
              <span className={`block w-4 h-px bg-[#c8bfb0] transition-transform ${menuOpen ? "rotate-45 translate-y-[3px]" : ""}`} />
              <span className={`block w-4 h-px bg-[#c8bfb0] transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block w-4 h-px bg-[#c8bfb0] transition-transform ${menuOpen ? "-rotate-45 -translate-y-[3px]" : ""}`} />
            </div>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-x-0 top-[52px] z-40 mx-4 rounded-lg p-4 md:hidden glass border border-[#2a2520]">
          {links.map(l => (
            <a key={l.label} href={l.href} onClick={e => go(e, l.href)}
              className="block text-[13px] text-[#c8bfb0] hover:text-[#f5f0e8] py-2.5">{l.label}</a>
          ))}
          <div className="border-t border-[#2a2520] mt-2 pt-3 flex flex-col gap-2">
            <a href="https://github.com/vaishak-v-nair/Backspace" target="_blank" rel="noopener noreferrer"
              className="text-[13px] text-[#8a7f72] hover:text-[#f5f0e8] py-1.5">GitHub</a>
            <a href="https://www.npmjs.com/package/backspace-ai" target="_blank" rel="noopener noreferrer"
              className="text-center text-[11px] tracking-[0.08em] uppercase text-[#8b5cf6] border border-[#8b5cf6]/20 rounded-md px-3.5 py-2 hover:bg-[#8b5cf6]/10 transition-all">
              Install Backspace →
            </a>
          </div>
        </div>
      )}
    </>
  );
}
