// The helicopter mode (docs/HELICOPTER.md sections 2, 6, 9 and 11): a
// headless flight from the home pad to Panorama Ridge with a car, the same
// fingerprint every run; landing zones, flying areas, cruise legs, fuel at
// the pump, repairs; the switch, the input context and the import guard.
import assert from 'node:assert/strict';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {FEATURE_STATES} from '../src/feature-flags.js';
import {INPUT_CONTEXTS, heliControls, keyboardAction} from '../src/input-contexts.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {canHook} from '../src/heli/heli-cable.js';
import {createHeliState, stepHeli, HELI_STEP, GRAVITY, KESTREL} from '../src/heli/heli-flight.js';
import {flatGround} from '../src/heli/heli-ground.js';
import {supplyPickup} from '../src/heli/heli-search.js';
import {SUPPLY_CRATES} from '../src/heli/heli-rescue.js';
import {heliOf, carAt} from '../src/heli/heli-save.js';
import {HOME_COURSE, HELI_DESTINATIONS, legFuelKg, bearing} from '../src/heli/heli-jobs.js';
import {createHeliSession, courseSite, insideArea, HELI_SESSION} from '../src/heli/heli-session.js';

const DEG = Math.PI / 180;
let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const near = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} not within ${tolerance} of ${expected}`);
  checks++;
};

const worlds = new Map();
function loadCourse(id) {
  if (!worlds.has(id)) {
    const course = new Course(ALL_CIRCUITS.find(def => def.id === id), 1989);
    worlds.set(id, {course, ground: groundFromCourse(course)});
  }
  return worlds.get(id);
}

// A steady test pilot in Assisted: flies the helicopter to a point and
// height using only the keys a player has.
function pilot(view, target, {speed = 6} = {}) {
  const h = view.heli;
  const fwdX = Math.sin(h.heading), fwdZ = Math.cos(h.heading), rightX = -fwdZ, rightZ = fwdX;
  const dx = target.x - h.x, dz = target.z - h.z, distance = Math.hypot(dx, dz);
  const want = Math.min(speed, distance * 0.4);
  const wx = distance > 0.01 ? dx / distance * want : 0, wz = distance > 0.01 ? dz / distance * want : 0;
  const ex = wx - h.vx, ez = wz - h.vz;
  const clamp = v => Math.max(-1, Math.min(1, v));
  return {
    pitch: clamp((ex * fwdX + ez * fwdZ) * 0.25),
    roll: clamp((ex * rightX + ez * rightZ) * 0.25),
    lift: clamp((target.y - h.y) * 0.3 - h.vy * 0.3),
    yaw: 0,
  };
}

// A pilot who has finished the instructor's lessons (HELI-LESSONS gates
// the pump after the free tank, the dispatch board and carrying cars on
// them; tools/test-heli-lessons.mjs covers a new pilot).
const TRAINED = Object.freeze({liftoff: true, hover: true, landing: true, carry: true});
function freshProfile() {
  return normalizeProfile({...createProfile(), credits: 3000, heli: {version: 1, lessons: TRAINED, fuelKg: 0, lessons: TRAINED}});
}

function run(session, seconds, controls = () => ({}), until = null) {
  const events = [];
  for (let i = 0; i < Math.round(seconds * 120); i++) {
    events.push(...session.step(controls(session.view())));
    if (until?.(session.view(), events)) break;
  }
  return events;
}

// The switch, the input context and the destinations.
assert.equal(FEATURE_STATES.helicopter, 'on', 'the helicopter is released (Kyle, 14 October 2026)'); checks++;
assert.throws(() => createHeliSession({profile: freshProfile(), loadCourse}), /switch is off/); checks++;
ok(INPUT_CONTEXTS.heli && keyboardAction('heli', 'KeyH') === 'heli-hook' && keyboardAction('heli', 'KeyP') === 'heli-autopilot',
  'the heli context has H for the hook and P for the autopilot');
ok(keyboardAction('heli', 'Digit1') === null && keyboardAction('heli', 'KeyE') === null, 'race keys do not reach the car while flying');
assert.deepEqual(heliControls({KeyW: true, ArrowUp: true, ArrowLeft: true, KeyD: true}), {lift: 1, pitch: 1, roll: -1, yaw: 1}); checks++;
assert.deepEqual(heliControls({}, {axes: [0.5, -1, 0, 0.9]}), {lift: -0.9, pitch: 1, roll: 0.5, yaw: 0}); checks++;
assert.deepEqual(Object.keys(HELI_DESTINATIONS), ['tremblant-woods', 'tremblant-snow', 'panorama-ridge']); checks++;
assert.equal(HOME_COURSE, 'tremblant-woods'); checks++;
assert.equal(legFuelKg('tremblant-woods', 'tremblant-snow'), 25); checks++;
assert.equal(legFuelKg('panorama-ridge', 'tremblant-woods'), 120); checks++;
assert.equal(legFuelKg('tremblant-snow', 'panorama-ridge'), 110); checks++;
assert.equal(legFuelKg('tremblant-woods', 'tremblant-woods'), null); checks++;

// Landing zones beside each start, clear and level; flying areas.
for (const id of Object.keys(HELI_DESTINATIONS)) {
  const {course, ground} = loadCourse(id);
  const site = courseSite(course, ground, id);
  const start = course.at(0);
  ok(Math.hypot(site.zone.x - start.x, site.zone.z - start.z) < 220, `${id}: the zone is beside the start`);
  ok(ground.near(site.zone.x, site.zone.z, site.zone.radius).every(o => o.top <= site.zone.y + 0.5), `${id}: nothing tall in the zone`);
  ok(Math.hypot(site.parking.x - site.zone.x, site.parking.z - site.zone.z) > site.zone.radius, `${id}: the parking spot is off the pad`);
  ok(insideArea(site.area, start.x, start.y + 50, start.z), `${id}: the start is inside the flying area`);
  ok(!insideArea(site.area, start.x, site.area.ceiling + 1, start.z), `${id}: the ceiling is 300 m above the start`);
  near(site.area.ceiling, start.y + 300, 1e-9, `${id}: ceiling height`);
  for (const other of Object.keys(HELI_DESTINATIONS)) if (other !== id) {
    const toward = bearing(id, other);
    const p = {x: site.zone.x + toward.x * 1500, z: site.zone.z + toward.z * 1500};
    ok(insideArea(site.area, p.x, start.y + 150, p.z), `${id}: the arrival point from ${other} is inside the area`);
  }
  assert.deepEqual(courseSite(course, ground, id), site, `${id}: the same zone every time`); checks++;
}

// Summit Run (docs/HELI_RESCUE.md sections 5.5 and 12), a fourth place only with
// its switch on: its landing zone and flying area, and the thin-air supply run.
{
  const {course, ground} = loadCourse('summit-run');
  const options = {summitRun: true};
  const site = courseSite(course, ground, 'summit-run', options);
  const start = course.at(0);
  ok(Math.hypot(site.zone.x - start.x, site.zone.z - start.z) < 220, 'summit-run: the zone is beside the start');
  ok(ground.near(site.zone.x, site.zone.z, site.zone.radius).every(o => o.top <= site.zone.y + 0.5), 'summit-run: nothing tall in the zone');
  ok(Math.hypot(site.parking.x - site.zone.x, site.parking.z - site.zone.z) > site.zone.radius, 'summit-run: the parking spot is off the pad');
  ok(insideArea(site.area, start.x, start.y + 50, start.z) && !insideArea(site.area, start.x, site.area.ceiling + 1, start.z), 'summit-run: the start is inside the flying area, under its ceiling');
  for (const other of ['tremblant-woods', 'tremblant-snow', 'panorama-ridge']) {
    const toward = bearing('summit-run', other, options);
    ok(insideArea(site.area, site.zone.x + toward.x * 1500, start.y + 150, site.zone.z + toward.z * 1500), `summit-run: the arrival point from ${other} is inside the area`);
    // And the other courses' areas take in the arrival point from Summit Run.
    const here = loadCourse(other), there = courseSite(here.course, here.ground, other, options), back = bearing(other, 'summit-run', options);
    ok(insideArea(there.area, there.zone.x + back.x * 1500, here.course.at(0).y + 150, there.zone.z + back.z * 1500), `${other}: the arrival point from summit-run is inside the area`);
    // With the switch off the area is what it was.
    assert.deepEqual(courseSite(here.course, here.ground, other), courseSite(here.course, here.ground, other, {summitRun: false})); checks++;
  }
  assert.deepEqual(courseSite(course, ground, 'summit-run', options), site, 'summit-run: the same zone every time'); checks++;
  // Thin air: the pickup is on the open road about 3,430 m up. The heaviest crate with a full tank does not climb out of it; half a tank does.
  const startY = course.at(0).y, altitude = y => 2860 + y - startY, pickup = supplyPickup(course, ground);
  near(altitude(pickup.y), 3430, 20, 'summit-run: the supply pickup is about 3,430 m up');
  const flat = flatGround(0);
  const climbIn60 = (metres, fuelKg, cargoKg) => {
    const h = createHeliState({x: 0, z: 0, heading: 0, fuelKg, mode: 'assisted', altitudeOffset: metres, ground: flat});
    Object.assign(h, {y: 40, onGround: false, engine: true, rotorPct: 100});
    for (let n = 0; n < 60 * 120; n++) stepHeli(h, {lift: 1}, {ground: flat, external: {x: 0, y: -cargoKg * GRAVITY, z: 0}}, HELI_STEP);
    return h.y - 40;
  };
  const heaviest = Math.max(...SUPPLY_CRATES.summitRun.map(crate => crate.massKg));
  ok(climbIn60(altitude(pickup.y), KESTREL.tankKg, heaviest) < 0, `summit-run: a full tank and the ${heaviest} kg crate do not leave the pickup`);
  ok(climbIn60(altitude(pickup.y), KESTREL.tankKg / 2, heaviest) > 30, 'summit-run: half a tank does');
  ok(climbIn60(0, KESTREL.tankKg, heaviest) > 30, 'at sea level the same load climbs easily: it is the thin air');
}

// Fuel at the pump: the first tank is free, then 1.5 credits a kg; only at home.
{
  const session = createHeliSession({profile: freshProfile(), enabled: true, loadCourse, carId: 'falcone_f42', today: '2026-10-14'});
  session.start();
  assert.equal(heliOf(session.profile).playDay.count, 1, 'the day counts as a play day'); checks++;
  assert.equal(session.view().heli.fuelKg, 0, 'a new pilot starts with an empty tank'); checks++;
  const first = session.buyFuel();
  ok(first.ok && first.cost === 0 && session.view().heli.fuelKg === 400, 'the first tank is free and full');
  run(session, 5, () => ({lift: 1}));
  const air = session.buyFuel(10);
  ok(!air.ok, 'no fuel in the air');
  run(session, 20, () => ({lift: -1}));
  const burned = 400 - session.view().heli.fuelKg;
  const second = session.buyFuel();
  near(second.cost, Math.ceil(Math.round(burned * 10) / 10 * 1.5), 1, 'refilling costs 1.5 credits a kg');
  assert.equal(session.profile.credits, 3000 - second.cost, 'credits paid'); checks++;
}

// Hard landing and crash charges; a crash goes home.
{
  const session = createHeliSession({profile: freshProfile(), enabled: true, loadCourse, mode: 'real'});
  session.start();
  session.buyFuel();
  run(session, 4, () => ({lift: 1}));
  const events = run(session, 30, () => ({lift: -1}), (view, seen) => seen.some(e => e.type === 'touchdown'));
  const touch = events.find(e => e.type === 'touchdown');
  ok(touch && touch.result !== 'good', `Real: dropping the collective lands hard or crashes (${touch?.result})`);
  const charged = events.filter(e => e.type === 'charged');
  ok(charged.length === 1 && [150, 800].includes(charged[0].charged), 'one repair is charged');
  if (touch.result === 'crash') {
    const after = run(session, 4);
    ok(after.some(e => e.type === 'entered' && e.courseId === HOME_COURSE) && session.phase === 'flying', 'after a crash you are back on the home pad');
  }
}

// Out of the area with no destination: held in. With one: cruise offered.
{
  const session = createHeliSession({profile: freshProfile(), enabled: true, loadCourse});
  session.start();
  session.buyFuel();
  run(session, 4, () => ({lift: 1}));
  const area = session.view().area;
  run(session, 120, () => ({lift: 1}), v => v.heli.y >= area.ceiling - 0.01);
  ok(session.view().heli.y >= area.ceiling - 0.01, 'climbed to the ceiling');
  run(session, 3, () => ({lift: 1}));
  ok(session.view().heli.y <= area.ceiling + 1e-9, 'the ceiling holds the helicopter in');
  session.setDestination('tremblant-snow');
  const offered = run(session, 2, () => ({lift: 1}), () => session.cruiseOffered);
  ok(offered.some(e => e.type === 'cruiseOffered' && e.to === 'tremblant-snow'), 'leaving with a destination offers Cruise');
  const fuel = session.view().heli.fuelKg;
  ok(session.acceptCruise(), 'Cruise accepted');
  const arrival = run(session, 2);
  ok(arrival.some(e => e.type === 'entered' && e.courseId === 'tremblant-snow' && e.arrived), 'arrived at Tremblant Snow');
  near(session.view().heli.fuelKg, fuel - 25, 0.5, 'the leg took 25 kg (plus half a second of flying)');
  const v = session.view();
  near(Math.hypot(v.heli.x - v.zone.x, v.heli.z - v.zone.z), HELI_SESSION.arrivalDistance, 12, 'arrived 1.5 km out (half a second ago at 20 m/s)');
  near(v.heli.y - v.zone.y, HELI_SESSION.arrivalHeight, 3, 'arrived 150 m up');
  const facing = Math.atan2(v.zone.x - v.heli.x, v.zone.z - v.heli.z);
  near(Math.abs(Math.atan2(Math.sin(facing - v.heli.heading), Math.cos(facing - v.heli.heading))), 0, 5 * DEG, 'facing the zone');
  assert.equal(heliOf(session.profile).flights, 1, 'the flight is counted'); checks++;
}

// Cruise refused without enough fuel.
{
  const session = createHeliSession({profile: normalizeProfile({...freshProfile(), heli: {version: 1, lessons: TRAINED, fuelKg: 100, refuels: 3}}),
    enabled: true, loadCourse});
  session.start();
  run(session, 4, () => ({lift: 1}));
  session.setDestination('panorama-ridge');
  const area = session.view().area;
  run(session, 60, () => ({lift: 1}), v => v.heli.y > area.ceiling);
  ok(session.cruiseOffered, 'offered');
  ok(!session.acceptCruise(), 'refused with 100 kg for a 120 kg leg');
  ok(session.takeEvents().some(e => e.type === 'cruiseRefused' && e.needKg === 120), 'the refusal says what the leg needs');
  assert.equal(session.courseId, HOME_COURSE, 'still at home'); checks++;
}

// Review cases: no destination change during the fade; a rotor-strike crash
// keeps the fuel it burned; nobody is stranded with an empty tank; a car
// too heavy says so only at the hook; no save when nothing changed.
{
  const session = createHeliSession({profile: freshProfile(), enabled: true, loadCourse});
  session.start();
  session.buyFuel();
  run(session, 4, () => ({lift: 1}));
  session.setDestination('tremblant-snow');
  run(session, 120, () => ({lift: 1}), () => session.cruiseOffered);
  ok(session.acceptCruise(), 'cruise to Tremblant Snow');
  const fuel = session.view().heli.fuelKg;
  ok(!session.setDestination('panorama-ridge') && !session.setDestination(null), 'no destination change during the fade');
  run(session, 2);
  assert.equal(session.courseId, 'tremblant-snow', 'the leg arrives where it was going'); checks++;
  ok(fuel - session.view().heli.fuelKg < 1, 'and took only that leg\'s fuel');
}
{
  const session = createHeliSession({profile: freshProfile(), enabled: true, loadCourse});
  session.start();
  session.buyFuel();
  run(session, 60, () => ({lift: 0.4}));
  const burned = 400 - session.view().heli.fuelKg;
  ok(burned > 20, `burned ${burned.toFixed(1)} kg`);
  // Fly into the nearest tall tree.
  const {ground} = loadCourse(HOME_COURSE);
  const h = session.view().heli;
  const tree = ground.near(h.x, h.z, 400).filter(o => o.kind === 'tree').sort((a, b) =>
    Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z))[0];
  const events = run(session, 120, v => pilot(v, {x: tree.x, z: tree.z, y: tree.top - 3}, {speed: 8}), (v, seen) => seen.some(e => e.type === 'crashed'));
  ok(events.some(e => e.type === 'crashed' && e.cause === 'rotor'), 'the rotor strikes the tree');
  run(session, 4);
  ok(session.view().heli.fuelKg < 400 - burned + 0.5, 'back home without a free refill');
}
{
  const broke = normalizeProfile({...freshProfile(), credits: 0, heli: {version: 1, lessons: TRAINED, fuelKg: 0, refuels: 4}});
  const session = createHeliSession({profile: broke, enabled: true, loadCourse});
  const events = [...session.start(), ...run(session, 0.1)];
  ok(events.some(e => e.type === 'charged' && e.kind === 'fuelTruck'), 'broke and empty at home: the fuel truck comes');
  ok(session.view().heli.fuelKg > 399.9 && session.view().heli.engine && session.profile.credits === 0, 'full tank, engine running, nothing charged below zero');
  const poor = createHeliSession({profile: normalizeProfile({...freshProfile(), credits: 50, heli: {version: 1, lessons: TRAINED, fuelKg: 0, refuels: 4}}),
    enabled: true, loadCourse});
  const poorEvents = [...poor.start(), ...poor.step()];
  const poorTruck = poorEvents.find(e => e.type === 'charged' && e.kind === 'fuelTruck');
  ok(poorTruck?.charged === 50 && poor.profile.credits === 0, 'with 50 credits (under a 60 kg reserve) the truck comes and takes the 50');
  const able = createHeliSession({profile: normalizeProfile({...freshProfile(), credits: 90, heli: {version: 1, lessons: TRAINED, fuelKg: 0, refuels: 4}}),
    enabled: true, loadCourse});
  ok(![...able.start(), ...able.step()].some(e => e.kind === 'fuelTruck'), 'with 90 credits the pump sells the reserve instead');
  const away = createHeliSession({profile: normalizeProfile({...freshProfile(), heli: {version: 1, lessons: TRAINED, fuelKg: 3, refuels: 2}}), enabled: true, loadCourse});
  away.start('tremblant-snow');
  const dry = run(away, 30);
  ok(dry.some(e => e.type === 'engineOut') && dry.some(e => e.type === 'charged' && e.kind === 'fuelTruck'), 'running dry on the ground away from home calls the truck');
  const first = createHeliSession({profile: freshProfile(), enabled: true, loadCourse});
  const quiet = [...first.start(), ...run(first, 0.5)];
  ok(!quiet.some(e => e.kind === 'fuelTruck'), 'a new pilot gets the free first tank, not the truck');
}
{
  let saves = 0;
  const session = createHeliSession({profile: normalizeProfile({...freshProfile(), heli: {version: 1, lessons: TRAINED, fuelKg: 400, refuels: 1}}),
    enabled: true, loadCourse, carId: 'banshee_muscle', persist: () => saves++});
  session.start();
  const full = session.buyFuel();
  ok(!full.ok && saves === 0, 'a full tank: no sale and no save');
  ok(session.pressHook() === null && !session.takeEvents().some(e => e.type === 'cannotLift'), 'H far from the Banshee says nothing');
  const car = session.view().load;
  run(session, 40, v => pilot(v, {x: car.x, z: car.z, y: car.y + 15.2}, {speed: 4}),
    v => Math.hypot(v.heli.x - car.x, v.heli.z - car.z) < 1 && Math.abs(v.heli.y - car.y - 15.2) < 0.6);
  session.pressHook();
  ok(session.takeEvents().some(e => e.type === 'cannotLift' && /Lab/.test(e.reason)), 'over the Banshee: it needs the Lab');
  ok(!session.view().load.hooked, 'and it is not hooked');
}

// The headless flight: hook the car at the home pad, fly to Panorama Ridge
// on the autopilot, cruise, approach, set the car down in the zone.
function flightToPanorama() {
  const persisted = [];
  const session = createHeliSession({profile: freshProfile(), enabled: true, loadCourse, carId: 'falcone_f42',
    today: '2026-10-14', persist: p => persisted.push(p.credits)});
  const log = [...session.start()];
  session.buyFuel();
  const car = () => session.view().load;
  ok(car() && car().id === 'falcone_f42' && car().onGround, 'the car waits beside the pad');
  // Lift off, fly over the car with the hook at the car's roof, hook it.
  log.push(...run(session, 40, v => pilot(v, {x: car().x, z: car().z, y: car().y + 15.2}, {speed: 4}),
    v => Math.hypot(v.heli.x - v.load.x, v.heli.z - v.load.z) < 1 && Math.abs(v.heli.y - v.load.y - 15.2) < 0.6 &&
      Math.hypot(v.heli.vx, v.heli.vy, v.heli.vz) < 0.5));
  const hooked = session.pressHook();
  assert.equal(hooked?.type, 'hooked', 'the car is hooked'); checks++;
  log.push(...run(session, 12, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.zone.y + 60})));
  ok(!car().onGround, 'the car is in the air');
  session.setDestination('panorama-ridge');
  ok(session.pressAutopilot(), 'P: the autopilot flies toward Panorama Ridge');
  log.push(...run(session, 300, () => ({}), () => session.cruiseOffered));
  ok(session.cruiseOffered, 'the autopilot reaches the edge of the area');
  const fuelBefore = session.view().heli.fuelKg;
  ok(session.acceptCruise(), 'Cruise');
  log.push(...run(session, 2));
  assert.equal(session.courseId, 'panorama-ridge', 'arrived at Panorama Ridge'); checks++;
  near(session.view().heli.fuelKg, fuelBefore - 120, 0.6, 'the leg took 120 kg (plus half a second of flying)');
  ok(session.view().load.hooked, 'the car came along');
  ok(session.autopilotOn, 'the autopilot is still on');
  log.push(...run(session, 300, () => ({}), (v, seen) => seen.some(e => e.type === 'autopilotArrived')));
  ok(log.some(e => e.type === 'autopilotArrived'), 'the autopilot stops in a hover over the zone');
  const v = session.view();
  near(Math.hypot(v.heli.x - v.zone.x, v.heli.z - v.zone.z), 0, 3, 'over the zone');
  session.pressAutopilot();
  // Let the car down gently onto the zone, then H.
  log.push(...run(session, 60, view => pilot(view, {x: view.zone.x, z: view.zone.z, y: view.zone.y + 0.7 + 14.6}, {speed: 1}),
    view => view.load.onGround));
  log.push(...run(session, 1, view => pilot(view, {x: view.heli.x, z: view.heli.z, y: view.heli.y})));
  ok(log.some(e => e.type === 'setDown'), 'a gentle set-down in the zone');
  const released = session.pressHook();
  assert.equal(released?.type, 'released', 'released cleanly'); checks++;
  const delivered = session.takeEvents().find(e => e.type === 'delivered');
  ok(delivered?.courseId === 'panorama-ridge', 'the car is delivered to Panorama Ridge');
  assert.equal(carAt(session.profile, 'falcone_f42'), 'panorama-ridge', 'the save remembers where the car is'); checks++;
  ok(!log.some(e => e.type === 'charged'), 'a clean flight costs no repairs');
  ok(!log.some(e => e.type === 'crash'), 'no crash');
  assert.equal(session.profile.credits, 3000, 'credits untouched (the first tank was free)'); checks++;
  const kept = session.leave();
  ok(heliOf(kept).fuelKg < 400 - 120 && heliOf(kept).fuelKg > 100, `fuel left is kept (${heliOf(kept).fuelKg} kg)`);
  ok(persisted.length > 0, 'the profile was saved along the way');
  return {fingerprint: session.fingerprint(), seconds: log.length};
}
const first = flightToPanorama();
const second = flightToPanorama();
assert.equal(second.fingerprint, first.fingerprint, 'the same flight every run'); checks++;
console.log(`  headless flight fingerprint: ${first.fingerprint.slice(0, 80)}...`);

// Import guard: src/heli is reached only through its named hooks, and its
// simulation files draw nothing.
{
  const root = fileURLToPath(new URL('../', import.meta.url));
  const walk = (dir, out = []) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path, out); else if (/\.(?:js|mjs|html)$/.test(name)) out.push(path);
    }
    return out;
  };
  // The rule (QA-TEST-AUDIT, replacing a list of approved file pairs): in the
  // game, only the named hook files may name a helicopter file, and the
  // renderer and page hooks name only drawing files. Tools, tests and browser
  // scenarios are not the game and may read any helicopter file. Any text
  // naming a helicopter file counts, whatever form the import takes.
  const drawingFile = /^heli\/heli-(?:scene|camera|ui|fire-view|rescue-view)\.(?:js|css)$/;
  const hooks = {
    'src/app.js': () => true,                      // the game's hooks into the helicopter
    'src/progression.js': name => name === 'heli/heli-save.js', // the save normalizer
    'src/sound-bank.js': name => name === 'heli/heli-audio.js', // the helicopter's cue list
    'src/screen-readiness.js': name => name === 'heli/heli-jobs.js', // why START is closed for an air-only car
    'src/render3d.js': name => drawingFile.test(name),
    'src/screen-router.js': name => drawingFile.test(name),
    // LAB-RULES: the Lab reads the helicopter's own numbers and lessons.
    'src/lab/lab-heli.js': name => /^heli\/heli-(?:flight|bucket|cable)\.js$/.test(name),
    'src/lab/lab-lessons.js': name => name === 'heli/heli-save.js',
    // LAB-HELI-CHALLENGES: the challenges run the fire rules, the thrust tank and the clear-ground search of the helicopter.
    'src/lab/lab-challenges.js': name => /^heli\/heli-(?:flight|fire|search)\.js$/.test(name),
  };
  // LAB-BENCHES: each bench runs the helicopter's own rules (never its drawing files).
  const labBench = name => !drawingFile.test(name);
  const offenders = [];
  const pages = readdirSync(root).filter(name => name.endsWith('.html')).map(name => join(root, name));
  for (const path of walk(join(root, 'src')).concat(pages)) {
    const file = relative(root, path).replaceAll('\\', '/');
    if (file.startsWith('src/heli/')) continue;
    const source = readFileSync(path, 'utf8');
    for (const match of source.matchAll(/heli\/heli-[a-z-]+\.(?:js|css)/g))
      if (!(hooks[file] ?? (file.startsWith('src/lab/benches/') ? labBench : null))?.(match[0])) offenders.push(`${file} -> ${match[0]}`);
  }
  assert.deepEqual(offenders, [], 'no unapproved src/heli imports'); checks++;
  // Every helicopter file except the drawing, page and sound ones is game rules.
  const drawing = new Set(['heli-scene.js', 'heli-camera.js', 'heli-ui.js', 'heli-audio.js', 'heli-radio-lines.js', 'heli-fire-view.js', 'heli-rescue-view.js']);
  const sim = readdirSync(join(root, 'src/heli')).filter(name => name.endsWith('.js') && !drawing.has(name));
  ok(sim.length >= 7, `the rules files are checked (${sim.join(', ')})`);
  for (const name of sim) {
    const source = readFileSync(join(root, 'src/heli', name), 'utf8');
    const imports = [...source.matchAll(/(?:from\s+|import\s*\(?\s*)['"`]([^'"`]+)['"`]/g)].map(m => m[1]);
    // HELI-DISPATCH: the seeded generator picks the day's jobs and the course
    // access rule says which courses the player owns (Race here). FIRE-SAVE:
    // the save prices a buyback from the course closure rules, which import
    // nothing from the helicopter. FIRE-BUCKET: the water query reads the
    // course's lake outline. EARN-SCREEN: the medal cars are air-only; medals.js
    // is pure rules and imports only config.js. DRIVE-LESSON-CORE: the lesson
    // contract shared with driving lessons is pure and imports nothing. LAB-HELI: the session reads the Lab's upgrades
    // through the one file src/lab/lab-heli.js (docs/LAB.md section 10) and nothing else of the Lab. SKI-HELI: the session runs
    // a ski run through the one pure file src/ski/ski-session.js (it imports nothing from the helicopter).
    // MAP-DESTINATIONS: the pilot's map data is a helicopter file (it does not start with heli-); the session lists a
    // course's corner names for scouting with the game's own corner detection (track-analysis.js, pure rules).
    ok(imports.every(spec => spec.startsWith('./heli-') || ['../config.js', '../rendered-ground.js', '../rng.js', '../course-access.js',
      '../course-closures.js', '../circuit-hills.js', '../medals.js', '../lessons/lesson-core.js', '../lab/lab-heli.js',
      './pilot-map-data.js', '../track-analysis.js', '../ski/ski-session.js'].includes(spec)),
      `${name} imports only helicopter rules (${imports.join(', ')})`);
    ok(!/\bdocument\b|\bwindow\b|Math\.random|Date\.now|new Date|performance\.now|localStorage|requestAnimationFrame|\bcrypto\b|import\s*\(/.test(source),
      `${name} uses no page, clock, storage or randomness`);
  }
}

console.log(`test-heli-mode: ${checks} checks passed`);
