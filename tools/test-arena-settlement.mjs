import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {loadPlayers, replacePlayerProfile, savePlayers} from '../src/progression.js';
import {arenaReward, settleArenaResult} from '../src/arena/arena-settlement.js';
import {arenaResultsScreen} from '../src/screen-arena.js';
import {screenMetric, screenAction} from '../src/screen-results.js';

// ARENA-02-PAY. All storage in this file is memory-only.
let failWrites = false;
const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(String(key)) ?? null,
  setItem: (key, value) => {
    if (failWrites) throw Error('synthetic save failure');
    values.set(String(key), String(value));
  },
  removeItem: key => values.delete(String(key)),
};
globalThis.cancelAnimationFrame = () => {};

const ON = {wasteland2: true, 'hidden-road': true, scrapdome: true};
const cpu = (id, wrecks = 0) => ({id, kind: 'cpu', wrecks, wrecked: 0, damageDealt: 0, name: id.toUpperCase()});
const player = (wrecks = 0) => ({id: 'player', kind: 'player', wrecks, wrecked: 0, damageDealt: 100, name: 'YOU'});
function arena({opponents = 3, place = 1, wrecks = 0} = {}) {
  const participants = [player(wrecks), ...Array.from({length: opponents}, (_, index) => cpu(`cpu-${index + 1}`))];
  const others = participants.slice(1).map(item => item.id);
  const placings = [...others.slice(0, place - 1), 'player', ...others.slice(place - 1)];
  return {version: 1, venueId: 'scrapdome', mode: 'last-car-rolling', phase: 'over',
    participants, result: {placings, winnerId: placings[0], reason: 'time'}};
}
function profile(changes = {}) {
  return {version: 2, credits: 765, unknownProfile: {kept: true}, wasteland: {
    version: 1, discoveredGate: true, scrap: 10, settledResults: ['old:result'],
    territories: {kettle: {hold: 0, claimed: false, unknownKettle: 'kept'}},
    unknownWasteland: {kept: true}, ...changes}};
}
const payload = (changes = {}) => ({runId: 'arena-run-1', ownerPlayerId: 'driver-a',
  activePlayerId: 'driver-a', cpuDifficulty: 'medium', arena: arena({wrecks: 3}), ...changes});

test('reward uses the settled finish, place, wreck and difficulty formula', () => {
  assert.deepEqual(arenaReward(arena({opponents: 3, place: 1, wrecks: 3}), 'medium'), {
    base: 80, placing: 120, wrecks: 180, factor: 1.2, total: 456,
  });
  assert.equal(arenaReward(arena({opponents: 3, place: 2, wrecks: 2}), 'hard').total, 392);
  assert.equal(arenaReward(arena({opponents: 1, place: 1, wrecks: 1}), 'hard').total, 252);
  assert.equal(arenaReward(arena({opponents: 3, place: 4, wrecks: 99}), 'easy').total, 320,
    'credited wrecks use CAR-01\'s four-wreck cap');
});

test('a completed event pays once and preserves unknown save fields', () => {
  const before = profile(), first = settleArenaResult(before, payload());
  assert.equal(first.awarded, true);
  assert.equal(first.key, 'arena:arena-run-1');
  assert.equal(first.scrapEarned, 456);
  assert.equal(first.holdAdded, 25);
  assert.equal(first.hold, 25);
  assert.equal(first.profile.wasteland.scrap, 466);
  assert.deepEqual(first.profile.unknownProfile, before.unknownProfile);
  assert.deepEqual(first.profile.wasteland.unknownWasteland, before.wasteland.unknownWasteland);
  assert.equal(first.profile.wasteland.territories.kettle.unknownKettle, 'kept');
  assert.deepEqual(first.profile.wasteland.settledResults, ['old:result', 'arena:arena-run-1']);
  const duplicate = settleArenaResult(first.profile, payload());
  assert.equal(duplicate.awarded, false);
  assert.equal(duplicate.profile, first.profile);
  assert.equal(duplicate.scrapEarned, 0);
  assert.equal(duplicate.holdAdded, 0);
});

test('unknown root profile fields survive the real player-registry save path', () => {
  const storage = memoryStorage({}), before = profile();
  const settled = settleArenaResult(before, payload());
  let registry = {version: 2, activePlayerId: 'driver-a', players: [
    {id: 'driver-a', name: 'Driver A', profile: before},
  ]};
  registry = replacePlayerProfile(registry, 'driver-a', settled.profile);
  assert.equal(savePlayers(registry, storage), true);
  const reloaded = loadPlayers(storage).players[0].profile;
  assert.deepEqual(reloaded.unknownProfile, before.unknownProfile);
  assert.deepEqual(reloaded.wasteland.unknownWasteland, before.wasteland.unknownWasteland);
  assert.equal(reloaded.wasteland.territories.kettle.unknownKettle, 'kept');
  assert.equal(reloaded.wasteland.settledResults.includes('arena:arena-run-1'), true);
});

test('hold needs a win against at least two computer cars', () => {
  const oneCar = settleArenaResult(profile(), payload({arena: arena({opponents: 1, wrecks: 1})}));
  assert.equal(oneCar.awarded, true);
  assert.equal(oneCar.scrapEarned, 216, 'medium difficulty still applies');
  assert.equal(oneCar.holdAdded, 0);
  assert.equal(oneCar.hold, 0);
  const loss = settleArenaResult(profile(), payload({arena: arena({opponents: 3, place: 2, wrecks: 2})}));
  assert.equal(loss.scrapEarned, 336);
  assert.equal(loss.holdAdded, 0);
});

test('owner identity, completion and supported save shape are mandatory', () => {
  const original = profile();
  for (const invalid of [
    payload({ownerPlayerId: 'driver-b'}),
    payload({activePlayerId: 'driver-b'}),
    payload({runId: ''}),
    payload({arena: {...arena(), phase: 'fight', result: null}}),
    payload({arena: {...arena(), venueId: 'other'}}),
  ]) {
    const result = settleArenaResult(original, invalid);
    assert.equal(result.awarded, false);
    assert.equal(result.profile, original);
  }
  const hidden = profile({discoveredGate: false});
  assert.equal(settleArenaResult(hidden, payload()).profile, hidden);
  const future = profile({version: 2});
  assert.equal(settleArenaResult(future, payload()).profile, future);
});

function memoryStorage(initial) {
  const stored = new Map(Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]));
  return {get length() { return stored.size; }, key: index => [...stored.keys()][index] ?? null,
    getItem: key => stored.get(String(key)) ?? null,
    setItem: (key, value) => stored.set(String(key), String(value)),
    removeItem: key => stored.delete(String(key)), clear: () => stored.clear()};
}

test('every historical save fixture can receive an arena settlement', () => {
  const dir = new URL('./fixtures/saves/', import.meta.url);
  const files = readdirSync(fileURLToPath(dir)).filter(name => name.endsWith('.json')).sort();
  assert.equal(files.length, 7);
  for (const file of files) {
    const fixture = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
    const registry = loadPlayers(memoryStorage(fixture.storage));
    for (const entry of registry.players) {
      const ready = {...entry.profile, wasteland: {...entry.profile.wasteland, discoveredGate: true}};
      const result = settleArenaResult(ready, payload({runId: `fixture-${file}-${entry.id}`}));
      assert.equal(result.awarded, true, `${file}/${entry.id}`);
      assert.equal(result.profile.credits, ready.credits, `${file}/${entry.id}: credits`);
      assert.equal(result.profile.wasteland.settledResults.at(-1), `arena:fixture-${file}-${entry.id}`);
    }
  }
});

function appInYard() {
  values.clear(); failWrites = false;
  const app = new App();
  app.duel.featureFlags = createFeatureFlags({storage: null, overrides: ON});
  app.audio.unlock = () => {};
  app.cpuDifficulty = 'medium';
  app.profile = {...app.profile, wasteland: {...app.profile.wasteland, discoveredGate: true}};
  assert.equal(app._saveProfile(), true);
  assert.equal(app.visitWasteland(), true); app.advance(8);
  assert.equal(app.startArenaEvent({opponents: 2}), true);
  return app;
}

function finish(app, {wrecks = 2} = {}) {
  const state = app.duel.state, me = state.arena.participants.find(item => item.id === 'player');
  state.countdown = 0; app.duel.step(1 / 120);
  assert.equal(state.status, 'racing');
  me.wrecks = wrecks; me.damageDealt = 300;
  state.arena.clockSec = state.arena.timeLimitSec - 1 / 240;
  app.duel.step(1 / 120);
  assert.equal(state.status, 'arena_result');
  return state.arena.result;
}

test('App settles arenaResult for the starting player and annotates the result screen', () => {
  const app = appInYard(), runId = app.runId, before = app.profile.wasteland.scrap;
  const result = finish(app);
  assert.equal(app.profile.wasteland.settledResults.includes(`arena:${runId}`), true);
  assert.equal(result.scrapEarned, 336);
  assert.equal(result.scrapBalance, before + 336);
  assert.equal(result.holdAdded, 25);
  assert.equal(result.hold, 25);
  const views = {metric: screenMetric, action: (label, verb, primary) => screenAction(label, verb, primary),
    escapeHTML: value => String(value), time: value => String(value)};
  const screen = arenaResultsScreen(app.duel.state, views);
  assert.match(screen.metrics, /SCRAP EARNED/);
  assert.match(screen.metrics, /\+336/);
  assert.match(screen.metrics, /HOLD/);
  assert.match(screen.metrics, /25 \/ 100/);
  assert.equal(app._settleArenaResult({result}, app.duel.state), false, 'duplicate event does not pay');
  assert.equal(result.scrapEarned, 336, 'duplicate event keeps the original presentation');
  assert.equal(result.holdAdded, 25);
  app.dispose?.();
});

test('App rejects another player and abandonment pays nothing', () => {
  const wrong = appInYard(), wrongBefore = wrong.profile.wasteland.scrap;
  wrong._runPlayerId = 'somebody-else';
  const result = finish(wrong);
  assert.equal(wrong.profile.wasteland.scrap, wrongBefore);
  assert.equal(result.scrapEarned, 0);
  wrong.dispose?.();

  const abandoned = appInYard(), runId = abandoned.runId, before = abandoned.profile.wasteland.scrap;
  assert.equal(abandoned.returnToYard(), true);
  assert.equal(abandoned.profile.wasteland.scrap, before);
  assert.equal(abandoned.profile.wasteland.settledResults.includes(`arena:${runId}`), false);
  abandoned.dispose?.();
});

test('a failed App save restores the prior profile and reports no award', () => {
  const app = appInYard(), runId = app.runId, before = app.profile;
  failWrites = true;
  const result = finish(app);
  failWrites = false;
  assert.equal(app.profile.wasteland.scrap, before.wasteland.scrap);
  assert.equal(app.profile.wasteland.settledResults.includes(`arena:${runId}`), false);
  assert.equal(result.scrapEarned, 0);
  assert.equal(result.holdAdded, 0);
  assert.equal(result.settlementSaved, false);
  app.dispose?.();
});
