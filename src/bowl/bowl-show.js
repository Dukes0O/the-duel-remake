// Headless rules for the Bowl show. Inputs are immutable game events; this
// module never writes to a vehicle, physics state, or save.

export const BOWL_EVENTS = Object.freeze({
  CAR_CRUSH: 'carCrush',
  FREESTYLE: 'freestyle',
  SIDE_BY_SIDE: 'sideBySide',
  LAST_TRUCK_ROLLING: 'lastTruckRolling',
  SCRAPASAURUS: 'scrapasaurus',
  LONG_JUMP: 'longJump',
  HIGH_JUMP: 'highJump',
  BEST_TRICK: 'bestTrick',
});

const {CAR_CRUSH, FREESTYLE, SIDE_BY_SIDE, LAST_TRUCK_ROLLING, SCRAPASAURUS, LONG_JUMP, HIGH_JUMP, BEST_TRICK} = BOWL_EVENTS;

function showNight({events, tricks, weapons = [], rivals = {}, freestyle = null, dressing = {}, colours, ...night}) {
  const {lastTruckRolling, ...matchups} = rivals;
  return Object.freeze({...night,
    events: Object.freeze(events), tricks: Object.freeze(tricks), weapons: Object.freeze(weapons),
    rivals: Object.freeze({...matchups, ...(lastTruckRolling ? {lastTruckRolling: Object.freeze(lastTruckRolling)} : {})}),
    freestyle: freestyle && Object.freeze({...freestyle, target: Object.freeze(freestyle.target),
      run: Object.freeze(freestyle.run.map(([at, trick, weight]) => Object.freeze({at, trick, weight})))}),
    dressing: Object.freeze(Object.fromEntries(Object.entries(dressing).map(([event, floor]) => [event, Object.freeze(floor)]))),
    colours: Object.freeze(colours),
  });
}

export const SHOW_NIGHTS = Object.freeze([
  showNight({
    night: 1, name: 'Rookie Night', newTonight: 'Try wheelies, donuts and backflips.',
    events: [CAR_CRUSH, FREESTYLE, SIDE_BY_SIDE], tricks: ['wheelie', 'donut', 'backflip'],
    rivals: {sideBySide: 'old-bess'}, freestyle: {rival: 'old-bess', name: 'Old Bess', target: {easy: 1450, medium: 6000, hard: 12000},
      run: [[6, 'Wheelie', 1], [17, 'Donut', 2], [28, 'Wheelie', 2], [39, 'Donut', 1],
        [50, 'Long wheelie', 3], [61, 'Double donut', 3], [72, 'Long wheelie', 2], [84, 'Cyclone', 4]]},
    dressing: {carCrush: {kind: CAR_CRUSH, busPiles: 1}}, colours: {jets: 0xffcf8b, banner: 0xc78b42},
  }),
  showNight({
    night: 2, name: 'Flip Night', newTonight: 'Clear a row of buses in Long Jump.',
    events: [LONG_JUMP, FREESTYLE, SIDE_BY_SIDE], tricks: ['frontFlip', 'stoppie'],
    rivals: {sideBySide: 'rust-rhino'}, freestyle: {rival: 'rust-rhino', name: 'Rust Rhino', target: {easy: 2250, medium: 7000, hard: 14000},
      run: [[7, 'Crush', 1], [18, 'Front flip', 2], [29, 'Bus crush', 3], [40, 'Front flip', 2],
        [51, 'Crush', 1], [62, 'Double front flip', 4], [73, 'Bus crush', 3], [85, 'Double front flip', 4]]},
    dressing: {longJump: {kind: LONG_JUMP}, freestyle: {kind: LONG_JUMP}}, colours: {jets: 0xb7deff, banner: 0x5b96bb},
  }),
  showNight({
    night: 3, name: 'Hammer Night', newTonight: 'Swing a hammer and crush two Bus Piles.',
    events: [CAR_CRUSH, FREESTYLE, LAST_TRUCK_ROLLING], tricks: ['spin'], weapons: ['hammer'],
    rivals: {lastTruckRolling: ['big-kettle', 'tin-lizard', 'old-bess']},
    freestyle: {rival: 'tin-lizard', name: 'Tin Lizard', target: {easy: 3000, medium: 8000, hard: 16000},
      run: [[6, 'Spin', 1], [17, 'Spin and flip', 3], [28, 'Double spin', 2], [39, 'Quick combo', 3],
        [50, 'Spin', 1], [61, 'Spin and roll', 3], [72, 'Double spin', 2], [84, 'Triple spin', 4]]},
    dressing: {carCrush: {kind: CAR_CRUSH, busPiles: 2}, freestyle: {kind: 'freestyleBusPiles'}}, colours: {jets: 0xffad72, banner: 0xb9704d},
  }),
  showNight({
    night: 4, name: 'Barrel Roll Night', newTonight: 'Land a barrel roll and fight with a saw.',
    events: [HIGH_JUMP, BEST_TRICK, LAST_TRUCK_ROLLING], tricks: ['barrelRoll'], weapons: ['hammer', 'saw'],
    rivals: {lastTruckRolling: ['rust-rhino', 'tin-lizard', 'big-kettle']},
    dressing: {highJump: {kind: HIGH_JUMP}}, colours: {jets: 0xc9f9a3, banner: 0x7aa75a},
  }),
  showNight({
    night: 5, name: 'Scrapasaurus Night', newTonight: 'Face the Scrapasaurus and try the launcher.',
    events: [FREESTYLE, LAST_TRUCK_ROLLING, SCRAPASAURUS], tricks: ['sideFlip', 'doubles'],
    weapons: ['hammer', 'saw', 'launcher'],
    rivals: {lastTruckRolling: ['dragon-wagon', 'rust-rhino', 'tin-lizard']},
    freestyle: {rival: 'dragon-wagon', name: 'Dragon Wagon', target: {easy: 3330, medium: 10000, hard: 20000},
      run: [[7, 'Big air', 1], [18, 'Double backflip', 3], [29, 'Double spin', 2], [40, 'Big air', 1],
        [51, 'Double barrel roll', 3], [62, 'Double front flip', 3], [73, 'Big air', 2], [85, 'Double combo', 5]]},
    dressing: {freestyle: {kind: HIGH_JUMP, barHeight: Object.freeze({easy: 8, medium: 10, hard: 12})}},
    colours: {jets: 0xff937c, banner: 0xa94c43},
  }),
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
// BOWL-HOOKS (Claude's review, 20 November 2026): at 0.0015 a point and 12 percent a second the
// meter peaked near 8 and Big Mo's crowd lines were never reached. On the 286 m Bowl (BOWL-EXPAND)
// stunts come further apart, so it fades slowly: a 35-point kicker adds 7, a Freestyle of kickers
// alone peaks near 40, and a good one (big air, launches, flips) passes 50.
const CROWD_DECAY_PER_SECOND = 0.03;
const CROWD_GAIN_PER_POINT = 0.2;

// Big air scores most (BOWL-HOOKS, for the 286 m Bowl of BOWL-EXPAND): each metre of a
// jump's highest point above the first pays 8, so the 4 m kickers add 24 and the 10 m
// Big Jump adds 72. A jump without a measured height scores as before.
const heightBonus = event => Math.max(0, finite(event.heightMeters) - 1) * 8;

const AIR_TRICK_POINTS = {frontFlip: 50, backflip: 50, spin: 30, barrelRoll: 60, sideFlip: 80};

export function landingPoints(kind, turns, combo, landing) {
  if (landing === 'slam') return 0;
  return AIR_TRICK_POINTS[kind] * turns ** 2 * (1 + .5 * (combo - 1)) * (landing === 'slide' ? .5 : 1);
}

export function trickVariety(history, kind) {
  const fresh = !history.seen.has(kind);
  history.repeat = history.last === kind ? Math.max(.4, history.repeat * .8) : 1;
  history.last = kind;
  history.seen.add(kind);
  return {fresh, repeat: history.repeat};
}

// A completed trick carries its base points; the night adds variety and crowd.
export function scoreStuntEvent(event, crowd = 0) {
  if (!event || typeof event !== 'object') return {points: 0, crowd: clamp(finite(crowd), 0, 100)};
  const meter = clamp(finite(crowd), 0, 100);
  const outsidePoints = event.type === 'bowlOverWall' ? (event.repeat ? 75 : 150)
    : event.type === 'bowlBackIn' ? 40 : event.type === 'bowlInStands' ? event.points : null;
  if (outsidePoints != null) return {points: outsidePoints, crowd: clamp(meter + outsidePoints * CROWD_GAIN_PER_POINT, 0, 100)};
  let base = 0;
  switch (event.type) {
    case 'landedJump':
      base = 20 + Math.max(0, finite(event.durationSeconds)) * 8 + Math.max(0, finite(event.distanceMeters)) * 0.35 + heightBonus(event);
      break;
    case 'carLaunch':
      base = 45 + Math.max(0, finite(event.durationSeconds)) * 12 + Math.max(0, finite(event.distanceMeters)) * 0.55 + heightBonus(event);
      break;
    case 'busClear':
    case 'barClear':
      base = finite(event.points);
      break;
    case 'crush':
      base = 35;
      break;
    case 'bowlTrick':
      if (event.landing === 'slam') return {points: 0, crowd: meter * 2 / 3};
      base = finite(event.points) * (event.fresh ? 1.5 : event.repeat ?? 1);
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
