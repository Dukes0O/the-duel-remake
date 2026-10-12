// A sample Deep zone for the look page and the tests (not a place in the game).
// A closed loop of about 1.9 km in the 10.1 format: sunny shallows, a kelp
// forest, a deep stretch along the drop-off lip, and back through seagrass.
const TAU = Math.PI * 2;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const bump = (a, b, c, d, x) => smooth(a, b, x) * (1 - smooth(c, d, x));

export function sampleZone({ points = 190 } = {}) {
  const trail = [];
  for (let i = 0; i < points; i++) {
    const u = i / points, a = u * TAU;
    // A wobbly oval, about 380 m by 260 m.
    const r = 1 + 0.08 * Math.sin(a * 3 + 0.6) + 0.05 * Math.sin(a * 5 + 1.9);
    const x = Math.sin(a) * 380 * r, z = (1 - Math.cos(a)) * 260 * r;
    const forest = bump(0.12, 0.2, 0.42, 0.5, u), deep = bump(0.5, 0.56, 0.7, 0.76, u);
    const depth = 5 + 5 * smooth(0.06, 0.18, u) * (1 - smooth(0.8, 0.95, u)) + 11 * deep;
    trail.push({ x, z, depth, width: 12, surface: 'sea-floor',
      kelp: forest, grass: Math.max(0, 1 - forest * 1.6 - deep * 2), rock: 0.15 + 0.5 * deep });
  }
  return { id: 'sample-loop', circuit: 'none', switch: 'the-deep',
    ramp: { atDistance: 0, side: 'right', length: 120, endDepth: 5 },
    trail, places: [], pearls: [], spots: [] };
}
