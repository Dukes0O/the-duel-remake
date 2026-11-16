import assert from 'node:assert/strict';
import {forgeHoldView} from '../src/world-job-camera.js';
import {raiseCameraOutOfSolids} from '../src/camera-clearance.js';
import {FORGE, forgePlan} from '../src/world/forge-look.js';
import {LAND} from '../src/world/scablands-names.js';

const plan = forgePlan(), ground = (x, z) => x * .01 + z * .02;
const car = {x: plan.hearth.x, z: plan.hearth.z + 12};
const view = forgeHoldView(car, plan, ground);
assert.equal(view.position.x, car.x + 5);
assert.equal(view.position.z, car.z + 10);
assert.equal(view.position.y, ground(view.position.x, view.position.z) + 4.5);
assert.equal(view.target.x, car.x);
assert.equal(view.target.z, car.z - 6);
assert.equal(view.target.y, ground(view.target.x, view.target.z) + 4);
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
