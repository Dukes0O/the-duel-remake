import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Course } from '../src/course.js';
import { COURSE } from '../src/config.js';
import { addCityChaseDetail } from '../src/city-chase-detail.js';
import { strip } from '../src/world.js';

let checks = 0, points = 0, minClearance = Infinity, maxClearance = -Infinity;
const check = (condition, label) => { assert.ok(condition, label); checks++; };
for (const id of ['harbor-highlands', 'midnight-chase', 'neon-drift-trial']) for (const seed of [1989, 42]) {
  const course = new Course(COURSE.find(event => event.id === id), seed), before = JSON.stringify(course.features.obstacles);
  const group = addCityChaseDetail(new THREE.Group(), course);
  const road = new THREE.Mesh(strip(course, s => -course.roadHalfWidthAt(s), s => course.roadHalfWidthAt(s), .035), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  road.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(), point = new THREE.Vector3(), corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  let roadPaint = 0;
  for (const mesh of group.children.filter(mesh => mesh.name === 'City marking surface')) {
    const geometry = mesh.geometry, positions = geometry.attributes.position, indices = geometry.index;
    const verify = p => {
      const projection = course.nearest(p.x, p.z);
      if (Math.abs(projection.lateral) > course.roadHalfWidthAt(projection.s) - .2) return;
      ray.set(new THREE.Vector3(p.x, p.y + 10, p.z), new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObject(road, false)[0];
      check(Boolean(hit), `${id}/${seed}: road paint has asphalt beneath it`);
      const clearance = p.y - hit.point.y;
      check(clearance > .008 && clearance < .08, `${id}/${seed}: crosswalk/stop-bar paint is visible above asphalt without floating (${clearance})`);
      minClearance = Math.min(minClearance, clearance); maxClearance = Math.max(maxClearance, clearance); roadPaint++; points++;
    };
    for (let i = 0; i < positions.count; i++) { point.fromBufferAttribute(positions, i); verify(point); }
    for (let i = 0; i < indices.count; i += 3) {
      for (let j = 0; j < 3; j++) corners[j].fromBufferAttribute(positions, indices.getX(i + j));
      point.copy(corners[0]).add(corners[1]).add(corners[2]).multiplyScalar(1 / 3); verify(point);
    }
  }
  check(roadPaint >= group.userData.cityDetail.crossings * 12 && group.userData.cityDetail.crossings > 0, `${id}/${seed}: crossings and stop bars are actually present`);
  check(JSON.stringify(course.features.obstacles) === before, 'paint placement leaves all collision geometry unchanged');
  const geometries = new Set(), materials = new Set(), textures = new Set();
  group.traverse(mesh => { if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) for (const material of [mesh.material].flat()) materials.add(material); });
  for (const material of materials) for (const key of ['map', 'bumpMap', 'emissiveMap']) if (material[key]) textures.add(material[key]);
  for (const geometry of geometries) geometry.dispose(); for (const material of materials) material.dispose(); for (const texture of textures) texture.dispose();
  road.geometry.dispose(); road.material.dispose();
}
console.log(`City road paint: ${checks} checks, ${points} asphalt ray samples; clearance ${(minClearance * 1000).toFixed(1)}–${(maxClearance * 1000).toFixed(1)}mm.`);
