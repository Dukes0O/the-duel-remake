import assert from 'node:assert/strict';
import {borerApprenticeControls, borerCutLesson, createBorerState, stepBorer} from '../src/machines/borer.js';

// A long face with a level landing. The ground accepts spoil without changing
// the face, so each script measures the same rock and the same daylight.
function ground() {
  return {
    heightAt:(x, z) => Math.abs(x) < 10 && z >= 6 && z < 125 ? 8 : 0,
    refusal:() => null,
    cut:(_shape, _height, _depth, {length}) => ({ok:true, volume:length, volumes:{rock:length}}),
    fill:() => ({ok:true}),
  };
}
function cut({thrust = 1/3, slope = 0, stalls = 0} = {}) {
  const land = ground();
  let state = createBorerState();
  for (let i = 0; i < stalls; i++) {
    state = stepBorer(state, {thrust:1}, land, 'rock', 2).state;
    assert.equal(state.stalled, true);
    state = stepBorer(state, {}, land, 'rock', 1).state;
    assert.equal(state.stalled, false);
  }
  if (slope) state = stepBorer(state, {thrust, slope}, land, 'rock', 1).state;
  state = stepBorer(state, {thrust}, land, 'rock', 800).state;
  return state;
}
const clean = cut();
assert.equal(clean.reachedDaylight, true);
assert.ok(clean.distanceM >= 100);
assert.ok(clean.cuttingSeconds > 0);
assert.deepEqual(borerCutLesson(clean), {errorM:0, stallsPer100M:0, pace:1});
const stalled = cut({stalls:2});
assert.equal(stalled.stallCount, 2);
assert.ok(Math.abs(borerCutLesson(stalled).stallsPer100M - 200 / stalled.distanceM) < 1e-9);
const crooked = cut({slope:1});
assert.ok(borerCutLesson(crooked).errorM > 0.1);
const slow = cut({thrust:1/6});
assert.ok(Math.abs(borerCutLesson(slow).pace - 0.5) < 1e-9);
assert.equal(borerCutLesson({...clean, distanceM:99}), null);
assert.equal(borerCutLesson({...clean, reachedDaylight:false}), null);
console.log('Borer lessons: clean, stalled, off level and slow cuts passed.');

// The apprentice uses the cutter's real lever and head controls. The controls
// do not need ground samples, and the real step still decides what is cut.
for (const pace of [.8, 1]) {
  const land = ground(), order = {grade:.01, metres:100};
  const apprentice = {rate:pace, errorM:.5};
  let state = createBorerState();
  for (let i = 0; i < 600; i++) {
    const hands = borerApprenticeControls(state, order, apprentice, 1/60);
    state = stepBorer(state, hands, land, 'rock', 1/60).state;
  }
  assert.ok(Math.abs(state.distanceM - 5 * pace) < 1e-6);
  assert.ok(Math.abs(Math.tan(state.slope) - .015) < 1e-6);
  assert.equal(state.stalled, false);
}
const releaseHands = borerApprenticeControls({...createBorerState(), stalled:true},
  {grade:0, metres:100}, {rate:1, errorM:0}, 1/60);
assert.equal(releaseHands.thrust, 0);
console.log('Borer apprentice hands: taught pace, grade and stall release passed.');
