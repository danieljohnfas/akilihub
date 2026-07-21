"""
AkiliHub — Scrapling Sidecar  (v2)
FastAPI microservice exposing scraping, search, and text-extraction endpoints.

Endpoints:
  GET  /health          — liveness check
  POST /scrape          — fetch + extract tenders (Scrapling stealth)
  POST /fetch_html      — fetch raw rendered HTML
  POST /search          — DuckDuckGo search via ddgs (free, no API key)
  POST /extract_text    — extract clean text from HTML via trafilatura
  POST /crawl4ai        — structured CSS extraction via Crawl4AI

Port: 8001
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
import urllib.robotparser
from typing import Literal

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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
    description="Stealth web scraping, free search, and text extraction microservice.",
    version="2.0.0",
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
    "brela_tz",
    "generic",
]


class ScrapeRequest(BaseModel):
    url: str
    portal_type: PortalType = "generic"
    use_stealth: bool = True        # StealthyFetcher vs plain Fetcher
    use_camoufox: bool = False      # Use Firefox/camoufox as stealth engine
    crawl_dir: str | None = None    # Path for pause/resume checkpoints (Spider mode)
    max_pages: int = 1              # Pages to crawl (1 = single-page fetch)


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
    strategy_used: str = "scrapling"
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


# ── /search models ────────────────────────────────────────────────────────────
class SearchRequest(BaseModel):
    query: str
    max_results: int = 20
    region: str = "wt-wt"          # "ke-en", "tz-sw", "ug-en", etc.
    time_limit: str | None = None   # "d" (day), "w" (week), "m" (month)


class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str | None = None


class SearchResponse(BaseModel):
    success: bool
    query: str
    results: list[SearchResult]
    count: int
    source: str = "duckduckgo"
    error: str | None = None


# ── /extract_text models ──────────────────────────────────────────────────────
class ExtractTextRequest(BaseModel):
    url: str | None = None
    html: str | None = None         # Raw HTML (skips fetch if provided)
    include_tables: bool = True
    include_links: bool = True
    max_chars: int = 15_000


class ExtractTextResponse(BaseModel):
    success: bool
    url: str | None = None
    text: str
    pdf_links: list[str]            # PDF/doc URLs found on the page
    duration_ms: int
    error: str | None = None


# ── /crawl4ai models ──────────────────────────────────────────────────────────
class Crawl4AiRequest(BaseModel):
    url: str
    portal_type: PortalType = "generic"
    css_selector: str | None = None
    use_browser: bool = True        # False = httpx-based fetch (faster, no JS)


class Crawl4AiResponse(BaseModel):
    success: bool
    url: str
    tenders: list[TenderItem]
    count: int
    duration_ms: int
    error: str | None = None


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "scrapling-sidecar", "version": "2.0.0"}


# ── /scrape ───────────────────────────────────────────────────────────────────
@app.post("/scrape", response_model=ScrapeResponse)
async def scrape(req: ScrapeRequest):
    start = time.monotonic()
    logger.info("Scrape request: portal=%s url=%s", req.portal_type, req.url)

    robots_allowed = _is_allowed(req.url)
    if not robots_allowed:
        raise HTTPException(
            status_code=403,
            detail=f"robots.txt disallows scraping {req.url}. Aborting.",
        )

    strategy_used = "scrapling"
    try:
        if req.max_pages > 1 and req.crawl_dir:
            tenders = await TenderSpider.run(
                start_url=req.url,
                portal_type=req.portal_type,
                max_pages=req.max_pages,
                crawl_dir=req.crawl_dir,
            )
        elif req.use_camoufox:
            # Firefox-based stealth engine for hard targets
            from fetchers.camoufox_fetcher import camoufox_scrape
            tenders = await camoufox_scrape(
                url=req.url,
                portal_type=req.portal_type,
            )
            strategy_used = "camoufox"
        else:
            tenders = await stealthy_scrape(
                url=req.url,
                portal_type=req.portal_type,
                use_stealth=req.use_stealth,
            )

        # If Scrapling returned empty results and camoufox is not yet tried, retry with camoufox
        if not tenders and not req.use_camoufox and req.use_stealth:
            logger.info("Scrapling returned 0 results — retrying with camoufox.")
            try:
                from fetchers.camoufox_fetcher import camoufox_scrape
                tenders = await camoufox_scrape(url=req.url, portal_type=req.portal_type)
                strategy_used = "camoufox"
            except Exception as cf_exc:
                logger.warning("camoufox fallback also failed: %s", cf_exc)

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
            strategy_used=strategy_used,
            error=str(exc),
        )

    duration = int((time.monotonic() - start) * 1000)
    logger.info("Done: %d tenders in %dms for %s (strategy=%s)", len(tenders), duration, req.url, strategy_used)

    return ScrapeResponse(
        success=True,
        portal_type=req.portal_type,
        url=req.url,
        tenders=tenders,
        count=len(tenders),
        robots_allowed=robots_allowed,
        duration_ms=duration,
        strategy_used=strategy_used,
    )


# ── /fetch_html ───────────────────────────────────────────────────────────────
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


# ── /search  (DuckDuckGo via ddgs — free, no API key) ────────────────────────
@app.post("/search", response_model=SearchResponse)
async def search(req: SearchRequest):
    start = time.monotonic()
    logger.info("Search request: query=%r max_results=%d", req.query, req.max_results)

    try:
        from duckduckgo_search import DDGS

        # ddgs is synchronous — run in executor so we don't block the event loop
        loop = asyncio.get_event_loop()

        def _ddg_search():
            results = []
            with DDGS() as ddgs:
                for r in ddgs.text(
                    keywords=req.query,
                    region=req.region,
                    timelimit=req.time_limit,
                    max_results=req.max_results,
                ):
                    results.append(r)
            return results

        raw = await loop.run_in_executor(None, _ddg_search)

        items = [
            SearchResult(
                title=r.get("title", ""),
                url=r.get("href", ""),
                snippet=r.get("body"),
            )
            for r in raw
            if r.get("href")
        ]

        logger.info("DuckDuckGo returned %d results for %r", len(items), req.query)
        return SearchResponse(
            success=True,
            query=req.query,
            results=items,
            count=len(items),
            source="duckduckgo",
        )

    except Exception as exc:
        logger.error("Search failed for %r: %s", req.query, exc, exc_info=True)
        return SearchResponse(
            success=False,
            query=req.query,
            results=[],
            count=0,
            source="duckduckgo",
            error=str(exc),
        )


# ── /extract_text  (trafilatura — smart HTML → clean text) ───────────────────
@app.post("/extract_text", response_model=ExtractTextResponse)
async def extract_text(req: ExtractTextRequest):
    start = time.monotonic()
    logger.info("ExtractText request: url=%s html_len=%s", req.url, len(req.html or ""))

    try:
        import trafilatura
        from trafilatura.settings import use_config
        from urllib.parse import urljoin

        html_content = req.html

        # Fetch if HTML not provided
        if not html_content and req.url:
            robots_allowed = _is_allowed(req.url)
            if not robots_allowed:
                raise HTTPException(status_code=403, detail=f"robots.txt disallows: {req.url}")
            html_content = await stealthy_fetch_html(url=req.url, use_stealth=True)

        if not html_content:
            return ExtractTextResponse(
                success=False,
                url=req.url,
                text="",
                pdf_links=[],
                duration_ms=int((time.monotonic() - start) * 1000),
                error="No HTML content available",
            )

        # Extract PDF / document links before trafilatura strips them
        pdf_links: list[str] = []
        try:
            from lxml import etree
            import io
            parser = etree.HTMLParser()
            tree = etree.parse(io.StringIO(html_content), parser)
            base = req.url or ""
            for a in tree.xpath("//a[@href]"):
                href: str = a.get("href", "")
                lower = href.lower()
                if any(lower.endswith(ext) for ext in (".pdf", ".doc", ".docx", ".xlsx", ".zip")):
                    full = urljoin(base, href) if not href.startswith("http") else href
                    pdf_links.append(full)
        except Exception as link_exc:
            logger.warning("PDF link extraction failed: %s", link_exc)

        # trafilatura extraction — handles multilingual pages, tables, links
        traf_config = use_config()
        traf_config.set("DEFAULT", "EXTRACTION_TIMEOUT", "30")

        extracted = trafilatura.extract(
            html_content,
            url=req.url,
            include_tables=req.include_tables,
            include_links=req.include_links,
            include_comments=False,
            no_fallback=False,
            favor_precision=False,
            favor_recall=True,      # Prefer more text on government list pages
            deduplicate=True,
            config=traf_config,
        ) or ""

        # Truncate to requested max
        if len(extracted) > req.max_chars:
            extracted = extracted[: req.max_chars]

        duration = int((time.monotonic() - start) * 1000)
        logger.info(
            "ExtractText done: %d chars, %d PDF links in %dms for %s",
            len(extracted), len(pdf_links), duration, req.url,
        )

        return ExtractTextResponse(
            success=True,
            url=req.url,
            text=extracted,
            pdf_links=list(dict.fromkeys(pdf_links)),  # deduplicate, preserve order
            duration_ms=duration,
        )

    except Exception as exc:
        logger.error("ExtractText failed for %s: %s", req.url, exc, exc_info=True)
        return ExtractTextResponse(
            success=False,
            url=req.url,
            text="",
            pdf_links=[],
            duration_ms=int((time.monotonic() - start) * 1000),
            error=str(exc),
        )


# ── /crawl4ai  (Crawl4AI CSS extraction — structured, no LLM cost) ───────────
@app.post("/crawl4ai", response_model=Crawl4AiResponse)
async def crawl4ai_extract(req: Crawl4AiRequest):
    start = time.monotonic()
    logger.info("Crawl4AI request: portal=%s url=%s", req.portal_type, req.url)

    try:
        from crawl4ai import AsyncWebCrawler, CacheMode
        from crawl4ai.extraction_strategy import JsonCssExtractionStrategy
        from css_selectors import PORTAL_SELECTORS, FALLBACK_SELECTORS
        import json

        selectors = PORTAL_SELECTORS.get(req.portal_type, FALLBACK_SELECTORS)
        css_sel = req.css_selector or selectors.get("row", "table tr")

        # Build a simple schema from the portal selectors
        schema = {
            "name": f"{req.portal_type} tenders",
            "baseSelector": css_sel,
            "fields": [
                {"name": "ref",       "selector": selectors.get("ref", "td:first-child"),       "type": "text"},
                {"name": "title",     "selector": selectors.get("title", "td:nth-child(2)"),    "type": "text"},
                {"name": "authority", "selector": selectors.get("authority", "td:nth-child(3)"),"type": "text"},
                {"name": "deadline",  "selector": selectors.get("deadline", "td:last-child"),   "type": "text"},
            ],
        }

        strategy = JsonCssExtractionStrategy(schema, verbose=False)

        async with AsyncWebCrawler(verbose=False) as crawler:
            result = await crawler.arun(
                url=req.url,
                extraction_strategy=strategy,
                cache_mode=CacheMode.BYPASS,
                word_count_threshold=3,
            )

        if not result.success or not result.extracted_content:
            raise ValueError(f"Crawl4AI returned no content for {req.url}")

        raw_items = json.loads(result.extracted_content)
        from datetime import datetime, timedelta, timezone

        def _now_plus_days(d: int = 30) -> str:
            return (datetime.now(timezone.utc) + timedelta(days=d)).isoformat()

        tenders: list[TenderItem] = []
        for idx, item in enumerate(raw_items):
            title = (item.get("title") or "").strip()
            if not title or len(title) < 5:
                continue
            tenders.append(TenderItem(
                title=title[:500],
                reference_no=item.get("ref") or f"{req.portal_type.upper()}-C4A-{idx}",
                contracting_authority=item.get("authority") or "Government Authority",
                deadline=item.get("deadline") or _now_plus_days(30),
                source_url=req.url,
            ))

        duration = int((time.monotonic() - start) * 1000)
        logger.info("Crawl4AI extracted %d tenders in %dms for %s", len(tenders), duration, req.url)

        return Crawl4AiResponse(
            success=True,
            url=req.url,
            tenders=tenders,
            count=len(tenders),
            duration_ms=duration,
        )

    except Exception as exc:
        logger.error("Crawl4AI failed for %s: %s", req.url, exc, exc_info=True)
        return Crawl4AiResponse(
            success=False,
            url=req.url,
            tenders=[],
            count=0,
            duration_ms=int((time.monotonic() - start) * 1000),
            error=str(exc),
        )
