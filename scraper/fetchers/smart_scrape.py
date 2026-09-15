"""
fetchers/smart_scrape.py — LLM-powered extraction (no CSS selectors needed).

Strategy A (preferred): ScrapeGraph cloud API via `scrapegraph-py` SDK.
  - Requires SCRAPEGRAPH_API_KEY env var (free tier at scrapegraphai.com).
  - Uses AsyncScrapeGraphAI.extract(prompt, url=...) — handles JS rendering
    and structured extraction on their side.

Strategy B (fallback): Fetch rendered HTML via camoufox → send to a local LLM
  (Groq / OpenRouter / DeepSeek) with a JSON-extraction prompt. Uses API keys
  already present in the environment, no third-party scraping service needed.

Returns a plain dict / list — whatever the LLM parses from the page.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

logger = logging.getLogger("smart-scrape")


# ── Strategy A: ScrapeGraph cloud API ────────────────────────────────────────

async def _scrapegraph_api(url: str, prompt: str) -> Any:
    """Use the official scrapegraph-py async SDK (needs SCRAPEGRAPH_API_KEY)."""
    from scrapegraph_py import AsyncScrapeGraphAI  # type: ignore

    api_key = os.environ["SCRAPEGRAPH_API_KEY"]
    async with AsyncScrapeGraphAI(api_key=api_key) as client:
        result = await client.extract(prompt, url=url)

    # result is ApiResult[ExtractResponse]; .result holds the actual data
    if hasattr(result, "result"):
        return result.result
    return result


# ── Strategy B: local HTML fetch + Groq/OpenRouter LLM ───────────────────────

_SYSTEM_PROMPT = """\
You are a precise web data extractor. The user gives you raw HTML and a data request.
Extract ONLY the requested data and return it as valid JSON — either a JSON object or
a JSON array. Do NOT include markdown fences, comments, or any text outside the JSON.
If nothing is found, return an empty array [].
"""

# Ordered list of (env_var, base_url, model) — first available key wins
_PROVIDERS = [
    ("GROQ_API_KEY",       "https://api.groq.com/openai/v1",     "llama-3.3-70b-versatile"),
    ("OPENROUTER_API_KEY", "https://openrouter.ai/api/v1",       "meta-llama/llama-3.3-70b-instruct:free"),
    ("DEEPSEEK_API_KEY",   "https://api.deepseek.com/v1",        "deepseek-chat"),
]


async def _llm_extract(html: str, prompt: str) -> Any:
    """Pass rendered HTML + prompt to an available LLM; parse JSON response."""
    import httpx

    # Trim HTML to keep tokens manageable (~30k chars ≈ ~10k tokens)
    MAX_HTML = 30_000
    if len(html) > MAX_HTML:
        html = html[:MAX_HTML] + "\n... [truncated]"

    user_msg = f"DATA REQUEST: {prompt}\n\nHTML:\n{html}"

    for env_var, base_url, model in _PROVIDERS:
        api_key = os.environ.get(env_var)
        if not api_key:
            continue
        try:
            logger.info("SmartScrape LLM fallback: trying %s / %s", env_var, model)
            async with httpx.AsyncClient(timeout=90.0) as client:
                resp = await client.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": _SYSTEM_PROMPT},
                            {"role": "user",   "content": user_msg},
                        ],
                        "temperature": 0.0,
                        "max_tokens": 4096,
                    },
                )
            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"].strip()

            # Strip markdown fences if the model ignored instructions
            if raw.startswith("```"):
                raw = raw.split("```", 2)[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.rsplit("```", 1)[0].strip()

            return json.loads(raw)

        except json.JSONDecodeError as exc:
            logger.warning("LLM %s returned non-JSON: %s", model, exc)
            continue
        except Exception as exc:
            logger.warning("LLM provider %s failed: %s", env_var, exc)
            continue

    raise RuntimeError("All LLM providers failed — check API keys in environment.")


async def _html_then_llm(url: str, prompt: str) -> Any:
    """Render the page with camoufox (Firefox stealth) then extract with LLM."""
    from fetchers.camoufox_fetcher import camoufox_fetch_html  # type: ignore

    logger.info("SmartScrape fallback: rendering HTML for %s", url)
    html = await camoufox_fetch_html(url)
    if not html:
        raise ValueError(f"Could not render HTML from {url}")

    logger.info("SmartScrape: got %d chars, handing to LLM", len(html))
    return await _llm_extract(html, prompt)


# ── Public entry point ────────────────────────────────────────────────────────

async def smart_scrape(url: str, prompt: str) -> tuple[Any, str]:
    """
    Extract structured data from `url` using a plain-English `prompt`.

    Returns ``(result, strategy_used)`` where result is a dict or list.

    Usage::

        result, strategy = await smart_scrape(
            url="https://example.com/jobs",
            prompt="List all job titles with company name and deadline"
        )
    """
    # Strategy A: ScrapeGraph cloud API (zero infra, best quality)
    if os.environ.get("SCRAPEGRAPH_API_KEY"):
        try:
            logger.info("SmartScrape via ScrapeGraph cloud: %s", url)
            result = await _scrapegraph_api(url, prompt)
            return result, "scrapegraph_api"
        except Exception as exc:
            logger.warning("ScrapeGraph API failed, falling back: %s", exc)

    # Strategy B: camoufox render + local LLM
    result = await _html_then_llm(url, prompt)
    return result, "camoufox+llm"
