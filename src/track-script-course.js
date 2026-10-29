// Puts an authored track script (src/track-script.js) into a Course: the
// sampled centreline, the finish, the racing line and the solid walls. Like the
// Pit's builder, this runs only for definitions that carry a `script`.
import { TRACK_SCRIPT, TrackScriptError, buildRacingLine } from './track-script.js';
import { escapeRoadsFor, escapeFrame } from './escape-roads.js';
import { checkSurfaceRules, iceBoards, winterBankPatches } from './race-surfaces.js';
import { hillLocal, hillReach, hillHeight, runWeight, basinReach } from './circuit-hills.js';
import { makeRng } from './rng.js';
import { renderedGroundHeight } from './rendered-ground.js';
import {installPitLane, pitAt} from './pit-lane.js';
import { KIT_FOOTPRINTS } from './kit-footprints.js';

// Cars are slower than the course's top speed on tight corners; the racing line
// is stored for a reference car and computer racers scale it to their own. A
// circuit may shape its line with a `racingLine` block (see buildRacingLine).
export function installTrackScript(course, dynamics) {
  const script = course.script, f = course.features;
  course.samples = script.samples.map(sample => ({ ...sample }));
  // Authored branches use the same real lateral road model as older shortcuts.
  for (const branch of course.def.roadBranches ?? []) {
    if (!(branch.start >= 0 && branch.end > branch.start && branch.end <= course.length &&
      Number.isFinite(branch.offset) && branch.halfWidth > 0 && [1,-1].includes(branch.side)))
      throw new TrackScriptError('An authored branch needs a bounded road range and width.');
    f.shortcuts.push({...branch,offset:branch.offset*branch.side,transition:.15});
  }
  f.tunnels.push(...(course.def.galleries ?? []).map(gallery=>({...gallery})));
  installPitLane(course);
  course.racingLine = buildRacingLine(script, { ...dynamics, ...(course.def.racingLine ?? {}) });
  f.walls = [];
  f.kerbs = script.kerbs.map(kerb => ({ ...kerb }));
  f.boards = script.boards.map(board => ({ ...board }));
  // Surface patches (ice, a drift of deep snow...) lie on top of the script's stretches.
  f.surfacePatches = (course.def.surfacePatches || []).map(patch => ({ from: -Infinity, to: Infinity, ...patch }));
  f.surfacePatches.push(...winterBankPatches(script, course.def.snowWorld));
  const problems = checkSurfaceRules(script, f.surfacePatches);
  if (problems.length) throw new TrackScriptError(`Track script "${script.id}" breaks the surface rules: ${problems.join(' ')}`);
  f.boards.push(...iceBoards(script, f.surfacePatches));
  if (!course.def.practice) f.checkpoints.push({ s: course.raceLength, kind: 'finish' });
  if (!course.def.practice) for (let i = 1; i < 4; i++) f.lapGates.push({ s: course.length * i / 4 });
}

// Walls are short solid boxes of finite height, so a car airborne over a crest
// clears one while a grounded car hits it (the POLISH-HEIGHT rules).
function wallSegments(course) {
  const script = course.script, walls = [];
  let serial = 0;
  const escapes = course.escapeRoads = escapeRoadsFor(course);
  for (const span of script.walls) {
    const tight = script.pieces[span.piece].radius < 30;
    const target = tight ? 3 : 4, count = Math.max(1, Math.ceil((span.s1 - span.s0) / target));
    const size = (span.s1 - span.s0) / count;
    for (let i = 0; i < count; i++) {
      const a = span.s0 + i * size, b = a + size, c = (a + b) / 2;
      const off = span.side * (script.halfWidthAt(c) + TRACK_SCRIPT.wallSetback + TRACK_SCRIPT.wallThickness / 2);
      const centre = course.groundAt(c, off);
      if (escapes.some(escape => inEscapeOpening(course, escape, c, centre))) continue;
      const heights = [a, c, b].map(s => course.groundAt(s, span.side * (script.halfWidthAt(s) + TRACK_SCRIPT.wallSetback + TRACK_SCRIPT.wallThickness / 2)).y);
      const low = Math.min(...heights), high = Math.max(...heights);
      walls.push({
        id: `wall-${span.side > 0 ? 'left' : 'right'}-${serial++}`, kind: 'prop', shape: 'box', barrier: true, trackWall: true, side: span.side,
        s: course.phase(c), off, x: centre.x, y: low - .1, z: centre.z, heading: centre.heading,
        halfX: TRACK_SCRIPT.wallThickness / 2, halfZ: size / 2 + .05,
        height: high - low + .1 + TRACK_SCRIPT.wallHeight,
        minY: low - .1, maxY: high + TRACK_SCRIPT.wallHeight,
        theme: course.themeAt(c),
      });
    }
  }
  for (const escape of escapes) walls.push(...escapeWalls(course, escape, serial));
  return walls;
}

// ---------------------------------------------------------------------------
// Escape roads (a circuit's `escapeRoads`): a straight run-off on the outside
// of a named turn, behind an opening in the wall. The car that misses the turn
// goes through the opening onto loose ground (the ordinary off-road rules slow
// it) and meets a tyre wall at the far end. The road script is not changed:
// only the wall drawn along it is opened, and the new walls are added here.
// ---------------------------------------------------------------------------

function inEscapeOpening(course, escape, s, centre) {
  const along = ((course.phase(s) - escape.s0 + course.length * 1.5) % course.length) - course.length / 2;
  if (Math.abs(along) > 200) return false; // another part of the lap
  const { u, v } = escapeFrame(escape, centre.x, centre.z);
  return u > -1.5 && u < escape.run + 1.5 && v > escape.inner - .8 && v < escape.outer + 1.2;
}

function escapeWalls(course, escape, firstSerial) {
  const walls = [], thick = TRACK_SCRIPT.wallThickness, height = TRACK_SCRIPT.wallHeight;
  const groundAtWorld = (x, z) => { const n = course.nearest(x, z); return course.groundAt(n.s, n.lateral); };
  const place = (id, u, v, heading, halfX, halfZ, tall, extra = {}) => {
    const x = escape.origin.x + escape.forward.x * u + escape.left.x * escape.side * v, z = escape.origin.z + escape.forward.z * u + escape.left.z * escape.side * v;
    const found = course.nearest(x, z), ground = course.groundAt(found.s, found.lateral);
    const c = Math.cos(heading), n = Math.sin(heading);
    const heights = [[-1, -1], [1, 1], [-1, 1], [1, -1], [0, 0]].map(([a, b]) => groundAtWorld(x + c * a * halfX + n * b * halfZ, z - n * a * halfX + c * b * halfZ).y);
    const low = Math.min(...heights, ground.y), high = Math.max(...heights, ground.y);
    return { id, kind: 'prop', shape: 'box', barrier: true, trackWall: true, side: escape.side, escapeRoad: escape.id, ...extra,
      s: course.phase(found.s), off: found.lateral, x, y: low - .1, z, heading, halfX, halfZ, height: high - low + .1 + tall, minY: low - .1, maxY: high + tall,
      theme: course.themeAt(found.s) };
  };
  // The outer wall carries straight on beside the run-off.
  const count = Math.max(1, Math.ceil(escape.run / 4)), size = escape.run / count;
  for (let i = 0; i < count; i++) walls.push(place(`wall-${escape.id}-${i}`, (i + .5) * size, escape.outer + thick / 2, escape.heading, thick / 2, size / 2 + .05, height));
  // The tyre wall across the far end.
  const across = (escape.outer + thick - escape.inner + 1.6) / 2, middle = (escape.inner - .8 + escape.outer + thick) / 2;
  walls.push(place(`tyres-${escape.id}`, escape.run + escape.tyreDepth / 2, middle, escape.heading + Math.PI / 2, escape.tyreDepth / 2, across, 1.3, { tyreWall: true }));
  return walls;
}

// Trees, rocks, mountains and (in a city section) street blocks, placed with the
// course's own seeded generator so a seed always gives the same scenery. Nothing
// goes on the road, inside the runoff beside it, or on the inside of a corner
// where it would hide the exit.
function scatterScenery(course) {
  const f = course.features, rng = course.rng, script = course.script, TAU = Math.PI * 2;
  const options = { trees: 800, rocks: 190, mountains: true, ...(course.def.scenery ?? {}) };
  const add = (id, kind, s, off, halfX, halfZ, angle = 0, extra = {}) => {
    const p = course.groundAt(s, off), o = { id, kind, s: course.phase(s), off, x: p.x, y: p.y, z: p.z, heading: p.heading + angle, halfX, halfZ, shape: 'box', theme: course.themeAt(s), ...extra };
    f.obstacles.push(o); return o;
  };
  const roadClear = (s, off, radius = 0, margin = 2) => {
    if (course.pitLane && s >= course.pitLane.entry - 8 && s <= course.pitLane.exit + 8 &&
      Math.abs(off - course.pitLane.offsetAt(s)) < course.pitLane.width / 2 + radius + margin + 4) return false;
    const p = course.worldAt(s, off), n = course.nearest(p.x, p.z), width = course.roadHalfWidthAt(n.s);
    const side = Math.sign(n.lateral) || 1, room = Math.max(3, script.runoffAt(n.s, side));
    if (n.distance < width + room + radius + margin) return false;
    // Keep the inside of every corner open so the exit can be seen.
    const piece = script.pieceAt(n.s);
    if (piece.kind === 'turn' && side === piece.dir && n.distance < width + 30 + radius) return false;
    // Nor in the water of a basin.
    if ((course.def.basins ?? []).some(basin => basinReach(basin, course.phase(n.s) - basin.s, n.lateral - basin.lateral) < 1.15)) return false;
    // Nor on a run-off road or its walls.
    for (const escape of course.escapeRoads ?? []) {
      const { u, v } = escapeFrame(escape, p.x, p.z), slack = radius + margin + 3;
      if (u > -slack && u < escape.run + slack + escape.tyreDepth && v > escape.inner - slack && v < escape.outer + slack + 1) return false;
    }
    return true;
  };
  const vacant = (s, off, radius) => {
    const p = course.groundAt(s, off);
    return f.obstacles.every(o => Math.hypot(o.x - p.x, o.z - p.z) > Math.hypot(o.halfX, o.halfZ) + radius);
  };
  // A circuit can keep planted scenery out of places it draws itself: stretches
  // (`scenery.clear`: s0, s1 along the road, from, to across it), its hills, and
  // a radius around its kit pieces (`clear` on each of `kitPlacements`).
  const keepClear = [...(course.def.scenery?.clear ?? [])], hills = course.def.hills ?? [];
  const blocked = [];
  for (const kit of course.def.kitPlacements ?? []) if (kit.clear > 0) { const p = course.groundAt(kit.s, kit.lateral); blocked.push({ x: p.x, z: p.z, radius: kit.clear }); }
  const cleared = (s, off, radius = 0) => {
    const phase = course.phase(s);
    if (keepClear.some(zone => phase >= zone.s0 - radius && phase <= zone.s1 + radius && off >= zone.from - radius && off <= zone.to + radius)) return true;
    if (hills.some(hill => hillReach(hill, ...hillLocal(hill, phase, off)) < 1.02 + radius / hill.along)) return true;
    if (!blocked.length) return false;
    const p = course.groundAt(s, off);
    return blocked.some(kit => Math.hypot(kit.x - p.x, kit.z - p.z) < kit.radius + radius);
  };
  for (let i = 0; i < options.rocks; i++) {
    const s = rng.range(50, course.length - 50), off = (i % 2 ? 1 : -1) * rng.range(18, 72), sx = rng.range(1.3, 4), sz = rng.range(1.2, 4), sy = rng.range(.9, 3), angle = rng.range(0, TAU);
    if (!roadClear(s, off, Math.hypot(sx, sz), 4) || !vacant(s, off, 5) || cleared(s, off, Math.hypot(sx, sz))) continue;
    const rock = { s, off, theme: course.themeAt(s), scale: [sx, sy, sz], angle, radiusX: sx, radiusZ: sz };
    f.rocks.push(rock); add(`rock-${i}`, 'rock', s, off, sx, sz, angle, { shape: 'ellipse', source: rock });
  }
  if (options.mountains) {
    for (let i = 0; i < Math.floor(course.length / 95); i++) {
      const s = rng.range(0, course.length), theme = course.themeAt(s);
      if (theme === 'city') continue;
      const sx = rng.range(55, 115), sz = rng.range(55, 110), height = rng.range(65, theme === 'alpine' ? 200 : 120), side = i % 2 ? 1 : -1;
      let off = side * rng.range(180, 330); const radius = Math.hypot(sx, sz) * 1.1;
      for (let j = 0; j < 9 && (!roadClear(s, off, radius, 25) || cleared(s, off, radius)); j++) off += side * 40;
      if (!roadClear(s, off, radius, 25) || cleared(s, off, radius)) continue;
      f.mountains.push(add(`mountain-${i}`, 'mountain', s, off, sx, sz, rng.range(0, TAU), { height, scale: [sx, height, sz], shape: 'ellipse' }));
    }
  }
  for (const section of course.sections) if (section.theme === 'city') {
    let index = 0;
    for (const row of [0, 1]) for (let s = section.start + 35; s < section.end - 30; s += row ? 62 : 29) for (const side of [-1, 1]) {
      const hx = row ? rng.range(10, 18) : rng.range(6.5, 9.5), hz = row ? rng.range(15, 22) : rng.range(10.5, 13), off = side * (row ? rng.range(85, 120) : rng.range(28, 34));
      if (!roadClear(s, off, Math.hypot(hx, hz), 3) || !vacant(s, off, Math.hypot(hx, hz) * .78)) continue;
      const building = add(`warehouse-${section.start}-${index++}`, 'building', s, off, hx, hz, 0, { height: row ? rng.range(28, 66) : rng.range(11, 29) });
      let lowest = building.y;
      for (const u of [-1, -.5, 0, .5, 1]) for (const v of [-1, -.5, 0, .5, 1]) {
        const x = u * hx, z = v * hz, c = Math.cos(building.heading), sn = Math.sin(building.heading);
        const n = course.nearest(building.x + c * x + sn * z, building.z - sn * x + c * z);
        lowest = Math.min(lowest, course.groundAt(n.s, n.lateral).y);
      }
      building.foundationDepth = building.y - lowest + .65; f.buildings.push(building);
    }
  }
  for (let i = 0; i < options.trees; i++) {
    const randomS = rng.range(5, course.length - 5);
    // Authored clusters use the same seeded draw count and retain open exits.
    const s = options.clusteredTrees ? Math.max(5,Math.min(course.length-5,
      Math.round(randomS/130)*130+(i%7-3)*7)) : randomS, theme = course.themeAt(s);
    if (theme === 'city' && i % 5 || theme === 'desert' && i % 3) continue;
    const off = (i % 2 ? 1 : -1) * rng.range(13, 80), scale = rng.range(.65, 1.7);
    if (roadClear(s, off, 2.1 * scale, 3) && vacant(s, off, 2.1 * scale) && !cleared(s, off, 2.1 * scale) && course.groundAt(s, off).y > -12) f.trees.push(add(`tree-${i}`, 'tree', s, off, .23 * scale, .23 * scale, rng.range(0, TAU), { scale }));
  }
  // Pines on a hill the circuit draws (circuit-hills.js), standing on its slope
  // and never on a ski run. Drawn after everything else so the rest is unchanged.
  hills.forEach((hill, h) => {
    for (let i = 0; i < (hill.pines ?? 0); i++) {
      const s = hill.s + rng.range(-hill.along, hill.along), off = hill.lateral + rng.range(-hill.across, hill.across), scale = rng.range(.8, 1.9);
      const [du, dv] = hillLocal(hill, s, off), p = course.groundAt(s, off);
      if (hillReach(hill, du, dv) > .96 || runWeight(hill, du, dv) > .02 || blocked.some(kit => Math.hypot(kit.x - p.x, kit.z - p.z) < kit.radius)) continue;
      const tree = add(`hill-tree-${h}-${i}`, 'tree', s, off, .23 * scale, .23 * scale, rng.range(0, TAU), { scale });
      tree.y += hillHeight(hill, du, dv);
      f.trees.push(tree);
    }
  });
  // A forest (`scenery.forest`): rows of pines behind the runoff all the way
  // round, from `from` to `to` metres beyond the road edge, one every `spacing`
  // metres in each of `rows` rows. The same checks as any planted tree keep it
  // off the road, the runoff and the inside of corners; the circuit's clear
  // zones and kit pieces keep it off the lake, the lift and the paddock. It has
  // its own random stream, so a circuit without one is exactly as it was.
  // A far forest (`scenery.farForest`, the same fields plus its own `clear`
  // stretches) is a second band planted after the first with its own random
  // stream and names (`far-forest-N`), so the first band's trees, names and
  // draws are exactly as they were; it only avoids the spots already taken.
  // Its trees stand on the drawn ground (rendered-ground.js), which beyond
  // the first band can differ from the course's own ground by metres.
  const plantBand = (band, random, prefix, {zones = [], drawnGround = false} = {}) => {
    const taken = new Map(), cell = 6;
    const key = (x, z) => `${Math.floor(x / cell)}:${Math.floor(z / cell)}`;
    const claim = (x, z) => { const k = key(x, z); if (!taken.has(k)) taken.set(k, []); taken.get(k).push([x, z]); };
    for (const o of f.obstacles) claim(o.x, o.z);
    const crowded = (x, z, radius) => {
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++)
        for (const [ox, oz] of taken.get(key(x + i * cell, z + j * cell)) ?? []) if (Math.hypot(ox - x, oz - z) < radius) return true;
      return false;
    };
    const ownClear = (s, off, radius) => {
      const phase = course.phase(s);
      return zones.some(zone => phase >= zone.s0 - radius && phase <= zone.s1 + radius && off >= zone.from - radius && off <= zone.to + radius);
    };
    // `crowd` (default 3.2) is how many crown widths apart planted trees keep.
    const { from = 13, to = 30, spacing = 6, rows = 3, thin = .35, scale: scaleRange, clumps, jitter = .9, crowd: crowding = 3.2 } = band;
    const authoredRanges=band.ranges;
    if(authoredRanges&&(!Array.isArray(authoredRanges)||!authoredRanges.length||authoredRanges.some(range=>
      !Number.isFinite(range.from)||!Number.isFinite(range.to)||range.from<0||range.to>course.length||range.to<=range.from)))
      throw new TrackScriptError('Forest ranges must lie on their authored course.');
    let serial = 0;
    if (band.groves) { plantGroves(); return; }
    // Groves (`groves: {every, chance, radius: [least, most], spacing, crowd, size, lone, minGrove, skyline}`): clumps of firs
    // with bare ground between, the way spruce stands cover the Ardennes hills. A grove's centre is picked every `every` m
    // along each side of the road (kept with `chance`, less often toward the back), at `from` to `to` m out; its trees
    // stand on a jittered grid of `spacing` m inside `radius`, thinner and smaller toward a ragged edge. Trees may crowd
    // each other to `crowd` crown widths. A grove with fewer than `minGrove` trees is dropped, and a tree that would stand
    // against the sky as seen from the road beside it (no ground behind it rises above its top) is dropped too unless
    // `lone` other trees stand within 14 m, so only groves, never single trees, reach the ridge lines.
    function plantGroves() {
      const { every, chance, radius: [rLeast, rMost], spacing: grid, crowd = 1.6, size = .3, lone = 5, minGrove = 6, rise = 0 } = band.groves;
      const sky = band.groves.skyline ?? {}, seeAhead = sky.reach ?? 1100;
      const eyeHeight = sky.eye ?? 6, topHeight = sky.top ?? 6.5;
      const clearOf = (n, scale) => cleared(n.s, n.lateral, 2.5 * scale) || zones.length && ownClear(n.s, n.lateral, 2.5 * scale);
      // True when ground behind the tree, as seen from the nearest road, never rises to the tree's top: it would show against sky.
      const againstSky = (tree, n) => {
        const road = course.worldAt(n.s, 0), eye = course.groundAt(n.s, 0).y + eyeHeight, dx = tree.x - road.x, dz = tree.z - road.z;
        const reach = Math.hypot(dx, dz);
        if (reach < 1) return false;
        const ux = dx / reach, uz = dz / reach, top = (tree.y + topHeight * tree.scale - eye) / reach;
        let best = -Infinity, step = 14;
        for (let d = reach + step; d < reach + seeAhead; d += step, step = Math.min(70, step * 1.25)) {
          const y = renderedGroundHeight(course, { x: road.x + ux * d, z: road.z + uz * d, s: n.s, off: n.lateral }, { requireSurface: true });
          if (Number.isFinite(y)) best = Math.max(best, (y - eye) / d);
        }
        return top > best;
      };
      for (const side of [-1, 1]) for (let base = 6; base < course.length - 6; base += every) {
        const s = base + random.float() * every, depth = from + (to - from) * random.float();
        if (random.float() > chance || random.float() < thin * (depth - from) / Math.max(1, to - from)) continue;
        const centre = course.worldAt(s, side * (course.roadHalfWidthAt(s) + depth)), radius = random.range(rLeast, rMost);
        const found = [];
        for (let u = -radius; u <= radius; u += grid) for (let v = -radius; v <= radius; v += grid) {
          const x = centre.x + u + (random.float() - .5) * grid * jitter, z = centre.z + v + (random.float() - .5) * grid * jitter;
          const reach = Math.hypot(x - centre.x, z - centre.z) / radius, keep = random.float(), grown = random.range(.9, 1.7), angle = random.range(0, TAU);
          if (reach > 1 || keep > 1 - .8 * reach * reach) continue;
          let scale = scaleRange ? scaleRange[0] + (grown - .9) / .8 * (scaleRange[1] - scaleRange[0]) : grown;
          scale *= 1 + size * (.6 - reach);
          const n = course.nearest(x, z), edge = n.distance - course.roadHalfWidthAt(n.s);
          if (edge < from + .5 || edge > to - .5 || clearOf(n, scale)) continue;
          const piece = script.pieceAt(n.s);
          if (piece.kind === 'turn' && Math.sign(n.lateral) === piece.dir && n.distance < course.roadHalfWidthAt(n.s) + 30) continue;
          const p = course.worldAt(n.s, n.lateral);
          // Flat ground behind the first band is hidden by it; only slopes that climb above the road are worth a tree.
          if (rise > 0 && renderedGroundHeight(course, { x: p.x, z: p.z, s: n.s, off: n.lateral }) - course.groundAt(n.s, 0).y < rise) continue;
          if (crowded(p.x, p.z, crowd * scale)) continue;
          claim(p.x, p.z);
          found.push({ s: n.s, off: n.lateral, scale, angle, n });
        }
        if (found.length < minGrove) continue;
        const trees = found.map(row => { const t = add(`${prefix}-${serial}`, 'tree', row.s, row.off, .23 * row.scale, .23 * row.scale, row.angle, { scale: row.scale }); t.y = renderedGroundHeight(course, t); t.farForest = true; return t; });
        found.forEach((row, i) => {
          const tree = trees[i];
          if (!againstSky(tree, row.n)) return;
          if (trees.filter(other => other !== tree && Math.hypot(other.x - tree.x, other.z - tree.z) < 14).length >= lone) return;
          tree.dropped = true;
        });
        // What the skyline cut leaves must still be a grove: nobody stands with fewer than two others within 14 m.
        for (let again = true; again;) {
          again = false;
          for (const tree of trees) if (!tree.dropped && trees.filter(other => other !== tree && !other.dropped && Math.hypot(other.x - tree.x, other.z - tree.z) < 14).length < 2) { tree.dropped = true; again = true; }
        }
        for (const tree of trees) {
          if (tree.dropped) { f.obstacles.splice(f.obstacles.lastIndexOf(tree), 1); continue; }
          tree.id = `${prefix}-${serial++}`; f.trees.push(tree);
        }
      }
    }
    for (const side of band.sides ?? [-1, 1]) for (let base = 6; base < course.length - 6; base += spacing) for (let row = 0; row < rows; row++) {
      const s = base + (random.float() - .5) * spacing * jitter, depth = from + (to - from) * (row + random.float()) / rows;
      if(authoredRanges){
        const range=authoredRanges.find(range=>s>=range.from&&s<=range.to);
        if(!range)continue;
        if(range.fadeOut>0&&random.float()>Math.min(1,(range.to-s)/range.fadeOut))continue;
        // `fadeIn`: the same thinning at the start of the range (a reversed road meets the wood at its far end).
        if(range.fadeIn>0&&random.float()>Math.min(1,(s-range.from)/range.fadeIn))continue;
      }
      // The rows thin out toward the back, so the wood has an edge.
      if (random.float() < thin * (depth - from) / Math.max(1, to - from)) continue;
      const off = side * (course.roadHalfWidthAt(s) + depth);
      let scale = random.range(.9, 1.7);
      // `scale: [least, most]` stretches the usual .9 to 1.7; `clumps: { cut, size }` groups the trees in groves
      // with bare clearings between (a slow wave along the road and back into the wood) and grows the grove trees.
      if (scaleRange) scale = scaleRange[0] + (scale - .9) / .8 * (scaleRange[1] - scaleRange[0]);
      if (clumps) {
        const grove = .5 + .28 * Math.sin(s * .021 + side * 1.9 + depth * .045) + .22 * Math.sin(s * .0083 - depth * .07 + side * 3.3) + .12 * Math.sin(s * .057 + depth * .11);
        if (grove < clumps.cut) continue;
        scale *= 1 + (clumps.size ?? 0) * (grove - .5);
      }
      if (!roadClear(s, off, 0, 1) || cleared(s, off, 2.5 * scale) || zones.length && ownClear(s, off, 2.5 * scale)) continue;
      const p = course.groundAt(s, off);
      // A far band reaches across to other stretches of the circuit, so it is
      // also measured from the nearest road: at least `from` beyond its edge,
      // and outside the clear stretches as seen from that road.
      if (drawnGround) {
        const n = course.nearest(p.x, p.z);
        if (n.distance - course.roadHalfWidthAt(n.s) < from || cleared(n.s, n.lateral, 2.5 * scale) ||
          zones.length && ownClear(n.s, n.lateral, 2.5 * scale)) continue;
      }
      if (crowded(p.x, p.z, crowding * scale)) continue;
      claim(p.x, p.z);
      const tree = add(`${prefix}-${serial++}`, 'tree', s, off, .23 * scale, .23 * scale, random.range(0, TAU), { scale });
      if (drawnGround) { tree.y = renderedGroundHeight(course, tree); tree.farForest = true; }
      f.trees.push(tree);
    }
  };
  const forest = course.def.scenery?.forest;
  if (forest) plantBand(forest, makeRng(0x6f7265 ^ (course.def.stage + 1) * 0x9e37), 'forest');
  // A shore forest (`scenery.shoreForest`, KOGANE-PASS-C5): a third band for the slope across a lake, authored
  // by its `ranges`, its `sides` (-1 right, 1 left) and its own `clear` stretches that keep it out of the water.
  // It has its own random stream and names (`shore-forest-N`) and is planted after the others, so a circuit
  // without one is exactly as it was.
  const farForest = course.def.scenery?.farForest;
  if (farForest) plantBand(farForest, makeRng(0x666172 ^ (course.def.stage + 1) * 0x7f4a7c15), 'far-forest',
    {zones: farForest.clear ?? [], drawnGround: true});
  const shoreForest = course.def.scenery?.shoreForest;
  if (shoreForest) plantBand(shoreForest, makeRng(0x73686f ^ (course.def.stage + 1) * 0x2545f491), 'shore-forest',
    {zones: shoreForest.clear ?? [], drawnGround: true});
  // `scenery.onDrawnGround` (KOGANE-PASS-C6): on steep switchbacks the ground drawn beside the road can lie tens of
  // metres above or below the course's own height formula, which left trees hanging in the air or buried and
  // boulders standing in the slope. A circuit that sets it plants every tree on the drawn ground and drops a
  // boulder that would not sit on it (more than a metre off). No other circuit sets it, so none changes.
  if (course.def.scenery?.onDrawnGround) {
    for (const tree of f.trees) {
      const y = renderedGroundHeight(course, tree);
      if (Number.isFinite(y)) tree.y = y;
    }
    f.rocks = f.rocks.filter(rock => {
      const obstacle = f.obstacles.find(o => o.source === rock);
      const y = obstacle && renderedGroundHeight(course, obstacle);
      if (!obstacle || !Number.isFinite(y) || Math.abs(obstacle.y - y) <= 1) return true;
      f.obstacles.splice(f.obstacles.indexOf(obstacle), 1);
      return false;
    });
  }
  // Autumn (`scenery.autumn`): `share` of every planted tree turns one of the
  // `colours` (red, gold and orange multipliers for the pine crowns), picked
  // from the tree's place along the road so the same trees turn on every build.
  const autumn = course.def.scenery?.autumn;
  if (autumn) f.trees.forEach((tree, i) => {
    const mix = Math.sin(i * 12.9898 + tree.s * .0371) * 43758.5453, pick = mix - Math.floor(mix);
    if (pick < autumn.share) tree.tint = autumn.colours[Math.floor(pick / autumn.share * autumn.colours.length) % autumn.colours.length];
  });
}

// Reserve authored branch roads only after every original scenery proposal,
// random draw, vacancy decision, forest claim and autumn tint has completed.
// Survivors retain their original objects, order and IDs; nothing is refilled.
export function clearAuthoredRoadScenery(course) {
  const authored = course.def.roadBranches;
  if (!authored?.length) return 0;
  const f = course.features, ids = new Set(authored.map(branch => branch.id));
  const branches = f.shortcuts.filter(branch => ids.has(branch.id)), removed = new Set();
  if (!branches.length) return 0;
  const kinds = [
    ['rocks', rock => Math.hypot(rock.scale[0], rock.scale[2]), 4],
    ['trees', tree => 2.1 * tree.scale, 3],
    ['buildings', building => Math.hypot(building.halfX, building.halfZ), 3],
    ['mountains', mountain => Math.hypot(mountain.halfX, mountain.halfZ) * 1.1, 25],
  ];
  for (const [kind, radiusOf, margin] of kinds) {
    const placements = f[kind], kept = [];
    for (const placement of placements) {
      const point = course.worldAt(placement.s, placement.off), near = course.nearest(point.x, point.z), radius = radiusOf(placement);
      // This is the existing legacy shortcut reservation, including the join
      // reach. Only its placement timing differs, to preserve authored draws.
      const intrudes = branches.some(branch => near.s >= branch.start - 12 && near.s <= branch.end + 12 &&
        Math.abs(near.lateral - course.shortcutOffset(branch, near.s)) < radius + branch.halfWidth + margin);
      if (intrudes) removed.add(placement); else kept.push(placement);
    }
    if (kept.length !== placements.length) f[kind] = kept;
  }
  if (removed.size) f.obstacles = f.obstacles.filter(obstacle => !removed.has(obstacle) && !removed.has(obstacle.source));
  return removed.size;
}

// ---------------------------------------------------------------------------
// Solid kit pieces (`solid: true` on a circuit's `kitPlacements`): the barriers,
// fences, posts and buildings a circuit stands beside the road are boxes a car
// hits, the size and place of the piece itself (the face toward the road is the
// drawn face). The kit loader places a piece on the ground at its place with the
// road's heading turned by the piece's `heading`, so the box is built the same
// way. A thin piece is thickened away from the road to 0.8 m, so a fast car
// cannot slip through it. They are not walls of the script: nothing draws them
// (the piece is the drawing) and the walls list does not hold them.
// ---------------------------------------------------------------------------
const THIN_PIECE = .8;

function kitSolids(course) {
  const solids = [];
  (course.def.kitPlacements ?? []).forEach((piece, index) => {
    if (!piece.solid) return;
    const foot = KIT_FOOTPRINTS[piece.id];
    if (!foot) throw new TrackScriptError(`Kit piece "${piece.id}" is marked solid but has no footprint in src/kit-footprints.js.`);
    const scale = Array.isArray(piece.scale) ? piece.scale : Array(3).fill(piece.scale ?? 1);
    const ground = course.groundAt(piece.s, piece.lateral), heading = ground.heading + (piece.heading ?? 0);
    const halfX = foot.width * scale[0] / 2;
    let halfZ = foot.depth * scale[2] / 2, x = ground.x, z = ground.z;
    // The piece's thickness runs across the road: thicken it on the side away from the road.
    const away = Math.sign(piece.lateral) || 1, awayX = Math.cos(ground.heading) * away, awayZ = -Math.sin(ground.heading) * away;
    if (halfZ * 2 < THIN_PIECE && Math.abs(Math.sin(heading) * awayX + Math.cos(heading) * awayZ) > .9) {
      const extra = (THIN_PIECE - halfZ * 2) / 2, push = Math.sign(Math.sin(heading) * awayX + Math.cos(heading) * awayZ);
      x += Math.sin(heading) * push * extra; z += Math.cos(heading) * push * extra; halfZ += extra;
    }
    // The ground under both ends and the middle, read where the piece stands.
    const heights = [-1, 0, 1].map(k => {
      const at = course.nearest(ground.x + Math.cos(heading) * halfX * k, ground.z - Math.sin(heading) * halfX * k);
      return course.groundAt(at.s, at.lateral).y;
    });
    const low = Math.min(...heights) - .1, high = Math.max(...heights) + foot.height * scale[1];
    const near = course.nearest(ground.x, ground.z);
    solids.push({
      id: `kit-solid-${index}-${piece.id}`, kind: 'prop', shape: 'box', barrier: foot.depth <= 1, kitSolid: true, side: away,
      s: course.phase(near.s), off: near.lateral, x, y: low, z, heading, halfX, halfZ, height: high - low, minY: low, maxY: high,
      theme: course.themeAt(near.s),
    });
  });
  return solids;
}

export function trackScriptSolids(course) {
  const f = course.features, script = course.script;
  const finishS = course.closed ? 0 : course.length;
  for (const side of [-1, 1]) {
    const off = side * (script.halfWidthAt(finishS) + 1.5), p = course.groundAt(finishS, off);
    f.obstacles.push({ id: `finish-post-${side}`, kind: 'prop', s: course.phase(finishS), off, x: p.x, y: p.y, z: p.z,
      heading: p.heading, halfX: .25, halfZ: .25, shape: 'box', theme: course.themeAt(finishS) });
  }
  f.walls = wallSegments(course);
  const lane=course.pitLane;
  if(lane){
    f.walls=f.walls.filter(w=>!(Math.sign(w.off)===lane.side&&w.s>=lane.entry-3&&w.s<=lane.exit+3));
    for(let s=lane.entry+65;s<lane.exit-65;s+=4){
      const off=lane.side*(course.roadHalfWidthAt(s)+.65),p=course.groundAt(s,off);
      const y=course.worldAt(s,off).y;
      f.walls.push({id:`pit-wall-${s}`,kind:'prop',shape:'box',barrier:true,trackWall:true,pitWall:true,
        s,off,x:p.x,y:y-.1,z:p.z,heading:p.heading,halfX:.3,halfZ:2,height:1.15,minY:y-.1,maxY:y+1.05,theme:course.themeAt(s)});
    }
  }
  // Physical bounds share the actual approved model's placement transform.
  // The model draws itself; these boxes are simulation obstacles only.
  for(const gallery of course.def.galleries ?? [])for(const row of course.def.kitPlacements ?? []){
    if(row.id!=='gallery'||row.s<gallery.start||row.s>gallery.end)continue;
    const scale=Array.isArray(row.scale)?row.scale:Array(3).fill(row.scale??1);
    const frame=course.groundAt(row.s,row.lateral),heading=frame.heading+(row.heading??0);
    const cs=Math.cos(heading),sn=Math.sin(heading);
    if(row.nodeTranslations&&Object.entries(row.nodeTranslations).some(([name,vector])=>
        !(gallery.collisions??[]).some(bounds=>bounds.name===name)||!Array.isArray(vector)||
        vector.length!==3||!vector.every(Number.isFinite)))
      throw new TrackScriptError('Gallery named translations need actual collision names and three finite model-local values.');
    for(const bounds of gallery.collisions ?? []){
      const move=row.nodeTranslations?.[bounds.name]??[0,0,0];
      const off=((bounds.min[0]+bounds.max[0])*.5+move[0])*scale[0];
      const along=((bounds.min[2]+bounds.max[2])*.5+move[2])*scale[2];
      const x=frame.x+cs*off+sn*along,z=frame.z-sn*off+cs*along;
      const near=course.nearest(x,z,row.s),y=frame.y+(bounds.min[1]+move[1])*scale[1]+(row.lift??0);
      const height=(bounds.max[1]-bounds.min[1])*scale[1];
      f.obstacles.push({id:`gallery-${bounds.name}-${row.s}`,kind:'prop',shape:'box',trackWall:true,
        sourceBounds:bounds.name,kitS:row.s,s:near.s,off:near.lateral,x,z,y,heading,
        ...(bounds.name==='gallery-heavy-concrete-roof'?{verticalClearance:true}:{}),
        halfX:(bounds.max[0]-bounds.min[0])*.5*scale[0],halfZ:(bounds.max[2]-bounds.min[2])*.5*scale[2],
        height,minY:y,maxY:y+height,theme:course.themeAt(near.s)});
    }
  }
  f.obstacles.push(...f.walls);
  scatterScenery(course);
  clearAuthoredRoadScenery(course);
  // After the planted scenery, so the trees stand exactly where they did.
  f.kitSolids = kitSolids(course);
  f.obstacles.push(...f.kitSolids);
  // A snow shed can have open model bays but still needs a continuous driving
  // boundary. Add these after scenery so seeded placement stays unchanged.
  // Keep them out of f.walls: the approved gallery model owns the drawing.
  for (const gallery of course.def.galleries ?? []) {
    if (!gallery.solidSides) continue;
    for (let start = gallery.start; start < gallery.end; start += 4) {
      const end = Math.min(gallery.end, start + 4), s = (start + end) / 2;
      for (const side of [-1, 1]) {
        const off = side * (gallery.width + .45), p = course.worldAt(s, off);
        const heights = [start, s, end].map(at => course.worldAt(at, off).y);
        const low = Math.min(...heights) - .1, high = Math.max(...heights) + gallery.height;
        f.obstacles.push({id:`lining-${gallery.id}-${start}-${side}`,kind:'building',shape:'box',
          tunnelWall:true,trackWall:true,s,off,x:p.x,y:low,z:p.z,heading:p.heading,
          halfX:.45,halfZ:(end-start)/2+.1,height:high-low,minY:low,maxY:high,
          theme:course.themeAt(s)});
      }
    }
  }
  if (lane && course.def.pitLane.kitDivider === true) {
    if (!(course.def.kitPlacements ?? []).some(piece => piece.id === 'pit-wall' && piece.solid === true))
      throw new TrackScriptError('An authored pit divider requires solid pit-wall kits.');
    // Keep the original divider through scenery construction above, then use
    // only the actual kit colliders and drawing. Seeded tree placement stays exact.
    f.walls = f.walls.filter(wall => !wall.pitWall);
    f.obstacles = f.obstacles.filter(obstacle => !obstacle.pitWall);
  }
  course.obstacleBuckets = new Map(); course.rockBuckets = new Map();
  const buckets = Math.ceil(course.length / 64);
  course.bucketCount = buckets;
  for (const o of f.obstacles) {
    const reach = Math.hypot(o.halfX, o.halfZ) * 1.5 + 20;
    for (let b = Math.floor((o.s - reach) / 64); b <= Math.floor((o.s + reach) / 64); b++) {
      const key = ((b % buckets) + buckets) % buckets;
      if (!course.obstacleBuckets.has(key)) course.obstacleBuckets.set(key, []);
      course.obstacleBuckets.get(key).push(o);
    }
  }
}
