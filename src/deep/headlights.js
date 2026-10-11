// Headlights that cut through the gloom: two spot lights, plus a faint beam in
// the water (lit specks along the cone) so you can see where they point. The
// lamp lenses glow. The car itself is only read, never changed.
import * as THREE from 'three';
import { WATER_GLSL } from './water-shader.js';

const beamVertex = length => /* glsl */`
varying vec3 vNormalW;
varying vec3 vW;
varying float vAlong;
void main() {
  vAlong = clamp(position.z / ${length.toFixed(1)}, 0.0, 1.0);   // 0 at the lamp, 1 at the far end
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const BEAM_FRAGMENT = /* glsl */`
${WATER_GLSL}
varying vec3 vNormalW;
varying vec3 vW;
varying float vAlong;
uniform float uBeam;
void main() {
  vec3 toPoint = vW - uUwCam[3].xyz;
  float dist = length(toPoint);
  vec3 eye = toPoint / dist;
  // The cone is thickest, so brightest, where you look straight through its middle.
  float face = abs(dot(normalize(vNormalW), eye));
  float body = pow(face, 2.2);
  float fade = pow(1.0 - vAlong, 1.8) * smoothstep(0.0, 0.18, vAlong);
  float a = body * fade * uBeam * smoothstep(1.0, 4.0, dist);
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
  intensity = 95, range = 80, angle = 0.36, beamLength = 30, beamStrength = 0.11, direct = false,
} = {}) {
  const group = new THREE.Group();
  group.name = 'Headlights';
  const lights = [];
  const coneGeometry = new THREE.ConeGeometry(Math.tan(angle) * beamLength * 0.55, beamLength, 20, 1, true);
  coneGeometry.translate(0, -beamLength / 2, 0);   // tip at the origin, opening toward -y
  coneGeometry.rotateX(-Math.PI / 2);              // open toward +z
  const beamMaterial = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uBeam: { value: beamStrength } },
    vertexShader: beamVertex(beamLength),
    fragmentShader: BEAM_FRAGMENT, defines: direct ? { UW_DIRECT: 1 } : {},
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  for (const lamp of lamps) {
    const light = new THREE.SpotLight(0xfff0d8, intensity, range, angle, 0.95, 1.15);
    light.position.set(lamp.x, lamp.y, lamp.z);
    light.target.position.set(lamp.x * 0.6, lamp.y - 1.6, lamp.z + 22);
    group.add(light, light.target);
    const beam = new THREE.Mesh(coneGeometry, beamMaterial);
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
    dispose() { coneGeometry.dispose(); beamMaterial.dispose(); car.remove(group); },
  };
}
