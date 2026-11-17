// CAREER-GRANT (Kyle, 16 November 2026): Spikey Ferns, Gratian's player, gets notoriety rank 9 and 20,000 more scrap,
// once, after a verified copy of the career is saved; nobody else changes. Memory storage only; no real save is touched.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {GRANT_MARKER_KEY, grantCareer, grantNoticeText, xpForRank} from '../src/career-grant-2026-11-16.js';
import {PLAYERS_KEY, createProfile, loadPlayers} from '../src/progression.js';
import {rankForXp} from '../src/notoriety.js';
import {buildCareerFile} from './career-rebuild.mjs';
import {importCareer} from '../src/career-backup.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {get length() { return values.size; }, key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(key) ?? null; }, setItem(key, value) { values.set(key, String(value)); }, removeItem(key) { values.delete(key); }};
}
function memoryBackups() {
  const records = new Map();
  return {records, async save(record) { records.set(record.id, structuredClone(record)); }, async load(id) { return structuredClone(records.get(id)); }};
}
async function career() {
  const storage = memoryStorage(), backups = memoryBackups();
  await importCareer(buildCareerFile().text, {storage, backupStore: backups});
  backups.records.clear();
  return {storage, backups};
}
const byName = (storage, name) => loadPlayers(storage).players.find(player => player.name === name);

test('rank 9 starts at 7,400 notoriety and ends before 9,000', () => {
  assert.equal(xpForRank(9), 7400);
  assert.equal(rankForXp(7400), 9); assert.equal(rankForXp(7399), 8); assert.equal(rankForXp(8999), 9); assert.equal(rankForXp(9000), 10);
});

test('Spikey Ferns gets rank 9 and 20,000 more scrap, once, after a saved copy; Dukes00 is untouched', async () => {
  const {storage, backups} = await career();
  const before = byName(storage, 'Spikey Ferns').profile.wasteland, kyle = JSON.stringify(byName(storage, 'Dukes00'));
  const result = await grantCareer({storage, backupStore: backups});
  assert.equal(result.granted, true);
  assert.ok([...backups.records.keys()].length >= 1, 'a copy of the career was saved first');
  const after = byName(storage, 'Spikey Ferns').profile.wasteland;
  assert.equal(after.rank, 9); assert.equal(rankForXp(after.xp), 9);
  assert.equal(after.scrap, before.scrap + 20000);
  assert.equal(JSON.stringify(byName(storage, 'Dukes00')), kyle, 'the other player is exactly as before');
  assert.equal(storage.getItem(GRANT_MARKER_KEY), 'granted');
  assert.match(grantNoticeText(result), /^Spikey Ferns: notoriety rank 9, and 20,000 scrap added/);
  const again = await grantCareer({storage, backupStore: backups});
  assert.equal(again.granted, false); assert.equal(byName(storage, 'Spikey Ferns').profile.wasteland.scrap, before.scrap + 20000, 'never twice');
});

test('a higher rank is never lowered; the scrap is still added', async () => {
  const {storage, backups} = await career();
  const players = loadPlayers(storage), high = rankForXp(20000);
  for (const player of players.players) if (player.name === 'Spikey Ferns') player.profile.wasteland = {...player.profile.wasteland, xp: 20000, rank: high, scrap: 100};
  storage.setItem(PLAYERS_KEY, JSON.stringify(players));
  await grantCareer({storage, backupStore: backups});
  const after = byName(storage, 'Spikey Ferns').profile.wasteland;
  assert.equal(after.xp, 20000); assert.equal(after.rank, high); assert.equal(after.scrap, 20100);
});

test('a laptop without Spikey Ferns changes nothing and does not try again', async () => {
  const profile = createProfile(), players = {version: 2, activePlayerId: 'p1', players: [{id: 'p1', name: 'Player 1', profile}]};
  const storage = memoryStorage({[PLAYERS_KEY]: JSON.stringify(players)}), backups = memoryBackups(), was = storage.getItem(PLAYERS_KEY);
  const result = await grantCareer({storage, backupStore: backups});
  assert.equal(result.granted, false); assert.equal(storage.getItem(PLAYERS_KEY), was); assert.equal(storage.getItem(GRANT_MARKER_KEY), 'no-player');
});
