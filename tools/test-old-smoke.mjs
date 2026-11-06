import assert from 'node:assert/strict';
import {OLD_SMOKE, oldSmokeGlowingVent, oldSmokeVentTargets} from '../src/world/jobs/old-smoke.js';
import {stepChase} from '../src/world/jobs/steps/chase.js';
import {worldJobHitTargets} from '../src/arena/modes/world-job.js';

assert.equal(oldSmokeGlowingVent(0), 0);
assert.equal(oldSmokeGlowingVent(OLD_SMOKE.glowSeconds - 1e-6), 0);
assert.equal(oldSmokeGlowingVent(OLD_SMOKE.glowSeconds), 1);
assert.equal(oldSmokeGlowingVent(OLD_SMOKE.glowSeconds * 2), 2);
assert.equal(oldSmokeGlowingVent(OLD_SMOKE.glowSeconds * 3), 0,
  'the cycle repeats deterministically after all three vents');

const actor = {id: 'old-smoke-furnace', position: {x: 12, y: 0, z: -6}};
const targets = oldSmokeVentTargets(actor, OLD_SMOKE.glowSeconds);
assert.equal(targets.length, 3);
assert.deepEqual(targets.map(target => target.damage), [0, 1, 0],
  'only the vent that is glowing accepts damage');
assert.deepEqual(targets.map(target => target.glowing), [false, true, false]);
assert.deepEqual(targets.map(target => target.position), [
  {x: 11, y: 1, z: -6}, {x: 12, y: 1, z: -6}, {x: 13, y: 1, z: -6},
]);
const worldJob = {job: {steps: [{targetId: actor.id}], stepIndex: 0},
  actors: [{...actor, health: 3, startedAtSec: 0}], clockSec: OLD_SMOKE.glowSeconds,
  hitTargets: []};
const liveTargets = worldJobHitTargets({state: {arena: {mode: 'world-job', worldJob}}});
assert.deepEqual(liveTargets.filter(target => target.kind === 'furnace-vent').map(target => target.damage),
  [0, 1, 0], 'the world-job combat hook exposes only its active vent as damageable');

let health = 3;
let hits = 0;
const chaseStep = {targetId: actor.id, path: [], targetSpeed: 14, leashDistance: 180,
  contactRadius: 10};
for (let elapsed = 0; elapsed < OLD_SMOKE.glowSeconds * 3; elapsed += OLD_SMOKE.glowSeconds) {
  const phaseTargets = oldSmokeVentTargets(actor, elapsed);
  const active = phaseTargets.find(target => target.glowing);
  assert(active, 'one vent glows during every phase');
  const beforeInactiveHits = health;
  for (const target of phaseTargets.filter(item => !item.glowing)) health -= target.damage;
  assert.equal(health, beforeInactiveHits, 'hits on dark vents do not damage the furnace');
  health -= active.damage;
  hits++;
  const chase = stepChase(chaseStep, {}, {actors: [{id: actor.id, health,
    position: actor.position}], player: {position: {x: 0, y: 0, z: 0}}});
  assert.equal(chase.complete, health === 0,
    'the chase ends on the third valid hit and not before');
}
assert.equal(hits, 3, 'three correctly timed vent hits finish the furnace');
console.log('Old Smoke: deterministic three-vent chase rules passed');
