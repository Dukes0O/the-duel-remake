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

test('the rules match the design and the ski zones: five runs, 1,050 + 1,050 + 1,400 for medals, 700 a stash, the zone\'s three stashes', () => {
  assert.deepEqual([...SKI_RUNS], SKI_RUN_IDS);
  assert.deepEqual([...SKI_MONEY.medalTotal], [0, 1050, 2100, 3500]); // HELI-PAY-CONTINUE: was 0, 150, 300, 500
  assert.equal(SKI_MONEY.stash, 700);
  assert.deepEqual([...SKI_STASHES].sort(), skiZone('powder').stashes.map(stash => stash.id).sort(), 'the stash names are the powder zone\'s own');
  // Four runs give a medal and one is free: the save agrees with the scoring.
  assert.deepEqual(SKI_RUNS.filter(run => RUN_KINDS[run] !== 'free'), ['slalom', 'gs', 'moguls', 'aerials']);
  assert.equal(SKI_RUNS.filter(run => RUN_KINDS[run] !== 'free').length * SKI_MONEY.medalTotal[3], 14000);
  assert.equal(RUN_KINDS.powder, 'free');
  const sheet = readFileSync(fileURLToPath(new URL('../docs/HELI_SKIING.md', import.meta.url)), 'utf8');
  assert.ok(/1,050, then 1,050 more for silver, then 1,400 more for gold \(3,500 in all per run\)/.test(sheet), 'the design says the same pay');
  assert.ok(sheet.includes('| Each powder stash found | 700 |'));
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

test('a medal pays once, and only the difference up to it: 1,050, 1,050 more, 1,400 more', () => {
  let profile = deepFreeze(rich(1000));
  const bronze = recordRun(profile, 'slalom', {time: 28.5, medal: 1}, ON);
  assert.equal(bronze.ok, true); assert.equal(bronze.paid, 1050); assert.equal(bronze.profile.credits, 2050); assert.equal(bronze.raised, true);
  const again = recordRun(bronze.profile, 'slalom', {time: 28.4, medal: 1}, ON);
  assert.equal(again.paid, 0, 'bronze again pays nothing'); assert.equal(again.profile.credits, 2050); assert.equal(again.improved, true, 'but the better time is kept');
  const silver = recordRun(again.profile, 'slalom', {time: 26, medal: 2}, ON);
  assert.equal(silver.paid, 1050); assert.equal(silver.profile.credits, 3100);
  const gold = recordRun(silver.profile, 'slalom', {time: 24, medal: 3}, ON);
  assert.equal(gold.paid, 1400); assert.equal(gold.profile.credits, 4500);
  const worse = recordRun(gold.profile, 'slalom', {time: 30, medal: 1}, ON);
  assert.equal(worse.paid, 0); assert.equal(worse.raised, false); assert.equal(worse.improved, false);
  assert.equal(worse.profile.credits, 4500); assert.deepEqual(skiOf(worse.profile), {...emptySki(), best: {slalom: 24}, medal: {slalom: 3}, paid: {slalom: 3}});
  assert.equal(recordRun(worse.profile, 'slalom', {time: 23, medal: 3}, ON).paid, 0, 'gold again pays nothing');
  // Straight to gold pays all 3,500 at once, once.
  const direct = recordRun(deepFreeze(rich(0)), 'gs', {time: 70, medal: 3}, ON);
  assert.equal(direct.paid, 3500); assert.equal(direct.profile.credits, 3500);
  assert.equal(recordRun(direct.profile, 'gs', {time: 69, medal: 3}, ON).paid, 0);
  // Each run pays on its own; the four runs together pay 14,000.
  let total = rich(0);
  for (const [run, result] of [['slalom', {time: 24, medal: 3}], ['gs', {time: 70, medal: 3}], ['moguls', {points: 85, medal: 3}], ['aerials', {points: 82, medal: 3}]]) {
    const out = recordRun(total, run, result, ON); assert.equal(out.paid, 3500, run); total = out.profile;
  }
  assert.equal(total.credits, 14000);
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

test('a stash pays 700 once, for each of the three, and nothing else is a stash', () => {
  let profile = deepFreeze(rich(50));
  const first = findStash(profile, 'north-shelf', ON);
  assert.equal(first.found, true); assert.equal(first.paid, 700); assert.equal(first.profile.credits, 750);
  const second = findStash(first.profile, 'north-shelf', ON);
  assert.equal(second.found, false); assert.equal(second.paid, 0); assert.equal(second.profile, first.profile);
  profile = first.profile;
  for (const id of ['ridge-pocket', 'lower-meadow']) profile = findStash(profile, id, ON).profile;
  assert.equal(profile.credits, 2150); assert.deepEqual(skiOf(profile).stashes, ['north-shelf', 'ridge-pocket', 'lower-meadow']);
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
  for (const [time, medal, paid] of [[limits.bronze, 1, 1050], [limits.silver, 2, 1050], [limits.gold, 3, 1400]]) {
    assert.equal(timedMedal(time, guide), medal);
    const out = recordRun(profile, 'slalom', {time, medal: timedMedal(time, guide)}, ON);
    assert.equal(out.paid, paid, `medal ${medal}`); profile = out.profile;
  }
  assert.equal(profile.credits, 3500);
  assert.deepEqual([50, 65, 80].map(points => judgedMedal(points)), [1, 2, 3]);
  assert.deepEqual(medalLimits('aerials'), {kind: 'points', ...SCORE.judgedMedals});
  let judged = rich(0);
  for (const points of [50, 65, 80]) judged = recordRun(judged, 'aerials', {points, medal: judgedMedal(points)}, ON).profile;
  assert.equal(judged.credits, 3500);
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
  assert.equal(near.profile.credits, 1_000_000_000); assert.equal(near.paid, 3500, 'the medal is still marked paid');
  assert.equal(skiOf(near.profile).paid.gs, 3);
  const junk = recordRun({credits: 'lots'}, 'gs', {time: 70, medal: 1}, ON);
  assert.equal(junk.profile.credits, 1050);
  const stash = findStash({credits: -5}, 'north-shelf', ON);
  assert.equal(stash.profile.credits, 700);
});

test('whatever is stored, the ski record reads lawfully, the same twice, and keeps what a later game wrote', () => {
  const heliWith = ski => ({version: 1, ski});
  const read = ski => heliOf({heli: heliWith(ski)}).ski;
  assert.equal(read(undefined), undefined); assert.equal(read(null), undefined); assert.equal(read('junk'), undefined); assert.equal(read([]), undefined);
  assert.equal(read({}), undefined, 'a record with no version is not read');
  assert.equal(read({version: 0}), undefined);
  assert.equal(read({version: 0.5}), undefined);
  assert.deepEqual(read({version: 1.5}), {version: 1.5}, 'a fractional later version is a later version');
  const messy = read(JSON.parse(`{"version": 1,
    "best": {"slalom": 24.3456, "gs": -3, "moguls": "fast", "aerials": null, "powder": 1e999, "Bad Name": 5, "__proto__": 7, "tremblant": 19.256, "huge": 9e9, "zero": 0, "tiny": 0.004},
    "medal": {"slalom": 2, "gs": 7, "moguls": 1.5, "aerials": "3", "tremblant": 1, "zero": 0, "": 2},
    "paid": {"slalom": 3, "gs": 0, "aerials": -1, "extra": 2, "tremblant": 1, "__proto__": 3},
    "stashes": ["north-shelf", "north-shelf", "Bad Name", 3, null, "tremblant-bowl", "__proto__"],
    "note": {"kept": true}, "__proto__": {"polluted": true}}`));
  assert.deepEqual(messy, {version: 1, best: {slalom: 24.35, tremblant: 19.26}, medal: {slalom: 3, extra: 2, tremblant: 1}, paid: {slalom: 3, extra: 2, tremblant: 1},
    stashes: ['north-shelf', 'tremblant-bowl'], note: {kept: true}}, 'a paid medal was earned, bad numbers and names are dropped, a later game\'s key is kept');
  assert.equal({}.polluted, undefined);
  assert.equal(Object.hasOwn(messy, '__proto__'), false, 'a stored __proto__ key is not carried');
  assert.deepEqual(heliOf({heli: heliWith(messy)}).ski, messy, 'reading it again changes nothing');
  const flood = prefix => Object.fromEntries(Array.from({length: 200}, (_, index) => [`${prefix}-${index}`, 20 + index]));
  assert.equal(Object.keys(read({version: 1, best: flood('run')}).best).length, 64, 'a flood of names is cut');
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
  assert.equal(profile.credits, 300 + 2100 + 700);
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

test('a flood of a later game\'s names never displaces ours, so nothing pays twice', () => {
  const foreign = (prefix, value) => Object.fromEntries(Array.from({length: 100}, (_, index) => [`${prefix}${index}`, value]));
  const full = {version: 1, best: foreign('later-', 30), medal: foreign('later-', 1), paid: {...foreign('', 1), ...foreign('later-', 1)},
    stashes: Array.from({length: 100}, (_, index) => `later-${index}`)};
  let profile = deepFreeze({...rich(0), heli: {...createHeli(), ski: full}});
  for (let round = 0; round < 3; round++) {
    const gold = recordRun(profile, 'slalom', {time: 20, medal: 3}, ON), stash = findStash(gold.profile, 'north-shelf', ON);
    assert.equal(gold.paid, round === 0 ? 3500 : 0, `round ${round}: gold pays once`);
    assert.equal(stash.paid, round === 0 ? 700 : 0, `round ${round}: the stash pays once`);
    profile = deepFreeze(JSON.parse(JSON.stringify(stash.profile)));
  }
  const ski = skiOf(profile);
  assert.equal(ski.paid.slalom, 3); assert.equal(ski.medal.slalom, 3); assert.ok(ski.stashes.includes('north-shelf')); assert.equal(ski.best.slalom, 20);
  assert.equal(Object.keys(ski.paid).filter(name => name !== 'slalom').length, 64, 'only the later game\'s names are capped');
  assert.equal(profile.credits, 4200);
});

test('a later version written as text or a fraction is still a later version, and a record that cannot be copied is not dropped', () => {
  for (const version of ['2', 2.5, 1e30, Infinity, 2n ** 60n]) {
    const later = {version, runs: {slalom: 'silver'}};
    const profile = deepFreeze({...rich(100), heli: {...createHeli(), ski: later}});
    assert.equal(heliOf(profile).ski.version, version, String(version));
    const out = recordRun(profile, 'slalom', {time: 24, medal: 3}, ON);
    assert.equal(out.ok, false); assert.equal(out.profile, profile);
  }
  const shared = {version: 3, fn: () => 1};
  const kept = normalizeHeli({version: 1, ski: shared}).ski;
  assert.ok(kept && kept.version === 3, 'a record structuredClone refuses is kept, not dropped');
  const stuck = {...rich(100), heli: {...createHeli(), ski: shared}};
  assert.equal(recordRun(stuck, 'slalom', {time: 24, medal: 3}, ON).ok, false, 'and still blocks writes');
  // A later helicopter written as text is refused too.
  assert.equal(recordRun({...rich(0), heli: {version: '2'}}, 'slalom', {time: 24, medal: 3}, ON).ok, false);
  // Version 1 as text, zero or missing is a damaged record, read as nothing.
  for (const version of ['1', 0, -1, null, undefined, true]) assert.equal(heliOf({heli: {version: 1, ski: {version, best: {slalom: 20}}}}).ski, undefined, String(version));
});

test('a tiny best that rounds to nothing is not stored, and reading is idempotent', () => {
  const once = heliOf({heli: {version: 1, ski: {version: 1, best: {slalom: 0.004, moguls: 0.04, gs: 70.001}}}}).ski;
  assert.deepEqual(once.best, {gs: 70});
  assert.deepEqual(heliOf({heli: {version: 1, ski: once}}).ski, once);
  // A seeded fuzz: any record, read twice, reads the same.
  let seed = 12345;
  const next = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  const pick = list => list[Math.floor(next() * list.length)];
  const names = ['slalom', 'gs', 'moguls', 'aerials', 'powder', 'later-run', 'Bad', '', '__proto__'];
  const values = [0, 0.004, 0.04, 1, 1.5, 2, 3, 4, -1, 24.3456, 71.26, 1e9, 'x', null, NaN];
  for (let index = 0; index < 400; index++) {
    const map = () => Object.fromEntries(Array.from({length: Math.floor(next() * 5)}, () => [pick(names), pick(values)]));
    const record = {version: 1, best: map(), medal: map(), paid: map(), stashes: Array.from({length: Math.floor(next() * 4)}, () => pick([...names, 'north-shelf', 3]))};
    const read = heliOf({heli: {version: 1, ski: record}}).ski;
    assert.deepEqual(heliOf({heli: {version: 1, ski: read}}).ski, read, JSON.stringify(record));
  }
});
