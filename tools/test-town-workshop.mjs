import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createTown, serializeTown, deserializeTown, dispatchTownCommand} from '../src/town/index.js';
import {WORKSHOP_CARS} from '../src/town/content/workshop-cars.js';
import {beginWorkshopCar, stepWorkshop, collectWorkshopCar, workshopStock} from '../src/town/town-workshop.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {storeGood} from '../src/town/town-goods.js';
import {createTownStore, saveTown} from '../src/town/town-store.js';
import {workshopMarkup} from '../src/town/ui/town-workshop.js';

const enabled = {enabled: true};
const bay = {id: 'bay-1', buildingId: 'workshop', state: 'finished', regionId: 'scablands', x: 30, z: 30};
function fresh() {
  const town = createTown(1989, 'Test Workshop');
  town.mayors = ['owner'];
  town.buildings.push({...bay});
  return town;
}

// Version-one towns are not migrated or given a field by the new feature.
const oldTown = fresh(), before = serializeTown(oldTown);
for (const version of [0, 1]) {
  const fixture = await readFile(new URL(`./fixtures/town/town-v${version}.json`, import.meta.url), 'utf8');
  const loaded = deserializeTown(fixture);
  const snapshot = serializeTown(loaded);
  stepWorkshop(loaded, enabled);
  assert.equal(serializeTown(loaded), snapshot, `version ${version} town gains no Workshop state`);
  assert.equal(serializeTown(deserializeTown(snapshot)), snapshot, 'all existing fixture data survives another load');
}
assert.equal(serializeTown(deserializeTown(before)), before);
stepWorkshop(oldTown, enabled);
assert.equal(serializeTown(oldTown), before, 'an unused Workshop never changes an old town');
assert.equal(beginWorkshopCar(oldTown, 'rattler', {enabled: false}).ok, false);
assert.equal(serializeTown(oldTown), before, 'off means no save changes');
assert.equal(beginWorkshopCar(oldTown, '__proto__', enabled).ok, false);

for (const [id, definition] of Object.entries(WORKSHOP_CARS)) {
  const town = fresh();
  for (const [good, amount] of Object.entries(definition.ingredients)) storeGood(town, bay, good, amount);
  const profile = createProfile();
  assert.equal(dispatchTownCommand(town, {type: 'buildWorkshopCar', carId: id},
    {flags: {enabled: name => name === 'wasteland-cars'}}).ok, true);
  assert.equal(beginWorkshopCar(town, id, enabled).ok, false, 'no duplicate order');
  assert.equal(collectWorkshopCar(profile, town, id, {playerId: 'owner', ...enabled}).ok, false);
  stepWorkshop(town, enabled);
  for (const good of Object.keys(definition.ingredients)) assert.equal(workshopStock(town, good), 0);
  const saved = serializeTown(town), resumed = deserializeTown(saved);
  assert.equal(serializeTown(resumed), saved, 'an active build survives a save exactly');
  stepWorkshop(town, {enabled: false});
  assert.equal(serializeTown(town), saved, 'switching off preserves the work');
  town.buildings[0].state = 'ruined';
  const remaining = town.workshop.orders[id].remainingTicks;
  stepWorkshop(town, enabled);
  assert.equal(town.workshop.orders[id].remainingTicks, remaining, 'a ruined bay stops work');
  town.buildings[0].state = 'finished';
  for (let i = 1; i < definition.assemblyTicks; i++) {
    stepWorkshop(town, enabled);
    stepWorkshop(resumed, enabled);
  }
  assert.deepEqual(town.workshop, resumed.workshop, 'resuming gives the same completed car');
  assert.ok(town.workshop.completed[id]);
  assert.equal(collectWorkshopCar(profile, town, id, {playerId: 'visitor', ...enabled}).ok, false);
  const result = collectWorkshopCar(profile, town, id, {playerId: 'owner', ...enabled});
  assert.equal(result.ok, true);
  assert.ok(result.profile.unlockedCars.includes(id));
  assert.equal(result.profile.credits, profile.credits, 'no credit reward or purchase');
  assert.equal(collectWorkshopCar(result.profile, town, id, {playerId: 'owner', ...enabled}).changed, false);
  assert.ok(normalizeProfile(result.profile).unlockedCars.includes(id), 'car survives loading with its switch off');
  const store = createTownStore({memoryOnly: true, storage: null});
  await saveTown(town, {store, reason: 'Workshop test'});
  const loaded = await store.load(town.id);
  assert.deepEqual(loaded.town.workshop, town.workshop, 'the actual memory store retains the completed receipt');
}

const salvage = fresh();
assert.equal(beginWorkshopCar(salvage, 'rattler', enabled).ok, true);
stepWorkshop(salvage, enabled);
assert.equal(salvage.workshop.orders.rattler.phase, 'parts', 'missing parts stop assembly');
storeGood(salvage, bay, 'salvage', 100);
stepWorkshop(salvage, enabled);
assert.equal(workshopStock(salvage, 'salvage'), 100, 'sorting takes time');
stepWorkshop(salvage, enabled);
assert.equal(workshopStock(salvage, 'salvage'), 0);
assert.equal(workshopStock(salvage, 'parts'), 2);
assert.equal(workshopStock(salvage, 'steel'), 12);
assert.equal(workshopStock(salvage, 'tin'), 18);
assert.equal(workshopStock(salvage, 'wire'), 8);
assert.equal(beginWorkshopCar(salvage, 'scarab', enabled).ok, false, 'one car per bay');
salvage.buildings.push({...bay, id: 'bay-2', x: 34});
assert.equal(beginWorkshopCar(salvage, 'scarab', enabled).ok, true, 'more Workshops provide more bays');

const future = fresh();
future.workshop = {version: 2, newRule: {keep: true}};
const futureSave = serializeTown(future);
assert.equal(beginWorkshopCar(future, 'rattler', enabled).ok, false);
stepWorkshop(future, enabled);
assert.equal(serializeTown(deserializeTown(futureSave)), futureSave);
assert.equal(serializeTown(future), futureSave, 'unknown versions stay intact');
const unknown = fresh();
unknown.workshop = {version: 1, orders: {'future-car': {workshopId: bay.id, phase: 'future'}}, completed: {'old-car': {tick: '12'}}};
const unknownSave = serializeTown(unknown);
stepWorkshop(unknown, enabled);
assert.equal(serializeTown(unknown), unknownSave, 'unknown cars and stages stay intact');
for (const order of [null, {workshopId: bay.id, phase: 'parts', remainingTicks: 1}]) {
  const damaged = fresh();
  damaged.workshop = {version: 1, orders: {rattler: order, 'future-car': null}, completed: {}};
  const saved = serializeTown(damaged);
  stepWorkshop(damaged, enabled);
  assert.equal(serializeTown(damaged), saved, 'unreadable orders survive a tick unchanged');
  assert.ok(workshopMarkup(damaged, createProfile(), enabled).includes('cannot be read'));
  assert.equal(beginWorkshopCar(damaged, 'rattler', enabled).ok, false, 'never overwrite an unreadable saved order');
  assert.doesNotThrow(() => beginWorkshopCar(damaged, 'scarab', enabled));
}
console.log('PASS: Workshop parts, elapsed assembly, pauses, ownership, memory saves, old towns and future data.');
