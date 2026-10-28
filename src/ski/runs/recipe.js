// Shape recipes for the ski zones (docs/HELI_SKIING.md section 5). A zone's
// snow is a function, not a file: a smooth fall line with bumps, kickers or
// a bowl added to it. Everything here is pure, so the same recipe gives the
// same height at every point, on every machine.
//
// A zone's own frame: the drop pad is the origin, the run falls toward +z
// (heading 0), +x is the skier's left. Heights are metres above the sea, so
// the skier's air thins with them (ski-physics).
const DEG = Math.PI / 180;
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const smooth = t => { const k = clamp(t, 0, 1); return k * k * (3 - 2 * k); };

// How far the snow has fallen by distance z, from keyframes {z, angle} of the
// slope angle in degrees (positive falls toward +z, negative climbs). The
// angle eases between keyframes, the fall is integrated in 0.25 m steps into a
// table, and a lookup is linear between its entries. `step` is the table's step.
export function fallLine(keys, {step = 0.25, length = null} = {}) {
  const end = length ?? keys[keys.length - 1].z;
  const n = Math.ceil(end / step) + 1;
  const table = new Float64Array(n + 1);
  const angleAt = z => {
    if (z <= keys[0].z) return keys[0].angle;
    for (let i = 1; i < keys.length; i++) {
      if (z <= keys[i].z) return keys[i - 1].angle + (keys[i].angle - keys[i - 1].angle) * smooth((z - keys[i - 1].z) / (keys[i].z - keys[i - 1].z));
    }
    return keys[keys.length - 1].angle;
  };
  for (let i = 1; i <= n; i++) table[i] = table[i - 1] + Math.tan(angleAt((i - 0.5) * step) * DEG) * step;
  const first = Math.tan(keys[0].angle * DEG), last = Math.tan(keys[keys.length - 1].angle * DEG);
  return z => {
    if (z <= 0) return z * first;
    const at = z / step, i = Math.floor(at);
    if (i >= n) return table[n] + (z - n * step) * last;
    return table[i] + (table[i + 1] - table[i]) * (at - i);
  };
}

// Scale the slope angles of keyframes so the fall over `length` is exactly
// `drop`: the zone is told how long and how far it falls, the recipe says
// where it is steep and where it is gentle.
export function fitDrop(keys, length, drop) {
  const trial = fallLine(keys)(length);
  const scale = drop / trial;
  const scaled = keys.map(key => ({z: key.z, angle: Math.atan(Math.tan(key.angle * DEG) * scale) / DEG}));
  for (let pass = 0; pass < 6; pass++) {
    const error = drop - fallLine(scaled)(length);
    if (Math.abs(error) < 1e-3) break;
    const factor = drop / fallLine(scaled)(length);
    for (const key of scaled) key.angle = Math.atan(Math.tan(key.angle * DEG) * factor) / DEG;
  }
  return scaled;
}

// A round bump: height `h` at the centre, falling to nothing at `radius`
// (a cosine hill), so its slope is smooth where it meets the snow.
export function bump(x, z, cx, cz, radius, h) {
  const d = Math.hypot(x - cx, z - cz);
  if (d >= radius) return 0;
  const c = Math.cos(Math.PI * d / (2 * radius));
  return h * c * c;
}

// The distance from (x, z) to a polyline of {x, z} points.
export function distanceToLine(line, x, z) {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const ax = line[i - 1].x, az = line[i - 1].z, bx = line[i].x, bz = line[i].z;
    const dx = bx - ax, dz = bz - az, span = dx * dx + dz * dz || 1;
    const k = clamp(((x - ax) * dx + (z - az) * dz) / span, 0, 1);
    best = Math.min(best, Math.hypot(x - (ax + dx * k), z - (az + dz * k)));
  }
  return best;
}

// A pair of poles {left, right, dir}: left is the skier's left (+x at heading 0).
export function gateAt(z, centre, width, colour) {
  return Object.freeze({left: Object.freeze({x: centre + width / 2, z}), right: Object.freeze({x: centre - width / 2, z}),
    dir: Object.freeze({x: 0, z: 1}), centre, width, colour});
}

export const freezeDeep = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) freezeDeep(value[key]);
  }
  return value;
};
