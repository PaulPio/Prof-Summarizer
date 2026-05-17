import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
};

const encryptableFields: Record<string, string> = {
  geminiApiKey: 'gemini_api_key_enc',
  openaiApiKey: 'openai_api_key_enc',
  anthropicApiKey: 'anthropic_api_key_enc',
  openrouterApiKey: 'openrouter_api_key_enc',
  notionToken: 'notion_token_enc',
};

const plainFields: Record<string, string> = {
  hasCompletedOnboarding: 'has_completed_onboarding',
  aiProvider: 'ai_provider',
  aiModel: 'ai_model',
  notionDefaultPageId: 'notion_default_page_id',
  agentStudyPlanner: 'agent_study_planner',
  agentAutoOrganizer: 'agent_auto_organizer',
  agentResearch: 'agent_research',
  agentMultiStep: 'agent_multi_step',
  agentPipelineConfig: 'agent_pipeline_config',
};

function hasNotionConnection(row: Record<string, unknown>): boolean {
  return !!(row.notion_oauth_access_enc || row.notion_token_enc);
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
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const encryptionKey = Deno.env.get('APP_ENCRYPTION_KEY');

  const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data: { user }, error: userError } = await anonClient.auth.getUser(token);

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token', code: 'AUTH_REQUIRED' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  if (req.method === 'GET') {
    const { data, error } = await adminClient
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return new Response(JSON.stringify({ error: 'Failed to load settings', code: 'INTERNAL_ERROR' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!data) {
      await adminClient.from('user_settings').insert([{ user_id: user.id }]);
    }

    const row = data || {};
    const notionConnected = hasNotionConnection(row);
    return new Response(JSON.stringify({
      hasCompletedOnboarding: row.has_completed_onboarding ?? false,
      aiProvider: row.ai_provider ?? 'gemini',
      aiModel: row.ai_model ?? 'gemini-3.0-flash-preview',
      hasGeminiKey: !!row.gemini_api_key_enc,
      hasOpenAIKey: !!row.openai_api_key_enc,
      hasAnthropicKey: !!row.anthropic_api_key_enc,
      hasOpenRouterKey: !!row.openrouter_api_key_enc,
      hasNotionToken: notionConnected,
      hasNotionConnection: notionConnected,
      notionWorkspaceName: row.notion_workspace_name ?? undefined,
      notionConnectedAt: row.notion_connected_at ?? undefined,
      notionDefaultPageId: row.notion_default_page_id ?? undefined,
      agentStudyPlanner: row.agent_study_planner ?? false,
      agentAutoOrganizer: row.agent_auto_organizer ?? false,
      agentResearch: row.agent_research ?? false,
      agentMultiStep: row.agent_multi_step ?? false,
      agentPipelineConfig: row.agent_pipeline_config ?? [],
      updatedAt: row.updated_at ?? new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'PUT') {
    const body = await req.json();
    const dbUpdate: Record<string, unknown> = {};

    if (body.disconnectNotion === true) {
      dbUpdate.notion_oauth_access_enc = null;
      dbUpdate.notion_oauth_refresh_enc = null;
      dbUpdate.notion_token_enc = null;
      dbUpdate.notion_workspace_id = null;
      dbUpdate.notion_workspace_name = null;
      dbUpdate.notion_connected_at = null;
    }

    for (const [camel, col] of Object.entries(plainFields)) {
      if (camel in body) {
        dbUpdate[col] = body[camel];
      }
    }

    if (encryptionKey) {
      for (const [camel, col] of Object.entries(encryptableFields)) {
        if (camel in body && body[camel] !== null && body[camel] !== '') {
          const { data: enc, error: encErr } = await adminClient.rpc('encrypt_api_key', {
            plain_value: body[camel],
            encryption_key: encryptionKey,
          });
          if (encErr) {
            console.error('Encryption failed:', encErr.message);
            return new Response(JSON.stringify({ error: 'Failed to encrypt key', code: 'INTERNAL_ERROR' }), {
              status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          dbUpdate[col] = enc;
        } else if (camel in body && body[camel] === null) {
          dbUpdate[col] = null;
        }
      }
    }

    if (Object.keys(dbUpdate).length === 0) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: upsertError } = await adminClient
      .from('user_settings')
      .upsert({ user_id: user.id, ...dbUpdate });

    if (upsertError) {
      return new Response(JSON.stringify({ error: upsertError.message, code: 'INTERNAL_ERROR' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }), {
    status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
