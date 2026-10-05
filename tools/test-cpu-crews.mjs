import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {CREW} from '../src/crew.js';
import {stepRaiders, damageRaider} from '../src/raiders.js';
import {stepCpuCrew} from '../src/crew-gear/cpu-crews.js';
import {stepCombatAI} from '../src/combat-ai.js';
import {stepProjectiles} from '../src/combat-projectiles.js';
import {point} from '../src/combat-weapons.js';
import {createFighter} from '../src/onfoot.js';
import {createCombatScene} from '../src/combat-scene.js';
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
  f.state.s = f.state.prevS = zone.s - 200;
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
test('the native player car sweep knocks down a real stopped computer fighter', () => {
  const f = actualControllerRepair(), fighter = f.rival.cpuCrew.fighter;
  Object.assign(f.state, {prevS: fighter.s - 8, s: fighter.s + 8,
    prevLateral: fighter.lateral, lateral: fighter.lateral, speedMph: 35});
  f.state.stageTimeSec += DT;
  stepCpuCrew(f.duel, f.rival, DT, {enabled: true});
  equal(fighter.knockedDown, true, 'the real player car sweep reaches the exposed computer body');
  equal(f.rival.cpuCrew.phase, 'recovering', 'the parked car waits for its knocked-down crew');
  ok(f.rival.cpuCrew.respawnAt > f.state.stageTimeSec,
    'the native stopped controller schedules the usual three-second recovery');
});

test('native rival motion cannot drive a real repairing computer away from its fighter', () => {
  const f = actualControllerRepair();
  const at = {s: f.rival.s, lateral: f.rival.lateral};
  f.duel._rival(.25, f.rival);
  ok(f.rival.speedMph <= 1, 'the native rival caller keeps the repairing car parked');
  equal({s: f.rival.s, lateral: f.rival.lateral}, at,
    'the native rival caller leaves the parked car beside its actual repair fighter');
  equal(f.rival.cpuCrew.phase, 'repair', 'the native stop remains in progress');
});
test('the real stopped fighter enters the bounded scene pool without changing simulation state', () => {
  const f = actualControllerRepair(), requested = [];
  f.state.stageTimeSec += 1;
  stepCpuCrew(f.duel, f.rival, DT, {enabled: true});
  const scene = createCombatScene(undefined, {loadFighterAsset: async id => {
    requested.push(id); throw Error('Native roster test does not load a browser asset');
  }});
  const before = JSON.stringify(f.rival.cpuCrew);
  scene.update(f.duel); scene.update(f.duel);
  const figures = scene.group.getObjectByName('Rigged on-foot fighters');
  ok(figures.visible, 'the actual CPU repair fighter makes the scene fighter pool active');
  equal(JSON.stringify(f.rival.cpuCrew), before, 'presentation never writes the computer stop state');
  scene.dispose();
});
test('native CPU repair lifecycle uses spatial existing cues without player speech', () => {
  const f = race(), calls = [], positions = [];
  const audio = new EngineAudio({flags: {enabled: name => ['crew-gear', 'cpu-crews', 'fight-voices'].includes(name)}});
  audio.context = {state: 'running', currentTime: 0}; audio.muted = false;
  audio.buses = {vehicle: {}, weapons: {}};
  audio._syncMixer = () => {}; audio._weaponCue = () => {};
  audio._spatialOutput = event => {positions.push(event.hitPosition); return {level: {}, disconnect() {}};};
  audio._playCue = id => {calls.push(id); return {stop() {}};};
  f.duel.onChange((state, event) => {
    if (event.cpuCrewExited || event.cpuCrewEntered || event.footRepairStarted || event.footRepairCompleted)
      audio.event(event, state, f.duel.course);
  });
  repairStart(f); tick(f, 600);
  equal(calls, ['vehicle.landing', 'repair.start', 'repair.complete', 'vehicle.landing'],
    'the real exit, wrench repair and return reuse the existing native cues');
  ok(positions.every(at => Number.isFinite(at?.x) && Number.isFinite(at?.z)),
    'each CPU cue is placed at the actual stopped fighter or car');
  equal(readFightSubtitle(f.state), null, 'enemy repair and return never announce the player crew');
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

test('native stopped crew holds defensive pickup charges until returning to the car', () => {
  const ready = race({cpuEnabled: false});
  ready.state.combat.cpuPickupCharges.star = 1;
  stepCombatAI(ready.duel, DT);
  equal(ready.state.combat.cpuPickupCharges.star, 0,
    'a ready native car still spends its collected shield normally');

  const f = actualControllerRepair(), shots = [];
  f.state.combat.cpuPickupCharges.star = 1;
  f.duel.onChange((_state, event) => {if (event.weaponFired && event.enemy) shots.push(event.weaponFired);});
  stepCombatAI(f.duel, DT);
  equal(f.state.combat.cpuPickupCharges.star, 1,
    'the parked car cannot spend a defensive pickup while its fighter is outside');
  equal(shots, [], 'the defensive path creates no vehicle weapon event');

  for (let n = 0; n < 600 && f.rival.cpuCrew.phase !== 'driving'; n++) {
    f.state.stageTimeSec += DT;
    stepCpuCrew(f.duel, f.rival, DT, {enabled: true});
  }
  equal(f.rival.cpuCrew.phase, 'driving', 'the real repair controller returns its fighter to the car');
  const before = f.rival.s;
  f.duel._rival(.25, f.rival);
  ok(f.rival.s > before && f.rival.speedMph > 0, 'native driving resumes after the fighter returns');
  stepCombatAI(f.duel, DT);
  equal(f.state.combat.cpuPickupCharges.star, 0, 'the returned driver can use its retained shield');
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
  f.state.s = f.state.prevS = f.rival.s - 100;
  tick(f, Math.round(12 / DT));
  ok(f.rival.cpuCrew.shots > 0 && f.rival.cpuCrew.shots <= 3, 'the native ambusher fires one to three RPG rockets');
  equal(f.rival.cpuCrew.phase, 'driving', 'the ambusher gets back in after firing');
});
test('a Hard ambush outside RPG reach arms but waits for the player to approach', () => {
  const f = ambushRace();
  f.state.s = f.state.prevS = f.rival.s - 250;
  tick(f);
  ok(stopped(f.rival), 'a 250-metre lead still triggers an eligible ambush');
  for (let n = 0; n < 1200 && f.rival.cpuCrew.phase !== 'ambush'; n++) tick(f);
  equal(f.rival.cpuCrew.phase, 'ambush', 'the actual fighter exits at the ambush zone');
  tick(f, 120);
  equal(f.rival.cpuCrew.shots, 0, 'the stationary player beyond RPG reach is not attacked');
  f.state.s = f.state.prevS = f.rival.s - 100;
  tick(f, 240);
  ok(f.rival.cpuCrew.shots > 0, 'the same real ambusher attacks after the player enters reach');
});
for (const arsenal of [false, true]) test(`native weapon-disable deadline holds AI fire with Arsenal ${arsenal ? 'on' : 'off'}`, () => {
  function shot({held}) {
    const f = race({cpuEnabled: false}), events = [];
    f.duel.featureFlags = createFeatureFlags({storage: null, qa: true, overrides: {arsenal}});
    f.rival.weaponLoadout = ['crossbow'];
    f.state.s = f.state.prevS = f.rival.s + 40;
    f.state.lateral = f.state.prevLateral = f.rival.lateral;
    f.state.combat.aiTimer = 0;
    f.rival.weaponsDisabledUntil = held ? Infinity : 0;
    f.duel.onChange((_state, event) => {if (event.weaponFired && event.enemy) events.push(event.weaponFired);});
    stepCombatAI(f.duel, DT);
    return events;
  }
  ok(shot({held: false}).length > 0, 'the same ready car can still fire through native AI');
  equal(shot({held: true}), [], 'a held vehicle cannot fire through an alternate weapon path');
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
test('a real computer crew RPG keeps its enemy owner while guiding toward the player', () => {
  const f = controllerAmbush('odessa');
  const fighter = f.rival.cpuCrew.fighter;
  Object.assign(f.state, {s: fighter.s + 40, prevS: fighter.s + 40,
    lateral: fighter.lateral, prevLateral: fighter.lateral});
  for (let n = 0; n < 240 && !f.state.combat.projectiles.some(shot => shot.kind === 'rpg'); n++) {
    f.state.stageTimeSec += DT;
    stepCpuCrew(f.duel, f.rival, DT, {enabled: true});
  }
  const shot = f.state.combat.projectiles.find(projectile => projectile.kind === 'rpg');
  ok(shot, 'the real ambush controller emits its RPG, not a test-made projectile');
  equal(shot.sourceIndex, f.state.opponents.indexOf(f.rival), 'the shot identifies its actual computer owner');
  equal(shot.targetIndex, -1, 'the real enemy shot locks the player');
  equal(shot.targetId, 'player', 'the native target identity is the player');
  f.state.lateral += 12; f.state.prevLateral = f.state.lateral;
  const target = point(f.duel, f.state);
  const wanted = Math.atan2(target.x - shot.x, target.z - shot.z);
  const error = () => Math.abs(Math.atan2(Math.sin(wanted - Math.atan2(shot.vx, shot.vz)),
    Math.cos(wanted - Math.atan2(shot.vx, shot.vz))));
  const before = error();
  ok(before > .01, 'the real target moved away from the emitted launch bearing');
  stepProjectiles(f.duel, .01);
  equal(shot.targetIndex, -1, 'native enemy guidance keeps the hostile player lock');
  ok(error() < before, 'the native RPG turns toward the player instead of querying targets as the player');
});
for (const enemy of [true, false]) for (const splash of [false, true])
  test(`${enemy ? 'CPU' : 'player'} RPG ${splash ? 'splash' : 'direct'} respects roadside raider hostility and credit`, () => {
    const f = race({difficulty: 'hard'}), raider = f.state.raids.zones[0].raiders[0];
    f.state.raids.zones = [{...f.state.raids.zones[0], raiders: [raider]}];
    Object.assign(f.state, {s: 0, prevS: 0});
    Object.assign(f.rival, {s: 0, prevS: 0});
    const before = raider.health;
    if (splash) raider.health = 1;
    const shot = {kind: 'rpg', enemy, sourceIndex: 0, attackerId: enemy ? 'cpu:0' : 'player',
      owner: enemy ? 'cpu' : 'player', id: 'native-raider-regression',
      x: raider.x + (splash ? 2 : -2), y: raider.y + .9, z: raider.z,
      vx: splash ? 0 : 55, vy: 0, vz: 0, age: splash ? 20 : 1, level: 0,
      launchX: raider.x - 100, launchZ: raider.z};
    f.state.combat.projectiles = [shot];
    const events = [];
    f.duel.onChange((_state, event) => events.push(event));
    stepProjectiles(f.duel, .05);
    equal(raider.knockedDown, !enemy, 'only the hostile player RPG can knock down the roadside raider');
    equal(f.state.combat.scoring.knockdowns, enemy ? 0 : 1, 'only a player knockdown earns player score');
    equal(f.state.combat.notorietyEvents?.filter(event => event.type === 'raiderKnockdown').length || 0,
      enemy ? 0 : 1, 'enemy fire never earns player notoriety');
    if (enemy) {
      equal(raider.health, splash ? 1 : before, 'a friendly enemy rocket cannot damage this raider');
      equal(events.filter(event => event.raiderHit || event.raiderKnockdown), [], 'friendly fire emits no raider damage credit');
      if (!splash) equal(f.state.combat.projectiles, [shot], 'a friendly raider does not consume the live rocket');
    } else equal(events.find(event => event.raiderKnockdown)?.owner, 'player', 'the positive hit records the actual player owner');
  });
test('a native Cinder ambusher aims its reachable flamer at the on-foot player, not the parked car', () => {
  const f = controllerAmbush('cinder'), fighter = f.rival.cpuCrew.fighter;
  const car = point(f.duel, f.state), distance = Math.hypot(car.x - fighter.x, car.z - fighter.z);
  f.state.onFoot = true;
  f.state.fighter = createFighter(f.duel.course, f.state);
  Object.assign(f.state.fighter, {x: fighter.x - 3 * (car.x - fighter.x) / distance,
    z: fighter.z - 3 * (car.z - fighter.z) / distance, y: fighter.y, crewId: 'rook'});
  const before = f.state.fighter.health, events = [];
  f.duel.onChange((_state, event) => events.push(event));
  f.state.stageTimeSec += DT;
  stepCpuCrew(f.duel, f.rival, DT, {enabled: true});
  equal(f.rival.cpuCrew.signatureUsed, true, 'Cinder uses the reachable signature before any RPG');
  equal(events.filter(event => event.crewGearCue === 'crew.flamer.start').length, 1, 'the native flamer starts once');
  ok(f.state.fighter.health < before, 'the flame reaches the live fighter on the opposite side of its parked car');
  equal(f.state.combat.projectiles.filter(shot => shot.kind === 'rpg'), [], 'reachable flamer does not spend an RPG');
});
test('a real CPU crew RPG guides toward a moved on-foot player while the parked car stays put', () => {
  const f = controllerAmbush('odessa'), fighter = f.rival.cpuCrew.fighter;
  Object.assign(f.state, {s: fighter.s + 40, prevS: fighter.s + 40,
    lateral: fighter.lateral, prevLateral: fighter.lateral});
  for (let n = 0; n < 240 && !f.state.combat.projectiles.some(shot => shot.kind === 'rpg'); n++) {
    f.state.stageTimeSec += DT; stepCpuCrew(f.duel, f.rival, DT, {enabled: true});
  }
  const shot = f.state.combat.projectiles.find(projectile => projectile.kind === 'rpg');
  ok(shot, 'the actual native crew emits the projectile');
  const car = point(f.duel, f.state);
  f.state.onFoot = true; f.state.fighter = createFighter(f.duel.course, f.state);
  const launchBearing = Math.atan2(shot.vx, shot.vz), carBearing = Math.atan2(car.x - shot.x, car.z - shot.z);
  const carTurn = Math.atan2(Math.sin(carBearing - launchBearing), Math.cos(carBearing - launchBearing));
  const fighterBearing = launchBearing - (Math.sign(carTurn) || 1) * .7;
  Object.assign(f.state.fighter, {x: shot.x + Math.sin(fighterBearing) * 50,
    z: shot.z + Math.cos(fighterBearing) * 50, y: car.y - 1});
  const wanted = Math.atan2(f.state.fighter.x - shot.x, f.state.fighter.z - shot.z);
  const error = () => Math.abs(Math.atan2(Math.sin(wanted - Math.atan2(shot.vx, shot.vz)),
    Math.cos(wanted - Math.atan2(shot.vx, shot.vz))));
  const before = error();
  const carError = () => Math.abs(Math.atan2(Math.sin(carBearing - Math.atan2(shot.vx, shot.vz)),
    Math.cos(carBearing - Math.atan2(shot.vx, shot.vz))));
  const beforeCar = carError();
  stepProjectiles(f.duel, .01);
  equal(point(f.duel, f.state), car, 'the parked car has not moved');
  equal(shot.targetId, 'player', 'the actual player lock remains valid');
  ok(error() < before, 'the CPU crew RPG turns toward the live fighter instead of the parked car');
  ok(carError() > beforeCar, 'following the live fighter moves the rocket away from the parked-car bearing');
});
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
test('every seeded native crew uses only its settled ambush gear and the three-attack cap', () => {
  const expected = {rook: null, nell: 'crew.sticky.throw', jax: null,
    odessa: 'crew.turret.deploy', cinder: 'crew.flamer.start',
    dune: 'crew.marksman.fire', wren: null, tusk: 'crew.scrap-cannon.fire'};
  const selected = new Map();
  for (let seed = 3004; seed < 3068 && selected.size < 8; seed++) {
    const f = ambushRace({seed}); tick(f);
    if (!selected.has(f.rival.cpuCrew.crewId)) selected.set(f.rival.cpuCrew.crewId, f);
  }
  equal(selected.size, 8, 'the actual seeded field supplies every settled crew member');
  for (const [member, f] of selected) {
    const events = [];
    f.duel.onChange((_state, event) => events.push(event));
    for (let n = 0; n < 1200 && f.rival.cpuCrew.phase !== 'ambush'; n++) tick(f);
    equal(f.rival.cpuCrew.phase, 'ambush', `${member}: the native driver parks before using gear`);
    const fighter = f.rival.cpuCrew.fighter;
    Object.assign(f.state, {s: fighter.s, prevS: fighter.s, lateral: fighter.lateral + 4,
      prevLateral: fighter.lateral + 4, speedMph: 0, combatShield: 0});
    tick(f, 120);
    if (expected[member]) equal(events.filter(event => event.crewGearCue === expected[member]).length, 1,
      `${member}: its reachable signature gear fires once`);
    else equal(events.filter(event => event.crewGearCue).length, 0,
      `${member}: it uses RPG only, never signature gear`);
    f.state.s = f.state.prevS = f.rival.s - 100;
    tick(f, 1200);
    equal(f.rival.cpuCrew.shots, 3, `${member}: the native stop never exceeds three attacks`);
    equal(f.rival.cpuCrew.phase, 'driving', `${member}: the real fighter returns after attacking`);
    const fired = events.filter(event => event.footWeaponFired).map(event => event.footWeaponFired);
    ok(fired.every(kind => member === 'dune' ? kind === 'marksman' :
      ['rpg', member === 'nell' ? 'sticky-bomb' : member === 'tusk' ? 'scrap-cannon' : null].includes(kind)),
    `${member}: the emitted native weapon kinds follow the settled rule`);
  }
});
