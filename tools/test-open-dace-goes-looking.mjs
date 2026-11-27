import assert from 'node:assert/strict';
import {FEATURE_STATES} from '../src/feature-flags.js';
import {bankHearth} from '../src/story/ledger.js';
import {startTalk, talkScreen} from '../src/story/talk.js';
import story from '../src/story/threads/content/dace-goes-looking.js';
import {DACE_ID, DACE_PLACES as p, daceMark, dacePeople} from '../src/world/open/content/dace-goes-looking-places.js';
import {daceCanCast, daceDriveMission} from '../src/world/open/content/dace-goes-looking-rule.js';
import {MISSION_KINDS} from '../src/world/open/content/mission-kinds.js';
import {isHeld, takeHold} from '../src/world/open/holds.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {beginOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {newWorld, wordOf, favoursOf, isFound} from '../src/world/open/open-record.js';
import {missionsPart} from '../src/world/open/parts/missions.js';
import {createThreadsPart, openThreadSigns, threadsAtBankedHearth} from '../src/world/open/parts/threads.js';
import {sitePosition} from '../src/world/open/site-rule.js';
import {LAND} from '../src/world/scablands-names.js';
import {stepMover} from '../src/world/scablands-movers.js';
import {sampleLine} from '../src/world/scablands-ways.js';
import {walkThread} from './thread-crossings.mjs';
import {run, scenarioWorld} from './scenarios/open-dace-goes-looking.mjs';

const mark = (id, scoped = true) => ({type: 'mark', id: scoped ? daceMark(id) : id});
const changed = (world, id, effects) => applyEffects(world, {id: 'qa/' + id, effects}).world;
const fixture = (beat = 'sign', {seed = 7, site = 'glasshouse', marks = [], scrap = 18, word = 'Friendly'} = {}) =>
  changed(newWorld({seed, night: 3, embers: 3, scrap}), 'dace-start', [
    mark('walkers-inside', false), {type: 'word', person: 'walkers', set: word},
    {type: 'favour', person: 'walkers', by: 1},
    {type: 'debt', id: 'dace-owes', person: 'dace', text: 'Dace owes you.'},
    {type: 'thread', id: DACE_ID, to: beat, cast: {site}}, ...marks.map(id => mark(id)),
  ]);
const parts = [createThreadsPart([story]), missionsPart];
const begin = world => beginOpenLand({id: 'open-roam', steps: [{kind: 'roam'}], open: {world}});
const view = {openRoam: true, checkpointsEnabled: true, partOfDay: 'dawn'};
const frame = (before, point = p.dace, extra = {}, dt = .1) =>
  stepOpenLand(before.open ?? before, {...view, player: point, carPosition: point, onFoot: true, ...extra}, dt, parts);
const worldOf = result => (result.open ?? result).world;
const record = result => worldOf(result).open.threads[DACE_ID];
const marked = (result, id) => worldOf(result).ledger.marks.includes(daceMark(id));
const caption = (result, words) => result.requests.some(row => row.type === 'say' && row.text.includes(words));
const sleep = (before, nights = 1) => {
  const open = before.open ?? before;
  let world = open.world;
  for (let i = 0; i < nights; i++) world = {...world, ledger: bankHearth(world.ledger).ledger};
  return {...open, world};
};
const answer = (before, point, option, extra = {}, asked = []) => {
  const ready = frame(frame(before, point, extra), point, {...extra, interact: true});
  const talk = ready.requests.find(row => row.type === 'talk');
  assert.ok(talk, record(before).beat + ' offers a talk');
  startTalk(talk.scene);
  const choice = talk.scene.choices.find(row => row.id === talk.id || row.id.endsWith('/' + option));
  assert.ok(choice, record(before).beat + ' offers ' + option);
  const questions = asked.map(id => {
    assert.ok(talk.scene.questions.some(row => row.id === id));
    return {type: 'openTalkQuestion', scene: talk.id, id};
  });
  return frame(ready, point, {...extra, jobEvents: [...questions, {type: 'talkChoice', scene: talk.id, id: choice.id}]});
};
const awake = before => frame(before, p.hearth, {partOfDay: 'dusk'});
const submit = (before, talk, option, extra = {}) =>
  frame(before, p.hearth, {...extra, jobEvents: [{type: 'talkChoice', scene: talk.id,
    id: talk.scene.choices.find(row => row.id.endsWith('/' + option)).id}]});

assert.equal(FEATURE_STATES['story-choices'], 'dev');
assert.deepEqual(walkThread(story).faults, []);
assert.ok(['glasshouse', 'sweet-seep', 'deep-sign', 'hangar', 'crows-step'].every(id => daceCanCast(id, fixture())));
assert.equal(daceCanCast('rats-nest', fixture()), false);
assert.equal(daceCanCast('bell-buoy', fixture()), false);
const eligible = Array.from({length: 40}, (_, seed) => changed(newWorld({seed, night: 3, embers: 3}), 'dace-can-start', [
  {type: 'word', person: 'walkers', set: 'Friendly'}, mark('dace-runner', false),
])).find(world => threadsAtBankedHearth({world, view}, [story]).open.threads[DACE_ID]);
assert.ok(eligible);
const direct = (world, more = {}) => threadsAtBankedHearth({world, view: {...view, ...more}}, [story]).open.threads[DACE_ID];
assert.ok(daceCanCast(direct(eligible).cast.site, eligible));
assert.equal(direct(eligible, {lastNight: 4}), undefined);
assert.equal(direct(eligible, {checkpointsEnabled: false}), undefined);
assert.equal(direct(changed(eligible, 'sent-away', [mark('dace-sent-away', false)])), undefined);

const start = begin(fixture());
const sign = openThreadSigns({world: start.world, view}).find(row => row.id === DACE_ID);
assert.deepEqual(sign.at, p.pickup);
assert.equal(sign.sign.kind, 'words');
assert.equal(openThreadSigns({world: start.world, view: {...view, partOfDay: 'dusk'}}).length, 0);
assert.equal(openThreadSigns({world: start.world, view: {...view, dayClock: true}, seconds: 540}).length, 0);
assert.equal(openThreadSigns({world: start.world, view: {...view, checkpointsEnabled: false}}).length, 0);
assert.equal(openThreadSigns({world: start.world, holds: takeHold([], 'fixture', ['signs']), view}).length, 0);
assert.equal(dacePeople(start.world, true)[0].task, 'sit');
assert.equal(dacePeople(start.world, false).length, 0);
const far = frame(start, LAND.at('tin-town', 35, -40));
assert.ok(!marked(far, 'seen/pickup'));
const near = frame(far, LAND.at('tin-town', 24, -40));
assert.deepEqual(near.requests.filter(row => row.type === 'say').map(row => row.text), story.beats.sign.thoughts);
assert.equal(record(near).beat, 'sign');
assert.equal(frame(start, p.dace, {checkpointsEnabled: false, interact: true}).requests.length, 0);
assert.equal(record(frame(sleep(near, 2))).end, null);
const ignored = frame(sleep(near, 3));
assert.equal(record(ignored).end, 'never-asked');
assert.ok(marked(ignored, 'never-asked'));
assert.ok(!isFound(worldOf(ignored), 'glasshouse'));
assert.equal(wordOf(worldOf(ignored), 'walkers'), 'Friendly');
assert.equal(favoursOf(worldOf(ignored), 'walkers'), 1);
const gateReport = frame(sleep(ignored, 2), p.gate, {interact: true}).requests.find(row => row.type === 'talk');
assert.equal(gateReport.scene.lines[0].words, story.later.at(-1).lines[0].words);

let together = answer(near, p.dace, 'together');
assert.equal(record(together).beat, 'together');
assert.ok(marked(together, 'went-together'));
const atCar = {onFoot: false, carSpeedMph: 0};
const site = sitePosition('glasshouse', worldOf(together).open.landSeed);
const route = daceDriveMission().rule.moments;
assert.equal(frame(together, p.start, {...atCar, outingAvailable: false}).open.parts.missions.active, undefined);
together = frame(together, p.start, atCar);
assert.ok(['checkpoints', 'signs'].every(system => isHeld(together.open.holds, system)));
assert.ok(!frame(together, site, atCar).events.some(event => event.type === 'threadMissionMoment'), 'later stops cannot be skipped to');
for (const [index, {id, at}] of route.entries()) {
  together = frame(together, at === '@site' ? site : at, atCar);
  assert.ok(together.events.some(event => event.moment === id), JSON.stringify({id, events: together.events, active: together.open.parts.missions.active}));
  assert.ok(caption(together, story.beats.together.mission.lines[index].words));
  assert.equal(frame(together, at === '@site' ? site : at, atCar).events.some(event => event.moment === id), false);
}
together = frame(together, p['gate-at-dusk'], atCar);
assert.equal(record(together).end, 'found-together');
assert.ok(isFound(worldOf(together), 'glasshouse'));
assert.ok(!marked(together, 'square'));
assert.equal(worldOf(together).ledger.obligations[0].id, 'dace-owes');
assert.equal(together.open.holds.length, 0);
assert.deepEqual(MISSION_KINDS.drive.prepare({by: 'car', rule: {success: 'yes', moments: ['bad']}}, () => undefined), null);

let yes = answer(near, p.dace, 'yes', {}, ['the-key', 'take-it-anyway', 'the-stones']);
assert.equal(record(yes).beat, 'ready');
assert.ok(marked(yes, 'asked-about-the-key'));
assert.ok(marked(yes, 'asked/the-stones'));
yes = frame(yes, p.radiator, {wrench: true}, 9.8);
assert.equal(worldOf(yes).scrap, 18);
yes = frame(yes, p.radiator, {wrench: true}, .2);
assert.equal(worldOf(yes).scrap, 10);
assert.ok(marked(yes, 'radiator-mended'));
yes = frame(yes, p.radio, {wrench: true}, 12);
assert.ok(marked(yes, 'radio-mended'));
assert.ok(yes.events.some(event => event.cue === 'open.pickup.radio'));
yes = frame(yes, p.spare, {wrench: true}, 8);
assert.equal(worldOf(yes).scrap, 0);
assert.ok(!marked(yes, 'spare-mended'));
yes = frame(yes, p.dace, {interact: true});
assert.equal(record(yes).beat, 'radio-check');
yes = answer(yes, p.dace, 'call-twice-a-day');
yes = answer(yes, p.dace, 'tell-stay');
assert.equal(record(yes).beat, 'leaving');
yes = answer(yes, p.dace, 'ack');
assert.equal(record(yes).beat, 'away');
assert.ok(yes.events.some(event => event.cue === 'open.pickup.started'));

const trouble = ['entered/leaving', 'hill-unkind', 'radio-mended', 'radio-check'];
const departure = changed(fixture('leaving', {marks: trouble}), 'left', [{type: 'thread', id: DACE_ID, to: 'away'}]);
let distress = frame(begin(departure), p.start, {...atCar, partOfDay: 'noon', onRoad: true});
assert.equal(record(distress).beat, 'call');
distress = frame(distress, p.start, {...atCar, partOfDay: 'noon'});
let call = distress.requests.find(row => row.type === 'talk');
assert.equal(call.scene.lines[0].words, story.beats.away.lines[3].words);
assert.ok(distress.events.some(event => event.cue === 'open.pickup.call'));
let wait = submit(distress, call, 'at-first-light', {...atCar, partOfDay: 'noon'});
assert.equal(record(wait).beat, 'search');
assert.equal(frame(wait, p.start, atCar).open.parts.missions.active, undefined);
wait = frame(sleep(wait), p.start, atCar);
assert.equal(wait.open.parts.missions.active.id, daceMark('fetch'));

let late = fixture('leaving', {marks: ['entered/leaving', 'tyre-goes']});
late = changed(late, 'left', [{type: 'thread', id: DACE_ID, to: 'away'}]);
late = awake(sleep(begin(late)));
assert.equal(record(late).beat, 'late');
late = answer(late, p.hearth, 'go-at-dawn', {partOfDay: 'dusk'});
assert.ok(marked(late, 'rell-walked'));

for (const [outcome, marks, pickup] of [
  ['brought-home', ['hill-unkind'], p.hill],
  ['brought-home', ['tyre-goes'], p.stones],
  ['brought-home', ['riders-come'], p.rocks],
  ['brought-home', ['told-trust', 'tyre-goes'], site],
  ['brought-home', ['hill-unkind', 'walked'], p.walking],
  ['car-wrecked', ['tyre-goes'], p.stones],
]) {
  let fetch = frame(begin(fixture('search', {marks})), p.start, atCar);
  assert.deepEqual(fetch.open.parts.missions.active.state.route.pickup, pickup);
  assert.ok(isHeld(fetch.open.holds, 'signs'));
  assert.ok(!isHeld(fetch.open.holds, 'checkpoints'));
  const passing = frame(fetch, pickup, {...atCar, carSpeedMph: 15});
  assert.equal(passing.open.parts.missions.active.state.aboard, 0);
  fetch = frame(passing, pickup, atCar);
  assert.equal(fetch.open.parts.missions.active.state.aboard, 1);
  fetch = frame(fetch, pickup, atCar);
  assert.ok(caption(fetch, story.beats.search.mission.lines[5].words));
  fetch = frame(fetch, p['gate-at-dusk'], {...atCar, combatWrecking: outcome === 'car-wrecked'});
  assert.ok(fetch.events.some(event => event.outcome === outcome));
  fetch = frame(fetch, p.hearth, {partOfDay: 'dusk'});
  assert.equal(record(fetch).beat, 'hearth');
  assert.ok(marked(fetch, 'fetched-home'));
  assert.equal(fetch.open.holds.length, 0);
  if (marks.includes('tyre-goes')) assert.ok(marked(fetch, 'pickup-left-out'));
  if (marks.includes('riders-come')) assert.ok(marked(fetch, 'pickup-taken'));
  assert.equal(worldOf(fetch).ledger.marks.includes('rumour/glasshouse'),
    marks.includes('hill-unkind') || marks.includes('tyre-goes') && !marks.includes('told-trust'));
  const home = answer(fetch, p.hearth, 'ack', {partOfDay: 'dusk'});
  assert.equal(record(home).end, 'fetched');
  assert.equal(marked(home, 'square'), marks.includes('told-trust') || marks.includes('riders-come'));
}

for (const [marks, found, word] of [[[], true, 'Friendly'], [['told-hide'], false, 'Sworn']]) {
  const home = answer(begin(fixture('hearth', {marks, word})), p.hearth, 'ack', {partOfDay: 'dusk'});
  assert.equal(record(home).end, 'found-alone');
  assert.ok(marked(home, 'square'));
  assert.equal(isFound(worldOf(home), 'glasshouse'), found);
  assert.equal(worldOf(home).ledger.marks.includes('rumour/glasshouse'), !found);
  assert.equal(wordOf(worldOf(home), 'walkers'), 'Sworn');
  assert.equal(wordOf(worldOf(home), 'glasshouse'), found ? 'Friendly' : 'Strangers');
  assert.equal(favoursOf(worldOf(home), 'walkers'), 1);
  assert.equal(worldOf(home).ledger.obligations.length, 0);
}

let refusal = answer(near, p.dace, 'no');
refusal = answer(refusal, p.key, 'take-the-key');
refusal = frame(sleep(refusal));
assert.equal(record(refusal).beat, 'key-was-taken');
refusal = answer(refusal, p.hearth, 'ack');
assert.equal(record(refusal).end, 'stayed');
assert.ok(marked(refusal, 'key-taken'));
assert.equal(wordOf(worldOf(refusal), 'walkers'), 'Friendly');
const refusals = new Map();
for (let seed = 0; seed < 25 && refusals.size < 2; seed++) {
  const waiting = answer(begin(fixture('key', {seed})), p.key, 'leave-the-key');
  const next = frame(sleep(waiting));
  refusals.set(record(next).beat, next);
}
const stayed = answer(refusals.get('he-stayed'), p.hearth, 'ack');
assert.ok(marked(stayed, 'he-stayed'));
assert.equal(wordOf(worldOf(stayed), 'walkers'), 'Sworn');
for (const [option, beat] of [['go-after-him', 'search'], ['wait-for-him', 'away']]) {
  const next = answer(refusals.get('he-took-it'), p.hearth, option);
  assert.ok(marked(next, 'took-it-in-the-night'));
  assert.equal(record(next).beat, beat);
}

const options = frame(frame(start, p.dace), p.dace, {interact: true}).requests.find(row => row.type === 'talk').scene;
const choices = talkScreen(options, {phase: 'options', asked: [], history: []}).options;
assert.equal(choices.filter(row => row.kind === 'say').length, 3);
assert.ok(!choices.some(row => row.words === story.beats.asking.questions.find(row => row.id === 'the-price').words));

const sources = [];
await run({
  navigate: () => {}, waitFor: source => sources.push(source), evaluate: source => sources.push(source), screenshot: () => {},
});
assert.ok(sources.length > 15);
for (const source of sources) assert.doesNotThrow(() => new Function('return ' + source));
assert.equal(stepMover(p.start, p.start, {radius: 2}).blocked, false);
const browserWorld = scenarioWorld();
const browserSite = sitePosition(record({world: browserWorld}).cast.site, browserWorld.open.landSeed);
const browserRoad = sampleLine([p.start, p['first-fork'], browserSite, p['gate-at-dusk']], 2);
assert.ok(browserRoad.slice(1).every((point, i) => !stepMover(browserRoad[i], point, {radius: 1.2}).blocked),
  'the scenario follows a solid-free route on the real ground');
console.log('test-open-dace-goes-looking: sign, three decisions, paid repairs, radio, drive and rescue outcomes, ledger, and browser source passed');
