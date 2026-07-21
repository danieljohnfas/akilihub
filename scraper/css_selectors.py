"""
css_selectors.py — CSS selector maps for each East African procurement portal.

Single source of truth: selectors.json (sibling file).
Both this Python module and scraper-strategies.ts consume the same JSON so
the TypeScript and Python extraction paths never drift apart.

When a portal redesigns:
  1. Update selectors.json once.
  2. Restart both the sidecar (Python) and the Next.js process (TypeScript).
"""

from __future__ import annotations

import json
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
_SELECTORS_PATH = os.path.join(_HERE, "selectors.json")

with open(_SELECTORS_PATH, encoding="utf-8") as _f:
    _ALL: dict[str, dict[str, str]] = json.load(_f)

# Public exports
FALLBACK_SELECTORS: dict[str, str] = _ALL.pop("_fallback")
PORTAL_SELECTORS: dict[str, dict[str, str]] = _ALL
