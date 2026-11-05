import assert from 'node:assert/strict';
import {BOWL_EVENTS, SHOW_NIGHTS, createShowNight, crowdAfter, finishShowEvent, scoreFreestyle, scoreStuntEvent} from '../src/bowl/bowl-show.js';

let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };

const scripted = Object.freeze([
  Object.freeze({type: 'landedJump', atSeconds: 1, durationSeconds: 1.5, distanceMeters: 24}),
  Object.freeze({type: 'crush', atSeconds: 3}),
  Object.freeze({type: 'carLaunch', atSeconds: 5, durationSeconds: 2, distanceMeters: 38}),
  Object.freeze({type: 'donut', atSeconds: 9, seconds: 2}),
  Object.freeze({type: 'flip', atSeconds: 13, pitchTurns: 1}),
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
check(scoreStuntEvent({type: 'flip', pitchTurns: 0.9}).points === 0 && scoreStuntEvent({type: 'flip', pitchTurns: 1}).points > 0, 'only a landed full pitch turn scores a flip');
check(scoreStuntEvent({type: 'donut', seconds: 2}).points > 0, 'a completed on-the-spot donut scores');
const highCrowd = scoreStuntEvent({type: 'crush'}, 75);
check(highCrowd.points > scoreStuntEvent({type: 'crush'}, 0).points, 'a higher crowd meter increases event score');
check(crowdAfter(highCrowd.crowd, 10) < highCrowd.crowd, 'crowd meter falls during a quiet interval');

check(SHOW_NIGHTS.length === 5, 'the show has five nights');
check(SHOW_NIGHTS[0].events[2] === BOWL_EVENTS.SIDE_BY_SIDE && SHOW_NIGHTS[2].events[2] === BOWL_EVENTS.LAST_TRUCK_ROLLING, 'Last Truck Rolling starts on night three');
let state = createShowNight(1);
let result = finishShowEvent(state, BOWL_EVENTS.FREESTYLE, true);
check(!result.accepted && result.state.eventIndex === 0, 'a night rejects events out of order');
result = finishShowEvent(state, BOWL_EVENTS.CAR_CRUSH, false);
check(result.accepted && result.retry && result.state.eventIndex === 0 && !result.state.complete, 'losing lets the player retry the same event');
state = finishShowEvent(state, BOWL_EVENTS.CAR_CRUSH, true).state;
state = finishShowEvent(state, BOWL_EVENTS.FREESTYLE, true).state;
state = finishShowEvent(state, BOWL_EVENTS.SIDE_BY_SIDE, true).state;
check(state.complete && state.eventIndex === 2, 'winning each ordered event completes the night');
check(!finishShowEvent(state, BOWL_EVENTS.SIDE_BY_SIDE, true).accepted, 'a completed night cannot score another event');

console.log(`Bowl Show: ${checks} event scoring, crowd, frame-rate and night progression checks passed.`);
console.log(JSON.stringify({score: runs[0].score, crowd: runs[0].crowd, fps: [30, 60, 144]}));
