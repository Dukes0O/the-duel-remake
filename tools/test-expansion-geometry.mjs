import assert from 'node:assert/strict';
import { COURSE } from '../src/config.js';
import { Course } from '../src/course.js';
import { expansionHeight } from '../src/expansion-courses.js';
import { strip, terrainGeometry, farTerrainGeometry } from '../src/world-surfaces.js';
import { sweepObstacle } from '../src/collision.js';

let checks = 0, coverageQueries = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const expansions = COURSE.filter(def => def.expansion);
assert.equal(expansions.length, 6);

// Read actual float32 positions and triangle indices. A height formula alone
// cannot detect omitted terrain quads, folded ribbons or visible mesh gaps.
function triangleSampler(geometry, tag) {
  const p = geometry.attributes.position, index = geometry.index, cells = new Map(), size = 32;
  for (let i = 0; i < p.array.length; i++) check(Number.isFinite(p.array[i]), `${tag}: finite rendered position`);
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
    const ax = p.getX(a), az = p.getZ(a), bx = p.getX(b), bz = p.getZ(b), cx = p.getX(c), cz = p.getZ(c);
    const area = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
    check(area < -1e-7, `${tag}: terrain triangle ${i / 3} keeps upward winding without folding`);
    const triangle = { ax, az, bx, bz, cx, cz, ay: p.getY(a), by: p.getY(b), cy: p.getY(c), area };
    for (let x = Math.floor(Math.min(ax, bx, cx) / size); x <= Math.floor(Math.max(ax, bx, cx) / size); x++)
      for (let z = Math.floor(Math.min(az, bz, cz) / size); z <= Math.floor(Math.max(az, bz, cz) / size); z++) {
        const key = `${x}:${z}`; if (!cells.has(key)) cells.set(key, []); cells.get(key).push(triangle);
      }
  }
  return point => {
    let height = -Infinity;
    for (const t of cells.get(`${Math.floor(point.x / size)}:${Math.floor(point.z / size)}`) || []) {
      const u = ((point.x - t.ax) * (t.cz - t.az) - (point.z - t.az) * (t.cx - t.ax)) / t.area;
      const v = ((t.bx - t.ax) * (point.z - t.az) - (t.bz - t.az) * (point.x - t.ax)) / t.area;
      if (u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6) height = Math.max(height, t.ay + u * (t.by - t.ay) + v * (t.cy - t.ay));
    }
    return height === -Infinity ? null : height;
  };
}

const cross = (a, b, c) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
function intersects(a, b, c, d) {
  if (Math.max(a.x, b.x) < Math.min(c.x, d.x) || Math.max(c.x, d.x) < Math.min(a.x, b.x) ||
      Math.max(a.z, b.z) < Math.min(c.z, d.z) || Math.max(c.z, d.z) < Math.min(a.z, b.z)) return false;
  return cross(a, b, c) * cross(a, b, d) < -1e-7 && cross(c, d, a) * cross(c, d, b) < -1e-7;
}

const summaries = [];
for (const def of expansions) {
  const course = new Course(def, 1989), tag = def.id, samples = course.samples, segments = samples.length - 1;
  check(def.airborne && def.laps === 2 && def.layoutSeed === 1989 && def.layoutVersion >= 2, `${tag}: fixed two-lap flight layout has a separate record identity`);
  check(def.terrainHalfWidth === 64, `${tag}: tight bends use the bounded 64 m near ribbon`);
  check(Math.max(...samples.map(p => Math.abs(p.curvature))) < 1 / 84, `${tag}: minimum bend radius exceeds 84 m`);
  for (let i = 0; i < segments; i++) for (let j = i + 2; j < segments; j++) {
    if (i === 0 && j === segments - 1) continue;
    check(!intersects(samples[i], samples[i + 1], samples[j], samples[j + 1]), `${tag}: non-adjacent road segments do not intersect`);
  }
  let grade = 0;
  for (let s = 0; s < course.length; s += 2) {
    const y = course.at(s).y, before = course.at(s - .01).y, after = course.at(s + .01).y;
    check(Math.abs(y - expansionHeight(def, s)) < 1e-10, `${tag}: road evaluates the authored analytic height`);
    check(Math.abs(y - course.at(s + course.length).y) < 1e-10, `${tag}: analytic height is periodic`);
    grade = Math.max(grade, Math.abs(after - before) / .02);
  }
  check(grade < .32, `${tag}: maximum analytic grade ${(grade * 100).toFixed(3)}% stays below 32%`);
  for (const [center, span] of [...def.expansion.hills.map(([center, span]) => [center * course.length, span * course.length]),
    ...def.expansion.crests.map(([center, span]) => [center * course.length, span])]) for (const s of [center - span, center + span]) {
    const h = .001, y = course.at(s).y, left = (y - course.at(s - h).y) / h, right = (course.at(s + h).y - y) / h;
    check(Math.abs(left - right) < .00002, `${tag}: compact landform endpoints meet with continuous slope`);
  }
  const road = strip(course, s => -course.roadHalfWidthAt(s), s => course.roadHalfWidthAt(s), 0);
  const shoulder = strip(course, s => course.roadHalfWidthAt(s), s => course.roadHalfWidthAt(s) + 1.25, .018);
  for (const [name, geometry] of [['road', road], ['shoulder', shoulder]]) {
    check(geometry.attributes.position.count === (course.length / 2 + 1) * 2, `${tag}: ${name} follows each 2 m longitudinal sample`);
    triangleSampler(geometry, `${tag}/${name}`);
    const p = geometry.attributes.position, uv = geometry.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const s = uv.getY(i) * 10, offset = uv.getX(i) * 5;
      check(Math.abs(p.getY(i) - course.worldAt(s, offset).y - (name === 'shoulder' ? .018 : 0)) < .00003, `${tag}: ${name} does not double-apply crest height`);
    }
  }
  const near = terrainGeometry(course), far = farTerrainGeometry(course), nearAt = triangleSampler(near, `${tag}/near`);
  const offsets = near.attributes.uv, columns = 21;
  check(near.attributes.position.count === (course.length / 4 + 1) * columns, `${tag}: near terrain keeps 4 m rows and 21 columns`);
  for (let row = 0; row <= course.length / 4; row++) for (const [column, off] of [[0, -64], [columns - 1, 64]]) {
    const p = course.groundAt(row * 4, off), i = row * columns + column;
    check(Math.hypot(offsets.getX(i) * 22 - p.x, offsets.getY(i) * 22 - p.z) < .00015, `${tag}: near edge is exactly the 64 m shared ground boundary`);
  }
  const p = far.attributes.position; far.computeBoundingBox();
  const bounds = far.boundingBox, grid = p.getX(1) - p.getX(0), farColumns = Math.round((bounds.max.x - bounds.min.x) / grid) + 1, quads = new Set();
  check(grid === 16, `${tag}: far grid uses 16 m cells`);
  for (let i = 0; i < far.index.count; i += 6) {
    const a = far.index.getX(i); quads.add(a);
    check([a, a + farColumns, a + 1, a + 1, a + farColumns, a + farColumns + 1].every((value, n) => value === far.index.getX(i + n)), `${tag}: far coverage reads the actual rendered quad triangles`);
  }
  const farCovers = point => quads.has(Math.floor((point.z - bounds.min.z) / grid) * farColumns + Math.floor((point.x - bounds.min.x) / grid));
  for (let s = 0; s < course.length; s += 8) for (const side of [-1, 1]) for (const edge of [60, 62, 63.9, 64.1, 65, 67, 70, 74, 80]) {
    const point = course.worldAt(s, side * edge); coverageQueries++;
    check(farCovers(point) || nearAt(point) !== null, `${tag}: rendered terrain gap at ${s}/${side * edge}`);
  }
  for (let s = 0; s < course.length; s += 2) for (const off of [-5, 0, 5]) {
    const point = course.worldAt(s, off), ground = nearAt(point);
    check(ground !== null && point.y > ground + .02, `${tag}: near terrain never hides or pierces the drivable road at ${s}/${off}`);
  }
  check(course.features.setPieces.length === 1, `${tag}: authored landmark is present and tangible`);
  for (const object of [...course.features.setPieces, ...course.features.obstacles.filter(o => o.tunnelWall)]) {
    check(course.features.obstacles.includes(object), `${tag}: ${object.id} belongs to the real collision list`);
    const from = Math.max(0, object.s - Math.max(16, object.halfZ * 2)), to = Math.min(course.length, object.s + Math.max(16, object.halfZ * 2));
    for (let s = from; s < to; s += 2) for (const off of [-5, 0, 5]) {
      const a = course.worldAt(s, off), b = course.worldAt(s + 2, off);
      check(!sweepObstacle(a, b, object, a.heading, { halfWidth: 1.1, halfLength: 2.45 }), `${tag}: tangible ${object.id} keeps the main road clear`);
    }
  }
  summaries.push(`${tag}: R${(1 / Math.max(...samples.map(p => Math.abs(p.curvature)))).toFixed(1)}m, ${(grade * 100).toFixed(1)}%`);
  for (const geometry of [road, shoulder, near, far]) geometry.dispose();
}
console.log(`Expansion geometry: ${checks} checks; ${coverageQueries} actual terrain seam queries. ${summaries.join('; ')}.`);
