// Shared helpers for fetching and recording game sounds (SPEC 0.9).
// Keys come only from Kyle's environment and are never printed or written.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CATALOG_PATH = join(REPO_ROOT, 'tools', 'audio', 'catalog.json');
export const EVIDENCE_DIR = join(REPO_ROOT, '.evidence', 'audio');

// Downloaded library sounds stay outside the repository and can be re-fetched.
export function libraryRoot(env = process.env) {
  return resolve(env.DUEL_AUDIO_LIBRARY || 'C:/Users/kyleb/dev/audio-library');
}

// A key saved as a Windows user variable after this process started is not in
// process.env yet, so read the user setting directly as a fallback.
export function readKey(name, { env = process.env, platform = process.platform, run = execFileSync } = {}) {
  if (env[name]) return env[name];
  if (platform === 'win32') {
    try {
      const value = run('powershell', ['-NoProfile', '-Command',
        `[Environment]::GetEnvironmentVariable('${name}','User')`], { encoding: 'utf8' }).trim();
      if (value) return value;
    } catch { /* fall through to the clear error below */ }
  }
  throw new Error(`${name} is not set. Store it as a user environment variable (SPEC 0.9).`);
}

export function slug(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'sound';
}

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function loadCatalog(path = CATALOG_PATH) {
  if (!existsSync(path)) return { version: 1, sounds: [] };
  const catalog = JSON.parse(readFileSync(path, 'utf8'));
  if (catalog.version !== 1 || !Array.isArray(catalog.sounds)) throw new Error(`Unexpected catalog shape: ${path}`);
  return catalog;
}

// One entry per source sound. Re-fetching the same source replaces its entry
// instead of adding a duplicate.
export function addCatalogEntry(entry, path = CATALOG_PATH) {
  for (const field of ['source', 'key', 'license', 'file', 'sha256'])
    if (!entry[field]) throw new Error(`Catalog entry needs ${field}.`);
  const catalog = loadCatalog(path);
  catalog.sounds = catalog.sounds.filter(sound => !(sound.source === entry.source && sound.key === entry.key));
  catalog.sounds.push(entry);
  catalog.sounds.sort((a, b) => `${a.source}:${a.key}`.localeCompare(`${b.source}:${b.key}`));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n');
  return catalog;
}

export function saveBytes(path, bytes) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  return { path, sha256: sha256(bytes), bytes: bytes.length };
}

// Paths in the catalog are portable: repository-relative or library-relative.
export function portablePath(path, root) {
  return relative(root, path).split('\\').join('/');
}

export function parseArgs(argv) {
  const positional = [], options = {};
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (!arg.startsWith('--')) { positional.push(arg); continue; }
    const name = arg.slice(2), next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) options[name] = true;
    else { options[name] = next; index++; }
  }
  return { positional, options };
}
