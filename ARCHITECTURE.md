# AkiliBrain Architecture Wiki

**Website:** [akilibrain.com](https://akilibrain.com)

AkiliBrain is a robust Next.js application that serves as a central intelligence aggregator for Jobs, Tenders, Salaries, Health Data, and Compliance across East Africa. This document serves as a "Code Wiki" to map the core systems.

## 1. Core Stack
- **Framework:** Next.js (App Router)
- **Database:** PostgreSQL (Supabase hosted on AWS eu-central-1) + Drizzle ORM
- **Automation/Background Jobs:** Inngest (cloud-hosted)
- **AI/LLM:** Vercel AI SDK v7 multi-provider router (`src/lib/ai/router.ts`). Providers are opt-in via API keys (Gemini, Groq, Mistral, OpenRouter, Cerebras, …) — there are no keyless/anonymous endpoints. Request handlers call it with `{ interactive: true }` (3 attempts, 25s, fail fast with `AiUnavailableError`); background jobs use the default patient mode (20 attempts, bounded waiting). Only provider faults (auth/quota/5xx/network) put a key on cooldown.
- **Styling:** Tailwind CSS + Shadcn UI
- **Scraping:** Custom `cheerio` scrapers + AI-powered extraction (`broad-search-engine.ts`)
- **Scraper Sidecar:** Python stealth scraper on Render (`akilihub-scraper.onrender.com`). Requires `X-Sidecar-Key` (`SIDECAR_API_KEY`) on every endpoint except `/health`, and rejects private/internal target URLs.

## 2. Hosting & Infrastructure

### Production Stack (Linode)
- **Server:** Linode VPS (address kept private)
- **App Directory:** `/opt/akilibrain`
- **Docker Compose:** `docker-compose.prod.yml`
  - `akilibrain-web-1` — Next.js standalone (port 3000, internal)
  - `akilibrain-nginx-1` — Nginx reverse proxy (port 80, public)
- **DNS & TLS:** Cloudflare (Always Use HTTPS) → Nginx → Next.js
  - Cloudflare handles TLS termination; no cert needed on the server
- **Deployment:** `git pull origin main` → `docker compose -f docker-compose.prod.yml up -d --build web`
  - The image builds with `NEXT_OUTPUT=standalone` (see `next.config.ts`); nginx only starts routing once `web` is healthy (`/api/health`, which returns 503 if the DB is unreachable).
  - Configuration is injected with `env_file: .env`, so every variable in `.env.example` reaches the container (the old hand-maintained whitelist dropped several required secrets).
  - nginx trusts `CF-Connecting-IP` only from Cloudflare's ranges (`set_real_ip_from`), overwrites `X-Forwarded-For`, and rate-limits per client.

### Key Management
| Variable | Source |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Supabase pooler (AWS eu-central-1) |
| `INNGEST_EVENT_KEY` | Inngest cloud dashboard → Environment keys |
| `INNGEST_SIGNING_KEY` | Inngest cloud dashboard → Environment keys |
| `SERPER_API_KEY` | Serper.dev |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI Studio |
| `NEXT_PUBLIC_APP_URL` | `https://akilibrain.com` |

### Known Operational Issues
- Disk usage reaches 96%+ on the 25G Linode disk — prune Docker images regularly: `docker system prune -af`
- `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` must be explicitly set in `/opt/akilibrain/.env` — they are not auto-populated
- DB queries show `safeQuery timed out after 25000ms` when Supabase pooler is cold — these self-recover

## 3. Scraping Architecture
Akilihub relies on an extensive, multi-country scraping pipeline powered by Inngest.

### A. Jobs Scraper (`src/inngest/scrape-jobs.ts`)
- **Strategy:** Runs daily for 9 East African countries (Kenya, Tanzania, Uganda, Rwanda, Ethiopia, DRC, Burundi, Somalia, South Sudan).
- **Extraction:** Uses Google Serper API to find job links via complex search queries (e.g. `ajira mpya Tanzania 2026`).
- **Extraction:** Pages go to `extractJobsWithAI` (`src/lib/scrapers/broad-search-engine.ts`): JSON-LD first, otherwise *DOM clustering* (`dom-cluster.ts`) — pages with the same structural fingerprint share one **declarative CSS-selector spec**, generated once by an LLM, validated with zod (`parser-spec.ts`) and cached in the `scraper_parsers` table. The model never writes code and nothing is executed or committed (the old `parsers/*.js` + `node:vm` design was removed).
- **Outbound fetches:** anything derived from scraped data is fetched with `safeFetch` (`src/lib/security/safe-fetch.ts`).
- **Strict Employer Resolution:** When a job is sourced from an aggregator (e.g., ReliefWeb, BrighterMonday), the pipeline synchronously runs `resolveEmployerUrl` (`src/lib/sources/employer-resolver.ts`) to bypass the aggregator and find the direct Applicant Tracking System (ATS) link.

### B. Tenders Scraper (`src/inngest/scrape-tenders.ts`)
- Targets official government procurement portals across the region (e.g. PPRA Kenya, PPDA Uganda, ARMP DRC).
- Normalizes massive datasets of government procurement notices into the `tenders` table.

### C. Compliance & Health
- `scrape-compliance.ts` aggregates legal and regulatory updates.
- `sync-health-data.ts` integrates with WHO GHO and DHIS2 data sources.

## 4. Database Schema
Located in `src/lib/db/schema/`. 
- **`jobs.ts`:** Tracks job postings, salaries, locations, and employer links. Includes a `needsAiExtraction` fallback flag if Gemini APIs are overloaded.
- **`tenders.ts`:** Tracks public sector procurement, deadlines, and direct document links. Includes an `aiSummary` field generated by the Tender Summarizer.
- **`shared.ts`:** Core tables for `countries`, `regions`, and taxonomies.

## 5. Key Systems
- **Tender Summarizer (`src/inngest/tender-summarizer.ts`):** Daily background job that downloads tender PDFs (SSRF-safe, size-capped), extracts text with `pdf-parse` v2 (`src/lib/pdf.ts`), and asks the AI router for a structured summary (eligibility, deadlines, documents needed).
- **WhatsApp Broadcast (`src/inngest/whatsapp-broadcast.ts`):** Daily cron job at 9:00 AM EAT that blasts the top 10 new jobs and 5 tenders to the official WhatsApp Channel using the Meta Graph API.
- **RSS Feed (`src/app/feed.xml/route.ts`):** Dynamically generated XML feed serving the latest opportunities for passive subscribers.
- **Admin Moderation (`src/app/admin/resolve/page.tsx`):** A manual resolution queue for fixing aggregator links that the automated resolver failed to catch.

## 6. Inngest Job Registry
All background jobs are registered in `src/app/api/inngest/route.ts`. If you add a new scraper or cron job, you **must** import and expose it in this file.
Every AI-spending job checks `scrapersDisabled()` (`SCRAPE_DISABLED=true`) first — that is the kill switch. Bulk email jobs send through `sendBulk` (`src/lib/email/bulk.ts`), which renders per chunk inside one step and adds `List-Unsubscribe` headers.

## 7. Security & privacy features (map)
| Concern | Where |
|---|---|
| Admin auth (password + TOTP, JWT cookie, encrypted TOTP secret, setup token) | `src/app/api/admin/*`, `src/lib/admin/*` |
| Authorizing pages / Server Actions | `src/lib/admin/require-admin.ts` |
| Rate limiting (Upstash + in-memory fallback, trustworthy client IP) | `src/lib/security/rate-limit.ts`, `src/middleware.ts` |
| SSRF-safe fetching / URL classification | `src/lib/security/safe-fetch.ts`, `safe-url.ts` |
| JSON-LD XSS protection | `src/components/seo/serialize.ts` |
| Anonymous CV ownership, 30-day retention, deletion | `src/lib/cv-session.ts`, `src/app/api/upload-cv`, `src/inngest/purge-expired-documents.ts` |
| Newsletter double opt-in, unsubscribe (POST-only mutation) | `src/app/api/subscribe`, `src/app/subscribe/confirm`, `src/app/unsubscribe` |
| Account export / deletion | `src/app/api/account/export`, `src/app/account/actions.ts` |
| Cookie consent gating analytics/ads | `src/components/consent/*` |
