// RESCUE-SUMMIT-TUNE (docs/board/cards/RESCUE-SUMMIT-TUNE.md): fair clocks at Summit
// Run, an autopilot that climbs the mountain, paid fuel at the truck, and a stored
// Summit call dropped when the Summit switch is off. Headless; memory storage only.
// TUNE_ONLY=names (comma separated) runs only those sections while working on one.
import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {createHeliSession} from '../src/heli/heli-session.js';
import {armMissions, beginRescue, tickRescue, rescueLimit, clockLeft, RESCUE_CLOCKS, SUMMIT_CLOCKS, dropSummitCall} from '../src/heli/heli-missions.js';
import {heliOf, missionsOf, setMissions, createMissions} from '../src/heli/heli-save.js';
import {slideSpots, pickSlide, supplyPickup, supplyYard, crateSpots} from '../src/heli/heli-search.js';
import {createAutopilot, toggleAutopilot, setAutopilotTarget, autopilotStep, FOLLOW} from '../src/heli/heli-autopilot.js';
import {createProfile, normalizeProfile} from '../src/progression.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const near = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} is not within ${tolerance} of ${expected}`);
  checks++;
};
const on = {enabled: true};
const only = process.env.TUNE_ONLY ?? '';
const want = name => only === '' || only.split(',').includes(name);

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
  const wantSpeed = Math.min(speed, distance * 0.4);
  const wx = distance > 0.01 ? dx / distance * wantSpeed : 0, wz = distance > 0.01 ? dz / distance * wantSpeed : 0;
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
function hash(text) { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const DAY = '2026-10-20';
const TRAINED = {liftoff: true, hover: true, landing: true, carry: true};
function readyProfile({count = 30, credits = 3000, name = 'Tune QA', extra = {}, heli = {}} = {}) {
  const profile = normalizeProfile({...createProfile(), credits, courses: {version: 1, unlocked: ['tremblant-woods']},
    heli: {version: 1, fuelKg: 400, lessons: TRAINED, refuels: 3, playDay: {last: DAY, count}, ...heli}});
  const armed = armMissions(createMissions(), {date: '2026-10-14', playerName: name});
  return setMissions(profile, {...armed, count: armed.need, ...extra}, on).profile;
}
function callProfile(kind, courseId, options = {}) {
  const base = readyProfile(options), armed = missionsOf(base);
  return setMissions(base, {...armed, call: {kind, id: `${kind}-${armed.draws}`, courseId, day: heliOf(base).playDay.count, answered: false}}, on).profile;
}
function newSession(profile, extra = {}) {
  return createHeliSession({profile, enabled: true, loadCourse, loadFireCourse: loadCourse, fireEnabled: true, playerName: 'Tune QA',
    today: DAY, carId: 'falcone_f42', ...extra});
}
const BOTH = {summitRunEnabled: true, rescueEnabled: true, mode: 'assisted'};

const summit = loadCourse('summit-run');
const pickup = supplyPickup(summit.course, summit.ground), yard = supplyYard(summit.course, summit.ground);
const spots = crateSpots(summit.course, summit.ground, pickup);

// ---- Flying helpers (the steady test pilot of tools/test-heli-summit-rescues.mjs) ------------------
// Up the mountain the way a pilot does: over the ground a little ahead, with room to spare.
function climbTo(session, world, goal, finalY) {
  const aim = v => {
    const d = dist(v.heli, goal), ux = d > 1 ? (goal.x - v.heli.x) / d : 0, uz = d > 1 ? (goal.z - v.heli.z) / d : 0;
    let y = -Infinity;
    for (let ahead = 0; ahead <= Math.min(d, 400); ahead += 20) y = Math.max(y, world.ground.highest(v.heli.x + ux * ahead, v.heli.z + uz * ahead, 12));
    // Climb first when the ground ahead is higher than the helicopter, then go on.
    const target = d < 100 ? finalY : y + 45;
    return pilot(v, {x: goal.x, z: goal.z, y: target}, {speed: d < 100 ? 4 : v.heli.y < target - 30 ? 4 : v.heli.y < target - 12 ? 12 : 24, sink: 6});
  };
  return run(session, 1500, aim, (v, got) => has(got, 'crash') || dist(v.heli, goal) < 10 && Math.abs(v.heli.y - finalY) < 3 && speedOf(v) < 1);
}
// Along the road: the ground beside Summit Run's road rises far faster than the flying
// ceiling climbs, so a pilot who knows the mountain follows the road up (a waypoint every
// 150 m of road), then leaves it for the spot.
function roadPoints(world, from, to) {
  const course = world.course;
  const nearest = p => {
    let best = 0, bestD = Infinity;
    for (let s = 0; s <= course.length; s += 25) { const d = dist(course.at(s), p); if (d < bestD) { bestD = d; best = s; } }
    return best;
  };
  const a = nearest(from), b = nearest(to), points = [], dir = b >= a ? 1 : -1;
  for (let s = a; dir > 0 ? s < b : s > b; s += dir * 150) { const q = course.at(s); points.push({x: q.x, z: q.z}); }
  return points;
}
function flyRoad(session, world, goal, finalY) {
  const points = roadPoints(world, session.view().heli, goal);
  let index = 0;
  return run(session, 1500, v => {
    while (index < points.length && dist(v.heli, points[index]) < 45) index++;
    const next = index < points.length ? points[index] : goal, last = index >= points.length;
    const d = dist(v.heli, next), ux = d > 1 ? (next.x - v.heli.x) / d : 0, uz = d > 1 ? (next.z - v.heli.z) / d : 0;
    let y = -Infinity;
    for (let ahead = 0; ahead <= Math.min(d + 150, 300); ahead += 10) y = Math.max(y, world.ground.highest(v.heli.x + ux * ahead, v.heli.z + uz * ahead, 12));
    const target = last && d < 100 ? finalY : y + 45;
    return pilot(v, {x: next.x, z: next.z, y: target}, {speed: last && d < 100 ? 4 : v.heli.y < target - 25 ? 0.5 : v.heli.y < target - 10 ? 8 : 24, sink: 6});
  }, (v, got) => has(got, 'crash') || index >= points.length && dist(v.heli, goal) < 10 && Math.abs(v.heli.y - finalY) < 3 && speedOf(v) < 1);
}
function landAt(session, world, spot) {
  const gy = world.ground.height(spot.x, spot.z), events = [];
  events.push(...run(session, 120, v => pilot(v, {x: spot.x, z: spot.z, y: gy + 12}, {speed: 3, sink: 3}), v => v.heli.y < gy + 14));
  events.push(...run(session, 120, v => pilot(v, {x: spot.x, z: spot.z, y: gy - 2}, {speed: 1, sink: 1.1}), v => v.heli.onGround));
  return events;
}
// The autopilot flies to the edge of the home area and the cruise leg is taken.
function cruiseToSummit(session) {
  const events = [];
  session.setDestination('summit-run');
  ok(session.pressAutopilot(), 'the autopilot flies to the edge of the area');
  events.push(...run(session, 400, () => ({}), v => v.cruiseOffered));
  ok(session.acceptCruise(), 'the cruise leg to Summit Run is taken');
  events.push(...run(session, 3, () => ({})));
  if (session.autopilotOn) session.pressAutopilot();
  return events;
}
const clockOf = session => session.view().rescue.active?.clockSeconds ?? null;

// ---- Switch off: every autopilot flight on today's courses is what it was ----------------
// Taken from the code as it stood before this card: the autopilot flying the cruise leg to
// each destination from the home pad, the zone approach after it, and an avalanche rescue's
// hover over the slide at Tremblant Snow. Same behaviour everywhere, and on these courses
// the straight line already clears the ground, so nothing moves.
function autopilotFingerprint(extra = {}) {
  const parts = [];
  const sample = (session, seconds, label, until = null) => {
    let n = 0;
    run(session, seconds, () => ({}), (v, got) => {
      if (n++ % 600 === 0) parts.push(label + JSON.stringify([v.heli.x, v.heli.y, v.heli.z, v.heli.fuelKg, v.cruiseOffered]));
      return until?.(v, got);
    });
    parts.push(label + 'end' + JSON.stringify(session.view().heli) + session.fingerprint());
  };
  for (const destination of ['tremblant-snow', 'panorama-ridge']) {
    const session = newSession(readyProfile({count: 0}), {rescueEnabled: true, ...extra});
    session.start();
    const zone = session.view().zone;
    run(session, 90, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + 45}, {speed: 1}), v => v.heli.y > zone.y + 42);
    session.setDestination(destination); session.pressAutopilot();
    sample(session, 400, 'leg ' + destination, v => v.cruiseOffered);
    if (session.acceptCruise()) { run(session, 3, () => ({})); sample(session, 200, 'zone ' + destination, () => session.autopilotOn === false); }
  }
  {
    const session = newSession(callProfile('avalanche', 'tremblant-snow', {count: 30}), {rescueEnabled: true, ...extra});
    session.start(); session.pressRadio(); session.fitRescueLine();
    session.setDestination('tremblant-snow'); session.pressAutopilot();
    sample(session, 400, 'rescue leg', v => v.cruiseOffered);
    if (session.acceptCruise()) { run(session, 3, () => ({})); if (!session.autopilotOn) session.pressAutopilot(); sample(session, 300, 'slide', (v, got) => has(got, 'autopilotArrived')); }
  }
  return hash(parts.join('\n'));
}
// Worked out from the autopilot as it stood before this card.
const AUTOPILOT_PIN = 4100670798;
if (want('pin')) {
  for (const extra of (process.env.TUNE_EXTRAS ? JSON.parse(process.env.TUNE_EXTRAS) : [{}, {summitRunEnabled: false}, {summitRunEnabled: true}]))
    same(autopilotFingerprint(extra), AUTOPILOT_PIN, `autopilot flights on today's courses are what they were (${JSON.stringify(extra)})`);
  console.log('PASS the autopilot is exact where the straight line already clears the ground');
}

// ---- The clock rows ---------------------------------------------------------------------
const answeredCall = (kind, courseId) => ({...createMissions(), call: {kind, id: kind + '-1', courseId, day: 10, answered: true}});
const ROUND = 30;
if (want('clocks')) {
  same({...RESCUE_CLOCKS}, {hiker: 900, avalanche: 720, hoist: 720, supply: 1500}, 'every other course keeps its clocks');
  same(Object.keys(SUMMIT_CLOCKS), ['avalanche', 'supply'], 'Summit Run has rows for the two kinds that can be set there');
  ok(Object.values(SUMMIT_CLOCKS).every(seconds => Number.isInteger(seconds / ROUND) && seconds > 1500), 'whole half minutes, longer than any other course');
  for (const kind of ['avalanche', 'supply']) {
    same([rescueLimit(kind, null, 'summit-run'), rescueLimit(kind, null, 'tremblant-snow'), rescueLimit(kind), rescueLimit(kind, null, undefined)],
      [SUMMIT_CLOCKS[kind], RESCUE_CLOCKS[kind], RESCUE_CLOCKS[kind], RESCUE_CLOCKS[kind]], `${kind}: Summit Run's row only at Summit Run`);
  }
  same([rescueLimit('hiker', null, 'summit-run'), rescueLimit('hoist', null, 'summit-run'), rescueLimit('fire', null, 'summit-run')], [900, 720, 0], 'a kind without a Summit row keeps its own');
  // A rescue record counts down its own course's clock.
  for (const [kind, courseId, row] of [['avalanche', 'summit-run', SUMMIT_CLOCKS.avalanche], ['avalanche', 'tremblant-snow', 720], ['supply', 'summit-run', SUMMIT_CLOCKS.supply], ['supply', 'tremblant-snow', 1500]]) {
    const begun = beginRescue(answeredCall(kind, courseId), {rescue: true}), r = begun.rescue;
    same([r.courseId, clockLeft(r)], [courseId, row], `${kind} at ${courseId}: the whole row is left at the start`);
    const quarter = tickRescue(begun, row / 4, {rescue: true});
    same([quarter.missions.rescue.clockSeconds, clockLeft(quarter.missions.rescue), quarter.expired], [row / 4, row * 0.75, false], `${kind} at ${courseId}: a quarter gone`);
    const over = tickRescue(begun, row + 100, {rescue: true});
    same([over.missions.rescue.clockSeconds, over.expired], [row, true], `${kind} at ${courseId}: the clock stops at its row`);
    if (kind === 'avalanche') {
      const early = tickRescue(begun, row * 0.66, {rescue: true}), late = tickRescue(begun, row * 0.67, {rescue: true});
      same([early.cold, late.cold, late.missions.rescue.condition], [false, true, 1], `${kind} at ${courseId}: the casualty gets cold two thirds into this row`);
    }
  }
  console.log('PASS Summit Run has its own clock rows, every other course keeps its clock');
}

// ---- The scripted pilot finishes with 35% left, from the home pad --------------------------------
// Steady-pilot times, measured here: the cruise leg from the home pad (lift-off, the autopilot to
// the edge, the leg), the whole supply run from Summit Run's start area (the proven script of
// test-heli-summit-rescues), and the avalanche flight up to the slope from the start area. The
// pair's way back down is the same road at the line's 20 m/s limit (16 flown) and the set-down,
// dig and clip are a minute and a half: both worked out from the outbound time, because the
// rescuer's line is fitted only at the home pad and a full tank cannot fly the avalanche there
// and back (see the change note), so no run of the whole thing from the pad can be flown.
const KEEP = 0.35, SAFETY = 1.55;
const rowFor = seconds => Math.ceil(seconds * SAFETY / ROUND) * ROUND;
function flySupplyFromStart() {
  const session = newSession(callProfile('supply', 'summit-run', {count: 30, credits: 3000}), BOTH);
  const log = [...session.start('summit-run')];
  ok(session.pressRadio(), 'supply: R answers at Summit Run');
  log.push(...session.takeEvents());
  const names = ['food', 'medicine', 'fuel'];
  for (let i = 0; i < 3; i++) {
    log.push(...climbTo(session, summit, pickup, pickup.y + 30));
    log.push(...landAt(session, summit, pickup));
    ok(session.view().rescue.active.sites.atTruck, `supply: at the truck for crate ${i + 1}`);
    const want = i === 2 ? 190 : 230, have = session.view().heli.fuelKg;
    if (want - have >= 1) { ok(session.buyFuel(want - have).ok, 'supply: the truck sells fuel'); log.push(...session.takeEvents()); }
    const spot = spots[i], hy = summit.ground.height(spot.x, spot.z) + 0.7 + 15.3;
    log.push(...climbTo(session, summit, spot, hy));
    log.push(...run(session, 30, v => pilot(v, {x: spot.x, z: spot.z, y: hy}, {speed: 1, sink: 0.5}), v => speedOf(v) < 0.3 && Math.abs(v.heli.y - hy) < 0.3));
    const hooked = session.pressHook();
    log.push(...session.takeEvents());
    ok(hooked?.type === 'hooked' && hooked.id === names[i], `supply: crate ${i + 1} (${names[i]}) is hooked`);
    log.push(...run(session, 2, () => ({})));
    const gy = summit.ground.height(yard.x, yard.z);
    log.push(...climbTo(session, summit, yard, gy + 45));
    const crate = () => session.view().rescue.crates.find(c => c.hooked);
    log.push(...run(session, 90, v => pilot(v, {x: yard.x - (crate().x - v.heli.x), z: yard.z - (crate().z - v.heli.z), y: v.heli.y - 3}, {speed: 1.5, sink: crate().y - gy > 8 ? 4 : 0.6}),
      () => crate().y < gy + 1.0));
    ok(session.pressHook()?.type === 'released', `supply: crate ${i + 1} set down in the hut yard`);
    log.push(...session.takeEvents());
    log.push(...run(session, 8, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.heli.y + 12}, {speed: 1, sink: 3})));
  }
  return {session, log, done: log.find(event => event.type === 'rescueDone'), failed: log.find(event => event.type === 'rescueFailed')};
}
function flyAvalancheOut() {
  const session = newSession(callProfile('avalanche', 'summit-run', {count: 30}), BOTH);
  const log = [...session.start('summit-run')];
  ok(session.pressRadio(), 'avalanche: R answers at Summit Run');
  const r = missionsOf(session.profile).rescue, pick = pickSlide(slideSpots(summit.course, summit.ground), r.seed, summit.ground);
  log.push(...flyRoad(session, summit, pick.slide, summit.ground.highest(pick.slide.x, pick.slide.z, 12) + 40));
  return {session, log, pick, crashed: has(log, 'crash'), reached: clockOf(session)};
}
function cruiseArrival() {
  const session = newSession(callProfile('avalanche', 'summit-run', {count: 30}), BOTH);
  session.start(); session.pressRadio(); session.fitRescueLine();
  cruiseToSummit(session);
  return {session, clock: clockOf(session), fuel: session.view().heli.fuelKg};
}
let measured = null;
if (want('scripted')) {
  const cruise = cruiseArrival();
  ok(cruise.session.view().courseId === 'summit-run' && cruise.clock > 300 && cruise.clock < 500, `the cruise leg from the home pad is on the clock (${cruise.clock.toFixed(0)} s)`);
  const supply = flySupplyFromStart();
  ok(supply.done && !supply.failed, 'supply: flown by script, paid, no failure');
  same([supply.done.paid, missionsOf(supply.session.profile).supplies], [1000, 1], 'supply: 1,000 credits and one supply run');
  const out = flyAvalancheOut();
  ok(!out.crashed && out.reached > 0 && dist(out.session.view().heli, out.pick.slide) < 15, `avalanche: up the road to the slope (${out.reached.toFixed(0)} s)`);
  const supplyTotal = cruise.clock + supply.done.clockSeconds;
  const avalancheTotal = cruise.clock + out.reached + out.reached * 1.5 + 90;
  measured = {cruise: cruise.clock, supply: supply.done.clockSeconds, out: out.reached, supplyTotal, avalancheTotal};
  console.log(`  scripted times: cruise ${cruise.clock.toFixed(0)} s, supply from the start area ${supply.done.clockSeconds.toFixed(0)} s, avalanche up ${out.reached.toFixed(0)} s;`
    + ` from the home pad supply ${supplyTotal.toFixed(0)} s, avalanche ${avalancheTotal.toFixed(0)} s; rows would be ${rowFor(supplyTotal)} and ${rowFor(avalancheTotal)}`);
  ok(supplyTotal <= SUMMIT_CLOCKS.supply * (1 - KEEP), `supply: from the home pad ${supplyTotal.toFixed(0)} s of ${SUMMIT_CLOCKS.supply} s leaves ${Math.round((1 - supplyTotal / SUMMIT_CLOCKS.supply) * 100)}% (at least 35%)`);
  ok(avalancheTotal <= SUMMIT_CLOCKS.avalanche * (1 - KEEP), `avalanche: from the home pad ${avalancheTotal.toFixed(0)} s of ${SUMMIT_CLOCKS.avalanche} s leaves ${Math.round((1 - avalancheTotal / SUMMIT_CLOCKS.avalanche) * 100)}% (at least 35%)`);
  ok(SUMMIT_CLOCKS.supply <= rowFor(supplyTotal) + 2 * ROUND && SUMMIT_CLOCKS.avalanche <= rowFor(avalancheTotal) + 2 * ROUND, 'and the rows are not much longer than the scripted time times 1.55');
  console.log('PASS a steady pilot finishes Summit rescues with at least 35% of the clock left');
}

// ---- The truck: fuel is always paid for there; the free first tank is the home pad's -------------
if (want('fuel')) {
  // At the pickup truck with a pilot who has never bought fuel.
  const session = newSession(callProfile('supply', 'summit-run', {count: 30, credits: 3000, heli: {refuels: 0}}), BOTH);
  session.start('summit-run'); session.pressRadio();
  climbTo(session, summit, pickup, pickup.y + 30);
  landAt(session, summit, pickup);
  const v = session.view();
  ok(v.heli.onGround && v.rescue.active.sites.atTruck && v.heli.fuelKg < 399, `fuel: on the ground at the truck with room in the tank (${v.heli.fuelKg.toFixed(0)} kg)`);
  const before = session.profile.credits, kg = Math.min(50, 400 - v.heli.fuelKg);
  const bought = session.buyFuel(kg);
  ok(bought.ok && bought.kg > 0 && bought.cost > 0, `fuel: the first tank at the truck is paid for (${bought.kg} kg for ${bought.cost} credits)`);
  same([session.profile.credits, heliOf(session.profile).refuels], [before - bought.cost, 0], 'fuel: the wallet pays, and the pad\'s free first tank is not used up');
  // Back at the home pad that free first tank is still there.
  const home = newSession(readyProfile({count: 0, credits: 100, heli: {refuels: 0, fuelKg: 200}}), BOTH);
  home.start();
  const free = home.buyFuel(100);
  same([free.ok, free.cost, free.kg, home.profile.credits, heliOf(home.profile).refuels], [true, 0, 100, 100, 1], 'fuel: the home pad\'s first tank is free, as before');
  const paid = home.buyFuel(50);
  ok(paid.ok && paid.cost > 0, 'fuel: the second tank at the pad is paid, as before');
  console.log('PASS the truck sells fuel at the pump\'s price, never a free first tank');
}

// ---- A Summit call stored while the Summit switch is off is dropped quietly ---------------------------
if (want('drop')) {
  const record = (kind, courseId) => ({kind, id: `${kind}-9`, courseId, seed: 1234, clockSeconds: 100, stage: 'fly', crates: [0, 0, 0], condition: 0});
  const stored = (kind, courseId, answered) => {
    const base = readyProfile({count: 30}), armed = missionsOf(base);
    const call = {kind, id: `${kind}-9`, courseId, day: 30, answered};
    return setMissions(base, {...armed, call, rescue: answered ? record(kind, courseId) : null}, on).profile;
  };
  // The rule alone.
  const m = missionsOf(stored('supply', 'summit-run', true));
  same(dropSummitCall(m, {rescue: true, summitRun: true}), m, 'drop: nothing to drop while the Summit switch is on');
  same(dropSummitCall(m, {rescue: false, summitRun: false}), m, 'drop: nor with rescues off (the record is hidden, as it always was)');
  const dropped = dropSummitCall(m, {rescue: true, summitRun: false});
  same([dropped.call, dropped.rescue, dropped.count, dropped.need, dropped.supplies], [null, null, m.count, m.need, m.supplies], 'drop: no call, no record, and the count is left where it was');
  const snow = missionsOf(stored('supply', 'tremblant-snow', true));
  ok(dropSummitCall(snow, {rescue: true, summitRun: false}) === snow, 'drop: a call at another course stays');
  // In a session: waiting call, answered call with its record.
  for (const answered of [false, true]) {
    for (const kind of ['supply', 'avalanche']) {
      const profile = stored(kind, 'summit-run', answered), credits = profile.credits;
      const session = newSession(profile, {rescueEnabled: true});
      const log = [...session.start()];
      const after = missionsOf(session.profile);
      same([after.call, after.rescue, after.count, after.need], [null, null, m.count, m.need], `drop (${kind}, ${answered ? 'answered' : 'waiting'}): gone at load`);
      same([session.profile.credits, heliOf(session.profile).refuels], [credits, 3], `drop (${kind}): no pay, no charge`);
      ok(!('call' in (session.view().rescue ?? {})) || !session.view().rescue.call, `drop (${kind}): the radio box is empty`);
      ok(!log.some(event => /^(rescue|crate)/.test(event.type)), `drop (${kind}): and no rescue event`);
      session.leave();
      same(session.profile.credits, credits, `drop (${kind}): leaving costs nothing`);
      // With both switches on the same call is still there.
      const kept = newSession(profile, BOTH);
      const keptLog = kept.start();
      if (answered) ok(has(keptLog, 'rescueFailed') && kept.profile.credits < credits, `drop (${kind}): both switches on, a rescue left in hand is failed and charged as always`);
      else same(missionsOf(kept.profile).call?.courseId, 'summit-run', `drop (${kind}): both switches on, the waiting call stays`);
    }
  }
  // Rescues off: the stored record is hidden and left untouched.
  const hidden = stored('avalanche', 'summit-run', true);
  const off = newSession(hidden, {rescueEnabled: false});
  off.start();
  same(missionsOf(off.profile).rescue, missionsOf(hidden).rescue, 'drop: with rescues off the record is hidden and untouched');
  console.log('PASS a stored Summit call is dropped quietly when Summit Run is off');
}

// ---- The autopilot climbs the mountain ------------------------------------------------------------------
if (want('autopilot')) {
  // A ridge between the helicopter and a low goal: the ground rises 1.25 m a metre from x 300 to 700
  // (500 m) and falls away after. The straight line passes inside 60 m of it; the old ten-second look
  // ahead (250 m at 25 m/s) cannot see it.
  const ridge = x => x < 300 ? 0 : x < 700 ? (x - 300) * 1.25 : Math.max(0, 500 - (x - 700) * 0.7);
  const ground = {height: x => ridge(x), highest: x => ridge(x)};
  const flat = {height: () => 0, highest: () => 0};
  const state = (y = 60) => ({t: 0, x: 0, y, z: 0, vx: 25, vy: 0, vz: 0, heading: Math.PI / 2, pitch: 0, roll: 0, yawRate: 0, fuelKg: 200,
    altitudeOffset: 0, onGround: false, groundY: 0, crashed: false});
  const climbOf = (world, {y = 60, ceiling = null, offset = 0, steps = 1} = {}) => {
    const s = {...state(y), altitudeOffset: offset}, ap = createAutopilot();
    toggleAutopilot(ap, s);
    setAutopilotTarget(ap, {x: 1400, z: 0, groundY: 0});
    let out;
    for (let i = 0; i < steps; i++) out = autopilotStep(ap, s, {}, {ground: world, ceiling});
    return out.commands.climb;
  };
  const clear = climbOf(flat);
  ok(clear < 0, `autopilot: over open ground it sinks toward the goal as always (${clear.toFixed(2)})`);
  const over = climbOf(ground);
  ok(over === 4, `autopilot: a ridge on the straight line is climbed at the full rate before it arrives (${over})`);
  // Held under the ceiling: the top is the ceiling less 5 m.
  const capped = climbOf(ground, {y: 90, ceiling: () => 100});
  near(capped, 0.5 * (95 - 90), 1e-9, 'autopilot: the climb stops 5 m under the flying ceiling');
  // In air too thin to hold a hover no extra climb is asked for.
  const thin = climbOf(ground, {offset: 9000});
  ok(thin < 0, `autopilot: where the thin air cannot hold it, it does not ask for the ridge's height (${thin.toFixed(2)})`);
  // A ridge off the straight line, a goal on it: nothing asked.
  const beside = {height: (x, z) => z > 200 ? 800 : 0, highest: (x, z) => z > 200 ? 800 : 0};
  same(climbOf(beside), clear, 'autopilot: ground well off the line changes nothing');
  ok(FOLLOW.near === 60 && FOLLOW.over === 80 && FOLLOW.reach === 600, 'autopilot: 60 m near, 80 m over, 600 m ahead');

  // On the mountain: from the cruise leg's arrival the autopilot flies the avalanche slope alone.
  const session = newSession(callProfile('avalanche', 'summit-run', {count: 30}), BOTH);
  const log = [...session.start('summit-run')];
  ok(session.pressRadio(), 'autopilot: the avalanche is answered at Summit Run');
  const r = missionsOf(session.profile).rescue, pick = pickSlide(slideSpots(summit.course, summit.ground), r.seed, summit.ground);
  log.push(...run(session, 90, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.heli.y + 60}, {speed: 1, sink: 3}), v => v.heli.y > summit.ground.height(v.heli.x, v.heli.z) + 45));
  ok(session.pressAutopilot(), 'autopilot: P takes the way to the slide');
  log.push(...run(session, 1500, () => ({}), (v, got) => has(got, 'autopilotArrived') || has(got, 'crash')));
  const v = session.view();
  ok(!has(log, 'crash') && has(log, 'autopilotArrived'), 'autopilot: flown up the mountain to the slide without a crash');
  ok(dist(v.heli, pick.slide) < 12, `autopilot: hovering over the debris area (${Math.round(dist(v.heli, pick.slide))} m)`);
  near(v.heli.y - summit.ground.highest(pick.slide.x, pick.slide.z, 12), 40, 4, 'autopilot: 40 m above the obstacles');
  ok(v.heli.y <= summit.ground.height(v.heli.x, v.heli.z) + 300 + 1e-9, 'autopilot: and under the flying ceiling');
  console.log('PASS the autopilot climbs the mountain');
}

console.log(`test-heli-summit-tune: ${checks} checks passed`);
