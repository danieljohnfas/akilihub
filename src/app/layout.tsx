import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { AIChatPanel } from "@/components/ai/AIChatPanel";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AkiliBrain | East Africa's Professional Intelligence Platform",
  description: "Unified professional intelligence platform for East Africa. Explore tenders, compliance data, health indicators, salaries, and developer tools.",
};

import { PostHogProvider } from "@/components/providers/PostHogProvider";

import Script from 'next/script';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2501499631331261" 
          crossOrigin="anonymous"
        ></script>
      </head>
      <body className={inter.className}>
        <PostHogProvider>
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
          <AIChatPanel />
        </PostHogProvider>
      </body>
    </html>
  );
}

