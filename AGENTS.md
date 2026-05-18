# AGENTS.md — ProfSummarizer

Guide for AI coding agents working in this repository.

---

## What this project is

**ProfSummarizer** is an AI-powered lecture study companion. Users record or upload lecture audio (and optional slides/images), get transcription and structured notes, then study with flashcards, quizzes, and context-aware chat.

| Layer | Stack |
|--------|--------|
| Frontend | React 19, TypeScript, Vite 6, React Router 6 |
| Styling | Tailwind CSS (CDN in `frontend/index.html`), Inter font |
| Backend | Supabase Edge Functions (Deno) |
| Database | PostgreSQL on Supabase (SQL migrations, **not Drizzle**) |
| Auth | Supabase Auth (Google OAuth) + guest mode (`localStorage`) |
| AI | Google Gemini (default); optional user keys via encrypted `user_settings` |
| Deploy | Frontend → Vercel (`frontend/`); backend → `supabase functions deploy` |

There is **no root `package.json`**. All npm scripts live under `frontend/`.

---

## Repository layout

```
Prof-Summarizer/
├── frontend/                 # Vite React SPA (primary app code)
│   └── src/
│       ├── App.tsx           # Routes, auth gate, shell layout
│       ├── pages/            # RecordPage, LectureDetailPage, SettingsPage, OnboardingPage
│       ├── components/       # UI components
│       ├── context/          # AppContext (user, lectures, settings)
│       ├── services/         # supabase, api, storage, agents, canvas, notion
│       ├── utils/
│       └── constants/
├── backend/
│   └── supabase/
│       ├── config.toml       # Local Supabase + function JWT overrides
│       ├── migrations/       # 001–004 SQL migrations
│       └── functions/        # Edge Functions (see below)
├── README.md
└── AGENTS.md                 # This file
```

### Edge Functions (`backend/supabase/functions/`)

| Function | Role |
|----------|------|
| `transcribe` | Audio → text (Gemini) |
| `summarize` | Transcript → summary + Cornell notes |
| `generate-flashcards` | Study cards from lecture |
| `generate-quiz` | Multiple-choice quiz |
| `chat` | Context-aware Q&A |
| `user-settings` | AI provider, courses, onboarding flags |
| `agent-run` | Auto-organizer, study planner, research, pipeline |
| `canvas-proxy` | Canvas LMS integration |
| `notion-oauth-start` / `notion-oauth-callback` / `notion-proxy` | Notion OAuth + API proxy |

Shared utilities: `backend/supabase/functions/_shared/` (`ai-provider`, `gemini`, `notion-oauth`, etc.).

---

## How the app works

### Routing (`frontend/src/App.tsx`)

| Route | Page |
|-------|------|
| `/` | `RecordPage` — record/upload → transcribe → summarize |
| `/lecture/:id` | `LectureDetailPage` — notes, study mode, chat, Notion export |
| `/settings` | `SettingsPage` — AI, courses, Notion, agents |
| `*` | Redirect to `/` |

### Auth gate

1. No user → `AuthForm` (Google OAuth or guest).
2. Authenticated user with `hasCompletedOnboarding === false` → `OnboardingPage`.
3. Otherwise → main shell (sidebar + routes).

**Guest mode** uses synthetic user `id: 'guest'` and persists lectures/courses in `localStorage` (`prof_summarizer_lectures_guest`, `prof_summarizer_courses_guest`). **Signed-in users** sync via Supabase `lectures` / `courses` tables.

### Core lecture pipeline (`RecordPage.tsx`)

```
IDLE → RECORDING → REVIEWING → TRANSCRIBING → SUMMARIZING → save → /lecture/:id
```

- **Confusion markers** — timestamps during recording; passed into `summarize` for extra explanation.
- **API layer** — `frontend/src/services/api.ts` calls Edge Functions with `Authorization: Bearer <access_token>`.
- **Storage** — `frontend/src/services/storageService.ts` saves to Supabase or guest `localStorage`.

### Study mode (`LectureDetailPage.tsx`)

Cornell notes, flashcards, quiz (5/10/15/20), and chat are loaded/generated via respective Edge Functions and stored on the `lectures` row (`cornell_notes`, `flashcards`, `quiz_data` JSONB columns).

### Settings & integrations

- **AI** — Provider/model/API keys in `user_settings` (encrypted server-side with `APP_ENCRYPTION_KEY`).
- **Courses** — Manual entry, `.ics` import, PDF schedule import; optional syllabus upload to Storage bucket `course-documents`.
- **Notion** — OAuth from Settings; export from lecture detail.
- **Canvas** — `canvas-proxy` + `canvasService.ts`.
- **Agents** — `agentService.ts` → `agent-run` (rate limit: 10 jobs/user/hour).

---

## Environment variables

### Frontend — `frontend/.env.local`

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Used in `frontend/src/services/supabase.ts`, `api.ts`, `settingsService.ts`, `notionService.ts`.

Optional (Vite root `.env`): `GEMINI_API_KEY` — legacy define; primary AI runs on Edge Functions.

### Backend — Supabase secrets (`cd backend`)

```bash
supabase secrets set GEMINI_API_KEY=...
supabase secrets set APP_ENCRYPTION_KEY=...    # 32-char secret for encrypting user keys/tokens
supabase secrets set ALLOWED_ORIGIN=http://localhost:3000
# Notion (optional):
supabase secrets set NOTION_CLIENT_ID=...
supabase secrets set NOTION_CLIENT_SECRET=...
supabase secrets set NOTION_OAUTH_REDIRECT_URI=https://YOUR_PROJECT_REF.supabase.co/functions/v1/notion-oauth-callback
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically in Edge Functions.

---

## Commands

Run from **`frontend/`** unless noted.

| Task | Command |
|------|---------|
| Dev server | `npm run dev` → http://localhost:3000 |
| Production build | `npm run build` → `frontend/dist` |
| Preview build | `npm run preview` |
| Unit tests | `npm run test` or `npm run test:watch` |

**Backend** (from `backend/`):

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy
# Optional helper:
node scripts/deploy-all-functions.mjs
```

There is **no ESLint script** in `package.json`. After substantive frontend changes, run `npm run build` and `npm run test`.

---

## Database schema changes

This project uses **Supabase SQL migrations** in `backend/supabase/migrations/`, not Drizzle.

| Migration | Purpose |
|-----------|---------|
| `001_study_mode.sql` | Cornell notes, flashcards, quiz, confusion markers on `lectures` |
| `002_courses_and_settings.sql` | `courses`, `user_settings`, `agent_jobs`, encryption RPCs |
| `003_lectures_update_policy.sql` | RLS UPDATE on `lectures` |
| `004_notion_oauth.sql` | Notion OAuth fields on `user_settings` |

**When changing schema:**

1. Add a new numbered SQL file under `backend/supabase/migrations/`.
2. Apply locally: `supabase db reset` or `supabase migration up` (from `backend/`).
3. Apply to remote: `supabase db push` for linked projects, or run migration SQL in Supabase Dashboard if that matches your workflow.

**Do not** use Drizzle in this repo unless the stack is explicitly migrated. The base `lectures` table is assumed to exist from initial Supabase setup (see `README.md`).

**RLS:** New tables must have owner-scoped policies consistent with `courses`, `user_settings`, and `lectures`.

---

## UI design

Follow **`DESIGN.md`** when it exists at the repo root. If absent, match existing patterns:

- Tailwind via CDN (`frontend/index.html`)
- Primary: `blue-600` / `blue-700`
- Surfaces: white cards, `rounded-xl`–`rounded-[40px]`, `border-gray-100`
- Layout: full-height shell, sticky header, 72px sidebar (`HistorySidebar`)
- Font: Inter
- Course accent colors: `frontend/src/constants/courseColors`

Do not introduce a second design system or CSS framework without explicit approval.

---

## Conventions for agents

- **Frontend changes** → `frontend/src/`; prefer extending `services/` and `AppContext` over duplicating fetch logic.
- **Backend changes** → new or edited function under `backend/supabase/functions/`; reuse `_shared/` helpers.
- **Types** → `frontend/src/types.ts` for shared frontend types.
- **JWT:** Most functions require `Authorization: Bearer`. Exception: `notion-oauth-callback` has `verify_jwt = false` in `config.toml` (Notion redirect has no auth header).
- **Secrets:** Never commit `.env`, `.env.local`, or API keys. `.gitignore` already excludes them.

---

# CRITICAL RULES — MUST FOLLOW

## RESPONSES

- Keep responses concise and to the point — unless the user asks otherwise.

## PLANNING MODE

- Always ask clarifying questions.
- Never assume design, tech stack, or features.
- Use deep-dive sub-agents to assist with research.
- Use deep-dive sub-agents to review the different aspects of your plan before presenting to the user.

## CHANGE / EDIT MODE

- Never implement features yourself when possible — use sub-agents!
- Identify changes from the plan that can be implemented in parallel, and use sub-agents to implement the features efficiently.
- When using sub-agents to implement features, act as a coordinator only.
- Use the best model for the task — premium models for complex tasks (like coding) and mid-tier models for simpler tasks, like documentation.
- After completing features (large or small), always run commands like lint, type check, and build to check code quality. For this repo: `npm run build` and `npm run test` from `frontend/`.

## DATABASE SCHEMA CHANGES

- Whenever you make changes to the database schema, add a Supabase migration under `backend/supabase/migrations/` and apply it with the Supabase CLI (`supabase migration up` / `supabase db push`). Do **not** edit production schema only via the Dashboard without a matching migration file.
- **This repo does not use Drizzle.** Do not run `drizzle-kit push`. If Drizzle is introduced later, prefer `drizzle-kit generate` + migrate workflows over `push`.

## TESTING

- Use any testing tools, libraries available to the project for testing your changes.
- Never assume your changes simply work — always test!
- If the project does not have any testing tools, scripts, MCP tools, skills, etc. available for testing, ask the user whether testing should be skipped.

## UI DESIGN

- Always follow the UI design system when creating or reviewing components or pages.
- Design System: `DESIGN.md` (or conventions in `frontend/index.html` and existing components if `DESIGN.md` is missing).
