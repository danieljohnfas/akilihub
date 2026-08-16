"""
fetchers/_extract.py — Shared extraction utilities for AkiliHub scrapers.

Single source of truth for:
  - Text cleaning helpers
  - TenderItem dict builder
  - Adaptive element extraction (_extract_tenders)

Both stealthy.py (Scrapling fetchers) and camoufox_fetcher.py (Firefox via
camoufox + Scrapling Adaptor) import from here so the logic never drifts.

Adaptive selector strategy
──────────────────────────
Scrapling's adaptive feature uses a SQLite database (~/.scrapling/ by default)
to fingerprint elements the first time they are seen.  On subsequent runs it
uses those fingerprints to relocate the elements even if the page structure
has changed (new class names, extra wrapper divs, column reordering, etc.).

We detect "first run" per portal by checking whether a storage entry already
exists for the portal's row selector.  This keeps the logic transparent and
avoids the silent failure mode where adaptive=True is passed before any
fingerprint has been saved.

Usage pattern in callers:
    page   = <scrapling Adaptor or fetcher response>
    items  = extract_tenders(page, portal_type="ppra_tz", source_url=url)
"""

from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timedelta, timezone

from css_selectors import PORTAL_SELECTORS, FALLBACK_SELECTORS

logger = logging.getLogger(__name__)

# ── Text helpers ──────────────────────────────────────────────────────────────

def clean(text: str | None) -> str:
    """Collapse whitespace and strip a string; return '' for None/empty."""
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def now_plus_days(days: int = 30) -> str:
    """Return an ISO-8601 UTC timestamp `days` days from now."""
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


# ── TenderItem builder ────────────────────────────────────────────────────────

def build_tender(
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
        "title":                 title[:500],
        "reference_no":          ref or f"{portal_type.upper()}-{idx}-{int(datetime.now().timestamp())}",
        "contracting_authority": authority or "Government Authority",
        "deadline":              deadline or now_plus_days(30),
        "source_url":            source_url,
        "description":           description[:1000] if description else None,
        "published_date":        published or datetime.now(timezone.utc).isoformat(),
    }


# ── Adaptive detection ────────────────────────────────────────────────────────

def _scrapling_db_path() -> str:
    """Return the path to Scrapling's adaptive storage SQLite file."""
    home = os.path.expanduser("~")
    return os.path.join(home, ".scrapling", "storage.db")


def is_adaptive_ready(portal_type: str) -> bool:
    """
    Return True if Scrapling's storage database exists and contains at least
    one fingerprint entry for the given portal.

    When True, callers should use adaptive=True (self-healing).
    When False, callers should use auto_save=True (fingerprint-building).
    """
    db_path = _scrapling_db_path()
    if not os.path.exists(db_path):
        return False
    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        # Scrapling's default table name is "storage"
        cur.execute(
            "SELECT 1 FROM storage WHERE key LIKE ? LIMIT 1",
            (f"%{portal_type}%",),
        )
        row = cur.fetchone()
        conn.close()
        return row is not None
    except Exception as exc:
        logger.debug("adaptive_ready check failed (%s) — assuming first run.", exc)
        return False


# ── Core extraction ───────────────────────────────────────────────────────────

def extract_tenders(page, portal_type: str, source_url: str) -> list[dict]:
    """
    Extract tenders from a Scrapling page or Adaptor object.

    Automatically selects the right Scrapling selection flags:
      - First run  → auto_save=True  (writes element fingerprints to storage)
      - Later runs → adaptive=True   (self-healing: locates elements even after
                                      redesigns using stored fingerprints)

    Falls back to a generic keyword-heuristic when portal-specific selectors
    yield no rows.

    Parameters
    ----------
    page        : Scrapling page response / Adaptor instance
    portal_type : One of the portal type keys defined in selectors.json
    source_url  : The URL that was fetched (used as source_url in results)

    Returns
    -------
    list[dict]  : List of TenderItem-compatible dicts
    """
    selectors = PORTAL_SELECTORS.get(portal_type, FALLBACK_SELECTORS)
    results: list[dict] = []

    # Decide adaptive vs auto_save for this portal
    adaptive = is_adaptive_ready(portal_type)
    save_kw = {"adaptive": True} if adaptive else {"auto_save": True}
    mode_label = "adaptive" if adaptive else "auto_save"
    logger.debug("extract_tenders: portal=%s mode=%s", portal_type, mode_label)

    # ── Primary: portal-specific row selector ──────────────────────────────
    try:
        rows = page.css(selectors["row"], **save_kw)
    except Exception as exc:
        logger.warning("Row selector failed (%s), falling back to generic.", exc)
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

        results.append(build_tender(
            title=title,
            ref=_get("ref"),
            authority=_get("authority"),
            deadline=_get("deadline", "td:last-child"),
            published=_get("published"),
            source_url=source_url,
            idx=idx,
            portal_type=portal_type,
        ))

    # ── Generic keyword heuristic fallback ────────────────────────────────
    if not results:
        logger.info(
            "portal=%s: 0 rows from primary selector — trying generic heuristic.",
            portal_type,
        )
        try:
            generic_rows = page.css("tr", **save_kw)
        except Exception:
            generic_rows = page.css("tr")

        for idx, row in enumerate(generic_rows):
            cells = row.css("td")
            if len(cells) < 2:
                continue
            row_text = row.text or ""
            if any(
                kw in row_text.lower()
                for kw in ("tender", "procurement", "bid", "appel", "offre", "contract")
            ):
                title = clean(cells[1].text if len(cells) > 1 else cells[0].text)
                if title and len(title) > 5:
                    results.append(build_tender(
                        title=title,
                        ref=clean(cells[0].text),
                        authority=clean(cells[2].text) if len(cells) > 2 else "",
                        deadline=clean(cells[3].text) if len(cells) > 3 else "",
                        published="",
                        source_url=source_url,
                        idx=idx,
                        portal_type=portal_type,
                    ))

    logger.info(
        "extract_tenders: portal=%s mode=%s → %d results from %s",
        portal_type, mode_label, len(results), source_url,
    )
    return results
