// Six settled Arsenal wave-one cues, rebuilt only from verified cached CC0 recordings.
// Existing source recipes, runtime recordings and voice takes remain untouched.
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
  {name: 'C', cut: .005, rate: 1.03, tone: 1.035},
];
export const ARSENAL_WAVE_ONE_RECIPES = [
  {cue: 'weapon.harpoon.fire', stem: 'harpoon-fire', source: '384905',
    start: 0, length: .36, rate: .85, filters: 'highpass=f=700,lowpass=f=9500',
    tones: [[2100, 1150, .18, .23, 0], [3100, 1900, .1, .13, .05]]},
  {cue: 'weapon.harpoon.flight', stem: 'harpoon-flight', source: '391444',
    start: .18, length: .82, rate: .92, filters: 'highpass=f=1300,lowpass=f=8500',
    loop: true, tones: [[1800, 1350, .75, .13, 0], [3200, 2300, .24, .08, .08]]},
  {cue: 'weapon.harpoon.hit', stem: 'harpoon-hit', source: '592388',
    start: .02, length: .38, rate: 1.1, filters: 'highpass=f=800,lowpass=f=11000',
    tones: [[2650, 1850, .12, .25, 0], [1850, 1150, .2, .16, .055]]},
  {cue: 'weapon.harpoon.break', stem: 'harpoon-break', source: '536068',
    start: .015, length: .16, rate: 1.1, filters: 'highpass=f=1500,lowpass=f=11000',
    tones: [[3100, 4700, .12, .2, 0]]},
  {cue: 'weapon.caltrops.deploy', stem: 'caltrops-deploy', source: '249810',
    start: .1, length: .58, rate: 1.18, filters: 'highpass=f=1500,lowpass=f=11500',
    tones: [[2400, 1800, .1, .18, 0], [2900, 2050, .1, .16, .095],
      [3400, 2500, .14, .14, .19]]},
  {cue: 'weapon.caltrops.hit', stem: 'caltrops-hit', source: '592388',
    start: .48, length: .48, rate: 1.35, filters: 'highpass=f=1800,lowpass=f=12000',
    tones: [[3700, 2600, .12, .22, 0], [2600, 1800, .16, .16, .085]]},
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
function joinLoop(pcm) {
  const source = Float32Array.from({length: pcm.length / 4}, (_, i) => pcm.readFloatLE(i * 4));
  const overlap = Math.round(RATE * .035), data = source.slice(overlap);
  // The joined tail ends at the sample immediately before the retained head.
  // This keeps the existing mixer loop seamless without a second runtime voice.
  for (let i = 0; i < overlap; i++) {
    const blend = i / (overlap - 1), at = data.length - overlap + i;
    data[at] = data[at] * (1 - blend) + source[i] * blend;
  }
  const result = Buffer.alloc(data.length * 4);
  for (let i = 0; i < data.length; i++) result.writeFloatLE(data[i], i * 4);
  return result;
}
function render(recipe, variant) {
  const row = loadCatalog().sounds.find(row => row.source === 'freesound' && row.key === recipe.source);
  if (!row || !/CC0/i.test(row.license)) throw Error('Missing verified CC0 source ' + recipe.source);
  const bytes = readFileSync(join(libraryRoot(), row.file));
  if (sha256(bytes) !== row.sha256) throw Error('Library source hash mismatch ' + recipe.source);
  const raw = ffmpeg(['-i', 'pipe:0', '-ac', '1', '-ar', String(RATE),
    '-af', recipe.filters, '-f', 'f32le', 'pipe:1'], {input: bytes});
  const input = Float32Array.from({length: raw.length / 4}, (_, i) => raw.readFloatLE(i * 4));
  const data = new Float32Array(Math.round(recipe.length * RATE));
  const start = recipe.start + variant.cut, rate = recipe.rate * variant.rate;
  if (start * RATE + (data.length - 1) * rate + 1 >= input.length)
    throw Error('Source cut exceeds recording ' + recipe.cue);
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    const at = start * RATE + i * rate, a = Math.floor(at), blend = at - a;
    data[i] = input[a] * (1 - blend) + input[a + 1] * blend;
    peak = Math.max(peak, Math.abs(data[i]));
  }
  if (peak < 1e-5) throw Error('Silent source cut ' + recipe.cue);
  for (let i = 0; i < data.length; i++) data[i] *= .65 / peak;
  for (const [from, to, duration, volume, delay] of recipe.tones)
    addSweep(data, [from * variant.tone, to * variant.tone, duration, volume, delay]);
  const pcm = Buffer.alloc(data.length * 4);
  for (let i = 0; i < data.length; i++) {
    const fade = recipe.loop ? 1 : Math.min(1, i / (RATE * .002),
      (data.length - 1 - i) / (RATE * .035));
    pcm.writeFloatLE(data[i] * fade, i * 4);
  }
  const conditioned = ffmpeg(['-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0',
    '-af', 'acompressor=threshold=0.3:ratio=3:attack=2:release=65,' +
      'loudnorm=I=-16:TP=-2.5:LRA=11', '-ar', String(RATE), '-f', 'f32le', 'pipe:1'], {input: pcm});
  return recipe.loop ? joinLoop(conditioned) : conditioned;
}
export function buildArsenalWaveOneAudio({
  out = join(ROOT, 'public/assets/audio/arsenal-wave1'),
  report = join(ROOT, '.qa-dist/arsenal-wave1-audio/build.json'),
} = {}) {
  mkdirSync(out, {recursive: true});
  mkdirSync(dirname(report), {recursive: true});
  const rows = [];
  for (const recipe of ARSENAL_WAVE_ONE_RECIPES) for (const variant of VARIANTS) {
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
    const file = recipe.stem + '-' + variant.name.toLowerCase() + '.ogg';
    writeFileSync(join(out, file), bytes);
    const source = loadCatalog().sounds.find(row => row.source === 'freesound' && row.key === recipe.source);
    rows.push({cue: recipe.cue, variant: variant.name, file, bytes: bytes.length, sha256: sha256(bytes),
      sourceFile: source.file, sourceSha256: source.sha256, sourcePage: source.page, license: source.license,
      cutStart: recipe.start + variant.cut, cutRate: recipe.rate * variant.rate,
      duration: pcm.length / 4 / RATE, loop: !!recipe.loop, ...measured});
  }
  writeFileSync(report, JSON.stringify({sampleRate: RATE, channels: 1, rows}, null, 2) + '\n');
  return rows;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv.length !== 2) throw Error('Usage: node tools/build-arsenal-wave1-audio.mjs');
  for (const row of buildArsenalWaveOneAudio()) console.log(JSON.stringify(row));
}
