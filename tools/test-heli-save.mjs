import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {courseClosed, burnStage} from '../src/course-closures.js';
import {createProfile, normalizeProfile, loadProfile, saveProfile, loadPlayers, PLAYERS_KEY} from '../src/progression.js';
import {HELI_SAVE_VERSION, HELI_MONEY, HELI_LESSONS, createHeli, normalizeHeli, heliOf, buyFuel, setFuel,
  chargeRepair, repairCost, fuelTruck, notePlayDay, finishLesson, placeCar, carAt, countFlight,
  takeJob, dropJob, finishJob, FIRE_MONEY, MISSION_KINDS, BADGES, BUCKET_DAMAGE, heliHash, createMissions, missionsOf, fireOf,
  bucketDamageOf, setMissions, setFire, putOutFire, loseFire, burnCourse, addScar, buyBack, damageBucket, repairBucket,
  RESCUE_KINDS, RESCUE_STAGES, RESCUE_BADGES, SKIN_KINDS, DIRT_KINDS, DIRT_MAX, WILDLIFE_COUNTS} from '../src/heli/heli-save.js';

let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }
function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]));
  return {get length() { return values.size; }, key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(String(key)) ?? null, setItem: (key, value) => values.set(String(key), String(value)),
    removeItem: key => values.delete(String(key)), clear: () => values.clear()};
}
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
const on = {enabled: true};
const withHeli = (heli = {}, credits = 1000) => deepFreeze({...createProfile(), credits, heli: {...createHeli(), ...heli}});

check('the new helicopter has the settled shape', () => {
  assert.deepEqual(createHeli(), {version: 1, fuelKg: 0, lessons: {liftoff: false, hover: false, landing: false, carry: false},
    playDay: {last: null, count: 0}, jobs: {day: 0, taken: null, done: []}, carsAt: {}, refuels: 0, flights: 0});
  assert.equal(HELI_SAVE_VERSION, 1);
  assert.deepEqual([...HELI_LESSONS], ['liftoff', 'hover', 'landing', 'carry']);
  assert.equal(Object.isFrozen(HELI_MONEY), true);
  assert.equal(HELI_MONEY.tankKg * HELI_MONEY.creditsPerKg, 600);
});

check('garbage and wrong versions give a new helicopter', () => {
  for (const bad of [undefined, null, 0, 'text', 7, [], [1], {}, {version: 2}, {version: '1'}, {version: 0, fuelKg: 50}])
    assert.deepEqual(normalizeHeli(bad), createHeli(), JSON.stringify(bad));
});

check('normalizing clamps and rounds every field', () => {
  const heli = normalizeHeli({version: 1, fuelKg: 123.456, lessons: {liftoff: true, hover: 'yes', landing: 1, carry: true, extra: true},
    playDay: {last: '2026-10-14', count: 5}, jobs: {day: 12, taken: 'job:a-1', done: ['a', 'a', 'b', 'Bad Id', 7, 'c']},
    carsAt: {koenigsegg_jesko: 'panorama-ridge', falcone_f42: 'tremblant-woods', nope: 'tremblant-woods', stuttgart_959s: 'nowhere', aurora_gt: 4},
    refuels: 2, flights: 9, unknown: 'kept'});
  assert.deepEqual(heli, {version: 1, fuelKg: 123.5, lessons: {liftoff: true, hover: false, landing: false, carry: true},
    playDay: {last: '2026-10-14', count: 5}, jobs: {day: 12, taken: 'job:a-1', done: ['a', 'b', 'c']},
    carsAt: {koenigsegg_jesko: 'panorama-ridge', falcone_f42: 'tremblant-woods'}, refuels: 2, flights: 9, unknown: 'kept'});
  assert.equal(normalizeHeli({version: 1, fuelKg: 9999}).fuelKg, 400);
  assert.equal(normalizeHeli({version: 1, fuelKg: -5}).fuelKg, 0);
  for (const bad of [NaN, Infinity, '50', null, {}]) assert.equal(normalizeHeli({version: 1, fuelKg: bad}).fuelKg, 0, String(bad));
  for (const field of ['refuels', 'flights']) {
    assert.equal(normalizeHeli({version: 1, [field]: 5_000_000})[field], 1_000_000);
    assert.equal(normalizeHeli({version: 1, [field]: -3})[field], 0);
    assert.equal(normalizeHeli({version: 1, [field]: 2.5})[field], 0);
    assert.equal(normalizeHeli({version: 1, [field]: '4'})[field], 0);
  }
  assert.equal(normalizeHeli({version: 1, playDay: {last: '14/10/2026', count: 1}}).playDay.last, null);
  assert.equal(normalizeHeli({version: 1, playDay: {last: 20261014}}).playDay.last, null);
  assert.equal(normalizeHeli({version: 1, jobs: {taken: 'x'.repeat(81)}}).jobs.taken, null);
  assert.equal(normalizeHeli({version: 1, jobs: {taken: 'x'.repeat(80)}}).jobs.taken, 'x'.repeat(80));
  assert.equal(normalizeHeli({version: 1, jobs: {taken: ''}}).jobs.taken, null);
  assert.equal(normalizeHeli({version: 1, jobs: {day: 2_000_000}}).jobs.day, 1_000_000);
  const many = Array.from({length: 14}, (_, i) => 'job-' + i);
  assert.deepEqual(normalizeHeli({version: 1, jobs: {done: many}}).jobs.done, many.slice(0, 10));
  assert.deepEqual(normalizeHeli({version: 1, carsAt: ['falcone_f42']}).carsAt, {});
  assert.deepEqual(normalizeHeli(normalizeHeli({version: 1, fuelKg: 33.33})), normalizeHeli({version: 1, fuelKg: 33.33}));
});

check('keys from a newer game survive normalizing and a save and load', () => {
  const later = {version: 1, fuelKg: 10, futureField: {deep: [1, 2, {x: 'y'}]}, laterList: [3, 4], laterFlag: false, laterZero: 0};
  const heli = normalizeHeli(later);
  for (const key of ['futureField', 'laterList', 'laterFlag', 'laterZero']) assert.deepEqual(heli[key], later[key], key);
  assert.deepEqual(normalizeHeli(JSON.parse(JSON.stringify(heli))), heli, 'normalizing twice changes nothing');
  const store = memoryStorage();
  assert(saveProfile({...createProfile(), heli}, store));
  assert.deepEqual(loadProfile(store).heli.futureField, later.futureField);
  const hostile = normalizeHeli(JSON.parse('{"version": 1, "__proto__": {"polluted": true}}'));
  assert.equal(Object.getPrototypeOf(hostile), Object.prototype, 'a stored __proto__ key never changes the object');
  assert.equal(hostile.polluted, undefined);
  assert.deepEqual(normalizeHeli({version: 2, futureField: 1}), createHeli(), 'a wrong version still starts fresh');
});

check('a profile keeps its helicopter through the real load and save, and an old save gains none', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/saves/10-heli.json', import.meta.url), 'utf8'));
  const raw = fixture.storage[PLAYERS_KEY].players[0].profile.heli;
  const storage = memoryStorage(fixture.storage);
  const players = loadPlayers(storage);
  assert.deepEqual(players.players[0].profile.heli, raw);
  assert.equal(Object.hasOwn(players.players[1].profile, 'heli'), false);
  const profile = {...createProfile(), credits: 321, heli: {...createHeli(), fuelKg: 77.7, refuels: 1, flights: 4,
    lessons: {liftoff: true, hover: true, landing: true, carry: false}, carsAt: {koenigsegg_jesko: 'panorama-ridge'},
    playDay: {last: '2026-10-14', count: 2}}};
  const store = memoryStorage();
  assert(saveProfile(profile, store));
  assert.deepEqual(loadProfile(store).heli, profile.heli);
  assert(saveProfile(loadProfile(store), store));
  assert.deepEqual(loadProfile(store).heli, profile.heli);
  const legacy = normalizeProfile({version: 2, credits: 55});
  assert.equal(Object.hasOwn(legacy, 'heli'), false);
  assert.equal(Object.hasOwn(createProfile(), 'heli'), false);
  assert.deepEqual(normalizeProfile({version: 2, heli: {version: 9, fuelKg: 50}}).heli, createHeli());
  assert.equal(normalizeProfile({version: 2, heli: {version: 1, fuelKg: 9000}}).heli.fuelKg, 400);
});

check('stored helicopter data survives the switch being off', () => {
  const profile = withHeli({fuelKg: 100, flights: 2});
  const loaded = normalizeProfile(JSON.parse(JSON.stringify(profile)));
  assert.deepEqual(loaded.heli, profile.heli);
  assert.deepEqual(heliOf(loaded), profile.heli);
  assert.deepEqual(heliOf(createProfile()), createHeli());
  assert.deepEqual(heliOf(null), createHeli());
});

check('the first tank is free, the rest are priced per kilogram', () => {
  const first = buyFuel(withHeli({}, 50), Infinity, on);
  assert.equal(first.ok, true);
  assert.deepEqual([first.kg, first.cost, first.profile.credits, first.profile.heli.fuelKg, first.profile.heli.refuels], [400, 0, 50, 400, 1]);
  const used = withHeli({fuelKg: 100, refuels: 1}, 1000);
  const second = buyFuel(used, 200, on);
  assert.deepEqual([second.ok, second.kg, second.cost, second.profile.credits, second.profile.heli.fuelKg, second.profile.heli.refuels, second.partial],
    [true, 200, 300, 700, 300, 2, false]);
  const fill = buyFuel(withHeli({fuelKg: 0, refuels: 1}, 1000), Infinity, on);
  assert.deepEqual([fill.kg, fill.cost, fill.profile.credits], [400, 600, 400]);
  const odd = buyFuel(withHeli({fuelKg: 0, refuels: 3}, 1000), 0.19, on);
  assert.deepEqual([odd.kg, odd.cost], [0.1, 1]);
  const roundUp = buyFuel(withHeli({fuelKg: 0, refuels: 3}, 1000), 10.1, on);
  assert.deepEqual([roundUp.kg, roundUp.cost], [10.1, 16]);
  const capped = buyFuel(withHeli({fuelKg: 390.5, refuels: 1}, 1000), 50, on);
  assert.deepEqual([capped.kg, capped.cost, capped.profile.heli.fuelKg], [9.5, 15, 400]);
});

check('a short wallet buys only what it can pay for, and a full tank refuses', () => {
  const short = buyFuel(withHeli({fuelKg: 0, refuels: 2}, 100), Infinity, on);
  assert.equal(short.ok, true);
  assert.equal(short.partial, true);
  assert.deepEqual([short.kg, short.cost, short.profile.credits, short.profile.heli.fuelKg], [66.6, 100, 0, 66.6]);
  assert(short.cost <= 100);
  for (const wallet of [1, 2, 7, 99, 100, 101, 299]) {
    const bought = buyFuel(withHeli({fuelKg: 0, refuels: 2}, wallet), Infinity, on);
    assert(bought.profile.credits >= 0 && bought.cost <= wallet, 'wallet ' + wallet);
    assert.equal(bought.profile.credits, wallet - bought.cost);
  }
  const broke = buyFuel(withHeli({fuelKg: 0, refuels: 2}, 0), 50, on);
  assert.deepEqual([broke.ok, broke.reason], [false, 'You need 1 more credit.']);
  const full = buyFuel(withHeli({fuelKg: 400, refuels: 5}), 10, on);
  assert.deepEqual([full.ok, full.reason], [false, 'The tank is full.']);
  for (const bad of [0, -5, NaN, 'x', 0.04]) assert.equal(buyFuel(withHeli({refuels: 1}), bad, on).ok, false, String(bad));
  const stale = withHeli({fuelKg: 5000, refuels: 1});
  assert.equal(buyFuel(stale, 10, on).reason, 'The tank is full.');
});

check('with the switch off every helper refuses and hands back the same profile', () => {
  const profile = withHeli({fuelKg: 50, refuels: 1});
  const calls = [p => buyFuel(p, 10, {enabled: false}), p => buyFuel(p, 10), p => buyFuel(p, 10, {enabled: 'yes'}),
    p => setFuel(p, 10, {enabled: false}), p => chargeRepair(p, 10, {enabled: false}), p => fuelTruck(p, {}),
    p => notePlayDay(p, '2026-10-14', {enabled: undefined}), p => finishLesson(p, 'hover', {enabled: false}),
    p => placeCar(p, 'falcone_f42', 'panorama-ridge', {enabled: false}), p => countFlight(p, {enabled: 1}),
    p => takeJob(p, 'd1-1', 1, {enabled: false}), p => dropJob(p, {}), p => finishJob(p, 'd1-1', 300, {enabled: 'yes'})];
  for (const call of calls) {
    const result = call(profile);
    assert.deepEqual([result.ok, result.reason], [false, 'The helicopter is not available yet.']);
    assert.equal(result.profile, profile);
  }
});

check('repairs take what the player has and forgive the rest', () => {
  const rich = chargeRepair(withHeli({}, 1000), 800, on);
  assert.deepEqual([rich.ok, rich.charged, rich.forgiven, rich.profile.credits], [true, 800, 0, 200]);
  const poor = chargeRepair(withHeli({}, 120), 800, on);
  assert.deepEqual([poor.ok, poor.charged, poor.forgiven, poor.profile.credits], [true, 120, 680, 0]);
  const none = chargeRepair(withHeli({}, 0), 150, on);
  assert.deepEqual([none.charged, none.forgiven, none.profile.credits], [0, 150, 0]);
  const zero = chargeRepair(withHeli({}, 40), 0, on);
  assert.deepEqual([zero.ok, zero.charged, zero.forgiven, zero.profile.credits], [true, 0, 0, 40]);
  for (const bad of [-1, 1.5, NaN, '5', null, Infinity]) assert.equal(chargeRepair(withHeli(), bad, on).ok, false, String(bad));
  const plain = chargeRepair(deepFreeze({...createProfile(), credits: 90}), 50, on);
  assert.equal(Object.hasOwn(plain.profile, 'heli'), false, 'a repair alone adds no helicopter field');
});

check('the repair price table matches the design', () => {
  assert.deepEqual(['hardLanding', 'crash', 'cargoLight', 'cargoHeavy', 'cargoWreck'].map(kind => repairCost(kind)), [150, 800, 150, 400, 900]);
  assert.equal(repairCost('drop'), 0);
  assert.equal(repairCost('drop', {dropMetres: 0.5}), 0);
  assert.equal(repairCost('drop', {dropMetres: 1}), 0);
  assert.equal(repairCost('drop', {dropMetres: 1.01}), 101);
  assert.equal(repairCost('drop', {dropMetres: 3.5}), 350);
  assert.equal(repairCost('drop', {dropMetres: NaN}), 0);
  assert.throws(() => repairCost('scratch'));
  assert.throws(() => repairCost('toString'));
});

check('the fuel truck fills the tank, charges 300 plus fuel and never strands a broke player', () => {
  const normal = fuelTruck(withHeli({fuelKg: 0, refuels: 4}, 2000), on);
  assert.deepEqual([normal.ok, normal.kg, normal.charged, normal.forgiven, normal.profile.credits, normal.profile.heli.fuelKg, normal.profile.heli.refuels],
    [true, 400, 900, 0, 1100, 400, 4]);
  const partial = fuelTruck(withHeli({fuelKg: 399.5, refuels: 0}, 2000), on);
  assert.deepEqual([partial.kg, partial.charged], [0.5, 301]);
  assert.equal(partial.profile.heli.refuels, 0, 'the truck is not a pump purchase');
  const broke = fuelTruck(withHeli({fuelKg: 0}, 120), on);
  assert.deepEqual([broke.ok, broke.charged, broke.forgiven, broke.profile.credits, broke.profile.heli.fuelKg], [true, 120, 780, 0, 400]);
  const fresh = fuelTruck(deepFreeze({...createProfile(), credits: 1000}), on);
  assert.equal(fresh.profile.heli.fuelKg, 400);
  assert.equal(fresh.profile.credits, 100);
});

check('play days count once per date', () => {
  let profile = deepFreeze({...createProfile()});
  const first = notePlayDay(profile, '2026-10-14', on);
  assert.deepEqual([first.ok, first.newDay, first.profile.heli.playDay], [true, true, {last: '2026-10-14', count: 1}]);
  const same = notePlayDay(first.profile, '2026-10-14', on);
  assert.deepEqual([same.ok, same.newDay], [true, false]);
  assert.equal(same.profile, first.profile);
  const next = notePlayDay(first.profile, '2026-10-15', on);
  assert.deepEqual([next.newDay, next.profile.heli.playDay], [true, {last: '2026-10-15', count: 2}]);
  for (const bad of ['', 'today', '2026-1-1', 20261014, null, undefined]) assert.equal(notePlayDay(profile, bad, on).ok, false, String(bad));
});

check('lessons, car places and flights record and validate', () => {
  const lesson = finishLesson(withHeli(), 'hover', on);
  assert.deepEqual(lesson.profile.heli.lessons, {liftoff: false, hover: true, landing: false, carry: false});
  assert.equal(finishLesson(lesson.profile, 'hover', on).profile.heli.lessons.hover, true);
  for (const bad of ['fly', '', null, 'toString']) assert.equal(finishLesson(withHeli(), bad, on).ok, false, String(bad));
  const placed = placeCar(withHeli(), 'koenigsegg_jesko', 'panorama-ridge', on);
  assert.deepEqual(placed.profile.heli.carsAt, {koenigsegg_jesko: 'panorama-ridge'});
  assert.equal(carAt(placed.profile, 'koenigsegg_jesko'), 'panorama-ridge');
  assert.equal(carAt(placed.profile, 'falcone_f42'), 'tremblant-woods');
  assert.equal(carAt(placed.profile, 'falcone_f42', 'x'), 'x');
  assert.equal(carAt(createProfile(), 'koenigsegg_jesko'), 'tremblant-woods');
  assert.equal(placeCar(withHeli(), 'missing_car', 'panorama-ridge', on).ok, false);
  assert.equal(placeCar(withHeli(), 'falcone_f42', 'missing-course', on).ok, false);
  assert.equal(placeCar(withHeli(), 'falcone_f42', 7, on).ok, false);
  const flown = countFlight(countFlight(withHeli(), on).profile, on);
  assert.equal(flown.profile.heli.flights, 2);
  assert.deepEqual(setFuel(withHeli(), 123.456, on).profile.heli.fuelKg, 123.5);
  assert.equal(setFuel(withHeli(), 9999, on).profile.heli.fuelKg, 400);
  assert.equal(setFuel(withHeli(), -4, on).profile.heli.fuelKg, 0);
  assert.equal(setFuel(withHeli(), NaN, on).ok, false);
});

check('jobs are taken one at a time, dropped, finished and paid once', () => {
  const start = withHeli({}, 100);
  const first = takeJob(start, 'd3-1', 3, on);
  assert.equal(first.ok, true);
  assert.deepEqual(first.profile.heli.jobs, {day: 3, taken: 'd3-1', done: []});
  assert.equal(first.profile.credits, 100);
  assert.equal(takeJob(first.profile, 'd3-1', 3, on).already, true, 'the same job again changes nothing');
  assert.equal(takeJob(first.profile, 'd3-1', 3, on).profile, first.profile);
  const second = takeJob(first.profile, 'd3-2', 3, on);
  assert.equal(second.ok, false, 'one job at a time');
  assert.match(second.reason, /drop/);
  assert.equal(second.profile, first.profile);
  const dropped = dropJob(first.profile, on);
  assert.deepEqual([dropped.ok, dropped.dropped, dropped.profile.heli.jobs], [true, true, {day: 3, taken: null, done: []}]);
  assert.equal(dropJob(dropped.profile, on).dropped, false, 'dropping nothing changes nothing');
  assert.equal(dropJob(dropped.profile, on).profile, dropped.profile);
  const paid = finishJob(first.profile, 'd3-1', 375, on);
  assert.equal(paid.ok, true);
  assert.deepEqual([paid.paid, paid.profile.credits, paid.profile.heli.jobs], [375, 475, {day: 3, taken: null, done: ['d3-1']}]);
  assert.equal(finishJob(paid.profile, 'd3-1', 375, on).ok, false, 'a job pays once');
  assert.equal(finishJob(dropped.profile, 'd3-1', 375, on).ok, false, 'only the job in hand pays');
  assert.equal(finishJob(first.profile, 'd3-2', 375, on).ok, false);
  const again = takeJob(paid.profile, 'd3-1', 3, on);
  assert.equal(again.ok, false, 'a finished job is not offered again that day');
  assert.match(again.reason, /done/);
  assert.equal(takeJob(paid.profile, 'd3-2', 3, on).profile.heli.jobs.done[0], 'd3-1', 'the done list is kept within the day');
  // A new play day: the board is new, so old finished jobs and an old job in hand are cleared.
  const next = takeJob(paid.profile, 'd4-1', 4, on);
  assert.deepEqual(next.profile.heli.jobs, {day: 4, taken: 'd4-1', done: []});
  const stale = takeJob(first.profile, 'd4-2', 4, on);
  assert.deepEqual([stale.ok, stale.profile.heli.jobs], [true, {day: 4, taken: 'd4-2', done: []}], 'a job left from yesterday does not block today');
  for (const bad of [[start, '', 3], [start, 'Bad Id', 3], [start, 'd3-1', -1], [start, 'd3-1', 2.5], [start, 'd3-1', '3'], [start, 7, 3]])
    assert.equal(takeJob(...bad, on).ok, false, JSON.stringify(bad.slice(1)));
  for (const pay of [-1, 1.5, NaN, Infinity, '300', null]) assert.equal(finishJob(first.profile, 'd3-1', pay, on).ok, false, String(pay));
  assert.equal(finishJob(first.profile, 'd3-1', 0, on).profile.credits, 100, 'a job can pay nothing');
});

check('pay is capped like the rest of the save and a damaged wallet reads as zero', () => {
  const rich = withHeli({jobs: {day: 1, taken: 'd1-1', done: []}}, 999_999_900);
  const paid = finishJob(rich, 'd1-1', 600, on);
  assert.deepEqual([paid.profile.credits, paid.paid], [1_000_000_000, 100]);
  const broken = deepFreeze({...createProfile(), credits: NaN, heli: {...createHeli(), jobs: {day: 1, taken: 'd1-1', done: []}}});
  assert.equal(finishJob(broken, 'd1-1', 300, on).profile.credits, 300);
  const survives = normalizeProfile(JSON.parse(JSON.stringify(finishJob(withHeli({jobs: {day: 2, taken: 'd2-3', done: ['d2-1']}}), 'd2-3', 450, on).profile)));
  assert.deepEqual(survives.heli.jobs, {day: 2, taken: null, done: ['d2-1', 'd2-3']}, 'the job fields survive a save and load');
  assert.equal(survives.credits, 1450);
});

check('no helper changes the profile it was given', () => {
  // Frozen inputs make any in-place change throw, so reaching the end proves they were left alone.
  const profile = withHeli({fuelKg: 50, refuels: 1}, 500), bare = deepFreeze({...createProfile(), credits: 500});
  for (const p of [profile, bare]) {
    buyFuel(p, 100, on); buyFuel(p, Infinity, on); setFuel(p, 10, on); chargeRepair(p, 100, on); fuelTruck(p, on);
    notePlayDay(p, '2026-10-14', on); finishLesson(p, 'carry', on); placeCar(p, 'falcone_f42', 'panorama-ridge', on); countFlight(p, on);
    takeJob(p, 'd1-1', 1, on); dropJob(p, on); finishJob(p, 'd1-1', 300, on);
    heliOf(p); normalizeHeli(p.heli);
  }
  assert.equal(profile.heli.fuelKg, 50);
  assert.equal(profile.credits, 500);
  assert.equal(Object.hasOwn(bare, 'heli'), false);
});

// ---- H2 Fire fields (docs/HELI_FIRE.md section 12) ----
check('H2 fields are optional: a new or H1 helicopter gains none', () => {
  assert.deepEqual(Object.keys(createHeli()), ['version', 'fuelKg', 'lessons', 'playDay', 'jobs', 'carsAt', 'refuels', 'flights']);
  const h1 = normalizeHeli({version: 1, fuelKg: 10});
  for (const field of ['missions', 'fire', 'burnt', 'scars', 'bucket']) assert.equal(Object.hasOwn(h1, field), false, field);
  assert.deepEqual(missionsOf(withHeli()), createMissions());
  assert.equal(fireOf(withHeli()), null);
  assert.equal(bucketDamageOf(withHeli()), 0);
  assert.deepEqual([...MISSION_KINDS], ['fire']);
  assert.deepEqual([...BADGES], ['firefighter']);
  assert.deepEqual([...BUCKET_DAMAGE], ['whole', 'dented', 'torn', 'ruined']);
  assert.deepEqual([FIRE_MONEY.firePay, ...FIRE_MONEY.bucketRepair], [6300, 0, 100, 250, 600]); // HELI-PAY-CONTINUE: the fire pays 6,300 (was 1,500); repairs are unchanged
});

check('the H2 fields normalize: counts, cells, courses, kinds and badges', () => {
  const heli = normalizeHeli({version: 1,
    missions: {seed: 2 ** 33, draws: -1, need: 4.5, count: 3, last: 'smoke', call: {kind: 'fire', id: 'fire-1', courseId: 'nowhere', day: 2},
      quiet: {untilDay: 9, engineSeconds: 1200.04}, firesOut: 2, badges: ['firefighter', 'firefighter', 'mayor', 7], extra: 1},
    fire: {id: 'fire-1', courseId: 'tremblant-woods', seed: 77, startDay: 3, steps: 5, engineSeconds: 12.34,
      burning: [[5, 100.04], [5, 50], [6, 0], [7, 140], [8, -3], ['x', 50], [9], [-1, 50], [3, 25]], burnt: [9, 9, 2, 'y', 1.5, 7],
      damp: [[11, 5], [12, 0], [13, 1.5], [2, 2]]},
    burnt: {'tremblant-woods': {day: 4, boughtBack: 'yes'}, nowhere: {day: 1}, 'panorama-ridge': 'bad'},
    scars: [1, 2, 3, 4, 5].map(day => ({courseId: 'tremblant-woods', day, cells: [day, day, -4]})).concat([{courseId: 'nowhere', day: 9, cells: [1]}]),
    bucket: {damage: 4}});
  assert.deepEqual(heli.missions, {seed: 0, draws: 0, need: 0, count: 3, last: null, call: null,
    quiet: {untilDay: 9, engineSeconds: 1200}, firesOut: 2, badges: ['firefighter']});
  assert.deepEqual(heli.fire, {id: 'fire-1', courseId: 'tremblant-woods', seed: 77, startDay: 3, steps: 5, engineSeconds: 12.3,
    // Duplicates, bad pairs and unlit cells go; a cell both burning and burnt is burnt.
    burning: [[3, 25], [5, 100]], burnt: [2, 7, 9],
    damp: [[11, 2], [12, 1], [13, 1]]});
  assert.deepEqual(heli.burnt, {'tremblant-woods': {day: 4, boughtBack: false}});
  // Sarah's regrowth news heard: one of the three, or nothing.
  assert.deepEqual(normalizeHeli({version: 1, burnt: {'tremblant-woods': {day: 4, heard: 'shoots'}, 'tremblant-snow': {day: 2, heard: 'smoke'}}}).burnt,
    {'tremblant-woods': {day: 4, boughtBack: false, heard: 'shoots'}, 'tremblant-snow': {day: 2, boughtBack: false}}, 'regrowth news heard survives; anything else is dropped');
  assert.deepEqual(heli.scars.map(scar => scar.day), [2, 3, 4, 5], 'at most four scars, the oldest goes');
  assert.deepEqual(heli.scars[0].cells, [2]);
  assert.deepEqual(heli.bucket, {damage: 0});
  assert.equal(normalizeHeli({version: 1, fire: {id: 'x'}}).fire, null, 'a broken fire reads as none');
  const call = normalizeHeli({version: 1, missions: {call: {kind: 'fire', id: 'fire-3', courseId: 'tremblant-woods', day: 6, answered: true}}}).missions.call;
  assert.deepEqual(call, {kind: 'fire', id: 'fire-3', courseId: 'tremblant-woods', day: 6, answered: true});
  const big = normalizeHeli({version: 1, fire: {id: 'f', courseId: 'tremblant-woods', burnt: Array.from({length: 60}, (_, i) => i),
    burning: Array.from({length: 60}, (_, i) => [100 + i, 50])}}).fire;
  assert.deepEqual([big.burnt.length, big.burning.length], [60, 20], 'a fire holds at most 80 cells');
  assert.deepEqual(normalizeHeli(normalizeHeli(heli)), normalizeHeli(heli));
});

check('a known H2 field of the wrong type is dropped, never copied, and helpers on it do not throw', () => {
  const heli = normalizeHeli({version: 1, playDay: {last: '2026-10-20', count: 3}, missions: 'garbage', burnt: [1, 2], scars: {a: 1}, bucket: 7, fire: 'x',
    lessons: 'x', jobs: [], carsAt: 5});
  for (const field of ['missions', 'burnt', 'scars', 'bucket']) assert.equal(Object.hasOwn(heli, field), false, field);
  assert.equal(heli.fire, null);
  const profile = withHeli(heli);
  assert.deepEqual(missionsOf(profile), createMissions());
  assert.equal(addScar(profile, 'tremblant-woods', 1, [5], on).ok, true);
  assert.deepEqual(heliOf(burnCourse(profile, 'tremblant-woods', 2, on).profile).burnt, {'tremblant-woods': {day: 2, boughtBack: false}});
  const days = normalizeHeli({version: 1, burnt: {'tremblant-woods': {day: 'x'}, 'tremblant-snow': {day: -1}, 'panorama-ridge': {day: 1.5}, 'harbour-lights': {day: 2}},
    scars: [{courseId: 'tremblant-woods', day: 'x', cells: [1]}, {courseId: 'tremblant-woods', day: 4, cells: [2]}]});
  assert.deepEqual([days.burnt, days.scars.map(scar => scar.day)], [{'harbour-lights': {day: 2, boughtBack: false}}, [4]],
    'a broken day is dropped, not moved to day 0');
  const later = {version: 1, future: {list: [1]}};
  assert.notEqual(normalizeHeli(later).future, later.future, 'a newer field is copied, not shared');
});

check('the fire fixture keeps every H2 field through the real load and save', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/saves/11-heli-fire.json', import.meta.url), 'utf8'));
  const raw = fixture.storage[PLAYERS_KEY].players[0].profile.heli;
  const players = loadPlayers(memoryStorage(fixture.storage));
  assert.deepEqual(players.players[0].profile.heli, raw, 'written in createHeli() order and already clean');
  assert.equal(Object.hasOwn(players.players[1].profile.heli, 'fire'), false);
  const store = memoryStorage();
  assert(saveProfile(players.players[0].profile, store));
  assert.deepEqual(loadProfile(store).heli, raw);
});

check('mission and fire records store, and the switch off refuses every H2 helper', () => {
  const missions = {...createMissions(), seed: 5, draws: 1, need: 3, count: 1};
  const stored = setMissions(withHeli(), missions, on);
  assert.deepEqual(missionsOf(stored.profile), missions);
  assert.equal(setMissions(withHeli(), 'x', on).ok, false);
  const fire = {id: 'fire-1', courseId: 'tremblant-woods', seed: 9, startDay: 2, steps: 0, engineSeconds: 0, burning: [[3, 75]], burnt: [], damp: []};
  const burning = setFire(withHeli(), fire, on);
  assert.deepEqual(fireOf(burning.profile), fire);
  assert.equal(fireOf(setFire(burning.profile, null, on).profile), null);
  assert.equal(setFire(withHeli(), {id: 'x'}, on).ok, false);
  const profile = withHeli({}, 500);
  for (const call of [p => setMissions(p, missions, {enabled: false}), p => setFire(p, fire), p => putOutFire(p, 'fire-1', {enabled: 'yes'}), p => loseFire(p, 'fire-1', {}),
    p => burnCourse(p, 'tremblant-woods', 1, {}), p => addScar(p, 'tremblant-woods', 1, [1], {enabled: false}),
    p => buyBack(p, 'tremblant-woods', {enabled: 1}), p => damageBucket(p, 2, {}), p => repairBucket(p, {enabled: false})]) {
    const result = call(profile);
    assert.deepEqual([result.ok, result.reason, result.profile], [false, 'Forest fires are not available yet.', profile]);
  }
});

const fireDay = (credits, extra = {}) => withHeli({playDay: {last: '2026-10-20', count: 9},
  fire: {id: 'fire-4', courseId: 'tremblant-woods', seed: 3, startDay: 8, steps: 6, engineSeconds: 400, burning: [], burnt: [7, 8], damp: []},
  ...extra}, credits);

check('a fire put out pays 6,300 once, leaves a scar and counts toward the badge, in one step', () => {
  const out = putOutFire(fireDay(100), 'fire-4', on);
  assert.deepEqual([out.ok, out.paid, out.firstBadge, out.firesOut, out.profile.credits], [true, 6300, true, 1, 6400]);
  const heli = heliOf(out.profile);
  assert.equal(heli.fire, null);
  assert.deepEqual(heli.scars, [{courseId: 'tremblant-woods', day: 9, cells: [7, 8]}]);
  assert.deepEqual([heli.missions.firesOut, heli.missions.badges], [1, ['firefighter']]);
  assert.deepEqual([putOutFire(out.profile, 'fire-4', on).ok, putOutFire(out.profile, 'fire-4', on).profile], [false, out.profile], 'it can never pay twice');
  assert.equal(putOutFire(fireDay(100), 'fire-3', on).ok, false, 'only the fire in the save');
  const still = fireDay(100, {fire: {...fireDay(0).heli.fire, burning: [[9, 25]]}});
  assert.match(putOutFire(still, 'fire-4', on).reason, /still burning/);
  const second = putOutFire(fireDay(100, {missions: {...createMissions(), firesOut: 2, badges: ['firefighter']}}), 'fire-4', on);
  assert.deepEqual([second.firstBadge, second.firesOut, heliOf(second.profile).missions.badges], [false, 3, ['firefighter']]);
  const rich = putOutFire(fireDay(999_999_000), 'fire-4', on);
  assert.deepEqual([rich.profile.credits, rich.paid], [1_000_000_000, 1000]); // capped: only 1,000 fits under the limit
  assert.equal(putOutFire(deepFreeze({...fireDay(0), credits: NaN}), 'fire-4', on).profile.credits, 6300);
});

check('a fire lost burns its course today and leaves the save, with no pay and no charge', () => {
  const lost = loseFire(fireDay(300, {fire: {...fireDay(0).heli.fire, burning: [[9, 100]]}}), 'fire-4', on);
  assert.deepEqual([lost.ok, lost.courseId, lost.profile.credits], [true, 'tremblant-woods', 300]);
  assert.deepEqual([heliOf(lost.profile).fire, heliOf(lost.profile).burnt], [null, {'tremblant-woods': {day: 9, boughtBack: false}}]);
  assert.equal(loseFire(lost.profile, 'fire-4', on).ok, false);
});

check('the bucket only gets worse until repaired, and a repair forgives what the player lacks', () => {
  let profile = withHeli({}, 180);
  profile = damageBucket(profile, 1, on).profile;
  assert.equal(bucketDamageOf(profile), 1);
  const lighter = damageBucket(profile, 1, on);
  assert.deepEqual([lighter.worse, lighter.profile], [false, profile]);
  profile = damageBucket(profile, 2, on).profile;
  assert.equal(damageBucket(profile, 1, on).profile, profile, 'a light hit does not mend a tear');
  for (const bad of [-1, 4, 1.5, '2', null]) assert.equal(damageBucket(profile, bad, on).ok, false, String(bad));
  const torn = repairBucket(profile, on);
  assert.deepEqual([torn.repaired, torn.charged, torn.forgiven, torn.profile.credits, bucketDamageOf(torn.profile)], [true, 180, 70, 0, 0]);
  const ruined = repairBucket(damageBucket(withHeli({}, 1000), 3, on).profile, on);
  assert.deepEqual([ruined.charged, ruined.profile.credits], [600, 400]);
  const whole = repairBucket(withHeli({}, 50), on);
  assert.deepEqual([whole.repaired, whole.charged, whole.profile.credits], [false, 0, 50]);
});

check('scars keep four, burns record the day, and bad input is refused', () => {
  let profile = withHeli({playDay: {last: '2026-10-20', count: 10}});
  for (let day = 1; day <= 6; day++) profile = addScar(profile, 'tremblant-woods', day, [day + 10, day + 10, day + 20], on).profile;
  assert.deepEqual(heliOf(profile).scars.map(scar => [scar.day, scar.cells]), [[3, [13, 23]], [4, [14, 24]], [5, [15, 25]], [6, [16, 26]]]);
  assert.equal(addScar(withHeli(), 'tremblant-woods', 1, [], on).profile.heli.scars, undefined, 'an empty scar is not kept');
  for (const bad of [['nowhere', 1, [1]], ['tremblant-woods', -1, [1]], ['tremblant-woods', 1, 'x']])
    assert.equal(addScar(withHeli(), ...bad, on).ok, false, JSON.stringify(bad));
  const burnt = burnCourse(profile, 'tremblant-woods', 7, on).profile;
  assert.deepEqual(heliOf(burnt).burnt, {'tremblant-woods': {day: 7, boughtBack: false}});
  for (const bad of [['nowhere', 1], ['tremblant-woods', -2], ['tremblant-woods', 1.5], ['tremblant-woods', 11]])
    assert.equal(burnCourse(profile, ...bad, on).ok, false, JSON.stringify(bad));
  assert.equal(addScar(profile, 'tremblant-woods', 11, [1], on).ok, false, 'never dated after today');
});

const closureProfile = day => ({...createProfile(), credits: 20_000, heli: {...createHeli(), playDay: {last: '2026-10-20', count: day}}});
check('burning, buying back, scars and healing work through the save helpers', () => {
  let profile = burnCourse(closureProfile(4), 'tremblant-woods', 4, on).profile;
  assert.equal(courseClosed(profile, 'tremblant-woods', undefined, on), true);
  profile = {...profile, credits: 9_999};
  const short = buyBack(profile, 'tremblant-woods', on);
  assert.deepEqual([short.ok, short.reason, short.profile], [false, 'You need 1 more credit.', profile]);
  profile = {...profile, credits: 10_000};
  const bought = buyBack(profile, 'tremblant-woods', on);
  assert.deepEqual([bought.ok, bought.price, bought.profile.credits], [true, 10_000, 0]);
  assert.equal(courseClosed(bought.profile, 'tremblant-woods', undefined, on), false, 'buying back reopens it at once');
  assert.equal(burnStage(bought.profile, 'tremblant-woods', undefined, on), 'black');
  assert.equal(buyBack(bought.profile, 'tremblant-woods', on).ok, false, 'an open course cannot be bought');
  assert.equal(buyBack(closureProfile(4), 'tremblant-woods', {enabled: false}).ok, false);
  // A new play day forgets a burn at 60 days and a scar at 40.
  let healed = addScar(burnCourse(closureProfile(30), 'tremblant-woods', 0, on).profile, 'tremblant-woods', 25, [5, 6], on).profile;
  healed = {...healed, heli: {...healed.heli, playDay: {last: '2026-10-20', count: 59}}};
  const day60 = notePlayDay(healed, '2026-10-21', on).profile;
  assert.deepEqual([day60.heli.playDay.count, day60.heli.burnt, day60.heli.scars.length], [60, {}, 1]);
  const scarHealed = notePlayDay({...day60, heli: {...day60.heli, playDay: {last: '2026-10-21', count: 64}}}, '2026-10-22', on).profile;
  assert.deepEqual(scarHealed.heli.scars, []);
  const kept = notePlayDay({...healed, heli: {...healed.heli, playDay: {last: '2026-10-20', count: 50}}}, '2026-10-21', on).profile;
  assert.deepEqual(Object.keys(kept.heli.burnt), ['tremblant-woods']);
});

check('the mission hash is a fixed 32-bit FNV-1a with parts kept apart', () => {
  assert.equal(heliHash(), 2166136261);
  assert.equal(heliHash('a'), heliHash('a'));
  assert.notEqual(heliHash('ab', 'c'), heliHash('a', 'bc'));
  assert.notEqual(heliHash('missions', '2026-10-14', 'Kyle'), heliHash('missions', '2026-10-14', 'Kai'));
  for (const parts of [['x'], [1, 2, 3], ['missions', '2026-10-14', 'Player 1']]) {
    const hash = heliHash(...parts);
    assert(Number.isSafeInteger(hash) && hash >= 0 && hash <= 0xffffffff);
  }
  assert.equal(heliHash('missions', '2026-10-14', 'Player 1'), 819056117, 'pinned: a changed hash would change every saved mission');
});

check('no H2 helper changes the profile it was given', () => {
  const fire = {id: 'fire-1', courseId: 'tremblant-woods', seed: 9, startDay: 2, steps: 0, engineSeconds: 0, burning: [[3, 75]], burnt: [], damp: []};
  const profile = withHeli({burnt: {'tremblant-woods': {day: 0, boughtBack: false}}, scars: [], bucket: {damage: 2}, fire}, 20_000);
  setMissions(profile, createMissions(), on); setFire(profile, null, on); putOutFire(profile, 'fire-1', on); loseFire(profile, 'fire-1', on);
  burnCourse(profile, 'tremblant-snow', 0, on);
  addScar(profile, 'tremblant-woods', 0, [1], on); buyBack(profile, 'tremblant-woods', on); damageBucket(profile, 3, on); repairBucket(profile, on);
  notePlayDay(profile, '2026-12-01', on);
  assert.equal(profile.credits, 20_000);
});

// ---- H4 Rescue fields (docs/HELI_RESCUE.md section 10) ----
const rescueRecord = {kind: 'hiker', id: 'hiker-5', courseId: 'tremblant-woods', seed: 1618033988, clockSeconds: 312.4, stage: 'carry',
  crates: [0, 1, 2], condition: 1};
const wreckRecord = {courseId: 'panorama-ridge', carId: 'falcone_f42', x: -182.4, z: 96.7, day: 11};
const withMissions = missions => normalizeHeli({version: 1, missions}).missions;

check('the rescue fixture keeps every H4 field through the real load and save, and older saves read back unchanged', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/saves/12-heli-rescue.json', import.meta.url), 'utf8'));
  const [rescuer, fireOnly, plain] = fixture.storage[PLAYERS_KEY].players.map(player => player.profile.heli);
  const players = loadPlayers(memoryStorage(fixture.storage));
  assert.deepEqual(players.players[0].profile.heli, rescuer, 'written in normalized order and already clean');
  assert.equal(JSON.stringify(players.players[0].profile.heli), JSON.stringify(rescuer), 'same bytes, same key order');
  assert.equal(JSON.stringify(players.players[1].profile.heli), JSON.stringify(fireOnly), 'an H2 save gains no H4 field');
  assert.equal(JSON.stringify(players.players[2].profile.heli), JSON.stringify(plain));
  for (const field of ['rescue', 'hoists', 'searches', 'supplies', 'rescued', 'wreck'])
    assert.equal(Object.hasOwn(players.players[1].profile.heli.missions, field), false, field);
  assert.equal('condition' in rescuer.missions.rescue && !('bumps' in rescuer.missions.rescue), true, 'it saves condition, never bumps');
  const store = memoryStorage();
  assert(saveProfile(players.players[0].profile, store));
  assert.deepEqual(loadProfile(store).heli, rescuer);
});

check('H4 fields are optional: the engine record and an H2 record gain none', () => {
  assert.deepEqual(createMissions(), {seed: 0, draws: 0, need: 0, count: 0, last: null, call: null,
    quiet: {untilDay: 0, engineSeconds: 0}, firesOut: 0, badges: []});
  const h2 = {seed: 5, draws: 1, need: 3, count: 1, last: 'fire', call: {kind: 'fire', id: 'fire-1', courseId: 'tremblant-woods', day: 2, answered: true},
    quiet: {untilDay: 4, engineSeconds: 10}, firesOut: 1, badges: ['firefighter']};
  assert.deepEqual(withMissions(h2), h2);
  assert.deepEqual([...RESCUE_KINDS], ['hiker', 'avalanche', 'hoist', 'supply']);
  assert.deepEqual([...RESCUE_STAGES], ['fly', 'found', 'hold', 'carry']);
  assert.deepEqual([...RESCUE_BADGES], ['firefighter', 'rescue']);
  assert.deepEqual([...MISSION_KINDS], ['fire'], 'the engine offers no rescue kind yet');
});

check('the H4 fields normalize: condition, crates, stage, counts, kinds, badges and the wreck', () => {
  const missions = {seed: 7, last: 'supply', badges: ['rescue', 'firefighter', 'rescue', 'mayor'], hoists: 2, searches: 1.5, supplies: -3, rescued: 2 ** 40,
    call: {kind: 'hoist', id: 'hoist-2', courseId: 'panorama-ridge', day: 4, answered: false, flights: 2},
    rescue: rescueRecord, wreck: wreckRecord};
  const stored = withMissions(missions);
  assert.equal(stored.last, 'supply');
  assert.deepEqual(stored.badges, ['rescue', 'firefighter']);
  assert.deepEqual([stored.hoists, 'searches' in stored, stored.supplies, stored.rescued], [2, false, 0, 1_000_000], 'counts are whole numbers from 0 to 1,000,000; a fraction is dropped');
  assert.deepEqual(stored.call, {kind: 'hoist', id: 'hoist-2', courseId: 'panorama-ridge', day: 4, answered: false, flights: 2});
  assert.deepEqual(stored.rescue, rescueRecord);
  assert.deepEqual(stored.wreck, wreckRecord);
  assert.deepEqual(withMissions(stored), stored, 'normalizing twice changes nothing');
  // An old-style call has no flights, and a bad count is dropped, not zeroed.
  const call = {kind: 'avalanche', id: 'a-1', courseId: 'tremblant-snow', day: 1};
  assert.deepEqual([withMissions({call}).call, withMissions({call: {...call, flights: 'x'}}).call], [{...call, answered: false}, {...call, answered: false}]);
  assert.equal(withMissions({call: {...call, kind: 'smoke'}}).call, null);
  // Condition and crates are clamped, never thrown on; bumps is not a field.
  const odd = withMissions({rescue: {...rescueRecord, condition: 9, crates: [5, -1, 'x', 1], bumps: 3, extra: true}}).rescue;
  assert.deepEqual([odd.condition, odd.crates, 'bumps' in odd, 'extra' in odd], [2, [2, 0, 0], false, false]);
  for (const condition of [-4, 'hurt', null, 1.5, NaN]) assert.equal(withMissions({rescue: {...rescueRecord, condition}}).rescue.condition, 0, String(condition));
  assert.deepEqual(withMissions({rescue: {...rescueRecord, crates: 'x'}}).rescue.crates, [0, 0, 0]);
  assert.deepEqual(withMissions({rescue: {...rescueRecord, crates: [2]}}).rescue.crates, [2, 0, 0]);
  assert.deepEqual([withMissions({rescue: {...rescueRecord, seed: 2 ** 33, clockSeconds: 'soon'}}).rescue].map(r => [r.seed, r.clockSeconds]), [[0, 0]]);
  assert.equal(withMissions({rescue: {...rescueRecord, clockSeconds: -5}}).rescue.clockSeconds, 0);
  assert.equal(withMissions({rescue: {...rescueRecord, clockSeconds: 12.34}}).rescue.clockSeconds, 12.3);
  for (const stage of RESCUE_STAGES) assert.equal(withMissions({rescue: {...rescueRecord, stage}}).rescue.stage, stage);
  // A rescue that cannot say what, where and how far along it is reads as none; so does a wreck.
  const none = [{...rescueRecord, kind: 'fire'}, {...rescueRecord, kind: 'smoke'}, {...rescueRecord, stage: 'sleep'}, {...rescueRecord, courseId: 'nowhere'},
    {...rescueRecord, id: 'Bad Id'}, 'x', 7, [], null];
  for (const rescue of none) assert.equal(withMissions({rescue}).rescue, null, JSON.stringify(rescue));
  const lost = [{...wreckRecord, courseId: 'nowhere'}, {...wreckRecord, carId: 'no_such_car'}, {...wreckRecord, day: -1}, {...wreckRecord, day: 'x'},
    {...wreckRecord, x: 'far'}, {...wreckRecord, z: NaN}, {...wreckRecord, x: 1e9}, 'x', null];
  for (const wreck of lost) assert.equal(withMissions({wreck}).wreck, null, JSON.stringify(wreck));
  assert.deepEqual(withMissions({wreck: {...wreckRecord, x: 1.234, z: -5.678}}).wreck, {...wreckRecord, x: 1.2, z: -5.7});
});

check('wrong-type H4 fields never throw, never wipe other progress, and the helpers still work on them', () => {
  const heli = normalizeHeli({version: 1, fuelKg: 60, refuels: 4, missions: {seed: 9, count: 5, firesOut: 2, badges: ['firefighter'],
    rescue: 5, wreck: [1], hoists: '3', searches: null, supplies: {}, rescued: true}});
  assert.deepEqual([heli.fuelKg, heli.refuels, heli.missions.seed, heli.missions.count, heli.missions.firesOut, heli.missions.badges], [60, 4, 9, 5, 2, ['firefighter']]);
  assert.deepEqual([heli.missions.rescue, heli.missions.wreck], [null, null]);
  for (const field of ['hoists', 'searches', 'supplies', 'rescued']) assert.equal(Object.hasOwn(heli.missions, field), false, field);
  const profile = withHeli(heli);
  assert.equal(missionsOf(profile).count, 5);
  assert.equal(notePlayDay(profile, '2026-12-01', on).ok, true);
  assert.equal(setMissions(profile, {...missionsOf(profile), rescue: 'x', wreck: 3}, on).ok, true);
});

check('a rescue field stored through the engine record keeps the rest of the profile', () => {
  const missions = {...createMissions(), seed: 4, rescue: rescueRecord, rescued: 1, badges: ['rescue']};
  const stored = setMissions(withHeli({fuelKg: 80, flights: 3}), missions, on);
  assert.deepEqual(missionsOf(stored.profile), missions);
  assert.deepEqual([heliOf(stored.profile).fuelKg, heliOf(stored.profile).flights, stored.profile.credits], [80, 3, 1000]);
  assert.equal(setMissions(withHeli(), missions, {enabled: false}).ok, false);
});

check('a wreck job goes after 3 play days, when a new play day is noted, and nothing else changes', () => {
  const day = count => withHeli({playDay: {last: '2026-10-20', count}, missions: {...createMissions(), rescue: rescueRecord, rescued: 1, badges: ['rescue'],
    wreck: {...wreckRecord, day: 5}}});
  const kept = notePlayDay(day(7), '2026-10-21', on).profile;
  assert.deepEqual([kept.heli.playDay.count, kept.heli.missions.wreck], [8, {...wreckRecord, day: 5}], 'still 3 play days old on day 8');
  const gone = notePlayDay(day(8), '2026-10-21', on).profile;
  assert.equal(gone.heli.playDay.count, 9);
  assert.deepEqual(gone.heli.missions, {...day(8).heli.missions, wreck: null}, 'only the wreck leaves; the rescue, counts and badges stay');
  const same = notePlayDay(gone, '2026-10-21', on);
  assert.deepEqual([same.newDay, same.profile], [false, gone], 'the same day again changes nothing');
  const bare = notePlayDay(withHeli({playDay: {last: '2026-10-20', count: 3}}), '2026-10-21', on).profile;
  assert.equal(Object.hasOwn(bare.heli, 'missions'), false, 'a save with no missions gains none');
  const noWreck = notePlayDay(withHeli({playDay: {last: '2026-10-20', count: 3}, missions: createMissions()}), '2026-10-21', on).profile;
  assert.equal(Object.hasOwn(noWreck.heli.missions, 'wreck'), false, 'a record with no wreck gains none');
});

// ---- H3 skins, dirt and survey fields (docs/HELI_WILDLIFE.md section 10) ----
const withHeliFields = fields => normalizeHeli({version: 1, ...fields});
const skinsOf = skins => withHeliFields({skins}).skins;

check('the skins fixture keeps every H3 field through the real load and save, and older saves read back unchanged', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/saves/13-heli-skins.json', import.meta.url), 'utf8'));
  const [skinned, rescueOnly, plain] = fixture.storage[PLAYERS_KEY].players.map(player => player.profile.heli);
  const players = loadPlayers(memoryStorage(fixture.storage));
  assert.deepEqual(players.players[0].profile.heli, skinned, 'written in normalized order and already clean');
  assert.equal(JSON.stringify(players.players[0].profile.heli), JSON.stringify(skinned), 'same bytes, same key order');
  assert.deepEqual(skinned.skins, {owned: ['fire', 'wildlife'], worn: 'wildlife', fresh: ['fire']}, 'two owned, one worn, one fresh');
  assert.deepEqual(skinned.dirt, {dust: 34, mud: 12, soot: 7, salt: 3}, 'dirt of every kind');
  assert.deepEqual(skinned.survey, {day: skinned.playDay.count, done: true}, 'a finished count today');
  assert.equal(JSON.stringify(players.players[1].profile.heli), JSON.stringify(rescueOnly), 'an H4 save gains no H3 field');
  assert.equal(JSON.stringify(players.players[2].profile.heli), JSON.stringify(plain));
  for (const player of [1, 2]) for (const field of ['skins', 'dirt', 'survey']) assert.equal(Object.hasOwn(players.players[player].profile.heli, field), false, field);
  for (const field of ['wildlifeCounts', 'cameraFlights']) assert.equal(Object.hasOwn(rescueOnly.missions, field), false, field);
  const store = memoryStorage();
  assert(saveProfile(players.players[0].profile, store));
  assert.deepEqual(loadProfile(store).heli, skinned);
});

check('H3 fields are optional: a helicopter with none gains none, and the lists are what the packet names', () => {
  assert.deepEqual(createHeli(), normalizeHeli({version: 1, ...createHeli()}));
  for (const field of ['skins', 'dirt', 'survey']) assert.equal(Object.hasOwn(createHeli(), field), false, field);
  assert.deepEqual([...SKIN_KINDS], ['fire', 'medevac', 'rescue', 'wildlife', 'supply', 'tv']);
  assert.deepEqual([...DIRT_KINDS], ['dust', 'mud', 'soot', 'salt']);
  assert.deepEqual([DIRT_MAX, ...WILDLIFE_COUNTS], [100, 'wildlifeCounts', 'cameraFlights']);
  const h4 = {seed: 5, draws: 1, need: 3, count: 1, last: 'hiker', call: null, quiet: {untilDay: 4, engineSeconds: 10}, firesOut: 1, badges: ['rescue'],
    rescue: null, hoists: 1, wreck: null};
  assert.deepEqual(withMissions(h4), h4, 'an H4 record gains no H3 count');
  assert.deepEqual(Object.keys(withHeliFields({skins: {}, dirt: {}, survey: {}})), [...Object.keys(createHeli()), 'skins', 'dirt', 'survey']);
});

check('skins normalize: unknown skins dropped, worn must be owned, fresh must be owned and not worn', () => {
  assert.deepEqual(skinsOf({owned: ['wildlife', 'fire'], worn: 'fire', fresh: ['wildlife']}), {owned: ['wildlife', 'fire'], worn: 'fire', fresh: ['wildlife']}, 'order of earning is kept');
  assert.deepEqual(skinsOf({owned: ['fire', 'fire', 'tv', 'paisley', 7, null, 'stock'], worn: 'tv', fresh: ['fire', 'fire', 'tv', 'supply', 'x']}),
    {owned: ['fire', 'tv'], worn: 'tv', fresh: ['fire']}, 'duplicates, unknown and unowned skins go; stock is never owned');
  assert.equal(skinsOf({owned: ['fire'], worn: 'medevac'}).worn, 'stock', 'a worn skin that is not owned reads as stock');
  assert.equal(skinsOf({owned: ['fire'], worn: 'paisley'}).worn, 'stock');
  assert.equal(skinsOf({owned: ['fire'], worn: 'stock'}).worn, 'stock');
  assert.deepEqual(skinsOf({}), {owned: [], worn: 'stock', fresh: []}, 'an empty record is the new paint shop');
  for (const owned of ['fire', 7, null, {0: 'fire'}, true]) assert.deepEqual(skinsOf({owned, worn: 'fire', fresh: ['fire']}), {owned: [], worn: 'stock', fresh: []}, JSON.stringify(owned));
  for (const fresh of ['fire', 7, null, {0: 'fire'}]) assert.deepEqual(skinsOf({owned: ['fire'], worn: 'stock', fresh}).fresh, [], JSON.stringify(fresh));
  assert.deepEqual(skinsOf({owned: [...SKIN_KINDS], worn: 'supply', fresh: [...SKIN_KINDS]}),
    {owned: [...SKIN_KINDS], worn: 'supply', fresh: SKIN_KINDS.filter(kind => kind !== 'supply')});
  assert.deepEqual(skinsOf({owned: ['fire'], worn: 'fire', fresh: [], extra: 1}), {owned: ['fire'], worn: 'fire', fresh: []}, 'extra keys inside the record are dropped');
  const once = skinsOf({owned: ['fire', 'tv', 'x'], worn: 'tv', fresh: ['fire']});
  assert.deepEqual(skinsOf(once), once, 'normalizing twice changes nothing');
});

check('dirt normalizes: whole numbers 0 to 100 for each kind, anything else is clean', () => {
  const dirtOf = dirt => withHeliFields({dirt}).dirt;
  assert.deepEqual(dirtOf({dust: 100, mud: 0, soot: 55, salt: 1}), {dust: 100, mud: 0, soot: 55, salt: 1});
  assert.deepEqual(dirtOf({dust: 250, mud: -4, soot: 2 ** 40, salt: 100}), {dust: 100, mud: 0, soot: 100, salt: 100}, 'clamped to the range');
  assert.deepEqual(dirtOf({dust: 1.5, mud: '30', soot: NaN, salt: Infinity}), {dust: 0, mud: 0, soot: 0, salt: 0}, 'a fraction, text or a non-number is clean');
  assert.deepEqual(dirtOf({dust: null, mud: {}, soot: [3], salt: true}), {dust: 0, mud: 0, soot: 0, salt: 0});
  assert.deepEqual(dirtOf({}), {dust: 0, mud: 0, soot: 0, salt: 0});
  assert.deepEqual(dirtOf({dust: 5, grime: 90, mud: 6}), {dust: 5, mud: 6, soot: 0, salt: 0}, 'always the four kinds in order; an unknown kind is dropped');
  assert.deepEqual(Object.keys(dirtOf({salt: 1, soot: 2, mud: 3, dust: 4})), ['dust', 'mud', 'soot', 'salt']);
});

check('the survey and the H3 counts normalize', () => {
  const surveyOf = survey => withHeliFields({survey}).survey;
  assert.deepEqual(surveyOf({day: 14, done: true}), {day: 14, done: true});
  assert.deepEqual(surveyOf({day: 3}), {day: 3, done: false});
  assert.deepEqual(surveyOf({day: -2, done: 'yes'}), {day: 0, done: false});
  assert.deepEqual(surveyOf({day: 2 ** 40, done: 1}), {day: 1_000_000, done: false});
  assert.deepEqual(surveyOf({day: 1.5, done: true, taken: 'x'}), {day: 0, done: true});
  assert.deepEqual(surveyOf({}), {day: 0, done: false});
  const counts = missions => withMissions({seed: 1, ...missions});
  const both = counts({wildlifeCounts: 5, cameraFlights: 2});
  assert.deepEqual([both.wildlifeCounts, both.cameraFlights], [5, 2]);
  assert.deepEqual([counts({wildlifeCounts: -3}).wildlifeCounts, counts({wildlifeCounts: 2 ** 40}).wildlifeCounts], [0, 1_000_000], 'clamped to 0 to 1,000,000');
  for (const bad of [1.5, '3', null, NaN, Infinity, {}, [2], true]) {
    const stored = counts({wildlifeCounts: bad, cameraFlights: bad});
    for (const field of WILDLIFE_COUNTS) assert.equal(Object.hasOwn(stored, field), false, field + ' ' + String(bad));
  }
  const stored = counts({wildlifeCounts: 4, hoists: 2});
  assert.deepEqual(Object.keys(stored).slice(-2), ['hoists', 'wildlifeCounts'], 'the new counts follow the older fields');
  assert.deepEqual(withMissions(stored), stored, 'normalizing twice changes nothing');
});

check('wrong-type H3 fields never throw, never wipe other progress, and the helpers still work on them', () => {
  for (const bad of ['x', 7, null, [], [1], true, NaN]) {
    const heli = withHeliFields({fuelKg: 60, refuels: 4, flights: 9, missions: {seed: 9, count: 5, badges: ['rescue']}, skins: bad, dirt: bad, survey: bad});
    assert.deepEqual([heli.fuelKg, heli.refuels, heli.flights, heli.missions.seed, heli.missions.count, heli.missions.badges], [60, 4, 9, 9, 5, ['rescue']], String(bad));
    for (const field of ['skins', 'dirt', 'survey']) assert.equal(Object.hasOwn(heli, field), false, field + ' ' + String(bad));
  }
  const profile = withHeli({skins: {owned: ['fire'], worn: 'fire', fresh: []}, dirt: {dust: 5, mud: 0, soot: 0, salt: 0}, survey: {day: 1, done: false}});
  assert.equal(notePlayDay(profile, '2026-12-01', on).ok, true);
  const fuelled = setFuel(profile, 10, on);
  assert.equal(fuelled.ok, true);
  assert.deepEqual(heliOf(fuelled.profile).skins, {owned: ['fire'], worn: 'fire', fresh: []}, 'other helpers keep the skins');
  assert.deepEqual(heliOf(fuelled.profile).dirt, {dust: 5, mud: 0, soot: 0, salt: 0});
});

check('H3 counts stored through the engine record keep the rest of the profile', () => {
  const missions = {...createMissions(), seed: 4, wildlifeCounts: 5, cameraFlights: 0};
  const stored = setMissions(withHeli({fuelKg: 80, flights: 3, skins: {owned: ['wildlife'], worn: 'stock', fresh: ['wildlife']}}), missions, on);
  assert.deepEqual(missionsOf(stored.profile), missions);
  assert.deepEqual([heliOf(stored.profile).fuelKg, heliOf(stored.profile).flights, stored.profile.credits], [80, 3, 1000]);
  assert.deepEqual(heliOf(stored.profile).skins, {owned: ['wildlife'], worn: 'stock', fresh: ['wildlife']});
});

check('keys from a newer game are still kept, and a known H3 field that fails its checks is never copied as it came', () => {
  const heli = withHeliFields({future: {a: 1}, skins: {owned: ['fire', 'bogus'], worn: 'bogus', fresh: ['bogus'], mood: 'x'}, dirt: {dust: 400, junk: 1}});
  assert.deepEqual(heli.future, {a: 1});
  assert.deepEqual(heli.skins, {owned: ['fire'], worn: 'stock', fresh: []});
  assert.deepEqual(heli.dirt, {dust: 100, mud: 0, soot: 0, salt: 0});
});

check('return loads normalize, round trip and keep old saves and unknown keys', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/saves/10-heli.json', import.meta.url), 'utf8'));
  const old = loadPlayers(memoryStorage(fixture.storage));
  assert.equal(old.players[0].profile.heli.returnLoads, undefined);
  assert.equal(old.players[0].profile.credits, 700);
  const source = deepFreeze({...old.players[0].profile.heli, future: {kept: true},
    returnLoads: {'tremblant-snow': 3, 'panorama-ridge': 2, 'tremblant-woods': 3, nowhere: 3, 'summit-run': -1}});
  const heli = normalizeHeli(source);
  assert.deepEqual(heli.returnLoads, {'tremblant-snow': 3, 'panorama-ridge': 2});
  assert.deepEqual(heli.future, {kept: true});
  assert.deepEqual(normalizeHeli(JSON.parse(JSON.stringify(heli))), heli);
  assert.equal(normalizeHeli({...heli, returnLoads: []}).returnLoads, undefined);
  const storage = memoryStorage();
  saveProfile({...old.players[0].profile, heli}, storage);
  assert.deepEqual(loadProfile(storage).heli.returnLoads, heli.returnLoads);
  assert.equal(source.returnLoads['summit-run'], -1, 'normalization never mutates source');
});

console.log(`Heli save: ${checks} groups passed using memory storage.`);
