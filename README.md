# AkiliBrain

East Africa's professional intelligence platform: jobs, government tenders, salaries, compliance
and health data for Kenya, Tanzania, Uganda, Rwanda, Ethiopia, DRC, Burundi, Somalia and South
Sudan — **[akilibrain.com](https://akilibrain.com)**.

Stack: Next.js 16 (App Router) · PostgreSQL (Supabase) + Drizzle ORM · Inngest background jobs ·
multi-provider AI router (Vercel AI SDK v7) · Python scraper sidecar · Tailwind + shadcn/ui.
See [ARCHITECTURE.md](ARCHITECTURE.md) for how the pieces fit together.

## Getting started

```bash
npm ci --legacy-peer-deps      # peer-dependency conflicts exist upstream; CI uses the same flags
cp .env.example .env.local     # then fill in the values you need (see the comments inside)
npm run dev                    # http://localhost:3000
```

You need at least `DATABASE_URL`, the `NEXT_PUBLIC_SUPABASE_*` values and one AI provider key to
exercise most features. The app starts without the rest; features that need a missing key degrade or
report that they are unavailable.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Standard Next.js commands |
| `npm run typecheck` | `tsc --noEmit` over `src/`, `e2e/` and config files (**must be clean; CI enforces it**) |
| `npm run lint` | ESLint (Next.js + TypeScript rules; CI enforces it) |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Playwright a11y/smoke suite. Uses `E2E_BASE_URL` (default `http://localhost:3000`) |

Before opening a PR: `npm run typecheck && npm run lint && npm test`.

## Database

Schema lives in `src/lib/db/schema/`; migrations in `drizzle/migrations/` (journal-tracked).

```bash
npx drizzle-kit generate --name=<what_changed>   # after editing the schema
npx drizzle-kit migrate                          # apply (uses DIRECT_URL, falls back to DATABASE_URL)
```

Every migration should be idempotent (`IF NOT EXISTS`) where practical — several environments were
created by hand before drizzle was adopted.

## Deployment

**Production (Linode + Docker + Cloudflare)**

```bash
cd /opt/akilibrain && git pull origin main
docker compose -f docker-compose.prod.yml up -d --build web
```

- All runtime configuration comes from `/opt/akilibrain/.env` (`env_file`), and compose refuses to
  start if `DATABASE_URL`, `ADMIN_SESSION_SECRET`, `INNGEST_EVENT_KEY` or `INNGEST_SIGNING_KEY` are missing.
- The image is built with `NEXT_OUTPUT=standalone`; a container healthcheck calls `/api/health`
  (503 when the database is unreachable).
- Vercel also works: leave `NEXT_OUTPUT` unset.

**Scraper sidecar (Render)** — `scraper/` is a FastAPI service. It refuses every request without the
shared key: set the same `SIDECAR_API_KEY` on Render, on the app and in the GitHub Actions secrets.

## Security & privacy

Read [SECURITY.md](SECURITY.md) before touching authentication, Server Actions, outbound fetches or
anything that handles CVs / emails. In short:

- Server Actions and route handlers must authorize themselves; the proxy (`src/proxy.ts`) is not a security boundary.
- Fetch scraped or user-supplied URLs only through `src/lib/security/safe-fetch.ts`.
- Never execute model-generated code; parsers are declarative JSON specs (`src/lib/scrapers/parser-spec.ts`).
- Marketing email must respect `users.email_updates` and carry unsubscribe headers (`src/lib/email/bulk.ts`).
