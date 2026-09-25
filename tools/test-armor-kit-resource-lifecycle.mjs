import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createVehicleAttachmentRegistry} from '../src/vehicle-attachments.js';
import {createArmorKitMeshes} from '../src/armor-kit-meshes.js';

const tick = () => new Promise(resolve => setImmediate(resolve));
test('cached authored resources release once, including textures and late loads', async () => {
  for (const late of [false,true]) {
    const geometry=new THREE.BoxGeometry(1,1,1), texture=new THREE.Texture();
    const material=new THREE.MeshStandardMaterial({map:texture,normalMap:texture});
    const scene=new THREE.Group(); scene.name='authored-kit';
    const scrapper=new THREE.Group(); scrapper.name='kit-scrapper'; scene.add(scrapper);
    // Two primitives and four actor clones share these resource identities.
    scrapper.add(new THREE.Mesh(geometry,material),new THREE.Mesh(geometry,material));
    const released={geometry:0,material:0,texture:0};
    for(const [key,value] of Object.entries({geometry,material,texture}))
      value.addEventListener('dispose',()=>released[key]++);
    let resolve, requests=0;
    const pending=new Promise(r=>{resolve=r;});
    const registry=createVehicleAttachmentRegistry();
    const kits=createArmorKitMeshes(registry,{loadKitAsset:()=>{requests++;return pending;}});
    const cars=Array.from({length:4},()=>{
      const car=new THREE.Group(); car.userData.vehicleKey='falcone_f42';
      car.userData.size={width:2.6,length:4.8,height:1.55}; return car;
    });
    const actor={s:100,lateral:0,armor:100,maxArmor:100,combatArmorKit:'scrapper'};
    const state={...actor,mode:'wasteland',status:'racing',stageTimeSec:1,combat:{},
      opponents:Array.from({length:3},()=>({...actor}))};
    const duel={state,featureFlags:{enabled:()=>true},course:{groundAt:()=>({x:0,y:0,z:0})}};
    const meshes={player:cars[0],rival:cars[1],extraOpponents:cars.slice(2).map(mesh=>({mesh}))};
    kits.update(duel,meshes,true); await tick();
    assert.equal(requests,1,'same-car actors share one local asset request');
    if(late) kits.dispose();
    resolve({scene}); await tick(); await tick();
    if(!late){kits.update(duel,meshes,true);kits.dispose();}
    kits.dispose(); await tick(); await tick();
    assert.equal(registry.size,0);
    for(const car of cars) assert.equal(car.getObjectByName('authored-kit'),undefined);
    assert.deepEqual(released,{geometry:1,material:1,texture:1},
      `${late?'late':'loaded'} cached asset releases every owned identity once`);
  }
});
