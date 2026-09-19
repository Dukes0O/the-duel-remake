import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Course } from '../src/course.js';
import { COURSE } from '../src/config.js';
import { terrainGeometry } from '../src/world.js';
import { addLandscapeDetail } from '../src/landscape-detail.js';
import { buildCactusGeometry, cactusTransform, addDesertCacti, createCactusMaterial, createDesertStoneMaterial } from '../src/desert-detail.js';
import { vegetationCells } from '../src/vegetation.js';

let checks = 0, plants = 0, stones = 0, minimumHeight = Infinity, maximumHeight = 0, minimumBurial = Infinity, maximumBurial = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const geometries = [0, 1, 2].map(buildCactusGeometry), point = new THREE.Vector3(), normal = new THREE.Vector3();
for (const [variant, geometry] of geometries.entries()) {
  const p = geometry.attributes.position, n = geometry.attributes.normal;
  check(geometry.index.count / 3 <= 3600, 'cactus geometry budget');
  for (let i = 0; i < p.count; i++) {
    point.fromBufferAttribute(p, i); normal.fromBufferAttribute(n, i);
    check(point.toArray().every(Number.isFinite) && Number.isFinite(normal.length()) && Math.abs(normal.length() - 1) < 1e-5, 'finite unit normals');
    check(Math.hypot(point.x, point.z) < 1, 'arms remain inside the previous foliage envelope');
    if (point.y > .15 && point.y < 1) {
      check(Math.abs(point.x) <= .23 && Math.abs(point.z) <= .23, 'lower stem stays inside original solid tree hull');
      check(point.x * normal.x + point.z * normal.z > 0, 'stem faces outward');
    }
  }
  check(geometry.boundingBox.max.y > 2 && geometry.boundingBox.max.y < 3.1, `${variant}: restrained authored height`);
}
const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
const originalLoad = THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load = function () { return new THREE.Texture(); };
try {
  for (const seed of [1989, 42, 17]) for (const definition of COURSE.filter(def => def.sections.some(section => section.theme === 'desert'))) {
    const course = new Course(definition, seed), view = Object.create(course);
    view.def = { ...definition, theme: 'desert' }; view.features = { ...course.features };
    for (const key of ['trees', 'rocks', 'mountains']) view.features[key] = course.features[key].filter(item => item.theme === 'desert');
    view.detailSections = course.sections.filter(section => section.theme === 'desert');
    const terrain = new THREE.Mesh(terrainGeometry(course, false), material), group = new THREE.Group();
    addDesertCacti(group, view);
    check(group.children.length <= vegetationCells(view.features.trees).length * 3, 'maximum three instanced cactus draws per spatial cell');
    check(group.children.reduce((sum, mesh) => sum + mesh.count, 0) === view.features.trees.length, 'spatial cells preserve every cactus exactly once');
    for (const mesh of group.children) {
      check(mesh.isInstancedMesh && mesh.geometry.userData.sharedAsset, 'cacti share cached geometry');
      for (let i = 0; i < mesh.count; i++) {
        const { tree, index } = mesh.userData.cactusFeatures[i], transform = cactusTransform(view, tree, index), p = mesh.geometry.attributes.position;
        const actual = new THREE.Matrix4(); mesh.getMatrixAt(i, actual);
        check(actual.elements.every((value, j) => Math.abs(value - transform.elements[j]) < .0003), 'instance uses audited transform');
        const base = transform.elements[13];
        ray.set(new THREE.Vector3(tree.x, tree.y + 30, tree.z), down);
        const hit = ray.intersectObject(terrain, false)[0];
        check(!!hit, 'plant has rendered ground');
        const burial = hit.point.y - base;
        minimumBurial = Math.min(minimumBurial, burial); maximumBurial = Math.max(maximumBurial, burial);
        check(burial > .01 && burial < .7, `plant root must be grounded without burying its stem: ${definition.id}/${seed}/${tree.id}: ${burial}`);
        const top = mesh.geometry.boundingBox.max.y * transform.elements[5] + base - hit.point.y;
        minimumHeight = Math.min(minimumHeight, top); maximumHeight = Math.max(maximumHeight, top);
        check(top > .8 && top < 4.6, 'natural visible cactus height');
        // The whole silhouette, including raised arms, stays clear of all legal
        // road/shortcut surfaces. Sample each fourth vertex to bound cost.
        for (let j = 0; j < p.count; j += 4) {
          point.fromBufferAttribute(p, j).applyMatrix4(transform);
          const near = course.nearest(point.x, point.z);
          check(!course.surfaceAt(near.s, near.lateral).road, 'cactus silhouette cannot reach road or shortcut');
        }
        plants++;
      }
    }
    const detail = new THREE.Group(); addLandscapeDetail(detail, view, false);
    const rocks = detail.children.filter(mesh => mesh.material?.name === 'Weathered layered sandstone' && mesh.userData.landscapeCell?.kind === 'boulders');
    check(rocks.length > 0 && rocks.every(rock => rock.geometry.type === 'DodecahedronGeometry'), 'existing roadside rock geometry preserved');
    const features = view.features.rocks.filter(feature => !feature.outcrop), expected = new THREE.Object3D(), actual = new THREE.Matrix4();
    check(rocks.reduce((total, rock) => total + rock.count, 0) === features.length, 'rock count and placement preserved');
    for (const rock of rocks) for (let i = 0; i < rock.count; i++) {
      const feature = features[rock.userData.landscapeCell.indices[i]], p = course.groundAt(feature.s, feature.off);
      expected.position.set(p.x, p.y + .1, p.z); expected.scale.set(...feature.scale); expected.rotation.set(0, p.heading + feature.angle, 0); expected.updateMatrix(); rock.getMatrixAt(i, actual);
      check(actual.elements.every((value, j) => Math.abs(value - expected.matrix.elements[j]) < .0003), 'roadside rock transform unchanged');
      const collider = course.features.obstacles.find(obstacle => obstacle.source === feature);
      check(collider?.shape === 'ellipse' && collider.halfX === feature.scale[0] && collider.halfZ === feature.scale[2], 'existing conservative rock collision footprint'); stones++;
    }
    terrain.geometry.dispose();
  }
} finally { THREE.TextureLoader.prototype.load = originalLoad; }
for (const factory of [createCactusMaterial, () => createDesertStoneMaterial(new THREE.Texture())]) {
  const mat = factory(), shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  mat.onBeforeCompile(shader);
  check(shader.fragmentShader.includes('diffuseColor.rgb'), 'surface detail enters physical material shader');
  check(mat.roughness >= .95, 'desert material remains dry and matte');
  if (mat.map) {
    check(shader.vertexShader.includes('instanceMatrix*desertStonePosition'), 'sandstone texture scale accounts for instances');
    check(!shader.fragmentShader.includes('#include <map_fragment>') && !shader.fragmentShader.includes('#include <normal_fragment_maps>'), 'sandstone uses unstretched projection and matching bump');
  }
}
console.log(`Desert detail: ${checks} checks; ${plants} grounded/clear cacti, ${stones} unchanged rock colliders. Cactus heights ${minimumHeight.toFixed(2)}–${maximumHeight.toFixed(2)}m; root burial ${minimumBurial.toFixed(3)}–${maximumBurial.toFixed(3)}m; at most 3 instanced cactus draws per spatial cell.`);
