import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createVehicle,prepareVehicleDamage,updateNpcVehicleDamage,updateVehicleDamage} from '../src/vehicles.js';
import {createClassicVehicle} from '../src/classic-vehicles.js';
import {createUnlockedVehicle} from '../src/unlock-vehicles.js';
import {disposeTree} from '../src/world.js';

let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const equal=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const clean={front:0,rear:0,left:0,right:0};
const inventory=vehicle=>vehicle.userData.damageMeshes.map(({mesh})=>[mesh.geometry,mesh.material,mesh.geometry.attributes.position,mesh.geometry.attributes.normal,mesh.geometry.attributes.panelWear]);
const versions=vehicle=>inventory(vehicle).map(([,material,position,normal,wear])=>[material.version,position.version,normal.version,wear.version]);
const exactClean=vehicle=>{
  for(const {mesh,rest,normals}of vehicle.userData.damageMeshes){
    equal(mesh.geometry.attributes.position.array,rest,'reset restores exact intact panel vertices');
    equal(mesh.geometry.attributes.normal.array,normals,'reset restores exact intact panel normals');
    check(mesh.geometry.attributes.panelWear.array.every(value=>value===0),'reset clears scratches and broken-lens shader wear');
  }
  check(vehicle.userData.fractures.every(({mesh})=>!mesh.visible),'reset hides all glass fractures');
  equal(vehicle.userData.paint.color.toArray(),vehicle.userData.originalColor.toArray(),'reset restores the private NPC paint');
};
const traffic=createVehicle(),otherTraffic=createVehicle(),police=createVehicle({color:0x172a36,accent:0xeeeecc});
for(const vehicle of[traffic,otherTraffic,police]){
  check(vehicle.userData.damagePrepared&&vehicle.userData.damageMeshes.length>0,'sedan body damage is prepared once at construction');
  check(vehicle.userData.fractures.length===4&&vehicle.userData.fractures.every(({rest})=>rest.length>0),'sedan glazing supports all four localized fracture zones');
  const before=inventory(vehicle),fractures=vehicle.userData.fractures;
  prepareVehicleDamage(vehicle);equal(inventory(vehicle),before,'re-preparing a vehicle never clones or replaces its damage resources');
  equal(vehicle.userData.fractures,fractures,'re-preparing retains the same fracture pool');
  updateNpcVehicleDamage(vehicle,null);
}
for(const other of[otherTraffic,police]){
  const geometries=new Set(other.userData.damageMeshes.map(item=>item.mesh.geometry)),materials=new Set(other.userData.damageMeshes.map(item=>item.mesh.material));
  check(traffic.userData.damageMeshes.every(({mesh})=>!geometries.has(mesh.geometry)&&!materials.has(mesh.material)),'traffic and police own separate mutable panels and wear materials');
}
const trafficResources=inventory(traffic),cleanVersions=versions(traffic);
for(let frame=0;frame<300;frame++)check(!updateNpcVehicleDamage(traffic,{damageZones:clean}),'unchanged clean actor skips all damage work');
equal(versions(traffic),cleanVersions,'clean traffic does not rewrite geometry or recompile materials each frame');
for(const zone of['front','rear','left','right']){
  const actor={damageZones:{...clean,[zone]:2}};
  check(updateNpcVehicleDamage(traffic,actor),'a newly hit NPC updates its body');
  let moved=0,maxDent=0,oppositeMoved=0,wear=0;
  for(const {mesh,rest}of traffic.userData.damageMeshes){
    const now=mesh.geometry.attributes.position.array;
    for(let i=0;i<now.length;i+=3){
      const [x,y,z]=rest.subarray(i,i+3),delta=Math.hypot(now[i]-x,now[i+1]-y,now[i+2]-z);
      const opposite=zone==='front'?z<-.7:zone==='rear'?z>.7:zone==='left'?x<-.4:x>.4;
      if(delta>1e-6){moved++;if(opposite)oppositeMoved++;}
      const inward=zone==='front'?z-now[i+2]:zone==='rear'?now[i+2]-z:zone==='left'?x-now[i]:now[i]-x;
      maxDent=Math.max(maxDent,inward);
    }
    wear=Math.max(wear,...mesh.geometry.attributes.panelWear.array);
    check(now.every(Number.isFinite)&&mesh.geometry.attributes.normal.array.every(Number.isFinite),'NPC deformation and normals remain finite');
  }
  check(moved>20&&maxDent>.1,`${zone} hit visibly dents the correct panel inward`);
  equal(oppositeMoved,0,`${zone} damage leaves the opposite body end/side intact`);
  check(wear>.2,'damaged NPC panels acquire visible localized scratches');
  equal(traffic.userData.fractures.filter(({mesh})=>mesh.visible).map(item=>item.zone),[zone],'only the struck glazing zone fractures');
  const damagedVersions=versions(traffic);
  for(let frame=0;frame<120;frame++)check(!updateNpcVehicleDamage(traffic,actor),'unchanged dented actor uses cached buffers');
  equal(versions(traffic),damagedVersions,'cached dents do not recompute normals or upload geometry per frame');
  equal(inventory(traffic),trafficResources,'damage and resets retain one set of geometry and materials');
  exactClean(otherTraffic);exactClean(police);
  check(updateNpcVehicleDamage(traffic,null),'menu or missing actor resets pooled damage');exactClean(traffic);
}
// The same render-pool slot can receive a new state object or a reset old one.
const actor={damageZones:{...clean,rear:3}};
updateNpcVehicleDamage(police,actor);actor.damageZones={...clean};updateNpcVehicleDamage(police,actor);exactClean(police);
updateNpcVehicleDamage(traffic,{damageZones:{...clean,left:2}});updateNpcVehicleDamage(traffic,{});exactClean(traffic);
const afterReset=versions(traffic);for(let frame=0;frame<100;frame++)updateNpcVehicleDamage(traffic,null);
equal(versions(traffic),afterReset,'repeated menu frames do not rebuild the cleared pooled body');
// Rival factories share player body designs, never their mutable instances.
for(const make of[()=>createClassicVehicle({key:'falcone_f42'}),()=>createUnlockedVehicle({key:'banshee_muscle'})]){
  const player=make(),rival=make(),ghost=make();
  updateVehicleDamage(player,1,false,0,{...clean,front:1});
  const playerShape=player.userData.damageMeshes.map(({mesh})=>mesh.geometry.attributes.position.array.slice());
  updateNpcVehicleDamage(rival,{damageZones:{...clean,right:2}});
  check(rival.userData.damageMeshes.some(({mesh,rest})=>mesh.geometry.attributes.position.array.some((value,i)=>Math.abs(value-rest[i])>.05)),'rival receives its own visible impact damage');
  for(let i=0;i<playerShape.length;i++)equal(player.userData.damageMeshes[i].mesh.geometry.attributes.position.array,playerShape[i],'rival hit preserves existing player dents');
  exactClean(ghost);updateNpcVehicleDamage(rival,null);exactClean(rival);
  const newRival=make();exactClean(newRival);
  for(const car of[player,rival,ghost,newRival])disposeTree(car);
}
const shader={vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <emissivemap_fragment>'};
traffic.userData.brakeLights[0].material.onBeforeCompile(shader,{});
check(shader.fragmentShader.includes('totalEmissiveRadiance *=')&&shader.vertexShader.includes('attribute float panelWear'),'NPC lamps and paint compile localized wear without changing intact body design');
const renderer=readFileSync(new URL('../src/render3d.js',import.meta.url),'utf8');
for(const call of['updateNpcVehicleDamage(rival,menu?null:st.rival,combatVehicleWear(st.rival,combatWearEnabled))','updateNpcVehicleDamage(car,!menu&&d?.alive?d:null)','updateNpcVehicleDamage(police,!menu&&pursuit?.active?pursuit:null)'])check(renderer.includes(call),'renderer updates and clears each NPC role from its own actor state');
for(const car of[traffic,otherTraffic,police])disposeTree(car);
console.log(`NPC vehicle damage: ${checks} localized dents, fractures, private materials, exact pooled resets, player isolation and cached-frame checks passed.`);
