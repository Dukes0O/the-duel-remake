import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createUnlockedVehicle, UNLOCK_VEHICLE_DIMENSIONS } from '../src/unlock-vehicles.js';
import { updateVehicleDamage } from '../src/vehicles.js';
import { updateDriver } from '../src/driver.js';

// Blender imports these standard glTF meshes, material surfaces and named pivots.
// The runtime uses this same builder; the files are not unrelated concept models.
globalThis.FileReader ??= class FileReader {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }, error => this.onerror?.(error)); }
  readAsDataURL(blob) { blob.arrayBuffer().then(buffer => { this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buffer).toString('base64')}`; this.onloadend?.(); }, error => this.onerror?.(error)); }
};
const destination = new URL('../public/assets/models/unlocks/', import.meta.url);
await mkdir(destination, { recursive: true });
const exporter = new GLTFExporter(), manifest = [];
const visibilityTargets = {
  dusthawk_rally: { front: [.57,.89,2.12], rear: [.78,1.2,-2.1], exhaust: [.59,.34,-2.105], plate: [0,.745,-2.087] },
  banshee_muscle: { front: [.72,.805,2.555], rear: [.72,.82,-2.55], exhaust: [.71,.32,-2.544], plate: [0,.694,-2.543] },
  viper_proto: { front: [.78,.423,2.255], rear: [.64,.58,-2.45], exhaust: [.23,.435,-2.444], plate: [0,.554,-2.447] },
  titan_monster: { front: [.62,2.18,2.09], rear: [.78,2.16,-2.085], exhaust: [.70,1.81,-2.204], plate: [0,2.12,-2.086] },
};
const visibleMaterial = { front: 'Headlamp lenses', rear: 'Brake lenses', exhaust: 'Exhaust inner', plate: 'Blank registration plate' };
for (const [key, dimensions] of Object.entries(UNLOCK_VEHICLE_DIMENSIONS)) {
  const vehicle = createUnlockedVehicle({ key });
  assert.equal(vehicle.userData.wheels.length, 4);
  assert(vehicle.userData.driver && vehicle.userData.boostFlames.length && vehicle.userData.brakeLights.length);
  for (const zone of ['front', 'rear', 'left', 'right']) {
    updateVehicleDamage(vehicle, 1, false, 0, { [zone]: 1 });
    let changes = 0;
    for (const item of vehicle.userData.damageMeshes) {
      const positions = item.mesh.geometry.attributes.position.array;
      assert(positions.every(Number.isFinite));
      for (let i = 0; i < positions.length; i++) if (Math.abs(positions[i] - item.rest[i]) > .005) changes++;
    }
    assert(changes > 10, `${key}: ${zone} should visibly deform`);
  }
  updateVehicleDamage(vehicle, 0, false, 0, { front: 0, rear: 0, left: 0, right: 0 });
  for (const item of vehicle.userData.damageMeshes) {
    assert.deepEqual(item.mesh.geometry.attributes.position.array, item.rest);
    assert.deepEqual(item.mesh.geometry.attributes.normal.array, item.normals);
  }
  updateDriver(vehicle.userData.driver, 1, .2); updateDriver(vehicle.userData.driver, 0);
  const glass = vehicle.userData.fractures.map(f => ({ zone: f.zone, segments: f.rest.length / 6 }));
  assert(glass.every(f => f.segments > 0), `${key}: every window damage zone should find glazing`);
  vehicle.updateMatrixWorld(true);
  let visibilityChecks = 0;
  for (const [name, coordinates] of Object.entries(visibilityTargets[key])) for (const side of name === 'plate' || key === 'dusthawk_rally' && name === 'exhaust' ? [1] : [-1, 1]) for (const cameraX of [-2, 0, 2]) {
    // Match the raised chase-camera sightline, then offset it to either side.
    // The first opaque hit must be the actual lens/pipe/plate, not a body cap.
    const tall = key === 'titan_monster', eye = new THREE.Vector3(cameraX, tall ? 5.8 : 3.65, name === 'front' ? 9 : tall ? -12 : -8.7);
    const target = new THREE.Vector3(coordinates[0] * side, coordinates[1], coordinates[2]);
    const ray = new THREE.Raycaster(eye, target.sub(eye).normalize());
    const hit = ray.intersectObject(vehicle, true).find(h => h.object.isMesh && h.object.visible && !h.object.material.transparent);
    assert.equal(hit?.object.material.name, visibleMaterial[name], `${key}: ${name} must be visible from camera x=${cameraX}, side=${side}`);
    visibilityChecks++;
  }
  const bounds = new THREE.Box3(), size = new THREE.Vector3(); let triangles = 0, draws = 0;
  vehicle.traverseVisible(object => {
    if (!object.isMesh) return;
    bounds.union(new THREE.Box3().setFromBufferAttribute(object.geometry.attributes.position).applyMatrix4(object.matrixWorld));
    triangles += (object.geometry.index?.count || object.geometry.attributes.position.count) / 3; draws++;
  });
  bounds.getSize(size);
  assert(Math.abs(size.x - dimensions.width) < .04 && Math.abs(size.z - dimensions.length) < .06 && Math.abs(size.y - dimensions.height) < .06, `${key}: geometry should match its collision dimensions`);
  vehicle.userData.wheelPivots.forEach((pivot, i) => { pivot.name = `WheelPivot_${i}_${pivot.userData.front ? 'front' : 'rear'}`; });
  vehicle.userData.wheels.forEach((wheel, i) => { wheel.name = `WheelSpin_${i}`; });
  vehicle.userData.driver.name = 'Driver_helmet_and_harness'; vehicle.userData.steeringPivot.name = 'SteeringWheel';
  vehicle.traverse(object => { object.userData = {}; object.geometry?.deleteAttribute('panelWear'); });
  vehicle.userData = { model: key, unit: 'metre', forward: '+Z', driverLeft: '+X', up: '+Y', dimensions, source: 'src/unlock-vehicles.js', reference: 'assets/reference/unlock-vehicles.png' };
  const buffer = await exporter.parseAsync(vehicle, { binary: true, onlyVisible: true });
  await writeFile(new URL(`${key}.glb`, destination), Buffer.from(buffer));
  const entry = { key, file: `${key}.glb`, bytes: buffer.byteLength, triangles, draws, dimensions, measured: size.toArray().map(n => +n.toFixed(3)), glassDamage: glass, visibilityChecks };
  manifest.push(entry); console.log(JSON.stringify(entry));
}
await writeFile(new URL('manifest.json', destination), JSON.stringify({ source: 'Original procedural vehicle models for The Duel', vehicles: manifest }, null, 2) + '\n');
console.log('Four GLBs exported. Front/rear visibility, directional damage, exact resets, driver poses and dimensions passed.');
