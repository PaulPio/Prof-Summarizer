import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import AuthForm from './components/AuthForm';
import CourseRail from './components/CourseRail';
import { displayCourseColor } from './constants/courseColors';
import LectureListPanel from './components/LectureListPanel';
import RecordPage from './pages/RecordPage';
import LectureDetailPage from './pages/LectureDetailPage';
import SettingsPage from './pages/SettingsPage';
import OnboardingPage from './pages/OnboardingPage';
import { supabase } from './services/supabase';

const AppShell: React.FC = () => {
  const {
    user,
    setUser,
    isSidebarOpen,
    setIsSidebarOpen,
    isInitialLoading,
    userSettings,
    activeCourseId,
    courses,
  } = useAppContext();
  const activeCourse = courses.find(c => c.id === activeCourseId);
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (user?.id !== 'guest') {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f5]">
        <div className="w-12 h-12 border-4 border-amber-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthForm onLogin={setUser} />;

  if (user.id !== 'guest' && userSettings && !userSettings.hasCompletedOnboarding) {
    return <OnboardingPage />;
  }

  return (
    <div className="flex h-screen bg-[#faf8f5] text-stone-900 overflow-hidden">
      <CourseRail />

      <div className="flex flex-col flex-1 min-w-0">
        <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-white/90 backdrop-blur border-b border-stone-200 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 hover:bg-stone-100 rounded-lg text-stone-600"
              aria-label="Toggle lecture list"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-left min-w-0 hover:opacity-90 transition-opacity"
            >
              <span className="font-serif text-xl italic text-stone-800 block leading-tight">
                ProfSummarizer
              </span>
              {activeCourse && (
                <span className="flex items-center gap-1.5 mt-0.5 max-w-[12rem] sm:max-w-xs">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: displayCourseColor(activeCourse.color) }}
                    aria-hidden
                  />
                  <span className="text-xs font-medium text-stone-600 truncate">{activeCourse.name}</span>
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-semibold text-stone-900 leading-tight">{user.name}</p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-[10px] font-semibold text-stone-500 hover:text-red-600 uppercase tracking-wide"
                >
                  Logout
                </button>
              </div>
              {user.picture ? (
                <img src={user.picture} alt="" className="w-9 h-9 rounded-full border border-stone-200" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="md:hidden p-2 text-stone-500 hover:text-red-600 rounded-lg"
              aria-label="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="p-2 hover:bg-stone-100 rounded-lg text-stone-600"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-amber-800 text-amber-50 rounded-lg text-sm font-semibold hover:bg-amber-900 transition-colors"
            >
              New capture
            </button>
          </div>
        </header>

        <div className="flex flex-1 min-h-0 relative">
          {isSidebarOpen && (
            <button
              type="button"
              className="fixed inset-0 bg-black/20 z-20 lg:hidden"
              aria-label="Close lecture list"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          <div
            className={`fixed inset-y-0 left-0 z-30 pt-16 lg:pt-0 lg:relative lg:translate-x-0 transform transition-transform duration-300 h-full lg:h-auto ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <LectureListPanel onSelect={() => setIsSidebarOpen(false)} />
          </div>

          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<RecordPage />} />
                <Route path="/lecture/:id" element={<LectureDetailPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>

            <footer className="shrink-0 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400 border-t border-stone-200 bg-white/50">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${user.id === 'guest' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <span className="truncate max-w-[200px] sm:max-w-none">
                  {user.id === 'guest' ? 'Guest mode' : user.email}
                </span>
              </div>
              <span className="hidden sm:inline">ProfSummarizer · Campus</span>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <AppProvider>
    <AppShell />
  </AppProvider>
);

export default App;
