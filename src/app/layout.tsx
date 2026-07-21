import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { AIChatPanel } from "@/components/ai/AIChatPanel";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildOrganizationSchema, buildWebSiteSchema } from "@/components/seo/schemas";
import { ClarityAnalytics } from "@/components/analytics/Clarity";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

const BASE_URL = "https://akilibrain.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "AkiliBrain | East Africa's Professional Intelligence Platform",
    template: "%s | AkiliBrain",
  },
  description: "Find jobs, tenders & compliance data in East Africa.",
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
    description: "Find jobs, tenders & compliance data in East Africa.",
    url: BASE_URL,
    locale: "en_KE",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "AkiliBrain — East Africa's Professional Intelligence Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AkiliBrain | East Africa's Professional Intelligence Platform",
    description: "Find jobs, tenders & compliance data in East Africa.",
    images: ["/og.png"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-KE" suppressHydrationWarning>
      <head>
        <JsonLd schema={buildOrganizationSchema()} />
        <JsonLd schema={buildWebSiteSchema()} />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2501499631331261"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body className={inter.className}>
        <ClarityAnalytics />
        <PostHogProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Navbar />
            <main className="min-h-screen">
              {children}
            </main>
            <Footer />
            <AIChatPanel />
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}

