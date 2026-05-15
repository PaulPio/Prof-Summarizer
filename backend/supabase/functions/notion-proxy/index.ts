import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allow-list of Notion API operations (no workspace member or admin endpoints)
const ALLOWED_NOTION_PATHS: RegExp[] = [
  /^\/v1\/pages(\/[a-z0-9-]+)?$/,
  /^\/v1\/blocks\/[a-z0-9-]+\/children$/,
  /^\/v1\/databases(\/[a-z0-9-]+\/query)?$/,
  /^\/v1\/search$/,
];

function isAllowedPath(path: string): boolean {
  return ALLOWED_NOTION_PATHS.some(re => re.test(path));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Authentication required', code: 'AUTH_REQUIRED' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const encryptionKey = Deno.env.get('APP_ENCRYPTION_KEY')!;

  const anonClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token', code: 'AUTH_REQUIRED' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = req.method !== 'GET' ? await req.json() : null;
  const notionPath: string = body?.notionPath || '';

  if (!notionPath || !isAllowedPath(notionPath)) {
    return new Response(JSON.stringify({ error: 'Notion path not allowed', code: 'FORBIDDEN' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: settings } = await adminClient
    .from('user_settings')
    .select('notion_token_enc')
    .eq('user_id', user.id)
    .single();

  if (!settings?.notion_token_enc) {
    return new Response(JSON.stringify({ error: 'Notion not configured', code: 'NOT_FOUND' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: notionToken, error: decErr } = await adminClient.rpc('decrypt_api_key', {
    encrypted_value: settings.notion_token_enc,
    encryption_key: encryptionKey,
  });

  if (decErr || !notionToken) {
    return new Response(JSON.stringify({ error: 'Failed to decrypt Notion token', code: 'INTERNAL_ERROR' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const notionUrl = `https://api.notion.com${notionPath}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const notionResponse = await fetch(notionUrl, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: body?.payload ? JSON.stringify(body.payload) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!notionResponse.ok) {
      const errText = await notionResponse.text();
      return new Response(JSON.stringify({ error: `Notion API error: ${errText}`, code: 'UPSTREAM_UNAVAILABLE' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await notionResponse.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return new Response(JSON.stringify({ error: 'Notion request timed out', code: 'UPSTREAM_TIMEOUT' }), {
        status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: err.message, code: 'UPSTREAM_UNAVAILABLE' }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
