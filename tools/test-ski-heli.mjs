import assert from 'node:assert/strict';
import test from 'node:test';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {createHeliSession, courseSite, ceilingAt, HELI_SKIING} from '../src/heli/heli-session.js';
import {armMissions} from '../src/heli/heli-missions.js';
import {setMissions, createMissions, heliOf, skiOf} from '../src/heli/heli-save.js';
import {KESTREL, airFactor, heliMass, createHeliState, stepHeli} from '../src/heli/heli-flight.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {createSkiRun, stepSkiRun, skiRunView, SKI_PADS, SKI_RUN_IDS, skiControls, skiLineAssist} from '../src/ski/ski-session.js';
import {skiZone, zoneGuide, SKI_ALTITUDES, altitudeOf} from '../src/ski/runs/summit-zones.js';
import {SKI, SKI_STEP, createSkier, stepSkier} from '../src/ski/ski-physics.js';
import {keyboardDriver} from './scenarios/ski-finish.mjs';
import {skiKeys} from '../src/ski/ski-view.js';
import {GUIDE} from '../src/ski/ski-guide.js';
import {snowOfDay, WAXES} from '../src/lab/benches/wax.js';
import {passLesson, labOf} from '../src/lab/lab-save.js';
import {buyUpgrade} from '../src/lab/lab-shop.js';

// docs/HELI_SKIING.md sections 3 and 6: heli-skiing in the helicopter. Flown by scripted pilots and skiers through the real session.
const worlds = new Map();
function loadCourse(id) {
  if (!worlds.has(id)) { const course = new Course(ALL_CIRCUITS.find(def => def.id === id), 1989); worlds.set(id, {course, ground: groundFromCourse(course)}); }
  return worlds.get(id);
}
const DAY = '2026-10-20', TRAINED = {liftoff: true, hover: true, landing: true, carry: true}, on = {enabled: true};
const SKIING = flagsOf('lab', 'helicopter', 'heli-skiing');
function flagsOf(...names) { return {enabled: name => names.includes(name)}; }

function profileOf({count = 5, labField, extra = {}} = {}) {
  const profile = normalizeProfile({...createProfile(), credits: 1000, courses: {version: 1, unlocked: ['tremblant-woods', 'summit-run']},
    heli: {version: 1, fuelKg: 400, lessons: TRAINED, refuels: 3, playDay: {last: DAY, count}}, ...(labField ? {lab: labField} : {}), ...extra});
  const armed = armMissions(createMissions(), {date: '2026-10-14', playerName: 'Ski QA'});
  return setMissions(profile, {...armed, count: armed.need}, on).profile;
}
const sessionOf = (profile, extra = {}) => createHeliSession({profile, enabled: true, loadCourse, loadFireCourse: loadCourse, fireEnabled: true,
  summitRunEnabled: true, heliSkiingEnabled: true, playerName: 'Ski QA', today: DAY, carId: 'falcone_f42', ...extra});
// The first play day (from the profile's count) on which the group job is offered.
function groupDay() {
  for (let count = 1; count < 60; count++) { const s = sessionOf(profileOf({count})); s.start(); if (s.skiBoard()?.group) return count; }
  throw new Error('no group day');
}

// ---- scripted pilot and skier -----------------------------------------------------------------------------------
function pilot(view, target, {speed = 12, sink = 4} = {}) {
  const h = view.heli, fwdX = Math.sin(h.heading), fwdZ = Math.cos(h.heading), rightX = -fwdZ, rightZ = fwdX;
  const dx = target.x - h.x, dz = target.z - h.z, distance = Math.hypot(dx, dz), want = Math.min(speed, distance * 0.4);
  const wx = distance > 0.01 ? dx / distance * want : 0, wz = distance > 0.01 ? dz / distance * want : 0, ex = wx - h.vx, ez = wz - h.vz;
  const c = v => Math.max(-1, Math.min(1, v));
  return {pitch: c((ex * fwdX + ez * fwdZ) * 0.25), roll: c((ex * rightX + ez * rightZ) * 0.25), lift: c(Math.max(-sink, Math.min(sink, target.y - h.y)) * 0.3 - h.vy * 0.3), yaw: 0};
}
function run(session, seconds, controls, until = null) {
  const events = [];
  for (let i = 0; i < Math.round(seconds * 120); i++) { events.push(...session.step(controls(session.view()))); if (until?.(session.view(), events)) break; }
  return events;
}
const has = (events, type) => events.some(event => event.type === type);
const summit = loadCourse('summit-run');

// Home pad to Summit Run by the cruise leg (arriving 1.5 km out and 150 m up).
function toSummit(session) {
  const events = run(session, 120, v => pilot(v, {x: v.heli.x - 300, z: v.heli.z + 300, y: 100}, {speed: 30, sink: 8}), v => v.cruiseOffered);
  assert.equal(session.acceptCruise(), true);
  return [...events, ...run(session, 5, () => ({lift: 0}))];
}
// Over the mountain to a pad and down onto it; the climb waits in place where the ground ahead is high (cliffs).
function flyToPad(session, pad, {speed = 18, clear = 110, maxSec = 900} = {}) {
  const events = run(session, maxSec, v => {
    const h = v.heli, d = Math.hypot(pad.x - h.x, pad.z - h.z) || 1, ux = (pad.x - h.x) / d, uz = (pad.z - h.z) / d;
    let top = -Infinity;
    for (let k = 0; k <= 16; k++) top = Math.max(top, summit.ground.highest(h.x + ux * k * 25, h.z + uz * k * 25, 10));
    const y = d > 150 ? Math.min(top + clear, summit.ground.height(h.x, h.z) + 285) : pad.y + 40;
    if (h.y < y - 12) return pilot(v, {x: h.x, z: h.z, y}, {speed: 1, sink: 8});
    return pilot(v, {x: pad.x, z: pad.z, y}, {speed, sink: 8});
  }, (v, got) => has(got, 'crashed') || (Math.hypot(v.heli.x - pad.x, v.heli.z - pad.z) < 3 && Math.hypot(v.heli.vx, v.heli.vz) < 0.6));
  return [...events, ...run(session, 120, v => pilot(v, {x: pad.x, z: pad.z, y: pad.y - 2}, {speed: 2, sink: 2.5}), v => v.heli.onGround)];
}
// A skier steering for the planned line and then the pickup, standing still there (what a player does: skid to a stop).
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a)), clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function skierDriver(runId, via = null) {
  const zone = skiZone(runId), line = zone.line?.length >= 2 ? zone.line : [{x: 0, z: 0}, zone.pickup];
  const waypoints = via ?? (runId === 'powder' ? [...zone.stashes, zone.pickup] : null), cum = [0];
  for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + Math.hypot(line[i].x - line[i - 1].x, line[i].z - line[i - 1].z));
  let progress = 0, waypoint = 0;
  const pointAt = d => { d = clamp(d, 0, cum[cum.length - 1]); let i = 1; while (i < cum.length - 1 && cum[i] < d) i++; const span = cum[i] - cum[i - 1] || 1, k = (d - cum[i - 1]) / span;
    return {x: line[i - 1].x + (line[i].x - line[i - 1].x) * k, z: line[i - 1].z + (line[i].z - line[i - 1].z) * k}; };
  return skier => {
    let goal, atEnd = false;
    if (waypoints) {
      while (waypoint < waypoints.length - 1 && Math.hypot(waypoints[waypoint].x - skier.x, waypoints[waypoint].z - skier.z) < 8) waypoint++;
      goal = waypoints[waypoint]; atEnd = waypoint === waypoints.length - 1;
    } else {
      let best = Infinity;
      for (let i = 1; i < line.length; i++) {
        if (cum[i] < progress - 1) continue; if (cum[i - 1] > progress + 80) break;
        const ax = line[i - 1].x, az = line[i - 1].z, bx = line[i].x, bz = line[i].z, span = cum[i] - cum[i - 1] || 1;
        const k = clamp(((skier.x - ax) * (bx - ax) + (skier.z - az) * (bz - az)) / (span * span), 0, 1), side = Math.hypot(skier.x - (ax + (bx - ax) * k), skier.z - (az + (bz - az) * k));
        if (side < best) { best = side; progress = Math.max(progress, cum[i - 1] + k * span); }
      }
      atEnd = progress >= cum[cum.length - 1] - 1;
      goal = atEnd ? zone.pickup : pointAt(progress + clamp(GUIDE.lookAheadMin + GUIDE.lookAheadPerSpeed * skier.speed, GUIDE.lookAheadMin, GUIDE.lookAheadMax));
    }
    const error = wrap(Math.atan2(goal.x - skier.x, goal.z - skier.z) - skier.heading), toPickup = Math.hypot(zone.pickup.x - skier.x, zone.pickup.z - skier.z);
    const stopping = atEnd && toPickup < 11, turn = skier.grounded && !stopping ? clamp(-error / GUIDE.turnFullAt, -1, 1) : 0;
    return {turn, tuck: !atEnd && !waypoints && Math.abs(error) < GUIDE.tuckBelow, skate: !stopping, skid: stopping || (atEnd && skier.speed * skier.speed / 7 > toPickup - 4)};
  };
}
// Ski the run in hand to the end of it (the pickup), through the session.
function skiOut(session, runId, seconds = 400) {
  const drive = skierDriver(runId);
  return run(session, seconds, v => drive(v.ski.run.skier), v => v.phase !== 'skiing');
}

// From the pickup pad home. Idle through the remaining fuel so the existing
// fuel truck fills the tank for pay; then cruise home and land on the pad.
function flyHome(session) {
  const idleSeconds = Math.ceil(session.view().heli.fuelKg / KESTREL.burnIdle) + 5;
  const dry = run(session, idleSeconds, () => ({}), (v, got) => got.some(e => e.type === 'charged' && e.kind === 'fuelTruck'));
  assert.ok(dry.some(e => e.type === 'charged' && e.kind === 'fuelTruck'), 'the truck came');
  assert.equal(session.setDestination('tremblant-woods'), true);
  const departureY = session.view().heli.y + 60;
  const outSeconds = Math.ceil((session.view().heli.x - session.view().area.minX + 600) / 20) + 30;
  const out = run(session, outSeconds, f => pilot(f, {x: f.heli.x - 600, z: f.heli.z, y: departureY}, {speed: 20, sink: 6}), f => f.cruiseOffered);
  assert.ok(session.view().cruiseOffered, 'out of the area, the cruise home is offered');
  assert.equal(session.acceptCruise(), true);
  run(session, 5, () => ({lift: 0}));
  const zone = session.view().zone;
  const home = run(session, 240, f => pilot(f, {x: zone.x, z: zone.z, y: zone.y + 40}, {speed: 25, sink: 6}), f => Math.hypot(f.heli.x - zone.x, f.heli.z - zone.z) < 3 && Math.hypot(f.heli.vx, f.heli.vz) < 0.6);
  home.push(...run(session, 90, f => pilot(f, {x: zone.x, z: zone.z, y: zone.y - 2}, {speed: 2, sink: 2.5}), (f, got) => has(got, 'skiGroupDone') || has(got, 'skiDropDone') || f.heli.onGround));
  return {events: [...dry, ...out, ...home], dry, home};
}

// ---- the thin air: the corrected doc's numbers, from the helicopter's own rules -----------------------------------
const thrustKg = (altitudeM, scale = KESTREL.airScaleHeight, factor = 1) => KESTREL.maxThrust * factor * airFactor(altitudeM, scale) / 9.81;
const weightKg = (fuelKg, extra = 0) => heliMass({fuelKg, upgrades: extra ? {emptyMassKg: KESTREL.emptyKg + extra} : undefined});

test('thin air: the full group on a full tank hovers at every pad, at the summit with 112 kg (5%) to spare, as the design says', () => {
  const rows = [['pickup', 2311, 206, 406], ['devils', 2309, 204, 404], ['summit', 2217, 112, 312]];
  for (const [pad, thrust, spareFull, spareHalf] of rows) {
    const altitude = SKI_ALTITUDES[pad], most = thrustKg(altitude);
    assert.ok(Math.abs(most - thrust) <= 1, `${pad}: most thrust ${most.toFixed(0)} against ${thrust}`);
    assert.ok(Math.abs(most - weightKg(KESTREL.tankKg, HELI_SKIING.groupKg) - spareFull) <= 1, `${pad}: spare with a full tank`);
    assert.ok(Math.abs(most - weightKg(KESTREL.tankKg / 2, HELI_SKIING.groupKg) - spareHalf) <= 1, `${pad}: spare with half a tank`);
  }
  assert.equal(weightKg(KESTREL.tankKg, HELI_SKIING.groupKg), 2105, 'the weights are the empty helicopter 1,150, the pilot 80, the tank 400 and the group 475');
  assert.ok(thrustKg(SKI_ALTITUDES.summit) > weightKg(KESTREL.tankKg, HELI_SKIING.groupKg), 'a full group on a full tank does hover at the summit pad');
  assert.ok(Math.abs(thrustKg(SKI_ALTITUDES.summit, 10_000) - weightKg(KESTREL.tankKg, HELI_SKIING.groupKg) - 257) <= 1, 'with the Lab\'s altitude tune 257 kg to spare');
  // It would stop hovering higher up: at 4,027 m, which the Summit world does not have.
  assert.ok(thrustKg(4027) <= weightKg(KESTREL.tankKg, HELI_SKIING.groupKg) + 1 && thrustKg(4000) > weightKg(KESTREL.tankKg, HELI_SKIING.groupKg));
  assert.equal(altitudeOf(SKI_PADS.summit.y), SKI_ALTITUDES.summit, 'the pads\' altitudes are read the way every Summit flight reads its height');
  // The flight model agrees: at the summit pad's air, with the group's mass, full collective climbs; with 200 kg more it sinks.
  for (const [extra, climbs] of [[0, true], [200, false]]) {
    const state = createHeliState({x: 0, z: 0, heading: 0, fuelKg: KESTREL.tankKg, mode: 'assisted', altitudeOffset: SKI_ALTITUDES.summit - 40,
      ground: {height: () => 40, near: () => [], rotorStrike: () => false, highest: () => 40}, upgrades: {thrustFactor: 1, emptyMassKg: KESTREL.emptyKg + HELI_SKIING.groupKg + extra, altitudeScaleM: KESTREL.airScaleHeight}});
    state.y = 40 + 100; state.onGround = false; state.engine = true;
    const ground = {height: () => 40, near: () => [], rotorStrike: () => false, highest: () => 40};
    for (let i = 0; i < 120 * 8; i++) stepHeli(state, {lift: 1}, {ground}, 1 / 120);
    assert.equal(state.vy > 0, climbs, `${extra} kg more: vy ${state.vy.toFixed(2)}`);
  }
});

// ---- the session's flights ---------------------------------------------------------------------------------------
test('with the switch off, or on and nothing taken, the helicopter behaves exactly as it did, and the view has no ski part', () => {
  const trace = extra => {
    const session = sessionOf(profileOf(), extra);
    session.start();
    const log = [];
    for (let i = 0; i < 120 * 40; i++) {
      const v = session.view();
      const controls = i < 2000 ? {lift: 0.7, pitch: i > 1200 ? 0.15 : 0} : {lift: 0.2};
      log.push(session.step(controls).map(event => event.type).join(','), session.fingerprint());
      if (i % 600 === 0) log.push(JSON.stringify({...v, ski: undefined}));
    }
    log.push(JSON.stringify(session.profile));
    return {log: log.join('\n'), view: session.view()};
  };
  const off = trace({heliSkiingEnabled: false}), absent = trace({heliSkiingEnabled: undefined}), idle = trace({heliSkiingEnabled: true});
  assert.equal(off.log, absent.log); assert.equal(off.log, idle.log, 'on with nothing taken is the same flight');
  assert.equal(Object.hasOwn(off.view, 'ski'), false); assert.equal(Object.hasOwn(absent.view, 'ski'), false);
  assert.equal(Object.hasOwn(idle.view, 'ski'), true);
  // Without Summit Run the switch does nothing at all.
  const noSummit = sessionOf(profileOf(), {summitRunEnabled: false});
  noSummit.start();
  assert.equal(Object.hasOwn(noSummit.view(), 'ski'), false); assert.equal(noSummit.skiBoard(), null); assert.equal(noSummit.takeSkiDrop().ok, false);
  const closed = sessionOf(profileOf(), {heliSkiingEnabled: false});
  closed.start();
  for (const result of [closed.takeSkiDrop(), closed.takeSkiGroup(), closed.dropSkiFlight(), closed.skiStepOut('slalom'), closed.restartSkiRun(), closed.leaveSkiRun()]) assert.equal(result.ok, false);
  assert.equal(closed.skiOffers(), null);
  assert.deepEqual(closed.boardJobs().map(job => job.id), sessionOf(profileOf()).boardJobs().map(job => job.id));
});

test('the board: a free drop every day and the group job one play day in three, for 3,150 (Real 3,938), only with Summit Run and the landing lesson', () => {
  const days = Array.from({length: 60}, (_, index) => index + 1);
  const groupDays = days.filter(count => { const s = sessionOf(profileOf({count})); s.start(); return !!s.skiBoard().group; });
  assert.ok(groupDays.length >= 10 && groupDays.length <= 30, `${groupDays.length} of 60 days (about one in three)`);
  assert.deepEqual(days.filter(count => { const s = sessionOf(profileOf({count})); s.start(); return !!s.skiBoard().group; }), groupDays, 'the same days every time');
  const day = groupDays[0], s = sessionOf(profileOf({count: day}));
  s.start();
  const board = s.skiBoard();
  assert.equal(board.drop.title, 'Heli-ski drop at Summit Run'); assert.equal(board.drop.pay, 0);
  // HELI-PAY-CONTINUE: the group job pays 3,150 (was 1,200) and 800 more for a clean delivery.
  assert.equal(board.group.pay, 3150); assert.equal(board.group.payNow, 3150); assert.equal(board.group.cleanBonus, 800); assert.equal(board.group.guests, 4); assert.equal(board.group.kg, 475);
  const real = sessionOf(profileOf({count: day}), {mode: 'real'});
  real.start();
  assert.equal(real.skiBoard().group.payNow, 3938, 'Real pays a quarter more');
  // Not without the landing lesson, nor without Summit Run owned.
  const untrained = sessionOf(profileOf({count: day, extra: {heli: {version: 1, fuelKg: 400, lessons: {...TRAINED, landing: false}, refuels: 3, playDay: {last: DAY, count: day}}}}));
  untrained.start();
  assert.equal(untrained.skiBoard(), null);
  const unowned = sessionOf(profileOf({count: day, extra: {courses: {version: 1, unlocked: ['tremblant-woods']}}}));
  unowned.start();
  assert.equal(unowned.skiBoard(), null);
  assert.equal(JSON.stringify(s.boardJobs()), JSON.stringify(sessionOf(profileOf({count: day}), {heliSkiingEnabled: false}).boardJobs() ?? s.boardJobs()), 'the car jobs are the board\'s as before');
});

test('a drop to the pickup pad: the ceiling rises only with a ski flight in hand; aerials; the result, the pay and the climb in cost no fuel', () => {
  const s = sessionOf(profileOf());
  s.start();
  // Before taking anything, Summit Run\'s area is what it was.
  const plain = courseSite(summit.course, summit.ground, 'summit-run', {summitRun: true, summitRescue: true}).area;
  assert.deepEqual(s.takeSkiDrop(), {ok: true}); assert.equal(s.view().destination, 'summit-run');
  const events = toSummit(s);
  let v = s.view();
  assert.equal(v.courseId, 'summit-run'); assert.equal(v.area.aboveGround, 300, 'the ceiling follows the ground with a ski drop in hand');
  assert.equal(ceilingAt(v.area, SKI_PADS.summit.x, SKI_PADS.summit.z, summit.ground) > SKI_PADS.summit.y + 100, true, 'high enough for the summit pad');
  assert.equal(plain.aboveGround, 300, 'the rescues\' rule is the same');
  const pad = SKI_PADS.pickup;
  events.push(...flyToPad(s, pad));
  assert.equal(has(events, 'crashed'), false);
  v = s.view();
  assert.equal(v.heli.onGround, true); assert.equal(v.ski.pad, 'pickup'); assert.ok(has(events, 'skiPad'));
  assert.ok(events.some(e => e.type === 'radio' && e.line === 'ski.radio.drop'));
  const offers = s.skiOffers();
  assert.deepEqual(offers.runs.map(r => r.id), ['aerials']); assert.equal(offers.kit, false); assert.equal(offers.waxes, null); assert.equal(offers.challenge, null);
  assert.deepEqual(Object.keys(offers.snow).sort(), ['celsius', 'id', 'name'], 'the day\'s snow, never which wax it wants');
  assert.equal(offers.runs[0].best, null); assert.equal(offers.runs[0].medal, 0);
  // Refusals before stepping out.
  assert.equal(s.skiStepOut('slalom').ok, false, 'slalom starts from Devils Playground');
  assert.equal(s.skiStepOut('aerials', {wax: 'hard'}).ok, false, 'a wax needs the Wax kit');
  assert.equal(s.skiStepOut('aerials', {challenge: 'wax'}).ok, false);
  const fuel = s.view().heli.fuelKg, credits = s.profile.credits, before = s.fingerprint();
  assert.deepEqual(s.skiStepOut('aerials'), {ok: true});
  v = s.view();
  assert.equal(v.phase, 'skiing'); assert.equal(v.ski.run.run, 'aerials'); assert.notEqual(s.fingerprint(), before);
  // A restart from the drop is free.
  run(s, 3, () => ({skate: true}));
  assert.ok(s.view().ski.run.t > 2.9);
  assert.equal(s.restartSkiRun().ok, true); assert.equal(s.view().ski.run.t, 0); assert.equal(s.profile.credits, credits);
  const ski = skiOut(s, 'aerials');
  const result = ski.find(e => e.type === 'skiResult');
  assert.ok(result && result.kind === 'points' && result.points > 0, JSON.stringify(result));
  assert.ok(has(ski, 'skiRecorded')); assert.ok(has(ski, 'skiPickup'));
  v = s.view();
  assert.equal(v.phase, 'flying'); assert.equal(v.heli.onGround, true); assert.equal(v.heli.fuelKg, fuel, 'no fuel was burnt on the hop');
  assert.ok(Math.hypot(v.heli.x - pad.x, v.heli.z - pad.z) < 1, 'on the ground at the pickup'); assert.equal(v.ski.run, null);
  const medalPay = [0, 700, 1400, 2300][result.medal];
  assert.equal(s.profile.credits, credits + medalPay); assert.deepEqual(skiOf(s.profile).best, {aerials: result.points});
  assert.equal(skiOf(s.profile).medal.aerials ?? 0, result.medal || 0);
  // Skiing it again pays only the difference up to a higher medal, and the best is kept.
  const wallet = s.profile.credits;
  assert.equal(s.skiStepOut('aerials').ok, true);
  const again = skiOut(s, 'aerials');
  assert.ok(has(again, 'skiPickup'));
  const second = again.find(e => e.type === 'skiResult'), pay = [0, 700, 1400, 2300];
  assert.equal(s.profile.credits, wallet + pay[Math.max(result.medal, second.medal)] - pay[result.medal], 'only a higher medal pays the difference');
  assert.equal(skiOf(s.profile).best.aerials, Math.max(result.points, second.points));
  // Leaving a run: the helicopter comes for the pilot, no charge.
  s.skiStepOut('aerials'); run(s, 2, () => ({skate: true}));
  const money = s.profile.credits;
  assert.equal(s.leaveSkiRun().ok, true); assert.equal(s.view().phase, 'flying'); assert.equal(s.profile.credits, money);
  s.leave();
});

// The Lab's wax challenge and the Wax kit's pick, flown from Devils Playground (a new helicopter for each: the wax is fixed for a run).
function slalomSession(profile, extra = {}) {
  const s = sessionOf(profile, extra);
  s.start(); s.takeSkiDrop(); toSummit(s);
  assert.equal(has(flyToPad(s, SKI_PADS.devils), 'crashed'), false);
  return s;
}
test('the Lab\'s wax challenge: the right wax for the day\'s snow and a slalom inside silver passes the lesson; the wrong wax does not', { timeout: 600000 }, () => {
  const day = 5, right = snowOfDay(day).wax, wrong = WAXES.find(wax => wax !== right);
  const profile = profileOf({count: day});
  const probe = slalomSession(profile, {labEnabled: true});
  const offers = probe.skiOffers();
  assert.deepEqual(offers.runs.map(r => r.id), ['slalom', 'gs', 'moguls']); assert.equal(offers.kit, false);
  assert.deepEqual(offers.challenge, {id: 'wax', run: 'slalom'}); assert.deepEqual([...offers.waxes], [...WAXES]);
  // The challenge needs a pick, a real wax, and only the slalom.
  assert.equal(probe.skiStepOut('slalom', {challenge: 'wax'}).ok, false); assert.equal(probe.skiStepOut('gs', {challenge: 'wax', wax: right}).ok, false);
  assert.equal(probe.skiStepOut('slalom', {challenge: 'wax', wax: 'banana'}).ok, false); assert.equal(probe.skiStepOut('slalom', {challenge: 'speed', wax: right}).ok, false);
  assert.equal(probe.view().phase, 'flying');
  // Without the Lab the challenge is not offered.
  const noLab = slalomSession(profile);
  assert.equal(noLab.skiOffers().challenge, null); assert.equal(noLab.skiStepOut('slalom', {challenge: 'wax', wax: right}).ok, false);
  // The wrong wax: even a fast run does not pass it.
  const bad = slalomSession(profile, {labEnabled: true});
  assert.deepEqual(bad.skiStepOut('slalom', {challenge: 'wax', wax: wrong}), {ok: true}); assert.equal(bad.view().ski.run.pick, wrong);
  assert.equal(Object.hasOwn(bad.view().ski.run, 'wax'), false, 'the view shows the pick, never the verdict');
  const stepped = bad.takeEvents().find(e => e.type === 'skiStepOut');
  assert.equal(stepped.pick, wrong); assert.equal(Object.hasOwn(stepped, 'wax'), false, 'and so does the event');
  const failed = skiOut(bad, 'slalom');
  assert.ok(has(failed, 'waxChallengeFailed') && !has(failed, 'waxChallengePassed'));
  assert.match(failed.find(e => e.type === 'waxChallengeFailed').reason, /does not suit/); assert.equal(labOf(bad.profile).done.wax, undefined);
  // The right wax: passes, and the kit can then be bought.
  const good = slalomSession(profile, {labEnabled: true});
  const before = good.profile.credits;
  assert.deepEqual(good.skiStepOut('slalom', {challenge: 'wax', wax: right}), {ok: true}); assert.equal(good.view().ski.run.pick, right);
  const passed = skiOut(good, 'slalom');
  const result = passed.find(e => e.type === 'skiResult');
  assert.ok(result.time > 0 && result.medal >= 1, JSON.stringify(result));
  assert.ok(has(passed, 'waxChallengePassed'), JSON.stringify(passed.find(e => e.type === 'waxChallengeFailed')));
  assert.equal(labOf(good.profile).done.wax, true, 'the Lab lesson is passed');
  assert.equal(good.profile.credits, before + [0, 700, 1400, 2300][result.medal]);
  assert.equal(skiOf(good.profile).best.slalom, Math.round(result.time * 100) / 100);
  assert.equal(buyUpgrade(good.profile, 'wax-kit', {flags: SKIING}).ok, true, 'and the Wax kit can be bought');
  // With the right wax the run is faster than with the wrong one, on the same line.
  assert.ok(result.time < failed.find(e => e.type === 'skiResult').time, 'the right wax is faster than the wrong one');
});

test('the Wax kit: a pick before the run is judged against the day\'s snow; no pick is the plain snow; the Aerials run waits for the Lab\'s reward', { timeout: 600000 }, () => {
  const day = 5, right = snowOfDay(day).wax;
  let owned = passLesson(profileOf({count: day}), 'wax', {flags: SKIING}).profile;
  owned = buyUpgrade(owned, 'wax-kit', {flags: SKIING}).profile;
  const s = slalomSession(owned, {labEnabled: true});
  const offers = s.skiOffers();
  assert.equal(offers.kit, true); assert.deepEqual([...offers.waxes], [...WAXES]);
  assert.equal(s.skiStepOut('slalom', {wax: 'banana'}).ok, false);
  assert.equal(s.skiStepOut('slalom', {wax: right}).ok, true); assert.equal(s.view().ski.run.pick, right);
  const events = skiOut(s, 'slalom');
  assert.ok(has(events, 'skiResult')); assert.equal(has(events, 'waxChallengePassed') || has(events, 'waxChallengeFailed'), false, 'a pick is not the challenge');
  // No pick: the plain snow.
  const plain = slalomSession(owned, {labEnabled: true});
  assert.equal(plain.skiStepOut('slalom').ok, true); assert.equal(plain.view().ski.run.pick, null);
  plain.restartSkiRun(); assert.equal(plain.view().ski.run.pick, null);
  // The aerials run, at the pickup pad, waits for the free Aerials reward when the Lab is on.
  const gate = sessionOf(profileOf({count: day}), {labEnabled: true});
  gate.start(); gate.takeSkiDrop(); toSummit(gate); flyToPad(gate, SKI_PADS.pickup);
  assert.deepEqual(gate.skiOffers().runs, [], 'Lab on, Launch angles not passed: no aerials');
  const open = sessionOf(passLesson(profileOf({count: day}), 'launch', {flags: SKIING}).profile, {labEnabled: true});
  open.start(); open.takeSkiDrop(); toSummit(open); flyToPad(open, SKI_PADS.pickup);
  assert.deepEqual(open.skiOffers().runs.map(r => r.id), ['aerials'], 'Launch angles passed: the aerials run');
});

test('the group job: aboard at the home pad with 475 kg, skied from the pickup pad, aboard again, flown home and paid once', { timeout: 600000 }, () => {
  const day = groupDay();
  const s = sessionOf(profileOf({count: day}));
  s.start();
  const empty = () => s.view().heli.upgrades?.emptyMassKg ?? KESTREL.emptyKg, light = s.view().readout.weightKg;
  assert.deepEqual(s.takeSkiDrop().ok, true); assert.equal(s.takeSkiGroup().ok, false, 'finish or drop the ski drop first');
  assert.equal(s.dropSkiFlight().dropped, true);
  assert.equal(s.takeSkiGroup().ok, true);
  const taken = s.skiBoard().group;
  assert.equal(taken.taken, true); assert.equal(s.view().ski.group, true); assert.equal(s.view().readout.weightKg, light + 475, 'the group is weight like any other'); assert.equal(empty(), KESTREL.emptyKg + 475);
  assert.equal(s.takeJob('d1-1').ok, false, 'one job at a time'); assert.equal(heliOf(s.profile).jobs.taken, `ski${day}`);
  const credits = s.profile.credits;
  toSummit(s);
  assert.equal(empty(), KESTREL.emptyKg + 475, 'the group rides along the cruise'); assert.equal(s.view().ski.group, true);
  const flown = flyToPad(s, SKI_PADS.pickup);
  assert.equal(has(flown, 'crashed'), false);
  const offers = s.skiOffers();
  assert.equal(offers.group, true); assert.deepEqual(offers.runs.map(r => r.id), ['aerials']);
  assert.equal(s.skiStepOut('aerials').ok, true);
  assert.equal(s.view().ski.group, false, 'the group is out of the helicopter for the run'); assert.equal(empty(), KESTREL.emptyKg);
  const figures = s.view().ski.run.group;
  assert.ok(figures && figures.guests.length === 4 && figures.guide, 'a guide and four guests ski beside the pilot');
  run(s, 6, () => ({skate: true}));
  const later = s.view().ski.run.group;
  assert.ok(later.guests[3].z <= later.guests[0].z + 1e-9 && later.guide.z >= later.guests[3].z, 'the guests follow the guide');
  const ski = skiOut(s, 'aerials');
  assert.ok(has(ski, 'skiPickup'));
  let v = s.view();
  assert.equal(v.ski.group, true, 'the group boards again at the pickup'); assert.equal(v.ski.flight.skied, true);
  assert.equal(empty(), KESTREL.emptyKg + 475);
  // Not paid until they are home.
  assert.equal(heliOf(s.profile).jobs.taken, `ski${day}`);
  // The snowy pickup is reached sooner: enough fuel remains for the cruise.
  // flyHome still exercises the paid truck by idling the tank dry first.
  assert.ok(v.heli.fuelKg > 160 && v.heli.fuelKg < KESTREL.tankKg, `fuel left ${v.heli.fuelKg.toFixed(0)} kg`);
  const wallet = s.profile.credits, homeFlight = flyHome(s), home = homeFlight.home;
  assert.ok(homeFlight.dry.some(e => e.type === 'charged' && e.kind === 'fuelTruck') && wallet > 0, 'the truck filled the tank, for pay');
  assert.ok(has(home, 'skiGroupDone'), 'paid at the home pad');
  const done = home.find(e => e.type === 'skiGroupDone'), pay = done.pay;
  // HELI-PAY-CONTINUE: 3,150, and 800 more when no repair was charged since the group boarded.
  assert.equal(pay, 3150 + (done.clean ? 800 : 0)); assert.equal(done.bonus, done.clean ? 800 : 0);
  assert.equal(done.balance, s.profile.credits, 'the result says what the pilot has now');
  const charged = homeFlight.events.filter(e => e.type === 'charged').reduce((sum, e) => sum + e.charged, 0);
  assert.equal(s.profile.credits, wallet + pay - charged, 'the pay is in, less the truck and any repair');
  assert.ok(heliOf(s.profile).jobs.done.includes(`ski${day}`)); assert.equal(heliOf(s.profile).jobs.taken, null);
  assert.equal(s.view().ski.group, false); assert.equal(empty(), KESTREL.emptyKg, 'the weight is off again'); assert.equal(s.view().ski.flight, null);
  assert.equal(s.skiBoard().group.done, true); assert.equal(s.takeSkiGroup().ok, false, 'once a day');
  s.leave();
});

test('a group job still taken in the save finds its group waiting at the home pad on a new visit; dropping it hands them back', () => {
  const day = groupDay();
  const first = sessionOf(profileOf({count: day}));
  first.start(); first.takeSkiGroup();
  const saved = first.leave();
  const next = sessionOf(saved);
  next.start();
  assert.equal(next.view().ski.group, true); assert.equal(next.view().ski.flight.kind, 'group'); assert.equal(next.view().readout.weightKg, first.view().readout.weightKg);
  assert.equal(next.dropSkiFlight().dropped, true);
  assert.equal(heliOf(next.profile).jobs.taken, null); assert.equal(next.view().ski.group, false); assert.equal(next.view().readout.weightKg, 1630);
  assert.equal(next.takeSkiGroup().ok, true, 'it can be taken again today');
  // A new day: the taken job is out of date and nobody waits.
  const tomorrow = sessionOf(profileOf({count: day + 1, extra: {heli: {version: 1, fuelKg: 400, lessons: TRAINED, refuels: 3, playDay: {last: DAY, count: day + 1}, jobs: {day, taken: `ski${day}`, done: []}}}}));
  tomorrow.start();
  assert.equal(tomorrow.view().ski.group, false);
});

// ---- the review's faults ------------------------------------------------------------------------------------------
function hookOwnCar(session) {
  const car = () => session.view().loads.find(load => load.own);
  const over = {x: car().x, z: car().z, y: car().y + 15.3};
  run(session, 90, v => pilot(v, over, {speed: 10, sink: 4}), v => Math.hypot(v.heli.x - over.x, v.heli.z - over.z) < 1 && Math.abs(v.heli.y - over.y) < 0.4 && Math.hypot(v.heli.vx, v.heli.vz, v.heli.vy) < 0.5);
  session.pressHook(); session.takeEvents();
  assert.equal(car().hooked, true);
  // Back down on the pad with the car still on the hook (it lies on the ground, slack).
  const zone = session.view().zone;
  run(session, 120, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + 17}, {speed: 3, sink: 3}), v => Math.hypot(v.heli.x - zone.x, v.heli.z - zone.z) < 2 && Math.hypot(v.heli.vx, v.heli.vz) < 0.5);
  run(session, 60, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y - 2}, {speed: 1, sink: 1.5}), v => v.heli.onGround);
  assert.equal(session.view().heli.onGround, true); assert.equal(car().hooked, true);
}
test('what is in hand stops a ski flight: a hooked load, a lesson, a Lab challenge, a group aboard; a stale job from another day does not', () => {
  const s = sessionOf(profileOf());
  s.start();
  hookOwnCar(s);
  assert.equal(s.takeSkiDrop().ok, false); assert.equal(s.takeSkiGroup().ok, false);
  const lessoned = sessionOf(profileOf());
  lessoned.start();
  assert.equal(lessoned.startLesson('hover').ok, true);
  assert.equal(lessoned.takeSkiDrop().ok, false); assert.equal(lessoned.takeSkiGroup().ok, false);
  // A group aboard keeps lessons and challenges off the pad; the drop and the group are one thing at a time.
  const day = groupDay(), grouped = sessionOf(profileOf({count: day}), {labEnabled: true});
  grouped.start(); assert.equal(grouped.takeSkiGroup().ok, true);
  assert.equal(grouped.startLesson('hover').ok, false); assert.equal(grouped.startChallenge('headings').ok, false);
  assert.deepEqual(grouped.takeSkiDrop().ok, false); assert.match(grouped.takeSkiDrop().reason, /group job/);
  // A job left taken on an earlier play day is out of date: nothing shows it, and it does not stop the drop.
  const stale = sessionOf(profileOf({count: 6, extra: {heli: {version: 1, fuelKg: 400, lessons: TRAINED, refuels: 3, playDay: {last: DAY, count: 6}, jobs: {day: 5, taken: 'd5-1', done: []}}}}));
  stale.start();
  assert.equal(stale.job, null); assert.equal(stale.takeSkiDrop().ok, true);
  // And a normal job in hand today does.
  const jobbed = sessionOf(profileOf());
  jobbed.start();
  assert.equal(jobbed.takeJob(jobbed.boardJobs()[1].id).ok, true); assert.equal(jobbed.takeSkiDrop().ok, false);
  // And the other way: a ski drop or the group in hand keeps the board's other jobs (and their arrows) off.
  const dropped = sessionOf(profileOf());
  dropped.start(); assert.equal(dropped.takeSkiDrop().ok, true);
  assert.equal(dropped.takeJob(dropped.boardJobs()[1].id).ok, false); assert.equal(dropped.takeJob('own').ok, false); assert.equal(dropped.view().destination, 'summit-run');
  assert.equal(dropped.dropSkiFlight().dropped, true); assert.equal(dropped.takeJob(dropped.boardJobs()[1].id).ok, true);
  assert.equal(grouped.takeJob(grouped.boardJobs()[1].id).ok, false);
  // Null options are no options.
  assert.doesNotThrow(() => stale.skiStepOut('slalom', null));
});

test('the group is paid only for a run with a result: leaving it, or reaching the pickup past the gates, is no run', { timeout: 600000 }, () => {
  const day = groupDay(), s = sessionOf(profileOf({count: day}));
  s.start(); s.takeSkiGroup(); toSummit(s);
  assert.equal(has(flyToPad(s, SKI_PADS.pickup), 'crashed'), false);
  // Leave at once: the group is aboard again but the job is not done.
  assert.equal(s.skiStepOut('aerials').ok, true); run(s, 1, () => ({skate: true}));
  assert.equal(s.leaveSkiRun().ok, true);
  assert.equal(s.view().ski.flight.skied, false); assert.equal(s.view().ski.group, true);
  assert.equal(s.view().destination, 'tremblant-woods', 'the way home is set');
  // The pure run: skirting the start and finish gates to the pickup ends the run with no result.
  const zone = skiZone('aerials'), around = createSkiRun({runId: 'aerials'}), drive = skierDriver('aerials', [{x: 24, z: zone.pickup.z - 40}, zone.pickup]);
  let steps = 0;
  while (!around.ended && steps++ < 120 * 120) stepSkiRun(around, drive(skiRunView(around).skier));
  assert.equal(around.ended, true); assert.equal(around.finished, false); assert.equal(around.result, null);
  // Through the session: the same run, then a real one that counts.
  assert.equal(s.skiStepOut('aerials').ok, true);
  const skirt = skierDriver('aerials', [{x: 24, z: zone.pickup.z - 40}, zone.pickup]);
  const skirted = run(s, 120, v => skirt(v.ski.run.skier), v => v.phase !== 'skiing');
  assert.equal(has(skirted, 'skiPickup'), true); assert.equal(has(skirted, 'skiResult'), false);
  assert.equal(s.view().ski.flight.skied, false, 'no result, not skied'); assert.equal(skirted.filter(e => e.type === 'skiPickup' && !e.fetched).length, 1, 'one pickup event');
  assert.equal(s.skiStepOut('aerials').ok, true);
  const real = skiOut(s, 'aerials');
  assert.equal(has(real, 'skiResult'), true); assert.equal(s.view().ski.flight.skied, true);
  s.leave();
});

test('stepping out takes the autopilot off; a free drop is done when the helicopter is home again', { timeout: 600000 }, () => {
  const s = sessionOf(profileOf());
  s.start(); s.takeSkiDrop(); toSummit(s);
  assert.equal(has(flyToPad(s, SKI_PADS.pickup), 'crashed'), false);
  assert.equal(s.pressAutopilot(), true); assert.equal(s.autopilotOn, true);
  assert.equal(s.skiStepOut('aerials').ok, true); assert.equal(s.autopilotOn, false, 'the new helicopter does not take off by itself');
  const ski = skiOut(s, 'aerials');
  assert.equal(ski.filter(e => e.type === 'skiPickup').length, 1, 'one pickup event for one pickup');
  assert.equal(s.view().ski.flight.skied, true); assert.equal(s.view().destination, 'tremblant-woods');
  assert.equal(s.autopilotOn, false);
  const flight = flyHome(s);
  assert.ok(has(flight.events, 'skiDropDone'), 'home again: the free drop is done');
  assert.equal(s.view().ski.flight, null); assert.equal(s.view().destination, null);
  // The Summit ceiling is the flat one again (nothing in hand).
  assert.equal(s.takeSkiDrop().ok, true, 'and a new one can be taken');
  s.leave();
});

test('the thin-air line plays once, only when the collective is at its top and the helicopter still sinks high on the mountain', { timeout: 600000 }, () => {
  const s = sessionOf(profileOf());
  s.start(); s.takeSkiDrop(); toSummit(s);
  const sink = seconds => run(s, seconds, () => ({lift: -1}));
  const full = seconds => run(s, seconds, () => ({lift: 1}));
  const lines = events => events.filter(event => event.line === 'ski.radio.thin-air').length;
  // Low on the mountain (the road's start, 2,860 m) the air is not thin enough for the line, however it sinks.
  run(s, 40, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.heli.y + 60}, {speed: 1, sink: 4}), v => v.heli.y > 60);
  sink(1.5);
  assert.equal(lines(full(4)), 0, 'not below 3,500 m');
  assert.equal(s.view().heli.y + s.view().heli.altitudeOffset < 3500, true);
  // High up, at the summit pad (3,586 m): the line plays the first time the collective is at its top and the helicopter still sinks.
  // Landing there from the cruise does it (the pilot arrests the descent at full collective), and it plays only once.
  const flown = flyToPad(s, SKI_PADS.summit);
  assert.equal(has(flown, 'crashed'), false);
  assert.equal(lines(flown), 1, 'once, on the way in');
  run(s, 20, v => pilot(v, {x: SKI_PADS.summit.x, z: SKI_PADS.summit.z, y: SKI_PADS.summit.y + 80}, {speed: 2, sink: 4}), v => v.heli.y > SKI_PADS.summit.y + 70);
  assert.equal(lines(run(s, 2, () => ({lift: 0.5}))), 0, 'climbing is not sinking');
  sink(2);
  assert.ok(s.view().heli.vy < 0);
  assert.equal(lines(full(3)), 0, 'and only the first time');
  s.leave();
  // A new visit hears it again: nothing about it is saved.
  const again = sessionOf(profileOf());
  again.start(); again.takeSkiDrop(); toSummit(again);
  const second = flyToPad(again, SKI_PADS.summit);
  assert.equal(has(second, 'crashed'), false); assert.equal(lines(second), 1);
  again.leave();
});

test('powder: the stashes pay 700 each, once, and the run has no result', { timeout: 600000 }, () => {
  const s = sessionOf(profileOf());
  s.start(); s.takeSkiDrop(); toSummit(s);
  assert.equal(has(flyToPad(s, SKI_PADS.summit), 'crashed'), false);
  assert.deepEqual(s.skiOffers().runs.map(r => r.id), ['powder']);
  const credits = s.profile.credits;
  assert.equal(s.skiStepOut('powder').ok, true);
  const events = skiOut(s, 'powder', 900);
  assert.equal(has(events, 'skiResult'), false, 'powder is not timed or judged');
  const stashes = events.filter(e => e.type === 'skiStashPaid' && e.found);
  assert.ok(stashes.length >= 1, 'at least one stash found');
  assert.equal(s.profile.credits, credits + 700 * skiOf(s.profile).stashes.length);
  assert.ok(has(events, 'skiPickup'));
  // Skiing it again finds nothing new to pay for.
  const found = skiOf(s.profile).stashes.length, money = s.profile.credits;
  s.leaveSkiRun();
  assert.equal(s.view().phase, 'flying');
  assert.ok(found >= 1 && money === credits + 700 * found);
  s.leave();
});

test('the group never takes the powder run: at the summit pad with the group aboard only a note is offered', { timeout: 600000 }, () => {
  const day = groupDay(), s = sessionOf(profileOf({count: day}));
  s.start(); assert.equal(s.takeSkiGroup().ok, true); toSummit(s);
  const flown = flyToPad(s, SKI_PADS.summit, {speed: 14, clear: 130});
  assert.equal(has(flown, 'crashed'), false);
  assert.equal(s.view().ski.pad, 'summit'); assert.equal(s.view().ski.group, true);
  assert.deepEqual(s.skiOffers().runs, [], 'the powder run is not for the group');
  assert.equal(s.skiStepOut('powder').ok, false);
  s.leave();
});

// ---- the ski run itself ---------------------------------------------------------------------------------------
test('a ski run: every run starts, finishes and ends at the pickup; the same controls give the same run; the view and the controls are safe', () => {
  const kinds = {slalom: 'time', gs: 'time', moguls: 'points', aerials: 'points'};
  for (const [id, kind] of Object.entries(kinds)) {
    const make = () => { const r = createSkiRun({runId: id}); const drive = skierDriver(id); const log = []; let steps = 0;
      while (!r.ended && steps++ < 120 * 400) for (const e of stepSkiRun(r, drive(skiRunView(r).skier))) log.push(e.type); return {r, log: log.join(',')}; };
    const a = make(), b = make();
    assert.equal(a.log, b.log, `${id}: repeatable`); assert.equal(JSON.stringify(a.r.result), JSON.stringify(b.r.result));
    assert.equal(a.r.result.kind, kind === 'time' ? 'time' : 'points', id); assert.ok(a.r.finished && a.r.ended, `${id}: finished and ended at the pickup`);
    assert.ok(a.log.includes('skiStart') && a.log.includes('skiFinish') && a.log.includes('skiPickup'), id);
  }
  assert.throws(() => createSkiRun({runId: 'nonsense'})); assert.throws(() => createSkiRun({}));
  // Junk controls are a lawful stand-still, never a throw.
  const r = createSkiRun({runId: 'slalom'});
  for (const junk of [undefined, null, 7, 'x', [], {turn: NaN, flip: Infinity, skid: 'yes', tuck: 1}, {turn: 99, flip: -99}]) assert.doesNotThrow(() => stepSkiRun(r, junk));
  assert.deepEqual(skiControls({turn: 99, flip: -99, skid: 'yes'}), {turn: 1, flip: -1, skid: false, tuck: false, skate: false, pop: false});
  const view = skiRunView(r);
  assert.throws(() => { 'use strict'; view.t = 5; }); assert.equal(Object.isFrozen(view), true);
  // The zone is walled in: skiing straight off the side puts the skier back on the edge.
  const wall = createSkiRun({runId: 'slalom'});
  let out = false;
  for (let i = 0; i < 120 * 30 && !out; i++) out = stepSkiRun(wall, {turn: -1, skate: true}).some(e => e.type === 'skiOut');
  const b = wall.zone.bounds;
  assert.ok(wall.skier.x >= b.minX && wall.skier.x <= b.maxX && wall.skier.z >= b.minZ && wall.skier.z <= b.maxZ);
  // A medal run holds the zone's own limits; the ghost and the group follow the guide.
  const slalom = skiRunView(createSkiRun({runId: 'slalom', group: true}));
  assert.deepEqual(Object.keys(slalom.limits).sort(), ['bronze', 'gold', 'kind', 'silver']); assert.ok(slalom.ghost); assert.ok(slalom.group.guests.length === 4);
  assert.equal(skiRunView(createSkiRun({runId: 'powder', group: true})).group, null, 'powder has no guide to follow');
  assert.deepEqual(SKI_RUN_IDS, ['slalom', 'gs', 'moguls', 'aerials', 'powder']);
});


test('Casual slalom assist is bounded, fades against input, and is off in air, tumbles, Pro and other runs', () => {
  const r = createSkiRun({runId: 'slalom', difficulty: 'casual'});
  r.skier.x = 10;
  const full = skiLineAssist(r);
  assert.ok(full > 0 && full <= 1 / 3);
  assert.equal(skiLineAssist(r, -1), 0, 'full opposite input wins');
  assert.equal(skiLineAssist(r, -0.5), full / 2, 'analogue opposition fades linearly');
  r.skier.grounded = false; assert.equal(skiLineAssist(r), 0);
  r.skier.grounded = true; r.skier.tumble = 1; assert.equal(skiLineAssist(r), 0);
  r.skier.tumble = 0; r.difficulty = 'pro'; assert.equal(skiLineAssist(r), 0);
  r.difficulty = 'casual'; r.crossing.next = r.zone.gates.length; assert.equal(skiLineAssist(r), 0);
  for (const runId of ['gs', 'moguls', 'aerials', 'powder']) assert.equal(skiLineAssist(createSkiRun({runId, difficulty: 'casual'})), 0);
  const world = {ground: () => 0};
  for (const tuck of [false, true]) {
    const a = createSkier({world, speed: 20}), b = createSkier({world, speed: 20});
    stepSkier(a, {tuck, lineAssist: 99}, world);
    stepSkier(b, {tuck}, world);
    const max = a.speed / (SKI.carveRadius * Math.cos(tuck ? SKI.tuckEdge : SKI.maxEdge)) * SKI_STEP / 3;
    assert.ok(Math.abs(a.heading - b.heading) <= max + 1e-12, 'at most one third of the current stance full carve');
    assert.equal(a.speed, b.speed, 'assist chooses no speed');
    assert.equal(a.edge, b.edge, 'assist does not replace the player edge');
  }
});

test('keyboard Casual meets the three-miss target; difficulty limits and repeated inputs agree', () => {
  const play = (difficulty, practice) => {
    const r = createSkiRun({runId: 'slalom', difficulty}), drive = keyboardDriver(r.zone, {practice});
    for (let i = 0; i < 120 * 120 && !r.result; i++) stepSkiRun(r, skiKeys(drive(skiRunView(r), r.t)));
    return r;
  };
  const steady = play('casual', false), practised = play('casual', true), pro = play('pro', true);
  assert.ok(steady.result && steady.result.missed <= 3, 'steady Casual finishes with at most three misses');
  assert.equal(steady.result.medal, 1, 'first steady attempt earns bronze');
  assert.equal(practised.result.missed, 0, 'practised Casual is clean');
  assert.equal(practised.result.medal, 2, 'gold needs improvement over the practised baseline');
  assert.equal(pro.result.missed, 2, 'Pro retains its unassisted keyboard outcome');
  assert.equal(pro.result.medal, 2);
  for (const [difficulty, practice] of [['casual', false], ['casual', true], ['pro', true]]) {
    const a = play(difficulty, practice), b = play(difficulty, practice), limits = skiRunView(a).limits;
    assert.deepEqual(a.result, b.result, 'same difficulty and keys repeat');
    assert.equal(a.result.medal, a.result.time <= limits.gold ? 3 : a.result.time <= limits.silver ? 2 : a.result.time <= limits.bronze ? 1 : 0);
  }
});
