// Voice lines through the ElevenLabs free plan (SPEC 0.9, AUD-12 and AUD-17).
//
//   node tools/audio/elevenlabs.mjs credits
//   node tools/audio/elevenlabs.mjs voices
//   node tools/audio/elevenlabs.mjs say --voice <id> --line gatekeeper.welcome --text "..."
//   node tools/audio/elevenlabs.mjs say ... --keep
//
// A take goes to .evidence/audio/voices/ for listening. --keep saves the chosen
// take in audio-src/voices/ and records it in tools/audio/catalog.json, since a
// generated take cannot be recreated identically. Credits used are logged.
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { EVIDENCE_DIR, REPO_ROOT, addCatalogEntry, parseArgs, portablePath, readKey, saveBytes, slug } from './sourcing.mjs';

const API = 'https://api.elevenlabs.io/v1';
export const DEFAULT_MODEL = 'eleven_multilingual_v2';

function headers(key) {
  return { 'xi-api-key': key, 'content-type': 'application/json' };
}

async function getJson(path, key, fetchImpl) {
  const response = await fetchImpl(`${API}${path}`, { headers: headers(key) });
  if (!response.ok) throw new Error(`ElevenLabs request failed: HTTP ${response.status}`);
  return response.json();
}

export async function credits({ fetchImpl = fetch, key = readKey('ELEVENLABS_API_KEY') } = {}) {
  const data = await getJson('/user/subscription', key, fetchImpl);
  return { tier: data.tier, used: data.character_count, limit: data.character_limit,
    left: data.character_limit - data.character_count, resets: data.next_character_count_reset_unix };
}

export async function voices({ fetchImpl = fetch, key = readKey('ELEVENLABS_API_KEY') } = {}) {
  const data = await getJson('/voices', key, fetchImpl);
  return (data.voices || []).map(voice => ({ id: voice.voice_id, name: voice.name,
    labels: Object.values(voice.labels || {}).filter(Boolean).join(', '), description: voice.description || '' }));
}

export function voiceSettings({ stability = .45, similarity = .8, style = .35 } = {}) {
  return { stability: Number(stability), similarity_boost: Number(similarity), style: Number(style), use_speaker_boost: true };
}

export async function say({ voice, line, text, model = DEFAULT_MODEL, keep = false, settings = {} },
  { fetchImpl = fetch, key = readKey('ELEVENLABS_API_KEY'), catalogPath } = {}) {
  if (!voice || !line || !text) throw new Error('say needs --voice, --line and --text.');
  const before = await credits({ fetchImpl, key });
  if (before.left < text.length) throw new Error(`Only ${before.left} credits left this month; this line needs about ${text.length}.`);
  const response = await fetchImpl(`${API}/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
    method: 'POST', headers: headers(key),
    body: JSON.stringify({ text, model_id: model, voice_settings: voiceSettings(settings) }),
  });
  if (!response.ok) throw new Error(`Voice generation failed: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const after = await credits({ fetchImpl, key });
  const folder = keep ? join(REPO_ROOT, 'audio-src', 'voices') : join(EVIDENCE_DIR, 'voices');
  const saved = saveBytes(join(folder, `${slug(line)}.mp3`), bytes);
  // The account counter can lag behind a generation; fall back to the
  // documented one credit per character and say that it is an estimate.
  const measured = after.used - before.used;
  const entry = {
    source: 'elevenlabs', key: line, cue: line, text, voiceId: voice, model, settings: voiceSettings(settings),
    creditsUsed: measured > 0 ? measured : text.length, creditsEstimated: !(measured > 0),
    license: 'ElevenLabs free plan, non-commercial, attribution',
    file: portablePath(saved.path, REPO_ROOT), sha256: saved.sha256, bytes: saved.bytes,
    generated: new Date().toISOString().slice(0, 10),
  };
  if (keep) addCatalogEntry(entry, catalogPath);
  return { entry, path: saved.path, creditsLeft: measured > 0 ? after.left : after.left - text.length };
}

// Keep a take already made for listening, without spending credits again.
export function keepTake({ take, line, voice, text, model = DEFAULT_MODEL, settings = {}, creditsUsed },
  { catalogPath, root = REPO_ROOT } = {}) {
  if (!take || !line || !voice || !text) throw new Error('keep-take needs --take, --line, --voice and --text.');
  const source = join(EVIDENCE_DIR, 'voices', `${slug(take)}.mp3`);
  const saved = saveBytes(join(root, 'audio-src', 'voices', `${slug(line)}.mp3`), readFileSync(source));
  const entry = {
    source: 'elevenlabs', key: line, cue: line, text, voiceId: voice, model, settings: voiceSettings(settings),
    creditsUsed: Number(creditsUsed) || text.length, creditsEstimated: !Number(creditsUsed),
    license: 'ElevenLabs free plan, non-commercial, attribution',
    file: portablePath(saved.path, root), sha256: saved.sha256, bytes: saved.bytes,
    generated: new Date().toISOString().slice(0, 10),
  };
  addCatalogEntry(entry, catalogPath);
  rmSync(source, { force: true });
  return { entry, path: saved.path };
}

async function main() {
  const { positional: [command], options } = parseArgs(process.argv.slice(2));
  if (command === 'credits') {
    const c = await credits();
    console.log(`Plan ${c.tier}: ${c.used} of ${c.limit} credits used, ${c.left} left.`);
    return;
  }
  if (command === 'voices') {
    for (const voice of await voices()) console.log(`${voice.id}  ${voice.name.padEnd(28)} ${voice.labels}`);
    return;
  }
  if (command === 'say') {
    const { path, entry, creditsLeft } = await say({
      voice: options.voice, line: options.line, text: options.text, model: options.model, keep: !!options.keep,
      settings: { stability: options.stability, similarity: options.similarity, style: options.style },
    });
    const estimate = entry.creditsEstimated ? 'about ' : '';
    console.log(`Saved ${entry.key} (${estimate}${entry.creditsUsed} credits, ${estimate}${creditsLeft} left) -> ${path}`);
    return;
  }
  if (command === 'keep-take') {
    const { path } = keepTake({ take: options.take, line: options.line, voice: options.voice, text: options.text,
      settings: { stability: options.stability, similarity: options.similarity, style: options.style } });
    console.log(`Kept ${options.take} as ${options.line} -> ${path}`);
    return;
  }
  console.log('Usage: node tools/audio/elevenlabs.mjs credits | voices | say --voice <id> --line <id> --text "..." [--keep] [--stability N --similarity N --style N]\n' +
    '       node tools/audio/elevenlabs.mjs keep-take --take <listening take> --line <id> --voice <id> --text "..." [settings]');
  process.exitCode = command ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href)
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
