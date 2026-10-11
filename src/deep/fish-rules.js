// The rules a school of fish follows, with no graphics. The fish school reads
// these; the tests check them in Node. Nothing here changes race state: the
// car's position is only ever read.

export const FISH_HARD_CAP = 800;

// Limits for a school and for a whole scene. Asking for more gets the cap.
export function cappedFishCount(requested, cap = FISH_HARD_CAP) {
  if (!Number.isFinite(requested) || requested <= 0) return 0;
  return Math.min(Math.floor(requested), Math.min(cap, FISH_HARD_CAP));
}

// Fish part around a point (the car). Every fish inside `outer` metres of the
// point is moved straight away from it so that the empty gap in the middle is
// `inner` metres wide. The mapping is smooth, keeps the order of the fish (a
// fish never jumps past another), and leaves anything outside `outer` alone.
// Height counts for more than width (the car is low and long), so fish slide
// close over the roof and along the sides instead of rising in a high dome.
//
// pos and away are {x,y,z}; the answer is written to `out` and returned.
// `side` is only used if a fish sits exactly on the point: it picks a way out.
export const VERTICAL_WEIGHT = 1.5;
export function partOffset(pos, away, inner, outer, out = { x: 0, y: 0, z: 0 }, side = { x: 1, y: 0, z: 0 }) {
  const dx = pos.x - away.x, dy = (pos.y - away.y) * VERTICAL_WEIGHT, dz = pos.z - away.z;
  const d = Math.hypot(dx, dy, dz);
  out.x = out.y = out.z = 0;
  if (!(outer > inner) || d >= outer) return out;
  const nx = d > 1e-6 ? dx / d : side.x, ny = d > 1e-6 ? dy / d : side.y, nz = d > 1e-6 ? dz / d : side.z;
  // Remap the distance range [0, outer] to [inner, outer].
  const moved = inner + (d / outer) * (outer - inner);
  const push = moved - d;
  out.x = nx * push;
  out.y = (ny * push) / VERTICAL_WEIGHT;
  out.z = nz * push;
  return out;
}

// Where the middle of a school is at time t: a slow loop that crosses the
// anchor twice per lap, so the school keeps coming back past the same spot.
// Returns position and heading (radians, 0 = along +z) into `out`.
export function schoolCentre(t, { anchor = { x: 0, y: 4, z: 0 }, reachX = 9, reachZ = 12, lap = 60, lift = 1.6, phase = 0 } = {}, out = { x: 0, y: 0, z: 0, heading: 0 }) {
  const w = (Math.PI * 2) / lap, a = w * t + phase;
  // A figure of eight: x swings once a lap and z twice, so the path crosses its
  // own middle (the anchor) twice a lap.
  out.x = anchor.x + reachX * Math.sin(a);
  out.z = anchor.z + reachZ * Math.sin(2 * a) * 0.5;
  out.y = anchor.y + lift * Math.sin(a * 1.7 + 1.1);
  // Heading from the slope of the path.
  const vx = reachX * Math.cos(a), vz = reachZ * Math.cos(2 * a);
  out.heading = Math.atan2(vx, vz);
  return out;
}

// Each fish keeps its own spot in the school (an egg-shaped cloud, thicker in
// the middle), its own swim speed and its own beat of the tail. Deterministic
// from the random generator handed in (src/rng.js), so a picture is repeatable.
export function schoolShape(count, rng, { length = 4.4, width = 1.9, height = 1.5 } = {}) {
  const n = cappedFishCount(count);
  const offsets = new Float32Array(n * 3), traits = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    // Thicker in the middle: radius bias toward the centre.
    const r = Math.pow(rng.float(), 0.55);
    const theta = rng.float() * Math.PI * 2, u = rng.float() * 2 - 1, s = Math.sqrt(1 - u * u);
    offsets[i * 3] = r * s * Math.cos(theta) * width;
    offsets[i * 3 + 1] = r * u * height;
    offsets[i * 3 + 2] = r * s * Math.sin(theta) * length;
    traits[i * 4] = rng.range(0.85, 1.15);      // size
    traits[i * 4 + 1] = rng.float() * Math.PI * 2; // tail phase
    traits[i * 4 + 2] = rng.range(0.9, 1.1);      // tail speed
    traits[i * 4 + 3] = rng.float() * Math.PI * 2; // wander phase
  }
  return { count: n, offsets, traits };
}
