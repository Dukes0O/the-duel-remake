// Original R34 geometry and the production animation/damage/grounding contract.
// Headless and private: no player storage, browser or rendering context.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { createSkylineVehicle as createUnloadedSkylineVehicle, loadSkylineVehicle, SKYLINE_MODEL_URL, SKYLINE_VEHICLE_DIMENSIONS } from '../src/skyline-vehicle.js';
import { updateVehicleDamage, updateNpcVehicleDamage } from '../src/vehicles.js';
import { updateDriver } from '../src/driver.js';
import { prepareVehicleGrounding, placeGroundedVehicle, applyVehicleTerrainPose, TIRE_CLEARANCE } from '../src/vehicle-grounding.js';
import { disposeTree } from '../src/world.js';

let checks = 0;
const ok = (condition, label) => { assert.ok(condition, label); checks++; };
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const near = (actual, expected, epsilon, label) => ok(Math.abs(actual - expected) <= epsilon, `${label}: ${actual} vs ${expected}`);
const bytes = await readFile(new URL('../public' + SKYLINE_MODEL_URL, import.meta.url));
const source = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const createSkylineVehicle = await loadSkylineVehicle({ loadAsset: async () => source });
equal(createUnloadedSkylineVehicle(), null, 'No primitive placeholder before the shell loads');
const vehicle = createSkylineVehicle(), data = vehicle.userData;
equal(createSkylineVehicle({ key: 'ferrari_enzo' }), null, 'Other cars never substitute the Skyline');
equal(createSkylineVehicle({ key: '__proto__' }), null, 'Inherited names cannot select the Skyline');
equal(vehicle.name, 'nissan_skyline_gtr_r34', 'Stable model key');
equal(data.size, SKYLINE_VEHICLE_DIMENSIONS.nissan_skyline_gtr_r34, 'Model dimensions agree with the contract');
equal(data.paint.color.getHex(), 0x1b3d8c, 'Default Bayside Blue paint');
equal(data.wheels.length, 4, 'Four animated wheels');
equal(data.wheelPivots.filter(p => p.userData.front).length, 2, 'Only two front steering pivots');
ok(data.driver && data.steeringPivot && data.brakeLights.length > 0 && data.boostFlames.length === 1, 'Driver, steering, brake and boost hooks exist');
near(data.driver.position.x, .34, 1e-12, 'Driver uses the left seat');
near(data.steeringPivot.position.x, .34, 1e-12, 'Steering wheel uses the left seat');

let triangles = 0, draws = 0;
const bounds = new THREE.Box3();
vehicle.traverseVisible(mesh => {
  if (!mesh.isMesh) return;
  const geometry = mesh.geometry;
  ok(geometry.attributes.position.array.every(Number.isFinite), `${mesh.name}: finite vertices`);
  ok(geometry.attributes.normal.array.every(Number.isFinite), `${mesh.name}: finite normals`);
  bounds.union(new THREE.Box3().setFromBufferAttribute(geometry.attributes.position).applyMatrix4(mesh.matrixWorld));
  triangles += (geometry.index?.count ?? geometry.attributes.position.count) / 3; draws++;
});
const size = bounds.getSize(new THREE.Vector3());
near(size.x, 1.96, .025, 'Model width matches its collision footprint');
near(size.z, 4.60, .06, 'Model length matches its collision footprint');
near(size.y, 1.36, .025, 'Solid coupe roof matches declared height');
ok(triangles <= 60000 && draws <= 56, `Budget: ${triangles} triangles / ${draws} draws`);

const paint = data.damageMeshes.filter(({mesh}) => mesh.material === data.paint).map(({mesh}) => mesh);
const ray = new THREE.Raycaster();
const roof = new THREE.Box3().setFromObject(data.driver);
ray.set(new THREE.Vector3(.34, 2, .02), new THREE.Vector3(0,-1,0));
const roofHit = ray.intersectObjects(paint)[0];
ok(roofHit && roof.max.y < roofHit.point.y - .02, 'Helmet clears the actual solid roof by at least 2 cm');
for (const side of [-1,1]) {
  ray.set(new THREE.Vector3(side*.46,.655,4),new THREE.Vector3(0,0,-1));
  const lamps = data.damageMeshes.filter(({mesh}) => mesh.material.name === 'Headlamp lenses').map(({mesh})=>mesh);
  ok(lamps.includes(ray.intersectObjects([...paint,...lamps])[0]?.object), 'Front lens is exposed');
  for(const x of [.405,.58]) {
    ray.set(new THREE.Vector3(side*x,.84,-4),new THREE.Vector3(0,0,1));
    ok(data.brakeLights.includes(ray.intersectObjects([...paint,...data.brakeLights])[0]?.object), 'Round tail lamp is exposed');
  }
}
ok(data.fractures.length === 4 && data.fractures.every(f => f.rest.length >= 60), 'Four actual glazing fracture zones');
console.log('Skyline glazing fracture floats: '+JSON.stringify(Object.fromEntries(data.fractures.map(f=>[f.zone,f.rest.length]))));
for (const steering of [-1, 0, 1]) {
  updateDriver(data.driver, steering, .13);
  for (const arm of data.driver.userData.arms) ok(arm.hand.position.toArray().every(Number.isFinite), 'Driver steering animation stays finite');
}
updateDriver(data.driver, 0);

const grounding = prepareVehicleGrounding(vehicle);
near(grounding.contactY, 0, .001, 'All tires touch local y=0');
equal(grounding.wheels.length, 4, 'All four wheels support grounding');
for (const wheel of grounding.wheels) near(wheel.radius, .37, .001, 'Actual tire radius');
placeGroundedVehicle(vehicle, { x: 2, y: 5, z: 7, heading: 1.2 }, 0, 1);
near(vehicle.position.y + grounding.contactY, 5 + TIRE_CLEARANCE, .0001, 'World grounding adds only tire clearance');
for (const wheel of data.wheels) near(wheel.rotation.x, 1 / .37, .001, 'Wheel travel uses actual radius');
vehicle.position.set(0, 0, 0); vehicle.rotation.set(0, 0, 0);
for (const wheel of data.wheels) wheel.rotation.set(0, 0, 0);
vehicle.updateMatrixWorld(true);

const clean = { front: 0, rear: 0, left: 0, right: 0 };
const sibling = createSkylineVehicle({ color: 0x3155aa, accent: 0xc1a427 });
const siblingVertices = sibling.userData.damageMeshes.map(({ mesh }) => mesh.geometry.attributes.position.array.slice());
const inventory = []; vehicle.traverse(node => inventory.push([node, node.geometry, node.material]));
for (const zone of Object.keys(clean)) {
  updateVehicleDamage(vehicle, 2, false, 0, { ...clean, [zone]: 2 });
  let moved = 0, wear = 0;
  for (const { mesh, rest } of data.damageMeshes) {
    const positions = mesh.geometry.attributes.position.array;
    ok(positions.every(Number.isFinite), `${zone}: damaged vertices remain finite`);
    for (let i = 0; i < rest.length; i++) if (Math.abs(positions[i] - rest[i]) > .004) moved++;
    for (const amount of mesh.geometry.attributes.panelWear.array) wear = Math.max(wear, amount);
  }
  ok(moved > 100 && wear > .4, `${zone}: visible localized dents and wear`);
  ok(data.fractures.find(f => f.zone === zone).mesh.visible, `${zone}: matching glass fracture visible`);
}
updateNpcVehicleDamage(vehicle, { damageZones: clean, crushDamage: .8 });
let roofDrop = 0;
for (const { mesh, rest } of data.damageMeshes) for (let i = 1; i < rest.length; i += 3) roofDrop = Math.max(roofDrop, rest[i] - mesh.geometry.attributes.position.array[i]);
ok(roofDrop > .30, 'Crush visibly lowers the roof');
ok(!data.driver.visible && !data.steeringPivot.visible, 'Crushed cabin hides intact animated parts');
const versions = data.damageMeshes.map(({ mesh }) => mesh.geometry.attributes.position.version);
for (let i = 0; i < 30; i++) ok(!updateNpcVehicleDamage(vehicle, { damageZones: clean, crushDamage: .8 }), 'Unchanged wreck skips buffer rewrites');
equal(data.damageMeshes.map(({ mesh }) => mesh.geometry.attributes.position.version), versions, 'Stable wreck does not upload its mesh repeatedly');
updateVehicleDamage(vehicle, 4, true, 2, { front: 2, rear: 1, left: 1, right: 2 }, .8);
updateNpcVehicleDamage(vehicle, null);
for (const { mesh, rest, normals } of data.damageMeshes) {
  equal(mesh.geometry.attributes.position.array, rest, 'Exact body vertex reset');
  equal(mesh.geometry.attributes.normal.array, normals, 'Exact smooth-normal reset');
  ok(mesh.geometry.attributes.panelWear.array.every(value => value === 0), 'Exact wear reset');
}
for (const pivot of data.wheelPivots) {
  equal(pivot.position.toArray(), pivot.userData.restPosition.toArray(), 'Wheel location resets');
  equal(pivot.scale.toArray(), [1, 1, 1], 'Wheel scale resets');
  ok(pivot.visible && pivot.rotation.z === 0, 'Detached wheel reappears upright');
}
equal(data.paint.color.getHex(), data.originalColor.getHex(), 'Factory paint restored');
ok(data.driver.visible && data.steeringPivot.visible && data.fractures.every(f => !f.mesh.visible), 'Cabin visibility resets');
const after = []; vehicle.traverse(node => after.push([node, node.geometry, node.material]));
equal(after, inventory, 'Damage and reset create no leaked assets');
equal(sibling.userData.damageMeshes.map(({ mesh }) => mesh.geometry.attributes.position.array), siblingVertices, 'Damage cannot alter a sibling car');
equal(sibling.userData.paint.color.getHex(), 0x3155aa, 'Sibling keeps selected paint');
ok(sibling.userData.paint !== data.paint, 'Instances have private paint materials');
const vertex = new THREE.Vector3();
for (const pitch of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
  placeGroundedVehicle(vehicle, { x: 0, y: 10, z: 0, heading: .6 });
  applyVehicleTerrainPose(vehicle, { groundAt: () => ({ y: 10 }) }, { s: 0, lateral: 0, groundHeight: 10, terrainPitch: pitch, terrainRoll: .2, tumble: true });
  vehicle.updateMatrixWorld(true); let minimumY = Infinity;
  vehicle.traverseVisible(mesh => {
    if (!mesh.isMesh || mesh === data.contactShadow) return;
    const positions = mesh.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) minimumY = Math.min(minimumY, vertex.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).y);
  });
  ok(minimumY >= 10 - .000001, 'Tumble keeps physical body above support');
}
disposeTree(vehicle); disposeTree(sibling);
const {createVehicleAssets} = await import('../src/vehicle-assets.js');
const {createFeatureFlags} = await import('../src/feature-flags.js');
const off = createVehicleAssets({flags:createFeatureFlags({storage:null,qa:false})});
equal(off.source('nissan_skyline_gtr_r34'),null,'Dev car is unavailable in release');
equal(off.create('nissan_skyline_gtr_r34'),null,'Disabled model cannot be constructed through registry');
const on = createVehicleAssets({loadSkyline: async () => createSkylineVehicle, flags:createFeatureFlags({storage:null,qa:true,search:'?flags=nissan-skyline'})});
equal(on.status('nissan_skyline_gtr_r34'),'idle','GLB shell starts unloaded');
equal(on.create('nissan_skyline_gtr_r34'),null,'No fallback body while unloaded');
const firstLoad = on.load('nissan_skyline_gtr_r34');
equal(on.status('nissan_skyline_gtr_r34'),'loading','GLB load is visible to the caller');
equal(firstLoad,on.load('nissan_skyline_gtr_r34'),'Concurrent loads share one promise');
ok(await firstLoad,'GLB shell loads');
equal(on.status('nissan_skyline_gtr_r34'),'ready','Preloaded model creates synchronously');
const registered = on.create('nissan_skyline_gtr_r34');
equal(registered.name,'nissan_skyline_gtr_r34','Dev registry creates the original body without a shop entry');
disposeTree(registered);
let attempts = 0;
const broken = createVehicleAssets({ loadSkyline: async () => { attempts++; throw Error('Expected missing GLB'); }, flags:createFeatureFlags({storage:null,qa:true,search:'?flags=nissan-skyline'}) });
ok(!await broken.load('nissan_skyline_gtr_r34'),'Failed import is reported');
equal(broken.status('nissan_skyline_gtr_r34'),'error','Failed shell stays unavailable');
equal(broken.create('nissan_skyline_gtr_r34'),null,'Failed import never creates a substitute');
ok(!await broken.load('nissan_skyline_gtr_r34'),'Failure is cached');
equal(attempts,1,'No automatic repeated requests');
ok(!await broken.load('nissan_skyline_gtr_r34',{retry:true}),'Explicit retry reports failure');
equal(attempts,2,'Explicit retry issues one new request');
await assert.rejects(loadSkylineVehicle({loadAsset:async()=>({scene:new THREE.Group()})}), /missing paint or glass/);
checks++;
console.log(`Skyline: ${checks} checks; ${triangles} triangles / ${draws} draws (limits 60000 / 56). No storage accessed.`);
