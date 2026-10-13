// DEEP-AUDIO: selected CC0 inputs stay in the external cache.
// node tools/audio/build-deep.mjs [--sources .qa-dist/deep-source-selection.json]
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {ffmpeg} from './codec.mjs';
import {measureLoudness, loopSeam} from './measurements.mjs';
import {loadCatalog, libraryRoot, sha256} from './sourcing.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RATE = 48000;
const recipe = (id, source, start, duration, options = {}) => Object.freeze({
  id, source: String(source), start, duration, rate: 1, loop: false,
  highpass: 55, lowpass: 2200, loudness: -20, ...options,
});
export const DEEP_RECIPES = Object.freeze([
  recipe('deep.splash', 442773, 0, 2.1, {lowpass: 1800, loudness: -22}),
  recipe('deep.engine-muffle', 651534, 2, 1.8, {lowpass: 520, loudness: -22}),
  recipe('deep.bubbles', 208816, 8, 10, {loop: true, highpass: 100, lowpass: 2800}),
  recipe('deep.sand-land', 683786, 6.95, .9, {rate: .85, lowpass: 1000, loudness: -22}),
  recipe('deep.logged', 350616, 0, 1.5, {rate: 1.15, highpass: 400, lowpass: 5000, loudness: -22}),
  recipe('deep.pearl', 541982, 0, 1.4, {rate: .9, highpass: 250, lowpass: 4500, loudness: -22}),
  recipe('deep.whale', 82325, 8, 12, {highpass: 70, lowpass: 1800}),
  recipe('deep.cave', 504641, 12, 12, {loop: true, highpass: 45, lowpass: 900}),
]);
export const deepRuntimeName = spec => `deep/${spec.id.slice(5)}.${spec.loop ? 'flac' : 'ogg'}`;

// Crossfade the tail over the beginning, so wrapping reaches the next sample.
function prepareLoop(pcm) {
  const count = pcm.length / 4, overlap = Math.round(RATE * .18);
  if (count < overlap * 4) throw Error('Loop cut too short');
  const samples = count - overlap, out = Buffer.alloc(samples * 4);
  for (let i = 0; i < samples; i++) {
    let value = pcm.readFloatLE(i * 4);
    if (i < overlap) {
      const mix = i / overlap;
      value = value * mix + pcm.readFloatLE((samples + i) * 4) * (1 - mix);
    }
    out.writeFloatLE(value, i * 4);
  }
  return out;
}

export function buildDeepAudio({sourcesPath, root = ROOT, library = libraryRoot()} = {}) {
  const catalog = loadCatalog(join(root, 'tools/audio/catalog.json'));
  const extra = sourcesPath ? loadCatalog(sourcesPath).sounds : [];
  const sources = [...extra, ...catalog.sounds], results = [];
  for (const spec of DEEP_RECIPES) {
    const source = sources.find(row => row.key === spec.source && row.license === 'CC0 1.0');
    if (!source) throw Error(`${spec.id}: missing verified CC0 source ${spec.source}`);
    const input = readFileSync(join(library, source.file));
    if (sha256(input) !== source.sha256) throw Error(`${spec.id}: source hash changed`);
    const cut = ffmpeg(['-threads', '1', '-filter_threads', '1', '-i', join(library, source.file),
      '-ac', '1', '-af', `aresample=${RATE},atrim=start=${spec.start}:duration=${spec.duration * spec.rate},asetpts=PTS-STARTPTS,highpass=f=${spec.highpass},lowpass=f=${spec.lowpass},asetrate=${RATE * spec.rate},aresample=${RATE}`,
      '-ar', String(RATE), '-f', 'f32le', 'pipe:1']);
    if (cut.length / 4 < RATE * (spec.duration - .05)) throw Error(`${spec.id}: incomplete source cut`);
    const pcm = cut;
    const duration = pcm.length / 4 / RATE;
    const fades = spec.loop ? '' : `afade=t=in:d=0.012,afade=t=out:st=${Math.max(0, duration - .16)}:d=0.16,`;
    const args = ['-threads', '1', '-filter_threads', '1', '-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0',
      '-af', `${fades}loudnorm=I=${spec.loudness}:TP=-3:LRA=11,aresample=${RATE},alimiter=limit=0.70:level=false`,
      '-ar', String(RATE), '-fflags', '+bitexact', '-flags:a', '+bitexact', '-map_metadata', '-1'];
    // Apply loop overlap after all level filters and their lookahead delays.
    const normalized = ffmpeg([...args, '-f', 'f32le', 'pipe:1'], {input: pcm});
    const ready = spec.loop ? prepareLoop(normalized) : normalized;
    const bytes = ffmpeg(['-threads', '1', '-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0',
      '-fflags', '+bitexact', '-flags:a', '+bitexact', '-map_metadata', '-1',
      ...(spec.loop ? ['-c:a', 'flac', '-sample_fmt', 's16', '-f', 'flac'] :
      ['-c:a', 'libvorbis', '-q:a', '5', '-f', 'ogg']), 'pipe:1'], {input: ready});
    const measured = measureLoudness(bytes);
    if (!measured.available || measured.truePeakDbtp > -1 || Math.abs(measured.integratedLufs - spec.loudness) > 2)
      throw Error(`${spec.id}: encoded loudness/peak failed ${JSON.stringify(measured)}`);
    const decoded = ffmpeg(['-threads', '1', '-i', 'pipe:0', '-ac', '1', '-ar', String(RATE), '-f', 'f32le', 'pipe:1'], {input: bytes});
    const samples = Float32Array.from({length: decoded.length / 4}, (_, i) => decoded.readFloatLE(i * 4));
    const seam = spec.loop ? loopSeam([samples], RATE) : null;
    if (seam && !seam.pass) throw Error(`${spec.id}: encoded loop seam failed`);
    const file = `public/assets/audio/${deepRuntimeName(spec)}`;
    mkdirSync(dirname(join(root, file)), {recursive: true});
    writeFileSync(join(root, file), bytes);
    const {cue, processing, runtime, ...credit} = source;
    results.push({...credit, cue: spec.id, processing: {script: 'tools/audio/build-deep.mjs', ...spec,
      loopOverlapSec: spec.loop ? .18 : 0, fadeInSec: spec.loop ? 0 : .012, fadeOutSec: spec.loop ? 0 : .16,
      normalization: 'FFmpeg loudnorm, TP -3, LRA 11; limiter .70 without auto-level', codec: spec.loop ? 'FLAC s16' : 'Vorbis q5'},
      runtime: {file, sha256: sha256(bytes), bytes: bytes.length, sampleRate: RATE, channels: 1,
        duration: samples.length / RATE, integratedLufs: measured.integratedLufs, truePeakDbtp: measured.truePeakDbtp,
        loopSeam: seam}});
  }
  const ids = new Set(DEEP_RECIPES.map(spec => spec.id));
  catalog.sounds = [...catalog.sounds.filter(row => !ids.has(row.cue)), ...results];
  writeFileSync(join(root, 'tools/audio/catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  return results.map(row => ({cue: row.cue, ...row.runtime}));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const index = process.argv.indexOf('--sources');
  console.log(JSON.stringify(buildDeepAudio({sourcesPath: index < 0 ? undefined : process.argv[index + 1]}), null, 2));
}
