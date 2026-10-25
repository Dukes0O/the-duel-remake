// RESCUE-SUMMIT-ARRIVAL (docs/board/cards/RESCUE-SUMMIT-ARRIVAL.md): the cruise leg to
// Summit Run ends over the start area's landing circle (with both switches on), so an
// autopilot started at arrival clears the cliff the old arrival point sat behind. Every
// other arrival is what it was. Headless; memory storage only.
import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {createHeliSession, courseSite, ceilingAt, HELI_SESSION} from '../src/heli/heli-session.js';
import {armMissions} from '../src/heli/heli-missions.js';
import {heliOf, missionsOf, setMissions, createMissions} from '../src/heli/heli-save.js';
import {slideSpots, pickSlide, supplyPickup} from '../src/heli/heli-search.js';
import {createAutopilot, toggleAutopilot, setAutopilotTarget, autopilotStep} from '../src/heli/heli-autopilot.js';
import {createHeliState, stepHeli, HELI_STEP} from '../src/heli/heli-flight.js';
import {SUMMIT_RUN} from '../src/heli/heli-jobs.js';
import {createProfile, normalizeProfile} from '../src/progression.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const near = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} is not within ${tolerance} of ${expected}`);
  checks++;
};
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
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const speedOf = v => Math.hypot(v.heli.vx, v.heli.vz);
function hash(text) { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const DAY = '2026-10-20';
const TRAINED = {liftoff: true, hover: true, landing: true, carry: true};
function readyProfile({count = 30, credits = 3000, name = 'Arrival QA'} = {}) {
  const profile = normalizeProfile({...createProfile(), credits, courses: {version: 1, unlocked: ['tremblant-woods']},
    heli: {version: 1, fuelKg: 400, lessons: TRAINED, refuels: 3, playDay: {last: DAY, count}}});
  const armed = armMissions(createMissions(), {date: '2026-10-14', playerName: name});
  return setMissions(profile, {...armed, count: armed.need}, on).profile;
}
function callProfile(kind, courseId) {
  const base = readyProfile(), armed = missionsOf(base);
  return setMissions(base, {...armed, call: {kind, id: `${kind}-${armed.draws}`, courseId, day: heliOf(base).playDay.count, answered: false}}, on).profile;
}
function newSession(profile, extra = {}) {
  return createHeliSession({profile, enabled: true, loadCourse, loadFireCourse: loadCourse, fireEnabled: true, playerName: 'Arrival QA',
    today: DAY, carId: 'falcone_f42', ...extra});
}
const BOTH = {summitRunEnabled: true, rescueEnabled: true, mode: 'assisted'};

// From the home pad: the autopilot to the edge of the area, the cruise leg, three seconds of the new course.
function cruise(session, destination) {
  session.setDestination(destination);
  ok(session.pressAutopilot(), `the autopilot flies toward ${destination}`);
  run(session, 400, () => ({}), v => v.cruiseOffered);
  ok(session.acceptCruise(), `the cruise leg to ${destination} is taken`);
  run(session, 3, () => ({}));
  if (session.autopilotOn) session.pressAutopilot();
  return session.view();
}

// ---- Every other arrival is what it was ----------------------------------------------------------
// Taken from the code as it stood before this card: the helicopter three seconds after the
// cruise leg from the home pad to Tremblant Snow and Panorama Ridge (both switches on), and to
// Summit Run with rescues off (Summit Run's switch alone).
function otherArrivals() {
  const parts = [];
  for (const [destination, extra] of [['tremblant-snow', BOTH], ['panorama-ridge', BOTH], ['summit-run', {summitRunEnabled: true, rescueEnabled: false}],
    ['tremblant-snow', {rescueEnabled: true}]]) {
    const session = newSession(readyProfile({count: 0}), extra);
    session.start();
    const v = cruise(session, destination);
    parts.push(destination + JSON.stringify(v.heli) + v.courseId + session.fingerprint());
  }
  return hash(parts.join('\n'));
}
const OTHER_ARRIVALS_PIN = 1120341889;
{
  const got = otherArrivals();
  if (OTHER_ARRIVALS_PIN === 0) console.log('PIN', got);
  else same(got, OTHER_ARRIVALS_PIN, 'the other arrivals are what they were');
}
console.log('PASS every other arrival is exact');

// ---- Summit Run, both switches on: the cruise leg ends over the landing circle --------------------
const summit = loadCourse('summit-run');
const site = courseSite(summit.course, summit.ground, 'summit-run', {summitRun: true, summitRescue: true});
{
  const session = newSession(readyProfile({count: 0}), BOTH);
  session.start();
  const v = cruise(session, 'summit-run');
  ok(v.courseId === 'summit-run', 'the cruise leg arrives at Summit Run');
  ok(dist(v.heli, site.zone) <= site.zone.radius, `over the landing circle (${dist(v.heli, site.zone).toFixed(1)} m from its centre)`);
  near(v.heli.y, site.zone.y + HELI_SESSION.arrivalHeight, 5, 'at the usual arrival height');
  ok(speedOf(v) < 1, 'hovering there');
  // With rescues off the cruise leg ends where it always did, 1.5 km out.
  const old = newSession(readyProfile({count: 0}), {summitRunEnabled: true, rescueEnabled: false});
  old.start();
  const w = cruise(old, 'summit-run');
  near(dist(w.heli, site.zone), HELI_SESSION.arrivalDistance, 200, 'rescues off: the arrival point is 1.5 km out, as before');
}
console.log('PASS the cruise leg to Summit Run ends over the start area');

// ---- An autopilot started at arrival clears the cliff ----------------------------------------------
{
  const session = newSession(callProfile('avalanche', 'summit-run'), BOTH);
  session.start();
  ok(session.pressRadio() && session.fitRescueLine().ok, 'the avalanche call is answered and the line fitted');
  cruise(session, 'summit-run');
  // The cruise leg leaves about 179 kg, not enough for the 6 km climb: down into the circle for the
  // lodge's truck (RESCUE-SUMMIT-TUNE), a full tank, and back up to the arrival height.
  const zone = site.zone, gz = zone.y;
  run(session, 120, v => pilot(v, {x: zone.x, z: zone.z, y: gz + 12}, {speed: 3, sink: 3}), v => v.heli.y < gz + 14);
  run(session, 120, v => pilot(v, {x: zone.x, z: zone.z, y: gz - 2}, {speed: 1, sink: 1.1}), v => v.heli.onGround);
  ok(session.view().heli.onGround && session.view().rescue.active.sites.atTruck, 'landed beside the start area truck');
  ok(session.buyFuel(330 - session.view().heli.fuelKg).ok, 'and filled the tank there');
  run(session, 120, v => pilot(v, {x: zone.x, z: zone.z, y: gz + HELI_SESSION.arrivalHeight}, {speed: 1, sink: 4}), v => v.heli.y > gz + HELI_SESSION.arrivalHeight - 3);
  const r = missionsOf(session.profile).rescue, pick = pickSlide(slideSpots(summit.course, summit.ground), r.seed, summit.ground);
  ok(session.pressAutopilot(), 'P at arrival takes the way to the slide');
  const log = run(session, 1500, () => ({}), (v, got) => has(got, 'autopilotArrived') || has(got, 'crash') || has(got, 'rescueFailed'));
  ok(!has(log, 'crash') && has(log, 'autopilotArrived'), 'the autopilot flies from the arrival to the slide without a crash');
  const v = session.view();
  ok(dist(v.heli, pick.slide) < 12, `and hovers over the debris area (${Math.round(dist(v.heli, pick.slide))} m)`);
}
console.log('PASS the autopilot reaches the avalanche slide from the arrival');

// The pickup has no autopilot goal of its own (the supply run is the pilot's), so the same
// autopilot and flight rules are flown headless: from the arrival state to the pickup's hover.
{
  const pickup = supplyPickup(summit.course, summit.ground);
  const ceiling = (x, z) => ceilingAt(site.area, x, z, summit.ground);
  const state = createHeliState({x: site.zone.x, z: site.zone.z, heading: 0, fuelKg: 330, mode: 'assisted',
    altitudeOffset: SUMMIT_RUN.baseAltitude - site.startY, ground: summit.ground});
  state.y = site.zone.y + HELI_SESSION.arrivalHeight; state.onGround = false;
  const ap = createAutopilot();
  toggleAutopilot(ap, state);
  setAutopilotTarget(ap, {x: pickup.x, z: pickup.z, groundY: summit.ground.height(pickup.x, pickup.z) + 10});
  let crashed = false, arrived = false, seconds = 0;
  for (let i = 0; i < 1500 * 120 && !crashed && !arrived; i++) {
    const out = autopilotStep(ap, state, {}, {ground: summit.ground, ceiling});
    const events = stepHeli(state, {}, {ground: summit.ground, commands: out.commands}, HELI_STEP);
    crashed = events.some(e => e.type === 'crash') || state.crashed;
    arrived = out.events.some(e => e.type === 'autopilotArrived');
    // The flying area's top holds the helicopter in, as the session does.
    const top = ceiling(state.x, state.z);
    if (state.y > top) { state.y = top; state.vy = Math.min(0, state.vy); }
    seconds = i / 120;
  }
  ok(!crashed && arrived, `the autopilot flies from the arrival to the pickup without a crash (${seconds.toFixed(0)} s)`);
  ok(dist(state, pickup) < 6, `and hovers over it (${dist(state, pickup).toFixed(1)} m)`);
}
console.log('PASS the autopilot reaches the pickup from the arrival');
console.log(`test-heli-summit-arrival: ${checks} checks passed`);
