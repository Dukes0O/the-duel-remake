// LAB-HELI (docs/LAB.md 4.1 and 4.2): the Lab's upgrades take effect in the helicopter, and with nothing bought every
// result is exactly what it was. The existing helicopter suites pass untouched; this one adds the Lab's claims.
// Headless, memory only, no clock and no Math.random.
import assert from 'node:assert/strict';
import test from 'node:test';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {CARS} from '../src/config.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {createHeliSession} from '../src/heli/heli-session.js';
import {armMissions} from '../src/heli/heli-missions.js';
import {heliOf, missionsOf, setMissions, createMissions, setFire, fireOf} from '../src/heli/heli-save.js';
import {GRAVITY, KESTREL, createHeliState, heliMass, availableThrust, airFactor, heliReadout, heliFingerprint} from '../src/heli/heli-flight.js';
import {liftCheck, carMassKg, CABLE} from '../src/heli/heli-cable.js';
import {BUCKET, DROP_AIM_RINGS, RETARDANT_LITRES, createBucket, stepBucket, bucketHolds, setBucketWater} from '../src/heli/heli-bucket.js';
import {FIRE, RETARDANT, cellId, applyWater, applyRetardant, spreadStep, treatedCells} from '../src/heli/heli-fire.js';
import {dayJobs} from '../src/heli/heli-jobs.js';
import {heliUpgrades} from '../src/lab/lab-heli.js';
import {createLab} from '../src/lab/lab-save.js';
import {cablePeriod} from '../src/lab/benches/pendulum.js';
import {createProfile, normalizeProfile} from '../src/progression.js';

const on = {enabled: true};
const near = (actual, expected, share, message) => assert.ok(Math.abs(actual - expected) <= Math.abs(expected) * share, `${message}: ${actual} against ${expected}`);
const lab = (...ids) => ({...createLab(), owned: Object.fromEntries(ids.map(id => [id, true]))});
const WOODS_ALTITUDE = 250, SUMMIT_ALTITUDE = 2860;

// ---- the flight rules --------------------------------------------------------------------------------
const hoverState = (upgrades, {altitude = WOODS_ALTITUDE, fuelKg = KESTREL.tankKg, height = 20} = {}) =>
  createHeliState({x: 0, y: height, z: 0, fuelKg, altitudeOffset: altitude, upgrades});
// Can the rotor lift the helicopter and this load clear of the ground effect? The share of weight it has left over.
const climbMargin = (upgrades, loadKg, options) => {
  const state = hoverState(upgrades, options);
  return availableThrust(state, 20) / ((heliMass(state) + loadKg) * GRAVITY) - 1;
};

test('with nothing bought the flight is the flight as it was', () => {
  const stock = heliUpgrades(createLab());
  assert.deepEqual(stock, heliUpgrades(null));
  const plain = createHeliState({fuelKg: 300, altitudeOffset: 250}), withNothing = createHeliState({fuelKg: 300, altitudeOffset: 250, upgrades: null});
  assert.deepEqual(plain, withNothing);
  assert.equal(Object.hasOwn(plain, 'upgrades'), false, 'a plain helicopter gets no upgrades field');
  assert.equal(heliMass(plain), KESTREL.emptyKg + KESTREL.pilotKg + 300);
  assert.equal(availableThrust(plain, 5), KESTREL.maxThrust * airFactor(250) * (1 + KESTREL.groundEffect * 0.5) * 1);
  assert.equal(heliReadout(plain).maxLiftKg, KESTREL.maxThrust * airFactor(250) / GRAVITY);
  assert.equal(airFactor(2860), Math.exp(-2860 / KESTREL.airScaleHeight));
  assert.equal(heliFingerprint(plain), heliFingerprint(withNothing));
  // The bucket and the hook limit as they were.
  assert.equal(bucketHolds(createBucket({})), BUCKET.holds[0]);
  assert.equal(Object.hasOwn(createBucket({}), 'litres'), false); assert.equal(Object.hasOwn(createBucket({litres: 600}), 'litres'), false);
  assert.equal(liftCheck('stuttgart_959s').ok, true); assert.equal(liftCheck('banshee_muscle').ok, false);
  assert.equal(liftCheck('banshee_muscle').reason, "Needs the Lab's lift upgrade.");
});

test('the Dusthawk lifts with a full tank and no upgrades; the Banshee needs Engine 2 and the Heavy hook', () => {
  const dusthawk = carMassKg('dusthawk_rally'), banshee = carMassKg('banshee_muscle');
  assert.equal(dusthawk, 1280); assert.equal(banshee, 1810);
  assert.equal(liftCheck('dusthawk_rally').ok, true);
  assert.ok(climbMargin(null, dusthawk) > 0.10, 'the Dusthawk lifts with a full tank from the home pad at 250 m');
  // The Banshee is over the hook's limit with nothing bought, and over the rotor's lift in thin air.
  assert.equal(liftCheck('banshee_muscle').ok, false);
  assert.ok(climbMargin(null, banshee) < 0, 'stock thrust cannot hold the Banshee up');
  assert.equal(liftCheck('banshee_muscle', heliUpgrades(lab('heavy-hook')).hookLimitKg).ok, true, 'the Heavy hook alone lets the hook take it');
  assert.ok(climbMargin(heliUpgrades(lab('heavy-hook', 'engine-1', 'engine-2')), banshee) > 0.04, 'with Engine 2 the rotor lifts it');
  assert.ok(climbMargin(heliUpgrades(lab('heavy-hook', 'engine-1')), banshee) < 0.01, 'Engine 1 alone barely holds it, no climb');
  assert.ok(climbMargin(heliUpgrades(lab('heavy-hook')), banshee) < 0, 'the hook without the engine does not lift it');
  assert.equal(liftCheck('titan_monster', 2000).ok, false, 'the Titan is too heavy for any helicopter');
  // Light frame: 80 kg less empty mass.
  const frame = heliUpgrades(lab('light-frame')), light = hoverState(frame), plain = hoverState(null);
  assert.equal(heliMass(plain) - heliMass(light), 80);
  assert.ok(availableThrust(light, 20) === availableThrust(plain, 20), 'a lighter frame does not add thrust');
});

test('Engine 1 and 2 scale the rotor\'s thrust, and the altitude tune keeps more of it high up', () => {
  const sea = availableThrust(createHeliState({altitudeOffset: 0, y: 30}), 30);
  near(availableThrust(createHeliState({altitudeOffset: 0, y: 30, upgrades: heliUpgrades(lab('engine-1'))}), 30), sea * 1.05, 1e-12, 'Engine 1');
  near(availableThrust(createHeliState({altitudeOffset: 0, y: 30, upgrades: heliUpgrades(lab('engine-1', 'engine-2'))}), 30), sea * 1.10, 1e-12, 'Engine 2');
  const tune = heliUpgrades(lab('altitude-tune'));
  const atSummit = createHeliState({altitudeOffset: SUMMIT_ALTITUDE, y: 30, upgrades: tune}), atSea = createHeliState({altitudeOffset: 0, y: 30, upgrades: tune});
  near(availableThrust(atSummit, 30) / availableThrust(atSea, 30), 0.751, 0.002, 'summit thrust with the tune is 0.751 of sea level');
  const stockSummit = availableThrust(createHeliState({altitudeOffset: SUMMIT_ALTITUDE, y: 30}), 30) / availableThrust(createHeliState({altitudeOffset: 0, y: 30}), 30);
  near(stockSummit, 0.714, 0.002, 'the stock figure');
  assert.ok(availableThrust(atSummit, 30) > availableThrust(createHeliState({altitudeOffset: SUMMIT_ALTITUDE, y: 30}), 30));
  const readout = heliReadout(atSummit);
  near(readout.maxLiftKg, KESTREL.maxThrust * Math.exp(-(30 + SUMMIT_ALTITUDE) / 10000) / GRAVITY, 1e-9, 'the instruments show the tuned lift');
  // The upgrades ride on the state without being changed.
  assert.ok(Object.isFrozen(atSummit.upgrades));
});

test('the 25 m line swings slower than 15 m, as the formula says', () => {
  const short = cablePeriod(CABLE.length, 1250), long = cablePeriod(25, 1250);
  near(short, 7.8, 0.05, '15 m'); near(long, 10, 0.05, '25 m');
  assert.ok(long > short);
  assert.equal(heliUpgrades({...lab('long-cable'), cable: 25}).lineLengthM, 25);
  assert.equal(heliUpgrades({...lab('long-cable'), cable: 15}).lineLengthM, 15);
});

// ---- the bucket ---------------------------------------------------------------------------------------
const lake = {water: () => 0, height: () => -3, highest: () => -3};
test('the bigger bucket holds 800 litres and weighs for it; the ring follows the saved tier', () => {
  const big = createBucket({litres: heliUpgrades(lab('big-bucket')).bucketLitres});
  assert.equal(big.litres, 800);
  assert.equal(bucketHolds(big), 800);
  setBucketWater(big, 5000);
  assert.equal(big.water, 800); assert.equal(big.massKg, BUCKET.emptyKg + 800);
  big.damage = 1;
  near(bucketHolds(big), BUCKET.holds[1] * 800 / 600, 1e-12, 'damage takes the same share');
  assert.equal(bucketHolds({...createBucket({}), damage: 3}), 0);
  const plain = createBucket({}); setBucketWater(plain, 5000);
  assert.equal(plain.water, 600);
  assert.deepEqual([0, 1, 2, 3].map(ringIndex => DROP_AIM_RINGS[heliUpgrades({...createLab(), ringBest: 3, ring: ringIndex}).ringIndex]), [12, 8, 5, 0]);
});

// ---- retardant ----------------------------------------------------------------------------------------
const gridOf = (columns, rows) => {
  const cells = new Map();
  for (let i = 0; i < columns; i++) for (let j = 0; j < rows; j++) cells.set(cellId(i, j), {i, j, x: (i + 0.5) * FIRE.cell, y: 0, z: (j + 0.5) * FIRE.cell});
  return {cells};
};
const fireOn = (burning, extra = {}) => ({id: 'f1', courseId: 'tremblant-woods', seed: 7, startDay: 0, steps: 0, engineSeconds: 0, burning, burnt: [], damp: [], ...extra});
const patchAt = (i, j, litres, radius = 6, extra = {}) => ({x: (i + 0.5) * FIRE.cell, z: (j + 0.5) * FIRE.cell, litres, radius, ...extra});

test('retardant: 150 litres treat a cell, treated cells cannot catch, burning cells are not lowered, nothing is put out', () => {
  const grid = gridOf(9, 3), start = cellId(0, 1);
  const fire = fireOn([[start, FIRE.startPercent]]);
  const coat = (burning, patch) => applyWater(burning, grid, [patch]);
  // Under 150 litres a cell is not treated; at 150 it is.
  const small = coat(fire, patchAt(4, 1, 100, 4, {retardant: true}));
  assert.equal(small.cellsTreated, 0); assert.equal(treatedCells(small.fire).size, 0);
  assert.ok(small.fire.retardant.length > 0, 'the litres are remembered');
  const full = applyWater(small.fire, grid, [patchAt(4, 1, 100, 4, {retardant: true})]);
  assert.ok(full.cellsTreated >= 1 && treatedCells(full.fire).has(cellId(4, 1)));
  // It puts nothing out and does not lower the fire.
  assert.equal(full.cellsOut, 0); assert.equal(full.litresOnFire, 0);
  const onFlames = applyRetardant(fire, grid, [patchAt(0, 1, 5000, 8)]);
  assert.deepEqual(onFlames.fire.burning, fire.burning, 'a burning cell keeps burning at the same strength');
  assert.equal(onFlames.fire.retardant?.some(([cell]) => cell === start) ?? false, false, 'a burning cell takes none');
  assert.equal(onFlames.cellsTreated >= 0, true);
  // Water on the same drop still works and is not changed by retardant.
  const both = applyWater(fire, grid, [patchAt(0, 1, 400, 8), patchAt(5, 1, 300, 8, {retardant: true})]);
  assert.ok(both.cellsOut >= 1 || both.litresOnFire > 0, 'water still fights the fire');
  assert.deepEqual(applyWater(fire, grid, [patchAt(0, 1, 400, 8)]).fire.burning, applyWater(fire, grid, [patchAt(0, 1, 400, 8), patchAt(6, 1, 0, 8, {retardant: true})]).fire.burning);
  // A line of treated cells across the grid stops the spread; the untreated grid burns to the far side.
  let blocked = fire, open = fire;
  for (let j = 0; j < 3; j++) blocked = applyRetardant(blocked, grid, [patchAt(4, j, 4000, 4)]).fire;
  assert.ok(treatedCells(blocked).size >= 3);
  for (let step = 0; step < 30; step++) { blocked = spreadStep(blocked, grid, null); open = spreadStep(open, grid, null); }
  const columnOf = cell => Math.floor(cell / 1024) - 512;
  assert.equal(open.burning.some(([cell]) => columnOf(cell) >= 6), true, 'the untreated fire spreads past column 4');
  assert.equal(blocked.burning.some(([cell]) => columnOf(cell) >= 4), false, 'the treated line stops it');
  assert.equal(treatedCells(blocked).size >= 3, true, 'and the treated cells stay treated');
  // Without any retardant a fire record is exactly what it was: spreadStep is the same.
  assert.deepEqual(spreadStep(fire, grid, null), spreadStep({...fire}, grid, null));
  assert.equal(Object.hasOwn(spreadStep(fire, grid, null), 'retardant'), false);
  assert.equal(RETARDANT.litresPerCell, 150);
});

test('retardant survives the save: the fire record keeps its litres, and old records read as before', () => {
  const grid = gridOf(9, 3), fire = fireOn([[cellId(0, 1), FIRE.startPercent]]);
  const coated = applyRetardant(fire, grid, [patchAt(4, 1, 400, 5)]).fire;
  const profile = normalizeProfile({...createProfile(), heli: {version: 1, fuelKg: 0, lessons: {liftoff: true, hover: true, landing: true, carry: true}}});
  const saved = setFire(profile, coated, on);
  assert.equal(saved.ok, true);
  assert.deepEqual(fireOf(saved.profile).retardant, coated.retardant);
  const plain = setFire(profile, fire, on);
  assert.equal(Object.hasOwn(fireOf(plain.profile), 'retardant'), false, 'a fire with none stores none');
  assert.deepEqual(fireOf(setFire(saved.profile, fireOn([[cellId(0, 1), 100]], {retardant: [[cellId(0, 1), 300]]}), on).profile).retardant ?? [], [],
    'litres on a burning cell are not kept');
  assert.deepEqual(fireOf(setFire(profile, fireOn([], {retardant: 'junk'}), on).profile).retardant ?? [], []);
});

test('the bucket pours retardant like water, only from the pad, and a lake never refills it', () => {
  const bucket = createBucket({litres: 800, x: 0, z: 0});
  Object.assign(bucket, {y: 60, onGround: false, contents: 'retardant'});
  setBucketWater(bucket, RETARDANT_LITRES);
  assert.equal(bucket.water, 600);
  // Dipped in a lake it takes nothing.
  const dipped = createBucket({litres: 800, x: 0, z: 0}); Object.assign(dipped, {y: 3.8 - 0.5, onGround: false, contents: 'retardant'});
  setBucketWater(dipped, 100);
  stepBucket(dipped, {ground: lake});
  assert.equal(dipped.water, 100, 'no refill with retardant aboard');
  const water = createBucket({litres: 800, x: 0, z: 0}); Object.assign(water, {y: 3.8 - 0.5, onGround: false});
  for (let i = 0; i < 120; i++) stepBucket(water, {ground: lake});
  assert.ok(water.water > 0, 'a water bucket does fill from the lake');
  // Pouring: the patches say retardant, and the bucket is a water bucket again once empty.
  const patches = [];
  for (let i = 0; i < 1500; i++) {
    const out = stepBucket(bucket, {ground: {water: () => null, height: () => 0, highest: () => 0}, pour: true});
    patches.push(...out.patches);
    if (bucket.contents === undefined && bucket.water === 0 && !bucket.parcels.length) break;
  }
  assert.ok(patches.length > 0 && patches.every(patch => patch.retardant === true), 'every parcel of the pour is retardant');
  assert.equal(bucket.contents, undefined, 'empty means water again');
  const litres = patches.reduce((sum, patch) => sum + patch.litres, 0);
  assert.ok(litres > 0 && litres <= RETARDANT_LITRES + 1e-6, 'no more falls than was loaded');
  const plainOut = stepBucket(Object.assign(createBucket({}), {y: 60, onGround: false, water: 100, massKg: 150, parcels: [{x: 0, y: 0.5, z: 0, vx: 0, vy: -9, vz: 0, litres: 25, from: 60}]}),
    {ground: {water: () => null, height: () => 0, highest: () => 0}});
  assert.equal(plainOut.patches.every(patch => !Object.hasOwn(patch, 'retardant')), true, 'water patches carry no retardant key');
});

// ---- the session --------------------------------------------------------------------------------------
const worlds = new Map();
function loadCourse(id) {
  if (!worlds.has(id)) { const course = new Course(ALL_CIRCUITS.find(def => def.id === id), 1989); worlds.set(id, {course, ground: groundFromCourse(course)}); }
  return worlds.get(id);
}
const DAY = '2026-10-20';
const TRAINED = {liftoff: true, hover: true, landing: true, carry: true};
function readyProfile({credits = 5000, labField} = {}) {
  const profile = normalizeProfile({...createProfile(), credits, courses: {version: 1, unlocked: ['tremblant-woods']},
    heli: {version: 1, fuelKg: 400, lessons: TRAINED, refuels: 3, playDay: {last: DAY, count: 5}},
    ...(labField ? {lab: labField} : {})});
  const armed = armMissions(createMissions(), {date: '2026-10-14', playerName: 'Lab QA'});
  return setMissions(profile, {...armed, count: armed.need}, on).profile;
}
const sessionOf = (profile, extra = {}) => createHeliSession({profile, enabled: true, loadCourse, loadFireCourse: loadCourse, fireEnabled: true,
  playerName: 'Lab QA', today: DAY, carId: 'falcone_f42', ...extra});
function pilot(view, target, {speed = 12, sink = 4} = {}) {
  const h = view.heli, fwdX = Math.sin(h.heading), fwdZ = Math.cos(h.heading), rightX = -fwdZ, rightZ = fwdX;
  const dx = target.x - h.x, dz = target.z - h.z, distance = Math.hypot(dx, dz), want = Math.min(speed, distance * 0.4);
  const wx = distance > 0.01 ? dx / distance * want : 0, wz = distance > 0.01 ? dz / distance * want : 0, ex = wx - h.vx, ez = wz - h.vz;
  const clamp = v => Math.max(-1, Math.min(1, v));
  return {pitch: clamp((ex * fwdX + ez * fwdZ) * 0.25), roll: clamp((ex * rightX + ez * rightZ) * 0.25),
    lift: clamp(Math.max(-sink, Math.min(sink, target.y - h.y)) * 0.3 - h.vy * 0.3), yaw: 0};
}
function run(session, seconds, controls, until = null) {
  const events = [];
  for (let i = 0; i < Math.round(seconds * 120); i++) { events.push(...session.step(controls(session.view()))); if (until?.(session.view(), events)) break; }
  return events;
}
const snapshot = (session, events) => [JSON.stringify(events), JSON.stringify(heliOf(session.profile)), String(session.profile.credits), JSON.stringify(session.view()), session.fingerprint()].join('\n');

// A short flight with the bucket, a pour and the car hooked: everything the upgrades touch.
function scenario(profile, extra, line = CABLE.length) {
  const session = sessionOf(profile, extra);
  const events = [...session.start()];
  const job = dayJobs(heliOf(session.profile).playDay.count)[0];
  session.takeJob(job.id); events.push(...session.takeEvents());
  events.push(...run(session, 4, () => ({})));
  const own = session.view().loads.find(car => car.own);
  const goal = {x: own.x, z: own.z, y: own.y + line + 0.3};
  events.push(...run(session, 90, v => pilot(v, goal, {speed: 6, sink: 3}), v => Math.hypot(v.heli.x - goal.x, v.heli.z - goal.z) < 1 && Math.abs(v.heli.y - goal.y) < 0.4 && Math.hypot(v.heli.vx, v.heli.vz, v.heli.vy) < 0.5));
  session.pressHook(); events.push(...session.takeEvents());
  events.push(...run(session, 12, v => pilot(v, {x: v.zone.x, z: v.zone.z, y: v.zone.y + 40}, {speed: 6})));
  return {session, events};
}

test('an empty Lab, or the Lab switch off, leaves the session exactly as it was', () => {
  const baseline = scenario(readyProfile());
  const base = snapshot(baseline.session, baseline.events);
  const emptyLab = scenario(readyProfile({labField: {version: 1}}), {labEnabled: true});
  assert.equal(snapshot(emptyLab.session, emptyLab.events), base, 'labEnabled with an empty Lab');
  const noField = scenario(readyProfile(), {labEnabled: true});
  assert.equal(snapshot(noField.session, noField.events), base, 'labEnabled with no Lab field');
  const offWithUpgrades = scenario(readyProfile({labField: {version: 1, owned: {'engine-1': true, 'engine-2': true, 'long-cable': true, 'heavy-hook': true}, cable: 25}}));
  assert.equal(snapshot(offWithUpgrades.session, offWithUpgrades.events), base, 'upgrades in the save do nothing with the switch off');
  assert.equal(Object.hasOwn(baseline.session.view().heli, 'upgrades'), false);
  assert.deepEqual(baseline.session.lab, {on: false, retardant: false, longCable: false, line: 15, lines: [15], contents: 'water'});
  // The pad actions refuse with the switch off.
  assert.equal(baseline.session.loadBucket('retardant').ok, false);
  assert.equal(baseline.session.chooseLine(25).ok, false);
  baseline.session.leave(); emptyLab.session.leave(); noField.session.leave(); offWithUpgrades.session.leave();
});

test('the chosen line is the length the car hangs at', () => {
  const hang = (labField, line) => {
    const { session } = scenario(readyProfile({labField}), {labEnabled: true}, line);
    const view = session.view(), car = view.loads.find(load => load.own);
    const length = view.heli.y - car.y;
    session.leave();
    return {length, hooked: car.hooked};
  };
  const fifteen = hang({version: 1, owned: {'long-cable': true}, cable: 15}, 15), twentyFive = hang({version: 1, owned: {'long-cable': true}, cable: 25}, 25);
  assert.equal(fifteen.hooked, true); assert.equal(twentyFive.hooked, true);
  near(fifteen.length, 15.05, 0.02, 'the 15 m line'); near(twentyFive.length, 25.05, 0.02, 'the 25 m line');
  // 25 m is only on offer once Long cable is owned, and chosen on the pad.
  const session = sessionOf(readyProfile({labField: {version: 1, owned: {}}}), {labEnabled: true});
  session.start();
  assert.deepEqual(session.lab.lines, [15]);
  assert.equal(session.chooseLine(25).ok, false, 'not owned');
  session.leave();
  const owner = sessionOf(readyProfile({labField: {version: 1, owned: {'long-cable': true}}}), {labEnabled: true});
  owner.start();
  assert.deepEqual(owner.lab.lines, [15, 25]);
  assert.equal(owner.chooseLine(25).ok, true); assert.equal(owner.lab.line, 25);
  assert.equal(owner.chooseLine(15).ok, true); assert.equal(owner.lab.line, 15);
  assert.equal(owner.chooseLine(20).ok, false);
  owner.leave();
});

test('saved retardant keeps its fully treated cells when there are too many to keep', () => {
  const grid = gridOf(9, 3);
  const partial = Array.from({length: 90}, (_, k) => [cellId(10 + k % 30, 100 + Math.floor(k / 30)), 40]);
  const treated = [[cellId(60, 200), 200], [cellId(61, 200), 150], [cellId(62, 200), 300]];
  const profile = normalizeProfile({...createProfile(), heli: {version: 1, fuelKg: 0, lessons: TRAINED}});
  const saved = fireOf(setFire(profile, fireOn([[cellId(0, 1), 100]], {retardant: [...partial, ...treated].sort((a, b) => a[0] - b[0])}), on).profile);
  assert.equal(saved.retardant.length, 80);
  assert.deepEqual(treatedCells(saved), new Set(treated.map(([cell]) => cell)), 'every treated cell survives the cap');
  assert.deepEqual(saved.retardant, [...saved.retardant].sort((a, b) => a[0] - b[0]), 'and the list stays in order');
  assert.ok(grid);
});

test('a car last hung at 25 m hangs at 15 m again once 15 m is chosen', () => {
  const profile = readyProfile({labField: {version: 1, owned: {'long-cable': true}, cable: 25}});
  const session = sessionOf(profile, {labEnabled: true});
  session.start();
  const job = dayJobs(heliOf(session.profile).playDay.count)[0];
  session.takeJob(job.id); session.takeEvents();
  run(session, 4, () => ({}));
  const car = () => session.view().loads.find(load => load.own);
  const hookAt = line => {
    const goal = {x: car().x, z: car().z, y: car().y + line + 0.3};
    run(session, 90, v => pilot(v, goal, {speed: 6, sink: 3}), v => Math.hypot(v.heli.x - goal.x, v.heli.z - goal.z) < 1 && Math.abs(v.heli.y - goal.y) < 0.4 && Math.hypot(v.heli.vx, v.heli.vz, v.heli.vy) < 0.5);
    session.pressHook(); session.takeEvents();
    run(session, 6, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: car().y + line + 3}, {speed: 3}));
    return session.view().heli.y - car().y;
  };
  near(hookAt(25), 25.05, 0.03, 'hung at 25 m');
  // Down onto the ground, let go, land on the pad, and choose the short line while the car is not on the hook.
  const down = {x: session.view().heli.x, z: session.view().heli.z, y: car().y + 26};
  run(session, 30, v => pilot(v, down, {speed: 2, sink: 2}), v => v.heli.y - down.y < 0.5 && Math.abs(v.heli.vy) < 0.3);
  session.pressHook(); session.takeEvents();
  run(session, 5, () => ({}));
  assert.equal(car().hooked, false);
  const zone = session.view().zone;
  run(session, 60, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y - 1}, {speed: 4, sink: 1.5}), v => v.heli.onGround);
  assert.equal(session.view().heli.onGround, true, 'landed');
  const chosen = session.chooseLine(15);
  assert.equal(chosen.ok, true, JSON.stringify(chosen));
  near(hookAt(15), 15.05, 0.03, 'hung at 15 m after choosing 15');
  session.leave();
});

test('upgrades bought in the save act in the session: engine, frame, tune, hook limit', () => {
  const stock = sessionOf(readyProfile(), {labEnabled: true}); stock.start();
  const tuned = sessionOf(readyProfile({labField: {version: 1, owned: {'engine-1': true, 'engine-2': true, 'light-frame': true, 'altitude-tune': true}}}), {labEnabled: true}); tuned.start();
  assert.equal(Object.hasOwn(stock.view().heli, 'upgrades'), false);
  const state = tuned.view().heli;
  assert.ok(state.upgrades && state.upgrades.thrustFactor === 1.10 && state.upgrades.emptyMassKg === 1070 && state.upgrades.altitudeScaleM === 10000);
  stock.leave(); tuned.leave();
});

test('the pad menu loads retardant from the home pad once the tank is owned, and the pour is retardant', () => {
  const noTank = sessionOf(readyProfile({labField: {version: 1, owned: {}}}), {labEnabled: true});
  noTank.start(); noTank.fitBucket();
  assert.equal(noTank.lab.retardant, false);
  assert.equal(noTank.loadBucket('retardant').ok, false);
  assert.equal(noTank.loadBucket('water').ok, true);
  noTank.leave();
  const tank = sessionOf(readyProfile({labField: {version: 1, owned: {retardant: true, 'big-bucket': true}, ringBest: 2, ring: 2}}), {labEnabled: true});
  tank.start();
  assert.equal(tank.loadBucket('retardant').ok, false, 'the bucket must be fitted first');
  assert.equal(tank.fitBucket().ok, true);
  const loaded = tank.loadBucket('retardant');
  assert.equal(loaded.ok, true); assert.equal(loaded.litres, RETARDANT_LITRES);
  assert.equal(tank.lab.contents, 'retardant');
  const view = tank.view().bucket;
  assert.equal(view.contents, 'retardant'); assert.equal(view.holds, 800); assert.equal(view.water, 600);
  // Back to water on the pad empties it; loading retardant again fills it, and the ring follows the saved tier.
  assert.equal(tank.loadBucket('water').ok, true);
  assert.equal(tank.view().bucket.water, 0); assert.equal(tank.view().bucket.contents, undefined);
  assert.equal(tank.loadBucket('retardant').ok, true);
  run(tank, 1, () => ({}));
  const ring = tank.view().bucket.aim;
  assert.ok(ring, 'a bucket with water has an aim ring');
  assert.equal(ring.radius, DROP_AIM_RINGS[2], 'the ring follows the saved tier');
  tank.leave();
});
