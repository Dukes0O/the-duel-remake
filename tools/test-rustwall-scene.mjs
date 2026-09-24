import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Course} from '../src/course.js';
import {CARS, COURSE} from '../src/config.js';
import {ROUTE_VARIANTS} from '../src/route-variants.js';
import {buildRouteMapGeometry} from '../src/route-map.js';
import {NpcRoutePlanner} from '../src/npc-route.js';
import {disposeTree} from '../src/world.js';

const tests = [], check = (name, run) => tests.push({name, run});
const settle = () => new Promise(resolve => setImmediate(resolve));
const near = (actual, expected, message, tolerance = 1e-6) => assert.ok(
  Math.abs(actual - expected) <= tolerance, `${message}: ${actual} versus ${expected}`);
const definition = COURSE.find(row => row.id === 'pacific-canyon');
const courseFor = seed => new Course(definition, seed, {hiddenRoad: true});
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const ordinaryBaseline = JSON.parse(readFileSync(new URL('./replays/hidden-road-ordinary.json', import.meta.url), 'utf8'));
// Captured from 1420849 before the authorized final salt-flat widening.
const washBaseline = {
  route_a: '6208170f2c120d252421860f9b3dc47f8d9d02da0ece316e764afb3f75b1db43',
  route_b: '45979d992a181868c49a022392c46f8404a9c3db0a5f4949428582f4583f42e2',
  route_c: '36c57f4311b0f31d1e4086d832648e0a582d48e0ae4e2a139ea06d3194491b79',
};
const meshes = root => {const result = []; root.traverse(node => {
  if (node.isMesh) result.push(node);
}); return result;};
const freeze = value => {if (value && typeof value === 'object' && !Object.isFrozen(value)) {
  Object.values(value).forEach(freeze); Object.freeze(value);
} return value;};
async function api() {
  assert.ok(existsSync(new URL('../src/rustwall-scene.js', import.meta.url)),
    'Rustwall scene runtime is missing');
  const module = await import('../src/rustwall-scene.js');
  assert.equal(typeof module.createRustwallScene, 'function');
  assert.equal(typeof module.clampGateOpen, 'function');
  return module;
}

function fixtures() {
  // Shared resources exercise real disposeTree deduplication across both files.
  const geometry = new THREE.BoxGeometry(2, 1, 2).translate(0, .5, 0);
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({map: texture});
  const released = {geometry: 0, material: 0, texture: 0};
  for (const [key, value] of Object.entries({geometry, material, texture}))
    value.addEventListener('dispose', () => released[key]++);
  const wall = new THREE.Group();
  const panel = new THREE.Mesh(geometry, material);
  panel.name = 'gate-panel'; panel.scale.set(4.5, 7, .5); wall.add(panel);
  const sentinel = new THREE.Mesh(geometry, material);
  sentinel.name = 'fixed-wall-detail'; sentinel.position.set(12, 17, 0); wall.add(sentinel);
  const wash = new THREE.Group(); wash.add(new THREE.Mesh(geometry, material));
  return {wall: {scene: wall}, wash: {scene: wash}, released};
}

for (const route of ROUTE_VARIANTS) {
  check(`${route.label}: actual flat support under the 420 m wall and 15 m margins`, () => {
    const course = courseFor(route.seed), road = course.hiddenRoad;
    const base = road.poseAt(road.length);
    for (const offset of [-210, 210, -225, 225]) {
      const pose = road.poseAt(road.length, offset);
      const ground = course.groundAt(pose.s, pose.lateral);
      near(ground.y, base.y, `wall/margin ground at offset ${offset} m`, .01);
    }
    near(road.widthAt(road.length), 225, 'authorized final salt-flat half-width');
  });
  check(`${route.label}: widening preserves wash, path and ordinary road/shortcut geometry`, () => {
    const course = courseFor(route.seed), road = course.hiddenRoad;
    assert.equal(hash({entrance: road.entrance, length: road.length,
      washEnd: road.washEnd, samples: road.samples, walls: road.walls,
      widths: Array.from({length: road.washEnd + 1}, (_, progress) => road.widthAt(progress))}),
    washBaseline[route.id], 'entrance, every centerline/height sample and wash bank stay exact');
    const planner = new NpcRoutePlanner(course, {car: CARS.falcone_f42,
      surfaceAt: (s, lateral) => course.surfaceAt(s, lateral)});
    assert.equal(hash({samples: course.samples, sections: course.sections,
      gates: course.features.lapGates, finish: course.features.checkpoints,
      shortcuts: course.features.shortcuts, map: buildRouteMapGeometry(course),
      npc: planner.cuts.map(cut => planner.profile(cut.id, 'medium'))}),
    ordinaryBaseline.routes[route.id].geometry, 'existing ordinary EGG-01 baseline is unchanged');
  });
}

check('gate fraction is pure, finite and clamped', async () => {
  const {clampGateOpen} = await api();
  for (const [input, expected] of [[-3, 0], [0, 0], [.25, .25], [1, 1], [5, 1],
    [NaN, 0], [Infinity, 0], [-Infinity, 0], [undefined, 0]]) {
    assert.equal(clampGateOpen(input), expected);
    assert.equal(clampGateOpen(input), expected, 'same input gives same fraction');
  }
});
check('ordinary courses make no asset requests', async () => {
  const {createRustwallScene} = await api(); let requests = 0;
  const scene = createRustwallScene({hiddenRoad: null}, {loadAsset: () => {requests++;}});
  assert.equal(await scene.ready, false); scene.setGateOpen(1);
  assert.equal(requests, 0); assert.equal(meshes(scene.group).length, 0);
  disposeTree(scene.group);
});
check('default loader requests only the two local GLBs once', async () => {
  const {createRustwallScene} = await api(), models = fixtures(), requests = [];
  const original = GLTFLoader.prototype.loadAsync;
  let scene;
  try {
    GLTFLoader.prototype.loadAsync = async function(url) {
      requests.push(url);
      assert.match(url, /^\/assets\/models\/wasteland\/rustwall\/(wall|wash)\.glb$/);
      return models[url.endsWith('/wall.glb') ? 'wall' : 'wash'];
    };
    scene = createRustwallScene(courseFor(1989));
    assert.equal(await scene.ready, true);
    scene.setGateOpen(.5); scene.setGateOpen(0);
    assert.deepEqual(requests.sort(), ['/assets/models/wasteland/rustwall/wall.glb',
      '/assets/models/wasteland/rustwall/wash.glb']);
  } finally {GLTFLoader.prototype.loadAsync = original; if (scene) disposeTree(scene.group);}
});

for (const route of ROUTE_VARIANTS) check(`${route.label}: exact gate placement and immutable route`, async () => {
  const {createRustwallScene} = await api(), course = courseFor(route.seed);
  const before = JSON.stringify(course.hiddenRoad); freeze(course.hiddenRoad);
  const obstaclesBefore = JSON.stringify(course.features.obstacles);
  const models = fixtures(), requested = [];
  const scene = createRustwallScene(course, {loadAsset: async kind => {
    requested.push(kind); return models[kind];
  }});
  try {
    assert.equal(await scene.ready, true);
    assert.deepEqual(requested.sort(), ['wall', 'wash']);
    const panel = scene.group.getObjectByName('gate-panel'); assert.ok(panel);
    const pose = course.hiddenRoad.poseAt(course.hiddenRoad.length);
    const position = panel.getWorldPosition(new THREE.Vector3());
    near(position.x, pose.x, 'gate center X'); near(position.y, pose.y, 'gate base Y');
    near(position.z, pose.z, 'gate center Z');
    const forward = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(panel.getWorldQuaternion(new THREE.Quaternion()));
    near(forward.x, Math.sin(pose.heading), 'gate heading X');
    near(forward.z, Math.cos(pose.heading), 'gate heading Z');
    const approach = course.hiddenRoad.poseAt(course.hiddenRoad.length - 300);
    assert.ok(new THREE.Vector3(approach.x - pose.x, 0, approach.z - pose.z)
      .normalize().dot(forward) < -.999, 'front faces the final 300 m approach');
    const detail = scene.group.getObjectByName('fixed-wall-detail');
    const fixed = detail.getWorldPosition(new THREE.Vector3()).toArray();
    const prepared = meshes(scene.group).map(mesh => [mesh.uuid, mesh.geometry.uuid,
      ...(Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(item => item.uuid)]);
    scene.setGateOpen(.5);
    near(panel.getWorldPosition(new THREE.Vector3()).y, pose.y + 3.625, 'half gate travel');
    scene.setGateOpen(20);
    near(new THREE.Box3().setFromObject(panel).min.y, pose.y + 7.25, 'raised panel clears 7 m opening');
    scene.setGateOpen(-1);
    near(panel.getWorldPosition(new THREE.Vector3()).y, pose.y, 'closed panel returns to authored base');
    assert.deepEqual(detail.getWorldPosition(new THREE.Vector3()).toArray(), fixed,
      'opening only moves the panel');
    assert.deepEqual(meshes(scene.group).map(mesh => [mesh.uuid, mesh.geometry.uuid,
      ...(Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(item => item.uuid)]), prepared,
    'gate updates reuse prepared objects and resources');
    assert.equal(JSON.stringify(course.hiddenRoad), before);
    assert.equal(JSON.stringify(course.features.obstacles), obstaclesBefore,
      'presentation cannot add or change collision objects');
  } finally {disposeTree(scene.group);}
});

for (const route of ROUTE_VARIANTS) check(`${route.label}: joined wash triangles stay inside existing oriented collision boxes`, async () => {
  const {createRustwallScene} = await api(), course = courseFor(route.seed), models = fixtures();
  const before = JSON.stringify(course.hiddenRoad.walls);
  const scene = createRustwallScene(course, {loadAsset: async kind => models[kind]});
  try {
    assert.equal(await scene.ready, true); scene.group.updateMatrixWorld(true);
    const banks = meshes(scene.group.getObjectByName('Rustwall wash'));
    assert.ok(banks.length > 0 && banks.length <= 2, 'one joined mesh per side');
    const vertex = new THREE.Vector3();
    const supported = point => course.hiddenRoad.walls.some(wall => {
      const dx = point.x - wall.x, dz = point.z - wall.z;
      const across = Math.cos(wall.heading) * dx - Math.sin(wall.heading) * dz;
      const along = Math.sin(wall.heading) * dx + Math.cos(wall.heading) * dz;
      return Math.abs(across) <= wall.halfX + .002 &&
        Math.abs(along) <= wall.halfZ + .002 && point.y >= wall.y - .002 &&
        point.y <= wall.y + wall.height + .002;
    });
    for (const bank of banks) {
      const positions = bank.geometry.attributes.position;
      assert.ok(positions.count / 3 <= 30000, 'triangle budget');
      for (let point = 0; point < positions.count; point += 3) {
        const triangle = [0, 1, 2].map(index => new THREE.Vector3()
          .fromBufferAttribute(positions, point + index));
        for (const corner of triangle)
          assert.ok(supported(corner), `rendered rock vertex cannot protrude beyond a physical bank: ${corner.toArray()}`);
        vertex.copy(triangle[0]).add(triangle[1]).add(triangle[2]).divideScalar(3);
        assert.ok(supported(vertex), 'visual triangle cannot bridge open playable space');
      }
    }
    assert.equal(JSON.stringify(course.hiddenRoad.walls), before);
  } finally {disposeTree(scene.group);}
});

for (const route of ROUTE_VARIANTS) check(`${route.label}: visual wash is joined across adjacent physical bank boxes`, async () => {
  const {createRustwallScene} = await api(), course = courseFor(route.seed), models = fixtures();
  const scene = createRustwallScene(course, {loadAsset: async kind => models[kind]});
  try {
    assert.equal(await scene.ready, true);
    const wash = scene.group.getObjectByName('Rustwall wash');
    const banks = meshes(wash);
    assert.ok(banks.length <= 2 && banks.every(mesh => !mesh.isInstancedMesh),
      'each wash side is one joined visual mesh');
    assert.ok(banks.every(mesh => mesh.geometry.attributes.position.count > 300),
      'joined bank spans many physical boxes with authored slope points');
    assert.ok(wash.userData.joinedSeams >= 100, 'most adjacent physical bank boxes share a visual seam');
    let matched = 0;
    for (const bank of banks) {
      const positions = bank.geometry.attributes.position;
      assert.equal(positions.count % 36, 0, 'two six-triangle sections per bank box');
      const same = (a, b) => [0,1,2].every(axis =>
        Math.abs(positions.getComponent(a,axis) - positions.getComponent(b,axis)) < .00001);
      for (let box = 0; box + 1 < positions.count / 36; box++) {
        const oldEnd = box * 36 + 18, newStart = (box + 1) * 36;
        if ([0,1,2].every(band => same(oldEnd + band*6 + (bank.name.includes('right') ? 1 : 2),
          newStart + band*6 + (bank.name.includes('right') ? 2 : 1)))) matched++;
      }
      for (let point = 0; point < positions.count; point += 3) {
        const a = new THREE.Vector3().fromBufferAttribute(positions,point);
        const b = new THREE.Vector3().fromBufferAttribute(positions,point+1);
        const c = new THREE.Vector3().fromBufferAttribute(positions,point+2);
        const normal = b.sub(a).cross(c.sub(a));
        assert.ok(normal.y >= -.00001, 'both bank sides face upward toward daylight');
      }
    }
    assert.ok(matched >= 100, 'joined seams share exact rendered edge vertices');
  } finally {disposeTree(scene.group);}
});

check('joined wash prepares deterministically without changing bank geometry or simulation RNG', async () => {
  const {createRustwallScene} = await api(), course = courseFor(1989);
  const untouched = courseFor(1989), wallsBefore = JSON.stringify(course.hiddenRoad.walls);
  const prepared = [];
  try {
    for (let pass = 0; pass < 2; pass++) {
      const models = fixtures();
      const scene = createRustwallScene(course, {loadAsset: async kind => models[kind]});
      prepared.push(scene); assert.equal(await scene.ready, true);
      scene.group.updateMatrixWorld(true);
      const banks = meshes(scene.group.getObjectByName('Rustwall wash'));
      const prototype = models.wash.scene.children[0];
      assert.ok(banks.length > 0 && banks.length <= 2, 'at most one joined draw per side');
      assert.ok(banks.every(bank => bank.material === prototype.material), 'reuse the loaded rock material');
      assert.ok(banks.reduce((sum, bank) => sum + bank.geometry.attributes.position.count / 3, 0) <= 30000,
        'complete wash stays within its triangle budget');
    }
    const first = meshes(prepared[0].group.getObjectByName('Rustwall wash'));
    const second = meshes(prepared[1].group.getObjectByName('Rustwall wash'));
    for (const field of ['position', 'uv']) assert.deepEqual(
      first.map(bank => Array.from(bank.geometry.attributes[field].array)),
      second.map(bank => Array.from(bank.geometry.attributes[field].array)),
      `same course identities prepare identical ${field} data`);
    assert.equal(JSON.stringify(course.hiddenRoad.walls), wallsBefore);
    assert.deepEqual(Array.from({length: 4}, () => course.rng.float()),
      Array.from({length: 4}, () => untouched.rng.float()), 'presentation never consumes simulation RNG');
    // The preceding vertex and centroid test retains the original physical
    // envelope, with the same 2 mm representation tolerance.
  } finally {for (const scene of prepared) disposeTree(scene.group);}
});

check('pending gate value survives local asynchronous loading', async () => {
  const {createRustwallScene} = await api(), course = courseFor(1989), models = fixtures();
  const pending = [];
  const scene = createRustwallScene(course, {loadAsset: kind => new Promise(resolve => pending.push({kind, resolve}))});
  scene.setGateOpen(.75); await settle(); assert.equal(pending.length, 2);
  for (const request of pending) request.resolve(models[request.kind]);
  assert.equal(await scene.ready, true);
  const panel = scene.group.getObjectByName('gate-panel');
  near(panel.getWorldPosition(new THREE.Vector3()).y,
    course.hiddenRoad.poseAt(course.hiddenRoad.length).y + .75 * 7.25, 'pending fraction');
  disposeTree(scene.group);
});
check('ready shared resources dispose once through scene-system retirement', async () => {
  const {createRustwallScene} = await api(), models = fixtures();
  const scene = createRustwallScene(courseFor(1989), {loadAsset: async kind => models[kind]});
  assert.equal(await scene.ready, true); disposeTree(scene.group); scene.dispose();
  assert.deepEqual(models.released, {geometry: 1, material: 1, texture: 1});
});
check('late shared assets dispose once and never revive a retired scene', async () => {
  const {createRustwallScene} = await api(), models = fixtures(), pending = [];
  const scene = createRustwallScene(courseFor(1989), {loadAsset: kind => new Promise(resolve => pending.push({kind, resolve}))});
  await settle(); assert.equal(pending.length, 2); disposeTree(scene.group); scene.dispose();
  for (const request of pending) request.resolve(models[request.kind]);
  assert.equal(await scene.ready, false); await settle(); scene.setGateOpen(1);
  assert.equal(meshes(scene.group).length, 0);
  assert.deepEqual(models.released, {geometry: 1, material: 1, texture: 1});
});
check('failed local loads resolve safely without retries or route mutation', async () => {
  const {createRustwallScene} = await api(), course = courseFor(1989), requests = [];
  const before = JSON.stringify(course.hiddenRoad); freeze(course.hiddenRoad);
  const scene = createRustwallScene(course, {loadAsset: async kind => {
    requests.push(kind); throw Error('controlled local asset failure');
  }});
  assert.equal(await scene.ready, false);
  for (const fraction of [0, .5, 1, 0]) scene.setGateOpen(fraction);
  await settle(); assert.deepEqual(requests.sort(), ['wall', 'wash']);
  assert.equal(JSON.stringify(course.hiddenRoad), before);
  const pose = course.hiddenRoad.poseAt(300);
  assert.ok(course.hiddenRoad.contains(pose.x, pose.z), 'failed graphics leave the route usable');
  disposeTree(scene.group);
});

let failures = 0;
for (const {name, run} of tests) {
  try {await run();} catch (error) {failures++; console.error(`FAIL ${name}: ${error.message}`);}
}
console.log(`Rustwall scene: ${tests.length} checks, ${tests.length - failures} passed, ${failures} failed.`);
if (failures) process.exitCode = 1;
