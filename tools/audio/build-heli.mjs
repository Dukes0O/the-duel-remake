// HELI-RADIO: the helicopter's library sounds and the instructor's voice files.
// Selected CC0 inputs stay in the external library cache (tools/audio/freesound.mjs).
//   node tools/audio/build-heli.mjs                  sounds and voices
//   node tools/audio/build-heli.mjs --cues ID,ID     chosen sounds only
//   node tools/audio/build-heli.mjs --voices         copy the kept voice takes only
import {readFileSync, writeFileSync, mkdirSync, copyFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {ffmpeg} from './codec.mjs';
import {measureLoudness, loopSeam} from './measurements.mjs';
import {loadCatalog, libraryRoot, sha256} from './sourcing.mjs';
import {HELI_RADIO_LINES} from '../../src/heli/heli-radio-lines.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RATE = 48000;
const recipe = (id, source, start, duration, options = {}) => Object.freeze({
  id, source: String(source), start, duration, rate: 1, loop: false, overlap: .18,
  highpass: 50, lowpass: 3000, loudness: -20, quality: 5, ...options,
});
// Rotor, wind, the engine, fire and water sounds come from real recordings.
// The chimes, horn, alert, tick, click and radio hiss are authored in heli-audio.js (tones and noise), so they have
// no file here.
export const HELI_RECIPES = Object.freeze([
  // A six-second recording of a rotor turning, sold as a loop; a short crossfade closes its seam.
  recipe('heli.rotor', 187681, 0, 6.3, {loop: true, overlap: .25, highpass: 40, lowpass: 1800, loudness: -20}),
  recipe('heli.engine.start', 540801, 0, 7.1, {highpass: 40, lowpass: 3200, loudness: -20}),
  // Steady idle slowed down on a falling curve, fading out: the turbine winding down.
  recipe('heli.engine.stop', 479514, 2, 4.6, {highpass: 40, lowpass: 2600, loudness: -22,
    sweep: {from: 1, to: .45, fadePower: 1.5}}),
  recipe('heli.wind', 454072, 30, 9, {loop: true, highpass: 120, lowpass: 2600, loudness: -24, quality: 3}),
  recipe('heli.cable.creak', 664929, 2.5, 1.7, {highpass: 180, lowpass: 5000, loudness: -26}),
  recipe('heli.hook.release', 457455, .35, .45, {highpass: 250, lowpass: 7000, loudness: -20}),
  recipe('heli.setdown.thud', 342535, .15, .8, {highpass: 35, lowpass: 650, loudness: -18}),
  // H2 Fire (docs/HELI_FIRE.md section 11). An outdoor fire, cut from its steady first part.
  recipe('heli.fire.crackle', 868895, 6, 6.5, {loop: true, overlap: .4, highpass: 80, lowpass: 6000, loudness: -26, quality: 3}),
  // A river loop for the water rushing into the bucket; a big waterfall for 600 litres letting go.
  recipe('heli.bucket.scoop', 523022, 1, 5, {loop: true, overlap: .3, highpass: 90, lowpass: 5000, loudness: -22, quality: 3}),
  recipe('heli.bucket.pour', 690224, 5, 4, {loop: true, overlap: .3, highpass: 70, lowpass: 5000, loudness: -20, quality: 3}),
  // The second, harder hit of a tube on a metal bucket, darkened to a dull clank.
  recipe('heli.bucket.dent', 513797, .82, .7, {highpass: 60, lowpass: 2400, loudness: -18}),
  // Steam hissing where water lands on fire; the game scales it by the litres.
  recipe('heli.fire.hiss', 479296, .3, 1.2, {highpass: 300, lowpass: 9000, loudness: -24}),
  // H4 Rescue (docs/HELI_RESCUE.md section 9): the hiker's flare lighting, a
  // shovel in snow while the rescuer digs, and a carabiner as someone clips on.
  recipe('heli.flare', 348767, .25, 2.5, {highpass: 120, lowpass: 8000, loudness: -24, quality: 3}),
  recipe('heli.snow.dig', 201888, 1.5, 4, {loop: true, overlap: .3, highpass: 100, lowpass: 7000, loudness: -24, quality: 3}),
  recipe('heli.rescue.clip', 457454, 0, .3, {highpass: 400, lowpass: 9000, loudness: -20}),
  // H3 Wildlife (docs/HELI_WILDLIFE.md section 9): a camera shutter as an
  // animal is counted, a pressure washer at the pad, the winch motor reeling
  // (medevac), and a call for each species heard near a herd. Every cut starts
  // at the call's loud part, read from its loudness outline.
  recipe('heli.survey.click', 579876, 0, .6, {highpass: 300, lowpass: 9000, loudness: -22}),
  recipe('heli.wash', 532823, 0, 3, {highpass: 120, lowpass: 8000, loudness: -24, quality: 3}),
  recipe('heli.winch', 683807, .5, 4, {loop: true, overlap: .3, highpass: 80, lowpass: 6000, loudness: -24, quality: 3}),
  recipe('heli.animal.moose', 486554, .6, 2, {highpass: 70, lowpass: 5000, loudness: -24, quality: 3}),
  recipe('heli.animal.wolf', 472402, 0, 3, {highpass: 150, lowpass: 7000, loudness: -24, quality: 3}),
  recipe('heli.animal.bear', 763026, 1.8, 2.8, {highpass: 60, lowpass: 4000, loudness: -24, quality: 3}),
  recipe('heli.animal.kookaburra', 826086, 0, 4.5, {highpass: 300, lowpass: 9000, loudness: -24, quality: 3}),
  recipe('heli.animal.cockatoo', 844340, .15, 1.1, {highpass: 400, lowpass: 9000, loudness: -24, quality: 3}),
  recipe('heli.animal.sheep', 803460, 0, 1, {highpass: 150, lowpass: 7000, loudness: -24, quality: 3}),
  // No CC0 marmot recording exists: a ground squirrel's alarm chirp (marmots are large ground squirrels).
  recipe('heli.animal.marmot', 640992, 0, 1.2, {highpass: 400, lowpass: 9000, loudness: -24, quality: 3}),
  recipe('heli.animal.raven', 716962, .2, 2.6, {highpass: 200, lowpass: 8000, loudness: -24, quality: 3}),
]);
export const heliRuntimeName = spec => `heli/${spec.id.slice(5).replaceAll('.', '-')}.ogg`;

// Crossfade the tail over the beginning, so wrapping reaches the next sample.
function prepareLoop(pcm, overlapSec) {
  if (!overlapSec) return pcm;
  const count = pcm.length / 4, overlap = Math.round(RATE * overlapSec);
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

// Read the cut at a falling speed (lower pitch, slower) while the level fades.
function prepareSweep(pcm, spec) {
  const count = pcm.length / 4, total = Math.round(RATE * spec.duration), out = Buffer.alloc(total * 4);
  let position = 0;
  for (let i = 0; i < total; i++) {
    const t = i / total, speed = spec.sweep.from + (spec.sweep.to - spec.sweep.from) * t;
    const index = Math.floor(position), share = position - index;
    if (index + 1 >= count) break;
    const value = pcm.readFloatLE(index * 4) * (1 - share) + pcm.readFloatLE((index + 1) * 4) * share;
    out.writeFloatLE(value * (1 - t) ** spec.sweep.fadePower, i * 4);
    position += speed;
  }
  return out;
}

export function buildHeliAudio({root = ROOT, library = libraryRoot(), recipes = HELI_RECIPES} = {}) {
  if (!recipes.length || !recipes.every(spec => HELI_RECIPES.includes(spec)))
    throw Error('Select existing helicopter recipes only');
  const catalog = loadCatalog(join(root, 'tools/audio/catalog.json')), results = [];
  for (const spec of recipes) {
    const source = catalog.sounds.find(row => row.source === 'freesound' && row.key === spec.source &&
      ['CC0 1.0', 'CC BY 4.0'].includes(row.license));
    if (!source) throw Error(`${spec.id}: missing verified source ${spec.source}`);
    const input = readFileSync(join(library, source.file));
    if (sha256(input) !== source.sha256) throw Error(`${spec.id}: source hash changed`);
    const cutSeconds = spec.sweep ? spec.duration * (spec.sweep.from + spec.sweep.to) / 2 * 1.08 : spec.duration * spec.rate;
    const cut = ffmpeg(['-threads', '1', '-filter_threads', '1', '-i', join(library, source.file),
      '-ac', '1', '-af', `aresample=${RATE},atrim=start=${spec.start}:duration=${cutSeconds},asetpts=PTS-STARTPTS,highpass=f=${spec.highpass},lowpass=f=${spec.lowpass},asetrate=${RATE * spec.rate},aresample=${RATE}`,
      '-ar', String(RATE), '-f', 'f32le', 'pipe:1']);
    if (cut.length / 4 < RATE * (cutSeconds - .05)) throw Error(`${spec.id}: incomplete source cut`);
    const pcm = spec.sweep ? prepareSweep(cut, spec) : cut;
    const duration = pcm.length / 4 / RATE;
    const fades = spec.loop ? '' : `afade=t=in:d=0.012,afade=t=out:st=${Math.max(0, duration - .16)}:d=0.16,`;
    const args = ['-threads', '1', '-filter_threads', '1', '-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0',
      '-af', `${fades}loudnorm=I=${spec.loudness}:TP=-3:LRA=11,aresample=${RATE},alimiter=limit=0.70:level=false`,
      '-ar', String(RATE), '-fflags', '+bitexact', '-flags:a', '+bitexact', '-map_metadata', '-1'];
    // Apply loop overlap after all level filters and their lookahead delays.
    const normalized = ffmpeg([...args, '-f', 'f32le', 'pipe:1'], {input: pcm});
    const ready = spec.loop ? prepareLoop(normalized, spec.overlap) : normalized;
    const bytes = ffmpeg(['-threads', '1', '-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0',
      '-fflags', '+bitexact', '-flags:a', '+bitexact', '-map_metadata', '-1',
      '-c:a', 'libvorbis', '-q:a', String(spec.quality), '-f', 'ogg', 'pipe:1'], {input: ready});
    const measured = measureLoudness(bytes);
    // Very short sounds give the meter too little to average; their peak still counts.
    if (measured.available && (measured.truePeakDbtp > -1 ||
      (duration > 1 && Math.abs(measured.integratedLufs - spec.loudness) > 2.5)))
      throw Error(`${spec.id}: encoded loudness/peak failed ${JSON.stringify(measured)}`);
    const decoded = ffmpeg(['-threads', '1', '-i', 'pipe:0', '-ac', '1', '-ar', String(RATE), '-f', 'f32le', 'pipe:1'], {input: bytes});
    const samples = Float32Array.from({length: decoded.length / 4}, (_, i) => decoded.readFloatLE(i * 4));
    const seam = spec.loop ? loopSeam([samples], RATE) : null;
    if (seam && !seam.pass) throw Error(`${spec.id}: encoded loop seam failed ${JSON.stringify(seam)}`);
    const file = `public/assets/audio/${heliRuntimeName(spec)}`;
    mkdirSync(dirname(join(root, file)), {recursive: true});
    writeFileSync(join(root, file), bytes);
    const {cue, processing, runtime, ...credit} = source;
    results.push({...credit, cue: spec.id, processing: {script: 'tools/audio/build-heli.mjs', ...spec,
      loopOverlapSec: spec.loop ? spec.overlap : 0, fadeInSec: spec.loop ? 0 : .012, fadeOutSec: spec.loop ? 0 : .16,
      normalization: 'FFmpeg loudnorm, TP -3, LRA 11; limiter .70 without auto-level', codec: `Vorbis q${spec.quality}`},
      runtime: {file, sha256: sha256(bytes), bytes: bytes.length, sampleRate: RATE, channels: 1,
        duration: samples.length / RATE, integratedLufs: measured.integratedLufs ?? null,
        truePeakDbtp: measured.truePeakDbtp ?? null, loopSeam: seam}});
  }
  const updates = new Map(results.map(row => [row.key, row]));
  catalog.sounds = catalog.sounds.map(row => row.source === 'freesound' && updates.has(row.key) ? updates.get(row.key) : row);
  writeFileSync(join(root, 'tools/audio/catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  return results.map(row => ({cue: row.cue, ...row.runtime}));
}

// The kept takes are the runtime files: copied unchanged, like the fight voices.
export function copyHeliVoices({root = ROOT} = {}) {
  const catalog = loadCatalog(join(root, 'tools/audio/catalog.json'));
  const folder = join(root, 'public/assets/audio/voices');
  mkdirSync(folder, {recursive: true});
  let bytes = 0;
  for (const [id, line] of Object.entries(HELI_RADIO_LINES)) {
    const record = catalog.sounds.find(row => row.cue === id);
    if (!record || record.text !== line.text || record.file !== `audio-src/voices/${line.file}`)
      throw Error(`Kept voice catalog mismatch: ${id}`);
    const take = readFileSync(join(root, record.file));
    if (sha256(take) !== record.sha256) throw Error(`Kept voice hash mismatch: ${id}`);
    copyFileSync(join(root, record.file), join(folder, line.file));
    bytes += take.length;
  }
  return {lines: Object.keys(HELI_RADIO_LINES).length, bytes};
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const selected = process.argv.indexOf('--cues'), voicesOnly = process.argv.includes('--voices');
  const ids = selected < 0 ? null : process.argv[selected + 1]?.split(',');
  if (selected >= 0 && (!ids?.length || ids.some(id => !HELI_RECIPES.some(spec => spec.id === id))))
    throw Error('--cues requires existing helicopter sound ids');
  const out = {};
  if (!voicesOnly)
    out.sounds = buildHeliAudio({recipes: ids ? ids.map(id => HELI_RECIPES.find(spec => spec.id === id)) : HELI_RECIPES});
  if (!ids) out.voices = copyHeliVoices();
  console.log(JSON.stringify(out, null, 2));
}
