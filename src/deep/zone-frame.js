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
const RAMP = 4;          // metres either side of a joint over which the direction turns
const SCAN = 5;          // metres either side of the trail's nearest point searched for the answer
const SCAN_STEPS = 16;

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

  function segmentAt(distance) {
    let lo = 0, hi = n - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= distance) lo = mid; else hi = mid - 1; }
    return lo;
  }
  // The direction the car's "forward" points at distance s (heading, +z is 0).
  function heading(s) {
    const d = ((s % length) + length) % length, i = segmentAt(d), u = d - starts[i];
    const into = half(i), next = (i + 1) % n, out = half(next);
    if (u < into) {
      const before = angles[(i + n - 1) % n];
      return before + wrap(angles[i] - before) * smooth((u + into) / (2 * into));
    }
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
  function nearest(x, z, reference) {
    const sample = floor.sample(x, z);
    if (!sample) return null;
    let s0 = sample.along;
    if (Number.isFinite(reference)) s0 += Math.round((reference - s0) / length) * length;
    // The answer lies in a short stretch around the trail's nearest point: find
    // every place it changes sign, refine each, and keep the one nearest the car.
    const step = SCAN / SCAN_STEPS * 2;
    let best = null, lo = s0 - SCAN, flo = along(x, z, lo);
    const keep = s => {
      const miss = Math.abs(s - (Number.isFinite(reference) ? reference : s0));
      if (!best || miss < best.miss) best = { s, miss };
    };
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
    const s = best ? best.s : s0, c = centre(s), h = heading(s);
    return { s, lateral: (x - c.x) * Math.cos(h) - (z - c.z) * Math.sin(h), distance: sample.distance, heading: h, x: c.x, z: c.z };
  }
  return { length, heading, centre, worldAt, nearest };
}
