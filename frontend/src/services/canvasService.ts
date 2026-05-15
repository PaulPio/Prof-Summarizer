import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export interface CanvasCourse {
  id: string;
  name: string;
  courseCode?: string;
  term?: string;
}

export interface CanvasModule {
  id: string;
  name: string;
  itemsCount: number;
}

export interface CanvasFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  url?: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;
  return {
    'Authorization': `Bearer ${token}`,
    'apikey': SUPABASE_ANON_KEY,
  };
}

async function proxyGet<T>(resource: string): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${FUNCTIONS_URL}/canvas-proxy?resource=${encodeURIComponent(resource)}`, { headers });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Canvas request failed');
  }
  return response.json();
}

export const CanvasService = {
  getCourses: (): Promise<CanvasCourse[]> => proxyGet('courses'),

  getCourseModules: (courseId: string): Promise<CanvasModule[]> =>
    proxyGet(`courses/${courseId}/modules`),

  getCourseFiles: (courseId: string): Promise<CanvasFile[]> =>
    proxyGet(`courses/${courseId}/files`),
};
