// Headlights that cut through the gloom: two spot lights, plus a faint beam in
// the water (lit specks along the cone) so you can see where they point. The
// lamp lenses glow. The car itself is only read, never changed.
import * as THREE from 'three';
import { WATER_GLSL } from './water-shader.js';

// The beam in the water: one soft strip per lamp that turns to face the camera
// around its own axis (like the sun's shafts). Light scatters off the specks in
// the water, so it is soft, streaky, widens with distance and fades out.
const BEAM_VERTEX = /* glsl */`
uniform float uLength;
uniform float uSpread;
varying vec2 vUv;
varying vec3 vW;
varying vec3 vAxis;
void main() {
  vec3 origin = modelMatrix[3].xyz;
  vAxis = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
  float along = position.z;
  vec3 centre = origin + vAxis * along * uLength;
  vec3 side = normalize(cross(vAxis, cameraPosition - centre));
  vec3 world = centre + side * position.x * 2.0 * (0.12 + along * uSpread);
  vUv = vec2(position.x * 2.0, along);
  vW = world;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;

const BEAM_FRAGMENT = /* glsl */`
${WATER_GLSL}
varying vec2 vUv;
varying vec3 vW;
varying vec3 vAxis;
uniform float uBeam;
void main() {
  vec3 toPoint = vW - uUwCam[3].xyz;
  float dist = length(toPoint);
  vec3 eye = toPoint / dist;
  float across = vUv.x, along = vUv.y;
  float body = exp(-across * across * 3.2);
  float fade = pow(1.0 - along, 1.7) * smoothstep(0.0, 0.1, along);
  // Specks in the water catch the light unevenly: soft streaks along the beam.
  float streaks = 0.55 + 0.45 * uwNoise(vec2(across * 4.0 + uUwTime * 0.03, along * 5.0 - uUwTime * 0.08));
  float finer = 0.8 + 0.2 * uwNoise(vec2(across * 11.0, along * 17.0 + uUwTime * 0.1));
  // Brighter when you look back toward the lamp (light scattered forward).
  float forward = 0.45 + 0.95 * pow(max(dot(-eye, vAxis), 0.0), 3.0);
  float a = body * fade * streaks * finer * forward * uBeam * smoothstep(0.8, 4.0, dist);
  vec3 colour = vec3(1.0, 0.93, 0.76) * exp(-uUwExt * dist * 0.5);
  gl_FragColor = vec4(colour * a * uUwExposure, 1.0);
  #ifdef UW_DIRECT
  // Drawn straight to the screen, which already holds display colours: add a
  // display-sized amount of light instead of encoding it a second time.
  #ifdef TONE_MAPPING
  gl_FragColor.rgb = toneMapping(gl_FragColor.rgb);
  #endif
  gl_FragColor.rgb *= 0.8;
  #else
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #endif
}`;

// lamps: [{x, y, z}] positions on the car, in the car's own space (front is +z).
export function createHeadlights(car, uniforms, {
  lamps = [{ x: -0.6, y: 0.58, z: 2.38 }, { x: 0.6, y: 0.58, z: 2.38 }],
  intensity = 70, range = 80, angle = 0.42, beamLength = 32, beamStrength = 0.55, direct = false,
} = {}) {
  const group = new THREE.Group();
  group.name = 'Headlights';
  const lights = [];
  const beamGeometry = new THREE.PlaneGeometry(1, 1, 1, 8);
  beamGeometry.rotateX(-Math.PI / 2);          // lies along z, x is the width
  beamGeometry.translate(0, 0, 0.5);           // z from 0 (lamp) to 1 (far end)
  const beamMaterial = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uBeam: { value: beamStrength }, uLength: { value: beamLength }, uSpread: { value: beamLength * Math.tan(angle) * 0.7 } },
    vertexShader: BEAM_VERTEX,
    fragmentShader: BEAM_FRAGMENT, defines: direct ? { UW_DIRECT: 1 } : {},
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  for (const lamp of lamps) {
    const light = new THREE.SpotLight(0xfff0d8, intensity, range, angle, 1.0, 1.3);
    light.position.set(lamp.x, lamp.y, lamp.z);
    light.target.position.set(lamp.x * 0.6, lamp.y - 1.6, lamp.z + 22);
    group.add(light, light.target);
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.set(lamp.x, lamp.y, lamp.z + 0.05);
    beam.rotation.x = 0.05;
    beam.frustumCulled = false;
    beam.renderOrder = 7;
    group.add(beam);
    lights.push(light);
  }
  // Make the lenses glow: any emissive "headlamp" material on the car.
  const lenses = [];
  car.traverse(object => {
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) {
      if (material && /head ?lam?p|headlight/i.test(material.name || '') && material.emissive) {
        if (!lenses.includes(material)) lenses.push(material);
      }
    }
  });
  car.add(group);
  return {
    group, lights,
    setOn(on) {
      for (const light of lights) light.visible = on;
      group.children.forEach(child => { if (child.isMesh) child.visible = on; });
      for (const lens of lenses) lens.emissiveIntensity = on ? 3.2 : 0.12;
    },
    dispose() { beamGeometry.dispose(); beamMaterial.dispose(); car.remove(group); },
  };
}
