import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { decryptValue, encryptValue, refreshNotionAccessToken } from "../_shared/notion-oauth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  /** PATCH: Notion block children endpoint; browser calls proxy with same method */
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
};

const ALLOWED_NOTION_PATHS: RegExp[] = [
  /^\/v1\/pages(\/[a-z0-9-]+)?$/i,
  /^\/v1\/blocks\/[a-z0-9-]+\/children$/i,
  /^\/v1\/databases(\/[a-z0-9-]+\/query)?$/i,
  /^\/v1\/search$/i,
];

function isAllowedPath(path: string): boolean {
  return ALLOWED_NOTION_PATHS.some(re => re.test(path));
}

type NotionSettings = {
  notion_oauth_access_enc?: string | null;
  notion_oauth_refresh_enc?: string | null;
  notion_token_enc?: string | null;
};

async function resolveNotionToken(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  settings: NotionSettings,
  encryptionKey: string,
): Promise<string | null> {
  if (settings.notion_oauth_access_enc) {
    let access = await decryptValue(adminClient, settings.notion_oauth_access_enc, encryptionKey);
    if (access) return access;

    if (settings.notion_oauth_refresh_enc) {
      const refresh = await decryptValue(adminClient, settings.notion_oauth_refresh_enc, encryptionKey);
      const clientId = Deno.env.get('NOTION_CLIENT_ID');
      const clientSecret = Deno.env.get('NOTION_CLIENT_SECRET');
      if (refresh && clientId && clientSecret) {
        const refreshed = await refreshNotionAccessToken(refresh, clientId, clientSecret);
        if (refreshed?.access_token) {
          const accessEnc = await encryptValue(adminClient, refreshed.access_token, encryptionKey);
          const refreshEnc = refreshed.refresh_token
            ? await encryptValue(adminClient, refreshed.refresh_token, encryptionKey)
            : settings.notion_oauth_refresh_enc;
          if (accessEnc) {
            await adminClient.from('user_settings').update({
              notion_oauth_access_enc: accessEnc,
              notion_oauth_refresh_enc: refreshEnc,
            }).eq('user_id', userId);
          }
          return refreshed.access_token;
        }
      }
    }
    return null;
  }

  if (settings.notion_token_enc) {
    return decryptValue(adminClient, settings.notion_token_enc, encryptionKey);
  }

  return null;
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

  // For GET requests, notionPath is passed as a query param since there's no body.
  let body: Record<string, unknown> | null = null;
  let notionPath: string = '';
  if (req.method === 'GET') {
    notionPath = new URL(req.url).searchParams.get('notionPath') || '';
  } else {
    body = await req.json();
    notionPath = (body?.notionPath as string) || '';
  }

  if (!notionPath || !isAllowedPath(notionPath)) {
    return new Response(JSON.stringify({ error: 'Notion path not allowed', code: 'FORBIDDEN' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: settings } = await adminClient
    .from('user_settings')
    .select('notion_oauth_access_enc, notion_oauth_refresh_enc, notion_token_enc')
    .eq('user_id', user.id)
    .single();

  if (!settings?.notion_oauth_access_enc && !settings?.notion_token_enc) {
    return new Response(JSON.stringify({ error: 'Notion not configured', code: 'NOT_FOUND' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const notionToken = await resolveNotionToken(adminClient, user.id, settings, encryptionKey);

  if (!notionToken) {
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
