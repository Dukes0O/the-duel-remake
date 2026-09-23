import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadPlayers, savePlayers, loadProfile, saveProfile } from '../src/progression.js';
import { loadLeaderboard, saveLeaderboard } from '../src/leaderboard.js';
import { loadGhosts, saveGhosts } from '../src/ghost.js';

const fixtureDir = fileURLToPath(new URL('./fixtures/saves/', import.meta.url));
const files = readdirSync(fixtureDir).filter(name => name.endsWith('.json')).sort();
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
for (const file of files) {
  const fixture = JSON.parse(readFileSync(new URL(file, new URL('./fixtures/saves/', import.meta.url)), 'utf8'));
  const storage = memoryStorage(fixture.storage);
  const players = loadPlayers(storage);
  const leaderboard = loadLeaderboard(storage);
  const ghosts = loadGhosts(storage);
  const state = { ...players, leaderboard, ghosts };
  assert.ok(players.players.length > 0, `${fixture.shape}: no player loaded`);
  for (const assertion of fixture.assertions) {
    const actual = atPath(state, assertion.path);
    if (Object.hasOwn(assertion, 'equals')) assert.deepEqual(actual, assertion.equals,
      `${fixture.shape}: ${assertion.path} changed on load`);
    if (Object.hasOwn(assertion, 'includes')) assert.ok(Array.isArray(actual) && actual.includes(assertion.includes),
      `${fixture.shape}: ${assertion.path} lost ${assertion.includes}`);
    checks++;
  }
  assert.deepEqual(loadProfile(storage), players.players.find(player => player.id === players.activePlayerId).profile,
    `${fixture.shape}: active profile does not match player registry`);
  assert.ok(savePlayers(players, storage), `${fixture.shape}: player round-trip save failed`);
  assert.ok(saveProfile(loadProfile(storage), storage), `${fixture.shape}: active profile round-trip save failed`);
  assert.ok(saveLeaderboard(leaderboard, storage), `${fixture.shape}: record round-trip save failed`);
  assert.ok(saveGhosts(ghosts, storage), `${fixture.shape}: ghost round-trip save failed`);
  assert.deepEqual(loadPlayers(storage), players, `${fixture.shape}: player data changed after reload`);
  assert.deepEqual(loadLeaderboard(storage), leaderboard, `${fixture.shape}: records changed after reload`);
  assert.deepEqual(loadGhosts(storage), ghosts, `${fixture.shape}: ghosts changed after reload`);
  checks += 7;
}
console.log(`Save fixtures: ${files.length} historical shapes and ${checks} load/round-trip checks passed using memory storage.`);
