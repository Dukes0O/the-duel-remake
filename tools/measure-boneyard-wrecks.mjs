// Where the Boneyard's three wrecks are solid: measured from the model as the scene sets it down.
//
// A wreck used to be one box round the whole aircraft, wings and all, so a car was stopped on open ground between a wing
// and the nose (Kyle and Claude, 17 November 2026). This tool samples every triangle of each wreck at the height a car
// meets it (0.25 m to 2.2 m above the ground), in the wreck's own frame (u along the fuselage, w across it), and fits
// boxes to what is there: each 2 m slice along the fuselage gives the stretches across it that are filled, and slices
// with like stretches are joined. It prints the `parts` rows for src/world/boneyard-wrecks.js.
//
//   node tools/measure-boneyard-wrecks.mjs            prints the table
//   import {measureBoneyardWrecks} from this file     for tools/test-scablands-scene.mjs, which checks the table
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Course} from '../src/course.js';
import {SCABLANDS_VENUE} from '../src/world/scablands.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {createScablandsScene, SCABLANDS_ASSETS} from '../src/world/scablands-scene.js';
import {BONEYARD_WRECKS} from '../src/world/boneyard-wrecks.js';

export const WRECK_BAND = Object.freeze({low: .25, high: 2.2, slice: 2, cell: .5, join: 1.5, pad: .3, gap: 2});

// Every sample of a wreck's triangles: [x, y above the ground, z] in world metres about the wreck's own place.
export async function wreckSamples() {
  const course = new Course(SCABLANDS_VENUE, 1989);
  const real = path => { const bytes = readFileSync(new URL('../public' + path, import.meta.url));
    return new Promise((done, fail) => new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', done, fail)); };
  const scene = createScablandsScene(course, {loadAsset: async path => {
    if (path === SCABLANDS_ASSETS.boneyard) return real(path);
    const root = new THREE.Group();
    if (path === SCABLANDS_ASSETS.bess || path === SCABLANDS_ASSETS.furnace) for (const name of ['Big Bess gas truck', "Old Smoke's rolling furnace"]) { const part = new THREE.Group(); part.name = name; root.add(part); }
    if (path === SCABLANDS_ASSETS.folk) { const auntie = new THREE.Group(); auntie.name = 'auntie-solder_root';
      const body = new THREE.Mesh(new THREE.BoxGeometry(.5, 2, .4), new THREE.MeshStandardMaterial()); body.position.y = 1; auntie.add(body); root.add(auntie); }
    return {scene: root};
  }});
  if (await scene.ready !== true) throw new Error('The Boneyard scene did not load.');
  scene.group.updateMatrixWorld(true);
  const lod = scene.group.getObjectByName('The Boneyard detail LOD'), out = new Map();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), v = new THREE.Vector3();
  for (const wreck of BONEYARD_WRECKS) {
    const pivot = lod.getObjectByName(`${wreck.part} on the ground`), ground = scablandsSurfaceHeightAt(wreck.x, wreck.z), samples = [], fuselage = [];
    pivot.traverse(mesh => {
      if (!mesh.isMesh) return;
      const p = mesh.geometry.attributes.position, index = mesh.geometry.index, count = (index ? index.count : p.count) / 3, body = /fuselage/.test(mesh.name);
      for (let t = 0; t < count; t++) {
        const at = k => index ? index.getX(t * 3 + k) : t * 3 + k;
        a.fromBufferAttribute(p, at(0)).applyMatrix4(mesh.matrixWorld); b.fromBufferAttribute(p, at(1)).applyMatrix4(mesh.matrixWorld); c.fromBufferAttribute(p, at(2)).applyMatrix4(mesh.matrixWorld);
        // A big flat triangle counts where it lies, not only at its corners: sample it about every half metre.
        const n = Math.max(1, Math.min(24, Math.ceil(Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)) / .5)));
        for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
          v.copy(a).multiplyScalar(i / n).addScaledVector(b, j / n).addScaledVector(c, (n - i - j) / n);
          samples.push([v.x - wreck.x, v.y - ground, v.z - wreck.z]);
          if (body) fuselage.push([v.x - wreck.x, v.z - wreck.z]);
        }
      }
    });
    out.set(wreck.id, {samples, fuselage});
  }
  scene.dispose();
  return out;
}

// The fuselage's own direction on the ground: the principal axis of its samples (the direction of greatest spread about
// their middle; the longest extent would be a long box's diagonal, eight degrees off for these aircraft).
function longAxis(points) {
  let mx = 0, mz = 0;
  for (const [x, z] of points) { mx += x; mz += z; }
  mx /= points.length; mz /= points.length;
  let xx = 0, zz = 0, xz = 0;
  for (const [x, z] of points) { xx += (x - mx) ** 2; zz += (z - mz) ** 2; xz += (x - mx) * (z - mz); }
  return .5 * Math.atan2(2 * xz, xx - zz);
}

// Boxes for one wreck in its own frame: [{u, w, halfU, halfW, height}], u along the fuselage, w across it.
export function fitWreckParts({samples, fuselage}, band = WRECK_BAND) {
  const angle = longAxis(fuselage), cos = Math.cos(angle), sin = Math.sin(angle);
  const slices = new Map(), tall = new Map();
  for (const [x, y, z] of samples) {
    const u = x * cos + z * sin, w = -x * sin + z * cos, slice = Math.floor(u / band.slice), cell = Math.floor(w / band.cell), key = `${slice},${Math.floor(w / band.slice)}`;
    tall.set(key, Math.max(tall.get(key) ?? 0, y));
    if (y < band.low || y > band.high) continue;
    if (!slices.has(slice)) slices.set(slice, new Set());
    slices.get(slice).add(cell);
  }
  // In each slice, the stretches across that are filled (a gap of up to `gap` metres is bridged).
  const rows = [...slices].sort((p, q) => p[0] - q[0]).map(([slice, cells]) => {
    const sorted = [...cells].sort((p, q) => p - q), runs = [];
    for (const cell of sorted) {
      const last = runs.at(-1);
      if (last && (cell - last.to) * band.cell <= band.gap) last.to = cell; else runs.push({from: cell, to: cell});
    }
    return {slice, runs: runs.map(run => ({lo: run.from * band.cell, hi: (run.to + 1) * band.cell}))};
  });
  // Join like stretches of neighbouring slices into boxes.
  const open = [], boxes = [];
  for (const row of rows) {
    const next = [];
    for (const run of row.runs) {
      const match = open.find(box => box.until === row.slice - 1 && !box.taken && Math.abs(box.lo - run.lo) <= band.join && Math.abs(box.hi - run.hi) <= band.join);
      if (match) { match.taken = true; match.until = row.slice; match.lo = Math.min(match.lo, run.lo); match.hi = Math.max(match.hi, run.hi); next.push(match); }
      else { const box = {from: row.slice, until: row.slice, lo: run.lo, hi: run.hi}; boxes.push(box); next.push(box); }
    }
    for (const box of next) box.taken = false;
    open.length = 0; open.push(...next);
  }
  // Each box is drawn in to what is really inside it, so that it reaches no farther than the wreck does (plus the pad).
  for (const box of boxes) Object.assign(box, {u0: Infinity, u1: -Infinity, w0: Infinity, w1: -Infinity});
  for (const [x, y, z] of samples) {
    if (y < band.low || y > band.high) continue;
    const u = x * cos + z * sin, w = -x * sin + z * cos, slice = Math.floor(u / band.slice);
    const box = boxes.find(item => slice >= item.from && slice <= item.until && w >= item.lo && w <= item.hi);
    if (!box) continue;
    box.u0 = Math.min(box.u0, u); box.u1 = Math.max(box.u1, u); box.w0 = Math.min(box.w0, w); box.w1 = Math.max(box.w1, w);
  }
  // `+ 0` turns a rounded -0 into 0, so that the table reads and compares as it prints.
  const round = value => Math.round(value * 10) / 10 + 0;
  const parts = boxes.filter(box => box.u1 >= box.u0).map(box => {
    const {u0, u1} = box; box.lo = box.w0; box.hi = box.w1;
    let height = band.high;
    for (let slice = box.from; slice <= box.until; slice++) for (let w = Math.floor(box.lo / band.slice); w <= Math.floor((box.hi - 1e-6) / band.slice); w++)
      height = Math.max(height, tall.get(`${slice},${w}`) ?? 0);
    // Rounded outward by a tenth, so that rounding never leaves a drawn part outside its box.
    const up = value => Math.ceil(value * 10 - 1e-9) / 10;
    return {u: round((u0 + u1) / 2), w: round((box.lo + box.hi) / 2), halfU: up((u1 - u0) / 2 + band.pad + .05), halfW: up((box.hi - box.lo) / 2 + band.pad + .05), height: round(height)};
  }).sort((p, q) => q.halfU * q.halfW - p.halfU * p.halfW);
  return {axis: Math.round(angle * 1800 / Math.PI) / 10, parts};
}

export async function measureBoneyardWrecks() {
  const samples = await wreckSamples(), out = {};
  for (const wreck of BONEYARD_WRECKS) out[wreck.id] = fitWreckParts(samples.get(wreck.id));
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const measured = await measureBoneyardWrecks();
  for (const [id, {axis, parts}] of Object.entries(measured)) {
    const area = parts.reduce((sum, part) => sum + part.halfU * part.halfW * 4, 0);
    console.log(`  // ${id}: ${parts.length} parts, ${Math.round(area)} square metres solid`);
    console.log(`  ${id}: {axis: ${axis}, parts: [${parts.map(part => `[${part.u}, ${part.w}, ${part.halfU}, ${part.halfW}, ${part.height}]`).join(', ')}]},`);
  }
}
