# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ProfSummarizer is an AI-powered lecture study companion. Users record or upload audio, get transcripts + AI-generated Cornell notes/flashcards/quizzes, and can chat with an "AI professor" about the material. **BYOK only** — users supply their own API keys (encrypted for signed-in users; localStorage for guests).

## Repository Structure

```
Prof-Summarizer/
├── frontend/           # React 19 + TypeScript + Vite SPA
├── backend/
│   └── supabase/
│       ├── functions/  # Deno Edge Functions (11 total)
│       ├── migrations/ # SQL schema migrations (001–006)
│       └── config.toml
└── DESIGN.md           # Warm Campus design system spec
```

**No root `package.json`** — all npm commands run from `frontend/`.

## Commands

### Frontend (run from `frontend/`)
```bash
npm run dev        # Dev server at http://localhost:3000
npm run build      # Production build → frontend/dist/
npm run preview    # Preview production build
npm run test       # Run Vitest tests once
npm run test:watch # Vitest watch mode
```

### Backend (Supabase CLI, run from `backend/`)
```bash
supabase start                           # Start local Supabase stack
supabase functions deploy                # Deploy all Edge Functions
supabase functions deploy <name>         # Deploy single function
supabase db reset                        # Fresh DB + all migrations (local)
supabase migration up                    # Apply pending migrations
supabase db push                         # Apply migrations to linked remote
supabase secrets set KEY=value           # Set backend secrets
```

## Architecture

### Frontend

**Stack:** React 19, TypeScript, Vite 6, Tailwind CSS (CDN — no PostCSS build step)

**State:** `AppContext` (`src/context/AppContext.tsx`) is the single source of truth for user, lectures, courses, settings, and agent jobs. Auth users sync from Supabase; guest users persist to `localStorage`.

**Service layer** (`src/services/`):
- `api.ts` — `callEdgeFunction(name, body)` wraps backend calls; forwards guest AI keys when no session
- `guestSettingsService.ts` — guest AI settings in localStorage
- `storageService.ts` — CRUD for lectures/courses; branches on auth vs. guest
- `settingsService.ts` — User settings CRUD (signed-in)
- `aiModelsService.ts` — dynamic model catalog via `list-ai-models`
- `agentService.ts` — Agent job orchestration
- `notionService.ts` — Notion OAuth + export

**Routing** (`App.tsx`): `/`, `/lecture/:id`, `/settings`, `/inbox`, `/saved`, `/planner` (gated by `STUDY_PLANNER_ENABLED`)

**Feature flags:** `frontend/src/constants/featureFlags.ts` — `STUDY_PLANNER_ENABLED = false` hides study planner UI.

**All types** are in `src/types.ts`.

### Backend (Supabase Edge Functions, Deno runtime)

Shared utilities in `_shared/`:
- `ai-provider.ts` — `resolveAIConfigFromHttpRequest()` — signed-in: encrypted DB keys; guest: anon JWT + body-forwarded keys
- `gemini.ts`, `list-models-utils.ts`, `notion-oauth.ts`

**Functions:** `transcribe`, `summarize`, `chat`, `generate-flashcards`, `generate-quiz`, `user-settings`, `list-ai-models`, `agent-run`, `notion-oauth-start`, `notion-oauth-callback`, `notion-proxy`

**AI providers:** Gemini, OpenAI, Anthropic, OpenRouter — user-supplied keys only (no platform fallback for signed-in users).

### Database Schema

Key tables (RLS scoped to `user_id`):

- **lectures**, **courses**, **user_settings**, **agent_jobs**, **study_plans**

Migrations: plain SQL in `backend/supabase/migrations/` (no ORM).

### Auth

- **Auth users:** Google OAuth → Supabase JWT on Edge Function calls.
- **Guest mode:** Anon JWT + API keys forwarded in request body from `guestSettingsService`.
- **Exception:** `notion-oauth-callback` has `verify_jwt = false` in `config.toml`.

## Environment Variables

**Frontend** (`.env.local` or `.env`):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

**Backend** (set via `supabase secrets set`):
```
APP_ENCRYPTION_KEY      # Required — 32-char secret; encrypts user API keys + OAuth tokens
ALLOWED_ORIGIN          # CORS whitelist (e.g. http://localhost:3000)
NOTION_CLIENT_ID / NOTION_CLIENT_SECRET / NOTION_OAUTH_REDIRECT_URI  # optional
```

## Key Conventions

- **Styling:** Tailwind via CDN; cream `#faf8f5` background, amber-800 primary CTA.
- **Edge Function errors:** Return `{ error: string, code: string }` JSON.
- **Agent jobs:** Rate-limited to 10/user/hour.
- **User API keys:** Encrypted server-side via `APP_ENCRYPTION_KEY`; never logged in plaintext.
- **RLS:** Every new table must have policies scoped to `user_id = auth.uid()`.
