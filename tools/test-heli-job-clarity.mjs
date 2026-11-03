// HELI-JOB-CLARITY (Kyle, 31 October 2026): the job card and hook prompt words (D1, D2), where a new visit starts (D3),
// the customer's car beside the pad (D4), jobs that name only legs the pilot can fly and Drop job anywhere (D5), and the
// ski card's words (D6). Memory-only: no real save is read or written.
import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {COURSE} from '../src/config.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {createHeli, normalizeHeli, heliOf, lastPadOf, setLastPad} from '../src/heli/heli-save.js';
import {HOME_COURSE, JOB_ROUTES, JOB_RESERVE_KG, dayJobs, destinationsFor, legFuelKg, returnLoadJob, jobLegFlyable, fuelOnGround,
  pumpCourses} from '../src/heli/heli-jobs.js';
import {createHeliSession, courseSite} from '../src/heli/heli-session.js';
import {jobCardText, hookPromptText, flyToWords, jobCardMarkup, JOB_KEYS} from '../src/heli/heli-job-card.js';
import {landedArrival} from '../src/heli/heli-ui.js';
import {legFuelKgMap, placeOfCourse} from '../src/heli/pilot-map-data.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };

const worlds = new Map();
function loadCourse(id) {
  if (!worlds.has(id)) {
    const course = new Course(ALL_CIRCUITS.find(def => def.id === id) ?? COURSE.find(def => def.id === id), 1989);
    worlds.set(id, {course, ground: groundFromCourse(course)});
  }
  return worlds.get(id);
}
function pilot(view, target, {speed = 6} = {}) {
  const h = view.heli, fx = Math.sin(h.heading), fz = Math.cos(h.heading), c = v => Math.max(-1, Math.min(1, v));
  const dx = target.x - h.x, dz = target.z - h.z, d = Math.hypot(dx, dz), want = Math.min(speed, d * 0.4);
  const ex = (d > 0.01 ? dx / d * want : 0) - h.vx, ez = (d > 0.01 ? dz / d * want : 0) - h.vz;
  return {pitch: c((ex * fx + ez * fz) * 0.25), roll: c((ex * -fz + ez * fx) * 0.25), lift: c((target.y - h.y) * 0.3 - h.vy * 0.3), yaw: 0};
}
function run(session, seconds, controls = () => ({}), until = null) {
  for (let i = 0; i < Math.round(seconds * 120); i++) {
    session.step(controls(session.view()));
    if (until?.(session.view())) return true;
  }
  return false;
}
const TRAINED = Object.freeze({liftoff: true, hover: true, landing: true, carry: true});
const OWNED = ['tremblant-woods', 'tremblant-snow', 'panorama-ridge', 'summit-run'];
const DAY1 = '2026-10-14';
function profileWith({credits = 3000, owned = OWNED, heli = {}} = {}) {
  return normalizeProfile({...createProfile(), credits, courses: {version: 1, unlocked: owned},
    heli: {version: 1, fuelKg: 400, refuels: 1, lessons: TRAINED, ...heli}});
}
const released = {fireEnabled: true, rescueEnabled: true, summitRunEnabled: true, pilotMapEnabled: true, koganePassEnabled: true,
  heliSkiingEnabled: true, logbookEnabled: true};
const session = (profile, extra = {}) => createHeliSession({profile, enabled: true, loadCourse, loadFireCourse: loadCourse,
  today: DAY1, carId: 'falcone_f42', ...released, ...extra});

// ---- D3: the helicopter save's lastPad field ------------------------------------------------------------------
{
  const old = {version: 1, fuelKg: 120, lessons: TRAINED, playDay: {last: DAY1, count: 3}, jobs: {day: 3, taken: null, done: []},
    carsAt: {falcone_f42: 'panorama-ridge'}, refuels: 2, flights: 4};
  const read = normalizeHeli(old);
  ok(!Object.hasOwn(read, 'lastPad'), 'an older save reads with no lastPad field');
  same(read, normalizeHeli(JSON.parse(JSON.stringify(old))), 'an older save loads unchanged');
  same(lastPadOf({heli: old}), HOME_COURSE, 'an older save starts at the home pad');
  same(lastPadOf({}), HOME_COURSE, 'a new save starts at the home pad');
  ok(!Object.hasOwn(createHeli(), 'lastPad'), 'a new helicopter has no lastPad field');
  const moved = setLastPad({heli: old}, 'panorama-ridge', {enabled: true});
  ok(moved.ok, 'lastPad is set');
  same(heliOf(moved.profile).lastPad, 'panorama-ridge', 'lastPad names the place');
  const round = {heli: normalizeHeli(JSON.parse(JSON.stringify(moved.profile.heli)))};
  same(lastPadOf(round), 'panorama-ridge', 'lastPad survives a save and load');
  same(heliOf(round).carsAt, old.carsAt, 'the rest of the save is untouched');
  ok(!Object.hasOwn(heliOf(setLastPad(moved.profile, HOME_COURSE, {enabled: true}).profile), 'lastPad'), 'home removes the field again');
  same(setLastPad({heli: old}, HOME_COURSE, {enabled: true}).profile, {heli: old}, 'home on a save without the field changes nothing');
  same(setLastPad({heli: old}, 'nowhere', {enabled: true}).ok, false, 'an unknown place is refused');
  same(setLastPad({heli: old}, 'panorama-ridge', {enabled: false}).ok, false, 'nothing with the switch off');
  ok(!Object.hasOwn(normalizeHeli({...old, lastPad: 'not-a-course'}), 'lastPad'), 'a bad lastPad is dropped');
  ok(!Object.hasOwn(normalizeHeli({...old, lastPad: 42}), 'lastPad'), 'a lastPad that is not a name is dropped');
}

// ---- D3: a new visit starts where the helicopter last stood -------------------------------------------------------
{
  const first = session(profileWith());
  first.start();
  same(first.courseId, HOME_COURSE, 'a new save starts at the home pad');
  ok(!Object.hasOwn(heliOf(first.profile), 'lastPad'), 'standing at home writes nothing');
  first.start('panorama-ridge');
  same(lastPadOf(first.profile), 'panorama-ridge', 'standing on a pad notes it');
  first.leave();
  const next = session(first.profile);
  next.start();
  same(next.courseId, 'panorama-ridge', 'the next visit starts at the last pad, not the home pad');
  ok(next.view().heli.onGround, 'on the ground there');
  // A pilot still in lessons, or a place that is not a destination now, starts at home.
  const learner = session(normalizeProfile({...profileWith(), heli: {...profileWith().heli, lessons: {liftoff: true}, lastPad: 'panorama-ridge'}}));
  learner.start();
  same(learner.courseId, HOME_COURSE, 'a pilot in lessons starts at home');
  const mapOff = session(profileWith({heli: {lastPad: 'red-mesa'}}), {pilotMapEnabled: false});
  mapOff.start();
  same(mapOff.courseId, HOME_COURSE, 'a place that is not a destination now starts at home');
  // A car job taken at home still works when the visit starts elsewhere: the way leads to the pick-up.
  const board = session(profileWith());
  board.start();
  const job = board.boardJobs().find(item => !item.own && item.carId && item.from === HOME_COURSE);
  ok(board.takeJob(job.id).ok, 'take a job at home');
  board.start('panorama-ridge');
  const away = session(board.profile);
  away.start();
  same(away.courseId, 'panorama-ridge', 'the visit starts at the last pad with a job in hand');
  same(away.destination, HOME_COURSE, 'the way leads back to the pick-up');
  same(away.jobStatus().stage, 'fly', 'the card says to fly to the pick-up');
}

// ---- D4: the customer's car stands beside the pad, in sight --------------------------------------------------------
{
  const options = {summitRun: true, pilotMap: true, koganePass: true};
  for (const id of Object.keys(destinationsFor(options))) {
    const {course, ground} = loadCourse(id);
    const site = courseSite(course, ground, id, {...options, summitRescue: true});
    ok(site.parking && site.spare, `${id} has room for a car beside the pad`);
    ok(Math.hypot(site.parking.x - site.zone.x, site.parking.z - site.zone.z) > site.zone.radius, `${id}: the car spot is outside the landing circle`);
  }
  // The 959 Kyle took: a pick-up on the pilot's map. Its car waits on the parking spot, not under the helicopter.
  const home = session(profileWith({owned: [...OWNED, 'pacific-canyon']}));
  home.start();
  const job = home.boardJobs().find(item => item.carId && item.from === 'pacific-canyon') ??
    home.boardJobs().find(item => !item.own && item.carId && item.from !== HOME_COURSE);
  ok(home.takeJob(job.id).ok, 'take a job with a pick-up away from home');
  const pickUp = session(home.profile);
  pickUp.start(job.from);
  const v = pickUp.view(), car = v.loads.find(load => load.job === job.id);
  ok(car && car.id === job.carId, 'the customer car is at the pick-up');
  ok(Math.hypot(car.x - v.parking.x, car.z - v.parking.z) < 0.01, 'on the parking spot beside the pad');
  ok(Math.hypot(car.x - v.zone.x, car.z - v.zone.z) > v.zone.radius, 'not in the landing circle');
  same(pickUp.jobStatus().stage, 'hook', 'the card says to hook it');
}

// ---- D5: jobs name only legs the pilot can fly, and every taken job can be dropped ----------------------------------
{
  const map = {summitRun: true, pilotMap: true};
  same(pumpCourses({summitRun: true}), [HOME_COURSE], 'with the map off the home pump is the only one');
  ok(pumpCourses(map).includes('pacific-canyon') && !pumpCourses(map).includes('summit-run'), 'the far pumps join with the map; Summit\'s truck does not');
  same(fuelOnGround(HOME_COURSE, map), 400, 'a full tank at a pump');
  same(fuelOnGround('tremblant-snow', {summitRun: true}), 400 - 25 - JOB_RESERVE_KG, 'elsewhere: a full tank less the leg there and its ends');
  ok(!jobLegFlyable('summit-run', 'eifel-crown', {...map, koganePass: true}), 'Summit Run to Eifel Crown (Kyle\'s crate) is not a job');
  ok(jobLegFlyable(HOME_COURSE, 'panorama-ridge', {summitRun: true}) && jobLegFlyable('panorama-ridge', HOME_COURSE, {summitRun: true}),
    'the first slice\'s round trip stays a job both ways');
  for (const route of JOB_ROUTES) ok(jobLegFlyable(route.from, route.to, {summitRun: true}), `the original route ${route.from} to ${route.to} is flyable`);
  const mapFuel = (a, b) => legFuelKgMap(placeOfCourse(a)?.id ?? a, placeOfCourse(b)?.id ?? b);
  const owned = Object.keys(destinationsFor(map));
  for (let day = 0; day < 40; day++) {
    for (const job of dayJobs(day, {pilotMap: true, owned}))
      ok(JOB_ROUTES.some(route => route.from === job.from && route.to === job.to) || jobLegFlyable(job.from, job.to, map, mapFuel),
        `day ${day}: the car job ${job.from} to ${job.to} is flyable`);
    for (const options of [map, {...map, koganePass: true}, {summitRun: true}])
      for (const from of Object.keys(destinationsFor(options))) {
        const crate = returnLoadJob(day, from, options);
        if (crate) ok(jobLegFlyable(from, crate.to, options) && legFuelKg(from, crate.to, options) !== null, `day ${day}: the crate from ${from} is flyable`);
      }
  }
  // Drop job, away from home: no pay, no charge, the job back on the board.
  const home = session(profileWith());
  home.start();
  const job = home.boardJobs().find(item => !item.own && item.carId && item.from !== HOME_COURSE);
  home.takeJob(job.id);
  home.start(job.from);
  const credits = home.profile.credits;
  same(home.dropJob().ok, false, 'the board\'s own Drop job is still at the home pad only');
  const dropped = home.dropJobHere();
  ok(dropped.ok && dropped.dropped, 'the job card drops the job here');
  same(home.job, null, 'no job in hand');
  same(home.jobStatus(), null, 'the card goes away');
  ok(!home.view().loads.some(load => load.job), 'the customer car goes back');
  same(home.profile.credits, credits, 'no pay and no charge');
  ok(home.takeEvents().some(event => event.type === 'jobDropped'), 'the drop is told');
  const back = session(home.profile);
  back.start(HOME_COURSE);
  ok(back.boardJobs().some(item => item.id === job.id && !item.taken && !item.done), 'the job is on the board again');
  same(back.dropJobHere().dropped, false, 'nothing to drop');
}

// ---- D5: a crate is a job from its first hook to delivery; it can be dropped ---------------------------------------
{
  const s = session(profileWith({heli: {playDay: {last: DAY1, count: 1}}}));
  s.start('tremblant-snow');
  same(s.jobStatus(), null, 'a crate beside the pad is an offer, not yet a job');
  const crate = () => s.view().loads.find(load => load.returnJob);
  ok(run(s, 60, v => pilot(v, {x: crate().x, z: crate().z, y: crate().y + 15.2}, {speed: 4}),
    v => Math.hypot(v.heli.x - crate().x, v.heli.z - crate().z) < 1 && Math.abs(v.heli.y - crate().y - 15.2) < .6 && Math.hypot(v.heli.vx, v.heli.vy, v.heli.vz) < .5),
  'hover over the crate');
  same(s.hookPrompt(), {kind: 'hook', ready: true}, 'the prompt says H hooks it now');
  same(s.pressHook()?.type, 'hooked', 'hook the crate');
  const status = s.jobStatus();
  same([status.kind, status.stage, status.from, status.to], ['crate', 'carry', 'tremblant-snow', crate().returnJob.to], 'the crate is the job in hand');
  same(s.hookPrompt(), null, 'no prompt while carrying away from a landing circle');
  const credits = s.profile.credits;
  same(s.dropJobHere(), {ok: false, reason: 'Set the load down first'}, 'a crate on the cable is set down before the job is dropped');
  same(s.jobStatus().kind, 'crate', 'the crate is still the job');
  same(s.pressHook()?.type, 'released', 'set it down');
  ok(s.dropJobHere().dropped, 'drop the crate job');
  same(s.jobStatus(), null, 'no job in hand');
  const back = s.view().loads.filter(load => load.returnJob);
  same(back.length, 1, 'one crate, back at its own pad');
  const spot = s.view().crate;
  ok(Math.hypot(back[0].x - spot.x, back[0].z - spot.z) < 0.01 && !back[0].hooked, 'on the crate spot beside the pad, ready to take again');
  same(s.profile.credits, credits, 'no pay and no charge');
  same(heliOf(s.profile).returnLoads, undefined, 'a dropped crate is not done: it can be taken again');
}

// ---- Review fix: Drop job drops the job the card shows -------------------------------------------------------------
{
  // A car job in hand (its pick-up at home), and at Tremblant Snow a crate hooked and set down: the card shows the car
  // job, so Drop job drops the car job and leaves the crate as the job in hand.
  const home = session(profileWith({heli: {playDay: {last: DAY1, count: 1}}}));
  home.start();
  const job = home.boardJobs().find(item => !item.own && item.carId && item.from === HOME_COURSE);
  ok(home.takeJob(job.id).ok, 'take a car job');
  home.start('tremblant-snow');
  const crate = () => home.view().loads.find(load => load.returnJob);
  ok(run(home, 60, v => pilot(v, {x: crate().x, z: crate().z, y: crate().y + 15.2}, {speed: 4}),
    v => Math.hypot(v.heli.x - crate().x, v.heli.z - crate().z) < 1 && Math.abs(v.heli.y - crate().y - 15.2) < .6 && Math.hypot(v.heli.vx, v.heli.vy, v.heli.vz) < .5),
  'hover over the crate');
  same(home.pressHook()?.type, 'hooked', 'hook the crate');
  same(home.pressHook()?.type, 'released', 'set it down');
  same(home.jobStatus().kind, 'car', 'the card shows the car job');
  ok(home.dropJobHere().dropped, 'Drop job');
  same(home.job, null, 'the car job is the one dropped');
  same(home.jobStatus().kind, 'crate', 'the crate is still in hand');
}

// ---- Review fix: a hooked car is set down before its job is dropped; retaking makes no second car -------------------
{
  const s = session(profileWith({heli: {playDay: {last: DAY1, count: 1}}}));
  s.start();
  const job = s.boardJobs().find(item => !item.own && item.carId && item.from === HOME_COURSE);
  ok(s.takeJob(job.id).ok, 'take a job whose car waits at home');
  const car = () => s.view().loads.find(load => load.job === job.id);
  ok(run(s, 60, v => pilot(v, {x: car().x, z: car().z, y: car().y + 15.2}, {speed: 4}),
    v => Math.hypot(v.heli.x - car().x, v.heli.z - car().z) < 1 && Math.abs(v.heli.y - car().y - 15.2) < .6 && Math.hypot(v.heli.vx, v.heli.vy, v.heli.vz) < .5),
  'hover over the car');
  same(s.pressHook()?.type, 'hooked', 'hook the car');
  same(s.dropJobHere(), {ok: false, reason: 'Set the load down first'}, 'not dropped with the car on the cable');
  ok(s.job?.id === job.id && car()?.hooked, 'the job and the car on the cable are kept');
  same(s.pressHook()?.type, 'released', 'set the car down');
  ok(s.dropJobHere().dropped, 'then the job drops');
  same(s.view().loads.filter(load => load.id === job.carId && !load.own).length, 0, 'the customer car goes back');
  run(s, 60, v => pilot(v, {x: v.zone.x, z: v.zone.z, y: v.zone.y - 3, speed: 2}), v => v.heli.onGround && Math.hypot(v.heli.x - v.zone.x, v.heli.z - v.zone.z) < 10);
  ok(s.takeJob(job.id).ok, 'take it again at the pad');
  same(s.view().loads.filter(load => load.id === job.carId && !load.own).length, 1, 'one customer car, not two');
}

// ---- D1: the job card's words, one stage at a time (pure) ---------------------------------------------------------
{
  const car = {kind: 'car', carId: 'stuttgart_959s', from: 'pacific-canyon', to: 'panorama-ridge', pay: 2800, bonus: 700, again: false};
  const flyTo = ['tremblant-woods', 'tremblant-snow', 'panorama-ridge', 'summit-run'];
  const card = stage => jobCardText({...car, stage, flyTo: stage === 'fly' ? car.from : car.to}, {flyToList: flyTo});
  same(card('fly').next, "Fly to Pacific Canyon Circuit (on the Pilot's map, press N).", 'fly to a pick-up on the map');
  same(card('hook').next, 'Hook the Stuttgart 959-S beside the pad: hover low over it and press H.', 'hook');
  same(card('carry').next, 'Carrying. Fly to Panorama Ridge.', 'carry to a Fly To place');
  same(card('land').next, 'Carrying. Fly to the landing circle at Panorama Ridge.', 'over the drop-off course');
  same(card('drop').next, 'Lower it onto the pad and press H to let go.', 'let go');
  same(card('hook').note, 'H hooks and H lets go.', 'one key does both, and the card says so');
  same([card('fly').what, card('fly').route, card('fly').pay], ['Stuttgart 959-S', 'Pacific Canyon Circuit to Panorama Ridge',
    'Pays 2,800 credits, +700 for a clean delivery'], 'what, from where to where, the pay');
  ok(card('fly').drop, 'Drop job on the card');
  same(jobCardText({...car, stage: 'hook', again: true}).next, 'Hook the Stuttgart 959-S again: hover low over it and press H.', 'hook again after a drop');
  same(jobCardText(null, {delivered: {pay: 2100}}).next, 'Delivered: 2,100 credits', 'delivered');
  same(jobCardText(null), null, 'no job, no card');
  const crate = {kind: 'crate', massKg: 342, from: 'summit-run', to: 'ridge-rally', pay: 2100, bonus: 550, again: true};
  same(jobCardText({...crate, stage: 'carry', flyTo: crate.to}, {flyToList: flyTo}).next, "Carrying. Fly to Ridge Rally (on the Pilot's map, press N).", 'crate to a map place');
  same(jobCardText({...crate, stage: 'hook', flyTo: crate.to}).next, 'Hook the crate again: hover low over it and press H.', 'crate on the ground after a drop');
  same(jobCardText({...crate, stage: 'carry', flyTo: crate.to}).what, 'Crate, 342 kg', 'the crate and its weight');
  same(jobCardText({kind: 'recovery', carId: 'falcone_f42', from: 'panorama-ridge', to: 'panorama-ridge', pay: 2300, bonus: 575, stage: 'hook', again: false}).next,
    'Hook the Falcone F42 on the slope: hover low over it and press H.', 'recovery: the car is on the slope');
  const ski = {kind: 'skiDrop', from: HOME_COURSE, to: 'summit-run', pay: 0, bonus: 0, here: 'summit-run'};
  // SKI-FINISH (Kyle, 2 November 2026: couldn't find the pad, ran out of fuel): the leg ends at the pads, the pad is
  // named by its orange light, and a tank short of the next leg puts filling it first.
  same(jobCardText({...ski, stage: 'fly', flyTo: 'summit-run'}, {flyToList: flyTo}).next, 'Fly to Summit Run. The flight ends beside the ski pads.', 'ski: fly there');
  same(jobCardText({...ski, here: HOME_COURSE, stage: 'fly', flyTo: 'summit-run', fuelKg: 180, needKg: 240}, {flyToList: flyTo}).next,
    'Fill the tank first at the home pump: the flight to the ski pads needs about 240 kg of fuel and you have 180 kg.', 'ski: a short tank at home fills first');
  same(jobCardText({...ski, here: HOME_COURSE, stage: 'fly', flyTo: 'summit-run', fuelKg: 400, needKg: 240}, {flyToList: flyTo}).next,
    'Fly to Summit Run. The flight ends beside the ski pads.', 'ski: a full tank flies');
  same(jobCardText({...ski, stage: 'pad', pads: [{name: 'devils', distance: 3240, bearing: 44.6}]}).next,
    'Land on the ski pad under the orange light: Devils Playground, 3.2 km, heading 045.', 'ski: the nearest pad');
  ok(jobCardText({...ski, stage: 'pad', pads: [{name: 'devils', distance: 400, bearing: 44.6}]}).note.includes('pump is on the pickup pad'), 'ski: the pump is named on the way in');
  same(jobCardText({...ski, stage: 'ski'}).next, 'Pick a run on the ski panel.', 'ski: on a pad');
  same(jobCardText({...ski, stage: 'flyHome', fuelKg: 173, needKg: 240, atPump: true}).next,
    'Fill up at the pump here first: the way home needs about 240 kg of fuel and you have 173 kg.', 'ski: after the run, fill up at the pickup');
  same(jobCardText({...ski, stage: 'flyHome', fuelKg: 173, needKg: 240, atPump: false}).next,
    'Fill up at the pump on the pickup pad first: the way home needs about 240 kg of fuel and you have 173 kg.', 'ski: away from the pump, it is named');
  same(jobCardText({...ski, stage: 'flyHome', fuelKg: 400, needKg: 240, atPump: true}).next, 'Fly home and land on the home pad.', 'ski: filled, fly home');
  same(jobCardText({...ski, kind: 'skiGroup', pay: 3000, stage: 'flyHome'}).drop, false, 'the group is aboard: no Drop job away from home');
  same(flyToWords('eifel-crown', {keys: JOB_KEYS}), "Fly to Eifel Crown (on the Pilot's map, press N).", 'a map place names the map key');
  ok(jobCardMarkup(card('fly')).includes('data-heli-job="drop"') && jobCardMarkup(card('fly')).includes('Pacific Canyon Circuit'), 'the markup has the words and the button');
}

// ---- D2: the hook prompt's words (pure) ---------------------------------------------------------------------------
{
  same(hookPromptText({kind: 'hook', ready: true}), 'Press H to hook', 'ready to hook');
  same(hookPromptText({kind: 'hook', ready: false, reason: 'lower', metres: 3}), 'Lower 3 m, then press H to hook', 'what to fix first');
  same(hookPromptText({kind: 'hook', ready: false, reason: 'slowDown'}), 'Slow down, then press H to hook', 'too fast');
  same(hookPromptText({kind: 'release', ready: true}), 'Press H to let go', 'set down in the circle');
  same(hookPromptText({kind: 'release', ready: false}), 'Lower it until it touches, then press H to let go', 'still hanging over the circle');
  same(hookPromptText(null), null, 'nothing near, no prompt');
  // Review fix: when H cannot hook the load at all, the prompt says why instead of promising a hook.
  same(hookPromptText({kind: 'hook', ready: false, blocked: 'heavy'}), 'Too heavy to lift', 'too heavy');
  same(hookPromptText({kind: 'hook', ready: false, blocked: 'bucket'}), 'Bucket fitted: take it off at the home pad', 'bucket fitted');
  same(hookPromptText({kind: 'hook', ready: false, blocked: 'rescueLine'}), 'Rescue line fitted: take it off at the home pad', 'rescue line fitted');
  same(hookPromptText({kind: 'hook', ready: false, blocked: 'lesson'}), 'Finish lesson 4 before carrying cars', 'lesson 4 not done');
  // In the session: a pilot without lesson 4 over their own car is told why, not to lower.
  const learner = session(normalizeProfile({...profileWith(), heli: {...profileWith().heli, lessons: {liftoff: true, hover: true, landing: true, carry: false}}}));
  learner.start();
  const car = () => learner.view().loads.find(load => load.own);
  run(learner, 30, v => pilot(v, {x: car().x, z: car().z, y: car().y + 25, speed: 4}),
    v => Math.hypot(v.heli.x - car().x, v.heli.z - car().z) < 1 && Math.hypot(v.heli.vx, v.heli.vz) < .5);
  same(learner.hookPrompt(), {kind: 'hook', ready: false, blocked: 'lesson'}, 'the session says the hook is barred, and why');
  same(hookPromptText(learner.hookPrompt()), 'Finish lesson 4 before carrying cars', 'so the prompt never says to lower first');
}

// ---- D6: the landed card names the ski panel only when it is on screen -----------------------------------------------
{
  const view = {phase: 'flying', courseId: 'summit-run', heli: {x: 0, z: 0, vx: 0, vy: 0, vz: 0, onGround: true}, zone: {x: 0, z: 0, radius: 12},
    ski: {flight: {kind: 'drop'}, group: false}, loads: []};
  ok(landedArrival(view, null).waiting.includes('Land on a ski pad'), 'at the landing circle the card says to land on a ski pad');
  ok(!landedArrival(view, null).waiting.includes('ski panel'), 'and does not name a panel that is not there');
  ok(landedArrival(view, null, {skiPanel: true}).waiting.includes('Use the ski panel'), 'on a ski pad with runs it names the panel');
  // SKI-FINISH: at the home pad before the trip it says to fly to Summit Run; after the run, to fly home.
  ok(landedArrival({...view, courseId: 'tremblant-woods'}, null).waiting.includes('Fly to Summit Run'), 'at home the drop is still to fly');
  ok(landedArrival({...view, ski: {flight: {kind: 'drop', skied: true}, group: false}}, null).waiting.includes('Fly home'), 'after the run it is the way home');
}

console.log(`test-heli-job-clarity: ${checks} checks passed`);
