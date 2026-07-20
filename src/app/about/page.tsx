import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FileText,
  Briefcase,
  ShieldCheck,
  Activity,
  Banknote,
  Code,
  Database,
  Globe,
  Heart,
  Users,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'About AkiliBrain',
  description:
    "Learn about AkiliBrain — East Africa's Professional Intelligence Platform. Our mission, story, expertise in DHIS2 and health information systems, and the real data sources behind every module.",
  alternates: {
    canonical: 'https://akilibrain.com/about',
  },
};

const modules = [
  {
    icon: FileText,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    title: 'Procurement Intelligence',
    description:
      'Government tender listings aggregated daily from PPRA (Kenya), PPOA (Tanzania), PPDA (Uganda), RPPA (Rwanda), and PPPA (Ethiopia). We surface opportunities that would otherwise require hours of manual checking across dozens of portals.',
    sources: 'PPRA, PPOA, PPDA, RPPA, PPPA',
  },
  {
    icon: Briefcase,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    title: 'Jobs & Careers',
    description:
      'Thousands of job listings sourced from public job boards, NGO portals, and government career pages across East Africa. CV uploads are used exclusively for AI-powered job matching and are never sold.',
    sources: 'Public job boards, NGO portals, government career pages',
  },
  {
    icon: ShieldCheck,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    title: 'Business Compliance',
    description:
      'Permit, licence, and regulatory requirement data drawn from BRELA (Tanzania), KRA & Business Registration Service (Kenya), URSB (Uganda), and RRA (Rwanda). Know exactly what filings your business needs.',
    sources: 'BRELA, KRA, BRS, URSB, RRA',
  },
  {
    icon: Activity,
    color: 'text-teal-400',
    bg: 'bg-teal-400/10',
    title: 'Health Data Explorer',
    description:
      'Interactive dashboards built on DHIS2 district health data, WHO AFRO indicators, and World Bank Open Data. Visualise disease burden, health-system performance, and key public-health trends.',
    sources: 'DHIS2, WHO AFRO, World Bank Open Data',
  },
  {
    icon: Banknote,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    title: 'Salary Intelligence',
    description:
      'Crowdsourced compensation benchmarks submitted anonymously by professionals across the region. Submissions are validated, aggregated, and displayed at a role/sector/country level — no individual data is ever exposed.',
    sources: 'Crowdsourced community submissions',
  },
  {
    icon: Code,
    color: 'text-rose-400',
    bg: 'bg-rose-400/10',
    title: 'Developer API',
    description:
      'Programmatic access to tenders, jobs, compliance requirements, and health indicators for Kenya, Tanzania, Uganda, Rwanda, and Ethiopia. Build your own products on top of the same real-time data.',
    sources: 'All first-party AkiliBrain data pipelines',
  },
];

const dataPrinciples = [
  {
    icon: Database,
    title: 'Real sources only',
    description:
      'Every data point traces back to a named, authoritative source — a government portal, an international body, or a verified community submission. We never invent, interpolate, or pad numbers.',
  },
  {
    icon: Globe,
    title: 'Direct links to originals',
    description:
      'Where technically possible, we link directly to the originating document or page so you can verify the raw source yourself.',
  },
  {
    icon: Heart,
    title: 'No invented data',
    description:
      'If a data point is not available from a reliable source, we show nothing rather than filling the gap with estimates. Blank is better than wrong.',
  },
  {
    icon: Users,
    title: 'Community data is anonymised',
    description:
      'Salary submissions and other crowd-sourced inputs are immediately anonymised before storage. Individual responses are never displayed; only aggregated statistics are published.',
  },
];

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="space-y-12">

        {/* Hero */}
        <section className="space-y-4 text-center">
          <p className="text-sm font-semibold tracking-widest text-primary/70 uppercase">
            Our story
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            About AkiliBrain
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            East Africa&apos;s Professional Intelligence Platform — making
            tender, job, compliance, health, and salary data accessible in one
            trusted place.
          </p>
        </section>

        {/* Mission */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-2xl font-bold">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed">
            Professional and business information in East Africa is scattered
            across dozens of government portals, PDF announcements, and
            siloed databases — each with its own format, update cadence, and
            level of accessibility. AkiliBrain exists to change that. Our
            mission is simple: aggregate every piece of publicly available
            professional intelligence across Kenya, Tanzania, Uganda, Rwanda,
            and Ethiopia into a single, searchable, always-fresh platform —
            and make it free to access.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            We believe that equal access to information is a prerequisite for
            equal economic opportunity. A small consultancy in Mwanza should
            have the same visibility into government procurement opportunities
            as a large firm in Nairobi. A new graduate in Kampala should be
            able to benchmark their salary offer as easily as someone at a
            multinational.
          </p>
        </section>

        {/* Our Story */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-2xl font-bold">Our Story</h2>
          <p className="text-muted-foreground leading-relaxed">
            AkiliBrain was founded after years of frustration watching
            professionals, businesses, and NGOs waste enormous effort
            manually checking government tender portals, hunting for
            salary data, and piecing together compliance requirements from
            outdated PDFs. The insight was straightforward: all this data is
            technically public — it just isn&apos;t accessible.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            The founding team brings deep experience in East African
            public-sector data infrastructure. With over 11 years working in
            Tanzanian health information systems — implementing DHIS2,
            working with HL7 FHIR standards, and delivering health data
            pipelines for national and district health management — we
            understand both the value of structured public data and the real
            effort required to make it usable. That same discipline now
            underpins every data pipeline at AkiliBrain.
          </p>
        </section>

        {/* Our Expertise */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-2xl font-bold">Our Expertise</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'DHIS2 & Health Information Systems', detail: '11+ years Tanzania national & district health data' },
              { label: 'HL7 FHIR & Health Interoperability', detail: 'Standards-based health data exchange' },
              { label: 'Government Procurement Frameworks', detail: 'EA procurement law, PPRA/PPOA/PPDA regulations' },
              { label: 'East African Regulatory Environments', detail: 'Company law, tax compliance, licensing across 5 countries' },
              { label: 'Data Pipeline Engineering', detail: 'ETL, data quality, real-time aggregation at scale' },
              { label: 'Public Health Analytics', detail: 'WHO indicators, disease burden, health-system performance' },
            ].map(({ label, detail }) => (
              <div
                key={label}
                className="flex flex-col gap-1 p-4 rounded-lg border border-white/10 bg-white/5"
              >
                <span className="font-semibold text-sm">{label}</span>
                <span className="text-xs text-muted-foreground">{detail}</span>
              </div>
            ))}
          </div>
        </section>

        {/* What We Build */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">What We Build</h2>
          <p className="text-muted-foreground">
            AkiliBrain is organised into six intelligence modules, each backed
            by named, verifiable data sources.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {modules.map(({ icon: Icon, color, bg, title, description, sources }) => (
              <div
                key={title}
                className="flex flex-col gap-3 p-5 rounded-xl border border-white/10 bg-white/5"
              >
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-base">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                  <p className="text-xs text-primary/70 font-medium mt-2">
                    Sources: {sources}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Data Principles */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
          <h2 className="text-2xl font-bold">Our Data Principles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {dataPrinciples.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Disclaimer + Nav */}
        <section className="space-y-4">
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-muted-foreground">
            <strong className="text-amber-400">Independence notice:</strong>{' '}
            AkiliBrain is an independent platform. We are not affiliated with
            or endorsed by any government body, regulatory authority, or
            international organisation referenced on this site.
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/"
              className="text-sm text-primary hover:underline underline-offset-4"
            >
              ← Back to Home
            </Link>
            <Link
              href="/contact"
              className="text-sm text-primary hover:underline underline-offset-4"
            >
              Contact us →
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-primary hover:underline underline-offset-4"
            >
              Privacy Policy →
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
