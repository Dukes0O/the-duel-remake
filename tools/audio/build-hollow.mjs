// Muddy Hollow sounds (EGG-03 audio): pond splashes and mud squelches.
//
//   node tools/audio/build-hollow.mjs
//
// Sources are CC0 Freesound previews recorded in tools/audio/catalog.json and
// cached in the audio library outside the repository. Each recipe cuts, fades,
// optionally repitches, loudness-normalises (EBU R128) and encodes mono
// Vorbis q5 into public/assets/audio/.
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ffmpeg } from './codec.mjs';
import { libraryRoot, loadCatalog } from './sourcing.mjs';

export const HOLLOW_RECIPES = Object.freeze([
  // Big Water Splash (qubodup): the whole hit.
  { cue: 'world.muddy-hollow-splash', file: 'hollow-splash-a.ogg', source: '442773',
    start: 0, end: 2.1, fadeIn: 0, fadeOut: .35, rate: 1, loudness: -15 },
  // A car ploughing through water (barion): its loudest two seconds.
  { cue: 'world.muddy-hollow-splash', file: 'hollow-splash-b.ogg', source: '462117',
    start: 1.7, end: 3.9, fadeIn: .06, fadeOut: .45, rate: 1, loudness: -15 },
  // The big splash a little deeper, for variety.
  { cue: 'world.muddy-hollow-splash', file: 'hollow-splash-c.ogg', source: '442773',
    start: 0, end: 2.1, fadeIn: 0, fadeOut: .35, rate: .86, loudness: -15 },
  // Mud_1 (lzmraul): the squelch, and a slightly higher splat.
  { cue: 'world.muddy-hollow-mud', file: 'hollow-mud-a.ogg', source: '389460',
    start: .15, end: 1.25, fadeIn: .01, fadeOut: .2, rate: 1, loudness: -17 },
  { cue: 'world.muddy-hollow-mud', file: 'hollow-mud-b.ogg', source: '389460',
    start: .15, end: 1.25, fadeIn: .01, fadeOut: .2, rate: 1.16, loudness: -17 },
]);

export function filterChain(recipe) {
  const length = recipe.end - recipe.start;
  const filters = [`atrim=${recipe.start}:${recipe.end}`, 'asetpts=PTS-STARTPTS'];
  if (recipe.rate !== 1) filters.push(`asetrate=48000*${recipe.rate}`, 'aresample=48000');
  const played = length / recipe.rate;
  if (recipe.fadeIn) filters.push(`afade=t=in:d=${recipe.fadeIn}`);
  filters.push(`afade=t=out:st=${Math.max(0, played - recipe.fadeOut).toFixed(3)}:d=${recipe.fadeOut}`);
  // A limiter after levelling keeps the encoded true peak under -1 dBTP.
  filters.push(`loudnorm=I=${recipe.loudness}:TP=-3:LRA=11`, 'aresample=48000',
    'alimiter=limit=0.6:level=false');
  return filters.join(',');
}

export function buildHollow({ root = resolve('.'), library = libraryRoot() } = {}) {
  const catalog = loadCatalog();
  const built = [];
  for (const recipe of HOLLOW_RECIPES) {
    const entry = catalog.sounds.find(sound => sound.key === recipe.source);
    if (!entry) throw new Error(`Freesound ${recipe.source} is not catalogued`);
    const input = join(library, entry.file);
    const output = join(root, 'public', 'assets', 'audio', recipe.file);
    ffmpeg(['-y', '-i', input, '-ac', '1', '-af', filterChain(recipe), '-ar', '48000',
      '-c:a', 'libvorbis', '-q:a', '5', output]);
    built.push(output);
  }
  return built;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const file of buildHollow()) console.log('wrote', file);
}
