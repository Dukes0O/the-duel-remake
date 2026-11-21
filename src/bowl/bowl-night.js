// Show Night in the game (BOWL-HOOKS; docs/WASTELAND_WORLD.md section 7). The
// night's events run here from the show's rules in bowl-show.js, on the Bowl
// course, from seed and inputs alone: no DOM, no graphics, no storage. The Duel
// calls stepBowlNight at the start of each fixed step and observeBowlNight for
// each event it emits; the app reads state.bowlNight to draw the HUD and the
// results, and settles the purse with settleShowNight.
//
// Hooks for the cards that build on this one:
// - BOWL-RIVALS (src/bowl/bowl-rivals.js) registers 'sideBySide' and
//   'lastTruckRolling' with registerBowlEventRunner; its rivals come in through
//   runner.place().
// - BOWL-TURNS runs one event per player from the same runners: every finished
//   attempt is in night.attempts, and startBowlNight takes the playerId. A turn
//   (`turn: {driver}`, `eventIndex`) is one go at one event: it ends in the
//   'turn' phase, pays nothing and cannot be retried (src/bowl/bowl-turns.js).
// - BOWL-REX-FIGHT registers its own runner for night five and adds its lines
//   to BIG_MO in bowl-lines.js.
import {secretOf, secretHint} from './bowl-secrets.js';
import {SHOW_NIGHTS, createShowNight, crowdAfter, finishShowEvent,
  scoreStuntEvent} from './bowl-show.js';
import {observeBowlOutside} from './bowl-outside.js';
import {recordBowlScore, settleBowlNight} from './bowl-save.js';
import {BIG_MO, BOWL_EVENT_NAMES, BOWL_GOALS, bowlCrushCues, bowlCrushKind} from './bowl-lines.js';
import {BOWL_COURSE} from './bowl-course.js';
import {BOWL_SCHOOL_REASONS, featuredSchoolTrick, isSchoolTrick, nextSchoolLesson} from './bowl-school.js';
import {CAR_CRUSH_DRESSING} from './bowl-crush-field.js';
import {CARS, COURSE} from '../config.js';
import {DEFAULT_DRIVER} from '../drivers.js';
import {freshDamageZones} from '../sim-common.js';

export const SHOW_TRUCK = 'titan_monster';

const DIFFICULTIES = ['easy', 'medium', 'hard'];

// Design numbers for Claude's review; BOWL-FINISH tunes them in play.
export const BOWL_NIGHT_RULES = Object.freeze({
  carCrush: Object.freeze({runUpMetres: 8, timeLimitSec: 60,
    target: Object.freeze({easy: 13, medium: 18, hard: 26}),
    chainSec: 3, chainStep: .25, maxChainMultiplier: 2.5,
    pancakeMultiplier: 3, fullHousePointsPerSecond: 20}),
  // On the 286 m Bowl a child-pace lap takes over 20 seconds, so about four laps fit in 90 seconds.
  // Measured with tools/bowl-freestyle-balance.mjs: Easy is a few jumps (a child-pace driver wins
  // 9 of 10); Medium and Hard need the Big Jump and the Table at speed, launches and flips.
  freestyle: Object.freeze({timeLimitSec: 90, target: Object.freeze({easy: 310, medium: 1810, hard: 4260})}),
  // Each rival's own pace is in src/bowl/bowl-rivals.js (BOWL-RIVALS); the lanes are bowlLayout's.
  sideBySide: Object.freeze({timeLimitSec: 75}),
  minJumpSec: .5,
  bigJumpSec: 1.2,
  captionSec: 4,
  crowdMarks: Object.freeze([25, 50, 75, 100]),
});

// Scrap paid the first time each night is won (bowl-save.js pays a night once).
// Not settled by the design page: docs/board/questions/BOWL-HOOKS.md.
export const BOWL_PURSE = Object.freeze([250, 300, 350, 400, 600]);

// bowl-show.js names events in camelCase, bowl-save.js in kebab case.
export const SAVE_EVENT_IDS = Object.freeze({carCrush: 'car-crush', freestyle: 'freestyle',
  sideBySide: 'side-by-side', lastTruckRolling: 'last-truck-rolling'});

// The truck for the night: the player's own Titan, or the show's truck lent at
// factory settings. A lent truck is only this race's car; nothing adds it to a save.
export function showTruckFor({owned = false, upgrades = {}} = {}) {
  return {car: SHOW_TRUCK, lent: owned !== true, upgrades: owned === true ? {...upgrades} : {}};
}

const difficultyOf = night => DIFFICULTIES.includes(night?.cpuDifficulty) ? night.cpuDifficulty : 'medium';
const standInStage = () => Math.max(0, COURSE.findIndex(course => course.id === 'titan-arena'));
const flagOn = duel => duel.featureFlags?.enabled('titan-bowl') === true;

// ---- event runners ------------------------------------------------------

const RUNNERS = new Map();

// runner: {laps, place(duel, night), target(night, course), goal(night, course), step(duel, night, dt)}.
// step returns null while the event runs, or {won, ...facts} when it ends.
export function registerBowlEventRunner(type, runner) {
  if (typeof type !== 'string' || !runner || typeof runner.step !== 'function' ||
      typeof runner.place !== 'function') throw new TypeError('A Bowl event needs place and step.');
  RUNNERS.set(type, Object.freeze({laps: 99, target: () => null, goal: () => '', ...runner}));
}
export const bowlEventRunner = type => RUNNERS.get(type) ?? null;
export const bowlNightPlayable = night => !!SHOW_NIGHTS[night - 1] &&
  SHOW_NIGHTS[night - 1].events.every(type => RUNNERS.has(type));

export function startBowlEventAt(duel, s0, lateral) {
  const s = duel.state;
  s.s = s.prevS = s0; s.lateral = s.prevLateral = lateral;
  s.nextLapGate = duel._lapGates.filter(gate => gate <= s0).length;
}

// One computer truck on the other lane, on the existing rival rules at the
// night's CPU level. BOWL-RIVALS (src/bowl/bowl-rivals.js) names it and sets its pace.
export function addComputerTruck(duel, {s: start = 0, lateral = 0, car = SHOW_TRUCK} = {}) {
  const upgrades = Object.fromEntries(Object.keys(duel.state.upgrades || {}).map(key =>
    [key, CARS[car].factoryMaxed ? 3 : 0]));
  const truck = {car, driverId: DEFAULT_DRIVER, upgrades, s: start, prevS: start, lateral, prevLateral: lateral,
    speedMph: 0, finished: false, finishTime: null, headingError: 0, yawVelocity: 0, pushVelocity: 0,
    offRoad: false, contactCooldown: 0, boost: 1, boosting: false, damageZones: freshDamageZones(),
    damageCooldown: 0, airborne: false, airHeight: 0, _jumpY: null, _verticalSpeed: 0, _jumpOrigin: null,
    completedLaps: 0, nextLapGate: duel._lapGates.filter(gate => gate <= start).length,
    lapTimes: [], lapStartedAt: 0};
  duel.state.opponents.push(truck);
  duel.rivalSpec = CARS[car];
  return truck;
}

// Where each event happens. The Bowl gives the show's places as data in
// course.features.bowl (BOWL-EXPAND): the crush line, the launch cars, the two
// mirrored lanes and the start. A course without them falls back to its own
// shapes: the crush line's rows (crushables), the ramps and the floor's width.
// Nothing here is a fixed distance, so a rebuilt Bowl moves the events with it.
const LAYOUTS = new WeakMap();
export function bowlLayout(course) {
  if (LAYOUTS.has(course)) return LAYOUTS.get(course);
  const features = course.features, show = features.bowl ?? null, props = features.crushables || [];
  const rowS = [...new Set(props.map(prop => prop.s))].sort((a, b) => a - b);
  const rows = rowS.map(s => {
    const first = props.find(prop => prop.s === s);
    return {s, kind: first.sourceKind ?? first.kind, end: Math.max(...props.filter(prop => prop.s === s).map(prop => prop.s + prop.halfZ))};
  });
  const firstRow = rows[0]?.s ?? 0, lineEnd = rows.length ? Math.max(...rows.map(row => row.end)) : 0;
  const runUp = BOWL_NIGHT_RULES.carCrush.runUpMetres;
  const floorHalf = course.def.scrapdome?.floorHalfWidth ?? course.roadHalfWidthAt(0);
  // Without the show's own launch cars, they go in the longest stretch of clear
  // floor between the ramps and the crush line that does not cross the start line.
  const parked = () => {
    const crushStart = firstRow - Math.min(...props.filter(prop => prop.s === firstRow).map(prop => prop.halfZ));
    const busy = [...(features.ramps || []).map(ramp => [ramp.start, ramp.end]),
      ...(rows.length ? [[crushStart, lineEnd]] : [])].sort((a, b) => a[0] - b[0]);
    let gap = [0, course.length], at = 0;
    for (const [start, end] of [...busy, [course.length, course.length]]) {
      if (start - at > gap[1] - gap[0] || gap[0] === 0 && gap[1] === course.length) gap = [at, start];
      at = Math.max(at, end);
    }
    return [1 / 3, 2 / 3].map((share, index) => ({s: +(gap[0] + (gap[1] - gap[0]) * share).toFixed(2),
      dir: index ? -1 : 1, lateral: (index ? 1 : -1) * floorHalf / 2}));
  };
  const crush = show?.crush ? {startS: show.crush.startS, lateral: show.crush.lateral ?? 0,
    firstRowS: show.crush.firstRowS ?? firstRow, endS: show.crush.endS, leftS: show.crush.leftS}
    : {startS: firstRow - runUp, lateral: 0, firstRowS: firstRow, endS: lineEnd + 3, leftS: firstRow - runUp - 20};
  const lanes = show?.lanes?.length >= 2 ? show.lanes
    : [{s: 0, lateral: 0}, {s: course.length / 2, lateral: 0}];
  const layout = Object.freeze({
    rows: Object.freeze(rows),
    crush: Object.freeze(crush),
    parked: Object.freeze((show?.launchCars ?? parked()).map(car => Object.freeze({s: car.s, lateral: car.lateral, dir: car.dir ?? 1}))),
    // Side by Side: the player on the first lane, the computer truck on the second.
    lanes: Object.freeze(lanes.slice(0, 2).map(lane => Object.freeze({s: lane.s, lateral: lane.lateral ?? 0}))),
    start: Object.freeze(show?.start ?? {s: 0, lateral: 0}),
  });
  LAYOUTS.set(course, layout);
  return layout;
}

export const crushTarget = night => BOWL_NIGHT_RULES.carCrush.target[difficultyOf(night)];
const CRUSH_POINTS = Object.freeze({car: 35, bus: 60, stack: 80, pile: 200});
const CHAIN_TICK_INTERVAL = .12;

function playCrushChainTick(duel, night) {
  const event = night.event;
  if (!event?.chainTicks || night.clock < event.nextChainTick) return;
  event.chainTicks--;
  event.nextChainTick = night.clock + CHAIN_TICK_INTERVAL;
  duel.emit({bowlScore: {type: 'crushChain', points: 0, score: event.score, cue: 'bowl.crush.chain'}});
}

registerBowlEventRunner('carCrush', {
  dressing: CAR_CRUSH_DRESSING,
  timeLimitSec: BOWL_NIGHT_RULES.carCrush.timeLimitSec,
  target: crushTarget,
  goal: night => BOWL_GOALS.carCrush(crushTarget(night)),
  place(duel, night) {
    const line = bowlLayout(duel.course).crush;
    startBowlEventAt(duel, line.startS, line.lateral);
    Object.assign(night.event, {count: 0, chain: 0, lastCrushAt: -Infinity, chainTicks: 0, nextChainTick: 0,
      crushIds: new Set(), total: duel.course.features.crushables.length, fullHouseBonus: 0});
  },
  observe(duel, {event}, ev) {
    const hit = ev.propCrushed;
    if (!hit?.byPlayer || !duel.course.features.crushables.some(prop => prop.id === hit.id)) return;
    const at = duel.state.stageTimeSec, rules = BOWL_NIGHT_RULES.carCrush;
    const kind = bowlCrushKind(hit.kind);
    const ids = (hit.groupIds ?? [hit.id]).filter(id => !event.crushIds.has(id));
    if (!ids.length) return;
    if (at - event.lastCrushAt > rules.chainSec) event.chain = 0;
    event.lastCrushAt = at;
    const before = event.chain;
    const cues = bowlCrushCues({kind: hit.kind, pancake: hit.pancake}).map(item => item.cue);
    let awardedPoints = 0;
    for (const [index, id] of ids.entries()) {
      event.crushIds.add(id);
      event.count++;
      event.chain++;
      const multiplier = Math.min(rules.maxChainMultiplier, 1 + (event.chain - 1) * rules.chainStep);
      const points = index === 0
        ? Math.round(CRUSH_POINTS[kind] * multiplier * (hit.pancake ? rules.pancakeMultiplier : 1)) : 0;
      awardedPoints += points;
      event.score += points;
      duel.state.crushCount = event.count;
      duel.state.crushScore += points;
      duel.emit({bowlCrush: {id, kind, chain: event.chain, pancake: !!hit.pancake, count: event.count, points,
        cues: index === 0 ? cues : []}});
    }
    const crowd = scoreStuntEvent({type: 'crush'}, crowdAfter(event.crowd, at - event.crowdAt)).crowd;
    event.crowd = crowd;
    event.crowdAt = at;
    event.crowdPeak = Math.max(event.crowdPeak, crowd);
    // A pile can form three links at once. Give each bonus link its own tick.
    event.chainTicks += event.chain - Math.max(1, before);
    duel.emit({bowlScore: {type: 'crush', points: awardedPoints, score: event.score, crowd, cue: null}});
    if (hit.pancake) say(duel, 'crush.pancake');
  },
  step(duel, night) {
    const at = duel.state.stageTimeSec, {event} = night, rules = BOWL_NIGHT_RULES.carCrush;
    if (at - event.lastCrushAt > rules.chainSec) event.chain = 0;
    const fullHouse = event.count === event.total;
    if (!fullHouse && at + 1e-8 < rules.timeLimitSec) return null;
    if (fullHouse) {
      event.fullHouseBonus = Math.floor(Math.max(0, rules.timeLimitSec - at + 1e-8)) * rules.fullHousePointsPerSecond;
      event.score += event.fullHouseBonus;
      duel.emit({bowlFullHouse: {count: event.count, bonus: event.fullHouseBonus, score: event.score},
        bowlScore: {type: 'fullHouse', points: event.fullHouseBonus, score: event.score, cue: 'bowl.crush.fullhouse'}});
    }
    return {won: event.count >= crushTarget(night), fullHouse};
  },
  result: event => ({count: event.count, total: event.total, fullHouseBonus: event.fullHouseBonus}),
});

// Two parked cars on the ring in Freestyle, so the Titan's launch off cars
// (FUN-TITAN-LAUNCH, docs/board/decisions.md "Keep these") can be done in the
// show. They are ordinary parked traffic: the launch rules are not touched.
// Where they stand comes from bowlLayout(course).parked.
registerBowlEventRunner('freestyle', {
  place(duel) {
    const layout = bowlLayout(duel.course);
    startBowlEventAt(duel, layout.start.s, layout.start.lateral);
    duel.state.traffic = layout.parked.map(({s, dir, lateral}) => {
      return {s, prevS: s, lateral, prevLateral: lateral, dir, speedMph: 0, headingError: 0, pushVelocity: 0,
        car: 'falcone_f42', alive: true, damageZones: freshDamageZones(), damageCooldown: 0, bowlParked: true};
    });
  },
  target: night => BOWL_NIGHT_RULES.freestyle.target[difficultyOf(night)],
  goal: night => BOWL_GOALS.freestyle(BOWL_NIGHT_RULES.freestyle.target[difficultyOf(night)].toLocaleString(), night.night),
  timeLimitSec: BOWL_NIGHT_RULES.freestyle.timeLimitSec,
  step(duel, night) {
    if (duel.state.stageTimeSec < BOWL_NIGHT_RULES.freestyle.timeLimitSec) return null;
    return {won: night.event.score >= BOWL_NIGHT_RULES.freestyle.target[difficultyOf(night)]};
  },
});

// Side by Side and Last Truck Rolling are registered by src/bowl/bowl-rivals.js.

// ---- the night ----------------------------------------------------------

export function featuredBowlTricks(number) {
  const tricks = SHOW_NIGHTS[number - 1]?.tricks;
  return Array.isArray(tricks) ? tricks.filter(kind => isSchoolTrick(kind) || kind === 'doubles') : [];
}

function placeSchoolLesson(duel, night, fromPicker = false) {
  const lesson = nextSchoolLesson(night.school.completed), event = night.event;
  event.lesson = lesson?.kind ?? null;
  event.schoolFailures = [];
  event.schoolReason = null;
  if (!lesson && !fromPicker) return;

  const {course, state} = duel;
  const table = course.features.ramps.find(ramp => ramp.id === 'table');
  const start = lesson?.air ? {s: table.start - 27, lateral: table.off} : {s: 5, lateral: 9};
  startBowlEventAt(duel, start.s, start.lateral);
  const y = course.groundAt(start.s, start.lateral).y;
  Object.assign(state, {speedMph: 0, headingError: 0, yawVelocity: 0, pushVelocity: 0, slipAngle: 0,
    groundHeight: y, prevGroundHeight: y, airborne: false, airHeight: 0, prevAirHeight: 0,
    _jumpY: y, _verticalSpeed: 0, _jumpOrigin: null, _airOrigin: null, airDistance: 0, airTime: 0});
  event.flight = null;
}

registerBowlEventRunner('trickSchool', {
  place(duel, night) { placeSchoolLesson(duel, night, true); },
  step(duel, night) {
    const event = night.event;
    if (event.schoolNext && !duel.state.airborne) {
      event.schoolNext = false;
      placeSchoolLesson(duel, night);
      const finished = event.lesson == null;
      if (finished) say(duel, 'school.done');
      duel.emit({bowlSchool: {type: finished ? 'done' : 'next', lesson: event.lesson,
        cue: finished ? 'bowl.school.done' : 'bowl.school.next'}});
    }
    return null;
  },
  observe(duel, night, ev) {
    const {event, school} = night, move = ev.bowlTrick;
    if (!move || event.schoolNext || event.lesson !== move.kind || move.landing === 'slam' || move.points <= 0) return;
    school.completed.push(move.kind);
    event.schoolNext = true;
    duel.emit({bowlSchool: {type: 'tick', lesson: move.kind, playerId: night.playerId,
      completed: [...school.completed], cue: 'bowl.school.tick'}});
  },
});

function explainBowlTry(duel, night, ev) {
  const event = night.event, late = ev.bowlTrickLate, trick = ev.bowlTrick;
  let reason = ev.bowlTrickTry?.reason;
  if (late) reason = late.turnsCompleted ? 'shortDouble' : 'keyLate';
  else if (trick?.landing === 'slam') reason = 'roof';
  else if (trick?.kind === 'barrelRoll' && event.lesson === 'sideFlip') reason = 'rollDirection';
  if (!BOWL_SCHOOL_REASONS[reason] || event.schoolFailures?.includes(reason)) return;
  (event.schoolFailures ??= []).push(reason);
  event.schoolReason = {text: BOWL_SCHOOL_REASONS[reason], until: night.clock + 5};
  duel.emit({bowlSchool: {type: 'why', reason, cue: 'bowl.school.why'}});
}

export const bowlEventType = night => night.school ? 'trickSchool' : SHOW_NIGHTS[night.night - 1]?.events[night.show.eventIndex] ?? null;

// Big Mo speaks one caption at a time. The show's own lines (a night, an event,
// a result) wait their turn and push out any remark still waiting; a remark on
// a stunt or the crowd is made only when Big Mo is not already talking.
const REMARK = /^(moment|crowd)\./;
export function sayBowlLine(duel, id, options) { say(duel, id, options); }
function say(duel, id, {once = false} = {}) {
  const night = duel.state.bowlNight;
  if (!night || !BIG_MO[id] || once && night.said.includes(id)) return;
  if (REMARK.test(id)) {
    if (night.caption || night.captionQueue.length) return;
  } else {
    night.captionQueue = night.captionQueue.filter(waiting => !REMARK.test(waiting.id));
    if (night.caption && REMARK.test(night.caption.id)) night.caption = null;
  }
  if (once) night.said.push(id);
  night.captionQueue.push({id, queuedAt: night.clock});
  if (!night.caption) nextCaption(duel);
}
function nextCaption(duel) {
  const night = duel.state.bowlNight;
  while (night.captionQueue[0] && night.clock - night.captionQueue[0].queuedAt >= 6) night.captionQueue.shift();
  const id = night.captionQueue.shift()?.id;
  night.caption = id ? {id, text: BIG_MO[id], until: night.clock + BOWL_NIGHT_RULES.captionSec} : null;
  if (id) duel.emit({bowlCaption: {id, text: BIG_MO[id], cue: 'bowl.mo'}});
}

// Starts a night. options: {night, playerId, driverId, difficulty, cpuDifficulty,
// seed, owned, upgrades, eventIndex, turn, rivals}. `rivals` (rival ids, for
// tests) chooses who drives against the player instead of the night's own.
// Returns false when the night cannot run.
export function startBowlNight(duel, options = {}) {
  const school = options.school;
  const number = school ? 1 : options.night;
  if (!flagOn(duel) || !Number.isSafeInteger(number) || !bowlNightPlayable(number) || (school && options.turn)) return false;
  const truck = showTruckFor(options);
  const eventCount = SHOW_NIGHTS[number - 1].events.length, eventIndex = options.eventIndex ?? 0;
  if (!Number.isSafeInteger(eventIndex) || eventIndex < 0 || eventIndex >= eventCount) return false;
  // A Turn Show go (BOWL-TURNS): the driver's name is for the HUD only.
  const turn = options.turn ? {driver: typeof options.turn.driver === 'string' ? options.turn.driver : ''} : null;
  duel.state.bowlNight = {
    version: 1, night: number, show: createShowNight(number, eventIndex), phase: 'event', turn,
    school: school ? {completed: [...new Set((Array.isArray(school.completed) ? school.completed : []).filter(isSchoolTrick))]} : null,
    featuredTricks: school ? [] : featuredBowlTricks(number),
    cpuDifficulty: school ? 'easy' : DIFFICULTIES.includes(options.cpuDifficulty) ? options.cpuDifficulty : 'medium',
    lent: truck.lent, start: {car: truck.car, upgrades: truck.upgrades, playerId: options.playerId ?? null,
      driverId: options.driverId, difficulty: options.difficulty, seed: options.seed},
    playerId: options.playerId ?? null, clock: 0, caption: null, captionQueue: [], said: [],
    event: null, attempts: [], lastResult: null, resultAt: null, result: null, trickKinds: [], foundTricks: [...(options.foundTricks ?? [])],
    rivals: Array.isArray(options.rivals) ? options.rivals.filter(id => typeof id === 'string').slice(0, 3) : null,
  };
  loadBowlEvent(duel);
  return true;
}

function loadBowlEvent(duel) {
  const night = duel.state.bowlNight, type = bowlEventType(night), runner = RUNNERS.get(type);
  const attempt = 1 + night.attempts.filter(entry => entry.event === type && entry.eventIndex === night.show.eventIndex).length;
  duel._bowlEventCourse = {...BOWL_COURSE, laps: runner.laps, ...(runner.dressing ? {bowlDressing: runner.dressing} : {})};
  duel.startCampaign({...night.start, startStage: standInStage(), mode: 'duel', opponentCount: 0,
    cpuDifficulty: night.cpuDifficulty, rival: null});
  const s = duel.state;
  s.bowlNight = night;
  delete s.bowlOutside;
  night.phase = 'event';
  night.caption = null;
  night.captionQueue.length = 0;
  night.event = {type, eventIndex: night.show.eventIndex, attempt, facts: [], score: 0, crowd: 0, crowdAt: 0,
    crowdPeak: 0, crowdMark: 0,
    flight: null, metres: 0, playerDoneAt: null, rivalDoneAt: null};
  runner.place(duel, night);
  if (night.school) { s.status = 'racing'; s.countdown = 0; }
  else say(duel, night.turn ? 'turn.open' : `event.${type}.intro`);
}

// The next event after a result, or the same event again after a loss.
export function continueBowlNight(duel) {
  const night = duel.state.bowlNight;
  if (!night || night.phase !== 'result') return false;
  loadBowlEvent(duel);
  return true;
}

// Start the running event again (the pause screen's restart). Nothing is recorded.
// A Turn Show go is one go only, so it has no restart.
export function retryBowlEvent(duel) {
  const night = duel.state.bowlNight;
  if (!night || night.phase !== 'event' || night.turn) return false;
  loadBowlEvent(duel);
  return true;
}

function addFact(duel, fact, cue = 'bowl.crowd.rise') {
  const s = duel.state, night = s.bowlNight, event = night.event, at = s.stageTimeSec;
  const timed = {...fact, atSeconds: at};
  if (fact.type === 'bowlTrick' && featuredSchoolTrick(fact, night.featuredTricks)) timed.points *= 2;
  const crowd = crowdAfter(event.crowd, at - event.crowdAt);
  const scored = scoreStuntEvent(timed, crowd);
  if (fact.type === 'bowlTrick' && scored.points > 0) {
    if (!night.trickKinds.includes(fact.kind)) night.trickKinds.push(fact.kind);
    const earlier = event.trickPopups?.[0]?.at === night.clock ? event.trickPopups : [];
    event.trickPopups = [...earlier, {kind: fact.kind, turns: fact.turns, fresh: fact.fresh, at: night.clock,
      base: timed.points * (fact.fresh ? 1.5 : fact.repeat ?? 1), multiplier: 1 + crowd / 100, points: scored.points}];
  }
  event.facts.push(timed);
  event.crowd = scored.crowd; event.crowdAt = at; event.score += scored.points;
  event.crowdPeak = Math.max(event.crowdPeak, scored.crowd);
  duel.emit({bowlScore: {type: fact.type, points: scored.points, score: event.score, crowd: scored.crowd, cue: scored.points ? cue : null}});
  const mark = BOWL_NIGHT_RULES.crowdMarks.filter(value => scored.crowd >= value).at(-1);
  if (mark > event.crowdMark) { event.crowdMark = mark; say(duel, `crowd.${mark}`); }
}

// Facts that the Duel announces: launches off cars and crushes. Other jumps are
// counted from the truck's own landings (observeTruck), because the Duel names a
// jump once a lap and on the Bowl a truck goes back to the same jump many times.
export function observeBowlNight(duel, ev) {
  const s = duel.state, night = s.bowlNight;
  if (!night || night.phase !== 'event' || s.status !== 'racing' || !night.event) return;
  explainBowlTry(duel, night, ev);
  // Count the Rex hold from the fall, including any time spent dragging the final box.
  if (ev.bowlRex?.type === 'fall') night.event.resultHoldSince ??= night.clock;
  if (ev.bowlSecretFound) {
    const secret = secretOf(ev.bowlSecretFound.kind);
    if (secret) {
      night.event.crowd = night.event.crowdPeak = 100;
      night.event.crowdAt = s.stageTimeSec;
      night.event.trickPopups = [{notice: 'SECRET TRICK FOUND', detail: secret.name, at: night.clock}];
      say(duel, 'secret.' + secret.id);
      if (night.foundTricks.length === 7) say(duel,'secret.all');
    }
  }
  if (ev.bowlSecretArmed) {
    night.event.trickPopups = [{notice: 'FULL WORKS ARMED', at: night.clock}];
    say(duel, 'secret.armed');
  }
  if (ev.bowlTrickLate) night.event.trickPopups = [{notice: 'NOT ENOUGH AIR', at: night.clock}];
  if (ev.bowlTrick) {
    const trick = ev.bowlTrick;
    if (trick.landing !== 'slam' || night.cpuDifficulty !== 'easy') addFact(duel, {type: 'bowlTrick', ...trick});
    if (trick.landing === 'slam') say(duel, 'moment.roof', {once: true});
    else if (trick.kind === 'donut') say(duel, 'moment.donut', {once: true});
    else if (['frontFlip', 'backflip', 'sideFlip'].includes(trick.kind)) say(duel, 'moment.flip', {once: true});
  }
  if (ev.jumpLanded?.rampId === 'car') {
    addFact(duel, {type: 'carLaunch', durationSeconds: +(s.airTime || 0).toFixed(3), distanceMeters: ev.jumpLanded.distance || 0,
      heightMeters: +(night.event.flight?.peak ?? 0).toFixed(2)});
    say(duel, 'moment.carLaunch', {once: true});
  }
  if (ev.propCrushed?.byPlayer) {
    if (night.event.type !== 'carCrush') addFact(duel, {type: 'crush'});
    say(duel, 'moment.crush', {once: true});
  }
  RUNNERS.get(night.event.type)?.observe?.(duel, night, ev);
}

// Measure ordinary jumps from the truck's flight.
function observeTruck(duel, dt) {
  const s = duel.state, event = s.bowlNight.event;
  // Every landing on the wheels after a real flight scores as a jump; a launch
  // off a car is scored from the Duel's own landing event, and the short hop a
  // crush gives is too brief to count.
  if (s.airborne && !event.flight) event.flight = {carRamp: s._jumpOrigin?.carRamp === true, peak: 0};
  if (s.airborne && event.flight) event.flight.peak = Math.max(event.flight.peak, s.airHeight || 0);
  else if (!s.airborne && event.flight) {
    const flight = event.flight, airTime = s.airTime || 0;
    event.flight = null;
    if (s.bowlLanding !== 'slam' && !flight.carRamp && !s.tumble && airTime >= BOWL_NIGHT_RULES.minJumpSec) {
      addFact(duel, {type: 'landedJump', durationSeconds: +airTime.toFixed(3), distanceMeters: +(s.airDistance || 0).toFixed(1),
        heightMeters: +flight.peak.toFixed(2)});
      if (airTime >= BOWL_NIGHT_RULES.bigJumpSec) say(duel, 'moment.bigJump', {once: true});
    }
  }

}

function finishEvent(duel, outcome) {
  const s = duel.state, night = s.bowlNight, event = night.event;
  const measured = RUNNERS.get(event.type)?.result?.(event);
  const result = {...outcome, event: event.type, eventIndex: event.eventIndex, attempt: event.attempt,
    won: outcome.won === true, score: event.score, ...measured,
    metres: +event.metres.toFixed(1),
    crowdPeak: +event.crowdPeak.toFixed(1), playerId: night.playerId};
  night.attempts.push(result);
  night.lastResult = result;
  night.resultAt = night.clock;
  night.caption = null;
  night.captionQueue.length = 0;
  night.show = finishShowEvent(night.show, event.type, result.won).state;
  night.phase = night.turn ? 'turn' : night.show.complete ? 'complete' : 'result';
  s.status = 'bowl_break'; s.boosting = false;
  duel.emit({bowlEventResult: result, cue: result.won ? 'bowl.event.won' : 'bowl.event.lost'});
  // A Turn Show go ends here: the Turn Show keeps the scores and pays any purse.
  if (result.fullHouse) say(duel, 'moment.fullHouse');
  else if (night.turn) say(duel, result.won ? 'turn.won' : 'turn.lost');
  else say(duel, `event.${result.won ? 'won' : 'lost'}.${event.type}`);
  if (night.turn) return;
  if (night.phase === 'complete') {
    const won = night.attempts.filter(entry => entry.won);
    const bests = {};
    for (const entry of night.attempts) bests[entry.event] = Math.max(bests[entry.event] ?? 0, entry.score);
    night.result = {night: night.night, won: true, score: won.reduce((sum, entry) => sum + entry.score, 0),
      events: won.map(entry => ({event: entry.event, score: entry.score})), bests,
      purse: BOWL_PURSE[night.night - 1], lent: night.lent, playerId: night.playerId};
    night.secretHint = secretHint((night.start.seed ?? 1989) + night.night, night.foundTricks);
    if (night.secretHint) duel.emit({bowlSecretHint: {cue: 'bowl.secret.hint'}});
    duel.emit({bowlNightResult: night.result});
    say(duel, 'night.won');
  }
}

// Called by Duel.step at the start of every fixed step while a night is on.
// Returns true when the step must do nothing more.
export function stepBowlNight(duel, dt) {
  const s = duel.state, night = s.bowlNight;
  if (!night) return false;
  night.clock += dt;
  if (night.caption && night.clock >= night.caption.until) nextCaption(duel);
  playCrushChainTick(duel, night);
  if (night.phase !== 'event') return true;
  if (s.status === 'gameover') {
    if (s.impactTimer > 0) return false;
    if (night.school) { loadBowlEvent(duel); return true; }
    finishEvent(duel, {won: false, wrecked: true});
    return true;
  }
  if (s.status !== 'racing') return false;
  observeBowlOutside(duel, dt, addFact, say);
  observeTruck(duel, dt);
  const done = RUNNERS.get(night.event.type).step(duel, night, dt);
  if (!done) return false;
  finishEvent(duel, done);
  return true;
}

// What the HUD shows, read from the state only.
export function bowlHudView(state, course) {
  const night = state?.bowlNight, event = night?.event;
  if (!night || !event) return null;
  const runner = RUNNERS.get(event.type);
  const limit = runner?.timeLimitSec ?? BOWL_NIGHT_RULES[event.type]?.timeLimitSec;
  return {night: night.night, event: event.type, name: BOWL_EVENT_NAMES[event.type] ?? event.type,
    goal: runner?.goal(night, course) ?? '', score: event.score, target: runner?.target(night, course) ?? null,
    crowd: Math.round(crowdAfter(event.crowd, Math.max(0, (state.stageTimeSec || 0) - event.crowdAt))),
    timeLeft: limit ? Math.max(0, limit - (state.stageTimeSec || 0)) : null,
    attempt: event.attempt, eventNumber: event.eventIndex + 1,
    eventCount: night.school ? 1 : SHOW_NIGHTS[night.night - 1].events.length,
    caption: event.schoolReason?.until > night.clock ? event.schoolReason.text
      : night.caption?.text ?? (state.bowlSchoolSavePending ? 'Your Trick School choice is waiting to be saved.' : ''),
    driver: night.turn?.driver || null};
}

// The purse and the records for a finished night, as one profile change.
// bowl-save.js pays each night once, so a second call for the same night (the
// same run seen twice, or a later run) pays nothing and changes nothing.
export function settleShowNight(profile, result) {
  if (!result?.won || !Number.isSafeInteger(result.night)) return {ok: false, changed: false, profile, purse: 0};
  const before = profile;
  let next = profile;
  const bests = [];
  for (const [event, score] of Object.entries(result.bests || {})) {
    const id = SAVE_EVENT_IDS[event];
    if (!id || !Number.isSafeInteger(score)) continue;
    const recorded = recordBowlScore(next, id, score);
    if (recorded.changed) bests.push(event);
    next = recorded.profile;
  }
  const settled = settleBowlNight(next, {night: result.night, won: true, scrap: BOWL_PURSE[result.night - 1],
    trophy: `show-night-${result.night}`});
  if (!settled.ok) return {ok: false, changed: false, profile: before, purse: 0, reason: settled.reason};
  return {ok: true, changed: settled.profile !== before, profile: settled.profile,
    purse: settled.changed ? BOWL_PURSE[result.night - 1] : 0, alreadyPaid: !settled.changed, bests};
}
