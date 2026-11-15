import assert from 'node:assert/strict';
import * as THREE from 'three';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {worldHudModel, worldMapFrame, brazierArrow} from '../src/world/world-hud.js';
import {brazierSpotsFor, createBraziers, createCinderFigure} from '../src/world/ember-pot.js';
import {LAND} from '../src/world/scablands-names.js';
import {createKnowledge, jobFacts, learn, drawSmallMap, drawBigMap, getLandPicture, smallView, wholeView, toScreen} from '../src/world/scablands-map.js';
import {sees} from '../src/world/scablands-ways.js';
import {scablandsSurfaceHeightAt, scablandsFloorsAt} from '../src/world/scablands-ground.js';
import {pushOutOfSolids, createJobSolidGrid, createSolidGrid} from '../src/world/scablands-solids.js';
import {riverDepthAt} from '../src/world/scablands-regions.js';
import {createWorldJob, initializeWorldJob, stepWorldJob, worldJobHitTargets} from '../src/arena/modes/world-job.js';
import {startFlamethrower, stepFlamethrowers} from '../src/arsenal/flamethrower.js';
import '../src/story/ember-lines.js';

const definition = EVERBURN_JOBS.find(job => job.id === 'everburn-hot-delivery');
const step = definition.steps[0], pickup = step.pickup.place.position;
// The mode creates the actual waiting vehicles, on the appropriate floor at each barricade.
const waitingWorld = createWorldJob(definition);
const waitingState = {arena:{worldJob:waitingWorld}, weaponLoadout:[], s:0, lateral:0};
const waitingDuel = {state:waitingState, seed:19, course:{def:{scablands:true},
  nearest:() => ({s:0, lateral:0}), at:() => ({heading:0})}};
initializeWorldJob(waitingDuel, definition);
assert.equal(waitingWorld.actors.length, 2);
for (const [index, actor] of waitingWorld.actors.entries()) {
  const barrier = step.barriers[index], floors = [];
  assert.equal(actor.id, step.waitingActors[index].id);
  assert.equal(actor.renderCar, 'dusthawk_rally');
  assert.equal(actor.speed, 0);
  assert.ok(Math.hypot(actor.position.x - barrier.position.x, actor.position.z - barrier.position.z) <= 21);
  scablandsFloorsAt(actor.position.x, actor.position.z, floors);
  assert.equal(actor.position.y, floors[0]);
  assert.equal(pushOutOfSolids(actor.position.x, actor.position.z, 1, undefined, actor.position.y).hit, null);
}
// A loaded pot near a post draws that post's rider; the other remains waiting.
{
  const rider = waitingWorld.actors[0], distant = waitingWorld.actors[1];
  const start = {...rider.position}, otherStart = {...distant.position};
  const car = {x:start.x + 30, y:start.y, z:start.z};
  Object.assign(waitingState, {opponents:[], speedMph:0, stageTimeSec:0, input:{}, cpuDifficulty:'medium'});
  Object.assign(waitingDuel, {emit:() => {}, _storyCallout:() => {}});
  waitingDuel.course.worldAt = () => car;
  waitingWorld.job.stepState = {};
  stepWorldJob(waitingDuel, 0.25);
  assert.deepEqual(rider.position, start, 'the rider waits before the pot is loaded');
  waitingWorld.job.stepState = {loaded:true, ember:100};
  stepWorldJob(waitingDuel, 0.25);
  assert.ok(Math.hypot(rider.position.x - car.x, rider.position.z - car.z) < 30);
  assert.ok(rider.speed > 0);
  assert.deepEqual(distant.position, otherStart);
}
// Drive the actual rider into a stationary car, then process the impact through the job.
{
  const rider = waitingWorld.actors[0];
  const car = {x:rider.position.x + 5, y:rider.position.y, z:rider.position.z};
  const cues = [];
  waitingDuel.course.worldAt = () => car;
  waitingDuel.emit = event => cues.push(event);
  waitingWorld.job.stepState = {loaded:true, ember:100};
  waitingState.speedMph = 0;
  stepWorldJob(waitingDuel, 0.2);
  assert.ok(waitingState.knock, 'the ram shoves the car');
  assert.ok(waitingWorld.riderHitKmh > step.ember.hitFreeKmh);
  stepWorldJob(waitingDuel, 0.01);
  assert.equal(waitingWorld.job.stepState.joltCount, 1);
  assert.ok(waitingWorld.job.stepState.ember < 100);
  assert.ok(cues.some(event => event.arenaTell?.cue === 'world.ember.spark'));
  stepWorldJob(waitingDuel, 0.01);
  assert.equal(waitingWorld.job.stepState.joltCount, 1, 'continued contact is one ram');
}
assert.deepEqual(step.braziers.map(b => b.id), ['yard-brazier', 'halfway-brazier', 'wash-brazier']);
// The camp scoop calls its rider even when that rider is outside the usual pursuit range.
{
  const world = createWorldJob(definition);
  const state = {arena:{worldJob:world}, weaponLoadout:[], s:0, lateral:0,
    opponents:[], speedMph:0, stageTimeSec:0, input:{}, cpuDifficulty:'medium'};
  let car = {...step.braziers[0].position};
  const duel = {state, seed:19, course:{def:{scablands:true}, nearest:() => ({s:0, lateral:0}),
    at:() => ({heading:0}), worldAt:() => car}, emit:() => {}, _storyCallout:() => {}};
  initializeWorldJob(duel, definition);
  world.job.stepState = {loaded:true, ember:80};
  stepWorldJob(duel, 0.1);
  assert.equal(world.job.stepState.scoopBrazier, 'yard-brazier');
  assert.notEqual(world.actors[0].pursuing, true);
  car = {...step.braziers[1].position};
  world.actors[0].position = {...world.actors[0].position, x:car.x + 200, z:car.z};
  stepWorldJob(duel, 0.1);
  assert.equal(world.job.stepState.scoopBrazier, 'halfway-brazier');
  assert.ok(world.job.stepState.scoopTime < 3, 'the ambush begins during the scoop');
  assert.equal(world.actors[0].pursuing, true);
  assert.notEqual(world.actors[1].pursuing, true);
}
// A loaded car crossing the 400 m line at the gate sends both riders home once.
{
  const world = createWorldJob(definition), wall = step.riderSafeWall, captions = [];
  const state = {arena:{worldJob:world}, weaponLoadout:[], s:0, lateral:0,
    opponents:[], speedMph:0, stageTimeSec:0, input:{}, cpuDifficulty:'medium'};
  let car = {x:wall.x, z:wall.z + wall.radius + 1};
  car.y = scablandsSurfaceHeightAt(car.x, car.z);
  const duel = {state, seed:19, course:{def:{scablands:true}, nearest:() => ({s:0, lateral:0}),
    at:() => ({heading:0}), worldAt:() => car}, emit:() => {}, _storyCallout:text => captions.push(text)};
  initializeWorldJob(duel, definition);
  world.job.stepState = {loaded:true, ember:100};
  for (const rider of world.actors) rider.pursuing = true;
  stepWorldJob(duel, 0);
  assert.notEqual(world.ridersRetreating, true, 'outside 400 m the pursuit continues');
  car = {...car, z:wall.z + wall.radius - 1};
  for (const rider of world.actors) rider.position.x += 30;
  const before = world.actors.map(rider => ({...rider.position}));
  stepWorldJob(duel, 0.1);
  assert.equal(world.ridersRetreating, true);
  for (const [index, rider] of world.actors.entries()) {
    const home = step.waitingActors[index].start.position;
    assert.equal(rider.pursuing, false);
    assert.ok(Math.hypot(rider.position.x-home.x, rider.position.z-home.z) <
      Math.hypot(before[index].x-home.x, before[index].z-home.z));
  }
  const line = captions.filter(text => text.includes('Our guns cover the road.'));
  assert.equal(line.length, 1);
  car = {...car, z:wall.z + wall.radius + 100};
  stepWorldJob(duel, 0.1);
  assert.equal(captions.filter(text => text.includes('Our guns cover the road.')).length, 1);
  assert.ok(world.actors.every(rider => !rider.pursuing), 'the riders do not resume pursuit');
}
// The actual job grid holds both barricades on their named floor, including the bridge deck.
const barricadeGrid = createJobSolidGrid(createSolidGrid([]));
barricadeGrid.setBarricades(step.barriers);
for (const [index, barrier] of step.barriers.entries()) {
  const named = LAND.at(['safe-road', 'girder-bridge'][index]), floors = [];
  assert.deepEqual({x:barrier.position.x, z:barrier.position.z}, named);
  scablandsFloorsAt(named.x, named.z, floors);
  assert.equal(barrier.position.y, floors[0]);
  assert.equal(pushOutOfSolids(named.x, named.z, 1, barricadeGrid, floors[0]).hit?.id, barrier.id);
  if (index === 1) {
    assert.equal(floors.length, 2);
    assert.equal(pushOutOfSolids(named.x, named.z, 1, barricadeGrid, floors[1]).hit, null);
  }
}
// Fire the real car flamethrower at each named barricade and step the job.
{
  const world = createWorldJob(definition);
  const state = {arena:{mode:'world-job', worldJob:world, participants:[]}, weaponLoadout:[],
    s:0, lateral:0, opponents:[], speedMph:0, stageTimeSec:0, input:{}, cpuDifficulty:'medium',
    combat:{serial:0, flameBursts:[], flameBurns:{}}};
  let car;
  const duel = {state, seed:19, course:{def:{scablands:true}, solidGrid:createSolidGrid([]),
    nearest:() => ({s:0, lateral:0}), at:() => ({heading:0}),
    worldAt:() => car, groundAt:() => car}, emit:() => {}, _storyCallout:() => {}};
  initializeWorldJob(duel, definition);
  world.job.stepState = {loaded:true, ember:100};
  state.worldJobThingsHit = [{id:step.barriers[0].id, kind:'barricade', burnable:true}];
  car = {...step.barriers[0].position, heading:0};
  stepWorldJob(duel, 0.01);
  assert.ok(!world.job.stepState.burntBarricades.includes(step.barriers[0].id), 'a projectile does not burn a barricade');
  for (const barrier of step.barriers) {
    const p = barrier.position;
    car = {x:p.x, y:p.y, z:p.z - 6, heading:0};
    state.headingError = 0;
    stepWorldJob(duel, 0.01);
    assert.equal(pushOutOfSolids(p.x, p.z, 1, world.solidGrid, p.y).hit?.id, barrier.id);
    assert.ok(startFlamethrower(duel, state));
    stepFlamethrowers(duel, 0.1);
    assert.ok(state.worldJobThingsHit.some(hit => hit.id === barrier.id && hit.flame));
    stepWorldJob(duel, 0.01);
    assert.ok(world.job.stepState.burntBarricades.includes(barrier.id));
    assert.equal(pushOutOfSolids(p.x, p.z, 1, world.solidGrid, p.y).hit, null);
    assert.ok(!worldJobHitTargets(duel).some(target => target.id === barrier.id));
    state.combat.flameBursts = [];
  }
}

for (const [index, brazier] of step.braziers.entries()) {
  const p = brazier.position, named = LAND.at(['yard', 'safe-road', 'the-wash'][index]);
  assert.ok(Math.hypot(p.x - named.x, p.z - named.z) <= 9.000001);
  assert.equal(p.y, scablandsSurfaceHeightAt(p.x, p.z));
  assert.equal(pushOutOfSolids(p.x, p.z, 1, undefined, p.y).hit, null);
}
assert.ok(riverDepthAt(step.braziers[2].position.x, step.braziers[2].position.z) > 0);
for (let i = 0; i < 3; i++) {
  assert.deepEqual({x:step.braziers[i].position.x, z:step.braziers[i].position.z}, brazierSpotsFor(step)[i]);
}
const braziers = createBraziers(3);
braziers.place(step.braziers.map(b => b.position));
braziers.group.updateMatrixWorld(true);
assert.equal(braziers.group.children.length, 3);
for (const [index, stand] of braziers.group.children.entries()) {
  const position = step.braziers[index].position;
  assert.deepEqual(stand.position.toArray(), [position.x, position.y, position.z]);
  const smoke = stand.getObjectByName('Brazier smoke column');
  assert.ok(smoke);
  const bounds = new THREE.Box3().setFromObject(smoke);
  assert.ok(Math.abs(bounds.min.y - position.y) < 1e-9);
  assert.ok(Math.abs(bounds.max.y - position.y - 40) < 1e-9);
  assert.ok(Math.abs((bounds.min.x + bounds.max.x) / 2 - position.x) < 1e-9);
  assert.ok(Math.abs((bounds.min.z + bounds.max.z) / 2 - position.z) < 1e-9);
}
braziers.dispose();
const figure = createCinderFigure();
assert.equal(figure.name, 'Cinder at the yard gate');
assert.ok(figure.children.some(child => child.isMesh));
assert.ok(Math.hypot(pickup.x - brazierSpotsFor(step)[0].x, pickup.z - brazierSpotsFor(step)[0].z) < 3);
assert.equal(Math.hypot(step.carStart.x - step.origin.position.x, step.carStart.z - step.origin.position.z), 40);
assert.ok(Math.abs(step.carStart.heading - Math.PI / 2) < 1e-9);
let job = createJob(definition, 19);
const view = (x, z, speedKmh = 0) => ({player: {position: {x, z}}, speedKmh});
const hud = () => worldHudModel({worldJob: {job, definition}, player: {x: step.carStart.x, z: step.carStart.z}});
job = stepJob(job, view(step.carStart.x, step.carStart.z), 5);
assert.equal(job.stepState.loaded, undefined);
assert.equal(hud().ember, null);
assert.equal(hud().target.id, 'cinder');
const worldJob = {job, definition, actors: [{id: 'rider', ambushKey: 'camp', position: {x: pickup.x, z: pickup.z}}]};
const state = {s: 0, lateral: 0, arena: {mode: 'world-job', worldJob}};
const course = {worldAt: () => ({x: step.carStart.x, z: step.carStart.z, heading: step.carStart.heading})};
const frame = () => worldMapFrame({state, course, model: worldHudModel({worldJob}), knowledge: {}, picture: {}, canvas: null});
assert.equal(frame().target.id, 'cinder');
assert.deepEqual(frame().actors, []);
job = stepJob(job, view(pickup.x, pickup.z, 10), 1);
assert.equal(job.stepState.pickingUp, undefined);
job = stepJob(job, view(pickup.x + 8.1, pickup.z), 1);
assert.equal(job.stepState.pickingUp, undefined);
job = stepJob(job, view(pickup.x + 7.9, pickup.z), .1);
const lines = job.requests.filter(request => request.type === 'say').map(request => request.lineId);
for (let i = 0; i < 100 && !job.stepState.loaded; i++) {
  job = stepJob(job, view(pickup.x, pickup.z), .1);
  lines.push(...job.requests.filter(request => request.type === 'say').map(request => request.lineId));
  if (!job.stepState.loaded) assert.equal(hud().ember, null);
}
assert.deepEqual(lines, step.pickup.lines);
assert.equal(job.stepState.loaded, true);
worldJob.job = job;
assert.equal(frame().actors.length, 1);
assert.ok(hud().ember.value > 99);
assert.equal(hud().target.id, 'tin-town');
// Exercise the real job step with each brazier, including interrupted stops and an out ember.
job.stepState = {...job.stepState, ember: 0, out: true};
for (const brazier of step.braziers) {
  const {x, z} = brazier.position;
  job = stepJob(job, view(x + 8.1, z), 3);
  assert.ok(!job.events.some(event => event.type === 'emberRelit'));
  job = stepJob(job, view(x, z), 2);
  job = stepJob(job, view(x, z, -2), 1);
  job = stepJob(job, view(x, z), 2);
  assert.ok(!job.events.some(event => event.type === 'emberRelit'));
  const before = job.stepState.ember;
  const wasOut = job.stepState.out;
  job = stepJob(job, view(x, z), 1);
  assert.ok(Math.abs(job.stepState.ember - Math.min(100, before - (wasOut ? 0 : step.ember.coldPerSecond) + 25)) < 1e-9);
  assert.equal(job.stepState.out, false);
  assert.deepEqual(job.events.filter(event => event.type === 'emberRelit').map(event => event.place), [brazier.id]);
  job = stepJob(job, view(x, z), 4);
  assert.ok(!job.events.some(event => event.type === 'emberRelit'));
}
// Map knowledge starts with the yard, then keeps each brazier seen within 400 m.
const knowledge = createKnowledge(), facts = jobFacts({job, definition});
const yard = step.braziers[0].position;
learn(knowledge, {car: {x: yard.x, z: yard.z}, ...facts});
assert.deepEqual([...knowledge.braziers.keys()], ['yard-brazier']);
for (const brazier of step.braziers.slice(1)) {
  const p = brazier.position;
  const far = {x: p.x + 401, z: p.z};
  learn(knowledge, {car: far, braziers: [step.braziers[0], brazier]});
  assert.equal(knowledge.braziers.has(brazier.id), false);
  const near = {x: p.x + 10, z: p.z};
  assert.ok(sees(near, p, {heightAt: scablandsSurfaceHeightAt, actorFloors: true, eye: 1.5, target: 2, step: 5, range: 400}));
  learn(knowledge, {car: near, braziers: [step.braziers[0], brazier]});
  assert.equal(knowledge.braziers.has(brazier.id), true);
}
// Find a real blocked sight line within range, and show that it does not reveal the brazier.
const hidden = step.braziers[1].position;
let blocked = null;
for (let dx = -390; dx <= 390 && !blocked; dx += 20) for (let dz = -390; dz <= 390; dz += 20) {
  const car = {x: hidden.x + dx, z: hidden.z + dz};
  if (Math.hypot(dx, dz) <= 400 && !sees(car, hidden, {heightAt: scablandsSurfaceHeightAt, actorFloors: true, eye: 1.5, target: 2, step: 5, range: 400})) { blocked = car; break; }
}
assert.ok(blocked, 'the real land has a blocked view near the camp');
const obscured = createKnowledge();
learn(obscured, {car: blocked, braziers: step.braziers.slice(0, 2)});
assert.equal(obscured.braziers.has('halfway-brazier'), false);
// The out-pot pointer uses only map knowledge and turns with the car.
const arrowCar = {x: hidden.x + 10, z: hidden.z, heading: 0};
assert.equal(brazierArrow({out: false}, arrowCar, knowledge), null);
const yardOnly = brazierArrow({out: true}, arrowCar, obscured);
assert.equal(yardOnly.id, 'yard-brazier');
assert.ok(Math.abs(yardOnly.distance - Math.hypot(yard.x - arrowCar.x, yard.z - arrowCar.z)) < 1e-9);
const campArrow = brazierArrow({out: true}, arrowCar, knowledge);
assert.equal(campArrow.id, 'halfway-brazier');
assert.equal(campArrow.distance, 10);
assert.ok(Math.abs(campArrow.angle + 90) < 1e-9);
assert.ok(Math.abs(campArrow.x - 4) < 1e-9);
const turned = brazierArrow({out: true}, {...arrowCar, heading: -Math.PI / 2}, knowledge);
assert.ok(Math.abs(turned.angle) < 1e-9);
assert.ok(Math.abs(turned.y - 6) < 1e-9);
// Record the actual flame marks painted by both maps.
const picture = getLandPicture(), translations = [], marks = [];
let current = null;
const context = new Proxy({measureText: value => ({width: String(value).length * 8}), save() {}, restore() {},
  translate(x, y) { current = {x, y}; translations.push(current); },
  fill() { if (this.fillStyle === '#ff8a4c' && current) marks.push(current); }},
  {get(target, key) { return key in target ? target[key] : () => {}; }, set(target, key, value) { target[key] = value; return true; }});
const car = {x: yard.x, z: yard.z, heading: 0};
const mapFrame = {picture, canvas: null, car, target: null, knowledge, actors: []};
for (const [draw, size, view] of [[drawSmallMap, {width: 400, height: 280}, smallView(car)],
  [drawBigMap, {width: 1400, height: 1000}, wholeView(picture, {width: 1400, height: 1000})]]) {
  marks.length = 0;
  draw(context, mapFrame, size);
  const visible = [...knowledge.braziers.values()].map(p => toScreen(view, p.x, p.z)).filter(p => p.x >= 0 && p.y >= 0 && p.x <= size.width && p.y <= size.height);
  for (const p of visible) assert.ok(marks.some(m => Math.abs(m.x - p.x) < 1e-7 && Math.abs(m.y - p.y) < 1e-7));
  assert.equal(marks.length, visible.length);
}
assert.deepEqual(job.stepState.scoopedBraziers, step.braziers.map(b => b.id));
assert.equal(job.stepState.relights, 1);
console.log('Hot Delivery pickup: start, stop, three lines and ember passed.');
