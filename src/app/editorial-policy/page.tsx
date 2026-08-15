import Link from "next/link";
import { Shield, Globe, BarChart2, AlertCircle, RefreshCw } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbSchema } from "@/components/seo/schemas";

const principles = [
  {
    icon: Shield,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    title: "Source Verification",
    description: "All data is sourced from named, publicly accessible primary documents. We do not publish unverified or anonymous tips.",
  },
  {
    icon: BarChart2,
    color: "text-green-400",
    bg: "bg-green-400/10",
    title: "Editorial Independence",
    description: "AkiliBrain is editorially and financially independent. No fee is charged for listing - inclusion is determined solely by source availability, not commercial arrangement.",
  },
  {
    icon: RefreshCw,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    title: "Regular Updates",
    description: "Data pipelines run daily. Records are updated or removed when sources change, ensuring content stays current and relevant.",
  },
  {
    icon: AlertCircle,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    title: "Corrections Policy",
    description: "We investigate and correct factual errors promptly. Corrections are applied directly to the affected record without additional editorial fanfare.",
  },
  {
    icon: Globe,
    color: "text-rose-400",
    bg: "bg-rose-400/10",
    title: "Linking to Originals",
    description: "Where technically possible, every record links directly to the originating document or portal so users can independently verify the source.",
  },
];

const sources = [
  {
    module: "Government Tenders",
    description: "Aggregated daily from official national procurement portals.",
    items: [
      "PPRA (Tanzania Public Procurement Regulatory Authority) - ppra.go.tz",
      "PPIP (Kenya Public Procurement Information Portal) - tenders.go.ke",
      "PPDA (Uganda Public Procurement and Disposal of Assets Authority) - ppda.go.ug",
      "RPPA (Rwanda Public Procurement Authority) - rppa.gov.rw",
      "PPPA (Ethiopia Public Procurement and Property Administration Agency)",
    ],
  },
  {
    module: "Jobs and Careers",
    description: "Sourced from public job boards, NGO portals, and government career pages.",
    items: [
      "Public employer career pages and government HR portals",
      "NGO and international organisation job portals",
      "Publicly indexed job boards across East Africa",
    ],
  },
  {
    module: "Business Compliance",
    description: "Regulatory data drawn from official business registration and revenue authorities.",
    items: [
      "BRELA (Business Registrations and Licensing Agency, Tanzania)",
      "Business Registration Service and KRA (Kenya Revenue Authority)",
      "URSB (Uganda Registration Services Bureau)",
      "RRA (Rwanda Revenue Authority)",
    ],
  },
  {
    module: "Health Data",
    description: "Structured public health indicators from authoritative international and national sources.",
    items: [
      "DHIS2 (District Health Information Software 2) - national and district-level data",
      "WHO AFRO (World Health Organization Regional Office for Africa)",
      "World Bank Open Data - health indicators",
    ],
  },
  {
    module: "Salary Intelligence",
    description: "Crowdsourced salary submissions, collected anonymously and validated before publication.",
    items: [
      "Voluntary user submissions (anonymised immediately upon receipt)",
      "Aggregated at role/sector/country level - individual data is never displayed",
    ],
  },
];

export default function EditorialPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <JsonLd
        schema={buildBreadcrumbSchema([
          { name: "Home", url: "https://akilibrain.com" },
          { name: "Editorial Policy", url: "https://akilibrain.com/editorial-policy" },
        ])}
      />
      <div className="space-y-12">
        <section className="space-y-4">
          <p className="text-sm font-semibold tracking-widest text-primary/70 uppercase">Transparency</p>
          <h1 className="text-4xl font-extrabold tracking-tight">Editorial Policy</h1>
          <p className="text-muted-foreground leading-relaxed max-w-2xl">
            AkiliBrain aggregates publicly available professional intelligence data across East Africa.
            This page explains how we source, validate, publish, and correct that data.
          </p>
          <p className="text-sm text-muted-foreground/70">
            Last updated: <span className="text-foreground font-medium">August 2026</span>
          </p>
        </section>

        <section className="space-y-5">
          <h2 className="text-2xl font-bold">Our Editorial Principles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {principles.map(({ icon: Icon, color, bg, title, description }) => (
              <div key={title} className="flex flex-col gap-3 p-5 rounded-xl border border-white/10 bg-white/5">
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-base">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Data Sources by Module</h2>
          <div className="space-y-5">
            {sources.map(({ module, description, items }) => (
              <div key={module} className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
                <h3 className="font-semibold text-lg">{module}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
                <ul className="space-y-1.5 mt-2">
                  {items.map((src) => (
                    <li key={src} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-1">-</span>
                      {src}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-2xl font-bold">AI-Assisted Data Processing</h2>
          <p className="text-muted-foreground leading-relaxed">
            AkiliBrain uses automated data pipelines including machine learning assistance for data extraction,
            classification, and summarisation tasks. AI assistance is used to structure data from official
            sources, not to generate or invent factual claims.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            We do not use AI to generate fabricated content, fake testimonials, or synthetic records.
            All content on AkiliBrain is substantive, non-deceptive, and traceable to legitimate public sources.
          </p>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-2xl font-bold">Advertising</h2>
          <p className="text-muted-foreground leading-relaxed">
            AkiliBrain may display advertisements served by Google AdSense and other networks.
            Advertisements are clearly distinguished from editorial content. Advertising relationships
            have no influence over data sourcing, listing inclusion, or editorial decisions.
          </p>
        </section>

        <section className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-2">
          <h2 className="font-semibold text-base text-primary">Contact the Editorial Team</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            To report inaccurate data or request a correction, email{" "}
            <a href="mailto:corrections@akilibrain.com" className="text-primary hover:underline underline-offset-4">
              corrections@akilibrain.com
            </a>
            . We aim to respond within 5 business days.
          </p>
        </section>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/" className="text-sm text-primary hover:underline underline-offset-4">Back to Home</Link>
          <Link href="/about" className="text-sm text-primary hover:underline underline-offset-4">About AkiliBrain</Link>
          <Link href="/privacy" className="text-sm text-primary hover:underline underline-offset-4">Privacy Policy</Link>
          <Link href="/terms" className="text-sm text-primary hover:underline underline-offset-4">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
