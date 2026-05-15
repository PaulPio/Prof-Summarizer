const encoder = new TextEncoder();

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return base64UrlEncode(new Uint8Array(sig));
}

export async function createOAuthState(userId: string, secret: string): Promise<string> {
  const payload = JSON.stringify({
    uid: userId,
    exp: Date.now() + 10 * 60 * 1000,
    n: crypto.randomUUID(),
  });
  const payloadB64 = base64UrlEncode(encoder.encode(payload));
  const sig = await hmacSign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export async function verifyOAuthState(state: string, secret: string): Promise<string | null> {
  const parts = state.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expected = await hmacSign(payloadB64, secret);
  if (sig !== expected) return null;
  try {
    const json = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
    if (!json.uid || typeof json.uid !== 'string') return null;
    if (!json.exp || Date.now() > json.exp) return null;
    return json.uid as string;
  } catch {
    return null;
  }
}

export async function encryptValue(
  adminClient: ReturnType<typeof import('jsr:@supabase/supabase-js@2').createClient>,
  plain: string,
  encryptionKey: string,
): Promise<string | null> {
  const { data, error } = await adminClient.rpc('encrypt_api_key', {
    plain_value: plain,
    encryption_key: encryptionKey,
  });
  if (error || !data) return null;
  return data as string;
}

export async function decryptValue(
  adminClient: ReturnType<typeof import('jsr:@supabase/supabase-js@2').createClient>,
  encrypted: string,
  encryptionKey: string,
): Promise<string | null> {
  const { data, error } = await adminClient.rpc('decrypt_api_key', {
    encrypted_value: encrypted,
    encryption_key: encryptionKey,
  });
  if (error || !data) return null;
  return data as string;
}

export async function refreshNotionAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{ access_token: string; refresh_token?: string } | null> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!response.ok) return null;
  return response.json();
}
