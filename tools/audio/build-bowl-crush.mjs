// BOWL-SOUND-CRUSH: the Bowl's crush set (docs/board/cards/BOWL-SHOW-2.md section 4), cut and layered from
// CC0 Freesound recordings kept in the library outside the repository.
//   node tools/audio/build-bowl-crush.mjs            rebuild every take and its catalog rows
//   node tools/audio/build-bowl-crush.mjs --sheet DIR  render a listening sheet beside the car-to-car crash
// Each take is one or more layers (a cut of one recording, its own pitch, filters, gain and start time),
// mixed, faded and levelled to the take's loudness, then written as Vorbis to public/assets/audio/bowl/.
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {ffmpeg} from './codec.mjs';
import {measureLoudness} from './measurements.mjs';
import {CATALOG_PATH, libraryRoot, loadCatalog, sha256} from './sourcing.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RATE = 48000;
const SCRIPT = 'tools/audio/build-bowl-crush.mjs';
// One cut of one recording: start and duration in the recording's own seconds, played at rate (below 1 is
// lower and longer), placed at `at` seconds into the take.
const cut = (source, start, duration, options = {}) => Object.freeze({source: String(source), start, duration,
  rate: 1, gain: 1, at: 0, highpass: 40, lowpass: 12000, ...options});
const take = (file, loudness, layers) => Object.freeze({file: `bowl/${file}.ogg`, loudness, layers: Object.freeze(layers)});

// The car-to-car crash files measure about -17.5 LUFS. A crush bite is a little louder than that, a bus and a
// stack louder again, and the pieces around the bite (glass, groan, clank, flat, crowd) sit under it.
export const BOWL_CRUSH_RECIPES = Object.freeze({
  'bowl.crush.car': [
    take('crush-car-a', -16, [cut(675902, .17, 1.5, {rate: .9}), cut(703248, 0, 1.2, {lowpass: 300, gain: .5})]),
    take('crush-car-b', -16, [cut(675910, .38, 1.6, {rate: .88, lowpass: 6000})]),
    take('crush-car-c', -16, [cut(675466, .05, 1.3, {rate: .85}), cut(859154, 0, 1, {lowpass: 400, gain: .4})]),
    take('crush-car-d', -16, [cut(237375, .3, 1.6, {rate: .9})]),
  ],
  'bowl.crush.bus': [
    take('crush-bus-a', -15, [cut(675901, 0, 2.6, {rate: .8}), cut(859154, 0, 2.2, {rate: .75, lowpass: 900, gain: .8})]),
    take('crush-bus-b', -15, [cut(703247, 0, 2.6, {rate: .85}), cut(859154, 0, 2.2, {rate: .7, lowpass: 900, gain: .8}),
      cut(675902, 1, 1.2, {rate: .8, gain: .5, at: .15})]),
  ],
  'bowl.crush.stack': [
    take('crush-stack', -14, [cut(703247, 0, 2.8, {rate: .7, lowpass: 2500}), cut(397691, 0, 2.6, {rate: .8, lowpass: 220, gain: .6}),
      cut(348767, .3, 2, {highpass: 2500, gain: .45, at: .1})]),
  ],
  'bowl.crush.glass': [
    take('crush-glass-a', -21, [cut(587928, 0, 1.2, {highpass: 900})]),
    take('crush-glass-b', -21, [cut(848289, 0, .75, {highpass: 900, rate: .95})]),
  ],
  'bowl.crush.groan': [
    take('crush-groan', -22, [cut(556714, .35, 2.8, {rate: .75, lowpass: 3000})]),
  ],
  'bowl.crush.off': [
    take('crush-off-a', -21, [cut(741351, .17, 1.1, {rate: .8})]),
    take('crush-off-b', -21, [cut(151624, 0, .54, {rate: .8, lowpass: 4000})]),
  ],
  'bowl.crush.flat': [
    take('crush-flat-a', -22, [cut(675910, 5.4, 1, {rate: .85, lowpass: 1100})]),
    take('crush-flat-b', -22, [cut(703248, .05, 1, {rate: .9, lowpass: 1100})]),
  ],
  'bowl.crush.pancake': [
    take('crush-pancake-a', -14, [cut(807437, 0, .96, {rate: .85}), cut(342535, .15, .7, {rate: .55, lowpass: 250, gain: 2}),
      cut(397691, 0, 1, {lowpass: 120, gain: .5})]),
    take('crush-pancake-b', -14, [cut(675902, .17, 1.4, {rate: .85}), cut(342535, .15, .7, {rate: .55, lowpass: 250, gain: 2})]),
  ],
  'bowl.crush.ooh': [
    take('crush-ooh-a', -21, [cut(324895, .75, 1.6), cut(870652, .15, 2, {gain: .6, at: .05})]),
    take('crush-ooh-b', -21, [cut(324895, 3.3, 1.5), cut(870652, 3.8, 1.8, {gain: .6, at: .05})]),
  ],
});
export const BOWL_CRUSH_FILES = Object.freeze(Object.fromEntries(Object.entries(BOWL_CRUSH_RECIPES)
  .map(([cue, takes]) => [cue, takes.map(spec => spec.file)])));

const pcmFloats = buffer => Float32Array.from({length: buffer.length / 4}, (_, i) => buffer.readFloatLE(i * 4));
const floatsPcm = floats => { const out = Buffer.alloc(floats.length * 4); floats.forEach((v, i) => out.writeFloatLE(v, i * 4)); return out; };

function renderLayer(layer, row, library) {
  const path = join(library, row.file);
  if (sha256(readFileSync(path)) !== row.sha256) throw Error(`${layer.source}: source hash changed`);
  const pcm = ffmpeg(['-threads', '1', '-filter_threads', '1', '-i', path, '-ac', '1', '-af',
    `aresample=${RATE},atrim=start=${layer.start}:duration=${layer.duration},asetpts=PTS-STARTPTS,` +
    `highpass=f=${layer.highpass},lowpass=f=${layer.lowpass},asetrate=${RATE * layer.rate},aresample=${RATE},` +
    `afade=t=in:d=0.004,afade=t=out:st=${Math.max(0, layer.duration / layer.rate - .12)}:d=0.12`,
    '-ar', String(RATE), '-f', 'f32le', 'pipe:1']);
  if (pcm.length / 4 < RATE * (layer.duration / layer.rate - .06)) throw Error(`${layer.source}: incomplete source cut`);
  return pcmFloats(pcm);
}

function renderTake(spec, sources, library) {
  const parts = spec.layers.map(layer => ({layer, floats: renderLayer(layer, sources.get(layer.source), library)}));
  const length = Math.max(...parts.map(({layer, floats}) => Math.round(layer.at * RATE) + floats.length));
  const mix = new Float32Array(length);
  for (const {layer, floats} of parts) {
    const offset = Math.round(layer.at * RATE);
    for (let i = 0; i < floats.length; i++) mix[offset + i] += floats[i] * layer.gain;
  }
  const duration = length / RATE;
  // Two passes: measure, set the gain that reaches the loudness, hold peaks under -2 dBFS with a fast limiter,
  // then correct once for what the limiter took off.
  const encode = gainDb => ffmpeg(['-threads', '1', '-filter_threads', '1', '-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0',
    '-af', `afade=t=out:st=${Math.max(0, duration - .15)}:d=0.15,volume=${gainDb.toFixed(2)}dB,` +
    'alimiter=limit=0.79:attack=1:release=60:level=false', '-ar', String(RATE), '-fflags', '+bitexact', '-flags:a', '+bitexact',
    '-map_metadata', '-1', '-c:a', 'libvorbis', '-q:a', '5', '-f', 'ogg', 'pipe:1'], {input: floatsPcm(mix)});
  let gainDb = spec.loudness - measureLoudness(encode(0)).integratedLufs;
  let levelled = encode(gainDb);
  for (let pass = 0; pass < 3; pass++) {
    const short = spec.loudness - measureLoudness(levelled).integratedLufs;
    if (Math.abs(short) < .3) break;
    gainDb += short; levelled = encode(gainDb);
  }
  const measured = measureLoudness(levelled);
  if (!measured.available || measured.truePeakDbtp > -1 || Math.abs(measured.integratedLufs - spec.loudness) > 1)
    throw Error(`${spec.file}: encoded loudness or peak failed ${JSON.stringify(measured)}`);
  return {bytes: levelled, measured, duration};
}

// Rows: one per recording and cue, as tools/audio/sourcing.mjs keeps them. The row of each take's first
// layer carries that take's runtime file and its measured loudness.
export function buildBowlCrush({root = ROOT, library = libraryRoot()} = {}) {
  const catalogPath = join(root, 'tools/audio/catalog.json');
  const catalog = loadCatalog(catalogPath);
  const sources = new Map();
  for (const row of catalog.sounds) if (row.source === 'freesound' && row.license === 'CC0 1.0' && !sources.has(row.key)) sources.set(row.key, row);
  const rows = new Map(), results = [];
  for (const [cue, takes] of Object.entries(BOWL_CRUSH_RECIPES)) for (const spec of takes) {
    for (const layer of spec.layers) if (!sources.has(layer.source)) throw Error(`${cue}: missing CC0 source ${layer.source}`);
    const {bytes, measured, duration} = renderTake(spec, sources, library);
    const file = `public/assets/audio/${spec.file}`;
    mkdirSync(dirname(join(root, file)), {recursive: true});
    writeFileSync(join(root, file), bytes);
    const runtime = {file, sha256: sha256(bytes), bytes: bytes.length, sampleRate: RATE, channels: 1, duration: Number(duration.toFixed(3)),
      integratedLufs: measured.integratedLufs, truePeakDbtp: measured.truePeakDbtp};
    results.push({cue, ...runtime});
    spec.layers.forEach((layer, index) => {
      const key = `${cue}|${layer.source}`;
      if (!rows.has(key)) {
        const {cue: _cue, processing: _processing, runtime: _runtime, ...credit} = sources.get(layer.source);
        rows.set(key, {...credit, cue, processing: {script: SCRIPT, normalization: 'mix, 150 ms fade out, gain to the loudness in two passes, limiter .79 (1 ms attack, 60 ms release)',
          codec: 'Vorbis q5', uses: []}, runtime: []});
      }
      const row = rows.get(key);
      row.processing.uses.push({take: spec.file, ...layer, loudness: spec.loudness});
      if (index === 0) row.runtime.push(runtime);
    });
  }
  // Replace this card's rows and the fetch-time candidate rows; every other row keeps its place.
  const ours = row => row.cue === 'bowl.crush.candidate' || String(row.cue || '').startsWith('bowl.crush.');
  catalog.sounds = [...catalog.sounds.filter(row => !ours(row)), ...rows.values()];
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
  return results;
}

// The listening sheet: the car-to-car crash first, then each new take, at the gain the bank plays it, through
// the game's .42 master. A comparison of levels, not a mix with the engine and crowd.
export async function buildBowlCrushSheet(out, root = ROOT) {
  const {SOUND_BANK} = await import(pathToFileURL(join(root, 'src/sound-bank.js')).href);
  const items = [...SOUND_BANK['vehicle.crash.recorded'].files.map(file => ({cue: 'vehicle.crash.recorded', file, volume: SOUND_BANK['vehicle.crash.recorded'].volume})),
    ...Object.entries(BOWL_CRUSH_FILES).flatMap(([cue, files]) => files.map(file => ({cue, file, volume: SOUND_BANK[cue].volume})))];
  const parts = [], labels = [];
  let time = 0;
  mkdirSync(out, {recursive: true});
  for (const item of items) {
    const bytes = readFileSync(join(root, 'public/assets/audio', item.file));
    const gain = item.volume * .42;
    const played = ffmpeg(['-threads', '1', '-i', 'pipe:0', '-af', `volume=${gain}`, '-ac', '1', '-ar', String(RATE), '-f', 'f32le', 'pipe:1'], {input: bytes});
    const asPlayed = measureLoudness(ffmpeg(['-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0', '-f', 'wav', 'pipe:1'], {input: played}));
    const duration = played.length / 4 / RATE;
    labels.push({...item, start: Number(time.toFixed(2)), duration: Number(duration.toFixed(2)), gain: Number(gain.toFixed(3)),
      fileLufs: measureLoudness(bytes).integratedLufs, playedLufs: asPlayed.integratedLufs, playedPeakDbtp: asPlayed.truePeakDbtp});
    parts.push(played, Buffer.alloc(RATE * 4 * .8));
    time += duration + .8;
  }
  const sheet = ffmpeg(['-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0', '-map_metadata', '-1',
    '-c:a', 'libmp3lame', '-b:a', '128k', '-f', 'mp3', 'pipe:1'], {input: Buffer.concat(parts)});
  writeFileSync(join(out, 'bowl-crush-sheet.mp3'), sheet);
  writeFileSync(join(out, 'bowl-crush-sheet.json'), JSON.stringify(labels, null, 2) + '\n');
  return labels;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const at = process.argv.indexOf('--sheet');
  if (at > 0) console.table(await buildBowlCrushSheet(resolve(process.argv[at + 1])));
  else console.table(buildBowlCrush());
}
