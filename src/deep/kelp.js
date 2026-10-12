// Giant kelp: clumps of tall stipes rise from the rock to the surface, each
// with many broad, ruffled olive-brown blades and a gas bulb at the base of
// every blade, spreading into a canopy under the surface. Every clump is one
// instance of a single mesh; its height, sway and lean come from a few numbers
// per clump, and the swaying happens in the vertex shader. Clumps are grouped
// in chunks along the trail so the ones out of view or far away cost nothing.
//
// Light comes through the blades: the shader adds a green-gold glow when you
// look toward the sun through them, which is what makes a kelp forest glow.
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

// One holdfast: a few stipes (the long stems) rising together from the rock
// and leaning apart, each with many broad, ruffled olive-brown blades along its
// whole length, a small gas bulb at the base of every blade, and near the
// surface a canopy where the stipes bend outward and the blades lie flat. Like
// the real giant kelp: blades short and few low down, long and dense up top.
// Built once; every holdfast is an instance of it.
export function kelpStemGeometry({ stipes = 3, nodes = 14, bladeSegments = 3, seed = 11 } = {}) {
  const rng = makeRng(seed);
  const positions = [], colours = [], ts = [], blades = [], index = [];
  const color = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
  const stipeBase = color(0.17, 0.12, 0.05), stipeTop = color(0.34, 0.26, 0.09);
  const bladeLow = color(0.40, 0.26, 0.07), bladeMid = color(0.58, 0.38, 0.09), bladeTip = color(0.68, 0.50, 0.14);
  const canopyTint = color(0.70, 0.56, 0.16), bulbColour = color(0.66, 0.52, 0.22);
  const tint = new THREE.Color();
  const push = (x, y, z, c, t, along, own) => { positions.push(x, y, z); colours.push(c.r, c.g, c.b); ts.push(t); blades.push(along, own); };

  const direction = new THREE.Vector3(), step = new THREE.Vector3(), centre = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const golden = 2.399963;
  for (let st = 0; st < stipes; st++) {
    const lean = (st / stipes) * Math.PI * 2 + rng.range(-0.4, 0.4), reach = rng.range(0.55, 0.95), top = rng.range(0.9, 1.0);
    const dir = new THREE.Vector2(Math.cos(lean), Math.sin(lean));
    // Where the stipe is, sideways, at height fraction u (0..1 of its own length).
    const offset = u => {
      const apart = reach * u * u;                                   // leans apart from its neighbours
      const canopy = Math.pow(Math.max(0, (u - 0.80) / 0.20), 2) * 2.4; // bends outward under the surface
      return dir.clone().multiplyScalar(apart + canopy);
    };
    // The stipe: a three-sided column, 10 rings.
    const rings = 10, first = positions.length / 3;
    for (let r = 0; r <= rings; r++) {
      const u = r / rings, t = u * top, radius = 0.040 - 0.020 * u, o = offset(u);
      tint.copy(stipeBase).lerp(stipeTop, u);
      for (let k = 0; k < 3; k++) {
        const ang = (k / 3) * Math.PI * 2;
        push(o.x + Math.cos(ang) * radius, 0, o.y + Math.sin(ang) * radius, tint, t, 0, 0);
      }
    }
    for (let r = 0; r < rings; r++) {
      for (let k = 0; k < 3; k++) {
        const a = first + r * 3 + k, bb = first + r * 3 + (k + 1) % 3, c = a + 3, d = bb + 3;
        index.push(a, c, bb, bb, c, d);
      }
    }
    // Blades along the stipe.
    for (let n = 0; n < nodes; n++) {
      const u = 0.05 + 0.95 * Math.pow(n / (nodes - 1), 0.9), t = u * top, o = offset(u);
      const canopy = u > 0.86, upper = u > 0.4;
      const count = canopy ? 4 : upper ? 2 : 1;
      for (let b = 0; b < count; b++) {
        const yaw = n * golden + b * (Math.PI * 2 / count) + st * 1.3 + rng.range(-0.35, 0.35);
        const pitch = canopy ? rng.range(1.35, 1.54) : THREE.MathUtils.lerp(0.7, 1.15, u) + rng.range(-0.2, 0.2);   // from vertical
        const length = canopy ? rng.range(1.5, 2.8) : upper ? rng.range(0.55, 1.0) : rng.range(0.4, 0.75);
        const width = canopy ? rng.range(0.14, 0.22) : rng.range(0.10, 0.18), own = rng.float();
        direction.set(Math.sin(pitch) * Math.cos(yaw), Math.cos(pitch), Math.sin(pitch) * Math.sin(yaw));
        const sideAxis = new THREE.Vector3(-Math.sin(yaw), 0, Math.cos(yaw));
        // Gas bulb at the blade's base.
        {
          const base = positions.length / 3, len = 0.08, rad = 0.03;
          const cx = o.x + direction.x * 0.035, cy = direction.y * 0.035, cz = o.y + direction.z * 0.035;
          const axis = direction, ortho = sideAxis, third = new THREE.Vector3().crossVectors(axis, ortho).normalize();
          const ring = [[1, 0], [-0.5, 0.87], [-0.5, -0.87]].map(([p, q]) => [cx + (ortho.x * p + third.x * q) * rad, cy + (ortho.y * p + third.y * q) * rad, cz + (ortho.z * p + third.z * q) * rad]);
          push(cx - axis.x * len * 0.4, cy - axis.y * len * 0.4, cz - axis.z * len * 0.4, bulbColour, t, 0, own);
          for (const q of ring) push(q[0], q[1], q[2], bulbColour, t, 0, own);
          push(cx + axis.x * len, cy + axis.y * len, cz + axis.z * len, bulbColour, t, 0, own);
          for (let k = 0; k < 3; k++) index.push(base, base + 1 + k, base + 1 + (k + 1) % 3, base + 4, base + 1 + (k + 1) % 3, base + 1 + k);
        }
        const start = positions.length / 3;
        centre.set(o.x, 0, o.y);
        for (let sg = 0; sg <= bladeSegments; sg++) {
          const v = sg / bladeSegments;
          if (sg > 0) {
            // Each step bends a little toward the surface (they float) and a little sideways.
            step.copy(direction).lerp(up, canopy ? 0.08 : 0.2 * v).normalize();
            step.x += Math.sin(own * 12 + v * 3) * 0.1;
            centre.addScaledVector(step, length / bladeSegments);
          }
          // Broad blade, swelling then pointed, with a wavy (ruffled) width.
          const ruffle = 1 + 0.32 * Math.sin(v * 22 + own * 7);
          const w = width * ruffle * Math.pow(Math.sin(Math.PI * Math.min(1, 0.16 + v * 0.84)), 0.38) * (1 - 0.85 * Math.max(0, (v - 0.84) / 0.16));
          tint.copy(bladeLow).lerp(bladeMid, Math.min(1, v * 1.4)).lerp(bladeTip, Math.max(0, v - 0.55) * 1.6);
          if (canopy) tint.lerp(canopyTint, 0.5);
          tint.multiplyScalar(0.72 + 0.5 * own);
          // Three points across: two ruffled edges and a raised midrib.
          const wave = Math.sin(v * 24 + own * 9) * 0.05;
          const rib = new THREE.Vector3().crossVectors(sg > 0 ? step : direction, sideAxis).normalize();
          push(centre.x - sideAxis.x * w + rib.x * wave, centre.y - sideAxis.y * w + rib.y * wave, centre.z - sideAxis.z * w + rib.z * wave, tint, t, 0.02 + v * 0.98, own);
          push(centre.x + rib.x * w * 0.28, centre.y + rib.y * w * 0.28, centre.z + rib.z * w * 0.28, tint, t, 0.02 + v * 0.98, own);
          push(centre.x + sideAxis.x * w - rib.x * wave, centre.y + sideAxis.y * w - rib.y * wave, centre.z + sideAxis.z * w - rib.z * wave, tint, t, 0.02 + v * 0.98, own);
        }
        for (let sg = 0; sg < bladeSegments; sg++) {
          const a = start + sg * 3;
          index.push(a, a + 1, a + 3, a + 1, a + 4, a + 3, a + 1, a + 2, a + 4, a + 2, a + 5, a + 4);
        }
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

const CHUNK_Z = 20, CHUNK_X = 30; // metres of trail and of width per chunk

// Near the camera a clump is drawn in full; farther out a cheaper copy of the
// same clump; beyond sight not at all. The water hides the change.
export function createKelp(uniforms, { stems = 520, seed = 1989, blades = 'full', distance = 150, nearDistance = 22, castShadow = true, placements = null } = {}) {
  // A Deep zone passes its own placements (zone-floor.js); the look test uses its stretch.
  const list = placements ?? kelpPlacements(seed, stems);
  const full = blades === 'full';
  const nearGeometry = kelpStemGeometry(full ? { stipes: 3, nodes: 12, bladeSegments: 5 } : { stipes: 2, nodes: 9, bladeSegments: 3 });
  const farGeometry = kelpStemGeometry(full ? { stipes: 3, nodes: 9, bladeSegments: 2 } : { stipes: 2, nodes: 6, bladeSegments: 2 });
  const material = patchWaterMaterial(
    new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    uniforms, { key: 'kelp', vertexPars: PARS, vertexSway: SWAY, translucent: 1.05 });
  const depthMaterial = patchWaterDepthMaterial(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }),
    uniforms, { key: 'kelp', vertexPars: PARS, vertexSway: SWAY });
  const group = new THREE.Group();
  group.name = 'Kelp forest';
  const chunks = new Map();
  for (const stem of list) {
    const key = `${Math.floor(stem.z / CHUNK_Z)}:${Math.floor(stem.x / CHUNK_X)}`;
    if (!chunks.has(key)) chunks.set(key, []);
    chunks.get(key).push(stem);
  }
  const parts = [];
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  for (const members of chunks.values()) {
    const near = new THREE.InstancedMesh(nearGeometry.clone(), material, members.length);
    const far = new THREE.InstancedMesh(farGeometry.clone(), material, members.length);
    const params = new THREE.InstancedBufferAttribute(new Float32Array(members.length * 4), 4);
    const sphere = new THREE.Sphere(), box = new THREE.Box3();
    members.forEach((stem, i) => {
      q.setFromAxisAngle(up, stem.yaw);
      p.set(stem.x, stem.y, stem.z);
      near.setMatrixAt(i, matrix.compose(p, q, s));
      params.setXYZW(i, stem.height, stem.phase, stem.lean * 0.12, stem.girth);
      box.expandByPoint(p);
      box.expandByPoint(new THREE.Vector3(stem.x, stem.y + stem.height + 3, stem.z));
    });
    near.instanceMatrix.needsUpdate = true;
    far.instanceMatrix = near.instanceMatrix;          // one set of numbers for both
    near.geometry.setAttribute('aParams', params);
    far.geometry.setAttribute('aParams', params);
    box.expandByScalar(5);
    box.getBoundingSphere(sphere);
    for (const mesh of [near, far]) {
      mesh.boundingSphere = sphere;
      mesh.receiveShadow = false;   // blades are thin and many; the floor takes the shadows
      mesh.customDepthMaterial = depthMaterial;
      group.add(mesh);
    }
    near.castShadow = castShadow;
    far.castShadow = false;
    parts.push({ near, far, sphere });
  }
  return {
    group, count: list.length, chunkCount: parts.length,
    update(camera) {
      for (const { near, far, sphere } of parts) {
        const gap = camera.position.distanceTo(sphere.center) - sphere.radius;
        near.visible = gap < nearDistance;
        far.visible = !near.visible && gap < distance;
      }
    },
    dispose() {
      nearGeometry.dispose(); farGeometry.dispose();
      parts.forEach(({ near, far }) => { near.geometry.dispose(); far.geometry.dispose(); near.dispose(); far.dispose(); });
      material.dispose(); depthMaterial.dispose();
    },
  };
}
