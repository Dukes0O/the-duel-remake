// Focused checks for ember loss, scooping, pay, and deterministic driving.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Duel} from '../src/game.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {LAND} from '../src/world/scablands-names.js';
import {EMBER_RULE, emberLoss, emberGrade, emberPay, emberSentence, MPH_TO_KMH} from '../src/world/jobs/ember-rule.js';
import {stepCarry} from '../src/world/jobs/steps/carry.js';
import {EAST_ROAD, distanceToRoad, onRoadPoints, onScablandsRoad} from '../src/world/scablands-road.js';
import {RIVER_LAND, scablandsDriveAt} from '../src/world/scablands-regions.js';
import {SCABLANDS_SOLIDS} from '../src/world/scablands-solids.js';
import {arenaReward} from '../src/arena/arena-settlement.js';
import '../src/story/ember-lines.js';
import {worldHudModel} from '../src/world/world-hud.js';
import {createEmberPot} from '../src/world/ember-pot.js';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const DT = 1 / 120;
const flags = {'hidden-road': true, arsenal: true, 'arsenal-wave3': true};
const hot = EVERBURN_JOBS[0], carry = hot.steps[0];
const tinTown = carry.destination.position;
// ---- the road question: points in, answer out ----------------------------------------------------------------------------------------
{
  const line = {halfWidth: 5, points: [{x: 0, z: 0}, {x: 100, z: 0}, {x: 100, z: 100}]};
  check(onRoadPoints(50, 4, line) && !onRoadPoints(50, 6, line), 'a point is on a road within its half width of the line');
  check(onRoadPoints(103, 60, line) && !onRoadPoints(110, 60, line), 'the road bends where its points bend');
  check(Math.abs(distanceToRoad(200, 0, line.points) - 100) < 1e-9, 'distance is to the nearest end of the last stretch');
  const moved = {halfWidth: 5, points: line.points.map(point => ({x: point.x + 1000, z: point.z - 500}))};
  check(onRoadPoints(1050, -496, moved) && !onRoadPoints(50, 4, moved), 'moving the points moves the road: nothing assumes the land');
  const camp = LAND.at('safe-road');
  check(onScablandsRoad(EAST_ROAD.points[1].x, EAST_ROAD.points[1].z) && onScablandsRoad(camp.x, camp.z) && !onScablandsRoad(0, 0), 'the start of the East Road and the halfway camp are road; the yard itself is not');
  check(!onScablandsRoad(3000, 0) && !onScablandsRoad(1500, 0), 'the scab field straight across is not road');
  // The ember reads the ground's own safe speed in place of a road yes or no.
  check(scablandsDriveAt(camp.x, camp.z).safeKmh === Infinity && scablandsDriveAt(300, 0).safeKmh === 90 && scablandsDriveAt(2000, 0).safeKmh === 50, 'the ground says the speed it is safe at: any on the road, 90 on the flats, 50 on the scab plates');
}

// ---- driving a real Duel ---------------------------------------------------------------------------------------------------------------
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
function start({seed = 1, difficulty = 'medium'} = {}) {
  const duel = new Duel({seed, featureFlags: flags});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: 'falcone_f42', seed, cpuDifficulty: difficulty, opponents: [], job: {...hot, seed}}), true);
  duel.state.countdown = 0;
  // These focused driving checks begin with the pot already collected.
  duel.state.arena.worldJob.job.stepState = {loaded: true, ember: 100};
  return duel;
}
const carAt = duel => duel.course.groundAt(duel.state.s, duel.state.lateral);
const kmhOf = duel => Math.abs(duel.state.speedMph || 0) * MPH_TO_KMH;
const held = duel => duel.state.arena.worldJob.job.stepState;
// One tick of a child's driver: steer at `target`, hold `kmh`.
function drive(duel, target, kmh) {
  const car = carAt(duel), state = duel.state, speed = kmhOf(duel);
  const turn = wrap(Math.atan2(target.x - car.x, target.z - car.z) - (car.heading + (state.headingError || 0)));
  duel.setInput({throttle: speed < kmh ? 1 : 0, brake: speed > kmh + 4 ? 1 : 0, steer: Math.max(-1, Math.min(1, -turn * 2)), boost: false, interact: false});
}
// Puts the car on a point facing a point, at a speed (the same way a job puts its car at its start).
function place(duel, at, toward, kmh = 0) {
  const state = duel.state, pose = duel.course.nearest(at.x, at.z);
  state.s = state.prevS = pose.s; state.lateral = state.prevLateral = pose.lateral;
  state.headingError = wrap(Math.atan2(toward.x - at.x, toward.z - at.z) - duel.course.at(pose.s).heading);
  state.speedMph = kmh / MPH_TO_KMH; state.yawVelocity = 0; state.pushVelocity = 0;
  duel.state.arena.worldJob.lastKmh = kmh;
}
function run(duel, route, kmh, {seconds = 200, until = () => false, onTick = () => {}} = {}) {
  let leg = 0, firstOut = null, outCount = 0, wasOut = false, trace = [];
  for (let tick = 0; tick < seconds / DT && duel.state.status !== 'arena_result'; tick++) {
    const car = carAt(duel);
    if (leg < route.length - 1 && Math.hypot(route[leg].x - car.x, route[leg].z - car.z) < 25) leg++;
    drive(duel, route[leg], typeof kmh === 'function' ? kmh(duel, car) : kmh);
    duel.step(DT);
    const step = held(duel), out = step.out === true;
    if (out && !wasOut) { outCount++; firstOut ??= duel.state.stageTimeSec; }
    wasOut = out;
    if (tick % 120 === 0) trace.push(+(step.ember ?? 0).toFixed(3));
    onTick(duel, tick);
    if (until(duel)) break;
  }
  const worldJob = duel.state.arena.worldJob;
  return {duel, worldJob, firstOut, outCount, trace, done: duel.state.status === 'arena_result', result: worldJob.emberResult ?? null};
}
const field = [{x: tinTown.x, z: tinTown.z}];
// Delivery and straight-across drives are covered by test-everburn-job1.mjs.
// (d) a hard hit takes a large share at once; a light touch takes nothing. The rule alone, then a real hit on a real solid.
{
  const view = (hitKmh, extra = {}) => ({player: {position: {x: 300, z: 300}}, speedKmh: 0, hitKmh, safeKmh: Infinity, difficulty: 'medium', ...extra});
  const quiet = stepCarry(carry, {loaded: true}, view(0), DT).state.ember, touched = stepCarry(carry, {loaded: true}, view(7), DT).state.ember, hard = stepCarry(carry, {loaded: true}, view(40), DT).state.ember;
  check(Math.abs(touched - quiet) < 1e-9, 'a touch that sheds 7 km/h takes nothing');
  check(Math.abs(quiet - hard - 15) < 1e-9, 'an ordinary hit that sheds 40 km/h takes at most 15');
  // Real: drive at a Boneyard wreck (a solid) at 100 km/h from 89 m off. SCABLANDS-LAND round 4, slice 2b: the junk cars of the old oval are gone, and a solid is hit now.
  const wreck = SCABLANDS_SOLIDS.find(solid => solid.id === 'boneyard-wreck-south'), duel = start(), junk = {x: wreck.x, z: wreck.z};
  place(duel, {x: wreck.x - wreck.halfX - 89, z: wreck.z}, junk, 100);
  let before = null, drop = 0, jolts = 0;
  run(duel, [junk], 100, {seconds: 6, onTick: d => {
    const step = held(d);
    if (Number.isFinite(before) && Number.isFinite(step.ember)) drop = Math.max(drop, before - step.ember);
    before = step.ember; jolts = step.joltCount ?? 0;
  }, until: d => (held(d).joltCount ?? 0) > 0});
  check(jolts > 0 && Math.abs(held(duel).jolt - 15) < 1e-9, `a real wreck hit takes exactly 15 from the pot (jolt ${held(duel).jolt}, total drop ${drop.toFixed(3)})`);
  const severe = stepCarry(carry, {loaded: true}, view(100, {severeHit: true}), DT);
  check(severe.state.jolt === 40, 'a severe fall or dead-stop crash can take 40');
}
// Drive off the river bank and measure the actual landing and pot loss.
{
  const points = RIVER_LAND.line.points, i = Math.floor(points.length * .2);
  const a = points[i], b = points[i + 3], length = Math.hypot(b.x - a.x, b.z - a.z);
  const normal = {x:(b.z - a.z) / length, z:-(b.x - a.x) / length};
  const startPoint = {x:a.x + normal.x * 260, z:a.z + normal.z * 260};
  const target = {x:a.x - normal.x * 300, z:a.z - normal.z * 300};
  const duel = start(), hits = [], emit = duel.emit.bind(duel);
  duel.emit = event => { if (event.scablandsHit?.kind === 'fall') hits.push(event.scablandsHit); return emit(event); };
  place(duel, startPoint, target, 200);
  run(duel, [target], 200, {seconds:8, until:() => hits.some(hit => hit.drop > 3)});
  const fall = hits.find(hit => hit.drop > 3), jolt = held(duel).jolt;
  check(!!fall && jolt > 15 && jolt <= 40, `a ${fall?.drop?.toFixed(2)} m bank fall takes ${jolt} from the pot`);
  console.log(`Bank fall: ${fall.drop.toFixed(2)} m, pot jolt ${jolt.toFixed(2)}.`);
}
// The remade job test covers going out, known braziers and delivery.
// Running out leaves the job active and asks the player to find a brazier.
{
  const view = {player: {position: carry.origin.position}, speedKmh: 10, safeKmh: Infinity, difficulty: 'medium'};
  const wentOut = stepCarry(carry, {loaded: true, ember: 0.01}, view, 1);
  check(wentOut.state.out && !wentOut.complete && wentOut.events.some(event => event.type === 'emberOut'), 'running out emits the event and leaves the job active');
  check(wentOut.requests.some(request => request.type === 'marker' && request.place.id === carry.origin.id), 'the out pot points to the known yard brazier');
  const stillOut = stepCarry(carry, wentOut.state, view, 1);
  check(!stillOut.events.some(event => event.type === 'emberOut'), 'the outage event is emitted only once');
}

// A scoop needs a stopped car for three seconds and can be taken once per brazier.
{
  const brazier = carry.braziers[1];
  const at = {position: brazier.position};
  const view = {player: at, speedKmh: 0, difficulty: 'medium', safeKmh: Infinity};
  let state = {loaded: true, ember: 0, out: true, relights: 0};
  state = stepCarry(carry, state, {...view, speedKmh: 40}, 3).state;
  check(state.out && state.ember === 0, 'driving through a brazier takes no scoop');
  state = stepCarry(carry, state, view, 2.9).state;
  check(state.out && state.ember === 0, 'stopping for less than three seconds takes no scoop');
  const scoop = stepCarry(carry, state, view, .1);
  state = scoop.state;
  check(!state.out && state.ember === 25 && state.relights === 1 && scoop.events.some(event => event.type === 'emberRelit'), 'three seconds stopped restores 25 and records a relight');
  state = stepCarry(carry, state, view, 3).state;
  check(state.ember > 25 && state.relights === 1 && state.scoopedBraziers.includes(brazier.id), 'relighting leaves the separate scoop available');
  const afterScoop = state.ember;
  state = stepCarry(carry, state, view, 3).state;
  check(state.ember < afterScoop, 'the same brazier cannot be scooped twice');
}

// (f) pay by grade, and the screen's sentence.
{
  const rule = EMBER_RULE;
  check(emberGrade(rule, 100) === 'bright' && emberGrade(rule, 70) === 'bright' && emberGrade(rule, 69.9) === 'alive' && emberGrade(rule, 30) === 'alive' && emberGrade(rule, 29.9) === 'barely', 'bright from 70, alive from 30, barely under 30');
  check(emberPay(rule, 90, 0) === 120 && emberPay(rule, 50, 0) === 80 && emberPay(rule, 10, 0) === 50, 'pay is 120, 80 or 50 by grade');
  check(emberPay(rule, 90, 1) === 80 && emberPay(rule, 50, 1) === 80 && emberPay(rule, 10, 1) === 50, 'after any relight the pay is capped at 80 (and never raised)');
  const arena = ember => ({mode: 'world-job', version: 1, venueId: 'scablands', phase: 'over', participants: [{id: 'player', kind: 'player'}], result: {placings: ['player'], winnerId: 'player', reason: 'job-complete'},
    worldJob: {definition: hot, emberResult: ember, job: {stepIndex: 1, steps: [1]}}});
  check(arenaReward(arena({pay: 120}), 'easy').total === 120 && arenaReward(arena({pay: 50}), 'easy').total === 50 && arenaReward(arena(undefined), 'easy').total === 80, 'the settlement pays the ember pay, and 80 for every other job');
  check(/bright/.test(emberSentence(rule, 90, 0)) && /alive\./.test(emberSentence(rule, 50, 0)) && /barely/.test(emberSentence(rule, 10, 0)), 'the results sentence names the grade');
}
// (g) Easy halves rough ground and hits; cold is the same.
{
  const input = {kmh: 120, lostKmh: 30, safeKmh: 50, dt: 1};
  const medium = emberLoss(EMBER_RULE, {...input, difficulty: 'medium'}), easy = emberLoss(EMBER_RULE, {...input, difficulty: 'easy'});
  check(Math.abs(easy.rough * 2 - medium.rough) < 1e-9 && Math.abs(easy.hit * 2 - medium.hit) < 1e-9 && easy.cold === medium.cold, 'Easy halves rough ground and hits and leaves cold alone');
  check(Math.abs(medium.cold - 100 / 900) < 1e-9 && Math.abs(medium.rough - .003 * 70 * (120 / 3.6)) < 1e-9 && medium.hit === 15, 'cold takes 100 in fifteen minutes, rough ground takes 0.003 per metre per km/h over its safe speed, and a hit is capped at 15');
  const severe = emberLoss(EMBER_RULE, {...input, lostKmh: 100, severeHit: true, difficulty: 'medium'});
  const severeEasy = emberLoss(EMBER_RULE, {...input, lostKmh: 100, severeHit: true, difficulty: 'easy'});
  check(severe.hit === 40 && severeEasy.hit === 20, 'a severe hit is capped at 40, or 20 on Easy');
  check(emberLoss(EMBER_RULE, {kmh: 200, safeKmh: Infinity, dt: 1}).rough === 0, 'a ground that is safe at any speed takes nothing at 200 km/h');
}
// (h) the same seed and inputs give the same ember, twice.
{
  const first = run(start({seed: 7}), field, 120, {seconds: 12}), second = run(start({seed: 7}), field, 120, {seconds: 12});
  check(first.trace.length > 5 && JSON.stringify(first.trace) === JSON.stringify(second.trace), 'the same seed and inputs give the same ember trace');
  check(JSON.stringify(held(first.duel)) === JSON.stringify(held(second.duel)), 'and the same step state at the end');
}
// (i) the renderer, the pot and the HUD running or not make no difference to the ember.
{
  const plain = run(start({seed: 3}), field, 120, {seconds: 14});
  const duel = start({seed: 3}), pot = createEmberPot(), car = new THREE.Group();
  car.add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 4.2), new THREE.MeshBasicMaterial()));
  const shown = run(duel, field, 120, {seconds: 14, onTick: (d, tick) => {
    const worldJob = d.state.arena.worldJob, step = worldJob.job.steps[worldJob.job.stepIndex], stepState = worldJob.job.stepState;
    worldHudModel({worldJob, player: d.course.worldAt(d.state.s, d.state.lateral)});
    pot.update(car, {ember: stepState.ember ?? 100, max: step.ember.start, out: stepState.out === true, rate: stepState.rate ?? 0, jolts: stepState.joltCount ?? 0}, tick * DT);
  }});
  check(JSON.stringify(plain.trace) === JSON.stringify(shown.trace), 'drawing the pot and building the HUD every step leaves the ember trace identical');
  const model = worldHudModel({worldJob: duel.state.arena.worldJob, player: duel.course.worldAt(duel.state.s, duel.state.lateral)});
  check(model.ember && Number.isFinite(model.ember.value) && model.ember.max === 100, 'the HUD model carries the ember');
  pot.dispose();
}

console.log(`PASS ember pot: ${checks} checks`);
