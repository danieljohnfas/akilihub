"""
fetchers/stealthy.py — Single-page scraping with Scrapling's AsyncStealthyFetcher.

AsyncStealthyFetcher (Scrapling ≥ 0.4) opens a real Chromium browser with
fingerprint spoofing in a non-blocking async context, meaning concurrent
requests within FastAPI's event loop are no longer serialized.

Adaptive selector logic is centralised in fetchers/_extract.py.  On the
first scrape of a portal the element fingerprints are saved to Scrapling's
local SQLite store (~/.scrapling/storage.db).  Every subsequent scrape uses
those fingerprints with adaptive=True so the scraper self-heals when a portal
redesigns its page layout.
"""

from __future__ import annotations

import asyncio
import logging

from scrapling.fetchers import Fetcher

from fetchers._extract import extract_tenders

logger = logging.getLogger(__name__)


# ── Public API ────────────────────────────────────────────────────────────────

async def stealthy_scrape(
    url: str,
    portal_type: str,
    use_stealth: bool = True,
) -> list[dict]:
    """
    Fetch a single page and extract tenders.

    use_stealth=True  → AsyncStealthyFetcher (Cloudflare bypass, headless Chromium, non-blocking)
    use_stealth=False → Fetcher (fast HTTP, TLS fingerprint spoofing, no browser)
    """
    logger.info("Fetching %s (stealth=%s)", url, use_stealth)

    page = await _fetch(url, use_stealth)
    tenders = extract_tenders(page, portal_type, url)
    logger.info("Extracted %d tenders from %s", len(tenders), url)
    return tenders


async def stealthy_fetch_html(
    url: str,
    use_stealth: bool = True,
) -> str:
    """
    Fetch a single page and return its raw rendered HTML.
    Used for jobs and compliance scraping where Gemini extracts the data.
    """
    logger.info("Fetching raw HTML for %s (stealth=%s)", url, use_stealth)
    page = await _fetch(url, use_stealth)
    return page.text or ""


# ── Internal fetch helper ─────────────────────────────────────────────────────

async def _fetch(url: str, use_stealth: bool):
    """Resolve the appropriate Scrapling fetcher and return a page object."""
    if use_stealth:
        try:
            # AsyncStealthyFetcher (Scrapling ≥ 0.4) — truly non-blocking
            from scrapling.fetchers import AsyncStealthyFetcher

            return await AsyncStealthyFetcher.async_fetch(
                url,
                headless=True,
                network_idle=True,
                solve_cloudflare=True,
                google_search=False,
                adaptive=True,
            )
        except (ImportError, AttributeError):
            # Scrapling < 0.4 compatibility: run sync StealthyFetcher in executor
            logger.warning(
                "AsyncStealthyFetcher unavailable — falling back to sync in executor."
            )
            from scrapling.fetchers import StealthyFetcher

            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                None,
                lambda: StealthyFetcher.fetch(
                    url,
                    headless=True,
                    network_idle=True,
                    solve_cloudflare=True,
                    google_search=False,
                ),
            )
    else:
        return Fetcher.get(
            url,
            stealthy_headers=True,
            impersonate="chrome",
        )
