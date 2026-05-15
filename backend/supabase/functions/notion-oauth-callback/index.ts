import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { verifyOAuthState, encryptValue } from "../_shared/notion-oauth.ts";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const appOrigin = Deno.env.get('ALLOWED_ORIGIN') || 'http://localhost:3000';

  const redirectWith = (params: Record<string, string>) => {
    const target = new URL('/settings', appOrigin);
    target.searchParams.set('tab', 'notion');
    for (const [k, v] of Object.entries(params)) {
      target.searchParams.set(k, v);
    }
    return Response.redirect(target.toString(), 302);
  };

  if (error) {
    return redirectWith({ notion: 'error', message: error });
  }

  if (!code || !state) {
    return redirectWith({ notion: 'error', message: 'missing_code' });
  }

  const clientId = Deno.env.get('NOTION_CLIENT_ID');
  const clientSecret = Deno.env.get('NOTION_CLIENT_SECRET');
  const redirectUri = Deno.env.get('NOTION_OAUTH_REDIRECT_URI');
  const encryptionKey = Deno.env.get('APP_ENCRYPTION_KEY');
  const stateSecret = encryptionKey;

  if (!clientId || !clientSecret || !redirectUri || !encryptionKey || !stateSecret) {
    return redirectWith({ notion: 'error', message: 'not_configured' });
  }

  const userId = await verifyOAuthState(state, stateSecret);
  if (!userId) {
    return redirectWith({ notion: 'error', message: 'invalid_state' });
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    console.error('Notion token exchange failed:', errText);
    return redirectWith({ notion: 'error', message: 'token_exchange_failed' });
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token as string;
  const refreshToken = tokenData.refresh_token as string | undefined;
  const workspaceId = tokenData.workspace_id as string | undefined;
  const workspaceName = tokenData.workspace_name as string | undefined;

  if (!accessToken) {
    return redirectWith({ notion: 'error', message: 'no_access_token' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const accessEnc = await encryptValue(adminClient, accessToken, encryptionKey);
  if (!accessEnc) {
    return redirectWith({ notion: 'error', message: 'encrypt_failed' });
  }

  let refreshEnc: string | null = null;
  if (refreshToken) {
    refreshEnc = await encryptValue(adminClient, refreshToken, encryptionKey);
  }

  const { error: upsertError } = await adminClient
    .from('user_settings')
    .upsert({
      user_id: userId,
      notion_oauth_access_enc: accessEnc,
      notion_oauth_refresh_enc: refreshEnc,
      notion_token_enc: null,
      notion_workspace_id: workspaceId ?? null,
      notion_workspace_name: workspaceName ?? null,
      notion_connected_at: new Date().toISOString(),
    });

  if (upsertError) {
    console.error('Failed to save Notion OAuth tokens:', upsertError.message);
    return redirectWith({ notion: 'error', message: 'save_failed' });
  }

  return redirectWith({ notion: 'connected' });
});
