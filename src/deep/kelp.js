// Kelp: tall golden-brown stems that rise from the rocks to the surface, with
// long leaf blades. Every stem is one instance of a single small mesh; its
// height, sway and lean come from a few numbers per stem, and the swaying
// happens in the vertex shader. Stems are grouped in chunks along the trail so
// the ones out of view or far away cost nothing.
//
// Light comes through the blades: the shader adds a warm glow when you look
// toward the sun through them, which is what makes a kelp forest glow.
import * as THREE from 'three';
import { makeRng } from '../rng.js';
import { kelpPlacements } from './sea-floor-shape.js';
import { patchWaterMaterial, patchWaterDepthMaterial } from './water-shader.js';

const PARS = /* glsl */`
attribute float aT;       // where on the stem this vertex is attached (0 floor, 1 canopy)
attribute vec2 aBlade;    // x: 0 on the stem, 0..1 along a blade; y: this blade's own random number
attribute vec4 aParams;   // stem height, phase, lean, girth
uniform float uUwTime;
`;

const SWAY = /* glsl */`
{
  float H = aParams.x, ph = aParams.y;
  vec3 stemWorld = vec3(instanceMatrix[3].x, 0.0, instanceMatrix[3].z);
  // A slow swell passes through the forest; neighbours sway together.
  float swell = sin(uUwTime * 0.52 + ph * 0.35 + stemWorld.x * 0.045 + stemWorld.z * 0.038);
  float chop = sin(uUwTime * 0.93 + ph) * 0.35;
  float bend = pow(aT, 1.5) * H * 0.075;
  float dx = (swell + chop) * bend + (aParams.z * H * aT * aT);
  float dz = cos(uUwTime * 0.41 + ph * 1.7) * 0.45 * bend;
  vec3 localX = vec3(instanceMatrix[0].x, instanceMatrix[1].x, instanceMatrix[2].x);
  vec3 localZ = vec3(instanceMatrix[0].z, instanceMatrix[1].z, instanceMatrix[2].z);
  vec3 anchor = vec3(0.0, aT * H, 0.0) + localX * dx + localZ * dz;
  vec3 local = position * vec3(aParams.w, 1.0, aParams.w);
  if (aBlade.x > 0.0) {
    float flutter = sin(uUwTime * 1.6 + ph * 2.0 + aBlade.x * 5.5 + aBlade.y * 40.0) * 0.16 * pow(aBlade.x, 1.4);
    local += (localX * 0.9 + localZ * 0.4) * flutter + vec3(0.0, flutter * 0.25, 0.0);
  }
  transformed = anchor + local;
}`;

// One stem with its leaf blades, built once. Like the real thing: a thin
// brown stipe with many narrow, rippled blades along it (a bottle-brush),
// short low down and long near the top, where they lie nearly flat and form
// the floating canopy at the surface.
export function kelpStemGeometry({ nodes = 26, bladeSegments = 2, seed = 11 } = {}) {
  const rng = makeRng(seed);
  const positions = [], colours = [], ts = [], blades = [], index = [];
  const stemBase = new THREE.Color().setRGB(0.15, 0.09, 0.04, THREE.SRGBColorSpace);
  const stemTop = new THREE.Color().setRGB(0.30, 0.20, 0.07, THREE.SRGBColorSpace);
  const bladeLow = new THREE.Color().setRGB(0.40, 0.25, 0.07, THREE.SRGBColorSpace);
  const bladeMid = new THREE.Color().setRGB(0.66, 0.43, 0.10, THREE.SRGBColorSpace);
  const bladeTip = new THREE.Color().setRGB(0.78, 0.58, 0.16, THREE.SRGBColorSpace);
  const tint = new THREE.Color();
  const push = (x, y, z, c, t, s, r) => { positions.push(x, y, z); colours.push(c.r, c.g, c.b); ts.push(t); blades.push(s, r); };

  // Stem: a three-sided column, 12 rings.
  const rings = 12;
  for (let r = 0; r <= rings; r++) {
    const t = r / rings, radius = 0.045 - 0.024 * t;
    tint.copy(stemBase).lerp(stemTop, t);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      push(Math.cos(a) * radius, 0, Math.sin(a) * radius, tint, t, 0, 0);
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let k = 0; k < 3; k++) {
      const a = r * 3 + k, b = r * 3 + (k + 1) % 3, c = a + 3, d = b + 3;
      index.push(a, c, b, b, c, d);
    }
  }

  // Blades: ribbons that curve up as they float, swelling in the middle.
  const golden = 2.399963;
  const direction = new THREE.Vector3(), step = new THREE.Vector3(), centre = new THREE.Vector3();
  for (let n = 0; n < nodes; n++) {
    const t = 0.05 + 0.95 * Math.pow(n / (nodes - 1), 0.85);
    const canopy = t > 0.9, upper = t > 0.45;
    const count = canopy ? 4 : upper ? 3 : 2;
    for (let b = 0; b < count; b++) {
      const yaw = n * golden + b * (Math.PI * 2 / count) + rng.range(-0.35, 0.35);
      const pitch = canopy ? rng.range(1.3, 1.52) : THREE.MathUtils.lerp(0.75, 1.15, t) + rng.range(-0.2, 0.2);   // from vertical
      const length = canopy ? rng.range(1.0, 1.9) : upper ? rng.range(0.5, 0.95) : rng.range(0.35, 0.7);
      const width = canopy ? rng.range(0.05, 0.08) : rng.range(0.03, 0.06), own = rng.float();
      direction.set(Math.sin(pitch) * Math.cos(yaw), Math.cos(pitch), Math.sin(pitch) * Math.sin(yaw));
      const sideAxis = new THREE.Vector3(-Math.sin(yaw), 0, Math.cos(yaw));
      const start = positions.length / 3;
      centre.set(0, 0, 0);
      for (let s = 0; s <= bladeSegments; s++) {
        const u = s / bladeSegments;
        if (s > 0) {
          // Each step bends a little toward the surface (they float) and a little sideways.
          step.copy(direction).lerp(new THREE.Vector3(0, canopy ? 0.15 : 1, 0), canopy ? 0.1 : 0.22 * u).normalize();
          step.x += Math.sin(own * 12 + u * 3) * 0.12;
          centre.addScaledVector(step, length / bladeSegments);
        }
        const w = width * Math.pow(Math.sin(Math.PI * Math.min(1, 0.10 + u * 0.90)), 0.6) * (u > 0.97 ? 0.1 : 1);
        tint.copy(bladeLow).lerp(bladeMid, Math.min(1, u * 1.5)).lerp(bladeTip, Math.max(0, u - 0.5) * 1.5);
        if (t > 0.8) tint.lerp(bladeTip, 0.35);
        tint.multiplyScalar(0.72 + 0.5 * own);
        // Three points across: edges and a raised midrib, so light slides across the blade.
        const crinkle = Math.sin(u * 15 + own * 9) * 0.012;
        const lift = w * 0.30, rib = new THREE.Vector3().crossVectors(s > 0 ? step : direction, sideAxis).normalize().multiplyScalar(lift);
        push(centre.x - sideAxis.x * w, centre.y + crinkle, centre.z - sideAxis.z * w, tint, t, 0.02 + u * 0.98, own);
        push(centre.x + rib.x, centre.y + rib.y, centre.z + rib.z, tint, t, 0.02 + u * 0.98, own);
        push(centre.x + sideAxis.x * w, centre.y - crinkle, centre.z + sideAxis.z * w, tint, t, 0.02 + u * 0.98, own);
      }
      for (let s = 0; s < bladeSegments; s++) {
        const a = start + s * 3;
        index.push(a, a + 1, a + 3, a + 1, a + 4, a + 3, a + 1, a + 2, a + 4, a + 2, a + 5, a + 4);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setAttribute('aT', new THREE.Float32BufferAttribute(ts, 1));
  geometry.setAttribute('aBlade', new THREE.Float32BufferAttribute(blades, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

const CHUNK_LENGTH = 30; // metres of trail per chunk

export function createKelp(uniforms, { stems = 520, seed = 1989, blades = 'full', distance = 150, castShadow = true } = {}) {
  const list = kelpPlacements(seed, stems);
  const geometry = kelpStemGeometry(blades === 'full' ? { nodes: 24, bladeSegments: 2 } : { nodes: 14, bladeSegments: 2 });
  const material = patchWaterMaterial(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0, side: THREE.DoubleSide }),
    uniforms, { key: 'kelp', vertexPars: PARS, vertexSway: SWAY, translucent: 1.05 });
  const depthMaterial = patchWaterDepthMaterial(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }),
    uniforms, { key: 'kelp', vertexPars: PARS, vertexSway: SWAY });
  const group = new THREE.Group();
  group.name = 'Kelp forest';
  const chunks = new Map();
  for (const stem of list) {
    const key = Math.floor(stem.z / CHUNK_LENGTH);
    if (!chunks.has(key)) chunks.set(key, []);
    chunks.get(key).push(stem);
  }
  const parts = [];
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  for (const members of chunks.values()) {
    const mesh = new THREE.InstancedMesh(geometry.clone(), material, members.length);
    const params = new Float32Array(members.length * 4);
    const sphere = new THREE.Sphere();
    const box = new THREE.Box3();
    members.forEach((stem, i) => {
      q.setFromAxisAngle(up, stem.yaw);
      p.set(stem.x, stem.y, stem.z);
      mesh.setMatrixAt(i, matrix.compose(p, q, s));
      params[i * 4] = stem.height; params[i * 4 + 1] = stem.phase; params[i * 4 + 2] = stem.lean * 0.12; params[i * 4 + 3] = stem.girth;
      box.expandByPoint(p);
      box.expandByPoint(new THREE.Vector3(stem.x, stem.y + stem.height + 2.5, stem.z));
    });
    mesh.geometry.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 4));
    box.expandByScalar(4);
    box.getBoundingSphere(sphere);
    mesh.boundingSphere = sphere;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = true;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    mesh.customDepthMaterial = depthMaterial;
    group.add(mesh);
    parts.push({ mesh, sphere });
  }
  return {
    group, count: list.length, chunkCount: parts.length,
    // Hide chunks beyond sight; the water would hide them anyway.
    update(camera) {
      for (const { mesh, sphere } of parts) {
        mesh.visible = camera.position.distanceTo(sphere.center) - sphere.radius < distance;
      }
    },
    dispose() { geometry.dispose(); parts.forEach(({ mesh }) => mesh.geometry.dispose()); material.dispose(); depthMaterial.dispose(); },
  };
}
