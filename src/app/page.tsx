import Link from "next/link";
import { FileText, ShieldCheck, Activity, Banknote, Code, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

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

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center pt-16 pb-24 space-y-24">
      {/* Hero Section */}
      <section className="container mx-auto px-4 text-center space-y-6 max-w-4xl">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          East Africa&apos;s Professional <span className="text-primary">Intelligence Platform</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Access curated government tenders, compliance requirements, crowdsourced salaries, 
          and actionable health data in one unified hub.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link href="/tenders" className={buttonVariants({ size: "lg" })}>
            Browse Tenders
          </Link>
          <Link href="/salaries" className={buttonVariants({ size: "lg", variant: "outline" })}>
            Check Salaries
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Make first two cards span more logically if needed, but 2+3 grid usually means 2 rows */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 lg:col-span-3">
            {features.slice(0, 2).map((feature) => (
              <Card key={feature.title} className="flex flex-col h-full hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${feature.bg} flex items-center justify-center mb-4`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription className="text-base pt-2">{feature.description}</CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto pt-6">
                  <Link href={feature.href} className={buttonVariants({ variant: "ghost", className: "w-full justify-between" })}>
                    Explore {feature.title} <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:col-span-3">
            {features.slice(2, 5).map((feature) => (
              <Card key={feature.title} className="flex flex-col h-full hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${feature.bg} flex items-center justify-center mb-4`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription className="pt-2">{feature.description}</CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto pt-6">
                  <Link href={feature.href} className={buttonVariants({ variant: "ghost", className: "w-full justify-between" })}>
                    Explore <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
