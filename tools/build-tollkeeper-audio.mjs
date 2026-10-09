import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {ffmpeg} from './audio/codec.mjs';
import {loadCatalog, libraryRoot, sha256, CATALOG_PATH} from './audio/sourcing.mjs';
import {measureLoudness} from './audio/measurements.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RATE = 48000;
export const TOLLKEEPER_KLAXON_RECIPE = Object.freeze({
  cue: 'arena.toll-gate', source: '641335', start: 1.1, length: .46,
  rate: 2.4, filters: 'highpass=f=100,lowpass=f=2400',
});

export function buildTollkeeperAudio({
  out = join(ROOT, 'public/assets/audio/tollkeeper/gate-klaxon.ogg'),
  report = join(ROOT, '.qa-dist/tollkeeper-audio/build.json'),
} = {}) {
  const recipe = TOLLKEEPER_KLAXON_RECIPE;
  const source = loadCatalog().sounds.find(row => row.source === 'freesound' && row.key === recipe.source);
  if (!source || !/CC0/.test(source.license)) throw Error('Missing verified CC0 klaxon source');
  const bytes = readFileSync(join(libraryRoot(), source.file));
  if (sha256(bytes) !== source.sha256) throw Error('Klaxon source hash mismatch');
  const decoded = ffmpeg(['-i', 'pipe:0', '-ac', '1', '-ar', String(RATE),
    '-af', recipe.filters, '-f', 'f32le', 'pipe:1'], {input: bytes});
  const length = Math.round(RATE * recipe.length), pcm = Buffer.alloc(length * 4);
  if ((recipe.start * RATE + (length - 1) * recipe.rate + 1) * 4 >= decoded.length)
    throw Error('Klaxon cut exceeds its verified source');
  let peak = 0;
  for (let n = 0; n < length; n++) {
    const at = recipe.start * RATE + n * recipe.rate, floor = Math.floor(at), blend = at - floor;
    const sample = decoded.readFloatLE(floor * 4) * (1 - blend) + decoded.readFloatLE((floor + 1) * 4) * blend;
    const envelope = Math.min(1, n / (RATE * .006), (length - 1 - n) / (RATE * .035));
    const pulse = .8 + .2 * Math.sin(n / RATE * Math.PI * 2 * 14);
    const value = Math.tanh(sample * 6) * envelope * pulse;
    peak = Math.max(peak, Math.abs(value));
    pcm.writeFloatLE(value, n * 4);
  }
  if (peak < .0001) throw Error('Silent klaxon source cut');
  const conditioned = ffmpeg(['-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0',
    '-af', 'loudnorm=I=-18:TP=-3:LRA=7', '-ar', String(RATE), '-f', 'f32le', 'pipe:1'], {input: pcm});
  const recording = ffmpeg(['-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0',
    '-fflags', '+bitexact', '-flags:a', '+bitexact', '-map_metadata', '-1',
    '-c:a', 'libvorbis', '-q:a', '5', '-f', 'ogg', 'pipe:1'], {input: conditioned});
  const measured = measureLoudness(recording);
  if (!measured.available || measured.truePeakDbtp > -1.5) throw Error('Klaxon codec headroom failed');
  const result = {cue: recipe.cue, file: 'public/assets/audio/tollkeeper/gate-klaxon.ogg',
    bytes: recording.length, sha256: sha256(recording), sourceFile: source.file,
    sourceSha256: source.sha256, sourcePage: source.page, license: source.license,
    recipe, sampleRate: RATE, channels: 1, ...measured};
  mkdirSync(dirname(out), {recursive: true}); mkdirSync(dirname(report), {recursive: true});
  writeFileSync(out, recording);
  writeFileSync(report, JSON.stringify(result, null, 2) + '\n');
  const catalog = loadCatalog();
  catalog.sounds = catalog.sounds.filter(row => row.cue !== recipe.cue);
  catalog.sounds.push({...source, source: 'freesound-prepared', key: 'tollkeeper-gate-klaxon',
    cue: recipe.cue, runtime: {file: result.file, sha256: result.sha256, bytes: result.bytes,
      sampleRate: RATE, channels: 1, integratedLufs: result.integratedLufs, truePeakDbtp: result.truePeakDbtp},
    processing: {recipe: 'tools/build-tollkeeper-audio.mjs', ...recipe,
      approval: 'Director, 5 October 2026: derive one klaxon from cached CC0 hum; listening remains separate.'}});
  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n');
  return result;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  console.log(JSON.stringify(buildTollkeeperAudio()));
