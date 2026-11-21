// Jump events run on the same fixed step and scoring stream as the show.
import {BOWL_EVENTS} from './bowl-show.js';
import {BOWL_GOALS} from './bowl-lines.js';

const {LONG_JUMP, HIGH_JUMP, HOME_RUN} = BOWL_EVENTS;
const GO_COUNT = 3;
const RESET_SECONDS = 1;
const GO_SECONDS = 12;
const GATE_SECONDS = 30;
const ringPoints = [0, 150, 300, 600];

const TARGETS = {
  [LONG_JUMP]: {easy: 4, medium: 7, hard: 9},
  [HIGH_JUMP]: {easy: 8, medium: 9, hard: 12},
  [HOME_RUN]: {easy: 1, medium: 2, hard: 3},
};

const targetFor = night => TARGETS[night.event.type][night.cpuDifficulty];

function approach(line) {
  const home = line.type === HOME_RUN;
  return {
    s: line.ramp.start - (home ? 16 : 37),
    lateral: line.ramp.off - (home ? 6 : 0),
    heading: home ? .34 : 0,
  };
}

function ready(duel, night, placeAt, first = false) {
  const {event} = night, {course, state} = duel;
  const {s, lateral, heading} = approach(course.features.bowlJump);
  const ground = course.groundAt(s, lateral).y;
  placeAt(duel, s, lateral);
  Object.assign(state, {speedMph: 0, headingError: heading, yawVelocity: 0, pushVelocity: 0, slipAngle: 0,
    groundHeight: ground, prevGroundHeight: ground, airborne: false, airHeight: 0, prevAirHeight: 0,
    _jumpY: ground, _verticalSpeed: 0, _jumpOrigin: null, _airOrigin: null, airDistance: 0, airTime: 0,
    gear: 0, revs: 0, reverseHoldSec: 0, terrainPitch: 0, terrainRoll: 0, tumble: null,
    impactTimer: 0, crashFlash: 0, bowlLanding: null, boosting: false, boost: 1, collectedJumps: []});
  if (state.bowlPose) Object.assign(state.bowlPose, {pitch: 0, roll: 0, yaw: 0});
  delete state.bowlOutside;
  // Restore the buses the driver may have landed on in the previous go.
  const buses = course.features.bowlJump.buses;
  if (buses) state.crushedProps = state.crushedProps.filter(id => !buses.some(bus => bus.id === id));
  Object.assign(event, {flight: null, overWall: false, standSeconds: 0, inTunnel: false, visitedOutside: false,
    goResetAt: null, go: {startedAt: null, number: event.goes.length + 1, scoreAt: event.score,
      launched: false, cleared: [], barLow: Infinity, touchedBar: false, overWall: false, ring: 0}});
  if (!first) cue(duel, event, 'goReady', 'bowl.go.ready');
}

function cue(duel, event, type, sound, points = 0) {
  event.score += points;
  duel.emit({bowlScore: {type, points, score: event.score, cue: sound}});
}

function sampleFlight(duel, line) {
  const state = duel.state;
  const p = duel.course.worldAt(state.s, state.lateral);
  const x = p.x - line.crest.x, z = p.z - line.crest.z;
  const heading = p.heading + state.headingError - line.crest.heading;
  const {halfLength, halfWidth} = duel._vehicleSpec(state);
  return {along: x * line.forward.x + z * line.forward.z, across: x * line.across.x + z * line.across.z,
    y: state._jumpY, nose: Math.abs(Math.cos(heading)) * halfLength + Math.abs(Math.sin(heading)) * halfWidth,
    side: Math.abs(Math.sin(heading)) * halfLength + Math.abs(Math.cos(heading)) * halfWidth};
}

function sampleBuses(duel, event, line, truck) {
  const go = event.go;
  for (const bus of line.buses) {
    if (truck.along + truck.nose < bus.distance - bus.halfDepth || go.cleared.includes(bus.id)) continue;
    if (truck.along - truck.nose <= bus.distance + bus.halfDepth &&
        (truck.y <= bus.top || Math.abs(truck.across) + truck.side > bus.halfWidth)) {
      go.missedBuses ??= new Set();
      go.missedBuses.add(bus.id);
    }
    if (truck.along - truck.nose > bus.distance + bus.halfDepth && !go.missedBuses?.has(bus.id) &&
        (go.lastAlong ?? truck.along) - truck.nose <= bus.distance + bus.halfDepth) {
      go.cleared.push(bus.id);
      cue(duel, event, 'longClear', 'bowl.long.clear');
    }
  }
  go.lastAlong = truck.along;
}

function sampleBar(event, {bar}, truck) {
  if (truck.along + truck.nose < bar.distance || truck.along - truck.nose > bar.distance) return;
  event.go.touchedBar = true;
  const height = Math.abs(truck.across) + truck.side <= bar.halfWidth ? truck.y : 0;
  event.go.barLow = Math.min(event.go.barLow, height);
}

function flightLanded(duel, event, line) {
  const state = duel.state, go = event.go;
  if (line.type === LONG_JUMP) {
    go.result = go.cleared.filter(id => !state.crushedProps.includes(id)).length;
    cue(duel, event, 'longPoints', null, 40 * go.result);
  } else if (line.type === HIGH_JUMP) {
    const cleared = go.touchedBar && go.lastAlong > line.bar.distance + go.lastNose && go.barLow >= event.barHeight;
    go.result = cleared ? event.barHeight : 0;
    if (cleared) {
      cue(duel, event, 'highClear', 'bowl.high.clear', event.goes.some(attempt => attempt.result) ? 60 : 100);
      event.barHeight++;
    } else {
      cue(duel, event, 'highFail', 'bowl.high.fail');
    }
  } else {
    go.landed = true;
    if (!go.overWall || !state.bowlOutside || state.bowlLanding === 'slam') return;
    const p = duel.course.worldAt(state.s, state.lateral), target = line.target;
    const distance = Math.hypot(p.x - target.x, p.z - target.z);
    const ring = target.radii.findIndex(radius => distance <= radius);
    go.ring = ring < 0 ? 0 : 3 - ring;
    if (go.ring) cue(duel, event, 'homeRing', 'bowl.home.ring', ringPoints[go.ring]);
  }
}

function closeGo(duel, night, result) {
  const {event} = night, go = event.go;
  const played = {go: go.number, result, score: event.score - go.scoreAt};
  event.goes.push(played);
  if (!event.bestGo || result > event.bestGo.result || result === event.bestGo.result && played.score > event.bestGo.score) {
    event.bestGo = played;
  }
  duel.emit({bowlGo: {event: event.type, go: go.number, result}});
  if (night.turn || event.goes.length === GO_COUNT) {
    if (event.type !== HIGH_JUMP) event.score = event.bestGo.score;
    return {won: event.bestGo.result >= targetFor(night)};
  }
  event.goResetAt = night.clock + RESET_SECONDS / 2;
  event.goFadeUntil = night.clock + RESET_SECONDS;
  duel.state.status = 'racing';
  duel.state.boosting = false;
  return null;
}

function stepGo(duel, night) {
  const {event} = night, {course, state} = duel, {go} = event;
  const line = course.features.bowlJump;
  go.startedAt ??= night.clock;
  if (state.airborne && !go.landed && state._jumpOrigin?.rampId === line.rampId) {
    go.launched = true;
    if (line.type !== HOME_RUN) {
      const truck = sampleFlight(duel, line);
      if (line.type === LONG_JUMP) sampleBuses(duel, event, line, truck);
      else {
        sampleBar(event, line, truck);
        go.lastAlong = truck.along;
        go.lastNose = truck.nose;
      }
    }
  } else if (!state.airborne && go.launched && !go.landed) {
    flightLanded(duel, event, line);
    go.landed = true;
    if (line.type !== HOME_RUN || !go.overWall) return closeGo(duel, night, go.result ?? 0);
  }
  if (go.returned && go.landed) return closeGo(duel, night, go.ring + 1);
  const elapsed = go.outAt == null ? night.clock - go.startedAt : night.clock - go.outAt;
  if (elapsed >= (go.outAt == null ? GO_SECONDS : GATE_SECONDS)) return closeGo(duel, night, 0);
  return null;
}

export function installBowlJumpEvents(register, placeAt) {
  for (const type of [LONG_JUMP, HIGH_JUMP, HOME_RUN]) register(type, {
    dressing: type,
    singleEvent: true,
    target: targetFor,
    goal: night => type === HOME_RUN && night.event.go.outAt != null ? 'Follow the arrow through a gate.'
      : BOWL_GOALS[type](type === HIGH_JUMP ? night.event.barHeight : targetFor(night)),
    timeLeft: night => type === HOME_RUN && night.event.go.outAt != null
      ? Math.max(0, GATE_SECONDS - (night.clock - night.event.go.outAt)) : null,
    place(duel, night) {
      Object.assign(night.event, {goes: [], bestGo: null, barHeight: type === HIGH_JUMP ? targetFor(night) : null});
      ready(duel, night, placeAt, true);
    },
    step: stepGo,
    wreck(duel, night) { return closeGo(duel, night, 0); },
    reset(duel, night) { ready(duel, night, placeAt); },
    observe(duel, night, ev) {
      if (type !== HOME_RUN) return;
      const go = night.event.go;
      if (ev.bowlOverWall && duel.state._jumpOrigin?.rampId === duel.course.features.bowlJump.rampId) {
        go.overWall = true;
        go.outAt ??= night.clock;
      }
      if (ev.bowlBackIn && go.overWall) go.returned = true;
    },
    result: event => ({bestGo: event.bestGo, goes: event.goes}),
  });
}
