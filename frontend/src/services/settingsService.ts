import { UserSettings } from '../types';
import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'apikey': SUPABASE_ANON_KEY,
  };
}

export const SettingsService = {
  getSettings: async (): Promise<UserSettings> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FUNCTIONS_URL}/user-settings`, { headers });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to load settings');
    }
    return response.json();
  },

  updateSettings: async (patch: Partial<UserSettings> & Record<string, any>): Promise<void> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FUNCTIONS_URL}/user-settings`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to save settings');
    }
  },
};
