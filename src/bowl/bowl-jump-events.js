// Jump events run on the same fixed step and scoring stream as the show.
import {BOWL_EVENTS, crowdAfter, scoreStuntEvent, trickVariety} from './bowl-show.js';
import {featuredSchoolTrick} from './bowl-school.js';
import {BOWL_GOALS} from './bowl-lines.js';
import {resetBowlTrickGo} from './bowl-tricks.js';

const {LONG_JUMP, HIGH_JUMP, BEST_TRICK} = BOWL_EVENTS;
const GO_COUNT = 3;
const RESET_SECONDS = 1;
const GO_SECONDS = 12;

const TARGETS = {
  [LONG_JUMP]: {easy: 4, medium: 7, hard: 9},
  [HIGH_JUMP]: {easy: 8, medium: 9, hard: 12},
};
const targetFor = night => TARGETS[night.event.type][night.cpuDifficulty];

const RIVAL_ROUNDS = {
  easy: [[null, 'a roof landing', 0], ['backflip', 'backflip', 45], ['barrelRoll', 'barrel roll', 54]],
  medium: [['backflip', 'double backflip', 300], ['spin', 'spin combo', 600], ['frontFlip', 'triple front flip combo', 900]],
  hard: [['backflip', 'double backflip combo', 900], ['backflip', 'triple backflip combo', 1500], ['barrelRoll', 'triple barrel roll combo', 2400]],
};

function bestTrickRival(night, state, number) {
  const {event} = night;
  const [kind, trick, basePoints] = RIVAL_ROUNDS[night.cpuDifficulty][number - 1];
  const crowd = crowdAfter(event.crowd, state.stageTimeSec - event.crowdAt);
  if (!kind) return {trick, kind, basePoints, crowd, points: 0};
  const {fresh, repeat} = trickVariety(event.rivalVariety, kind);
  const featured = featuredSchoolTrick({kind}, night.featuredTricks);
  const points = scoreStuntEvent({type: 'bowlTrick', points: basePoints * (featured ? 2 : 1), fresh, repeat}, crowd).points;
  return {trick, kind, basePoints, crowd, fresh, repeat, featured, points};
}

function ready(duel, night, placeAt, first = false) {
  const {event} = night, {course, state} = duel;
  const {ramp, buses} = course.features.bowlJump;
  const s = ramp.start - 37, lateral = ramp.off;
  const ground = course.groundAt(s, lateral).y;
  placeAt(duel, s, lateral);
  Object.assign(state, {speedMph: 0, headingError: 0, yawVelocity: 0, pushVelocity: 0, slipAngle: 0,
    groundHeight: ground, prevGroundHeight: ground, airborne: false, airHeight: 0, prevAirHeight: 0,
    _jumpY: ground, _verticalSpeed: 0, _jumpOrigin: null, _airOrigin: null, airDistance: 0, airTime: 0,
    gear: 0, revs: 0, reverseHoldSec: 0, terrainPitch: 0, terrainRoll: 0, tumble: null,
    impactTimer: 0, crashFlash: 0, bowlLanding: null, boosting: false, boost: 1, collectedJumps: []});
  if (!first) resetBowlTrickGo(state);
  delete state.bowlOutside;
  // Restore the buses the driver may have landed on in the previous go.
  if (buses) state.crushedProps = state.crushedProps.filter(id => !buses.some(bus => bus.id === id));
  const number = event.goes.length + 1;
  const go = {startedAt: null, number, scoreAt: event.score, launched: false,
    cleared: [], barLow: Infinity, touchedBar: false};
  if (event.type === BEST_TRICK) {
    if (first) event.rivalVariety = {seen: new Set(), last: null, repeat: 1};
    const rival = night.turn ? null : bestTrickRival(night, state, number);
    Object.assign(go, {rival, trickPoints: 0, tricks: [], tried: false});
    Object.assign(event, {schoolFailures: [], schoolReason: null});
  }
  // Going outside was already a discovery in this event. A reset is another
  // go within the same event, so repeat crossings keep their established price.
  Object.assign(event, {flight: null, inTunnel: false, visitedOutside: false, goResetAt: null, go});
  if (!first) cue(duel, event, 'goReady', 'bowl.go.ready');
}

function cue(duel, event, type, sound, points = 0) {
  event.score += points;
  const score = {type, points, score: event.score};
  if (sound) score.cue = sound;
  duel.emit({bowlScore: score});
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

function sampleBuses(go, line, truck, onClear) {
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
      onClear?.();
    }
  }
  go.lastAlong = truck.along;
}

function sampleBar(go, {bar}, truck) {
  if (truck.along + truck.nose >= bar.distance && truck.along - truck.nose <= bar.distance) {
    go.touchedBar = true;
    const height = Math.abs(truck.across) + truck.side <= bar.halfWidth ? truck.y : 0;
    go.barLow = Math.min(go.barLow, height);
  }
  go.lastAlong = truck.along;
  go.lastNose = truck.nose;
}

const clearedBar = (go, bar, height) => go.touchedBar &&
  go.lastAlong > bar.distance + go.lastNose && go.barLow >= height;
const clearedBuses = (go, state) => go.cleared.filter(id => !state.crushedProps.includes(id));

export function stepFreestyleJump(duel, event, award) {
  const {state, course} = duel;
  const line = course.features.bowlJump;
  if (!line) return;
  if (state.airborne && state._jumpOrigin?.rampId === line.rampId) {
    const go = event.freestyleJump ??= {cleared: [], barLow: Infinity, touchedBar: false};
    const truck = sampleFlight(duel, line);
    if (line.buses) sampleBuses(go, line, truck);
    else sampleBar(go, line, truck);
  } else if (event.freestyleJump && !state.airborne) {
    const go = event.freestyleJump;
    event.freestyleJump = null;
    if (line.buses) {
      for (const id of clearedBuses(go, state)) award({type: 'busClear', points: 40, id}, 'bowl.long.clear');
    } else if (clearedBar(go, line.bar, event.barHeight)) {
      award({type: 'barClear', points: event.barClears++ ? 60 : 100}, 'bowl.free.bar');
    }
  }
}

function flightLanded(duel, event) {
  const {state, course} = duel, {go} = event;
  if (event.type === BEST_TRICK) return go.trickPoints;
  if (event.type === LONG_JUMP) {
    const count = clearedBuses(go, state).length;
    cue(duel, event, 'longPoints', null, 40 * count);
    return count;
  }
  const {bar} = course.features.bowlJump;
  if (!clearedBar(go, bar, event.barHeight)) {
    cue(duel, event, 'highFail', 'bowl.high.fail');
    return 0;
  }
  const height = event.barHeight++;
  go.barPoints = event.goes.some(attempt => attempt.result) ? 60 : 100;
  cue(duel, event, 'highClear', 'bowl.high.clear', go.barPoints);
  return height;
}

function decideRound(duel, event, result, say) {
  const {go} = event;
  const won = result > go.rival.points || go.rival.points === 0 && go.tricks.length > 0;
  const previous = event.goes.at(-1);
  if (!won) {
    const repeated = go.tricks.length === 1 && previous?.tricks?.includes(go.tricks[0]);
    const line = repeated ? 'best.repeat' : !go.tried ? 'best.noTrick' : null;
    if (line && go.number === GO_COUNT) event.finishLine = line;
    else if (line) say(duel, line);
  }
  duel.emit({bowlRound: {round: go.number, rival: go.rival, points: result, won}});
  cue(duel, event, 'bestRound', won ? 'bowl.best.round.won' : 'bowl.best.round.lost');
  return won;
}

function closeGo(duel, night, result, say) {
  const {event} = night, {go} = event;
  const played = {go: go.number, result, score: event.score - go.scoreAt};
  if (go.barPoints) played.barPoints = go.barPoints;
  if (go.rival) Object.assign(played, {won: decideRound(duel, event, result, say), tricks: go.tricks});
  event.goes.push(played);
  const best = event.bestGo;
  if (!best || result > best.result || result === best.result && played.score > best.score) event.bestGo = played;
  duel.emit({bowlGo: {event: event.type, go: go.number, result}});
  if (night.turn || event.goes.length === GO_COUNT) {
    // Only the best drive's ordinary points count. The bar bonus remains
    // cumulative because each successive clear is worth another metre.
    const barPoints = event.goes.reduce((total, attempt) => total + (attempt.barPoints ?? 0), 0);
    event.score = event.bestGo.score - (event.bestGo.barPoints ?? 0) + barPoints;
    if (event.type === BEST_TRICK) {
      return {won: night.turn ? result > 0 : event.goes.filter(attempt => attempt.won).length >= 2};
    }
    return {won: event.bestGo.result >= targetFor(night)};
  }
  event.goResetAt = night.clock + RESET_SECONDS / 2;
  event.goFadeUntil = night.clock + RESET_SECONDS;
  duel.state.status = 'racing';
  duel.state.boosting = false;
  return null;
}

function stepGo(duel, night, say) {
  const {event} = night, {course, state} = duel, {go} = event;
  const line = course.features.bowlJump;
  if (go.startedAt == null) {
    go.startedAt = night.clock;
    if (go.rival?.points === 0) {
      cue(duel, event, 'bestRivalSlam', 'bowl.best.rival.slam');
      say(duel, 'best.roof');
    } else if (go.rival) cue(duel, event, 'bestRival', 'bowl.best.rival');
  }
  if (state.airborne && state._jumpOrigin?.rampId === line.rampId) {
    go.launched = true;
    if (line.type === LONG_JUMP && !go.hitBus) sampleBuses(go, line, sampleFlight(duel, line),
      () => cue(duel, event, 'longClear', 'bowl.long.clear'));
    if (line.type === HIGH_JUMP) sampleBar(go, line, sampleFlight(duel, line));
  } else if (!state.airborne && go.launched) {
    return closeGo(duel, night, flightLanded(duel, event), say);
  }
  if (night.clock - go.startedAt + 1e-8 >= GO_SECONDS) return closeGo(duel, night, 0, say);
  return null;
}

function observeTrickGo(event, ev) {
  const {go} = event;
  if (go.startedAt == null || event.goFadeUntil != null) return;
  if (ev.bowlScore?.type === 'bowlTrick') go.trickPoints += ev.bowlScore.points;
  const trick = ev.bowlTrick;
  if (trick || ev.bowlTrickLate || ev.bowlTrickTry) go.tried = true;
  if (trick?.points > 0 && trick.landing !== 'slam' && !go.tricks.includes(trick.kind)) go.tricks.push(trick.kind);
}

export function installBowlJumpEvents(register, placeAt, say) {
  for (const type of [LONG_JUMP, HIGH_JUMP, BEST_TRICK]) register(type, {
    dressing: type,
    singleEvent: true,
    scoreCrush: type !== LONG_JUMP,
    target: night => type === BEST_TRICK ? night.event.go.rival?.points ?? null : targetFor(night),
    goal: night => {
      if (type === BEST_TRICK) return BOWL_GOALS.bestTrick(night.event.go.rival);
      return BOWL_GOALS[type](type === HIGH_JUMP ? night.event.barHeight : targetFor(night));
    },
    place(duel, night) {
      Object.assign(night.event, {goes: [], bestGo: null, barHeight: type === HIGH_JUMP ? targetFor(night) : null});
      ready(duel, night, placeAt, true);
    },
    step(duel, night) { return stepGo(duel, night, say); },
    wreck(duel, night) { return closeGo(duel, night, 0, say); },
    reset(duel, night) { ready(duel, night, placeAt); },
    observe(duel, night, ev) {
      const {go} = night.event, line = duel.course.features.bowlJump;
      if (type === LONG_JUMP && go.launched && ev.propCrushed?.byPlayer &&
          line.buses.some(bus => bus.id === ev.propCrushed.id)) go.hitBus = true;
      if (type === BEST_TRICK) observeTrickGo(night.event, ev);
    },
    result: event => ({bestGo: event.bestGo, goes: event.goes,
      ...(type === BEST_TRICK ? {roundsWon: event.goes.filter(attempt => attempt.won).length} : {})}),
  });
}
