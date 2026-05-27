"use client";

import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProblemSection from "@/components/ProblemSection";
import FeaturesGrid from "@/components/FeaturesGrid";
import HowItWorks from "@/components/HowItWorks";
import TokenCalculator from "@/components/TokenCalculator";
import WaitlistSection from "@/components/WaitlistSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#050505] text-white">
      {/* Subtle grid background */}
      <div className="fixed inset-0 grid-bg opacity-50 pointer-events-none" />

      <Navbar />
      <HeroSection />
      <ProblemSection />
      <FeaturesGrid />
      <HowItWorks />
      <TokenCalculator />
      <WaitlistSection />
      <Footer />
    </main>
  );
}
