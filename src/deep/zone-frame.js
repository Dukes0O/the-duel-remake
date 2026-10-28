// DEEP-TRAIL-JOINTS: the frame the car drives in on a Deep sea floor.
//
// The car's place is two numbers: distance along the trail (s) and distance
// across it (lateral, positive to the left). The trail is a chain of straight
// segments. With the plain segment frame, a point 40 m to the side of the trail
// jumps by 40 m times the bend angle the moment s crosses a joint, because the
// "sideways" direction turns all at once. Here the direction turns smoothly
// instead, over a few metres either side of each joint, so the world position of
// (s, lateral) has no jump anywhere. The trail line itself is unchanged, so the
// ground, the places and the goals (all laid out from the trail) do not move.
//
// `nearest` is the exact opposite of `worldAt`: it gives back the (s, lateral)
// that lands on a world point, choosing the answer closest to the car's last s.
// Pure numbers, no graphics, no randomness.
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const smooth = t => t * t * (3 - 2 * t);
const RAMP = 2;          // metres either side of a joint over which the direction turns
const SCAN = 10;         // metres either side of the trail's nearest point searched for the answer
const SCAN_STEPS = 80;
const FOLLOW = 2;        // metres the car's s may move in one step on the branch it was already on

export function createZoneFrame(floor, trail) {
  const n = trail.length, length = floor.length;
  const starts = [], lens = [], angles = [];
  let at = 0;
  for (let i = 0; i < n; i++) {
    const a = trail[i], b = trail[(i + 1) % n], len = Math.hypot(b.x - a.x, b.z - a.z);
    starts.push(at); lens.push(len); angles.push(Math.atan2(b.x - a.x, b.z - a.z)); at += len;
  }
  // Half-length of the turn at the joint that starts segment i.
  const half = i => Math.min(RAMP, lens[(i + n - 1) % n] / 2, lens[i] / 2);
  // The trail starts at the foot of the ramp, and the car is put there facing
  // along the first segment. So the turn at the start joint lies wholly before
  // it: at s = 0 the direction is already the first segment's. Length of that turn.
  const lead = Math.min(2 * RAMP, lens[n - 1] - half(n - 1));

  function segmentAt(distance) {
    let lo = 0, hi = n - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= distance) lo = mid; else hi = mid - 1; }
    return lo;
  }
  // The direction the car's "forward" points at distance s (heading, +z is 0).
  function heading(s) {
    const d = ((s % length) + length) % length, i = segmentAt(d), u = d - starts[i];
    const next = (i + 1) % n;
    if (i > 0 && u < half(i)) {
      const into = half(i), before = angles[i - 1];
      return before + wrap(angles[i] - before) * smooth((u + into) / (2 * into));
    }
    if (next === 0) {
      if (u > lens[i] - lead) return angles[i] + wrap(angles[0] - angles[i]) * smooth((u - lens[i] + lead) / lead);
      return angles[i];
    }
    const out = half(next);
    if (u > lens[i] - out) return angles[i] + wrap(angles[next] - angles[i]) * smooth((u - lens[i] + out) / (2 * out));
    return angles[i];
  }
  const centre = s => floor.frameAt(s);
  function worldAt(s, lateral = 0) {
    const c = centre(s), h = heading(s);
    return { x: c.x + Math.cos(h) * lateral, z: c.z - Math.sin(h) * lateral };
  }
  // How far the point lies along the direction at s, from the trail point at s.
  // It is zero where s is the answer.
  const along = (x, z, s) => {
    const c = centre(s), h = heading(s);
    return (x - c.x) * Math.sin(h) + (z - c.z) * Math.cos(h);
  };
  // Slide from a first guess to the nearest place where `along` is zero.
  function slide(x, z, from) {
    let s = from;
    for (let i = 0; i < 20; i++) {
      const f = along(x, z, s);
      if (Math.abs(f) < 1e-9) return s;
      const slope = (along(x, z, s + 1e-3) - along(x, z, s - 1e-3)) / 2e-3;
      if (!(Math.abs(slope) > 1e-3)) return null;
      s -= f / slope;
    }
    return Math.abs(along(x, z, s)) < 1e-7 ? s : null;
  }
  function nearest(x, z, reference) {
    const sample = floor.sample(x, z);
    if (!sample) return null;
    const known = Number.isFinite(reference);
    let s0 = sample.along;
    if (known) s0 += Math.round((reference - s0) / length) * length;
    let s = null;
    // Stay on the branch the car was already on: from its last s, the answer
    // is a short slide away.
    if (known && Math.abs(reference - s0) <= SCAN) {
      const tracked = slide(x, z, reference);
      if (tracked !== null && Math.abs(tracked - reference) <= FOLLOW) s = tracked;
    }
    if (s === null) {
      // Otherwise the answer lies in a short stretch around the trail's nearest
      // point: find every place `along` changes sign, refine each, and keep the
      // one nearest the car's last s (or that point).
      const goal = known ? reference : s0, step = SCAN / SCAN_STEPS * 2;
      let best = null, lo = s0 - SCAN, flo = along(x, z, lo);
      const keep = at => { const miss = Math.abs(at - goal); if (!best || miss < best.miss) best = { s: at, miss }; };
      const close = slide(x, z, s0);
      if (close !== null) keep(close);
      for (let k = 1; k <= SCAN_STEPS; k++) {
        const hi = s0 - SCAN + k * step, fhi = along(x, z, hi);
        if (flo === 0) keep(lo);
        else if (flo * fhi < 0) {
          let a = lo, b = hi, fa = flo;
          for (let i = 0; i < 40; i++) {
            const mid = (a + b) / 2, fm = along(x, z, mid);
            if (fa * fm <= 0) b = mid; else { a = mid; fa = fm; }
          }
          keep((a + b) / 2);
        }
        lo = hi; flo = fhi;
      }
      s = best ? best.s : s0;
    }
    const c = centre(s), h = heading(s);
    return { s, lateral: (x - c.x) * Math.cos(h) - (z - c.z) * Math.sin(h), distance: sample.distance, heading: h, x: c.x, z: c.z };
  }
  return { length, heading, centre, worldAt, nearest };
}
