# 🎓 ProfSummarizer

AI-powered lecture transcription and study tool with Cornell Notes, flashcards, quizzes, and interactive chat.

## ✨ Features

- **🎙️ Audio Transcription** - Record or upload lectures for AI transcription
- **📋 Cornell Notes** - Automatic formatting in academic Cornell Notes style
- **🎴 Flashcards** - Auto-generated study cards from lecture content
- **📝 Quiz Mode** - Configurable multiple-choice quizzes (5/10/15/20 questions)
- **💬 Chat with Professor** - Context-aware Q&A about your lecture
- **🤔 Confusion Markers** - Mark confusing moments during recording for extra explanation
- **☁️ Cloud Sync** - Save lectures to Supabase (or use guest mode with local storage)

## 🏗️ Project Structure

```
Prof-Summarizer/
├── frontend/                    # Vite React app
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── services/            # API and storage services
│   │   ├── types.ts             # TypeScript interfaces
│   │   └── App.tsx              # Main application
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                     # Supabase Edge Functions
│   └── supabase/
│       └── functions/
│           ├── _shared/         # Shared utilities
│           ├── transcribe/      # Audio transcription
│           ├── summarize/       # Cornell Notes generation
│           ├── generate-flashcards/
│           ├── generate-quiz/
│           └── chat/            # Context-aware chat
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for backend)
- Supabase project with configured database

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

### Backend Setup

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Link to your project**
   ```bash
   cd backend
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. **Set the Gemini API key as a secret**
   ```bash
   supabase secrets set GEMINI_API_KEY=your_api_key_here
   ```

4. **Deploy Edge Functions**
   ```bash
   supabase functions deploy
   ```

### Database Schema

Run this SQL in your Supabase SQL Editor to add the Study Mode columns:

```sql
-- Add new columns for Study Mode features
ALTER TABLE lectures 
ADD COLUMN IF NOT EXISTS cornell_notes JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS flashcards JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS quiz_data JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS confusion_markers INTEGER[] DEFAULT '{}';
```

## 🔧 Environment Variables

### Frontend
Create `frontend/.env.local`:
```env
# Supabase is configured in src/services/supabase.ts
# No additional env vars needed for frontend
```

### Backend (Supabase Secrets)
```bash
supabase secrets set GEMINI_API_KEY=your_gemini_api_key
```

## 📦 Deployment

### Frontend (Vercel)

1. Connect your GitHub repo to Vercel
2. Set root directory to `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`

### Backend (Supabase)

Edge Functions are automatically deployed when you run:
```bash
cd backend
supabase functions deploy
```

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS
- **Backend**: Supabase Edge Functions (Deno)
- **AI**: Google Gemini 2.0 Flash
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth with Google OAuth

## 📄 License

MIT License - feel free to use and modify for your projects!
