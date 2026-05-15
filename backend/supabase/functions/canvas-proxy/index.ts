import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Only these resource paths may be proxied
const ALLOWED_RESOURCES = ['courses', 'modules', 'files'];

// Check for RFC-1918 and loopback addresses to prevent SSRF
function isPrivateHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false;
  const [a, b] = parts;
  return (a === 10) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function isAllowedResource(resource: string): boolean {
  return ALLOWED_RESOURCES.some(r => resource === r || resource.startsWith(`courses/`) && (resource.endsWith('/modules') || resource.endsWith('/files')));
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

  const url = new URL(req.url);
  const resource = url.searchParams.get('resource');

  if (!resource || !isAllowedResource(resource)) {
    return new Response(JSON.stringify({ error: 'Resource not allowed', code: 'FORBIDDEN' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: settings } = await adminClient
    .from('user_settings')
    .select('canvas_instance_url, canvas_api_token_enc')
    .eq('user_id', user.id)
    .single();

  if (!settings?.canvas_instance_url || !settings?.canvas_api_token_enc) {
    return new Response(JSON.stringify({ error: 'Canvas not configured', code: 'NOT_FOUND' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // SSRF guard: validate canvas instance URL
  let canvasHost: string;
  try {
    canvasHost = new URL(settings.canvas_instance_url).hostname;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid Canvas URL', code: 'MISSING_FIELD' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (isPrivateHost(canvasHost)) {
    return new Response(JSON.stringify({ error: 'Canvas URL resolves to private network', code: 'FORBIDDEN' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Decrypt Canvas token
  const { data: canvasToken, error: decErr } = await adminClient.rpc('decrypt_api_key', {
    encrypted_value: settings.canvas_api_token_enc,
    encryption_key: encryptionKey,
  });

  if (decErr || !canvasToken) {
    return new Response(JSON.stringify({ error: 'Failed to decrypt Canvas token', code: 'INTERNAL_ERROR' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const canvasBase = settings.canvas_instance_url.replace(/\/$/, '');
  const canvasUrl = `${canvasBase}/api/v1/${resource}?per_page=50`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const canvasResponse = await fetch(canvasUrl, {
      method: req.method === 'GET' ? 'GET' : 'POST',
      headers: {
        'Authorization': `Bearer ${canvasToken}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!canvasResponse.ok) {
      const errText = await canvasResponse.text();
      return new Response(JSON.stringify({ error: `Canvas API error: ${errText}`, code: 'UPSTREAM_UNAVAILABLE' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawData = await canvasResponse.json();

    // Map to internal shapes based on resource type
    let mapped: any;
    if (resource === 'courses') {
      mapped = (Array.isArray(rawData) ? rawData : []).map((c: any) => ({
        id: String(c.id),
        name: c.name,
        courseCode: c.course_code,
        term: c.term?.name,
      }));
    } else if (resource.endsWith('/modules')) {
      mapped = (Array.isArray(rawData) ? rawData : []).map((m: any) => ({
        id: String(m.id),
        name: m.name,
        itemsCount: m.items_count,
      }));
    } else if (resource.endsWith('/files')) {
      mapped = (Array.isArray(rawData) ? rawData : []).map((f: any) => ({
        id: String(f.id),
        name: f.display_name || f.filename,
        mimeType: f.content_type,
        size: f.size,
        url: f.url,
      })).filter((f: any) => !f.size || f.size <= 10 * 1024 * 1024); // 10 MB cap
    } else {
      mapped = rawData;
    }

    return new Response(JSON.stringify(mapped), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return new Response(JSON.stringify({ error: 'Canvas request timed out', code: 'UPSTREAM_TIMEOUT' }), {
        status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: err.message, code: 'UPSTREAM_UNAVAILABLE' }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
