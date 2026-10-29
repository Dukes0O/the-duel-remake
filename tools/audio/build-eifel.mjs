// EIFEL-CROWN-C5: the damp forest and birds bed, and the distant village church bell.
// Verified CC0 field recordings, circular crossfade, and static loudness match to the forest bed.
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {ffmpeg} from './codec.mjs';
import {loadCatalog, libraryRoot, sha256, addCatalogEntry} from './sourcing.mjs';
import {measureLoudness} from './measurements.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const RATE = 48000, SECONDS = 25, SEAM = RATE;
export const EIFEL_AUDIO = Object.freeze({
  bed: {cue: 'ambience.eifel', file: 'ambience-eifel.flac', source: '609952'},
  bell: {cue: 'landmark.village-bell', file: 'landmark-village-bell.flac', source: '846302'},
});
const BIRDS = '853112';

function source(id, sourceRoot) {
  const row = loadCatalog().sounds.find(row => row.source === 'freesound' && row.key === id);
  if (!row || !/CC0/.test(row.license)) throw Error('Missing CC0 source ' + id);
  const candidates = [join(sourceRoot, row.file), join(libraryRoot(), row.file)];
  const path = candidates.find(existsSync);
  if (!path || sha256(readFileSync(path)) !== row.sha256) throw Error('Missing or changed source ' + id);
  return {row, path};
}

function pcmFlac(samples) {
  const pcm = Buffer.alloc(samples.length * 4);
  samples.forEach((v, i) => pcm.writeFloatLE(v, i * 4));
  return ffmpeg(['-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0',
    '-c:a', 'flac', '-sample_fmt', 's16', '-f', 'flac', 'pipe:1'], {input: pcm});
}

export function buildEifel(sourceRoot = resolve(ROOT, '.qa-dist/eifel-c5-sources')) {
  // The bed plays at the forest bed's own gain (.15), so the same static loudness matches it.
  const target = measureLoudness(readFileSync(join(ROOT, 'public/assets/audio/ambience-forest.flac'))).integratedLufs;
  const birds = source(BIRDS, sourceRoot);
  const results = [];
  for (const [name, recipe] of Object.entries(EIFEL_AUDIO)) {
    const main = source(recipe.source, sourceRoot);
    let samples;
    if (name === 'bell') {
      // The church is 300 m off: keep the first strokes and the rain-wet air round them, soften the top,
      // fade in and out, and bring the peak to .7 so the cue volume sets how soft it plays.
      const raw = ffmpeg(['-ss', '1.6', '-t', '12', '-i', main.path, '-af',
        'highpass=f=110,lowpass=f=3600,afade=t=in:d=0.5,afade=t=out:st=9:d=3,volume=1',
        '-ac', '1', '-ar', String(RATE), '-f', 'f32le', 'pipe:1']);
      samples = Array.from({length: raw.length / 4}, (_, i) => raw.readFloatLE(i * 4));
      const top = samples.reduce((p, v) => Math.max(p, Math.abs(v)), 0);
      samples = samples.map(v => v * .7 / top);
    } else {
      const args = [main.path, birds.path].flatMap(path => ['-stream_loop', '-1', '-i', path]);
      const raw = ffmpeg([...args, '-filter_complex',
        '[0:a]atrim=start=10,asetpts=PTS-STARTPTS[a];[1:a]atrim=start=6,asetpts=PTS-STARTPTS[b];' +
        '[a][b]amix=inputs=2:weights=0.55 0.45:normalize=0,highpass=f=140,lowpass=f=7000',
        '-t', String(SECONDS), '-ac', '1', '-ar', String(RATE), '-f', 'f32le', 'pipe:1']);
      const count = raw.length / 4;
      samples = Array.from({length: count - SEAM}, (_, i) => raw.readFloatLE(i * 4));
      for (let i = 0; i < SEAM; i++) {
        const t = i / SEAM;
        samples[i] = raw.readFloatLE((count - SEAM + i) * 4) * (1 - t) + samples[i] * t;
      }
      const level = measureLoudness(pcmFlac(samples)).integratedLufs;
      const gain = 10 ** ((target - level) / 20);
      samples = samples.map(v => v * gain);
      const peak = samples.reduce((p, v) => Math.max(p, Math.abs(v)), 0);
      if (peak > .95) throw Error('Eifel ambience needs a reviewed crest adjustment');
    }
    const bytes = pcmFlac(samples), path = join(ROOT, 'public/assets/audio', recipe.file);
    mkdirSync(join(ROOT, 'public/assets/audio'), {recursive: true});
    writeFileSync(path, bytes);
    const loudness = measureLoudness(bytes);
    const record = {source: 'mix', key: recipe.cue, cue: recipe.cue, license: 'CC0 1.0', author: 'The Duel',
      file: 'public/assets/audio/' + recipe.file, sha256: sha256(bytes), bytes: bytes.length,
      processing: {script: 'tools/audio/build-eifel.mjs', recipe: {
        sources: name === 'bell' ? [main.row.key] : [main.row.key, birds.row.key],
        rate: RATE, channels: 1, duration: samples.length / RATE, circularCrossfadeSeconds: name === 'bell' ? 0 : 1,
        gain: name === 'bell' ? null : .15, targetLufs: name === 'bell' ? null : target,
        bell: 'one church bell per race, heard within 150 m of the village'}, loudness}};
    addCatalogEntry(record);
    results.push({cue: recipe.cue, bytes: bytes.length, loudness});
  }
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  console.log(JSON.stringify(buildEifel(process.argv[2] ? resolve(process.argv[2]) : undefined), null, 2));
