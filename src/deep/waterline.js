// Going under: the waterline slides up the screen as the view sinks, with a
// bright wobbling edge, the picture below it turning green-blue and soft, and a
// burst of bubbles when the camera goes through (docs/THE_DEEP.md section 2).
//
// It is a screen overlay drawn after the scene. The renderer calls
// update(camera, seconds) and then draws overlay.scene with overlay.camera.
// The surface is y = 0. Nothing here touches race state.
import * as THREE from 'three';
import { makeRng } from '../rng.js';

export const BUBBLE_CAP = 90;
const BUBBLE_LIFE = 1.7; // seconds

// The share of the screen's height that is under water, looking straight down
// the middle column of the near plane. Pure maths, so it can be tested.
export function waterlineShare(camera, surface = 0) {
  camera.updateMatrixWorld();
  const inverse = camera.projectionMatrixInverse, world = camera.matrixWorld;
  const at = ndcY => new THREE.Vector3(0, ndcY, -1).applyMatrix4(inverse).applyMatrix4(world).y - surface;
  const bottom = at(-1), top = at(1);
  if (bottom >= 0 && top >= 0) return 0;
  if (bottom < 0 && top < 0) return 1;
  // The near plane is flat, so height changes evenly up the screen.
  const t = bottom / (bottom - top);
  return bottom < 0 ? t : 1 - t;
}

const VERTEX = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// For each pixel: the point on the near plane in the world. Below the wavy
// surface it takes the water's colour; at the surface a bright, thin edge.
const FRAGMENT = /* glsl */`
uniform mat4 uInvProj;
uniform mat4 uCamWorld;
uniform float uTime;
uniform vec3 uWater;
varying vec2 vUv;
void main() {
  vec4 view = uInvProj * vec4(vUv * 2.0 - 1.0, -1.0, 1.0);
  view /= view.w;
  vec3 world = (uCamWorld * vec4(view.xyz, 1.0)).xyz;
  float wave = 0.012 * sin(world.x * 38.0 + uTime * 5.0) + 0.008 * sin(world.z * 51.0 - uTime * 3.7) + 0.006 * sin((world.x + world.z) * 23.0 + uTime * 2.3);
  float h = world.y - wave;
  float under = 1.0 - smoothstep(-0.004, 0.004, h);
  float edge = exp(-abs(h) * 260.0);
  vec3 colour = mix(vec3(1.0), uWater, under);
  float alpha = under * 0.52 + edge * 0.85;
  gl_FragColor = vec4(colour + edge * 0.9, clamp(alpha, 0.0, 0.95));
}`;

const BUBBLE_VERTEX = /* glsl */`
attribute float aSize;
attribute float aAlpha;
varying float vAlpha;
void main() {
  vAlpha = aAlpha;
  gl_PointSize = aSize;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;
const BUBBLE_FRAGMENT = /* glsl */`
varying float vAlpha;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float rim = smoothstep(0.62, 0.95, r) * (1.0 - smoothstep(0.95, 1.0, r));
  float glint = smoothstep(0.35, 0.0, length(p - vec2(-0.35, -0.35)));
  gl_FragColor = vec4(vec3(0.92, 0.98, 1.0), (rim * 0.85 + glint * 0.9 + 0.06) * vAlpha);
}`;

export function createWaterline({ seed = 4127, water = [0.10, 0.36, 0.40], pixelRatio = 1 } = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() },
    uTime: { value: 0 }, uWater: { value: new THREE.Color(...water) },
  };
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthTest: false, depthWrite: false }));
  veil.frustumCulled = false;
  scene.add(veil);

  // Bubbles in screen space: born at the bottom when the camera goes under,
  // they wobble up and fade.
  const rng = makeRng(seed);
  const positions = new Float32Array(BUBBLE_CAP * 3), sizes = new Float32Array(BUBBLE_CAP), alphas = new Float32Array(BUBBLE_CAP);
  const bubbles = Array.from({ length: BUBBLE_CAP }, () => ({ age: Infinity, x: 0, y: 0, rise: 0, size: 0, phase: 0 }));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  const points = new THREE.Points(geometry, new THREE.ShaderMaterial({
    vertexShader: BUBBLE_VERTEX, fragmentShader: BUBBLE_FRAGMENT, transparent: true, depthTest: false, depthWrite: false }));
  points.frustumCulled = false;
  scene.add(points);

  let lastShare = 0, lastSeconds = null, live = 0;
  function burst(strength) {
    for (const b of bubbles) {
      if (b.age < BUBBLE_LIFE || rng.float() > strength) continue;
      Object.assign(b, { age: rng.range(-0.25, 0), x: rng.range(-0.95, 0.95), y: rng.range(-1.15, -0.55),
        rise: rng.range(0.55, 1.35), size: rng.range(5, 26) * pixelRatio, phase: rng.float() * Math.PI * 2 });
    }
  }

  return {
    scene, camera,
    get bubbleCount() { return live; },
    // True while there is anything to draw, so the renderer can skip the pass.
    get active() { return lastShare > 0 && lastShare < 1 || live > 0; },
    update(view, seconds) {
      view.updateMatrixWorld();
      uniforms.uInvProj.value.copy(view.projectionMatrixInverse);
      uniforms.uCamWorld.value.copy(view.matrixWorld);
      uniforms.uTime.value = seconds;
      veil.visible = true;
      const share = waterlineShare(view);
      // Going through the surface sets off the bubbles.
      if (lastShare < 0.5 && share >= 0.5) burst(0.9);
      const dt = lastSeconds === null ? 0 : Math.min(0.1, Math.max(0, seconds - lastSeconds));
      lastShare = share; lastSeconds = seconds; live = 0;
      bubbles.forEach((b, i) => {
        b.age += dt;
        const alive = b.age >= 0 && b.age < BUBBLE_LIFE;
        if (alive) live++;
        const t = Math.max(0, b.age);
        positions[i * 3] = b.x + Math.sin(t * 7 + b.phase) * 0.012 * (1 + b.size / 20);
        positions[i * 3 + 1] = b.y + b.rise * t + 0.18 * t * t;
        sizes[i] = alive ? b.size * (1 + t * 0.25) : 0;
        alphas[i] = alive ? Math.min(1, t * 6) * (1 - t / BUBBLE_LIFE) : 0;
      });
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.aSize.needsUpdate = true;
      geometry.attributes.aAlpha.needsUpdate = true;
      // Fully under: the scene's own water look takes over; the veil steps aside.
      veil.visible = share < 1;
      return share;
    },
    dispose() { veil.geometry.dispose(); veil.material.dispose(); geometry.dispose(); points.material.dispose(); },
  };
}
