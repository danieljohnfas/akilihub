# AkiliHub Infrastructure & Self-Hosted Stack

AkiliHub is designed to be highly cost-efficient and independent of expensive SaaS vendor lock-in. To achieve this, we integrate deeply with several open-source, self-hosted tools.

## Our Open-Source Stack (The "SaaS Kill List")

1. **Scrapling** (Bypassing Bot Defenses)
   - *Replaces:* ScrapingBee, Firecrawl ($$)
   - *Implementation:* Built directly into our Python sidecar (`akilihub-scraper`). Uses adaptive logic to defeat Cloudflare/JS blockers natively.

2. **Twenty CRM** (B2B Employer Management)
   - *Replaces:* Salesforce, Hubspot ($150/user)
   - *Implementation:* Integration client at `src/lib/integrations/twenty-crm.ts`. Ready to pipe the 1,500+ scraped African companies directly into a local pipeline.

3. **OpenVoice** (Localized Text-to-Speech)
   - *Replaces:* ElevenLabs
   - *Implementation:* Integration client at `src/lib/integrations/openvoice.ts`. Allows us to provide voiceover accessibility for job postings using custom African voice reference audio.

4. **Documenso** (Digital Signatures)
   - *Replaces:* DocuSign
   - *Implementation:* Integration client at `src/lib/integrations/documenso.ts`. Pre-built to allow automated sending of B2B NDAs and contracts directly to scraped employers.

5. **Coolify** (PaaS Hosting)
   - *Replaces:* Vercel, Heroku, Render
   - *Implementation:* AkiliHub is designed to eventually migrate its frontend and sidecar off Render and onto a bare-metal Hetzner server orchestrated entirely by Coolify for unlimited deployments at a flat rate.

## Orchestration

You can view the setup for these tools in `docker-compose.selfhosted.yml`. They can be spun up simultaneously alongside the Next.js platform whenever you are ready to activate them in production.
