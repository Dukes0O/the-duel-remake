// H4 Rescue wired into the helicopter session and the board (docs/HELI_RESCUE.md
// sections 3.4, 7 and 11): the call and the radio box, the rescue line fitted
// at the pad, each rescue flown by script from the call to the pay, a clock
// running out, failure on a crash or on leaving, and the switch off meaning
// H2 exactly. Headless; memory storage only.
import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {createHeliSession, courseSite} from '../src/heli/heli-session.js';
import {armMissions, rescueConditions, RESCUE_CLOCKS} from '../src/heli/heli-missions.js';
import {heliOf, missionsOf, setMissions, createMissions} from '../src/heli/heli-save.js';
import {hikerSpots, pickHiker, slideSpots, pickSlide, hoistSpots, pickHoist, supplyYard, crateSpots} from '../src/heli/heli-search.js';
import {bearing} from '../src/heli/heli-jobs.js';
import {HELI_RADIO_LINES} from '../src/heli/heli-radio-lines.js';
import {dispatchBoardMarkup, handleBoardAction} from '../src/heli/heli-board.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {raceFeatureFlags} from '../src/wasteland-access.js';

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
const home = loadCourse('tremblant-woods'), snow = loadCourse('tremblant-snow'), ridge = loadCourse('panorama-ridge');
const homeSite = courseSite(home.course, home.ground, 'tremblant-woods');
const snowSite = courseSite(snow.course, snow.ground, 'tremblant-snow');

// The steady test pilot of tools/test-heli-fire-session.mjs (Assisted).
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
function run(session, seconds, controls, until = null, dt = undefined) {
  const events = [];
  for (let i = 0; i < Math.round(seconds / (dt ?? 1 / 120)); i++) {
    events.push(...session.step(controls(session.view()), dt));
    if (until?.(session.view(), events)) break;
  }
  return events;
}
const has = (events, type) => events.some(event => event.type === type);
const lines = events => events.filter(event => event.type === 'radio').map(event => event.line);
const speedOf = view => Math.hypot(view.heli.vx, view.heli.vz);

// The highest thing on a straight line, so a leg clears it.
function legHeight(world, from, to, margin) {
  let top = -Infinity;
  for (let k = 0; k <= 60; k++) top = Math.max(top, world.ground.highest(from.x + (to.x - from.x) * k / 60, from.z + (to.z - from.z) * k / 60, 10));
  return top + margin;
}
// Up to a safe height, straight across, then down to finalY (or, landing, onto the ground).
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

const DAY = '2026-10-20';
const TRAINED = {liftoff: true, hover: true, landing: true, carry: true};
// A trained pilot whose secret count has just reached its need. `extra` is merged into the missions record.
function readyProfile({count = 5, credits = 2000, name = 'Rescue QA', extra = {}, heli = {}} = {}) {
  const profile = normalizeProfile({...createProfile(), credits, courses: {version: 1, unlocked: ['tremblant-woods']},
    heli: {version: 1, fuelKg: 400, lessons: TRAINED, refuels: 3, playDay: {last: DAY, count}, ...heli}});
  const armed = armMissions(createMissions(), {date: '2026-10-14', playerName: name});
  return setMissions(profile, {...armed, count: armed.need, ...extra}, on).profile;
}
// ... with a rescue call waiting (as a call that rang earlier would be).
function callProfile(kind, courseId, {callDay = null, ...options} = {}) {
  const base = readyProfile(options), armed = missionsOf(base);
  return setMissions(base, {...armed, call: {kind, id: `${kind}-${armed.draws}`, courseId, day: callDay ?? heliOf(base).playDay.count, answered: false}}, on).profile;
}
function newSession(profile, {rescue = true, fire = true, today = DAY, mode = 'assisted'} = {}) {
  return createHeliSession({profile, enabled: true, loadCourse, loadFireCourse: loadCourse, fireEnabled: fire, rescueEnabled: rescue,
    playerName: 'Rescue QA', today, carId: 'falcone_f42', mode});
}
const seen = new Set();
const note = events => { for (const line of lines(events)) seen.add(line); return events; };

// ---- Switch off: every existing fire session is the same, byte for byte -----------
function hash(text) { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// A call answered at once with the bucket fitted and the pump used, a call nobody
// answers, and the first day of each season: the events, the save, the view, the
// board and the fingerprint of every one.
function fireFingerprint(extra = {}) {
  const parts = [];
  const make = profile => createHeliSession({profile, enabled: true, loadCourse, loadFireCourse: loadCourse, fireEnabled: true,
    playerName: 'Fire QA', today: DAY, carId: 'falcone_f42', ...extra});
  {
    const session = make(readyProfile({name: 'Fire QA'})), events = [...session.start()];
    const zone = session.view().zone;
    events.push(...run(session, 120, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + 45}), (v, got) => has(got, 'fireCall')));
    session.pressRadio(); events.push(...session.takeEvents());
    events.push(...run(session, 10, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + 45})));
    events.push(...run(session, 120, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y - 2}, {speed: 4}), v => v.heli.onGround));
    session.fitBucket(); session.buyFuel(Infinity); events.push(...session.takeEvents());
    events.push(...run(session, 5, () => ({})));
    parts.push(JSON.stringify(events), JSON.stringify(heliOf(session.profile)), JSON.stringify(session.view()),
      dispatchBoardMarkup(session.view(), {fire: {repairCost: 0}}), session.fingerprint());
    session.leave();
    parts.push(JSON.stringify(heliOf(session.profile)));
  }
  {
    const session = make(readyProfile({name: 'Fire QA'})); session.start();
    const zone = session.view().zone;
    const events = run(session, 120, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + 45}), (v, got) => has(got, 'fireCall'));
    events.push(...run(session, 25, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + 45})));
    parts.push(JSON.stringify(events), JSON.stringify(session.view()), dispatchBoardMarkup(session.view(), {fire: {repairCost: 0}}));
    session.leave();
    parts.push(JSON.stringify(heliOf(session.profile)));
  }
  for (const count of [1, 13, 25, 26, 37]) {
    const session = make(readyProfile({count, name: 'Fire QA'})), events = [...session.start()];
    const zone = session.view().zone;
    events.push(...run(session, 20, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + 45})));
    parts.push(count + JSON.stringify(events), JSON.stringify(session.view().season));
    session.leave();
  }
  return hash(parts.join('\n'));
}
// Taken from the fire session as it stood before RESCUE-HOOKS (the engine of RESCUE-ENGINE merged).
// HELI-PAY-CONTINUE re-recorded this (was 1400586788): it hashes the board's pay words.
const FIRE_SESSION_FINGERPRINT = 2478802993;
{
  same(fireFingerprint(), FIRE_SESSION_FINGERPRINT, 'with no rescue switch the fire session is as it was');
  same(fireFingerprint({rescueEnabled: false}), FIRE_SESSION_FINGERPRINT, 'and with the switch off');
  same(fireFingerprint({rescueEnabled: 'yes'}), FIRE_SESSION_FINGERPRINT, 'only true turns it on');
}
console.log('PASS the switch off keeps the fire session exact');

// A rescue call or record stored by a build with the switch on is ignored with it off, and never blocks a fire call.
for (const kind of ['hiker', 'avalanche', 'hoist', 'supply']) {
  const courseId = rescueConditions({summitRun: false})[kind][0];
  const stored = {kind, id: `${kind}-9`, courseId, seed: 1234, clockSeconds: 100, stage: 'carry', crates: [2, 1, 0], condition: 1};
  const base = readyProfile({extra: {rescue: stored}});
  const profile = setMissions(base, {...missionsOf(base), call: {kind, id: `${kind}-9`, courseId, day: 5, answered: false}}, on).profile;
  const session = newSession(profile, {rescue: false});
  const log = [...session.start()];
  const zone = session.view().zone;
  log.push(...run(session, 120, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + 45}), (v, got) => has(got, 'fireCall')));
  ok(has(log, 'fireCall'), `${kind}: a stored rescue call does not stop the fire call`);
  ok(!log.some(event => /^(rescue|hiker|crate)/.test(event.type)), `${kind}: and nothing about a rescue happens`);
  same([missionsOf(session.profile).call.kind, missionsOf(session.profile).rescue], ['fire', stored], `${kind}: the fire call opened, the stored record untouched`);
  ok(!('rescue' in session.view()), `${kind}: no rescue in the view`);
  ok(session.pressRadio() && missionsOf(session.profile).call.kind === 'fire' && missionsOf(session.profile).rescue.stage === 'carry', `${kind}: R answers the fire`);
  same([session.declineCall(), session.fitRescueLine().ok, session.takeOffRescueLine().ok], [false, false, true], `${kind}: no decline, no line`);
  const markup = dispatchBoardMarkup(session.view(), {fire: {repairCost: 0}});
  ok(!/radio-later|rescue-fit|rescue-off|Rescue line/.test(markup), `${kind}: the board shows no rescue`);
  session.leave();
  same(missionsOf(session.profile).rescue, stored, `${kind}: leaving does not fail a record the switch hides`);
  same(session.profile.credits, 2000, `${kind}: and costs nothing`);
}
console.log('PASS a stored rescue is hidden with the switch off');

// ---- The call rings, waits, is answered or goes to another crew -------------------
const ANSWER = {hiker: 'heli.radio.hiker.answer', avalanche: 'heli.radio.rescue.answer', hoist: 'heli.radio.rescue.answer', supply: 'heli.radio.supply.answer'};
const rows = rescueConditions({summitRun: false});
const hover = (session, seconds, until) => {
  const zone = session.view().zone;
  return note(run(session, seconds, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + 45}), until));
};
const fireOfSession = session => heliOf(session.profile).fire ?? null;
{
  const kinds = new Set();
  for (const name of ['Ann', 'Bo', 'Cy', 'Di', 'Ed', 'Flo', 'Gus', 'Hal']) {
    // Play day 30 is winter: no fire comes, so every call is a rescue.
    const session = newSession(readyProfile({count: 30, name}));
    session.start();
    const log = hover(session, 120, (v, got) => has(got, 'rescueCall'));
    const call = log.find(event => event.type === 'rescueCall');
    ok(call && !has(log, 'fireCall'), `${name}: a rescue rings in winter, never a fire`);
    kinds.add(call.kind);
    ok(rows[call.kind].includes(call.courseId), `${name}: ${call.kind} at ${call.courseId} is a course the packet allows`);
    ok(lines(log).includes(`heli.radio.${call.kind}.call`) && log.some(event => event.type === 'cue' && event.id === 'heli.fire.alert'), `${name}: the alert tone, then the call`);
    ok(log.findIndex(event => event.type === 'rescueCall') > log.findIndex(event => event.type === 'liftoff'), `${name}: the call comes mid-air`);
    const saved = missionsOf(session.profile).call;
    same([saved.kind, saved.courseId, saved.answered], [call.kind, call.courseId, false], `${name}: the call is saved, waiting`);
    same([!!fireOfSession(session), call.answerSeconds], [false, 20], `${name}: no fire starts, 20 seconds to answer`);
  }
  ok(kinds.size >= 3, `the winter calls are not all one kind (${[...kinds].join(', ')})`);
  // The same save rings the same call.
  const first = newSession(readyProfile({count: 3, name: 'Ann'})), again = newSession(readyProfile({count: 3, name: 'Ann'}));
  first.start(); again.start();
  const stop = (v, got) => has(got, 'rescueCall') || has(got, 'fireCall');
  const a = hover(first, 120, stop), b = hover(again, 120, stop);
  same(a.filter(event => /Call$/.test(event.type)), b.filter(event => /Call$/.test(event.type)), 'the same save rings the same call');
}

// The Radio box: Answer and Later, then the clock; R begins the rescue with its clock at 0.
for (const [kind, courseId] of [['hiker', 'tremblant-woods'], ['avalanche', 'tremblant-snow'], ['hoist', 'panorama-ridge'], ['supply', 'tremblant-snow']]) {
  const session = newSession(callProfile(kind, courseId, {count: 30}));
  session.start();
  const view = session.view();
  same([view.rescue.call.kind, view.rescue.call.courseId, view.rescue.active], [kind, courseId, null], `${kind}: the view shows the waiting call`);
  ok(view.rescue.call.courseName.length > 3, `${kind}: with the course name`);
  const box = dispatchBoardMarkup(view, {fire: {repairCost: 0}});
  ok(box.includes('data-heli-board="radio-answer"') && box.includes('data-heli-board="radio-later"') && box.includes(view.rescue.call.courseName), `${kind}: the Radio box has Answer and Later`);
  ok(!box.includes('Fire reported'), `${kind}: and does not call it a fire`);
  // Later: Roger understands; the call stays.
  const laterEvents = [];
  ok(handleBoardAction('radio-later', {heliSession: session, _heliEvents: got => laterEvents.push(...got)}), `${kind}: Later from the board`);
  ok(lines(laterEvents).includes('heli.radio.rescue.later') && has(laterEvents, 'rescueLater'), `${kind}: Roger says another crew will`);
  same(missionsOf(session.profile).call.answered, false, `${kind}: the call waits`);
  // R answers: the rescue begins.
  ok(session.pressRadio(), `${kind}: R answers`);
  const answered = note(session.takeEvents());
  ok(lines(answered).includes(ANSWER[kind]) && has(answered, 'rescueAnswered'), `${kind}: Roger or Sarah thank the pilot`);
  const saved = missionsOf(session.profile);
  same([saved.call.answered, saved.rescue.kind, saved.rescue.courseId, saved.rescue.clockSeconds, saved.rescue.stage, saved.rescue.crates, saved.rescue.condition],
    [true, kind, courseId, 0, 'fly', [0, 0, 0], 0], `${kind}: the record begins at clock 0, flying`);
  ok(saved.rescue.seed > 0, `${kind}: with its own seed`);
  same(session.pressRadio(), false, `${kind}: a second R does nothing`);
  same(session.declineCall(), false, `${kind}: and nothing is left to put off`);
  const active = session.view().rescue.active;
  same([active.kind, active.stage, active.clockSeconds, active.limit, active.left, active.orange, active.condition, active.dusk],
    [kind, 'fly', 0, RESCUE_CLOCKS[kind], RESCUE_CLOCKS[kind], false, 0, 0], `${kind}: the panel's clock, kind and stage`);
  const inHand = dispatchBoardMarkup(session.view(), {fire: {repairCost: 0}});
  ok(inHand.includes(active.courseName) && inHand.includes(`${Math.floor(RESCUE_CLOCKS[kind] / 60)}:00 left`) && !inHand.includes('radio-answer'),
    `${kind}: the Radio box shows the rescue in hand with ${Math.floor(RESCUE_CLOCKS[kind] / 60)}:00 left`);
  session.leave();
}

// A call nobody answers: another crew has it after 2 more flights, or the next play day.
{
  const session = newSession(callProfile('avalanche', 'tremblant-snow', {count: 30}));
  session.start();
  const zone = session.view().zone;
  // Lift off, land, and lift off again: the second further flight hands it on.
  const flight = () => {
    const up = run(session, 20, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + 6}), (v, got) => has(got, 'liftoff'));
    const down = run(session, 60, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y - 2}, {speed: 1, sink: 1.1}), v => v.heli.onGround && v.heli.y < zone.y + 1);
    return [...up, ...down];
  };
  const one = note(flight());
  same(missionsOf(session.profile).call.flights, 1, 'one more flight is counted at lift-off');
  ok(!has(one, 'rescueTaken'), 'still waiting after one');
  const two = note(flight());
  ok(has(two, 'rescueTaken') && lines(two).includes('heli.radio.rescue.taken'), 'after two it goes to another crew, and Roger says so');
  const m = missionsOf(session.profile);
  same([m.call, m.count, m.last, m.quiet.untilDay, m.quiet.engineSeconds > 1100], [null, 0, 'avalanche', heliOf(session.profile).playDay.count + 2, true],
    'no pay, no charge, and the quiet spell starts');
  same(session.profile.credits, 2000, 'and nothing is charged');
  ok(!session.view().rescue.call, 'the radio box is empty');
  session.leave();
}
{
  const taken = callDay => {
    const session = newSession(callProfile('hoist', 'panorama-ridge', {count: 7, callDay}));
    const log = note(session.start());
    return {log, m: missionsOf(session.profile)};
  };
  const stillThere = taken(6);
  ok(stillThere.m.call && !has(stillThere.log, 'rescueTaken'), 'a call from the day before is still waiting on the next play day');
  const gone = taken(5);
  ok(has(gone.log, 'rescueTaken') && gone.m.call === null && lines(gone.log).includes('heli.radio.rescue.taken'), 'two play days on it has gone to another crew');
  // A fire call is never given away.
  const base = readyProfile({count: 7});
  const fire = setMissions(base, {...missionsOf(base), call: {kind: 'fire', id: 'fire-1', courseId: 'tremblant-woods', day: 1, answered: false}}, on).profile;
  const kept = newSession(fire);
  kept.start();
  ok(missionsOf(kept.profile).call?.kind === 'fire', 'a fire call waits and grows');
}
console.log('PASS the call rings, waits, is answered or goes to another crew');

// ---- Each rescue flown by script, from the call to the pay -------------------------
// The call is already waiting (as it would be after ringing); R answers it.
function begin(kind, courseId, {fit = false, mode = 'assisted', ...options} = {}) {
  const session = newSession(callProfile(kind, courseId, options), {mode});
  const log = [...session.start()];
  ok(session.pressRadio(), `${kind}: R answers the waiting call`);
  log.push(...note(session.takeEvents()));
  if (fit) {
    same(session.fitRescueLine(), {ok: true}, `${kind}: the rescue line is fitted at the pad`);
    log.push(...note(session.takeEvents()));
  }
  return {session, log};
}
// Out of the flying area toward another course, then the cruise leg; the autopilot is left off on arrival.
function cruiseTo(session, courseId, {manual = null} = {}) {
  const events = [];
  session.setDestination(courseId);
  if (manual) {
    const from = session.view().heli, dir = bearing(session.view().courseId, courseId), far = {x: from.x + dir.x * 4000, z: from.z + dir.z * 4000};
    const top = legHeight(manual, from, far, 35);
    events.push(...run(session, 60, v => pilot(v, {x: from.x, z: from.z, y: top}, {speed: 1}), v => v.heli.y > top - 3));
    events.push(...run(session, 300, v => pilot(v, {x: far.x, z: far.z, y: top}, {speed: 28}), v => v.cruiseOffered));
  } else {
    ok(session.pressAutopilot(), 'the autopilot flies to the edge of the area');
    events.push(...run(session, 400, () => ({}), v => v.cruiseOffered));
  }
  ok(session.view().cruiseOffered, 'the cruise leg is offered');
  ok(session.acceptCruise(), 'and taken');
  events.push(...run(session, 3, () => ({})));
  if (session.autopilotOn) session.pressAutopilot();
  return note(events);
}
// Over a spot, steady, then down until the rescuer rests there; hold until clipped.
function lowerRescuer(session, world, spot) {
  const gy = world.ground.height(spot.x, spot.z), events = [];
  events.push(...travel(session, world, spot, gy + 40, {speed: 19, margin: 40}));
  events.push(...run(session, 20, v => pilot(v, {x: spot.x, z: spot.z, y: gy + 40}, {speed: 1}), v => speedOf(v) < 0.3));
  // Down quickly until the rescuer is a few metres up, then gently; the helicopter stays over the rescuer.
  const onSpot = (v, y, sink) => { const l = v.rescue.line; return pilot(v, {x: spot.x - (l.x - v.heli.x), z: spot.z - (l.z - v.heli.z), y}, {speed: 3, sink}); };
  const height = v => v.rescue.line.y - world.ground.height(v.rescue.line.x, v.rescue.line.z);
  events.push(...run(session, 120, v => onSpot(v, v.heli.y - 3, height(v) > 5 ? 3 : 0.7), (v, got) => has(got, 'holdStarted')));
  events.push(...run(session, 40, v => onSpot(v, v.heli.y, 0.3), (v, got) => has(got, 'clipped')));
  return note(events);
}
// Lift the pair gently (straight up from where they are), carry them to a landing circle, let them swing still, and set them down.
function carryPair(session, world, zone) {
  const events = [];
  const base = session.view().heli.y;
  events.push(...run(session, 60, v => pilot(v, {x: v.rescue.line.x, z: v.rescue.line.z, y: base + 35}, {speed: 1, sink: 2.5}), v => v.heli.y > base + 30));
  events.push(...travel(session, world, zone, zone.y + 40, {speed: 19, margin: 40}));
  events.push(...run(session, 10, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + 40}, {speed: 1}), () => false));
  const aboveRing = v => v.rescue.line.y - world.ground.height(v.rescue.line.x, v.rescue.line.z);
  events.push(...run(session, 120, v => pilot(v, {x: zone.x, z: zone.z, y: v.heli.y - 3}, {speed: 2, sink: aboveRing(v) > 6 ? 3 : 0.5}),
    (v, got) => has(got, 'rescueDone') || has(got, 'rescueFailed')));
  return note(events);
}
const PAY = {hiker: 1000, avalanche: 1200, hoist: 1200};
const profileOf = session => missionsOf(session.profile);

// Into the nearest tree: the rotor strikes it, which is a crash in any mode.
function crashFromHeight(session) {
  const h = session.view().heli, courseId = session.view().courseId;
  const world = courseId === 'tremblant-woods' ? home : courseId === 'tremblant-snow' ? snow : ridge;
  const tall = world.ground.near(h.x, h.z, 400).filter(o => o.kind === 'tree' && o.top > h.y + 5);
  const tree = tall.sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z))[0];
  return note(run(session, 120, v => pilot(v, {x: tree.x, z: tree.z, y: tree.top - 2}, {speed: 8}), (v, got) => has(got, 'crashed')));
}
// A lost hiker: spotted by the flare, picked up in the clearing, handed over at the pad.
function flyHiker({wait = 0, waitSteps = 0, name = 'Rescue QA', stepLog = null, mode = 'assisted', crashAboard = false, searchPattern = false} = {}) {
  const {session, log} = begin('hiker', 'tremblant-woods', {name, mode});
  if (stepLog) {
    const original = session.step;
    session.step = (...args) => { const got = original(...args); stepLog.push(got); return got; };
  }
  const r = profileOf(session).rescue, pick = pickHiker(hikerSpots(home.course, home.ground, homeSite), r.seed);
  const gy = (x, z) => home.ground.height(x, z);
  const searching = session.view().rescue.active;
  ok(searching.target.radius === 180 && searching.sites.hiker === null && searching.stage === 'fly', 'the search area is a 180 m circle, the hiker not found yet');
  if (searchPattern) {
    // Evidence flight: search only from the last-seen circle, without the hidden hiker position.
    const centre = searching.sites.lastSeen;
    search: for (let row = 0; row < 3; row++) {
      const z = centre.z - 120 + row * 120;
      for (let column = 0; column <= 6; column++) {
        const x = centre.x + (row % 2 ? 180 - column * 60 : -180 + column * 60);
        log.push(...note(travel(session, home, {x, z}, gy(x, z) + 60, {speed: 18})));
        if (session.view().rescue.active?.sites.hiker) break search;
      }
    }
  } else {
  log.push(...note(travel(session, home, pick.hiker, gy(pick.hiker.x, pick.hiker.z) + 60)));
  }
  const found = session.view().rescue.active;
  ok(has(log, 'hikerSpotted') && found.stage === 'found' && found.sites.hiker, 'passing over them lights the flare: found');
  log.push(...note(travel(session, home, pick.clearing, gy(pick.clearing.x, pick.clearing.z) + 30, {land: true})));
  ok(session.view().heli.onGround, 'landed in the clearing');
  log.push(...note(run(session, 150, () => ({}), (v, got) => has(got, 'hikerAboard'))));
  ok(has(log, 'hikerAboard') && session.view().rescue.active.stage === 'carry', 'the hiker walks over and climbs in');
  const aboardClock = session.view().rescue.active.clockSeconds, carrying = session.view().rescue.active.target;
  ok(carrying && Math.hypot(carrying.x - homeSite.zone.x, carrying.z - homeSite.zone.z) < 1e-6, 'carrying them, the panel points at the pad');
  if (crashAboard) { log.push(...crashFromHeight(session)); return {session, log, aboardClock}; }
  if (wait) log.push(...note(run(session, wait, () => ({}), null, 0.05)));
  for (let i = 0; i < waitSteps; i++) log.push(...note(session.step({})));
  log.push(...note(travel(session, home, homeSite.zone, homeSite.zone.y + 30, {land: true})));
  return {session, log, aboardClock};
}
{
  const {session, log, aboardClock} = flyHiker();
  const done = log.find(event => event.type === 'rescueDone');
  ok(done, 'the hiker is handed to the paramedics at the pad');
  same([done.kind, done.paid, done.condition, done.look, done.firstBadge, done.rescued], ['hiker', 2650, 0, 'walk', true, 1], 'unhurt: 2,650 credits (HELI-PAY-CONTINUE, was 1,000), they walk, the badge');
  ok(lines(log).includes('heli.radio.hiker.spotted') && lines(log).includes('heli.radio.rescue.done') && log.some(e => e.type === 'cue' && e.id === 'heli.flare')
    && log.some(e => e.type === 'cue' && e.id === 'heli.badge'), 'Sarah, the flare, Roger and the badge chime');
  ok(aboardClock < 600, `picked up with time to spare (clock ${aboardClock.toFixed(0)} s)`);
  const m = profileOf(session);
  same([session.profile.credits, m.searches, m.rescued, m.badges, m.rescue, m.call, m.last, m.count], [4650, 1, 1, ['rescue'], null, null, 'hiker', 0],
    'the save: paid, one search, one person, the badge, nothing in hand');
  ok(m.quiet.untilDay === heliOf(session.profile).playDay.count + 2 && m.quiet.engineSeconds > 1100, 'and the quiet spell begins');
  same(session.view().rescue.active, null, 'the panel has no rescue left');
  finishReport(session, log);
  const again = flyHiker();
  same([JSON.stringify(again.log), JSON.stringify(heliOf(again.session.profile))], [JSON.stringify(log), JSON.stringify(heliOf(session.profile))],
    'the same save flies the same rescue');
  session.leave();
  same(session.profile.credits, 4650, 'leaving afterwards costs nothing');
}
{
  // Waiting aboard past two thirds of 15 minutes: they get cold, are hurt, and pay 60%.
  const {session, log} = flyHiker({wait: 330, name: 'Rescue QA'});
  const done = log.find(event => event.type === 'rescueDone');
  ok(done && lines(log).includes('heli.radio.rescue.cold'), 'the clock passes two thirds: Roger says they are getting cold');
  same([done.paid, done.condition, done.look], [1590, 1, 'limp'], 'hurt: 1,590 credits (60% of 2,650) and they limp');
  ok(lines(log).includes('heli.radio.rescue.hurt'), 'Roger says they are hurt but will be all right');
  same(session.profile.credits, 3590, 'the save agrees');
}
console.log('PASS a lost hiker is found, picked up and handed over');

// The avalanche and the hoist rescue: the rescuer on the line is lowered to the casualty, held, clipped on and carried.
const SHARE = [1, 0.6, 0.25];
const ridgeSite = courseSite(ridge.course, ridge.ground, 'panorama-ridge');
function flyLine(kind, courseId, world, zone, {manual = null} = {}) {
  const {session, log} = begin(kind, courseId, {fit: true});
  const pad = session.view();
  same([pad.rescue.line.who, pad.rescue.line.condition, pad.rescue.line.done], ['rescuer', 'unhurt', false], `${kind}: the rescuer waits on the line at the pad`);
  ok(lines(log).includes('heli.radio.line.first'), `${kind}: Brian talks the first fitting through`);
  ok(!pad.loads.some(load => load.id === 'rescue') && pad.loads.length === 1, `${kind}: the rescuer is never drawn as a car`);
  same([session.pressHook(), session.fitBucket().ok, session.fitRescueLine()], [null, false, {ok: true, already: true}], `${kind}: H does nothing with the line on, no bucket, no second fitting`);
  const r = profileOf(session).rescue, atTarget = kind === 'avalanche'
    ? pickSlide(slideSpots(world.course, world.ground), r.seed, world.ground).beacon : pickHoist(hoistSpots(world.course, world.ground), r.seed, world.ground).driver;
  log.push(...cruiseTo(session, courseId, {manual}));
  ok(session.view().courseId === courseId && session.view().rescue.active.here, `${kind}: across the cruise leg, line and all`);
  const arrival = session.view().rescue.active;
  ok(arrival.clockSeconds > 40 && arrival.stage === 'fly' && (kind !== 'avalanche' || arrival.signal.heard === false), `${kind}: still flying, the clock running (${arrival.clockSeconds.toFixed(0)} s), no signal yet`);
  log.push(...lowerRescuer(session, world, atTarget));
  const clipped = session.view();
  ok(has(log, 'holdStarted') && has(log, 'holdDone') && has(log, 'clipped'), `${kind}: set down beside them, held, clipped on`);
  same([clipped.rescue.active.stage, clipped.rescue.line.who], ['carry', 'pair'], `${kind}: carrying two`);
  ok(lines(log).includes('heli.radio.line.setdown') && lines(log).includes('heli.radio.rescue.clipped') && log.some(e => e.type === 'cue' && e.id === 'heli.rescue.clip'),
    `${kind}: Brian, Roger and the clip`);
  log.push(...carryPair(session, world, zone));
  finishReport(session, log);
  return {session, log, atTarget, r};
}
{
  const {session, log, atTarget} = flyLine('avalanche', 'tremblant-snow', snow, snowSite.zone);
  const done = log.find(event => event.type === 'rescueDone');
  ok(done, 'the skier is handed to the paramedics at the ski patrol landing zone');
  same([done.condition, done.paid, done.look], [0, 3000, 'walk'], 'avalanche: carried gently and in time, unhurt: 3,000 credits (was 1,200)');
  ok(!has(log, 'rescueFast'), 'the autopilot holds the line speed, so Roger never says slow down');
  const beeps = log.filter(event => event.type === 'cue' && event.id === 'heli.beacon.beep');
  ok(beeps.length > 5 && beeps.every(beep => beep.pitch >= 900 && beep.pitch <= 1400), `the beacon beeps (${beeps.length}) between 900 and 1,400 Hz`);
  ok(lines(log).filter(line => line === 'heli.radio.beacon.signal').length === 1, 'Roger says "you have a signal" once');
  ok(log.some(event => event.type === 'cue' && event.id === 'heli.snow.dig') && log.filter(e => e.type === 'holdStarted')[0].seconds === 12, 'the dig takes 12 seconds');
  const m = profileOf(session);
  same([m.searches, m.rescued, m.badges, m.rescue, m.hoists, m.wreck], [1, 1, ['rescue'], null, undefined, undefined], 'the save: one search, one person, the badge');
  ok(session.profile.credits === 2000 + done.paid, 'and the pay');
  ok(atTarget.x !== undefined, 'the beacon was a seeded point');
}
console.log('PASS an avalanche beacon search is flown');
{
  const {session, log} = flyLine('hoist', 'panorama-ridge', ridge, ridgeSite.zone, {manual: home});
  const done = log.find(event => event.type === 'rescueDone');
  ok(done, 'the driver is handed to the paramedics at Panorama Ridge');
  // The cruise leg from the Woods takes a third of the 12 minutes, so the driver is cold before the pad: hurt, 60%.
  ok(lines(log).includes('heli.radio.rescue.cold') && lines(log).includes('heli.radio.rescue.hurt'), 'hoist: Roger says they are getting cold, then that they are hurt');
  same([done.condition, done.paid, done.look], [1, Math.round(3000 * SHARE[1]), 'limp'], 'hoist: hurt, so 1,800 credits (60% of 3,000; was 720)');
  ok(log.filter(e => e.type === 'holdStarted')[0].seconds === 8, 'strapping the driver in takes 8 seconds');
  const m = profileOf(session);
  same([m.hoists, m.rescued, m.badges, m.rescue, m.searches], [1, 1, ['rescue'], null, undefined], 'the save: one hoist rescue, one person, the badge');
  ok(m.wreck && m.wreck.courseId === 'panorama-ridge' && m.wreck.day === heliOf(session.profile).playDay.count, 'the driver car stays on the slope for the recovery job');
}
console.log('PASS a hoist rescue is flown');

// The supply run: three crates from the home pad to the yard by Tremblant Snow's lodge.
const yard = supplyYard(snow.course, snow.ground);
const crateSpot = crateSpots(home.course, home.ground, homeSite.zone);
const CRATE_NAMES = ['food', 'medicine', 'fuel'];
function flySupply({crates = 3, name = 'Rescue QA'} = {}) {
  const {session, log} = begin('supply', 'tremblant-snow', {name});
  const start = session.view();
  same(start.rescue.crates.map(crate => crate.id), CRATE_NAMES, 'supply: three crates wait at the pad');
  same(start.rescue.crates.map(crate => [Math.round(crate.x), Math.round(crate.z)]), crateSpot.map(spot => [Math.round(spot.x), Math.round(spot.z)]), 'supply: at the packet pad spots');
  same(start.loads.map(load => load.id), ['falcone_f42'], 'supply: and are never drawn as cars');
  const climb = () => {
    const lift = session.view().heli.y;
    log.push(...run(session, 60, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: lift + 35}, {speed: 1, sink: 1.5}), v => v.heli.y > lift + 30));
  };
  const hookCrate = i => {
    const spot = crateSpot[i], hy = home.ground.height(spot.x, spot.z) + 0.7 + 15.3;
    log.push(...note(travel(session, home, spot, hy, {speed: 28, margin: 20})));
    log.push(...run(session, 30, v => pilot(v, {x: spot.x, z: spot.z, y: hy}, {speed: 1, sink: 0.5}), v => speedOf(v) < 0.3 && Math.abs(v.heli.y - hy) < 0.3));
    const hooked = session.pressHook();
    log.push(...note(session.takeEvents()));
    ok(hooked?.type === 'hooked' && hooked.id === CRATE_NAMES[i], `supply: crate ${i + 1} is hooked`);
    log.push(...run(session, 2, () => ({})));
    ok(session.view().rescue.active.crates[i] === 1 && session.view().rescue.active.stage === 'carry', `supply: crate ${i + 1} is on the line (carrying)`);
  };
  const deliver = i => {
    climb();
    log.push(...cruiseTo(session, 'tremblant-snow', {manual: home}));
    const gy = snow.ground.height(yard.x, yard.z);
    log.push(...note(travel(session, snow, yard, gy + 40, {speed: 28, margin: 30})));
    const crate = () => session.view().rescue.crates.find(c => c.hooked);
    log.push(...run(session, 90, v => pilot(v, {x: yard.x - (crate().x - v.heli.x), z: yard.z - (crate().z - v.heli.z), y: v.heli.y - 3}, {speed: 1.5, sink: crate().y - gy > 8 ? 4 : 0.6}),
      () => crate().y < gy + 1.0));
    const released = session.pressHook();
    log.push(...note(session.takeEvents()));
    ok(released?.type === 'released' && released.dropMetres === 0, `supply: crate ${i + 1} is let go on the ground`);
    log.push(...run(session, 8, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.heli.y + 12}, {speed: 1, sink: 3})));
  };
  for (let i = 0; i < crates; i++) {
    if (i > 0) {
      climb();
      log.push(...cruiseTo(session, 'tremblant-woods', {manual: snow}));
      if (session.view().heli.fuelKg < 230) {
        log.push(...note(travel(session, home, homeSite.zone, homeSite.zone.y + 30, {speed: 28, margin: 20, land: true})));
        ok(session.buyFuel(Infinity).ok, 'supply: the tank is filled at the pump between trips');
        log.push(...note(session.takeEvents()));
      }
    }
    hookCrate(i);
    deliver(i);
  }
  return {session, log};
}
{
  const {session, log} = flySupply();
  finishReport(session, log);
  const downs = log.filter(event => event.type === 'crateDown');
  same(downs.map(event => [event.id, event.pay]), [['food', 1250], ['medicine', 1250], ['fuel', 1250]], 'supply: each crate set down in the yard pays 1,250 (was 300)');
  const done = log.find(event => event.type === 'rescueDone');
  ok(done, 'supply: the last crate finishes the run');
  same([done.kind, done.paid, done.look, done.firstBadge], ['supply', 4150, null, false], 'supply: 4,150 credits in all, 400 more for all three (was 1,000 and 100), no person and no badge');
  ok(lines(log).filter(line => line === 'heli.radio.supply.crate').length === 2 && lines(log).includes('heli.radio.supply.done'), 'supply: Roger thanks them for the first two, then for everything');
  const m = profileOf(session);
  same([m.supplies, m.rescued, m.badges, m.rescue, m.call, m.last], [1, undefined, [], null, null, 'supply'], 'supply: the save counts one supply run and no person');
  const spent = log.filter(event => event.type === 'charged').reduce((sum, event) => sum + event.charged, 0)
    + log.filter(event => event.type === 'fuelBought').reduce((sum, event) => sum + event.cost, 0);
  same(session.profile.credits, 2000 + 4150 - spent, `supply: the pay less the fuel and any repairs (${spent}) is in the save`);
  ok(session.view().rescue.crates.length === 0, 'supply: the crates are gone from the view');
}
{
  // Leaving with one crate down: that crate pays, the call-out costs 200, the tally stays at 0.
  const {session, log} = flySupply({crates: 1});
  ok(has(log, 'crateDown') && !has(log, 'rescueDone'), 'supply: one crate is down, the run is not over');
  const credits = session.profile.credits;
  session.leave();
  const events = session.takeEvents(), left = events.find(event => event.type === 'rescueFailed');
  same([left.reason, left.cratePaid, left.charged], ['left', 1250, 200], 'supply: leaving fails the run: the crate pays 1,250, the snowcat costs 200');
  same(session.profile.credits, credits + 1250 - 200, 'supply: and the save agrees');
  same(lines(events), ['heli.radio.supply.late'], 'supply: the lodge sent a snowcat');
  same([profileOf(session).rescue, profileOf(session).supplies, profileOf(session).last], [null, undefined, 'supply'], 'supply: no rescue in hand, no tally to drop below zero');
}
console.log('PASS the supply run is flown');

// ---- The clock runs out: failure, and the same result at any frame rate ------------
// The helicopter sits on the pad with the hiker still lost; every step is `dt` long.
function idleOut(dt, {name = 'Rescue QA'} = {}) {
  const {session, log} = begin('hiker', 'tremblant-woods', {name});
  const events = [...log], ticks = [];
  let t = 0, failedAt = null, coldAt = null, steps = 0;
  while (t < 1000 && failedAt === null) {
    const got = session.step({}, dt);
    t += dt; steps++;
    events.push(...note(got));
    if (coldAt === null && lines(got).includes('heli.radio.rescue.cold')) coldAt = t;
    if (got.some(event => event.type === 'cue' && event.id === 'heli.clock.tick')) ticks.push(t);
    if (has(got, 'rescueFailed')) failedAt = t;
  }
  return {session, events, failedAt, coldAt, ticks, steps};
}
{
  const out = idleOut(1 / 120);
  const failed = out.events.find(event => event.type === 'rescueFailed');
  ok(failed && out.failedAt >= 900 - 1e-6 && out.failedAt < 900 + 0.02, `time runs out at 15 minutes (${out.failedAt.toFixed(3)} s)`);
  same([failed.kind, failed.reason, failed.charged, failed.forgiven, failed.crashRepair], ['hiker', 'time', 400, 0, false], 'the ground team costs 400 credits');
  near(out.coldAt, 600, 0.02, 'they get cold at two thirds (10 minutes)');
  ok(lines(out.events).filter(line => line === 'heli.radio.rescue.cold').length === 1, 'and Roger says so once');
  ok(lines(out.events).includes('heli.radio.hiker.dusk') && lines(out.events).at(-1) === 'heli.radio.rescue.late', 'Sarah says it is getting dark; at the end Roger says the ground team got there first');
  ok(out.ticks.length >= 58 && out.ticks.length <= 62, `a tick a second in the last minute (${out.ticks.length})`);
  const m = profileOf(out.session);
  same([out.session.profile.credits, m.rescue, m.call, m.last, m.searches, m.rescued, m.badges, m.count], [1600, null, null, 'hiker', undefined, undefined, [], 0],
    'the save: 400 taken, nothing paid, no tally to drop, the mission over');
  ok(m.quiet.untilDay === heliOf(out.session.profile).playDay.count + 2 && m.quiet.engineSeconds > 1100, 'the quiet spell begins');
  same(out.session.view().rescue.active, null, 'nothing left on the panel');
  ok(!has(out.events, 'rescueDone'), 'and nothing is paid');
}
{
  // A hiker count that was 3 drops by one for the failure (never below zero).
  const profile = callProfile('hiker', 'tremblant-woods');
  const withTally = setMissions(profile, {...missionsOf(profile), searches: 3}, on).profile;
  const session = newSession(withTally);
  session.start(); session.pressRadio();
  let events = [];
  for (let i = 0; i < 900 * 6 && !has(events, 'rescueFailed'); i++) events = session.step({}, 1 / 6);
  same(missionsOf(session.profile).searches, 2, 'a failed search drops the searches tally by one');
}
{
  // The same results at 30, 60, 120 and 144 steps a second.
  const runs = [30, 60, 120, 144].map(rate => ({rate, ...idleOut(1 / rate)}));
  const [base] = runs;
  for (const out of runs) {
    same(JSON.stringify(heliOf(out.session.profile)), JSON.stringify(heliOf(base.session.profile)), `${out.rate} steps a second: the same save`);
    same(out.events.filter(event => event.type !== 'cue').map(event => event.type + (event.line ?? '')), base.events.filter(event => event.type !== 'cue').map(event => event.type + (event.line ?? '')),
      `${out.rate} steps a second: the same things happen in the same order`);
    near(out.failedAt, 900, 1 / out.rate + 1e-6, `${out.rate} steps a second: out of time within a step of 15 minutes`);
    near(out.coldAt, 600, 1 / out.rate + 1e-6, `${out.rate} steps a second: cold within a step of 10 minutes`);
    ok(Math.abs(out.ticks.length - 60) <= 2, `${out.rate} steps a second: about a tick a second (${out.ticks.length})`);
  }
}
console.log('PASS the clock runs out the same way at any frame rate');

// ---- A frame that sees both the clock running out and a handover: the failure comes first
// The hiker waits aboard for a chosen number of steps, so the touchdown at the pad can be put on
// the very step where the 15 minutes end, one step before, or one step after.
function handoverProbe(waitSteps) {
  const stepLog = [];
  const out = flyHiker({waitSteps, stepLog});
  const at = type => stepLog.findIndex(got => got.some(event => event.type === type));
  const touchStep = stepLog.map((got, index) => got.some(event => event.type === 'touchdown') ? index : -1).filter(index => index >= 0).at(-1);
  return {...out, stepLog, doneStep: at('rescueDone'), failedStep: at('rescueFailed'), touchStep, waitSteps};
}
{
  // The wait that lands the final touchdown on the last step of the clock: found by moving it
  // by what is left over each time (a lighter tank lifts and lands a little quicker).
  const idle = idleOut(1 / 120), lastStep = idle.steps - 1;
  let probe = handoverProbe(0);
  ok(probe.doneStep > 0, 'the hiker flown with no waiting is handed over');
  for (let round = 0; round < 6 && probe.touchStep !== lastStep; round++) probe = handoverProbe(probe.waitSteps + lastStep - probe.touchStep);
  ok(probe.touchStep === lastStep, `a wait of ${probe.waitSteps} steps puts the touchdown on step ${lastStep}, the last step of the 15 minutes`);
  ok(probe.failedStep === lastStep && !has(probe.log, 'rescueDone'), 'in that step the clock fails the rescue, and nothing is paid');
  const failedEvent = probe.stepLog[probe.failedStep].find(event => event.type === 'rescueFailed');
  same([failedEvent.reason, probe.session.profile.credits], ['time', 1600], 'out of time: 400 credits, no pay');
  const earlier = handoverProbe(probe.waitSteps - 1), later = handoverProbe(probe.waitSteps + 1);
  ok(earlier.touchStep < lastStep && earlier.doneStep === earlier.touchStep && earlier.failedStep < 0, `touchdown at step ${earlier.touchStep}, before the end: the handover is paid`);
  ok(later.touchStep > lastStep && later.failedStep === lastStep && !has(later.log, 'rescueDone'), `touchdown at step ${later.touchStep}, after the end: failed already`);
}
console.log('PASS the clock fails the rescue first when a handover shares its step');

// ---- A crash, leaving, and a rescue found stored -------------------------------------
// A crash fails a rescue only with people aboard or on the line (section 3.4).
{
  // Before the pickup the rescue goes on; H1's crash repair is the only cost.
  const {session} = begin('hiker', 'tremblant-woods', {});
  const before = profileOf(session).rescue;
  const fall = crashFromHeight(session);
  ok(has(fall, 'crashed') && !has(fall, 'rescueFailed'), 'a crash before the pickup does not fail the rescue');
  same(session.profile.credits, 2000 - 800, 'only the crash repair (800) is taken');
  note(run(session, 4, () => ({})));
  const after = session.view();
  ok(after.phase === 'flying' && after.courseId === 'tremblant-woods' && after.heli.onGround, 'back at the pad');
  same([after.rescue.active.kind, after.rescue.active.stage, profileOf(session).call.answered], ['hiker', 'fly', true], 'the hiker is still waiting and the call is answered');
  ok(after.rescue.active.clockSeconds > before.clockSeconds && profileOf(session).rescue.seed === before.seed, 'the clock goes on, the same rescue');
}
{
  // The same crash with the hiker aboard fails it: the crash repair (800) and the call-out (400).
  const {session, log} = flyHiker({crashAboard: true});
  const failed = log.find(event => event.type === 'rescueFailed');
  ok(has(log, 'hikerAboard') && has(log, 'crashed') && failed, 'a crash with the hiker aboard fails the rescue');
  same([failed.reason, failed.charged, failed.crashRepair], ['crash', 400, true], 'out of the 400 for the ground team; the crash repair is the session own');
  same(session.profile.credits, 2000 - 800 - 400, 'the crash repair (800) and the call-out (400) are both taken');
  ok(lines(log).includes('heli.radio.rescue.late'), 'Roger says the ground team got there first');
  same([profileOf(session).rescue, profileOf(session).call, profileOf(session).searches], [null, null, undefined], 'nothing in hand, no pay');
  note(run(session, 4, () => ({})));
  ok(session.view().phase === 'flying' && session.view().courseId === 'tremblant-woods', 'and back at the pad after the crash');
  same(session.view().rescue.active, null, 'with no rescue on the panel');
}
{
  // The rescuer on the line is a person on the line.
  const {session, log} = begin('avalanche', 'tremblant-snow', {fit: true});
  const fall = crashFromHeight(session);
  const failed = fall.find(event => event.type === 'rescueFailed');
  ok(has(fall, 'crashed') && failed && failed.reason === 'crash', 'a crash with the rescuer on the line fails the rescue');
  same(session.profile.credits, 2000 - 800 - 400, 'and costs both');
  ok(log.length > 0, 'the line was fitted first');
}
{
  // A supply run has no people: a crash with a crate on the line only costs the repair, and the crate is back at the pad.
  const {session} = begin('supply', 'tremblant-snow', {});
  const fall = crashFromHeight(session);
  ok(has(fall, 'crashed') && !has(fall, 'rescueFailed'), 'a crash on a supply run does not fail it');
  note(run(session, 4, () => ({})));
  same([session.profile.credits, session.view().rescue.crates.map(crate => crate.id)], [2000 - 800, ['food', 'medicine', 'fuel']], 'the crates wait at the pad again');
}
for (const [kind, courseId] of [['hoist', 'panorama-ridge'], ['avalanche', 'tremblant-snow']]) {
  const {session} = begin(kind, courseId, {fit: true});
  const left = session.leave();
  const failed = session.takeEvents().find(event => event.type === 'rescueFailed');
  same([failed.kind, failed.reason, failed.charged, left.credits], [kind, 'left', 400, 1600], `${kind}: leaving the helicopter with the rescue in hand fails it`);
  same([missionsOf(left).rescue, missionsOf(left).call, missionsOf(left).last], [null, null, kind], `${kind}: and ends the mission`);
  session.leave();
  same(session.profile.credits, 1600, `${kind}: leaving twice charges once`);
}
{
  // The app closed with a rescue in hand: the next visit finds it stored and fails it.
  const base = callProfile('avalanche', 'tremblant-snow');
  const stored = {kind: 'avalanche', id: 'avalanche-1', courseId: 'tremblant-snow', seed: 77, clockSeconds: 200, stage: 'hold', crates: [0, 0, 0], condition: 1};
  const profile = setMissions(base, {...missionsOf(base), call: {kind: 'avalanche', id: 'avalanche-1', courseId: 'tremblant-snow', day: 5, answered: true}, rescue: stored}, on).profile;
  const session = newSession(profile);
  const log = note(session.start());
  const failed = log.find(event => event.type === 'rescueFailed');
  same([failed.reason, failed.charged, session.profile.credits, lines(log).includes('heli.radio.rescue.late')], ['left', 400, 1600, true], 'a stored rescue cannot be resumed: it fails on the next visit');
  same([profileOf(session).rescue, profileOf(session).call], [null, null], 'and the mission is over');
}
console.log('PASS a crash, leaving or a stored rescue fails it');

// ---- The rescue line at the pad, H, and the board ---------------------------------------
{
  const session = newSession(readyProfile({count: 3}));
  session.start();
  const first = session.view();
  ok(first.rescue.line === null && first.rescue.active === null && first.rescue.call === null, 'no line, no rescue, no call');
  let markup = dispatchBoardMarkup(first, {fire: {repairCost: 0}});
  ok(markup.includes('data-heli-board="rescue-fit"') && markup.includes('Fit the rescue line') && !markup.includes('rescue-off'), 'on the pad the board offers to fit the line');
  const events = [];
  const app = {heliSession: session, _heliEvents: got => events.push(...got)};
  same(handleBoardAction('rescue-fit', app), {ok: true}, 'Fit the rescue line from the board');
  ok(lines(events).includes('heli.radio.line.first') && has(events, 'rescueLineFitted'), 'Brian talks it through the first time');
  const fitted = session.view();
  same([fitted.rescue.line.who, fitted.rescue.line.condition, fitted.rescue.line.holding, fitted.loads.map(load => load.id)], ['rescuer', 'unhurt', false, ['falcone_f42']], 'the line is in the view, not among the cars');
  markup = dispatchBoardMarkup(fitted, {fire: {repairCost: 0}});
  ok(markup.includes('data-heli-board="rescue-off"') && markup.includes('Rescue line: rescuer aboard') && !markup.includes('data-heli-board="rescue-fit"'), 'the board offers to take it off');
  same(session.fitBucket(), {ok: false, reason: 'Take off the rescue line first.'}, 'one fitting at a time: no bucket with the line on');
  same(session.pressHook(), null, 'H does nothing while a rescuer is on the line');
  same(handleBoardAction('rescue-off', app), {ok: true}, 'Take off the rescue line from the board');
  same(session.view().rescue.line, null, 'the line is gone');
  events.length = 0;
  handleBoardAction('rescue-fit', app);
  ok(!lines(events).includes('heli.radio.line.first'), 'Brian does not repeat himself');
  session.takeOffRescueLine();
  // Not away from the pad, and not with a bucket on.
  ok(session.fitBucket().ok, 'the bucket can go on once the line is off');
  same(session.fitRescueLine(), {ok: false, reason: 'Take off the bucket first.'}, 'and then no line');
  const zone = session.view().zone;
  session.takeOffBucket();
  run(session, 20, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + 30}), v => v.heli.y > zone.y + 20);
  same(session.fitRescueLine(), {ok: false, reason: 'The rescue line is at the home pad.'}, 'the line is fitted only on the pad ground');
  ok(!dispatchBoardMarkup(session.view(), {fire: {repairCost: 0}}).includes('Rescue line'), 'and the board offers it only there');
  session.leave();
  same(session.profile.credits, 2000, 'a line fitted and taken off costs nothing');
}

// Every radio line the session said is one of the 70 recorded lines.
ok(seen.size > 20, `the flights said ${seen.size} different lines`);
for (const line of seen) ok(HELI_RADIO_LINES[line], `${line} is a recorded line`);
// The car left on the slope shows with the day's jobs.
{
  const base = readyProfile({count: 7});
  const wreck = {courseId: 'panorama-ridge', carId: 'falcone_f42', x: 100, z: 200, day: 6};
  const profile = setMissions(base, {...missionsOf(base), wreck}, on).profile;
  const session = newSession(profile);
  session.start();
  const recovery = session.boardJobs().find(job => job.recovery);
  ok(recovery && recovery.pay === 2300 && recovery.title.startsWith('Recover the ') && recovery.title.endsWith('from Panorama Ridge'), 'the recovery job is on the board for 2,300 credits');
  const markup = dispatchBoardMarkup(session.view(), {jobs: session.boardJobs(), fire: {repairCost: 0}});
  ok(markup.includes(recovery.title) && markup.includes('Pays 2,300 credits, +600 for a clean delivery') && markup.includes('Hook the car on the slope') && markup.includes('Pick up at Panorama Ridge'), 'and the board shows it with the others');
  ok(markup.includes('take:w6'), 'with a Take button (RESCUE-AUTOPILOT; it had none before)');
  const off = newSession(profile, {rescue: false});
  off.start();
  ok(!off.boardJobs().some(job => job.recovery), 'with the switch off it is not on the board');
  const late = setMissions(base, {...missionsOf(base), wreck: {...wreck, day: 2}}, on).profile;
  const gone = newSession(late);
  gone.start();
  ok(!gone.boardJobs().some(job => job.recovery), 'and it leaves after 3 play days');
}
console.log('PASS the line, H, the board and every line spoken');

// ---- The app passes the switch and the beacon's pitch -----------------------------------
{
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const memory = new Map();
  const storage = {getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)),
    removeItem: key => memory.delete(key), key: index => [...memory.keys()][index] ?? null, get length() { return memory.size; }};
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: storage});
  try {
    const visit = overrides => {
      const app = new App();
      app.duel.featureFlags = raceFeatureFlags(createFeatureFlags({storage, overrides: {helicopter: true, ...overrides}, qa: true}), () => app.duel.state);
      ok(app.visitHeli(), 'the helicopter visit starts');
      return app;
    };
    const on = visit({'forest-fire': true, rescue: true}), noRescue = visit({'forest-fire': true, rescue: false}), noFire = visit({'forest-fire': false, rescue: true});
    ok('rescue' in on.heliSession.view(), 'switches helicopter, forest-fire and rescue on: the session has rescues');
    ok(!('rescue' in noRescue.heliSession.view()), 'rescue off: the session is the fire session');
    ok(!('rescue' in noFire.heliSession.view()), 'forest-fire off: no rescues either');
    const played = [];
    on.heliAudio.play = (id, options) => played.push([id, options]);
    on._heliEvents([{type: 'cue', id: 'heli.beacon.beep', pitch: 1200}, {type: 'cue', id: 'heli.fire.alert'}]);
    same(played, [['heli.beacon.beep', {rate: 1.2}], ['heli.fire.alert', undefined]], 'the beacon beep plays at its pitch; other cues play as before');
  } finally {
    if (saved) Object.defineProperty(globalThis, 'localStorage', saved); else delete globalThis.localStorage;
  }
}
console.log('PASS the app passes the rescue switch and the beep pitch');


function finishReport(session, log) {
  const done = log.find(e => e.type === 'rescueDone');
  ok(done && RESCUE_CLOCKS[done.kind] >= done.clockSeconds * 1.25, `${done?.kind}: cautious flight has at least 25% extra time`);
  ok(session.view().heli.fuelKg >= 60, `${done.kind}: cautious full-tank flight ends with at least 60 kg`);
  if (!process.env.RESCUE_FINISH_REPORT) return;
  console.log('RESCUE-FINISH', JSON.stringify({kind: done?.kind, completed: !!done, seconds: done?.clockSeconds, fuelKg: session.view().heli.fuelKg, fingerprint: session.fingerprint(), resets: log.filter(e => e.type === 'holdReset')}));
}

{
  const {session, log} = flyHiker({searchPattern: true});
  if (process.env.RESCUE_FINISH_REPORT) console.log('PLAYER-SEARCH-PATTERN');
  finishReport(session, log);
}

console.log(`test-heli-rescue-session: ${checks} checks passed`);
