import { UserSettings } from '../types';
import { getSupabaseFunctionAuthHeaders } from './authHeaders';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export const SettingsService = {
  getSettings: async (): Promise<UserSettings> => {
    const headers = await getSupabaseFunctionAuthHeaders();
    const response = await fetch(`${FUNCTIONS_URL}/user-settings`, { headers });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to load settings');
    }
    return response.json();
  },

  updateSettings: async (patch: Partial<UserSettings> & Record<string, unknown>): Promise<void> => {
    const headers = await getSupabaseFunctionAuthHeaders();
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

  startNotionOAuth: async (): Promise<string> => {
    const headers = await getSupabaseFunctionAuthHeaders();
    const response = await fetch(`${FUNCTIONS_URL}/notion-oauth-start`, { headers });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to start Notion connection');
    }
    const { authorizeUrl } = await response.json();
    return authorizeUrl as string;
  },

  disconnectNotion: async (): Promise<void> => {
    await SettingsService.updateSettings({ disconnectNotion: true });
  },
};
