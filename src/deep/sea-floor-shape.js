// The shape of the sea floor and where things grow on it. Pure numbers, no
// graphics: the sea floor, kelp and rocks read this, and the tests check it.
//
// Coordinates: the surface is y = 0, the floor is below it. The stretch runs
// along +z from the shallows (z = 0) out to deep water (z = 300).
import { makeRng } from '../rng.js';

export const FLOOR_LENGTH = 300;
export const FLOOR_HALF_WIDTH = 90;

// Hard caps. Asking for more gets the cap, so a mistake cannot flood the scene.
export const CAPS = Object.freeze({ kelpStems: 700, seagrassTufts: 3000, rocks: 120, pebbles: 1500 });

const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// A small smooth noise from sines, repeatable and cheap.
function wobble(x, z) {
  return (Math.sin(x * 0.071 + 1.3) * Math.cos(z * 0.053 + 0.4)
    + 0.6 * Math.sin(x * 0.173 - z * 0.121 + 2.1)
    + 0.35 * Math.sin(z * 0.311 + x * 0.087)) / 1.95;
}

// How rocky the ground is here (0 sand, 1 bare rock), patchy and clustered.
export function rockiness(x, z) {
  const patch = 0.5 + 0.5 * Math.sin(x * 0.045 + 0.7) * Math.cos(z * 0.038 + 1.9);
  const fine = 0.5 + 0.5 * Math.sin(x * 0.19 + z * 0.14 + 0.5);
  const forest = smoothstep(55, 90, z) * (1 - smoothstep(190, 230, z));
  return Math.min(1, Math.max(0, (patch * 0.8 + fine * 0.2 - 0.52) * 2.4 + forest * 0.18));
}

// Depth of the floor (metres below the surface) along the middle of the stretch:
// sunny shallows, a level kelp forest, then a slope into the blue.
export function trailDepth(z) {
  const forest = 5 + 4.5 * smoothstep(20, 90, z);
  const slope = 20.5 * smoothstep(200, 292, z) ** 1.15;
  // Past the end of the stretch the floor keeps falling away, so the slope runs
  // into the blue instead of stopping at an edge.
  const beyond = 26 * smoothstep(300, 520, z);
  return forest + slope + beyond + 2 * smoothstep(100, 150, z) * (1 - smoothstep(150, 200, z));
}

// Height of the floor at a point (negative: below the surface).
export function floorHeight(x, z) {
  const ax = Math.abs(x);
  // The sides rise into low rocky banks, so the stretch reads as a channel.
  const bank = 0.00095 * ax * ax + 9 * smoothstep(55, 90, ax);
  const swell = wobble(x, z) * 0.9;
  // Rocky ground is lumpy, sandy ground is smooth.
  const rock = rockiness(x, z);
  const lump = (Math.sin(x * 0.52 + z * 0.37) * Math.cos(z * 0.61 - x * 0.29) + 0.5 * Math.sin(x * 1.3 + z * 0.9)) * 0.45 * rock * rock;
  // Long, low sand dunes crossing the trail.
  const dune = 0.13 * Math.sin(z * 0.42 + wobble(x, z) * 2.2) * (1 - rock);
  return -trailDepth(z) + bank + swell + lump + dune;
}

// Kelp lives on rock and gravel, in water 6 to 22 m deep, thickest mid-forest.
export function kelpDensity(x, z) {
  const depth = -floorHeight(x, z);
  const band = smoothstep(5, 8, depth) * (1 - smoothstep(18, 24, depth));
  const forest = smoothstep(50, 85, z) * (1 - smoothstep(205, 245, z));
  const clump = 0.55 + 0.45 * Math.sin(x * 0.11 + z * 0.083 + 0.9) * Math.sin(z * 0.07 - x * 0.05 + 1.7);
  const edge = 1 - smoothstep(55, 88, Math.abs(x));
  return band * forest * clump * edge * (0.45 + 0.55 * rockiness(x, z));
}

export const KELP_TOP = 0.7; // kelp canopy floats this far under the surface

// Kelp stems: position, height to the canopy, and the personal numbers that
// make each stem sway a little differently. Repeatable from the seed.
export function kelpPlacements(seed = 1989, requested = 520) {
  const rng = makeRng(seed ^ 0x6b656c70);
  const wanted = Math.min(Math.max(0, Math.floor(requested)), CAPS.kelpStems);
  const stems = [];
  let tries = 0;
  while (stems.length < wanted && tries++ < wanted * 40) {
    const x = rng.range(-FLOOR_HALF_WIDTH * 0.5, FLOOR_HALF_WIDTH * 0.5), z = rng.range(40, 260);
    if (rng.float() > kelpDensity(x, z) * 1.5) continue;
    const y = floorHeight(x, z), height = -y - KELP_TOP + rng.range(-0.5, 0.2);
    if (height < 3) continue;
    stems.push({ x, y, z, height, yaw: rng.float() * Math.PI * 2, phase: rng.float() * Math.PI * 2,
      lean: rng.range(-0.18, 0.18), girth: rng.range(0.85, 1.25), bladeSeed: rng.float() });
  }
  return stems;
}

// Seagrass tufts: thick in the shallows on sand, thinning where it gets deep.
export function seagrassPlacements(seed = 1989, requested = 1100) {
  const rng = makeRng(seed ^ 0x67726173);
  const wanted = Math.min(Math.max(0, Math.floor(requested)), CAPS.seagrassTufts);
  const tufts = [];
  let tries = 0;
  while (tufts.length < wanted && tries++ < wanted * 30) {
    const x = rng.range(-70, 70), z = rng.range(-8, 190);
    const depth = -floorHeight(x, z);
    // Meadows: thick in patches, bare sand between them.
    const patch = Math.max(0, Math.sin(x * 0.13 + z * 0.09 + 2.0) * Math.sin(z * 0.07 - x * 0.05 + 0.6) * 1.3 - 0.12);
    const cover = (1 - smoothstep(9, 15, depth)) * (1 - rockiness(x, z)) * Math.min(1, patch * 2.2 + 0.06);
    if (rng.float() > cover) continue;
    tufts.push({ x, y: floorHeight(x, z), z, yaw: rng.float() * Math.PI * 2, size: rng.range(0.7, 1.4), phase: rng.float() * Math.PI * 2 });
    // Tufts come in little clumps.
    for (let extra = 0; extra < 2 && tufts.length < wanted; extra++) {
      const cx = x + rng.range(-0.5, 0.5), cz = z + rng.range(-0.5, 0.5);
      tufts.push({ x: cx, y: floorHeight(cx, cz), z: cz, yaw: rng.float() * Math.PI * 2, size: rng.range(0.55, 1.2), phase: rng.float() * Math.PI * 2 });
    }
  }
  return tufts;
}

// Rocks and boulders, big ones in the forest and along the slope.
export function rockPlacements(seed = 1989, requested = 90) {
  const rng = makeRng(seed ^ 0x726f636b);
  const wanted = Math.min(Math.max(0, Math.floor(requested)), CAPS.rocks);
  const rocks = [];
  let tries = 0;
  while (rocks.length < wanted && tries++ < wanted * 30) {
    const x = rng.range(-FLOOR_HALF_WIDTH * 0.8, FLOOR_HALF_WIDTH * 0.8), z = rng.range(-5, 295);
    if (rng.float() > 0.25 + 0.75 * rockiness(x, z)) continue;
    const size = Math.pow(rng.float(), 2.2) * 2.6 + 0.35;
    rocks.push({ x, y: floorHeight(x, z) + size * 0.12, z, size, squash: rng.range(0.55, 0.9), yaw: rng.float() * Math.PI * 2,
      variant: rng.int(0, 2), tilt: rng.range(-0.18, 0.18) });
  }
  return rocks;
}

// How far under a kelp canopy this spot is (0 open water, 1 deep in the forest).
export function forestShade(x, z) {
  return smoothstep(55, 90, z) * (1 - smoothstep(200, 240, z)) * (1 - smoothstep(50, 85, Math.abs(x)));
}

// Pebbles and cobbles: thick where sand turns to rock, a few scattered on the sand.
export function pebblePlacements(seed = 1989, requested = 900) {
  const rng = makeRng(seed ^ 0x70656262);
  const wanted = Math.min(Math.max(0, Math.floor(Number.isFinite(requested) ? requested : 0)), CAPS.pebbles);
  const pebbles = [];
  let tries = 0;
  while (pebbles.length < wanted && tries++ < wanted * 25) {
    const x = rng.range(-70, 70), z = rng.range(-5, 280);
    const rock = rockiness(x, z);
    if (rng.float() > 0.06 + 0.94 * Math.min(1, rock * 1.6)) continue;
    const size = rng.range(0.05, 0.22) * (0.6 + rock);
    pebbles.push({ x, y: floorHeight(x, z) + size * 0.2, z, size, squash: rng.range(0.5, 0.85), yaw: rng.float() * Math.PI * 2, variant: rng.int(0, 2) });
  }
  return pebbles;
}
