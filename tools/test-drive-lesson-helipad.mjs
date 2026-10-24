// DRIVE-LESSON-HELIPAD (docs/DRIVING_LESSONS.md 12.6): driving lessons from the
// helicopter's pad. The board rows are the menu's, an air-only car takes a lesson
// only where it was last set down, "Lesson here" is offered and withdrawn with
// "Race here", and with `driving-lessons` off the helipad is exactly as today.
// Memory-only storage.
import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {COURSE, CARS} from '../src/config.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {isCourseUnlocked} from '../src/course-access.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {raceFeatureFlags} from '../src/wasteland-access.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {createHeliSession} from '../src/heli/heli-session.js';
import {dispatchBoardMarkup, handleBoardAction} from '../src/heli/heli-board.js';
import {lessonsMarkup} from '../src/heli/heli-ui.js';
import {HOME_COURSE, AIR_ONLY_CARS} from '../src/heli/heli-jobs.js';
import {driveLessonBoardModel} from '../src/lessons/drive-lesson-ui.js';
import {lessonBoardMarkup} from '../src/lessons/lesson-board.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const eq = (actual, expected, label) => { assert.equal(actual, expected, label); checks++; };

// ---- the session: "Lesson here" lives and dies with "Race here" --------------------

const worlds = new Map();
function loadCourse(id) {
  if (!worlds.has(id)) {
    const course = new Course(ALL_CIRCUITS.find(def => def.id === id), 1989);
    worlds.set(id, {course, ground: groundFromCourse(course)});
  }
  return worlds.get(id);
}
let lastVy = 0;
function pilot(view, target, {speed = 6} = {}) {
  const h = view.heli;
  const fwdX = Math.sin(h.heading), fwdZ = Math.cos(h.heading), rightX = -fwdZ, rightZ = fwdX;
  const dx = target.x - h.x, dz = target.z - h.z, distance = Math.hypot(dx, dz);
  const want = Math.min(speed, distance * 0.4);
  const wx = distance > 0.01 ? dx / distance * want : 0, wz = distance > 0.01 ? dz / distance * want : 0;
  const ex = wx - h.vx, ez = wz - h.vz;
  const clamp = v => Math.max(-1, Math.min(1, v));
  const lift = clamp((target.y - h.y) * 0.3 - h.vy * 0.3);
  lastVy = h.vy;
  return {pitch: clamp((ex * fwdX + ez * fwdZ) * 0.25), roll: clamp((ex * rightX + ez * rightZ) * 0.25), lift, yaw: 0};
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
const OWNED = ['tremblant-woods', 'tremblant-snow', 'panorama-ridge'];
const profileWith = owned => normalizeProfile({...createProfile(), credits: 3000, courses: {version: 1, unlocked: owned},
  heli: {version: 1, fuelKg: 0, lessons: TRAINED}});
function newSession(drivingLessonAt) {
  const session = createHeliSession({profile: profileWith(OWNED), enabled: true, loadCourse, carId: 'falcone_f42',
    today: '2026-10-24', persist: () => {}, ...(drivingLessonAt === undefined ? {} : {drivingLessonAt})});
  session.start(); session.buyFuel(); session.takeEvents();
  return session;
}
const loadOf = session => session.view().loads.find(load => load.own);
function hookOwnCar(session) {
  const car = () => loadOf(session);
  run(session, 60, v => pilot(v, {x: car().x, z: car().z, y: car().y + 15.2}, {speed: 4}),
    v => Math.hypot(v.heli.x - car().x, v.heli.z - car().z) < 1 && Math.abs(v.heli.y - car().y - 15.2) < 0.6 &&
      Math.hypot(v.heli.vx, v.heli.vy, v.heli.vz) < 0.5);
  return session.pressHook();
}
function carryAcross(session) {
  run(session, 12, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.zone.y + 60}));
  ok(session.pressAutopilot(), 'the autopilot takes the car toward the destination');
  run(session, 300, () => ({}), () => session.cruiseOffered);
  ok(session.acceptCruise(), 'cruise');
  run(session, 2);
  run(session, 300, () => ({}), (v, seen) => seen.some(e => e.type === 'autopilotArrived'));
  session.pressAutopilot();
}
function setDown(session) {
  const final = view => view.zone.y + 0.7 + 14.6;
  run(session, 60, view => pilot(view, {x: view.zone.x, z: view.zone.z, y: final(view)}, {speed: 1}), view => view.load.onGround);
  run(session, 1, view => pilot(view, {x: view.heli.x, z: view.heli.z, y: view.heli.y}));
  return session.pressHook();
}
function flyOwnCarTo(courseId, drivingLessonAt) {
  const session = newSession(drivingLessonAt);
  ok(session.takeJob('own').ok, 'take Fly my car');
  session.setDestination(courseId);
  ok(hookOwnCar(session)?.type === 'hooked', 'hook the player\'s own car');
  carryAcross(session);
  ok(setDown(session)?.type === 'released', `the car is set down at ${courseId}`);
  return session;
}

{
  const asked = [];
  const provider = (courseId, carId) => { asked.push([courseId, carId]); return courseId === 'panorama-ridge' ? {id: 'corner', name: '1 The sharp corner'} : null; };
  const session = flyOwnCarTo('panorama-ridge', provider);
  same(session.raceHereOffer(), {courseId: 'panorama-ridge', carId: 'falcone_f42'}, 'Race here is offered at Panorama Ridge');
  same(session.lessonHereOffer(), {courseId: 'panorama-ridge', carId: 'falcone_f42', lessonId: 'corner', name: '1 The sharp corner'},
    'and so is the lesson, beside it');
  ok(asked.every(([course, car]) => course === 'panorama-ridge' && car === 'falcone_f42'), 'the app is asked about that course and car only');
  // Both offers go on the board together, and the lesson button sits beside Race here.
  const view = session.view(), offer = session.raceHereOffer(), lessonOffer = session.lessonHereOffer();
  const html = dispatchBoardMarkup({...view, heli: {...view.heli, onGround: false}}, {offer, lessonOffer});
  ok(html.includes('data-heli-board="race-here"') && html.includes('data-heli-board="lesson-here"') && html.includes('Lesson here: 1 The sharp corner'),
    'the board shows Race here and Lesson here');
  eq(html.match(/<button/g).length, 2, 'two buttons, both inside the one Race here box');
  // Hooking the car again takes both offers back.
  run(session, 2, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.heli.y}));
  ok(hookOwnCar(session)?.type === 'hooked', 'hook the car again');
  eq(session.raceHereOffer(), null, 'Race here is withdrawn');
  eq(session.lessonHereOffer(), null, 'and Lesson here with it');
}
{
  // A course with no lesson row, or no lesson open, offers none; Race here stays.
  const session = flyOwnCarTo('tremblant-snow', (courseId) => courseId === 'panorama-ridge' ? {id: 'corner', name: 'x'} : null);
  ok(session.raceHereOffer(), 'Race here at Tremblant Snow');
  eq(session.lessonHereOffer(), null, 'no lesson row there, no Lesson here');
}
{
  // Switch off (no provider): the session and its board are exactly as before.
  const session = flyOwnCarTo('panorama-ridge');
  ok(session.raceHereOffer(), 'Race here still comes');
  eq(session.lessonHereOffer(), null, 'with driving lessons off there is no Lesson here');
  const view = session.view(), offer = session.raceHereOffer();
  eq(dispatchBoardMarkup(view, {offer, lessonOffer: session.lessonHereOffer()}), dispatchBoardMarkup(view, {offer}),
    'the board is byte for byte what it was');
  ok(!dispatchBoardMarkup(view, {offer}).includes('lesson-here'), 'and has no lesson button');
}

// ---- the board: the same rows as the menu's ----------------------------------------

{
  const view = newSession().view();
  const board = [{id: 'liftoff', open: true, done: true}, {id: 'hover', open: true, done: false},
    {id: 'landing', open: false, done: false}, {id: 'carry', open: false, done: false}];
  const plain = lessonsMarkup(view, board, {opening: false});
  eq(lessonsMarkup(view, board, {opening: false, driving: null}), plain, 'no driving rows: the instructor board is exactly the helicopter\'s');
  eq(lessonsMarkup(view, board, {driving: {rows: [], notes: ['x']}}), lessonsMarkup(view, board), 'empty rows add nothing, not even a note');
  ok(!plain.includes('lesson-board-group'), 'one group, no headings, as today');
  const menu = driveLessonBoardModel({playerId: 'kyle', carId: 'falcone_f42', difficulty: 'casual',
    cars: [{id: 'falcone_f42', name: 'Falcone F42'}], ownedCarIds: ['falcone_f42'], courseId: HOME_COURSE,
    courses: COURSE, corners: [{courseId: 'tremblant-woods', cornerName: 'Beaver Hairpin', rollingMph: 75}],
    ownedCourseIds: ['tremblant-woods'], progress: null});
  const withDriving = lessonsMarkup(view, board, {driving: {rows: menu.rows, notes: []}});
  ok(withDriving.includes('<li class="lesson-board-group">Helicopter</li>') && withDriving.includes('<li class="lesson-board-group">Driving</li>'),
    'two groups get headings: Helicopter, then Driving');
  ok(withDriving.indexOf('Helicopter</li>') < withDriving.indexOf('Driving</li>'), 'Driving comes under the helicopter lessons');
  ok(withDriving.includes(lessonBoardMarkup(menu.rows, {action: 'data-heli-lesson'}).match(/<li class="lesson-board-open">.*<\/li>/)[0]),
    'the Driving row is the menu\'s row, drawn by the same list');
  ok(withDriving.includes('data-heli-lesson="start:corner"'), 'its Start button names the driving lesson');
  const noted = lessonsMarkup(view, board, {driving: {rows: [{...menu.rows[0], open: false, done: false}], notes: ['Your <Jesko> is at Panorama Ridge.']}});
  ok(noted.includes('Opens later') && noted.includes('Your &lt;Jesko&gt; is at Panorama Ridge.'), 'a closed row says why, escaped');
}

// ---- the click: Lesson here goes through the app -----------------------------------

{
  const session = flyOwnCarTo('panorama-ridge', () => ({id: 'corner', name: '1 The sharp corner'}));
  let started = null;
  const app = {heliSession: session, heliView: () => session.view(), _heliEvents() {}, lessonHere: offer => { started = offer; return true; }};
  ok(handleBoardAction('lesson-here', app), 'the Lesson here button starts it');
  same(started, {courseId: 'panorama-ridge', carId: 'falcone_f42', lessonId: 'corner', name: '1 The sharp corner'}, 'with the course, car and lesson on offer');
  const bare = {heliSession: newSession(), lessonHere: () => { throw new Error('no offer, no start'); }};
  eq(handleBoardAction('lesson-here', bare), false, 'no offer, nothing starts');
}

// ---- the app: rows, the air-only rule, starting from the pad, the switch off --------

const saved = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const memory = new Map();
const storage = {getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key), key: index => [...memory.keys()][index] ?? null, get length() { return memory.size; }};
Object.defineProperty(globalThis, '__DUEL_QA__', {configurable: true, value: true});
Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: storage});
try {
  const {App} = await import('../src/app.js');
  const makeApp = overrides => {
    memory.clear(); // every app starts from a new memory-only career
    const app = new App();
    app.duel.featureFlags = raceFeatureFlags(createFeatureFlags({storage, overrides, qa: true}), () => app.duel.state);
    return app;
  };
  const ON = {helicopter: true, 'driving-lessons': true, 'tyre-slip': true};
  // The home pad is at Tremblant Woods, which a new player buys like the menu's board says.
  const ownedApp = (overrides, courses = ['tremblant-woods']) => {
    const app = makeApp(overrides);
    app.profile = {...app.profile, credits: 1_000_000}; app._saveProfile();
    for (const course of courses) { app.purchaseCourse(course); ok(isCourseUnlocked(app.profile, course), `${course} is owned`); }
    return app;
  };

  // On: the pad's rows are the menu's rows.
  {
    const fresh = makeApp(ON);
    ok(fresh.visitHeli(), 'a new player flies from the pad');
    same(fresh.heliDrivingBoard().rows.map(row => row.open), [false], 'before Tremblant Woods is bought the row is closed, as in the menu');
    same(fresh.heliDrivingBoard().notes, [driveLessonBoardModel({...fresh.driveLessonProps(), courseId: HOME_COURSE, carId: fresh.menuCar}).reason], 'with the menu\'s own words');
    fresh.returnToMenu();
    const app = ownedApp(ON);
    ok(app.visitHeli(), 'the visit starts with both switches on');
    const board = app.heliDrivingBoard();
    ok(board, 'the pad has a Driving board');
    const menu = driveLessonBoardModel({...app.driveLessonProps(), courseId: HOME_COURSE, carId: app.menuCar});
    same(board.rows, menu.rows, 'the rows are exactly the menu\'s rows');
    same(board.rows.map(row => [row.group, row.id, row.open, row.done]), [['Driving', 'corner', true, false]], 'Driving, lesson 1, open, not done');
    same(board.request, menu.start, 'and the request is the menu\'s');
    eq(board.request.courseId, HOME_COURSE, 'on the pad\'s own course');
    eq(board.request.carId, app.menuCar, 'with the car at the pad');
    // The page's markup carries both groups.
    const view = app.heliView(), heliBoard = app.heliSession.lessonBoard();
    ok(lessonsMarkup({...view, heli: {...view.heli, onGround: true}}, heliBoard, {driving: board}).includes('start:corner'), 'the instructor board lists it');
    // A done lesson reads as Retake, as in the menu.
    app.profile = {...app.profile, drivingLessons: {version: 1, done: {corner: true}, best: {corner: .4}, rewarded: {corner: true}}};
    same(app.heliDrivingBoard().rows.map(row => [row.open, row.done]), [[true, true]], 'done lessons can be retaken from the pad');
    // Progress from a newer version closes the row, exactly as the menu does.
    app.profile = {...app.profile, drivingLessons: {version: 2}};
    same(app.heliDrivingBoard().rows.map(row => row.open), [false], 'newer progress closes the row');
    app.returnToMenu();
  }
  // The air-only rule.
  {
    const app = ownedApp(ON, ['tremblant-woods', 'panorama-ridge']);
    const jesko = AIR_ONLY_CARS[0];
    ok(CARS[jesko], 'an air-only car exists');
    app.profile = normalizeProfile({...app.profile, unlockedCars: [...app.profile.unlockedCars, jesko],
      heli: {version: 1, fuelKg: 100, lessons: TRAINED, carsAt: {[jesko]: 'panorama-ridge'}}});
    app._saveProfile();
    app.menuCar = jesko;
    ok(app.visitHeli(), 'visit with the air-only car away at Panorama Ridge');
    const board = app.heliDrivingBoard();
    same(board.rows.map(row => [row.open, row.done]), [[false, false]], 'its row is closed at the pad');
    same(board.notes, [`Your ${CARS[jesko].name} is at Panorama Ridge.`], 'and says where the car is');
    const refused = app.heliStartDriving('corner');
    eq(refused.ok, false, 'starting is refused'); eq(refused.reason, board.notes[0], 'with the same words');
    ok(app.heliSession && app.duel.state.status === 'heli', 'the visit goes on');
    eq(app._heliLessonAt('panorama-ridge', jesko)?.id, 'corner', 'where it was set down, Lesson here is allowed');
    eq(app._heliLessonAt('tremblant-woods', jesko), null, 'anywhere else it is not');
    app.returnToMenu();
  }
  // Starting from the pad leaves the visit and runs the menu's startLesson.
  {
    const app = ownedApp(ON);
    const calls = [];
    app.visitHeli();
    app.startLesson = request => { calls.push({...request, boardOpen: app.driveLessonBoardOpen, status: app.duel.state.status}); return Promise.resolve(true); };
    const result = app.heliStartDriving('corner');
    ok(result.ok, 'the lesson starts');
    eq(app.heliSession, null, 'the helicopter visit has ended');
    eq(app.duel.state.status, 'menu', 'back at the menu');
    same(calls.map(call => [call.lessonId, call.courseId, call.carId, call.boardOpen, call.status]), [['corner', HOME_COURSE, app.menuCar, true, 'menu']],
      'the menu\'s startLesson ran once, for the pad\'s course and car, on the open lesson board');
    eq(app.heliStartDriving('corner').ok, false, 'and with no visit there is nothing to start from');
    // Lesson here: same path, on the course the car was set down on.
    const owned = ownedApp(ON, ['tremblant-woods', 'panorama-ridge']);
    owned.visitHeli();
    const lessonCalls = [];
    owned.startLesson = request => { lessonCalls.push(request); return Promise.resolve(true); };
    eq(owned._heliLessonAt('panorama-ridge', owned.menuCar)?.id, 'corner', 'the next open lesson at Panorama Ridge is lesson 1');
    eq(owned._heliLessonAt('tremblant-snow', owned.menuCar), null, 'Tremblant Snow has no lesson row');
    owned.profile = {...owned.profile, drivingLessons: {version: 1, done: {corner: true}, best: {corner: .4}, rewarded: {corner: true}}};
    eq(owned._heliLessonAt('panorama-ridge', owned.menuCar), null, 'with lesson 1 done there is no next lesson to offer');
    owned.profile = {...owned.profile, drivingLessons: null};
    ok(owned.lessonHere({courseId: 'panorama-ridge', carId: owned.menuCar, lessonId: 'corner'}), 'Lesson here starts the lesson');
    same(lessonCalls.map(call => [call.lessonId, call.courseId]), [['corner', 'panorama-ridge']], 'on the course where the car stands');
    eq(owned.heliSession, null, 'and ends the visit');
    eq(owned.lessonHere({courseId: 'panorama-ridge', carId: owned.menuCar, lessonId: 'corner'}), false, 'no Lesson here without a visit');
  }
  // Off: nothing at the pad changes.
  for (const overrides of [{helicopter: true}, {helicopter: true, 'driving-lessons': true}, {helicopter: true, 'tyre-slip': true}]) {
    const app = ownedApp(overrides);
    ok(app.visitHeli(), 'the visit works without driving lessons');
    eq(app.heliDrivingBoard(), null, `${JSON.stringify(overrides)}: no Driving board`);
    eq(app.heliSession.lessonHereOffer(), null, 'no Lesson here');
    eq(app.heliStartDriving('corner').ok, false, 'nothing starts');
    ok(app.heliSession && app.duel.state.status === 'heli', 'the visit is untouched');
    app.returnToMenu();
  }
} finally {
  if (saved) Object.defineProperty(globalThis, 'localStorage', saved); else delete globalThis.localStorage;
  delete globalThis.__DUEL_QA__;
}

console.log(`test-drive-lesson-helipad: ${checks} checks passed`);
