// CAREER-REBUILD: the rebuilt two-player career, its one-time restore at start-up and the storage request.
// Memory storage only; no browser and no real save is touched.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {CARS, COURSE} from '../src/config.js';
import {importCareer, needsCareerMigration, requestPersistentStorage} from '../src/career-backup.js';
import {CAREER_RESTORE_2026_10_28} from '../src/career-restore-2026-10-28.js';
import {RESTORE_MARKER_KEY, RESTORE_NOTICE, restoreLostCareers} from '../src/career-restore.js';
import {CIRCUIT_MANIFESTS} from '../src/circuit-manifests.js';
import {isCourseUnlocked} from '../src/course-access.js';
import {DRIVERS, isDriverUnlocked} from '../src/drivers.js';
import {FEATURE_STATES} from '../src/feature-flags.js';
import {getPaintState} from '../src/paint-presets.js';
import {PLAYERS_KEY, createProfile, getUpgradeLevels, isCarUnlocked, loadPlayers, UPGRADE_TYPES} from '../src/progression.js';
import {TERRITORIES} from '../src/wasteland-career.js';
import {wastelandUnlocked} from '../src/wasteland-access.js';
import {GRATIAN, KYLE, NOT_BEATEN, buildCareerFile} from './career-rebuild.mjs';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}
function memoryBackups() {
  const records = new Map();
  return {records, async save(record) { records.set(record.id, structuredClone(record)); },
    async load(id) { return structuredClone(records.get(id)); }};
}

const {text} = buildCareerFile();
const earlier = JSON.stringify({version: 2, activePlayerId: 'old', players: [{id: 'old', name: 'Old', profile: {version: 2, credits: 99}}]});
const storage = memoryStorage({[PLAYERS_KEY]: earlier});
const backups = memoryBackups();
const imported = await importCareer(text, {storage, backupStore: backups});
const registry = loadPlayers(storage);
const byName = name => registry.players.find(player => player.name === name).profile;

test('the file replaces the old career, saves a copy first, and needs no migration', async () => {
  assert.equal(imported.playerCount, 2);
  assert.equal((await backups.load(imported.backupId)).entries[PLAYERS_KEY], earlier);
  assert.equal(needsCareerMigration(storage), false);
});

test('both players exist in order, with exact names and credits; Spikey Ferns is active', () => {
  assert.deepEqual(registry.players.map(player => player.name), ['Dukes00', 'Spikey Ferns']);
  assert.equal(registry.players.find(player => player.id === registry.activePlayerId).name, 'Spikey Ferns');
  assert.equal(byName('Dukes00').credits, KYLE.credits);
  assert.equal(byName('Spikey Ferns').credits, GRATIAN.credits);
  assert.equal(KYLE.credits, 15000);
  assert.equal(GRATIAN.credits, 23000);
});

test('Spikey Ferns: every roster car and the Jesko at maximum, no earned-cars car', () => {
  const profile = byName('Spikey Ferns');
  const roster = Object.keys(CARS).filter(car => !CARS[car].unlockRequirement);
  assert.equal(roster.length, 8);
  for (const car of [...roster, 'koenigsegg_jesko']) {
    assert.ok(isCarUnlocked(profile, car), car + ' unlocked');
    for (const type of Object.keys(UPGRADE_TYPES)) assert.equal(getUpgradeLevels(profile, car)[type], 3, car + ' ' + type);
  }
  assert.deepEqual(profile.unlockedCars.filter(car => CARS[car].unlockRequirement), ['koenigsegg_jesko']);
  for (const car of ['ferrari_enzo', 'mclaren_f1', 'bugatti_bolide', 'falcone_sirena', 'mcmurtry_speirling']) assert.ok(!profile.unlockedCars.includes(car), car + ' not unlocked');
  assert.equal(Object.hasOwn(profile, 'medals'), false);
});

test('Spikey Ferns: all drivers, all released courses, paints and the dive kit with the turtle logged', () => {
  const profile = byName('Spikey Ferns');
  for (const id of Object.keys(DRIVERS)) assert.ok(isDriverUnlocked(profile, id), id);
  const released = COURSE.filter(course => !course.practice &&
    (!CIRCUIT_MANIFESTS.some(item => item.id === course.id) || FEATURE_STATES[CIRCUIT_MANIFESTS.find(item => item.id === course.id).flag] === 'on'));
  assert.ok(released.length >= 21);
  for (const course of released) assert.ok(isCourseUnlocked(profile, course), course.id);
  for (const car of profile.unlockedCars) {
    assert.deepEqual(getPaintState(profile, car).owned, ['factory', 'copper_metallic', 'glacier_satin'], car + ' paints');
  }
  assert.equal(profile.deep.kit, true);
  assert.deepEqual(profile.deep, {kit: true, found: ['kelp-coast'], logged: ['turtle']});
});

test('Spikey Ferns: the Wasteland is open and every warlord except the Tollkeeper is beaten', () => {
  const {wasteland} = byName('Spikey Ferns');
  assert.ok(wastelandUnlocked(byName('Spikey Ferns')));
  assert.deepEqual(NOT_BEATEN, ['tollkeeper']);
  for (const id of Object.keys(TERRITORIES)) {
    const beaten = !NOT_BEATEN.includes(id);
    assert.equal(wasteland.warlords[id].defeated, beaten, id + ' defeated');
    assert.equal(wasteland.territories[id].claimed, beaten, id + ' claimed');
    assert.equal(wasteland.territories[id].hold, 100, id + ' hold');
    assert.equal(wasteland.warlords[id].wins, beaten ? 1 : 0, id + ' wins');
  }
  // The rewards the wins leave behind, from src/warlords.js.
  assert.ok(wasteland.crew.unlocked.includes('tusk'));
  for (const weapon of ['smoke', 'decoy', 'rockets']) assert.ok(wasteland.weapons.unlocked.includes(weapon), weapon);
  assert.ok(wasteland.kits.titan_monster.owned.includes('warlord'));
  assert.equal(wasteland.title, 'Warlord of the Wastes');
  assert.ok(wasteland.cards.some(card => card.id === 'sal'));
  assert.ok(!wasteland.cards.some(card => card.id === 'tollkeeper'));
});

test('Dukes00: the starting cars, every course, nothing else', () => {
  const profile = byName('Dukes00');
  assert.deepEqual(profile.unlockedCars, createProfile().unlockedCars);
  for (const car of profile.unlockedCars) for (const type of Object.keys(UPGRADE_TYPES)) assert.equal(getUpgradeLevels(profile, car)[type], 0);
  for (const course of COURSE.filter(course => !course.practice && !CIRCUIT_MANIFESTS.some(item => item.id === course.id && FEATURE_STATES[item.flag] !== 'on'))) {
    assert.ok(isCourseUnlocked(profile, course), course.id);
  }
  assert.deepEqual(profile.drivers.unlocked, ['club']);
  assert.deepEqual(profile.cosmetics, {});
  assert.equal(wastelandUnlocked(profile), false);
  assert.equal(profile.deep, undefined);
  assert.equal(profile.drivingLessons, undefined);
  assert.deepEqual(profile.history, []);
});

test('the data shipped in the game is exactly what the recipe builds', () => {
  assert.deepEqual(CAREER_RESTORE_2026_10_28, JSON.parse(text));
});

async function restoreInto(initial = {}, restore) {
  const store = memoryStorage(initial), saved = memoryBackups();
  store.flush = async () => {};
  return {store, saved, result: await restoreLostCareers({storage: store, backupStore: saved, restore})};
}
const names = store => loadPlayers(store).players.map(player => player.name);

test('restore: on a fresh career it adds both players, makes Spikey Ferns active, notes it and saves a copy first', async () => {
  const {store, saved, result} = await restoreInto();
  assert.deepEqual(result, {restored: true, reason: 'restored'});
  assert.deepEqual(names(store), ['Dukes00', 'Spikey Ferns', 'Player 1']);
  const players = loadPlayers(store);
  assert.equal(players.players.find(player => player.id === players.activePlayerId).name, 'Spikey Ferns');
  assert.equal(store.getItem(RESTORE_MARKER_KEY), 'restored');
  assert.equal([...saved.records.values()].filter(record => record.reason === 'before-career-restore').length, 1);
  assert.equal(RESTORE_NOTICE, 'Spikey Ferns and Dukes00 are back.');
});

test('restore: it happens once and never again after the marker is set', async () => {
  const {store, saved} = await restoreInto();
  const before = store.getItem(PLAYERS_KEY), copies = saved.records.size;
  assert.deepEqual(await restoreLostCareers({storage: store, backupStore: saved}), {restored: false, reason: 'done-before'});
  assert.equal(store.getItem(PLAYERS_KEY), before);
  assert.equal(saved.records.size, copies);
  // Even if a player is removed later, the marker keeps it from running again.
  const registry = JSON.parse(before);
  registry.players = registry.players.filter(player => player.name !== 'Dukes00');
  store.setItem(PLAYERS_KEY, JSON.stringify(registry));
  assert.equal((await restoreLostCareers({storage: store, backupStore: saved})).restored, false);
  assert.deepEqual(names(store), ['Spikey Ferns', 'Player 1']);
});

test('restore: players who already exist stay exactly as they are', async () => {
  const mine = {version: 2, activePlayerId: 'me', players: [{id: 'me', name: 'Player 1', profile: {...createProfile(), credits: 4321}}]};
  const {store} = await restoreInto({[PLAYERS_KEY]: JSON.stringify(mine)});
  const players = loadPlayers(store);
  assert.deepEqual(names(store), ['Dukes00', 'Spikey Ferns', 'Player 1']);
  assert.equal(players.players.find(player => player.id === 'me').profile.credits, 4321);
});

test('restore: never when either name already exists, in any letter case', async () => {
  for (const name of ['Spikey Ferns', 'dukes00', 'DUKES00']) {
    const mine = {version: 2, activePlayerId: 'me', players: [{id: 'me', name, profile: {...createProfile(), credits: 77}}]};
    const raw = JSON.stringify(mine);
    const {store, saved, result} = await restoreInto({[PLAYERS_KEY]: raw});
    assert.deepEqual(result, {restored: false, reason: 'name-exists'}, name);
    assert.equal(loadPlayers(store).players.length, 1, name);
    assert.equal(loadPlayers(store).players[0].profile.credits, 77, name);
    assert.equal(saved.records.size, 0, name);
  }
});

test('restore: a failed copy or save changes nothing and does not set the marker', async () => {
  const store = memoryStorage();
  await assert.rejects(restoreLostCareers({storage: store, backupStore: {async save() { throw new Error('disk full'); }, async load() {}}}), /disk full/);
  assert.equal(store.getItem(PLAYERS_KEY), null);
  assert.equal(store.getItem(RESTORE_MARKER_KEY), null);
});

test('the browser is asked once to keep the game storage, and a refusal or error is ignored', async () => {
  const asked = [];
  assert.equal(await requestPersistentStorage({persisted: async () => false, persist: async () => { asked.push('persist'); return true; }}), true);
  assert.deepEqual(asked, ['persist']);
  assert.equal(await requestPersistentStorage({persisted: async () => true, persist: async () => { asked.push('again'); return true; }}), true);
  assert.deepEqual(asked, ['persist']);
  assert.equal(await requestPersistentStorage({persisted: async () => false, persist: async () => false}), false);
  assert.equal(await requestPersistentStorage({persisted: async () => { throw new Error('no'); }, persist: async () => true}), false);
  assert.equal(await requestPersistentStorage(undefined), false);
  assert.equal(await requestPersistentStorage({}), false);
});
