import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {ffmpeg} from './audio/codec.mjs';
import {loadCatalog, libraryRoot, sha256} from './audio/sourcing.mjs';
import {measureArsenalWaveTwoCue} from './build-arsenal-wave2-audio.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RATE = 48000;
const VARIANTS = [{name: 'A', cut: 0, rate: 1}, {name: 'B', cut: .004, rate: .97},
  {name: 'C', cut: .009, rate: 1.03}];
export const ARSENAL_WAVE_THREE_RECIPES = [
  {cue: 'weapon.mortar.fire', stem: 'mortar-fire', source: '854476',
    start: .04, length: .48, rate: .88, filters: 'highpass=f=160,lowpass=f=8500'},
  {cue: 'weapon.mortar.whistle', stem: 'mortar-whistle', source: '855733',
    start: .025, length: .4, rate: .95, filters: 'highpass=f=700,lowpass=f=10000', loop: true},
  {cue: 'weapon.mortar.hit', stem: 'mortar-hit', source: '397691',
    start: .02, length: .64, rate: .9, filters: 'highpass=f=120,lowpass=f=10000'},
  {cue: 'weapon.tesla.charge', stem: 'tesla-charge', source: '641335',
    start: 1.1, length: .4, rate: 1.4, filters: 'highpass=f=300,lowpass=f=7000,tremolo=f=30:d=.8'},
  {cue: 'weapon.tesla.pulse', stem: 'tesla-pulse', source: '641335',
    start: 2.1, length: .48, rate: 2, filters: 'highpass=f=700,lowpass=f=9000,tremolo=f=60:d=1'},
  {cue: 'weapon.decoy.deploy', stem: 'decoy-deploy', source: '384905',
    start: .02, length: .48, rate: 1.25, filters: 'highpass=f=350,lowpass=f=10000'},
  {cue: 'weapon.decoy.burst', stem: 'decoy-burst', source: '592388',
    start: .02, length: .6, rate: 1.3, filters: 'highpass=f=400,lowpass=f=11000'},
  {cue: 'weapon.nitro.start', stem: 'nitro-start', source: '651534',
    start: 2.2, length: .6, rate: 1.2, filters: 'highpass=f=180,lowpass=f=10000'},
  {cue: 'weapon.nitro.loop', stem: 'nitro-loop', source: '651534',
    start: 2.7, length: 1.1, rate: 1.2, filters: 'highpass=f=180,lowpass=f=8500', loop: true},
];

const decodedSources = new Map();
function sourceFor(recipe) {
  const row = loadCatalog().sounds.find(sound => sound.source === 'freesound' && sound.key === recipe.source);
  if (!row || !/CC0/i.test(row.license)) throw Error('Missing verified CC0 source ' + recipe.source);
  const bytes = readFileSync(join(libraryRoot(), row.file));
  if (sha256(bytes) !== row.sha256) throw Error('Source hash mismatch ' + recipe.source);
  const key = recipe.source + ':' + recipe.filters;
  if (!decodedSources.has(key)) {
    const raw = ffmpeg(['-i', 'pipe:0', '-ac', '1', '-ar', String(RATE),
      '-af', recipe.filters, '-f', 'f32le', 'pipe:1'], {input: bytes});
    decodedSources.set(key, Float32Array.from({length: raw.length / 4}, (_, i) => raw.readFloatLE(i * 4)));
  }
  return {row, samples: decodedSources.get(key)};
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
export function buildArsenalWaveThreeAudio({out = join(ROOT, 'public/assets/audio/arsenal-wave3'),
  report = join(ROOT, '.qa-dist/arsenal-wave3-audio/build.json')} = {}) {
  mkdirSync(out, {recursive: true});
  mkdirSync(dirname(report), {recursive: true});
  const rows = [];
  for (const recipe of ARSENAL_WAVE_THREE_RECIPES) for (const variant of VARIANTS) {
    const {row, samples} = sourceFor(recipe), rate = recipe.rate * variant.rate;
    const length = Math.round(RATE * recipe.length), start = RATE * (recipe.start + variant.cut);
    if (start + (length - 1) * rate + 1 >= samples.length)
      throw Error('Source cut exceeds recording ' + recipe.cue);
    const cut = Buffer.alloc(length * 4);
    for (let i = 0; i < length; i++) {
      const at = start + i * rate, a = Math.floor(at), blend = at - a;
      const fade = recipe.loop ? 1 : Math.min(1, i / (RATE * .004), (length - 1 - i) / (RATE * .035));
      cut.writeFloatLE((samples[a] * (1 - blend) + samples[a + 1] * blend) * fade, i * 4);
    }
    let pcm = ffmpeg(['-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0',
      '-af', 'acompressor=threshold=0.3:ratio=3:attack=2:release=65,loudnorm=I=-16:TP=-2.5:LRA=11',
      '-ar', String(RATE), '-f', 'f32le', 'pipe:1'], {input: cut});
    if (recipe.loop) pcm = joinLoop(pcm);
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
    rows.push({cue: recipe.cue, variant: variant.name, file, bytes: bytes.length,
      sha256: sha256(bytes), sourceFile: row.file, sourceSha256: row.sha256,
      sourcePage: row.page, license: row.license, cutStart: recipe.start + variant.cut,
      cutRate: rate, loop: !!recipe.loop, ...measured});
  }
  writeFileSync(report, JSON.stringify({sampleRate: RATE, channels: 1, rows}, null, 2) + '\n');
  return rows;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv.length !== 2) throw Error('Usage: node tools/build-arsenal-wave3-audio.mjs');
  for (const row of buildArsenalWaveThreeAudio()) console.log(JSON.stringify(row));
}
