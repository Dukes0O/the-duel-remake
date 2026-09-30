import assert from 'node:assert/strict';
import {test} from 'node:test';
import {normalizeProfile, loadPlayers, savePlayers, PLAYERS_KEY} from '../src/progression.js';

// SAVE-DAMAGED-FIELDS: only JSON-safe credits/winStreak corruption, supported
// scalar conversions, and preservation through the actual memory-only loader.
let checks = 0;
const equal = (actual, expected, label) => { checks++; assert.deepEqual(actual, expected, label); };
const includes = (actual, expected, label) => { checks++; assert.ok(actual?.includes(expected), label); };
const json = value => JSON.parse(JSON.stringify(value));

function profile(version) {
  return {
    version, credits: 1250, winStreak: 4,
    unlockedCars: ['falcone_f42', 'stuttgart_959s', 'aurora_gt', 'falcone_heritage'],
    upgrades: {falcone_f42: {engine: 2, nitro: 1}, aurora_gt: {suspension: 2}},
    drivers: {version: 1, unlocked: ['club', 'mara_vale'], selected: 'mara_vale'},
    courses: {version: 1, unlocked: ['pacific-canyon', 'harbor-highlands']},
    raceSettings: {version: 1, eventId: 'harbor-highlands', mode: 'timetrial',
      cpuDifficulty: 'hard', difficulty: 'pro', car: 'aurora_gt', routeVariant: 'route_b',
      lightingMood: 'golden', ghostEnabled: false},
    settledResults: ['race:past'], settledPoliceFines: ['fine:past'], pbBonusRuns: ['best:past'],
    personalBests: {'synthetic-preserved-best': 91.125}, milestones: ['clean_debut'],
    circuitWins: ['pacific-canyon'],
    history: [{key: 'past:0', won: true, reward: 600, timeSec: 91.125, note: 'preserved row'}],
    activeRace: {runId: 'pending-race', stageIndex: 0, car: 'falcone_f42',
      driverId: 'club', cpuDifficulty: 'medium', pendingPoliceFineCount: 2},
    wasteland: {version: 1, discoveredGate: true, xp: 3500, scrap: 875,
      settledResults: ['arena:past'], territories: {kettle: {hold: 25, claimed: false}},
      weapons: {version: 1, unlocked: ['ufo', 'bomb', 'crossbow', 'star'],
        levels: {ufo: 2, bomb: 1, crossbow: 3, star: 2}},
      unknownCareerField: {kept: true}},
    unknownProfileField: {kept: 'additive field'},
  };
}

function preserveValid(raw, loaded, damaged = null) {
  equal(loaded.version, 2, 'the supported profile loads as the current schema');
  for (const field of ['credits', 'winStreak']) if (field !== damaged)
    equal(loaded[field], raw[field], `the other valid numeric field ${field} survives`);
  for (const car of raw.unlockedCars) includes(loaded.unlockedCars, car, `owned car ${car} survives`);
  for (const [car, levels] of Object.entries(raw.upgrades))
    for (const [type, level] of Object.entries(levels)) equal(loaded.upgrades[car][type], level, `owned ${car}/${type} upgrade survives`);
  equal(loaded.drivers.selected, 'mara_vale', 'the selected earned driver survives');
  includes(loaded.drivers.unlocked, 'mara_vale', 'the earned driver stays unlocked');
  includes(loaded.courses.unlocked, 'harbor-highlands', 'the purchased course stays unlocked');
  for (const [field, value] of Object.entries(raw.raceSettings))
    equal(loaded.raceSettings[field], value, `valid race choice ${field} survives`);
  for (const field of ['settledResults', 'settledPoliceFines', 'pbBonusRuns', 'personalBests',
    'milestones', 'circuitWins', 'history', 'unknownProfileField'])
    equal(loaded[field], raw[field], `valid historical ${field} survives`);
  for (const [field, value] of Object.entries(raw.activeRace))
    equal(loaded.activeRace[field], value, `pending race ${field} survives`);
  for (const field of ['discoveredGate', 'xp', 'scrap', 'settledResults', 'unknownCareerField'])
    equal(loaded.wasteland[field], raw.wasteland[field], `valid Wasteland ${field} survives`);
  equal(loaded.wasteland.territories.kettle.hold, 25, 'earned Kettle hold survives');
  equal(loaded.wasteland.weapons.levels, {ufo: 2, bomb: 1, crossbow: 3, star: 2}, 'earned weapon levels survive');
}

function memoryRegistry(ownerProfile) {
  const raw = {version: 2, activePlayerId: 'synthetic-owner', players: [
    {id: 'synthetic-other', name: 'Other QA', profile: {version: 2, credits: 3333, winStreak: 2}},
    {id: 'synthetic-owner', name: 'Owner QA', profile: ownerProfile},
  ]};
  const values = new Map([[PLAYERS_KEY, JSON.stringify(raw)]]);
  let writes = 0;
  return {raw, values, get writes() { return writes; },
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { writes++; values.set(key, value); }};
}

const nonCallable = [['string', 'damaged'], ['null', null], ['number', 42],
  ['boolean', false], ['array', []], ['object', {}]];
for (const version of [1, 2]) for (const field of ['credits', 'winStreak'])
  for (const [variant, toString] of nonCallable) {
    test(`schema ${version} ${field} with own ${variant} toString normalizes only the damaged field`, () => {
      const raw = json({...profile(version), [field]: {toString}});
      const untouched = json(raw);
      let loaded;
      checks++;
      assert.doesNotThrow(() => { loaded = normalizeProfile(raw); },
        `schema ${version} damaged ${field}/${variant} must normalize without throwing`);
      equal(loaded[field], 0, `damaged ${field} uses its existing zero fallback`);
      preserveValid(raw, loaded, field);
      equal(raw, untouched, 'normalizing does not mutate the raw supported save');
    });
    test(`schema ${version} ${field}/${variant} loads the named memory owner and preserves progress`, () => {
      const raw = json({...profile(version), [field]: {toString}}), storage = memoryRegistry(raw);
      const before = storage.values.get(PLAYERS_KEY), loaded = loadPlayers(storage);
      equal(loaded.activePlayerId, 'synthetic-owner',
        `schema ${version} damaged ${field}/${variant} must not replace the named owner with default Player 1`);
      equal(loaded.players.map(p => [p.id, p.name]), [['synthetic-other', 'Other QA'], ['synthetic-owner', 'Owner QA']],
        'both exact named player identities survive loading');
      const owner = loaded.players.find(p => p.id === 'synthetic-owner');
      equal(owner.profile[field], 0, 'only the unusable numeric field falls back to zero');
      preserveValid(raw, owner.profile, field);
      equal(loaded.players[0].profile.credits, 3333, 'the other named player keeps their bank');
      equal(loaded.players[0].profile.winStreak, 2, 'the other named player keeps their streak');
      equal(storage.writes, 0, 'loading does not silently rewrite the damaged source registry');
      equal(storage.values.get(PLAYERS_KEY), before, 'loading preserves the exact stored bytes');
      equal(savePlayers(loaded, storage), true, 'the recovered supported registry can save to memory');
      equal(storage.writes, 1, 'the explicit save uses one registry write');
      const reloaded = loadPlayers(storage);
      equal(reloaded.activePlayerId, 'synthetic-owner', 'explicit save keeps the recovered named owner');
      preserveValid(raw, reloaded.players[1].profile, field);
    });
  }

for (const version of [1, 2]) test(`schema ${version} valid historical progress remains intact`, () => {
  const raw = profile(version), normalized = normalizeProfile(raw);
  preserveValid(raw, normalized);
  const storage = memoryRegistry(raw), loaded = loadPlayers(storage);
  equal(loaded.activePlayerId, 'synthetic-owner', 'valid named owner loads unchanged');
  preserveValid(raw, loaded.players[1].profile);
});

// Literal existing conversion expectations: flooring, zero fallback and the
// distinct public limits for credits (1 billion) and winStreak (1 million).
const scalarCases = [
  ['zero', 0, 0, 0], ['positive fraction', 17.9, 17, 17],
  ['numeric fraction string', '123.9', 123, 123], ['spaced numeric string', ' 42 ', 42, 42],
  ['exponent string', '1e3', 1000, 1000], ['negative number', -12, 0, 0],
  ['negative string', '-8.2', 0, 0], ['large number', 1_234_567_890, 1_000_000_000, 1_000_000],
  ['large numeric string', '2000000001', 1_000_000_000, 1_000_000],
  ['empty string', '', 0, 0], ['whitespace string', '   ', 0, 0], ['nonnumeric string', 'invalid', 0, 0],
  ['null', null, 0, 0], ['absent', undefined, 0, 0], ['true', true, 1, 1], ['false', false, 0, 0],
  ['infinite number', Infinity, 1_000_000_000, 1_000_000], ['not a number', NaN, 0, 0],
];
for (const version of [1, 2]) for (const [label, value, credits, winStreak] of scalarCases)
  test(`schema ${version} supported ${label} conversion remains unchanged`, () => {
    const loaded = normalizeProfile({...profile(version), credits: value, winStreak: value});
    equal(loaded.credits, credits, `credits preserves the existing ${label} conversion`);
    equal(loaded.winStreak, winStreak, `winStreak preserves the existing ${label} conversion`);
    equal(loaded.wasteland.scrap, 875, 'scalar normalization preserves the separate scrap bank');
    equal(loaded.personalBests, {'synthetic-preserved-best': 91.125}, 'scalar normalization preserves valid bests');
  });

test.after(() => console.log(`Damaged profile fields: ${checks} acceptance checks executed.`));
