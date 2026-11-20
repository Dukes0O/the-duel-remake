import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {bowlHudView, sayBowlLine} from '../src/bowl/bowl-night.js';
import {bowlHealth, bowlHealthHit, bowlResultReady, bowlStrip, bowlTrickPopup, playBowlHudCue} from '../src/bowl/bowl-hud.js';
import {rearViewActive} from '../src/rear-view.js';

const duel = new Duel({seed: 1989});
duel.featureFlags = {enabled: name => name === 'titan-bowl'};
const captions = [];
duel.onChange((_, event) => { if (event.bowlCaption) captions.push(event.bowlCaption.id); });

function start(night, eventIndex, options = {}) {
  captions.length = 0;
  assert.ok(duel.startBowlNight({night, eventIndex, cpuDifficulty: 'easy', ...options}));
  return duel.state.bowlNight;
}

for (const [night, index, name, goal] of [
  [1, 0, 'Car Crush', 'Crush through 3 rows.'],
  [1, 1, 'Freestyle', 'Beat Old Bess: 310.'],
  [1, 2, 'Side by Side', 'Beat Old Bess over two laps.'],
  [3, 2, 'Last Truck Rolling', 'Be the last truck rolling.'],
  [5, 3, 'The Scrapasaurus', 'WATCH THE SCRAPASAURUS'],
]) {
  start(night, index);
  const strip = bowlStrip(duel.state, bowlHudView(duel.state, duel.course));
  assert.equal(strip.name, name);
  assert.equal(strip.goal, goal);
  assert.ok(strip.goal.split(/\s+/).length <= (name === 'The Scrapasaurus' ? 5 : 8));
  assert.equal(strip.points, '0 points');
  assert.equal(strip.crowdLabel, 'CROWD x1.0');
  assert.match(strip.time, /^\d+:\d{2}$/, 'every current Bowl event has a visible clock');
  assert.equal(captions.length, 1, 'one caption starts an event');
  assert.equal(rearViewActive(duel.state, duel.course), false, 'the Bowl skips the rear-view render pass');
}

{
  const night = start(1, 0);
  assert.deepEqual(captions, ['event.carCrush.intro'], 'the opening and loan lines stay on the opening card');
  sayBowlLine(duel, 'rex.tell');
  sayBowlLine(duel, 'rex.rest');
  sayBowlLine(duel, 'rex.scorch');
  while (night.clock < 13) duel.step(1 / 60);
  assert.deepEqual(captions, ['event.carCrush.intro', 'rex.tell', 'event.lost.carCrush'],
    'stale queued lines never play, and the fresh idle-run result still plays');
}

{
  start(1, 0, {turn: {driver: 'Gratian'}});
  assert.deepEqual(captions, ['turn.open'], 'the next driver hears one welcome');
  const night = duel.state.bowlNight;
  Object.assign(night.event, {count: 7, chain: 3});
  const view = {...bowlHudView(duel.state, duel.course), target: 10, crowd: 40};
  const strip = bowlStrip(duel.state, view);
  assert.equal(strip.crushLabel, 'CRUSHED 7 OF 10');
  assert.equal(strip.chainLabel, 'CHAIN x3');
  assert.equal(strip.crowdLabel, 'CROWD x1.4');
}

{
  const actor = {armor: 50, maxArmor: 60, damageZones: {front: 1, right: 0, rear: 2.5, left: 0}};
  const before = bowlHealth(actor);
  assert.deepEqual(before.segments.map(segment => Number(segment.toFixed(2))), [1, 1, 1, 1, .17]);
  assert.deepEqual(before.zones, {front: .8, right: 1, rear: .5, left: 1});
  assert.equal(before.danger, false);
  actor.armor = 12;
  actor.damageZones.front = 4.5;
  const after = bowlHealth(actor);
  assert.deepEqual(after.segments, [1, 0, 0, 0, 0]);
  assert.equal(after.danger, true);
  assert.deepEqual(bowlHealthHit(before, after), {zone: 'front', lost: 38});
  assert.equal(bowlHealthHit(after, before), null);
  const scorched = bowlHealth(actor, {value: 4, max: 5});
  assert.deepEqual(bowlHealthHit(bowlHealth(actor, {value: 5, max: 5}), scorched), {zone: null, lost: 1});
}

{
  const record = {kind: 'backflip', turns: 2, base: 200, multiplier: 1.4, points: 280, fresh: true, at: 4};
  assert.deepEqual(bowlTrickPopup(record, 5.49), {name: 'DOUBLE BACKFLIP', points: '200 x1.4 = 280', fresh: true});
  assert.equal(bowlTrickPopup({...record, multiplier: 1.44, points: 288}, 4).points, '200 x1.44 = 288');
  assert.equal(bowlTrickPopup({...record, multiplier: 1.436, points: 287}, 4).points, '200 x1.44 ≈ 287');
  assert.equal(bowlTrickPopup(record, 5.5), null);
  const state = {bowlNight: {event: {trickPopups: [record]}, clock: 5.49}};
  const view = {event: 'freestyle', target: 310, crowd: 83, score: 280};
  assert.equal(bowlStrip(state, view).crowdLabel, 'CROWD x1.4');
  assert.equal(bowlStrip(state, view).crowd, 40);
  state.bowlNight.clock = 5.5;
  assert.equal(bowlStrip(state, view).crowdLabel, 'CROWD x1.8');
  assert.equal(bowlResultReady({clock: 11.99, resultAt: 10, lastResult: {won: true, event: 'freestyle'}}), false);
  assert.equal(bowlResultReady({clock: 12, resultAt: 10, lastResult: {won: true, event: 'freestyle'}}), true);
  assert.equal(bowlResultReady({clock: 19.99, resultAt: 10, lastResult: {won: true, event: 'scrapasaurus'}}), false);
  assert.equal(bowlResultReady({clock: 20, resultAt: 10, lastResult: {won: true, event: 'scrapasaurus'}}), true);
}

{
  start(1, 2);
  const state = duel.state, rival = state.opponents[0];
  const strip = () => bowlStrip(state, bowlHudView(state, duel.course));
  assert.equal(strip().gapLabel, 'LEVEL 0 m');
  state.s += 17;
  assert.equal(strip().gapLabel, 'AHEAD 17 m');
  rival.s += 23;
  assert.equal(strip().gapLabel, 'BEHIND 6 m');
}

{
  const night = start(1, 1);
  const state = duel.state;
  state.status = 'racing';
  duel.emit({bowlTrick: {kind: 'backflip', turns: 2, points: 200, fresh: true, landing: 'clean'}});
  assert.deepEqual(night.trickKinds, ['backflip']);
  assert.equal(night.event.trickPopups[0].points, night.event.score);
  assert.equal(bowlTrickPopup(night.event.trickPopups[0], night.clock).fresh, true);
  assert.equal(rearViewActive({status: 'racing'}, duel.course), true, 'a course alone does not disable the rear view');
}

{
  const night = start(5, 3);
  duel.state.status = 'racing';
  for (const phase of ['lift', 'throw']) {
    night.event.rex.phase = phase;
    const view = bowlHudView(duel.state, duel.course);
    assert.equal(bowlStrip(duel.state, view).goal, 'Dodge the thrown car.');
  }
  night.clock = 8;
  duel.emit({bowlRex: {type: 'fall'}});
  assert.equal(night.event.resultHoldSince, 8);
  const result = {...night, resultAt: 11, lastResult: {won: true, event: 'scrapasaurus'}};
  assert.equal(bowlResultReady({...result, clock: 17.99}), false);
  assert.equal(bowlResultReady({...result, clock: 18}), true, 'the wait starts when the Rex falls');
}

{
  const calls = [], output = {};
  const audio = {paused: true, muted: false, output, context: {state: 'running'}, _playCue: (...args) => calls.push(args)};
  playBowlHudCue({audio}, 'bowl.card.open');
  assert.deepEqual(calls, [['interface.radar', {destination: output, scale: .42}]]);
  audio.muted = true;
  playBowlHudCue({audio}, 'bowl.card.open');
  assert.equal(calls.length, 1, 'the paused cue still respects mute');
}

console.log('Bowl HUD goals, caption timing, trick results, damage and result timing passed.');
