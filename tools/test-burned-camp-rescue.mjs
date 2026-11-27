import assert from 'node:assert/strict';
import test from 'node:test';
import burnedCamp from '../src/story/threads/content/burned-camp.js';
import {placeForThread} from '../src/story/scenes/burned-camp.js';
import {RESCUE_HELPERS} from '../src/story/scenes/burned-camp-home.js';
import {bankHearth, ledgerPageData} from '../src/story/ledger.js';
import {bankOpenHearth} from '../src/story/ledger-save.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {beginOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {createThreadsPart, threadsAtBankedHearth} from '../src/world/open/parts/threads.js';
import {abandonOpenMission, missionsPart} from '../src/world/open/parts/missions.js';
import {sampleWorld} from '../src/world/open/samples.js';
import {newWorld, favoursOf, feudOf, stageOf} from '../src/world/open/open-record.js';
import {sitePosition} from '../src/world/open/site-rule.js';
import {RATS_NEST_LAYOUT} from '../src/world/open/looks/rats-nest-look.js';
import {BURNED_PEN} from '../src/world/open/content/burned-pen.js';
import {BURNED_SCOUT} from '../src/world/open/content/burned-scout.js';
import {buyBackPrice, commitParty, currentParty, damagedBessLoad, heldGrowers} from '../src/world/open/burned-rescue-rule.js';
import {claimRoadRatsSurcharge, settleRoadRatsRansom} from '../src/world/open/ransom-rule.js';
import {arriveHandRun, routineFor, runBankedRoutines, keepRoutine} from '../src/world/open/routine-run-rule.js';
import {settleOpenWorld} from '../src/world/open/open-save.js';
import {worldForProfile} from '../src/world/open/open-world.js';
import {isHeld} from '../src/world/open/holds.js';

import {pageFunctions, pageSource} from './scenarios/open-burned-rescue.mjs';

const id = burnedCamp.id;
const cast = {camp: 'glasshouse', enemy: 'road-rats'};
const parts = [createThreadsPart([burnedCamp]), missionsPart];
const change = (world, key, effects) => applyEffects(world, {id: 'rescue-qa/' + key, effects}).world;
const mark = key => ({type: 'mark', id: key});
const track = to => ({type: 'thread', id, to, cast});
const base = threadsAtBankedHearth({world: sampleWorld('after-the-smoke'), view: {}}, [burnedCamp]);
const fixture = (to, extra = []) => change(base, to, [track(to), ...extra]);
const begin = (world, dayClock = false) => beginOpenLand({id: 'open-roam', steps: [{kind: 'roam'}], open: {world, dayClock}});
const sitePositions = {'rats-nest': {position: sitePosition('rats-nest', base.open.landSeed),
  spots: {...RATS_NEST_LAYOUT.spots, ...BURNED_SCOUT.spots, ...BURNED_PEN.spots}}};
const at = place => placeForThread(place, cast, {sitePositions, landSeed: base.open.landSeed});
const hearth = at(['tin-town', 'hearth']), gate = at(['tin-town', 'gate']);
const step = (open, point, view = {}, dt = .1) => stepOpenLand(open, {
  player: {position: point}, fighter: {position: point}, carPosition: point, onFoot: true,
  openRoam: true, checkpointsEnabled: true, sitePositions, missionHeightAt: () => 0, ...view,
}, dt, parts);
const walk = (open, point, view, dt) => step(open, point, view, dt).open;
const drive = (open, point, view = {}, dt) => step(open, point, {onFoot: false, ...view}, dt);
const record = open => open.world.open.threads[id];
const choiceEvent = (beat, key) => ({type: 'talkChoice', scene: id + '/' + beat + '/decision', id: id + '/' + beat + '/decision/' + key});
const choose = (open, point, beat, key) => walk(open, point, {jobEvents: [choiceEvent(beat, key)]});
const talk = out => out.requests.find(row => row.type === 'talk')?.scene;
const dusk = world => ({...world, open: {...world.open, day: {night: world.ledger.night, seconds: 960}}});
const nextNight = world => ({...world, ledger: bankHearth(world.ledger).ledger});
const marks = world => world.ledger.marks;
const roster = [
  mark('dace-runner'), mark('stranded-hauler/helped'), {type: 'made', id: 'tower/crows-step'},
  {type: 'debt', id: 'stranded-hauler/tally-owes', person: 'tally', text: 'Tally owes you a favour.'},
];
const allParty = (extra = []) => fixture('home', [...roster, ...extra]);

test('home offers the ledger helpers and Finch after the drain. Questions spend nothing', () => {
  const unhelped = change(fixture('home'), 'unhelped', [{type: 'word', person: 'walkers', set: 'Strangers'}]);
  let open = walk(begin(unhelped), hearth);
  const plain = talk(step(open, hearth, {interact: true}));
  assert.deepEqual(plain.questions.map(row => row.id), ['rats-who-moss']);
  open = walk(begin(allParty([mark(id + '/drain-out')])), hearth);
  const rich = step(open, hearth, {interact: true});
  assert.deepEqual(talk(rich).questions.map(row => row.id),
    ['rats-who-rell', 'rats-who-dace', 'rats-who-moss', 'rats-who-keeper', 'rats-who-tally']);
  assert(talk(rich).lines.some(row => row.speaker === 'finch'));
  assert.equal(talk(rich).thoughts.length, 2);
  const questioned = walk(rich.open, hearth, {jobEvents: [{type: 'openTalkQuestion', scene: rich.requests[0].id, id: 'rats-who-rell'}]});
  assert.deepEqual(questioned.world.ledger.obligations, open.world.ledger.obligations);
});

function chooseParty(world, helpers) {
  let open = walk(begin(world), hearth);
  open = choose(open, hearth, 'home', 'raise-party');
  assert.equal(record(open).beat, 'party');
  open = walk(open, hearth);
  for (const helper of helpers) open = choose(open, hearth, 'party', helper);
  open = choose(open, hearth, 'party', 'ride');
  assert.equal(record(open).beat, 'rescue');
  return open;
}

test('party spends only its selections, caps the roster, and survives a cancelled outing and reload', () => {
  const world = allParty([mark(id + '/knows-drain'), {type: 'favour', person: 'tin-town', by: 1}]);
  const ready = chooseParty(world, ['rell', 'moss', 'tally', 'keeper']);
  assert.deepEqual(currentParty(ready.world).map(row => row.id), ['rell', 'moss', 'tally']);
  assert.equal(ready.world.ledger.obligations.length, 0);
  assert.equal(favoursOf(ready.world, 'tin-town'), 0);
  assert(marks(ready.world).includes(id + '/party/1/rell'));
  assert.equal(commitParty(world, RESCUE_HELPERS, ['rell', 'rell']), null);
  assert(ledgerPageData(ready.world.ledger).consequences.some(row => row.text === 'Rell joined your rescue party. This settled a debt.'));
  const overlap = change(world, 'overlap', [{type: 'settle', id: 'gate-watch'}, {type: 'favour', person: 'walkers', by: 1}]);
  assert.equal(commitParty(overlap, RESCUE_HELPERS, ['dace', 'rell']), null);

  const nighttime = dusk(nextNight(ready.world));
  let launched = drive(begin(nighttime, true), gate).open;
  assert.equal(launched.parts.missions.active?.mission.rule.blocks, true);
  assert(isHeld(launched.holds, 'checkpoints') && isHeld(launched.holds, 'signs'));
  const profile = settleOpenWorld({wasteland: {scrap: 140}}, abandonOpenMission(launched).world);
  assert.equal(profile.ok, true);
  const saved = worldForProfile(profile.profile);
  assert.deepEqual(currentParty(saved).map(row => row.id), ['rell', 'moss', 'tally']);
  launched = drive(begin(saved, true), gate).open;
  assert.equal(launched.parts.missions.active?.id, id + '/rescue');
  assert.equal(launched.world.ledger.history.filter(row => row.type === 'settle').length, 2);
});

const missionId = id + '/rescue';
const won = {missionRoadOutcome: {id: missionId, outcome: 'won'}};
function underway(helpers = ['rell', 'moss'], extra = []) {
  const ready = chooseParty(allParty([mark(id + '/knows-drain'), mark(id + '/counted-six'), ...extra]), helpers);
  let out = drive(ready, gate);
  const route = out.open.parts.missions.active.state.route;
  out = drive(out.open, route.start);
  assert.equal(out.requests.find(row => row.type === 'riders').vehicles.length, 1);
  out = drive(out.open, route.start, won);
  out = drive(out.open, route.turn);
  assert(isHeld(out.open.holds, 'checkpoints') && isHeld(out.open.holds, 'signs'));
  assert.equal(out.requests.find(row => row.type === 'riders').vehicles.length, helpers.includes('tally') ? 2 : 4);
  return out.open;
}

test('a wreck before one minute brings nobody home, lowers helper standing once and requires a new party', () => {
  let open = underway(['rell', 'moss', 'dace']);
  const lost = drive(open, at('boneyard'), {combatWrecking: true});
  assert.equal(lost.events.find(row => row.type === 'threadMissionOutcome')?.outcome, 'none-home');
  const back = drive(lost.open, at('boneyard'));
  assert.equal(record(back.open).beat, 'home');
  assert.equal(back.open.world.ledger.words.walkers, 'Strangers');
  assert.equal(heldGrowers(back.open.world).length, 9);
  assert(back.requests.some(row => row.text?.includes('a whistle that never came')));
  open = walk(back.open, hearth);
  open = choose(open, hearth, 'home', 'raise-party');
  open = walk(open, hearth);
  const options = talk(step(open, hearth, {interact: true})).choices.map(row => row.id);
  assert(!options.some(id => /\/(rell|moss|dace)$/.test(id)));
});

test('a later wreck before the whistle records a partial return and doubles the guard for a fresh rescue', () => {
  let open = underway();
  open = drive(open, at('boneyard'), won, 61).open;
  const wreck = drive(open, at('boneyard'), {combatWrecking: true});
  assert.equal(wreck.events.find(row => row.type === 'threadMissionOutcome')?.outcome, 'some-home');
  open = drive(wreck.open, at('boneyard')).open;
  assert.equal(record(open).beat, 'home');
  assert.equal(heldGrowers(open.world).length, 5);
  assert.equal(open.world.ledger.words.glasshouse, 'Friendly');
  const retry = chooseParty(open.world, ['tally']);
  const second = drive(retry, gate).open.parts.missions.active;
  assert.equal(second.mission.rule.guards, 2);
  assert.equal(second.mission.rule.people, 5);
  assert.equal(second.mission.rule.blocks, true);
});

function escortHome(holed) {
  let open = underway();
  const before = drive(open, at('boneyard'), won, 180);
  assert(before.events.some(row => row.cue === 'night.whistle'));
  assert(before.requests.some(row => row.text?.includes("They're all out, every one of the nine.")));
  open = before.open;
  for (let seconds = 0; seconds < 179; seconds++) {
    const position = open.parts.missions.active.state.convoy;
    const traffic = holed && seconds === 125 ? {road: {id: missionId, cars: [{...position, id: 'one', fighting: true}]}} : {};
    const out = drive(open, position, traffic, 1);
    assert(isHeld(out.open.holds, 'checkpoints'));
    open = out.open;
  }
  const finish = drive(open, gate, {}, 1);
  assert.equal(finish.events.find(row => row.type === 'threadMissionOutcome')?.outcome, holed ? 'bess-holed' : 'all-home');
  assert.equal(isHeld(finish.open.holds, 'checkpoints'), false);
  return drive(finish.open, gate).open;
}

test('all nine, with or without holes in Bess, come home Sworn and the Rats are Raiding', () => {
  for (const holed of [false, true]) {
    const open = escortHome(holed);
    assert.equal(record(open).beat, 'gate');
    assert.equal(heldGrowers(open.world).length, 0);
    assert.equal(open.world.ledger.words.glasshouse, 'Sworn');
    assert.equal(feudOf(open.world, 'road-rats'), 'Raiding');
    assert(marks(open.world).includes(id + '/rode-out'));
    assert.equal(marks(open.world).includes(id + '/bess-holed'), holed);
  }
});

test('the buyback uses one draw and the shared car, till, ember order; payment and all-home settle together', () => {
  const full = buyBackPrice(base);
  assert(full >= 260 && full <= 340);
  const partial = fixture('buy-back-ransom', [mark(id + '/drain-out'), {type: 'feud', of: 'road-rats', by: 1}]);
  const price = buyBackPrice(partial);
  assert.equal(price, Math.round(full * (6 / 9) / 10) * 10);
  assert.equal(price, buyBackPrice(nextNight(partial)));
  const lastOne = change(partial, 'last-one', heldGrowers(partial).slice(0, 5).map(person => mark(id + '/home/' + person)));
  assert.equal(buyBackPrice(lastOne), 60);
  const world = {...partial, scrap: 35, town: {till: price - 145}};
  const settled = drive(begin(world), gate).open;
  assert.equal(record(settled).beat, 'gate');
  assert.equal(settled.world.scrap, 0);
  assert.equal(feudOf(settled.world, 'road-rats'), 'Watching');
  assert.equal(settled.world.ledger.stocks.embers, 2);
  assert.equal(settled.world.open.journal.find(row => row.type === 'town').posting.scrap, price - 145);
  assert.equal(heldGrowers(settled.world).length, 0);
  assert(marks(settled.world).includes(id + '/bought-back'));
  const saved = settleOpenWorld({wasteland: {scrap: 35}}, settled.world, {atStart: world});
  assert.equal(saved.ok, true);
  const reload = worldForProfile(saved.profile);
  assert.equal(drive(begin(reload), gate).open.world.scrap, 0);
  assert.equal(reload.ledger.stocks.embers, 2);
});

test('the next captive encounter claims 50 extra once, before any payment', () => {
  const backed = change({...base, scrap: 500}, 'price-mark', [mark(id + '/bought-back')]);
  const authored = burnedCamp.beats.ransom.ransom;
  const first = change(backed, 'captive', claimRoadRatsSurcharge(backed, 'one/pen'));
  assert.deepEqual(claimRoadRatsSurcharge(first, 'two/pen'), []);
  const pay = (world, encounter, caught = false) => settleRoadRatsRansom(authored, world, when => caught || !when, encounter);
  assert.equal(pay(first, 'one/pen')[0].by, -200);
  assert.equal(pay(first, 'one/pen', true)[0].by, -270);
  assert.equal(pay(first, 'two/pen')[0].by, -150);
  const paid = change(first, 'paid', pay(first, 'one/pen'));
  assert.equal(pay(paid, 'one/pen')[0].by, -150);
});

test('the gas reduction is rounded down once, for either kind of delivery or expires without a run', () => {
  const damage = change(newWorld({night: 5, gas: 0, embers: 3}), 'damage', [mark(id + '/bess-holed')]);
  const tomorrow = nextNight(damage);
  assert.equal(damagedBessLoad(damage, 59), 59);
  const hand = arriveHandRun(tomorrow, {load: 59, clean: true});
  assert.equal(hand.gas, 39);
  assert.equal(arriveHandRun(hand.world, {load: 59, clean: true}).world, hand.world);
  const learner = keepRoutine(tomorrow, {...routineFor(tomorrow), learner: 'tin-cook', running: true, share: .75, lessonLoad: 59});
  const delivered = runBankedRoutines(learner);
  assert.equal(routineFor(delivered).lastDelivery.gas, 29);
  assert.equal(runBankedRoutines(delivered), delivered);
  const skipped = bankOpenHearth(dusk(tomorrow), tomorrow.ledger.night, {storyChoices: true});
  assert.equal(damagedBessLoad(skipped, 59), 59);
});

test('gate choices keep the camp burned, rebuild by hauling, or move only after the shared well', () => {
  const returned = escortHome(false);
  const stayed = choose(walk(returned, gate), gate, 'gate', 'stay-inside');
  assert.equal(record(stayed).end, 'freed');
  assert.equal(stageOf(stayed.world, 'glasshouse'), 'burned');
  assert.equal(stayed.world.ledger.extraHeatFrom, stayed.world.ledger.night);
  assert.equal(nextNight(nextNight(stayed.world)).ledger.stocks.embers, Math.max(0, stayed.world.ledger.stocks.embers - 3));
  const rebuild = choose(walk(returned, gate), gate, 'gate', 'rebuild');
  assert.equal(record(rebuild).beat, 'haul-glass');
  assert(rebuild.world.ledger.obligations.some(row => row.id === id + '/haul-glass'));
  let open = drive(rebuild, gate).open;
  open = drive(open, at('boneyard')).open;
  open = drive(open, at('glasshouse')).open;
  open = drive(open, at('glasshouse')).open;
  assert.equal(stageOf(open.world, 'glasshouse'), 'rebuilt');
  assert(!open.world.ledger.obligations.some(row => row.id === id + '/haul-glass'));
  assert(!talk(step(walk(returned, gate), gate, {interact: true})).choices.some(row => row.id.endsWith('/move-to-seep')));
  const haveWell = change(returned.world, 'shared', [{type: 'made', id: 'sweet-seep/well-shared'}]);
  const moved = choose(walk(begin(haveWell), gate), gate, 'gate', 'move-to-seep');
  assert.equal(stageOf(moved.world, 'sweet-seep'), 'outpost');
  assert.equal(stageOf(moved.world, 'glasshouse'), 'empty');
});


test('Moss takes the price out at dawn and a cancelled trip writes no payment', () => {
  let open = walk(begin(fixture('home', [mark(id + '/drain-out')])), hearth);
  open = choose(open, hearth, 'home', 'buy-back');
  assert.equal(record(open).beat, 'buy-back-drive');
  assert.equal(drive(open, gate).open.parts.missions.active, undefined);
  const world = nextNight(open.world);
  open = drive(begin(world, true), gate).open;
  assert.equal(open.parts.missions.active.state.phase, 'outward');
  assert.equal(abandonOpenMission(open).world.scrap, world.scrap);
  open = drive(begin(abandonOpenMission(open).world, true), gate).open;
  for (let tick = 0; tick < 362 && open.parts.missions.active; tick++) {
    assert(isHeld(open.holds, 'checkpoints') && isHeld(open.holds, 'signs'));
    open = drive(open, open.parts.missions.active.state.convoy, {}, 1).open;
  }
  assert.equal(open.parts.missions.active, undefined);
  open = drive(open, gate).open;
  assert.equal(record(open).beat, 'buy-back-ransom');
  open = drive(open, gate).open;
  assert.equal(record(open).beat, 'gate');
  assert.equal(heldGrowers(open.world).length, 0);
  assert.equal(open.world.open.journal.filter(row => row.key === 'scrap' && row.choiceId.includes('buy-back-ransom')).length, 1);
});

test('leaving the growers is Wary, empty and ledgered; the stay warms the hearth and feeds the town', () => {
  const left = choose(walk(begin(fixture('home')), hearth), hearth, 'home', 'leave-them');
  assert.equal(record(left).end, 'left');
  assert.equal(stageOf(left.world, 'glasshouse'), 'empty');
  assert.equal(left.world.ledger.words.glasshouse, 'Wary');
  assert(ledgerPageData(left.world.ledger).consequences.some(row => row.text === "You left the Glasshouse's people in the Rats' Nest."));
  const returned = escortHome(false);
  const stayed = choose(walk(returned, gate), gate, 'gate', 'stay-inside').world;
  const notes = world => threadsAtBankedHearth({world, view: {}}, [burnedCamp]);
  const two = notes(nextNight(nextNight(stayed)));
  assert(!two.ledger.marks.includes(id + '/bean-bed-ready'));
  assert(notes(nextNight(two)).ledger.marks.includes(id + '/bean-bed-ready'));
});

test('every browser expression parses before laptop execution', () => {
  for (const name of Object.keys(pageFunctions)) assert.doesNotThrow(() => new Function('return ' + pageSource(name)), name);
});
