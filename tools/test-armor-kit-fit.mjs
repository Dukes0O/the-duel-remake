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

test('Scarab stacks clear the rear tyres and stand on the actual chassis', async () => {
  const model=models.find(row=>row.key==='scarab'),kit=await loadGeometryOnly('scarab');
  kit.updateMatrixWorld(true);
  const tyres=model.vehicle.userData.wheels.map(wheel=>new THREE.Box3().setFromObject(wheel).expandByScalar(.012));
  const point=new THREE.Vector3(),ray=new THREE.Raycaster(),body=[];
  model.vehicle.traverse(mesh=>{if(mesh.isMesh&&mesh.material.name==='ground-in sand and road dust on lower chassis')body.push(mesh);});
  for (const id of ['kit-stack-0','kit-stack-1']) {
    const stack=kit.getObjectByName(id);assert.ok(stack);
    stack.traverse(mesh=>{if(!mesh.isMesh)return;
      const vertices=mesh.geometry.attributes.position;
      for(let i=0;i<vertices.count;i++) {
        point.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);
        assert.ok(tyres.every(box=>!box.containsPoint(point)),`${id}: no stack vertex enters a tyre`);
      }
    });
    const bounds=new THREE.Box3().setFromObject(stack),centre=bounds.getCenter(new THREE.Vector3());
    ray.set(new THREE.Vector3(centre.x,5,centre.z),new THREE.Vector3(0,-1,0));
    const contact=ray.intersectObjects(body,false)[0];assert.ok(contact,'actual lower chassis below each stack');
    const gap=bounds.min.y-contact.point.y;
    assert.ok(gap<=.005&&gap>=-.04,`${id}: stack base seats on chassis, gap ${gap}`);
  }
});

test('Longhaul cage feet sit in the cab roof instead of floating above the bed', async () => {
  const model=models.find(row=>row.key==='longhaul'),kit=await loadGeometryOnly('longhaul');
  kit.updateMatrixWorld(true);
  const cage=kit.getObjectByName('kit-cage');assert.ok(cage);
  const floor=new THREE.Box3().setFromObject(cage).min.y,body=[];
  model.vehicle.traverse(mesh=>{if(mesh.isMesh&&/faded ochre enamel/.test(mesh.material.name))body.push(mesh);});
  const point=new THREE.Vector3(),ray=new THREE.Raycaster();let feet=0;
  cage.traverse(mesh=>{if(!mesh.isMesh)return;
    const vertices=mesh.geometry.attributes.position;
    for(let i=0;i<vertices.count;i++) {
      point.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);
      if(point.y>floor+.04)continue;
      ray.set(new THREE.Vector3(point.x,8,point.z),new THREE.Vector3(0,-1,0));
      const contact=ray.intersectObjects(body,false)[0];assert.ok(contact,'painted cab roof under each cage foot');
      const gap=point.y-contact.point.y;
      assert.ok(gap<=.005&&gap>=-.12,`cage foot seats inside the roof, gap ${gap}`);feet++;
    }
  });
  assert.ok(feet>=16,'all four feet contribute actual geometry');
});
