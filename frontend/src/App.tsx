import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import AuthForm from './components/AuthForm';
import CourseRail from './components/CourseRail';
import RecordPage from './pages/RecordPage';
import LectureDetailPage from './pages/LectureDetailPage';
import SettingsPage from './pages/SettingsPage';
import StudyPlannerPage from './pages/StudyPlannerPage';
import InboxPage from './pages/InboxPage';
import SavedPage from './pages/SavedPage';
import OnboardingPage from './pages/OnboardingPage';
import { supabase } from './services/supabase';
import { STUDY_PLANNER_ENABLED } from './constants/featureFlags';

const AppShell: React.FC = () => {
  const { user, setUser, isInitialLoading, userSettings } = useAppContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (user?.id !== 'guest') {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  if (isInitialLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{
          width: 32, height: 32,
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 700ms linear infinite',
        }} />
      </div>
    );
  }

  if (!user) return <AuthForm onLogin={setUser} />;

  if (user.id !== 'guest' && userSettings && !userSettings.hasCompletedOnboarding) {
    return <OnboardingPage />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg)', color: 'var(--text)' }}>
      <CourseRail navigate={navigate} onLogout={handleLogout} />
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Routes>
          <Route path="/" element={<RecordPage />} />
          <Route path="/lecture/:id" element={<LectureDetailPage />} />
          {STUDY_PLANNER_ENABLED && <Route path="/planner" element={<StudyPlannerPage />} />}
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/settings" element={<SettingsPage onLogout={handleLogout} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
