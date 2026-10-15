import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createProfile, normalizeProfile, loadProfile, saveProfile, loadPlayers, PLAYERS_KEY} from '../src/progression.js';
import {HELI_SAVE_VERSION, HELI_MONEY, HELI_LESSONS, createHeli, normalizeHeli, heliOf, buyFuel, setFuel,
  chargeRepair, repairCost, fuelTruck, notePlayDay, finishLesson, placeCar, carAt, countFlight,
  takeJob, dropJob, finishJob} from '../src/heli/heli-save.js';

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
    refuels: 2, flights: 9, unknown: 'dropped'});
  assert.deepEqual(heli, {version: 1, fuelKg: 123.5, lessons: {liftoff: true, hover: false, landing: false, carry: true},
    playDay: {last: '2026-10-14', count: 5}, jobs: {day: 12, taken: 'job:a-1', done: ['a', 'b', 'c']},
    carsAt: {koenigsegg_jesko: 'panorama-ridge', falcone_f42: 'tremblant-woods'}, refuels: 2, flights: 9});
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

console.log(`Heli save: ${checks} groups passed using memory storage.`);
