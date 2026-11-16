// EVERBURN-REMAKE, slice 1: the ember in Cinder's open pot (Hot Delivery). Headless: a real Duel driven through its own inputs.
//  (a) the road at speed arrives bright; (b) the scab field at speed puts the pot out; (c) the field at walking pace arrives alive or better;
//  (d) a hard hit takes a large share at once, a light touch takes nothing; (e) at 0 the job goes on, the marker points at the nearest
//  brazier, and stopping there refills the pot and caps the pay; (f) pay by grade; (g) Easy halves rough ground and hits;
//  (h) the same seed and inputs give the same ember; (i) the renderer, the pot and the HUD running or not make no difference.
//  Plus the road question itself, which takes its points as input.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Duel} from '../src/game.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {LAND} from '../src/world/scablands-names.js';
import {EMBER_RULE, emberLoss, emberGrade, emberPay, emberSentence, MPH_TO_KMH} from '../src/world/jobs/ember-rule.js';
import {stepCarry} from '../src/world/jobs/steps/carry.js';
import {EAST_ROAD, distanceToRoad, onRoadPoints, onScablandsRoad} from '../src/world/scablands-road.js';
import {scablandsDriveAt, DRIVE, stepsWayFor, RIVER} from '../src/world/scablands-regions.js';
import {SCABLANDS_SOLIDS} from '../src/world/scablands-solids.js';
import {arenaReward} from '../src/arena/arena-settlement.js';
import {captionRecord} from '../src/story/story-lines.js';
import '../src/story/ember-lines.js';
import {worldHudModel} from '../src/world/world-hud.js';
import {createEmberPot} from '../src/world/ember-pot.js';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
// The three drives the card sets also print what they measured, for the change note.
const report = (value, message) => { console.log('  ' + message); check(value, message); };
const DT = 1 / 120;
const flags = {'hidden-road': true, arsenal: true, 'arsenal-wave3': true};
const hot = EVERBURN_JOBS[0], carry = hot.steps[0];
const tinTown = carry.destination.position;
// SCABLANDS-LAND round 4, slice 2a: Hot Delivery follows the East Road (7.7 km); the last 47 m to the town's centre are open ground.
// A driver slows for the last 160 m, where the road ends and the town's own ground (the flats, safe to 90 km/h) begins.
const approach = (duel, car) => Math.hypot(car.x - tinTown.x, car.z - tinTown.z) < 160 ? 60 : 150;
const roadRoute = [tinTown].map(point => ({x: point.x, z: point.z}));
const roadLine = [...EAST_ROAD.points, tinTown].map(point => ({x: point.x, z: point.z}));

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
// Drives a route at a speed until the job ends or `until` says stop. Returns what happened.
// `follow` is a line of points to keep to (the way a driver keeps to a road whose legs are kilometres long): the car aims 90 m ahead of its nearest point on the line,
// not at the next corner; in the last 300 m it aims 25 m ahead, so that it goes through Tin Town's gate and not past its post (slice 2b: the gate is solid).
function aimAlong(line, car, ahead = 90) {
  let best = null;
  for (let index = 0; index + 1 < line.length; index++) {
    const a = line[index], b = line[index + 1], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    const t = Math.max(0, Math.min(length, ((car.x - a.x) * dx + (car.z - a.z) * dz) / length)), distance = Math.hypot(car.x - a.x - dx * t / length, car.z - a.z - dz * t / length);
    if (!best || distance < best.distance - 1e-9) best = {distance, index, t};
  }
  let index = best.index, left = best.t + ahead;
  while (true) {
    const a = line[index], b = line[index + 1], length = Math.hypot(b.x - a.x, b.z - a.z);
    if (left <= length || index + 2 >= line.length) { const t = Math.min(1, left / length); return {x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t}; }
    left -= length; index++;
  }
}
function run(duel, route, kmh, {seconds = 200, until = () => false, onTick = () => {}, follow = null} = {}) {
  let leg = 0, firstOut = null, outCount = 0, wasOut = false, trace = [];
  for (let tick = 0; tick < seconds / DT && duel.state.status !== 'arena_result'; tick++) {
    const car = carAt(duel);
    if (leg < route.length - 1 && Math.hypot(route[leg].x - car.x, route[leg].z - car.z) < 25) leg++;
    drive(duel, follow ? aimAlong(follow, car, Math.hypot(car.x - tinTown.x, car.z - tinTown.z) < 300 ? 25 : 90) : route[leg], typeof kmh === 'function' ? kmh(duel, car) : kmh);
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
// SCABLANDS-LAND round 4, slice 2b: the dry river's banks are solid, so the scab short cut goes over the Steps: a straight line to the near end of the
// Steps' marked way, across it, and a straight line on to the town. A car crosses the ledges at 20 km/h or less (the ember is safe there under 20),
// and holds the speed it was asked for everywhere else (the driver slows to 20 km/h within 112 m of the crossing, the ledges' own width: a car that comes down them speeds up, and must be under 25 at the foot of each climb).
const stepsWay = stepsWayFor(), lip = RIVER.rampLipHalfWidth - 6;
const nearLip = {x: stepsWay.x - stepsWay.nx * lip, z: stepsWay.z - stepsWay.nz * lip}, farLip = {x: stepsWay.x + stepsWay.nx * lip, z: stepsWay.z + stepsWay.nz * lip};
// The marked way has a post either side at each end, so the driver lines up on it 150 m out and leaves it straight on for 150 m.
const onWay = across => ({x: stepsWay.x + stepsWay.nx * across, z: stepsWay.z + stepsWay.nz * across});
const shortCut = [onWay(-150), nearLip, farLip, onWay(150), {x: tinTown.x, z: tinTown.z}];
const overSteps = kmh => (duel, car) => Math.hypot(car.x - stepsWay.x, car.z - stepsWay.z) < 112 ? Math.min(kmh, 20) : kmh;

// The three drives the card sets (SCABLANDS-LAND round 4, slice 2a), each driven in a real Duel:
//   1. a clean drive along the East Road arrives bright;
//   2. the scab short cut (the straight line across the plates) held at 50 km/h arrives alive and not bright;
//   3. a car that never passes 30 km/h goes out before Tin Town, by the short cut and by the road.
{
  const out = run(start(), roadRoute, approach, {seconds: 400, follow: roadLine});
  check(out.done && out.result, 'the East Road at 150 km/h reaches Tin Town');
  check(out.result.relights === 0 && out.result.grade === emberGrade(EMBER_RULE, out.result.ember) && out.result.pay === emberPay(EMBER_RULE, out.result.ember, 0), 'the grade and the pay are the rule for what is left');
  report(out.result.grade === 'bright', `a clean drive on the East Road arrives bright (${out.result.ember.toFixed(1)} left after ${out.duel.state.stageTimeSec.toFixed(0)} s)`);
  const taken = 100 - out.result.ember, cold = EMBER_RULE.coldPerSecond * out.duel.state.stageTimeSec;
  check(taken >= cold - 1 && taken - cold < 6, `on the road almost only cold takes ember (${taken.toFixed(1)} taken, ${cold.toFixed(1)} of it cold, in ${out.duel.state.stageTimeSec.toFixed(0)} s)`);
}
{
  // 49.5 km/h: held under the plates' safe speed of 50 with a driver that never overshoots.
  const short = run(start(), shortCut, overSteps(49.5), {seconds: 900});
  check(short.done && short.result, 'the short cut at 50 km/h reaches Tin Town');
  report(short.result.grade === 'alive', `the scab short cut held at 50 km/h arrives alive and not bright (${short.result.ember.toFixed(1)}, ${short.result.grade}, in ${short.duel.state.stageTimeSec.toFixed(0)} s)`);
  const slowShort = run(start(), shortCut, overSteps(29.9), {seconds: 800, until: duel => held(duel).out === true});
  report(slowShort.firstOut !== null && !slowShort.done && carAt(slowShort.duel).x < tinTown.x - 18, `a car that never passes 30 km/h goes out before Tin Town on the short cut (at ${Math.round(carAt(slowShort.duel).x)} m, ${slowShort.firstOut?.toFixed(0)} s)`);
  const slowRoad = run(start(), roadRoute, 29.9, {seconds: 800, follow: roadLine, until: duel => held(duel).out === true});
  report(slowRoad.firstOut !== null && !slowRoad.done, `and by the East Road, which is longer (out at ${slowRoad.firstOut?.toFixed(0)} s, ${Math.round(carAt(slowRoad.duel).x)} m)`);
}
// (b) the scab field straight across at 120 km/h puts the pot out before Tin Town.
{
  const out = run(start(), shortCut, overSteps(120), {until: duel => held(duel).out === true});
  check(out.firstOut !== null && !out.done, `the field at 120 km/h puts the pot out (at ${out.firstOut?.toFixed(1)} s) before the town`);
  check(carAt(out.duel).x < tinTown.x - 30, 'the pot is out before Tin Town');
  // Flat out is never a way to outrun the loss, on Easy either (Claude's drive, 14 November: with a loss by the second, 206 km/h on Easy arrived).
  const flat = run(start({difficulty: 'easy'}), shortCut, overSteps(205), {until: duel => held(duel).out === true});
  check(flat.firstOut !== null && !flat.done && carAt(flat.duel).x < tinTown.x - 30, `the field flat out on Easy puts the pot out before the town (at ${Math.round(carAt(flat.duel).x)} m)`);
  const fast = run(start(), shortCut, overSteps(200), {until: duel => held(duel).out === true}), slow = run(start(), shortCut, overSteps(100), {until: duel => held(duel).out === true});
  check(carAt(fast.duel).x < carAt(slow.duel).x, `faster over rock gets less far before the pot is out (${Math.round(carAt(fast.duel).x)} m at 200 km/h, ${Math.round(carAt(slow.duel).x)} m at 100)`);
}
// (c) the field at 45 km/h takes nothing from the rock: it is safe up to 50. SCABLANDS-LAND round 4 (re-recorded): Tin Town is 6 km across the field,
// so at 45 km/h only the cold takes ember, and it is still full of it after 100 seconds and not yet out; on the first land the same drive arrived.
{
  const out = run(start(), field, 45, {seconds: 100});
  check(out.outCount === 0 && !out.done, 'the field at 45 km/h does not put the pot out in the first 100 seconds');
  check(Math.abs(held(out.duel).ember - (100 - EMBER_RULE.coldPerSecond * 100)) < 1.5, `and rock takes nothing, only cold (${held(out.duel).ember.toFixed(1)} left after 100 s)`);
}
// (d) a hard hit takes a large share at once; a light touch takes nothing. The rule alone, then a real hit on a real solid.
{
  const view = (hitKmh, extra = {}) => ({player: {position: {x: 300, z: 300}}, speedKmh: 0, hitKmh, safeKmh: Infinity, difficulty: 'medium', ...extra});
  const quiet = stepCarry(carry, {}, view(0), DT).state.ember, touched = stepCarry(carry, {}, view(7), DT).state.ember, hard = stepCarry(carry, {}, view(40), DT).state.ember;
  check(Math.abs(touched - quiet) < 1e-9, 'a touch that sheds 7 km/h takes nothing');
  check(quiet - hard >= 50, `a hit that sheds 40 km/h takes a large share at once (${(quiet - hard).toFixed(1)})`);
  check(Math.abs((100 - 1.5 * 40) - hard) < .1, 'a hit takes 1.5 for each km/h shed');
  // Real: drive at a Boneyard wreck (a solid) at 100 km/h from 89 m off. SCABLANDS-LAND round 4, slice 2b: the junk cars of the old oval are gone, and a solid is hit now.
  const wreck = SCABLANDS_SOLIDS.find(solid => solid.id === 'boneyard-wreck-south'), duel = start(), junk = {x: wreck.x, z: wreck.z};
  place(duel, {x: wreck.x - wreck.halfX - 89, z: wreck.z}, junk, 100);
  let before = null, drop = 0, jolts = 0;
  run(duel, [junk], 100, {seconds: 6, onTick: d => {
    const step = held(d);
    if (Number.isFinite(before) && Number.isFinite(step.ember)) drop = Math.max(drop, before - step.ember);
    before = step.ember; jolts = step.joltCount ?? 0;
  }, until: d => (held(d).joltCount ?? 0) > 0});
  check(jolts > 0 && drop >= 30, `a real hit on a wreck jolts the pot at once (took ${drop.toFixed(1)} in one step)`);
}
// (e) at 0 the job goes on; the marker points at the nearest brazier; stopping there refills and caps the pay.
{
  const duel = start(), said = [], callout = duel._storyCallout.bind(duel);
  duel._storyCallout = (text, ...rest) => { said.push(text); return callout(text, ...rest); };
  const out = run(duel, field, 150, {until: d => held(d).out === true});
  check(out.firstOut !== null && !out.done, 'the pot goes out on the field');
  const worldJob = duel.state.arena.worldJob, spillLine = 'story.ember.cinder.4';
  check(worldJob.job.stepIndex === 0 && duel.state.status === 'racing', 'at 0 the job does not end');
  duel.step(DT);
  check(worldJob.marker.id === 'yard-gate', `the marker points at the yard gate (the nearest brazier before the halfway camp): ${worldJob.marker.id}`);
  check(carAt(duel).x > 50, 'the car was not moved when the pot went out');
  check(said.some(text => text.includes(captionRecord(spillLine).text)), "Cinder's spill line is said when the pot goes out");
  // Go back to the yard gate and stop there.
  const home = carry.origin.position;
  const back = run(duel, [home], (d, car) => Math.hypot(car.x - home.x, car.z - home.z) < 60 ? 8 : 60, {seconds: 120, until: d => held(d).out !== true && (held(d).relights ?? 0) > 0});
  check(back.done === false && held(duel).relights === 1 && held(duel).ember === 100 && held(duel).out === false, 'stopping at the brazier refills the pot to 100 and counts one relight');
  check(worldJob.marker.id === 'tin-town', 'once relit the marker points at Tin Town again');
  // Then the road, fast: the pay is 80 after a relight (the road is 7.7 km).
  const finish = run(duel, roadRoute, approach, {seconds: 400, follow: roadLine});
  check(finish.done && finish.result?.relights === 1 && finish.result.pay === emberPay(EMBER_RULE, finish.result.ember, 1) && finish.result.pay <= 80, `after a relight the pay is the rule's and never above 80 (${finish.result?.grade}, ${finish.result?.pay})`);
  check(/relight/.test(finish.result.sentence) && /pays less/.test(finish.result.sentence) && !/\d/.test(finish.result.sentence), `the results sentence says so: ${finish.result.sentence}`);
}
// The halfway camp is a brazier too once the car has passed it.
{
  const duel = start(), worldJob = duel.state.arena.worldJob;
  const camp = LAND.at('safe-road'), nextStop = LAND.at('ash-barricade-2');
  place(duel, {x: camp.x + 70, z: camp.z + 30}, tinTown, 0);
  place(duel, camp, nextStop, 5);
  for (let tick = 0; tick < 10; tick++) { duel.setInput({throttle: 0, brake: 1, steer: 0, boost: false, interact: false}); duel.step(DT); }
  check(held(duel).safeIndex === 1, 'passing the halfway camp is counted');
  worldJob.job.stepState.ember = 0.001; place(duel, {x: camp.x + 70, z: camp.z + 25}, tinTown, 40);
  for (let tick = 0; tick < 60 && held(duel).out !== true; tick++) { drive(duel, tinTown, 40); duel.step(DT); }
  duel.step(DT);
  check(held(duel).out === true && worldJob.marker.id === 'safe-road', `past the halfway camp the nearest brazier is the camp (${worldJob.marker?.id})`);
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
  check(state.ember < 25 && state.relights === 1, 'the same brazier cannot be scooped twice');
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
