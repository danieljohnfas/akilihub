# AkiliHub — Scrapling Sidecar

A Python microservice that provides stealth web scraping for AkiliHub's
government procurement portal pipeline. Built with
[Scrapling](https://github.com/D4Vinci/Scrapling) + FastAPI.

## Why it exists

Government procurement portals in East Africa (PPRA Tanzania, PPOA Kenya, etc.)
increasingly use **JavaScript-rendered tables** and **Cloudflare protection**.
The existing TypeScript stack can't handle these cases without paying per-page to
Firecrawl. This sidecar solves it with a local headless browser at zero API cost.

## Key Features

| Feature | How |
|---|---|
| Cloudflare bypass | `StealthyFetcher` with `solve_cloudflare=True` |
| Adaptive selectors | `auto_save=True` — element signatures survive page redesigns |
| Multi-page crawl | `Spider` class with concurrent requests |
| **Pause / Resume** | `crawldir` checkpoint — Ctrl-C then restart to continue |
| robots.txt compliance | Checked before every fetch; cached 24 h per domain |

## Project Structure

```
scraper/
├── main.py              # FastAPI app — POST /scrape endpoint
├── selectors.py         # CSS selectors for each procurement portal
├── fetchers/
│   └── stealthy.py      # Single-page StealthyFetcher wrapper
├── spiders/
│   └── tenders.py       # Multi-page Spider (pause/resume)
├── requirements.txt
├── Dockerfile
└── .dockerignore
```

## Running Locally (without Docker)

```bash
cd scraper
pip install -r requirements.txt
python -m playwright install chromium   # one-time browser install
uvicorn main:app --port 8001 --reload
```

Health check: `curl http://localhost:8001/health`

## Running with Docker Compose

```bash
# From the project root
docker compose up scrapling
```

The `web` service will automatically use `http://scrapling:8001` via the
`SCRAPLING_URL` env var already set in `docker-compose.yml`.

## API

### `POST /scrape`

```json
{
  "url": "https://www.ppra.go.tz/tenders",
  "portal_type": "ppra_tz",
  "use_stealth": true,
  "max_pages": 1
}
```

**Response:**
```json
{
  "success": true,
  "portal_type": "ppra_tz",
  "url": "https://...",
  "tenders": [
    {
      "title": "Supply of Medical Equipment",
      "reference_no": "TZ-MED-2026-001",
      "contracting_authority": "Ministry of Health",
      "deadline": "2026-08-15T00:00:00+00:00",
      "source_url": "https://..."
    }
  ],
  "count": 12,
  "robots_allowed": true,
  "duration_ms": 4200
}
```

### Portal Types

| `portal_type` | Country | Portal |
|---|---|---|
| `ppra_tz` | Tanzania | ppra.go.tz |
| `ppoa_ke` | Kenya | tenders.go.ke |
| `ppda_ug` | Uganda | gpp.ppda.go.ug |
| `rppa_rw` | Rwanda | rppa.gov.rw |
| `pppa_et` | Ethiopia | pppa.gov.et |
| `armp_cd` | DRC | armp.cd |
| `generic` | Any | Heuristic extraction |

## Pause / Resume for Large Crawls

```bash
# Start a multi-page crawl
curl -X POST http://localhost:8001/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://tenders.go.ke/tenders","portal_type":"ppoa_ke","max_pages":50,"crawl_dir":"/app/crawl_data/ppoa_ke"}'

# Press Ctrl-C to pause at any time.
# Re-send the exact same request to resume from the last checkpoint.
```

## Adding a New Portal

1. Add the CSS selectors to `selectors.py`:
   ```python
   "new_portal": {
       "row":       "table tr:not(:first-child)",
       "ref":       "td:nth-child(1)",
       "title":     "td:nth-child(2)",
       "authority": "td:nth-child(3)",
       "deadline":  "td:nth-child(4)",
   }
   ```

2. Mirror the same selectors in `src/lib/strategies/scraper-strategies.ts`
   (`PORTAL_SELECTORS`).

3. Add the portal to the `PORTALS` array in `src/inngest/scrape-tenders.ts`.

## Ethics & Compliance

- `robots.txt` is checked and cached before every fetch.
- `download_delay = 1.5s` is enforced between requests in Spider mode.
- All target portals are public government procurement sites whose data is
  explicitly meant to be accessed by the public.
