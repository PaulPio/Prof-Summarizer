import { supabase } from './supabase';

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Headers for invoking Supabase Edge Functions with anon key + JWT when logged in. */
export async function getSupabaseFunctionAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    apikey: SUPABASE_ANON_KEY,
  };
}
