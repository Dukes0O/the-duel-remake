import assert from 'node:assert/strict';
import * as THREE from 'three';
import { COURSE } from '../src/config.js';
import { Course } from '../src/course.js';
import { addHarbor } from '../src/world.js';
import { hasDetailedCityFacade } from '../src/city-chase-detail.js';

let checks = 0, removed = 0, survivors = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const equal = (a, b, message) => { assert.deepEqual(a, b, message); checks++; };
const matrix = new THREE.Matrix4(), object = new THREE.Object3D(), tint = new THREE.Color();
const matrixKey = value => Array.from(new Float32Array(value.elements)).join(',');

// Baseline poses describe the previous whole-city boxes. Keep its window loop
// order: the old global index chooses which panes are warm, cool or switched off.
function originalParts(course) {
  const parts = { walls: [], roofs: [], doors: [], windows: [] };
  const add = (kind, b, x, y, z, sx, sy, sz) => {
    const c = Math.cos(b.heading), sn = Math.sin(b.heading);
    object.position.set(b.x + c * x + sn * z, b.y + y, b.z - sn * x + c * z); object.rotation.set(0, b.heading, 0); object.scale.set(sx, sy, sz); object.updateMatrix();
    parts[kind].push({ b, matrix: object.matrix.clone(), tintIndex: kind === 'windows' ? parts.windows.length : null });
  };
  for (const b of course.features.buildings) {
    const foundation = b.foundationDepth || 0;
    add('walls', b, 0, (b.height - foundation) / 2, 0, b.halfX * 2, b.height + foundation, b.halfZ * 2);
    add('roofs', b, 0, b.height + .15, 0, b.halfX * 2 + .5, .3, b.halfZ * 2 + .5);
    for (const face of [-1, 1]) {
      add('doors', b, 0, 2.4, face * (b.halfZ + .025), 4.8, 4.8, .07);
      for (let y = 6; y < b.height - 1; y += 3.1) for (let x = -b.halfX + 1.6; x < b.halfX - 1; x += 2.6) add('windows', b, x, y, face * (b.halfZ + .04), 1.4, 1.1, .08);
    }
    for (const face of [-1, 1]) for (let z = -b.halfZ + 2; z < b.halfZ - 1; z += 3.1) for (let y = 5; y < b.height - 1; y += 3.5) add('windows', b, face * (b.halfX + .035), y, z, .08, 1.15, 1.6);
  }
  return parts;
}

const camera = new THREE.PerspectiveCamera(60, 16 / 9, .15, 2400), frustum = new THREE.Frustum(), projection = new THREE.Matrix4();
function counts(meshes) {
  return meshes.reduce((result, mesh) => { if (frustum.intersectsObject(mesh)) { result.draws++; result.triangles += mesh.count * mesh.geometry.index.count / 3; } return result; }, { draws: 0, triangles: 0 });
}

for (const id of ['harbor-highlands', 'midnight-chase']) for (const seed of [1989, 42, 17]) {
  const course = new Course(COURSE.find(def => def.id === id), seed), baseline = originalParts(course), world = new THREE.Group(), obstacles = JSON.stringify(course.features.obstacles);
  addHarbor(world, course); world.updateMatrixWorld(true);
  equal(JSON.stringify(course.features.obstacles), obstacles, 'building hulls remain unchanged');
  const meshes = world.children.filter(mesh => mesh.userData.harborCell), geometry = meshes[0].geometry;
  equal(new Set(meshes.map(mesh => mesh.geometry)).size, 1, 'all spatial cells share the same unchanged unit box');
  const expectedGeometry = new THREE.BoxGeometry(1, 1, 1);
  equal(geometry.attributes.position.array, expectedGeometry.attributes.position.array);
  equal(geometry.attributes.normal.array, expectedGeometry.attributes.normal.array);
  equal(geometry.index.array, expectedGeometry.index.array); expectedGeometry.dispose();
  for (const [kind, entries] of Object.entries(baseline)) {
    const retained = kind === 'windows' ? entries.filter(entry => !hasDetailedCityFacade(course, entry.b)) : entries;
    const expected = new Map(retained.map(entry => [matrixKey(entry.matrix), entry]));
    equal(expected.size, retained.length, 'each original pose is unique in its part type');
    const batch = meshes.filter(mesh => mesh.userData.harborCell.kind === kind);
    equal(batch.reduce((sum, mesh) => sum + mesh.count, 0), retained.length, 'only covered legacy windows are removed');
    check(new Set(batch.map(mesh => mesh.material)).size <= 1, 'material is shared across spatial cells');
    for (const mesh of batch) {
      check(mesh.frustumCulled && Number.isFinite(mesh.boundingSphere.radius) && mesh.boundingSphere.radius < 240, 'building bounds are finite and local');
      equal(mesh.castShadow, kind === 'walls', 'original shadow behavior preserved');
      check(mesh.receiveShadow, 'original shadow reception preserved');
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix); const key = matrixKey(matrix), entry = expected.get(key);
        check(!!entry, 'surviving box transform is bit-exact'); expected.delete(key);
        equal(mesh.userData.harborCell.key, `${Math.floor(entry.b.x / 200)}:${Math.floor(entry.b.z / 200)}`, 'cell grouping follows original building center');
        check(mesh.boundingBox.containsBox(geometry.boundingBox.clone().applyMatrix4(matrix)), 'cell box encloses complete roof/foundation');
        const sphere = geometry.boundingSphere.clone().applyMatrix4(matrix);
        check(mesh.boundingSphere.center.distanceTo(sphere.center) + sphere.radius <= mesh.boundingSphere.radius + 1e-5, 'cell sphere cannot clip a building at its boundary');
        if (kind === 'windows') {
          mesh.getColorAt(i, tint);
          const oldTint = new THREE.Color(entry.tintIndex % 5 === 0 ? 0x34251a : entry.tintIndex % 3 === 0 ? 0xc4d3db : 0xffebc2);
          equal(tint.toArray(), Array.from(new Float32Array(oldTint.toArray())), 'fallback window tint retains its original global index');
          survivors++;
        } else equal(mesh.instanceColor, null, 'uncolored structural parts remain unchanged');
      }
    }
    equal(expected.size, 0, 'every retained part is rendered exactly once');
  }
  const removedHere = baseline.windows.length - world.userData.harborBuildings.fallbackWindows; removed += removedHere;
  equal(world.userData.harborBuildings.removedWindowBoxes, removedHere);
  const oldMeshes = Object.values(baseline).filter(entries => entries.length).map(entries => {
    const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial(), entries.length);
    entries.forEach((entry, index) => mesh.setMatrixAt(index, entry.matrix)); mesh.computeBoundingSphere(); mesh.updateMatrixWorld(true); return mesh;
  });
  const s = id === 'midnight-chase' ? 420 : course.sections.find(section => section.theme === 'city').start + 420;
  const eye = course.worldAt(s - 8.7), aim = course.worldAt(s + 26); camera.position.set(eye.x, eye.y + 3.65, eye.z); camera.lookAt(aim.x, aim.y + 1.05, aim.z); camera.updateMatrixWorld(true);
  frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  const before = counts(oldMeshes), after = counts(meshes);
  check(after.triangles < before.triangles * .10, 'removing occluded windows cuts base-building submissions substantially');
  console.log(JSON.stringify({ event: id, seed, buildings: course.features.buildings.length, hiddenWindowsRemoved: removedHere, fallbackWindows: world.userData.harborBuildings.fallbackWindows, formerTriangles: Object.values(baseline).reduce((n, entries) => n + entries.length * 12, 0), newTriangles: meshes.reduce((n, mesh) => n + mesh.count * 12, 0), cameraBefore: before, cameraAfter: after }));
}

// Explicit edge fixture: a facade crossing out of the city must retain windows.
const cityEdge = { themeAt: s => s >= 20 && s <= 80 ? 'city' : 'coast' };
equal(hasDetailedCityFacade(cityEdge, { s: 50, halfX: 6, halfZ: 8, theme: 'city' }), true);
equal(hasDetailedCityFacade(cityEdge, { s: 25, halfX: 6, halfZ: 8, theme: 'city' }), false);
equal(hasDetailedCityFacade(cityEdge, { s: 50, halfX: 6, halfZ: 8, theme: 'coast' }), false);
const fallbackCourse = { ...cityEdge, length: 100, features: { buildings: [
  { id: 'complete', s: 50, x: 100, y: 3, z: 60, halfX: 6, halfZ: 8, height: 12, foundationDepth: .4, heading: .4, theme: 'city' },
  { id: 'edge', s: 25, x: 20, y: 2, z: 10, halfX: 6, halfZ: 8, height: 12, foundationDepth: .3, heading: -.2, theme: 'city' },
  { id: 'other-biome', s: 50, x: -80, y: 5, z: -30, halfX: 6, halfZ: 8, height: 12, heading: .7, theme: 'coast' },
] } };
const fallback = new THREE.Group(); addHarbor(fallback, fallbackCourse);
const originalWindows = originalParts(fallbackCourse).windows;
const fallbackExpected = new Map(originalWindows.filter(entry => entry.b.id !== 'complete').map(entry => [matrixKey(entry.matrix), entry]));
check(fallbackExpected.size > 0, 'fixture actually contains biome-edge fallback panes');
for (const mesh of fallback.children.filter(mesh => mesh.userData.harborCell?.kind === 'windows')) {
  equal(mesh.material.emissive.getHex(), 0xffa650, 'fallback keeps original warm emissive material');
  equal(mesh.material.emissiveIntensity, 1.5);
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, matrix); const key = matrixKey(matrix), entry = fallbackExpected.get(key);
    check(!!entry, 'edge-window placement is preserved'); fallbackExpected.delete(key);
    mesh.getColorAt(i, tint);
    const before = new THREE.Color(entry.tintIndex % 5 === 0 ? 0x34251a : entry.tintIndex % 3 === 0 ? 0xc4d3db : 0xffebc2);
    equal(tint.toArray(), Array.from(new Float32Array(before.toArray())), 'fallback colors keep global indices after a removed building'); survivors++;
  }
}
equal(fallbackExpected.size, 0, 'every fallback window is kept');
console.log(`Harbor batches: ${checks} checks, ${removed} hidden legacy window boxes removed, ${survivors} fallback windows preserved with exact poses/colors; finite cell bounds and unchanged collision footprints.`);
