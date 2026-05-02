# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm run lint         # ESLint
npm run db:migrate   # prisma migrate dev
npm run db:seed      # seed database
```

No test runner is configured.

## Architecture

**Credi Insights** is a mobile-first Next.js PWA for Chinese credit card bill analysis (`lang="zh-CN"`). Users upload statement images → OCR extracts transactions → analytics dashboard shows spending breakdowns.

**Data flow:**
1. `POST /api/uploads` — accepts image, creates `Upload` record (status: PENDING)
2. OCR pipeline (`src/lib/ocr/`) processes image → status transitions PENDING → PROCESSING → DONE/FAILED
3. Parsed `Transaction` records are linked to the `Upload`
4. `GET /api/dashboard` aggregates transactions for charts

**Database:** SQLite via Prisma 6. Three models: `Upload`, `Transaction`, `Category`. Prisma client is generated to `src/generated/prisma/` (non-standard path — import from there, not `@prisma/client`). Singleton in `src/lib/db.ts`.

**API:** Next.js Route Handlers under `src/app/api/`. All responses follow a consistent envelope (see `src/lib/api-types.ts`).

**UI:** shadcn/ui + Base UI (`@base-ui/react`), Tailwind CSS v4, Recharts for charts, Zod v4 for validation.
