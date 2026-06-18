#!/usr/bin/env node
/**
 * Deploy all Edge Functions using the Supabase Management API.
 *
 * Prerequisites:
 *   supabase login
 *   OR set SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens
 *
 * Usage:
 *   cd backend
 *   set SUPABASE_PROJECT_REF=your_project_ref
 *   node scripts/deploy-all-functions.mjs
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { readFile } from 'fs/promises';

const JWT_DISABLED = new Set(['notion-oauth-callback']);

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..', 'supabase', 'functions');

function discoverFunctions() {
  return readdirSync(root)
    .filter((name) => {
      if (name.startsWith('_') || name.startsWith('.')) return false;
      const fnDir = join(root, name);
      return statSync(fnDir).isDirectory() && statSync(join(fnDir, 'index.ts')).isFile();
    })
    .sort();
}

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

async function getProjectRef() {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;
  const linked = join(__dirname, '..', '.temp', 'project-ref');
  try {
    const ref = (await readFile(linked, 'utf8')).trim();
    if (ref) return ref;
  } catch {
    /* fall through */
  }
  throw new Error(
    'Set SUPABASE_PROJECT_REF or run supabase link from backend/ so .temp/project-ref exists.',
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
  return {
    name: fn,
    entrypoint_path: 'index.ts',
    verify_jwt: !JWT_DISABLED.has(fn),
    files,
  };
}

async function deployFunction(token, projectRef, bundle) {
  const url = `https://api.supabase.com/v1/projects/${projectRef}/functions/deploy`;
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

const FUNCTIONS = discoverFunctions();
const token = await getAccessToken();
const projectRef = await getProjectRef();
console.log(`Deploying ${FUNCTIONS.length} functions to project ${projectRef}...\n`);

for (const fn of FUNCTIONS) {
  process.stdout.write(`  ${fn} ... `);
  const bundle = bundleFunction(fn);
  const result = await deployFunction(token, projectRef, bundle);
  console.log('OK', result.slug ?? result.name ?? '');
}

console.log('\nDone. Required secrets (Dashboard → Edge Functions → Secrets):');
console.log('  APP_ENCRYPTION_KEY=<random-32-char-string>');
console.log('  ALLOWED_ORIGIN=https://your-app-url');
