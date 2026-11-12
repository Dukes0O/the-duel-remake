// RUN-GAS (docs/board/cards/RUN-GAS.md): raids on an escort, the gas run's two roads, its feud table and its pay.
// Memory only: no save is read or written.
import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {stepEscort, alongPath, metresAtPlace, ambushRaiders, AMBUSH_ALERT_METRES, AMBUSH_GONE_METRES, AMBUSH_WEAR_METRES,
  AMBUSH_WEAR_PER_SECOND} from '../src/world/jobs/steps/escort.js';
import {GAS_RUN_PATHS, GAS_RUN_ROADS, GAS_RUN_SHARES, gasRunJob, gasRunLength, gasRunPay} from '../src/world/jobs/gas-run.js';
import {arenaReward} from '../src/arena/arena-settlement.js';
import {SCABLANDS_SOLIDS} from '../src/world/scablands-scene.js';

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

// ---- 3. The gas run's two roads, feud table, pay and clearance ------------------------------------------------------
{
  const at = places => places.map(item => [item.position.x, item.position.z]);
  same(at(GAS_RUN_PATHS.long), [[-424, 304], [-450, 40], [-300, -230], [-60, -380], [170, -340], [350, -200], [480, -90], [600, 0]],
    'the long road is the card\'s eight places, well to Tin Town');
  same(at(GAS_RUN_PATHS.boneyard), [[-424, 304], [-200, 350], [0, 370], [250, 415], [424, 304], [375, 325], [230, 150], [575, 62], [600, 0]],
    'the Boneyard road is the card\'s places with a bend after the Boneyard and Tin Town\'s gate before the town');
  same(GAS_RUN_ROADS, ['long', 'boneyard'], 'two roads');
  same([GAS_RUN_SHARES.long, GAS_RUN_SHARES.boneyard], [1, 2], 'the long road pays 1 share and the Boneyard road 2');
  near(gasRunLength('boneyard'), 1600, 60, 'the Boneyard road is about 1.6 km');
  near(gasRunLength('long'), 1640, 5, 'the long road, as the card\'s places lie, is 1.64 km (the card says about 1.9 km)');
  for (const road of GAS_RUN_ROADS) {
    const route = GAS_RUN_PATHS[road];
    check(route[0].id === 'everburn' && route.at(-1).id === 'tin-town', `${road}: from the well to Tin Town`);
  }

  // The card's feud table: raiders in each raid, per word and road. Easy has one fewer, never fewer than one.
  const counts = (road, feud, difficulty) => gasRunJob({road, feud, runs: 0, difficulty}).raids.map(item => item.count);
  same([1, 2, 3, 4].map(feud => counts('boneyard', feud, 'medium')), [[2], [2, 2], [2, 3, 2], [3, 3, 4]], 'Boneyard road raids: 2 / 2,2 / 2,3,2 / 3,3,4');
  same([1, 2, 3, 4].map(feud => counts('long', feud, 'medium')), [[], [], [2], [3]], 'long road raids: none / none / one of 2 / one of 3');
  same([1, 2, 3, 4].map(feud => counts('boneyard', feud, 'easy')), [[1], [1, 1], [1, 2, 1], [2, 2, 3]], 'Easy: one raider fewer in every raid, never fewer than one');
  same([1, 2, 3, 4].map(feud => counts('long', feud, 'easy')), [[], [], [1], [2]], 'and on the long road');
  same([1, 2, 3, 4].map(feud => counts('boneyard', feud, 'hard')), [[2], [2, 2], [2, 3, 2], [3, 3, 4]], 'Hard keeps the card\'s numbers');
  same(gasRunJob({road: 'long', feud: 1}).steps[0].ambushes.length + gasRunJob({road: 'long', feud: 2}).steps[0].ambushes.length, 0, 'the long road is quiet at Watching and Raiding');
  same(gasRunJob({road: 'boneyard', feud: 99}).feud, 4, 'a feud out of range is held to War party');
  same(gasRunJob({road: 'boneyard', feud: undefined}).feud, 2, 'a missing feud reads as Raiding');
  assert.throws(() => gasRunJob({road: 'sideways'}), RangeError); checks++;

  // The same save always gets the same run; two runs in a row are not alike; every place lies on its road.
  const places = job => job.steps[0].ambushes.map(item => [item.place.position.x, item.place.position.z]);
  for (const road of GAS_RUN_ROADS) for (const feud of [1, 2, 3, 4]) {
    for (const runs of [0, 1, 7, 40]) same(places(gasRunJob({road, feud, runs})), places(gasRunJob({road, feud, runs})), `${road} feud ${feud} run ${runs}: the same save gets the same run`);
    // The long road's one raid has one place by the card, so only the Boneyard road can vary.
    let alike = 0;
    for (let runs = 0; runs < (road === 'boneyard' ? 300 : 0); runs++) {
      const first = gasRunJob({road, feud, runs}), second = gasRunJob({road, feud, runs: runs + 1});
      if (first.steps[0].ambushes.length && JSON.stringify(places(first)) === JSON.stringify(places(second))) alike++;
    }
    same(alike, 0, `${road} feud ${feud}: no two runs in a row have the same raids`);
  }
  {
    const seen = new Set();
    for (let runs = 0; runs < 60; runs++) seen.add(JSON.stringify(places(gasRunJob({road: 'boneyard', feud: 2, runs}))));
    check(seen.size >= 10, `the Boneyard road's places vary from run to run (${seen.size} different pairs in 60 runs)`);
  }
  for (const road of GAS_RUN_ROADS) for (let runs = 0; runs < 40; runs++) for (const feud of [3, 4]) {
    const job = gasRunJob({road, feud, runs}), route = GAS_RUN_PATHS[road], step = job.steps[0];
    for (const ambush of step.ambushes) {
      const found = alongPath(route, ambush.place);
      if (found.gap > .2) { check(false, `${road}: ${ambush.id} lies ${found.gap.toFixed(1)} m off its road`); }
      check(found.metres > 150 && found.metres < gasRunLength(road) - 100, `${road}: ${ambush.id} is well inside the road`);
    }
    check(step.ambushes.every((item, index) => index === 0 || item.metres > step.ambushes[index - 1].metres + 100), `${road}: raids come in order along the road, 100 m or more apart`);
  }
  const longRaid = gasRunJob({road: 'long', feud: 3}).steps[0].ambushes[0];
  near(gasRunLength('long') - longRaid.metres, 110, 1, 'the long road\'s raid stands 110 m before Tin Town, where it comes nearest the Boneyard');

  // Big Bess keeps job 4's manners and her own actor id, drawn by the Scablands scene as before.
  const job = gasRunJob({road: 'boneyard', feud: 3, runs: 2, difficulty: 'medium'}), step = job.steps[0];
  same([step.actorId, step.actor.id, step.actor.renderCar, step.actor.escort, step.speed, step.health, step.actor.health, step.actor.speed],
    ['big-bess', 'big-bess', false, true, 9, 100, 100, 9], 'Big Bess: 9 m a second, 100 health, her own actor id and no stand-in car');
  same([job.storyId, job.kind, job.run, job.road, job.shares, step.kind, step.destination.id], ['everburn', 'escort', true, 'boneyard', 2, 'escort', 'tin-town'], 'the run is job 4\'s escort step');
  same([step.startLineId, step.raidLineId, step.restLineId], ['story.ember.moss.6', 'story.ember.moss.7', 'story.ember.moss.3'], 'start, raid and rest lines');
  same(step.arrival.thenLineIds, ['story.ember.auntie-solder.9'], 'a Boneyard run from Hunting ends with Auntie Solder\'s war party line');
  same([['long', 3], ['long', 4], ['boneyard', 1], ['boneyard', 2], ['boneyard', 4]].map(([road, feud]) => gasRunJob({road, feud}).steps[0].arrival.thenLineIds.length),
    [0, 0, 0, 0, 0], 'and no other run does');
  same(gasRunJob({road: 'long'}).steps[0].startLineId, 'story.ember.moss.5', 'the long road starts with Moss\'s long road line');

  // Pay: a share is what job 4 pays today (80 times the difficulty factor).
  for (const [difficulty, factor] of [['easy', 1], ['medium', 1.2], ['hard', 1.4]]) {
    const share = Math.round(80 * factor);
    same([gasRunPay('long', difficulty), gasRunPay('boneyard', difficulty)], [share, Math.round(160 * factor)], `${difficulty}: 1 share on the long road, 2 on the Boneyard road`);
    same(gasRunPay('long', difficulty), arenaReward({version: 1, venueId: 'scablands', mode: 'world-job', phase: 'over', participants: [{id: 'player'}],
      result: {placings: ['player'], winnerId: 'player', reason: 'job-complete'}, worldJob: {definition: EVERBURN_JOBS[3], job: {stepIndex: 1, steps: [{}]}}}, difficulty).total,
    `${difficulty}: one share is what job 4 pays`);
  }

  // Both roads clear every box in SCABLANDS_SOLIDS by 8 m. The road begins at the well, so its first piece is let touch the
  // well's own box and no other.
  const distanceToBox = (x, z, solid) => {
    const [cx, , cz] = solid.center, [width, , depth] = solid.size;
    return Math.hypot(Math.max(Math.abs(x - cx) - width / 2, 0), Math.max(Math.abs(z - cz) - depth / 2, 0));
  };
  for (const road of GAS_RUN_ROADS) {
    const points = GAS_RUN_PATHS[road].map(item => item.position);
    let tightest = Infinity;
    for (let piece = 0; piece < points.length - 1; piece++) {
      const a = points[piece], b = points[piece + 1], length = Math.hypot(b.x - a.x, b.z - a.z);
      for (const solid of SCABLANDS_SOLIDS) {
        if (solid.id === 'everburn-well' && piece === 0) continue;
        let closest = Infinity;
        for (let metres = 0; metres <= length; metres += .25) closest = Math.min(closest, distanceToBox(a.x + (b.x - a.x) * metres / length, a.z + (b.z - a.z) * metres / length, solid));
        tightest = Math.min(tightest, closest);
        check(closest >= 8, `${road}: piece ${piece + 1} clears ${solid.id} by 8 m (got ${closest.toFixed(1)})`);
      }
    }
    console.log(`Gas run, ${road} road: tightest clearance from a solid is ${tightest.toFixed(1)} m, length ${gasRunLength(road).toFixed(0)} m`);
  }
}

console.log(`test-run-gas: ${checks} checks passed`);
