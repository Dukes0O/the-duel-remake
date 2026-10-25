// LAB-FAN: pure rules and native driving; memory-only profiles.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {CARS} from '../src/config.js';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {Course} from '../src/course.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {createProfile, normalizeProfile, CAR_PRICES, createPlayerRegistry, loadPlayers, savePlayers, activePlayer} from '../src/progression.js';
import {createLab, labOf, setTune} from '../src/lab/lab-save.js';
import {TUNNEL_LESSONS} from '../src/lab/lab-lessons.js';
import {FAN_CAR, FAN_PRICE, secretOpen, markReverse, buildFan} from '../src/lab/lab-fan.js';
import {tunedCar, tunedGrip} from '../src/lab/lab-tune.js';
import {AIR_ONLY_CARS, JOB_CARS} from '../src/heli/heli-jobs.js';
import {carAt} from '../src/heli/heli-save.js';
import {buyUpgrade} from '../src/lab/lab-shop.js';
import {tuneRows, usableTune} from '../src/lab/tune-view.js';
import {createVehicleAssets} from '../src/vehicle-assets.js';
import {loadSpeirlingVehicle} from '../src/speirling-vehicle.js';
import {ensureVehicleSockets} from '../src/vehicle-sockets.js';
import {disposeTree} from '../src/world.js';

const flags = enabled => ({enabled: name => enabled && name === 'lab'});
const ON = {flags: flags(true)}, OFF = {flags: flags(false)};
const ready = () => ({...createProfile(), credits: 20000, lab: {...createLab(),
  done: Object.fromEntries(TUNNEL_LESSONS.map(id => [id, true]))}});
for (let mask = 0; mask < 32; mask++) {
  const lab = {...createLab(), done: Object.fromEntries(TUNNEL_LESSONS.map((id, i) => [id, !!(mask & (1 << i))]))};
  assert.equal(secretOpen(lab), mask === 31, `lesson subset ${mask}`);
  const p = {...ready(), lab};
  assert.equal(markReverse(p, ON).ok, mask === 31);
  assert.equal(buildFan(p, ON).ok, false, 'REVERSE must be found first');
  assert.equal(buildFan({...p, lab: {...lab, secret: {reverse: true}}}, ON).ok, mask === 31,
    `a saved REVERSE marker cannot bypass missing lessons: subset ${mask}`);
}
assert.equal(secretOpen(undefined), false);
const source = markReverse(ready(), ON).profile;
const copy = structuredClone(source);
const built = buildFan(source, ON);
assert.equal(built.ok, true);
assert.equal(built.price, FAN_PRICE);
assert.deepEqual(built.profile, {...source, credits: 5000, unlockedCars: [...source.unlockedCars, FAN_CAR]});
assert.deepEqual(source, copy, 'input never mutated');
assert.equal(buildFan(built.profile, ON).profile, built.profile, 'no second debit');
assert.equal(buyUpgrade(built.profile, 'speirling', ON).profile, built.profile, 'shop cannot charge again');
assert.deepEqual(buyUpgrade(source, 'speirling', ON).profile, built.profile, 'shop uses the atomic build');
assert.equal(carAt(built.profile, FAN_CAR), 'tremblant-woods', 'first placed at the home pad');
for (const credits of [0, 14999, NaN, Infinity, -Infinity, -1, 15000.5, '20000',
  1_000_000_001, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1]) {
  const p = {...source, credits};
  assert.equal(buildFan(p, ON).profile, p, `invalid/short wallet ${credits}`);
}
assert.equal(buildFan({...source, credits: 15000}, ON).profile.credits, 0);
assert.equal(buildFan({...source, credits: 1_000_000_000}, ON).profile.credits, 999_985_000,
  'the credit cap is a valid wallet and pays exactly once');
for (const p of [source, built.profile, createProfile(), {...source, lab: {...source.lab, version: 99}}]) {
  assert.equal(buildFan(p, OFF).profile, p);
  assert.equal(markReverse(p, OFF).profile, p);
}
const future = {...source, lab: {...source.lab, version: 99}};
assert.equal(buildFan(future, ON).profile, future);
const old = createProfile(), oldCopy = structuredClone(old);
labOf(old); buildFan(old, ON); markReverse(old, ON);
assert.deepEqual(old, oldCopy, 'an old save is not written by reading or refusing');
assert.ok(!Object.hasOwn(old, 'lab'));
assert.ok(normalizeProfile(built.profile).unlockedCars.includes(FAN_CAR), 'owned car survives save normalization');
assert.ok(!Object.hasOwn(CAR_PRICES, FAN_CAR));
assert.ok(AIR_ONLY_CARS.includes(FAN_CAR) && !JOB_CARS.includes(FAN_CAR));

// Two menu instances share only this synthetic save, never browser/player storage.
const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const memory = new Map();
Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
  getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
}});
try {
  assert.equal(savePlayers(createPlayerRegistry({...source, credits: 40000})), true);
  const tab = () => {
    const app = Object.create(App.prototype);
    app.players = loadPlayers(); app.player = activePlayer(app.players); app.profile = app.player.profile;
    app._switches = () => ON.flags;
    app.duel = {state: {status: 'menu'}, emit() {}};
    app._syncHiddenRoadDiscovery = () => {};
    return app;
  };
  const a = tab(), b = tab();
  const buy = app => app.labCommit((profile, flags) => buyUpgrade(profile, 'speirling', {flags}));
  assert.equal(buy(a).ok, true);
  assert.equal(buy(a).ok, false, 'a double call cannot charge twice');
  assert.equal(buy(b).ok, false, 'the stale second tab refreshes ownership before buying');
  const saved = activePlayer(loadPlayers()).profile;
  assert.equal(saved.credits, 40000 - FAN_PRICE, 'ownership prevents another debit even with enough credits to pay again');
  assert.equal(saved.unlockedCars.filter(id => id === FAN_CAR).length, 1);
  assert.equal(tab().profile.credits, saved.credits, 'reload preserves the single debit');
  assert.equal(savePlayers(createPlayerRegistry({...source, credits: 14999})), true);
  assert.equal(buy(b).ok, false, 'a stale tab refreshes a now-short wallet');
  assert.equal(activePlayer(loadPlayers()).profile.credits, 14999);
} finally {
  if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
  else delete globalThis.localStorage;
}

for (const enabled of [[], ['lab-tuning'], ['lab'], ['lab', 'lab-tuning']]) {
  const switches = {enabled: name => enabled.includes(name)};
  assert.equal(buildFan(source, {flags: switches}).ok, enabled.includes('lab'),
    'building depends on lab; lab-tuning only controls the optional settings');
  assert.equal(tuneRows(source, FAN_CAR, switches).length, enabled.length === 2 ? 3 : 0,
    'tuning settings require both switches');
}

const fan = CARS[FAN_CAR];
assert.equal(fan.unlockRequirement, 'lab-built');
assert.equal(fan.gearbox, 'single');
assert.equal(fan.electric, true);
assert.equal(fan.mass, 1000);
assert.equal(fan.gears.length, 1);
assert.equal(tunedGrip(fan, 10 / 1.609344), tunedGrip(fan, 100 / 1.609344));
assert.equal(tunedGrip(fan, 0), 2);
assert.equal(tunedGrip(fan, 100, 0, {fan: false}), fan.grip);
assert.equal(tunedCar(fan, {fuel: 2, wing: 2}), fan, 'no fuel or wing tune');
const tuning = {enabled: name => ['lab', 'lab-tuning'].includes(name)};
assert.deepEqual(tuneRows(source, FAN_CAR, tuning).map(row => row.setting), ['pressure', 'brakes', 'springs']);
for (const setting of ['fuel', 'wing']) assert.equal(setTune(source, FAN_CAR, setting, 2, {flags: tuning}).ok, false);
const forged = {...source, lab: {...source.lab, tune: {[FAN_CAR]: {fuel: 2, wing: 2}}}};
assert.equal(usableTune(forged, FAN_CAR).fuel, 0);
assert.equal(usableTune(forged, FAN_CAR).wing, 0);
const oldSource = execFileSync('git', ['show', 'd5ba2d27:src/config.js'], {encoding: 'utf8'})
  .replace(/(from\s+['"])(\.[^'"]+)(['"])/g, (_, a, path, b) => a + new URL(path, new URL('../src/config.js', import.meta.url)).href + b);
const before = await import('data:text/javascript;base64,' + Buffer.from(oldSource).toString('base64'));
assert.deepEqual(Object.fromEntries(Object.entries(CARS).filter(([id]) => id !== FAN_CAR)), before.CARS,
  'every earlier car has the exact same data and order');

function launch(id, curve = false) {
  const duel = new Duel({seed: 1989, car: id, featureFlags: {enabled: name => name === 'engine-curve' && curve}});
  duel.startCampaign({car: id, opponentCount: 0, difficulty: 'casual'});
  duel.course = new Course({id: 'fan-launch', kind: 'circuit', closed: true, airborne: false, theme: 'alpine',
    noTraffic: true, hasRival: false, hasRadar: false,
    script: [['straight', 4000], ['turn', 'L', 90, 100], ['straight', 500], ['turn', 'L', 90, 100],
      ['straight', 4000], ['turn', 'L', 90, 100], ['straight', 500], ['turn', 'L', 90, 100]]});
  Object.assign(duel.state, {status: 'racing', s: 300, prevS: 300, lateral: 0, countdown: 0, traffic: [], speedMph: 0, gear: 0});
  duel.setInput({throttle: 1, brake: 0, steer: 0, boost: false});
  let steps = 0;
  while (duel.state.speedMph < 60 && steps < 2400) {duel._drive(1 / 120); steps++;}
  return {seconds: steps / 120, car: duel.car};
}
const run = launch(FAN_CAR);
assert.ok(run.seconds >= 2.4 && run.seconds <= 2.8);
assert.equal(launch(FAN_CAR, true).seconds, run.seconds, 'electric launch is independent of piston engine curves');
for (const id of Object.keys(before.CARS)) {
  const other = launch(id);
  assert.ok(run.seconds < other.seconds, `${id}: fan launches faster`);
  assert.ok(run.car.braking > other.car.braking, `${id}: fan brakes best`);
  if (['koenigsegg_jesko', 'ferrari_enzo', 'mclaren_f1'].includes(id))
    assert.ok(run.car.topSpeed < other.car.topSpeed, `${id}: lower top speed`);
}
// Same seeded race with lab off and on: no other car's state changes.
for (const id of Object.keys(before.CARS)) {
  const trace = enabled => {
    const featureFlags = createFeatureFlags({storage: null, qa: true, overrides: {lab: enabled}});
    const duel = new Duel({seed: 42, car: id, featureFlags});
    duel.startCampaign({car: id, opponentCount: 0});
    duel.setInput({throttle: 1, steer: .15});
    for (let i = 0; i < 180; i++) duel.step(1 / 120);
    return JSON.stringify(duel.state);
  };
  assert.equal(trace(true), trace(false), `${id}: lab on/off race states identical`);
}
// The registered loader creates the accepted GLB, with no placeholder on failure.
const bytes = await readFile(new URL('../public/assets/models/unlocks/mcmurtry_speirling.glb', import.meta.url));
const asset = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const factory = await loadSpeirlingVehicle({loadAsset: async () => asset});
let calls = 0;
const assets = createVehicleAssets({loadSpeirling: async () => {calls++; return factory;}});
assert.equal(assets.status(FAN_CAR), 'idle');
assert.equal(assets.create(FAN_CAR), null);
const first = assets.load(FAN_CAR);
assert.equal(first, assets.load(FAN_CAR));
assert.equal(await first, true);
assert.equal(calls, 1);
for (let i = 0; i < 3; i++) {
  const model = assets.create(FAN_CAR);
  assert.equal(model.userData.vehicleKey, FAN_CAR);
  assert.equal(model.userData.wheels.length, 4);
  ensureVehicleSockets(model);
  disposeTree(model);
}
let attempts = 0;
const retry = createVehicleAssets({loadSpeirling: () => {if (++attempts === 1) throw Error('offline'); return factory;}});
assert.equal(await retry.load(FAN_CAR), false);
assert.equal(retry.status(FAN_CAR), 'error');
assert.equal(retry.create(FAN_CAR), null);
assert.equal(await retry.load(FAN_CAR), false);
assert.equal(attempts, 1);
assert.equal(await retry.load(FAN_CAR, {retry: true}), true);
assert.equal(attempts, 2);
console.log(`LAB-FAN passed: secret, atomic save, unchanged cars/races, constant grip, actual GLB; launch ${run.seconds.toFixed(3)} s.`);
