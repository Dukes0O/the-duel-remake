import assert from 'node:assert/strict';
import {createFeatureFlags} from '../src/feature-flags.js';
import story from '../src/story/threads/content/mall-road-toll.js';
import {placeForThread} from '../src/story/scenes/burned-camp.js';
import {witnessSign} from '../src/story/threads/signs.js';
import {scablandsFloorsAt} from '../src/world/scablands-ground.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {beginOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {feudOf, isFound, newWorld, stageOf} from '../src/world/open/open-record.js';
import {isHeld} from '../src/world/open/holds.js';
import {drawCheckpoint, OPEN_CHECKPOINTS} from '../src/world/open/checkpoint-rule.js';
import {MISSION_KINDS} from '../src/world/open/content/mission-kinds.js';
import {prepareThreadMission, missionsPart} from '../src/world/open/parts/missions.js';
import {createThreadsPart, openThreadSigns, threadsAtBankedHearth} from '../src/world/open/parts/threads.js';
import {TOLL_GATE, TOLL_ID, stagedToll, tollPlace, tollPosition} from '../src/world/open/content/mall-road-toll-places.js';
import {peoplePart} from '../src/world/open/parts/people.js';
import {openMapMarks} from '../src/world/open/map-marks.js';
import {checkThread} from '../src/world/open/check-tables.js';
import {walkThread} from './thread-crossings.mjs';
import {pageFunctions, pageSource} from './scenarios/open-mall-road-toll.mjs';

const gate = tollPlace(TOLL_GATE);
const spot = name => tollPlace([TOLL_GATE, name]);
const parts = [createThreadsPart([story]), missionsPart];
const base = () => newWorld({seed: 1234, night: 7, scrap: 60});
const marked = (id, text) => ({type: 'mark', id: TOLL_ID + '/' + id, ...(text && {text})});
const apply = (world, effects, id = 'fixture') => applyEffects(world, {id, effects}).world;
const withBeat = (beat, effects = [], cast = {}) => apply(base(), [{type: 'thread', id: TOLL_ID, to: beat, cast}, ...effects]);
const begin = world => beginOpenLand({id: 'open-roam', steps: [{kind: 'roam'}], open: {world}});
const record = open => open.world.open.threads[TOLL_ID];
const has = (open, id) => open.world.ledger.marks.includes(TOLL_ID + '/' + id);
const frame = (open, point = gate, dt = .1, more = {}) => stepOpenLand(open, {
  player: {position: point}, carPosition: point, openRoam: true, checkpointsEnabled: true,
  ...more,
}, dt, parts);
const step = (open, point, dt, more) => frame(open, point, dt, more).open;
const outcome = output => output.events.find(event => event.type === 'threadMissionOutcome')?.outcome;
const talk = (open, point) => frame(open, point, .1, {onFoot: true, interact: true});
const sceneId = beat => TOLL_ID + '/' + beat + '/decision';
const action = (beat, id, type = 'talkChoice') => ({type, scene: sceneId(beat),
  id: type === 'talkChoice' ? sceneId(beat) + '/' + id : id});
const interact = (open, beat, id, point = spot('sump'), type) =>
  step(open, point, .1, {onFoot: true, jobEvents: [action(beat, id, type)]});
const advanceNight = (open, night) => ({...open, world: {...open.world, ledger: {...open.world.ledger, night}}});

assert.deepEqual(checkThread(story), []);
assert.deepEqual(walkThread(story).faults, []);
assert.equal(createFeatureFlags().enabled('story-choices'), false);
const early = apply(newWorld({seed: 1234, night: 2}), [{type: 'mark', id: 'burned-camp/toll-promised'}]);
assert.equal(threadsAtBankedHearth({world: early}, [story]).open.threads[TOLL_ID], undefined);
const startWorld = withBeat('sign');
const promised = apply(base(), [{type: 'mark', id: 'burned-camp/toll-promised'}]);
assert.equal(threadsAtBankedHearth({world: promised}, [story]).open.threads[TOLL_ID].beat, 'sign');
const withFeud = apply(promised, [{type: 'thread', id: 'another-feud', to: 'sign', cast: {}}], 'fixture/another');
const anotherFeud = {...story, id: 'another-feud'};
assert.equal(threadsAtBankedHearth({world: withFeud}, [anotherFeud, story]).open.threads[TOLL_ID], undefined);
assert.equal(openThreadSigns({world: startWorld, view: {checkpointsEnabled: false}}).length, 0);
const [sign] = openThreadSigns({world: startWorld, view: {checkpointsEnabled: true}});
assert.deepEqual(sign.at, gate);
assert.equal(scablandsFloorsAt(spot('approach').x, spot('approach').z, []), 1);
for (const along of [-599, 599]) {
  const carPosition = tollPosition(0, along);
  assert.equal(witnessSign(sign, {carPosition}, 0, 2.99).witnessed, false);
  assert.equal(witnessSign(sign, {carPosition}, 2.99, .01).witnessed, true);
  assert.equal(witnessSign(sign, {carPosition, onFoot: true}, 2.99, .01).witnessed, false);
}
assert.equal(witnessSign(sign, {carPosition: tollPosition(0, 601)}, 2.99, .01).seconds, 0);
assert.equal(witnessSign(sign, {carPosition: spot('approach'), signHeightAt: (_x, z) =>
  z > gate.z - 125 && z < gate.z - 110 ? 30 : 0}, 2.99, .01).seconds, 0);
assert.equal(record(step(begin(startWorld), spot('approach'), 4, {checkpointsEnabled: false})).beat, 'sign');

let drive = begin(startWorld);
drive = step(drive, spot('approach'), 2.99);
assert.equal(record(drive).beat, 'sign');
assert.equal(isFound(drive.world, TOLL_GATE), false);
let shown = frame(drive, spot('approach'), .01);
drive = shown.open;
assert.equal(record(drive).beat, 'gate');
assert.ok(shown.events.some(row => row.cue === 'open.toll.seen'));
assert.equal(isFound(drive.world, TOLL_GATE), false);
drive = step(drive, tollPosition(0, -150));
assert.ok(isFound(drive.world, TOLL_GATE));
assert.equal(openMapMarks(drive.world, tollPlace).sites[0].name, "Sump's Gate");
drive = step(drive, spot('sump'));
const sumpTalk = talk(drive, spot('sump'));
assert.ok(sumpTalk.requests.some(request => request.scene?.questions.some(row => row.id === 'who-will-not-pay')));
drive = interact(sumpTalk.open, 'gate', 'who-will-not-pay', spot('sump'), 'openTalkQuestion');
assert.ok(has(drive, 'price-heard'));
drive = interact(drive, 'gate', 'nan-hello', spot('nan'), 'openTalkQuestion');
drive = interact(drive, 'gate', 'why-pay', spot('nan'), 'openTalkQuestion');
assert.ok(has(drive, 'nan-asked'));
const cast = stepOpenLand(drive, {openRoam: true, checkpointsEnabled: true}, .1, [peoplePart]).open.parts.people.cast;
assert.ok(cast.some(row => row.id === 'nan-tallow'));
assert.ok(cast.some(row => row.id === 'sump'));

for (const [index, balance] of [52, 44, 36, 24, 12].entries()) {
  drive = interact(drive, 'gate', 'pay');
  assert.equal(record(drive).beat, 'paying');
  shown = frame(drive);
  drive = shown.open;
  assert.equal(drive.world.scrap, balance);
  assert.ok(shown.events.some(row => row.cue === 'open.toll.bucket'));
  assert.equal(record(drive).end ?? null, index === 4 ? 'paid' : null);
}
assert.ok(has(drive, 'paid-five') && has(drive, 'road-taxed'));
assert.equal(drive.world.ledger.roadWord, 1);
assert.equal(feudOf(drive.world, 'road-rats'), 'Watching');

let ignored = step(begin(startWorld), spot('approach'), .1);
ignored = step(advanceNight(ignored, 12), spot('approach'), 3);
assert.equal(record(ignored).beat, 'gate');
ignored = step(advanceNight(ignored, 13), spot('approach'));
assert.equal(record(ignored).end, null);
ignored = step(advanceNight(ignored, 18), spot('approach'));
assert.equal(record(ignored).end, 'stands');
assert.ok(has(ignored, 'road-taxed'));
const unseen = step(advanceNight(begin(startWorld), 13), tollPosition(0, -700));
assert.equal(record(unseen).end, 'stands');
assert.ok(has(unseen, 'road-taxed'));
const normalRoad = {...unseen.world, open: {...unseen.world.open, threads: {}, crossings: {any: 1}}};
const tollRoad = {...unseen.world, open: {...unseen.world.open, crossings: {any: 1}}};
const tollCheckpoint = OPEN_CHECKPOINTS.find(row => row.id === 'mall-road-2');
const crossing = Array.from({length: 200}, (_, index) => index + 1).find(index => {
  const draw = drawCheckpoint(tollCheckpoint, normalRoad, index, {difficulty: 'easy'});
  return draw?.group === 'road-rats' && draw.kind === 'fight';
});
assert.ok(crossing, 'the seed produces a Road Rat fight');
assert.equal(drawCheckpoint(tollCheckpoint, tollRoad, crossing, {difficulty: 'easy'}).count,
  drawCheckpoint(tollCheckpoint, normalRoad, crossing, {difficulty: 'easy'}).count + 2);
assert.equal(drawCheckpoint(tollCheckpoint, {...tollRoad, open: {...tollRoad.open,
  threads: {[TOLL_ID]: {...record(unseen), end: 'kept'}}}}, crossing, {difficulty: 'easy'}).kind, 'pass');

let permanent = step(unseen, spot('sump'));
permanent = step(permanent, spot('sump'), .1, {onFoot: true, jobEvents: [
  {type: 'talkChoice', id: TOLL_ID + '/regular-payment'},
]});
assert.equal(permanent.world.scrap, 48);
permanent = step(permanent, spot('sump'));
assert.equal(permanent.parts.threads.tollGate, 'open');
permanent = step(permanent, spot('through'));
permanent = step(permanent, spot('through'));
assert.equal(permanent.parts.threads.tollGate, 'shut');

let round = step(begin(withBeat('round')), spot('turn'));
assert.ok(isHeld(round.holds, 'checkpoints') && isHeld(round.holds, 'signs'));
round = step(round, spot('west'));
round = step(round, spot('buggy'), 1, {onFoot: true});
assert.ok(has(round, 'found/lost-buggy'));
round = step(round, spot('buggy'), 9, {onFoot: true, wrench: true});
assert.equal(round.world.scrap, 60);
round = step(round, spot('buggy'), 1, {onFoot: true, wrench: true});
assert.equal(round.world.scrap, 74);
shown = frame(round, spot('rejoin'));
assert.equal(outcome(shown), 'not-seen');
round = step(shown.open);
assert.ok(has(round, 'knows-the-round'));
assert.equal(isHeld(round.holds, 'checkpoints'), false);
let spotted = step(begin(withBeat('round')), spot('turn'));
const look = spot('lookout');
const command = spotted.parts.missions.active.mission;
const mid = command.rule.coneDegrees * Math.PI / 360;
const carInLamp = {x: look.x + Math.sin(look.heading + mid) * 35, z: look.z + Math.cos(look.heading + mid) * 35};
spotted = step(spotted, carInLamp, 7.9, {missionHeightAt: () => 0});
assert.ok(spotted.parts.missions.active.state.sight > 7.89);
shown = frame(spotted, carInLamp, .11, {missionHeightAt: () => 0});
assert.equal(outcome(shown), 'seen');
assert.ok(shown.events.some(row => row.cue === 'open.toll.lookout'));
spotted = step(shown.open, spot('rider'));
assert.equal(record(spotted).beat, 'caught');
spotted = step(spotted, spot('rider'));
spotted = interact(spotted, 'caught', 'pay-double', spot('rider'));
assert.equal(spotted.world.scrap, 44);
assert.ok(has(spotted, 'knows-the-round'));
round = step(begin(withBeat('gate', [marked('found/lost-buggy')])), spot('sump'));
round = interact(round, 'gate', 'tell-sump');
assert.equal(round.world.open.favours['road-rats'], 1);
round = interact(round, 'gate', 'spend-favour');
assert.equal(round.world.open.favours['road-rats'], 0);
assert.ok(has(round, 'free-week'));

const fightWorld = withBeat('break', [{type: 'find', site: TOLL_GATE}]);
let fight = step(begin(fightWorld), gate);
shown = frame(fight, gate, .1, {speedKmh: 49});
assert.ok(!shown.requests.some(row => row.type === 'riders'));
shown = frame(shown.open, gate, .1, {speedKmh: 50});
assert.equal(shown.requests.find(row => row.type === 'riders').vehicles.length, 4);
assert.ok(shown.events.some(row => row.cue === 'open.toll.gate-down'));
const fightId = TOLL_ID + '/break';
const wrecked = index => ({x: 25, z: index, wrecked: true});
shown = frame(shown.open, gate, .1, {road: {id: fightId, cars: [0, 1, 2].map(wrecked)}});
assert.equal(outcome(shown), 'won');
fight = step(shown.open);
assert.equal(record(fight).end, 'broken');
assert.equal(stageOf(fight.world, TOLL_GATE), 'empty');
assert.equal(feudOf(fight.world, 'road-rats'), 'Raiding');
assert.equal(fight.world.scrap, 72);
assert.equal(openMapMarks(fight.world, tollPlace).sites[0].name, "Sump's Gate (broken)");
shown = frame(step(begin(fightWorld)), gate, .1, {combatWrecking: true});
assert.equal(outcome(shown), 'lost');
fight = step(shown.open);
assert.equal(record(fight).beat, 'shut');
assert.equal(fight.world.scrap, 30);
fight = step(fight);
fight = interact(fight, 'shut', 'sorry-bucket');
assert.equal(fight.world.scrap, 0);
assert.ok(has(fight, 'road-taxed'));

let assembly = step(begin(withBeat('hearth')), gate);
const hearth = placeForThread(['tin-town', 'hearth'], {});
assembly = step(assembly, hearth);
assembly = step(assembly, hearth);
assert.equal(record(assembly).beat, 'visits');
assembly = interact(assembly, 'visits', 'ask-dot', hearth, 'openTalkQuestion');
assembly = interact(assembly, 'visits', 'promise-dot', hearth);
assert.ok(has(assembly, 'stands-dot'));
assembly = interact(assembly, 'visits', 'ask-nan', spot('nan'), 'openTalkQuestion');
assert.ok(has(assembly, 'stands-nan'));
assembly = interact(assembly, 'visits', 'send-word', hearth);
assert.equal(record(assembly).beat, 'stand');
assert.equal(step(assembly, gate).parts.missions.active, undefined);
assembly = step(advanceNight(assembly, 8), gate);
assert.equal(assembly.parts.missions.active?.mission.kind, 'squeeze');
const standId = TOLL_ID + '/stand';
const offer = id => ({type: 'talkChoice', scene: standId + '/offer', id: standId + '/' + id});
const startSqueeze = () => step(begin(withBeat('stand', [marked('stands-tin-town'), marked('stands-dot'), marked('stands-nan'),
  {type: 'promise', id: TOLL_ID + '/guard-dot', person: 'dot', dueNights: 6, text: 'You promised Dot to stay.'}])),
  gate, .1, {partOfDay: 'dawn'});
const guardedCart = tollPosition(-4, -36);
let squeeze = startSqueeze();
for (let t = 0; t < 60; t++) squeeze = step(squeeze, guardedCart, 1);
shown = frame(squeeze, guardedCart, .1);
assert.ok(shown.requests.some(row => row.scene?.id === standId + '/offer'));
squeeze = step(shown.open, guardedCart, 1, {jobEvents: [offer('stay')]});
for (let t = 0; t < 118; t++) squeeze = step(squeeze, guardedCart, 1);
shown = frame(squeeze, guardedCart, 1);
assert.equal(outcome(shown), 'held');
squeeze = step(shown.open, spot('sump'));
assert.equal(record(squeeze).beat, 'wage-offer');
assert.equal(squeeze.world.ledger.words.dot, 'Friendly');
assert.equal(squeeze.world.ledger.obligations.length, 0);
squeeze = step(squeeze, spot('sump'));
const refused = interact(squeeze, 'wage-offer', 'no-wage');
const kept = interact(squeeze, 'wage-offer', 'wage');
assert.equal(record(refused).end, 'refused');
assert.equal(record(kept).end, 'kept');
assert.ok(has(refused, 'road-free') && has(kept, 'sump-keeps-the-pass'));
assert.equal(stageOf(refused.world, TOLL_GATE), 'empty');
assert.equal(feudOf(kept.world, 'road-rats'), 'Watching');

squeeze = startSqueeze();
let broken;
for (let t = 0; t < 30 && !broken; t++) {
  shown = frame(squeeze, gate, 1);
  squeeze = shown.open;
  if (outcome(shown)) broken = outcome(shown);
}
assert.equal(broken, 'broke');
squeeze = step(squeeze);
assert.equal(record(squeeze).end, 'closed');
assert.equal(squeeze.world.ledger.words.dot, 'Wary');
assert.equal(squeeze.world.ledger.obligations.length, 0);

shown = frame(startSqueeze(), gate, .1, {missionWeapons: {crossbow: 1}});
assert.equal(outcome(shown), 'shooting-first');
squeeze = step(shown.open, gate);
assert.equal(record(squeeze).beat, 'break');
assert.equal(stagedToll(squeeze.world).beats.break.mission.cars, 6);

squeeze = startSqueeze();
for (let t = 0; t < 60; t++) squeeze = step(squeeze, guardedCart, 1);
squeeze = step(squeeze, guardedCart, 1, {jobEvents: [offer('drive-through')]});
shown = frame(squeeze, spot('through'));
assert.equal(outcome(shown), 'sold');
squeeze = step(shown.open);
assert.equal(record(squeeze).end, 'sold');
assert.ok(has(squeeze, 'promise-broken') && has(squeeze, 'drove-through-alone'));
assert.equal(squeeze.world.ledger.obligations.length, 0);

const squeezeRule = stagedToll(withBeat('stand', [marked('stands-dot'), marked('stands-nan'), marked('stands-walkers'),
  marked('sump-warned')])).beats.stand.mission;
const route = prepareThreadMission(squeezeRule, tollPlace);
assert.equal(MISSION_KINDS.squeeze.begin(squeezeRule, route, {}).state.riders.length, 4);
assert.equal(squeezeRule.rule.holdSeconds - (squeezeRule.rule.standing - 3) * squeezeRule.rule.lessForEachBeyondThree, 150);
for (const name of Object.keys(pageFunctions)) assert.doesNotThrow(() => new Function(pageSource(name)));
console.log('Open Mall Road Toll tests passed: sight, all endings, timing, promises, and browser expressions.');
