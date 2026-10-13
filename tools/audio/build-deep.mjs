// DEEP-AUDIO: selected CC0 inputs stay in the external cache.
// node tools/audio/build-deep.mjs [--sources PATH] [--cues ID,ID]
// node tools/audio/build-deep.mjs --listening OUTPUT
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {ffmpeg} from './codec.mjs';
import {measureLoudness, loopSeam} from './measurements.mjs';
import {loadCatalog, libraryRoot, sha256} from './sourcing.mjs';
import {SOUND_BANK} from '../../src/sound-bank.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RATE = 48000;
const recipe = (id, source, start, duration, options = {}) => Object.freeze({
  id, source: String(source), start, duration, rate: 1, loop: false,
  highpass: 55, lowpass: 2200, loudness: -20, ...options,
});
export const DEEP_RECIPES = Object.freeze([
  recipe('deep.splash', 442773, 0, 2.1, {lowpass: 1800, loudness: -22}),
  recipe('deep.engine-muffle', 651534, 2, 1.8, {lowpass: 520, loudness: -22}),
  recipe('deep.bubbles', 208816, 8, 10, {loop: true, format: 'ogg', highpass: 100, lowpass: 2800}),
  recipe('deep.sand-land', 683786, 6.95, .9, {rate: .85, lowpass: 1000, loudness: -22}),
  recipe('deep.logged', 350616, 0, 1.5, {rate: 1.15, highpass: 400, lowpass: 5000, loudness: -22}),
  recipe('deep.pearl', 541982, 0, 2, {rate: .72, highpass: 250, lowpass: 4500, loudness: -22,
    shimmer: {layerSec: .68, fadeSec: .08, layers: [
      {at: 0, pitch: 1, gain: .7}, {at: .33, pitch: 1.4, gain: .7},
      {at: .66, pitch: 1.8, gain: .7}, {at: .99, pitch: 2.3, gain: .7},
      {at: 1.32, pitch: 3, gain: .7},
    ]}}),
  recipe('deep.whale', 82325, 8, 12, {highpass: 70, lowpass: 1800}),
  recipe('deep.cave', 504641, 12, 12, {loop: true, format: 'ogg', highpass: 45, lowpass: 900}),
]);
export const deepRuntimeName = spec => `deep/${spec.id.slice(5)}.${spec.format ?? (spec.loop ? 'flac' : 'ogg')}`;

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

// Ascending echoes use the same licensed chime, with each layer's true pitch.
// Fade every layer at both ends; the final, highest layer ends the shimmer.
function prepareShimmer(pcm, spec) {
  const samples = pcm.length / 4, out = Buffer.alloc(Math.round(RATE * spec.duration) * 4);
  for (const layer of spec.shimmer.layers) {
    const start = Math.round(layer.at * RATE);
    const count = Math.min(Math.round(spec.shimmer.layerSec * RATE),
      Math.floor((samples - 1) / layer.pitch), out.length / 4 - start);
    for (let i = 0; i < count; i++) {
      const at = i * layer.pitch, index = Math.floor(at), share = at - index;
      const value = pcm.readFloatLE(index * 4) * (1 - share) + pcm.readFloatLE((index + 1) * 4) * share;
      const fade = Math.min(1, i / (RATE * .012), (count - 1 - i) / (RATE * spec.shimmer.fadeSec));
      const offset = (start + i) * 4;
      out.writeFloatLE(out.readFloatLE(offset) + value * layer.gain * fade, offset);
    }
  }
  return out;
}

export function buildDeepAudio({sourcesPath, root = ROOT, library = libraryRoot(), recipes = DEEP_RECIPES} = {}) {
  if (!recipes.length || !recipes.every(spec => DEEP_RECIPES.includes(spec)))
    throw Error('Select existing Deep recipes only');
  const catalog = loadCatalog(join(root, 'tools/audio/catalog.json'));
  const extra = sourcesPath ? loadCatalog(sourcesPath).sounds : [];
  const sources = [...extra, ...catalog.sounds], results = [];
  for (const spec of recipes) {
    const source = sources.find(row => row.key === spec.source && row.license === 'CC0 1.0');
    if (!source) throw Error(`${spec.id}: missing verified CC0 source ${spec.source}`);
    const input = readFileSync(join(library, source.file));
    if (sha256(input) !== source.sha256) throw Error(`${spec.id}: source hash changed`);
    const cut = ffmpeg(['-threads', '1', '-filter_threads', '1', '-i', join(library, source.file),
      '-ac', '1', '-af', `aresample=${RATE},atrim=start=${spec.start}:duration=${spec.duration * spec.rate},asetpts=PTS-STARTPTS,highpass=f=${spec.highpass},lowpass=f=${spec.lowpass},asetrate=${RATE * spec.rate},aresample=${RATE}`,
      '-ar', String(RATE), '-f', 'f32le', 'pipe:1']);
    if (cut.length / 4 < RATE * (spec.duration - .05)) throw Error(`${spec.id}: incomplete source cut`);
    const pcm = spec.shimmer ? prepareShimmer(cut, spec) : cut;
    const duration = pcm.length / 4 / RATE;
    const fades = spec.loop ? '' : `afade=t=in:d=0.012,afade=t=out:st=${Math.max(0, duration - .16)}:d=0.16,`;
    const args = ['-threads', '1', '-filter_threads', '1', '-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0',
      '-af', `${fades}loudnorm=I=${spec.loudness}:TP=-3:LRA=11,aresample=${RATE},alimiter=limit=0.70:level=false`,
      '-ar', String(RATE), '-fflags', '+bitexact', '-flags:a', '+bitexact', '-map_metadata', '-1'];
    // Apply loop overlap after all level filters and their lookahead delays.
    const normalized = ffmpeg([...args, '-f', 'f32le', 'pipe:1'], {input: pcm});
    const ready = spec.loop ? prepareLoop(normalized) : normalized;
    const lossless = spec.loop && spec.format !== 'ogg';
    const bytes = ffmpeg(['-threads', '1', '-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0',
      '-fflags', '+bitexact', '-flags:a', '+bitexact', '-map_metadata', '-1',
      ...(lossless ? ['-c:a', 'flac', '-sample_fmt', 's16', '-f', 'flac'] :
      ['-c:a', 'libvorbis', '-q:a', '5', '-f', 'ogg']), 'pipe:1'], {input: ready});
    const measured = measureLoudness(bytes);
    if (!measured.available || measured.truePeakDbtp > -1 || Math.abs(measured.integratedLufs - spec.loudness) > 2)
      throw Error(`${spec.id}: encoded loudness/peak failed ${JSON.stringify(measured)}`);
    const decoded = ffmpeg(['-threads', '1', '-i', 'pipe:0', '-ac', '1', '-ar', String(RATE), '-f', 'f32le', 'pipe:1'], {input: bytes});
    const samples = Float32Array.from({length: decoded.length / 4}, (_, i) => decoded.readFloatLE(i * 4));
    const seam = spec.loop ? loopSeam([samples], RATE) : null;
    if (seam && !seam.pass) throw Error(`${spec.id}: encoded loop seam failed ${JSON.stringify(seam)}`);
    const file = `public/assets/audio/${deepRuntimeName(spec)}`;
    mkdirSync(dirname(join(root, file)), {recursive: true});
    writeFileSync(join(root, file), bytes);
    const {cue, processing, runtime, ...credit} = source;
    results.push({...credit, cue: spec.id, processing: {script: 'tools/audio/build-deep.mjs', ...spec,
      loopOverlapSec: spec.loop ? .18 : 0, fadeInSec: spec.loop ? 0 : .012, fadeOutSec: spec.loop ? 0 : .16,
      normalization: 'FFmpeg loudnorm, TP -3, LRA 11; limiter .70 without auto-level', codec: lossless ? 'FLAC s16' : 'Vorbis q5'},
      runtime: {file, sha256: sha256(bytes), bytes: bytes.length, sampleRate: RATE, channels: 1,
        duration: samples.length / RATE, integratedLufs: measured.integratedLufs, truePeakDbtp: measured.truePeakDbtp,
        loopSeam: seam}});
  }
  const updates = new Map(results.map(row => [row.cue, row]));
  const present = new Set(catalog.sounds.map(row => row.cue));
  catalog.sounds = [...catalog.sounds.map(row => updates.get(row.cue) ?? row),
    ...results.filter(row => !present.has(row.cue))];
  writeFileSync(join(root, 'tools/audio/catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  return results.map(row => ({cue: row.cue, ...row.runtime}));
}

// Same offline PCM/labelled-MP3 method as p4-listening.mjs, at actual cue gain
// and unchanged master .42. This does not exercise the native underwater mix.
export function buildDeepListening(out, root = ROOT) {
  const catalog = loadCatalog(join(root, 'tools/audio/catalog.json'));
  const parts = [], labels = [];
  let time = 0;
  mkdirSync(out, {recursive: true});
  for (const spec of DEEP_RECIPES) {
    const row = catalog.sounds.find(item => item.cue === spec.id), cue = SOUND_BANK[spec.id];
    const filter = (spec.loop ? 'afade=t=out:st=5.8:d=0.2,' : '') + `volume=${cue.volume * .42}`;
    const pcm = ffmpeg(['-threads', '1', '-filter_threads', '1', '-i', join(root, row.runtime.file),
      '-t', '6', '-af', filter, '-ac', '1', '-ar', String(RATE), '-f', 'f32le', 'pipe:1']);
    const duration = pcm.length / 4 / RATE;
    labels.push({cue: spec.id, start: time, duration, gain: cue.volume,
      source: row.runtime.file, sha256: row.runtime.sha256, auditionFadeOutSec: spec.loop ? .2 : 0});
    parts.push(pcm, Buffer.alloc(RATE * 4)); time += duration + 1;
  }
  const bytes = ffmpeg(['-threads', '1', '-filter_threads', '1', '-f', 'f32le',
    '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0', '-map_metadata', '-1',
    '-c:a', 'libmp3lame', '-b:a', '128k', '-f', 'mp3', 'pipe:1'], {input: Buffer.concat(parts)});
  const index = {file: 'round-2.mp3', labels, master: .42, normalization: false,
    nativeMix: false, listeningAccepted: false};
  writeFileSync(join(out, index.file), bytes);
  writeFileSync(join(out, 'listening-index.json'), JSON.stringify(index, null, 2) + '\n');
  const rows = labels.map(row => `<tr><td>${row.cue}</td><td>${row.start.toFixed(2)} s</td><td>${row.duration.toFixed(2)} s</td></tr>`).join('');
  writeFileSync(join(out, 'round-2.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Deep audio - revised listening</title><body><h1>Deep audio - round two</h1><p>Isolated runtime cues at their actual gain and unchanged .42 master. Five approved assets, including the log, remain exact. This is an offline audition, not a native mix or listening acceptance.</p><audio controls src="round-2.mp3"></audio><table><tr><th>Cue</th><th>Start</th><th>Length</th></tr>${rows}</table></body></html>\n`);
  return index;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const listening = process.argv.indexOf('--listening');
  if (listening >= 0) console.log(JSON.stringify(buildDeepListening(resolve(process.argv[listening + 1])), null, 2));
  else {
    const index = process.argv.indexOf('--sources'), selected = process.argv.indexOf('--cues');
    const ids = selected < 0 ? null : process.argv[selected + 1]?.split(',');
    if (selected >= 0 && (!ids?.length || ids.some(id => !id))) throw Error('--cues requires existing IDs');
    const recipes = ids ? ids.map(id => DEEP_RECIPES.find(spec => spec.id === id)) : DEEP_RECIPES;
    console.log(JSON.stringify(buildDeepAudio({recipes,
      sourcesPath: index < 0 ? undefined : process.argv[index + 1]}), null, 2));
  }
}
