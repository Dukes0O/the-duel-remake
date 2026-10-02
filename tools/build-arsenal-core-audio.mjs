// Rebuild only the three released Arsenal core cues from cached CC0 recordings.
// The original library catalog records and downloaded bytes remain untouched.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {ffmpeg} from './audio/codec.mjs';
import {loadCatalog, libraryRoot, sha256} from './audio/sourcing.mjs';
import {measureLoudness} from './audio/measurements.mjs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RATE = 48000;
const VARIANTS = [
  {name: 'A', cut: 0, rate: 1, tone: 1},
  {name: 'B', cut: .002, rate: .97, tone: .98},
  {name: 'C', cut: .005, rate: .95, tone: 1.035},
];
export const ARSENAL_CORE_RECIPES = [
  {cue: 'weapon.oil.deploy', stem: 'oil-deploy', source: '389460',
    start: .55, length: .7, rate: 1.1, filters: 'highpass=f=350,lowpass=f=7000',
    tones: [[2000, 1100, .13, .23, 0], [1400, 850, .13, .16, .1]]},
  {cue: 'weapon.oil.slip', stem: 'oil-slip', source: '462117',
    start: 1.7, length: .8, rate: 1.08, filters: 'highpass=f=1100,lowpass=f=6500',
    tones: [[2850, 650, .45, .25, 0]]},
  {cue: 'weapon.smoke.deploy', stem: 'smoke-deploy', source: '855733',
    start: .12, length: .52, rate: .66, filters: 'highpass=f=1500,lowpass=f=9000',
    tones: [[1500, 3300, .11, .2, 0], [3300, 2400, .28, .12, .09]]},
];
function addSweep(data, [from, to, duration, volume, delay]) {
  const count = Math.round(duration * RATE), start = Math.round(delay * RATE);
  let phase = 0;
  for (let i = 0; i < count && start + i < data.length; i++) {
    const t = i / count;
    phase += 2 * Math.PI * (from + (to - from) * t) / RATE;
    const envelope = Math.min(1, i / (RATE * .003)) * (1 - t) ** .65;
    data[start + i] += Math.sin(phase) * volume * envelope;
  }
}
function render(recipe, variant) {
  const row = loadCatalog().sounds.find(row => row.cue === recipe.cue &&
    row.source === 'freesound' && row.key === recipe.source);
  if (!row || !/CC0/i.test(row.license)) throw Error('Missing CC0 recipe ' + recipe.cue);
  const bytes = readFileSync(join(libraryRoot(), row.file));
  if (sha256(bytes) !== row.sha256) throw Error('Library source hash mismatch ' + recipe.source);
  const raw = ffmpeg(['-i', 'pipe:0', '-ac', '1', '-ar', String(RATE),
    '-af', recipe.filters, '-f', 'f32le', 'pipe:1'], {input: bytes});
  const input = Float32Array.from({length: raw.length / 4}, (_, i) => raw.readFloatLE(i * 4));
  const data = new Float32Array(Math.round(recipe.length * RATE));
  const start = recipe.start + variant.cut, rate = recipe.rate * variant.rate;
  const last = start * RATE + (data.length - 1) * rate;
  if (last >= input.length) throw Error('Source cut exceeds recording ' + recipe.cue);
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    const at = start * RATE + i * rate, a = Math.floor(at), blend = at - a;
    data[i] = input[a] * (1 - blend) + input[a + 1] * blend;
    peak = Math.max(peak, Math.abs(data[i]));
  }
  if (peak < 1e-5) throw Error('Silent source cut ' + recipe.cue);
  // Keep the liquid/scrape/air recording dominant under its short arcade mark.
  for (let i = 0; i < data.length; i++) data[i] *= .65 / peak;
  for (const [from, to, duration, volume, delay] of recipe.tones)
    addSweep(data, [from * variant.tone, to * variant.tone, duration, volume, delay]);
  const pcm = Buffer.alloc(data.length * 4);
  for (let i = 0; i < data.length; i++) {
    const fade = Math.min(1, i / (RATE * .002), (data.length - 1 - i) / (RATE * .035));
    pcm.writeFloatLE(data[i] * fade, i * 4);
  }
  return ffmpeg(['-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0',
    '-af', 'acompressor=threshold=0.3:ratio=3:attack=2:release=65,' +
      'loudnorm=I=-16:TP=-2.5:LRA=11', '-ar', String(RATE), '-f', 'f32le', 'pipe:1'], {input: pcm});
}
export function buildArsenalCoreAudio({
  out = join(ROOT, 'public/assets/audio/arsenal-core'),
  report = join(ROOT, '.qa-dist/arsenal-core-audio/build.json'),
} = {}) {
  mkdirSync(out, {recursive: true});
  mkdirSync(dirname(report), {recursive: true});
  const rows = [];
  for (const recipe of ARSENAL_CORE_RECIPES) for (const variant of VARIANTS) {
    const pcm = render(recipe, variant);
    let attenuation = 0, bytes, measured;
    for (let attempt = 0; attempt < 3; attempt++) {
      bytes = ffmpeg(['-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0',
        '-af', 'volume=' + attenuation + 'dB', '-fflags', '+bitexact', '-flags:a', '+bitexact',
        '-map_metadata', '-1', '-c:a', 'libvorbis', '-q:a', '5', '-f', 'ogg', 'pipe:1'], {input: pcm});
      measured = measureLoudness(bytes);
      if (!measured.available) throw Error('Unmeasurable recording ' + recipe.cue);
      if (measured.truePeakDbtp <= -1.5) break;
      attenuation -= measured.truePeakDbtp + 1.65;
    }
    if (measured.truePeakDbtp > -1.5) throw Error('Codec headroom failed ' + recipe.cue);
    // Keep the already-built A bytes at their original runtime paths.
    const file = recipe.stem + (variant.name === 'A' ? '' : '-' + variant.name.toLowerCase()) + '.ogg';
    writeFileSync(join(out, file), bytes);
    rows.push({cue: recipe.cue, variant: variant.name, file, bytes: bytes.length, sha256: sha256(bytes),
      duration: recipe.length, ...measured});
  }
  writeFileSync(report, JSON.stringify({sampleRate: RATE, channels: 1, rows}, null, 2) + '\n');
  return rows;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv.length !== 2) throw Error('Usage: node tools/build-arsenal-core-audio.mjs');
  for (const row of buildArsenalCoreAudio()) console.log(JSON.stringify(row));
}
