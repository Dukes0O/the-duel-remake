// Search Freesound and download only the sounds we keep (SPEC 0.9, AUD-12).
//
//   node tools/audio/freesound.mjs search "metal impact" --max-duration 3 --limit 12
//   node tools/audio/freesound.mjs fetch 123456 --cue impact.metal
//
// Search prints candidates with licence, length and a preview link. Fetch
// saves the high-quality preview to the library cache outside the repository
// and records its recipe in tools/audio/catalog.json. Previews need only
// Kyle's API key; full-quality originals need OAuth2 and are not used here.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { addCatalogEntry, libraryRoot, parseArgs, portablePath, readKey, saveBytes, slug } from './sourcing.mjs';

const API = 'https://freesound.org/apiv2';
export const LICENSES = Object.freeze({
  cc0: 'Creative Commons 0',
  'cc-by': 'Attribution',
});
const FIELDS = 'id,name,username,license,duration,previews,tags,avg_rating,num_downloads,url';

export function searchUrl(query, { license = 'cc0', maxDuration, minDuration, limit = 15, page = 1 } = {}, token = '') {
  const filters = [];
  if (license !== 'any') {
    if (!LICENSES[license]) throw new Error(`Unknown licence filter: ${license}`);
    filters.push(`license:"${LICENSES[license]}"`);
  }
  if (maxDuration || minDuration) filters.push(`duration:[${Number(minDuration) || 0} TO ${Number(maxDuration) || '*'}]`);
  const params = new URLSearchParams({ query, fields: FIELDS, page_size: String(Math.min(150, Number(limit) || 15)),
    page: String(Number(page) || 1), sort: 'score' });
  if (filters.length) params.set('filter', filters.join(' '));
  if (token) params.set('token', token);
  return `${API}/search/text/?${params}`;
}

export function describeLicense(url) {
  if (/publicdomain\/zero/i.test(url)) return 'CC0 1.0';
  if (/licenses\/by\/4\.0/i.test(url)) return 'CC BY 4.0';
  if (/licenses\/by\/3\.0/i.test(url)) return 'CC BY 3.0';
  if (/licenses\/by-nc/i.test(url)) return 'CC BY-NC';
  return url;
}

export function candidateLine(sound) {
  const rating = sound.avg_rating ? ` ★${Number(sound.avg_rating).toFixed(1)}` : '';
  return `${String(sound.id).padStart(7)}  ${Number(sound.duration).toFixed(1).padStart(5)}s  ${describeLicense(sound.license).padEnd(9)}` +
    `${rating.padEnd(6)} ${sound.name} (by ${sound.username}, ${sound.num_downloads ?? 0} downloads)`;
}

async function getJson(url, fetchImpl) {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`Freesound request failed: HTTP ${response.status}`);
  return response.json();
}

export async function search(query, options = {}, { fetchImpl = fetch, token = readKey('FREESOUND_API_KEY') } = {}) {
  const data = await getJson(searchUrl(query, options, token), fetchImpl);
  return { count: data.count, results: data.results || [] };
}

// Fetching records the recipe even though the file itself stays in the cache.
export async function fetchSound(id, { cue, catalogPath, root = libraryRoot() } = {},
  { fetchImpl = fetch, token = readKey('FREESOUND_API_KEY') } = {}) {
  if (!/^\d+$/.test(String(id))) throw new Error(`Freesound ids are numbers: ${id}`);
  const sound = await getJson(`${API}/sounds/${id}/?fields=${FIELDS}&token=${encodeURIComponent(token)}`, fetchImpl);
  const previewUrl = sound.previews?.['preview-hq-ogg'];
  if (!previewUrl) throw new Error(`Sound ${id} has no high-quality preview.`);
  const response = await fetchImpl(previewUrl);
  if (!response.ok) throw new Error(`Preview download failed: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const saved = saveBytes(join(root, 'freesound', `${id}-${slug(sound.name)}.ogg`), bytes);
  const entry = {
    source: 'freesound', key: String(id), cue: cue || null, title: sound.name, author: sound.username,
    license: describeLicense(sound.license), licenseUrl: sound.license, page: sound.url,
    download: previewUrl, quality: 'preview-hq-ogg', duration: sound.duration,
    file: portablePath(saved.path, root), sha256: saved.sha256, bytes: saved.bytes,
    fetched: new Date().toISOString().slice(0, 10),
  };
  addCatalogEntry(entry, catalogPath);
  return { entry, path: saved.path };
}

async function main() {
  const { positional: [command, ...rest], options } = parseArgs(process.argv.slice(2));
  if (command === 'search' && rest.length) {
    const query = rest.join(' ');
    const { count, results } = await search(query, {
      license: options.license || 'cc0', maxDuration: options['max-duration'], minDuration: options['min-duration'],
      limit: options.limit, page: options.page,
    });
    console.log(`${count} matches for "${query}" (${options.license || 'cc0'}). Showing ${results.length}:`);
    for (const sound of results) console.log(candidateLine(sound));
    return;
  }
  if (command === 'fetch' && rest.length) {
    for (const id of rest) {
      const { entry, path } = await fetchSound(id, { cue: options.cue });
      console.log(`Fetched ${entry.key} "${entry.title}" by ${entry.author} (${entry.license}) -> ${path}`);
    }
    return;
  }
  console.log('Usage: node tools/audio/freesound.mjs search <words> [--max-duration S] [--min-duration S] [--license cc0|cc-by|any] [--limit N]\n' +
    '       node tools/audio/freesound.mjs fetch <id> [<id>...] [--cue name]');
  process.exitCode = command ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href)
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
