import assert from 'node:assert/strict';
import * as THREE from 'three';
import { COURSE } from '../src/config.js';
import { Course } from '../src/course.js';
import { addHarbor } from '../src/world-props.js';
import { addHarborCranes } from '../src/harbor-detail.js';
import { addSceneryDetail } from '../src/scenery-detail.js';
import { disposeTree } from '../src/world.js';

let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
const oldDocument = globalThis.document;
globalThis.document = { createElement() {
  const canvas = { width: 0, height: 0 };
  const context = new Proxy({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    createLinearGradient: () => ({ addColorStop() {} }) }, { get: (target, key) => target[key] ?? (() => {}) });
  canvas.getContext = () => context; return canvas;
} };

const matrix = new THREE.Matrix4(), point = new THREE.Vector3(), tint = new THREE.Color();
const palette = [0x83969e, 0xb0aaa0, 0x5c7782, 0x81877b, 0x657b85];
const envelope = new THREE.Box3(new THREE.Vector3(-13.5, 0, -45), new THREE.Vector3(13.5, 48, 25));
const signature = group => group.children.map(crane => [crane.position.toArray(), crane.quaternion.toArray(),
  crane.children.map(mesh => [mesh.count, [...mesh.instanceMatrix.array], mesh.material.color.getHex(), mesh.material.emissive.getHex()])]);

try {
  for (const id of ['harbor-highlands', 'midnight-chase', 'neon-drift-trial']) for (const seed of [1989, 17]) {
    const course = new Course(COURSE.find(def => def.id === id), seed), features = JSON.stringify(course.features);
    const world = new THREE.Group(); addHarbor(world, course);
    const walls = world.children.filter(mesh => mesh.userData.harborCell?.kind === 'walls');
    const allBuildings = course.features.buildings, indices = new Map(allBuildings.map((b, i) => [b.id, i]));
    check(walls.length > 1 && walls.every(mesh => mesh.count < allBuildings.length), 'real scene exercises the former count-based refinement failure');
    const before = new Map(world.children.filter(mesh => mesh.isInstancedMesh).map(mesh => [mesh, [...mesh.instanceMatrix.array]]));
    const roofsDoors = world.children.filter(mesh => ['roofs', 'doors'].includes(mesh.userData.harborCell?.kind));
    const untouched = roofsDoors.map(mesh => [mesh.material.color.getHex(), mesh.material.roughness, mesh.material.metalness, mesh.material.map]);
    addSceneryDetail(world, course);
    equal(JSON.stringify(course.features), features, 'visual detail never changes generated physical features or RNG placement');
    for (const [mesh, pose] of before) equal([...mesh.instanceMatrix.array], pose, 'base building geometry and every world transform stay exact');
    equal(roofsDoors.map(mesh => [mesh.material.color.getHex(), mesh.material.roughness, mesh.material.metalness, mesh.material.map]), untouched, 'roof and loading-door materials are untouched');
    equal(new Set(walls.map(mesh => mesh.material)).size, 1, 'wall cells retain one shared material');
    const seen = new Set(), material = walls[0].material;
    check(material.map?.isCanvasTexture && material.bumpMap === material.map, 'all wall cells receive the established surface-attached cladding texture');
    equal([material.bumpScale, material.roughness, material.metalness], [.045, .76, .24], 'the intended warehouse finish is restored');
    const shader = { vertexShader: 'vertex', fragmentShader: 'fragment', uniforms: {} }; material.onBeforeCompile(shader);
    equal(shader.fragmentShader, 'fragment', 'old view-space sliding stripes are removed');
    for (const mesh of walls) {
      equal(mesh.count, mesh.userData.harborCell.buildings.length, 'one source identity per wall instance');
      for (let i = 0; i < mesh.count; i++) {
        const buildingId = mesh.userData.harborCell.buildings[i], index = indices.get(buildingId), building = allBuildings[index];
        check(!seen.has(buildingId), 'each physical building receives its finish once'); seen.add(buildingId);
        mesh.getColorAt(i, tint);
        equal(tint.toArray(), Array.from(new Float32Array(new THREE.Color(palette[index % palette.length]).toArray())), 'tint follows original global building order, not cell-local index');
        mesh.getMatrixAt(i, matrix);
        check(Math.abs(matrix.elements[12] - building.x) < .001 && Math.abs(matrix.elements[14] - building.z) < .001, 'cell identity agrees with actual instance center');
      }
    }
    equal(seen.size, allBuildings.length, 'every building keeps its deterministic finish');

    const cranes = world.children.find(object => object.userData.harborCranes), poses = [];
    for (let s = 420; s < course.length; s += 680) if (course.themeAt(s) === 'city') poses.push({ ...course.groundAt(s, 130), s });
    equal(cranes.children.length, poses.length, 'cranes use only the former authored positions');
    const geometries = new Set(), materials = new Set();
    let triangles = 0;
    cranes.children.forEach((crane, i) => {
      const pose = poses[i]; equal(crane.position.toArray(), [pose.x, pose.y, pose.z], 'crane root follows the existing terrain sample');
      equal(crane.rotation.y, pose.heading, 'crane orientation is unchanged');
      equal(crane.userData.harborCrane, { s: pose.s, offset: 130 });
      equal(crane.children.length, 2, 'two material draws replace six individual box draws');
      for (const mesh of crane.children) {
        geometries.add(mesh.geometry); materials.add(mesh.material);
        triangles += mesh.count * mesh.geometry.index.count / 3;
        check(mesh.isInstancedMesh && mesh.frustumCulled && Number.isFinite(mesh.boundingSphere.radius), 'crane details retain local culling');
        check(mesh.castShadow && mesh.receiveShadow && !mesh.material.transparent && !mesh.material.map, 'existing shadow behavior, no transparent pass or bitmap');
        const vertices = mesh.geometry.attributes.position;
        for (let n = 0; n < mesh.count; n++) {
          mesh.getMatrixAt(n, matrix); check(matrix.elements.every(Number.isFinite), 'all detail transforms are finite');
          for (let v = 0; v < vertices.count; v++) {
            point.fromBufferAttribute(vertices, v).applyMatrix4(matrix);
            check(envelope.clone().expandByScalar(.00001).containsPoint(point), 'every brace, cabin, cable and lamp stays inside the previous crane envelope');
            check(mesh.boundingBox.containsPoint(point) && mesh.boundingSphere.containsPoint(point), 'finite bounds enclose full rotated beams');
          }
        }
      }
    });
    equal([geometries.size, materials.size], [1, 2], 'all cranes share one unit box and the two original materials');
    check(triangles <= poses.length * 720, 'refinement is limited to 720 triangles per crane');
    equal(cranes.userData.harborCranes.draws, poses.length * 2, 'draw count is bounded and reported');
    check(!cranes.getObjectByProperty('isLight', true), 'emissive cabin panes add no runtime lights');
    const duplicateWorld = new THREE.Group(), duplicate = addHarborCranes(duplicateWorld, course);
    equal(signature(cranes), signature(duplicate), 'crane construction is deterministic'); disposeTree(duplicateWorld);
    const released = new Map([...geometries, ...materials].map(resource => [resource, 0]));
    for (const resource of released.keys()) resource.addEventListener('dispose', () => released.set(resource, released.get(resource) + 1));
    disposeTree(world);
    check([...released.values()].every(count => count === 1), 'shared crane resources dispose exactly once');
    console.log(`${id}/${seed}: ${seen.size} finished warehouses, ${poses.length} cranes, ${triangles} crane triangles, ${poses.length * 2} draws (formerly ${poses.length * 6}).`);
  }
  const emptyWorld = new THREE.Group();
  equal(addHarborCranes(emptyWorld, { length: 1600, themeAt: () => 'alpine' }), null, 'non-city routes gain no cranes or resources');
  equal(emptyWorld.children.length, 0);
} finally { if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument; }
console.log(`Harbor detail: ${checks} deterministic finish, identity, envelope, grounding, resource and budget checks passed.`);
