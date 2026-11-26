import assert from 'node:assert/strict';
import voice from '../src/story/threads/content/radio-hill-voice.js';
import {bankHearth} from '../src/story/ledger.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {witnessSign} from '../src/story/threads/signs.js';
import {newWorld, isFound, feudOf, favoursOf, wordOf} from '../src/world/open/open-record.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {beginOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {createThreadsPart, OPEN_THREADS, openThreadSigns} from '../src/world/open/parts/threads.js';
import {missionsPart} from '../src/world/open/parts/missions.js';
import {sitePosition} from '../src/world/open/site-rule.js';
import {radioPlace, radioRamp, radioFuel, RADIO_ID, POCKET_ID, RADIO_MARK} from '../src/world/open/content/radio-hill-voice-places.js';
import {LAND} from '../src/world/scablands-names.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {riverDistanceAt} from '../src/world/scablands-regions.js';
import {sampleLine} from '../src/world/scablands-ways.js';
import {createSignView} from '../src/world/open/sign-view.js';
import {ROAD_NET} from '../src/world/scablands-road.js';
import {stepMover} from '../src/world/scablands-movers.js';
import {walkThread} from './thread-crossings.mjs';
import {pageFunctions, pageSource, start} from './scenarios/open-radio-hill-voice.mjs';

const seed = 4;
const world = newWorld({seed, night: 2, embers: 4, scrap: 90});
const hill = sitePosition('radio-hill', seed), pocket = sitePosition(POCKET_ID, seed);
const at = (site, spot) => radioPlace([site, spot], hill, pocket);
const ramp = radioRamp(hill);
const foot = ramp[0].point, top = ramp.at(-1).point, hut = at('radio-hill', 'hut');
const mouth = at(POCKET_ID, 'mouth'), inside = at(POCKET_ID, 'inside'), park = at(POCKET_ID, 'park');
const bracket = at(POCKET_ID, 'set'), lamp = at(POCKET_ID, 'lamp');
const parts = [createThreadsPart([voice]), missionsPart];
const effect = (id, ...effects) => ({id, effects});
const change = (source, id, ...effects) => applyEffects(source, effect(id, ...effects)).world;
const startAt = (beat, extra = []) => beginOpenLand({id: 'open-roam', steps: [{kind: 'roam'}],
  open: {world: change(world, 'qa/radio', {type: 'thread', id: RADIO_ID, to: beat}, ...extra)}});
const mark = id => ({type: 'mark', id: RADIO_ID + '/' + id});
const entered = id => mark('entered/' + id);
const snap = (open, point, dt = .1, extra = {}) => stepOpenLand(open, {
  openRoam: true, checkpointsEnabled: true, onRoad: true, partOfDay: 'dark', player: {position: point},
  carPosition: point, missionHeightAt: scablandsSurfaceHeightAt, ...extra,
}, dt, parts);
const beat = open => open.world.open.threads[RADIO_ID].beat;
const end = open => open.world.open.threads[RADIO_ID].end;
const has = (open, id) => open.world.ledger.marks.includes(RADIO_ID + '/' + id);
const tell = (step, words) => step.requests.some(row => row.text?.includes(words));
const missionResult = step => step.events.find(row => row.type === 'threadMissionOutcome')?.outcome;
const choose = (open, point, phase, id, extra = {}) => snap(open, point, .1, {jobEvents: [
  {type: 'talkChoice', scene: RADIO_ID + '/' + phase + '/decision', id},
], ...extra});
const bank = open => ({...open, world: {...open.world, ledger: bankHearth(open.world.ledger).ledger}});

assert.ok(OPEN_THREADS.includes(voice));
assert.equal(createFeatureFlags({qa: false, storage: null, search: ''}).enabled('story-choices'), false);
assert.deepEqual(walkThread(voice).faults, []);
assert.ok(ROAD_NET.nearest(start.x, start.z));
assert.ok(riverDistanceAt(start.x, start.z) > 150, 'the browser starts on the road away from decks');
const approach = sampleLine([start, foot], 2);
for (const [i, point] of approach.slice(1).entries())
  assert.equal(stepMover(approach[i], point, {radius: 1.3}).blocked, false, 'the browser approach is drivable');
for (const name of Object.keys(pageFunctions)) new Function(pageSource(name));

const opening = startAt('first-call');
const signView = {checkpointsEnabled: true, partOfDay: 'dark'};
const [sign] = openThreadSigns({...opening, view: signView});
assert.equal(openThreadSigns({...opening, view: {...signView, checkpointsEnabled: false}}).length, 0);
assert.equal(openThreadSigns({...opening, view: {...signView, partOfDay: 'day'}}).length, 0);
assert.equal(sign.sign.kind, 'call');
const hears = (point, other = {}) => witnessSign(sign, {carPosition: point, onRoad: true,
  missionHeightAt: scablandsSurfaceHeightAt, ...other}, 0, 1).witnessed;
assert.ok(hears(start));
assert.ok(!hears(start, {missionHeightAt: (x, z) => x === hill.x && z === hill.z ? 0 : 200}));
assert.ok(!hears(start, {onFoot: true}));
assert.ok(!hears(start, {onRoad: false}));
assert.ok(!hears(LAND.at('tin-town', 6000, 0)));
assert.ok(!has(snap(opening, start, 1, {checkpointsEnabled: false}).open, 'entered/first-call'));
assert.ok(!has(snap(opening, start, 1, {partOfDay: 'day'}).open, 'entered/first-call'));

const hillAlreadyFound = startAt('first-call', [{type: 'find', site: 'radio-hill'}]);
const secondFirst = snap(hillAlreadyFound, start);
assert.ok(tell(secondFirst, voice.beats['first-call'].lines[0].words));
assert.ok(!tell(secondFirst, voice.beats['first-call'].lines[1].words));
assert.equal(beat(secondFirst.open), 'second-voice');

const expired = snap(bank(bank(bank(opening))), start);
assert.equal(end(expired.open), 'unanswered');
assert.equal(tell(expired, voice.beats['first-call'].lines[1].words), false);
const unansweredFound = change(expired.open.world, 'qa/found-later', {type: 'find', site: 'radio-hill'});
const greeting = snap({...expired.open, world: unansweredFound}, hut, .1, {onFoot: true, interact: true});
assert.equal(greeting.requests.find(request => request.type === 'talk').scene.lines[0].words,
  voice.later.find(row => row.id === 'called-three-nights').lines[0].words);

const first = snap(opening, start);
assert.ok(tell(first, voice.beats['first-call'].lines[1].words));
let step = snap(first.open, start, 2.99);
assert.equal(beat(step.open), 'first-call');
step = snap(step.open, start, .01);
assert.ok(has(step.open, 'stopped-for-hetty'));
assert.equal(beat(step.open), 'second-voice');
assert.equal(has(snap(step.open, start, 16.9).open, 'entered/second-voice'), false);
step = snap(step.open, start, 17);
assert.ok(has(step.open, 'heard-two-voices'));
const questions = snap(step.open, start, .1, {interact: true});
assert.equal(questions.requests.find(row => row.type === 'talk').scene.questions[0].words, voice.beats['second-voice'].questions[0].words);
const tested = snap(questions.open, start, .1, {jobEvents: [{type: 'openTalkQuestion', scene: RADIO_ID + '/second-voice/decision',
  id: 'what-can-you-see'}]});
assert.ok(has(tested.open, 'tested'));
assert.equal(beat(snap(tested.open, start).open), 'second-voice', 'the choice requires reaching a bearing');
const declined = snap(first.open, start, 12, {carSpeedMph: 20});
assert.equal(beat(declined.open), 'second-voice');
assert.ok(!has(declined.open, 'stopped-for-hetty'));

step = snap(tested.open, foot);
assert.equal(beat(step.open), 'ramp');
step = snap(step.open, foot);
assert.ok(tell(step, voice.beats.ramp.lines[0].words));
const postpone = choose(step.open, foot, 'ramp', 'by-day');
assert.equal(beat(postpone.open), 'by-day');
assert.equal(beat(snap(postpone.open, hill).open), 'by-day');
const byDay = snap(bank(postpone.open), hill, .1, {partOfDay: 'day'});
assert.equal(beat(byDay.open), 'other-voice');
assert.equal(wordOf(byDay.open.world, 'radio-hill'), 'Strangers');

const climb = choose(step.open, foot, 'ramp', 'talk-me-up');
step = snap(climb.open, foot);
assert.ok(step.events.some(event => event.type === 'threadMission'));
assert.deepEqual(step.open.holds[0].systems, ['checkpoints', 'signs']);
const upStart = step;
const skipped = snap(step.open, top);
assert.equal(missionResult(skipped), undefined, 'the top cannot skip the other moments');
let hasCutIn = false;
for (const {point} of ramp) {
  step = snap(step.open, point);
  hasCutIn ||= step.events.some(row => row.cue === 'open.radio.cut-in');
}
assert.ok(hasCutIn, 'Parrot cuts in on the ascent');
assert.equal(missionResult(step), 'up');
assert.equal(step.open.holds.length, 0);
step = snap(step.open, top);
assert.equal(beat(step.open), 'other-voice');
assert.ok(isFound(step.open.world, 'radio-hill') && has(step.open, 'talked-up'));
assert.equal(wordOf(step.open.world, 'radio-hill'), 'Friendly');
const falling = snap(upStart.open, foot, .1, {combatWrecking: true});
assert.equal(missionResult(falling), 'over-the-edge');
assert.equal(falling.requests.find(row => row.type === 'threadCarPosition').armour, 0);
assert.equal(beat(snap(falling.open, top).open), 'other-voice');
assert.ok(has(snap(falling.open, top).open, 'off-the-ramp'));
assert.equal(beat(snap(step.open, hut, .1, {onFoot: true}).open), 'other-voice');
assert.ok(!has(snap(step.open, hut, .1, {onFoot: true}).open, 'entered/other-voice'));
const visited = snap(bank(step.open), hut, .1, {onFoot: true});
assert.ok(has(visited.open, 'entered/other-voice'));
assert.ok(tell(visited, voice.beats['other-voice'].lines[0].words));

const pickedWhite = snap(tested.open, mouth);
assert.equal(beat(pickedWhite.open), 'pocket');
const mouthBeat = snap(pickedWhite.open, mouth);
const cluePoint = at(POCKET_ID, 'wheels');
const readWheels = snap(mouthBeat.open, cluePoint, .1, {onFoot: true});
assert.ok(has(readWheels.open, 'found/wheels'));
const waitDark = choose(readWheels.open, mouth, 'pocket', 'wait-dark');
assert.equal(beat(snap(waitDark.open, mouth, 19.9).open), 'pocket');
const sawParrot = snap(waitDark.open, mouth, 20.1);
assert.equal(beat(sawParrot.open), 'ramp');
assert.ok(has(sawParrot.open, 'saw-parrot'));
assert.ok(tell(sawParrot, voice.beats.pocket.thoughts.at(-1).thought));
assert.equal(beat(snap(mouthBeat.open, foot).open), 'ramp', 'the white lamp can be left by driving for the red one');
const trap = snap(snap(mouthBeat.open, inside).open, inside);
assert.equal(beat(trap.open), 'trap');
assert.ok(isFound(trap.open.world, POCKET_ID));
const surrendered = snap(choose(trap.open, inside, 'trap', 'give-up-wheels').open, inside);
assert.equal(beat(surrendered.open), 'after-pocket');
assert.ok(has(surrendered.open, 'wheels-taken'));
assert.equal(surrendered.open.world.scrap, 60);
assert.equal(feudOf(surrendered.open.world, 'road-rats'), 'Watching');

const fight = choose(trap.open, inside, 'trap', 'fight-out');
const fightStarted = snap(fight.open, inside);
const cars = snap(fightStarted.open, inside);
assert.equal(cars.requests.find(row => row.type === 'riders').vehicles.length, 3);
assert.equal(cars.requests.find(row => row.type === 'riders').missionRule.boxedInSeconds, 6);
const fightOut = snap(cars.open, park);
assert.equal(missionResult(fightOut), 'out');
const escaped = snap(fightOut.open, park);
assert.equal(escaped.open.world.scrap, 102);
assert.ok(has(escaped.open, 'drove-out'));
assert.equal(feudOf(escaped.open.world, 'road-rats'), 'Raiding');
const lost = snap(cars.open, inside, .1, {jobEvents: [{type: 'riderFight', id: RADIO_ID + '/pocket-fight', outcome: 'surrounded'}]});
assert.equal(missionResult(lost), 'boxed-in');
const lostWheels = snap(snap(lost.open, inside).open, inside);
assert.equal(lostWheels.open.world.scrap, 30);
assert.ok(has(lostWheels.open, 'wheels-taken'));

const asking = choose(visited.open, hut, 'other-voice', 'take-her-set', {onFoot: true});
const bern = snap(asking.open, hut, .1, {onFoot: true});
assert.equal(beat(bern.open), 'set-asked');
const notYet = choose(bern.open, hut, 'set-asked', 'not-yet', {onFoot: true});
assert.equal(beat(notYet.open), 'other-voice');
const asked = choose(bern.open, hut, 'set-asked', 'go-tonight', {onFoot: true});
assert.equal(beat(asked.open), 'take-set');
assert.equal(snap(asked.open, park, .1, {outingAvailable: false}).open.holds.length, 0);
const heist = snap(asked.open, park);
assert.ok(heist.open.parts.missions.active);
assert.equal(heist.open.holds.length, 1);
const work = snap(heist.open, bracket, 5.99, {onFoot: true, wrench: true, carPosition: park});
assert.equal(work.open.parts.missions.active.state.carrying, false);
const lifted = snap(work.open, bracket, .01, {onFoot: true, wrench: true, carPosition: park});
assert.equal(lifted.open.parts.missions.active.state.carrying, true);
assert.ok(lifted.events.some(row => row.cue === 'open.set.taken'));
const loaded = snap(lifted.open, park, .1, {onFoot: true, carPosition: park});
assert.equal(missionResult(loaded), undefined);
const signs = createSignView();
const beforeLook = structuredClone(heist.open);
signs.update({open: heist.open}, lamp, heist.open.seconds);
const beam = signs.group.getObjectByName('The Pocket lamp beam');
assert.ok(beam?.visible, 'the sweep is visible where the heist uses it');
signs.update({open: loaded.open}, lamp, loaded.open.seconds);
assert.equal(beam.visible, false, 'the beam clears when the escape leg begins');
assert.deepEqual(heist.open, beforeLook, 'drawing the sweep leaves the mission alone');
signs.dispose();
const delivered = snap(loaded.open, hut);
assert.equal(missionResult(delivered), 'out-with-the-set');
const took = snap(delivered.open, hut);
assert.equal(end(took.open), 'second-set');
assert.ok(has(took.open, 'took-the-set'));
assert.ok(took.open.world.ledger.made.includes('radio-hill/second-set'));
assert.equal(feudOf(took.open.world, 'road-rats'), 'Raiding');

const lightPoint = LAND.at('tin-town', lamp.x - LAND.at('tin-town').x, lamp.z + 9);
const watch = {...heist.open, parts: {...heist.open.parts, missions: {active: {...heist.open.parts.missions.active,
  state: {...heist.open.parts.missions.active.state, elapsed: -1}}}}};
const seen = snap(watch, lightPoint, 2, {onFoot: true, carPosition: park, missionHeightAt: () => 0});
assert.ok(seen.events.some(row => row.type === 'threadMissionAlert' && row.outcome === 'seen'));
assert.equal(missionResult(seen), undefined);
const rat = voice.beats['take-set'].mission.outcomes.seen.lines[0];
assert.ok(tell(snap(seen.open, lightPoint, .1, {onFoot: true}), rat.words));
const caught = snap(seen.open, lightPoint, .1, {onFoot: true,
  jobEvents: [{type: 'riderFight', id: RADIO_ID + '/take-set', outcome: 'surrounded'}]});
assert.equal(missionResult(caught), 'caught');
const putBack = snap(caught.open, park);
assert.equal(beat(putBack.open), 'other-voice');
assert.ok(putBack.open.world.ledger.marks.includes(RADIO_MARK.watched));
assert.equal(putBack.open.world.scrap, 60);

const microphone = choose(visited.open, hut, 'other-voice', 'the-microphone', {onFoot: true});
const air = snap(microphone.open, hut, .1, {onFoot: true});
assert.equal(beat(air.open), 'on-the-air');
const fightingWorld = change(air.open.world, 'qa/raiding', {type: 'feud', of: 'road-rats', by: 1});
const refuses = choose({...air.open, world: fightingWorld}, hut, 'on-the-air', 'read-the-news', {onFoot: true});
assert.equal(end(refuses.open), null);
assert.ok(tell(refuses, voice.beats['on-the-air'].choices[0].lines[0].words));
const threaten = choose(air.open, hut, 'on-the-air', 'threaten', {onFoot: true});
assert.equal(beat(threaten.open), 'other-voice');
assert.ok(threaten.open.world.ledger.marks.includes(RADIO_MARK.watched));
const peace = choose(air.open, hut, 'on-the-air', 'read-the-news', {onFoot: true});
assert.equal(end(peace.open), 'two-voices');
assert.equal(peace.open.world.ledger.roadWord, 1);
assert.equal(wordOf(peace.open.world, 'radio-hill'), 'Sworn');
assert.equal(feudOf(peace.open.world, 'road-rats'), 'Watching');
assert.equal(favoursOf(peace.open.world, 'radio-hill'), 0, 'peace itself grants a word, with no tow or favour added');

const fuel = choose(visited.open, hut, 'other-voice', 'talk-over-her', {onFoot: true});
assert.equal(beat(fuel.open), 'talking-over');
assert.equal(fuel.open.world.ledger.obligations[0].due, fuel.open.world.ledger.night + 9);
const tank = radioFuel(fuel.open.world, {onFoot: true, player: hut, people: [{id: 'moss', position: hut}]},
  () => hut);
const bought = change(fuel.open.world, tank.id, ...tank.effects);
assert.equal(bought.scrap, 65);
const deliver = radioFuel(bought, {onFoot: true, player: hut}, () => hut);
const fuelled = change(bought, deliver.id, ...deliver.effects);
assert.equal(fuelled.ledger.obligations[0].due, fuel.open.world.ledger.obligations[0].due + 9);
assert.equal(wordOf(fuelled, 'radio-hill'), 'Sworn');
const late = {...fuelled, ledger: {...fuelled.ledger, night: fuelled.ledger.obligations[0].due}};
const overdue = radioFuel(late, {}, () => hut).choice;
assert.equal(change(late, overdue.id, ...overdue.effects).ledger.obligations.length, 0);
assert.equal(wordOf(change(late, overdue.id, ...overdue.effects), 'radio-hill'), 'Friendly');

for (const seed of [1, 3, 4]) {
  const route = radioRamp(sitePosition('radio-hill', seed));
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1].point, b = route[i].point, steps = Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / 2);
    let previous = a;
    for (let j = 1; j <= steps; j++) {
      const point = LAND.at('tin-town', a.x - LAND.at('tin-town').x + (b.x - a.x) * j / steps, a.z + (b.z - a.z) * j / steps);
      assert.equal(stepMover(previous, point, {radius: 1.3}).blocked, false, 'the existing ground permits each ramp leg');
      previous = point;
    }
  }
}
console.log('test-open-radio-hill-voice: passed');
