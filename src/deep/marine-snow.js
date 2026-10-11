// Marine snow: fine specks of drifting matter in the water. They wrap around
// the camera in a box, so there is always a little drift past the lens and
// you can feel the water move. One draw, all movement in the vertex shader.
import * as THREE from 'three';
import { makeRng } from '../rng.js';
import { WATER_GLSL } from './water-shader.js';

export const SNOW_HARD_CAP = 2000;
const BOX = 28;

const VERTEX = /* glsl */`
attribute vec4 aSeed;      // position in the box (0..1), size
uniform mat4 uUwCam;
uniform float uUwTime;
uniform float uPixels;     // pixels per metre at one metre away
uniform vec3 uCurrent;
varying float vNear;
varying float vFar;
varying vec3 vW;
varying float vSizeGlint;
void main() {
  vec3 cam = uUwCam[3].xyz;
  vec3 p = aSeed.xyz * ${BOX.toFixed(1)};
  p += uCurrent * uUwTime;
  p.y += sin(uUwTime * 0.3 + aSeed.x * 40.0) * 0.4;
  p.x += sin(uUwTime * 0.21 + aSeed.y * 31.0) * 0.5;
  vec3 rel = mod(p - cam + ${(BOX / 2).toFixed(1)}, ${BOX.toFixed(1)}) - ${(BOX / 2).toFixed(1)};
  vec3 world = cam + rel;
  vec4 mv = viewMatrix * vec4(world, 1.0);
  vW = world;
  float dist = length(rel);
  vNear = smoothstep(0.35, 1.6, dist);
  vFar = 1.0 - smoothstep(9.0, 13.5, dist);
  vSizeGlint = fract(aSeed.w * 57.0);
  gl_PointSize = clamp(aSeed.w * uPixels / max(-mv.z, 0.1), 1.0, 7.0);
  gl_Position = projectionMatrix * mv;
}`;

const FRAGMENT = /* glsl */`
${WATER_GLSL}
varying float vNear;
varying float vFar;
varying vec3 vW;
varying float vSizeGlint;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r = dot(c, c);
  if (r > 1.0) discard;
  float soft = 1.0 - smoothstep(0.1, 1.0, r);
  float dist = length(vW - uUwCam[3].xyz);
  // Sunlit specks near the surface glow; deep ones are dim grey.
  vec3 colour = vec3(0.92, 0.88, 0.74) * uwLight(vW.y) * (0.35 + 0.9 * vSizeGlint);
  colour = uwHaze(colour, dist, vW.y) * uUwExposure;
  float alpha = soft * vNear * vFar * 0.5;
  gl_FragColor = vec4(colour, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createMarineSnow(uniforms, { count = 1200, seed = 7 } = {}) {
  const n = Math.min(Math.max(0, Math.floor(count)), SNOW_HARD_CAP);
  const rng = makeRng(seed);
  const seeds = new Float32Array(n * 4), positions = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    seeds[i * 4] = rng.float(); seeds[i * 4 + 1] = rng.float(); seeds[i * 4 + 2] = rng.float();
    // Mostly tiny, a few larger flakes.
    seeds[i * 4 + 3] = 0.012 + Math.pow(rng.float(), 3) * 0.05;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uPixels: { value: 700 }, uCurrent: { value: new THREE.Vector3(0.10, -0.035, 0.06) } },
    vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthWrite: false, fog: false,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'Marine snow';
  points.frustumCulled = false;
  points.renderOrder = 6;
  return {
    mesh: points,
    count: n,
    update(camera, drawingHeight) {
      material.uniforms.uPixels.value = (drawingHeight / 2) * camera.projectionMatrix.elements[5];
    },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}
