// A wooded hill beside a road with ski runs cut through it (docs/CIRCUITS.md
// section 5.3). Pure geometry, no graphics: the drawn hill (circuit-effects.js)
// and the circuit's own tree placements both read these two functions, so a
// tree never stands on a ski run.
//
// A hill is { s, lateral, along, across, height, runs, pads }. It is an oval of
// `along` metres each way along the road and `across` metres each way across
// it, `height` metres tall at the middle. Each run is { from: [du, dv], to:
// [du, dv], width } with du and dv in metres from the hill's middle, along and
// across the road. Each pad is { du, dv, radius, blend }: a level terrace at
// that point (for a building), `radius` metres across, easing into the slope
// over `blend` more metres.
const smooth = x => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };

// Where a point is on the hill: metres from its middle along and across the road.
export const hillLocal = (hill, s, lateral) => [s - hill.s, lateral - hill.lateral];

// Share (0 to 1) of the way out to the oval's edge.
export function hillReach(hill, du, dv) {
  return Math.hypot(du / hill.along, dv / hill.across);
}

// Height in metres above the ground at a point: a smooth dome with a gentle
// unevenness so the slope does not look turned on a lathe.
function slopeHeight(hill, du, dv) {
  const reach = hillReach(hill, du, dv);
  if (reach >= 1) return 0;
  const dome = .5 * (1 + Math.cos(Math.PI * reach));
  const uneven = 1 + .07 * Math.sin(du * .043 + dv * .021) + .05 * Math.sin(dv * .067 - du * .031);
  return hill.height * dome * dome * Math.min(1.1, uneven);
}

export function hillHeight(hill, du, dv) {
  let height = slopeHeight(hill, du, dv);
  for (const pad of hill.pads ?? []) {
    const level = slopeHeight(hill, pad.du, pad.dv), near = Math.hypot(du - pad.du, dv - pad.dv);
    height += (level - height) * (1 - smooth((near - pad.radius) / pad.blend));
  }
  return height;
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

// ---------------------------------------------------------------------------
// A lake: the ground is dug into a bowl (course.js `_relief` calls basinRelief
// for a circuit that lists `basins`), and circuit-effects.js lays the water on
// top. Both read the same outline, so the water ends where the bank begins.
//
// A basin is { s, lateral, along, across, surface, depth, bank, blend, keep }:
// an uneven oval `along` and `across` metres each way from a point beside the
// road; `surface` metres above the road's height at s (usually below it);
// `depth` metres deep at the middle; the bank rises `bank` metres per metre
// beyond the shore and fades into the natural ground over `blend` metres; the
// ground within `keep` metres of the road edge is never touched.
// ---------------------------------------------------------------------------

// The shore is not a perfect oval. `angle` is the direction round the lake.
export const shoreFactor = angle => 1 + .09 * Math.sin(angle * 3 + 1.1) + .05 * Math.sin(angle * 5 + 2.3) + .03 * Math.sin(angle * 9);

// 1 at the shore, 0 in the middle, more than 1 outside it.
export function basinReach(basin, du, dv) {
  const x = du / basin.along, y = dv / basin.across;
  return Math.hypot(x, y) / shoreFactor(Math.atan2(y, x));
}

// Where the ground should be and how firmly it is held there, as
// { weight, height } with `height` metres above the water surface. Weight 0
// leaves the natural ground alone. `roadGap` is the distance to the road edge.
export function basinGround(basin, du, dv, roadGap = Infinity) {
  const reach = basinReach(basin, du, dv), room = Math.min(basin.along, basin.across);
  const fade = (basin.blend ?? 30) / room;
  if (reach >= 1 + fade) return { weight: 0, height: 0 };
  const keep = basin.keep ?? 6, spare = smooth((roadGap - keep) / 10);
  if (reach <= 1) return { weight: spare, height: -basin.depth * (1 - smooth((reach - .3) / .7)) };
  return { weight: (1 - smooth((reach - 1) / fade)) * spare, height: (reach - 1) * room * (basin.bank ?? .1) };
}

// Digs a course's basins into its ground. The course keeps its own relief; this
// wraps it, so a course without basins never reaches this code.
export function installBasins(course) {
  const natural = course._relief.bind(course);
  course._relief = (s, off) => {
    let height = natural(s, off);
    const phase = course.phase(s);
    for (const basin of course.def.basins) {
      const ground = basinGround(basin, phase - basin.s, off - basin.lateral, Math.abs(off) - course.roadHalfWidthAt(phase));
      if (ground.weight > 0) height += (course._height(basin.s) + basin.surface + ground.height - course.worldAt(s, off).y - height) * ground.weight;
    }
    return height;
  };
}
