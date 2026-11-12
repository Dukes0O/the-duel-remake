import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {EVERBURN_JOBS, EVERBURN_SIDE_JOBS} from '../src/world/jobs/everburn.js';
import {furnaceDoorSpot, furnaceSpeed} from '../src/world/jobs/old-smoke.js';
import {GAS_RUN_ROADS, gasRunJob} from '../src/world/jobs/gas-run.js';

const DT = 1 / 120, MAX_SECONDS = 720;
const flags = {'hidden-road': true, arsenal: true, 'arsenal-wave3': true,
  'warlord-cards': true, 'crew-gear': true};
const allJobs = [...EVERBURN_JOBS, ...EVERBURN_SIDE_JOBS];
assert.equal(allJobs.length, 9);
const jobs = allJobs;
assert.equal(new Set(jobs.map(job => job.id)).size, jobs.length);

const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const spot = value => value?.position ?? value;
const footProgress = new WeakMap();

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
  const dx = target.x - car.x, dz = target.z - car.z, gap = Math.hypot(dx, dz);
  const desired = Math.atan2(dx, dz), turn = wrap(desired - (car.heading + (state.headingError || 0)));
  const speed = Math.abs(state.speedMph || 0);
  const nearRescue = state.arena.worldJob.job.steps[state.arena.worldJob.job.stepIndex]?.kind === 'rescue' && gap < 14;
  const defending = state.arena.worldJob.job.steps[state.arena.worldJob.job.stepIndex]?.kind === 'defend';
  const targetSpeed = nearRescue ? 0 : defending ? gap < 9 ? 4 : 20 : gap < 10 ? 12 : 52;
  duel.setInput({throttle: speed < targetSpeed && Math.abs(turn) < 1.35 ? 1 : 0,
    brake: speed > targetSpeed + 2 || Math.abs(turn) > 1.8 ? 1 : 0,
    steer: clamp(-turn * 2, -1, 1), boost: false, interact: false});
}

// Old Smoke's furnace ends only on three door hits, so contact with it no longer finishes the
// chase. The Easy driver waits behind and beside the furnace on the side of the next door (the
// arrow), outside its cinders, and rams the door while it glows. It also fires the loaned weapon.
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
  const dx = target.x - car.x, dz = target.z - car.z, gap = Math.hypot(dx, dz);
  const turn = wrap(Math.atan2(dx, dz) - (car.heading + (state.headingError || 0)));
  const furnaceMph = furnaceSpeed(f.difficulty, f.hits) * 2.236936;
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
    target = {x: raider.x, z: raider.z};
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
  const furnaceActor = step.kind === 'chase' ? worldJob.actors.find(actor => actor.furnace) : null;
  if (furnaceActor && !state.onFoot) driveFurnace(duel, furnaceActor);
  else moveTowardMarker(duel, target);
  if (!state.onFoot) {
    // Player weapon inputs use the ordinary weapon API. Shots resolve in Duel.step.
    if (step.kind === 'chase') {
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
  const limit = Math.ceil(MAX_SECONDS / DT);
  for (let tick = 0; tick < limit && duel.state.status !== 'arena_result'; tick++) {
    if (duel.state.status === 'racing') playerInput(duel);
    else duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false, interact: false});
    duel.step(DT);
  }
  const worldJob = duel.state.arena.worldJob;
  return {won: worldJob.job.done && duel.state.arena.result?.reason === 'job-complete',
    seconds: duel.state.stageTimeSec, failures: worldJob.job.events.filter(event =>
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
    if (seed === 1 && !result.won) results.push({definition, result});
    if (result.won) assert.equal(result.duel.state.arena.worldJob.settled, true);
  }
  console.log(`${definition.name}: ${finishes}/10 finished`);
  results.push({definition, finishes});
}
for (const entry of results) if (entry.result) console.log(`Sample ${entry.definition.name}: ${JSON.stringify({
  seconds: entry.result.seconds, stepIndex: entry.result.stepIndex, stepState: entry.result.stepState,
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
console.log('Everburn Easy driver: all nine jobs finished through real Duel inputs');

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
