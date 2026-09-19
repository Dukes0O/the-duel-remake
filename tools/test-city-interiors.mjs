import assert from 'node:assert/strict';
import * as THREE from 'three';
import { COURSE } from '../src/config.js';
import { Course } from '../src/course.js';
import { addCityChaseDetail } from '../src/city-chase-detail.js';
import { createCityInteriorMaterial, traceCityInteriorRay } from '../src/city-interiors.js';

let checks = 0, windows = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
const size = [.03, 1.12, 1.57];
const center = traceCityInteriorRay([.5, .5], size, [10, 0, 0]);
equal(center.wall, 'back'); equal(center.point, [0, 0, 3]);
equal(traceCityInteriorRay([.5, .5], size, [-10, 0, 0]), null, 'backwards ray is not an interior view');
equal(traceCityInteriorRay([.5, .5], size, [10, 10, 0]).wall, 'floor');
equal(traceCityInteriorRay([.5, .5], size, [10, -10, 0]).wall, 'ceiling');
equal(traceCityInteriorRay([.5, .5], size, [10, 0, 10]).wall, 'side');
const left = traceCityInteriorRay([.5, .5], size, [10, 0, -3]);
const right = traceCityInteriorRay([.5, .5], size, [10, 0, 3]);
check(right.point[0] - left.point[0] > 1.5, 'view movement reveals actual room parallax');
for (const u of [.01, .25, .5, .75, .99]) for (const v of [.01, .3, .7, .99]) for (const angle of [-15, -4, 0, 4, 15]) {
  const a = traceCityInteriorRay([u, v], size, [10, 2, angle]);
  const opposite = traceCityInteriorRay([u, v], size, [-10, 2, -angle], -1);
  const endWall = traceCityInteriorRay([u, v], [size[2], size[1], size[0]], [-angle, 2, 10], 1, 'z');
  check(a.point.every(Number.isFinite) && a.distance >= 0, 'finite perspective intersection');
  equal(a, opposite, 'opposite building side has matching camera-relative perspective');
  equal(a, endWall, 'end facade uses correct horizontal axis');
  check(Math.abs(a.point[0]) <= 1.4 + 1e-8 && Math.abs(a.point[1]) <= 1.4 + 1e-8 && a.point[2] <= 3 + 1e-8, 'room intersection stays within virtual walls');
}
const material = createCityInteriorMaterial(), shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
material.onBeforeCompile(shader);
check(shader.vertexShader.includes('modelMatrix*instanceMatrix'), 'orientation follows each building instance');
check(shader.vertexShader.includes('cameraPosition-'), 'view direction depends on the real camera');
check(shader.fragmentShader.includes('cityRoomBox(cityOrigin,cityRay'), 'furniture uses depth intersections');
check(shader.fragmentShader.includes('length(vCityRoomEye)<180.0'), 'distant furniture calculation is bounded');
check(!material.transparent && !material.map && !material.emissiveMap, 'no transparent sorting or new image downloads');

const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3(), local = new THREE.Vector3(), normal = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
const originalLoader = THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load = function () { return new THREE.Texture(); };
try {
  for (const [id, baselineDraws] of [['harbor-highlands', 208], ['midnight-chase', 362]]) {
    const course = new Course(COURSE.find(def => def.id === id), 1989), obstacles = JSON.stringify(course.features.obstacles);
    const group = addCityChaseDetail(new THREE.Group(), course);
    check(group.children.length<=baselineDraws, `${id}: depth stays within the original draw budget`);
    equal(JSON.stringify(course.features.obstacles), obstacles, `${id}: collision data is untouched`);
    const glass = group.children.filter(mesh => mesh.name === 'City glass pane');
    check(glass.every(mesh => mesh.material === glass[0].material && !mesh.castShadow), 'one shared glass material and no opaque window shadows');
    check(glass.every(mesh => mesh.geometry.index.count === 6), 'two triangles per pane; hidden box faces are eliminated');
    let upper = 0, shops = 0;
    for (const mesh of glass) for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix); matrix.decompose(position, quaternion, scale);
      check(matrix.elements.every(Number.isFinite), 'finite window placement');
      const building = course.features.buildings.find(b => {
        local.copy(position).sub(new THREE.Vector3(b.x, b.y, b.z)).applyAxisAngle(new THREE.Vector3(0, 1, 0), -b.heading);
        return Math.abs(local.x) <= b.halfX + .16 && Math.abs(local.z) <= b.halfZ + .16 && local.y > 0 && local.y < b.height;
      });
      check(!!building, 'window remains attached to an existing solid building');
      normal.set(0, 0, 1).applyQuaternion(quaternion).applyAxisAngle(up, -building.heading);
      check(normal.x * local.x + normal.z * local.z > 1, 'each single-sided pane faces outside its building');
      if (scale.y < 1.2) {
        upper++;
        check(local.y - scale.y / 2 > 4.3, 'new upper overlays stay above vehicle/ground hazards');
        check(Math.abs(local.x) <= building.halfX + .095 && Math.abs(local.z) <= building.halfZ + .095, 'new window stays within existing facade trim envelope');
        check(Math.min(scale.x, scale.z) < .031, 'interior depth uses a 3cm overlay only');
      } else shops++;
      windows++;
    }
    check(upper > shops * 4 && shops > 100, 'shop and skyline interiors are both present');
    const warm = group.children.filter(mesh => mesh.name === 'City warm box').reduce((sum, mesh) => sum + mesh.count, 0);
    equal(warm, shops, 'only real storefront header lights remain; fake shelf stripes are removed');
    console.log(`${id}: ${shops} storefronts, ${upper} upper panes, ${group.children.length}/${baselineDraws} facade draw budget.`);
  }
} finally { THREE.TextureLoader.prototype.load = originalLoader; }
console.log(`City interiors: ${checks} checks passed, ${windows} windows; view-dependent perspective, all four facade orientations, unchanged collision footprints and bounded draw count.`);
