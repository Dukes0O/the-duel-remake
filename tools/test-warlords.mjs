import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createProfile} from '../src/progression.js';
import {TERRITORIES} from '../src/wasteland-career.js';
import {normalizeWasteland} from '../src/wasteland-progress.js';

let checks = 0;
const equal = (actual, expected, message) => {
  checks += 1;
  assert.deepEqual(actual, expected, message);
};
const ok = (actual, message) => {
  checks += 1;
  assert.ok(actual, message);
};

const ids = ['sal', 'dustmonger', 'mirage', 'gunn', 'kettle', 'vultures',
  'tollkeeper', 'blackiron'];
const names = {
  sal: 'Sawtooth Sal',
  dustmonger: 'The Dustmonger',
  mirage: 'Mother Mirage',
  gunn: 'Gearhead Gunn',
  kettle: 'Kettle Kingpin',
  vultures: 'The Twin Vultures',
  tollkeeper: 'The Tollkeeper',
  blackiron: 'Baron Blackiron',
};

let warlordModule;
const loadWarlords = () => warlordModule ??= import('../src/warlords.js');

test('the eight immutable warlords use the existing territory ids and assignments', async () => {
  const {WARLORDS} = await loadWarlords();
  equal(Object.keys(WARLORDS), ids, 'the ladder order stays Sal through Blackiron');
  ok(Object.isFrozen(WARLORDS), 'the metadata table is frozen');
  for (const id of ids) {
    const warlord = WARLORDS[id];
    equal(warlord.id, id, `${id} keeps its stable save and territory id`);
    equal(warlord.name, names[id], `${id} keeps the settled display name`);
    equal(warlord.territoryId, id, `${id} points at its existing territory`);
    equal(warlord.courses, TERRITORIES[id].courses,
      `${id} reuses the existing course assignment`);
    equal(warlord.venues ?? [], TERRITORIES[id].venues ?? [],
      `${id} reuses the existing venue assignment`);
    ok(Object.isFrozen(warlord), `${id} metadata is frozen`);
    ok(Object.isFrozen(warlord.courses), `${id} course metadata is frozen`);
    ok(Object.isFrozen(warlord.venues), `${id} venue metadata is frozen`);
    equal(['poster', 'portrait', 'cardImage', 'image'].filter(key =>
      Object.hasOwn(warlord, key)), [],
    `${id} does not revive the superseded poster or card-image system`);
  }
  equal(WARLORDS.sal.reward, 'Side Saws', 'Sal promises only her settled reward');
  equal(WARLORDS.dustmonger.reward, 'Smoke Screen',
    'Dustmonger promises only his settled reward');
  equal(WARLORDS.mirage.reward, 'Decoy Drone',
    'Mirage promises only her settled reward');
});

test('the current ladder marks no fight built before its owning implementation lands', async () => {
  const {BUILT_WARLORD_IDS} = await loadWarlords();
  equal(BUILT_WARLORD_IDS, [], 'WAR-01 cannot claim that a warlord fight is playable');
  ok(Object.isFrozen(BUILT_WARLORD_IDS), 'fight availability cannot be changed at runtime');
});

test('warlord saves add one independent record per territory', () => {
  const expected = Object.fromEntries(ids.map(id => [id,
    {defeated: false, wins: 0, losses: 0}]));
  equal(normalizeWasteland().warlords, expected,
    'a new career has the additive per-warlord save shape');
  equal(createProfile().wasteland.warlords, expected,
    'the real profile factory exposes the same shape');

  const first = createProfile();
  const second = createProfile();
  first.wasteland.warlords.sal.wins = 3;
  equal(second.wasteland.warlords.sal,
    {defeated: false, wins: 0, losses: 0},
    'named players do not share warlord progress objects');
});

test('legacy defeats and unknown future warlord data survive normalization', () => {
  const legacy = normalizeWasteland({version: 1, warlords: {defeated: ['sal']}});
  equal(legacy.warlords.sal, {defeated: true, wins: 0, losses: 0},
    'the existing defeated-id array migrates without losing Sal');

  const futureData = {route: 'future', tuning: {phase: 4}};
  const unknownBoss = {defeated: true, wins: 9, losses: 2, reward: 'future-item'};
  const loaded = normalizeWasteland({version: 1, warlords: {
    sal: {defeated: true, wins: 2, losses: 1, futureData},
    'future-warlord': unknownBoss,
  }});
  equal(loaded.warlords.sal,
    {defeated: true, wins: 2, losses: 1, futureData},
    'known warlord records preserve fields owned by later builds');
  equal(loaded.warlords['future-warlord'], unknownBoss,
    'unknown future warlord records remain intact');
});

test.after(() => console.log(`Warlords: ${checks} metadata and save checks executed.`));
