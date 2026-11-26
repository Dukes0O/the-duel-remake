// Memory-only checks of the open road's rule and its native arena adapter.
import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {bankHearth} from '../src/story/ledger.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {arenaActor, arenaParticipant} from '../src/combat-teams.js';
import {placeActor} from '../src/arena/arena-event.js';
import {worldPose} from '../src/arena/arena-floor.js';
import {EVERBURN_JOBS, EVERBURN_SIDE_JOBS} from '../src/world/jobs/everburn.js';
import {GAS_RUN_ROADS, fieldBattleJob, gasRunJob} from '../src/world/jobs/gas-run.js';
import {night2Job} from '../src/world/jobs/night-2.js';
import {openTownJobs, townJobDefinition} from '../src/world/jobs/town-jobs.js';
import {createTown} from '../src/town/town-state.js';
import {LAND, createLand, movedTable} from '../src/world/scablands-names.js';
import {ROAD_NET, onRoadPoints} from '../src/world/scablands-road.js';
import {beginOpenLand, holdOpenLand, releaseOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {holdsOfJob, isHeld, USUAL_HOLDS} from '../src/world/open/holds.js';
import {arrivalChance, buildCheckpoints, drawCheckpoint, friendlyCamps, gap, OPEN_CHECKPOINTS} from '../src/world/open/checkpoint-rule.js';
import {favoursOf, feudOf} from '../src/world/open/open-record.js';
import {checkpointsPart} from '../src/world/open/parts/checkpoints.js';
import {openRoamJob} from '../src/world/open/roam-job.js';
import {sampleWorld} from '../src/world/open/samples.js';
import {approach, pageFunctions, pageSource, seed} from './scenarios/open-checkpoint.mjs';

const DT = 1 / 60;
const mall = OPEN_CHECKPOINTS.find(row => row.id === 'mall-road-1');
const east = OPEN_CHECKPOINTS.find(row => row.id === 'east-road-1');
const rats = OPEN_CHECKPOINTS.find(row => row.id === 'mall-road-2');
const original = () => sampleWorld('first-night');
const roam = world => ({...openRoamJob({}, world.seed), open:{world}});
const choice = (world, id, effects) => applyEffects(world, {id:'qa/' + id, effects}).world;
const priorCrossing = world => choice(world, 'previous', [{type:'crossing', checkpoint:east.id}]);
const openAt = (open, at, view = {}, dt = DT) => stepOpenLand(open, {
  player:at, carPosition:at, difficulty:'easy', checkpointsEnabled:true, ...view,
}, dt, [checkpointsPart]);

assert.equal(OPEN_CHECKPOINTS.length, 26);
for (const row of OPEN_CHECKPOINTS) {
  assert.equal(row.radius, 180);
  assert(gap(row.position, LAND.at('tin-town')) >= 1500, row.id);
  assert(gap(row.position, LAND.yard) >= 1000, row.id);
  for (const other of OPEN_CHECKPOINTS) if (row !== other) assert(gap(row.position, other.position) >= 900, row.id);
  for (const crossing of ['the-wash', 'south-ford']) assert(gap(row.position, LAND.at(crossing)) > row.radius, row.id);
  if (row.at.road) assert(onRoadPoints(row.position.x, row.position.z, ROAD_NET.road(row.at.road)), row.id);
}
const moved = createLand(movedTable(LAND.table, 'dead-mall', 10, 30));
assert(gap(buildCheckpoints(moved).find(row => row.id === mall.id).position, mall.position) > 1);

{
  const recorded = priorCrossing(original());
  const draw = (seed, count, difficulty = 'easy') => drawCheckpoint(mall, {...recorded, seed}, count, {difficulty});
  assert.deepEqual(draw(seed, 1), draw(seed, 1));
  assert.deepEqual(draw(seed, 1), {group:'road-rats', kind:'fight', count:2, bait:false, scout:false});
  assert.notDeepEqual(draw(seed, 1), draw(seed + 1, 1));
  assert.notDeepEqual(draw(seed, 1), draw(seed, 2));
  for (let seed = 1; seed <= 128; seed++) {
    assert((draw(seed, 1)?.count ?? 0) <= 2);
    assert((draw(seed, 1, 'hard')?.count ?? 0) <= 4);
    const first = drawCheckpoint(mall, {...original(), seed}, 1);
    assert.equal(first.kind, 'pass');
    assert.equal(first.count, 1);
  }
  const raised = choice(recorded, 'raised', [{type:'feud', of:'road-rats', by:1}, {type:'roadWord', by:2}]);
  assert(Math.abs(arrivalChance(rats, raised, []) - .61) < 1e-12);
  assert(Math.abs(arrivalChance(rats, raised, [{position:{...rats.position, z:rats.position.z + 1800}}]) - .51) < 1e-12);
}

{
  const town = createTown(4, 'Memory town');
  town.story = {facts:{wellBuilt:true, salvageDelivered:true, soupBuilt:true, latrineBuilt:true, winterPassed:true},
    completed:{'town.act1.salvage':true, 'town.act1.winter':true}};
  const townJobs = openTownJobs(town).map(({id}) => townJobDefinition(town, id));
  assert(townJobs.length);
  const jobs = [night2Job(4), night2Job(4, {washFight:true}),
    ...GAS_RUN_ROADS.map(road => gasRunJob({road})), fieldBattleJob({runs:4}),
    ...EVERBURN_JOBS, ...EVERBURN_SIDE_JOBS, ...townJobs];
  for (const job of jobs) {
    assert.deepEqual(holdsOfJob(job), USUAL_HOLDS, job.id);
    assert(isHeld(beginOpenLand({...job, open:{world:original()}}).holds, 'checkpoints'), job.id);
  }
  assert.deepEqual(holdsOfJob(roam(original())), []);
  assert.deepEqual(holdsOfJob({...jobs[0], holds:[]}), []);
  const two = holdOpenLand(holdOpenLand(beginOpenLand(roam(original())), 'thread/one'), 'thread/two');
  const one = releaseOpenLand(two, 'thread/one');
  const underHold = openAt(one, mall.position);
  assert.equal(underHold.requests.length, 0);
  assert.deepEqual(underHold.open.world.open.crossings, {});
  assert.equal(openAt(releaseOpenLand(underHold.open, 'thread/two'), mall.position).requests.length, 0,
    'a car already in the circle must leave and cross again');
}

{
  const start = beginOpenLand(roam(original()));
  const entered = openAt(start, mall.position);
  assert(entered.requests.some(request => request.action === 'start' && request.phase === 'pass'));
  assert(entered.requests.some(request => request.cue === 'open.encounter.near'));
  assert.equal(entered.open.world.open.crossings[mall.id], 1);
  assert(entered.open.world.open.resting.includes(mall.id));
  const id = entered.open.parts.checkpoints.encounter.id;
  const out = openAt(holdOpenLand(entered.open, 'thread/one'), mall.position,
    {road:{id, cars:[{...mall.position, visible:true}]}});
  assert(out.requests.some(request => request.action === 'leave'));
  assert(!out.requests.some(request => request.action === 'clear'));
  const seen = openAt(out.open, mall.position, {road:{id, cars:[{...mall.position, visible:true}]}});
  assert.equal(seen.requests.length, 0);
  const gone = openAt(seen.open, approach, {road:{id, cars:[{...mall.position, visible:false}]}});
  assert(gone.requests.some(request => request.action === 'clear'));
  const restarted = beginOpenLand(roam(gone.open.world));
  assert.equal(openAt(restarted, mall.position).open.world.open.crossings[mall.id], 1);
  const banked = openAt(restarted, approach, {jobEvents:[{type:'hearthBanked'}]});
  assert.deepEqual(banked.open.world.open.resting, []);
  const recorded = restarted.world;
  const nextNight = {...recorded, ledger:bankHearth(recorded.ledger).ledger};
  assert.deepEqual(openAt(beginOpenLand(roam(nextNight)), approach).open.world.open.resting, [],
    'a hearth bank between jobs clears the prior night’s rests');
  assert.equal(openAt(banked.open, mall.position).open.world.open.crossings[mall.id], 2);

  const world = sampleWorld('helped-camp');
  assert.equal(friendlyCamps(world).length, 1);
  assert.equal(openAt(beginOpenLand(roam(world)), mall.position,
    {checkpointSites:{glasshouse:mall.position}}).open.world.open.crossings[mall.id], undefined);
  assert.equal(friendlyCamps(sampleWorld('after-the-smoke')).length, 0);
}

{
  const find = predicate => {
    for (let seed = 1; seed < 1000; seed++) {
      const world = {...priorCrossing(original()), seed};
      const draw = drawCheckpoint(rats, world, 1, {difficulty:'easy'});
      if (draw && predicate(draw)) return world;
    }
    throw new Error('No matching draw in the tested seeds.');
  };
  const genuine = find(draw => draw.kind === 'trouble' && !draw.bait);
  const start = openAt(beginOpenLand(roam(genuine)), rats.position);
  const mend = start.open.parts.checkpoints.encounter;
  assert.equal(start.requests.find(request => request.action === 'start').tracks.length, 0);
  const atCar = {road:{id:mend.id, cars:[{...mend.at, visible:true}]}, onFoot:true, wrench:true};
  const half = openAt(start.open, mend.at, atCar, 2);
  const release = openAt(half.open, mend.at, {...atCar, wrench:false});
  const full = openAt(release.open, mend.at, atCar, 4);
  assert.equal(full.open.world.scrap, genuine.scrap + 8);
  assert.equal(favoursOf(full.open.world, mend.group), 1);
  assert.equal(full.open.parts.checkpoints.encounter.phase, 'leaving');

  const trap = openAt(beginOpenLand(roam(find(draw => draw.bait))), rats.position);
  const bait = trap.open.parts.checkpoints.encounter;
  const setup = trap.requests.find(request => request.action === 'start');
  assert.equal(setup.vehicles.length, 1);
  assert.equal(setup.displayGroup, 'traders');
  assert(setup.tracks.length > 0);
  const spring = openAt(trap.open, bait.at, {onFoot:true, road:{id:bait.id, cars:[{...bait.at, visible:true}]}});
  assert.equal(spring.requests.find(request => request.action === 'fight').vehicles.length, 2);
}

const flags = {'hidden-road':true, 'story-choices':true, arsenal:true, 'scablands-realism':true};
function startDuel(world, on = true) {
  const duel = new Duel({seed:world.seed, featureFlags:{...flags, 'story-choices':on}});
  duel.state.wastelandGateDiscovered = true;
  assert(duel.startArenaEvent({seed:world.seed, venueId:'scablands', mode:'world-job', car:'falcone_f42',
    cpuDifficulty:'easy', opponents:[], job:roam(world)}));
  while (duel.state.status === 'countdown') duel.step(DT);
  return duel;
}
function place(duel, at) {
  const {state, course} = duel;
  state.onFoot = false;
  state.fighter = null;
  const near = course.nearest(at.x, at.z);
  placeActor(duel, state, {...near, headingError:(at.heading ?? 0) - course.at(near.s).heading, height:near.y});
}
function advance(duel, seconds) {
  for (let tick = 0; tick < Math.round(seconds / DT); tick++) duel.step(DT);
}

{
  const duel = startDuel(original(), false), worldJob = duel.state.arena.worldJob;
  place(duel, mall.position);
  duel.step(DT);
  assert.deepEqual(worldJob.open.world.open.crossings, {});
  assert.equal(duel.state.opponents.length, 0);
}

{
  const duel = startDuel(original()), {state} = duel, job = state.arena.worldJob;
  const shots = [];
  duel.onChange((_, event) => { if (event.weaponFired) shots.push(event); });
  place(duel, mall.position);
  duel.step(DT);
  const [car] = state.opponents, group = job.open.parts.checkpoints.encounter.group, before = worldPose(duel, car);
  assert.equal(group, 'travellers');
  assert.equal(car.roadRider.phase, 'passing');
  advance(duel, 2);
  assert(gap(before, worldPose(duel, car)) > 3, 'a passing car is driven by the native pilot');
  assert.deepEqual(shots, [], 'a passing car does not shoot first');
  assert.equal(arenaParticipant(duel,car).targetId, null);
  assert.equal(state.armor, state.maxArmor);
  applyArmorDamage(duel, car, 'fixed', {amount:8, owner:'player'});
  duel.step(DT);
  assert.equal(car.roadRider.phase, 'fighting');
  assert.equal(job.open.world.ledger.roadWord, 1);
  assert(job.open.world.ledger.marks.some(mark => mark.endsWith('/attacked-travellers')));

  const id = car.arenaId;
  job.open = holdOpenLand(job.open, 'thread/one');
  duel.step(DT);
  assert.equal(car.roadRider.phase, 'withdrawing');
  assert.equal(arenaParticipant(duel,car).targetId, null);
  advance(duel, .5);
  assert.equal(arenaActor(duel,id), car, 'no visible car is removed');
  place(duel, LAND.at('ships-in-sand'));
  advance(duel, .2);
  assert.equal(arenaActor(duel,id), null, 'offscreen cars leave the field and contacts');
}

{
  const duel = startDuel({...original(), seed});
  globalThis.window = {__qaApp:{duel, stop() {}}};
  try {
    assert.deepEqual(pageFunctions.cross(approach, 0), {difficulty:'easy', count:2, crossings:1});
    assert.deepEqual(pageFunctions.win(), {outcome:'won', job:'roam', feud:'Raiding', wrecked:false});
  } finally {
    delete globalThis.window;
  }
}

{
  const friend = choice(original(), 'friend', [
    {type:'word', person:'tin-town', set:'Friendly'}, {type:'favour', person:'tin-town', by:1},
  ]);
  const tow = openAt(beginOpenLand(roam(friend)), LAND.at('tin-town'), {combatWrecking:true});
  assert.equal(tow.open.world.scrap, 45);
  assert.equal(favoursOf(tow.open.world, 'tin-town'), 0);
  assert(tow.requests.some(request => request.action === 'recover-car'));

  const duel = startDuel(original());
  const job = duel.state.arena.worldJob;
  place(duel, mall.position);
  while (!duel.state.combatWrecking) applyArmorDamage(duel, duel.state, 'fixed', {amount:100});
  advance(duel, .1);
  assert(duel.state.onFoot && duel.state.combatWrecking, 'a wreck starts a walk in the native roam job');
  assert.equal(job.open.world.scrap, 45);
  assert.equal(job.open.world.open.crossings[mall.id], undefined);

  const walk = openAt(beginOpenLand(roam(original())), mall.position, {combatWrecking:true});
  assert.equal(walk.open.world.scrap, 45);
  assert(walk.requests.some(request => request.action === 'walk'));
  const wait = openAt(walk.open, mall.position, {onFoot:true, combatWrecking:true});
  const lift = openAt(wait.open, mall.position, {onFoot:true, combatWrecking:true, interact:true});
  assert.equal(lift.open.world.scrap, 35);
  assert(lift.requests.some(request => request.action === 'lift'));
  const dawn = openAt(lift.open, mall.position, {onFoot:true, combatWrecking:true, jobEvents:[{type:'hearthBanked'}]});
  assert(dawn.requests.some(request => request.action === 'recover-car'));
}

{
  const initial = {...priorCrossing(original()), seed};
  const once = openAt(beginOpenLand(roam(initial)), mall.position);
  const firstId = once.open.parts.checkpoints.encounter.id;
  const win = (open, id) => openAt(open, mall.position,
    {jobEvents:[{type:'riderFight', id, outcome:'won', wrecks:2}]});
  const one = win(once.open, firstId);
  assert.equal(one.open.world.scrap, initial.scrap + 20);
  assert.equal(feudOf(one.open.world, 'road-rats'), 'Raiding');
  const again = win({...one.open, parts:{checkpoints:{encounter:{...once.open.parts.checkpoints.encounter,
    id:'checkpoint/mall-road-1/crossing-2'}}}}, 'checkpoint/mall-road-1/crossing-2');
  assert.equal(again.open.world.scrap, initial.scrap + 40);
  assert.equal(feudOf(again.open.world, 'road-rats'), 'Hunting');
}

for (const name of Object.keys(pageFunctions)) new Function('return ' + pageSource(name, approach, 0));
console.log('test-open-checkpoints: ok');
