// LAB-RADIO: Brian's Lab lines (docs/LAB.md section 8.1). The kept takes are the runtime files:
// copied unchanged into public/assets/audio/voices/, like the helicopter's, the instructor's and Ana's.
// The takes themselves come from
//   node tools/audio/elevenlabs.mjs say --voice <id> --line <id> --text "..." --keep
//   node tools/audio/build-lab-voice.mjs     copy the kept voice takes
import {readFileSync, mkdirSync, copyFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {loadCatalog, sha256} from './sourcing.mjs';
import {LAB_LINES} from '../../src/lab/lab-lines.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function copyLabVoices({root = ROOT} = {}) {
  const catalog = loadCatalog(join(root, 'tools/audio/catalog.json'));
  const folder = join(root, 'public/assets/audio/voices');
  mkdirSync(folder, {recursive: true});
  let bytes = 0;
  for (const [id, line] of Object.entries(LAB_LINES)) {
    const record = catalog.sounds.find(row => row.cue === id);
    if (!record || record.text !== (line.spokenText ?? line.text) || record.file !== `audio-src/voices/${line.file}`)
      throw Error(`Kept voice catalog mismatch: ${id}`);
    const take = readFileSync(join(root, record.file));
    if (sha256(take) !== record.sha256) throw Error(`Kept voice hash mismatch: ${id}`);
    copyFileSync(join(root, record.file), join(folder, line.file));
    bytes += take.length;
  }
  return {lines: Object.keys(LAB_LINES).length, bytes};
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  console.log(JSON.stringify(copyLabVoices(), null, 2));
