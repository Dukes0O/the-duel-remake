// One school of small silver fish: a few hundred in a single instanced mesh.
//
// There is no object per fish. Each fish has a spot in the school's cloud; the
// cloud follows a slow looping path, so the school turns as one. Fish part
// around a point you give it (the car, read-only) and close up behind it.
// The tail beat is done in the vertex shader. Positions are worked out from
// the clock alone, so the same time always gives the same picture.
import * as THREE from 'three';
import { makeRng } from '../rng.js';
import { partOffset, schoolCentre, schoolShape } from './fish-rules.js';
import { patchWaterMaterial } from './water-shader.js';

const PARS = /* glsl */`
attribute float aTail;   // 0 at the head, 1 at the tail tip
attribute vec2 aFish;    // tail phase, tail speed
uniform float uUwTime;
`;

const SWAY = /* glsl */`
{
  float beat = uUwTime * 26.0 * aFish.y + aFish.x;
  float wag = sin(beat - position.z * 9.0) * 0.085 * aTail * aTail;
  transformed.x += wag;
  transformed.z -= abs(wag) * 0.15;
}`;

// Flashes of light off the flanks as the school turns: the signature of a
// shoal of silver fish.
const GLINT = /* glsl */`
{
  vec3 wn = inverseTransformDirection(normal, viewMatrix);
  float flank = abs(dot(wn, uUwSun));
  vec3 uwEyeDir = normalize(vUwPos - uUwCam[3].xyz);
  // A silver flank is a small mirror: it flashes only for the few fish turned
  // so that the sun reflects toward you, and the flashes sweep across the school.
  float mirror = pow(max(dot(reflect(uwEyeDir, wn), uUwSun), 0.0), 26.0);
  float flash = (mirror * 14.0 + pow(flank, 10.0) * 0.8) * (1.0 - smoothstep(10.0, 30.0, -vUwPos.y));
  outgoingLight += vec3(1.0, 0.97, 0.9) * flash * (0.4 + 0.6 * diffuseColor.g);
}`;

// A small silver fish pointing along +z, one unit long. Flattened side to side,
// with a forked tail and a small dorsal fin; no big eyes, no bright colours.
export function fishGeometry() {
  const rows = 11, sides = 6;
  const positions = [], colours = [], tails = [], index = [];
  const back = new THREE.Color().setRGB(0.20, 0.30, 0.34, THREE.SRGBColorSpace);
  const flank = new THREE.Color().setRGB(0.78, 0.82, 0.84, THREE.SRGBColorSpace);
  const belly = new THREE.Color().setRGB(0.93, 0.93, 0.90, THREE.SRGBColorSpace);
  const fin = new THREE.Color().setRGB(0.32, 0.38, 0.40, THREE.SRGBColorSpace);
  const tint = new THREE.Color();
  for (let r = 0; r <= rows; r++) {
    const s = r / rows;                    // 0 nose .. 1 tail
    const z = 0.5 - s;
    // Fat in the front third, narrowing to a thin tail root.
    const profile = Math.pow(Math.sin(Math.PI * Math.min(1, s * 0.92 + 0.04)), 0.75) * (1 - 0.55 * Math.pow(s, 3));
    const ry = 0.105 * profile, rx = 0.055 * profile;
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2;
      const y = Math.cos(a) * ry, x = Math.sin(a) * rx;
      positions.push(x, y, z);
      const h = ry > 1e-5 ? y / ry : 0;       // +1 back, -1 belly
      tint.copy(flank).lerp(h > 0 ? back : belly, Math.pow(Math.abs(h), 1.4) * (h > 0 ? 0.95 : 0.75));
      colours.push(tint.r, tint.g, tint.b);
      tails.push(Math.max(0, (s - 0.25) / 0.75));
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < sides; k++) {
      const a = r * sides + k, b = r * sides + (k + 1) % sides, c = a + sides, d = b + sides;
      index.push(a, b, c, b, d, c);
    }
  }
  // Close the nose.
  const noseIndex = positions.length / 3;
  positions.push(0, 0, 0.5); colours.push(flank.r, flank.g, flank.b); tails.push(0);
  for (let k = 0; k < sides; k++) index.push(noseIndex, (k + 1) % sides, k);
  // Forked tail fin and a small dorsal fin.
  const finTris = (pts, tailValues) => {
    const base = positions.length / 3;
    pts.forEach((p, i) => { positions.push(...p); colours.push(fin.r, fin.g, fin.b); tails.push(tailValues[i]); });
    index.push(base, base + 1, base + 2, base, base + 2, base + 1);
  };
  finTris([[0, 0, -0.43], [0, 0.12, -0.60], [0, 0.02, -0.52]], [0.9, 1, 0.95]);
  finTris([[0, 0, -0.43], [0, -0.12, -0.60], [0, -0.02, -0.52]], [0.9, 1, 0.95]);
  finTris([[0, 0.095, 0.12], [0, 0.17, -0.05], [0, 0.09, -0.12]], [0.3, 0.45, 0.5]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  g.setAttribute('aTail', new THREE.Float32BufferAttribute(tails, 1));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

// The DEEP-ART-SRC sardine (silver-school.glb) as a school fish: the same shape
// as fishGeometry (one unit long, nose at +z, `aTail` growing toward the tail
// root) so the same shader sways it. The model is scaled by its length; its
// own vertex colours are kept.
export function fishGeometryFromModel(source) {
  const g = source.clone();
  g.computeBoundingBox();
  const box = g.boundingBox, length = box.max.z - box.min.z;
  if (!(length > 0)) throw new Error('The sardine model has no length.');
  const centre = (box.max.z + box.min.z) / 2, k = 1 / length;
  const p = g.attributes.position, tails = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const z = (p.getZ(i) - centre) * k;
    p.setXYZ(i, p.getX(i) * k, (p.getY(i) - (box.max.y + box.min.y) / 2) * k, z);
    tails[i] = Math.max(0, (0.5 - z - 0.25) / 0.75);     // 0 at the nose .. 1 at the tail tip
  }
  g.setAttribute('aTail', new THREE.Float32BufferAttribute(tails, 1));
  g.computeVertexNormals();
  return g;
}

const UP = new THREE.Vector3(0, 1, 0);

export function createFishSchool(uniforms, {
  count = 450, seed = 5, length = 0.30, anchor = { x: 0, y: -6, z: 0 }, path = {}, floorAt = null, cloud = {},
  avoidInner = 2.7, avoidOuter = 6.5, geometry: given = null,
} = {}) {
  const rng = makeRng(seed);
  const shape = schoolShape(count, rng, cloud);
  const n = shape.count;
  const geometry = given ?? fishGeometry();
  const fish = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { fish[i * 2] = shape.traits[i * 4 + 1]; fish[i * 2 + 1] = shape.traits[i * 4 + 2]; }
  geometry.setAttribute('aFish', new THREE.InstancedBufferAttribute(fish, 2));
  const material = patchWaterMaterial(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.35 }),
    uniforms, { key: 'fish', vertexPars: PARS, vertexSway: SWAY, fragmentExtra: GLINT });
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, n));
  mesh.count = n;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.name = 'Fish school';
  const pathOptions = { anchor, ...path };

  const centre = { x: 0, y: 0, z: 0, heading: 0 };
  const here = { x: 0, y: 0, z: 0 }, there = { x: 0, y: 0, z: 0 }, gap = { x: 0, y: 0, z: 0 };
  const avoid = { x: 0, y: 0, z: 0 };
  const side = { x: 1, y: 0, z: 0 };
  // Place fish i at time t, parted around `avoid`.
  function place(i, t, out) {
    schoolCentre(t, pathOptions, centre);
    const breathe = 1 + 0.10 * Math.sin(t * 0.43), cs = Math.cos(centre.heading), sn = Math.sin(centre.heading);
    const ph = shape.traits[i * 4 + 3];
    const ox = shape.offsets[i * 3] * breathe + Math.sin(t * 0.8 + ph) * 0.45;
    const oy = shape.offsets[i * 3 + 1] * breathe + Math.cos(t * 0.65 + ph * 1.3) * 0.28;
    const oz = shape.offsets[i * 3 + 2] * breathe + Math.sin(t * 0.95 + ph * 0.7) * 0.6;
    out.x = centre.x + ox * cs + oz * sn;
    out.y = centre.y + oy;
    out.z = centre.z - ox * sn + oz * cs;
    partOffset(out, avoid, avoidInner, avoidOuter, gap, side);
    out.x += gap.x; out.y += gap.y; out.z += gap.z;
    if (floorAt) out.y = Math.max(out.y, floorAt(out.x, out.z) + 0.5);
    return out;
  }
  const forward = new THREE.Vector3(), right = new THREE.Vector3(), upv = new THREE.Vector3();
  const el = mesh.instanceMatrix.array;

  return {
    mesh, count: n,
    // t: seconds. carPosition: {x,y,z} of the car, only read.
    update(t, carPosition) {
      avoid.x = carPosition.x; avoid.y = carPosition.y; avoid.z = carPosition.z;
      side.x = Math.cos(centre.heading); side.z = -Math.sin(centre.heading);
      for (let i = 0; i < n; i++) {
        place(i, t, here);
        place(i, t + 0.08, there);
        forward.set(there.x - here.x, there.y - here.y, there.z - here.z);
        if (forward.lengthSq() < 1e-8) forward.set(Math.sin(centre.heading), 0, Math.cos(centre.heading));
        forward.normalize();
        right.crossVectors(UP, forward);
        if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
        right.normalize();
        upv.crossVectors(forward, right);
        const size = length * shape.traits[i * 4];
        const o = i * 16;
        el[o] = right.x * size; el[o + 1] = right.y * size; el[o + 2] = right.z * size; el[o + 3] = 0;
        el[o + 4] = upv.x * size; el[o + 5] = upv.y * size; el[o + 6] = upv.z * size; el[o + 7] = 0;
        el[o + 8] = forward.x * size; el[o + 9] = forward.y * size; el[o + 10] = forward.z * size; el[o + 11] = 0;
        el[o + 12] = here.x; el[o + 13] = here.y; el[o + 14] = here.z; el[o + 15] = 1;
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
    // Move the school's home and set where it is on its loop at the start.
    reanchor(home, phase = pathOptions.phase ?? 0) { pathOptions.anchor = home; pathOptions.phase = phase; },
    // For a picture: where the middle of the school is at time t.
    centreAt(t, out = { x: 0, y: 0, z: 0, heading: 0 }) { return schoolCentre(t, pathOptions, out); },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}
