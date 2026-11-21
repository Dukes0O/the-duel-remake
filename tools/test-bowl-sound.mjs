// BOWL-SOUND (Claude, 21 November 2026): every Show Night cue plays a recording of its own. Each cue the Bowl can
// name (its sound table, the HUD's, the Scrapasaurus's, the walls', the tricks' and the trip outside) is in the bank
// behind titan-bowl, under its own name, with files its recipe builds and a CC0 catalog row with measured loudness.
// No cue points at another event's sound, and no two cues share a file.
// test-reads: public/assets/audio/bowl/ tools/audio/catalog.json tools/audio/build-bowl-sound.mjs tools/audio/build-bowl-crush.mjs src/sound-bank.js src/bowl/ src/app.js src/sim-contacts.js
import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {SOUND_BANK} from '../src/sound-bank.js';
import {BOWL_SOUND_CUES} from '../src/bowl/bowl-lines.js';
import {BOWL_HUD_SOUNDS} from '../src/bowl/bowl-hud.js';
import {REX_CUES} from '../src/bowl/bowl-rex.js';
import {BOWL_SOUND_FILES} from './audio/build-bowl-sound.mjs';
import {BOWL_CRUSH_FILES} from './audio/build-bowl-crush.mjs';

let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const catalog = JSON.parse(readFileSync(new URL('./audio/catalog.json', import.meta.url), 'utf8'));

// The cues each event names, found where the events are emitted, so a cue added there without a sound fails here.
const named = new Set([...Object.keys(BOWL_SOUND_CUES), ...Object.keys(BOWL_HUD_SOUNDS), ...Object.values(REX_CUES)]);
const sources = [...readdirSync(new URL('../src/bowl/', import.meta.url)).filter(file => file.endsWith('.js')).map(file => `../src/bowl/${file}`),
  '../src/app.js', '../src/sim-contacts.js'];
for (const file of sources)
  for (const [, id] of readFileSync(new URL(file, import.meta.url), 'utf8').matchAll(/'(bowl\.[a-z.]+[a-z])'/g)) named.add(id);
for (const kind of ['bounce', 'hard', 'big', 'scrape']) named.add(`bowl.wall.${kind}`);
for (const kind of ['wheelie', 'cyclone']) named.add(`bowl.trick.${kind}`);

const table = {...BOWL_SOUND_CUES, ...BOWL_HUD_SOUNDS};
const owners = new Map();
for (const id of named) {
  const cue = table[id];
  check(cue === id, `${id} plays a sound of its own (it plays ${cue})`);
  const def = SOUND_BANK[id];
  assert.deepEqual(def?.files, BOWL_SOUND_FILES[id] ?? BOWL_CRUSH_FILES[id], `${id} plays the files its own recipe builds`);
  check(def?.flag === 'titan-bowl' && Array.isArray(def.files) && def.files.length > 0, `${id} is a recorded cue behind titan-bowl`);
  for (const file of def.files) {
    check(!owners.has(file) || owners.get(file) === id, `${file} belongs to ${owners.get(file)} and ${id}`);
    owners.set(file, id);
    const path = new URL(`../public/assets/audio/${file}`, import.meta.url);
    check(existsSync(path) && statSync(path).size < 120000, `${file} is a small compressed take`);
  }
}
// Every recipe-built cue is in the bank with the files the recipe builds, and its rows are CC0 with loudness.
for (const [id, files] of Object.entries(BOWL_SOUND_FILES)) {
  assert.deepEqual(SOUND_BANK[id]?.files, files, `${id} plays the takes its recipe builds`);
  for (const file of files) {
    const row = catalog.sounds.find(item => item.cue === id && item.runtime?.some?.(take => take.file === `public/assets/audio/${file}`));
    const take = row?.runtime.find(item => item.file === `public/assets/audio/${file}`);
    check(row?.license === 'CC0 1.0' && Number.isFinite(take?.integratedLufs) && take.truePeakDbtp <= -1,
      `${file} has a CC0 recipe with its measured loudness and a true peak under -1 dBTP`);
  }
}
check(!catalog.sounds.some(row => row.cue === 'bowl.sound.candidate'), 'no candidate rows are left in the catalog');
console.log(`bowl sound: ${checks} checks passed`);
