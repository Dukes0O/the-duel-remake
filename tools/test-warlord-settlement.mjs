import assert from 'node:assert/strict';
import {test} from 'node:test';
import {App} from '../src/app.js';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {createProfile, normalizeProfile, loadPlayers, replacePlayerProfile, savePlayers} from '../src/progression.js';
import {startWarlordEvent} from '../src/arena/warlord-event.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {getEquippedArmorKit} from '../src/armor-kits.js';
import {arenaResultsScreen} from '../src/screen-arena.js';
import {screenMetric, screenAction} from '../src/screen-results.js';

let checks = 0, failWrites = false, writes = [];
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (value, message) => { checks++; assert.ok(value, message); };
const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(String(key)) ?? null,
  setItem: (key, value) => {
    if (failWrites) throw Error('synthetic save failure');
    values.set(String(key), String(value)); writes.push({key: String(key), value: String(value)});
  },
  removeItem: key => values.delete(String(key)),
};
globalThis.cancelAnimationFrame = () => {};
const flags = () => createFeatureFlags({storage: null, qa: true, search: '?flags=warlords'});
test.after(() => console.log('Warlord settlement: ' + checks + ' acceptance checks executed.'));
let modulePromise;
async function settlement() {
  const module = await (modulePromise ??= import('../src/arena/warlord-settlement.js').catch(error => {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && error.message.includes('warlord-settlement.js')) return null;
    throw error;
  }));
  ok(module && typeof module.settleWarlordResult === 'function',
    'WAR-02a-REWARD must expose pure settleWarlordResult before any reward can be awarded');
  return module.settleWarlordResult;
}
function profile() {
  const p = createProfile();
  return {...p, credits: 765, unknownProfile: {kept: true}, wasteland: {...p.wasteland,
    discoveredGate: true, scrap: 10, unknownWasteland: {kept: true},
    settledResults: ['old:result'],
    territories: {...p.wasteland.territories, sal: {hold: 100, claimed: false, unknownTerritory: 'kept'}},
    warlords: {...p.wasteland.warlords, sal: {defeated: false, wins: 0, losses: 0, unknownSal: {kept: true}},
      futureBoss: {futureRule: 17}}}};
}
function arena(winnerId = 'player') {
  const duel = new Duel({featureFlags: flags()});
  assert.equal(startWarlordEvent(duel, {warlordId: 'sal', car: 'falcone_f42'}), true);
  const a = structuredClone(duel.state.arena);
  a.phase = 'over';
  a.participants.find(p => p.id === winnerId).wrecks = 3;
  a.result = {winnerId, reason: 'three-wrecks', placings: winnerId === 'player' ? ['player', 'cpu-1'] : ['cpu-1', 'player']};
  return a;
}
const payload = (changes = {}) => ({runId: 'sal-run-1', ownerPlayerId: 'driver-a',
  activePlayerId: 'driver-a', arena: arena(), car: 'falcone_f42', ...changes});

test('first win atomically earns 150 scrap, Side Saws and territory with additive career fields', async () => {
  const settle = await settlement(), before = profile(), snapshot = structuredClone(before);
  writes = [];
  const first = settle(before, payload());
  equal(first.awarded, true, 'completed first win is accepted');
  equal(first.key, 'warlord:sal-run-1', 'marker shares the existing Wasteland result ledger');
  equal(first.scrapEarned, 150, 'first win pays exactly 150 independent of difficulty');
  equal(first.profile.wasteland.scrap, 160, 'first scrap is added once');
  equal(first.profile.wasteland.warlords.sal, {defeated: true, wins: 1, losses: 0, unknownSal: {kept: true}},
    'record stores the first win without removing unknown fields');
  equal(first.profile.wasteland.territories.sal, {hold: 100, claimed: true, unknownTerritory: 'kept'},
    'the single full-hold territory is claimed additively');
  equal(first.profile.wasteland.settledResults, ['old:result', 'warlord:sal-run-1'], 'marker belongs to this result');
  equal(getEquippedArmorKit(first.profile, 'falcone_f42'), 'side-saws', 'winning car is autoequipped in the same result');
  equal(first.profile.credits, before.credits, 'racing credits are unaffected');
  equal(first.profile.unknownProfile, before.unknownProfile, 'unknown root data survives');
  equal(first.profile.wasteland.unknownWasteland, before.wasteland.unknownWasteland, 'unknown career data survives');
  equal(first.profile.wasteland.warlords.futureBoss, before.wasteland.warlords.futureBoss, 'future boss data survives');
  equal(before, snapshot, 'pure settlement leaves the old snapshot untouched');
  equal(writes, [], 'pure settlement performs no storage writes');
});

test('repeat callbacks and reload cannot duplicate first-win reward or counts', async () => {
  const settle = await settlement(), first = settle(profile(), payload());
  const repeat = settle(first.profile, payload());
  equal(repeat.awarded, false, 'same fight is already settled');
  equal(repeat.profile, first.profile, 'duplicate keeps the exact committed profile');
  const reloaded = normalizeProfile(first.profile), afterLoad = settle(reloaded, payload());
  equal(afterLoad.awarded, false, 'load preserves the one-time marker');
  equal(afterLoad.profile.wasteland.scrap, 160, 'reloading does not repay the win');
  equal(afterLoad.profile.wasteland.warlords.sal.wins, 1, 'reloading does not recount the win');
});

test('a new rematch pays 25 only and preserves defeat, claim and all equipped kits', async () => {
  const settle = await settlement(), first = settle(profile(), payload());
  first.profile.wasteland.kits.falcone_f42.equipped = null;
  const rematch = settle(first.profile, payload({runId: 'sal-rematch'}));
  equal(rematch.awarded, true, 'a different completed fight settles');
  equal(rematch.scrapEarned, 25, 'rematch pays the settled 25 scrap');
  equal(rematch.profile.wasteland.scrap, 185, 'only first and rematch rewards enter the bank');
  equal(rematch.profile.wasteland.warlords.sal.wins, 2, 'rematch adds one win');
  equal(rematch.profile.wasteland.warlords.sal.losses, 0, 'win does not change losses');
  equal(rematch.profile.wasteland.territories.sal.claimed, true, 'territory stays claimed');
  equal(getEquippedArmorKit(rematch.profile, 'falcone_f42'), null, 'rematch does not override a later equip choice');
});

test('loss costs nothing and records one loss once without granting a reward', async () => {
  const settle = await settlement(), before = profile(), lossArena = arena('cpu-1');
  const first = settle(before, payload({arena: lossArena}));
  equal(first.awarded, true, 'a completed loss is one accepted transaction');
  equal(first.scrapEarned, 0, 'losing has no scrap payment or charge');
  equal(first.profile.wasteland.scrap, before.wasteland.scrap, 'saved scrap stays intact');
  equal(first.profile.credits, before.credits, 'saved credits stay intact');
  equal(first.profile.wasteland.warlords.sal.defeated, false, 'loss never records defeat');
  equal(first.profile.wasteland.warlords.sal.losses, 1, 'loss count increments once');
  equal(first.profile.wasteland.territories.sal.claimed, false, 'loss does not claim territory');
  equal(getEquippedArmorKit(first.profile, 'falcone_f42'), null, 'loss earns no kit');
  equal(settle(first.profile, payload({arena: lossArena})).profile.wasteland.warlords.sal.losses, 1,
    'repeat loss callback cannot increment again');
});

test('unfinished, abandoned, unsupported and stale-player results preserve the input', async () => {
  const settle = await settlement(), original = profile();
  for (const invalid of [
    payload({runId: ''}), payload({runId: 'x'.repeat(129)}),
    payload({ownerPlayerId: 'driver-b'}), payload({activePlayerId: 'driver-b'}),
    payload({arena: {...arena(), phase: 'fight'}}),
    payload({arena: {...arena(), phase: 'countdown', result: null}}),
    payload({arena: {...arena(), result: {...arena().result, reason: 'abandoned'}}}),
    payload({arena: {...arena(), warlordId: 'unknown'}}),
    payload({arena: {...arena(), mode: 'last-car-rolling'}}),
  ]) {
    const result = settle(original, invalid);
    equal(result.awarded, false, 'unsettleable result is rejected');
    equal(result.profile, original, 'rejected result has no partial career mutation');
  }
  for (const p of [{...original, wasteland: {...original.wasteland, version: 2}},
    {...original, wasteland: {...original.wasteland, discoveredGate: false}}]) {
    equal(settle(p, payload()).profile, p, 'unknown or undiscovered career cannot receive this reward');
  }
});

test('result marker stays within the existing 1000 entry ledger and survives save/load', async () => {
  const settle = await settlement(), before = profile();
  before.wasteland.settledResults = Array.from({length: 1000}, (_, i) => 'old:' + i);
  const options = payload({runId: 'x'.repeat(128)}), result = settle(before, options);
  equal(result.profile.wasteland.settledResults.length, 1000, 'ledger keeps the existing bounded size');
  equal(result.profile.wasteland.settledResults.at(-1), 'warlord:' + 'x'.repeat(128), 'new marker is kept');
  ok(result.key.length <= 180, 'marker respects supported migration length');
  equal(settle(normalizeProfile(result.profile), options).awarded, false, 'bounded marker still blocks repeat after load');
});

test('named player registry stores one complete reward and preserves another player', async () => {
  const settle = await settlement(), before = profile(), other = createProfile();
  let registry = {version: 2, activePlayerId: 'driver-a', players: [
    {id: 'driver-a', name: 'Driver A', profile: before}, {id: 'driver-b', name: 'Driver B', profile: other}]};
  const settled = settle(before, payload());
  values.clear(); writes = [];
  registry = replacePlayerProfile(registry, 'driver-a', settled.profile);
  equal(savePlayers(registry, globalThis.localStorage), true, 'synthetic registry commit succeeds');
  const loaded = loadPlayers(globalThis.localStorage);
  const a = loaded.players.find(p => p.id === 'driver-a'), b = loaded.players.find(p => p.id === 'driver-b');
  equal(a.profile.wasteland.scrap, 160, 'starting player receives full bank change');
  equal(a.profile.wasteland.territories.sal.claimed, true, 'starting player receives territory with bank');
  equal(a.profile.wasteland.warlords.sal.defeated, true, 'starting player receives defeat with bank');
  equal(getEquippedArmorKit(a.profile, 'falcone_f42'), 'side-saws', 'starting player receives kit with bank');
  equal(b.profile.wasteland, normalizeProfile(other).wasteland, 'other career receives none of the result');
});

function appFight() {
  values.clear(); failWrites = false; writes = [];
  const app = new App();
  app.duel.featureFlags = flags(); app.audio.unlock = () => {};
  app.cpuDifficulty = 'medium';
  app.profile = {...app.profile, wasteland: {...app.profile.wasteland, discoveredGate: true,
    territories: {...app.profile.wasteland.territories, sal: {hold: 100, claimed: false}}}};
  assert.equal(app._saveProfile(), true);
  assert.equal(app.visitWasteland(), true); app.advance(8);
  assert.equal(app.startWarlordFight('sal'), true); assert.equal(app.beginWarlordFight(), true);
  app.duel.state.countdown = 0; app.duel.step(1 / 120); app.duel.step(1 / 120);
  return app;
}
function finish(app, winner = 'player') {
  const d = app.duel, loser = winner === 'player' ? d.state.opponents[0] : d.state;
  for (let n = 0; n < 3; n++) {
    for (const p of d.state.arena.participants) { p.protectedSec = 0; p.wreckCounted = false; }
    d.state.invulnerableSec = 0; d.state.combat.shield = 0; d.state.combat.rivalShield = 0;
    loser.combatWrecking = false; loser.armor = 1;
    applyArmorDamage(d, loser, 'crossbow', {owner: winner}); d.step(1 / 120);
  }
  assert.equal(d.state.status, 'arena_result', 'actual three-wreck format ends this fixture');
  return d.state.arena.result;
}

test('App commits kit, scrap, claim and marker once and shows the settled award', () => {
  const app = appFight(), before = app.profile.wasteland.scrap, runId = app.runId;
  try {
    writes = []; const result = finish(app);
    equal(app.profile.wasteland.scrap, before + 150, 'actual arenaResult callback settles the first win');
    equal(result.scrapEarned, 150, 'result screen reports the actual saved award');
    equal(result.settlementSaved, true, 'presentation marks success only after storage commit');
    equal(app.profile.wasteland.settledResults.includes('warlord:' + runId), true, 'App writes the exact fight marker');
    equal(getEquippedArmorKit(app.profile, app.duel.state.car), 'side-saws', 'same callback equips the winning car');
    const careerWrites = writes.map(w => { try { return JSON.parse(w.value); } catch { return null; } })
      .filter(value => value?.players);
    equal(careerWrites.length, 1, 'the player registry gets one atomic result write');
    const stored = careerWrites[0].players.find(p => p.id === app.player.id).profile.wasteland;
    equal([stored.scrap, stored.warlords.sal.defeated, stored.territories.sal.claimed,
      stored.settledResults.includes('warlord:' + runId)], [before + 150, true, true, true],
      'no intermediate registry lacks any part of the win');
    equal(app._settleArenaResult({result}, app.duel.state), false, 'duplicate actual callback is rejected');
    equal(app.profile.wasteland.scrap, before + 150, 'duplicate callback keeps the bank');
    const screen = arenaResultsScreen(app.duel.state, {metric: screenMetric, action: screenAction,
      escapeHTML: String, time: String});
    ok(/\+150/.test(screen.metrics), 'result presentation includes earned scrap');
  } finally { app.dispose?.(); }
});

test('failed App storage keeps the entire previous visible and persisted career and permits retry', () => {
  const app = appFight(), before = structuredClone(app.profile), saved = new Map(values);
  try {
    failWrites = true; const result = finish(app); failWrites = false;
    equal(app.profile, before, 'failed storage rolls back every visible reward field');
    equal([...values], [...saved], 'failed storage leaves persisted registry intact');
    equal(result.settlementSaved, false, 'screen reports an unsaved settlement');
    equal(result.scrapEarned, 0, 'unsaved result never advertises a paid reward');
    equal(app._settleArenaResult({result}, app.duel.state), true, 'same result can retry after storage recovers');
    equal(app.profile.wasteland.scrap, before.wasteland.scrap + 150, 'successful retry pays exactly once');
    equal(app._settleArenaResult({result}, app.duel.state), false, 'retry success blocks another callback');
  } finally { failWrites = false; app.dispose?.(); }
});

test('restart, abandon and stale result state never award or carry a reward into the next fight', () => {
  const app = appFight(), before = app.profile.wasteland.scrap, oldState = app.duel.state;
  try {
    const oldArena = oldState.arena, oldRun = app.runId;
    app.restart();
    equal(app.profile.wasteland.scrap, before, 'restart abandons without paying');
    ok(app.runId !== oldRun, 'restart gets its own fight identity');
    equal(app.profile.wasteland.settledResults.includes('warlord:' + oldRun), false, 'restart does not settle the abandoned fight');
    oldArena.phase = 'over'; oldArena.result = arena().result;
    equal(app._settleArenaResult({result: oldArena.result}, {...oldState, arena: oldArena}), false,
      'delayed old state cannot settle into the new fight');
    app.returnToMenu();
    equal(app.profile.wasteland.scrap, before, 'menu abandonment costs no saved scrap');
    equal(app.profile.wasteland.warlords.sal.wins, 0, 'unfinished fights cannot record wins');
  } finally { app.dispose?.(); }
});

test('another named player cannot receive a stale callback from the first player fight', () => {
  const app = appFight(), firstId = app.player.id;
  try {
    const old = {...app.duel.state, arena: arena()}, oldResult = old.arena.result;
    app.returnToMenu(); const added = app.addPlayer('Synthetic Driver B');
    equal(added.ok, true, 'synthetic second named player is created');
    ok(app.player.id !== firstId, 'active named player changes');
    const before = structuredClone(app.profile);
    equal(app._settleArenaResult({result: oldResult}, old), false, 'old player callback is rejected');
    equal(app.profile, before, 'new named player inherits no reward or loss');
    equal(getEquippedArmorKit(app.profile, 'falcone_f42'), null, 'new named player cannot equip first player reward');
  } finally { app.dispose?.(); }
});

test('unsupported root schemas cannot earn a reward that save normalization would discard', async () => {
  const settle = await settlement();
  for (const version of [99, 3, 0, null]) {
    const before = {...profile(), version, futurePayload: {keep: 'whole snapshot'}};
    const snapshot = structuredClone(before), result = settle(before, payload());
    equal(result.awarded, false, 'unsupported root version ' + version + ' must reject');
    assert.equal(result.profile, before, 'unsupported root retains the exact input reference');
    equal(before, snapshot, 'unsupported root cannot change any progress or future fields');
  }
});

test('malformed owned-car lists reject before paid-car lookup without throwing or mutating', async () => {
  const settle = await settlement();
  for (const unlockedCars of [{}, 'banshee_muscle', undefined]) {
    const before = {...profile(), unlockedCars}, snapshot = structuredClone(before);
    let result;
    assert.doesNotThrow(() => {result = settle(before, payload({car: 'banshee_muscle'}));},
      'malformed unlocks must not escape the pure settlement boundary');
    equal(result.awarded, false, 'malformed unlocks reject instead of awarding');
    assert.equal(result.profile, before, 'malformed unlocks retain the input reference');
    equal(before, snapshot, 'malformed unlocks leave the entire profile unchanged');
  }
});

test('a damage result with missing or noncanonical Sal boss identities cannot settle', async () => {
  const settle = await settlement();
  for (const id of [undefined, null, '', 'other-boss', 'player', 3]) {
    const bad = arena(); bad.warlordBossId = id;
    bad.participants.find(p => p.kind === 'cpu').id = id;
    bad.result = {winnerId: 'player', reason: 'damage', placings: ['player', id]};
    const before = profile(), snapshot = structuredClone(before), result = settle(before, payload({arena: bad}));
    equal(result.awarded, false, 'only the actual player/cpu-1 Sal roster can earn a reward');
    assert.equal(result.profile, before, 'malformed result retains the old profile');
    equal(before, snapshot, 'malformed result changes neither scrap nor kit nor counters');
  }
});


test('failed warlord settlement exposes RETRY SAVE without advertising the unpaid reward', () => {
  const app = appFight();
  const screen = () => arenaResultsScreen(app.duel.state, {metric: screenMetric,
    action: screenAction, escapeHTML: String});
  try {
    failWrites = true; finish(app); failWrites = false;
    ok(/data-action="warlord-retry-save"[^>]*>[\s\S]*?RETRY SAVE/.test(screen().actions),
      'failed result provides the production RETRY SAVE control');
    ok(/Could not save this result/.test(screen().description), 'failure is explained on the result');
    ok(!/Side Saws unlocked/.test(screen().description), 'unpaid kit is not advertised');
    ok(!/\+150/.test(screen().metrics), 'unpaid scrap is not advertised');
    equal(app.retryArenaSettlement(), true, 'result retry verb saves the same completed fight');
    ok(!/warlord-retry-save/.test(screen().actions), 'success removes the retry control');
    ok(/Side Saws unlocked/.test(screen().description), 'saved first win shows the working reward');
    equal(app.retryArenaSettlement(), false, 'second retry cannot pay again');
  } finally { failWrites = false; app.dispose?.(); }
});
