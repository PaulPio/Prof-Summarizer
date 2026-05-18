import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';

interface AuthFormProps {
  onLogin: (user: User) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cleanOrigin = window.location.origin.replace(/\/$/, '');
      setOrigin(cleanOrigin);

      const params = new URLSearchParams(window.location.search);
      const errorDescription = params.get('error_description');
      const errorCode = params.get('error_code');

      if (errorDescription || errorCode) {
        const decodedError = decodeURIComponent(errorDescription || errorCode || 'Unknown error');
        setError(decodedError);
        if (decodedError.includes('Unable to exchange external code') || decodedError.includes('exchange')) {
          setShowGuide(true);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    const redirectTo = window.location.origin.replace(/\/$/, '');

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (authError) throw authError;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed.';
      console.error('Supabase Auth Error:', err);
      setError(message);
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    onLogin({
      id: 'guest',
      email: 'guest@demo.local',
      name: 'Guest User',
      picture: '',
    });
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 antialiased">
      <nav className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between border-b border-stone-200/80">
        <span className="font-serif text-2xl italic text-stone-800">ProfSummarizer</span>
      </nav>

      <header className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <p className="text-amber-800/80 text-sm font-semibold tracking-wide uppercase mb-4">
          For students who take notes seriously
        </p>
        <h1 className="font-serif text-5xl md:text-6xl text-stone-900 leading-[1.1] max-w-2xl">
          From lecture hall to exam day, without the scramble.
        </h1>
        <p className="text-stone-600 text-lg mt-6 max-w-xl leading-relaxed">
          Upload or record a lecture. Receive Cornell Notes and study materials you can actually use — with the AI provider you already trust.
        </p>

        {error ? (
          <div className="mt-8 max-w-xl bg-red-50 border border-red-100 rounded-2xl p-5 text-left space-y-3">
            <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Sign-in error</p>
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="text-sm font-semibold text-red-800 hover:underline"
            >
              {showGuide ? 'Hide troubleshooting' : 'Show troubleshooting'}
            </button>
          </div>
        ) : null}

        <p className="mt-10 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="px-7 py-3.5 bg-amber-800 text-amber-50 rounded-xl font-semibold shadow-md hover:bg-amber-900 disabled:opacity-60 flex items-center gap-2"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-amber-200 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              </svg>
            )}
            Begin with Google
          </button>
          <button
            type="button"
            onClick={handleGuestLogin}
            className="px-7 py-3.5 border border-stone-300 rounded-xl font-semibold text-stone-700 bg-white hover:bg-stone-50"
          >
            Guest — local only
          </button>
        </p>
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="mt-6 text-xs font-semibold text-stone-400 hover:text-amber-800 uppercase tracking-wide"
        >
          {showGuide ? 'Close troubleshooting' : 'Troubleshooting guide'}
        </button>
      </header>

      <section className="bg-white border-y border-stone-200 py-16">
        <ul className="max-w-5xl mx-auto px-6 grid md:grid-cols-3 gap-10 list-none">
          <li>
            <p className="font-serif text-4xl text-amber-800/30 font-bold mb-2">01</p>
            <h3 className="font-bold text-lg">Capture</h3>
            <p className="text-stone-600 text-sm mt-2 leading-relaxed">
              Record in class or upload audio when you get home. Mark confusing moments as you go.
            </p>
          </li>
          <li>
            <p className="font-serif text-4xl text-amber-800/30 font-bold mb-2">02</p>
            <h3 className="font-bold text-lg">Understand</h3>
            <p className="text-stone-600 text-sm mt-2 leading-relaxed">
              AI builds Cornell Notes and a clear summary from your transcript and slides.
            </p>
          </li>
          <li>
            <p className="font-serif text-4xl text-amber-800/30 font-bold mb-2">03</p>
            <h3 className="font-bold text-lg">Retain</h3>
            <p className="text-stone-600 text-sm mt-2 leading-relaxed">
              Flashcards, quizzes, and chat keep the material active until the exam.
            </p>
          </li>
        </ul>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-8 items-center">
        <blockquote className="font-serif text-2xl md:text-3xl text-stone-800 leading-snug border-l-4 border-amber-700 pl-6">
          “Finally, notes that look like how I was taught to take them.”
        </blockquote>
        <aside className="bg-stone-100 rounded-2xl p-6 border border-stone-200">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">Included</p>
          <ul className="space-y-2 text-sm text-stone-700">
            <li>✓ Course folders & schedule import</li>
            <li>✓ Notion export</li>
            <li>✓ Study planner agent</li>
            <li>✓ Bring your own API key</li>
          </ul>
        </aside>
      </section>

      {showGuide && (
        <section className="max-w-2xl mx-auto px-6 pb-12">
          <div className="bg-white border border-red-100 rounded-2xl p-6 shadow-sm text-left space-y-4">
            <h3 className="font-bold text-stone-900 text-sm">Fixing “Unable to exchange code”</h3>
            <ol className="list-decimal pl-4 text-xs text-stone-700 space-y-3">
              <li>
                <strong>Invisible spaces:</strong> In Google Cloud → Redirect URIs, ensure no trailing spaces on your callback URL.
              </li>
              <li>
                <strong>Regenerate client secret:</strong> Create a new secret in Google Cloud and paste it into Supabase.
              </li>
              <li>
                <strong>JavaScript origins:</strong> Add exactly:
                <code className="block mt-1 bg-stone-50 border border-stone-200 p-2 rounded font-mono text-[10px]">{origin}</code>
              </li>
            </ol>
          </div>
        </section>
      )}

      <footer className="bg-stone-900 text-stone-300 py-14 text-center">
        <p className="font-serif text-2xl text-amber-50 italic">ProfSummarizer</p>
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="mt-6 px-8 py-3 bg-amber-700 text-white rounded-lg font-semibold hover:bg-amber-800 disabled:opacity-60"
        >
          Get started
        </button>
      </footer>
    </div>
  );
};

export default AuthForm;
