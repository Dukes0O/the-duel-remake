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
import {SHOW_NIGHTS, createShowNight, crowdAfter, finishShowEvent, scoreFreestyle,
  scoreStuntEvent} from './bowl-show.js';
import {recordBowlScore, settleBowlNight} from './bowl-save.js';
import {BIG_MO, BOWL_CRUSH_ROW, BOWL_EVENT_NAMES, BOWL_GOALS} from './bowl-lines.js';
import {BOWL_COURSE} from './bowl-course.js';
import {CARS, COURSE} from '../config.js';
import {DEFAULT_DRIVER} from '../drivers.js';
import {freshDamageZones} from '../sim-common.js';

export const SHOW_TRUCK = 'titan_monster';

const DIFFICULTIES = ['easy', 'medium', 'hard'];

// Design numbers for Claude's review; BOWL-FINISH tunes them in play.
export const BOWL_NIGHT_RULES = Object.freeze({
  // Every distance comes from the course (bowlLayout below), so a rebuilt Bowl (BOWL-EXPAND) moves
  // the events with it. The run starts runUpMetres before the first row: on today's Bowl that is past
  // the ring's tight end, and a truck held at full throttle with no steering reaches the buses.
  // A level must reach this share of the rows (3, 4 and 5 of today's five).
  carCrush: Object.freeze({runUpMetres: 8, timeLimitSec: 20,
    // The run is over when the truck has gained less than 3 m in two seconds (stopped, or grinding along a wall).
    stallMetres: 3, stallSec: 2, rowsShareToWin: Object.freeze({easy: .6, medium: .8, hard: 1})}),
  // On the 286 m Bowl a child-pace lap takes over 20 seconds, so about four laps fit in 90 seconds.
  // Measured with tools/bowl-freestyle-balance.mjs: Easy is a few jumps (a child-pace driver wins
  // 9 of 10); Medium and Hard need the Big Jump and the Table at speed, launches and flips.
  freestyle: Object.freeze({timeLimitSec: 90, target: Object.freeze({easy: 310, medium: 1810, hard: 4260})}),
  // Each rival's own pace is in src/bowl/bowl-rivals.js (BOWL-RIVALS); the lanes are bowlLayout's.
  sideBySide: Object.freeze({timeLimitSec: 60}),
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

// How many rows each level must reach, from the course's own row count.
export const crushRowsToWin = (course, night) =>
  Math.max(1, Math.ceil(bowlLayout(course).rows.length * BOWL_NIGHT_RULES.carCrush.rowsShareToWin[difficultyOf(night)]));
// A row named by what stands in it: the second row of cars, the buses, the burning stack.
export function crushRowName(course, rowIndex) {
  const rows = bowlLayout(course).rows, row = rows[rowIndex];
  if (!row) return BOWL_CRUSH_ROW.last;
  if (/bus|rv/i.test(row.kind)) return BOWL_CRUSH_ROW.buses;
  if (/heap|fire|stack/i.test(row.kind)) return BOWL_CRUSH_ROW.fire;
  return BOWL_CRUSH_ROW.cars(rows.slice(0, rowIndex + 1).filter(other => !/bus|rv|heap|fire|stack/i.test(other.kind)).length);
}

registerBowlEventRunner('carCrush', {
  place(duel) { const line = bowlLayout(duel.course).crush; startBowlEventAt(duel, line.startS, line.lateral); },
  target: (night, course) => crushRowsToWin(course, night),
  goal: (night, course) => BOWL_GOALS.carCrush(crushRowName(course, crushRowsToWin(course, night) - 1)),
  observe(duel, night, ev) {
    if (!ev.propCrushed?.byPlayer) return;
    const s = duel.course.features.crushables.find(prop => prop.id === ev.propCrushed.id)?.s;
    const row = bowlLayout(duel.course).rows.findIndex(entry => entry.s === s);
    if (row >= 0) night.event.rows = Math.max(night.event.rows, row + 1);
  },
  step(duel, night) {
    const s = duel.state, rules = BOWL_NIGHT_RULES.carCrush, event = night.event, line = bowlLayout(duel.course).crush;
    if (s.s > event.progressS + rules.stallMetres || s.airborne || s.impactTimer > 0) { event.progressS = Math.max(event.progressS, s.s); event.progressAt = s.stageTimeSec; }
    const stalled = s.stageTimeSec > 3 && s.stageTimeSec - event.progressAt >= rules.stallSec;
    event.metres = Math.max(event.metres, Math.min(line.endS, s.s) - line.firstRowS);
    if (s.s < line.endS && s.s > line.leftS && !stalled && s.stageTimeSec < rules.timeLimitSec) return null;
    return {won: event.rows >= crushRowsToWin(duel.course, night), rows: event.rows};
  },
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
  goal: night => BOWL_GOALS.freestyle(BOWL_NIGHT_RULES.freestyle.target[difficultyOf(night)].toLocaleString()),
  timeLimitSec: BOWL_NIGHT_RULES.freestyle.timeLimitSec,
  step(duel, night) {
    if (duel.state.stageTimeSec < BOWL_NIGHT_RULES.freestyle.timeLimitSec) return null;
    return {won: scoreFreestyle(night.event.facts).score >= BOWL_NIGHT_RULES.freestyle.target[difficultyOf(night)]};
  },
});

// Side by Side and Last Truck Rolling are registered by src/bowl/bowl-rivals.js.

// ---- the night ----------------------------------------------------------

export const bowlEventType = night => SHOW_NIGHTS[night.night - 1]?.events[night.show.eventIndex] ?? null;

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
    night.captionQueue = night.captionQueue.filter(waiting => !REMARK.test(waiting));
    if (night.caption && REMARK.test(night.caption.id)) night.caption = null;
  }
  if (once) night.said.push(id);
  night.captionQueue.push(id);
  if (!night.caption) nextCaption(duel);
}
function nextCaption(duel) {
  const night = duel.state.bowlNight, id = night.captionQueue.shift();
  night.caption = id ? {id, text: BIG_MO[id], until: night.clock + BOWL_NIGHT_RULES.captionSec} : null;
  if (id) duel.emit({bowlCaption: {id, text: BIG_MO[id], cue: 'bowl.mo'}});
}

// Starts a night. options: {night, playerId, driverId, difficulty, cpuDifficulty,
// seed, owned, upgrades, eventIndex, turn, rivals}. `rivals` (rival ids, for
// tests) chooses who drives against the player instead of the night's own.
// Returns false when the night cannot run.
export function startBowlNight(duel, options = {}) {
  const number = options.night;
  if (!flagOn(duel) || !Number.isSafeInteger(number) || !bowlNightPlayable(number)) return false;
  const truck = showTruckFor(options);
  const eventCount = SHOW_NIGHTS[number - 1].events.length, eventIndex = options.eventIndex ?? 0;
  if (!Number.isSafeInteger(eventIndex) || eventIndex < 0 || eventIndex >= eventCount) return false;
  // A Turn Show go (BOWL-TURNS): the driver's name is for the HUD only.
  const turn = options.turn ? {driver: typeof options.turn.driver === 'string' ? options.turn.driver : ''} : null;
  duel.state.bowlNight = {
    version: 1, night: number, show: createShowNight(number, eventIndex), phase: 'event', turn,
    cpuDifficulty: DIFFICULTIES.includes(options.cpuDifficulty) ? options.cpuDifficulty : 'medium',
    lent: truck.lent, start: {car: truck.car, upgrades: truck.upgrades, playerId: options.playerId ?? null,
      driverId: options.driverId, difficulty: options.difficulty, seed: options.seed},
    playerId: options.playerId ?? null, clock: 0, caption: null, captionQueue: [], said: [],
    event: null, attempts: [], lastResult: null, result: null,
    rivals: Array.isArray(options.rivals) ? options.rivals.filter(id => typeof id === 'string').slice(0, 3) : null,
  };
  say(duel, turn ? 'turn.open' : `night.${number}.open`);
  if (truck.lent) say(duel, 'lent.truck');
  loadBowlEvent(duel);
  return true;
}

function loadBowlEvent(duel) {
  const night = duel.state.bowlNight, type = bowlEventType(night), runner = RUNNERS.get(type);
  const attempt = 1 + night.attempts.filter(entry => entry.event === type && entry.eventIndex === night.show.eventIndex).length;
  duel._bowlEventCourse = {...BOWL_COURSE, laps: runner.laps};
  duel.startCampaign({...night.start, startStage: standInStage(), mode: 'duel', opponentCount: 0,
    cpuDifficulty: night.cpuDifficulty, rival: null});
  const s = duel.state;
  s.bowlNight = night;
  night.phase = 'event';
  night.event = {type, eventIndex: night.show.eventIndex, attempt, facts: [], score: 0, crowd: 0, crowdAt: 0,
    crowdPeak: 0, crowdMark: 0,
    flight: null, rows: 0, metres: 0, progressS: duel.state.s, progressAt: 0, playerDoneAt: null, rivalDoneAt: null};
  runner.place(duel, night);
  say(duel, `event.${type}.intro`);
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

function addFact(duel, fact) {
  const s = duel.state, event = duel.state.bowlNight.event, at = s.stageTimeSec;
  const timed = {...fact, atSeconds: at};
  const scored = scoreStuntEvent(timed, crowdAfter(event.crowd, at - event.crowdAt));
  event.facts.push(timed);
  event.crowd = scored.crowd; event.crowdAt = at; event.score += scored.points;
  event.crowdPeak = Math.max(event.crowdPeak, scored.crowd);
  duel.emit({bowlScore: {type: fact.type, points: scored.points, score: event.score, crowd: scored.crowd, cue: scored.points ? 'bowl.crowd.rise' : null}});
  const mark = BOWL_NIGHT_RULES.crowdMarks.filter(value => scored.crowd >= value).at(-1);
  if (mark > event.crowdMark) { event.crowdMark = mark; say(duel, `crowd.${mark}`); }
}

// Facts that the Duel announces: launches off cars and crushes. Other jumps are
// counted from the truck's own landings (observeTruck), because the Duel names a
// jump once a lap and on the Bowl a truck goes back to the same jump many times.
export function observeBowlNight(duel, ev) {
  const s = duel.state, night = s.bowlNight;
  if (!night || night.phase !== 'event' || s.status !== 'racing' || !night.event) return;
  if (ev.bowlTrick) {
    const trick = ev.bowlTrick;
    addFact(duel, {type: 'bowlTrick', ...trick});
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
    addFact(duel, {type: 'crush'});
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
  const score = scoreFreestyle(event.facts).score;
  const result = {...outcome, event: event.type, eventIndex: event.eventIndex, attempt: event.attempt,
    won: outcome.won === true, score, rows: event.rows, metres: +event.metres.toFixed(1),
    crowdPeak: +event.crowdPeak.toFixed(1), playerId: night.playerId};
  night.attempts.push(result);
  night.lastResult = result;
  night.show = finishShowEvent(night.show, event.type, result.won).state;
  night.phase = night.turn ? 'turn' : night.show.complete ? 'complete' : 'result';
  s.status = 'bowl_break'; s.boosting = false;
  duel.emit({bowlEventResult: result, cue: result.won ? 'bowl.event.won' : 'bowl.event.lost'});
  // A Turn Show go ends here: the Turn Show keeps the scores and pays any purse.
  if (night.turn) { say(duel, result.won ? 'turn.won' : 'turn.lost'); return; }
  say(duel, `event.${result.won ? 'won' : 'lost'}.${event.type}`);
  if (night.phase === 'complete') {
    const won = night.attempts.filter(entry => entry.won);
    const bests = {};
    for (const entry of night.attempts) bests[entry.event] = Math.max(bests[entry.event] ?? 0, entry.score);
    night.result = {night: night.night, won: true, score: won.reduce((sum, entry) => sum + entry.score, 0),
      events: won.map(entry => ({event: entry.event, score: entry.score})), bests,
      purse: BOWL_PURSE[night.night - 1], lent: night.lent, playerId: night.playerId};
    duel.emit({bowlNightResult: night.result});
    // BOWL-REX-FIGHT: on nights one to four Big Mo lets slip what waits for night five.
    say(duel, `rex.seen.${night.night}`);
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
  if (night.phase !== 'event') return true;
  if (s.status === 'gameover') {
    if (s.impactTimer > 0) return false;
    finishEvent(duel, {won: false, wrecked: true});
    return true;
  }
  if (s.status !== 'racing') return false;
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
  const limit = runner?.timeLimitSec;
  return {night: night.night, event: event.type, name: BOWL_EVENT_NAMES[event.type] ?? event.type,
    goal: runner?.goal(night, course) ?? '', score: event.score, target: runner?.target(night, course) ?? null,
    crowd: Math.round(crowdAfter(event.crowd, Math.max(0, (state.stageTimeSec || 0) - event.crowdAt))),
    rows: event.rows, timeLeft: limit ? Math.max(0, limit - (state.stageTimeSec || 0)) : null,
    attempt: event.attempt, eventNumber: event.eventIndex + 1,
    eventCount: SHOW_NIGHTS[night.night - 1].events.length, caption: night.caption?.text ?? '',
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
