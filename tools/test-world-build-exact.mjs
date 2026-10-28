// SUMMIT-BUILD-TIME: the faster ways of building a world give exactly the answers the plain ways did.
// Each section holds a short reference copy of the old arithmetic and compares the new code with it, bit for bit.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {makeRng} from '../src/rng.js';
import {terrainGeometry, farTerrainGeometry} from '../src/world-surfaces.js';
import {computeNormalsFast} from '../src/fast-normals.js';
import {applySnowTerrain, winterWeight} from '../src/snow-world.js';
import {terrainStyleAt} from '../src/terrain-style.js';
import {ribbonGroundAt} from '../src/ribbon-ground.js';
import {basinGround, basinOutOfReach} from '../src/circuit-hills.js';

let checks = 0;
const same = (a, b, label) => { assert.ok(Object.is(a, b), `${label}: ${a} vs ${b}`); checks++; };
const equal = (a, b, label) => { assert.deepEqual(a, b, label); checks++; };

// The terrain asks the canvas for textures; these tests only need geometry.
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

try {
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const cut = COURSE.map(def => def.id).filter(id => id !== 'salt-flats');

  // The nearest road point: the plain arithmetic, using full frames, against nearest() and the lighter nearestS().
  function referenceNearest(course, x, z, referenceS) {
    const found = course._nearestIndex.query(x, z);
    let bestS = found.index < 0 ? 0 : course.samples[found.index - 1].s + found.t * course.step;
    for (let i = 0; i < 3; i++) {
      const f = course.at(bestS), lat = (x - f.x) * Math.cos(f.heading) - (z - f.z) * Math.sin(f.heading), along = (x - f.x) * Math.sin(f.heading) + (z - f.z) * Math.cos(f.heading);
      bestS = course.phase(bestS + along / Math.max(.3, 1 - f.curvature * lat));
    }
    const frame = course.at(bestS), lateral = (x - frame.x) * Math.cos(frame.heading) - (z - frame.z) * Math.sin(frame.heading);
    if (course.closed && Number.isFinite(referenceS)) bestS += Math.round((referenceS - bestS) / course.length) * course.length;
    return {...frame, s: bestS, lateral, distance: Math.hypot(x - frame.x, z - frame.z)};
  }
  for (const id of COURSE.map(def => def.id)) {
    const course = new Course(COURSE.find(def => def.id === id), 1989), rng = makeRng(77);
    const xs = course.samples.map(p => p.x), zs = course.samples.map(p => p.z);
    const [minX, maxX, minZ, maxZ] = [Math.min(...xs) - 400, Math.max(...xs) + 400, Math.min(...zs) - 400, Math.max(...zs) + 400];
    const plain = !course.def.pit && !course.def.saltFlats;
    for (let i = 0; i < 400; i++) {
      const near = course.samples[Math.floor(rng.float() * course.samples.length)];
      const x = i % 2 ? near.x + rng.range(-70, 70) : rng.range(minX, maxX), z = i % 2 ? near.z + rng.range(-70, 70) : rng.range(minZ, maxZ);
      const result = course.nearest(x, z, i % 5 === 0 ? rng.range(0, course.length * 2) : undefined);
      if (plain) {
        const reference = referenceNearest(course, x, z, i % 5 === 0 ? undefined : undefined);
        equal(course.nearest(x, z), reference, `${id}: nearest is the plain nearest`);
      }
      same(course.nearestS(x, z), course.nearest(x, z).s, `${id}: nearestS is nearest().s`);
      assert.ok(Number.isFinite(result.s) || course.def.pit); checks++;
    }
    // worldAt reads the frame without its tunnel flag; phase is the clamp (or the wrap) it always was.
    for (let i = 0; i < 200; i++) {
      const s = rng.range(-50, course.length + 50), lat = i % 3 ? rng.range(-30, 30) : 0;
      if (plain) {
        const f = course.at(s), w = course.worldAt(s, lat);
        same(w.x, f.x + Math.cos(f.heading) * lat, `${id}: worldAt x`);
        same(w.z, f.z - Math.sin(f.heading) * lat, `${id}: worldAt z`);
        same(w.heading, f.heading, `${id}: worldAt heading`);
        same(w.y, course.script && lat ? f.y + course.script.bankLift(s, lat) : f.y, `${id}: worldAt y`);
        equal(Object.keys(f), ['x', 'z', 'y', 'heading', 'curvature', 'tunnel'], `${id}: a frame keeps its fields and their order`);
        same(course.phase(s), course.closed ? ((s % course.length) + course.length) % course.length : clamp(s, 0, course.length), `${id}: phase`);
      }
    }
  }
  same(new Course(COURSE.find(def => def.id === 'summit-run'), 1989).phase(NaN), NaN, 'phase keeps NaN');

  // A course whose `at` was replaced (tests do this) still gets its own frames in nearest and worldAt.
  {
    const course = new Course(COURSE.find(def => def.id === 'summit-run'), 1989);
    course.at = () => ({x: 5, z: 7, y: 2, heading: .5, curvature: 0});
    same(course.worldAt(100, 0).x, 5, 'a replaced at is used by worldAt');
    same(course.nearest(10, 10).x, 5, 'a replaced at is used by nearest');
  }

  // Summit's drawn terrain: the new normals equal three's, and the snow coverage equals the plain nearest-point rule.
  const summit = new Course(COURSE.find(def => def.id === 'summit-run'), 1989);
  for (const [label, build] of [['terrain', terrainGeometry], ['far terrain', farTerrainGeometry]]) {
    const geometry = build(summit), reference = geometry.clone();
    reference.deleteAttribute('normal');
    reference.computeVertexNormals();
    equal(Buffer.from(geometry.attributes.normal.array.buffer).equals(Buffer.from(reference.attributes.normal.array.buffer)), true, `${label}: normals equal three's computeVertexNormals`);
    const plainWeights = new Float32Array(geometry.attributes.position.count), position = geometry.attributes.position;
    for (let i = 0; i < plainWeights.length; i++) plainWeights[i] = winterWeight(summit, summit.nearest(position.getX(i), position.getZ(i)).s);
    applySnowTerrain(geometry, summit);
    equal(Buffer.from(geometry.attributes.winterWeight.array.buffer).equals(Buffer.from(plainWeights.buffer)), true, `${label}: snow coverage equals the plain nearest-point rule`);
    equal(plainWeights.some(value => value > 0) && plainWeights.some(value => value === 0), true, `${label}: Summit is part winter, part not`);
  }
  {
    // Fast normals on a mesh with an unused vertex and a degenerate face.
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 0, 1, 5, 5, 5, 2, 0, 0, 2, 0, 0], 3));
    g.setIndex([0, 1, 2, 3, 4, 5, 0, 2, 1]);
    const r = g.clone(); r.computeVertexNormals(); computeNormalsFast(g);
    equal(Buffer.from(g.attributes.normal.array.buffer).equals(Buffer.from(r.attributes.normal.array.buffer)), true, 'fast normals: unused vertices and degenerate faces');
  }

  // The terrain tint: parsed once, same colours as parsing each time, with colour management on or off.
  for (const managed of [true, false]) {
    const was = THREE.ColorManagement.enabled;
    THREE.ColorManagement.enabled = managed;
    try {
      const tints = {desert: '#d7c6ac', alpine: '#b7cbb3', coast: '#c0c7a2', city: '#929899', arena: '#ba9873'};
      for (const id of cut) {
        const course = new Course(COURSE.find(def => def.id === id), 1989), rng = makeRng(5);
        for (let i = 0; i < 60; i++) {
          const s = rng.range(0, course.length), style = terrainStyleAt(course, s);
          const phase = course.phase(s), section = course.sectionAt(phase), index = course.sections.indexOf(section);
          const previous = course.sections[(index - 1 + course.sections.length) % course.sections.length];
          const t = clamp((phase - section.start) / 100, 0, 1), blend = t * t * (3 - 2 * t);
          const expected = new THREE.Color(tints[previous.theme] || tints.desert).lerp(new THREE.Color(tints[section.theme] || tints.desert), blend);
          equal([style.color.r, style.color.g, style.color.b], [expected.r, expected.g, expected.b], `${id}: terrain tint (managed ${managed})`);
        }
      }
    } finally { THREE.ColorManagement.enabled = was; }
  }

  // The ribbon: a column beside another stretch of road is lowered by the same rule as before.
  function referenceRibbon(course, s, off) {
    const smooth = x => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
    const point = course.groundAt(s, off);
    if (!course.script) return point;
    const own = Math.abs(off);
    if (own <= course.roadHalfWidthAt(s) + 2) return point;
    const near = course.nearest(point.x, point.z);
    if (near.distance >= own - 1) return point;
    const natural = course.groundAt(near.s, near.lateral).y;
    const buried = Math.min(natural, course.worldAt(near.s, near.lateral).y - .4);
    const gap = near.distance - course.roadHalfWidthAt(near.s);
    const nearer = buried + (natural - buried) * smooth((gap - 5) / 10);
    point.y = Math.min(point.y, point.y + (nearer - point.y) * (1 - smooth((gap - 12) / 8)));
    return point;
  }
  for (const id of ['summit-run', 'summit-time-attack', 'ardennes-forest', 'harbour-lights', 'tremblant-snow']) {
    const course = new Course(COURSE.find(def => def.id === id), 1989), rng = makeRng(31);
    let lowered = 0;
    for (let i = 0; i < 4000; i++) {
      const s = rng.range(0, course.length), off = rng.range(-64, 64);
      const got = ribbonGroundAt(course, s, off), expected = referenceRibbon(course, s, off);
      equal(got, expected, `${id}: ribbon ground`);
      if (got.y !== course.groundAt(s, off).y) lowered++;
    }
    if (id === 'summit-run') assert.ok(lowered > 0, 'Summit has columns lowered beside another stretch of road');
    checks++;
  }

  // Basins: the quick test only ever skips points the full rule gives no weight.
  {
    let skipped = 0, kept = 0;
    for (const def of COURSE) for (const basin of def.basins ?? []) {
      const rng = makeRng(Math.floor(basin.s) + 1);
      for (let i = 0; i < 3000; i++) {
        const du = rng.range(-3, 3) * basin.along * (1 + (basin.blend ?? 30) / Math.min(basin.along, basin.across)), dv = rng.range(-3, 3) * basin.across * (1 + (basin.blend ?? 30) / Math.min(basin.along, basin.across));
        if (basinOutOfReach(basin, du, dv)) {
          skipped++;
          for (const gap of [0, 3, 40]) { const ground = basinGround(basin, du, dv, gap); assert.ok(ground.weight === 0 && ground.height === 0, 'skipped points have no basin weight'); checks++; }
        } else kept++;
      }
    }
    assert.ok(skipped > 1000 && kept > 1000, 'both outcomes were tried'); checks++;
  }
} finally {
  THREE.TextureLoader.prototype.load = oldLoad;
  if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
}

console.log(`World build exactness: ${checks} checks passed (nearest point, worldAt, phase, normals, snow coverage, tint, ribbon, basins).`);
