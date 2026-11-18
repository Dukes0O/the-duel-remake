// Slow Ride rules, without a scripted drive or persistent storage.
import assert from 'node:assert/strict';
import '../src/story/ember-lines.js';
import {EVERBURN_JOBS, REMADE_EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {furnaceSighting, FURNACE_PACING} from '../src/world/jobs/furnace-sightings.js';
import {ROAD_NET} from '../src/world/scablands-road.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {GAS_LOAD_RULE, GAS_LOAD_LINES, gasLoadBlocks, gasLoadRaids, gasLoadFlash, gasLoadPlug, gasLoadCheckpoint, gasLoadRestart, gasLoadResult} from '../src/world/jobs/gas-load-rule.js';
import {burnBarricades} from '../src/world/jobs/barricade.js';
import {createKnowledge, jobFacts, learn} from '../src/world/scablands-map.js';
import {alongPath, metresAtPlace} from '../src/world/jobs/steps/escort.js';
import {stepEscort} from '../src/world/jobs/steps/escort.js';
import {worldHudModel, drawGasGauge} from '../src/world/world-hud.js';
import {Duel} from '../src/game.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {createForge} from '../src/world/forge-look.js';
import {createBrandLamps} from '../src/world/brand-lamps.js';
import {SCABLANDS_SOLIDS} from '../src/world/scablands-solids.js';
import {createGasLoadView} from '../src/world/gas-load-view.js';
import {startFlamethrower} from '../src/arsenal/flamethrower.js';
import {SOLID_GRID} from '../src/world/scablands-solids.js';
import {worldJobMapData} from '../src/route-map.js';
import {worldJobHitTargets} from '../src/arena/modes/world-job.js';

const definition = EVERBURN_JOBS.find(job => job.id === 'everburn-slow-ride');
const step = definition.steps[0], road = ROAD_NET.road('tin-road');
assert.equal(REMADE_EVERBURN_JOBS.includes(definition.id), true, 'The checked remake is ready behind the hidden story switch.');
assert.equal(step.gasLoad, true);
assert.deepEqual(step.path.slice(0, road.points.length).map(place => ({x: place.position.x, z: place.position.z})), road.points);
assert.equal(step.speed * 3.6, GAS_LOAD_RULE.speedKmh);
assert.ok(Math.abs(Math.hypot(step.carStart.x - step.path[0].position.x,
  step.carStart.z - step.path[0].position.z) - 60) < .1);
const truck = {id: step.actorId, health: 100, position: step.path[0].position, pathIndex: 1};
let job = createJob(definition, 7);
const tick = (position, speedKmh = 0, onFoot = false, dt = .1) => {
  job = stepJob(job, {player: {position}, speedKmh, onFoot, actors: [truck]}, dt);
  return job.requests;
};
const followSpeed = requests => requests.find(request => request.type === 'follow')?.speed;
assert.equal(followSpeed(tick(step.carStart)), 0, 'Bess waits before the meeting.');
assert.equal(job.stepState.gasMeeting, undefined);
assert.equal(job.stepState.gas, 100, 'The tank starts full before the meeting.');
assert.equal(job.stepState.holes, 0);
assert.equal(followSpeed(tick(step.meeting.position, 10)), 0, 'Driving through does not start it.');
assert.equal(job.stepState.gasMeeting, undefined);
tick(step.meeting.position, 0, true);
assert.equal(job.stepState.gasMeeting, undefined, 'Walking into the ring does not start it.');
const heard = [];
let requests = tick(step.meeting.position);
for (let i = 0; i < 110; i++) {
  heard.push(...requests.filter(request => request.type === 'say').map(request => request.lineId));
  if (!job.stepState.gasLoaded) assert.equal(followSpeed(requests), 0, 'Bess waits for all four lines.');
  requests = tick(step.meeting.position);
}
assert.deepEqual(heard, [...Object.keys(GAS_LOAD_LINES), 'story.ember.moss.1']);
assert.equal(job.stepState.gasLoaded, true);
assert.equal(followSpeed(requests), 32 / 3.6);
assert.ok(!requests.some(request => request.type === 'say'), 'The meeting does not repeat.');
console.log('Slow Ride: meeting and Tin Road checks passed.');

// The HUD reads the transient tank state, in the same place as the bellows.
for (const onFoot of [true, false]) {
  for (const [gas, holes] of [[undefined, undefined], [100, 0], [79, 1], [40, 2], [0, 3]]) {
    const stepState = Object.freeze(gas === undefined ? {} : {gas, holes});
    const worldJob = {job: {steps: [step], stepIndex: 0, stepState}, actors: [truck]};
    const before = JSON.stringify(worldJob);
    const hud = worldHudModel({worldJob, onFoot});
    assert.deepEqual(hud.gas, {value: gas ?? 100, max: 100, holes: holes ?? 0});
    assert.equal(hud.truck, null, 'Gas replaces health only for Slow Ride.');
    const removed = [], properties = {}, attributes = {};
    const gauge = {style: {setProperty: (key, value) => {properties[key] = value;}},
      classList: {remove: (...names) => removed.push(...names)},
      setAttribute: (key, value) => {attributes[key] = value;}};
    const bar = {style: {}}, label = {}, note = {};
    drawGasGauge(hud.gas, gauge, bar, label, note);
    assert.equal(label.textContent, 'GAS');
    assert.equal(bar.style.width, `${(gas ?? 100).toFixed(1)}%`);
    assert.equal(note.textContent, `${gas ?? 100} / 100. ${holes ?? 0} ${(holes ?? 0) === 1 ? 'hole' : 'holes'} open.`);
    assert.equal(attributes['aria-label'], `Gas is ${gas ?? 100} out of 100. ${holes ?? 0} ${(holes ?? 0) === 1 ? 'hole' : 'holes'} open.`);
    assert.deepEqual(removed, ['is-out', 'is-losing', 'is-flashing']);
    assert.equal(properties['--ember-glow'], ((gas ?? 100) / 100).toFixed(2));
    assert.equal(JSON.stringify(worldJob), before, 'The gauge never changes the tank.');
  }
}
const oldEscort = {...step, gasLoad: false, ambushes:[{id:'legacy', count:2, place:step.path[1]}]};
const oldHud = worldHudModel({worldJob: {job: {steps: [oldEscort], stepIndex: 0, stepState: {}}, actors: [truck]}});
assert.deepEqual(oldHud.truck, {value: 100, max: 100});
assert.equal(oldHud.gas, null);
assert.equal(worldHudModel().gas, null);
const emptyHealth = {...truck, health: 0};
const moving = stepEscort(step, {gasLoaded: true, gas: 73, holes: 1}, {actors: [emptyHealth]}, .1);
assert.equal(moving.state.gas, 72.95, 'An open hole drains gas while health is ignored.');
assert.equal(moving.state.holes, 1);
assert.equal(followSpeed(moving.requests), step.speed, 'The obsolete health rule cannot stop Slow Ride.');
assert.equal(stepEscort(oldEscort, {}, {actors: [emptyHealth]}, .1).state.rested, true,
  'The shared escort still rests at zero health.');
console.log('Slow Ride: gas gauge and health isolation checks passed.');

const total = metresAtPlace(step.path, step.path.length - 1);
assert.equal(step.blocks.length, 3);
for (const [index, block] of step.blocks.entries()) {
  assert.ok(Math.abs(block.metres / total - GAS_LOAD_RULE.blockShares[index]) < 1e-10);
  assert.ok(Math.abs(alongPath(step.path, block).metres - block.metres) < 1e-8);
  assert.equal(block.car, index === 1);
}
assert.deepEqual(step.barriers.map(barrier => barrier.id), [step.blocks[0].id, step.blocks[2].id]);
assert.equal(step.waitingActors[0].id, step.blocks[1].id);
assert.equal(step.waitingActors[0].gasBlockCar, true);
assert.equal(step.waitingActors[1].gasBlockRider, true);
const knowledge = createKnowledge();
learn(knowledge, {car:step.carStart, ...jobFacts({job:{steps:[step], stepIndex:0}})});
assert.equal(knowledge.barricades.size, 3, 'All blocks are on the map from the start.');
const flame = id => ({id, kind:'barricade', burnable:true, flame:true});
let blocks = {gasLoaded:true};
const blockTick = (along, dt, facts = {}) => {
  const out = gasLoadBlocks(step, blocks, facts, along, dt);
  blocks = out.state;
  return out;
};
const first = step.blocks[0];
assert.equal(blockTick(first.metres - 30, 1).speed, 5, 'The mover is capped before the stop.');
assert.equal(blockTick(first.metres - 25, .1).speed, 0);
assert.equal(blocks.stoppedBlock, first.id);
for (let second = 0; second < 3; second++) {
  const out = blockTick(first.metres - 25, 1, {thingsHit:[flame(first.id), flame(first.id)]});
  assert.equal(out.events.length, 0, 'Multiple flame contacts cannot burn faster.');
}
const burnt = blockTick(first.metres - 25, 1, {thingsHit:[flame(first.id)]});
assert.deepEqual(burnt.events, [{type:'burn', id:first.id}]);
assert.equal(burnt.speed, 0);
for (let second = 0; second < 7; second++) assert.equal(blockTick(first.metres - 25, 1).speed, 0);
assert.equal(blockTick(first.metres - 25, 1).speed, step.speed, 'Moving off takes eight seconds after removal.');
const parked = step.blocks[1];
blockTick(0, .1, {carContacts:[{id:parked.id, kmh:19.99}]});
assert.ok(!blocks.clearedBlocks.includes(parked.id));
blockTick(0, .1, {carContacts:[{id:parked.id, kmh:20}]});
assert.ok(blocks.clearedBlocks.includes(parked.id));
blocks = {gasLoaded:true};
const clearEarly = blockTick(0, 4, {thingsHit:step.barriers.map(barrier => flame(barrier.id)),
  carContacts:[{id:parked.id, kmh:20}]});
assert.equal(clearEarly.state.clearedBlocks.length, 3);
for (let along = 0; along < total; along += step.speed) {
  assert.equal(blockTick(along, 1).speed, step.speed, 'Cleared early means Bess never stops.');
  assert.equal(blocks.stoppedBlock, null);
}
const hotDelivery = burnBarricades(step.barriers, {}, [flame(first.id)], 0);
assert.deepEqual(hotDelivery.events, [{type:'burn', id:first.id}], 'Hot Delivery keeps its immediate burn.');
assert.deepEqual(burnBarricades(step.barriers, {}, [{...flame(first.id), flame:false}], 10, 4).events, []);
console.log('Slow Ride: blocks, burn times, hard knocks, map and moving-off checks passed.');

// A real burst must report sustained contact, not one frame per burst.
{
  const flameDuel = new Duel({seed:7,featureFlags:{'hidden-road':true,arsenal:true}});
  flameDuel.state.wastelandGateDiscovered = true;
  assert.ok(flameDuel.startArenaEvent({venueId:'scablands',mode:'world-job',car:'falcone_f42',seed:7,
    cpuDifficulty:'easy',opponents:[],job:definition}));
  flameDuel.state.status = 'racing';
  const flameWorld = flameDuel.state.arena.worldJob;
  flameWorld.job.stepState = {gasLoaded:true,gas:100,holes:0};
  flameDuel.setInput({throttle:0,brake:0,steer:0});
  flameDuel.step(.01);
  const pose = flameDuel.course.nearest(first.position.x-Math.sin(first.heading)*6,
    first.position.z-Math.cos(first.heading)*6);
  Object.assign(flameDuel.state,{s:pose.s,lateral:pose.lateral,speedMph:0,
    headingError:first.heading-flameDuel.course.at(pose.s).heading});
  assert.ok(flameDuel.fireWeapon('flamethrower'), 'The loaned car flamethrower fires.');
  for (let tick = 0; tick < 2400 && !flameWorld.job.stepState.burntBarricades?.includes(first.id); tick++) {
    const heat = flameWorld.job.stepState.barrierHeat?.[first.id] ?? 0;
    if (heat < GAS_LOAD_RULE.blockBurnSeconds)
      assert.ok(!flameWorld.job.stepState.burntBarricades?.includes(first.id));
    flameDuel.fireWeapon('flamethrower');
    flameDuel.step(.01);
  }
  assert.ok(flameWorld.job.stepState.burntBarricades?.includes(first.id),
    `Live flame burns the timber block (heat ${flameWorld.job.stepState.barrierHeat?.[first.id] ?? 0}).`);
  const heat = flameWorld.job.stepState.barrierHeat[first.id];
  assert.ok(heat >= 4 && heat < 4.02, 'Removal needs four seconds of actual flame contact.');
  assert.ok(!flameWorld.solidGrid.barricades.some(barrier => barrier.id === first.id));
}
console.log('Slow Ride: sustained live flame removes its block at four seconds of contact.');

// Step the existing simulation at staged contacts. This is no drive route.
const duel = new Duel({seed:7, featureFlags:{'hidden-road':true, arsenal:true}});
duel.state.wastelandGateDiscovered = true;
assert.equal(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:7,
  cpuDifficulty:'easy', opponents:[], job:definition}), true);
duel.state.status = 'racing';
duel.setInput({throttle:0, brake:1, steer:0});
const world = duel.state.arena.worldJob;
world.job.stepState = {gasLoaded:true, gas:100, holes:0};
duel.step(.01);
assert.equal(world.solidGrid.barricades.length, 2, 'Both timber blocks use the existing solid grid.');
const parkedActor = world.actors.find(actor => actor.id === parked.id);
assert.ok(parkedActor?.renderCar, 'The parked driver is a real car actor.');
assert.ok(worldJobHitTargets(duel).some(target => target.id === first.id && target.burnable));
const knock = kmh => {
  world.carContacts = [{actor:parkedActor, kmh, nx:Math.sin(parked.heading), nz:Math.cos(parked.heading)}];
  duel.step(.01);
};
knock(19.99);
assert.equal(parkedActor.ramRetreat, undefined, 'A soft touch leaves the parked car in place.');
assert.ok(!world.job.stepState.clearedBlocks.includes(parked.id));
duel.state.worldJobThingsHit = [{id:parked.id, flame:true, damage:100}];
duel.step(.01);
assert.equal(parkedActor.health, 100, 'Flame cannot replace the designed hard knock.');
knock(20);
assert.ok(world.job.stepState.clearedBlocks.includes(parked.id));
assert.ok(parkedActor.ramRetreat, 'The knocked driver uses the existing ram retreat.');
assert.ok(parkedActor.speed > 0, 'The knocked car drives away.');
const fenceHit = flame(first.id);
for (let tick = 0; tick < 481; tick++) {
  duel.state.worldJobThingsHit = [fenceHit];
  duel.step(1 / 120);
}
assert.ok(world.job.stepState.burntBarricades.includes(first.id));
assert.equal(world.solidGrid.barricades.length, 1, 'The burnt block leaves the shared solid grid.');
console.log('Slow Ride: shared car contacts, retreat, flame targets and solids checks passed.');

const raidView = {difficulty:'medium', actors:[]};
let raidState = {gas:100, holes:0};
const raidTick = (share, seconds = 0) => {
  const out = gasLoadRaids(step, raidState, raidView, truck, share, seconds);
  raidState = out.state;
  return out;
};
assert.equal(raidTick(.149).events.length, 0);
for (const [index, raid] of step.gasRaids.entries()) {
  assert.equal(raid.share, GAS_LOAD_RULE.raidShares[index]);
  assert.equal(raid.side, index % 2 ? -1 : 1);
  // Each post is named and on clear ground. Check all rider starts too.
  assert.ok(raid.place.id);
  assert.deepEqual(raidTick(raid.share).events, [{type:'gasRaid', id:raid.id}]);
  assert.equal(raidTick(raid.share).events.length, 0, 'Each horn sounds once.');
}
raidView.actors = step.gasRaiders.map(def => ({id:def.id, health:100,
  position:{...truck.position}}));
let out = raidTick(1, 3);
assert.equal(out.events.filter(event => event.type === 'gasLeak').length, 3);
assert.equal(raidState.holes, 3, 'At most three holes open, however many riders reach her.');
assert.equal(raidState.gas, 100, 'Gas starts leaking when the hole opens.');
assert.equal(raidTick(1, 3).events.length, 0, 'A full set of holes emits no extra leak cue.');
raidState = {gas:100, holes:0};
raidView.difficulty = 'easy';
raidView.actors = [{id:step.gasRaiders[0].id, health:100, position:{...truck.position}},
  {id:step.gasRaiders[1].id, health:100, position:{...truck.position}}];
assert.equal(raidTick(.15, 2.99).state.holes, 0);
assert.equal(raidTick(.15, .01).state.holes, 1, 'Only one rider on Easy opens a hole.');
assert.equal(raidTick(.15, 1).state.gas, 99.75, 'Easy loses a quarter gas per hole per second.');
raidView.actors[0].drivenOff = true;
assert.equal(raidTick(.15, 6).state.holes, 1, 'A rammed rider opens no more holes.');
raidView.actors[0].health = 0;
assert.equal(raidTick(.15, 6).state.holes, 1, 'A burnt rider opens no more holes.');
console.log('Slow Ride: four raids, one horn each, hole clocks, limit, gas loss and defeated riders passed.');

for (const def of step.gasRaiders) {
  const point = def.start.position;
  assert.equal(SOLID_GRID.near(point.x, point.z, point.x, point.z, 10).length, 0,
    `${def.id} starts clear of solids.`);
}
const raidTruck = world.actors.find(actor => actor.id === step.actorId);
world.job.stepState = {...world.job.stepState, gasRaids:[step.gasRaids[0].id]};
duel.step(.01);
const firstRider = world.actors.find(actor => actor.id === step.gasRaiders[0].id);
assert.ok(firstRider?.renderCar, 'A raid uses a real car actor.');
assert.equal(world.actors.some(actor => actor.id === step.gasRaiders[1].id), false,
  'Easy spawns only one rider per raid.');
assert.ok(worldJobMapData(duel.course, duel.state).marks.some(mark => mark.kind === 'rider' &&
  mark.position === firstRider.position), 'The active rider is marked on the map.');
const startGap = Math.hypot(firstRider.position.x - raidTruck.position.x, firstRider.position.z - raidTruck.position.z);
for (let tick = 0; tick < 120; tick++) duel.step(1 / 120);
assert.ok(Math.hypot(firstRider.position.x - raidTruck.position.x, firstRider.position.z - raidTruck.position.z) < startGap,
  'The existing pursuit mover takes the rider toward Bess.');
firstRider.position = {...raidTruck.position, x:raidTruck.position.x + 6};
world.job.stepState.holeClocks = {[firstRider.id]:2.99};
duel.step(.02);
assert.equal(world.job.stepState.holes, 1, 'Real actor facts open a hole.');
world.carContacts = [{actor:firstRider, kmh:20, nx:1, nz:0}];
duel.step(.01);
assert.ok(firstRider.ramRetreat, 'A raid rider uses the existing ram retreat.');
const holesAfterRam = world.job.stepState.holes;
for (let tick = 0; tick < 1100; tick++) duel.step(1 / 120);
assert.equal(world.job.stepState.holes, holesAfterRam);
assert.equal(firstRider.gasDrivenOff, true, 'A rammed rider never returns.');
console.log('Slow Ride: clear posts, Easy car count, map, shared pursuit and permanent ram retreat passed.');

assert.ok(SOUND_BANK['world.bess.leak'].layers.length);
const drawing = createGasLoadView();
const beforeDraw = JSON.stringify(world.job.stepState);
drawing.update(world, () => 12);
const leaks = drawing.group.getObjectByName('Tank holes and spray');
assert.equal(leaks.children.filter(hole => hole.visible && hole.name !== 'Tank gas flash').length, world.job.stepState.holes);
assert.equal(leaks.position.y, 12, 'Spray sits with the drawn tank floor.');
assert.equal(drawing.group.getObjectByName('Plane wing gas hose').visible, false);
assert.equal(JSON.stringify(world.job.stepState), beforeDraw, 'Drawing holes cannot drain gas.');
console.log('Slow Ride: leak sound recipe and read-only hole drawing passed.');

const flameView = {playerFlaming:true, player:{position:{...truck.position}}};
const flashed = gasLoadFlash(step, {gas:100, holes:1}, flameView, truck, .1);
assert.equal(flashed.state.gas, 85);
assert.deepEqual(flashed.events, [{type:'gasFlash', actorId:step.actorId}]);
assert.deepEqual(flashed.requests, [{type:'say', lineId:'gas.flash'}]);
assert.equal(definition.captions['gas.flash'], "Moss: Not near the tank when she's weeping!");
assert.equal(gasLoadFlash(step, flashed.state, flameView, truck, 1.99).state.gas, 85);
const flashAgain = gasLoadFlash(step, flashed.state, flameView, truck, 2);
assert.equal(flashAgain.state.gas, 70);
assert.deepEqual(flashAgain.requests, [], 'Moss warns only once.');
for (const facts of [{...flameView, playerFlaming:false},
  {...flameView, player:{position:{...truck.position, x:truck.position.x + 8.01}}}]) {
  assert.equal(gasLoadFlash(step, {gas:100, holes:1}, facts, truck, .1).state.gas, 100);
}
assert.equal(gasLoadFlash(step, {gas:100, holes:0}, flameView, truck, 1).state.gas, 100);
assert.equal(gasLoadFlash(step, {gas:5, holes:1}, flameView, truck, .1).state.gas, 0);
assert.equal(gasLoadFlash(step, {gas:100, holes:1}, {...flameView,
  player:{position:{...truck.position, x:truck.position.x + 8}}}, truck, .1).state.gas, 85);
world.job.stepState.flashVisible = GAS_LOAD_RULE.flashVisibleSeconds;
drawing.update(world, () => 12);
assert.equal(drawing.group.getObjectByName('Tank gas flash').visible, true);
world.job.stepState.flashVisible = 0;
drawing.update(world, () => 12);
assert.equal(drawing.group.getObjectByName('Tank gas flash').visible, false);
assert.ok(SOUND_BANK['world.gas.flash'].layers.length);
console.log('Slow Ride: flash range, cost, cooldown, one warning, recipe and drawing passed.');

const flashSounds = [];
duel.onChange((_state, event) => {if (event.arenaTell?.cue === 'world.gas.flash') flashSounds.push(event.arenaTell);});
world.job.stepState = {gasLoaded:true, gas:100, holes:1};
const carAt = duel.course.groundAt(duel.state.s, duel.state.lateral);
Object.assign(raidTruck.position, {x:carAt.x + 6, z:carAt.z});
assert.ok(startFlamethrower(duel, duel.state));
duel.step(.01);
assert.ok(world.job.stepState.gas < 85 && world.job.stepState.gas > 84.9,
  'A real player flame burst reaches the gas rule, after the ordinary leak.');
assert.equal(flashSounds.length, 1);
assert.ok(world.job.stepState.flashVisible > 0);
console.log('Slow Ride: live player flame facts and flash sound dispatch passed.');

let plugging = gasLoadPlug(step, {gas:80, holes:2}, step.speed, 0);
assert.equal(plugging.speed, 0);
assert.deepEqual(plugging.requests, [{type:'say', lineId:step.restLineId}]);
for (let second = 0; second < 5; second++) {
  plugging = gasLoadPlug(step, plugging.state, step.speed, 1);
  assert.equal(plugging.speed, 0);
  assert.equal(plugging.state.holes, 2);
  assert.deepEqual(plugging.requests, [], 'The rest line is said once per repair.');
}
plugging = gasLoadPlug(step, plugging.state, step.speed, 1);
assert.equal(plugging.speed, step.speed);
assert.equal(plugging.state.holes, 0);
assert.equal(plugging.state.gas, 80, 'Plugging never refills gas.');
assert.deepEqual(plugging.state.holeClocks, {});
assert.deepEqual(plugging.events, [{type:'gasPlug', actorId:step.actorId}]);
assert.equal(gasLoadPlug(step, plugging.state, step.speed, 6).events.length, 0);
const oneHoleMoving = gasLoadPlug(step, {gas:80, holes:1}, step.speed, 6);
assert.equal(oneHoleMoving.state.holes, 1, 'One hole cannot stop her.');
assert.equal(oneHoleMoving.state.plugElapsed, 0);
const atBlock = gasLoadPlug(step, oneHoleMoving.state, 0, 5);
assert.equal(atBlock.state.holes, 1);
assert.equal(gasLoadPlug(step, atBlock.state, 0, 1).state.holes, 0,
  'Moss also plugs a single hole while waiting at a block.');
assert.equal(gasLoadPlug(step, atBlock.state, step.speed, 1).state.plugElapsed, 0,
  'Moving interrupts work on a single hole.');
const stoppedForBlock = gasLoadPlug(step, {gas:80, holes:2}, 0, 6);
assert.equal(stoppedForBlock.speed, 0, 'Plugging cannot release a standing road block.');
assert.ok(SOUND_BANK['world.bess.plug'].layers.length);
console.log('Slow Ride: two-hole stop, six-second plug, single-hole block repair and moving off passed.');

duel.state.combat.flameBursts = [];
world.job.stepState = {gasLoaded:true, gas:100, holes:2};
Object.assign(raidTruck.position, step.path[0].position);
raidTruck.pathIndex = 1;
world.follow.speed = step.speed;
const plugSounds = [];
duel.onChange((_state, event) => {if (event.arenaTell?.cue === 'world.bess.plug') plugSounds.push(event.arenaTell);});
const beforePlug = {...raidTruck.position};
for (let tick = 0; tick < 59; tick++) duel.step(.1);
assert.equal(raidTruck.position.x, beforePlug.x);
assert.equal(raidTruck.position.z, beforePlug.z);
assert.equal(world.job.stepState.holes, 2);
assert.ok(Math.abs(world.job.stepState.gas - (100 - 2 * GAS_LOAD_RULE.easyLeakPerSecond * 5.9)) < 1e-8, 'The tank still leaks during repairs.');
duel.step(.1);
// Allow only floating-point clock residue, without shortening the six seconds.
if (world.job.stepState.holes) duel.step(.001);
assert.equal(world.job.stepState.holes, 0);
assert.equal(plugSounds.length, 1);
assert.ok(Math.hypot(raidTruck.position.x - beforePlug.x, raidTruck.position.z - beforePlug.z) > 0,
  'The shared mover sets off after the plug.');
assert.equal(world.follow.speed, step.speed);
console.log('Slow Ride: real stopped movement, leaking during repair and plug sound dispatch passed.');

// A cleared block records the gas then, not when Bess later reaches it.
const checkpointState = gasLoadCheckpoint(step, {clearedBlocks:[]},
  {gasLoaded:true, gas:73, clearedBlocks:[step.blocks[0].id]});
assert.equal(checkpointState.gasCheckpoint.gas, 73);
assert.equal(gasLoadCheckpoint(step, checkpointState, {...checkpointState, gas:50}).gasCheckpoint.gas, 73);
const dry = gasLoadRestart(step, {...checkpointState, gas:0, holes:3, plugging:true,
  stoppedBlock:step.blocks[1].id, blockRestartLeft:8, flashVisible:1});
assert.equal(dry.state.gas, 73);
assert.equal(dry.state.holes, 0);
assert.equal(dry.state.plugging, false);
assert.equal(dry.state.stoppedBlock, null);
assert.equal(dry.state.flashVisible, 0);
assert.deepEqual(dry.events[0].place.position, step.blocks[0].position);
assert.equal(dry.events[0].pathIndex,
  step.path.findIndex((_, index) => index > 0 && metresAtPlace(step.path, index) > step.blocks[0].metres));
assert.deepEqual(dry.requests.filter(request => request.type === 'say'), [{type:'say', lineId:'gas.dry'}]);
assert.equal(definition.captions['gas.dry'], "Moss: She's dry. Back to the planes.");
assert.equal(gasLoadRestart(step, {gas:.001}), null);
const dryAtStart = gasLoadRestart(step, {gas:0});
assert.equal(dryAtStart.state.gas, 100);
assert.deepEqual(dryAtStart.events[0].place, step.path[0]);
assert.equal(dryAtStart.events[0].pathIndex, 1);
const laterCheckpoint = gasLoadCheckpoint(step, checkpointState,
  {...checkpointState, gas:46, clearedBlocks:step.blocks.map(block => block.id)});
assert.equal(laterCheckpoint.gasCheckpoint.id, step.blocks[2].id);
assert.equal(laterCheckpoint.gasCheckpoint.gas, 46);
world.job.stepState = {...laterCheckpoint, gas:.000001, holes:1,
  burntBarricades:step.barriers.map(barrier => barrier.id)};
world.solidGrid.setBarricades([]);
raidTruck.health = 17;
duel.step(.001);
assert.equal(world.job.stepState.gas, 46, 'The live leak restarts the tank with its checkpoint gas.');
assert.equal(world.job.stepState.holes, 0);
assert.deepEqual(raidTruck.position, step.blocks[2].position,
  'The existing escort restart puts Bess at the cleared block.');
assert.equal(raidTruck.health, 17, 'Gas restart does not run the shared health recovery rule.');
assert.equal(raidTruck.atDestination, false);
assert.equal(world.follow.speed, 0, 'There is no movement on the restart tick.');
duel.step(.1);
assert.equal(world.follow.speed, step.speed, 'The existing mover resumes on the road.');
console.log('Slow Ride: checkpoint gas, start fallback, dry caption and shared live restart passed.');

const pacingWorld = {definition, job:{steps:[step], stepIndex:0}, actors:[truck]};
function placeBess(metres) {
  let left = metres;
  for (let index = 1; index < step.path.length; index++) {
    const from = step.path[index - 1].position, to = step.path[index].position;
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    if (left <= length) {
      truck.position = {x:from.x + (to.x - from.x) * left / length,
        z:from.z + (to.z - from.z) * left / length};
      truck.pathIndex = index;
      return;
    }
    left -= length;
  }
}
placeBess(total * (FURNACE_PACING.fromShare - .001));
assert.equal(furnaceSighting(pacingWorld), null);
for (const share of [.301, .5, .699]) {
  placeBess(total * share);
  const sight = furnaceSighting(pacingWorld);
  assert.ok(Number.isFinite(sight.x) && Number.isFinite(sight.z));
  assert.ok(Math.abs(Math.hypot(sight.x - truck.position.x,
    sight.z + FURNACE_PACING.northMetres - truck.position.z) - FURNACE_PACING.aheadMetres) < 1e-8,
    'The existing furnace paces Bess on the high ground.');
}
assert.deepEqual(step.sayAtShare, [{share:FURNACE_PACING.fromShare, lineId:'story.ember.moss.4'}]);
console.log('Slow Ride: existing Old Smoke pacing and Moss caption retained.');

const dryAtArrival = stepEscort(step, {gasLoaded:true, gas:0},
  {actors:[{...truck, atDestination:true}]}, .1);
assert.ok(dryAtArrival.events.some(event => event.type === 'restarted'));
assert.equal(dryAtArrival.complete, false, 'A dry tank restarts even at arrival.');

// Arrival freezes the delivered gas, then uses job 1's existing hold.
assert.deepEqual(step.arrivalHold, {seconds:9, catchAt:5});
for (const [gas, pay, sentence] of [[100,150,'Bess came in full.'], [80,150,'Bess came in full.'],
  [79.99,100,'Bess came in most of the way full.'], [40,100,'Bess came in most of the way full.'],
  [39.99,60,'Bess came in nearly dry.']]) {
  assert.deepEqual(gasLoadResult(gas), {gas, pay, sentence});
}
const arrivalSounds = [];
const arrivalCaptions = [];
const auntieArrival = "Auntie Solder: Listen to that. That's a forge. That is a forge, you lovely thing.";
duel.onStoryCaption = text => arrivalCaptions.push(text);
duel.onChange((_state, event) => {if (event.arenaTell?.cue === 'world.furnace.horn') arrivalSounds.push(event.arenaTell);});
world.job.stepState = {gasLoaded:true, gas:82, holes:0, clearedBlocks:step.blocks.map(block => block.id)};
raidTruck.position = {...step.destination.position};
raidTruck.pathIndex = step.path.length;
raidTruck.atDestination = raidTruck.reachedEnd = true;
duel.step(.01);
if (!world.arrivalHold) duel.step(.01);
assert.equal(world.arrivalHold.elapsed, 0);
assert.equal(world.job.done, false);
assert.deepEqual(world.gasResult, {gas:82, pay:150, sentence:'Bess came in full.'});
assert.equal(world.forgeGasShare, 0);
assert.equal(arrivalSounds.length, 1);
assert.equal(arrivalCaptions.filter(text => text === auntieArrival).length, 1, 'Auntie speaks her exact arrival line.');
for (let count = 0; count < 8; count++) duel.step(1);
assert.equal(world.settled, false, 'Eight seconds cannot end the hold.');
assert.ok(Math.abs(world.forgeGasShare - 8 / 9) < 1e-8);
assert.equal(world.gasResult.gas, 82, 'Arrival freezes gas before the hold.');
duel.step(1);
assert.equal(world.settled, true);
assert.equal(world.forgeGasShare, 1);
assert.equal(arrivalSounds.length, 1, 'The furnace sounds once at arrival.');
assert.equal(arrivalCaptions.filter(text => text === auntieArrival).length, 1, 'Her line does not repeat during the hold.');
console.log('Slow Ride: gas grade boundaries, frozen delivery, shared nine-second hold and one arrival horn passed.');

const {arenaReward, settleArenaResult} = await import('../src/arena/arena-settlement.js');
const {arenaResultsScreen} = await import('../src/screen-arena.js');
for (const gas of [100,80,79.99,40,39.99]) {
  const gasResult = gasLoadResult(gas);
  const arena = {version:1, venueId:'scablands', mode:'world-job', phase:'over',
    participants:[{id:'player', kind:'player'}],
    result:{placings:['player'], winnerId:'player', reason:'job-complete'},
    worldJob:{definition, gasResult, job:{steps:definition.steps, stepIndex:definition.steps.length}}};
  for (const [difficulty, factor] of [['easy',1], ['medium',1.2], ['hard',1.4]]) {
    assert.deepEqual(arenaReward(arena, difficulty),
      {base:gasResult.pay, placing:0, wrecks:0, factor, total:Math.round(gasResult.pay * factor)});
  }
  const profile = {credits:123, wasteland:{version:1, discoveredGate:true, scrap:10,
    settledResults:[], territories:{kettle:{hold:0, claimed:false}}}};
  const before = JSON.stringify(profile);
  const request = {runId:`gas-${gas}`, ownerPlayerId:'test-player', activePlayerId:'test-player', cpuDifficulty:'easy', arena};
  const paid = settleArenaResult(profile, request);
  assert.equal(paid.scrapEarned, gasResult.pay);
  assert.equal(paid.profile.wasteland.scrap, 10 + gasResult.pay);
  assert.equal(JSON.stringify(profile), before);
  assert.deepEqual(Object.keys(paid.profile.wasteland), Object.keys(profile.wasteland));
  assert.equal(settleArenaResult(paid.profile, request).awarded, false);
  assert.ok(arenaResultsScreen({arena}, {metric:()=>'', action:()=>'', escapeHTML:String}).description.includes(gasResult.sentence));
}
console.log('Slow Ride: reward by gas, existing difficulty factors, single settlement, unchanged save keys and results sentences passed.');

// The approach uses the same actor mover through the south gate, then a clear
// lane to the forge bay. Check each new metre with Bess's collision radius.
for (let index = road.points.length; index < step.path.length; index++) {
  const from = step.path[index - 1].position, to = step.path[index].position;
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  for (let metre = 0; metre <= length; metre++) {
    const x = from.x + (to.x - from.x) * metre / length, z = from.z + (to.z - from.z) * metre / length;
    for (const solid of SCABLANDS_SOLIDS) {
      const dx = x - solid.x, dz = z - solid.z, c = Math.cos(solid.heading), s = Math.sin(solid.heading);
      const gap = Math.hypot(Math.max(0, Math.abs(dx*c - dz*s) - solid.halfX),
        Math.max(0, Math.abs(dx*s + dz*c) - solid.halfZ));
      assert.ok(gap > 2, `Bess clears ${solid.id} on the forge approach.`);
    }
  }
}
const forgeView = createForge({heightAt:()=>0});
const townLamps = createBrandLamps();
const arrivalView = {definition, actors:[{...truck, position:step.destination.position}],
  job:{steps:[step], stepIndex:0, stepState:{gasLoaded:true, gas:82, holes:0}}, forgeGasShare:0};
const frozenArrival = JSON.stringify(arrivalView);
drawing.update(arrivalView, ()=>0);
assert.equal(drawing.group.getObjectByName('Forge tank hose').visible, true);
assert.equal(drawing.group.getObjectByName('Forge gas tank').visible, true);
forgeView.gas(GAS_LOAD_RULE.forgeBeforeGasShare); forgeView.animate(0);
const smallFire = forgeView.flame.scale.y;
townLamps.update(arrivalView); townLamps.animate(0);
const firstLamp = townLamps.group.children[0];
const smallLamp = firstLamp.getObjectByName('Lamp flame').scale.y;
assert.equal(townLamps.group.children.length, 3);
const leavingStart = furnaceSighting(arrivalView);
assert.deepEqual(leavingStart, {x:step.gasFurnacePlace.position.x, z:step.gasFurnacePlace.position.z, heading:Math.PI});
assert.equal(JSON.stringify(arrivalView), frozenArrival, 'Arrival drawing leaves the job unchanged.');
arrivalView.forgeGasShare = 1;
forgeView.gas(1); forgeView.animate(0);
townLamps.update(arrivalView); townLamps.animate(0);
assert.ok(forgeView.flame.scale.y > smallFire);
assert.ok(firstLamp.getObjectByName('Lamp flame').scale.y > smallLamp);
assert.equal(furnaceSighting(arrivalView).z, leavingStart.z - GAS_LOAD_RULE.arrivalFurnaceAwayMetres);
forgeView.gas(null); forgeView.animate(0);
assert.equal(forgeView.flame.visible, false, 'Gas fire does not remain in another job.');
forgeView.dispose(); townLamps.dispose();
console.log('Slow Ride: clear forge approach, connected hose, rising fire and lamps, and furnace departure passed.');

const drawingResources = new Set();
drawing.group.traverse(node => {
  if (node.geometry) drawingResources.add(node.geometry);
  for (const material of [].concat(node.material ?? [])) drawingResources.add(material);
});
let released = 0;
for (const resource of drawingResources) resource.addEventListener('dispose', () => {released++;});
drawing.dispose();
assert.equal(released, drawingResources.size, 'Leaving the scene releases every tank, hose and meeting drawing resource once.');
assert.equal(drawing.group.children.length, 0);
