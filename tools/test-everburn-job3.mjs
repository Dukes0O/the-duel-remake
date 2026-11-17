import assert from 'node:assert/strict';
import {BELLOWS_RULE, BELLOWS_LINES, bellowsPay, bellowsSentence,
  stepBellowsLoad, bellowsAshBox, stepBellowsAsh, bellowsThiefSpeedKmh,
  bellowsBlockingSide} from '../src/world/jobs/bellows-rule.js';

// Job 3.2: speed, attempted passes and each sack's six-second road-width box.
assert.equal(bellowsThiefSpeedKmh(200, false), 195);
assert.equal(bellowsThiefSpeedKmh(130, false), 125);
assert.equal(bellowsThiefSpeedKmh(200, true), 60);
for (const [along, side, expected] of [
  [-30, -2, -1], [-30, 2, 1], [-30.01, 2, 0], [0, 2, 1], [0.01, 2, 0], [-5, 0, 0],
]) assert.equal(bellowsBlockingSide(along, side), expected);
const cloud = Object.freeze(bellowsAshBox('first', {x: 10, z: 20, heading: 0.7}, 12));
assert.deepEqual(cloud, {id: 'first', x: 10, z: 20, yaw: 0.7,
  length: 30, width: 12, remaining: 6});
const aged = stepBellowsAsh([cloud], 5);
assert.equal(aged[0].remaining, 1);
assert.equal(cloud.remaining, 6);
assert.deepEqual(stepBellowsAsh(aged, 1), []);
console.log('PASS Run Him Down: road speed, passing side and ash box lifetime.');

// Job 3.3 and 3.6: snapshots of contacts and loads, never a driving script.
const tick = (state = {}, facts = {}, dt = 0) => stepBellowsLoad(state, facts, dt);
assert.equal(tick().state.bellows, 100);
assert.equal(tick({}, {}, 10).state.bellows, 100);
const scorched = tick({}, {flameContact: true}, 2);
assert.equal(scorched.state.bellows, 70);
assert.deepEqual(scorched.events, [{type: 'say', lineId: 'bellows.warning'}]);
assert.equal(tick(scorched.state, {flameContact: true}, 10).state.bellows, 0);
assert.equal(tick(scorched.state, {flameContact: true}, 1).events.length, 0);
assert.equal(tick({}, {behindMetres: 100}).events[0].lineId, 'bellows.warning');
assert.equal(tick({}, {behindMetres: 100.01}).events.length, 0);
assert.equal(tick({}, {behindMetres: -1}).events.length, 0);
assert.equal(BELLOWS_LINES.warning, 'Cinder: Not the flamethrower! Leather burns.');

const hard = {carContact: true, carGapMetres: 3, meetingKmh: 20};
assert.equal(tick({}, {...hard, meetingKmh: 19.99}).state.knocks, 0);
let state = tick({}, hard).state;
assert.equal(state.knocks, 1);
assert.equal(tick(state, hard, 10).state.knocks, 1);
state = tick(state, {carGapMetres: 8}).state;
assert.equal(tick(state, hard).state.knocks, 1, 'Eight metres still holds the meeting.');
state = tick(state, {carGapMetres: 8.01}).state;
state = tick(state, hard).state;
assert.equal(state.knocks, 2);
state = tick(state, {carGapMetres: 9}).state;
const stopped = tick(state, hard);
assert.equal(stopped.state.knocks, BELLOWS_RULE.stopKnocks);
assert.equal(stopped.state.thiefStopped, true);
assert.equal(stopped.events.at(-1).type, 'thiefStopped');
assert.deepEqual(tick(stopped.state, {flameContact: true}, 9).state, stopped.state);
const soft = tick({}, {...hard, meetingKmh: 1}).state;
assert.equal(tick(soft, hard).state.knocks, 0, 'A soft touch must separate before a new knock.');
const wall = {solidContact: true, solidImpactKmh: 20};
state = tick({}, wall).state;
assert.equal(state.knocks, 1);
assert.equal(tick(state, wall).state.knocks, 1);
state = tick(state, {}).state;
assert.equal(tick(state, wall).state.knocks, 2);
assert.equal(tick({}, {...hard, ...wall}).state.knocks, 1);
assert.equal(tick({}, {...wall, solidImpactKmh: 19.99}).state.knocks, 0);
for (const [condition, pay, sentence] of [
  [100, 120, 'The bellows came back whole.'], [80, 120, 'The bellows came back whole.'],
  [79.99, 80, 'The bellows will patch.'], [40, 80, 'The bellows will patch.'],
  [39.99, 50, 'The bellows are scorched.'], [0, 50, 'The bellows are scorched.'],
]) {
  assert.equal(bellowsPay(condition), pay);
  assert.equal(bellowsSentence(condition), sentence);
}
const before = Object.freeze({bellows: 90, knocks: 1});
assert.deepEqual(tick(before, hard), tick(before, hard));
assert.deepEqual(before, {bellows: 90, knocks: 1});
console.log('PASS Run Him Down: load, warning, separate meetings, three knocks and result boundaries.');
