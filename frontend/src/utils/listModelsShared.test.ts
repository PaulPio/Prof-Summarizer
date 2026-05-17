import { describe, expect, it } from 'vitest';

import {
  isLikelyOpenAiChatModelId,
  parseGeminiModelsResponse,
  parseOpenAiModelsResponse,
  parseOpenRouterModelsResponse,
  sortModelEntries,
} from '@shared-list-models';

describe('isLikelyOpenAiChatModelId', () => {
  it('accepts GPT and O-series chat ids', () => {
    expect(isLikelyOpenAiChatModelId('gpt-4o')).toBe(true);
    expect(isLikelyOpenAiChatModelId('o3-mini')).toBe(true);
  });

  it('rejects embeddings and audio models', () => {
    expect(isLikelyOpenAiChatModelId('text-embedding-3-small')).toBe(false);
    expect(isLikelyOpenAiChatModelId('whisper-1')).toBe(false);
  });
});

describe('parseOpenRouterModelsResponse', () => {
  it('extracts ids and prefers human names', () => {
    const out = parseOpenRouterModelsResponse({
      data: [
        { id: 'mistral/ministral-8b', name: 'Mistral: Ministral 8B' },
        { id: 'openai/gpt-4o' },
      ],
    });
    expect(out).toEqual([
      expect.objectContaining({ id: 'mistral/ministral-8b', label: 'Mistral: Ministral 8B' }),
      expect.objectContaining({ id: 'openai/gpt-4o', label: 'openai/gpt-4o' }),
    ]);
  });
});

describe('parseOpenAiModelsResponse', () => {
  it('filters to chat-ish models only', () => {
    expect(
      parseOpenAiModelsResponse({
        data: [{ id: 'gpt-4o' }, { id: 'text-embedding-ada-002' }],
      }).map((m) => m.id),
    ).toEqual(['gpt-4o']);
  });
});

describe('parseGeminiModelsResponse', () => {
  it('keeps generateContent-capable ids and strips models/ prefix', () => {
    const out = parseGeminiModelsResponse({
      models: [
        {
          name: 'models/gemini-2.5-flash',
          supportedGenerationMethods: ['generateContent'],
          displayName: 'Gemini 2.5 Flash',
        },
        {
          name: 'models/old-embed-model',
          supportedGenerationMethods: ['embedContent'],
        },
      ],
    });
    expect(out).toEqual([{ id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' }]);
  });
});

describe('sortModelEntries', () => {
  it('sorts by id deterministically', () => {
    expect(sortModelEntries([{ id: 'b' }, { id: 'a' }])).toEqual([{ id: 'a' }, { id: 'b' }]);
  });
});
