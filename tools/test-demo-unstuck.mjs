// DEMO-DRIVER-UNSTUCK: the scripted demo driver finishes the Hard no-weapon races that used to leave it boxed in
// off the road (seeds from the FIX-LAUNCH balance run). Seeds are the card's; none may be dropped.
import assert from 'node:assert/strict';
import test from 'node:test';
import { run } from './combat-balance.mjs';

for (const seed of [1993, 1999, 2001, 2004, 2015]) {
  test(`Hard no-weapon race, seed ${seed}, completes`, () => {
    const race = run('none', 'hard', seed);
    assert.equal(race.completed, true, `seed ${seed}: ${race.status} at s ${race.unfinished?.s?.toFixed(0)}, ${race.unfinished?.lateral?.toFixed(0)} m off`);
  });
}
