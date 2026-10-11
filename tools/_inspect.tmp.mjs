import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const home='public/assets/models/circuits/kits/';
const loader=new GLTFLoader();
loader.register(()=>({name:'P4_HEADLESS_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
for(const id of process.argv.slice(2)){
  const b=readFileSync(home+id+'.glb');
  const g=await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
  g.scene.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(g.scene);
  console.log(id,'min',box.min.toArray().map(v=>+v.toFixed(2)),'max',box.max.toArray().map(v=>+v.toFixed(2)));
  g.scene.traverse(n=>{ if(n.isMesh&&/awning|door|entry|sign|letters|lamp-1|banner/.test(n.name)){const bb=new THREE.Box3().setFromObject(n);console.log('   ',n.name,'z',bb.min.z.toFixed(2),bb.max.z.toFixed(2),'x',bb.min.x.toFixed(2),bb.max.x.toFixed(2))}});
}
