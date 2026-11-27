import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {WORKSHOP_CARS} from '../src/town/content/workshop-cars.js';
import {loadWastelandVehicle, wastelandModelUrl} from '../src/wasteland-vehicles.js';
import {createVehicleAssets} from '../src/vehicle-assets.js';
import {ensureVehicleSockets} from '../src/vehicle-sockets.js';
import {prepareVehicleGrounding} from '../src/vehicle-grounding.js';
import {updateVehicleDamage} from '../src/vehicles.js';
import {applyVehiclePaint} from '../src/vehicle-paint.js';

globalThis.ProgressEvent ??= class {constructor(type, props) {Object.assign(this, {type}, props);}};
const flags = {enabled: name => name === 'wasteland-cars'};
const factories = new Map();
for (const [id, definition] of Object.entries(WORKSHOP_CARS)) {
  // Parse the shipped mesh buffers. Images need a browser decoder, so these
  // headless geometry checks omit texture bindings, never substitute geometry.
  const bytes = await readFile(new URL('../public' + wastelandModelUrl(id), import.meta.url));
  const length = bytes.readUInt32LE(12), gltf = JSON.parse(bytes.subarray(20, 20 + length));
  gltf.buffers[0].uri = 'data:application/octet-stream;base64,' + bytes.subarray(28 + length).toString('base64');
  const stripTextures = object => {
    for (const key of Object.keys(object)) {
      if (key.endsWith('Texture')) delete object[key];
      else if (object[key] && typeof object[key] === 'object') stripTextures(object[key]);
    }
  };
  gltf.materials.forEach(stripTextures);
  delete gltf.images; delete gltf.textures;
  const asset = await new GLTFLoader().parseAsync(JSON.stringify(gltf), '');
  const factory = await loadWastelandVehicle(id, {loadAsset: async url => {
    assert.equal(url, wastelandModelUrl(id)); return asset;
  }});
  factories.set(id, factory);
  const vehicle = factory(), other = factory(), data = vehicle.userData;
  assert.equal(data.wheels.length, id === 'longhaul' ? 6 : 4, `${id}: all authored wheels roll`);
  assert.equal(data.wheelPivots.filter(pivot => pivot.userData.front).length, 2);
  const ground = prepareVehicleGrounding(vehicle);
  assert.ok(Math.abs(ground.contactY) < .02, `${id}: tyres stand on the ground (${ground.contactY})`);
  assert.ok(ground.wheels.every(wheel => wheel.radius > .3 && wheel.radius < .9));
  if (id === 'rattler') {
    assert.ok(Math.abs(ground.wheels[0].radius - .38) < .01);
    assert.ok(Math.abs(ground.wheels[2].radius - .51) < .01);
  }
  assert.ok(Math.abs(data.size.width - definition.spec.collision.halfWidth * 2) < .003);
  assert.ok(Math.abs(data.size.length - definition.spec.collision.halfLength * 2) < .003);
  assert.ok(Math.abs(data.size.height - definition.spec.height) < .003);
  assert.equal(Object.keys(ensureVehicleSockets(vehicle)).length, 8);
  assert.ok(data.driver && data.steeringPivot && data.brakeLights.length && data.boostFlames.length);
  let vertices = 0, draws = 0;
  vehicle.traverse(node => {if (node.isMesh) {vertices += node.geometry.attributes.position.count; draws++;}});
  assert.ok(vertices > 10000, `${id}: the full model is installed`);
  assert.ok(draws < 80, `${id}: source parts batch into ${draws} draws`);
  const before = data.damageMeshes.map(({mesh}) => mesh.geometry.attributes.position.array.slice());
  const untouched = other.userData.damageMeshes.map(({mesh}) => mesh.geometry.attributes.position.array.slice());
  updateVehicleDamage(vehicle, 3, false, 0, {front: 1, rear: .5, left: .8, right: .2});
  assert.ok(data.damageMeshes.some(({mesh}, i) => mesh.geometry.attributes.position.array.some((value, j) => value !== before[i][j])), `${id}: body dents`);
  other.userData.damageMeshes.forEach(({mesh}, i) => assert.deepEqual(mesh.geometry.attributes.position.array, untouched[i], `${id}: another instance keeps its body`));
  updateVehicleDamage(vehicle, 0, false, 0, {front: 0, rear: 0, left: 0, right: 0});
  data.damageMeshes.forEach(({mesh}, i) => assert.deepEqual(mesh.geometry.attributes.position.array, before[i], `${id}: exact reset`));
  applyVehiclePaint(vehicle, {id: 'test', color: 0x243688});
  assert.notEqual(data.paint.color.getHex(), other.userData.paint.color.getHex(), 'paint is private');
  console.log(`PASS ${id}: ${vertices / 3} triangles, ${draws} draws, ${data.wheels.length} wheels, grounding, sockets and private damage.`);
}
let loads = 0;
const assets = createVehicleAssets({flags, loadWasteland: async id => {loads++; return factories.get(id);}});
for (const id of Object.keys(WORKSHOP_CARS)) {
  assert.equal(assets.source(id), 'wasteland');
  assert.equal(assets.create(id), null, 'no placeholder while the model loads');
  const first = assets.load(id), second = assets.load(id);
  assert.equal(first, second, 'one in-flight load per car');
  assert.equal(await first, true);
  assert.equal(assets.create(id).userData.vehicleKey, id);
}
assert.equal(loads, 4);
const off = createVehicleAssets({flags: {enabled: () => false}, loadWasteland: () => {throw Error('must not load');}});
assert.equal(await off.load('rattler'), false);
assert.equal(off.create('rattler'), null);
let attempts = 0;
const retry = createVehicleAssets({flags, loadWasteland: async id => {
  if (++attempts === 1) throw Error('offline'); return factories.get(id);
}});
assert.equal(await retry.load('bully'), false);
assert.equal(await retry.load('bully'), false);
assert.equal(attempts, 1, 'no request loop after failure');
assert.equal(await retry.load('bully', {retry: true}), true);
assert.equal(retry.status('bully'), 'ready');
console.log('PASS: Workshop asset routing, switch isolation, concurrent loads and retry.');
