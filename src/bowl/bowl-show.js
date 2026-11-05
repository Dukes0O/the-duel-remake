// Headless rules for the Bowl show. Inputs are immutable game events; this
// module never writes to a vehicle, physics state, or save.

export const BOWL_EVENTS = Object.freeze({
  CAR_CRUSH: 'carCrush',
  FREESTYLE: 'freestyle',
  SIDE_BY_SIDE: 'sideBySide',
  LAST_TRUCK_ROLLING: 'lastTruckRolling',
});

export const SHOW_NIGHTS = Object.freeze(Array.from({length: 5}, (_, index) => Object.freeze({
  night: index + 1,
  events: Object.freeze([
    BOWL_EVENTS.CAR_CRUSH,
    BOWL_EVENTS.FREESTYLE,
    index < 2 ? BOWL_EVENTS.SIDE_BY_SIDE : BOWL_EVENTS.LAST_TRUCK_ROLLING,
  ]),
})));

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const CROWD_DECAY_PER_SECOND = 0.12;
const CROWD_GAIN_PER_POINT = 0.0015;

// Event protocol: landedJump {durationSeconds, distanceMeters, pitchTurns?},
// carLaunch {durationSeconds, distanceMeters, pitchTurns?}, crush {},
// donut {seconds}, and crowdTick {seconds}. Only completed event facts count.
export function scoreStuntEvent(event, crowd = 0) {
  if (!event || typeof event !== 'object') return {points: 0, crowd: clamp(finite(crowd), 0, 100)};
  const meter = clamp(finite(crowd), 0, 100);
  let base = 0;
  switch (event.type) {
    case 'landedJump':
      base = 20 + Math.max(0, finite(event.durationSeconds)) * 8 + Math.max(0, finite(event.distanceMeters)) * 0.35;
      break;
    case 'carLaunch':
      base = 45 + Math.max(0, finite(event.durationSeconds)) * 12 + Math.max(0, finite(event.distanceMeters)) * 0.55;
      break;
    case 'crush':
      base = 35;
      break;
    case 'donut':
      // Donuts are event facts from turning on the spot, not steering input.
      base = Math.max(0, finite(event.seconds)) * 9;
      break;
    case 'flip':
      // BOWL-AIR supplies landed pitch turns; only a full landed rotation counts.
      base = Math.floor(Math.abs(finite(event.pitchTurns))) * 30;
      break;
    default:
      return {points: 0, crowd: meter};
  }
  const points = Math.round(base * (1 + meter / 100));
  return {points, crowd: clamp(meter + Math.max(1, points * CROWD_GAIN_PER_POINT), 0, 100)};
}

export function crowdAfter(crowd, seconds) {
  const meter = clamp(finite(crowd), 0, 100);
  const elapsed = Math.max(0, finite(seconds));
  return clamp(meter * Math.exp(-CROWD_DECAY_PER_SECOND * elapsed), 0, 100);
}

export function scoreFreestyle(events = []) {
  let score = 0;
  let crowd = 0;
  let time = 0;
  const results = [];
  for (const event of events) {
    const at = Math.max(time, finite(event?.atSeconds, time));
    crowd = crowdAfter(crowd, at - time);
    time = at;
    if (event?.type === 'crowdTick') {
      crowd = crowdAfter(crowd, event.seconds);
      time += Math.max(0, finite(event.seconds));
      results.push({type: event.type, points: 0, crowd});
      continue;
    }
    const scored = scoreStuntEvent(event, crowd);
    score += scored.points;
    crowd = scored.crowd;
    results.push({type: event?.type ?? 'unknown', points: scored.points, crowd});
  }
  return {score, crowd, durationSeconds: time, events: results};
}

export function createShowNight(night = 1, eventIndex = 0) {
  const definition = SHOW_NIGHTS[night - 1];
  if (!definition) throw new RangeError('Bowl Show Night must be from 1 to 5');
  return {night, eventIndex: clamp(Math.trunc(finite(eventIndex)), 0, definition.events.length - 1), complete: false};
}

// A loss leaves the player at the same event. A win advances exactly one step.
export function finishShowEvent(state, eventType, won) {
  if (!state || state.complete || !SHOW_NIGHTS[state.night - 1]) return {state, accepted: false, retry: false};
  const expected = SHOW_NIGHTS[state.night - 1].events[state.eventIndex];
  if (eventType !== expected) return {state, accepted: false, retry: false};
  if (!won) return {state: {...state}, accepted: true, retry: true};
  const nextIndex = state.eventIndex + 1;
  if (nextIndex >= SHOW_NIGHTS[state.night - 1].events.length) {
    return {state: {...state, complete: true}, accepted: true, retry: false};
  }
  return {state: {...state, eventIndex: nextIndex}, accepted: true, retry: false};
}
