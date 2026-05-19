# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ProfSummarizer is an AI-powered lecture study companion. Users record or upload audio, get transcripts + AI-generated Cornell notes/flashcards/quizzes, and can chat with an "AI professor" about the material.

## Repository Structure

```
Prof-Summarizer/
├── frontend/           # React 19 + TypeScript + Vite SPA
├── backend/
│   └── supabase/
│       ├── functions/  # Deno Edge Functions (11 total)
│       ├── migrations/ # SQL schema migrations
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
supabase secrets set KEY=value           # Set backend secrets
```

## Architecture

### Frontend

**Stack:** React 19, TypeScript, Vite 6, Tailwind CSS (CDN — no PostCSS build step)

**State:** `AppContext` (`src/context/AppContext.tsx`) is the single source of truth for user, lectures, courses, settings, and agent jobs. Auth users sync from Supabase; guest users persist to `localStorage`.

**Service layer** (`src/services/`):
- `api.ts` — `callEdgeFunction(name, body)` wraps all backend calls with JWT auth headers
- `storageService.ts` — CRUD for lectures/courses; branches on auth vs. guest
- `settingsService.ts` — User settings CRUD
- `agentService.ts` — Agent job orchestration
- `notionService.ts` / `canvasService.ts` — Third-party integrations

**Routing** (`App.tsx`): `/record`, `/lecture/:id`, `/settings`, `/study-planner`, `/onboarding`

**3-column shell:** Course rail (w-56) → Lecture list panel (w-64) → Main content area

**All types** are in `src/types.ts`: `SavedLecture`, `CornellNotes`, `Flashcard`, `QuizQuestion`, `UserSettings`, `Course`, `AgentJob`.

### Backend (Supabase Edge Functions, Deno runtime)

Each function lives in `backend/supabase/functions/<name>/index.ts`. Shared utilities are in `_shared/`:
- `ai-provider.ts` — `resolveAIConfig(userId)` fetches user's provider + decrypts API key; falls back to platform Gemini key
- `gemini.ts` — Gemini-specific helpers
- `notion-oauth.ts` — Notion OAuth utilities

**Functions:** `transcribe`, `summarize`, `chat`, `generate-flashcards`, `generate-quiz`, `ask-professor`, `export-notion`, `canvas-proxy`, `agent-run`, `notion-oauth-callback`, `list-models`

**AI providers supported:** Gemini (default platform key), OpenAI, Anthropic, OpenRouter (user-supplied keys, encrypted at rest)

### Database Schema

Key tables (all with RLS scoped to `user_id`):

- **lectures** — `transcript`, `summary`, `cornell_notes`, `flashcards`, `quiz_data` (JSONB columns), `confusion_markers` (int[]), `course_id`
- **courses** — `name`, `color`, `syllabus_file_path`
- **user_settings** — `ai_provider`, `ai_model`, `*_api_key_enc` (encrypted), `notion_oauth_token_enc`, agent toggles
- **agent_jobs** — `agent_type`, `status`, `result` (JSONB), `lecture_id`

Migrations are plain SQL in `backend/supabase/migrations/` (no ORM). Always add new migrations rather than editing existing ones.

### Auth

- **Auth users:** Google OAuth → Supabase JWT. All Edge Functions verify JWT; include `Authorization: Bearer <token>` header via `callEdgeFunction`.
- **Guest mode:** No login; data in `localStorage` (`prof_summarizer_lectures_guest`, `prof_summarizer_courses_guest`).
- **Exception:** `notion-oauth-callback` has `verify_jwt = false` in `config.toml` (Notion redirect doesn't carry JWT).

## Environment Variables

**Frontend** (`.env.local`):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

**Backend** (set via `supabase secrets set`):
```
GEMINI_API_KEY          # Platform-level default AI key
APP_ENCRYPTION_KEY      # 32-char secret; encrypts user API keys + OAuth tokens
ALLOWED_ORIGIN          # CORS whitelist (e.g. http://localhost:3000)
NOTION_CLIENT_ID
NOTION_CLIENT_SECRET
NOTION_OAUTH_REDIRECT_URI
```

## Key Conventions

- **Styling:** Tailwind utilities only; no component library. Design tokens: cream `#faf8f5` background, amber-800 primary CTA. Fonts: DM Serif Display (headers) + Inter (body), loaded via CDN in `index.html`.
- **Course colors:** Use `displayCourseColor()` helper — normalizes legacy color values.
- **Edge Function errors:** Return `{ error: string, code: string }` JSON. Keep processing under 110s (hard timeout ~150s).
- **Agent jobs:** Rate-limited to 10/user/hour. Heavy AI workloads (study planner) benefit from faster models like `openai/gpt-4o-mini`.
- **User API keys:** Always encrypted server-side via `APP_ENCRYPTION_KEY`; never stored or logged in plaintext.
- **RLS:** Every new table must have Row Level Security policies scoped to `user_id = auth.uid()`.
