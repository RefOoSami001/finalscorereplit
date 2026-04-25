# Workspace

## Overview

FinalScore — a modern Arabic (RTL) student grades portal for Minia University. Students log in with their national ID + portal password, and the app fetches, structures, and visualizes their full transcript across years and semesters with statistics, charts, and an export option. Rebuilt from a Flask + Jinja prototype into a React + Vite frontend backed by an Express API server.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Validation**: Zod (`zod/v4`)
- **API codegen**: Orval (from OpenAPI spec)
- **Image processing**: sharp
- **Frontend**: React 19, Vite, Tailwind v4, shadcn/ui, Recharts, framer-motion, wouter, react-hook-form

## Artifacts

- `artifacts/finalscore` (`/`) — React + Vite frontend (login + grades dashboard, Arabic RTL).
- `artifacts/api-server` (`/api`) — Express server. Owns `POST /api/grades` which authenticates against the upstream Minia portal and returns the full grades payload. Also forwards a notification to a Telegram chat (configurable via `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`).
- `artifacts/mockup-sandbox` — design sandbox (not part of the product).

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
