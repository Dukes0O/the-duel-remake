import assert from 'node:assert/strict';
import {test, after} from 'node:test';
import * as weapons from '../src/weapon-upgrades.js';
import {createProfile, normalizeProfile, createPlayerRegistry, replacePlayerProfile,
  loadPlayers, savePlayers, PLAYERS_KEY} from '../src/progression.js';
import {normalizeWasteland} from '../src/wasteland-progress.js';
import {availableCarWeapons, getCarLoadout, equipCarWeapon} from '../src/car-loadout.js';
import {makeRng} from '../src/rng.js';

const STARTERS = ['ufo', 'bomb', 'crossbow', 'star'];
const ENABLED = {wastelandEnabled: true, arsenalEnabled: true};
let checks = 0;
const eq = (a, b, message) => {checks++; assert.deepEqual(a, b, message);};
const ok = (value, message) => {checks++; assert.ok(value, message);};
function api(name) {
  eq(typeof weapons[name], 'function', 'DEFERRED SAVE HOOK: weapon-upgrades.' + name + ' must exist');
  return weapons[name];
}
function career(rank = 2, scrap = 2000) {
  const profile = createProfile(); let xp = 0;
  for (let current = 1; current < rank; current++) xp += 400 + 150 * (current - 1);
  profile.credits = 9000;
  profile.wasteland = normalizeWasteland({...profile.wasteland,
    discoveredGate: true, xp, scrap});
  eq(profile.wasteland.rank, rank, 'the actual rank calculation creates the named rank fixture');
  return profile;
}
function memoryStorage() {
  const values = new Map();
  return {getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)};
}

test('SAVE CONTROL: fresh and malformed profiles never grant unearned arsenal weapons', () => {
  eq(weapons.WEAPON_IDS, STARTERS, 'WEAPON_IDS remains the four original starters');
  for (const value of [undefined, {}, {weapons: {unlocked: null, levels: {oil: 3}}}]) {
    const saved = normalizeWasteland(value);
    eq(saved.weapons.unlocked, STARTERS, 'normalization grants only the owned starters');
    eq(getCarLoadout({wasteland: saved}).length, 4, 'fresh loadout remains exactly four slots');
  }
});

test('SAVE CONTROL: old credit-bought starter upgrades retain the larger nested level', () => {
  const loaded = normalizeProfile({...createProfile(), weapons: {levels: {ufo: 2, bomb: 1}},
    wasteland: {version: 1, weapons: {levels: {ufo: 1, bomb: 3}}}});
  eq(loaded.wasteland.weapons.levels, {ufo: 2, bomb: 3, crossbow: 0, star: 0},
    'legacy owned upgrades migrate without a second charge');
  eq(Object.hasOwn(loaded, 'weapons'), false, 'legacy weapon field is removed after migration');
  eq(loaded.wasteland.weapons.unlocked, STARTERS, 'migration grants no arsenal ids');
});

test('SAVE CONTROL: future Wasteland schemas stay opaque and cannot be written', () => {
  const future = {...career(), wasteland: {version: 8, discoveredGate: true,
    weapons: {unlocked: ['ion-cannon'], levels: {'ion-cannon': 9}, future: {kept: true}},
    loadout: ['ion-cannon'], futureCareer: {kept: true}}};
  eq(normalizeProfile(future).wasteland, future.wasteland, 'unknown schema remains byte-equivalent');
  const storage = memoryStorage(), registry = createPlayerRegistry(future);
  storage.setItem(PLAYERS_KEY, 'sentinel');
  eq(savePlayers(registry, storage), false, 'older game cannot overwrite a future career');
  eq(storage.getItem(PLAYERS_KEY), 'sentinel', 'failed save keeps existing raw data');
  const upgraded = weapons.purchaseWeaponUpgrade(future, 'ufo', ENABLED);
  eq(upgraded.ok, false, 'future schema blocks even starter upgrades');
  eq(upgraded.profile, future, 'future upgrade refusal returns the untouched object');
});

test('SAVE: earned and future weapon ids, levels and nested fields survive normalization', () => {
  const source = career();
  source.wasteland.weapons = {version: 1, unlocked: [...STARTERS, 'oil', 'future-cannon'],
    levels: {ufo: 2, oil: 1, 'future-cannon': 2}, futureWeaponData: {id: 'kept'}};
  source.wasteland.loadout = ['oil', 'future-cannon', 'crossbow', 'star'];
  const loaded = normalizeProfile(source);
  ok(loaded.wasteland.weapons.unlocked.includes('oil'), 'SAVE: earned oil cannot be dropped during normalization');
  ok(loaded.wasteland.weapons.unlocked.includes('future-cannon'), 'future earned id remains preserved');
  eq(loaded.wasteland.weapons.levels.oil, 1, 'owned oil level survives');
  eq(loaded.wasteland.weapons.levels['future-cannon'], 2, 'future weapon level survives');
  eq(loaded.wasteland.weapons.futureWeaponData, {id: 'kept'}, 'unknown weapon fields survive');
  eq(loaded.wasteland.loadout, source.wasteland.loadout, 'saved future slot identities are not erased');
  eq(normalizeProfile(loaded).wasteland, loaded.wasteland, 'normalization stays idempotent');
});

test('SAVE: a purchased oil weapon costs exactly 400 scrap, retains credits and is idempotent', () => {
  const source = career(), before = structuredClone(source), purchase = api('purchaseArsenalWeapon');
  const bought = purchase(source, 'oil', ENABLED);
  eq(bought.ok, true, 'rank-two discovered player can purchase implemented oil');
  eq(bought.cost, 400, 'new weapon price is exactly 400 scrap');
  eq(bought.profile.wasteland.scrap, 1600, 'only scrap pays for the purchase');
  eq(bought.profile.credits, 9000, 'racing credits stay unchanged');
  ok(bought.profile.wasteland.weapons.unlocked.includes('oil'), 'purchase persists actual earned ownership');
  eq(source, before, 'pure purchase never mutates its input profile');
  const again = purchase(bought.profile, 'oil', ENABLED);
  eq(again.profile.wasteland.scrap, 1600, 'repeat purchase cannot charge twice');
  eq(again.profile.wasteland.weapons.unlocked.filter(id => id === 'oil').length, 1,
    'repeat purchase never duplicates ownership');
});

for (const condition of ['rank', 'switch', 'discovery', 'balance', 'unimplemented', 'future']) {
  test('SAVE: arsenal purchase rejects the ' + condition + ' guard', () => {
    const profile = career(condition === 'rank' ? 1 : 2, condition === 'balance' ? 399 : 2000);
    const opts = {...ENABLED}; let id = 'oil';
    if (condition === 'switch') opts.arsenalEnabled = false;
    if (condition === 'discovery') profile.wasteland.discoveredGate = false;
    if (condition === 'unimplemented') id = 'future-cannon';
    if (condition === 'future') profile.wasteland.version = 8;
    const before = structuredClone(profile), result = api('purchaseArsenalWeapon')(profile, id, opts);
    eq(result.ok, false, 'guard rejects invalid or unavailable weapon purchase');
    eq(result.profile, profile, 'refused transaction retains its original profile');
    eq(profile, before, 'refused transaction cannot consume scrap or ownership');
  });
}

test('SAVE: offered arsenal honors oil rank2, smoke rank6, implementation and discovery', () => {
  const offered = api('offeredArsenalWeapons');
  const options = {arsenalEnabled: true, implemented: ['oil', 'smoke']};
  eq(offered(career(1), options), [], 'rank one has no new purchase offers');
  eq(offered(career(2), options), ['oil'], 'oil first appears at rank two');
  eq(offered(career(5), options), ['oil'], 'smoke remains hidden before rank six');
  eq(offered(career(6), options), ['oil', 'smoke'], 'rank six admits smoke');
  eq(offered(career(30), {...options, implemented: ['oil']}), ['oil'], 'unbuilt smoke is never offered');
  eq(offered(career(30), {...options, arsenalEnabled: false}), [], 'switch off hides new offers');
  const unknown = career(30); unknown.wasteland.discoveredGate = false;
  eq(offered(unknown, options), [], 'undiscovered player sees no arsenal offers');
});

test('SAVE: earned Dustmonger entitlement unlocks smoke free below rank6 without enabling purchases', () => {
  const profile = career(1, 0);
  // Existing receipt shape: version1 career.warlords.<id>.defeated, the same
  // settled-defeat entitlement that current Sal reward code reads.
  profile.wasteland.warlords.dustmonger = {defeated: true, wins: 1, losses: 0};
  const grant = api('rewardArsenalWeapon');
  const result = grant(profile, 'smoke', {warlordId: 'dustmonger'});
  eq(result.ok, true, 'existing earned defeat can deliver its implemented weapon early');
  ok(result.profile.wasteland.weapons.unlocked.includes('smoke'), 'free reward records earned ownership');
  eq(result.profile.wasteland.scrap, 0, 'reward never spends scrap');
  eq(result.profile.credits, profile.credits, 'reward never spends racing credits');
  eq(result.profile.wasteland.rank, 1, 'reward never fabricates rank');
  eq(grant(result.profile, 'smoke', {warlordId: 'dustmonger'}).profile.wasteland.weapons.unlocked,
    result.profile.wasteland.weapons.unlocked, 'repeated reward is idempotent');
  const unearned = career(1, 0);
  const refused = grant(unearned, 'smoke', {warlordId: 'dustmonger'});
  eq(refused.ok, false, 'warlord name alone cannot mint a reward without earned defeat');
  eq(refused.profile, unearned, 'unearned reward keeps the original career');
});

test('SAVE: new owned weapons use all three existing scrap upgrade prices and stop at level3', () => {
  let profile = career(6, 2000);
  profile.wasteland.weapons.unlocked.push('oil'); profile.wasteland.weapons.levels.oil = 0;
  for (const [level, cost] of [[1, 150], [2, 300], [3, 600]]) {
    const before = profile.wasteland.scrap;
    const result = weapons.purchaseWeaponUpgrade(profile, 'oil', ENABLED);
    eq(result.ok, true, 'SAVE: earned implemented oil can use the existing upgrade transaction');
    eq(result.cost, cost, 'new weapon uses existing three-level scrap price');
    eq(result.profile.wasteland.weapons.levels.oil, level, 'upgrade adds exactly one level');
    eq(result.profile.wasteland.scrap, before - cost, 'upgrade spends exact scrap');
    eq(result.profile.credits, 9000, 'new upgrade never spends racing credits');
    profile = result.profile;
  }
  eq(weapons.purchaseWeaponUpgrade(profile, 'oil', ENABLED).ok, false, 'level three is the maximum');
});

test('SAVE: an owned implemented oil equips into four unique slots while a locked weapon cannot', () => {
  const profile = career(); profile.wasteland.weapons.unlocked.push('oil');
  ok(availableCarWeapons(profile, ENABLED).includes('oil'), 'SAVE: implemented earned oil becomes available');
  const result = equipCarWeapon(profile, 0, 'oil', ENABLED);
  eq(result.ok, true, 'owned oil can enter a saved slot');
  eq(getCarLoadout(result.profile, ENABLED)[0], 'oil', 'selected new weapon persists in the selected slot');
  eq(result.loadout.length, 4, 'new weapons never add a fifth slot');
  eq(new Set(result.loadout).size, 4, 'loadout never duplicates a weapon');
  eq(equipCarWeapon(profile, 0, 'smoke', ENABLED).ok, false, 'unearned smoke cannot be equipped');
  eq(equipCarWeapon(profile, 4, 'oil', ENABLED).ok, false, 'an out-of-range slot cannot be equipped');
});

test('SAVE: starter purchase/equip changes preserve unknown earned ids and fields', () => {
  const profile = career();
  profile.wasteland.weapons.unlocked.push('future-cannon');
  profile.wasteland.weapons.levels['future-cannon'] = 2;
  profile.wasteland.weapons.future = {curve: [1, 2]};
  const result = weapons.purchaseWeaponUpgrade(profile, 'ufo', ENABLED);
  eq(result.ok, true, 'ordinary starter upgrade remains available');
  ok(result.profile.wasteland.weapons.unlocked.includes('future-cannon'),
    'SAVE: starter upgrade cannot erase a future earned weapon');
  eq(result.profile.wasteland.weapons.levels['future-cannon'], 2, 'starter upgrade keeps unknown levels');
  eq(result.profile.wasteland.weapons.future, {curve: [1, 2]}, 'starter upgrade keeps unknown fields');
});

test('SAVE: named player purchase, upgrade and equip survive actual registry roundtrip in memory', () => {
  const first = career(), second = normalizeProfile(career()), secondBefore = structuredClone(second);
  let registry = createPlayerRegistry(first);
  registry.players.push({id: 'player-2', name: 'Second', profile: second});
  const bought = api('purchaseArsenalWeapon')(registry.players[0].profile, 'oil', ENABLED);
  eq(bought.ok, true, 'first named player buys oil');
  const upgraded = weapons.purchaseWeaponUpgrade(bought.profile, 'oil', ENABLED);
  eq(upgraded.ok, true, 'first named player upgrades owned oil');
  const equipped = equipCarWeapon(upgraded.profile, 1, 'oil', ENABLED);
  eq(equipped.ok, true, 'first named player equips owned oil');
  registry = replacePlayerProfile(registry, 'player-1', equipped.profile);
  const storage = memoryStorage(); eq(savePlayers(registry, storage), true, 'actual registry writes only memory storage');
  const loaded = loadPlayers(storage);
  ok(loaded.players[0].profile.wasteland.weapons.unlocked.includes('oil'), 'purchase survives serialization');
  eq(loaded.players[0].profile.wasteland.weapons.levels.oil, 1, 'upgrade survives serialization');
  eq(getCarLoadout(loaded.players[0].profile, ENABLED)[1], 'oil', 'equip survives serialization');
  eq(loaded.players[1].profile, secondBefore, 'second named career stays unchanged');
});

test('SAVE: CPU four-slot loadout uses seeded selection and only eligible implemented weapons', () => {
  const select = api('cpuArsenalLoadout');
  for (const difficulty of ['easy', 'medium', 'hard']) for (const rank of [1, 2, 6, 30]) {
    const opts = {implemented: ['oil', 'smoke'], rng: makeRng(1989)};
    const loadout = select(rank, difficulty, opts);
    eq(loadout.length, 4, 'every actual CPU policy produces four slots');
    eq(new Set(loadout).size, 4, 'CPU selection never repeats a weapon');
    ok(loadout.every(id => STARTERS.includes(id) || id === 'oil' && rank >= 2 || id === 'smoke' && rank >= 6),
      'CPU only selects rank-eligible implemented starters or wave-one weapons');
    eq(loadout, select(rank, difficulty, {implemented: ['oil', 'smoke'], rng: makeRng(1989)}),
      'same seeded generator reproduces CPU loadout');
  }
});

after(() => console.log('Arsenal save: ' + checks + ' acceptance checks reached.'));


test('SAVE: free warlord reward stays with its named player through registry reload', () => {
  const first = career(1, 0), second = normalizeProfile(career(1, 0)), secondBefore = structuredClone(second);
  first.wasteland.warlords.dustmonger = {defeated: true, wins: 1, losses: 0};
  const registry = createPlayerRegistry(first);
  registry.players.push({id: 'player-2', name: 'Second', profile: second});
  const reward = api('rewardArsenalWeapon')(registry.players[0].profile, 'smoke', {warlordId: 'dustmonger'});
  eq(reward.ok, true, 'the first named career receives its earned reward');
  const updated = replacePlayerProfile(registry, 'player-1', reward.profile), storage = memoryStorage();
  eq(savePlayers(updated, storage), true, 'named reward persists using actual memory-only registry storage');
  const loaded = loadPlayers(storage);
  ok(loaded.players[0].profile.wasteland.weapons.unlocked.includes('smoke'), 'earned reward survives reload');
  eq(loaded.players[1].profile, secondBefore, 'unrelated named player receives no free weapon or other change');
});


test('SAVE CONTROL: registry normalization alone preserves raw inputs and canonical named careers', () => {
  const zeroUpgrades = {engine: 0, nitro: 0, handling: 0, tires: 0, brakes: 0, suspension: 0, tank: 0};
  for (const [rank, scrap] of [[2, 2000], [1, 0]]) {
    const raw = career(rank, scrap), before = structuredClone(raw);
    eq(raw.upgrades, {}, 'the raw createProfile fixture has no per-car defaults yet');
    const expected = {...before, upgrades: {
      falcone_f42: {...zeroUpgrades}, stuttgart_959s: {...zeroUpgrades},
    }};
    const registry = createPlayerRegistry(career(rank, scrap));
    registry.players.push({id: 'player-2', name: 'Second', profile: raw});
    const storage = memoryStorage();
    eq(savePlayers(registry, storage), true, 'no-Arsenal raw registry writes only memory storage');
    eq(loadPlayers(storage).players[1].profile, expected,
      'without Arsenal calls only the established free-car upgrade defaults are added');
    eq(raw, before, 'registry normalization never mutates the raw second career');
    const canonical = normalizeProfile(raw), canonicalBefore = structuredClone(canonical);
    eq(canonical, expected, 'canonical fixture includes exactly the native defaults');
    eq(normalizeProfile(canonical), canonicalBefore, 'canonical normalization is idempotent');
    const normalizedRegistry = createPlayerRegistry(career(rank, scrap));
    normalizedRegistry.players.push({id: 'player-2', name: 'Second', profile: canonical});
    const canonicalStorage = memoryStorage();
    eq(savePlayers(normalizedRegistry, canonicalStorage), true, 'canonical registry writes only memory storage');
    eq(loadPlayers(canonicalStorage).players[1].profile, canonicalBefore,
      'the whole canonical second-player profile survives a no-Arsenal roundtrip exactly');
    eq(canonical, canonicalBefore, 'canonical registry roundtrip never mutates the second career');
  }
});


// Independently authored preservation regression. These are boundary witnesses,
// not new limits on supported owned identities or saved future slots.
const OWNED_IDENTITY_CASES = ['duplicate-prefix', '101-distinct', '81-character'];
function ownedIdentityFixture(kind) {
  const profile = career(6, 4000);
  const late = kind === 'duplicate-prefix' ? 'oil' : kind === '101-distinct'
    ? 'future-owned-96' : 'future-' + 'x'.repeat(74);
  const identities = kind === 'duplicate-prefix' ? [...Array(100).fill('ufo'), 'oil'] :
    kind === '101-distinct' ? [...STARTERS, ...Array.from({length: 97}, (_, i) => 'future-owned-' + i)] :
      [...STARTERS, late];
  const owned = [...new Set([...STARTERS, ...identities])];
  const levels = Object.fromEntries(owned.map((id, i) => [id, i % 3]));
  levels[late] = 2;
  profile.wasteland.weapons = {version: 1, unlocked: identities, levels,
    futureWeaponData: {kind, nested: {keep: true, curve: [0, .5, 1]}, receipt: 'earned'}};
  profile.wasteland.loadout = [late, 'bomb', 'crossbow', 'star'];
  profile.wasteland.futureOwnedRegistryData = {owner: 'player-1', bytes: [11, 29]};
  return {profile, expected: {owned, levels: structuredClone(levels),
    fields: structuredClone(profile.wasteland.weapons.futureWeaponData),
    careerFields: structuredClone(profile.wasteland.futureOwnedRegistryData),
    slots: [...profile.wasteland.loadout]}};
}
function ownedIdentityOutcome(kind, path) {
  const {profile, expected} = ownedIdentityFixture(kind), before = structuredClone(profile);
  let result;
  const reload = value => {
    const storage = memoryStorage(), registry = createPlayerRegistry(value);
    eq(savePlayers(registry, storage), true, 'real owned-identity registry saves to disposable memory');
    return loadPlayers(storage).players[0].profile;
  };
  if (path === 'normalize') result = normalizeProfile(profile);
  else if (path === 'registry') result = reload(profile);
  else if (path === 'purchase') {
    const bought = weapons.purchaseArsenalWeapon(profile, 'smoke', ENABLED);
    eq(bought.ok, true, 'other known weapon smoke is actually purchased at the eligible rank');
    result = reload(bought.profile);
    expected.owned.push('smoke'); expected.levels.smoke = 0;
  } else {
    const equipped = equipCarWeapon(profile, 1, 'ufo', ENABLED);
    eq(equipped.ok, true, 'other known starter ufo is actually equipped into a different saved slot');
    result = reload(equipped.profile);
    expected.slots[1] = 'ufo';
  }
  eq(profile, before, 'normalization, save and known-weapon actions cannot mutate the raw earned source');
  return {result, expected};
}
for (const kind of OWNED_IDENTITY_CASES) for (const path of ['normalize', 'registry', 'purchase', 'equip']) {
  test('SAVE PRESERVATION: ' + kind + '/' + path + ' retains every earned owned identity', () => {
    const {result, expected} = ownedIdentityOutcome(kind, path);
    eq(result.wasteland.weapons.unlocked, expected.owned,
      kind + '/' + path + ': full earned ownership must survive without an arbitrary count or length cap');
  });
  test('SAVE PRESERVATION: ' + kind + '/' + path + ' retains every owned level', () => {
    const {result, expected} = ownedIdentityOutcome(kind, path);
    eq(result.wasteland.weapons.levels, expected.levels,
      kind + '/' + path + ': every earned and future level must survive exactly');
  });
  test('SAVE PRESERVATION: ' + kind + '/' + path + ' retains nested unknown fields', () => {
    const {result, expected} = ownedIdentityOutcome(kind, path);
    eq(result.wasteland.weapons.futureWeaponData, expected.fields,
      'nested unknown weapon fields survive the real save and known-weapon action');
    eq(result.wasteland.futureOwnedRegistryData, expected.careerFields,
      'nested unknown career fields survive the real save and known-weapon action');
  });
  test('SAVE PRESERVATION: ' + kind + '/' + path + ' retains FOUR unique saved slots', () => {
    const {result, expected} = ownedIdentityOutcome(kind, path);
    eq(result.wasteland.loadout, expected.slots,
      kind + '/' + path + ': losing an owned identity must never delete or replace its saved slot');
    eq(result.wasteland.loadout.length, 4, 'the actual saved profile still contains exactly FOUR slots');
    eq(new Set(result.wasteland.loadout).size, 4, 'the actual saved slots retain unique identities');
  });
}

// PROSPECTIVE ARS-CORE registry wiring, 1 October 2026. Production WEAPONS
// is frozen and has only starters today. This in-memory dependency fixture
// predicts Oil/Smoke registration; it is not a current-gameplay bug or a
// mutation of that registry. Run the actual consumer, changing imports only.
let prospectiveLoadoutPromise;
function prospectiveArsenalLoadout() {
  if (!prospectiveLoadoutPromise) prospectiveLoadoutPromise = (async () => {
    const {readFile} = await import('node:fs/promises');
    const consumerUrl = new URL('../src/car-loadout.js', import.meta.url);
    const combatUrl = new URL('../src/combat.js', import.meta.url).href;
    const {WEAPONS: productionRegistry} = await import(combatUrl);
    const dataUrl = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
    // ARSENAL section 3 settles names and 10/14-second recharge. The real
    // starter definitions are imported, rather than copied or imitated.
    const registryUrl = dataUrl(`import {WEAPONS as starters} from ${JSON.stringify(combatUrl)};
export const WEAPONS = Object.freeze({...starters,
  oil: Object.freeze({name: 'OIL SLICK', cooldown: 10}),
  smoke: Object.freeze({name: 'SMOKE SCREEN', cooldown: 14})});`);
    const originalSource = await readFile(consumerUrl, 'utf8');
    const routedSource = originalSource.replace(/from\s+(['"])([^'"]+)\1/g,
      (_match, _quote, specifier) => 'from ' + JSON.stringify(specifier === './combat.js'
        ? registryUrl : new URL(specifier, consumerUrl).href));
    return {loadout: await import(dataUrl(routedSource)),
      registry: (await import(registryUrl)).WEAPONS, productionRegistry,
      productionBefore: Object.getOwnPropertyDescriptors(productionRegistry),
      originalSource, routedSource};
  })();
  return prospectiveLoadoutPromise;
}
function prospectiveOwnedCareer(discovered = true) {
  const raw = career(6, 4000);
  raw.wasteland.discoveredGate = discovered;
  raw.wasteland.weapons = {version: 1, unlocked: [...STARTERS, 'oil', 'smoke', 'future-cannon'],
    levels: {ufo: 2, bomb: 0, crossbow: 0, star: 0, oil: 1, smoke: 2, 'future-cannon': 9},
    futureWeaponData: {receipt: 'earned', nested: {keep: [3, 7, 11]}}};
  raw.wasteland.loadout = ['oil', 'smoke', 'future-cannon', 'star'];
  raw.wasteland.futureCareerData = {territory: 'kept', receipt: {owner: 'player-1'}};
  raw.futureProfileData = {garage: ['keep'], receipt: 'racing'};
  const before = structuredClone(raw), canonical = normalizeProfile(raw);
  return {raw, before, canonical, canonicalBefore: structuredClone(canonical)};
}
const PROSPECTIVE_GATES = [
  {name: 'default-view', options: {}, allowed: []},
  {name: 'dev-off', options: {...ENABLED, arsenalEnabled: false}, allowed: []},
  {name: 'wasteland-off', options: {...ENABLED, wastelandEnabled: false}, allowed: []},
  {name: 'undiscovered', discovered: false, options: {...ENABLED}, allowed: []},
  {name: 'unimplemented', options: {...ENABLED, implemented: []}, allowed: []},
  {name: 'oil-only', options: {...ENABLED, implemented: ['oil']}, allowed: ['oil']},
  {name: 'smoke-only', options: {...ENABLED, implemented: ['smoke']}, allowed: ['smoke']},
];

test('SAVE PROSPECTIVE: registry fixture runs the native consumer with only import routing changed', async () => {
  const fixture = await prospectiveArsenalLoadout();
  const removeImports = source => source.replace(/^import[^\n]*\n/gm, '');
  eq(removeImports(fixture.routedSource), removeImports(fixture.originalSource),
    'prospective fixture preserves every native loadout consumer byte outside imports');
  for (const id of STARTERS) eq(fixture.registry[id], fixture.productionRegistry[id],
    'prospective dictionary uses each genuine production starter definition');
  eq(fixture.registry.oil, {name: 'OIL SLICK', cooldown: 10}, 'prospective Oil uses the settled recharge');
  eq(fixture.registry.smoke, {name: 'SMOKE SCREEN', cooldown: 14}, 'prospective Smoke uses the settled recharge');
  eq(Object.getOwnPropertyDescriptors(fixture.productionRegistry), fixture.productionBefore,
    'prospective dependency creation never changes the genuine production registry');
});

for (const guard of PROSPECTIVE_GATES) {
  test('SAVE PROSPECTIVE: registered Arsenal availability respects ' + guard.name, async () => {
    const {loadout} = await prospectiveArsenalLoadout();
    const witness = prospectiveOwnedCareer(guard.discovered ?? true);
    const actual = loadout.availableCarWeapons(witness.canonical, guard.options);
    eq(witness.raw, witness.before, 'prospective gate fixture normalization keeps its complete raw input');
    eq(witness.canonical, witness.canonicalBefore, 'prospective availability read preserves the complete canonical profile');
    eq(actual, [...STARTERS, ...guard.allowed],
      'prospective ' + guard.name + ': registered-owned Oil/Smoke cannot bypass the Arsenal availability guards');
  });
  test('SAVE PROSPECTIVE: runtime slots exclude registered Arsenal under ' + guard.name, async () => {
    const {loadout} = await prospectiveArsenalLoadout();
    const witness = prospectiveOwnedCareer(guard.discovered ?? true);
    const actual = loadout.getCarLoadout(witness.canonical, guard.options);
    eq(witness.canonical, witness.canonicalBefore,
      'filtering usable slots never erases earned ownership or exact saved future slots');
    const expected = guard.allowed.length ? [guard.allowed[0], 'star', 'ufo', 'bomb']
      : ['star', 'ufo', 'bomb', 'crossbow'];
    eq(actual, expected, 'prospective ' + guard.name + ': actual runtime slots contain only admitted registered weapons');
  });
  for (const id of ['oil', 'smoke'].filter(id => !guard.allowed.includes(id))) {
    test('SAVE PROSPECTIVE: native equip rejects registered ' + id + ' under ' + guard.name, async () => {
      const {loadout} = await prospectiveArsenalLoadout();
      const witness = prospectiveOwnedCareer(guard.discovered ?? true);
      const result = loadout.equipCarWeapon(witness.canonical, 3, id, guard.options);
      eq(witness.raw, witness.before, 'registered weapon equip attempt keeps the complete raw source');
      eq(witness.canonical, witness.canonicalBefore, 'registered weapon equip attempt keeps its complete input profile');
      eq(result.ok, false, 'prospective ' + guard.name + ': native equip must reject excluded registered ' + id);
      eq(result.profile, witness.canonical, 'prospective rejected equip returns the untouched original profile');
    });
  }
}

test('SAVE PROSPECTIVE: eligible earned registered weapons work while starters and future slots survive', async () => {
  const {loadout} = await prospectiveArsenalLoadout();
  const witness = prospectiveOwnedCareer(), options = {...ENABLED, implemented: ['oil', 'smoke']};
  eq(loadout.availableCarWeapons(witness.canonical, options), [...STARTERS, 'oil', 'smoke'],
    'positive eligible ownership exposes all four starters and both registered implemented weapons');
  eq(loadout.getCarLoadout(witness.canonical, options), ['oil', 'smoke', 'star', 'ufo'],
    'usable slots retain eligible Oil/Smoke and fill four unique usable choices');
  for (const [id, expected] of [['oil', ['star', 'smoke', 'future-cannon', 'oil']],
    ['smoke', ['oil', 'star', 'future-cannon', 'smoke']]]) {
    const result = loadout.equipCarWeapon(witness.canonical, 3, id, options);
    eq(result.ok, true, 'positive native equip admits earned registered ' + id);
    const expectedProfile = {...witness.canonicalBefore,
      wasteland: {...witness.canonicalBefore.wasteland, loadout: expected}};
    eq(result.profile, expectedProfile, 'native equip changes only selected/swapped slots, preserving the entire career');
    eq(result.loadout.length, 4, 'registered weapon equip still has exactly four saved slots');
    eq(new Set(result.loadout).size, 4, 'registered weapon equip keeps all four saved identities unique');
  }
  eq(witness.raw, witness.before, 'positive registered equip leaves the complete raw profile unchanged');
  eq(witness.canonical, witness.canonicalBefore, 'positive registered equip never mutates the canonical source');
  eq(normalizeProfile(witness.canonical), witness.canonicalBefore,
    'registered dictionary does not change idempotent native profile normalization');
});

test('SAVE PROSPECTIVE: registered weapons never create unearned ownership or usable future ids', async () => {
  const {loadout} = await prospectiveArsenalLoadout();
  const fresh = normalizeProfile(career(6)), before = structuredClone(fresh);
  eq(loadout.availableCarWeapons(fresh, {...ENABLED, implemented: ['oil', 'smoke']}), STARTERS,
    'registered implemented dictionary alone never grants owned weapons');
  for (const id of ['oil', 'smoke', 'future-cannon']) eq(loadout.equipCarWeapon(fresh, 0, id, ENABLED).ok,
    false, 'unearned or unknown registered-view weapon cannot enter an actual saved slot');
  eq(fresh, before, 'unearned registered equip attempts preserve the complete actual profile');
});

test('SAVE PROSPECTIVE: registered dependency preserves both complete named careers through real memory registry', async () => {
  const fixture = await prospectiveArsenalLoadout(), witness = prospectiveOwnedCareer();
  const second = normalizeProfile(career(1, 0));
  second.futureProfileData = {name: 'Second', nested: {only: 'player-2'}};
  const secondBefore = structuredClone(second), options = {...ENABLED, implemented: ['oil', 'smoke']};
  const equipped = fixture.loadout.equipCarWeapon(witness.canonical, 3, 'oil', options);
  eq(equipped.ok, true, 'first named player performs a real native registered-weapon equip');
  let registry = createPlayerRegistry(witness.canonical);
  registry.players.push({id: 'player-2', name: 'Second', profile: second});
  registry = replacePlayerProfile(registry, 'player-1', equipped.profile);
  const storage = memoryStorage();
  eq(savePlayers(registry, storage), true, 'genuine named registry saves registered-view profiles only to memory');
  const bytes = storage.getItem(PLAYERS_KEY), loaded = loadPlayers(storage);
  eq(loaded.players[0].profile, equipped.profile,
    'the complete first named profile, ownership, levels, receipts and future slot survive serialization');
  eq(loaded.players[1].profile, secondBefore, 'the complete other named career receives no Arsenal ownership or slot change');
  eq(loaded.players[0].profile.wasteland.loadout, ['star', 'smoke', 'future-cannon', 'oil'],
    'exact four unique registered and future saved slot identities survive real reload');
  eq(fixture.loadout.availableCarWeapons(loaded.players[0].profile, options), [...STARTERS, 'oil', 'smoke'],
    'the eligible first named career retains its registered usable offer after reload');
  eq(fixture.loadout.availableCarWeapons(loaded.players[1].profile, options), STARTERS,
    'the other named career has only its own four starters after reload');
  eq(storage.getItem(PLAYERS_KEY), bytes, 'native registry reload never rewrites raw stored profile bytes');
  eq(witness.raw, witness.before, 'native registry and registered equip leave the complete raw first source unchanged');
  eq(witness.canonical, witness.canonicalBefore, 'native registry and registered equip leave the canonical first source unchanged');
  eq(second, secondBefore, 'native registry never mutates the complete second source');
  eq(Object.getOwnPropertyDescriptors(fixture.productionRegistry), fixture.productionBefore,
    'all prospective gate and registry paths leave the production dictionary untouched');
});
