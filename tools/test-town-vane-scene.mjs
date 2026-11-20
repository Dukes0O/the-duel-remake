// TOWN-VANE-SCENE: Mrs Vane's kiosks stand at the town's edge while its water is brown, her billboards, depots, tanks and white fences at the
// territories' sites as her deeds grow, and Vane Reach beyond the Dry Dam. Every spot is clear of the roads, the jobs' routes, the places, the
// river and the rail; each part takes its height from the real ground; the solids are cut from the model that draws them; her things go when
// she is driven out; and the town drive is solid at them while no other job is.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {LAND, createLand, movedTable} from '../src/world/scablands-names.js';
import {SCABLANDS_PLACES} from '../src/world/scablands.js';
import {distanceToNet, ROAD_HALF_WIDTH} from '../src/world/scablands-road.js';
import {thingFootprintClear} from '../src/world/scablands-things.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {nearGroundHeightAt} from '../src/world/near-ground.js';
import {RIVER, RIVER_LAND} from '../src/world/scablands-regions.js';
import {IRON_LINE, nearestIronLineDistance} from '../src/world/iron-line.js';
import {EVERBURN_JOBS, EVERBURN_SIDE_JOBS} from '../src/world/jobs/everburn.js';
import {GAS_RUN_ROADS, gasRunJob, fieldBattleJob} from '../src/world/jobs/gas-run.js';
import {createJobSolidGrid, pushOutOfSolids, SCABLANDS_SOLIDS, WHEEL_HEIGHT} from '../src/world/scablands-solids.js';
import {cellIsReserved, TOWN_CELL_METRES} from '../src/town/town-world-data.js';
import {TOWN_DEEDS, TOWN_DEED_TERRITORIES} from '../src/town/content/deeds.js';
import {VANE_KIOSK_PITCHES, VANE_KIOSK_REACH, VANE_MODEL, VANE_PIECES, VANE_REACH, VANE_SITES, VANE_SITE_REACH} from '../src/town/content/vane-world.js';
import {townVaneWorld, townEdge, placeVaneReach} from '../src/town/town-vane-world.js';
import {townOutpostWorld} from '../src/town/town-outpost-world.js';
import {footprintSamples, thingPoint, TOWN_THING_SINK} from '../src/town/town-world-things.js';
import {createTown} from '../src/town/town-state.js';
import {createTownWorld} from '../src/town/town-world.js';
import {createTownVaneScene, VANE_DRAW_RANGE} from '../src/town/view/town-vane-scene.js';
import {setScablandsTownLayout, clearScablandsTownLayout} from '../src/world/scablands-ground.js';
import {Duel} from '../src/game.js';
import {cleanupWorldJobLoan} from '../src/arena/modes/world-job.js';

const jobs = [...EVERBURN_JOBS, ...EVERBURN_SIDE_JOBS, ...GAS_RUN_ROADS.map(road => gasRunJob({road})), fieldBattleJob()];
const jobStarts = jobs.map(job => job.steps[0]?.carStart).filter(Boolean);
const drawnAt = (x, z) => nearGroundHeightAt(x, z, scablandsSurfaceHeightAt);
const inside = (solid, x, z, slack = 0) => { const c = Math.cos(solid.heading), s = Math.sin(solid.heading), dx = x - solid.x, dz = z - solid.z;
  return Math.abs(dx * c - dz * s) < solid.halfX - slack && Math.abs(dx * s + dz * c) < solid.halfZ - slack; };
const corners = solid => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => {
  const c = Math.cos(solid.heading), s = Math.sin(solid.heading), lx = sx * solid.halfX, lz = sz * solid.halfZ;
  return {x: solid.x + lx * c + lz * s, z: solid.z - lx * s + lz * c};
});
// A town where she holds every deed and has a kiosk on each of five brown streets.
function vaneTown({kiosks = 5, deeds = TOWN_DEEDS.map(deed => deed.id), buildings = []} = {}) {
  const town = createTown(1405, 'Vane town');
  town.buildings.push(...buildings);
  town.utilities ??= {};
  town.utilities.taps = [];
  town.vane = {kiosks: []};
  for (let n = 0; n < kiosks; n++) {
    const angle = n * 1.3;
    town.utilities.taps.push({id: `street-${n + 1}`, x: Math.cos(angle) * 60, z: -112 + Math.sin(angle) * 60});
    town.vane.kiosks.push({id: `vane-kiosk-${n + 1}`, streetId: `street-${n + 1}`, openedMonth: 80, open: true});
  }
  town.deeds = {version: 1, items: Object.fromEntries(deeds.map(id => [id, {ownerId: 'vane'}]))};
  return town;
}
const allParts = world => [...world.kiosks, ...world.sites.flatMap(site => site.pieces), world.reach];

test('her spots are new data: each is a place of the land plus an offset, and no place moves', () => {
  const before = JSON.stringify(SCABLANDS_PLACES), town = vaneTown();
  assert.deepEqual(townVaneWorld(town), townVaneWorld(town), 'placement is repeatable');
  assert.equal(JSON.stringify(SCABLANDS_PLACES), before);
  assert.deepEqual(new Set(VANE_SITES.map(site => site.territoryId)), new Set(TOWN_DEED_TERRITORIES.map(row => row.id)), 'one site a territory');
  const reach = placeVaneReach(), moved = placeVaneReach({land: createLand(movedTable(SCABLANDS_PLACES, 'dry-dam', 30, 20))});
  assert.ok(Math.abs(moved.x - reach.x - 30) < 1e-9 && Math.abs(moved.z - reach.z - 20) < 1e-9, 'Vane Reach follows the Dry Dam');
  const dam = LAND.place('dry-dam'), yard = LAND.yard;
  const along = ((reach.x - dam.x) * (dam.x - yard.x) + (reach.z - dam.z) * (dam.z - yard.z)) / Math.hypot(dam.x - yard.x, dam.z - yard.z);
  assert.ok(along > 600, `Vane Reach is beyond the Dry Dam, seen from the yard (${along.toFixed(0)} m past it)`);
  assert.ok(Math.hypot(reach.x - dam.x, reach.z - dam.z) < VANE_REACH.drawRange - 600, 'and drawn when you stand at the Dry Dam');
});

test('no spot of hers stands on a road, a job route, an existing place, a crossing, the river, the rail or the town\'s reserved ground', () => {
  const outposts = townOutpostWorld(null).outposts;
  const check = (label, x, z, reach) => {
    assert.ok(thingFootprintClear(x, z, Math.min(28, reach), jobStarts), `${label}: its ${reach} m reach is clear of roads, routes, job places and solids`);
    assert.ok(distanceToNet(x, z) >= ROAD_HALF_WIDTH + reach, `${label}: off the road`);
    for (const place of SCABLANDS_PLACES) assert.ok(Math.hypot(x - place.x, z - place.z) >= place.flatRadius + reach, `${label} is not on ${place.id}`);
    for (const point of LAND.named) assert.ok(Math.hypot(x - point.x, z - point.z) > reach + 30, `${label} is clear of ${point.id}`);
    const river = RIVER_LAND.nearest(x, z);
    assert.ok(!river || river.distance > RIVER.lipHalfWidth + reach, `${label} is out of the river`);
    assert.ok(nearestIronLineDistance(IRON_LINE, {x, y: 0, z}).distance > reach + 2, `${label} is off the rail`);
    for (const outpost of outposts) assert.ok(Math.hypot(x - outpost.x, z - outpost.z) > outpost.reach + reach, `${label} is clear of ${outpost.name}`);
  };
  VANE_KIOSK_PITCHES.forEach(([x, z], index) => {
    check(`kiosk pitch ${index + 1}`, x, z, VANE_KIOSK_REACH);
    for (let dx = -VANE_KIOSK_REACH; dx <= VANE_KIOSK_REACH; dx += 2) for (let dz = -VANE_KIOSK_REACH; dz <= VANE_KIOSK_REACH; dz += 2)
      assert.equal(cellIsReserved('scablands', Math.floor((x + dx) / TOWN_CELL_METRES), Math.floor((z + dz) / TOWN_CELL_METRES)), false, `kiosk pitch ${index + 1} is off the town's reserved ground`);
    VANE_KIOSK_PITCHES.forEach(([ox, oz], other) => { if (other !== index) assert.ok(Math.hypot(ox - x, oz - z) > 2 * VANE_KIOSK_REACH); });
  });
  const world = townVaneWorld(vaneTown());
  assert.equal(world.sites.length, 8, 'a town where she holds every deed shows all eight sites');
  for (const site of world.sites) {
    check(`the ${site.territoryId} site`, site.x, site.z, VANE_SITE_REACH);
    for (const piece of site.pieces) for (const solid of piece.solids) for (const corner of corners(solid))
      assert.ok(Math.hypot(corner.x - site.x, corner.z - site.z) <= VANE_SITE_REACH, `${solid.id} is inside its site's cleared reach`);
  }
  // Vane Reach is 46 m across: its middle and each of its four feet are checked.
  const reach = world.reach;
  check('Vane Reach', reach.x, reach.z, VANE_REACH.reach);
  for (const solid of reach.solids) check(solid.id, solid.x, solid.z, Math.hypot(solid.halfX, solid.halfZ) + 2);
  for (const part of allParts(world)) for (const solid of part.solids)
    assert.ok(!SCABLANDS_SOLIDS.some(other => Math.hypot(other.x - solid.x, other.z - solid.z) < other.halfX + other.halfZ + solid.halfX + solid.halfZ), `${solid.id} meets no solid of the land`);
});

test('each part takes its height from the real ground: pad edges in the ground, nothing floating, nothing buried to its roof', () => {
  const world = townVaneWorld(vaneTown({kiosks: 12}));
  assert.ok(world.kiosks.length === 12);
  for (const part of allParts(world)) {
    const piece = VANE_PIECES[part.piece];
    const ground = footprintSamples(piece.bounds).map(([lx, lz]) => { const p = thingPoint(part, lx, lz); return scablandsSurfaceHeightAt(p.x, p.z); });
    assert.ok(Math.abs(part.base - (Math.min(...ground) - TOWN_THING_SINK)) < 1e-9, `${part.id}: its floor is the lowest ground under it, less the sink`);
    const lowest = Math.min(...piece.boxes.map(box => box[4]));
    assert.ok(part.buried <= .7 && part.buried < lowest * .25, `${part.id}: its uphill edge is ${part.buried.toFixed(2)} m in, far below its lowest part (${lowest} m)`);
    const drawn = footprintSamples(piece.bounds).map(([lx, lz]) => { const p = thingPoint(part, lx, lz); return drawnAt(p.x, p.z); });
    assert.ok(Math.max(...drawn) - Math.min(...drawn) <= .8, `${part.id}: the drawn ground under it rises ${(Math.max(...drawn) - Math.min(...drawn)).toFixed(2)} m`);
    for (const solid of part.solids) assert.equal(solid.base, part.base);
  }
});

test('every part of hers taller than a wheel stands inside one of its solids, cut from the model that draws it', async () => {
  const hadSelf = Object.getOwnPropertyDescriptor(globalThis, 'self');
  globalThis.self ??= globalThis;
  try {
    const bytes = readFileSync(new URL('../public' + VANE_MODEL, import.meta.url));
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), v = new THREE.Vector3();
    for (const [name, piece] of Object.entries(VANE_PIECES)) {
      const node = gltf.scene.getObjectByName(piece.node);
      assert.ok(node, `${piece.node} is in the model`);
      node.updateWorldMatrix(true, true);
      const inverse = new THREE.Matrix4().copy(node.matrixWorld).invert(), box = new THREE.Box3();
      node.traverse(mesh => { if (!mesh.isMesh) return; const p = mesh.geometry.attributes.position; for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse)); });
      const [west, north, east, south] = piece.bounds;
      for (const [table, real] of [[west, box.min.x], [north, box.min.z], [east, box.max.x], [south, box.max.z]])
        assert.ok(Math.abs(table - real) < .15, `${name}: a bound of ${table} in the table is ${real.toFixed(2)} in the model`);
      assert.ok(Math.abs(piece.lift + box.min.y) < .02, `${name}: lifted ${piece.lift} m, its lowest point is ${box.min.y.toFixed(2)} m`);
      // The tower is solid where a car meets it: everything of it lower than 4 m. Every other part, everything above a wheel.
      const band = name === 'tower' ? 4 : Infinity, thing = {x: 0, z: 0, heading: 0}, points = [];
      node.traverse(mesh => {
        if (!mesh.isMesh) return;
        const local = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld), p = mesh.geometry.attributes.position, index = mesh.geometry.index;
        const count = index ? index.count / 3 : p.count / 3;
        for (let t = 0; t < count; t++) {
          const i0 = index ? index.getX(t * 3) : t * 3, i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1, i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;
          a.fromBufferAttribute(p, i0).applyMatrix4(local); b.fromBufferAttribute(p, i1).applyMatrix4(local); c.fromBufferAttribute(p, i2).applyMatrix4(local);
          const area = b.clone().sub(a).cross(c.clone().sub(a)).length() / 2, steps = Math.max(1, Math.min(30, Math.ceil(Math.sqrt(area) / .5)));
          for (let i = 0; i <= steps; i++) for (let j = 0; j <= steps - i; j++) {
            const u = i / steps, w2 = j / steps, w = 1 - u - w2, y = a.y * w + b.y * u + c.y * w2 + piece.lift;
            if (y >= WHEEL_HEIGHT + .2 && y <= band) points.push({x: a.x * w + b.x * u + c.x * w2, z: a.z * w + b.z * u + c.z * w2});
          }
        }
      });
      const solids = boxSolidsAt(thing, piece);
      assert.ok(points.length > 300, `${name}: the model has parts a car meets (${points.length} points)`);
      const held = points.filter(point => solids.some(solid => inside(solid, point.x, point.z, -.3)));
      assert.ok(held.length / points.length > .995, `${name}: ${(100 * held.length / points.length).toFixed(2)} percent of the parts a car meets are inside a solid`);
      for (const solid of solids) assert.ok(points.some(point => inside(solid, point.x, point.z)), `${solid.id} holds some of the drawn model`);
      assert.ok(Math.max(...piece.boxes.map(item => item[4])) >= box.max.y + piece.lift - .1, `${name} is no taller than its solids`);
    }
  } finally {
    if (hadSelf) Object.defineProperty(globalThis, 'self', hadSelf); else delete globalThis.self;
  }
});
function boxSolidsAt(thing, piece) {
  return piece.boxes.map(([west, north, east, south, height], index) => ({id: `${piece.node}-${index + 1}`, x: (west + east) / 2, z: (north + south) / 2,
    halfX: (east - west) / 2 + .3, halfZ: (south - north) / 2 + .3, heading: 0, height}));
}

test('her things grow with her deeds and her kiosks, and go when she is driven out', () => {
  const town = vaneTown({kiosks: 0, deeds: []});
  const bare = townVaneWorld(town);
  assert.equal(bare.sites.length, 0, 'no deeds, no sites');
  assert.equal(bare.kiosks.length, 0, 'no kiosks');
  assert.ok(bare.reach.solids.length > 0, 'Vane Reach has stood beyond the Dry Dam since the Long Dry');
  town.deeds.items['sal-road'] = {ownerId: 'vane'};
  let sal = townVaneWorld(town).sites.find(site => site.territoryId === 'sal');
  assert.deepEqual(sal.pieces.map(piece => piece.piece), ['billboard'], 'a road deed puts up a billboard');
  const road = sal.pieces[0];
  assert.ok(Math.hypot(road.x - sal.road.x, road.z - sal.road.z) < Math.hypot(sal.x - sal.road.x, sal.z - sal.road.z), 'the billboard is on the road side of the site');
  town.deeds.items['sal-works'] = {ownerId: 'vane'};
  town.deeds.items['sal-outpost'] = {ownerId: 'vane'};
  sal = townVaneWorld(town).sites.find(site => site.territoryId === 'sal');
  assert.deepEqual(sal.pieces.map(piece => piece.piece).sort(), ['billboard', 'depot', 'fence', 'fence', 'fence', 'tank'], 'works and outpost deeds add a depot, a tank and white fences');
  town.deeds.items['sal-works'] = {ownerId: 'player'};
  sal = townVaneWorld(town).sites.find(site => site.territoryId === 'sal');
  assert.ok(!sal.pieces.some(piece => piece.piece === 'depot'), 'a deed won back takes her depot away');
  for (const id of ['sal-road', 'sal-outpost']) town.deeds.items[id] = {ownerId: 'player'};
  assert.equal(townVaneWorld(town).sites.length, 0, 'driven out of a territory, nothing of hers is left at its site');
  // Kiosks: one stands for each open kiosk, and goes when its street runs clean.
  const kiosky = vaneTown({kiosks: 3, deeds: []});
  assert.equal(townVaneWorld(kiosky).kiosks.length, 3);
  kiosky.vane.kiosks[1].open = false;
  const after = townVaneWorld(kiosky);
  assert.deepEqual(after.kiosks.map(kiosk => kiosk.id), ['vane-kiosk-1', 'vane-kiosk-3'], 'a closed kiosk is gone');
});

test('a kiosk stands at the town\'s edge on its street\'s side, never on the town\'s buildings', () => {
  // A small town east of the gate, and one brown street on its east side.
  const buildings = [{id: 'hall', buildingId: 'town-hall', regionId: 'scablands', x: 12, z: -18, width: 3, depth: 3},
    {id: 'well', buildingId: 'hand-well', regionId: 'scablands', x: 18, z: -16, width: 1, depth: 1}];
  const town = createTown(1405, 'Edge town');
  town.buildings.push(...buildings);
  town.utilities ??= {};
  town.utilities.taps = [{id: 'east-street', x: 160, z: -120}];
  town.vane = {kiosks: [{id: 'vane-kiosk-1', streetId: 'east-street', open: true}]};
  const edge = townEdge(town), [kiosk] = townVaneWorld(town).kiosks;
  assert.ok(Math.hypot(kiosk.x - edge.x, kiosk.z - edge.z) >= edge.radius, 'outside the town');
  assert.ok(kiosk.x > edge.x, 'on the side of its brown street');
  const front = thingPoint(kiosk, 0, -10);
  assert.ok(Math.hypot(front.x - edge.x, front.z - edge.z) < Math.hypot(kiosk.x - edge.x, kiosk.z - edge.z), 'its counter faces the town');
  // Build over that pitch: the kiosk moves to the next free one.
  const [px, pz] = VANE_KIOSK_PITCHES[kiosk.pitch];
  town.buildings.push({id: 'shed', buildingId: 'salvage-yard', regionId: 'scablands', x: Math.floor(px / 8), z: Math.floor(pz / 8), width: 1, depth: 1});
  const [moved] = townVaneWorld(town).kiosks;
  assert.notEqual(moved.pitch, kiosk.pitch, 'a pitch the town has built on is not used');
});

const MPH = 1.609344, DT = 1 / 60;
test('a town drive is solid at her things, and no other drive is', () => {
  const town = vaneTown({kiosks: 2});
  const layout = createTownWorld(town), reach = layout.vane.reach, kiosk = layout.vane.kiosks[0];
  const duel = new Duel({seed: 1989, featureFlags: {'wasteland-town': true}});
  duel.state.wastelandGateDiscovered = true;
  setScablandsTownLayout(layout);
  try {
    assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', job: {id: 'town-drive', kind: 'town-drive', steps: [], seed: 1989, layout}}), true);
    const grid = duel.state.arena.worldJob.solidGrid;
    for (const part of [reach, kiosk]) {
      const found = grid.near(part.x, part.z, part.x, part.z, 30).filter(solid => solid.id.startsWith(part.id));
      assert.equal(found.length, part.solids.length, `${part.id} is solid in the drive`);
    }
    // A body walking into the shaft of Vane Reach is pushed out of it.
    const shaft = layout.vane.reach.solids.find(solid => solid.height > 60), pushed = pushOutOfSolids(shaft.x + 4.1, shaft.z, .4, grid);
    assert.ok(pushed.hit && !inside(shaft, pushed.x, pushed.z, .05), 'a body is pushed out of the tower\'s shaft');
  } finally {
    cleanupWorldJobLoan(duel);
    clearScablandsTownLayout();
  }
  const plain = createJobSolidGrid();
  assert.equal(plain.near(reach.x, reach.z, reach.x, reach.z, 30).some(solid => solid.id.startsWith('vane-reach')), false);
});

test('the scene draws each part on the drawn ground, Vane Reach far off and the rest only near', async () => {
  const hadSelf = Object.getOwnPropertyDescriptor(globalThis, 'self');
  globalThis.self ??= globalThis;
  const loader = new GLTFLoader(), asked = [];
  const loadAsset = async path => { asked.push(path); const bytes = readFileSync(new URL('../public' + path, import.meta.url));
    return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''); };
  const world = townVaneWorld(vaneTown({kiosks: 2}));
  const view = createTownVaneScene({vane: world, loadAsset, drawnHeightAt: drawnAt});
  try {
    assert.equal(await view.ready, true);
    assert.deepEqual(view.group.userData.loadErrors, []);
    assert.equal(asked.length, 1, 'her model is loaded once');
    const things = view.group.userData.things;
    assert.equal(things.length, allParts(world).length, 'every part is drawn');
    for (const thing of things) {
      assert.equal(thing.holder.children.length, 1);
      assert.equal(thing.holder.children[0].name, thing.piece.node);
      assert.equal(thing.holder.children[0].children[0].position.y, thing.piece.lift, 'its feet are on its floor');
      const drawn = footprintSamples(thing.piece.bounds).map(([lx, lz]) => { const p = thingPoint(thing.placed, lx, lz); return drawnAt(p.x, p.z); });
      assert.ok(Math.abs(thing.holder.position.y - (Math.min(...drawn) - TOWN_THING_SINK)) < 1e-9, `${thing.placed.id} stands on the drawn ground with its pad edges in it`);
    }
    // At the Dry Dam: Vane Reach is drawn, 750 m off; her kiosks by the town are not.
    view.update(LAND.place('dry-dam'));
    assert.equal(things.find(thing => thing.placed.id === 'vane-reach').holder.visible, true, 'Vane Reach is seen from the Dry Dam');
    assert.ok(things.filter(thing => thing.placed.piece === 'kiosk').every(thing => !thing.holder.visible), 'the town\'s kiosks are out of sight there');
    const kiosk = world.kiosks[0];
    view.update({x: kiosk.x + VANE_DRAW_RANGE - 100, z: kiosk.z});
    assert.equal(things.find(thing => thing.placed.id === kiosk.id).holder.visible, true);
  } finally {
    view.dispose();
    if (hadSelf) Object.defineProperty(globalThis, 'self', hadSelf); else delete globalThis.self;
  }
});
