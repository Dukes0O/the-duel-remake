// LAB-RADIO: Brian's 54 Lab lines (clean, no radio filter) and the Lab's sounds
// (docs/LAB.md sections 4, 6, 7 and 8), plus the retardant pour sound.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, existsSync, readdirSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {LAB_LINES, LAB_CUES, LAB_VOICE_CUES, LAB_VOICE, LAB_VOICE_TARGET_LUFS} from '../src/lab/lab-lines.js';
import {LAB_SOUND_CUES} from '../src/lab/lab-cues.js';
import {LAB_LESSONS} from '../src/lab/lab-lessons.js';
import {HELI_RADIO_VOICE} from '../src/lessons/radio-voice.js';
import {HELI_CUES, HELI_EVENT_CUES} from '../src/heli/heli-audio.js';
import {SOUND_BANK, BUS_NAMES} from '../src/sound-bank.js';
import {EngineAudio} from '../src/audio.js';
import {copyLabVoices} from './audio/build-lab-voice.mjs';
import {LAB_SOUND_RECIPES, buildSound} from './audio/build-lab-sounds.mjs';
import {measureLoudness} from './audio/measurements.mjs';
import {measureCue} from './audio/render-lab-cues.mjs';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const near = (actual, expected, tolerance, label) => { assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} vs ${expected}`); checks++; };
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const catalog = JSON.parse(read('tools/audio/catalog.json'));

// Every line in the design has a take, with the design's exact words.
const design = String(read('docs/LAB.md'));
const section = design.slice(design.indexOf("### 8.1 Brian's Lab lines"), design.indexOf('## 9. The save'));
const table = Object.fromEntries([...section.matchAll(/^\| `(lab\.brian\.[a-z0-9.]+)` \| (.+?) \|$/gm)].map(m => [m[1], m[2]]));
same(Object.keys(table).length, 54, 'the design lists fifty-four lines');
same(Object.fromEntries(Object.entries(LAB_LINES).map(([id, line]) => [id, line.text])), table, 'the lines match the design word for word');
ok(Object.values(LAB_LINES).every(line => !/credit|price|dollar|\$|\u2014/i.test(line.text)), 'no line names a price or uses an em dash');

// Three lines for each of the sixteen lessons, four for the secret, two for the restore.
same(LAB_LESSONS.length, 16, 'sixteen lessons');
for (const lesson of LAB_LESSONS)
  for (const step of ['intro', 'explain', 'pass']) ok(LAB_LINES[`lab.brian.${lesson.id}.${step}`], `${lesson.id}: ${step}`);
same(Object.keys(LAB_LINES).filter(id => id.startsWith('lab.brian.secret.')).sort(),
  ['lab.brian.secret.1970', 'lab.brian.secret.1978', 'lab.brian.secret.2022', 'lab.brian.secret.reverse'], 'the secret has four lines');
same(Object.keys(LAB_LINES).filter(id => id.startsWith('lab.brian.restore.')).sort(), ['lab.brian.restore.done', 'lab.brian.restore.start'], 'the restore has two lines');
same(Object.keys(LAB_LINES).length, 54, 'fifty-four lines in all');
ok(LAB_VOICE === HELI_RADIO_VOICE, 'the Lab is the same Brian');

// One kept take per line: catalog record, hash, runtime copy, the same voice and settings as the helicopter and the lessons.
const heliSettings = catalog.sounds.find(row => row.cue === 'heli.radio.liftoff.hold').settings;
let creditsUsed = 0, runtimeBytes = 0;
for (const [id, line] of Object.entries(LAB_LINES)) {
  const records = catalog.sounds.filter(row => row.cue === id);
  same(records.length, 1, `${id}: one catalog record`);
  const [record] = records;
  ok(record.source === 'elevenlabs' && record.text === line.text && record.file === `audio-src/voices/${line.file}`, `${id}: text and file recorded`);
  ok(record.voiceId === HELI_RADIO_VOICE.voiceId && record.model === 'eleven_multilingual_v2', `${id}: Brian, same model`);
  same(record.settings, heliSettings, `${id}: the helicopter lines' settings`);
  const take = read(record.file), runtime = `public/assets/audio/voices/${line.file}`;
  same(sha(take), record.sha256, `${id}: the kept take matches its hash`);
  ok(existsSync(new URL(runtime, root)) && sha(read(runtime)) === record.sha256, `${id}: the runtime file is the kept take, unchanged`);
  creditsUsed += record.creditsUsed; runtimeBytes += take.length;
}
ok(creditsUsed > 0 && creditsUsed <= 9000, `voice credits within budget (${creditsUsed})`);
ok(runtimeBytes < 7e6, `the fifty-four lines stay small (${runtimeBytes} bytes)`);
same(copyLabVoices().lines, 54, 'the build step finds all fifty-four kept takes');

// The bank: every line and sound behind the lab switch, lines on the voice bus, ducking like the other speech.
const heli = SOUND_BANK['heli.radio.liftoff.hold'];
for (const [id, cue] of Object.entries(LAB_CUES)) {
  ok(SOUND_BANK[id] === cue, `${id}: in the sound bank`);
  ok(cue.flag === 'lab' && BUS_NAMES.includes(cue.bus), `${id}: behind its switch on a real bus`);
}
for (const [id, line] of Object.entries(LAB_LINES)) {
  const cue = LAB_VOICE_CUES[id];
  same({bus: cue.bus, priority: cue.priority, limit: cue.limit, duck: cue.duck, file: cue.file}, {bus: heli.bus, priority: heli.priority, limit: heli.limit, duck: heli.duck, file: `voices/${line.file}`}, `${id}: plays like the other speech`);
  ok(cue.volume === line.volume && line.volume > 0 && line.volume <= 2.5, `${id}: its fitted level`);
}
same(Object.keys(LAB_SOUND_CUES).sort(), ['car.speirling', 'car.sputter', 'lab.burner', 'lab.clunk', 'lab.creak', 'lab.fan', 'lab.fizz', 'lab.reverse', 'lab.snap', 'lab.splash', 'lab.tick'], 'the Lab sound cues');
ok(HELI_CUES['heli.buoy-hit']?.layers && HELI_CUES['heli.retardant']?.layers && SOUND_BANK['heli.buoy-hit'] && SOUND_BANK['heli.retardant'], 'the buoy and the retardant are in the helicopter bank and the sound bank');
// Every sound a bench names is made.
for (const file of readdirSync(new URL('src/lab/benches/', root)).filter(name => name.endsWith('.js')))
  for (const [, list] of String(read('src/lab/benches/' + file)).matchAll(/cues:\s*\[([^\]]*)\]/g))
    for (const [, id] of list.matchAll(/'([^']+)'/g)) ok(SOUND_BANK[id], `${file}: bench cue ${id} exists`);

// Start-up loading leaves the Lab's files out, with the switch off or on: the Lab loads its own when it opens.
const labFiles = new Set(Object.values(LAB_CUES).filter(cue => cue.file).map(cue => '/assets/audio/' + cue.file));
ok(labFiles.size === 57, 'fifty-four lines and three sound files');
for (const on of [false, true]) {
  const audio = Object.create(EngineAudio.prototype), requested = [];
  Object.assign(audio, {flags: {enabled: name => on && name === 'lab'}, cueBuffers: {},
    context: {decodeAudioData: async () => ({}), state: 'running'}, muted: false, paused: false});
  const fetchBefore = globalThis.fetch;
  globalThis.fetch = async url => { requested.push(url); return {ok: true, arrayBuffer: async () => new ArrayBuffer(1)}; };
  try { await audio._loadCueBuffers(); } finally { globalThis.fetch = fetchBefore; }
  ok(requested.length > 0, `start-up loads the ordinary cues (switch ${on ? 'on' : 'off'})`);
  ok(!requested.some(url => labFiles.has(url)), `start-up loads no Lab sound (switch ${on ? 'on' : 'off'})`);
}

// Level: the clean voice is not run through the radio chain, so each line's cue volume brings its take to the target.
{
  let worst = 0;
  for (const [id, line] of Object.entries(LAB_LINES)) {
    const bytes = read(`public/assets/audio/voices/${line.file}`), take = measureLoudness(bytes);
    ok(take.available && take.truePeakDbtp <= -1, `${id}: take peak ${take.truePeakDbtp} dBTP is under -1`);
    const effective = take.integratedLufs + 20 * Math.log10(line.volume);
    worst = Math.max(worst, Math.abs(effective - LAB_VOICE_TARGET_LUFS));
  }
  ok(worst <= .5, `every line plays within 0.5 LU of ${LAB_VOICE_TARGET_LUFS} LUFS (worst ${worst.toFixed(2)})`);
}

// The sounds: layered cues rendered in Node (peaks well under full scale, and audible); the three files measured and rebuilt.
for (const id of ['lab.burner', 'lab.snap', 'lab.creak', 'lab.splash', 'lab.tick', 'lab.clunk', 'lab.fizz', 'car.sputter', 'heli.buoy-hit', 'heli.retardant']) {
  const measured = measureCue(SOUND_BANK[id]);
  ok(measured.truePeakDbtp <= -3 && measured.truePeakDbtp >= -16, `${id}: peak ${measured.truePeakDbtp.toFixed(1)} dBTP, between -16 and -3`);
  ok(measured.seconds > .05 && measured.seconds < 2, `${id}: ${measured.seconds.toFixed(2)} s long`);
}
{
  const scratch = mkdtempSync(join(tmpdir(), 'lab-sounds-'));
  try {
    for (const recipe of LAB_SOUND_RECIPES) {
      const cue = SOUND_BANK[recipe.id], bytes = read('public/assets/audio/' + cue.file), measured = measureLoudness(bytes);
      ok(bytes.toString('ascii', 0, 4) === 'OggS' && cue.file === recipe.file, `${recipe.id}: an Ogg file named by its recipe`);
      ok((cue.loop === true) === recipe.loop, `${recipe.id}: loop matches the recipe`);
      ok(measured.available && measured.truePeakDbtp <= -1, `${recipe.id}: peak ${measured.truePeakDbtp} dBTP`);
      near(measured.integratedLufs, recipe.targetLufs, 1, `${recipe.id}: loudness at its target`);
      const rebuilt = buildSound(recipe, {root: scratch});
      ok(rebuilt.loopSeam === null || rebuilt.loopSeam.pass, `${recipe.id}: the loop closes`);
      same(sha(readFileSync(join(scratch, 'public/assets/audio', recipe.file))), sha(bytes), `${recipe.id}: rebuilt from its recipe, byte for byte`);
    }
  } finally { rmSync(scratch, {recursive: true, force: true}); }
}

// The retardant: the bucket's pourStart carries `retardant: true`, and only then plays the retardant sound.
same(HELI_EVENT_CUES.pourStart({type: 'pourStart', retardant: true}), [['heli.retardant']], 'retardant pours with its own sound');
same(HELI_EVENT_CUES.pourStart({type: 'pourStart'}), [], 'a water pour keeps its bed and adds nothing');

console.log(`test-lab-radio: ${checks} checks passed (${creditsUsed} voice credits, ${runtimeBytes} bytes)`);
