<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Notes for coding agents

- **Framework:** Next.js 16 (App Router, React 19, Turbopack builds). The request-interception file is
  `src/proxy.ts` (Next 16 renamed `middleware` → `proxy`; it runs on the Node.js runtime). Async Request APIs
  only: `await cookies()`, `await headers()`, `await params`, `await searchParams`.
- **AI SDK is v7:** tools use `inputSchema` (not `parameters`), step limits use `stopWhen: stepCountIs(n)`,
  token caps use `maxOutputTokens`, file parts use `mediaType`. Call models through
  `src/lib/ai/router.ts` and pass `{ interactive: true }` from request handlers.
- **Before you finish a change:** `npm run typecheck && npm run lint && npm test` must all pass.
  (`next build` no longer runs ESLint in Next 16, so CI runs it explicitly.)
- **Security rules** live in `SECURITY.md`. The ones agents most often break:
  Server Actions/route handlers authorize themselves; URLs from scraped or user data go through
  `safeFetch`; never execute model-written code; new public/AI/email endpoints need `enforceRateLimit`.
- **Database:** change `src/lib/db/schema/*`, then `npx drizzle-kit generate --name=…` and make the SQL
  idempotent. `safeQuery` swallows errors and returns `[]` — use `queryOrThrow` whenever "failed" must not
  look like "empty" (auth guards, health, anything that returns 404 on no rows).
- **Never commit** `.env*` (except `.env.example`), datasets, logs or ad-hoc DB scripts with connection strings.
