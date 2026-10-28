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
  const orientation = hill.orientation ?? 1;
  const uneven = 1 + .07 * Math.sin(orientation * (du * .043 + dv * .021)) + .05 * Math.sin(orientation * (dv * .067 - du * .031));
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
export const shoreFactor = (angle, orientation = 1) => {
  if (orientation === -1) angle += Math.PI;
  return 1 + .09 * Math.sin(angle * 3 + 1.1) + .05 * Math.sin(angle * 5 + 2.3) + .03 * Math.sin(angle * 9);
};

// 1 at the shore, 0 in the middle, more than 1 outside it.
export function basinReach(basin, du, dv) {
  const x = du / basin.along, y = dv / basin.across;
  return Math.hypot(x, y) / shoreFactor(Math.atan2(y, x), basin.orientation);
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

// True when a point is certainly past the basin's fade, so basinGround would give it weight 0 and height 0. Reach is the
// distance over a shore factor that is never above 1.17 (shoreFactor), so a point whose distance is beyond 1.2 times the
// fade distance has reach past the fade; asking this first saves the angle and sine work for the many points far from any shore.
export function basinOutOfReach(basin, du, dv) {
  const fade = (basin.blend ?? 30) / Math.min(basin.along, basin.across), limit = (1 + fade) * 1.2;
  const x = du / basin.along;
  return x >= limit || -x >= limit || Math.hypot(x, dv / basin.across) >= limit;
}

// Digs a course's basins into its ground. The course keeps its own relief; this
// wraps it, so a course without basins never reaches this code.
export function installBasins(course) {
  const natural = course._relief.bind(course);
  course._relief = (s, off) => {
    let height = natural(s, off);
    const phase = course.phase(s);
    for (const basin of course.def.basins) {
      if (basinOutOfReach(basin, phase - basin.s, off - basin.lateral)) continue;
      const ground = basinGround(basin, phase - basin.s, off - basin.lateral, Math.abs(off) - course.roadHalfWidthAt(phase));
      if (ground.weight > 0) height += (course._height(basin.s) + basin.surface + ground.height - course.worldAt(s, off).y - height) * ground.weight;
    }
    return height;
  };
}

// Gentler land beyond the road (`relief: { from, to, scale }` on a circuit): the
// natural relief is kept near the road and eased down to `scale` of itself from
// `from` to `to` metres beyond the road's edge, so the far hillsides rise more
// slowly and the hills drawn behind them stand out. Wraps the course's relief
// like the basins, so a course without this option never reaches this code.
export function installReliefScale(course) {
  const natural = course._relief.bind(course), { from = 30, to = 110, scale = .5 } = course.def.relief;
  course._relief = (s, off) => {
    const edge = Math.abs(off) - course.roadHalfWidthAt(course.phase(s));
    return natural(s, off) * (1 - (1 - scale) * smooth((edge - from) / (to - from)));
  };
}

// Far ground between two stretches of road at different heights (`farGround: { band, apart }`
// on a circuit). The far ground takes its height from the nearest road, so where the nearest road
// changes, halfway between two stretches that run at different heights, it stepped: a wall tens of
// metres tall under the hills behind the lake. Within `band` metres of that halfway line
// (the difference between the distances to the two nearest stretches, `apart` metres or more
// apart along the lap) the height now blends from one road's to the other's, meeting in the
// middle, so the ground slopes from one to the other. Ground near the road, a hill or a
// lake is not touched. Adds `course.farGroundY(x, z, s, off)`: the height of the far ground at
// a place, `s` and `off` being its nearest road position. Wraps nothing: only the far ground
// builders ask for it, so a circuit without the option never reaches this code.
export function installFarGround(course) {
  const { band = 120, apart = 250 } = course.def.farGround;
  const length = course.length;
  let points = null;
  const hills = course.def.hills ?? [], basins = course.def.basins ?? [];
  course.farGroundY = (x, z, s, off) => {
    const natural = course.groundAt(s, off).y;
    points ??= course.samples.filter((_, i) => i % 4 === 0);
    let first = Infinity, firstS = 0;
    for (const p of points) { const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < first) { first = d; firstS = p.s; } }
    let second = Infinity, other = null;
    for (const p of points) {
      const gap = Math.abs(p.s - firstS), d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (Math.min(gap, length - gap) < apart || d >= second) continue;
      second = d; other = p;
    }
    if (!other) return natural;
    let weight = .5 * smooth(1 - (Math.sqrt(second) - Math.sqrt(first)) / band);
    if (weight <= 0) return natural;
    const phase = course.phase(s);
    for (const hill of hills) weight *= smooth((hillReach(hill, ...hillLocal(hill, phase, off)) - 1.1) / .4);
    for (const basin of basins) weight *= smooth((basinReach(basin, phase - basin.s, off - basin.lateral) - 1.1) / .4);
    if (weight <= 0) return natural;
    const across = (x - other.x) * Math.cos(other.heading) - (z - other.z) * Math.sin(other.heading);
    return natural + (course.groundAt(other.s, across).y - natural) * weight;
  };
}

// Level ground under a building (a hill's `pads`). The pad's dome is already level
// (hillHeight); the land under the dome rose and fell with the ground's own relief, so a
// building 25 m across stood on ground that varied by metres: sunk at the high side
// and floating at the low. The ground within `radius` of the pad's middle is now held
// at the height it has there, easing back to the natural ground over `blend` metres.
// Wraps the course's relief, like the basins; a course whose hills have no pads never
// reaches it.
export function installHillPads(course) {
  const natural = course._relief.bind(course), pads = [];
  for (const hill of course.def.hills ?? []) for (const pad of hill.pads ?? []) pads.push({ ...pad, s: hill.s + pad.du, lateral: hill.lateral + pad.dv, level: null });
  course._relief = (s, off) => {
    let height = natural(s, off);
    const phase = course.phase(s);
    for (const pad of pads) {
      const weight = 1 - smooth((Math.hypot(phase - pad.s, off - pad.lateral) - pad.radius) / pad.blend);
      if (weight <= 0) continue;
      pad.level ??= course.worldAt(pad.s, pad.lateral).y + natural(pad.s, pad.lateral);
      height += (pad.level - (course.worldAt(s, off).y + height)) * weight;
    }
    return height;
  };
}
