import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHeli, heliOf, normalizeHeli, skiOf, recordRun, findStash, SKI_RUNS, SKI_STASHES, SKI_MONEY} from '../src/heli/heli-save.js';
import {loadProfile, saveProfile, createProfile, normalizeProfile} from '../src/progression.js';
import {skiZone, SKI_RUN_IDS, medalLimits} from '../src/ski/runs/summit-zones.js';
import {RUN_KINDS, timedMedal, judgedMedal, medalTimes, SCORE} from '../src/ski/ski-score.js';
import {zoneGuide} from '../src/ski/runs/summit-zones.js';

// docs/HELI_SKIING.md sections 7 and 9: the best runs, medals, stashes and what they pay, in profile.heli.ski.
const ON = {enabled: true};
const rich = (credits = 1000, extra = {}) => ({...createProfile(), credits, ...extra});
const emptySki = () => ({version: 1, best: {}, medal: {}, paid: {}, stashes: []});

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); for (const item of Object.values(value)) deepFreeze(item); }
  return value;
}
function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]));
  return {get length() { return values.size; }, key: index => [...values.keys()][index] ?? null, getItem: key => values.get(String(key)) ?? null,
    setItem: (key, value) => values.set(String(key), String(value)), removeItem: key => values.delete(String(key)), clear: () => values.clear()};
}

test('the rules match the design and the ski zones: five runs, 150 + 150 + 200 for medals, 100 a stash, the zone\'s three stashes', () => {
  assert.deepEqual([...SKI_RUNS], SKI_RUN_IDS);
  assert.deepEqual([...SKI_MONEY.medalTotal], [0, 150, 300, 500]);
  assert.equal(SKI_MONEY.stash, 100);
  assert.deepEqual([...SKI_STASHES].sort(), skiZone('powder').stashes.map(stash => stash.id).sort(), 'the stash names are the powder zone\'s own');
  // Four runs give a medal and one is free: the save agrees with the scoring.
  assert.deepEqual(SKI_RUNS.filter(run => RUN_KINDS[run] !== 'free'), ['slalom', 'gs', 'moguls', 'aerials']);
  assert.equal(SKI_RUNS.filter(run => RUN_KINDS[run] !== 'free').length * SKI_MONEY.medalTotal[3], 2000);
  assert.equal(RUN_KINDS.powder, 'free');
  const sheet = readFileSync(fileURLToPath(new URL('../docs/HELI_SKIING.md', import.meta.url)), 'utf8');
  assert.ok(/150, then 150 more for silver, then 200 more for gold \(500 in all per run\)/.test(sheet), 'the design says the same pay');
  assert.ok(sheet.includes('| Each powder stash found | 100 |'));
});

test('old saves read as nothing skied, and reading never adds a ski record', () => {
  const dir = new URL('./fixtures/saves/', import.meta.url);
  let read = 0;
  for (const file of readdirSync(fileURLToPath(dir)).filter(name => name.endsWith('.json'))) {
    const fixture = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
    const registry = fixture.storage['the-duel-players-v2'];
    for (const player of registry?.players ?? []) {
      if (!player.profile.heli || Object.hasOwn(player.profile.heli, 'ski')) continue;
      const heli = normalizeHeli(player.profile.heli);
      assert.equal(Object.hasOwn(heli, 'ski'), false, `${file}/${player.id}: none appears`);
      assert.deepEqual(skiOf(player.profile), emptySki());
      read++;
    }
  }
  assert.ok(read >= 6, `${read} older helicopters read`);
  assert.deepEqual(skiOf(undefined), emptySki()); assert.deepEqual(skiOf({}), emptySki()); assert.deepEqual(skiOf({heli: 'junk'}), emptySki());
  assert.equal(Object.hasOwn(createHeli(), 'ski'), false);
  assert.equal(Object.hasOwn(heliOf(rich()), 'ski'), false);
});

test('a medal pays once, and only the difference up to it: 150, 150 more, 200 more', () => {
  let profile = deepFreeze(rich(1000));
  const bronze = recordRun(profile, 'slalom', {time: 28.5, medal: 1}, ON);
  assert.equal(bronze.ok, true); assert.equal(bronze.paid, 150); assert.equal(bronze.profile.credits, 1150); assert.equal(bronze.raised, true);
  const again = recordRun(bronze.profile, 'slalom', {time: 28.4, medal: 1}, ON);
  assert.equal(again.paid, 0, 'bronze again pays nothing'); assert.equal(again.profile.credits, 1150); assert.equal(again.improved, true, 'but the better time is kept');
  const silver = recordRun(again.profile, 'slalom', {time: 26, medal: 2}, ON);
  assert.equal(silver.paid, 150); assert.equal(silver.profile.credits, 1300);
  const gold = recordRun(silver.profile, 'slalom', {time: 24, medal: 3}, ON);
  assert.equal(gold.paid, 200); assert.equal(gold.profile.credits, 1500);
  const worse = recordRun(gold.profile, 'slalom', {time: 30, medal: 1}, ON);
  assert.equal(worse.paid, 0); assert.equal(worse.raised, false); assert.equal(worse.improved, false);
  assert.equal(worse.profile.credits, 1500); assert.deepEqual(skiOf(worse.profile), {...emptySki(), best: {slalom: 24}, medal: {slalom: 3}, paid: {slalom: 3}});
  assert.equal(recordRun(worse.profile, 'slalom', {time: 23, medal: 3}, ON).paid, 0, 'gold again pays nothing');
  // Straight to gold pays all 500 at once, once.
  const direct = recordRun(deepFreeze(rich(0)), 'gs', {time: 70, medal: 3}, ON);
  assert.equal(direct.paid, 500); assert.equal(direct.profile.credits, 500);
  assert.equal(recordRun(direct.profile, 'gs', {time: 69, medal: 3}, ON).paid, 0);
  // Each run pays on its own; the four runs together pay 2,000.
  let total = rich(0);
  for (const [run, result] of [['slalom', {time: 24, medal: 3}], ['gs', {time: 70, medal: 3}], ['moguls', {points: 85, medal: 3}], ['aerials', {points: 82, medal: 3}]]) {
    const out = recordRun(total, run, result, ON); assert.equal(out.paid, 500, run); total = out.profile;
  }
  assert.equal(total.credits, 2000);
  // No medal: the finish is kept as the best and nothing is paid.
  const none = recordRun(rich(7), 'slalom', {time: 40, medal: 0}, ON);
  assert.equal(none.paid, 0); assert.equal(none.profile.credits, 7); assert.deepEqual(skiOf(none.profile).best, {slalom: 40}); assert.deepEqual(skiOf(none.profile).medal, {});
});

test('the best is the lowest time on a timed run and the highest score on a judged one, kept to a hundredth and a tenth', () => {
  let profile = rich();
  for (const time of [30.004, 29.994, 31, 29.991]) profile = recordRun(profile, 'slalom', {time, medal: 0}, ON).profile;
  assert.equal(skiOf(profile).best.slalom, 29.99, 'the best time, 29.994 read to a hundredth, and 29.991 is not better');
  for (const points of [55.04, 71.26, 60, 71.2]) profile = recordRun(profile, 'moguls', {points, medal: 0}, ON).profile;
  assert.equal(skiOf(profile).best.moguls, 71.3, 'the best score, 71.26 read to a tenth');
  const same = recordRun(profile, 'moguls', {points: 71.3, medal: 0}, ON);
  assert.equal(same.improved, false, 'an equal score is not an improvement');
  const zero = recordRun(rich(), 'moguls', {points: 0, medal: 0}, ON);
  assert.equal(zero.ok, true); assert.deepEqual(skiOf(zero.profile).best, {}, 'a zero score is not stored as a best');
});

test('a stash pays 100 once, for each of the three, and nothing else is a stash', () => {
  let profile = deepFreeze(rich(50));
  const first = findStash(profile, 'north-shelf', ON);
  assert.equal(first.found, true); assert.equal(first.paid, 100); assert.equal(first.profile.credits, 150);
  const second = findStash(first.profile, 'north-shelf', ON);
  assert.equal(second.found, false); assert.equal(second.paid, 0); assert.equal(second.profile, first.profile);
  profile = first.profile;
  for (const id of ['ridge-pocket', 'lower-meadow']) profile = findStash(profile, id, ON).profile;
  assert.equal(profile.credits, 350); assert.deepEqual(skiOf(profile).stashes, ['north-shelf', 'ridge-pocket', 'lower-meadow']);
  for (const junk of ['stash-4', '', '__proto__', 'constructor', undefined, null, 7, {}, ['north-shelf'], 'tremblant-bowl']) {
    const out = findStash(profile, junk, ON);
    assert.equal(out.ok, false, String(junk)); assert.equal(out.profile, profile);
  }
});

test('with the switch off nothing is recorded and nothing is paid', () => {
  const profile = deepFreeze(rich(100));
  for (const options of [{}, {enabled: false}, {enabled: 'yes'}, {enabled: 1}, undefined]) {
    const run = recordRun(profile, 'slalom', {time: 24, medal: 3}, options), stash = findStash(profile, 'north-shelf', options);
    assert.equal(run.ok, false); assert.equal(run.profile, profile); assert.equal(stash.ok, false); assert.equal(stash.profile, profile);
  }
  assert.equal(Object.hasOwn(profile, 'heli'), false);
});

test('the medals the ski rules give are the ones that pay: guide times and judged points', () => {
  const guide = zoneGuide('slalom').time, limits = medalTimes(guide);
  let profile = rich(0);
  for (const [time, medal, paid] of [[limits.bronze, 1, 150], [limits.silver, 2, 150], [limits.gold, 3, 200]]) {
    assert.equal(timedMedal(time, guide), medal);
    const out = recordRun(profile, 'slalom', {time, medal: timedMedal(time, guide)}, ON);
    assert.equal(out.paid, paid, `medal ${medal}`); profile = out.profile;
  }
  assert.equal(profile.credits, 500);
  assert.deepEqual([50, 65, 80].map(points => judgedMedal(points)), [1, 2, 3]);
  assert.deepEqual(medalLimits('aerials'), {kind: 'points', ...SCORE.judgedMedals});
  let judged = rich(0);
  for (const points of [50, 65, 80]) judged = recordRun(judged, 'aerials', {points, medal: judgedMedal(points)}, ON).profile;
  assert.equal(judged.credits, 500);
});

test('a result that is not a result is refused, and powder has none', () => {
  const profile = deepFreeze(rich(10));
  const bad = [undefined, null, 7, 'x', [], {}, {time: 24}, {medal: 3}, {time: NaN, medal: 1}, {time: Infinity, medal: 1}, {time: -1, medal: 1}, {time: 0, medal: 1},
    {time: '24', medal: 1}, {time: 24, medal: 4}, {time: 24, medal: -1}, {time: 24, medal: 1.5}, {time: 24, medal: '3'}, {time: 24, medal: NaN}, {time: 2e6, medal: 1}, {points: 50, medal: 1}];
  for (const result of bad) {
    const out = recordRun(profile, 'slalom', result, ON);
    assert.equal(out.ok, false, JSON.stringify(result)); assert.equal(out.profile, profile);
  }
  assert.equal(recordRun(profile, 'moguls', {time: 24, medal: 1}, ON).ok, false, 'a judged run wants points');
  for (const run of ['powder', 'tremblant-slalom', '', '__proto__', 'constructor', undefined, null, 4]) {
    const out = recordRun(profile, run, {time: 24, points: 80, medal: 3}, ON);
    assert.equal(out.ok, false, String(run)); assert.equal(out.profile, profile);
  }
  assert.equal(profile.credits, 10);
});

test('credits stop at the save\'s cap, and a bad wallet reads as nothing', () => {
  const near = recordRun(rich(999_999_900), 'gs', {time: 70, medal: 3}, ON);
  assert.equal(near.profile.credits, 1_000_000_000); assert.equal(near.paid, 500, 'the medal is still marked paid');
  assert.equal(skiOf(near.profile).paid.gs, 3);
  const junk = recordRun({credits: 'lots'}, 'gs', {time: 70, medal: 1}, ON);
  assert.equal(junk.profile.credits, 150);
  const stash = findStash({credits: -5}, 'north-shelf', ON);
  assert.equal(stash.profile.credits, 100);
});

test('whatever is stored, the ski record reads lawfully, the same twice, and keeps what a later game wrote', () => {
  const heliWith = ski => ({version: 1, ski});
  const read = ski => heliOf({heli: heliWith(ski)}).ski;
  assert.equal(read(undefined), undefined); assert.equal(read(null), undefined); assert.equal(read('junk'), undefined); assert.equal(read([]), undefined);
  assert.equal(read({}), undefined, 'a record with no version is not read');
  assert.equal(read({version: 0}), undefined);
  assert.equal(read({version: 1.5}), undefined);
  const messy = read({version: 1,
    best: {slalom: 24.3456, gs: -3, moguls: 'fast', aerials: NaN, powder: Infinity, 'Bad Name': 5, '__proto__': 7, tremblant: 19.256, huge: 9e9, zero: 0},
    medal: {slalom: 2, gs: 7, moguls: 1.5, aerials: '3', tremblant: 1, zero: 0, '': 2},
    paid: {slalom: 3, gs: 0, aerials: -1, extra: 2, tremblant: 1},
    stashes: ['north-shelf', 'north-shelf', 'Bad Name', 3, null, 'tremblant-bowl', '__proto__'],
    note: {kept: true}, __proto__: {polluted: true}});
  assert.deepEqual(messy, {version: 1, best: {slalom: 24.35, tremblant: 19.26}, medal: {slalom: 3, extra: 2, tremblant: 1}, paid: {slalom: 3, extra: 2, tremblant: 1},
    stashes: ['north-shelf', 'tremblant-bowl'], note: {kept: true}}, 'a paid medal was earned, bad numbers and names are dropped, a later game\'s key is kept');
  assert.equal({}.polluted, undefined);
  assert.deepEqual(heliOf({heli: heliWith(messy)}).ski, messy, 'reading it again changes nothing');
  assert.equal(Object.keys(read({version: 1, best: Object.fromEntries(Array.from({length: 200}, (_, index) => [`run-${index}`, 20 + index]))}).best).length, 64, 'a flood of names is cut');
  // A function, a symbol or a cycle inside a kept key never throws.
  const cycle = {}; cycle.self = cycle;
  assert.doesNotThrow(() => read({version: 1, later: () => 1, other: cycle, sym: Symbol('x')}));
});

test('a later game\'s ski record is left exactly as it is, and nothing here writes over it', () => {
  const later = {version: 2, runs: {slalom: {bestMs: 24310, medal: 'silver'}}, extra: [1, 2, {deep: true}]};
  const profile = deepFreeze({...rich(500), heli: {...createHeli(), ski: later}});
  assert.deepEqual(heliOf(profile).ski, later, 'kept exactly');
  assert.deepEqual(skiOf(profile), emptySki(), 'this game reads nothing from it');
  for (const out of [recordRun(profile, 'slalom', {time: 24, medal: 3}, ON), findStash(profile, 'north-shelf', ON)]) {
    assert.equal(out.ok, false); assert.equal(out.profile, profile); assert.match(out.reason, /another version/);
  }
  // A later game's whole helicopter is refused too: the helicopter reader treats it as empty, so a write would have replaced it.
  const newer = deepFreeze({...rich(500), heli: {version: 2, fuelKg: 99, ski: {version: 1, best: {slalom: 20}}}});
  for (const out of [recordRun(newer, 'slalom', {time: 24, medal: 3}, ON), findStash(newer, 'north-shelf', ON)]) {
    assert.equal(out.ok, false); assert.equal(out.profile, newer); assert.match(out.reason, /another version/);
  }
  // A damaged helicopter (not a version this game could be behind) is simply started again.
  const damaged = recordRun({...rich(0), heli: {version: 0}}, 'gs', {time: 70, medal: 1}, ON);
  assert.equal(damaged.ok, true); assert.equal(damaged.profile.heli.version, 1);
  const noHeli = recordRun(rich(0), 'gs', {time: 70, medal: 1}, ON);
  assert.equal(noHeli.ok, true); assert.deepEqual({...noHeli.profile.heli, ski: undefined}, {...createHeli(), ski: undefined}, 'a new helicopter with only the ski record added');
});

test('the record survives the profile\'s own save and load, and recording never changes the rest of the helicopter', () => {
  const start = rich(300);
  const flown = {...start, heli: {...createHeli(), fuelKg: 120.5, lessons: {liftoff: true, hover: true, landing: true, carry: true}, flights: 9, refuels: 3, burnt: {}}};
  let profile = recordRun(flown, 'slalom', {time: 24.31, medal: 2}, ON).profile;
  profile = findStash(profile, 'ridge-pocket', ON).profile;
  const {ski, ...rest} = profile.heli;
  assert.deepEqual(rest, flown.heli, 'every other helicopter field is as it was');
  assert.equal(profile.credits, 300 + 300 + 100);
  const storage = memoryStorage();
  assert.ok(saveProfile(profile, storage));
  const loaded = loadProfile(storage);
  assert.deepEqual(loaded.heli.ski, ski, 'the same record comes back');
  assert.equal(loaded.credits, profile.credits);
  assert.deepEqual(normalizeProfile(loaded).heli.ski, ski, 'and again');
  // Saved and loaded again, the pay is not paid twice.
  assert.equal(recordRun(loaded, 'slalom', {time: 24.31, medal: 2}, ON).paid, 0);
  assert.equal(findStash(loaded, 'ridge-pocket', ON).paid, 0);
});

test('recording and finding never change the profile they were given', () => {
  const profile = deepFreeze({...rich(100), heli: {...createHeli(), ski: {version: 1, best: {slalom: 25}, medal: {slalom: 1}, paid: {slalom: 1}, stashes: ['north-shelf']}}});
  const before = JSON.stringify(profile);
  recordRun(profile, 'slalom', {time: 20, medal: 3}, ON); findStash(profile, 'lower-meadow', ON); recordRun(profile, 'gs', {time: 70, medal: 1}, ON);
  assert.equal(JSON.stringify(profile), before);
});
