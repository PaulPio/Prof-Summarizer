import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { auth } from '../services/firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

interface AuthFormProps {
  onLogin: (user: User) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /* global google */
    const handleCredentialResponse = async (response: any) => {
      setIsLoading(true);
      setError(null);
      try {
        const credential = GoogleAuthProvider.credential(response.credential);
        const result = await signInWithCredential(auth, credential);
        const firebaseUser = result.user;

        if (firebaseUser) {
          const user: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'Student',
            picture: firebaseUser.photoURL || undefined,
          };
          onLogin(user);
        }
      } catch (err: any) {
        console.error("Firebase Auth Error:", err);
        if (err.code === 'auth/operation-not-allowed') {
          setError("Google sign-in is not enabled in Firebase. Go to Authentication > Sign-in method.");
        } else if (err.code === 'auth/unauthorized-domain') {
          setError("Domain Not Authorized. Please add 'aistudio.google.com' to Authorized Domains in your Firebase Console (Authentication > Settings).");
        } else {
          setError(`Authentication failed: ${err.message}. Ensure your domain is whitelisted.`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    const initializeGoogle = () => {
      if ((window as any).google) {
        (window as any).google.accounts.id.initialize({
          client_id: "986740138980-ubt160q7o7l7ucv9p9bb1mkpvje3lkh4.apps.googleusercontent.com",
          callback: handleCredentialResponse,
        });
        (window as any).google.accounts.id.renderButton(
          document.getElementById("googleBtn"),
          { theme: "outline", size: "large", width: 320, shape: "pill" }
        );
      } else {
        setTimeout(initializeGoogle, 100);
      }
    };

    initializeGoogle();
  }, [onLogin]);

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
            <p className="text-xs text-red-700 font-bold uppercase tracking-widest">Setup Required</p>
            <p className="text-sm text-red-600 leading-relaxed font-medium">{error}</p>
          </div>
        ) : (
          <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 space-y-4">
            <p className="text-sm text-blue-700 font-semibold uppercase tracking-widest">
              Cloud Intelligence
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Whitelisting: Add <b>aistudio.google.com</b> to your Firebase Authorized Domains.
            </p>
          </div>
        )}
        
        <div className="pt-4">
          <div id="googleBtn" className={`flex justify-center ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}></div>
          <p className="mt-6 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            Secure Firebase Auth Link
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;