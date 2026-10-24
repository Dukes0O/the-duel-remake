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
  sirenaBodyGeometry, sevenOutline, wireWheelPieces,
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
const RUST = [C(0x34200f), C(0x5b3418), C(0x86491f), C(0x9a5a28)];
const PALETTE = { paint: C(0x6c2623), stripe: C(0xa49b86), algae: C(0x4a5430), slime: C(0x2f3a28), shell: C(0xb8b09b), shellDark: C(0x6f6a58), sand: C(0x8c7b5c) };
function steelColor(p, n, seed, { paintLeft = .5, algae = 1 } = {}) {
  const f = fbm(p, 5, seed), rustPick = fbm(p, 13, seed + 3), g = fbm(p, 3, seed + 11);
  let color = lerpColor(lerpColor(RUST[0], RUST[1], f * 2.2 - .2), lerpColor(RUST[2], RUST[3], rustPick), Math.max(0, g * 1.5 - .45));
  // Red lacquer survives where the water barely moved: low sheltered patches.
  const paintMask = fbm(p, 4, seed + 21) * (1 - Math.max(0, n.y)) * paintLeft;
  if (paintMask > .17) color = lerpColor(color, PALETTE.paint, Math.min(1, (paintMask - .17) * 9));
  // Slime and algae settle on whatever faces up.
  const patch = Math.min(1, Math.max(0, (fbm(p, 3.5, seed + 31) - .42) * 6));
  const up = Math.max(0, n.y) * algae * patch;
  if (up > .05) color = lerpColor(color, fbm(p, 14, seed + 33) > .5 ? PALETTE.algae : PALETTE.slime, Math.min(.9, up * 1.4));
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
const isBonnet = (c, n) => c.z > .55 && c.z < 2.12 && c.y > .52 && n.y > .30;
const isDoor = (c, n) => Math.abs(c.x) > .70 && c.y > .22 && c.y < .64 && c.z > -.82 && c.z < .15 && Math.abs(n.x) > .45;
const isTub = (c) => Math.abs(c.x) < .60 && c.y > .45 && c.z > -.98 && c.z < .50;

function wreck() {
  const shell = sirenaBodyGeometry();
  const [bonnetSkin, afterBonnet] = subset(shell, isBonnet);
  const [, afterDoors] = subset(afterBonnet, isDoor);
  const [, hull] = subset(afterDoors, isTub);
  bonnetSkin.dispose();
  // Rust has eaten holes through the thin skin, most of all low down and at the tail.
  const [, soundSkin] = subset(hull, (c) => fbm(c, 6, 9) > .66 || (c.y < .32 && fbm(c, 9, 10) > .62));
  const pieces = [crust(soundSkin, 11, { dent: .03 })];
  const add = (geometry, hex) => pieces.push(flat(hex)(geometry));
  const rust = (geometry, seed, options) => pieces.push(crust(geometry, seed, { dent: .012, algae: .6, ...options }));
  // Cabin: floor pan, bucket seat frames, the gearbox tunnel and a roof that has
  // sagged onto its rear pillars. The windscreen and glass are gone.
  rust(transformed(new THREE.BoxGeometry(1.20, .035, 1.55), [0, .24, -.22]), 12);
  rust(transformed(new THREE.BoxGeometry(.34, .42, .30), [.33, .46, -.60], [-.16, 0, 0]), 13);
  rust(transformed(new THREE.BoxGeometry(.34, .30, .30), [-.33, .40, -.62], [-.20, 0, .08]), 14);
  rust(transformed(new THREE.BoxGeometry(.24, .22, 1.15), [0, .36, -.1]), 15);
  rust(transformed(new THREE.BoxGeometry(1.14, .04, .80), [0, .93, -.55], [.05, 0, .05]), 16, { paintLeft: .9 });
  for (const side of [-1, 1]) {
    const pillar = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(side * .56, 1.0, -.86), new THREE.Vector3(side * .70, .88, -1.14), new THREE.Vector3(side * .80, .78, -1.38)]), 8, .028, 6);
    rust(transformed(pillar), 17 + side);
  }
  // A-pillar stubs: one snapped off low, the other bent flat across the cowl.
  rust(transformed(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(.75, .70, .60), new THREE.Vector3(.70, .84, .40)]), 4, .024, 6)), 19);
  rust(transformed(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-.75, .70, .60), new THREE.Vector3(-.6, .9, .1), new THREE.Vector3(-.2, .78, -.05)]), 6, .024, 6)), 20);
  // The engine, bare under the missing bonnet: block, two heads and manifolds.
  rust(transformed(new THREE.BoxGeometry(.60, .38, .76), [0, .40, 1.30]), 21, { dent: .02 });
  for (const side of [-1, 1]) {
    rust(transformed(new THREE.BoxGeometry(.24, .22, .70), [side * .27, .64, 1.30]), 22 + side);
    rust(transformed(new THREE.CylinderGeometry(.03, .03, .8, 8), [side * .40, .52, 1.30], [Math.PI / 2, 0, 0]), 24 + side);
  }
  rust(transformed(new THREE.BoxGeometry(.74, .46, .08), [0, .42, 1.83]), 26);
  // Side pipes, an axle line and the rest of the underbody.
  for (const side of [-1, 1]) rust(transformed(new THREE.CylinderGeometry(.034, .034, .62, 8), [side * .948, .235, -.48], [Math.PI / 2, 0, 0]), 27 + side);
  rust(transformed(new THREE.CylinderGeometry(.04, .04, 1.54, 8), [0, .345, SIRENA_AXLES[1]], [0, 0, Math.PI / 2]), 29);
  // Wheels: three of four. The left front wheel is the loose part on the forest floor.
  for (const [axleIndex, z] of SIRENA_AXLES.entries()) for (const side of [1, -1]) {
    if (axleIndex === 0 && side === 1) continue;
    pieces.push(...wheelPieces(side, 40 + axleIndex * 2 + (side > 0 ? 1 : 0), [side * SIRENA_TRACK, SIRENA_WHEEL_RADIUS, z], side > 0 ? .03 : -.05));
  }
  // The tail lamps and plate are gone; rusty holes remain. Mud and the sand.
  const wreckBody = combine(pieces.splice(0));
  wreckBody.translate(0, -.24, 0);
  // Weed streams from the roof and the open bonnet.
  const growth = [];
  const anchors = [[.52, .99, -.5], [-.4, .96, -.9], [.7, .74, 1.0], [-.62, .66, 1.6], [.2, .8, 1.45], [-.2, .95, .0]];
  anchors.forEach(([x, y, z], i) => growth.push(weed(new THREE.Vector3(x, y - .24, z), new THREE.Vector3((i % 2 ? 1 : -1) * .75, .55, .25), .45 + (i % 3) * .15, 60 + i, .07)));
  const crown = barnacles(wreckBody, 71, 380, { minUp: .25, size: .75 });
  // Sand heaped round the car and drifted over its low side.
  const sand = prepare(sandMound(1.75, 4.3, 81));
  paint(sand, (q, n) => lerpColor(PALETTE.sand, C(0x6b5c42), fbm(q, 4, 83) * .9 + (1 - Math.max(0, n.y)) * .5));
  const merged = combine([wreckBody, ...growth, ...crown, sand]);
  merged.name = 'sirena-wreck';
  merged.computeBoundingBox();
  return merged;
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
  pieces.push(...barnacles(pieces[0], 115, 130, { minUp: .0, size: .8 }));
  const out = combine(pieces); out.rotateZ(Math.PI / 2); out.name = 'sirena-door'; return sinkToFloor(out);
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
  parts.push(paint(transformed(new THREE.TorusGeometry(radius, .006, 6, 28), [0, .005, 0], [Math.PI / 2, 0, 0]), (p) => lerpColor(C(0x8d8a78), C(0x4f5d45), fbm(p, 50, 142))));
  parts.push(flat(0x9b1a1c)(transformed(new THREE.CylinderGeometry(radius * .84, radius * .84, .012, 28), [0, .001, 0])));
  // A cream falcon in flight: two swept wings and a head, extruded thinly.
  const wing = new THREE.Shape(); wing.moveTo(0, .0); wing.lineTo(-.045, .018); wing.lineTo(-.030, -.004); wing.lineTo(-.010, -.016); wing.lineTo(0, -.034); wing.lineTo(.010, -.016); wing.lineTo(.030, -.004); wing.lineTo(.045, .018); wing.lineTo(0, .0);
  parts.push(flat(0xd8cba6)(transformed(new THREE.ExtrudeGeometry(wing, { depth: .004, bevelEnabled: false }), [0, .0065, 0], [Math.PI / 2, 0, 0])));
  parts.push(...barnacles(parts[0], 145, 10, { minUp: .3, size: .22 }).map(g => g));
  const out = combine(parts); out.rotateX(0); out.name = 'sirena-badge'; return sinkToFloor(out);
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
  // The shell: a low ear with a spiral lip and radial ribs, a row of breathing
  // holes along the margin, sitting on a lump of rock with pink crust.
  const long = .095, wide = .068, high = .030, around = 48, rings = 16;
  const surface = (t, a) => {
    const spiral = 1 + .20 * Math.sin(a - 1.0) * (1 - t * .25), r = Math.sin(t * Math.PI / 2) * spiral;
    const rib = 1 + Math.sin(a * 12) * .028 * t, curl = Math.pow(t, 7) * .012;
    const y = high * (1 - Math.pow(t, 1.9)) * (1 + .3 * Math.cos(a - 1.0)) + curl;
    return new THREE.Vector3(Math.cos(a) * long * r * rib, Math.max(0, y), Math.sin(a) * wide * r * rib);
  };
  const positions = [], indices = [];
  for (let i = 0; i <= rings; i++) for (let j = 0; j < around; j++) positions.push(...surface(i / rings, j / around * Math.PI * 2).toArray());
  for (let i = 0; i < rings; i++) for (let j = 0; j < around; j++) {
    const a = i * around + j, b = i * around + (j + 1) % around, c = a + around, d = b + around;
    indices.push(a, b, c, b, d, c);
  }
  const shell = new THREE.BufferGeometry(); shell.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); shell.setIndex(indices); shell.computeVertexNormals();
  shell.translate(0, .026, 0);
  const parts = [paint(shell, (p, n) => lerpColor(lerpColor(C(0x8a3a24), C(0x5e2a1c), fbm(p, 55, 161)), C(0xb75a3c), Math.max(0, n.y) * .35 + Math.sin(Math.atan2(p.z, p.x) * 12) * .07))];
  for (let k = 0; k < 5; k++) {
    const point = surface(.80, 2.55 + k * .20).add(new THREE.Vector3(0, .026, 0));
    parts.push(flat(0x1c1410)(transformed(new THREE.CylinderGeometry(.0065, .0065, .005, 8), point.toArray(), [0, 0, 0])));
  }
  const lump = transformed(new THREE.IcosahedronGeometry(.11, 2), [0, -.012, 0], [0, 0, 0], [1.25, .38, 1.0]);
  const rp = lump.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < rp.count; i++) { v.fromBufferAttribute(rp, i); const d = (fbm(v, 14, 171) - .5) * .05; rp.setXYZ(i, v.x + d, v.y + d * .5, v.z + d); }
  lump.computeVertexNormals();
  parts.push(paint(lump, (p, n) => lerpColor(lerpColor(C(0x3f3c38), C(0x5c5750), fbm(p, 20, 172)), fbm(p, 9, 173) > .5 ? C(0xb0647a) : C(0x4d5a32), Math.max(0, n.y) * (fbm(p, 9, 173) - .3) * 1.4)));
  const out = combine(parts); out.name = 'red-abalone';
  return sinkToFloor(out);
}

// ---------- write ----------
const material = new THREE.MeshStandardMaterial({ name: 'Sirena crust', vertexColors: true, roughness: .93, metalness: .05 });
const models = {
  wreck: wreck, badge, 'steering-wheel': steeringWheel, wheel: wheelPart, bonnet, door, 'lift-bag': liftBag, abalone,
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
