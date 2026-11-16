import {wrapHeading} from '../src/offroad-physics.js';
import {nearestOnLine, sliceLine} from '../src/world/scablands-ways.js';

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
  let along = -Infinity, gateOffset = null, ticks = 0;
  for (; ticks < maxTicks && along < 20; ticks++) {
    const car = duel.course.worldAt(state.s, state.lateral);
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
  return {along, gateOffset, ticks};
}

// Follow the actual road with a target ahead of the car, rather than moving the car between points.
export function driveAlongRoad(duel, points, endAlong, maxTicks = 7200, targetSpeedMph = 35) {
  const state = duel.state;
  let hit, ticks = 0, maxDistance = 0, driven = 0, peakSpeedMph = 0, peakSpeedPosition, previous;
  let lowestEmber = state.arena.worldJob.job.stepState.ember;
  const townGate = state.arena.worldJob.definition.steps[0].riderSafeWall;
  let nearestTownGate = Infinity;
  const initiallyBurnt = new Set(state.arena.worldJob.job.stepState.burntBarricades || []);
  for (; ticks < maxTicks; ticks++) {
    const car = duel.course.worldAt(state.s, state.lateral);
    if (previous) driven += Math.hypot(car.x - previous.x, car.z - previous.z);
    previous = car;
    if (Math.abs(state.speedMph) > peakSpeedMph) {
      peakSpeedMph = Math.abs(state.speedMph);
      peakSpeedPosition = {x:car.x, z:car.z};
    }
    lowestEmber = Math.min(lowestEmber, state.arena.worldJob.job.stepState.ember);
    nearestTownGate = Math.min(nearestTownGate, Math.hypot(car.x - townGate.x, car.z - townGate.z));
    hit = nearestOnLine(points, car.x, car.z);
    maxDistance = Math.max(maxDistance, hit.distance);
    if (hit.along >= endAlong) break;
    const target = sliceLine(points, hit.along, hit.along + 45).at(-1);
    const turn = wrapHeading(Math.atan2(target.x - car.x, target.z - car.z) - (car.heading + state.headingError));
    // The East Road is blocked at the camp and bridge. Use the loaned weapon
    // when a live barricade is in front of the car and within flame range.
    const step = state.arena.worldJob.definition.steps[0];
    const burnt = state.arena.worldJob.job.stepState.burntBarricades || [];
    for (const barrier of step.barriers || []) {
      if (burnt.includes(barrier.id)) continue;
      const dx = barrier.position.x - car.x, dz = barrier.position.z - car.z;
      const angle = wrapHeading(Math.atan2(dx, dz) - (car.heading + state.headingError));
      if (Math.hypot(dx, dz) < 18 && Math.abs(angle) < Math.PI / 12) duel.fireWeapon('flamethrower');
    }
    duel.setInput({throttle:Math.abs(state.speedMph) < targetSpeedMph ? 0.8 : 0,
      brake:Math.abs(state.speedMph) > targetSpeedMph + 3 ? 1 : 0,
      steer:Math.max(-1, Math.min(1, -turn * 2))});
    duel.step(1 / 60);
  }
  return {along:hit.along, distance:hit.distance, maxDistance, driven, peakSpeedMph, peakSpeedPosition,
    ember:state.arena.worldJob.job.stepState.ember, lowestEmber, nearestTownGate, elapsedSeconds:ticks / 60,
    position:{x:previous.x, z:previous.z},
    burntDuringDrive:(state.arena.worldJob.job.stepState.burntBarricades || []).filter(id => !initiallyBurnt.has(id)), ticks};
}

// Approach a camp fire, stop nearby and wait for the real scoop rule.
export function driveToBrazier(duel, brazier, maxTicks = 3600) {
  const state = duel.state, world = state.arena.worldJob;
  let distance = Infinity, ticks = 0, stopping = false, scoopGain = 0;
  for (; ticks < maxTicks && !(world.job.stepState.scoopedBraziers || []).includes(brazier.id); ticks++) {
    const car = duel.course.worldAt(state.s, state.lateral);
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
    if ((world.job.stepState.scoopedBraziers || []).includes(brazier.id)) scoopGain = world.job.stepState.ember - emberBefore;
  }
  return {distance, ticks, scoopGain, ember:world.job.stepState.ember, scooped:(world.job.stepState.scoopedBraziers || []).includes(brazier.id)};
}
