import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {ffmpeg} from './codec.mjs';
import {loadCatalog, libraryRoot, sha256, CATALOG_PATH} from './sourcing.mjs';
import {measureLoudness} from './measurements.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RATE = 48000;
export const BLACKIRON_AUDIO_RECIPE = Object.freeze({cue: 'warlord.nitroSpent',
  source: '651534', start: 2.7, length: .85, rate: .7,
  filters: 'highpass=f=90,lowpass=f=2200',
  catches: Object.freeze([[0, .15, 1], [.21, .42, .82], [.51, .8, .55]].map(Object.freeze))});

export function buildBlackironAudio() {
  const recipe = BLACKIRON_AUDIO_RECIPE;
  const source = loadCatalog().sounds.find(row => row.source === 'freesound' && row.key === recipe.source);
  if (!source || !/CC0/.test(source.license)) throw Error('Missing verified CC0 engine source');
  const input = readFileSync(join(libraryRoot(), source.file));
  if (sha256(input) !== source.sha256) throw Error('Engine source hash mismatch');
  const pcm = ffmpeg(['-i', 'pipe:0', '-ac', '1', '-ar', String(RATE),
    '-af', recipe.filters, '-f', 'f32le', 'pipe:1'], {input});
  const samples = Math.round(recipe.length * RATE), cut = Buffer.alloc(samples * 4);
  if ((recipe.start * RATE + samples * recipe.rate + 1) * 4 > pcm.length)
    throw Error('Engine cut exceeds source');
  for (let n = 0; n < samples; n++) {
    const at = recipe.start * RATE + n * recipe.rate, i = Math.floor(at), blend = at - i;
    const fade = Math.min(1, n / (RATE * .006), (samples - n - 1) / (RATE * .09));
    // Uneven softly faded catches replace the rejected regular digital chopping.
    const time = n / RATE;
    let catchGain = .24;
    for (const [start, end, strength] of recipe.catches) {
      if (time < start || time > end) continue;
      catchGain += strength * Math.sin(Math.PI * (time - start) / (end - start)) ** 2;
    }
    cut.writeFloatLE((pcm.readFloatLE(i * 4) * (1 - blend) + pcm.readFloatLE((i + 1) * 4) * blend) * fade * catchGain, n * 4);
  }
  const bytes = ffmpeg(['-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0',
    '-af', 'loudnorm=I=-18:TP=-3:LRA=7', '-ar', String(RATE),
    '-fflags', '+bitexact', '-flags:a', '+bitexact', '-map_metadata', '-1',
    '-c:a', 'libvorbis', '-q:a', '5', '-f', 'ogg', 'pipe:1'], {input: cut});
  const measured = measureLoudness(bytes);
  if (!measured.available || measured.truePeakDbtp > -1.5) throw Error('Sputter codec headroom failed');
  const file = 'public/assets/audio/blackiron/nitro-spent.ogg';
  const result = {cue: recipe.cue, file, sha256: sha256(bytes), bytes: bytes.length,
    sampleRate: RATE, channels: 1, sourceFile: source.file, sourceSha256: source.sha256, ...measured};
  mkdirSync(dirname(join(ROOT, file)), {recursive: true});
  writeFileSync(join(ROOT, file), bytes);
  const catalog = loadCatalog();
  catalog.sounds = catalog.sounds.filter(row => row.cue !== recipe.cue);
  catalog.sounds.push({...source, source: 'freesound-prepared', key: 'blackiron-nitro-spent',
    cue: recipe.cue, runtime: result,
    processing: {recipe: 'tools/audio/build-blackiron.mjs', ...recipe,
      approval: 'Kyle feedback and Director, 9 October 2026: remove regular artificial chopping; keep uneven Nitro recovery sputter from the same cached CC0 engine.'}});
  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n');
  return result;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  console.log(JSON.stringify(buildBlackironAudio()));
