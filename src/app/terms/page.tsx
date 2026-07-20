import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'AkiliBrain Terms of Service — your rights and responsibilities when using our platform. Covers intellectual property, user-generated content, disclaimers, and governing law.',
  alternates: {
    canonical: 'https://akilibrain.com/terms',
  },
};

const LAST_UPDATED = 'July 2026';

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="space-y-10">

        {/* Header */}
        <section className="space-y-3">
          <p className="text-sm font-semibold tracking-widest text-primary/70 uppercase">
            Legal
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight">
            Terms of Service
          </h1>
          <p className="text-muted-foreground">
            Last updated:{' '}
            <span className="text-foreground font-medium">{LAST_UPDATED}</span>
          </p>
          <p className="text-muted-foreground leading-relaxed max-w-3xl">
            Please read these Terms of Service (&quot;Terms&quot;) carefully
            before using{' '}
            <span className="text-foreground">akilibrain.com</span> or any
            AkiliBrain service. By accessing or using the platform you agree
            to be bound by these Terms. If you do not agree, do not use the
            platform.
          </p>
        </section>

        {/* 1 — Acceptance */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">1. Acceptance of Terms</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            These Terms constitute a legally binding agreement between you
            (the &quot;User&quot;) and AkiliBrain (&quot;we&quot;,
            &quot;our&quot;, or &quot;us&quot;). You may not use the platform
            if you are under 13 years of age. By creating an account or
            accessing any feature, you represent that you have the legal
            capacity to enter into this agreement. If you are using the
            platform on behalf of an organisation, you represent that you
            have authority to bind that organisation to these Terms.
          </p>
        </section>

        {/* 2 — Use of Service */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">2. Use of the Service</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            AkiliBrain grants you a limited, non-exclusive, non-transferable,
            revocable licence to access and use the platform for your
            personal or internal business purposes in accordance with these
            Terms. The platform aggregates publicly available data from
            government sources and community submissions to provide
            intelligence on tenders, jobs, compliance, health data, and
            salaries across East Africa.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Access to certain features (job matching, salary benchmarks,
            developer API) may require registration and/or a subscription.
            Free-tier usage may include display advertising served by
            Google AdSense.
          </p>
        </section>

        {/* 3 — Intellectual Property */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">3. Intellectual Property</h2>

          <div className="space-y-3">
            <h3 className="font-semibold text-base">Platform and code</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The AkiliBrain platform, including its software, design,
              trade marks, and original content, is owned by or licensed to
              AkiliBrain. You may not copy, reproduce, distribute, modify,
              create derivative works of, or reverse-engineer any part of the
              platform without our prior written permission.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-base">Aggregated data</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The structured, normalised, and enriched datasets produced by
              our data pipelines — including tender listings, job records,
              compliance requirement summaries, and health indicator
              aggregations — are proprietary to AkiliBrain. Underlying raw
              data sourced from government portals remains the property of the
              respective authorities. We do not claim ownership of underlying
              government data.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-base">API usage</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Use of the AkiliBrain Developer API is subject to the API
              Terms of Service published in the Developer documentation.
              Unauthorised scraping, bulk extraction, or mirroring of
              platform data outside the API is prohibited.
            </p>
          </div>
        </section>

        {/* 4 — User-Generated Content */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">4. User-Generated Content</h2>

          <div className="space-y-3">
            <h3 className="font-semibold text-base">Salary submissions</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you submit salary data, you grant AkiliBrain a perpetual,
              worldwide, royalty-free licence to use, store, aggregate, and
              publish that data in anonymised form for the purposes of
              providing salary benchmarks. You warrant that the information
              you submit is accurate to the best of your knowledge and does
              not violate any confidentiality obligation you owe to a
              third party.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-base">CV uploads</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You retain ownership of your CV. By uploading it you grant
              AkiliBrain a limited licence to process, parse, and analyse its
              contents solely for the purpose of providing AI-powered job
              matching to you. We will not share your CV with any employer or
              third party without your explicit action (e.g. clicking
              &quot;apply&quot;). You may delete your CV from the platform at
              any time through your account settings.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-base">Content standards</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You agree not to submit content that is false, misleading,
              defamatory, infringing, obscene, or otherwise unlawful. We
              reserve the right to remove any content that violates these
              standards or these Terms.
            </p>
          </div>
        </section>

        {/* 5 — Prohibited Conduct */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">5. Prohibited Conduct</h2>
          <p className="text-sm text-muted-foreground">
            You agree not to:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside leading-relaxed">
            <li>Use the platform for any unlawful purpose or in violation of any applicable law or regulation.</li>
            <li>Scrape, spider, crawl, or otherwise extract data from the platform except via the authorised API.</li>
            <li>Attempt to gain unauthorised access to any part of the platform, our systems, or other users&apos; accounts.</li>
            <li>Introduce viruses, malware, or other harmful code.</li>
            <li>Impersonate any person or entity or misrepresent your affiliation.</li>
            <li>Use the platform to send spam, unsolicited commercial messages, or to harvest email addresses.</li>
            <li>Interfere with or disrupt the integrity or performance of the platform.</li>
            <li>Circumvent or attempt to circumvent any access controls, rate limits, or authentication mechanisms.</li>
            <li>Resell or sub-licence access to the platform or its data without our written permission.</li>
          </ul>
        </section>

        {/* 6 — Disclaimers */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">6. Disclaimers</h2>

          <div className="space-y-3">
            <h3 className="font-semibold text-base">Data accuracy</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AkiliBrain aggregates data from third-party government portals,
              international bodies, and community submissions. While we make
              every reasonable effort to ensure accuracy and timeliness, we
              cannot guarantee that all information is complete, current, or
              error-free. Tender deadlines, compliance requirements, and
              regulatory rules change frequently. You should always verify
              critical information directly with the originating authority
              before acting on it.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-base">No professional advice</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nothing on the platform constitutes legal, financial, tax, or
              professional advice. You should consult a qualified professional
              for guidance specific to your situation.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-base">Independence</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AkiliBrain is an independent platform and is not affiliated
              with, endorsed by, or acting on behalf of any government body,
              regulatory authority, or international organisation referenced
              on the site.
            </p>
          </div>

          <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-muted-foreground">
            <strong className="text-amber-400">AS-IS service:</strong> The
            platform is provided &quot;as is&quot; and &quot;as
            available&quot; without warranties of any kind, either express
            or implied, including but not limited to merchantability, fitness
            for a particular purpose, or non-infringement.
          </div>
        </section>

        {/* 7 — Limitation of Liability */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">7. Limitation of Liability</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            To the fullest extent permitted by applicable law, AkiliBrain
            and its officers, employees, agents, and licensors shall not be
            liable for any indirect, incidental, special, consequential, or
            punitive damages, including but not limited to loss of profits,
            data, goodwill, or business interruption, arising out of or
            relating to your use of — or inability to use — the platform,
            even if we have been advised of the possibility of such damages.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            In no event shall our total liability to you for all claims
            arising out of or relating to these Terms or the platform exceed
            the greater of (a) the amount you paid us in the twelve months
            preceding the claim, or (b) USD 100.
          </p>
        </section>

        {/* 8 — Indemnification */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">8. Indemnification</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You agree to indemnify, defend, and hold harmless AkiliBrain and
            its affiliates, officers, employees, and agents from and against
            any claims, liabilities, damages, losses, and expenses (including
            reasonable legal fees) arising out of or in any way connected
            with your use of the platform, your violation of these Terms, or
            your violation of any rights of another person.
          </p>
        </section>

        {/* 9 — Governing Law */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">9. Governing Law &amp; Dispute Resolution</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            These Terms are governed by and construed in accordance with the
            laws of the United Republic of Tanzania, without regard to its
            conflict of law provisions. Any dispute arising out of or in
            connection with these Terms shall first be attempted to be
            resolved through good-faith negotiation. If negotiation fails,
            disputes shall be submitted to the competent courts of Dar es
            Salaam, Tanzania.
          </p>
        </section>

        {/* 10 — Changes to Terms */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">10. Changes to These Terms</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We reserve the right to modify these Terms at any time. We will
            notify registered users by email of material changes and update
            the &quot;Last updated&quot; date. Your continued use of the
            platform after changes take effect constitutes your acceptance
            of the revised Terms. If you do not agree with the changes, you
            must stop using the platform and may close your account.
          </p>
        </section>

        {/* 11 — Contact */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">11. Contact</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Questions about these Terms? Contact us at:
          </p>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-sm">AkiliBrain — Legal</span>
            <a
              href="mailto:info@akilibrain.com"
              className="text-primary text-sm hover:underline underline-offset-4"
            >
              info@akilibrain.com
            </a>
            <span className="text-xs text-muted-foreground">akilibrain.com</span>
          </div>
        </section>

        {/* Back links */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/" className="text-sm text-primary hover:underline underline-offset-4">
            ← Back to Home
          </Link>
          <Link href="/privacy" className="text-sm text-primary hover:underline underline-offset-4">
            Privacy Policy →
          </Link>
          <Link href="/contact" className="text-sm text-primary hover:underline underline-offset-4">
            Contact us →
          </Link>
        </div>

      </div>
    </div>
  );
}
