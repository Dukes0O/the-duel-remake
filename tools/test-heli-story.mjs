// STORY-KOGANE-DELIVERY (docs/story/kogane-invitation.md section 8.2): "Supplies for the Summit", the Kogane Invitation's
// dispatch job. Memory-only: no real save is read or written.
import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {heliOf, HELI_MONEY} from '../src/heli/heli-save.js';
import {KESTREL, GRAVITY, airFactor} from '../src/heli/heli-flight.js';
import {HOME_COURSE, dayJobs, jobPay, jobCleanBonus, legFuelKg, destinationsFor, isDestination} from '../src/heli/heli-jobs.js';
import {payForMinutes, cleanBonusFor, deliveryMinutes} from '../src/heli/heli-pay.js';
import {PLACE_ALTITUDES, mapDistanceKm, KOGANE_PLACE, legFuelKgMap, reachKm} from '../src/heli/pilot-map-data.js';
import {createHeliSession} from '../src/heli/heli-session.js';
import {dispatchBoardMarkup} from '../src/heli/heli-board.js';
import {mapModel, placeNote} from '../src/heli/pilot-map-view.js';
import {STORY_JOB_ID, STORY_NIGHT, STORY_CRATE_KG, storyJob, storyOffered, finishStorySupplies} from '../src/heli/heli-story.js';
import {readKoganeLetter, markKoganeLesson, markKoganeSupplies, koganeStep, storyOf} from '../src/story/story-save.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };

const worlds = new Map();
function loadCourse(id) {
  if (!worlds.has(id)) {
    const course = new Course(ALL_CIRCUITS.find(def => def.id === id), 1989);
    worlds.set(id, {course, ground: groundFromCourse(course)});
  }
  return worlds.get(id);
}

// The same steady test pilot as tools/test-heli-jobs.mjs (Assisted).
function pilot(view, target, {speed = 6} = {}) {
  const h = view.heli;
  const fwdX = Math.sin(h.heading), fwdZ = Math.cos(h.heading), rightX = -fwdZ, rightZ = fwdX;
  const dx = target.x - h.x, dz = target.z - h.z, distance = Math.hypot(dx, dz);
  const want = Math.min(speed, distance * 0.4);
  const wx = distance > 0.01 ? dx / distance * want : 0, wz = distance > 0.01 ? dz / distance * want : 0;
  const ex = wx - h.vx, ez = wz - h.vz;
  const clamp = v => Math.max(-1, Math.min(1, v));
  return {pitch: clamp((ex * fwdX + ez * fwdZ) * 0.25), roll: clamp((ex * rightX + ez * rightZ) * 0.25),
    lift: clamp((target.y - h.y) * 0.3 - h.vy * 0.3), yaw: 0};
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
const TRAINED = Object.freeze({liftoff: true, hover: true, landing: true, carry: true});
const NOT_CARRYING = Object.freeze({liftoff: true, hover: true, landing: true});
const DAY1 = '2026-10-29';
const options = {pilotMap: true, koganePass: true};

// A player at a step of the story: 'invite' (nothing read), 'lesson' (letter read), 'supplies' (lesson passed), 'duel' (supplies done).
function profileAt(step, {credits = 3000, carry = true, heli = {}} = {}) {
  let profile = normalizeProfile({...createProfile(), credits, courses: {version: 1, unlocked: OWNED},
    heli: {version: 1, fuelKg: 0, ...heli, lessons: carry ? TRAINED : NOT_CARRYING}});
  if (step !== 'invite') profile = readKoganeLetter(profile).profile;
  if (step === 'supplies' || step === 'duel') profile = markKoganeLesson(profile).profile;
  if (step === 'duel') profile = markKoganeSupplies(profile).profile;
  return profile;
}
function newSession({profile = profileAt('supplies'), story = true, kogane = true, pilotMap = true, mode = 'assisted', saves = null} = {}) {
  const session = createHeliSession({profile, enabled: true, logbookEnabled: true, pilotMapEnabled: pilotMap, koganePassEnabled: kogane,
    koganeStoryEnabled: story, loadCourse, carId: 'falcone_f42', mode, today: DAY1, persist: p => saves?.push(p)});
  session.start();
  session.buyFuel();
  session.takeEvents();
  return session;
}
const storyRow = session => session.boardJobs().find(job => job.id === STORY_JOB_ID);

// ---- the numbers ---------------------------------------------------------------------------------------------
{
  const job = storyJob();
  same([job.id, job.kind, job.from, job.to, job.massKg], [STORY_JOB_ID, 'crate', HOME_COURSE, 'kogane-pass', 420], 'the job: a 420 kg crate from the home pad to Kogane Pass');
  ok(Object.isFrozen(job) && STORY_JOB_ID === 'story-kogane-supplies', 'a frozen job with the packet\'s id');
  same(job.pay, payForMinutes(deliveryMinutes(false)), 'pay is read from the race-rate rule, never typed in');
  same([job.pay, cleanBonusFor(job.pay)], [2100, 550], 'a delivery from the home pad pays 2,100, and 550 for a clean one');
  same([jobPay(job, 'assisted'), jobCleanBonus(job, 'assisted')], [2100, 550], 'Assisted');
  same([jobPay(job, 'real'), jobCleanBonus(job, 'real')], [2625, 688], 'Real pays a quarter more');
}

// ---- Kogane's place: one tank out and back, and the lift there ---------------------------------------------------
{
  const km = mapDistanceKm('tremblant-woods', 'kogane-pass');
  ok(km <= 16, `Kogane Pass is within 16 km of the home pad (${km.toFixed(2)} km)`);
  ok(KOGANE_PLACE.at.x > 0 && Math.abs(KOGANE_PLACE.at.z) < KOGANE_PLACE.at.x / 3, 'and still to the east');
  const out = legFuelKg(HOME_COURSE, 'kogane-pass', options), back = legFuelKg('kogane-pass', HOME_COURSE, options);
  same(out, legFuelKgMap('tremblant-woods', 'kogane-pass'), 'the leg is the map\'s rule');
  ok(out + back <= HELI_MONEY.tankKg, `out ${out} kg and back ${back} kg fit one ${HELI_MONEY.tankKg} kg tank`);
  ok(km <= reachKm(HELI_MONEY.tankKg) / 2, 'half the tank\'s reach');
  ok(isDestination('kogane-pass', options) && !isDestination('kogane-pass', {pilotMap: true}), 'a destination only with the Kogane Pass option');
  // Thrust 1.08 x 3,130 kg falls with the thin air (e^(-altitude/8500)); loaded: empty, pilot, a full tank and the crate.
  const altitude = PLACE_ALTITUDES['kogane-pass'];
  const lift = KESTREL.maxThrust * airFactor(altitude) / GRAVITY, weight = KESTREL.emptyKg + KESTREL.pilotKg + HELI_MONEY.tankKg + STORY_CRATE_KG;
  same(altitude, 1300, 'the map\'s height for Kogane Pass');
  ok(lift - weight >= 600, `spare lift at Kogane with a full tank and the crate: ${(lift - weight).toFixed(0)} kg (needs 600)`);
}

// ---- when it is offered ------------------------------------------------------------------------------------------------
{
  const on = {enabled: true, step: 'supplies', carryDone: true};
  same(storyOffered(on), storyJob(), 'switch on, delivery step, carry lesson done: offered');
  ok(storyOffered({...on, enabled: false}) === null && storyOffered({...on, enabled: undefined}) === null && storyOffered({step: 'supplies', carryDone: true}) === null,
    'never with the switch off (or left out)');
  for (const step of ['invite', 'lesson', 'duel', 'ana', 'done', null]) ok(storyOffered({...on, step}) === null, `not at the ${step} step`);
  ok(storyOffered({...on, carryDone: false}) === null, 'not before the carry lesson');
  same(['invite', 'lesson', 'supplies', 'duel'].map(step => koganeStep(profileAt(step))), ['invite', 'lesson', 'supplies', 'duel'], 'the test players are where they say');

  const row = storyRow(newSession());
  ok(row && row.story && row.title === 'Supplies for the Summit' && !row.taken && !row.done, 'on the board with the switch on');
  same([row.payNow, row.cleanBonus], [2100, 550], 'the board shows the pay and the clean bonus');
  ok(storyRow(newSession({mode: 'real'})).payNow === 2625, 'Real shows the bigger pay');
  ok(!storyRow(newSession({story: false})), 'not on the board with the switch off');
  ok(!storyRow(newSession({kogane: false})) && !storyRow(newSession({pilotMap: false})), 'not without Kogane Pass or the pilot\'s map');
  ok(!storyRow(newSession({profile: profileAt('lesson')})) && !storyRow(newSession({profile: profileAt('invite')})), 'not before the driving lesson');
  ok(!storyRow(newSession({profile: profileAt('duel')})), 'not once the supplies are done');
  ok(!storyRow(newSession({profile: profileAt('supplies', {carry: false})})), 'not before the carry lesson');
  const newer = normalizeProfile({...profileAt('supplies'), story: {version: 2, kogane: {read: true, lesson: true}}});
  ok(!storyRow(newSession({profile: newer})), 'not for a story from a newer game');

  const refused = newSession({story: false});
  ok(!refused.takeJob(STORY_JOB_ID).ok && heliOf(refused.profile).jobs.taken === null, 'with the switch off the job cannot be taken');

  // The day's seeded jobs are the same with or without it, and the story row is the only addition.
  for (const profile of [profileAt('supplies'), profileAt('supplies', {heli: {playDay: {last: DAY1, count: 7}}})]) {
    const withStory = newSession({profile}).boardJobs(), without = newSession({profile, story: false}).boardJobs();
    same(withStory.filter(job => job.id !== STORY_JOB_ID), without, 'the board is the same but for the one extra row');
    const day = heliOf(profile).playDay.count;
    same(without.filter(job => /^d\d+-\d$/.test(job.id)).map(job => job.id), dayJobs(day, {pilotMap: true, owned: OWNED}).map(job => job.id), 'seeded jobs untouched');
  }
}

// ---- the board's markup ------------------------------------------------------------------------------------------------
{
  const session = newSession();
  const home = session.view();
  const open = dispatchBoardMarkup(home, {jobs: session.boardJobs()});
  ok(open.includes('Supplies for the Summit') && open.includes('Pays 2,100 credits, +550 for a clean delivery') &&
    open.includes(`data-heli-board="take:${STORY_JOB_ID}"`), 'the row names the job, shows its pay and a Take job button');
  ok(!open.includes('Fly the undefined'), 'the title is the job\'s own');
  session.takeJob(STORY_JOB_ID);
  const taken = dispatchBoardMarkup(session.view(), {jobs: session.boardJobs()});
  ok(taken.includes('data-heli-board="drop"') && taken.includes('heli-board-taken'), 'in hand it shows Drop job');
}

// ---- taking it, dropping it ----------------------------------------------------------------------------------------------
{
  const saves = [];
  const session = newSession({saves});
  const crates = () => session.view().loads.filter(load => load.storyJob);
  ok(crates().length === 0, 'no crate until the job is taken');
  const taken = session.takeJob(STORY_JOB_ID);
  ok(taken.ok && taken.job.id === STORY_JOB_ID, 'the job is taken at the home pad');
  same(session.takeEvents().map(e => e.type === 'radio' ? e.line : e.type), ['jobTaken', 'heli.radio.job.taken'], 'the usual job and radio events');
  same(heliOf(session.profile).jobs, {day: 1, taken: STORY_JOB_ID, done: []}, 'the ordinary job in hand is saved');
  ok(crates().length === 1 && crates()[0].id === 'crate', 'a crate waits by the pad');
  ok(session.boardJobs().find(job => job.id === STORY_JOB_ID).taken, 'the board shows it taken');
  ok(session.takeJob(STORY_JOB_ID).ok && session.takeEvents().length === 0 && crates().length === 1, 'taking it again is quiet and lays no second crate');
  const other = session.boardJobs().find(job => job.id.startsWith('d'));
  ok(!session.takeJob(other.id).ok, 'one job at a time');
  const dropped = session.dropJob();
  ok(dropped.ok && dropped.dropped && heliOf(session.profile).jobs.taken === null && crates().length === 0, 'Drop job hands it back and the crate goes');
  ok(session.takeEvents().some(e => e.type === 'jobDropped'), 'and says so');
  same(koganeStep(session.profile), 'supplies', 'the story is still at the delivery');
  ok(session.takeJob(STORY_JOB_ID).ok && crates().length === 1, 'it can be taken again');
  // A crash starts the visit again at the pad: the job stays and the crate is by the pad.
  session.takeEvents();
}

// ---- the finish, as one change to a profile -------------------------------------------------------------------------------
{
  const held = (profile, day = 1) => ({...profile, heli: {...heliOf(profile), jobs: {day, taken: STORY_JOB_ID, done: []}}});
  const base = held(profileAt('supplies'));
  const args = {mode: 'assisted', clean: true, day: 1, step: 'supplies', mark: markKoganeSupplies};
  const done = finishStorySupplies(base, args);
  ok(done.ok, 'a clean set-down finishes it');
  same([done.paid, done.bonus, done.pay], [2650, 550, 2650], 'paid 2,100 and 550');
  same(done.profile.credits, base.credits + 2650, 'credits rise by that');
  same(heliOf(done.profile).jobs, {day: 1, taken: null, done: [STORY_JOB_ID]}, 'the day\'s job list marks it done and nothing is in hand');
  ok(heliOf(done.profile).map.found.includes(STORY_NIGHT) && done.found, 'the Night version is found from the air');
  ok(storyOf(done.profile).kogane.supplies === true && koganeStep(done.profile) === 'duel', 'the story mark rises: the duel is next');
  ok(base.credits === 3000 && heliOf(base).jobs.taken === STORY_JOB_ID && !Object.hasOwn(heliOf(base), 'map'), 'the profile it was given is not changed');

  // Once only.
  const again = finishStorySupplies(done.profile, args);
  ok(!again.ok && again.profile === done.profile, 'a second finish cannot pay');
  ok(!finishStorySupplies(held(done.profile), args).ok, 'not even if the job were somehow in hand again');
  ok(!finishStorySupplies(base, {...args, step: 'duel'}).ok && !finishStorySupplies(base, {...args, step: null}).ok, 'only at the delivery step');
  ok(!finishStorySupplies(base, {...args, mark: null}).ok, 'only with the story\'s writer');
  ok(!finishStorySupplies(profileAt('supplies'), args).ok, 'the job must be in hand');
  ok(!finishStorySupplies(base, {...args, day: 2}).ok, 'and taken today');

  // Not clean: base pay only. Real: a quarter more.
  const dirty = finishStorySupplies(base, {...args, clean: false});
  same([dirty.paid, dirty.bonus], [2100, 0], 'not clean pays the base');
  const real = finishStorySupplies(base, {...args, mode: 'real'});
  same([real.paid, real.bonus], [2625 + 688, 688], 'Real: 2,625 and 688');

  // Credits are capped like every credit change.
  const rich = finishStorySupplies(held(profileAt('supplies', {credits: 999_999_000})), args);
  same(rich.profile.credits, 1_000_000_000, 'credits stop at the cap');
  same(rich.paid, 1000, 'and the paid figure is what really went in');

  // Already found: not found again, and the record keeps its other names.
  const known = held(profileAt('supplies', {heli: {map: {version: 1, seen: ['kogane-pass'], found: [STORY_NIGHT, 'harbour-lights-dusk'], table: false}}}));
  const quiet = finishStorySupplies(known, args);
  ok(quiet.ok && !quiet.found, 'a Night version found earlier is not announced again');
  same(heliOf(quiet.profile).map.found, [STORY_NIGHT, 'harbour-lights-dusk'], 'the list is untouched');
  const others = finishStorySupplies(held(profileAt('supplies', {heli: {map: {version: 1, seen: [], found: ['harbour-lights-dusk'], table: false}}})), args);
  same(heliOf(others.profile).map.found, ['harbour-lights-dusk', STORY_NIGHT], 'the other finds are kept');

  // A record from a newer game: refused whole, nothing half written.
  const laterMap = held(normalizeProfile({...profileAt('supplies'), heli: {version: 1, fuelKg: 0, lessons: TRAINED, map: {version: 2, found: ['x'], extra: 1}}}));
  const blocked = finishStorySupplies(laterMap, args);
  ok(!blocked.ok && blocked.profile === laterMap && /newer version/.test(blocked.reason), 'a newer helicopter record says so and nothing changes');
  const laterHeli = {...base, heli: {...base.heli, version: 2}};
  ok(!finishStorySupplies(laterHeli, args).ok, 'nor over a newer helicopter');
  // A story that refuses its mark leaves the whole profile as it was.
  const noMark = finishStorySupplies(base, {...args, mark: profile => ({ok: false, reason: 'No.', profile})});
  ok(!noMark.ok && noMark.profile === base && base.credits === 3000, 'if the story mark is refused, the pay is not kept either');
}

// ---- flying it ---------------------------------------------------------------------------------------------------------------
// Hook the story crate by the pad, carry it to Kogane Pass and set it down in the circle.
function overCrate(session) {
  const crate = () => session.view().loads.find(load => load.storyJob);
  run(session, 60, v => pilot(v, {x: crate().x, z: crate().z, y: crate().y + 15.2}, {speed: 4}),
    v => Math.hypot(v.heli.x - crate().x, v.heli.z - crate().z) < 1 && Math.abs(v.heli.y - crate().y - 15.2) < 0.6 &&
      Math.hypot(v.heli.vx, v.heli.vy, v.heli.vz) < 0.5);
  return crate();
}
function carryToKogane(session) {
  const log = [];
  log.push(...run(session, 12, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.zone.y + 60})));
  ok(session.pressAutopilot(), 'the autopilot takes the crate toward Kogane Pass');
  log.push(...run(session, 300, () => ({}), () => session.cruiseOffered));
  ok(session.cruiseOffered && session.acceptCruise(), 'cruise');
  log.push(...run(session, 2));
  log.push(...run(session, 300, () => ({}), (v, seen) => seen.some(e => e.type === 'autopilotArrived')));
  session.pressAutopilot();
  return log;
}
function holdOver(session, height) {
  run(session, 40, v => pilot(v, {x: v.zone.x, z: v.zone.z, y: v.zone.y + 0.7 + 14.6 + height}, {speed: 1}),
    v => Math.abs(v.heli.y - v.zone.y - 15.3 - height) < 0.4 && Math.hypot(v.heli.vx, v.heli.vy, v.heli.vz) < 0.3);
}
function setDown(session) {
  const log = [];
  log.push(...run(session, 60, v => pilot(v, {x: v.zone.x, z: v.zone.z, y: v.zone.y + 0.7 + 14.6}, {speed: 1}), v => v.load.onGround));
  log.push(...run(session, 1, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.heli.y})));
  const released = session.pressHook();
  log.push(...session.takeEvents());
  return {released, log};
}

{
  const saves = [];
  const session = newSession({saves});
  ok(session.takeJob(STORY_JOB_ID).ok, 'take the job');
  const crate = overCrate(session);
  ok(crate && crate.id === 'crate', 'the crate is by the pad');
  session.takeEvents();
  const hooked = session.pressHook();
  ok(hooked?.type === 'hooked', 'hook the crate');
  same(session.destination, 'kogane-pass', 'hooking it points the way to Kogane Pass');
  const log = carryToKogane(session);
  same(session.courseId, 'kogane-pass', 'the crate came along to Kogane Pass');
  ok(session.view().load.hooked && session.view().load.storyJob, 'still on the cable');
  ok(heliOf(session.profile).fuelKg >= 190, `fuel left to come home: ${heliOf(session.profile).fuelKg} kg`);
  const before = session.profile.credits;
  const {released, log: end} = setDown(session);
  same(released?.type, 'released', 'set down gently inside the circle');
  const done = end.find(e => e.type === 'jobDone');
  ok(done && done.job.id === STORY_JOB_ID, 'the job is done');
  same([done.pay, done.bonus, done.clean], [2650, 550, true], 'paid 2,100 and a clean 550');
  same(session.profile.credits, before + 2650, 'credits rise by 2,650');
  ok(!end.some(e => e.type === 'charged'), 'a clean set-down costs no repair');
  ok(end.some(e => e.type === 'secretFound' && e.id === STORY_NIGHT), 'the Night version is announced as found');
  ok(end.some(e => e.type === 'radio' && e.line === 'heli.radio.job.done'), 'with the radio line');
  ok(heliOf(session.profile).map.found.includes(STORY_NIGHT), 'and saved as found');
  same(koganeStep(session.profile), 'duel', 'the story moves to the duel');
  same(heliOf(session.profile).logbook.jobs.crate, 1, 'the logbook counts one crate job');
  same(heliOf(session.profile).logbook.jobs.car, 0, 'and no car job');
  same(heliOf(session.profile).jobs, {day: 1, taken: null, done: [STORY_JOB_ID]}, 'the day\'s list marks it done');
  ok(!session.view().loads.some(load => load.storyJob), 'the crate is gone from the circle');
  ok(session.takeEvents().length === 0, 'nothing more is said');
  // Paid once.
  const credits = session.profile.credits;
  ok(!session.takeJob(STORY_JOB_ID).ok, 'the job cannot be taken again (and not away from the pad)');
  ok(saves.every(profile => profile !== undefined), 'saved through the usual path');
  ok(session.profile.credits === credits, 'no second pay');
  const kept = session.leave();
  const home = newSession({profile: kept});
  ok(!storyRow(home), 'next visit the job is off the board');
  ok(!home.takeJob(STORY_JOB_ID).ok && home.profile.credits === kept.credits, 'and cannot be taken or paid again');
}

// A crate let go from height pays nothing and the job stays; set down again it pays the base (no clean bonus).
{
  const session = newSession();
  ok(session.takeJob(STORY_JOB_ID).ok);
  overCrate(session);
  session.takeEvents();
  ok(session.pressHook()?.type === 'hooked', 'hook the crate');
  carryToKogane(session);
  const before = session.profile.credits;
  holdOver(session, 6);
  const high = session.pressHook();
  const log = [...session.takeEvents()];
  same(high?.type, 'releasedHigh', 'let go 6 m up');
  log.push(...run(session, 10, () => ({}), (v, seen) => seen.some(e => e.type === 'drop')));
  const charge = log.find(e => e.type === 'charged' && e.kind === 'drop');
  ok(charge && charge.charged > 0, 'the drop is charged');
  ok(!log.some(e => e.type === 'jobDone') && !log.some(e => e.type === 'secretFound'), 'a dropped crate finishes nothing');
  same(heliOf(session.profile).jobs.taken, STORY_JOB_ID, 'the job stays in hand');
  same(session.profile.credits, before - charge.charged, 'only the repair was paid');
  same(koganeStep(session.profile), 'supplies', 'the story has not moved');
  ok(!heliOf(session.profile).map?.found?.includes(STORY_NIGHT), 'the Night version is not found yet');
  // Lift it and set it down again.
  session.takeEvents();
  run(session, 2, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.heli.y}));
  const crate = () => session.view().loads.find(load => load.storyJob);
  ok(crate(), 'the crate lies where it fell');
  run(session, 60, v => pilot(v, {x: crate().x, z: crate().z, y: crate().y + 15.2}, {speed: 4}),
    v => Math.hypot(v.heli.x - crate().x, v.heli.z - crate().z) < 1 && Math.abs(v.heli.y - crate().y - 15.2) < 0.6 && Math.hypot(v.heli.vx, v.heli.vy, v.heli.vz) < 0.5);
  session.takeEvents();
  ok(session.pressHook()?.type === 'hooked', 'hook it again');
  const mid = session.profile.credits;
  const {released, log: end} = setDown(session);
  same(released?.type, 'released', 'set it down gently');
  const done = end.find(e => e.type === 'jobDone');
  ok(done, 'now it is done');
  same([done.pay, done.bonus, done.clean], [2100, 0, false], 'the base pay only, because a repair was charged');
  same(session.profile.credits, mid + 2100, 'credits rise by 2,100');
  same(koganeStep(session.profile), 'duel', 'the story moves on');
}

// ---- the pilot's map ----------------------------------------------------------------------------------------------------------
{
  const session = newSession();
  const before = mapModel({view: session.view(), profile: session.profile, jobs: session.boardJobs()});
  const kogane = before.places.find(place => place.id === 'kogane-pass');
  ok(kogane && !kogane.pin, 'Kogane Pass is on the chart, with no pin while the job is only offered');
  ok(before.jobLines.some(line => line.id === STORY_JOB_ID && !line.taken && line.to === 'kogane-pass'), 'the offered job has its line from the home pad');
  session.takeJob(STORY_JOB_ID);
  const model = mapModel({view: session.view(), profile: session.profile, jobs: session.boardJobs()});
  const pinned = model.places.find(place => place.id === 'kogane-pass');
  same(pinned.pin, "Daichi's tea house", 'a pin at Kogane Pass while the job is yours');
  ok(placeNote(model, pinned).includes("Daichi's tea house"), 'and the note says it');
  ok(model.places.filter(place => place.pin).length === 1 && model.jobLines.find(line => line.id === STORY_JOB_ID).taken, 'the only pin, and the line is the heavy one');
  // Found: a mark by Kogane Pass for the Night version.
  const found = {...session.profile, heli: {...heliOf(session.profile), map: {version: 1, seen: [], found: [STORY_NIGHT], table: false}}};
  const marked = mapModel({view: {...session.view(), secrets: {found: [STORY_NIGHT], table: false}}, profile: found, jobs: []});
  same(marked.found.map(secret => [secret.id, secret.place]), [[STORY_NIGHT, 'kogane-pass']], 'the Night version shows found at Kogane Pass');
  ok(!marked.places.some(place => place.pin), 'and no pin once there is no job in hand');
  ok(!destinationsFor({pilotMap: true})['kogane-pass'], 'with Kogane Pass off, it is on no chart');
}

console.log(`test-heli-story: ${checks} checks passed`);
