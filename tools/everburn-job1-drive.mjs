import {wrapHeading} from '../src/offroad-physics.js';
import {nearestOnLine, sliceLine} from '../src/world/scablands-ways.js';
import {LAND} from '../src/world/scablands-names.js';

// Keep gaps outside the watcher's range separate from open ground: they cannot
// prove that the car comes back into view between two places of cover.
export function sightStretches(samples, classify) {
  const stretches = [];
  for (const point of samples) {
    const visibility = classify(point);
    let stretch = stretches.at(-1);
    if (!stretch || stretch.visibility !== visibility) {
      stretches.push(stretch = {visibility, from:point.along, to:point.along});
    }
    stretch.to = point.along;
  }
  return stretches;
}

export function coverStretches(samples, classify) {
  const stretches = sightStretches(samples, classify);
  return stretches.filter((stretch, index) => stretch.visibility === 'hidden' &&
    stretch.to - stretch.from >= 150 && stretches[index - 1]?.visibility === 'open' &&
    stretches[index - 1].to - stretches[index - 1].from >= 100 &&
    stretches[index + 1]?.visibility === 'open' &&
    stretches[index + 1].to - stretches[index + 1].from >= 100);
}

// Find consecutive covered stretches separated by visible ground. Range gaps
// cannot serve as separation, but the first and last cover may meet the range edge.
export function separatedCover(samples, classify) {
  const runs = sightStretches(samples, classify);
  let best = [], current = [];
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    if (run.visibility !== 'hidden' || run.to - run.from < 150) continue;
    const gap = runs[i - 1];
    if (!current.length || gap?.visibility !== 'open' || gap.to - gap.from < 100 || runs[i - 2] !== current.at(-1)) {
      current = [run];
    } else {
      current.push(run);
    }
    if (current.length > best.length) best = [...current];
  }
  return best;
}

// Drive from the job's real starting position to Cinder and wait for the pot.
// This is the shared opening for the six Medium proof drives.
export function driveToCinder(duel, cinder, maxTicks = 1800) {
  const state = duel.state, world = state.arena.worldJob;
  let distance = Infinity, ticks = 0;
  for (; ticks < maxTicks && !world.job.stepState.loaded; ticks++) {
    const car = duel.course.worldAt(state.s, state.lateral);
    distance = Math.hypot(car.x - cinder.x, car.z - cinder.z);
    const turn = wrapHeading(Math.atan2(cinder.x - car.x, cinder.z - car.z) - (car.heading + state.headingError));
    duel.setInput({throttle:distance > 6 && Math.abs(state.speedMph) < 8 ? 0.5 : 0,
      brake:distance <= 6 || Math.abs(state.speedMph) > 10 ? 1 : 0,
      steer:Math.max(-1, Math.min(1, -turn * 2))});
    duel.step(1 / 60);
  }
  return {distance, ticks, loaded:world.job.stepState.loaded === true};
}

// Leave along the gate's centre line after picking up the pot.
export function driveThroughYardGate(duel, gate, maxTicks = 1800) {
  const state = duel.state;
  const forward = {x:Math.sin(gate.bearing), z:Math.cos(gate.bearing)};
  const target = {x:gate.x + forward.x * 45, z:gate.z + forward.z * 45};
  let along = -Infinity, gateOffset = null, ticks = 0, driven = 0, previous;
  for (; ticks < maxTicks && along < 20; ticks++) {
    const car = duel.course.worldAt(state.s, state.lateral);
    if (previous) driven += Math.hypot(car.x - previous.x, car.z - previous.z);
    previous = car;
    along = (car.x - gate.x) * forward.x + (car.z - gate.z) * forward.z;
    if (along >= 0 && gateOffset === null) {
      gateOffset = (car.x - gate.x) * forward.z - (car.z - gate.z) * forward.x;
    }
    const turn = wrapHeading(Math.atan2(target.x - car.x, target.z - car.z) - (car.heading + state.headingError));
    const speed = along < 0 ? 4 : 12;
    duel.setInput({throttle:Math.abs(state.speedMph) < speed ? 0.55 : 0,
      brake:Math.abs(state.speedMph) > speed + 1 ? 1 : 0,
      steer:Math.max(-1, Math.min(1, -turn * 2))});
    duel.step(1 / 60);
  }
  return {along, gateOffset, ticks, driven};
}

// Follow the actual road with a target ahead of the car, rather than moving the car between points.
export function driveAlongRoad(duel, points, endAlong, maxTicks = 7200, targetSpeedMph = 35, gateApproach = false, crossPipe = false) {
  const state = duel.state;
  let hit, ticks = 0, maxDistance = 0, driven = 0, peakSpeedMph = 0, peakSpeedPosition, previous;
  let roadSpeedTicks = 0, fastRoadSpeedTicks = 0, abovePlatesLimitTicks = 0;
  let longestFurnaceSightSeconds = state.arena.worldJob.skylineSight?.seconds ?? 0;
  let sightStart = null, longestFurnaceSight = null;
  let pipePeakSpeedMph = 0;
  let lowestEmber = state.arena.worldJob.job.stepState.ember;
  const beganOut = lowestEmber <= 0;
  let firstOut = null;
  const jolts = [];
  let lastJoltCount = state.arena.worldJob.job.stepState.joltCount ?? 0;
  const townGate = state.arena.worldJob.definition.steps[0].riderSafeWall;
  let nearestTownGate = Infinity, speedAtNearestTownGate = 0;
  const initiallyBurnt = new Set(state.arena.worldJob.job.stepState.burntBarricades || []);
  for (; ticks < maxTicks; ticks++) {
    const car = duel.course.worldAt(state.s, state.lateral);
    const pipe = LAND.at('the-pipe');
    if (crossPipe && Math.hypot(car.x - pipe.x, car.z - pipe.z) < 85) {
      pipePeakSpeedMph = Math.max(pipePeakSpeedMph, Math.abs(state.speedMph));
    }
    if (Math.abs(state.speedMph) >= 30) roadSpeedTicks++;
    if (Math.abs(state.speedMph) >= 45) fastRoadSpeedTicks++;
    if (Math.abs(state.speedMph) * 1.609344 > 50) abovePlatesLimitTicks++;
    if (previous) driven += Math.hypot(car.x - previous.x, car.z - previous.z);
    previous = car;
    if (Math.abs(state.speedMph) > peakSpeedMph) {
      peakSpeedMph = Math.abs(state.speedMph);
      peakSpeedPosition = {x:car.x, z:car.z};
    }
    lowestEmber = Math.min(lowestEmber, state.arena.worldJob.job.stepState.ember);
    if (!beganOut && firstOut === null && state.arena.worldJob.job.stepState.ember <= 0) {
      firstOut = {along:nearestOnLine(points, car.x, car.z).along, ticks, position:{x:car.x, z:car.z}};
    }
    const pot = state.arena.worldJob.job.stepState;
    if ((pot.joltCount ?? 0) > lastJoltCount) {
      const riders = state.arena.worldJob.actors.filter(actor => actor.ramContact).map(actor => ({
        id:actor.id, distance:Math.hypot(car.x - actor.position.x, car.z - actor.position.z),
        heightDifference:Math.abs(car.y - actor.position.y),
      }));
      jolts.push({amount:pot.jolt, position:{x:car.x, z:car.z}, speedMph:Math.abs(state.speedMph), riders});
      lastJoltCount = pot.joltCount;
    }
    const gateDistance = Math.hypot(car.x - townGate.x, car.z - townGate.z);
    if (gateDistance < nearestTownGate) {
      nearestTownGate = gateDistance;
      speedAtNearestTownGate = Math.abs(state.speedMph);
    }
    hit = nearestOnLine(points, car.x, car.z);
    maxDistance = Math.max(maxDistance, hit.distance);
    if (hit.along >= endAlong) break;
    const target = sliceLine(points, hit.along, hit.along + 45).at(-1);
    const turn = wrapHeading(Math.atan2(target.x - car.x, target.z - car.z) - (car.heading + state.headingError));
    // The East Road is blocked at the camp and bridge. Use the loaned weapon
    // when a live barricade is in front of the car and within flame range.
    const step = state.arena.worldJob.definition.steps[0];
    const burnt = state.arena.worldJob.job.stepState.burntBarricades || [];
    let barrierDistance = Infinity, barrierLimit = 140;
    for (const barrier of step.barriers || []) {
      if (burnt.includes(barrier.id)) continue;
      const dx = barrier.position.x - car.x, dz = barrier.position.z - car.z;
      const angle = wrapHeading(Math.atan2(dx, dz) - (car.heading + state.headingError));
      if (Math.abs(angle) < Math.PI / 6 && Math.hypot(dx, dz) < barrierDistance) {
        barrierDistance = Math.hypot(dx, dz);
        barrierLimit = barrier.id === 'ash-men-barricade-2' ? 45 : 140;
      }
      if (Math.hypot(dx, dz) < 18 && Math.abs(angle) < Math.PI / 12) duel.fireWeapon('flamethrower');
    }
    // Keep road speed until the final approach, then prepare for the slow gate.
    const pipeLimit = crossPipe && Math.hypot(car.x - pipe.x, car.z - pipe.z) < 180 ? 20 : targetSpeedMph;
    const approachLimit = barrierDistance < barrierLimit ? 8 : Math.min(targetSpeedMph, pipeLimit);
    const speedLimit = gateApproach && gateDistance < 200 ? Math.min(approachLimit, 16) : approachLimit;
    duel.setInput({throttle:Math.abs(state.speedMph) < speedLimit ? 0.8 : 0,
      brake:Math.abs(state.speedMph) > speedLimit + 3 ? 1 : 0,
      steer:Math.max(-1, Math.min(1, -turn * 2))});
    duel.step(1 / 60);
    const sightSeconds = state.arena.worldJob.skylineSight?.seconds ?? 0;
    if (sightSeconds > 0 && !sightStart) sightStart = {along:hit.along, x:car.x, z:car.z};
    if (sightSeconds === 0) sightStart = null;
    if (sightSeconds > longestFurnaceSightSeconds) {
      longestFurnaceSightSeconds = sightSeconds;
      longestFurnaceSight = {start:sightStart, end:{along:hit.along, x:car.x, z:car.z}, seconds:sightSeconds};
    }
  }
  return {along:hit.along, distance:hit.distance, maxDistance, driven, peakSpeedMph, peakSpeedPosition,
    ember:state.arena.worldJob.job.stepState.ember, lowestEmber, nearestTownGate, speedAtNearestTownGate, elapsedSeconds:ticks / 60,
    position:{x:previous.x, z:previous.z}, roadSpeedTicks, fastRoadSpeedTicks, abovePlatesLimitTicks, pipePeakSpeedMph, jolts, beganOut, firstOut,
    burntDuringDrive:(state.arena.worldJob.job.stepState.burntBarricades || []).filter(id => !initiallyBurnt.has(id)),
    longestFurnaceSightSeconds, longestFurnaceSight, ticks};
}

// The plates have a 50 km/h rough-ground threshold. Keep the opening below it
// and return the actual car and ember measurements for each stretch.
export function drivePlatesOpening(duel, route) {
  const first = driveAlongRoad(duel, route, 500, 7200, 25);
  const second = driveAlongRoad(duel, route, 1000, 7200, 25);
  return {first, second};
}

// Continue a measured route in short stretches so a stuck car cannot be
// mistaken for an arrival. All times and ember values come from the drive.
export function driveMeasuredStretches(duel, route, ends, targetSpeedMph, crossPipe = false) {
  const stretches = [];
  for (const end of ends) {
    const stretch = driveAlongRoad(duel, route, end, 7200, targetSpeedMph, false, crossPipe);
    stretches.push(stretch);
    if (stretch.along < end) break;
  }
  return {stretches, ticks:stretches.reduce((total, stretch) => total + stretch.ticks, 0),
    reachedAll:stretches.length === ends.length && stretches.every((stretch, index) => stretch.along >= ends[index])};
}

// Approach a camp fire, stop nearby and wait for the real scoop rule.
export function driveToBrazier(duel, brazier, maxTicks = 3600) {
  const state = duel.state, world = state.arena.worldJob;
  let distance = Infinity, ticks = 0, stopping = false, scoopGain = 0, emberBeforeScoop = null, driven = 0, previous;
  for (; ticks < maxTicks && !(world.job.stepState.scoopedBraziers || []).includes(brazier.id); ticks++) {
    const car = duel.course.worldAt(state.s, state.lateral);
    if (previous) driven += Math.hypot(car.x - previous.x, car.z - previous.z);
    previous = car;
    distance = Math.hypot(car.x - brazier.position.x, car.z - brazier.position.z);
    const turn = wrapHeading(Math.atan2(brazier.position.x - car.x, brazier.position.z - car.z) - (car.heading + state.headingError));
    const barriers = state.arena.worldJob.definition.steps[0].barriers || [];
    for (const barrier of barriers) {
      const dx = barrier.position.x - car.x, dz = barrier.position.z - car.z;
      const angle = wrapHeading(Math.atan2(dx, dz) - (car.heading + state.headingError));
      if (!(world.job.stepState.burntBarricades || []).includes(barrier.id) && Math.hypot(dx, dz) < 18 && Math.abs(angle) < Math.PI / 12) duel.fireWeapon('flamethrower');
    }
    const speed = Math.abs(state.speedMph);
    if (distance < 7) stopping = true;
    const targetSpeed = stopping ? 0 : distance > 25 ? 15 : 5;
    duel.setInput({throttle:speed < targetSpeed ? 0.5 : 0,
      brake:speed > targetSpeed + 1 ? 1 : 0,
      steer:Math.max(-1, Math.min(1, -turn * 2))});
    const emberBefore = world.job.stepState.ember;
    duel.step(1 / 60);
    if ((world.job.stepState.scoopedBraziers || []).includes(brazier.id)) {
      emberBeforeScoop = emberBefore;
      scoopGain = world.job.stepState.ember - emberBefore;
    }
  }
  return {distance, ticks, driven, elapsedSeconds:ticks / 60, emberBeforeScoop, scoopGain, ember:world.job.stepState.ember, scooped:(world.job.stepState.scoopedBraziers || []).includes(brazier.id)};
}

// Drive into the forge bay and stop; the job itself decides whether delivery succeeds.
export function driveToForge(duel, destination, maxTicks = 3600) {
  const state = duel.state, world = state.arena.worldJob;
  const gate = world.definition.steps[0].riderSafeWall;
  const throughGate = {x:gate.x + gate.through.x * 15, z:gate.z + gate.through.z * 15};
  let clearedGate = false;
  let ticks = 0, distance = Infinity, stopping = false, driven = 0, previous;
  let lastJoltCount = world.job.stepState.joltCount ?? 0;
  const jolts = [], startEmber = world.job.stepState.ember;
  for (; ticks < maxTicks && !world.job.done; ticks++) {
    const car = duel.course.worldAt(state.s, state.lateral);
    if (previous) driven += Math.hypot(car.x - previous.x, car.z - previous.z);
    previous = car;
    distance = Math.hypot(destination.x - car.x, destination.z - car.z);
    if (world.job.stepState.ember <= 0 && distance < 5 && Math.abs(state.speedMph) < 0.5) break;
    const pastGate = (car.x - gate.x) * gate.through.x + (car.z - gate.z) * gate.through.z;
    if (pastGate >= 12) clearedGate = true;
    const target = clearedGate ? destination : throughGate;
    const turn = wrapHeading(Math.atan2(target.x - car.x, target.z - car.z) - (car.heading + state.headingError));
    if (distance < 5) stopping = true;
    const speed = Math.abs(state.speedMph);
    const limit = stopping ? 0 : distance > 20 ? 10 : 5;
    duel.setInput({throttle:speed < limit ? 0.5 : 0, brake:speed > limit + 0.2 ? 1 : 0,
      steer:Math.max(-1, Math.min(1, -turn * 2))});
    duel.step(1 / 60);
    const pot = world.job.stepState;
    if ((pot.joltCount ?? 0) > lastJoltCount) {
      const at = duel.course.worldAt(state.s, state.lateral);
      jolts.push({amount:pot.jolt, position:{x:at.x, z:at.z}, speedMph:Math.abs(state.speedMph)});
      lastJoltCount = pot.joltCount;
    }
  }
  const car = duel.course.worldAt(state.s, state.lateral);
  if (previous) driven += Math.hypot(car.x - previous.x, car.z - previous.z);
  return {ticks, driven, distance:Math.hypot(destination.x - car.x, destination.z - car.z),
    speedMph:state.speedMph, done:world.job.done, fire:world.forgeFire, startEmber, jolts, observedJoltCount:lastJoltCount,
    position:{x:car.x, z:car.z}};
}
