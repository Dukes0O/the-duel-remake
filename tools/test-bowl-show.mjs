import assert from 'node:assert/strict';
import {SHOW_NIGHTS, createShowNight, crowdAfter, finishShowEvent, scoreFreestyle, scoreStuntEvent, landingPoints, trickVariety} from '../src/bowl/bowl-show.js';

let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };

const scripted = Object.freeze([
  Object.freeze({type: 'landedJump', atSeconds: 1, durationSeconds: 1.5, distanceMeters: 24}),
  Object.freeze({type: 'crush', atSeconds: 3}),
  Object.freeze({type: 'carLaunch', atSeconds: 5, durationSeconds: 2, distanceMeters: 38}),
  Object.freeze({type: 'bowlTrick', kind: 'donut', atSeconds: 9, points: 15, fresh: true}),
  Object.freeze({type: 'bowlTrick', kind: 'backflip', atSeconds: 13, points: 50, fresh: true}),
  Object.freeze({type: 'crowdTick', atSeconds: 17, seconds: 5}),
]);

function replayAt(frameRate) {
  let next = 0;
  const delivered = [];
  const frameCount = Math.ceil(22 * frameRate);
  for (let frame = 0; frame <= frameCount; frame++) {
    const now = frame / frameRate;
    while (next < scripted.length && scripted[next].atSeconds <= now) delivered.push(scripted[next++]);
  }
  return scoreFreestyle(delivered);
}

const runs = [30, 60, 144].map(replayAt);
check(runs.every(run => run.score > 0), 'scripted stunt events produce a score');
check(runs.every(run => run.score === runs[0].score && run.crowd === runs[0].crowd), 'the same event timeline scores identically at 30, 60 and 144 frames');
check(runs[0].events.length === scripted.length, 'the scored event log retains each delivered event');
check(scripted[0].distanceMeters === 24, 'scoring does not mutate source events');

const equalJump = {durationSeconds: 2, distanceMeters: 30};
check(scoreStuntEvent({type: 'carLaunch', ...equalJump}).points > scoreStuntEvent({type: 'landedJump', ...equalJump}).points, 'launching off a car outscores an equal ramp jump');
const trick = {type: 'bowlTrick', kind: 'backflip', points: 50};
check(scoreStuntEvent({...trick, fresh: true}).points === 75, 'first of a kind pays 1.5 times');
check(scoreStuntEvent({...trick, repeat: .8}).points === 40, 'a repeat pays four fifths');
check(scoreStuntEvent({...trick, repeat: .4}).points === 20, 'repeat floor pays two fifths');
check(scoreStuntEvent({...trick, landing: 'slam'}, 90).crowd === 60, 'a Slam costs a third of the crowd');
check([1, 2, 3].every((turns, i) => landingPoints('backflip', turns, 1, 'clean') === [50, 200, 450][i]), 'one, two and three flips pay their squared turn count');
check([1, 2, 3, 4].every(combo => landingPoints('spin', 1, combo, 'clean') === 30 * (combo + 1) / 2), 'each extra kind raises the whole combo multiplier by half');
const history = {seen: new Set(), repeat: 1};
check(trickVariety(history, 'spin').fresh && trickVariety(history, 'spin').repeat === .8, 'first spin is new and its repeat fades');
for (let i = 0; i < 8; i++) trickVariety(history, 'spin');
check(history.repeat === .4, 'a run of spins reaches the floor');
trickVariety(history, 'backflip');
const spin = trickVariety(history, 'spin');
check(!spin.fresh && spin.repeat === 1, 'another kind resets the repeat but never awards NEW twice');
const highCrowd = scoreStuntEvent({type: 'crush'}, 75);
check(highCrowd.points > scoreStuntEvent({type: 'crush'}, 0).points, 'a higher crowd meter increases event score');
check(crowdAfter(highCrowd.crowd, 10) < highCrowd.crowd, 'crowd meter falls during a quiet interval');

check(SHOW_NIGHTS.length === 5, 'the show has five nights');
const expected = [
  ['Rookie Night', ['carCrush', 'freestyle', 'sideBySide']],
  ['Flip Night', ['longJump', 'freestyle', 'sideBySide']],
  ['Hammer Night', ['carCrush', 'freestyle', 'lastTruckRolling']],
  ['Over the Wall Night', ['highJump', 'homeRun', 'lastTruckRolling']],
  ['Scrapasaurus Night', ['freestyle', 'lastTruckRolling', 'scrapasaurus']],
];
assert.deepEqual(SHOW_NIGHTS.map(({name, events}) => [name, events]), expected);
check(new Set(SHOW_NIGHTS.map(night => night.events.join('|'))).size === 5, 'each night has a different line-up');
check(new Set(SHOW_NIGHTS.map(night => night.colours.jets)).size === 5, 'the five nights have different flame colours');
check(new Set(SHOW_NIGHTS.map(night => night.colours.banner)).size === 5, 'the five nights have different banner colours');
for (const [index, [name, events]] of expected.entries()) {
  let state = createShowNight(index + 1);
  let result = finishShowEvent(state, events[1], true);
  check(!result.accepted && result.state.eventIndex === 0, name + ' rejects an event out of order');
  result = finishShowEvent(state, events[0], false);
  check(result.accepted && result.retry && result.state.eventIndex === 0 && !result.state.complete, name + ' retries a loss');
  for (const event of events) {
    result = finishShowEvent(state, event, true);
    check(result.accepted, name + ' accepts ' + event + ' in order');
    state = result.state;
  }
  check(state.complete && state.eventIndex === 2, name + ' ends after all three events');
  check(!finishShowEvent(state, events[2], true).accepted, name + ' cannot score after it ends');
}

console.log(`Bowl Show: ${checks} event scoring, crowd, frame-rate and night progression checks passed.`);
console.log(JSON.stringify({score: runs[0].score, crowd: runs[0].crowd, fps: [30, 60, 144]}));
