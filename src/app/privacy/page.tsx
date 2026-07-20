import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'AkiliBrain Privacy Policy — how we collect, use, and protect your data. Covers cookies, Google AdSense advertising, GDPR/CCPA rights, and data retention.',
  alternates: {
    canonical: 'https://akilibrain.com/privacy',
  },
};

const LAST_UPDATED = 'July 2026';
const CONTACT_EMAIL = 'privacy@akilibrain.com';

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="space-y-10">

        {/* Header */}
        <section className="space-y-3">
          <p className="text-sm font-semibold tracking-widest text-primary/70 uppercase">
            Legal
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">
            Last updated: <span className="text-foreground font-medium">{LAST_UPDATED}</span>
          </p>
          <p className="text-muted-foreground leading-relaxed max-w-3xl">
            This Privacy Policy explains how AkiliBrain (&quot;we&quot;,
            &quot;our&quot;, or &quot;us&quot;) collects, uses, shares, and
            protects information when you visit{' '}
            <span className="text-foreground">akilibrain.com</span> or use
            any of our services. By using the platform you agree to the
            practices described here.
          </p>
        </section>

        {/* 1 — Information We Collect */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">1. Information We Collect</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-base">Account information</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                When you create an account we collect your email address and
                a hashed password. We do not store plaintext passwords.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-base">CV / résumé uploads</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If you upload a CV for our AI job-matching feature, we store
                the document and extract structured data (skills, experience,
                education) to power matching. Your CV is used solely for this
                purpose and is never sold, shared with employers without your
                explicit action, or used for advertising.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-base">Salary submissions</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                When you voluntarily submit salary data, we collect the
                information you provide (role, sector, country, compensation
                figure, and optionally years of experience). All submissions
                are immediately anonymised before storage. Individual
                responses are never displayed; only aggregated statistics
                are published.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-base">Usage data</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We collect standard web analytics including page views,
                session duration, referring URLs, browser type, and general
                geographic location (country/city level). This data is used
                to improve the platform and is not linked to your identity.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-base">Cookies</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We use cookies and similar tracking technologies. See
                Section 3 for full details.
              </p>
            </div>
          </div>
        </section>

        {/* 2 — How We Use Your Information */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">2. How We Use Your Information</h2>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside leading-relaxed">
            <li>To provide, maintain, and improve the AkiliBrain platform.</li>
            <li>To power AI-based job matching using your uploaded CV.</li>
            <li>To send transactional emails (password resets, account notices).</li>
            <li>To send optional product updates and newsletters — you can unsubscribe at any time.</li>
            <li>To aggregate salary submissions into anonymised benchmarks.</li>
            <li>To detect, prevent, and respond to fraud, abuse, or security incidents.</li>
            <li>To display interest-based advertising via Google AdSense (see Section 3).</li>
            <li>To comply with applicable law.</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We do not sell your personal information to third parties.
          </p>
        </section>

        {/* 3 — Cookies & Advertising */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">3. Cookies &amp; Advertising</h2>

          <div className="space-y-3">
            <h3 className="font-semibold text-base">Essential cookies</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Strictly necessary cookies enable core functionality such as
              session management and security. They cannot be disabled.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-base">Analytics cookies</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use PostHog to collect anonymised usage statistics that
              help us understand how the platform is used. No personally
              identifiable information is captured in analytics events.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-base">
              Advertising cookies — Google AdSense
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AkiliBrain displays advertisements served by{' '}
              <strong className="text-foreground">Google AdSense</strong>.
              Google and its advertising partners use cookies to serve ads
              based on your prior visits to this and other websites. Google
              may use the DoubleClick cookie to serve interest-based
              advertisements. You can opt out of personalised advertising by
              visiting{' '}
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline underline-offset-4"
              >
                Google&apos;s Ads Settings
              </a>
              {' '}or{' '}
              <a
                href="https://optout.aboutads.info/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline underline-offset-4"
              >
                aboutads.info
              </a>
              . For more information on how Google uses data when you visit
              our site, see{' '}
              <a
                href="https://policies.google.com/technologies/partner-sites"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline underline-offset-4"
              >
                Google&apos;s Privacy &amp; Terms
              </a>
              .
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Your choices:</strong> Most
            browsers allow you to control cookies through their settings. You
            can also use a browser extension to block advertising cookies.
            Note that disabling certain cookies may affect platform
            functionality.
          </div>
        </section>

        {/* 4 — Third-Party Services */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">4. Third-Party Services</h2>
          <p className="text-sm text-muted-foreground">
            We use the following third-party services to operate the
            platform. Each is governed by its own privacy policy.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 pr-4 font-semibold text-foreground w-1/3">Service</th>
                  <th className="text-left py-2 pr-4 font-semibold text-foreground w-1/3">Purpose</th>
                  <th className="text-left py-2 font-semibold text-foreground w-1/3">Data shared</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {[
                  { service: 'Google AdSense', purpose: 'Display advertising', data: 'IP address, cookie identifiers, browsing activity' },
                  { service: 'Vercel', purpose: 'Web hosting & CDN', data: 'Request logs, IP address' },
                  { service: 'Supabase / PostgreSQL', purpose: 'Database & authentication', data: 'Account data, stored content' },
                  { service: 'PostHog', purpose: 'Product analytics', data: 'Anonymised usage events' },
                ].map(({ service, purpose, data }) => (
                  <tr key={service} className="border-b border-white/5">
                    <td className="py-3 pr-4 font-medium text-foreground">{service}</td>
                    <td className="py-3 pr-4">{purpose}</td>
                    <td className="py-3">{data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 5 — Data Sharing */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">5. Data Sharing</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We do not sell, rent, or trade your personal information. We
            share data only in the following limited circumstances:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside leading-relaxed">
            <li>With service providers listed in Section 4 who process data on our behalf under data processing agreements.</li>
            <li>If required by law, court order, or governmental authority.</li>
            <li>To protect the safety, rights, or property of AkiliBrain, our users, or the public.</li>
            <li>In connection with a merger, acquisition, or sale of assets — in which case users will be notified.</li>
          </ul>
        </section>

        {/* 6 — Data Security */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">6. Data Security</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We implement industry-standard security measures including
            TLS encryption in transit, encrypted storage at rest, access
            controls, and regular security reviews. However, no method of
            transmission or storage is 100% secure. If you discover a
            vulnerability please contact{' '}
            <a
              href="mailto:security@akilibrain.com"
              className="text-primary hover:underline underline-offset-4"
            >
              security@akilibrain.com
            </a>
            .
          </p>
        </section>

        {/* 7 — Data Retention */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">7. Data Retention</h2>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside leading-relaxed">
            <li><strong className="text-foreground">Account data:</strong> Retained while your account is active, and for 90 days after deletion to allow recovery.</li>
            <li><strong className="text-foreground">CV uploads:</strong> Retained until you delete them or close your account.</li>
            <li><strong className="text-foreground">Salary submissions:</strong> Retained indefinitely in anonymised, aggregated form; the raw submission is deleted after aggregation.</li>
            <li><strong className="text-foreground">Analytics data:</strong> Retained for 24 months then purged.</li>
            <li><strong className="text-foreground">Server logs:</strong> Retained for 30 days.</li>
          </ul>
        </section>

        {/* 8 — Your Rights */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">8. Your Rights</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Depending on your location, you may have the following rights
            under GDPR, CCPA, or similar legislation:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { right: 'Access', detail: 'Request a copy of the personal data we hold about you.' },
              { right: 'Correction', detail: 'Ask us to correct inaccurate or incomplete data.' },
              { right: 'Deletion', detail: 'Request erasure of your personal data (the "right to be forgotten").' },
              { right: 'Portability', detail: 'Receive your data in a structured, machine-readable format.' },
              { right: 'Objection', detail: 'Object to processing based on legitimate interests, including profiling.' },
              { right: 'Opt-out (CCPA)', detail: 'California residents may opt out of the sale of personal information (we do not sell data).' },
            ].map(({ right, detail }) => (
              <div
                key={right}
                className="flex flex-col gap-1 p-3 rounded-lg border border-white/10 bg-white/5"
              >
                <span className="text-sm font-semibold">{right}</span>
                <span className="text-xs text-muted-foreground">{detail}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            To exercise any of these rights, email us at{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary hover:underline underline-offset-4"
            >
              {CONTACT_EMAIL}
            </a>
            . We will respond within 30 days.
          </p>
        </section>

        {/* 9 — Children's Privacy */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">9. Children&apos;s Privacy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            AkiliBrain is not directed at children under 13 years of age.
            We do not knowingly collect personal information from children.
            If you believe a child has provided us with personal data, please
            contact us and we will delete it promptly.
          </p>
        </section>

        {/* 10 — Changes */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">10. Changes to This Policy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may update this Privacy Policy periodically. The
            &quot;Last updated&quot; date at the top of this page will
            always reflect the most recent version. We will notify registered
            users by email of any material changes. Continued use of the
            platform after changes constitutes acceptance of the revised
            policy.
          </p>
        </section>

        {/* 11 — Contact */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">11. Contact</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For privacy-related enquiries, data access requests, or deletion
            requests, please contact:
          </p>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-sm">AkiliBrain — Data Privacy</span>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary text-sm hover:underline underline-offset-4"
            >
              {CONTACT_EMAIL}
            </a>
            <span className="text-xs text-muted-foreground">akilibrain.com</span>
          </div>
        </section>

        {/* Back links */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/" className="text-sm text-primary hover:underline underline-offset-4">
            ← Back to Home
          </Link>
          <Link href="/terms" className="text-sm text-primary hover:underline underline-offset-4">
            Terms of Service →
          </Link>
          <Link href="/contact" className="text-sm text-primary hover:underline underline-offset-4">
            Contact us →
          </Link>
        </div>

      </div>
    </div>
  );
}
