import {App} from '../src/app.js';
import {raceFeatureFlags} from '../src/wasteland-access.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {normalizeDeep, deepDiscoverySnapshot, rememberDeep} from '../src/deep/deep-discovery.js';
import {deepHints, markDeepHintsShown, purchaseDeepKit, DEEP_HINT_IDS} from '../src/deep/deep-hints.js';
import {createProfile, normalizeProfile, settleRace, loadPlayers, savePlayers, PLAYERS_KEY} from '../src/progression.js';
import {COURSE} from '../src/config.js';
import {createGarageScreen, handleGarageUpgrade} from '../src/screen-garage.js';

// Compare old fixtures with the actual pre-card normalizer, not a new-code round trip.
const previousSource = execFileSync('git', ['show', '874bc0e3:src/progression.js'], {encoding: 'utf8'})
  .replace(/(from\s+['"])(\.[^'"]+)(['"])/g, (_, from, path, quote) =>
    from + new URL(path, new URL('../src/progression.js', import.meta.url)).href + quote);
const previous = await import('data:text/javascript;base64,' + Buffer.from(previousSource).toString('base64'));
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }
function storageFor(initial) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]));
  return {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)};
}
const fixtureDir = new URL('./fixtures/saves/', import.meta.url);
for (const file of readdirSync(fixtureDir).filter(name => name.endsWith('.json'))) {
  const fixture = JSON.parse(readFileSync(new URL(file, fixtureDir), 'utf8'));
  check(file + ' memory-only load and round trip', () => {
    const storage = storageFor(fixture.storage), before = Object.fromEntries(Object.keys(fixture.storage).map(key => [key, storage.getItem(key)]));
    const players = loadPlayers(storage);
    for (const [key, value] of Object.entries(before)) assert.equal(storage.getItem(key), value);
    // 09 and 16 are the fixtures that carry a Deep field (16: the Sirena story, DEEP-SIRENA); every other shape must gain none.
    if (!['09-deep.json', '16-deep-sirena.json'].includes(file)) {
      assert.equal(JSON.stringify(players), JSON.stringify(previous.loadPlayers(storageFor(fixture.storage))), 'legacy normalized bytes unchanged');
      assert(players.players.every(player => !Object.hasOwn(player.profile, 'deep')));
    } else {
      // Each player keeps exactly the Deep field it was saved with, and a player saved without one gains none.
      fixture.storage[PLAYERS_KEY].players.forEach((raw, index) => {
        if (Object.hasOwn(raw.profile, 'deep')) assert.deepEqual(players.players[index].profile.deep, raw.profile.deep);
        else assert(!Object.hasOwn(players.players[index].profile, 'deep'));
      });
    }
    assert(savePlayers(players, storage));
    assert.equal(JSON.stringify(loadPlayers(storage)), JSON.stringify(players));
  });
}
const finish = extra => ({runId: 'deep-finish', stageIndex: COURSE.findIndex(stage => stage.id === 'pacific-canyon'),
  car: 'falcone_f42', mode: 'duel', cpuDifficulty: 'medium', difficulty: 'casual', seed: 1989,
  laps: 2, timeSec: 180, completed: true, won: false, deepEnabled: true, ...extra});
check('Duel and Time Trial finishes share the Deep counter, cap at ten and settle once across reload', () => {
  let profile = {...createProfile(), credits: 30000};
  const wasteland = JSON.stringify(profile.wasteland);
  for (let i = 0; i < 12; i++) {
    const result = finish({runId: 'deep-' + i, mode: i % 2 ? 'timetrial' : 'duel'});
    const settled = settleRace(profile, result);
    assert.equal(settled.profile.deep.pacificFinishes, Math.min(10, i + 1));
    assert.equal(JSON.stringify(settled.profile.wasteland), wasteland);
    profile = normalizeProfile(settled.profile);
    assert.equal(settleRace(profile, result).profile, profile);
  }
});
check('Off, other modes/courses, qualifying, abandon, timeout and partial finishes never count', () => {
  const profile = {...createProfile(), credits: 5000};
  for (const extra of [{deepEnabled: false}, {deepEnabled: undefined}, {mode: 'wasteland'}, {mode: 'grandprix', grandPrixCareerEnabled: true},
    {mode: 'grandprix', qualifying: true, grandPrixCareerEnabled: true}, {stageIndex: 1}, {completed: false},
    {qualifying: true}, {abandoned: true}, {timeout: true}, {laps: 1}, {timeSec: NaN}, {car: 'missing'}]) {
    assert(!Object.hasOwn(settleRace(profile, finish(extra)).profile, 'deep'), JSON.stringify(extra));
  }
});
check('Deep-off settlement preserves all pre-card fields and only adds the prospective GP podium', () => {
  const now = Date.now; Date.now = () => 123456;
  try {
    for (const mode of ['duel', 'timetrial', 'wasteland', 'grandprix']) for (const extra of [{}, {won: true}, {abandoned: true}, {qualifying: true}]) {
      const result = finish({deepEnabled: false, mode, grandPrixCareerEnabled: true, position: 1, laps: mode === 'grandprix' ? 3 : 2, ...extra});
      const profile = {...createProfile(), credits: 5000};
      const current = settleRace(profile, result);
      if (mode === 'grandprix' && extra.won === true) {
        assert.deepEqual(current.profile.grandPrixPodiums, ['pacific-canyon']);
        const comparable = {...current, profile: {...current.profile}};
        delete comparable.profile.grandPrixPodiums;
        assert.equal(JSON.stringify(comparable), JSON.stringify(previous.settleRace(profile, result)));
      } else {
        assert(!Object.hasOwn(current.profile, 'grandPrixPodiums'));
        assert.equal(JSON.stringify(current), JSON.stringify(previous.settleRace(profile, result)));
      }
    }
  } finally { Date.now = now; }
});
check('Hints appear at three and six, stop after finding, stay hidden while off or without a player', () => {
  for (let count = 0; count <= 10; count++) {
    const snapshot = deepDiscoverySnapshot({deep: {pacificFinishes: count}}, 'qa', true), hints = deepHints(snapshot);
    assert.equal(hints.hintIds.length, count < 3 ? 0 : count < 6 ? 1 : 2);
    assert.equal(hints.bubbles, count >= 6); assert.equal(hints.kitAvailable, count >= 3);
    for (const off of [{...snapshot, enabled: false}, {...snapshot, playerId: ''}, {...snapshot, found: ['kelp-coast']}]) {
      assert.equal(deepHints(off).garageTip, null); assert.equal(deepHints(off).bubbles, false);
    }
  }
  const saved = markDeepHintsShown({...createProfile(), deep: {pacificFinishes: 10}}, {enabled: true});
  assert.deepEqual(saved.deep.hintsShown, DEEP_HINT_IDS);
  assert.equal(markDeepHintsShown(saved, {enabled: true}), saved);
});
check('Kit costs exactly 150 once, applies across cars, and rejects hidden/off/poor purchases', () => {
  const profile = {...createProfile(), credits: 150, deep: {pacificFinishes: 5}};
  const bought = purchaseDeepKit(profile, {enabled: true});
  assert(bought.ok); assert.equal(bought.cost, 150); assert.equal(bought.profile.credits, 0);
  assert.equal(bought.profile.deep.kit, true); assert.equal(profile.credits, 150);
  for (const [saved, enabled] of [[profile, false], [{...profile, deep: {}}, true], [{...profile, credits: 149}, true], [bought.profile, true]]) {
    const result = purchaseDeepKit(saved, {enabled}); assert(!result.ok); assert.equal(result.profile, saved); assert.equal(result.cost, 0);
  }
  const found = {...profile, deep: {found: ['kelp-coast'], hintsShown: [DEEP_HINT_IDS[0]]}};
  assert(purchaseDeepKit(found, {enabled: true}).ok);
});
check('Partial/damaged Deep fields normalize safely; progress stays optional and repeat visits are harmless', () => {
  for (const deep of [null, false, 2, 'bad', [], {found: null, kit: 'true', pacificFinishes: Infinity}, {logged: ['turtle', 'turtle', {}, '__proto__'], pearls: 2}])
    assert.doesNotThrow(() => normalizeProfile({...createProfile(), deep}));
  assert.deepEqual(normalizeDeep({logged: ['turtle', 'turtle', {}], pacificFinishes: 20}), {logged: ['turtle'], pacificFinishes: 10});
  assert(!Object.hasOwn(normalizeProfile(createProfile()), 'deep'));
  let profile = createProfile();
  for (const [field, id] of [['found', 'kelp-coast'], ['places', 'ramp-shallows'], ['logged', 'turtle'], ['pearls', 'kelp-1']]) {
    const next = rememberDeep(profile, field, id, {enabled: true});
    assert.equal(rememberDeep(next, field, id, {enabled: true}), next);
    assert.equal(rememberDeep(profile, field, id, {enabled: false}), profile); profile = next;
  }
  assert.deepEqual(normalizeProfile(profile).deep, profile.deep);
  assert.deepEqual(normalizeDeep({future: {preserve: true}}), {future: {preserve: true}});
});
check('Garage markup and existing upgrade dispatcher expose a working kit button only after the hint', () => {
  let profile = {...createProfile(), credits: 150}; let enabled = true, message = '';
  const app = {player: {name: 'QA'}, getDeepDiscovery: () => deepDiscoverySnapshot(profile, 'qa', enabled),
    showDeepGarageHints: () => {profile = markDeepHintsShown(profile, {enabled});},
    purchaseDeepKit: () => {const result = purchaseDeepKit(profile, {enabled}); profile = result.profile; return result;}};
  const render = createGarageScreen({app, profile: () => profile, credits: String, escapeHTML: String,
    getGarageCar: () => 'falcone_f42', getGarageMessage: () => '', arrow: '', action: () => '', clamp: value => Math.min(1, value)});
  assert(!render().includes('DIVE KIT')); profile = {...profile, deep: {pacificFinishes: 5}};
  assert(render().includes('BUY DIVE KIT · 150 CR')); assert.deepEqual(profile.deep.hintsShown, [DEEP_HINT_IDS[0]]);
  assert(handleGarageUpgrade({dataset: {deepKit: 'buy'}}, {app, refreshGarage: value => {message = value;}}));
  assert.equal(message, 'Dive kit installed for every car.'); assert(render().includes('INSTALLED · ALL CARS'));
  enabled = false; assert(!render().includes('DIVE KIT'));
});
check('Native App Duel/TT settlements count once; switches, named players and failed kit writes are safe', () => {
  const savedStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const memory = new Map();
  const storage = {getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value)};
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: storage});
  try {
    const overrides = {'the-deep': true};
    const makeApp = () => {
      const app = new App();
      app.duel.featureFlags = raceFeatureFlags(createFeatureFlags({storage, overrides, qa: true}), () => app.duel.state);
      return app;
    };
    const app = makeApp(); app.profile.credits = 5000; app._saveProfile();
    for (let i = 0; i < 5; i++) {
      app.startCampaign({startStage: 0, mode: i % 2 ? 'timetrial' : 'duel'});
      const state = app.duel.state;
      Object.assign(state, {status: 'racing', stageTimeSec: 180, racePenaltySec: 0, s: app.duel.raceLength,
        completedLaps: state.lapsTotal, lap: state.lapsTotal, currentLap: state.lapsTotal,
        lapTimes: Array(state.lapsTotal).fill(180 / state.lapsTotal), lateral: 0});
      if (state.rival) state.rival.finishTime = null;
      app.duel._finishStage(); assert.equal(app.profile.deep.pacificFinishes, i + 1);
      app.duel.emit({stageResult: state.results}); assert.equal(app.profile.deep.pacificFinishes, i + 1);
      app.returnToMenu();
    }
    assert.equal(makeApp().profile.deep.pacificFinishes, 5);
    app.showDeepGarageHints(); assert.deepEqual(app.profile.deep.hintsShown, [DEEP_HINT_IDS[0]]);
    const wallet = app.profile.credits;
    Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {getItem: storage.getItem, setItem() {throw Error('quota');}}});
    const denied = app.purchaseDeepKit(); assert(!denied.ok); assert(denied.reason.includes('credits were kept'));
    assert.equal(app.profile.credits, wallet); assert.notEqual(app.profile.deep.kit, true);
    Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: storage});
    assert(app.purchaseDeepKit().ok); assert.equal(app.profile.credits, wallet - 150);
    assert(!app.purchaseDeepKit().ok); assert.equal(app.profile.credits, wallet - 150);
    const owner = app.player.id; assert(app.addPlayer('Other Deep QA').ok);
    assert(!Object.hasOwn(app.profile, 'deep')); assert(!app.purchaseDeepKit().ok);
    app.selectPlayer(owner); assert.equal(app.profile.deep.kit, true);
    overrides['the-deep'] = false;
    const before = JSON.stringify(app.profile); app.showDeepGarageHints(); assert.equal(JSON.stringify(app.profile), before);
    assert(!app.purchaseDeepKit().ok); assert.equal(app.getDeepDiscovery().enabled, false);
    app.duel.state.status = 'racing'; assert(!app.purchaseDeepKit().ok);
    const player = app.player; app.player = null; assert(!app.purchaseDeepKit().ok); assert.equal(app.getDeepDiscovery().enabled, false); app.player = player;
  } finally {
    if (savedStorage) Object.defineProperty(globalThis, 'localStorage', savedStorage); else delete globalThis.localStorage;
  }
});
console.log(`Deep save: ${checks} memory-only acceptance groups passed.`);

// Kyle, 25 October 2026: the results screen says the dive kit is new in the garage.
{
  const {deepGarageNotice} = await import('../src/screen-results.js');
  const appFor = (deep, enabled = true) => ({getDeepDiscovery: () => deepDiscoverySnapshot({deep}, 'qa', enabled)});
  check('Results screen points to the dive kit until the garage tip is seen', () => {
    assert.equal(deepGarageNotice(appFor({pacificFinishes: 2})), '');
    assert.match(deepGarageNotice(appFor({pacificFinishes: 3})), /NEW IN THE GARAGE · THE DIVE KIT/);
    assert.equal(deepGarageNotice(appFor({pacificFinishes: 3, hintsShown: [DEEP_HINT_IDS[0]]})), '');
    assert.equal(deepGarageNotice(appFor({pacificFinishes: 7, kit: true})), '');
    assert.equal(deepGarageNotice(appFor({pacificFinishes: 7}, false)), '');
    assert.equal(deepGarageNotice({}), '');
  });
}
