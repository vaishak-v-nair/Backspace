import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ClerkProvider } from "@clerk/nextjs";

import SmoothScroll from "@/components/SmoothScroll";
import Cursor from "@/components/Cursor";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Backspace — Deterministic Undo for AI Coding",
  description: "Claude Code broke your build? Stop burning tokens trying to fix it. One slider to snap your project back to safety.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={{ variables: { colorPrimary: "#00FF88" } }}>
      <html lang="en" className="bg-[#050505] text-white antialiased cursor-none">
        <body className={`${inter.variable} ${geistMono.variable} selection:bg-white selection:text-black`}>
          {/* Film Grain Overlay */}
          <div className="pointer-events-none fixed inset-0 z-50 h-full w-full bg-[url('/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
          
          <Cursor />
          
          <SmoothScroll>
            {children}
          </SmoothScroll>
        </body>
      </html>
    </ClerkProvider>
  );
}
