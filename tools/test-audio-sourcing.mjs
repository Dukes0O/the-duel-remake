// Audio sourcing tools with fake network responses: no key, request or credit is used.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  EVIDENCE_DIR,
  addCatalogEntry,
  loadCatalog,
  parseArgs,
  readKey,
  slug,
} from './audio/sourcing.mjs';
import {
  candidateLine,
  describeLicense,
  fetchSound,
  searchUrl,
} from './audio/freesound.mjs';
import { credits, say, voiceSettings } from './audio/elevenlabs.mjs';

let checks = 0;
const check = (value, message) => {
  assert.ok(value, message);
  checks++;
};
const temp = mkdtempSync(join(tmpdir(), 'duel-audio-sourcing-'));
const json = (body) => ({ ok: true, status: 200, json: async () => body });
const bytes = (text) => ({
  ok: true,
  status: 200,
  arrayBuffer: async () => new TextEncoder().encode(text).buffer,
});

try {
  // Arguments, names and keys.
  const args = parseArgs([
    'search',
    'metal',
    'impact',
    '--max-duration',
    '3',
    '--keep',
  ]);
  check(
    args.positional.join(' ') === 'search metal impact' &&
      args.options['max-duration'] === '3' &&
      args.options.keep === true,
    'arguments split into words, values and flags',
  );
  check(
    slug('Metal Impact #3 (big)!') === 'metal-impact-3-big',
    'file names are simple and stable',
  );
  check(
    readKey('X_KEY', { env: { X_KEY: 'abc' } }) === 'abc',
    'an environment key is used as is',
  );
  assert.throws(
    () => readKey('X_KEY', { env: {}, platform: 'linux' }),
    /X_KEY is not set/,
  );
  checks++;
  check(
    readKey('X_KEY', {
      env: {},
      platform: 'win32',
      run: () => 'from-user\n',
    }) === 'from-user',
    'a key saved as a Windows user variable is found without printing it',
  );

  // Freesound search requests CC0 by default and never asks for more than 150.
  const url = new URL(
    searchUrl('metal impact', { maxDuration: 3, limit: 500 }, 'secret'),
  );
  check(
    url.searchParams.get('filter') ===
      'license:"Creative Commons 0" duration:[0 TO 3]',
    'CC0 and duration filters',
  );
  check(url.searchParams.get('page_size') === '150', 'page size is capped');
  check(
    !new URL(searchUrl('x', { license: 'any' })).searchParams.get('filter'),
    'any licence sends no filter',
  );
  assert.throws(() => searchUrl('x', { license: 'nc' }), /Unknown licence/);
  checks++;
  check(
    describeLicense('http://creativecommons.org/publicdomain/zero/1.0/') ===
      'CC0 1.0',
    'CC0 is named plainly',
  );
  check(
    candidateLine({
      id: 7,
      duration: 1.234,
      license: 'http://creativecommons.org/publicdomain/zero/1.0/',
      avg_rating: 4.5,
      name: 'clang',
      username: 'kyle',
      num_downloads: 9,
    }).includes('1.2s  CC0 1.0'),
    'candidate lines read clearly',
  );

  // Fetching saves the preview in the library cache and records the recipe once.
  const catalogPath = join(temp, 'catalog.json'),
    root = join(temp, 'library');
  const fakeFreesound = async (request) =>
    String(request).includes('/sounds/42/')
      ? json({
          id: 42,
          name: 'Big Clang',
          username: 'kyle',
          license: 'http://creativecommons.org/publicdomain/zero/1.0/',
          duration: 1.5,
          url: 'https://freesound.org/s/42/',
          previews: { 'preview-hq-ogg': 'https://cdn.example/42.ogg' },
        })
      : bytes('OggS fake audio');
  const first = await fetchSound(
    42,
    { cue: 'impact.metal', catalogPath, root },
    { fetchImpl: fakeFreesound, token: 't' },
  );
  check(
    first.path.endsWith(join('freesound', '42-big-clang.ogg')) &&
      readFileSync(first.path, 'utf8') === 'OggS fake audio',
    'the preview is cached outside the repository',
  );
  await fetchSound(
    42,
    { cue: 'impact.metal', catalogPath, root },
    { fetchImpl: fakeFreesound, token: 't' },
  );
  const catalog = loadCatalog(catalogPath);
  check(
    catalog.sounds.length === 1 &&
      catalog.sounds[0].license === 'CC0 1.0' &&
      catalog.sounds[0].file === 'freesound/42-big-clang.ogg',
    'fetching again replaces the recipe instead of duplicating it',
  );
  check(
    !JSON.stringify(catalog).includes('token'),
    'the catalog never holds a key',
  );
  await assert.rejects(
    fetchSound('../x', {}, { fetchImpl: fakeFreesound, token: 't' }),
    /ids are numbers/,
  );
  checks++;
  assert.throws(
    () => addCatalogEntry({ source: 'x', key: 'y' }, catalogPath),
    /needs license/,
  );
  checks++;

  // ElevenLabs: credits are checked before and after, and a take is not kept by default.
  let used = 100;
  const fakeEleven = async (request, init = {}) => {
    const path = String(request);
    check(
      init.headers?.['xi-api-key'] === 'k',
      'the key travels only in the request header',
    );
    if (path.endsWith('/user/subscription'))
      return json({
        tier: 'free',
        character_count: used,
        character_limit: 10000,
      });
    if (path.includes('/text-to-speech/voice1')) {
      const body = JSON.parse(init.body);
      used += body.text.length;
      return bytes('ID3 fake voice');
    }
    return { ok: false, status: 404 };
  };
  check(
    (await credits({ fetchImpl: fakeEleven, key: 'k' })).left === 9900,
    'remaining credits are reported',
  );
  const take = await say(
    { voice: 'voice1', line: 'gatekeeper.welcome', text: 'Come in, driver.' },
    { fetchImpl: fakeEleven, key: 'k', catalogPath },
  );
  check(
    take.entry.creditsUsed === 16 &&
      take.path.includes(join('.evidence', 'audio', 'voices')),
    'an unkept take goes to evidence and logs its credits',
  );
  check(
    loadCatalog(catalogPath).sounds.length === 1,
    'an unkept take is not catalogued',
  );
  rmSync(take.path, { force: true });
  const lagging = async (request, init = {}) =>
    String(request).endsWith('/user/subscription')
      ? json({ tier: 'free', character_count: 0, character_limit: 10000 })
      : bytes('ID3 fake voice');
  const lagged = await say(
    { voice: 'voice1', line: 'gatekeeper.lag', text: 'Twelve chars' },
    { fetchImpl: lagging, key: 'k' },
  );
  check(
    lagged.entry.creditsUsed === 12 &&
      lagged.entry.creditsEstimated &&
      lagged.creditsLeft === 9988,
    'a lagging credit counter falls back to a labelled estimate',
  );
  rmSync(lagged.path, { force: true });
  // AUD-12-R1: generation succeeded, but accounting is unavailable afterward.
  // These calls use only fixtures. A failed accounting lookup must never cause
  // another charge or discard a take that cannot be regenerated identically.
  for (const failure of ['http503', 'network', 'bad-json']) {
    let lookups = 0,
      generations = 0,
      persistedAtLookup = false;
    const line = 'aud-12-r1-fixture-' + failure;
    const expected = Buffer.from('ID3 exact preserved ' + failure);
    const accountingFailure = async (request, init = {}) => {
      if (String(request).endsWith('/user/subscription')) {
        lookups++;
        if (lookups === 1)
          return json({
            tier: 'free',
            character_count: 100,
            character_limit: 10000,
          });
        try {
          persistedAtLookup = readFileSync(join(EVIDENCE_DIR, 'voices', line + '.mp3')).equals(expected);
        } catch { persistedAtLookup = false; }
        if (failure === 'network') throw Error('Fixture network unavailable');
        if (failure === 'bad-json')
          return {
            ok: true,
            json: async () => {
              throw Error('Fixture invalid JSON');
            },
          };
        return { ok: false, status: 503 };
      }
      generations++;
      return {
        ok: true,
        arrayBuffer: async () =>
          expected.buffer.slice(
            expected.byteOffset,
            expected.byteOffset + expected.byteLength,
          ),
      };
    };
    const result = await say(
      { voice: 'fixture-voice', line, text: 'Saved first.' },
      { fetchImpl: accountingFailure, key: 'fixture-key', catalogPath },
    );
    try {
      // Assert outside the fake request so the production accounting catch
      // cannot swallow a failed ordering assertion.
      check(persistedAtLookup, 'take is already persisted before the optional lookup');
      check(
        readFileSync(result.path).equals(expected),
        'generated bytes survive ' + failure,
      );
      check(
        generations === 1 && lookups === 2,
        'accounting failure never retries generation',
      );
      check(
        result.entry.creditsEstimated && result.entry.creditsUsed === 12,
        'failed accounting labels estimated usage',
      );
      check(
        result.creditsLeft === 9888,
        'remaining estimate subtracts this take once',
      );
      check(
        typeof result.accountingWarning === 'string' &&
          result.accountingWarning.length > 0,
        'accounting failure is explicit',
      );
      check(
        !JSON.stringify(result).includes('fixture-key'),
        'accounting result never prints the key',
      );
      check(
        loadCatalog(catalogPath).sounds.length === 1,
        'candidate is never kept after accounting failure',
      );
    } finally {
      rmSync(result.path, { force: true });
    }
  }
  used = 9995;
  await assert.rejects(
    say(
      { voice: 'voice1', line: 'x', text: 'Too long for the budget' },
      { fetchImpl: fakeEleven, key: 'k' },
    ),
    /credits left/,
  );
  checks++;
  check(
    voiceSettings({ stability: '0.3' }).stability === 0.3,
    'voice settings accept command-line numbers',
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log(
  `Audio sourcing: ${checks} key, search, fetch, catalog and voice-credit checks passed.`,
);
