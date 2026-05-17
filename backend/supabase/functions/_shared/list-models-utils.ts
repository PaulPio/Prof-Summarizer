/** Pure helpers for listing AI models (Edge + Vitest). */

export type AIProviderId = 'gemini' | 'openai' | 'anthropic' | 'openrouter';

export type ModelEntry = { id: string; label?: string };

export const FALLBACK_MODELS: Record<AIProviderId, ModelEntry[]> = {
  gemini: [
    { id: 'gemini-3.0-flash-preview', label: 'Gemini 3.0 Flash (preview)' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
  ],
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    { id: 'claude-opus-4-7', label: 'Claude Opus 4.7' },
    { id: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
    { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { id: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
    { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  ],
  openrouter: [
    { id: 'openai/gpt-4o', label: 'OpenAI: GPT-4o' },
    { id: 'openai/gpt-4o-mini', label: 'OpenAI: GPT-4o mini' },
    { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Meta: Llama 3.3 70B' },
    { id: 'google/gemini-2.5-flash-preview-05-20', label: 'Google: Gemini 2.5 Flash (preview)' },
    { id: 'mistralai/mixtral-8x7b-instruct', label: 'Mistral: Mixtral 8x7B' },
  ],
};

export function isAIProviderId(x: unknown): x is AIProviderId {
  return x === 'gemini' || x === 'openai' || x === 'anthropic' || x === 'openrouter';
}

/** OpenAI-compatible chat-ish model IDs; excludes embeddings/audio/image-only. */
export function isLikelyOpenAiChatModelId(id: string): boolean {
  const lower = id.toLowerCase();
  if (
    /embed|embedding|whisper|tts|dall|moderation|realtime|transcribe|audio|speech|davinci-|babbage|ada-|curie|gpt-image|omni-moderation|text-moderation|video|computer-use/.test(lower)
  ) {
    return false;
  }
  if (/^gpt-/i.test(id)) return true;
  if (/^o[0-9]/i.test(id)) return true;
  if (/^chatgpt-/i.test(id)) return true;
  if (/^ft:/i.test(id)) return false;
  return false;
}

export function parseOpenAiModelsResponse(json: unknown): ModelEntry[] {
  const data = json && typeof json === 'object' && 'data' in json && Array.isArray((json as { data: unknown }).data)
    ? (json as { data: Array<{ id?: string }> }).data
    : [];
  const out: ModelEntry[] = [];
  for (const row of data) {
    const id = typeof row?.id === 'string' ? row.id : '';
    if (!id || !isLikelyOpenAiChatModelId(id)) continue;
    out.push({ id, label: id });
  }
  return dedupeStable(sortModelEntries(out));
}

export function parseGeminiModelsResponse(json: unknown): ModelEntry[] {
  const models = json && typeof json === 'object' && 'models' in json && Array.isArray((json as { models: unknown }).models)
    ? (json as { models: unknown[] }).models
    : [];
  const out: ModelEntry[] = [];
  for (const m of models) {
    if (!m || typeof m !== 'object') continue;
    const name = typeof (m as { name?: string }).name === 'string' ? (m as { name: string }).name : '';
    const methods = (m as { supportedGenerationMethods?: string[] }).supportedGenerationMethods;
    if (!methods || !Array.isArray(methods) || !methods.includes('generateContent')) continue;
    const id = name.startsWith('models/') ? name.slice('models/'.length) : name;
    if (!id) continue;
    const displayName = typeof (m as { displayName?: string }).displayName === 'string'
      ? (m as { displayName: string }).displayName
      : undefined;
    out.push({ id, label: displayName || id });
  }
  return dedupeStable(sortModelEntries(out));
}

export type OpenRouterRawRow = {
  id?: string;
  name?: string;
  context_length?: number;
};

export function parseOpenRouterModelsResponse(json: unknown): ModelEntry[] {
  const raw = json && typeof json === 'object' && 'data' in json && Array.isArray((json as { data: unknown }).data)
    ? (json as { data: OpenRouterRawRow[] }).data
    : [];
  const out: ModelEntry[] = [];
  for (const row of raw) {
    const id = typeof row?.id === 'string' ? row.id.trim() : '';
    if (!id) continue;
    const label = typeof row?.name === 'string' && row.name.trim()
      ? row.name.trim()
      : id;
    out.push({
      id,
      label,
    });
  }
  return dedupeStable(sortModelEntries(out));
}

/** Stable lexical sort by id; tie-break label. */
export function sortModelEntries(entries: ModelEntry[]): ModelEntry[] {
  return [...entries].sort((a, b) => {
    const c = a.id.localeCompare(b.id, undefined, { sensitivity: 'base' });
    return c !== 0 ? c : (a.label || '').localeCompare(b.label || '', undefined, { sensitivity: 'base' });
  });
}

function dedupeStable(entries: ModelEntry[]): ModelEntry[] {
  const seen = new Set<string>();
  const out: ModelEntry[] = [];
  for (const e of entries) {
    const k = e.id.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ id: e.id, label: e.label });
  }
  return out;
}
