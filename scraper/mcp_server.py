"""
mcp_server.py — Scrapling MCP Server launcher for AkiliHub.

The Scrapling MCP server exposes web scraping tools over the Model Context
Protocol so AI agents (Gemini, Claude Code, Claude Desktop, etc.) can fetch,
render, and screenshot web pages without going through the FastAPI sidecar.

Available MCP tools (provided by Scrapling):
  fetch_page        — Fast HTTP fetch with TLS fingerprint spoofing
  fetch_page_dynamic— Playwright-based fetch for JS-heavy pages
  fetch_page_stealth— StealthyFetcher with Cloudflare bypass
  screenshot        — Capture a PNG screenshot of a page
  create_session    — Create a persistent browser session
  close_session     — Close a persistent browser session

Running modes
─────────────
1. stdio (default) — For Claude Code / Claude Desktop / local AI agents.
   The MCP server communicates over stdin/stdout; no port is opened.
   Register this script as the MCP server command in your AI client config.

   Example claude_desktop_config.json / .mcp.json entry:
   {
     "scrapling": {
       "command": "python",
       "args": ["/app/mcp_server.py", "--mode", "stdio"]
     }
   }

2. streamable-http — Exposes the MCP server as an HTTP endpoint, suitable
   for Docker deployments where both the FastAPI sidecar (port 7860) and
   the MCP server (port 8765) run as separate services.

   Start: python mcp_server.py --mode http --host 0.0.0.0 --port 8765

Usage
─────
  python mcp_server.py                        # stdio mode (default)
  python mcp_server.py --mode http            # HTTP on 0.0.0.0:8765
  python mcp_server.py --mode http --port 9000
"""

from __future__ import annotations

import argparse
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    stream=sys.stderr,  # Keep stdout clean for MCP stdio protocol
)
logger = logging.getLogger("scrapling-mcp")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="AkiliHub Scrapling MCP Server",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument(
        "--mode",
        choices=["stdio", "http"],
        default="stdio",
        help="Transport mode: 'stdio' for local AI agent integration "
             "(default), 'http' for Docker / remote access.",
    )
    p.add_argument(
        "--host",
        default="0.0.0.0",
        help="Bind host for HTTP mode (default: 0.0.0.0).",
    )
    p.add_argument(
        "--port",
        type=int,
        default=8765,
        help="Bind port for HTTP mode (default: 8765).",
    )
    p.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Log verbosity.",
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()
    logging.getLogger().setLevel(args.log_level)

    try:
        from scrapling.server import ScraplingMCPServer
    except ImportError:
        logger.error(
            "Scrapling MCP server module not found. "
            "Ensure scrapling[all] >= 0.4.0 is installed: "
            "pip install 'scrapling[all]>=0.4.0'"
        )
        sys.exit(1)

    server = ScraplingMCPServer()

    if args.mode == "stdio":
        logger.info("Starting Scrapling MCP server in stdio mode.")
        server.run_stdio()

    elif args.mode == "http":
        logger.info(
            "Starting Scrapling MCP server in streamable-HTTP mode on %s:%d",
            args.host,
            args.port,
        )
        server.run_http(host=args.host, port=args.port)


if __name__ == "__main__":
    main()
