// OPEN-STATE: saved open land, real App exits and Night 2 with fixture-backed memory storage.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {App} from '../src/app.js';
import {PLAYERS_KEY, activePlayer, loadPlayers, replacePlayerProfile, savePlayers, selectPlayer} from '../src/progression.js';
import {applyChoice, createLedger, namedThrow} from '../src/story/ledger.js';
import {savedLedger} from '../src/story/ledger-save.js';
import {NIGHT_2_CHOICES, NIGHT_2_QUESTIONS} from '../src/story/scenes/night-2.js';
import {night2Opening} from '../src/world/jobs/night-2.js';
import {NIGHT_2_SITES as sites} from '../src/world/jobs/night-2-sites.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {sampleWorld} from '../src/world/open/samples.js';
import {savedOpenRecord, settleOpenWorld, spendScrap} from '../src/world/open/open-save.js';
import {worldForProfile} from '../src/world/open/open-world.js';

const loadFixture = name => JSON.parse(readFileSync(new URL('./fixtures/saves/' + name, import.meta.url))).storage;
function memoryStorage(fixture) {
  const values = new Map(Object.entries(fixture).map(([key, value]) => [key, JSON.stringify(value)]));
  return {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)};
}
const profileOf = storage => activePlayer(loadPlayers(storage)).profile;
const oldFixture = loadFixture('24-story-water.json'), newFixture = loadFixture('26-story-open.json');
const off = {enabled: id => id === 'hidden-road'};
const on = {enabled: id => off.enabled(id) || id === 'story-choices'};

function appAtYard(fixture, flags = on) {
  globalThis.localStorage = memoryStorage(fixture);
  globalThis.cancelAnimationFrame = () => {};
  const app = new App();
  app.audio.unlock = () => {};
  app.duel.featureFlags = flags;
  assert(app.visitWasteland());
  app.advance(8);
  assert(app.isYardHomeActive());
  return app;
}

// Opening or saving a pre-OPEN-STATE fixture writes no open field. With the
// switch off even a call to the route cannot change one byte in the registry.
{
  const store = memoryStorage(oldFixture);
  const original = store.getItem(PLAYERS_KEY), loaded = loadPlayers(store);
  assert.equal(store.getItem(PLAYERS_KEY), original);
  assert(loaded.players.every(({profile}) => !Object.hasOwn(profile.story ?? {}, 'open')));
  assert(savePlayers(loaded, store));
  assert.deepEqual(loadPlayers(store), loaded);
  for (const fixture of [oldFixture, newFixture]) {
    const app = appAtYard(fixture, off);
    const before = localStorage.getItem(PLAYERS_KEY);
    assert.equal(app.startOpenRoam(), false);
    assert.equal(app.startNight2(), false);
    assert.equal(localStorage.getItem(PLAYERS_KEY), before);
  }
}

// Read the full release-format record, including the independent land seed,
// and save exactly what the world owns. Unknown additive data survives.
{
  const store = memoryStorage(newFixture);
  const profile = profileOf(store);
  const open = newFixture[PLAYERS_KEY].players[0].profile.story.open;
  assert.deepEqual(savedOpenRecord(profile), open);
  const world = worldForProfile(profile, 999);
  assert.deepEqual(world.open, open);
  assert.equal(world.seed, profile.story.ledger.seed);
  assert.notEqual(world.open.landSeed, world.seed);
  assert.notEqual(world.open.car, profile.story.open.car);
  assert.equal(settleOpenWorld(profile, world).profile, profile);

  const choice = {id: 'test/keep-radio-hill', effects: [
    {type: 'find', site: 'radio-hill'}, {type: 'ground', square: 190},
    {type: 'favour', person: 'glasshouse', by: 1}, {type: 'scrap', by: -12},
  ]};
  const changed = applyEffects(world, choice).world;
  const thirdFavour = applyEffects(changed, {id: 'test/third-favour',
    effects: [{type: 'favour', person: 'glasshouse', by: 1}]});
  assert.equal(thirdFavour.world, changed);
  assert.equal(changed.open.favours.glasshouse, 2);
  const result = settleOpenWorld(profile, changed);
  assert(result.ok && result.changed);
  assert.deepEqual(result.profile.story.ledger, profile.story.ledger);
  assert.deepEqual(result.profile.story.laterStory, profile.story.laterStory);
  const registry = loadPlayers(store);
  assert(savePlayers(replacePlayerProfile(registry, registry.activePlayerId, result.profile), store));
  const kept = profileOf(store);
  assert.deepEqual(worldForProfile(kept), changed);
  assert.deepEqual(kept.world, {found: ['tin-town', 'glasshouse', 'radio-hill'], laterMap: {keep: true}});
  const fewer = {...changed, open: {...changed.open, found: []}};
  assert.deepEqual(settleOpenWorld(kept, fewer).profile.story.open.found, ['glasshouse', 'radio-hill']);
  assert.deepEqual(settleOpenWorld(kept, fewer).profile.world.found, kept.world.found);
  assert.deepEqual(savedOpenRecord(profile), open, 'settlement never edits its input');

  for (const story of [{...kept.story, version: 2}, {...kept.story, open: {version: 2, unknown: [4]}},
    {...kept.story, ledger: {version: 2, unknown: [3]}}]) {
    const future = {...kept, story};
    assert.equal(settleOpenWorld(future, changed).profile, future, 'newer records are never overwritten');
  }

  const starting = {atStart: world, savedAtStart: {ledger: profile.story.ledger, open}};
  const funded = {...profile, wasteland: {...profile.wasteland, scrap: 170}};
  assert.equal(settleOpenWorld(funded, changed, starting).profile.wasteland.scrap, 158, 'keep an independent wallet gain');
  const spentElsewhere = {...profile, wasteland: {...profile.wasteland, scrap: 1}};
  assert.equal(settleOpenWorld(spentElsewhere, changed, starting).profile, spentElsewhere, 'refuse an underfunded settlement');
  assert.equal(settleOpenWorld(kept, changed, starting).profile, kept, 'refuse a stale settlement without taking scrap again');

  const spent = spendScrap(profile, 180, 'ransom');
  assert.deepEqual([spent.taken, spent.owed, spent.reason, spent.profile.wasteland.scrap], [140, 40, 'ransom', 0]);
  for (const amount of [0, -1, 1.5, NaN, Infinity])
    assert.equal(spendScrap(profile, amount, 'ransom').profile, profile);
  assert.equal(profile.wasteland.scrap, 140);
}

// The same named Ash feud still belongs to the ledger. The open effects keep
// their separate journal, and replaying the choices from a sample agrees.
{
  const world = sampleWorld('first-night');
  const effects = [{type: 'find', site: 'glasshouse'}, {type: 'site', id: 'glasshouse', stage: 'burned'},
    {type: 'favour', person: 'glasshouse', by: 1}, {type: 'scrap', by: -8},
    {type: 'thread', id: 'burned-camp', to: 'clues'}, {type: 'town', post: 'ransom', scrap: 8},
    {type: 'feud', of: 'road-rats', by: 1}, {type: 'feud', of: 'ash-men', by: 1}];
  const choice = {id: 'test/open-ledger', effects};
  const applied = applyEffects(world, choice).world;
  const old = applyChoice(world.ledger, {id: choice.id, effects: [{type: 'feud', by: 1}]}).ledger;
  assert.deepEqual(applied.ledger, old);
  assert.deepEqual(applied.open.journal.map(change => [change.type, change.choiceId, change.night]),
    effects.slice(0, -1).map(effect => [effect.type, choice.id, world.ledger.night]));
  assert.deepEqual(applyEffects(sampleWorld('first-night'), choice).world, applied);
  assert.equal(applyEffects(applied, choice).world, applied, 'the saved choice must not pay twice');
}

const runningJob = app => app.duel.state.arena.worldJob;
function chooseInOpen(app, id, effects) {
  const job = runningJob(app);
  job.open.world = applyEffects(job.open.world, {id, effects}).world;
}
function tellNight2(app, extraQuestion = false) {
  assert(app.startNight2());
  const duel = app.duel, worldJob = runningJob(app);
  assert.equal(worldJob.night2.ledger.stocks.embers, 6);
  assert.equal(worldJob.night2.ledger.stocks.gas, 3);
  assert.equal(worldJob.night2.ledger.words.glasshouse, 'Friendly');
  duel.state.countdown = 0;
  const step = () => duel.step(1 / 60);
  const stage = () => worldJob.job.steps[worldJob.job.stepIndex]?.id;
  const screen = () => worldJob.job.stepState.screen;
  const turn = action => { assert(duel.talkInput(action, screen())); step(); };
  const until = condition => {
    for (let i = 0; i < 30 && !condition(); i++) {
      if (!screen()) step();
      else turn({type: 'advance'});
    }
    assert(condition(), 'Night 2 did not reach the next scene');
  };
  const say = words => {
    until(() => screen()?.phase === 'options');
    const index = screen().options.findIndex(option => option.words === words);
    assert(index >= 0, words);
    turn({type: 'select', index});
  };
  until(() => stage() === 'walk-to-gate');
  const {x, y, z} = sites.gateTalk.position;
  Object.assign(duel.state.fighter, duel.course.nearest(x, z), {x, y, z, groundY: y, speed: 0});
  step();
  step();
  assert.equal(stage(), 'gate');
  if (extraQuestion) say(NIGHT_2_QUESTIONS[1].words);
  say(NIGHT_2_CHOICES[0].words);
  until(() => stage() === 'salt');
  until(() => duel.state.status === 'arena_result');
  return duel.state.arena.result;
}

// Roam, leave from pause, retry, reload, bank Night 2, and replace its
// telling. A different question changes the telling without losing roam.
{
  const app = appAtYard(oldFixture);
  let seed = 1;
  while (namedThrow(createLedger(night2Opening(seed)), 'night-2/dace-steals', .5)) seed++;
  app.seed = seed;
  assert(app.startOpenRoam());
  const world = runningJob(app).open.world;
  assert.equal(world.ledger.night, 2);
  assert.equal(world.ledger.stocks.embers, 4);
  assert.equal(world.ledger.stocks.gas, 0);
  assert.equal(savedLedger(profileOf(localStorage)), null, 'entering roam is read only');
  chooseInOpen(app, 'test/help-before-night', [
    {type: 'find', site: 'glasshouse'}, {type: 'word', person: 'glasshouse', set: 'Friendly'},
    {type: 'met', person: 'glasshouse', text: 'You found the Glasshouse before dark.'},
    {type: 'stock', stock: 'embers', by: 2}, {type: 'stock', stock: 'gas', by: 3},
    {type: 'roadWord', by: 1}, {type: 'scrap', by: -8},
  ]);
  app.duel.state.armor = 57;
  app.togglePause();
  assert(app.worldJobAgain());
  assert.equal(runningJob(app).open.world.scrap, 892);
  assert.equal(app.duel.state.armor, 57);
  assert.equal(runningJob(app).open.world.open.car.armour, 57);
  assert(app.leaveWorldJob());
  assert(app.returnToYard());
  app.advance(8);
  const beforeNight = profileOf(localStorage);
  assert.deepEqual(beforeNight.world.found, ['glasshouse']);
  assert.equal(savedLedger(beforeNight).night, 2);
  const first = tellNight2(app);
  assert(first.settlementSaved, first.night2SaveIssue);
  const banked = profileOf(localStorage);
  assert.equal(banked.wasteland.scrap, 902, 'one salt payment');
  assert.equal(savedLedger(banked).night, 3);
  assert.equal(savedLedger(banked).stocks.embers, 4, 'home stock reflects roaming, the gift and the bank');
  const beforeChapter = savedLedger(beforeNight).history;
  assert.deepEqual(savedLedger(banked).history.slice(0, beforeChapter.length), beforeChapter);
  assert(app.night2Continue());
  assert(app.isYardHomeActive());

  app.seed = seed + 1000;
  const second = tellNight2(app, true);
  assert(second.night2Replay?.differences.some(change => change.slot === 'marks' && change.key === 'know-south-ford'));
  assert.deepEqual(profileOf(localStorage), banked, 'comparison itself is read only');
  assert(app.chooseNight2Replay('review'));
  assert(app.chooseNight2Replay('replace'));
  const replayed = profileOf(localStorage);
  const ledger = savedLedger(replayed);
  assert.equal(ledger.seed, seed);
  assert.equal(ledger.night, 3);
  assert.equal(ledger.stocks.embers, 4);
  assert.equal(ledger.stocks.gas, 3);
  assert.equal(ledger.roadWord, 2);
  assert.deepEqual(ledger.history.slice(0, beforeChapter.length), beforeChapter);
  assert(ledger.marks.includes('know-south-ford'));
  assert.deepEqual(replayed.story.open, beforeNight.story.open);
  assert.equal(replayed.wasteland.scrap, 902, 'keeping a replay cannot pay again');
}

// A mission begun in the open writes on a real finish. A pause exit from
// the same definition is a loss and writes nothing.
for (const complete of [false, true]) {
  const app = appAtYard(newFixture);
  const job = {id: 'open-test/mission', seed: app.seed, open: {world: worldForProfile(app.profile, app.seed)},
    steps: [{kind: 'reach', place: sites.car, radius: 20_000}]};
  assert(app._startArenaFight({venueId: 'scablands', mode: 'world-job', opponents: 0, job}));
  chooseInOpen(app, 'test/mission-effects', [{type: 'scrap', by: 11}, {type: 'find', site: 'radio-hill'}]);
  const before = localStorage.getItem(PLAYERS_KEY);
  if (complete) {
    app.advance(4);
    assert.equal(app.duel.state.arena.result.reason, 'job-complete');
    const kept = profileOf(localStorage);
    assert.equal(kept.wasteland.scrap, 151);
    assert.deepEqual(kept.story.open.found, ['glasshouse', 'radio-hill']);
    const state = app.duel.state;
    app._settleArenaResult({result: state.arena.result}, state);
    assert.deepEqual(profileOf(localStorage), kept, 'duplicate result does not award scrap again');
  } else {
    assert(app.leaveWorldJob());
    assert.equal(app.duel.state.arena.result.reason, 'job-quit');
    assert.equal(localStorage.getItem(PLAYERS_KEY), before);
  }
}

// A rejected storage write leaves the old record and wallet intact. Retrying
// the same exit saves the result once before starting a fresh roam.
{
  const app = appAtYard(newFixture);
  assert(app.startOpenRoam());
  chooseInOpen(app, 'test/failed-write', [{type: 'scrap', by: -6}, {type: 'dirt', to: 0}]);
  const store = localStorage, before = store.getItem(PLAYERS_KEY);
  globalThis.localStorage = {...store, setItem() { throw new Error('Storage is temporarily unavailable.'); }};
  assert(app.leaveWorldJob());
  assert.equal(app.duel.state.arena.result.settlementSaved, false);
  assert.equal(store.getItem(PLAYERS_KEY), before);
  assert.equal(app.worldJobAgain(), false);
  globalThis.localStorage = store;
  assert(app.worldJobAgain());
  assert.equal(runningJob(app).open.world.scrap, 134);
  assert.equal(runningJob(app).open.world.open.car.dirt, 0);

  chooseInOpen(app, 'test/switch-off-at-exit', [{type: 'scrap', by: 20}]);
  const kept = store.getItem(PLAYERS_KEY);
  app.duel.featureFlags = off;
  assert(app.leaveWorldJob());
  assert.equal(store.getItem(PLAYERS_KEY), kept, 'switch-off settlement writes nothing');
}

// Another session can switch the active player while a job is open. A
// finishing job may never switch that player back or write either profile.
{
  const app = appAtYard(oldFixture);
  assert(app.startOpenRoam());
  chooseInOpen(app, 'test/changed-active-player', [{type: 'scrap', by: -5}]);
  assert(savePlayers(selectPlayer(loadPlayers(localStorage), 'water-old'), localStorage));
  const before = localStorage.getItem(PLAYERS_KEY);
  assert(app.leaveWorldJob());
  assert.equal(app.duel.state.arena.result.settlementSaved, false);
  assert.equal(app.worldJobAgain(), false);
  assert.equal(localStorage.getItem(PLAYERS_KEY), before);
}

console.log('Open state: fixture compatibility, settlements, restart, spending and shared Night 2 replay passed.');

// Merge of 25 November: a saved ledger whose history cannot be told again starts Night 2 afresh and does not throw.
{
  const {night2Job: job, night2Opening: opening} = await import('../src/world/jobs/night-2.js');
  const {createLedger: fresh} = await import('../src/story/ledger.js');
  const damaged = {...fresh({...opening(5), night: 3}), history: [
    {type: 'stock', key: 'embers', fact: 'stock', choiceId: 'night-2/start-after-roam', night: 2},
    {type: 'night', key: 'night', before: 2, choiceId: 'bank/2', night: 2}]};
  job(5, {saved: damaged});
}
