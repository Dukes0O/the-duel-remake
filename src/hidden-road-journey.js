import {DRIVE} from './config.js';
import {onHiddenRoad} from './hidden-road.js';
import {wrapHeading} from './offroad-physics.js';

// EGG-02 structural bounds in gate-local metres. The facade plane conservatively
// includes the jambs; irregular salvage and small decorative debris are not
// triangle colliders. Keep this headless contract checked against the GLB.
export const HIDDEN_ROAD_GATE = Object.freeze({halfWidth: 210, height: 35,
  openingHalfWidth: 4.5, openingHeight: 7, panelLift: 7.25,
  wallFront: -1.575, wallBack: 5.5, panelFront: -.845, panelBack: -.09,
  stopDistance: 12, enterDistance: 12});
const NEUTRAL = Object.freeze({throttle: 0, brake: 0, steer: 0, boost: false,
  shiftUp: false, shiftDown: false, interact: false});
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => (value = clamp(value), value * value * (3 - 2 * value));

function phase(duel, next) {
  const j = duel.state.hiddenRoadJourney;
  j.phase = next; j.phaseElapsedSec = 0;
  j.controlsLocked = !['racing', 'exploring', 'turned-back'].includes(next);
  j.choiceReady = next === 'choice';
  if (j.controlsLocked || next === 'turned-back') duel.setInput(NEUTRAL);
  duel.emit({hiddenRoadPhase: {journeyId: j.id, phase: next}});
}

export function initializeHiddenRoadJourney(duel) {
  const road = duel.course.hiddenRoad, s = duel.state;
  s.hiddenRoadJourney = null;
  if (!road) return;
  const gate = road.poseAt(road.length), bounds = HIDDEN_ROAD_GATE;
  const collider = (name, left, right, bottom, top, front, back) => {
    const x = (left + right) / 2, z = (front + back) / 2;
    return {id: `rustwall-${name}`, kind: 'building', shape: 'box',
      x: gate.x + Math.cos(gate.heading) * x + Math.sin(gate.heading) * z,
      z: gate.z - Math.sin(gate.heading) * x + Math.cos(gate.heading) * z,
      y: gate.y + bottom, minY: gate.y + bottom, maxY: gate.y + top,
      height: top - bottom, heading: gate.heading, halfX: (right - left) / 2,
      halfZ: (back - front) / 2};
  };
  duel._hiddenRoadJourneySerial = (duel._hiddenRoadJourneySerial || 0) + 1;
  s.hiddenRoadJourney = {id: duel._hiddenRoadJourneySerial, phase: 'racing',
    elapsedSec: 0, phaseElapsedSec: 0, progress: 0, gateOpen: 0,
    departed: false, controlsLocked: false, choiceReady: false,
    automaticEntry: duel._hiddenRoadAutomaticEntry === true,
    _choice: null, _gate: gate, _motion: null,
    _colliders: [
      collider('left', -bounds.halfWidth, -bounds.openingHalfWidth, 0, bounds.height, bounds.wallFront, bounds.wallBack),
      collider('right', bounds.openingHalfWidth, bounds.halfWidth, 0, bounds.height, bounds.wallFront, bounds.wallBack),
      collider('header', -bounds.openingHalfWidth, bounds.openingHalfWidth, bounds.openingHeight, bounds.height, 2.5, bounds.wallBack),
      collider('panel', -bounds.openingHalfWidth, bounds.openingHalfWidth, 0, bounds.openingHeight, bounds.panelFront, bounds.panelBack),
    ]};
}

export function prepareHiddenRoadVisit(duel) {
  const s = duel.state, j = s.hiddenRoadJourney;
  if (!j) return false;
  j.departed = true; j.automaticEntry = true;
  s.hiddenRoadVisit = Object.freeze({playerId: s.playerId, journeyId: j.id});
  s.status = 'exploring'; s.countdown = 0;
  const gate = j._gate, distance = HIDDEN_ROAD_GATE.stopDistance;
  place(duel, gate.x - Math.sin(gate.heading) * distance,
    gate.z - Math.cos(gate.heading) * distance, gate.heading, 0);
  phase(duel, 'opening');
  return true;
}

export function checkHiddenRoadDeparture(duel) {
  const s = duel.state, j = s.hiddenRoadJourney;
  if (!j || j.departed || s.status !== 'racing' || s.onFoot || !onHiddenRoad(duel.course, s)) return false;
  const point = duel.course.worldAt(s.s, s.lateral);
  j.progress = duel.course.hiddenRoad.nearest(point.x, point.z).progress;
  if (j.progress < 150) return false;
  j.departed = true;
  s.status = 'exploring';
  s.impactTimer = 0; s.tumble = null; s.boosting = false;
  s.airborne = false; s.airHeight = 0; s._jumpY = null;
  s.police.pendingFines = 0;
  phase(duel, 'exploring');
  duel.emit({hiddenRoadDeparted: {journeyId: j.id}});
  return true;
}

export function queueHiddenRoadChoice(duel, choice) {
  const s = duel.state, j = s.hiddenRoadJourney;
  if (s.status !== 'exploring' || s.paused || !j?.departed || !j.choiceReady ||
      j.phase !== 'choice' || j._choice || !['enter', 'turn-back'].includes(choice)) return false;
  j._choice = choice;
  return true;
}

export function hiddenRoadColliders(duel) {
  const j = duel.state.hiddenRoadJourney;
  if (duel.state.status !== 'exploring' || !j?.departed) return null;
  const panel = j._colliders[3], lift = clamp(j.gateOpen) * HIDDEN_ROAD_GATE.panelLift;
  panel.y = panel.minY = j._gate.y + lift;
  panel.maxY = panel.minY + HIDDEN_ROAD_GATE.openingHeight;
  return j._colliders;
}

function place(duel, x, z, heading, speed) {
  const s = duel.state, j = s.hiddenRoadJourney;
  const position = duel._roadPosition({x, z}, s.s);
  s.prevS = s.s; s.prevLateral = s.lateral;
  s.s = position.s; s.lateral = position.lateral;
  s.headingError = wrapHeading(heading - duel.course.at(s.s).heading);
  s.speedMph = speed; s.revs = Math.abs(speed) / duel.car.gears[Math.max(0, s.gear)];
  s.groundHeight = j._gate.y; s.prevGroundHeight = j._gate.y;
  s.airborne = false; s.airHeight = s.prevAirHeight = 0;
  s.yawVelocity = s.pushVelocity = s.slipAngle = 0;
  s.boosting = false; s.steerVisual = 0;
  j.progress = duel.course.hiddenRoad.nearest(x, z).progress;
}

function beginMotion(duel, next, gateZ, duration = null) {
  const s = duel.state, j = s.hiddenRoadJourney, gate = j._gate;
  const point = duel.course.worldAt(s.s, s.lateral);
  const endX = gate.x + Math.sin(gate.heading) * gateZ;
  const endZ = gate.z + Math.cos(gate.heading) * gateZ;
  const distance = Math.hypot(endX - point.x, endZ - point.z);
  const initialSpeed = Math.max(0, s.speedMph) * DRIVE.mphToWorld;
  const seconds = duration ?? Math.max(1 / 120, Math.min(5, 2 * distance / Math.max(1, initialSpeed)));
  j._motion = {startX: point.x, startZ: point.z, endX, endZ, distance,
    heading: duel.course.at(s.s).heading + s.headingError, duration: seconds,
    tangent: duration ? 0 : Math.min(2, initialSpeed * seconds / Math.max(.001, distance))};
  phase(duel, next);
}

function arriveIfClose(duel) {
  const s = duel.state, j = s.hiddenRoadJourney;
  if (j.phase !== 'exploring' || !onHiddenRoad(duel.course, s)) return false;
  const point = duel.course.worldAt(s.s, s.lateral), gate = j._gate;
  const dx = point.x - gate.x, dz = point.z - gate.z;
  const forward = dx * Math.sin(gate.heading) + dz * Math.cos(gate.heading);
  if (forward > 0 || Math.hypot(dx, dz) > 60) return false;
  beginMotion(duel, 'arriving', -HIDDEN_ROAD_GATE.stopDistance);
  return true;
}

export function stepHiddenRoadJourney(duel, dt) {
  const s = duel.state, j = s.hiddenRoadJourney;
  if (s.status !== 'exploring' || !j?.departed) return;
  j.elapsedSec += dt;
  if (j.phase === 'exploring' || j.phase === 'turned-back') {
    if (!arriveIfClose(duel)) {
      j.phaseElapsedSec += dt;
      duel._drive(dt);
      duel._staticContacts(s, true);
      const point = duel.course.worldAt(s.s, s.lateral);
      j.progress = duel.course.hiddenRoad.nearest(point.x, point.z).progress;
      arriveIfClose(duel);
      return;
    }
  }
  if (j.phase === 'choice' && j._choice) {
    const choice = j._choice; j._choice = null;
    duel.emit({hiddenRoadChoice: {journeyId: j.id, choice}});
    if (choice === 'turn-back') { phase(duel, 'turned-back'); return; }
    beginMotion(duel, 'entering', HIDDEN_ROAD_GATE.enterDistance, 3);
  }
  let remaining = dt;
  while (remaining > 1e-10) {
    const moving = j.phase === 'arriving' || j.phase === 'entering';
    const duration = moving ? j._motion.duration : j.phase === 'opening' ? 3 : Infinity;
    const slice = Math.min(remaining, Math.max(0, duration - j.phaseElapsedSec));
    j.phaseElapsedSec += slice; remaining -= slice;
    if (moving) {
      const m = j._motion, t = clamp(j.phaseElapsedSec / duration), t2 = t * t;
      const amount = smooth(t) + m.tangent * (t * t2 - 2 * t2 + t);
      const derivative = 6 * t - 6 * t2 + m.tangent * (3 * t2 - 4 * t + 1);
      place(duel, m.startX + (m.endX - m.startX) * amount,
        m.startZ + (m.endZ - m.startZ) * amount,
        m.heading + wrapHeading(j._gate.heading - m.heading) * smooth(t),
        Math.max(0, m.distance * derivative / duration / DRIVE.mphToWorld));
    } else if (j.phase === 'opening') j.gateOpen = smooth(j.phaseElapsedSec / duration);
    if (j.phaseElapsedSec + 1e-9 < duration) break;
    if (j.phase === 'arriving') { s.speedMph = 0; phase(duel, 'opening'); }
    else if (j.phase === 'opening') {
      j.gateOpen = 1;
      if (j.automaticEntry) beginMotion(duel, 'entering', HIDDEN_ROAD_GATE.enterDistance, 3);
      else phase(duel, 'choice');
    }
    else if (j.phase === 'entering') {
      s.speedMph = 0; phase(duel, 'arrived');
      duel.emit({hiddenRoadArrived: {journeyId: j.id}});
    } else break;
  }
}
