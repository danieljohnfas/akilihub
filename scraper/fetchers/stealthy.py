"""
fetchers/stealthy.py — Single-page scraping with Scrapling's StealthyFetcher.

StealthyFetcher opens a real Chromium browser with fingerprint spoofing and
can solve Cloudflare Turnstile/Interstitial challenges automatically.

`auto_save=True` on element selection writes element signatures to a local
SQLite cache (~/.scrapling/). If the page redesigns later, passing
`adaptive=True` re-uses those signatures to find the relocated elements —
no manual selector updates needed.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta, timezone

from scrapling.fetchers import Fetcher, StealthyFetcher

from css_selectors import PORTAL_SELECTORS, FALLBACK_SELECTORS

logger = logging.getLogger(__name__)

# ── Helpers ───────────────────────────────────────────────────────────────────

def _now_plus_days(days: int = 30) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


def _clean(text: str | None) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def _build_tender(
    title: str,
    ref: str,
    authority: str,
    deadline: str,
    published: str,
    source_url: str,
    description: str = "",
    idx: int = 0,
    portal_type: str = "generic",
) -> dict:
    return {
        "title": title[:500],
        "reference_no": ref or f"{portal_type.upper()}-{idx}-{int(datetime.now().timestamp())}",
        "contracting_authority": authority or "Government Authority",
        "deadline": deadline or _now_plus_days(30),
        "source_url": source_url,
        "description": description[:1000] if description else None,
        "published_date": published or datetime.now(timezone.utc).isoformat(),
    }


# ── Core extraction ───────────────────────────────────────────────────────────

def _extract_tenders(page, portal_type: str, source_url: str) -> list[dict]:
    """
    Given a Scrapling page object, extract tenders using portal-specific
    selectors with adaptive fallback.
    """
    selectors = PORTAL_SELECTORS.get(portal_type, FALLBACK_SELECTORS)
    results: list[dict] = []

    # Primary: portal-specific row selector
    rows = page.css(selectors["row"], auto_save=True)

    for idx, row in enumerate(rows):
        title_el = row.css(selectors["title"])
        if not title_el:
            continue

        title = _clean(title_el[0].text)
        if not title or len(title) < 5:
            continue

        ref_el   = row.css(selectors["ref"])
        auth_el  = row.css(selectors["authority"])
        dl_el    = row.css(selectors.get("deadline", "td:last-child"))
        pub_el   = row.css(selectors.get("published", ""))

        results.append(_build_tender(
            title=title,
            ref=_clean(ref_el[0].text) if ref_el else "",
            authority=_clean(auth_el[0].text) if auth_el else "",
            deadline=_clean(dl_el[0].text) if dl_el else "",
            published=_clean(pub_el[0].text) if pub_el else "",
            source_url=source_url,
            idx=idx,
            portal_type=portal_type,
        ))

    # Generic heuristic fallback when no rows matched
    if not results:
        logger.info("No rows from primary selector — trying generic heuristic.")
        for idx, row in enumerate(page.css("tr", auto_save=True)):
            cells = row.css("td")
            if len(cells) < 2:
                continue
            row_text = row.text or ""
            if any(kw in row_text.lower() for kw in ("tender", "procurement", "bid", "appel", "offre")):
                title = _clean(cells[1].text if len(cells) > 1 else cells[0].text)
                if title and len(title) > 5:
                    results.append(_build_tender(
                        title=title,
                        ref=_clean(cells[0].text),
                        authority=_clean(cells[2].text) if len(cells) > 2 else "",
                        deadline=_clean(cells[3].text) if len(cells) > 3 else "",
                        published="",
                        source_url=source_url,
                        idx=idx,
                        portal_type=portal_type,
                    ))

    return results


# ── Public API ────────────────────────────────────────────────────────────────

async def stealthy_scrape(
    url: str,
    portal_type: str,
    use_stealth: bool = True,
) -> list[dict]:
    """
    Fetch a single page and extract tenders.

    use_stealth=True  → StealthyFetcher (Cloudflare bypass, headless Chromium)
    use_stealth=False → Fetcher (fast HTTP, TLS fingerprint spoofing, no browser)
    """
    logger.info("Fetching %s (stealth=%s)", url, use_stealth)

    if use_stealth:
        # StealthyFetcher.adaptive=True enables global adaptive mode:
        # all subsequent css() calls with auto_save=True will persist signatures.
        StealthyFetcher.adaptive = True
        page = StealthyFetcher.fetch(
            url,
            headless=True,
            network_idle=True,        # wait for XHR/fetch to settle
            solve_cloudflare=True,    # auto-solve Cloudflare Turnstile
            google_search=False,      # don't use Google as referrer
        )
    else:
        page = Fetcher.get(
            url,
            stealthy_headers=True,    # realistic browser headers
            impersonate="chrome",     # TLS fingerprint of Chrome
        )

    tenders = _extract_tenders(page, portal_type, url)
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

    if use_stealth:
        page = StealthyFetcher.fetch(
            url,
            headless=True,
            network_idle=True,
            solve_cloudflare=True,
            google_search=False,
        )
    else:
        page = Fetcher.get(
            url,
            stealthy_headers=True,
            impersonate="chrome",
        )

    # Scrapling Response object provides .text (or .body) which is the raw HTML
    return page.text or ""
