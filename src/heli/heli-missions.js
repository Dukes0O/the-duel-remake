// The mission engine (docs/HELI_FIRE.md section 3): a secret count of pump
// refuels brings a radio call mid-flight, and a quiet spell after each
// emergency keeps missions from taking over racing time. Pure and
// repeatable: a missions record goes in and a new one comes out, and every
// draw has its own generator, so one draw never shifts another and the same
// save always gives the same missions. H2 has one kind, fire; rescues (H4)
// join the same engine later. Seasons (section 3.6, Kyle 15 October 2026)
// weight which kind comes, and there is no forest fire in winter.
import {makeRng} from '../rng.js';
import {heliHash, MISSION_KINDS, createMissions} from './heli-save.js';

export const MISSION_RULES = Object.freeze({
  need: Object.freeze([3, 6]),
  callAfter: Object.freeze([20, 60]),
  callHeight: 30,
  answerSeconds: 20,
  quietDays: 2,
  quietEngineSeconds: 1200,
});

// The dispatch season turns every 12 play days: summer first (the first
// play day), then autumn, winter, spring. Worked out from the play day
// count, so nothing is saved. The weights are docs/HELI_RESCUE.md section
// 3.2's table; a kind not in MISSION_KINDS yet is simply never offered.
export const SEASONS = Object.freeze(['summer', 'autumn', 'winter', 'spring']);
export const SEASON_DAYS = 12;
export const SEASON_WEIGHTS = Object.freeze({
  summer: Object.freeze({fire: 4, hiker: 2, avalanche: 0, hoist: 1, supply: 0}),
  autumn: Object.freeze({fire: 2, hiker: 2, avalanche: 1, hoist: 1, supply: 1}),
  winter: Object.freeze({fire: 0, hiker: 1, avalanche: 3, hoist: 1, supply: 3}),
  spring: Object.freeze({fire: 1, hiker: 2, avalanche: 2, hoist: 1, supply: 1}),
});

export function seasonOf(playDay) {
  const n = Math.max(0, Math.floor(Number.isFinite(playDay) ? playDay : 0) - 1);
  return {name: SEASONS[Math.floor(n / SEASON_DAYS) % SEASONS.length], day: n % SEASON_DAYS + 1, days: SEASON_DAYS};
}

const weightOf = (kind, playDay) => SEASON_WEIGHTS[seasonOf(playDay).name][kind] ?? 0;

const draw = (missions, purpose) => makeRng(heliHash(missions.seed, purpose, missions.draws));

export {createMissions};

export const armed = missions => missions.seed !== 0 && missions.need > 0;

// The engine arms when lesson 4 (carry and set down) is done: the bucket
// hangs on the cable. The seed comes from the day it armed and the player's
// name. A seed of 0 means "not armed", so a hash of 0 becomes 1.
export function armMissions(missions, {date, playerName}) {
  if (armed(missions)) return missions;
  const seed = heliHash('missions', date, playerName) || 1;
  const next = {...missions, seed, draws: 0};
  return {...next, need: draw(next, 'need').int(...MISSION_RULES.need), draws: 1, count: 0};
}

// A call waits, or a mission is open: the count stands still.
const busy = (missions, fireOpen) => missions.call !== null || fireOpen;

// A pump purchase (buyFuel returning ok). The fuel truck never counts, nor
// does a refuel during a mission. The count stops at need.
export function noteRefuel(missions, {fireOpen = false} = {}) {
  if (!armed(missions) || busy(missions, fireOpen) || missions.count >= missions.need) return missions;
  return {...missions, count: missions.count + 1};
}

// Engine time run down the quiet spell's engine seconds. Not rounded here,
// so a frame at a time runs it down too (the save keeps tenths).
export function runEngine(missions, seconds) {
  if (!(seconds > 0) || missions.quiet.engineSeconds <= 0) return missions;
  const rest = missions.quiet.engineSeconds - seconds, left = rest > 1e-6 ? rest : 0;
  return {...missions, quiet: {...missions.quiet, engineSeconds: left}};
}

export const inQuietSpell = (missions, playDay) => playDay < missions.quiet.untilDay || missions.quiet.engineSeconds > 0;

// The kinds whose condition holds now and whose weight this season is
// above 0. `conditions` is {fire: [courseId, ...]}: the courses each kind
// could happen on. In winter fire weighs 0, so while fire is the only kind
// no call comes and the count stands still.
const possible = (conditions, playDay) => MISSION_KINDS.filter(kind =>
  (conditions?.[kind] ?? []).length > 0 && weightOf(kind, playDay) > 0);

// Is a call due on the next flight?
export function callDue(missions, {playDay, fireOpen = false, conditions}) {
  return armed(missions) && !busy(missions, fireOpen) && missions.count >= missions.need &&
    !inQuietSpell(missions, playDay) && possible(conditions, playDay).length > 0;
}

// How long after lift-off the call comes, the same for the same save.
export function callTime(missions) {
  return draw(missions, 'call-time').int(...MISSION_RULES.callAfter);
}

// The call: a seeded pick of a kind, weighted by the season, then of a
// course for it. The same kind may come twice or more in a row. The kind
// takes one draw, as an even pick did, so the course draw after it is
// unchanged. Only when a call is due, so a second ring
// can never reopen or reset a call.
export function openCall(missions, {playDay, conditions, fireOpen = false}) {
  if (!callDue(missions, {playDay, conditions, fireOpen})) return {missions, call: null};
  const kinds = possible(conditions, playDay);
  const rng = draw(missions, 'pick');
  const total = kinds.reduce((sum, k) => sum + weightOf(k, playDay), 0);
  let left = rng.float() * total, kind = kinds[kinds.length - 1];
  for (const k of kinds) { left -= weightOf(k, playDay); if (left < 0) { kind = k; break; } }
  const courses = [...conditions[kind]].sort();
  const courseId = courses[rng.int(0, courses.length - 1)];
  const call = {kind, id: `${kind}-${missions.draws}`, courseId, day: playDay, answered: false};
  return {missions: {...missions, call}, call, seed: heliHash(missions.seed, kind, missions.draws)};
}

export function answerCall(missions) {
  if (!missions.call || missions.call.answered) return missions;
  return {...missions, call: {...missions.call, answered: true}};
}

// A mission ends (fire out or course lost): count to 0, a new need, and
// the quiet spell: no call the rest of this play day or the next, and not
// before 20 more minutes of engine time. The save's putOutFire counts the
// fire and gives the badge.
export function endMission(missions, {playDay}) {
  const kind = missions.call?.kind ?? null;
  const next = {...missions, draws: missions.draws + 1};
  return {...next, need: draw(next, 'need').int(...MISSION_RULES.need), count: 0, call: null, last: kind,
    quiet: {untilDay: playDay + MISSION_RULES.quietDays, engineSeconds: MISSION_RULES.quietEngineSeconds}};
}

// The in-flight clock for a due call (section 3.2). A new clock each flight
// (lift-off); it says 'call' once, at the seeded time after lift-off, with
// the helicopter at least 30 m up, never in a lesson, the opening or a
// cruise fade. Landing first ends the flight: the call waits for the next.
export function createCallClock(seconds) {
  return {at: seconds, airborne: 0, rung: false};
}

export function tickCallClock(clock, {dt, aboveGround, lesson = false, opening = false, fading = false}) {
  if (clock.rung) return false;
  clock.airborne += dt;
  if (lesson || opening || fading) return false;
  if (clock.airborne >= clock.at && aboveGround >= MISSION_RULES.callHeight) {
    clock.rung = true;
    return true;
  }
  return false;
}
