"""
fetchers/camoufox_fetcher.py — Firefox-based stealth fetcher using camoufox.

camoufox modifies the Firefox engine at the C++ level to produce genuine
browser fingerprints (Canvas, WebGL, fonts, audio, TLS). It is the
strongest free anti-bot bypass available in 2026 for Cloudflare Enterprise
and DataDome targets.

Used as a secondary stealth engine when Scrapling's Chromium-based
StealthyFetcher returns empty results.
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)


def _clean(text: str | None) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def _now_plus_days(days: int = 30) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


async def camoufox_scrape(
    url: str,
    portal_type: str = "generic",
) -> list[dict]:
    """
    Fetch a single page with camoufox (Firefox stealth) and extract tenders.

    camoufox is an async context manager — each call launches a fresh Firefox
    instance with randomized fingerprints, navigates to the URL, waits for
    network idle, then closes the browser.
    """
    logger.info("camoufox: fetching %s (portal=%s)", url, portal_type)

    try:
        import camoufox
        from camoufox.async_api import AsyncCamoufox

        html_content = ""

        async with AsyncCamoufox(headless=True, geoip=True) as browser:
            page = await browser.new_page()
            try:
                await page.goto(url, wait_until="networkidle", timeout=45_000)
                html_content = await page.content()
            finally:
                await page.close()

        if not html_content or len(html_content) < 500:
            logger.warning("camoufox returned empty page for %s", url)
            return []

        # Use Scrapling's Adaptor to parse the camoufox HTML output
        from scrapling import Adaptor
        from css_selectors import PORTAL_SELECTORS, FALLBACK_SELECTORS

        page_obj = Adaptor(html_content, url=url)
        selectors = PORTAL_SELECTORS.get(portal_type, FALLBACK_SELECTORS)
        results: list[dict] = []

        rows = page_obj.css(selectors["row"], auto_save=True)
        for idx, row in enumerate(rows):
            title_el = row.css(selectors["title"])
            if not title_el:
                continue
            title = _clean(title_el[0].text)
            if not title or len(title) < 5:
                continue

            ref_el   = row.css(selectors["ref"])
            auth_el  = row.css(selectors.get("authority", "td:nth-child(3)"))
            dl_el    = row.css(selectors.get("deadline", "td:last-child"))
            pub_el   = row.css(selectors.get("published", ""))

            results.append({
                "title":                 title[:500],
                "reference_no":          _clean(ref_el[0].text) if ref_el else f"{portal_type.upper()}-CF-{idx}",
                "contracting_authority": _clean(auth_el[0].text) if auth_el else "Government Authority",
                "deadline":              _clean(dl_el[0].text) if dl_el else _now_plus_days(30),
                "source_url":            url,
                "description":           None,
                "published_date":        _clean(pub_el[0].text) if pub_el else datetime.now(timezone.utc).isoformat(),
            })

        logger.info("camoufox extracted %d tenders from %s", len(results), url)
        return results

    except ImportError:
        logger.error("camoufox is not installed. Run: pip install camoufox[geoip]")
        return []
    except Exception as exc:
        logger.error("camoufox scrape failed for %s: %s", url, exc, exc_info=True)
        return []
