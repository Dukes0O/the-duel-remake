// Basins: ground sunk beside the road to hold water (`basins` on a circuit's
// definition). Pure arithmetic shared by the course (which sinks the ground) and
// the scenery layout (which keeps pieces out of the water).
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };

// How far inside a basin a place is: 0 outside, 1 on its floor. `p` is the
// distance along the lap, `off` the lateral offset (left positive); side -1 is the right of the road.
export function basinWeight(basin, p, off) {
  const across = basin.side < 0 ? -off : off;
  if (across <= 0) return 0;
  const fade = basin.fade ?? 30, edge = basin.edge ?? 6;
  return smooth((p - basin.s0) / fade) * smooth((basin.s1 - p) / fade) * smooth((across - basin.from) / edge) * smooth((basin.to - across) / edge);
}
