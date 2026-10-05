import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {CREW} from '../src/crew.js';
import {stepRaiders, damageRaider} from '../src/raiders.js';
import {stepCpuCrew} from '../src/crew-gear/cpu-crews.js';
import {stepCombatAI} from '../src/combat-ai.js';
import {EngineAudio} from '../src/audio.js';
import {FIGHT_VOICE_LINES, readFightSubtitle} from '../src/fight-voices.js';

// CREW-04: native computer driving and raider-fighter damage, on the real
// course. Fixtures set initial race conditions, never manufacture stop states.
const DT = 1 / 120;
let checks = 0;
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (actual, message) => { checks++; assert.ok(actual, message); };
test.after(() => console.log(`Computer crews: ${checks} acceptance checks executed.`));

function race({difficulty = 'medium', enabled = true, cpuEnabled = true, discovered = true,
    seed = 3004, opponents = 1, mode = 'wasteland'} = {}) {
  const duel = new Duel({seed, featureFlags: createFeatureFlags({storage: null,
    qa: true, overrides: {'crew-gear': enabled, 'cpu-crews': cpuEnabled}})});
  duel.startCampaign({mode, car: 'falcone_f42', driverId: 'club',
    discoveredGate: discovered, opponentCount: opponents, seed, cpuDifficulty: difficulty});
  const state = duel.state, rival = state.opponents[0];
  Object.assign(state, {status: 'racing', countdown: 0, traffic: [],
    invulnerableSec: 0, lapsTotal: 1, completedLaps: 0});
  state.combat && Object.assign(state.combat, {aiTimer: Infinity, pickupTimer: Infinity});
  const anchor = duel.course.length * .45;
  Object.assign(state, {s: anchor - 1000, prevS: anchor - 1000, speedMph: 0});
  for (const actor of state.opponents) Object.assign(actor, {s: anchor,
    prevS: anchor, lateral: 0, prevLateral: 0, speedMph: 0, armor: 100,
    maxArmor: 100, impactTimer: 0, combatShield: 0, completedLaps: 0});
  return {duel, state, rival};
}
function tick(f, count = 1) {
  for (let n = 0; n < count; n++) {
    f.state.stageTimeSec += DT;
    for (const actor of f.state.opponents) f.duel._rival(DT, actor);
    if (f.state.raids) stepRaiders(f.duel, DT);
  }
}
const stopped = actor => ['pulling-over', 'repair', 'ambush', 'recovering'].includes(actor.cpuCrew?.phase);
function repairStart(f) {
  f.rival.armor = 29; tick(f);
  ok(stopped(f.rival), 'an eligible native computer must start its repair stop');
  for (let n = 0; n < 1200 && f.rival.cpuCrew.phase !== 'repair'; n++) tick(f);
  equal(f.rival.cpuCrew.phase, 'repair', 'the computer actually stops and gets out');
  ok(f.rival.speedMph <= 1, 'the computer is parked before its fighter starts repair');
  ok(f.rival.cpuCrew.fighter, 'the stopped computer has a real crew fighter');
  return f.rival.armor;
}
function ambushRace(options = {}) {
  const f = race({difficulty: 'hard', ...options});
  const zone = f.state.raids.zones[0];
  f.rival.s = f.rival.prevS = zone.s;
  f.state.s = f.state.prevS = zone.s - 250;
  return f;
}

test('released crew gear does not implicitly admit computer crews', () => {
  const defaults = createFeatureFlags({storage: null, qa: false});
  equal(defaults.enabled('crew-gear'), true, 'the existing released crew gear remains enabled');
  equal(defaults.enabled('cpu-crews'), false, 'new computer behavior is off without its own request');
  const f = race({cpuEnabled: false}); f.rival.armor = 29;
  tick(f, 120);
  equal(f.duel.featureFlags.enabled('crew-gear'), true, 'the CPU-only off control retains released player gear');
  equal(f.duel.featureFlags.enabled('cpu-crews'), false, 'the explicit off control does not admit computer crews');
  equal(f.rival.cpuCrew, undefined, 'an off native race creates no computer crew controller');
  ok(f.rival.speedMph > 1, 'the off native computer continues ordinary driving');
});

test('computer crews have their own explicitly requested dev admission', () => {
  const f = race();
  equal(f.duel.featureFlags.state('cpu-crews'), 'dev', 'computer behavior has its own dev switch, not released crew gear');
  equal(f.duel.featureFlags.enabled('cpu-crews'), true, 'the native acceptance fixture explicitly requests computer crews');
  f.rival.armor = 29; tick(f);
  ok(stopped(f.rival), 'the explicitly admitted native computer begins its eligible repair stop');
});

function actualControllerRepair() {
  const f = race(); f.rival.armor = 29;
  for (let n = 0; n < 1200 && f.rival.cpuCrew?.phase !== 'repair'; n++) {
    f.state.stageTimeSec += DT;
    stepCpuCrew(f.duel, f.rival, DT, {enabled: true});
  }
  equal(f.rival.cpuCrew?.phase, 'repair', 'the actual controller pulls over and creates its repair stop');
  ok(f.rival.cpuCrew.fighter && f.rival.speedMph <= 1,
    'a real parked fighter exists before probing the held native callers');
  return f;
}

test('native rival motion cannot drive a real repairing computer away from its fighter', () => {
  const f = actualControllerRepair();
  const at = {s: f.rival.s, lateral: f.rival.lateral};
  f.duel._rival(.25, f.rival);
  ok(f.rival.speedMph <= 1, 'the native rival caller keeps the repairing car parked');
  equal({s: f.rival.s, lateral: f.rival.lateral}, at,
    'the native rival caller leaves the parked car beside its actual repair fighter');
  equal(f.rival.cpuCrew.phase, 'repair', 'the native stop remains in progress');
});

test('native combat AI suppresses car weapons while its actual crew is repairing', () => {
  function carShots(f) {
    const shots = [];
    f.rival.weaponLoadout = ['crossbow'];
    f.state.s = f.state.prevS = f.rival.s + 40;
    f.state.lateral = f.state.prevLateral = f.rival.lateral;
    f.state.combat.aiTimer = 0;
    f.duel.onChange((_state, event) => {if (event.weaponFired && event.enemy) shots.push(event.weaponFired);});
    stepCombatAI(f.duel, DT);
    return shots;
  }
  equal(carShots(race({cpuEnabled: false})), ['crossbow'],
    'the same ready native car can fire normally when no crew stop exists');
  const f = actualControllerRepair();
  equal(carShots(f), [], 'native combat AI cannot fire the parked car weapons while its crew is outside');
  equal(f.rival.cpuCrew.phase, 'repair', 'moving the enemy into weapon range does not fabricate a completed stop');
});

test('all native computer cars receive valid repeatable seeded crews', () => {
  function selected() {
    const f = race({opponents: 3}); tick(f);
    const ids = f.state.opponents.map(actor => actor.cpuCrew?.crewId);
    ok(ids.every(id => Object.hasOwn(CREW, id)), 'every computer receives a real crew member from the seeded field');
    return ids;
  }
  equal(selected(), selected(), 'identical seeds reproduce the computer crew field');
});

test('Medium repair grants forty armor over four seconds, or two seconds for Odessa', () => {
  const f = race(), before = repairStart(f);
  const seconds = f.rival.cpuCrew.crewId === 'odessa' ? 2 : 4;
  tick(f, Math.round((seconds - DT) / DT));
  ok(f.rival.armor < before + 40, 'repair has not completed before its full duration');
  tick(f);
  ok(Math.abs(f.rival.armor - Math.min(f.rival.maxArmor, before + 40)) < 1e-6,
    'the completed stop repairs exactly forty armor');
  equal(f.rival.cpuCrew.phase, 'driving', 'the fighter gets back in and resumes driving');
});

test('Odessa is selected from the native seeded field and completes her faster repair', () => {
  let found = null;
  for (let seed = 3004; seed < 3068; seed++) {
    const f = race({seed}); tick(f);
    ok(f.rival.cpuCrew, 'native crew assignment exists before searching the seeded field');
    if (f.rival.cpuCrew.crewId === 'odessa') {found = f; break;}
  }
  ok(found, 'the seeded computer field includes Odessa');
  const before = repairStart(found); tick(found, Math.round(2 / DT));
  ok(Math.abs(found.rival.armor - Math.min(found.rival.maxArmor, before + 40)) < 1e-6,
    'Odessa repairs forty armor in two seconds');
});

test('repair stops are at most once per lap', () => {
  const f = race(); repairStart(f); tick(f, Math.round(4.1 / DT));
  equal(f.rival.cpuCrew.phase, 'driving', 'the first repair stop has ended');
  f.rival.armor = 29; tick(f);
  equal(stopped(f.rival), false, 'the same computer cannot stop to repair twice on this lap');
});

for (const [label, options, arrange] of [
  ['Easy', {difficulty: 'easy'}, () => {}],
  ['disabled crew switch', {enabled: false}, () => {}],
  ['undiscovered player', {discovered: false}, () => {}],
  ['ordinary race', {mode: 'duel'}, () => {}],
  ['thirty-percent armor', {}, f => {f.rival.armor = 30;}],
  ['nearby enemy', {}, f => {f.state.s = f.rival.s - 20;}],
  ['last four hundred metres', {}, f => {f.rival.s = f.duel.course.raceLength - 399;}],
]) test(`repair eligibility rejects ${label}`, () => {
  const f = race(options); f.rival.armor = 29; arrange(f); tick(f, 2);
  equal(stopped(f.rival), false, `${label} must not send the computer crew out to repair`);
});

test('Hard computer at an ambush zone starts a real fighter ambush when leading by 150 to 400 metres', () => {
  const f = ambushRace(); tick(f);
  ok(stopped(f.rival), 'the eligible native Hard computer must pull over for its ambush');
  for (let n = 0; n < 1200 && f.rival.cpuCrew.phase !== 'ambush'; n++) tick(f);
  equal(f.rival.cpuCrew.phase, 'ambush', 'the Hard computer actually stops for its ambush');
  ok(f.rival.cpuCrew.fighter, 'the ambush fighter is present on foot');
  ok(f.rival.speedMph <= 1, 'the ambusher car is parked');
  tick(f, Math.round(12 / DT));
  ok(f.rival.cpuCrew.shots > 0 && f.rival.cpuCrew.shots <= 3, 'the native ambusher fires one to three RPG rockets');
  equal(f.rival.cpuCrew.phase, 'driving', 'the ambusher gets back in after firing');
});

for (const [label, options, arrange] of [
  ['Easy', {difficulty: 'easy'}, () => {}],
  ['Medium', {difficulty: 'medium'}, () => {}],
  ['less than 150 metres ahead', {}, f => {f.state.s = f.rival.s - 149;}],
  ['more than 400 metres ahead', {}, f => {f.state.s = f.rival.s - 401;}],
  ['no ambush zone', {}, f => {f.state.raids.zones = [];}],
  ['last five hundred metres', {}, f => {
    const s = f.duel.course.raceLength - 499;
    f.state.raids.zones[0].s = s; f.rival.s = s; f.state.s = s - 250;
  }],
]) test(`ambush eligibility rejects ${label}`, () => {
  const f = ambushRace(options); arrange(f); tick(f, 2);
  equal(stopped(f.rival), false, `${label} must not send the computer crew out to ambush`);
});

test('knocking down a native stopped fighter holds its car for three seconds and then respawns beside it', () => {
  const f = race(); repairStart(f);
  const fighter = f.rival.cpuCrew.fighter;
  damageRaider(f.duel, fighter, fighter.health + 1, {owner: 'player', source: 'onFoot'});
  ok(fighter.knockedDown, 'the actual fighter damage path knocks the computer crew down');
  tick(f, Math.round((3 - DT) / DT));
  ok(f.rival.speedMph <= 1, 'the car stays parked while its fighter is down');
  ok(fighter.knockedDown, 'the fighter does not respawn before three seconds');
  tick(f);
  equal(fighter.knockedDown, false, 'the fighter respawns after three seconds');
  ok(fighter.health > 0, 'the respawned fighter has health');
});

// These controller probes isolate native cue attribution while the rival caller
// is held. They do not replace the six positive native-caller acceptance cases.
function controllerAmbush(member) {
  const f = ambushRace({seed: member === 'odessa' ? 3004 : 3013});
  stepCpuCrew(f.duel, f.rival, DT, {enabled: true});
  equal(f.rival.cpuCrew?.crewId, member, `the native seeded Hard field selects ${member}`);
  for (let n = 0; n < 1200 && f.rival.cpuCrew.phase !== 'ambush'; n++) {
    f.state.stageTimeSec += DT;
    stepCpuCrew(f.duel, f.rival, DT, {enabled: true});
  }
  equal(f.rival.cpuCrew.phase, 'ambush', 'the controller parks and creates its actual ambush fighter');
  const fighter = f.rival.cpuCrew.fighter;
  Object.assign(f.state, {crewId: 'rook', s: fighter.s, prevS: fighter.s,
    lateral: fighter.lateral + 4, prevLateral: fighter.lateral + 4,
    speedMph: 0, headingError: 0, armor: 100, maxArmor: 100, combatShield: 0});
  const target = f.duel.course.groundAt(f.state.s, f.state.lateral);
  ok(Math.hypot(target.x - fighter.x, target.z - fighter.z) <= 6,
    'the real player is within the native turret/flamer reach');
  return f;
}
function nativeVoiceListener(f, cpuCue = null) {
  const calls = [], events = [];
  const audio = new EngineAudio({flags: {enabled: name => name === 'fight-voices'}});
  audio.context = {state: 'running', currentTime: 0}; audio.muted = false;
  audio.cueBuffers = Object.fromEntries(Object.keys(FIGHT_VOICE_LINES).map(id => [id, {duration: 3}]));
  audio._syncMixer = () => {};
  audio._weaponCue = () => {};
  audio._playCue = id => {calls.push(id); return {stop() {}};};
  f.duel.onChange((state, event) => {
    events.push(event);
    if (event.weaponFired || event.crewGearCue && (!cpuCue || event.crewGearCue === cpuCue))
      audio.event(event, state, f.duel.course);
  });
  return {audio, events, speech: () => calls.filter(id => Object.hasOwn(FIGHT_VOICE_LINES, id))};
}
for (const [member, cue] of [['odessa', 'crew.turret.deploy'],
    ['odessa', 'crew.turret.fire'], ['cinder', 'crew.flamer.start']]) {
  test(`native CPU ${cue} leaves the player Rook callout unused`, () => {
    const f = controllerAmbush(member), voice = nativeVoiceListener(f, cue);
    for (let n = 0; n < 240 && !voice.events.some(event => event.crewGearCue === cue); n++) {
      f.state.stageTimeSec += DT;
      stepCpuCrew(f.duel, f.rival, DT, {enabled: true});
    }
    const event = voice.events.find(event => event.crewGearCue === cue);
    ok(event, `${cue} is produced by the real CPU signature/contact action`);
    equal(voice.speech(), [], `${cue}: the native CPU cue must not announce the player's Rook line`);
    equal(readFightSubtitle(f.state), null, 'the CPU cue creates no player caption');
    equal(event.enemy, true, 'the native gear cue identifies an enemy action');
    ok(event.actor === f.rival, 'the native gear cue retains the actual CPU actor');
    equal(Object.hasOwn(f.state, 'playerActed'), false, 'CPU presentation adds no player action marker');
    f.state.stageTimeSec += 6; voice.audio.updateFightVoices(f.state);
    equal(voice.speech(), [], 'no player callout is queued behind the CPU action');
    equal(readFightSubtitle(f.state), null, 'no delayed player caption follows the CPU action');
    equal(f.duel.fireWeapon('crossbow'), true, 'the actual player can still fire the native Crossbow');
    equal(voice.speech(), ['crew.rook.callout'], 'the first real player action still announces Rook exactly once');
    equal(readFightSubtitle(f.state), FIGHT_VOICE_LINES['crew.rook.callout'].text,
      'the player action presents the exact kept Rook caption');
  });
}
test('a real player Crossbow action remains a positive Rook speech control', () => {
  const f = race(); f.state.crewId = 'rook';
  const voice = nativeVoiceListener(f);
  equal(f.duel.fireWeapon('crossbow'), true, 'the genuine player weapon producer fires');
  equal(voice.speech(), ['crew.rook.callout'], 'the genuine player action announces its selected crew');
  equal(readFightSubtitle(f.state), FIGHT_VOICE_LINES['crew.rook.callout'].text,
    'the real merged Voice consumer renders the approved exact player caption');
});
