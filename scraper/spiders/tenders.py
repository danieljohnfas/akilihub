"""
spiders/tenders.py — Multi-page Scrapling Spider for procurement portals.

Uses Scrapling's built-in Spider API (Scrapy-compatible) which provides:
  - Concurrent requests with configurable limits
  - Pause / Resume via crawldir checkpoints (Ctrl-C → restart picks up where
    it left off automatically)
  - Robots.txt obedience per domain
  - Streaming mode for large crawls
  - Native proxy rotation via ProxyRotation

This spider is only invoked when max_pages > 1 AND a crawl_dir is provided.
For single-page one-off fetches, fetchers/stealthy.py is used instead.

Proxy rotation
──────────────
Pass a list of proxy strings to TenderSpider(proxies=[...]) or to the
static TenderSpider.run() helper.  Scrapling's ProxyRotation cycles through
them automatically, retrying with the next proxy on failure.

Format: ["http://user:pass@host:port", "socks5://host:port", ...]

Adaptive selectors
──────────────────
The spider uses adaptive=True on element selectors so that fingerprints
saved by single-page fetches (stealthy.py / camoufox_fetcher.py) are reused
here as well.  Scrapling's storage is process-global, so fingerprints from
one fetcher are immediately available to the other.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from scrapling.spiders import Spider, Request, Response

from css_selectors import PORTAL_SELECTORS, FALLBACK_SELECTORS
from fetchers._extract import clean, now_plus_days, build_tender, is_adaptive_ready

logger = logging.getLogger(__name__)


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
            proxies=["http://user:pass@host:port"],
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
        proxies: list[str] | None = None,
    ):
        self._portal_type = portal_type
        self._max_pages = max_pages
        self._crawl_dir = crawl_dir
        self._pages_crawled = 0
        self.start_urls = [start_url]

        # Build spider kwargs — proxy rotation is optional
        spider_kwargs: dict = {"crawldir": crawl_dir}
        if proxies:
            try:
                from scrapling.spiders import ProxyRotation
                spider_kwargs["proxy_rotation"] = ProxyRotation(proxies=proxies)
                logger.info(
                    "TenderSpider: proxy rotation enabled with %d proxies.", len(proxies)
                )
            except ImportError:
                # Older Scrapling versions without ProxyRotation
                spider_kwargs["proxies"] = proxies
                logger.warning(
                    "ProxyRotation not available — passing proxies list directly."
                )

        super().__init__(**spider_kwargs)

    # ── Scrapling Spider callbacks ─────────────────────────────────────────────

    async def parse(self, response: Response):
        """
        Main parse callback — called for every fetched page.
        Yields tender dicts and optionally follows pagination links.
        """
        selectors = PORTAL_SELECTORS.get(self._portal_type, FALLBACK_SELECTORS)
        self._pages_crawled += 1

        # Choose adaptive vs auto_save per-portal (same logic as _extract.py)
        adaptive = is_adaptive_ready(self._portal_type)
        save_kw = {"adaptive": True} if adaptive else {"auto_save": True}
        mode_label = "adaptive" if adaptive else "auto_save"
        logger.debug(
            "TenderSpider.parse: portal=%s mode=%s page=%d",
            self._portal_type, mode_label, self._pages_crawled,
        )

        try:
            rows = response.css(selectors["row"], **save_kw)
        except Exception as exc:
            logger.warning("Row selector error on page %d: %s", self._pages_crawled, exc)
            rows = []

        for idx, row in enumerate(rows):
            try:
                title_els = row.css(selectors["title"], **save_kw)
            except Exception:
                title_els = row.css(selectors["title"])

            if not title_els:
                continue

            title = clean(title_els[0].text)
            if not title or len(title) < 5:
                continue

            def _get(sel_key: str, fallback: str = "") -> str:
                sel = selectors.get(sel_key, fallback)
                if not sel:
                    return ""
                try:
                    els = row.css(sel, **save_kw)
                except Exception:
                    els = row.css(sel) if sel else []
                return clean(els[0].text) if els else ""

            yield build_tender(
                title=title,
                ref=_get("ref"),
                authority=_get("authority"),
                deadline=_get("deadline", "td:last-child"),
                published=_get("published"),
                source_url=response.url,
                idx=idx,
                portal_type=self._portal_type,
            )

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
        proxies: list[str] | None = None,
    ) -> list[dict]:
        """
        Run the spider and return collected items as a list.
        Spider.start() is blocking but fast for typical crawl sizes.

        Parameters
        ----------
        proxies : Optional list of proxy strings, e.g.
                  ["http://user:pass@host:port", "socks5://host:port"]
                  Scrapling cycles through these automatically with fallback.
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
                proxies=proxies,
            ).start(),
        )
        return result.items.to_list() if result and result.items else []
