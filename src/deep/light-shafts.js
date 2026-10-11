// Slanting shafts of sunlight ("god rays") coming down through the water.
//
// Each shaft is one soft strip that turns to face the camera around its own
// slant. Strips are laid on a fixed grid under the surface so they hold still
// as the camera moves, drift slowly in brightness, thin out with depth, and
// glow most when you look toward the sun. A hard cap sets how many exist.
import * as THREE from 'three';
import { WATER_GLSL } from './water-shader.js';

export const SHAFT_HARD_CAP = 40;
const GRID = 6;       // metres between possible shafts
const REACH = 9;      // grid cells either side of the camera

const VERTEX = /* glsl */`
attribute vec4 aBeam;     // surface x, surface z, half width, phase
varying vec2 vUv;
varying vec4 vBeam;
varying vec3 vW;
uniform vec3 uAxis;       // direction the light travels (unit, downward)
uniform float uLength;    // distance along the axis the shaft reaches
void main() {
  float s = 1.0 - uv.y;   // 0 at the surface, 1 at the bottom end
  vec3 origin = vec3(aBeam.x, 2.0, aBeam.y);
  vec3 centre = origin + uAxis * (s * uLength);
  vec3 side = normalize(cross(uAxis, cameraPosition - centre));
  vec3 world = centre + side * (uv.x * 2.0 - 1.0) * aBeam.z * (0.55 + 0.9 * s);
  vUv = vec2(uv.x, s);
  vBeam = aBeam;
  vW = world;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;

const FRAGMENT = /* glsl */`
${WATER_GLSL}
varying vec2 vUv;
varying vec4 vBeam;
varying vec3 vW;
uniform vec3 uAxis;
uniform float uStrength;
void main() {
  vec3 toPoint = vW - uUwCam[3].xyz;
  float dist = length(toPoint);
  vec3 eye = toPoint / dist;
  float depth = max(-vW.y, 0.0);
  float across = vUv.x * 2.0 - 1.0;
  float body = exp(-across * across * 3.2);
  // A shaft is really a fan of thinner rays that slowly shift: streaks across
  // its width, drifting in brightness along its length.
  float streaks = uwNoise(vec2(across * 4.5 + vBeam.w * 17.0 + uUwTime * 0.04, vUv.y * 0.8 + vBeam.w * 5.0));
  float streaks2 = uwNoise(vec2(across * 11.0 - vBeam.w * 9.0, vUv.y * 1.6 - uUwTime * 0.05));
  float along = uwNoise(vec2(vUv.y * 4.0 - uUwTime * 0.10 + vBeam.w * 23.0, vBeam.w * 7.0));
  float shimmer = (0.15 + 1.0 * streaks * (0.4 + 0.8 * streaks2)) * (0.45 + 0.7 * along);
  float top = smoothstep(0.0, 5.0, depth);                // fan out of the surface, not a hard start
  float fade = exp(-depth * 0.050) * (1.0 - smoothstep(22.0, 45.0, depth));
  float near = smoothstep(2.0, 9.0, dist);
  // Light scatters most strongly toward you when you look toward the sun.
  float cosA = clamp(dot(eye, -uAxis), 0.0, 1.0);
  float phase = 0.30 + 1.1 * pow(cosA, 3.0);
  float a = body * shimmer * top * fade * near * phase * uStrength;
  vec3 colour = vec3(1.0, 0.94, 0.78) * uwLight(vW.y);
  colour *= exp(-uUwExt * dist * 0.6);
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

function cellHash(i, j) {
  let h = Math.imul(i, 374761393) + Math.imul(j, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function createLightShafts(uniforms, { count = 24, bottom = 55, direct = false } = {}) {
  const cap = Math.min(Math.max(0, Math.floor(count)), SHAFT_HARD_CAP);
  const base = new THREE.PlaneGeometry(1, 1, 1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = base.index;
  geometry.setAttribute('position', base.attributes.position);
  geometry.setAttribute('uv', base.attributes.uv);
  const beams = new Float32Array(cap * 4);
  const beamAttribute = new THREE.InstancedBufferAttribute(beams, 4);
  beamAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aBeam', beamAttribute);
  geometry.instanceCount = 0;
  const axis = new THREE.Vector3();
  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uAxis: { value: axis }, uLength: { value: 60 }, uStrength: { value: 1 } },
    vertexShader: VERTEX, fragmentShader: FRAGMENT, defines: direct ? { UW_DIRECT: 1 } : {},
    transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide, fog: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Light shafts';
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  const picked = [];
  let lastCellX = NaN, lastCellZ = NaN;

  function layout(camera) {
    const cx = Math.round(camera.position.x / GRID), cz = Math.round(camera.position.z / GRID);
    if (cx === lastCellX && cz === lastCellZ) return;
    lastCellX = cx; lastCellZ = cz;
    picked.length = 0;
    for (let i = cx - REACH; i <= cx + REACH; i++) {
      for (let j = cz - REACH; j <= cz + REACH; j++) {
        const h = cellHash(i, j);
        if (h < 0.45) continue;
        const px = (i + (cellHash(i + 91, j) - 0.5) * 0.9) * GRID, pz = (j + (cellHash(i, j + 57) - 0.5) * 0.9) * GRID;
        // Keep the nearest, favouring shafts in front of the camera is left to the shader.
        picked.push({ px, pz, d: Math.hypot(px - camera.position.x, pz - camera.position.z), h });
      }
    }
    picked.sort((a, b) => a.d - b.d);
    const n = Math.min(cap, picked.length);
    for (let k = 0; k < n; k++) {
      const p = picked[k];
      beams[k * 4] = p.px; beams[k * 4 + 1] = p.pz;
      beams[k * 4 + 2] = 1.7 + 2.6 * cellHash(Math.round(p.px), Math.round(p.pz) + 3);
      beams[k * 4 + 3] = p.h;
    }
    geometry.instanceCount = n;
    beamAttribute.needsUpdate = true;
  }

  return {
    mesh,
    count: () => geometry.instanceCount,
    setStrength(value) { material.uniforms.uStrength.value = value; mesh.visible = value > 0.003; },
    update(camera) {
      axis.copy(uniforms.uUwSun.value).negate();
      material.uniforms.uLength.value = bottom / Math.max(0.3, -axis.y);
      layout(camera);
    },
    dispose() { base.dispose(); geometry.dispose(); material.dispose(); },
  };
}
