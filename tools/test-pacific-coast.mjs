import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Course } from '../src/course.js';
import { COURSE, DRIVE } from '../src/config.js';
import { addCoast } from '../src/world-props.js';
import { terrainGeometry, farTerrainGeometry, disposeTree } from '../src/world.js';
import { addPacificCoast, buildPacificRockLayout, buildSeaStackGeometry, offshoreClearance } from '../src/pacific-coast.js';
import { createCoastLighthouse } from '../src/coast-lighthouse.js';
import { animateScene, syncScene, disposeSceneSystems } from '../src/scene-systems.js';

let checks = 0, minimumClearance = Infinity, maximumTriangles = 0, highestFoot = -Infinity;
const check = (value, label) => { assert.ok(value, label); checks++; };
const equal = (a, b, label) => { assert.deepEqual(a, b, label); checks++; };
const oldLoad = THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load = url => { const texture = new THREE.Texture(); texture.image = { src: url }; return texture; };
const deepFreeze = object => { if (!object || typeof object !== 'object' || Object.isFrozen(object)) return; Object.freeze(object); for (const value of Object.values(object)) deepFreeze(value); };
const shader = () => ({ uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <map_fragment>\n#include <color_fragment>\n#include <normal_fragment_maps>\n#include <roughnessmap_fragment>' });
const disposalCounts = resources => {
  const unique = [...new Set(resources)], counts = unique.map(() => 0);
  unique.forEach((resource, i) => resource.addEventListener('dispose', () => counts[i]++));
  return { unique, counts };
};
const vertices = (geometry, visit) => {
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) visit(p.getX(i), p.getY(i), p.getZ(i));
};

// This checks the unoccluded terrain silhouette in the actual chase-camera
// framing. Browser review still covers foliage, lighting and perceived scale.
function visibleCliffs(course, rocks, distance) {
  const camera = new THREE.PerspectiveCamera(55, 16 / 9, .15, 2400);
  const chase = course.worldAt(distance - 8.7, 0), aim = course.worldAt(distance + 26, 0);
  camera.position.set(chase.x, chase.y + 3.59, chase.z);
  camera.lookAt(aim.x, aim.y + .99, aim.z); camera.updateMatrixWorld();
  const visible = [];
  for (const rock of rocks.filter(rock => rock.prominent)) {
    const geometry = buildSeaStackGeometry(rock.variant), c = Math.cos(rock.heading), s = Math.sin(rock.heading);
    const exposed = [];
    vertices(geometry, (x, y, z) => {
      if (y < .72) return;
      const crest = new THREE.Vector3(rock.x + c * x * rock.halfX + s * z * rock.halfZ, rock.bottom + y * (rock.top - rock.bottom), rock.z - s * x * rock.halfX + c * z * rock.halfZ);
      const screen = crest.clone().project(camera);
      if (Math.abs(screen.x) > .94 || Math.abs(screen.y) > .92 || screen.z < -1 || screen.z > 1) return;
      for (let step = 1; step < 40; step++) {
        const point = camera.position.clone().lerp(crest, step / 40), nearest = course.nearest(point.x, point.z);
        if (point.y < course.groundAt(nearest.s, nearest.lateral).y + .35) return;
      }
      exposed.push(screen.x);
    });
    if (exposed.length >= 4 && Math.max(...exposed) - Math.min(...exposed) > .045) visible.push(rock.s);
    geometry.dispose();
  }
  return visible;
}

try {
  const variantSignatures = new Set();
  for (const variant of [0, 1, 2, 3, 4, 5]) {
    const geometry = buildSeaStackGeometry(variant), crest = [];
    vertices(geometry, (x, y, z) => { if (y > .60) crest.push([x, y, z]); });
    check(Math.max(...crest.map(p => p[0])) - Math.min(...crest.map(p => p[0])) > 1.2, 'upper rock shoulders stay broad rather than converging to a cone tip');
    check(Math.max(...crest.map(p => p[2])) - Math.min(...crest.map(p => p[2])) > 1.3, 'upper crag extends along the shoreline');
    check(Math.max(...crest.map(p => p[1])) - Math.min(...crest.map(p => p[1])) > .30, 'weathered shoulders and crown are not one flat plateau');
    variantSignatures.add(JSON.stringify(geometry.attributes.position.array));
    geometry.dispose();
  }
  equal(variantSignatures.size, 6, 'six independently shaped crowns and tilted fracture profiles');
  for (const seed of [1989, 42, 17]) {
    const course = new Course(COURSE[0], seed), untouched = JSON.stringify(course.features);
    deepFreeze(course.features);
    for (const key of Object.keys(course.rng)) course.rng[key] = () => assert.fail('visual coast must not consume Course RNG');
    const first = buildPacificRockLayout(course);
    equal(first, buildPacificRockLayout(course), 'coast placement is deterministic without shared RNG');
    check(first.length >= 18 && first.length <= 30, 'bounded, populated rocky shore');
    for (const distance of [2500, 2850, 3050, 3500]) check(visibleCliffs(course, first, distance).length > 0, `Route ${seed} at ${distance}: a broad cliff crest spans visible chase pixels and clears the terrain silhouette`);
    check(!offshoreClearance(course, course.at(3200).x, course.at(3200).z, 1), 'road corridor is rejected');
    for (const cut of course.features.shortcuts) {
      const s = (cut.start + cut.end) / 2, point = course.worldAt(s, course.shortcutOffset(cut, s));
      check(!offshoreClearance(course, point.x, point.z, 1), 'shortcut recovery corridor is rejected');
    }
    const world = new THREE.Group(); addCoast(world, course); world.updateMatrixWorld(true);
    const cliffs = world.getObjectByName('Pacific sea cliffs and rocky surf');
    const lighthouse = world.getObjectByName('Pacific weathered lighthouse');
    check(!!cliffs && !!lighthouse, 'production coast hook attaches both showcase features');
    equal(cliffs.userData.pacificCoast.rocks, first, 'production geometry follows the screened layout');
    check(cliffs.children.length <= 20 && lighthouse.children.length === 6, 'bounded spatial cells and six material-batched lighthouse draws');
    const triangles = cliffs.children.reduce((n, mesh) => n + (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3, 0);
    maximumTriangles = Math.max(maximumTriangles, triangles);
    check(triangles <= 15000, 'shoreline geometry stays within its reviewed fracture-relief triangle budget');
    for (const mesh of cliffs.children) {
      check(!!mesh.geometry.boundingBox && !!mesh.geometry.boundingSphere, 'each spatial cell has independent culling bounds');
      check(mesh.geometry.attributes.position.array.every(Number.isFinite) && mesh.geometry.attributes.normal.array.every(Number.isFinite), 'coast geometry and normals are finite');
      check(mesh.geometry.attributes.uv.array.every(Number.isFinite), 'UVs are finite');
      if (mesh.userData.pacificCell.kind === 'cliffs') vertices(mesh.geometry, (x, y, z) => {
        const nearest = course.nearest(x, z);
        minimumClearance = Math.min(minimumClearance, nearest.distance);
        check(nearest.distance > DRIVE.boundaryReset + 2, 'every rock vertex stays outside main-road recovery bounds');
      });
      if (mesh.userData.pacificCell.kind === 'surf') {
        check(!mesh.material.depthWrite && mesh.material.transparent, 'surf cannot stamp opaque rectangles on water');
        const p = mesh.geometry.attributes.position, index = mesh.geometry.index;
        for (let i = 0; i < index.count; i += 3) {
          const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
          const x = (p.getX(a) + p.getX(b) + p.getX(c)) / 3, z = (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 3;
          const nearest = course.nearest(x, z);
          check(course.groundAt(nearest.s, nearest.lateral).y < -14.4, 'rendered surf stays over submerged ground');
        }
      }
    }
    // Inspect the actual near/far triangle surfaces, not only Course samples.
    const terrainMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const terrain = [terrainGeometry(course), farTerrainGeometry(course)].map(geometry => new THREE.Mesh(geometry, terrainMaterial));
    const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), groundCache = new Map();
    const ground = (x, z) => {
      const key = `${x}:${z}`;
      if (!groundCache.has(key)) { ray.set(new THREE.Vector3(x, 1000, z), down); groundCache.set(key, ray.intersectObjects(terrain, false)[0]?.point.y); }
      return groundCache.get(key);
    };
    for (const rock of first) {
      const geometry = buildSeaStackGeometry(rock.variant), c = Math.cos(rock.heading), s = Math.sin(rock.heading);
      vertices(geometry, (x, y, z) => {
        if (y !== 0) return;
        const wx = rock.x + c * x * rock.halfX + s * z * rock.halfZ, wz = rock.z - s * x * rock.halfX + c * z * rock.halfZ;
        const floor = ground(wx, wz);
        check(Number.isFinite(floor), 'a rendered terrain surface supports each rock foot');
        highestFoot = Math.max(highestFoot, rock.bottom - floor);
        check(rock.bottom < floor - .25, 'rock perimeter is buried below rendered triangles');
      });
      geometry.dispose();
      check(rock.top > -13, 'every stack remains visible above water');
    }
    const tower = course.features.landmarks[0];
    for (const mesh of lighthouse.children) vertices(mesh.geometry, (x, y, z) => {
      check(Math.hypot(x, z) <= 3.201, 'lighthouse stays inside its original solid footprint');
      check(y <= 24.05, 'lighthouse keeps original overall visual height');
    });
    const stone = lighthouse.getObjectByName('Lighthouse stone');
    const low = stone.geometry.boundingBox.min.y;
    for (let i = 0; i < 32; i++) {
      const a = i / 32 * Math.PI * 2, x = tower.x + Math.sin(a) * 3.1, z = tower.z + Math.cos(a) * 3.1;
      check(tower.y + low < ground(x, z), 'lighthouse foundation is buried under actual headland triangles');
    }
    terrain.forEach(mesh => mesh.geometry.dispose()); terrainMaterial.dispose();
    const surf = cliffs.children.find(mesh => mesh.userData.pacificCell.kind === 'surf'), compiled = shader(), recompiled = shader();
    const ocean = world.getObjectByName('Coastal ocean'), shore = world.getObjectByName('Breaking shoreline foam');
    check(ocean.renderOrder < shore.renderOrder && shore.renderOrder < surf.renderOrder, 'ocean draws before both foam layers rather than covering their alpha');
    check(ocean.material.depthTest && shore.material.depthTest && surf.material.depthTest, 'terrain and rocks still occlude every water layer');
    check(surf.material.alphaTest >= .02, 'nearly transparent surf polygons are discarded');
    surf.material.onBeforeCompile(compiled); surf.material.onBeforeCompile(recompiled);
    check(compiled.fragmentShader.includes('abs(across-wash)') && compiled.fragmentShader.includes('breaker*.92+lace*.25'), 'surf mask uses narrow ragged arcs, not translucent full skirts');
    equal(compiled.uniforms.coastalSurfTime, recompiled.uniforms.coastalSurfTime, 'shader recompilation shares one animation clock');
    const state = { status: 'racing', stageTimeSec: 5, paused: true, crushedProps: [], lives: 5 }, beforeState = JSON.stringify(state);
    animateScene(world, 11); equal(compiled.uniforms.coastalSurfTime.value, 11, 'surf follows the ambient clock');
    syncScene(world, state, 0); equal(JSON.stringify(state), beforeState, 'coast never changes paused gameplay state');
    animateScene(world, 0); equal(compiled.uniforms.coastalSurfTime.value, 0, 'animation clock can restart without rebuilding resources');
    equal(JSON.stringify(course.features), untouched, 'course feature and collider data are unchanged');
    const resources = [], shaderCounts = disposalCounts([lighthouse.getObjectByName('Lighthouse plaster').material]);
    world.traverse(mesh => { if (mesh.geometry) resources.push(mesh.geometry); if (mesh.material) resources.push(mesh.material); });
    const own = disposalCounts(resources), rockMap = cliffs.children.find(mesh => mesh.userData.pacificCell.kind === 'cliffs').material.map, shared = disposalCounts([rockMap]);
    disposeSceneSystems(world); disposeSceneSystems(world); animateScene(world, 40);
    equal(compiled.uniforms.coastalSurfTime.value, 0, 'retired world no longer animates');
    disposeTree(world);
    check(own.counts.every(count => count === 1), 'all owned coast geometry/materials dispose once across shared batches');
    equal(shaderCounts.counts, [1], 'lighthouse shader material disposes'); equal(shared.counts, [0], 'existing shared granite map remains cached');
  }
  for (const def of COURSE.slice(1)) {
    const course = new Course(def, 1989), world = new THREE.Group();
    equal(buildPacificRockLayout(course), [], 'showcase layout is absent from other events');
    equal(addPacificCoast(world, course), null, 'showcase builder does not add other-event objects'); equal(world.children.length, 0);
  }
} finally { THREE.TextureLoader.prototype.load = oldLoad; }
console.log(`Pacific coast: ${checks} deterministic placement, clearance, rendered-grounding, lighthouse footprint, budget and lifecycle checks passed; closest rock ${minimumClearance.toFixed(2)}m from road, highest buried foot ${highestFoot.toFixed(2)}m, at most ${maximumTriangles} added shore triangles.`);
