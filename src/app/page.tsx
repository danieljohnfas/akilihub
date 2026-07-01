import Link from "next/link";
import { FileText, ShieldCheck, Activity, Banknote, Code, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    title: "Procurement Intelligence",
    description: "Search and apply for government tenders across East Africa.",
    icon: FileText,
    href: "/tenders",
    cpm: "$18-40 CPM",
    color: "text-blue-500",
    bg: "bg-blue-500/10"
  },
  {
    title: "Business Compliance",
    description: "Permits, licenses, and legal requirements for your business type.",
    icon: ShieldCheck,
    href: "/compliance",
    cpm: "$30-80 CPM",
    color: "text-purple-500",
    bg: "bg-purple-500/10"
  },
  {
    title: "Health Data Explorer",
    description: "Interactive dashboards and trends from DHIS2 and WHO data.",
    icon: Activity,
    href: "/health-data",
    cpm: "$8-22 CPM",
    color: "text-teal-500",
    bg: "bg-teal-500/10"
  },
  {
    title: "Salary Intelligence",
    description: "Crowdsourced compensation data to negotiate better offers.",
    icon: Banknote,
    href: "/salaries",
    cpm: "$12-30 CPM",
    color: "text-green-500",
    bg: "bg-green-500/10"
  },
  {
    title: "Developer Toolbox",
    description: "Free DHIS2, FHIR, HL7, and ICD-11 tools for health IT pros.",
    icon: Code,
    href: "/tools",
    cpm: "$10-25 CPM",
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
          East Africa's Professional <span className="text-primary">Intelligence Platform</span>
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
                  <CardTitle className="flex justify-between items-start">
                    {feature.title}
                    <Badge variant="secondary" className="font-normal text-xs">{feature.cpm}</Badge>
                  </CardTitle>
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
                  <CardTitle className="flex flex-col gap-2">
                    <span>{feature.title}</span>
                    <Badge variant="secondary" className="w-fit font-normal text-xs">{feature.cpm}</Badge>
                  </CardTitle>
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

      {/* CTA Section */}
      <section className="container mx-auto px-4 max-w-2xl text-center space-y-6 bg-muted/30 p-12 rounded-3xl border">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Get actionable alerts</h2>
          <p className="text-muted-foreground">
            Sign up to receive personalized notifications for new tenders, compliance updates, and salary shifts.
          </p>
        </div>
        <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <Input type="email" placeholder="Enter your email" required className="flex-1" />
          <Button type="submit">Subscribe</Button>
        </form>
        <p className="text-xs text-muted-foreground mt-4">
          No spam. Unsubscribe at any time.
        </p>
      </section>
    </div>
  );
}
