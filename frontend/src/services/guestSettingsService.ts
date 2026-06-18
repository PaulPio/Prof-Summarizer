import type { AIProvider, UserSettings } from '../types';

const STORAGE_KEY = 'prof_summarizer_guest_ai_settings';

export type GuestAiSettings = {
  aiProvider: AIProvider;
  aiModel: string;
  apiKeys: Partial<Record<AIProvider, string>>;
};

const DEFAULT_GUEST_AI: GuestAiSettings = {
  aiProvider: 'gemini',
  aiModel: 'gemini-3.0-flash-preview',
  apiKeys: {},
};

function loadRaw(): GuestAiSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_GUEST_AI, apiKeys: {} };
    const parsed = JSON.parse(stored) as Partial<GuestAiSettings>;
    return {
      aiProvider: parsed.aiProvider ?? DEFAULT_GUEST_AI.aiProvider,
      aiModel: parsed.aiModel ?? DEFAULT_GUEST_AI.aiModel,
      apiKeys: parsed.apiKeys ?? {},
    };
  } catch {
    return { ...DEFAULT_GUEST_AI, apiKeys: {} };
  }
}

function saveRaw(settings: GuestAiSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export const GuestSettingsService = {
  load(): GuestAiSettings {
    return loadRaw();
  },

  save(patch: {
    aiProvider?: AIProvider;
    aiModel?: string;
    apiKey?: string;
    providerForKey?: AIProvider;
  }): GuestAiSettings {
    const current = loadRaw();
    const provider = patch.aiProvider ?? current.aiProvider;
    const next: GuestAiSettings = {
      aiProvider: provider,
      aiModel: patch.aiModel ?? current.aiModel,
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
  getAiForwardPayload(): { aiProvider: AIProvider; aiModel: string; aiApiKey: string } | null {
    const raw = loadRaw();
    const apiKey = raw.apiKeys[raw.aiProvider]?.trim();
    if (!apiKey) return null;
    return { aiProvider: raw.aiProvider, aiModel: raw.aiModel, aiApiKey: apiKey };
  },
};
