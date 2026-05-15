// @refresh reset
import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, AgentJob } from '../types';
import { supabase } from '../services/supabase';
import { StorageService } from '../services/storageService';
import { SettingsService } from '../services/settingsService';
import { AppContext, type AppContextValue } from './appContextInstance';

export type { AppContextValue };

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [lectures, setLectures] = useState<AppContextValue['lectures']>([]);
  const [isLoadingLectures, setIsLoadingLectures] = useState(false);
  const [courses, setCourses] = useState<AppContextValue['courses']>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [userSettings, setUserSettings] = useState<AppContextValue['userSettings']>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [agentJobs, setAgentJobs] = useState<AgentJob[]>([]);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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

  const addAgentJob = useCallback((job: AgentJob) => {
    setAgentJobs(prev => [job, ...prev]);
  }, []);

  const updateAgentJob = useCallback((id: string, patch: Partial<AgentJob>) => {
    setAgentJobs(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j));
  }, []);

  const dismissAgentJob = useCallback((id: string) => {
    setAgentJobs(prev => prev.filter(j => j.id !== id));
  }, []);

  useEffect(() => {
    if (!user || user.id === 'guest') {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      return;
    }

    const channel = supabase
      .channel(`agent_jobs:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_jobs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as AgentJob;
          updateAgentJob(updated.id, {
            status: updated.status,
            result: updated.result,
            completed_at: updated.completed_at,
          });
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          setAgentJobs(prev => {
            const runningIds = prev.filter(j => j.status === 'running').map(j => j.id);
            if (runningIds.length === 0) return prev;
            supabase
              .from('agent_jobs')
              .select('*')
              .in('id', runningIds)
              .then(({ data }) => {
                if (data) {
                  data.forEach(row => updateAgentJob(row.id, { status: row.status, result: row.result, completed_at: row.completed_at }));
                }
              });
            return prev;
          });
        }
      });

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, [user, updateAgentJob]);

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
      agentJobs,
      addAgentJob,
      updateAgentJob,
      dismissAgentJob,
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
