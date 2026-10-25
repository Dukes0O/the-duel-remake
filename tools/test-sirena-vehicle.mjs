// SIRENA-ART: the restored Falcone Sirena (the vehicle contract the other cars
// pass: driver, steering, four wheels, brake lights, paint, damage, crush, exact
// reset) and the underwater models cut from the same body (wreck, five loose
// parts, lift bag, abalone). Headless; no storage. The car is not yet in the
// roster (SIRENA-CAR adds `falcone_sirena` to the config), so nothing here
// reads CARS.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createSirenaVehicle, SIRENA_VEHICLE_DIMENSIONS } from '../src/sirena-vehicle.js';
import { createClassicVehicle } from '../src/classic-vehicles.js';
import { createUnlockedVehicle } from '../src/unlock-vehicles.js';
import { updateVehicleDamage, updateNpcVehicleDamage } from '../src/vehicles.js';
import { updateDriver } from '../src/driver.js';
import { prepareVehicleGrounding, placeGroundedVehicle, applyVehicleTerrainPose, TIRE_CLEARANCE } from '../src/vehicle-grounding.js';
import { disposeTree } from '../src/world.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const MAX_TRIANGLES = 73600, MAX_DRAWS = 66; // the Jesko's size, the card's budget for the car
const PROPS_BYTES = 1.5 * 1024 * 1024;       // wreck, parts, bag and shell together
let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const equal = (value, expected, label) => { assert.deepEqual(value, expected, label); checks++; };
const near = (a, b, tolerance, label) => ok(Math.abs(a - b) <= tolerance, `${label}: ${a} vs ${b}`);

// 1. The contract.
const vehicle = createSirenaVehicle(), d = vehicle.userData;
equal(createSirenaVehicle({ key: 'falcone_f42' }), null, 'Unsupported keys do not substitute the Sirena');
equal(createSirenaVehicle({ key: '__proto__' }), null, 'Prototype keys cannot select a car');
equal(vehicle.name, 'falcone_sirena', 'Stable semantic mesh key');
equal(d.size, SIRENA_VEHICLE_DIMENSIONS.falcone_sirena, 'Metadata matches the physical model contract');
equal(d.designFeatures, ['long-nose', 'covered-headlights', 'door-roundel-7', 'wire-wheels', 'kamm-tail', 'nose-stripe'], 'Distinct silhouette features');
equal(d.wheels.length, 4, 'Four animated wheels');
equal(d.wheelPivots.filter(p => p.userData.front).length, 2, 'Only the front axle steers');
ok(d.driver && d.steeringPivot && d.brakeLights.length && d.boostFlames.length === 2, 'Production driver, brake and boost hooks (two tail pipes)');

// 2. Bounds and the size budget.
const bounds = new THREE.Box3(); let triangles = 0, draws = 0;
vehicle.traverseVisible(mesh => {
  if (!mesh.isMesh) return;
  const g = mesh.geometry;
  ok(g.attributes.position.array.every(Number.isFinite), `${mesh.name}: finite vertices`);
  ok(g.attributes.normal?.array.every(Number.isFinite), `${mesh.name}: finite normals`);
  bounds.union(new THREE.Box3().setFromBufferAttribute(g.attributes.position).applyMatrix4(mesh.matrixWorld));
  triangles += (g.index?.count ?? g.attributes.position.count) / 3; draws++;
});
const size = bounds.getSize(new THREE.Vector3());
near(size.x, d.size.width, .025, 'Trim stays within 2.5cm of the declared width');
near(size.z, d.size.length, .025, 'Trim stays within 2.5cm of the declared length');
near(size.y, d.size.height, .025, 'Declared height is the whole car');
ok(triangles <= MAX_TRIANGLES && draws <= MAX_DRAWS, `Size budget: ${triangles} triangles (at most ${MAX_TRIANGLES}) and ${draws} draws (at most ${MAX_DRAWS})`);

// 3. Tires and the ground.
const meta = prepareVehicleGrounding(vehicle);
near(meta.contactY, 0, .001, 'Tires define the local ground plane');
equal(meta.wheels.length, 4, 'Grounding includes all four tires');
for (const wheel of meta.wheels) near(wheel.radius, d.size.wheelRadius, .001, 'Actual wheel radius');
const wheelNodes = new Set(); for (const wheel of d.wheels) wheel.traverse(node => wheelNodes.add(node));
d.driver.traverse(node => wheelNodes.add(node)); // the seated driver's boots lie below the sill by design
let bodyFloor = Infinity; const vertex = new THREE.Vector3();
vehicle.traverseVisible(mesh => {
  if (!mesh.isMesh || wheelNodes.has(mesh) || mesh === d.contactShadow) return;
  const p = mesh.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) bodyFloor = Math.min(bodyFloor, vertex.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld).y);
});
ok(bodyFloor > .10, 'Body stays above the tire plane');
near(bodyFloor, .16, .03, 'The floor and sills stand about 16 cm off the ground');
placeGroundedVehicle(vehicle, { x: 2, y: 5, z: 7, heading: 1.2 }, 0, 1);
near(vehicle.position.y + meta.contactY, 5 + TIRE_CLEARANCE, .0001, 'Flat-surface grounding');
for (const wheel of d.wheels) near(wheel.rotation.x, 1 / d.size.wheelRadius, .001, 'Travel-based wheel animation');
vehicle.position.set(0, 0, 0); vehicle.rotation.set(0, 0, 0); for (const wheel of d.wheels) wheel.rotation.set(0, 0, 0); vehicle.updateMatrixWorld(true);
// Wire wheels: many thin spokes in each wheel, not a solid disc.
for (const wheel of d.wheels) {
  let boxes = 0; wheel.traverse(node => { if (node.isMesh && node.material.name === 'Dull chrome') boxes = node.geometry.attributes.position.count / 24; });
  ok(boxes > 40, 'Each wheel carries a rim, a spinner and dozens of spokes');
}

// 4. Its own shape: closed glass cabin, a seated driver inside it, long nose, door roundels.
const skins = d.damageMeshes.filter(item => item.mesh.material === d.paint).map(item => item.mesh);
const glass = d.damageMeshes.filter(item => /^glass$/i.test(item.mesh.material.name)).map(item => item.mesh);
const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
const heightAt = (meshes, x, z) => { ray.set(new THREE.Vector3(x, 3, z), down); return ray.intersectObjects(meshes, false)[0]?.point.y; };
const helmet = new THREE.Box3(); d.driver.traverse(node => { if (node.isMesh) helmet.union(new THREE.Box3().setFromBufferAttribute(node.geometry.attributes.position).applyMatrix4(node.matrixWorld)); });
ok(helmet.max.y < (heightAt(skins, d.driver.position.x, d.driver.position.z) ?? 9) - .005, 'The helmet stays under the roof');
for (const z of [-.7, -.4, -.1]) ok(heightAt(skins, 0, z) > .9, `A solid roof over the cabin at z ${z}`);
for (const z of [.1, .3]) ok(heightAt(glass, 0, z) > .7, `The raked windscreen glass at z ${z}`);
ok(heightAt(glass, 0, -1.1) > .75, 'The rear window glass');
ok((heightAt(skins, 0, 1.6) ?? 0) > .55 && heightAt(skins, 0, 1.6) < .80, 'A long bonnet at wing height');
ok(bounds.max.z > d.wheelPivots.find(p => p.userData.front).position.z + .9, 'The nose runs more than 90 cm ahead of the front axle (long-nosed)');
ok(-bounds.min.z < -d.wheelPivots.find(p => !p.userData.front).position.z + 1.1, 'The tail behind the rear axle is short (cut off)');
const lamps = d.damageMeshes.filter(item => item.mesh.material.name === 'Glass lamp covers');
ok(lamps.length === 1 && lamps[0].mesh.geometry.attributes.position.count >= 60, 'Both headlamps sit behind perspex covers');
ok(d.damageMeshes.some(item => item.mesh.material.name === 'White livery'), 'The white nose stripe and roundels are on the body');
ok(d.damageMeshes.some(item => item.mesh.material.name === 'Door numeral'), 'The number 7 is on the doors');
// The numeral sits on both doors: a side ray through the roundel hits the numeral or the white roundel.
const roundelHits = side => { ray.set(new THREE.Vector3(side * 3, .40, -.34), new THREE.Vector3(-side, 0, 0)); return ray.intersectObjects(d.damageMeshes.filter(i => ['White livery', 'Door numeral'].includes(i.mesh.material.name)).map(i => i.mesh), false).length; };
ok(roundelHits(1) > 0 && roundelHits(-1) > 0, 'A roundel on each door');
ok(d.fractures.length === 4 && d.fractures.every(f => f.rest.length >= 60), 'Four glazing damage zones, all lying on real glass');
for (const steer of [-1, -.5, 0, .5, 1]) { updateDriver(d.driver, steer, .14); for (const arm of d.driver.userData.arms) ok(arm.hand.position.toArray().every(Number.isFinite), 'Finite driver steering pose'); }
updateDriver(d.driver, 0);
for (const other of [createClassicVehicle({ key: 'falcone_f42', color: 0x9c1217 }), createClassicVehicle({ key: 'stuttgart_959s', color: 0x9c1217 }), createUnlockedVehicle({ key: 'viper_proto', color: 0x9c1217 })]) {
  const otherSkin = other.userData.damageMeshes.filter(item => item.mesh.material === other.userData.paint).map(item => item.mesh);
  let samples = 0, squared = 0, maximum = 0;
  for (let z = -2.0; z < 2.1; z += .17) for (const x of [-.7, -.4, -.15, 0, .15, .4, .7]) {
    const a = heightAt(skins, x, z), b = heightAt(otherSkin, x, z); if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    const delta = Math.abs(a - b); samples++; squared += delta * delta; maximum = Math.max(maximum, delta);
  }
  ok(samples > 60 && Math.sqrt(squared / samples) > .04 && maximum > .12, `${other.name}: materially different same-paint silhouette`); disposeTree(other);
}

// 5. Directional damage, crush and exact reset.
const clean = { front: 0, rear: 0, left: 0, right: 0 };
const sibling = createSirenaVehicle({ color: 0x5544cc, accent: 0xffcc22 });
const siblingVertices = sibling.userData.damageMeshes.map(({ mesh }) => mesh.geometry.attributes.position.array.slice());
const inventory = []; vehicle.traverse(mesh => inventory.push([mesh, mesh.geometry, mesh.material]));
for (const zone of ['front', 'rear', 'left', 'right']) {
  updateVehicleDamage(vehicle, 2, false, 0, { ...clean, [zone]: 2 }); let moved = 0, wear = 0;
  for (const item of d.damageMeshes) {
    const p = item.mesh.geometry.attributes.position.array; ok(p.every(Number.isFinite), `${zone}: finite damaged vertices`);
    for (let i = 0; i < p.length; i++) if (Math.abs(p[i] - item.rest[i]) > .004) moved++;
    for (const amount of item.mesh.geometry.attributes.panelWear.array) wear = Math.max(wear, amount);
  }
  ok(moved > 100 && wear > .4, `${zone}: visible localized deformation and wear`);
  ok(d.fractures.find(f => f.zone === zone).mesh.visible, `${zone}: correct fracture visible`);
}
updateNpcVehicleDamage(vehicle, { damageZones: clean, crushDamage: .8 }); let roofDrop = 0;
for (const { mesh, rest } of d.damageMeshes) for (let i = 1; i < rest.length; i += 3) roofDrop = Math.max(roofDrop, rest[i] - mesh.geometry.attributes.position.array[i]);
ok(roofDrop > .25, 'Monster truck visibly collapses the car');
ok(!d.driver.visible && !d.steeringPivot.visible, 'Intact cabin accessories do not protrude through the crushed roof');
const versions = d.damageMeshes.map(({ mesh }) => mesh.geometry.attributes.position.version);
for (let i = 0; i < 120; i++) ok(!updateNpcVehicleDamage(vehicle, { damageZones: clean, crushDamage: .8 }), 'Stable wreck skips buffer rewrites');
equal(d.damageMeshes.map(({ mesh }) => mesh.geometry.attributes.position.version), versions, 'No repeated crushed-geometry uploads');
updateVehicleDamage(vehicle, 4, true, 2, { front: 2, rear: 1, left: 1, right: 2 }, .8); updateNpcVehicleDamage(vehicle, null);
for (const { mesh, rest, normals } of d.damageMeshes) {
  equal(mesh.geometry.attributes.position.array, rest, 'Body geometry resets exactly'); equal(mesh.geometry.attributes.normal.array, normals, 'Smooth normals reset exactly');
  ok(mesh.geometry.attributes.panelWear.array.every(n => n === 0), 'Wear resets exactly');
}
for (const pivot of d.wheelPivots) {
  equal(pivot.position.toArray(), pivot.userData.restPosition.toArray(), 'Wheel position resets'); equal(pivot.scale.toArray(), [1, 1, 1], 'Wheel dimensions reset'); ok(pivot.visible && pivot.rotation.z === 0, 'Detached wheels restored');
}
equal(d.paint.color.getHex(), d.originalColor.getHex(), 'Factory paint restored');
ok(d.driver.visible && d.steeringPivot.visible && d.fractures.every(f => !f.mesh.visible), 'Cabin visibility restored');
const after = []; vehicle.traverse(mesh => after.push([mesh, mesh.geometry, mesh.material])); equal(after, inventory, 'Damage leaves no extra assets');
equal(sibling.userData.damageMeshes.map(({ mesh }) => mesh.geometry.attributes.position.array), siblingVertices, 'Damage cannot leak to sibling instance');
equal(sibling.userData.paint.color.getHex(), 0x5544cc, 'Sibling paint remains unchanged'); ok(sibling.userData.paint !== d.paint, 'Materials are private');

// 6. Tumbling keeps the actual body above the support.
for (const pitch of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
  placeGroundedVehicle(vehicle, { x: 0, y: 10, z: 0, heading: .6 });
  applyVehicleTerrainPose(vehicle, { groundAt: () => ({ y: 10 }) }, { s: 0, lateral: 0, groundHeight: 10, terrainPitch: pitch, terrainRoll: .2, tumble: true }); vehicle.updateMatrixWorld(true); let minY = Infinity;
  vehicle.traverseVisible(mesh => { if (!mesh.isMesh || mesh === d.contactShadow) return; const p = mesh.geometry.attributes.position; for (let i = 0; i < p.count; i++) minY = Math.min(minY, vertex.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld).y); });
  ok(minY >= 10 - .000001, 'Tumble keeps actual body above physical support');
}
disposeTree(vehicle); disposeTree(sibling);

// 7. The underwater models: committed bytes match the manifest and rebuild exactly from the recipe.
const modelDir = join(root, 'public/assets/models/sirena');
const manifest = JSON.parse(readFileSync(join(modelDir, 'manifest.json'), 'utf8'));
const IDS = ['wreck', 'wreck-hull', 'badge', 'steering-wheel', 'wheel', 'bonnet', 'door', 'lift-bag', 'abalone'];
equal(manifest.models.map(model => model.id), IDS, 'The wreck, its hull alone for the Lab\'s tank, five loose parts, lift bag and abalone');
let total = 0;
for (const model of manifest.models) {
  const bytes = readFileSync(join(modelDir, `${model.id}.glb`));
  total += bytes.length;
  equal([bytes.length, createHash('sha256').update(bytes).digest('hex')], [model.bytes, model.sha256], `${model.id}: bytes match the manifest`);
}
ok(total <= PROPS_BYTES && manifest.totalBytes === total, `Together ${total} bytes, at most ${PROPS_BYTES}`);
const loader = new GLTFLoader(), size3 = new THREE.Vector3();
const loaded = {};
for (const model of manifest.models) {
  const bytes = readFileSync(join(modelDir, `${model.id}.glb`));
  const gltf = await new Promise((resolve, reject) => loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', resolve, reject));
  const meshes = []; gltf.scene.traverse(node => { if (node.isMesh) meshes.push(node); });
  equal(meshes.length, 1, `${model.id}: one mesh, one draw`);
  const g = meshes[0].geometry;
  ok(g.attributes.color && g.attributes.position.array.every(Number.isFinite), `${model.id}: finite vertices with colours`);
  const box = new THREE.Box3().setFromBufferAttribute(g.attributes.position);
  near(box.min.y, ['wreck', 'wreck-hull'].includes(model.id) ? box.min.y : 0, 1e-4, `${model.id}: rests on the floor`);
  box.getSize(size3); loaded[model.id] = size3.clone();
  equal(g.index.count / 3, model.triangles, `${model.id}: triangle count matches the manifest`);
}
// Real-world sizes in metres.
ok(loaded.wreck.x > 3 && loaded.wreck.z > 4.5 && loaded.wreck.y > 1.0 && loaded.wreck.y < 1.4, 'The wreck is car-sized with its sand and stands about a metre out of it');
// LAB-RESTORE: the hull alone is the same wreck cut from its sand, so the tank holds a car and no sandbank.
ok(loaded['wreck-hull'].x < 2.3 && loaded['wreck-hull'].x > 1.8 && loaded['wreck-hull'].z > 4.0 && loaded['wreck-hull'].z < 5.0, 'The hull is car-sized (about 2 m wide, 4 m and more long) with no sand mound around it');
ok(loaded['wreck-hull'].x < loaded.wreck.x - 1 && manifest.models.find(m => m.id === 'wreck-hull').triangles < manifest.models.find(m => m.id === 'wreck').triangles, 'The hull is the wreck without its sand');
near(loaded.badge.x, .124, .02, 'The badge is about 12 cm across');
near(loaded['steering-wheel'].x, .40, .06, 'The steering wheel is about 40 cm');
near(loaded.wheel.y, .25, .06, 'The wheel lies on its side, about 25 cm thick');
ok(loaded.bonnet.z > 1.2 && loaded.bonnet.x > .9, 'The bonnet is the real bonnet of the car, between the wing seams');
ok(Math.max(loaded.door.x, loaded.door.z) > .9 && loaded.door.y > .4 && loaded.door.y < .9, 'The door leans on its edge, about a metre long and half a metre high with its window frame');
ok(loaded['lift-bag'].y > 1.0 && loaded['lift-bag'].x < .9, 'The lift bag stands upright, about a metre tall');
ok(loaded.abalone.x > .15 && loaded.abalone.x < .35, 'The red abalone is a hand-sized shell on a small rock');
const scratch = join(root, '.qa-dist', `sirena-check-${process.pid}`);
mkdirSync(scratch, { recursive: true });
try {
  const run = spawnSync(process.execPath, [join(root, 'tools/art/sirena-props.mjs'), '--out', scratch], { cwd: root, encoding: 'utf8', windowsHide: true });
  equal(run.status, 0, run.stderr);
  for (const model of manifest.models) equal(createHash('sha256').update(readFileSync(join(scratch, `${model.id}.glb`))).digest('hex'), model.sha256, `${model.id}: rebuilds to the same bytes from the recipe`);
  equal(readFileSync(join(scratch, 'manifest.json'), 'utf8'), readFileSync(join(modelDir, 'manifest.json'), 'utf8'), 'The manifest rebuilds too');
} finally { rmSync(scratch, { recursive: true, force: true }); }
ok(!existsSync(scratch), 'The scratch folder is gone');
console.log(`Sirena: ${checks} checks; car ${triangles.toLocaleString()} triangles (limit ${MAX_TRIANGLES.toLocaleString()}) / ${draws} draws (limit ${MAX_DRAWS}); nine underwater models ${total.toLocaleString()} bytes (limit ${PROPS_BYTES.toLocaleString()}), rebuilt byte for byte.`);
