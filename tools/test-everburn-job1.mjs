import assert from 'node:assert/strict';
import * as THREE from 'three';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {stepCarry} from '../src/world/jobs/steps/carry.js';
import {worldHudModel, worldMapFrame, worldMapWays, waysMarkup, brazierArrow, learnWayCrossings, learnDrivenWays, learnHotDeliveryDangers, moveMapCaption} from '../src/world/world-hud.js';
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
import {pushOutOfSolids, createJobSolidGrid, createSolidGrid} from '../src/world/scablands-solids.js';
import {riverDepthAt, scablandsDriveAt, GROUND_AREAS} from '../src/world/scablands-regions.js';
import {createWorldJob, initializeWorldJob, stepWorldJob, worldJobHitTargets} from '../src/arena/modes/world-job.js';
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
import {sightStretches, coverStretches, separatedCover, platesCoverLine, bedRiderBypass, bedStepsRoute, driveToFirstClimb, driveToCinder, driveThroughYardGate, driveAlongRoad, drivePlatesShelter, drivePlatesRoughGround, drivePlatesOpening, driveMeasuredStretches, driveToBrazier, driveToForge} from './everburn-job1-drive.mjs';
import {placeActor} from '../src/arena/arena-event.js';
import {wrapHeading} from '../src/offroad-physics.js';
import '../src/story/ember-lines.js';

const definition = EVERBURN_JOBS.find(job => job.id === 'everburn-hot-delivery');
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
  if (process.env.EVERBURN_STRAIGHT_ONLY === '1') process.exit(0);
}
// Drive from the Wash along the land test's bed line toward the Steps.
if (process.env.EVERBURN_BED_STEPS_ONLY === '1') {
  const duel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true, 'story-everburn':true}});
  duel.state.wastelandGateDiscovered = true;
  assert.ok(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
    cpuDifficulty:'medium', opponents:[], job:{...definition, seed:19}}));
  duel.state.countdown = 0;
  assert.ok(driveToCinder(duel, definition.steps[0].pickup.place.position).loaded);
  assert.ok(driveThroughYardGate(duel, yardPlan().gate).along >= 20);
  const way = HOT_DELIVERY_WAYS.find(item => item.id === 'river-bed');
  const line = bedRiderBypass(routeFor(way.legs, {start:LAND.yard, destination:LAND.at('tin-town')}), 150, -195);
  const wash = definition.steps[0].braziers.find(item => item.id === 'wash-brazier');
  const approach = driveMeasuredStretches(duel, line, [500, 1000, 1500, 2000, 2500, 3000,
    nearestOnLine(line, wash.position.x, wash.position.z).along - 30], 28);
  assert.ok(approach.reachedAll, 'the car reaches the Wash');
  assert.ok(driveToBrazier(duel, wash).scooped, 'the car scoops at the Wash');
  const route = bedStepsRoute();
  const car = duel.course.worldAt(duel.state.s, duel.state.lateral);
  const bedLine = [{x:car.x, z:car.z}, ...route.bed];
  const ends = [];
  for (let along = 500; along < pathLength(bedLine) - 50; along += 500) ends.push(along);
  const drive = driveMeasuredStretches(duel, bedLine, ends, 60 / 1.609344);
  const pot = duel.state.arena.worldJob.job.stepState;
  console.log('Bed toward the Steps:', JSON.stringify({reached:drive.reachedAll, last:drive.stretches.at(-1),
    length:pathLength(bedLine), ember:pot.ember, jolts:pot.joltCount ?? 0}));
  assert.ok(drive.reachedAll, 'the car follows the river toward the Steps');
  assert.ok(drive.stretches.some(stretch => stretch.passedUnderBridge), 'the car passes under the bridge on the bed');
  assert.equal(pot.joltCount ?? 0, 0, 'the car reaches the Steps approach without a jolt');
  const end = driveAlongRoad(duel, bedLine, pathLength(bedLine) - 25, 7200, 60 / 1.609344);
  console.log('Steps approach:', JSON.stringify(end));
  assert.ok(end.along >= pathLength(bedLine) - 25, 'the car reaches the end of the bed line');
  const here = duel.course.worldAt(duel.state.s, duel.state.lateral);
  const climbLine = [{x:here.x, z:here.z}, route.steps, route.exit];
  const climb = driveAlongRoad(duel, climbLine, pathLength(climbLine) - 25, 18000, 20 / 1.609344);
  console.log('Steps climb:', JSON.stringify(climb));
  assert.ok(climb.along >= pathLength(climbLine) - 25, 'the car climbs the Steps toward town');
  assert.equal(pot.joltCount ?? 0, 0, 'the car climbs without a jolt');
  const afterSteps = duel.course.worldAt(duel.state.s, duel.state.lateral);
  const gate = definition.steps[0].riderSafeWall;
  const directTrial = process.env.EVERBURN_BED_DIRECT_TRIAL === '1';
  const mediumTrial = process.env.EVERBURN_BED_MEDIUM_TRIAL === '1';
  const townLine = directTrial ? [{x:afterSteps.x, z:afterSteps.z}, route.town] :
    [{x:afterSteps.x, z:afterSteps.z},
      {x:route.exit.x + (mediumTrial ? 600 : 300), z:route.exit.z},
      {x:gate.x - gate.through.x * 180, z:gate.z - gate.through.z * 180}];
  const fastTrial = process.env.EVERBURN_BED_FAST_TRIAL === '1';
  const safeTrial = process.env.EVERBURN_BED_SAFE_TRIAL === '1';
  const townSpeed = (fastTrial ? 80 : (safeTrial || directTrial) ? 48 : mediumTrial ? 70 : 60) / 1.609344;
  const emberBeforeTown = duel.state.arena.worldJob.job.stepState.ember;
  const townDrive = driveAlongRoad(duel, townLine, 400, 7200, townSpeed);
  console.log('Steps toward town:', JSON.stringify(townDrive));
  assert.ok(townDrive.along >= 400, 'the car continues toward town beyond the Steps');
  if (directTrial) {
    assert.equal(townDrive.jolts.length, 1, 'the direct line meets one rider');
    assert.ok(townDrive.jolts[0].riders.some(rider => rider.id === 'ash-rider-2'),
      'the real rider is in contact on the direct line');
  } else if (safeTrial) {
    assert.ok(townDrive.jolts.some(jolt => jolt.riders.some(rider => rider.id === 'ash-rider-2')),
      'the safe-speed trial records the rider in contact');
  } else assert.equal(townDrive.jolts.length, 0, 'the car avoids rider contact and ground impacts beyond the Steps');
  assert.equal(townDrive.jolts.length, duel.state.arena.worldJob.job.stepState.joltCount,
    'the diagnostic records every pot jolt');
  const continuation = driveAlongRoad(duel, townLine, 800, 7200, townSpeed);
  console.log('Rider beyond the Steps:', JSON.stringify(continuation));
  assert.ok(continuation.along >= 800, 'the car reaches 800 m beyond the Steps');
  if (fastTrial) {
    assert.ok(emberBeforeTown - townDrive.ember > 30, 'the fast car loses more than 30 ember before the rider');
    assert.ok(townDrive.groundLoss['scab-plates'] > 30, 'the actual pot loses over 30 on the plates');
    assert.ok(Math.abs(Object.values(townDrive.groundLoss).reduce((sum, loss) => sum + loss, 0) - (emberBeforeTown - townDrive.ember)) < 0.001,
      'the recorded ground losses add up to the actual change in the pot');
    assert.equal(continuation.jolts.length, 0, 'the faster car avoids the rider on this stretch');
    assert.ok(continuation.firstOut, 'the faster car loses the ember on the open ground');
  } else if (mediumTrial) {
    assert.equal(continuation.jolts.length, 0, 'the 70 km/h trial avoids the rider for 800 m');
    assert.ok(emberBeforeTown - continuation.ember > 50, 'the 70 km/h trial loses more than 50 ember on the plates');
    assert.ok(townDrive.groundLoss['scab-plates'] + continuation.groundLoss['scab-plates'] > 50,
      'the actual pot loses over 50 on the plates despite avoiding a ram');
  } else if (directTrial) {
    assert.equal(continuation.jolts.length, 0, 'the direct line has no further jolt through 800 m');
    assert.ok(townDrive.ember - continuation.ember < 4, 'the pot loses less than four ember on the second stretch');
  } else if (safeTrial) {
    assert.ok(townDrive.groundLoss['scab-plates'] - townDrive.jolts.reduce((sum, jolt) => sum + jolt.amount, 0) < 10,
      'the safe-speed trial loses less than ten ember to cooling and rough ground');
    assert.ok(Math.abs(Object.values(townDrive.groundLoss).reduce((sum, loss) => sum + loss, 0) - (emberBeforeTown - townDrive.ember)) < 0.001,
      'the recorded ground losses add up to the actual change in the pot');
  } else assert.ok(continuation.jolts.some(jolt => jolt.riders.some(rider => rider.id === 'ash-rider-2')),
    'the rider is in contact at a recorded jolt on this line');
  assert.equal(continuation.jolts.length + townDrive.jolts.length, duel.state.arena.worldJob.job.stepState.joltCount,
    'the two stretches record every pot jolt');
  process.exit(0);
}
// Test a gradual line around the first rider on the bed route.
if (process.env.EVERBURN_BED_BYPASS_ONLY === '1') {
  const duel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true, 'story-everburn':true}});
  duel.state.wastelandGateDiscovered = true;
  assert.ok(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
    cpuDifficulty:'medium', opponents:[], job:{...definition, seed:19}}));
  duel.state.countdown = 0;
  assert.ok(driveToCinder(duel, definition.steps[0].pickup.place.position).loaded);
  assert.ok(driveThroughYardGate(duel, yardPlan().gate).along >= 20);
  const way = HOT_DELIVERY_WAYS.find(item => item.id === 'river-bed');
  const route = routeFor(way.legs, {start:LAND.yard, destination:LAND.at('tin-town')});
  const line = bedRiderBypass(route, 150, -195);
  const drive = driveMeasuredStretches(duel, line, [500, 1000, 1500, 2000, 2500, 3000], 28);
  const jolts = drive.stretches.flatMap(stretch => stretch.jolts);
  console.log('Bed rider bypass:', JSON.stringify({reached:drive.reachedAll, jolts, last:drive.stretches.at(-1)}));
  assert.ok(drive.reachedAll, 'the car reaches the far side of the rider post');
  assert.equal(jolts.length, 0, 'the car avoids jolts on the bypass');
  const wash = definition.steps[0].braziers.find(item => item.id === 'wash-brazier');
  const washAlong = nearestOnLine(line, wash.position.x, wash.position.z).along;
  const approach = driveMeasuredStretches(duel, line, [washAlong - 30], 28);
  const scoop = driveToBrazier(duel, wash);
  const pot = duel.state.arena.worldJob.job.stepState;
  console.log('Bed Wash approach:', JSON.stringify({washAlong, approach:approach.stretches.at(-1), scoop, jolts:pot.joltCount ?? 0, ember:pot.ember}));
  assert.ok(approach.reachedAll, 'the car reaches the Wash approach');
  assert.ok(scoop.scooped, 'the car takes the Wash scoop');
  assert.equal(pot.joltCount ?? 0, 0, 'the car reaches Wash without a jolt');
  const afterWash = driveMeasuredStretches(duel, line, [5000, 5500, 6000, 6100, 6200, 6300, 6400], 28);
  const afterJolts = afterWash.stretches.flatMap(stretch => stretch.jolts);
  console.log('Bed beyond Wash:', JSON.stringify({reached:afterWash.reachedAll, jolts:afterJolts, last:afterWash.stretches.at(-1), ember:duel.state.arena.worldJob.job.stepState.ember}));
  assert.ok(afterWash.reachedAll, 'the car reaches 6.4 km beyond Wash');
  assert.equal(duel.state.arena.worldJob.job.stepState.joltCount ?? 0, 0, 'the car reaches 6.4 km without a jolt');
  const crossing = driveMeasuredStretches(duel, line, [6500, 6600, 6700, 6800, 6900, 7000], 12);
  const crossingJolts = crossing.stretches.flatMap(stretch => stretch.jolts);
  console.log('Bed rough crossing:', JSON.stringify({reached:crossing.reachedAll, jolts:crossingJolts, last:crossing.stretches.at(-1), ember:duel.state.arena.worldJob.job.stepState.ember}));
  assert.ok(crossing.reachedAll, 'the car reaches 7 km beyond the rough ground');
  assert.equal(duel.state.arena.worldJob.job.stepState.joltCount ?? 0, 0, 'the car crosses without a jolt');
  const trial = driveToFirstClimb(duel, line, 7100, 6);
  const {drive:obstruction, climb} = trial;
  console.log('Bed slow climb trial:', JSON.stringify(trial));
  assert.ok(!obstruction.reachedAll && climb && climb.riders.length === 0, 'the current line meets steep ground beyond 7 km');
  assert.ok(climb.along >= 7020, 'the car passes 7.02 km before the steep-ground impact');
  assert.equal(obstruction.stretches[0].jolts.length, 1, 'the driver stops at the first climb impact');
  assert.ok(climb.hitSignals.speedBeforeKmh < 11, 'the car slows below 11 km/h before the impact');
  assert.ok(trial.terrain.riverDepth > 0, 'the ground impact is within the dry river');
  assert.ok(Math.hypot(trial.terrain.riverGradient.x + trial.terrain.groundGradient.x,
    trial.terrain.riverGradient.z + trial.terrain.groundGradient.z) < 0.02,
  'the river bank accounts for the ground slope at the impact');
  assert.ok(Math.hypot(trial.terrain.groundGradient.x, trial.terrain.groundGradient.z) > 0.25,
    'the real ground at the impact is steep');
  assert.ok(trial.emberAfter < trial.emberBefore, 'the slow impact still takes ember from the real pot');
  assert.ok(pot.ember > 0, 'the first impact leaves the pot lit for a route correction');
  process.exit(0);
}
// Identify bed hazards from the real car before choosing a clean line.
if (process.env.EVERBURN_BED_HAZARDS_ONLY === '1') {
  const duel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true, 'story-everburn':true}});
  duel.state.wastelandGateDiscovered = true;
  assert.ok(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
    cpuDifficulty:'medium', opponents:[], job:{...definition, seed:19}}));
  duel.state.countdown = 0;
  assert.ok(driveToCinder(duel, definition.steps[0].pickup.place.position).loaded);
  assert.ok(driveThroughYardGate(duel, yardPlan().gate).along >= 20);
  const way = HOT_DELIVERY_WAYS.find(item => item.id === 'river-bed');
  const route = routeFor(way.legs, {start:LAND.yard, destination:LAND.at('tin-town')});
  const wash = definition.steps[0].braziers.find(item => item.id === 'wash-brazier');
  const washAlong = nearestOnLine(route, wash.position.x, wash.position.z).along;
  const ends = [];
  for (let along = 500; along < washAlong - 50; along += 500) ends.push(along);
  ends.push(washAlong - 30);
  const drive = driveMeasuredStretches(duel, route, ends, 28);
  assert.ok(drive.reachedAll, 'the car reaches the Wash approach');
  assert.ok(driveToBrazier(duel, wash).scooped, 'the car takes the Wash scoop');
  const gate = definition.steps[0].riderSafeWall;
  const gateAlong = nearestOnLine(route, gate.x, gate.z).along;
  const remainingEnds = [];
  for (let along = washAlong + 500; along < gateAlong - 150; along += 500) remainingEnds.push(along);
  remainingEnds.push(Math.min(pathLength(route) - 1, gateAlong - 150));
  const remaining = driveMeasuredStretches(duel, route, remainingEnds, 28);
  assert.ok(remaining.reachedAll, 'the car reaches the town approach');
  const jolts = [...drive.stretches, ...remaining.stretches].flatMap(stretch => stretch.jolts);
  console.log('Bed hazards:', JSON.stringify(jolts));
  assert.equal(jolts.length, duel.state.arena.worldJob.job.stepState.joltCount ?? 0,
    'the recorded hazards account for the actual jolts');
  assert.equal(jolts.filter(jolt => jolt.groundHits.some(hit => hit.kind === 'climb')).length, 4,
    'four jolts are steep-ground impacts');
  const otherHits = jolts.filter(jolt => jolt.groundHits.length === 0);
  assert.equal(otherHits.length, 1, 'one jolt has no recorded ground impact');
  assert.ok(otherHits[0].riders.some(rider => rider.distance <= 3.1 && rider.heightDifference < 1),
    'the other jolt has a rider in contact on the same floor');
  process.exit(0);
}
// Measure a slower crossing of the steep ground on the bed approach to town.
if (process.env.EVERBURN_BED_DETOUR_ONLY === '1') {
  const duel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true, 'story-everburn':true}});
  duel.state.wastelandGateDiscovered = true;
  assert.ok(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
    cpuDifficulty:'medium', opponents:[], job:{...definition, seed:19}}));
  duel.state.countdown = 0;
  assert.ok(driveToCinder(duel, definition.steps[0].pickup.place.position).loaded);
  assert.ok(driveThroughYardGate(duel, yardPlan().gate).along >= 20);
  const way = HOT_DELIVERY_WAYS.find(item => item.id === 'river-bed');
  const route = routeFor(way.legs, {start:LAND.yard, destination:LAND.at('tin-town')});
  const wash = definition.steps[0].braziers.find(item => item.id === 'wash-brazier');
  const washAlong = nearestOnLine(route, wash.position.x, wash.position.z).along;
  const ends = [];
  for (let along = 500; along < washAlong - 50; along += 500) ends.push(along);
  ends.push(washAlong - 30);
  const drive = driveMeasuredStretches(duel, route, ends, 28);
  assert.ok(drive.reachedAll, 'the car reaches the Wash approach');
  assert.ok(driveToBrazier(duel, wash).scooped, 'the car takes the Wash scoop');
  const gate = definition.steps[0].riderSafeWall;
  const gateAlong = nearestOnLine(route, gate.x, gate.z).along;
  const remainingEnds = [];
  for (let along = washAlong + 500; along < gateAlong - 150; along += 500) remainingEnds.push(along);
  remainingEnds.push(Math.min(pathLength(route) - 1, gateAlong - 150));
  const earlyEnds = remainingEnds.filter(along => along < 6000);
  earlyEnds.push(6000);
  const early = driveMeasuredStretches(duel, route, earlyEnds, 28);
  assert.ok(early.reachedAll, 'the car reaches the rough ground');
  const remaining = driveMeasuredStretches(duel, route, remainingEnds.filter(along => along > 6000), 12);
  assert.ok(remaining.reachedAll, 'the car reaches the town approach');
  const jolts = [...drive.stretches, ...early.stretches, ...remaining.stretches].flatMap(stretch => stretch.jolts);
  console.log('Bed slower crossing:', JSON.stringify(jolts));
  assert.equal(jolts.length, duel.state.arena.worldJob.job.stepState.joltCount ?? 0,
    'the recorded hazards account for the actual jolts');
  assert.equal(jolts.filter(jolt => jolt.groundHits.some(hit => hit.kind === 'climb')).length, 0,
    'the detour avoids steep-ground impacts');
  const otherHits = jolts.filter(jolt => jolt.groundHits.length === 0);
  assert.equal(otherHits.length, 3, 'three jolts have no recorded ground impact');
  assert.ok(otherHits[0].riders.some(rider => rider.distance <= 3.1 && rider.heightDifference < 1),
    'the other jolt has a rider in contact on the same floor');
  assert.ok(otherHits.every(jolt => jolt.riders.some(rider => rider.distance <= 3.1 && rider.heightDifference < 3)),
    'each jolt has a rider in contact on the car?s floor');
  assert.ok(otherHits.every(jolt => jolt.hitSignals.speedBeforeKmh - jolt.hitSignals.speedAfterKmh < 8),
    'the measured speed drop alone cannot cause these jolts');
  process.exit(0);
}
// Measure a drivable line toward the first butte using the real car and sight timer.
if (process.env.EVERBURN_PLATES_COVER_ONLY === '1') {
  const duel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true, 'story-everburn':true}});
  duel.state.wastelandGateDiscovered = true;
  assert.ok(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
    cpuDifficulty:'medium', opponents:[], job:{...definition, seed:19}}));
  duel.state.countdown = 0;
  assert.ok(driveToCinder(duel, definition.steps[0].pickup.place.position).loaded);
  assert.ok(driveThroughYardGate(duel, yardPlan().gate).along >= 20);
  const way = HOT_DELIVERY_WAYS.find(item => item.id === 'scab-plates');
  const route = routeFor(way.legs, {start:LAND.yard, destination:LAND.at('tin-town')});
  const line = platesCoverLine(route);
  const careful = driveAlongRoad(duel, line, 1200, 18000, 30.4, false, false, 0.1);
  console.log('Plates speed-limited approach:', JSON.stringify(careful));
  assert.ok(careful.along >= 1200, 'the car reaches the obstacle at the plates speed');
  assert.equal(careful.abovePlatesLimitTicks, 0, 'the car stays within 50 km/h up to the obstacle');
  assert.equal(careful.jolts.length, 0, 'the speed-limited approach avoids jolts');
  const drive = driveAlongRoad(duel, line, 1600, 18000, 30.4, false, false, 0.1);
  console.log('Plates cover approach:', JSON.stringify(drive));
  assert.ok(drive.along >= 1600 && drive.distance < 10, 'the real car follows the cover line');
  assert.ok(drive.longestFurnaceSightSeconds < 22.5, 'the shelter line reduces the measured exposure');
  assert.equal(drive.jolts.length, 0, 'the car reaches the first shelter without a jolt');
  assert.equal(drive.abovePlatesLimitTicks, 0, 'the car stays within 50 km/h through the shelter approach');
  assert.ok(drive.longestFurnaceSightSeconds <= 6, 'the first shelter approach stays within six seconds of sight');
  assert.ok(!duel.state.arena.worldJob.skylineWarned, 'the furnace does not send riders on this approach');
  assert.equal(drive.longestFurnaceSight.seconds, drive.longestFurnaceSightSeconds);
  const next = drivePlatesShelter(duel, line, 2000);
  console.log('Plates next approach:', JSON.stringify(next));
  assert.ok(next.along >= 2000 && next.distance < 10, 'the car reaches the next sheltered stretch');
  assert.equal(next.jolts.length, 0, 'the next stretch avoids jolts');
  assert.equal(next.abovePlatesLimitTicks, 0, 'the next stretch stays within 50 km/h');
  assert.ok(next.longestFurnaceSightSeconds <= 6, 'the next stretch stays within six seconds of sight');
  assert.ok(!duel.state.arena.worldJob.skylineWarned, 'the furnace does not send riders on the next stretch');
  const further = drivePlatesShelter(duel, line, 2600);
  console.log('Plates further approach:', JSON.stringify(further));
  assert.ok(further.along >= 2600 && further.distance < 10, 'the car continues through the sheltered ground');
  assert.equal(further.jolts.length, 0, 'the sheltered ground avoids jolts');
  assert.equal(further.abovePlatesLimitTicks, 0, 'the sheltered ground stays within 50 km/h');
  assert.ok(further.longestFurnaceSightSeconds <= 6, 'the sheltered ground stays within six seconds of sight');
  assert.ok(!duel.state.arena.worldJob.skylineWarned, 'the furnace does not send riders through the sheltered ground');
  const gap = drivePlatesShelter(duel, line, 2900);
  console.log('Plates next cover:', JSON.stringify(gap));
  assert.ok(gap.along >= 2900 && gap.distance < 10, 'the car reaches the end of sheltered ground');
  assert.equal(gap.jolts.length, 0, 'the end of sheltered ground avoids jolts');
  assert.equal(gap.abovePlatesLimitTicks, 0, 'the end of sheltered ground stays within 50 km/h');
  assert.ok(gap.longestFurnaceSightSeconds <= 6, 'the end of sheltered ground stays within six seconds of sight');
  assert.ok(!duel.state.arena.worldJob.skylineWarned, 'the furnace does not send riders at the end of sheltered ground');
  const obstacle = drivePlatesShelter(duel, line, 3600);
  console.log('Plates obstacle measurements:', JSON.stringify(obstacle));
  assert.ok(obstacle.along >= 3600, 'the car reaches the far side of the measured obstacle');
  assert.ok(obstacle.jolts.length > 0, 'the measurement records the jolts that prevent a clean drive');
  assert.ok(obstacle.jolts.every(jolt => Number.isFinite(jolt.along) && Number.isFinite(jolt.position.y) &&
    Array.isArray(jolt.nearbySolids)), 'each jolt records its real position and nearby job solids');
  assert.deepEqual(obstacle.jolts.map(jolt => jolt.groundHits.map(hit => hit.kind)),
    [['fall'], ['fall'], ['fall'], ['climb'], ['climb']],
    'the ground reports three landings followed by two steep climbs at the jolts');
  // Repeat the same real approach at a lower speed to separate rough ground
  // from the furnace exposure. This is not yet the clean route proof.
  const slowDuel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true, 'story-everburn':true}});
  slowDuel.state.wastelandGateDiscovered = true;
  assert.ok(slowDuel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
    cpuDifficulty:'medium', opponents:[], job:{...definition, seed:19}}));
  slowDuel.state.countdown = 0;
  assert.ok(driveToCinder(slowDuel, definition.steps[0].pickup.place.position).loaded);
  assert.ok(driveThroughYardGate(slowDuel, yardPlan().gate).along >= 20);
  assert.ok(driveAlongRoad(slowDuel, line, 1200, 18000, 30.4, false, false, 0.1).along >= 1200);
  assert.ok(drivePlatesShelter(slowDuel, line, 2900).along >= 2900);
  const slowObstacle = drivePlatesRoughGround(slowDuel, line, 3600);
  console.log('Plates slower obstacle approach:', JSON.stringify(slowObstacle));
  assert.ok(slowObstacle.along >= 3600, 'the slower car crosses the rough ground');
  assert.equal(slowObstacle.jolts.length, 0, 'the slower car crosses without jolts');
  assert.ok(slowObstacle.longestFurnaceSightSeconds > 6 && slowDuel.state.arena.worldJob.skylineWarned,
    'the slower crossing still triggers the furnace, so it is not the clean drive');
  // Try a gradual turn toward the far shelter, measuring the actual car and
  // furnace timer rather than assuming that an offset is safe to drive.
  const offsetDuel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true, 'story-everburn':true}});
  offsetDuel.state.wastelandGateDiscovered = true;
  assert.ok(offsetDuel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
    cpuDifficulty:'medium', opponents:[], job:{...definition, seed:19}}));
  offsetDuel.state.countdown = 0;
  assert.ok(driveToCinder(offsetDuel, definition.steps[0].pickup.place.position).loaded);
  assert.ok(driveThroughYardGate(offsetDuel, yardPlan().gate).along >= 20);
  const offsetLine = platesCoverLine(route, -60);
  assert.ok(driveAlongRoad(offsetDuel, offsetLine, 1200, 18000, 30.4, false, false, 0.1).along >= 1200);
  assert.ok(drivePlatesShelter(offsetDuel, offsetLine, 2900).along >= 2900);
  const offsetCrossing = drivePlatesRoughGround(offsetDuel, offsetLine, 3600);
  console.log('Plates offset crossing:', JSON.stringify(offsetCrossing));
  assert.ok(offsetCrossing.along >= 3600, 'the car reaches the far side on the offset line');
  assert.ok(offsetCrossing.jolts.length > 0 && offsetCrossing.jolts.every(jolt =>
    jolt.groundHits.some(hit => hit.kind === 'climb')), 'the offset line hits steep ground');
  assert.ok(offsetCrossing.longestFurnaceSightSeconds <= 6 && !offsetDuel.state.arena.worldJob.skylineWarned,
    'the offset crossing stays out of the furnace warning');
  // Measure a line halfway between the centre and the steep far offset.
  const middleDuel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true, 'story-everburn':true}});
  middleDuel.state.wastelandGateDiscovered = true;
  assert.ok(middleDuel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
    cpuDifficulty:'medium', opponents:[], job:{...definition, seed:19}}));
  middleDuel.state.countdown = 0;
  assert.ok(driveToCinder(middleDuel, definition.steps[0].pickup.place.position).loaded);
  assert.ok(driveThroughYardGate(middleDuel, yardPlan().gate).along >= 20);
  const middleLine = platesCoverLine(route, -20);
  assert.ok(driveAlongRoad(middleDuel, middleLine, 1200, 18000, 30.4, false, false, 0.1).along >= 1200);
  assert.ok(drivePlatesShelter(middleDuel, middleLine, 2900).along >= 2900);
  const middleCrossing = drivePlatesRoughGround(middleDuel, middleLine, 3600, 20);
  console.log('Plates middle crossing:', JSON.stringify(middleCrossing));
  assert.ok(middleCrossing.along >= 3600, 'the car reaches the far side on the middle line');
  assert.ok(middleCrossing.jolts.length > 0 && middleCrossing.jolts.every(jolt =>
    jolt.groundHits.some(hit => hit.kind === 'climb')), 'the faster middle line hits steep ground');
  assert.ok(middleCrossing.longestFurnaceSightSeconds > 6 && middleDuel.state.arena.worldJob.skylineWarned,
    'the faster middle line still triggers the furnace');
  // Try the remaining ground between the measured middle and far lines.
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
  process.exit(0);
}
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
const step = definition.steps[0], pickup = step.pickup.place.position;
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
// Start the Medium proof drive at the actual yard start and pick up the pot by driving to Cinder.
{
  const duel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true, 'story-everburn':true}});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
    cpuDifficulty:'medium', opponents:[], job:{...definition, seed:19}}), true);
  const state = duel.state, world = state.arena.worldJob;
  state.countdown = 0;
  const result = driveToCinder(duel, pickup);
  assert.equal(world.job.stepState.loaded, true, `the real car collects the pot from Cinder; distance ${result.distance.toFixed(1)} m`);
  assert.ok(world.job.stepState.ember > 99, 'the pickup begins with a bright ember');
  let distanceMetres = 0;
  const originalStep = duel.step.bind(duel);
  duel.step = dt => {
    const before = duel.course.worldAt(state.s, state.lateral);
    originalStep(dt);
    const after = duel.course.worldAt(state.s, state.lateral);
    distanceMetres += Math.hypot(after.x - before.x, after.z - before.z);
  };
  const exit = driveThroughYardGate(duel, yardPlan().gate);
  assert.ok(exit.along >= 20, `the loaded car drives through the gate: ${JSON.stringify(exit)}`);
  assert.ok(Math.abs(exit.gateOffset) < 6, `the car crosses within the 12 m gate: ${JSON.stringify(exit)}`);
  assert.ok(world.job.stepState.ember > 0, 'the ember stays alight through the gate');
  const exitEmber = world.job.stepState.ember;
  const road = driveAlongRoad(duel, ROAD_NET.road('east-road').points, 500, 7200, 50);
  assert.ok(road.along >= 500, `the car follows the East Road for 500 m: ${JSON.stringify(road)}`);
  assert.ok(road.maxDistance < 20, `the car stays close to the road: ${JSON.stringify(road)}`);
  assert.ok(road.fastRoadSpeedTicks / road.ticks > 0.5, `the car reaches road speed after leaving the yard: ${JSON.stringify(road)}`);
  assert.ok(world.job.stepState.ember > 70, `the ember is still bright on the first stretch: ${world.job.stepState.ember}; gate ${exitEmber}; ${JSON.stringify(road)}`);
  console.log('East Road 500 m drive:', JSON.stringify(road));
  const next = driveAlongRoad(duel, ROAD_NET.road('east-road').points, 1000, 7200, 50);
  assert.ok(next.along >= 1000, `the car follows the East Road for 1 km: ${JSON.stringify(next)}`);
  assert.ok(next.driven >= 490, `the real car travels the next stretch: ${JSON.stringify(next)}`);
  assert.ok(next.fastRoadSpeedTicks / next.ticks > 0.95, `the car keeps road speed on the clear stretch: ${JSON.stringify(next)}`);
  assert.ok(next.maxDistance < 20, `the car stays close to the road on the next stretch: ${JSON.stringify(next)}`);
  assert.ok(world.job.stepState.ember > 0, `the ember stays alight after 1 km: ${world.job.stepState.ember}; ${JSON.stringify(next)}`);
  console.log('East Road 1 km drive:', JSON.stringify(next));
  const further = driveAlongRoad(duel, ROAD_NET.road('east-road').points, 1500, 7200, 50);
  assert.ok(further.along >= 1500, `the car follows the East Road for 1.5 km: ${JSON.stringify(further)}`);
  assert.ok(further.driven >= 490, `the real car travels the third stretch: ${JSON.stringify(further)}`);
  assert.ok(further.maxDistance < 20, `the car stays close to the road on the third stretch: ${JSON.stringify(further)}`);
  assert.equal(further.ember, world.job.stepState.ember, 'the drive records the real ember at the end of the stretch');
  assert.ok(further.ember > 0, `the ember stays alight after 1.5 km: ${JSON.stringify(further)}`);
  assert.ok(further.elapsedSeconds > 0, 'the drive records its elapsed time');
  assert.ok(further.fastRoadSpeedTicks / further.ticks > 0.8,
    `the car accelerates to road speed on the clear stretch: ${JSON.stringify(further)}`);
  console.log('East Road 1.5 km drive:', JSON.stringify(further));
  const fourth = driveAlongRoad(duel, ROAD_NET.road('east-road').points, 2000);
  assert.ok(fourth.along >= 2000, `the car follows the East Road for 2 km: ${JSON.stringify(fourth)}`);
  assert.ok(fourth.driven >= 490 && fourth.maxDistance < 20, `the car drives the fourth stretch close to the road: ${JSON.stringify(fourth)}`);
  assert.ok(fourth.lowestEmber > 0 && fourth.lowestEmber <= fourth.ember, `the ember stays alight throughout the fourth stretch: ${JSON.stringify(fourth)}`);
  console.log('East Road 2 km drive:', JSON.stringify(fourth));
  const joltsBeforeCamp = world.job.stepState.joltCount ?? 0;
  const approach = driveAlongRoad(duel, ROAD_NET.road('east-road').points, 2350);
  assert.ok(approach.along >= 2350, `the car approaches the camp: ${JSON.stringify(approach)}`);
  assert.equal(approach.jolts.length, (world.job.stepState.joltCount ?? 0) - joltsBeforeCamp,
    'the driver records each real jolt on the camp approach');
  assert.equal(approach.jolts.length, 0, `the driver slows for the camp barricade without a jolt: ${JSON.stringify(approach)}`);
  console.log('East Road camp approach:', JSON.stringify(approach));
  const scoop = driveToBrazier(duel, step.braziers.find(place => place.id === 'halfway-brazier'));
  assert.ok(scoop.scooped, `the real car stops and scoops at the camp: ${JSON.stringify(scoop)}`);
  assert.equal(scoop.elapsedSeconds, scoop.ticks / 60, 'the scoop records its actual driving time');
  assert.ok(Math.abs(scoop.ember - Math.min(step.ember.start, scoop.emberBeforeScoop - step.ember.coldPerSecond / 60 + 25)) < 1e-8,
    `the scoop adds 25 after cooling, up to the pot's capacity: ${JSON.stringify(scoop)}`);
  console.log('East Road camp scoop:', JSON.stringify(scoop));
  const fifth = driveAlongRoad(duel, ROAD_NET.road('east-road').points, 2500);
  assert.ok(fifth.along >= 2500, `the car passes the camp: ${JSON.stringify(fifth)}`);
  assert.ok(world.job.stepState.burntBarricades.includes(step.barriers[0].id), 'the car burns the camp barricade with its loaned flamethrower');
  assert.ok(fifth.lowestEmber > 0, `the ember stays alight past the camp: ${JSON.stringify(fifth)}`);
  console.log('East Road camp drive:', JSON.stringify(fifth));
  const sixth = driveAlongRoad(duel, ROAD_NET.road('east-road').points, 3000);
  assert.ok(sixth.along >= 3000, `the car follows the East Road for 3 km: ${JSON.stringify(sixth)}`);
  assert.ok(sixth.driven >= 490 && sixth.maxDistance < 20, `the car drives the next stretch close to the road: ${JSON.stringify(sixth)}`);
  assert.ok(sixth.lowestEmber > 0, `the ember stays alight on the next stretch: ${JSON.stringify(sixth)}`);
  console.log('East Road 3 km drive:', JSON.stringify(sixth));
  const seventh = driveAlongRoad(duel, ROAD_NET.road('east-road').points, 3500);
  assert.ok(seventh.along >= 3500, `the car follows the East Road for 3.5 km: ${JSON.stringify(seventh)}`);
  assert.ok(seventh.driven >= 490 && seventh.maxDistance < 20, `the car drives the next stretch close to the road: ${JSON.stringify(seventh)}`);
  assert.ok(seventh.lowestEmber > 0, `the ember stays alight on the next stretch: ${JSON.stringify(seventh)}`);
  console.log('East Road 3.5 km drive:', JSON.stringify(seventh));
  const joltsBeforeBridge = world.job.stepState.joltCount ?? 0;
  const eighth = driveAlongRoad(duel, ROAD_NET.road('east-road').points, 4000);
  assert.ok(eighth.along >= 4000, `the car follows the East Road for 4 km: ${JSON.stringify(eighth)}`);
  assert.ok(eighth.driven >= 490 && eighth.maxDistance < 20, `the car drives the next stretch close to the road: ${JSON.stringify(eighth)}`);
  assert.ok(eighth.elapsedSeconds < 45, `the driver keeps moving until the bridge approach: ${JSON.stringify(eighth)}`);
  assert.ok(eighth.lowestEmber > 0, `the ember stays alight on the next stretch: ${JSON.stringify(eighth)}`);
  assert.deepEqual(eighth.burntDuringDrive, [step.barriers[1].id], 'the real flamethrower burns the bridge barricade on this stretch');
  assert.ok(eighth.jolts.every(jolt => Number.isFinite(jolt.amount) && Number.isFinite(jolt.position.x) && Number.isFinite(jolt.position.z)),
    'the driver records actual jolts and their positions');
  assert.equal(eighth.jolts.length, (world.job.stepState.joltCount ?? 0) - joltsBeforeBridge,
    'the recorded jolts match the real pot state');
  assert.ok(eighth.jolts.every(jolt => Array.isArray(jolt.riders) && jolt.riders.every(rider =>
    typeof rider.id === 'string' && Number.isFinite(rider.distance) && Number.isFinite(rider.heightDifference))),
    'each jolt records the real riders in contact with the car');
  assert.ok(eighth.jolts.some(jolt => jolt.riders.some(rider => rider.distance <= 3.1 && rider.heightDifference < 3)),
    'the recorded bridge jolt has a rider in contact on the same floor');
  assert.ok(Number.isFinite(eighth.peakSpeedPosition.x) && Number.isFinite(eighth.peakSpeedPosition.z), 'the driver records where its peak speed occurred');
  console.log('East Road 4 km drive:', JSON.stringify(eighth));
  const ninth = driveAlongRoad(duel, ROAD_NET.road('east-road').points, 4500, 7200, 50);
  assert.ok(ninth.along >= 4500, `the car follows the East Road for 4.5 km: ${JSON.stringify(ninth)}`);
  assert.ok(ninth.driven >= 490 && ninth.maxDistance < 20, `the car drives the next stretch close to the road: ${JSON.stringify(ninth)}`);
  assert.ok(ninth.lowestEmber > 0, `the ember stays alight on the next stretch: ${JSON.stringify(ninth)}`);
  assert.ok(ninth.fastRoadSpeedTicks / ninth.ticks > 0.8,
    `the car accelerates back to road speed after the bridge: ${JSON.stringify(ninth)}`);
  console.log('East Road 4.5 km drive:', JSON.stringify(ninth));
  const tenth = driveAlongRoad(duel, ROAD_NET.road('east-road').points, 5000, 7200, 50);
  assert.ok(tenth.along >= 5000, `the car follows the East Road for 5 km: ${JSON.stringify(tenth)}`);
  assert.ok(tenth.driven >= 490 && tenth.maxDistance < 20, `the car drives the next stretch close to the road: ${JSON.stringify(tenth)}`);
  assert.ok(tenth.lowestEmber > 0, `the ember stays alight on the next stretch: ${JSON.stringify(tenth)}`);
  assert.deepEqual(tenth.burntDuringDrive, [], 'the driver records that no barricade burned on this stretch');
  console.log('East Road 5 km drive:', JSON.stringify(tenth));
  const eleventh = driveAlongRoad(duel, ROAD_NET.road('east-road').points, 5500, 7200, 50);
  assert.ok(eleventh.along >= 5500, `the car follows the East Road for 5.5 km: ${JSON.stringify(eleventh)}`);
  assert.ok(eleventh.driven >= 490 && eleventh.maxDistance < 20, `the car drives the next stretch close to the road: ${JSON.stringify(eleventh)}`);
  assert.ok(eleventh.fastRoadSpeedTicks / eleventh.ticks > 0.95,
    `the car keeps at least 45 mph on the clear road after the bridge: ${JSON.stringify(eleventh)}`);
  assert.ok(eleventh.lowestEmber > 0, `the ember stays alight on the next stretch: ${JSON.stringify(eleventh)}`);
  assert.ok(eleventh.nearestTownGate < tenth.nearestTownGate, `the car gets closer to Tin Town's gate: ${JSON.stringify(eleventh)}`);
  assert.ok(eleventh.nearestTownGate <= Math.hypot(eleventh.position.x - step.riderSafeWall.x, eleventh.position.z - step.riderSafeWall.z) + 0.01, 'the driver measures the real car position against the town gate');
  console.log('East Road 5.5 km drive:', JSON.stringify(eleventh));

  const approachTown = driveAlongRoad(duel, ROAD_NET.road('east-road').points, 6500, 7200, 50);
  assert.ok(approachTown.along >= 6500, `the car follows the East Road toward Tin Town: ${JSON.stringify(approachTown)}`);
  assert.ok(approachTown.driven >= 990 && approachTown.maxDistance < 20, `the car drives the next kilometre close to the road: ${JSON.stringify(approachTown)}`);
  assert.ok(approachTown.roadSpeedTicks / approachTown.ticks > 0.95,
    `the car stays above 30 mph for at least 95% of the clear kilometre: ${JSON.stringify(approachTown)}`);
  assert.ok(approachTown.fastRoadSpeedTicks / approachTown.ticks > 0.95,
    `the car stays above 45 mph for at least 95% of the clear kilometre`);
  assert.ok(approachTown.lowestEmber > 0, `the ember stays alight on the approach: ${JSON.stringify(approachTown)}`);
  assert.ok(Math.abs(duel.state.speedMph) > 30, 'the driver maintains road speed before the town approach');
  assert.ok(approachTown.nearestTownGate < eleventh.nearestTownGate, 'the car gets closer to the gate');
  console.log('East Road 6.5 km drive:', JSON.stringify(approachTown));

  const nearTown = driveAlongRoad(duel, ROAD_NET.road('east-road').points, 7000, 7200, 50);
  assert.ok(nearTown.along >= 7000, `the car follows the road to 7 km: ${JSON.stringify(nearTown)}`);
  assert.ok(nearTown.driven >= 490 && nearTown.maxDistance < 20, `the car stays on the road: ${JSON.stringify(nearTown)}`);
  assert.ok(nearTown.lowestEmber > 0, `the ember stays alight: ${JSON.stringify(nearTown)}`);
  assert.ok(nearTown.nearestTownGate < approachTown.nearestTownGate, 'the car gets closer to the gate');
  assert.equal(nearTown.speedAtNearestTownGate, Math.abs(duel.state.speedMph), 'the drive records the real speed at its nearest gate position');
  console.log('East Road 7 km drive:', JSON.stringify(nearTown));

  const gateApproach = driveAlongRoad(duel, ROAD_NET.road('east-road').points, 7600, 7200, 50, true);
  assert.ok(gateApproach.along >= 7600, `the car follows the road toward the gate: ${JSON.stringify(gateApproach)}`);
  assert.ok(gateApproach.maxDistance < 20, `the car stays near the road: ${JSON.stringify(gateApproach)}`);
  assert.ok(gateApproach.fastRoadSpeedTicks > 0, 'the car holds road speed before slowing for town');
  assert.ok(gateApproach.nearestTownGate < nearTown.nearestTownGate, 'the car gets closer to the gate');
  assert.ok(gateApproach.lowestEmber > 0, `the ember stays alight on this stretch: ${JSON.stringify(gateApproach)}`);
  console.log('East Road gate approach:', JSON.stringify(gateApproach));
  const gate = driveAlongRoad(duel, ROAD_NET.road('east-road').points, 7750, 7200, 25, true);
  assert.ok(gate.along >= 7750, `the car drives up to the gate: ${JSON.stringify(gate)}`);
  assert.ok(gate.nearestTownGate < 100, `the car reaches the gate: ${JSON.stringify(gate)}`);
  assert.ok(gate.speedAtNearestTownGate * 1.609344 < 30, `the car approaches under 30 km/h: ${JSON.stringify(gate)}`);
  console.log('East Road gate drive:', JSON.stringify(gate));
  const door = driveAlongRoad(duel, ROAD_NET.road('east-road').points, 7810, 7200, 25, true);
  assert.ok(door.along >= 7810, `the car reaches the town entrance: ${JSON.stringify(door)}`);
  assert.equal(world.tinTownGateRequested, true, 'the real slow approach opens the gate');
  assert.equal(world.solidGrid.townGate.length, 0, 'the open gate no longer blocks the car');
  console.log('East Road town entrance:', JSON.stringify(door));
  const joltsBeforeForge = world.job.stepState.joltCount ?? 0;
  const emberBeforeForge = world.job.stepState.ember;
  const scoopsAtForge = [...world.job.stepState.scoopedBraziers];
  const arrival = driveToForge(duel, step.destination.position);
  console.log('East Road forge arrival:', JSON.stringify(arrival));
  const driveTicks = [exit, road, next, further, fourth, approach, scoop, fifth, sixth, seventh, eighth, ninth, tenth, eleventh, approachTown, nearTown, gateApproach, gate, door, arrival].reduce((sum, segment) => sum + segment.ticks, 0);
  console.log('East Road delivery minutes:', driveTicks / 3600);
  assert.ok(driveTicks > 0, 'the delivery time comes from actual driving steps');
  assert.equal(arrival.done, true, `the real car delivers at the forge: ${JSON.stringify(arrival)}`);
  assert.equal(arrival.startEmber, emberBeforeForge, 'the forge drive records its starting ember');
  assert.equal(arrival.jolts.length, arrival.observedJoltCount - joltsBeforeForge,
    'the forge drive records each real jolt');
  assert.ok(arrival.jolts.every(jolt => jolt.amount > 0 && Number.isFinite(jolt.position.x) && Number.isFinite(jolt.position.z)),
    'each forge approach jolt has its amount and position');
  assert.equal(arrival.jolts.length, 0, `the car clears the gate before turning toward the forge: ${JSON.stringify(arrival)}`);
  const measurement = {way:'East Road', kilometres:distanceMetres / 1000, minutes:driveTicks / 3600,
    rams:eighth.jolts.filter(jolt => jolt.riders.length > 0).length,
    scoops:scoopsAtForge, arrival:arrival.fire.ember};
  assert.ok(measurement.kilometres > 7.8 && measurement.minutes > 0);
  assert.equal(measurement.rams, arrival.observedJoltCount, 'the observed rider contact accounts for the recorded hit');
  assert.deepEqual(measurement.scoops, ['halfway-brazier']);
  assert.equal(measurement.arrival, world.forgeFire.ember);
  console.log('East Road measurement:', JSON.stringify(measurement));

}
if (process.env.EVERBURN_ROAD_ONLY === '1') process.exit(0);
// Begin the plates proof from the same real pickup and yard gate as the road drive.
{
  const duel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true, 'story-everburn':true}});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
    cpuDifficulty:'medium', opponents:[], job:{...definition, seed:19}}), true);
  duel.state.countdown = 0;
  assert.ok(driveToCinder(duel, pickup).loaded, 'the plates driver collects the actual pot');
  assert.ok(driveThroughYardGate(duel, yardPlan().gate).along >= 20, 'the plates driver leaves through the gate');
  const way = HOT_DELIVERY_WAYS.find(item => item.id === 'scab-plates');
  const route = routeFor(way.legs, {start:LAND.yard, destination:LAND.at('tin-town')});
  const {first, second} = drivePlatesOpening(duel, route);
  console.log('Plates first 500 m:', JSON.stringify(first));
  assert.ok(first.along >= 500, 'the car reaches 500 m along the plates way');
  assert.ok(first.distance < 10, 'the car joins the plates way after leaving the gate');
  assert.ok(first.lowestEmber > 0, 'the ember stays alight on the first stretch');
  console.log('Plates first kilometre:', JSON.stringify(second));
  assert.ok(second.along >= 1000 && second.maxDistance < 10, 'the car follows the plates way for another 500 m');
  assert.ok(second.lowestEmber > 0, 'the ember stays alight through the first kilometre');
  const third = driveAlongRoad(duel, route, 1500, 7200, 25);
  console.log('Plates 1.5 km:', JSON.stringify(third));
  assert.ok(third.along >= 1500 && third.maxDistance < 10, 'the car follows the plates way for the next 500 m');
  assert.equal(third.jolts.length, duel.state.arena.worldJob.job.stepState.joltCount,
    'the plates drive records each actual jolt');
  assert.equal(third.firstOut === null, third.ember > 0, 'the drive records an outage if one occurred');
  assert.ok(third.longestFurnaceSightSeconds > 6 && duel.state.arena.worldJob.skylineWarned,
    'the existing plates driver records the uninterrupted sighting that sends the riders');
  assert.equal(third.longestFurnaceSight.seconds, third.longestFurnaceSightSeconds,
    'the longest sighting records the real sight timer');
  assert.ok(third.longestFurnaceSight.start.along < third.longestFurnaceSight.end.along,
    'the sighting records where the moving car entered and left the exposed stretch');
  if (process.env.EVERBURN_PLATES_SIGHT_ONLY === '1') process.exit(0);
  assert.ok(third.jolts.some(jolt => jolt.riders.length > 0), 'the drive records riders at a jolt');
  const fourth = driveAlongRoad(duel, route, 2000, 7200, 25);
  console.log('Plates 2 km:', JSON.stringify(fourth));
  assert.ok(fourth.along >= 2000 && fourth.maxDistance < 10, 'the car follows the plates way for a fourth 500 m');
  assert.equal(fourth.ember, duel.state.arena.worldJob.job.stepState.ember,
    'the fourth stretch records the actual ember');
  assert.equal(fourth.beganOut, third.ember <= 0, 'the fourth stretch records its starting ember');
  assert.equal(fourth.firstOut !== null, !fourth.beganOut && fourth.ember <= 0, 'the drive records a new outage');
}
// Compare another legal plates speed using a fresh seeded job and real driving.
{
  const duel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true, 'story-everburn':true}});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
    cpuDifficulty:'medium', opponents:[], job:{...definition, seed:19}}), true);
  duel.state.countdown = 0;
  assert.ok(driveToCinder(duel, pickup).loaded, 'the comparison driver collects the pot');
  const yardExit = driveThroughYardGate(duel, yardPlan().gate);
  assert.ok(yardExit.along >= 20, 'the comparison driver leaves through the gate');
  const way = HOT_DELIVERY_WAYS.find(item => item.id === 'scab-plates');
  const route = routeFor(way.legs, {start:LAND.yard, destination:LAND.at('tin-town')});
  const opening = driveAlongRoad(duel, route, 2000, 18000, 30);
  console.log('Plates 30 mph drive:', JSON.stringify(opening));
  assert.ok(opening.along >= 2000 && opening.distance < 10, 'the comparison car follows the real plates way to 2 km');
  assert.equal(opening.ember, duel.state.arena.worldJob.job.stepState.ember, 'the comparison records the actual ember');
  assert.ok(opening.abovePlatesLimitTicks > 0 && opening.abovePlatesLimitTicks <= opening.ticks,
    'the driver records time above the plates speed limit');
  assert.equal(opening.jolts.length, duel.state.arena.worldJob.job.stepState.joltCount ?? 0,
    'the comparison records each actual jolt');
  const continuation = driveMeasuredStretches(duel, route, [2500, 3000], 30);
  console.log('Plates continuation:', JSON.stringify(continuation));
  assert.equal(continuation.stretches.length, 2, 'the car reaches both measured stretches');
  for (const [index, stretch] of continuation.stretches.entries()) {
    assert.ok(stretch.along >= 2500 + index * 500 && stretch.maxDistance < 10, 'the car follows the plates way');
    assert.equal(stretch.firstOut !== null, !stretch.beganOut && stretch.ember <= 0, 'the stretch records a new outage');
  }
  assert.equal(continuation.stretches.at(-1).ember, duel.state.arena.worldJob.job.stepState.ember, 'the drive records the actual ember');
  assert.equal(continuation.ticks, continuation.stretches.reduce((sum, stretch) => sum + stretch.ticks, 0), 'the drive records actual elapsed ticks');
  // Continue to the town approach even with an extinguished pot, so the
  // failed attempt records the route rather than presenting a partial drive.
  const gate = definition.steps[0].riderSafeWall;
  const gateAlong = nearestOnLine(route, gate.x, gate.z).along;
  const ends = [];
  for (let along = 3500; along < gateAlong - 150; along += 500) ends.push(along);
  ends.push(Math.min(pathLength(route) - 1, gateAlong - 150));
  const remaining = driveMeasuredStretches(duel, route, ends, 30);
  console.log('Plates remaining approach:', JSON.stringify(remaining));
  assert.equal(remaining.reachedAll, true, 'the real car reaches each remaining measured stretch');
  assert.ok(remaining.stretches.every((stretch, index) => stretch.along >= ends[index] && stretch.maxDistance < 30),
    'the real car follows the plates way to the town approach');
  assert.equal(remaining.stretches.at(-1).ember, duel.state.arena.worldJob.job.stepState.ember,
    'the approach records the actual ember');
  // Join the gate's centre line from the outside before turning into town.
  const car = duel.course.worldAt(duel.state.s, duel.state.lateral);
  const gateLine = [{x:car.x, z:car.z},
    {x:gate.x - gate.through.x * 80, z:gate.z - gate.through.z * 80},
    {x:gate.x - gate.through.x * 25, z:gate.z - gate.through.z * 25},
    {x:gate.x + gate.through.x * 15, z:gate.z + gate.through.z * 15}];
  const gateDrive = driveAlongRoad(duel, gateLine, pathLength(gateLine) - 1, 12000, 12, true);
  console.log('Plates gate approach:', JSON.stringify(gateDrive));
  assert.ok(gateDrive.along >= pathLength(gateLine) - 1, 'the plates car passes through the town gate');
  assert.equal(duel.state.arena.worldJob.tinTownGateRequested, true, 'the slow plates approach opens the gate');
  const arrival = driveToForge(duel, definition.steps[0].destination.position);
  console.log('Plates forge arrival:', JSON.stringify(arrival));
  assert.ok(arrival.distance < 5 && Math.abs(arrival.speedMph) < 0.5, 'the plates car stops at the forge');
  const pot = duel.state.arena.worldJob.job.stepState;
  const ember = arrival.done ? arrival.fire.ember : pot.ember;
  assert.equal(arrival.done, ember > 0, 'the forge accepts the pot only while it is lit');
  const stretches = [opening, ...continuation.stretches, ...remaining.stretches, gateDrive];
  const ticks = yardExit.ticks + stretches.reduce((total, stretch) => total + stretch.ticks, 0) + arrival.ticks;
  const measurement = {km:(yardExit.driven + stretches.reduce((total, stretch) => total + stretch.driven, 0) + arrival.driven) / 1000,
    minutes:ticks / 3600, rams:stretches.flatMap(stretch => stretch.jolts).filter(jolt => jolt.riders.length > 0).length,
    scoops:pot.scoopedBraziers || [], arrival:ember};
  assert.equal(measurement.rams, arrival.observedJoltCount, 'rider contacts account for the recorded jolts');
  assert.deepEqual(measurement.scoops, [], 'no brazier was scooped on the plates way');
  console.log('Plates measurement:', JSON.stringify(measurement));

}
if (process.env.EVERBURN_PLATES_ONLY === '1') process.exit(0);
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
  const opening = driveMeasuredStretches(duel, route, [500, 1000, 1500], 28, true);
  console.log('Salt-pan opening:', JSON.stringify(opening));
  assert.equal(opening.reachedAll, true, 'the car reaches each opening stretch on the salt-pan way');
  assert.ok(opening.stretches.every(stretch => stretch.maxDistance < 30), 'the car follows the real way');
  assert.equal(opening.stretches.at(-1).ember, duel.state.arena.worldJob.job.stepState.ember,
    'the drive records the actual pot');
  // Keep the same road speed for the remaining route. Do not tune the
  // driver to produce a particular ember value.
  const townGate = definition.steps[0].riderSafeWall;
  const gateAlong = nearestOnLine(route, townGate.x, townGate.z).along;
  const ends = [];
  for (let along = 2000; along < gateAlong - 150; along += 500) ends.push(along);
  ends.push(Math.min(pathLength(route) - 1, gateAlong - 150));
  const remaining = driveMeasuredStretches(duel, route, ends, 28, true);
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
  assert.ok(measurement.rams <= measurement.jolts, 'rider contacts are counted separately from other jolts');
  assert.ok(remaining.reachedAll && arrival?.done, 'the salt-pan drive reaches and delivers at the forge');
  if (arrival) assert.ok(arrival.distance < 5 && Math.abs(arrival.speedMph) < 0.5, 'an arrival stops at the forge');
  else assert.equal(measurement.arrival, null, 'a stuck drive is not recorded as an arrival');

}
if (process.env.EVERBURN_SALT_ONLY === '1') process.exit(0);

// Measure the bed with and without a Wash scoop from the same seeded start.
for (const scoopAtWash of [true, false]) {
  const duel = new Duel({seed:19, featureFlags:{'hidden-road':true, arsenal:true, 'story-everburn':true}});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:19,
    cpuDifficulty:'medium', opponents:[], job:{...definition, seed:19}}), true);
  duel.state.countdown = 0;
  assert.ok(driveToCinder(duel, pickup).loaded, 'the bed driver collects the pot');
  const exit = driveThroughYardGate(duel, yardPlan().gate);
  assert.ok(exit.along >= 20, 'the bed driver leaves through the yard gate');
  const way = HOT_DELIVERY_WAYS.find(item => item.id === 'river-bed');
  const route = routeFor(way.legs, {start:LAND.yard, destination:LAND.at('tin-town')});
  const wash = step.braziers.find(item => item.id === 'wash-brazier');
  const washAlong = nearestOnLine(route, wash.position.x, wash.position.z).along;
  const beforeWash = [];
  for (let along = 500; along < washAlong - 50; along += 500) beforeWash.push(along);
  beforeWash.push(washAlong - 30);
  const opening = driveMeasuredStretches(duel, route, beforeWash, 28);
  let scoop = null, remaining = null, gateDrive = null, arrival = null;
  if (opening.reachedAll) {
    if (scoopAtWash) scoop = driveToBrazier(duel, wash);
    if (!scoopAtWash || scoop?.scooped) {
      const gate = step.riderSafeWall;
      const gateAlong = nearestOnLine(route, gate.x, gate.z).along;
      const ends = [];
      for (let along = washAlong + 500; along < gateAlong - 150; along += 500) ends.push(along);
      ends.push(Math.min(pathLength(route) - 1, gateAlong - 150));
      remaining = driveMeasuredStretches(duel, route, ends, 28);
      if (remaining.reachedAll) {
        const car = duel.course.worldAt(duel.state.s, duel.state.lateral);
        const gateLine = [{x:car.x, z:car.z},
          {x:gate.x - gate.through.x * 80, z:gate.z - gate.through.z * 80},
          {x:gate.x - gate.through.x * 25, z:gate.z - gate.through.z * 25},
          {x:gate.x + gate.through.x * 15, z:gate.z + gate.through.z * 15}];
        gateDrive = driveAlongRoad(duel, gateLine, pathLength(gateLine) - 1, 12000, 12, true);
        if (gateDrive.along >= pathLength(gateLine) - 1) arrival = driveToForge(duel, step.destination.position);
      }
    }
  }
  const stretches = [...opening.stretches, ...(remaining?.stretches || []), ...(gateDrive ? [gateDrive] : [])];
  const pot = duel.state.arena.worldJob.job.stepState;
  const measurement = {kilometres:(exit.driven + stretches.reduce((sum, item) => sum + item.driven, 0) + (scoop?.driven || 0) + (arrival?.driven || 0)) / 1000,
    minutes:(exit.ticks + stretches.reduce((sum, item) => sum + item.ticks, 0) + (scoop?.ticks || 0) + (arrival?.ticks || 0)) / 3600,
    rams:stretches.flatMap(item => item.jolts).filter(jolt => jolt.riders.length > 0).length,
    scoops:pot.scoopedBraziers || [], arrival:arrival && arrival.distance < 5 && Math.abs(arrival.speedMph) < 0.5 ? pot.ember : null,
    ember:pot.ember, openingReached:opening.reachedAll, scoop, remainingReached:remaining?.reachedAll ?? false,
    last:(remaining?.stretches || opening.stretches).at(-1), forge:arrival};
  console.log(scoopAtWash ? 'Bed measurement:' : 'Bed without scoop measurement:', JSON.stringify(measurement));
  assert.equal(measurement.ember, pot.ember, 'the measurement reads the actual pot');
  assert.ok(opening.reachedAll && (!scoopAtWash || scoop?.scooped) && remaining?.reachedAll, 'the driver follows the bed and scoops when requested');
  if (!scoopAtWash) {
    assert.deepEqual(measurement.scoops, [], 'the driver takes no scoop');
    assert.equal(measurement.arrival, 0, 'the ember is out at the forge without a scoop');
  }
  assert.ok(arrival && arrival.distance < 5 && Math.abs(arrival.speedMph) < 0.5, 'the driver stops at the forge');
  assert.equal(measurement.arrival, pot.ember, 'the arrival records the actual ember even when it is out');
  assert.equal(measurement.rams, arrival.observedJoltCount, 'observed rider contacts account for the actual jolts');
}
if (process.env.EVERBURN_BED_ONLY === '1') process.exit(0);

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
// The real job records the delivered fire and sounds the forge once on arrival.
{
  assert.ok(SOUND_BANK['world.forge.catch']?.layers.length);
  const flameHeights = [];
  for (const [ember, grade] of [[70, 'bright'], [1, 'barely']]) {
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
    assert.equal(world.job.done, true, 'the completed carry no longer mounts the pot');
    syncScene(scene.group, state);
    assert.equal(pot.visible, true, 'the pot leaves the car');
    const from = pot.position.clone();
    animateScene(scene.group, 1);
    assert.equal(pot.visible, true);
    assert.ok(pot.position.distanceTo(from) > .1, 'the pot moves toward the forge');
    assert.ok(pot.position.y > from.y, 'the pot is lifted');
    animateScene(scene.group, 2);
    assert.equal(pot.visible, false, 'the transfer ends at the forge');
    assert.equal(flame.visible, true);
    flameHeights.push(flame.scale.y);
    const forge = LAND.at('tin-town', 25, 10);
    assert.equal(flame.position.x, forge.x);
    assert.equal(flame.position.z, forge.z);
    scene.dispose();
    const catches = events.filter(event => event.arenaTell?.cue === 'world.forge.catch');
    assert.equal(catches.length, 1);
    assert.deepEqual(catches[0].arenaTell.position, bay);
  }
  assert.ok(flameHeights[0] > flameHeights[1], 'a bright delivery catches more strongly and quickly');
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
  assert.ok(Math.abs(ordinaryLoss - 100 / 900) < 1e-9, 'a full pot cools in fifteen minutes on ordinary ground');
  assert.ok(Math.abs(ordinaryLoss - step.ember.coldPerSecond) < 1e-9);
  assert.ok(Math.abs(panLoss / ordinaryLoss - 1.5) < 1e-9, 'the pan cools the pot half as fast again');

  const knowledge = createKnowledge();
  const routes = worldMapWays({worldJob:world, car:normal, target:LAND.at('tin-town')});
  const map = () => waysMarkup(routes, 'Tin Town', knowledge, {hotDelivery:true});
  learnHotDeliveryDangers(knowledge, world, normal);
  assert.doesNotMatch(map(), /wind on the salt pan|Cross the Pipe/i);
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
assert.equal(hud().target.id, 'cold-forge');
// Delivery requires the loaded car to stop in the forge bay; the arrival event carries the actual pay.
{
  const bay = step.destination.position;
  assert.deepEqual({x:bay.x, z:bay.z}, LAND.at('tin-town', 25, 14));
  const grid = createJobSolidGrid();
  assert.equal(pushOutOfSolids(bay.x, bay.z, 2, grid, scablandsSurfaceHeightAt(bay.x, bay.z)).hit, null);
  const ready = () => {
    const delivery = createJob(definition, 19);
    delivery.stepState = {loaded:true, ember:100, triggeredLines:step.sayNear.map(cue => `near:${cue.lineId}`)};
    return delivery;
  };
  assert.equal(stepJob(ready(), view(bay.x + step.radius + .1, bay.z), 0).done, false);
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
}
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
