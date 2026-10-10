import assert from 'node:assert/strict';
import {colliderInventory} from './collider-heights.mjs';
import {sweepObstacle} from '../src/collision.js';

const rows = colliderInventory();
const missing = rows.filter(row => !row.finite);
assert.equal(missing.length, 0, `Every collider needs measured finite bounds: ${missing.slice(0, 12).map(row => `${row.course}/${row.route}/${row.id}`).join(', ')}`);
for (const {obstacle, top, bottom} of rows) {
  const reach = Math.hypot(obstacle.halfX, obstacle.halfZ) + 10;
  const from = {x: obstacle.x - reach, z: obstacle.z, y: top + .3};
  const to = {...from, x: obstacle.x + reach};
  for (const body of [{halfWidth: 1, halfLength: 2.3, height: 1.5},
    {halfWidth: .34, halfLength: .34, height: 1.7},
    {halfWidth: .04, halfLength: .04, height: .08}]) {
    assert.equal(sweepObstacle(from, to, obstacle, 0, body), null, `${obstacle.id}: clear overflight`);
    assert.ok(sweepObstacle({...from, y: (bottom + top) / 2}, {...to, y: (bottom + top) / 2}, obstacle, 0, body), `${obstacle.id}: touching height hits`);
  }
}
console.log(`Collider heights: ${rows.length} finite bounds; car, fighter and projectile clear/touch checks pass.`);

const {SCENERY_MODEL_BOUNDS} = await import('../src/scenery-bounds.js');
const {measureModels, checkCarHeightCrossing, checkNativeUfo} = await import('./collider-heights.mjs');
const measured = await measureModels();
for (const [name, range] of Object.entries(measured)) {
  const expected=SCENERY_MODEL_BOUNDS[name].flat(), actual=range.flat();
  assert.equal(expected.length,actual.length);
  for(let index=0;index<expected.length;index++) assert.ok(Math.abs(expected[index]-actual[index])<1e-5,
    `${name} stored bounds match native renderer vertices: ${expected[index]} vs ${actual[index]}`);
}

// Legacy finite colliders still allow grounded cars below an elevated structure.
const elevated = {x: 0, z: 0, halfX: 2, halfZ: 2, y: 10, height: 2,
  modelMinY: 0, modelMaxY: 15};
const body = {halfWidth: 1, halfLength: 2, height: 1.5, useModelBounds: false};
assert.equal(sweepObstacle({x:-8,y:0,z:0}, {x:8,y:0,z:0}, elevated, 0, body), null);
assert.ok(sweepObstacle({x:-8,y:0,z:0}, {x:8,y:0,z:0}, elevated, 0, {...body,useModelBounds:true}));
for (const {obstacle} of rows) {
  const start = {x: obstacle.x - 20, y: obstacle.y, z: obstacle.z};
  const end = {...start, x: obstacle.x + 20};
  const {modelMinY, modelMaxY, ...legacy} = obstacle;
  const before = sweepObstacle(start, end, legacy, 0, body);
  const after = sweepObstacle(start, end, obstacle, 0, body);
  assert.deepEqual(before && {...before,obstacle:null}, after && {...after,obstacle:null},
    `${obstacle.id} keeps its grounded contact`);
}
const {Duel} = await import('../src/game.js');
const {COURSE} = await import('../src/config.js');
const cases = [];
for (const id of ['pacific-canyon','high-country','pit']) {
  const duel = new Duel({seed:1989});
  duel.state.wastelandGateDiscovered = true;
  if (id === 'pit') assert.ok(duel.startArenaEvent({venueId:'pit',car:'falcone_f42',seed:1989,
    opponents:[{car:'dusthawk_rally'}]}));
  else duel.startCampaign({startStage:COURSE.findIndex(def => def.id === id),
    car:'falcone_f42',seed:1989,mode:'wasteland',difficulty:'casual'});
  const obstacles = duel.course.features.obstacles;
  const targets = id === 'pit' ? [obstacles.find(o => o.id === 'pit-centre-pile'),
    obstacles.find(o => o.id === 'pit-wall-0')] :
    [obstacles.find(o => o.barrier), obstacles.find(o => o.kind === 'rock')];
  for (const obstacle of targets) for (const mode of ['clear','touch','grounded'])
    cases.push(checkCarHeightCrossing(duel, obstacle, mode));
  console.log(JSON.stringify(checkNativeUfo(duel)));
  const rail = targets[0];
  const elevated = {...rail, kind:'prop', barrier:false, id:'elevated-regression',
    minY:rail.y + 20, maxY:rail.y + 25, height:5, modelMinY:rail.y, modelMaxY:rail.y + 25};
  cases.push(checkCarHeightCrossing(duel, elevated, 'grounded', true));
  const {gearContact} = await import('../src/crew-gear/contacts.js');
  const reach = Math.hypot(rail.halfX,rail.halfZ) + 5;
  const from = {x:rail.x-reach,z:rail.z,y:rail.modelMaxY + .3}, to={...from,x:rail.x+reach};
  const query=duel._obstacles;duel._obstacles=()=>[rail];
  try {
    assert.equal(gearContact(duel,from,to,duel.state,{fighters:false}),null,'crew projectile clears actual scenery');
    assert.equal(gearContact(duel,{...from,y:rail.modelMaxY-.1},{...to,y:rail.modelMaxY-.1},
      duel.state,{fighters:false})?.scenery,true,'crew projectile strikes actual scenery');
  } finally {duel._obstacles=query;}
}
console.log(`Measured geometry, ${rows.length} unchanged grounded sweeps, and ${cases.length} native car crossings pass.`);
