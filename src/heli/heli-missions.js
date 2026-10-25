// The mission engine (docs/HELI_FIRE.md section 3): a secret count of pump
// refuels brings a radio call mid-flight, and a quiet spell after each
// emergency keeps missions from taking over racing time. Pure and
// repeatable: a missions record goes in and a new one comes out, and every
// draw has its own generator, so one draw never shifts another and the same
// save always gives the same missions. H2 has one kind, fire; the rescue
// kinds (H4, docs/HELI_RESCUE.md section 3) join the same engine only while
// the `rescue` switch is on, passed as {rescue} the way fire's switch is
// passed: with it off, nothing here reads or offers a rescue kind and every
// result is what H2 gave. Seasons (section 3.6, Kyle 15 October 2026)
// weight which kind comes, and there is no forest fire in winter.
import {makeRng} from '../rng.js';
import {heliHash, MISSION_KINDS, RESCUE_KINDS, RESCUE_STAGES, createMissions, missionsOf, heliOf, setMissions, chargeRepair} from './heli-save.js';
import {CONDITIONS, waitHurt, rescuePay} from './heli-rescue.js';
import {searchLimit} from './heli-search.js';
import {wreckFor} from './heli-jobs.js';

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
// 3.2's table; a kind whose switch is off is simply never offered.
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

// The kinds the engine offers: fire (forest-fire switch, as H2) and, only
// with the rescue switch on, the four rescues.
export const isRescueKind = kind => RESCUE_KINDS.includes(kind);
const kindsOn = rescue => rescue === true ? [...MISSION_KINDS, ...RESCUE_KINDS] : MISSION_KINDS;

// Can any kind come this season? While fire is the only kind, not in winter.
export const seasonOpen = (playDay, {rescue = false} = {}) => kindsOn(rescue).some(kind => weightOf(kind, playDay) > 0);

// The weighted pick: u in [0, 1) from one draw, kinds already filtered to
// those with weight above 0. A rounding slip falls on the last kind.
export function pickKind(kinds, playDay, u) {
  const total = kinds.reduce((sum, k) => sum + weightOf(k, playDay), 0);
  let left = u * total;
  for (const k of kinds) { left -= weightOf(k, playDay); if (left < 0) return k; }
  return kinds[kinds.length - 1];
}

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

// The call the engine sees. With the rescue switch off, a stored call of a
// rescue kind (made by a build with it on) is absent: never offered, never
// blocking a fire call. Whatever reads missions.call should read this.
export function callOf(missions, {rescue = false} = {}) {
  const call = missions.call;
  return call && (rescue === true || !isRescueKind(call.kind)) ? call : null;
}

// The rescue in hand; absent while the switch is off.
export const rescueOf = (missions, {rescue = false} = {}) => rescue === true ? missions.rescue ?? null : null;

// A call waits, or a mission is open: the count stands still.
const busy = (missions, fireOpen, rescue) => callOf(missions, {rescue}) !== null || fireOpen || rescueOf(missions, {rescue}) !== null;

// A pump purchase (buyFuel returning ok). The fuel truck never counts, nor
// does a refuel during a mission, nor one in a season when no kind can come
// (winter, while fire is the only kind). The count stops at need.
export function noteRefuel(missions, {fireOpen = false, playDay, rescue = false} = {}) {
  if (!armed(missions) || busy(missions, fireOpen, rescue) || missions.count >= missions.need) return missions;
  if (playDay !== undefined && !seasonOpen(playDay, {rescue})) return missions;
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
const possible = (conditions, playDay, rescue) => kindsOn(rescue).filter(kind =>
  (conditions?.[kind] ?? []).length > 0 && weightOf(kind, playDay) > 0);

// Is a call due on the next flight?
export function callDue(missions, {playDay, fireOpen = false, conditions, rescue = false}) {
  return armed(missions) && !busy(missions, fireOpen, rescue) && missions.count >= missions.need &&
    !inQuietSpell(missions, playDay) && possible(conditions, playDay, rescue).length > 0;
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
export function openCall(missions, {playDay, conditions, fireOpen = false, rescue = false}) {
  if (!callDue(missions, {playDay, conditions, fireOpen, rescue})) return {missions, call: null};
  const kinds = possible(conditions, playDay, rescue);
  const rng = draw(missions, 'pick');
  const kind = pickKind(kinds, playDay, rng.float());
  const courses = [...conditions[kind]].sort();
  const courseId = courses[rng.int(0, courses.length - 1)];
  const call = {kind, id: `${kind}-${missions.draws}`, courseId, day: playDay, answered: false};
  return {missions: {...missions, call}, call, seed: heliHash(missions.seed, kind, missions.draws)};
}

export function answerCall(missions, {rescue = false} = {}) {
  const call = callOf(missions, {rescue});
  if (!call || call.answered) return missions;
  return {...missions, call: {...missions.call, answered: true}};
}

// A mission ends (fire out or course lost): count to 0, a new need, and
// the quiet spell: no call the rest of this play day or the next, and not
// before 20 more minutes of engine time. The save's putOutFire counts the
// fire and gives the badge.
export function endMission(missions, {playDay, rescue = false}) {
  const kind = callOf(missions, {rescue})?.kind ?? null;
  const next = {...missions, draws: missions.draws + 1};
  const ended = {...next, need: draw(next, 'need').int(...MISSION_RULES.need), count: 0, call: null, last: kind,
    quiet: {untilDay: playDay + MISSION_RULES.quietDays, engineSeconds: MISSION_RULES.quietEngineSeconds}};
  // The rescue in hand ends with its mission, but only where it is read.
  return rescue === true && Object.hasOwn(missions, 'rescue') ? {...ended, rescue: null} : ended;
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

// ---- H4 Rescue (docs/HELI_RESCUE.md sections 3, 4.2 and 6) ---------------
// Everything below works only with {rescue: true} / {enabled: true}, the
// rescue switch (effective only with the helicopter on).

// Where each rescue kind can happen (section 3.1), as `conditions` rows to
// join fire's. Summit Run is a destination only while its switch is on: the
// avalanche then also slides on its snowfields, and the supply run goes there
// instead of Tremblant Snow's lodge. The hoist spot waits for Cloudbreak
// Skyway to be a destination.
export function rescueConditions({summitRun = false} = {}) {
  return {
    hiker: ['tremblant-woods', 'panorama-ridge'],
    avalanche: summitRun ? ['tremblant-snow', 'summit-run'] : ['tremblant-snow'],
    hoist: ['panorama-ridge'],
    supply: summitRun ? ['summit-run'] : ['tremblant-snow'],
  };
}

// The mission clock in seconds of simulated time (section 3.4). It counts
// from the answer, in the air or on the ground, and a cruise leg adds its
// flying time. The supply run has no casualty, so nobody gets cold.
export const RESCUE_CLOCKS = Object.freeze({hiker: 900, avalanche: 720, hoist: 720, supply: 1500});
// Summit Run's own rows (RESCUE-SUMMIT-TUNE): the slopes and the hut are high on
// the mountain and a cruise leg from the home pad comes first. Only the kinds
// that can be set there have a row; every other course keeps the rows above.
export const SUMMIT_COURSE = 'summit-run';
// Each is the steady scripted pilot's time flown end to end from the home pad (cruise leg
// included, a fill at the lodge's truck on the way) times 1.55, rounded up to 30 s: supply
// 1,720 s -> 2,670 s, avalanche 1,450 s -> 2,250 s (tools/test-heli-summit-tune.mjs flies
// them and keeps 35% of the clock in hand).
export const SUMMIT_CLOCKS = Object.freeze({avalanche: 2250, supply: 2670});
export const clockBase = (kind, courseId) => courseId === SUMMIT_COURSE && Object.hasOwn(SUMMIT_CLOCKS, kind) ? SUMMIT_CLOCKS[kind] : RESCUE_CLOCKS[kind] ?? 0;
// A call or rescue stored at Summit Run, met with rescues on and the Summit
// switch off (a dev case), is dropped quietly: no call, no pay, no charge, and
// the count is left where it was so the next call rings as usual.
export function dropSummitCall(missions, {rescue = false, summitRun = false} = {}) {
  if (rescue !== true || summitRun === true) return missions;
  const atSummit = item => item?.courseId === SUMMIT_COURSE;
  if (!atSummit(missions.call) && !atSummit(missions.rescue)) return missions;
  return {...missions, call: atSummit(missions.call) ? null : missions.call, rescue: atSummit(missions.rescue) ? null : missions.rescue};
}
export const CASUALTY_KINDS = Object.freeze(['hiker', 'avalanche', 'hoist']);
// The hiker's light dims over the clock's last 3 minutes (drawing only).
export const DUSK_SECONDS = 180;

// A rescue call left waiting goes to another crew at the end of the next
// play day or after 2 more flights, whichever comes first (section 3.3).
export const CALL_WAIT = Object.freeze({days: 1, flights: 2});

// The skin tally each kind counts toward (section 6), and the money. Every
// number of the rescue rules' cost lives here once. The failure charge is
// taken by H1's repair rule (what the player has, the rest forgiven, never
// below zero). A people rescue pays its base by the casualty's condition
// (heli-rescue.js: 100, 60 and 25 per cent); the supply run pays by crate.
export const RESCUE_TALLY = Object.freeze({hiker: 'searches', avalanche: 'searches', hoist: 'hoists', supply: 'supplies'});
export const RESCUE_MONEY = Object.freeze({
  basePay: Object.freeze({hiker: 1000, avalanche: 1200, hoist: 1200}),
  failureCharge: 400,
  supplyFailureCharge: 200,
  tallyGain: 1,
  tallyDrop: 1,
});
// The ways a rescue fails (section 4.2).
export const FAIL_REASONS = Object.freeze(['time', 'crash', 'left']);

const MAX_COUNT = 1_000_000;
const MAX_CREDITS = 1_000_000_000;
const rescueOff = profile => ({ok: false, reason: 'Rescues are not available yet.', profile});
const wallet = profile => Number.isFinite(profile?.credits) ? Math.max(0, Math.floor(profile.credits)) : 0;

// One more flight has passed since a rescue call came (once a lift-off).
export function noteCallFlight(missions, {rescue = false} = {}) {
  const call = callOf(missions, {rescue});
  if (!call || call.answered || !isRescueKind(call.kind)) return missions;
  return {...missions, call: {...call, flights: Math.min(MAX_COUNT, (call.flights ?? 0) + 1)}};
}

// Has another crew taken the waiting call? It goes when the next play day has
// ended (the play day after it has begun) or after 2 more flights.
export function callTaken(missions, {playDay, rescue = false}) {
  const call = callOf(missions, {rescue});
  if (!call || call.answered || !isRescueKind(call.kind)) return false;
  return playDay > call.day + CALL_WAIT.days || (call.flights ?? 0) >= CALL_WAIT.flights;
}

// The call goes to another crew: no pay, no charge, and the quiet spell
// starts as if the mission had ended. Roger says so the next time the radio
// is on. Anything else changes nothing.
export function takeCall(missions, {playDay, rescue = false}) {
  if (!callTaken(missions, {playDay, rescue})) return {missions, taken: null, line: null};
  const kind = missions.call.kind;
  return {missions: endMission(missions, {playDay, rescue}), taken: kind, line: 'heli.radio.rescue.taken'};
}

// The call is answered and the rescue begins: a record with the call's id,
// course and kind, its own seed (the one openCall handed out), the clock at 0
// and the casualty unhurt. clockSeconds counts up from the answer.
export function beginRescue(missions, {rescue = false} = {}) {
  const call = callOf(missions, {rescue});
  if (rescue !== true || !call || !call.answered || !isRescueKind(call.kind) || missions.rescue) return missions;
  return {...missions, rescue: {kind: call.kind, id: call.id, courseId: call.courseId,
    seed: heliHash(missions.seed, call.kind, missions.draws), clockSeconds: 0, stage: RESCUE_STAGES[0],
    crates: [0, 0, 0], condition: 0}};
}

// gear is the worn gear's numbers (heli-skins.js gearStats): the search and
// rescue skin's searchlight runs the hiker search 8 minutes on into the night.
// Left out, or the base kit, the limit is the clock above.
// courseId picks Summit Run's row; left out, or any other course, it is the row above.
export const rescueLimit = (kind, gear, courseId) => searchLimit(clockBase(kind, courseId), kind, gear);
export const clockLeft = (r, gear) => Math.max(0, rescueLimit(r.kind, gear, r.courseId) - r.clockSeconds);
// 0 in daylight to 1 at dark: the hiker's last 3 minutes. Drawing only. Dark
// falls at the plain clock whatever gear is worn; the searchlight only
// lengthens the search into the night.
export const duskOf = r => r.kind === 'hiker' ? Math.max(0, Math.min(1, 1 - clockLeft(r) / DUSK_SECONDS)) : 0;

// Run the clock. `seconds` is simulated time, in the air, on the ground or a
// cruise leg's flying time; not rounded here (the save keeps tenths), so a
// frame at a time gives the same clock. An unhurt casualty is hurt at two
// thirds (cold: true, once, for Roger's line); the clock stops at its limit
// and expired says the time has run out.
export function tickRescue(missions, seconds, {rescue = false, gear = null} = {}) {
  const r = rescueOf(missions, {rescue});
  if (!r || !(seconds > 0)) return {missions, cold: false, expired: !!r && clockLeft(r, gear) <= 0};
  const limit = rescueLimit(r.kind, gear, r.courseId), clockSeconds = Math.min(limit, r.clockSeconds + seconds);
  let condition = r.condition, cold = false;
  // The casualty gets cold two thirds into the plain clock, searchlight or not.
  if (CASUALTY_KINDS.includes(r.kind) && waitHurt(CONDITIONS[condition], clockSeconds, rescueLimit(r.kind, null, r.courseId)).cold) { condition = 1; cold = true; }
  return {missions: {...missions, rescue: {...r, clockSeconds, condition}}, cold, expired: clockSeconds >= limit - 1e-9};
}

// The pay for a people rescue at the handover, by the casualty's condition.
// bonus is the medevac skin's stretcher pay (heli-rescue.js hoistBonus): added
// once, whole, after the condition share. Left out, nothing is added.
export const peoplePay = (r, bonus = 0) => CASUALTY_KINDS.includes(r.kind) ? rescuePay(RESCUE_MONEY.basePay[r.kind], CONDITIONS[r.condition], bonus) : 0;

const withCount = (missions, name, delta) => {
  if (delta > 0) return {...missions, [name]: Math.min(MAX_COUNT, (missions[name] ?? 0) + delta)};
  // A drop never goes below zero, and never adds a field that was not there.
  return Object.hasOwn(missions, name) ? {...missions, [name]: Math.max(0, missions[name] + delta)} : missions;
};

// A rescue fails (section 4.2): the clock ran out, the helicopter crashed
// with people aboard or on the line, or the player left with the rescue in
// hand. The ground team brings the person out badly hurt (Roger says so); the
// people pay nothing, and the call-out is charged by the repair rule: 400
// credits, or 200 for a supply run, which first pays for the crates already
// down (`cratePay`, worked out by heli-rescue.js). That kind's tally drops by
// one, never below zero. The mission ends with its quiet spell. After a crash
// the session also takes H1's crash repair, as always.
export function failRescue(profile, {reason = 'time', cratePay = 0, enabled} = {}) {
  if (enabled !== true) return rescueOff(profile);
  if (!FAIL_REASONS.includes(reason) || !Number.isSafeInteger(cratePay) || cratePay < 0)
    return {ok: false, reason: 'That is not a way a rescue fails.', profile};
  const heli = heliOf(profile), missions = missionsOf(profile), r = missions.rescue;
  if (!r) return {ok: false, reason: 'There is no rescue in hand.', profile};
  const supply = r.kind === 'supply', held = wallet(profile), paid = supply ? Math.min(MAX_CREDITS, held + cratePay) : held;
  const charge = chargeRepair({...profile, credits: paid}, supply ? RESCUE_MONEY.supplyFailureCharge : RESCUE_MONEY.failureCharge, {enabled: true});
  const ended = withCount(endMission(missions, {playDay: heli.playDay.count, rescue: true}), RESCUE_TALLY[r.kind], -RESCUE_MONEY.tallyDrop);
  const stored = setMissions(charge.profile, {...ended, last: r.kind}, {enabled: true});
  return {ok: true, profile: stored.profile, kind: r.kind, reason, condition: 2, charged: charge.charged, forgiven: charge.forgiven,
    cratePaid: paid - held, crashRepair: reason === 'crash', line: supply ? 'heli.radio.supply.late' : 'heli.radio.rescue.late'};
}

// A rescue is done (the handover, or the last crate): pay in whole credits (a
// people rescue's `peoplePay`, or the supply run's pay from heli-rescue.js),
// the kind's tally up one, the people counted and the rescue badge with the
// first, and the mission ends with its quiet spell (section 3.5). A hoist
// rescue leaves the driver's car on the slope for the recovery job: `site` is
// where it lies, {x, z}.
export function finishRescue(profile, {pay, site = null, enabled} = {}) {
  if (enabled !== true) return rescueOff(profile);
  if (!Number.isSafeInteger(pay) || pay < 0) return {ok: false, reason: 'Pay is a whole number of credits.', profile};
  const heli = heliOf(profile), missions = missionsOf(profile), r = missions.rescue;
  if (!r) return {ok: false, reason: 'There is no rescue in hand.', profile};
  const people = CASUALTY_KINDS.includes(r.kind), firstBadge = people && !missions.badges.includes('rescue');
  let next = withCount(endMission(missions, {playDay: heli.playDay.count, rescue: true}), RESCUE_TALLY[r.kind], RESCUE_MONEY.tallyGain);
  next = {...next, last: r.kind};
  if (people) next = withCount(next, 'rescued', 1);
  if (firstBadge) next = {...next, badges: [...next.badges, 'rescue']};
  if (r.kind === 'hoist' && site && Number.isFinite(site.x) && Number.isFinite(site.z))
    next = {...next, wreck: wreckFor({seed: r.seed, courseId: r.courseId, x: site.x, z: site.z, day: heli.playDay.count})};
  const held = wallet(profile), total = Math.min(MAX_CREDITS, held + pay);
  const stored = setMissions({...profile, credits: total}, next, {enabled: true});
  return {ok: true, profile: stored.profile, kind: r.kind, paid: total - held, firstBadge,
    rescued: stored.profile.heli.missions.rescued ?? 0, wreck: stored.profile.heli.missions.wreck ?? null};
}
