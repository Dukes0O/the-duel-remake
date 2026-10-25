import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {FEATURE_STATES, createFeatureFlags} from '../src/feature-flags.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {HELI_LESSONS} from '../src/heli/heli-save.js';
import {KESTREL} from '../src/heli/heli-flight.js';
import {BUCKET, DROP_AIM_RINGS} from '../src/heli/heli-bucket.js';
import {CABLE} from '../src/heli/heli-cable.js';
import {LAB_LESSONS, LAB_GROUPS, lessonRows} from '../src/lab/lab-lessons.js';
import {LAB_UPGRADES, buyUpgrade} from '../src/lab/lab-shop.js';
import {createLab, normalizeLab, labOf, passLesson, setRing, setCable, setTune, recordStockLap, payTunedBonus,
  markSecret} from '../src/lab/lab-save.js';
import {heliUpgrades} from '../src/lab/lab-heli.js';

// docs/LAB.md sections 3, 4, 9 and 10. Switches are passed as plain objects: the real switch catalogue only
// has to say `lab` and `lab-tuning` are dev.
const flagsOf = (...names) => ({enabled: name => names.includes(name)});
const ON = flagsOf('lab');
const WITH_HELI = flagsOf('lab', 'helicopter');
const WITH_SKIING = flagsOf('lab', 'helicopter', 'heli-skiing');
const TUNING = flagsOf('lab', 'lab-tuning');
const OFF = flagsOf();
const HELI_DONE = {version: 1, fuelKg: 0, lessons: Object.fromEntries(HELI_LESSONS.map(id => [id, true]))};
const rich = (extra = {}) => ({...createProfile(), credits: 50_000, ...extra});
const withLessons = (profile, ...ids) => ids.reduce((p, id) => {
  const flags = ['lift', 'projectile', 'fire', 'pendulum', 'altitude'].includes(id) ? WITH_HELI : ['launch', 'wax'].includes(id) ? WITH_SKIING : ON;
  const next = passLesson(p, id, {flags});
  assert.equal(next.ok, true, `${id}: ${next.reason}`);
  return next.profile;
}, profile);
const driven = (profile = rich()) => ({...profile, drivingLessons: {version: 1, done: {corner: true}, best: {corner: .4}, rewarded: {corner: true}}});
const flier = (profile = rich()) => ({...profile, heli: HELI_DONE});

test('the two switches exist, in development, and are off in production', () => {
  assert.equal(FEATURE_STATES.lab, 'dev');
  assert.equal(FEATURE_STATES['lab-tuning'], 'dev');
  const production = createFeatureFlags({storage: null, qa: false});
  assert.equal(production.enabled('lab'), false);
  assert.equal(production.enabled('lab-tuning'), false);
});

test('there are sixteen lessons in four groups, in the design order', () => {
  assert.deepEqual(LAB_LESSONS.map(row => row.id), ['lift', 'projectile', 'fire', 'pendulum', 'altitude',
    'strength', 'rust', 'gforce', 'headings', 'grip', 'downforce', 'braking', 'suspension', 'fuel', 'launch', 'wax']);
  assert.deepEqual(LAB_GROUPS, ['Flying', 'Workshop', 'Wind tunnel', 'Snow']);
  assert.deepEqual(LAB_GROUPS.map(group => LAB_LESSONS.filter(row => row.group === group).length), [5, 4, 5, 2]);
  assert.deepEqual(LAB_LESSONS.map(row => row.name), ['Lift and weight', 'Projectile motion', 'Fire triangle', 'Pendulums',
    'Air and altitude', 'Strength against weight', 'Rust', 'G-force', 'Headings and maps', 'Grip', 'Downforce', 'Braking',
    'Suspension', 'Fuel', 'Launch angles', 'Ski wax']);
});

const open = (profile, flags) => Object.fromEntries(lessonRows(profile, flags).map(row => [row.id, row.open]));

test('opening order: groups open as section 3 says, and the board rows have the shared board shape', () => {
  assert.deepEqual(lessonRows(rich(), OFF), [], 'with the switch off the board is empty');
  const start = open(rich(), WITH_HELI);
  for (const id of ['lift', 'projectile', 'fire', 'pendulum', 'altitude']) assert.equal(start[id], false, `${id} waits for the helicopter lessons`);
  for (const id of ['strength', 'rust', 'headings']) assert.equal(start[id], true, `${id} is open from the start`);
  for (const id of ['gforce', 'grip', 'downforce', 'braking', 'suspension', 'fuel', 'launch', 'wax']) assert.equal(start[id], false, `${id} is shut at the start`);
  const noHeli = lessonRows(rich(), ON).find(row => row.id === 'lift');
  assert.equal(noHeli.open, false);
  assert.equal(noHeli.note, 'Opens with the helicopter');
  // Driving lesson 1 opens G-force and the whole wind tunnel, and nothing else.
  const taught = open(driven(), ON);
  for (const id of ['gforce', 'grip', 'downforce', 'braking', 'suspension', 'fuel']) assert.equal(taught[id], true, `${id} opens with driving lesson 1`);
  assert.equal(taught.lift, false);
  assert.equal(taught.launch, false);
  // The helicopter's lessons open Flying, but only while the helicopter is on.
  assert.equal(open(flier(), WITH_HELI).lift, true);
  assert.equal(open(flier(), ON).lift, false, 'a finished helicopter course does nothing with the helicopter off');
  assert.equal(open(rich({heli: {...HELI_DONE, lessons: {liftoff: true, hover: true, landing: true, carry: false}}}), WITH_HELI).lift, false);
  // Snow follows heli-skiing, which needs the helicopter.
  assert.equal(open(rich(), WITH_SKIING).launch, true);
  assert.equal(open(rich(), flagsOf('lab', 'heli-skiing')).launch, false);
  assert.equal(open(rich(), WITH_HELI).launch, false);
  const rows = lessonRows(driven(withLessons(rich(), 'rust')), ON);
  assert.deepEqual(Object.keys(rows[0]).sort(), ['done', 'group', 'id', 'name', 'note', 'open']);
  assert.equal(rows.find(row => row.id === 'rust').done, true);
  assert.equal(rows.length, 16);
});

test('the shop sells the upgrades of section 4 at the designed prices', () => {
  const price = Object.fromEntries(LAB_UPGRADES.map(row => [row.id, row.price]));
  assert.deepEqual(price, {'engine-1': 2500, 'engine-2': 4000, 'light-frame': 3000, 'big-bucket': 2500, retardant: 3000,
    'long-cable': 1500, 'altitude-tune': 3500, 'heavy-hook': 2000, 'carbon-plates': 1500, galvanised: 600, gmeter: 800,
    'moving-map': 1200, aerials: 0, 'wax-kit': 400, speirling: 15000});
  const opens = Object.fromEntries(LAB_UPGRADES.map(row => [row.id, row.lesson]));
  assert.deepEqual(opens, {'engine-1': 'lift', 'engine-2': 'lift', 'light-frame': 'lift', 'big-bucket': 'projectile', retardant: 'fire',
    'long-cable': 'pendulum', 'altitude-tune': 'altitude', 'heavy-hook': 'strength', 'carbon-plates': 'strength', galvanised: 'rust',
    gmeter: 'gforce', 'moving-map': 'headings', aerials: 'launch', 'wax-kit': 'wax', speirling: null});
});

test('an upgrade is bought once, for its price, after its lesson, and Engine 2 needs Engine 1', () => {
  const start = flier();
  assert.equal(buyUpgrade(start, 'engine-1', {flags: WITH_HELI}).ok, false, 'its lesson is not passed yet');
  const lifted = withLessons(start, 'lift');
  assert.equal(buyUpgrade(lifted, 'engine-2', {flags: WITH_HELI}).ok, false, 'Engine 2 needs Engine 1');
  const before = structuredClone(lifted);
  const one = buyUpgrade(lifted, 'engine-1', {flags: WITH_HELI});
  assert.equal(one.ok, true);
  assert.equal(one.profile.credits, 50_000 - 2500);
  assert.equal(one.profile.lab.owned['engine-1'], true);
  assert.deepEqual(lifted, before, 'the profile that went in is not changed');
  const again = buyUpgrade(one.profile, 'engine-1', {flags: WITH_HELI});
  assert.equal(again.ok, false);
  assert.equal(again.profile, one.profile, 'a second purchase takes nothing');
  const two = buyUpgrade(one.profile, 'engine-2', {flags: WITH_HELI});
  assert.equal(two.ok, true);
  assert.equal(two.profile.credits, 50_000 - 2500 - 4000);
  const poor = buyUpgrade({...lifted, credits: 2499}, 'engine-1', {flags: WITH_HELI});
  assert.equal(poor.ok, false);
  assert.equal(poor.profile.credits, 2499);
  assert.equal(buyUpgrade(lifted, 'nonsense', {flags: WITH_HELI}).ok, false);
  assert.equal(buyUpgrade(lifted, '__proto__', {flags: WITH_HELI}).ok, false);
  // Passing a lesson twice, or retaking it, never charges or pays anything.
  assert.equal(passLesson(one.profile, 'lift', {flags: WITH_HELI}).profile.credits, one.profile.credits);
});

test('free rewards are granted when the lesson is passed, once', () => {
  const profile = rich();
  const passed = passLesson(profile, 'launch', {flags: WITH_SKIING});
  assert.equal(passed.profile.lab.owned.aerials, true);
  assert.equal(passed.profile.credits, profile.credits);
  assert.equal(passed.profile.lab.done.launch, true);
  assert.equal(buyUpgrade(passed.profile, 'aerials', {flags: WITH_SKIING}).ok, false, 'already owned, nothing to buy');
  assert.equal(passLesson(passed.profile, 'launch', {flags: WITH_SKIING}).profile.credits, profile.credits);
});

test('a lesson that is not open cannot be passed', () => {
  assert.equal(passLesson(rich(), 'lift', {flags: WITH_HELI}).ok, false);
  assert.equal(passLesson(rich(), 'grip', {flags: ON}).ok, false);
  assert.equal(passLesson(rich(), 'nonsense', {flags: ON}).ok, false);
  assert.equal(passLesson(driven(), 'grip', {flags: ON}).ok, true);
});

test('the drop ring steps down one per pass of Projectile motion, and any earned ring can be picked', () => {
  let profile = withLessons(flier(), 'projectile');
  assert.equal(labOf(profile).ringBest, 1, 'the first pass earns the 8 m ring');
  assert.equal(labOf(profile).ring, 1);
  profile = passLesson(profile, 'projectile', {flags: WITH_HELI, ring: 1}).profile;
  profile = passLesson(profile, 'projectile', {flags: WITH_HELI, ring: 2}).profile;
  assert.equal(labOf(profile).ringBest, 3, 'then 5 m, then no ring');
  profile = passLesson(profile, 'projectile', {flags: WITH_HELI, ring: 3}).profile;
  assert.equal(labOf(profile).ringBest, 3, 'there is nothing below no ring');
  assert.equal(passLesson(withLessons(flier(), 'projectile'), 'projectile', {flags: WITH_HELI, ring: 0}).profile.lab.ringBest, 1,
    'passing again with a ring you have already beaten earns nothing more');
  assert.equal(setRing(profile, 0, {flags: WITH_HELI}).profile.lab.ring, 0);
  assert.equal(setRing(profile, 3, {flags: WITH_HELI}).profile.lab.ring, 3);
  assert.equal(setRing(withLessons(flier(), 'projectile'), 2, {flags: WITH_HELI}).ok, false, 'a ring not yet earned');
  assert.equal(setRing(profile, 4, {flags: WITH_HELI}).ok, false);
  assert.equal(setRing(profile, 1.5, {flags: WITH_HELI}).ok, false);
});

test('the cable is 15 m, or 25 m once Long cable is owned', () => {
  const base = withLessons(flier(), 'pendulum');
  assert.equal(setCable(base, 25, {flags: WITH_HELI}).ok, false);
  const bought = buyUpgrade(base, 'long-cable', {flags: WITH_HELI}).profile;
  assert.equal(setCable(bought, 25, {flags: WITH_HELI}).profile.lab.cable, 25);
  assert.equal(setCable(setCable(bought, 25, {flags: WITH_HELI}).profile, 15, {flags: WITH_HELI}).profile.lab.cable, 15);
  assert.equal(setCable(bought, 20, {flags: WITH_HELI}).ok, false);
});

test('tuning settings open with their wind-tunnel lessons and hold five steps from -2 to +2', () => {
  const car = createProfile().unlockedCars[0];
  const profile = driven();
  assert.equal(setTune(profile, car, 'pressure', 1, {flags: TUNING}).ok, false, 'Grip has not been passed');
  const gripped = withLessons(profile, 'grip');
  const tuned = setTune(gripped, car, 'pressure', -2, {flags: TUNING});
  assert.equal(tuned.ok, true);
  assert.deepEqual(tuned.profile.lab.tune[car], {pressure: -2, wing: 0, brakes: 0, springs: 0, fuel: 0});
  assert.equal(setTune(gripped, car, 'pressure', 3, {flags: TUNING}).ok, false);
  assert.equal(setTune(gripped, car, 'pressure', .5, {flags: TUNING}).ok, false);
  assert.equal(setTune(gripped, car, 'wing', 1, {flags: TUNING}).ok, false, 'Downforce has not been passed');
  assert.equal(setTune(gripped, 'no-such-car', 'pressure', 1, {flags: TUNING}).ok, false);
  assert.equal(setTune(gripped, car, 'nonsense', 1, {flags: TUNING}).ok, false);
  assert.equal(setTune(tuned.profile, car, 'pressure', 0, {flags: TUNING}).profile.lab.tune[car].pressure, 0, 'reset to zero is allowed');
});

test('stock laps keep the best, and the tuned-lap bonus pays 400 once per course', () => {
  const car = createProfile().unlockedCars[0], course = 'tremblant-woods';
  let profile = rich();
  profile = recordStockLap(profile, car, course, 100, {flags: TUNING}).profile;
  profile = recordStockLap(profile, car, course, 104, {flags: TUNING}).profile;
  assert.equal(profile.lab.stockLaps[`${car}|${course}`], 100);
  profile = recordStockLap(profile, car, course, 99.5, {flags: TUNING}).profile;
  assert.equal(profile.lab.stockLaps[`${car}|${course}`], 99.5);
  assert.equal(recordStockLap(profile, car, course, -3, {flags: TUNING}).ok, false);
  assert.equal(recordStockLap(profile, 'no-such-car', course, 90, {flags: TUNING}).ok, false);
  assert.equal(recordStockLap(profile, car, 'no-such-course', 90, {flags: TUNING}).ok, false);
  const paid = payTunedBonus(profile, course, {flags: TUNING});
  assert.equal(paid.ok, true);
  assert.equal(paid.profile.credits, profile.credits + 400);
  assert.deepEqual(paid.profile.lab.tunedBonus, [course]);
  const again = payTunedBonus(paid.profile, course, {flags: TUNING});
  assert.equal(again.ok, false);
  assert.equal(again.profile, paid.profile, 'the second course lap pays nothing');
  assert.equal(payTunedBonus(paid.profile, 'panorama-ridge', {flags: TUNING}).profile.credits, profile.credits + 800);
  assert.equal(payTunedBonus(paid.profile, 'no-such-course', {flags: TUNING}).ok, false);
  const nearCap = payTunedBonus({...rich(), credits: 999_999_800}, course, {flags: TUNING});
  assert.equal(nearCap.profile.credits, 1_000_000_000, 'credits stop at the save cap');
});

test('the secret appears only after all five wind-tunnel lessons', () => {
  const four = withLessons(driven(), 'grip', 'downforce', 'braking', 'suspension');
  assert.equal(markSecret(four, {flags: ON}).ok, false);
  const five = withLessons(four, 'fuel');
  const marked = markSecret(five, {flags: ON});
  assert.equal(marked.ok, true);
  assert.deepEqual(marked.profile.lab.secret, {reverse: true});
  assert.equal(buyUpgrade(five, 'speirling', {flags: ON}).ok, false, 'not before the fan has been reversed');
  const built = buyUpgrade({...marked.profile, credits: 15_000}, 'speirling', {flags: ON});
  assert.equal(built.ok, true);
  assert.equal(built.profile.credits, 0);
  assert.ok(built.profile.unlockedCars.includes('mcmurtry_speirling'));
  assert.equal(buyUpgrade(built.profile, 'speirling', {flags: ON}).profile, built.profile);
});

test('the save: every key optional, unknown keys kept, a newer version left alone', () => {
  assert.deepEqual(createLab(), {version: 1, done: {}, owned: {}, ring: 0, ringBest: 0, cable: 15, tune: {}, stockLaps: {},
    tunedBonus: [], secret: {}});
  for (const junk of [undefined, null, 5, 'x', [], {}, {version: 0}, {version: 'one'}]) assert.deepEqual(normalizeLab(junk), createLab());
  const car = createProfile().unlockedCars[0];
  const messy = normalizeLab({version: 1, done: {lift: true, rust: 'yes', 'bad key!': true, future: true}, owned: {'engine-1': true, nope: 0},
    ring: 9, ringBest: 2, cable: 40, tune: {[car]: {pressure: 7, wing: -1, other: 4}, 'no-such-car': {wing: 1}},
    stockLaps: {[`${car}|tremblant-woods`]: 91.25, 'bad|key': 3, [`${car}|panorama-ridge`]: -1}, tunedBonus: ['tremblant-woods', 'tremblant-woods', 'nowhere'],
    secret: {reverse: true, extra: 1}, fromTheFuture: {keep: ['me']}, __proto__: {polluted: true}});
  assert.deepEqual(messy.done, {lift: true, future: true});
  assert.deepEqual(messy.owned, {'engine-1': true});
  assert.equal(messy.ring, 2, 'the chosen ring cannot be past the best earned');
  assert.equal(messy.cable, 15);
  assert.deepEqual(messy.tune, {[car]: {pressure: 0, wing: -1, brakes: 0, springs: 0, fuel: 0}});
  assert.deepEqual(messy.stockLaps, {[`${car}|tremblant-woods`]: 91.25});
  assert.deepEqual(messy.tunedBonus, ['tremblant-woods']);
  assert.deepEqual(messy.secret, {reverse: true});
  assert.deepEqual(messy.fromTheFuture, {keep: ['me']});
  assert.equal(Object.hasOwn(messy, 'polluted'), false);
  assert.deepEqual(normalizeLab(messy), messy, 'normalizing twice changes nothing');
  const later = {version: 2, shape: 'new', done: {lift: true}};
  assert.equal(normalizeLab(later), later, 'a newer version is kept exactly as it was');
  assert.equal(passLesson({...rich(), lab: later}, 'rust', {flags: ON}).ok, false, 'and not written over by this game');
});

test('old saves read as an empty Lab and no save gains a field', () => {
  const old = normalizeProfile(rich());
  assert.equal(Object.hasOwn(old, 'lab'), false);
  assert.deepEqual(labOf(old), createLab());
  assert.deepEqual(normalizeProfile(old), old);
  const saved = normalizeProfile({...rich(), lab: {version: 1, done: {rust: true}, owned: {}, future: 1}});
  assert.deepEqual(saved.lab.done, {rust: true});
  assert.equal(saved.lab.future, 1);
  const folder = fileURLToPath(new URL('./fixtures/saves/', import.meta.url));
  let checked = 0;
  for (const name of readdirSync(folder).filter(file => file.endsWith('.json'))) {
    const fixture = JSON.parse(readFileSync(folder + name, 'utf8'));
    for (const player of fixture.storage['the-duel-players-v2']?.players ?? []) {
      const loaded = normalizeProfile(player.profile);
      if (Object.hasOwn(player.profile, 'lab')) assert.deepEqual(loaded.lab, normalizeLab(player.profile.lab), `${name}: a saved Lab is kept`);
      else { assert.equal(Object.hasOwn(loaded, 'lab'), false, `${name}: ${player.name} gains no Lab field`); assert.deepEqual(labOf(loaded), createLab()); }
      checked++;
    }
  }
  assert.ok(checked >= 10, 'the whole fixture roster was read');
});

test('heliUpgrades of an empty Lab equals the helicopter as it is today', () => {
  const today = {thrustFactor: 1, emptyMassKg: KESTREL.emptyKg, hookLimitKg: KESTREL.hookLimitKg, lineLengthM: CABLE.length,
    bucketLitres: BUCKET.litres, ringIndex: 0, retardant: false, altitudeScaleM: KESTREL.airScaleHeight};
  assert.deepEqual(today, {thrustFactor: 1, emptyMassKg: 1150, hookLimitKg: 1500, lineLengthM: 15, bucketLitres: 600, ringIndex: 0,
    retardant: false, altitudeScaleM: 8500});
  assert.equal(DROP_AIM_RINGS[today.ringIndex], 12, 'ring 0 is the 12 m ring H2 always uses');
  for (const lab of [undefined, null, createLab(), {}, normalizeLab(undefined), {version: 2}]) assert.deepEqual(heliUpgrades(lab), today);
  assert.deepEqual(heliUpgrades(createLab()), today);
});

test('each owned upgrade changes only the helicopter number it names', () => {
  const owned = (...ids) => ({...createLab(), owned: Object.fromEntries(ids.map(id => [id, true]))});
  const base = heliUpgrades(createLab());
  const only = (lab, changes) => assert.deepEqual(heliUpgrades(lab), {...base, ...changes});
  only(owned('engine-1'), {thrustFactor: 1.05});
  only(owned('engine-1', 'engine-2'), {thrustFactor: 1.10});
  only(owned('light-frame'), {emptyMassKg: 1070});
  only(owned('heavy-hook'), {hookLimitKg: 2000});
  only(owned('big-bucket'), {bucketLitres: 800});
  only(owned('retardant'), {retardant: true});
  only(owned('altitude-tune'), {altitudeScaleM: 10_000});
  only({...owned('long-cable'), cable: 25}, {lineLengthM: 25});
  only({...owned('long-cable'), cable: 15}, {});
  only({...createLab(), cable: 25}, {});
  only({...createLab(), ringBest: 3, ring: 2}, {ringIndex: 2});
  only(owned('carbon-plates', 'galvanised', 'gmeter', 'moving-map', 'aerials', 'wax-kit'), {});
});

test('with the switch off nothing changes: no operation edits a profile and the board is empty', () => {
  const profile = withLessons(driven(), 'grip');
  const car = createProfile().unlockedCars[0];
  const results = [
    passLesson(profile, 'rust', {flags: OFF}), buyUpgrade(profile, 'galvanised', {flags: OFF}), setRing(profile, 0, {flags: OFF}),
    setCable(profile, 15, {flags: OFF}), setTune(profile, car, 'pressure', 1, {flags: OFF}),
    recordStockLap(profile, car, 'tremblant-woods', 90, {flags: OFF}), payTunedBonus(profile, 'tremblant-woods', {flags: OFF}),
    markSecret(profile, {flags: OFF}), passLesson(profile, 'rust', {}), passLesson(profile, 'rust'),
  ];
  for (const result of results) { assert.equal(result.ok, false); assert.equal(result.profile, profile); }
  assert.deepEqual(lessonRows(profile, OFF), []);
  const plain = rich();
  assert.equal(passLesson(plain, 'rust', {flags: OFF}).profile, plain);
  assert.equal(Object.hasOwn(plain, 'lab'), false);
});

test('tuning, stock laps and the tuned-lap bonus also need the lab-tuning switch', () => {
  const car = createProfile().unlockedCars[0];
  const profile = withLessons(driven(), 'grip');
  for (const result of [setTune(profile, car, 'pressure', 1, {flags: ON}), recordStockLap(profile, car, 'tremblant-woods', 90, {flags: ON}),
    payTunedBonus(profile, 'tremblant-woods', {flags: ON}), setTune(profile, car, 'pressure', 1, {flags: flagsOf('lab-tuning')})]) {
    assert.equal(result.ok, false);
    assert.equal(result.profile, profile);
  }
  assert.equal(setTune(profile, car, 'pressure', 1, {flags: TUNING}).ok, true);
  assert.equal(passLesson(driven(), 'grip', {flags: ON}).ok, true, 'lessons themselves need only the Lab switch');
});

test('a newer game\'s save fields never make the Lab fail or get written over', () => {
  for (const drivingLessons of [{version: 2}, {version: 2, done: null}, {version: 1, done: null}, null, 'x', 7, []]) {
    const profile = {...rich(), drivingLessons};
    assert.doesNotThrow(() => lessonRows(profile, ON));
    assert.equal(open(profile, ON).grip, false, 'a driving field this game cannot read does not open the tunnel');
    assert.equal(passLesson(profile, 'rust', {flags: ON}).ok, true);
  }
  const later = {version: 2, shape: 'new', done: {lift: true}};
  const profile = {...flier(), lab: later};
  for (const result of [passLesson(profile, 'rust', {flags: ON}), buyUpgrade(profile, 'galvanised', {flags: ON}), setRing(profile, 0, {flags: ON}),
    setCable(profile, 15, {flags: ON}), markSecret(profile, {flags: ON})]) {
    assert.equal(result.ok, false);
    assert.equal(result.profile.lab, later, 'the newer Lab is handed back exactly');
  }
  assert.deepEqual(normalizeProfile(profile).lab, later);
});
