import assert from 'node:assert/strict';
import { createTownStore, readTownPointer, saveTown, TOWN_POINTER_KEY } from '../src/town/town-store.js';
import { captureCareer, createCompleteCareerExport, importCareer, parseCareerExport, restoreCareerBackup } from '../src/career-backup.js';

function storage(initial = {}) {
  const rows = new Map(Object.entries(initial));
  return { get length() { return rows.size; }, key: i => [...rows.keys()][i] ?? null,
    getItem: key => rows.get(key) ?? null, setItem: (key, value) => rows.set(key, String(value)),
    removeItem: key => rows.delete(key) };
}
function clock(start) { let time = start; return { now: () => new Date(time), advance: days => { time += days * 86400000; } }; }
const emptyStore = () => createTownStore({ memoryOnly: true });
const old = storage({ 'the-duel-profile-v1': '{"version":1,"credits":7}', duel_graphics_quality: 'high' });
const oldBytes = captureCareer(old);
const noTownFile = JSON.stringify({ entries: oldBytes, townRecords: null });
assert.deepEqual(captureCareer(old), oldBytes, 'a career without a town keeps every saved byte');
assert.equal(old.getItem(TOWN_POINTER_KEY), null, 'reading a town does not create a career key');
assert.equal(readTownPointer(old).length, 0);
assert.equal(noTownFile.includes(TOWN_POINTER_KEY), false, 'old career data is unchanged without a town');

const timer = clock(Date.UTC(2026, 0, 1));
const memory = { towns: new Map(), copies: new Map() };
const store = createTownStore({ memoryOnly: true, memory, now: timer.now });
const first = { id: 'dry-town', version: 1, mayors: ['player-a'], year: 1, till: 0, people: [{ id: 'p1', name: 'Ada' }] };
await saveTown(first, { storage: old, store });
const townPointer = old.getItem(TOWN_POINTER_KEY);
timer.advance(30);
await saveTown({ ...first, year: 2, till: 3 }, { storage: old, store });
const newest = [...memory.copies.values()].sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0];
memory.copies.set(newest.id, { ...newest, town: '{broken' });
const restored = await store.load('dry-town');
assert.equal(restored.town.year, 1, 'a damaged newest copy falls back to the next good copy');
assert.match(restored.message, /latest town save was damaged/i, 'the player gets a plain damage message');

// Any failed town write finishes before the pointer or any other career byte changes.
const beforeFailure = captureCareer(old);
await assert.rejects(saveTown({ ...first, id: 'no-write' }, { storage: old,
  store: { save: async () => { throw new Error('town quota'); } } }), /town quota/);
assert.deepEqual(captureCareer(old), beforeFailure, 'town failure cannot change a career');
const flakyCopies = new Map();
flakyCopies.failNext = true;
const originalSet = flakyCopies.set.bind(flakyCopies);
flakyCopies.set = (key, value) => { if (flakyCopies.failNext) { flakyCopies.failNext = false; throw new Error('copy quota'); } return originalSet(key, value); };
const partialTownMemory = { towns: new Map(), copies: flakyCopies };
const partialTownStore = createTownStore({ memoryOnly: true, memory: partialTownMemory, now: timer.now });
const beforeAtomicFailure = captureCareer(old);
await assert.rejects(saveTown({ ...first, id: 'atomic-town' }, { storage: old, store: partialTownStore }), /copy quota/);
assert.equal(partialTownMemory.towns.has('atomic-town'), false, 'a failed rolling copy does not leave a partial town save');
assert.deepEqual(captureCareer(old), beforeAtomicFailure, 'a failed town transaction restores its career pointer');
const concurrentCareer = storage();
const queuedStore = { async save(town) {
  if (town.id === 'first-fails') { await new Promise(resolve => setTimeout(resolve, 5)); throw new Error('first save failed'); }
  return { id: town.id };
} };
const concurrent = await Promise.allSettled([
  saveTown({ ...first, id: 'first-fails' }, { storage: concurrentCareer, store: queuedStore }),
  saveTown({ ...first, id: 'second-succeeds' }, { storage: concurrentCareer, store: queuedStore }),
]);
assert.equal(concurrent[0].status, 'rejected');
assert.equal(concurrent[1].status, 'fulfilled');
assert.deepEqual(readTownPointer(concurrentCareer), ['second-succeeds'], 'a failed save cannot unlink a concurrent successful town');

const sourceTowns = createTownStore({ memoryOnly: true, memory: { towns: new Map([['dry-town', memory.towns.get('dry-town')]]), copies: new Map() } });
// Use the intact source record for export, then prove another isolated store imports it.
const intact = { id: 'dry-town', version: 1, mayors: ['player-a'], savedAt: timer.now().toISOString(), town: { ...first, year: 2, till: 3 } };
sourceTowns.install([intact]);
const bundle = await createCompleteCareerExport(old, undefined, () => new Date('2026-01-31T00:00:00Z'), sourceTowns);
const parsed = parseCareerExport(bundle);
assert.equal(parsed.townRecords[0].town.id, 'dry-town', 'complete export includes the town record');
const target = storage();
const targetTowns = emptyStore();
await targetTowns.save({ ...first, year: 99 });
const backupRows = new Map();
await importCareer(bundle, { storage: target, townStore: targetTowns, backupStore: {
  save: async record => backupRows.set(record.id, structuredClone(record)),
  load: async id => structuredClone(backupRows.get(id)),
} });
assert.equal((await targetTowns.load('dry-town')).town.year, 2, 'complete import restores the town');
assert.deepEqual(readTownPointer(target), ['dry-town'], 'complete import restores its career pointer');

const year30 = { id: 'soak-town', version: 1, mayors: ['player-a'], year: 30,
  people: Array.from({ length: 1800 }, (_, index) => ({ id: 'person-' + index, name: 'Person ' + index,
    born: index % 30, family: 'family-' + (index % 500), history: Array.from({ length: 5 }, (_, n) => ({ year: 25 + n, event: 'worked' })) })),
  buildings: Array.from({ length: 1200 }, (_, index) => ({ id: 'building-' + index, kind: 'shack', x: index % 100, z: Math.floor(index / 100), condition: 1 })),
  book: Array.from({ length: 360 }, (_, month) => ({ year: 1 + Math.floor(month / 12), month: month % 12 + 1, events: [] })) };
const year30Bytes = new TextEncoder().encode(JSON.stringify(year30)).length;
assert.ok(year30Bytes < 5 * 1024 * 1024, `Year 30 town is under 5 MB (${year30Bytes} bytes)`);
// Exercise every durable install boundary with a fresh store instance after the simulated crash.
for (const stopAt of ['replacement-written', 'copies-removed']) {
  const durable = { towns: new Map(), copies: new Map() };
  const before = { ...intact, town: { ...first, id: 'crash-town', year: 4 } };
  before.id = 'crash-town'; before.town.id = 'crash-town';
  const after = { ...before, town: { ...before.town, year: 30 } };
  const seed = createTownStore({ memoryOnly: true, memory: durable });
  await seed.install([before]);
  await seed.save(before.town);
  const crashing = createTownStore({ memoryOnly: true, memory: durable, onInstallStep(step) {
    if (step === stopAt) throw new Error('simulated close');
  } });
  await assert.rejects(crashing.install([after]), /simulated close/);
  const reopened = createTownStore({ memoryOnly: true, memory: durable });
  const recovered = await reopened.load('crash-town');
  assert.equal(recovered.town.year, 4, stopAt + ': previous town comes back after reopening');
  assert.match(recovered.message, /previous town has been put back/i, stopAt + ': player is told recovery happened');
  assert.ok((await reopened.exportTown('crash-town')).includes('"year":4'), stopAt + ': real export has recovered town');
}
// A retry must keep the original town in the marker, not the first replacement.
{
  const durable = { towns: new Map(), copies: new Map() };
  const before = { ...intact, id: 'retry-town', town: { ...first, id: 'retry-town', year: 4 } };
  const after = { ...before, town: { ...before.town, year: 30 } };
  const seed = createTownStore({ memoryOnly: true, memory: durable });
  await seed.install([before]);
  const crashing = createTownStore({ memoryOnly: true, memory: durable, onInstallStep(step) { if (step === 'replacement-written') throw new Error('simulated close'); } });
  await assert.rejects(crashing.install([after]), /simulated close/);
  await assert.rejects(crashing.install([after]), /simulated close/);
  const reopened = createTownStore({ memoryOnly: true, memory: durable });
  assert.equal((await reopened.load('retry-town')).town.year, 4, 'a repeated interrupted restore retains the true original town');
}
// Career and town recovery agree at every durable restore boundary.
for (const stopAt of ['before-install', 'replacement-written', 'copies-removed', 'after-install', 'after-apply-entries', 'after-finish-recovery', 'rollback-after-apply']) {
  const durable = { towns: new Map(), copies: new Map() };
  const current = storage({ [TOWN_POINTER_KEY]: JSON.stringify({ version: 1, ids: ['career-town'] }) });
  const oldTown = { ...intact, id: 'career-town', town: { ...first, id: 'career-town', year: 4 } };
  const newTown = { ...oldTown, town: { ...oldTown.town, year: 30 } };
  const seed = createTownStore({ memoryOnly: true, memory: durable });
  await seed.install([newTown]);
  const backups = new Map([['restore-source', { id: 'restore-source', entries: {
    'the-duel-profile-v1': JSON.stringify({ version: 1, credits: 7 }),
    [TOWN_POINTER_KEY]: JSON.stringify({ version: 1, ids: ['career-town'] }),
  }, townRecords: [oldTown] }]]);
  const backupStore = { async load(id) { return structuredClone(backups.get(id)); }, async save(record) { backups.set(record.id, structuredClone(record)); } };
  const crashingStore = createTownStore({ memoryOnly: true, memory: durable, storage: current, onInstallStep(step) {
    if (step === stopAt) { const error = new Error('simulated close'); error.simulatedCrash = true; throw error; }
  } });
  const options = { storage: current, backupStore, townStore: crashingStore,
    onRestoreStep(step) { if (step === (stopAt === 'rollback-after-apply' ? 'after-apply-entries' : stopAt)) {
      const error = new Error(stopAt === 'rollback-after-apply' ? 'simulated failure' : 'simulated close');
      if (stopAt !== 'rollback-after-apply') error.simulatedCrash = true;
      throw error;
    } } };
  await assert.rejects(restoreCareerBackup('restore-source', options), stopAt === 'rollback-after-apply' ? /Career restore failed/ : /simulated close/);
  const reopened = createTownStore({ memoryOnly: true, memory: durable, storage: current });
  const loaded = await reopened.load('career-town');
  const careerPointer = JSON.parse(current.getItem(TOWN_POINTER_KEY));
  assert.ok([4, 30].includes(loaded.town.year), stopAt + ': recovery keeps one of the two valid towns');
  assert.equal(loaded.town.year, careerPointer.restoreId ? 4 : 30, stopAt + ': career pointer and town agree');
  assert.ok([4, 30].includes(loaded.town.year), stopAt + ': town is never an unrelated value');
}
const yearStore = createTownStore({ memoryOnly: true });
await yearStore.save(year30);
const yearExport = await yearStore.exportTown('soak-town');
const yearImport = createTownStore({ memoryOnly: true });
await yearImport.importTown(yearExport);
assert.equal((await yearImport.load('soak-town')).town.year, 30, 'Year 30 town survives real store export and import');
console.log('town store: byte-safe legacy career, isolated writes, rolling fallback, durable restore recovery, complete export/import, and Year 30 store roundtrip passed');
