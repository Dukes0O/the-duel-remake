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
//   attempt is in night.attempts, and startBowlNight takes the playerId.
// - BOWL-REX-FIGHT registers its own runner for night five and adds its lines
//   to BIG_MO in bowl-lines.js.
import {SHOW_NIGHTS, createShowNight, crowdAfter, finishShowEvent, scoreFreestyle,
  scoreStuntEvent} from './bowl-show.js';
import {recordBowlScore, settleBowlNight} from './bowl-save.js';
import {BIG_MO, BOWL_CRUSH_ROWS, BOWL_EVENT_NAMES, BOWL_GOALS} from './bowl-lines.js';
import {BOWL_COURSE} from './bowl-course.js';
import {CARS, COURSE, DRIVE} from '../config.js';
import {DEFAULT_DRIVER} from '../drivers.js';
import {freshDamageZones} from '../sim-common.js';

export const SHOW_TRUCK = 'titan_monster';
const TURN = Math.PI * 2;
const DIFFICULTIES = ['easy', 'medium', 'hard'];

// Design numbers for Claude's review; BOWL-FINISH tunes them in play.
export const BOWL_NIGHT_RULES = Object.freeze({
  carCrush: Object.freeze({startS: 62, endS: 128, leftS: 40, timeLimitSec: 20,
    stillMph: 1.5, stillSec: 1.5, rowsToWin: Object.freeze({easy: 3, medium: 4, hard: 5})}),
  freestyle: Object.freeze({timeLimitSec: 90, target: Object.freeze({easy: 400, medium: 650, hard: 900})}),
  // Each rival's own pace is in src/bowl/bowl-rivals.js (BOWL-RIVALS).
  // The two lanes come from the course (sideBySideLanes in bowl-rivals.js).
  sideBySide: Object.freeze({timeLimitSec: 60}),
  donutMaxMph: 15,
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

// runner: {laps, place(duel, night), target(night), goal(night), step(duel, night, dt)}.
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

// Where a truck on the outside lane starts so that it drives as far to the line
// as a truck on the inside lane does from the start. Measured on the course;
// lanes: {inside, outside} lateral offsets.
const STAGGERS = new WeakMap();
export function outsideLaneStart(course, {inside: insideOff, outside: outsideOff}) {
  const key = `${insideOff}|${outsideOff}`, known = STAGGERS.get(course) ?? new Map();
  STAGGERS.set(course, known);
  if (known.has(key)) return known.get(key);
  const step = .25, path = off => {
    const points = [];
    for (let s = 0; s <= course.length + 1e-9; s += step) points.push(course.worldAt(s, off));
    return points;
  };
  const inside = path(insideOff), outside = path(outsideOff);
  const length = points => points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i].x, p.z - points[i].z), 0);
  let left = length(outside) - length(inside), index = 0;
  while (left > 0 && index < outside.length - 1) {
    left -= Math.hypot(outside[index + 1].x - outside[index].x, outside[index + 1].z - outside[index].z);
    index++;
  }
  const start = +(index * step).toFixed(2);
  known.set(key, start);
  return start;
}

// The rows of the crush line, nearest first, from the course's own props.
function crushRows(course) {
  const rows = [...new Set((course.features.crushables || []).map(prop => prop.s))].sort((a, b) => a - b);
  return id => rows.indexOf(course.features.crushables.find(prop => prop.id === id)?.s);
}

registerBowlEventRunner('carCrush', {
  place(duel) { startBowlEventAt(duel, BOWL_NIGHT_RULES.carCrush.startS, 0); },
  target: night => BOWL_NIGHT_RULES.carCrush.rowsToWin[difficultyOf(night)],
  goal: night => BOWL_GOALS.carCrush(BOWL_CRUSH_ROWS[BOWL_NIGHT_RULES.carCrush.rowsToWin[difficultyOf(night)] - 1]),
  observe(duel, night, ev) {
    if (!ev.propCrushed?.byPlayer) return;
    const row = crushRows(duel.course)(ev.propCrushed.id);
    if (row >= 0) night.event.rows = Math.max(night.event.rows, row + 1);
  },
  step(duel, night, dt) {
    const s = duel.state, rules = BOWL_NIGHT_RULES.carCrush, event = night.event;
    const still = s.stageTimeSec > 3 && Math.abs(s.speedMph) < rules.stillMph && !s.airborne && !(s.impactTimer > 0);
    event.stillSec = still ? event.stillSec + dt : 0;
    const firstRow = Math.min(...duel.course.features.crushables.map(prop => prop.s));
    event.metres = Math.max(event.metres, Math.min(rules.endS, s.s) - firstRow);
    if (s.s < rules.endS && s.s > rules.leftS && event.stillSec < rules.stillSec && s.stageTimeSec < rules.timeLimitSec) return null;
    return {won: event.rows >= rules.rowsToWin[difficultyOf(night)], rows: event.rows};
  },
});

// Two parked cars on the ring in Freestyle, so the Titan's launch off cars
// (FUN-TITAN-LAUNCH, docs/board/decisions.md "Keep these") can be done in the
// show. They are ordinary parked traffic: the launch rules are not touched.
export const FREESTYLE_PARKED_CARS = Object.freeze([
  Object.freeze({s: 62, dir: 1}), Object.freeze({s: 74, dir: -1}),
]);

registerBowlEventRunner('freestyle', {
  place(duel) {
    startBowlEventAt(duel, 0, 0);
    duel.state.traffic = FREESTYLE_PARKED_CARS.map(({s, dir}) => {
      const lateral = dir < 0 ? DRIVE.laneOffset : -DRIVE.laneOffset;
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
// seed, owned, upgrades, rivals}. `rivals` (rival ids, for tests) chooses who
// drives against the player instead of the night's own. Returns false when the
// night cannot run.
export function startBowlNight(duel, options = {}) {
  const number = options.night;
  if (!flagOn(duel) || !Number.isSafeInteger(number) || !bowlNightPlayable(number)) return false;
  const truck = showTruckFor(options);
  duel.state.bowlNight = {
    version: 1, night: number, show: createShowNight(number), phase: 'event',
    cpuDifficulty: DIFFICULTIES.includes(options.cpuDifficulty) ? options.cpuDifficulty : 'medium',
    lent: truck.lent, start: {car: truck.car, upgrades: truck.upgrades, playerId: options.playerId ?? null,
      driverId: options.driverId, difficulty: options.difficulty, seed: options.seed},
    playerId: options.playerId ?? null, clock: 0, caption: null, captionQueue: [], said: [],
    event: null, attempts: [], lastResult: null, result: null,
    rivals: Array.isArray(options.rivals) ? options.rivals.filter(id => typeof id === 'string').slice(0, 3) : null,
  };
  say(duel, `night.${number}.open`);
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
    crowdPeak: 0, crowdMark: 0, flips: 0, roof: null, donutTurn: 0, donutSec: 0, heading: null,
    rows: 0, metres: 0, stillSec: 0, playerDoneAt: null, rivalDoneAt: null};
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
export function retryBowlEvent(duel) {
  const night = duel.state.bowlNight;
  if (!night || night.phase !== 'event') return false;
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
  duel.emit({bowlScore: {type: fact.type, points: scored.points, score: event.score, crowd: scored.crowd, cue: 'bowl.crowd.rise'}});
  const mark = BOWL_NIGHT_RULES.crowdMarks.filter(value => scored.crowd >= value).at(-1);
  if (mark > event.crowdMark) { event.crowdMark = mark; say(duel, `crowd.${mark}`); }
}

// Facts that the Duel announces: jumps, launches off cars and crushes.
export function observeBowlNight(duel, ev) {
  const s = duel.state, night = s.bowlNight;
  if (!night || night.phase !== 'event' || s.status !== 'racing' || !night.event) return;
  if (ev.jumpLanded) {
    const car = ev.jumpLanded.rampId === 'car';
    addFact(duel, {type: car ? 'carLaunch' : 'landedJump', durationSeconds: +(s.airTime || 0).toFixed(3),
      distanceMeters: ev.jumpLanded.distance || 0});
    if (car) say(duel, 'moment.carLaunch', {once: true});
    else if ((s.airTime || 0) >= BOWL_NIGHT_RULES.bigJumpSec) say(duel, 'moment.bigJump', {once: true});
  }
  if (ev.propCrushed?.byPlayer) {
    addFact(duel, {type: 'crush'});
    say(duel, 'moment.crush', {once: true});
  }
  RUNNERS.get(night.event.type)?.observe?.(duel, night, ev);
}

// Facts the night reads from the truck: flips (BOWL-AIR), roof landings and donuts.
function observeTruck(duel, dt) {
  const s = duel.state, event = s.bowlNight.event;
  const flips = s.bowlAirFlips || 0;
  if (flips < event.flips) event.flips = flips;
  if (flips > event.flips) {
    addFact(duel, {type: 'flip', pitchTurns: flips - event.flips});
    event.flips = flips;
    say(duel, 'moment.flip', {once: true});
  }
  if (s.tumble?.reason === 'bowl_roof_landing' && event.roof !== s.tumble) {
    event.roof = s.tumble;
    say(duel, 'moment.roof', {once: true});
  }
  // A donut: the truck turns a full circle while slow and on the ground.
  const heading = duel.course.at(s.s).heading + (s.headingError || 0);
  if (s.airborne || s.tumble || Math.abs(s.speedMph) > BOWL_NIGHT_RULES.donutMaxMph || event.heading == null) {
    event.donutTurn = 0; event.donutSec = 0;
  } else {
    event.donutTurn += Math.atan2(Math.sin(heading - event.heading), Math.cos(heading - event.heading));
    event.donutSec += dt;
    if (Math.abs(event.donutTurn) >= TURN) {
      addFact(duel, {type: 'donut', seconds: +event.donutSec.toFixed(3)});
      say(duel, 'moment.donut', {once: true});
      event.donutTurn = 0; event.donutSec = 0;
    }
  }
  event.heading = heading;
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
  night.phase = night.show.complete ? 'complete' : 'result';
  s.status = 'bowl_break'; s.boosting = false;
  duel.emit({bowlEventResult: result, cue: result.won ? 'bowl.event.won' : 'bowl.event.lost'});
  say(duel, `event.${result.won ? 'won' : 'lost'}.${event.type}`);
  if (night.phase === 'complete') {
    const won = night.attempts.filter(entry => entry.won);
    const bests = {};
    for (const entry of night.attempts) bests[entry.event] = Math.max(bests[entry.event] ?? 0, entry.score);
    night.result = {night: night.night, won: true, score: won.reduce((sum, entry) => sum + entry.score, 0),
      events: won.map(entry => ({event: entry.event, score: entry.score})), bests,
      purse: BOWL_PURSE[night.night - 1], lent: night.lent, playerId: night.playerId};
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
export function bowlHudView(state) {
  const night = state?.bowlNight, event = night?.event;
  if (!night || !event) return null;
  const runner = RUNNERS.get(event.type);
  const limit = runner?.timeLimitSec;
  return {night: night.night, event: event.type, name: BOWL_EVENT_NAMES[event.type] ?? event.type,
    goal: runner?.goal(night) ?? '', score: event.score, target: runner?.target(night) ?? null,
    crowd: Math.round(crowdAfter(event.crowd, Math.max(0, (state.stageTimeSec || 0) - event.crowdAt))),
    rows: event.rows, timeLeft: limit ? Math.max(0, limit - (state.stageTimeSec || 0)) : null,
    attempt: event.attempt, eventNumber: event.eventIndex + 1,
    eventCount: SHOW_NIGHTS[night.night - 1].events.length, caption: night.caption?.text ?? ''};
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
