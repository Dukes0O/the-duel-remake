import assert from 'node:assert/strict';
import {test} from 'node:test';
import {App} from '../src/app.js';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {createProfile, normalizeProfile, loadPlayers, replacePlayerProfile, savePlayers, PLAYERS_KEY} from '../src/progression.js';
import {startWarlordEvent} from '../src/arena/warlord-event.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {getEquippedArmorKit} from '../src/armor-kits.js';
import {arenaResultsScreen} from '../src/screen-arena.js';
import {territoryPanel} from '../src/screen-territory.js';
import {createArmoryScreen} from '../src/screen-armory.js';
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
  a.participants.find(p => p.id !== winnerId).wrecked = 3;
  a.result = {winnerId, reason: 'three-wrecks', placings: winnerId === 'player' ? ['player', 'cpu-1'] : ['cpu-1', 'player']};
  return a;
}
const payload = (changes = {}) => ({runId: 'sal-run-1', ownerPlayerId: 'driver-a',
  activePlayerId: 'driver-a', arena: arena(), car: 'falcone_f42', cpuDifficulty: 'medium', ...changes});

test('first win atomically earns 720 Medium scrap, Side Saws and territory with additive career fields', async () => {
  const settle = await settlement(), before = profile(), snapshot = structuredClone(before);
  writes = [];
  const first = settle(before, payload());
  equal(first.awarded, true, 'completed first win is accepted');
  equal(first.key, 'warlord:sal-run-1', 'marker shares the existing Wasteland result ledger');
  equal(first.scrapEarned, 720, 'first win pays exactly 720 at Medium difficulty');
  equal(first.profile.wasteland.scrap, 730, 'first scrap is added once');
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
  equal(afterLoad.profile.wasteland.scrap, 730, 'reloading does not repay the win');
  equal(afterLoad.profile.wasteland.warlords.sal.wins, 1, 'reloading does not recount the win');
});

test('a new three-wreck Medium rematch pays 312 and preserves defeat, claim and all equipped kits', async () => {
  const settle = await settlement(), first = settle(profile(), payload());
  first.profile.wasteland.kits.falcone_f42.equipped = null;
  const rematch = settle(first.profile, payload({runId: 'sal-rematch'}));
  equal(rematch.awarded, true, 'a different completed fight settles');
  equal(rematch.scrapEarned, 312, 'rematch pays the settled three-wreck Medium 312 scrap');
  equal(rematch.profile.wasteland.scrap, 1042, 'only first and rematch rewards enter the bank');
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
  equal(a.profile.wasteland.scrap, 730, 'starting player receives full bank change');
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
    equal(app.profile.wasteland.scrap, before + 720, 'actual arenaResult callback settles the first win');
    equal(result.scrapEarned, 720, 'result screen reports the actual saved award');
    equal(result.settlementSaved, true, 'presentation marks success only after storage commit');
    equal(app.profile.wasteland.settledResults.includes('warlord:' + runId), true, 'App writes the exact fight marker');
    equal(getEquippedArmorKit(app.profile, app.duel.state.car), 'side-saws', 'same callback equips the winning car');
    const careerWrites = writes.map(w => { try { return JSON.parse(w.value); } catch { return null; } })
      .filter(value => value?.players);
    equal(careerWrites.length, 1, 'the player registry gets one atomic result write');
    const stored = careerWrites[0].players.find(p => p.id === app.player.id).profile.wasteland;
    equal([stored.scrap, stored.warlords.sal.defeated, stored.territories.sal.claimed,
      stored.settledResults.includes('warlord:' + runId)], [before + 720, true, true, true],
      'no intermediate registry lacks any part of the win');
    equal(app._settleArenaResult({result}, app.duel.state), false, 'duplicate actual callback is rejected');
    equal(app.profile.wasteland.scrap, before + 720, 'duplicate callback keeps the bank');
    const screen = arenaResultsScreen(app.duel.state, {metric: screenMetric, action: screenAction,
      escapeHTML: String, time: String});
    ok(/\+720/.test(screen.metrics), 'result presentation includes earned scrap');
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
    equal(app.profile.wasteland.scrap, before.wasteland.scrap + 720, 'successful retry pays exactly once');
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
    ok(!/\+720/.test(screen().metrics), 'unpaid scrap is not advertised');
    equal(app.retryArenaSettlement(), true, 'result retry verb saves the same completed fight');
    ok(!/warlord-retry-save/.test(screen().actions), 'success removes the retry control');
    ok(/Side Saws unlocked/.test(screen().description), 'saved first win shows the working reward');
    equal(app.retryArenaSettlement(), false, 'second retry cannot pay again');
  } finally { failWrites = false; app.dispose?.(); }
});


test('App keeps a saved Side Saws reward inactive while the dev warlords switch is off', () => {
  const app = appFight();
  try {
    finish(app); app.returnToMenu();
    app.duel.featureFlags = createFeatureFlags({storage: null, qa: true});
    equal(getEquippedArmorKit(app.profile, 'falcone_f42'), 'side-saws', 'saved reward remains owned and equipped');
    equal(app.equipArmorKit('stuttgart_959s', 'side-saws').ok, false, 'released build cannot change the dev reward equip');
    equal(app.visitWasteland(), true, 'released yard remains available'); app.advance(8);
    equal(app.startArenaEvent(), true, 'released Last Car Rolling remains available');
    equal(app.duel.state.combatArmorKit, null, 'released event does not activate the saved dev kit');
    equal(getEquippedArmorKit(app.profile, 'falcone_f42'), 'side-saws', 'switch isolation never deletes the saved entitlement');
  } finally { app.dispose?.(); }
});


test('failed warlord save shows the unchanged Sal hold on its results', () => {
  const app = appFight(), before = structuredClone(app.profile);
  try {
    failWrites = true; const result = finish(app); failWrites = false;
    equal(result.hold, before.wasteland.territories.sal.hold, 'unsaved result retains the actual prior 100 hold');
    const screen = arenaResultsScreen(app.duel.state, {metric: screenMetric,
      action: screenAction, escapeHTML: String});
    ok(screen.metrics.includes('100 / 100'), 'failed result does not invent zero territory hold');
    equal(app.profile, before, 'hold presentation changes none of the failed transaction rollback');
  } finally { failWrites = false; app.dispose?.(); }
});


test('public reward retry preserves another player saved by a second memory tab', () => {
  const app = appFight();
  try {
    const registry = loadPlayers();
    registry.players.push({id: 'driver-b', name: 'Driver B', profile: {...createProfile(), credits: 100, unknownB: {old: true}}});
    equal(savePlayers(registry), true, 'second named player is durably present before failure');
    failWrites = true; finish(app); failWrites = false;
    const fresh = loadPlayers(), other = fresh.players.find(p => p.id === 'driver-b');
    equal(savePlayers(replacePlayerProfile(fresh, 'driver-b', {...other.profile, credits: 900, unknownB: {old: true, later: 23}})),
      true, 'second memory tab saves newer progress during failed reward');
    equal(app.retryArenaSettlement(), true, 'public retry saves owner result after recovery');
    const after = loadPlayers().players.find(p => p.id === 'driver-b').profile;
    equal([after.credits, after.unknownB], [900, {old: true, later: 23}], 'retry preserves the complete fresh other-player progress');
  } finally { failWrites = false; app.dispose?.(); }
});

test('public reward retry rebases the immutable result on fresh owner progress', () => {
  const app = appFight();
  try {
    failWrites = true; finish(app); failWrites = false;
    const fresh = loadPlayers(), owner = fresh.players.find(p => p.id === app.player.id);
    const updated = {...owner.profile, credits: 1765, unknownOwnerLater: {keep: 31}};
    equal(savePlayers(replacePlayerProfile(fresh, owner.id, updated)), true, 'second memory tab saves newer owner progress');
    equal(app.retryArenaSettlement(), true, 'public retry rebases and saves the result');
    const after = loadPlayers().players.find(p => p.id === owner.id).profile;
    equal([after.credits, after.unknownOwnerLater], [1765, {keep: 31}], 'retry retains fresh owner currency and additive fields');
    equal(after.wasteland.scrap, owner.profile.wasteland.scrap + 720, 'fresh owner receives exactly the first-win reward');
    equal(after.wasteland.warlords.sal.wins, 1, 'retry counts that immutable fight once');
  } finally { failWrites = false; app.dispose?.(); }
});


test('reward retry rejects missing, switched, unreadable and unsupported durable registries unchanged', () => {
  for (const kind of ['missing', 'malformed', 'deleted-owner', 'switched-owner', 'future-owner', 'future-career', 'future-other', 'read-failure']) {
    const app = appFight(), getItem = localStorage.getItem;
    try {
      failWrites = true; finish(app); failWrites = false;
      const fresh = loadPlayers(), owner = fresh.players.find(p => p.id === app.player.id);
      fresh.players.push({id: 'driver-b', name: 'Driver B', profile: createProfile()});
      if (kind === 'missing') values.delete(PLAYERS_KEY);
      else if (kind === 'malformed') values.set(PLAYERS_KEY, '{broken');
      else {
        if (kind === 'deleted-owner') fresh.players = fresh.players.filter(p => p.id !== owner.id);
        if (kind === 'switched-owner' || kind === 'deleted-owner') fresh.activePlayerId = 'driver-b';
        if (kind === 'future-owner') owner.profile.version = 99;
        if (kind === 'future-career') owner.profile.wasteland.version = 2;
        if (kind === 'future-other') fresh.players.at(-1).profile.version = 99;
        values.set(PLAYERS_KEY, JSON.stringify(fresh));
      }
      if (kind === 'read-failure') localStorage.getItem = key => {if (key === PLAYERS_KEY) throw Error('synthetic read failure'); return getItem(key);};
      const visible = structuredClone(app.profile), persisted = [...values];
      equal(app.retryArenaSettlement(), false, kind + ': unproven durable owner cannot be overwritten');
      equal(app.profile, visible, kind + ': entire visible career is retained');
      equal([...values], persisted, kind + ': durable registry is unchanged');
      equal(app.duel.state.arena.result.settlementRetryable, true, kind + ': result remains retryable without claiming an award');
    } finally { localStorage.getItem = getItem; failWrites = false; app.dispose?.(); }
  }
});

test('retry recalculates rematch status from a freshly saved Sal defeat', () => {
  const app = appFight();
  try {
    failWrites = true; finish(app); failWrites = false;
    const fresh = loadPlayers(), owner = fresh.players.find(p => p.id === app.player.id);
    const profile = {...owner.profile, wasteland: {...owner.profile.wasteland, scrap: 300,
      warlords: {...owner.profile.wasteland.warlords, sal: {defeated: true, wins: 4, losses: 0}},
      kits: {stuttgart_959s: {owned: ['scrapper'], equipped: 'scrapper'}}}};
    equal(savePlayers(replacePlayerProfile(fresh, owner.id, profile)), true, 'another completed win is saved during failure');
    equal(app.retryArenaSettlement(), true, 'this distinct completed fight can retry against fresh status');
    equal([app.profile.wasteland.scrap, app.profile.wasteland.warlords.sal.wins], [612, 5], 'retry earns Medium rematch 312 and adds only this win');
    equal(getEquippedArmorKit(app.profile, 'stuttgart_959s'), 'scrapper', 'fresh equipped paid kit survives');
    equal(getEquippedArmorKit(app.profile, 'falcone_f42'), null, 'retry does not falsely autoequip another first win');
  } finally { failWrites = false; app.dispose?.(); }
});

test('a durably settled exact retry marker resolves without another write or reward', async () => {
  const app = appFight();
  try {
    failWrites = true; finish(app); failWrites = false;
    const settle = await settlement(), fresh = loadPlayers(), owner = fresh.players.find(p => p.id === app.player.id);
    const saved = settle(owner.profile, {runId: app.runId, ownerPlayerId: owner.id, activePlayerId: owner.id,
      arena: app.duel.state.arena, car: app.duel.state.car, cpuDifficulty: app.duel.state.cpuDifficulty});
    equal(savePlayers(replacePlayerProfile(fresh, owner.id, saved.profile)), true, 'same immutable result was saved durably elsewhere');
    writes = [];
    equal(app.retryArenaSettlement(), false, 'durable exact marker rejects another award');
    equal(writes.length, 0, 'already saved result causes no registry write');
    equal(app.profile.wasteland.scrap, 720, 'visible career adopts the proven saved reward');
    equal(app.duel.state.arena.result.settlementRetryable, false, 'proven durable marker removes misleading retry UI');
    equal(app.duel.state.arena.result.settlementSaved, true, 'durable exact marker proves saved completion');
  } finally { failWrites = false; app.dispose?.(); }
});

function neverSavedFight() {
  values.clear(); failWrites = true; writes = [];
  const app = new App(); app.duel.featureFlags = flags(); app.audio.unlock = () => {};
  app.profile = {...app.profile, credits: 2777, unsavedSession: {keep: true}, wasteland: {...app.profile.wasteland,
    discoveredGate: true, territories: {...app.profile.wasteland.territories, sal: {hold: 100, claimed: false}}}};
  assert.equal(app.profileSaved, false);
  assert.equal(app.visitWasteland(), true); app.advance(8);
  assert.equal(app.startWarlordFight('sal'), true); assert.equal(app.beginWarlordFight(), true);
  app.duel.state.countdown = 0; app.duel.step(1/120); app.duel.step(1/120);
  return app;
}

test('never-saved retry creates the first registry only from proved absence and the same valid local owner', () => {
  const app = neverSavedFight();
  try {
    finish(app); failWrites = false;
    equal(values.has(PLAYERS_KEY), false, 'durable registry was absent through initial failed settlement');
    equal(app.retryArenaSettlement(), true, 'proved absent registry can receive the same local session');
    equal([app.profile.credits, app.profile.unsavedSession, app.profile.wasteland.scrap], [2777, {keep: true}, 600],
      'first durable registry retains the genuine unsaved session and one reward');
    equal(loadPlayers().players.find(p => p.id === app.player.id).profile.unsavedSession, {keep: true}, 'unsaved fields become durable');
  } finally { failWrites = false; app.dispose?.(); }
});

test('a failed initial registry read is never proof of an absent never-saved registry', () => {
  const app = neverSavedFight(), getItem = localStorage.getItem;
  try {
    localStorage.getItem = key => {if (key === PLAYERS_KEY) throw Error('synthetic initial read failure'); return getItem(key);};
    finish(app); localStorage.getItem = getItem; failWrites = false;
    const before = structuredClone(app.profile), persisted = [...values];
    equal(app.retryArenaSettlement(), false, 'read failure cannot authorize first-registry creation');
    equal(app.profile, before, 'unproven unsaved session remains fully visible');
    equal([...values], persisted, 'unproven retry changes no durable data');
  } finally { localStorage.getItem = getItem; failWrites = false; app.dispose?.(); }
});

test('retry preserves genuine unsaved owner fields when that durable owner is unchanged', () => {
  const app = appFight();
  try {
    app.profile = {...app.profile, credits: 2777, unsavedSession: {keep: true}}; app.profileSaved = false;
    failWrites = true; finish(app); failWrites = false;
    const fresh = loadPlayers(); fresh.players.push({id: 'driver-b', name: 'Driver B', profile: {...createProfile(), credits: 900}});
    equal(savePlayers(fresh), true, 'other player saves while durable owner stays unchanged');
    equal(app.retryArenaSettlement(), true, 'genuine unsaved owner can retry without discarding local work');
    equal([app.profile.credits, app.profile.unsavedSession, app.profile.wasteland.scrap], [2777, {keep: true}, 720], 'unsaved owner remains complete');
    equal(loadPlayers().players.find(p => p.id === 'driver-b')?.profile?.credits, 900, 'fresh other player is retained too');
  } finally { failWrites = false; app.dispose?.(); }
});


test('initial reward never overwrites a newer durable owner after a real prior save failure', () => {
  const app = appFight();
  try {
    app.profile = {...app.profile, credits: 2777, unsavedSession: {keep: true}};
    failWrites = true; equal(app._saveProfile(), false, 'actual prior save failure creates unsaved owner work'); failWrites = false;
    const visible = structuredClone(app.profile), fresh = loadPlayers(), owner = fresh.players.find(p => p.id === app.player.id);
    equal(savePlayers(replacePlayerProfile(fresh, owner.id, {...owner.profile, credits: 4765, newerDurable: {keep: 23}})), true,
      'another memory tab saves a conflicting newer owner');
    const durable = [...values]; const result = finish(app);
    equal(result.settlementSaved, false, 'initial result must reject the unresolved owner conflict');
    equal(result.settlementRetryable, true, 'owner conflict stays retryable without a false saved claim');
    equal(app.profile, visible, 'complete genuine unsaved owner stays visible');
    equal([...values], durable, 'newer durable owner remains unchanged');
  } finally { failWrites = false; app.dispose?.(); }
});

test('an unsaved owner conflict before warlord launch is not made trusted by launch-time capture', () => {
  const app = appFight();
  try {
    app.returnToMenu();
    app.profile = {...app.profile, credits: 2777, unsavedSession: {keep: true}};
    failWrites = true; equal(app._saveProfile(), false, 'actual failed save predates the new fight'); failWrites = false;
    const fresh = loadPlayers(), owner = fresh.players.find(p => p.id === app.player.id);
    equal(savePlayers(replacePlayerProfile(fresh, owner.id, {...owner.profile, credits: 4765, newerDurable: {keep: 23}})), true,
      'durable conflict already exists before launch');
    const visible = structuredClone(app.profile), durable = [...values];
    assert.equal(app.visitWasteland(), true); app.advance(8);
    assert.equal(app.startWarlordFight('sal'), true); assert.equal(app.beginWarlordFight(), true);
    app.duel.state.countdown = 0; app.duel.step(1/120); app.duel.step(1/120);
    const result = finish(app);
    equal(result.settlementSaved, false, 'launch-time capture cannot turn an older unsaved profile into durable truth');
    equal(app.profile, visible, 'unsaved career survives the conflict before launch');
    equal([...values], durable, 'pre-existing newer durable career remains untouched');
  } finally { failWrites = false; app.dispose?.(); }
});

test('initial reward preserves genuine unsaved owner and freshly saved other players when owner baseline is unchanged', () => {
  const app = appFight();
  try {
    app.profile = {...app.profile, credits: 2777, unsavedSession: {keep: true}};
    failWrites = true; equal(app._saveProfile(), false, 'genuine local save failed'); failWrites = false;
    const fresh = loadPlayers(); fresh.players.push({id: 'driver-b', name: 'Driver B', profile: {...createProfile(), credits: 900, futureB: {keep: 23}}});
    equal(savePlayers(fresh), true, 'another player is saved while the durable owner is unchanged');
    const result = finish(app);
    equal(result.settlementSaved, true, 'unchanged verified owner baseline permits complete settlement');
    equal([app.profile.credits, app.profile.unsavedSession, app.profile.wasteland.scrap], [2777, {keep: true}, 720],
      'initial settlement preserves genuine unsaved owner fields');
    const other = loadPlayers().players.find(p => p.id === 'driver-b')?.profile;
    equal([other?.credits, other?.futureB], [900, {keep: 23}], 'initial settlement retains the complete fresh other player');
  } finally { failWrites = false; app.dispose?.(); }
});


test('an actual saved Sal win advertises earned working saws only for the built enabled fight', () => {
  const app = appFight();
  try {
    const result = finish(app);
    const saved = loadPlayers().players.find(player => player.id === app.player.id).profile;
    equal(result.settlementSaved, true, 'actual three-wreck result is durable before advertising its reward');
    equal([saved.wasteland.warlords.sal.defeated, saved.wasteland.territories.sal.claimed,
      getEquippedArmorKit(saved, app.duel.state.car)], [true, true, 'side-saws'],
      'loaded winning owner has the complete working earned reward');
    const snapshot = structuredClone(saved);
    const unbuilt = territoryPanel(saved, {builtWarlordIds: []});
    ok(!/SIDE SAWS EARNED|data-warlord="sal"/.test(unbuilt), 'explicit unbuilt ids suppress earned claims and rematch');
    const future = {...saved, wasteland: {...saved.wasteland,
      warlords: {...saved.wasteland.warlords, dustmonger: {defeated: true, wins: 1, losses: 0}},
      territories: {...saved.wasteland.territories, dustmonger: {hold: 100, claimed: true}}}};
    ok(!/SMOKE SCREEN EARNED|data-warlord="dustmonger"/.test(territoryPanel(future)),
      'a saved future defeat cannot claim an unbuilt reward or advertise its rematch');
    const armory = enabled => createArmoryScreen({profile: () => saved, credits: String, escapeHTML: String,
      getGarageMessage: () => '', kitsEnabled: () => true, warlordsEnabled: () => enabled,
      action: label => label})();
    ok(!/SIDE SAWS|side-saws/i.test(armory(false)), 'released Armory hides the reward and earned territory claim with warlords off');
    const panel = territoryPanel(saved);
    ok(/data-warlord="sal">REMATCH/.test(panel), 'the saved built fight remains replayable');
    equal(saved, snapshot, 'territory and Armory rendering do not change saved progress');
    ok(/DEFEATED · SIDE SAWS EARNED · CLAIMED/.test(panel),
      'actual durable Sal victory must advertise the reviewed working reward on its defeated territory');
    ok(/SIDE SAWS EARNED/.test(armory(true)), 'enabled Armory also reports the actual earned territory reward');
  } finally { app.dispose?.(); }
});
