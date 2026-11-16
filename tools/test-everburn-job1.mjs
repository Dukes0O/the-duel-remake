import assert from 'node:assert/strict';
import * as THREE from 'three';
import {EVERBURN_JOBS, EVERBURN_SIDE_JOBS} from '../src/world/jobs/everburn.js';
import {gasRunPaths} from '../src/world/jobs/gas-run.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {stepCarry} from '../src/world/jobs/steps/carry.js';
import {worldHudModel, worldMapFrame, worldMapWays, waysMarkup, brazierArrow, learnWayCrossings, checkWayCrossings, learnDrivenWays, learnHotDeliveryDangers, moveMapCaption} from '../src/world/world-hud.js';
import {createHudScreen, presentJumpHeight} from '../src/screen-hud.js';
import {createCombatHud} from '../src/combat-hud.js';
import {arenaPauseScreen} from '../src/screen-arena.js';
import {WEAPON_IDS} from '../src/weapon-upgrades.js';
import {brazierSpotsFor, createBraziers, createCinderFigure} from '../src/world/ember-pot.js';
import {LAND} from '../src/world/scablands-names.js';
import {ROAD_NET} from '../src/world/scablands-road.js';
import {createKnowledge, jobFacts, learn, drawSmallMap, drawBigMap, getLandPicture, smallView, wholeView, toScreen} from '../src/world/scablands-map.js';
import {sees, HOT_DELIVERY_WAYS, WATCH, routeFor, nearestOnLine, sliceLine, sampleLine, pathLength} from '../src/world/scablands-ways.js';
import {scablandsSurfaceHeightAt, scablandsFloorsAt} from '../src/world/scablands-ground.js';
import {pushOutOfSolids, createJobSolidGrid, createSolidGrid, SCABLANDS_SOLIDS} from '../src/world/scablands-solids.js';
import {FORGE, forgePlan, createForge} from '../src/world/forge-look.js';
import {riverDepthAt, scablandsDriveAt, stepsWayFor, GROUND_AREAS} from '../src/world/scablands-regions.js';
import {createWorldJob, initializeWorldJob, stepWorldJob, worldJobHitTargets, roadRiderSight} from '../src/arena/modes/world-job.js';
import {startFlamethrower, stepFlamethrowers} from '../src/arsenal/flamethrower.js';
import {Course} from '../src/course.js';
import {SCABLANDS_VENUE} from '../src/world/scablands.js';
import {createScablandsScene} from '../src/world/scablands-scene.js';
import {animateScene, syncScene} from '../src/scene-systems.js';
import {yardPlan} from '../src/world/scablands-yard-look.js';
import {FURNACE_SKYLINE, furnaceSighting, stepSkylineSight} from '../src/world/jobs/furnace-sightings.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {Duel} from '../src/game.js';
import {scablandsLanded} from '../src/sim-scablands.js';
import {GROUND} from '../src/world/scablands-ground-rules.js';
import {sightStretches, coverStretches, separatedCover, platesCoverLine, bedStepsRoute, driveToCinder, driveThroughYardGate, driveAlongRoad, drivePlatesShelter, drivePlatesRoughGround, driveMeasuredStretches, driveToBrazier, driveToForge} from './everburn-job1-drive.mjs';
import {placeActor} from '../src/arena/arena-event.js';
import {updateArenaMarkers} from '../src/arena/arena-tell-view.js';
import {wrapHeading} from '../src/offroad-physics.js';
import '../src/story/ember-lines.js';
import {mapFailures, pictureFailures, drawFocusedPicture} from './scenarios/everburn-job1.mjs';
import {createProfile} from '../src/progression.js';
import {markEmberRead, markEmberJob, EMBER_JOBS} from '../src/story/ember-save.js';
import {emberStoryProps} from '../src/story/ember-road.js';
import {emberWallMarkup, emberNextUp} from '../src/story/ember-ui.js';
import {arenaResultsScreen} from '../src/screen-arena.js';

// Completing Hot Delivery does not offer a story job that is still being made.
{
  let profile = markEmberRead(createProfile()).profile;
  profile = markEmberJob(profile, EMBER_JOBS[0]).profile;
  const props = emberStoryProps(profile, {available:true});
  const wall = emberWallMarkup(props);
  assert.match(wall, /The next job is being made\./);
  assert.doesNotMatch(wall, /data-ember-step="get-out-and-walk"/);
  assert.deepEqual(emberNextUp(props), {text:'The next job is being made.', button:''});
  const screen = arenaResultsScreen({arena:{mode:'world-job', result:{winnerId:'player'},
    worldJob:{definition:EVERBURN_JOBS[0]}}}, {metric:()=>'', action:(label, id)=>`${id}:${label}|`, escapeHTML:String});
  assert.match(screen.description, /The next job is being made\./);
  assert.equal(screen.actions, 'arena-yard:BACK TO THE YARD|');
}

{
  assert.doesNotThrow(() => new Function(`return (${drawFocusedPicture.toString()})`), 'the focused view function parses for the page');
  const camera = new THREE.PerspectiveCamera(50, 1, .1, 1000);
  const scene = new THREE.Scene(), target = new THREE.Vector3(20, 3, -40);
  let drawn = false;
  drawFocusedPicture(camera, {render(actualScene, actualCamera) {
    drawn = true;
    assert.equal(actualScene, scene);
    const projected = target.clone().add(new THREE.Vector3(0, 1, 0)).project(actualCamera);
    assert.ok(Math.abs(projected.x) < .001 && Math.abs(projected.y) < .001, 'the focused target is at the centre when the picture is drawn');
  }}, scene, target, {dx:12, dy:6, dz:15});
  assert.ok(drawn, 'the focused picture is drawn without resetting the camera');
}

// The visual handoff names all map faults, rather than accepting any open map.
assert.deepEqual(mapFailures('start', {map:'WHAT YOU KNOW\nEast Road', mapWays:['East Road']}, true), []);
assert.deepEqual(mapFailures('start', {map:'Other routes', mapWays:['Plates', 'Salt pan']}, true), [
  'start: the map has no What you know heading', 'start: the East Road is missing from the map',
  'start: the starting map must list only the East Road',
]);
assert.deepEqual(mapFailures('bridge', {map:null, mapWays:[]}), ['bridge: the large map is not open']);
assert.deepEqual(mapFailures('bridge', {map:'WHAT YOU KNOW\nEast Road\nA barricade of the Ash Men.', mapWays:['East Road']}, false, true), []);
assert.deepEqual(mapFailures('bridge', {map:'WHAT YOU KNOW\nEast Road', mapWays:['East Road']}, false, true), [
  'bridge: the barricade met on the road is missing from the map',
]);
assert.deepEqual(pictureFailures('Cinder', {target:'Cinder', visible:true, inView:true, loaded:true, potInView:true}, {loaded:true, pot:true}), []);
assert.deepEqual(pictureFailures('Cinder', {target:'Cinder', visible:false, inView:false, loaded:false, potInView:false}, {loaded:true, pot:true}), [
  'Cinder: Cinder is not visible inside the picture', 'Cinder: the pot is not on the car', 'Cinder: the pot is not visible inside the picture',
]);
assert.deepEqual(pictureFailures('pot', {target:'pot', visible:true, inView:true, aboveCar:true, holdElapsed:3}, {aboveCar:true, holdAt:3}), []);
assert.deepEqual(pictureFailures('pot', {target:'pot', visible:false, inView:false, aboveCar:false, holdElapsed:2}, {aboveCar:true, holdAt:3}), [
  'pot: pot is not visible inside the picture', 'pot: the pot is not above the car', 'pot: the delivery hold is not at 3 seconds',
]);
assert.deepEqual(pictureFailures('fire', {target:'fire', visible:true, inView:true, forgeFire:{}, holdElapsed:8}, {forge:true, holdAt:8}), []);
assert.deepEqual(pictureFailures('fire', {target:'fire', visible:false, inView:false, forgeFire:null, holdElapsed:8}, {forge:true, holdAt:8}), [
  'fire: fire is not visible inside the picture', 'fire: the forge has not caught fire',
]);

const definition = EVERBURN_JOBS.find(job => job.id === 'everburn-hot-delivery');
// Count the actual sight calls made by the same scheduler used in the job step.
{
  const riders = [{}, {}], counts = [0, 0], first = [];
  for (let tick = 0; tick < 1200; tick++) {
    riders.forEach((rider, index) => roadRiderSight(rider, 1 / 120, index, () => {
      counts[index]++;
      first[index] ??= tick;
      return true;
    }));
  }
  assert.ok(counts.every(count => count <= 40 && count >= 38), `sight traces: ${counts}`);
  assert.notEqual(first[0], first[1], 'the riders trace at different times');
}
// The actual job step confines barricade riders to their road and returns them to post.
{
  const world = createWorldJob(definition), state = {arena:{worldJob:world}, weaponLoadout:[], s:0, lateral:0,
    opponents:[], speedMph:0, stageTimeSec:0, input:{}, cpuDifficulty:'medium'};
  let car = {...definition.steps[0].waitingActors[0].start.position};
  const duel = {state, seed:19, course:{def:{scablands:true}, nearest:() => ({s:0, lateral:0}),
    at:() => ({heading:0}), worldAt:() => car}, emit:() => {}, _storyCallout:() => {}};
  initializeWorldJob(duel, definition);
  world.job.stepState = {loaded:true, ember:100};
  const [camp, bridge] = world.actors, posts = definition.steps[0].waitingActors;
  const tick = dt => stepWorldJob(duel, dt);
  car = {...posts[0].start.position, y:camp.position.y};
  tick(0.1);
  assert.equal(camp.pursuing, true, 'the camp rider chases a car on the road');
  car = {...car, y:car.y - 100};
  tick(4.9);
  assert.equal(camp.pursuing, true, 'the rider searches for five seconds after losing sight');
  tick(0.2);
  assert.equal(camp.pursuing, false, 'the rider turns back after five seconds without sight');
  const crossing = LAND.at('girder-bridge'), floors = [];
  scablandsFloorsAt(crossing.x, crossing.z, floors);
  car = {...crossing, y:floors[1]};
  bridge.pursuing = true;
  tick(0.1);
  assert.equal(bridge.pursuing, false, 'the bridge rider does not chase beneath the deck');
  const steps = stepsWayFor();
  car = {x:steps.x, z:steps.z, y:scablandsSurfaceHeightAt(steps.x, steps.z)};
  bridge.pursuing = true;
  tick(0.1);
  assert.equal(bridge.pursuing, false, 'the bridge rider does not chase on the Steps');
  car = {...posts[0].start.position, x:posts[0].start.position.x + 2000, y:camp.position.y};
  camp.position = {...posts[0].start.position, y:camp.position.y, x:posts[0].start.position.x + 10};
  camp.pursuing = true;
  for (let i = 0; i < 100; i++) tick(0.1);
  assert.ok(Math.hypot(camp.position.x - posts[0].start.position.x, camp.position.z - posts[0].start.position.z) <= 1,
    'the rider returns to its post');
  assert.equal(camp.pursuing, false);
  // A blocked return is measured by actual progress, not by requested speed.
  camp.position = {...posts[0].start.position, x:posts[0].start.position.x + 100,
    y:scablandsSurfaceHeightAt(posts[0].start.position.x + 100, posts[0].start.position.z)};
  const blocked = {...camp.position};
  car = {...blocked};
  camp.returningToPost = true;
  for (let i = 0; i < 49; i++) { tick(0.1); camp.position = {...blocked}; }
  assert.ok(!camp.returnStuck, 'the rider keeps trying for five seconds');
  tick(0.2);
  assert.equal(camp.returnStuck, true, 'the rider stops after making less than ten metres of progress');
  assert.equal(camp.speed, 0);
  const stopped = {...camp.position};
  tick(1);
  assert.deepEqual(camp.position, stopped, 'the stranded rider stays stopped');
  // A parked rider beside the car in open ground stays put.
  car = {...stopped};
  tick(21);
  assert.deepEqual(camp.position, stopped, 'a nearby rider in open ground stays parked');
  // Find real ground that hides the post and a rider less than 600 m away.
  let hiddenCar, hiddenRider;
  const home = posts[0].start.position;
  for (let angle = 0; angle < Math.PI * 2 && !hiddenCar; angle += Math.PI / 24) {
    for (let distance = 700; distance <= 2400 && !hiddenCar; distance += 100) {
      const candidate = {x:home.x + Math.sin(angle) * distance, z:home.z + Math.cos(angle) * distance};
      candidate.y = scablandsSurfaceHeightAt(candidate.x, candidate.z);
      const hidden = point => !sees(candidate, point, {heightAt:scablandsSurfaceHeightAt,
        actorFloors:true, eye:5, target:2, step:5});
      if (!hidden(home)) continue;
      for (let separation = 100; separation < 600; separation += 50) {
        const point = {x:candidate.x - Math.sin(angle) * separation, z:candidate.z - Math.cos(angle) * separation};
        point.y = scablandsSurfaceHeightAt(point.x, point.z);
        if (hidden(point)) { hiddenCar = candidate; hiddenRider = point; break; }
      }
    }
  }
  assert.ok(hiddenCar, 'the land hides the rider and post while the rider is within 600 metres');
  car = hiddenCar;
  camp.position = hiddenRider;
  tick(0.1);
  assert.ok(Math.hypot(camp.position.x - home.x, camp.position.z - home.z) < 0.01,
    'both blocked sight lines allow recovery');
  camp.position = {...stopped};
  camp.returningToPost = true;
  camp.returnStuck = true;
  car = {x:stopped.x + 2000, z:stopped.z, y:scablandsSurfaceHeightAt(stopped.x + 2000, stopped.z)};
  tick(0.1);
  assert.ok(Math.hypot(camp.position.x - home.x, camp.position.z - home.z) < 0.01,
    'both ends 600 metres away allow recovery');
  // A wreck cannot use either recovery threshold, even after it was stranded.
  camp.position = {...stopped};
  camp.health = 0;
  camp.returningToPost = true;
  camp.returnStuck = true;
  camp.returnHiddenSeconds = 19.9;
  tick(21);
  assert.deepEqual(camp.position, stopped, 'a wrecked road rider stays where it fell');
  assert.equal(camp.returnStuck, true, 'a wrecked road rider is not returned to its post');
}
// The camp rider reaches a scooping car later on Easy than on Hard.
{
  for (const difficulty of ['easy', 'hard']) {
    const world = createWorldJob(definition), car = {...definition.steps[0].braziers[1].position};
    const state = {arena:{worldJob:world}, weaponLoadout:[], s:0, lateral:0,
      opponents:[], speedMph:0, stageTimeSec:0, input:{}, cpuDifficulty:difficulty};
    const duel = {state, seed:19, course:{def:{scablands:true}, nearest:() => ({s:0, lateral:0}),
      at:() => ({heading:0}), worldAt:() => car}, emit:() => {}, _storyCallout:() => {}};
    initializeWorldJob(duel, definition);
    world.job.stepState = {loaded:true, ember:60};
    for (let i = 0; i < 30; i++) {
      stepWorldJob(duel, 0.1);
      if (state.knock) state.speedMph = 7;
    }
    const scooped = world.job.stepState.scoopedBraziers?.includes('halfway-brazier') ?? false;
    assert.equal(scooped, difficulty === 'easy', `${difficulty}: the scoop ${scooped ? 'finished' : 'was interrupted'}`);
    assert.equal(!!state.knock, difficulty === 'hard', `${difficulty}: rider contact during the scoop`);
  }
}

// Measure cover only within the furnace's range, using the same sight rule as the job.
{
  const way = HOT_DELIVERY_WAYS.find(item => item.id === 'scab-plates');
  const route = routeFor(way.legs, {start: LAND.yard, destination: LAND.at('tin-town')});
  const samples = sampleLine(route, 10);
  const classify = point => {
    if (Math.hypot(point.x - FURNACE_SKYLINE.x, point.z - FURNACE_SKYLINE.z) > WATCH.furnace.range) return 'out of range';
    return stepSkylineSight({}, point, 0).visible ? 'open' : 'hidden';
  };
  const runs = sightStretches(samples, classify);
  const stretches = coverStretches(samples, classify);
  const separated = separatedCover(samples, classify);
  assert.ok(separated.length >= 3, 'three 150 m stretches have at least 100 m of visible ground between them');
  console.log(`Separated plates cover: ${separated.map(run => `${run.from.toFixed(0)} to ${run.to.toFixed(0)} m`).join('; ')}`);
  const longestOpen = runs.filter(run => run.visibility === 'open')
    .reduce((longest, run) => run.to - run.from > longest.to - longest.from ? run : longest);
  assert.ok(longestOpen.to > longestOpen.from, 'the longest open stretch has a measurable length');
  console.log(`Plates longest open stretch: ${longestOpen.from.toFixed(0)} to ${longestOpen.to.toFixed(0)} m; ${stretches.length} qualifying covered stretches`);
  assert.ok(stretches.length >= 1,
  'the plates have at least one 150 m stretch hidden from the furnace with open ground on each side');
  const firstCover = runs.find(run => run.visibility === 'hidden');
  assert.ok(firstCover && firstCover.from < 910 && firstCover.to > 1100, 'the first butte hides the approach within range');
  console.log(`First butte cover: ${firstCover.from.toFixed(0)} to ${firstCover.to.toFixed(0)} m`);
  const lastCover = runs.find(run => run.visibility === 'hidden' && run.from > 3300);
  assert.ok(lastCover && lastCover.from < 3370 && lastCover.to > 3570,
    'the second butte hides the far approach within the furnace range');
  console.log(`Second butte cover: ${lastCover.from.toFixed(0)} to ${lastCover.to.toFixed(0)} m`);
  const points = Array.from({length: 23}, (_, index) => ({along:index * 20}));
  const types = ['open', ...Array(9).fill('hidden'), 'out of range', ...Array(9).fill('hidden'), 'open', 'hidden', 'open'];
  assert.equal(coverStretches(points, point => types[point.along / 20]).length, 0,
    'out-of-range gaps and short hidden runs cannot count as separate cover');
  assert.equal(separatedCover(points, point => types[point.along / 20]).length, 1,
    'out-of-range ground cannot separate two stretches of cover');
  const shortGap = ['open', 'open', 'open', 'open', 'open', ...Array(9).fill('hidden'), ...Array(7).fill('open')];
  assert.equal(coverStretches(points, point => shortGap[point.along / 20]).length, 0,
    'less than 100 m of open ground cannot separate cover');
  assert.equal(separatedCover(points, point => shortGap[point.along / 20]).length, 1,
    'a single covered stretch does not need open ground on both sides');
  const pairedPoints = Array.from({length: 26}, (_, index) => ({along:index * 20}));
  const paired = [...Array(9).fill('hidden'), ...Array(8).fill('open'), ...Array(9).fill('hidden')];
  assert.equal(separatedCover(pairedPoints, point => paired[point.along / 20]).length, 2,
    'two covered stretches separated by at least 100 m of open ground both count');
  const narrow = [...Array(9).fill('hidden'), ...Array(5).fill('open'), ...Array(9).fill('hidden')];
  assert.equal(separatedCover(pairedPoints.slice(0, narrow.length), point => narrow[point.along / 20]).length, 1,
    'less than 100 m of open ground cannot separate two stretches');
  const clearGap = [...Array(6).fill('open'), ...Array(9).fill('hidden'), ...Array(8).fill('open')];
  assert.equal(coverStretches(points, point => clearGap[point.along / 20]).length, 1,
    '100 m of open ground on both sides separates a covered stretch');
}
// The real job applies ground cooling and remembers the bed warning.
{
  const step = definition.steps[0];
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
  const captions = [];
  const duel = {state, seed:19, course:{def:{scablands:true}, nearest:() => ({s:0, lateral:0}), at:() => ({heading:0}), worldAt:() => car}, emit:() => {}, _storyCallout:text => captions.push(text)};
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
  assert.ok(Math.abs(ordinaryLoss - 100 / 900) < 1e-9, 'a full pot cools in fifteen minutes on ordinary ground');
  assert.ok(Math.abs(ordinaryLoss - step.ember.coldPerSecond) < 1e-9);
  assert.ok(Math.abs(panLoss / ordinaryLoss - 1.5) < 1e-9, 'the pan cools the pot half as fast again');
  const wash = LAND.at('the-wash');
  let bed;
  for (let dx = -500; dx <= 500 && !bed; dx += 20) for (let dz = -500; dz <= 500; dz += 20) {
    const point = {x:wash.x + dx, z:wash.z + dz};
    const ground = scablandsDriveAt(point.x, point.z);
    if (ground.id === 'river-bed' && !ground.soft) { bed = point; break; }
  }
  assert.ok(bed, 'the land has firm river bed');
  assert.equal(scablandsDriveAt(bed.x, bed.z).safeKmh, 80);
  state.speedMph = 80 / 1.609344;
  world.lastKmh = 80;
  const bedLoss = lossAt(bed);
  assert.ok(Math.abs(bedLoss / ordinaryLoss - 2.0) < 1e-9, 'the bed cools twice as fast with no rough loss at 80 km/h');
  lossAt(bed);
  assert.equal(captions.filter(text => text === 'Cold air lies in the river bed. The pot cools fast down here.').length, 1);
  state.speedMph = 0;


  const knowledge = createKnowledge();
  const routes = worldMapWays({worldJob:world, car:normal, target:LAND.at('tin-town')});
  const map = () => waysMarkup(routes, 'Tin Town', knowledge, {hotDelivery:true});
  learnHotDeliveryDangers(knowledge, world, normal);
  assert.doesNotMatch(map(), /wind on the salt pan|Cross the Pipe|Cold air lies/i);
  learnHotDeliveryDangers(knowledge, world, bed);
  assert.match(map(), /Cold air lies in the river bed\. The pot cools fast down here\./);
  lossAt(pan);
  learnHotDeliveryDangers(knowledge, world, car);
  assert.match(map(), /The wind on the salt pan cools the ember faster\./);
  assert.doesNotMatch(map(), /Cross the Pipe/i);
  lossAt({...LAND.at('the-pipe')});
  assert.equal(world.pipeDeck.onDeck, true);
  learnHotDeliveryDangers(knowledge, world, car);
  assert.match(map(), /Cross the Pipe at 40 km\/h or less\./);
  lossAt(normal);
  learnHotDeliveryDangers(knowledge, world, car);
  assert.match(map(), /wind on the salt pan/);
  assert.match(map(), /Cross the Pipe/);

}
// The final approach must count rider contact too, rather than hiding a late ram.
{
  const world = {definition:{steps:[{riderSafeWall:{x:0, z:0, through:{x:0, z:1}}}]},
    job:{stepState:{ember:50, joltCount:0}}, actors:[{id:'late-rider', ramContact:true, position:{x:0, y:0, z:0}}]};
  const state = {arena:{worldJob:world}, s:0, lateral:0, headingError:0, speedMph:0};
  const duel = {state, course:{def:{}, worldAt:() => ({x:0, y:0, z:0, heading:0})}, setInput:() => {},
    step:() => { world.job.stepState.joltCount++; world.job.stepState.jolt = 15; world.job.done = true; }};
  const arrival = driveToForge(duel, {x:0, z:30});
  assert.equal(arrival.jolts.length, 1, 'the final approach records the jolt');
  assert.equal(arrival.jolts[0].riders[0].id, 'late-rider', 'the final approach records the rider in contact');
}
// Floor it towards town across the plain, starting with the real pickup and gate.
{
  const duel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true, 'story-everburn':true}});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
    cpuDifficulty:'medium', opponents:[], job:{...definition, seed:19}}), true);
  duel.state.countdown = 0;
  const pickup = definition.steps[0].pickup.place.position;
  assert.ok(driveToCinder(duel, pickup).loaded);
  const exit = driveThroughYardGate(duel, yardPlan().gate);
  assert.ok(exit.along >= 20);
  const state = duel.state, pot = state.arena.worldJob.job.stepState;
  const start = duel.course.worldAt(state.s, state.lateral), town = LAND.at('tin-town');
  let driven = 0, ticks = 0, previous = start, firstOut = null;
  for (; ticks < 18000 && driven < 1500 && firstOut === null; ticks++) {
    const car = duel.course.worldAt(state.s, state.lateral);
    driven += Math.hypot(car.x - previous.x, car.z - previous.z);
    previous = car;
    if (state.arena.worldJob.job.stepState.ember <= 0) { firstOut = driven; break; }
    const turn = wrapHeading(Math.atan2(town.x - car.x, town.z - car.z) - (car.heading + state.headingError));
    duel.setInput({throttle:1, brake:0, steer:Math.max(-1, Math.min(1, -turn * 2))});
    duel.step(1 / 60);
  }
  const actual = state.arena.worldJob.job.stepState;
  const measurement = {metres:driven, minutes:ticks / 3600, ember:actual.ember,
    jolts:actual.joltCount ?? 0, firstOut, timedOut:ticks === 18000};
  console.log('Straight-across measurement:', JSON.stringify(measurement));
  assert.ok(pot.loaded && driven > 0, 'the actual car carries the pot across the plain');
  assert.equal(firstOut !== null, actual.ember <= 0, 'the recorded outage agrees with the job state');
  assert.ok(!measurement.timedOut, 'the measurement reaches its distance or the ember goes out');
  assert.ok(firstOut !== null && firstOut < 1500, 'the ember goes out before 1.5 km');
}
// Measure one seeded East Road delivery after the riders' road rule.
{
  const duel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true, 'story-everburn':true}});
  duel.state.wastelandGateDiscovered = true;
  assert.ok(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
    cpuDifficulty:'medium', opponents:[], job:{...definition, seed:19}}));
  duel.state.countdown = 0;
  const step = definition.steps[0];
  assert.ok(driveToCinder(duel, step.pickup.place.position).loaded);
  const startClock = duel.state.arena.worldJob.clockSec;
  const exit = driveThroughYardGate(duel, yardPlan().gate);
  const road = ROAD_NET.road('east-road').points;
  const opening = driveMeasuredStretches(duel, road, [500, 1000, 1500, 2000], 100 / 1.609344);
  const camp = driveAlongRoad(duel, road, 2350, 7200, 100 / 1.609344, false, false, 3, 45, 40);
  const scoop = driveToBrazier(duel, step.braziers.find(place => place.id === 'halfway-brazier'));
  const remaining = driveMeasuredStretches(duel, road, [2500, 3000, 3500, 4000, 4500, 5000, 5500, 6500, 7000, 7600], 100 / 1.609344, false, 40);
  const gate = driveAlongRoad(duel, road, 7810, 12000, 25, true);
  const pot = duel.state.arena.worldJob.job.stepState;
  const scoops = [...(pot.scoopedBraziers || [])];
  const arrival = driveToForge(duel, step.destination.position);
  const stretches = [...opening.stretches, camp, ...remaining.stretches, gate];
  const result = {kilometres:(exit.driven + stretches.reduce((sum, item) => sum + item.driven, 0) + scoop.driven + arrival.driven) / 1000,
    minutes:(duel.state.arena.worldJob.clockSec - startClock) / 60,
    rams:[...stretches.flatMap(item => item.jolts), ...scoop.jolts, ...arrival.jolts].filter(jolt => jolt.riders.length > 0).length,
    scoops, ember:arrival.fire?.ember ?? pot.ember, result:duel.state.arena.worldJob.emberResult};
  console.log('East Road delivery:', JSON.stringify(result));
  assert.ok(arrival.done && arrival.distance < 5, 'the car reaches the forge and completes the job');
  const rule = step.ember, grade = result.ember >= rule.brightFrom ? 'bright' : result.ember >= rule.aliveFrom ? 'alive' : 'barely';
  const pay = result.result.relights > 0 ? Math.min(rule.pay[grade], rule.pay.afterRelight) : rule.pay[grade];
  assert.equal(result.result.grade, grade, 'the arrival records the ember band');
  assert.equal(result.result.pay, pay, 'the job pays for that band');
}
// Measure the Steps route using the real car and job state.
{
  for (const scoopAtWash of [true, false]) {
    const duel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true, 'story-everburn':true}});
    duel.state.wastelandGateDiscovered = true;
    assert.ok(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
      cpuDifficulty:'medium', opponents:[], job:{...definition, seed:19}}));
    duel.state.countdown = 0;
    const step = definition.steps[0];
    assert.ok(driveToCinder(duel, step.pickup.place.position).loaded);
    const startClock = duel.state.arena.worldJob.clockSec;
    const yard = driveThroughYardGate(duel, yardPlan().gate);
    const way = HOT_DELIVERY_WAYS.find(item => item.id === 'river-bed');
    const line = routeFor(way.legs, {start:LAND.yard, destination:LAND.at('tin-town')});
    const wash = step.braziers.find(item => item.id === 'wash-brazier');
    const approach = driveMeasuredStretches(duel, line, [500, 1000, 1500, 2000, 2500, 3000,
      nearestOnLine(line, wash.position.x, wash.position.z).along - 30], 80 / 1.609344);
    assert.ok(approach.reachedAll, 'the car reaches the Wash');
    const scoop = scoopAtWash ? driveToBrazier(duel, wash) : null;
    if (scoopAtWash) assert.ok(scoop.scooped, 'the car scoops at the Wash');
    const route = bedStepsRoute();
    const car = duel.course.worldAt(duel.state.s, duel.state.lateral);
    const bedLine = [{x:car.x, z:car.z}, ...route.bed];
    const ends = [];
    for (let along = 500; along < pathLength(bedLine) - 50; along += 500) ends.push(along);
    const bed = driveMeasuredStretches(duel, bedLine, ends, 80 / 1.609344);
    assert.ok(bed.reachedAll, 'the car follows the bed');
    assert.ok(bed.stretches.some(stretch => stretch.passedUnderBridge), 'the car passes under the bridge');
    const end = driveAlongRoad(duel, bedLine, pathLength(bedLine) - 25, 7200, 80 / 1.609344);
    assert.ok(end.along >= pathLength(bedLine) - 25, 'the car reaches the Steps');
    const here = duel.course.worldAt(duel.state.s, duel.state.lateral);
    const climbLine = [{x:here.x, z:here.z}, route.steps, route.exit];
    const climb = driveAlongRoad(duel, climbLine, pathLength(climbLine) - 25, 18000, 20 / 1.609344);
    assert.ok(climb.along >= pathLength(climbLine) - 25, 'the car climbs the Steps');
    const afterSteps = duel.course.worldAt(duel.state.s, duel.state.lateral);
    const gate = step.riderSafeWall;
    const townLine = [{x:afterSteps.x, z:afterSteps.z}, {x:route.exit.x + 600, z:route.exit.z},
      {x:gate.x - gate.through.x * 180, z:gate.z - gate.through.z * 180}];
    const town = driveAlongRoad(duel, townLine, pathLength(townLine) - 150, 18000, 48 / 1.609344, true);
    assert.ok(town.along >= pathLength(townLine) - 150, 'the car reaches town');
    const gateCar = duel.course.worldAt(duel.state.s, duel.state.lateral);
    const gateLine = [{x:gateCar.x, z:gateCar.z},
      {x:gate.x - gate.through.x * 80, z:gate.z - gate.through.z * 80},
      {x:gate.x - gate.through.x * 25, z:gate.z - gate.through.z * 25},
      {x:gate.x + gate.through.x * 15, z:gate.z + gate.through.z * 15}];
    const gateDrive = driveAlongRoad(duel, gateLine, pathLength(gateLine) - 1, 12000, 12, true);
    assert.ok(gateDrive.along >= pathLength(gateLine) - 1, 'the car passes the gate');
    const pot = duel.state.arena.worldJob.job.stepState;
    const scoops = [...(pot.scoopedBraziers || [])];
    const arrival = driveToForge(duel, step.destination.position, 18000);
    const stretches = [...approach.stretches, ...bed.stretches, end, climb, town, gateDrive];
    const result = {kilometres:(yard.driven + stretches.reduce((sum, item) => sum + item.driven, 0) + (scoop?.driven ?? 0) + arrival.driven) / 1000,
      minutes:(duel.state.arena.worldJob.clockSec - startClock) / 60,
      rams:[...stretches.flatMap(item => item.jolts), ...(scoop?.jolts ?? []), ...arrival.jolts].filter(jolt => jolt.riders.length).length,
      scoops, ember:arrival.fire?.ember ?? pot.ember, done:arrival.done, result:duel.state.arena.worldJob.emberResult};
    console.log(scoopAtWash ? 'Bed delivery:' : 'Bed without scoop delivery:', JSON.stringify(result));
    assert.ok(arrival.done && arrival.distance < 5, 'the car reaches the forge and completes the job');
    const rule = step.ember, grade = result.ember >= rule.brightFrom ? 'bright' : result.ember >= rule.aliveFrom ? 'alive' : 'barely';
    const pay = result.result.relights > 0 ? Math.min(rule.pay[grade], rule.pay.afterRelight) : rule.pay[grade];
    assert.equal(result.result.grade, grade, 'the arrival records the ember band');
    assert.equal(result.result.pay, pay, 'the job pays for that band');
  }
}
// Prove the clean plates delivery using its measured cover route.
{
  const way = HOT_DELIVERY_WAYS.find(item => item.id === 'scab-plates');
  const route = routeFor(way.legs, {start:LAND.yard, destination:LAND.at('tin-town')});
  const trialDuel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true, 'story-everburn':true}});
  trialDuel.state.wastelandGateDiscovered = true;
  assert.ok(trialDuel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
    cpuDifficulty:'medium', opponents:[], job:{...definition, seed:19}}));
  trialDuel.state.countdown = 0;
  assert.ok(driveToCinder(trialDuel, definition.steps[0].pickup.place.position).loaded);
  const trialExit = driveThroughYardGate(trialDuel, yardPlan().gate);
  assert.ok(trialExit.along >= 20);
  const trialLine = platesCoverLine(route, -40);
  const trialOpening = driveAlongRoad(trialDuel, trialLine, 1200, 18000, 30.4, false, false, 0.1);
  const trialShelter = drivePlatesShelter(trialDuel, trialLine, 2900);
  assert.ok(trialOpening.along >= 1200 && trialShelter.along >= 2900);
  assert.equal(trialOpening.jolts.length + trialShelter.jolts.length, 0, 'the opening avoids jolts');
  assert.equal(trialOpening.abovePlatesLimitTicks + trialShelter.abovePlatesLimitTicks, 0, 'the opening stays within 50 km/h');
  assert.ok(trialOpening.longestFurnaceSightSeconds <= 6 && trialShelter.longestFurnaceSightSeconds <= 6,
    'the opening stays within six seconds of furnace sight');
  const trialCrossing = drivePlatesRoughGround(trialDuel, trialLine, 3600, 15);
  console.log('Plates intermediate crossing:', JSON.stringify(trialCrossing));
  assert.ok(trialCrossing.along >= 3600, 'the car reaches the far side on the intermediate line');
  assert.equal(trialCrossing.jolts.length, 0, 'the intermediate crossing avoids jolts');
  assert.equal(trialCrossing.abovePlatesLimitTicks, 0, 'the intermediate crossing stays within 50 km/h');
  assert.ok(trialCrossing.longestFurnaceSightSeconds <= 6 && !trialDuel.state.arena.worldJob.skylineWarned,
    'the intermediate crossing avoids the furnace warning');
  const beyondCrossing = drivePlatesShelter(trialDuel, trialLine, 4200);
  console.log('Plates beyond the crossing:', JSON.stringify(beyondCrossing));
  assert.ok(beyondCrossing.along >= 4200, 'the car reaches the ground beyond the crossing');
  assert.equal(beyondCrossing.jolts.length, 0, 'the ground beyond the crossing avoids jolts');
  assert.equal(beyondCrossing.abovePlatesLimitTicks, 0, 'the ground beyond the crossing stays within 50 km/h');
  assert.ok(beyondCrossing.longestFurnaceSightSeconds <= 6 && !trialDuel.state.arena.worldJob.skylineWarned,
    'the ground beyond the crossing avoids the furnace warning');
  const townward = drivePlatesShelter(trialDuel, trialLine, 4700);
  console.log('Plates townward approach:', JSON.stringify(townward));
  assert.ok(townward.along >= 4700, 'the car reaches the next stretch toward town');
  assert.equal(townward.jolts.length, 0, 'the townward stretch avoids jolts');
  assert.equal(townward.abovePlatesLimitTicks, 0, 'the townward stretch stays within 50 km/h');
  assert.ok(townward.longestFurnaceSightSeconds <= 6 && !trialDuel.state.arena.worldJob.skylineWarned,
    'the townward stretch avoids the furnace warning');
  const finalApproach = drivePlatesShelter(trialDuel, trialLine, 5200);
  console.log('Plates final approach:', JSON.stringify(finalApproach));
  assert.ok(finalApproach.along >= 5200, 'the car reaches the final approach toward town');
  assert.equal(finalApproach.jolts.length, 0, 'the final approach avoids jolts');
  assert.equal(finalApproach.abovePlatesLimitTicks, 0, 'the final approach stays within 50 km/h');
  assert.ok(finalApproach.longestFurnaceSightSeconds <= 6 && !trialDuel.state.arena.worldJob.skylineWarned,
    'the final approach avoids the furnace warning');
  const nearTown = drivePlatesShelter(trialDuel, trialLine, 5700);
  console.log('Plates near town:', JSON.stringify(nearTown));
  assert.ok(nearTown.along >= 5700, 'the car reaches the ground near town');
  assert.equal(nearTown.jolts.length, 0, 'the ground near town avoids jolts');
  assert.equal(nearTown.abovePlatesLimitTicks, 0, 'the ground near town stays within 50 km/h');
  assert.ok(nearTown.longestFurnaceSightSeconds <= 6 && !trialDuel.state.arena.worldJob.skylineWarned,
    'the ground near town avoids the furnace warning');
  const gate = definition.steps[0].riderSafeWall;
  const car = trialDuel.course.worldAt(trialDuel.state.s, trialDuel.state.lateral);
  const gateLine = [{x:car.x, z:car.z},
    {x:gate.x - gate.through.x * 80, z:gate.z - gate.through.z * 80},
    {x:gate.x - gate.through.x * 25, z:gate.z - gate.through.z * 25},
    {x:gate.x + gate.through.x * 15, z:gate.z + gate.through.z * 15}];
  const gateDrive = driveAlongRoad(trialDuel, gateLine, pathLength(gateLine) - 1, 12000, 12, true);
  console.log('Clean plates gate approach:', JSON.stringify(gateDrive));
  assert.ok(gateDrive.along >= pathLength(gateLine) - 1, 'the clean plates car passes through the town gate');
  assert.equal(gateDrive.jolts.length, 0, 'the gate approach avoids jolts');
  assert.equal(trialDuel.state.arena.worldJob.tinTownGateRequested, true, 'the slow approach opens the gate');
  const arrival = driveToForge(trialDuel, definition.steps[0].destination.position);
  console.log('Clean plates forge arrival:', JSON.stringify(arrival));
  assert.ok(arrival.distance < 5 && Math.abs(arrival.speedMph) < 0.5, 'the clean plates car stops at the forge');
  assert.ok(arrival.done && arrival.fire.ember >= 30 && arrival.fire.ember < 70, 'the clean plates drive arrives alive');
  assert.equal(arrival.observedJoltCount, 0, 'the clean plates drive takes no jolts');
  assert.ok(!trialDuel.state.arena.worldJob.skylineWarned, 'the furnace sends no riders on the clean drive');
  const cleanStretches = [trialExit, trialOpening, trialShelter, trialCrossing, beyondCrossing, townward,
    finalApproach, nearTown, gateDrive, arrival];
  const measurement = {km:cleanStretches.reduce((sum, stretch) => sum + stretch.driven, 0) / 1000,
    minutes:cleanStretches.reduce((sum, stretch) => sum + stretch.ticks, 0) / 3600,
    rams:arrival.observedJoltCount, scoops:[], arrival:arrival.fire.ember};
  console.log('Clean plates measurement:', JSON.stringify(measurement));
}
const step = definition.steps[0], pickup = step.pickup.place.position;
// Cold loss is read from the actual carry step on ordinary ground.
{
  const carry = definition.steps[0];
  const view = {player:{position:carry.carStart}, speedKmh:0, safeKmh:Infinity, difficulty:'medium'};
  const result = stepCarry(carry, {loaded:true, ember:100}, view, 1);
  assert.ok(Math.abs(100 - result.state.ember - 100 / 900) < 1e-9, 'a full pot cools in fifteen minutes');
}
// The real carry step caps ordinary hits and applies Easy after the cap.
{
  const view = {player:{position:definition.steps[0].carStart}, speedKmh:0, safeKmh:Infinity, hitKmh:28, difficulty:'medium'};
  const hit = changes => stepCarry(definition.steps[0], {loaded:true, ember:100}, {...view, ...changes}, 0);
  assert.equal(hit({}).state.jolt, 15, 'a ram that would cost 42 is capped at 15');
  assert.equal(hit({difficulty:'easy'}).state.jolt, 7.5, 'Easy halves the capped hit');
  assert.equal(hit({severeHit:true, hitKmh:100}).state.jolt, 40, 'a severe fall or crash is capped at 40');
  assert.equal(hit({severeHit:true, hitKmh:100, difficulty:'easy'}).state.jolt, 20);
}
// Process impacts through the world job, including the previous-speed crash threshold.
{
  const step = definition.steps[0], car = {...step.carStart};
  const waitingWorld = createWorldJob(definition);
  const waitingState = {arena:{worldJob:waitingWorld}, weaponLoadout:[], s:0, lateral:0};
  const waitingDuel = {state:waitingState, seed:19, course:{def:{scablands:true},
    nearest:() => ({s:0, lateral:0}), at:() => ({heading:0})}};
  initializeWorldJob(waitingDuel, definition);
  Object.assign(waitingState, {opponents:[], speedMph:0, stageTimeSec:0, input:{}, cpuDifficulty:'medium'});
  Object.assign(waitingDuel, {emit:() => {}, _storyCallout:() => {}});
  waitingDuel.course.worldAt = () => car;
  const impact = ({lastKmh = 0, ram = 0, fall = false, fallKmh = 0, difficulty = 'medium'} = {}) => {
    waitingWorld.job.stepState = {loaded:true, ember:100};
    waitingWorld.lastKmh = lastKmh;
    waitingWorld.riderHitKmh = ram;
    waitingState.scablandsLongFall = fall;
    waitingState.scablandsHitKmh = fallKmh;
    waitingState.cpuDifficulty = difficulty;
    stepWorldJob(waitingDuel, 0);
    return waitingWorld.job.stepState.jolt;
  };
  assert.equal(impact({ram:28}), 15, 'the real job caps a 42-point ram');
  assert.equal(impact({ram:28, difficulty:'easy'}), 7.5);
  assert.equal(impact({lastKmh:80}), 15, '80 km/h is not over the crash threshold');
  assert.equal(impact({lastKmh:81}), 40, 'a crash to rest from over 80 km/h has the higher cap');
  assert.equal(impact({fall:true, fallKmh:50}), 40, 'a long fall has the higher cap');
  assert.equal(impact({fallKmh:50}), 15, 'a shorter fall keeps the ordinary cap');
  waitingDuel._scrape = () => {};
  waitingDuel._callout = () => {};
  for (const [drop, long] of [[2.9, false], [3.1, true]]) {
    waitingState.scablandsLongFall = false;
    waitingState._scablandsLanding = Math.sqrt(2 * GROUND.gravity * drop);
    scablandsLanded(waitingDuel, waitingState);
    assert.equal(waitingState.scablandsLongFall === true, long, 'the landing measures its own drop');
  }
  waitingState.cpuDifficulty = 'medium';
}
// The starting map tells Cinder's one known way without revealing other routes or dangers.
{
  const worldJob = {definition, job:createJob(definition), actors:[]};
  const result = worldMapWays({worldJob, car:LAND.yard, target:LAND.at('tin-town')});
  const markup = waysMarkup(result, 'Tin Town', createKnowledge(), {hotDelivery:true});
  assert.match(markup, /WHAT YOU KNOW/);
  assert.match(markup, /The East Road/);
  assert.match(markup, /The Ash Men hold the Girder Bridge\./);
  for (const way of result.ways.slice(1)) assert.ok(!markup.includes(way.name));
  assert.doesNotMatch(markup, /barricade|furnace|Pipe|salt pan/i);
}
// The map lists dangers only after the job's knowledge has recorded them.
{
  const worldJob = {definition, job:createJob(definition), actors:[]};
  const result = worldMapWays({worldJob, car:LAND.yard, target:LAND.at('tin-town')});
  const facts = jobFacts(worldJob), knowledge = createKnowledge();
  const barricade = facts.barricades[0], furnace = facts.furnaces.find(item => !item.hidden);
  assert.ok(barricade && furnace);
  let markup = waysMarkup(result, 'Tin Town', knowledge, {hotDelivery:true});
  assert.doesNotMatch(markup, /A barricade of|furnace watches/i);
  learn(knowledge, {car:barricade, barricades:[barricade]});
  markup = waysMarkup(result, 'Tin Town', knowledge, {hotDelivery:true});
  assert.match(markup, /A barricade of the Ash Men\./);
  assert.doesNotMatch(markup, /furnace watches/i);
  learn(knowledge, {car:furnace, furnaces:[furnace]});
  markup = waysMarkup(result, 'Tin Town', knowledge, {hotDelivery:true});
  assert.match(markup, /The furnace watches the land\./);
}
// Drive distinct parts of an actual way, without seeing a crossing.
{
  const worldJob = {definition, job:createJob(definition), actors:[]};
  const result = worldMapWays({worldJob, car:LAND.yard, target:LAND.at('tin-town')});
  const way = result.ways.find(item => item.id === 'scab-plates');
  const point = metres => sliceLine(way.points, metres, metres)[0];
  const knowledge = createKnowledge();
  for (let metres = 0; metres <= 200; metres += 10) learnDrivenWays(knowledge, result, point(metres));
  for (let metres = 190; metres >= 0; metres -= 10) learnDrivenWays(knowledge, result, point(metres));
  assert.ok(!knowledge.ways.has(way.id), 'repeating 200 metres does not discover the way');
  for (let metres = 10; metres <= 290; metres += 10) learnDrivenWays(knowledge, result, point(metres));
  assert.ok(!knowledge.ways.has(way.id), 'less than 300 metres stays hidden');
  for (let metres = 300; metres <= 310 && !knowledge.ways.has(way.id); metres += 10) learnDrivenWays(knowledge, result, point(metres));
  assert.ok(knowledge.ways.has(way.id), '300 metres of the way reveals it');
  assert.ok(waysMarkup(result, 'Tin Town', knowledge, {hotDelivery:true}).includes(way.name));
  const teleported = createKnowledge();
  learnDrivenWays(teleported, result, point(0));
  learnDrivenWays(teleported, result, point(400));
  assert.ok(!teleported.ways.has(way.id), 'a position jump does not count as driving');
}
// Screen updates cannot trace a crossing more than twice per second.
{
  const knowledge = createKnowledge(), schedule = {last: -Infinity};
  const result = {ways:[{id:'plates', crossings:[{id:'test-crossing'}]}]};
  const crossings = [{id:'test-crossing', x:0, z:0}];
  let traces = 0;
  for (let frame = 0; frame < 1200; frame++) {
    checkWayCrossings(schedule, frame / 120, knowledge, result, crossings, LAND.yard, null, () => { traces++; return false; });
  }
  assert.equal(traces, 20, 'ten seconds of screen updates make twenty crossing traces');
}

// Repeated screen updates and pauses do not advance discovery between simulation ticks.
{
  const crossings = [{id:'crossing', x:0, z:0}];
  const result = {ways:[{id:'plates', crossings:[{id:'crossing'}]}]};
  const drive = extraUpdates => {
    const knowledge = createKnowledge(), schedule = {last:-Infinity}, snapshots = [];
    for (let tick = 0; tick <= 1200; tick++) {
      const seconds = tick / 120;
      const car = {x:seconds, z:0};
      for (let update = 0; update < (extraUpdates && tick % 37 === 0 ? 8 : 1); update++) {
        checkWayCrossings(schedule, seconds, knowledge, result, crossings, car, null,
          point => point.x >= 4 && point.x <= 5);
      }
      if (tick % 120 === 0) snapshots.push([...knowledge.ways.keys()]);
    }
    return snapshots;
  };
  const first = drive(false), second = drive(true);
  assert.deepEqual(second, first, 'identical drives learn the same ways at each simulated second');
  assert.ok(first[5].includes('plates'), 'the visible crossing is actually learned');
}

// Seeing a real crossing adds its way and length to the player's map knowledge.
{
  const worldJob = {definition, job:createJob(definition), actors:[]};
  const result = worldMapWays({worldJob, car:LAND.yard, target:LAND.at('tin-town')});
  const crossings = getLandPicture().marks.crossings;
  const plates = result.ways.find(way => way.id === 'scab-plates');
  const crossing = crossings.find(item => plates.crossings.some(hit => hit.id === item.id));
  assert.ok(crossing, 'the plates way has a real crossing');
  const knowledge = createKnowledge();
  assert.equal(learnWayCrossings(knowledge, result, crossings, LAND.yard), false);
  assert.ok(!waysMarkup(result, 'Tin Town', knowledge, {hotDelivery:true}).includes(plates.name));
  assert.equal(learnWayCrossings(knowledge, result, crossings, crossing), true);
  assert.ok(knowledge.ways.has(plates.id));
  const markup = waysMarkup(result, 'Tin Town', knowledge, {hotDelivery:true});
  assert.ok(markup.includes(plates.name));
  assert.match(markup, /<em>[^<]+<\/em>/);
  assert.equal(learnWayCrossings(knowledge, result, crossings, crossing), false);
}
// The actual pause screen names the job and the land, including between steps.
{
  const views = {metric: () => '', action: () => '', time: () => '0:00', escapeHTML: String};
  const worldJob = {definition, job:{steps:[{what:'Carry the fire.'}], stepIndex:0}};
  const state = {arena:{mode:'world-job', worldJob}};
  assert.equal(arenaPauseScreen(state, views).description, 'Hot Delivery, the Scablands. Carry the fire.');
  worldJob.job.stepIndex = 1;
  assert.equal(arenaPauseScreen(state, views).description, 'Hot Delivery, the Scablands.');
  worldJob.definition = EVERBURN_JOBS[1];
  assert.equal(arenaPauseScreen(state, views).description, `${EVERBURN_JOBS[1].name}.`);
}
// Inspect the actual weapon bar as the loan changes and the job ends.
{
  const duel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true}});
  duel.state.wastelandGateDiscovered = true;
  assert.ok(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
    cpuDifficulty:'medium', opponents:[], job:definition}));
  duel.state.status = 'racing';
  function element() {
    const children = new Map(), attrs = new Map(), styles = new Map();
    return {dataset:{}, hidden:false, disabled:false, textContent:'', style:{getPropertyValue:k => styles.get(k) || '',
      setProperty:(k,v) => styles.set(k,String(v))}, classList:{toggle(){}}, append(){}, remove(){}, addEventListener(){},
      getBoundingClientRect:() => ({x:0,y:0,left:0,top:0,right:1280,bottom:800,width:1280,height:800}),
      setAttribute:(k,v) => attrs.set(k,String(v)), getAttribute:k => attrs.get(k) ?? null,
      querySelector(k) {if (!children.has(k)) children.set(k,element()); return children.get(k);},
      querySelectorAll(k) {
        if (!children.has(k)) children.set(k, k === '[data-combat-weapon]' ? WEAPON_IDS.map((id,slot) =>
          Object.assign(element(), {dataset:{combatWeapon:id,combatSlot:String(slot)}})) : k === '.combat-edge-cue' ?
          ['left','right'].map(side => Object.assign(element(), {dataset:{side}})) : []);
        return children.get(k);
      }};
  }
  const previous = globalThis.document, created = [];
  globalThis.document = {createElement() {const node = element(); created.push(node); return node;}};
  let hud;
  try {
    hud = createCombatHud({root:element(), app:{duel}});
    const slots = created[0].querySelectorAll('[data-combat-weapon]'), loan = created[3];
    const world = duel.state.arena.worldJob;
    for (const index of [0, 3]) {
      duel.state.weaponLoadout = ['crossbow','tesla','decoy','nitro'].slice(0,index).concat('flamethrower');
      world.activeLoan = 'flamethrower';
      hud.update(duel.state);
      const visible = [...slots,loan].filter(button => !button.hidden);
      assert.equal(visible.length, 1);
      assert.equal(visible[0].dataset.combatWeapon, 'flamethrower');
      assert.equal(Number(visible[0].dataset.combatSlot), index);
    }
    world.activeLoan = null;
    hud.update(duel.state);
    assert.equal([...slots,loan].filter(button => !button.hidden).length, 0);
    duel.state.arena = null;
    duel.state.weaponLoadout = ['crossbow','tesla','decoy','nitro'];
    hud.update(duel.state);
    assert.equal(slots.filter(button => !button.hidden).length, 4);
  } finally {
    hud?.dispose();
    if (previous === undefined) delete globalThis.document; else globalThis.document = previous;
  }
}
// The real screen hides race-only readouts during a world job and restores them afterwards.
{
  const duel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true}});
  duel.state.wastelandGateDiscovered = true;
  assert.ok(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
    cpuDifficulty:'medium', opponents:[], job:definition}));
  const node = () => ({hidden:false, textContent:'', dataset:{}, style:{}, firstChild:{textContent:''},
    lastChild:{textContent:''}, classList:{toggle(){}}, setAttribute(){}});
  const ui = new Proxy({}, {get:(target, key) => target[key] ??= node()});
  const clock = {hidden:false};
  ui['race-time'].closest = () => clock;
  ui['race-position'].closest = () => ({hidden:false});
  ui['route-section'].closest = () => ({querySelector:() => ({textContent:''})});
  const text = (id, value) => {ui[id].textContent = String(value);};
  const app = {duel, player:{name:'Test'}};
  const update = createHudScreen({app, ui, text, time:String, credits:String,
    clamp:value => Math.max(0, Math.min(1, value)), routeMap:{update(){}}});
  duel.state.status = 'racing';
  update(duel.state);
  duel.onStoryCaption('Cinder has a line.', false, duel.state, 5);
  duel.state.paused = true;
  app.worldMapOpen = true;
  update(duel.state);
  assert.equal(ui['race-callout'].hidden, false, 'the caption remains visible while the map pauses the job');
  assert.equal(ui['callout-text'].textContent, 'Cinder has a line.');
  app.worldMapOpen = false;
  update(duel.state);
  assert.equal(ui['race-callout'].hidden, true, 'the ordinary pause screen hides the caption');
  duel.state.paused = false;
  assert.equal(clock.hidden, true, 'world jobs hide the race clock');
  assert.equal(ui['style-score-panel'].hidden, true, 'world jobs hide style points');
  const readout = {update:() => ({phase:'airborne', heightMeters:25, peakMeters:25, distanceMeters:10, durationSeconds:1})};
  presentJumpHeight(readout, duel.state, {duel}, ui, text);
  assert.equal(ui['jump-height-panel'].hidden, true, 'world jobs hide the jump readout in the air');
  const race = {...duel.state, arena:null};
  update(race);
  presentJumpHeight(readout, race, {duel}, ui, text);
  assert.equal(clock.hidden, false, 'the race clock returns outside a world job');
  assert.equal(ui['style-score-panel'].hidden, false, 'style points return outside a world job');
  assert.equal(ui['jump-height-panel'].hidden, false, 'the jump readout returns outside a world job');
}
// The same live caption moves onto the map and returns to its original place.
{
  const next = {}, caption = {nextSibling:next};
  const parent = {insertBefore(node, sibling) {assert.equal(node, caption); assert.equal(sibling, next); node.parentNode = this;}};
  const map = {append(node) {assert.equal(node, caption); node.parentNode = this;}};
  caption.parentNode = parent;
  const original = moveMapCaption(caption, map);
  assert.equal(caption.parentNode, map);
  assert.equal(moveMapCaption(caption, map, original), null);
  assert.equal(caption.parentNode, parent);
}
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
// Cinder uses her crew model, stands on the ground and leaves view after the loaded car drives away.
{
  const duel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true, 'story-everburn':true}});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
    cpuDifficulty:'medium', opponents:[], job:{...definition, seed:19}}), true);
  const source = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshBasicMaterial());
  body.position.y = 1.4; body.name = 'cinder-near'; source.add(body);
  const farModel = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  farModel.name = 'cinder-far'; source.add(farModel);
  const requested = [];
  const scene = createScablandsScene(duel.course, {openMarks:[], loadAsset:async path => {
    requested.push(path); return {scene:path.endsWith('/crew/cinder.glb') ? source : new THREE.Group()};
  }});
  syncScene(scene.group, duel.state);
  const figure = scene.group.getObjectByName('Cinder at the yard gate');
  assert.equal(figure.visible, true);
  assert.ok(figure.children.some(child => child.visible), 'the temporary figure is visible while loading');
  await figure.userData.modelReady;
  assert.ok(requested.includes('/assets/models/wasteland/crew/cinder.glb'));
  assert.equal(figure.getObjectByName('Cinder crew model'), source);
  figure.updateWorldMatrix(true, true);
  assert.equal(farModel.visible, false, 'the distant detail does not overlap Cinder');
  const bounds = new THREE.Box3().setFromObject(body);
  assert.ok(Math.abs(bounds.min.y - scablandsSurfaceHeightAt(pickup.x, pickup.z)) < .05);
  assert.ok(Math.abs(bounds.max.y - bounds.min.y - 1.7) < .001);
  assert.ok(Math.hypot(pickup.x-step.braziers[0].position.x, pickup.z-step.braziers[0].position.z) >= 1.5);
  assert.ok(Math.abs(wrapHeading(figure.rotation.y - Math.atan2(step.carStart.x-pickup.x, step.carStart.z-pickup.z))) < 1e-9);
  assert.ok(figure.children.filter(child => child !== source).every(child => !child.visible));
  duel.state.arena.worldJob.job.stepState.loaded = true;
  const far = {x:pickup.x + 100, z:pickup.z};
  const at = duel.course.nearest(far.x, far.z);
  placeActor(duel, duel.state, {s:at.s, lateral:at.lateral, headingError:0}, 0);
  syncScene(scene.group, duel.state);
  assert.equal(figure.visible, false, 'Cinder is hidden once the loaded car is 60 m away');
  scene.dispose();
}
// Start the salt-pan measurement from the real pickup and yard gate.
{
  const duel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true, 'story-everburn':true}});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
    cpuDifficulty:'medium', opponents:[], job:{...definition, seed:19}}), true);
  duel.state.countdown = 0;
  assert.ok(driveToCinder(duel, pickup).loaded, 'the salt-pan driver collects the actual pot');
  const yardExit = driveThroughYardGate(duel, yardPlan().gate);
  assert.ok(yardExit.along >= 20, 'the salt-pan driver leaves through the gate');
  const way = HOT_DELIVERY_WAYS.find(item => item.id === 'salt-pan');
  const route = routeFor(way.legs, {start:LAND.yard, destination:LAND.at('tin-town')});
  const gate = yardPlan().gate;
  const car = duel.course.worldAt(duel.state.s, duel.state.lateral);
  const approach = [{x:car.x, z:car.z},
    {x:gate.x + Math.sin(gate.bearing) * 200, z:gate.z + Math.cos(gate.bearing) * 200},
    sliceLine(route, 350, 351).at(-1)];
  const join = driveAlongRoad(duel, approach, pathLength(approach) - 1, 12000, 20);
  console.log('Salt-pan join:', JSON.stringify(join));
  assert.ok(join.along >= pathLength(approach) - 1, 'the car joins the salt road outside the yard');
  const opening = driveMeasuredStretches(duel, route, [500, 1000, 1500], 100 / 1.609344, true);
  console.log('Salt-pan opening:', JSON.stringify(opening));
  assert.equal(opening.reachedAll, true, 'the car reaches each opening stretch on the salt-pan way');
  assert.ok(opening.stretches.every(stretch => stretch.maxDistance < 30), 'the car follows the real way');
  assert.ok(opening.stretches.slice(1).every(stretch => stretch.fastRoadSpeedTicks / stretch.ticks > 0.95),
    'the car holds road speed on the clear opening');
  assert.equal(opening.stretches.at(-1).ember, duel.state.arena.worldJob.job.stepState.ember,
    'the drive records the actual pot');
  // Keep the same road speed for the remaining route. Do not tune the
  // driver to produce a particular ember value.
  const townGate = definition.steps[0].riderSafeWall;
  const gateAlong = nearestOnLine(route, townGate.x, townGate.z).along;
  const ends = [];
  for (let along = 2000; along < gateAlong - 150; along += 500) ends.push(along);
  ends.push(Math.min(pathLength(route) - 1, gateAlong - 150));
  const remaining = driveMeasuredStretches(duel, route, ends, 100 / 1.609344, true);
  const stretches = [join, ...opening.stretches, ...remaining.stretches];
  const pipePeakKmh = Math.max(...stretches.map(item => item.pipePeakSpeedMph)) * 1.609344;
  assert.ok(pipePeakKmh > 0 && pipePeakKmh <= 40,
    'the real car stays within the Pipe speed limit');
  let arrival = null;
  if (remaining.reachedAll) {
    const car = duel.course.worldAt(duel.state.s, duel.state.lateral);
    const gateLine = [{x:car.x, z:car.z},
      {x:townGate.x - townGate.through.x * 80, z:townGate.z - townGate.through.z * 80},
      {x:townGate.x - townGate.through.x * 25, z:townGate.z - townGate.through.z * 25},
      {x:townGate.x + townGate.through.x * 15, z:townGate.z + townGate.through.z * 15}];
    const gateDrive = driveAlongRoad(duel, gateLine, pathLength(gateLine) - 1, 12000, 12, true);
    stretches.push(gateDrive);
    if (gateDrive.along >= pathLength(gateLine) - 1) arrival = driveToForge(duel, step.destination.position);
  }
  const pot = duel.state.arena.worldJob.job.stepState;
  const measurement = {kilometres:(yardExit.driven + stretches.reduce((sum, item) => sum + item.driven, 0) + (arrival?.driven || 0)) / 1000,
    minutes:(yardExit.ticks + stretches.reduce((sum, item) => sum + item.ticks, 0) + (arrival?.ticks || 0)) / 3600,
    rams:stretches.flatMap(item => item.jolts).filter(jolt => jolt.riders.length > 0).length,
    jolts:stretches.reduce((sum, item) => sum + item.jolts.length, 0) + (arrival?.jolts.length || 0),
    scoops:pot.scoopedBraziers || [], arrival:arrival?.done ? arrival.fire.ember : null,
    ember:pot.ember, pipePeakKmh, reachedAll:remaining.reachedAll, last:remaining.stretches.at(-1), forge:arrival};
  console.log('Salt-pan measurement:', JSON.stringify(measurement));
  assert.equal(measurement.ember, pot.ember, 'the measurement reads the real pot');
  assert.equal(measurement.jolts, arrival?.observedJoltCount ?? pot.joltCount ?? 0,
    'the measurement accounts for the real jolts');
  assert.equal(measurement.rams, 0, 'the careful salt-pan drive takes no rider rams');
  assert.ok(measurement.arrival >= 30 && measurement.arrival < 70, 'the salt-pan ember arrives alive');
  assert.ok(remaining.reachedAll && arrival?.done, 'the salt-pan drive reaches and delivers at the forge');
  if (arrival) assert.ok(arrival.distance < 5 && Math.abs(arrival.speedMph) < 0.5, 'an arrival stops at the forge');
  else assert.equal(measurement.arrival, null, 'a stuck drive is not recorded as an arrival');

}

// The real job requests the gate only for a car approaching slowly.
{
  const world = createWorldJob(definition), events = [], gate = step.riderSafeWall;
  const state = {arena:{mode:'world-job', worldJob:world}, weaponLoadout:[], s:0, lateral:0,
    opponents:[], speedMph:0, stageTimeSec:0, input:{}, cpuDifficulty:'medium'};
  let car = {x:gate.x, z:gate.z + 30};
  const duel = {state, seed:19, course:{def:{scablands:true}, nearest:() => ({s:0, lateral:0}),
    at:() => ({heading:0}), worldAt:() => ({...car, y:scablandsSurfaceHeightAt(car.x, car.z)})},
    emit:event => events.push(event), _storyCallout:() => {}};
  initializeWorldJob(duel, definition);
  const door = world.solidGrid.townGate[0];
  assert.equal(door.id, 'hot-delivery-town-door');
  assert.equal(pushOutOfSolids(gate.x, gate.z, 1, world.solidGrid).hit?.id, door.id,
    'the closed door blocks the opening');
  const scene = createScablandsScene(new Course(SCABLANDS_VENUE, 19), {openMarks:[], loadAsset:async () => ({scene:new THREE.Group()})});
  const drawnDoor = scene.group.getObjectByName('Hot Delivery town gate door');
  syncScene(scene.group, state);
  assert.equal(drawnDoor.visible, true, 'the closed door is drawn');
  world.job.stepState = {loaded:true, ember:100};
  const tick = () => stepWorldJob(duel, 0.01);
  tick();
  assert.notEqual(world.tinTownGateRequested, true, 'a distant car does not request the gate');
  car = {x:gate.x, z:gate.z + 10};
  state.speedMph = 30 / 1.609344;
  tick();
  assert.notEqual(world.tinTownGateRequested, true, '30 km/h is too fast');
  state.speedMph = 29 / 1.609344;
  state.onFoot = true;
  tick();
  assert.notEqual(world.tinTownGateRequested, true, 'a person does not request the gate');
  state.onFoot = false;
  tick(); tick();
  assert.equal(world.tinTownGateRequested, true);
  assert.equal(world.solidGrid.townGate.length, 0, 'opening the door clears the job solid');
  assert.notEqual(pushOutOfSolids(gate.x, gate.z, 1, world.solidGrid).hit?.id, door.id);
  syncScene(scene.group, state);
  assert.equal(drawnDoor.visible, true);
  assert.equal(drawnDoor.rotation.y, Math.PI / 2, 'the door swings clear');
  scene.dispose();
  assert.ok(SOUND_BANK['world.tintown.gate']?.layers.length);
  assert.equal(events.filter(event => event.arenaTell?.cue === 'world.tintown.gate').length, 1);
}
// The real job records the delivered fire and sounds the forge when the ember lands.
{
  assert.ok(SOUND_BANK['world.forge.catch']?.layers.length);
  assert.equal(step.arrivalHold.catchAt, FORGE.times.lit);
  const flameHeights = [];
  for (const [ember, grade, pay] of [[70, 'bright', 120], [1, 'barely', 50]]) {
    const duel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true}});
    duel.state.wastelandGateDiscovered = true;
    assert.equal(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
      cpuDifficulty:'medium', opponents:[], job:{...definition, seed:19}}), true);
    const state = duel.state, world = state.arena.worldJob, bay = step.destination.position;
    const at = duel.course.nearest(bay.x, bay.z);
    placeActor(duel, state, {s:at.s, lateral:at.lateral, headingError:0}, 0);
    world.job.stepState = {loaded:true, ember, triggeredLines:step.sayNear.map(cue => `near:${cue.lineId}`)};
    const events = [], emit = duel.emit.bind(duel);
    duel.emit = event => {events.push(event); emit(event);};
    const scene = createScablandsScene(duel.course, {openMarks:[], loadAsset:async () => ({scene:new THREE.Group()})});
    const flame = scene.group.getObjectByName('Hot Delivery forge fire');
    const pot = scene.group.getObjectByName('Hot Delivery pot transfer');
    syncScene(scene.group, state);
    assert.equal(flame.visible, false, 'the forge is cold before delivery');
    assert.equal(pot.visible, false);
    stepWorldJob(duel, 0);
    assert.deepEqual(world.forgeFire, {ember, grade});
    assert.equal(world.job.done, false, 'the job waits for the forge');
    assert.equal(world.arrivalHold.elapsed, 0);
    const arrivalHud = worldHudModel({worldJob:world});
    assert.equal(arrivalHud.line, 'Delivered. The forge takes the fire.');
    assert.equal(arrivalHud.ember.value, ember, 'the gauge shows the ember that arrived');
    assert.equal(events.filter(event => event.arenaTell?.cue === 'world.forge.catch').length, 0);
    // The forge and its crane (src/world/forge-look.js, 16 November 2026) replace the plain flame and the flying pot. The pot stands where it
    // stood on the car until the hook has it, is lifted off, is carried to the hearth and tipped, and only then does the forge catch.
    const where = object => { scene.group.updateMatrixWorld(true); return object.getWorldPosition(new THREE.Vector3()); };
    syncScene(scene.group, state);
    assert.equal(pot.visible, true, 'the pot leaves the car');
    const from = where(pot);
    assert.ok(Math.hypot(from.x - bay.x, from.z - bay.z) < 4, 'and stands at the back of the stopped car');
    // While the job holds, the crane keeps the job's own count and nothing else (reviewers found twice that it could run ahead of the job on
    // the scene's clock: through a pause, and whenever the count stood still). So the scene's clock alone moves nothing, paused or not.
    animateScene(scene.group, 2);
    assert.ok(where(pot).distanceTo(from) < 1e-6, 'the crane does not move while the job’s count stands still');
    state.paused = true; syncScene(scene.group, state); animateScene(scene.group, 4);
    assert.ok(where(pot).distanceTo(from) < 1e-6, 'a paused game holds the crane still');
    state.paused = false;
    // The job's count is set here by hand, as the job itself sets it a step at a time (proved further down).
    const holdAt = seconds => { world.arrivalHold.elapsed = seconds; syncScene(scene.group, state); animateScene(scene.group, 4 + seconds); };
    holdAt(3);
    assert.equal(pot.visible, true);
    assert.ok(where(pot).distanceTo(from) > .1, 'the pot moves toward the forge');
    assert.ok(where(pot).y > from.y + 1, 'the pot is lifted off the car');
    assert.equal(flame.visible, false, 'the forge stays cold until the ember is tipped into it');
    holdAt(4.9);
    assert.equal(flame.visible, false, 'and is still cold a tenth of a second before the cue');
    holdAt(6);
    assert.equal(flame.visible, true, 'a flame shows within a second of the cue at five seconds, whatever the ember');
    holdAt(8.9);
    const hearth = forgePlan().hearth, over = where(pot);
    assert.ok(Math.hypot(over.x - hearth.x, over.z - hearth.z) < .5, 'the transfer ends over the hearth');
    assert.equal(flame.visible, true, 'and the forge has caught');
    // After the hold the fire burns on under the results by the scene's own clock.
    const held = world.arrivalHold; world.arrivalHold = null; syncScene(scene.group, state);
    animateScene(scene.group, 26);
    flameHeights.push(flame.scale.y);
    world.arrivalHold = held; held.elapsed = 0;
    const fire = where(flame);
    assert.ok(Math.hypot(fire.x - hearth.x, fire.z - hearth.z) < 1, 'the fire burns in the hearth');
    for (const id of ['tin-town-forge', 'tin-town-crane', 'tin-town-anvil']) assert.ok(SCABLANDS_SOLIDS.some(solid => solid.id === id), `${id} is solid`);
    // Each stands square to the land (heading 0), so its nearest point to the bay's middle is found a side at a time.
    assert.ok(forgePlan().solids.every(solid => Math.hypot(Math.max(0, Math.abs(solid.x - bay.x) - solid.halfX), Math.max(0, Math.abs(solid.z - bay.z) - solid.halfZ)) > step.radius + .5), 'and none of them stands in the bay');
    state.status = 'racing';
    state.paused = true;
    duel.step(1 / 60);
    assert.equal(world.arrivalHold.elapsed, 0, 'pausing stops the hold');
    state.paused = false;
    const armor = state.armor, before = {...world.emberResult}, place = {s:state.s, lateral:state.lateral};
    const rider = world.actors.find(actor => actor.id === step.waitingActors[0].id);
    const home = step.waitingActors[0].start.position;
    rider.position = {...home, x:home.x + 30};
    rider.returningToPost = true;
    const riderBefore = {...rider.position};
    state.scablandsHitKmh = 200;
    world.riderHitKmh = 200;
    duel.setInput({throttle:1, steer:1, boost:true});
    assert.equal(duel.fireWeapon('flamethrower'), false, 'weapons cannot fire during the hold');
    for (let i = 0; i < 294; i++) duel.step(1 / 60);
    assert.equal(events.filter(event => event.arenaTell?.cue === 'world.forge.catch').length, 0);
    for (let i = 0; i < 6; i++) duel.step(1 / 60);
    assert.equal(events.filter(event => event.arenaTell?.cue === 'world.forge.catch').length, 1);
    for (let i = 0; i < 234; i++) duel.step(1 / 60);
    assert.equal(world.job.done, false, 'the job is still in progress at 8.9 seconds');
    assert.equal(state.speedMph, 0);
    assert.deepEqual({s:state.s, lateral:state.lateral}, place);
    assert.equal(state.armor, armor);
    assert.deepEqual(world.emberResult, before);
    const heldHud = worldHudModel({worldJob:world});
    assert.equal(heldHud.line, 'Delivered. The forge takes the fire.');
    assert.equal(heldHud.ember.value, ember, 'the gauge keeps the delivered ember during the hold');
    assert.notDeepEqual(rider.position, riderBefore, 'a retreating rider continues home');
    for (let i = 0; i < 6; i++) duel.step(1 / 60);
    assert.equal(world.job.done, true, 'the job ends at 9.0 seconds');
    assert.deepEqual(world.emberResult, before);
    assert.equal(world.emberResult.pay, pay, 'the hold keeps the delivery payment');
    scene.dispose();
    const catches = events.filter(event => event.arenaTell?.cue === 'world.forge.catch');
    assert.equal(catches.length, 1);
    assert.deepEqual(catches[0].arenaTell.position, bay);
  }
  assert.ok(flameHeights[0] > flameHeights[1], 'a bright delivery catches more strongly and quickly');
  // The forge's solids are in the land for every job. No place, start or path point of any Everburn job, board job or gas run stands
  // inside one, or within 1 m of one (a reviewer asked for this to be shown, not assumed).
  {
    const solids = forgePlan().solids, seen = new Set(), found = [];
    const walk = node => {
      if (!node || typeof node !== 'object' || seen.has(node)) return;
      seen.add(node);
      const point = node.position ?? node;
      if (Number.isFinite(point?.x) && Number.isFinite(point?.z)) found.push({id: node.id ?? '(a point)', x: point.x, z: point.z});
      for (const value of Array.isArray(node) ? node : Object.values(node)) walk(value);
    };
    walk([EVERBURN_JOBS, EVERBURN_SIDE_JOBS, gasRunPaths(LAND)]);
    assert.ok(found.length > 100, `the walk found the jobs' places (${found.length})`);
    for (const point of found) for (const solid of solids)
      assert.ok(Math.abs(point.x - solid.x) > solid.halfX + 1 || Math.abs(point.z - solid.z) > solid.halfZ + 1, `${point.id} stands clear of ${solid.id}`);
  }
  // The crane keeps the job's own count of its hold, not the wall clock, so the ember lands with the cue.
  {
    const forge = createForge({documentLike: null}), bay = step.destination.position;
    forge.animate(0); forge.deliver({x: bay.x, y: 1, z: bay.z}, 'bright', 1, 0); forge.hold(0, false);
    forge.hold(4.9, false); forge.animate(.01);
    assert.equal(forge.lit, false, 'the ember has not landed at 4.9 s of the hold');
    forge.hold(5, false); forge.animate(.02);
    assert.equal(forge.lit, true, 'and has landed at 5.0 s');
    forge.hold(5, true); forge.animate(30);
    assert.equal(forge.phase, 'pour', 'a pause holds the crane where it was, however long it lasts');
    forge.dispose();
  }
}
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
  for (let i = 0; i < 90; i++) tick(0.1);
  for (const [index, rider] of riders.entries()) {
    assert.ok(rider.position.y < starts[index].y - 10, 'the rider comes down from the watch');
    assert.ok(Math.hypot(rider.position.x - car.x, rider.position.z - car.z) <
      Math.hypot(starts[index].x - car.x, starts[index].z - car.z) - 30, 'the rider pursues the car');
  }
  for (let i = 0; i < 90; i++) tick(0.1);
  assert.equal(world.skylineSight.visible, false, 'the furnace cannot see the car at this position');
  assert.equal(world.furnaceRidersReturning, true, 'the riders give up after ten seconds out of furnace sight');
  for (const rider of riders) {
    assert.equal(rider.returningToPost, true, 'the rider is returning instead of reaching the car');
  }
  tick(1);
  assert.equal(horns().length, 1);
  assert.equal(world.actors.filter(actor => actor.id.startsWith('furnace-rider-')).length, 2);
}
// Furnace riders stop for lost sight, the town wall, or the horn's time limit.
for (const reason of ['sight', 'town', 'time']) {
  const world = createWorldJob(definition);
  const state = {arena:{worldJob:world}, weaponLoadout:[], s:0, lateral:0,
    opponents:[], speedMph:0, stageTimeSec:0, input:{}, cpuDifficulty:'medium'};
  let car = {x:FURNACE_SKYLINE.x + 100, z:FURNACE_SKYLINE.z};
  car.y = scablandsSurfaceHeightAt(car.x, car.z);
  const duel = {state, seed:19, course:{def:{scablands:true}, nearest:() => ({s:0, lateral:0}),
    at:() => ({heading:0}), worldAt:() => car}, emit:() => {}, _storyCallout:() => {}};
  initializeWorldJob(duel, definition);
  world.job.stepState = {loaded:true, ember:100};
  world.skylineWarned = true;
  world.skylineSight = {visible:true};
  world.sightStep = 1;
  stepWorldJob(duel, 0);
  for (const rider of world.actors.filter(actor => actor.id.startsWith('furnace-rider-'))) rider.position.x += 30;
  world.skylineSight = {visible:reason !== 'sight'};
  world.furnaceLostSightSeconds = reason === 'sight' ? 9.9 : 0;
  world.furnacePursuitSeconds = reason === 'time' ? 89.9 : 0;
  if (reason === 'town') {
    const wall = step.riderSafeWall;
    car = {x:wall.x, z:wall.z, y:scablandsSurfaceHeightAt(wall.x, wall.z)};
    state.headingError = Math.atan2(FURNACE_SKYLINE.x - car.x, FURNACE_SKYLINE.z - car.z);
  }
  world.sightStep = 1;
  stepWorldJob(duel, 0.11);
  assert.equal(world.furnaceRidersReturning, true, `furnace riders return after ${reason}`);
  const riders = world.actors.filter(actor => actor.id.startsWith('furnace-rider-'));
  if (reason !== 'town') {
    assert.equal(riders.length, 2);
    assert.ok(riders.every(rider => rider.returningToPost && !rider.pursuing));
  }
  if (reason === 'town' && riders.length === 0) continue;
  // A nearby rider and its post in open ground cannot disappear.
  const remaining = world.actors.filter(actor => actor.id.startsWith('furnace-rider-'));
  car = {...remaining[0].position};
  world.sightStep = 1;
  stepWorldJob(duel, 0.1);
  assert.ok(world.actors.includes(remaining[0]), 'a nearby rider in open ground remains');
  // Both ends are far away, regardless of heading or terrain.
  car = {x:FURNACE_SKYLINE.x + 2000, z:FURNACE_SKYLINE.z,
    y:scablandsSurfaceHeightAt(FURNACE_SKYLINE.x + 2000, FURNACE_SKYLINE.z)};
  world.sightStep = 1;
  stepWorldJob(duel, 0.1);
  assert.equal(world.actors.filter(actor => actor.id.startsWith('furnace-rider-')).length, 0,
    'both distant ends allow removal');
  stepWorldJob(duel, 0.1);
  assert.equal(world.actors.filter(actor => actor.id.startsWith('furnace-rider-')).length, 0,
    'removed furnace riders do not reappear');
}
// The furnace rider can leave when terrain hides both it and its post, even nearby.
{
  const world = createWorldJob(definition), state = {arena:{worldJob:world}, weaponLoadout:[], s:0, lateral:0,
    opponents:[], speedMph:0, stageTimeSec:0, input:{}, cpuDifficulty:'medium'};
  let car = {...FURNACE_SKYLINE, y:scablandsSurfaceHeightAt(FURNACE_SKYLINE.x, FURNACE_SKYLINE.z)};
  const duel = {state, seed:19, course:{def:{scablands:true}, nearest:() => ({s:0, lateral:0}),
    at:() => ({heading:0}), worldAt:() => car}, emit:() => {}, _storyCallout:() => {}};
  initializeWorldJob(duel, definition);
  world.job.stepState = {loaded:true, ember:100};
  world.skylineWarned = true;
  world.furnaceRidersReturning = true;
  world.sightStep = 1;
  stepWorldJob(duel, 0);
  const actorDef = step.furnaceRiders[0], rider = world.actors.find(actor => actor.id === actorDef.id);
  const home = actorDef.start.position;
  let hiddenCar, hiddenRider;
  for (let angle = 0; angle < Math.PI * 2 && !hiddenCar; angle += Math.PI / 24) {
    for (let distance = 700; distance <= 2400 && !hiddenCar; distance += 100) {
      const candidate = {x:home.x + Math.sin(angle) * distance, z:home.z + Math.cos(angle) * distance};
      candidate.y = scablandsSurfaceHeightAt(candidate.x, candidate.z);
      const hidden = point => !sees(candidate, point, {heightAt:scablandsSurfaceHeightAt,
        actorFloors:true, eye:5, target:2, step:5});
      if (!hidden(home)) continue;
      for (let separation = 100; separation < 600; separation += 50) {
        const point = {x:candidate.x - Math.sin(angle) * separation, z:candidate.z - Math.cos(angle) * separation};
        point.y = scablandsSurfaceHeightAt(point.x, point.z);
        if (hidden(point)) { hiddenCar = candidate; hiddenRider = point; break; }
      }
    }
  }
  assert.ok(hiddenCar, 'the land hides a nearby furnace rider and its post');
  car = hiddenCar;
  rider.position = hiddenRider;
  stepWorldJob(duel, 0.1);
  assert.ok(!world.actors.includes(rider), 'both blocked sight lines allow furnace rider removal');
}
// A wrecked furnace rider stays where it was wrecked, even after the car leaves.
{
  const world = createWorldJob(definition), state = {arena:{worldJob:world}, weaponLoadout:[], s:0, lateral:0,
    opponents:[], speedMph:0, stageTimeSec:0, input:{}, cpuDifficulty:'medium'};
  let car = {x:FURNACE_SKYLINE.x + 100, z:FURNACE_SKYLINE.z, y:0};
  const duel = {state, seed:19, course:{def:{scablands:true}, nearest:() => ({s:0, lateral:0}),
    at:() => ({heading:0}), worldAt:() => car}, emit:() => {}, _storyCallout:() => {}};
  initializeWorldJob(duel, definition);
  world.job.stepState = {loaded:true, ember:100};
  world.skylineWarned = true;
  world.skylineSight = {visible:true};
  world.sightStep = 1;
  stepWorldJob(duel, 0);
  const wreck = world.actors.find(actor => actor.id.startsWith('furnace-rider-'));
  wreck.health = 0;
  const wreckPosition = {...wreck.position};
  world.furnaceRidersReturning = true;
  car = {x:FURNACE_SKYLINE.x + 2000, z:FURNACE_SKYLINE.z, y:0};
  stepWorldJob(duel, 1);
  assert.ok(world.actors.includes(wreck), 'the wreck remains after the car leaves');
  assert.deepEqual(wreck.position, wreckPosition, 'the wreck stays where it fell');
  assert.ok(!world.furnaceRidersGone?.includes(wreck.id), 'the wreck is not marked removed');
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
  const road = ROAD_NET.road('east-road').points;
  const barrierOnRoad = nearestOnLine(road, barrier.position.x, barrier.position.z);
  const postOnRoad = nearestOnLine(road, actor.position.x, actor.position.z);
  assert.ok(postOnRoad.distance < 0.01, 'the post is on the road');
  assert.ok(Math.abs(postOnRoad.along - barrierOnRoad.along - 25) < 0.1,
    'the post is 25 metres beyond its barricade');
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
  // Let the rider finish returning to its post after the yard visit.
  world.actors[0].position = {...step.waitingActors[0].start.position};
  stepWorldJob(duel, 0.1);
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
  const scene = createScablandsScene(new Course(SCABLANDS_VENUE, 19), {openMarks:[], loadAsset:async () => ({scene:new THREE.Group()})});
  syncScene(scene.group, state);
  const drawings = scene.group.children.filter(node => node.name === 'Ash Men barricade');
  assert.equal(drawings.length, 2);
  state.worldJobThingsHit = [{id:step.barriers[0].id, kind:'barricade', burnable:true}];
  car = {...step.barriers[0].position, heading:0};
  stepWorldJob(duel, 0.01);
  assert.ok(!world.job.stepState.burntBarricades.includes(step.barriers[0].id), 'a projectile does not burn a barricade');
  for (const [index, barrier] of step.barriers.entries()) {
    const p = barrier.position;
    car = {x:p.x, y:p.y, z:p.z - 6, heading:0};
    state.headingError = 0;
    stepWorldJob(duel, 0.01);
    assert.equal(pushOutOfSolids(p.x, p.z, 1, world.solidGrid, p.y).hit?.id, barrier.id);
    const solid = world.solidGrid.barricades.find(item => item.id === barrier.id);
    const drawing = drawings[index], standing = drawing.children[0], burnt = drawing.children[1];
    syncScene(scene.group, state);
    standing.geometry.computeBoundingBox();
    const size = standing.geometry.boundingBox.getSize(new THREE.Vector3());
    assert.ok(Math.abs(size.x - 2 * solid.halfX) < .3);
    assert.ok(Math.abs(size.z - 2 * solid.halfZ) < .3);
    assert.equal(drawing.position.y, solid.minY);
    assert.ok(Math.abs(drawing.rotation.y - barrier.heading - Math.PI) < 1e-9);
    assert.equal(standing.visible, true);
    assert.equal(burnt.visible, false);
    assert.ok(startFlamethrower(duel, state));
    stepFlamethrowers(duel, 0.1);
    assert.ok(state.worldJobThingsHit.some(hit => hit.id === barrier.id && hit.flame));
    stepWorldJob(duel, 0.01);
    assert.ok(world.job.stepState.burntBarricades.includes(barrier.id));
    assert.equal(pushOutOfSolids(p.x, p.z, 1, world.solidGrid, p.y).hit, null);
    syncScene(scene.group, state);
    assert.equal(standing.visible, false);
    assert.equal(burnt.visible, true);
    assert.notEqual(standing.geometry, burnt.geometry);
    assert.equal(standing.material, burnt.material);
    assert.ok(!worldJobHitTargets(duel).some(target => target.id === barrier.id));
    state.combat.flameBursts = [];
  }
  assert.equal(drawings[0].children[0].material, drawings[1].children[0].material);
  scene.dispose();
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
  const mouth = smoke.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.hypot(mouth.x - position.x, mouth.z - position.z) < .2);
  assert.ok(Math.abs(mouth.y - position.y - 1.1) < 1e-9);
  assert.equal(smoke.material.uniforms.uHeight.value, 40);
}
braziers.group.visible = true;
braziers.animate(12.5);
for (const stand of braziers.group.children) assert.equal(stand.getObjectByName('Brazier smoke column').material.uniforms.uTime.value, 12.5);
braziers.setYardPotLoaded(true);
assert.deepEqual(braziers.group.children.map(stand => stand.getObjectByName('Brazier smoke column').visible), [false, true, true]);
braziers.setYardPotLoaded(false);
assert.ok(braziers.group.children.every(stand => stand.getObjectByName('Brazier smoke column').visible));
braziers.dispose();
const figure = createCinderFigure();
assert.equal(figure.name, 'Cinder at the yard gate');
assert.ok(figure.children.some(child => child.isMesh));
assert.ok(Math.hypot(pickup.x - brazierSpotsFor(step)[0].x, pickup.z - brazierSpotsFor(step)[0].z) >= 6);
// Measure the real start and pickup against the gate and job solids.
{
  const gate = yardPlan().gate, forward = {x:Math.sin(gate.bearing), z:Math.cos(gate.bearing)};
  const relative = point => ({along:(point.x - LAND.yard.x - gate.x) * forward.x + (point.z - LAND.yard.z - gate.z) * forward.z,
    left:-(point.x - LAND.yard.x - gate.x) * forward.z + (point.z - LAND.yard.z - gate.z) * forward.x});
  const start = relative(step.carStart), cinder = relative(pickup), fire = relative(step.braziers[0].position);
  assert.ok(Math.abs(start.along + 40) < 1e-9 && Math.abs(start.left) < 1e-9);
  assert.ok(Math.abs(step.carStart.heading - gate.bearing) < 1e-9);
  assert.ok(Math.abs(fire.along + 8) < 1e-9 && Math.abs(fire.left - 20) < 1e-9);
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
job = stepJob(job, view(pickup.x + 12.1, pickup.z), 1);
assert.equal(job.stepState.pickingUp, undefined);
job = stepJob(job, view(pickup.x + 11.9, pickup.z), .1);
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
assert.equal(hud().target.id, 'cold-forge');
// Delivery requires the loaded car to stop in the forge bay; the arrival event carries the actual pay.
{
  const bay = step.destination.position;
  assert.deepEqual({x:bay.x, z:bay.z}, LAND.at('tin-town', 25, 14));
  assert.equal(step.radius, 8);
  assert.equal(step.destination.radius, step.radius);
  const grid = createJobSolidGrid();
  assert.equal(pushOutOfSolids(bay.x, bay.z, 2, grid, scablandsSurfaceHeightAt(bay.x, bay.z)).hit, null);
  const ready = () => {
    const delivery = createJob(definition, 19);
    delivery.stepState = {loaded:true, ember:100, triggeredLines:step.sayNear.map(cue => `near:${cue.lineId}`)};
    return delivery;
  };
  assert.equal(stepJob(ready(), view(bay.x + 7.5, bay.z), 0).done, true);
  assert.equal(stepJob(ready(), view(bay.x + 8.5, bay.z), 0).done, false);
  assert.equal(stepJob(ready(), view(bay.x, bay.z, 1), 0).done, false);
  assert.equal(stepJob(ready(), {...view(bay.x, bay.z), onFoot:true}, 0).done, false);
  for (const [ember, grade, pay, relights] of [[70, 'bright', 120, 0], [30, 'alive', 80, 0], [1, 'barely', 50, 0], [70, 'bright', 80, 1]]) {
    const delivery = ready();
    delivery.stepState = {...delivery.stepState, ember, relights};
    const result = stepJob(delivery, view(bay.x, bay.z), 0);
    assert.equal(result.done, true);
    const arrival = result.events.find(event => event.type === 'emberArrived');
    assert.deepEqual({ember:arrival.ember, grade:arrival.grade, pay:arrival.pay, relights:arrival.relights}, {ember, grade, pay, relights});
  }
  const out = ready();
  out.stepState = {...out.stepState, ember:0, out:true};
  assert.equal(stepJob(out, view(bay.x, bay.z), 0).done, false);
  const world = createWorldJob(definition), state = {arena:{worldJob:world}, weaponLoadout:[], s:0, lateral:0,
    opponents:[], speedMph:0, stageTimeSec:0, input:{}, cpuDifficulty:'medium'};
  const duel = {state, seed:19, course:{def:{scablands:true}, nearest:() => ({s:0, lateral:0}),
    at:() => ({heading:0}), worldAt:() => ({x:bay.x + 20, z:bay.z, y:scablandsSurfaceHeightAt(bay.x + 20, bay.z)})},
    emit:() => {}, _storyCallout:() => {}};
  initializeWorldJob(duel, definition);
  world.job = ready();
  stepWorldJob(duel, 0);
  const group = new THREE.Group();
  updateArenaMarkers(group, state.arena.markers, 0);
  const ring = group.getObjectByName('Arena floor ring');
  assert.ok(ring?.visible, 'the delivery ring is drawn');
  assert.equal(ring.geometry.parameters.outerRadius * ring.scale.x, step.radius, 'the visible ring matches the trigger');
}
// Exercise each one-time scoop, including interrupted stops.
job.stepState = {...job.stepState, ember: 10, out: false};
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
assert.equal(job.stepState.relights, 0);
// All scoops have been used, but an out pot can be relit repeatedly at any known brazier.
for (const brazier of [...step.braziers, step.braziers[0]]) {
  const {x, z} = brazier.position;
  job.stepState = {...job.stepState, ember: 0, out: true};
  const previousRelights = job.stepState.relights;
  assert.equal(brazierArrow({out:true}, {x:x + 1, z, heading:0}, knowledge).id, brazier.id);
  job = stepJob(job, view(x, z), 2.9);
  assert.equal(job.stepState.out, true);
  job = stepJob(job, view(x, z), 0.1);
  assert.equal(job.stepState.ember, 25);
  assert.equal(job.stepState.out, false);
  assert.equal(job.stepState.relights, previousRelights + 1);
  assert.deepEqual(job.stepState.scoopedBraziers, step.braziers.map(b => b.id));
  assert.deepEqual(job.events.filter(event => event.type === 'emberRelit').map(event => event.place), [brazier.id]);
}
// Relighting at an unused brazier does not spend its separate scoop.
job.stepState = {...job.stepState, ember: 0, out: true, scoopedBraziers: []};
job = stepJob(job, view(yard.x, yard.z), 3);
assert.deepEqual(job.stepState.scoopedBraziers, []);
job = stepJob(job, view(yard.x, yard.z), 3);
assert.deepEqual(job.stepState.scoopedBraziers, ['yard-brazier']);
console.log('Hot Delivery pickup: start, stop, three lines and ember passed.');
