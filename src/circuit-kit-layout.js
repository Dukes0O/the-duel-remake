// Works out a circuit's `kitPlacements` (the metadata the kit loader reads, see
// src/track-kits.js: { id, s, lateral, heading, scale, lift }) from the road and a
// short description of the street. Pure arithmetic on the track script: no
// graphics, no clock, no randomness beyond a fixed seed, so the same circuit
// always gets the same scenery. The loader owns anchoring to the ground and
// the clearance checks; this keeps pieces off the road, off the run-off roads
// and out of the water so those checks pass.
//
// Pieces face +z. `lateral` is metres left of the centre line; `heading` is a
// turn from the road's direction: -PI/2 faces a left-hand piece toward the road.
import { makeRng } from './rng.js';
import { TRACK_SCRIPT, buildTrackScript } from './track-script.js';
import { basinReach } from './circuit-hills.js';
import { escapeRoadsFor, escapeFrame } from './escape-roads.js';

const WALL_OUT = TRACK_SCRIPT.wallSetback + TRACK_SCRIPT.wallThickness; // road edge to the outer face of a wall
const HALF_PI = Math.PI / 2;

// Piece sizes in metres, from the kit manifest: [width, height, depth], and the
// depth range behind and in front of the pivot (the shopfronts' awnings reach
// past their front wall). tools/test-circuit-harbour.mjs keeps these equal to the manifest.
export const PIECES = Object.freeze({
  'start-gantry': { size: [17.76, 7.7, .93], z: [-.47, .47] },
  'pit-garage': { size: [7.005, 5.2, 8.02], z: [-4, 4.02] },
  'pit-wall': { size: [4, 1.68, .605], z: [-.3, .3] },
  'grandstand': { size: [12, 8, 8], z: [-4, 4] },
  'concrete-wall': { size: [4, 1.05, .72], z: [-.36, .36] },
  'catch-fence': { size: [4, 3.7, .38], z: [-.19, .19] },
  'tyre-wall': { size: [4, 1, .8], z: [-.4, .4] },
  'lantern-tower': { size: [9.1, 32.65, 9.1], z: [-4.55, 4.55] },
  'shopfront-a': { size: [6, 8.8, 5.775], z: [-2.5, 3.28] },
  'shopfront-b': { size: [8, 6.5, 5.775], z: [-2.5, 3.28] },
  'neon-sign': { size: [2.4, 1.2, .376], z: [-.17, .2] },
  'lantern-string': { size: [7.71216, 2.32753, .49825], z: [-.25, .25] },
  'harbour-boat': { size: [2.4, 3, 5.2], z: [-2.6, 2.6] },
});

// ---------------------------------------------------------------------------
// The road, without a Course

function roadAdapter(def, road) {
  const samples = road.samples, step = road.step, length = road.length, count = samples.length - 1;
  const lerp = (a, b, t) => a + (b - a) * t;
  const at = s => {
    const p = ((s % length) + length) % length, i = Math.min(count - 1, Math.floor(p / step)), a = samples[i], b = samples[i + 1], t = (p - a.s) / step;
    return { x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t), y: road.heightAt(p), heading: lerp(a.heading, b.heading, t), curvature: lerp(a.curvature, b.curvature, t) };
  };
  // Nearest centre-line point to a world place: every sample, then a fine scan around the best.
  const nearest = (x, z) => {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < count; i++) { const d = (samples[i].x - x) ** 2 + (samples[i].z - z) ** 2; if (d < bestD) { bestD = d; best = i; } }
    let bestS = best * step;
    for (let s = bestS - step; s <= bestS + step; s += .1) { const f = at(s), d = (f.x - x) ** 2 + (f.z - z) ** 2; if (d < bestD) { bestD = d; bestS = s; } }
    const f = at(bestS);
    return { s: ((bestS % length) + length) % length, distance: Math.sqrt(bestD), lateral: (x - f.x) * Math.cos(f.heading) - (z - f.z) * Math.sin(f.heading) };
  };
  const adapter = { def, script: road, length, at, nearest, closed: true, phase: s => ((s % length) + length) % length,
    worldAt: (s, lateral) => { const f = at(s); return { x: f.x + Math.cos(f.heading) * lateral, z: f.z - Math.sin(f.heading) * lateral, heading: f.heading }; } };
  return adapter;
}

// ---------------------------------------------------------------------------

function pieceRange(road, ref, fallback) {
  if (typeof ref === 'number') return ref;
  const name = typeof ref === 'string' ? ref : ref.piece, at = typeof ref === 'string' ? fallback : ref.at ?? fallback, add = typeof ref === 'string' ? 0 : ref.add ?? 0;
  const piece = road.pieces.find(item => item.name === name);
  if (!piece) throw new Error(`Kit layout names no piece called "${name}".`);
  return (at === 'end' ? piece.s1 : at === 'middle' ? (piece.s0 + piece.s1) / 2 : piece.s0) + add;
}

const wrapLap = (s, length) => ((s % length) + length) % length;

export function buildKitPlacements(def, spec) {
  const road = buildTrackScript(def), course = roadAdapter(def, road), length = road.length;
  const escapes = escapeRoadsFor(course), basins = def.basins ?? [];
  const out = [];
  const taken = [];
  const place = (id, s, lateral, heading = 0, scale = 1, extra = {}) => out.push({ id, s: wrapLap(s, length), lateral, heading, scale, ...extra });

  // --- walls with catch fences; tyre walls across the run-off roads
  const inOpening = (escape, s, x, z) => {
    const along = ((wrapLap(s, length) - escape.s0 + length * 1.5) % length) - length / 2;
    if (Math.abs(along) > 200) return false;
    const { u, v } = escapeFrame(escape, x, z);
    return u > -1.5 && u < escape.run + 1.5 && v > escape.inner - .8 && v < escape.outer + 1.2;
  };
  if (spec.walls) {
    for (const span of road.walls) {
      // Long pieces on straights and wide bends, short ones round tight corners; the loader
      // checks every piece against the road, so fewer, longer pieces keep the world quick to build.
      const turn = road.pieces[span.piece];
      let target = turn.kind === 'straight' ? 16 : turn.radius >= 60 ? 8 : turn.radius >= 30 ? 6 : 3.5;
      // The wall on the inside of a tight bend runs round a very small circle: its pieces must be shorter still.
      if (turn.kind === 'turn' && span.side === turn.dir) target = Math.min(target, Math.max(1.4, (turn.radius - road.halfWidthAt(span.s0) - 1.5) * 1.6));
      // Where the road changes width the wall slants: split a piece until it follows the wall to within 20 cm.
      const pieces = [];
      const split = (a, b) => {
        const mid = (a + b) / 2, off = Math.max(Math.abs(road.halfWidthAt(a) - road.halfWidthAt(mid)), Math.abs(road.halfWidthAt(b) - road.halfWidthAt(mid)));
        if (b - a > target + 1e-6 || (off > .2 && b - a > 3)) { split(a, mid); split(mid, b); } else pieces.push([a, b]);
      };
      const count0 = Math.max(1, Math.ceil((span.s1 - span.s0) / target));
      for (let i = 0; i < count0; i++) split(span.s0 + (span.s1 - span.s0) * i / count0, span.s0 + (span.s1 - span.s0) * (i + 1) / count0);
      for (const [a, b] of pieces) {
        const c = (a + b) / 2, size = b - a, lateral = span.side * (road.halfWidthAt(c) + WALL_OUT / 2 + .5);
        const p = course.worldAt(c, lateral);
        if (escapes.some(escape => inOpening(escape, c, p.x, p.z))) continue;
        const k = [(size - .1) / PIECES['concrete-wall'].size[0], 1, 1];
        place(spec.walls.wall, c, lateral - span.side * .14, -HALF_PI, k);
        if (spec.walls.fence) place(spec.walls.fence, c, lateral + span.side * .74, -HALF_PI, k);
      }
    }
    for (const escape of escapes) {
      const lengthWise = Math.max(1, Math.ceil(escape.run / 4)), size = escape.run / lengthWise;
      const worldOf = (u, v) => ({ x: escape.origin.x + escape.forward.x * u + escape.left.x * escape.side * v, z: escape.origin.z + escape.forward.z * u + escape.left.z * escape.side * v });
      const put = (id, u, v, scale) => {
        const w = worldOf(u, v), n = course.nearest(w.x, w.z), f = course.at(n.s);
        const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
        place(id, n.s, n.lateral, wrap(escape.heading - f.heading - HALF_PI), scale);
      };
      // The outer wall carries straight on beside the run-off road, and a tyre wall closes its end.
      for (let i = 0; i < lengthWise; i++) {
        put(spec.walls.wall, (i + .5) * size, escape.outer + .5, [(size - .1) / PIECES['concrete-wall'].size[0], 1, 1]);
        if (spec.walls.fence) put(spec.walls.fence, (i + .5) * size, escape.outer + .5 + .74, [(size - .1) / PIECES['catch-fence'].size[0], 1, 1]);
      }
      const across = escape.outer + 1 - (escape.inner - .8), middle = (escape.inner - .8 + escape.outer + 1) / 2, n = Math.max(1, Math.ceil(across / 4));
      for (let row = 0; row < 2; row++) for (let i = 0; i < n; i++) {
        const w = worldOf(escape.run + .5 + row * .8, middle - across / 2 + (i + .5) * across / n), f = course.nearest(w.x, w.z), frame = course.at(f.s);
        place(spec.walls.tyres ?? 'tyre-wall', f.s, f.lateral, Math.atan2(Math.sin(escape.heading - frame.heading), Math.cos(escape.heading - frame.heading)), [across / n / 4, 1, 1]);
      }
    }
  }

  // --- helpers for everything behind the walls
  const check = (corners, keepOff) => {
    for (const [x, z] of corners) {
      const n = course.nearest(x, z);
      if (n.distance < road.halfWidthAt(n.s) + WALL_OUT + keepOff) return false;
      for (const escape of escapes) {
        const { u, v } = escapeFrame(escape, x, z);
        if (u > -4 && u < escape.run + 6 && v > escape.inner - 4 && v < escape.outer + 5) return false;
      }
      if (basins.some(basin => basinReach(basin, wrapLap(n.s, length) - basin.s, n.lateral - basin.lateral) < 1.15)) return false;
    }
    return true;
  };
  const footprint = (x, z, heading, zRange, halfWidth) => {
    const f = { x: Math.sin(heading), z: Math.cos(heading) }, l = { x: Math.cos(heading), z: -Math.sin(heading) }, corners = [];
    for (const a of [-1, 0, 1]) for (const b of [zRange[0], zRange[1]]) corners.push([x + l.x * a * halfWidth + f.x * b, z + l.z * a * halfWidth + f.z * b]);
    return corners;
  };
  const free = (x, z, r) => taken.every(t => Math.hypot(t.x - x, t.z - z) > t.r + r);

  // --- rows of buildings along the road
  (spec.rows ?? []).forEach((row, index) => {
    const rng = makeRng((0x5eed + index * 7919) ^ (def.stage * 977)), from = pieceRange(road, row.from, 'start'), to = pieceRange(road, row.to, 'end');
    const sides = row.side === 'both' || row.side == null ? [1, -1] : [row.side], gap = row.gap ?? .5, setback = row.setback ?? 2.5;
    for (const side of sides) {
      let s = from;
      while (s < to) {
        const id = rng.pick(row.pieces), info = PIECES[id], k = row.scale ? rng.range(row.scale[0], row.scale[1]) : 1, width = info.size[0] * k;
        const front = info.z[1] * k, back = -info.z[0] * k, deep = front + back;
        const probe = road.halfWidthAt(s) + WALL_OUT + setback + deep / 2, bend = course.at(s).curvature, arc = Math.max(.4, 1 - bend * side * probe);
        const along = s + (width + gap) / 2 / arc;
        s += (width + gap) / arc;
        const lateral = side * (road.halfWidthAt(along) + WALL_OUT + setback + front);
        const heading = side > 0 ? -HALF_PI : HALF_PI;
        const w = course.worldAt(along, lateral), h = w.heading + heading;
        const corners = footprint(w.x, w.z, h, [-back, front], width / 2), radius = Math.hypot(width, deep) * .4;
        const keep = rng.float() < (row.density ?? 1);
        if (!keep || !check(corners, setback * .6) || !free(w.x, w.z, radius)) continue;
        taken.push({ x: w.x, z: w.z, r: radius });
        place(id, along, lateral, heading, k);
      }
    }
  });

  // --- single landmarks
  for (const single of spec.singles ?? []) {
    const along = pieceRange(road, single.at, 'middle'), info = PIECES[single.id], k = single.scale ?? 1;
    const w = course.worldAt(along, single.lateral), side = Math.sign(single.lateral) || 1, heading = single.heading ?? (side > 0 ? -HALF_PI : HALF_PI);
    const corners = footprint(w.x, w.z, w.heading + heading, [info.z[0] * k, info.z[1] * k], info.size[0] * k / 2);
    if (!check(corners, 2)) throw new Error(`The ${single.id} at ${JSON.stringify(single.at)} would stand on the road, a run-off road or the water.`);
    taken.push({ x: w.x, z: w.z, r: info.size[0] * k * .5 });
    place(single.id, along, single.lateral, heading, k, single.lift ? { lift: single.lift } : {});
  }

  // --- neon signs on short posts (lifted), strings of lanterns across the road (lifted)
  if (spec.signs) {
    const sg = spec.signs, rng = makeRng(0x4e30 ^ (def.stage * 311)), from = pieceRange(road, sg.from, 'start'), to = pieceRange(road, sg.to, 'end');
    let flip = 1;
    for (let s = from; s < to; s += (sg.every ?? 44) * rng.range(.8, 1.25)) {
      const side = sg.side === 'both' || sg.side == null ? (flip = -flip) : sg.side, lateral = side * (road.halfWidthAt(s) + WALL_OUT + .9);
      const w = course.worldAt(s, lateral);
      if (!check([[w.x, w.z]], .4)) continue;
      place('neon-sign', s, lateral, side > 0 ? -HALF_PI : HALF_PI, sg.scale ?? 1.6, { lift: sg.lift ?? 4.6 });
    }
  }
  for (const string of spec.strings ?? []) {
    const from = pieceRange(road, string.from, 'start'), to = pieceRange(road, string.to, 'end'), every = string.every ?? 30, size = PIECES['lantern-string'].size;
    for (let s = from; s <= to + 1e-6; s += every) {
      const reach = road.halfWidthAt(s) + WALL_OUT + .2 + (string.beyond ?? 0), total = reach * 2;
      const ends = [-1, 1].map(side => course.worldAt(s, side * reach));
      if (!check(ends.map(e => [e.x, e.z]), -1.4)) continue;
      const count = Math.max(1, Math.ceil(total / (size[0] - .4))), step = total / count;
      // Heading 0 lays the piece's long side across the road (walls, which run along it, use -PI/2).
      for (let i = 0; i < count; i++) place('lantern-string', s, -reach + step * (i + .5), 0, [step / size[0] * 1.04, 1, 1], { lift: string.lift ?? 5.2 });
    }
  }

  // --- the paddock
  const pad = spec.paddock;
  if (pad?.gantry) place('start-gantry', length + (pad.gantry.at ?? -2.5), 0, Math.PI, Math.max(1, (road.halfWidthAt(0) + WALL_OUT) * 2 / PIECES['start-gantry'].size[0]));
  if (pad?.garages) {
    const g = pad.garages, side = g.side ?? 1, info = PIECES['pit-garage'], from = g.from, to = g.to, lane = g.lane ?? 9;
    for (let s = from; s + info.size[0] <= to; s += info.size[0] + (g.gap ?? .3)) {
      const along = s + info.size[0] / 2, lateral = side * (road.halfWidthAt(along) + WALL_OUT + lane + info.z[1] + .6);
      const w = course.worldAt(along, lateral), heading = side > 0 ? -HALF_PI : HALF_PI;
      if (check(footprint(w.x, w.z, w.heading + heading, [info.z[0], info.z[1]], info.size[0] / 2), lane)) { taken.push({ x: w.x, z: w.z, r: 5 }); place('pit-garage', along, lateral, heading); }
    }
  }
  if (pad?.stands) {
    const st = pad.stands, side = st.side ?? -1, info = PIECES.grandstand;
    for (let s = st.from; s + info.size[0] <= st.to; s += info.size[0] + .6) {
      const along = s + info.size[0] / 2, lateral = side * (road.halfWidthAt(along) + WALL_OUT + (st.setback ?? 4) + info.z[1]);
      const w = course.worldAt(along, lateral), heading = side > 0 ? -HALF_PI : HALF_PI;
      if (check(footprint(w.x, w.z, w.heading + heading, [info.z[0], info.z[1]], info.size[0] / 2), 2)) { taken.push({ x: w.x, z: w.z, r: 7 }); place('grandstand', along, lateral, heading); }
    }
  }

  // --- boats on the water
  for (const [index, group] of (spec.boats ?? []).entries()) {
    const basin = basins.find(item => item.id === group.basin);
    if (!basin) throw new Error(`Boats name no basin called "${group.basin}".`);
    const rng = makeRng((0xb0a7 + index * 131) ^ (def.stage * 53)), mine = [];
    for (let i = 0, tries = 0; i < group.count && tries < group.count * 8; tries++) {
      const du = rng.range(-.8, .8) * basin.along, dv = rng.range(-.8, .8) * basin.across;
      const k = rng.range(.9, 1.35), heading = rng.chance(.7) ? HALF_PI : rng.range(0, Math.PI * 2);
      if (basinReach(basin, du, dv) > .65) continue;
      const along = basin.s + du, lateral = basin.lateral + dv, w = course.worldAt(along, lateral);
      if (mine.some(m => Math.hypot(m.x - w.x, m.z - w.z) < 9)) continue;
      mine.push(w); i++;
      place('harbour-boat', along, lateral, heading, k, group.lift ? { lift: group.lift } : {});
    }
  }
  return out;
}
