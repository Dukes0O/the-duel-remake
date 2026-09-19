import * as THREE from 'three';

// Keep the original materials attached to the style's lifetime so the normal
// vehicle cleanup can dispose them safely after the translucent style is removed.
export function styleGhostVehicle(vehicle){
  const original=[],material=new THREE.MeshBasicMaterial({color:0x68e4e3,transparent:true,opacity:.20,depthWrite:false});
  vehicle.traverse(object=>{if(!object.isMesh)return;original.push({object,material:object.material,castShadow:object.castShadow,receiveShadow:object.receiveShadow,renderOrder:object.renderOrder});object.material=material;object.castShadow=object.receiveShadow=false;object.renderOrder=2;});
  let restored=false;
  return {
    opacity(value){if(!restored)material.opacity=Math.max(0,Math.min(.3,value));},
    restore(){if(restored)return;restored=true;for(const entry of original){const {object,...properties}=entry;Object.assign(object,properties);}material.dispose();original.length=0;},
  };
}
