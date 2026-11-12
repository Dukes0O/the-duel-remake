import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {SCABLANDS_SOLIDS} from '../src/world/scablands-scene.js';
import {scablandsRoadDistance} from '../src/world/scablands-ground.js';
import '../src/story/ember-lines.js';

function start(job) {
  const duel = new Duel({seed: 1, featureFlags: {'hidden-road': true, arsenal: true}});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:1, opponents:[], job}), true);
  return duel;
}
const duel = start(EVERBURN_JOBS[5]);
const state = duel.state, at = duel.course.worldAt(state.s, state.lateral);
const target = EVERBURN_JOBS[5].steps[0].place.position;
assert.ok(Math.abs(Math.hypot(at.x-target.x, at.z-target.z)-30)<0.01, 'start is 30 m from the derrick');
assert.ok(scablandsRoadDistance(at.x, at.z)<36, 'start is on the approach road');
const heading = duel.course.at(state.s).heading + state.headingError;
assert.ok(Math.cos(heading-Math.atan2(target.x-at.x,target.z-at.z))>.999, 'car faces the derrick');
for (const solid of SCABLANDS_SOLIDS.filter(s => s.placeId === 'everburn')) {
  const [x,,z]=solid.center, [hx,,hz]=solid.collision.halfExtents;
  assert.ok(Math.abs(at.x-x)>hx+3 || Math.abs(at.z-z)>hz+3, `car clears ${solid.id}`);
}
state.countdown=0; duel.step(1/60); duel.step(1/60);
assert.equal(state.callout, '', 'unknown opening id is not shown');
const named = {...EVERBURN_JOBS[5], steps:[{...EVERBURN_JOBS[5].steps[0], startLineId:'story.ember.moss.1'}]};
const other = start(named); other.state.countdown=0; other.step(1/60); other.step(1/60);
assert.match(other.state.callout, /^Big Bess.s driver, Moss: /, 'registered opening shows its words');
console.log('test-everburn-screens-start: 8 checks passed');

