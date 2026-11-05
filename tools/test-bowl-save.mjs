import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {backupCareer} from '../src/career-backup.js';
import {createProfile, loadPlayers, savePlayers} from '../src/progression.js';
import {recordBowlScore, settleBowlNight} from '../src/bowl/bowl-save.js';

let checks = 0;
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const ok = (actual, label) => { assert.ok(actual, label); checks++; };
const memory = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
};

// Scores only rise, and writing one Bowl field leaves the rest of the profile alone.
{
  const profile = {...createProfile(), credits: 123, bowl: {bestScores: {'car-crush': 400}}};
  const higher = recordBowlScore(profile, 'car-crush', 450);
  ok(higher.ok && higher.changed, 'a higher event score is recorded');
  equal(higher.profile.bowl.bestScores['car-crush'], 450, 'the new best is kept');
  equal(higher.profile.credits, profile.credits, 'credits are untouched');
  ok(!recordBowlScore(higher.profile, 'car-crush', 450).changed, 'an equal score changes nothing');
  ok(!recordBowlScore(higher.profile, 'car-crush', 200).changed, 'a lower score cannot replace a best');
  ok(!recordBowlScore(higher.profile, 'unknown-event', 999).ok, 'unknown events are refused');
  const newer = {...higher.profile, bowl: {version: 2, savedForLater: true}};
  ok(!recordBowlScore(newer, 'freestyle', 10).ok, 'a newer Bowl save is read-only');
  equal(recordBowlScore(newer, 'freestyle', 10).profile, newer, 'newer Bowl data stays exact');
}

// Winning pays once to the established scrap wallet and only raises Bowl ownership.
{
  const profile = {...createProfile(), wasteland: {...createProfile().wasteland, scrap: 80},
    bowl: {nightsWon: [1], trophies: ['first'], paintOwned: ['rust'], boltOnsOwned: ['horn']}};
  const settled = settleBowlNight(profile, {night: 2, won: true, scrap: 125,
    trophy: 'second', paint: 'blue', boltOns: ['steam-stack']});
  ok(settled.ok && settled.changed, 'a won night settles');
  equal(settled.profile.wasteland.scrap, 205, 'the purse uses Wasteland scrap');
  equal(settled.profile.bowl.nightsWon, [1, 2], 'the won night is recorded');
  equal(settled.profile.bowl.trophies, ['first', 'second'], 'the trophy shelf only grows');
  equal(settled.profile.bowl.paintOwned, ['rust', 'blue'], 'owned paint only grows');
  equal(settled.profile.bowl.boltOnsOwned, ['horn', 'steam-stack'], 'owned bolt-ons only grow');
  const retry = settleBowlNight(settled.profile, {night: 2, won: true, scrap: 125,
    trophy: 'second', paint: 'blue', boltOns: ['steam-stack']});
  ok(!retry.changed && retry.profile === settled.profile, 'the same night cannot pay twice');
  ok(!settleBowlNight(settled.profile, {night: 3, won: false, scrap: 125}).changed,
    'a loss remains retryable and pays no purse');
  const capped = settleBowlNight({...profile, wasteland: {...profile.wasteland, scrap: 999_999_990}},
    {night: 3, won: true, scrap: 100});
  equal(capped.profile.wasteland.scrap, 1_000_000_000, 'scrap stays within the existing wallet limit');
}

// Existing save fixtures gain no Bowl field or other change on load/save.
{
  const names = readdirSync(new URL('./fixtures/saves/', import.meta.url)).filter(name => name.endsWith('.json'));
  for (const name of names) {
    const fixture = JSON.parse(readFileSync(new URL(`./fixtures/saves/${name}`, import.meta.url), 'utf8'));
    const storage = memory(Object.fromEntries(Object.entries(fixture.storage).map(([key, value]) => [key, JSON.stringify(value)])));
    const before = loadPlayers(storage);
    ok(before.players.every(player => !Object.hasOwn(player.profile, 'bowl')), `${name}: no Bowl data on load`);
    ok(savePlayers(before, storage), `${name}: old fixture saves`);
    const after = loadPlayers(storage);
    equal(after, before, `${name}: unchanged after save and reload`);
    ok(after.players.every(player => !Object.hasOwn(player.profile, 'bowl')), `${name}: no Bowl field added`);
  }
}

// A new Bowl save survives the normal player save and verified career backup round trip.
{
  const storage = memory();
  const profile = settleBowlNight(recordBowlScore(createProfile(), 'freestyle', 1234).profile,
    {night: 1, won: true, scrap: 50, trophy: 'opening-night'}).profile;
  const registry = {version: 2, activePlayerId: 'bowl-test', players: [
    {id: 'bowl-test', name: 'Bowl Test', profile},
  ]};
  ok(savePlayers(registry, storage), 'Bowl career saves through the player store');
  const stored = loadPlayers(storage).players[0].profile;
  equal(stored.bowl.bestScores.freestyle, 1234, 'best score survives save and load');
  equal(stored.bowl.settledNights, ['night:1'], 'settlement receipt survives save and load');
  equal(stored.wasteland.scrap, 50, 'purse survives save and load');
  const records = new Map();
  const backupStore = {save: async record => records.set(record.id, record), load: async id => records.get(id)};
  const backup = await backupCareer(storage, backupStore, 'bowl-save-test', () => new Date('2026-11-04T00:00:00Z'));
  const restored = memory(backup.entries);
  equal(loadPlayers(restored).players[0].profile, stored, 'career backup restores Bowl state exactly');
}

console.log(`test-bowl-save: ${checks} checks passed`);
