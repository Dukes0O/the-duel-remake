import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createVehicleAssets} from './vehicle-assets.js';
import {createVehicleAttachmentRegistry} from './vehicle-attachments.js';
import {createArmorKitMeshes} from './armor-kit-meshes.js';
import {createTankerModel} from './arena/tanker-model.js';
import {applyVehiclePaint} from './vehicle-paint.js';

function release(scene) {
  const resources=new Set();
  scene?.traverse(node=>{
    if(node.geometry)resources.add(node.geometry);
    if(node.skeleton)resources.add(node.skeleton);
    for(const material of [].concat(node.material||[])) {
      resources.add(material);
      for(const value of Object.values(material))if(value?.isTexture)resources.add(value);
    }
  });
  for(const resource of resources)if(resource?.dispose && !resource.userData?.sharedAsset)resource.dispose();
}

// One bounded renderer per visible card screen. Models and picture promises are
// cached there; no App, Duel, storage or simulation step is available to it.
export function createWarlordCardArt({quality='high'}={}) {
  const canvas=document.createElement('canvas');
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:quality==='high',preserveDrawingBuffer:true});
  renderer.setSize(640,360);renderer.setPixelRatio(1);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.15;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,640/360,.1,150);
  const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
  const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;
  room.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xd9e4ea,0x504331,2.3));
  const sun=new THREE.DirectionalLight(0xffefd8,3);sun.position.set(6,8,5);scene.add(sun);
  const loader=new GLTFLoader(),vehicles=createVehicleAssets(),cache=new Map(),records=[];
  let disposed=false,queue=Promise.resolve();

  async function build(view) {
    const root=new THREE.Group(),record={root,armor:null,tanker:null,crew:null};records.push(record);
    if(view.carId==='convoy-tanker') {
      record.tanker=createTankerModel({loadAsset:()=>loader.loadAsync('/assets/models/wasteland/convoy-tanker.glb')});
      await record.tanker.ready;if(disposed)return record;
      root.add(record.tanker.group);
    } else {
      if(!await vehicles.load(view.carId))throw Error('The real card car could not load');
      if(disposed)return record;
      const car=vehicles.create(view.carId,view.warlordId ? {color:0xbfcace,accent:0x142a36} : {});
      if(view.paint)applyVehiclePaint(car,view.paint);
      if(!car)throw Error('The real card car is unavailable');root.add(car);
      const kit=view.kit || (view.warlordId==='sal'?'warlord':view.warlordId?'scrapper':null);
      const crown=view.roofLook || (view.warlordId==='blackiron'?'chrome-crown':null);
      if(kit || crown || view.warlordId==='gunn') {
        const assets=new Map(),loadKitAsset=id=>{
          if(!assets.has(id))assets.set(id,loader.loadAsync(`/assets/models/wasteland/kits/${id}.glb`));
          return assets.get(id);
        };
        record.armor=createArmorKitMeshes(createVehicleAttachmentRegistry(),{loadKitAsset});
        root.add(record.armor.group);
        const actor={mode:'wasteland',status:'arena_result',combat:{},wastelandGateDiscovered:true,
          car:view.carId,opponents:[],traffic:[],s:0,lateral:0,stageTimeSec:0,armor:100,maxArmor:100,
          combatArmorKit:kit,combatRoofLook:crown,warlordId:view.warlordId,
          ...(view.warlordId==='gunn'?{gunnBarrage:{stage:'idle'}}:{})};
        const preview={state:actor,course:{def:{arena:true},at:()=>({heading:0,y:0}),worldAt:()=>({x:0,y:0,z:0}),groundAt:()=>({x:0,y:0,z:0}),surfaceAt:()=>({roadHalfWidth:10})}};
        record.armor.update(preview,{player:car},true);
        await loadKitAsset(view.carId);await Promise.resolve();
        if(disposed)return record;
        record.armor.update(preview,{player:car},true);
        if(view.warlordId==='gunn' || kit==='turret-look') {
          await loadKitAsset('gunn-turret');await Promise.resolve();if(disposed)return record;record.armor.update(preview,{player:car},true);
        }
        if(!car.getObjectByName('authored-kit'))throw Error('The fitted card kit could not load');
      }
    }
    if(disposed)return record;
    if(view.crewId) {
      const asset=await loader.loadAsync(`/assets/models/wasteland/crew/${view.crewId}.glb`);
      record.crew=asset.scene;
      if(disposed){release(asset.scene);return record;}
      asset.scene.traverse(node=>{
        for(let part=node;part;part=part.parent)if(/(^|[-_ ])far($|[-_ ])/i.test(part.userData?.lod||part.name))node.visible=false;
      });
      const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3());
      asset.scene.position.set(size.x/2+.9,0,0);root.add(asset.scene);
    }
    root.updateMatrixWorld(true);return record;
  }

  function render(view) {
    const key=JSON.stringify(view);
    if(cache.has(key))return cache.get(key);
    // Serialize snapshots on the one canvas while model requests may complete.
    const picture=queue.then(async()=>{
      if(disposed)return null;
      const record=await build(view);if(disposed)return null;
      scene.add(record.root);record.root.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(record.root),center=box.getCenter(new THREE.Vector3());
      const size=box.getSize(new THREE.Vector3()),distance=Math.max(size.z,size.x*1.4,size.y*2)*1.25;
      camera.position.copy(center).add(new THREE.Vector3(distance*.68,distance*.4,distance*.85));
      camera.lookAt(center);renderer.render(scene,camera);
      const data=canvas.toDataURL('image/png');record.root.removeFromParent();return data;
    });
    queue=picture.catch(()=>{});cache.set(key,picture);return picture;
  }
  return {render,canvas,get size(){return cache.size;},dispose(){
    if(disposed)return;disposed=true;
    for(const record of records){record.armor?.dispose();record.tanker?.dispose();release(record.root);record.root.clear();}
    records.length=0;cache.clear();environment.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();
  }};
}
