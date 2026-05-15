import { createContext, type Dispatch, type SetStateAction } from 'react';
import type { User, SavedLecture, Course, UserSettings, AgentJob } from '../types';

export interface AppContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  lectures: SavedLecture[];
  setLectures: Dispatch<SetStateAction<SavedLecture[]>>;
  isLoadingLectures: boolean;
  fetchLectures: () => Promise<void>;
  deleteLecture: (id: string) => Promise<void>;
  courses: Course[];
  setCourses: Dispatch<SetStateAction<Course[]>>;
  fetchCourses: () => Promise<void>;
  activeCourseId: string | null;
  setActiveCourseId: Dispatch<SetStateAction<string | null>>;
  userSettings: UserSettings | null;
  setUserSettings: Dispatch<SetStateAction<UserSettings | null>>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isInitialLoading: boolean;
  agentJobs: AgentJob[];
  addAgentJob: (job: AgentJob) => void;
  updateAgentJob: (id: string, patch: Partial<AgentJob>) => void;
  dismissAgentJob: (id: string) => void;
}

/** Stable context reference — keep in this file so Vite HMR does not recreate it. */
export const AppContext = createContext<AppContextValue | null>(null);
