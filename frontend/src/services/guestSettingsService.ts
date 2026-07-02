import type { AIProvider, UserSettings } from '../types';

const STORAGE_KEY = 'prof_summarizer_guest_ai_settings';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type GuestAiSettings = {
  aiProvider: AIProvider;
  aiModel: string;
  transcriptionProvider?: AIProvider;
  transcriptionModel?: string;
  apiKeys: Partial<Record<AIProvider, string>>;
  savedAt?: number;
};

const DEFAULT_GUEST_AI: GuestAiSettings = {
  aiProvider: 'gemini',
  aiModel: 'gemini-3.0-flash-preview',
  apiKeys: {},
};

/** Returns true if the key looks plausibly valid for the given provider. */
export function validateApiKeyFormat(provider: AIProvider, key: string): string | null {
  const k = key.trim();
  if (!k) return null;
  if (provider === 'gemini' && !k.startsWith('AIza')) return 'Gemini keys start with "AIza"';
  if (provider === 'openai' && !k.startsWith('sk-')) return 'OpenAI keys start with "sk-"';
  if (provider === 'anthropic' && !k.startsWith('sk-ant-')) return 'Anthropic keys start with "sk-ant-"';
  if (provider === 'openrouter' && !k.startsWith('sk-or-')) return 'OpenRouter keys start with "sk-or-"';
  return null;
}

/** Returns true if the provider can transcribe audio. */
export function providerSupportsAudio(provider: AIProvider): boolean {
  return provider === 'gemini' || provider === 'openai';
}

/** Returns true if the provider supports audio when accessed via OpenRouter (Gemini models only). */
export function openRouterModelSupportsAudio(modelId: string): boolean {
  return modelId.startsWith('google/');
}

function loadRaw(): GuestAiSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_GUEST_AI, apiKeys: {} };
    const parsed = JSON.parse(stored) as Partial<GuestAiSettings>;
    // Expire stale entries
    if (parsed.savedAt && Date.now() - parsed.savedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return { ...DEFAULT_GUEST_AI, apiKeys: {} };
    }
    return {
      aiProvider: parsed.aiProvider ?? DEFAULT_GUEST_AI.aiProvider,
      aiModel: parsed.aiModel ?? DEFAULT_GUEST_AI.aiModel,
      transcriptionProvider: parsed.transcriptionProvider,
      transcriptionModel: parsed.transcriptionModel,
      apiKeys: parsed.apiKeys ?? {},
      savedAt: parsed.savedAt,
    };
  } catch {
    return { ...DEFAULT_GUEST_AI, apiKeys: {} };
  }
}

function saveRaw(settings: GuestAiSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, savedAt: Date.now() }));
}

export const GuestSettingsService = {
  load(): GuestAiSettings {
    return loadRaw();
  },

  save(patch: {
    aiProvider?: AIProvider;
    aiModel?: string;
    transcriptionProvider?: AIProvider | null;
    transcriptionModel?: string | null;
    apiKey?: string;
    providerForKey?: AIProvider;
  }): GuestAiSettings {
    const current = loadRaw();
    const provider = patch.aiProvider ?? current.aiProvider;
    const next: GuestAiSettings = {
      aiProvider: provider,
      aiModel: patch.aiModel ?? current.aiModel,
      transcriptionProvider: patch.transcriptionProvider === null ? undefined : (patch.transcriptionProvider ?? current.transcriptionProvider),
      transcriptionModel: patch.transcriptionModel === null ? undefined : (patch.transcriptionModel ?? current.transcriptionModel),
      apiKeys: { ...current.apiKeys },
    };
    const keyProvider = patch.providerForKey ?? provider;
    if (patch.apiKey?.trim()) {
      next.apiKeys[keyProvider] = patch.apiKey.trim();
    }
    saveRaw(next);
    return next;
  },

  toUserSettings(raw: GuestAiSettings = loadRaw()): UserSettings {
    const hasKey = (p: AIProvider) => Boolean(raw.apiKeys[p]?.trim());
    return {
      hasCompletedOnboarding: true,
      aiProvider: raw.aiProvider,
      aiModel: raw.aiModel,
      transcriptionProvider: raw.transcriptionProvider,
      transcriptionModel: raw.transcriptionModel,
      hasGeminiKey: hasKey('gemini'),
      hasOpenAIKey: hasKey('openai'),
      hasAnthropicKey: hasKey('anthropic'),
      hasOpenRouterKey: hasKey('openrouter'),
      hasNotionToken: false,
      hasNotionConnection: false,
      agentStudyPlanner: false,
      agentAutoOrganizer: false,
      agentResearch: false,
      agentMultiStep: false,
      agentPipelineConfig: [],
      updatedAt: new Date().toISOString(),
    };
  },

  /** Credentials forwarded to Edge Functions for guest AI calls. */
  getAiForwardPayload(): { aiProvider: AIProvider; aiModel: string; aiApiKey: string; transcriptionProvider?: AIProvider; transcriptionModel?: string; transcriptionApiKey?: string } | null {
    const raw = loadRaw();
    const apiKey = raw.apiKeys[raw.aiProvider]?.trim();
    if (!apiKey) return null;
    const payload: ReturnType<typeof GuestSettingsService.getAiForwardPayload> = { aiProvider: raw.aiProvider, aiModel: raw.aiModel, aiApiKey: apiKey };
    if (raw.transcriptionProvider) {
      payload!.transcriptionProvider = raw.transcriptionProvider;
      payload!.transcriptionModel = raw.transcriptionModel;
      const txKey = raw.apiKeys[raw.transcriptionProvider]?.trim();
      if (txKey) payload!.transcriptionApiKey = txKey;
    }
    return payload;
  },
};
