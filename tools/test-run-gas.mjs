// RUN-GAS (docs/board/cards/RUN-GAS.md): raids on an escort, the gas run's two roads, its feud table and its pay.
// Memory only: no save is read or written.
import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {stepEscort, alongPath, metresAtPlace, ambushRaiders, AMBUSH_ALERT_METRES, AMBUSH_GONE_METRES, AMBUSH_WEAR_METRES,
  AMBUSH_WEAR_PER_SECOND} from '../src/world/jobs/steps/escort.js';

let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const same = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
const near = (actual, expected, tolerance, message) => { assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} is not within ${tolerance} of ${expected}`); checks++; };
const pos = (x, z) => ({x, y: 0, z});

// ---- 1. The escort step's ambushes, as pure numbers ---------------------------------------------------------------
{
  const path = [pos(0, 0), pos(0, 300), pos(300, 300)];
  const ambush = {id: 'a', place: pos(12, 200), count: 3}, step = {kind: 'escort', actorId: 'bess', path, speed: 9, destination: pos(300, 300),
    ambushes: [ambush, {id: 'b', place: pos(200, 312), count: 1}], restLineId: 'rest', raidLineId: 'raid-line', restSeconds: 2};
  const truck = (x, z, extra = {}) => ({id: 'bess', position: pos(x, z), health: 100, pathIndex: extra.pathIndex ?? 1, pathProgress: .5, ...extra});
  // The job engine keeps the step's old state and lays the step's returned names over it; so does this.
  const tick = (state, actor, difficulty = 'medium', dt = 1 / 60) => {
    const out = stepEscort(step, state, {actors: [actor], difficulty}, dt);
    return {...out, state: {...state, ...out.state}};
  };
  const spawns = out => out.requests.filter(request => request.type === 'spawnWave');

  same(alongPath(path, ambush.place).metres, 200, 'an ambush 12 m off the road lies at the metre where the road is nearest');
  same(alongPath(path, ambush.place).direction, {x: 0, z: 1}, 'and the road runs south there');
  same(metresAtPlace(path, 0), 0, 'the first place of a road is at metre 0');
  same(metresAtPlace(path, 2), 600, 'the last place of a road is at its length');
  same([AMBUSH_ALERT_METRES, AMBUSH_GONE_METRES, AMBUSH_WEAR_METRES], [160, 60, 30], 'the card\'s distances: 160 m to appear, 60 m to give up, 30 m to wear');
  same(AMBUSH_WEAR_PER_SECOND, {easy: 1.5, medium: 5, hard: 7}, 'the card\'s wear: 1.5, 5 and 7 a second');

  let out = tick({}, truck(0, 30));
  same(spawns(out).length, 0, 'an ambush more than 160 m away does not appear');
  out = tick(out.state, truck(0, 45));
  check(spawns(out).length === 1, 'an ambush appears when the truck comes within 160 m of it');
  const request = spawns(out)[0];
  check(request.ambush === true && request.n === 3 && request.at === ambush.place && request.key === 'ambush:a', 'it asks for the ambush\'s own raiders at its own place');
  check(out.requests.some(item => item.type === 'say' && item.lineId === 'raid-line'), 'the first raid says the step\'s raid line');
  out = tick(out.state, truck(0, 60));
  same(spawns(out).length, 0, 'an ambush appears once');
  check(!out.requests.some(item => item.type === 'say'), 'and the raid line is said once');
  same(tick({}, truck(0, 45), 'easy').requests.find(item => item.type === 'spawnWave').n, 2, 'Easy has one raider fewer');
  const lone = {...step, ambushes: [{id: 'c', place: pos(12, 200), count: 1}]};
  same(stepEscort(lone, {}, {actors: [truck(0, 45)], difficulty: 'easy'}, 0).requests.find(item => item.type === 'spawnWave').n, 1, 'never fewer than one');
  same([1, 2, 3, 4].map(count => ambushRaiders({count}, 'easy')), [1, 1, 2, 3], 'Easy takes one off each count, never below one');
  same([1, 2, 3, 4].map(count => ambushRaiders({count}, 'hard')), [1, 2, 3, 4], 'Hard and Medium keep the count');

  const spawned = tick({}, truck(0, 45)).state;
  out = tick(spawned, truck(0, 250));
  same(out.requests.filter(item => item.type === 'clearWave').length, 0, 'raiders stay while the truck is less than 60 m past');
  out = tick(spawned, truck(0, 262));
  same(out.requests.filter(item => item.type === 'clearWave').map(item => item.key), ['ambush:a'], 'once she is 60 m past, the raiders still standing give up');
  same(tick(out.state, truck(0, 280)).requests.filter(item => item.type === 'clearWave').length, 0, 'and they are removed once');
  same(spawns(tick(out.state, truck(0, 280))).length, 0, 'an ambush she has passed never comes back');
  check(spawns(tick({}, truck(0, 280))).length === 0, 'an ambush already 60 m behind her does not appear at all');

  // A rest and a restart: the stretch starts again with its ambush back in place; finished stretches keep theirs.
  const second = tick({spawned: ['a', 'b'], gone: ['a'], raidSaid: true}, truck(150, 300, {pathIndex: 2})).state;
  out = tick(second, truck(150, 300, {pathIndex: 2, health: 0}));
  check(out.events.some(event => event.type === 'rest') && out.state.rested === true && out.state.restLeft === 2, 'at 0 health the truck rests (for the step\'s rest seconds)');
  same(out.requests.find(item => item.type === 'follow').speed, 0, 'and stands still');
  out = tick(out.state, truck(150, 300, {pathIndex: 2, health: 0}), 'medium', 1);
  check(!out.events.some(event => event.type === 'restarted') && out.state.restLeft === 1, 'the rest lasts its seconds');
  out = tick(out.state, truck(150, 300, {pathIndex: 2, health: 0}), 'medium', 1);
  out = tick(out.state, truck(150, 300, {pathIndex: 2, health: 0}), 'medium', 1);
  check(out.restart === true && out.events.some(event => event.type === 'restarted'), 'then that stretch starts again');
  same(out.state.spawned, ['a'], 'the ambush on the finished stretch stays done');
  same(out.state.gone, ['a'], 'and stays gone');
  same(out.requests.filter(item => item.type === 'clearWave').map(item => item.key), ['ambush:b'], 'the ambush on this stretch has its raiders taken away, to appear again');
  same(out.state.rested, false, 'and the truck may rest again at the next breakdown');
  out = tick(out.state, truck(150, 300, {pathIndex: 2, position: pos(0, 300)}));
  same(spawns(tick(out.state, truck(0, 300, {pathIndex: 2}))).length, 0, 'raiders already gone stay gone until she is within 160 m again');
  same(spawns(tick(out.state, truck(60, 300, {pathIndex: 2}))).map(item => item.key), ['ambush:b'], 'and the stretch\'s ambush is back in place when she comes within 160 m');
  check(!tick(out.state, truck(60, 300, {pathIndex: 2})).requests.some(item => item.type === 'say' && item.lineId === 'raid-line'),
    'the raid line is not said again after a restart');
}

// ---- 2. Raids in a real Duel: Everburn job 4 ------------------------------------------------------------------------
const FLAGS = {'hidden-road': true, arsenal: true, 'arsenal-wave3': true, 'warlord-cards': true, 'crew-gear': true};
const DT = 1 / 120;
function startJob(definition, difficulty, seed = 1) {
  const duel = new Duel({seed, featureFlags: FLAGS});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: 'falcone_f42', seed, cpuDifficulty: difficulty,
    opponents: [], weaponLoadout: ['bomb', 'crossbow', 'star'], arsenalRank: 9, job: {...definition, seed}}), true, `${definition.name} starts`);
  checks++;
  return duel;
}
const idle = {throttle: 0, brake: 1, steer: 0, boost: false, interact: false};
function run(duel, seconds) {
  for (let tick = 0; tick < Math.round(seconds / DT) && duel.state.status !== 'arena_result'; tick++) {
    if (duel.state.status === 'racing') duel.setInput(idle); else duel.setInput({...idle, brake: 0});
    duel.step(DT);
  }
}
const worldOf = duel => duel.state.arena.worldJob;
const bessOf = duel => worldOf(duel).actors.find(actor => actor.id === 'big-bess');
const raidersOf = duel => worldOf(duel).actors.filter(actor => actor.ambushKey);
function runUntil(duel, condition, seconds = 90) {
  for (let tick = 0; tick < Math.round(seconds / DT) && !condition(); tick++) {
    duel.setInput(duel.state.status === 'racing' ? idle : {...idle, brake: 0});
    duel.step(DT);
  }
  return condition();
}
{
  const job4 = EVERBURN_JOBS[3];
  const ambushes = job4.steps[0].ambushes;
  same(ambushes.map(item => [item.id, item.count]), [['ash-men-raid-1', 2], ['ash-men-raid-2', 2]], 'job 4 has its two ambushes of 2 raiders');
  check(!Object.hasOwn(job4.steps[0], 'raiders'), 'the unread raiders list is gone');
  same([job4.steps[0].speed, job4.steps[0].health, job4.steps[0].actor.health], [9, 100, 100], 'job 4 keeps Big Bess at 9 m a second and 100 health');

  for (const [difficulty, rate, count] of [['easy', 1.5, 1], ['medium', 5, 2], ['hard', 7, 2]]) {
    const duel = startJob(job4, difficulty);
    check(runUntil(duel, () => raidersOf(duel).length > 0 && duel.state.status === 'racing'), `${difficulty}: the first raid appears`);
    const raiders = raidersOf(duel), place = ambushes[0].place.position;
    same(raiders.length, count, `${difficulty}: ${count} raider${count === 1 ? '' : 's'} appear`);
    check(raiders.every(raider => Math.hypot(raider.x - place.x, raider.z - place.z) <= 12), `${difficulty}: they stand within 12 m of the place`);
    if (count === 2) {
      const road = alongPath(job4.steps[0].path, place).direction, side = raider => road.z * (raider.x - place.x) - road.x * (raider.z - place.z);
      check(side(raiders[0]) * side(raiders[1]) < 0, `${difficulty}: on both sides of the road`);
    }
    check(raiders.every(raider => raider.health > 0 && raider.crewId === 'tusk'), `${difficulty}: they are the foot raiders the well has`);
    check(raiders.every(raider => duel.state.raids.zones.some(zone => zone.raiders.includes(raider))), `${difficulty}: and sit in the game's raider list, so a car or a weapon knocks them down`);
    // Big Bess beside them wears: each raider standing within 30 m takes `rate` a second.
    const bess = bessOf(duel);
    Object.assign(bess.position, {x: place.x + 5, z: place.z + 5}); bess.health = 100; bess.stretchHealth = 100;
    worldOf(duel).follow.speed = 0;
    run(duel, 1);
    near(100 - bessOf(duel).health, count * rate, .15, `${difficulty}: ${count} raider(s) wear her by ${rate} each second`);
    // A knocked down raider does not wear her, and one 31 m away does not.
    raiders.forEach(raider => { raider.knockedDown = true; raider.knockdownRemaining = 9; });
    bessOf(duel).health = 100; run(duel, 1);
    near(bessOf(duel).health, 100, .001, `${difficulty}: raiders who are knocked down do not wear her`);
    raiders.forEach(raider => { raider.knockedDown = false; raider.knockdownRemaining = 0; });
    Object.assign(bessOf(duel).position, {x: place.x + 40, z: place.z + 40}); bessOf(duel).health = 100; run(duel, 1);
    near(bessOf(duel).health, 100, .001, `${difficulty}: raiders more than 30 m from her do not wear her`);
  }

  // Left alone on Medium Big Bess is worn to nothing, rests, and starts the stretch again with its raiders back.
  {
    const duel = startJob(job4, 'medium');
    runUntil(duel, () => raidersOf(duel).length > 0);
    const bess = bessOf(duel), place = ambushes[0].place.position;
    Object.assign(bess.position, {x: place.x + 4, z: place.z + 4});
    bess.health = 1; // two raiders at 5 a second each take it in a tenth of a second
    check(runUntil(duel, () => worldOf(duel).job.stepState.rested === true, 30), 'at 0 health Big Bess rests');
    check(bessOf(duel).health === 0, 'with no health left');
    check(runUntil(duel, () => worldOf(duel).job.stepState.rested === false && bessOf(duel).health > 0, 10), 'and the stretch starts again after the rest');
    same(Math.round(bessOf(duel).health), 100, 'with the health she had when she began it');
    const boneyard = job4.steps[0].path[0].position;
    near(Math.hypot(bessOf(duel).position.x - boneyard.x, bessOf(duel).position.z - boneyard.z), 0, 30, 'back at the last place she reached (she has moved off a little)');
    check(!bessOf(duel).atDestination, 'a restart is never an arrival');
    check(runUntil(duel, () => raidersOf(duel).length === 2 && raidersOf(duel).every(raider => raider.health > 0), 10), 'and the ambush is back in place');
    check(duel.state.status === 'racing', 'a run is never lost for good: the job is still going');
  }

  // Once she is 60 m past an ambush the raiders still standing are removed.
  {
    const duel = startJob(job4, 'medium');
    runUntil(duel, () => raidersOf(duel).length > 0);
    check(duel.state.raids.zones.length === 1, 'the camp is in the raider list');
    const bess = bessOf(duel), place = ambushes[0].place.position, path = job4.steps[0].path;
    const farther = alongPath(path, place).metres + 70, safe = path[1].position;
    check(farther < metresAtPlace(path, 1), 'the test place is on her first stretch');
    const a = path[0].position, b = path[1].position, length = Math.hypot(b.x - a.x, b.z - a.z);
    Object.assign(bess.position, {x: a.x + (b.x - a.x) * farther / length, z: a.z + (b.z - a.z) * farther / length});
    run(duel, .1);
    same(raidersOf(duel).length, 0, 'raiders still standing give up when she is 60 m past');
    same(duel.state.raids.zones.length, 0, 'and leave the raider list');
    void safe;
  }
}

console.log(`test-run-gas: ${checks} checks passed`);
