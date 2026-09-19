import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Original stripped salvage cars. The simulation decides when a shell is
// crushed; this layer only animates that persistent state.
export function addArenaCrushables(world,course){
  if(!course.features.crushables?.length)return null;
  const group=new THREE.Group();group.name='Arena salvage cars';
  const steel=new THREE.MeshStandardMaterial({color:0x4b4541,roughness:.94,metalness:.45});
  const rust=new THREE.MeshStandardMaterial({color:0x633a27,roughness:1,metalness:.15});
  const rubber=new THREE.MeshStandardMaterial({color:0x1c201e,roughness:1});
  const glass=new THREE.MeshStandardMaterial({color:0x24373c,roughness:.55,metalness:.25});
  const shells=[];
  for(const feature of course.features.crushables){
    const root=new THREE.Group(),body=new THREE.Group(),cabin=new THREE.Group(),wheels=[];
    root.name=`Crushable ${feature.id}`;root.position.set(feature.x,feature.y+.025,feature.z);root.rotation.y=feature.heading;
    const paint=new THREE.MeshStandardMaterial({color:feature.color,roughness:.89,metalness:.28});
    box(body,[1.9,.43,4.25],[0,.51,0],paint);
    box(body,[1.88,.08,1.4],[0,.78,1.26],paint,[.055,0,.013]);
    box(body,[1.8,.09,.83],[0,.77,-1.65],paint,[-.07,0,-.035]);
    box(body,[1.86,.14,.10],[0,.40,2.19],steel);box(body,[1.9,.14,.11],[0,.39,-2.18],steel);
    for(const side of[-1,1]){
      box(body,[.035,.24,3.0],[side*.953,.62,-.08],rust,[0,0,side*.04]);
      box(body,[.026,.20,.016],[side*.975,.62,-.15],steel);
      box(body,[.032,.036,.3],[side*.975,.73,-.52],steel);
      box(cabin,[.063,.48,.07],[side*.78,.97,.68],steel,[.30,0,0]);
      box(cabin,[.064,.46,.08],[side*.78,.97,-.91],steel,[-.25,0,0]);
      box(cabin,[.054,.45,.045],[side*.81,.96,-.12],steel);
      const wheel=new THREE.Group();
      for(const z of[-1.40,1.39]){
        const tire=new THREE.Mesh(new THREE.CylinderGeometry(.33,.33,.25,12),rubber);tire.rotation.z=Math.PI/2;tire.position.set(side*.90,.33,z);tire.castShadow=true;wheel.add(tire);
        const rim=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.265,10),steel);rim.rotation.z=Math.PI/2;rim.position.copy(tire.position);wheel.add(rim);
      }
      mergeParts(wheel);root.add(wheel);wheels.push({group:wheel,side});
    }
    box(cabin,[1.63,.065,1.53],[0,1.21,-.12],paint,[0,0,.018]);
    box(cabin,[1.44,.48,.026],[0,.98,.70],glass,[.30,0,0]);
    box(cabin,[1.43,.43,.024],[0,.99,-.92],glass,[-.25,0,0]);
    // Empty dark cabin and torn seats make the prop read as salvage.
    box(body,[1.52,.08,1.45],[0,.75,-.11],steel);
    for(const side of[-1,1])box(body,[.48,.24,.59],[side*.4,.85,-.20],rubber,[-.12,0,side*.10]);
    for(const [x,z,width]of[[-.55,1.4,.30],[.25,-1.4,.42],[.59,.7,.24]])box(body,[width,.007,.38],[x,.827,z],rust,[0,x*.6,0]);
    mergeParts(body);mergeParts(cabin);root.add(body,cabin);group.add(root);shells.push({id:feature.id,root,body,cabin,wheels,progress:0});
  }
  const crushed=new Set();
  group.userData.updateSimulation=(state,dt)=>{
    crushed.clear();for(const id of state.crushedProps||[])crushed.add(id);
    for(const car of shells){
      const target=crushed.has(car.id)?1:0;
      car.progress=dt>0?THREE.MathUtils.damp(car.progress,target,15,dt):target;
      const t=car.progress;
      car.body.scale.set(1+t*.05,1-t*.64,1+t*.035);car.body.position.y=-t*.07;
      car.cabin.scale.set(1+t*.13,1-t*.79,1+t*.075);car.cabin.position.y=-t*.08;car.cabin.rotation.z=Math.sin(t*Math.PI)*.08;
      for(const wheel of car.wheels){wheel.group.rotation.z=wheel.side*t*.16;wheel.group.position.y=-t*.10;wheel.group.position.x=wheel.side*t*.055;}
    }
  };
  group.userData.crushableCount=shells.length;
  world.add(group);return group;
}

function box(parent,size,position,material,rotation=[0,0,0]){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...position);mesh.rotation.set(...rotation);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}

function mergeParts(group){
  const batches=new Map();
  for(const mesh of group.children){mesh.updateMatrix();const geometry=mesh.geometry.clone().applyMatrix4(mesh.matrix);if(!batches.has(mesh.material))batches.set(mesh.material,[]);batches.get(mesh.material).push(geometry);mesh.geometry.dispose();}
  group.clear();for(const [material,parts]of batches){const geometry=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}
}
