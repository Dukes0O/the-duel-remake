// The ground the near-road ribbon is drawn at (src/world-surfaces.js
// terrainGeometry, and src/rendered-ground.js, which reads the same rows so
// planted scenery stands on what is drawn).
//
// The ribbon is laid out in road terms: a row every 4 m along the road, each row
// reaching sideways to 64 m. On a drawn circuit two stretches of road can lie
// closer than that (the two legs of a tight hairpin, a spur beside the straight
// it leads to), so the outer columns of one stretch reach across the other and,
// built from their own road's height, can lie above it. Only a circuit that
// carries a script is treated this way; every other course keeps its ground.
//
// A column that lies nearer to some other part of the road than to its own is
// taken at the height that other part gives the ground there, the same rule the
// far terrain already uses (it reads the nearest road). Within a few metres of
// that road it is sunk a little below the road's own level, so the ribbon of the
// road it lies over is the surface that shows. Farther out, where no road can lie
// under it, it keeps the height its own road gives it, so the land away from the
// road looks as it did. A column is only ever lowered, never raised.
const smooth = x => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };

// Metres beyond the road edge that stay buried, how far past that the ground
// takes to rise to its natural height, and where (metres from the edge of the
// other road, then over how many more) the column goes back to its own height.
const BURIED_GAP = 5, RISE = 10, BURIED_DEPTH = .4, OWN_FROM = 12, OWN_OVER = 8;

export function ribbonGroundAt(course, s, off) {
  const point = course.groundAt(s, off);
  if (!course.script) return point;
  const own = Math.abs(off);
  if (own <= course.roadHalfWidthAt(s) + 2) return point;
  // The refined nearest point lies on the route, so it is never nearer than the route's nearest segment: when even that
  // is farther than the limit (with a hair to spare), the full answer below would return the point as well.
  if (course._nearestIndex && !course.def.pit && !course.def.saltFlats &&
      Math.sqrt(course._nearestIndex.lookup(point.x, point.z).distanceSq) > own - 1 + 1e-6) return point;
  const near = course.nearest(point.x, point.z);
  // As near its own road as any: nothing reaches across.
  if (near.distance >= own - 1) return point;
  const natural = course.groundAt(near.s, near.lateral).y;
  const buried = Math.min(natural, course.worldAt(near.s, near.lateral).y - BURIED_DEPTH);
  const gap = near.distance - course.roadHalfWidthAt(near.s);
  const nearer = buried + (natural - buried) * smooth((gap - BURIED_GAP) / RISE);
  // Only ever lowered: a column that already lies below the other road's ground is hidden by it.
  point.y = Math.min(point.y, point.y + (nearer - point.y) * (1 - smooth((gap - OWN_FROM) / OWN_OVER)));
  return point;
}
