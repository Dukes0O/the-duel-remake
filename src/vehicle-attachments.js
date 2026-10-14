import { ensureVehicleSockets } from './vehicle-sockets.js';
import {CARS} from './config.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {cloneChromeCrown} from './armor-kit-meshes.js';
import {createYetiRoof} from './yeti-view.js';
import { applyVehiclePaint } from './vehicle-paint.js';

// An owner is a stable name for one visual piece, independent of the car that
// currently carries it. Kits, decals and figures can use the same mounts as
// combat rigs without adding more vehicle-specific code to the renderer.
export function createVehicleAttachmentRegistry() {
  const bindings = new Map();
  const objectOwners = new WeakMap();

  function detach(owner) {
    const binding = bindings.get(owner);
    if (!binding) return false;
    bindings.delete(owner);
    objectOwners.delete(binding.object);
    if (binding.fallback) binding.fallback.add(binding.object);
    else binding.object.removeFromParent();
    return true;
  }

  function attach({ owner, vehicle, socket, object, fallback = null }) {
    if (typeof owner !== 'string' || !owner || !vehicle || !object?.isObject3D) {
      throw new Error('A vehicle attachment needs an owner, vehicle and scene object.');
    }
    const target = ensureVehicleSockets(vehicle)[socket];
    if (!target) throw new Error(`Unknown vehicle attachment socket: ${socket}`);
    const objectOwner = objectOwners.get(object);
    if (objectOwner && objectOwner !== owner) {
      throw new Error(`Vehicle attachment object already belongs to ${objectOwner}.`);
    }
    const current = bindings.get(owner);
    if (current?.vehicle === vehicle && current.socket === socket && current.object === object) return object;
    detach(owner);
    target.add(object);
    bindings.set(owner, { vehicle, socket, object, fallback });
    objectOwners.set(object, owner);
    return object;
  }

  function detachVehicle(vehicle) {
    let count = 0;
    for (const [owner, binding] of bindings) {
      if (binding.vehicle === vehicle) {
        detach(owner);
        count++;
      }
    }
    return count;
  }

  function clear() {
    for (const owner of bindings.keys()) detach(owner);
  }

  return {
    attach, detach, detachVehicle, clear,
    applyPaint: (vehicle, appearance) => applyVehiclePaint(vehicle, appearance),
    get size() { return bindings.size; },
  };
}

// One private road roof owner, using the same reviewed per-car kit source.
export function createRoadRoofOwner(attachments,{yetiAssets,loadAsset=path=>new GLTFLoader().loadAsync(path)}={}){
  let current=null,version=0,retired=false;const sources=new Map(),released=new WeakSet();
  function releaseSource(asset){
    if(!asset?.scene || released.has(asset.scene))return;released.add(asset.scene);
    const resources=new Set();asset.scene.traverse(node=>{
      if(node.geometry)resources.add(node.geometry);
      for(const material of [node.material].flat().filter(Boolean)){resources.add(material);for(const item of Object.values(material))if(item?.isTexture)resources.add(item);}
    });for(const resource of resources)resource.dispose();
  }
  function clear(){
    version++;attachments.detach('road-roof');current?.clone?.dispose();current=null;
    for(const record of sources.values()){record.retired=true;if(record.asset)releaseSource(record.asset);}sources.clear();
  }
  function sourceFor(car){
    if(!sources.has(car)){
      const record={retired:false,asset:null,promise:null};sources.set(car,record);
      record.promise=Promise.resolve().then(()=>loadAsset('/assets/models/wasteland/kits/'+car+'.glb')).then(asset=>{
        if(retired||record.retired){releaseSource(asset);return null;}record.asset=asset;return asset;
      });
    }return sources.get(car).promise;
  }
  return {get status(){return current?.status??'off';},get error(){return current?.error??'';},
    select(vehicle,look){
      if(retired)return 'off';
      if(current?.vehicle===vehicle&&current.look===look)return current.status;
      clear();if(!look)return 'off';
      const car=vehicle?.userData.vehicleKey;
      if(!Object.hasOwn(CARS,car)||!['yeti','chrome-crown'].includes(look))throw Error('Invalid earned road roof request.');
      ensureVehicleSockets(vehicle);const bind=version;
      current={vehicle,look,status:'loading',clone:null,error:''};
      const install=clone=>{
        if(retired||bind!==version||!clone){clone?.dispose();return;}
        current.clone=clone;attachments.attach({owner:'road-roof',vehicle,socket:'roof',object:clone.group});
        // Authored Crown is vehicle-local; seated Yeti is already roof-local.
        if(look==='chrome-crown')clone.group.position.copy(clone.group.parent.position).multiplyScalar(-1);
        current.status='ready';
      };
      if(look==='yeti')install(createYetiRoof(yetiAssets));
      else sourceFor(car).then(asset=>{
        if(retired||bind!==version||!asset)return;
        const clone=cloneChromeCrown(asset.scene,{privateMaterials:true});
        if(!clone)throw Error('Reviewed Chrome Crown is missing from this car kit.');install(clone);
      }).catch(error=>{if(!retired&&bind===version){current.status='error';current.error=String(error.message??error);}});
      return current.status;
    },
    detachVehicle(vehicle){if(current?.vehicle===vehicle)clear();},
    dispose(){if(retired)return;retired=true;clear();}
  };
}
