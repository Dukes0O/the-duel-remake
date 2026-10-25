// SIRENA-ART: the Falcone Sirena's underwater models, built from the car's own
// body (src/sirena-vehicle.js) and written as GLBs under
// public/assets/models/sirena/: the wreck half sunk in sand, the five loose parts
// (badge, steering wheel, wheel, bonnet, door), the lift bag and the red abalone.
// Everything is seeded, so the same command gives the same bytes.
//
//   node tools/art/sirena-props.mjs                 write the models and the manifest
//   node tools/art/sirena-props.mjs --review <dir>  also write one review GLB per
//                                                   model under <dir> (inside .evidence/)
//   node tools/art/sirena-props.mjs --out <dir>     write the models and manifest to <dir>
//                                                   (inside .qa-dist/; the test uses this
//                                                   to prove the committed bytes rebuild)
//
// Each model is a single indexed mesh with vertex colours (no textures), at
// real size in metres, +Z forward on the wreck, resting with its lowest point
// at y = 0 (the wreck's sand surface is y = 0 and the car is sunk below it).
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  SIRENA_AXLES, SIRENA_WHEEL_RADIUS, SIRENA_TRACK, SIRENA_ROUNDEL,
  sirenaBodyGeometry, sirenaGreenhousePieces, sevenOutline, wireWheelPieces,
} from '../../src/sirena-vehicle.js';
import { originalVehicleParts } from '../../src/unlock-vehicles.js';

globalThis.FileReader ??= class FileReader {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }, error => this.onerror?.(error)); }
  readAsDataURL(blob) { blob.arrayBuffer().then(buffer => { this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buffer).toString('base64')}`; this.onloadend?.(); }, error => this.onerror?.(error)); }
};

const root = fileURLToPath(new URL('../../', import.meta.url));
const argValue = name => process.argv.includes(name) ? resolve(process.argv[process.argv.indexOf(name) + 1]) : null;
const outDir = argValue('--out') ?? resolve(root, 'public/assets/models/sirena');
if (relative(resolve(root, 'public/assets/models/sirena'), outDir) !== '' && relative(resolve(root, '.qa-dist'), outDir).startsWith('..')) throw new Error('--out goes under .qa-dist/.');
const reviewDir = argValue('--review');
if (reviewDir && relative(resolve(root, '.evidence'), reviewDir).startsWith('..')) throw new Error('Review GLBs go under .evidence/.');

// ---------- seeded noise and colour helpers ----------
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash3 = (x, y, z, seed) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function noise(x, y, z, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = x - xi, fy = y - yi, fz = z - zi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz), mix = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz, seed);
  return mix(mix(mix(c(0, 0, 0), c(1, 0, 0), u), mix(c(0, 1, 0), c(1, 1, 0), u), v), mix(mix(c(0, 0, 1), c(1, 0, 1), u), mix(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
const fbm = (p, scale, seed) => (noise(p.x * scale, p.y * scale, p.z * scale, seed) * .55 + noise(p.x * scale * 2.1, p.y * scale * 2.1, p.z * scale * 2.1, seed + 7) * .3 + noise(p.x * scale * 4.3, p.y * scale * 4.3, p.z * scale * 4.3, seed + 13) * .15);
const C = hex => new THREE.Color(hex);
const lerpColor = (a, b, t) => a.clone().lerp(b, Math.min(1, Math.max(0, t)));

// ---------- mesh plumbing ----------
// Every piece becomes an indexed geometry with position, normal and colour so
// that the whole model merges into one mesh and one draw.
function prepare(geometry) {
  let g = geometry.index ? geometry : mergeVertices((() => { const c = geometry.clone(); for (const name of Object.keys(c.attributes)) if (name !== 'position') c.deleteAttribute(name); return c; })(), 1e-4);
  g = g === geometry ? geometry.clone() : g;
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
  g.computeVertexNormals();
  return g;
}
function transformed(geometry, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const g = prepare(geometry);
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale)));
  return g;
}
function paint(geometry, colorAt) {
  const p = geometry.attributes.position, n = geometry.attributes.normal, colors = new Float32Array(p.count * 3), v = new THREE.Vector3(), nv = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); nv.fromBufferAttribute(n, i);
    const color = colorAt(v, nv, i); colors.set([color.r, color.g, color.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}
const flat = hex => { const color = C(hex); return g => paint(g, () => color); };
function combine(geometries) {
  const parts = geometries.filter(Boolean).map(g => { if (!g.attributes.color) throw new Error('uncoloured part'); return g; });
  return mergeGeometries(parts, false);
}
function sinkToFloor(geometry, offset = [0, 0, 0]) {
  geometry.computeBoundingBox();
  const b = geometry.boundingBox;
  geometry.translate(offset[0] - (b.min.x + b.max.x) / 2, -b.min.y, offset[2] - (b.min.z + b.max.z) / 2);
  return geometry;
}
// A sheet of body skin cut from the car, given thickness: the skin, an inner
// skin offset along the normals, and walls along the cut edges.
function thicken(geometry, thickness) {
  const p = geometry.attributes.position, n = geometry.attributes.normal, index = geometry.index.array, count = p.count;
  const inner = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) for (let k = 0; k < 3; k++) inner[i * 3 + k] = p.array[i * 3 + k] - n.array[i * 3 + k] * thickness;
  const positions = new Float32Array(count * 6); positions.set(p.array, 0); positions.set(inner, count * 3);
  const indices = [], edges = new Map();
  for (let i = 0; i < index.length; i += 3) {
    const [a, b, c] = [index[i], index[i + 1], index[i + 2]];
    indices.push(a, b, c, c + count, b + count, a + count);
    for (const [u, v] of [[a, b], [b, c], [c, a]]) { const key = u < v ? `${u}:${v}` : `${v}:${u}`; edges.set(key, (edges.get(key) ?? []).concat([[u, v]])); }
  }
  for (const list of edges.values()) if (list.length === 1) { const [u, v] = list[0]; indices.push(u, v, v + count, u, v + count, u + count); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals();
  return g;
}
function subset(geometry, keep) {
  const p = geometry.attributes.position, index = geometry.index.array, chosen = [], rest = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const centre = new THREE.Vector3(), normal = new THREE.Vector3();
  for (let i = 0; i < index.length; i += 3) {
    a.fromBufferAttribute(p, index[i]); b.fromBufferAttribute(p, index[i + 1]); c.fromBufferAttribute(p, index[i + 2]);
    centre.copy(a).add(b).add(c).divideScalar(3);
    normal.copy(b).sub(a).cross(c.clone().sub(a)).normalize();
    (keep(centre, normal) ? chosen : rest).push(index[i], index[i + 1], index[i + 2]);
  }
  const make = list => { const g = new THREE.BufferGeometry(); g.setAttribute('position', p.clone()); g.setIndex(list); g.computeVertexNormals(); return compact(g); };
  return [make(chosen), make(rest)];
}
function compact(geometry) {
  const used = new Map(), positions = [], indices = [], p = geometry.attributes.position;
  for (const i of geometry.index.array) {
    if (!used.has(i)) { used.set(i, positions.length / 3); positions.push(p.getX(i), p.getY(i), p.getZ(i)); }
    indices.push(used.get(i));
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals();
  return g;
}

// ---------- sixty years of sea water ----------
const RUST = [C(0x2b1a0e), C(0x4c2d16), C(0x6e3d1d), C(0x824a24)];
const PALETTE = { paint: C(0x6c2623), stripe: C(0xa49b86), algae: C(0x3b4326), slime: C(0x283025), shell: C(0xb8b09b), shellDark: C(0x6f6a58), sand: C(0x8c7b5c) };
function steelColor(p, n, seed, { paintLeft = .5, algae = 1 } = {}) {
  const f = fbm(p, 5, seed), rustPick = fbm(p, 13, seed + 3), g = fbm(p, 3, seed + 11);
  let color = lerpColor(lerpColor(RUST[0], RUST[1], f * 2.2 - .2), lerpColor(RUST[2], RUST[3], rustPick), Math.max(0, g * 1.5 - .45));
  // Red lacquer survives where the water barely moved: low sheltered patches.
  const paintMask = Math.max(0, fbm(p, 4, seed + 21) - .40) * 2.4 * (1 - Math.max(0, n.y)) * paintLeft;
  if (paintMask > .02) color = lerpColor(color, PALETTE.paint, Math.min(1, paintMask * 3.2));
  // Slime and algae settle on whatever faces up.
  const patch = Math.min(1, Math.max(0, (fbm(p, 3.5, seed + 31) - .50) * 5));
  const up = Math.max(0, n.y) * algae * patch;
  if (up > .05) color = lerpColor(color, fbm(p, 14, seed + 33) > .5 ? PALETTE.algae : PALETTE.slime, Math.min(.75, up * 1.2));
  return color;
}
function crust(geometry, seed, { dent = .016, ...options } = {}) {
  const p = geometry.attributes.position, n = geometry.attributes.normal, v = new THREE.Vector3(), nv = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); nv.fromBufferAttribute(n, i);
    const d = (fbm(v, 9, seed) - .5) * dent;
    p.setXYZ(i, v.x + nv.x * d, v.y + nv.y * d, v.z + nv.z * d);
  }
  geometry.computeVertexNormals();
  return paint(geometry, (q, normal) => steelColor(q, normal, seed, options));
}
// Barnacle crowns on the upward and sideways skin, thicker in clumps.
function barnacles(geometry, seed, count, { minUp = .15, size = 1 } = {}) {
  const random = rng(seed), p = geometry.attributes.position, n = geometry.attributes.normal, index = geometry.index?.array ?? Array.from({ length: p.count }, (_, i) => i);
  const triangles = [], areas = []; let total = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < index.length; i += 3) {
    a.fromBufferAttribute(p, index[i]); b.fromBufferAttribute(p, index[i + 1]); c.fromBufferAttribute(p, index[i + 2]);
    const area = b.clone().sub(a).cross(c.clone().sub(a)).length() / 2, up = (n.getY(index[i]) + n.getY(index[i + 1]) + n.getY(index[i + 2])) / 3;
    if (up < minUp) continue;
    triangles.push(i); total += area * (up + .3); areas.push(total);
  }
  if (!triangles.length) return [];
  const out = [];
  for (let k = 0; k < count; k++) {
    const pick = random() * total; let lo = 0, hi = areas.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (areas[mid] < pick) lo = mid + 1; else hi = mid; }
    const i = triangles[lo], r1 = Math.sqrt(random()), r2 = random();
    a.fromBufferAttribute(p, index[i]); b.fromBufferAttribute(p, index[i + 1]); c.fromBufferAttribute(p, index[i + 2]);
    const point = a.clone().multiplyScalar(1 - r1).addScaledVector(b, r1 * (1 - r2)).addScaledVector(c, r1 * r2);
    // Clumps: keep a point only where a slow field is high.
    if (fbm(point, 7, seed + 5) < .46 && random() < .8) continue;
    const normal = new THREE.Vector3().fromBufferAttribute(n, index[i]).lerp(new THREE.Vector3(0, 1, 0), .35).normalize();
    const radius = (.010 + random() * .020) * size, height = radius * (1.1 + random() * .9);
    const cone = new THREE.ConeGeometry(radius, height, 5, 1, true);
    cone.translate(0, height / 2 - .004, 0);
    cone.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal));
    cone.translate(point.x, point.y, point.z);
    const g = prepare(cone), shade = random();
    out.push(paint(g, (q, nn) => lerpColor(PALETTE.shellDark, PALETTE.shell, shade * .7 + Math.max(0, nn.y) * .3)));
  }
  return out;
}
// Ribbons of weed: strips that sag and wave from an anchor point.
function weed(anchor, direction, length, seed, width = .05) {
  const random = rng(seed), segments = 6, positions = [], indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, sway = Math.sin(t * 3 + random()) * .06 * t * length, w = width * (1 - t * .7);
    const centre = anchor.clone().addScaledVector(direction, t * length).add(new THREE.Vector3(sway, -t * t * length * .15, sway * .6));
    positions.push(centre.x - w, centre.y, centre.z, centre.x + w, centre.y, centre.z);
    if (i < segments) { const k = i * 2; indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2, k + 2, k + 1, k, k + 2, k + 3, k + 1); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals();
  const tint = random();
  return paint(g, q => lerpColor(C(0x3c4a22), C(0x6d7a34), tint * .6 + fbm(q, 8, seed) * .4));
}

// ---------- the car's own pieces, cut and crusted ----------
const isBonnet = (c, n) => Math.abs(c.x) < .50 && c.z > .62 && c.z < 2.02 && c.y > .50 && n.y > .30;
const isDoor = (c, n) => Math.abs(c.x) > .62 && c.y > .20 && c.y < .78 && c.z > -.82 && c.z < .15 && n.y > -.25 && Math.abs(n.x) > .30;
const isTub = (c) => Math.abs(c.x) < .60 && c.y > .45 && c.z > -.98 && c.z < .50;

// The wreck without its sand: the hull, its weed and its barnacles. Built the same way every time (every seed is fixed), so the
// wreck below and the hull the Lab's tank holds (LAB-RESTORE) are cut from identical geometry.
function wreckHull() {
  const shell = sirenaBodyGeometry();
  // The Sirena's own shell, bonnet and doors gone, the tub open to the water.
  const [bonnetSkin, afterBonnet] = subset(shell, isBonnet);
  const [, afterDoors] = subset(afterBonnet, isDoor);
  const [, hull] = subset(afterDoors, isTub);
  bonnetSkin.dispose();
  const [, holed] = subset(hull, (c) => fbm(c, 10, 9) > .80 && c.y < .45);
  const pieces = [crust(holed, 11, { dent: .018, paintLeft: 1 })];
  // The white nose stripe, what is left of it, on the front of the nose.
  const body = pieces[0], bp = body.attributes.position, bn = body.attributes.normal, bc = body.attributes.color, v = new THREE.Vector3();
  for (let i = 0; i < bp.count; i++) {
    v.fromBufferAttribute(bp, i);
    if (Math.abs(v.x) < .13 && v.z > 1.9 && bn.getY(i) > .25 && fbm(v, 7, 19) > .25) { const old = new THREE.Color(bc.getX(i), bc.getY(i), bc.getZ(i)).lerp(PALETTE.stripe, .78); bc.setXYZ(i, old.r, old.g, old.b); }
  }
  const rust = (geometry, seed, options) => pieces.push(crust(geometry, seed, { dent: .012, algae: .5, ...options }));
  // The roof and pillars of the closed coupe stay (no glass); this is what makes
  // it the restored car's silhouette. The roof has sagged a little.
  for (const piece of sirenaGreenhousePieces()) {
    if (piece.material === 'glass' || piece.material === 'chrome') continue;
    rust(prepare(piece.geometry), 12 + pieces.length, { paintLeft: .8, dent: .02 });
  }
  // Cockpit and engine bay are full of silt, with the tops of two seats and the
  // engine just showing through it.
  pieces.push(silt(-.60, .60, -1.00, .56, .47, 8, 91));
  pieces.push(silt(-.50, .50, .60, 2.00, .43, 8, 92));
  for (const side of [-1, 1]) rust(transformed(new THREE.SphereGeometry(1, 12, 8), [side * .33, .62, -.66], [-.2, 0, side * .06], [.17, .20, .07]), 22 + side, { algae: .9 });
  rust(transformed(new THREE.BoxGeometry(.46, .20, .60, 3, 3, 3), [0, .50, 1.20]), 26, { dent: .03, algae: .9 });
  // Side pipes, an axle line.
  for (const side of [-1, 1]) rust(transformed(new THREE.CylinderGeometry(.034, .034, .62, 8), [side * .948, .235, -.48], [Math.PI / 2, 0, 0]), 29 + side);
  rust(transformed(new THREE.CylinderGeometry(.04, .04, 1.54, 8), [0, .345, SIRENA_AXLES[1]], [0, 0, Math.PI / 2]), 31);
  // Wheels: three of four. The left front wheel is the loose part on the forest floor.
  for (const [axleIndex, z] of SIRENA_AXLES.entries()) for (const side of [1, -1]) {
    if (axleIndex === 0 && side === 1) continue;
    pieces.push(...wheelPieces(side, 40 + axleIndex * 2 + (side > 0 ? 1 : 0), [side * SIRENA_TRACK, SIRENA_WHEEL_RADIUS, z], side > 0 ? .03 : -.05));
  }
  // Settle: nose down a few degrees and rolled a little, sunk to about the sills.
  const wreckBody = combine(pieces.splice(0));
  wreckBody.translate(0, -.30, 0);
  wreckBody.rotateX(.045); wreckBody.rotateZ(-.06);
  wreckBody.translate(0, .02, 0);
  const growth = [];
  // Weed on upper surfaces only: the roof, the rear deck, the fender and nose tops.
  const anchors = [[.30, 1.02, -.52], [-.35, 1.0, -.30], [0, .76, -1.62], [.70, .74, 1.0], [-.68, .72, 1.12], [.40, .50, 2.0], [-.45, .72, -1.2]];
  anchors.forEach(([x, y, z], i) => growth.push(weed(new THREE.Vector3(x, y - .26, z), new THREE.Vector3((i % 2 ? 1 : -1) * .8, .5, .2), .32 + (i % 3) * .12, 60 + i, .06)));
  const crown = barnacles(wreckBody, 71, 300, { minUp: .45, size: .75 });
  return { wreckBody, growth, crown };
}
function wreck() {
  const { wreckBody, growth, crown } = wreckHull();
  const sand = prepare(sandMound(1.30, 4.0, 81));
  paint(sand, (q, n) => lerpColor(PALETTE.sand, C(0x6b5c42), fbm(q, 4, 83) * .9 + (1 - Math.max(0, n.y)) * .5));
  const merged = combine([wreckBody, ...growth, ...crown, sand]);
  merged.name = 'sirena-wreck';
  merged.computeBoundingBox();
  return merged;
}
// The hull alone, for the Lab's freshwater tank: no sand, so a restored car does not stand on a sandbank.
function hullOnly() {
  const { wreckBody, growth, crown } = wreckHull();
  const merged = combine([wreckBody, ...growth, ...crown]);
  merged.name = 'sirena-wreck-hull';
  merged.computeBoundingBox();
  return merged;
}
// Silt filling a cavity: a lumpy grey-brown surface over a rectangle.
function silt(x0, x1, z0, z1, height, steps, seed) {
  const cols = steps * 2, rows = Math.round((z1 - z0) / (x1 - x0) * cols), positions = [], indices = [];
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
    const x = x0 + (x1 - x0) * c / cols, z = z0 + (z1 - z0) * r / rows;
    positions.push(x, height + (noise(x * 5, 0, z * 5, seed) - .5) * .06, z);
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const a = r * (cols + 1) + c, b = a + 1, d = a + cols + 1, e = d + 1; indices.push(a, d, b, b, d, e); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals();
  return paint(g, (q) => lerpColor(C(0x5d5340), C(0x7a6d52), fbm(q, 9, seed)));
}
function wheelPieces(side, seed, position, tilt) {
  const random = rng(seed), out = [], colours = { rubber: C(0x1a2020), chrome: C(0x6d5a43), darkAlloy: C(0x2d2a26) };
  for (const piece of wireWheelPieces(side, { low: true })) {
    // Rust eats about a third of the wire spokes entirely.
    if (piece.geometry.type === 'BoxGeometry' && piece.geometry.parameters.width < .01 && random() < .38) continue;
    const g = transformed(piece.geometry, piece.position, piece.rotation);
    const base = colours[piece.material];
    paint(g, (p, n) => {
      const f = fbm(p.clone().add(new THREE.Vector3(...position)), 8, seed);
      let color = lerpColor(base, piece.material === 'rubber' ? C(0x39402a) : RUST[1 + Math.floor(f * 3) % 3], piece.material === 'rubber' ? f * .8 : .4 + f * .6);
      if (n.y > .4) color = lerpColor(color, PALETTE.algae, f * .5);
      return color;
    });
    out.push(g);
  }
  const wheel = combine(out);
  wheel.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, tilt)), new THREE.Vector3(1, 1, 1)));
  return [wheel];
}
// A low heap: sand lies a hand's breadth above the sea floor at the car's
// flanks and thins to the floor level (y = 0) at its edge.
function sandMound(halfWidth, length, seed) {
  const rings = 20, around = 40, positions = [], indices = [], halfLength = length / 2 + .7;
  positions.push(0, .11, 0);
  for (let i = 1; i <= rings; i++) {
    const t = i / rings;
    for (let j = 0; j < around; j++) {
      const a = j / around * Math.PI * 2, x = Math.cos(a) * (halfWidth + .55) * t, z = Math.sin(a) * halfLength * t;
      const falloff = Math.pow(Math.max(0, 1 - t), 1.4), ripple = (noise(x * 3.1, 0, z * 3.1, seed) - .5) * .035;
      positions.push(x, i === rings ? 0 : .03 + falloff * .08 + ripple * falloff, z);
    }
  }
  for (let j = 0; j < around; j++) indices.push(0, 1 + (j + 1) % around, 1 + j);
  for (let i = 1; i < rings; i++) for (let j = 0; j < around; j++) {
    const a = 1 + (i - 1) * around + j, b = 1 + (i - 1) * around + (j + 1) % around, c = a + around, d = b + around;
    indices.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals();
  return g;
}

function bonnet() {
  const [skin] = subset(sirenaBodyGeometry(), isBonnet);
  const sheet = thicken(skin, .022);
  const pieces = [crust(sheet, 101, { dent: .014, paintLeft: 1 })];
  // The white nose stripe, faded, over the centre of the bonnet.
  const stripe = [];
  const p = pieces[0].attributes.position, c = pieces[0].attributes.color, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); if (Math.abs(v.x) < .13 && fbm(v, 6, 103) > .3) { const old = new THREE.Color(c.getX(i), c.getY(i), c.getZ(i)); old.lerp(PALETTE.stripe, .8); c.setXYZ(i, old.r, old.g, old.b); } }
  void stripe;
  pieces.push(...barnacles(pieces[0], 105, 160, { minUp: .2 }));
  const out = combine(pieces); out.name = 'sirena-bonnet'; return sinkToFloor(out);
}

function door() {
  const [skin] = subset(sirenaBodyGeometry(), (c, n) => c.x > 0 && isDoor(c, n));
  const sheet = thicken(skin, .022);
  const pieces = [crust(sheet, 111, { dent: .012, paintLeft: 1 })];
  const surfaces = [{ geometry: skin }], patches = [];
  const collect = color => ({ add: geometry => { patches.push(paint(prepare(geometry), () => color)); geometry.dispose(); } });
  const disc = []; for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; disc.push([SIRENA_ROUNDEL.y + Math.sin(a) * SIRENA_ROUNDEL.radius, SIRENA_ROUNDEL.z + Math.cos(a) * SIRENA_ROUNDEL.radius]); }
  originalVehicleParts.fitSurfacePatch(surfaces, collect(C(0xa59a7e)), null, disc, 'side', 1, .5, .005);
  originalVehicleParts.fitSurfacePatch(surfaces, collect(C(0x2a2219)), null, sevenOutline(), 'side', 1, .5, .008);
  // The two layers' faces are the same shell skin: shift the numerals out with it.
  pieces.push(...patches.map(g => crustPatch(g, 113)));
  // The window frame standing up from the door's top edge, a handle and a lock.
  const frame = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[.78, .67, .14], [.66, .90, .08], [.63, .99, -.02], [.62, 1.0, -.40], [.63, .99, -.78], [.80, .69, -.83]].map(q => new THREE.Vector3(...q)), false, 'centripetal'), 24, .012, 6);
  pieces.push(crust(prepare(frame), 117, { dent: .004, algae: .4 }));
  pieces.push(crust(transformed(new THREE.BoxGeometry(.04, .025, .11), [.915, .54, -.62]), 118, { dent: .004 }));
  pieces.push(...barnacles(pieces[0], 115, 130, { minUp: .0, size: .8 }));
  const out = combine(pieces); out.rotateZ(.5); out.name = 'sirena-door'; return sinkToFloor(out); // leaning, outer face up and out, half out of the sand
}
// Numeral and roundel keep their own colour but pick up the same grime.
function crustPatch(g, seed) {
  const colors = g.attributes.color, p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const grime = fbm(v, 11, seed); const color = new THREE.Color(colors.getX(i), colors.getY(i), colors.getZ(i)).lerp(RUST[1], Math.max(0, grime - .35)); colors.setXYZ(i, color.r, color.g, color.b); }
  return g;
}

function steeringWheel() {
  const parts = [], wood = C(0x5a3b21);
  const rim = transformed(new THREE.TorusGeometry(.19, .017, 8, 36), [0, 0, 0], [Math.PI / 2, 0, 0]);
  parts.push(paint(rim, (p, n) => lerpColor(lerpColor(wood, C(0x2a1a0e), fbm(p, 30, 121)), PALETTE.algae, Math.max(0, n.y) * fbm(p, 9, 122) * .9)));
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + Math.PI / 2;
    parts.push(crust(transformed(new THREE.BoxGeometry(.18, .008, .028), [Math.cos(a) * .10, 0, Math.sin(a) * .10], [0, -a, 0]), 123 + i, { dent: .004 }));
  }
  parts.push(crust(transformed(new THREE.CylinderGeometry(.045, .05, .05, 14), [0, -.01, 0]), 127, { dent: .006 }));
  parts.push(flat(0x8f8062)(transformed(new THREE.CylinderGeometry(.03, .03, .012, 12), [0, .02, 0])));
  parts.push(...barnacles(parts[0], 129, 26, { minUp: .0, size: .45 }));
  const out = combine(parts); out.name = 'sirena-steering-wheel'; return sinkToFloor(out);
}
function wheelPart() {
  const wheel = combine(wheelPieces(1, 131, [0, 0, 0], 0));
  const crown = barnacles(wheel, 133, 70, { minUp: .1, size: .7 });
  const out = combine([wheel, ...crown]);
  out.rotateZ(Math.PI / 2 * 0.98); // lying flat on its side
  out.name = 'sirena-wheel'; return sinkToFloor(out);
}
function badge() {
  const radius = .058, parts = [];
  parts.push(paint(transformed(new THREE.CylinderGeometry(radius, radius, .01, 28)), (p, n) => lerpColor(C(0x6c6a5c), C(0x4a5a46), fbm(p, 40, 141))));
  // Chrome rim, tarnished and crusted with sediment.
  parts.push(paint(transformed(new THREE.TorusGeometry(radius, .006, 6, 28), [0, .005, 0], [Math.PI / 2, 0, 0]), (p) => lerpColor(lerpColor(C(0x8d8a78), C(0x4f5d45), fbm(p, 50, 142)), C(0x6a5a3c), fbm(p, 30, 144) * .8)));
  // Red enamel with a few chips, then a gold ring and a white F with a swept gold wing.
  parts.push(paint(transformed(new THREE.CylinderGeometry(radius * .86, radius * .86, .012, 32), [0, .001, 0]), (p) => lerpColor(C(0x93191c), C(0x5a1514), Math.max(0, fbm(p, 60, 146) - .55) * 3)));
  parts.push(flat(0xc29a3e)(transformed(new THREE.TorusGeometry(radius * .72, .0028, 5, 32), [0, .0075, 0], [Math.PI / 2, 0, 0])));
  const letter = new THREE.Shape();
  letter.moveTo(-.017, -.025); letter.lineTo(-.008, -.025); letter.lineTo(-.008, -.004); letter.lineTo(.012, -.004); letter.lineTo(.012, .004);
  letter.lineTo(-.008, .004); letter.lineTo(-.008, .015); letter.lineTo(.021, .015); letter.lineTo(.021, .025); letter.lineTo(-.017, .025); letter.lineTo(-.017, -.025);
  parts.push(flat(0xe4dcc4)(transformed(new THREE.ExtrudeGeometry(letter, { depth: .004, bevelEnabled: false }), [-.002, .0075, 0], [-Math.PI / 2, 0, 0])));
  for (const a of [.6, 2.1, 3.7, 5.2]) parts.push(flat(0xc29a3e)(transformed(new THREE.CylinderGeometry(.003, .003, .004, 6), [Math.cos(a) * radius * .78, .008, Math.sin(a) * radius * .78])));
  parts.push(...barnacles(parts[0], 145, 8, { minUp: .3, size: .22 }));
  const out = combine(parts); out.name = 'sirena-badge'; return sinkToFloor(out);
}

// ---------- the lift bag and the abalone ----------
function liftBag() {
  const profile = [[0, 0], [.10, .006], [.24, .06], [.31, .18], [.33, .38], [.30, .62], [.23, .82], [.12, .95], [.05, 1.01], [0, 1.02]].map(([r, y]) => new THREE.Vector2(r, y));
  const bag = new THREE.LatheGeometry(profile, 24);
  const yellow = C(0xe2ac14), seam = C(0x9a6e0c);
  const parts = [paint(prepare(bag), (p, n) => {
    const angle = Math.atan2(p.z, p.x), stripe = Math.abs(Math.sin(angle)) < .035 ? 1 : 0;
    return lerpColor(lerpColor(yellow, C(0xb98410), fbm(p, 12, 151) * .5), seam, stripe * .8);
  })];
  // Top: a dump valve and a D-ring; bottom: a webbing skirt ring and a loose strap with a hook.
  parts.push(flat(0x2b2a26)(transformed(new THREE.CylinderGeometry(.04, .05, .06, 10), [0, 1.04, 0])));
  parts.push(flat(0xb9bbb3)(transformed(new THREE.TorusGeometry(.055, .008, 6, 14), [0, 1.10, 0], [Math.PI / 2, 0, 0])));
  parts.push(flat(0x1d1c1a)(transformed(new THREE.TorusGeometry(.30, .014, 6, 28), [0, .08, 0], [Math.PI / 2, 0, 0])));
  parts.push(flat(0x2a2823)(transformed(new THREE.TorusGeometry(.337, .013, 6, 32), [0, .42, 0], [Math.PI / 2, 0, 0])));
  for (const a of [0, Math.PI]) parts.push(flat(0x1d1c1a)(transformed(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(profile.slice(2, 8).map(q => new THREE.Vector3(Math.cos(a) * (q.x + .008), q.y, Math.sin(a) * (q.x + .008)))), 12, .013, 5))));
  parts.push(flat(0x1d1c1a)(transformed(new THREE.BoxGeometry(.045, .55, .008), [.34, -.12, .1], [.1, 0, -.08])));
  parts.push(flat(0xb9bbb3)(transformed(new THREE.TorusGeometry(.04, .007, 6, 14), [.355, -.42, .08], [.2, .5, 0])));
  const out = combine(parts); out.name = 'sirena-lift-bag';
  out.computeBoundingBox(); out.translate(0, -out.boundingBox.min.y, 0); return out;
}
function abalone() {
  // A red abalone: an ear-shaped oval, low and flattened, brick-red and rough on
  // top, a curved row of raised holes along one edge and the spire at that end,
  // clamped to a rock by its margin.
  const long = .105, wide = .068, high = .021, around = 56, rings = 18;
  const outline = a => 1 + .10 * Math.cos(a) - .05 * Math.cos(2 * a);
  const surface = (rho, a) => {
    const edge = outline(a) * rho, wrinkle = Math.sin(rho * 44 + a * 2) * .0016 * rho, rib = Math.sin(a * 15) * .0018 * rho * rho;
    const cross = Math.max(0, 1 - rho * rho);
    const y = high * Math.pow(cross, .7) * (1 + .22 * Math.cos(a - 3.0)) + wrinkle + rib + Math.pow(rho, 8) * .004;
    return new THREE.Vector3(Math.cos(a) * long * edge, Math.max(0, y), Math.sin(a) * wide * edge);
  };
  const positions = [], indices = [];
  for (let i = 0; i <= rings; i++) for (let j = 0; j < around; j++) positions.push(...surface(i / rings, j / around * Math.PI * 2).toArray());
  for (let i = 0; i < rings; i++) for (let j = 0; j < around; j++) {
    const a = i * around + j, b = i * around + (j + 1) % around, c = a + around, d = b + around;
    indices.push(a, b, c, b, d, c);
  }
  const shell = new THREE.BufferGeometry(); shell.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); shell.setIndex(indices); shell.computeVertexNormals();
  shell.translate(0, .008, 0);
  const brick = C(0x8a3524);
  const parts = [paint(shell, (p, n) => {
    const f = fbm(p, 70, 161), speck = fbm(p, 120, 164) > .72 ? .8 : 0, green = fbm(p, 40, 165) > .66 ? .35 : 0;
    return lerpColor(lerpColor(lerpColor(brick, C(0x5c2619), f * 1.4 - .3), C(0xb86a50), Math.max(0, n.y - .6) * .3 + speck * .35), C(0x4a5430), green);
  })];
  // The row of holes, raised and rimmed, curving along the left edge.
  for (let k = 0; k < 6; k++) {
    const a = 2.50 + k * .14, point = surface(.80, a).add(new THREE.Vector3(0, .006, 0));
    parts.push(flat(0x6e2a1c)(transformed(new THREE.TorusGeometry(.0072, .0028, 5, 10), point.toArray(), [Math.PI / 2, 0, 0])));
    parts.push(flat(0x150f0c)(transformed(new THREE.CylinderGeometry(.0052, .0052, .004, 8), point.clone().add(new THREE.Vector3(0, .0012, 0)).toArray())));
  }
  const spire = surface(.15, 3.2).add(new THREE.Vector3(0, .007, 0));
  parts.push(paint(transformed(new THREE.SphereGeometry(1, 10, 6), spire.toArray(), [0, 0, 0], [.020, .010, .016]), (p) => lerpColor(brick, C(0x5c2619), fbm(p, 90, 166))));
  const lump = transformed(new THREE.IcosahedronGeometry(.11, 2), [0, -.026, 0], [0, 0, 0], [1.18, .42, 1.0]);
  const rp = lump.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < rp.count; i++) { v.fromBufferAttribute(rp, i); const d = (fbm(v, 14, 171) - .5) * .04; rp.setXYZ(i, v.x + d, v.y + d * .5, v.z + d); }
  lump.computeVertexNormals();
  parts.push(paint(lump, (p, n) => lerpColor(lerpColor(C(0x3f3c38), C(0x5c5750), fbm(p, 20, 172)), fbm(p, 9, 173) > .5 ? C(0xb0647a) : C(0x4d5a32), Math.max(0, n.y) * (fbm(p, 9, 173) - .3) * 1.4)));
  const out = combine(parts); out.name = 'red-abalone';
  return sinkToFloor(out);
}

// ---------- write ----------
const material = new THREE.MeshStandardMaterial({ name: 'Sirena crust', vertexColors: true, roughness: .93, metalness: .05 });
const models = {
  wreck: wreck, 'wreck-hull': hullOnly, badge, 'steering-wheel': steeringWheel, wheel: wheelPart, bonnet, door, 'lift-bag': liftBag, abalone,
};
const manifest = { formatVersion: 1, source: 'tools/art/sirena-props.mjs', coordinates: 'metres; glTF Y up, +Z forward on the wreck; each loose part rests with its lowest point at y = 0', models: [] };
let totalBytes = 0;
async function write(path, geometry, name) {
  const mesh = new THREE.Mesh(geometry, material); mesh.name = name;
  const glb = Buffer.from(await new GLTFExporter().parseAsync(mesh, { binary: true }));
  await mkdir(dirname(path), { recursive: true }); await writeFile(path, glb);
  return glb;
}
for (const [id, build] of Object.entries(models)) {
  const geometry = build(); geometry.computeBoundingBox();
  const glb = await write(resolve(outDir, `${id}.glb`), geometry, id);
  if (reviewDir) await write(resolve(reviewDir, `${id}.glb`), geometry, id);
  const size = geometry.boundingBox.getSize(new THREE.Vector3());
  totalBytes += glb.length;
  manifest.models.push({ id, path: `assets/models/sirena/${id}.glb`, bytes: glb.length, sha256: createHash('sha256').update(glb).digest('hex'),
    triangles: geometry.index.count / 3, vertices: geometry.attributes.position.count,
    dimensionsMetres: [size.x, size.y, size.z].map(v => Math.round(v * 1000) / 1000) });
  console.log(`${id}: ${glb.length} bytes, ${geometry.index.count / 3} triangles`);
}
manifest.totalBytes = totalBytes;
await writeFile(resolve(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`total ${totalBytes} bytes`);
