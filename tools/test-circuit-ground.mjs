import assert from 'node:assert/strict';
import test from 'node:test';
import { Course } from '../src/course.js';
import { terrainGeometry, farTerrainGeometry, strip } from '../src/world-surfaces.js';
import { hillGeometry, backdropGeometry, lakeGeometry } from '../src/circuit-effects.js';
import { renderedGroundHeight } from '../src/rendered-ground.js';
import {kitBaseHeight} from '../src/track-kits.js';
import { hillHeight, hillLocal } from '../src/circuit-hills.js';
import { lakeLevel } from '../src/circuit-effects.js';
import { KIT_FOOTPRINTS } from '../src/kit-footprints.js';
import { ROAD_SHOULDER_WIDTH } from '../src/config.js';
import { TREMBLANT_WOODS } from '../src/circuits/tremblant-woods.js';
import { TREMBLANT_SNOW } from '../src/circuits/tremblant-snow.js';
import { HARBOUR_LIGHTS } from '../src/circuits/harbour-lights.js';
import { PANORAMA_RIDGE } from '../src/circuits/panorama-ridge.js';

// The ground never lies over the road. Every ground surface a drawn circuit
// has (the ribbon beside the road, the far ground, its hills, the lake and the
// backdrop hills) is read from the triangles the game draws, and compared with
// the road across its width and the shoulder beside it, every 2 m of the lap.
// Found on Tremblant Woods (Beaver Hairpin and the spur beside Timber Straight,
// grass over the road) and on Harbour Lights (the hairpin, 18 m over).
const ROAD_LIFT = .035, SHOULDER_LIFT = .018, CELL = 8;

function indexTriangles(geometry) {
  const position = geometry.attributes.position, index = geometry.index, bins = new Map();
  for (let i = 0; i < index.count; i += 3) {
    const corners = [0, 1, 2].map(k => { const v = index.getX(i + k); return [position.getX(v), position.getY(v), position.getZ(v)]; });
    const xs = corners.map(c => c[0]), zs = corners.map(c => c[2]);
    for (let z = Math.floor(Math.min(...zs) / CELL); z <= Math.floor(Math.max(...zs) / CELL); z++)
      for (let x = Math.floor(Math.min(...xs) / CELL); x <= Math.floor(Math.max(...xs) / CELL); x++) {
        const key = `${x},${z}`;
        if (!bins.has(key)) bins.set(key, []);
        bins.get(key).push(corners);
      }
  }
  return bins;
}

// The highest drawn triangle above a point, or null.
function drawnHeight(bins, x, z) {
  let best = null;
  for (const [a, b, c] of bins.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`) ?? []) {
    const det = (b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0]);
    if (Math.abs(det) < 1e-9) continue;
    const u = ((x - a[0]) * (c[2] - a[2]) - (z - a[2]) * (c[0] - a[0])) / det, v = ((b[0] - a[0]) * (z - a[2]) - (b[2] - a[2]) * (x - a[0])) / det;
    if (u < -1e-7 || v < -1e-7 || u + v > 1 + 1e-7) continue;
    const y = a[1] + u * (b[1] - a[1]) + v * (c[1] - a[1]);
    if (best === null || y > best) best = y;
  }
  return best;
}

// Every ground surface the circuit draws, by name.
function groundSurfaces(course) {
  const def = course.def, surfaces = [['near ground', terrainGeometry(course)], ['far ground', farTerrainGeometry(course)]];
  (def.hills ?? []).forEach((hill, i) => surfaces.push([`hill ${i + 1}`, hillGeometry(course, hill)]));
  (def.effects?.backdrop?.hills ?? []).forEach((hill, i) => surfaces.push([`backdrop hill ${i + 1}`, backdropGeometry(course, hill, def.effects.backdrop.colours)]));
  if (def.effects?.lake) surfaces.push(['lake', lakeGeometry(course, def.effects.lake)]);
  return surfaces.map(([name, geometry]) => [name, indexTriangles(geometry)]);
}

// Spans of the lap where a surface lies at or above the road, as readable lines.
function coverSpots(course) {
  const surfaces = groundSurfaces(course), spots = [];
  for (let s = 0; s < course.length; s += 2) {
    const half = course.roadHalfWidthAt(s);
    const places = [];
    for (let k = 0; k <= 8; k++) places.push([-half + 2 * half * k / 8, ROAD_LIFT]);
    for (const side of [-1, 1]) for (const share of [.2, .6, 1]) places.push([side * (half + ROAD_SHOULDER_WIDTH * share), SHOULDER_LIFT]);
    for (const [lateral, lift] of places) {
      const at = course.worldAt(s, lateral), surface = at.y + lift;
      for (const [name, bins] of surfaces) {
        const height = drawnHeight(bins, at.x, at.z);
        if (height !== null && height >= surface - 1e-3) spots.push({ name, s, lateral, over: height - surface });
      }
    }
  }
  const spans = [];
  for (const spot of spots) {
    const last = spans.findLast(span => span.name === spot.name);
    if (last && spot.s - last.s1 <= 4) { last.s1 = spot.s; last.over = Math.max(last.over, spot.over); }
    else spans.push({ name: spot.name, s0: spot.s, s1: spot.s, over: spot.over });
  }
  return spans.map(span => `${span.name} reaches ${span.over.toFixed(2)} m over the road at s ${span.s0} to ${span.s1}`);
}

for (const [name, def, s, lateral] of [
  ['Harbour Lights', HARBOUR_LIGHTS, 2059, 4.67],
  ['Tremblant Snow', TREMBLANT_SNOW, 396, 6.94],
]) test(name + ': drawn triangles cover the observed native driven road', () => {
  const course = new Course(def, 1989);
  assert.equal(course.surfaceAt(s, lateral).road, true, 'observed actor remains on the native road');
  const geometry = strip(course, at => -course.roadHalfWidthAt(at), at => course.roadHalfWidthAt(at), ROAD_LIFT);
  const bins = indexTriangles(geometry), point = course.worldAt(s, lateral);
  try {
    assert.notEqual(drawnHeight(bins, point.x, point.z), null, 'actual native road point must be drawn');
    const rows = Math.ceil(course.length / 2), rowStep = course.length / rows;
    for (let row = 0; row < rows; row++) for (const share of [.25, .5, .75]) for (const side of [-1, 1]) {
      const along = (row + share) * rowStep, edge = course.worldAt(along, side * course.roadHalfWidthAt(along));
      assert.notEqual(drawnHeight(bins, edge.x, edge.z), null, 'quarter/mid native edge must be drawn at s ' + along + ', side ' + side);
    }
    for (let along = .5; along < course.length; along += 2) for (const side of [-1, 1]) {
      const edge = course.worldAt(along, side * course.roadHalfWidthAt(along));
      assert.notEqual(drawnHeight(bins, edge.x, edge.z), null, 'full native edge must be drawn at s ' + along + ', side ' + side);
    }
  }
  finally { geometry.dispose(); }
});

for (const [name, def] of [['Tremblant Woods', TREMBLANT_WOODS], ['Tremblant Snow', TREMBLANT_SNOW], ['Harbour Lights', HARBOUR_LIGHTS], ['Panorama Ridge', PANORAMA_RIDGE]]) {
  test(`${name}: no ground, hill or water is drawn over the road or its shoulder`, () => {
    const course = new Course(def, 1989);
    assert.deepEqual(coverSpots(course), []);
  });
}

test('planted scenery reads the same ground, not a fold lying over the road', () => {
  // The spur before Beaver Hairpin: the ribbon of Timber Straight used to reach across it.
  const course = new Course(TREMBLANT_WOODS, 1989), spur = course.script.pieces.find(item => item.name === 'The Spur');
  for (let s = spur.s0 + 4; s < spur.s1; s += 6) for (const lateral of [-6, 0, 6]) {
    const at = course.worldAt(s, lateral);
    const height = renderedGroundHeight(course, { x: at.x, z: at.z, s, off: lateral });
    assert.ok(height < at.y + ROAD_LIFT, `scenery would stand ${(height - at.y).toFixed(2)} m above the spur at s ${s.toFixed(0)}, ${lateral} m`);
  }
});

// ---- buildings and pieces seat on the ground ------------------------------------------------

// What the player sees under a piece: the highest of the near ground, the far ground and the hills.
function visibleGround(course) {
  const bins = [terrainGeometry(course), farTerrainGeometry(course), ...(course.def.hills ?? []).map(hill => hillGeometry(course, hill))].map(indexTriangles);
  return (x, z) => Math.max(...bins.map(bin => drawnHeight(bin, x, z) ?? -Infinity));
}
// Footprints (width, depth) of pieces the kit table does not list, from the kit manifest.
const FOOT = { 'ski-lodge': [16, 11], 'wooden-dock': [3, 7], 'autumn-tree': [1, 1], 'autumn-tree-golden': [1, 1], 'autumn-tree-copper': [1, 1], 'start-gantry': null,
  'braking-board-150': [1, .12], 'braking-board-100': [1, .12], 'braking-board-50': [1, .12] };
// How far a piece may float (metres, lowest ground under it to its base): 0.3, a little more for a four metre piece lying on a slope.
const FLOAT = id => KIT_FOOTPRINTS[id]?.width >= 4 && KIT_FOOTPRINTS[id].depth < 1 || id === 'chairlift-tower' ? .45 : .3;

for (const [label, def] of [['Tremblant Woods', TREMBLANT_WOODS], ['Tremblant Snow', TREMBLANT_SNOW], ['Harbour Lights', HARBOUR_LIGHTS]]) test(`${label}: no building or piece floats above the ground, and none is sunk deep`, () => {
  const course = new Course(def, 1989), ground = visibleGround(course), lake = def.effects?.lake, water = lake ? lakeLevel(course, lake) : null;
  const problems = [];
  for (const piece of def.kitPlacements) {
    const foot = KIT_FOOTPRINTS[piece.id] ? [KIT_FOOTPRINTS[piece.id].width, KIT_FOOTPRINTS[piece.id].depth] : FOOT[piece.id];
    if (!foot || piece.ride) continue;
    const scale = Array.isArray(piece.scale) ? piece.scale : Array(3).fill(piece.scale ?? 1), original = course.groundAt(piece.s, piece.lateral);
    const at = piece.worldPosition ? {...original, ...piece.worldPosition} : original;
    // Where the loader sets the piece down (src/track-kits.js), and the hill lift circuit-effects.js adds.
    let base = kitBaseHeight(course, piece, {min:{x:-foot[0]/2,z:-foot[1]/2},max:{x:foot[0]/2,z:foot[1]/2}});
    if (piece.hill !== undefined) { const hill = course.def.hills[piece.hill]; base += hillHeight(hill, ...hillLocal(hill, piece.s, piece.lateral)) - (piece.sink ?? 0); }
    const heading = at.heading + (piece.heading ?? 0), hx = foot[0] * scale[0] / 2, hz = foot[1] * scale[2] / 2, under = [];
    for (const [a, b] of [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]])
      under.push(ground(at.x + Math.cos(heading) * a * hx + Math.sin(heading) * b * hz, at.z - Math.sin(heading) * a * hx + Math.cos(heading) * b * hz));
    const name = `${piece.id} at s ${piece.s.toFixed(0)}, ${piece.lateral.toFixed(0)} m`;
    if (piece.id === 'wooden-dock') {
      // A dock stands in the water: its feet are within 40 cm of the surface.
      if (Math.abs(base - water) > .4) problems.push(`${name}: base ${(base - water).toFixed(2)} m from the water`);
      continue;
    }
    const lowest = Math.min(...under), highest = Math.max(...under);
    if (!Number.isFinite(lowest)) continue; // the grid line, where no ground is drawn
    if (base - lowest > FLOAT(piece.id)) problems.push(`${name} floats ${(base - lowest).toFixed(2)} m`);
    if (highest - base > 1.5) problems.push(`${name} is sunk ${(highest - base).toFixed(2)} m`);
  }
  assert.deepEqual(problems, []);
});

for (const [label, def] of [['Tremblant Woods', TREMBLANT_WOODS], ['Tremblant Snow', TREMBLANT_SNOW]]) test(`${label}: the ground behind the lake slopes, it is not a wall`, () => {
  const course = new Course(def, 1989), worst = geometry => {
    const position = geometry.attributes.position, index = geometry.index;
    let steepest = 0;
    for (let i = 0; i < index.count; i += 3) {
      const [a, b, c] = [0, 1, 2].map(k => { const v = index.getX(i + k); return [position.getX(v), position.getY(v), position.getZ(v)]; });
      const u = b.map((value, j) => value - a[j]), v = c.map((value, j) => value - a[j]);
      const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      steepest = Math.max(steepest, Math.acos(Math.min(1, Math.abs(normal[1]) / (Math.hypot(...normal) || 1))) * 180 / Math.PI);
    }
    return steepest;
  };
  // The far ground used to step by 36 m between the lake side and the ridge side of the lap (68 degrees, now at most 56 at the lake's steep west end); the ski mountain
  // stood on that step (82 degrees). Rounded hills, a lake bowl and a ski slope are all well under these.
  assert.ok(worst(farTerrainGeometry(course)) < 60, 'far ground');
  def.effects.backdrop.hills.forEach((hill, i) => assert.ok(worst(backdropGeometry(course, hill, def.effects.backdrop.colours)) < 75, `backdrop hill ${i + 1}`));
});


// FIX-ROAD-SEAM: actual closed Harbour variants expose arbitrary fractional seams.
test('opted Harbour closing terrain covers fractional lengths with the same actual triangle reader', () => {
  for (const finalStraight of [61.125, 62, 63, 64.25]) {
    const script = HARBOUR_LIGHTS.script.map((entry, index, all) => index === all.length - 1 ? [entry[0], finalStraight, ...entry.slice(2)] : entry);
    const def = {...HARBOUR_LIGHTS, script, kitPlacements: []};
    const complete = new Course({...def, completeTerrainRibbon: true}, 1989);
    const old = new Course({...def, completeTerrainRibbon: false}, 1989);
    const original = terrainGeometry(old), closed = terrainGeometry(complete);
    try {
      const bins = indexTriangles(closed), last = Math.floor(complete.length / 4) * 4;
      assert.ok(complete.length > last, 'the actual fitted test length has a fractional final cell');
      for (const share of [.25, .5, .75]) for (const lateral of [-22.62, -18, 0, 18, 22.62]) {
        const atS = last + (complete.length - last) * share, at = complete.groundAt(atS, lateral);
        const drawn = drawnHeight(bins, at.x, at.z);
        assert.ok(Number.isFinite(drawn), 'the last partial strip has actual drawn triangles');
        const sampled = renderedGroundHeight(complete, {...at, s: atS, off: lateral}, {requireSurface: true});
        assert.ok(Number.isFinite(sampled), 'required ground cannot use an analytic fallback');
        assert.ok(Math.abs(sampled - drawn) < 1e-4, 'grounding matches actual Float32 triangles');
      }
      for (const name of ['position', 'color', 'uv', 'biomeWeights']) {
        const prior = original.getAttribute(name).array, actual = closed.getAttribute(name).array;
        assert.deepEqual(actual.slice(0, prior.length), prior, 'every previous sampled row remains exact');
      }
      assert.equal(JSON.stringify(complete.features), JSON.stringify(old.features), 'terrain closure cannot change collision features');
    } finally {original.dispose(); closed.dispose();}
  }
});

test('unopted terrain and the already complete Panorama ridge retain exact geometry', () => {
  for (const def of [TREMBLANT_WOODS, TREMBLANT_SNOW, PANORAMA_RIDGE]) {
    const old = terrainGeometry(new Course(def, 1989));
    const same = terrainGeometry(new Course({...def, completeTerrainRibbon: false}, 1989));
    try {
      for (const name of Object.keys(old.attributes)) assert.deepEqual(same.getAttribute(name).array, old.getAttribute(name).array);
      assert.deepEqual(same.index.array, old.index.array); assert.deepEqual(same.groups, old.groups);
    } finally {old.dispose(); same.dispose();}
  }
});
