// LAB-ART: the small toolkit the Lab's models are built with (tools/art/lab-props.mjs).
// Seeded noise and colour, hard-surface primitives with wear painted into the
// vertex colours (grime low down, rust, flaking paint), and three material
// classes: solid (vertex coloured), glass (transparent) and glow (lit lamps and
// screens). Everything is deterministic: the same code gives the same bytes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash3 = (x, y, z, seed) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function noise(x, y, z, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = x - xi, fy = y - yi, fz = z - zi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz), mix = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz, seed);
  return mix(mix(mix(c(0, 0, 0), c(1, 0, 0), u), mix(c(0, 1, 0), c(1, 1, 0), u), v), mix(mix(c(0, 0, 1), c(1, 0, 1), u), mix(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
export const fbm = (p, scale, seed) => (noise(p.x * scale, p.y * scale, p.z * scale, seed) * .55 + noise(p.x * scale * 2.1, p.y * scale * 2.1, p.z * scale * 2.1, seed + 7) * .3 + noise(p.x * scale * 4.3, p.y * scale * 4.3, p.z * scale * 4.3, seed + 13) * .15);
export const C = hex => new THREE.Color(hex);
export const lerpColor = (a, b, t) => a.clone().lerp(b, Math.min(1, Math.max(0, t)));
export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const RUST = [C(0x4a2a14), C(0x6e3b1b), C(0x8a4d22)];
const GREASE = C(0x15130f);

// Paint wear into a colour: dirt everywhere, heavier near the floor; rust and
// bare-metal chips on steel; oily dark patches low down.
export function worn(base, p, n, { dirt = .22, rust = 0, oil = 0, seed = 1, chip = 0 } = {}) {
  let c = C(base);
  const f = fbm(p, 6, seed), low = 1 - smooth(0, 1.1, p.y);
  c.multiplyScalar(1 - dirt * (.55 + f) * (.6 + low * .9));
  if (rust > 0) {
    const r = fbm(p, 11, seed + 5) + low * .12 + (1 - Math.max(0, n.y)) * .02;
    if (r > 1 - rust * .62) c = lerpColor(c, RUST[Math.floor(fbm(p, 23, seed + 9) * 3) % 3], Math.min(1, (r - (1 - rust * .62)) * 5));
  }
  if (chip > 0 && fbm(p, 31, seed + 2) > 1 - chip) c = lerpColor(c, C(0x8a8984), .7);
  if (oil > 0) { const o = fbm(p, 4, seed + 17); if (o > .55) c = lerpColor(c, GREASE, Math.min(1, (o - .55) * oil * 6) * (.4 + low * .6)); }
  return c;
}

// One model is a set of named parts; each part has a pivot (its own origin in
// the model) and three piece lists, one per material class.
export class Part {
  constructor(name, pivot = [0, 0, 0]) { this.name = name; this.pivot = pivot; this.pieces = { solid: [], glass: [], glow: [] }; }
  // Geometry is given in model coordinates; the part is exported relative to its pivot.
  add(klass, geometry, position, rotation, scale, colorAt) {
    let g = geometry.index ? geometry.clone() : geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    if (!g.index) g.setIndex(Array.from({ length: g.attributes.position.count }, (_, i) => i));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale)));
    g.applyMatrix4(new THREE.Matrix4().makeTranslation(-this.pivot[0], -this.pivot[1], -this.pivot[2]));
    const p = g.attributes.position, n = g.attributes.normal, colors = new Float32Array(p.count * 3), v = new THREE.Vector3(), nv = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).add(new THREE.Vector3(...this.pivot)); nv.fromBufferAttribute(n, i);
      const c = colorAt(v, nv); colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.pieces[klass].push(g);
    return this;
  }
}

// Hard-surface helpers on a part. `o` carries the wear options and a seed.
export function tools(part, seedBase = 1) {
  let k = 0;
  const wearOpts = o => ({ ...o, seed: (o?.seed ?? seedBase) + (k++ * 3) });
  const colour = (hex, o) => { const w = wearOpts(o); return (p, n) => worn(hex, p, n, w); };
  const T = {
    box: (size, pos, hex, o = {}, rot = [0, 0, 0]) => part.add('solid', new THREE.BoxGeometry(...size), pos, rot, [1, 1, 1], colour(hex, o)),
    cyl: (rTop, rBot, h, pos, hex, o = {}, rot = [0, 0, 0], seg = 14) => part.add('solid', new THREE.CylinderGeometry(rTop, rBot, h, seg), pos, rot, [1, 1, 1], colour(hex, o)),
    tube: (points, radius, hex, o = {}, seg = 10, around = 6) => part.add('solid', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(q => new THREE.Vector3(...q)), false, 'centripetal'), seg, radius, around), [0, 0, 0], [0, 0, 0], [1, 1, 1], colour(hex, o)),
    geo: (geometry, pos, hex, o = {}, rot = [0, 0, 0], scale = [1, 1, 1]) => part.add('solid', geometry, pos, rot, scale, colour(hex, o)),
    glass: (geometry, pos, hex, rot = [0, 0, 0], scale = [1, 1, 1]) => part.add('glass', geometry, pos, rot, scale, () => C(hex)),
    glow: (geometry, pos, hex, rot = [0, 0, 0], scale = [1, 1, 1]) => part.add('glow', geometry, pos, rot, scale, () => C(hex)),
    // A bar between two points (round or square section).
    bar: (a, b, radius, hex, o = {}, square = false) => {
      const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), dir = to.clone().sub(from), length = dir.length();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()), e = new THREE.Euler().setFromQuaternion(q);
      const g = square ? new THREE.BoxGeometry(radius * 2, length, radius * 2) : new THREE.CylinderGeometry(radius, radius, length, 8);
      return part.add('solid', g, from.clone().add(to).multiplyScalar(.5).toArray(), [e.x, e.y, e.z], [1, 1, 1], colour(hex, o));
    },
  };
  return T;
}

// Merge a part's pieces into one mesh with up to three materials.
const MATERIALS = {
  solid: () => new THREE.MeshStandardMaterial({ name: 'Lab solid', vertexColors: true, roughness: .88, metalness: .12 }),
  glass: () => new THREE.MeshPhysicalMaterial({ name: 'Lab glass', vertexColors: true, roughness: .06, metalness: 0, transparent: true, opacity: .28, depthWrite: false, side: THREE.DoubleSide }),
  glow: () => new THREE.MeshStandardMaterial({ name: 'Lab lamps', vertexColors: true, emissive: 0xffffff, emissiveIntensity: .9, roughness: .4 }),
};
export function partMesh(part) {
  const geometries = [], materials = [];
  for (const klass of ['solid', 'glass', 'glow']) {
    const list = part.pieces[klass];
    if (!list.length) continue;
    geometries.push(mergeGeometries(list, false)); materials.push(MATERIALS[klass]());
  }
  if (!geometries.length) return null;
  const merged = mergeGeometries(geometries, true);
  const mesh = new THREE.Mesh(merged, materials);
  mesh.name = part.name;
  mesh.position.set(...part.pivot);
  return mesh;
}
export const triangleCount = part => ['solid', 'glass', 'glow'].reduce((sum, klass) => sum + part.pieces[klass].reduce((s, g) => s + g.index.count / 3, 0), 0);

// A flat grid surface from a height/colour function, used for floors, sand and
// map tops. `at(x, z)` returns the height; `colorAt(p, n)` the colour.
export function surface(x0, x1, z0, z1, cols, rows, at, colorAt) {
  const positions = [], indices = [];
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) { const x = x0 + (x1 - x0) * c / cols, z = z0 + (z1 - z0) * r / rows; positions.push(x, at(x, z), z); }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const a = r * (cols + 1) + c, b = a + 1, d = a + cols + 1, e = d + 1; indices.push(a, d, b, b, d, e); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals();
  return { geometry: g, colorAt };
}
export function addSurface(part, s) { return part.add('solid', s.geometry, [0, 0, 0], [0, 0, 0], [1, 1, 1], s.colorAt); }

// Give a surface thickness: a second skin offset against the normals with the
// winding reversed, so the sheet shows from both sides.
export function thick(geometry, t) {
  geometry = geometry.clone();
  for (const name of Object.keys(geometry.attributes)) if (name !== 'position' && name !== 'normal') geometry.deleteAttribute(name);
  if (!geometry.index) geometry.setIndex(Array.from({ length: geometry.attributes.position.count }, (_, i) => i));
  const p = geometry.attributes.position, n = geometry.attributes.normal, back = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) for (let k = 0; k < 3; k++) back[i * 3 + k] = p.array[i * 3 + k] - n.array[i * 3 + k] * t;
  const flipped = new THREE.BufferGeometry();
  flipped.setAttribute('position', new THREE.BufferAttribute(back, 3));
  flipped.setAttribute('normal', new THREE.BufferAttribute(n.array.map(v => -v), 3));
  const index = Array.from(geometry.index.array); for (let i = 0; i < index.length; i += 3) { const b = index[i + 1]; index[i + 1] = index[i + 2]; index[i + 2] = b; }
  flipped.setIndex(index);
  return mergeGeometries([geometry, flipped], false);
}
// Corrugated sheet in the local XY plane, facing +Z: ribs run along Y.
export function corrugated(width, height, pitch = .3, depth = .045, rows = 4) {
  const cols = Math.max(8, Math.round(width / pitch * 3)), positions = [], indices = [];
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
    const x = -width / 2 + width * c / cols, wave = Math.max(-1, Math.min(1, Math.sin(x / pitch * Math.PI * 2) * 1.8));
    positions.push(x, height * r / rows, wave * depth);
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const a = r * (cols + 1) + c, b = a + 1, d = a + cols + 1, e = d + 1; indices.push(a, b, d, b, e, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals();
  return g;
}

// A thick duct shell lofted through elliptical rings: each ring is {x, cy, rz, ry}
// (axis along X). The outer skin faces out, an inner skin sits `wall` inside it
// facing in, and each end is closed with a flat ring of metal.
export function duct(rings, wall = .12, segments = 36) {
  const row = segments + 1, parts = [];
  const skin = (inset, flip) => {
    const positions = [], normals = [], indices = [];
    for (const ring of rings) for (let j = 0; j <= segments; j++) {
      const a = j / segments * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), rz = ring.rz - inset, ry = ring.ry - inset;
      positions.push(ring.x, ring.cy + s * ry, c * rz);
      const nz = c / rz, ny = s / ry, l = Math.hypot(nz, ny) || 1, k = flip ? -1 : 1;
      normals.push(0, k * ny / l, k * nz / l);
    }
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < segments; j++) {
      const a = i * row + j, b = a + 1, d = a + row, e = d + 1;
      if (flip) indices.push(a, d, b, b, d, e); else indices.push(a, b, d, b, e, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); g.setIndex(indices);
    return g;
  };
  parts.push(skin(0, false), skin(wall, true));
  for (const [ring, sign] of [[rings[0], -1], [rings.at(-1), 1]]) {
    const positions = [], normals = [], indices = [];
    for (let j = 0; j <= segments; j++) {
      const a = j / segments * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      positions.push(ring.x, ring.cy + s * ring.ry, c * ring.rz, ring.x, ring.cy + s * (ring.ry - wall), c * (ring.rz - wall));
      normals.push(sign, 0, 0, sign, 0, 0);
    }
    for (let j = 0; j < segments; j++) { const a = j * 2, b = a + 1, d = a + 2, e = a + 3; if (sign > 0) indices.push(a, d, b, b, d, e); else indices.push(a, b, d, b, e, d); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); g.setIndex(indices);
    parts.push(g);
  }
  return mergeGeometries(parts, false);
}
