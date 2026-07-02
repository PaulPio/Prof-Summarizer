import { UserSettings } from '../types';
import { getSupabaseFunctionAuthHeaders } from './authHeaders';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

function wrapFetchError(err: unknown, context: string): Error {
  if (err instanceof TypeError && /fetch/i.test(err.message)) {
    return new Error(
      `${context}: could not reach the server. Check VITE_SUPABASE_URL and that Supabase ALLOWED_ORIGIN includes ${typeof window !== 'undefined' ? window.location.origin : 'this site'}.`,
    );
  }
  return err instanceof Error ? err : new Error(String(err));
}

export const SettingsService = {
  getSettings: async (): Promise<UserSettings> => {
    const headers = await getSupabaseFunctionAuthHeaders();
    let response: Response;
    try {
      response = await fetch(`${FUNCTIONS_URL}/user-settings`, { headers });
    } catch (err) {
      throw wrapFetchError(err, 'Load settings');
    }
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to load settings');
    }
    return response.json();
  },

  updateSettings: async (patch: Partial<UserSettings> & Record<string, unknown>): Promise<void> => {
    const headers = await getSupabaseFunctionAuthHeaders();
    let response: Response;
    try {
      response = await fetch(`${FUNCTIONS_URL}/user-settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(patch),
      });
    } catch (err) {
      throw wrapFetchError(err, 'Save settings');
    }
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

  /** Permanently deletes the user's data and auth account. */
  deleteAccount: async (): Promise<void> => {
    const headers = await getSupabaseFunctionAuthHeaders();
    let response: Response;
    try {
      response = await fetch(`${FUNCTIONS_URL}/user-settings`, { method: 'DELETE', headers });
    } catch (err) {
      throw wrapFetchError(err, 'Delete account');
    }
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to delete account');
    }
  },
};
