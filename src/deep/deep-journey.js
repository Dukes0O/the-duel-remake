// Journey architecture only. Real content providers are installed by DEEP-TRAIL.
import { SEA_LEVEL } from '../coastal-water.js';
import { buildDeepRamp } from './deep-ramp.js';
import { defineZone } from './deep-zone.js';
import { createZoneFloor, ZONE_SPAN } from './zone-floor.js';

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
      const original={surfaceAt:course.surfaceAt,groundAt:course.groundAt,gripKindAt:course.gripKindAt};
      Object.defineProperties(course, {
        surfaceAt:{configurable:true,value:function(distance,lateral=0){
          const rampPoint=deepRampGround(this,distance,lateral);
          return rampPoint?{road:true,mainRoad:false,shortcutId:'deep-ramp',roadHalfWidth:this.roadHalfWidthAt(distance),deepRamp:true}:original.surfaceAt.call(this,distance,lateral);
        }},
        groundAt:{configurable:true,value:function(distance,lateral=0){
          return deepRampGround(this,distance,lateral)??original.groundAt.call(this,distance,lateral);
        }},
        gripKindAt:{configurable:true,value:function(distance,lateral=0){
          const rampPoint=deepRampGround(this,distance,lateral);
          return rampPoint&&rampPoint.progress>=this.deepRamp.shoreline.center.progress?'sea-floor':original.gripKindAt.call(this,distance,lateral);
        }},
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
function zoneCourse(runtime) {
  const floor = runtime.floor, empty = [];
  const phase = value => ((value % floor.length) + floor.length) % floor.length;
  const at = distance => {
    const frame = floor.frameAt(distance);
    return { x: frame.x, y: SEA_LEVEL + floor.trailHeight(distance), z: frame.z,
      heading: Math.atan2(frame.tx, frame.tz), curvature: 0, s: distance };
  };
  const worldAt = (distance, lateral = 0) => {
    const point = floor.pointAt(distance, lateral);
    return { ...point, y: SEA_LEVEL + floor.floorHeight(point.x, point.z), heading: at(distance).heading };
  };
  return { def: Object.freeze({ id: runtime.zone.id, kind: 'deep', theme: 'coast', airborne: true, closed: true }),
    length: floor.length, raceLength: floor.length, seed: runtime.raceCourse.seed, closed: true,
    features: { obstacles: empty, mountains: empty, shortcuts: empty, ramps: empty }, phase, at, worldAt, groundAt: worldAt,
    nearest(x, z, reference) {
      const sample = floor.sample(x, z);
      if (!sample) return { s: NaN, lateral: NaN, distance: Infinity };
      let s = sample.along;
      if (Number.isFinite(reference)) s += Math.round((reference - s) / floor.length) * floor.length;
      return { ...at(s), s, lateral: sample.lateral, distance: sample.distance };
    },
    roadHalfWidthAt(distance) { const frame = floor.frameAt(distance); return floor.sample(frame.x, frame.z).width / 2; },
    surfaceAt(distance, lateral) { return { road: true, mainRoad: true, shortcutId: null,
      roadHalfWidth: this.roadHalfWidthAt(distance) }; },
    gripKindAt: () => 'sea-floor', obstaclesNear: () => [], rocksNear: () => [],
    themeAt: () => 'coast', tunnelAt: () => null, sectionAt: () => ({ theme: 'coast' }),
  };
}
export function clearDeepJourney(duel) {
  if (duel.deepRuntime && duel.course === duel.deepRuntime.zoneCourse) duel.course = duel.deepRuntime.raceCourse;
  delete duel.state.deepJourney;
  duel.deepRuntime = null;
}
export function initializeDeepJourney(duel) {
  const resolved = duel.course.deepZone;
  if (!resolved) { duel.deepRuntime = null; return; }
  duel.deepRuntime = { ...resolved, ramp: duel.course.deepRamp, raceCourse: duel.course, zoneCourse: null };
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
  state.headingError = wrap(point.heading - runtime.raceCourse.at(state.s).heading);
  state.airborne = false; state.airHeight = state.prevAirHeight = 0; state._jumpY = null;
  state.speedMph = 0; state.yawVelocity = state.pushVelocity = state.slipAngle = 0; if (Object.hasOwn(state, 'tyreSlip')) state.tyreSlip = 0;
  state.deepJourney.progress = progress;
}
function exit(duel) {
  const journey = duel.state.deepJourney;
  duel.emit({ deepExited: { zoneId: journey.zoneId }, deepReturn: { journeyId: journey.id } });
  clearDeepJourney(duel);
  duel.state.status = 'menu'; duel.state.paused = false; duel.setInput(NEUTRAL);
}
export function stepDeepJourney(duel, dt) {
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
    Object.assign(duel.state, { s: 0, prevS: 0, lateral: 0, prevLateral: 0,
      headingError: wrap(runtime.ramp.heading - duel.course.at(0).heading), groundHeight: SEA_LEVEL - 8 });
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
  duel._drive(dt);
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
