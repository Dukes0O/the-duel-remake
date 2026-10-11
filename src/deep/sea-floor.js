// The sea floor: rippled sand and rocky ground, seagrass patches, and rocks.
// The shape comes from sea-floor-shape.js. Ripples and grain are drawn in the
// shader; seagrass and rocks are instanced (a handful of meshes, many copies).
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeRng } from '../rng.js';
import { FLOOR_HALF_WIDTH, floorHeight, rockiness, seagrassPlacements, rockPlacements } from './sea-floor-shape.js';
import { patchWaterMaterial } from './water-shader.js';

const SAND = new THREE.Color().setRGB(0.80, 0.71, 0.54, THREE.SRGBColorSpace);
const SAND_DARK = new THREE.Color().setRGB(0.62, 0.55, 0.42, THREE.SRGBColorSpace);
const ROCK = new THREE.Color().setRGB(0.40, 0.37, 0.31, THREE.SRGBColorSpace);
const TURF = new THREE.Color().setRGB(0.36, 0.34, 0.22, THREE.SRGBColorSpace);

function softNoise(x, z) {
  return 0.5 + 0.25 * Math.sin(x * 0.9 + z * 0.4) * Math.cos(z * 1.1 - x * 0.3) + 0.15 * Math.sin(x * 2.9 + z * 3.7) + 0.1 * Math.sin(x * 7.1 - z * 5.3);
}

// The ground as one mesh. cell is the grid size in metres.
export function createFloorMesh(uniforms, { cell = 1, zFrom = -14, zTo = 440 } = {}) {
  const halfWidth = FLOOR_HALF_WIDTH + 6;
  const cols = Math.round((halfWidth * 2) / cell) + 1, rows = Math.round((zTo - zFrom) / cell) + 1;
  const positions = new Float32Array(cols * rows * 3), colours = new Float32Array(cols * rows * 3), sand = new Float32Array(cols * rows);
  const tint = new THREE.Color();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c, x = -halfWidth + c * cell, z = zFrom + r * cell;
      positions[i * 3] = x; positions[i * 3 + 1] = floorHeight(x, z); positions[i * 3 + 2] = z;
      const rock = rockiness(x, z), n = softNoise(x * 0.6, z * 0.6);
      tint.copy(SAND).lerp(SAND_DARK, Math.min(1, n * 0.9));
      tint.lerp(rock > 0.5 ? ROCK : TURF, Math.min(1, rock * 1.15));
      colours[i * 3] = tint.r; colours[i * 3 + 1] = tint.g; colours[i * 3 + 2] = tint.b;
      sand[i] = 1 - Math.min(1, rock * 1.4);
    }
  }
  const index = new Uint32Array((cols - 1) * (rows - 1) * 6);
  let k = 0;
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
      index[k++] = a; index[k++] = d; index[k++] = b;
      index[k++] = b; index[k++] = d; index[k++] = e;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geometry.setAttribute('aSand', new THREE.BufferAttribute(sand, 1));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const material = patchWaterMaterial(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 }),
    uniforms, { key: 'floor', ripples: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Sea floor';
  mesh.receiveShadow = true;
  return mesh;
}

// ---- seagrass ---------------------------------------------------------

const GRASS_SWAY = /* glsl */`
{
  float ph = instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.23;
  float bend = aT * aT;
  float wave = sin(uUwTime * 1.15 + ph) + 0.5 * sin(uUwTime * 2.3 + ph * 1.7);
  transformed.x += (wave * 0.07 + 0.03) * bend * aLength;
  transformed.z += cos(uUwTime * 0.9 + ph * 1.3) * 0.05 * bend * aLength;
}`;
const GRASS_PARS = 'attribute float aT; attribute float aLength; uniform float uUwTime;';

function grassTuftGeometry(rng, blades = 14) {
  const positions = [], colours = [], ts = [], lengths = [], index = [];
  const dark = new THREE.Color().setRGB(0.20, 0.28, 0.08, THREE.SRGBColorSpace);
  const bright = new THREE.Color().setRGB(0.58, 0.66, 0.24, THREE.SRGBColorSpace);
  const tint = new THREE.Color();
  const segments = 3;
  for (let b = 0; b < blades; b++) {
    const angle = rng.float() * Math.PI * 2, spread = rng.range(0.0, 0.12), length = rng.range(0.28, 0.85), width = rng.range(0.010, 0.020);
    const baseX = Math.cos(angle) * spread, baseZ = Math.sin(angle) * spread, lean = rng.range(0.15, 0.7), face = rng.float() * Math.PI;
    const shade = rng.float();
    const startIndex = positions.length / 3;
    for (let s = 0; s <= segments; s++) {
      const t = s / segments, w = width * (1 - 0.82 * t * t);
      const out = lean * t * t * length, up = length * t * (1 - 0.15 * t);
      const cx = baseX + Math.cos(angle) * out, cz = baseZ + Math.sin(angle) * out;
      for (const side of [-1, 1]) {
        positions.push(cx + Math.cos(face) * w * side, up, cz + Math.sin(face) * w * side);
        tint.copy(dark).lerp(bright, Math.min(1, t * 0.9 + shade * 0.3));
        colours.push(tint.r, tint.g, tint.b);
        ts.push(t); lengths.push(length);
      }
    }
    for (let s = 0; s < segments; s++) {
      const a = startIndex + s * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setAttribute('aT', new THREE.Float32BufferAttribute(ts, 1));
  geometry.setAttribute('aLength', new THREE.Float32BufferAttribute(lengths, 1));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  // Blades stand up; light them from above so they do not go black edge-on.
  const normals = geometry.attributes.normal;
  for (let i = 0; i < normals.count; i++) normals.setXYZ(i, normals.getX(i) * 0.35, 0.94, normals.getZ(i) * 0.35);
  return geometry;
}

export function createSeagrass(uniforms, { tufts = 1100, seed = 1989 } = {}) {
  const list = seagrassPlacements(seed, tufts);
  const geometry = grassTuftGeometry(makeRng(seed ^ 0x6772), 14);
  const material = patchWaterMaterial(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide }),
    uniforms, { key: 'grass', vertexPars: GRASS_PARS, vertexSway: GRASS_SWAY, translucent: 0.25 });
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, list.length));
  mesh.count = list.length;
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  list.forEach((t, i) => {
    q.setFromAxisAngle(up, t.yaw);
    s.set(t.size, t.size * (0.8 + 0.4 * ((i * 7919) % 100) / 100), t.size);
    p.set(t.x, t.y - 0.02, t.z);
    mesh.setMatrixAt(i, matrix.compose(p, q, s));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = 'Seagrass';
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return { mesh, count: list.length, dispose() { geometry.dispose(); material.dispose(); } };
}

// ---- rocks ------------------------------------------------------------

function rockGeometry(variant, detail) {
  const rng = makeRng(0x524f4b + variant * 977);
  const offsets = [0, 1, 2, 3, 4, 5].map(() => rng.range(0, 100));
  // Angular boulder: a sphere cut by a handful of random flat planes, then roughened.
  const cuts = [];
  for (let i = 0; i < 9; i++) {
    const n = new THREE.Vector3(rng.range(-1, 1), rng.range(-0.6, 1), rng.range(-1, 1)).normalize();
    cuts.push({ n, c: rng.range(0.55, 0.85) });
  }
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-4);
  const pos = g.attributes.position, v = new THREE.Vector3();
  const colours = new Float32Array(pos.count * 3);
  const top = new THREE.Color().setRGB(0.42, 0.41, 0.32, THREE.SRGBColorSpace);
  const side = new THREE.Color().setRGB(0.34, 0.32, 0.29, THREE.SRGBColorSpace);
  const base = new THREE.Color().setRGB(0.20, 0.19, 0.17, THREE.SRGBColorSpace);
  const tint = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    for (const { n, c } of cuts) {
      const d = v.dot(n);
      if (d > c) v.addScaledVector(n, -(d - c));
    }
    const dir = v.clone().normalize();
    const rough = Math.sin(dir.x * 6.1 + offsets[0]) * Math.sin(dir.y * 7.3 + offsets[1]) * 0.05
      + Math.sin(dir.z * 13 + dir.x * 9 + offsets[2]) * 0.025 + Math.sin(dir.y * 21 + dir.z * 17 + offsets[3]) * 0.012;
    v.addScaledVector(dir, rough);
    pos.setXYZ(i, v.x, v.y, v.z);
    const h = dir.y;
    tint.copy(side).lerp(top, Math.max(0, h)).lerp(base, Math.max(0, -h) * 0.8);
    colours[i * 3] = tint.r; colours[i * 3 + 1] = tint.g; colours[i * 3 + 2] = tint.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

export function createRocks(uniforms, { count = 90, seed = 1989, detail = 3 } = {}) {
  const list = rockPlacements(seed, count);
  const geometries = [0, 1, 2].map(v => rockGeometry(v, detail));
  const material = patchWaterMaterial(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }),
    uniforms, { key: 'rock', rock: true });
  const group = new THREE.Group();
  group.name = 'Rocks';
  const meshes = geometries.map((geometry, variant) => {
    const members = list.filter(r => r.variant === variant);
    const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, members.length));
    mesh.count = members.length;
    const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
    members.forEach((r, i) => {
      e.set(r.tilt, r.yaw, -r.tilt * 0.7, 'YXZ');
      q.setFromEuler(e);
      s.set(r.size, r.size * r.squash, r.size * 0.9);
      p.set(r.x, r.y, r.z);
      mesh.setMatrixAt(i, matrix.compose(p, q, s));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);
    return mesh;
  });
  return { group, count: list.length, dispose() { geometries.forEach(g => g.dispose()); material.dispose(); } };
}
