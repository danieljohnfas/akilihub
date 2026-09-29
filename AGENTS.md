# Notes for coding agents

- **Framework:** Next.js 15 (App Router, React 19) — pinned in `package.json`. The official docs are at
  <https://nextjs.org/docs>; there is no `node_modules/next/dist/docs/` directory in this version.
  Read release notes before upgrading (a Next 16 upgrade is pending for two audit findings).
- **AI SDK is v7:** tools use `inputSchema` (not `parameters`), step limits use `stopWhen: stepCountIs(n)`,
  token caps use `maxOutputTokens`, file parts use `mediaType`. Call models through
  `src/lib/ai/router.ts` and pass `{ interactive: true }` from request handlers.
- **Before you finish a change:** `npm run typecheck && npm run lint && npm test` must all pass.
- **Security rules** live in `SECURITY.md`. The ones agents most often break:
  Server Actions/route handlers authorize themselves; URLs from scraped or user data go through
  `safeFetch`; never execute model-written code; new public/AI/email endpoints need `enforceRateLimit`.
- **Database:** change `src/lib/db/schema/*`, then `npx drizzle-kit generate --name=…` and make the SQL
  idempotent. `safeQuery` swallows errors and returns `[]` — use `queryOrThrow` whenever "failed" must not
  look like "empty" (auth guards, health, anything that returns 404 on no rows).
- **Never commit** `.env*` (except `.env.example`), datasets, logs or ad-hoc DB scripts with connection strings.
