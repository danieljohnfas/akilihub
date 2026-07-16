"""
AkiliHub — Scrapling Sidecar
FastAPI microservice exposing a single POST /scrape endpoint.

The Next.js app calls this service instead of Crawl4AI. It uses Scrapling's
StealthyFetcher to bypass Cloudflare on government procurement portals and
returns structured JSON that the TypeScript ScraplingStrategy can insert into
Postgres.

Port: 8001
"""

from __future__ import annotations

import logging
import os
import time
import urllib.robotparser
from typing import Literal

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from spiders.tenders import TenderSpider
from fetchers.stealthy import stealthy_scrape, stealthy_fetch_html

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("scrapling-sidecar")

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AkiliHub Scrapling Sidecar",
    description="Stealth web scraping microservice for government procurement portals.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restricted to internal Docker network in prod
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ── Robots.txt cache  (TTL: 24 h) ────────────────────────────────────────────
_robots_cache: dict[str, tuple[urllib.robotparser.RobotFileParser, float]] = {}
ROBOTS_TTL = 86_400  # seconds


def _is_allowed(url: str) -> bool:
    """
    Check robots.txt before fetching. Returns True if scraping is allowed.
    Caches parser per domain for 24 hours.
    """
    from urllib.parse import urlparse

    parsed = urlparse(url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    robots_url = f"{origin}/robots.txt"

    now = time.time()
    cached = _robots_cache.get(origin)
    if cached and now - cached[1] < ROBOTS_TTL:
        rp = cached[0]
    else:
        rp = urllib.robotparser.RobotFileParser()
        rp.set_url(robots_url)
        try:
            rp.read()
        except Exception:
            # If robots.txt is unreachable, assume allowed (common on govt portals)
            logger.warning("Could not read robots.txt for %s — assuming allowed.", origin)
            return True
        _robots_cache[origin] = (rp, now)

    allowed = rp.can_fetch("*", url)
    if not allowed:
        logger.warning("robots.txt DISALLOWS scraping: %s", url)
    return allowed


# ── Request / Response models ─────────────────────────────────────────────────
PortalType = Literal[
    "ppra_tz",
    "ppoa_ke",
    "ppda_ug",
    "rppa_rw",
    "pppa_et",
    "armp_cd",
    "generic",
]


class ScrapeRequest(BaseModel):
    url: str
    portal_type: PortalType = "generic"
    use_stealth: bool = True       # StealthyFetcher vs plain Fetcher
    crawl_dir: str | None = None   # Path for pause/resume checkpoints (Spider mode)
    max_pages: int = 1             # Pages to crawl (1 = single-page fetch)


class TenderItem(BaseModel):
    title: str
    reference_no: str
    contracting_authority: str
    deadline: str
    source_url: str
    description: str | None = None
    published_date: str | None = None


class ScrapeResponse(BaseModel):
    success: bool
    portal_type: str
    url: str
    tenders: list[TenderItem]
    count: int
    robots_allowed: bool
    duration_ms: int
    error: str | None = None


class HtmlFetchRequest(BaseModel):
    url: str
    use_stealth: bool = True


class HtmlFetchResponse(BaseModel):
    success: bool
    url: str
    html: str
    robots_allowed: bool
    duration_ms: int
    error: str | None = None


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "scrapling-sidecar"}


@app.post("/scrape", response_model=ScrapeResponse)
async def scrape(req: ScrapeRequest):
    start = time.monotonic()
    logger.info("Scrape request: portal=%s url=%s", req.portal_type, req.url)

    # 1. robots.txt gate
    robots_allowed = _is_allowed(req.url)
    if not robots_allowed:
        raise HTTPException(
            status_code=403,
            detail=f"robots.txt disallows scraping {req.url}. Aborting.",
        )

    # 2. Dispatch to spider (multi-page) or single-page fetcher
    try:
        if req.max_pages > 1 and req.crawl_dir:
            tenders = await TenderSpider.run(
                start_url=req.url,
                portal_type=req.portal_type,
                max_pages=req.max_pages,
                crawl_dir=req.crawl_dir,
            )
        else:
            tenders = await stealthy_scrape(
                url=req.url,
                portal_type=req.portal_type,
                use_stealth=req.use_stealth,
            )
    except Exception as exc:
        logger.error("Scraping failed for %s: %s", req.url, exc, exc_info=True)
        duration = int((time.monotonic() - start) * 1000)
        return ScrapeResponse(
            success=False,
            portal_type=req.portal_type,
            url=req.url,
            tenders=[],
            count=0,
            robots_allowed=robots_allowed,
            duration_ms=duration,
            error=str(exc),
        )

    duration = int((time.monotonic() - start) * 1000)
    logger.info(
        "Done: %d tenders in %dms for %s", len(tenders), duration, req.url
    )

    return ScrapeResponse(
        success=True,
        portal_type=req.portal_type,
        url=req.url,
        tenders=tenders,
        count=len(tenders),
        robots_allowed=robots_allowed,
        duration_ms=duration,
    )


@app.post("/fetch_html", response_model=HtmlFetchResponse)
async def fetch_html(req: HtmlFetchRequest):
    start = time.monotonic()
    logger.info("HtmlFetch request: url=%s", req.url)

    robots_allowed = _is_allowed(req.url)
    if not robots_allowed:
        raise HTTPException(
            status_code=403,
            detail=f"robots.txt disallows scraping {req.url}. Aborting.",
        )

    try:
        html = await stealthy_fetch_html(url=req.url, use_stealth=req.use_stealth)
    except Exception as exc:
        logger.error("HtmlFetch failed for %s: %s", req.url, exc, exc_info=True)
        duration = int((time.monotonic() - start) * 1000)
        return HtmlFetchResponse(
            success=False,
            url=req.url,
            html="",
            robots_allowed=robots_allowed,
            duration_ms=duration,
            error=str(exc),
        )

    duration = int((time.monotonic() - start) * 1000)
    logger.info("Done: fetched %d bytes in %dms for %s", len(html), duration, req.url)

    return HtmlFetchResponse(
        success=True,
        url=req.url,
        html=html,
        robots_allowed=robots_allowed,
        duration_ms=duration,
    )
