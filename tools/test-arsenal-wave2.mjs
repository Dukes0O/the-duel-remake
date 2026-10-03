import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {createFeatureFlags, FEATURE_STATES} from '../src/feature-flags.js';
import {stepPickups} from '../src/combat-pickups.js';
import {startScrapMagnet, stepScrapMagnets, endScrapMagnet,
  shouldUseScrapMagnet} from '../src/arsenal/magnet.js';
import {startFlamethrower, stepFlamethrowers, flameCpuAim}
  from '../src/arsenal/flamethrower.js';
import {startRocketVolley, stepRocketVolleys, stepRocketPod,
  rocketCpuAim} from '../src/arsenal/rockets.js';

const DT = 1 / 120, EPS = 1e-8;
let checks = 0;
function check(name, fn) {
  try {fn(); checks++;}
  catch (error) {console.error(`FAIL ${name}: ${error.stack}`); process.exitCode = 1;}
}
function fixture() {
  const state = {s: 0, lateral: 0, speedMph: 0, headingError: 0,
    mode: 'wasteland', status: 'racing', opponents: [], traffic: [],
    combat: {serial: 0, projectiles: [], rocketVolleys: []}};
  const course = {groundAt(s, lateral = 0) {
    return {x: lateral, y: 0, z: s, heading: 0};
  }, nearest(x, z) {return {s: z, lateral: x};},
  obstaclesNear() {return [];}};
  const events = [];
  const duel = {state, course, events, seed: 123, emit(e) {events.push(e);},
    _vehicleSpec() {return {halfWidth: 1, halfLength: 2, height: 1.7};},
    _obstacles() {return [];}};
  return {duel, state, events};
}
function advance(duel, seconds) {
  for (let i = 0; i < Math.round(seconds / DT); i++)
    stepRocketVolleys(duel, DT);
}
check('one trigger launches a four-shot, three-degree fixed fan', () => {
  const {duel, state, events} = fixture();
  const volley = startRocketVolley(duel, state);
  assert.ok(volley);
  assert.equal(state.combat.projectiles.length, 1);
  advance(duel, .375);
  assert.equal(state.combat.projectiles.length, 4);
  assert.deepEqual(state.combat.projectiles.map(shot =>
    Math.round(Math.atan2(shot.vx, shot.vz) * 180 / Math.PI * 10) / 10),
  [-1.5, -.5, .5, 1.5]);
  assert.deepEqual(state.combat.projectiles.map(shot =>
    Math.round(shot.launchedAt * 100) / 100), [0, .12, .24, .36]);
  assert.equal(events.filter(event => event.arsenalCue === 'weapon.rockets.fire').length, 4);
  assert.equal(events.filter(event => event.arsenalCue === 'weapon.rockets.flight').length, 4);
});
check('too little projectile room rejects the whole volley', () => {
  const {duel, state} = fixture();
  state.combat.projectiles = Array.from({length: 38}, () => ({kind: 'existing'}));
  assert.equal(startRocketVolley(duel, state), null);
  assert.equal(state.combat.rocketVolleys.length, 0);
  assert.equal(state.combat.serial, 0);
});
check('rocket travels 80 m/s, stops at 120 m, and never steers', () => {
  const {duel, state} = fixture();
  const shot = startRocketVolley(duel, state) && state.combat.projectiles[0];
  const vx = shot.vx, vz = shot.vz, oldZ = shot.z;
  assert.equal(stepRocketPod(duel, shot, DT), true);
  assert.ok(Math.abs(shot.z - oldZ - vz * DT) < EPS);
  assert.equal(shot.vx, vx);
  for (let i = 1; i < 180; i++) stepRocketPod(duel, shot, DT);
  assert.ok(Math.abs(shot.travelled - 120) < EPS);
  assert.equal(stepRocketPod(duel, shot, DT), false);
});
check('two-metre blast gives 10 armor per unshielded car, once', () => {
  const {duel, state} = fixture();
  const primary = {s: 20, lateral: 0, armor: 100, speedMph: 0};
  const nearby = {s: 21, lateral: 1.2, armor: 100, speedMph: 0};
  const distant = {s: 25, lateral: 0, armor: 100, speedMph: 0};
  state.opponents.push(primary, nearby, distant);
  const shot = startRocketVolley(duel, state) && state.combat.projectiles[0];
  shot.vx = 0; shot.vz = 80;
  const damageCar = (_d, actor, amount) => {actor.armor -= amount; return amount;};
  let live = true;
  for (let i = 0; i < 40 && live; i++)
    live = stepRocketPod(duel, shot, DT, {damageCar, shielded: () => false});
  assert.equal(live, false);
  assert.equal(primary.armor, 90);
  assert.equal(nearby.armor, 90);
  assert.equal(distant.armor, 100);
  assert.equal(duel.events.filter(event => event.arsenalCue === 'weapon.rockets.hit').length, 1);
});
check('a shield blocks the blast; no target is damaged twice', () => {
  const {duel, state} = fixture();
  const primary = {s: 20, lateral: 0, armor: 100, speedMph: 0};
  state.opponents.push(primary);
  const shot = startRocketVolley(duel, state) && state.combat.projectiles[0];
  shot.vx = 0; shot.vz = 80;
  let hits = 0;
  for (let i = 0; i < 40; i++) stepRocketPod(duel, shot, DT,
    {shielded: () => true, damageCar: () => {hits++; return 10;}});
  assert.equal(hits, 0); assert.equal(primary.armor, 100);
});
check('CPU requires 20-100 m ahead and a three-degree aim', () => {
  assert.equal(rocketCpuAim(20, 0), true);
  assert.equal(rocketCpuAim(100, 3 * Math.PI / 180), true);
  assert.equal(rocketCpuAim(19.9, 0), false);
  assert.equal(rocketCpuAim(100.1, 0), false);
  assert.equal(rocketCpuAim(50, 3.1 * Math.PI / 180), false);
});

check('flame cone reaches 9 m and 15 degrees on either side', () => {
  assert.equal(flameCpuAim(8.9, 14.9 * Math.PI / 180), true);
  assert.equal(flameCpuAim(9.1, 0), false);
  assert.equal(flameCpuAim(8, 15.1 * Math.PI / 180), false);
});
check('three-second flame gives 8 armor per second, then 1.5-second burn gives 4', () => {
  const {duel, state, events} = fixture();
  const target = {s: 6, lateral: 0, armor: 100, speedMph: 0};
  state.opponents.push(target);
  const damageCar = (_d, actor, amount) => {actor.armor -= amount; return amount;};
  assert.ok(startFlamethrower(duel, state));
  for (let i = 0; i < 3 / DT; i++) stepFlamethrowers(duel, DT,
    {damageCar, shielded: () => false});
  assert.ok(Math.abs(target.armor - 76) < EPS);
  for (let i = 0; i < 1.5 / DT; i++) stepFlamethrowers(duel, DT,
    {damageCar, shielded: () => false});
  assert.ok(Math.abs(target.armor - 70) < EPS);
  stepFlamethrowers(duel, DT, {damageCar, shielded: () => false});
  assert.ok(Math.abs(target.armor - 70) < EPS);
  assert.equal(events.filter(e => e.arsenalCue === 'weapon.flame.start').length, 1);
  assert.equal(events.filter(e => e.arsenalCue === 'weapon.flame.loop').length, 1);
  assert.equal(events.filter(e => e.arsenalCue === 'weapon.flame.end').length, 1);
});
check('leaving the cone starts one burn, and re-entry refreshes rather than stacks', () => {
  const {duel, state} = fixture();
  const target = {s: 6, lateral: 0, armor: 100, speedMph: 0};
  state.opponents.push(target);
  const damageCar = (_d, actor, amount) => {actor.armor -= amount; return amount;};
  startFlamethrower(duel, state);
  stepFlamethrowers(duel, DT, {damageCar, shielded: () => false});
  target.lateral = 20;
  for (let i = 0; i < .5 / DT; i++) stepFlamethrowers(duel, DT,
    {damageCar, shielded: () => false});
  target.lateral = 0;
  stepFlamethrowers(duel, DT, {damageCar, shielded: () => false});
  target.lateral = 20;
  for (let i = 0; i < 1.5 / DT; i++) stepFlamethrowers(duel, DT,
    {damageCar, shielded: () => false});
  const after = target.armor;
  for (let i = 0; i < 1 / DT; i++) stepFlamethrowers(duel, DT,
    {damageCar, shielded: () => false});
  assert.ok(Math.abs(target.armor - after) < EPS);
  assert.ok(Math.abs(target.armor - (100 - 2 * 8 * DT - 2 - 6)) < 1e-6);
});
check('shield blocks cone and afterburn damage', () => {
  const {duel, state} = fixture();
  const target = {s: 6, lateral: 0, armor: 100, speedMph: 0};
  state.opponents.push(target);
  startFlamethrower(duel, state);
  const damageCar = () => {throw Error('shielded car was damaged');};
  for (let i = 0; i < 4.5 / DT; i++) stepFlamethrowers(duel, DT,
    {damageCar, shielded: () => true});
  assert.equal(target.armor, 100);
});

check('magnet pulls a pickup at 12 m/s inside 40 m without granting it', () => {
  const {duel, state, events} = fixture();
  const crate = {id: 'one', s: 30, lateral: 0, kind: 'armor'};
  const outside = {id: 'far', s: 41, lateral: 0, kind: 'armor'};
  state.combat.pickups = [crate, outside];
  state.combat.magnets = [];
  assert.ok(startScrapMagnet(duel, state));
  for (let i = 0; i < .5 / DT; i++) stepScrapMagnets(duel, DT);
  assert.ok(Math.abs(crate.s - 24) < EPS);
  assert.equal(outside.s, 41);
  assert.equal(state.combat.pickups.length, 2,
    'native collection must own removal and reward');
  assert.equal(events.filter(e => e.arsenalCue === 'weapon.magnet.hum').length, 1);
});
check('magnet lasts six seconds and an explicit Tesla stop ends it', () => {
  const {duel, state} = fixture();
  state.combat.pickups = [{id: 'one', s: 30, lateral: 0, kind: 'armor'}];
  startScrapMagnet(duel, state);
  for (let i = 0; i < 6 / DT; i++) stepScrapMagnets(duel, DT);
  assert.equal(state.combat.magnets.length, 0);
  startScrapMagnet(duel, state);
  assert.equal(endScrapMagnet(duel, state, 'tesla'), true);
  assert.equal(state.combat.magnets.length, 0);
  assert.equal(endScrapMagnet(duel, state, 'tesla'), false);
});
check('CPU needs two eligible crates within 40 m', () => {
  const {duel, state} = fixture();
  state.combat.pickups = [{s: 20, lateral: 0, kind: 'armor'}];
  assert.equal(shouldUseScrapMagnet(duel, state), false);
  state.combat.pickups.push({s: 39, lateral: 0, kind: 'weapon'});
  assert.equal(shouldUseScrapMagnet(duel, state), true);
  state.combat.pickups[1].s = 40.1;
  assert.equal(shouldUseScrapMagnet(duel, state), false);
});
check('magnet fixed-step outcome matches at 30, 60 and 144 FPS', () => {
  function run(fps) {
    const {duel, state} = fixture();
    state.combat.pickups = [{id: 'one', s: 30, lateral: 2, kind: 'armor'}];
    startScrapMagnet(duel, state);
    let remainder = 0;
    for (let frame = 0; frame < fps * 2; frame++) {
      remainder += 1 / fps;
      while (remainder + EPS >= DT) {
        remainder = Math.max(0, remainder - DT);
        stepScrapMagnets(duel, DT);
      }
    }
    return {crate: state.combat.pickups[0], magnets: state.combat.magnets,
      events: duel.events};
  }
  assert.deepEqual(run(30), run(60));
  assert.deepEqual(run(30), run(144));
});
check('active weapons keep serializable simulation state', () => {
  const {duel, state} = fixture();
  state.combat.pickups = [];
  startRocketVolley(duel, state);
  startFlamethrower(duel, state);
  startScrapMagnet(duel, state);
  assert.doesNotThrow(() => JSON.stringify(state.combat));
});

function nativeRace() {
  const flags = createFeatureFlags({storage: null, qa: true,
    catalog: {...FEATURE_STATES, arsenal: 'dev'},
    overrides: {arsenal: true}});
  const duel = new Duel({seed: 202602, featureFlags: flags});
  duel.startCampaign({mode: 'wasteland', car: 'falcone_f42',
    driverId: 'club', crewId: 'rook', discoveredGate: true,
    arsenalRank: 30, opponentCount: 1, seed: 202602, cpuDifficulty: 'easy'});
  const state = duel.state, rival = state.opponents[0];
  Object.assign(state, {status: 'racing', countdown: 0, invulnerableSec: 0,
    s: 500, prevS: 500, lateral: 0, prevLateral: 0, speedMph: 0, traffic: []});
  Object.assign(rival, {s: 540, prevS: 540, lateral: 0, prevLateral: 0,
    speedMph: 0, armor: 100, maxArmor: 100, combatShield: 0});
  state.combat.aiTimer = state.combat.pickupTimer = Infinity;
  return {duel, state, rival};
}
check('native armor receives a Rocket Pods blast through production damage', () => {
  const {duel, state, rival} = nativeRace();
  rival.s = 520;
  const shot = startRocketVolley(duel, state) && state.combat.projectiles[0];
  const at = duel.course.groundAt(rival.s, rival.lateral);
  const dx = at.x - shot.x, dz = at.z - shot.z, length = Math.hypot(dx, dz);
  shot.y = at.y + 1; shot.vx = dx / length * 80; shot.vz = dz / length * 80;
  for (let i = 0; i < 90 && !shot.dead; i++) stepRocketPod(duel, shot, DT);
  assert.equal(shot.dead, true);
  assert.ok(Math.abs(rival.armor - 90) < EPS);
});
check('native armor receives 8/s in the flame cone, then the single burn', () => {
  const {duel, state, rival} = nativeRace();
  rival.s = 506;
  startFlamethrower(duel, state);
  for (let i = 0; i < 4.5 / DT; i++) stepFlamethrowers(duel, DT);
  assert.ok(Math.abs(rival.armor - 70) < 1e-5);
});
check('magnet moves a native armor crate; native pickup step grants the reward', () => {
  const {duel, state} = nativeRace();
  state.armor = state.maxArmor - 30;
  const crate = {id: 'magnet-native', lap: 0, s: 530,
    lateral: 0, kind: 'armor', age: 0};
  state.combat.seededPickupPlan = [];
  state.combat.pickups = [crate];
  startScrapMagnet(duel, state);
  for (let i = 0; i < 3 / DT; i++) stepScrapMagnets(duel, DT);
  assert.equal(state.armor, state.maxArmor - 30,
    'magnet itself does not grant armor');
  stepPickups(duel, DT);
  assert.equal(state.combat.pickups.length, 0);
  assert.ok(state.armor > state.maxArmor - 30);
});
if (!process.exitCode) console.log('Arsenal wave 2 checks: ' + checks + ' passed.');
