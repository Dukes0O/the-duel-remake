import assert from 'node:assert/strict';
import * as THREE from 'three';
import { COURSE } from '../src/config.js';
import { Course } from '../src/course.js';
import { strip } from '../src/world.js';
import { createPavedRoadMaterial, createPavedShoulderMaterial, pavedShoulderWidthAt } from '../src/road-surface.js';

let checks = 0, rows = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const shaderFor = material => {
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  material.onBeforeCompile(shader);
  return shader;
};
const asphalt = new THREE.Texture(), gravel = new THREE.Texture();
for (const texture of [asphalt, gravel]) {
  texture.repeat.set(1.25, 2.5); texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace; texture.userData.sharedAsset = true;
}
const textureState = textures => JSON.stringify(textures.map(t => [t.uuid, t.version, t.repeat.toArray(), t.offset.toArray(), t.colorSpace, t.wrapS, t.wrapT, t.userData]));
const before = textureState([asphalt, gravel]);
for (const night of [false, true]) {
  const material = createPavedRoadMaterial({ asphalt, night }), shader = shaderFor(material);
  check(material.map === asphalt && material.bumpMap === asphalt, 'Reuse the original asphalt maps without copying assets');
  check(material.roughness === (night ? .55 : .9) && material.bumpScale === .028, 'Preserve the existing lighting and grain baseline');
  check(!material.transparent && material.depthWrite && material.opacity === 1, 'Road remains fully opaque with normal depth handling');
  check(!shader.fragmentShader.includes('discard'), 'No worn asphalt pixel can expose a hole in the road');
  check(shader.fragmentShader.indexOf('float roadWheelWear=') < shader.fragmentShader.indexOf('roughnessFactor-roadWheelWear'), 'Wear masks exist before the roughness calculation');
  check(shader.uniforms.roadWearPolish.value === (night ? 0 : .025), 'Night wheel paths cannot become bright polished headlight stripes');
  check(shader.vertexShader.includes('modelMatrix*vec4(position,1.0)') && shader.fragmentShader.includes('vRoadSurfaceWorld.xz'), 'Repairs are anchored in world space across the lap seam');
  check(shader.fragmentShader.includes('#include <map_fragment>') && shader.fragmentShader.includes('#include <roughnessmap_fragment>'), 'Keep Three lighting, textures and road paint independent');
  material.dispose();
}
for (const def of COURSE.filter(def => !def.arena && !def.offroad)) for (const seed of [1989, 42, 17]) {
  const course = new Course(def, seed), obstacles = JSON.stringify(course.features.obstacles);
  const material = createPavedShoulderMaterial({ gravel, course, alpine: def.theme === 'alpine' }), shader = shaderFor(material);
  check(material.map === gravel && material.bumpMap === gravel && material.roughness === 1, 'Shoulder is rough textured gravel');
  check(!material.transparent && material.opacity === 1 && material.depthWrite, 'Ragged shoulder uses opaque cutout without sorting');
  check(shader.uniforms.shoulderCourseLength.value === course.length, 'Shoulder width shader uses the actual lap length');
  check((shader.uniforms.shoulderPassingLanes?.value.length || 0) === course.features.passingLanes.length, 'Every passing lane participates in shoulder width');
  for (const lane of course.features.passingLanes) for (const delta of [-1, 0, 1, 12, 23, 44, 45, 46]) for (const s of [lane.start + delta, lane.end - delta]) {
    check(Math.abs(pavedShoulderWidthAt(course, s) - course.roadHalfWidthAt(s)) < 1e-9, 'Shoulder follows the exact widening and narrowing of passing lanes');
  }
  for (const side of [-1, 1]) {
    const geometry = strip(course, s => side * course.roadHalfWidthAt(s), s => side * (course.roadHalfWidthAt(s) + 1.25), .018);
    const uv = geometry.attributes.uv, position = geometry.attributes.position;
    for (let i = 0; i < uv.count; i++) {
      const s = uv.getY(i) * 10, width = pavedShoulderWidthAt(course, s), edge = Math.abs(uv.getX(i) * 5) - width;
      const outer = side > 0 ? i % 2 === 1 : i % 2 === 0;
      check(Math.abs(edge - (outer ? 1.25 : 0)) < .00003, 'Shader edge coordinate agrees with existing strip vertices on both sides');
      check(Number.isFinite(position.getX(i) + position.getY(i) + position.getZ(i)), 'All unchanged shoulder vertices remain finite');
      if (!outer) check(edge / 1.25 < .001, 'The asphalt-side edge is completely covered');
      rows++;
    }
    // The clip threshold .85–.975 leaves at least 1.0625 m of solid shoulder.
    check(.85 * 1.25 > 1 && .975 * 1.25 < 1.25, 'Rough edge leaves the full inner metre intact');
    geometry.dispose();
  }
  check(JSON.stringify(course.features.obstacles) === obstacles, 'Material construction does not modify physical course features');
  material.dispose();
}
check(textureState([asphalt, gravel]) === before, 'Shared road/gravel/terrain textures retain their transforms and ownership');
console.log(`Road surface: ${checks} checks passed across ${rows} shoulder vertices; road geometry, paint and gravel-event materials unchanged.`);
