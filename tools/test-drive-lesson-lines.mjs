// LESSONS-V2-LINES: v2 script, complete radio choices, kept takes and runtime files.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, existsSync, readdirSync} from 'node:fs';
import {DRIVE_RADIO_LINES, DRIVE_RADIO_VOICE, DRIVE_LESSON_CUES} from '../src/lessons/drive-radio-lines.js';
import {createDriveLesson, stepDriveLesson, DRIVE_LESSON_STEPS, driveLessonResultRadio} from '../src/lessons/drive-lessons.js';
import {DRIVE_LESSON_VIEW, driveLessonBriefingMarkup} from '../src/lessons/drive-lesson-ui.js';
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

// The card's line list is the exact recording/subtitle contract (14.11).
const design = String(read('docs/changes/LESSONS-V2-LINES.md'));
const table = Object.fromEntries([...design.matchAll(/^\| `(drive\.radio\.v2\.[a-z.-]+)` \| (.+?) \|$/gm)].map(m => [m[1], m[2]]));
same(Object.keys(table).length, 22, 'the v2 script has twenty-two distinct recordings');
same(Object.fromEntries(Object.entries(DRIVE_RADIO_LINES).map(([id, line]) => [id, line.text])), table, 'the lines match the approved script word for word');
ok(Object.values(DRIVE_RADIO_LINES).every(line => !/\d|credit|second|mph|km\/h|metre|meter|price|dollar/i.test(line.text)), 'no recording names times, speeds, prices or distances');
const catalogIds = catalog.sounds.filter(row => row.cue?.startsWith('drive.radio.')).map(row => row.cue).sort();
same(catalogIds, Object.keys(table).sort(), 'no missing or leftover driving voice catalog records');
for (const folder of ['audio-src/voices/', 'public/assets/audio/voices/']) {
  same(readdirSync(new URL(folder, root)).filter(file => file.startsWith('drive-radio-')).sort(),
    Object.values(DRIVE_RADIO_LINES).map(line => line.file).sort(), folder + ': no missing or leftover files');
}

// Exercise every step and result choice. This set must equal the bank, so a
// recorded line that the lessons cannot choose fails as well as a missing one.
const picked = new Set(['drive.radio.v2.corner.watch-late']);
const target = {name: 'Bend', kind: 'brake', approachS: 0, brakeS: 20, turnInS: 40, turnOutS: 60, exitS: 80, targetMph: 50};
const view = {s: 0, lateral: 0, world: {x: 0, z: 0}, speedMph: 50, brake: 0, throttle: 0, tyreSlip: 0, status: 'racing'};
for (const id of ['corner', 'line', 'gears', 'snow']) {
  const lesson = createDriveLesson(id, {corner: {startS: 0, finishS: 100, dir: 1},
    instructor: {timeSec: 10, corners: [target], cones: [], poses: [{s: 0, t: 0}, {s: 100, t: 10}]}});
  picked.add(DRIVE_LESSON_VIEW[id].intro);
  const briefing = driveLessonBriefingMarkup({lesson, playerId: 'test', runPlayerId: 'test'});
  ok(briefing.includes(DRIVE_RADIO_LINES[DRIVE_LESSON_VIEW[id].intro].text), id + ': briefing shows exact intro');
  for (const stage of DRIVE_LESSON_STEPS) {
    lesson.stage = stage.id; lesson.phase = 'ready';
    const result = stepDriveLesson(lesson, view, {start: true}); picked.add(result.radio);
    same(result.radio, 'drive.radio.v2.shared.' + stage.id, id + ': step start');
  }
  const row = {name: 'Bend', kind: 'brake', checks: {brake: true, speed: true, quiet: true},
    brakeDeltaM: 0, minMph: 50, targetMph: 50, screechSeconds: 0, wallHit: false, missed: 0};
  const choose = (expected, extra = {}, state = {}) => {
    const result = driveLessonResultRadio(lesson, [{...row, ...extra}],
      {reason: 'finish', success: false, clean: true, faster: true, ...state});
    same(result, 'drive.radio.v2.' + expected, id + ': ' + expected); picked.add(result);
  };
  choose(id + '.pass', {}, {success: true});
  choose('shared.off', {}, {reason: 'offroad', clean: false});
  choose('shared.off', {}, {reason: 'wall', clean: false});
  lesson.attempt.screechSeconds = .4;
  choose('shared.slid', {}, {clean: false}); lesson.attempt.screechSeconds = 0;
  choose('shared.slid', {checks: {...row.checks, quiet: false}});
  choose('shared.late', {checks: {...row.checks, brake: false}, brakeDeltaM: 20});
  choose('shared.late', {checks: {...row.checks, brake: false}, brakeDeltaM: null});
  lesson.stage = 'your-turn';
  choose('shared.late', {checks: {...row.checks, brake: false}, brakeDeltaM: 20}, {success: true});
  lesson.stage = 'beat';
  choose('shared.early', {checks: {...row.checks, brake: false}, brakeDeltaM: -20});
  choose('shared.lift', {checks: {...row.checks, brake: false}, kind: 'lift'});
  choose('shared.fast', {checks: {...row.checks, speed: false}, minMph: 60});
  choose('shared.slow', {checks: {...row.checks, speed: false}, minMph: 40});
  choose('shared.pace', {}, {faster: false});
  choose('shared.pace', {}, {reason: 'stop'});
  choose('shared.clean');
  same(DRIVE_LESSON_VIEW[id].pass, 'drive.radio.v2.' + id + '.pass', id + ': save retry pass id');
}
same([...picked].sort(), Object.keys(DRIVE_RADIO_LINES).sort(), 'every selectable recording exists, and every recording is used');
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
ok(creditsUsed > 0 && creditsUsed <= 6000, `voice credits within the existing 6000-credit test budget (${creditsUsed})`);
ok(runtimeBytes < 4.0e6, `the v2 lines stay small (${runtimeBytes} bytes)`);

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

// The bank: twenty-six cues behind the driving-lessons switch, the lines on the voice bus like the helicopter's radio.
same(Object.keys(DRIVE_LESSON_CUES).length, 26, 'twenty-two lines, the cone and three shift-light ticks');
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
