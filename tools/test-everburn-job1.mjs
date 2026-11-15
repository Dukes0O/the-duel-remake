import assert from 'node:assert/strict';
import * as THREE from 'three';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {worldHudModel, worldMapFrame, brazierArrow} from '../src/world/world-hud.js';
import {brazierSpotsFor, createBraziers, createCinderFigure} from '../src/world/ember-pot.js';
import {LAND} from '../src/world/scablands-names.js';
import {ROAD_NET} from '../src/world/scablands-road.js';
import {createKnowledge, jobFacts, learn, drawSmallMap, drawBigMap, getLandPicture, smallView, wholeView, toScreen} from '../src/world/scablands-map.js';
import {sees, HOT_DELIVERY_WAYS, routeFor, nearestOnLine} from '../src/world/scablands-ways.js';
import {scablandsSurfaceHeightAt, scablandsFloorsAt} from '../src/world/scablands-ground.js';
import {pushOutOfSolids, createJobSolidGrid, createSolidGrid} from '../src/world/scablands-solids.js';
import {riverDepthAt, scablandsDriveAt, GROUND_AREAS} from '../src/world/scablands-regions.js';
import {createWorldJob, initializeWorldJob, stepWorldJob, worldJobHitTargets} from '../src/arena/modes/world-job.js';
import {startFlamethrower, stepFlamethrowers} from '../src/arsenal/flamethrower.js';
import {Course} from '../src/course.js';
import {SCABLANDS_VENUE} from '../src/world/scablands.js';
import {createScablandsScene} from '../src/world/scablands-scene.js';
import {syncScene} from '../src/scene-systems.js';
import {yardPlan} from '../src/world/scablands-yard-look.js';
import {FURNACE_SKYLINE, furnaceSighting} from '../src/world/jobs/furnace-sightings.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {Duel} from '../src/game.js';
import {placeActor} from '../src/arena/arena-event.js';
import {wrapHeading} from '../src/offroad-physics.js';
import '../src/story/ember-lines.js';

const definition = EVERBURN_JOBS.find(job => job.id === 'everburn-hot-delivery');
// The drawn furnace and its sight share the named high ground north of the Steps.
{
  const crossing = LAND.at('the-steps'), watch = LAND.at('furnace-watch');
  const sighting = furnaceSighting({definition, job:{done:false}, actors:[]});
  assert.deepEqual(FURNACE_SKYLINE, watch);
  assert.equal(sighting.x, watch.x);
  assert.equal(sighting.z, watch.z);
  assert.ok(watch.z < crossing.z, 'the furnace stands north of the Steps');
  assert.ok(scablandsSurfaceHeightAt(watch.x, watch.z) > scablandsSurfaceHeightAt(crossing.x, crossing.z) + 25,
    'the furnace stands on high ground');
}
// The yard belongs only to jobs that request it, and its scene owns its meshes.
{
  const scene = createScablandsScene(new Course(SCABLANDS_VENUE, 19), {openMarks:[], loadAsset:async () => ({scene:new THREE.Group()})});
  const stateFor = jobDefinition => ({arena:{mode:'world-job', worldJob:{definition:jobDefinition, job:{steps:[],stepIndex:0}, actors:[]}}});
  syncScene(scene.group, stateFor(EVERBURN_JOBS[1]));
  assert.equal(scene.group.getObjectByName('Scrapdome yard on the land'), undefined);
  syncScene(scene.group, stateFor(definition));
  const yards = [];
  scene.group.traverse(node => {if (node.name === 'Scrapdome yard on the land') yards.push(node);});
  assert.equal(yards.length, 1);
  const yard = yards[0], meshes = [];
  yard.traverse(node => {if (node.isMesh) meshes.push(node);});
  assert.equal(meshes.length, 2);
  assert.equal(yard.position.x, LAND.yard.x);
  assert.equal(yard.position.z, LAND.yard.z);
  let disposed = false;
  meshes[0].geometry.addEventListener('dispose', () => {disposed = true;});
  syncScene(scene.group, stateFor(EVERBURN_JOBS[1]));
  assert.equal(scene.group.getObjectByName('Scrapdome yard on the land'), undefined);
  scene.dispose();
  assert.equal(disposed, true, 'the detached yard is disposed with the scene');
}
// Drive real cars through the job's own yard grid. Other jobs have no yard solids.
{
  const plan = yardPlan();
  const makeDuel = job => {
    const duel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true}});
    duel.state.wastelandGateDiscovered = true;
    assert.equal(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
      cpuDifficulty:'medium', opponents:[], job:{...job, seed:19}}), true);
    duel.state.countdown = 0;
    return duel;
  };
  const duel = makeDuel(definition), grid = duel.state.arena.worldJob.solidGrid;
  assert.equal(grid.yard.length, plan.solids.length);
  for (const [index, solid] of plan.solids.entries()) {
    const actual = grid.yard[index];
    for (const key of ['id', 'shape', 'x', 'z', 'halfX', 'halfZ', 'height']) assert.equal(actual[key], solid[key]);
    assert.equal(actual.heading, solid.heading ?? 0);
    assert.equal(actual.y, scablandsSurfaceHeightAt(actual.x, actual.z));
  }
  assert.equal(makeDuel(EVERBURN_JOBS[1]).state.arena.worldJob.solidGrid?.yard?.length ?? 0, 0);
  const run = (target, bearing) => {
    const d = makeDuel(definition), direction = {x:Math.sin(bearing), z:Math.cos(bearing)};
    const start = {x:target.x - direction.x * 14, z:target.z - direction.z * 14};
    const at = d.course.nearest(start.x, start.z);
    placeActor(d, d.state, {s:at.s, lateral:at.lateral,
      headingError:wrapHeading(bearing - d.course.at(at.s).heading)}, 30 / 1.609344);
    d.state.countdown = 0;
    for (let i = 0; i < 240; i++) { d.setInput({throttle:1}); d.step(1 / 60); }
    const end = d.course.worldAt(d.state.s, d.state.lateral);
    return (end.x - target.x) * direction.x + (end.z - target.z) * direction.z;
  };
  const wall = plan.solids.find(solid => solid.id.startsWith('yard-wall-'));
  const wallBearing = Math.atan2(wall.x, wall.z);
  assert.ok(run(wall, wallBearing) < 0, 'the car stops at a wall sheet');
  const tower = plan.solids.find(solid => solid.id === 'yard-gate-tower-a');
  assert.ok(run(tower, plan.gate.bearing) < 0, 'the car stops at a gate tower');
  assert.equal(plan.openings.length, 6);
  for (const opening of plan.openings) {
    const target = {x:Math.sin(opening.bearing) * plan.radius, z:Math.cos(opening.bearing) * plan.radius};
    assert.ok(run(target, opening.bearing) > 3, `the car passes the ${opening.id} opening`);
  }
}
const step = definition.steps[0], pickup = step.pickup.place.position;
// The bed route reaches the Wash scoop, then passes beneath the bridge on the lower floor.
{
  const way = HOT_DELIVERY_WAYS.find(item => item.id === 'river-bed');
  const route = routeFor(way.legs, {start:LAND.yard, destination:LAND.at('tin-town')});
  const wash = step.braziers.find(item => item.id === 'wash-brazier').position;
  const bridge = LAND.at('girder-bridge');
  const washHit = nearestOnLine(route, wash.x, wash.z), passage = LAND.at('girder-bed-passage');
  const bridgeHit = nearestOnLine(route, passage.x, passage.z);
  assert.ok(washHit.distance < 1 && bridgeHit.distance < 1 && washHit.along < bridgeHit.along);
  const a = LAND.at('girder-bed-approach');
  const heading = Math.atan2(passage.x - a.x, passage.z - a.z);
  const duel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true}});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
    cpuDifficulty:'medium', opponents:[], job:{...definition, seed:19}}), true);
  const state = duel.state, world = state.arena.worldJob;
  const washStart = {x:wash.x - 15 * Math.sin(heading), z:wash.z - 15 * Math.cos(heading)};
  const washAt = duel.course.nearest(washStart.x, washStart.z);
  placeActor(duel, state, {s:washAt.s, lateral:washAt.lateral,
    headingError:wrapHeading(heading - duel.course.at(washAt.s).heading)}, 10 / 1.609344);
  state.countdown = 0;
  world.job.stepState = {loaded:true, ember:30};
  for (let i = 0; i < 900 && !world.job.stepState.scoopedBraziers?.includes('wash-brazier'); i++) {
    const point = duel.course.worldAt(state.s, state.lateral);
    const distance = Math.hypot(point.x - wash.x, point.z - wash.z);
    duel.setInput(distance > 7 ? {throttle:0.2, brake:0} : {throttle:0, brake:1});
    duel.step(1 / 60);
  }
  assert.ok(world.job.stepState.scoopedBraziers?.includes('wash-brazier'), 'the car reaches and scoops at the Wash');
  const start = {x:passage.x - Math.sin(heading) * 35, z:passage.z - Math.cos(heading) * 35};
  const at = duel.course.nearest(start.x, start.z);
  placeActor(duel, state, {s:at.s, lateral:at.lateral,
    headingError:wrapHeading(heading - duel.course.at(at.s).heading)}, 25 / 1.609344);
  state.countdown = 0;
  world.job.stepState = {loaded:true, ember:100};
  let passed = false, closest = Infinity, last;
  for (let i = 0; i < 900; i++) {
    duel.setInput({throttle:0.4, brake:0}); duel.step(1 / 60);
    const point = duel.course.worldAt(state.s, state.lateral), floors = [];
    const along = (point.x - passage.x) * Math.sin(heading) + (point.z - passage.z) * Math.cos(heading);
    closest = Math.min(closest, Math.hypot(point.x - bridge.x, point.z - bridge.z));
    last = {point, along, height:state.groundHeight, floors};
    if (scablandsFloorsAt(point.x, point.z, floors) === 2 && along > 5 && state.groundHeight < floors[0] - 2) passed = true;
  }
  assert.ok(passed, `the car drives under the bridge on the river floor: ${JSON.stringify({closest,last})}`);
}
// The actual job update measures speed on the Pipe's deck, not the bed below.
{
  const world = createWorldJob(definition);
  const state = {arena:{worldJob:world}, weaponLoadout:[], s:0, lateral:0, opponents:[], speedMph:0, stageTimeSec:0, input:{}, cpuDifficulty:'medium'};
  const pipe = LAND.at('the-pipe');
  let car = {x:pipe.x, z:pipe.z, y:scablandsSurfaceHeightAt(pipe.x, pipe.z)};
  const duel = {state, seed:19, course:{def:{scablands:true}, nearest:() => ({s:0, lateral:0}), at:() => ({heading:0}), worldAt:() => car}, emit:() => {}, _storyCallout:() => {}};
  initializeWorldJob(duel, definition);
  world.job.stepState = {loaded:true, ember:100};
  const tick = kmh => {state.speedMph = kmh / 1.609344; stepWorldJob(duel, 1 / 120); return world.pipeDeck;};
  assert.deepEqual(tick(40), {onDeck:true, tooFast:false});
  assert.deepEqual(tick(41), {onDeck:true, tooFast:true});
  assert.ok(state.knock, 'speeding starts a sideways slide');
  state.knock = null;
  const floors = [];
  assert.equal(scablandsFloorsAt(pipe.x, pipe.z, floors), 2);
  car = {...car, y:floors[1]};
  assert.deepEqual(tick(60), {onDeck:false, tooFast:false}, 'the bed is not the deck');
  car = {x:step.carStart.x, z:step.carStart.z, y:scablandsSurfaceHeightAt(step.carStart.x, step.carStart.z)};
  assert.deepEqual(tick(60), {onDeck:false, tooFast:false}, 'other roads are not the Pipe');
}
// Drive the real car along the Pipe with the pot loaded at each speed.
{
  const pipe = LAND.at('the-pipe');
  const road = ROAD_NET.nearest(pipe.x, pipe.z);
  const points = road.road.points, a = points[road.index], b = points[road.index + 1];
  const heading = Math.atan2(b.x - a.x, b.z - a.z);
  const drive = kmh => {
    const duel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true}});
    duel.state.wastelandGateDiscovered = true;
    assert.equal(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
      cpuDifficulty:'medium', opponents:[], job:{...definition, seed:19}}), true);
    const state = duel.state, world = state.arena.worldJob;
    const at = duel.course.nearest(pipe.x, pipe.z);
    placeActor(duel, state, {s:at.s, lateral:at.lateral,
      headingError:wrapHeading(heading - duel.course.at(at.s).heading)}, kmh / 1.609344);
    state.countdown = 0;
    world.job.stepState = {loaded:true, ember:100};
    let maxAcross = 0, highestAir = 0;
    const falls = [];
    duel.onChange((s, event) => {
      if (event.scablandsHit?.kind === 'fall' && event.scablandsHit.player) falls.push(event.scablandsHit);
    });
    let emberBeforeLanding, emberAfterLanding;
    for (let i = 0; i < (kmh === 50 ? 600 : 150); i++) {
      duel.setInput({throttle:0});
      const previousFalls = falls.length, previousEmber = world.job.stepState.ember;
      duel.step(1 / 60);
      if (falls.length > previousFalls) { emberBeforeLanding = previousEmber; emberAfterLanding = world.job.stepState.ember; }
      const point = duel.course.worldAt(state.s, state.lateral);
      highestAir = Math.max(highestAir, state.airHeight || 0);
      maxAcross = Math.max(maxAcross, Math.abs((point.x - pipe.x) * Math.cos(heading) - (point.z - pipe.z) * Math.sin(heading)));
    }
    return {maxAcross, highestAir, falls, emberBeforeLanding, emberAfterLanding};
  };
  const slow = drive(35), fast = drive(50);
  assert.ok(slow.maxAcross < 3.6, 'a car below 40 km/h stays on the Pipe');
  assert.ok(fast.maxAcross > 3.6, 'a faster car slides off the Pipe');
  assert.ok(fast.highestAir > 3, 'the fast car leaves the deck above the bed');
  assert.equal(slow.falls.length, 0, 'the slow car does not fall');
  assert.equal(fast.falls.length, 1, 'the fast car takes one landing hit');
  assert.ok(fast.falls[0].drop > 2, 'the hit measures the real fall');
  assert.ok(fast.emberAfterLanding < fast.emberBeforeLanding, 'the landing jolts the pot');
}
// The actual world-job update applies the salt wind only on the pan.
{
  const polygon = GROUND_AREAS.polygons.find(area => area.id === 'salt-pan');
  const centre = polygon.points.reduce((sum, point) => ({x:sum.x + point.x / polygon.points.length, z:sum.z + point.z / polygon.points.length}), {x:0, z:0});
  let pan;
  for (let dx = -1000; dx <= 1000 && !pan; dx += 100) for (let dz = -1000; dz <= 1000; dz += 100) {
    const point = {x:centre.x + dx, z:centre.z + dz};
    if (scablandsDriveAt(point.x, point.z).id === 'salt-pan') { pan = point; break; }
  }
  assert.ok(pan, 'the land has a salt pan point');
  const world = createWorldJob(definition);
  const state = {arena:{worldJob:world}, weaponLoadout:[], s:0, lateral:0, opponents:[], speedMph:0, stageTimeSec:0, input:{}, cpuDifficulty:'medium'};
  let car = pan;
  const duel = {state, seed:19, course:{def:{scablands:true}, nearest:() => ({s:0, lateral:0}), at:() => ({heading:0}), worldAt:() => car}, emit:() => {}, _storyCallout:() => {}};
  initializeWorldJob(duel, definition);
  const lossAt = point => {
    car = {...point, y:scablandsSurfaceHeightAt(point.x, point.z)};
    world.job.stepState = {loaded:true, ember:100};
    stepWorldJob(duel, 1);
    return 100 - world.job.stepState.ember;
  };
  const normal = step.carStart;
  assert.notEqual(scablandsDriveAt(normal.x, normal.z).id, 'salt-pan');
  const ordinaryLoss = lossAt(normal), panLoss = lossAt(pan);
  assert.ok(Math.abs(ordinaryLoss - step.ember.coldPerSecond) < 1e-9);
  assert.ok(Math.abs(panLoss / ordinaryLoss - 1.5) < 1e-9, 'the pan cools the pot half as fast again');
}
// The real watch traces the ground, resets when sight is lost, and sounds once after six seconds.
{
  const world = createWorldJob(definition), events = [];
  const state = {arena:{worldJob:world}, weaponLoadout:[], s:0, lateral:0,
    opponents:[], speedMph:0, stageTimeSec:0, input:{}, cpuDifficulty:'medium'};
  let car = {x:FURNACE_SKYLINE.x + 30, z:FURNACE_SKYLINE.z};
  car.y = scablandsSurfaceHeightAt(car.x, car.z);
  const duel = {state, seed:19, course:{def:{scablands:true}, nearest:() => ({s:0, lateral:0}),
    at:() => ({heading:0}), worldAt:() => car}, emit:event => events.push(event), _storyCallout:() => {}};
  initializeWorldJob(duel, definition);
  world.job.stepState = {loaded:true, ember:100};
  const tick = dt => { world.sightStep = 0; stepWorldJob(duel, dt); };
  const horns = () => events.filter(event => event.arenaTell?.cue === 'world.furnace.horn');
  assert.ok(SOUND_BANK['world.furnace.horn']?.layers.length);
  tick(4);
  assert.equal(world.skylineSight.visible, true);
  car = {x:FURNACE_SKYLINE.x + 2000, z:FURNACE_SKYLINE.z, y:0};
  tick(0.1);
  assert.equal(world.skylineSight.seconds, 0);
  car = {x:FURNACE_SKYLINE.x + 30, z:FURNACE_SKYLINE.z};
  car.y = scablandsSurfaceHeightAt(car.x, car.z);
  tick(6);
  assert.equal(horns().length, 0);
  assert.equal(world.actors.filter(actor => actor.id.startsWith('furnace-rider-')).length, 0);
  tick(0.1);
  assert.equal(horns().length, 1);
  const riders = world.actors.filter(actor => actor.id.startsWith('furnace-rider-'));
  assert.equal(riders.length, 2);
  assert.ok(riders.every(rider => rider.pursuing && rider.renderCar === 'dusthawk_rally'));
  const starts = riders.map(rider => ({...rider.position}));
  assert.ok(starts.every(start => Math.hypot(start.x - FURNACE_SKYLINE.x, start.z - FURNACE_SKYLINE.z) < 10));
  car = {x:FURNACE_SKYLINE.x + 300, z:FURNACE_SKYLINE.z};
  car.y = scablandsSurfaceHeightAt(car.x, car.z);
  for (let i = 0; i < 180; i++) tick(0.1);
  for (const [index, rider] of riders.entries()) {
    assert.ok(rider.position.y < starts[index].y - 10, 'the rider comes down from the watch');
    assert.ok(Math.hypot(rider.position.x - car.x, rider.position.z - car.z) < 30, 'the rider pursues the car');
  }
  tick(1);
  assert.equal(horns().length, 1);
  assert.equal(world.actors.filter(actor => actor.id.startsWith('furnace-rider-')).length, 2);
}
// The mode creates the actual waiting vehicles, on the appropriate floor at each barricade.
const waitingWorld = createWorldJob(definition);
const waitingState = {arena:{worldJob:waitingWorld}, weaponLoadout:[], s:0, lateral:0};
const waitingDuel = {state:waitingState, seed:19, course:{def:{scablands:true},
  nearest:() => ({s:0, lateral:0}), at:() => ({heading:0})}};
initializeWorldJob(waitingDuel, definition);
assert.equal(waitingWorld.actors.length, 2);
for (const [index, actor] of waitingWorld.actors.entries()) {
  const barrier = step.barriers[index], floors = [];
  assert.equal(actor.id, step.waitingActors[index].id);
  assert.equal(actor.renderCar, 'dusthawk_rally');
  assert.equal(actor.speed, 0);
  assert.ok(Math.hypot(actor.position.x - barrier.position.x, actor.position.z - barrier.position.z) <= 21);
  scablandsFloorsAt(actor.position.x, actor.position.z, floors);
  assert.equal(actor.position.y, floors[0]);
  assert.equal(pushOutOfSolids(actor.position.x, actor.position.z, 1, undefined, actor.position.y).hit, null);
}
// A loaded pot near a post draws that post's rider; the other remains waiting.
{
  const rider = waitingWorld.actors[0], distant = waitingWorld.actors[1];
  const start = {...rider.position}, otherStart = {...distant.position};
  const car = {x:start.x + 30, y:start.y, z:start.z};
  Object.assign(waitingState, {opponents:[], speedMph:0, stageTimeSec:0, input:{}, cpuDifficulty:'medium'});
  Object.assign(waitingDuel, {emit:() => {}, _storyCallout:() => {}});
  waitingDuel.course.worldAt = () => car;
  waitingWorld.job.stepState = {};
  stepWorldJob(waitingDuel, 0.25);
  assert.deepEqual(rider.position, start, 'the rider waits before the pot is loaded');
  waitingWorld.job.stepState = {loaded:true, ember:100};
  stepWorldJob(waitingDuel, 0.25);
  assert.ok(Math.hypot(rider.position.x - car.x, rider.position.z - car.z) < 30);
  assert.ok(rider.speed > 0);
  assert.deepEqual(distant.position, otherStart);
}
// Drive the actual rider into a stationary car, then process the impact through the job.
{
  const rider = waitingWorld.actors[0];
  const car = {x:rider.position.x + 5, y:rider.position.y, z:rider.position.z};
  const cues = [];
  waitingDuel.course.worldAt = () => car;
  waitingDuel.emit = event => cues.push(event);
  waitingWorld.job.stepState = {loaded:true, ember:100};
  waitingState.speedMph = 0;
  stepWorldJob(waitingDuel, 0.2);
  assert.ok(waitingState.knock, 'the ram shoves the car');
  assert.ok(waitingWorld.riderHitKmh > step.ember.hitFreeKmh);
  stepWorldJob(waitingDuel, 0.01);
  assert.equal(waitingWorld.job.stepState.joltCount, 1);
  assert.ok(waitingWorld.job.stepState.ember < 100);
  assert.ok(cues.some(event => event.arenaTell?.cue === 'world.ember.spark'));
  stepWorldJob(waitingDuel, 0.01);
  assert.equal(waitingWorld.job.stepState.joltCount, 1, 'continued contact is one ram');
}
assert.deepEqual(step.braziers.map(b => b.id), ['yard-brazier', 'halfway-brazier', 'wash-brazier']);
// The camp scoop calls its rider even when that rider is outside the usual pursuit range.
{
  const world = createWorldJob(definition);
  const state = {arena:{worldJob:world}, weaponLoadout:[], s:0, lateral:0,
    opponents:[], speedMph:0, stageTimeSec:0, input:{}, cpuDifficulty:'medium'};
  let car = {...step.braziers[0].position};
  const duel = {state, seed:19, course:{def:{scablands:true}, nearest:() => ({s:0, lateral:0}),
    at:() => ({heading:0}), worldAt:() => car}, emit:() => {}, _storyCallout:() => {}};
  initializeWorldJob(duel, definition);
  world.job.stepState = {loaded:true, ember:80};
  stepWorldJob(duel, 0.1);
  assert.equal(world.job.stepState.scoopBrazier, 'yard-brazier');
  assert.notEqual(world.actors[0].pursuing, true);
  car = {...step.braziers[1].position};
  world.actors[0].position = {...world.actors[0].position, x:car.x + 200, z:car.z};
  stepWorldJob(duel, 0.1);
  assert.equal(world.job.stepState.scoopBrazier, 'halfway-brazier');
  assert.ok(world.job.stepState.scoopTime < 3, 'the ambush begins during the scoop');
  assert.equal(world.actors[0].pursuing, true);
  assert.notEqual(world.actors[1].pursuing, true);
}
// A loaded car crossing the 400 m line at the gate sends both riders home once.
{
  const world = createWorldJob(definition), wall = step.riderSafeWall, captions = [];
  const state = {arena:{worldJob:world}, weaponLoadout:[], s:0, lateral:0,
    opponents:[], speedMph:0, stageTimeSec:0, input:{}, cpuDifficulty:'medium'};
  let car = {x:wall.x, z:wall.z + wall.radius + 1};
  car.y = scablandsSurfaceHeightAt(car.x, car.z);
  const duel = {state, seed:19, course:{def:{scablands:true}, nearest:() => ({s:0, lateral:0}),
    at:() => ({heading:0}), worldAt:() => car}, emit:() => {}, _storyCallout:text => captions.push(text)};
  initializeWorldJob(duel, definition);
  world.job.stepState = {loaded:true, ember:100};
  for (const rider of world.actors) rider.pursuing = true;
  stepWorldJob(duel, 0);
  assert.notEqual(world.ridersRetreating, true, 'outside 400 m the pursuit continues');
  car = {...car, z:wall.z + wall.radius - 1};
  for (const rider of world.actors) rider.position.x += 30;
  const before = world.actors.map(rider => ({...rider.position}));
  stepWorldJob(duel, 0.1);
  assert.equal(world.ridersRetreating, true);
  for (const [index, rider] of world.actors.entries()) {
    const home = step.waitingActors[index].start.position;
    assert.equal(rider.pursuing, false);
    assert.ok(Math.hypot(rider.position.x-home.x, rider.position.z-home.z) <
      Math.hypot(before[index].x-home.x, before[index].z-home.z));
  }
  const line = captions.filter(text => text.includes('Our guns cover the road.'));
  assert.equal(line.length, 1);
  car = {...car, z:wall.z + wall.radius + 100};
  stepWorldJob(duel, 0.1);
  assert.equal(captions.filter(text => text.includes('Our guns cover the road.')).length, 1);
  assert.ok(world.actors.every(rider => !rider.pursuing), 'the riders do not resume pursuit');
}
// The actual job grid holds both barricades on their named floor, including the bridge deck.
const barricadeGrid = createJobSolidGrid(createSolidGrid([]));
barricadeGrid.setBarricades(step.barriers);
for (const [index, barrier] of step.barriers.entries()) {
  const named = LAND.at(['safe-road', 'girder-bridge'][index]), floors = [];
  assert.deepEqual({x:barrier.position.x, z:barrier.position.z}, named);
  scablandsFloorsAt(named.x, named.z, floors);
  assert.equal(barrier.position.y, floors[0]);
  assert.equal(pushOutOfSolids(named.x, named.z, 1, barricadeGrid, floors[0]).hit?.id, barrier.id);
  if (index === 1) {
    assert.equal(floors.length, 2);
    assert.equal(pushOutOfSolids(named.x, named.z, 1, barricadeGrid, floors[1]).hit, null);
  }
}
// Fire the real car flamethrower at each named barricade and step the job.
{
  const world = createWorldJob(definition);
  const state = {arena:{mode:'world-job', worldJob:world, participants:[]}, weaponLoadout:[],
    s:0, lateral:0, opponents:[], speedMph:0, stageTimeSec:0, input:{}, cpuDifficulty:'medium',
    combat:{serial:0, flameBursts:[], flameBurns:{}}};
  let car;
  const duel = {state, seed:19, course:{def:{scablands:true}, solidGrid:createSolidGrid([]),
    nearest:() => ({s:0, lateral:0}), at:() => ({heading:0}),
    worldAt:() => car, groundAt:() => car}, emit:() => {}, _storyCallout:() => {}};
  initializeWorldJob(duel, definition);
  world.job.stepState = {loaded:true, ember:100};
  state.worldJobThingsHit = [{id:step.barriers[0].id, kind:'barricade', burnable:true}];
  car = {...step.barriers[0].position, heading:0};
  stepWorldJob(duel, 0.01);
  assert.ok(!world.job.stepState.burntBarricades.includes(step.barriers[0].id), 'a projectile does not burn a barricade');
  for (const barrier of step.barriers) {
    const p = barrier.position;
    car = {x:p.x, y:p.y, z:p.z - 6, heading:0};
    state.headingError = 0;
    stepWorldJob(duel, 0.01);
    assert.equal(pushOutOfSolids(p.x, p.z, 1, world.solidGrid, p.y).hit?.id, barrier.id);
    assert.ok(startFlamethrower(duel, state));
    stepFlamethrowers(duel, 0.1);
    assert.ok(state.worldJobThingsHit.some(hit => hit.id === barrier.id && hit.flame));
    stepWorldJob(duel, 0.01);
    assert.ok(world.job.stepState.burntBarricades.includes(barrier.id));
    assert.equal(pushOutOfSolids(p.x, p.z, 1, world.solidGrid, p.y).hit, null);
    assert.ok(!worldJobHitTargets(duel).some(target => target.id === barrier.id));
    state.combat.flameBursts = [];
  }
}

for (const [index, brazier] of step.braziers.entries()) {
  const p = brazier.position, named = LAND.at(['yard', 'safe-road', 'the-wash'][index]);
  if (index > 0) assert.ok(Math.hypot(p.x - named.x, p.z - named.z) <= 9.000001);
  assert.equal(p.y, scablandsSurfaceHeightAt(p.x, p.z));
  assert.equal(pushOutOfSolids(p.x, p.z, 1, undefined, p.y).hit, null);
}
assert.ok(riverDepthAt(step.braziers[2].position.x, step.braziers[2].position.z) > 0);
for (let i = 0; i < 3; i++) {
  assert.deepEqual({x:step.braziers[i].position.x, z:step.braziers[i].position.z}, brazierSpotsFor(step)[i]);
}
const braziers = createBraziers(3);
braziers.place(step.braziers.map(b => b.position));
braziers.group.updateMatrixWorld(true);
assert.equal(braziers.group.children.length, 3);
for (const [index, stand] of braziers.group.children.entries()) {
  const position = step.braziers[index].position;
  assert.deepEqual(stand.position.toArray(), [position.x, position.y, position.z]);
  const smoke = stand.getObjectByName('Brazier smoke column');
  assert.ok(smoke);
  const bounds = new THREE.Box3().setFromObject(smoke);
  assert.ok(Math.abs(bounds.min.y - position.y) < 1e-9);
  assert.ok(Math.abs(bounds.max.y - position.y - 40) < 1e-9);
  assert.ok(Math.abs((bounds.min.x + bounds.max.x) / 2 - position.x) < 1e-9);
  assert.ok(Math.abs((bounds.min.z + bounds.max.z) / 2 - position.z) < 1e-9);
}
braziers.dispose();
const figure = createCinderFigure();
assert.equal(figure.name, 'Cinder at the yard gate');
assert.ok(figure.children.some(child => child.isMesh));
assert.ok(Math.hypot(pickup.x - brazierSpotsFor(step)[0].x, pickup.z - brazierSpotsFor(step)[0].z) < 3);
// Measure the real start and pickup against the gate and job solids.
{
  const gate = yardPlan().gate, forward = {x:Math.sin(gate.bearing), z:Math.cos(gate.bearing)};
  const relative = point => ({along:(point.x - LAND.yard.x - gate.x) * forward.x + (point.z - LAND.yard.z - gate.z) * forward.z,
    left:-(point.x - LAND.yard.x - gate.x) * forward.z + (point.z - LAND.yard.z - gate.z) * forward.x});
  const start = relative(step.carStart), cinder = relative(pickup), fire = relative(step.braziers[0].position);
  assert.ok(Math.abs(start.along + 40) < 1e-9 && Math.abs(start.left) < 1e-9);
  assert.ok(Math.abs(step.carStart.heading - gate.bearing) < 1e-9);
  assert.ok(Math.abs(fire.along + 8) < 1e-9 && Math.abs(fire.left - 7) < 1e-9);
  assert.ok(Math.abs(cinder.along + 8) < 1e-9 && Math.abs(cinder.left - 9) < 1e-9);
  const grid = createJobSolidGrid();
  grid.setYard(yardPlan().solids);
  for (const point of [step.carStart, pickup, step.braziers[0].position]) {
    assert.equal(pushOutOfSolids(point.x, point.z, 1, grid, scablandsSurfaceHeightAt(point.x, point.z)).hit, null);
  }
}
let job = createJob(definition, 19);
const view = (x, z, speedKmh = 0) => ({player: {position: {x, z}}, speedKmh});
const hud = () => worldHudModel({worldJob: {job, definition}, player: {x: step.carStart.x, z: step.carStart.z}});
job = stepJob(job, view(step.carStart.x, step.carStart.z), 5);
assert.equal(job.stepState.loaded, undefined);
assert.equal(hud().ember, null);
assert.equal(hud().target.id, 'cinder');
const worldJob = {job, definition, actors: [{id: 'rider', ambushKey: 'camp', position: {x: pickup.x, z: pickup.z}}]};
const state = {s: 0, lateral: 0, arena: {mode: 'world-job', worldJob}};
const course = {worldAt: () => ({x: step.carStart.x, z: step.carStart.z, heading: step.carStart.heading})};
const frame = () => worldMapFrame({state, course, model: worldHudModel({worldJob}), knowledge: {}, picture: {}, canvas: null});
assert.equal(frame().target.id, 'cinder');
assert.deepEqual(frame().actors, []);
job = stepJob(job, view(pickup.x, pickup.z, 10), 1);
assert.equal(job.stepState.pickingUp, undefined);
job = stepJob(job, view(pickup.x + 8.1, pickup.z), 1);
assert.equal(job.stepState.pickingUp, undefined);
job = stepJob(job, view(pickup.x + 7.9, pickup.z), .1);
const lines = job.requests.filter(request => request.type === 'say').map(request => request.lineId);
for (let i = 0; i < 100 && !job.stepState.loaded; i++) {
  job = stepJob(job, view(pickup.x, pickup.z), .1);
  lines.push(...job.requests.filter(request => request.type === 'say').map(request => request.lineId));
  if (!job.stepState.loaded) assert.equal(hud().ember, null);
}
assert.deepEqual(lines, step.pickup.lines);
assert.equal(job.stepState.loaded, true);
worldJob.job = job;
assert.equal(frame().actors.length, 1);
assert.ok(hud().ember.value > 99);
assert.equal(hud().target.id, 'tin-town');
// Exercise the real job step with each brazier, including interrupted stops and an out ember.
job.stepState = {...job.stepState, ember: 0, out: true};
for (const brazier of step.braziers) {
  const {x, z} = brazier.position;
  job = stepJob(job, view(x + 8.1, z), 3);
  assert.ok(!job.events.some(event => event.type === 'emberRelit'));
  job = stepJob(job, view(x, z), 2);
  job = stepJob(job, view(x, z, -2), 1);
  job = stepJob(job, view(x, z), 2);
  assert.ok(!job.events.some(event => event.type === 'emberRelit'));
  const before = job.stepState.ember;
  const wasOut = job.stepState.out;
  job = stepJob(job, view(x, z), 1);
  assert.ok(Math.abs(job.stepState.ember - Math.min(100, before - (wasOut ? 0 : step.ember.coldPerSecond) + 25)) < 1e-9);
  assert.equal(job.stepState.out, false);
  assert.deepEqual(job.events.filter(event => event.type === 'emberRelit').map(event => event.place), [brazier.id]);
  job = stepJob(job, view(x, z), 4);
  assert.ok(!job.events.some(event => event.type === 'emberRelit'));
}
// Map knowledge starts with the yard, then keeps each brazier seen within 400 m.
const knowledge = createKnowledge(), facts = jobFacts({job, definition});
const yard = step.braziers[0].position;
learn(knowledge, {car: {x: yard.x, z: yard.z}, ...facts});
assert.deepEqual([...knowledge.braziers.keys()], ['yard-brazier']);
for (const brazier of step.braziers.slice(1)) {
  const p = brazier.position;
  const far = {x: p.x + 401, z: p.z};
  learn(knowledge, {car: far, braziers: [step.braziers[0], brazier]});
  assert.equal(knowledge.braziers.has(brazier.id), false);
  const near = {x: p.x + 10, z: p.z};
  assert.ok(sees(near, p, {heightAt: scablandsSurfaceHeightAt, actorFloors: true, eye: 1.5, target: 2, step: 5, range: 400}));
  learn(knowledge, {car: near, braziers: [step.braziers[0], brazier]});
  assert.equal(knowledge.braziers.has(brazier.id), true);
}
// Find a real blocked sight line within range, and show that it does not reveal the brazier.
const hidden = step.braziers[1].position;
let blocked = null;
for (let dx = -390; dx <= 390 && !blocked; dx += 20) for (let dz = -390; dz <= 390; dz += 20) {
  const car = {x: hidden.x + dx, z: hidden.z + dz};
  if (Math.hypot(dx, dz) <= 400 && !sees(car, hidden, {heightAt: scablandsSurfaceHeightAt, actorFloors: true, eye: 1.5, target: 2, step: 5, range: 400})) { blocked = car; break; }
}
assert.ok(blocked, 'the real land has a blocked view near the camp');
const obscured = createKnowledge();
learn(obscured, {car: blocked, braziers: step.braziers.slice(0, 2)});
assert.equal(obscured.braziers.has('halfway-brazier'), false);
// The out-pot pointer uses only map knowledge and turns with the car.
const arrowCar = {x: hidden.x + 10, z: hidden.z, heading: 0};
assert.equal(brazierArrow({out: false}, arrowCar, knowledge), null);
const yardOnly = brazierArrow({out: true}, arrowCar, obscured);
assert.equal(yardOnly.id, 'yard-brazier');
assert.ok(Math.abs(yardOnly.distance - Math.hypot(yard.x - arrowCar.x, yard.z - arrowCar.z)) < 1e-9);
const campArrow = brazierArrow({out: true}, arrowCar, knowledge);
assert.equal(campArrow.id, 'halfway-brazier');
assert.equal(campArrow.distance, 10);
assert.ok(Math.abs(campArrow.angle + 90) < 1e-9);
assert.ok(Math.abs(campArrow.x - 4) < 1e-9);
const turned = brazierArrow({out: true}, {...arrowCar, heading: -Math.PI / 2}, knowledge);
assert.ok(Math.abs(turned.angle) < 1e-9);
assert.ok(Math.abs(turned.y - 6) < 1e-9);
// Record the actual flame marks painted by both maps.
const picture = getLandPicture(), translations = [], marks = [];
let current = null;
const context = new Proxy({measureText: value => ({width: String(value).length * 8}), save() {}, restore() {},
  translate(x, y) { current = {x, y}; translations.push(current); },
  fill() { if (this.fillStyle === '#ff8a4c' && current) marks.push(current); }},
  {get(target, key) { return key in target ? target[key] : () => {}; }, set(target, key, value) { target[key] = value; return true; }});
const car = {x: yard.x, z: yard.z, heading: 0};
const mapFrame = {picture, canvas: null, car, target: null, knowledge, actors: []};
for (const [draw, size, view] of [[drawSmallMap, {width: 400, height: 280}, smallView(car)],
  [drawBigMap, {width: 1400, height: 1000}, wholeView(picture, {width: 1400, height: 1000})]]) {
  marks.length = 0;
  draw(context, mapFrame, size);
  const visible = [...knowledge.braziers.values()].map(p => toScreen(view, p.x, p.z)).filter(p => p.x >= 0 && p.y >= 0 && p.x <= size.width && p.y <= size.height);
  for (const p of visible) assert.ok(marks.some(m => Math.abs(m.x - p.x) < 1e-7 && Math.abs(m.y - p.y) < 1e-7));
  assert.equal(marks.length, visible.length);
}
assert.deepEqual(job.stepState.scoopedBraziers, step.braziers.map(b => b.id));
assert.equal(job.stepState.relights, 1);
console.log('Hot Delivery pickup: start, stop, three lines and ember passed.');
