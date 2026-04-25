# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# Multi-stage build for the FinalScore monorepo (Koyeb / generic container).
# Single image serves both the Express API and the built Vite SPA on $PORT.
# ---------------------------------------------------------------------------

# ============================================================================
# 1. Builder — install all deps, build frontend + backend
# ============================================================================
FROM node:24-bookworm-slim AS builder

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:/pnpm/bin:$PATH \
    CI=true

# Build tools required by some native modules (sharp, etc.)
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates python3 build-essential \
 && rm -rf /var/lib/apt/lists/*

# Enable pnpm via corepack (matches the version in package.json)
RUN corepack enable && corepack prepare pnpm@10.4.0 --activate

WORKDIR /app

# Copy lockfiles + workspace manifests first so deps can be cached
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc tsconfig.base.json tsconfig.json ./
COPY artifacts/api-server/package.json   artifacts/api-server/package.json
COPY artifacts/finalscore/package.json    artifacts/finalscore/package.json
COPY artifacts/mockup-sandbox/package.json artifacts/mockup-sandbox/package.json
COPY lib/api-client-react/package.json    lib/api-client-react/package.json
COPY lib/api-spec/package.json            lib/api-spec/package.json
COPY lib/api-zod/package.json             lib/api-zod/package.json
COPY lib/db/package.json                  lib/db/package.json
COPY scripts/package.json                 scripts/package.json

# Install ALL deps (including dev) — needed for the build step
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Now copy the rest of the sources and build
COPY . .

# Build frontend (Vite) and backend (esbuild bundle)
ENV NODE_ENV=production \
    BASE_PATH=/
RUN pnpm run build:prod

# ============================================================================
# 2. Runtime — minimal image with only what's needed to run
# ============================================================================
FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:/pnpm/bin:$PATH

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable && corepack prepare pnpm@10.4.0 --activate

WORKDIR /app

# Copy everything from the builder. Simpler & safer than re-installing prod
# deps because the API server bundles via esbuild (its `dist/index.mjs`
# externalizes a few packages such as `sharp`, which must remain resolvable
# in node_modules at runtime).
COPY --from=builder /app /app

# Koyeb sets $PORT (defaults to 8000). Express reads it at startup.
EXPOSE 8000
ENV PORT=8000

# Drop privileges
USER node

CMD ["pnpm", "run", "start:prod"]
