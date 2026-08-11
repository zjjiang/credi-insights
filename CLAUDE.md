# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Development Workflow (铁律 / non-negotiable)

These three rules are mandatory for every feature or fix. No exceptions without the user explicitly waiving a rule for that specific task.

1. **OpenSpec first.** Every change starts with an OpenSpec proposal under `openspec/changes/<name>/` (proposal → specs → design → tasks). Validate with `npx openspec validate <name> --strict` before writing code. No implementation before the spec is written and validated.
2. **TDD.** Write the failing test first (RED), implement to green (GREEN), then refactor. Never write implementation code before its test exists. Run the full test suite before opening a PR.
3. **PR-only merge.** All work lands via a feature branch + Pull Request into `main`. Never commit or push directly to `main`. Branch → commit → push `-u` → `gh pr create`.

> ⚠️ Test runner not yet configured (see below). TDD rule is blocked until one is set up — Vitest is the standard fit for this Next.js + TypeScript stack. Set it up before the next feature.

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

**Credi Insights** is a mobile-first Next.js PWA for Chinese credit card bill analysis (`lang="zh-CN"`). Users upload CMB (招商银行) `.msg` email statements → Python script parses transactions → AI auto-classifies → analytics shown per bill.

**Data flow:**
1. `POST /api/uploads` — accepts `.msg` file, saves to `data/uploads/`, spawns `scripts/parse_msg.py` via `src/lib/msg/parser.ts`
2. Python script extracts transactions + billing period (billingStart/billingEnd/dueDate) from HTML email body
3. If `ANTHROPIC_API_KEY` is set and rules exist, `src/lib/ai-classify.ts` calls Claude Haiku to auto-tag categories
4. Per-bill stats available via `GET /api/dashboard?uploadId=xxx`

**Database:** MySQL via Prisma 6. Five models: `Upload`, `Transaction`, `Category`, `Rule`, `Setting`. Prisma client generated to `src/generated/prisma/` — import from there, not `@prisma/client`. Singleton in `src/lib/db.ts`.

**Python dependency:** `extract-msg` must be installed in `.venv/`. Set `PYTHON_BIN` in `.env` to the venv Python path. Run `pip install -r scripts/requirements.txt` inside the venv.

**API:** Next.js Route Handlers under `src/app/api/`. All responses use `{ success, data?, error? }` envelope (see `src/lib/api-types.ts`).

**UI:** 3 pages — `/` (home: upload + history), `/settings` (AI key + classification rules), `/admin/transactions` (hidden full-edit table). shadcn/ui + Tailwind CSS v4, Recharts for charts. AI sidebar (`src/components/ai/`) uses SSE streaming from `/api/ai/chat`.

**Settings stored in DB:** `ANTHROPIC_API_KEY` is saved via `POST /api/settings` and read at runtime via `src/lib/settings.ts` — not from `.env`.
