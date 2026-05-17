#!/usr/bin/env node
/**
 * Deploy edge functions using Supabase Management API.
 *
 * Prerequisites:
 *   1. supabase login   (creates ~/.supabase/access-token on some installs)
 *   OR set SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens
 *
 * Usage:
 *   cd backend
 *   set SUPABASE_ACCESS_TOKEN=sbp_...
 *   node scripts/deploy-all-functions.mjs
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { readFile } from 'fs/promises';

const PROJECT_REF = 'sqlwvjbiququbvnqzvub';
const FUNCTIONS = ['user-settings', 'notion-proxy', 'agent-run'];

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..', 'supabase', 'functions');

async function getAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  const paths = [
    join(homedir(), '.supabase', 'access-token'),
    join(homedir(), 'AppData', 'Roaming', 'supabase', 'access-token'),
  ];
  for (const p of paths) {
    try {
      const t = (await readFile(p, 'utf8')).trim();
      if (t) return t;
    } catch {
      /* try next */
    }
  }
  throw new Error(
    'No Supabase access token. Run: supabase login\nOr set SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens',
  );
}

function collectFiles(dir, base = dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      files.push(...collectFiles(full, base));
    } else if (name.endsWith('.ts')) {
      files.push({
        name: relative(base, full).replace(/\\/g, '/'),
        content: readFileSync(full, 'utf8'),
      });
    }
  }
  return files;
}

function bundleFunction(fn) {
  const fnDir = join(root, fn);
  const files = collectFiles(fnDir);
  const sharedDir = join(root, '_shared');
  for (const name of readdirSync(sharedDir)) {
    if (!name.endsWith('.ts')) continue;
    files.push({
      name: `../_shared/${name}`,
      content: readFileSync(join(sharedDir, name), 'utf8'),
    });
  }
  return { name: fn, entrypoint_path: 'index.ts', verify_jwt: true, files };
}

async function deployFunction(token, bundle) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/deploy`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bundle),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Deploy ${bundle.name} failed (${res.status}): ${text}`);
  }
  return JSON.parse(text);
}

const token = await getAccessToken();
console.log('Deploying to project', PROJECT_REF, '...\n');

for (const fn of FUNCTIONS) {
  process.stdout.write(`  ${fn} ... `);
  const bundle = bundleFunction(fn);
  const result = await deployFunction(token, bundle);
  console.log('OK', result.slug ?? result.name ?? '');
}

console.log('\nDone. Set secrets in Dashboard → Edge Functions → Secrets:');
console.log('  ALLOWED_ORIGIN=http://localhost:3000');
console.log('  APP_ENCRYPTION_KEY=<random-32-char-string>');
console.log('  GEMINI_API_KEY=<your-key> (if not already set)');
