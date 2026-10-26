// SUMMIT-HELI-RESCUES (docs/HELI_RESCUE.md sections 5.4 and 5.5, docs/board/cards/
// SUMMIT-HELI-RESCUES.md): the rescues at Summit Run. Headless; memory storage only.
import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {createHeliSession, courseSite, insideArea, ceilingAt, HELI_SESSION} from '../src/heli/heli-session.js';
import {armMissions, finishRescue} from '../src/heli/heli-missions.js';
import {heliOf, missionsOf, setMissions, createMissions} from '../src/heli/heli-save.js';
import {hoistSpots, pickHoist, supplyPickup, supplyYard, crateSpots, slideSpots, pickSlide} from '../src/heli/heli-search.js';
import {recoveryJobOf, recoveryJob, wreckFor} from '../src/heli/heli-jobs.js';
import {dispatchBoardMarkup} from '../src/heli/heli-board.js';
import {createProfile, normalizeProfile} from '../src/progression.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const on = {enabled: true};

const worlds = new Map();
function loadCourse(id) {
  if (!worlds.has(id)) {
    const course = new Course(ALL_CIRCUITS.find(def => def.id === id), 1989);
    worlds.set(id, {course, ground: groundFromCourse(course)});
  }
  return worlds.get(id);
}

function pilot(view, target, {speed = 12, sink = 4} = {}) {
  const h = view.heli;
  const fwdX = Math.sin(h.heading), fwdZ = Math.cos(h.heading), rightX = -fwdZ, rightZ = fwdX;
  const dx = target.x - h.x, dz = target.z - h.z, distance = Math.hypot(dx, dz);
  const want = Math.min(speed, distance * 0.4);
  const wx = distance > 0.01 ? dx / distance * want : 0, wz = distance > 0.01 ? dz / distance * want : 0;
  const ex = wx - h.vx, ez = wz - h.vz;
  const clamp = v => Math.max(-1, Math.min(1, v));
  return {pitch: clamp((ex * fwdX + ez * fwdZ) * 0.25), roll: clamp((ex * rightX + ez * rightZ) * 0.25),
    lift: clamp(Math.max(-sink, Math.min(sink, target.y - h.y)) * 0.3 - h.vy * 0.3), yaw: 0};
}
function run(session, seconds, controls, until = null) {
  const events = [];
  for (let i = 0; i < Math.round(seconds * 120); i++) {
    events.push(...session.step(controls(session.view())));
    if (until?.(session.view(), events)) break;
  }
  return events;
}
const has = (events, type) => events.some(event => event.type === type);
const speedOf = view => Math.hypot(view.heli.vx, view.heli.vz);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const near = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} is not within ${tolerance} of ${expected}`);
  checks++;
};

const DAY = '2026-10-20';
const TRAINED = {liftoff: true, hover: true, landing: true, carry: true};
function readyProfile({count = 30, credits = 2000, name = 'Summit QA', extra = {}, heli = {}} = {}) {
  const profile = normalizeProfile({...createProfile(), credits, courses: {version: 1, unlocked: ['tremblant-woods']},
    heli: {version: 1, fuelKg: 400, lessons: TRAINED, refuels: 3, playDay: {last: DAY, count}, ...heli}});
  const armed = armMissions(createMissions(), {date: '2026-10-14', playerName: name});
  return setMissions(profile, {...armed, count: armed.need, ...extra}, on).profile;
}
// ... with a rescue call waiting (play day 30 is winter: nothing else rings).
function callProfile(kind, courseId, options = {}) {
  const base = readyProfile(options), armed = missionsOf(base);
  return setMissions(base, {...armed, call: {kind, id: `${kind}-${armed.draws}`, courseId, day: heliOf(base).playDay.count, answered: false}}, on).profile;
}
function newSession(profile, extra = {}) {
  return createHeliSession({profile, enabled: true, loadCourse, loadFireCourse: loadCourse, fireEnabled: true, playerName: 'Summit QA',
    today: DAY, carId: 'falcone_f42', ...extra});
}
function hash(text) { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// ---- Switch off: every helicopter result is what it was, byte for byte ----------
// Taken from the code as it stood before this card. Rescue on and Summit Run off
// (not passed, false, a non-true value): each kind of rescue answered and flown a
// few seconds, and every course's flying area; Summit Run on and rescue off: Summit
// Run's own flying area and a climb to its ceiling. The hoist site's car id is the
// one new field of this card (it belongs to the hoist rescue, with either switch), so
// it is left out of the hash.
const plain = (key, value) => key === 'car' && value && typeof value === 'object' && 'carId' in value ? (({carId, ...rest}) => rest)(value) : value;
function offFingerprint(extra) {
  const parts = [];
  for (const [kind, courseId] of [['hiker', 'tremblant-woods'], ['avalanche', 'tremblant-snow'], ['hoist', 'panorama-ridge'], ['supply', 'tremblant-snow']]) {
    const session = newSession(callProfile(kind, courseId), {rescueEnabled: true, ...extra});
    const events = [...session.start()];
    const zone = session.view().zone;
    session.pressRadio();
    events.push(...session.takeEvents());
    events.push(...run(session, 8, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + 45})));
    parts.push(kind + JSON.stringify(events), JSON.stringify(missionsOf(session.profile)), JSON.stringify(session.view(), plain), session.fingerprint());
    session.leave();
  }
  for (const id of ['tremblant-woods', 'tremblant-snow', 'panorama-ridge']) {
    const {course, ground} = loadCourse(id);
    parts.push(id + JSON.stringify(courseSite(course, ground, id, {summitRun: extra.summitRunEnabled === true})));
  }
  {
    const session = newSession(readyProfile(), {rescueEnabled: true, ...extra});
    session.start();
    const area = session.view().area;
    const events = run(session, 120, () => ({lift: 1}), v => v.heli.y >= area.ceiling - 0.01);
    events.push(...run(session, 2, () => ({lift: 1})));
    parts.push(JSON.stringify(area), JSON.stringify(session.view().heli), session.fingerprint());
  }
  return hash(parts.join('\n'));
}
function summitOnFingerprint() {
  const parts = [];
  const {course, ground} = loadCourse('summit-run');
  parts.push(JSON.stringify(courseSite(course, ground, 'summit-run', {summitRun: true})));
  const session = newSession(readyProfile(), {summitRunEnabled: true, rescueEnabled: false});
  session.start('summit-run');
  const area = session.view().area;
  const events = run(session, 120, () => ({lift: 1}), v => v.heli.y >= area.ceiling - 0.01);
  events.push(...run(session, 2, () => ({lift: 1})));
  parts.push(JSON.stringify(area), JSON.stringify(session.view().heli), session.fingerprint(), JSON.stringify(events.length));
  return hash(parts.join('\n'));
}
// Taken from the code as it stood before this card (rescue on, Summit Run off; then Summit Run on, rescue off).
const OFF_PIN = 1293191622, SUMMIT_ONLY_PIN = 1829644530;
for (const extra of [{}, {summitRunEnabled: false}, {summitRunEnabled: 'yes'}])
  assert.equal(offFingerprint(extra), OFF_PIN, `with Summit Run off every rescue and flying area is as it was (${JSON.stringify(extra)})`), checks++;
assert.equal(summitOnFingerprint(), SUMMIT_ONLY_PIN, 'with Summit Run on and rescues off, Summit Run flies exactly as it did'); checks++;
console.log('PASS either switch off keeps every helicopter result exact');

// ---- The flying ceiling at Summit Run ---------------------------------------------------
const summit = loadCourse('summit-run');
const start = summit.course.at(0);
const pickup = supplyPickup(summit.course, summit.ground), yard = supplyYard(summit.course, summit.ground);
const spots = crateSpots(summit.course, summit.ground, pickup);
{
  const both = courseSite(summit.course, summit.ground, 'summit-run', {summitRun: true, summitRescue: true});
  const only = courseSite(summit.course, summit.ground, 'summit-run', {summitRun: true});
  same(both.area, {...only.area, aboveGround: HELI_SESSION.ceilingAbove}, 'the area is the old one plus the 300 m over the ground rule');
  ok(!('aboveGround' in only.area), 'with the rescue switch off the area has no such rule');
  near(both.area.ceiling, start.y + 300, 1e-9, 'the flat ceiling is still 300 m above the start');
  for (const id of ['tremblant-woods', 'tremblant-snow', 'panorama-ridge']) {
    const world = loadCourse(id);
    same(courseSite(world.course, world.ground, id, {summitRun: true, summitRescue: true}), courseSite(world.course, world.ground, id, {summitRun: true}),
      `${id}: no other course changes`);
    same(courseSite(world.course, world.ground, id, {summitRescue: true}), courseSite(world.course, world.ground, id), `${id}: nor without Summit Run`);
  }
  // The pickup (about 570 m up) and the hut yard are out of reach under the old ceiling and inside the new one.
  near(pickup.y - start.y, 570, 5, 'the pickup is about 570 m above the start');
  for (const [name, place] of [['pickup', pickup], ['hut yard', yard], ...spots.map((spot, i) => [`crate spot ${i + 1}`, spot])]) {
    const gy = summit.ground.height(place.x, place.z);
    ok(!insideArea(only.area, place.x, gy + 20, place.z), `${name}: out of reach under the old ceiling`);
    ok(insideArea(both.area, place.x, gy + 20, place.z, summit.ground) && insideArea(both.area, place.x, gy + 299, place.z, summit.ground), `${name}: reachable now`);
    ok(!insideArea(both.area, place.x, gy + 301, place.z, summit.ground), `${name}: 300 m above the ground is the top`);
    near(ceilingAt(both.area, place.x, place.z, summit.ground), gy + 300, 1e-9, `${name}: the ceiling there`);
  }
  // Never lower than before, and the flat ceiling holds when no ground is given.
  near(ceilingAt(both.area, start.x, start.z, summit.ground), Math.max(both.area.ceiling, summit.ground.height(start.x, start.z) + 300), 1e-9, 'over the start the top is the higher of the two');
  ok(ceilingAt(both.area, 0, 0, null) === both.area.ceiling, 'with no ground given the flat ceiling holds');
  // Every avalanche slide on the course can be flown to.
  const slides = slideSpots(summit.course, summit.ground);
  ok(slides.length === 12 && slides.every(slide => !insideArea(only.area, slide.x, summit.ground.height(slide.x, slide.z) + 40, slide.z)
    && insideArea(both.area, slide.x, summit.ground.height(slide.x, slide.z) + 40, slide.z, summit.ground)), 'all 12 slides are reachable at 40 m now, none before');
}
console.log('PASS the ceiling follows the ground at Summit Run, and nothing else moves');

// ---- The ceiling in flight: held with rescues off, free with them on ------------------------
// Up the mountain the way a pilot does: over the ground a little ahead, with room to spare.
function climbTo(session, world, goal, finalY, watch = () => {}) {
  const events = [];
  const aim = v => {
    watch(v);
    const d = dist(v.heli, goal), ux = d > 1 ? (goal.x - v.heli.x) / d : 0, uz = d > 1 ? (goal.z - v.heli.z) / d : 0;
    let y = -Infinity;
    for (let ahead = 0; ahead <= Math.min(d, 400); ahead += 20) y = Math.max(y, world.ground.highest(v.heli.x + ux * ahead, v.heli.z + uz * ahead, 12));
    // Climb first when the ground ahead is higher than the helicopter, then go on.
    const want = d < 100 ? finalY : y + 45;
    return pilot(v, {x: goal.x, z: goal.z, y: want}, {speed: d < 100 ? 4 : v.heli.y < want - 30 ? 4 : v.heli.y < want - 12 ? 12 : 24, sink: 6});
  };
  events.push(...run(session, 1200, aim, v => dist(v.heli, goal) < 10 && Math.abs(v.heli.y - finalY) < 3 && speedOf(v) < 1));
  return events;
}
function flyToPickup(extra) {
  const session = newSession(readyProfile({count: 0}), extra);
  session.start('summit-run');
  const top = session.view().area, events = [];
  let highest = -Infinity;
  events.push(...climbTo(session, summit, {x: pickup.x, z: pickup.z}, pickup.y + 40, v => { highest = Math.max(highest, v.heli.y); }));
  return {session, top, highest, events};
}
{
  const held = flyToPickup({summitRunEnabled: true, rescueEnabled: false});
  ok(held.highest <= held.top.ceiling + 1 && dist(held.session.view().heli, pickup) > 500, 'rescues off: held under the old ceiling, far from the pickup');
  const free = flyToPickup({summitRunEnabled: true, rescueEnabled: true});
  const v = free.session.view();
  ok(dist(v.heli, pickup) < 20 && v.heli.y > pickup.y + 20, `rescues on: reaches the pickup (${Math.round(dist(v.heli, pickup))} m away, ${Math.round(v.heli.y - pickup.y)} m over it)`);
  ok(v.heli.y <= summit.ground.height(v.heli.x, v.heli.z) + 300 + 1e-9, 'and stays under 300 m above the ground');
  ok(!has(free.events, 'crashed') && v.heli.y + v.heli.altitudeOffset > 3400, `in thin air (${Math.round(v.heli.y + v.heli.altitudeOffset)} m)`);
  // Climb as high as the rule lets it: held 300 m above the ground there.
  run(free.session, 120, () => ({lift: 1}), view => view.heli.y >= summit.ground.height(view.heli.x, view.heli.z) + 299);
  const w = free.session.view();
  ok(w.heli.y <= summit.ground.height(w.heli.x, w.heli.z) + 300 + 1e-9, 'it never goes above 300 m over the ground below');
}
console.log('PASS the flying ceiling lets the pilot reach the pickup');

// ---- Only with both switches on do rescues appear at Summit Run ------------------------------
{
  const seen = {both: new Set(), rescueOnly: new Set(), summitOnly: new Set()};
  const names = ['Ann', 'Bo', 'Cy', 'Di', 'Ed', 'Flo', 'Gus', 'Hal', 'Ira', 'Jo', 'Kit', 'Lu', 'Max', 'Ned', 'Ola', 'Pat'];
  for (const [label, extra] of [['both', {summitRunEnabled: true, rescueEnabled: true}], ['rescueOnly', {rescueEnabled: true}],
    ['summitOnly', {summitRunEnabled: true, rescueEnabled: false}]]) {
    for (const name of names) {
      // Play day 30 is winter: a call is a rescue, never a fire.
      const session = newSession(readyProfile({count: 30, name}), extra);
      session.start();
      const zone = session.view().zone;
      const log = run(session, 120, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + 45}), (v, got) => has(got, 'rescueCall'));
      const call = log.find(event => event.type === 'rescueCall');
      if (call) seen[label].add(`${call.kind}@${call.courseId}`);
    }
  }
  const both = [...seen.both];
  ok(both.includes('supply@summit-run') && both.includes('avalanche@summit-run'), `both on: supply and avalanche calls come for Summit Run (${both.join(', ')})`);
  ok(!both.includes('supply@tremblant-snow'), 'both on: the supply run is Summit Run\'s, no longer Tremblant Snow\'s');
  ok(seen.rescueOnly.size > 0 && ![...seen.rescueOnly].some(item => item.endsWith('summit-run')), `Summit Run off: nothing at Summit Run (${[...seen.rescueOnly].join(', ')})`);
  same([...seen.summitOnly], [], 'rescues off: no rescue call at all');
}
console.log('PASS Summit rescues need both switches');


// ---- The supply run at Summit Run: the pickup, the truck, the hut yard ---------------------------
const lines = events => events.filter(event => event.type === 'radio').map(event => event.line);
const CRATE_NAMES = ['food', 'medicine', 'fuel'];
// Down onto the ground at a spot, gently.
function landAt(session, world, spot) {
  const gy = world.ground.height(spot.x, spot.z), events = [];
  events.push(...run(session, 120, v => pilot(v, {x: spot.x, z: spot.z, y: gy + 12}, {speed: 3, sink: 3}), v => v.heli.y < gy + 14));
  events.push(...run(session, 120, v => pilot(v, {x: spot.x, z: spot.z, y: gy - 2}, {speed: 1, sink: 1.1}), v => v.heli.onGround));
  return events;
}
function flySupply() {
  const profile = callProfile('supply', 'summit-run', {count: 30, credits: 3000});
  const session = newSession(profile, {summitRunEnabled: true, rescueEnabled: true, mode: 'assisted'});
  const log = [...session.start('summit-run')];
  ok(session.pressRadio(), 'supply: R answers the call for Summit Run');
  log.push(...session.takeEvents());
  const begin = session.view();
  same(begin.rescue.crates.map(crate => crate.id), CRATE_NAMES, 'supply: three crates wait');
  same(begin.rescue.crates.map(crate => [Math.round(crate.x), Math.round(crate.z)]), spots.map(spot => [Math.round(spot.x), Math.round(spot.z)]),
    'supply: at the pickup\'s crate spots, not at the home pad');
  same(begin.loads.map(load => load.id), [], 'supply: never drawn as cars');
  ok(begin.rescue.active.courseId === 'summit-run' && begin.rescue.active.here && begin.rescue.active.sites.yard && begin.rescue.active.sites.pickup, 'supply: the panel names the pickup and the yard');
  same([begin.rescue.active.sites.pickup.x, begin.rescue.active.sites.pickup.z, begin.rescue.active.sites.atTruck], [pickup.x, pickup.z, true], 'supply: and the start area has its own truck (RESCUE-SUMMIT-TUNE), standing in the landing circle');
  near(begin.rescue.active.target.distance, dist(begin.heli, pickup), 1, 'supply: the first target is the pickup');
  same(session.buyFuel(50).reason, 'The tank is full.', 'supply: the start area truck is here, and the tank is full (RESCUE-SUMMIT-TUNE)');
  // To the pickup (over the shoulder of the mountain), landing in its circle.
  log.push(...climbTo(session, summit, {x: pickup.x, z: pickup.z}, pickup.y + 30));
  ok(session.buyFuel(50).ok === false && session.view().rescue.active.sites.atTruck === false, 'supply: in the air the truck sells nothing');
  log.push(...landAt(session, summit, pickup));
  ok(session.view().heli.onGround && dist(session.view().heli, pickup) < pickup.radius && session.view().rescue.active.sites.atTruck, 'supply: landed in the pickup circle, beside the truck');
  const toFuel = kg => {
    const have = session.view().heli.fuelKg, want = Math.max(0, kg - have);
    if (want < 1) return;
    const credits = session.profile.credits, bought = session.buyFuel(want);
    log.push(...session.takeEvents());
    ok(bought.ok && bought.kg > 0 && session.profile.credits < credits, `supply: the truck sells ${bought.kg} kg at the pump's price`);
  };
  const hookCrate = i => {
    const spot = spots[i], hy = summit.ground.height(spot.x, spot.z) + 0.7 + 15.3;
    log.push(...climbTo(session, summit, spot, hy));
    log.push(...run(session, 30, v => pilot(v, {x: spot.x, z: spot.z, y: hy}, {speed: 1, sink: 0.5}), v => speedOf(v) < 0.3 && Math.abs(v.heli.y - hy) < 0.3));
    const hooked = session.pressHook();
    log.push(...session.takeEvents());
    ok(hooked?.type === 'hooked' && hooked.id === CRATE_NAMES[i], `supply: crate ${i + 1} (${CRATE_NAMES[i]}) is hooked`);
    log.push(...run(session, 2, () => ({})));
    ok(session.view().rescue.active.crates[i] === 1 && session.view().rescue.active.stage === 'carry', `supply: crate ${i + 1} is on the line`);
  };
  const deliver = i => {
    const gy = summit.ground.height(yard.x, yard.z);
    log.push(...climbTo(session, summit, yard, gy + 45));
    const crate = () => session.view().rescue.crates.find(c => c.hooked);
    log.push(...run(session, 90, v => pilot(v, {x: yard.x - (crate().x - v.heli.x), z: yard.z - (crate().z - v.heli.z), y: v.heli.y - 3}, {speed: 1.5, sink: crate().y - gy > 8 ? 4 : 0.6}),
      () => crate().y < gy + 1.0));
    const released = session.pressHook();
    log.push(...session.takeEvents());
    ok(released?.type === 'released' && released.dropMetres === 0, `supply: crate ${i + 1} is set down gently in the hut yard`);
    log.push(...run(session, 8, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.heli.y + 12}, {speed: 1, sink: 3})));
  };
  for (let i = 0; i < 3; i++) {
    if (i > 0) {
      // Back down to the truck: only as much fuel as can be lifted (the drums need the least).
      log.push(...climbTo(session, summit, pickup, pickup.y + 30));
      log.push(...landAt(session, summit, pickup));
      ok(session.view().rescue.active.sites.atTruck, `supply: back at the truck for crate ${i + 1}`);
    }
    toFuel(i === 2 ? 190 : 230);
    ok(session.view().rescue.active.clockSeconds < 1500, `supply: ${Math.round(session.view().heli.fuelKg)} kg in the tank for the ${CRATE_NAMES[i]}, clock ${Math.round(session.view().rescue.active.clockSeconds)} s`);
    hookCrate(i);
    deliver(i);
  }
  return {session, log};
}
{
  const {session, log} = flySupply();
  const downs = log.filter(event => event.type === 'crateDown');
  same(downs.map(event => [event.id, event.pay]), [['food', 300], ['medicine', 300], ['fuel', 300]], 'supply: each crate set down in the yard pays 300');
  const done = log.find(event => event.type === 'rescueDone');
  ok(done, 'supply: the last crate finishes the run');
  same([done.kind, done.paid, done.look, done.firstBadge], ['supply', 1000, null, false], 'supply: 1,000 credits in all, no person and no badge');
  ok(lines(log).filter(line => line === 'heli.radio.supply.crate').length === 2 && lines(log).includes('heli.radio.supply.done'), 'supply: Roger thanks them for the first two, then for everything');
  const m = missionsOf(session.profile);
  same([m.supplies, m.rescued, m.rescue, m.call, m.last], [1, undefined, null, null, 'supply'], 'supply: the save counts one supply run and no person');
  ok(!has(log, 'rescueFailed') && !has(log, 'crashed'), 'supply: no failure, no crash');
  ok(session.view().rescue.crates.length === 0, 'supply: the crates are gone from the view');
  session.leave();
}
console.log('PASS the supply run is flown at Summit Run: pickup, truck, three crates to the hut yard');

// ---- Arriving from the home pad: the call, the cruise leg, the crates laid at the pickup -------------
{
  const session = newSession(callProfile('supply', 'summit-run', {count: 30}), {summitRunEnabled: true, rescueEnabled: true});
  const log = [...session.start()];
  ok(session.pressRadio(), 'cruise: R answers at the home pad');
  same(session.view().rescue.crates, [], 'cruise: no crates at the home pad (Summit Run has its own)');
  const zone = session.view().zone;
  log.push(...run(session, 90, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + 45}, {speed: 1}), v => v.heli.y > zone.y + 42));
  ok(session.setDestination('summit-run') && session.pressAutopilot(), 'cruise: the autopilot takes the way to Summit Run');
  log.push(...run(session, 400, () => ({}), v => v.cruiseOffered));
  ok(session.acceptCruise(), 'cruise: the cruise leg');
  log.push(...run(session, 3, () => ({})));
  const v = session.view();
  ok(v.courseId === 'summit-run' && v.rescue.active.here, 'cruise: arrived at Summit Run, the rescue is here');
  same(v.rescue.crates.map(crate => [Math.round(crate.x), Math.round(crate.z)]), spots.map(spot => [Math.round(spot.x), Math.round(spot.z)]), 'cruise: the crates wait at the pickup\'s spots');
  ok(v.rescue.active.clockSeconds > 100, `cruise: the leg's flying time is on the clock (${Math.round(v.rescue.active.clockSeconds)} s)`);
  ok(session.view().rescue.active.sites.truck && session.view().rescue.active.sites.truck.x !== undefined, 'cruise: the truck stands at the pickup');
  session.leave();
}
console.log('PASS the crates are laid at the pickup when the helicopter arrives');

// ---- An avalanche at Summit Run: the debris area is reachable, high on the mountain ----------------
{
  const session = newSession(callProfile('avalanche', 'summit-run', {count: 30}), {summitRunEnabled: true, rescueEnabled: true});
  const log = [...session.start('summit-run')];
  ok(session.pressRadio(), 'avalanche: answered at Summit Run');
  const r = missionsOf(session.profile).rescue, picked = pickSlide(slideSpots(summit.course, summit.ground), r.seed, summit.ground);
  near(dist(session.view().rescue.active.sites?.slide ?? session.view().rescue.active.target, picked.slide), 0, 1, 'avalanche: the panel points at the seeded slide');
  // The autopilot flies a straight line and would meet the mountain on the way; the climb up is the pilot's.
  log.push(...climbTo(session, summit, picked.slide, summit.ground.highest(picked.slide.x, picked.slide.z, 12) + 40));
  const v = session.view();
  ok(!has(log, 'crashed'), 'avalanche: flown up to the slide, no crash');
  near(dist(v.heli, picked.slide), 0, 10, 'avalanche: in a hover over the debris area, high on the mountain');
  near(v.heli.y - summit.ground.highest(picked.slide.x, picked.slide.z, 12), 40, 3, 'avalanche: 40 m above the obstacles, the rescuer hanging below');
  ok(v.heli.y > start.y + 300 && v.heli.y <= summit.ground.height(v.heli.x, v.heli.z) + 300, `avalanche: ${Math.round(v.heli.y - start.y)} m above the start, past the old ceiling`);
  same(v.rescue.active.courseId, 'summit-run', 'avalanche: the rescue is at Summit Run');
  session.leave();
}
console.log('PASS an avalanche rescue at Summit Run is reachable');

// ---- The hoist site names its car: the one the recovery job later offers ------------------------------
const ridge = loadCourse('panorama-ridge');
for (const extra of [{rescueEnabled: true}, {rescueEnabled: true, summitRunEnabled: true}]) {
  const session = newSession(callProfile('hoist', 'panorama-ridge', {count: 30}), extra);
  session.start('panorama-ridge');
  ok(session.pressRadio(), 'hoist: answered at the ridge');
  const r = missionsOf(session.profile).rescue, car = session.view().rescue.active.sites.car;
  const id = wreckFor({seed: r.seed, courseId: 'panorama-ridge', x: 0, z: 0, day: 0}).carId;
  same(car.carId, id, `hoist: the site's car is the seeded pick (${id})`);
  const done = finishRescue(session.profile, {pay: 0, site: {x: car.x, z: car.z}, enabled: true});
  ok(done.ok, 'hoist: the rescue can be finished');
  const wreck = missionsOf(done.profile).wreck;
  same([wreck.carId, recoveryJob(wreck, wreck.day + 1).carId], [id, id], 'hoist: the wreck and the recovery job later offer the same car');
  const again = newSession(callProfile('hoist', 'panorama-ridge', {count: 30}), extra);
  again.start('panorama-ridge'); again.pressRadio();
  same(again.view().rescue.active.sites.car, car, 'hoist: the same save, the same site and car');
}
console.log('PASS the hoist site names the car the recovery job offers');

// ---- A rescue in hand: the autopilot never leaves it for the recovery job's car -----------------------------
{
  const pick = pickHoist(hoistSpots(ridge.course, ridge.ground), 0x2468ace, ridge.ground);
  const base = callProfile('hoist', 'panorama-ridge', {count: 7});
  const wreck = {courseId: 'panorama-ridge', carId: 'falcone_f42', x: Math.round(pick.car.x * 10) / 10, z: Math.round(pick.car.z * 10) / 10, day: 6};
  const profile = setMissions(base, {...missionsOf(base), wreck}, on).profile;
  const job = recoveryJobOf(profile, {enabled: true});
  const session = newSession(profile, {rescueEnabled: true});
  const log = [...session.start()];
  ok(job && session.pressRadio() && session.fitRescueLine().ok && session.takeJob(job.id).ok, 'guard: the hoist call answered, the line fitted, the recovery job taken at the pad');
  const zone = session.view().zone;
  log.push(...run(session, 90, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + 45}, {speed: 1}), v => v.heli.y > zone.y + 42));
  ok(session.pressAutopilot(), 'guard: P in the air');
  log.push(...run(session, 400, () => ({}), v => v.cruiseOffered));
  ok(session.acceptCruise(), 'guard: the cruise leg');
  log.push(...run(session, 3, () => ({})));
  const r = missionsOf(session.profile).rescue, driver = pickHoist(hoistSpots(ridge.course, ridge.ground), r.seed, ridge.ground).driver;
  ok(session.courseId === 'panorama-ridge' && session.view().loads.some(load => load.job === job.id), 'guard: across, and the car waits on the slope');
  log.push(...run(session, 400, () => ({}), (v, got) => has(got, 'autopilotArrived')));
  ok(has(log, 'autopilotArrived') && dist(session.view().heli, driver) < 6, 'guard: the autopilot brings the helicopter over the driver (the rescue first)');
  session.pressAutopilot();
  log.push(...climbTo(session, ridge, driver, ridge.ground.height(driver.x, driver.z) + 40));
  const spot = driver;
  const onSpot = (v, y, sink) => { const l = v.rescue.line; return pilot(v, {x: spot.x - (l.x - v.heli.x), z: spot.z - (l.z - v.heli.z), y}, {speed: 3, sink}); };
  const height = v => v.rescue.line.y - ridge.ground.height(v.rescue.line.x, v.rescue.line.z);
  log.push(...run(session, 20, v => pilot(v, {x: spot.x, z: spot.z, y: v.heli.y}, {speed: 1}), v => speedOf(v) < 0.3));
  log.push(...run(session, 120, v => onSpot(v, v.heli.y - 3, height(v) > 5 ? 3 : 0.7), (v, got) => has(got, 'holdStarted')));
  ok(session.view().rescue.active.stage === 'hold', 'guard: the rescuer is down beside the driver');
  const before = session.view().heli;
  ok(session.pressAutopilot() && session.view().rescue.goal === null, 'guard: in the hold the autopilot has no goal (not the recovery car)');
  run(session, 4, () => ({}));
  const after = session.view().heli;
  const goalLater = session.view().rescue.goal;
  ok(dist(before, after) < 6 && session.autopilotOn && (!goalLater || dist(goalLater, wreck) > 20), 'guard: it stays at the driver, never off to the recovery car');
  session.leave();
}
console.log('PASS the recovery job does not pull the autopilot away from a rescue');
console.log(`test-heli-summit-rescues: ${checks} checks passed`);
