// The surface seen from below, and the open water behind everything.
//
// The ceiling follows the camera. Looking straight up (inside "Snell's
// window", about 49 degrees either side of up) you see the sky through the
// water, bent and wobbled by the waves, with the sun as a soft bright disc.
// Looking at a shallower angle the surface is a silver mirror of the water.
import * as THREE from 'three';
import { WATER_GLSL } from './water-shader.js';

const REFRACTIVE_INDEX = 1.33;

// Where the sun is in the air, given the direction its light takes under water.
// Water bends light toward the vertical, so the sun sits lower than it looks.
export function airSunFromWater(underwater, out = new THREE.Vector3()) {
  const horizontal = Math.hypot(underwater.x, underwater.z);
  if (horizontal < 1e-6) return out.set(0, 1, 0);
  const sinAir = Math.min(0.999, horizontal * REFRACTIVE_INDEX);
  const scale = sinAir / horizontal;
  return out.set(underwater.x * scale, Math.sqrt(1 - sinAir * sinAir), underwater.z * scale).normalize();
}

const CEILING_VERTEX = /* glsl */`
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const CEILING_FRAGMENT = /* glsl */`
${WATER_GLSL}
varying vec3 vW;
uniform vec3 uSunAir;

vec2 uwWave(vec2 p, vec2 d, float k, float a, float s, float fade) {
  return normalize(d) * (k * a * fade * cos(dot(normalize(d), p) * k + uUwTime * s));
}

vec2 uwWaves(vec2 p, float dist) {
  float f1 = 1.0 - smoothstep(60.0, 260.0, dist * 1.0);
  float f2 = 1.0 - smoothstep(30.0, 160.0, dist);
  float f3 = 1.0 - smoothstep(15.0, 90.0, dist);
  // Each ripple size slopes about the same, from long swell to fine wind ripple.
  // Break up the regular rows with a slow wander of the whole pattern.
  p += vec2(uwNoise(p * 0.21 + uUwTime * 0.02) - 0.5, uwNoise(p.yx * 0.23 - uUwTime * 0.015) - 0.5) * 2.2;
  vec2 g = uwWave(p, vec2(1.0, 0.3), 0.45, 0.032, 0.55, 1.0)
         + uwWave(p, vec2(-0.4, 1.0), 0.80, 0.022, 0.70, 1.0)
         + uwWave(p, vec2(0.7, -0.8), 1.45, 0.016, 0.95, f1)
         + uwWave(p, vec2(-1.0, -0.5), 2.60, 0.009, 1.30, f1)
         + uwWave(p, vec2(0.2, 1.0), 4.70, 0.005, 1.70, f2)
         + uwWave(p, vec2(1.0, 0.9), 8.30, 0.0026, 2.30, f2)
         + uwWave(p, vec2(-0.8, 0.6), 14.0, 0.0012, 2.90, f3)
         + uwWave(p.yx * 1.13 + 3.0, vec2(0.6, -0.3), 3.30, 0.0075, 1.10, f1);
  return g;
}

vec3 uwSky(vec3 r) {
  float h = clamp(r.y, 0.0, 1.0);
  vec3 horizon = vec3(0.80, 0.90, 1.00) * 1.0;
  vec3 zenith = vec3(0.25, 0.50, 0.95) * 1.1;
  vec3 sky = mix(horizon, zenith, pow(h, 0.55));
  float sd = max(dot(r, uSunAir), 0.0);
  sky += vec3(1.0, 0.93, 0.78) * (smoothstep(0.9880, 0.9985, sd) * 18.0 + pow(sd, 40.0) * 2.4 + pow(sd, 6.0) * 0.25);
  return sky;
}

void main() {
  vec3 toPoint = vW - uUwCam[3].xyz;
  float dist = length(toPoint);
  vec3 V = toPoint / dist;
  vec2 g = uwWaves(vW.xz, dist);
  vec3 N = normalize(vec3(-g.x, -1.0, -g.y));
  float eta = ${REFRACTIVE_INDEX.toFixed(2)};
  float cosI = clamp(-dot(N, V), 0.0, 1.0);
  float sinT2 = eta * eta * (1.0 - cosI * cosI);
  float F = 1.0;
  vec3 sky = vec3(0.0);
  if (sinT2 < 1.0) {
    float cosT = sqrt(1.0 - sinT2);
    float rs = (eta * cosI - cosT) / (eta * cosI + cosT);
    float rp = (cosI - eta * cosT) / (cosI + eta * cosT);
    F = 0.5 * (rs * rs + rp * rp);
    // The edge of the window fades gradually into the mirror.
    F = max(F, smoothstep(0.20, 1.0, sinT2) * 0.88);
    sky = uwSky(refract(V, N, eta));
  }
  vec3 mirror = reflect(V, N);
  mirror.y = min(mirror.y, -0.02);
  vec3 silver = uwWaterDome(normalize(mirror)) * 1.8 + uUwWater * 0.18;
  vec3 col = sky * (1.0 - F) + silver * F;
  col = uwHaze(col, dist, 0.0) * uUwExposure;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const DOME_VERTEX = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * viewMatrix * vec4(position * 900.0 + cameraPosition, 1.0);
  gl_Position = p.xyww;
}`;

const DOME_FRAGMENT = /* glsl */`
${WATER_GLSL}
varying vec3 vDir;
void main() {
  gl_FragColor = vec4(uwWaterDome(normalize(vDir)) * uUwExposure, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createWaterSurface(uniforms, size = 1500) {
  const sunAir = new THREE.Vector3();
  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uSunAir: { value: sunAir } },
    vertexShader: CEILING_VERTEX, fragmentShader: CEILING_FRAGMENT, side: THREE.DoubleSide, fog: false,
  });
  const geometry = new THREE.PlaneGeometry(size, size);
  geometry.rotateX(Math.PI / 2);
  const ceiling = new THREE.Mesh(geometry, material);
  ceiling.name = 'Surface from below';
  ceiling.frustumCulled = false;
  return {
    mesh: ceiling,
    update(camera) {
      // Follow the camera sideways, in whole metres so the waves do not swim.
      ceiling.position.set(Math.round(camera.position.x), 0, Math.round(camera.position.z));
      airSunFromWater(uniforms.uUwSun.value, sunAir);
    },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}

export function createWaterDome(uniforms) {
  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms }, vertexShader: DOME_VERTEX, fragmentShader: DOME_FRAGMENT,
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  });
  const geometry = new THREE.SphereGeometry(1, 24, 16);
  const dome = new THREE.Mesh(geometry, material);
  dome.name = 'Open water';
  dome.frustumCulled = false;
  dome.renderOrder = -10;
  return { mesh: dome, dispose() { geometry.dispose(); material.dispose(); } };
}
