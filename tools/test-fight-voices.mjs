import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {EngineAudio} from '../src/audio.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {FEATURE_STATES, createFeatureFlags} from '../src/feature-flags.js';
import {Duel} from '../src/game.js';
import {COURSE} from '../src/config.js';
import {fireWeapon} from '../src/combat-weapons.js';
// DRIVE-LESSON-LINES: the driving instructor's cues joined the bank behind their switch; exactly that list is left out.
import {DRIVE_LESSON_CUES} from '../src/lessons/drive-radio-lines.js';
const DRIVE_BANK_CUES = new Set(Object.keys(DRIVE_LESSON_CUES));

// AUD-18: approved takes stay exact. Native event routing and a pure caption
// getter share presentation history without adding fields to the race state.
const hash = value => createHash('sha256').update(value).digest('hex');
const catalog = JSON.parse(readFileSync(new URL('./audio/catalog.json', import.meta.url), 'utf8'));
const records = catalog.sounds.filter(row => row.source === 'elevenlabs' && !row.cue.startsWith('heli.') && !DRIVE_BANK_CUES.has(row.cue));
const KEPT = records.filter(row => row.key !== 'gatekeeper.welcome');
let checks = 0;
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (actual, message) => { checks++; assert.ok(actual, message); };
test.after(() => console.log(`Fight voices: ${checks} acceptance checks executed.`));
const voiceCalls = f => f.calls.filter(id => KEPT.some(row => row.cue === id));
let presenter;
async function subtitle(state) {
  if (!presenter) {
    ok(existsSync(new URL('../src/fight-voices.js', import.meta.url)), 'the runtime fight subtitle presenter must exist');
    presenter = await import('../src/fight-voices.js');
  }
  ok(typeof presenter.readFightSubtitle === 'function', 'the HUD needs a pure readFightSubtitle getter');
  return presenter.readFightSubtitle(state);
}
function state(crewId = 'rook') {
  return {status: 'racing', mode: 'wasteland', paused: false, crewId,
    wastelandGateDiscovered: true, stageIndex: 0, stageTimeSec: 10,
    maxArmor: 100, armor: 100, opponents: [], combat: {}};
}
function fixture({enabled = true, muted = false, context = true} = {}) {
  const calls = [], voices = [];
  const audio = new EngineAudio({flags: {enabled: name => name === 'fight-voices' && enabled}});
  audio.context = context ? {state: 'running', currentTime: 10} : null;
  audio.muted = muted;
  audio.cueBuffers = Object.fromEntries(KEPT.map(row => [row.cue, {duration: 3}]));
  audio.buses = {voice: {}, weapons: {}};
  audio._syncMixer = () => {};
  audio._weaponCue = () => {};
  audio._spatialOutput = () => ({level: {}, disconnect() {}});
  audio._playCue = id => {
    const voice = {stops: 0, stop() {this.stops++;}};
    calls.push(id); voices.push({id, voice}); return voice;
  };
  const emit = (event, s) => audio.event(event, s, {});
  const update = s => {
    ok(typeof audio.updateFightVoices === 'function', 'EngineAudio must own fight voice pause and navigation cleanup');
    audio.updateFightVoices(s);
  };
  return {audio, calls, voices, emit, update};
}

test('all kept takes, catalog receipts, exact texts and voice choices remain unchanged', () => {
  equal(hash(JSON.stringify(records)), '4e24a491b463ab3f71184bf5a930c39985406f35067fcea23b235ee2e679d824',
    'all ten original voice records, including the gatekeeper, stay exact');
  equal(KEPT.length, 9, 'eight crew callouts and one raider warning are kept');
  for (const row of records) equal(hash(readFileSync(new URL('../' + row.file, import.meta.url))),
    row.sha256, `${row.key}: the approved source take is unchanged`);
  equal(records.find(row => row.key === 'raider.toll').voiceId, 'pqHfZKP75CvOlQylNhV4', 'Raiders retain Bill');
  equal(records.find(row => row.key === 'crew.rook.callout').voiceId, 'SOYHLrjzK2X1ezoPC6cr', 'Rook retains Harry');
  equal(hash(JSON.stringify(SOUND_BANK['gatekeeper.welcome'])),
    '8aa79453c102565629f8d712b02705afde196e3c247123906c2fcebe470c4433', 'the existing gatekeeper bank cue is unchanged');
});

for (const row of KEPT) test(`${row.cue} uses the exact take through the voice sound bank`, () => {
  const cue = SOUND_BANK[row.cue];
  ok(cue, `${row.cue}: missing kept runtime bank cue`);
  equal(cue.bus, 'voice', 'speech uses the voice bus');
  equal(cue.flag, 'fight-voices', 'speech stays behind the new dev switch');
  equal(cue.limit, 1, 'one voice per cue bounds playback');
  equal(cue.duck, 'voice', 'spoken lines use the existing voice ducking');
  ok(cue.file?.startsWith('voices/'), 'only runtime speech lives in the voices asset folder');
  equal(hash(readFileSync(new URL('../public/assets/audio/' + cue.file, import.meta.url))),
    row.sha256, 'runtime MP3 is the approved take, with no new recording or transcription');
});

test('fight voices is released (on, 9 October 2026)', () => {
  equal(FEATURE_STATES['fight-voices'], 'on', 'fight speech has its own switch, released on');
});

test('the first native player combat action plays the selected crew line with its exact subtitle', async () => {
  for (const row of KEPT.filter(row => row.key.startsWith('crew.'))) {
    const id = row.key.split('.')[1], f = fixture(), s = state(id), before = structuredClone(s);
    f.emit({weaponFired: 'crossbow', enemy: true}, s);
    equal(voiceCalls(f), [], 'an enemy weapon does not announce the player crew');
    f.emit({weaponFired: 'crossbow'}, s);
    equal(voiceCalls(f), [row.cue], `${id}: the native player trigger plays the selected line`);
    equal(await subtitle(s), row.text, 'the caption matches the approved spoken text exactly');
    for (let n = 0; n < 5; n++) {f.update(s); await subtitle(s); f.emit({weaponFired: 'crossbow'}, s);}
    equal(voiceCalls(f), [row.cue], 'repeated attacks and HUD snapshots cannot replay the line');
    equal(s, before, 'speech and caption rendering do not change race state');
  }
});

test('crew gear and repair are real crew callout triggers', async () => {
  for (const event of [{crewGearCue: 'crew.cinder.fire', actor: 'player'}, {footRepairStarted: true}]) {
    const f = fixture(), s = state('odessa'); f.emit(event, s);
    equal(voiceCalls(f), ['crew.odessa.callout'], 'the native player action announces the selected crew');
    equal(await subtitle(s), records.find(row => row.key === 'crew.odessa.callout').text,
      'gear and repair share the exact selected-crew subtitle');
  }
});

test('native raider warning plays Bill once per fight with matching subtitles', async () => {
  const f = fixture(), s = state(), before = structuredClone(s);
  f.emit({raiderWarning: true}, s); f.emit({raiderWarning: true}, s);
  equal(voiceCalls(f), ['raider.toll'], 'the existing warning event plays Bill once');
  equal(await subtitle(s), records.find(row => row.key === 'raider.toll').text, 'the raider subtitle matches the kept take');
  equal(s, before, 'warning speech does not change simulation or rewards');
});

test('muted or unavailable audio still shows the exact subtitle', async () => {
  for (const options of [{muted: true}, {context: false}]) {
    const f = fixture(options), s = state(); f.emit({weaponFired: 'crossbow'}, s);
    equal(voiceCalls(f), [], 'sound-off cannot start a spoken line');
    equal(await subtitle(s), records.find(row => row.key === 'crew.rook.callout').text,
      'captions work before the native muted or unavailable-context return');
  }
});

test('mute retires active speech but leaves its subtitle visible', async () => {
  const f = fixture(), s = state(); f.emit({weaponFired: 'crossbow'}, s);
  equal(voiceCalls(f), ['crew.rook.callout'], 'the line starts before muting');
  f.audio.muted = true; f.update(s); f.update(s);
  equal(f.voices.find(v => v.id === 'crew.rook.callout').voice.stops, 1, 'muting stops the owned line exactly once');
  equal(await subtitle(s), records.find(row => row.key === 'crew.rook.callout').text,
    'muting does not erase the subtitle');
  f.audio.muted = false; f.update(s); f.emit({weaponFired: 'crossbow'}, s);
  equal(voiceCalls(f), ['crew.rook.callout'], 'unmuting does not replay the announced line');
});

test('pause and menu retire speech and captions without restarting the same fight line', async () => {
  for (const next of [s => {s.paused = true;}, s => {s.status = 'menu';}]) {
    const f = fixture(), s = state(); f.emit({raiderWarning: true}, s);
    equal(voiceCalls(f), ['raider.toll'], 'warning is playing before leaving active combat');
    next(s); f.update(s); f.update(s);
    equal(f.voices.find(v => v.id === 'raider.toll').voice.stops, 1, 'leaving active combat stops the owned warning once');
    equal(await subtitle(s), null, 'pause or menu hides the subtitle');
  }
});

test('stage restart clears presentation history even while muted, so a new fight can speak', () => {
  const f = fixture(), s = state(); f.emit({weaponFired: 'crossbow'}, s);
  equal(voiceCalls(f), ['crew.rook.callout'], 'the first fight announces Rook');
  f.audio.muted = true; f.emit({stageLoaded: 0}, s);
  f.audio.muted = false; f.emit({weaponFired: 'crossbow'}, s);
  equal(voiceCalls(f), ['crew.rook.callout', 'crew.rook.callout'], 'a genuine stage restart permits the new fight line');
});

test('off, undiscovered, ordinary, countdown and paused events remain silent', async () => {
  for (const [options, fields] of [[{enabled: false}, {}], [{}, {wastelandGateDiscovered: false}],
    [{}, {mode: 'duel'}], [{}, {status: 'countdown'}], [{}, {paused: true}]]) {
    const f = fixture(options), s = Object.assign(state(), fields), before = structuredClone(s);
    f.emit({weaponFired: 'crossbow'}, s); f.emit({raiderWarning: true}, s);
    equal(voiceCalls(f), [], 'nonplaying or unavailable speech stays silent');
    equal(await subtitle(s), null, 'nonplaying or unavailable speech has no subtitle');
    equal(s, before, 'inactive presentation leaves simulation exact');
  }
});

// The exact ordinary race fingerprints are checked once, in test-warlord-format.
// Here the switch must make no difference to the same race and say nothing.
test('voice event presentation leaves ordinary races exactly as with the switch off', () => {
  const controls = JSON.parse(readFileSync(new URL('./replays/warlord-format-ordinary.json', import.meta.url), 'utf8'));
  const race = (spec, on) => {
    const duel = new Duel({seed: spec.seed, featureFlags: {'fight-voices': on}}), f = fixture();
    duel.onChange((s, event) => f.emit(event, s));
    duel.startCampaign({seed: spec.seed, mode: spec.mode, car: 'falcone_f42',
      startStage: COURSE.findIndex(c => c.id === spec.course), difficulty: 'casual', cpuDifficulty: 'medium'});
    const samples = [];
    for (let n = 0; n < 1200; n++) {
      duel.setInput({throttle: 1, brake: n >= 800 ? .2 : 0, steer: n < 500 ? .08 : -.04, boost: false});
      duel.step(1 / 120);
      if (n % 120 === 119) samples.push({status: duel.state.status, s: duel.state.s,
        lateral: duel.state.lateral, speedMph: duel.state.speedMph, time: duel.state.stageTimeSec,
        laps: duel.state.completedLaps, score: duel.state.score,
        rivals: duel.state.opponents.map(actor => [actor.s, actor.lateral, actor.speedMph]), result: duel.state.results});
    }
    return {trace: hash(JSON.stringify(samples)), voices: voiceCalls(f), moved: samples.at(-1).s > samples[0].s};
  };
  for (const spec of controls.cases) {
    const on = race(spec, true), off = race(spec, false);
    equal(on.trace, off.trace, `${spec.mode}/${spec.course}: the switch leaves the ordinary race exact`);
    equal(on.moved, true, `${spec.mode}/${spec.course}: the ordinary race really runs`);
    equal(on.voices, [], 'ordinary replay emits no kept fight speech');
  }
});

function nativeVoices({cuesOnly = false} = {}) {
  const f = fixture(), events = [];
  const duel = new Duel({seed: 3180, featureFlags: createFeatureFlags({storage: null, qa: true,
    overrides: {arsenal: true, 'fight-voices': true}})});
  duel.startCampaign({mode: 'wasteland', discoveredGate: true, arsenalRank: 30,
    crewId: 'rook', car: 'falcone_f42', cpuDifficulty: 'hard', opponentCount: 1, seed: 3180});
  const s = duel.state, rival = s.opponents[0];
  Object.assign(s, {status: 'racing', countdown: 0, invulnerableSec: 0, stageTimeSec: 10,
    s: 500, prevS: 500, lateral: 0, prevLateral: 0, speedMph: 0, traffic: []});
  Object.assign(rival, {s: 515, prevS: 515, lateral: 0, prevLateral: 0,
    speedMph: 0, headingError: Math.PI, combatShield: 0});
  s.combat.aiTimer = s.combat.pickupTimer = Infinity;
  const point = (distance, lateral = 0) => ({x: lateral, y: 0, z: distance, heading: 0, curvature: 0});
  duel.course = {...duel.course, at: point, worldAt: point, groundAt: point,
    nearest: (x, z) => ({s: z, lateral: x}),
    obstaclesNear: () => [], roadHalfWidthAt: () => 20};
  duel._obstacles = () => [];
  duel.onChange((next, event) => {
    events.push(event);
    if (!cuesOnly || event.arsenalCue) f.emit(event, next);
  });
  return {...f, duel, s, rival, events};
}

test('native CPU-only Star is silent and cannot consume the next real player crew callout', async () => {
  const f = nativeVoices();
  f.rival.weaponLoadout = ['star'];
  equal(fireWeapon(f.duel, 'star', true, f.rival), true, 'the native CPU Star trigger really fires');
  ok(f.s.combat.rivalShield > 0, 'the actual computer shield is active');
  equal(voiceCalls(f), [], 'a real CPU-only Star must never play the selected player crew line');
  equal(await subtitle(f.s), null, 'a CPU shield must not create a player subtitle');
  equal(fireWeapon(f.duel, 'star'), true, 'the native player Star trigger really fires afterward');
  equal(voiceCalls(f), ['crew.rook.callout'], 'the first real player action still announces Rook');
  equal(await subtitle(f.s), records.find(row => row.key === 'crew.rook.callout').text,
    'the actual player action presents the approved exact caption');
  f.emit(f.events.findLast(event => event.weaponFired === 'star'), f.s);
  equal(voiceCalls(f), ['crew.rook.callout'], 'repeated presentation cannot replay the player line');
});

const NATIVE_CUES = [['oil', 'weapon.oil.deploy'], ['smoke', 'weapon.smoke.deploy'],
  ['harpoon', 'weapon.harpoon.fire'], ['rockets', 'weapon.rockets.fire']];

for (const [weapon, cue] of NATIVE_CUES) test(`native ${weapon} actions announce only the real player`, async () => {
  const f = nativeVoices(); f.rival.weaponLoadout = [weapon];
  equal(fireWeapon(f.duel, weapon, true, f.rival), true, `the native enemy ${weapon} producer fires`);
  ok(f.events.some(event => event.arsenalCue === cue && event.actor === f.rival),
    'the native Arsenal cue names the actual enemy actor');
  equal(voiceCalls(f), [], 'enemy Arsenal actions must neither speak nor consume the player callout');
  equal(await subtitle(f.s), null, 'enemy Arsenal cues never create a player caption');
  equal(fireWeapon(f.duel, weapon), true, `the native player ${weapon} producer fires`);
  const action = f.events.find(event => event.arsenalCue === cue && event.actor === f.s);
  ok(action, 'the native Arsenal cue names the actual player state actor');
  equal(voiceCalls(f), ['crew.rook.callout'], 'the native player Arsenal action speaks exactly once');
  equal(await subtitle(f.s), records.find(row => row.key === 'crew.rook.callout').text,
    'native Arsenal actions use the selected crew caption');
  f.emit(action, f.s); f.update(f.s);
  equal(voiceCalls(f), ['crew.rook.callout'], 'cue and generic weapon event cannot duplicate speech');
});

test('four actual actor-attributed Arsenal cues can announce without any generic weapon event', async () => {
  for (const [weapon, cue] of NATIVE_CUES) {
    const f = nativeVoices({cuesOnly: true}); f.rival.weaponLoadout = [weapon];
    equal(fireWeapon(f.duel, weapon, true, f.rival), true, 'the genuine enemy producer supplies its cue');
    equal(voiceCalls(f), [], 'an actor-attributed enemy cue stays silent on its own');
    equal(fireWeapon(f.duel, weapon), true, 'the genuine player producer supplies its cue');
    ok(f.events.some(event => event.arsenalCue === cue && event.actor === f.s),
      'the production cue carries the real player actor');
    equal(voiceCalls(f), ['crew.rook.callout'], 'the actor-attributed player cue alone starts one crew line');
    equal(await subtitle(f.s), records.find(row => row.key === 'crew.rook.callout').text,
      'cue-only native action shows the exact subtitle');
  }
});
