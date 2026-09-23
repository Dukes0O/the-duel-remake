import assert from 'node:assert/strict';
import * as THREE from 'three';
import { COURSE } from '../src/config.js';
import { Course } from '../src/course.js';
import { environmentKey } from '../src/environment-key.js';
import { createChickens } from '../src/chickens.js';
import { addArenaCrushables } from '../src/arena-props.js';
import { createDrivingEffects } from '../src/effects.js';
import { createExplosion } from '../src/explosion.js';
import { disposeTree } from '../src/world.js';

// Exercise the production state readers with retained Three objects. The real
// WebGL renderer's worldBuilds counter is checked separately in browser QA.
let checks=0;
const check=(condition,label)=>{assert.ok(condition,label);checks++;};
const matrix=new THREE.Matrix4();
function scaleAt(mesh,index){mesh.getMatrixAt(index,matrix);return new THREE.Vector3().setFromMatrixScale(matrix);}
function graphIdentity(group){const ids=[];group.traverse(o=>{ids.push(o.uuid);if(o.geometry)ids.push(o.geometry.uuid);});return ids.join('|');}

for(const def of COURSE){
  const original={seed:1989,def},clone={seed:1989,def:structuredClone(def)};
  check(environmentKey(original)===environmentKey(clone),`${def.id}: separate equivalent definitions retain the same world`);
  check(environmentKey(original)!==environmentKey({...clone,seed:42}),`${def.id}: another route seed rebuilds the world`);
  for(const [field,value]of Object.entries({layoutVersion:(def.layoutVersion||1)+1,laps:(def.laps||2)+1,lengthU:def.lengthU+8,timeOfDay:def.timeOfDay==='night'?'day':'night',newGeometryOption:true})){
    check(environmentKey(original)!==environmentKey({seed:1989,def:{...def,[field]:value}}),`${def.id}: the full definition key detects ${field}`);
  }
}
const naturalDef=COURSE.find(def=>!def.kind),arenaDef=COURSE.find(def=>def.kind==='arena');
const natural=new Course(naturalDef,1989),rerun=new Course(structuredClone(naturalDef),1989);
check(natural!==rerun&&environmentKey(natural)===environmentKey(rerun),'new simulation Course instances can retain a compatible rendered world');
for(const s of[0,natural.length*.23,natural.length*.76,natural.raceLength]){
  check(JSON.stringify(natural.groundAt(s,17))===JSON.stringify(rerun.groundAt(s,17)),'the retained original ground sampler agrees with the new equivalent Course');
}

{
  const flock=natural.features.flocks[0],chickens=createChickens(natural),body=chickens.group.getObjectByName('Chicken bodies');
  const identity=graphIdentity(chickens.group),originalFlocks=JSON.stringify(natural.features.flocks);
  const visibleFlock=()=>Array.from(chickens.group.userData.activeBirdIndices.slice(0,body.count)).filter(index=>chickens.group.userData.sourceFlockIds[index]===flock.id);
  check(flock.count>0&&chickens.group.userData.chickenCount>flock.count,'the chicken reset fixture contains multiple populated source flocks');
  const collected={status:'racing',s:flock.s,collectedFlocks:[flock.id]},snapshot=JSON.stringify(collected);
  chickens.update(collected,10);chickens.update(collected,14);
  check(visibleFlock().length===0,'a collected flock finishes its flyaway and leaves the visible instance pool');
  check(body.count>0&&scaleAt(body,0).length()>0,'other nearby flocks remain visible');
  chickens.update({status:'countdown',s:flock.s,collectedFlocks:[]},0);
  check(visibleFlock().length===flock.count,'restart restores the previously collected flock without rebuilding it');
  chickens.update(collected,20);chickens.update(collected,24);
  chickens.update({status:'menu',s:172,collectedFlocks:[]},1000);
  check(visibleFlock().length===flock.count,'menu restores collected birds even when its animation clock moves forward');
  for(let i=0;i<12;i++){
    chickens.update(collected,i*10);chickens.update(collected,i*10+4);
    chickens.update({status:'menu',s:172,collectedFlocks:[]},1000+i);
  }
  check(graphIdentity(chickens.group)===identity,'repeated collection/menu cycles retain every chicken mesh and geometry');
  check(JSON.stringify(collected)===snapshot&&JSON.stringify(natural.features.flocks)===originalFlocks,'chicken animation never writes to gameplay state or course flock definitions');
  check(body.instanceMatrix.array.every(Number.isFinite),'all retained chicken transforms stay finite');
  disposeTree(chickens.group);
}

{
  const arena=new Course(arenaDef,1989),world=new THREE.Group(),props=addArenaCrushables(world,arena);
  const identity=graphIdentity(props),allIds=arena.features.crushables.map(prop=>prop.id),snapshot=JSON.stringify(allIds);
  check(props.userData.crushableCount===6,'arena fixture contains six salvage cars');
  props.userData.updateSimulation({crushedProps:allIds},0);
  check(props.children.every(root=>root.children[2].scale.y<.4&&root.children[3].scale.y<.25),'shared crush IDs flatten each retained shell');
  for(let cycle=0;cycle<12;cycle++){
    props.userData.updateSimulation({crushedProps:[]},0);
    check(props.children.every(root=>root.children.every(part=>part.scale.equals(new THREE.Vector3(1,1,1))&&part.position.length()===0&&part.rotation.z===0)),'fresh menu/restart state immediately restores bodies, cabins and wheels');
    const active=[allIds[cycle%allIds.length]];
    for(let frame=0;frame<20;frame++)props.userData.updateSimulation({crushedProps:active},.05);
    check(props.children.filter(root=>root.children[2].scale.y<.4).length===1,'only the current run\'s crushed prop stays flattened');
  }
  check(graphIdentity(props)===identity&&world.children.length===1,'arena resets reuse the same props without accumulating shells');
  check(JSON.stringify(allIds)===snapshot,'crush animation does not consume or alter the simulation IDs');
  disposeTree(world);
}

function effectCourse(){return{def:{offroad:true},at:()=>({heading:0,curvature:0}),groundAt:(s,lateral)=>({x:lateral,y:0,z:s}),surfaceAt:()=>({road:true,mainRoad:false})};}
const effectState=extra=>({status:'racing',car:'titan_monster',s:100,lateral:0,speedMph:90,headingError:0,slipAngle:0,offRoad:true,roughness:1,input:{brake:1},...extra});
{
  const effects=createDrivingEffects(),oldCourse=effectCourse(),nextCourse=effectCourse(),p={x:0,y:0,z:100};
  const identity=graphIdentity(effects.group),points=effects.group.children.find(child=>child.isPoints);
  const [marks,chips]=effects.group.children.filter(child=>child.isInstancedMesh);
  const liveParticles=()=>points.geometry.attributes.particleAlpha.array.filter(alpha=>alpha>0).length;
  effects.update({p,course:oldCourse,state:effectState(),dt:.05});
  check(liveParticles()>0&&marks.geometry.attributes.markAlpha.array.some(alpha=>alpha>0),'old race produces visible tire marks and dust');
  const fresh=effectState({status:'countdown',speedMph:0,offRoad:false,input:{brake:0}});
  effects.update({p,course:nextCourse,state:fresh,dt:.016});
  check(liveParticles()===0&&marks.geometry.attributes.markAlpha.array.every(alpha=>alpha===0),'new Course identity clears old dust and skid marks at the same player position');
  check(Array.from({length:chips.count},(_,i)=>scaleAt(chips,i).length()).every(v=>v===0),'new-run handoff hides all old debris transforms');
  const burst={serial:1,id:'junk-0',s:102,off:1,x:1,y:0,z:102,strength:.8,byPlayer:true};
  effects.update({p,course:nextCourse,state:{...fresh,status:'racing',crushBurst:burst},dt:.016});
  const live=liveParticles();check(live>=55,'the new run\'s first crush serial still produces a fresh burst');
  effects.update({p,course:nextCourse,state:{...fresh,status:'racing',crushBurst:burst},dt:.016});
  check(liveParticles()===live,'a retained crush burst does not repeat every frame');
  effects.update({p,course:nextCourse,state:{...fresh,airborne:true,airHeight:3},dt:.016});
  effects.update({p,course:oldCourse,state:fresh,dt:.016});
  check(liveParticles()===0,'switching Course clears airborne history rather than inventing a landing burst');
  check(graphIdentity(effects.group)===identity,'effect handoffs reuse the fixed particle, skid and debris pools');
  effects.dispose();check(effects.group.children.length===0,'effect disposal releases the retained pool children');
}

{
  const explosion=createExplosion({combat:true}),p={x:0,y:0,z:0};
  const puffs=explosion.group.children.find(child=>child.isPoints);
  const ring=explosion.group.children.find(child=>child.isMesh&&child.geometry?.type==='RingGeometry');
  check(!explosion.group.children.some(child=>child.isLight),'wreck effect does not change the scene light count');
  explosion.update(p,{status:'racing',catastrophic:true},0);
  const firstPuffs=puffs.geometry.attributes.puff.array;
  check(explosion.group.visible&&ring.material.opacity>0&&
    firstPuffs.some((size,index)=>index%4===0&&size>0&&firstPuffs[index+1]>0),
    'first active wreck frame shows flame and ring at zero render delta');
  const frozenPuffs=firstPuffs.slice(),frozenPositions=puffs.geometry.attributes.position.array.slice();
  const frozenRingOpacity=ring.material.opacity;
  explosion.update(p,{status:'racing',catastrophic:true},0);
  check(ring.material.opacity===frozenRingOpacity&&
    firstPuffs.every((value,index)=>value===frozenPuffs[index])&&
    puffs.geometry.attributes.position.array.every((value,index)=>value===frozenPositions[index]),
    'paused wreck frames keep the initialized blast still');
  explosion.dispose();
}

{
  const explosion=createExplosion(),p={x:0,y:0,z:0},identity=graphIdentity(explosion.group);
  const puffs=explosion.group.children.find(child=>child.isPoints);
  const light=explosion.group.children.find(child=>child.isLight);
  const ring=explosion.group.children.find(child=>child.isMesh&&child.geometry?.type==='RingGeometry');
  explosion.update(p,{status:'gameover',catastrophic:true},.05);
  check(explosion.group.visible&&ring.material.opacity>0&&light.intensity>0,
    'legacy fatal race keeps its lit explosion pool');
  explosion.update(p,{status:'menu',catastrophic:true},0);
  check(!explosion.group.visible&&light.intensity===0&&ring.material.opacity===0&&puffs.geometry.attributes.puff.array.every(v=>v===0),'menu hides and clears a fatal effect even with a frozen simulation clock');
  explosion.update(p,{status:'countdown',catastrophic:false},.016);
  check(!explosion.group.visible,'fresh countdown cannot show the previous wreck');
  explosion.update(p,{status:'gameover',catastrophic:true},.05);
  check(explosion.group.visible&&light.intensity>0&&ring.material.opacity>0&&graphIdentity(explosion.group)===identity,'a later fatal event reuses the same explosion resources');
  explosion.dispose();check(explosion.group.children.length===0,'explosion disposal releases all pooled children');
}

{
  const group=new THREE.Group(),geometry=new THREE.BoxGeometry(),texture=new THREE.Texture(),material=new THREE.MeshStandardMaterial({map:texture});
  const sharedGeometry=new THREE.BoxGeometry(),sharedTexture=new THREE.Texture(),sharedMaterial=new THREE.MeshStandardMaterial({map:sharedTexture});
  const resources=[geometry,material,texture,sharedGeometry,sharedMaterial,sharedTexture],counts=resources.map(()=>0);
  resources.forEach((resource,i)=>resource.addEventListener('dispose',()=>counts[i]++));
  for(const resource of[sharedGeometry,sharedMaterial,sharedTexture])resource.userData.sharedAsset=true;
  group.add(new THREE.Mesh(geometry,material),new THREE.Mesh(geometry,material),new THREE.Mesh(sharedGeometry,sharedMaterial));
  disposeTree(group);
  check(counts.slice(0,3).every(count=>count===1),'world disposal releases private resources exactly once even when multiple meshes share them');
  check(counts.slice(3).every(count=>count===0),'world disposal preserves the explicit shared asset cache');
  sharedGeometry.dispose();sharedMaterial.dispose();sharedTexture.dispose();group.clear();
}

console.log(`Render reuse: ${checks} key, chicken, arena reset, effect pool and disposal checks passed.`);
