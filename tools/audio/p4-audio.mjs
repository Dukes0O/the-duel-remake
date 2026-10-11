// Library-first Grand Prix cues. No network runs during build or game playback.
// Select/fetch inputs with tools/audio/freesound.mjs; raw files stay external.
// node tools/audio/p4-audio.mjs [--sources .qa-dist/p4-source-selection.json]
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {ffmpeg} from './codec.mjs';
import {loadCatalog, libraryRoot, sha256, CATALOG_PATH} from './sourcing.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RATE = 48000;
const recipe = (id, source, start, duration, options = {}) => Object.freeze({
  id, source: String(source), start, duration, rate: 1, loop: false,
  highpass: 70, lowpass: 11000, rms: .105, ...options,
});
export const P4_RECIPES = Object.freeze([
  recipe('race.start.light', 813525, 0, .28),
  recipe('race.start.go', 813525, 3, .95),
  recipe('race.position.gain', 541982, 0, 1.2, {rate: 1.2, rms: .075}),
  recipe('race.lap.final', 350616, 0, 2.4, {rate: 1.05}),
  recipe('race.finish.flag', 541982, 0, 2.0, {rate: .75, rms: .12}),
  recipe('pit.limiter', 651534, 2, 2.4, {loop: true, rate: .62, lowpass: 1900, rms: .055}),
  recipe('pit.wrench', 349398, .3, 1.5, {rms: .09}),
  recipe('pit.go', 813525, 3, .68, {rate: 1.25, rms: .075}),
  recipe('surface.gravel', 685231, 25, 8, {loop: true, highpass: 420, lowpass: 7500, rms: .035}),
  recipe('surface.snow', 71099, 2, 7.5, {loop: true, highpass: 350, lowpass: 5300, rms: .03}),
  recipe('surface.ice', 593623, .3, 5.5, {loop: true, highpass: 600, lowpass: 8000, rms: .027}),
  recipe('avalanche.rumble', 675734, 1, 4, {rate: .7, highpass: 35, lowpass: 900, rms: .12}),
  recipe('avalanche.slide', 675734, 0, 7.2, {highpass: 55, rms: .14}),
  recipe('yeti.roar', 132866, 0, 3.4, {rate: .8, highpass: 45, lowpass: 7500, rms: .12}),
  recipe('snowman.burst', 683786, 6.95, 1.2, {rate: 1.2, highpass: 180, rms: .10}),
  recipe('crowd.cheer', 274516, 1.5, 5, {highpass: 300, lowpass: 8000, rms: .06}),
  recipe('wind.summit', 725630, 30, 6, {highpass: 180, lowpass: 8000, rms: .045}),
  recipe('ambient.harbour-night', 342878, 55, 24, {loop: true, highpass: 90, lowpass: 6500, rms: .03}),
  recipe('ambient.forest-morning', 609952, 10, 24, {loop: true, highpass: 160, lowpass: 9500, rms: .025}),
  recipe('ambient.mountain-wind', 725630, 65, 24, {loop: true, highpass: 110, lowpass: 6500, rms: .03}),
]);
export const runtimeName = id => `p4/${id.replaceAll('.', '-')}.ogg`;

export function measurePcm(pcm) {
  let peak = 0, squares = 0;
  const samples = pcm.length / 4;
  for (let i = 0; i < samples; i++) {
    const value = pcm.readFloatLE(i * 4);
    if (!Number.isFinite(value)) throw Error('Non-finite audio sample');
    peak = Math.max(peak, Math.abs(value));
    squares += value * value;
  }
  return {duration: samples / RATE, peak, rms: Math.sqrt(squares / samples)};
}

function prepare(pcm, spec) {
  const count = pcm.length / 4;
  const overlap = spec.loop ? Math.min(Math.round(RATE * .18), Math.floor(count / 4)) : 0;
  const samples = count - overlap;
  const out = Buffer.alloc(samples * 4);
  for (let i = 0; i < samples; i++) {
    let value = pcm.readFloatLE(i * 4);
    if (spec.loop && i < overlap) {
      const t = i / overlap;
      value = value * t + pcm.readFloatLE((samples + i) * 4) * (1 - t);
    } else if (!spec.loop) {
      value *= Math.max(0, Math.min(1, i / (RATE * .008), (samples - i - 1) / (RATE * .09)));
    }
    out.writeFloatLE(value, i * 4);
  }
  const measured = measurePcm(out);
  if (measured.rms < .00001) throw Error(`${spec.id}: selected source cut is silent`);
  const gain = Math.min(spec.rms / measured.rms, .72 / measured.peak);
  for (let i = 0; i < samples; i++) out.writeFloatLE(out.readFloatLE(i * 4) * gain, i * 4);
  return out;
}

export function buildP4Audio({sourcesPath} = {}) {
  const catalog = loadCatalog();
  const extra = sourcesPath && existsSync(sourcesPath) ? loadCatalog(sourcesPath).sounds : [];
  const sources = [...extra, ...catalog.sounds];
  const results = [];
  for (const spec of P4_RECIPES) {
    const source = sources.find(row => row.key === spec.source && /^(CC0 1\.0|CC BY [34]\.0)$/.test(row.license));
    if (!source) throw Error(`${spec.id}: missing licensed source ${spec.source}`);
    const input = readFileSync(join(libraryRoot(), source.file));
    if (sha256(input) !== source.sha256) throw Error(`${spec.id}: source checksum changed`);
    const filtered = ffmpeg(['-threads', '1', '-filter_threads', '1', '-i', join(libraryRoot(), source.file),
      '-ac', '1', '-ar', String(RATE), '-af',
      `aresample=${RATE},atrim=start=${spec.start}:duration=${spec.duration * spec.rate},asetpts=PTS-STARTPTS,highpass=f=${spec.highpass},lowpass=f=${spec.lowpass},asetrate=${RATE * spec.rate},aresample=${RATE}`,
      '-f', 'f32le', 'pipe:1']);
    const pcm = prepare(filtered, spec);
    const bytes = ffmpeg(['-threads', '1', '-filter_threads', '1', '-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0',
      '-fflags', '+bitexact', '-flags:a', '+bitexact', '-map_metadata', '-1',
      '-c:a', 'libvorbis', '-q:a', '5', '-f', 'ogg', 'pipe:1'], {input: pcm});
    const decoded = ffmpeg(['-threads', '1', '-filter_threads', '1', '-i', 'pipe:0', '-ac', '1', '-ar', String(RATE), '-f', 'f32le', 'pipe:1'], {input: bytes});
    const measured = measurePcm(decoded);
    if (measured.peak > .99 || measured.rms < .0001) throw Error(`${spec.id}: encoded audio level failed`);
    const file = `public/assets/audio/${runtimeName(spec.id)}`;
    mkdirSync(dirname(join(ROOT, file)), {recursive: true});
    writeFileSync(join(ROOT, file), bytes);
    const runtime = {file, sha256: sha256(bytes), bytes: bytes.length, sampleRate: RATE, channels: 1, ...measured};
    const {cue, processing, runtime: oldRuntime, ...credit} = source;
    results.push({...credit, cue: spec.id, processing: {script: 'tools/audio/p4-audio.mjs', ...spec}, runtime});
  }
  const additions = new Set(P4_RECIPES.map(spec => spec.id));
  catalog.sounds = [...catalog.sounds.filter(row => !additions.has(row.cue)), ...results];
  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n');
  return results.map(row => ({cue: row.cue, ...row.runtime}));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const index = process.argv.indexOf('--sources');
  console.log(JSON.stringify(buildP4Audio({sourcesPath: index >= 0 ? process.argv[index + 1] : undefined}), null, 2));
}
