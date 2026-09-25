import test from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../src/vehicles.js';
import {applyVehiclePaint} from '../src/vehicle-paint.js';
import {disposeTree} from '../src/world.js';

const clean={front:0,rear:0,left:0,right:0};
const finish=vehicle=>({color:vehicle.userData.paint.color.toArray(),
  roughness:vehicle.userData.paint.roughness,clearcoat:vehicle.userData.paint.clearcoat});
const positions=vehicle=>vehicle.userData.damageMeshes.map(({mesh})=>Array.from(mesh.geometry.attributes.position.array));
const versions=vehicle=>vehicle.userData.damageMeshes.map(({mesh})=>mesh.geometry.attributes.position.version);

test('combat wear is a pure, explicitly enabled reading of armor and wreck state', () => {
  assert.equal(typeof api.combatVehicleWear,'function');
  const healthy={armor:100,maxArmor:100}, low={armor:8,maxArmor:100}, wreck={...low,combatWrecking:true};
  const before=structuredClone({healthy,low,wreck});
  assert.equal(api.combatVehicleWear(wreck),0);
  assert.equal(api.combatVehicleWear(wreck,false),0);
  assert.equal(api.combatVehicleWear(healthy,true),0);
  const lowWear=api.combatVehicleWear(low,true);
  assert.ok(lowWear>0 && lowWear<1);
  assert.ok(api.combatVehicleWear({armor:20,maxArmor:100},true)<lowWear);
  assert.equal(api.combatVehicleWear(wreck,true),1);
  for(const actor of [null,{}, {armor:NaN,maxArmor:100},{armor:8,maxArmor:0}])
    assert.equal(api.combatVehicleWear(actor,true),0,'missing armor never invents wear');
  assert.deepEqual({healthy,low,wreck},before,'presentation cannot change simulation actors');
});

test('combat wear darkens private body paint, preserves collision geometry and resets pooled finishes', () => {
  const car=api.createVehicle({color:0xaa3300}), peer=api.createVehicle({color:0xaa3300});
  try {
    applyVehiclePaint(car,{id:'fixture',color:'#a34c28',roughness:.4,clearcoat:.6});
    api.updateVehicleDamage(car,0,false,0,clean,0);
    api.updateNpcVehicleDamage(peer,null);
    const baseline=finish(car), other=finish(peer), geometry=positions(car);
    api.updateVehicleDamage(car,0,false,0,clean,0,.7);
    const worn=finish(car);
    assert.ok(worn.color[0]<baseline.color[0]*.8,'low armor visibly scorches body paint');
    assert.ok(worn.roughness>baseline.roughness && worn.clearcoat<baseline.clearcoat,
      'burned finish loses its glossy clearcoat');
    assert.deepEqual(finish(peer),other,'a worn player cannot tint an opponent');
    assert.deepEqual(positions(car),geometry,'paint wear cannot invent collision dents');
    assert.ok(car.userData.wheelPivots.every(pivot=>pivot.visible),'armor wear does not detach road wheels');
    const cached=versions(car);
    api.updateVehicleDamage(car,0,false,0,clean,0,.65);
    assert.deepEqual(versions(car),cached,'repair changing only paint wear never rewrites body vertices');
    api.updateVehicleDamage(car,0,false,0,clean,0,.7);
    assert.deepEqual(versions(car),cached,'finish updates remain separate from collision shape updates');
    for(let i=0;i<120;i++)api.updateVehicleDamage(car,0,false,0,clean,0,.7);
    assert.deepEqual(versions(car),cached,'unchanged wear keeps vertex buffers cached');
    assert.deepEqual(finish(car),worn,'repeated frames never compound darkening');
    api.updateNpcVehicleDamage(peer,{damageZones:clean},1);
    assert.ok(finish(peer).color[0]<other.color[0]*.3,'wrecked opponent paint is burned');
    assert.deepEqual(finish(car),worn);
    api.updateNpcVehicleDamage(peer,null);
    assert.deepEqual(finish(peer),other,'reused opponent returns to its exact finish');
    api.updateVehicleDamage(car,0,false,0,clean,0,0);
    assert.deepEqual(finish(car),baseline,'repair/menu reset restores the selected preset');

    const hit={...clean,front:2};
    api.updateVehicleDamage(car,0,false,0,hit,0);
    const collisionFinish=finish(car), collisionShape=positions(car);
    api.updateVehicleDamage(car,0,false,0,hit,0,1);
    assert.deepEqual(positions(car),collisionShape,'scorch composes with existing dents');
    api.updateVehicleDamage(car,0,false,0,hit,0,0);
    assert.deepEqual(finish(car),collisionFinish,'removing scorch retains collision wear');
  } finally {disposeTree(car);disposeTree(peer);}
});

test('combat scorch cannot add clearcoat to a matte paint preset', () => {
  const car=api.createVehicle({color:0x773322});
  try {
    applyVehiclePaint(car,{id:'matte-fixture',color:'#773322',roughness:.99,clearcoat:0});
    api.updateVehicleDamage(car,0,false,0,clean,0,0);
    const baseline=finish(car);
    api.updateVehicleDamage(car,0,false,0,clean,0,1);
    assert.ok(finish(car).clearcoat<=baseline.clearcoat,'burning matte paint must not add a glossy layer');
    assert.ok(finish(car).roughness>=baseline.roughness,'scorch cannot polish an already rough finish');
    api.updateVehicleDamage(car,0,false,0,clean,0,0);
    assert.deepEqual(finish(car),baseline);
  } finally {disposeTree(car);}
});
