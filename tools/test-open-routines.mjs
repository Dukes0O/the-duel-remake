import assert from 'node:assert/strict';
import {applyEffects} from '../src/world/open/open-effects.js';
import {sampleWorld} from '../src/world/open/samples.js';
import {peoplePart} from '../src/world/open/parts/people.js';
import {followRoutine, routinePose} from '../src/world/open/routine-rule.js';
import {LAND} from '../src/world/scablands-names.js';
import {FOOT_GRADE, stepMover} from '../src/world/scablands-movers.js';
import {createJobSolidGrid} from '../src/world/scablands-solids.js';
import {advanceStoryPeople, createStoryPeople, STORY_FIGURES} from '../src/world/jobs/story-people.js';

const sample = sampleWorld('first-night');
const world = applyEffects(sample, {id: 'test/invite', effects: [{type: 'mark', id: 'walkers-inside'}]}).world;
const {seed} = world;
const at = (x, z) => ['tin-town', x, z];
const track = {kind: 'track', pace: 1, stops: [
  {at: at(28, 10), seconds: 1, task: 'stand'}, {at: at(31, 10), seconds: 2, task: 'sit'},
]};
assert.deepEqual(routinePose(track, 2.5, seed), routinePose(track, 11.5, seed));
assert.equal(routinePose(track, 5, seed).task, 'sit');
const turn = {...track, loop: false, stops: [...track.stops, {at: at(34, 10), seconds: 1, task: 'stand'}]};
assert.equal(routinePose(turn, 13, seed).task, 'sit', 'a non-looping track visits its middle stop on the way back');

const wander = {kind: 'wander', around: at(29, 8), radius: 2, pause: [4, 9]};
const centre = LAND.at(...wander.around);
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
for (let time = 0; time <= 600; time += .5) {
  const pose = routinePose(wander, time, seed);
  assert.deepEqual(pose, routinePose(wander, time, seed));
  assert(distance(pose, centre) <= wander.radius + 1e-7);
}
assert.notDeepEqual(routinePose(wander, 5, seed), routinePose(wander, 5, seed + 1));

const dt = .25, grid = createJobSolidGrid();
const tick = (state, seconds, partOfDay) => peoplePart.step(state,
  {world, seed, seconds, view: {openRoam: true, partOfDay, peopleGrid: grid}}, dt).state;
let state = peoplePart.begin(), movedAfterPhase = false;
for (let time = 0; time <= 600; time += dt) {
  const phase = time < 200 ? 'day' : time < 400 ? 'dusk' : 'dark';
  const next = tick(state, time, phase);
  assert.equal(next.cast.length, 13);
  for (const [i, person] of next.cast.entries()) {
    const old = state.cast[i]?.position, point = person.position;
    assert.equal(stepMover(point, point, {radius: person.radius, grid, height: point.y, moverId: person.id}).blocked, false,
      person.id + ' stands outside solids at ' + time);
    if (!old) continue;
    const travelled = distance(point, old);
    assert(travelled <= STORY_FIGURES[person.figure].pace * 1.15 * dt + 1e-7, 'the phase cannot teleport a person');
    if (travelled > 1e-7) {
      assert((point.y - old.y) / travelled <= FOOT_GRADE + 1e-7, 'no uphill step exceeds the foot grade');
      if (time >= 400 && time <= 405) movedAfterPhase = true;
    }
  }
  grid.setStoryPeople(next.cast);
  state = next;
}
assert(movedAfterPhase, 'the dark routine is reached on foot');

const cinder = state.cast.find(person => person.id === 'cinder');
const car = {...cinder.position, z: cinder.position.z - 1};
const moved = followRoutine(cinder, cinder.position, dt, {pace: 1.4, radius: cinder.radius, car, grid});
assert(distance(moved.position, car) > distance(cinder.position, car), 'a walker steps away from a nearby car');

const p = LAND.at('tin-town', 29, 10);
const route = [{...p}, {...p, x: p.x + 1}, {...p, x: p.x + 1}];
const makeCast = loop => createStoryPeople([{id: 'cinder', position: {...p, y: 0}, action: 'walk', pace: 1, path: route, loop}]);
const looping = makeCast(true), oneWay = makeCast(false);
advanceStoryPeople(looping, 3.5, () => 0);
advanceStoryPeople(oneWay, 3.5, () => 0);
assert.equal(looping[0].action, 'walk');
assert.equal(looping[0].distance, 3.5);
assert.equal(oneWay[0].distance, 1);
assert.equal(oneWay[0].action, 'stand');
console.log('test-open-routines: ok');
