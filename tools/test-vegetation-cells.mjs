import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Course } from '../src/course.js';
import { COURSE } from '../src/config.js';
import { SUN_OFFSET } from '../src/atmosphere.js';
import { addPineTrees, vegetationCells, VEGETATION_CELL_SIZE } from '../src/vegetation.js';
import { addDesertCacti, cactusTransform } from '../src/desert-detail.js';

let checks = 0, instances = 0, oldTotal = 0, newTotal = 0, oldShadow = 0, newShadow = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const equal = (a, b, message) => { assert.deepEqual(a, b, message); checks++; };
const matrix = new THREE.Matrix4(), object = new THREE.Object3D(), color = new THREE.Color();
const variation = value => { const n = Math.sin(value * 12.9898 + 78.233) * 43758.5453; return n - Math.floor(n); };
const samples = [-200.01, -200, -.001, 0, 199.999, 200, 200.01].map((x, index) => ({ x, y: index, z: index % 2 ? -.001 : 200, heading: index * .23, scale: .8 + index * .1, s: index, off: x }));
const cells = vegetationCells(samples);
equal(cells.flatMap(cell => cell.entries.map(entry => entry.index)).sort((a, b) => a - b), samples.map((_, i) => i), 'cell boundaries neither duplicate nor drop instances');
for (const cell of cells) for (const { feature } of cell.entries) equal(cell.key, `${Math.floor(feature.x / 200)}:${Math.floor(feature.z / 200)}`);
equal(VEGETATION_CELL_SIZE, 200);

function audit(group, trees, cactus = false, course) {
  const seen = new Map();
  for (const mesh of group.children) {
    const { key, entries } = mesh.userData.vegetationCell;
    check(mesh.frustumCulled && mesh.boundingSphere && mesh.boundingBox, 'finite spatial bounds enable native camera/shadow culling');
    check(Number.isFinite(mesh.boundingSphere.radius) && mesh.boundingSphere.radius < 165, 'bounds remain local to one 200m cell');
    for (let i = 0; i < entries.length; i++) {
      const { feature, index } = entries[i];
      equal(feature, trees[index], 'global source index is preserved');
      equal(key, `${Math.floor(feature.x / 200)}:${Math.floor(feature.z / 200)}`);
      const seenKey = `${cactus ? 'cactus' : mesh.name.startsWith('Pine trunks') ? 'trunk' : 'crown'}:${index}`;
      check(!seen.has(seenKey), 'source instance appears once per geometry part'); seen.set(seenKey, true);
      mesh.getMatrixAt(i, matrix);
      let expected;
      if (cactus) {
        expected = cactusTransform(course, feature, index);
        equal(mesh.geometry.userData.cactusVariant, index % 3, 'cell grouping retains cactus silhouette variant');
        const tone = variation(feature.s + feature.off); mesh.getColorAt(i, color);
        equal(color.toArray(), Array.from(new Float32Array([.86 + tone * .14, .88 + tone * .12, .82 + tone * .15])), 'cactus tint is unchanged');
      } else {
        object.position.set(feature.x, feature.y - .24, feature.z); object.rotation.set(0, feature.heading, 0); object.scale.setScalar(feature.scale); object.updateMatrix(); expected = object.matrix;
      }
      equal(matrix.elements, Array.from(new Float32Array(expected.elements)), 'all transform bits match the former whole-biome placement');
      const sphere = mesh.geometry.boundingSphere.clone().applyMatrix4(matrix);
      check(mesh.boundingSphere.center.distanceTo(sphere.center) + sphere.radius <= mesh.boundingSphere.radius + 1e-5, 'cell sphere encloses full crown/arms even across cell edges');
      const bounds = mesh.geometry.boundingBox.clone().applyMatrix4(matrix);
      check(mesh.boundingBox.containsBox(bounds), 'cell box encloses full geometry');
      instances++;
    }
  }
  equal(seen.size, trees.length * (cactus ? 1 : 2), 'roots and instance counts are unchanged');
  if (!cactus && trees.length) {
    equal(new Set(group.children.map(mesh => mesh.geometry)).size, 2, 'pine cells share the same two original geometries');
    equal(new Set(group.children.map(mesh => mesh.material)).size, 2, 'pine cells share the same original materials and cutout texture');
  }
}

function formerMeshes(meshes) {
  const groups = new Map();
  for (const mesh of meshes) {
    const key = `${mesh.geometry.uuid}:${mesh.material.uuid}`;
    if (!groups.has(key)) groups.set(key, { geometry: mesh.geometry, material: mesh.material, matrices: [] });
    for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, matrix); groups.get(key).matrices.push(matrix.clone()); }
  }
  return [...groups.values()].map(({ geometry, material, matrices }) => {
    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix)); mesh.computeBoundingSphere(); mesh.computeBoundingBox(); mesh.updateMatrixWorld(true); return mesh;
  });
}

const frustum = new THREE.Frustum(), projection = new THREE.Matrix4();
function submissions(meshes, camera, opaqueOnly = false) {
  camera.updateMatrixWorld(true); camera.updateProjectionMatrix(); frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  let draws = 0, triangles = 0;
  for (const mesh of meshes) {
    const included = frustum.intersectsObject(mesh);
    if (mesh.userData.vegetationCell) {
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        const sphere = mesh.geometry.boundingSphere.clone().applyMatrix4(matrix);
        if (frustum.intersectsSphere(sphere)) check(included, 'a visible tree cannot disappear at a cell/frustum boundary');
      }
    }
    if (included && !(opaqueOnly && mesh.material.alphaTest > 0)) { draws++; triangles += mesh.count * (mesh.geometry.index?.count || mesh.geometry.attributes.position.count) / 3; }
  }
  return { draws, triangles };
}

const originalLoad = THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load = function () { return new THREE.Texture(); };
try {
  const boundary = new THREE.Group(); addPineTrees(boundary, samples); audit(boundary, samples);
  for (const definition of COURSE.filter(def => def.layout)) {
    const course = new Course(definition, 1989), trees = new THREE.Group();
    for (const theme of new Set(course.features.trees.map(tree => tree.theme))) {
      const group = new THREE.Group(), features = course.features.trees.filter(tree => tree.theme === theme);
      if (theme === 'desert') {
        const view = Object.create(course); view.features = { ...course.features, trees: features }; addDesertCacti(group, view); audit(group, features, true, view);
      } else { addPineTrees(group, features); audit(group, features); }
      while (group.children.length) trees.add(group.children[0]);
    }
    trees.updateMatrixWorld(true);
    const old = formerMeshes(trees.children), camera = new THREE.PerspectiveCamera(60, 16 / 9, .15, 2400), shadow = new THREE.OrthographicCamera(-45, 45, 45, -45, 1, 240);
    const report = [];
    for (const fraction of [.08, .35, .58, .72, .9]) {
      const s = course.length * fraction, player = course.groundAt(s), eye = course.worldAt(s - 8.7), aim = course.worldAt(s + 26), lift = player.y - course.at(s).y;
      camera.position.set(eye.x, eye.y + 3.65 + lift, eye.z); camera.lookAt(aim.x, aim.y + 1.05 + lift, aim.z);
      shadow.position.set(player.x + SUN_OFFSET.x, player.y + SUN_OFFSET.y, player.z + SUN_OFFSET.z); shadow.lookAt(player.x, player.y, player.z);
      const oldColor = submissions(old, camera), nextColor = submissions(trees.children, camera), oldDepth = submissions(old, camera, true), nextDepth = submissions(trees.children, camera, true);
      const beforeShadow = submissions(old, shadow), afterShadow = submissions(trees.children, shadow);
      oldTotal += oldColor.triangles + oldDepth.triangles + beforeShadow.triangles; newTotal += nextColor.triangles + nextDepth.triangles + afterShadow.triangles;
      oldShadow += beforeShadow.triangles; newShadow += afterShadow.triangles;
      report.push({ phase: fraction, color: `${oldColor.triangles}→${nextColor.triangles}`, shadow: `${beforeShadow.triangles}→${afterShadow.triangles}`, colorDraws: `${oldColor.draws}→${nextColor.draws}`, shadowDraws: `${beforeShadow.draws}→${afterShadow.draws}` });
    }
    console.log(JSON.stringify({ event: definition.id, trees: course.features.trees.length, oldBatches: old.length, cellBatches: trees.children.length, samples: report }));
  }
} finally { THREE.TextureLoader.prototype.load = originalLoad; }
check(newTotal < oldTotal * .65, 'spatial batches substantially reduce aggregate vegetation submissions');
check(newShadow < oldShadow * .4, 'nearby shadow frusta cull distant vegetation');
console.log(`Vegetation cells: ${checks} checks, ${instances} unchanged instances; modelled camera/AO/shadow triangles -${((1 - newTotal / oldTotal) * 100).toFixed(1)}%, shadow triangles -${((1 - newShadow / oldShadow) * 100).toFixed(1)}%. Draws increase for locally visible cells; browser timing remains the final performance check.`);
