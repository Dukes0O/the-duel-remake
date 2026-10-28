// CAREER-REBUILD: the rebuilt two-player career, its one-time restore at start-up and the storage request.
// Memory storage only; no browser and no real save is touched.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {CARS, COURSE} from '../src/config.js';
import {importCareer, needsCareerMigration, requestPersistentStorage} from '../src/career-backup.js';
import {CAREER_RESTORE_2026_10_28} from '../src/career-restore-2026-10-28.js';
import {RESTORE_MARKER_KEY, RESTORE_NOTICE, restoreLostCareers, restoreNoticeText, showRestoreFailure} from '../src/career-restore.js';
import {CIRCUIT_MANIFESTS} from '../src/circuit-manifests.js';
import {isCourseUnlocked} from '../src/course-access.js';
import {DRIVERS, isDriverUnlocked} from '../src/drivers.js';
import {FEATURE_STATES} from '../src/feature-flags.js';
import {getPaintState} from '../src/paint-presets.js';
import {PLAYERS_KEY, createProfile, getUpgradeLevels, isCarUnlocked, loadPlayers, UPGRADE_TYPES} from '../src/progression.js';
import {TERRITORIES} from '../src/wasteland-career.js';
import {wastelandUnlocked} from '../src/wasteland-access.js';
import {WARLORD_LADDER} from '../src/warlords.js';
import {GRATIAN, KYLE, buildCareerFile} from './career-rebuild.mjs';

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

// Dukes00 and Spikey Ferns have the same garage: every roster car and the Jesko maxed, all drivers,
// all released courses, the same paints, the dive kit and the open Wasteland.
for (const name of ['Dukes00', 'Spikey Ferns']) {
  test(name + ': every roster car and the Jesko at maximum, no earned-cars car', () => {
    const profile = byName(name);
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

  test(name + ': all drivers, all released courses, paints, the dive kit and the open Wasteland', () => {
    const profile = byName(name);
    for (const id of Object.keys(DRIVERS)) assert.ok(isDriverUnlocked(profile, id), id);
    const released = COURSE.filter(course => !course.practice &&
      (!CIRCUIT_MANIFESTS.some(item => item.id === course.id) || FEATURE_STATES[CIRCUIT_MANIFESTS.find(item => item.id === course.id).flag] === 'on'));
    assert.ok(released.length >= 21);
    for (const course of released) assert.ok(isCourseUnlocked(profile, course), course.id);
    for (const car of profile.unlockedCars) {
      assert.deepEqual(getPaintState(profile, car).owned, ['factory', 'copper_metallic', 'glacier_satin'], car + ' paints');
    }
    assert.equal(profile.deep.kit, true);
    assert.ok(wastelandUnlocked(profile));
    assert.equal(profile.drivingLessons, undefined);
    assert.deepEqual(profile.history, []);
  });
}

test('Spikey Ferns: the turtle is logged, nothing else in the Deep', () => {
  assert.deepEqual(byName('Spikey Ferns').deep, {kit: true, found: ['kelp-coast'], logged: ['turtle']});
});

test('Dukes00: the dive kit and nothing logged', () => {
  assert.deepEqual(byName('Dukes00').deep, {kit: true});
});

function warlordState(name, beatenIds) {
  const {wasteland} = byName(name);
  for (const id of Object.keys(TERRITORIES)) {
    const beaten = beatenIds.includes(id);
    assert.equal(wasteland.warlords[id].defeated, beaten, name + ' ' + id + ' defeated');
    assert.equal(wasteland.territories[id].claimed, beaten, name + ' ' + id + ' claimed');
    assert.equal(wasteland.warlords[id].wins, beaten ? 1 : 0, name + ' ' + id + ' wins');
  }
  assert.equal(wasteland.settledResults.length, beatenIds.length);
  assert.deepEqual(wasteland.cards.map(card => card.id), beatenIds);
  assert.equal(wasteland.title, undefined);
  return wasteland;
}

test('Spikey Ferns: every warlord except the Tollkeeper and Baron Blackiron is beaten, with no Blackiron reward', () => {
  const wasteland = warlordState('Spikey Ferns', ['sal', 'dustmonger', 'mirage', 'gunn', 'kettle', 'vultures']);
  assert.deepEqual(GRATIAN.beaten, ['sal', 'dustmonger', 'mirage', 'gunn', 'kettle', 'vultures']);
  for (const id of Object.keys(TERRITORIES)) assert.equal(wasteland.territories[id].hold, 100, id + ' hold');
  // The rewards the wins leave behind, from src/warlords.js.
  assert.ok(wasteland.crew.unlocked.includes('tusk'));
  for (const weapon of ['smoke', 'decoy', 'rockets']) assert.ok(wasteland.weapons.unlocked.includes(weapon), weapon);
  assert.ok(wasteland.kits.titan_monster.owned.includes('warlord'));
  assert.deepEqual(wasteland.kits.falcone_f42.owned, ['side-saws', 'turret-look']);
  assert.equal(wasteland.kits.falcone_f42.roofLook, undefined);
  assert.equal(wasteland.scrap, 600 + 700 + 800 + 900 + 1000 + 1100);
});

test('Dukes00: only the first three warlords of the game\'s ladder are beaten', () => {
  const first = WARLORD_LADDER.slice(0, 3);
  assert.deepEqual(first, ['sal', 'dustmonger', 'mirage']);
  assert.deepEqual(KYLE.beaten, first);
  const wasteland = warlordState('Dukes00', first);
  for (const id of Object.keys(TERRITORIES)) assert.equal(wasteland.territories[id].hold, first.includes(id) ? 100 : 0, id + ' hold');
  assert.deepEqual(wasteland.weapons.unlocked, ['ufo', 'bomb', 'crossbow', 'star', 'smoke', 'decoy']);
  assert.deepEqual(wasteland.kits, {falcone_f42: {owned: ['side-saws'], equipped: 'side-saws'}});
  assert.deepEqual(wasteland.crew.unlocked, ['rook']);
  assert.equal(wasteland.scrap, 600 + 700 + 800);
});

test('Dukes00: no lessons and nothing the brief did not name', () => {
  const profile = byName('Dukes00');
  assert.equal(profile.credits, 15000);
  assert.equal(profile.drivingLessons, undefined);
  assert.equal(profile.heli, undefined);
  assert.equal(profile.lab, undefined);
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

const mineWith = (...players) => JSON.stringify({version: 2, activePlayerId: players[0].id,
  players: players.map(player => ({profile: {...createProfile(), credits: 4321}, ...player}))});

test('restore: a fresh career gets exactly the two players, Spikey Ferns active, a copy first, and the notice', async () => {
  const {store, saved, result} = await restoreInto();
  assert.deepEqual(result, {restored: true, reason: 'restored', added: ['Dukes00', 'Spikey Ferns'], skipped: []});
  assert.deepEqual(names(store), ['Dukes00', 'Spikey Ferns']);
  const players = loadPlayers(store);
  assert.equal(players.players.find(player => player.id === players.activePlayerId).name, 'Spikey Ferns');
  assert.equal(store.getItem(RESTORE_MARKER_KEY), 'restored');
  assert.equal([...saved.records.values()].filter(record => record.reason === 'before-career-restore').length, 1);
  assert.equal(RESTORE_NOTICE, 'Spikey Ferns and Dukes00 are back.');
  assert.equal(restoreNoticeText(result), RESTORE_NOTICE);
});

test('restore: a fresh career that only has the old single profile keeps that player', async () => {
  const {store} = await restoreInto({'the-duel-profile-v1': JSON.stringify({...createProfile(), credits: 555})});
  assert.deepEqual(names(store), ['Dukes00', 'Spikey Ferns', 'Player 1']);
  assert.equal(loadPlayers(store).players.find(player => player.name === 'Player 1').profile.credits, 555);
});

test('restore: it happens once and never again after the marker is set', async () => {
  const {store, saved} = await restoreInto();
  const before = store.getItem(PLAYERS_KEY), copies = saved.records.size;
  assert.deepEqual(await restoreLostCareers({storage: store, backupStore: saved}), {restored: false, reason: 'done-before', added: [], skipped: []});
  assert.equal(store.getItem(PLAYERS_KEY), before);
  assert.equal(saved.records.size, copies);
  // Even if a player is removed later, the marker keeps it from running again.
  const registry = JSON.parse(before);
  registry.players = registry.players.filter(player => player.name !== 'Dukes00');
  store.setItem(PLAYERS_KEY, JSON.stringify(registry));
  assert.equal((await restoreLostCareers({storage: store, backupStore: saved})).restored, false);
  assert.deepEqual(names(store), ['Spikey Ferns']);
});

test('restore: players who already exist stay exactly as they are, with the same active player', async () => {
  const {store} = await restoreInto({[PLAYERS_KEY]: mineWith({id: 'me', name: 'Player 1'})});
  const players = loadPlayers(store);
  assert.deepEqual(names(store), ['Dukes00', 'Spikey Ferns', 'Player 1']);
  assert.equal(players.players.find(player => player.id === 'me').profile.credits, 4321);
});

test('restore: one name that already exists is skipped, the other is added, in any letter case', async () => {
  for (const [existing, missing, other] of [['Spikey Ferns', 'Dukes00', 'Spikey Ferns'], ['dukes00', 'Spikey Ferns', 'Dukes00'], ['DUKES00', 'Spikey Ferns', 'Dukes00']]) {
    const {store, saved, result} = await restoreInto({[PLAYERS_KEY]: mineWith({id: 'me', name: existing})});
    assert.deepEqual(result, {restored: true, reason: 'restored', added: [missing], skipped: [other]}, existing);
    assert.deepEqual(names(store).sort(), [existing, missing].sort(), existing);
    assert.equal(loadPlayers(store).players.find(player => player.id === 'me').profile.credits, 4321, existing);
    assert.equal(store.getItem(RESTORE_MARKER_KEY), 'restored', existing);
    assert.equal(saved.records.size, 1, existing);
    assert.equal(restoreNoticeText(result), missing + ' is back. ' + other + ' was already here, so it was left as it is.', existing);
    // The existing player stays active unless Spikey Ferns was the one added.
    const active = loadPlayers(store), name = active.players.find(player => player.id === active.activePlayerId).name;
    assert.equal(name, missing === 'Spikey Ferns' ? 'Spikey Ferns' : existing, existing);
  }
});

test('restore: when both names already exist nothing is added and the marker is set', async () => {
  const raw = mineWith({id: 'a', name: 'spikey ferns'}, {id: 'b', name: 'DUKES00'});
  const {store, saved, result} = await restoreInto({[PLAYERS_KEY]: raw});
  assert.deepEqual(result, {restored: false, reason: 'name-exists', added: [], skipped: ['Dukes00', 'Spikey Ferns']});
  assert.equal(store.getItem(PLAYERS_KEY), raw);
  assert.equal(saved.records.size, 0);
  assert.equal(store.getItem(RESTORE_MARKER_KEY), 'already-here');
});

test('restore: a failed copy or save changes nothing and does not set the marker', async () => {
  const store = memoryStorage();
  await assert.rejects(restoreLostCareers({storage: store, backupStore: {async save() { throw new Error('disk full'); }, async load() {}}}), /disk full/);
  assert.equal(store.getItem(PLAYERS_KEY), null);
  assert.equal(store.getItem(RESTORE_MARKER_KEY), null);
});

test('restore: a failure shows a visible notice that says the game will try again', () => {
  const shown = [];
  const doc = {createElement: () => ({style: {}, attrs: {}, setAttribute(name, value) { this.attrs[name] = value; }, addEventListener() {}, remove() {}}),
    body: {append: note => shown.push(note)}};
  showRestoreFailure(doc);
  assert.equal(shown.length, 1);
  assert.equal(shown[0].id, 'career-restore-error');
  assert.equal(shown[0].attrs.role, 'alert');
  assert.equal(shown[0].textContent, 'Spikey Ferns and Dukes00 could not be restored yet. The game will try again next time it starts. Your current players are unchanged.');
  assert.match(shown[0].style.cssText, /background:#5a1515/);
  // The start-up hook shows it when the restore throws, and still lets the game start.
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /catch\(error\)\{if\(error\.code\?\.startsWith\('CAREER_WRITER_'\)\)throw error;console\.warn\([^)]*\);showRestoreFailure\(\);\}/);
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
