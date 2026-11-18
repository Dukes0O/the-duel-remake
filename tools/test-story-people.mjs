import assert from 'node:assert/strict';
import {createJobSolidGrid} from '../src/world/scablands-solids.js';
import {sweepObstacle} from '../src/collision.js';
import {advanceStoryPeople, attendTo, createStoryPeople, setStoryPersonAction, walkerGroupAt} from '../src/world/jobs/story-people.js';

const flat = () => 0;
const cast = createStoryPeople(walkerGroupAt({x: 0, y: 0, z: 0}, 0, flat));
const [rell, dace, wim] = cast;
assert.equal(cast.length, 11);
assert.ok(new Set(cast.map(p => p.position.z)).size > 6);
assert.ok(rell.height > dace.height && dace.height > wim.height);
assert.ok(rell.radius > dace.radius && dace.radius > wim.radius);

const facing = {yaw: 0, headYaw: 0};
for (let i = 0; i < 60; i++) attendTo(rell, facing, {x: 0, z: -10}, 1 / 60);
assert.ok(Math.abs(facing.yaw - Math.PI) < .001, 'Even an about-turn finishes in one second');
for (let i = 0; i < 60; i++) attendTo(rell, facing, {x: 5, z: rell.position.z}, 1 / 60);
assert.ok(Math.abs(facing.yaw - Math.PI / 2) < .001, 'Speaker tracks the player after the player moves');
for (const action of ['sit', 'sleep', 'stand']) {
  setStoryPersonAction(wim, action);
  assert.equal(wim.action, action);
  const before = {...wim.position};
  advanceStoryPeople(cast, 1, flat);
  assert.deepEqual(wim.position, before);
}

const finish = {x: 11, z: 8};
for (const action of ['walk', 'run', 'push-cart']) {
  setStoryPersonAction(dace, action, [{x: 2, z: 3}, finish]);
  assert.equal(dace.action, action);
  advanceStoryPeople(cast, 1 / 60, flat);
  assert.equal(dace.action, action);
  advanceStoryPeople(cast, 60, flat);
  assert.equal(dace.action, 'stand');
  assert.deepEqual(dace.position, {...finish, y: 0});
}
const grid = createJobSolidGrid({near: () => []});
grid.setPeople([{id: 'auntie', position: {x: 8, z: 2}}]);
grid.setStoryPeople(cast);
const obstacle = grid.near(0, 0, 0, 5).find(s => s.id === 'rell');
for (const body of [{halfWidth: 1, halfLength: 2, height: 1.5},
                    {halfWidth: .3, halfLength: .3, height: 1.8}]) {
  const hit = sweepObstacle({x: 0, y: 0, z: -8}, {x: 0, y: 0, z: 8}, obstacle, 0, body);
  assert.ok(hit && hit.t < .5, 'The car and foot sweeps meet Rell before their centre reaches her');
}
grid.setStoryPeople([]);
assert.deepEqual(grid.near(0, 0, 0, 5).map(s => s.id), ['auntie']);
console.log('Story people: group, turning, actions and solid sweeps passed.');
