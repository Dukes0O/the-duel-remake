// Trace the pilot's map outlines (docs/PILOT_MAP.md section 2, card MAP-DATA):
// each place's road, taken from its own course build, shrunk to about 1.2 km
// across and simplified, written to src/generated/pilot-map.json (committed,
// since the game loads it). Rebuild with `node tools/build-pilot-map.mjs`;
// `--check` says whether the committed file is current.
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {PILOT_MAP, PLACES} from '../src/heli/pilot-map-data.js';
import {CIRCUIT_ENTRIES} from '../src/circuit-manifests.js';
import {EXPANSION_COURSES} from '../src/expansion-courses.js';

export const OUTLINE_FILE = fileURLToPath(new URL('../src/generated/pilot-map.json', import.meta.url));
// Course layouts are built from this seed (the one every tool and test uses).
export const TRACE_SEED = 1989;
// A simplified outline keeps every bend that moves the line more than this, km.
export const TRACE_TOLERANCE_KM = 0.006;
const DECIMALS = 1000;

// Douglas-Peucker on [x, z] points; `closed` outlines are split at their
// farthest point so the loop closes cleanly.
function simplify(points, tolerance) {
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    const a = points[first], b = points[last];
    const dx = b[0] - a[0], dz = b[1] - a[1], span = dx * dx + dz * dz;
    let far = -1, worst = tolerance;
    for (let i = first + 1; i < last; i++) {
      const p = points[i];
      let distance;
      if (span === 0) distance = Math.hypot(p[0] - a[0], p[1] - a[1]);
      else {
        const k = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / span));
        distance = Math.hypot(p[0] - (a[0] + dx * k), p[1] - (a[1] + dz * k));
      }
      if (distance > worst) { worst = distance; far = i; }
    }
    if (far >= 0) { keep[far] = 1; stack.push([first, far], [far, last]); }
  }
  return points.filter((_, i) => keep[i]);
}

// One course's road as an outline about the origin, km.
export function traceCourse(def, {sizeKm = PILOT_MAP.outlineKm, tolerance = TRACE_TOLERANCE_KM} = {}) {
  const course = new Course(def, TRACE_SEED);
  const xs = course.samples.map(p => p.x), zs = course.samples.map(p => p.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const scale = sizeKm / Math.max(maxX - minX, maxZ - minZ);
  let points = course.samples.map(p => [(p.x - cx) * scale, (p.z - cz) * scale]);
  const closed = def.closed !== false;
  if (closed) points = [...points, points[0]];
  // A closed loop is simplified in two halves so the seam is not a corner.
  if (closed) {
    const mid = points.reduce((best, p, i) => Math.hypot(p[0] - points[0][0], p[1] - points[0][1]) > Math.hypot(points[best][0] - points[0][0], points[best][1] - points[0][1]) ? i : best, 0);
    points = [...simplify(points.slice(0, mid + 1), tolerance), ...simplify(points.slice(mid), tolerance).slice(1)];
  } else points = simplify(points, tolerance);
  const rounded = points.map(([x, z]) => [Math.round(x * DECIMALS) / DECIMALS, Math.round(z * DECIMALS) / DECIMALS]);
  const rx = rounded.map(p => p[0]), rz = rounded.map(p => p[1]);
  return {
    course: def.id, closed,
    width: Math.round((Math.max(...rx) - Math.min(...rx)) * DECIMALS) / DECIMALS,
    height: Math.round((Math.max(...rz) - Math.min(...rz)) * DECIMALS) / DECIMALS,
    points: rounded,
  };
}

// The whole file's contents: one outline for each place that has a road. A
// place with several courses is traced from its first.
export function buildPilotMap() {
  const outlines = {};
  for (const place of PLACES) {
    if (!place.courses.length) continue;
    // Keep the released outline while a replacement road is still a preview.
    const replacement = CIRCUIT_ENTRIES.find(row => row.manifest.id === place.courses[0] && row.manifest.slot !== undefined && row.manifest.state !== 'on');
    const def = replacement ? EXPANSION_COURSES.find(row => row.id === replacement.manifest.id)
      : COURSE.find(course => course.id === place.courses[0]);
    if (!def) throw new Error(`${place.id}: no course ${place.courses[0]} in the registry`);
    outlines[place.id] = traceCourse(def);
  }
  const previews = Object.fromEntries(CIRCUIT_ENTRIES.filter(row => row.manifest.slot !== undefined && row.manifest.state !== 'on')
    .map(row => [row.manifest.id, {flag: row.manifest.flag, outline: traceCourse(row.definition)}]));
  return {version: PILOT_MAP.version, sizeKm: PILOT_MAP.outlineKm, seed: TRACE_SEED, toleranceKm: TRACE_TOLERANCE_KM, outlines, previews};
}

export const serialise = map => JSON.stringify(map) + '\n';

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const text = serialise(buildPilotMap());
  if (process.argv.includes('--check')) {
    const same = readFileSync(OUTLINE_FILE, 'utf8') === text;
    console.log(same ? 'pilot-map.json is current' : 'pilot-map.json is out of date: run node tools/build-pilot-map.mjs');
    process.exit(same ? 0 : 1);
  }
  writeFileSync(OUTLINE_FILE, text);
  const total = Object.values(JSON.parse(text).outlines).reduce((sum, o) => sum + o.points.length, 0);
  console.log(`wrote ${OUTLINE_FILE} (${text.length} bytes, ${total} points)`);
}
