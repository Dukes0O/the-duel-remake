import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadPlayers, savePlayers, loadProfile, saveProfile, PLAYERS_KEY, PROFILE_KEY } from '../src/progression.js';
import { loadLeaderboard, saveLeaderboard, LEADERBOARD_KEY } from '../src/leaderboard.js';
import { loadGhosts, saveGhosts, GHOST_KEY } from '../src/ghost.js';

const fixtureDir = new URL('./fixtures/saves/', import.meta.url);
const files = readdirSync(fileURLToPath(fixtureDir)).filter(name => name.endsWith('.json')).sort();
assert.equal(files.length, 7, 'review the historical save-shape fixture roster');

function memoryStorage(initial) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]));
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(String(key)) ?? null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); },
    clear() { values.clear(); },
  };
}

function atPath(value, path) {
  return path.split('.').reduce((item, key) => item?.[key], value);
}

let checks = 0;
function equal(actual, expected, label) {
  assert.deepEqual(actual, expected, label);
  checks++;
}
function includes(actual, expected, label) {
  assert.ok(Array.isArray(actual) && actual.includes(expected), label);
  checks++;
}

function preserveProfile(raw, loaded, label) {
  equal(loaded.credits, raw.credits, `${label}: credits`);
  for (const car of raw.unlockedCars ?? []) includes(loaded.unlockedCars, car, `${label}: unlocked car ${car}`);
  for (const [car, levels] of Object.entries(raw.upgrades ?? {})) {
    for (const [type, level] of Object.entries(levels)) equal(loaded.upgrades[car]?.[type], level, `${label}: ${car} ${type}`);
  }
  for (const [key, time] of Object.entries(raw.personalBests ?? {})) {
    equal(loaded.personalBests[key], time, `${label}: personal best ${key}`);
  }
  for (const field of ['settledResults', 'settledPoliceFines', 'pbBonusRuns', 'milestones', 'circuitWins']) {
    if (raw[field]) for (const value of raw[field]) includes(loaded[field], value, `${label}: ${field} ${value}`);
  }
  if (raw.awardedWins) equal(loaded.settledResults, raw.awardedWins, `${label}: awardedWins migration`);
  if (raw.history) equal(loaded.history, raw.history, `${label}: complete race history`);
  if (raw.winStreak != null) equal(loaded.winStreak, raw.winStreak, `${label}: win streak`);
  if (raw.drivers) {
    equal(loaded.drivers.selected, raw.drivers.selected, `${label}: selected driver`);
    for (const id of raw.drivers.unlocked) includes(loaded.drivers.unlocked, id, `${label}: driver ${id}`);
  }
  if (raw.courses) for (const id of raw.courses.unlocked) includes(loaded.courses.unlocked, id, `${label}: course ${id}`);
  if (raw.raceSettings) {
    for (const [field, value] of Object.entries(raw.raceSettings)) {
      equal(loaded.raceSettings[field], value, `${label}: race setting ${field}`);
    }
  }
  if (raw.weapons) {
    for (const id of raw.weapons.unlocked) includes(loaded.wasteland.weapons.unlocked, id, `${label}: migrated weapon ${id}`);
    for (const [id, level] of Object.entries(raw.weapons.levels)) equal(loaded.wasteland.weapons.levels[id], level, `${label}: migrated weapon level ${id}`);
    equal(Object.hasOwn(loaded, 'weapons'), false, `${label}: legacy weapon field moved`);
  }
  for (const [car, paint] of Object.entries(raw.cosmetics ?? {})) {
    equal(loaded.cosmetics[car]?.selected, paint.selected, `${label}: selected paint ${car}`);
    for (const id of paint.owned) includes(loaded.cosmetics[car]?.owned, id, `${label}: owned paint ${car}/${id}`);
  }
}

// The records and ghosts are historical evidence. Compare every raw field on
// the first load, including complete lap metadata and every ghost sample.
// A normalized-to-normalized round trip alone would miss data lost on import.
function preserveRows(rawRows, loadedRows, identity, label) {
  equal(loadedRows.length, rawRows.length, `${label}: row count`);
  for (const raw of rawRows) {
    const loaded = loadedRows.find(row => row[identity] === raw[identity]);
    assert.ok(loaded, `${label}: missing ${raw[identity]}`);
    checks++;
    for (const [field, value] of Object.entries(raw)) equal(loaded[field], value, `${label}: ${raw[identity]} ${field}`);
  }
}

for (const file of files) {
  const fixture = JSON.parse(readFileSync(new URL(file, fixtureDir), 'utf8'));
  const storage = memoryStorage(fixture.storage);
  const players = loadPlayers(storage);
  const leaderboard = loadLeaderboard(storage);
  const ghosts = loadGhosts(storage);
  const state = { ...players, leaderboard, ghosts };
  assert.ok(players.players.length > 0, `${fixture.shape}: no player loaded`);
  const rawRegistry = fixture.storage[PLAYERS_KEY];
  const rawPlayers = rawRegistry?.players ?? [{ id: 'player-1', name: 'Player 1', profile: fixture.storage[PROFILE_KEY] }];
  equal(players.players.length, rawPlayers.length, `${fixture.shape}: player count`);
  if (rawRegistry) equal(players.activePlayerId, rawRegistry.activePlayerId, `${fixture.shape}: active player`);
  for (const rawPlayer of rawPlayers) {
    const loaded = players.players.find(player => player.id === rawPlayer.id);
    assert.ok(loaded, `${fixture.shape}: missing player ${rawPlayer.id}`);
    checks++;
    equal(loaded.name, rawPlayer.name, `${fixture.shape}: player name`);
    preserveProfile(rawPlayer.profile, loaded.profile, `${fixture.shape}/${rawPlayer.id}`);
  }
  for (const assertion of fixture.assertions) {
    // Historical fixture paths name the old root field. Check the same owned
    // levels at their new location without rewriting the fixture itself.
    const migratedPath = assertion.path.replace('.profile.weapons.', '.profile.wasteland.weapons.');
    const actual = atPath(state, migratedPath);
    if (Object.hasOwn(assertion, 'equals')) equal(actual, assertion.equals, `${fixture.shape}: ${assertion.path} changed on load`);
    if (Object.hasOwn(assertion, 'includes')) includes(actual, assertion.includes, `${fixture.shape}: ${assertion.path} lost ${assertion.includes}`);
  }
  const rawBoard = fixture.storage[LEADERBOARD_KEY];
  if (rawBoard) {
    preserveRows(rawBoard.entries, leaderboard.entries, 'eventKey', `${fixture.shape}: current records`);
    preserveRows(rawBoard.archivedEntries, leaderboard.archivedEntries, 'eventKey', `${fixture.shape}: archived records`);
  }
  const rawGhosts = fixture.storage[GHOST_KEY];
  if (rawGhosts) {
    preserveRows(rawGhosts.records, ghosts.records, 'key', `${fixture.shape}: current ghosts`);
    preserveRows(rawGhosts.archivedRecords, ghosts.archivedRecords, 'key', `${fixture.shape}: archived ghosts`);
  }
  // Loading must not rewrite even a superseded legacy key before the first save.
  for (const [key, raw] of Object.entries(fixture.storage)) equal(storage.getItem(key), JSON.stringify(raw), `${fixture.shape}: source key ${key} mutated on load`);
  equal(loadProfile(storage), players.players.find(player => player.id === players.activePlayerId).profile,
    `${fixture.shape}: active profile does not match player registry`);
  assert.ok(savePlayers(players, storage), `${fixture.shape}: player round-trip save failed`);
  assert.ok(saveProfile(loadProfile(storage), storage), `${fixture.shape}: active profile round-trip save failed`);
  assert.ok(saveLeaderboard(leaderboard, storage), `${fixture.shape}: record round-trip save failed`);
  assert.ok(saveGhosts(ghosts, storage), `${fixture.shape}: ghost round-trip save failed`);
  equal(loadPlayers(storage), players, `${fixture.shape}: player data changed after reload`);
  equal(loadLeaderboard(storage), leaderboard, `${fixture.shape}: records changed after reload`);
  equal(loadGhosts(storage), ghosts, `${fixture.shape}: ghosts changed after reload`);
}
console.log(`Save fixtures: ${files.length} historical shapes and ${checks} first-load/round-trip checks passed using memory storage.`);
