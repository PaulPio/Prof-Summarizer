import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'openrouter';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

export interface AICallOptions {
  maxOutputTokens?: number;
  schema?: any;
}

const GEMINI_DEFAULT_MODEL = 'gemini-3.0-flash-preview';
const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini';
const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-4-6';
const OPENROUTER_DEFAULT_MODEL = 'openai/gpt-4o-mini';

/** Stay under Supabase edge wall-clock (~150s) so we return a JSON error instead of HTTP 546. */
const AI_REQUEST_TIMEOUT_MS = 110_000;

const DEFAULT_MODELS: Record<AIProvider, string> = {
  gemini: GEMINI_DEFAULT_MODEL,
  openai: OPENAI_DEFAULT_MODEL,
  anthropic: ANTHROPIC_DEFAULT_MODEL,
  openrouter: OPENROUTER_DEFAULT_MODEL,
};

const PROVIDER_KEY_COLUMNS: Record<AIProvider, string> = {
  gemini: 'gemini_api_key_enc',
  openai: 'openai_api_key_enc',
  anthropic: 'anthropic_api_key_enc',
  openrouter: 'openrouter_api_key_enc',
};

const PROVIDER_LABELS: Record<AIProvider, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  openrouter: 'OpenRouter',
};

export class AIConfigError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'AIConfigError';
    this.code = code;
  }
}

type UserSettingsRow = {
  ai_provider: string | null;
  ai_model: string | null;
  gemini_api_key_enc: string | null;
  openai_api_key_enc: string | null;
  anthropic_api_key_enc: string | null;
  openrouter_api_key_enc: string | null;
};

function isAIProvider(value: string | null | undefined): value is AIProvider {
  return value === 'gemini' || value === 'openai' || value === 'anthropic' || value === 'openrouter';
}

/** Resolve the user's selected AI provider, model, and API key from Settings (signed-in only; no platform fallback). */
export async function resolveAIConfig(userId: string): Promise<AIConfig> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const encryptionKey = Deno.env.get('APP_ENCRYPTION_KEY');

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from('user_settings')
    .select('ai_provider, ai_model, gemini_api_key_enc, openai_api_key_enc, anthropic_api_key_enc, openrouter_api_key_enc')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new AIConfigError(
      'Configure an AI provider and API key in Settings → AI.',
      'AI_NOT_CONFIGURED',
    );
  }

  const row = data as UserSettingsRow;
  const provider: AIProvider = isAIProvider(row.ai_provider) ? row.ai_provider : 'gemini';
  const model = row.ai_model || DEFAULT_MODELS[provider];
  const encColumn = PROVIDER_KEY_COLUMNS[provider];
  const encValue = row[encColumn as keyof UserSettingsRow] as string | null;

  if (!encValue) {
    throw new AIConfigError(
      `Add your ${PROVIDER_LABELS[provider]} API key in Settings → AI, then click Save AI settings.`,
      'API_KEY_REQUIRED',
    );
  }

  if (!encryptionKey) {
    throw new AIConfigError(
      'Server encryption is not configured. Contact the app administrator.',
      'ENCRYPTION_NOT_CONFIGURED',
    );
  }

  const apiKey = await decryptUserKey(supabase, encValue, encryptionKey, provider);
  return { provider, apiKey, model };
}

export type GuestAiForward = {
  aiProvider?: unknown;
  aiModel?: unknown;
  aiApiKey?: unknown;
};

/** Signed-in users: encrypted keys in DB. Guests / anon: optional forwarded credentials in request body. */
export async function resolveAIConfigForRequest(
  userId: string | null,
  body: GuestAiForward,
): Promise<AIConfig> {
  if (userId) {
    return resolveAIConfig(userId);
  }

  const providerRaw = typeof body.aiProvider === 'string' ? body.aiProvider : '';
  const modelRaw = typeof body.aiModel === 'string' ? body.aiModel.trim() : '';
  const apiKeyRaw = typeof body.aiApiKey === 'string' ? body.aiApiKey.trim() : '';

  if (!isAIProvider(providerRaw) || !apiKeyRaw) {
    throw new AIConfigError(
      'Add your API key in Settings → AI before using transcription and study tools.',
      'API_KEY_REQUIRED',
    );
  }

  const provider = providerRaw;
  const model = modelRaw || DEFAULT_MODELS[provider];
  return { provider, apiKey: apiKeyRaw, model };
}

export function aiConfigErrorResponse(err: unknown, corsHeaders: Record<string, string>): Response | null {
  if (err instanceof AIConfigError) {
    const status =
      err.code === 'API_KEY_REQUIRED' || err.code === 'AI_NOT_CONFIGURED' || err.code === 'AUTH_REQUIRED'
        ? 400
        : 500;
    return new Response(JSON.stringify({ error: err.message, code: err.code }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return null;
}

async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const token = getBearerToken(req);
  if (!token) return null;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const anonClient = createClient(supabaseUrl, anonKey);
  const { data: { user } } = await anonClient.auth.getUser(token);
  return user?.id ?? null;
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.replace('Bearer ', '');
}

function isGuestAnonToken(token: string): boolean {
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  return Boolean(anonKey && token === anonKey);
}

export async function resolveAIConfigFromHttpRequest(
  req: Request,
  body: GuestAiForward,
): Promise<AIConfig> {
  const token = getBearerToken(req);
  if (!token) {
    throw new AIConfigError('Authentication required.', 'AUTH_REQUIRED');
  }

  const userId = await getUserIdFromRequest(req);
  if (userId) {
    return resolveAIConfigForRequest(userId, body);
  }

  if (!isGuestAnonToken(token)) {
    throw new AIConfigError(
      'Invalid or expired session. Sign in again or continue as guest with your API key in Settings.',
      'AUTH_REQUIRED',
    );
  }

  return resolveAIConfigForRequest(null, body);
}

async function decryptUserKey(
  supabase: ReturnType<typeof createClient>,
  encValue: string,
  encryptionKey: string,
  provider: AIProvider,
): Promise<string> {
  const { data: decryptResult, error: decryptError } = await supabase.rpc('decrypt_api_key', {
    encrypted_value: encValue,
    encryption_key: encryptionKey,
  });

  if (decryptError || !decryptResult) {
    console.error(`Key decryption failed for ${provider}:`, decryptError?.message);
    throw new AIConfigError(
      `Could not read your saved ${PROVIDER_LABELS[provider]} API key. Re-enter it in Settings → AI and save again.`,
      'DECRYPT_FAILED',
    );
  }

  return decryptResult as string;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = AI_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        `AI request timed out after ${Math.round(timeoutMs / 1000)}s. Try a faster model in Settings → AI, or fewer lectures.`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function callAI(
  config: AIConfig,
  systemInstruction: string,
  userContents: any[],
  options: AICallOptions = {},
): Promise<string> {
  switch (config.provider) {
    case 'gemini':
      return callGeminiProvider(config, systemInstruction, userContents, options);
    case 'openai':
      return callOpenAIProvider(config, systemInstruction, userContents, options, 'https://api.openai.com/v1');
    case 'anthropic':
      return callAnthropicProvider(config, systemInstruction, userContents, options);
    case 'openrouter':
      return callOpenAIProvider(config, systemInstruction, userContents, options, 'https://openrouter.ai/api/v1');
  }
}

async function callGeminiProvider(
  config: AIConfig,
  systemInstruction: string,
  contents: any[],
  options: AICallOptions,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

  const body: any = {
    contents,
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {},
  };

  if (options.schema) {
    body.generationConfig.responseMimeType = 'application/json';
    body.generationConfig.responseSchema = options.schema;
  }

  if (options.maxOutputTokens) {
    body.generationConfig.maxOutputTokens = options.maxOutputTokens;
  }

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callOpenAIProvider(
  config: AIConfig,
  systemInstruction: string,
  contents: any[],
  options: AICallOptions,
  baseUrl: string,
): Promise<string> {
  const messages: any[] = [{ role: 'system', content: systemInstruction }];

  for (const content of contents) {
    const parts = content.parts || [];
    const textParts = parts.filter((p: any) => p.text).map((p: any) => p.text).join('\n');
    const imageParts = parts.filter((p: any) => p.inlineData);

    if (imageParts.length > 0) {
      const contentArr: any[] = [];
      if (textParts) contentArr.push({ type: 'text', text: textParts });
      for (const img of imageParts) {
        contentArr.push({ type: 'image_url', image_url: { url: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}` } });
      }
      messages.push({ role: content.role === 'model' ? 'assistant' : 'user', content: contentArr });
    } else {
      messages.push({ role: content.role === 'model' ? 'assistant' : 'user', content: textParts });
    }
  }

  const body: any = {
    model: config.model,
    messages,
  };

  if (options.maxOutputTokens) {
    body.max_tokens = options.maxOutputTokens;
  }

  const isOpenRouter = baseUrl.includes('openrouter.ai');
  if (options.schema) {
    if (isOpenRouter) {
      // Many OpenRouter models (e.g. experimental) hang on strict json_schema; json_object is faster.
      body.response_format = { type: 'json_object' };
      const schemaHint = `\n\nRespond with a single JSON object only (no markdown fences). Match this structure:\n${JSON.stringify(options.schema)}`;
      messages[0].content = String(messages[0].content) + schemaHint;
    } else {
      body.response_format = {
        type: 'json_schema',
        json_schema: { name: 'response', schema: options.schema, strict: true },
      };
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  };

  if (isOpenRouter) {
    const referer = Deno.env.get('OPENROUTER_REFERRER_ORIGIN') || Deno.env.get('ALLOWED_ORIGIN');
    if (referer) headers['HTTP-Referer'] = referer;
    const title = Deno.env.get('OPENROUTER_SITE_TITLE') || 'ProfSummarizer';
    headers['X-Title'] = title;
  }

  const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`${baseUrl.includes('openrouter') ? 'OpenRouter' : 'OpenAI'} API error: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callAnthropicProvider(
  config: AIConfig,
  systemInstruction: string,
  contents: any[],
  options: AICallOptions,
): Promise<string> {
  const messages: any[] = [];

  for (const content of contents) {
    const parts = content.parts || [];
    const textParts = parts.filter((p: any) => p.text).map((p: any) => p.text).join('\n');
    const imageParts = parts.filter((p: any) => p.inlineData);

    if (imageParts.length > 0) {
      const contentArr: any[] = [];
      if (textParts) contentArr.push({ type: 'text', text: textParts });
      for (const img of imageParts) {
        contentArr.push({ type: 'image', source: { type: 'base64', media_type: img.inlineData.mimeType, data: img.inlineData.data } });
      }
      messages.push({ role: content.role === 'model' ? 'assistant' : 'user', content: contentArr });
    } else {
      messages.push({ role: content.role === 'model' ? 'assistant' : 'user', content: textParts });
    }
  }

  const body: any = {
    model: config.model,
    system: systemInstruction,
    messages,
    max_tokens: options.maxOutputTokens || 4096,
  };

  if (options.schema) {
    body.tools = [{
      name: 'structured_output',
      description: 'Return structured output matching the provided schema',
      input_schema: options.schema,
    }];
    body.tool_choice = { type: 'tool', name: 'structured_output' };
  }

  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${err}`);
  }

  const data = await response.json();

  if (options.schema) {
    const toolUse = data.content?.find((c: any) => c.type === 'tool_use');
    return toolUse ? JSON.stringify(toolUse.input) : '';
  }

  return data.content?.[0]?.text || '';
}
