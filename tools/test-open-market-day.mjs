import assert from 'node:assert/strict';
import {createFeatureFlags} from '../src/feature-flags.js';
import market from '../src/story/threads/content/market-day.js';
import {startTalk, actOnTalk} from '../src/story/talk.js';
import {MARKET_PLACES} from '../src/world/open/content/market-day-places.js';
import {MISSION_KINDS} from '../src/world/open/content/mission-kinds.js';
import {isHeld, takeHold} from '../src/world/open/holds.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {beginOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {favoursOf, isFound, newWorld, wordOf} from '../src/world/open/open-record.js';
import {openThreadSigns, threadsAtBankedHearth, threadsPart} from '../src/world/open/parts/threads.js';
import {missionsPart} from '../src/world/open/parts/missions.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {createJobSolidGrid, pushOutOfSolids} from '../src/world/scablands-solids.js';
import {sitePosition, siteSpot} from '../src/world/open/site-rule.js';
import {pageFunctions, pageSource, run} from './scenarios/open-market-day.mjs';
import {walkThread} from './thread-crossings.mjs';

const id = market.id, missionId = market.beats.day.mission.id;
const cast = {first: 'glasshouse', second: 'walkers', third: 'radio-hill', odd: 'bus-ring'};
const word = (person, set = 'Friendly') => ({type: 'word', person, set});
const mark = suffix => ({type: 'mark', id: id + '/' + suffix});
const thread = (to, roles = cast) => ({type: 'thread', id, cast: roles, to});
const changed = (world, key, effects) => applyEffects(world, {id: 'fixture/' + key, effects}).world;
const found = ['glasshouse', 'radio-hill', 'bus-ring'].map(site => ({type: 'find', site}));
const seedWorld = changed(newWorld({seed: 2105, night: 2, scrap: 70, embers: 4}), 'goodwill', [
  ...found, word('glasshouse'), word('walkers'), word('radio-hill'),
]);
const begin = world => beginOpenLand({id: 'open-roam', open: {world}, steps: [{kind: 'roam'}]});
const record = open => open.world.open.threads[id];
const marked = (open, suffix) => open.world.ledger.marks.includes(id + '/' + suffix);
const held = open => ['signs', 'checkpoints'].every(system => isHeld(open.holds, system));
const outcome = out => out.events.find(event => event.type === 'threadMissionOutcome')?.outcome;
const night = (open, value) => ({...open, world: {...open.world, ledger: {...open.world.ledger, night: value}}});
const frame = (open, point = MARKET_PLACES.yard, extra = {}, dt = .1, parts = [threadsPart, missionsPart]) =>
  stepOpenLand(open, {player: {position: point}, fighter: {position: point}, openRoam: true,
    checkpointsEnabled: true, onFoot: true, ...extra}, dt, parts);
const sign = () => begin(changed(seedWorld, 'sign', [thread('sign')]));
const pose = (site, spot) => siteSpot(site, seedWorld.open.landSeed, spot);
const saw = (out, words) => out.requests.some(request => request.text?.includes(words));
const sceneAt = (open, point, extra = {}) => {
  const out = frame(frame(open, point, extra).open, point, {...extra, interact: true});
  const request = out.requests.find(request => request.threadPriority);
  assert.ok(request, 'talk at ' + JSON.stringify(point) + ' during ' + record(out.open).beat);
  return {open: out.open, scene: request.scene};
};
const answer = ({open, scene}, point, ids = [], extra = {}) => {
  // The real talk rule must surface every requested option in the order it is used.
  let state = startTalk(scene);
  const events = [];
  const advance = () => {
    while (['lines', 'answer', 'thoughts'].includes(state.phase))
      state = actOnTalk(scene, state, {type: 'advance'}).state;
  };
  for (const choice of ids) {
    advance();
    const available = [...(scene.questions ?? []).filter(row => !state.asked.includes(row.id)), ...scene.choices]
      .filter(row => row.needs?.every(key => state.asked.includes(key)) ?? true);
    const index = available.findIndex(row => row.id === choice);
    assert.notEqual(index, -1, scene.id + '/' + choice + ' is offered');
    const action = actOnTalk(scene, state, {type: 'select', index});
    state = action.state;
    if (action.choice) events.push({type: 'talkChoice', scene: scene.id, ...action.choice});
    else events.push({type: 'openTalkQuestion', scene: scene.id, id: choice});
  }
  events.push({type: 'openTalkClosed', scene: scene.id, finished: true});
  return frame(open, point, {...extra, jobEvents: events});
};
const speak = (open, point, ids, extra) => answer(sceneAt(open, point, extra), point, ids, extra);

const grid = createJobSolidGrid();
for (const [spot, {x, z}] of Object.entries(MARKET_PLACES))
  assert.equal(pushOutOfSolids(x, z, .4, grid, scablandsSurfaceHeightAt(x, z)).hit, null, spot + ' is clear on foot');

assert.equal(createFeatureFlags({qa: false, storage: null, search: ''}).enabled('story-choices'), false);
assert.equal(frame(sign(), MARKET_PLACES.gate, {checkpointsEnabled: false, interact: true}).requests.length, 0);
assert.equal(frame(sign(), MARKET_PLACES.gate, {onFoot: false, interact: true}).requests.some(r => r.type === 'talk'), false);
assert.equal(frame(sign(), MARKET_PLACES.yard, {interact: true}).requests.some(r => r.type === 'talk'), false);
assert.equal(frame({...sign(), holds: takeHold([], 'other', ['signs'])}, MARKET_PLACES.gate, {interact: true})
  .requests.some(r => r.type === 'talk'), false);
assert.equal(openThreadSigns(sign()).find(row => row.id === id).sign.by, 'dot');
assert.equal(sceneAt(sign(), MARKET_PLACES.diner).scene.lines[0].words, market.beats.sign.lines[0].words);
const listen = sceneAt(sign(), MARKET_PLACES.gate);
assert.deepEqual(listen.scene.lines.map(row => row.words), market.beats.sign.lines.map(row => row.words));

// Direct only this storyline at the hearth, independent of other loaded storylines.
const direct = world => begin(threadsAtBankedHearth({world, view: {player: {position: MARKET_PLACES.gate}}}, [market]));
assert.equal(record(direct(night(begin(seedWorld), 1).world)), undefined);
assert.equal(record(direct(changed(seedWorld, 'no-third', [word('radio-hill', 'Strangers')]))), undefined);
assert.equal(record(direct(changed(seedWorld, 'no-dot', [word('dot', 'Wary')]))), undefined);
const directCast = record(direct(seedWorld)).cast;
assert.deepEqual(new Set([directCast.first, directCast.second, directCast.third]), new Set(['glasshouse', 'walkers', 'radio-hill']));
assert.equal(directCast.odd, 'bus-ring');
const noRing = {...seedWorld, open: {...seedWorld.open, found: ['glasshouse', 'radio-hill']}};
assert.equal(record(direct(noRing)).cast.odd, undefined);
assert.equal(record(direct(changed(seedWorld, 'not-at-odds', [word('glasshouse', 'Strangers'), word('deck-folk')]))).cast.odd, undefined);

let refused = speak(sign(), MARKET_PLACES.gate, ['what-is-a-market', 'not-now']).open;
assert.equal(record(refused).beat, 'sign');
assert.equal(openThreadSigns(night(refused, 4)).some(row => row.id === id), false);
assert.equal(openThreadSigns(night(refused, 5)).some(row => row.id === id), true);
assert.equal(frame(night(refused, 4), MARKET_PLACES.gate, {interact: true}).requests.some(row => row.type === 'talk'), false);
refused = speak(night(refused, 5), MARKET_PLACES.gate, ['not-now']).open;
assert.equal(record(refused).end, 'dots-own-market');
assert.ok(marked(refused, 'dots-own-market'));
assert.equal(record(frame(night(sign(), 7)).open).beat, 'sign');
const ignored = frame(night(sign(), 8)).open;
assert.ok(marked(ignored, 'dots-own-market'));
assert.equal(record(ignored).end, 'dots-own-market');
assert.equal(ignored.world.ledger.made.includes(id + '/market'), false);
const glasshousePoint = pose('glasshouse', 'marigold');
assert.equal(sceneAt(ignored, glasshousePoint).scene.lines[0].words, market.later[1].lines[0].words);

const accepted = speak(sign(), MARKET_PLACES.gate, ['why-tin-town', 'hold-one']).open;
assert.equal(record(accepted).beat, 'asking');
assert.ok(marked(accepted, 'asked'));
assert.equal(accepted.world.ledger.obligations.find(row => row.id === id + '/hold-market').due, 7);
assert.equal(held(accepted), false);
const expired = frame(night(accepted, 8), MARKET_PLACES.gate);
assert.equal(record(expired.open).end, 'called-off');
assert.equal(wordOf(expired.open.world, 'dot'), 'Wary');
assert.ok(saw(expired, 'a market that never came'));
assert.equal(expired.open.world.ledger.obligations.length, 0);
const hearth = speak(accepted, MARKET_PLACES.hearth, []);
assert.equal(record(hearth.open).beat, 'asking');
assert.ok(marked(hearth.open, 'entered/hearth'));
const askedGrowers = speak(hearth.open, glasshousePoint, ['ask-glasshouse-first', 'what-tinkers-did-first', 'tinkers-come-first']).open;
assert.ok(marked(askedGrowers, 'comes-first'));
assert.ok(marked(askedGrowers, 'heard-marigold'));
const askedWalkers = speak(askedGrowers, MARKET_PLACES.walkers, ['ask-walkers-second', 'who-minds-second', 'close']).open;
assert.ok(marked(askedWalkers, 'comes-second'));
const radioPoint = pose('radio-hill', 'door');
const askedRadio = speak(askedWalkers, radioPoint, ['ask-radio-hill-third', 'hetty-comes-third']).open;
assert.ok(marked(askedRadio, 'hetty-came'));
const gasketPoint = pose('bus-ring', 'gasket');
const askedOdd = speak(askedRadio, gasketPoint, ['ask-bus-ring', 'why-mend-for-rats', 'what-tinkers-need', 'close']).open;
assert.ok(marked(askedOdd, 'heard-gasket'));
assert.ok(marked(askedOdd, 'odd-asked'));
const called = open => speak(open, MARKET_PLACES.gate, ['call-market']).open;
const stakes = called(askedOdd);
assert.equal(record(stakes).beat, 'stakes');
const evening = {partOfDay: 'dusk'};
const dawn = {partOfDay: 'dawn'};
const morning = {partOfDay: 'day', daySeconds: 539.9};
const midday = {partOfDay: 'day', daySeconds: 540};
const staged = arrangement => speak(stakes, MARKET_PLACES.yard, [arrangement], evening).open;
assert.ok(marked(staged('shade'), 'stood-in-shade'));
assert.ok(marked(staged('far'), 'stood-far'));
const day = staged('beside');
assert.equal(record(day).beat, 'day');
assert.ok(marked(day, 'stood-beside'));
assert.equal(held(frame(day, MARKET_PLACES.yard, dawn).open), false, 'bank before opening the market');
const tomorrow = night(day, 3);
assert.equal(held(frame(tomorrow, MARKET_PLACES.yard, {...dawn, onFoot: false}).open), false);
assert.equal(held(frame(tomorrow, MARKET_PLACES.gate, dawn).open), false);
assert.equal(held(frame(tomorrow, MARKET_PLACES.yard, morning).open), false);
const started = frame(tomorrow, MARKET_PLACES.yard, dawn);
assert.ok(held(started.open));
assert.equal(started.open.parts.missions.active.id, missionId);
assert.deepEqual(started.events.filter(row => row.type === 'threadCue').map(row => row.cue), market.beats.day.cues);
const nearNoon = frame(started.open, MARKET_PLACES.yard, morning, 239);
assert.equal(nearNoon.events.length, 0);
const noon = frame(frame(nearNoon.open, MARKET_PLACES.yard, midday).open);
assert.equal(record(noon.open).beat, 'rider');
assert.ok(held(noon.open));
assert.ok(noon.events.some(row => row.cue === 'open.market.hush'));
const rider = (from, choice) => speak(from, MARKET_PLACES.gate, [choice]).open;
assert.ok(marked(rider(noon.open, 'turn-him-away'), 'rider-turned-away'));
assert.ok(marked(rider(noon.open, 'let-him-in'), 'rider-served'));
const turned = rider(noon.open, 'at-the-fence');
assert.equal(record(turned).beat, 'yard-quarrel');
assert.ok(marked(turned, 'rider-at-the-fence'));
assert.ok(held(turned));
const forge = MARKET_PLACES['the-forge-wall'];
const ready = frame(frame(turned, forge, {}, 60).open, forge).open;

function dusk(open, end, point = MARKET_PLACES.yard) {
  assert.equal(record(open).beat, 'dusk');
  assert.equal(outcome(frame(open, point, midday, 240)), undefined, 'dusk follows the shared day');
  const done = frame(open, point, evening);
  assert.equal(outcome(done), 'finished');
  assert.equal(held(done.open), false);
  const finished = frame(done.open, point);
  assert.equal(record(finished.open).end, end);
  assert.ok(finished.open.world.ledger.made.includes(id + '/market'));
  assert.ok(!finished.open.world.ledger.obligations.some(row => row.id === id + '/hold-market'));
  assert.equal(wordOf(finished.open.world, 'dot'), 'Friendly');
  assert.equal(finished.open.world.scrap, 70);
  assert.ok(finished.events.some(row => row.cue === 'open.market.close'));
  return finished.open;
}

const mended = dusk(speak(ready, forge, ['tell-her']).open, 'mended');
assert.ok(marked(mended, 'quarrel-mended'));
assert.equal(favoursOf(mended.world, 'glasshouse'), 1);
assert.equal(wordOf(mended.world, 'bus-ring'), 'Friendly');
assert.ok(mended.world.ledger.marks.includes('rumour/rats-nest'));
assert.ok(marked(dusk(speak(ready, forge, ['enough']).open, 'peaceful'), 'peace-kept'));
const tinkers = dusk(speak(ready, forge, ['send-tinkers-home']).open, 'quarrel');
assert.ok(marked(tinkers, 'odd-sent-home'));
assert.equal(favoursOf(tinkers.world, 'glasshouse'), 1);
assert.equal(wordOf(tinkers.world, 'bus-ring'), 'Wary');
const growers = dusk(speak(ready, forge, ['send-growers-home']).open, 'quarrel');
assert.ok(marked(growers, 'guest-sent-home'));
assert.equal(wordOf(growers.world, 'bus-ring'), 'Friendly');
assert.equal(wordOf(growers.world, 'glasshouse'), 'Strangers');

const loud = frame(turned, MARKET_PLACES.yard, {}, 60);
assert.ok(loud.events.some(row => row.cue === 'open.market.voices'));
const stillTime = frame(loud.open, MARKET_PLACES.yard, {}, 4.8);
assert.equal(record(stillTime.open).beat, 'yard-quarrel');
const slipped = frame(frame(stillTime.open, MARKET_PLACES.yard, {}, .1).open);
assert.equal(record(slipped.open).beat, 'glass');
const broken = frame(slipped.open);
assert.ok(saw(broken, 'a frame gone'));
assert.ok(broken.events.some(row => row.cue === 'open.market.glass'));
const tooLate = dusk(broken.open, 'quarrel');
assert.ok(marked(tooLate, 'glass-broken'));
assert.equal(wordOf(tooLate.world, 'glasshouse'), 'Strangers');

const breachWorld = changed(day.world, 'misled', [mark('told-no-tinkers'), {
  type: 'promise', id: id + '/no-tinkers', person: 'glasshouse', dueNights: 5,
  text: market.beats.asking.choices.find(row => row.id === 'no-tinkers-first').effects[2].text,
}]);
const breach = {...day, world: breachWorld};
const launch = open => frame(night(open, 3), MARKET_PLACES.yard, dawn).open;
const toRider = open => frame(frame(launch(open), MARKET_PLACES.yard, midday).open).open;
const breached = rider(toRider(breach), 'let-him-in');
const goesHome = frame(frame(breached, MARKET_PLACES.yard, {}, 60).open);
const promiseBroken = dusk(goesHome.open, 'quarrel');
assert.ok(marked(promiseBroken, 'promise-broken'));
assert.equal(promiseBroken.world.ledger.obligations.length, 0);
assert.equal(wordOf(promiseBroken.world, 'glasshouse'), 'Strangers');

const leftOutStakes = called(askedRadio);
const noOddDay = speak(leftOutStakes, MARKET_PLACES.yard, ['no-choice'], evening).open;
const alone = dusk(rider(toRider(noOddDay), 'at-the-fence'), 'peaceful');
assert.equal(wordOf(alone.world, 'bus-ring'), 'Wary');
assert.ok(marked(alone, 'left-out'));
assert.equal(sceneAt(alone, gasketPoint).scene.lines[0].words, market.later[0].lines[0].words);

const outside = frame(started.open, sitePosition('bus-ring', seedWorld.open.landSeed), {}, 5);
assert.equal(outcome(outside), 'left');
assert.equal(held(outside.open), false);
const gone = frame(frame(outside.open).open);
assert.equal(record(gone.open).end, 'called-off');
assert.equal(gone.open.world.ledger.made.includes(id + '/market'), false);
for (const cancellation of [{openRoam: false}, {combatWrecking: true}, {missionLeaving: true}]) {
  const result = frame(started.open, MARKET_PLACES.yard, cancellation);
  assert.equal(result.events.find(row => row.type === 'threadMissionCancelled')?.id, missionId);
  assert.equal(held(result.open), false);
}

assert.equal(MISSION_KINDS.market.prepare({by: 'car'}, () => MARKET_PLACES.yard), null);
assert.equal(isFound(askedOdd.world, 'bus-ring'), true);
const discovery = frame(begin(noRing), sitePosition('bus-ring', seedWorld.open.landSeed), {}, .1, undefined);
assert.equal(discovery.open.world.open.found.includes('bus-ring'), false, 'the thread part does not discover sites');

assert.deepEqual(walkThread(market).faults, []);
for (const name of Object.keys(pageFunctions)) new Function('return ' + pageSource(name, 'test'));
let waits = 0;
const parse = source => { new Function('return ' + source); };
await run({navigate() {}, waitFor(source) { waits++; parse(source); }, evaluate: parse, command() {}, screenshot() {}});
assert.ok(waits >= 15);
console.log('test-open-market-day: signs, talks, foot mission, holds, ledger outcomes and browser expressions passed');
