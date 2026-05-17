import type { AIProvider } from '../types';
import { getSupabaseFunctionAuthHeaders } from './authHeaders';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export type ModelEntry = { id: string; label?: string };

export type ListAiModelsResponse = {
  models: ModelEntry[];
  source: 'live' | 'fallback';
  meta?: { curated?: boolean; error?: string };
};

export const AiModelsService = {
  async listModels(provider: AIProvider, apiKey?: string): Promise<ListAiModelsResponse> {
    const headers = await getSupabaseFunctionAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/list-ai-models`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ provider, apiKey: apiKey?.trim() || undefined }),
    });

    let body: ListAiModelsResponse & { error?: string; code?: string };
    try {
      body = await res.json();
    } catch {
      throw new Error('Invalid response from model list');
    }

    if (!res.ok && !(body.models && Array.isArray(body.models))) {
      throw new Error(body.error || `Failed to load models (${res.status})`);
    }

    if (!body.models || !Array.isArray(body.models)) {
      return { models: [], source: 'fallback', meta: { error: body.error || 'No models returned' } };
    }

    return {
      models: body.models.filter((raw): raw is ModelEntry => {
        if (!raw || typeof raw !== 'object') return false;
        const row = raw as Record<string, unknown>;
        const id = row.id;
        if (typeof id !== 'string' || !id.trim()) return false;
        if ('label' in row && row.label != null && typeof row.label !== 'string') return false;
        return true;
      }),
      source: body.source === 'live' ? 'live' : 'fallback',
      meta: body.meta,
    };
  },
};
