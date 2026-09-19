import assert from 'node:assert/strict';
import * as THREE from 'three';
import { COURSE } from '../src/config.js';
import { Course } from '../src/course.js';
import { addCitySkyline, planCitySkyline, createSkylineFacadeMaterial, SKYLINE_CLEARANCE } from '../src/city-skyline.js';
import { farTerrainGeometry, disposeTree } from '../src/world.js';

let checks = 0, groundQueries = 0, minimumClearance = Infinity, minimumBurial = Infinity, worstVisibleDraws = 0;
const check = (condition, label) => { assert.ok(condition, label); checks++; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function actualGround(course) {
  const geometry = farTerrainGeometry(course, false), p = geometry.attributes.position, index = geometry.index;
  geometry.computeBoundingBox(); const box = geometry.boundingBox, grid = p.getX(1) - p.getX(0), columns = Math.round((box.max.x - box.min.x) / grid) + 1, quads = new Set();
  for (let i = 0; i < index.count; i += 6) quads.add(index.getX(i));
  const sample = (x, z) => {
    const i = Math.floor((x - box.min.x) / grid), j = Math.floor((z - box.min.z) / grid), a = j * columns + i;
    if (!quads.has(a)) return null;
    const u = (x - p.getX(a)) / grid, v = (z - p.getZ(a)) / grid;
    return u + v <= 1 ? p.getY(a) * (1 - u - v) + p.getY(a + 1) * u + p.getY(a + columns) * v : p.getY(a + 1) * (1 - v) + p.getY(a + columns) * (1 - u) + p.getY(a + columns + 1) * (u + v - 1);
  };
  sample.dispose = () => geometry.dispose(); return sample;
}
function denseRoads(course) {
  const segments = [], paths = [{ start: 0, end: course.length, offset: () => 0, width: s => course.roadHalfWidthAt(s) },
    ...course.features.shortcuts.map(cut => ({ start: cut.start, end: cut.end, offset: s => course.shortcutOffset(cut, s), width: () => cut.halfWidth }))];
  for (const path of paths) {
    let a = course.worldAt(path.start, path.offset(path.start));
    for (let s = path.start + 1; s <= path.end + 1; s++) {
      const at = Math.min(path.end, s), b = course.worldAt(at, path.offset(at));
      segments.push({ a, b, width: Math.max(path.width(at), path.width(at - 1)) }); a = b;
    }
  }
  return segments;
}
for (const id of ['midnight-chase', 'neon-drift-trial']) for (const seed of [1989, 42, 17]) {
  const course = new Course(COURSE.find(event => event.id === id), seed), before = JSON.stringify(course.features), world = new THREE.Group();
  const group = addCitySkyline(world, course), data = group.userData.citySkyline, ground = actualGround(course), roads = denseRoads(course);
  check(data.towers.length >= 70 && data.towers.length <= 96 && new Set(data.towers.map(t => t.style)).size === 5, 'the distant city has a bounded population and varied original silhouettes');
  check(JSON.stringify(planCitySkyline(course)) === JSON.stringify(data.towers), 'tower placement and roof profiles are deterministic');
  const bounds = { minX: Math.min(...course.samples.map(p => p.x)), maxX: Math.max(...course.samples.map(p => p.x)), minZ: Math.min(...course.samples.map(p => p.z)), maxZ: Math.max(...course.samples.map(p => p.z)) };
  check(data.towers.some(t => t.x > bounds.minX && t.x < bounds.maxX && t.z > bounds.minZ && t.z < bounds.maxZ), 'the safe infield contains towers as well as the outer horizon');
  for (let i = 0; i < data.towers.length; i++) {
    const tower = data.towers[i]; let clear = Infinity;
    for (const segment of roads) {
      const dx = segment.b.x - segment.a.x, dz = segment.b.z - segment.a.z, t = clamp(((tower.x - segment.a.x) * dx + (tower.z - segment.a.z) * dz) / Math.max(.0001, dx * dx + dz * dz), 0, 1);
      clear = Math.min(clear, Math.hypot(tower.x - segment.a.x - dx * t, tower.z - segment.a.z - dz * t) - segment.width - tower.radius);
    }
    minimumClearance = Math.min(minimumClearance, clear);
    check(clear >= SKYLINE_CLEARANCE, `${id}/${seed}/${tower.id}: its whole footprint stays115m beyond every paved/prepared corridor`);
    check(clear > 78 && clear > 32, 'the main-road and distant-shortcut reset boundaries make the visual tower unreachable');
    for (const obstacle of course.features.obstacles) check(Math.hypot(tower.x - obstacle.x, tower.z - obstacle.z) >= tower.radius + Math.hypot(obstacle.halfX, obstacle.halfZ) + 9.99, 'skyline footprints cannot overlap mountains, foreground buildings or other existing scenery');
    for (const other of data.towers.slice(0, i)) check(Math.hypot(tower.x - other.x, tower.z - other.z) >= tower.radius + other.radius + 9.99, 'separate distant towers have visible space between their foundations');
    const c = Math.cos(tower.heading), sn = Math.sin(tower.heading);
    for (let ix = 0; ix <= 16; ix++) for (let iz = 0; iz <= 16; iz++) {
      const x = (ix / 8 - 1) * (tower.halfX + 1), z = (iz / 8 - 1) * (tower.halfZ + 1), y = ground(tower.x + c * x + sn * z, tower.z - sn * x + c * z); groundQueries++;
      check(y !== null, 'every foundation stands on an actual rendered far-terrain triangle');
      check(y > tower.foundationY + .45 && y < tower.floorY + .35, 'foundations bury into terrain without floating or hiding tower floors');
      minimumBurial = Math.min(minimumBurial, y - tower.foundationY);
    }
  }
  world.updateMatrixWorld(true);
  const box = new THREE.Box3(), matrix = new THREE.Matrix4();
  for (const mesh of group.children) {
    check(mesh.isInstancedMesh && mesh.frustumCulled && !mesh.castShadow && mesh.userData.skylineCell.size === 200, 'finite spatial batches cull independently without costly distant shadow draws');
    check(Number.isFinite(mesh.boundingSphere.radius) && mesh.boundingSphere.radius < 245, 'no skyline batch spans the whole city');
    mesh.geometry.computeBoundingBox();
    for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, matrix); box.copy(mesh.geometry.boundingBox).applyMatrix4(matrix); check(mesh.boundingBox.containsBox(box), 'batch bounds include every transformed rooftop and antenna'); }
  }
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, .15, 2400), frustum = new THREE.Frustum(), projection = new THREE.Matrix4();
  const views = [];
  for (let s = 0; s < course.length; s += 240) {
    const p = course.worldAt(s), target = course.worldAt(s + 50); camera.position.set(p.x, p.y + 4, p.z); camera.lookAt(target.x, target.y + 5, target.z); camera.updateMatrixWorld(true);
    projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(projection);
    views.push(group.children.filter(mesh => frustum.intersectsObject(mesh)).length);
  }
  const peak = Math.max(...views); worstVisibleDraws = Math.max(worstVisibleDraws, peak);
  check(peak < data.draws * .7, 'camera views cull a meaningful share of the full skyline');
  check(JSON.stringify(course.features) === before, 'rendering the skyline preserves every physics and route feature');
  const geometries = new Set(group.children.map(mesh => mesh.geometry)), materials = new Set(group.children.map(mesh => mesh.material)); let disposedGeometries = 0, disposedMaterials = 0, disposedMeshes = 0;
  for (const geometry of geometries) geometry.addEventListener('dispose', () => disposedGeometries++);
  for (const material of materials) material.addEventListener('dispose', () => disposedMaterials++);
  for (const mesh of group.children) mesh.addEventListener('dispose', () => disposedMeshes++);
  disposeTree(group);
  check(disposedGeometries === geometries.size && disposedMaterials === materials.size && disposedMeshes === group.children.length, 'normal scene disposal releases each shared skyline resource exactly once');
  ground.dispose();
  console.log(`${id}/${seed}: ${data.towers.length} towers, ${data.cells} cells, ${data.draws} total / ${peak} peak visible draws.`);
}
for (const definition of COURSE.filter(event => !['midnight-chase', 'neon-drift-trial'].includes(event.id))) {
  const course = new Course(definition, 1989), world = new THREE.Group();
  check(addCitySkyline(world, course) === null && world.children.length === 0, 'mixed landscapes and stadiums retain their existing horizons');
}
{
  const material = createSkylineFacadeMaterial(), source = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} };
  material.onBeforeCompile(source);
  check(source.vertexShader.includes('modelMatrix*instanceMatrix') && source.fragmentShader.includes('fwidth(grid)') && source.fragmentShader.includes('totalEmissiveRadiance=skylineGlow'), 'window grids use instanced physical scale, antialiasing and muted emissive light');
  check(!material.transparent && !source.fragmentShader.includes('discard;'), 'the skyline uses opaque depth-tested facade surfaces'); material.dispose();
}
console.log(`City skyline: ${checks} checks, ${groundQueries} real-terrain queries; minimum road clearance ${minimumClearance.toFixed(2)}m, foundation burial ${minimumBurial.toFixed(2)}m, peak visible batches ${worstVisibleDraws}.`);
