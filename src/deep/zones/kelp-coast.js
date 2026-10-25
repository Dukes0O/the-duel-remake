// The Kelp Coast: the first real dive of The Deep (docs/THE_DEEP.md sections 4,
// 6 and 10.1). Zone data only: nothing here draws, drives or saves.
//
// A zone provider receives the Pacific ramp that was resolved for this route
// and returns the zone as plain data. The ramp's position differs between the
// three route layouts, so the loop is authored in the ramp's own frame (`f`
// metres straight out from the foot of the ramp, `l` metres to its left) and
// turned into world metres at the end. Around every route's foot the open
// water is a wedge that widens seaward, and beyond about 500 m the sea is
// clear on all three routes, so one shape fits them all (the test checks
// each one against the course's own terrain).
//
// The loop, about 3.1 km:
//   - a stem straight out from the foot over open sand and seagrass (Ramp
//     Shallows), with a sand gully in it;
//   - a ring offshore: west along its inner edge through the Kelp Forest (a
//     second gully), round the far end and east along the lip of the cliff
//     (The Drop-off), round the east end and back west along the ring's inner
//     edge, then down a second lane of the stem;
//   - a short spur into the foot, where the two lanes meet at the ramp.
// The ramp's foot is the only place the trail has a corner: land lies behind
// it, so the loop has to turn round there, and it does so in a 55 degree V.
const STEP = 8;                    // metres between trail points
const SEA_FLOOR_TRAIL = 'sea-floor';
const round = value => Math.round(value * 1000) / 1000;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// The loop as corner points (f, l) with the radius each corner is rounded to.
const CORNERS = Object.freeze([
  { f: 0, l: 0, r: 0 },            // the foot of the ramp
  { f: 560, l: 0, r: 70 },         // top of the outgoing lane
  { f: 560, l: -400, r: 65 },      // west end of the ring, inner edge
  { f: 690, l: -400, r: 65 },      // west end, along the lip
  { f: 690, l: 560, r: 65 },       // east end, along the lip
  { f: 560, l: 560, r: 65 },       // east end, inner edge
  { f: 560, l: 80, r: 60 },        // top of the returning lane
  { f: 140, l: 80, r: 200 },       // easing in towards the foot
  { f: 35, l: 50, r: 0 },          // last point; the loop closes to the foot
]);

const GULLY = Object.freeze({ depth: 3 });
const LIP_F = 688;                 // the ring's far edge, The Drop-off

// ---- the path -----------------------------------------------------------------

function unit(a, b) {
  const length = Math.hypot(b.f - a.f, b.l - a.l);
  return { f: (b.f - a.f) / length, l: (b.l - a.l) / length, length };
}
function pieces(corners) {
  const out = [];
  let from = { f: corners[0].f, l: corners[0].l };
  for (let i = 1; i < corners.length; i++) {
    const corner = corners[i], next = corners[i + 1];
    if (!next || !(corner.r > 0)) { out.push({ line: [from, { f: corner.f, l: corner.l }] }); from = { f: corner.f, l: corner.l }; continue; }
    const u = unit(corners[i - 1], corner), v = unit(corner, next);
    const turn = Math.acos(Math.max(-1, Math.min(1, u.f * v.f + u.l * v.l)));
    const tangent = corner.r * Math.tan(turn / 2);
    const start = { f: corner.f - u.f * tangent, l: corner.l - u.l * tangent };
    const end = { f: corner.f + v.f * tangent, l: corner.l + v.l * tangent };
    if (tangent > Math.min(u.length, v.length) + 1e-6) throw new Error('Kelp Coast corner radius does not fit');
    const side = Math.sign(u.f * v.l - u.l * v.f);
    const centre = { f: start.f - u.l * side * corner.r, l: start.l + u.f * side * corner.r };
    out.push({ line: [from, start] });
    out.push({ arc: { centre, r: corner.r, from: Math.atan2(start.l - centre.l, start.f - centre.f), sweep: side * turn } });
    from = end;
  }
  return out;
}
function sample(corners) {
  const points = [];
  const push = (f, l) => {
    const last = points.at(-1);
    if (!last || Math.hypot(f - last.f, l - last.l) > 1e-6) points.push({ f, l });
  };
  for (const piece of pieces(corners)) {
    if (piece.line) {
      const [a, b] = piece.line, length = Math.hypot(b.f - a.f, b.l - a.l);
      const count = Math.max(0, Math.round(length / STEP));
      for (let k = 0; k <= count; k++) push(a.f + (b.f - a.f) * k / (count || 1), a.l + (b.l - a.l) * k / (count || 1));
    } else {
      const { centre, r, from, sweep } = piece.arc, count = Math.max(1, Math.round(Math.abs(sweep) * r / STEP));
      for (let k = 0; k <= count; k++) {
        const angle = from + sweep * k / count;
        push(centre.f + r * Math.cos(angle), centre.l + r * Math.sin(angle));
      }
    }
  }
  return points;
}

// ---- the sea floor along it ---------------------------------------------------

const first = (path, from, to, test) => {
  for (let i = from; i <= to; i++) if (test(path[i], i)) return i;
  throw new Error('Kelp Coast marker not found');
};
const lastIn = (path, from, to, test) => {
  for (let i = to; i >= from; i--) if (test(path[i], i)) return i;
  throw new Error('Kelp Coast marker not found');
};

// Depth anchors along the path (index, metres, ripple): the floor eases from one
// to the next, with a gentle ripple riding on it. The shallows stay 5 to 10 m,
// the forest 10 to 20 m, and the lip about 25 m.
function anchors(path) {
  const n = path.length, at = (test, from = 0) => first(path, from, n - 1, test);
  const mA = at(p => p.f >= 300), mB = at(p => p.f >= 340), mC = at(p => p.f >= 556);
  const mD = lastIn(path, mC, n - 1, p => p.f <= 562 && p.l <= -335);
  const mE = at(p => p.f >= LIP_F, mD), mF = lastIn(path, 0, n - 1, p => p.f >= LIP_F);
  const mG = at(p => p.f <= 562 && p.l >= 400, mF), mH = at(p => p.f <= 340 && p.l < 200, mG);
  const mI = at(p => p.f <= 300 && p.l < 200, mG), foot = at(p => p.f <= 60, mG);
  return [[0, 8, 0], [at(p => p.f >= 60), 6.5, .7], [mA, 6.5, .7], [mB, 13, 2], [mC, 13, 2], [mD, 14.5, 2],
    [mE, 25, .6], [mF, 25, .6], [mG, 17, 1.5], [mH, 13, 1.5], [mI, 6.8, .7], [foot, 7, .5], [n - 1, 7, 0]];
}
function depthProfile(path) {
  const key = anchors(path), n = path.length, base = new Array(n);
  for (let i = 0; i < n; i++) {
    let k = 0;
    while (k < key.length - 2 && i > key[k + 1][0]) k++;
    const [i0, d0, r0] = key[k], [i1, d1, r1] = key[k + 1];
    const t = i1 > i0 ? smooth(i0, i1, i) : 1;
    // The ripple fades in and out with the anchors' own sizes and is zero at the foot of the ramp.
    base[i] = d0 + (d1 - d0) * t + (r0 + (r1 - r0) * t) * Math.sin(i * STEP / 41 + 1.3) * (i === 0 ? 0 : 1);
  }
  base[0] = 8;
  return base;
}

// Named stretches, found from the finished depths: the forest is where the
// floor is 10 to 20 m down, the lip where it is deeper than that.
function stretches(path, depth) {
  const n = path.length, outTop = first(path, 0, n - 1, p => p.f >= 556);
  const shallowsEnd = first(path, 1, n - 1, (p, i) => depth[i] >= 10.2 && i > 20);
  const lipStart = first(path, outTop, n - 1, (p, i) => depth[i] > 20);
  const lipEnd = lastIn(path, lipStart, n - 1, (p, i) => depth[i] > 20);
  const returnShallows = first(path, lipEnd, n - 1, (p, i) => depth[i] <= 9.8);
  return { n, outTop, shallowsEnd, lipStart, lipEnd, returnShallows };
}

function look(index, marks) {
  const { shallowsEnd, lipStart, lipEnd, returnShallows } = marks;
  if (index < shallowsEnd || index >= returnShallows) return { kelp: 0, grass: .8, rock: .05 };
  if (index < lipStart || index > lipEnd) return { kelp: 1, grass: .1, rock: .2 };
  return { kelp: .15, grass: 0, rock: .95 };
}

function widthAt(index, marks) {
  if (index === 0) return 6;                                       // the foot of the ramp is a 6 m cove
  if (index >= marks.lipStart && index <= marks.lipEnd) return 14;
  if (index >= marks.shallowsEnd && index < marks.returnShallows) return 18;
  return 16;
}

// ---- the provider ---------------------------------------------------------------

export function kelpCoastProvider(ramp) {
  // DEEP-RAMP-2: the new road fall line must not rotate the established offshore loop into land.
  const end = ramp.points.at(-1), heading = ramp.diveHeading ?? ramp.heading, mirror = ramp.side === 'right' ? -1 : 1;
  const fx = Math.sin(heading), fz = Math.cos(heading), lx = Math.cos(heading) * mirror, lz = -Math.sin(heading) * mirror;
  const world = p => ({ x: end.x + fx * p.f + lx * p.l, z: end.z + fz * p.f + lz * p.l });
  const path = sample(CORNERS), base = depthProfile(path), marks = stretches(path, base);

  // Two sand gullies from the trail's own depths: a stretch about 3 m deeper
  // with a lip on each side, one in the shallows and one in the forest.
  const inGully = (p, index) =>
    (index < marks.shallowsEnd && p.f >= 188 && p.f <= 228) ||
    (index > marks.outTop && index < marks.lipStart && p.l >= -234 && p.l <= -194);

  const trail = path.map((p, index) => {
    const w = world(p), depth = base[index] + (inGully(p, index) ? GULLY.depth : 0);
    // The first point is the ramp's own end, exactly; the others are tidied to a millimetre.
    return { x: index ? round(w.x) : w.x, z: index ? round(w.z) : w.z, depth: round(depth), width: widthAt(index, marks),
      surface: SEA_FLOOR_TRAIL, ...look(index, marks) };
  });

  // Index of the first path point past a test, searching only [from, to].
  const find = (test, from = 0, to = path.length - 1) => {
    for (let i = from; i <= to; i++) if (test(path[i], i)) return i;
    throw new Error('Kelp Coast marker not found');
  };
  const seaward = index => {                       // +1 or -1: which side of the trail faces open sea
    const a = world(path[Math.max(0, index - 1)]), b = world(path[Math.min(path.length - 1, index + 1)]);
    const length = Math.hypot(b.x - a.x, b.z - a.z), tx = (b.x - a.x) / length, tz = (b.z - a.z) / length;
    return Math.sign(tz * fx - tx * fz) || 1;       // left normal is (tz, -tx); sea is the ramp's forward way
  };
  const lipOffset = (index, inset) => seaward(index) * (trail[index].width / 2 - inset);

  const lipMid = find(p => p.f >= LIP_F - 1 && p.l >= 40, marks.lipStart);
  const lipCar = find(p => p.f >= LIP_F - 1 && p.l >= 330, marks.lipStart);
  const lipDoor = find(p => p.f >= LIP_F - 1 && p.l >= -150, marks.lipStart);
  const forestA = find(p => p.f >= 556 && p.l <= -120, marks.outTop);
  const forestB = find(p => p.f >= 556 && p.l <= -300, marks.outTop);

  return {
    id: 'kelp-coast', circuit: 'pacific-canyon', switch: 'the-deep',
    ramp: { atDistance: ramp.atDistance, side: ramp.side, length: 120, endDepth: 8 },
    trail,
    places: [
      // The shallows run from the lower lane round the foot to the top of the sand.
      { id: 'ramp-shallows', name: 'Ramp Shallows', fromIndex: marks.returnShallows, toIndex: marks.shallowsEnd - 1 },
      { id: 'kelp-forest', name: 'The Kelp Forest', fromIndex: marks.shallowsEnd, toIndex: marks.lipStart - 1 },
      { id: 'drop-off', name: 'The Drop-off', fromIndex: marks.lipStart, toIndex: marks.lipEnd },
    ],
    pearls: [
      { id: 'kelp-1', trailIndex: find(p => p.f >= 110), offset: 3 },
      { id: 'kelp-2', trailIndex: find(p => p.f >= 556 && p.l <= -60, marks.outTop), offset: -3 },
      { id: 'kelp-3', trailIndex: lipMid, offset: lipOffset(lipMid, 2) },       // on a rock at the lip
    ],
    spots: [
      { creature: 'turtle', trailIndex: find(p => p.f >= 140), count: 2 },
      { creature: 'ray', trailIndex: find(p => p.f >= 262), count: 1 },
      { creature: 'crab', trailIndex: find(p => p.f >= 60), count: 4 },
      { creature: 'silver-school', trailIndex: forestA, count: 3 },
      { creature: 'sea-lion', trailIndex: forestB, count: 2 },
      { creature: 'otter', trailIndex: find(p => p.f >= 556 && p.l <= -360, marks.outTop), count: 1 },
      { creature: 'whale', trailIndex: lipMid, count: 1 },
    ],
    // The Falcone Sirena, in story order (THE_DEEP 6.2 and 10.1).
    finds: [
      { id: 'sirena-badge', trailIndex: 3, offset: 2, below: 0 },
      { id: 'sirena-steering-wheel', trailIndex: forestA, offset: -3, below: 0 },
      { id: 'sirena-wheel', trailIndex: forestB, offset: 3, below: 0 },
      { id: 'sirena-bonnet', trailIndex: marks.lipStart - 5, offset: 0, below: 0 },
      { id: 'sirena-door', trailIndex: lipDoor, offset: lipOffset(lipDoor, 1.5), below: 0 },
      { id: 'sirena-car', trailIndex: lipCar, offset: lipOffset(lipCar, 1), below: 3 },
    ],
  };
}
