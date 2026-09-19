import assert from 'node:assert/strict';
import { COURSE } from '../src/config.js';
import { Course } from '../src/course.js';
import { sweepObstacle } from '../src/collision.js';
import { ROUTE_VARIANTS, DEFAULT_ROUTE_VARIANT, ROUTE_EVENT_IDS, isRouteVariant, getRouteVariant, getRouteVariantForSeed, supportsRouteVariants, getRouteVariants, resolveRouteVariant } from '../src/route-variants.js';

let checks = 0, sweeps = 0, cuts = 0, maxGrade = 0, minSaving = 1;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const hull = { halfWidth: 1.4, halfLength: 2.6 };
const reports = [];

equal(DEFAULT_ROUTE_VARIANT, 'route_a');
equal(ROUTE_VARIANTS.map(route => route.seed), [1989, 42, 17]);
equal(ROUTE_VARIANTS.map(route => route.label), ['Route A', 'Route B', 'Route C']);
check(Object.isFrozen(ROUTE_VARIANTS), 'catalog cannot be changed by UI state');
for (const route of ROUTE_VARIANTS) {
  check(Object.isFrozen(route), 'catalog entry is immutable');
  check(isRouteVariant(route.id), 'catalog id validates');
  equal(getRouteVariant(route.id), route);
  equal(getRouteVariantForSeed(route.seed), route);
}
for (const invalid of [undefined, null, '', 'Route A', 'route_d', 1989, {}, [], '__proto__']) {
  check(!isRouteVariant(invalid), 'unknown selection is not valid');
  equal(getRouteVariant(invalid), ROUTE_VARIANTS[0], 'unknown saved selection restores the original');
}
for (const seed of [null, undefined, '42', 0, -1, 9999, 42.5, Infinity, NaN, 0x100000000 + 42]) {
  equal(getRouteVariantForSeed(seed), null, 'legacy seed is not mislabeled as a curated route');
}
equal(ROUTE_EVENT_IDS.length, 4);
for (const event of COURSE) {
  const supported = ROUTE_EVENT_IDS.includes(event.id);
  equal(supportsRouteVariants(event), supported);
  equal(supportsRouteVariants(event.id), supported);
  equal(getRouteVariants(event).length, supported ? 3 : 1);
  equal(resolveRouteVariant(event, 'route_c'), ROUTE_VARIANTS[supported ? 2 : 0]);
}
for (const invalid of [null, undefined, 'missing', {}, { id: '__proto__' }]) {
  equal(supportsRouteVariants(invalid), false);
  equal(resolveRouteVariant(invalid, 'route_c'), ROUTE_VARIANTS[0]);
}

function auditLane(course, start, end, offset, label) {
  const steps = Math.ceil((end - start) / 6);
  let previous = course.groundAt(start, offset(start));
  for (let i = 1; i <= steps; i++) {
    const s = start + (end - start) * i / steps;
    const point = course.groundAt(s, offset(s));
    const heading = Math.atan2(point.x - previous.x, point.z - previous.z);
    check(course.surfaceAt(s, offset(s)).road, `${label}: route stays on legal ground`);
    for (const obstacle of course.obstaclesNear(s - 8, s + 8)) {
      check(!sweepObstacle(previous, point, obstacle, heading, hull), `${label}: ${obstacle.id} blocks the driving corridor at ${s}`);
      sweeps++;
    }
    previous = point;
  }
}

function compare(a, b) {
  const first = [], second = [], count = 512;
  let sum = 0, maximum = 0, ax = 0, az = 0, bx = 0, bz = 0;
  for (let i = 0; i < count; i++) {
    const p = a.worldAt(a.length * i / count), q = b.worldAt(b.length * i / count);
    first.push(p); second.push(q); ax += p.x; az += p.z; bx += q.x; bz += q.z;
    const d = distance(p, q); sum += d * d; maximum = Math.max(maximum, d);
  }
  ax /= count; az /= count; bx /= count; bz /= count;
  let dot = 0, cross = 0;
  for (let i = 0; i < count; i++) {
    const px = first[i].x - ax, pz = first[i].z - az, qx = second[i].x - bx, qz = second[i].z - bz;
    dot += px * qx + pz * qz; cross += px * qz - pz * qx;
  }
  const angle = Math.atan2(cross, dot), c = Math.cos(angle), sn = Math.sin(angle);
  let aligned = 0;
  for (let i = 0; i < count; i++) {
    const px = first[i].x - ax, pz = first[i].z - az, qx = second[i].x - bx, qz = second[i].z - bz;
    aligned += (px * c - pz * sn - qx) ** 2 + (px * sn + pz * c - qz) ** 2;
  }
  return { rms: Math.sqrt(sum / count), maximum, alignedRms: Math.sqrt(aligned / count) };
}

for (const definition of COURSE.filter(supportsRouteVariants)) {
  const courses = ROUTE_VARIANTS.map(route => new Course(definition, route.seed));
  const report = { event: definition.id, pairs: [], variants: [] };
  for (let a = 0; a < courses.length; a++) for (let b = a + 1; b < courses.length; b++) {
    const delta = compare(courses[a], courses[b]);
    check(delta.rms > 15 && delta.maximum > 25, `${definition.id}: variants must change actual centerline positions substantially (RMS ${delta.rms}, max ${delta.maximum})`);
    check(delta.alignedRms > 7, `${definition.id}: variants must change shape, not only rotation/translation (${delta.alignedRms})`);
    report.pairs.push({ routes: `${ROUTE_VARIANTS[a].label}/${ROUTE_VARIANTS[b].label}`, ...Object.fromEntries(Object.entries(delta).map(([key, value]) => [key, +value.toFixed(2)])) });
  }
  for (const course of courses) {
    const label = `${definition.id}/${getRouteVariantForSeed(course.seed).label}`;
    equal(course.raceLength, course.length * 2, `${label}: exactly two laps`);
    equal(course.sections.map(({ theme, name, share }) => ({ theme, name, share })), definition.sections, `${label}: environments stay intact`);
    check(course.features.shortcuts.length >= 1 && course.features.shortcuts.length <= 2, `${label}: useful shortcut choices`);
    check(course.features.lapGates.every((gate, index, gates) => gate.s > 0 && gate.s < course.length && (!index || gate.s > gates[index - 1].s)), `${label}: ordered legal lap gates`);
    let eventGrade = 0;
    for (let s = 0; s < course.length; s += 4) {
      const p = definition.offroad ? course.groundAt(s) : course.worldAt(s), q = definition.offroad ? course.groundAt(s + 4) : course.worldAt(s + 4);
      const grade = Math.abs(q.y - p.y) / Math.hypot(q.x - p.x, q.z - p.z);
      eventGrade = Math.max(eventGrade, grade);
      check(Number.isFinite(grade) && grade < .18, `${label}: main route grade remains drivable`);
      check(distance(p, definition.offroad ? course.groundAt(s + course.length) : course.worldAt(s + course.length)) < 1e-7, `${label}: second lap repeats continuously`);
    }
    for (const lane of [-1, 0, 1]) auditLane(course, 0, course.length, s => lane * (course.roadHalfWidthAt(s) - 1.65), label);
    for (const cut of course.features.shortcuts) {
      let mainMeters = 0, branchMeters = 0, previousMain, previousBranch;
      const steps = Math.ceil(cut.end - cut.start);
      for (let i = 0; i <= steps; i++) {
        const s = cut.start + (cut.end - cut.start) * i / steps, offset = course.shortcutOffset(cut, s);
        const main = definition.offroad ? course.groundAt(s) : course.worldAt(s), branch = course.groundAt(s, offset);
        check(Number.isFinite(offset) && Math.abs(offset) <= 112, `${label}: branch stays within audited terrain`);
        check(course.surfaceAt(s, offset).road, `${label}: branch surface is legal`);
        check(1 - course.at(s).curvature * offset - Math.abs(course.at(s).curvature) * (cut.halfWidth + hull.halfWidth) > .299, `${label}: branch projection cannot fold`);
        if (i) {
          mainMeters += distance(main, previousMain); branchMeters += distance(branch, previousBranch);
          const grade = Math.abs(branch.y - previousBranch.y) / Math.hypot(branch.x - previousBranch.x, branch.z - previousBranch.z);
          check(Number.isFinite(grade) && grade < .22, `${label}: shortcut grade remains drivable (${grade})`);
          eventGrade = Math.max(eventGrade, grade);
        }
        previousMain = main; previousBranch = branch;
      }
      const saving = 1 - branchMeters / mainMeters;
      check(saving >= .03, `${label}: shortcut actually saves distance`); minSaving = Math.min(minSaving, saving);
      for (const s of [cut.start, cut.end]) {
        check(Math.abs(course.shortcutOffset(cut, s)) < 1e-8, `${label}: joined shortcut endpoint`);
        const adjacent = s === cut.start ? s + .01 : s - .01;
        check(Math.abs(course.shortcutOffset(cut, adjacent) / .01) < .001, `${label}: smooth shortcut entry tangent`);
      }
      for (const gate of course.features.lapGates) check(gate.s < cut.start - 16 || gate.s > cut.end + 16, `${label}: shortcut cannot skip a gate`);
      for (const tunnel of course.features.tunnels) check(cut.end <= tunnel.start - 42 || cut.start >= tunnel.end + 42, `${label}: shortcut cannot cross a tunnel`);
      const middle = (cut.start + cut.end) / 2, offset = course.shortcutOffset(cut, middle);
      equal(course.surfaceAt(middle, offset).mainRoad, cut.surface === 'paved', `${label}: surface matches branch material`);
      if (definition.offroad) equal(cut.surface, 'gravel');
      for (const lane of [-2.8, 0, 2.8]) auditLane(course, cut.start, cut.end, s => course.shortcutOffset(cut, s) + lane, label);
      cuts++;
    }
    maxGrade = Math.max(maxGrade, eventGrade);
    report.variants.push({ label: getRouteVariantForSeed(course.seed).label, branches: course.features.shortcuts.length, steepestGrade: +(eventGrade * 100).toFixed(2) });
  }
  reports.push(report);
}

// These events have a deliberate fixed oval/city loop. Verify why the UI must
// not promise alternate routes merely because their scenery can be reseeded.
for (const definition of COURSE.filter(event => !supportsRouteVariants(event))) {
  const baseline = new Course(definition, ROUTE_VARIANTS[0].seed);
  for (const route of ROUTE_VARIANTS.slice(1)) {
    const alternate = new Course(definition, route.seed), delta = compare(baseline, alternate);
    check(delta.maximum < 1e-8, `${definition.id}: selector is disabled for a fixed centerline`);
  }
}
console.log(JSON.stringify(reports, null, 2));
console.log(`Route variants: ${checks} checks, ${sweeps} clear Titan-width sweeps, four events × three distinct layouts, ${cuts} useful branches. Steepest ground ${(maxGrade * 100).toFixed(2)}%; minimum shortcut distance saving ${(minSaving * 100).toFixed(2)}%.`);
