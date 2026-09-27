// Sawtooth Sal's rising side-saw scream.
//
// The CC0 public Freesound preview is recorded in tools/audio/catalog.json
// and cached outside the repository. This
// recipe keeps a short start-up passage, removes low workshop rumble, applies
// a fast fade, conditions loudness and writes the one runtime Vorbis file.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ffmpeg } from './codec.mjs';
import { libraryRoot, loadCatalog, sha256 } from './sourcing.mjs';

export const SAL_SOURCE = '390712';
export const SAL_FILTER = [
  'atrim=0.15:1.35',
  'asetpts=PTS-STARTPTS',
  'highpass=f=150',
  'lowpass=f=10500',
  'afade=t=in:d=0.06',
  'afade=t=out:st=0.98:d=0.22',
  'loudnorm=I=-14:TP=-2:LRA=7',
  'alimiter=limit=0.72:level=false',
].join(',');

export function buildSal({ root = resolve('.'), library = libraryRoot() } = {}) {
  const entry = loadCatalog().sounds.find(sound => sound.key === SAL_SOURCE);
  if (!entry || entry.cue !== 'arena.sal-saw')
    throw Error(`Freesound ${SAL_SOURCE} is not catalogued for arena.sal-saw`);
  const input = join(library, entry.file);
  const bytes = readFileSync(input);
  if (sha256(bytes) !== entry.sha256) throw Error(`Freesound ${SAL_SOURCE} hash changed`);
  const output = join(root, 'public', 'assets', 'audio', 'sal-saw-scream.ogg');
  ffmpeg(['-y', '-i', input, '-ac', '1', '-af', SAL_FILTER, '-ar', '48000',
    '-c:a', 'libvorbis', '-q:a', '5', output]);
  return output;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log('wrote', buildSal());
