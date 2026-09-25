import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {ROUTE_VARIANTS} from '../src/route-variants.js';
import {disposeTree} from '../src/world.js';

const api = () => import('../src/scrapdome-yard.js');
const definition = COURSE.find(row => row.id === 'pacific-canyon');
const courseFor = seed => new Course(definition, seed, {hiddenRoad: true});
function fixture() {
  const geometry = new THREE.BoxGeometry(3, 3, 3);
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({map: texture});
  const scene = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(25, 1.5, 50); scene.add(mesh);
  const released = {geometry: 0, material: 0, texture: 0};
  for (const [key, value] of Object.entries({geometry, material, texture}))
    value.addEventListener('dispose', () => released[key]++);
  return {asset: {scene}, released};
}
const snapshot = course => JSON.stringify({samples: course.samples,
  walls: course.hiddenRoad?.walls, road: course.hiddenRoad?.samples,
  obstacles: course.features.obstacles, rng: course.rng});

test('ordinary courses never request or activate the yard', async () => {
  const {createScrapdomeYard} = await api();
  const course = new Course(definition, 1989); let requests = 0;
  const yard = createScrapdomeYard(course, {loadAsset: async () => {requests++; return fixture().asset;}});
  assert.equal(await yard.ready, false); assert.equal(requests, 0);
  assert.equal(yard.group.userData.assetStatus, 'disabled');
  yard.setHomeVisible(true); assert.equal(yard.homeCamera(), null);
  disposeTree(yard.group);
});

for (const route of ROUTE_VARIANTS) test(`${route.id}: physical yard and parked camera preserve course state`, async () => {
  const {createScrapdomeYard} = await api();
  const course = courseFor(route.seed), before = snapshot(course), f = fixture();
  const yard = createScrapdomeYard(course, {loadAsset: async () => f.asset});
  assert.equal(yard.group.visible, true, 'physical yard is visible through the gate');
  assert.equal(yard.homeCamera(), null, 'arrival cinematic keeps camera before home activation');
  assert.equal(await yard.ready, true); assert.equal(yard.group.userData.assetStatus, 'ready');
  const gate = course.hiddenRoad.poseAt(course.hiddenRoad.length);
  yard.group.updateMatrixWorld(true);
  const worldOrigin = f.asset.scene.localToWorld(new THREE.Vector3());
  assert.ok(worldOrigin.distanceTo(new THREE.Vector3(gate.x, gate.y, gate.z)) < .001,
    'the model uses the same physical gate frame as Rustwall');
  yard.setHomeVisible(true);
  for (const aspect of [16/9, 9/16]) {
    const view = yard.homeCamera(aspect);
    assert.ok(view && view.fov > 20 && view.fov < 100);
    for (const vector of [view.position, view.target])
      for (const axis of ['x','y','z']) assert.ok(Number.isFinite(vector[axis]));
    assert.deepEqual(yard.homeCamera(aspect), view, 'repeatable camera');
    const camera = new THREE.PerspectiveCamera(view.fov, aspect, .1, 1000);
    camera.position.set(view.position.x, view.position.y, view.position.z);
    camera.lookAt(view.target.x, view.target.y, view.target.z); camera.updateMatrixWorld(true);
    // A conservative parked envelope covers every current car, including Titan.
    for (const x of [-1.9, 1.9]) for (const z of [8, 16]) for (const y of [.2, 3.7]) {
      const p = new THREE.Vector3(gate.x + x*Math.cos(gate.heading) + z*Math.sin(gate.heading),
        gate.y+y, gate.z-x*Math.sin(gate.heading)+z*Math.cos(gate.heading)).project(camera);
      assert.ok(Math.abs(p.x) <= .96 && Math.abs(p.y) <= .96 && p.z > -1 && p.z < 1,
        `parked car must remain framed at aspect ${aspect}`);
    }
  }
  yard.setHomeVisible(false); assert.equal(yard.homeCamera(), null);
  assert.equal(yard.group.visible, true, 'closing panel presentation does not erase physical yard');
  assert.equal(snapshot(course), before, 'visuals never change road, obstacles or random state');
  disposeTree(yard.group); yard.dispose();
  assert.deepEqual(f.released, {geometry: 1, material: 1, texture: 1});
});

test('failed and late loads cannot resurrect a retired yard', async () => {
  const {createScrapdomeYard} = await api();
  const failed = createScrapdomeYard(courseFor(1989), {loadAsset: async () => {throw Error('fixture unavailable');}});
  assert.equal(await failed.ready, false); assert.equal(failed.group.userData.assetStatus, 'failed');
  assert.ok(failed.group.userData.loadErrors.length); failed.setHomeVisible(true);
  assert.equal(failed.homeCamera(), null); disposeTree(failed.group);
  const f = fixture(); let resolve;
  const late = createScrapdomeYard(courseFor(1989), {loadAsset: () => new Promise(r => {resolve = r;})});
  await new Promise(r => setImmediate(r)); disposeTree(late.group); late.dispose();
  resolve(f.asset); assert.equal(await late.ready, false);
  assert.equal(f.asset.scene.parent, null); assert.equal(late.homeCamera(), null);
  assert.deepEqual(f.released, {geometry: 1, material: 1, texture: 1});
});
