# Security & operations

Report vulnerabilities to **security@akilibrain.com**. Please do not open public issues for them.

## Required configuration (production)

The full list is in [`.env.example`](.env.example). The ones that matter for security:

| Variable | Purpose |
|---|---|
| `ADMIN_SESSION_SECRET` | **Required.** Signs admin session JWTs; admin login throws without it. |
| `ADMIN_TOTP_ENCRYPTION_KEY` | Recommended. Encrypts the admin TOTP secret at rest (AES-256-GCM). Falls back to `ADMIN_SESSION_SECRET`. Losing/rotating it locks the admin out until the admin row is reset. |
| `ADMIN_SETUP_TOKEN` | One-time token required by `/admin/setup`. **Setup is disabled in production while it is unset** — set it, run setup, then unset it. |
| `SIDECAR_API_KEY` | Shared secret between the app and the scraper sidecar. The sidecar refuses all requests (except `/health`) without it. |
| `CRON_SECRET`, `SCRAPE_TRIGGER_SECRET`, `CLEANUP_TRIGGER_SECRET` | Secrets for automation endpoints. Send them as `Authorization: Bearer <secret>`; `?secret=` still works but is deprecated (it ends up in access logs). |
| `EMAIL_TOKEN_SECRET` | Signs newsletter confirmation links (falls back to `ADMIN_SESSION_SECRET`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; used to delete auth users on "Delete account". Never expose to the browser. |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Shared rate limiting. Without them a per-instance in-memory limiter is used. |
| `SCRAPE_DISABLED=true` | **Kill switch** for every AI-spending background job (scrapers, enrichment, cleanup, summaries, guides). |
| `ADMIN_REPORT_EMAIL` / `ADMIN_EMAIL` | Recipients of status / alert emails. |

## Security model (what to keep true)

1. **Authorize where the work happens.** `middleware.ts` only redirects browsers; it is not a boundary
   (Next.js has had middleware-bypass CVEs). Every admin page, route handler and **Server Action**
   checks the session itself (`src/lib/admin/require-admin.ts`). Server Actions are public endpoints
   callable by id from any route.
2. **Untrusted URLs** (scraped, model-produced, user-supplied) go through `safeFetch` — it validates the
   address at connect time, re-checks redirects and caps body size. `assertPublicHttpUrl` alone is only a
   syntactic check.
3. **Untrusted text in prompts** is fenced (`<<<…>>>`) and never allowed to change instructions; model
   output is validated with zod. Model-written **code is never executed**.
4. **Output encoding.** JSON-LD is serialised with `serializeJsonLd` (escapes `<`); HTML from the web or an
   LLM is sanitised before `dangerouslySetInnerHTML`.
5. **Rate limits** use `clientIpFromHeaders` (trusts `X-Real-IP` set by our nginx, never the left-most
   `X-Forwarded-For`) with Upstash + an in-memory fallback. Add `enforceRateLimit` to any new public or
   AI/email-sending endpoint.
6. **Redirects** (`/api/out`) only go to URLs stored on the referenced record.
7. **Consent & email.** Bulk mail only goes to `users.email_updates = true`, always with
   `List-Unsubscribe` headers (`sendBulk`). Newsletter signup is double opt-in. Non-essential tracking
   (Clarity, PostHog, personalised ads) loads only after the visitor accepts.
8. **Data minimisation.** Anonymous CV uploads are bound to an httpOnly cookie and deleted after 30 days;
   users can export or delete their account data from `/account`.
9. **Least privilege in CI.** Scheduled scraper workflows have `contents: read` and never push to `main`.

## Incident response: leaked credential

Deleting a file on `main` is **not** enough. Rotate the credential first, then purge history:

1. Rotate (Supabase DB password, API keys, `ADMIN_SESSION_SECRET` — which also logs out all admins).
2. Purge the secret from git history (`git filter-repo` / BFG) and force-push, then have collaborators re-clone.
3. Review provider logs for use of the leaked value.

## Known limitations

- `npm audit` reports 2 remaining production findings (PostCSS bundled inside Next, and a Next
  advisory) that are only fixed by a **Next 16 major upgrade**.
- The Content-Security-Policy ships in **report-only** mode (`Content-Security-Policy-Report-Only`, violations logged by `/api/csp-report`). Watch the logs for `[csp-report]` lines after a deploy, tune `next.config.ts`, then set `CSP_ENFORCE=1`. It still needs `'unsafe-inline'` for scripts (Next hydration + ad/analytics snippets); per-request nonces are the follow-up.
- The admin TOTP replay guard is per-process; run a single instance or move it to Redis if you scale out.
- The sidecar's headless browsers follow redirects internally: the initial URL is validated, but
  redirect-based SSRF from inside the browser is not blocked at the network level.
