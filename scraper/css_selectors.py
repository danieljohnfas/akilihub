"""
selectors.py — CSS selector maps for each East African procurement portal.

These mirror the PORTAL_SELECTORS object already in the TypeScript codebase
(src/lib/strategies/scraper-strategies.ts) so both the TS Cheerio path and the
Python Scrapling path stay in sync.

When a portal redesigns:
  1. The TypeScript selectors break → engineers update PORTAL_SELECTORS here.
  2. Scrapling's adaptive mode helps detect the change automatically because
     element signatures saved by auto_save=True will fail to match → a warning
     is logged → engineer updates selectors.
"""

PORTAL_SELECTORS: dict[str, dict[str, str]] = {
    # Tanzania — PPRA / NeST portal
    "ppra_tz": {
        "row":       "table tr:not(:first-child)",
        "ref":       "td:nth-child(1)",
        "title":     "td:nth-child(2)",
        "authority": "td:nth-child(3)",
        "published": "td:nth-child(4)",
        "deadline":  "td:nth-child(5)",
    },
    # Kenya — PPOA / Public Procurement portal
    "ppoa_ke": {
        "row":       ".tender-list tr:not(:first-child), table.tenders tr:not(:first-child), table tr:not(:first-child)",
        "ref":       "td:nth-child(1)",
        "title":     "td:nth-child(2)",
        "authority": "td:nth-child(3)",
        "deadline":  "td:nth-child(4)",
    },
    # Uganda — PPDA / Government Procurement Portal
    "ppda_ug": {
        "row":       ".views-table tr:not(:first-child), table tr:not(:first-child)",
        "ref":       "td:nth-child(1)",
        "title":     "td:nth-child(2)",
        "authority": "td:nth-child(3)",
        "deadline":  "td:nth-child(4)",
    },
    # Rwanda — RPPA portal
    "rppa_rw": {
        "row":       ".tender-item, table tr:not(:first-child)",
        "ref":       "td:nth-child(1)",
        "title":     "td:nth-child(2)",
        "authority": "td:nth-child(3)",
        "deadline":  "td:nth-child(4)",
    },
    # Ethiopia — PPPA portal
    "pppa_et": {
        "row":       ".bid-item, table tr:not(:first-child)",
        "ref":       "td:nth-child(1)",
        "title":     "td:nth-child(2)",
        "authority": "td:nth-child(3)",
        "deadline":  "td:nth-child(4)",
    },
    # DRC — ARMP portal
    "armp_cd": {
        "row":       ".appel-item, article.appel, table tr:not(:first-child)",
        "ref":       "td:nth-child(1)",
        "title":     "td:nth-child(2), h3, .title",
        "authority": "td:nth-child(3), .entity",
        "deadline":  "td:nth-child(4), .date",
    },
}

# Generic heuristic selector — used for unknown portals
FALLBACK_SELECTORS: dict[str, str] = {
    "row":       "table tr:not(:first-child)",
    "ref":       "td:first-child",
    "title":     "td:nth-child(2)",
    "authority": "td:nth-child(3)",
    "deadline":  "td:last-child",
}
