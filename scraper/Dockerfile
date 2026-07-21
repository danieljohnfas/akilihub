# ─── Scrapling Sidecar — Dockerfile ───────────────────────────────────────────
# Extends the official python image and installs playwright/camoufox manually
# Port: 7860
# ──────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Install OS dependencies for playwright
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

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
