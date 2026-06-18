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
- **Bring your own key (BYOK)** — Gemini, OpenAI, Anthropic, or OpenRouter. Signed-in users store encrypted keys in Supabase; guests store keys locally and forward them per request.
- **Dynamic model lists** — Settings loads live model catalogs via the `list-ai-models` Edge Function
- **Notion** — OAuth connect and export notes from lecture detail (signed-in users)
- **Agents** — Auto-organizer, research enrichment, and multi-step pipeline (optional in Settings). Study planner UI is hidden by default (`STUDY_PLANNER_ENABLED` in `frontend/src/constants/featureFlags.ts`).

## Project structure

```
Prof-Summarizer/
├── frontend/                    # Vite + React 19 SPA
│   ├── src/
│   │   ├── pages/               # Record, lecture detail, settings, onboarding
│   │   ├── components/
│   │   ├── context/             # AppContext (user, lectures, settings)
│   │   ├── services/            # API, storage, agents, notion, guest settings
│   │   └── types.ts
│   ├── index.html               # Tailwind CDN, design tokens
│   └── package.json
│
├── backend/
│   ├── scripts/
│   │   └── deploy-all-functions.mjs
│   └── supabase/
│       ├── config.toml
│       ├── migrations/          # 001–006 SQL migrations
│       └── functions/           # Edge Functions (see below)
│
├── README.md
├── AGENTS.md
├── PROMPT.md
└── DESIGN.md
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
| `list-ai-models` | Live model catalog per provider (signed-in or anon JWT for guests) |
| `agent-run` | Auto-organizer, study planner, research, pipeline |
| `notion-oauth-start` / `notion-oauth-callback` / `notion-proxy` | Notion OAuth + API |

Shared code: `backend/supabase/functions/_shared/`

## Getting started

### Prerequisites

- Node.js 18+
- npm
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- A Supabase project (Postgres + Auth + Edge Functions)
- An API key from your chosen AI provider (Gemini, OpenAI, Anthropic, or OpenRouter)

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

**Secrets (required for signed-in BYOK encryption):**

```bash
supabase secrets set APP_ENCRYPTION_KEY=your_32_char_random_secret
supabase secrets set ALLOWED_ORIGIN=http://localhost:3000
```

`GEMINI_API_KEY` is **not** used as a platform fallback for signed-in users. Guests forward their own key from Settings (localStorage) on each AI request.

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
| `005_course_syllabi_remove_canvas.sql` | Course syllabi storage; removes Canvas integration |
| `006_study_plans.sql` | Saved study plans from the study planner agent |

Apply locally from `backend/`:

```bash
supabase db reset          # fresh local DB + all migrations
# or
supabase migration up
```

Apply to a linked remote project:

```bash
supabase db push
```

The base `lectures` table is expected to exist from your initial Supabase setup.

### Notion OAuth (optional)

1. Create a public integration at https://www.notion.so/my-integrations
2. Redirect URI: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/notion-oauth-callback`
3. For local dev: `http://127.0.0.1:54321/functions/v1/notion-oauth-callback`
4. **JWT:** `notion-oauth-callback` has `verify_jwt = false` in [`backend/supabase/config.toml`](backend/supabase/config.toml) because Notion’s redirect does not send an `Authorization` header.

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
| `APP_ENCRYPTION_KEY` | Encrypt user API keys & OAuth tokens (32 characters) — **required** |
| `ALLOWED_ORIGIN` | CORS origin for Edge Functions |
| `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET` / `NOTION_OAUTH_REDIRECT_URI` | Notion OAuth (optional) |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically in the Edge runtime.

## Auth modes

| Mode | Storage | AI keys | Settings |
|------|---------|---------|----------|
| **Google sign-in** | Supabase `lectures` / `courses` | Encrypted in `user_settings` | Full Settings + onboarding |
| **Guest** | `localStorage` | Local only; forwarded per Edge Function call | Settings → AI, courses, capture options |

Guests and signed-in users must configure an API key before transcribing or generating study materials.

## Integrations

- **Notion** — Settings → Notion → Connect (signed-in); export from lecture detail.
- **Courses** — Settings → Courses: add classes, import `.ics` or schedule PDF, upload syllabus to Storage bucket `course-documents`.
- **Agents** — Settings → Agents: enable auto-organizer, research, or multi-step pipeline (10 jobs/user/hour).

## UI notes

The app shell uses `overflow: hidden` on `body` and internal scroll regions (`minHeight: 0` flex children) so the dashboard and landing page scroll correctly inside panes.

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
supabase db push   # if migrations are pending on remote
```

Set production secrets (including `ALLOWED_ORIGIN` to your Vercel URL and `APP_ENCRYPTION_KEY`).

## Tech stack

| Layer | Technology |
|--------|------------|
| Frontend | React 19, TypeScript, Vite 6, React Router 6 |
| Styling | Tailwind CSS (CDN), Inter + DM Serif Display |
| Backend | Supabase Edge Functions (Deno) |
| Database | PostgreSQL (Supabase), SQL migrations |
| Auth | Supabase Auth (Google OAuth) + guest mode |
| AI | BYOK — Gemini, OpenAI, Anthropic, OpenRouter |

## Documentation for contributors & agents

| Doc | Description |
|-----|-------------|
| [AGENTS.md](./AGENTS.md) | Architecture, commands, conventions |
| [PROMPT.md](./PROMPT.md) | Session system prompt |
| [DESIGN.md](./DESIGN.md) | Colors, typography, components |

## License

MIT License — feel free to use and modify for your projects.
