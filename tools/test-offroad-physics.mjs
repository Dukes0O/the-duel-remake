import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { Duel } from '../src/game.js';
import { CARS, COURSE, LIVES, DRIVE } from '../src/config.js';
import { offroadCapability, rockSupportHeight } from '../src/offroad-physics.js';
import { sampleMountainSupport } from '../src/mountain-support.js';
import { sweepObstacle } from '../src/collision.js';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const same = (value, expected, message) => { assert.deepEqual(value, expected, message); checks++; };
const dt = 1 / 120, practice = COURSE.findIndex(def => def.practice);
function game(car = 'titan_monster', stage = practice) {
  const d = new Duel({ seed: 1989 }); d.startCampaign({ car, startStage: stage, difficulty: 'casual', mode: 'timetrial' });
  d.state.status = 'racing'; return d;
}
function straight(car = 'titan_monster', height = () => 0) {
  const d = game(car), point = (s, lateral = 0) => ({ x: lateral, y: height(s, lateral), z: s, heading: 0, curvature: 0 });
  d.course = { def: { id: 'offroad-test', practice: true, kind: 'arena', theme: 'desert' }, closed: false, length: 10000, raceLength: 20000,
    features: { obstacles: [], mountains: [], ramps: [], crushables: [], shortcuts: [], flocks: [] },
    at: point, worldAt: point, groundAt: point, nearest: (x, z) => ({ s: z, lateral: x }), phase: s => s,
    surfaceAt: (_, lateral) => ({ mainRoad: Math.abs(lateral) <= 7, road: Math.abs(lateral) <= 7, roadHalfWidth: 7 }),
    themeAt: () => 'desert', roadHalfWidthAt: () => 7, nearestRadar: () => null, obstaclesNear: () => d.course.features.obstacles };
  d._obstacleArray = d.course.features.obstacles; d._obstacleQueryCache.clear(); d._lapGates = [];
  Object.assign(d.state, { s: 20, prevS: 20, lateral: 30, prevLateral: 30 }); return d;
}
function drive(d, seconds, input = { throttle: 1 }) {
  d.setInput(input); for (let i = 0; i < Math.round(seconds / dt); i++) d.step(dt);
}

same(offroadCapability(CARS.falcone_f42), null, 'ordinary road cars do not inherit the special climbing capability');
check(offroadCapability(CARS.titan_monster).climbGain > offroadCapability(CARS.dusthawk_rally).climbGain, 'monster climbs farther than rally');
for (const car of ['titan_monster', 'dusthawk_rally']) for (let stage = 0; stage < COURSE.length; stage++) {
  const d = game(car, stage), s = d.state;
  for (const lateral of [-500, -100, 100, 500]) {
    Object.assign(s, { s: d.course.length * .42, lateral, boundaryWarning: false });
    const before = [s.s, s.lateral, s.lives, s.boundaryResets]; d._boundary(s);
    same([s.s, s.lateral, s.lives, s.boundaryResets, s.boundaryWarning], [...before, false], `${car}/${COURSE[stage].id}: no arbitrary off-road warning/reset`);
  }
}
{
  const d = game('falcone_f42', 0); d.state.lateral = 100; d._boundary(d.state);
  same(d.state.boundaryResets, 1, 'road cars retain the original race boundary rule');
}
for (const car of ['falcone_f42', 'titan_monster', 'dusthawk_rally']) {
  const d = straight(car); Object.assign(d.state, { speedMph: 25, headingError: Math.PI });
  drive(d, .5, { throttle: 0 }); check(d.state.s < 20, `${car}: practice allows a true turn around with forward gear`);
  check(Math.abs(d.state.headingError) > 3, `${car}: freestyle heading is not clamped to the road`);
  const r = straight(car); drive(r, 2, { brake: 1 }); check(r.state.speedMph < 0 && r.state.s < 20, `${car}: reverse also works off-road`);
}
for (const car of ['titan_monster', 'dusthawk_rally']) {
  const d = straight(car); d.course.def.practice = false;
  Object.assign(d.state, { lateral: 0, prevLateral: 0, speedMph: 25, headingError: Math.PI });
  drive(d, .5, { throttle: 0 }); check(d.state.s < 20 && Math.abs(d.state.headingError) > 3, `${car}: returning to the main road backward-facing cannot trap/clamp the heading`);
}
for (const car of ['titan_monster', 'dusthawk_rally']) {
  const d = straight(car, s => Math.max(0, s - 25) * .7), s = d.state; let previousY = 0, peak = 0;
  d.setInput({ throttle: 1 });
  for (let i = 0; i < 600 && !s.tumble; i++) {
    d.step(dt); const y = d._supportAt(s.s, s.lateral).y;
    check(y - previousY <= offroadCapability(CARS[car]).risePerSec * dt + 1e-8, `${car}: actual ground rise is bounded each physics step`);
    previousY = y; peak = Math.max(peak, y);
  }
  check(peak > 3, `${car}: can drive up a real 70% slope`);
  check(peak <= offroadCapability(CARS[car]).climbGain + .1, `${car}: cannot gain unlimited elevation on one steep climb`);
  check(!!s.tumble, `${car}: exhausting the actual elevation budget causes a backward tumble`);
  const frozen = [s.tumble.elapsed, s.terrainPitch, s.terrainRoll, s.s]; s.paused = true; drive(d, 1); same([s.tumble.elapsed, s.terrainPitch, s.terrainRoll, s.s], frozen, 'pause freezes tumble motion');
  s.paused = false; drive(d, 2.3, { throttle: 0 });
  check(!s.tumble && s.impactTimer === 0 && Number.isFinite(s.groundHeight), 'tumble recovers to a finite grounded pose');
  same([s.lives, s.penaltySec, s.score, s.status], [LIVES.start, 0, 0, 'racing'], 'practice recovery is infinite and cannot mint score');
}
{
  const d = straight('titan_monster', s => Math.max(0, s - 25) * 3); drive(d, 1.5);
  check(d.state.rollovers > 0, 'a near-vertical face tips the truck instead of teleporting it uphill');
  const crawl = straight('titan_monster', s => Math.max(0, s - 25) * 3);
  Object.assign(crawl.state, { s: 25, prevS: 25, speedMph: 1 }); drive(crawl, .1, { throttle: 0 });
  same(crawl.state.rollovers, 1, 'creeping below2mph cannot bypass the hard grade/elevation limit');
}
{
  const d = straight('titan_monster', s => s * .7), s = d.state;
  Object.assign(s, { _climbGain: 20, headingError: Math.PI / 2, speedMph: 20 }); d._terrainPose();
  drive(d, 1.2, { throttle: 0 });
  check(s._climbGain >= 20, 'driving sideways on a steep face cannot erase the actual climb budget');
}
{
  const d = straight(), s = d.state; Object.assign(s, { s: 30, prevS: 30, speedMph: 20 });
  d.course.features.obstacles.push({ ...d.course.groundAt(24, 30), id: 'downhill-wall', kind: 'building', s: 24, off: 30, halfX: 5, halfZ: .5, height: 10 });
  d._startTumble('climb_limit');
  for (let i = 0; i < 250; i++) { d._rollover(dt); check(s.s >= 27.1 - 1e-6, 'backward tumble stops at a downhill wall instead of rolling through it'); }
}
{
  const d = straight('titan_monster', s => Math.max(0, 25 - s) * 3), s = d.state;
  Object.assign(s, { s: 30, prevS: 30, speedMph: -22, gear: -1 }); d.setInput({ brake: 1 });
  for (let i = 0; i < 240 && !s.tumble; i++) d.step(dt);
  check(s.tumble?.travelSign === -1, 'backing into an unclimbable slope records reverse travel');
  const start = s.s, initialPitch = s.terrainPitch; drive(d, .5, { throttle: 0, brake: 0 });
  check(s.s > start && s.terrainPitch < initialPitch, 'reverse uphill impact tumbles down the approach, not farther into the hill');
}
function rock(d, height, center = 45) {
  const obstacle = { ...d.course.groundAt(center, 30), id: 'test-rock', kind: 'rock', s: center, off: 30, heading: 0, halfX: 2, halfZ: 3, height, shape: 'ellipse' };
  d.course.features.obstacles.push(obstacle); return obstacle;
}
for (const car of ['titan_monster', 'dusthawk_rally']) {
  const d = straight(car); rock(d, .65); let peak = 0; d.setInput({ throttle: 1 });
  for (let i = 0; i < 360; i++) { d.step(dt); peak = Math.max(peak, d.state.groundHeight || 0); }
  check(peak > .45 && d.state.s > 50, `${car}: real driving climbs a small rock and continues`);
  same(d.state.stageCrashes, 0, 'a small rock is support, not a hidden solid crash');
}
{
  const d = straight(); rock(d, 4.8); drive(d, 2);
  same(d.state.rollovers, 1, 'oversized rock can tip Titan');
  const ordinary = straight('falcone_f42'); rock(ordinary, .65); drive(ordinary, 2);
  check(ordinary.state.stageCrashes > 0, 'ordinary car still hits the same small rock');
}
// Visible boulders use a unit DodecahedronGeometry. The conservative tire
// support envelope must enclose every actual top vertex, not an assumed box.
{
  const geometry = new THREE.DodecahedronGeometry(1, 1), p = geometry.attributes.position;
  for (const car of ['titan_monster', 'dusthawk_rally']) for (const [rx, rz, height] of [[1.3, 1.2, .65], [2, 3, 1], [4, 2, .8]]) {
    const obstacle = { kind: 'rock', x: 8, z: 13, y: 2, halfX: rx, halfZ: rz, height, heading: .7 };
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) * rx, z = p.getZ(i) * rz;
      const worldX = 8 + x * Math.cos(.7) + z * Math.sin(.7), worldZ = 13 - x * Math.sin(.7) + z * Math.cos(.7);
      const top = 2 + .1 + p.getY(i) * height;
      check(rockSupportHeight(obstacle, worldX, worldZ, offroadCapability(CARS[car])) >= top - 1e-7, 'small-rock tire envelope clears the actual rendered top vertices');
    }
  }
  geometry.dispose();
}
// Actual quarry mountain geometry and the authored 44 m hill. Only the initial
// approach pose is arranged; acceleration and climbing use ordinary inputs.
for (const car of ['titan_monster', 'dusthawk_rally']) for (const kind of ['mountain', 'summit']) {
  const d = game(car), s = d.state, c = d.course;
  const feature = kind === 'mountain' ? c.features.mountains[0] : c.features.practiceMounds.find(mound => mound.id === 'summit-climb');
  const point = c.nearest(feature.x - Math.sin(feature.heading) * (feature.halfZ + 12), feature.z - Math.cos(feature.heading) * (feature.halfZ + 12), feature.s);
  Object.assign(s, { s: point.s, prevS: point.s, lateral: point.lateral, prevLateral: point.lateral,
    headingError: Math.atan2(Math.sin(feature.heading - c.at(point.s).heading), Math.cos(feature.heading - c.at(point.s).heading)) });
  d.setInput({ throttle: 1 }); let peak = 0, previous = d._supportAt(s.s, s.lateral).y;
  const initialHeight = previous;
  for (let i = 0; i < 1800 && !s.tumble; i++) {
    d.step(dt); const actual = d._supportAt(s.s, s.lateral).y, bottom = actual + s.airHeight;
    // A falling truck may pass above a faster-rising surface without gaining
    // that height itself. Measure the physical tire plane, not the hill below.
    check(bottom - previous <= offroadCapability(CARS[car]).risePerSec * dt + 1e-6, `${car}/${kind}: actual vehicle rise remains bounded`);
    previous = bottom; peak = Math.max(peak, actual);
  }
  check(peak > 3, `${car}/${kind}: vehicle really climbs the visible surface`);
  check(peak - initialHeight <= offroadCapability(CARS[car]).climbGain + .1, `${car}/${kind}: actual ascent cannot exceed the climb budget`);
  if (kind === 'summit') check(s.tumble?.reason === 'climb_limit', `${car}: the44m summit requires a limit rollover`);
  else check(!s.tumble || s.tumble.reason === 'climb_limit', 'a broad quarry massif can be traversed or meet a real climb limit, never cause an ordinary boundary crash');
  if (kind === 'mountain') check(sampleMountainSupport(c, feature.x, feature.z) > 10, 'practice quarry has solid rendered mountain support');
  same(s.boundaryResets, 0, 'climb limit is not an out-of-bounds reset');
}
function npc({ s = 40, prevS = s, speedMph = 0, car, dir = 1 } = {}) {
  return { s, prevS, lateral: 30, prevLateral: 30, speedMph, headingError: 0, pushVelocity: 0, dir, car, alive: true, damageZones: { front: 0, rear: 0, left: 0, right: 0 } };
}
for (const reason of ['traffic', 'rival', 'police']) {
  const d = straight(), s = d.state, target = npc({ car: 'falcone_f42' });
  Object.assign(s, { s: 39, prevS: 30, speedMph: 45 });
  d._vehicleContact(s, target, reason);
  check(target.crushed && target.crushDamage >= .65, `${reason}: Titan-initiated contact visibly crushes a lighter car`);
  same([target.speedMph, s.lives, s.stageCrashes, s.score], [0, LIVES.start, 0, 0], 'crush stops the smaller car without damaging Titan or farming points');
  const burst = s.crushBurst.serial; d._vehicleContact(s, target, reason); same(s.crushBurst.serial, burst, 'wreck cannot be crushed/rewarded every frame');
}
{
  const d = straight(), s = d.state, target = npc(); s.traffic = [target];
  d.setInput({ throttle: 1 }); let peak = 0;
  for (let i = 0; i < 500; i++) { d.step(dt); peak = Math.max(peak, s.groundHeight || 0); }
  check(target.crushed && s.s > target.s + 8, 'normal inputs crush a stopped traffic car and drive across it');
  check(peak > .7 && peak < 1.2, 'truck tires roll over the collapsed roof rather than a zero-height ghost');
  same([s.stageCrashes, s.score], [0, 0], 'crossing the visible wreck is non-damaging and non-scoring');
  d._loadStage(practice); same(d._crushedVehicles.length, 0, 'stage restart clears all stale wreck support');
}
{
  const d = straight(), s = d.state; d.course.def.practice = false; d.course.def.kind = 'circuit';
  const cruiser = { ...npc({ s: 40 }), kind: 'police', active: true, caught: false, gapU: 0 };
  s.police.pursuit = cruiser; Object.assign(s, { s: 39, prevS: 30, speedMph: 45 });
  d._police(dt); check(cruiser.crushed && !cruiser.caught && s.status === 'racing', 'a police car crushed this frame cannot issue a same-frame ticket');
}
{
  const d = straight(), s = d.state, target = npc({ s: 19, prevS: 10, speedMph: 70 });
  Object.assign(s, { s: 20, prevS: 20, speedMph: 0 }); d._vehicleContact(s, target, 'traffic');
  check(!target.crushed && s.stageCrashes === 0 && s.s === 20, 'NPC rear ram yields before Titan crush logic and cannot hurt/push player');
  const heavy = npc({ car: 'titan_monster' }); Object.assign(s, { s: 39, prevS: 30, speedMph: 45 }); d._vehicleContact(s, heavy, 'rival');
  check(!heavy.crushed, 'Titan cannot flatten an equally heavy rival Titan');
}
{
  const d = straight(), s = d.state, target = npc({ s: 12 });
  Object.assign(s, { s: 14, prevS: 20, speedMph: -22, gear: -1 }); d._vehicleContact(s, target, 'traffic');
  check(target.crushed && s.speedMph < 0, 'deliberate reverse-over crush preserves signed reverse motion');
  const stopped = straight(), front = npc({ s: 21, prevS: 30, speedMph: 70, dir: -1 });
  stopped._vehicleContact(stopped.state, front, 'head_on');
  check(!front.crushed && stopped.state.stageCrashes === 0, 'oncoming NPC ramming a stopped Titan still yields instead of causing a crush');
}
{
  const d = game(), s = d.state;
  same([s.practice, s.rival, s.police.pursuit, s.traffic.length, s.timeLimitSec, s.objective, s.parTimeSec], [true, null, null, 0, null, null, null], 'real practice has no opponents, police, deadlines or objective');
  Object.assign(s, { s: d.raceLength + 100, prevS: d.raceLength - 1, completedLaps: 2, timeLimitSec: 1, stageTimeSec: 5 });
  same([d._finishStage(), d._deadline()], [false, false], 'direct completion/deadline entry cannot finish practice');
  d._ticket(null); same(s.status, 'racing', 'practice cannot receive even a direct scripted ticket');
  for (let i = 0; i < 7; i++) { s.impactTimer = 0; d._crash('rock', 1, 200); }
  same([s.lives, s.penaltySec, s.status, s.results], [LIVES.start, 0, 'racing', null], 'seven severe practice crashes do not exhaust lives or settle rewards');
}
// Freestyle coordinates can be negative or extend beyond any nominal lap
// count. Neither the visible impact nor its recovery may wrap to race gates.
for (const car of ['titan_monster', 'dusthawk_rally', 'falcone_f42']) for (const position of [-300, 3460, 900]) {
  const d = game(car), s = d.state;
  Object.assign(s, { s: position, prevS: position, lateral: -10, prevLateral: -10, speedMph: 0, headingError: 2.4 });
  const start = d.course.worldAt(s.s, s.lateral), heading = start.heading + s.headingError;
  d._crash('building', 1, 50); let steps = 0, previous = start;
  while (s.impactTimer > 0 && steps++ < 600) {
    d.step(dt); const next = d.course.worldAt(s.s, s.lateral);
    check(Math.hypot(next.x - previous.x, next.z - previous.z) < 48.1, 'every practice crash/recovery step stays in the bounded local area'); previous = next;
  }
  check(steps < 600 && s.impactTimer === 0, 'practice crash recovery completes within its bounded simulation loop');
  check(Math.hypot(previous.x - start.x, previous.z - start.z) < 1e-7, `${car}/${position}: clear impact position is retained, not clamped to a lap gate`);
  check(Math.abs(s.s - position) < 1e-7 && Math.abs(s.lateral + 10) < 1e-7, 'unwrapped longitudinal phase and local lateral position survive recovery');
  check(Math.abs(Math.sin(d.course.at(s.s).heading + s.headingError - heading)) < 1e-9, 'practice recovery preserves the physical facing direction');
  same([s.lives, s.penaltySec, s.score, s.status, s.airDistance, s.airTime], [LIVES.start, 0, 0, 'racing', 0, 0], 'local practice recovery keeps infinite lives and clears flight without rewards');
}
{
  const d = game(), s = d.state, obstacle = d.course.features.obstacles.find(rock => rock.id === 'practice-rock-6');
  Object.assign(s, { s: obstacle.s, prevS: obstacle.s, lateral: obstacle.off, prevLateral: obstacle.off, speedMph: 0 });
  const start = d.course.worldAt(s.s, s.lateral); d._crash('rock', 1, 50); let steps = 0;
  while (s.impactTimer > 0 && steps++ < 600) d.step(dt);
  const point = d._supportAt(s.s, s.lateral);
  check(steps < 600 && Math.hypot(point.x - start.x, point.z - start.z) <= 48.1, 'real oversized-rock recovery stays local and completes');
  check(!sweepObstacle(point, point, obstacle, point.heading + s.headingError, d._vehicleSpec(s)), 'local recovery is clear of the actual oversized quarry rock');
}
{
  const d = game(), s = d.state; Object.assign(s, { s: -300, prevS: -300, lateral: -10, prevLateral: -10 });
  const other = { ...npc({ s: -300 }), lateral: -10, prevLateral: -10 }; s.traffic = [other];
  const start = d.course.worldAt(s.s, s.lateral); d._safeReset(s);
  const point = d.course.worldAt(s.s, s.lateral), footprint = d._vehicleSpec(other);
  check(Math.hypot(point.x - start.x, point.z - start.z) <= 48.1, 'occupied recovery searches only the local area');
  check(!sweepObstacle(point, point, { ...start, halfX: footprint.halfWidth, halfZ: footprint.halfLength }, point.heading + s.headingError, d._vehicleSpec(s)), 'local recovery does not place the car inside a live opponent');
}
// Same input sequence through two render schedules; both use the real 120 Hz
// physics cadence. No position/gate edits are made after each run starts.
function scheduled(fps) {
  const d = game(), hash = createHash('sha256'); let accumulator = 0, steps = 0;
  for (let frame = 0; frame < fps * 10; frame++) {
    accumulator += 1 / fps;
    while (accumulator + 1e-10 >= dt) {
      d.setInput({ throttle: 1, steer: steps > 240 && steps < 720 ? -.55 : 0 }); d.step(dt); accumulator -= dt; steps++;
      const s = d.state; hash.update(JSON.stringify([s.s, s.lateral, s.speedMph, s.groundHeight, s.terrainPitch, s.airHeight, s.airDistance, s.rollovers, s.stageCrashes]));
    }
  }
  return { hash: hash.digest('hex'), steps, s: d.state };
}
const a = scheduled(30), b = scheduled(144); same([a.hash, a.steps], [b.hash, b.steps], 'actual practice input is exactly deterministic at 30/144 render FPS');
same(a.s.boundaryResets, 0, 'real practice driving uses no out-of-bounds resets');
console.log(`Off-road physics: ${checks} checks passed (all-course freedom, actual hill/rock driving, tumble, crush responsibility, practice and 30/144 Hz).`);
