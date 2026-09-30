import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {COURSE} from '../src/config.js';
import {Duel} from '../src/game.js';
import {FEATURE_STATES, createFeatureFlags} from '../src/feature-flags.js';
import {EngineAudio} from '../src/audio.js';
import {SOUND_BANK} from '../src/sound-bank.js';

// CRASH-SWITCH-REMOVE: released crashes are permanent rules. Old flag views
// must not restore scripted contacts or mute their presentation. The existing
// combat replay file remains the reviewed released-rules fingerprint baseline.
let checks = 0, failures = 0;
function check(name, run) {
  checks++;
  try { run(); }
  catch (error) {
    failures++;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
const retired = ['crash-physics', 'crash-effects'];
const stage = COURSE.findIndex(event => !event.kind && event.hasRival);
const base = 900;
const views = {
  'false overrides': {wasteland2: true, 'crash-physics': false, 'crash-effects': false},
  'custom flag view': {enabled: name => name === 'wasteland2'},
};
function race(featureFlags, car = 'falcone_f42', playerMph = 110) {
  const duel = new Duel({seed: 2709, featureFlags});
  duel.startCampaign({mode: 'wasteland', startStage: stage, car, opponentCount: 1});
  const state = duel.state;
  Object.assign(state, {status: 'racing', countdown: 0, invulnerableSec: 0,
    s: base, prevS: base, lateral: 0, prevLateral: 0, speedMph: playerMph,
    pushVelocity: 0, headingError: 0, trafficTimer: 999});
  Object.assign(state.input, {throttle: 1, brake: 0, steer: 0});
  state.traffic = [];
  return duel;
}
function run(duel, seconds, each = () => {}) {
  for (let tick = 0; tick < Math.round(seconds * 60); tick++) {
    duel.step(1 / 60); each();
  }
}
function trafficCrash(flags) {
  const duel = race(flags), state = duel.state;
  for (const actor of state.opponents)
    Object.assign(actor, {s: base + 3000, prevS: base + 3000});
  const traffic = {s: base + 8, prevS: base + 8, lateral: 0, prevLateral: 0,
    speedMph: 40, dir: 1, alive: true, headingError: 0, pushVelocity: 0, model: 'sedan'};
  state.traffic = [traffic];
  const events = [], samples = [];
  duel.onChange((_, event) => { if (event.roadsideImpact) events.push(event.roadsideImpact.outcome); });
  run(duel, 10, () => {
    if (traffic.knock || traffic.wrecked) samples.push({s: traffic.s, lateral: traffic.lateral});
  });
  return {duel, traffic, events, samples};
}
function ramDamage(flags, playerCar, rivalCar) {
  const duel = race(flags, playerCar, 100), state = duel.state;
  state.combatBumperSpikes = false;
  Object.assign(state.opponents[0], {s: base + 8, prevS: base + 8,
    lateral: 0, prevLateral: 0, speedMph: 40, headingError: 0,
    pushVelocity: 0, car: rivalCar, armor: 500});
  run(duel, .6);
  return 500 - state.opponents[0].armor;
}
for (const name of retired) check(`${name} leaves the switch registry`, () => {
  assert.equal(Object.hasOwn(FEATURE_STATES, name), false,
    `${name} must be removed from FEATURE_STATES after release`);
  const flags = createFeatureFlags({storage: null, search: `?flags=${name}`, qa: true});
  assert.equal(flags.state(name), null, 'retired flags have no lifecycle state');
  assert.equal(flags.enabled(name), false, 'retired names cannot be enabled through QA');
});
const released = trafficCrash({wasteland2: true, 'crash-physics': true});
for (const [name, flags] of Object.entries(views)) {
  check(`physical roadside wreck with ${name}`, () => {
    const actual = trafficCrash(flags);
    assert.ok(actual.traffic.wrecked?.physical,
      'released traffic hits must create physical wrecks even when old flag views return false');
    assert.ok(actual.traffic.s - actual.samples[0].s >= 40,
      'the struck hulk must carry momentum down the road');
    assert.ok(Math.abs(actual.traffic.lateral) > actual.duel.course.roadHalfWidthAt(actual.traffic.s),
      'the hulk must settle beyond the road');
    assert.deepEqual(actual.samples, released.samples,
      'an obsolete switch view must not change wreck motion or roadside speed loss');
    assert.deepEqual(actual.events, released.events,
      'an obsolete switch view must not restore scripted roadside bursts');
  });
  check(`mass-based ram armor damage with ${name}`, () => {
    const heavy = ramDamage(flags, 'titan_monster', 'falcone_f42');
    const light = ramDamage(flags, 'falcone_f42', 'titan_monster');
    const equal = ramDamage(flags, 'falcone_f42', 'falcone_f42');
    assert.ok(heavy > light * 5,
      'released ram damage must follow the struck car delta-v rather than closing speed');
    assert.ok(equal >= 25 && equal <= 45,
      'equal-mass rear rams must retain the released armor damage range');
  });
}
check('crash sound plays with a custom flag view that disables retired flags', () => {
  const audio = new EngineAudio({flags: {enabled: () => false}});
  const calls = [];
  audio.context = {state: 'running', currentTime: 10};
  audio.muted = false; audio.paused = false;
  audio._syncMixer = () => {};
  audio._spatialOutput = () => ({level: {}, space: {distance: 30, pan: 0}, disconnect() {}});
  audio._playCue = (id, options = {}) => { calls.push({id, scale: options.scale}); return {}; };
  audio.event({vehicleSmash: {severity: 'smashed', dvMph: 40,
    point: {x: 30, z: 0}, traffic: true}}, {}, null);
  assert.equal(calls.filter(call => call.id === 'vehicle.crash-impact').length, 1,
    'a released smash must play its impact even when crash-effects is absent or false');
});
check('crash impact sound bank has no retired flag requirement', () => {
  assert.ok(SOUND_BANK['vehicle.crash-impact'], 'released impact cue remains available');
  assert.equal(SOUND_BANK['vehicle.crash-impact'].flag, undefined,
    'the released impact cue must not require the deleted crash-effects switch');
});
// Removal itself is acceptance: retained dead branches would still cost readers
// context and could reintroduce retired contacts. Cover every runtime owner.
for (const file of ['sim-contacts.js', 'combat-armor.js', 'sim-driving.js',
  'sim-police.js', 'sim-rival.js', 'render3d.js', 'audio.js', 'arena/arena-event.js']) {
  check(`${file} no longer consults retired switches`, () => {
    const source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /enabled\s*\(\s*['"]crash-(?:physics|effects)['"]\s*\)/,
      `${file} must stop branching on retired crash switches`);
  });
}
check('released combat replay fingerprints remain unchanged', () => {
  const result = spawnSync(process.execPath,
    [fileURLToPath(new URL('./test-combat-replays.mjs', import.meta.url))],
    {encoding: 'utf8', timeout: 120000});
  assert.equal(result.status, 0,
    `released combat replay fingerprints changed: ${result.stderr || result.error || result.stdout}`);
  assert.match(result.stdout, /Combat replay fingerprints: 12 checks passed/,
    'the reviewed four released encounters must retain all three frame cadences');
});
console.log(`Crash switch removal: ${checks} checks, ${checks - failures} passed, ${failures} failed.`);
if (failures) process.exitCode = 1;
