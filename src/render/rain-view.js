// FAR-RAIN: the rain, drawn. View only: it reads the race state and never writes it, and it draws nothing until a region
// with rain and its switch on asks for it (src/render/rain-regions.js). Every look number is in src/render/rain-look.js.
//
// What it adds to a frame while it rains, by its own reckoning (Claude times it on the laptop):
// - Draw calls: 3 from the chase camera (falling rain, wet ground, lens drops), 3 or 4 from the driver's seat
//   (falling rain, wet ground, beads, and the wiper while it moves). No extra pass and no render target.
// - Triangles: falling rain 2 per streak (High 14,000; Performance 4,800); wet ground High 49 tiles of 12 x 12 cells
//   (14,100), Performance 25 tiles of 10 x 10 (5,000); beads 2 each (at most 340 and 144).
// - Fill: the wet ground covers the ground in view once with a short shader; the beads and streaks are thin.
// - CPU: the beads, under 0.1 ms; finding the ground under new wet ground, a capped share of each frame (rain-look.js
//   buildMs) and only while the car moves on to new ground.
// Performance's lower-cost form: a third of the streaks, coarser and smaller wet ground, no rings in the puddles, and
// fewer beads.
import * as THREE from 'three';
import {COURSE} from '../config.js';
import {featureFlags} from '../feature-flags.js';
import {makeRng} from '../rng.js';
import {createRainArrival} from './rain-arrival.js';
import {createRainGlass, createRainWiper} from './rain-glass.js';
import {RAIN_LOOK} from './rain-look.js';
import {rainPlace, rainWanted} from './rain-regions.js';
import {createRainSky} from './rain-sky.js';
import {createRainSound} from './rain-sound.js';

// The glass is seen by the player's camera only, never in the mirror.
export const RAIN_GLASS_LAYER = 29;
const RELEASED = new Set(COURSE.map(event => event.id));
const qaBuild = () => Boolean(import.meta.env?.DEV || (typeof __DUEL_QA__ !== 'undefined' && __DUEL_QA__ === true));
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = value => { value = clamp(value); return value * value * (3 - 2 * value); };

const OUTPUT = /* glsl */`
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

// ---- Beads on the glass and on the lens ----------------------------------------------------------------------------
const BEAD_VERTEX = /* glsl */`
  attribute vec2 corner;
  attribute vec4 aBead;
  attribute vec2 aShape;
  uniform float uAspect, uBlur, uBlurShare;
  varying vec2 vUv;
  varying float vAlpha, vSoft, vSag;
  void main() {
    float radius = max(aBead.z, 1e-5);
    float blur = max(uBlur, radius * uBlurShare);
    float reach = radius + blur * 1.6;
    vec2 local = corner * vec2(reach, reach * aShape.x);
    vUv = local / radius;
    vUv.y /= aShape.x;
    vAlpha = aBead.w;
    vSoft = blur / radius;
    vSag = aShape.y;
    vec2 screen = aBead.xy + local;
    gl_Position = vec4(screen.x * 2.0 / uAspect, screen.y * 2.0, 0.0, 1.0);
  }
`;
const BEAD_FRAGMENT = /* glsl */`
  uniform vec3 uSky, uGround;
  uniform float uOpacity, uRim, uGlint;
  varying vec2 vUv;
  varying float vAlpha, vSoft, vSag;
  void main() {
    vec2 q = vUv;
    q.y += vSag * (1.0 - q.x * q.x) * 0.5 * step(q.y, 0.0);
    float d = length(q);
    float edge = 1.0 - smoothstep(1.0 - vSoft, 1.0 + vSoft, d);
    if (edge * vAlpha < 0.004) discard;
    // A bead is a small lens: the world in it is upside down, sky at its bottom and ground at its top.
    float clear = 1.0 / (1.0 + vSoft * 1.5);
    vec3 inside = mix(uSky, uGround, smoothstep(-0.55, 0.5, q.y));
    float rim = smoothstep(0.35, 1.0, d);
    inside *= 1.0 - uRim * rim * rim * clear;
    vec2 g = q - vec2(-0.3, 0.42);
    inside += uSky * uGlint * exp(-dot(g, g) * 34.0) * clear;
    gl_FragColor = vec4(inside, edge * vAlpha * uOpacity);
    ${OUTPUT}
  }
`;

function beadMesh(capacity, name, uniforms) {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('corner', new THREE.Float32BufferAttribute([-1, -1, 1, -1, 1, 1, -1, 1], 2));
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const beads = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const shapes = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 2), 2).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aBead', beads); geometry.setAttribute('aShape', shapes);
  geometry.instanceCount = 0;
  const material = new THREE.ShaderMaterial({name, vertexShader: BEAD_VERTEX, fragmentShader: BEAD_FRAGMENT, uniforms,
    transparent: true, depthTest: false, depthWrite: false});
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name; mesh.frustumCulled = false; mesh.renderOrder = 1e6; mesh.layers.set(RAIN_GLASS_LAYER);
  mesh.userData.excludeAmbientOcclusion = true;
  return {mesh, beads, shapes};
}

// ---- The wiper blade ---------------------------------------------------------------------------------------------
const SCREEN_VERTEX = /* glsl */`
  varying vec2 vScreen;
  uniform float uAspect;
  void main() { vScreen = position.xy * vec2(uAspect, 1.0) * 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const WIPER_FRAGMENT = /* glsl */`
  uniform vec2 uPivot;
  uniform float uFrom, uTo, uLength, uWidth, uShade;
  varying vec2 vScreen;
  void main() {
    vec2 d = vScreen - uPivot;
    float distance = length(d), angle = atan(d.y, d.x);
    float low = min(uFrom, uTo), high = max(uFrom, uTo);
    float halfAngle = uWidth / max(distance, 0.05);
    // Inside the sector it swept this frame, spread thinner the faster it went: the blade is close and moving.
    float inside = smoothstep(low - halfAngle * 2.0, low - halfAngle * 0.4, angle) * (1.0 - smoothstep(high + halfAngle * 0.4, high + halfAngle * 2.0, angle));
    float reach = (1.0 - smoothstep(uLength - 0.02, uLength + 0.015, distance)) * smoothstep(0.06, 0.12, distance);
    float spread = (halfAngle * 2.0) / max(halfAngle * 2.0, high - low + halfAngle * 0.8);
    float alpha = inside * reach * spread * uShade;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(vec3(0.012, 0.012, 0.014), alpha);
    ${OUTPUT}
  }
`;

// ---- The falling rain --------------------------------------------------------------------------------------------
const FALL_VERTEX = /* glsl */`
  attribute vec4 aSeed;
  attribute vec2 corner;
  uniform vec3 uBox, uFall, uEyeVelocity;
  uniform float uTime, uExposure, uWidth, uPixel, uNearest, uAlpha;
  varying float vAlpha;
  void main() {
    vec3 low = cameraPosition - uBox * 0.5;
    vec3 p = mod(aSeed.xyz * uBox + uFall * (0.9 + 0.2 * aSeed.w) * uTime - low, uBox) + low;
    vec3 velocity = uFall * (0.9 + 0.2 * aSeed.w) - uEyeVelocity;
    vec4 head = viewMatrix * vec4(p, 1.0), tail = viewMatrix * vec4(p - velocity * uExposure, 1.0);
    vec4 view = mix(head, tail, corner.y * 0.5 + 0.5);
    vec2 along = tail.xy / max(-tail.z, 0.05) - head.xy / max(-head.z, 0.05);
    vec2 side = normalize(vec2(-along.y, along.x) + vec2(1e-6, 0.0));
    float least = uPixel * max(-view.z, 0.05);
    float width = max(uWidth, least);
    view.xy += side * corner.x * width * 0.5;
    vec3 fromEye = (p - cameraPosition) / (uBox * 0.5);
    float edge = 1.0 - smoothstep(0.7, 1.0, max(abs(fromEye.x), max(abs(fromEye.y), abs(fromEye.z))));
    float near = smoothstep(uNearest, uNearest * 2.5, -head.z);
    vAlpha = uAlpha * edge * near * (uWidth / width);
    gl_Position = projectionMatrix * view;
  }
`;
const FALL_FRAGMENT = /* glsl */`
  uniform vec3 uColour;
  varying float vAlpha;
  void main() {
    if (vAlpha < 0.002) discard;
    gl_FragColor = vec4(uColour, vAlpha);
    ${OUTPUT}
  }
`;

function fallMesh(count) {
  const rng = makeRng(0x66616c6c), seeds = new Float32Array(count * 16), corners = new Float32Array(count * 8), index = new Uint32Array(count * 6);
  for (let i = 0; i < count; i++) {
    const a = rng.float(), b = rng.float(), c = rng.float(), d = rng.float();
    for (let k = 0; k < 4; k++) seeds.set([a, b, c, d], i * 16 + k * 4);
    corners.set([-1, -1, 1, -1, 1, 1, -1, 1], i * 8);
    index.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 12), 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geometry.setAttribute('corner', new THREE.BufferAttribute(corners, 2));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.setDrawRange(0, 0);
  const fall = RAIN_LOOK.fall;
  const material = new THREE.ShaderMaterial({name: 'Rain falling', vertexShader: FALL_VERTEX, fragmentShader: FALL_FRAGMENT,
    transparent: true, depthWrite: false, depthTest: true,
    uniforms: {uBox: {value: new THREE.Vector3(...fall.box)}, uFall: {value: new THREE.Vector3(fall.wind[0], -fall.speed, fall.wind[1])},
      uEyeVelocity: {value: new THREE.Vector3()}, uTime: {value: 0}, uExposure: {value: fall.exposure}, uWidth: {value: fall.widthMm / 1000},
      uPixel: {value: .001}, uNearest: {value: fall.nearest}, uAlpha: {value: fall.alpha}, uColour: {value: new THREE.Color()}}});
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Rain falling'; mesh.frustumCulled = false; mesh.userData.excludeAmbientOcclusion = true;
  return mesh;
}

// ---- Wet ground and puddles --------------------------------------------------------------------------------------
const GROUND_VERTEX = /* glsl */`
  attribute vec2 aHollow;
  varying vec3 vWorld;
  varying vec2 vHollow;
  void main() {
    vWorld = position;
    vHollow = aHollow;
    gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
  }
`;
const GROUND_FRAGMENT = /* glsl */`
  uniform vec2 uCentre, uFog;
  uniform vec3 uHorizon, uZenith;
  uniform float uRadius, uFadeFrom, uFadeTo, uWet, uPuddles, uTime, uRain;
  uniform float uWetDarken, uPuddleDarken, uWetGloss, uPuddleGloss, uReflectance, uSpot;
  uniform float uMicroShare, uMicroSize, uFillFrom, uFillTo, uEdge, uRippleCell, uRippleSeconds;
  varying vec3 vWorld;
  varying vec2 vHollow;
  float hash(vec2 p) { p = mod(p, 2048.0); return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    vec2 p = vWorld.xz;
    float fade = 1.0 - smoothstep(uRadius * uFadeFrom, uRadius * uFadeTo, distance(p, uCentre));
    fade *= 1.0 - smoothstep(uFog.x, uFog.y, distance(cameraPosition, vWorld));
    if (fade < 0.002) discard;
    // The first drops on dry ground: dark spots that come one by one and then join up.
    vec2 cell = p / uSpot, ci = floor(cell), cf = fract(cell) - 0.5;
    vec2 jitter = vec2(hash(ci), hash(ci + 17.0)) - 0.5;
    float born = hash(ci + 41.0), size = 0.2 + 0.22 * hash(ci + 73.0);
    float spot = (1.0 - smoothstep(size * 0.75, size, length(cf - jitter * 0.45))) * step(born, uWet * 3.0);
    float wet = max(spot * min(1.0, uWet * 4.0), smoothstep(0.22, 0.9, uWet));
    // Water stands where the ground is lower than the ground around it, on flat ground only.
    float micro = noise(p / uMicroSize) * 0.65 + noise(p / (uMicroSize * 0.37) + 3.1) * 0.35;
    float potential = vHollow.x + uMicroShare * vHollow.y * micro * micro * 1.4;
    float level = mix(uFillFrom, uFillTo, uPuddles);
    float puddle = uPuddles > 0.0 ? smoothstep(level - uEdge, level + uEdge, potential) : 0.0;
    vec3 normal = vec3(0.0, 1.0, 0.0);
    #ifdef RAIN_RIPPLES
      // Rings where the drops land: one ring a cell, each on its own beat.
      vec2 rc = p / uRippleCell, ri = floor(rc), rf = fract(rc) - 0.5 - (vec2(hash(ri + 5.0), hash(ri + 9.0)) - 0.5) * 0.5;
      float phase = fract(uTime / uRippleSeconds + hash(ri + 13.0));
      float rd = length(rf), ring = (rd - phase * 0.48) * 22.0;
      float wave = exp(-ring * ring) * (1.0 - phase) * uRain * puddle;
      normal.xz += normalize(rf + 1e-5) * wave * sin(ring * 2.0) * 0.45;
      normal = normalize(normal);
    #endif
    vec3 toEye = normalize(cameraPosition - vWorld);
    float facing = clamp(dot(normal, toEye), 0.0, 1.0);
    float fresnel = uReflectance + (1.0 - uReflectance) * pow(1.0 - facing, 5.0);
    vec3 bounce = reflect(-toEye, normal);
    vec3 sky = mix(uHorizon, uZenith, smoothstep(0.0, 0.7, bounce.y));
    float gloss = wet * (1.0 - puddle) * uWetGloss + puddle * uPuddleGloss;
    float keep = 1.0 - fade * (wet * (1.0 - puddle) * (1.0 - uWetDarken) + puddle * (1.0 - uPuddleDarken));
    gl_FragColor = vec4(sky * fresnel * gloss * fade, keep);
    ${OUTPUT}
    #ifdef TONE_MAPPING
      // Drawn straight to the screen (Performance), the colour below is already toned: darken it in the same terms.
      gl_FragColor.a = pow(keep, 1.0 / 2.2);
    #endif
  }
`;

function groundUniforms(look) {
  return {uCentre: {value: new THREE.Vector2()}, uFog: {value: new THREE.Vector2(100, 400)}, uHorizon: {value: new THREE.Color()},
    uZenith: {value: new THREE.Color()}, uRadius: {value: 1}, uFadeFrom: {value: look.fadeFrom}, uFadeTo: {value: look.fadeTo},
    uWet: {value: 0}, uPuddles: {value: 0}, uTime: {value: 0}, uRain: {value: 0}, uWetDarken: {value: look.wetDarken},
    uPuddleDarken: {value: look.puddleDarken}, uWetGloss: {value: look.wetGloss}, uPuddleGloss: {value: look.puddleGloss},
    uReflectance: {value: look.reflectance}, uSpot: {value: look.spotSize}, uMicroShare: {value: look.microShare},
    uMicroSize: {value: look.microSize}, uFillFrom: {value: look.fillFrom}, uFillTo: {value: look.fillTo}, uEdge: {value: look.edge},
    uRippleCell: {value: look.rippleCell}, uRippleSeconds: {value: look.rippleSeconds}};
}

// World-aligned tiles around the eye, in one mesh. A tile is laid on the real ground a few samples at a time, within a
// share of each frame, and is not shown until it is whole.
function createWetGround({high, look = RAIN_LOOK.ground}) {
  const tiles = high ? look.tilesHigh : look.tilesPerformance, cells = high ? look.cellsHigh : look.cellsPerformance;
  const side = cells + 1, perTile = side * side, slots = tiles * tiles, spacing = look.tile / cells;
  const positions = new Float32Array(slots * perTile * 3), hollows = new Float32Array(slots * perTile * 2);
  const index = new Uint32Array(slots * cells * cells * 6);
  let n = 0;
  for (let slot = 0; slot < slots; slot++) for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
    const a = slot * perTile + j * side + i, b = a + 1, c = a + side, d = c + 1;
    index.set([a, c, b, b, c, d], n); n += 6;
  }
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
  const hollow = new THREE.BufferAttribute(hollows, 2).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', position); geometry.setAttribute('aHollow', hollow);
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  const uniforms = groundUniforms(look);
  const material = new THREE.ShaderMaterial({name: 'Rain wet ground', vertexShader: GROUND_VERTEX, fragmentShader: GROUND_FRAGMENT, uniforms,
    defines: high && look.ripples ? {RAIN_RIPPLES: ''} : {}, transparent: true, depthWrite: false, depthTest: true,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.SrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor});
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Rain wet ground'; mesh.frustumCulled = false; mesh.renderOrder = -10; mesh.userData.excludeAmbientOcclusion = true;
  // Slot bookkeeping: which tile each slot holds, and the tile being laid.
  const held = new Array(slots).fill(null), bySlot = new Map();
  const heights = new Float32Array(perTile);
  let work = null, ready = 0;
  const key = (i, j) => `${i},${j}`;
  const hide = slot => { positions.fill(0, slot * perTile * 3, (slot + 1) * perTile * 3); position.addUpdateRange(slot * perTile * 3, perTile * 3); };
  for (let slot = 0; slot < slots; slot++) hide(slot);
  position.needsUpdate = true;

  function finish(slot, ti, tj) {
    const x0 = ti * look.tile, z0 = tj * look.tile, radius = look.hollowRadiusCells;
    const at = (i, j) => heights[clamp(j, 0, cells) * side + clamp(i, 0, cells)];
    const [h0, h1] = look.hollow, [s0, s1] = look.flatSlope;
    for (let j = 0; j <= cells; j++) for (let i = 0; i <= cells; i++) {
      const v = slot * perTile + j * side + i, h = at(i, j);
      positions[v * 3] = x0 + i * spacing; positions[v * 3 + 1] = h + look.lift; positions[v * 3 + 2] = z0 + j * spacing;
      let sum = 0, samples = 0;
      for (let dj = -radius; dj <= radius; dj++) for (let di = -radius; di <= radius; di++) { if (di || dj) { sum += at(i + di, j + dj); samples++; } }
      const slope = Math.hypot(at(i + 1, j) - at(i - 1, j), at(i, j + 1) - at(i, j - 1)) / (2 * spacing);
      const flat = 1 - smooth((slope - s0) / Math.max(1e-6, s1 - s0));
      hollows[v * 2] = smooth((sum / samples - h - h0) / Math.max(1e-6, h1 - h0)) * flat;
      hollows[v * 2 + 1] = flat;
    }
    position.addUpdateRange(slot * perTile * 3, perTile * 3); position.needsUpdate = true;
    hollow.addUpdateRange(slot * perTile * 2, perTile * 2); hollow.needsUpdate = true;
    held[slot] = key(ti, tj); bySlot.set(held[slot], slot); ready++;
  }

  return {
    mesh,
    high,
    radius: tiles * look.tile / 2,
    get ready() { return ready; },
    get slots() { return slots; },
    // Lay ground around (x, z) with `heightAt`, spending at most `budgetMs`.
    update(x, z, heightAt, budgetMs) {
      const ci = Math.floor(x / look.tile), cj = Math.floor(z / look.tile), half = (tiles - 1) / 2;
      const wanted = new Set();
      for (let j = cj - half; j <= cj + half; j++) for (let i = ci - half; i <= ci + half; i++) wanted.add(key(i, j));
      if (work && !wanted.has(key(work.ti, work.tj))) work = null;
      const started = performance.now();
      while (performance.now() - started < budgetMs) {
        if (!work) {
          let best = null, bestDistance = Infinity;
          for (let j = cj - half; j <= cj + half; j++) for (let i = ci - half; i <= ci + half; i++) {
            if (bySlot.has(key(i, j))) continue;
            const distance = Math.hypot((i + .5) * look.tile - x, (j + .5) * look.tile - z);
            if (distance < bestDistance) { bestDistance = distance; best = [i, j]; }
          }
          if (!best) break;
          let slot = held.findIndex(tile => tile === null);
          if (slot < 0) slot = held.findIndex(tile => !wanted.has(tile));
          if (slot < 0) break;
          if (held[slot] !== null) { bySlot.delete(held[slot]); held[slot] = null; ready--; hide(slot); position.needsUpdate = true; }
          work = {slot, ti: best[0], tj: best[1], next: 0};
        }
        const x0 = work.ti * look.tile, z0 = work.tj * look.tile;
        const stop = Math.min(perTile, work.next + 24);
        for (; work.next < stop; work.next++) {
          const i = work.next % side, j = Math.floor(work.next / side);
          const h = heightAt(x0 + i * spacing, z0 + j * spacing);
          heights[work.next] = Number.isFinite(h) ? h : 0;
        }
        if (work.next >= perTile) { finish(work.slot, work.ti, work.tj); work = null; }
      }
    },
    reset() { held.fill(null); bySlot.clear(); work = null; ready = 0; for (let slot = 0; slot < slots; slot++) hide(slot); position.needsUpdate = true; },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}

// ---- The whole rain ----------------------------------------------------------------------------------------------
export function createRainView({scene, look = RAIN_LOOK, qa = qaBuild(), host = globalThis} = {}) {
  const group = new THREE.Group();
  group.name = 'Rain (FAR-RAIN)';
  scene?.add(group);
  const arrival = createRainArrival(look.arrival), sky = createRainSky(look.sky), sound = createRainSound(look.sound);
  const glassUniforms = {uAspect: {value: 1}, uBlur: {value: .003}, uBlurShare: {value: 0}, uSky: {value: new THREE.Color()},
    uGround: {value: new THREE.Color()}, uOpacity: {value: look.glass.opacity}, uRim: {value: look.glass.rim}, uGlint: {value: look.glass.glint}};
  const lensUniforms = {...glassUniforms, uBlur: {value: 0}, uBlurShare: {value: look.lens.blur}, uOpacity: {value: look.lens.opacity}};
  const wiperUniforms = {uAspect: glassUniforms.uAspect, uPivot: {value: new THREE.Vector2(...look.glass.wiper.pivot)},
    uFrom: {value: 0}, uTo: {value: 0}, uLength: {value: look.glass.wiper.length}, uWidth: {value: look.glass.wiper.bladeWidth},
    uShade: {value: look.glass.wiper.shade}};
  let built = null, high = null, glass = null, lens = null, wiper = createRainWiper(look.glass.wiper);
  let wanted = false, place = null, forcedRegion = null, hold = false, speedKmh = 0, view = 'none';
  const eye = new THREE.Vector3(), eyeVelocity = new THREE.Vector3(), scratch = new THREE.Vector3(), windscreen = {width: 1, height: 1};
  const tickSize = makeRng(0x7469636b);
  let haveEye = false, sheltered = false;

  // Returns true when it put new meshes in the scene.
  function build(quality) {
    if (built && high === quality) return false;
    if (built) { group.remove(built.ground.mesh); built.ground.dispose(); }
    high = quality;
    glass = createRainGlass({kind: 'windscreen', capacity: high ? look.glass.beadsHigh : look.glass.beadsPerformance, look: look.glass, seed: 0x57494e44});
    lens = createRainGlass({kind: 'lens', capacity: look.lens.beads, look: look.lens, seed: 0x4c454e53});
    if (!built) {
      const beads = beadMesh(look.glass.beadsHigh, 'Rain on the windscreen', glassUniforms);
      const lensBeads = beadMesh(look.lens.beads, 'Rain on the lens', lensUniforms);
      const wiperMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({name: 'Rain wiper',
        vertexShader: SCREEN_VERTEX, fragmentShader: WIPER_FRAGMENT, uniforms: wiperUniforms, transparent: true, depthTest: false, depthWrite: false}));
      wiperMesh.name = 'Rain wiper'; wiperMesh.frustumCulled = false; wiperMesh.renderOrder = 1e6 + 1; wiperMesh.layers.set(RAIN_GLASS_LAYER);
      wiperMesh.userData.excludeAmbientOcclusion = true;
      const fall = fallMesh(look.fall.streaksHigh);
      built = {beads, lensBeads, wiper: wiperMesh, fall};
      group.add(beads.mesh, lensBeads.mesh, wiperMesh, fall);
    }
    built.ground = createWetGround({high, look: look.ground});
    group.add(built.ground.mesh);
    return true;
  }

  function hideAll() {
    if (!built) return;
    for (const mesh of [built.beads.mesh, built.lensBeads.mesh, built.wiper, built.fall, built.ground.mesh]) mesh.visible = false;
  }

  // One step of the rain's own clock: the arrival, the beads and the wiper.
  function simulate(dt) {
    const before = arrival.levels.elapsed, levels = arrival.step(dt, {raining: wanted, sheltered});
    if (!glass || !(dt > 0)) return levels;
    const hitsBefore = glass.hits;
    if (arrival.firstDropBetween(before, levels.elapsed)) {
      const [sx, sy] = look.glass.firstDropAt;
      glass.drop(sx * windscreen.height, sy * windscreen.height, look.glass.firstDropRadiusMm, {sits: true});
      lens.drop(sx, sy, look.lens.radius[1] * .85);
    }
    const driving = Math.min(1.5, speedKmh / 100);
    glass.step(dt, {rate: levels.drops * (look.glass.hitsPerSecond + look.glass.hitsPer100Kmh * driving), width: windscreen.width, height: windscreen.height, speedKmh});
    lens.step(dt, {rate: levels.drops * look.lens.hitsPerSecond * (1 + driving * .6), width: windscreen.width / windscreen.height, height: 1});
    const swept = wiper.step(dt, {beads: glass.count, drops: levels.drops});
    if (swept.moving) {
      const w = look.glass.wiper, h = windscreen.height;
      glass.sweep(w.pivot[0] * h, w.pivot[1] * h, w.length * h, swept.from, swept.to, w.bladeWidth / w.length * 2);
    }
    if (view === 'windscreen' || view === 'lens') for (let hit = glass.hits - hitsBefore; hit > 0 && hit < 6; hit--)
      sound.tick({size: tickSize.float(), inside: view === 'windscreen'});
    return levels;
  }

  const api = {
    group,
    // For the scene lighting: the place's own light mixed toward the grey rain sky.
    lighting: settings => sky.apply(settings),
    get levels() { return arrival.levels; },
    // Once a frame, after the camera is placed. Returns true the first time the rain adds its meshes to the scene.
    update({app, state, course, camera, renderer, dt = 0} = {}) {
      const flags = app?.duel?.featureFlags ?? featureFlags;
      place = rainPlace(state, course);
      wanted = rainWanted(place, {enabled: name => flags.enabled(name), released: RELEASED, forcedRegion});
      sheltered = wanted && !!(course?.tunnelAt?.(state?.s, state?.lateral));
      const step = hold || state?.paused ? 0 : Math.min(.1, Math.max(0, dt));
      speedKmh = Math.abs(Number(state?.speedMph) || 0) * 1.609344;
      const levels = arrival.levels;
      if (!wanted && !arrival.started && levels.wet <= 0 && levels.puddles <= 0) {
        hideAll(); sky.amount = 0; sound.update({audio: app?.audio, level: 0});
        return false;
      }
      const added = build(app?.ambientOcclusionEnabled !== false);
      if (added) renderer?.compile?.(group, camera, scene);
      // The glass in view, and which glass is seen.
      const fov = THREE.MathUtils.degToRad(camera?.fov ?? 54), aspect = camera?.aspect ?? 16 / 9;
      windscreen.height = 2 * Math.tan(fov / 2) * look.glass.distance * 1000; windscreen.width = windscreen.height * aspect;
      const onFoot = !!state?.onFoot, inspecting = !!app?.inspectionCamera;
      view = onFoot || inspecting || !state ? 'none' : (app?.cameraMode ?? 'chase') === 'hood' ? 'windscreen' : 'lens';
      simulate(step);
      camera?.layers?.enable(RAIN_GLASS_LAYER);
      // The eye's own speed draws the streaks out the way the drops pass it.
      if (camera) {
        if (haveEye && step > 0) {
          const moved = eye.distanceTo(camera.position);
          if (moved > 40) eyeVelocity.set(0, 0, 0);
          else eyeVelocity.lerp(scratch.subVectors(camera.position, eye).divideScalar(step).clampLength(0, 90), .25);
        }
        eye.copy(camera.position); haveEye = true;
      }
      // Colours from the scene's own light this frame.
      const fog = scene?.fog?.color ?? new THREE.Color(look.sky.fog);
      glassUniforms.uSky.value.copy(fog).multiplyScalar(look.glass.skyShare); glassUniforms.uGround.value.copy(fog).multiplyScalar(look.glass.groundShare);
      glassUniforms.uAspect.value = aspect; glassUniforms.uBlur.value = look.glass.focusBlurMm / windscreen.height;
      sky.amount = levels.grey;
      // Beads.
      const shown = view === 'windscreen' ? glass : view === 'lens' ? lens : null;
      built.beads.mesh.visible = shown === glass && glass.count > 0;
      built.lensBeads.mesh.visible = shown === lens && lens.count > 0;
      if (shown) {
        const target = shown === glass ? built.beads : built.lensBeads;
        const count = shown.write(target.beads.array, target.shapes.array, shown === glass ? 1 / windscreen.height : 1);
        target.mesh.geometry.instanceCount = count;
        target.beads.addUpdateRange(0, count * 4); target.beads.needsUpdate = true;
        target.shapes.addUpdateRange(0, count * 2); target.shapes.needsUpdate = true;
      }
      built.wiper.visible = view === 'windscreen' && wiper.angle !== look.glass.wiper.restAngle;
      wiperUniforms.uFrom.value = wiperUniforms.uTo.value; wiperUniforms.uTo.value = wiper.angle;
      if (!built.wiper.visible) wiperUniforms.uFrom.value = wiper.angle;
      // Falling rain.
      const fall = built.fall, streaks = high ? look.fall.streaksHigh : look.fall.streaksPerformance;
      const drawn = Math.round(streaks * levels.fall);
      fall.visible = drawn > 0;
      fall.geometry.setDrawRange(0, drawn * 6);
      const u = fall.material.uniforms;
      u.uTime.value = levels.elapsed; u.uEyeVelocity.value.copy(eyeVelocity);
      u.uPixel.value = 2 * Math.tan(fov / 2) / Math.max(1, renderer?.domElement?.height ?? 720) * look.fall.minPixels;
      u.uColour.value.copy(fog).multiplyScalar(look.fall.brightness);
      // Wet ground.
      const ground = built.ground, g = ground.mesh.material.uniforms;
      ground.mesh.visible = levels.wet > 0 || levels.puddles > 0;
      if (ground.mesh.visible && camera && course?.nearest && course?.groundAt) {
        const ahead = camera.getWorldDirection(scratch); ahead.y = 0;
        if (ahead.lengthSq() > 1e-6) ahead.normalize().multiplyScalar(ground.radius * .3);
        const cx = camera.position.x + ahead.x, cz = camera.position.z + ahead.z;
        const reference = state?.s;
        ground.update(cx, cz, (x, z) => { const near = course.nearest(x, z, reference); return course.groundAt(near.s, near.lateral).y; },
          high ? look.ground.buildMsHigh : look.ground.buildMsPerformance);
        g.uCentre.value.set(cx, cz); g.uRadius.value = ground.radius;
      }
      g.uWet.value = levels.wet; g.uPuddles.value = levels.puddles; g.uTime.value = levels.elapsed; g.uRain.value = levels.fall;
      g.uHorizon.value.copy(fog); g.uZenith.value.copy(fog).multiplyScalar(look.ground.zenithShare);
      g.uFog.value.set(scene?.fog?.near ?? 100, scene?.fog?.far ?? 600);
      sound.update({audio: app?.audio, level: levels.sound, inside: view === 'windscreen', sheltered});
      return added;
    },
    dispose() {
      sound.dispose();
      if (built) { built.ground.dispose(); for (const mesh of [built.beads.mesh, built.lensBeads.mesh, built.wiper, built.fall]) { mesh.geometry.dispose(); mesh.material.dispose(); } }
      group.removeFromParent(); built = null;
      if (qa && host.__rain === qaApi) delete host.__rain;
    },
  };

  // The QA harness's handle: start the rain in a region from dry, hold its clock, and play it forward in even steps.
  const qaApi = {
    start(regionId = 'far-side') { forcedRegion = regionId; hold = true; arrival.reset(); glass?.clear(); lens?.clear(); wiper = createRainWiper(look.glass.wiper); built?.ground.reset(); return true; },
    stop() { forcedRegion = null; hold = false; return true; },
    hold(on = true) { hold = on !== false; return hold; },
    advance(seconds, dt = 1 / 60) { for (let t = 0; t < seconds - 1e-9; t += dt) simulate(Math.min(dt, seconds - t)); return api.status(); },
    status() {
      const levels = arrival.levels;
      return {wanted, forcedRegion, place, hold, view, high, elapsed: levels.elapsed, drops: levels.drops, fall: levels.fall, grey: levels.grey,
        wet: levels.wet, puddles: levels.puddles, sound: levels.sound, beads: glass?.count ?? 0, lensBeads: lens?.count ?? 0,
        hits: glass?.hits ?? 0, wiperOn: wiper.on, tilesReady: built?.ground.ready ?? 0, tiles: built?.ground.slots ?? 0, cue: look.sound.cue};
    },
    beads() { return glass?.snapshot() ?? []; },
  };
  if (qa) host.__rain = qaApi;
  return api;
}
