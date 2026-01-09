import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';

interface AuthFormProps {
  onLogin: (user: User) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      console.error("Supabase Auth Error:", err);
      setError(err.message || "Authentication failed.");
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    onLogin({
      id: 'guest',
      email: 'guest@demo.local',
      name: 'Guest User',
      picture: ''
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-12 rounded-[40px] shadow-2xl shadow-blue-100 border border-gray-100 text-center">
        <div className="space-y-6">
          <div className="mx-auto h-24 w-24 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[32px] flex items-center justify-center text-4xl shadow-xl shadow-blue-200 relative">
            🎓
            {isLoading && (
              <div className="absolute inset-0 bg-blue-600/50 rounded-[32px] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">
              ProfSummarizer
            </h2>
            <p className="text-gray-500 font-medium">
              Smart study companion for long lectures.
            </p>
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 p-6 rounded-3xl border border-red-100 space-y-2">
            <p className="text-xs text-red-700 font-bold uppercase tracking-widest">Login Error</p>
            <p className="text-sm text-red-600 leading-relaxed font-medium">{error}</p>
          </div>
        ) : (
          <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 space-y-4">
            <p className="text-sm text-blue-700 font-semibold uppercase tracking-widest">
              Supabase Intelligence
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Google Login requires setting up "Test Users" in Google Cloud Console. You can use Guest Mode to test the app immediately.
            </p>
          </div>
        )}
        
        <div className="pt-4 flex flex-col gap-4 justify-center">
          <button 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700 rounded-full transition-all shadow-sm hover:shadow-md"
          >
             <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
             <span className="font-bold">Sign in with Google</span>
          </button>

          <button 
            onClick={handleGuestLogin}
            className="text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors py-2"
          >
            Or continue as Guest (Local Storage)
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;