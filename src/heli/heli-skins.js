// Skins, gear, dirt and the wash (docs/HELI_WILDLIFE.md sections 5 and 6).
// Pure functions: no screen, no storage, no clock, no random. A profile goes
// in and a new profile comes out; nothing is changed in place. Money moves
// only through a returned profile, so the caller applies a result once and a
// second call on the old profile can never charge twice. Every helper takes
// {enabled}, the heli-skins switch (effective only with the helicopter on).
import {heliOf, missionsOf, SKIN_KINDS, DIRT_KINDS, DIRT_MAX, RANK_SKIN_KINDS} from './heli-save.js';
import {HELI_PAYS} from './heli-pay.js';

// ---- the tables: every number is written once, here ----------------------

// Missions of one kind that earn its skin (section 5.1).
export const EARN_AT = 5;

// Buying sooner (section 5.1): 2,500 less 400 for each mission of that kind
// already done, never below 900. The TV skin has no missions and costs 2,500.
export const SKIN_PRICE = Object.freeze({base: 2500, perMission: 400, floor: 900, tv: 2500});

// The wash (section 6): 100 credits, everything back to 0. Brian suggests it
// when the grime first passes 80.
export const WASH = Object.freeze({cost: 100, hintAbove: 80});

// Each skin: its name, its look (body, lower and tail, stripe), the saved
// count that earns it (null: bought only) and the gear that comes with it.
export const SKINS = Object.freeze({
  ...Object.fromEntries(RANK_SKIN_KINDS.map((id, i) => [id, Object.freeze({name: ['Student pilot', 'Private pilot', 'Commercial pilot', 'Mountain pilot', 'Chief pilot'][i], look: Object.freeze([['white', 'orange', 'white'], ['midnight blue', 'midnight blue', 'silver'], ['forest green', 'cream', 'cream'], ['red', 'white', 'silver'], ['cream', 'signal red', 'cream']][i]), tally: null, gear: Object.freeze([])})])),
  stock: Object.freeze({name: 'Stock', look: Object.freeze(['white', 'navy', 'red']), tally: null, gear: Object.freeze([])}),
  fire: Object.freeze({name: 'Fire service', look: Object.freeze(['red', 'yellow', 'white']), tally: 'firesOut',
    gear: Object.freeze(['water-gauge', 'drop-sight'])}),
  medevac: Object.freeze({name: 'Medevac', look: Object.freeze(['white', 'white', 'red']), tally: 'hoists',
    gear: Object.freeze(['winch', 'stretcher'])}),
  rescue: Object.freeze({name: 'Search and rescue', look: Object.freeze(['rescue yellow', 'red', 'black']), tally: 'searches',
    gear: Object.freeze(['searchlight', 'heat-camera'])}),
  wildlife: Object.freeze({name: 'Wildlife', look: Object.freeze(['olive', 'brown', 'dark green']), tally: 'wildlifeCounts',
    gear: Object.freeze(['quiet-tips', 'zoom-camera'])}),
  supply: Object.freeze({name: 'Supply', look: Object.freeze(['orange', 'white', 'black']), tally: 'supplies',
    gear: Object.freeze(['cargo-net', 'strong-hook'])}),
  // Bought only until camera flights exist (Kyle, section 15).
  tv: Object.freeze({name: 'TV camera', look: Object.freeze(['black', 'black', 'gold']), tally: null,
    gear: Object.freeze(['nose-camera'])}),
});

// The numbers a flight reads when no skin gear is worn (the packets' base
// kit). A zero or false is "not there"; null is "the H4 rule without it".
export const BASE_GEAR = Object.freeze({
  litreGauge: false, dropSight: false,
  lineMin: 15, lineMax: 15, reelSpeed: 0,
  bumpHurtAbove: null, bumpTwoStepsAbove: null, hoistPayBonus: 0,
  searchNightMinutes: 0,
  heatRange: 0, heatBuriedRange: 0, heatAnimals: false,
  scareDistance: 100, countReach: 60,
  crates: 1, hookReach: 4, hookLimitKg: 1500,
  noseCamera: false,
});

// Section 5.3: each piece of gear, the skin it comes with and what it sets
// (metres, metres a second, minutes, credits). Worn gear replaces the base.
export const GEAR = Object.freeze({
  'water-gauge': Object.freeze({skin: 'fire', effect: Object.freeze({litreGauge: true})}),
  'drop-sight': Object.freeze({skin: 'fire', effect: Object.freeze({dropSight: true})}),
  winch: Object.freeze({skin: 'medevac', effect: Object.freeze({lineMin: 5, lineMax: 40, reelSpeed: 1.5})}),
  stretcher: Object.freeze({skin: 'medevac', effect: Object.freeze({bumpHurtAbove: 8, bumpTwoStepsAbove: 14, hoistPayBonus: HELI_PAYS.stretcher})}),
  searchlight: Object.freeze({skin: 'rescue', effect: Object.freeze({searchNightMinutes: 8})}),
  'heat-camera': Object.freeze({skin: 'rescue', effect: Object.freeze({heatRange: 150, heatBuriedRange: 30, heatAnimals: true})}),
  'quiet-tips': Object.freeze({skin: 'wildlife', effect: Object.freeze({scareDistance: 50})}),
  'zoom-camera': Object.freeze({skin: 'wildlife', effect: Object.freeze({countReach: 100})}),
  'cargo-net': Object.freeze({skin: 'supply', effect: Object.freeze({crates: 2})}),
  // The hook limit stays 1,500 kg (heavier lifting is the Lab's). Its reach
  // keeps its old share over the plain hook (5 m to 3 m) on the wider 4 m
  // hook (FIX-HELI-HOOK): 4 x 5 / 3, to a tenth of a metre.
  'strong-hook': Object.freeze({skin: 'supply', effect: Object.freeze({hookReach: 6.7})}),
  'nose-camera': Object.freeze({skin: 'tv', effect: Object.freeze({noseCamera: true})}),
});

// Section 6: how each kind of dirt builds. Metres, seconds, whole levels.
// Dust and mud need a course; salt needs the helicopter over the sea (the
// caller says so); soot needs a fire.
export const DIRT_RULES = Object.freeze({
  dust: Object.freeze({engineSeconds: 600, lowSeconds: 120, lowHeight: 30, landing: 2,
    courses: Object.freeze(['panorama-ridge', 'summit-run', 'summit-time-attack'])}),
  mud: Object.freeze({landing: 3, dip: 1, courses: Object.freeze(['tremblant-woods', 'tremblant-snow'])}),
  soot: Object.freeze({drop: 2, dropRadius: 30, fireSeconds: 60, fireRadius: 100}),
  salt: Object.freeze({seaSeconds: 120, seaHeight: 50}),
});

const NOT_AVAILABLE = 'Skins are not available yet.';
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const credits = profile => Number.isFinite(profile?.credits) ? Math.max(0, Math.floor(profile.credits)) : 0;
const off = profile => ({ok: false, reason: NOT_AVAILABLE, profile});
const failure = (profile, reason) => ({ok: false, reason, profile});
const withHeli = (profile, heli) => ({...profile, heli});
const zeroDirt = () => Object.fromEntries(DIRT_KINDS.map(kind => [kind, 0]));
const validSkin = kind => typeof kind === 'string' && SKIN_KINDS.includes(kind);

// ---- reading -----------------------------------------------------------

// What the profile holds, with the defaults for a save that has no skins yet.
export function skinsOf(profile) {
  const skins = heliOf(profile).skins;
  return skins ? {owned: [...skins.owned], worn: skins.worn, fresh: [...skins.fresh]} : {owned: [], worn: 'stock', fresh: []};
}

// Missions done toward a skin, from the mission counts the engine keeps
// (fires out, hoists, searches, supply runs, wildlife counts). Missions done
// before H3 count: they are the same fields. The TV skin has none.
export function tallyOf(profile, kind) {
  if (!validSkin(kind) || !SKINS[kind].tally) return 0;
  const missions = missionsOf(profile);
  return Number.isSafeInteger(missions[SKINS[kind].tally]) ? missions[SKINS[kind].tally] : 0;
}

// The price to buy a skin sooner, or null for a name that is not a skin.
export function skinPrice(profile, kind) {
  if (!validSkin(kind)) return null;
  if (kind === 'tv') return SKIN_PRICE.tv;
  return Math.max(SKIN_PRICE.floor, SKIN_PRICE.base - SKIN_PRICE.perMission * tallyOf(profile, kind));
}

// The paint shop's rows: "Fire service 3/5", what is owned, worn and fresh,
// and the price. The TV skin shows no tally (need is null).
export function skinRows(profile) {
  const {owned, worn, fresh} = skinsOf(profile);
  return SKIN_KINDS.map(kind => ({kind, name: SKINS[kind].name, tally: tallyOf(profile, kind),
    need: SKINS[kind].tally ? EARN_AT : null, owned: owned.includes(kind), worn: worn === kind,
    fresh: fresh.includes(kind), price: skinPrice(profile, kind)}));
}

// ---- earning -----------------------------------------------------------

// Gives every skin whose count has reached five and is not owned yet, in the
// order of SKIN_KINDS when more than one comes at once (missions done before
// H3). An earned skin is fresh until it is worn. `first` is true when this
// gives the first skin of the save, which is Brian's line and a board note.
export function earnSkins(profile, {enabled} = {}) {
  if (enabled !== true) return off(profile);
  const skins = skinsOf(profile);
  const earned = SKIN_KINDS.filter(kind => SKINS[kind].tally && !skins.owned.includes(kind) && tallyOf(profile, kind) >= EARN_AT);
  if (!earned.length) return {ok: true, earned, first: false, profile};
  const next = {owned: [...skins.owned, ...earned], worn: skins.worn, fresh: [...skins.fresh, ...earned]};
  return {ok: true, earned, first: skins.owned.length === 0, profile: withHeli(profile, {...heliOf(profile), skins: next})};
}

// ---- buying ------------------------------------------------------------

// Buys a skin sooner at the pad: the whole price or nothing. A skin already
// owned costs nothing and charges nothing. A skin whose five missions are done
// is earned, not bought: earnSkins gives it free.
export function buySkin(profile, kind, {enabled} = {}) {
  if (enabled !== true) return off(profile);
  if (!validSkin(kind) || kind === 'stock') return failure(profile, 'That is not a skin you can buy.');
  const skins = skinsOf(profile);
  if (skins.owned.includes(kind)) return failure(profile, 'You already own that skin.');
  if (SKINS[kind].tally && tallyOf(profile, kind) >= EARN_AT) return failure(profile, 'You have earned that skin. It is free.');
  const price = skinPrice(profile, kind), wallet = credits(profile), short = price - wallet;
  if (short > 0) return failure(profile, `You need ${short.toLocaleString('en-US')} more credit${short === 1 ? '' : 's'}.`);
  const next = {owned: [...skins.owned, kind], worn: skins.worn, fresh: [...skins.fresh, kind]};
  return {ok: true, price, profile: {...withHeli(profile, {...heliOf(profile), skins: next}), credits: wallet - price}};
}

// ---- wearing -----------------------------------------------------------

// Wears an owned skin or the stock paint. The first time a new skin is worn it
// is a fresh coat: every dirt goes back to 0. Wearing what is already worn
// changes nothing. (The 1.5 second fade is the view's.)
export function wearSkin(profile, kind, {enabled} = {}) {
  if (enabled !== true) return off(profile);
  const skins = skinsOf(profile);
  if (kind !== 'stock' && !((validSkin(kind) || RANK_SKIN_KINDS.includes(kind)) && skins.owned.includes(kind))) return failure(profile, 'You do not own that skin.');
  if (skins.worn === kind) return {ok: true, already: true, freshCoat: false, profile};
  const freshCoat = skins.fresh.includes(kind), heli = heliOf(profile);
  const next = {owned: skins.owned, worn: kind, fresh: skins.fresh.filter(other => other !== kind)};
  const changed = freshCoat ? {...heli, skins: next, dirt: zeroDirt()} : {...heli, skins: next};
  return {ok: true, already: false, freshCoat, profile: withHeli(profile, changed)};
}

// The skin a fit button offers in the same click ("Fit the bucket" with the
// fire service skin owned): the skin when it is owned and not worn, else null.
export function skinOffer(profile, kind) {
  const {owned, worn} = skinsOf(profile);
  return validSkin(kind) && kind !== 'stock' && owned.includes(kind) && worn !== kind ? kind : null;
}

// ---- gear --------------------------------------------------------------

// The gear that works now: only the worn skin's, and none with the switch off.
export function gearWorn(profile, {enabled} = {}) {
  return enabled === true ? [...SKINS[skinsOf(profile).worn].gear] : [];
}

// Every number a flight reads: the base kit with the worn skin's gear laid
// over it. Stock paint, or the switch off, gives the base kit exactly.
export function gearStats(profile, {enabled} = {}) {
  const stats = {...BASE_GEAR};
  for (const id of gearWorn(profile, {enabled})) Object.assign(stats, GEAR[id].effect);
  return stats;
}

// ---- dirt --------------------------------------------------------------

// The grime drawn: the four levels added, at most 100.
export function grimeOf(profile) {
  const dirt = heliOf(profile).dirt;
  return dirt ? Math.min(DIRT_MAX, DIRT_KINDS.reduce((sum, kind) => sum + dirt[kind], 0)) : 0;
}

// A flight's tally so far: seconds and counts the dirt is worked out from.
// Plain data, so a session keeps it between ticks and the same flight always
// gives the same dirt.
export function createFlightDirt() {
  return {engineSeconds: 0, lowDrySeconds: 0, nearFireSeconds: 0, lowSeaSeconds: 0,
    dustLandings: 0, mudLandings: 0, dips: 0, drops: 0};
}

// Adds a stretch of flight. ctx: {courseId, height (m above ground), overSea,
// fireDistance (m to the nearest burning cell, or null)}. Engine time counts
// anywhere; the rest by where the helicopter is.
export function addFlightTime(record, seconds, ctx = {}) {
  if (!Number.isFinite(seconds) || seconds <= 0) return record;
  const {dust, soot, salt} = DIRT_RULES;
  const lowDry = dust.courses.includes(ctx.courseId) && Number.isFinite(ctx.height) && ctx.height < dust.lowHeight;
  const nearFire = Number.isFinite(ctx.fireDistance) && ctx.fireDistance <= soot.fireRadius;
  const lowSea = ctx.overSea === true && Number.isFinite(ctx.height) && ctx.height < salt.seaHeight;
  return {...record, engineSeconds: record.engineSeconds + seconds,
    lowDrySeconds: record.lowDrySeconds + (lowDry ? seconds : 0),
    nearFireSeconds: record.nearFireSeconds + (nearFire ? seconds : 0),
    lowSeaSeconds: record.lowSeaSeconds + (lowSea ? seconds : 0)};
}

// A landing off a pad on a course (on a pad adds nothing): dust on the dry
// courses, mud on the wet ones, nothing elsewhere.
export function addLanding(record, courseId, {onPad} = {}) {
  if (onPad === true) return record;
  if (DIRT_RULES.dust.courses.includes(courseId)) return {...record, dustLandings: record.dustLandings + 1};
  if (DIRT_RULES.mud.courses.includes(courseId)) return {...record, mudLandings: record.mudLandings + 1};
  return record;
}

// A bucket dip (mud).
export const addDip = record => ({...record, dips: record.dips + 1});

// A water drop; it soots only within 30 m of a burning cell.
export function addDrop(record, fireDistance) {
  return Number.isFinite(fireDistance) && fireDistance <= DIRT_RULES.soot.dropRadius ? {...record, drops: record.drops + 1} : record;
}

// Turns the tally into whole dirt levels and keeps what is left over (part of
// an interval) so the session can carry it into the next stretch.
// Many small time steps add up with a hair of float error (6000 s in 1/60 s
// steps can land a hair short of 10 intervals); the slack makes them settle
// like one big step.
const SUM_SLACK = 1e-9;

export function settleFlightDirt(record) {
  const {dust, mud, soot, salt} = DIRT_RULES;
  const dustEngine = Math.floor(record.engineSeconds / dust.engineSeconds + SUM_SLACK);
  const dustLow = Math.floor(record.lowDrySeconds / dust.lowSeconds + SUM_SLACK);
  const sootFire = Math.floor(record.nearFireSeconds / soot.fireSeconds + SUM_SLACK);
  const saltSea = Math.floor(record.lowSeaSeconds / salt.seaSeconds + SUM_SLACK);
  const gains = {dust: dustEngine + dustLow + record.dustLandings * dust.landing,
    mud: record.mudLandings * mud.landing + record.dips * mud.dip,
    soot: record.drops * soot.drop + sootFire, salt: saltSea};
  return {gains, rest: {...createFlightDirt(),
    engineSeconds: Math.max(0, record.engineSeconds - dustEngine * dust.engineSeconds),
    lowDrySeconds: Math.max(0, record.lowDrySeconds - dustLow * dust.lowSeconds),
    nearFireSeconds: Math.max(0, record.nearFireSeconds - sootFire * soot.fireSeconds),
    lowSeaSeconds: Math.max(0, record.lowSeaSeconds - saltSea * salt.seaSeconds)}};
}

// Adds whole levels to the saved dirt, kind by kind in the order of DIRT_KINDS.
// Each kind stops at 100 and the four together stop at 100 (the drawn grime).
// When the room runs out, the new dirt still goes on and the same amount comes
// off the other kinds one level at a time, from the largest first (ties in the
// order dust, mud, soot, salt), so the grime shows the latest flying: a fire
// after a dusty week turns the coat sooty. `hint` is true when the grime first
// passes 80 (Brian suggests a wash).
export function addDirt(profile, gains, {enabled} = {}) {
  if (enabled !== true) return off(profile);
  if (!isObject(gains)) return failure(profile, 'That is not a dirt amount.');
  const heli = heliOf(profile), before = {...zeroDirt(), ...heli.dirt};
  const after = {...before};
  const total = dirt => DIRT_KINDS.reduce((sum, kind) => sum + dirt[kind], 0);
  for (const kind of DIRT_KINDS) {
    const gain = Number.isSafeInteger(gains[kind]) && gains[kind] > 0 ? Math.min(gains[kind], DIRT_MAX - after[kind]) : 0;
    after[kind] += gain;
    for (let over = total(after) - DIRT_MAX; over > 0; over--) {
      let largest = null;
      for (const other of DIRT_KINDS) if (other !== kind && after[other] > 0 && (largest === null || after[other] > after[largest])) largest = other;
      if (largest === null) break;
      after[largest]--;
    }
  }
  if (DIRT_KINDS.every(kind => after[kind] === before[kind])) return {ok: true, hint: false, profile};
  return {ok: true, hint: total(before) <= WASH.hintAbove && total(after) > WASH.hintAbove,
    profile: withHeli(profile, {...heli, dirt: after})};
}

// ---- the wash ----------------------------------------------------------

// The wash at the home pad, on the ground: 100 credits, all four dirts back
// to 0. The whole price or nothing; a clean helicopter is not washed or
// charged.
export function washHelicopter(profile, {enabled, onGround} = {}) {
  if (enabled !== true) return off(profile);
  if (onGround !== true) return failure(profile, 'Land at the pad first.');
  if (grimeOf(profile) === 0) return failure(profile, 'She is already clean.');
  const wallet = credits(profile), short = WASH.cost - wallet;
  if (short > 0) return failure(profile, `You need ${short.toLocaleString('en-US')} more credit${short === 1 ? '' : 's'}.`);
  return {ok: true, price: WASH.cost, profile: {...withHeli(profile, {...heliOf(profile), dirt: zeroDirt()}), credits: wallet - WASH.cost}};
}
