import type { AIProvider, UserSettings } from '../types';

export function hasProviderApiKey(settings: UserSettings | null | undefined, provider: AIProvider): boolean {
  if (!settings) return false;
  const map: Record<AIProvider, boolean> = {
    gemini: settings.hasGeminiKey,
    openai: settings.hasOpenAIKey,
    anthropic: settings.hasAnthropicKey,
    openrouter: settings.hasOpenRouterKey,
  };
  return map[provider];
}

export function hasConfiguredAi(settings: UserSettings | null | undefined): boolean {
  if (!settings) return false;
  return hasProviderApiKey(settings, settings.aiProvider);
}
