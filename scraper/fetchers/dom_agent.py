"""
fetchers/dom_agent.py — Ultra-fast DOM-indexed browser agent for AkiliHub.

Inspired by Jev Ultrafast / Browser-Use architecture:
  1. Skips heavy vision screenshots by extracting an indexed table of interactive DOM elements.
  2. Single round-trip decision: LLM (Groq / Gemini Flash / OpenRouter) selects action + target index.
  3. Executes directly via Playwright in sub-second step latency.

Engines Supported:
  - "native" (default): Zero-waitlist, zero-dependency engine using Playwright + existing LLM keys.
  - "browser_use": Uses official browser-use library if installed.
  - "typesafe": Uses TypeSafe Jev model if TYPESAFE_API_KEY is configured.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from typing import Any, Dict, List, Literal, Optional, Tuple
from urllib.parse import urlparse

import httpx

try:
    from dotenv import load_dotenv
    _root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env.local"))
    _scraper_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
    if os.path.exists(_root_env):
        load_dotenv(_root_env)
    if os.path.exists(_scraper_env):
        load_dotenv(_scraper_env)
except Exception:
    pass

logger = logging.getLogger("dom-agent")

AgentEngine = Literal["native", "browser_use", "typesafe"]

# Providers for action decision loop (sub-500ms latency prioritized)
_LLM_PROVIDERS = [
    ("GROQ_API_KEY", "https://api.groq.com/openai/v1", "llama-3.3-70b-versatile"),
    ("GOOGLE_GENERATIVE_AI_API_KEY", "https://generativelanguage.googleapis.com/v1beta/openai", "gemini-2.5-flash"),
    ("GEMINI_API_KEY", "https://generativelanguage.googleapis.com/v1beta/openai", "gemini-2.5-flash"),
    ("OPENROUTER_API_KEY", "https://openrouter.ai/api/v1", "meta-llama/llama-3.3-70b-instruct:free"),
    ("DEEPSEEK_API_KEY", "https://api.deepseek.com/v1", "deepseek-chat"),
]

# Known aggregator domains that ATS resolver wants to navigate away from
AGGREGATOR_PATTERNS = [
    r"brightermonday",
    r"fuzu",
    r"ajiraleo",
    r"ajiraportal",
    r"kazibongo",
    r"nafasiyako",
    r"zoomtanzania",
    r"jobwebkenya",
    r"mabumbe",
    r"reliefweb\.int",
    r"unjobs\.org",
    r"myjobseye",
    r"shortlist\.net",
    r"glassdoor",
    r"indeed",
    r"linkedin\.com/jobs",
]


def is_aggregator_domain(url: str) -> bool:
    """Check whether a URL belongs to a known aggregator/directory."""
    if not url:
        return False
    domain = urlparse(url).netloc.lower()
    return any(re.search(pat, domain) for pat in AGGREGATOR_PATTERNS)


# ── DOM Indexing JavaScript ──────────────────────────────────────────────────
_DOM_INDEXER_JS = """
() => {
  // Clear any existing attributes
  document.querySelectorAll('[data-agent-id]').forEach(el => el.removeAttribute('data-agent-id'));

  const selectors = [
    'a[href]',
    'button',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    '[role="button"]',
    '[role="link"]',
    '[role="combobox"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[tabindex]:not([tabindex="-1"])'
  ];

  const elements = [];
  const nodes = document.querySelectorAll(selectors.join(', '));
  let count = 0;

  for (const el of nodes) {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);

    if (
      rect.width <= 0 ||
      rect.height <= 0 ||
      style.visibility === 'hidden' ||
      style.display === 'none' ||
      style.opacity === '0'
    ) {
      continue;
    }

    el.setAttribute('data-agent-id', String(count));

    let label = (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ');
    if (!label) {
      label = el.getAttribute('aria-label') ||
              el.getAttribute('placeholder') ||
              el.getAttribute('title') ||
              el.getAttribute('value') ||
              el.getAttribute('name') || '';
    }
    label = label.slice(0, 50);

    const tag = el.tagName.toLowerCase();
    const typeAttr = el.getAttribute('type') || '';
    const href = tag === 'a' ? (el.getAttribute('href') || '').slice(0, 80) : '';

    elements.push({
      id: count,
      tag: tag,
      type: typeAttr,
      label: label,
      href: href,
      summary: `[${count}] <${tag}${typeAttr ? ` type="${typeAttr}"` : ''}> "${label}"${href ? ` -> ${href}` : ''}`
    });

    count++;
    if (count >= 75) break; // Limit elements for fast prompt processing
  }

  return elements;
}
"""


async def _call_llm_decision(
    goal: str,
    elements: List[Dict[str, Any]],
    current_url: str,
    action_history: List[str]
) -> Dict[str, Any]:
    """Ask fast LLM to choose the next action and target element in one round trip."""
    elements_table = "\n".join(e["summary"] for e in elements)
    history_str = "\n".join(f"- {a}" for a in action_history[-4:]) if action_history else "None"

    system_prompt = (
        "You are an ultrafast browser navigation agent. Choose the exact next browser action.\n"
        "Allowed actions:\n"
        "  - CLICK: target_id (integer element index)\n"
        "  - TYPE: target_id (integer), value (string text to type)\n"
        "  - SELECT: target_id (integer), value (option label or value)\n"
        "  - SCROLL_DOWN: scroll viewport\n"
        "  - WAIT: wait for network/page load\n"
        "  - DONE: goal is achieved or final page reached\n\n"
        "Respond ONLY with a JSON object: {\"action\": \"...\", \"target_id\": <int or null>, \"value\": \"...\", \"thought\": \"...\"}."
    )

    user_prompt = (
        f"GOAL: {goal}\n"
        f"CURRENT URL: {current_url}\n"
        f"ACTIONS TAKEN SO FAR:\n{history_str}\n\n"
        f"INTERACTIVE PAGE ELEMENTS:\n{elements_table}\n\n"
        "Decision JSON:"
    )

    # 0. Primary: TypeSafe AI Jev System One (sub-second typed probabilistic decision)
    typesafe_key = os.environ.get("TYPESAFE_API_KEY")
    if typesafe_key and elements:
        try:
            from typesafe_sdk import TypeSafeClient, Choice

            state = (
                f"GOAL: {goal}\n"
                f"CURRENT URL: {current_url}\n"
                f"HISTORY: {history_str}"
            )
            criteria: Dict[str, str] = {}
            for e in elements[:35]:
                label = (e.get("text") or e.get("placeholder") or e.get("name") or e.get("role") or "").strip()[:50]
                criteria[f"elem_{e['id']}"] = f"<{e.get('tag', 'elem')}> {label}"
            criteria["scroll_down"] = "Scroll down the page to find more content or links"
            criteria["done"] = "Target goal is already achieved or final content reached"

            client = TypeSafeClient(api_key=typesafe_key)
            result = client.system_one(
                state=state,
                questions={
                    "next_step": Choice(
                        instructions="Which element should the browser interact with next to achieve the goal?",
                        criteria=criteria,
                    )
                },
            )
            chosen = result.choices["next_step"].choice
            logger.info("DOM Agent: TypeSafe Jev System One selected: %s", chosen)
            if chosen == "scroll_down":
                return {"action": "SCROLL_DOWN", "target_id": None, "thought": "TypeSafe Jev: scroll down for more content"}
            elif chosen == "done":
                return {"action": "DONE", "target_id": None, "thought": "TypeSafe Jev: goal accomplished"}
            elif chosen.startswith("elem_"):
                elem_id = int(chosen.split("_")[1])
                matched = next((e for e in elements if e["id"] == elem_id), None)
                if matched and matched.get("tag") in ("input", "textarea"):
                    return {"action": "TYPE", "target_id": elem_id, "value": goal, "thought": f"TypeSafe Jev: typing into element {elem_id}"}
                return {"action": "CLICK", "target_id": elem_id, "thought": f"TypeSafe Jev: clicking element {elem_id}"}
        except Exception as ts_err:
            logger.warning("DOM Agent: TypeSafe decision fallback triggered: %s", ts_err)

    for env_var, base_url, model in _LLM_PROVIDERS:
        api_key = os.environ.get(env_var)
        if not api_key:
            continue
        try:
            logger.info("DOM Agent: querying %s (%s)", env_var, model)
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "temperature": 0.0,
                        "max_tokens": 512,
                        "response_format": {"type": "json_object"} if "groq" in base_url or "openai" in base_url else None,
                    },
                )
            if resp.status_code != 200:
                logger.warning("LLM provider %s returned status %d: %s", env_var, resp.status_code, resp.text[:150])
                continue

            content = resp.json()["choices"][0]["message"]["content"].strip()
            # Clean markdown fences
            if content.startswith("```"):
                content = content.split("```", 2)[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.rsplit("```", 1)[0].strip()

            decision = json.loads(content)
            decision["action"] = str(decision.get("action", "DONE")).upper().strip()
            return decision

        except Exception as exc:
            logger.warning("DOM Agent decision failed on %s: %s", env_var, exc)
            continue

    return {"action": "DONE", "thought": "No working LLM provider available"}


# ── Native Fast DOM Agent Runner ──────────────────────────────────────────────

async def run_native_dom_agent(
    url: str,
    goal: str,
    max_steps: int = 5,
    timeout_seconds: float = 45.0,
) -> Dict[str, Any]:
    """
    Executes an ultrafast DOM-indexed browser navigation loop using Playwright.
    """
    from playwright.async_api import async_playwright

    start_time = time.monotonic()
    actions_taken: List[str] = []
    final_html = ""
    final_url = url
    success = False

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
            ],
        )

        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
        )

        page = await context.new_page()

        try:
            logger.info("DOM Agent navigating to: %s", url)
            await page.goto(url, wait_until="domcontentloaded", timeout=25_000)
            await page.wait_for_timeout(1000)

            for step in range(1, max_steps + 1):
                if (time.monotonic() - start_time) > timeout_seconds:
                    logger.warning("DOM Agent hit timeout (%ds)", timeout_seconds)
                    break

                final_url = page.url
                elements = await page.evaluate(_DOM_INDEXER_JS)

                if not elements:
                    logger.info("No interactive elements found, stopping.")
                    break

                decision = await _call_llm_decision(goal, elements, page.url, actions_taken)
                action = decision.get("action", "DONE")
                target_id = decision.get("target_id")
                value = decision.get("value", "")
                thought = decision.get("thought", "")

                action_desc = f"Step {step}: {action} target={target_id} val='{value}' ({thought})"
                actions_taken.append(action_desc)
                logger.info(action_desc)

                if action == "DONE":
                    success = True
                    break

                elif action == "CLICK" and target_id is not None:
                    locator = page.locator(f'[data-agent-id="{target_id}"]').first
                    if await locator.count() > 0:
                        try:
                            # If click opens a new tab, catch it
                            async with context.expect_page(timeout=3000) as new_page_info:
                                await locator.click(timeout=4000)
                            new_page = await new_page_info.value
                            await new_page.wait_for_load_state("domcontentloaded", timeout=5000)
                            page = new_page
                        except Exception:
                            # Normal in-page click or navigation
                            await page.wait_for_timeout(1500)
                    else:
                        logger.warning("Element %s not found on page", target_id)

                elif action == "TYPE" and target_id is not None:
                    locator = page.locator(f'[data-agent-id="{target_id}"]').first
                    if await locator.count() > 0:
                        await locator.fill(str(value))
                        await page.keyboard.press("Enter")
                        await page.wait_for_timeout(1500)

                elif action == "SELECT" and target_id is not None:
                    locator = page.locator(f'[data-agent-id="{target_id}"]').first
                    if await locator.count() > 0:
                        try:
                            await locator.select_option(label=str(value), timeout=3000)
                        except Exception:
                            await locator.select_option(value=str(value), timeout=3000)
                        await page.wait_for_timeout(1000)

                elif action == "SCROLL_DOWN":
                    await page.evaluate("window.scrollBy(0, 600)")
                    await page.wait_for_timeout(800)

                elif action == "WAIT":
                    await page.wait_for_timeout(2500)

            final_url = page.url
            final_html = await page.content()

        except Exception as exc:
            logger.error("DOM Agent error: %s", exc, exc_info=True)
            final_url = page.url
            try:
                final_html = await page.content()
            except Exception:
                final_html = ""
        finally:
            await context.close()
            await browser.close()

    duration_ms = int((time.monotonic() - start_time) * 1000)
    return {
        "success": success,
        "final_url": final_url,
        "actions_taken": actions_taken,
        "duration_ms": duration_ms,
        "html": final_html,
    }


# ── Deep ATS Employer Redirect Resolver ───────────────────────────────────────

async def resolve_ats_redirect(
    url: str,
    max_clicks: int = 3,
    timeout_seconds: float = 25.0,
) -> Dict[str, Any]:
    """
    Specifically targets job aggregator listings (e.g. BrighterMonday, ReliefWeb, Ajiraport):
    1. Loads the page.
    2. Identifies 'Apply Now', 'Company Website', 'External Application' buttons.
    3. Clicks through intermediate redirect pages and popups.
    4. Returns the final external canonical ATS/employer URL.
    """
    from playwright.async_api import async_playwright

    start_time = time.monotonic()
    resolved_url: Optional[str] = None
    original_domain = urlparse(url).netloc.lower()

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        )
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            )
        )
        page = await context.new_page()

        # Listen for popup pages (e.g. target="_blank" application buttons)
        popup_holder: List[Any] = []
        context.on("page", lambda p_page: popup_holder.append(p_page))

        try:
            logger.info("Resolving ATS redirect for: %s", url)
            await page.goto(url, wait_until="domcontentloaded", timeout=18_000)
            await page.wait_for_timeout(1000)

            # Heuristic first: look for direct apply links in DOM
            apply_keywords = ["apply", "original", "company website", "postuler", "pakua", "employer"]
            elements = await page.evaluate(_DOM_INDEXER_JS)

            # Find candidates matching apply keywords
            candidates = [
                e for e in elements
                if any(kw in e["label"].lower() for kw in apply_keywords)
            ]

            target_id = None
            if candidates:
                # Pick the most relevant candidate
                target_id = candidates[0]["id"]
            else:
                # Ask LLM to pick the apply button
                goal = "Click the button or link that allows the applicant to apply directly on the employer or company website."
                decision = await _call_llm_decision(goal, elements, page.url, [])
                if decision.get("action") == "CLICK" and decision.get("target_id") is not None:
                    target_id = decision.get("target_id")

            if target_id is not None:
                locator = page.locator(f'[data-agent-id="{target_id}"]').first
                if await locator.count() > 0:
                    href = await locator.get_attribute("href")
                    if href and href.startswith("http") and not is_aggregator_domain(href):
                        resolved_url = href
                    else:
                        # Click and wait for navigation or popup
                        try:
                            await locator.click(timeout=5000)
                            await page.wait_for_timeout(2500)
                        except Exception as click_err:
                            logger.warning("Click failed during ATS resolution: %s", click_err)

            # Check if a popup was opened
            if popup_holder:
                popup = popup_holder[-1]
                await popup.wait_for_load_state("domcontentloaded", timeout=4000)
                if not is_aggregator_domain(popup.url):
                    resolved_url = popup.url

            # Check if active page navigated away from original aggregator domain
            if not resolved_url and not is_aggregator_domain(page.url) and page.url != url:
                resolved_url = page.url

        except Exception as exc:
            logger.error("ATS redirect resolution failed for %s: %s", url, exc)
        finally:
            await context.close()
            await browser.close()

    duration_ms = int((time.monotonic() - start_time) * 1000)
    return {
        "success": bool(resolved_url),
        "source_url": url,
        "employer_url": resolved_url,
        "duration_ms": duration_ms,
    }


# ── Optional Engines Dispatcher ───────────────────────────────────────────────

async def run_browser_agent(
    url: str,
    goal: str,
    engine: AgentEngine = "native",
    max_steps: int = 5,
) -> Dict[str, Any]:
    """
    Main entry point supporting native, browser_use, or typesafe engines.
    """
    # Engine: TypeSafe Jev Ultrafast
    if engine == "typesafe":
        typesafe_key = os.environ.get("TYPESAFE_API_KEY")
        if not typesafe_key:
            logger.warning("TYPESAFE_API_KEY is not set — falling back to 'native' DOM agent.")
        else:
            try:
                # If jev_ultrafast package is installed
                from jev_ultrafast import Agent as JevAgent  # type: ignore
                logger.info("Running via TypeSafe Jev Ultrafast engine for %s", url)
                with JevAgent(url, goal) as agent:
                    agent.run()
                return {"success": True, "engine_used": "typesafe", "final_url": url}
            except ImportError:
                logger.warning("jev_ultrafast is not installed. Falling back to native DOM agent.")

    # Engine: browser-use
    if engine == "browser_use":
        try:
            from browser_use import Agent as BUseAgent  # type: ignore
            from langchain_google_genai import ChatGoogleGenerativeAI  # type: ignore

            google_key = os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY") or os.environ.get("GEMINI_API_KEY")
            if google_key:
                llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=google_key)
                agent = BUseAgent(task=goal, llm=llm, use_vision=False)
                result = await agent.run()
                return {"success": True, "engine_used": "browser_use", "result": str(result)}
        except ImportError:
            logger.warning("browser-use or langchain-google-genai not installed. Falling back to native DOM agent.")

    # Default: Native Fast DOM Agent
    result = await run_native_dom_agent(url=url, goal=goal, max_steps=max_steps)
    result["engine_used"] = "native"
    return result
