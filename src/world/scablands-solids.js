// What a car, a raider or a person on foot cannot pass in the Scablands (SCABLANDS-LAND round 4, slice 2b): everything drawn that stands
// taller than a wheel (0.9 m) is a box or a round post, built from the same data that draws it, and found by a grid by world position, so
// that the cost of asking does not grow with the land. `SCABLANDS_SOLIDS` is the real list. Each solid is
//   {id, placeId, kind, shape ('box' or 'ellipse'), x, z, y (the ground under it), halfX, halfZ, heading, height,
//    center, size, collision}
// where `heading` is the solid's own turn (its x runs the way a three.js mesh turned by `heading` about the vertical has its x: to
// (cos h, -sin h)), and `center`, `size` and `collision` are the older shape the tests read. The sim reads a solid exactly as it reads an
// arena wall: `sweepObstacle` (src/collision.js) takes the box or the round post and gives the face the car met.
//
// Not solid, and why: people (`folk.glb`), Big Bess and the furnace (they move; they are targets), the gate's beam and lamps and the
// bridge's cross ties (they hang more than 5 m up, over any car), and the places that draw nothing (the Dry Dam, the Ships and the Iron
// Line's station: the three boxes the old table held there stood in the air).
import {LAND} from './scablands-names.js';
import {scablandsSurfaceHeightAt} from './scablands-ground.js';
import {boneyardWrecks} from './boneyard-wrecks.js';
import {tinTownGateSolids} from './tin-town-gate.js';
import {tinTownSolids} from './tin-town-shacks.js';
import {everburnPropSolids} from './everburn-props.js';
import {riverFor, stepsWayFor} from './scablands-regions.js';
import {ROAD_NET, roadNet} from './scablands-road.js';

// A wheel's height: anything this tall or less is driven over, anything taller is solid.
export const WHEEL_HEIGHT = .9;

// ---- Boxes cut from the models ----------------------------------------------------------------------------------------------------------
// The mall's four sand drifts are not drawn (scablands-scene.js removes them), so they are not cut.
// A place's model is drawn at the place with a turn that is a whole number of quarter turns (`SCABLANDS_PLACES.indexOf(place) % 4`, in
// scablands-scene.js). These are the model's own parts taller than a wheel, cut into boxes from where they stand in the model: each is
// [west, north, east, south, height] in the model's own metres (x east, z south at no turn). Every table was cut at a cell of 1 m from the real model file, and tools/test-scablands-solid.mjs reads the file again and checks
// that every part taller than a wheel lies inside a box, and that every box holds some of it.
const TIN_TOWN_BOXES = Object.freeze([
  [-3, -14, 3, -12, 3.4], [-9, -12, -1, -6, 5.1], [1, -12, 9, -6, 4.5], [-4, -7, 4, -5, 7.1], [-8, -5, -2, 0, 6.8], [1, -5, 9, 1, 7.6],
  [-10, 1, -2, 4, 3.9], [-9, 4, -1, 6, 4.6], [-9, 6, -1, 12, 6.8], [1, 1, 8, 6, 4.3], [1, 6, 9, 12, 4.2], [-4, 13, -3, 14, 2.1], [7, 13, 8, 14, 2.1],
]);
const MALL_BOXES = Object.freeze([
  [-15, -11, -6, -10, 8.6], [-3, -11, -2, -10, 7.4], [-1, -11, 1, -10, 7.4], [2, -11, 3, -10, 7.4], [6, -11, 15, -10, 8.6], [-15, -10, -12, -9, 8.6],
  [-1, -10, 2, -9, 7.7], [6, -10, 9, -9, 8.6], [-15, -9, -11, -8, 8.4], [-8, -10, -6, -8, 8.6], [0, -9, 2, -8, 7.9], [7, -9, 9, -8, 7.9],
  [12, -10, 15, -8, 8.6], [-15, -8, -6, -6, 8.4], [14, -8, 15, -6, 8], [-14, -6, 11, -5, 8.4], [-15, -5, -14, -4, 7.9], [-13, -5, -6, -4, 5.2],
  [-5, -5, 3, -4, 5.2], [4, -5, 11, -4, 5.2], [-15, -4, -13, -3, 8], [-7, -4, -6, -3, 7.2], [7, -4, 8, -3, 7.2], [14, -5, 15, -3, 8],
  [-15, -3, -12, -2, 7.9], [-8, -3, -6, -2, 7.7], [7, -3, 9, -2, 7.7], [12, -3, 15, -2, 7.9], [-15, -2, -14, -1, 7.9], [6, -2, 8, -1, 4.9],
  [14, -2, 15, -1, 7.9], [-8, -1, -6, 0, 7.3], [6, -1, 9, 0, 7.3], [-15, -1, -12, 1, 8], [-8, 0, -4, 1, 7.6], [7, 0, 9, 1, 7.6], [12, -1, 15, 1, 8],
  [-6, 1, -4, 2, 4.9], [14, 1, 15, 2, 7.9], [-15, 1, -14, 3, 7.9], [-13, 2, -12, 3, 7.5], [-2, -4, -1, 3, 4], [0, -4, 2, 3, 7.7], [8, 2, 9, 3, 7.5],
  [13, 2, 15, 3, 7.9], [-15, 3, -13, 4, 8], [-7, 2, -6, 4, 7.5], [0, 3, 1, 4, 7.1], [7, 3, 8, 4, 7.1], [-15, 4, -14, 5, 7.9], [-13, 4, -6, 5, 5.2],
  [5, 4, 12, 5, 5.2], [14, 3, 15, 5, 8], [-14, 5, -6, 6, 6.2], [4, 5, 13, 6, 8.4], [6, 6, 15, 7, 8.4], [7, 7, 15, 8, 8.4], [-15, 6, -14, 9, 8],
  [-13, 8, -12, 9, 7.2], [-8, 8, -5, 9, 8.4], [-4, 8, -2, 9, 8.4], [1, 8, 2, 9, 7.2], [7, 8, 11, 9, 8.4], [-15, 9, -12, 10, 8.6],
  [-8, 9, -6, 10, 8.6], [-5, 9, -2, 10, 8.4], [-1, 9, 2, 10, 8.6], [6, 9, 9, 10, 8.6], [12, 8, 15, 10, 8.6], [-15, 10, -9, 11, 8.6],
  [-8, 10, 8, 11, 8.6], [9, 10, 15, 11, 8.6],
]);
const KIT_BOXES = Object.freeze([[-8, -4, -3, -2, 3.3], [-7, -2, -4, -1, 2.6], [-4, -1, 10, 1, 5.7]]);
// The well: one flare stack 8.5 m tall with its braces, cap and hand wheel, in a footprint of 4 by 2 m round the place's middle (a round post 2.3 m across
// its radius holds all of it).
const WELL_POST = Object.freeze({radius: 2.3, height: 8.5});
// The radio mast at the Iron Line: 76 m tall, 0.95 m across at its foot, stands 1 m west of the place.
const MAST_POST = Object.freeze({dx: -1, dz: 0, radius: 1, height: 76});

// Where a model's box lands in the world, for a place drawn with `turns` quarter turns about the vertical: a point (x, z) of the model goes to
// (x cos t + z sin t, -x sin t + z cos t), which is a whole number of quarter turns, so a box stays a box with its sides along x and z.
function turnBox([x0, z0, x1, z1, height], turns) {
  const cos = [1, 0, -1, 0][turns], sin = [0, 1, 0, -1][turns], corner = (x, z) => [x * cos + z * sin, -x * sin + z * cos];
  const [ax, az] = corner(x0, z0), [bx, bz] = corner(x1, z1);
  return {west: Math.min(ax, bx), east: Math.max(ax, bx), north: Math.min(az, bz), south: Math.max(az, bz), height};
}

// ---- One solid ----------------------------------------------------------------------------------------------------------------------------
function make({id, placeId = null, kind, shape = 'box', x, z, halfX, halfZ, heading = 0, height, base, verticalClearance = false}) {
  const y = base ?? scablandsSurfaceHeightAt(x, z);
  const center = Object.freeze([x, y + height / 2, z]), size = Object.freeze([halfX * 2, height, halfZ * 2]);
  // `verticalClearance`: a thing under a deck (the bridge's piers), which a car on the deck passes over, or on it (the trusses), which a car in the bed passes under: its height is read for a car on the ground too
  // (src/sim-contacts.js reads it for the overhead roofs of other courses the same way).
  return Object.freeze({id, placeId, kind, shape, x, z, y, halfX, halfZ, heading, height, minY: y, maxY: y + height, center, size, ...(verticalClearance ? {verticalClearance: true} : {}),
    collision: Object.freeze({center, halfExtents: Object.freeze([halfX, height / 2, halfZ]), heading})});
}

// The Girder Bridge's two trusses and the Pipe's pipeline, for a land: along the road that crosses at each, in the road's own frame
// (src/world/scablands-draw.js draws them the same: a truss .4 m wide at 7.8 m from the middle of a deck 15 m wide, 5.7 m high with its top
// chord, and a pipeline 2.3 m across with flanges 2.74 m across, its middle 1.5 m up, 6.4 m from the middle of a deck 8.4 m wide; both 176 m long).
// The piers stand on the bed: 8 m below the deck, up to its underside (the bridge's are 12 m by 3.4 m, 7.7 m of them above the bed; the pipe's 6.4 m by 2.6 m).
const RIVER_DEPTH = 8;
const BRIDGE = Object.freeze({length: 176, rail: 7.8, truss: .4, height: 5.7, pier: Object.freeze({halfX: 6, halfZ: 1.7, height: 7.7})});
// The pipeline is 2.3 m across, with a flange 2.74 m across every 11 m; the solid is as wide as its flanges (its middle stands 1.5 m up).
const PIPE = Object.freeze({length: 176, offset: 6.4, radius: 1.37, base: .13, height: 2.74, pier: Object.freeze({halfX: 3.2, halfZ: 1.3, height: 7.6}), postHeight: 8.4});
function crossingSolids(land) {
  const river = riverFor(land), net = land === LAND ? ROAD_NET : roadNet(land), out = [];
  for (const crossing of river.crossings) {
    if (crossing.kind !== 'bridge' && crossing.kind !== 'pipe') continue;
    const hit = net.nearest(crossing.x, crossing.z);
    if (!hit) continue;
    const a = hit.road.points[hit.index], b = hit.road.points[hit.index + 1], heading = Math.atan2(b.x - a.x, b.z - a.z);
    const along = (offset, lift = 0) => ({x: crossing.x + offset * Math.cos(heading), z: crossing.z - offset * Math.sin(heading), lift});
    // The deck is level with the plain: its height is the ground's own at the crossing's two ends, averaged (as the drawing tips it).
    const dx = Math.sin(heading) * 88, dz = Math.cos(heading) * 88;
    const deck = (scablandsSurfaceHeightAt(crossing.x + dx, crossing.z + dz) + scablandsSurfaceHeightAt(crossing.x - dx, crossing.z - dz)) / 2;
    const placeId = null;
    // A point `lengthwise` metres along the road from the crossing's middle and `offset` across it (the road's own frame, as the drawing builds them).
    // The bed under a point of the deck: the deck is level with the plain there (the ground a car on it drives on), 8 m above the bed.
    const underDeck = spot => scablandsSurfaceHeightAt(spot.x, spot.z) - RIVER_DEPTH;
    const at = (offset, lengthwise) => ({x: crossing.x + offset * Math.cos(heading) + lengthwise * Math.sin(heading), z: crossing.z - offset * Math.sin(heading) + lengthwise * Math.cos(heading)});
    if (crossing.kind === 'bridge') {
      for (const side of [-1, 1]) out.push({id: `girder-bridge-truss-${side < 0 ? 'left' : 'right'}`, placeId, kind: 'girder', ...along(side * BRIDGE.rail),
        halfX: BRIDGE.truss, halfZ: BRIDGE.length / 2, heading, height: BRIDGE.height, base: deck, verticalClearance: true});
      // The three concrete piers down to the bed: slabs 12 m long along the river and 3.4 m across it, at the middle and 62 percent of the way to each end.
      [-.62, 0, .62].forEach((share, index) => { const spot = at(0, share * BRIDGE.length / 2); out.push({id: `girder-bridge-pier-${index + 1}`, placeId, kind: 'girder', ...spot,
        halfX: BRIDGE.pier.halfX, halfZ: BRIDGE.pier.halfZ, heading, height: BRIDGE.pier.height, base: underDeck(spot), verticalClearance: true}); });
    } else {
      out.push({id: 'the-pipe-pipeline', placeId, kind: 'girder', ...along(PIPE.offset), halfX: PIPE.radius, halfZ: PIPE.length / 2, heading,
        height: PIPE.height, base: deck + PIPE.base, verticalClearance: true});
      // Three concrete piers under its deck (6.4 m by 2.6 m) and the posts that carry the pipeline every 22 m from 9 m in from its first end.
      [-.6, 0, .6].forEach((share, index) => { const spot = at(0, share * PIPE.length / 2); out.push({id: `the-pipe-pier-${index + 1}`, placeId, kind: 'girder', ...spot,
        halfX: PIPE.pier.halfX, halfZ: PIPE.pier.halfZ, heading, height: PIPE.pier.height, base: underDeck(spot), verticalClearance: true}); });
      for (let lengthwise = -PIPE.length / 2 + 9, index = 1; lengthwise < PIPE.length / 2; lengthwise += 22, index++) { const spot = at(PIPE.offset, lengthwise); out.push({id: `the-pipe-post-${index}`, placeId, kind: 'post',
        shape: 'box', ...spot, halfX: .55, halfZ: .55, heading, height: PIPE.postHeight, base: underDeck(spot), verticalClearance: true}); }
    }
  }
  return out;
}

// ---- The list ----------------------------------------------------------------------------------------------------------------------------
export function scablandsSolids(land = LAND) {
  const rows = [];
  const model = (placeId, turns, table, name) => {
    const place = land.place(placeId);
    table.forEach((row, index) => {
      const box = turnBox(row, turns);
      rows.push({id: `${name}-${index + 1}`, placeId, kind: 'building', x: place.x + (box.west + box.east) / 2, z: place.z + (box.north + box.south) / 2,
        // 0.3 m is added on every side: the cells the boxes were cut from are 1 and 2 m, and a drawn part may stand just past a cell's edge.
        halfX: (box.east - box.west) / 2 + .3, halfZ: (box.south - box.north) / 2 + .3, heading: 0, height: box.height, base: place.height});
    });
  };
  // The places draw their models turned by SCABLANDS_PLACES.indexOf(place) % 4 quarter turns (scablands-scene.js).
  const turns = id => land.table.findIndex(place => place.id === id) % 4;
  model('tin-town', turns('tin-town'), TIN_TOWN_BOXES, 'tin-town-block');
  model('dead-mall', turns('dead-mall'), MALL_BOXES, 'dead-mall-wall');
  model('ridge', turns('ridge'), KIT_BOXES, 'ridge-kit');
  const well = land.place('everburn');
  rows.push({id: 'everburn-well', placeId: 'everburn', kind: 'post', shape: 'ellipse', x: well.x, z: well.z, halfX: WELL_POST.radius, halfZ: WELL_POST.radius,
    heading: 0, height: WELL_POST.height, base: well.height});
  const boneyard = land.place('boneyard');
  for (const wreck of boneyardWrecks(land)) rows.push({id: `boneyard-wreck-${wreck.id}`, placeId: 'boneyard', kind: 'wreck', x: wreck.x, z: wreck.z,
    halfX: wreck.size[0] / 2, halfZ: wreck.size[2] / 2, heading: 0, height: wreck.size[1], base: boneyard.height});
  for (const part of tinTownGateSolids(land)) rows.push({...part, placeId: 'tin-town'});
  for (const part of tinTownSolids(land)) rows.push({...part, placeId: 'tin-town'});
  for (const part of everburnPropSolids(land, WHEEL_HEIGHT)) rows.push({...part, placeId: 'everburn'});
  const mast = land.at('iron-line', MAST_POST.dx, MAST_POST.dz);
  rows.push({id: 'iron-line-radio-mast', placeId: 'iron-line', kind: 'post', shape: 'ellipse', x: mast.x, z: mast.z, halfX: MAST_POST.radius, halfZ: MAST_POST.radius,
    heading: 0, height: MAST_POST.height});
  rows.push(...crossingSolids(land));
  // The four marker posts at the ends of the Steps' marked way (src/world/scablands-draw.js): 2.2 m, 0.16 m across, 3.5 m either side of the
  // way's line and 88 m either side of the river's middle, where the ledges meet the plain.
  const way = stepsWayFor(riverFor(land));
  if (way) for (const across of [-1, 1]) for (const lane of [-1, 1]) rows.push({id: `the-steps-marker-${across < 0 ? 'near' : 'far'}-${lane < 0 ? 'left' : 'right'}`,
    placeId: null, kind: 'post', shape: 'ellipse', x: way.x + way.nx * across * 88 + way.tx * lane * 3.5, z: way.z + way.nz * across * 88 + way.tz * lane * 3.5,
    halfX: .1, halfZ: .1, heading: 0, height: 2.2});
  return Object.freeze(rows.map(make));
}
export const SCABLANDS_SOLIDS = scablandsSolids();

// ---- The grid --------------------------------------------------------------------------------------------------------------------------------
// Cells of 32 m by world position. A solid is listed in every cell its (turned) box touches. `near` returns the solids in the cells a segment
// touches, widened by `pad` metres on every side, each once. The list it returns is reused by the next call: read it before asking again.
const CELL = 32;
const cellOf = value => Math.floor(value / CELL);
const key = (i, j) => i * 100003 + j;

export function createSolidGrid(solids) {
  const cells = new Map(), stamp = new Uint32Array(solids.length);
  let query = 0;
  const found = [];
  solids.forEach((solid, index) => {
    const cos = Math.abs(Math.cos(solid.heading)), sin = Math.abs(Math.sin(solid.heading));
    const reachX = solid.halfX * cos + solid.halfZ * sin, reachZ = solid.halfX * sin + solid.halfZ * cos;
    for (let i = cellOf(solid.x - reachX); i <= cellOf(solid.x + reachX); i++) for (let j = cellOf(solid.z - reachZ); j <= cellOf(solid.z + reachZ); j++) {
      const k = key(i, j);
      if (!cells.has(k)) cells.set(k, []);
      cells.get(k).push(index);
    }
  });
  return {
    solids,
    near(ax, az, bx, bz, pad = 6) {
      found.length = 0; query++;
      const i0 = cellOf(Math.min(ax, bx) - pad), i1 = cellOf(Math.max(ax, bx) + pad), j0 = cellOf(Math.min(az, bz) - pad), j1 = cellOf(Math.max(az, bz) + pad);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const list = cells.get(key(i, j));
        if (!list) continue;
        for (const index of list) if (stamp[index] !== query) { stamp[index] = query; found.push(solids[index]); }
      }
      return found;
    },
    get cells() { return cells.size; },
  };
}
export const SOLID_GRID = createSolidGrid(SCABLANDS_SOLIDS);
export const solidsNear = (ax, az, bx, bz, pad) => SOLID_GRID.near(ax, az, bx, bz, pad);

// Solids that are only there for a while (src/world/ember-pot.js: the braziers). Each is the same record `scablandsSolids` makes.
export function brazierSolid(spot, index) {
  return make({id: `brazier-${index + 1}`, placeId: null, kind: 'prop', shape: 'ellipse', x: spot.x, z: spot.z, halfX: .65, halfZ: .65, height: 1.15});
}
// Each job owns its temporary solids and its query result. The fixed grid never changes.
export function createJobSolidGrid() {
  const found = [];
  return {
    braziers: [],
    near(ax, az, bx, bz, pad) {
      found.length = 0;
      for (const solid of SOLID_GRID.near(ax, az, bx, bz, pad)) found.push(solid);
      for (const solid of this.braziers) found.push(solid);
      return found;
    },
    setBraziers(spots) { this.braziers = spots.map(brazierSolid); },
  };
}

// ---- A round thing against the solids ----------------------------------------------------------------------------------------------------------
// Moves a point out of every solid it overlaps by a circle of `radius`, along the nearest face, as a raider on foot or a truck steps. Returns
// {x, z, hit} (the solid it was last pushed from, or null). Cheap: it asks the grid once.
export function pushOutOfSolids(x, z, radius = .4, grid = SOLID_GRID, actorHeight) {
  let hit = null;
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const solid of grid.near(x, z, x, z, radius + 2)) {
      // A mover on a deck passes over what stands under it (the bridge's piers), and a mover down in the bed passes under the deck's trusses and pipeline.
      if (solid.verticalClearance) { const ground = Number.isFinite(actorHeight) ? actorHeight : scablandsSurfaceHeightAt(x, z); if (ground > solid.maxY - .01 || ground + 2.5 < solid.minY) continue; }
      const cos = Math.cos(solid.heading), sin = Math.sin(solid.heading), dx = x - solid.x, dz = z - solid.z;
      const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
      let nx, nz, depth;
      if (solid.shape === 'ellipse') {
        const rx = solid.halfX + radius, rz = solid.halfZ + radius, r = Math.hypot(lx / rx, lz / rz);
        if (r >= 1) continue;
        // Out along the line from the middle: close enough for a round post.
        const length = Math.hypot(lx, lz) || 1; nx = lx / length; nz = lz / length; depth = (1 - r) * Math.min(rx, rz);
      } else {
        const ox = solid.halfX + radius - Math.abs(lx), oz = solid.halfZ + radius - Math.abs(lz);
        if (ox <= 0 || oz <= 0) continue;
        if (ox < oz) { nx = Math.sign(lx) || 1; nz = 0; depth = ox; } else { nx = 0; nz = Math.sign(lz) || 1; depth = oz; }
      }
      // Back to the world: the solid's x axis is (cos h, -sin h) and its z axis (sin h, cos h).
      x += (nx * cos + nz * sin) * depth; z += (-nx * sin + nz * cos) * depth;
      hit = solid; moved = true;
    }
    if (!moved) break;
  }
  return {x, z, hit};
}
