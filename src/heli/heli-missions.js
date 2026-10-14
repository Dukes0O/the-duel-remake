// The mission engine (docs/HELI_FIRE.md section 3): a secret count of pump
// refuels brings a radio call mid-flight, and a quiet spell after each
// emergency keeps missions from taking over racing time. Pure and
// repeatable: a missions record goes in and a new one comes out, and every
// draw has its own generator, so one draw never shifts another and the same
// save always gives the same missions. H2 has one kind, fire; rescues (H4)
// join the same engine later.
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

// Engine time run down the quiet spell's engine seconds.
export function runEngine(missions, seconds) {
  if (!(seconds > 0) || missions.quiet.engineSeconds <= 0) return missions;
  const left = Math.max(0, Math.round((missions.quiet.engineSeconds - seconds) * 10) / 10);
  return {...missions, quiet: {...missions.quiet, engineSeconds: left}};
}

export const inQuietSpell = (missions, playDay) => playDay < missions.quiet.untilDay || missions.quiet.engineSeconds > 0;

// The kinds whose condition holds now. `conditions` is {fire: [courseId,
// ...]}: the courses each kind could happen on.
const possible = conditions => MISSION_KINDS.filter(kind => (conditions?.[kind] ?? []).length > 0);

// Is a call due on the next flight?
export function callDue(missions, {playDay, fireOpen = false, conditions}) {
  return armed(missions) && !busy(missions, fireOpen) && missions.count >= missions.need &&
    !inQuietSpell(missions, playDay) && possible(conditions).length > 0;
}

// How long after lift-off the call comes, the same for the same save.
export function callTime(missions) {
  return draw(missions, 'call-time').int(...MISSION_RULES.callAfter);
}

// The call: a seeded pick of a kind, then of a course for it. The same kind
// may come twice or more in a row.
export function openCall(missions, {playDay, conditions}) {
  const kinds = possible(conditions);
  if (!kinds.length) return {missions, call: null};
  const rng = draw(missions, 'pick');
  const kind = kinds[rng.int(0, kinds.length - 1)];
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
