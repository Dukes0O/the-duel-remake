import assert from 'node:assert/strict';
import test from 'node:test';
import {App} from '../src/app.js';
import {backupBeforeMigration, needsCareerMigration} from '../src/career-backup.js';
import {createProfile, loadPlayers, normalizeProfile, savePlayers, PLAYERS_KEY} from '../src/progression.js';
import {createArmoryScreen} from '../src/screen-armory.js';
import {normalizeWasteland} from '../src/wasteland-progress.js';
import {getProfileWeapons} from '../src/weapon-upgrades.js';

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
  return {
    async save(record) { records.set(record.id, structuredClone(record)); },
    async load(id) { return structuredClone(records.get(id)); },
  };
}
function oldRegistry() {
  const {wasteland, ...oldProfile} = createProfile();
  return {version: 2, activePlayerId: 'player-1', players: [{
    id: 'player-1', name: 'Player 1', profile: {
      ...oldProfile, credits: 4300, raceSettings: {},
      weapons: {version: 1, unlocked: ['ufo', 'bomb', 'crossbow', 'star'],
        levels: {ufo: 2, bomb: 3, crossbow: 1, star: 0}},
      history: [{key: 'old-race:0', won: true, reward: 600}],
      settledResults: ['old-race:0'],
    },
  }]};
}

test('the versioned default profile has the full Wasteland shape', () => {
  const profile = createProfile();
  assert.equal(Object.hasOwn(profile, 'weapons'), false);
  assert.deepEqual(Object.keys(profile.wasteland), [
    'version', 'xp', 'rank', 'weapons', 'loadout', 'crew', 'kits',
    'warPaint', 'challenges', 'bounties', 'warlords', 'cards', 'settledResults',
  ]);
  assert.equal(profile.wasteland.version, 1);
  assert.deepEqual(profile.wasteland.weapons.levels,
    {ufo: 0, bomb: 0, crossbow: 0, star: 0});
  assert.deepEqual(profile.wasteland.crew, {unlocked: ['rook'], selected: 'rook'});
});

test('legacy levels and other saved fields survive the one-way profile move', () => {
  const raw = oldRegistry().players[0].profile;
  const loaded = normalizeProfile(raw);
  assert.deepEqual(loaded.wasteland.weapons.levels, raw.weapons.levels);
  assert.equal(Object.hasOwn(loaded, 'weapons'), false);
  assert.equal(loaded.credits, raw.credits);
  assert.deepEqual(loaded.history, raw.history);
  assert.deepEqual(loaded.settledResults, raw.settledResults);
  assert.deepEqual(normalizeProfile(loaded).wasteland, loaded.wasteland);

  const withBoth = normalizeProfile({...raw, wasteland: {
    version: 1, weapons: {levels: {ufo: 1, bomb: 0, crossbow: 2, star: 0}},
  }});
  assert.deepEqual(withBoth.wasteland.weapons.levels,
    {ufo: 2, bomb: 3, crossbow: 2, star: 0});
});

test('malformed optional fields recover while unknown future fields stay intact', () => {
  const malformed = {
    version: 1, unknownFeature: {owned: ['future-kit']},
    xp: Infinity, rank: '30', weapons: {levels: {ufo: -9, bomb: 2.5}},
    loadout: ['ufo', 'ufo', 'missing'], crew: {unlocked: 9, selected: 'missing'},
    kits: {falcone_f42: {owned: 'invalid', equipped: 'scrapper'}},
    warPaint: {falcone_f42: {layers: 'invalid'}},
    challenges: {one: {progress: -10, done: 'yes'}},
    bounties: {day: 'bad', done: [null, 'first'], streak: -2},
    warlords: {defeated: 'bad'}, cards: [{id: 1}, {id: 'a', kind: 'win', earnedAt: 1}],
    settledResults: [null, 'won:0'],
  };
  const loaded = normalizeWasteland(malformed, {levels: {ufo: 2, bomb: 1}});
  assert.equal(loaded.version, 1);
  assert.deepEqual(loaded.unknownFeature, {owned: ['future-kit']});
  assert.deepEqual(loaded.weapons.levels, {ufo: 2, bomb: 2, crossbow: 0, star: 0});
  assert.equal(loaded.xp, 0);
  assert.equal(loaded.rank, 1);
  assert.deepEqual(loaded.crew, {unlocked: ['rook'], selected: 'rook'});
  assert.deepEqual(loaded.bounties, {day: null, done: ['first'], streak: 0});
  assert.deepEqual(loaded.cards, [{id: 'a', kind: 'win', earnedAt: 1}]);
  const future = {...malformed, version: 2};
  assert.deepEqual(normalizeWasteland(future, {levels: {ufo: 2}}), future,
    'an older build keeps an unsupported future schema opaque');
});

test('a verified backup precedes the persisted move and the new save is stable', async () => {
  const raw = JSON.stringify(oldRegistry());
  const storage = memoryStorage({[PLAYERS_KEY]: raw});
  const backups = memoryBackups();
  assert.equal(needsCareerMigration(storage), true);
  const backup = await backupBeforeMigration(storage, backups);
  assert.equal((await backups.load(backup.id)).entries[PLAYERS_KEY], raw);
  assert.equal(storage.getItem(PLAYERS_KEY), raw, 'backup itself never moves a save');
  const players = loadPlayers(storage);
  assert.equal(savePlayers(players, storage), true);
  const persisted = JSON.parse(storage.getItem(PLAYERS_KEY)).players[0].profile;
  assert.equal(Object.hasOwn(persisted, 'weapons'), false);
  assert.deepEqual(persisted.wasteland.weapons.levels,
    {ufo: 2, bomb: 3, crossbow: 1, star: 0});
  assert.equal(persisted.credits, 4300);
  assert.equal(needsCareerMigration(storage), false);
  assert.equal(await backupBeforeMigration(storage, backups), null);

  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage',
    {configurable: true, value: storage});
  try {
    const app = new App();
    assert.equal(app.startCampaign({mode: 'wasteland', startStage: 0}), true);
    assert.deepEqual(app.duel.state.weaponLevels, persisted.wasteland.weapons.levels);
    app.returnToMenu();
    const armory = createArmoryScreen({
      profile: () => app.profile, credits: String, escapeHTML: String,
      getGarageMessage: () => '', action: () => '',
    });
    assert.ok(armory().includes('LEVEL 2 / 3'),
      'the Armory reads the migrated weapon levels');
    const beforePurchase = app.profile.credits;
    const bought = app.purchaseWeapon('crossbow');
    assert.equal(bought.ok, true);
    assert.equal(getProfileWeapons(bought.profile).levels.crossbow, 2);
    assert.equal(bought.profile.credits, beforePurchase - 700);
    assert.equal(new App().profile.wasteland.weapons.levels.crossbow, 2);
  } finally {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else delete globalThis.localStorage;
  }
});

test('failed and unverified backups leave old storage unchanged', async () => {
  const raw = JSON.stringify(oldRegistry());
  for (const backups of [
    {async save() {throw Error('IndexedDB blocked');}},
    {async save() {}, async load() {return null;}},
  ]) {
    const storage = memoryStorage({[PLAYERS_KEY]: raw});
    await assert.rejects(backupBeforeMigration(storage, backups));
    assert.equal(storage.getItem(PLAYERS_KEY), raw);
  }
});

test('a newer Wasteland format is backed up, then blocked from older-code writes', async () => {
  const registry = oldRegistry();
  delete registry.players[0].profile.weapons;
  registry.players[0].profile.wasteland = {...createProfile().wasteland,
    version: 2, futureOwned: ['unique']};
  const raw = JSON.stringify(registry);
  const storage = memoryStorage({[PLAYERS_KEY]: raw});
  const backups = memoryBackups();
  await assert.rejects(backupBeforeMigration(storage, backups), /newer Wasteland/);
  assert.equal(storage.getItem(PLAYERS_KEY), raw);
  assert.equal(savePlayers(loadPlayers(storage), storage), false);
  assert.equal(storage.getItem(PLAYERS_KEY), raw);
});
