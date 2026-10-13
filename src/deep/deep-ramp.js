// Uninstalled Pacific ramp geometry. DEEP-ZONE owns gated journey/scene wiring.
import { SEA_LEVEL, shoreOffset } from '../coastal-water.js';
import { buildPacificRockLayout, offshoreClearance } from '../pacific-coast.js';
import { sweepObstacle } from '../collision.js';

const LENGTH = 120, WIDTH = 6, TARGET = SEA_LEVEL - 8;
const STEP = 1, REACH = 200, ANGLE_STEP = Math.PI / 18, MAX_ANGLE = Math.PI / 3;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

function ground(course, x, z) {
  const nearest = course.nearest(x, z), support = course.groundAt(nearest.s, nearest.lateral);
  if (![x, support.y, z, nearest.s, nearest.lateral].every(Number.isFinite)) return null;
  return { x, y: support.y, z, coastDistance: nearest.s, lateral: nearest.lateral };
}
function crossing(pointAt, from, to, height) {
  for (let i = 0; i < 28; i++) {
    const middle = (from + to) / 2, point = pointAt(middle);
    if (!point) return null;
    if (point.y > height) from = middle; else to = middle;
  }
  const horizontal = (from + to) / 2, point = pointAt(horizontal);
  return point && { ...point, y: height, horizontal };
}
function profile(course, atDistance, angle) {
  const frame = course.worldAt(atDistance, course.roadHalfWidthAt(atDistance) + 4.5);
  const heading = frame.heading + Math.PI / 2 - angle;
  const dx = Math.sin(heading), dz = Math.cos(heading);
  const pointAt = horizontal => ground(course, frame.x + dx * horizontal, frame.z + dz * horizontal);
  const start = pointAt(0);
  if (!start || start.y <= SEA_LEVEL) return null;
  const points = [{ ...start, horizontal: 0, progress: 0 }];
  let shoreline = null;
  const add = point => {
    const previous = points.at(-1);
    point.progress = previous.progress + distance(previous, point);
    points.push(point);
  };
  for (let horizontal = STEP; horizontal <= REACH; horizontal += STEP) {
    const point = pointAt(horizontal), previous = points.at(-1);
    if (!point || course.sectionAt(point.coastDistance).theme !== 'coast') return null;
    if (shoreline && point.y > SEA_LEVEL) return null; // No dry headland after entering water.
    if (!shoreline && point.y <= SEA_LEVEL) {
      shoreline = crossing(pointAt, previous.horizontal, horizontal, SEA_LEVEL);
      if (!shoreline) return null;
      add(shoreline);
    }
    if (point.y <= TARGET) {
      const end = crossing(pointAt, points.at(-1).horizontal, horizontal, TARGET);
      if (!end || !shoreline) return null;
      add(end);
      return { points, shoreline, heading, length: end.progress, pointAt };
    }
    add({ ...point, horizontal });
  }
  return null;
}
function fit(course, atDistance) {
  let previous = null, previousAngle = 0;
  for (let angle = 0; angle <= MAX_ANGLE + 1e-12; angle += ANGLE_STEP) {
    const current = profile(course, atDistance, angle);
    if (current && Math.abs(current.length - LENGTH) < 1e-7) return current;
    if (current && previous && (current.length - LENGTH) * (previous.length - LENGTH) < 0) {
      let low = previousAngle, high = angle, lowLength = previous.length;
      let fitted = current;
      for (let i = 0; i < 36; i++) {
        const middle = (low + high) / 2;
        fitted = profile(course, atDistance, middle);
        if (!fitted) return null;
        if ((fitted.length - LENGTH) * (lowLength - LENGTH) > 0) {
          low = middle; lowLength = fitted.length;
        } else high = middle;
      }
      return Math.abs(fitted.length - LENGTH) < 1e-6 ? fitted : null;
    }
    previous = current; previousAngle = angle;
  }
  return null;
}
function rectangle(course, center, heading, halfWidth, halfLength) {
  const corners = [];
  for (const [side, along] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const point = ground(course,
      center.x + Math.cos(heading) * halfWidth * side + Math.sin(heading) * halfLength * along,
      center.z - Math.sin(heading) * halfWidth * side + Math.cos(heading) * halfLength * along);
    if (!point) return null;
    corners.push(point);
  }
  return { center: { ...center }, heading, halfWidth, halfLength, corners };
}
function clearStrip(course, ramp) {
  const edges = [];
  for (let offset = -WIDTH / 2; offset <= WIDTH / 2; offset += STEP) {
    let shore = null, previous = null;
    const pointAt = horizontal => {
      const center = ramp.pointAt(horizontal);
      return center && ground(course, center.x + Math.cos(ramp.heading) * offset,
        center.z - Math.sin(ramp.heading) * offset);
    };
    for (const center of ramp.points) {
      const point = pointAt(center.horizontal);
      if (!point || course.sectionAt(point.coastDistance).theme !== 'coast') return null;
      // The one-metre guard encloses the intervals between terrain samples.
      const nearest = course.nearest(point.x, point.z);
      const roadWidth = Math.max(...[-8, 0, 8].map(delta => course.roadHalfWidthAt(nearest.s + delta)));
      if (nearest.distance <= roadWidth + 1 || course.surfaceAt(nearest.s, nearest.lateral).road) return null;
      if (shore && point.y > SEA_LEVEL) return null;
      if (!shore && point.y <= SEA_LEVEL) {
        if (!previous) return null;
        shore = crossing(pointAt, previous.horizontal, center.horizontal, SEA_LEVEL);
        if (!shore) return null;
        // The crossing's progress is on the actual centerline, not course distance.
        const t = (shore.horizontal - previous.horizontal) / (center.horizontal - previous.horizontal);
        shore.progress = previous.progress + (center.progress - previous.progress) * t;
      }
      previous = { ...center, y: point.y };
    }
    if (!shore) return null;
    if (Math.abs(offset) === WIDTH / 2) edges.push({ ...shore, offset });
  }
  return edges;
}
function blocked(first, last, obstacles, heading, halfLength = 0) {
  // Measured modelMinY/modelMaxY are retained explicitly. Omitting
  // vertical vehicle dimensions deliberately excludes the whole horizontal bound.
  return obstacles.some(obstacle => sweepObstacle({ x: first.x, z: first.z },
    { x: last.x, z: last.z }, obstacle, heading, { halfWidth: WIDTH / 2, halfLength }));
}
function freeze(value) {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return Object.freeze(value);
}

export function buildDeepRamp(course, options = {}) {
  if (course?.def?.id !== 'pacific-canyon') return null;
  const findShore = options.shoreOffset ?? shoreOffset;
  const buildRocks = options.buildPacificRockLayout ?? buildPacificRockLayout;
  const clearOffshore = options.offshoreClearance ?? offshoreClearance;
  const obstacles = options.obstacles ?? course.features.obstacles;
  const stacks = buildRocks(course);
  // A bounding rectangle is conservative even when a runtime contact uses an
  // ellipse. Copy the two non-enumerable measured fields explicitly.
  const bounds = [...obstacles, ...stacks].map(obstacle => ({ ...obstacle, shape: 'box',
    modelMinY: obstacle.modelMinY, modelMaxY: obstacle.modelMaxY }));
  for (const section of course.sections.filter(section => section.theme === 'coast')) {
    for (let atDistance = section.start; atDistance < section.end; atDistance += course.step) {
      if (findShore(course, atDistance) === null) continue;
      const ramp = fit(course, atDistance);
      if (!ramp) continue;
      const first = ramp.points[0], last = ramp.points.at(-1);
      if (blocked(first, last, bounds, ramp.heading)) continue;
      const shoreOffsetAtCrossing = findShore(course, ramp.shoreline.coastDistance);
      if (shoreOffsetAtCrossing === null || Math.abs(shoreOffsetAtCrossing - ramp.shoreline.lateral) > .01) continue;
      const edges = clearStrip(course, ramp);
      if (!edges) continue;
      const cove = rectangle(course, last, ramp.heading, WIDTH / 2, 6);
      if (!cove || blocked(last, last, bounds, ramp.heading, 6)
          || !clearOffshore(course, last.x, last.z, Math.hypot(WIDTH / 2, 6))
          || cove.corners.some(point => point.y >= SEA_LEVEL)) continue;
      const horizontal = last.horizontal;
      const center = ramp.pointAt(horizontal / 2);
      const footprint = center && rectangle(course, center, ramp.heading, WIDTH / 2, horizontal / 2);
      if (!footprint) continue;
      return freeze({ courseId: course.def.id, atDistance, side: 'left', width: WIDTH,
        length: ramp.length, endDepth: SEA_LEVEL - last.y, heading: ramp.heading,
        points: ramp.points, footprint, cove, shoreline: { center: ramp.shoreline, edges },
        clearance: { claim: 'generated obstacle bounds and sea-stack footprints',
          obstacles: obstacles.length, seaStacks: stacks.length } });
    }
  }
  return null;
}
