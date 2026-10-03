// Seven ARS-02 recordings rebuilt from verified cached CC0 Freesound previews.
// Existing source recipes and runtime recordings are never rewritten.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {ffmpeg} from './audio/codec.mjs';
import {loadCatalog, libraryRoot, sha256} from './audio/sourcing.mjs';
import {measureLoudness} from './audio/measurements.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RATE = 48000;
const VARIANTS = [
  {name: 'A', cut: 0, rate: 1},
  {name: 'B', cut: .004, rate: .97},
  {name: 'C', cut: .009, rate: 1.03},
];
export const ARSENAL_WAVE_TWO_RECIPES = [
  {cue: 'weapon.rockets.fire', stem: 'rocket-fire', source: '854473',
    start: .03, length: .42, rate: 1, filters: 'highpass=f=110,lowpass=f=10000'},
  {cue: 'weapon.rockets.flight', stem: 'rocket-flight', source: '855733',
    start: .025, length: .45, rate: .9, filters: 'highpass=f=450,lowpass=f=9000', loop: true},
  {cue: 'weapon.rockets.hit', stem: 'rocket-hit', source: '397691',
    start: .02, length: .62, rate: 1, filters: 'highpass=f=85,lowpass=f=11000'},
  {cue: 'weapon.flame.start', stem: 'flame-start', source: '395039',
    start: 2.17, length: .54, rate: 1, filters: 'highpass=f=120,lowpass=f=11000'},
  {cue: 'weapon.flame.loop', stem: 'flame-loop', source: '395039',
    start: 5.2, length: 1.16, rate: 1, filters: 'highpass=f=120,lowpass=f=9000', loop: true},
  {cue: 'weapon.flame.end', stem: 'flame-end', source: '395039',
    start: 12.43, length: .68, rate: 1, filters: 'highpass=f=120,lowpass=f=10000'},
  {cue: 'weapon.magnet.hum', stem: 'magnet-hum', source: '641335',
    start: 1.1, length: 1.28, rate: 1, filters: 'highpass=f=70,lowpass=f=4500', loop: true},
];

const sourceCache = new Map();
function sourceFor(recipe) {
  const row = loadCatalog().sounds.find(sound =>
    sound.source === 'freesound' && sound.key === recipe.source);
  if (!row || !/CC0/i.test(row.license)) throw Error('Missing verified CC0 source ' + recipe.source);
  const bytes = readFileSync(join(libraryRoot(), row.file));
  if (sha256(bytes) !== row.sha256) throw Error('Source hash mismatch ' + recipe.source);
  const cacheKey = recipe.source + ':' + recipe.filters;
  if (!sourceCache.has(cacheKey)) {
    const raw = ffmpeg(['-i', 'pipe:0', '-ac', '1', '-ar', String(RATE),
      '-af', recipe.filters, '-f', 'f32le', 'pipe:1'], {input: bytes});
    sourceCache.set(cacheKey, Float32Array.from({length: raw.length / 4},
      (_, i) => raw.readFloatLE(i * 4)));
  }
  return {row, samples: sourceCache.get(cacheKey)};
}
function joinLoop(pcm) {
  const source = Float32Array.from({length: pcm.length / 4}, (_, i) => pcm.readFloatLE(i * 4));
  const overlap = Math.round(RATE * .035), data = source.slice(overlap);
  for (let i = 0; i < overlap; i++) {
    const blend = i / (overlap - 1), at = data.length - overlap + i;
    data[at] = data[at] * (1 - blend) + source[i] * blend;
  }
  const result = Buffer.alloc(data.length * 4);
  for (let i = 0; i < data.length; i++) result.writeFloatLE(data[i], i * 4);
  return result;
}
function render(recipe, variant) {
  const {samples} = sourceFor(recipe), data = new Float32Array(Math.round(recipe.length * RATE));
  const start = recipe.start + variant.cut, rate = recipe.rate * variant.rate;
  if (start * RATE + (data.length - 1) * rate + 1 >= samples.length)
    throw Error('Source cut exceeds recording ' + recipe.cue);
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    const at = start * RATE + i * rate, a = Math.floor(at), blend = at - a;
    data[i] = samples[a] * (1 - blend) + samples[a + 1] * blend;
    peak = Math.max(peak, Math.abs(data[i]));
  }
  if (peak < .0001) throw Error('Silent source cut ' + recipe.cue);
  const pcm = Buffer.alloc(data.length * 4);
  for (let i = 0; i < data.length; i++) {
    const fade = recipe.loop ? 1 : Math.min(1, i / (RATE * .004),
      (data.length - 1 - i) / (RATE * .035));
    pcm.writeFloatLE(data[i] * fade, i * 4);
  }
  const conditioned = ffmpeg(['-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0',
    '-af', 'acompressor=threshold=0.3:ratio=3:attack=2:release=65,' +
      'loudnorm=I=-16:TP=-2.5:LRA=11', '-ar', String(RATE),
    '-f', 'f32le', 'pipe:1'], {input: pcm});
  return recipe.loop ? joinLoop(conditioned) : conditioned;
}
export function measureArsenalWaveTwoCue(bytes) {
  const decoded = ffmpeg(['-i', 'pipe:0', '-ac', '1', '-ar', String(RATE),
    '-f', 'f32le', 'pipe:1'], {input: bytes});
  const duration = decoded.length / 4 / RATE;
  const analysisDurationSec = duration < .4 ? 1 : duration;
  const analysis = duration < .4 ? ffmpeg(['-f', 'f32le', '-ar', String(RATE),
    '-ac', '1', '-i', 'pipe:0', '-af', 'apad=whole_dur=1',
    '-c:a', 'pcm_f32le', '-f', 'wav', 'pipe:1'], {input: decoded}) : bytes;
  return {...measureLoudness(analysis), duration,
    analysisDurationSec, analysisPaddingSec: analysisDurationSec - duration};
}
export function buildArsenalWaveTwoAudio({
  out = join(ROOT, 'public/assets/audio/arsenal-wave2'),
  report = join(ROOT, '.qa-dist/arsenal-wave2-audio/build.json'),
} = {}) {
  mkdirSync(out, {recursive: true});
  mkdirSync(dirname(report), {recursive: true});
  const rows = [];
  for (const recipe of ARSENAL_WAVE_TWO_RECIPES) for (const variant of VARIANTS) {
    const pcm = render(recipe, variant);
    let attenuation = 0, bytes, measured;
    for (let attempt = 0; attempt < 3; attempt++) {
      bytes = ffmpeg(['-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0',
        '-af', 'volume=' + attenuation + 'dB', '-fflags', '+bitexact', '-flags:a', '+bitexact',
        '-map_metadata', '-1', '-c:a', 'libvorbis', '-q:a', '5', '-f', 'ogg', 'pipe:1'], {input: pcm});
      measured = measureArsenalWaveTwoCue(bytes);
      if (!measured.available) throw Error('Unmeasurable recording ' + recipe.cue);
      if (measured.truePeakDbtp <= -1.5) break;
      attenuation -= measured.truePeakDbtp + 1.65;
    }
    if (measured.truePeakDbtp > -1.5) throw Error('Codec headroom failed ' + recipe.cue);
    const file = recipe.stem + '-' + variant.name.toLowerCase() + '.ogg';
    writeFileSync(join(out, file), bytes);
    const {row} = sourceFor(recipe);
    rows.push({cue: recipe.cue, variant: variant.name, file, bytes: bytes.length,
      sha256: sha256(bytes), sourceFile: row.file, sourceSha256: row.sha256,
      sourcePage: row.page, license: row.license,
      cutStart: recipe.start + variant.cut, cutRate: recipe.rate * variant.rate,
      loop: !!recipe.loop, ...measured});
  }
  writeFileSync(report, JSON.stringify({sampleRate: RATE, channels: 1, rows}, null, 2) + '\n');
  return rows;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv.length !== 2) throw Error('Usage: node tools/build-arsenal-wave2-audio.mjs');
  for (const row of buildArsenalWaveTwoAudio()) console.log(JSON.stringify(row));
}
