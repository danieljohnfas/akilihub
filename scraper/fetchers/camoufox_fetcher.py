"""
fetchers/camoufox_fetcher.py — Firefox-based stealth fetcher using camoufox.

camoufox modifies the Firefox engine at the C++ level to produce genuine
browser fingerprints (Canvas, WebGL, fonts, audio, TLS). It is the
strongest free anti-bot bypass available in 2026 for Cloudflare Enterprise
and DataDome targets.

Used as a secondary stealth engine when Scrapling's Chromium-based
StealthyFetcher returns empty results.

Extraction logic (adaptive selectors, tender building) is delegated to
fetchers/_extract.py so both fetchers share identical self-healing behaviour.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


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

        # Use Scrapling's Adaptor to parse the camoufox HTML output.
        # extract_tenders handles adaptive vs auto_save automatically.
        from scrapling import Adaptor
        from fetchers._extract import extract_tenders

        page_obj = Adaptor(html_content, url=url)
        results = extract_tenders(page_obj, portal_type, url)

        logger.info("camoufox extracted %d tenders from %s", len(results), url)
        return results

    except ImportError:
        logger.error("camoufox is not installed. Run: pip install camoufox[geoip]")
        return []
    except Exception as exc:
        logger.error("camoufox scrape failed for %s: %s", url, exc, exc_info=True)
        return []


async def camoufox_fetch_html(url: str, timeout_ms: int = 45_000) -> str:
    """
    Fetch a page with camoufox and return the raw rendered HTML string.

    Unlike camoufox_scrape, this does no tender extraction — it's used by
    the smart scraper to hand HTML off to an LLM for arbitrary extraction.
    Returns an empty string on failure.
    """
    logger.info("camoufox_fetch_html: fetching %s", url)
    try:
        from camoufox.async_api import AsyncCamoufox

        async with AsyncCamoufox(headless=True, geoip=True) as browser:
            page = await browser.new_page()
            try:
                await page.goto(url, wait_until="networkidle", timeout=timeout_ms)
                html = await page.content()
            finally:
                await page.close()

        if not html or len(html) < 200:
            logger.warning("camoufox_fetch_html: empty/tiny response for %s", url)
            return ""

        logger.info("camoufox_fetch_html: got %d chars for %s", len(html), url)
        return html

    except ImportError:
        logger.error("camoufox is not installed. Run: pip install camoufox[geoip]")
        return ""
    except Exception as exc:
        logger.error("camoufox_fetch_html failed for %s: %s", url, exc, exc_info=True)
        return ""
