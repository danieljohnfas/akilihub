import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Mail,
  Shield,
  Handshake,
  Bug,
  Clock,
  Globe,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with the AkiliBrain team. General enquiries, data/privacy requests, partnership opportunities, and bug reports. We typically respond within 2 business days.',
  alternates: {
    canonical: 'https://akilibrain.com/contact',
  },
};

const contacts = [
  {
    icon: Mail,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    borderColor: 'border-blue-400/20',
    label: 'General Enquiries',
    description:
      'Questions about the platform, features, pricing, or anything else — this is your starting point.',
    email: 'info@akilibrain.com',
    href: 'mailto:info@akilibrain.com',
  },
  {
    icon: Shield,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    borderColor: 'border-purple-400/20',
    label: 'Data & Privacy Requests',
    description:
      'Requests to access, correct, or delete your personal data; questions about our Privacy Policy; GDPR or CCPA enquiries.',
    email: 'privacy@akilibrain.com',
    href: 'mailto:privacy@akilibrain.com',
  },
  {
    icon: Handshake,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    borderColor: 'border-amber-400/20',
    label: 'Partnerships & Employer Listings',
    description:
      'Interested in listing your organisation\'s opportunities, API partnerships, data licensing, or media enquiries.',
    email: 'partners@akilibrain.com',
    href: 'mailto:partners@akilibrain.com',
  },
  {
    icon: Bug,
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    borderColor: 'border-red-400/20',
    label: 'Bug Reports & Technical Issues',
    description:
      'Found something broken? Please include the page URL, what you expected to happen, and what actually happened.',
    email: 'support@akilibrain.com',
    href: 'mailto:support@akilibrain.com',
  },
];

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="space-y-10">

        {/* Header */}
        <section className="space-y-4">
          <p className="text-sm font-semibold tracking-widest text-primary/70 uppercase">
            Get in touch
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight">
            Contact AkiliBrain
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-2xl">
            We&apos;re a small team building infrastructure for East Africa&apos;s
            professional ecosystem. We read every message and aim to respond
            thoughtfully.
          </p>

          {/* Response time + timezone badges */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-primary/70" />
              Typically within 2 business days
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-muted-foreground">
              <Globe className="w-3.5 h-3.5 text-primary/70" />
              East Africa Time (EAT, UTC+3)
            </div>
          </div>
        </section>

        {/* Contact cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {contacts.map(({ icon: Icon, color, bg, borderColor, label, description, email, href }) => (
            <div
              key={label}
              className={`flex flex-col gap-4 p-6 rounded-xl border bg-white/5 hover:bg-white/[0.07] transition-colors ${borderColor}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="space-y-1 min-w-0">
                  <h2 className="font-semibold text-base leading-tight">{label}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
              <a
                href={href}
                className={`inline-flex items-center gap-2 text-sm font-medium ${color} hover:underline underline-offset-4 break-all`}
              >
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                {email}
              </a>
            </div>
          ))}
        </section>

        {/* Community / Social placeholder */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">Community &amp; Updates</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Follow AkiliBrain for platform updates, new data releases, and
            East African professional intelligence insights.
          </p>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'X / Twitter', href: '#' },
              { label: 'LinkedIn', href: '#' },
              { label: 'GitHub', href: '#' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-sm text-muted-foreground hover:text-foreground transition-all"
              >
                {label}
              </a>
            ))}
          </div>
        </section>

        {/* Security disclosure */}
        <section className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-5 space-y-2">
          <h2 className="font-semibold text-base text-amber-400">
            Security Vulnerability Disclosure
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you have discovered a security vulnerability, please do{' '}
            <strong className="text-foreground">not</strong> report it
            publicly. Email us directly at{' '}
            <a
              href="mailto:security@akilibrain.com"
              className="text-amber-400 hover:underline underline-offset-4"
            >
              security@akilibrain.com
            </a>{' '}
            with a description of the issue and we will respond within 48
            hours.
          </p>
        </section>

        {/* Back links */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/" className="text-sm text-primary hover:underline underline-offset-4">
            ← Back to Home
          </Link>
          <Link href="/about" className="text-sm text-primary hover:underline underline-offset-4">
            About AkiliBrain →
          </Link>
          <Link href="/privacy" className="text-sm text-primary hover:underline underline-offset-4">
            Privacy Policy →
          </Link>
          <Link href="/terms" className="text-sm text-primary hover:underline underline-offset-4">
            Terms of Service →
          </Link>
        </div>

      </div>
    </div>
  );
}
