// A course burnt in a forest fire (docs/HELI_FIRE.md section 8): closed for
// 10 play days, bought back early for 10,000 credits less 1,000 a play day,
// and its regrowth by play days since the burn. Pure, and outside src/heli/
// so the course menu and the race start can read it; it imports nothing
// from the helicopter. It reads profile.heli as stored: heli-save.js keeps
// that field clean. `enabled` is the forestFire switch (with the helicopter
// switch); off, nothing is closed and nothing is drawn burnt, whatever the
// save says.

export const CLOSURE = Object.freeze({closedDays: 10, buybackStart: 10_000, buybackPerDay: 1_000, healedDay: 60, scarHealedDay: 40});

// Days since the burn at which each stage of the burnt course starts.
export const BURN_STAGES = Object.freeze([
  Object.freeze({stage: 'closed', from: 0}), Object.freeze({stage: 'black', from: 10}),
  Object.freeze({stage: 'shoots', from: 20}), Object.freeze({stage: 'fireweed', from: 35}),
  Object.freeze({stage: 'healed', from: CLOSURE.healedDay}),
]);
// A fire put out leaves a scar that heals sooner (section 8.5).
export const SCAR_STAGES = Object.freeze([
  Object.freeze({stage: 'black', from: 0}), Object.freeze({stage: 'shoots', from: 10}),
  Object.freeze({stage: 'fireweed', from: 25}), Object.freeze({stage: 'healed', from: CLOSURE.scarHealedDay}),
]);

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
// The save's own limit for a count (heli-save.js), so a stored and a loaded save read alike.
const whole = value => Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000 ? value : null;
const heliField = profile => isObject(profile?.heli) ? profile.heli : null;

// Today's play day number: the helicopter's play day count.
export function playDayOf(profile) {
  return whole(heliField(profile)?.playDay?.count) ?? 0;
}

function burnEntry(profile, courseId) {
  const burnt = heliField(profile)?.burnt;
  if (!isObject(burnt) || !Object.hasOwn(burnt, courseId) || !isObject(burnt[courseId])) return null;
  const day = whole(burnt[courseId].day);
  return day === null ? null : {day, boughtBack: burnt[courseId].boughtBack === true};
}

const stageAt = (stages, days) => stages.reduce((found, item) => days >= item.from ? item.stage : found, stages[0].stage);

// Play days since the course burnt, or null when it has not.
export function daysSinceBurn(profile, courseId, today = playDayOf(profile)) {
  const entry = burnEntry(profile, courseId);
  return entry ? Math.max(0, today - entry.day) : null;
}

export function courseClosed(profile, courseId, today = playDayOf(profile), {enabled} = {}) {
  if (enabled !== true) return false;
  const entry = burnEntry(profile, courseId);
  return !!entry && !entry.boughtBack && Math.max(0, today - entry.day) < CLOSURE.closedDays;
}

// What buying the course back costs today, or null when it is open.
export function buybackPrice(profile, courseId, today = playDayOf(profile), {enabled} = {}) {
  if (!courseClosed(profile, courseId, today, {enabled})) return null;
  return CLOSURE.buybackStart - CLOSURE.buybackPerDay * daysSinceBurn(profile, courseId, today);
}

// The burnt look a course is drawn with: 'closed', 'black', 'shoots',
// 'fireweed', or null for the normal course. A course bought back early
// looks black until its closed days would have ended.
export function burnStage(profile, courseId, today = playDayOf(profile), {enabled} = {}) {
  if (enabled !== true) return null;
  const entry = burnEntry(profile, courseId);
  if (!entry) return null;
  const days = Math.max(0, today - entry.day);
  const stage = stageAt(BURN_STAGES, days);
  if (stage === 'healed') return null;
  return stage === 'closed' && entry.boughtBack ? 'black' : stage;
}

// Thin smoke wisps rise from the burn on its first three play days.
export function burnSmoke(profile, courseId, today = playDayOf(profile), {enabled} = {}) {
  const days = enabled === true ? daysSinceBurn(profile, courseId, today) : null;
  return days !== null && days <= 2;
}

// The course's scars still showing: [{cells, stage}], oldest first.
export function scarLooks(profile, courseId, today = playDayOf(profile), {enabled} = {}) {
  if (enabled !== true) return [];
  const scars = heliField(profile)?.scars;
  if (!Array.isArray(scars)) return [];
  const out = [];
  for (const scar of scars) {
    if (!isObject(scar) || scar.courseId !== courseId || whole(scar.day) === null || !Array.isArray(scar.cells)) continue;
    const stage = stageAt(SCAR_STAGES, Math.max(0, today - scar.day));
    if (stage !== 'healed') out.push(Object.freeze({cells: Object.freeze(scar.cells.filter(cell => whole(cell) !== null)), stage}));
  }
  return out;
}

// What the course menu shows on a burnt course's card (section 8.2), or
// null for a normal card. credits is what the player has now.
export function closureCard(profile, courseId, today = playDayOf(profile), {enabled, credits = 0, name = 'This course'} = {}) {
  if (enabled !== true) return null;
  const days = daysSinceBurn(profile, courseId, today);
  if (days === null) return null;
  if (courseClosed(profile, courseId, today, {enabled})) {
    const left = CLOSURE.closedDays - days, price = buybackPrice(profile, courseId, today, {enabled});
    const wallet = Number.isFinite(credits) ? Math.max(0, Math.floor(credits)) : 0;
    return Object.freeze({closed: true, reopened: false, daysLeft: left, price, short: Math.max(0, price - wallet),
      lines: Object.freeze(['Closed: burnt in a forest fire.', `Reopens in ${left} play ${left === 1 ? 'day' : 'days'}.`]),
      refusal: `${name} is closed after a forest fire.`,
      // The line under START on the main menu, so a closed course never leaves START doing nothing.
      startNote: `${name} is closed after a forest fire. It reopens in ${left} play ${left === 1 ? 'day' : 'days'}, or buy it back in Your Courses.`});
  }
  // The play day it reopens by itself, the card says so once.
  if (days === CLOSURE.closedDays && !burnEntry(profile, courseId).boughtBack)
    return Object.freeze({closed: false, reopened: true, daysLeft: 0, price: null, short: 0,
      lines: Object.freeze(['Reopened after the fire.']), refusal: null});
  return null;
}

export const formatCredits = amount => Math.round(amount).toLocaleString('en-US');
