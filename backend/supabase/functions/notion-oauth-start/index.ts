import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createOAuthState } from "../_shared/notion-oauth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

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

  const clientId = Deno.env.get('NOTION_CLIENT_ID');
  const redirectUri = Deno.env.get('NOTION_OAUTH_REDIRECT_URI');
  const stateSecret = Deno.env.get('APP_ENCRYPTION_KEY');

  if (!clientId || !redirectUri || !stateSecret) {
    return new Response(JSON.stringify({ error: 'Notion OAuth not configured', code: 'INTERNAL_ERROR' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data: { user }, error: userError } = await anonClient.auth.getUser(token);

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token', code: 'AUTH_REQUIRED' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const state = await createOAuthState(user.id, stateSecret);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    owner: 'user',
    redirect_uri: redirectUri,
    state,
  });

  const authorizeUrl = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;

  return new Response(JSON.stringify({ authorizeUrl }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
