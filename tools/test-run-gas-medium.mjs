// RUN-GAS: scripted drivers on Medium (docs/board/cards/RUN-GAS.md, "What play showed"). Memory only, headless Duels, real inputs.
//   - A driver who never fights drives to Tin Town like the Easy driver does.
//   - A fighting driver drives ahead of Big Bess to the next ambush, runs each raider down with the car when the raiders appear,
//     and goes back to her.
// Each case is 10 tries; the run count is the try's number, so each try has its own ambush places.
import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {fieldBattleJob, gasRunJob} from '../src/world/jobs/gas-run.js';
import {alongPath} from '../src/world/jobs/steps/escort.js';
import {pathShare} from '../src/world/jobs/furnace-sightings.js';
import {furnaceDoorSpot, furnacePace} from '../src/world/jobs/old-smoke.js';
import '../src/story/ember-lines.js';

const DT = 1 / 120, MAX_SECONDS = 900, TRIES = 10;
const FLAGS = {'hidden-road': true, arsenal: true, 'arsenal-wave3': true, 'warlord-cards': true, 'crew-gear': true};
const FEUD_WORDS = ['Watching', 'Raiding', 'Hunting', 'War party'];
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

// Steer at a place and hold a speed (miles an hour).
function drive(duel, target, mph) {
  const state = duel.state, car = duel.course.groundAt(state.s, state.lateral);
  const dx = target.x - car.x, dz = target.z - car.z;
  const turn = wrap(Math.atan2(dx, dz) - (car.heading + (state.headingError || 0))), speed = Math.abs(state.speedMph || 0);
  duel.setInput({throttle: speed < mph && Math.abs(turn) < 1.35 ? 1 : 0, brake: speed > mph + 3 || Math.abs(turn) > 1.8 ? 1 : 0,
    steer: clamp(-turn * 2, -1, 1), boost: false, interact: false});
}

// FIELD-BATTLE-ASH: go for the furnace that hunts Big Bess: wait behind it and beside it on the side of the next door, and ram that
// door while it glows (the way the Easy driver does it in job 6), firing the lent weapon as well.
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
  const furnaceMph = furnacePace(f) * 2.236936, speed = state.speedMph || 0;
  const want = clamp(furnaceMph + gap * 1.5, 0, furnaceMph + 40), limit = Math.abs(turn) > 1.2 ? Math.min(want, 25) : want;
  duel.setInput({throttle: speed < limit ? 1 : 0, brake: speed > limit + 3 ? 1 : 0, steer: clamp(-turn * 2, -1, 1), boost: false, interact: false});
  const weapon = state.arena.worldJob.activeLoan || state.weaponLoadout?.[0];
  if (weapon) duel.fireWeapon(weapon);
}

// The fighter: where to go this tick.
function fighter(duel) {
  const state = duel.state, worldJob = state.arena.worldJob, step = worldJob.job.steps[worldJob.job.stepIndex];
  const bess = worldJob.actors.find(actor => actor.id === 'big-bess'), car = duel.course.groundAt(state.s, state.lateral);
  const standing = worldJob.actors.filter(actor => actor.ambushKey && !actor.knockedDown && actor.health > 0)
    .sort((a, b) => Math.hypot(a.x - car.x, a.z - car.z) - Math.hypot(b.x - car.x, b.z - car.z));
  // In the battle the furnace hunts Big Bess from behind: go for a door that is opening, or for the next door when no riders are
  // left standing; while the furnace is held by a broken door, clear the riders. Only a battle has a furnace actor.
  const hunter = bess?.atDestination ? null : worldJob.actors.find(actor => actor.furnace && !actor.furnace.dead);
  if (hunter) {
    const f = hunter.furnace, open = f.phase === 'glow' || f.phase === 'stoke' && f.phaseSec > 2.5;
    if (f.phase !== 'stagger' && (!standing.length || open && Math.hypot(f.x - car.x, f.z - car.z) < 160)) return driveFurnace(duel, hunter);
  }
  if (standing.length) {
    // Run the nearest raider down: straight at him, quickly (the car must touch him at 4 m/s or more).
    const raider = standing[0], gap = Math.hypot(raider.x - car.x, raider.z - car.z);
    return drive(duel, {x: raider.x, z: raider.z}, gap < 12 ? 22 : 34);
  }
  // The next ambush that has not appeared yet (and that she has not passed): wait for it 45 m short of its place, on the side
  // Big Bess comes from.
  const spawned = new Set(worldJob.spawnedWaveKeys), along = bess ? pathShare(bess.position, bess.pathIndex, step.path).metres : 0;
  const next = (step.ambushes ?? []).map(item => ({item, where: alongPath(step.path, item.place).metres}))
    .filter(({item, where}) => !spawned.has(`ambush:${item.id}`) && along < where + 60).sort((a, b) => a.where - b.where)[0]?.item;
  if (next && bess) {
    const place = next.place.position, toward = {x: bess.position.x - place.x, z: bess.position.z - place.z}, length = Math.hypot(toward.x, toward.z) || 1;
    const wait = {x: place.x + toward.x / length * 45, z: place.z + toward.z / length * 45};
    return drive(duel, wait, Math.hypot(wait.x - car.x, wait.z - car.z) < 25 ? 0 : 34);
  }
  // No more ambushes ahead: go back to her.
  if (bess) return drive(duel, bess.position, Math.hypot(bess.position.x - car.x, bess.position.z - car.z) < 20 ? 0 : 20);
  return drive(duel, step.destination.position ?? step.destination, 30);
}

// The driver who never fights: straight to Tin Town.
function coward(duel) {
  const worldJob = duel.state.arena.worldJob, step = worldJob.job.steps[worldJob.job.stepIndex];
  return drive(duel, step.destination.position ?? step.destination, 52);
}

function play(definition, seed, driver) {
  const duel = new Duel({seed, featureFlags: FLAGS});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: 'falcone_f42', seed, cpuDifficulty: 'medium', opponents: [],
    weaponLoadout: ['bomb', 'crossbow', 'star'], arsenalRank: 9, job: {...definition, seed}}), true, `${definition.name} starts`);
  let rests = 0;
  const limit = Math.ceil(MAX_SECONDS / DT);
  for (let tick = 0; tick < limit && duel.state.status !== 'arena_result'; tick++) {
    if (duel.state.status === 'racing') driver(duel); else duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false, interact: false});
    duel.step(DT);
    if (duel.state.arena.worldJob.job.events.some(event => event.type === 'rest')) rests++;
  }
  const worldJob = duel.state.arena.worldJob;
  return {won: worldJob.job.done && duel.state.arena.result?.reason === 'job-complete', rests, ambushes: definition.steps[0].ambushes.length, stretches: definition.steps[0].path.length - 1, seconds: duel.state.stageTimeSec,
    health: worldJob.actors.find(actor => actor.id === 'big-bess')?.health ?? NaN, wrecked: duel.state.combatWrecking === true,
    // The battle's own facts: it is won when the furnace's last door broke before Big Bess arrived.
    battleWon: worldJob.battleEnding === 'won', doors: worldJob.actors.find(actor => actor.furnace)?.furnace.hits ?? 0};
}

const cases = [
  {name: 'Job 4 (Slow Ride)', job: () => EVERBURN_JOBS[3]},
  ...['long', 'boneyard'].flatMap(road => [1, 2, 3, 4].map(feud => ({name: `${road} road, ${FEUD_WORDS[feud - 1]}`, road, feud,
    job: seed => gasRunJob({road, feud, runs: seed - 1, difficulty: 'medium'})}))),
];
const results = {};
for (const [label, driver] of [['fighting driver', fighter], ['driver who never fights', coward]]) {
  for (const entry of cases) {
    const tries = Array.from({length: TRIES}, (_, index) => play(entry.job(index + 1), index + 1, driver));
    const wins = tries.filter(item => item.won).length, wonTries = tries.filter(item => item.won);
    // Rests beyond two for each ambush on the road (an ambush gives up after two rests on its stretch); 0 or less means within the rule.
    const row = {wins, overTwoPerAmbush: Math.max(...tries.map(item => item.rests - 2 * item.ambushes)), overTwoPerStretch: Math.max(...tries.map(item => item.rests - 2 * item.stretches)), maxRests: Math.max(0, ...wonTries.map(item => item.rests)), mostRests: Math.max(...tries.map(item => item.rests)), lowest: wonTries.length ? Math.min(...wonTries.map(item => item.health)) : NaN};
    results[`${label} / ${entry.name}`] = row;
    console.log(`${label}, ${entry.name}: ${wins}/10 brought home, most rests in a try that arrived ${row.maxRests} (in any try ${row.mostRests}), Big Bess's lowest health on arrival ${Number.isFinite(row.lowest) ? row.lowest.toFixed(0) : 'none'}`);
  }
}
// FIELD-BATTLE-ASH: the battle on the Boneyard road on Medium (two ambushes of 3, the patched furnace behind Big Bess). Targets:
// a driver who clears the riders and breaks doors wins the battle at least 6 times in 10; a driver who never fights still gets Big Bess
// home 10 times in 10 (the battle is then not won: she arrives with the furnace still rolling).
const BATTLE = 'Boneyard battle', battleRows = {};
for (const [label, driver] of [['fighting driver', fighter], ['driver who never fights', coward]]) {
  const tries = Array.from({length: TRIES}, (_, index) => play(fieldBattleJob({runs: index, difficulty: 'medium'}), index + 1, driver));
  const home = tries.filter(item => item.won), row = {wins: home.length, battlesWon: tries.filter(item => item.battleWon).length,
    overTwoPerStretch: Math.max(...tries.map(item => item.rests - 2 * item.stretches)), mostRests: Math.max(...tries.map(item => item.rests)),
    doors: tries.map(item => item.doors), lowest: home.length ? Math.min(...home.map(item => item.health)) : NaN,
    seconds: [Math.min(...tries.map(item => item.seconds)), Math.max(...tries.map(item => item.seconds))]};
  results[`${label} / ${BATTLE}`] = row; battleRows[label] = row;
  console.log(`${label}, ${BATTLE}: Big Bess home ${row.wins}/10, battle won ${row.battlesWon}/10, doors broken ${row.doors.join(' ')}, most rests in a try ${row.mostRests}, Big Bess's lowest health on arrival ${Number.isFinite(row.lowest) ? row.lowest.toFixed(0) : 'none'}, a battle lasts ${row.seconds[0].toFixed(0)} to ${row.seconds[1].toFixed(0)} s`);
}
assert(battleRows['fighting driver'].battlesWon >= 6, `the fighting driver wins the battle: ${battleRows['fighting driver'].battlesWon}/10, expected at least 6`);
assert.equal(battleRows['driver who never fights'].wins, 10, `a driver who never fights gets Big Bess home in the battle: ${battleRows['driver who never fights'].wins}/10, expected 10`);
assert.equal(battleRows['driver who never fights'].battlesWon, 0, 'a driver who never fights does not win the battle');
const get = (label, name) => results[`${label} / ${name}`];
// The card's targets.
const FIGHT = 'fighting driver', COWARD = 'driver who never fights';
assert(get(FIGHT, 'Job 4 (Slow Ride)').wins >= 8, `the fighting driver wins job 4: ${get(FIGHT, 'Job 4 (Slow Ride)').wins}/10, expected at least 8`);
assert(get(FIGHT, 'boneyard road, Raiding').wins >= 8, `the fighting driver wins a Boneyard run at Raiding: ${get(FIGHT, 'boneyard road, Raiding').wins}/10, expected at least 8`);
assert(get(FIGHT, 'boneyard road, War party').wins >= 5, `the fighting driver wins a Boneyard run at War party: ${get(FIGHT, 'boneyard road, War party').wins}/10, expected at least 5`);
// The driver who never fights arrives everywhere: an ambush that is never cleared gives up after two rests on its stretch, so a run
// can never loop for ever (RUN-GAS). It needs at most two rests for each ambush on its road.
for (const entry of cases) {
  const row = get(COWARD, entry.name);
  assert.equal(row.wins, 10, `a driver who never fights arrives on ${entry.name}: ${row.wins}/10, expected 10`);
  assert(row.overTwoPerAmbush <= 0, `a driver who never fights needs at most 2 rests for each ambush on ${entry.name} (${row.overTwoPerAmbush} over in the worst try)`);
}
// Whatever the driver does, a run cannot loop for ever: a stretch is rested on at most twice, so a try never has more than two rests for
// each stretch of its road (the fighting driver's old limit of three rests in a try that arrived is gone; see docs/changes/RUN-GAS.md).
for (const [key, row] of Object.entries(results))
  assert(row.overTwoPerStretch <= 0, `${key}: at most 2 rests on each stretch of the road (${row.overTwoPerStretch} over in the worst try)`);
console.log('Medium drivers: the card\'s targets are met');
