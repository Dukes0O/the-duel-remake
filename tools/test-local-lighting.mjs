import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {makeRng} from '../src/rng.js';
import {createLocalLighting} from '../src/local-lighting.js';

let checks=0;
const equal=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
const url=new URL('../src/local-lighting.js',import.meta.url),source=readFileSync(url,'utf8');
const start=source.indexOf('      let count=0;'),end=source.indexOf('      for(let i=0;i<beacons.length;i++){');
assert(start>0&&end>start,'the bounded selection block exists');
// Compare against the former full-sort path while sharing all other actual
// production logic: course preparation, targets, beacon placement and disposal.
const legacySelection=`      const nearby=night?fixtures.map(p=>({p,d:Math.hypot(p.x-position.x,p.z-position.z)})).filter(p=>p.d<135).sort((a,b)=>a.d-b.d):[];
      for(let i=0;i<street.length;i++){
        const light=street[i],entry=nearby[i];
        light.intensity=0;
        if(entry&&(high||i<2)){
          const p=entry.p,fade=THREE.MathUtils.smoothstep(entry.d,78,135);
          light.position.set(p.x,p.y,p.z);light.target.position.set(p.target.x,p.target.y,p.target.z);
          light.target.updateMatrixWorld();light.intensity=155*(1-fade);
        }
      }
`;
const legacySource=(source.slice(0,start)+legacySelection+source.slice(end))
  .replace("from 'three'",`from ${JSON.stringify(import.meta.resolve('three'))}`);
const {createLocalLighting:createLegacy}=await import('data:text/javascript;base64,'+Buffer.from(legacySource).toString('base64'));

function snapshot(scene){
  return scene.children.filter(object=>object.isLight).map(light=>({
    type:light.type,intensity:light.intensity,color:light.color.toArray(),
    position:light.position.toArray(),target:light.target?.position.toArray(),
    targetMatrix:light.target?.matrixWorld.toArray(),distance:light.distance,
    angle:light.angle,decay:light.decay,penumbra:light.penumbra,shadow:light.castShadow,
  }));
}
const scene=new THREE.Scene(),oldScene=new THREE.Scene();
const actual=createLocalLighting(scene),legacy=createLegacy(oldScene),rng=makeRng(90210);
const police={visible:true,position:new THREE.Vector3(5,2,-8),rotation:new THREE.Euler(.05,.8,-.03)};
const cityCourses=['harbor-highlands','midnight-chase','neon-drift-trial'].map(id=>new Course(COURSE.find(def=>def.id===id),1989));
// These exact-distance ties also cover a pole at the cutoff (excluded), one
// just inside it and a non-city fixture that must never enter the pool.
const ties={features:{poles:[
  {x:0,z:10},{x:0,z:-10},{x:10,z:0},{x:-10,z:0},{x:0,z:10},
  {x:135,z:0},{x:134.999999,z:0},{x:0,z:0,theme:'desert'},
].map((p,i)=>({...p,x:p.x-5.4,y:i,heading:0,s:i,theme:p.theme||'city'}))},worldAt:s=>({x:s,y:-s,z:s*2})};
const empty={features:{poles:[]},worldAt:()=>({x:0,y:0,z:0})};
let frames=0;
for(const course of [...cityCourses,ties,empty,cityCourses[0]]){
  for(let frame=0;frame<240;frame++){
    const position=course.worldAt===ties.worldAt?{x:0,y:0,z:0}:
      course instanceof Course?course.worldAt(frame*course.length/240,rng.range(-25,25)):{x:0,y:0,z:0};
    police.visible=frame%7!==0;
    const args={course,position,police,now:frame*31,night:frame%9!==0,high:frame%5<3,menu:frame%11===0};
    actual.update(args);legacy.update(args);
    equal(snapshot(scene),snapshot(oldScene),`course ${frames/240|0} frame ${frame}: all light and target values stay exact`);frames++;
  }
}
actual.dispose();legacy.dispose();
equal(scene.children.length,0,'all optimized lamps and targets are removed on disposal');
equal(oldScene.children.length,0,'the reference path removes the same objects');

if(process.argv.includes('--benchmark')){
  const course=cityCourses[1],position={x:0,y:0,z:0},args={course,position,police:null,now:0,night:true,high:false,menu:false};
  const positions=Array.from({length:256},(_,i)=>course.worldAt(i*course.length/256,0));
  const optimized=createLocalLighting(new THREE.Scene()),reference=createLegacy(new THREE.Scene());
  function time(lighting,count){
    const started=performance.now();
    for(let i=0;i<count;i++){args.position=positions[i%positions.length];lighting.update(args);}
    return performance.now()-started;
  }
  time(optimized,4000);time(reference,4000);const before=[],after=[];
  for(let round=0;round<7;round++){
    if(round%2){after.push(time(optimized,10000));before.push(time(reference,10000));}
    else{before.push(time(reference,10000));after.push(time(optimized,10000));}
  }
  const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
  console.log(JSON.stringify({scope:'headless local-light CPU only; not whole-frame or GPU time',course:course.def.id,cityPoles:course.features.poles.filter(p=>p.theme==='city').length,updatesPerRound:10000,beforeMs:before,afterMs:after,medianBeforeMs:median(before),medianAfterMs:median(after),speedup:median(before)/median(after)}));
  optimized.dispose();reference.dispose();
}
console.log(`Local lighting: ${checks} checks; ${frames} exact reference snapshots; no per-pole allocations or full-route sorts each frame.`);
