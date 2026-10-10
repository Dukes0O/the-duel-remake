import assert from 'node:assert/strict';
import {stackOpponentLabels} from '../src/combat-hud.js';

for (const [width, height] of [[1280,800],[640,360]]) {
  for (const x of [0,width / 2,width]) for (const y of [0,height / 2,height]) {
    const inputs = Array.from({length: 4}, (_, index) => ({x,y,width:120 + index*20,height:55}));
    const original = JSON.stringify(inputs);
    const boxes = stackOpponentLabels(inputs,width,height);
    assert.equal(JSON.stringify(inputs),original);
    for (let i=0;i<boxes.length;i++) {
      const a=boxes[i]; assert(a.fits);
      assert(a.left>=0 && a.top>=0 && a.left+a.width<=width && a.top+a.height<=height);
      for (const b of boxes.slice(0,i)) assert(a.left>=b.left+b.width+6 || b.left>=a.left+a.width+6 ||
        a.top>=b.top+b.height+6 || b.top>=a.top+a.height+6);
    }
    assert.deepEqual(stackOpponentLabels(inputs,width,height),boxes);
  }
}
console.log('Arena floating labels: 18 edge/center fixtures pass; names fit with 6 px gaps.');

// Native tanker LOD: only the far lenses grow; signal timing stays shared.
const THREE = await import('three');
const {GLTFLoader} = await import('three/addons/loaders/GLTFLoader.js');
const {readFileSync} = await import('node:fs');
const {createTankerModel} = await import('../src/arena/tanker-model.js');
const bytes=readFileSync(new URL('../public/assets/models/wasteland/convoy-tanker.glb',import.meta.url));
const loader=new GLTFLoader();
loader.register(()=>({name:'HEADLESS_POLISH_IMAGES',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
const native=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const model=createTankerModel({loadAsset:async()=>native});await model.ready;
const far=model.group.getObjectByName('convoy-tanker-distant');
let count=0;
native.scene.traverse(node=>{if(!node.name.startsWith('tanker-warning-lamp-'))return;
  const distant=far.getObjectByName(node.name);assert(distant);
  assert.equal(distant.material,node.material);assert.equal(distant.geometry,node.geometry);
  const nearSize=new THREE.Box3().setFromObject(node).getSize(new THREE.Vector3());
  const farSize=new THREE.Box3().setFromObject(distant).getSize(new THREE.Vector3());
  for(const axis of ['x','y','z'])assert(Math.abs(farSize[axis]/nearSize[axis]-1.6)<1e-5);count++;
});
assert(count>0);model.setValveHealth([0,0,0]);
const plate=far.getObjectByName('tanker-boarding-plate');assert(plate);
assert.notEqual(plate.material,native.scene.getObjectByName(plate.name).material);
assert(plate.material.emissiveIntensity>0);
model.dispose();model.dispose();assert.equal(model.group.children.length,0);
console.log('Native tanker distant lenses, roof contrast and disposal pass.');
