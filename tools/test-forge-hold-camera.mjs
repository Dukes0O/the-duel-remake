import assert from 'node:assert/strict';
import {forgeHoldView, townEndingView, TOWN_ENDING_VIEW} from '../src/world-job-camera.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {brandThiefPose, BRAND_RULE} from '../src/world/jobs/brand-rule.js';
import {SCABLANDS_SOLIDS} from '../src/world/scablands-solids.js';
import {raiseCameraOutOfSolids} from '../src/camera-clearance.js';
import {FORGE, forgePlan} from '../src/world/forge-look.js';
import {LAND} from '../src/world/scablands-names.js';

const plan = forgePlan(), ground = (x, z) => x * .01 + z * .02;
const car = {x: plan.hearth.x, z: plan.hearth.z + 12};
const view = forgeHoldView(car, plan, ground);
// Claude's numbers after the first hand drive of the hold (16 November 2026): nearer and lower, aimed nearer the hearth.
assert.equal(view.position.x, car.x + 4);
assert.equal(view.position.z, car.z + 7);
assert.equal(view.position.y, ground(view.position.x, view.position.z) + 3.6);
assert.equal(view.target.x, car.x);
assert.equal(view.target.z, car.z - 8);
assert.equal(view.target.y, ground(view.target.x, view.target.z) + 3);
const centre = LAND.at('tin-town', 25, 14);
for (let radius = 0; radius <= 8; radius += .25) for (let i = 0; i < 360; i++) {
  const a = i * Math.PI / 180;
  const point = {x: centre.x + radius * Math.cos(a), z: centre.z + radius * Math.sin(a)};
  const camera = forgeHoldView(point, plan, () => 0).position;
  const dx = camera.x - plan.hearth.x, dz = camera.z - plan.hearth.z;
  const t = Math.max(0, Math.min(1, ((plan.tower.x - plan.hearth.x) * dx + (plan.tower.z - plan.hearth.z) * dz) / (dx * dx + dz * dz)));
  const distance = Math.hypot(plan.tower.x - plan.hearth.x - t * dx, plan.tower.z - plan.hearth.z - t * dz);
  assert.ok(distance > FORGE.tower.half * Math.SQRT2, `tower blocks view at radius ${radius}, angle ${i}`);
}
const inside = {x: 1, y: 2, z: 2};
raiseCameraOutOfSolids(inside, [{x: 1, y: 0, z: 2, halfX: 1, halfZ: 1, height: 5, heading: 0}]);
assert.equal(inside.y, 5.3, 'the camera rises out of a solid');
const clear = {x: 4, y: 2, z: 2};
raiseCameraOutOfSolids(clear, [{x: 1, y: 0, z: 2, halfX: 1, halfZ: 1, height: 5, heading: 0}]);
assert.equal(clear.y, 2, 'clear camera positions stay unchanged');
console.log('Forge hold camera geometry and solid clearance passed.');

// Job 2's ending is seen from over the town (Claude's hand play of 17 November ended facing a fence). The view stands 62 m
// beyond the middle of the hearth and the gate, on the side away from the far lamp, 24 m up; every lamp, the hearth and
// the gate lie in front of it within a cone of 40 degrees either side; it stands in no solid; and once the thief runs it
// turns to him within 1.2 seconds.
{
  const step = EVERBURN_JOBS[1].steps[0], flat = () => 0, at = place => place.position ?? place;
  const view = townEndingView(step, flat);
  const hearth = at(step.hearth), gate = at(step.theftPath.at(-1));
  const mid = {x: (hearth.x + gate.x) / 2, z: (hearth.z + gate.z) / 2};
  assert.ok(Math.abs(Math.hypot(view.position.x - mid.x, view.position.z - mid.z) - TOWN_ENDING_VIEW.backMetres) < 1e-9);
  assert.equal(view.position.y, TOWN_ENDING_VIEW.upMetres);
  assert.deepEqual(view.target, {x: mid.x, y: TOWN_ENDING_VIEW.lookUpMetres, z: mid.z});
  const forward = {x: mid.x - view.position.x, z: mid.z - view.position.z}, length = Math.hypot(forward.x, forward.z);
  for (const place of [...step.places, step.hearth, step.theftPath.at(-1)]) {
    const p = at(place), dx = p.x - view.position.x, dz = p.z - view.position.z, away = Math.hypot(dx, dz);
    const angle = Math.acos((dx * forward.x + dz * forward.z) / (away * length)) * 180 / Math.PI;
    assert.ok(angle < 40, `${place.id} is within 40 degrees of the middle of the view (${angle.toFixed(1)})`);
  }
  assert.ok(!SCABLANDS_SOLIDS.some(solid => { const cos = Math.cos(solid.heading), sin = Math.sin(solid.heading), dx = view.position.x - solid.x, dz = view.position.z - solid.z;
    return Math.abs(dx * cos - dz * sin) <= solid.halfX + 1 && Math.abs(dx * sin + dz * cos) <= solid.halfZ + 1 && solid.height > 20; }), 'nothing 20 m tall stands where the view stands');
  const running = {theftStarted: true, endingElapsed: BRAND_RULE.theftAtSeconds + 2};
  const thief = brandThiefPose(step, running);
  assert.ok(thief, 'the thief is running two seconds after the theft');
  const early = townEndingView(step, flat, thief, 0), turned = townEndingView(step, flat, thief, TOWN_ENDING_VIEW.followSeconds);
  assert.deepEqual(early.target, view.target, 'the view has not turned at the moment of the theft');
  assert.ok(Math.abs(turned.target.x - thief.x) < 1e-9 && Math.abs(turned.target.z - thief.z) < 1e-9, 'the view is on the thief 1.2 seconds later');
  assert.deepEqual(turned.position, view.position, 'the view does not move, it turns');
}
