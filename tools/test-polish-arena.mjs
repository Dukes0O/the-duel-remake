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

// Native tanker LOD: only the far lenses grow; signal timing stays synchronized.
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
  assert.notEqual(distant.material,node.material);assert.equal(distant.geometry,node.geometry);
  assert.equal(distant.material.map,node.material.map);assert.equal(distant.material.toneMapped,false);
  const nearSize=new THREE.Box3().setFromObject(node).getSize(new THREE.Vector3());
  const farSize=new THREE.Box3().setFromObject(distant).getSize(new THREE.Vector3());
  for(const axis of ['x','y','z'])assert(Math.abs(farSize[axis]/nearSize[axis]-3)<1e-5);count++;
});
assert(count>0);
function checkLamps(on, color=0xff8c00) {
  native.scene.traverse(node=>{if(!node.name.startsWith('tanker-warning-lamp-'))return;
    const distant=far.getObjectByName(node.name);
    assert.equal(node.material.emissiveIntensity,on?1.2:0);
    assert.equal(distant.material.emissiveIntensity,on?4.5:0);
    assert.equal(node.material.emissive.getHex(),on?color:0);
    assert.equal(distant.material.emissive.getHex(),on?color:0);
  });
}
checkLamps(false);
model.setValveHealth([0,0,0]);checkLamps(true);
model.setLampSignal({kind:'tell',untilSec:2},0);checkLamps(true,0xffe8b5);
model.setLampSignal({kind:'tell',untilSec:2},.125);checkLamps(false);
model.setLampSignal({kind:'tell',untilSec:2},2);checkLamps(true);
model.setValveHealth([1,1,1]);checkLamps(false);
const plate=far.getObjectByName('tanker-boarding-plate');assert(plate);
assert.notEqual(plate.material,native.scene.getObjectByName(plate.name).material);
assert.equal(plate.material.emissiveIntensity,2.5);
assert.equal(plate.material.emissiveMap,plate.material.map);
const disposeCounts=new Map();
model.group.traverse(node=>{if(!node.isMesh)return;
  const resources=[node.geometry];
  for(const material of Array.isArray(node.material)?node.material:[node.material]) {
    resources.push(material);
    for(const value of Object.values(material))if(value?.isTexture)resources.push(value);
  }
  for(const resource of resources)if(!disposeCounts.has(resource)) {
    disposeCounts.set(resource,0);
    resource.addEventListener('dispose',()=>disposeCounts.set(resource,disposeCounts.get(resource)+1));
  }
});
model.dispose();model.dispose();assert.equal(model.group.children.length,0);
for(const count of disposeCounts.values())assert.equal(count,1,'shared and separate LOD resources retire once');
console.log('Native tanker distant lenses, roof contrast and disposal pass.');
