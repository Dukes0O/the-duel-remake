// The sea floor of a Deep zone, worked out from its trail (docs/THE_DEEP.md
// section 10.1). Pure numbers, no graphics, so the driving code, the look and
// the tests all read the same ground.
//
// A zone's trail is a closed loop of points { x, z, depth, width } with
// optional look amounts kelp, grass and rock (0 to 1). The drivable width of
// the trail lies exactly at the trail's depth, so the car and the picture
// agree. Outside it the ground gains sand swells, rocky lumps and low banks,
// and kelp, seagrass and rocks grow where the trail asks for them.
import { makeRng } from '../rng.js';
import { KELP_TOP } from './sea-floor-shape.js';

export const ZONE_SPAN = 90;         // metres each side of the trail that have ground
export const ZONE_EDGE = 86;         // the car is held this far from the trail at the most
// Hard caps for a whole zone (a loop of 3 to 4 km). Only nearby chunks are drawn.
export const ZONE_CAPS = Object.freeze({ kelpStems: 2400, seagrassTufts: 9000, rocks: 420, pebbles: 4200 });
// DEEP-SHALLOWS-FIX: banks stay at least 2.6 m under the surface. At 0.8 m the chase camera (3.65 m above the car)
// rose out of the water in the shallows and the whole screen turned into the flat surface seen from above.
export const FLOOR_CEILING = -2.6;   // banks never come closer to the surface than this
export const BANK_SHARE = 0.55;      // banks rise at most this share of the depth
const CELL = 25;                     // lookup grid for the nearest stretch of trail

const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = x => Math.min(1, Math.max(0, x));

function wobble(x, z) {
  return (Math.sin(x * 0.071 + 1.3) * Math.cos(z * 0.053 + 0.4)
    + 0.6 * Math.sin(x * 0.173 - z * 0.121 + 2.1)
    + 0.35 * Math.sin(z * 0.311 + x * 0.087)) / 1.95;
}

// A stable number from the zone id, so every zone has its own repeatable layout.
export function zoneSeed(id) {
  let h = 2166136261;
  for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function createZoneFloor(zone) {
  const points = zone?.trail;
  if (!Array.isArray(points) || points.length < 3) throw new Error('A Deep zone needs a trail of at least three points.');
  const n = points.length;
  const look = p => ({ kelp: clamp01(p.kelp ?? 0), grass: clamp01(p.grass ?? 0), rock: clamp01(p.rock ?? 0) });
  const pts = points.map(p => ({ x: p.x, z: p.z, depth: p.depth, width: p.width, ...look(p) }));

  // Segments of the closed loop, with the distance along the trail where each starts.
  const segs = [];
  let length = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
    if (!(len > 0)) throw new Error(`Deep zone ${zone.id}: trail points ${i} and ${(i + 1) % n} are the same place.`);
    segs.push({ a, b, dx, dz, len, start: length, tx: dx / len, tz: dz / len });
    length += len;
  }

  // Each grid cell lists the segments that can be nearest to a point inside it.
  const grid = new Map();
  const reach = ZONE_SPAN + 15;
  segs.forEach((s, index) => {
    const x0 = Math.floor((Math.min(s.a.x, s.b.x) - reach) / CELL), x1 = Math.floor((Math.max(s.a.x, s.b.x) + reach) / CELL);
    const z0 = Math.floor((Math.min(s.a.z, s.b.z) - reach) / CELL), z1 = Math.floor((Math.max(s.a.z, s.b.z) + reach) / CELL);
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
      const key = `${cx}:${cz}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(index);
    }
  });

  // Where a point sits relative to the trail: distance along it, signed distance
  // across it (positive to the left, as in the game: heading +z, left is +x),
  // and the trail's numbers at that spot.
  function sample(x, z) {
    const list = grid.get(`${Math.floor(x / CELL)}:${Math.floor(z / CELL)}`);
    if (!list) return null;
    let best = null, bestD = Infinity;
    for (const index of list) {
      const s = segs[index];
      const t = clamp01(((x - s.a.x) * s.dx + (z - s.a.z) * s.dz) / (s.len * s.len));
      const px = s.a.x + s.dx * t, pz = s.a.z + s.dz * t;
      const d = Math.hypot(x - px, z - pz);
      if (d < bestD) { bestD = d; best = { s, t }; }
    }
    const { s, t } = best;
    // Side from the segment, size from the true distance (round the outside of a bend).
    const side = s.tz * (x - s.a.x) - s.tx * (z - s.a.z);
    const lateral = (side < 0 ? -1 : 1) * bestD;
    const mix = key => s.a[key] + (s.b[key] - s.a[key]) * t;
    return { along: s.start + s.len * t, lateral, distance: bestD, depth: mix('depth'), width: mix('width'),
      kelp: mix('kelp'), grass: mix('grass'), rock: mix('rock') };
  }

  // A point and its heading at a distance along the trail.
  function frameAt(along) {
    let d = ((along % length) + length) % length;
    let lo = 0, hi = segs.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (segs[mid].start <= d) lo = mid; else hi = mid - 1; }
    const s = segs[lo], t = (d - s.start) / s.len;
    return { x: s.a.x + s.dx * t, z: s.a.z + s.dz * t, tx: s.tx, tz: s.tz };
  }
  // A point beside the trail: `lateral` metres to the left of the heading.
  function pointAt(along, lateral) {
    const f = frameAt(along);
    return { x: f.x + f.tz * lateral, z: f.z - f.tx * lateral };
  }

  function rockiness(x, z, at = sample(x, z)) {
    if (!at) return 0;
    const patch = 0.5 + 0.5 * Math.sin(x * 0.045 + 0.7) * Math.cos(z * 0.038 + 1.9);
    const fine = 0.5 + 0.5 * Math.sin(x * 0.19 + z * 0.14 + 0.5);
    const off = smoothstep(at.width * 0.5, at.width * 0.5 + 4, Math.abs(at.lateral));
    return clamp01(((patch * 0.8 + fine * 0.2 - 0.52) * 2.4 + at.rock * 0.8 + at.kelp * 0.18) * (0.35 + 0.65 * off));
  }

  // The ground at the trail itself, which the driving code uses.
  function trailHeight(along) {
    const f = frameAt(along), at = sample(f.x, f.z);
    return -at.depth;
  }

  function floorHeight(x, z) {
    const at = sample(x, z);
    if (!at) return FLOOR_CEILING - 40;
    const out = Math.max(0, Math.abs(at.lateral) - at.width * 0.5);
    const detail = smoothstep(0, 4, out);
    // Low rocky banks beside the trail, so it reads as a channel.
    const bank = 0.00095 * out * out + 9 * smoothstep(30, 65, out);
    const swell = wobble(x, z) * 0.9;
    const rock = rockiness(x, z, at);
    const lump = (Math.sin(x * 0.52 + z * 0.37) * Math.cos(z * 0.61 - x * 0.29) + 0.5 * Math.sin(x * 1.3 + z * 0.9)) * 0.45 * rock * rock;
    const dune = 0.13 * Math.sin(at.along * 0.42 + wobble(x, z) * 2.2) * (1 - rock);
    // Banks climb at most a little over half the water's depth, so the channel
    // never meets the surface in a flat shelf (a hard line in the distance).
    const rise = Math.min(bank, at.depth * BANK_SHARE);
    return Math.min(FLOOR_CEILING, -at.depth + detail * (rise + swell + lump + dune));
  }

  // Kelp grows where the trail asks for it, off the drivable width, in water
  // 6 to 22 m deep.
  function kelpDensity(x, z) {
    const at = sample(x, z);
    if (!at || at.kelp <= 0) return 0;
    const out = Math.abs(at.lateral) - at.width * 0.5;
    if (out < 2) return 0;
    const depth = -floorHeight(x, z);
    const band = smoothstep(5, 8, depth) * (1 - smoothstep(18, 24, depth));
    const clump = 0.55 + 0.45 * Math.sin(x * 0.11 + z * 0.083 + 0.9) * Math.sin(z * 0.07 - x * 0.05 + 1.7);
    const edge = smoothstep(2, 6, out) * (1 - smoothstep(40, 65, out));
    return at.kelp * band * clump * edge * (0.45 + 0.55 * rockiness(x, z, at));
  }

  function forestShade(x, z) {
    const at = sample(x, z);
    if (!at) return 0;
    return at.kelp * (1 - smoothstep(at.width * 0.5 + 15, at.width * 0.5 + 45, Math.abs(at.lateral)));
  }

  function grassCover(x, z, at = sample(x, z)) {
    if (!at || at.grass <= 0) return 0;
    if (Math.abs(at.lateral) < at.width * 0.35) return 0;
    const depth = -floorHeight(x, z);
    const patch = Math.max(0, Math.sin(x * 0.13 + z * 0.09 + 2.0) * Math.sin(z * 0.07 - x * 0.05 + 0.6) * 1.3 - 0.12);
    return at.grass * (1 - smoothstep(9, 15, depth)) * (1 - rockiness(x, z, at)) * Math.min(1, patch * 2.2 + 0.06);
  }

  const capped = (requested, cap) => Math.min(Math.max(0, Math.floor(Number.isFinite(requested) ? requested : 0)), cap);
  const randomSpot = (rng, span) => pointAt(rng.float() * length, rng.range(-span, span));

  function kelpPlacements(seed, requested = 520) {
    const rng = makeRng(seed ^ 0x6b656c70), wanted = capped(requested, ZONE_CAPS.kelpStems), stems = [];
    let tries = 0;
    while (stems.length < wanted && tries++ < wanted * 60) {
      const { x, z } = randomSpot(rng, ZONE_SPAN * 0.6);
      if (rng.float() > kelpDensity(x, z) * 1.5) continue;
      const y = floorHeight(x, z), height = -y - KELP_TOP + rng.range(-0.5, 0.2);
      if (height < 3) continue;
      stems.push({ x, y, z, height, yaw: rng.float() * Math.PI * 2, phase: rng.float() * Math.PI * 2,
        lean: rng.range(-0.18, 0.18), girth: rng.range(0.85, 1.25), bladeSeed: rng.float() });
    }
    return stems;
  }

  function seagrassPlacements(seed, requested = 1100) {
    const rng = makeRng(seed ^ 0x67726173), wanted = capped(requested, ZONE_CAPS.seagrassTufts), tufts = [];
    let tries = 0;
    while (tufts.length < wanted && tries++ < wanted * 40) {
      const { x, z } = randomSpot(rng, 70);
      if (rng.float() > grassCover(x, z)) continue;
      tufts.push({ x, y: floorHeight(x, z), z, yaw: rng.float() * Math.PI * 2, size: rng.range(0.7, 1.4), phase: rng.float() * Math.PI * 2 });
      for (let extra = 0; extra < 2 && tufts.length < wanted; extra++) {
        const cx = x + rng.range(-0.5, 0.5), cz = z + rng.range(-0.5, 0.5);
        tufts.push({ x: cx, y: floorHeight(cx, cz), z: cz, yaw: rng.float() * Math.PI * 2, size: rng.range(0.55, 1.2), phase: rng.float() * Math.PI * 2 });
      }
    }
    return tufts;
  }

  // Rocks never sit on the drivable width.
  function rockPlacements(seed, requested = 90) {
    const rng = makeRng(seed ^ 0x726f636b), wanted = capped(requested, ZONE_CAPS.rocks), rocks = [];
    let tries = 0;
    while (rocks.length < wanted && tries++ < wanted * 40) {
      const { x, z } = randomSpot(rng, ZONE_SPAN * 0.8), at = sample(x, z);
      if (!at || Math.abs(at.lateral) < at.width * 0.5 + 2) continue;
      if (rng.float() > 0.25 + 0.75 * rockiness(x, z, at)) continue;
      const size = Math.pow(rng.float(), 2.2) * 2.6 + 0.35;
      rocks.push({ x, y: floorHeight(x, z) + size * 0.12, z, size, squash: rng.range(0.55, 0.9), yaw: rng.float() * Math.PI * 2,
        variant: rng.int(0, 2), tilt: rng.range(-0.18, 0.18) });
    }
    return rocks;
  }

  function pebblePlacements(seed, requested = 900) {
    const rng = makeRng(seed ^ 0x70656262), wanted = capped(requested, ZONE_CAPS.pebbles), pebbles = [];
    let tries = 0;
    while (pebbles.length < wanted && tries++ < wanted * 30) {
      const { x, z } = randomSpot(rng, 70);
      const rock = rockiness(x, z);
      if (rng.float() > 0.06 + 0.94 * Math.min(1, rock * 1.6)) continue;
      const size = rng.range(0.05, 0.22) * (0.6 + rock);
      pebbles.push({ x, y: floorHeight(x, z) + size * 0.2, z, size, squash: rng.range(0.5, 0.85), yaw: rng.float() * Math.PI * 2, variant: rng.int(0, 2) });
    }
    return pebbles;
  }

  // The area that has ground, for laying out floor tiles.
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
  const bounds = { minX: minX - ZONE_SPAN, maxX: maxX + ZONE_SPAN, minZ: minZ - ZONE_SPAN, maxZ: maxZ + ZONE_SPAN };

  // Metres of trail with kelp, seagrass or rock, weighted by how much: the scene
  // sizes each crop from these so a long forest is as thick as a short one.
  const coverLength = key => segs.reduce((sum, s) => sum + s.len * (s.a[key] + s.b[key]) / 2, 0);

  return { id: zone.id, length, bounds, coverLength, sample, frameAt, pointAt, trailHeight, floorHeight, rockiness: (x, z) => rockiness(x, z),
    kelpDensity, forestShade, grassCover, kelpPlacements, seagrassPlacements, rockPlacements, pebblePlacements };
}
