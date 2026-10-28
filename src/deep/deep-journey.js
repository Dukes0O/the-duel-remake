// Journey architecture only. Real content providers are installed by DEEP-TRAIL.
import { SEA_LEVEL } from '../coastal-water.js';
import { buildDeepRamp, rampGrade, rampOpening, rampClearsScenery } from './deep-ramp.js';
import { defineZone } from './deep-zone.js';
import { createZoneFloor, ZONE_SPAN, ZONE_EDGE } from './zone-floor.js';
import { createZoneFrame } from './zone-frame.js'; // DEEP-TRAIL-JOINTS
// DEEP-EXPLORER
import {deepRocks, driveIntoDeepRocks} from './deep-rocks.js';
import {flushDeepChart} from './deep-story.js';

const NEUTRAL = Object.freeze({ throttle: 0, brake: 0, steer: 0, boost: false, shiftUp: false, shiftDown: false, interact: false });
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const normalMode = mode => mode === 'duel' || mode === 'timetrial';
const qualifying = state => state.qualifying && state.qualifying.phase !== 'complete';
export const surfaceLocalPoint = point => ({ ...point, y: point.y - SEA_LEVEL });

export function copyDeepProviders(providers = []) {
  if (!Array.isArray(providers) || providers.some(provider => typeof provider !== 'function'))
    throw new TypeError('Deep providers must be an array of functions.');
  return Object.freeze([...providers]);
}
export function installDeepCourse(course, { providers = [], enabled = false, kit = false, mode, found = [], qualifying: isQualifying = false } = {}) {
  if (!enabled || !kit || !providers.length || course.def.id !== 'pacific-canyon' ||
      course.def.practice || isQualifying || (!normalMode(mode) && mode !== 'grandprix')) return;
  if (mode === 'grandprix' && !found.length) return;
  try {
    const ramp = buildDeepRamp(course);
    if (!ramp) throw new Error('No clear physical Pacific Deep ramp is available.');
    const route = Object.freeze({ courseId: course.def.id, seed: course.seed });
    for (const provider of providers) {
      const supplied = provider(ramp, route);
      if (supplied == null) continue;
      const zone = defineZone(supplied), first = zone.trail[0], end = ramp.points.at(-1);
      if (zone.circuit !== course.def.id || zone.ramp.side !== ramp.side ||
          Math.abs(zone.ramp.atDistance - ramp.atDistance) > 1e-6 || zone.ramp.length !== 120 ||
          zone.ramp.endDepth !== 8 || Math.hypot(first.x - end.x, first.z - end.z) > 1e-6 || first.depth !== 8)
        throw new Error('Deep provider must match the resolved ramp and its bottom in this route frame.');
      if (mode === 'grandprix' && !found.includes(zone.id)) continue;
      const original={obstaclesNear:course.obstaclesNear,surfaceAt:course.surfaceAt,groundAt:course.groundAt,gripKindAt:course.gripKindAt};
      Object.defineProperties(course, {
        // DEEP-RAMP-2: the drawn opening and collision opening share one predicate.
        obstaclesNear:{configurable:true,value:function(...args){
          return original.obstaclesNear.apply(this,args).filter(obstacle => !rampOpening(this,obstacle) && !(['tree','rock'].includes(obstacle.kind) && rampClearsScenery(this,obstacle)));
        }},
        surfaceAt:{configurable:true,value:function(distance,lateral=0){
          const rampPoint=deepRampGround(this,distance,lateral);
          return rampPoint?{road:true,mainRoad:false,shortcutId:'deep-ramp',roadHalfWidth:this.roadHalfWidthAt(distance),deepRamp:true}:original.surfaceAt.call(this,distance,lateral);
        }},
        groundAt:{configurable:true,value:function(distance,lateral=0){
          // DEEP-RAMP-2: grade the apron as well as the full deck.
          const point = original.groundAt.call(this, distance, lateral);
          return { ...point, y: rampGrade(this.deepRamp, point, point.y) };
        }},
        gripKindAt:{configurable:true,value:function(distance,lateral=0){
          const rampPoint=deepRampGround(this,distance,lateral);
          return rampPoint&&rampPoint.progress>=this.deepRamp.shoreline.center.progress?'sea-floor':original.gripKindAt.call(this,distance,lateral);
        }},
        // DEEP-RAMP-2: render source planes before grading, so outside triangles stay exact.
        deepNaturalGroundAt: { value: original.groundAt, configurable: true },
        deepNaturalSurfaceAt: { value: original.surfaceAt, configurable: true },
        deepRamp: { value: ramp, configurable: true },
        deepZone: { value: Object.freeze({ zone, floor: createZoneFloor(zone) }), configurable: true },
      });
      return;
    }
  } catch (error) {
    // Fail closed and expose the actual content error; no substitute location.
    Object.defineProperty(course, 'deepProviderProblem', { value: String(error?.message ?? error), configurable: true });
  }
}
export function rampAt(ramp, progress, lateral = 0) {
  progress = clamp(progress, 0, ramp.length);
  for (let i = 1; i < ramp.points.length; i++) {
    const a = ramp.points[i - 1], b = ramp.points[i];
    if (progress > b.progress && i < ramp.points.length - 1) continue;
    const t = (progress - a.progress) / (b.progress - a.progress);
    return { x: a.x + (b.x - a.x) * t + Math.cos(ramp.heading) * lateral,
      y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t - Math.sin(ramp.heading) * lateral,
      heading: ramp.heading, progress, lateral };
  }
}
function rampNear(ramp, point) {
  const first = ramp.points[0], last = ramp.points.at(-1), dx = point.x - first.x, dz = point.z - first.z;
  const horizontal = dx * Math.sin(ramp.heading) + dz * Math.cos(ramp.heading);
  const lateral = dx * Math.cos(ramp.heading) - dz * Math.sin(ramp.heading);
  if (![horizontal, lateral].every(Number.isFinite) || horizontal < -1e-6 ||
      horizontal > last.horizontal + 1e-6 || Math.abs(lateral) > ramp.width / 2) return null;
  for (let i = 1; i < ramp.points.length; i++) {
    const a = ramp.points[i - 1], b = ramp.points[i];
    if (horizontal > b.horizontal && i < ramp.points.length - 1) continue;
    const progress = a.progress + (b.progress - a.progress) * (horizontal - a.horizontal) / (b.horizontal - a.horizontal);
    return rampAt(ramp, progress, lateral);
  }
}
export function deepRampGround(course, distance, lateral) {
  if (!course.deepRamp) return null;
  return rampNear(course.deepRamp, course.worldAt(distance, lateral));
}
function admitted(duel) {
  const runtime = duel.deepRuntime, state = duel.state;
  return !!runtime && duel.featureFlags.enabled('the-deep') === true && duel._deepKit === true &&
    !state.arena && !state.onFoot && !state.combat && !runtime.raceCourse.def.practice && !state.objective && !qualifying(state) &&
    (normalMode(state.mode) || state.mode === 'grandprix' && duel._deepFound.includes(runtime.zone.id));
}
export function deepProtected(duel) {
  if (!admitted(duel) || ![duel.state.s, duel.state.lateral].every(Number.isFinite)) return false;
  const point = duel.course.worldAt(duel.state.s, duel.state.lateral);
  if (![point.x, point.y, point.z].every(Number.isFinite)||
      duel.state.groundHeight!=null&&!Number.isFinite(duel.state.groundHeight)||
      duel.state.airHeight!=null&&!Number.isFinite(duel.state.airHeight)) return false;
  const runtime = duel.deepRuntime;
  if (duel.course === runtime.zoneCourse) {
    const at = runtime.floor.sample(point.x, point.z), bounds = runtime.floor.bounds;
    return !!at && at.distance <= ZONE_SPAN && point.x >= bounds.minX && point.x <= bounds.maxX &&
      point.z >= bounds.minZ && point.z <= bounds.maxZ;
  }
  return !!rampNear(runtime.ramp, point);
}
// The nearest point to (x, z) that has sea floor under it, kept ZONE_EDGE metres
// from the trail at the farthest. A point already inside is returned as it is.
// With no ground near the point at all, it is drawn back towards the car's last
// place along the trail (the car never moves more than a fraction of a metre in a
// step, so this only matters to a caller that asks about a faraway point).
function holdInsideGround(floor, x, z, reference) {
  const at = floor.sample(x, z);
  if (at && at.distance <= ZONE_EDGE) return { x, z, edge: false };
  const trail = at ? floor.frameAt(at.along) : Number.isFinite(reference) ? floor.frameAt(reference) : null;
  if (!trail) return { x, z, edge: false };
  const dx = x - trail.x, dz = z - trail.z, out = Math.hypot(dx, dz);
  if (!(out > 0)) return { x, z, edge: false };
  const keep = Math.min(ZONE_EDGE, at ? at.distance : ZONE_EDGE) / out;
  return { x: trail.x + dx * keep, z: trail.z + dz * keep, edge: true };
}function zoneCourse(runtime) {
  const floor = runtime.floor, empty = [];
  // DEEP-TRAIL-JOINTS: a frame whose world position has no jump at the trail's joints.
  const frame = createZoneFrame(floor, runtime.zone.trail);
  const phase = value => ((value % floor.length) + floor.length) % floor.length;
  const at = distance => {
    const centre = frame.centre(distance);
    return { x: centre.x, y: SEA_LEVEL + floor.trailHeight(distance), z: centre.z,
      heading: frame.heading(distance), curvature: 0, s: distance };
  };
  const worldAt = (distance, lateral = 0) => {
    const point = frame.worldAt(distance, lateral);
    return { ...point, y: SEA_LEVEL + floor.floorHeight(point.x, point.z), heading: frame.heading(distance) };
  };
  return { def: Object.freeze({ id: runtime.zone.id, kind: 'deep', theme: 'coast', airborne: true, closed: true }),
    length: floor.length, raceLength: floor.length, seed: runtime.raceCourse.seed, closed: true,
    features: { obstacles: empty, mountains: empty, shortcuts: empty, ramps: empty }, phase, at, worldAt, groundAt: worldAt,
    // DEEP-SHALLOWS-FIX: the ground ends 90 m from the trail. A car driven past
    // that is held at the nearest point inside it (never sent anywhere else) and
    // the run notes that it pressed against the edge, so the car can slow and the
    // screen can say so.
    nearest(x, z, reference) {
      const held = holdInsideGround(floor, x, z, reference);
      if (held.edge) runtime.edgeHit = true;
      const found = frame.nearest(held.x, held.z, reference);
      if (!found) return { s: NaN, lateral: NaN, distance: Infinity };
      return { ...at(found.s), s: found.s, lateral: found.lateral, distance: found.distance };
    },
    roadHalfWidthAt(distance) { const frame = floor.frameAt(distance); return floor.sample(frame.x, frame.z).width / 2; },
    surfaceAt(distance, lateral) { return { road: true, mainRoad: true, shortcutId: null,
      roadHalfWidth: this.roadHalfWidthAt(distance) }; },
    gripKindAt: () => 'sea-floor', obstaclesNear: () => [], rocksNear: () => [],
    themeAt: () => 'coast', tunnelAt: () => null, sectionAt: () => ({ theme: 'coast' }),
  };
}
export function clearDeepJourney(duel) {
  flushDeepChart(duel); // DEEP-EXPLORER: keep the last stretch when leaving by menu
  if (duel.deepRuntime && duel.course === duel.deepRuntime.zoneCourse) duel.course = duel.deepRuntime.raceCourse;
  delete duel.state.deepJourney;
  duel.deepRuntime = null;
}
export function initializeDeepJourney(duel) {
  const resolved = duel.course.deepZone;
  if (!resolved) { duel.deepRuntime = null; return; }
  duel.deepRuntime = { ...resolved, ramp: duel.course.deepRamp, raceCourse: duel.course, zoneCourse: null };
  duel.deepRuntime.rocks = []; // DEEP-ROCKS-PUSH: the run's own rocks are laid out when the dive starts
}
function changePhase(duel, phase) {
  const journey = duel.state.deepJourney;
  journey.phase = phase;
  journey.controlsLocked = phase === 'choice' || phase === 'diving';
  if (journey.controlsLocked || phase === 'turn-back') duel.setInput(NEUTRAL);
  duel.emit({ deepPhase: { journeyId: journey.id, phase } });
}
export function checkDeepDeparture(duel) {
  if (duel.state.status !== 'racing' || !deepProtected(duel) || duel.state.impactTimer > 0 || duel.state.tumble) return false;
  const runtime = duel.deepRuntime, near = rampNear(runtime.ramp, duel.course.worldAt(duel.state.s, duel.state.lateral));
  if (!near || near.progress < runtime.ramp.shoreline.center.progress) return false;
  duel._deepSerial = (duel._deepSerial || 0) + 1;
  duel.state.deepJourney = { id: duel._deepSerial, zoneId: runtime.zone.id, phase: 'choice', progress: near.progress,
    controlsLocked: true, committed: false, elapsedSec: 0, _choice: null };
  duel.state.status = 'exploring'; duel.state.speedMph = 0; duel.state.boosting = false;duel.state.groundHeight=near.y;
  duel.setInput(NEUTRAL);
  duel._callout('RACE PAUSED · DIVE OR TURN BACK', 3.5);
  changePhase(duel, 'choice');
  return true;
}
export function queueDeepChoice(duel, choice) {
  const journey = duel.state.deepJourney;
  if (!admitted(duel) || duel.state.paused || journey?.phase !== 'choice' || journey._choice ||
      !['dive', 'turn-back'].includes(choice)) return false;
  journey._choice = choice;
  return true;
}
function placeRamp(duel, progress) {
  const state = duel.state, runtime = duel.deepRuntime, point = rampAt(runtime.ramp, progress);
  const near = runtime.raceCourse.nearest(point.x, point.z, state.s);
  state.prevS = state.s; state.prevLateral = state.lateral;
  state.s = near.s; state.lateral = near.lateral; state.groundHeight = point.y;
  // DEEP-RAMP-2: ease from the straight deck into the preserved offshore trail direction during the locked dive.
  const turn = clamp((progress - runtime.ramp.shoreline.center.progress) /
    (runtime.ramp.length - runtime.ramp.shoreline.center.progress), 0, 1);
  const heading = point.heading + wrap((runtime.ramp.diveHeading ?? point.heading) - point.heading) * turn * turn * (3 - 2 * turn);
  state.headingError = wrap(heading - runtime.raceCourse.at(state.s).heading);
  state.airborne = false; state.airHeight = state.prevAirHeight = 0; state._jumpY = null;
  state.speedMph = 0; state.yawVelocity = state.pushVelocity = state.slipAngle = 0; if (Object.hasOwn(state, 'tyreSlip')) state.tyreSlip = 0;
  state.terrainPitch = state.terrainRoll = null; duel._terrainPose(); // DEEP-RAMP-2
  state.deepJourney.progress = progress;
}
function exit(duel) {
  flushDeepChart(duel); // DEEP-EXPLORER
  const journey = duel.state.deepJourney;
  duel.emit({ deepExited: { zoneId: journey.zoneId }, deepReturn: { journeyId: journey.id } });
  clearDeepJourney(duel);
  duel.state.status = 'menu'; duel.state.paused = false; duel.setInput(NEUTRAL);
}
// DEEP-EXPLORER: always available in a committed dive, wherever the car is.
// Uses the existing top-of-ramp placement and the same return as driving up.
export function surfaceDeep(duel) {
  const journey = duel.state.deepJourney;
  if (!admitted(duel) || !journey?.committed || duel.state.paused ||
      !['underwater', 'ascending'].includes(journey.phase)) return false;
  duel.course = duel.deepRuntime.raceCourse;
  placeRamp(duel, 0);
  exit(duel);
  return true;
}
// DEEP-SHALLOWS-FIX: a car pressed against the edge of the ground slows, and the
// screen says so for a few seconds after it last touched (the dive's HUD reads
// journey.edgeSec). Nothing here moves the car.
export const EDGE_NOTICE_SEC = 3;
function stepSeaEdge(duel, dt) {
  const journey = duel.state.deepJourney, runtime = duel.deepRuntime, state = duel.state;
  if (runtime.edgeHit) { journey.edgeSec = EDGE_NOTICE_SEC; state.speedMph *= Math.exp(-3 * dt); }
  else if (journey.edgeSec > 0) journey.edgeSec = Math.max(0, journey.edgeSec - dt);
  runtime.edgeHit = false;
}export function stepDeepJourney(duel, dt) {
  const journey = duel.state.deepJourney, runtime = duel.deepRuntime;
  if (!journey || duel.state.status !== 'exploring') return false;
  if (!admitted(duel)) { exit(duel); return true; }
  journey.elapsedSec += dt;
  if (journey.phase === 'choice') {
    if (!journey._choice) return true;
    const choice = journey._choice; journey._choice = null;
    if (choice === 'turn-back') { changePhase(duel, 'turn-back'); return true; }
    journey.committed = true; journey.diveElapsed = 0; journey.diveFrom = journey.progress;
    duel.state.police.pendingFines = 0;
    changePhase(duel, 'diving');
    duel.emit({ deepCommitted: { journeyId: journey.id, zoneId: runtime.zone.id }, deepEntered: { zoneId: runtime.zone.id } });
  }
  if (journey.phase === 'diving') {
    journey.diveElapsed = Math.min(2, journey.diveElapsed + dt);
    const t = journey.diveElapsed / 2, amount = t * t * (3 - 2 * t);
    placeRamp(duel, journey.diveFrom + (runtime.ramp.length - journey.diveFrom) * amount);
    if (journey.diveElapsed < 2) return true;
    runtime.zoneCourse = zoneCourse(runtime); duel.course = runtime.zoneCourse;
    runtime.rocks = deepRocks(runtime.zone, runtime.floor); runtime.rockEpisode = null; // DEEP-ROCKS-PUSH: fresh from the zone seed every dive
    journey.edgeSec = 0;
    Object.assign(duel.state, { s: 0, prevS: 0, lateral: 0, prevLateral: 0,
      headingError: 0, groundHeight: SEA_LEVEL - 8 });
    changePhase(duel, 'underwater');
    return true;
  }
  if (journey.phase === 'underwater') {
    const point = duel.course.worldAt(duel.state.s, duel.state.lateral), end = runtime.ramp.points.at(-1);
    const heading = duel.course.at(duel.state.s).heading + duel.state.headingError;
    if (Math.hypot(point.x - end.x, point.z - end.z) <= runtime.ramp.width / 2 &&
        Math.cos(heading - runtime.ramp.heading) * duel.state.speedMph < -1) {
      duel.course = runtime.raceCourse;
      const near = duel.course.nearest(point.x, point.z, runtime.ramp.atDistance);
      Object.assign(duel.state, { s: near.s, prevS: near.s, lateral: near.lateral, prevLateral: near.lateral,
        headingError: wrap(heading - duel.course.at(near.s).heading), _jumpY: null, airHeight: 0, airborne: false });
      changePhase(duel, 'ascending');
    }
  }
  if(journey.phase==='ascending'){
    const top=rampNear(runtime.ramp,duel.course.worldAt(duel.state.s,duel.state.lateral));
    if(top&&top.progress<=1){exit(duel);return true;}
  }
  const explorerStart = journey.phase === 'underwater' ? duel.course.worldAt(duel.state.s, duel.state.lateral) : null; // DEEP-EXPLORER
  runtime.edgeHit = false;
  if (!stepRampDriving(duel, dt)) duel._drive(dt); // DEEP-RAMP-2
  if (explorerStart) driveIntoDeepRocks(duel, explorerStart, dt); // DEEP-ROCKS-PUSH
  if (explorerStart) stepSeaEdge(duel, dt); // DEEP-SHALLOWS-FIX
  duel.state.groundHeight=duel._supportAt(duel.state.s,duel.state.lateral).y;
  duel._jump(duel.state, dt, journey.elapsedSec);
  const point = duel.course.worldAt(duel.state.s, duel.state.lateral);
  const onRamp = duel.course === runtime.raceCourse && rampNear(runtime.ramp, point);
  if (onRamp) journey.progress = onRamp.progress;
  if (journey.phase === 'turn-back' && !onRamp && duel.course.surfaceAt(duel.state.s, duel.state.lateral).mainRoad) {
    delete duel.state.deepJourney; duel.state.status = 'racing'; duel.setInput(NEUTRAL);
    duel._callout('BACK IN THE RACE'); duel.emit({ deepRejoined: true });
  } else if (journey.phase === 'ascending' && (onRamp && onRamp.progress <= 1 ||
      !onRamp && duel.course.surfaceAt(duel.state.s, duel.state.lateral).mainRoad)) exit(duel);
  return true;
}
export function deepWorldPose(duel) {
  if (!duel.state.deepJourney || !duel.deepRuntime) return null;
  const point = duel.course.groundAt(duel.state.s, duel.state.lateral);
  return { ...point, y: point.y + (duel.state.airHeight || 0),
    heading: duel.course.at(duel.state.s).heading + duel.state.headingError,
    speed: duel.state.speedMph };
}

export function deepEnvironment(duel) {
  if(!deepProtected(duel))return {};
  const point=duel.course.groundAt(duel.state.s,duel.state.lateral);
  return {deepDepth:Math.max(0,SEA_LEVEL-point.y)};
}

// DEEP-RAMP-2: constrained driving on the deck only. Underwater driving is unchanged.
export function stepRampDriving(duel, dt) {
  if (!admitted(duel) || duel.course !== duel.deepRuntime.raceCourse ||
      duel.state.impactTimer > 0 || duel.state.tumble || duel.state.onFoot) return false;
  const s = duel.state, ramp = duel.deepRuntime.ramp;
  const at = rampNear(ramp, duel.course.worldAt(s.s, s.lateral));
  if (!at) return false;
  const facing = Math.cos(duel.course.at(s.s).heading + s.headingError - ramp.heading) >= 0 ? 1 : -1;
  s.prevS = s.s; s.prevLateral = s.lateral; s.prevGroundHeight = s.groundHeight;
  if (s.speedMph === 0 && s.input.brake > .1 && !s.input.throttle) {
    s.reverseHoldSec += dt;
    if (s.reverseHoldSec >= .35) s.gear = -1;
  } else s.reverseHoldSec = 0;
  let speed = s.speedMph;
  if (s.gear < 0) speed = s.input.throttle ? Math.min(0, speed + 45 * dt) : speed - s.input.brake * 12 * dt;
  else speed = s.input.brake ? Math.max(0, speed - s.input.brake * 45 * dt) : speed + s.input.throttle * 12 * dt;
  if (!s.input.throttle && !s.input.brake) speed *= Math.exp(-.3 * dt);
  speed = clamp(speed, -18, 18);
  if (s.gear < 0 && speed === 0 && s.input.throttle) s.gear = 0;
  const travel = speed * .44704 * dt;
  const progress = at.progress + travel * facing;
  const side = clamp(at.lateral - s.input.steer * travel * .3, -ramp.width / 2 + 2, ramp.width / 2 - 2);
  const point = rampAt(ramp, progress, side);
  // Extend a small step beyond the top so Turn back can rejoin the road.
  if (progress < 0) { point.x += Math.sin(ramp.heading) * progress; point.z += Math.cos(ramp.heading) * progress; }
  const near = duel.course.nearest(point.x, point.z, s.s);
  s.s = near.s; s.lateral = near.lateral; s.groundHeight = point.y;
  const target = ramp.heading + (facing < 0 ? Math.PI : 0);
  const heading = duel.course.at(s.prevS).heading + s.headingError;
  s.headingError = wrap(heading + wrap(target - heading) * (1 - Math.exp(-6 * dt)) - duel.course.at(s.s).heading);
  s.speedMph = speed; s.boosting = false; s.revs = Math.abs(speed) / 25;
  s.yawVelocity = s.pushVelocity = s.slipAngle = s.roughness = 0;
  if (Object.hasOwn(s, 'tyreSlip')) s.tyreSlip = 0;
  s.airborne = false; s.airHeight = s.prevAirHeight = 0; s._jumpY = null;
  s.steerVisual = s.input.steer * .3;
  s.terrainPitch = s.terrainRoll = null; duel._terrainPose(); // DEEP-RAMP-2: replace any prior hillside attitude.
  return true;
}

// DEEP-RAMP-2: a read-only high chase along the cutting, easing at both ends.
export function rampChaseCamera(duel) {
  const runtime = duel.deepRuntime;
  if (!runtime || duel.course !== runtime.raceCourse || !admitted(duel)) return null;
  const ramp = runtime.ramp, point = duel.course.worldAt(duel.state.s, duel.state.lateral), at = rampNear(ramp, point);
  if (!at) return null;
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const blend = smooth(at.progress / 10) * smooth((at.y - SEA_LEVEL + 6) / 6);
  const behind = rampAt(ramp, at.progress - 12), ahead = rampAt(ramp, at.progress + 20);
  return { blend, position: { x: behind.x, y: behind.y + 8, z: behind.z },
    target: { x: ahead.x, y: ahead.y + 1, z: ahead.z }, fov: 58 };
}
