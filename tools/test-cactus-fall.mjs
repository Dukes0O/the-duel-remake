import assert from 'node:assert/strict';
import * as THREE from 'three';
import {COURSE} from '../src/config.js';
import {Course} from '../src/course.js';
import {addDesertCacti,CACTUS_FALL_SECONDS} from '../src/desert-detail.js';
import {buildEnvironment,terrainGeometry,disposeTree} from '../src/world.js';

let checks=0,fallen=0,worstGap=0,minContact=Infinity,maxFitMs=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const equal=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const matrix=new THREE.Matrix4(),point=new THREE.Vector3(),ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const desertView=course=>{const view=Object.create(course);view.def={...course.def,theme:'desert'};view.features={...course.features,trees:course.features.trees.filter(tree=>tree.theme==='desert')};return view;};
const snapshot=group=>group.children.map(mesh=>Array.from(mesh.instanceMatrix.array));
const identity=group=>group.children.map(mesh=>[mesh.uuid,mesh.geometry.uuid,mesh.material.uuid,mesh.count]);
function bounds(group){
  for(const mesh of group.children)for(let i=0;i<mesh.count;i++){
    mesh.getMatrixAt(i,matrix);
    check(matrix.elements.every(Number.isFinite),'Every retained instance transform is finite');
    check(mesh.boundingBox.containsBox(mesh.geometry.boundingBox.clone().applyMatrix4(matrix)),'Touched cell box encloses the full fallen cactus');
    const sphere=mesh.geometry.boundingSphere.clone().applyMatrix4(matrix);
    check(mesh.boundingSphere.center.distanceTo(sphere.center)+sphere.radius<=mesh.boundingSphere.radius+1e-5,'Touched cell sphere encloses falling arms');
  }
}
function patch(terrain,tree){
  const positions=terrain.attributes.position,index=terrain.index,vertices=[];
  for(let i=0;i<index.count;i+=3){
    const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)],xs=ids.map(id=>positions.getX(id)),zs=ids.map(id=>positions.getZ(id));
    if(Math.max(...xs)<tree.x-7||Math.min(...xs)>tree.x+7||Math.max(...zs)<tree.z-7||Math.min(...zs)>tree.z+7)continue;
    for(const id of ids)vertices.push(positions.getX(id),positions.getY(id),positions.getZ(id));
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  const mesh=new THREE.Mesh(geometry,material);mesh.updateMatrixWorld(true);return mesh;
}
function ground(mesh,x,z){ray.set(point.set(x,1000,z),down);const hit=ray.intersectObject(mesh,false)[0];assert.ok(hit,'Cactus support stays on rendered terrain');return hit.point.y;}

for(const [id,seed]of[['pacific-canyon',17],['ridge-rally',1989]]){
  const course=new Course(COURSE.find(def=>def.id===id),seed),view=desertView(course),group=new THREE.Group(),update=addDesertCacti(group,view);
  const original=snapshot(group),before=identity(group),source=JSON.stringify(course.features.trees),terrain=terrainGeometry(course,false);
  check(typeof update==='function','Cacti return a simulation updater without adding draw calls');
  const entries=group.children.flatMap(mesh=>mesh.userData.cactusFeatures.map(({tree,index},instance)=>({mesh,tree,index,instance})));
  const chosen=[0,1,2].map(variant=>entries.filter(entry=>entry.index%3===variant).sort((a,b)=>b.tree.scale-a.tree.scale)[0]);
  for(const item of chosen)for(const angle of[.2,1.8,3.5,5.1]){
    update({status:'countdown',stageTimeSec:0,fallenCacti:[]});
    const event={id:item.tree.id,atTime:5,directionX:Math.cos(angle),directionZ:Math.sin(angle)},state={status:'racing',stageTimeSec:5,fallenCacti:[event]};
    const support=patch(terrain,item.tree),p=item.mesh.geometry.attributes.position;
    const eventSnapshot=JSON.stringify(state),started=performance.now();update(state,.1);maxFitMs=Math.max(maxFitMs,performance.now()-started);
    equal(snapshot(group),original,'First contact starts at the exact existing root transform');
    const versions=group.children.map(mesh=>mesh.instanceMatrix.version);
    update(state,100);equal(group.children.map(mesh=>mesh.instanceMatrix.version),versions,'Same simulation timestamp does not upload unchanged instances');
    equal(JSON.stringify(state),eventSnapshot,'Visual update does not write to gameplay contact records');
    state.stageTimeSec=5+CACTUS_FALL_SECONDS*.45;update(state,.01);const partial=snapshot(group);
    check(JSON.stringify(partial)!==JSON.stringify(original),'Cactus tilts during the fall');bounds(group);
    item.mesh.getMatrixAt(item.instance,matrix);
    for(let i=0;i<p.count;i+=11)if(p.getY(i)>1){
      const vertex=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(matrix);
      check(vertex.y-ground(support,vertex.x,vertex.z)>-.025,'Visible upper stem and arms do not sweep through terrain while tipping');
    }
    state.paused=true;update(state,500);equal(snapshot(group),partial,'Frozen stage clock pauses the fall despite elapsed render time');state.paused=false;
    state.stageTimeSec=5+CACTUS_FALL_SECONDS;update(state,.2);const final=snapshot(group);bounds(group);
    state.stageTimeSec+=100;state.completedLaps=1;update(state,.1);equal(snapshot(group),final,'Fallen cactus remains down through later laps');
    item.mesh.getMatrixAt(item.instance,matrix);
    const axis=new THREE.Vector3(0,1,0).transformDirection(matrix),horizontal=Math.hypot(axis.x,axis.z);
    check((axis.x*event.directionX+axis.z*event.directionZ)/horizontal>.999,'Trunk falls in the world-space contact direction');
    let contact=Infinity;
    for(let i=0;i<p.count;i++){
      const vertex=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(matrix),gap=vertex.y-ground(support,vertex.x,vertex.z);
      contact=Math.min(contact,gap);worstGap=Math.min(worstGap,gap);
      check(gap>-.022,`${id}/${item.tree.id}: fallen geometry must not sink through terrain (${gap})`);
    }
    minContact=Math.min(minContact,contact);check(contact<.022,'Fallen cactus has actual terrain contact instead of floating');
    const root=point.setFromMatrixPosition(matrix);check(Math.hypot(root.x-item.tree.x,root.z-item.tree.z)<.8,'Fall pivots at the root, not the mesh centre');
    const independent=new THREE.Group(),again=addDesertCacti(independent,view);again(state,0);equal(snapshot(independent),final,'Final pose is independent of render step size and prior frames');
    disposeTree(independent);support.geometry.dispose();fallen++;
    update({...state,status:'menu'},0);equal(snapshot(group),original,'Menu restores upright instances even with stale fallen state');
    update(state,0);update({stageTimeSec:0,fallenCacti:[]},0);equal(snapshot(group),original,'Restart clears fallen poses in the same cached world');
  }
  update({status:'racing',stageTimeSec:10,fallenCacti:[{id:'not-a-cactus',atTime:0,directionX:1,directionZ:0},{id:chosen[0].tree.id,atTime:0,directionX:NaN,directionZ:1}]});
  equal(snapshot(group),original,'Unknown or malformed events cannot corrupt cactus matrices');
  equal(identity(group),before,'Animation and reset retain meshes, shared geometry, material, and instance counts');
  equal(JSON.stringify(course.features.trees),source,'Original tree definitions remain unchanged');
  bounds(group);terrain.dispose();disposeTree(group);
}

// The production world fans out to both cactus and salvage-car readers. A
// hybrid fixture catches accidental callback replacement without adding such
// a mixed environment to the real event list.
const oldLoad=THREE.TextureLoader.prototype.load,oldDocument=globalThis.document;
THREE.TextureLoader.prototype.load=()=>new THREE.Texture();
const context=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key]??(()=>{})});
globalThis.document={createElement:()=>({getContext:()=>context})};
try{
  const natural=new Course(COURSE[0],1989),arena=new Course(COURSE.find(def=>def.arena),1989),hybrid=Object.create(natural);
  hybrid.features={...natural.features,crushables:arena.features.crushables};
  const world=buildEnvironment(hybrid),cacti=world.children.filter(mesh=>mesh.userData.cactusFeatures),cactus=cacti[0],tree=cactus.userData.cactusFeatures[0].tree;
  const upright=Array.from(cactus.instanceMatrix.array),props=world.getObjectByName('Arena salvage cars');
  check(cacti.reduce((total,mesh)=>total+mesh.count,0)===natural.features.trees.filter(feature=>feature.theme==='desert').length,'Only desert theme trees participate in cactus animation');
  world.userData.updateSimulation({status:'racing',stageTimeSec:2,fallenCacti:[{id:tree.id,atTime:0,directionX:1,directionZ:0}],crushedProps:arena.features.crushables.map(prop=>prop.id)},0);
  check(JSON.stringify(Array.from(cactus.instanceMatrix.array))!==JSON.stringify(upright),'Production world advances cactus simulation');
  check(props.children.every(car=>car.children[2].scale.y<.4),'Production world retains arena crushable simulation');
  world.userData.updateSimulation({crushedProps:[]},0);
  equal(Array.from(cactus.instanceMatrix.array),upright,'Actual renderer menu payload restores cacti without a world rebuild');
  check(props.children.every(car=>car.children[2].scale.y===1),'Same menu payload also restores salvage cars');
  disposeTree(world);
}finally{THREE.TextureLoader.prototype.load=oldLoad;if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
material.dispose();
console.log(`Cactus fall visuals: ${checks} checks, ${fallen} terrain-fitted falls; lowest vertex ${worstGap.toFixed(4)}m, contact ${minContact.toFixed(4)}m, maximum first-hit fit ${maxFitMs.toFixed(1)}ms. Pause, reset, cached world, bounds and crushable aggregation preserved.`);
