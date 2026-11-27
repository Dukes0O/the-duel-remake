import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {App} from '../src/app.js';
import {PLAYERS_KEY, activePlayer, loadPlayers, replacePlayerProfile, savePlayers} from '../src/progression.js';
import {settleArenaResult} from '../src/arena/arena-settlement.js';
import {arenaResultsScreen} from '../src/screen-arena.js';
import {EMBER_JOBS, applyArrivedRun, applyBattleEnding, emberFeud, emberRuns} from '../src/story/ember-save.js';
import {bankHearth, createLedger} from '../src/story/ledger.js';
import {bankOpenHearth, savedLedger} from '../src/story/ledger-save.js';
import {learnerTalk, morningLine, mossTalk, passengerLine, routineOffer, shortStoreLine} from '../src/story/scenes/routine-offer.js';
import {validateTalkScene} from '../src/story/talk.js';
import {gasRunJob, gasRunPay} from '../src/world/jobs/gas-run.js';
import {night2Opening} from '../src/world/jobs/night-2.js';
import {NIGHT_2_SITES} from '../src/world/jobs/night-2-sites.js';
import {stepEscort} from '../src/world/jobs/steps/escort.js';
import {GAS_ROUTINE, learnerOf} from '../src/world/open/content/routines.js';
import {advanceDay, daySecondsOf, partOfDay} from '../src/world/open/day-rule.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {beginOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {routinesPart} from '../src/world/open/parts/routines.js';
import {newWorld} from '../src/world/open/open-record.js';
import {savedOpenRecord, settleOpenHearth, settleOpenWorld} from '../src/world/open/open-save.js';
import {worldForProfile} from '../src/world/open/open-world.js';
import {answerRoutine, arriveHandRun, mayOfferRoutine, morningDelivery, routineFor, setRoutineRunning,
  runBankedRoutines, showRoutineOffer, takeHandRun, willingLearners} from '../src/world/open/routine-run-rule.js';
import {worldHudModel} from '../src/world/world-hud.js';
import {pageSource, run as scenario} from './scenarios/open-apprentice-run.mjs';

const on = {storyChoices: true};
const nextNight = world => ({...world, ledger: bankHearth(world.ledger).ledger});
const dusk = world => ({...world, open: {...world.open, day: {night: world.ledger.night, seconds: 960}}});
const choice = (world, id, effects) => applyEffects(world, {id, effects}).world;
const profile = {wasteland: {scrap: 0}};
const hand = (world, load = 60, clean = true, passenger = null) => arriveHandRun(world, {load, clean, passenger});
const learner = 'tin-cook';

test('the open play clock supplies a shared dawn, day, dusk and dark', () => {
  assert.deepEqual([0, 119.99, 120, 959.99, 960, 1199.99, 1200, 3000].map(partOfDay),
    ['dawn', 'dawn', 'day', 'day', 'dusk', 'dusk', 'dark', 'dark']);
  assert.equal(advanceDay(1200, 3200), 1200);
  const world = dusk(newWorld({night: 5}));
  const state = beginOpenLand({open: {world, dayClock: true}, steps: [{kind: 'roam'}]});
  const read = {id: 'observer', step: (previous, {view}) => ({state: view.partOfDay})};
  assert.equal(state.partOfDay, 'dusk');
  const dark = stepOpenLand(state, {}, 240, [read]).open;
  assert.equal(dark.parts.observer, 'dark');
  assert.equal(state.daySeconds, 960);
  assert.equal(daySecondsOf(nextNight(world)), 0, 'a saved clock belongs to its ledger night');
});

test('Cinder waits for a hand run and a loss or three runs, and respects three banked nights', () => {
  const world = newWorld({night: 7, embers: 3});
  const lost = choice(world, 'burned-camp/ransom/paid', [{type: 'stock', stock: 'embers', by: -2}]);
  assert(!mayOfferRoutine(lost));
  assert(mayOfferRoutine({...lost, legacyHandRuns: 1}));
  assert(!mayOfferRoutine({...world, legacyHandRuns: 2}));
  assert(mayOfferRoutine({...world, legacyHandRuns: 3}));
  const burned = nextNight(nextNight({...world, legacyHandRuns: 1}));
  assert.equal(burned.ledger.stocks.embers, 1);
  assert(!mayOfferRoutine(burned), 'an ordinary burn is not a loss');
  const shown = showRoutineOffer({...lost, legacyHandRuns: 1});
  assert(routineFor(shown).offered);
  let refused = answerRoutine(shown, 'not-yet');
  assert.equal(routineFor(refused).refusedNight, refused.ledger.night);
  for (let i = 0; i < 3; i++, refused = nextNight(refused)) assert(!mayOfferRoutine(refused));
  assert(mayOfferRoutine(refused));
  const recovered = choice({...refused, legacyHandRuns: 1}, 'embers-found', [{type: 'stock', stock: 'embers', by: 4}]);
  assert(mayOfferRoutine(recovered), 'a refused offer returns after three nights even after stock recovers');
});

test('an offer skipped for a priority story conversation is offered again', () => {
  const world = {...newWorld({night: 3}), legacyHandRuns: 3};
  const view = {openRoam: true, dayClock: true, partOfDay: 'dusk', onFoot: true,
    fighter: {position: NIGHT_2_SITES.hearthFront.position}};
  const first = routinesPart.step({}, {world, view, holds: []});
  const scene = first.requests[0].id;
  assert.deepEqual(first.choices, []);
  const skipped = routinesPart.step(first.state, {world, holds: [], view: {...view,
    jobEvents: [{type: 'openTalkSkipped', scene}]}});
  assert.equal(skipped.state.talk, null);
  assert.equal(routinesPart.step(skipped.state, {world, view, holds: []}).requests[0].id, scene);
});

test('the ledger casts interested neighbours and the town always supplies a learner', () => {
  const plain = {...newWorld({night: 3}), legacyHandRuns: 3};
  const word = choice(plain, 'said-friend', [{type: 'word', person: 'dace', set: 'Friendly'}]);
  const favour = choice(plain, 'owed', [{type: 'favour', person: 'walkers', by: 1}]);
  assert.deepEqual(willingLearners(plain).map(person => person.id), [learner]);
  assert.deepEqual(willingLearners(word).map(person => person.id), ['dace', learner]);
  assert.deepEqual(willingLearners(favour).map(person => person.id), ['dace', 'rell', learner]);
  assert.equal(answerRoutine(plain, 'dace'), plain);
  const accepted = answerRoutine(plain, learner);
  assert(routineFor(accepted).lessonPending);
  assert.equal(routineFor(accepted).running, false);

  const people = routineOffer(favour, 'SpikeyFerns');
  assert(people.lines[0].words.startsWith('SpikeyFerns,'));
  assert.equal(people.questions.length, 3);
  assert.deepEqual(routineOffer(plain, 'Kyle').choices.map(option => option.id), ['teach/' + learner, 'not-yet']);
  const taught = routineFor(hand(accepted, 60, true, learner).world);
  const scenes = [people, learnerTalk(taught), mossTalk(accepted), mossTalk({...accepted, routineRoads: ['boneyard']})];
  for (const scene of scenes) validateTalkScene(scene);
  const fallback = learnerOf(GAS_ROUTINE, learner);
  const lines = scenes.flatMap(scene => [...scene.lines, ...scene.choices,
    ...(scene.questions ?? []).flatMap(question => [question, ...question.lines])]);
  for (const words of [...lines.map(line => line.words), morningLine(fallback, {gas: 40, byHand: 60, embers: 2, handEmbers: 3}).words,
    shortStoreLine(fallback).words, ...[0, .5, 1].map(progress => passengerLine(fallback, progress))])
    assert.doesNotMatch(words, /\b(?:loop|automate|schedule|set up)\b|—/i);
});

test('the arrival reading is sampled once and the best of the seeded lessons is kept', () => {
  const job = gasRunJob({road: 'long', routineRun: {night: 4}});
  const step = job.steps[0], truck = {id: step.actorId, health: 69.9, atDestination: true};
  const arrival = stepEscort(step, {}, {actors: [truck]});
  assert.deepEqual(arrival.events, [{type: 'routineGasArrived', load: 41, clean: false}]);
  assert.equal(stepEscort(step, arrival.state, {actors: [{...truck, health: 100}]}).events.length, 0);
  assert.deepEqual(stepEscort(gasRunJob({road: 'long'}).steps[0], {}, {actors: [truck]}).events, []);
  const pristine = stepEscort(step, {}, {actors: [{...truck, health: 100}]});
  assert.deepEqual(pristine.events, [{type: 'routineGasArrived', load: 60, clean: true}]);

  let world = answerRoutine({...newWorld({seed: 93, night: 4, gas: 12}), legacyHandRuns: 3}, learner);
  const start = structuredClone(world);
  const first = hand(world, 31, false, learner);
  assert.deepEqual(world, start);
  const dirty = routineFor(first.world);
  assert(dirty.share >= .6 && dirty.share <= .85);
  assert.equal(first.embers, 2);
  assert.equal(first.world.ledger.stocks.gas, 3);
  assert.deepEqual(hand(world, 31, false, learner), first);
  assert.equal(hand(first.world, 60, true, learner).world, first.world, 'a delivery cannot be posted twice today');

  world = takeHandRun(nextNight(first.world), {teach: true});
  const better = routineFor(hand(world, 60, true, learner).world);
  assert(better.share > dirty.share && better.share <= .85);
  assert.equal(better.lessonLoad, 60);
  assert(better.running && !better.lessonPending);
  world = takeHandRun(nextNight(hand(world, 60, true, learner).world), {teach: true});
  const worse = routineFor(hand(world, 30, false, learner).world);
  assert.deepEqual([worse.lessonLoad, worse.share], [60, better.share]);
});

test('open banks carry gas, bake before the burn, settle only once and leave the outing free', () => {
  const start = {...newWorld({seed: 19, night: 7, gas: 11, embers: 0}), legacyHandRuns: 3};
  const taught = hand(answerRoutine(start, learner), 60, true, learner).world;
  assert.equal(routineFor(taught).handNight, 7);
  const lessonNight = bankOpenHearth(dusk(taught), 7, on);
  assert.equal(routineFor(lessonNight).tally.runs, 0, 'a lesson uses that day’s trip');
  assert.equal(lessonNight.open.outingNight, undefined);
  const night = dusk(lessonNight);
  const expectedLoad = Math.floor(routineFor(night).share * 60);
  const baked = Math.floor((night.ledger.stocks.gas + expectedLoad) / 20);
  assert.equal(bankOpenHearth(night, 8), null, 'off switch cannot bank an open hearth');
  assert.equal(bankOpenHearth(lessonNight, 8, on), null, 'dawn cannot be banked');
  assert.equal(bankOpenHearth(dusk(newWorld({night: 2})), 2, on), null, 'authored Night 2 keeps its own bank');
  assert.equal(routineFor(night).tally.runs, 0, 'time in play has paid nothing');

  const saved = settleOpenWorld(profile, night).profile;
  const options = {...on, night: 8, savedAtStart: {open: savedOpenRecord(saved), ledger: savedLedger(saved)}};
  const outcome = settleOpenHearth(saved, night, options);
  assert(outcome.ok && outcome.changed);
  const loaded = JSON.parse(JSON.stringify(outcome.profile)), after = worldForProfile(loaded);
  assert.equal(after.ledger.night, 9);
  assert.equal(after.ledger.stocks.gas, (night.ledger.stocks.gas + expectedLoad) % 20);
  assert.equal(after.ledger.stocks.embers, night.ledger.stocks.embers + baked - 1);
  assert.deepEqual(routineFor(after).tally, {runs: 1, gas: expectedLoad, embers: baked});
  assert.equal(morningDelivery(after).gas, expectedLoad);
  assert.equal(daySecondsOf(after), 0);
  assert.equal(after.open.outingNight, undefined);
  assert.equal(settleOpenHearth(loaded, night, options).profile, loaded, 'repeated bank cannot re-award');
  const manual = hand(takeHandRun(night)).world;
  assert(manual.ledger.stocks.embers > after.ledger.stocks.embers);
  assert.equal(routineFor(bankOpenHearth(dusk(manual), 8, on)).tally.runs, 0);
  assert.equal(routineFor(bankOpenHearth(dusk(takeHandRun(night)), 8, on)).tally.runs, 0);
  const stopped = setRoutineRunning(night, false);
  assert.equal(routineFor(bankOpenHearth(dusk(stopped), 8, on)).tally.runs, 0);
  assert(routineFor(setRoutineRunning(stopped, true)).running);

  const ransom = choice(stopped, 'burned-camp/ransom/paid', [{type: 'stock', stock: 'embers', by: -15}]);
  assert(mayOfferRoutine(ransom), 'a stopped routine can be offered after a loss');
  assert(!mayOfferRoutine(setRoutineRunning(ransom, true)), 'a running learner gets Cinder’s reassurance');
  const resume = answerRoutine(ransom, learner);
  assert.equal(routineFor(resume).share, routineFor(stopped).share);
  assert(!routineFor(resume).running && routineFor(resume).lessonPending);
  assert(routineFor(hand(resume, 50, false, learner).world).running, 'the chosen learner resumes after the lesson');

  const old = {...saved.story.open, routines: {'gas-run': {offered: true, learner: 'dace',
    share: .75, lessonLoad: 60, running: true, tally: 40}, 'future-routine': {keep: true}}};
  const older = {...saved, story: {...saved.story, open: old}};
  assert.equal(savedOpenRecord(older), old);
  const folded = settleOpenHearth(older, worldForProfile(older), {...on, night: 8});
  assert(folded.ok);
  assert.deepEqual(folded.profile.story.open.routines['future-routine'], {keep: true});
  assert.equal(folded.profile.story.open.routines['gas-run'].tally.gas, 85);
  const broken = {...loaded, story: {...loaded.story, open: {...loaded.story.open,
    routines: {'gas-run': {...routineFor(after), share: 5}}}}};
  assert.equal(settleOpenWorld(broken, after).profile, broken, 'a damaged known routine is not overwritten');
});

const flags = choices => ({enabled: id => ['hidden-road', 'story-everburn', 'scablands-runs', ...(choices ? ['story-choices'] : [])].includes(id)});
const jobOf = app => app.duel.state.arena.worldJob;
const disk = () => activePlayer(loadPlayers(localStorage)).profile;
const source = JSON.parse(readFileSync(new URL('./fixtures/saves/26-story-open.json', import.meta.url))).storage;
function appAtYard({choices = true, feud = 1, night = 3} = {}) {
  const fixture = structuredClone(source);
  const stored = fixture[PLAYERS_KEY].players[0].profile;
  stored.story = {...stored.story, ember: {read: true, jobs: EMBER_JOBS, feud, runs: 3}};
  stored.story.open = {...stored.story.open, routines: {}};
  if (night === null) delete stored.story.ledger;
  else if (night === 2) stored.story.ledger = {version: 1, ...createLedger(night2Opening(stored.story.ledger.seed))};
  const values = new Map(Object.entries(fixture).map(([key, value]) => [key, JSON.stringify(value)]));
  globalThis.localStorage = {getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key)};
  globalThis.cancelAnimationFrame = () => {};
  const app = new App();
  app.audio.unlock = () => {};
  app.duel.featureFlags = flags(choices);
  assert(app.visitWasteland());
  app.advance(8);
  assert(app.isYardHomeActive());
  return app;
}

function interact(app) {
  app.keys.KeyF = true;
  try { app.advance(.15); } finally { app.keys.KeyF = false; }
}

function answer(app, match) {
  const job = jobOf(app), screen = () => job.job.stepState.screen;
  assert(screen());
  for (let i = 0; i < 5 && screen()?.phase !== 'options'; i++) {
    assert(app.duel.talkInput({type: 'advance'}, screen()));
    app.advance(.05);
  }
  const index = screen().options.findIndex(option => option.words.includes(match));
  assert(index >= 0, JSON.stringify(screen().options));
  assert(app.duel.talkInput({type: 'select', index}, screen()));
  app.advance(.1);
}

test('App measures a learner trip, refuses and retries a hearth bank, then shows the dawn receipt', () => {
  const app = appAtYard();
  assert(app.startOpenRoam());
  app.advance(4);
  const current = jobOf(app);
  const beforePause = current.open.daySeconds;
  app.togglePause();
  app.advance(5);
  assert.equal(current.open.daySeconds, beforePause);
  app.togglePause();
  interact(app);
  answer(app, "You're coming with me");
  assert.equal(routineFor(current.open.world).learner, learner);

  const moss = current.storyPeople.find(person => person.id === 'moss').position;
  const {s, lateral} = app.duel.course.nearest(moss.x + 1, moss.z);
  Object.assign(app.duel.state.fighter, {x: moss.x + 1, y: moss.y, z: moss.z, groundY: moss.y, s, lateral});
  interact(app);
  answer(app, "I'll take the long road");
  assert.equal(app.duel.state.arena.result.openExit.to, 'gas-run');
  assert.equal(routineFor(worldForProfile(disk())).handNight, savedLedger(disk()).night);
  assert(app.worldJobAgain());
  const gas = jobOf(app);
  assert.equal(gas.definition.routineRun.passenger.id, learner);
  app.advance(4);
  assert.match(worldHudModel({worldJob: gas}).lesson.line, /riding beside you/);
  const prior = disk(), night = savedLedger(prior).night;
  // Use the same final-stretch setup the laptop scenario sends to the page.
  globalThis.window = {__qaApp: app};
  try { new Function('return ' + pageSource('finalStretch'))(); }
  finally { delete globalThis.window; }
  const state = app.duel.state, result = state.arena.result;
  assert(result.settlementSaved, result.routineSaveIssue);
  assert.deepEqual(result.routineGas, {gas: 60, embers: 3});
  assert.equal(disk().wasteland.scrap - prior.wasteland.scrap, gasRunPay('long', app.cpuDifficulty));
  assert.equal(emberRuns(disk()), 4);
  assert.equal(routineFor(worldForProfile(disk())).lessonLoad, 60);
  const deliveryBytes = localStorage.getItem(PLAYERS_KEY);
  assert.equal(app._settleArenaResult({result}, state), false);
  assert.equal(localStorage.getItem(PLAYERS_KEY), deliveryBytes);

  assert(app.worldJobAgain());
  app.advance(4);
  jobOf(app).open.daySeconds = 960;
  interact(app);
  answer(app, 'bank the hearth');
  assert.equal(savedLedger(disk()).night, night + 1);
  assert.equal(routineFor(worldForProfile(disk())).tally.runs, 0);
  assert(app.worldJobAgain());
  app.advance(4);
  jobOf(app).open.daySeconds = 960;
  interact(app);
  const store = localStorage, beforeFailure = store.getItem(PLAYERS_KEY);
  globalThis.localStorage = {...store, setItem() { throw Error('QA write denied'); }};
  answer(app, 'bank the hearth');
  assert.equal(app.duel.state.arena.result.settlementSaved, false);
  assert.equal(store.getItem(PLAYERS_KEY), beforeFailure);
  assert.equal(app.worldJobAgain(), false);
  globalThis.localStorage = store;
  assert(app.worldJobAgain());
  assert.equal(savedLedger(disk()).night, night + 2);
  assert.equal(routineFor(worldForProfile(disk())).tally.runs, 1);
  app.advance(4);
  assert.equal(jobOf(app).open.partOfDay, 'dawn');
  assert.match(jobOf(app).job.stepState.screen.line.words, /brought home \d+ of gas yesterday/);
  assert.equal(jobOf(app).job.steps[jobOf(app).job.stepIndex].openPerson, 'cinder');
});

test('the measured road reserves the day and retries refused pay without duplicating it', () => {
  const app = appAtYard();
  const before = disk();
  assert(app.gasRun('long'));
  const reserved = disk();
  assert.equal(routineFor(worldForProfile(reserved)).handNight, savedLedger(before).night);
  assert.deepEqual(savedLedger(reserved), savedLedger(before));
  assert.equal(reserved.wasteland.scrap, before.wasteland.scrap);

  app.advance(4);
  const gas = jobOf(app), bess = gas.actors.find(actor => actor.id === 'big-bess');
  const path = gas.definition.steps[0].path;
  bess.position = {...path.at(-1).position};
  bess.pathIndex = path.length - 1;
  const store = localStorage;
  globalThis.localStorage = {...store, setItem() { throw Error('QA write denied'); }};
  app.advance(6);
  assert(!app.duel.state.arena.result.settlementSaved);
  assert.deepEqual(disk(), reserved);
  assert.equal(app.worldJobAgain(), false);
  globalThis.localStorage = store;
  assert(app.worldJobAgain());
  assert.equal(emberRuns(disk()), emberRuns(before) + 1);
  assert.equal(disk().wasteland.scrap - reserved.wasteland.scrap, gasRunPay('long', app.cpuDifficulty));
  assert.equal(savedLedger(disk()).stocks.embers, savedLedger(before).stocks.embers + 3);
});

test('the switch-off road keeps its old save path and the battle has no gas when enabled', () => {
  const app = appAtYard({choices: false});
  assert(app.gasRun('long'));
  assert(!jobOf(app).definition.routineRun);
  assert(!jobOf(app).definition.steps[0].measureGas);
  app.advance(4);
  const gas = jobOf(app), bess = gas.actors.find(actor => actor.id === 'big-bess');
  const drive = gas.definition.steps[0].path;
  bess.position = {...drive.at(-1).position};
  bess.pathIndex = drive.length - 1;
  const before = disk();
  app.advance(6);
  assert(app.duel.state.arena.result.settlementSaved);
  assert.deepEqual(disk().story.open, before.story.open);
  assert.deepEqual(disk().story.ledger, before.story.ledger);
  const atWar = appAtYard({feud: 4});
  assert(atWar.gasRun('boneyard'));
  assert(jobOf(atWar).definition.battle && !jobOf(atWar).definition.routineRun);
  const battle = applyBattleEnding(disk(), 'won', {countRun: false});
  assert(battle.ok);
  assert.equal(emberRuns(battle.profile), 3);
  assert.equal(battle.feudAfter, 1);
});

function finishGasRun(app) {
  const job = jobOf(app), bess = job.actors.find(actor => actor.id === 'big-bess');
  const path = job.definition.steps[0].path;
  bess.position = {...path.at(-1).position};
  bess.pathIndex = path.length - 1;
  app.advance(6);
  assert.equal(app.duel.state.status, 'arena_result');
  return app.duel.state.arena.result;
}

test('pre-Night-2 hand runs keep Night 2 at its written opening stocks', () => {
  for (const night of [null, 2]) {
    const app = appAtYard({night});
    const before = disk();
    assert(app.gasRun('long'));
    assert(!jobOf(app).definition.routineRun);
    assert(!jobOf(app).definition.steps[0].measureGas);
    assert.deepEqual(disk().story, before.story, 'starting a pre-Night-2 gas run writes no story');
    app.advance(4);
    const first = finishGasRun(app);
    assert(first.settlementSaved);
    assert.equal(first.routineGas, undefined);
    assert(app.worldJobAgain(), 'a second Story Wall run can start');
    app.advance(4);
    assert(finishGasRun(app).settlementSaved);
    const after = disk();
    assert.equal(emberRuns(after), emberRuns(before) + 2);
    assert.equal(after.wasteland.scrap - before.wasteland.scrap, 2 * gasRunPay('long', app.cpuDifficulty));
    assert.deepEqual(after.story.open, before.story.open);
    assert.deepEqual(savedLedger(after), savedLedger(before));
    assert(app.returnToYard());
    app.advance(8);
    assert(app.startNight2());
    assert.deepEqual(jobOf(app).night2.ledger.stocks, {embers: 4, gas: 0});
  }
});

test('an old routine record stays untouched until Night 2 is banked', () => {
  const night2 = {...newWorld({night: 2, embers: 1, gas: 22}), legacyHandRuns: 3};
  night2.open.routines['gas-run'] = {offered: true, learner: 'dace', share: .75, lessonLoad: 60, running: true, tally: 40};
  const original = structuredClone(night2);
  assert(!mayOfferRoutine({...night2, open: {...night2.open, routines: {}}}));
  assert.equal(arriveHandRun(night2, {load: 60, clean: true}).world, night2);
  assert.equal(runBankedRoutines(night2), night2);
  assert.equal(takeHandRun(night2), night2);
  assert.deepEqual(night2, original);
  const next = nextNight(night2);
  assert.equal(routineFor(next).learner, 'dace');
  assert(runBankedRoutines(next).ledger.stocks.embers > next.ledger.stocks.embers);
});

test('unmeasured, invalid and stale gas arrivals still keep scrap and feud exactly once', (t) => {
  const warnings = t.mock.method(console, 'warn', () => {});
  for (const fault of ['missing', 'invalid', 'stale-night', 'stale-record']) {
    const app = appAtYard({feud: 2});
    assert(app.gasRun('long'));
    app.advance(4);
    if (fault === 'missing' || fault === 'invalid') {
      delete jobOf(app).job.steps[0].measureGas;
      if (fault === 'invalid') jobOf(app).routineGasArrival = {load: -1, clean: true};
    } else {
      const registry = loadPlayers(localStorage), {id, profile} = activePlayer(registry);
      const story = {...profile.story};
      if (fault === 'stale-night') story.ledger = bankHearth(savedLedger(profile)).ledger;
      else story.open = {...story.open, found: [...story.open.found, 'radio-hill']};
      assert(savePlayers(replacePlayerProfile(registry, id, {...profile, story}), localStorage));
    }
    const before = disk(), result = finishGasRun(app);
    assert(result.settlementSaved, fault);
    assert(!result.routineSaveIssue, fault);
    assert.equal(result.routineGas, undefined, fault);
    assert.equal(disk().wasteland.scrap - before.wasteland.scrap, gasRunPay('long', app.cpuDifficulty), fault);
    assert.equal(emberRuns(disk()), emberRuns(before) + 1, fault);
    assert.equal(emberFeud(disk()), emberFeud(before) - 1, fault);
    assert.deepEqual(disk().story.open, before.story.open, fault);
    assert.deepEqual(savedLedger(disk()), savedLedger(before), fault);
    const state = app.duel.state, after = disk();
    assert.equal(app._settleArenaResult({result}, state), false);
    assert.deepEqual(disk(), after);
  }
  assert.equal(warnings.mock.callCount(), 4);
  assert(warnings.mock.calls.every(call => /gas/.test(call.arguments[0])));
});

for (const night of [2, 3]) {
  test(`a failed write on night ${night} keeps the run’s earnings when returning to the yard`, () => {
    const app = appAtYard({feud: 2, night});
    assert(app.gasRun('long'));
    assert.equal(Boolean(jobOf(app).definition.routineRun), night === 3);
    app.advance(4);
    const store = localStorage, before = disk(), pay = gasRunPay('long', app.cpuDifficulty);
    globalThis.localStorage = {...store, setItem() { throw Error('QA write denied'); }};
    try {
      const result = finishGasRun(app);
      assert(!result.settlementSaved);
      assert.deepEqual(disk(), before);
      assert.equal(app.profile.wasteland.scrap, before.wasteland.scrap + pay);
      assert.equal(emberFeud(app.profile), emberFeud(before) - 1);
      assert(app.returnToYard());
      app.advance(8);
      assert(app.isYardHomeActive());
      assert.equal(app.profile.wasteland.scrap, before.wasteland.scrap + pay);
      assert.equal(emberFeud(app.profile), emberFeud(before) - 1);
      assert.equal(emberRuns(app.profile), emberRuns(before) + 1);
      assert.deepEqual(disk(), before);
    } finally { globalThis.localStorage = store; }
    assert(app._saveProfile());
    assert.equal(disk().wasteland.scrap, before.wasteland.scrap + pay);
    assert.equal(emberRuns(disk()), emberRuns(before) + 1);
    if (night === 2) {
      assert.deepEqual(savedLedger(disk()), savedLedger(before));
      assert.deepEqual(disk().story.open, before.story.open);
    }
  });
}

test('the pre–Night 2 result action retries a denied write and pays once', () => {
  const app = appAtYard({night: 2, feud: 2});
  assert(app.gasRun('long'));
  app.advance(4);
  const store = localStorage, before = disk(), runId = app.runId;
  globalThis.localStorage = {...store, setItem() { throw Error('QA write denied'); }};
  try {
    const result = finishGasRun(app), state = app.duel.state;
    const screen = arenaResultsScreen(state, {
      metric: () => '', action: (label, action) => `${label} ${action}\n`, escapeHTML: String,
    });
    assert(!result.settlementSaved);
    assert.equal(app.worldJobAgain(), false);
    assert.equal(app.duel.state, state);
    assert.match(screen.actions, /DRIVE ANOTHER RUN world-job-retry/);
    assert.match(screen.description, /Drive Another Run to try saving again/);
    assert.deepEqual(disk(), before);
  } finally { globalThis.localStorage = store; }
  assert(app.worldJobAgain());
  assert.notEqual(app.runId, runId);
  const after = disk();
  assert.equal(after.wasteland.scrap - before.wasteland.scrap, gasRunPay('long', app.cpuDifficulty));
  assert.equal(emberFeud(after), emberFeud(before) - 1);
  assert.equal(emberRuns(after), emberRuns(before) + 1);
  assert.equal(after.wasteland.settledResults.filter(key => key === `arena:${runId}`).length, 1);
  assert.deepEqual(savedLedger(after), savedLedger(before));
  assert.deepEqual(savedOpenRecord(after), savedOpenRecord(before));
});

for (const night of [2, 3]) {
  test(`unreadable storage on night ${night} keeps earnings and permits a verified retry`, () => {
    const app = appAtYard({night, feud: 2});
    assert(app.gasRun('long'));
    app.advance(4);
    const store = localStorage, bytes = store.getItem(PLAYERS_KEY), before = disk();
    const pay = gasRunPay('long', app.cpuDifficulty);
    let writes = 0;
    globalThis.localStorage = {...store, getItem() { throw Error('QA read denied'); }, setItem(key, value) {
      writes++;
      store.setItem(key, value);
    }};
    try {
      const result = finishGasRun(app);
      assert(!result.settlementSaved);
      assert.match(result.routineSaveIssue, /earnings are kept for this session/);
      assert.equal(app.profile.wasteland.scrap, before.wasteland.scrap + pay);
      assert.equal(emberFeud(app.profile), emberFeud(before) - 1);
      assert.equal(emberRuns(app.profile), emberRuns(before) + 1);
      assert.equal(app.worldJobAgain(), false);
      assert.equal(app.profile.wasteland.scrap, before.wasteland.scrap + pay);
      assert.equal(writes, 0);
      assert.equal(store.getItem(PLAYERS_KEY), bytes);
    } finally { globalThis.localStorage = store; }
    assert(app.worldJobAgain());
    assert.equal(disk().wasteland.scrap, before.wasteland.scrap + pay);
    assert.equal(emberFeud(disk()), emberFeud(before) - 1);
    assert.equal(emberRuns(disk()), emberRuns(before) + 1);
    assert.equal(savedLedger(disk()).stocks.embers, savedLedger(before).stocks.embers + (night === 3 ? 3 : 0));
  });
}

test('unreadable storage keeps the result in the yard without overwriting changed saved progress', () => {
  const app = appAtYard({night: 2, feud: 2});
  assert(app.gasRun('long'));
  app.advance(4);
  const store = localStorage, before = disk(), pay = gasRunPay('long', app.cpuDifficulty);
  const registry = loadPlayers(store);
  // A malformed registry is also unreadable, even when storage accepts writes.
  const broken = '{unreadable';
  store.setItem(PLAYERS_KEY, broken);
  finishGasRun(app);
  assert.equal(store.getItem(PLAYERS_KEY), broken);
  assert.equal(app.profile.wasteland.scrap, before.wasteland.scrap + pay);
  assert(savePlayers(replacePlayerProfile(registry, app.player.id, {...before, credits: before.credits + 1}), store));
  const newer = store.getItem(PLAYERS_KEY);
  assert.equal(app.worldJobAgain(), false);
  assert.equal(store.getItem(PLAYERS_KEY), newer);
  assert(app.returnToYard());
  app.advance(8);
  assert(app.isYardHomeActive());
  assert.equal(app.profile.wasteland.scrap, before.wasteland.scrap + pay);
  assert.equal(emberFeud(app.profile), emberFeud(before) - 1);
  assert.equal(app._saveProfile(), false);
  assert.equal(store.getItem(PLAYERS_KEY), newer);
  assert.equal(app.profile.wasteland.scrap, before.wasteland.scrap + pay);
});

test('the open clock cannot cross into dusk while paused', () => {
  const app = appAtYard();
  assert(app.startOpenRoam());
  app.advance(4);
  const job = jobOf(app), before = disk();
  job.open.daySeconds = 959.5;
  app.advance(.1);
  assert.equal(job.open.partOfDay, 'day');
  const pausedAt = job.open.daySeconds;
  app.togglePause();
  app.advance(5);
  assert.equal(job.open.daySeconds, pausedAt);
  assert.equal(job.open.partOfDay, 'day');
  assert.deepEqual(disk(), before);
  app.togglePause();
  app.advance(.5);
  assert.equal(job.open.partOfDay, 'dusk');
});

test('the switch-off profile matches the established settlement field by field', () => {
  const app = appAtYard({choices: false, feud: 2});
  assert(app.gasRun('long'));
  app.advance(4);
  const registry = loadPlayers(localStorage), {id, profile} = activePlayer(registry);
  assert(finishGasRun(app).settlementSaved);
  const state = app.duel.state;
  const settled = settleArenaResult(profile, {runId: app.runId, ownerPlayerId: id, activePlayerId: id,
    arena: state.arena, cpuDifficulty: state.cpuDifficulty || app.cpuDifficulty});
  assert(settled.awarded);
  const arrived = applyArrivedRun(settled.profile, 'long');
  assert(arrived.ok);
  const values = new Map();
  const storage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)};
  assert(savePlayers(replacePlayerProfile(registry, id, arrived.profile), storage));
  assert.deepEqual(disk(), activePlayer(loadPlayers(storage)).profile);
});

test('the laptop scenario parses every page call and waits on each control it clicks', async () => {
  let expressions = 0;
  await scenario({
    navigate: url => assert.match(url, /flags=.*story-choices.*&harness=open-apprentice-run/),
    waitFor: source => { new Function('return ' + source); expressions++; return true; },
    evaluate: source => { new Function('return ' + source); expressions++; return true; },
    screenshot: () => {},
  });
  assert(expressions >= 25);
});
