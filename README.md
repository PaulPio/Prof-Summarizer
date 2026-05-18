# ProfSummarizer

AI-powered lecture transcription and study companion. Record or upload lectures, get Cornell Notes and summaries, then study with flashcards, quizzes, and context-aware chat.

## Features

- **Audio transcription** — Record in-browser or upload audio (MP3, WAV, WebM, M4A, OGG)
- **Cornell Notes** — Structured academic notes from each lecture
- **Flashcards & quizzes** — Auto-generated study tools (quizzes: 5 / 10 / 15 / 20 questions)
- **Chat with Professor** — Context-aware Q&A grounded in the lecture transcript
- **Confusion markers** — Mark confusing moments while recording for extra explanation in summaries
- **Cloud sync** — Google sign-in + Supabase storage, or **guest mode** (localStorage)
- **Courses** — Organize lectures by class; import schedules from `.ics` or text-based PDFs; optional syllabus upload
- **Multi-provider AI** — Gemini (default), OpenAI, Anthropic, or OpenRouter with per-user API keys (encrypted)
- **Notion** — OAuth connect and export notes from lecture detail
- **Canvas LMS** — Connect and browse course materials (via Edge Function proxy)
- **Agents** — Auto-organizer, study planner, research enrichment, and multi-step pipeline (optional in Settings)

## Project structure

```
Prof-Summarizer/
├── frontend/                    # Vite + React 19 SPA
│   ├── src/
│   │   ├── pages/               # Record, lecture detail, settings, onboarding
│   │   ├── components/
│   │   ├── context/             # AppContext (user, lectures, settings)
│   │   ├── services/            # API, storage, agents, notion, canvas
│   │   └── types.ts
│   ├── index.html               # Tailwind CDN, Inter font
│   └── package.json
│
├── backend/
│   ├── scripts/
│   │   └── deploy-all-functions.mjs
│   └── supabase/
│       ├── config.toml
│       ├── migrations/          # 001–004 SQL migrations
│       └── functions/           # Edge Functions (see below)
│
├── README.md
├── AGENTS.md                    # Agent / contributor architecture guide
├── PROMPT.md                    # Copy-paste system prompt for AI sessions
└── DESIGN.md                    # UI design system
```

### Edge Functions

| Function | Purpose |
|----------|---------|
| `transcribe` | Audio → transcript |
| `summarize` | Transcript → summary + Cornell notes |
| `generate-flashcards` | Lecture → flashcards |
| `generate-quiz` | Lecture → multiple-choice quiz |
| `chat` | Context-aware Q&A |
| `user-settings` | AI provider, keys, onboarding, agent toggles |
| `list-ai-models` | Live model catalog per provider |
| `agent-run` | Auto-organizer, study planner, research, pipeline |
| `canvas-proxy` | Canvas LMS API proxy |
| `notion-oauth-start` / `notion-oauth-callback` / `notion-proxy` | Notion OAuth + API |

Shared code: `backend/supabase/functions/_shared/`

## Getting started

### Prerequisites

- Node.js 18+
- npm
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- A Supabase project (Postgres + Auth + Edge Functions)

### Frontend

```bash
cd frontend
npm install
# Create frontend/.env.local (see Environment variables below)
npm run dev
```

App runs at **http://localhost:3000** (see `frontend/vite.config.ts`).

```bash
npm run build    # production build → frontend/dist
npm run test     # Vitest unit tests
```

### Backend

```bash
cd backend
supabase link --project-ref YOUR_PROJECT_REF
```

**Secrets:**

```bash
supabase secrets set GEMINI_API_KEY=your_gemini_api_key
supabase secrets set APP_ENCRYPTION_KEY=your_32_char_random_secret
supabase secrets set ALLOWED_ORIGIN=http://localhost:3000
```

**Deploy functions:**

```bash
supabase functions deploy
# or:
node scripts/deploy-all-functions.mjs
```

### Database migrations

Schema is managed with SQL files in `backend/supabase/migrations/`:

| File | Adds |
|------|------|
| `001_study_mode.sql` | Cornell notes, flashcards, quiz, confusion markers on `lectures` |
| `002_courses_and_settings.sql` | `courses`, `user_settings`, `agent_jobs`, encryption helpers |
| `003_lectures_update_policy.sql` | RLS UPDATE on `lectures` |
| `004_notion_oauth.sql` | Notion OAuth fields on `user_settings` |

Apply locally from `backend/`:

```bash
supabase db reset          # fresh local DB + all migrations
# or
supabase migration up
```

The base `lectures` table is expected to exist from your initial Supabase setup. If you are bootstrapping manually, you can also run the study-mode column additions from migration `001` in the SQL Editor.

### Notion OAuth (optional)

1. Create a public integration at https://www.notion.so/my-integrations
2. Redirect URI: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/notion-oauth-callback`
3. For local dev: `http://127.0.0.1:54321/functions/v1/notion-oauth-callback`
4. **JWT:** `notion-oauth-callback` has `verify_jwt = false` in [`backend/supabase/config.toml`](backend/supabase/config.toml) because Notion’s redirect does not send an `Authorization` header. Deploy from `backend/` so this applies.

```bash
supabase secrets set NOTION_CLIENT_ID=your_notion_client_id
supabase secrets set NOTION_CLIENT_SECRET=your_notion_client_secret
supabase secrets set NOTION_OAUTH_REDIRECT_URI=https://YOUR_PROJECT_REF.supabase.co/functions/v1/notion-oauth-callback
```

## Environment variables

### Frontend (`frontend/.env.local`)

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Backend (Supabase secrets)

| Secret | Purpose |
|--------|---------|
| `GEMINI_API_KEY` | Default AI / transcription |
| `APP_ENCRYPTION_KEY` | Encrypt user API keys & OAuth tokens (32 characters) |
| `ALLOWED_ORIGIN` | CORS origin for Edge Functions |
| `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET` / `NOTION_OAUTH_REDIRECT_URI` | Notion OAuth (optional) |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically in the Edge runtime.

## Integrations

- **Notion** — Settings → Notion → Connect; export from a lecture’s detail page.
- **Courses** — Settings → Courses: add classes, import `.ics` or schedule PDF (text-based PDFs work best), upload syllabus to private Storage bucket `course-documents`.
- **Canvas** — Settings (Canvas panel): connect instance URL and token; browse materials via `canvas-proxy`.
- **Agents** — Settings → Agents: enable auto-organizer, study planner, research, or multi-step pipeline (10 jobs/user/hour).

## Deployment

### Frontend (Vercel)

1. Connect the GitHub repo
2. Root directory: `frontend`
3. Build: `npm run build`
4. Output: `dist`
5. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel env

### Backend (Supabase)

```bash
cd backend
supabase functions deploy
```

Set production secrets (including `ALLOWED_ORIGIN` to your Vercel URL).

## Tech stack

| Layer | Technology |
|--------|------------|
| Frontend | React 19, TypeScript, Vite 6, React Router 6 |
| Styling | Tailwind CSS (CDN), Inter |
| Backend | Supabase Edge Functions (Deno) |
| Database | PostgreSQL (Supabase), SQL migrations |
| Auth | Supabase Auth (Google OAuth) + guest mode |
| AI | Gemini 3.0 Flash Preview (default); OpenAI, Anthropic, OpenRouter supported |
| Analytics | Vercel Analytics |

## Design explorations

Open `design-explorations/index.html` in a browser. **Landing C (Warm Campus)** is selected; review **four interior dashboard** mockups in the same palette before we implement in the React app.

## Documentation for contributors & agents

| Doc | Description |
|-----|-------------|
| [AGENTS.md](./AGENTS.md) | Architecture, commands, conventions, critical agent rules |
| [PROMPT.md](./PROMPT.md) | Session system prompt (`@PROMPT.md` in Cursor) |
| [DESIGN.md](./DESIGN.md) | Colors, typography, components, UI checklist |

## License

MIT License — feel free to use and modify for your projects.
