# ─── AkiliBrain — Next.js Production Dockerfile ───────────────────────────────
# Multi-stage build using output: 'standalone' for a minimal production image
# (next.config.ts enables it when NEXT_OUTPUT=standalone, which is set below).
# Based on the official Next.js Docker example:
# https://github.com/vercel/next.js/tree/canary/examples/with-docker
# ──────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine AS base

# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM base AS deps
# libc6-compat is required for Alpine compatibility with native Node.js modules
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Puppeteer is a dev dependency used by ad-hoc scripts only — never download Chromium here.
ENV PUPPETEER_SKIP_DOWNLOAD=1 PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

COPY package.json package-lock.json ./
# `npm ci` honours the lockfile (the old `npm install` could silently drift from CI).
RUN npm ci --legacy-peer-deps --no-audit --no-fund

# ── Stage 2: Build the application ───────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars must be available at build time so they get inlined.
# Pass them as build args from your CI/CD pipeline or docker-compose.
# NOTE: DATABASE_URL / DIRECT_URL are deliberately NOT build args any more — baking
# database credentials into image layers/build cache is unnecessary (all pages render at
# request time) and leaks them via `docker history`.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_ADSENSE_PUB_ID
ARG NEXT_PUBLIC_CLARITY_ID

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_ADSENSE_PUB_ID=$NEXT_PUBLIC_ADSENSE_PUB_ID
ENV NEXT_PUBLIC_CLARITY_ID=$NEXT_PUBLIC_CLARITY_ID

# Emit .next/standalone; skip the memory-hungry TS worker here (CI runs `npm run typecheck`).
ENV NEXT_OUTPUT=standalone
ENV SKIP_TYPECHECK=1
ENV IS_BUILD_PHASE=1

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: Production runner ────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only what standalone needs
COPY --from=builder /app/public ./public

# Standalone output puts the server in .next/standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# /api/health returns 503 when the database is unreachable.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/api/health" || exit 1

# next start is replaced by the standalone server.js
CMD ["node", "server.js"]
