import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, SavedLecture, Course, UserSettings } from '../types';
import { supabase } from '../services/supabase';
import { StorageService } from '../services/storageService';
import { SettingsService } from '../services/settingsService';

interface AppContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  lectures: SavedLecture[];
  setLectures: React.Dispatch<React.SetStateAction<SavedLecture[]>>;
  isLoadingLectures: boolean;
  fetchLectures: () => Promise<void>;
  deleteLecture: (id: string) => Promise<void>;
  courses: Course[];
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  fetchCourses: () => Promise<void>;
  activeCourseId: string | null;
  setActiveCourseId: React.Dispatch<React.SetStateAction<string | null>>;
  userSettings: UserSettings | null;
  setUserSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isInitialLoading: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [lectures, setLectures] = useState<SavedLecture[]>([]);
  const [isLoadingLectures, setIsLoadingLectures] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      if (accessToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });
        if (!error && data.session) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    };

    handleOAuthCallback();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata.full_name || session.user.user_metadata.name || 'Student',
          picture: session.user.user_metadata.avatar_url || undefined,
        });
      }
      setIsInitialLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata.full_name || session.user.user_metadata.name || 'Student',
          picture: session.user.user_metadata.avatar_url || undefined,
        });
      } else if (_event === 'SIGNED_OUT') {
        setUser(null);
        setLectures([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchLectures = useCallback(async () => {
    if (!user) {
      setLectures([]);
      return;
    }
    setIsLoadingLectures(true);
    try {
      const data = await StorageService.getLectures(user.id);
      setLectures(data);
    } catch (err) {
      console.error('Failed to fetch lectures:', err);
    } finally {
      setIsLoadingLectures(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLectures();
  }, [fetchLectures]);

  const deleteLecture = useCallback(async (id: string) => {
    if (!user) return;
    await StorageService.deleteLecture(id, user.id);
    setLectures(prev => prev.filter(l => l.id !== id));
  }, [user]);

  const fetchCourses = useCallback(async () => {
    if (!user) { setCourses([]); return; }
    try {
      const data = await StorageService.getCourses(user.id);
      setCourses(data);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.id === 'guest') { setUserSettings(null); return; }
    SettingsService.getSettings()
      .then(setUserSettings)
      .catch(err => console.error('Failed to load settings:', err));
  }, [user]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return (
    <AppContext.Provider value={{
      user, setUser,
      lectures, setLectures,
      isLoadingLectures,
      fetchLectures,
      deleteLecture,
      courses, setCourses,
      fetchCourses,
      activeCourseId, setActiveCourseId,
      userSettings, setUserSettings,
      isSidebarOpen, setIsSidebarOpen,
      isInitialLoading,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
