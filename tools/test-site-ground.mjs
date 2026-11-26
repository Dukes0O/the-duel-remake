import assert from 'node:assert/strict';
import * as THREE from 'three';
import {App} from '../src/app.js';
import {createGroundEdit, CHUNK_METRES} from '../src/world/ground-edit.js';
import {createScablandsDrawnFeet} from '../src/world/scablands-drawn-feet.js';
import {createOpenLookStand} from './open-look-stand.js';
import {Duel} from '../src/game.js';
import {finishArenaEvent} from '../src/arena/arena-event.js';
import {sampleWorld} from '../src/world/open/samples.js';
import {sitePosition} from '../src/world/open/site-rule.js';
import {ratsNestGround, RATS_NEST_LAYOUT} from '../src/world/open/looks/rats-nest-look.js';
import {scablandsGroundEdit, scablandsNaturalHeightAt, scablandsActorHeightAt} from '../src/world/scablands-ground.js';
import {makeCoarseGround} from '../src/world/scablands-scene.js';
import {createNearGround, createSiteUnderlay} from '../src/world/near-ground.js';
import {createGroundView} from '../src/world/ground-view.js';

const world = sampleWorld('first-night'), at = sitePosition('rats-nest', world.open.landSeed);
const spots = {floor: {x: .25, z: 1.75}, ramp: {x: -48.4, z: 29.25}, rim: RATS_NEST_LAYOUT.spots['rim-middle'],
  gully: {x: 51.5, z: 20.4}, hollow: RATS_NEST_LAYOUT.spots['car-hollow']};
const start = (open, enabled, duel = new Duel({seed: 42}), loan = null) => {
  duel.featureFlags = {enabled: id => enabled && id === 'story-choices'};
  duel.state.wastelandGateDiscovered = true;
  const job = {id: 'ground-check', steps: [{kind: 'roam', lentWeapon: loan}], ...(open ? {open: {world}} : {})};
  assert(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', job}));
  return duel;
};
const natural = scablandsNaturalHeightAt;
function checkPhysics(duel, cut) {
  for (const [name, spot] of Object.entries(spots)) {
    const x = at.x + spot.x, z = at.z + spot.z;
    const expected = (x,z) => natural(x,z) - (cut ? ratsNestGround(x-at.x,z-at.z) : 0);
    const walker = scablandsActorHeightAt(x, z, expected(x,z));
    assert.ok(Math.abs(walker - expected(x,z)) < (cut ? .2 : 1e-9), 'walker at ' + name);
    const pose = duel.course.nearest(x,z), car = duel.course.groundAt(pose.s,pose.lateral);
    assert.ok(Math.hypot(car.x-x,car.z-z) < .2, 'car sample at ' + name);
    assert.ok(Math.abs(car.y - expected(car.x,car.z)) < (cut ? .2 : 1e-9), 'car at ' + name);
  }
}
checkPhysics(start(false,true), false);
checkPhysics(start(true,false), false);
const memory = new Map();
globalThis.localStorage = {getItem: k => memory.get(k) ?? null, setItem: (k,v) => memory.set(k,String(v)), removeItem: k => memory.delete(k)};
const app = new App();
const duel = start(true,true,app.duel);
checkPhysics(duel, true);
const ground = scablandsGroundEdit, site = ground.siteGround;
assert(site.chunkCount > 0);
assert.equal(ground.toSave().chunks.length, 0, 'the authored terrain is transient');

const material = new THREE.MeshBasicMaterial();
const near = createNearGround({heightAt: natural, material, siteUnderlay: createSiteUnderlay(ground)});
const far = makeCoarseGround(material,ground);
const edited = new THREE.Group(), view = createGroundView({group: edited, groundEdit: ground, material});
assert.equal(view.update(), site.chunkCount);
const ray = new THREE.Raycaster(undefined, new THREE.Vector3(0,-1,0));
function meshHeight(mesh,x,z) {
  ray.ray.origin.set(x,1000,z);
  const hit = ray.intersectObject(mesh,true)[0];
  assert(hit, mesh.name + ' covers ' + [x,z,mesh.position.x,mesh.position.z]);
  return hit.point.y;
}
const rows = site.toSave().chunks;
assert.equal(rows.length, 18);
let worstSeam = 0;
function checkEdges() {
  for (const row of rows) for (const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const cx = (row.x + .5 + dx/2) * CHUNK_METRES, cz = (row.z + .5 + dz/2) * CHUNK_METRES;
    for (let i = .5; i < CHUNK_METRES; i++) {
      const x = cx + dz*(i-16), z = cz + dx*(i-16);
      const inside = meshHeight(edited, x-dx*.002, z-dz*.002);
      const ox = x + dx*.002, oz = z + dz*.002;
      const shared = site.hasChunkAt(ox,oz);
      const outside = meshHeight(shared ? edited : near.mesh, ox, oz);
      if (!site.hasChunkAt(x,z)) {
        const rim = meshHeight(edited,x-dx*.0001,z-dz*.0001);
        assert.ok(Math.abs(near.heightAtDrawn(x,z) - rim) < .001, 'exact rim uses the visible edge');
      }
      if (!shared) assert.ok(Math.abs(near.heightAtDrawn(ox,oz) - outside) < .001, 'feet follow the trimmed mesh');
      worstSeam = Math.max(worstSeam, Math.abs(inside - outside));
    }
  }
  assert.ok(worstSeam < .05, 'drawn square edges differ by ' + worstSeam + ' m');
}
for (const shift of [0, 55]) {
  near.follow(at.x + shift, at.z - shift);
  near.mesh.updateMatrixWorld(true);
  checkEdges();
  for (const row of rows) for (const offset of [.15, 15.45, 31.85]) {
    const x = 32*row.x + offset, z = 32*row.z + 32-offset;
    const surface = meshHeight(edited,x,z);
    assert.ok(meshHeight(near.mesh,x,z) < surface, 'near mesh crosses an edited chunk');
    assert.ok(meshHeight(far,x,z) < surface, 'coarse mesh crosses an edited chunk');
  }
}
for (const {x,z} of Object.values(spots)) {
  const drawn = meshHeight(edited,at.x+x,at.z+z);
  assert.ok(Math.abs(drawn - scablandsActorHeightAt(at.x+x,at.z+z)) < .2);
}
const feet = createScablandsDrawnFeet({near, gorge: {}, riverField: {distanceAt: () => 1000}, course: duel.course});
assert.ok(Math.abs(feet.groundAt(at.x, at.z) - meshHeight(edited,at.x,at.z)) < .0001, 'feet use the edit mesh lift');
const saved = ground.toSave(), revision = ground.revision;
const west = Math.min(...rows.map(row => row.x))*CHUNK_METRES;
for (const shape of [{x: at.x, z: at.z, radius: 1}, {x: west-1, z: at.z, radius: 2}]) {
  for (const order of [ground.cut(shape, -100), ground.fill(shape, 'clay', 5)]) {
    assert.equal(order.ok, false);
    assert.equal(order.volume, 0);
  }
}
assert.equal(ground.revision, revision);
assert.deepEqual(ground.toSave(), saved);
duel.step(1/120);
assert.equal(ground.siteGround, site, 'a tick keeps the installed terrain');
finishArenaEvent(duel,'ground-check');
assert.equal(duel.state.status, 'arena_result');
assert.equal(ground.siteGround, site);
assert.equal(view.update(), 0);
checkPhysics(duel,true);
app.returnToMenu();
assert.equal(duel.state.status, 'menu');
assert.equal(ground.siteGround, null);
checkPhysics(duel,false);
assert.equal(view.update(), rows.length);
assert.equal(edited.children.length,0);
checkPhysics(start(true,true),true);
checkPhysics(start(false,true),false);
// A work order in the same chunk survives both installing and removing site terrain.
const mound = {x: at.x, z: at.z, radius: .4};
scablandsGroundEdit.fill(mound, 'clay', 2.5);
const savedWork = scablandsGroundEdit.toSave();
const overlap = start(true,true,app.duel,'flamethrower');
assert.deepEqual(scablandsGroundEdit.toSave(), savedWork);
const raisedFloor = scablandsActorHeightAt(at.x,at.z);
assert.ok(Math.abs(raisedFloor - natural(at.x,at.z) + ratsNestGround(0,0) - 2) < .001);
assert.ok(Math.abs(feet.shift(at.x,at.z,raisedFloor)-.01) < 1e-6, 'the raised site floor includes the edit mesh lift');
assert.ok(Math.abs(feet.shiftFor(new THREE.Group(),0,at.x+12,at.z)-.01) < 1e-6, 'work elsewhere does not sink feet');
const worldJob = overlap.state.arena.worldJob;
assert.equal(worldJob.activeLoan, 'flamethrower');
assert.equal(app.leaveWorldJob(), true);
assert.equal(worldJob.activeLoan, null);
assert.equal(worldJob.settled, true);
assert.deepEqual(overlap.state.weaponLoadout, worldJob.originalWeaponLoadout);
assert.equal(scablandsActorHeightAt(at.x,at.z), raisedFloor);
start(false,true,overlap);
assert.deepEqual(scablandsGroundEdit.toSave(), savedWork);
assert.equal(scablandsActorHeightAt(at.x,at.z), natural(at.x,at.z) + 2);
// The look fixture supplies a camera spot along an exterior edge, with the yard's real geometry installed.
const scene = new THREE.Scene(), land = new THREE.Group();
land.name = 'The Scablands'; scene.add(land);
const camera = new THREE.PerspectiveCamera(), fixture = {duel: overlap};
const stand = createOpenLookStand(fixture, () => ({scene,camera}));
const stood = await stand.stand('rats-nest', {stage:'day', view:'ground-edge'}), edge = stood.spots['ground-edge'];
assert.deepEqual(camera.position.toArray(), [edge.x,edge.y+.35,edge.z]);
assert.deepEqual(fixture.inspectionCamera.target, [edge.looksAt.x,edge.looksAt.y,edge.looksAt.z]);
assert.ok(edge.looksAt && !scablandsGroundEdit.siteGround.hasChunkAt(edge.x, edge.z));
assert.ok(scablandsGroundEdit.siteGround.hasChunkAt(edge.looksAt.x + .01, edge.looksAt.z));
stand.clear();
assert.equal(scablandsGroundEdit.siteGround, null);

// Observe the keys during the physics query, including cross-chunk interpolation, misses and negative coordinates.
const flat = () => createGroundEdit({region:{editable:true}, naturalHeight: () => 0});
const work = flat(), transient = flat();
transient.cut({x:-1,z:2,radius:.5},-4);
work.fill({x:-1,z:2,radius:.5},'clay',2.5);
work.setSiteGround(transient);
const get = Map.prototype.get;
let lookups = 0, nonNumeric = 0;
try {
  Map.prototype.get = function(key) {
    lookups++;
    if (typeof key !== 'number') nonNumeric++;
    return get.call(this, key);
  };
  assert.equal(work.heightAt(-.5, 2), -1);
  assert.equal(work.heightAt(4090, 2140), 0);
} finally { Map.prototype.get = get; }
assert.ok(lookups > 0);
assert.equal(nonNumeric, 0);
near.dispose(); far.geometry.dispose(); view.dispose(); material.dispose();
console.log('Site ground passed: floor, ramp, rim, gully and hollow for car and walker; ' + rows.length +
  ' chunks at two window positions; maximum edge difference ' + worstSeam.toFixed(6) +
  ' m; results, menu, restart, work refusal, drawn feet and numeric lookup keys.');
