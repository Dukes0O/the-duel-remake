// DRIVE-LESSON-LINES and DRIVE-LESSONS-LINES-2: the driving instructor's radio lines
// (docs/DRIVING_LESSONS.md section 6 and 12.7), the cone sound and the shift-light ticks.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, existsSync} from 'node:fs';
import {DRIVE_RADIO_LINES, DRIVE_RADIO_VOICE, DRIVE_LESSON_CUES} from '../src/lessons/drive-radio-lines.js';
import {HELI_RADIO_VOICE, createRadioChain} from '../src/lessons/radio-voice.js';
import {SOUND_BANK, BUS_NAMES} from '../src/sound-bank.js';
import {EngineAudio} from '../src/audio.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const catalog = JSON.parse(read('tools/audio/catalog.json'));

// Every line in the design has a take, with the design's exact words.
const design = String(read('docs/DRIVING_LESSONS.md'));
const table = Object.fromEntries([...design.matchAll(/^\| `(drive\.radio\.[a-z.]+)` \| (.+?) \|$/gm)].map(m => [m[1], m[2]]));
same(Object.keys(table).length, 15, 'section 6 lists fifteen lines');
// 12.7 lists the ids without the "drive.radio." prefix: thirty more for lessons 2 to 4, two for the true late try.
const more = design.slice(design.indexOf('### 12.7'), design.indexOf('### 12.8'));
for (const m of more.matchAll(/^\| `([a-z.]+)` \| (.+?) \|$/gm)) table['drive.radio.' + m[1]] = m[2];
same(Object.keys(table).length, 47, 'the design lists forty-seven lines');
ok(!('drive.radio.corner.late.result' in DRIVE_RADIO_LINES) && !catalog.sounds.some(row => row.cue === 'drive.radio.corner.late.result'), 'the untrue time-lost line is gone');
same(Object.fromEntries(Object.entries(DRIVE_RADIO_LINES).map(([id, line]) => [id, line.text])), table, 'the lines match the design word for word');
ok(Object.values(DRIVE_RADIO_LINES).every(line => !/\d|credit|second/i.test(line.text)), 'no line names a time or a price');
ok(DRIVE_RADIO_VOICE === HELI_RADIO_VOICE, 'the driving instructor is the same Brian');

// One kept take per line: catalog record, hash, runtime copy, same voice and settings as the helicopter.
const heliSettings = catalog.sounds.find(row => row.cue === 'heli.radio.liftoff.hold').settings;
let creditsUsed = 0, runtimeBytes = 0;
for (const [id, line] of Object.entries(DRIVE_RADIO_LINES)) {
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
ok(creditsUsed > 0 && creditsUsed <= 6000, `voice credits within the two cards' budget (${creditsUsed})`);
ok(runtimeBytes < 4.0e6, `the forty-seven lines stay small (${runtimeBytes} bytes)`);

// The cone: one CC0 library recipe, credited, built by the card's script.
{
  const records = catalog.sounds.filter(row => row.cue === 'lesson.cone');
  same(records.length, 1, 'the cone has one catalog record');
  const [cone] = records;
  ok(cone.source === 'freesound' && cone.license === 'CC0 1.0' && cone.author && cone.page, 'the cone is CC0 and credited');
  ok(cone.processing?.script === 'tools/audio/build-drive-lessons.mjs', 'the cone is rebuilt from its recipe');
  same(sha(read(cone.runtime.file)), cone.runtime.sha256, 'the cone runtime file matches its record');
  ok(cone.runtime.truePeakDbtp <= -1, 'the cone keeps its peak under -1 dB');
}

// The bank: fifty-one cues behind the driving-lessons switch, the lines on the voice bus like the helicopter's radio.
same(Object.keys(DRIVE_LESSON_CUES).length, 51, 'forty-seven lines, the cone and three shift-light ticks');
for (const [id, cue] of Object.entries(DRIVE_LESSON_CUES)) {
  ok(SOUND_BANK[id] === cue, `${id}: in the sound bank`);
  ok(cue.flag === 'driving-lessons' && BUS_NAMES.includes(cue.bus), `${id}: behind its switch on a real bus`);
}
for (const id of Object.keys(DRIVE_RADIO_LINES)) {
  const cue = DRIVE_LESSON_CUES[id], heli = SOUND_BANK['heli.radio.liftoff.hold'];
  same({bus: cue.bus, priority: cue.priority, limit: cue.limit, duck: cue.duck}, {bus: heli.bus, priority: heli.priority, limit: heli.limit, duck: heli.duck},
    `${id}: plays like the helicopter's radio lines`);
}
// The shift light: three rising ticks (the engine has no pitch option per play), tone recipes, no file to load.
{
  const ticks = ['lesson.shift-light', 'lesson.shift-light.2', 'lesson.shift-light.3'].map(id => DRIVE_LESSON_CUES[id]);
  ok(ticks.every(Boolean), 'the shift light has its three ticks');
  const pitch = cue => cue.layers[0].frequency;
  ok(pitch(ticks[0]) < pitch(ticks[1]) && pitch(ticks[1]) < pitch(ticks[2]), 'the three ticks rise');
  ok(ticks.every(cue => !cue.file && cue.layers.every(layer => layer.duration <= .1 && layer.volume <= .06)), 'each tick is short and soft, made from a recipe');
}
ok(typeof createRadioChain === 'function', 'the radio chain the lines play through is shared');

// Start-up loading leaves the driving cues out, with the switch off or on:
// the lesson loads its own sounds when it starts (like the helicopter's).
const driveFiles = new Set(Object.values(DRIVE_LESSON_CUES).map(cue => '/assets/audio/' + cue.file));
for (const on of [false, true]) {
  const audio = Object.create(EngineAudio.prototype), requested = [];
  Object.assign(audio, {flags: {enabled: name => on && name === 'driving-lessons'}, cueBuffers: {},
    context: {decodeAudioData: async () => ({}), state: 'running'}, muted: false, paused: false});
  const fetchBefore = globalThis.fetch;
  globalThis.fetch = async url => { requested.push(url); return {ok: true, arrayBuffer: async () => new ArrayBuffer(1)}; };
  try { await audio._loadCueBuffers(); } finally { globalThis.fetch = fetchBefore; }
  ok(requested.length > 0, `start-up loads the ordinary cues (switch ${on ? 'on' : 'off'})`);
  ok(!requested.some(url => driveFiles.has(url)), `start-up loads no driving lesson sound (switch ${on ? 'on' : 'off'})`);
}

console.log(`test-drive-lesson-lines: ${checks} checks passed (${creditsUsed} voice credits, ${runtimeBytes} bytes)`);
