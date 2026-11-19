// TOWN-OUTPOST-SCENE: the neighbours' outposts stand in the Scablands as solid things. Every placed thing (each outpost, its fence, its
// people and its animals) is clear of the roads, the jobs' routes, the places and the rail; each takes its height from the real ground
// with its pad's edges buried and nothing buried to its roof; the solids are cut from the model that draws them; the fence comes with
// protection; and the drive is solid at them while no other job is.
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
import {STORY_FIGURES} from '../src/world/jobs/story-people.js';
import {createJobSolidGrid, pushOutOfSolids, SCABLANDS_SOLIDS, WHEEL_HEIGHT} from '../src/world/scablands-solids.js';
import {OUTPOSTS_WORLD, OUTPOST_MODEL, OUTPOST_FENCE} from '../src/town/content/outposts-world.js';
import {TOWN_NEIGHBOURS} from '../src/town/content/neighbours.js';
import {townOutpostWorld, placeOutpost} from '../src/town/town-outpost-world.js';
import {thingLocal, thingPoint, footprintSamples, TOWN_THING_SINK} from '../src/town/town-world-things.js';
import {createTown} from '../src/town/town-state.js';
import {setTownOutpostProtection} from '../src/town/town-outposts.js';
import {createTownWorld} from '../src/town/town-world.js';
import {createTownOutpostsScene, outpostAnimalSpecies, OUTPOST_STEP_ASIDE} from '../src/town/view/town-outposts-scene.js';
import {setScablandsTownLayout, clearScablandsTownLayout} from '../src/world/scablands-ground.js';
import {Duel} from '../src/game.js';
import {cleanupWorldJobLoan} from '../src/arena/modes/world-job.js';
import {placeActor} from '../src/arena/arena-event.js';
import {wrapHeading} from '../src/offroad-physics.js';

const jobs = [...EVERBURN_JOBS, ...EVERBURN_SIDE_JOBS, ...GAS_RUN_ROADS.map(road => gasRunJob({road})), fieldBattleJob()];
const jobStarts = jobs.map(job => job.steps[0]?.carStart).filter(Boolean);
const everyone = {dot: {protected: true}, quill: {protected: true}, tam: {protected: true}, imre: {protected: true}, pim: {protected: true}};
const protectedTown = {seed: 1405, outposts: everyone};
const drawnAt = (x, z) => nearGroundHeightAt(x, z, scablandsSurfaceHeightAt);
const inside = (solid, x, z, slack = 0) => { const c = Math.cos(solid.heading), s = Math.sin(solid.heading), dx = x - solid.x, dz = z - solid.z;
  return Math.abs(dx * c - dz * s) < solid.halfX - slack && Math.abs(dx * s + dz * c) < solid.halfZ - slack; };
const corners = solid => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => {
  const c = Math.cos(solid.heading), s = Math.sin(solid.heading), lx = sx * solid.halfX, lz = sz * solid.halfZ;
  return {x: solid.x + lx * c + lz * s, z: solid.z - lx * s + lz * c};
});
// Every point a thing of an outpost stands on: its solids' corners, its fence's ends, its people's spots and its animals' spots.
function placedPoints(outpost) {
  const points = [];
  for (const solid of outpost.solids) for (const corner of corners(solid)) points.push({what: solid.id, ...corner});
  for (const piece of outpost.fence) for (const end of piece.ends) points.push({what: piece.id, ...end});
  for (const person of outpost.people) for (const spot of [person.home, person.aside, ...(person.wander ?? [])].filter(Boolean)) points.push({what: person.who, ...spot});
  for (const animal of outpost.animals) for (const spot of animal.wander) points.push({what: animal.who, ...spot});
  return points;
}

test('the outposts are new data: each is a place of the land plus an offset, moves with its place, and moves no place', () => {
  const before = JSON.stringify(SCABLANDS_PLACES);
  const world = townOutpostWorld(protectedTown);
  assert.equal(JSON.stringify(SCABLANDS_PLACES), before, 'no place of the land moved');
  assert.deepEqual(world, townOutpostWorld(protectedTown), 'placement is repeatable');
  assert.deepEqual(new Set(OUTPOSTS_WORLD.map(row => row.neighbourId)), new Set(TOWN_NEIGHBOURS.map(row => row.id)), 'one outpost for each neighbour');
  for (const row of OUTPOSTS_WORLD) {
    const moved = createLand(movedTable(SCABLANDS_PLACES, row.at[0], 40, -30));
    const a = placeOutpost(row), b = placeOutpost(row, {land: moved});
    assert.ok(Math.abs(b.x - a.x - 40) < 1e-9 && Math.abs(b.z - a.z + 30) < 1e-9, `${row.id} follows ${row.at[0]}`);
  }
});

test('nothing an outpost places stands on a road, a job route, an existing place, a crossing, the river or the rail', () => {
  const world = townOutpostWorld(protectedTown);
  for (const outpost of world.outposts) {
    // The whole reach (the fence ring, the people and the animals inside it) is clear: the road net and its edges, the jobs' routes and
    // driving legs, the jobs' places and starts, the crossings and every solid the land has (src/world/scablands-things.js).
    assert.ok(thingFootprintClear(outpost.x, outpost.z, outpost.reach, jobStarts), `${outpost.id}: its ${outpost.reach} m reach is clear`);
    assert.ok(distanceToNet(outpost.x, outpost.z) >= ROAD_HALF_WIDTH + outpost.reach, `${outpost.id}: off the road`);
    for (const place of SCABLANDS_PLACES)
      assert.ok(Math.hypot(outpost.x - place.x, outpost.z - place.z) >= place.flatRadius + outpost.reach, `${outpost.id} is not on ${place.id}`);
    for (const point of LAND.named) assert.ok(Math.hypot(outpost.x - point.x, outpost.z - point.z) > outpost.reach + 30, `${outpost.id} is clear of ${point.id}`);
    const river = RIVER_LAND.nearest(outpost.x, outpost.z);
    assert.ok(!river || river.distance > RIVER.lipHalfWidth + outpost.reach, `${outpost.id} is out of the river`);
    for (const point of placedPoints(outpost)) {
      assert.ok(Math.hypot(point.x - outpost.x, point.z - outpost.z) <= outpost.reach, `${outpost.id}: ${point.what} is inside the cleared reach`);
      // The rail: only the halt's platform edge comes near it, and nothing stands on it.
      const rail = nearestIronLineDistance(IRON_LINE, {x: point.x, y: 0, z: point.z}).distance;
      assert.ok(rail >= 1.8, `${outpost.id}: ${point.what} is ${rail.toFixed(1)} m from the rail`);
    }
    // No solid of the land is inside an outpost's solids, and no two outposts touch.
    for (const solid of outpost.solids) assert.ok(!SCABLANDS_SOLIDS.some(other => Math.hypot(other.x - solid.x, other.z - solid.z) < other.halfX + other.halfZ + solid.halfX + solid.halfZ), `${solid.id} meets no solid of the land`);
    for (const other of world.outposts) if (other !== outpost)
      assert.ok(Math.hypot(other.x - outpost.x, other.z - outpost.z) > other.reach + outpost.reach, `${outpost.id} and ${other.id} are apart`);
  }
  const halt = world.outposts.find(outpost => outpost.id === 'rail-halt');
  assert.ok(Math.abs(halt.faces.distance - 8.5) < .5, `the halt's platform is beside the rail (${halt.faces.distance.toFixed(1)} m from its middle)`);
});

test('each outpost takes its height from the real ground: its pad edges in the ground, nothing floating, nothing buried to its roof', () => {
  const world = townOutpostWorld(protectedTown);
  for (const outpost of world.outposts) {
    const row = OUTPOSTS_WORLD.find(item => item.id === outpost.id);
    const ground = footprintSamples(row.bounds).map(([lx, lz]) => { const p = thingPoint(outpost, lx, lz); return scablandsSurfaceHeightAt(p.x, p.z); });
    assert.ok(Math.abs(outpost.base - (Math.min(...ground) - TOWN_THING_SINK)) < 1e-9, `${outpost.id}: its floor is the lowest ground under it, less the sink`);
    assert.ok(ground.every(y => y >= outpost.base + TOWN_THING_SINK - 1e-9), `${outpost.id}: every edge of its pad is in the ground (none floats)`);
    const lowest = Math.min(...row.boxes.map(box => box[4]));
    assert.ok(outpost.buried <= .5 && outpost.buried < lowest * .25, `${outpost.id}: its uphill edge is ${outpost.buried.toFixed(2)} m deep, far below its lowest part (${lowest} m)`);
    // The drawn ground too: the drawing sets the model on it the same way.
    const drawn = footprintSamples(row.bounds).map(([lx, lz]) => { const p = thingPoint(outpost, lx, lz); return drawnAt(p.x, p.z); });
    assert.ok(Math.max(...drawn) - Math.min(...drawn) <= .6, `${outpost.id}: the drawn ground under it rises ${(Math.max(...drawn) - Math.min(...drawn)).toFixed(2)} m`);
    for (const solid of outpost.solids) assert.equal(solid.base, solid.kind === 'fence' ? solid.base : outpost.base);
    for (const piece of outpost.fence) {
      const along = [0, .25, .5, .75, 1].map(t => scablandsSurfaceHeightAt(piece.ends[0].x + (piece.ends[1].x - piece.ends[0].x) * t, piece.ends[0].z + (piece.ends[1].z - piece.ends[0].z) * t));
      assert.ok(piece.base <= Math.min(...piece.ends.map(end => scablandsSurfaceHeightAt(end.x, end.z))), `${piece.id} stands in the ground at both ends`);
      assert.ok(Math.max(...along) - piece.base < .4, `${piece.id} is not buried (${(Math.max(...along) - piece.base).toFixed(2)} m at its deepest)`);
    }
    for (const person of outpost.people) {
      if (person.lift) {
        const local = thingLocal(outpost, person.home.x, person.home.z), [west, north, east, south] = row.bounds;
        assert.ok(local.x > west && local.x < east && local.z > north && local.z < south, `${person.who} stands on ${outpost.name}'s own floor`);
        assert.ok(Math.abs(person.home.y - outpost.base - person.lift) < 1e-9);
        assert.ok(!person.aside && !person.wander, `${person.who} stays on the floor (the picture moves only people on the ground)`);
      } else {
        assert.equal(person.home.y, scablandsSurfaceHeightAt(person.home.x, person.home.z), `${person.who} stands on the real ground`);
        // A person on the ground stands, steps aside and walks clear of the outpost's solids and its fence.
        for (const spot of [person.home, person.aside, ...(person.wander ?? [])].filter(Boolean))
          assert.ok(!outpost.solids.some(solid => inside(solid, spot.x, spot.z, -.45)), `${person.who} at (${spot.x.toFixed(1)}, ${spot.z.toFixed(1)}) is clear of ${outpost.name}`);
      }
      assert.ok(Object.hasOwn(STORY_FIGURES, person.figure), `${person.who} is drawn from the story cast`);
    }
    for (const animal of outpost.animals) for (const spot of animal.wander)
      if (!animal.lift) assert.ok(!outpost.solids.some(solid => inside(solid, spot.x, spot.z, -.6)), `${animal.who} graze clear of ${outpost.name}`);
  }
  const school = world.outposts.find(outpost => outpost.id === 'plane-school');
  assert.ok(school.people.find(person => person.who === 'Bo').wander.length >= 4, 'Bo goes round the school');
  const halt = world.outposts.find(outpost => outpost.id === 'rail-halt');
  assert.ok(halt.animals.some(animal => animal.who === 'Tuesday' && animal.lift === .2), 'Tuesday is on the platform');
  const camp = world.outposts.find(outpost => outpost.id === 'hermit-camp');
  assert.equal(camp.animals.filter(animal => animal.kind === 'goat').length, 8, 'Tam has his goats');
});

test('every part of an outpost taller than a wheel stands inside one of its solids, cut from the model that draws it', async () => {
  const hadSelf = Object.getOwnPropertyDescriptor(globalThis, 'self');
  globalThis.self ??= globalThis;
  try {
    const bytes = readFileSync(new URL('../public' + OUTPOST_MODEL, import.meta.url));
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const world = townOutpostWorld(null);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), v = new THREE.Vector3();
    for (const row of OUTPOSTS_WORLD) {
      const outpost = world.outposts.find(item => item.id === row.id), node = gltf.scene.getObjectByName(row.node);
      assert.ok(node, `${row.node} is in the model`);
      node.updateWorldMatrix(true, true);
      const inverse = new THREE.Matrix4().copy(node.matrixWorld).invert(), box = new THREE.Box3();
      node.traverse(mesh => { if (!mesh.isMesh) return; const p = mesh.geometry.attributes.position; for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse)); });
      // The bounds and the lift in the table are the model's own.
      const [west, north, east, south] = row.bounds;
      for (const [table, real] of [[west, box.min.x], [north, box.min.z], [east, box.max.x], [south, box.max.z]])
        assert.ok(Math.abs(table - real) < .15, `${row.id}: a bound of ${table} in the table is ${real.toFixed(2)} in the model`);
      assert.ok(Math.abs(row.lift + box.min.y) < .02, `${row.id}: lifted ${row.lift} m, its lowest point is ${box.min.y.toFixed(2)} m`);
      const points = [];
      node.traverse(mesh => {
        if (!mesh.isMesh) return;
        const local = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld), p = mesh.geometry.attributes.position, index = mesh.geometry.index;
        const count = index ? index.count / 3 : p.count / 3;
        for (let t = 0; t < count; t++) {
          const i0 = index ? index.getX(t * 3) : t * 3, i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1, i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;
          a.fromBufferAttribute(p, i0).applyMatrix4(local); b.fromBufferAttribute(p, i1).applyMatrix4(local); c.fromBufferAttribute(p, i2).applyMatrix4(local);
          const area = b.clone().sub(a).cross(c.clone().sub(a)).length() / 2, steps = Math.max(1, Math.min(30, Math.ceil(Math.sqrt(area) / .5)));
          for (let i = 0; i <= steps; i++) for (let j = 0; j <= steps - i; j++) {
            const u = i / steps, w2 = j / steps, w = 1 - u - w2, y = a.y * w + b.y * u + c.y * w2 + row.lift;
            if (y < WHEEL_HEIGHT + .2) continue;
            points.push(thingPoint(outpost, a.x * w + b.x * u + c.x * w2, a.z * w + b.z * u + c.z * w2));
          }
        }
      });
      const solids = outpost.solids.filter(solid => solid.kind !== 'fence');
      assert.ok(points.length > 500, `${row.id}: the model has parts above a wheel (${points.length} points)`);
      const held = points.filter(point => solids.some(solid => inside(solid, point.x, point.z, -.3)));
      assert.ok(held.length / points.length > .995, `${row.id}: ${(100 * held.length / points.length).toFixed(2)} percent of its parts above a wheel are inside a solid`);
      for (const solid of solids) assert.ok(points.some(point => inside(solid, point.x, point.z)), `${solid.id} holds some of the drawn model`);
      // The tallest part of the model is no taller than the tallest solid.
      assert.ok(Math.max(...row.boxes.map(item => item[4])) >= box.max.y + row.lift - .1, `${row.id} is no taller than its solids`);
    }
  } finally {
    if (hadSelf) Object.defineProperty(globalThis, 'self', hadSelf); else delete globalThis.self;
  }
});

test('the fence comes with protection, and goes when protection ends', () => {
  const town = createTown(1405, 'Fence town');
  const bare = townOutpostWorld(town);
  assert.ok(bare.outposts.every(outpost => outpost.fence.length === 0 && !outpost.solids.some(solid => solid.kind === 'fence')), 'no fence before protection');
  assert.equal(setTownOutpostProtection(town, 'dot', true).ok, true);
  const fenced = townOutpostWorld(town), diner = fenced.outposts.find(outpost => outpost.id === 'dot-diner');
  assert.ok(diner.fence.length >= 6 && diner.solids.filter(solid => solid.kind === 'fence').length === diner.fence.length, 'Dot is fenced, and the fence is solid');
  assert.ok(fenced.outposts.filter(outpost => outpost.id !== 'dot-diner').every(outpost => outpost.fence.length === 0), 'only the protected outpost is fenced');
  // The gate: the middle of the road side is open, so a car can drive in.
  const gate = thingPoint(diner, -9.5, 0), heading = Math.atan2(diner.faces.x - gate.x, diner.faces.z - gate.z);
  for (let metres = -4; metres <= 4; metres += .5) {
    const x = gate.x + Math.sin(heading) * metres, z = gate.z + Math.cos(heading) * metres;
    assert.ok(!diner.solids.some(solid => solid.kind === 'fence' && inside(solid, x, z, -1.2)), 'the gate is open to the road');
  }
  setTownOutpostProtection(town, 'dot', false);
  assert.equal(townOutpostWorld(town).outposts.find(outpost => outpost.id === 'dot-diner').fence.length, 0, 'the fence goes with protection');
});

const MPH = 1.609344, DT = 1 / 60;
function townDrive(layout) {
  const duel = new Duel({seed: 1989, featureFlags: {'wasteland-town': true}});
  duel.state.wastelandGateDiscovered = true;
  setScablandsTownLayout(layout);
  assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', job: {id: 'town-drive', kind: 'town-drive', steps: [], seed: 1989, layout}}), true);
  return duel;
}

test('a town drive is solid at the outposts, and no other drive is', () => {
  const town = createTown(1405, 'Solid town');
  setTownOutpostProtection(town, 'dot', true);
  const layout = createTownWorld(town), diner = layout.outposts.outposts.find(outpost => outpost.id === 'dot-diner');
  assert.equal(layout.solids.some(solid => /dot-diner/.test(solid.id)), false, 'the town\'s own solids are unchanged');
  const duel = townDrive(layout);
  try {
    const grid = duel.state.arena.worldJob.solidGrid;
    assert.ok(grid, 'the drive has a job grid');
    const found = grid.near(diner.x, diner.z, diner.x, diner.z, 2).filter(solid => solid.id.startsWith('dot-diner'));
    assert.ok(found.length >= 13, `the diner and its fence are solid in the drive (${found.length})`);
    // A person on foot (or a raider) walking into the diner is pushed out of it.
    const porch = thingPoint(diner, -5.2, -2), pushed = pushOutOfSolids(porch.x, porch.z, .4, grid);
    assert.ok(pushed.hit && !found.some(solid => inside(solid, pushed.x, pushed.z, .05)), 'a body is pushed out of the diner');
    // A car driven at the diner's front at 50 km/h stops at it and is never inside it.
    const course = duel.course, from = thingPoint(diner, -40, 0), heading = Math.atan2(diner.x - from.x, diner.z - from.z);
    const at = course.nearest(from.x, from.z);
    placeActor(duel, duel.state, {s: at.s, lateral: at.lateral, headingError: wrapHeading(heading - course.at(at.s).heading)}, 50 / MPH);
    const solids = found.filter(solid => solid.kind !== 'fence');
    let slowest = Infinity, inBody = false;
    for (let step = 0; step < 7 / DT; step++) {
      const here = course.worldAt(duel.state.s, duel.state.lateral), now = course.at(duel.state.s).heading + duel.state.headingError;
      const turn = wrapHeading(Math.atan2(diner.x - here.x, diner.z - here.z) - now), kmh = Math.abs(duel.state.speedMph) * MPH;
      duel.setInput({throttle: kmh < 50 ? 1 : 0, brake: 0, steer: Math.max(-1, Math.min(1, -turn * 2)), boost: false, interact: false});
      duel.step(DT);
      const after = course.worldAt(duel.state.s, duel.state.lateral);
      if (solids.some(solid => inside(solid, after.x, after.z, .1))) inBody = true;
      if (Math.hypot(after.x - diner.x, after.z - diner.z) < 14) slowest = Math.min(slowest, Math.abs(duel.state.speedMph) * MPH);
    }
    assert.equal(inBody, false, 'the car is never inside the diner');
    assert.ok(slowest < 12, `the car is stopped at the diner (${slowest.toFixed(1)} km/h at the least)`);
  } finally {
    cleanupWorldJobLoan(duel);
    clearScablandsTownLayout();
  }
  // Any other world job keeps the land's own solids only.
  const plain = createJobSolidGrid();
  assert.equal(plain.near(diner.x, diner.z, diner.x, diner.z, 2).some(solid => solid.id.startsWith('dot-diner')), false);
});

test('the scene draws each outpost on the drawn ground, people step aside, and animals are picked up by name when their models exist', async () => {
  const hadSelf = Object.getOwnPropertyDescriptor(globalThis, 'self');
  globalThis.self ??= globalThis;
  const loader = new GLTFLoader(), asked = [];
  const loadAsset = async path => { asked.push(path); const bytes = readFileSync(new URL('../public' + path, import.meta.url));
    return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''); };
  // The goat and the camp dog have their rows and files (WILD-ART-WASTE): they are taken by name from src/wildlife-models.js.
  assert.equal(outpostAnimalSpecies('goat'), 'goat', 'Tam\'s goats are drawn as the goat');
  assert.equal(outpostAnimalSpecies('dog'), 'camp-dog', 'Tuesday is drawn as the camp dog');
  assert.equal(outpostAnimalSpecies('goat', {}), null, 'a species with no row is not drawn');
  const layout = townOutpostWorld(protectedTown);
  // Without a species row, the scene still stands: every outpost and its people, and no animal.
  const bare = createTownOutpostsScene({outposts: layout.outposts, loadAsset, drawnHeightAt: drawnAt, wildlife: {}});
  try {
    assert.equal(await bare.ready, true);
    assert.deepEqual(bare.group.userData.loadErrors, []);
    assert.ok(bare.group.userData.sites.every(site => site.site.children.length === 1 && site.animals.length === 0), 'no animals, every outpost drawn');
  } finally { bare.dispose(); }
  asked.length = 0;
  const view = createTownOutpostsScene({outposts: layout.outposts, loadAsset, drawnHeightAt: drawnAt});
  try {
    assert.equal(await view.ready, true);
    assert.deepEqual(view.group.userData.loadErrors, []);
    assert.equal(asked.filter(path => path === OUTPOST_MODEL).length, 1, 'the outposts model is loaded once');
    for (const site of view.group.userData.sites) {
      const row = OUTPOSTS_WORLD.find(item => item.id === site.outpost.id);
      assert.equal(site.site.children.length, 1, `${row.id} is drawn`);
      assert.equal(site.site.children[0].name, row.node);
      const drawn = footprintSamples(row.bounds).map(([lx, lz]) => { const p = thingPoint(site.outpost, lx, lz); return drawnAt(p.x, p.z); });
      assert.ok(Math.abs(site.site.position.y - (Math.min(...drawn) - TOWN_THING_SINK)) < 1e-9, `${row.id} stands on the drawn ground with its pad edges in it`);
      assert.equal(site.fence.children.length, site.outpost.fence.length, `${row.id}: its fence is drawn piece by piece`);
      assert.ok(site.fence.children.every(piece => piece.children[0].name === OUTPOST_FENCE.node));
    }
    // Each outpost's people come from the story cast, drawn once the car is near.
    for (const site of view.group.userData.sites) {
      view.update({x: site.outpost.x + 20, z: site.outpost.z}, 0, null);
      await site.people.group.userData.ready;
      assert.equal(site.people.group.children.length, site.cast.length, `${site.outpost.id}: its people are drawn`);
      assert.equal(site.people.group.userData.loadError ?? null, null);
    }
    const camp = view.group.userData.sites.find(site => site.outpost.id === 'hermit-camp');
    assert.equal(camp.animals.length, 8, 'Tam\'s eight goats are drawn');
    assert.ok(camp.animals.every(goat => goat.species === 'goat' && goat.idle && goat.move), 'each goat has its Idle and Walk clips');
    const halt = view.group.userData.sites.find(site => site.outpost.id === 'rail-halt');
    assert.deepEqual(halt.animals.map(dog => dog.species), ['camp-dog'], 'Tuesday is drawn at the halt');
    assert.ok(halt.animals[0].idle && halt.animals[0].move, 'Tuesday has her Idle and Walk clips');
    // A car comes up to Dot: she steps aside, and goes back when it has gone.
    const diner = view.group.userData.sites.find(site => site.outpost.id === 'dot-diner'), dot = diner.cast[0], plan = diner.outpost.people[0];
    let seconds = 0;
    const run = (viewer, time) => { for (let t = 0; t < time; t += 1 / 30) view.update(viewer, seconds += 1 / 30, null); };
    run({x: plan.home.x + 3, z: plan.home.z}, 6);
    assert.ok(Math.hypot(dot.position.x - plan.aside.x, dot.position.z - plan.aside.z) < .2, 'Dot has stepped aside from the car');
    run({x: plan.home.x + OUTPOST_STEP_ASIDE.clear + 40, z: plan.home.z}, 12);
    assert.ok(Math.hypot(dot.position.x - plan.home.x, dot.position.z - plan.home.z) < .2, 'Dot is back where she stood');
    // Bo goes round the school while the car is near enough to see him.
    const school = view.group.userData.sites.find(site => site.outpost.id === 'plane-school'), bo = school.cast[1];
    const start = {...bo.position};
    run({x: school.outpost.x + 60, z: school.outpost.z}, 10);
    assert.ok(bo.distance > 5 && Math.hypot(bo.position.x - start.x, bo.position.z - start.z) > .5, 'Bo wanders');
    // The animals stand on their ground (the goats on the drawn ground, Tuesday on the platform) and face the way they walk: the models'
    // noses are along +x, so a turn of `yaw` points the nose at (cos yaw, -sin yaw).
    const facing = (animals, viewer, time) => {
      let walked = 0;
      for (let t = 0; t < time; t += 1 / 30) {
        const before = animals.map(animal => ({x: animal.x, z: animal.z}));
        view.update(viewer, seconds += 1 / 30, null);
        animals.forEach((animal, index) => {
          const dx = animal.x - before[index].x, dz = animal.z - before[index].z, length = Math.hypot(dx, dz);
          if (length < 1e-3) return;
          walked++;
          const nose = {x: Math.cos(animal.root.rotation.y), z: -Math.sin(animal.root.rotation.y)};
          assert.ok((nose.x * dx + nose.z * dz) / length > .99, `${animal.plan.who} faces the way it walks`);
        });
      }
      return walked;
    };
    assert.ok(facing(camp.animals, {x: camp.outpost.x + 30, z: camp.outpost.z}, 20) > 0, 'the goats graze about');
    for (const goat of camp.animals) assert.ok(Math.abs(goat.root.position.y - drawnAt(goat.root.position.x, goat.root.position.z)) < 1e-9, 'a goat stands on the drawn ground');
    assert.ok(facing(halt.animals, {x: halt.outpost.x + 20, z: halt.outpost.z}, 12) > 0, 'Tuesday trots up and down');
    const tuesday = halt.animals[0];
    assert.ok(Math.abs(tuesday.root.position.y - (halt.site.position.y + .2)) < 1e-9, 'Tuesday stands on the platform');
  } finally {
    view.dispose();
    if (hadSelf) Object.defineProperty(globalThis, 'self', hadSelf); else delete globalThis.self;
  }
});
