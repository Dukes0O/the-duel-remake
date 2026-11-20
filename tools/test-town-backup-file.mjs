import assert from 'node:assert/strict';
import { createTown, stepTown } from '../src/town/index.js';
import { backupTownFile, createTownStore, TOWN_FILE_FORMAT, TOWN_FILE_VERSION } from '../src/town/town-store.js';

// Walk two values side by side and fail on the first path whose type or value differs.
function sameFieldByField(actual, expected, path = 'town') {
  assert.equal(typeof actual, typeof expected, path + ' keeps its type');
  if (typeof expected === 'bigint') { assert.equal(actual, expected, path); return 1; }
  if (expected === null || typeof expected !== 'object') { assert.equal(actual, expected, path); return 0; }
  assert.equal(Array.isArray(actual), Array.isArray(expected), path + ' keeps its shape');
  assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), path + ' keeps its fields');
  let bigints = 0;
  for (const key of Object.keys(expected)) bigints += sameFieldByField(actual[key], expected[key], path + '.' + key);
  return bigints;
}

// Build a town the way the town's own suites do: found it and let a month pass.
const town = createTown(1001, 'Backup Creek', [{ id: 'player-a' }]);
town.id = 'town-player-a-1001';
town.mayors = ['player-a'];
for (let tick = 0; tick < 720; tick++) stepTown(town);
town.till += 2n ** 70n; // a till beyond the safe whole-number range of a plain JSON number
assert.equal(typeof town.tick, 'bigint');
assert.equal(typeof town.till, 'bigint');

const source = createTownStore({ memoryOnly: true });
await source.save(town, 'backup');
const saved = (await source.load(town.id)).town;
const text = await source.exportTown(town.id);
const file = JSON.parse(text);
assert.equal(file.format, TOWN_FILE_FORMAT, 'the backup keeps its file format name');
assert.equal(file.version, TOWN_FILE_VERSION, 'the backup names the tagged encoding version');
assert.equal(TOWN_FILE_VERSION, 2);
assert.deepEqual(file.town.till, { $townBigInt: String(saved.till) }, 'a BigInt is written as its exact digits');

const target = createTownStore({ memoryOnly: true });
const record = await target.importTown(text);
assert.equal(record.id, town.id);
const restored = (await target.load(town.id)).town;
const bigints = sameFieldByField(restored, saved);
assert.ok(bigints >= 5, `the town holds several BigInt fields (${bigints})`);
assert.deepStrictEqual(restored, saved, 'the restored town equals the saved town exactly');
assert.equal(restored.till, saved.till, 'the large till survives exactly');

// BACK UP writes the same text through the save picker.
let written = '';
const picker = async () => ({ createWritable: async () => ({ write: async value => { written += value; }, close: async () => {} }) });
assert.equal(await backupTownFile(town.id, { store: source, picker }), 'The town backup was saved.');
assert.equal(written, text, 'BACK UP writes the exported town file');

// A version 1 file is plain JSON. One could only have been written for a town with no BigInt
// fields, because the old export threw on any BigInt; it still restores unchanged.
const plainTown = { id: 'plain-town', version: 1, mayors: ['player-a'], year: 2, till: 3, people: [{ id: 'p1', name: 'Ada' }] };
const v1 = JSON.stringify({ format: TOWN_FILE_FORMAT, version: 1, town: plainTown });
const v1Store = createTownStore({ memoryOnly: true });
await v1Store.importTown(v1);
assert.deepStrictEqual((await v1Store.load('plain-town')).town, plainTown, 'a version 1 town file still restores');

// Files from a newer game, of another format or damaged are refused and change nothing.
const refused = createTownStore({ memoryOnly: true });
for (const bad of [
  JSON.stringify({ ...file, version: TOWN_FILE_VERSION + 1 }),
  JSON.stringify({ ...file, format: 'the-duel-career' }),
  text.slice(0, -5),
]) await assert.rejects(refused.importTown(bad), /town file/);
assert.equal((await refused.load(town.id)).town, null, 'a refused file restores nothing');

console.log(`town backup file ok (${bigints} BigInt fields round-tripped)`);
