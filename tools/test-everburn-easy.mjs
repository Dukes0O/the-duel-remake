import assert from 'node:assert/strict';
import {LAND} from '../src/world/scablands-names.js';
import {EAST_ROAD, ROAD_NET} from '../src/world/scablands-road.js';
import {yardPlan} from '../src/world/scablands-yard-look.js';
import {driveToCinder, driveThroughYardGate, driveAlongRoad, driveMeasuredStretches,
  driveToBrazier, driveToForge} from './everburn-job1-drive.mjs';
import {roadGraph, roadWay} from '../src/world/scablands-ways.js';
import {pushOutOfSolids} from '../src/world/scablands-solids.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {RIVER_LAND, riverGorgeDepthAt} from '../src/world/scablands-regions.js';
import {Duel} from '../src/game.js';
import {EVERBURN_JOBS, EVERBURN_SIDE_JOBS} from '../src/world/jobs/everburn.js';
import {furnaceDoorSpot, furnacePace, furnaceSpeed} from '../src/world/jobs/old-smoke.js';
import {GAS_RUN_ROADS, fieldBattleJob, gasRunJob} from '../src/world/jobs/gas-run.js';

// SCABLANDS-LAND round 4: the limit was 720 s; the roads and the furnace's path are ten times as long (the chase alone is 1,042 s at child pace).
const DT = 1 / 120, MAX_SECONDS = 3000;
const trialJobsOnly = process.argv.includes('--scablands-things');
const jobArg = process.argv.indexOf('--job');
assert(jobArg < 0 || process.argv[jobArg + 1], '--job needs a job id');
const selectedJob = jobArg < 0 ? null : process.argv[jobArg + 1];
const flags = {'hidden-road': true, arsenal: true, 'arsenal-wave3': true,
  'warlord-cards': true, 'crew-gear': true, ...(trialJobsOnly ? {'scablands-realism': true} : {})};
const allJobs = [...EVERBURN_JOBS, ...EVERBURN_SIDE_JOBS];
assert.equal(allJobs.length, 9);
const jobs = selectedJob ? allJobs.filter(job => job.id === selectedJob || job.id === `everburn-${selectedJob}`) :
  trialJobsOnly ? allJobs.filter(job =>
    ['everburn-hot-delivery', 'everburn-survey-flags'].includes(job.id)) : allJobs;
if (selectedJob) assert.equal(jobs.length, 1, `Unknown job: ${selectedJob}`);
if (trialJobsOnly && !selectedJob) assert.equal(jobs.length, 2);
assert.equal(new Set(jobs.map(job => job.id)).size, jobs.length);

const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const spot = value => value?.position ?? value;
const footProgress = new WeakMap(), defendMode = new WeakMap(), soupRoute = new WeakMap();

function currentMarker(duel) {
  const arena = duel.state.arena, worldJob = arena.worldJob;
  if (worldJob.marker) return spot(worldJob.marker);
  const step = worldJob.job.steps[worldJob.job.stepIndex];
  const state = worldJob.job.stepState;
  switch (step.kind) {
    case 'carry': return spot(step.destination);
    case 'onfoot': return step.places[state.index ?? 0]?.position ?? duel.course.groundAt(duel.state.s, duel.state.lateral);
    case 'chase': return worldJob.actors.find(actor => actor.id === step.targetId)?.position ?? spot(step.path?.[0]);
    case 'escort': return spot(step.destination);
    case 'heist': return spot(state.phase === 'return' ? step.carPlace : state.phase === 'escape' ? step.escapePlace : step.zone);
    case 'rescue': return spot(step.people?.[state.rescued ?? 0] ?? step.home);
    case 'explore': return spot(step.finds[state.index ?? 0]);
    case 'defend': return spot(step.place);
    default: return null;
  }
}

// The only motion helper: steer or walk toward the marker the job currently shows.
const carStuck = new WeakMap();
function eastRoadAim(car, ahead = 70, line = EAST_ROAD.points) {
  let best = {index: 0, t: 0, d: Infinity};
  for (let index = 0; index + 1 < line.length; index++) {
    const a = line[index], b = line[index + 1], dx = b.x - a.x, dz = b.z - a.z, l = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((car.x - a.x) * dx + (car.z - a.z) * dz) / l)), d = Math.hypot(car.x - a.x - t * dx, car.z - a.z - t * dz);
    if (d < best.d) best = {index, t, d};
  }
  let index = best.index, left = ahead + best.t * Math.hypot(line[index + 1].x - line[index].x, line[index + 1].z - line[index].z);
  for (;;) {
    const a = line[index], b = line[index + 1], length = Math.hypot(b.x - a.x, b.z - a.z);
    if (left <= length || index + 2 >= line.length) { const t = Math.min(1, left / length); return {x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t}; }
    left -= length; index++;
  }
}
// A wreck, a wall, a post or ground too steep to grip in the way of a straight run: the driver aims at a point 20 m to 1.1 km to one side of the first thing in its way
// instead, the way a child steers round a car in the road or round the end of a cliff (and, when the second leg is blocked too, round that as well). A straight run
// that is clear is left alone. The last 8 m of a run are not tested, since the goal itself may stand against a wall.
const blockedAt = (a, b) => {
  const length = Math.hypot(b.x - a.x, b.z - a.z), step = Math.max(4, Math.min(40, length / 150));
  let before = scablandsSurfaceHeightAt(a.x, a.z);
  for (let d = step; d < length - 8; d += step) {
    const x = a.x + (b.x - a.x) * d / length, z = a.z + (b.z - a.z) * d / length, height = scablandsSurfaceHeightAt(x, z);
    if (Math.abs(height - before) / step > .3 || pushOutOfSolids(x, z, 3).hit) return {x, z};
    before = height;
  }
  return null;
};
function detour(from, target, depth) {
  const block = blockedAt(from, target);
  if (!block) return [];
  if (depth === 0) return null;
  const length = Math.hypot(target.x - from.x, target.z - from.z), px = -(target.z - from.z) / length, pz = (target.x - from.x) / length;
  for (const d of [20, 40, 60, 90, 150, 250, 400, 700, 1100]) for (const side of [1, -1]) {
    const via = {x: block.x + px * d * side, z: block.z + pz * d * side};
    if (blockedAt(from, via)) continue;
    const rest = detour(via, target, depth - 1);
    if (rest) return [via, ...rest];
  }
  return null;
}
// The dry river: a run that goes in at one bank and out at the other has no way over but a crossing. The driver takes the Wash or the South Ford (slopes a car drives at
// speed; the Steps want 25 km/h, the Pipe and the Bridge are one lane wide), in at 110 m from the crossing on its own side, through the crossing's middle and out 110 m on the far side.
const GORGE = 92;
const crossesRiver = (a, b) => {
  if (riverGorgeDepthAt(a.x, a.z) > .5) return false;
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  let went = false;
  for (let d = 12; d < length - 8; d += 12) {
    const inside = riverGorgeDepthAt(a.x + (b.x - a.x) * d / length, a.z + (b.z - a.z) * d / length) > .5;
    if (inside) went = true; else if (went) return true;
  }
  return false;
};
function riverNormal(point) {
  const line = RIVER_LAND.line.points;
  let best = {d: Infinity, t: {x: 1, z: 0}};
  for (let index = 0; index + 1 < line.length; index++) {
    const a = line[index], b = line[index + 1], dx = b.x - a.x, dz = b.z - a.z, l = dx * dx + dz * dz || 1, f = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / l));
    const d = Math.hypot(point.x - a.x - f * dx, point.z - a.z - f * dz);
    if (d < best.d) best = {d, t: {x: dx / Math.sqrt(l), z: dz / Math.sqrt(l)}};
  }
  return {x: -best.t.z, z: best.t.x};
}
// The shortest way over the river: a small graph of the car, the goal and the in and out points of each crossing, joined where a straight run is clear (no river between, nothing
// steep or solid in the way); a crossing's own run (in, middle, out) is always open. Null when there is no way.
function crossingRoute(car, target) {
  const nodes = [{...car, id: 'car'}, {...target, id: 'goal'}], through = new Map();
  for (const id of ['the-wash', 'south-ford']) {
    const c = RIVER_LAND.crossings.find(item => item.id === id), n = riverNormal(c), reach = GORGE + 18;
    const a = {x: c.x + n.x * reach, z: c.z + n.z * reach, id: `${id}-in`}, b = {x: c.x - n.x * reach, z: c.z - n.z * reach, id: `${id}-out`}, m = {x: c.x, z: c.z};
    nodes.push(a, b); through.set(a, {to: b, via: m}); through.set(b, {to: a, via: m});
  }
  const cost = new Map(nodes.map(node => [node, Infinity])), from = new Map(), done = new Set();
  cost.set(nodes[0], 0);
  for (;;) {
    let node = null;
    for (const item of nodes) if (!done.has(item) && cost.get(item) < Infinity && (!node || cost.get(item) < cost.get(node))) node = item;
    if (!node || node === nodes[1]) break;
    done.add(node);
    for (const other of nodes) {
      if (done.has(other) || other === node) continue;
      const open = through.get(node)?.to === other || !crossesRiver(node, other) && !blockedAt(node, other);
      const length = Math.hypot(other.x - node.x, other.z - node.z);
      if (open && cost.get(node) + length < cost.get(other)) { cost.set(other, cost.get(node) + length); from.set(other, node); }
    }
  }
  if (!from.has(nodes[1])) return null;
  const chain = [];
  for (let node = nodes[1]; node; node = from.get(node)) chain.unshift(node);
  const points = [];
  for (let index = 1; index < chain.length; index++) {
    const link = through.get(chain[index - 1]);
    if (link && link.to === chain[index]) points.push(link.via);
    if (chain[index] !== nodes[1]) points.push({x: chain[index].x, z: chain[index].z});
  }
  return points;
}
const GRAPH = roadGraph(), ways = new WeakMap();
function wayFor(duel, car, target) {
  let kept = ways.get(duel);
  if (!kept || Math.hypot(kept.goal.x - target.x, kept.goal.z - target.z) > 3) {
    // Only a run that has a river, a cliff or a building in its way is taken by the roads.
    const needed = crossesRiver(car, target) || blockedAt(car, target) !== null;
    kept = {goal: {x: target.x, z: target.z}, way: needed ? roadWay(car, target, {reach: 1500, graph: GRAPH}) : null};
    ways.set(duel, kept);
  }
  return kept.way;
}
const detours = new WeakMap();
function aroundSolids(duel, car, target, tick) {
  // The way round is a short list of points, worked out when the goal moves more than 3 m, when the list runs out, and every quarter second while the run is clear.
  let route = detours.get(duel);
  if (route && route.points.length && Math.hypot(route.points[0].x - car.x, route.points[0].z - car.z) < 12) route.points.shift();
  const stale = !route || Math.hypot(route.goal.x - target.x, route.goal.z - target.z) > 3 || !route.points.length && tick - route.tick >= route.wait;
  if (stale) {
    const clear = !crossesRiver(car, target) && !blockedAt(car, target);
    const points = clear ? [] : (crossesRiver(car, target) ? crossingRoute(car, target) : null) ?? detour(car, target, 2) ?? [];
    route = {goal: {x: target.x, z: target.z}, points, tick, wait: clear ? 30 : 240};
    detours.set(duel, route);
  }
  return route.points[0] ?? target;
}
function moveTowardMarker(duel, target) {
  if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.z)) return;
  const state = duel.state;
  if (state.onFoot) {
    const fighter = state.fighter;
    const dx = target.x - fighter.x, dz = target.z - fighter.z;
    const gap = Math.hypot(dx, dz);
    const turn = wrap(Math.atan2(dx, dz) - fighter.yaw);
    const progress = footProgress.get(duel) ?? {x: fighter.x, z: fighter.z,
      seconds: 0, side: 0, sideTime: 0};
    progress.sideTime = Math.max(0, progress.sideTime - DT);
    if (!progress.sideTime) progress.side = 0;
    progress.seconds += DT;
    if (progress.seconds >= 1) {
      const moved = Math.hypot(fighter.x - progress.x, fighter.z - progress.z);
      if (gap > 2 && moved < .6) {
        const leftDot = Math.cos(fighter.yaw) * dx - Math.sin(fighter.yaw) * dz;
        progress.side = leftDot >= 0 ? -1 : 1;
        progress.sideTime = .5;
      }
      progress.x = fighter.x; progress.z = fighter.z; progress.seconds = 0;
    }
    footProgress.set(duel, progress);
    duel.setFighterInput({turnLeft: turn > .06, turnRight: turn < -.06,
      forward: gap > 2 && Math.abs(turn) < 1.15, back: false,
      left: progress.side < 0, right: progress.side > 0, sprint: false,
      jump: false, fire: false, lookX: 0, lookY: 0});
    return;
  }
  const car = duel.course.groundAt(state.s, state.lateral);
  // SCABLANDS-LAND round 4, slice 2b: the dry river's banks and every drawn thing are solid. Hot Delivery's driver follows the East Road (aiming 70 m ahead of its
  // nearest point on it) until it is within 250 m of Tin Town; every driver that is stopped against something (a wreck, a wall, a post) backs out and turns for a
  // second and a half, the way the foot driver above steps aside.
  const jobStep = state.arena.worldJob.job.steps[state.arena.worldJob.job.stepIndex];
  const toGoal = Math.hypot(target.x - car.x, target.z - car.z);
  // The East Road leads to Tin Town: a carry bound for the town follows it; any other goal is taken by the road net like a search.
  const toTown = Math.hypot(target.x - LAND.at('tin-town').x, target.z - LAND.at('tin-town').z);
  const towardTown = jobStep?.kind === 'carry' && jobStep.load !== 'hot-soup' && toTown < 60;
  const onTheRoad = towardTown && toGoal > 45;
  // A search, a rescue, a heist or a walk drives to a goal that a river, a cliff or a building bars by the road net (the map's own shortest way over the roads, with a straight run at each end of up to 1.5 km), the way a child follows the roads.
  const way = !towardTown && toGoal > 45 && jobStep?.kind !== 'chase' ? wayFor(duel, car, target) : null;
  if (way) target = eastRoadAim(car, toGoal > 250 ? 70 : 25, way);
  else if (onTheRoad) target = eastRoadAim(car, toGoal > 250 ? 70 : 25); else if (!towardTown && (toGoal > 45 || jobStep?.kind === 'chase')) target = aroundSolids(duel, car, target, Math.round(state.stageTimeSec * 120));
  const stuck = carStuck.get(duel) ?? {x: car.x, z: car.z, seconds: 0, backing: 0, side: 1};
  stuck.seconds += DT; stuck.backing = Math.max(0, stuck.backing - DT);
  if (stuck.seconds >= 1) {
    if (stuck.backing === 0 && Math.hypot(target.x - car.x, target.z - car.z) > 12 && Math.hypot(car.x - stuck.x, car.z - stuck.z) < 1.2) { stuck.backing = 1.5; stuck.side = -stuck.side; }
    stuck.x = car.x; stuck.z = car.z; stuck.seconds = 0;
  }
  carStuck.set(duel, stuck);
  if (stuck.backing > 0) { duel.setInput({throttle: 0, brake: 1, steer: stuck.side, boost: false, interact: false}); return; }
  const dx = target.x - car.x, dz = target.z - car.z, gap = Math.hypot(dx, dz);
  const desired = Math.atan2(dx, dz), turn = wrap(desired - (car.heading + (state.headingError || 0)));
  const speed = jobStep?.load === 'hot-soup' ? (state.speedMph || 0) : Math.abs(state.speedMph || 0);
  // A driver that has to turn right round (the road, a search, a heist) drives a wide circle forward; it does not back all the way there in reverse.
  const turnsAround = onTheRoad || jobStep?.load === 'hot-soup' || ['explore', 'heist', 'rescue'].includes(jobStep?.kind);
  const nearRescue = state.arena.worldJob.job.steps[state.arena.worldJob.job.stepIndex]?.kind === 'rescue' && gap < 14;
  const defending = state.arena.worldJob.job.steps[state.arena.worldJob.job.stepIndex]?.kind === 'defend';
  const targetSpeed = jobStep?.load === 'hot-soup' && (soupRoute.get(duel)?.index ?? 0) < 2 ? 8 : nearRescue ? 0 : defending ? gap < 9 ? 4 : 20 : onTheRoad && toGoal < 250 ? 14 : gap < (turnsAround ? 40 : 10) ? 12 : 52;
  duel.setInput({throttle: speed < targetSpeed && (turnsAround || Math.abs(turn) < 1.35) ? 1 : 0,
    brake: speed > targetSpeed + 2 || (!turnsAround && Math.abs(turn) > 1.8) ? 1 : 0,
    steer: clamp(-turn * 2, -1, 1), boost: false, interact: false});
}

// Old Smoke's furnace ends only on three door hits, so contact with it no longer finishes the
// chase. The Easy driver waits behind and beside the furnace on the side of the next door (the
// arrow), outside its cinders, and rams the door while it glows. It also fires the loaned weapon.
const chaseCrossings = new WeakMap();
function driveFurnace(duel, actor) {
  const state = duel.state, f = actor.furnace, car = duel.course.groundAt(state.s, state.lateral);
  const forward = {x: Math.sin(f.heading), z: Math.cos(f.heading)}, right = {x: -Math.cos(f.heading), z: Math.sin(f.heading)};
  const door = f.door ?? actor.nextDoor ?? 'rear';
  const out = door === 'left' ? {x: -right.x, z: -right.z} : door === 'right' ? right : {x: -forward.x, z: -forward.z};
  const open = f.phase === 'glow' || f.phase === 'stoke' && f.phaseSec > 2.5;
  let target;
  if (open) {
    const spot = furnaceDoorSpot(f, door);
    target = {x: spot.x + out.x * 1.2, z: spot.z + out.z * 1.2};
  } else {
    const wait = door === 'rear' ? right : out;
    target = {x: f.x - forward.x * 14 + wait.x * 6, z: f.z - forward.z * 14 + wait.z * 6};
  }
  // When the chase is separated by the river, follow a crossing before closing on the door.
  if (!f.battle) {
    let route = chaseCrossings.get(duel);
    if (route?.points.length && Math.hypot(route.points[0].x - car.x, route.points[0].z - car.z) < 20) route.points.shift();
    if (!route?.points.length && state.stageTimeSec >= (route?.nextCheck ?? 0)) {
      const inBed = riverGorgeDepthAt(car.x, car.z) > .5;
      const needsCrossing = crossesRiver(car, target) || inBed && blockedAt(car, target);
      let points = [];
      if (needsCrossing) {
        const crossings = RIVER_LAND.crossings.filter(c => ['the-wash', 'south-ford'].includes(c.id));
        crossings.sort ( (a, b) => (Math.hypot(car.x - a.x, car.z - a.z) + Math.hypot(target.x - a.x, target.z - a.z)) -
          (Math.hypot(car.x - b.x, car.z - b.z) + Math.hypot(target.x - b.x, target.z - b.z)) );
        const c = crossings[0], n = riverNormal(c), side = Math.sign((target.x - c.x) * n.x + (target.z - c.z) * n.z) || 1;
        const entry = {x: c.x - n.x * side * (GORGE + 18), z: c.z - n.z * side * (GORGE + 18)};
        const exit = {x: c.x + n.x * side * (GORGE + 18), z: c.z + n.z * side * (GORGE + 18)};
        points = [...(inBed ? [] : [entry]), {x: c.x, z: c.z}, exit];
      }
      route = {points, nextCheck: state.stageTimeSec + 2};
      chaseCrossings.set(duel, route);
    }
    if (route?.points.length) target = route.points[0];
  }
  const dx = target.x - car.x, dz = target.z - car.z, gap = Math.hypot(dx, dz);
  const turn = wrap(Math.atan2(dx, dz) - (car.heading + (state.headingError || 0)));
  const furnaceMph = (f.battle ? furnacePace(f) : furnaceSpeed(f.difficulty, f.hits)) * 2.236936;
  const want = clamp(furnaceMph + gap * 1.5, 0, furnaceMph + 40), speed = state.speedMph || 0;
  const limit = Math.abs(turn) > 1.2 ? Math.min(want, 25) : want;
  duel.setInput({throttle: speed < limit ? 1 : 0, brake: speed > limit + 3 ? 1 : 0,
    steer: clamp(-turn * 2, -1, 1), boost: false, interact: false});
}

function playerInput(duel) {
  const state = duel.state, worldJob = state.arena.worldJob;
  const step = worldJob.job.steps[worldJob.job.stepIndex];
  const phase = worldJob.job.stepState.phase;
  const needsRelease = state.footTransition?.needsRelease === true;
  let target = currentMarker(duel);
  // Hot Soup's goal is across the Scablands and the town stands between the kitchen and it, so the driver follows the marked way, the safe
  // points in turn (go-live, 13 November 2026), as a child follows the road on the map. The other carries still drive straight at their goal.
  if (step.kind === 'carry' && step.load === 'hot-soup' && !state.onFoot) {
    const car = duel.course.groundAt(state.s, state.lateral);
    const route = soupRoute.get(duel) ?? {index: 0, x: car.x, z: car.z};
    // A restart puts the car back at the start, so follow the marked way again.
    if (Math.hypot(car.x - route.x, car.z - route.z) > 15) route.index = 0;
    route.x = car.x; route.z = car.z;
    const safeIndex = worldJob.job.stepState.safeIndex ?? 0;
    while (route.index < safeIndex) {
      const point = step.safePoints[route.index], position = spot(point);
      if (Math.hypot(car.x - position.x, car.z - position.z) > (point.radius ?? 5)) break;
      route.index++;
    }
    soupRoute.set(duel, route);
    const next = step.safePoints?.[route.index];
    if (next) target = spot(next);
  }
  const raiders = worldJob.actors.filter(actor => Number.isFinite(actor.health) &&
    Number.isFinite(actor.x) && !actor.knockedDown);
  if (step.kind === 'defend' && raiders.length && !state.onFoot) {
    const raider = raiders.sort((a, b) => Math.hypot(a.x - state.x, a.z - state.z) -
      Math.hypot(b.x - state.x, b.z - state.z))[0];
    const car = duel.course.groundAt(state.s, state.lateral);
    const dx = raider.x - car.x, dz = raider.z - car.z;
    const turn = wrap(Math.atan2(dx, dz) - (car.heading + (state.headingError || 0)));
    if (Math.hypot(dx, dz) <= 9 && Math.abs(turn) <= Math.PI / 12) {
      duel.setInput({throttle: 0, brake: Math.abs(state.speedMph) > 1 ? 1 : 0,
        steer: 0, boost: false, interact: false});
      duel.fireWeapon(worldJob.activeLoan);
      return;
    }
    // EVERBURN-PLAY-FIXES: raiders now walk in from 64 m off and stand where they arrive, so the driver meets them in the open: it runs at the
    // nearest one, and if it ends up point-blank and not lined up (a car cannot turn on the spot) it drives off to 28 m and runs at it again.
    // (It used to drive at the raider at 20 mph and creep in at 4, which only worked while the raiders walked into its sights from beside it.)
    const gap = Math.hypot(dx, dz), speed = Math.abs(state.speedMph || 0), mode = defendMode.get(duel) ?? 'run-at';
    if (mode === 'run-at' && gap < 6) defendMode.set(duel, 'back-off');
    else if (mode === 'back-off' && gap > 28) defendMode.set(duel, 'run-at');
    if (defendMode.get(duel) === 'back-off') {
      const away = {x: car.x - dx / (gap || 1) * 30, z: car.z - dz / (gap || 1) * 30};
      const awayTurn = wrap(Math.atan2(away.x - car.x, away.z - car.z) - (car.heading + (state.headingError || 0)));
      duel.setInput({throttle: speed < 20 ? 1 : 0, brake: 0, steer: clamp(-awayTurn * 2, -1, 1), boost: false, interact: false});
    } else {
      duel.setInput({throttle: speed < 20 ? 1 : 0, brake: speed > 24 ? 1 : 0, steer: clamp(-turn * 2, -1, 1), boost: false, interact: false});
    }
    return;
  }
  const wantsFoot = step.kind === 'onfoot' || step.kind === 'heist' && phase !== 'escape';
  const shouldExitNearMarker = wantsFoot && !state.onFoot &&
    Math.hypot((target?.x ?? 0) - duel.course.groundAt(state.s, state.lateral).x,
      (target?.z ?? 0) - duel.course.groundAt(state.s, state.lateral).z) < 10;
  if (shouldExitNearMarker) {
    duel.setInput({throttle: 0, brake: Math.abs(state.speedMph) > 1 ? 1 : 0,
      steer: 0, boost: false, interact: Math.abs(state.speedMph) < 3 && !needsRelease});
    return;
  }
  if (state.onFoot && !wantsFoot || state.onFoot && wantsFoot && (step.kind === 'onfoot' &&
      (worldJob.job.stepState.index ?? 0) >= step.places.length ||
      step.kind === 'heist' && phase === 'return')) {
    const car = duel.course.groundAt(state.s, state.lateral);
    const gap = Math.hypot(state.fighter.x - car.x, state.fighter.z - car.z);
    if (gap > 2) moveTowardMarker(duel, car);
    else {
      duel.setFighterInput({});
      duel.setInput({throttle: 0, brake: 1, steer: 0, boost: false, interact: !needsRelease});
    }
    return;
  }
  // FIELD-BATTLE-ASH: in the battle on the Boneyard road the driver also goes for the furnace that hunts Big Bess, the way it does in
  // job 6, until the furnace is dead; before it comes out the driver stays with Big Bess, and once she has arrived it drives to Tin Town.
  const hunter = step.furnaceActor ? worldJob.actors.find(actor => actor.furnace && !actor.furnace.dead) : null;
  const furnaceActor = step.kind === 'chase' ? worldJob.actors.find(actor => actor.furnace) : hunter;
  const bess = step.furnaceActor ? worldJob.actors.find(actor => actor.id === step.actorId) : null;
  if (furnaceActor && !state.onFoot) driveFurnace(duel, furnaceActor);
  else if (step.furnaceActor && bess && !state.onFoot && !bess.atDestination && !worldJob.actors.some(actor => actor.furnace)) {
    const car = duel.course.groundAt(state.s, state.lateral), gap = Math.hypot(bess.position.x - car.x, bess.position.z - car.z);
    if (gap < 25) duel.setInput({throttle: 0, brake: 1, steer: 0, boost: false, interact: false});
    else moveTowardMarker(duel, bess.position);
  }
  else moveTowardMarker(duel, target);
  if (!state.onFoot) {
    // Player weapon inputs use the ordinary weapon API. Shots resolve in Duel.step.
    if (step.kind === 'chase' || hunter) {
      const weapon = worldJob.activeLoan || state.weaponLoadout?.[0];
      if (weapon) duel.fireWeapon(weapon);
    }
    return;
  }
  const point = state.fighter;
  const enemy = state.arena.worldJob.actors.filter(actor => Number.isFinite(actor.health) &&
    Number.isFinite(actor.x) && !actor.knockedDown)
    .sort((a, b) => Math.hypot(a.x - point.x, a.z - point.z) - Math.hypot(b.x - point.x, b.z - point.z))[0];
  if (enemy) {
    const dx = enemy.x - point.x, dz = enemy.z - point.z;
    const turn = wrap(Math.atan2(dx, dz) - point.yaw);
    const markerGap = target ? Math.hypot(target.x - point.x, target.z - point.z) : 0;
    const weapons = state.footWeapons;
    const readyToFire = weapons?.ammo > 0 && state.stageTimeSec + 1e-8 >= weapons.nextFireAt &&
      !weapons.fireHeld;
    duel.setFighterInput({turnLeft: turn > .06, turnRight: turn < -.06,
      forward: markerGap > 2 && Math.abs(turn) < 1.15, sprint: false, aim: Math.abs(turn) < .3,
      fire: Math.abs(turn) < .3 && readyToFire});
  }
  const interact = !needsRelease && step.kind === 'heist' && phase !== 'escape' && target &&
    Math.hypot(point.x - target.x, point.z - target.z) <= (step.zone?.radius ?? 8);
  duel.setInput({interact: !!interact});
}

function driveHotDelivery(duel, definition) {
  const step = definition.steps[0], road = ROAD_NET.road('east-road').points;
  let rams = 0, jolts = 0;
  const record = result => {
    const parts = result.stretches ?? [result];
    const hits = parts.flatMap(part => part.jolts ?? []);
    rams += hits.filter(jolt => jolt.riders.length > 0).length;
    jolts += hits.length;
    return result;
  };
  duel.state.countdown = 0;
  if (!driveToCinder(duel, step.pickup.place.position).loaded) return 'collecting the pot';
  if (driveThroughYardGate(duel, yardPlan().gate).along < 20) return 'leaving the yard';
  if (!record(driveMeasuredStretches(duel, road, [500, 1000, 1500, 2000], 100 / 1.609344)).reachedAll) return 'following the East Road to the camp';
  if (record(driveAlongRoad(duel, road, 2350, 7200, 100 / 1.609344, false, false, 3, 45, 40)).along < 2350) return 'passing the camp';
  if (!record(driveToBrazier(duel, step.braziers.find(place => place.id === 'halfway-brazier'))).scooped) return 'collecting fire at the camp';
  const scoops = [...(duel.state.arena.worldJob.job.stepState.scoopedBraziers ?? [])];
  if (!record(driveMeasuredStretches(duel, road, [2500, 3000, 3500, 4000, 4500, 5000, 5500, 6500, 7000, 7600], 100 / 1.609344, false, 40)).reachedAll) return 'following the East Road to town';
  if (record(driveAlongRoad(duel, road, 7810, 12000, 25, true)).along < 7810) return 'approaching the town gate';
  if (!record(driveToForge(duel, step.destination.position)).done) return 'stopping in the forge bay or waiting for the forge';
  console.log(`Easy East Road, seed ${duel.seed}: fire ${duel.state.arena.worldJob.emberResult?.ember}, rams ${rams}, jolts ${jolts}, scoops ${scoops.join(", ") || "none"}`);
  return null;
}

function play(definition, seed) {
  const duel = new Duel({seed, featureFlags: flags});
  let raiderHits = 0;
  duel.onChange((_state, event) => { if (event.raiderHit) raiderHits++; });
  duel.state.wastelandGateDiscovered = true;
  const job = {...definition, seed};
  assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job',
    car: 'falcone_f42', seed, cpuDifficulty: 'easy', opponents: [],
    weaponLoadout: ['bomb', 'crossbow', 'star'], arsenalRank: 9, job}), true,
  `${definition.name} starts in a real headless Duel`);
  const hotDelivery = definition.id === 'everburn-hot-delivery';
  const waitingFor = hotDelivery ? driveHotDelivery(duel, definition) : null;
  const limit = hotDelivery ? 240 : Math.ceil(MAX_SECONDS / DT);
  for (let tick = 0; tick < limit && duel.state.status !== 'arena_result' && !waitingFor; tick++) {
    if (!hotDelivery && duel.state.status === 'racing') playerInput(duel);
    else duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false, interact: false});
    duel.step(DT);
  }
  const worldJob = duel.state.arena.worldJob;
  return {won: worldJob.job.done && duel.state.arena.result?.reason === 'job-complete',
    waitingFor, seconds: duel.state.stageTimeSec, failures: worldJob.job.events.filter(event =>
      ['spilled', 'restarted', 'waveRestarted', 'knockedDown'].includes(event.type)).length,
    stepIndex: worldJob.job.stepIndex, stepState: worldJob.job.stepState,
    onFoot: duel.state.onFoot, marker: worldJob.marker, waves: worldJob.clearedWaves,
    actorCount: worldJob.actors.length,
    footWeapons: duel.state.footWeapons && {ammo: duel.state.footWeapons.ammo,
      lastFireAt: duel.state.footWeapons.lastFireAt, fireHeld: duel.state.footWeapons.fireHeld,
      selected: duel.state.footWeapons.selected},
    fighterInput: duel.state.fighterInput,
    fighterYaw: duel.state.fighter?.yaw,
    fireCount: duel.state.combat.scoring?.shotsFired,
    raiderHits, yaw: duel.state.fighter?.yaw, fighterY: duel.state.fighter?.y,
    actors: worldJob.actors.slice(0, 3).map(actor => ({id: actor.id, health: actor.health,
      knockedDown: actor.knockedDown, position: actor.position, x: actor.x, z: actor.z})), duel};
}

const results = [];
for (const definition of jobs) {
  let finishes = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const result = play(definition, seed);
    if (result.won) finishes++;
    if ((seed === 1 || trialJobsOnly || selectedJob) && !result.won) {
      console.log(`Failed ${definition.name}, seed ${seed}`);
      results.push({definition, result, seed});
    }
    if (result.won) assert.equal(result.duel.state.arena.worldJob.settled, true);
  }
  console.log(`${definition.name}: ${finishes}/10 finished`);
  results.push({definition, finishes});
}
for (const entry of results) if (entry.result) console.log(`Sample ${entry.definition.name}, seed ${entry.seed}: ${JSON.stringify({
  waitingFor: entry.result.waitingFor, seconds: entry.result.seconds, stepIndex: entry.result.stepIndex, stepState: entry.result.stepState,
  onFoot: entry.result.onFoot, marker: entry.result.marker, status: entry.result.duel.state.status,
  waves: entry.result.waves, actorCount: entry.result.actorCount, actors: entry.result.actors,
  footWeapons: entry.result.footWeapons, fighterInput: entry.result.fighterInput,
  fighterYaw: entry.result.fighterYaw, fireCount: entry.result.fireCount,
  raiderHits: entry.result.raiderHits, yaw: entry.result.yaw, fighterY: entry.result.fighterY,
  fighter: entry.result.duel.state.fighter && {x: entry.result.duel.state.fighter.x,z:entry.result.duel.state.fighter.z},
  car: entry.result.duel.course.groundAt(entry.result.duel.state.s,entry.result.duel.state.lateral)}
  )}`);
for (const entry of results) if ('finishes' in entry)
  assert(entry.finishes >= 8, `${entry.definition.name}: ${entry.finishes}/10 finished; expected at least 8/10`);
console.log(`Everburn Easy driver: ${selectedJob ? jobs[0].name : trialJobsOnly ? 'both realism trial jobs' : 'all nine jobs'} finished through real Duel inputs`);

if (!trialJobsOnly && !selectedJob) {
// RUN-GAS: the same child-pace driver brings a gas run home on each road at each word of the feud, 8 times in 10 at least.
// The run count is the try's number, so each try has its own ambush places.
const FEUD_WORDS = ['Watching', 'Raiding', 'Hunting', 'War party'];
const runWins = {};
for (const road of GAS_RUN_ROADS) for (const feud of [1, 2, 3, 4]) {
  let wins = 0, lowest = Infinity;
  for (let seed = 1; seed <= 10; seed++) {
    const result = play(gasRunJob({road, feud, runs: seed - 1, difficulty: 'easy'}), seed);
    if (result.won) wins++;
    if (result.won) assert.equal(result.duel.state.arena.worldJob.settled, true);
    lowest = Math.min(lowest, result.duel.state.arena.worldJob.actors.find(actor => actor.id === 'big-bess')?.health ?? Infinity);
  }
  runWins[`${road} / ${FEUD_WORDS[feud - 1]}`] = wins;
  console.log(`Gas run, ${road} road, ${FEUD_WORDS[feud - 1]}: ${wins}/10 brought home (Big Bess's lowest health on arrival ${lowest.toFixed(0)})`);
}
for (const [name, wins] of Object.entries(runWins)) assert(wins >= 8, `Gas run ${name}: ${wins}/10 brought home; expected at least 8/10`);
console.log('Everburn Easy driver: both gas roads at all four feud words brought home through real Duel inputs');

// FIELD-BATTLE-ASH: the same child-pace driver in the battle on the Boneyard road, taught (as in job 6) to ram the furnace's glowing
// door: Big Bess gets home 10 times in 10 and the battle is won 8 times in 10 at least. The run count is the try's number.
{
  let home = 0, won = 0, lowest = Infinity, doors = 0, longest = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const result = play(fieldBattleJob({runs: seed - 1, difficulty: 'easy'}), seed), worldJob = result.duel.state.arena.worldJob;
    if (result.won) home++;
    if (worldJob.battleEnding === 'won') won++;
    lowest = Math.min(lowest, worldJob.actors.find(actor => actor.id === 'big-bess')?.health ?? Infinity);
    doors += worldJob.actors.find(actor => actor.furnace)?.furnace.hits ?? 0;
    longest = Math.max(longest, result.seconds);
  }
  console.log(`Battle on the Boneyard road, Easy: Big Bess home ${home}/10, battle won ${won}/10 (doors broken ${doors} in all, Big Bess's lowest health ${lowest.toFixed(0)}, longest ${longest.toFixed(0)} s)`);
  assert.equal(home, 10, `Battle, Easy: Big Bess home ${home}/10; expected 10`);
  assert(won >= 8, `Battle, Easy: the battle won ${won}/10; expected at least 8/10`);
  console.log('Everburn Easy driver: the battle on the Boneyard road, Big Bess home every time and the furnace stopped through real Duel inputs');
}

}
