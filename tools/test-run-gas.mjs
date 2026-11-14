// RUN-GAS (docs/board/cards/RUN-GAS.md): raids on an escort, the gas run's two roads, its feud table and its pay.
// Memory only: no save is read or written.
import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {damageRaider} from '../src/raiders.js';
import '../src/story/ember-lines.js'; // the Everburn's words, for the callouts read through the job code
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {stepEscort, alongPath, metresAtPlace, ambushRaiders, AMBUSH_ALERT_METRES, AMBUSH_GONE_METRES, AMBUSH_WEAR_METRES, AMBUSH_MIN_FROM_START_METRES,
  AMBUSH_WEAR_PER_SECOND} from '../src/world/jobs/steps/escort.js';
import {GAS_RUN_AMBUSH_METRES, GAS_RUN_PATHS, GAS_RUN_ROADS, GAS_RUN_SHARES, gasRunJob, gasRunLength, gasRunPay} from '../src/world/jobs/gas-run.js';
import {arenaReward} from '../src/arena/arena-settlement.js';
import {SCABLANDS_SOLIDS} from '../src/world/scablands-scene.js';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {finishArenaEvent} from '../src/arena/arena-event.js';
import {arenaResultsScreen} from '../src/screen-arena.js';
import {EMBER_JOBS, markEmberJob, markEmberRead, emberFeud, emberRuns} from '../src/story/ember-save.js';
import {emberStoryProps} from '../src/story/ember-road.js';
import {emberWallMarkup} from '../src/story/ember-ui.js';

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
// Stand an escorted truck `metres` along her road, heading for the place after that point.
function placeOnPath(truck, path, metres) {
  const points = path.map(item => item.position ?? item);
  let left = metres;
  for (let i = 1; i < points.length; i++) {
    const length = Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
    if (left <= length || i === points.length - 1) {
      Object.assign(truck.position, {x: points[i - 1].x + (points[i].x - points[i - 1].x) * left / length, z: points[i - 1].z + (points[i].z - points[i - 1].z) * left / length});
      truck.pathIndex = i;
      return;
    }
    left -= length;
  }
}
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
    const duel = startJob(job4, difficulty), warnings = [];
    duel.onChange((_state, event) => { if (event.raiderWarning) warnings.push(event.zone); });
    check(runUntil(duel, () => raidersOf(duel).length > 0 && duel.state.status === 'racing'), `${difficulty}: the first raid appears`);
    same(warnings, ['ambush:ash-men-raid-1'], `${difficulty}: with the existing raider warning, once`);
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
    const farther = alongPath(path, place).metres + 70;
    placeOnPath(bess, path, farther);
    run(duel, .1);
    same(raidersOf(duel).length, 0, 'raiders still standing give up when she is 60 m past');
    same(duel.state.raids.zones.length, 0, 'and leave the raider list');
  }
}

// ---- 2b. What play showed (RUN-GAS follow-ups): running raiders down, staying down, health after a rest, where ambushes stand ---
{
  const job4 = EVERBURN_JOBS[3], step4 = job4.steps[0], coast = {throttle: 0, brake: 0, steer: 0, boost: false, interact: false};
  // The car on a raider, at a speed, for one tick.
  const touch = (duel, raider, {mph, away = 0}) => {
    const at = duel.course.nearest(raider.x + away, raider.z);
    duel.state.s = at.s; duel.state.lateral = at.lateral; duel.state.speedMph = mph;
    duel.setInput(coast); duel.step(DT);
  };
  const apart = (duel, raider) => { const car = duel.course.worldAt(duel.state.s, duel.state.lateral); return Math.hypot(car.x - raider.x, car.z - raider.z); };
  {
    const duel = startJob(job4, 'medium'), knocks = [];
    duel.onChange((_state, event) => { if (event.raiderKnockdown) knocks.push(event.raider); });
    check(runUntil(duel, () => raidersOf(duel).length === 2 && duel.state.status === 'racing'), 'medium: two raiders appear');
    const [first, second] = raidersOf(duel);
    touch(duel, first, {mph: 12});
    check(apart(duel, first) <= 2.2, 'the test car is within 2.2 m of the raider');
    check(first.knockedDown === true && first.health === 0, 'a car at 5.4 m/s touching a raider knocks him down');
    same(knocks, [first.id], 'and the game counts the knock-down once');
    touch(duel, second, {mph: 6});
    check(second.knockedDown === false, 'a car at 2.7 m/s does not');
    touch(duel, second, {mph: 12, away: 3});
    check(apart(duel, second) > 2.2 && second.knockedDown === false, 'a fast car 3 m away does not');
    touch(duel, second, {mph: 8});
    check(second.knockedDown === false, 'a car at 3.6 m/s, just under 4 m/s, does not');
    touch(duel, second, {mph: 9.2});
    check(second.knockedDown === true, 'a car at 4.1 m/s does');
    // A raider knocked down stays down for the rest of that ambush.
    run(duel, 6);
    check(first.knockedDown === true && second.knockedDown === true, 'both stay down well past the 3 seconds a raider takes to get up elsewhere');
    check(raidersOf(duel).every(raider => raider.knockedDown), 'and they are still the ambush raiders');
  }
  {
    const duel = startJob(job4, 'medium');
    runUntil(duel, () => raidersOf(duel).length === 2);
    const [first, second] = raidersOf(duel);
    check(damageRaider(duel, first, 999, {source: 'crossbow', owner: 'player'}) === true && first.knockedDown, 'a weapon knocks a raider down');
    check(damageRaider(duel, second, 999, {source: 'flamethrower', owner: 'player'}) === true && second.knockedDown, 'so does the flamethrower');
    run(duel, 6);
    check(first.knockedDown && second.knockedDown, 'and he stays down for the rest of the ambush');
    // The next ambush's raiders are standing: only the knocked-down ones of an ambush stay down.
    const place2 = step4.ambushes[1].place.position, path = step4.path;
    placeOnPath(bessOf(duel), path, alongPath(path, place2).metres - 100);
    check(runUntil(duel, () => raidersOf(duel).some(raider => raider.id.startsWith('ambush:ash-men-raid-2')), 5), 'the second ambush appears');
    check(raidersOf(duel).filter(raider => raider.id.startsWith('ambush:ash-men-raid-2')).every(raider => !raider.knockedDown), 'with its raiders standing');
  }
  {
    // Outside escort ambushes nothing about raiders changes: job 6's well raiders still get up after their 3 seconds.
    const duel = startJob(EVERBURN_JOBS[5], 'medium');
    check(runUntil(duel, () => worldOf(duel).waveZones?.['0:0']?.raiders.length > 0 && duel.state.status === 'racing', 30), 'job 6: the first wave appears');
    const raider = worldOf(duel).waveZones['0:0'].raiders[0];
    check(!raider.ambushKey, 'a well raider is not an ambush raider');
    check(damageRaider(duel, raider, 999, {source: 'crossbow', owner: 'player'}) === true && raider.knockedDown, 'job 6: a raider is knocked down');
    run(duel, 4);
    check(raider.knockedDown === false && raider.health > 0, 'job 6: and gets up again after 3 seconds, as before');
    // A car does not knock a well raider down.
    const standing = worldOf(duel).waveZones['0:0'].raiders.find(item => !item.knockedDown);
    touch(duel, standing, {mph: 20});
    check(standing.knockedDown === false, 'job 6: a car touching a well raider does nothing');
  }

  // After a rest Big Bess has at least 60 health, and more if she had more when the stretch began.
  for (const [began, expected] of [[100, 100], [90, 90], [60, 60], [59, 60], [20, 60], [1, 60]]) {
    const duel = startJob(job4, 'medium');
    runUntil(duel, () => raidersOf(duel).length > 0);
    const bess = bessOf(duel);
    bess.stretchHealth = began; bess.health = 0;
    check(runUntil(duel, () => worldOf(duel).job.stepState.rested === false && bessOf(duel).health > 0, 12), `rest ${began}: she restarts`);
    near(bessOf(duel).health, expected, 1, `a stretch begun with ${began} health restarts with ${expected}`);
  }

  // Where ambushes stand: none within 180 m of the start along the road, on job 4 and on every road, feud and run sampled.
  {
    const firstAmbush = step4.ambushes[0];
    same([firstAmbush.place.position.x, firstAmbush.place.position.z], [278, 188], 'job 4\'s first ambush stands at (278, 188)');
    near(alongPath(step4.path, firstAmbush.place).gap, 0, .5, 'on her road');
    check(step4.ambushes.every(item => alongPath(step4.path, item.place).metres >= AMBUSH_MIN_FROM_START_METRES), 'no ambush of job 4 within 180 m of its start');
    near(alongPath(step4.path, firstAmbush.place).metres, 186, 1, 'the first is 186 m along her road');
    let sampled = 0;
    for (const road of GAS_RUN_ROADS) for (let feud = 1; feud <= 4; feud++) for (let runs = 0; runs < 200; runs++) {
      const job = gasRunJob({road, feud, runs});
      for (const ambush of job.steps[0].ambushes) {
        sampled++;
        if (alongPath(job.steps[0].path, ambush.place).metres < AMBUSH_MIN_FROM_START_METRES) check(false, `${road} feud ${feud} run ${runs}: an ambush within 180 m of the start`);
      }
    }
    check(sampled > 1000, `no ambush within 180 m of the start on ${sampled} sampled ambushes (every road, feud and 200 run counts)`);
    check([...GAS_RUN_AMBUSH_METRES.boneyard, ...GAS_RUN_AMBUSH_METRES.long].every(metres => metres >= AMBUSH_MIN_FROM_START_METRES), 'and every place in the fixed lists is at least 180 m along');
  }

  // The flamethrower is lent for job 4 and for every run, as job 1 lends it.
  {
    check(EVERBURN_JOBS[0].steps[0].lentWeapon === 'flamethrower' && step4.lentWeapon === 'flamethrower', 'job 1 and job 4 lend the flamethrower');
    for (const road of GAS_RUN_ROADS) check(gasRunJob({road, feud: 2}).steps[0].lentWeapon === 'flamethrower', `the ${road} road lends the flamethrower`);
    const duel = startJob(gasRunJob({road: 'boneyard', feud: 2, runs: 0, difficulty: 'medium'}), 'medium');
    same(worldOf(duel).activeLoan, 'flamethrower', 'a run in a real Duel has the flamethrower on loan');
    check(duel.state.weaponLoadout.includes('flamethrower'), 'and in the car\'s slots');
  }
}

// ---- 2c. An ambush that is never cleared gives up after two rests on its stretch (a run never loops for ever) ------------------
{
  // As pure numbers: two rests on the same stretch, the raiders give up as she sets off the third time and do not come back.
  const path = [pos(0, 0), pos(0, 300), pos(300, 300)];
  const step = {kind: 'escort', actorId: 'bess', path, speed: 9, destination: pos(300, 300), restLineId: 'rest', restSeconds: 0, giveUpLineId: 'give-up',
    ambushes: [{id: 'a', place: pos(12, 200), count: 3}, {id: 'b', place: pos(200, 312), count: 1}]};
  const tick = (state, actor, dt = 1 / 60) => { const out = stepEscort(step, state, {actors: [actor], difficulty: 'medium'}, dt); return {...out, state: {...state, ...out.state}}; };
  const truck = (x, z, pathIndex, health = 100) => ({id: 'bess', position: pos(x, z), health, pathIndex, pathProgress: .5});
  let out = tick({}, truck(0, 100, 1));
  check(out.requests.some(item => item.type === 'spawnWave' && item.key === 'ambush:a'), 'the ambush appears');
  const said = () => out.requests.filter(item => item.type === 'say' && item.lineId === 'give-up').length;
  // First rest on stretch 1: the ambush is put back, no line.
  out = tick(out.state, truck(0, 190, 1, 0)); out = tick(out.state, truck(0, 190, 1, 0));
  check(out.restart === true && said() === 0 && !out.state.gone.includes('a'), 'after the first rest the ambush is put back, with no line');
  same(out.requests.filter(item => item.type === 'clearWave').map(item => item.key), ['ambush:a'], 'its raiders are taken away to appear again');
  out = tick(out.state, truck(0, 100, 1));
  check(out.requests.some(item => item.type === 'spawnWave' && item.key === 'ambush:a'), 'and it comes back at 160 m');
  // Second rest on the same stretch: the ambush gives up, once, and is never put back.
  out = tick(out.state, truck(0, 190, 1, 0)); out = tick(out.state, truck(0, 190, 1, 0));
  check(out.restart === true && said() === 1, 'after the second rest Moss says the ambush has given up');
  check(out.state.gone.includes('a') && out.state.spawned.includes('a'), 'it is gone for good');
  same(out.requests.filter(item => item.type === 'clearWave').map(item => item.key), ['ambush:a'], 'its raiders still standing are removed as she sets off');
  same(out.events.filter(item => item.type === 'ambushGaveUp').length, 1, 'and the step says so in an event');
  out = tick(out.state, truck(0, 100, 1));
  check(!out.requests.some(item => item.type === 'spawnWave' && item.key === 'ambush:a'), 'she sets off the third time and the ambush does not come back');
  // The ambush on the later stretch is not touched.
  out = tick(out.state, truck(150, 300, 2));
  check(out.requests.some(item => item.type === 'spawnWave' && item.key === 'ambush:b'), 'the ambush on the next stretch still appears');
  // The line is said once for the stretch even if she were to rest there again.
  out = tick(out.state, truck(0, 190, 1, 0)); out = tick(out.state, truck(0, 190, 1, 0));
  check(said() === 0, 'the line is not said again for the same stretch');
  // Rests on different stretches are counted apart.
  const two = {spawned: ['a', 'b'], gone: ['a'], stretchRests: {1: 1}};
  let other = tick(two, truck(150, 300, 2, 0)); other = tick(other.state, truck(150, 300, 2, 0));
  check(!other.state.gone.includes('b') && other.state.stretchRests[2] === 1, 'a first rest on another stretch does not make its ambush give up');
}
{
  // In a real Duel: job 4's first ambush with four raiders, never cleared (the player does not fight), on Medium. She rests at it twice,
  // the raiders give up, Moss says so once, and she arrives.
  const job4 = EVERBURN_JOBS[3], step4 = job4.steps[0];
  const lethal = {...job4, steps: [{...step4, ambushes: [{id: 'only', place: step4.ambushes[0].place, count: 4}]}]};
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const duel = startJob(lethal, difficulty), lines = [];
    const callout = duel._callout.bind(duel); duel._callout = (text, seconds) => { lines.push(String(text)); return callout(text, seconds); };
    let rests = 0, gaveUp = 0;
    for (let tick = 0; tick < Math.round(900 / DT) && duel.state.status !== 'arena_result'; tick++) {
      duel.setInput(duel.state.status === 'racing' ? idle : {...idle, brake: 0});
      duel.step(DT);
      const events = worldOf(duel).job.events;
      if (events.some(event => event.type === 'rest')) rests++;
      if (events.some(event => event.type === 'ambushGaveUp')) gaveUp++;
    }
    const arrived = worldOf(duel).job.done && duel.state.arena.result?.reason === 'job-complete';
    check(arrived, `${difficulty}: a run whose ambush is never cleared still arrives`);
    if (difficulty === 'easy') check(rests <= 2, 'easy: it needs no more than two rests');
    else same([rests, gaveUp], [2, 1], `${difficulty}: after exactly two rests at that ambush it gives up`);
    if (difficulty !== 'easy') {
      same(lines.filter(text => text === 'Moss: They have had enough of waiting. Go, go, go.').length, 1, `${difficulty}: and Moss says so once`);
      check(raidersOf(duel).length === 0, `${difficulty}: no raider is left standing at the end`);
    }
    const bess = bessOf(duel);
    check(bess.health >= 0 && bess.atDestination === true, `${difficulty}: she is at Tin Town with the health she has (${Math.round(bess.health)})`);
  }
}

// ---- 3. The gas run's two roads, feud table, pay and clearance ------------------------------------------------------
{
  const at = places => places.map(item => [item.position.x, item.position.z]);
  same(at(GAS_RUN_PATHS.long), [[-424, 304], [-450, 40], [-300, -230], [-60, -380], [170, -340], [350, -200], [480, -90], [600, 0]],
    'the long road is the card\'s eight places, well to Tin Town');
  same(at(GAS_RUN_PATHS.boneyard), [[-424, 304], [-200, 350], [0, 370], [250, 415], [447, 308], [575, 112], [575, 62], [600, 0]],
    'the Boneyard road goes from the Boneyard to a place 50 m south of Tin Town\'s gate, straight north through it, and on to the town');
  check(!at(GAS_RUN_PATHS.boneyard).some(([x, z]) => x === 230 && z === 150), 'and never doubles back to the safe road');
  same(GAS_RUN_ROADS, ['long', 'boneyard'], 'two roads');
  same([GAS_RUN_SHARES.long, GAS_RUN_SHARES.boneyard], [1, 2], 'the long road pays 1 share and the Boneyard road 2');
  // Re-recorded: the road now comes up to a place at (575, 112) and goes straight north through the gate's opening, in place
  // of running diagonally to the gate's middle: the last two pieces are 6.8 m longer (1,252 m before).
  near(gasRunLength('boneyard'), 1259, 5, 'the Boneyard road is about 1.26 km (the road no longer doubles back)');
  check(gasRunLength('boneyard') < gasRunLength('long') - 300, 'and 300 m or more shorter than the long road: short and dangerous, or long and safe');
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
  same([gasRunJob({road: 'long'}).steps[0].what, step.what], ['Keep Big Bess safe on the long road to Tin Town.', 'Keep Big Bess safe on the Boneyard road to Tin Town.'], 'each run\'s line on screen is a whole sentence naming its road');

  // Pay: a share is what job 4 pays today (80 times the difficulty factor).
  for (const [difficulty, factor] of [['easy', 1], ['medium', 1.2], ['hard', 1.4]]) {
    const share = Math.round(80 * factor);
    same([gasRunPay('long', difficulty), gasRunPay('boneyard', difficulty)], [share, Math.round(160 * factor)], `${difficulty}: 1 share on the long road, 2 on the Boneyard road`);
    same(gasRunPay('long', difficulty), arenaReward({version: 1, venueId: 'scablands', mode: 'world-job', phase: 'over', participants: [{id: 'player'}],
      result: {placings: ['player'], winnerId: 'player', reason: 'job-complete'}, worldJob: {definition: EVERBURN_JOBS[3], job: {stepIndex: 1, steps: [{}]}}}, difficulty).total,
    `${difficulty}: one share is what job 4 pays`);
  }

  // Both roads clear every box in SCABLANDS_SOLIDS by 8 m. The road begins at the well, so its first piece is let touch the
  // well's own box and no other; it ends at Tin Town's centre, so its last piece is let end inside the town's own box (the box stands on the
  // drawn town since the fourth round of EVERBURN-PLAY-FIXES; it stood 46 m west of it before) and touches no other.
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
        // An opening is meant to be driven through: a road that passes through Tin Town's gate keeps at least 3.4 m from each of
        // the gate's two post boxes (the opening is 9 m, Big Bess is 2.8 m wide, the boxes are the posts' own 2.1 m). Every other
        // solid keeps 8 m from every road.
        // The last piece ends in Tin Town, inside the town's own box: it may touch that box (0 m) and no other.
        const needed = solid.id === 'tin-town-shell' && piece === points.length - 2 ? 0 : /^tin-town-gate-post-/.test(solid.id) ? 3.4 : 8;
        check(closest >= needed, `${road}: piece ${piece + 1} clears ${solid.id} by ${needed} m (got ${closest.toFixed(1)})`);
      }
    }
    console.log(`Gas run, ${road} road: tightest clearance from a solid is ${tightest.toFixed(1)} m, length ${gasRunLength(road).toFixed(0)} m`);
  }
}

// ---- 4. The wall, starting a run, and finishing one, in a real App ---------------------------------------------------
{
  const values = new Map();
  globalThis.localStorage = {getItem: key => values.get(String(key)) ?? null, setItem: (key, value) => values.set(String(key), String(value)),
    removeItem: key => values.delete(String(key))};
  globalThis.cancelAnimationFrame ??= () => {};
  const metric = (label, value) => `<m>${label}:${value}</m>`, action = (label, verb, primary = false) => `<button data-action="${verb}"${primary ? ' data-primary="true"' : ''}>${label}</button>`;
  // An App in the yard with the Everburn story at `jobs` jobs won and the given switches.
  function yard({jobs = 6, on = ['story-everburn', 'scablands-runs'], extra = {}} = {}) {
    values.clear();
    const app = new App(); app.audio.unlock = () => {};
    // Both Everburn switches are on in the game since 13 November 2026, so a switch not in `on` is asked to be off.
    app.duel.featureFlags = createFeatureFlags({storage: null, overrides: {'story-everburn': false, 'scablands-runs': false, ...Object.fromEntries([...['hidden-road', 'arsenal', 'arsenal-wave3', 'warlord-cards'], ...on].map(name => [name, true]))}});
    let profile = {...app.profile, wasteland: {...app.profile.wasteland, version: 1, discoveredGate: true}};
    profile = markEmberRead(profile).profile;
    for (const id of EMBER_JOBS.slice(0, jobs)) profile = markEmberJob(profile, id).profile;
    if (Object.keys(extra).length) profile = {...profile, story: {...profile.story, ember: {...profile.story.ember, ...extra}}};
    app.profile = profile;
    assert.equal(app._saveProfile(), true); checks++;
    const state = app.duel.state; state.status = 'exploring'; state.playerId = app.player.id;
    state.hiddenRoadJourney = {id: 'test-yard', phase: 'arrived', departed: true}; state.wastelandGateDiscovered = true;
    assert.equal(app.isYardHomeActive(), true); checks++;
    return app;
  }
  const wallOf = app => emberWallMarkup(app.storyProps('ember'));
  const finish = (app, reason = 'job-complete', winner = 'player') => {
    const worldJob = app.duel.state.arena.worldJob;
    if (winner === 'player') { worldJob.job.stepIndex = worldJob.job.steps.length; worldJob.job.done = true; }
    finishArenaEvent(app.duel, reason, winner);
    return app.duel.state.arena.result;
  };

  // The wall: nothing without both switches and the sixth job.
  for (const [label, options] of [['with its switch off', {on: ['story-everburn']}], ['without the Everburn switch', {on: ['scablands-runs']}],
    ['before job 6 is won', {jobs: 5}], ['with no job won', {jobs: 0}]]) {
    const app = yard(options), before = JSON.stringify(app.profile);
    check(!/GAS RUN|data-ember-run|ember-run-buttons/.test(wallOf(app)), `the wall has no gas run ${label}`);
    check(app.gasRunAvailable() === false && app.gasRun('boneyard') === false && app.gasRun('long') === false, `a run cannot start ${label}`);
    check(app.duel.state.arena == null, `no job was started ${label}`);
    same(JSON.stringify(app.profile), before, `the save is untouched ${label}`);
    app.dispose?.();
  }
  {
    // With the run's switch off the wall is exactly what it was before this card: the same markup as an old wall.
    const app = yard({on: ['story-everburn']});
    same(wallOf(app), emberWallMarkup(emberStoryProps(app.profile, {available: true})), 'the wall with the switch off is the old wall');
    app.dispose?.();
  }
  // The wall with the run on: the entry, the feud's sentence and two buttons with their pay.
  const sentences = ['The Ash Men are watching the Boneyard road.', 'The Ash Men are raiding the Boneyard road.', 'The Ash Men are hunting Big Bess.', 'The Ash Men have gathered a war party.'];
  for (const [feud, sentence] of sentences.map((text, index) => [index + 1, text])) {
    // FIELD-BATTLE-ASH: at War party with the furnace alive the wall and the Boneyard button are the battle's (tools/test-field-battle.mjs).
    // This loop is the ordinary run's wall, so at War party it is the one with the furnace already dead; every assertion is as it was.
    const app = yard({extra: {feud, runs: 3, ...(feud === 4 ? {furnaceDead: true} : {})}}); app.cpuDifficulty = 'easy';
    const wall = wallOf(app);
    check(wall.includes('GAS RUN') && wall.includes(sentence), `feud ${feud}: the wall says "${sentence}"`);
    same((wall.match(/data-ember-run="/g) || []).length, 2, `feud ${feud}: two road buttons`);
    check(wall.includes('data-ember-run="long"><span>LONG ROAD</span><small>80 scrap</small>') &&
      wall.includes('data-ember-run="boneyard"><span>BONEYARD ROAD</span><small>160 scrap</small>'), `feud ${feud}: each button shows its pay (80 and 160 on Easy)`);
    check(/class="story-step is-open is-run" data-ember-job="gas-run"/.test(wall) && !/is-done[^>]*data-ember-job="gas-run"/.test(wall), `feud ${feud}: the entry is open and never done, so it shows no tick`);
    check(!(wall.match(/data-ember-step="/g) || []).length, `feud ${feud}: the six jobs have no button once all are won`);
    app.dispose?.();
  }
  {
    const app = yard({extra: {feud: 2}}); app.cpuDifficulty = 'medium';
    check(wallOf(app).includes('<small>96 scrap</small>') && wallOf(app).includes('<small>192 scrap</small>'), 'pay on the buttons follows the difficulty (96 and 192 on Medium)');
    same(app.storyProps('ember').run.runs, 0, 'a save with no runs reads 0');
    app.dispose?.();
  }

  // Starting a run enters the Scablands the way a story job does.
  for (const road of GAS_RUN_ROADS) {
    const app = yard({extra: {feud: 3, runs: 2}});
    check(app.gasRun('sideways') === false, 'an unknown road does not start');
    check(app.gasRun(road) === true, `${road}: the run starts`);
    const arena = app.duel.state.arena, definition = arena.worldJob.definition;
    same([arena.mode, arena.venueId, definition.id, definition.road, definition.run, definition.feud, definition.runs],
      ['world-job', 'scablands', `gas-run-${road}`, road, true, 3, 2], `${road}: a Scablands world job built from the save's feud and run count`);
    same(definition.steps[0].ambushes.map(item => item.place.position), gasRunJob({road, feud: 3, runs: 2}).steps[0].ambushes.map(item => item.place.position), `${road}: the same save gets the same ambush places`);
    check(arena.worldJob.job.steps[0].kind === 'escort' && arena.worldJob.job.steps[0].actorId === 'big-bess', `${road}: it is the escort of Big Bess`);
    app.dispose?.();
  }

  // Arriving pays the shares, moves the feud, counts the run; leaving or failing changes nothing.
  for (const [road, feud, runs, after, share] of [['boneyard', 2, 0, 3, 2], ['long', 3, 4, 2, 1], ['boneyard', 4, 1, 4, 2], ['long', 1, 0, 1, 1]]) {
    // FIELD-BATTLE-ASH: a Boneyard run from War party is the battle while the furnace lives; this is the ordinary run, so the furnace is dead.
    const app = yard({extra: {feud, runs, ...(feud === 4 ? {furnaceDead: true} : {})}}), scrap = app.profile.wasteland.scrap, factor = {easy: 1, medium: 1.2, hard: 1.4}[app.cpuDifficulty];
    check(app.gasRun(road), `${road} from feud ${feud}: starts`);
    const result = finish(app);
    same(result.settlementSaved, true, `${road} from feud ${feud}: the arrival settles`);
    same(result.scrapEarned, Math.round(80 * share * factor), `${road} from feud ${feud}: pays ${share} share${share === 1 ? '' : 's'}`);
    same(app.profile.wasteland.scrap - scrap, Math.round(80 * share * factor), `${road} from feud ${feud}: and the scrap is in the save`);
    same([emberFeud(app.profile), emberRuns(app.profile)], [after, runs + 1], `${road} from feud ${feud}: the feud is ${after} and the run count rises by one`);
    same(result.gasRun, {road, feud: after, word: ['Watching', 'Raiding', 'Hunting', 'War party'][after - 1], runs: runs + 1, reachedWarParty: feud < 4 && after === 4}, `${road} from feud ${feud}: the result says where it stands`);
    same(app.profile.story.ember.jobs, EMBER_JOBS.slice(), `${road}: the six jobs are as they were`);
    check(!Object.hasOwn(result, 'emberJob'), `${road}: a run is not one of the six jobs`);
    const screen = arenaResultsScreen(app.duel.state, {metric, action, escapeHTML: String});
    check(screen.title === 'GAS RUN' && screen.description.startsWith('Big Bess is in Tin Town. The Ash Men'), `${road}: the result screen names the run`);
    check(screen.metrics.includes('SCRAP EARNED') && screen.metrics.includes('THE ASH MEN') && screen.metrics.includes(`GAS RUNS:${runs + 1}`), `${road}: with the scrap, the Ash Men and the runs`);
    check(screen.actions.includes('DRIVE ANOTHER RUN') && !/NEXT JOB/.test(screen.actions), `${road}: and no next job`);
    const paid = app.profile.wasteland.scrap;
    check(app._settleArenaResult({result}, app.duel.state) === false && app.profile.wasteland.scrap === paid && emberRuns(app.profile) === runs + 1, `${road}: a second settle changes nothing`);
    app.dispose?.();
  }
  for (const [label, reason, winner] of [['failing', 'job-failed', 'raiders'], ['leaving', 'job-quit', 'raiders']]) {
    const app = yard({extra: {feud: 2, runs: 5}}), before = JSON.stringify(app.profile.story);
    check(app.gasRun('boneyard'), `${label}: starts`);
    const result = finish(app, reason, winner);
    check(!result.gasRun, `${label}: no run arrived`);
    same(JSON.stringify(app.profile.story), before, `${label}: the whole story save is untouched`);
    same([emberFeud(app.profile), emberRuns(app.profile)], [2, 5], `${label}: still Raiding and 5 runs`);
    const screen = arenaResultsScreen(app.duel.state, {metric, action, escapeHTML: String});
    check(/world-job-retry/.test(screen.actions), `${label}: offers the run again`);
    app.dispose?.();
  }
  {
    // With the run's switch switched off during a run, an arrival writes nothing (nothing changes when the switch is off).
    const app = yard({extra: {feud: 2, runs: 1}});
    check(app.gasRun('long'));
    app.duel.featureFlags = createFeatureFlags({storage: null, overrides: {'hidden-road': true, 'story-everburn': true, 'scablands-runs': false, arsenal: true, 'arsenal-wave3': true}});
    finish(app);
    same([emberFeud(app.profile), emberRuns(app.profile)], [2, 1], 'an arrival with the switch off moves nothing');
    app.dispose?.();
  }
  {
    // A save with a damaged feud and runs reads as Raiding and 0 on the wall and in a run.
    const app = yard({extra: {feud: 'x', runs: -4}});
    check(wallOf(app).includes('The Ash Men are raiding the Boneyard road.'), 'a damaged feud reads as Raiding on the wall');
    check(app.gasRun('boneyard') && app.duel.state.arena.worldJob.definition.feud === 2 && app.duel.state.arena.worldJob.definition.runs === 0, 'and starts a run at Raiding, run 0');
    app.dispose?.();
  }
}

console.log(`test-run-gas: ${checks} checks passed`);
