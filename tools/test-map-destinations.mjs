// The pilot's map in the helicopter (docs/PILOT_MAP.md sections 3 and 4, card
// MAP-DESTINATIONS): with the switch off every helicopter table and answer is
// as it was; with it on every place is a destination (or is named as left off),
// legs and refusals follow the map, three pads sell fuel at their prices, the
// sea is a crash, jobs may name any owned destination and a course you own
// lists its corners. All of it runs without graphics.
import assert from 'node:assert/strict';
import {COURSE} from '../src/config.js';
import {Course} from '../src/course.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {heliOf, buyFuel, HELI_MONEY} from '../src/heli/heli-save.js';
import {
  HELI_DESTINATIONS, HELI_DESTINATIONS_WITH_SUMMIT, HOME_COURSE, JOB_ROUTES, JOBS_PER_DAY, MAP_JOB_PAY,
  destinationsFor, isDestination, legFuelKg, bearing, dayJobs, jobTitle, mapJobPay,
} from '../src/heli/heli-jobs.js';
import {createHeliSession, courseSite, SEA_LEVEL, HELI_SESSION} from '../src/heli/heli-session.js';
import {SEA_LEVEL as DRAWN_SEA_LEVEL} from '../src/coastal-water.js';
import {FEATURE_STATES} from '../src/feature-flags.js';
import {
  PLACES, LEFT_OFF, FUEL_PADS, PLACE_ALTITUDES, legFuelKgMap, mapDistanceKm, placeOfCourse,
} from '../src/heli/pilot-map-data.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const near = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} not within ${tolerance} of ${expected}`);
  checks++;
};
const fnv = text => { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };

// Courses are built the way the game builds a helicopter visit (seed 1989).
const worlds = new Map();
function loadCourse(id) {
  if (!worlds.has(id)) {
    const course = new Course(COURSE.find(def => def.id === id), 1989);
    worlds.set(id, {course, ground: groundFromCourse(course)});
  }
  return worlds.get(id);
}
function pilot(view, target, {speed = 6} = {}) {
  const h = view.heli;
  const fwdX = Math.sin(h.heading), fwdZ = Math.cos(h.heading), rightX = -fwdZ, rightZ = fwdX;
  const dx = target.x - h.x, dz = target.z - h.z, distance = Math.hypot(dx, dz);
  const want = Math.min(speed, distance * 0.4);
  const wx = distance > 0.01 ? dx / distance * want : 0, wz = distance > 0.01 ? dz / distance * want : 0;
  const ex = wx - h.vx, ez = wz - h.vz, clamp = v => Math.max(-1, Math.min(1, v));
  return {pitch: clamp((ex * fwdX + ez * fwdZ) * 0.25), roll: clamp((ex * rightX + ez * rightZ) * 0.25),
    lift: clamp(((target.y ?? h.y) - h.y) * 0.3 - h.vy * 0.3), yaw: 0};
}
function run(session, seconds, controls = () => ({}), until = null) {
  const events = [];
  for (let i = 0; i < Math.round(seconds * 120); i++) {
    events.push(...session.step(controls(session.view())));
    if (until?.(session.view(), events)) break;
  }
  return events;
}
const TRAINED = Object.freeze({liftoff: true, hover: true, landing: true, carry: true});
const profileWith = ({credits = 5000, owned = [], heli = {}} = {}) => normalizeProfile({...createProfile(), credits,
  courses: {version: 1, unlocked: owned}, heli: {version: 1, fuelKg: 400, refuels: 1, ...heli, lessons: TRAINED}});
const sessionAt = (courseId, {pilotMap = true, profile = profileWith(), summitRun = false, today = '2026-10-24'} = {}) => {
  const session = createHeliSession({profile, enabled: true, loadCourse, carId: 'falcone_f42', today, summitRunEnabled: summitRun, pilotMapEnabled: pilotMap});
  session.start(courseId);
  session.takeEvents();
  return session;
};

ok(FEATURE_STATES['pilot-map'] === 'on', 'the pilot map is released (28 October 2026)');

// ---- Switch off: every table and answer as it was ------------------------------------------
// Taken from the helicopter files of the commit before this card (loaded and hashed by hand).
{
  const BEFORE = {jobs: 471279539, legs: 3081688097, bearings: 3418701639, titles: 516794368, tables: 4158423665};
  const ids = ['tremblant-woods', 'tremblant-snow', 'panorama-ridge', 'summit-run', 'ardennes-forest', 'nope'];
  const jobs = []; for (let day = 0; day < 100; day++) jobs.push(dayJobs(day));
  const legs = []; for (const a of ids) for (const b of ids) legs.push([legFuelKg(a, b), legFuelKg(a, b, {summitRun: true})]);
  const bearings = []; for (const a of ids) for (const b of ids) bearings.push([bearing(a, b), bearing(a, b, {summitRun: true})]);
  const titles = jobs.flat().map(job => jobTitle(job));
  same({jobs: fnv(JSON.stringify(jobs)), legs: fnv(JSON.stringify(legs)), bearings: fnv(JSON.stringify(bearings)), titles: fnv(JSON.stringify(titles)),
    tables: fnv(JSON.stringify([destinationsFor(), destinationsFor({summitRun: true}), destinationsFor({summitRun: false})]))}, BEFORE,
  'switch off: 100 days of jobs, the legs, the bearings, the job titles and the tables are what the old code gave');
  same(JSON.stringify(dayJobs(5, {pilotMap: false, owned: ['harbour-lights']})), JSON.stringify(dayJobs(5)), 'switch off: owned courses change no job');
  ok(destinationsFor() === HELI_DESTINATIONS && destinationsFor({summitRun: true}) === HELI_DESTINATIONS_WITH_SUMMIT, 'switch off: the very same tables');
  ok(!isDestination('harbour-lights') && !isDestination('harbour-lights', {summitRun: true}), 'switch off: Harbour Lights is no destination');
  same(legFuelKg('tremblant-woods', 'eifel-crown', {summitRun: true}), null, 'switch off: no leg to a new place');
  // A session with the switch off, or told nothing, flies the same and lists nothing new.
  const a = sessionAt('tremblant-woods', {pilotMap: false}), b = sessionAt('tremblant-woods', {pilotMap: false});
  const c = createHeliSession({profile: profileWith(), enabled: true, loadCourse, carId: 'falcone_f42', today: '2026-10-24'});
  c.start(); c.takeEvents();
  for (const s of [a, b, c]) run(s, 6, v => pilot(v, {x: v.heli.x + 30, z: v.heli.z, y: v.heli.groundY + 25}));
  same(a.fingerprint(), c.fingerprint(), 'switch off: the option changes nothing about a flight');
  ok(!('scout' in a.view()) && !('destinations' in a.view()), 'switch off: the view has no scout and no destination list');
  assert.throws(() => sessionAt('harbour-lights', {pilotMap: false}), /Not a helicopter destination/); checks++;
}

// ---- Switch on: the destinations ------------------------------------------------------------------
const placeIds = PLACES.filter(place => !place.air).map(place => place.courses[0]);
{
  const withSummit = destinationsFor({summitRun: true, pilotMap: true}), without = destinationsFor({pilotMap: true});
  same(Object.keys(withSummit), placeIds.filter(id => !LEFT_OFF.includes(id)), 'every place is a destination, but those left off');
  same(Object.keys(without), Object.keys(withSummit).filter(id => id !== 'summit-run'), 'Summit Run still needs its own switch');
  same(LEFT_OFF, ['ardennes-forest'], 'Ardennes Forest is the one place left off (no clear landing circle)');
  ok(destinationsFor({pilotMap: true}) === destinationsFor({pilotMap: true}) && withSummit['tremblant-snow'] === HELI_DESTINATIONS['tremblant-snow'] && withSummit['summit-run'] === HELI_DESTINATIONS_WITH_SUMMIT['summit-run'],
    'the original destinations are the same records');
  ok(Object.values(withSummit).every(d => d.name && Number.isFinite(d.baseAltitude) && d.mapKm && d.home === (d.id === HOME_COURSE)), 'each has a name, an altitude, a place on the map');
  ok(Object.values(withSummit).every(d => d.baseAltitude <= 2860), 'Summit Run stays the highest');
  same(Object.fromEntries(Object.entries(PLACE_ALTITUDES).filter(([id]) => withSummit[id]).map(([id, m]) => [id, withSummit[id].baseAltitude === m])), Object.fromEntries(Object.keys(PLACE_ALTITUDES).filter(id => withSummit[id]).map(id => [id, true])), 'the new places take the map\'s altitudes');
  ok(isDestination('harbour-lights', {pilotMap: true}) && !isDestination('ardennes-forest', {pilotMap: true}) && !isDestination('the-table', {pilotMap: true}), 'harbour yes; Ardennes and the air-only Table no');
  // Every place faces every other: a unit vector, either way round (the Neon districts are drawn apart).
  for (const a of Object.keys(withSummit)) for (const b of Object.keys(withSummit)) {
    if (a === b) continue;
    const to = bearing(a, b, {summitRun: true, pilotMap: true}), back = bearing(b, a, {summitRun: true, pilotMap: true});
    if (!to || !back || Math.abs(Math.hypot(to.x, to.z) - 1) > 1e-9 || Math.abs(to.x + back.x) > 1e-9 || Math.abs(to.z + back.z) > 1e-9) assert.fail(`bearing ${a} to ${b}`);
  }
  checks++;
  same(bearing('tremblant-woods', 'eifel-crown', {pilotMap: true}), (() => { const d = Math.hypot(12, 9); return {x: 12 / d, z: 9 / d}; })(), 'Eifel Crown lies north-east of home');
}

// ---- A landing zone for each one ------------------------------------------------------------------
{
  const flags = {summitRun: true, summitRescue: false, pilotMap: true};
  for (const id of Object.keys(destinationsFor({summitRun: true, pilotMap: true}))) {
    const {course, ground} = loadCourse(id);
    const site = courseSite(course, ground, id, flags);
    ok(site.zone.radius === HELI_SESSION.zoneRadius && Number.isFinite(site.zone.y) && site.area.maxX > site.area.minX, `${id}: a landing zone and a flying area`);
  }
  // Ardennes Forest is left off because the search really finds nothing there.
  assert.throws(() => { const {course, ground} = loadCourse('ardennes-forest'); courseSite(course, ground, 'ardennes-forest', {summitRun: true, pilotMap: true}); }, /No clear landing zone/); checks++;
  // And the ground is there to land on: finite over each place's road, the six circuits untouched.
  for (const id of placeIds.filter(id => !LEFT_OFF.includes(id))) {
    const {course, ground} = loadCourse(id);
    const bad = course.samples.filter((_, i) => i % 60 === 0).filter(p => !Number.isFinite(ground.height(p.x + 3, p.z - 2)));
    ok(bad.length === 0, `${id}: the helicopter's ground answers along the whole road`);
  }
}

// ---- The six circuits' ground is byte for byte what it was --------------------------------------------
{
  const out = {};
  for (const id of ['tremblant-woods', 'tremblant-snow', 'harbour-lights', 'panorama-ridge', 'summit-run', 'ardennes-forest']) {
    const {course, ground} = loadCourse(id);
    const xs = course.samples.map(p => p.x), zs = course.samples.map(p => p.z);
    const minX = Math.min(...xs) - 500, maxX = Math.max(...xs) + 500, minZ = Math.min(...zs) - 500, maxZ = Math.max(...zs) + 500;
    const list = [];
    for (let i = 0; i <= 40; i++) for (let j = 0; j <= 40; j++) list.push(ground.height(minX + (maxX - minX) * i / 40, minZ + (maxZ - minZ) * j / 40));
    for (let k = 0; k < course.samples.length; k += 37) list.push(ground.height(course.samples[k].x + 3, course.samples[k].z - 2));
    out[id] = list;
  }
  // SUMMIT-GROUND-GAPS (26 October 2026): only Summit changed, 3 of its heights by at most 0.17 m under the filled hillside; the other five are identical.
  // SUMMIT-FINISH-AREA (26 October 2026): only Summit changed, 2 heights (at most 13.2 m) where the flat car park is cut into the slope.
  same(fnv(JSON.stringify(out)), 3139209002, 'the ground of the six authored circuits: 10,614 heights, unchanged since the Summit finish area');
}

// ---- Legs and refusals ------------------------------------------------------------------------------------
{
  const on = {summitRun: true, pilotMap: true};
  for (const [a, b, kg] of [['tremblant-snow', 'tremblant-woods', 25], ['panorama-ridge', 'tremblant-woods', 120], ['panorama-ridge', 'tremblant-snow', 110],
    ['summit-run', 'tremblant-woods', 160], ['summit-run', 'tremblant-snow', 150], ['panorama-ridge', 'summit-run', 90]]) {
    same([legFuelKg(a, b, on), legFuelKg(b, a, on)], [kg, kg], `${a} and ${b}: still ${kg} kg`);
  }
  same(legFuelKg('tremblant-woods', 'pacific-canyon', on), 290, 'home to Pacific Canyon: 290 kg');
  same(legFuelKg('tremblant-woods', 'eifel-crown', on), 185, 'home to Eifel Crown: 185 kg');
  same(legFuelKg('tremblant-woods', 'ardennes-forest', on), null, 'a place left off has no leg');
  same(legFuelKg('tremblant-woods', 'tremblant-woods', on), null, 'nor the same place');
  ok(legFuelKg('harbour-lights', 'alpine-serpent', on) === legFuelKgMap('harbour-lights', 'alpine-serpent'), 'the map\'s rule is the leg');
  same(legFuelKg('tremblant-woods', 'titan-arena', on), legFuelKgMap('tremblant-woods', 'titan-stadium'), 'the stadium is reached by its Monster Arena course');

  // A leg beyond the tank is refused with the existing radio line; a good one is taken.
  const toEdge = (session, id) => {
    session.setDestination(id);
    session.pressAutopilot();
    return run(session, 600, () => ({}), v => v.cruiseOffered);
  };
  const far = sessionAt('harbour-lights');
  const farFuel = legFuelKgMap('harbour-lights', 'cloudbreak-skyway');
  ok(farFuel > 400, `Cloudbreak Skyway is ${farFuel} kg from Harbour Lights: more than a tank`);
  ok(far.setDestination('cloudbreak-skyway'), 'it can be chosen');
  toEdge(far, 'cloudbreak-skyway');
  ok(far.view().cruiseOffered, 'the cruise leg is offered at the edge of the area');
  const before = far.view().heli.fuelKg;
  same(far.acceptCruise(), false, 'but a leg longer than the tank is refused');
  const refused = far.takeEvents();
  ok(refused.some(e => e.type === 'cruiseRefused' && e.needKg === farFuel) && refused.some(e => e.type === 'radio' && e.line === 'heli.radio.cruise.refused'), 'with the existing radio line, and the fuel needed');
  same(far.view().heli.fuelKg, before, 'and no fuel is taken');

  const good = sessionAt('tremblant-woods');
  ok(good.setDestination('eifel-crown'), 'Eifel Crown can be chosen');
  toEdge(good, 'eifel-crown');
  const fuelAtEdge = good.view().heli.fuelKg;
  ok(good.view().cruiseOffered && good.acceptCruise(), 'the 185 kg leg is offered and taken');
  const arrival = run(good, 8, () => ({}), (v, events) => events.some(e => e.type === 'entered'));
  ok(arrival.some(e => e.type === 'entered' && e.arrived === true && e.courseId === 'eifel-crown'), 'and Eifel Crown is entered');
  const v = good.view(), toward = bearing('eifel-crown', 'tremblant-woods', on);
  near(v.heli.fuelKg, fuelAtEdge - 185, 0.2, 'the leg took 185 kg');
  // Arriving: 1.5 km out toward where it came from, facing the pad (the way of the map).
  near(Math.hypot(v.heli.x - v.zone.x, v.heli.z - v.zone.z), HELI_SESSION.arrivalDistance, 40, 'it arrives 1.5 km out');
  near(Math.atan2(v.heli.x - v.zone.x, v.heli.z - v.zone.z), Math.atan2(toward.x, toward.z), 0.05, 'on the side toward home');
  near(Math.cos(v.heli.heading - Math.atan2(v.zone.x - v.heli.x, v.zone.z - v.heli.z)), 1, 0.01, 'facing the landing zone');
}

// ---- Fuel pads -----------------------------------------------------------------------------------------------------
{
  same(FUEL_PADS.filter(pad => !pad.truck && pad.place !== HOME_COURSE).map(pad => [pad.place, pad.pricePerKg]), [['harbour-lights', 1.8], ['pacific-canyon', 2.0], ['alpine-serpent', 2.2]], 'three new pads and their prices');
  const buyAt = (courseId, kg, {credits = 1000, fuel = 100} = {}) => {
    const session = sessionAt(courseId, {profile: profileWith({credits, heli: {fuelKg: fuel, refuels: 1}})});
    const result = session.buyFuel(kg);
    return {result, left: session.profile.credits, fuel: session.view().heli.fuelKg};
  };
  const home = buyAt('tremblant-woods', 50);
  same([home.result.ok, home.result.cost], [true, 75], 'the home pump: 50 kg for 75 credits (1.5 a kg)');
  for (const [id, price] of [['harbour-lights', 1.8], ['pacific-canyon', 2.0], ['alpine-serpent', 2.2]]) {
    const bought = buyAt(id, 50);
    same([bought.result.ok, bought.result.kg, bought.result.cost, bought.left, bought.fuel], [true, 50, Math.round(50 * price), 1000 - Math.round(50 * price), 150], `${id}: 50 kg at ${price} a kg`);
  }
  const fill = buyAt('alpine-serpent', Infinity, {fuel: 0, credits: 2000});
  same([fill.result.kg, fill.result.cost, fill.fuel], [400, 880, 400], 'a full tank at Alpine Serpent: 880 credits');
  const partial = buyAt('pacific-canyon', Infinity, {fuel: 0, credits: 100});
  same([partial.result.ok, partial.result.partial, partial.result.cost <= 100, partial.result.kg], [true, true, true, 50], 'with 100 credits at 2.0 a kg: 50 kg, never more than the credits pay for');
  // The free first tank stays the home pad's.
  const first = createHeliSession({profile: profileWith({credits: 1000, heli: {fuelKg: 0, refuels: 0}}), enabled: true, loadCourse, carId: 'falcone_f42', pilotMapEnabled: true});
  first.start('harbour-lights'); first.takeEvents();
  const paid = first.buyFuel(100);
  same([paid.ok, paid.cost, first.profile.heli.refuels], [true, 180, 0], 'a new pilot pays at a pad; the free tank is still the home pad\'s');
  // No pump elsewhere, none with the helicopter in the air, none with the switch off.
  const none = sessionAt('eifel-crown');
  same(none.buyFuel(50), {ok: false, reason: 'The pump is at the home pad.'}, 'no pump at Eifel Crown');
  const flying = sessionAt('harbour-lights');
  run(flying, 4, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.heli.groundY + 20}), v => !v.heli.onGround);
  run(flying, 4, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.heli.groundY + 20}));
  same(flying.buyFuel(50).ok, false, 'no fuel from the air');
  // The pad price belongs to the pad: Harbour Lights charges 1.8, the home pump 1.5, in the same code.
  ok(HELI_MONEY.creditsPerKg === 1.5, 'the home pump\'s price is still 1.5');
}

// ---- The money code: buyFuel with a price ------------------------------------------------------------------------
{
  const on = {enabled: true};
  const withHeli = (fuelKg, refuels, credits) => ({...createProfile(), credits, heli: {...heliOf(createProfile()), fuelKg, refuels}});
  // Left out, or nonsense, the price is 1.5 and every result is the old one.
  for (const price of [undefined, NaN, 0, -2, 'x', null, Infinity]) {
    for (const [fuel, refuels, wallet, kg] of [[0, 3, 1000, 10.1], [0, 2, 100, Infinity], [0, 3, 1000, 0.19], [390.5, 1, 1000, 50], [0, 2, 7, Infinity], [0, 0, 10, 100]]) {
      same(buyFuel(withHeli(fuel, refuels, wallet), kg, price === undefined ? on : {...on, pricePerKg: price}), buyFuel(withHeli(fuel, refuels, wallet), kg, on), `price ${String(price)}: ${kg} kg is as at the home pump`);
    }
  }
  same(buyFuel(withHeli(0, 1, 1000), 1.5, {...on, pricePerKg: 1.5}), buyFuel(withHeli(0, 1, 1000), 1.5, on), 'an explicit 1.5 is the default');
  const dear = buyFuel(withHeli(0, 1, 1000), 100, {...on, pricePerKg: 2.2});
  same([dear.ok, dear.kg, dear.cost, dear.profile.credits, dear.profile.heli.fuelKg], [true, 100, 220, 780, 100], '100 kg at 2.2 is 220 credits');
  same(buyFuel(withHeli(0, 1, 1000), 10.1, {...on, pricePerKg: 1.8}).cost, Math.ceil(101 * 18 / 100), 'rounded up to a whole credit, as at the pump (10.1 kg at 1.8)');
  const short = buyFuel(withHeli(0, 1, 100), Infinity, {...on, pricePerKg: 2.0});
  same([short.kg, short.cost, short.partial], [50, 100, true], 'short of credits: what they pay for, not a credit more');
  for (const wallet of [1, 2, 3, 7, 19, 50, 99, 100, 333]) for (const price of [1.5, 1.8, 2.0, 2.2]) {
    const r = buyFuel(withHeli(0, 2, wallet), Infinity, {...on, pricePerKg: price});
    if (r.ok) { assert.ok(r.cost <= wallet && r.profile.credits === wallet - r.cost && r.profile.credits >= 0, `wallet ${wallet} at ${price}`); checks++; }
  }
  // The reviewer's gaps: exact charges and maximal partial purchases against whole-number arithmetic, at every price.
  for (const price of [1.5, 1.8, 2.0, 2.2]) {
    const rate = Math.round(price * 10);
    for (let wallet = 0; wallet <= 400; wallet++) {
      const r = buyFuel(withHeli(0, 2, wallet), Infinity, {...on, pricePerKg: price});
      const full = Math.ceil(4000 * rate / 100);
      if (wallet >= full) { if (!r.ok || r.kg !== 400 || r.cost !== full || r.partial) assert.fail(`${price} full tank with ${wallet}`); continue; }
      const tenths = Math.floor(wallet * 100 / rate);
      if (tenths < 1) { if (r.ok) assert.fail(`${price} with ${wallet} bought something`); continue; }
      if (!r.ok || r.kg !== tenths / 10 || r.cost !== Math.ceil(tenths * rate / 100) || r.cost > wallet || !r.partial || Math.ceil((tenths + 1) * rate / 100) <= wallet && (tenths + 1) * rate / 100 <= wallet)
        assert.fail(`${price} with ${wallet} credits: ${JSON.stringify([r.ok, r.kg, r.cost, r.partial])}`);
    }
    checks++;
  }
  same([1.8, 2.2].map(price => { const r = buyFuel(withHeli(0, 1, 100), Infinity, {...on, pricePerKg: price}); return [r.kg, r.cost, r.partial]; }), [[55.5, 100, true], [45.4, 100, true]], 'with 100 credits: 55.5 kg at 1.8, 45.4 kg at 2.2, and never over');
  same(buyFuel(withHeli(399.4, 1, 1000), 50, {...on, pricePerKg: 2.2}).kg, 0.6, 'a nearly full tank takes only what fits, at a dear price');
  same(buyFuel(withHeli(0, 1, 1e9), Infinity, {...on, pricePerKg: 2.2}).cost, 880, 'a huge wallet and Infinity kg: the full tank, 880 credits');
  same(buyFuel(withHeli(0, 1, 1000), 0.19, {...on, pricePerKg: 2.2}).kg, 0.1, 'asking 0.19 kg buys 0.1 at a dear price too');
  for (const bad of [0, NaN, -5]) same(buyFuel(withHeli(0, 1, 1000), bad, {...on, pricePerKg: 2.2}).ok, false, `${bad} kg buys nothing at a dear price`);
  same(buyFuel(withHeli(0, 1, 1000), 100, {...on, pricePerKg: 1.55}).cost, 160, 'a price is kept to a tenth of a credit: 1.55 reads as 1.6');
  same(buyFuel(withHeli(0, 0, 0), 100, {...on, pricePerKg: 2.2}).cost, 0, 'the first tank is free at any price');
  same(buyFuel(withHeli(0, 1, 0), 100, {...on, pricePerKg: 2.2}).ok, false, 'no credits, no fuel');
  same(buyFuel(withHeli(0, 1, 1000), 100, {enabled: false, pricePerKg: 2.2}).ok, false, 'the helicopter switch still decides');
}

// ---- Over the sea ------------------------------------------------------------------------------------------------------
{
  same(SEA_LEVEL, DRAWN_SEA_LEVEL, 'the helicopter\'s sea level is the one the coast draws');
  const coastal = ['pacific-canyon', 'high-country', 'harbor-highlands'];
  ok(coastal.every(id => loadCourse(id).course.sections.some(s => s.theme === 'coast')), 'the three coastal courses draw an ocean');
  // Find sea inside the flying area of Pacific Canyon, nearest the pad.
  const world = loadCourse('pacific-canyon'), site = courseSite(world.course, world.ground, 'pacific-canyon', {summitRun: true, pilotMap: true});
  let sea = null;
  for (let x = site.area.minX + 40; x <= site.area.maxX - 40; x += 40) for (let z = site.area.minZ + 40; z <= site.area.maxZ - 40; z += 40) {
    if (world.ground.height(x, z) < SEA_LEVEL - 4 && world.ground.height(x + 30, z) < SEA_LEVEL - 4 && world.ground.height(x - 30, z) < SEA_LEVEL - 4
      && (!sea || Math.hypot(x - site.zone.x, z - site.zone.z) < Math.hypot(sea.x - site.zone.x, sea.z - site.zone.z))) sea = {x, z};
  }
  ok(sea, 'Pacific Canyon has sea inside its flying area');
  const descend = (session, target) => {
    const events = [];
    events.push(...run(session, 30, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.heli.groundY + 40}), v => v.heli.y > v.heli.groundY + 36));
    events.push(...run(session, 200, v => pilot(v, {x: target.x, z: target.z, y: v.heli.y}, {speed: 12}), v => Math.hypot(v.heli.x - target.x, v.heli.z - target.z) < 12));
    events.push(...run(session, 60, v => ({...pilot(v, {x: target.x, z: target.z, y: v.heli.y}, {speed: 1}), lift: v.heli.y > v.heli.groundY + 6 ? -0.3 : -0.12}), (v, got) => got.some(e => e.type === 'touchdown' || e.type === 'crash')));
    return events;
  };
  const seaFlight = sessionAt('pacific-canyon');
  const over = descend(seaFlight, sea);
  ok(over.some(e => e.type === 'crash' && e.cause === 'sea') && over.some(e => e.type === 'crashed' && e.cause === 'sea'), 'a gentle descent onto the sea is a crash');
  ok(!over.some(e => e.type === 'touchdown'), 'not a landing');
  ok(over.some(e => e.type === 'charged' && e.kind === 'crash' && e.charged > 0), 'with the usual repair bill');
  // The control: the same descent over the land is a landing.
  const land = sessionAt('pacific-canyon');
  const down = descend(land, {x: site.zone.x + 25, z: site.zone.z + 25});
  ok(down.some(e => e.type === 'touchdown') && !down.some(e => e.type === 'crash'), 'the same descent over land is a landing');
  // The sea is never lower than its surface; without the map, the course is as it was.
  const view = seaFlight.view();
  ok(view.phase === 'crashed' || view.heli.groundY >= SEA_LEVEL, 'the helicopter\'s ground is never below the sea\'s surface');
  const off = createHeliSession({profile: profileWith(), enabled: true, loadCourse, carId: 'falcone_f42'});
  ok(off.view().heli === null, 'without the map a coastal course cannot be entered (no destination)');
}

// ---- Jobs between owned destinations --------------------------------------------------------------------------------------
{
  same([4.99, 5, 11.99, 12, 19.99, 20, 250].map(mapJobPay), [300, 450, 450, 600, 600, 800, 800], 'job pay by distance: 300 under 5 km, 450 from 5, 600 from 12, 800 from 20');
  same(MAP_JOB_PAY.map(row => row.pay), [300, 450, 600, 800], 'the four pays');
  const dests = destinationsFor({summitRun: true, pilotMap: true});
  const classic = new Set(JOB_ROUTES.map(r => `${r.from}>${r.to}`));
  const everyone = Object.keys(dests);
  // Owning nothing the board is the old board; owning the original three adds only routes among them.
  for (let day = 0; day < 40; day++) same(dayJobs(day, {pilotMap: true, owned: []}), dayJobs(day), `day ${day}: with nothing owned the board is the old board`);
  const three = ['tremblant-woods', 'tremblant-snow', 'panorama-ridge'];
  let reversed = 0;
  for (let day = 0; day < 80; day++) for (const job of dayJobs(day, {pilotMap: true, owned: three})) {
    if (!three.includes(job.from) || !three.includes(job.to)) assert.fail(`day ${day}: ${job.from} to ${job.to}`);
    if (!classic.has(`${job.from}>${job.to}`)) reversed++;
  }
  checks++;
  ok(reversed > 20, `owning the original three adds their reverse routes (${reversed} jobs in 80 days)`);
  let beyond = 0;
  for (let day = 0; day < 120; day++) {
    const jobs = dayJobs(day, {pilotMap: true, owned: everyone});
    if (jobs.length !== JOBS_PER_DAY || new Set(jobs.map(j => `${j.from}>${j.to}`)).size !== JOBS_PER_DAY || new Set(jobs.map(j => j.carId)).size !== JOBS_PER_DAY) assert.fail(`day ${day}`);
    same(dayJobs(day, {pilotMap: true, owned: everyone}), jobs, `day ${day}: the same every time`);
    jobs.forEach((job, i) => {
      if (job.id !== `d${day}-${i + 1}` || !dests[job.from] || !dests[job.to] || job.from === job.to) assert.fail(`day ${day} job ${i}`);
      const expectPay = classic.has(`${job.from}>${job.to}`) ? JOB_ROUTES.find(r => r.from === job.from && r.to === job.to).pay : mapJobPay(mapDistanceKm(placeOfCourse(job.from).id, placeOfCourse(job.to).id));
      if (job.pay !== expectPay) assert.fail(`pay ${job.from}>${job.to}: ${job.pay} is not ${expectPay}`);
      if (legFuelKgMap(placeOfCourse(job.from).id, placeOfCourse(job.to).id) > 400) assert.fail(`${job.from}>${job.to} is beyond a tank`);
      if (!classic.has(`${job.from}>${job.to}`)) beyond++;
      if (!jobTitle(job).includes(dests[job.to].name)) assert.fail(`title ${jobTitle(job)}`);
    });
    checks++;
  }
  ok(beyond > 100, `${beyond} of 360 jobs name routes beyond the original three`);
  // Only owned destinations: owning Harbour Lights alone adds it (and the originals) and nothing else.
  const harbour = ['harbour-lights'];
  for (let day = 0; day < 60; day++) {
    for (const job of dayJobs(day, {pilotMap: true, owned: harbour})) {
      if (!classic.has(`${job.from}>${job.to}`) && (job.from !== 'harbour-lights' && job.to !== 'harbour-lights')) assert.fail('an unowned place on the board');
    }
  }
  checks++;
  // In a session: the board is the map's, a taken job from a far pick-up sends the pilot there first.
  const owned = ['tremblant-woods', 'tremblant-snow', 'panorama-ridge', 'eifel-crown', 'harbour-lights', 'pacific-canyon'];
  const pOn = profileWith({owned});
  const session = sessionAt('tremblant-woods', {profile: pOn});
  const day = heliOf(session.profile).playDay.count;
  const board = session.boardJobs().filter(job => !job.own);
  same(board.map(job => [job.id, job.from, job.to, job.pay]), dayJobs(day, {pilotMap: true, owned: Object.keys(dests).filter(id => owned.includes(id))}).map(job => [job.id, job.from, job.to, job.pay]), 'the session\'s board is the map\'s board for the courses owned');
  const off = sessionAt('tremblant-woods', {pilotMap: false, profile: pOn});
  same(off.boardJobs().filter(job => !job.own).map(job => [job.from, job.to, job.pay]), dayJobs(day).map(job => [job.from, job.to, job.pay]), 'with the map off the board is the old one');
}

// ---- Scouting ----------------------------------------------------------------------------------------------------------------
{
  const ownsWoods = profileWith({owned: ['tremblant-woods']});
  const woods = sessionAt('tremblant-woods', {profile: ownsWoods}).view();
  ok(woods.scout && woods.scout.courseId === 'tremblant-woods', 'over an owned course the view carries its corners');
  ok(woods.scout.corners.length >= 5 && woods.scout.corners.every(c => Number.isFinite(c.x) && Number.isFinite(c.z) && c.label), `${woods.scout.corners.length} corners, each with a place and a label`);
  ok(woods.scout.corners.some(c => c.name === 'Pine Drop'), 'named like the course\'s own boards (Pine Drop)');
  ok(Object.isFrozen(woods.scout) && Object.isFrozen(woods.scout.corners), 'the list is read only');
  same(sessionAt('tremblant-woods', {profile: ownsWoods}).view().scout, woods.scout, 'the same every time');
  same(sessionAt('alpine-serpent').view().scout, null, 'over a course not owned: nothing to read');
  ok(sessionAt('pacific-canyon').view().scout?.corners.length >= 1, 'Pacific Canyon, free to everyone, scouts from the start');
  const owned = sessionAt('alpine-serpent', {profile: profileWith({owned: ['alpine-serpent']})}).view();
  ok(owned.scout?.courseId === 'alpine-serpent' && owned.scout.corners.length >= 3, 'owned, it lists its corners');
  const summit = sessionAt('summit-run', {summitRun: true, profile: profileWith({owned: ['summit-run']})}).view();
  ok(summit.scout?.corners.length >= 10, 'an open road (Summit Run) scouts too');
  ok(new Set(woods.destinations).size === woods.destinations.length && woods.destinations.includes('harbour-lights') && !woods.destinations.includes('ardennes-forest'), 'the view lists the destinations');
}

console.log(`PASS MAP-DESTINATIONS: the pilot's map in the helicopter (${checks} checks)`);
