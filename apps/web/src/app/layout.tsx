import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Backspace — Undo Anything Your AI Just Did",
  description:
    "Deterministic rollback for AI-assisted coding. One command to revert any AI session. AES-256 encrypted. Fully local.",
  keywords: [
    "AI coding", "rollback", "undo", "developer tools", "CLI",
    "Claude Code", "Cursor", "Copilot", "local-first",
  ],
  openGraph: {
    title: "Backspace — Undo Anything Your AI Just Did",
    description: "Claude broke your build? One command. Every file restored.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="antialiased scroll-smooth" style={{ background: "#0a0806", color: "#f5f0e8" }}>
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        {/* Grain texture overlay (Caveman-style) */}
        <div className="grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
