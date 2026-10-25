import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {models} from './audit-vehicle-grounding.mjs';

async function loadGeometryOnly(car = 'falcone_f42') {
  const bytes=await readFile(new URL(`../public/assets/models/wasteland/kits/${car}.glb`,import.meta.url));
  const length=bytes.readUInt32LE(12), json=JSON.parse(bytes.toString('utf8',20,20+length));
  const strip=value=>{if(!value||typeof value!=='object')return;
    for(const key of Object.keys(value))if(/Texture$/.test(key))delete value[key];else strip(value[key]);};
  strip(json.materials);delete json.images;delete json.textures;delete json.samplers;
  const encoded=Buffer.from(JSON.stringify(json)), padded=Math.ceil(encoded.length/4)*4;
  const binary=bytes.subarray(20+length), result=Buffer.alloc(20+padded+binary.length,0x20);
  result.writeUInt32LE(0x46546c67,0);result.writeUInt32LE(2,4);result.writeUInt32LE(result.length,8);
  result.writeUInt32LE(padded,12);result.writeUInt32LE(0x4e4f534a,16);
  encoded.copy(result,20);binary.copy(result,20+padded);
  return (await new GLTFLoader().parseAsync(result.buffer.slice(result.byteOffset,result.byteOffset+result.byteLength),'')).scene;
}

test('Falcone rear armor lies outside the actual painted body rather than inside it', async () => {
  const vehicle=models.find(row=>row.key==='falcone_f42').vehicle;
  const paint=[];
  vehicle.traverse(node=>{if(node.isMesh && /^Lacquered body/.test(node.material?.name||''))paint.push(node);});
  assert.ok(paint.length,'actual production paint fixture');
  const kit=await loadGeometryOnly();vehicle.add(kit);
  const shell=kit.getObjectByName('kit-full-plating');assert.ok(shell);
  vehicle.traverse(node=>{if(node.isMesh)for(const material of [].concat(node.material||[]))material.side=THREE.DoubleSide;});
  vehicle.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(), observations=[];
  try {
    for(const x of [-.6,0,.6]) {
      ray.set(new THREE.Vector3(x,.55,-10),new THREE.Vector3(0,0,1));
      const body=ray.intersectObjects(paint,false)[0], armor=ray.intersectObject(shell,true)[0];
      assert.ok(body && armor,`rear painted coverage at x=${x}`);
      const clearance=body.point.z-armor.point.z;
      observations.push({x,clearance});
      assert.ok(clearance>=.002 && clearance<=.065,
        `rear x=${x}: armor clearance ${(clearance*1000).toFixed(1)}mm; needs visible exterior fit`);
    }
  } finally {kit.removeFromParent();}
});


test('Speirling tiers leave wheels, canopy and fan outlets clear', async () => {
  const model=models.find(row=>row.key==='mcmurtry_speirling');
  const kit=await loadGeometryOnly(model.key);
  kit.updateMatrixWorld(true);
  const point=new THREE.Vector3(), closest=new THREE.Vector3();
  const glass=[];
  model.vehicle.traverse(mesh=>{
    if(!mesh.isMesh || mesh.material.name!=='Glass')return;
    const p=mesh.geometry.attributes.position, index=mesh.geometry.index;
    for(let i=0;i<(index?.count??p.count);i+=3) {
      const vertices=[0,1,2].map(j=>new THREE.Vector3()
        .fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));
      glass.push(new THREE.Triangle(...vertices));
    }
  });
  assert.ok(glass.length,'real production canopy');
  for(const tier of ['kit-scrapper','kit-raider','kit-warlord']) {
    let count=0;
    kit.getObjectByName(tier).traverse(mesh=>{
      if(!mesh.isMesh)return;
      const positions=mesh.geometry.attributes.position;
      for(let i=0;i<positions.count;i++) {
        point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);
        count++;
        for(const triangle of glass) {
          triangle.closestPointToPoint(point,closest);
          assert.ok(point.distanceToSquared(closest)>.012**2,`${tier}/${mesh.name}: canopy clearance`);
        }
        for(const side of [-1,1]) {
          // The mouths and the space behind the spinning fan discs stay open.
          const inOutlet=Math.hypot(point.x-side*.37,point.y-.315)<.16 && point.z< -1.30;
          assert.ok(!inOutlet,`${tier}/${mesh.name}: fan outlet at ${point.toArray()}`);
        }
        if(tier==='kit-warlord')continue; // Shell retains the body's own wheel arches.
        for(const wheel of model.wheels) {
          const inDisc=Math.hypot(point.y-wheel.center.y,point.z-wheel.center.z)<wheel.radius+.012;
          const atTyre=Math.abs(point.x-wheel.center.x)<.17;
          assert.ok(!(inDisc&&atTyre),`${tier}/${mesh.name}: wheel clearance`);
        }
      }
    });
    assert.ok(count>100,`${tier}: checked actual fitted geometry`);
  }
});
