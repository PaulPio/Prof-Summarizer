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

/** Resolve the user's selected AI provider, model, and API key from Settings. */
export async function resolveAIConfig(userId: string): Promise<AIConfig> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const encryptionKey = Deno.env.get('APP_ENCRYPTION_KEY');
  const platformGeminiKey = Deno.env.get('GEMINI_API_KEY');

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from('user_settings')
    .select('ai_provider, ai_model, gemini_api_key_enc, openai_api_key_enc, anthropic_api_key_enc, openrouter_api_key_enc')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    if (platformGeminiKey) {
      return { provider: 'gemini', apiKey: platformGeminiKey, model: GEMINI_DEFAULT_MODEL };
    }
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

  // User chose a non-Gemini provider — require their own API key (never use platform Gemini).
  if (provider !== 'gemini') {
    if (!encValue) {
      throw new AIConfigError(
        `Add your ${PROVIDER_LABELS[provider]} API key in Settings → AI, then click Save AI Settings.`,
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

  // Gemini: prefer user's saved key, else optional platform key for hosted/demo use.
  if (encValue && encryptionKey) {
    try {
      const apiKey = await decryptUserKey(supabase, encValue, encryptionKey, provider);
      return { provider: 'gemini', apiKey, model };
    } catch (err) {
      console.error('Gemini key decryption failed:', err);
      if (!platformGeminiKey) throw err;
    }
  }

  if (platformGeminiKey) {
    return { provider: 'gemini', apiKey: platformGeminiKey, model };
  }

  throw new AIConfigError(
    'Add your Gemini API key in Settings → AI, or ask the administrator to set GEMINI_API_KEY.',
    'API_KEY_REQUIRED',
  );
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

  const response = await fetch(url, {
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

  if (options.schema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: { name: 'response', schema: options.schema, strict: true },
    };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  };

  if (baseUrl.includes('openrouter.ai')) {
    const referer = Deno.env.get('OPENROUTER_REFERRER_ORIGIN') || Deno.env.get('ALLOWED_ORIGIN');
    if (referer) headers['HTTP-Referer'] = referer;
    const title = Deno.env.get('OPENROUTER_SITE_TITLE') || 'ProfSummarizer';
    headers['X-Title'] = title;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
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

  const response = await fetch('https://api.anthropic.com/v1/messages', {
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
