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

export async function resolveAIConfig(userId: string): Promise<AIConfig> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const encryptionKey = Deno.env.get('APP_ENCRYPTION_KEY');
  const fallbackApiKey = Deno.env.get('GEMINI_API_KEY')!;

  if (!encryptionKey) {
    return { provider: 'gemini', apiKey: fallbackApiKey, model: GEMINI_DEFAULT_MODEL };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from('user_settings')
    .select('ai_provider, ai_model, gemini_api_key_enc, openai_api_key_enc, anthropic_api_key_enc, openrouter_api_key_enc')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return { provider: 'gemini', apiKey: fallbackApiKey, model: GEMINI_DEFAULT_MODEL };
  }

  const provider: AIProvider = (data.ai_provider as AIProvider) || 'gemini';
  const encKeyCol = `${provider.replace('-', '_')}_api_key_enc` as keyof typeof data;
  const encValue = data[encKeyCol] as string | null;

  if (!encValue) {
    return { provider: 'gemini', apiKey: fallbackApiKey, model: GEMINI_DEFAULT_MODEL };
  }

  try {
    const { data: decryptResult, error: decryptError } = await supabase.rpc('decrypt_api_key', {
      encrypted_value: encValue,
      encryption_key: encryptionKey,
    });

    if (decryptError || !decryptResult) {
      console.error('Key decryption failed:', decryptError?.message);
      return { provider: 'gemini', apiKey: fallbackApiKey, model: GEMINI_DEFAULT_MODEL };
    }

    const defaultModels: Record<AIProvider, string> = {
      gemini: GEMINI_DEFAULT_MODEL,
      openai: OPENAI_DEFAULT_MODEL,
      anthropic: ANTHROPIC_DEFAULT_MODEL,
      openrouter: OPENROUTER_DEFAULT_MODEL,
    };

    return {
      provider,
      apiKey: decryptResult as string,
      model: data.ai_model || defaultModels[provider],
    };
  } catch (err) {
    console.error('Unexpected decryption error:', err);
    return { provider: 'gemini', apiKey: fallbackApiKey, model: GEMINI_DEFAULT_MODEL };
  }
}

export async function callAI(
  config: AIConfig,
  systemInstruction: string,
  userContents: any[],
  options: AICallOptions = {}
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
  options: AICallOptions
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
  baseUrl: string
): Promise<string> {
  // Convert Gemini-style contents to OpenAI messages
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

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI/OpenRouter API error: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callAnthropicProvider(
  config: AIConfig,
  systemInstruction: string,
  contents: any[],
  options: AICallOptions
): Promise<string> {
  // Convert contents to Anthropic messages
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
