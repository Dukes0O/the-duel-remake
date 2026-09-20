import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createKoenigseggVehicle, KOENIGSEGG_VEHICLE_DIMENSIONS } from '../src/koenigsegg-vehicle.js';
import { createUnlockedVehicle } from '../src/unlock-vehicles.js';
import { createClassicVehicle } from '../src/classic-vehicles.js';
import { updateVehicleDamage, updateNpcVehicleDamage } from '../src/vehicles.js';
import { updateDriver } from '../src/driver.js';
import { prepareVehicleGrounding, placeGroundedVehicle, applyVehicleTerrainPose, TIRE_CLEARANCE } from '../src/vehicle-grounding.js';
import { disposeTree } from '../src/world.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const equal = (value, expected, label) => { assert.deepEqual(value, expected, label); checks++; };
const near = (a, b, tolerance, label) => ok(Math.abs(a - b) <= tolerance, `${label}: ${a} vs ${b}`);
const vehicle = createKoenigseggVehicle(), d = vehicle.userData;
equal(createKoenigseggVehicle({ key: 'falcone_f42' }), null, 'Unsupported keys do not substitute the new car');
equal(createKoenigseggVehicle({ key: '__proto__' }), null, 'Prototype keys cannot select a car');
equal(vehicle.name, 'koenigsegg_jesko', 'Stable semantic mesh key');
equal(d.size, KOENIGSEGG_VEHICLE_DIMENSIONS.koenigsegg_jesko, 'Metadata matches the physical model contract');
equal(d.designFeatures, ['long-tail', 'twin-vertical-fins', 'wraparound-canopy', 'rear-aero-discs'], 'Distinct silhouette features');
equal(d.wheels.length, 4, 'Four animated wheels');
equal(d.wheelPivots.filter(p => p.userData.front).length, 2, 'Only the front axle steers');
ok(d.driver && d.steeringPivot && d.brakeLights.length && d.boostFlames.length === 2, 'Production driver, brake and boost hooks');
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
near(size.x, d.size.width, .025, 'Trim stays within 2.5cm of collision width');
near(size.z, d.size.length, .025, 'Trim stays within 2.5cm of collision length');
near(size.y, d.size.height, .025, 'Low greenhouse matches declared height');
ok(triangles < 80000 && draws < 70, 'Detailed model stays within the geometry and draw budget');
const meta = prepareVehicleGrounding(vehicle);
near(meta.contactY, 0, .001, 'Tires define the local ground plane');
equal(meta.wheels.length, 4, 'Grounding includes all four tires');
for (const wheel of meta.wheels) near(wheel.radius, .36, .001, 'Actual wheel radius');
const wheelNodes = new Set(); for (const wheel of d.wheels) wheel.traverse(node => wheelNodes.add(node));
let bodyFloor = Infinity; const vertex = new THREE.Vector3();
vehicle.traverseVisible(mesh => {
  if (!mesh.isMesh || wheelNodes.has(mesh) || mesh === d.contactShadow) return;
  const p = mesh.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) bodyFloor = Math.min(bodyFloor, vertex.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld).y);
});
ok(bodyFloor > .10, 'Body and splitter stay above the tire plane');
placeGroundedVehicle(vehicle, { x: 2, y: 5, z: 7, heading: 1.2 }, 0, 1);
near(vehicle.position.y + meta.contactY, 5 + TIRE_CLEARANCE, .0001, 'Flat-surface grounding');
for (const wheel of d.wheels) near(wheel.rotation.x, 1 / .36, .001, 'Travel-based wheel animation');
vehicle.position.set(0, 0, 0); vehicle.rotation.set(0, 0, 0); for (const wheel of d.wheels) wheel.rotation.set(0, 0, 0); vehicle.updateMatrixWorld(true);
const skins = d.damageMeshes.filter(item => item.mesh.material === d.paint).map(item => item.mesh);
const glass = d.damageMeshes.filter(item => /glass/i.test(item.mesh.material.name)).map(item => item.mesh);
const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
ray.set(new THREE.Vector3(d.driver.position.x, .92, -.18), down);
const torsoDeck = ray.intersectObjects(skins, false)[0];
ok(!torsoDeck || torsoDeck.point.y < .55, 'Painted deck does not cross the seated driver');
for (const z of [-1.1, -.7, .35, .65]) { ray.set(new THREE.Vector3(.16, 2, z), down); ok(ray.intersectObjects(glass, false).length > 0, `Continuous glazing at ${z}`); }
equal(d.fractures.length, 4, 'Four glazing damage zones');
ok(d.fractures.every(f => f.rest.length >= 60), 'All fractures lie on real glass');
for (const steer of [-1, -.5, 0, .5, 1]) { updateDriver(d.driver, steer, .14); for (const arm of d.driver.userData.arms) ok(arm.hand.position.toArray().every(Number.isFinite), 'Finite driver steering pose'); }
updateDriver(d.driver, 0);
const carbon = d.damageMeshes.filter(item => /carbon/i.test(item.mesh.material.name)).map(item => item.mesh);
const heightAt = (meshes, x, z) => { ray.set(new THREE.Vector3(x, 3, z), down); return ray.intersectObjects(meshes, false)[0]?.point.y; };
for (const side of [-1, 1]) ok(heightAt(carbon, side * .66, -1.67) > 1.06, 'Twin rear fins rise above the engine deck');
ok((heightAt(carbon, 0, -1.67) || 0) < .95, 'No broad horizontal wing');
for (const other of [createUnlockedVehicle({ key: 'viper_proto', color: 0xe4e8e5 }), createClassicVehicle({ key: 'falcone_f42', color: 0xe4e8e5 })]) {
  const otherSkin = other.userData.damageMeshes.filter(item => item.mesh.material === other.userData.paint).map(item => item.mesh);
  let samples = 0, squared = 0, maximum = 0;
  for (let z = -2.2; z < 2.3; z += .17) for (const x of [-.82, -.55, -.25, 0, .25, .55, .82]) {
    const a = heightAt(skins, x, z), b = heightAt(otherSkin, x, z); if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    const delta = Math.abs(a - b); samples++; squared += delta * delta; maximum = Math.max(maximum, delta);
  }
  ok(samples > 80 && Math.sqrt(squared / samples) > .09 && maximum > .25, `${other.name}: materially different same-paint silhouette`); disposeTree(other);
}
const clean = { front: 0, rear: 0, left: 0, right: 0 };
const sibling = createKoenigseggVehicle({ color: 0x5544cc, accent: 0xffcc22 });
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
ok(roofDrop > .35, 'Monster truck visibly collapses the new car');
ok(!d.driver.visible && !d.steeringPivot.visible, 'Intact cabin accessories do not protrude through crushed roof');
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
for (const pitch of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
  placeGroundedVehicle(vehicle, { x: 0, y: 10, z: 0, heading: .6 });
  applyVehicleTerrainPose(vehicle, { groundAt: () => ({ y: 10 }) }, { s: 0, lateral: 0, groundHeight: 10, terrainPitch: pitch, terrainRoll: .2, tumble: true }); vehicle.updateMatrixWorld(true); let minY = Infinity;
  vehicle.traverseVisible(mesh => { if (!mesh.isMesh || mesh === d.contactShadow) return; const p = mesh.geometry.attributes.position; for (let i = 0; i < p.count; i++) minY = Math.min(minY, vertex.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld).y); });
  ok(minY >= 10 - .000001, 'Tumble keeps actual body above physical support');
}
disposeTree(vehicle); disposeTree(sibling);
console.log(`Koenigsegg geometry: ${checks} checks; ${triangles.toLocaleString()} triangles/${draws} draws; distinct silhouette, curved cabin, tire grounding, directional damage, crush and exact private-instance resets.`);
