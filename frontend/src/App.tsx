import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import AuthForm from './components/AuthForm';
import HistorySidebar from './components/HistorySidebar';
import RecordPage from './pages/RecordPage';
import LectureDetailPage from './pages/LectureDetailPage';
import SettingsPage from './pages/SettingsPage';
import OnboardingPage from './pages/OnboardingPage';
import { supabase } from './services/supabase';

const AppShell: React.FC = () => {
  const { user, setUser, lectures, deleteLecture, isSidebarOpen, setIsSidebarOpen, isInitialLoading, userSettings } = useAppContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (user?.id !== 'guest') {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return <AuthForm onLogin={setUser} />;

  // Redirect new authenticated users to onboarding
  if (user.id !== 'guest' && userSettings && !userSettings.hasCompletedOnboarding) {
    return <OnboardingPage />;
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
      <aside className={`fixed inset-y-0 left-0 z-30 w-72 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <HistorySidebar
          lectures={lectures}
          onSelect={(l) => {
            navigate(`/lecture/${l.id}`);
            if (window.innerWidth < 768) setIsSidebarOpen(false);
          }}
          onDelete={deleteLecture}
        />
      </aside>
      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 bg-white/80 backdrop-blur-md border-b sticky top-0 z-10">
          <div className="flex items-center gap-3 md:gap-6">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors">
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs md:text-sm font-bold">🎓</div>
              <h1 className="text-base md:text-xl font-black text-gray-900 tracking-tight hidden sm:block">ProfSummarizer</h1>
            </button>
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-black text-gray-900 leading-tight">{user.name}</p>
                <button onClick={handleLogout} className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest transition-colors">Logout</button>
              </div>
              {user.picture ? (
                <img src={user.picture} alt="Profile" className="w-10 h-10 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-100" />
              ) : (
                <div className="w-10 h-10 rounded-full border-2 border-white bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
            <button onClick={handleLogout} className="md:hidden p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
            <button onClick={() => navigate('/settings')} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors" title="Settings">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
            <button onClick={() => navigate('/')} className="px-3 py-2 md:px-5 md:py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-xs md:text-sm flex items-center gap-1.5 md:gap-2 shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5 active:translate-y-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <span className="hidden sm:inline">New Capture</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<RecordPage />} />
          <Route path="/lecture/:id" element={<LectureDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <footer className="min-h-[48px] px-4 sm:px-8 py-2 sm:py-0 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-1 sm:gap-0 text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-gray-400 border-t bg-gray-50/50">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${user.id === 'guest' ? 'bg-amber-500' : 'bg-green-500'}`}></span>
            <span className="truncate max-w-[200px] sm:max-w-none">{user.id === 'guest' ? 'Guest Mode' : user.email}</span>
          </div>
          <span className="hidden sm:inline">Gemini 2.0 Flash • Study Mode V1.0</span>
          <span className="sm:hidden">Gemini 2.0 Flash</span>
        </footer>
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <AppProvider>
    <AppShell />
  </AppProvider>
);

export default App;
