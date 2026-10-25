// PERF-GROUND-ROWS: the compact ground rows, the cell index and the shared far-terrain grid give exactly the heights
// the plain readers gave, and every drawn buffer is what it was (hashes recorded from the code before the change:
// node tools/test-ground-rows-exact.mjs --record, run on that code).
// The compact ground rows and the cell index give exactly the heights the plain reader gave.
// The reference below is the previous reader in its simplest form: object rows computed from scratch with
// ribbonGroundAt (never the rows the terrain buffer seeded), and every drawn triangle tested with no index.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {makeRng} from '../src/rng.js';
import {terrainGeometry, farTerrainGeometry} from '../src/world-surfaces.js';
import {addLandscapeDetail} from '../src/landscape-detail.js';
import {createPolylineIndex} from '../src/polyline-index.js';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {ribbonGroundAt} from '../src/ribbon-ground.js';
import {renderedGroundHeight} from '../src/rendered-ground.js';
import {farTerrainHeightSampler} from '../src/far-terrain-surface.js';

let checks = 0;
const same = (a, b, label) => { assert.ok(Object.is(a, b), `${label}: ${a} vs ${b}`); checks++; };

const oldDocument = globalThis.document;
globalThis.document = {createElement() {
  const canvas = {width: 0, height: 0};
  const context = new Proxy({createImageData: (w, h) => ({data: new Uint8ClampedArray(w * h * 4)}), measureText: () => ({width: 40}),
    createLinearGradient: () => ({addColorStop() {}}), createRadialGradient: () => ({addColorStop() {}})},
  {get: (target, key) => target[key] ?? (() => {}), set: (target, key, value) => { target[key] = value; return true; }});
  canvas.getContext = () => context;
  return canvas;
}};
const oldLoad = THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load = function () { const t = new THREE.Texture(); t.image = {src: 'x'}; return t; };

function referenceOffsets(course, s) {
  const authored64 = course.def.terrainHalfWidth === 64 && !course.def.expansion;
  const offsets = course.def.expansion || authored64 ? [-64,-56,-48,-40,-32,-24,-18,-14,-10,-7,0,7,10,14,18,24,32,40,48,56,64]
    : [-140,-120,-100,-80,-72,-64,-56,-48,-40,-32,-24,-18,-14,-10,-7,0,7,10,14,18,24,32,40,48,56,64,72,80,100,120,140];
  if (course.def.offroad) { const width = course.roadHalfWidthAt(s), segments = Math.ceil(width * 2); for (let i = 0; i <= segments; i++) offsets.push(-width + width * 2 * i / segments); }
  for (const cut of course.features.shortcuts) {
    const center = course.shortcutOffset(cut, s);
    for (const off of [-cut.halfWidth - 9, -cut.halfWidth - 3, 0, cut.halfWidth + 3, cut.halfWidth + 9]) offsets.push(center + off);
    if (course.def.offroad) { const segments = Math.ceil(cut.halfWidth * 2); for (let i = 0; i <= segments; i++) offsets.push(center - cut.halfWidth + cut.halfWidth * 2 * i / segments); }
  }
  offsets.sort((a, b) => a - b);
  return offsets;
}
function referenceReader(course) {
  const rows = new Map();
  const row = s => {
    if (rows.has(s)) return rows.get(s);
    const offsets = referenceOffsets(course, s);
    const points = offsets.map(off => { const p = ribbonGroundAt(course, s, off); return {x: Math.fround(p.x), y: Math.fround(p.y), z: Math.fround(p.z)}; });
    points.offsets = offsets; rows.set(s, points); return points;
  };
  const authored64 = course.def.terrainHalfWidth === 64 && !course.def.expansion, step = course.def.offroad ? 2 : 4;
  let quads = null;
  const grid = 16, extent = 1100;
  const route = course.samples.filter((_, i) => i % 4 === 0);
  if (route.at(-1) !== course.samples.at(-1)) route.push(course.samples.at(-1));
  const xs = route.map(p => p.x), zs = route.map(p => p.z);
  const minX = Math.floor((Math.min(...xs) - extent) / grid) * grid, minZ = Math.floor((Math.min(...zs) - extent) / grid) * grid;
  const bounds = {minX, minZ, maxX: minX + Math.ceil((Math.max(...xs) + extent - minX) / grid) * grid, maxZ: minZ + Math.ceil((Math.max(...zs) + extent - minZ) / grid) * grid};
  const inside = point => point.x >= bounds.minX && point.x < bounds.maxX && point.z >= bounds.minZ && point.z < bounds.maxZ;
  return (point, {requireSurface = false} = {}) => {
    const farHeight = course.def.expansion || (authored64 && inside(point)) ? farTerrainHeightSampler(course)(point.x, point.z) : null;
    const visibleHeight = near => farHeight === null ? near : Math.max(near, farHeight);
    const height = (a, b, c) => {
      const dx = b.x - a.x, dz = b.z - a.z, ex = c.x - a.x, ez = c.z - a.z, px = point.x - a.x, pz = point.z - a.z, det = dx * ez - dz * ex;
      if (Math.abs(det) < 1e-9) return null;
      const u = (px * ez - pz * ex) / det, v = (dx * pz - dz * px) / det;
      return u >= -1e-7 && v >= -1e-7 && u + v <= 1 + 1e-7 ? a.y + u * (b.y - a.y) + v * (c.y - a.y) : null;
    };
    if (authored64) {
      if (!quads) {
        quads = [];
        for (let s = 0; s < course.length; s += step) {
          const end = Math.min(s + step, course.length);
          if (end < s + step && !course.def.ridgeLandform && course.def.completeTerrainRibbon !== true) break;
          const previous = row(s), next = row(end);
          for (let i = 1; i < next.length; i++) {
            const a = previous[i - 1], b = next[i - 1], c = previous[i], d = next[i];
            quads.push({a, b, c, d, minX: Math.min(a.x, b.x, c.x, d.x), maxX: Math.max(a.x, b.x, c.x, d.x), minZ: Math.min(a.z, b.z, c.z, d.z), maxZ: Math.max(a.z, b.z, c.z, d.z)});
          }
        }
      }
      let result = farHeight;
      for (const q of quads) {
        if (point.x < q.minX || point.x > q.maxX || point.z < q.minZ || point.z > q.maxZ) continue;
        const first = height(q.a, q.b, q.c), second = height(q.c, q.b, q.d);
        if (first !== null) result = result === null ? first : Math.max(result, first);
        if (second !== null) result = result === null ? second : Math.max(result, second);
      }
      return result ?? (requireSurface ? null : course.groundAt(point.s, point.off).y);
    }
    const start = Math.floor(point.s / step) * step;
    for (const s of [start, start - step, start + step]) {
      if (s < 0 || s + step > course.length) continue;
      const previous = row(s), next = row(s + step);
      for (let i = 1; i < next.length; i++) {
        const first = height(previous[i - 1], next[i - 1], previous[i]);
        if (first !== null) return visibleHeight(first);
        const second = height(previous[i], next[i - 1], next[i]);
        if (second !== null) return visibleHeight(second);
      }
    }
    return farHeight ?? (requireSurface ? null : course.groundAt(point.s, point.off).y);
  };
}


// The far-terrain height reader, as it was: every corner worked out on demand from its own polyline query.
function referenceFarSampler(course) {
  const grid = (course.def.kind === 'chase' || course.def.layout === 'city') ? 8 : course.def.arena || course.def.expansion || course.def.terrainHalfWidth === 64 ? 16 : 32;
  const threshold = course.def.arena ? 18 : (course.def.expansion || course.def.terrainHalfWidth === 64) ? 40 : (course.def.kind === 'chase' || course.def.layout === 'city') ? 50 : 80;
  const route = course.samples.filter((_, i) => i % 4 === 0), last = course.samples.at(-1);
  if (route.at(-1) !== last) route.push(last);
  const index = createPolylineIndex(route), corners = new Map();
  const corner = (i, j) => {
    const key = i * 1048576 + j;
    if (corners.has(key)) return corners.get(key);
    const x = i * grid, z = j * grid, {index: k, t, distanceSq: best} = index.query(x, z);
    const a = route[k - 1], b = route[k], dx = b.x - a.x, dz = b.z - a.z, px = x - a.x - t * dx, pz = z - a.z - t * dz;
    const roadS = a.s + (b.s - a.s) * t, off = Math.sqrt(best) * Math.sign(px * dz - pz * dx);
    const result = {distance: Math.sqrt(best), height: Math.fround((course.farGroundY ? course.farGroundY(x, z, roadS, off) : course.groundAt(roadS, off).y) - .15)};
    corners.set(key, result); return result;
  };
  return (x, z) => {
    const i = Math.floor(x / grid), j = Math.floor(z / grid), u = x / grid - i, v = z / grid - j;
    const a = corner(i, j), b = corner(i + 1, j), c = corner(i, j + 1), d = corner(i + 1, j + 1);
    if (a.distance <= threshold || b.distance <= threshold || c.distance <= threshold || d.distance <= threshold) return null;
    return u + v <= 1 ? a.height * (1 - u - v) + b.height * u + c.height * v : b.height * (1 - v) + c.height * (1 - u) + d.height * (u + v - 1);
  };
}
const hashOf = arrays => { const h = createHash('sha256'); for (const a of arrays) h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)); return h.digest('hex'); };
const geometryHash = g => hashOf([...Object.keys(g.attributes).sort().map(k => g.attributes[k].array), ...(g.index ? [g.index.array] : []), new Int32Array(g.groups.flatMap(x => [x.start, x.count, x.materialIndex]))]);
function drawnHashes(def) {
  const course = new Course(def, 1989);
  const near = terrainGeometry(course), far = farTerrainGeometry(course);
  // The scenery builder as world.js calls it: one view of the course per theme it passes through.
  const group = new THREE.Group(), winter = def.snowWorld;
  for (const theme of new Set(course.sections.map(s => s.theme))) {
    if (theme === 'arena') continue;
    const view = Object.create(course); view.def = {...def, theme};
    if (winter && (!winter.mixed || theme === 'alpine')) view.def = {...view.def, theme: 'alpine', winterMountainCaps: true};
    view.features = {...course.features, rocks: course.features.rocks.filter(p => p.theme === theme)};
    view.detailSections = course.sections.filter(s => s.theme === theme);
    addLandscapeDetail(group, view, theme === 'alpine');
  }
  const cells = [];
  group.traverse(mesh => { if (mesh.userData.landscapeCell) cells.push(mesh); });
  cells.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const scenery = hashOf(cells.flatMap(mesh => [mesh.instanceMatrix.array, ...(mesh.instanceColor ? [mesh.instanceColor.array] : []), new Int32Array([mesh.count])]));
  return {near: geometryHash(near), far: geometryHash(far), scenery, cells: cells.length, roadAvoid: group.userData.landscapeRoadAvoid ?? null};
}
const fixturePath = new URL('./fixtures/ground-rows-hashes.json', import.meta.url);
const recording = process.argv.includes('--record'), recorded = {};

try {
  for (const def of COURSE) {
    if (def.practice || def.pit || def.id === 'salt-flats') continue;
    const course = new Course(def, 1989), rng = makeRng(4242);
    terrainGeometry(course); // seeds the rows the reader shares with the terrain buffer
    const reference = referenceReader(course);
    const xs = course.samples.map(p => p.x), zs = course.samples.map(p => p.z);
    const box = [Math.min(...xs) - 300, Math.max(...xs) + 300, Math.min(...zs) - 300, Math.max(...zs) + 300];
    const authored = def.terrainHalfWidth === 64 && !def.expansion, count = authored ? 500 : 1500;
    for (let i = 0; i < count; i++) {
      const near = course.samples[Math.floor(rng.float() * course.samples.length)];
      const x = i % 3 ? near.x + rng.range(-80, 80) : rng.range(box[0], box[1]), z = i % 3 ? near.z + rng.range(-80, 80) : rng.range(box[2], box[3]);
      const at = course.nearest(x, z), point = {x, z, s: at.s, off: at.lateral};
      for (const requireSurface of [false, true]) {
        const options = {requireSurface};
        const actual = renderedGroundHeight(course, point, options), expected = reference(point, options);
        same(actual, expected, `${def.id}: height at ${x.toFixed(1)}, ${z.toFixed(1)} (surface required: ${requireSurface})`);
      }
    }

    // The far-terrain reader against the plain one, before the geometry exists (corners worked out) and after it (corners read from its grid).
    const before = new Course(def, 1989), after = new Course(def, 1989);
    const sampleBefore = farTerrainHeightSampler(before), sampleAfter = farTerrainHeightSampler(after);
    farTerrainGeometry(after);
    const refBefore = referenceFarSampler(before), refAfter = referenceFarSampler(after);
    for (let i = 0; i < 600; i++) {
      const near = course.samples[Math.floor(rng.float() * course.samples.length)];
      const x = i % 2 ? near.x + rng.range(-300, 300) : rng.range(box[0], box[1]), z = i % 2 ? near.z + rng.range(-300, 300) : rng.range(box[2], box[3]);
      same(sampleBefore(x, z), refBefore(x, z), `${def.id}: far height before the geometry at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      same(sampleAfter(x, z), refAfter(x, z), `${def.id}: far height after the geometry at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    }
    // Every drawn buffer and every scenery instance is what the code before the change drew.
    if (!def.arena) {
      const hashes = drawnHashes(def);
      if (recording) recorded[def.id] = hashes;
      else { const want = JSON.parse(readFileSync(fixturePath, 'utf8'))[def.id]; assert.deepEqual(hashes, want, `${def.id}: terrain, far terrain and scenery`); checks++; }
    }
    // Also a point exactly on a drawn vertex column and on the route itself.
    for (const p of course.samples.filter((_, i) => i % 97 === 0)) {
      const at = course.nearest(p.x, p.z), point = {x: p.x, z: p.z, s: at.s, off: at.lateral};
      same(renderedGroundHeight(course, point), reference(point), `${def.id}: height on the route`);
    }
  }
  if (recording) { writeFileSync(fixturePath, JSON.stringify(recorded, null, 1) + '\n'); console.log('Recorded the drawn hashes of', Object.keys(recorded).length, 'courses.'); }
} finally {
  globalThis.document = oldDocument; THREE.TextureLoader.prototype.load = oldLoad;
}
console.log(`Ground rows: ${checks} rendered-ground heights match the plain reader bit for bit on every course.`);
