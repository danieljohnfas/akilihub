import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Pricing - AkiliBrain',
  description: 'Choose the right plan for your AI data intelligence needs.',
};

export default function PricingPage() {
  return (
    <div className="container py-24 min-h-screen">
      <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="text-xl text-muted-foreground">
          Unlock the full power of AkiliBrain PRO and supercharge your data insights.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <Card className="bg-black/40 border-white/10 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-2xl">Basic</CardTitle>
            <CardDescription>Perfect for individuals and small projects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-4xl font-bold">Free</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Basic AI chat capabilities</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Access to public data sources</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Standard search features</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Link href="/signup" className="w-full">
              <Button variant="outline" className="w-full">
                Get Started
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="bg-gradient-to-b from-primary/20 to-black/40 border-primary/50 relative backdrop-blur-md shadow-2xl shadow-primary/10">
          <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
            <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Most Popular
            </span>
          </div>
          <CardHeader>
            <CardTitle className="text-2xl text-primary">PRO</CardTitle>
            <CardDescription>For professionals needing deep insights</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-4xl font-bold">$29<span className="text-lg text-muted-foreground font-normal">/mo</span></div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Unlimited historical data access</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Advanced AI analysis models</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Priority email support & custom alerts</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> API access</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full shadow-lg hover:shadow-primary/25 transition-all hover:scale-105" asChild>
              <Link href="/signup">Upgrade to PRO</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
