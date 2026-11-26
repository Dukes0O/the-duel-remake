import assert from 'node:assert/strict';
import runaway from '../src/story/threads/content/runaway.js';
import {witnessSign} from '../src/story/threads/signs.js';
import {bankHearth} from '../src/story/ledger.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {OPEN_THREADS, openThreadSigns, threadsPart} from '../src/world/open/parts/threads.js';
import {missionsPart} from '../src/world/open/parts/missions.js';
import {MISSION_KINDS} from '../src/world/open/content/mission-kinds.js';
import {RUNAWAY_PLACES as at, runawayBeat, runawayPlace} from '../src/world/open/content/runaway-places.js';
import {newWorld, favoursOf, feudOf, wordOf} from '../src/world/open/open-record.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {beginOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {isHeld} from '../src/world/open/holds.js';
import {LAND} from '../src/world/scablands-names.js';
import {sitePosition} from '../src/world/open/site-rule.js';
import {walkThread} from './thread-crossings.mjs';
import {pageFunctions, pageSource} from './scenarios/open-runaway.mjs';

const base = newWorld({seed: 37, night: 3, embers: 2, scrap: 26});
let fixture = 0;
const set = (world, ...effects) => applyEffects(world, {id: 'fixture/' + ++fixture, effects}).world;
const mark = id => ({type: 'mark', id: 'runaway/' + id});
const started = (beat = 'prints', world = base, cast = {}) =>
  beginOpenLand({id: 'open-roam', steps: [{kind: 'roam'}], open: {world: set(world, {type: 'thread', id: 'runaway', to: beat, cast})}});
const frame = (open, point, input = {}, dt = .05) => stepOpenLand(open, {
  openRoam: true, checkpointsEnabled: true, onFoot: true,
  player: {position: point}, fighter: {position: point}, carPosition: point,
  missionHeightAt: () => 0, ...input,
}, dt, [threadsPart, missionsPart]);
const beat = out => out.open.world.open.threads.runaway.beat;
const end = out => out.open.world.open.threads.runaway.end;
const marked = (out, key) => out.open.world.ledger.marks.includes('runaway/' + key);
const choose = (open, point, beat, option, asked = []) => {
  const scene = 'runaway/' + beat + '/decision';
  return frame(open, point, {partOfDay: beat === 'gate' ? 'dusk' : beat === 'search-asked' ? 'dark' : 'day', jobEvents: [
    ...asked.map(id => ({type: 'openTalkQuestion', id, scene})),
    {type: 'talkChoice', id: scene + '/' + option, scene, asked},
  ]});
};
const move = (open, point, partOfDay) =>
  frame(frame(open, point, {partOfDay}).open, point, {interact: true, partOfDay});
const missionResult = out => out.events.find(event => event.type === 'threadMissionOutcome')?.outcome;

assert.ok(OPEN_THREADS.includes(runaway));
assert.equal(createFeatureFlags({qa: false, storage: null, search: '?flags=story-choices'}).enabled('story-choices'), false);
assert.deepEqual(walkThread(runaway).faults, []);
for (const name in pageFunctions) assert.doesNotThrow(() => new Function(pageSource(name)));

const directed = Array.from({length: 30}, (_, seed) => newWorld({seed, night: 3})).find(world =>
  frame(beginOpenLand({id: 'open-roam', steps: [{kind: 'roam'}], open: {world}}), at.hearth, {partOfDay: 'dawn'}).open.world.open.threads.runaway);
assert.ok(directed, 'the seeded director starts the storyline in Tin Town');
for (const [point, input] of [[LAND.at('ridge'), {partOfDay: 'dawn'}], [at.hearth, {partOfDay: 'day'}], [at.hearth, {partOfDay: 'dark'}], [at.hearth, {checkpointsEnabled: false}]]) {
  const fresh = beginOpenLand({id: 'open-roam', steps: [{kind: 'roam'}], open: {world: directed}});
  assert.equal(frame(fresh, point, input).open.world.open.threads.runaway, undefined);
}

const hidden = frame(started(), LAND.at('ridge'));
const signs = openThreadSigns({...hidden.open, view: hidden.open.parts.threads.places});
assert.deepEqual(signs.find(sign => sign.id === 'runaway').points, [at.footprints, at.wire, at.bowl, at.handprint]);
assert.equal(witnessSign(signs[0], {player: at.footprints, onFoot: false}, 0, .1).witnessed, false);
assert.equal(witnessSign(signs[0], {player: LAND.at('ridge'), onFoot: true}, 0, .1).witnessed, false);
assert.equal(witnessSign(signs[0], {player: at.footprints, onFoot: true}, 0, .1).witnessed, true);
for (const disabled of [{checkpointsEnabled: false}, {partOfDay: 'dusk'}]) {
  const result = frame(started(), at.footprints, disabled);
  assert.equal(marked(result, 'entered/prints'), false);
}
for (const result of [frame(started(), at.hearth, {partOfDay: 'dark'}),
  frame({...hidden.open, world: {...hidden.open.world, ledger: bankHearth(hidden.open.world.ledger).ledger}}, at.hearth, {partOfDay: 'dawn'})]) {
  assert.equal(end(result), 'gone');
  assert.ok(marked(result, 'left'));
  assert.equal(openThreadSigns({...result.open, view: result.open.parts.threads.places}).some(sign => sign.id === 'runaway'), false);
}

let out = frame(started(), at.footprints);
for (const clue of ['footprints', 'wire', 'bowl', 'handprint']) {
  out = frame(out.open, at[clue]);
  assert.ok(marked(out, 'found/' + clue));
}
out = frame(out.open, at['in-the-shed']);
assert.equal(beat(out), 'shed');
out = move(out.open, at['in-the-shed']);
const shed = out.requests.find(request => request.type === 'talk')?.scene;
assert.equal(shed.lines[0].words, runaway.beats.shed.lines[0].words);
assert.deepEqual(shed.questions.find(row => row.id === 'what-happens').needs, ['why-run']);
out = frame(out.open, at.wire, {jobEvents: ['how-in', 'his-name'].map(id => ({
  type: 'openTalkQuestion', id, scene: 'runaway/shed/decision',
}))});
assert.ok(marked(out, 'asked-his-name'));
out = frame(out.open, at.wire, {wrench: true});
out = frame(out.open, at.wire, {wrench: true}, 6);
assert.equal(out.open.world.scrap, base.scrap - 2);
assert.ok(marked(out, 'wire-mended'));

const hearth = choose(out.open, at['in-the-shed'], 'shed', 'tell-auntie');
assert.equal(beat(hearth), 'hearth');
const hearthEntry = move(hearth.open, at.hearth);
assert.equal(hearthEntry.requests.find(row => row.type === 'talk').scene.lines[0].words, runaway.beats.hearth.lines[0].words);
assert.equal(beat(move(hearthEntry.open, at.gate)), 'gate');

const hide = choose(out.open, at['in-the-shed'], 'shed', 'hide');
assert.equal(beat(hide), 'hiding');
const gate = move(hide.open, at['in-the-woodpile']);
assert.equal(beat(gate), 'gate');
assert.ok(marked(gate, 'in-the-woodpile'));
const gateEntry = move(gate.open, at.gate, 'dusk');
const gateScene = gateEntry.requests.find(row => row.type === 'talk').scene;
assert.deepEqual(gateScene.choices.find(row => row.id.endsWith('/pay')).needs, ['his-worth']);
const handed = choose(gateEntry.open, at.gate, 'gate', 'hand-back');
assert.equal(end(handed), 'handed-back');
assert.equal(feudOf(handed.open.world, 'ash-men'), 'Watching');
const kept = choose(gateEntry.open, at.gate, 'gate', 'keep');
assert.equal(end(kept), 'kept');
assert.equal(feudOf(kept.open.world, 'ash-men'), 'Raiding');
const paid = choose(gateEntry.open, at.gate, 'gate', 'pay', ['his-worth']);
assert.equal(end(paid), 'paid');
assert.equal(paid.open.world.ledger.stocks.embers, 0);
assert.equal(feudOf(paid.open.world, 'ash-men'), 'Watching');
assert.equal(frame(kept.open, at.hearth, {partOfDay: 'dawn'}).open.world.ledger.made.length, 0);
const morning = {...kept.open, world: {...kept.open.world, ledger: bankHearth(kept.open.world.ledger).ledger}};
const drawing = frame(morning, at.hearth, {partOfDay: 'dawn'});
assert.ok(drawing.open.world.ledger.made.includes('way/grey-camp-back-way'));
assert.ok(drawing.open.world.ledger.marks.includes('rumour/grey-camp'));
assert.equal(end(drawing), 'kept');

const lie = choose(gateEntry.open, at.gate, 'gate', 'no-boy');
assert.equal(beat(lie), 'search-asked');
const asked = move(lie.open, at.gate, 'dark');
assert.ok(asked.requests.some(request => request.scene?.lines[0]?.words === runaway.beats['search-asked'].lines[0].words));
const sleep = choose(asked.open, at.gate, 'search-asked', 'his-chance');
assert.equal(beat(sleep), 'search-slept');
assert.ok(['taken', 'hidden'].includes(end(frame(sleep.open, at.gate, {partOfDay: 'dawn'}))));
const stayed = choose(asked.open, at.gate, 'search-asked', 'stay-up');
assert.equal(beat(stayed), 'search');
assert.equal(frame(stayed.open, at.gate, {onFoot: false}).events.length, 0);
const active = frame(stayed.open, at.gate);
assert.equal(active.events[0].type, 'threadMission');
assert.ok(isHeld(active.open.holds, 'checkpoints'));

const assertSearch = (world, target, outcome, rescue = false) => {
  let run = frame(started('search', world), target);
  const mission = run.open.parts.missions.active;
  assert.equal(mission.id, 'runaway/the-search');
  const {rule} = mission.mission;
  let whistle = null, lamp = null, elapsed = 0;
  for (let tick = 0; tick < 1100; tick++) {
    const time = tick / 4;
    const pickup = rescue && time === 59;
    const drop = rescue && time === 62;
    run = frame(run.open, drop ? at['in-the-shed'] : target, {interact: pickup || drop}, .25);
    elapsed += .25;
    if (run.events.some(row => row.cue === 'night.whistle')) whistle ??= elapsed;
    if (run.events.some(row => row.cue === 'open.search.lamp')) lamp ??= elapsed;
    if (missionResult(run)) break;
  }
  assert.equal(missionResult(run), outcome);
  assert.equal(isHeld(run.open.holds, 'signs'), false);
  assert.equal(run.requests.findLast(row => row.type === 'searchCast').target, null);
  const next = frame(run.open, target);
  assert.equal(outcome === 'found' ? beat(next) : end(next), outcome === 'found' ? 'found' : 'hidden');
  if (rule.whistle) assert.ok(lamp - whistle >= 19.75);
  if (rule.delay) assert.ok(lamp >= rule.delay);
  return next;
};

const failure = assertSearch(set(base, mark('in-the-shed')), at['in-the-shed'], 'found');
const rescue = assertSearch(set(base, mark('in-the-loft')), at['in-the-loft'], 'not-found', true);
assert.ok(marked(rescue, 'kept-ahead'));
assertSearch(set(base, mark('among-the-walkers'), mark('wire-mended'),
  {type: 'word', person: 'walkers', set: 'Friendly'}), at['among-the-walkers'], 'not-found');
const foundEntry = move(failure.open, at.gate);
assert.equal(end(choose(foundEntry.open, at.gate, 'found', 'stand-aside')), 'taken');
const fight = choose(foundEntry.open, at.gate, 'found', 'stand-in-front');
assert.equal(beat(fight), 'wall-fight');
assert.equal(feudOf(fight.open.world, 'ash-men'), 'Hunting');
let defending = frame(fight.open, at.gate);
assert.equal(defending.requests.find(request => request.type === 'missionDefence').entries.length, 4);
const targets = [0, 1].map(i => ({id: 'runaway/the-wall-fight/' + i, position: at.gate}));
const first = frame(defending.open, at.gate, {actors: targets, handFlamerHits: [targets[0].id]});
assert.equal(missionResult(first), undefined);
assert.equal(missionResult(frame(first.open, at.gate, {actors: targets, handFlamerHits: [targets[0].id]})), undefined);
const victory = frame(first.open, at.gate, {actors: targets, brandSwing: true});
assert.equal(missionResult(victory), 'won');
assert.equal(end(frame(victory.open, at.gate)), 'kept');
const defeat = frame(defending.open, at.gate, {fighter: {position: at.gate, knockedDown: true}});
assert.equal(missionResult(defeat), 'lost');
assert.equal(end(frame(defeat.open, at.gate)), 'taken');
defending = frame(started('wall-fight', set(base, mark('raiding-at-gate'))), at.gate);
assert.equal(defending.requests.find(request => request.type === 'missionDefence').entries.length, 6);
assert.equal(frame(defending.open, at.gate, {missionLeaving: true}).events[0].type, 'threadMissionCancelled');

const car = {onFoot: false};
const roadWorlds = Object.entries({
  walkers: set(base, {type: 'word', person: 'walkers', set: 'Friendly'}),
  'deck-folk': set(base, {type: 'word', person: 'deck-folk', set: 'Friendly'}),
  glasshouse: set(base, {type: 'word', person: 'glasshouse', set: 'Friendly'}, {type: 'find', site: 'glasshouse'}),
  'radio-hill': set(base, {type: 'word', person: 'radio-hill', set: 'Friendly'}, {type: 'find', site: 'radio-hill'}),
  'bus-ring': set(base, {type: 'word', person: 'bus-ring', set: 'Friendly'}, {type: 'find', site: 'bus-ring'}),
  nobody: set(base, {type: 'word', person: 'walkers', set: 'Friendly'}, {type: 'word', person: 'glasshouse', set: 'Friendly'},
    {type: 'mark', id: 'walkers-inside'}),
});
for (const [haven, world] of roadWorlds) {
  const sitePositions = Object.fromEntries(['glasshouse', 'radio-hill', 'bus-ring'].map(id => [id,
    sitePosition(id, world.open.landSeed) ?? LAND.at('ridge')]));
  const view = {...car, sitePositions};
  const road = frame(started('road-out', world), at.gate, view);
  assert.deepEqual(road.requests.find(row => row.type === 'missionDestinations').places.map(row => row.id), [haven]);
  const place = at[haven] ?? sitePositions[haven];
  const reached = frame(road.open, place, view);
  assert.equal(missionResult(reached), haven);
  let result = frame(reached.open, place, view);
  if (haven === 'nobody') {
    assert.equal(beat(result), 'gate');
    assert.ok(marked(result, 'sent-alone'));
  } else {
    assert.equal(beat(result), 'arrived');
    result = frame(result.open, place, view);
    assert.equal(beat(result), 'gate');
    assert.ok(marked(result, 'sent-on'));
    const visited = move(result.open, at.gate, 'dusk');
    const told = choose(visited.open, at.gate, 'gate', 'tell-where');
    assert.equal(end(told), 'sent-on');
    assert.equal(wordOf(told.open.world, haven), 'Strangers');
    assert.equal(favoursOf(told.open.world, haven), favoursOf(world, haven));
    assert.ok(frame(told.open, place, view).open.world.ledger.made.includes('way/grey-camp-back-way'));
  }
}

const roadStart = frame(started('road-out'), at.gate, car);
const watch = frame(roadStart.open, at['fork-west'], {...car, greyWithAsh: true}, 15.75);
assert.equal(watch.requests.some(row => row.type === 'riders'), false);
const sent = frame(watch.open, at['fork-west'], {...car, greyWithAsh: true}, .25);
assert.equal(sent.requests.find(row => row.type === 'riders').vehicles.length, 2);
const boxed = frame(sent.open, at['fork-west'], {...car, missionRoadHeldSeconds: 6});
assert.equal(missionResult(boxed), 'surrounded');
const surround = frame(boxed.open, at['fork-west'], car);
assert.equal(beat(surround), 'surrounded');
const atRoad = move(surround.open, at['fork-west']);
assert.equal(end(choose(atRoad.open, at['fork-west'], 'surrounded', 'open-the-door')), 'taken');
const breakout = choose(atRoad.open, at['fork-west'], 'surrounded', 'break-out');
assert.equal(beat(breakout), 'breakout');
const startBreakout = frame(breakout.open, at['fork-west'], car);
const four = frame(startBreakout.open, at['fork-west'], car);
assert.equal(four.requests.find(row => row.type === 'riders').vehicles.length, 4);
for (const outcome of ['won', 'lost']) {
  const result = frame(four.open, at['fork-west'], {...car, missionRoadOutcome: {id: 'runaway/the-breakout', outcome}});
  assert.equal(missionResult(result), outcome);
  const settled = frame(result.open, at['fork-west'], car);
  if (outcome === 'won') {
    assert.equal(beat(settled), 'road-out');
    assert.equal(feudOf(settled.open.world, 'ash-men'), 'Raiding');
  } else assert.equal(end(settled), 'taken');
}

assert.equal(MISSION_KINDS.onfoot.prepare({by: 'car', rule: {}}, runawayPlace), null);
assert.equal(MISSION_KINDS.defend.prepare({by: 'car'}, runawayPlace), null);
console.log('test-open-runaway: passed');
