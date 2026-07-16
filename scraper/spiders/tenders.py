"""
spiders/tenders.py — Multi-page Scrapling Spider for procurement portals.

Uses Scrapling's built-in Spider API (Scrapy-compatible) which provides:
  - Concurrent requests with configurable limits
  - Pause / Resume via crawldir checkpoints (Ctrl-C → restart picks up where
    it left off automatically)
  - Robots.txt obedience per domain
  - Streaming mode for large crawls

This spider is only invoked when max_pages > 1 AND a crawl_dir is provided.
For single-page one-off fetches, fetchers/stealthy.py is used instead.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta, timezone

from scrapling.spiders import Spider, Request, Response

from selectors import PORTAL_SELECTORS, FALLBACK_SELECTORS

logger = logging.getLogger(__name__)


def _clean(text: str | None) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def _now_plus_days(days: int = 30) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


class TenderSpider(Spider):
    """
    Scrapy-compatible spider that crawls procurement portal listings.

    Configuration is passed at instantiation because Spider.start() is
    synchronous (spawns its own asyncio loop internally).

    Usage:
        result = TenderSpider(
            start_url="https://...",
            portal_type="ppra_tz",
            max_pages=5,
            crawl_dir="./crawl_data/ppra_tz",
        ).start()
        tenders = result.items.to_list()
    """

    name = "tender_spider"

    # Scrapling Spider settings
    concurrent_requests: int = 4       # parallel requests per domain
    download_delay: float = 1.5        # seconds between requests (polite)
    robots_txt_obey: bool = True       # honour Disallow / Crawl-delay
    retry_times: int = 3

    def __init__(
        self,
        start_url: str,
        portal_type: str = "generic",
        max_pages: int = 10,
        crawl_dir: str = "./crawl_data",
    ):
        self._portal_type = portal_type
        self._max_pages = max_pages
        self._crawl_dir = crawl_dir
        self._pages_crawled = 0
        self.start_urls = [start_url]
        super().__init__(crawldir=crawl_dir)

    # ── Scrapling Spider callbacks ─────────────────────────────────────────────

    async def parse(self, response: Response):
        """
        Main parse callback — called for every fetched page.
        Yields tender dicts and optionally follows pagination links.
        """
        selectors = PORTAL_SELECTORS.get(self._portal_type, FALLBACK_SELECTORS)
        self._pages_crawled += 1

        rows = response.css(selectors["row"])

        for idx, row in enumerate(rows):
            title_els = row.css(selectors["title"])
            if not title_els:
                continue

            title = _clean(title_els[0].text)
            if not title or len(title) < 5:
                continue

            ref_els   = row.css(selectors["ref"])
            auth_els  = row.css(selectors["authority"])
            dl_els    = row.css(selectors.get("deadline", "td:last-child"))
            pub_els   = row.css(selectors.get("published", ""))

            yield {
                "title": title[:500],
                "reference_no": (
                    _clean(ref_els[0].text) if ref_els else
                    f"{self._portal_type.upper()}-{idx}-{int(datetime.now().timestamp())}"
                ),
                "contracting_authority": _clean(auth_els[0].text) if auth_els else "Government Authority",
                "deadline": _clean(dl_els[0].text) if dl_els else _now_plus_days(30),
                "source_url": response.url,
                "description": None,
                "published_date": _clean(pub_els[0].text) if pub_els else datetime.now(timezone.utc).isoformat(),
            }

        # ── Pagination ──────────────────────────────────────────────────────
        if self._pages_crawled >= self._max_pages:
            logger.info("Reached max_pages=%d — stopping.", self._max_pages)
            return

        # Common "next page" patterns across EA procurement portals
        next_selectors = [
            "a[rel='next']",
            ".pagination .next a",
            "a.next-page",
            "li.next a",
            "a:contains('Next')",
            "a:contains('›')",
        ]

        for sel in next_selectors:
            next_links = response.css(sel)
            if next_links:
                next_href = next_links[0].attrib.get("href")
                if next_href:
                    logger.info(
                        "Following pagination: %s (page %d/%d)",
                        next_href, self._pages_crawled + 1, self._max_pages,
                    )
                    yield response.follow(next_href)
                    break

    # ── Static helper for async callers ───────────────────────────────────────

    @staticmethod
    async def run(
        start_url: str,
        portal_type: str,
        max_pages: int,
        crawl_dir: str,
    ) -> list[dict]:
        """
        Run the spider and return collected items as a list.
        Spider.start() is blocking but fast for typical crawl sizes.
        """
        import asyncio

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: TenderSpider(
                start_url=start_url,
                portal_type=portal_type,
                max_pages=max_pages,
                crawl_dir=crawl_dir,
            ).start(),
        )
        return result.items.to_list() if result and result.items else []
