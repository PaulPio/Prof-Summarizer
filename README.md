<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 🎓 ProfSummarizer

**AI-Powered Lecture Transcription and Summarization**

[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?logo=vite)](https://vitejs.dev/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-API-4285F4?logo=google)](https://ai.google.dev/)

</div>

---

#
### Recording a Lecture

1. **Start Recording** - Click the "Start Recording" button on the home screen
2. **Speak Clearly** - The app captures audio with optimized compression
3. **Stop & Review** - Click "Stop & Review" when done
4. **Add Supplements** (Optional) - Upload whiteboard photos, slides, or PDFs
5. **Save & Summarize** - Click to process your lecture with AI

### Viewing Summaries

- Navigate through your lecture history in the left sidebar
- Click on any lecture to view its detailed summary
- Expand the "Review Full Transcript Archive" to see the original transcription

### Authentication Modes

- **Supabase Auth** - Sign up/login with Google or email for cloud sync
- **Guest Mode** - Use the app without an account (data stored locally)

---

## 🏗️ Project Structure

```
Prof-Summarizer/
├── components/           # React components
│   ├── AuthForm.tsx     # Authentication UI
│   ├── HistorySidebar.tsx   # Lecture history sidebar
│   └── SummaryDisplay.tsx   # Summary rendering component
├── services/            # API and storage services
│   ├── geminiService.ts     # Google Gemini API integration
│   ├── storageService.ts    # Supabase/LocalStorage abstraction
│   └── supabase.ts          # Supabase client configuration
├── App.tsx              # Main application component
├── index.tsx            # Application entry point
├── types.ts             # TypeScript type definitions
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
├── package.json         # Project dependencies
└── .env.local           # Environment variables (not committed)
```

---

## 🔧 Configuration

### Gemini API Setup

1. Visit [Google AI Studio](https://ai.google.dev/)
2. Create a new API key
3. Add it to your `.env.local` file as `GEMINI_API_KEY`

### Supabase Setup (Optional)

1. Create a new project at [Supabase](https://supabase.com/)
2. Enable Authentication with Google OAuth (optional)
3. Create a `lectures` table in your database:
   ```sql
   CREATE TABLE lectures (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id TEXT NOT NULL,
     title TEXT NOT NULL,
     date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     transcript TEXT NOT NULL,
     summary TEXT NOT NULL,
     files JSONB,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```
4. Add your Supabase URL and anon key to `.env.local`

---

## 📦 Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

---

## 🌐 Deployment

### Recommended Platforms

- **Vercel** - Automatic deployments with Vite support
- **Netlify** - One-click deployment with continuous integration
- **Firebase Hosting** - Google Cloud integration
- **GitHub Pages** - Free static hosting

### Environment Variables

Ensure you set the following environment variables in your deployment platform:
- `GEMINI_API_KEY`
- `VITE_SUPABASE_URL` (optional)
- `VITE_SUPABASE_ANON_KEY` (optional)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🔗 Links

- **AI Studio App**: https://ai.studio/apps/drive/1MPMIpOdaK-yvyih8vzk6r3Api76Cj4cS
- **Google Gemini Documentation**: https://ai.google.dev/docs
- **Supabase Documentation**: https://supabase.com/docs
- **React Documentation**: https://react.dev/

---

## 💡 Tips & Best Practices

- **Audio Quality**: Record in a quiet environment for better transcription accuracy
- **File Optimization**: Images are automatically compressed to 60% quality and resized to 1200px max
- **Recording Limits**: Maximum audio size is 14.5MB (approximately 90 minutes at 16kbps)
- **Browser Compatibility**: Works best in Chrome, Edge, and Firefox (latest versions)
- **Mobile Usage**: Grant microphone permissions when prompted for the best experience

---

<div align="center">

**Made with ❤️ by students, for students**

[Report Bug](https://github.com/PaulPio/Prof-Summarizer/issues) · [Request Feature](https://github.com/PaulPio/Prof-Summarizer/issues)

</div>
