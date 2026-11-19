import assert from 'node:assert/strict';
import {forgeHoldView, townEndingMiddle, townEndingView, townThiefStand, townEveningAmount, TOWN_ENDING_VIEW} from '../src/world-job-camera.js';
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

// Job 2's ending is seen from over the town (Claude's hand play of 17 November ended facing a fence). The view stands 72 m
// from the middle of the three lamps, the hearth and the gate, 20 m up; every lamp, the hearth and the gate lie in front
// of it within a cone of 40 degrees either side; and it stands in no solid. (Changed with the third lamp's move to the
// radio mast: the view was 62 m beyond the middle of the hearth and the gate, on the side away from the far lamp, which
// with the new places left the pump lamp behind it.)
{
  const step = EVERBURN_JOBS[1].steps[0], flat = () => 0, at = place => place.position ?? place;
  const view = townEndingView(step, flat);
  const {mid} = townEndingMiddle(step), hearth = at(step.hearth);
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
  // From the theft on the view is a second one, near his run (changed the same night: from 80 m a running man was a dot,
  // and the view only turned toward him): it stands 12 m to the side of his way, on the side away from the hearth, 2.5 m
  // up, in no solid, never nearer to him than 8 m nor farther than 30 m while he runs, and it looks at him.
  const near = townEndingView(step, flat, thief), stand = townThiefStand(step);
  assert.deepEqual(near.position, {x: stand.x, y: TOWN_ENDING_VIEW.thiefUpMetres, z: stand.z});
  assert.deepEqual(near.target, {x: thief.x, y: TOWN_ENDING_VIEW.thiefLookUpMetres, z: thief.z});
  assert.ok(!SCABLANDS_SOLIDS.some(solid => { const cos = Math.cos(solid.heading), sin = Math.sin(solid.heading), dx = stand.x - solid.x, dz = stand.z - solid.z;
    return Math.abs(dx * cos - dz * sin) <= solid.halfX + 1 && Math.abs(dx * sin + dz * cos) <= solid.halfZ + 1; }), 'the near view stands clear of every solid by a metre');
  for (let seconds = 0; seconds <= BRAND_RULE.endingSeconds - BRAND_RULE.theftAtSeconds; seconds += .25) {
    const runner = brandThiefPose(step, {theftStarted: true, endingElapsed: BRAND_RULE.theftAtSeconds + seconds});
    const away = Math.hypot(runner.x - stand.x, runner.z - stand.z);
    assert.ok(away >= 8 && away <= 30, `the thief is ${away.toFixed(1)} m from the near view ${seconds} s after the theft`);
  }
  const path = step.theftPath.map(at), hearthAway = Math.hypot(stand.x - hearth.x, stand.z - hearth.z);
  assert.ok(hearthAway > Math.hypot(path[1].x - hearth.x, path[1].z - hearth.z), 'the near view stands on the side away from the hearth');
}

// The evening is Light the Town's alone: 0 in every other job and with no job, a quarter for each lamp first lit, and
// dusk two and a half seconds into the ending.
{
  const state = (step, stepState) => ({arena: {mode: 'world-job', worldJob: {job: {stepIndex: 0, steps: [step], stepState}}}});
  for (const other of [{bellows: true}, {gasLoad: true}, {ember: {}}, {kind: 'reach'}]) assert.equal(townEveningAmount(state(other, {dusk: .9, townEnding: true, endingElapsed: 9})), 0);
  assert.equal(townEveningAmount({}), 0);
  assert.equal(townEveningAmount({arena: {mode: 'duel'}}), 0);
  assert.equal(townEveningAmount(state({brand: true}, {})), 0);
  assert.equal(townEveningAmount(state({brand: true}, {dusk: .3})), .3);
  assert.equal(townEveningAmount(state({brand: true}, {dusk: .1, brandAsh: {seen: ['pump', 'mast']}})), .5);
  assert.equal(townEveningAmount(state({brand: true}, {dusk: .4, townEnding: true, endingElapsed: 2.5})), 1);
  assert.equal(townEveningAmount(state({brand: true}, {dusk: 3})), 1);
  console.log('The evening belongs to Light the Town alone.');
}
