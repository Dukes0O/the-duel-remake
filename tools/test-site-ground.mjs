import assert from 'node:assert/strict';
import * as THREE from 'three';
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
const start = (open, enabled) => {
  const duel = new Duel({seed: 42, featureFlags: {enabled: id => enabled && id === 'story-choices'}});
  duel.state.wastelandGateDiscovered = true;
  const job = {id: 'ground-check', steps: [{kind: 'roam'}], ...(open ? {open: {world}} : {})};
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
const duel = start(true,true);
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
for (const shift of [0, 55]) {
  near.follow(at.x + shift, at.z - shift);
  near.mesh.updateMatrixWorld(true);
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
duel.step(1/120);
assert.equal(ground.siteGround, site, 'a tick keeps the installed terrain');
finishArenaEvent(duel,'ground-check');
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
const overlap = start(true,true);
assert.deepEqual(scablandsGroundEdit.toSave(), savedWork);
const raisedFloor = scablandsActorHeightAt(at.x,at.z);
assert.ok(Math.abs(raisedFloor - natural(at.x,at.z) + ratsNestGround(0,0) - 2) < .001);
finishArenaEvent(overlap,'ground-check');
assert.deepEqual(scablandsGroundEdit.toSave(), savedWork);
assert.equal(scablandsActorHeightAt(at.x,at.z), natural(at.x,at.z) + 2);
near.dispose(); far.geometry.dispose(); view.dispose(); material.dispose();
console.log('Site ground passed: floor, ramp, rim, gully and hollow for car and walker; ' + rows.length +
  ' chunks below the edit at two window positions; flag off, ordinary job, finish and restart.');
