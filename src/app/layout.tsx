import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { AIChatPanel } from "@/components/ai/AIChatPanel";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildOrganizationSchema, buildWebSiteSchema } from "@/components/seo/schemas";

const inter = Inter({ subsets: ["latin"] });

const BASE_URL = "https://akilibrain.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "AkiliBrain | East Africa's Professional Intelligence Platform",
    template: "%s | AkiliBrain",
  },
  description:
    "East Africa's most comprehensive professional intelligence platform. Find government tenders, job opportunities, business compliance data, public health indicators, and salary benchmarks for Kenya, Tanzania, Uganda, and Rwanda.",
  keywords: [
    "government tenders Kenya",
    "procurement East Africa",
    "tenders Africa",
    "jobs Kenya",
    "jobs East Africa",
    "career opportunities Africa",
    "business compliance Kenya",
    "company registry East Africa",
    "public health data Africa",
    "salaries Kenya",
    "salary database East Africa",
    "Uganda tenders",
    "Tanzania procurement",
    "Rwanda jobs",
    "Africa business intelligence",
    "DHIS2 health data",
  ],
  openGraph: {
    type: "website",
    siteName: "AkiliBrain",
    title: "AkiliBrain | East Africa's Professional Intelligence Platform",
    description:
      "Find government tenders, jobs, compliance data, health indicators, and salary benchmarks across Kenya, Tanzania, Uganda, and Rwanda.",
    url: BASE_URL,
    locale: "en_KE",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "AkiliBrain — East Africa's Professional Intelligence Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AkiliBrain | East Africa's Professional Intelligence Platform",
    description:
      "Find government tenders, jobs, compliance data, health indicators, and salary benchmarks across East Africa.",
    images: ["/opengraph-image.png"],
    site: "@akilibrain",
  },
  alternates: {
    canonical: BASE_URL,
    types: {
      'application/rss+xml': `${BASE_URL}/feed.xml`,
    },
  },
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

import { PostHogProvider } from "@/components/providers/PostHogProvider";
import Script from 'next/script';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-KE">
      <body className={inter.className}>
        <JsonLd schema={buildOrganizationSchema()} />
        <JsonLd schema={buildWebSiteSchema()} />
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2501499631331261`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
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

