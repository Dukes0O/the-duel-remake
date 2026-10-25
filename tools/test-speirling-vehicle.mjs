// LAB-FAN-ART: the McMurtry Spéirling model (the vehicle contract the other cars
// pass: driver, steering, four wheels, brake lights, paint, damage, crush, exact
// reset), its own shape (closed canopy, roll hoop, twin rear fans, floor skirt,
// short and wide) and the Project Fan blueprint model. Headless; no storage. The
// car is not in the roster yet (LAB-FAN adds `mcmurtry_speirling` to the config),
// so nothing here reads CARS.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createSpeirlingVehicle, SPEIRLING_VEHICLE_DIMENSIONS } from '../src/speirling-vehicle.js';
import { createClassicVehicle } from '../src/classic-vehicles.js';
import { createBolideVehicle } from '../src/bolide-vehicle.js';
import { createUnlockedVehicle } from '../src/unlock-vehicles.js';
import { updateVehicleDamage, updateNpcVehicleDamage } from '../src/vehicles.js';
import { updateDriver } from '../src/driver.js';
import { prepareVehicleGrounding, placeGroundedVehicle, applyVehicleTerrainPose, TIRE_CLEARANCE } from '../src/vehicle-grounding.js';
import { disposeTree } from '../src/world.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const MAX_TRIANGLES = 50000, MAX_DRAWS = 66;           // under the Jesko's size: this card's own cap of 50k triangles
let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const equal = (value, expected, label) => { assert.deepEqual(value, expected, label); checks++; };
const near = (a, b, tolerance, label) => ok(Math.abs(a - b) <= tolerance, `${label}: ${a} vs ${b}`);

// 1. The contract.
const vehicle = createSpeirlingVehicle(), d = vehicle.userData;
equal(createSpeirlingVehicle({ key: 'bugatti_bolide' }), null, 'Unsupported keys do not substitute the Speirling');
equal(createSpeirlingVehicle({ key: '__proto__' }), null, 'Prototype keys cannot select a car');
equal(vehicle.name, 'mcmurtry_speirling', 'Stable semantic mesh key');
equal(d.size, SPEIRLING_VEHICLE_DIMENSIONS.mcmurtry_speirling, 'Metadata matches the physical model contract');
equal(d.designFeatures, ['low-wide-stance', 'bubble-canopy', 'tall-front-fenders', 'bat-wing-intake', 'rear-haunch-intakes', 'central-spine', 'rear-mesh-grilles', 'swan-neck-wing', 'floor-skirt'], 'Distinct silhouette features');
equal(d.wheels.length, 4, 'Four animated wheels');
equal(d.wheelPivots.filter(p => p.userData.front).length, 2, 'Only the front axle steers');
ok(d.driver && d.steeringPivot && d.brakeLights.length >= 1, 'Production driver, steering and brake hooks');
equal(d.boostFlames.length, 2, 'A nitro plume from each fan outlet');
equal(d.fans.length, 2, 'Two fans as nodes of their own, so a viewer can spin them');
for (const fan of d.fans) ok(Math.abs(fan.position.x) > .2 && fan.position.z < -1.3 && fan.position.y < .5, `${fan.name}: hidden inside the tail behind its exit, off to one side`);
equal(d.driver.position.x, 0, 'A single central seat');

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
ok(size.z > 3.0 && size.z < 3.6, 'About 3.3 m long: tiny');
ok(size.x > 1.5 && size.x < 1.7, 'About 1.6 m wide');
ok(size.y > 1.1 && size.y < 1.3, 'About a metre to the canopy, a little more to the wing');
ok(triangles <= MAX_TRIANGLES && draws <= MAX_DRAWS, `Size budget: ${triangles} triangles (at most ${MAX_TRIANGLES}) and ${draws} draws (at most ${MAX_DRAWS})`);

// 3. Tires and the ground.
const meta = prepareVehicleGrounding(vehicle);
near(meta.contactY, 0, .001, 'Tires define the local ground plane');
equal(meta.wheels.length, 4, 'Grounding includes all four tires');
for (const wheel of meta.wheels) near(wheel.radius, d.size.wheelRadius, .001, 'Actual wheel radius');
const skip = new Set(); for (const wheel of d.wheels) wheel.traverse(node => skip.add(node)); d.driver.traverse(node => skip.add(node));
let bodyFloor = Infinity; const vertex = new THREE.Vector3();
vehicle.traverseVisible(mesh => {
  if (!mesh.isMesh || skip.has(mesh) || mesh === d.contactShadow) return;
  const p = mesh.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) bodyFloor = Math.min(bodyFloor, vertex.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld).y);
});
ok(bodyFloor > .02 && bodyFloor < .06, 'The skirt runs almost touching the road (a few cm), never through it');
placeGroundedVehicle(vehicle, { x: 2, y: 5, z: 7, heading: 1.2 }, 0, 1);
near(vehicle.position.y + meta.contactY, 5 + TIRE_CLEARANCE, .0001, 'Flat-surface grounding');
for (const wheel of d.wheels) near(wheel.rotation.x, 1 / d.size.wheelRadius, .001, 'Travel-based wheel animation');
vehicle.position.set(0, 0, 0); vehicle.rotation.set(0, 0, 0); for (const wheel of d.wheels) wheel.rotation.set(0, 0, 0); vehicle.updateMatrixWorld(true);

// 4. Its own shape: a closed canopy over the seat, a roll hoop, skirts, fans, a raised nose.
const skins = d.damageMeshes.filter(item => item.mesh.material === d.paint).map(item => item.mesh);
const glass = d.damageMeshes.filter(item => /^glass$/i.test(item.mesh.material.name)).map(item => item.mesh);
const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
const heightAt = (meshes, x, z) => { ray.set(new THREE.Vector3(x, 3, z), down); return ray.intersectObjects(meshes, false)[0]?.point.y; };
const helmet = new THREE.Box3(); d.driver.traverse(node => { if (node.isMesh) helmet.union(new THREE.Box3().setFromBufferAttribute(node.geometry.attributes.position).applyMatrix4(node.matrixWorld)); });
const canopyTop = heightAt(glass, 0, .10);
ok(canopyTop > .95 && canopyTop < 1.06, 'The canopy tops out about a metre up');
ok(helmet.max.y < canopyTop - .05, 'The driver sits inside the bubble, under its top');
const glassBox = new THREE.Box3(); for (const mesh of glass) glassBox.union(new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position).applyMatrix4(mesh.matrixWorld));
ok(glassBox.max.x - glassBox.min.x < .62 && glassBox.max.x - glassBox.min.x > .4, 'A narrow central bubble');
ok(glassBox.min.y < .5, 'Its sides run down to the tub sill line');
ok(d.damageMeshes.some(item => item.mesh.material.name === 'Rubber skirt'), 'A rubber skirt tucked in at the floor edge');
for (const side of [-1, 1]) ok((heightAt(skins, side * .60, 1.06) ?? 0) > .80, `A tall front fender over the ${side > 0 ? 'left' : 'right'} wheel, higher than the nose`);
ok((heightAt(skins, 0, 1.55) ?? 9) < .45, 'A low flat nose between the fenders');
ok((heightAt(skins, .36, .10) ?? 0) > .40 && (heightAt(skins, .36, .10) ?? 0) < .56, 'The tub beside the cockpit is low and the canopy sits down in it');
for (const side of [-1, 1]) ok((heightAt(skins, side * .60, -1.06) ?? 0) > .70, 'A wide rear haunch over each rear wheel');
ok(bounds.max.y > .66 + .3 && bounds.max.y - 0 > heightAt(skins, 0, -1.5) + .3, 'A large wing standing well above the tail');
const wing = d.damageMeshes.filter(item => item.mesh.material.name === 'Black bodywork');
ok(wing.length > 0, 'Black bodywork: the lower body, intake, diffuser and wing');
// The rear: two large rectangular black mesh grilles either side of a tall dark central spine,
// red ring lights on the haunches, a diffuser; no round exits.
const darkParts = d.damageMeshes.filter(item => item.mesh.material.name === 'Dark machined metal');
ok(darkParts.length > 0, 'Dark mesh grilles on the tail');
for (const x of [-.27, .27]) { ray.set(new THREE.Vector3(x, .37, -3), new THREE.Vector3(0, 0, 1)); const hit = ray.intersectObjects(darkParts.map(item => item.mesh), false)[0]; ok(hit && hit.point.z < -1.6, `A black mesh grille at x ${x} on the tail face`); }
const blackParts = d.damageMeshes.filter(item => item.mesh.material.name === 'Black bodywork').map(item => item.mesh);
ray.set(new THREE.Vector3(0, .5, -3), new THREE.Vector3(0, 0, 1)); const spineHit = ray.intersectObjects(blackParts, false)[0];
ok(spineHit && spineHit.point.z < -1.1, 'A tall dark spine down the middle of the tail');
ray.set(new THREE.Vector3(0, 3, -.9), down); const spineTop = ray.intersectObjects(blackParts, false)[0];
ok(spineTop && spineTop.point.y > .7, 'The spine and its fin stand tall behind the cabin');
for (const side of [-1, 1]) { ray.set(new THREE.Vector3(side * .60 + .042, .50, -3), new THREE.Vector3(0, 0, 1)); const brake = ray.intersectObjects(d.brakeLights, false)[0]; ok(brake && brake.point.z < -1.5, `A round red ring light on the ${side > 0 ? 'left' : 'right'} haunch's rear face`); }
ray.set(new THREE.Vector3(0, .33, -3), new THREE.Vector3(0, 0, 1)); const diamond = ray.intersectObjects(d.brakeLights, false)[0];
ok(diamond && diamond.point.z < -1.65, 'A red diamond light low at the spine point');
// The nose: a wide black intake spanning the front between the fenders.
ray.set(new THREE.Vector3(0, .17, 5), new THREE.Vector3(0, 0, -1)); const noseHit = ray.intersectObjects(wing.map(item => item.mesh), false)[0];
ok(noseHit && noseHit.point.z > 1.6, 'A black intake across the nose');
ok(d.fractures.length === 4 && d.fractures.every(f => f.rest.length >= 60), 'Four glazing damage zones, all lying on real glass');
for (const steer of [-1, -.5, 0, .5, 1]) { updateDriver(d.driver, steer, .14); for (const arm of d.driver.userData.arms) ok(arm.hand.position.toArray().every(Number.isFinite), 'Finite driver steering pose'); }
updateDriver(d.driver, 0);
for (const other of [createBolideVehicle({ color: 0xe6e4dc }), createClassicVehicle({ key: 'falcone_f42', color: 0xe6e4dc }), createUnlockedVehicle({ key: 'viper_proto', color: 0xe6e4dc })]) {
  const otherSkin = other.userData.damageMeshes.filter(item => item.mesh.material === other.userData.paint).map(item => item.mesh);
  let samples = 0, squared = 0, maximum = 0;
  for (let z = -1.4; z < 1.5; z += .15) for (const x of [-.7, -.4, -.15, 0, .15, .4, .7]) {
    const a = heightAt(skins, x, z), b = heightAt(otherSkin, x, z); if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    const delta = Math.abs(a - b); samples++; squared += delta * delta; maximum = Math.max(maximum, delta);
  }
  ok(samples > 50 && Math.sqrt(squared / samples) > .04 && maximum > .12, `${other.name}: materially different same-paint silhouette`); disposeTree(other);
}

// 5. Directional damage, crush and exact reset.
const clean = { front: 0, rear: 0, left: 0, right: 0 };
const sibling = createSpeirlingVehicle({ color: 0x5544cc, accent: 0xffcc22 });
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

// 7. The Project Fan blueprint model: committed bytes match the manifest and rebuild exactly from the recipe.
const modelDir = join(root, 'public/assets/models/speirling');
const manifest = JSON.parse(readFileSync(join(modelDir, 'manifest.json'), 'utf8')), entry = manifest.models[0];
equal(manifest.models.map(model => model.id), ['project-fan'], 'One small model: the pinned blueprint');
const bytes = readFileSync(join(modelDir, 'project-fan.glb'));
equal([bytes.length, createHash('sha256').update(bytes).digest('hex')], [entry.bytes, entry.sha256], 'Bytes match the manifest');
ok(bytes.length < 600000, `A small file (${bytes.length} bytes)`);
const gltf = await new Promise((resolve, reject) => new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', resolve, reject));
const sheetBox = new THREE.Box3().setFromObject(gltf.scene), sheetSize = sheetBox.getSize(new THREE.Vector3());
near(sheetSize.x, 1.2, .02, 'The sheet is 1.2 m wide'); ok(sheetSize.y > .84 && sheetSize.y < .9, 'and 0.85 m high'); ok(sheetSize.z < .12, 'a flat sheet with only a small curl');
near(sheetBox.max.y, 0, .01, 'Hung from its top edge at the origin');
let colours = false; gltf.scene.traverse(node => { if (node.isMesh) colours = colours || !!node.geometry.attributes.color; }); ok(colours, 'Vertex colours, no textures');
const scratch = join(root, '.qa-dist', `speirling-check-${process.pid}`);
mkdirSync(scratch, { recursive: true });
try {
  const run = spawnSync(process.execPath, [join(root, 'tools/art/speirling-blueprint.mjs'), '--out', scratch], { cwd: root, encoding: 'utf8', windowsHide: true });
  equal(run.status, 0, run.stderr);
  equal(createHash('sha256').update(readFileSync(join(scratch, 'project-fan.glb'))).digest('hex'), entry.sha256, 'The blueprint rebuilds to the same bytes from the recipe');
  equal(readFileSync(join(scratch, 'manifest.json'), 'utf8'), readFileSync(join(modelDir, 'manifest.json'), 'utf8'), 'The manifest rebuilds too');
} finally { rmSync(scratch, { recursive: true, force: true }); }
console.log(`Speirling: ${checks} checks; car ${triangles.toLocaleString()} triangles (limit ${MAX_TRIANGLES.toLocaleString()}) / ${draws} draws (limit ${MAX_DRAWS}); blueprint ${bytes.length.toLocaleString()} bytes, rebuilt byte for byte.`);
