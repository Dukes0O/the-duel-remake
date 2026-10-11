// A wooded hill beside a road with ski runs cut through it (docs/CIRCUITS.md
// section 5.3). Pure geometry, no graphics: the drawn hill (circuit-effects.js)
// and the circuit's own tree placements both read these two functions, so a
// tree never stands on a ski run.
//
// A hill is { s, lateral, along, across, height, runs }. It is an oval of
// `along` metres each way along the road and `across` metres each way across
// it, `height` metres tall at the middle. Each run is { from: [du, dv], to:
// [du, dv], width } with du and dv in metres from the hill's middle, along and
// across the road.
const smooth = x => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };

// Where a point is on the hill: metres from its middle along and across the road.
export const hillLocal = (hill, s, lateral) => [s - hill.s, lateral - hill.lateral];

// Share (0 to 1) of the way out to the oval's edge.
export function hillReach(hill, du, dv) {
  return Math.hypot(du / hill.along, dv / hill.across);
}

// Height in metres above the ground at a point: a smooth dome with a gentle
// unevenness so the slope does not look turned on a lathe.
export function hillHeight(hill, du, dv) {
  const reach = hillReach(hill, du, dv);
  if (reach >= 1) return 0;
  const dome = .5 * (1 + Math.cos(Math.PI * reach));
  const uneven = 1 + .07 * Math.sin(du * .043 + dv * .021) + .05 * Math.sin(dv * .067 - du * .031);
  return hill.height * dome * dome * Math.min(1.1, uneven);
}

// How much of a ski run covers a point: 1 on the run, 0 in the trees, soft edge.
export function runWeight(hill, du, dv) {
  let best = 0;
  for (const run of hill.runs ?? []) {
    const [ax, ay] = run.from, [bx, by] = run.to;
    const ex = bx - ax, ey = by - ay, length2 = ex * ex + ey * ey || 1;
    const t = Math.max(0, Math.min(1, ((du - ax) * ex + (dv - ay) * ey) / length2));
    const distance = Math.hypot(du - (ax + t * ex), dv - (ay + t * ey));
    best = Math.max(best, 1 - smooth((distance - run.width / 2 + 1.5) / 3));
  }
  return best;
}
