# ─── Scrapling Sidecar — Dockerfile ───────────────────────────────────────────
# Runs two services via a startup script:
#   Port 7860 — FastAPI scraping sidecar (uvicorn)
#   Port 8765 — Scrapling MCP server (streamable HTTP, for AI agent access)
# ──────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Install OS dependencies for playwright + camoufox
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers and dependencies (Chromium for Scrapling)
RUN playwright install --with-deps chromium

# Fetch Camoufox browser binaries
RUN python -m camoufox fetch

COPY . .

# Create a writable directory for pause/resume crawl checkpoints
RUN mkdir -p /app/crawl_data

# Create writable Scrapling adaptive storage directory
RUN mkdir -p /root/.scrapling

EXPOSE 7860
EXPOSE 8765

# Startup script launches both services concurrently
CMD ["sh", "/app/start.sh"]
