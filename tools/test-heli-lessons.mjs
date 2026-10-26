// The instructor's lessons (docs/HELICOPTER.md section 7): the skippable
// opening, lessons 1 to 4 flown headless by a new pilot, retries, and what
// each lesson opens (the pump after the free tank, the dispatch board,
// carrying cars).
import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {heliOf} from '../src/heli/heli-save.js';
import {LESSON_RULES, lessonOpen, createLesson, stepLesson, carryGuidance} from '../src/heli/heli-lessons.js';
import {createHeliSession} from '../src/heli/heli-session.js';
import {lessonsMarkup, noticeText} from '../src/heli/heli-ui.js';
import {HELI_RADIO_LINES} from '../src/heli/heli-radio-lines.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const worlds = new Map();
function loadCourse(id) {
  if (!worlds.has(id)) {
    const course = new Course(ALL_CIRCUITS.find(def => def.id === id), 1989);
    worlds.set(id, {course, ground: groundFromCourse(course)});
  }
  return worlds.get(id);
}
function pilot(view, target, {speed = 4} = {}) {
  const h = view.heli;
  const fwdX = Math.sin(h.heading), fwdZ = Math.cos(h.heading), rightX = -fwdZ, rightZ = fwdX;
  const dx = target.x - h.x, dz = target.z - h.z, distance = Math.hypot(dx, dz);
  const want = Math.min(speed, distance * 0.4);
  const wx = distance > 0.01 ? dx / distance * want : 0, wz = distance > 0.01 ? dz / distance * want : 0;
  const ex = wx - h.vx, ez = wz - h.vz, clamp = v => Math.max(-1, Math.min(1, v));
  return {pitch: clamp((ex * fwdX + ez * fwdZ) * 0.25), roll: clamp((ex * rightX + ez * rightZ) * 0.25),
    lift: target.y === undefined ? -1 : clamp((target.y - h.y) * 0.3 - h.vy * 0.3), yaw: 0};
}
function run(session, seconds, controls = () => ({}), until = null) {
  const events = [];
  for (let i = 0; i < Math.round(seconds * 120); i++) {
    events.push(...session.step(controls(session.view())));
    if (until?.(session.view(), events)) break;
  }
  return events;
}
const newPilot = (extra = {}) => normalizeProfile({...createProfile(), credits: 3000, ...extra});
const lessonEvent = (events, type) => events.find(e => e.type === type);

// The rules on their own.
{
  ok(lessonOpen({}, 'liftoff') && !lessonOpen({}, 'hover'), 'lesson 1 is open; lesson 2 waits for it');
  ok(lessonOpen({liftoff: true}, 'hover') && lessonOpen({liftoff: true, hover: true, landing: true}, 'carry'), 'each lesson opens the next');
  assert.throws(() => createLesson('nope'), /Unknown lesson/); checks++;
  for (const line of ['liftoff.start', 'liftoff.hold', 'liftoff.pass', 'hover.start', 'hover.drift', 'hover.pass', 'landing.start',
    'landing.pass', 'carry.start', 'carry.swing', 'carry.pass', 'retry', 'welcome', 'controls'])
    ok(HELI_RADIO_LINES[`heli.radio.${line}`], `the instructor has a line for ${line}`);
  const lesson = createLesson('liftoff', {spot: {x: 0, z: 0}});
  const at = h => ({heli: {x: 0, z: 0, y: h, groundY: 0, onGround: h <= 0}});
  ok(stepLesson(lesson, at(0)).radio === 'heli.radio.liftoff.start', 'a lesson starts with its line');
  let result;
  for (let i = 0; i < 120 * 5.1; i++) result = stepLesson(lesson, at(3.2), [], 1 / 120);
  ok(result.result === 'passed', 'three metres held for five seconds passes lesson 1');
  const hard = createLesson('hover', {spot: {x: 0, z: 0}});
  ok(stepLesson(hard, at(3), [{type: 'touchdown', result: 'hard'}]).result === 'retry', 'a hard landing means try again');
}

// Carry guidance and each retry tell the pilot what to change.
{
  const lesson = () => createLesson('carry', {spot: {x: 0, z: 0}, target: {x: 0, z: 0}});
  const load = {id: 'crate', x: 13, z: 0, y: 23.7, hooked: true, onGround: false};
  const guidance = carryGuidance(lesson(), load, 20);
  ok(guidance.distance === 13 && Math.abs(guidance.height - 3) < 1e-8 && !guidance.ready, 'guidance measures crate clearance over its own ground');
  const markup = g => lessonsMarkup({heli: {}, lesson: {...lesson(), guidance: g}}, []);
  ok(markup(guidance).includes('Crate: 13 m from the centre · 3 m up'), 'distance and height appear below the goal');
  ok(markup(guidance).includes('Lower until the crate touches, then H.'), 'goal explains the release');
  const grounded = {...load, y: 20.7, onGround: true};
  const green = carryGuidance(lesson(), {...grounded, x: 10}, 20);
  ok(green.ready && green.height === 0 && markup(green).includes('On the mark. Press H to let go.'), 'grounded crate at the inclusive 10 m boundary is ready');
  ok(!carryGuidance(lesson(), {...grounded, x: 10.01}, 20).ready, 'outside the circle is not green');
  ok(!carryGuidance(lesson(), {...load, x: 0}, 20).ready, 'airborne inside is not green');
  ok(carryGuidance(lesson(), {...grounded, hooked: false}, 20) === null, 'guidance hides once unhooked');
  const checkRetry = (crate, type, words) => {
    const result = stepLesson(lesson(), {heli: {}, load: crate}, [{type, id: 'crate'}]);
    ok(result.result === 'retry' && result.reason === words, words);
    ok(noticeText({type: 'lessonRetry', reason: result.reason}) === words, 'retry reaches the on-screen notice');
  };
  checkRetry(grounded, 'released', 'The crate was 13 m from the centre: set it down inside the circle');
  checkRetry({...load, x: 0}, 'released', 'Let go only once the crate sits on the ground');
  checkRetry(load, 'drop', 'It dropped: lower it gently first');
  const settledAfterH = stepLesson(lesson(), {heli: {}, load: {...grounded, x: 0}},
    [{type: 'released', id: 'crate', crateRelease: {x: 0, z: 0, onGround: false}}]);
  ok(settledAfterH.result === 'retry' && settledAfterH.reason === 'Let go only once the crate sits on the ground', 'touching down after H cannot pass');
  ok(stepLesson(lesson(), {heli: {}, load: {...grounded, x: 10}}, [{type: 'released', id: 'crate'}]).result === 'passed', 'ready state matches the pass boundary');
}

// A new pilot: the opening, the free tank, and what is still closed.
{
  const session = createHeliSession({profile: newPilot(), enabled: true, loadCourse, carId: 'falcone_f42', today: '2026-10-14'});
  const opening = session.start();
  ok(opening.some(e => e.type === 'radio' && e.line === 'heli.radio.welcome') && opening.some(e => e.line === 'heli.radio.controls'),
    'the opening: welcome and the controls');
  ok(opening.some(e => e.type === 'openingOffered'), 'the opening can be skipped');
  const board = session.lessonBoard();
  ok(board[0].open && !board[0].done && !board[1].open, 'lesson 1 open, lesson 2 closed');
  ok(session.buyFuel().ok, 'the first tank is free even before the lessons');
  ok(!session.takeJob(session.boardJobs()[1].id).ok, 'the dispatch board opens with lesson 3');
  ok(!session.startLesson('hover').ok, 'lesson 2 cannot start before lesson 1');

  // Lesson 1: lift-off to 3 m and hold 5 s.
  ok(session.startLesson('liftoff').ok, 'lesson 1 starts on the pad');
  const zone = session.view().zone;
  let events = run(session, 40, v => pilot(v, {x: zone.x, z: zone.z, y: v.heli.groundY + 3.4}),
    (v, seen) => lessonEvent(seen, 'lessonPassed'));
  ok(events.some(e => e.line === 'heli.radio.liftoff.start') && events.some(e => e.line === 'heli.radio.liftoff.pass'), 'lesson 1 talks and passes');
  ok(heliOf(session.profile).lessons.liftoff && session.lessonBoard()[1].open, 'lesson 1 is saved and opens lesson 2');

  // Back on the pad (lessons start there), then lesson 2: the hover.
  run(session, 30, v => pilot(v, {x: zone.x, z: zone.z}), v => v.heli.onGround);
  ok(session.startLesson('hover').ok, 'lesson 2 starts');
  events = run(session, 60, v => pilot(v, {x: zone.x, z: zone.z, y: v.heli.groundY + 3.5}, {speed: 1}),
    (v, seen) => lessonEvent(seen, 'lessonPassed'));
  ok(lessonEvent(events, 'lessonPassed')?.lesson === 'hover', 'ten seconds in the circle passes lesson 2');

  // Lesson 3: land on the H, gently.
  run(session, 30, v => pilot(v, {x: zone.x, z: zone.z}), v => v.heli.onGround);
  ok(session.startLesson('landing').ok, 'lesson 3 starts');
  run(session, 8, v => pilot(v, {x: zone.x + 0.5, z: zone.z, y: v.heli.groundY + 6}));
  events = run(session, 40, v => pilot(v, {x: zone.x, z: zone.z}, {speed: 1}), (v, seen) => lessonEvent(seen, 'lessonPassed') || lessonEvent(seen, 'lessonRetry'));
  ok(lessonEvent(events, 'lessonPassed')?.lesson === 'landing', 'a gentle landing on the H passes lesson 3');
  ok(session.takeJob(session.boardJobs()[1].id).ok, 'the dispatch board is open now');
  session.dropJob();

  // Lesson 4: carry the 500 kg crate 200 m and set it down in the circle.
  ok(session.startLesson('carry').ok, 'lesson 4 starts');
  const crate = session.view().loads.find(load => load.id === 'crate');
  const target = session.view().lesson.target;
  ok(crate && target, 'the crate waits beside the pad and its circle is set');
  const far = Math.hypot(target.x - zone.x, target.z - zone.z);
  ok(far >= 150 && far <= 250, `the circle is about 200 m out (${far.toFixed(0)} m)`);
  run(session, 60, v => pilot(v, {x: crate.x, z: crate.z, y: crate.y + 15.2}, {speed: 3}),
    v => Math.hypot(v.heli.x - crate.x, v.heli.z - crate.z) < 1 && Math.abs(v.heli.y - crate.y - 15.2) < 0.6 && Math.hypot(v.heli.vx, v.heli.vz) < 0.5);
  ok(session.pressHook()?.type === 'hooked', 'the crate is hooked');
  const carryEvents = run(session, 10, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.heli.groundY + 40}));
  carryEvents.push(...run(session, 120, v => pilot(v, {x: target.x, z: target.z, y: target.y + 40}, {speed: 8}),
    v => Math.hypot(v.heli.x - target.x, v.heli.z - target.z) < 2 && Math.hypot(v.heli.vx, v.heli.vz) < 0.6));
  carryEvents.push(...run(session, 60, v => pilot(v, {x: target.x, z: target.z, y: target.y + 0.7 + 14.6}, {speed: 1}),
    v => v.loads.find(load => load.id === 'crate')?.onGround));
  run(session, 1, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.heli.y}));
  session.pressHook();
  events = [...carryEvents, ...run(session, 1)];
  ok(lessonEvent(events, 'lessonPassed')?.lesson === 'carry', 'a gentle set-down in the circle passes lesson 4');
  ok(events.filter(e => e.type === 'lessonRetry').length <= 1, 'the scripted pilot passes within two tries');
  ok(!session.view().loads.some(load => load.id === 'crate'), 'the crate goes with the lesson');
  ok(Object.values(heliOf(session.profile).lessons).every(Boolean), 'all four lessons saved');
}

// Skipping the opening marks lessons 1 and 2 done; retaking works; the
// pump stays closed until lesson 3 unless the tank is low.
{
  const session = createHeliSession({profile: newPilot(), enabled: true, loadCourse, carId: 'falcone_f42'});
  session.start();
  session.buyFuel();
  ok(session.skipOpening(), 'skip the opening');
  const lessons = heliOf(session.profile).lessons;
  ok(lessons.liftoff && lessons.hover && !lessons.landing, 'skipping marks lessons 1 and 2 done');
  ok(session.lessonBoard()[2].open, 'lesson 3 is open');
  ok(session.startLesson('liftoff').ok, 'a finished lesson can be retaken');
  session.stopLesson();
  const car = session.view().loads.find(load => load.own);
  run(session, 40, v => pilot(v, {x: car.x, z: car.z, y: car.y + 15.2}),
    v => Math.hypot(v.heli.x - car.x, v.heli.z - car.z) < 1 && Math.abs(v.heli.y - car.y - 15.2) < 0.6 && Math.hypot(v.heli.vx, v.heli.vz) < 0.5);
  ok(session.pressHook() === null, 'the car cannot be carried before lesson 4');
  ok(session.takeEvents().some(e => e.type === 'cannotLift' && /lesson 4/.test(e.reason)), 'and the reason says so');
  const second = createHeliSession({profile: normalizeProfile({...newPilot(), heli: {version: 1, fuelKg: 200, refuels: 1}}), enabled: true, loadCourse});
  second.start();
  ok(!second.buyFuel().ok, 'after the free tank the pump waits for lesson 3');
  const low = createHeliSession({profile: normalizeProfile({...newPilot(), heli: {version: 1, fuelKg: 40, refuels: 1}}), enabled: true, loadCourse});
  low.start();
  ok(low.buyFuel().ok, 'but a nearly empty tank can always be filled');
}

// A crash in a lesson means try again: the same lesson starts over on the pad.
{
  const session = createHeliSession({profile: newPilot(), enabled: true, loadCourse, mode: 'real'});
  session.start();
  session.buyFuel();
  session.startLesson('liftoff');
  run(session, 3, () => ({lift: 1}));
  const events = run(session, 30, () => ({lift: -1, pitch: 1}), (v, seen) => seen.some(e => e.type === 'crashed'));
  ok(events.some(e => e.type === 'crashed'), 'the Real dive crashes');
  ok(events.some(e => e.type === 'lessonRetry' && e.lesson === 'liftoff') && events.some(e => e.line === 'heli.radio.retry'), 'a crash: try again');
  run(session, 4);
  ok(session.lesson?.id === 'liftoff' && session.phase === 'flying', 'back on the pad, lesson 1 starts over');
  // Stop during the wait after a crash: no restart.
  run(session, 3, () => ({lift: 1}));
  const second = run(session, 30, () => ({lift: -1, pitch: 1}), (v, seen) => seen.some(e => e.type === 'crashed'));
  ok(second.some(e => e.type === 'crashed') && session.phase === 'crashed', 'the second dive crashes too');
  ok(session.stopLesson(), 'Stop during the crash wait');
  run(session, 4);
  ok(session.lesson === null, 'the stopped lesson does not start again after the respawn');
}

// A hop on the H is not a landing; a crate let go outside its circle or
// dropped from height is a retry; letting go of a car does not count.
{
  const trained = newPilot({heli: {version: 1, fuelKg: 300, refuels: 1, lessons: {liftoff: true, hover: true, landing: true, carry: true}}});
  const hop = createHeliSession({profile: newPilot({heli: {version: 1, fuelKg: 300, refuels: 1, lessons: {liftoff: true, hover: true}}}), enabled: true, loadCourse});
  hop.start();
  hop.startLesson('landing');
  let peak = 0;
  let events = run(hop, 0.6, v => { peak = Math.max(peak, v.heli.y - v.heli.groundY); return {lift: 1}; });
  events = events.concat(run(hop, 15, v => { peak = Math.max(peak, v.heli.y - v.heli.groundY); return {lift: -1}; }));
  ok(peak > 0.2 && peak < 2, `a small hop (${peak.toFixed(2)} m up)`);
  ok(events.some(e => e.type === 'touchdown' && e.result === 'good') && !events.some(e => e.type === 'lessonPassed'), 'a hop under 2 m does not pass lesson 3');
  ok(!heliOf(hop.profile).lessons.landing, 'and nothing is saved');

  let saves = 0;
  const again = createHeliSession({profile: trained, enabled: true, loadCourse, persist: () => saves++});
  again.start();
  again.skipOpening();
  ok(saves === 0, 'skipping when lessons 1 and 2 are done saves nothing');

  const carry = createHeliSession({profile: trained, enabled: true, loadCourse, carId: 'falcone_f42'});
  carry.start();
  carry.startLesson('carry');
  const zone = carry.view().zone, crate = carry.view().loads.find(load => load.id === 'crate');
  run(carry, 60, v => pilot(v, {x: crate.x, z: crate.z, y: crate.y + 15.2}, {speed: 3}),
    v => Math.hypot(v.heli.x - crate.x, v.heli.z - crate.z) < 1 && Math.abs(v.heli.y - crate.y - 15.2) < 0.6 && Math.hypot(v.heli.vx, v.heli.vz) < 0.5);
  ok(carry.pressHook()?.type === 'hooked', 'crate hooked');
  run(carry, 10, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.heli.groundY + 25}));
  carry.pressHook();
  events = run(carry, 6);
  ok(events.some(e => e.type === 'drop' && e.id === 'crate') && events.some(e => e.type === 'lessonRetry'), 'a crate dropped from height: try again');
  const reset = carry.view().loads.find(load => load.id === 'crate');
  ok(Math.hypot(reset.x - crate.x, reset.z - crate.z) < 0.01 && reset.onGround, 'the crate waits beside the pad again');
  ok(carry.lesson?.id === 'carry' && Math.hypot(zone.x - crate.x, zone.z - crate.z) < 25, 'the lesson goes on');
}

console.log(`test-heli-lessons: ${checks} checks passed`);
