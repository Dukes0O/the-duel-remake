import {readFile, mkdir, copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {FIGHT_VOICE_LINES} from '../src/fight-voices.js';

const root = new URL('../', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('tools/audio/catalog.json', root), 'utf8'));
const destination = new URL('public/assets/audio/voices/', root);
await mkdir(destination, {recursive: true});
let bytes = 0;
for (const [id, line] of Object.entries(FIGHT_VOICE_LINES)) {
  const record = catalog.sounds.find(row => row.cue === id);
  if (!record || record.text !== line.text || record.file !== `audio-src/voices/${line.file}`)
    throw new Error(`Kept voice catalog mismatch: ${id}`);
  const source = new URL(record.file, root), take = await readFile(source);
  if (createHash('sha256').update(take).digest('hex') !== record.sha256)
    throw new Error(`Kept voice hash mismatch: ${id}`);
  await copyFile(source, new URL(line.file, destination));
  bytes += take.length;
}
console.log(`Copied ${Object.keys(FIGHT_VOICE_LINES).length} kept voices unchanged (${bytes} bytes).`);
