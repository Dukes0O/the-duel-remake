// HELI-ARRIVAL-CLEAR (docs/board/cards/HELI-ARRIVAL-CLEAR.md): every cruise leg ends high enough that the
// straight line in from the arrival point to the landing circle clears the ground, trees and rocks by 40 m,
// at 150 m over the pad where it already did, and under the flying ceiling. Headless; memory storage only.
import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {createHeliSession, courseSite, ceilingAt, arrivalStart, HELI_SESSION, SEA_LEVEL} from '../src/heli/heli-session.js';
import {destinationsFor, bearing} from '../src/heli/heli-jobs.js';
import {TABLE_ID, createTableWorld} from '../src/heli/map-secrets.js';
import {createProfile, normalizeProfile} from '../src/progression.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };

// The game's helicopter worlds: the course at the helicopter's seed, the sea as a floor on a coast (heli-session loadWorld).
const worlds = new Map();
function loadCourse(id) {
  if (!worlds.has(id)) {
    const course = new Course(COURSE.find(def => def.id === id), 1989);
    worlds.set(id, {course, ground: groundFromCourse(course)});
  }
  return worlds.get(id);
}
function flownWorld(id) {
  if (id === TABLE_ID) return createTableWorld();
  const {course, ground} = loadCourse(id);
  if (!course.sections?.some(section => section.theme === 'coast')) return {course, ground};
  return {course, ground: {...ground, height: (x, z) => Math.max(ground.height(x, z), SEA_LEVEL)}};
}

// ---- Every arrival clears its line in --------------------------------------------------------------
// The line is read here every metre: under the line itself (ground, tree or rock), and with `reach` across a wider circle
// than the rotor's 6 m the arrival reads, for the lines that keep the usual height.
const CLEAR = 40;
function lineTop(ground, start, zone, reach = 0) {
  const length = Math.hypot(zone.x - start.x, zone.z - start.z), ux = (zone.x - start.x) / length, uz = (zone.z - start.z) / length;
  let top = -Infinity;
  for (let d = 0; d <= length - zone.radius; d += 1) top = Math.max(top, ground.highest(start.x + ux * d, start.z + uz * d, reach));
  return top;
}
const OPTION_SETS = [
  ['pilot map, Summit Run, the Table, Kogane Pass', {summitRun: true, pilotMap: true, table: true, koganePass: true}],
  ['Summit Run only', {summitRun: true}],
  ['the first three places', {}],
];
let raised = 0, kept = 0, highest = {over: -Infinity};
for (const [label, flags] of OPTION_SETS) {
  const ids = Object.keys(destinationsFor(flags));
  for (const to of ids) {
    const {course, ground} = flownWorld(to);
    const site = courseSite(course, ground, to, to === TABLE_ID ? flags : {...flags, table: false});
    for (const from of ids) {
      if (from === to) continue;
      const start = arrivalStart(site, ground, bearing(to, from, flags)), name = `${label}: ${to} from ${from}`;
      const top = lineTop(ground, start, site.zone), over = start.y - site.zone.y;
      ok(start.y - ground.height(start.x, start.z) >= CLEAR, `${name}: the arrival point is ${CLEAR} m over the ground`);
      ok(start.y - top >= CLEAR, `${name}: the line in clears the ground by ${CLEAR} m (${(start.y - top).toFixed(1)} m)`);
      ok(start.y <= ceilingAt(site.area, start.x, start.z, ground) - HELI_SESSION.arrivalUnder, `${name}: under the flying ceiling`);
      ok(over >= HELI_SESSION.arrivalHeight, `${name}: never lower than the usual 150 m`);
      // A line whose 8 m wide reading already clears by a good margin at 150 m keeps the usual height exactly.
      if (lineTop(ground, start, site.zone, 8) + CLEAR < site.zone.y + HELI_SESSION.arrivalHeight - 5) { ok(over === HELI_SESSION.arrivalHeight, `${name}: the usual 150 m`); kept++; }
      if (over > HELI_SESSION.arrivalHeight) raised++;
      if (over > highest.over) highest = {over, name};
    }
  }
}
ok(raised > 0 && kept > raised, `most arrivals keep 150 m (${kept} kept, ${raised} raised)`);
console.log(`PASS every arrival clears its line in by ${CLEAR} m (${raised} raised; the highest ${highest.over.toFixed(1)} m over the pad, ${highest.name})`);

// ---- In flight: Summit Run to Panorama Ridge, straight in -----------------------------------------
// The worst line measured (the ridge rose 61 m over the old arrival height, 265 m in). A pilot who flies straight
// at the pad at the arrival height reaches the landing circle; on the old code this flight met the ridge.
{
  const DAY = '2026-11-02';
  const profile = normalizeProfile({...createProfile(), credits: 3000, courses: {version: 1, unlocked: ['tremblant-woods']},
    heli: {version: 1, fuelKg: 400, lessons: {liftoff: true, hover: true, landing: true, carry: true}, refuels: 3, playDay: {last: DAY, count: 30}}});
  const session = createHeliSession({profile, enabled: true, loadCourse, carId: 'falcone_f42', today: DAY, mode: 'assisted',
    summitRunEnabled: true, pilotMapEnabled: true});
  const step = (seconds, controls, until = () => false) => {
    const events = [];
    for (let i = 0; i < Math.round(seconds * 120); i++) {
      events.push(...session.step(controls(session.view())));
      if (until(session.view(), events)) break;
    }
    return events;
  };
  session.start('summit-run');
  session.setDestination('panorama-ridge');
  ok(session.pressAutopilot(), 'the autopilot flies toward Panorama Ridge');
  step(400, () => ({}), v => v.cruiseOffered);
  ok(session.acceptCruise(), 'the cruise leg to Panorama Ridge is taken');
  step(120, () => ({}), v => v.courseId === 'panorama-ridge');
  if (session.autopilotOn) session.pressAutopilot();
  const arrived = session.view(), holdY = arrived.heli.y, zone = arrived.zone;
  ok(arrived.courseId === 'panorama-ridge', 'arrived at Panorama Ridge');
  ok(holdY - zone.y > HELI_SESSION.arrivalHeight, `arrived higher than the usual 150 m (${(holdY - zone.y).toFixed(1)} m)`);
  const clamp = v => Math.max(-1, Math.min(1, v));
  const straightIn = v => {
    const h = v.heli, fwdX = Math.sin(h.heading), fwdZ = Math.cos(h.heading), dx = zone.x - h.x, dz = zone.z - h.z, distance = Math.hypot(dx, dz);
    const ex = dx / distance * 20 - h.vx, ez = dz / distance * 20 - h.vz;
    return {pitch: clamp((ex * fwdX + ez * fwdZ) * 0.25), roll: clamp((ex * -fwdZ + ez * fwdX) * 0.25), lift: clamp((holdY - h.y) * 0.3 - h.vy * 0.3), yaw: 0};
  };
  const events = step(150, straightIn, (v, seen) => seen.some(event => event.type === 'crashed')
    || Math.hypot(v.heli.x - zone.x, v.heli.z - zone.z) <= zone.radius);
  const end = session.view();
  ok(!events.some(event => event.type === 'crashed'), 'no crash on the line in');
  ok(Math.hypot(end.heli.x - zone.x, end.heli.z - zone.z) <= zone.radius, 'over the landing circle');
}
console.log('PASS Summit Run to Panorama Ridge: straight in at the arrival height reaches the pad');
console.log(`test-heli-arrival-clear: ${checks} checks passed`);
