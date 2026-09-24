import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {ROUTE_VARIANTS} from '../src/route-variants.js';

// Structural acceptance only. Three immutable fidelity rounds and the actual
// <=10% frame-cost measurement remain separate browser/critic requirements.
const base = 'public/assets/models/wasteland/rustwall/';
const file = path => new URL(`../${path}`, import.meta.url);
const tests = [], check = (name, run) => tests.push({name, run});
const near = (actual, expected, message, tolerance = .01) => assert.ok(
  Math.abs(actual - expected) <= tolerance, `${message}: ${actual} versus ${expected}`);
const nodes = (root, predicate) => {const found = []; root.traverse(node => {
  if (predicate(node)) found.push(node);
}); return found;};
const meshes = root => nodes(root, node => node.isMesh);
const triangles = mesh => (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3 *
  (mesh.isInstancedMesh ? mesh.count : 1);
function draws(mesh) {
  const materials = Array.isArray(mesh.material)
    ? mesh.geometry.groups.map(group => mesh.material[group.materialIndex]) : [mesh.material];
  return materials.reduce((sum, material) => sum + (!material?.visible ? 0 :
    material.transparent && material.side === THREE.DoubleSide && !material.forceSinglePass ? 2 : 1), 0);
}
function imageSize(bytes) {
  if (bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a')
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    for (let offset = 2; offset + 9 < bytes.length;) {
      assert.equal(bytes[offset], 0xff, 'JPEG marker');
      const marker = bytes[offset + 1], length = bytes.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2].includes(marker))
        return [bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5)];
      offset += length + 2;
    }
  }
  assert.fail('texture must embed a measurable PNG or JPEG');
}
const cache = new Map();
function asset(kind) {
  if (!cache.has(kind)) cache.set(kind, (async () => {
    const path = `${base}${kind}.glb`;
    assert.ok(existsSync(file(path)), `${path} is missing`);
    const bytes = readFileSync(file(path));
    assert.equal(bytes.toString('ascii', 0, 4), 'glTF'); assert.equal(bytes.readUInt32LE(4), 2);
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    let json, binary;
    for (let offset = 12; offset < bytes.length;) {
      const size = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
      const chunk = bytes.subarray(offset + 8, offset + 8 + size);
      if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
      if (type === 0x004e4942) binary = chunk;
      offset += 8 + size;
    }
    assert.ok(json && binary, 'GLB contains its own geometry');
    for (const resource of [...(json.buffers || []), ...(json.images || [])])
      assert.ok(!resource.uri || resource.uri.startsWith('data:'), 'no external asset dependencies');
    const loader = new GLTFLoader();
    // Only browser image decoding is replaced. Installed Three parses actual
    // geometry, groups, transforms and material semantics.
    loader.register(() => ({name: 'TEST_LOCAL_TEXTURE',
      loadTexture: () => Promise.resolve(new THREE.Texture())}));
    const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength), '');
    gltf.scene.updateMatrixWorld(true);
    return {gltf, json, binary};
  })());
  return cache.get(kind);
}

check('headless script and both Blender source files are retained', () => {
  for (const path of ['tools/blender/rustwall.py', `${base}wall.blend`, `${base}wash.blend`]) {
    assert.ok(existsSync(file(path)), `${path} is missing`);
    assert.ok(readFileSync(file(path)).length > 100, `${path} is empty`);
  }
});
check('actual wall core spans at least 400 m and stands 35 m high', async () => {
  const {gltf} = await asset('wall');
  const body = gltf.scene.getObjectByName('wall-body'); assert.ok(body, 'measurable wall core');
  const bounds = new THREE.Box3().setFromObject(body), size = bounds.getSize(new THREE.Vector3());
  assert.ok(size.x >= 400); near(size.y, 35, 'wall core height'); near(bounds.min.y, 0, 'wall footing');
  assert.ok(bounds.min.x <= -200 && bounds.max.x >= 200, 'gate centered in the long span');
});
check('gate has a real 9 by 7 m opening and clears it when raised', async () => {
  const {gltf} = await asset('wall'), panel = gltf.scene.getObjectByName('gate-panel');
  assert.ok(panel, 'independently movable gate panel');
  const box = new THREE.Box3().setFromObject(panel), size = box.getSize(new THREE.Vector3());
  near(size.x, 9, 'panel width'); near(size.y, 7, 'panel height');
  near(box.min.x, -4.5, 'opening left edge'); near(box.max.x, 4.5, 'opening right edge');
  near(box.min.y, 0, 'closed panel at ground'); near(box.max.y, 7, 'closed panel lintel');
  const gateMeshes = new Set(meshes(panel));
  const statics = meshes(gltf.scene).filter(mesh => !gateMeshes.has(mesh));
  const materials = new Set(meshes(gltf.scene).flatMap(mesh =>
    Array.isArray(mesh.material) ? mesh.material : [mesh.material]));
  const sides = [...materials].map(material => [material, material.side]);
  // Double-sided ray tests detect accidental solids even with reversed normals.
  for (const material of materials) material.side = THREE.DoubleSide;
  const ray = new THREE.Raycaster(), direction = new THREE.Vector3(0, 0, 1);
  const hits = (x, y, objects) => {
    ray.set(new THREE.Vector3(x, y, -1000), direction); ray.far = 2000;
    return ray.intersectObjects(objects, false);
  };
  const originalY = panel.position.y;
  try {
    for (const x of [-4.49, 0, 4.49]) for (const y of [.01, 3.5, 6.99])
      assert.equal(hits(x, y, statics).length, 0, 'opening is empty geometry, not a painted door');
    for (const x of [-4.6, 4.6]) assert.ok(hits(x, 3.5, statics).length, 'solid opening jamb');
    assert.ok(hits(0, 7.1, statics).length, 'solid opening header');
    assert.ok(hits(0, 3.5, [...gateMeshes]).length, 'closed panel blocks passage');
    panel.position.y = originalY + 7.25; gltf.scene.updateMatrixWorld(true);
    assert.ok(new THREE.Box3().setFromObject(panel).min.y >= 7);
    assert.equal(hits(0, 6.99, meshes(gltf.scene)).length, 0, 'raised gate clears the opening');
  } finally {
    panel.position.y = originalY; gltf.scene.updateMatrixWorld(true);
    for (const [material, side] of sides) material.side = side;
  }
});
check('wall figures have human scale in actual mesh bounds', async () => {
  const {gltf} = await asset('wall');
  const guards = nodes(gltf.scene, node => /^guard-\d+$/.test(node.name));
  assert.ok(guards.length >= 2, 'visible figures are represented by actual geometry');
  for (const guard of guards) {
    assert.ok(meshes(guard).length, 'figure has real geometry');
    const height = new THREE.Box3().setFromObject(guard).getSize(new THREE.Vector3()).y;
    assert.ok(height >= 1.6 && height <= 2, `${guard.name} adult height is ${height} m`);
  }
});
check('wall geometry fits 60000 triangles and 24 actual material draws', async () => {
  const {gltf} = await asset('wall'), parts = meshes(gltf.scene);
  assert.ok(parts.length); assert.ok(parts.reduce((sum, mesh) => sum + triangles(mesh), 0) <= 60000);
  assert.ok(parts.reduce((sum, mesh) => sum + draws(mesh), 0) <= 24);
});
check('normalized wash modules fit collision boxes and the complete instanced budget', async () => {
  const {gltf} = await asset('wash'), parts = meshes(gltf.scene);
  assert.ok(parts.length > 0 && parts.length <= 2);
  const identity = new THREE.Matrix4().elements;
  for (const mesh of parts) {
    mesh.matrixWorld.elements.forEach((value, index) => near(value, identity[index],
      'wash mesh transform must be baked', 1e-6));
    const positions = mesh.geometry.attributes.position;
    for (let index = 0; index < positions.count; index++) {
      assert.ok(Math.abs(positions.getX(index)) <= 1.000001 &&
        Math.abs(positions.getZ(index)) <= 1.000001 && positions.getY(index) >= -.000001 &&
        positions.getY(index) <= 1.000001, 'normalized rock stays within declared collision box');
    }
  }
  const definition = COURSE.find(row => row.id === 'pacific-canyon');
  const maxBanks = Math.max(...ROUTE_VARIANTS.map(route =>
    new Course(definition, route.seed, {hiddenRoad: true}).hiddenRoad.walls.length));
  const count = parts.reduce((sum, mesh) => sum + triangles(mesh), 0) * maxBanks;
  assert.ok(count <= 30000, `${maxBanks} actual banks require ${count} triangles`);
  assert.ok(parts.reduce((sum, mesh) => sum + draws(mesh), 0) <= 2, 'two instanced material draws maximum');
});
for (const [kind, maximumSets] of [['wall', 3], ['wash', 1]]) check(`${kind}: local 1024 texture-set allocation`, async () => {
  const {json, binary} = await asset(kind);
  assert.ok(json.images?.length, 'authored textures are present');
  const sets = new Set((json.materials || []).flatMap(material => {
    const texture = material.pbrMetallicRoughness?.baseColorTexture;
    return texture ? [json.textures[texture.index].source] : [];
  }));
  assert.ok(sets.size > 0 && sets.size <= maximumSets, `${kind} base-color atlas count`);
  for (const image of json.images) {
    const view = json.bufferViews[image.bufferView];
    const bytes = image.uri ? Buffer.from(image.uri.split(',')[1], 'base64') :
      binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
    assert.deepEqual(imageSize(bytes), [1024, 1024], 'every texture in each set is 1024 square');
  }
});

let failures = 0;
for (const {name, run} of tests) {
  try {await run();} catch (error) {failures++; console.error(`FAIL ${name}: ${error.message}`);}
}
console.log(`Rustwall assets: ${tests.length} checks, ${tests.length - failures} passed, ${failures} failed.`);
if (failures) process.exitCode = 1;
