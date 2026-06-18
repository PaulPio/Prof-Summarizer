import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  type AIProviderId,
  FALLBACK_MODELS,
  isAIProviderId,
  parseGeminiModelsResponse,
  parseOpenAiModelsResponse,
  parseOpenRouterModelsResponse,
  sortModelEntries,
  type ModelEntry,
} from '../_shared/list-models-utils.ts';
import { corsHeadersForRequest } from '../_shared/cors.ts';

type ListResponseBody = {
  models: ModelEntry[];
  source: 'live' | 'fallback';
  meta?: { curated?: boolean; error?: string };
};

async function fetchOpenRouter(bearerOptional?: string): Promise<{ models?: ModelEntry[]; err?: string }> {
  const url =
    'https://openrouter.ai/api/v1/models?output_modalities=text';
  const headers: Record<string, string> = {};
  if (bearerOptional) {
    headers.Authorization = `Bearer ${bearerOptional}`;
  }
  const openrouterPublishable = Deno.env.get('OPENROUTER_REFERRER_ORIGIN');
  if (openrouterPublishable) {
    headers.Referer = openrouterPublishable;
  }
  const title = Deno.env.get('OPENROUTER_SITE_TITLE');
  if (title) headers['X-Title'] = title;
  const res = await fetch(url, { headers });
  const rawText = await res.text();
  if (!res.ok) {
    return { err: `OpenRouter HTTP ${res.status}: ${rawText.slice(0, 200)}` };
  }
  try {
    const json = JSON.parse(rawText);
    const models = parseOpenRouterModelsResponse(json);
    return { models };
  } catch {
    return { err: 'OpenRouter invalid JSON' };
  }
}

async function fetchOpenAI(apiKey: string): Promise<{ models?: ModelEntry[]; err?: string }> {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const rawText = await res.text();
  if (!res.ok) {
    return { err: `OpenAI HTTP ${res.status}: ${rawText.slice(0, 200)}` };
  }
  try {
    const json = JSON.parse(rawText);
    return { models: parseOpenAiModelsResponse(json) };
  } catch {
    return { err: 'OpenAI invalid JSON' };
  }
}

async function fetchGemini(apiKey: string): Promise<{ models?: ModelEntry[]; err?: string }> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  const rawText = await res.text();
  if (!res.ok) {
    return { err: `Gemini HTTP ${res.status}: ${rawText.slice(0, 200)}` };
  }
  try {
    const json = JSON.parse(rawText);
    const models = parseGeminiModelsResponse(json);
    return { models: models.length ? models : undefined };
  } catch {
    return { err: 'Gemini invalid JSON' };
  }
}

function json(body: ListResponseBody, corsHeaders: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersForRequest(req, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(
      { models: [], source: 'fallback', meta: { error: 'Method not allowed' } },
      corsHeaders,
      405,
    );
  }

  let bodyRaw: Record<string, unknown>;
  try {
    bodyRaw = await req.json() as Record<string, unknown>;
  } catch {
    return json({
      models: [],
      source: 'fallback',
      meta: { error: 'Invalid JSON body' },
    }, corsHeaders, 400);
  }

  const providerRaw = bodyRaw.provider;
  if (!isAIProviderId(providerRaw)) {
    return json({
      models: [],
      source: 'fallback',
      meta: { error: 'Invalid or missing provider' },
    }, corsHeaders, 400);
  }
  const provider: AIProviderId = providerRaw;

  const apiKey = typeof bodyRaw.apiKey === 'string' ? bodyRaw.apiKey.trim() : '';

  switch (provider) {
    case 'anthropic': {
      const curated = sortModelEntries([...FALLBACK_MODELS.anthropic]);
      return json({
        models: curated,
        source: 'fallback',
        meta: { curated: true },
      }, corsHeaders);
    }

    case 'openrouter': {
      const fb = FALLBACK_MODELS.openrouter;
      const { models, err } = await fetchOpenRouter(apiKey || undefined);
      if (models?.length) {
        return json({ models: sortModelEntries(models), source: 'live' }, corsHeaders);
      }
      return json({
        models: fb,
        source: 'fallback',
        meta: { error: err || 'Unable to fetch OpenRouter models' },
      }, corsHeaders);
    }

    case 'openai': {
      const fb = FALLBACK_MODELS.openai;
      if (!apiKey) {
        return json({ models: fb, source: 'fallback' }, corsHeaders);
      }
      const { models, err } = await fetchOpenAI(apiKey);
      if (models?.length) {
        return json({ models: sortModelEntries(models), source: 'live' }, corsHeaders);
      }
      return json({
        models: fb,
        source: 'fallback',
        meta: { error: err || 'Unable to fetch OpenAI models' },
      }, corsHeaders);
    }

    case 'gemini': {
      const fb = FALLBACK_MODELS.gemini;
      if (!apiKey) {
        return json({ models: fb, source: 'fallback' }, corsHeaders);
      }
      const { models, err } = await fetchGemini(apiKey);
      if (models?.length) {
        return json({ models: sortModelEntries(models), source: 'live' }, corsHeaders);
      }
      return json({
        models: fb,
        source: 'fallback',
        meta: { error: err || 'Unable to fetch Gemini models' },
      }, corsHeaders);
    }

  }
});
