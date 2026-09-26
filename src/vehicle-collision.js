// Car-to-car impacts as two-dimensional rigid bodies (docs/CRASH_PHYSICS.md).
// Pure functions: no course, clock, renderer or random source. World frame is
// x/z; a heading φ points along (sin φ, cos φ), and a positive spin rate
// increases φ. Speeds are metres per second unless a name says mph.

export const CRASH_TUNING = Object.freeze({
  restitution: .2,          // car crashes are mostly crumple
  friction: .45,            // tangential impulse limit, as a share of the normal impulse
  mphToMps: .44704,
  // Change in velocity (mph) of one car that marks each severity.
  nudgeMph: 6, smashMph: 25, launchMph: 45,
  // Heavier-than-target share needed before a hit launches the target.
  launchMassRatio: .8,
  playerCrashDvMph: 22,     // Rival Duel: the player's own Δv that means a crash
  armoredPlayerKnockDvMph: 70, // Wasteland armor keeps control below a major hit
});

const cross = (r, v) => r.z * v.x - r.x * v.z;

export function yawInertia(mass, halfLength, halfWidth) {
  return mass * ((2 * halfLength) ** 2 + (2 * halfWidth) ** 2) / 12;
}

// Corners of a box for contact search.
function corners(body) {
  const f = {x: Math.sin(body.heading), z: Math.cos(body.heading)};
  const s = {x: Math.cos(body.heading), z: -Math.sin(body.heading)};
  const out = [];
  for (const along of [-1, 1]) for (const side of [-1, 1]) out.push({
    x: body.x + f.x * body.halfLength * along + s.x * body.halfWidth * side,
    z: body.z + f.z * body.halfLength * along + s.z * body.halfWidth * side});
  return out;
}

function axes(body) {
  return [{x: Math.sin(body.heading), z: Math.cos(body.heading), owner: body},
    {x: Math.cos(body.heading), z: -Math.sin(body.heading), owner: body}];
}

function radius(body, u) {
  const f = {x: Math.sin(body.heading), z: Math.cos(body.heading)};
  const s = {x: Math.cos(body.heading), z: -Math.sin(body.heading)};
  return body.halfLength * Math.abs(f.x * u.x + f.z * u.z) + body.halfWidth * Math.abs(s.x * u.x + s.z * u.z);
}

// Separating-axis contact between two oriented boxes. Always returns the axis
// of least overlap (even when just apart, as a swept hit may report), with the
// normal pointing from B toward A and a contact point on the struck face.
export function boxContact(a, b) {
  const d = {x: a.x - b.x, z: a.z - b.z};
  let best = null;
  for (const u of [...axes(a), ...axes(b)]) {
    const distance = d.x * u.x + d.z * u.z;
    const overlap = radius(a, u) + radius(b, u) - Math.abs(distance);
    if (!best || overlap < best.overlap) best = {overlap, u, sign: Math.sign(distance) || 1};
  }
  const n = {x: best.u.x * best.sign, z: best.u.z * best.sign};
  // The incident box's corner deepest along the normal is the contact point.
  const incident = best.u.owner === a ? b : a;
  const direction = incident === a ? -1 : 1;
  const points = corners(incident).map(p => ({p, depth: direction * (p.x * n.x + p.z * n.z)}));
  points.sort((left, right) => right.depth - left.depth);
  const [first, second] = points;
  const point = second.depth > first.depth - .15
    ? {x: (first.p.x + second.p.x) / 2, z: (first.p.z + second.p.z) / 2} : first.p;
  return {normal: n, point, overlap: best.overlap};
}

// Solve one impact. Bodies: {mass, inertia, x, z, vx, vz, spin, heading,
// halfLength, halfWidth}. Returns new velocities and spins, and each car's
// change in velocity in mph.
export function solveVehicleImpact(a, b, contact = boxContact(a, b)) {
  const T = CRASH_TUNING, n = contact.normal, p = contact.point;
  const ra = {x: p.x - a.x, z: p.z - a.z}, rb = {x: p.x - b.x, z: p.z - b.z};
  const pointVelocity = (body, r) => ({x: body.vx + body.spin * r.z, z: body.vz - body.spin * r.x});
  const va = pointVelocity(a, ra), vb = pointVelocity(b, rb);
  const rel = {x: va.x - vb.x, z: va.z - vb.z};
  const closing = rel.x * n.x + rel.z * n.z;
  const result = {
    a: {vx: a.vx, vz: a.vz, spin: a.spin}, b: {vx: b.vx, vz: b.vz, spin: b.spin},
    closingMps: Math.max(0, -closing), normal: n, point: p,
  };
  if (closing >= 0) return finish(result, a, b);
  const inverse = u => 1 / a.mass + 1 / b.mass + cross(ra, u) ** 2 / a.inertia + cross(rb, u) ** 2 / b.inertia;
  const j = -(1 + T.restitution) * closing / inverse(n);
  const apply = (impulse) => {
    result.a.vx += impulse.x / a.mass; result.a.vz += impulse.z / a.mass;
    result.a.spin += cross(ra, impulse) / a.inertia;
    result.b.vx -= impulse.x / b.mass; result.b.vz -= impulse.z / b.mass;
    result.b.spin -= cross(rb, impulse) / b.inertia;
  };
  apply({x: n.x * j, z: n.z * j});
  // Friction along the contact face, from the sliding velocity after the push.
  const va2 = {x: result.a.vx + result.a.spin * ra.z, z: result.a.vz - result.a.spin * ra.x};
  const vb2 = {x: result.b.vx + result.b.spin * rb.z, z: result.b.vz - result.b.spin * rb.x};
  const slide = {x: va2.x - vb2.x, z: va2.z - vb2.z};
  const along = slide.x * n.x + slide.z * n.z;
  const tangent = {x: slide.x - n.x * along, z: slide.z - n.z * along};
  const length = Math.hypot(tangent.x, tangent.z);
  if (length > 1e-6) {
    const t = {x: tangent.x / length, z: tangent.z / length};
    const jt = Math.max(-T.friction * j, Math.min(T.friction * j, -length / inverse(t)));
    apply({x: t.x * jt, z: t.z * jt});
  }
  return finish(result, a, b);
}

function finish(result, a, b) {
  const mph = CRASH_TUNING.mphToMps;
  result.a.dvMph = Math.hypot(result.a.vx - a.vx, result.a.vz - a.vz) / mph;
  result.b.dvMph = Math.hypot(result.b.vx - b.vx, result.b.vz - b.vz) / mph;
  return result;
}

// What a change in velocity does to a car (docs/CRASH_PHYSICS.md section 2).
export function impactSeverity(dvMph, {attackerMass = 1450, mass = 1450} = {}) {
  const T = CRASH_TUNING;
  if (dvMph < T.nudgeMph) return 'nudge';
  if (dvMph < T.smashMph) return 'knocked';
  if (dvMph >= T.launchMph && attackerMass >= mass * T.launchMassRatio) return 'launched';
  return 'smashed';
}
