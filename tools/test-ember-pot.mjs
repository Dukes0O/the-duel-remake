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
import {EMBER_RULE, emberLoss, emberGrade, emberPay, emberSentence, MPH_TO_KMH} from '../src/world/jobs/ember-rule.js';
import {stepCarry} from '../src/world/jobs/steps/carry.js';
import {DELIVERY_ROAD, distanceToRoad, onRoadPoints, onScablandsRoad} from '../src/world/scablands-road.js';
import {arenaReward} from '../src/arena/arena-settlement.js';
import {captionRecord} from '../src/story/story-lines.js';
import '../src/story/ember-lines.js';
import {worldHudModel} from '../src/world/world-hud.js';
import {createEmberPot} from '../src/world/ember-pot.js';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const DT = 1 / 120;
const flags = {'hidden-road': true, arsenal: true, 'arsenal-wave3': true};
const hot = EVERBURN_JOBS[0], carry = hot.steps[0];
const tinTown = carry.destination.position;
const roadRoute = [...DELIVERY_ROAD.points.slice(1), tinTown].map(point => ({x: point.x, z: point.z}));

// ---- the road question: points in, answer out ----------------------------------------------------------------------------------------
{
  const line = {halfWidth: 5, points: [{x: 0, z: 0}, {x: 100, z: 0}, {x: 100, z: 100}]};
  check(onRoadPoints(50, 4, line) && !onRoadPoints(50, 6, line), 'a point is on a road within its half width of the line');
  check(onRoadPoints(103, 60, line) && !onRoadPoints(110, 60, line), 'the road bends where its points bend');
  check(Math.abs(distanceToRoad(200, 0, line.points) - 100) < 1e-9, 'distance is to the nearest end of the last stretch');
  const moved = {halfWidth: 5, points: line.points.map(point => ({x: point.x + 1000, z: point.z - 500}))};
  check(onRoadPoints(1050, -496, moved) && !onRoadPoints(50, 4, moved), 'moving the points moves the road: nothing assumes the land');
  check(onScablandsRoad(115, 75) && onScablandsRoad(230, 150) && onScablandsRoad(0, 0), 'the yard gate, the halfway camp and the way between are road');
  check(!onScablandsRoad(300, 0) && !onScablandsRoad(150, 0), 'the scab field straight across is not road');
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

// (a) the road at 150 km/h arrives bright, with nothing taken but cold.
{
  const out = run(start(), roadRoute, 150);
  check(out.done && out.result, 'the road at speed reaches Tin Town');
  check(out.result.grade === 'bright' && out.result.relights === 0 && out.result.pay === 120, `the road at 150 km/h arrives bright and pays 120 (${out.result.ember.toFixed(1)}, ${out.result.grade})`);
  check(out.result.ember > 90, `on the road only cold takes ember (arrived with ${out.result.ember.toFixed(1)})`);
}
// (b) the scab field straight across at 120 km/h puts the pot out before Tin Town.
{
  const out = run(start(), field, 120, {until: duel => held(duel).out === true});
  check(out.firstOut !== null && !out.done, `the field at 120 km/h puts the pot out (at ${out.firstOut?.toFixed(1)} s) before the town`);
  check(carAt(out.duel).x < tinTown.x - 30, 'the pot is out before Tin Town');
  // Flat out is never a way to outrun the loss, on Easy either (Claude's drive, 14 November: with a loss by the second, 206 km/h on Easy arrived).
  const flat = run(start({difficulty: 'easy'}), field, 205, {until: duel => held(duel).out === true});
  check(flat.firstOut !== null && !flat.done && carAt(flat.duel).x < tinTown.x - 30, `the field flat out on Easy puts the pot out before the town (at ${Math.round(carAt(flat.duel).x)} m)`);
  const fast = run(start(), field, 200, {until: duel => held(duel).out === true}), slow = run(start(), field, 100, {until: duel => held(duel).out === true});
  check(carAt(fast.duel).x < carAt(slow.duel).x, `faster over rock gets less far before the pot is out (${Math.round(carAt(fast.duel).x)} m at 200 km/h, ${Math.round(carAt(slow.duel).x)} m at 100)`);
}
// (c) the field at 45 km/h arrives alive or better: rock is safe up to 50.
{
  const out = run(start(), field, 45);
  check(out.done && out.result && ['bright', 'alive'].includes(out.result.grade) && out.outCount === 0, `the field at 45 km/h arrives alive or better (${out.result?.ember.toFixed(1)}, ${out.result?.grade})`);
}
// (d) a hard hit takes a large share at once; a light touch takes nothing. The rule alone, then a real hit on a real solid.
{
  const view = (hitKmh, extra = {}) => ({player: {position: {x: 300, z: 300}}, speedKmh: 0, hitKmh, onRoad: true, difficulty: 'medium', ...extra});
  const quiet = stepCarry(carry, {}, view(0), DT).state.ember, touched = stepCarry(carry, {}, view(7), DT).state.ember, hard = stepCarry(carry, {}, view(40), DT).state.ember;
  check(Math.abs(touched - quiet) < 1e-9, 'a touch that sheds 7 km/h takes nothing');
  check(quiet - hard >= 50, `a hit that sheds 40 km/h takes a large share at once (${(quiet - hard).toFixed(1)})`);
  check(Math.abs((100 - 1.5 * 40) - hard) < .1, 'a hit takes 1.5 for each km/h shed');
  // Real: drive at the pair of junk cars that lie on the dirt road by the Boneyard, at 100 km/h. (Solids such as the gate posts are not yet
  // hit by the car: that is a later slice, "a solid world". The junk cars are.)
  const duel = start(), junk = {x: 460, z: 289};
  place(duel, {x: junk.x, z: junk.z - 89}, junk, 100);
  let before = null, drop = 0, jolts = 0;
  run(duel, [junk], 100, {seconds: 6, onTick: d => {
    const step = held(d);
    if (Number.isFinite(before) && Number.isFinite(step.ember)) drop = Math.max(drop, before - step.ember);
    before = step.ember; jolts = step.joltCount ?? 0;
  }, until: d => (held(d).joltCount ?? 0) > 0});
  check(jolts > 0 && drop >= 30, `a real hit on a junk car jolts the pot at once (took ${drop.toFixed(1)} in one step)`);
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
  // Then the road, fast: bright at arrival, but the pay is capped at 80 after a relight.
  const finish = run(duel, roadRoute, 150);
  check(finish.done && finish.result?.relights === 1 && finish.result.grade === 'bright' && finish.result.pay === 80, `a relight caps the pay at 80 (${finish.result?.grade}, ${finish.result?.pay})`);
  check(/relight/.test(finish.result.sentence) && /pays less/.test(finish.result.sentence) && !/\d/.test(finish.result.sentence), `the results sentence says so: ${finish.result.sentence}`);
}
// The halfway camp is a brazier too once the car has passed it.
{
  const duel = start(), worldJob = duel.state.arena.worldJob;
  place(duel, {x: 300, z: 180}, tinTown, 0);
  place(duel, {x: 230, z: 150}, {x: 410, z: 210}, 5);
  for (let tick = 0; tick < 10; tick++) { duel.setInput({throttle: 0, brake: 1, steer: 0, boost: false, interact: false}); duel.step(DT); }
  check(held(duel).safeIndex === 1, 'passing the halfway camp is counted');
  worldJob.job.stepState.ember = 0.001; place(duel, {x: 300, z: 175}, tinTown, 40);
  for (let tick = 0; tick < 60 && held(duel).out !== true; tick++) { drive(duel, tinTown, 40); duel.step(DT); }
  duel.step(DT);
  check(held(duel).out === true && worldJob.marker.id === 'safe-road', `past the halfway camp the nearest brazier is the camp (${worldJob.marker?.id})`);
}
// Not under 20 km/h: no scoop.
{
  const state = {ember: 0, out: true, relights: 0, safeIndex: 0};
  const at = {position: {x: 2, z: 2}};
  check(stepCarry(carry, state, {player: at, speedKmh: 40, difficulty: 'medium'}, DT).state.out === true, 'a car going 40 km/h through the brazier takes no scoop');
  check(stepCarry(carry, state, {player: at, speedKmh: 10, difficulty: 'medium'}, DT).state.ember === 100, 'a car slower than 20 km/h at the brazier takes a fresh scoop');
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
  const input = {kmh: 120, lostKmh: 30, onRoad: false, dt: 1};
  const medium = emberLoss(EMBER_RULE, {...input, difficulty: 'medium'}), easy = emberLoss(EMBER_RULE, {...input, difficulty: 'easy'});
  check(Math.abs(easy.rough * 2 - medium.rough) < 1e-9 && Math.abs(easy.hit * 2 - medium.hit) < 1e-9 && easy.cold === medium.cold, 'Easy halves rough ground and hits and leaves cold alone');
  check(Math.abs(medium.cold - .33) < 1e-9 && Math.abs(medium.rough - .003 * 70 * (120 / 3.6)) < 1e-9 && Math.abs(medium.hit - 45) < 1e-9, 'cold 0.33 a second, rock 0.003 a metre for each km/h over 50, hits 1.5 for each km/h');
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
