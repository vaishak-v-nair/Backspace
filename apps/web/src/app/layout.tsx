import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Backspace — Undo Anything Your AI Just Did",
  description:
    "Local-first deterministic rollback for AI-assisted coding workflows. One command to revert any AI session. Your code never leaves your machine.",
  keywords: [
    "AI coding",
    "rollback",
    "undo",
    "developer tools",
    "CLI",
    "Claude Code",
    "Cursor",
    "Copilot",
    "local-first",
    "code safety",
  ],
  openGraph: {
    title: "Backspace — Undo Anything Your AI Just Did",
    description:
      "Claude broke your build? Cursor hallucinated across 47 files? One command. Every file restored. Zero tokens wasted.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Backspace — Undo Anything Your AI Just Did",
    description:
      "Local-first deterministic rollback for AI-assisted coding. One command to revert any AI session.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[#050505] text-white antialiased">
      <body
        className={`${inter.variable} ${geistMono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
