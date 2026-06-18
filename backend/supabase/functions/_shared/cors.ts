/** Comma-separated origins in ALLOWED_ORIGIN, e.g. http://localhost:3000,https://prof-summarizer.vercel.app */
export function corsHeadersForRequest(
  req: Request,
  methods = 'GET, POST, PUT, OPTIONS',
): Record<string, string> {
  const raw = Deno.env.get('ALLOWED_ORIGIN')?.trim();
  const requestOrigin = req.headers.get('Origin');

  let allowOrigin = '*';
  if (raw && raw !== '*') {
    const allowed = raw.split(',').map((o) => o.trim()).filter(Boolean);
    if (requestOrigin && allowed.includes(requestOrigin)) {
      allowOrigin = requestOrigin;
    } else if (allowed.length === 1) {
      allowOrigin = allowed[0];
    } else {
      allowOrigin = allowed[0] ?? '*';
    }
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': methods,
  };
}
