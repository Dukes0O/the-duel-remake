// RESCUE-AUTOPILOT (docs/HELI_RESCUE.md sections 5.3, 5.5, 7 and 11): the
// autopilot flies to a rescue's search area, debris area, cliff spot and
// handover circle; Summit Run is a destination only with its own switch; the
// car recovery job is taken at the board and flown as a car carry. Headless;
// memory storage only.
import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {createHeliSession, courseSite} from '../src/heli/heli-session.js';
import {armMissions} from '../src/heli/heli-missions.js';
import {heliOf, missionsOf, setMissions, createMissions} from '../src/heli/heli-save.js';
import {hikerSpots, pickHiker, slideSpots, pickSlide, hoistSpots, pickHoist} from '../src/heli/heli-search.js';
import {HELI_DESTINATIONS, legFuelKg, bearing, recoveryJobOf} from '../src/heli/heli-jobs.js';
import {dispatchBoardMarkup, handleBoardAction} from '../src/heli/heli-board.js';
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
const near = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} is not within ${tolerance} of ${expected}`);
  checks++;
};

const DAY = '2026-10-20';
const TRAINED = {liftoff: true, hover: true, landing: true, carry: true};
function readyProfile({count = 5, credits = 2000, name = 'Pilot QA', extra = {}, heli = {}} = {}) {
  const profile = normalizeProfile({...createProfile(), credits, courses: {version: 1, unlocked: ['tremblant-woods']},
    heli: {version: 1, fuelKg: 400, lessons: TRAINED, refuels: 3, playDay: {last: DAY, count}, ...heli}});
  const armed = armMissions(createMissions(), {date: '2026-10-14', playerName: name});
  return setMissions(profile, {...armed, count: armed.need, ...extra}, on).profile;
}
function hash(text) { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// ---- Switch off: every autopilot flight is what it was, byte for byte ---------
// The fire's lake flight, a flight to another course with its cruise leg and
// the approach to the landing zone, and the dispatch board, with the rescue
// and Summit Run switches off (not passed, passed false, and a non-true value).
let offFacts = null;
function offFingerprint(extra = {}) {
  const parts = [], facts = {lake: false, cruise: false, arrived: false, jobTaken: false};
  const make = profile => createHeliSession({profile, enabled: true, loadCourse, loadFireCourse: loadCourse, fireEnabled: true,
    playerName: 'Pilot QA', today: DAY, carId: 'falcone_f42', ...extra});
  {
    const woods = loadCourse('tremblant-woods');
    const session = make(readyProfile());
    const events = [...session.start()];
    const zone = session.view().zone;
    events.push(...run(session, 120, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + 45}), (v, got) => has(got, 'fireCall')));
    session.pressRadio();
    events.push(...run(session, 120, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y - 2}, {speed: 4, sink: 1}), v => v.heli.onGround));
    session.fitBucket();
    session.pressAutopilot();
    events.push(...run(session, 240, () => ({}), (v, got) => has(got, 'autopilotArrived')));
    events.push(...run(session, 20, () => ({})));
    facts.lake = has(events, 'autopilotArrived');
    parts.push(JSON.stringify(events), JSON.stringify(session.view()), session.fingerprint(), JSON.stringify(session.profile));
    session.leave();
  }
  {
    const session = make(readyProfile({count: 0}));
    const events = [...session.start()];
    session.buyFuel();
    events.push(...run(session, 4, () => ({lift: 1})));
    session.setDestination('tremblant-snow');
    session.pressAutopilot();
    events.push(...run(session, 400, () => ({}), () => session.cruiseOffered));
    facts.cruise = session.acceptCruise();
    events.push(...run(session, 2, () => ({})));
    events.push(...run(session, 300, () => ({}), (v, got) => has(got, 'autopilotArrived')));
    facts.arrived = has(events, 'autopilotArrived') && session.courseId === 'tremblant-snow';
    parts.push(JSON.stringify(events), JSON.stringify(session.view()), session.fingerprint(), JSON.stringify(session.profile));
    session.leave();
  }
  {
    const session = make(readyProfile({count: 0}));
    session.start();
    const jobs = session.boardJobs();
    parts.push(JSON.stringify(jobs), dispatchBoardMarkup(session.view(), {jobs, fire: {repairCost: 0}}));
    const taken = session.takeJob(jobs[1].id);
    facts.jobTaken = taken.ok === true && jobs.length === 4 && !jobs.some(job => job.recovery);
    parts.push(JSON.stringify(taken), JSON.stringify(session.view()));
    session.leave();
  }
  offFacts = facts;
  return hash(parts.join('\n'));
}
if (process.argv.includes('--print-pin')) { console.log(offFingerprint()); process.exit(0); }

// A trained pilot whose secret count has just reached its need (a call can ring).
function callProfile(kind, courseId, {name = 'Rescue QA', ...options} = {}) {
  const base = readyProfile({name, ...options}), armed = missionsOf(base);
  return setMissions(base, {...armed, call: {kind, id: `${kind}-${armed.draws}`, courseId, day: heliOf(base).playDay.count, answered: false}}, on).profile;
}
const summitStartY = () => loadCourse('summit-run').course.at(0).y;
function newSession(profile, {rescue = true, summit = false, mode = 'assisted'} = {}) {
  return createHeliSession({profile, enabled: true, loadCourse, loadFireCourse: loadCourse, fireEnabled: true, rescueEnabled: rescue,
    summitRunEnabled: summit, playerName: 'Rescue QA', today: DAY, carId: 'falcone_f42', mode});
}

// ---- Switch off: every flight is what it was before this card -----------------
// The pin was taken from the session as it stood before RESCUE-AUTOPILOT.
// HELI-PAY-CONTINUE re-recorded this (was 2230200939): the hashed board and view carry the job pays and the clean bonus, which moved.
const OFF_PIN = 2836329241;
for (const extra of [{}, {rescueEnabled: false}, {rescueEnabled: 'yes'}, {summitRunEnabled: false}, {summitRunEnabled: 'yes', rescueEnabled: 1}])
  assert.equal(offFingerprint(extra), OFF_PIN, `the switch-off flights are unchanged (${JSON.stringify(extra)})`), checks++;
same(offFacts, {lake: true, cruise: true, arrived: true, jobTaken: true}, 'and those flights really flew: the lake, the cruise leg, the approach, a job');
console.log('PASS the switches off keep every autopilot flight exact');

// ---- Helpers for the rescue flights -------------------------------------------
const home = loadCourse('tremblant-woods'), snow = loadCourse('tremblant-snow'), ridge = loadCourse('panorama-ridge');
const homeSite = courseSite(home.course, home.ground, 'tremblant-woods');
const snowSite = courseSite(snow.course, snow.ground, 'tremblant-snow');
const lines = events => events.filter(event => event.type === 'radio').map(event => event.line);
function legHeight(world, from, to, margin) {
  let top = -Infinity;
  for (let k = 0; k <= 60; k++) top = Math.max(top, world.ground.highest(from.x + (to.x - from.x) * k / 60, from.z + (to.z - from.z) * k / 60, 10));
  return top + margin;
}
// Up to a safe height, straight across, then down to finalY (or, landing, onto the ground): the pilot's own flying.
function travel(session, world, goal, finalY, {speed = 18, margin = 25, land = false} = {}) {
  const view = session.view(), high = Math.max(finalY, legHeight(world, view.heli, goal, margin)), events = [];
  events.push(...run(session, 90, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: high}, {speed: 1}), v => v.heli.y > high - 3));
  events.push(...run(session, 300, v => pilot(v, {x: goal.x, z: goal.z, y: high}, {speed}),
    v => Math.hypot(v.heli.x - goal.x, v.heli.z - goal.z) < 3 && speedOf(v) < 1));
  if (land) {
    const gy = world.ground.height(goal.x, goal.z);
    events.push(...run(session, 120, v => pilot(v, {x: goal.x, z: goal.z, y: gy + 12}, {speed: 3, sink: 3}), v => v.heli.y < gy + 14));
    events.push(...run(session, 120, v => pilot(v, {x: goal.x, z: goal.z, y: gy - 2}, {speed: 1, sink: 1.1}), v => v.heli.onGround));
  } else {
    events.push(...run(session, 180, v => pilot(v, {x: goal.x, z: goal.z, y: finalY}, {speed: 2, sink: Math.max(1.5, Math.min(6, (v.heli.y - finalY) / 6))}),
      v => Math.abs(v.heli.y - finalY) < 0.6 && Math.abs(v.heli.vy) < 0.4));
  }
  return events;
}
// Take off by hand to a height above the pad, so the autopilot can be switched on in the air.
const liftOff = (session, metres = 45) => {
  const zone = session.view().zone;
  return run(session, 90, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + metres}, {speed: 1}), v => v.heli.y > zone.y + metres - 3);
};
// Over a spot, steady, then down until the rescuer rests there; hold until clipped.
function lowerRescuer(session, world, spot) {
  const events = [];
  const onSpot = (v, y, sink) => { const l = v.rescue.line; return pilot(v, {x: spot.x - (l.x - v.heli.x), z: spot.z - (l.z - v.heli.z), y}, {speed: 3, sink}); };
  const height = v => v.rescue.line.y - world.ground.height(v.rescue.line.x, v.rescue.line.z);
  events.push(...run(session, 20, v => pilot(v, {x: spot.x, z: spot.z, y: v.heli.y}, {speed: 1}), v => speedOf(v) < 0.3));
  events.push(...run(session, 120, v => onSpot(v, v.heli.y - 3, height(v) > 5 ? 3 : 0.7), (v, got) => has(got, 'holdStarted')));
  // Keep a little slack on the steep slope, as the complete Summit flight does.
  events.push(...run(session, 40, v => onSpot(v, v.heli.y - 1.5, 0.3), (v, got) => has(got, 'clipped')));
  return events;
}
// The rescue's goal on the panel, as the autopilot flies to it.
const goalOf = session => session.view().rescue.goal;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// Carry the pair on the autopilot to the handover circle, then land by hand.
function autopilotCarry(session, world, zone) {
  let fastest = 0;
  ok(session.pressAutopilot(), 'P: the autopilot takes the pair to the handover circle');
  same(goalOf(session) && {x: goalOf(session).x, z: goalOf(session).z}, {x: zone.x, z: zone.z}, 'its goal is the handover circle');
  const events = run(session, 400, () => ({}), (v, got) => { fastest = Math.max(fastest, speedOf(v)); return has(got, 'autopilotArrived'); });
  ok(has(events, 'autopilotArrived'), 'it arrives over the circle');
  ok(fastest > 5 && fastest <= 20.2, `with people on the line it holds 20 m/s (fastest ${fastest.toFixed(1)})`);
  session.pressAutopilot();
  const aboveRing = v => v.rescue.line.y - world.ground.height(v.rescue.line.x, v.rescue.line.z);
  events.push(...run(session, 120, v => pilot(v, {x: zone.x, z: zone.z, y: v.heli.y - 3}, {speed: 2, sink: aboveRing(v) > 6 ? 3 : 0.5}),
    (v, got) => has(got, 'rescueDone') || has(got, 'rescueFailed')));
  return events;
}

// ---- The lost hiker: to the search area's centre, then to the pad with the hiker aboard ----
function flyHiker() {
  const session = newSession(callProfile('hiker', 'tremblant-woods'));
  const log = [...session.start()];
  ok(session.pressRadio(), 'R answers the hiker call');
  log.push(...liftOff(session));
  const r = missionsOf(session.profile).rescue, pick = pickHiker(hikerSpots(home.course, home.ground, homeSite), r.seed);
  ok(session.pressAutopilot(), 'P switches the autopilot on');
  const goal = goalOf(session);
  near(dist(goal, pick.lastSeen), 0, 1e-6, 'its goal is the centre of the 180 m search area');
  log.push(...run(session, 400, () => ({}), (v, got) => has(got, 'autopilotArrived')));
  const v = session.view();
  ok(has(log, 'autopilotArrived') && !has(log, 'crash'), 'it arrives without a crash');
  near(dist(v.heli, pick.clearing), 0, 6, 'the earlier clue spots the hiker en route and retargets the clearing');
  near(v.heli.y - home.ground.highest(pick.clearing.x, pick.clearing.z, 12), 40, 2, 'stopped 40 m above the obstacles');
  ok(v.rescue.active.stage === 'found' && has(log, 'hikerSpotted'), 'the closer clue reveals the hiker on the approach; landing is still the pilot\'s');
  ok(speedOf(v) < 1 && session.autopilotOn, 'and it holds the hover');
  // Any stick beyond 30% hands control straight back.
  const hand = session.step({roll: 0.5});
  ok(has(hand, 'autopilotOff') && hand.find(e => e.type === 'autopilotOff').reason === 'pilot' && !session.autopilotOn && goalOf(session) === null, 'a stick beyond 30% hands control back');
  // The pilot finds the hiker, lands in the clearing, and the hiker climbs in.
  const gy = (x, z) => home.ground.height(x, z);
  log.push(...travel(session, home, pick.hiker, gy(pick.hiker.x, pick.hiker.z) + 60));
  ok(has(log, 'hikerSpotted') && session.view().rescue.active.stage === 'found', 'flying over them by hand lights the flare');
  ok(session.pressAutopilot(), 'P again, with the hiker found');
  near(dist(goalOf(session), pick.clearing), 0, 1e-6, 'the goal is now the clearing');
  log.push(...run(session, 300, () => ({}), (view, got) => has(got, 'autopilotArrived')));
  near(dist(session.view().heli, pick.clearing), 0, 6, 'over the clearing');
  session.pressAutopilot();
  log.push(...travel(session, home, pick.clearing, gy(pick.clearing.x, pick.clearing.z) + 30, {land: true}));
  log.push(...run(session, 150, () => ({}), (view, got) => has(got, 'hikerAboard')));
  ok(has(log, 'hikerAboard') && session.view().rescue.active.stage === 'carry', 'landing in the clearing stays the pilot\'s: the hiker climbs in');
  // Lift off by hand, then the autopilot to the pad's circle.
  log.push(...run(session, 30, view => pilot(view, {x: view.heli.x, z: view.heli.z, y: view.heli.y + 60}, {speed: 1}), view => view.heli.y - view.zone.y > 0 && !view.heli.onGround && view.heli.y > gy(view.heli.x, view.heli.z) + 40));
  ok(session.pressAutopilot(), 'P with the hiker aboard');
  same({x: goalOf(session).x, z: goalOf(session).z}, {x: homeSite.zone.x, z: homeSite.zone.z}, 'the goal is the pad\'s handover circle');
  log.push(...run(session, 400, () => ({}), (view, got) => has(got, 'autopilotArrived')));
  const h = session.view();
  near(dist(h.heli, homeSite.zone), 0, 4, 'in a hover over the circle');
  near(h.heli.y - homeSite.zone.y, 20, 2, 'about 20 m above it');
  session.pressAutopilot();
  log.push(...travel(session, home, homeSite.zone, homeSite.zone.y + 20, {land: true}));
  const done = log.find(e => e.type === 'rescueDone');
  ok(done && done.kind === 'hiker' && done.paid === 3500, "landing in the circle is the pilot's, and pays 3,500 (HELI-PAY-CONTINUE, was 1,000)");
  return {log, hash: hash(JSON.stringify(log))};
}
{
  const first = flyHiker();
  ok(has(first.log, 'rescueDone'), 'the hiker was flown');
  assert.equal(flyHiker().hash, first.hash, 'the same save flies the same rescue'); checks++;
}
console.log('PASS the autopilot flies a lost hiker to the search area, the clearing and the pad');

// ---- Avalanche and hoist: the rescuer on the line, across the cruise leg, to the area or cliff ----
function flyLine(kind, courseId, world, zone) {
  const session = newSession(callProfile(kind, courseId));
  const log = [...session.start()];
  ok(session.pressRadio() && session.fitRescueLine().ok, `${kind}: answered, the rescue line fitted`);
  const r = missionsOf(session.profile).rescue;
  const picked = kind === 'avalanche' ? pickSlide(slideSpots(world.course, world.ground), r.seed, world.ground) : pickHoist(hoistSpots(world.course, world.ground), r.seed, world.ground);
  const spot = kind === 'avalanche' ? picked.slide : picked.driver;
  // Away from the pad on the autopilot: the cruise leg is the pilot's to accept.
  session.setDestination(courseId);
  ok(session.pressAutopilot(), `${kind}: P at the pad`);
  log.push(...run(session, 400, () => ({}), v => v.cruiseOffered));
  ok(session.acceptCruise(), `${kind}: the cruise leg`);
  log.push(...run(session, 3, () => ({})));
  ok(session.courseId === courseId && session.autopilotOn, `${kind}: across, the autopilot still on`);
  log.push(...run(session, 400, () => ({}), (v, got) => has(got, 'autopilotArrived')));
  const v = session.view();
  ok(has(log, 'autopilotArrived') && !has(log, 'crashed'), `${kind}: it arrives, no crash`);
  near(dist(v.heli, spot), 0, 6, `${kind}: in a hover over the ${kind === 'avalanche' ? 'debris area' : 'cliff spot'}`);
  near(v.heli.y - world.ground.highest(spot.x, spot.z, 12), 40, 2.5, `${kind}: 40 m above the obstacles, the rescuer hanging below`);
  ok(speedOf(v) < 1 && v.rescue.active.stage !== 'carry', `${kind}: still searching (stage ${v.rescue.active.stage})`);
  ok(!has(log, 'rescueFast'), `${kind}: with people on the line it never went past 20 m/s`);
  return {session, log, picked, spot};
}
{
  const {session, log, picked} = flyLine('avalanche', 'tremblant-snow', snow, snowSite.zone);
  // Setting the rescuer down at the beacon is the pilot's. The autopilot then takes the pair to the circle.
  session.pressAutopilot();
  log.push(...travel(session, snow, picked.beacon, snow.ground.height(picked.beacon.x, picked.beacon.z) + 40, {speed: 19, margin: 40}));
  log.push(...lowerRescuer(session, snow, picked.beacon));
  ok(has(log, 'clipped') && session.view().rescue.active.stage === 'carry', 'avalanche: set down, held and clipped by hand');
  const base = session.view().heli.y;
  log.push(...run(session, 60, v => pilot(v, {x: v.rescue.line.x, z: v.rescue.line.z, y: base + 35}, {speed: 1, sink: 2.5}), v => v.heli.y > base + 30));
  log.push(...autopilotCarry(session, snow, snowSite.zone));
  const done = log.find(e => e.type === 'rescueDone');
  ok(done && done.kind === 'avalanche' && done.paid > 0, `avalanche: handed over at the ski patrol landing zone and paid (${done?.paid})`);
}
console.log('PASS the autopilot flies an avalanche rescue to the debris area and the handover circle');
{
  const ridgeSite = courseSite(ridge.course, ridge.ground, 'panorama-ridge');
  const {session, log, picked} = flyLine('hoist', 'panorama-ridge', ridge, ridgeSite.zone);
  ok(speedOf(session.view()) < 1, 'hoist: hovering at the cliff');
  // The hold beside the driver is the pilot's: with the stage on hold the autopilot hovers where it is.
  session.pressAutopilot();
  log.push(...travel(session, ridge, picked.driver, ridge.ground.height(picked.driver.x, picked.driver.z) + 40, {speed: 19, margin: 40}));
  log.push(...lowerRescuer(session, ridge, picked.driver));
  ok(has(log, 'clipped'), 'hoist: set down beside the driver, held 8 seconds, clipped by hand');
}
console.log('PASS the autopilot flies a hoist rescue to the cliff spot');
{
  // Supply runs are not on the autopilot's list: no goal, so on the pad it stays off.
  const session = newSession(callProfile('supply', 'tremblant-snow'));
  session.start();
  ok(session.pressRadio(), 'supply: answered');
  liftOff(session);
  ok(session.pressAutopilot() && goalOf(session) === null, 'supply: the autopilot has no goal and only holds the hover');
}
console.log('PASS a supply run gets no rescue goal');

// ---- Summit Run, a destination only with its own switch -------------------------------
{
  const summit = loadCourse('summit-run');
  // With the switch off nothing changes and Summit Run is not a place to fly to.
  const off = newSession(readyProfile({count: 0}));
  off.start();
  ok(off.setDestination('summit-run') === false && off.view().destinations === undefined, 'off: Summit Run is not a destination, and the view names none');
  assert.throws(() => newSession(readyProfile({count: 0})).start('summit-run'), /Not a helicopter destination/); checks++;
  same(Object.keys(HELI_DESTINATIONS), ['tremblant-woods', 'tremblant-snow', 'panorama-ridge'], 'off: the three destinations');
  // On: a fourth place, with its landing zone and pad found like every destination's.
  const siteOn = courseSite(summit.course, summit.ground, 'summit-run', {summitRun: true});
  const start = summit.course.at(0);
  ok(dist(siteOn.zone, start) < 220 && siteOn.zone.radius === 12, 'on: the landing zone is beside Summit Run\'s start line');
  ok(summit.ground.near(siteOn.zone.x, siteOn.zone.z, siteOn.zone.radius).every(o => o.top <= siteOn.zone.y + 0.5), 'nothing tall in the zone');
  ok(dist(siteOn.parking, siteOn.zone) > siteOn.zone.radius && siteOn.spare && siteOn.crate && siteOn.carryTarget, 'and its pad has the parking spots, the crate and the carry circle');
  // The legs, both ways, and the bearings on the small map.
  const legs = {'tremblant-woods': 160, 'tremblant-snow': 150, 'panorama-ridge': 90};
  for (const [from, kg] of Object.entries(legs)) {
    same([legFuelKg(from, 'summit-run', {summitRun: true}), legFuelKg('summit-run', from, {summitRun: true}), legFuelKg(from, 'summit-run')], [kg, kg, null],
      `${from}: ${kg} kg to Summit Run and back, and none with the switch off`);
  }
  ok(bearing('summit-run', 'panorama-ridge') === null && (b => b.x < 0 && b.z > 0)(bearing('panorama-ridge', 'summit-run', {summitRun: true})), 'the small map puts Summit Run north-west of Panorama Ridge');
}
// The flight itself: from the home pad, on the autopilot, across the 160 kg leg, to the pad at Summit Run.
{
  const session = newSession(readyProfile({count: 0}), {summit: true});
  const log = [...session.start()];
  same(session.view().destinations, ['tremblant-woods', 'tremblant-snow', 'panorama-ridge', 'summit-run'], 'on: the view names four destinations');
  ok(session.setDestination('summit-run'), 'on: Summit Run can be chosen');
  log.push(...run(session, 4, () => ({lift: 1})));
  ok(session.pressAutopilot(), 'P toward Summit Run');
  log.push(...run(session, 400, () => ({}), v => v.cruiseOffered));
  ok(session.view().cruiseOffered, 'the edge of the area offers the cruise leg');
  const fuel = session.view().heli.fuelKg;
  ok(session.acceptCruise(), 'Cruise');
  near(fuel - session.view().heli.fuelKg, 160, 0.01, 'the leg takes 160 kg');
  log.push(...run(session, 2, () => ({})));
  const arrived = session.view();
  ok(session.courseId === 'summit-run' && log.some(e => e.type === 'entered' && e.courseId === 'summit-run' && e.arrived), 'arrived at Summit Run');
  ok(dist(arrived.heli, arrived.zone) <= arrived.zone.radius, 'arrived over the start area landing circle (RESCUE-SUMMIT-ARRIVAL; it was 1.5 km from the zone)');
  near(arrived.readout.altitudeM, 2860 + (arrived.heli.y - summitStartY()), 0.01, 'the altitude reads from the 2,860 m base');
  const sea = newSession(readyProfile({count: 0}), {summit: true});
  sea.start();
  ok(arrived.readout.maxLiftKg < sea.view().readout.maxLiftKg * 0.75, 'the air is thin there: the helicopter lifts a lot less');
  log.push(...run(session, 400, () => ({}), (v, got) => has(got, 'autopilotArrived')));
  const over = session.view();
  near(dist(over.heli, over.zone), 0, 4, 'the autopilot brings it to a hover over the landing zone');
  near(over.heli.y - over.zone.y, 20, 2, 'about 20 m above it');
  session.pressAutopilot();
  log.push(...travel(session, loadCourse('summit-run'), over.zone, over.zone.y + 20, {land: true}));
  ok(has(log, 'touchdown') && session.view().heli.onGround && !has(log, 'crash'), 'landing in the zone is by hand, and it is good');
  assert.equal(heliOf(session.leave()).flights, 1, 'the flight is counted'); checks++;
}
console.log('PASS Summit Run is a destination with its switch on');
// Every leg to and from Summit Run, flown as far as the cruise: the fuel taken and the arrival.
for (const [from, to, kg] of [['tremblant-snow', 'summit-run', 150], ['panorama-ridge', 'summit-run', 90], ['summit-run', 'tremblant-woods', 160],
  ['summit-run', 'tremblant-snow', 150], ['summit-run', 'panorama-ridge', 90]]) {
  const session = newSession(readyProfile({count: 0}), {summit: true});
  session.start(from);
  ok(session.setDestination(to), `${from}: ${to} chosen`);
  run(session, 4, () => ({lift: 1}));
  session.pressAutopilot();
  run(session, 600, () => ({}), v => v.cruiseOffered);
  const fuel = session.view().heli.fuelKg;
  ok(session.view().cruiseOffered && session.acceptCruise(), `${from} to ${to}: the cruise leg is offered and taken`);
  near(fuel - session.view().heli.fuelKg, kg, 0.01, `${from} to ${to}: ${kg} kg`);
  run(session, 2, () => ({}));
  ok(session.courseId === to, `${from} to ${to}: arrived`);
}
console.log('PASS every leg to and from Summit Run');

// ---- The car recovery job: taken at the board, flown as a car carry, paid once ---------------
// A wreck left by a hoist rescue on the day before (play day 7; the rescue was on day 6).
const ridgeSite = courseSite(ridge.course, ridge.ground, 'panorama-ridge');
function wreckProfile({day = 6, count = 7, credits = 2000} = {}) {
  const pick = pickHoist(hoistSpots(ridge.course, ridge.ground), 0x2468ace, ridge.ground);
  const base = readyProfile({count, credits});
  const wreck = {courseId: 'panorama-ridge', carId: 'falcone_f42', x: Math.round(pick.car.x * 10) / 10, z: Math.round(pick.car.z * 10) / 10, day};
  return setMissions(base, {...missionsOf(base), count: 0, wreck}, on).profile;
}
{
  const profile = wreckProfile();
  const session = newSession(profile);
  session.start();
  const job = session.boardJobs().find(item => item.recovery);
  ok(job && job.taken === false && job.pay === 3100, 'the recovery job is on the board for 3,100 (HELI-PAY-CONTINUE, was 500)');
  const markup = () => dispatchBoardMarkup(session.view(), {jobs: session.boardJobs(), fire: {repairCost: 0}});
  ok(markup().includes(`data-heli-board="take:${job.id}"`) && !markup().includes('data-heli-board="drop"'), 'with a Take job button');
  // The board's button takes it, like any job.
  const app = {heliSession: session, _heliEvents() {}};
  const taken = handleBoardAction(`take:${job.id}`, app);
  ok(taken.ok && taken.job.id === job.id && session.job?.id === job.id, 'the Take button takes the recovery job');
  ok(session.boardJobs().find(item => item.recovery).taken && markup().includes('data-heli-board="drop"'), 'the board shows it taken, with Drop job');
  const other = session.boardJobs().find(item => !item.recovery && !item.own);
  ok(session.takeJob(other.id).ok === false, 'no other job while it is in hand');
  ok(session.dropJob().dropped === true && session.job === null && session.boardJobs().find(item => item.recovery).taken === false, 'Drop job hands it back to the board');
  ok(session.takeJob(job.id).ok && session.takeJob(job.id).ok, 'and it can be taken again');
  same(heliOf(session.profile).jobs.taken, job.id, 'the save has it in hand');
  // With the rescue switch off the job is neither on the board nor takeable.
  const off = newSession(profile, {rescue: false});
  off.start();
  ok(off.takeJob(job.id).ok === false && !off.boardJobs().some(item => item.recovery), 'off: not on the board and not takeable');
  // On the third day after the rescue it is still there; the fourth, gone.
  const later = newSession(wreckProfile({count: 9}));
  later.start();
  ok(later.boardJobs().some(item => item.recovery), 'three play days on it is still there');
  const gone = newSession(wreckProfile({count: 10}));
  gone.start();
  ok(!gone.boardJobs().some(item => item.recovery) && gone.takeJob(job.id).ok === false, 'a day later it is gone');
}
// Flown: taken at the pad, across to Panorama Ridge, hover over the car, hook it, carry it to the zone, set it down.
function flyRecovery({mode = 'assisted', stepLog = null} = {}) {
  const profile = wreckProfile();
  const wreck = missionsOf(profile).wreck, job = recoveryJobOf(profile, {enabled: true});
  const session = newSession(profile, {mode});
  const log = [...session.start()];
  ok(session.takeJob(job.id).ok, 'recovery: taken at the pad');
  same(session.destination, 'panorama-ridge', 'recovery: the way to the slope is set');
  ok(session.pressAutopilot(), 'recovery: P at the pad');
  log.push(...run(session, 400, () => ({}), v => v.cruiseOffered));
  ok(session.acceptCruise(), 'recovery: the cruise leg');
  log.push(...run(session, 3, () => ({})));
  const wreckLoad = () => session.view().loads.find(load => load.job === job.id);
  ok(wreckLoad() && near(wreckLoad().x, wreck.x, 0.5, 'the car waits where the wreck lies (x)') === undefined, 'recovery: the car waits on the slope');
  near(wreckLoad().z, wreck.z, 0.5, 'the car waits where the wreck lies (z)');
  ok(!wreckLoad().own && !wreckLoad().hooked, 'a customer\'s car, not hooked');
  log.push(...run(session, 400, () => ({}), (v, got) => has(got, 'autopilotArrived')));
  const v = session.view(), car = wreckLoad();
  ok(has(log, 'autopilotArrived') && !has(log, 'crashed'), 'recovery: the autopilot arrives over the car, no crash');
  near(dist(v.heli, car), 0, 6, 'recovery: in a hover over the car on the slope');
  near(v.heli.y - ridge.ground.highest(car.x, car.z, 12), 40, 2.5, 'recovery: 40 m above the obstacles');
  // Down to the car and hook it by hand.
  session.pressAutopilot();
  log.push(...run(session, 120, view => { const c = wreckLoad(); return pilot(view, {x: c.x, z: c.z, y: c.y + 15.2}, {speed: 3, sink: 3}); },
    view => { const c = wreckLoad(); return Math.hypot(view.heli.x - c.x, view.heli.z - c.z) < 1 && Math.abs(view.heli.y - c.y - 15.2) < 0.6 && Math.hypot(view.heli.vx, view.heli.vy, view.heli.vz) < 0.5; }));
  const hooked = session.pressHook();
  same(hooked?.type, 'hooked', 'recovery: the car is hooked');
  ok(session.takeEvents().length >= 0 && wreckLoad().hooked, 'recovery: it hangs from the cable');
  return {session, log, job, wreck};
}
function deliverRecovery(mode, pay) {
  const {session, log, job} = flyRecovery({mode});
  // Lift it clear gently, then the autopilot carries it to the landing zone.
  const base = session.view().heli.y;
  log.push(...run(session, 60, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: base + 25}, {speed: 1, sink: 2}), v => v.heli.y > base + 20));
  ok(session.pressAutopilot(), 'recovery: P with the car on the cable');
  same({x: goalOf(session)?.x, z: goalOf(session)?.z}, {x: ridgeSite.zone.x, z: ridgeSite.zone.z}, 'recovery: the goal is the landing zone');
  log.push(...run(session, 600, () => ({}), (v, got) => has(got, 'autopilotArrived')));
  const over = session.view();
  ok(has(log, 'autopilotArrived') && !has(log, 'crashed'), 'recovery: arrives over the zone with the car');
  session.pressAutopilot();
  // Down gently onto the zone, then H.
  log.push(...run(session, 90, view => pilot(view, {x: ridgeSite.zone.x, z: ridgeSite.zone.z, y: ridgeSite.zone.y + 0.7 + 14.6}, {speed: 1}),
    view => view.loads.find(load => load.job === job.id)?.onGround));
  log.push(...run(session, 1, view => pilot(view, {x: view.heli.x, z: view.heli.z, y: view.heli.y})));
  const credits = session.profile.credits;
  const released = session.pressHook();
  same(released?.type, 'released', 'recovery: set down cleanly and released');
  const events = session.takeEvents();
  const done = events.find(e => e.type === 'jobDone');
  ok(done && done.recovery === true && done.pay === pay, `recovery: the job is done and pays ${pay}`);
  same(session.profile.credits, credits + pay, 'recovery: the credits agree');
  const m = missionsOf(session.profile);
  ok(m.wreck === null && heliOf(session.profile).jobs.taken === null && session.job === null, 'recovery: the wreck is cleared and nothing is in hand');
  ok(!session.boardJobs().some(item => item.recovery), 'recovery: it has left the board');
  ok(lines(events).includes('heli.radio.job.done'), 'recovery: the job-done line');
  // Once only: hooking the car again and releasing it in the zone pays nothing more.
  ok(session.takeJob(job.id).ok === false, 'recovery: it cannot be taken again');
  const after = session.profile.credits;
  session.pressHook();
  session.pressHook();
  ok(session.profile.credits === after && !session.takeEvents().some(e => e.type === 'jobDone'), 'recovery: moving the car again pays nothing');
}
// HELI-PAY-CONTINUE: 3,100 (was 500), and a clean set-down adds 800.
deliverRecovery('assisted', 3900);
{
  // Real pays a quarter more (the flight itself is the same; hooking by hand in Real is not scripted here).
  const real = newSession(wreckProfile(), {mode: 'real'});
  real.start();
  same(real.boardJobs().find(item => item.recovery).payNow, 3875, 'Real: the board offers 3,875');
}
console.log('PASS the car recovery job is taken, flown and paid once');

// ---- The hold at the driver is the pilot's: switched on during the hold, the autopilot only hovers ----
{
  const {session, log, picked} = flyLine('hoist', 'panorama-ridge', ridge, ridgeSite.zone);
  session.pressAutopilot();
  log.push(...travel(session, ridge, picked.driver, ridge.ground.height(picked.driver.x, picked.driver.z) + 40, {speed: 19, margin: 40}));
  const spot = picked.driver;
  const onSpot = (v, y, sink) => { const l = v.rescue.line; return pilot(v, {x: spot.x - (l.x - v.heli.x), z: spot.z - (l.z - v.heli.z), y}, {speed: 3, sink}); };
  const height = v => v.rescue.line.y - ridge.ground.height(v.rescue.line.x, v.rescue.line.z);
  log.push(...run(session, 20, v => pilot(v, {x: spot.x, z: spot.z, y: v.heli.y}, {speed: 1}), v => speedOf(v) < 0.3));
  log.push(...run(session, 120, v => onSpot(v, v.heli.y - 3, height(v) > 5 ? 3 : 0.7), (v, got) => has(got, 'holdStarted')));
  ok(session.view().rescue.active.stage === 'hold', 'hold: the rescuer is down beside the driver');
  const before = session.view().heli;
  ok(session.pressAutopilot() && goalOf(session) === null, 'hold: the autopilot has no goal to fly to');
  run(session, 3, () => ({}));
  const after = session.view().heli;
  ok(Math.hypot(after.x - before.x, after.z - before.z) < 6 && session.autopilotOn, 'hold: it hovers where it is');
}
console.log('PASS the hold at the driver stays the pilot\'s');

// ---- The same flight at any frame rate ------------------------------------------------------
for (const dt of [1 / 60, 1 / 144, 1 / 240]) {
  const session = newSession(callProfile('hiker', 'tremblant-woods'));
  session.start();
  session.pressRadio();
  const zone = session.view().zone;
  let count = 0;
  while (count++ < 600 * 20 && session.view().heli.y < zone.y + 42) session.step(pilot(session.view(), {x: zone.x, z: zone.z, y: zone.y + 45}, {speed: 1}), dt);
  const r = missionsOf(session.profile).rescue, pick = pickHiker(hikerSpots(home.course, home.ground, homeSite), r.seed);
  session.pressAutopilot();
  let arrived = false;
  for (let i = 0; i < 400 / dt && !arrived; i++) arrived = has(session.step({}, dt), 'autopilotArrived');
  const v = session.view();
  ok(arrived && dist(v.heli, pick.clearing) < 6 && Math.abs(v.heli.y - (home.ground.highest(pick.clearing.x, pick.clearing.z, 12) + 40)) < 2.5,
    `at ${Math.round(1 / dt)} steps a second it stops 40 m above the clearing after early discovery`);
}
console.log('PASS the same rescue goal at 60, 144 and 240 steps a second');
console.log(`test-heli-autopilot-rescue: ${checks} checks passed`);
