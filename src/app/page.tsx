import Link from "next/link";
import { FileText, ShieldCheck, Activity, Banknote, Code, ArrowRight, Briefcase } from "lucide-react";
import { CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Suspense } from 'react';
import nextDynamic from 'next/dynamic';
import { JsonLd } from "@/components/seo/JsonLd";
import { buildFAQSchema } from "@/components/seo/schemas";

const MagicCard = nextDynamic(() => import('@/components/ui/magic-card').then(mod => mod.MagicCard), { ssr: true });
const RelatedGuides = nextDynamic(() => import('@/components/guides/RelatedGuides').then(mod => mod.RelatedGuides), { ssr: true });
const LiveStats = nextDynamic(() => import('@/components/home/LiveStats').then(mod => mod.LiveStats), { ssr: true });
import { LeadCapture } from '@/components/home/ClientWidgets';



import { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://akilibrain.com',
  },
};

export const dynamic = 'force-dynamic';
const features = [
  {
    title: "Procurement Intelligence",
    description: "Search and apply for government tenders across East Africa.",
    icon: FileText,
    href: "/tenders",
    color: "text-blue-500",
    bg: "bg-blue-500/10"
  },
  {
    title: "Jobs & Careers",
    description: "Browse thousands of job openings sourced daily from across the web.",
    icon: Briefcase,
    href: "/jobs",
    color: "text-amber-500",
    bg: "bg-amber-500/10"
  },
  {
    title: "Business Compliance",
    description: "Permits, licenses, and legal requirements for your business type.",
    icon: ShieldCheck,
    href: "/compliance",
    color: "text-purple-500",
    bg: "bg-purple-500/10"
  },
  {
    title: "Health Data Explorer",
    description: "Interactive dashboards and trends from DHIS2 and WHO data.",
    icon: Activity,
    href: "/health",
    color: "text-teal-500",
    bg: "bg-teal-500/10"
  },
  {
    title: "Salary Intelligence",
    description: "Crowdsourced compensation data to negotiate better offers.",
    icon: Banknote,
    href: "/salaries",
    color: "text-green-500",
    bg: "bg-green-500/10"
  },
  {
    title: "Developer Toolbox",
    description: "Free DHIS2, FHIR, HL7, and ICD-11 tools for health IT pros.",
    icon: Code,
    href: "/developers",
    color: "text-orange-500",
    bg: "bg-orange-500/10"
  }
];


const homeFAQSchema = buildFAQSchema([
  {
    question: 'What is AkiliBrain?',
    answer:
      "AkiliBrain is East Africa's professional intelligence platform that aggregates government tenders, job openings, business compliance requirements, public health data, and salary benchmarks for Kenya, Tanzania, Uganda, Rwanda, Ethiopia, DRC, and the wider East & Central African region — all in one place.",
  },
  {
    question: 'Where can I find government tenders in Kenya?',
    answer:
      'AkiliBrain lists open government tenders across Kenya, Tanzania, Uganda, Rwanda, Ethiopia, and DRC. Visit akilibrain.com/tenders to browse and filter by country, status, sector, or keyword.',
  },
  {
    question: 'Does AkiliBrain list jobs in East Africa?',
    answer:
      'Yes. AkiliBrain automatically scrapes hundreds of job boards and employer websites daily to give you the freshest job listings across East Africa, including full-time, part-time, contract, internship, and remote roles.',
  },
  {
    question: 'Is AkiliBrain free to use?',
    answer:
      'Yes. AkiliBrain is completely free to access. You can browse tenders, jobs, compliance guides, health data, and salary data without creating an account.',
  },
  {
    question: 'What business compliance information does AkiliBrain provide?',
    answer:
      'AkiliBrain provides compliance requirements for businesses in East Africa, including permits, licenses, tax registration, employment regulations, and sector-specific requirements sourced from official government publications.',
  },
]);

import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { countries } from '@/lib/db/schema/shared';
import { count, eq, or, isNull, gt, and } from 'drizzle-orm';

export default async function Home() {
  const [activeJobsCount, openTendersCount, countriesCount] = await Promise.all([
    safeQuery(
      db.select({ value: count() }).from(jobs).where(
        and(
          eq(jobs.isActive, true),
          eq(jobs.isAggregatorSource, false),
          or(isNull(jobs.deadline), gt(jobs.deadline, new Date()))
        )
      )
    ),
    safeQuery(
      db.select({ value: count() }).from(tenders).where(eq(tenders.status, 'open'))
    ),
    safeQuery(
      db.select({ value: count() }).from(countries)
    ),
  ]);

  const jobsTotal = activeJobsCount?.[0]?.value ?? 1500;
  const tendersTotal = openTendersCount?.[0]?.value ?? 226;
  const countriesTotal = countriesCount?.[0]?.value ?? 9;

  return (
    <>
      <JsonLd schema={homeFAQSchema} />
      <div className="flex flex-col items-center justify-center pt-16 pb-24 space-y-24">
      {/* Hero Section */}
      <section className="container mx-auto px-4 text-center space-y-6 max-w-4xl">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-foreground/70 pb-2">
          Find Jobs Across <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">East Africa</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
          {jobsTotal.toLocaleString()}+ Active Jobs | {countriesTotal} Countries | Updated Daily
        </p>
        
        <div className="max-w-2xl mx-auto mt-8">
          <form action="/jobs" method="GET" className="relative flex items-center">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <Briefcase className="h-6 w-6 text-muted-foreground" />
            </div>
            <input 
              type="text" 
              name="q"
              placeholder="Search jobs, companies, skills or locations..." 
              className="w-full pl-14 pr-32 py-5 rounded-full bg-background border border-input shadow-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-lg transition-all"
            />
            <button 
              type="submit" 
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-full font-medium transition-all"
            >
              Search
            </button>
          </form>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-6 text-sm text-muted-foreground">
            <Link href="/jobs/tanzania" className="hover:text-foreground transition-colors">Tanzania</Link>
            <span className="opacity-30">•</span>
            <Link href="/jobs/kenya" className="hover:text-foreground transition-colors">Kenya</Link>
            <span className="opacity-30">•</span>
            <Link href="/jobs/uganda" className="hover:text-foreground transition-colors">Uganda</Link>
            <span className="opacity-30">•</span>
            <Link href="/jobs/rwanda" className="hover:text-foreground transition-colors">Rwanda</Link>
            <span className="opacity-30">•</span>
            <Link href="/jobs/ethiopia" className="hover:text-foreground transition-colors">Ethiopia</Link>
            <span className="opacity-30">•</span>
            <Link href="/jobs/somalia" className="hover:text-foreground transition-colors">Somalia</Link>
            <span className="opacity-30">•</span>
            <Link href="/jobs/burundi" className="hover:text-foreground transition-colors">Burundi</Link>
            <span className="opacity-30">•</span>
            <Link href="/jobs/south-sudan" className="hover:text-foreground transition-colors">South Sudan</Link>
            <span className="opacity-30">•</span>
            <Link href="/jobs/democratic-republic-of-the-congo" className="hover:text-foreground transition-colors">DRC</Link>
          </div>
        </div>

        <Suspense fallback={<div className="h-24 mt-8" />}>
          <LiveStats jobsTotal={jobsTotal} tendersTotal={tendersTotal} countriesTotal={countriesTotal} />
        </Suspense>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Make first two cards span more logically if needed, but 2+3 grid usually means 2 rows */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 lg:col-span-3">
            {features.slice(0, 2).map((feature) => (
              <MagicCard key={feature.title} className="flex flex-col h-full hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 bg-card/60 backdrop-blur-2xl border-border shadow-sm dark:border-white/10">
                <CardHeader className="text-center flex flex-col items-center">
                  <div className={`w-14 h-14 rounded-xl ${feature.bg} flex items-center justify-center mb-5 ring-1 ring-border dark:ring-white/10 shadow-inner`}>
                    <feature.icon className={`h-7 w-7 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-2xl font-bold tracking-tight">{feature.title}</CardTitle>
                  <CardDescription className="text-base pt-3 leading-relaxed">{feature.description}</CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto pt-8 pb-6 bg-transparent border-t-0 flex justify-center">
                  <Link href={feature.href} className={buttonVariants({ variant: "ghost", className: "w-full justify-center hover:bg-muted group" })}>
                    <span className="font-medium">Explore {feature.title}</span> <ArrowRight className="h-5 w-5 ml-2 text-muted-foreground group-hover:translate-x-1 group-hover:text-foreground transition-all" />
                  </Link>
                </CardFooter>
              </MagicCard>
            ))}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:col-span-3">
            {features.slice(2, 6).map((feature) => (
              <MagicCard key={feature.title} className="flex flex-col h-full hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 bg-card/60 backdrop-blur-2xl border-border shadow-sm dark:border-white/10">
                <CardHeader className="text-center flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 ring-1 ring-border dark:ring-white/10 shadow-inner`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-xl font-bold tracking-tight">{feature.title}</CardTitle>
                  <CardDescription className="pt-2 leading-relaxed">{feature.description}</CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto pt-6 pb-6 bg-transparent border-t-0 flex justify-center">
                  <Link href={feature.href} className={buttonVariants({ variant: "ghost", className: "w-full justify-center hover:bg-muted group" })}>
                    <span className="font-medium">Explore</span> <ArrowRight className="h-4 w-4 ml-2 text-muted-foreground group-hover:translate-x-1 group-hover:text-foreground transition-all" />
                  </Link>
                </CardFooter>
              </MagicCard>
            ))}
          </div>
        </div>
      </section>

      {/* AI CV Matcher Section */}
      <section className="container mx-auto px-4 w-full max-w-5xl">
        <div className="border border-primary/20 rounded-2xl p-8 md:p-12 bg-gradient-to-br from-primary/5 via-background to-transparent relative overflow-hidden">
          <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Let AI Find Your Perfect Role</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Stop applying blindly. Upload your CV and let our AI calculate your match percentage for thousands of jobs across East Africa, suggest improvements, and generate tailored cover letters.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/login?redirect=/dashboard/cv-analyzer" className={buttonVariants({ size: "lg", className: "rounded-full shadow-lg shadow-primary/20 text-md px-8" })}>
                  Analyze My CV
                </Link>
                <Link href="/signup" className={buttonVariants({ variant: "outline", size: "lg", className: "rounded-full text-md px-8" })}>
                  Create Profile
                </Link>
              </div>
            </div>
            <div className="hidden md:flex flex-col gap-4">
              {/* Funnel visual representation */}
              <div className="flex items-center gap-4 bg-card/60 backdrop-blur-sm p-4 rounded-xl border border-border dark:border-white/10">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold">1</div>
                <div><p className="font-semibold">Upload CV</p><p className="text-xs text-muted-foreground">PDF or Word</p></div>
              </div>
              <div className="flex items-center gap-4 bg-card/60 backdrop-blur-sm p-4 rounded-xl border border-border dark:border-white/10 ml-6">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold">2</div>
                <div><p className="font-semibold">AI Match</p><p className="text-xs text-muted-foreground">&quot;You match 84% of 37 jobs&quot;</p></div>
              </div>
              <div className="flex items-center gap-4 bg-card/60 backdrop-blur-sm p-4 rounded-xl border border-border dark:border-white/10 ml-12">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 font-bold">3</div>
                <div><p className="font-semibold">Apply Instantly</p><p className="text-xs text-muted-foreground">With auto-generated cover letters</p></div>
              </div>
            </div>
          </div>
          {/* Background decoration */}
          <div className="absolute right-0 bottom-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        </div>
      </section>

      {/* Latest Insights Section — only renders if DB has guides */}
      <Suspense fallback={null}>
        <RelatedGuides title="Latest Insights &amp; Guides" className="container mx-auto px-4 w-full max-w-6xl" />
      </Suspense>
    </div>
    </>
  );
}
