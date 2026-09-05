# Security & ops env (post-hardening)

Set these on the VPS / hosting env:

- `ADMIN_SESSION_SECRET` — required in production
- `SCRAPE_TRIGGER_SECRET` — mass scrape HTTP trigger
- `CLEANUP_TRIGGER_SECRET` — cleanup HTTP trigger
- `CRON_SECRET` — Bearer token for cron-style admin GETs
- `ADMIN_REPORT_EMAIL` — recipient for status emails
- `SCRAPE_DISABLED=true` — kill switch for job scrapers
- `SCRAPE_JOB_TARGET` — min inserts before skipping pass 2 (default 200)
- `SCRAPE_JOB_SECOND_PASS=0` — disable expensive second pass
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — rate limits

After any secret leak: rotate credentials and purge git history; deleting files on main is not enough.
