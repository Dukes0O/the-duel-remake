// HELI-DISPATCH (docs/HELICOPTER.md section 6): the day's jobs, the dispatch
// board, taking a job at the home pad, delivering a customer's car for pay,
// a dropped car, Race here, and the board's markup. Memory-only: no real
// save is read or written.
import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {CARS} from '../src/config.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {liftCheck} from '../src/heli/heli-cable.js';
import {heliOf, carAt, heliHash, notePlayDay, missionsOf, normalizeHeli, createHeli, createMissions, WRECK_DAYS} from '../src/heli/heli-save.js';
import {HELI_RADIO_LINES} from '../src/heli/heli-radio-lines.js';
import {HOME_COURSE, HELI_DESTINATIONS, JOB_ROUTES, JOB_CARS, AIR_ONLY_CARS, isAirOnlyCar, airOnlyNote, dayJobs, jobPay, jobTitle,
  SUMMIT_RUN, HELI_DESTINATIONS_WITH_SUMMIT, destinationsFor, legFuelKg, bearing, isDestination,
  RECOVERY, wreckFor, recoveryJob, recoveryTitle, recoveryJobOf, finishRecovery} from '../src/heli/heli-jobs.js';
import {createHeliSession} from '../src/heli/heli-session.js';
import {dispatchBoardMarkup, handleBoardAction, createDispatchBoard, atHomePad} from '../src/heli/heli-board.js';
import {returnLoadJob, returnLoadTitle, finishReturnLoad, returnLoadPay, mapJobPay} from '../src/heli/heli-jobs.js';
import {fuelPadAt, placeOfCourse, mapDistanceKm} from '../src/heli/pilot-map-data.js';
import {armMissions} from '../src/heli/heli-missions.js';
import {setMissions} from '../src/heli/heli-save.js';
import {arrivalMarkup} from '../src/heli/heli-ui.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
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

// The same steady test pilot as tools/test-heli-mode.mjs. In Assisted the
// cyclic sets the tilt and the collective lever sets the climb; in Real the
// cyclic sets how fast the tilt changes and the lever how fast the
// collective changes, so the Real pilot steers toward the tilt it wants and
// uses height, climb and the change in climb together.
let lastVy = 0;
function pilot(view, target, {speed = 6} = {}) {
  const h = view.heli;
  const fwdX = Math.sin(h.heading), fwdZ = Math.cos(h.heading), rightX = -fwdZ, rightZ = fwdX;
  const dx = target.x - h.x, dz = target.z - h.z, distance = Math.hypot(dx, dz);
  const want = Math.min(speed, distance * 0.4);
  const wx = distance > 0.01 ? dx / distance * want : 0, wz = distance > 0.01 ? dz / distance * want : 0;
  const ex = wx - h.vx, ez = wz - h.vz;
  const clamp = v => Math.max(-1, Math.min(1, v));
  let pitch = clamp((ex * fwdX + ez * fwdZ) * 0.25), roll = clamp((ex * rightX + ez * rightZ) * 0.25);
  let lift = clamp((target.y - h.y) * 0.3 - h.vy * 0.3);
  if (h.mode === 'real') {
    pitch = clamp((pitch * 20 * Math.PI / 180 - h.pitch) * 10);
    roll = clamp((roll * 20 * Math.PI / 180 - h.roll) * 10);
    const accel = (h.vy - lastVy) * 120;
    lift = clamp(0.125 * Math.max(-6, Math.min(6, target.y - h.y)) - 0.375 * h.vy - 0.375 * accel);
  }
  lastVy = h.vy;
  return {pitch, roll, lift, yaw: 0};
}

function run(session, seconds, controls = () => ({}), until = null) {
  const events = [];
  for (let i = 0; i < Math.round(seconds * 120); i++) {
    events.push(...session.step(controls(session.view())));
    if (until?.(session.view(), events)) break;
  }
  return events;
}

const OWNED = ['tremblant-woods', 'tremblant-snow', 'panorama-ridge'];
// A pilot who has finished the lessons (HELI-LESSONS opens the board and
// carrying cars with them; tools/test-heli-lessons.mjs covers a new pilot).
const TRAINED = Object.freeze({liftoff: true, hover: true, landing: true, carry: true});
function profileWith({credits = 3000, owned = [], heli = null} = {}) {
  return normalizeProfile({...createProfile(), credits, courses: {version: 1, unlocked: owned},
    heli: {version: 1, fuelKg: 0, ...(heli || {}), lessons: TRAINED}});
}
const DAY1 = '2026-10-14', DAY2 = '2026-10-15';

function newSession({profile = profileWith(), carId = 'falcone_f42', mode = 'assisted', today = DAY1, saves = null} = {}) {
  const session = createHeliSession({profile, enabled: true, logbookEnabled: true, loadCourse, carId, mode, today, persist: p => saves?.push(p)});
  session.start();
  session.buyFuel();
  session.takeEvents();
  return session;
}

// ---- the day's jobs --------------------------------------------------------
{
  same(JOB_ROUTES.map(r => [r.from, r.to, r.pay]), [['tremblant-woods', 'tremblant-snow', 300], ['tremblant-snow', 'panorama-ridge', 450],
    ['tremblant-woods', 'panorama-ridge', 600]], 'the three routes and their pay');
  ok(JOB_CARS.length >= 3 && JOB_CARS.every(id => liftCheck(id).ok), 'customers ask only for cars the helicopter can lift');
  ok(!JOB_CARS.some(id => AIR_ONLY_CARS.includes(id)), 'a customer\'s car is never a special car');
  ok(!JOB_CARS.includes('koenigsegg_jesko') && !JOB_CARS.includes('banshee_muscle') && !JOB_CARS.includes('titan_monster'), 'not the Jesko, Banshee or Titan');
  ok(!isAirOnlyCar('koenigsegg_jesko'), 'the Jesko is no longer air-only');
  same(airOnlyNote({enabled: true, profile: {heli: {version: 1, carsAt: {koenigsegg_jesko: 'panorama-ridge'}}}, carId: 'koenigsegg_jesko', courseId: 'tremblant-snow'}), null, 'old saved Jesko positions do not close START');
  same(dayJobs(7), dayJobs(7), 'same day, same jobs');
  const seen = new Set();
  for (let day = 0; day < 60; day++) {
    const jobs = dayJobs(day);
    assert.equal(jobs.length, 3); checks++;
    same(jobs.map(j => j.id), [1, 2, 3].map(n => `d${day}-${n}`), `day ${day}: the job ids`);
    same(jobs.map(j => `${j.from}|${j.to}|${j.pay}`).sort(), JOB_ROUTES.map(r => `${r.from}|${r.to}|${r.pay}`).sort(), `day ${day}: one job on each route`);
    ok(jobs.every(j => JOB_CARS.includes(j.carId)), `day ${day}: only liftable customer cars`);
    ok(new Set(jobs.map(j => j.carId)).size === 3, `day ${day}: three different cars`);
    ok(jobs.every(j => /^d\d+-\d$/.test(j.id) && Object.isFrozen(j)), `day ${day}: ids are save-safe`);
    seen.add(JSON.stringify(jobs.map(j => [j.carId, j.to, j.from])));
  }
  ok(seen.size > 40, `different days differ (${seen.size} different boards in 60 days)`);
  ok(dayJobs(1).some(j => j.id === 'd1-1'), 'ids carry the day');
  ok(dayJobs(-1).length === 3 && dayJobs(NaN).length === 3, 'a damaged day number still gives a board');
  same([jobPay({pay: 300}, 'assisted'), jobPay({pay: 450}, 'assisted'), jobPay({pay: 600}, 'assisted')], [300, 450, 600], 'Assisted pays the listed amounts');
  same([jobPay({pay: 300}, 'real'), jobPay({pay: 450}, 'real'), jobPay({pay: 600}, 'real')], [375, 563, 750], 'Real pays 25% more');
  const title = jobTitle({carId: 'falcone_f42', to: 'tremblant-snow'});
  assert.equal(title, `Fly the ${CARS.falcone_f42.name} to ${HELI_DESTINATIONS['tremblant-snow'].name}`); checks++;
}

// ---- the board, taking a job -------------------------------------------------
{
  const saves = [];
  const session = newSession({saves});
  const board = session.boardJobs();
  assert.equal(board.length, 4); checks++;
  same({...board[0]}, {id: 'own', own: true, carId: 'falcone_f42', title: 'Fly my car', pay: 0}, 'Fly my car is always first');
  same(board.slice(1).map(j => ({id: j.id, carId: j.carId, from: j.from, to: j.to, pay: j.pay})),
    dayJobs(1).map(j => ({id: j.id, carId: j.carId, from: j.from, to: j.to, pay: j.pay})), 'then today\'s three jobs (play day 1)');
  ok(board.slice(1).every(j => !j.taken && !j.done && j.payNow === j.pay), 'none taken or done yet');
  ok(newSession({mode: 'real'}).boardJobs().slice(1).every(j => j.payNow === jobPay(j, 'real')), 'Real shows the bigger pay');

  const own = session.takeJob('own');
  ok(own.ok && own.own && session.destination === null, 'Fly my car sets no destination');
  ok(!session.takeJob('d9-1').ok && !session.takeJob('nope').ok, 'a job that is not on today\'s board is refused');
  const homeJob = board.find(j => j.from === HOME_COURSE && j.to === 'tremblant-snow');
  const savesBefore = saves.length;
  const taken = session.takeJob(homeJob.id);
  ok(taken.ok && taken.job.id === homeJob.id, 'a job is taken at the home pad');
  same(session.takeEvents().map(e => e.type === 'radio' ? e.line : e.type), ['jobTaken', 'heli.radio.job.taken'], 'the job and the radio line');
  ok(saves.length === savesBefore + 1 && heliOf(session.profile).jobs.taken === homeJob.id && heliOf(session.profile).jobs.day === 1, 'the job in hand is saved');
  assert.equal(session.destination, 'tremblant-snow', 'the pick-up is here, so the destination is the drop-off'); checks++;
  ok(HELI_RADIO_LINES['heli.radio.job.taken'] && HELI_RADIO_LINES['heli.radio.job.done'], 'both job radio lines exist');
  ok(session.boardJobs().find(j => j.id === homeJob.id).taken, 'the board shows it taken');
  const view = session.view();
  assert.equal(view.loads.length, 2); checks++;
  const jobLoad = view.loads.find(l => l.job === homeJob.id), ownLoad = view.loads.find(l => l.own);
  ok(jobLoad && ownLoad && jobLoad.id === homeJob.carId && ownLoad.id === 'falcone_f42', 'both cars wait at the pad');
  ok(Math.hypot(jobLoad.x - ownLoad.x, jobLoad.z - ownLoad.z) > 8, 'the customer\'s car is not on top of the player\'s');
  ok(view.load.own, 'the single load the renderer draws is the player\'s car');
  assert.equal(view.job.id, homeJob.id); checks++;
  ok(session.takeJob(homeJob.id).ok && session.takeEvents().length === 0, 'taking the same job again is quiet');
  const other = board.find(j => j.id !== homeJob.id && j.id !== 'own');
  const refused = session.takeJob(other.id);
  ok(!refused.ok && /drop/.test(refused.reason), 'one job at a time');
  const dropped = session.dropJob();
  ok(dropped.ok && dropped.dropped && heliOf(session.profile).jobs.taken === null && session.view().loads.length === 1, 'dropping hands it back and the car leaves');
  ok(session.takeEvents().some(e => e.type === 'jobDropped'), 'and says so');
  ok(session.takeJob(other.id).ok, 'then another can be taken');

  // Not in the air.
  run(session, 4, () => ({lift: 1}));
  ok(!session.view().heli.onGround, 'in the air');
  const air = session.takeJob('own');
  ok(!air.ok && !session.dropJob().ok && !session.takeJob(homeJob.id).ok, 'the board works only on the ground at the home pad');
}

// A job that starts elsewhere: the destination is its pick-up, the car waits in
// that zone, and hooking it points the way to the drop-off.
{
  const session = newSession();
  const job = session.boardJobs().find(j => j.from === 'tremblant-snow');
  ok(session.takeJob(job.id).ok, 'take the Snow to Panorama Ridge job at home');
  assert.equal(session.destination, 'tremblant-snow', 'first to the pick-up'); checks++;
  ok(session.view().loads.every(l => !l.job), 'its car is not here');
  run(session, 4, () => ({lift: 1}));
  const area = session.view().area;
  run(session, 120, () => ({lift: 1}), v => v.heli.y > area.ceiling - 0.5);
  run(session, 20, () => ({lift: 1}), () => session.cruiseOffered);
  ok(session.acceptCruise(), 'cruise to the pick-up');
  run(session, 2);
  assert.equal(session.courseId, 'tremblant-snow'); checks++;
  const v = session.view(), car = v.loads.find(l => l.job === job.id);
  ok(car && car.id === job.carId && car.onGround, 'the customer\'s car waits at Tremblant Snow');
  near(Math.hypot(car.x - v.zone.x, car.z - v.zone.z), 0, 0.01, 'in the landing zone');
  ok(session.pressAutopilot() || session.autopilotOn, 'the autopilot is on');
  run(session, 300, () => ({}), (view, seen) => seen.some(e => e.type === 'autopilotArrived'));
  if (session.autopilotOn) session.pressAutopilot();
  run(session, 60, view => pilot(view, {x: car.x, z: car.z, y: car.y + 15.2}, {speed: 4}),
    view => Math.hypot(view.heli.x - car.x, view.heli.z - car.z) < 1 && Math.abs(view.heli.y - car.y - 15.2) < 0.6 &&
      Math.hypot(view.heli.vx, view.heli.vy, view.heli.vz) < 0.5);
  session.takeEvents();
  const hooked = session.pressHook();
  ok(hooked?.type === 'hooked' && hooked.job === job.id, 'the customer\'s car is hooked');
  assert.equal(session.destination, 'panorama-ridge', 'hooking it sets the drop-off as the destination'); checks++;
  ok(session.view().load.job === job.id && session.view().load.hooked, 'the car on the cable is the one the view reports');
}

// The same car for the job and the player: two cars, told apart.
{
  const session = newSession({carId: 'aurora_gt'});
  const job = session.boardJobs().find(j => !j.own && j.carId === 'aurora_gt');
  ok(job, 'day 1 has an Aurora job');
  ok(session.takeJob(job.id).ok);
  const loads = session.view().loads;
  ok(loads.length === 2 && loads.every(l => l.id === 'aurora_gt') && loads.filter(l => l.own).length === 1 && loads.filter(l => l.job).length === 1,
    'two Auroras, one the player\'s and one the customer\'s');
  const customer = () => session.view().loads.find(l => l.job);
  run(session, 40, v => pilot(v, {x: customer().x, z: customer().z, y: customer().y + 15.2}, {speed: 4}),
    v => Math.hypot(v.heli.x - customer().x, v.heli.z - customer().z) < 1 && Math.abs(v.heli.y - customer().y - 15.2) < 0.6 &&
      Math.hypot(v.heli.vx, v.heli.vy, v.heli.vz) < 0.5);
  session.takeEvents();
  ok(session.pressHook()?.job === job.id, 'the hook takes the one under it');
  ok(session.view().loads.find(l => l.job).hooked && !session.view().loads.find(l => l.own).hooked, 'and not the other');
  const release = session.pressHook();
  ok(release?.type === 'released', 'let go on the ground beside the pad');
  ok(!session.takeEvents().some(e => e.type === 'delivered'), 'a customer\'s car is never "delivered" as the player\'s');
  assert.equal(carAt(session.profile, 'aurora_gt'), HOME_COURSE); checks++;
}

// ---- flights ----------------------------------------------------------------
const loadOf = (session, key) => session.view().loads.find(l => key === 'job' ? l.job : l.own);

// Fly to a waiting car and hook it.
function hookCar(session, key) {
  const car = () => loadOf(session, key);
  run(session, 60, v => pilot(v, {x: car().x, z: car().z, y: car().y + 15.2}, {speed: 4}),
    v => Math.hypot(v.heli.x - car().x, v.heli.z - car().z) < 1 && Math.abs(v.heli.y - car().y - 15.2) < 0.6 &&
      Math.hypot(v.heli.vx, v.heli.vy, v.heli.vz) < 0.5);
  return session.pressHook();
}
// With a car on the cable at home: up, autopilot to the edge, cruise, autopilot over the zone, off.
function carryAcross(session, log) {
  log.push(...run(session, 12, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.zone.y + 60})));
  ok(session.pressAutopilot(), 'the autopilot takes the car toward the destination');
  log.push(...run(session, 300, () => ({}), () => session.cruiseOffered));
  ok(session.cruiseOffered, 'cruise is offered at the edge of the area');
  ok(session.acceptCruise(), 'cruise');
  log.push(...run(session, 2));
  log.push(...run(session, 300, () => ({}), (v, seen) => seen.some(e => e.type === 'autopilotArrived')));
  ok(session.view().load.hooked, 'the car came along');
  session.pressAutopilot();
}
// Down onto the zone gently (or hold 6 m up), then H.
function setDownAndRelease(session, log, {height = 0} = {}) {
  const final = view => view.zone.y + 0.7 + 14.6 + height;
  const hover = view => pilot(view, {x: view.zone.x, z: view.zone.z, y: height === 0 && view.heli.mode === 'real' ? Math.max(final(view), view.heli.y - 1.2) : final(view)}, {speed: 1});
  if (height === 0) {
    log.push(...run(session, 60, hover, view => view.load.onGround));
    log.push(...run(session, 1, view => pilot(view, {x: view.heli.x, z: view.heli.z, y: view.heli.y})));
  } else {
    log.push(...run(session, 40, hover, view => Math.abs(view.heli.y - view.zone.y - 15.3 - height) < 0.4 && Math.hypot(view.heli.vx, view.heli.vy, view.heli.vz) < 0.3));
  }
  const released = session.pressHook();
  log.push(...session.takeEvents());
  return released;
}

function flyJob({mode = 'assisted', high = false} = {}) {
  const saves = [];
  const session = newSession({mode, saves});
  const job = session.boardJobs().find(j => j.from === HOME_COURSE && j.to === 'tremblant-snow');
  ok(session.takeJob(job.id).ok, 'take the Tremblant Woods to Tremblant Snow job');
  const log = [...session.takeEvents()];
  const hk = hookCar(session, 'job'); if (hk?.job !== job.id) console.log('HK', hk, job, JSON.stringify(session.view().loads));
  ok(hk?.job === job.id, 'hook the customer car at the home parking spot');
  carryAcross(session, log);
  assert.equal(session.courseId, 'tremblant-snow'); checks++;
  const creditsBefore = session.profile.credits;
  if (high) {
    const released = setDownAndRelease(session, log, {height: 6});
    ok(released?.type === 'releasedHigh', 'released 6 m up');
    log.push(...run(session, 10, () => ({}), (v, seen) => seen.some(e => e.type === 'drop')));
    const drop = log.find(e => e.type === 'drop'), charge = log.find(e => e.type === 'charged' && e.kind === 'drop');
    ok(drop && charge && charge.charged > 400 && charge.charged < 800, `a drop of ${drop?.dropMetres.toFixed(1)} m is charged ${charge?.charged}`);
    ok(!log.some(e => e.type === 'jobDone'), 'a car dropped from height does not finish the job');
    ok(heliOf(session.profile).jobs.taken === job.id && heliOf(session.profile).jobs.done.length === 0, 'the job stays in hand');
    assert.equal(session.profile.credits, creditsBefore - charge.charged); checks++;
    // Hook it again and set it down properly.
    session.takeEvents();
    run(session, 2, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.heli.y}));
    ok(hookCar(session, 'job')?.type === 'hooked', 'hook the dropped car again');
    run(session, 40, v => pilot(v, {x: v.zone.x, z: v.zone.z, y: v.zone.y + 22}, {speed: 2}),
      v => Math.hypot(v.heli.x - v.zone.x, v.heli.z - v.zone.z) < 1 && Math.abs(v.heli.y - v.zone.y - 22) < 0.5 && Math.hypot(v.heli.vx, v.heli.vy, v.heli.vz) < 0.3);
    session.takeEvents();
    log.length = 0;
  }
  const released = setDownAndRelease(session, log);
  ok(log.some(e => e.type === 'setDown'), 'a gentle set-down in the zone');
  assert.equal(released?.type, 'released'); checks++;
  const done = log.find(e => e.type === 'jobDone');
  ok(done && done.job.id === job.id, 'the job is done');
  same(heliOf(session.profile).logbook.jobs.car, 1, 'logbook counts a delivered car once');
  same(heliOf(session.profile).logbook.jobs.crate, 0, 'car jobs are not crate jobs');
  ok(log.some(e => e.type === 'radio' && e.line === 'heli.radio.job.done'), 'with the radio line');
  ok(!log.some(e => e.type === 'delivered'), 'the player\'s own car is not involved');
  ok(!log.some(e => e.type === 'charged'), 'a clean set-down costs no repairs');
  return {session, job, done, saves, creditsBefore};
}

{
  const {session, job, done, creditsBefore} = flyJob();
  assert.equal(done.pay, 300); checks++;
  assert.equal(session.profile.credits, creditsBefore + 300, 'credits rise by 300'); checks++;
  same(heliOf(session.profile).jobs, {day: 1, taken: null, done: [job.id]}, 'the save marks it done and clears the job in hand');
  ok(session.boardJobs().find(j => j.id === job.id).done, 'the board shows it done');
  ok(session.view().loads.some(l => l.id === job.carId && !l.job && !l.own), 'the customer\'s car stays where it was set down');
  ok(carAt(session.profile, job.carId) === HOME_COURSE && !Object.hasOwn(heliOf(session.profile).carsAt, job.carId), 'nothing is saved about where it is');
  ok(session.raceHereOffer() === null, 'no Race here for a customer\'s car');
  ok(!session.takeJob(job.id).ok, 'and the board is only at home anyway');
  // Next visit, same day: the job cannot be taken again.
  const kept = session.leave();
  const again = newSession({profile: kept});
  const refused = again.takeJob(job.id);
  ok(!refused.ok && /done/.test(refused.reason), 'a done job cannot be taken again that day');
  ok(again.boardJobs().find(j => j.id === job.id).done, 'and shows as done');
  ok(again.takeJob(again.boardJobs().find(j => j.id !== job.id && j.id !== 'own').id).ok, 'but the other two can be');
  // Next play day: new jobs and nothing taken.
  const tomorrow = newSession({profile: kept, today: DAY2});
  const jobs2 = tomorrow.boardJobs();
  same(jobs2.slice(1).map(j => j.id), ['d2-1', 'd2-2', 'd2-3'], 'a new play day, new jobs');
  ok(jobs2.slice(1).every(j => !j.done && !j.taken), 'none done or taken');
  ok(JSON.stringify(jobs2.slice(1).map(j => [j.carId, j.from, j.to])) !== JSON.stringify(again.boardJobs().slice(1).map(j => [j.carId, j.from, j.to])), 'and they differ from yesterday\'s');
  ok(tomorrow.takeJob('d2-1').ok, 'a new job can be taken');
}

{
  const {session, done, creditsBefore} = flyJob({mode: 'real'});
  assert.equal(done.pay, 375); checks++;
  assert.equal(session.profile.credits, creditsBefore + 375, 'Real: credits rise by 375'); checks++;
}

{
  // A drop from height charges the repair and leaves the job in hand; hooking
  // the car again and setting it down properly finishes it.
  const {session, job, done} = flyJob({high: true});
  assert.equal(done.pay, 300); checks++;
  same(heliOf(session.profile).jobs, {day: 1, taken: null, done: [job.id]}, 'finished after the second, gentle set-down');
}

// A crash with the customer's car on the cable sends it back to its pick-up.
{
  const session = newSession({mode: 'real'});
  const job = session.boardJobs().find(j => j.from === HOME_COURSE && j.to === 'tremblant-snow');
  session.takeJob(job.id);
  ok(hookCar(session, 'job')?.type === 'hooked', 'hooked');
  const before = session.view().loads.find(l => l.job);
  const spot = {x: before.x, z: before.z};
  run(session, 20, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.zone.y + 40}));
  ok(session.view().load.hooked && !session.view().load.onGround, 'the customer car is in the air');
  const events = run(session, 60, () => ({lift: -1}), (v, seen) => seen.some(e => e.type === 'crashed' || e.type === 'touchdown'));
  ok(events.some(e => e.type === 'crashed'), 'the helicopter crashes');
  run(session, 4);
  ok(session.courseId === HOME_COURSE && session.phase === 'flying', 'back at the home pad');
  const back = session.view().loads.find(l => l.job);
  ok(back && !back.hooked && Math.hypot(back.x - spot.x, back.z - spot.z) < 0.5, 'the customer\'s car is back where it waited');
  assert.equal(heliOf(session.profile).jobs.taken, job.id, 'and the job is still in hand'); checks++;
  assert.equal(session.destination, 'tremblant-snow', 'pointing at the drop-off again'); checks++;
}

// A job left in hand is picked up again in the next visit.
{
  const first = newSession();
  const job = first.boardJobs().find(j => j.from === 'tremblant-snow');
  first.takeJob(job.id);
  const kept = first.leave();
  const next = newSession({profile: kept});
  assert.equal(next.view().job.id, job.id); checks++;
  assert.equal(next.destination, 'tremblant-snow', 'a new visit points at the pick-up'); checks++;
  const stale = newSession({profile: kept, today: DAY2});
  ok(stale.view().job === null && stale.destination === null, 'a job from an earlier play day is out of date');
  ok(stale.takeJob('d2-1').ok, 'and does not block a new one');
}

// ---- Race here ---------------------------------------------------------------
function flyOwnCar({owned}) {
  const session = newSession({profile: profileWith({owned})});
  ok(session.raceHereOffer() === null, 'no offer before anything is delivered');
  ok(session.takeJob('own').ok);
  session.setDestination('tremblant-snow');
  const log = [];
  ok(hookCar(session, 'own')?.type === 'hooked', 'hook the player\'s own car');
  carryAcross(session, log);
  const released = setDownAndRelease(session, log);
  ok(released?.type === 'released' && log.some(e => e.type === 'delivered' && e.courseId === 'tremblant-snow'), 'the car is delivered to Tremblant Snow');
  return {session, log};
}
{
  const {session} = flyOwnCar({owned: OWNED});
  same(session.raceHereOffer(), {courseId: 'tremblant-snow', carId: 'falcone_f42'}, 'Race here is offered on an owned course');
  assert.equal(carAt(session.profile, 'falcone_f42'), 'tremblant-snow'); checks++;
  // Hooking it again takes the offer back.
  run(session, 2, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.heli.y}));
  ok(hookCar(session, 'own')?.type === 'hooked' && session.raceHereOffer() === null, 'lifting the car again withdraws the offer');
}
{
  const {session} = flyOwnCar({owned: []});
  assert.equal(session.raceHereOffer(), null, 'no offer on a course that is not owned'); checks++;
  assert.equal(carAt(session.profile, 'falcone_f42'), 'tremblant-snow', 'the car is still delivered'); checks++;
}

// ---- the board in the page --------------------------------------------------
{
  const session = newSession({mode: 'real'});
  const view = session.view();
  ok(atHomePad(view), 'on the home pad on the ground');
  const markup = dispatchBoardMarkup(view, {jobs: session.boardJobs(), offer: session.raceHereOffer(), mode: session.mode});
  ok(markup.includes('class="heli-board"') && markup.includes('Dispatch board'), 'the panel');
  ok(/Fly my car/.test(markup) && markup.includes('data-heli-board="take:own"'), 'Fly my car is listed with a button');
  for (const job of session.boardJobs().slice(1)) {
    ok(markup.includes(jobTitle(job)) && markup.includes(`data-heli-board="take:${job.id}"`), `${job.id} is listed: ${jobTitle(job)}`);
    ok(markup.includes(`${jobPay(job, 'real')} credits`), `${job.id} shows ${jobPay(job, 'real')} credits in Real`);
  }
  ok(markup.includes('+25% in Real'), 'Real shows the bonus');
  ok(!markup.includes('Race here'), 'no Race here without an offer');
  const assisted = dispatchBoardMarkup(view, {jobs: newSession().boardJobs(), mode: 'assisted'});
  ok(!assisted.includes('+25% in Real') && assisted.includes('300 credits'), 'Assisted shows the plain pay');
  ok([...markup.matchAll(/class="([^"]*)"/g)].every(m => m[1].split(" ").every(name => name.startsWith("heli-board"))), "every class name starts with heli-board");
  // Only on the home pad's ground.
  const flying = {...view, heli: {...view.heli, onGround: false}};
  assert.equal(dispatchBoardMarkup(flying, {jobs: session.boardJobs()}), ''); checks++;
  assert.equal(dispatchBoardMarkup({...view, courseId: 'tremblant-snow'}, {jobs: session.boardJobs()}), ''); checks++;
  assert.equal(dispatchBoardMarkup({...view, phase: 'cruise'}, {jobs: session.boardJobs()}), ''); checks++;
  assert.equal(dispatchBoardMarkup(null, {jobs: session.boardJobs()}), ''); checks++;
  assert.equal(dispatchBoardMarkup(view, {jobs: []}), ''); checks++;
  // Race here shows wherever the offer is.
  const race = dispatchBoardMarkup(flying, {jobs: session.boardJobs(), offer: {courseId: 'tremblant-snow', carId: 'falcone_f42'}});
  ok(race.includes('data-heli-board="race-here"') && race.includes('Tremblant Snow') && !race.includes('Dispatch board'), 'Race here away from the pad');
  // A taken job offers to drop; a done job shows done; names are escaped.
  session.takeJob(session.boardJobs()[1].id);
  const taken = dispatchBoardMarkup(session.view(), {jobs: session.boardJobs(), mode: 'real'});
  ok(taken.includes('data-heli-board="drop"') && taken.includes('heli-board-taken'), 'a taken job offers Drop job');
  const odd = dispatchBoardMarkup(view, {jobs: [{id: 'own', own: true, carId: 'falcone_f42', title: 'x', pay: 0},
    {id: 'a"b', carId: 'falcone_f42', from: 'tremblant-woods', to: 'tremblant-snow', pay: 1, payNow: 1, done: true}]});
  ok(!odd.includes('a"b') && odd.includes('Done today'), 'markup is escaped');

  // The click handler drives the real session through the app's own hooks.
  const fresh = newSession();
  const log = [];
  let raced = null;
  const app = {heliSession: fresh, heliView: () => fresh.view(), _heliEvents: events => log.push(...events), raceHere: offer => { raced = offer; return true; }};
  const target = fresh.boardJobs()[2];
  ok(handleBoardAction(`take:${target.id}`, app).ok && heliOf(fresh.profile).jobs.taken === target.id, 'the Take job button takes the job');
  ok(log.some(e => e.type === 'jobTaken') && log.some(e => e.type === 'radio' && e.line === 'heli.radio.job.taken'), 'and its events reach the app');
  ok(!handleBoardAction(`take:${fresh.boardJobs()[3].id}`, app).ok, 'a second job is refused');
  ok(handleBoardAction('drop', app).dropped && heliOf(fresh.profile).jobs.taken === null, 'Drop job hands it back');
  ok(handleBoardAction('take:own', app).ok, 'Fly my car');
  assert.equal(handleBoardAction('race-here', app), false); checks++;
  assert.equal(raced, null, 'no Race here without an offer'); checks++;
  ok(!handleBoardAction('nonsense', app).ok && !handleBoardAction('take:own', {}).ok && !handleBoardAction(undefined, app).ok, 'unknown actions and no helicopter visit are refused');
  const flown = flyOwnCar({owned: OWNED}).session;
  handleBoardAction('race-here', {heliSession: flown, raceHere: offer => { raced = offer; return true; }});
  same(raced, {courseId: 'tremblant-snow', carId: 'falcone_f42'}, 'Race here hands the offer to the app');

  // createDispatchBoard with a minimal fake root.
  const handlers = [];
  const root = {innerHTML: '', hidden: true, addEventListener: (type, fn) => handlers.push([type, fn]), removeEventListener: () => {}};
  const board = createDispatchBoard({root, app});
  const drawn = board.render();
  ok(drawn.includes('Dispatch board') && root.innerHTML === drawn && root.hidden === false, 'the board draws into its root');
  const before = root.innerHTML;
  board.render();
  assert.equal(root.innerHTML, before); checks++;
  const click = {target: {closest: () => ({dataset: {heliBoard: `take:${fresh.boardJobs()[1].id}`}})}};
  handlers.find(([type]) => type === 'click')[1](click);
  ok(heliOf(fresh.profile).jobs.taken === fresh.boardJobs()[1].id && root.innerHTML.includes('Drop job'), 'a click takes the job and redraws');
  handlers.find(([type]) => type === 'click')[1]({target: {closest: () => null}});
  const away = {...app, heliSession: null, heliView: () => null};
  const gone = createDispatchBoard({root: {innerHTML: 'x', addEventListener() {}, removeEventListener() {}}, app: away});
  assert.equal(gone.render(), ''); checks++;
}

// The board never changes race state: it takes and reads the session only.
{
  const session = newSession();
  const before = JSON.stringify({...session.profile, heli: undefined, credits: undefined});
  dispatchBoardMarkup(session.view(), {jobs: session.boardJobs(), offer: session.raceHereOffer(), mode: session.mode});
  assert.equal(JSON.stringify({...session.profile, heli: undefined, credits: undefined}), before); checks++;
}

// ---- H4 Rescue: Summit Run as a destination (docs/HELI_RESCUE.md section 5.5) ----
{
  // What the tables gave before Summit Run joined: the 60 boards, the legs
  // and the answers about Summit Run with its switch off, from the code as it
  // stood at RESCUE-SAVE's merge.
  const before = [];
  for (let day = 0; day < 60; day++) before.push(dayJobs(day));
  before.push([legFuelKg('tremblant-woods', 'tremblant-snow'), legFuelKg('panorama-ridge', 'tremblant-woods'),
    legFuelKg('tremblant-snow', 'panorama-ridge'), legFuelKg('tremblant-woods', 'summit-run'), legFuelKg('summit-run', 'panorama-ridge')]);
  before.push(HELI_DESTINATIONS, JOB_ROUTES, JOB_CARS, isDestination('summit-run'), bearing('tremblant-woods', 'summit-run'),
    bearing('tremblant-woods', 'panorama-ridge'));
  assert.equal(heliHash(JSON.stringify(before)), 3257734403, 'with the switch off the boards, legs and destinations are unchanged'); checks++;
  same(Object.keys(HELI_DESTINATIONS), ['tremblant-woods', 'tremblant-snow', 'panorama-ridge'], 'H1\'s three destinations, in order');
  ok(destinationsFor() === HELI_DESTINATIONS && destinationsFor({summitRun: false}) === HELI_DESTINATIONS && destinationsFor({}) === HELI_DESTINATIONS, 'switch off: the H1 table');
  ok(!isDestination('summit-run') && !isDestination('summit-run', {summitRun: false}), 'switch off: not a destination');
  same([legFuelKg('tremblant-woods', 'summit-run'), legFuelKg('summit-run', 'panorama-ridge'), legFuelKg('summit-run', 'summit-run')], [null, null, null], 'switch off: no legs');
  same(bearing('tremblant-woods', 'summit-run'), null, 'switch off: no bearing');

  // Switch on.
  same(Object.keys(HELI_DESTINATIONS_WITH_SUMMIT), ['tremblant-woods', 'tremblant-snow', 'panorama-ridge', 'summit-run'], 'four destinations');
  ok(destinationsFor({summitRun: true}) === HELI_DESTINATIONS_WITH_SUMMIT && Object.isFrozen(HELI_DESTINATIONS_WITH_SUMMIT) && Object.isFrozen(SUMMIT_RUN), 'switch on: the four-place table, frozen');
  same({id: SUMMIT_RUN.id, name: SUMMIT_RUN.name, baseAltitude: SUMMIT_RUN.baseAltitude, home: SUMMIT_RUN.home},
    {id: 'summit-run', name: 'Summit Run', baseAltitude: 2860, home: false}, 'the real start of the Pikes Peak road');
  ok(isDestination('summit-run', {summitRun: true}) && isDestination('panorama-ridge', {summitRun: true}) && !isDestination('titan-arena', {summitRun: true}), 'switch on: Summit Run is a destination');
  const on = {summitRun: true};
  same([legFuelKg('tremblant-woods', 'summit-run', on), legFuelKg('summit-run', 'tremblant-woods', on)], [160, 160], 'Woods and Summit Run, both ways');
  same([legFuelKg('tremblant-snow', 'summit-run', on), legFuelKg('summit-run', 'tremblant-snow', on)], [150, 150], 'Tremblant Snow and Summit Run, both ways');
  same([legFuelKg('panorama-ridge', 'summit-run', on), legFuelKg('summit-run', 'panorama-ridge', on)], [90, 90], 'Panorama Ridge and Summit Run, both ways');
  same([legFuelKg('tremblant-woods', 'tremblant-snow', on), legFuelKg('panorama-ridge', 'tremblant-woods', on), legFuelKg('tremblant-snow', 'panorama-ridge', on)], [25, 120, 110], 'H1\'s legs are the same');
  ok([160, 150, 90].every(kg => kg < 400), 'every leg can be flown on one tank');
  const toSummit = bearing('panorama-ridge', 'summit-run', on);
  ok(toSummit.x < 0 && toSummit.z > 0, 'north-west of Panorama Ridge on the small map (north is +z)');
  near(Math.hypot(toSummit.x, toSummit.z), 1, 1e-9, 'a unit vector');
  const back = bearing('summit-run', 'panorama-ridge', on);
  near(back.x, -toSummit.x, 1e-9, 'the way back faces the other way'); near(back.z, -toSummit.z, 1e-9, 'the way back faces the other way');
  same(bearing('tremblant-woods', 'panorama-ridge', on), bearing('tremblant-woods', 'panorama-ridge'), 'H1 bearings unchanged');
  ok(bearing('tremblant-woods', 'summit-run') === null && bearing('summit-run', 'summit-run', on) === null, 'no bearing to itself');

  // The board's everyday jobs stay on H1's three routes, either way.
  ok([...JOB_ROUTES].every(r => r.from !== 'summit-run' && r.to !== 'summit-run'), 'no everyday route to Summit Run');
  ok(Array.from({length: 60}, (_, day) => dayJobs(day)).flat().every(j => j.from !== 'summit-run' && j.to !== 'summit-run'), 'no board job goes to Summit Run');
}

// ---- H4 Rescue: the car recovery job (docs/HELI_RESCUE.md section 5.3) ----
{
  same({...RECOVERY}, {pay: 500, days: 3}, 'it pays 500 and stays 3 play days');
  assert.equal(RECOVERY.days, WRECK_DAYS); checks++;
  const wreck = wreckFor({seed: 12345, courseId: 'panorama-ridge', x: -120.5, z: 880, day: 20});
  same({...wreck, carId: undefined}, {courseId: 'panorama-ridge', carId: undefined, x: -120.5, z: 880, day: 20}, 'the wreck is where the rescue left it');
  ok(JOB_CARS.includes(wreck.carId) && !AIR_ONLY_CARS.includes(wreck.carId) && liftCheck(wreck.carId).ok, 'a customer car Kestrel One can lift');
  same(wreckFor({seed: 12345, courseId: 'panorama-ridge', x: -120.5, z: 880, day: 20}), wreck, 'same seed, same car');
  const cars = new Set(Array.from({length: 60}, (_, k) => wreckFor({seed: k * 104729, courseId: 'panorama-ridge', x: 0, z: 0, day: 1}).carId));
  ok(cars.size >= 4 && [...cars].every(id => JOB_CARS.includes(id)), `different seeds leave different cars (${cars.size})`);

  // On the board from the day after the rescue, for 3 play days.
  same([19, 20].map(day => recoveryJob(wreck, day)), [null, null], 'not on the day of the rescue or before');
  same([21, 22, 23].map(day => recoveryJob(wreck, day) !== null), [true, true, true], 'the next three play days');
  same([24, 25, 99].map(day => recoveryJob(wreck, day)), [null, null, null], 'then it leaves');
  same(recoveryJob(null, 21), null, 'no wreck, no job');
  same(recoveryJob(wreck, NaN), null, 'a damaged day gives no job');
  const job = recoveryJob(wreck, 21);
  same({...job}, {id: `w20-${wreck.carId}`, kind: 'recovery', carId: wreck.carId, from: 'panorama-ridge', to: 'panorama-ridge', pay: 500, x: -120.5, z: 880}, 'the job');
  ok(Object.isFrozen(job) && /^[a-z0-9:_-]+$/.test(job.id), 'frozen, with a save-safe id');
  assert.equal(recoveryTitle(job), `Recover the ${CARS[wreck.carId].name} from Panorama Ridge`); checks++;
  same([jobPay(job, 'assisted'), jobPay(job, 'real')], [500, 625], 'paid as a dispatch job: Real pays a quarter more');

  // Through the save: appears the next play day, pays once, leaves after 3 play days.
  const day = n => `2026-11-${String(n).padStart(2, '0')}`;
  const base = count => ({credits: 100, heli: normalizeHeli({...createHeli(), playDay: {last: day(count), count}, missions: {...createMissions(), wreck}})});
  const rescued = base(20);
  same(recoveryJobOf(rescued, {enabled: true}), null, 'not on the day of the rescue');
  same(recoveryJobOf(base(22)), null, 'switch off: no job');
  let profile = rescued;
  const seen = [];
  for (let count = 21; count <= 25; count++) {
    profile = notePlayDay(profile, day(count), {enabled: true}).profile;
    assert.equal(heliOf(profile).playDay.count, count); checks++;
    seen.push(recoveryJobOf(profile, {enabled: true}) !== null);
  }
  same(seen, [true, true, true, false, false], 'the job is there on play days 21 to 23 and gone on 24');
  same(missionsOf(profile).wreck, null, 'the save removed the wreck when it was more than 3 days old');
  assert.equal(finishRecovery(base(22), {enabled: false}).ok, false, 'switch off: no recovery'); checks++;
  assert.equal(finishRecovery(base(22), {enabled: false}).profile.credits, 100, 'switch off: no pay'); checks++;

  const paid = finishRecovery(base(22), {enabled: true});
  ok(paid.ok && paid.paid === 500 && paid.profile.credits === 600 && paid.job.id === job.id, 'it pays 500');
  same(missionsOf(paid.profile).wreck, null, 'the wreck leaves the save');
  assert.equal(finishRecovery(paid.profile, {enabled: true}).ok, false, 'never twice'); checks++;
  assert.equal(finishRecovery(base(22), {enabled: true, mode: 'real'}).paid, 625); checks++;
  assert.equal(finishRecovery(base(20), {enabled: true}).ok, false, 'not on the day of the rescue'); checks++;
  assert.equal(finishRecovery(base(24), {enabled: true}).ok, false, 'not after it has left the board'); checks++;
  assert.equal(finishRecovery({credits: 999_999_900, heli: base(22).heli}, {enabled: true}).profile.credits, 1_000_000_000, 'capped like every credit change'); checks++;
  assert.equal(finishRecovery({credits: 5, heli: createHeli()}, {enabled: true}).ok, false, 'no wreck, no job'); checks++;
  // It sits beside the day's three jobs; they do not move.
  same(dayJobs(22).map(j => j.id), ['d22-1', 'd22-2', 'd22-3'], 'the board\'s three jobs do not move');
}

// Return boards are repeatable, affordable to fly, and independent of car jobs.
{
  const options = {summitRun: true, pilotMap: true, table: true};
  const placeKey = id => placeOfCourse(id)?.id ?? id;
  const fuelPrice = (from, to) => Math.max(1.5, fuelPadAt(placeKey(from))?.pricePerKg ?? 0,
    fuelPadAt(placeKey(to))?.pricePerKg ?? 0);
  for (const from of Object.keys(destinationsFor(options))) for (const to of Object.keys(destinationsFor(options))) {
    const fuel = legFuelKg(from, to, options);
    if (fuel === null || fuel > 400) {
      same(returnLoadPay(from, to, options), null, 'same pad and legs beyond a full tank are not offered');
      continue;
    }
    const original = JOB_ROUTES.find(route => [route.from, route.to].sort().join('|') === [from, to].sort().join('|'));
    const carPay = original?.pay ?? mapJobPay(mapDistanceKm(placeKey(from), placeKey(to)));
    const floor = Math.max(carPay * .6, fuel * fuelPrice(from, to) * 1.25);
    const pay = returnLoadPay(from, to, options);
    same(pay, Math.ceil(floor / 10) * 10, `settled pay for ${from} to ${to}`);
    ok(pay >= floor && pay < floor + 10 && pay % 10 === 0, 'round up to the next 10 without excess');
    ok(pay > fuel * fuelPrice(from, to), 'every leg covers the dearest endpoint pump');
    same(returnLoadPay(to, from, options), pay, 'same pay in either direction');
  }
  same(returnLoadPay('pacific-canyon', 'red-mesa', options), 340, 'Claude\'s premium-pump example');
  for (let day = 0; day < 30; day++) for (const from of Object.keys(destinationsFor({...options, table: false})))
    same(returnLoadJob(day, from, options), returnLoadJob(day, from, {...options, table: false}), 'Table discovery cannot change an advertised job');
  for (let day = 0; day < 30; day++) for (const from of Object.keys(destinationsFor(options))) {
    const job = returnLoadJob(day, from, options);
    if (from === HOME_COURSE) { same(job, null, 'home keeps its dispatch board'); continue; }
    ok(job, `a return load at ${from}`);
    same(job, returnLoadJob(day, from, options), 'same day and place, same crate');
    ok(job.massKg >= 300 && job.massKg <= 600, 'crate within settled weight');
    const fuel = legFuelKg(from, job.to, options);
    ok(fuel <= 400 && job.pay > fuel * fuelPrice(from, job.to), 'pay exceeds fuel at the dearest endpoint pump');
    same(job.pay, returnLoadPay(from, job.to, options), 'the seeded job uses the revised leg pay');
    same(jobPay(job, 'real'), Math.round(job.pay * 1.25), 'Real adds 25 percent');
  }
  const profile = profileWith({heli: {playDay: {last: DAY1, count: 4}}});
  const job = returnLoadJob(4, 'tremblant-snow');
  const paid = finishReturnLoad(profile, {...job, pay: 1e9});
  same(paid.paid, job.pay, 'pay comes from the seeded job, never caller numbers');
  same(finishReturnLoad(paid.profile, job).ok, false, 'cannot pay twice');
  same(finishReturnLoad(profile, {...job, id: 'stale'}).ok, false, 'reject stale jobs');
  const tomorrow = notePlayDay(paid.profile, DAY2, {enabled: true}).profile;
  ok(finishReturnLoad(tomorrow, returnLoadJob(5, job.from)).ok, 'the next play day opens a new load');
  ok(returnLoadTitle(job).includes('Tremblant Snow'), 'both ends named');
}

// Actual fixed-step flight: hook at Snow, cruise home, set down and pay once.
for (const day of [1, 2]) {
  const session = createHeliSession({profile: profileWith({owned: OWNED, heli: {fuelKg: 400,
    playDay: {last: DAY1, count: day}}}), enabled: true, logbookEnabled: true, loadCourse, today: DAY1});
  session.start('tremblant-snow');
  const board = session.view().returnLoad;
  same(board.to, day === 1 ? HOME_COURSE : 'panorama-ridge', 'exercise home and onward routes');
  ok(board && !board.done, 'away arrival has a board');
  ok(arrivalMarkup(session.view(), [], session.profile).includes(board.sender), 'arrival names the sender');
  ok(arrivalMarkup(session.view(), [], session.profile).includes('credits'), 'arrival shows pay');
  const crate = () => session.view().loads.find(load => load.returnJob);
  run(session, 60, v => pilot(v, {x: crate().x, z: crate().z, y: crate().y + 15.2}, {speed: 4}),
    v => Math.hypot(v.heli.x - crate().x, v.heli.z - crate().z) < 1 && Math.abs(v.heli.y - crate().y - 15.2) < .6 &&
      Math.hypot(v.heli.vx, v.heli.vy, v.heli.vz) < .5);
  same(session.pressHook()?.type, 'hooked', 'hook the return crate');
  same(session.destination, board.to, 'hook sets the destination');
  const log = [];
  carryAcross(session, log);
  const before = session.profile.credits;
  same(setDownAndRelease(session, log)?.type, 'released', 'set the crate down cleanly');
  same(session.profile.credits, before + board.payNow, 'scripted return flight paid');
  same(heliOf(session.profile).logbook.jobs.crate, 1, 'logbook counts a completed return crate once');
  same(heliOf(session.profile).logbook.jobs.car, 0, 'return loads are not car jobs');
  same(heliOf(session.profile).returnLoads[board.from], board.day, 'completion saved');
  ok(!session.view().loads.some(load => load.returnJob?.id === board.id), 'finished crate removed');
  if (day === 2) {
    const onward = session.view().returnLoad;
    ok(!onward.done && session.view().loads.some(load => load.returnJob?.id === onward.id), 'onward pad immediately supplies its own advertised crate');
  }
  session.start(board.from);
  ok(session.view().returnLoad.done, 'revisit shows completion');
  ok(arrivalMarkup(session.view(), [], session.profile).includes('Nothing more today. The board fills again tomorrow.'), 'done board wording');
  ok(!session.view().loads.some(load => load.returnJob), 'no second crate today');
}

// Supply missions keep idle local return cargo off the hook until the run
// clears, without taking cargo the pilot has already picked up.
for (const held of [false, true]) {
  const base = profileWith({owned: [...OWNED, 'summit-run'], heli: {fuelKg: 400, refuels: 3,
    playDay: {last: DAY1, count: 30}}});
  const armed = armMissions(createMissions(), {date: DAY1, playerName: 'Return QA'});
  const profile = setMissions(base, {...armed, count: armed.need,
    call: {kind: 'supply', id: `supply-${armed.draws}`, courseId: 'summit-run', day: 30, answered: false}}, {enabled: true}).profile;
  const session = createHeliSession({profile, enabled: true, loadCourse, loadFireCourse: loadCourse, today: DAY1,
    fireEnabled: true, rescueEnabled: true, summitRunEnabled: true, playerName: 'Return QA'});
  session.start('summit-run');
  const crate = () => session.view().loads.find(load => load.returnJob);
  ok(crate(), 'return crate waits before answering the supply call');
  const job = crate().returnJob;
  if (held) {
    run(session, 60, v => pilot(v, {x: crate().x, z: crate().z, y: crate().y + 15.2}, {speed: 4}),
      v => Math.hypot(v.heli.x - crate().x, v.heli.z - crate().z) < 1 && Math.abs(v.heli.y - crate().y - 15.2) < .6 &&
        Math.hypot(v.heli.vx, v.heli.vy, v.heli.vz) < .5);
    same(session.pressHook()?.type, 'hooked', 'pick up return cargo before answering');
  }
  const wallet = session.profile.credits;
  ok(session.pressRadio(), 'answer the supply call');
  same(session.view().rescue.active.kind, 'supply', 'supply mission started');
  same(!!crate(), held, 'only idle local return cargo is stowed');
  if (held) ok(crate().hooked && crate().returnJob.id === job.id, 'held return cargo survives unchanged');
  same(session.view().rescue.crates.length, 3, 'all three supply crates remain available');
  same(session.profile.credits, wallet, 'stowing cargo never changes credits');
  same(heliOf(session.profile).returnLoads, undefined, 'stowing never completes the return job');
  session.leave();
  ok(crate()?.returnJob.id === job.id, 'eligible return cargo remains available when the supply mission clears');
  same(heliOf(session.profile).returnLoads, undefined, 'clearing the mission never completes the return job');
}

console.log(`test-heli-jobs: ${checks} checks passed`);
