import assert from 'node:assert/strict';
import * as THREE from 'three';
import {COURSE} from '../src/config.js';
import {Course} from '../src/course.js';
import {freestyleLayout,freestyleHeightAt,freestyleSurfaceHeightAt} from '../src/freestyle-course.js';
import {freestyleTerrainGeometry,addFreestyleScenery} from '../src/freestyle-scene.js';
import {disposeTree} from '../src/world.js';
import {Duel} from '../src/game.js';
import {sampleMountainSupport} from '../src/mountain-support.js';
let checks=0;const check=(value,label)=>{assert.ok(value,label);checks++;};
const def=COURSE.find(c=>c.practice),course=new Course(def,1989);
check(COURSE.indexOf(def)===15&&def.id==='titan-freestyle','practice appends one stable event; old IDs stay in place');
check(def.kind==='arena'&&!def.hasRival&&!def.hasRadar&&!def.stuntTrial&&!def.chaseTimeLimit,'practice has no competitive objective');
check(course.features.lapGates.length===0&&course.features.checkpoints.length===0,'no finish gates or lap pressure');
check(!course.features.obstacles.some(o=>o.arenaWall||o.id.startsWith('finish-post')),'open arena has no old inner wall or finish posts');
check(course.features.ramps.length===3&&course.features.crushables.length===12&&course.features.rocks.length===7,'three jump lines, twelve wrecks and progressive rocks');
check(course.features.practiceMounds.at(-1).height===44,'steep climb has an intentional visible summit');
check(freestyleLayout(course)===freestyleLayout(course),'layout is cached, not allocated per ground sample');
const geometry=freestyleTerrainGeometry(course),positions=geometry.attributes.position,index=geometry.index;
check(positions.count<20000&&index.count/3<30000,'adaptive ground keeps detailed hills without a dense empty floor');
check([...positions.array,...geometry.attributes.normal.array].every(Number.isFinite),'finite ground and normal attributes');
for(let i=0;i<index.count;i+=3){
  const a=new THREE.Vector3().fromBufferAttribute(positions,index.getX(i)),b=new THREE.Vector3().fromBufferAttribute(positions,index.getX(i+1)),c=new THREE.Vector3().fromBufferAttribute(positions,index.getX(i+2));
  check(new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).y>0,'terrain triangles face upward');
  const x=(a.x+b.x+c.x)/3,z=(a.z+b.z+c.z)/3,y=(a.y+b.y+c.y)/3;
  check(Math.abs(freestyleSurfaceHeightAt(course,x,z)-y)<.0001,'support follows the actual triangle, not an invisible smoother ramp');
}
for(const mound of course.features.practiceMounds){
  check(Math.abs(freestyleHeightAt(course,mound.x,mound.z)-mound.height)<1e-9,`${mound.id}: authored crest height`);
  for(const side of[-1,1]){
    const c=Math.cos(mound.heading),s=Math.sin(mound.heading),x=mound.x+c*side*(mound.halfX+1),z=mound.z-s*side*(mound.halfX+1);
    check(freestyleHeightAt(course,x,z)===0,`${mound.id}: clear side runout`);
  }
}
for(const feature of course.features.crushables){
  check([feature.x,feature.y,feature.z,feature.heading].every(Number.isFinite),'salvage placement finite');
  check(feature.y===course.groundAt(feature.s,feature.off).y,'salvage rests on visible terrain');
}
const oldLoad=THREE.TextureLoader.prototype.load;THREE.TextureLoader.prototype.load=function(){return new THREE.Texture();};
try{
  const world=new THREE.Group(),detail=addFreestyleScenery(world,course);let draws=0,triangles=0;
  detail.traverse(mesh=>{if(!mesh.isMesh)return;draws++;triangles+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);});
  check(draws<=12,'practice architecture, signs and rock garden are material-batched');
  check(triangles<100000,'quarry detail keeps a bounded mesh budget');
  let disposed=0;detail.traverse(mesh=>mesh.geometry?.addEventListener('dispose',()=>disposed++));disposeTree(world);check(disposed>0,'detail resource cleanup runs');
  console.log(`Practice scenery: ${draws} draws, ${triangles} submitted triangles; ground ${index.count/3} triangles.`);
}finally{THREE.TextureLoader.prototype.load=oldLoad;geometry.dispose();}
// FREESTYLE-MOUNTAINS (Kyle, 16 November 2026: Gratian's Koenigsegg crashed far from the quarry mountains and in mid-air
// above them). Every car drives on a quarry mountain's real surface: no wall at its foot, none in the air, never inside it.
{
  const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a)),dt=1/120;
  const driveAt=(car,air)=>{
    const duel=new Duel({seed:1989});duel.startCampaign({car,startStage:COURSE.indexOf(def),difficulty:'casual',mode:'timetrial'});duel.state.status='racing';
    const c=duel.course,k=c.features.mountains[1],st=duel.state,crashes=[];duel.onChange((_,ev)=>{if(ev?.crash)crashes.push(ev.crash);});
    Object.assign(st,{s:k.s,prevS:k.s,lateral:k.off-160,prevLateral:k.off-160,speedMph:70,gear:3});
    if(air){const g=duel._supportAt(st.s,st.lateral).y;Object.assign(st,{airborne:true,airHeight:air,prevAirHeight:air,_jumpY:g+air,_verticalSpeed:2});}
    let closest=Infinity,below=-Infinity,climbed=0,pitched=0;
    for(let i=0;i<10/dt&&!crashes.length;i++){
      const p=c.worldAt(st.s,st.lateral),want=Math.atan2(k.x-p.x,k.z-p.z),have=c.at(st.s).heading+(st.headingError||0);
      duel.setInput({throttle:1,steer:Math.max(-1,Math.min(1,-wrap(want-have)*3))});duel.step(dt);
      const q=c.worldAt(st.s,st.lateral),surface=sampleMountainSupport(c,q.x,q.z);closest=Math.min(closest,Math.hypot(q.x-k.x,q.z-k.z));
      if(surface!=null){below=Math.max(below,surface-((st.groundHeight??c.groundAt(st.s,st.lateral).y)+(st.airHeight||0)));pitched=Math.max(pitched,Math.abs(st.terrainPitch||0));climbed=Math.max(climbed,surface-c.groundAt(st.s,st.lateral).y);}
    }
    return {crashes,closest,below,climbed,pitched};
  };
  const ground=driveAt('koenigsegg_jesko',0);
  check(!ground.crashes.length&&ground.closest<10,`the Jesko drives onto the quarry mountain with no crash (${ground.crashes[0]??'none'}, ${ground.closest.toFixed(0)} m from its top)`);
  check(ground.climbed>20&&ground.below<=.01,`it rides the real surface as it is drawn, up ${ground.climbed.toFixed(1)} m, never inside it (${ground.below.toFixed(2)} m)`);
  check(ground.pitched>.15,`and tilts with the slope (${(ground.pitched*180/Math.PI).toFixed(0)} degrees)`);
  const flying=driveAt('koenigsegg_jesko',20);
  check(!flying.crashes.length,`jumping toward the mountain, no crash in the air (${flying.crashes[0]??'none'})`);
  const truck=driveAt('titan_monster',0);
  check(!truck.crashes.length&&truck.climbed>20,'the Titan climbs it as before');
}

console.log(`Freestyle course: ${checks} layout, open access, terrain support, geometry and cleanup checks passed.`);
