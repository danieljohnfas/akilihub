# ─── Scrapling Sidecar — Dockerfile ───────────────────────────────────────────
# Extends the official Scrapling image which ships with Playwright browsers
# pre-installed (Chromium). This avoids the slow `playwright install` step.
#
# Port: 8001  (8000 is already taken by the Crawl4AI service)
# ──────────────────────────────────────────────────────────────────────────────
FROM d4vinci/scrapling:latest

WORKDIR /app

# Install FastAPI + Uvicorn on top of the base image
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create a writable directory for pause/resume crawl checkpoints
RUN mkdir -p /app/crawl_data

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
