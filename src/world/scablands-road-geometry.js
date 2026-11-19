// How a road is laid out from its nodes (SCABLANDS-LAND round 4, slice 2a). Pure geometry: points in, a curved road out, with
// nothing assumed about the land. A road is a list of nodes ({x, z}); each node between the two ends is a corner that is rounded
// with an arc of a given radius, so that a car at the road's top speed can hold it. A node marked `through` is a point the road
// must pass exactly (the halfway camp, a crossing): the road's arc is moved outward until its middle stands on that point.
const DEFAULT_RADIUS = 700;
const ARC_STEP = 1.5 * Math.PI / 180;

const unit = (a, b) => { const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz) || 1; return {x: dx / length, z: dz / length}; };

// The corner at `cur` between the straight legs from `prev` and to `next`: where the arc starts and ends, its centre and sweep.
function cornerOf(prev, cur, next, radius) {
  const d1 = unit(prev, cur), d2 = unit(cur, next);
  const cross = d1.x * d2.z - d1.z * d2.x, dot = d1.x * d2.x + d1.z * d2.z, turn = Math.atan2(Math.abs(cross), dot);
  return {d1, d2, turn, side: Math.sign(cross) || 1, radius};
}

// Where a node must stand so that the arc rounding it passes through `through`: the corner's vertex lies outside the arc by
// radius * (1 / cos(turn / 2) - 1), straight out along the bisector. Found by a few rounds of the fixed point.
export function throughVertex(prev, through, next, radius = DEFAULT_RADIUS) {
  let vertex = {x: through.x, z: through.z};
  for (let round = 0; round < 40; round++) {
    const corner = cornerOf(prev, vertex, next, radius);
    if (corner.turn < 1e-6) return vertex;
    const inward = unit({x: 0, z: 0}, {x: corner.d2.x - corner.d1.x, z: corner.d2.z - corner.d1.z});
    const gap = radius * (1 / Math.cos(corner.turn / 2) - 1);
    vertex = {x: through.x - inward.x * gap, z: through.z - inward.z * gap};
  }
  return vertex;
}

// Lays out a road. `nodes` is [{x, z, radius?, through?}]. Returns {points, length, minRadius, corners} where `points` is the
// road's centre line as a polyline with every arc sampled (about every 1.5 degrees).
export function layOutRoad(nodes, {radius = DEFAULT_RADIUS} = {}) {
  const vertices = nodes.map(node => ({x: node.x, z: node.z}));
  for (let i = 1; i + 1 < nodes.length; i++)
    if (nodes[i].through) vertices[i] = throughVertex(vertices[i - 1], nodes[i], vertices[i + 1], nodes[i].radius ?? radius);
  // The tangent length each corner takes from each leg; a corner never takes more than half of a leg it shares.
  const corners = [];
  for (let i = 1; i + 1 < nodes.length; i++) {
    const wanted = nodes[i].radius ?? radius, corner = cornerOf(vertices[i - 1], vertices[i], vertices[i + 1], wanted);
    if (corner.turn < 1e-6) { corners.push({...corner, index: i, tangent: 0, radius: Infinity}); continue; }
    const tan = Math.tan(corner.turn / 2);
    const before = Math.hypot(vertices[i].x - vertices[i - 1].x, vertices[i].z - vertices[i - 1].z) * (i === 1 ? 1 : .5);
    const after = Math.hypot(vertices[i + 1].x - vertices[i].x, vertices[i + 1].z - vertices[i].z) * (i + 2 === nodes.length ? 1 : .5);
    const used = nodes[i].through ? wanted : Math.min(wanted, before / tan, after / tan);
    corners.push({...corner, index: i, tangent: used * tan, radius: used});
  }
  const points = [{x: vertices[0].x, z: vertices[0].z}];
  for (const corner of corners) {
    const vertex = vertices[corner.index];
    if (corner.tangent === 0) { points.push({x: vertex.x, z: vertex.z}); continue; }
    const start = {x: vertex.x - corner.d1.x * corner.tangent, z: vertex.z - corner.d1.z * corner.tangent};
    // The centre lies to the side the road turns toward, a radius from the start, at right angles to the road.
    const normal = {x: -corner.d1.z * corner.side, z: corner.d1.x * corner.side};
    // (side is +1 when the turn is toward +z from +x in this frame; the normal is chosen so that it points at the centre.)
    const centre = {x: start.x + normal.x * corner.radius, z: start.z + normal.z * corner.radius};
    const first = Math.atan2(start.z - centre.z, start.x - centre.x), steps = Math.max(2, Math.ceil(corner.turn / ARC_STEP));
    for (let step = 0; step <= steps; step++) {
      const angle = first + corner.side * corner.turn * step / steps;
      points.push({x: centre.x + Math.cos(angle) * corner.radius, z: centre.z + Math.sin(angle) * corner.radius});
    }
    corner.centre = centre;
  }
  const last = vertices.at(-1);
  points.push({x: last.x, z: last.z});
  let length = 0;
  for (let i = 1; i < points.length; i++) length += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  const radii = corners.filter(corner => corner.tangent > 0).map(corner => corner.radius);
  return {points, length, minRadius: radii.length ? Math.min(...radii) : Infinity, corners, vertices};
}

// The point `metres` along a laid-out road (clamped to its ends), with the road's heading there (x east, z south).
export function pointAlong(points, metres) {
  let left = Math.max(0, metres);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    if (left <= length || i === points.length - 1) {
      const t = length > 0 ? Math.min(1, left / length) : 0;
      return {x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, heading: Math.atan2(b.x - a.x, b.z - a.z)};
    }
    left -= length;
  }
  return {x: points[0].x, z: points[0].z, heading: 0};
}

// Resamples a road at an even spacing (about `step` metres): [{x, z, heading, along}].
export function resampleRoad(points, step) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  const count = Math.max(1, Math.round(total / step)), out = [];
  for (let i = 0; i <= count; i++) { const along = total * i / count; out.push({...pointAlong(points, along), along}); }
  return out;
}

// A point `metres` from a toward b, and a point `metres` beyond b on the way from a through b.
export const toward = (a, b, metres) => { const d = unit(a, b); return {x: a.x + d.x * metres, z: a.z + d.z * metres}; };
export const beyond = (a, b, metres) => { const d = unit(a, b); return {x: b.x + d.x * metres, z: b.z + d.z * metres}; };
