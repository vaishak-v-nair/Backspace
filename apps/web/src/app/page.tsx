"use client";

import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AIEra from "@/components/AIEra";
import TrustSection from "@/components/TrustSection";
import WhyNotGit from "@/components/WhyNotGit";
import TimelineAnimation from "@/components/TimelineAnimation";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorks from "@/components/HowItWorks";
import TokenCalculator from "@/components/TokenCalculator";
import TheFuture from "@/components/TheFuture";
import WaitlistSection from "@/components/WaitlistSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden" style={{ background: "#0a0806", color: "#f5f0e8" }}>
      {/* Subtle dot grid */}
      <div className="fixed inset-0 dot-grid pointer-events-none" />

      <Navbar />
      <HeroSection />
      <AIEra />
      <TrustSection />
      <WhyNotGit />
      <TimelineAnimation />
      <FeaturesSection />
      <HowItWorks />
      <TokenCalculator />
      <TheFuture />
      <WaitlistSection />
      <Footer />
    </main>
  );
}
