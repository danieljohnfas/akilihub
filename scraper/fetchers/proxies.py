"""
fetchers/proxies.py — Free proxy fetching and management for AkiliHub.

Zero-cost proxy sources (no API key required):
─────────────────────────────────────────────
1. ProxyScrape public API — Updated every minute, hundreds of IPs.
   Suitable for government portal scraping (low bot protection).
   Failure rate is high (~40-70%) — Scrapling's ProxyRotation handles
   automatic failover, so this is acceptable.

2. Geonode free list — Alternative public source, filterable by country.

Upgrading to paid proxies (recommended for scale):
───────────────────────────────────────────────────
Set environment variable PROXY_LIST with a comma-separated list:
  PROXY_LIST=http://user:pass@host1:port,http://user:pass@host2:port

Webshare.io free tier (recommended first upgrade):
  - 10 free datacenter proxies, no credit card required
  - Sign up at https://proxy.webshare.io/
  - Copy your proxy list and paste into PROXY_LIST env var

Qoest / Bright Data / Smartproxy (residential, for Cloudflare sites):
  - Needed only for Cloudflare Enterprise targets
  - Use format: http://user:pass@gate.provider.com:port
"""

from __future__ import annotations

import logging
import os
import random
import time
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────

# Set PROXY_LIST env var to use your own proxies (highest priority)
# Format: comma-separated proxy URLs
# e.g. PROXY_LIST=http://user:pass@host:port,socks5://host:port
ENV_PROXY_LIST = "PROXY_LIST"

# Cache free proxies for this many seconds before re-fetching
PROXY_CACHE_TTL = 300  # 5 minutes

# Max proxies to keep from free sources (too many = overhead)
MAX_FREE_PROXIES = 50

# ── Cache ─────────────────────────────────────────────────────────────────────

_proxy_cache: list[str] = []
_proxy_cache_ts: float = 0.0


# ── Free proxy sources ────────────────────────────────────────────────────────

def _fetch_proxyscrape(timeout: int = 10) -> list[str]:
    """
    Fetch a fresh list of working HTTP proxies from ProxyScrape's free API.
    Returns format: ["http://ip:port", ...]
    """
    url = (
        "https://api.proxyscrape.com/v2/"
        "?request=displayproxies"
        "&protocol=http"
        "&timeout=5000"
        "&country=all"
        "&ssl=all"
        "&anonymity=elite"
    )
    try:
        resp = httpx.get(url, timeout=timeout)
        resp.raise_for_status()
        proxies = [
            f"http://{line.strip()}"
            for line in resp.text.splitlines()
            if line.strip() and ":" in line.strip()
        ]
        logger.info("ProxyScrape: fetched %d proxies.", len(proxies))
        return proxies
    except Exception as exc:
        logger.warning("ProxyScrape fetch failed: %s", exc)
        return []


def _fetch_geonode(timeout: int = 10, limit: int = 100) -> list[str]:
    """
    Fetch proxies from Geonode's free API.
    Returns format: ["http://ip:port", ...]
    """
    url = (
        f"https://proxylist.geonode.com/api/proxy-list"
        f"?limit={limit}&page=1&sort_by=lastChecked&sort_type=desc"
        f"&protocols=http,https&anonymityLevel=elite"
        f"&speed=fast"
    )
    try:
        resp = httpx.get(url, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        proxies = [
            f"http://{item['ip']}:{item['port']}"
            for item in data.get("data", [])
            if item.get("ip") and item.get("port")
        ]
        logger.info("Geonode: fetched %d proxies.", len(proxies))
        return proxies
    except Exception as exc:
        logger.warning("Geonode fetch failed: %s", exc)
        return []


# ── Public API ────────────────────────────────────────────────────────────────

def get_proxies(force_refresh: bool = False) -> list[str]:
    """
    Return a list of proxy strings ready to pass to Scrapling's ProxyRotation.

    Priority order:
    1. PROXY_LIST environment variable (your own proxies — best quality)
    2. Cached free proxies (refreshed every PROXY_CACHE_TTL seconds)
    3. ProxyScrape → Geonode fallback (freshly fetched)

    Parameters
    ----------
    force_refresh : If True, bypass the cache and re-fetch free proxies.

    Returns
    -------
    list[str]  Proxy URLs, e.g. ["http://1.2.3.4:8080", ...]
               Empty list if no proxies are available (scraping proceeds without proxy).
    """
    global _proxy_cache, _proxy_cache_ts

    # 1. User-supplied proxies take priority
    env_val = os.getenv(ENV_PROXY_LIST, "").strip()
    if env_val:
        proxies = [p.strip() for p in env_val.split(",") if p.strip()]
        logger.info("Using %d proxies from %s env var.", len(proxies), ENV_PROXY_LIST)
        return proxies

    # 2. Return cached free proxies if still fresh
    now = time.monotonic()
    if not force_refresh and _proxy_cache and (now - _proxy_cache_ts) < PROXY_CACHE_TTL:
        logger.debug("Returning %d cached free proxies.", len(_proxy_cache))
        return list(_proxy_cache)

    # 3. Fetch fresh free proxies
    logger.info("Fetching fresh free proxies...")
    proxies: list[str] = []

    # Try ProxyScrape first
    proxies = _fetch_proxyscrape()

    # Fall back to Geonode if ProxyScrape failed or returned too few
    if len(proxies) < 10:
        proxies += _fetch_geonode()

    # Shuffle so we don't always start from the same IPs
    random.shuffle(proxies)
    proxies = proxies[:MAX_FREE_PROXIES]

    # Update cache
    _proxy_cache = proxies
    _proxy_cache_ts = now

    if proxies:
        logger.info("Free proxy pool: %d proxies ready.", len(proxies))
    else:
        logger.warning(
            "No free proxies available. Scraping without proxy. "
            "Set %s env var to use your own proxies "
            "(Webshare.io free tier: https://proxy.webshare.io/).",
            ENV_PROXY_LIST,
        )

    return proxies


def get_random_proxy() -> Optional[str]:
    """Return a single random proxy string, or None if none are available."""
    pool = get_proxies()
    return random.choice(pool) if pool else None
