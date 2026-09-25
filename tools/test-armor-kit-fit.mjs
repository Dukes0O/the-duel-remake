import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {models} from './audit-vehicle-grounding.mjs';

async function loadGeometryOnly() {
  const bytes=await readFile(new URL('../public/assets/models/wasteland/kits/falcone_f42.glb',import.meta.url));
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
