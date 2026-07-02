import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeadersForRequest } from '../_shared/cors.ts';

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
  transcriptionProvider: 'transcription_provider',
  transcriptionModel: 'transcription_model',
  notionDefaultPageId: 'notion_default_page_id',
  agentStudyPlanner: 'agent_study_planner',
  agentAutoOrganizer: 'agent_auto_organizer',
  agentResearch: 'agent_research',
  agentMultiStep: 'agent_multi_step',
  agentPipelineConfig: 'agent_pipeline_config',
};

const VALID_PROVIDERS = ['gemini', 'openai', 'anthropic', 'openrouter'];
const providerFields = ['aiProvider', 'transcriptionProvider'];
const stringFields = ['aiModel', 'transcriptionModel', 'notionDefaultPageId'];
const booleanFields = ['hasCompletedOnboarding', 'agentStudyPlanner', 'agentAutoOrganizer', 'agentResearch', 'agentMultiStep'];

/** Returns an error message for the first invalid field in the PUT body, or null. */
function validatePlainFields(body: Record<string, unknown>): string | null {
  for (const f of providerFields) {
    if (f in body && body[f] !== null && !VALID_PROVIDERS.includes(body[f] as string)) {
      return `${f} must be one of: ${VALID_PROVIDERS.join(', ')}`;
    }
  }
  for (const f of stringFields) {
    if (f in body && body[f] !== null && typeof body[f] !== 'string') {
      return `${f} must be a string`;
    }
  }
  for (const f of booleanFields) {
    if (f in body && typeof body[f] !== 'boolean') {
      return `${f} must be a boolean`;
    }
  }
  return null;
}

function hasNotionConnection(row: Record<string, unknown>): boolean {
  return !!(row.notion_oauth_access_enc || row.notion_token_enc);
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersForRequest(req, 'GET, PUT, DELETE, OPTIONS');

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
      transcriptionProvider: row.transcription_provider ?? undefined,
      transcriptionModel: row.transcription_model ?? undefined,
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

    const validationError = validatePlainFields(body);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError, code: 'INVALID_INPUT' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const encryptableInBody = Object.keys(encryptableFields).filter(
      (camel) => camel in body && body[camel] !== null && body[camel] !== '',
    );
    if (encryptableInBody.length > 0 && !encryptionKey) {
      return new Response(JSON.stringify({
        error: 'Server encryption is not configured. Contact the app administrator.',
        code: 'ENCRYPTION_NOT_CONFIGURED',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

  if (req.method === 'DELETE') {
    // Require explicit confirmation so a single stray/forged request can't destroy the account.
    let confirm = '';
    try {
      const delBody = await req.json();
      confirm = typeof delBody?.confirm === 'string' ? delBody.confirm : '';
    } catch { /* no body */ }
    if (confirm !== 'DELETE') {
      return new Response(JSON.stringify({ error: 'Account deletion requires body {"confirm":"DELETE"}', code: 'CONFIRMATION_REQUIRED' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Permanently delete the user's data and auth account.
    const tables = ['agent_jobs', 'study_plans', 'lectures', 'courses', 'user_settings'];
    for (const table of tables) {
      const { error } = await adminClient.from(table).delete().eq('user_id', user.id);
      if (error && error.code !== '42P01') { // ignore missing tables
        return new Response(JSON.stringify({ error: `Failed to delete ${table}: ${error.message}`, code: 'INTERNAL_ERROR' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    const { error: authError } = await adminClient.auth.admin.deleteUser(user.id);
    if (authError) {
      return new Response(JSON.stringify({ error: `Failed to delete account: ${authError.message}`, code: 'INTERNAL_ERROR' }), {
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
