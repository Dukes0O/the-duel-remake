import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {makeRng} from '../src/rng.js';
import {createDrivingEffects} from '../src/effects.js';

let checks=0;
const equal=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
const url=new URL('../src/effects.js',import.meta.url),source=readFileSync(url,'utf8');
const gate='moving && !airborne && (dirt || braking || sliding || impact > .1) ?';
equal(source.split(gate).length,2,'the production tire-plane gate is present exactly once');
// Restore only the former eager sampling decision. Everything downstream is
// the actual production emitter, including its RNG, pool, marks and bouncing.
const legacySource=source.replace(gate,'moving && !airborne ?').replace(/from\s+(['"])([^'"]+)\1/g,(_match,_quote,specifier)=>`from ${JSON.stringify(specifier.startsWith('.')?new URL(specifier,url).href:import.meta.resolve(specifier))}`);
const {createDrivingEffects:createLegacy}=await import('data:text/javascript;base64,'+Buffer.from(legacySource).toString('base64'));
function signature(effects){
  const hash=createHash('sha256');
  effects.group.traverse(object=>{
    hash.update(JSON.stringify([object.type,object.visible,object.renderOrder,object.frustumCulled]));
    if(object.geometry){
      for(const [name,attribute]of Object.entries(object.geometry.attributes)){hash.update(name);hash.update(Buffer.from(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength));}
      const sphere=object.geometry.boundingSphere;hash.update(JSON.stringify(sphere?[sphere.center.toArray(),sphere.radius]:null));
    }
    if(object.instanceMatrix)hash.update(Buffer.from(object.instanceMatrix.array.buffer));
  });
  return hash.digest('hex');
}
function seededUpdate(effects,args,seed){
  const previous=Math.random,rng=makeRng(seed);let calls=0;
  Math.random=()=>{calls++;return rng.float();};
  try{effects.update(args);}finally{Math.random=previous;}
  return calls;
}
let snapshots=0;
for(const event of ['pacific-canyon','ridge-rally','titan-arena']){
  const course=new Course(COURSE.find(def=>def.id===event),1989),legacy=createLegacy(),actual=createDrivingEffects();
  try{
    for(let frame=0;frame<420;frame++){
      const phase=Math.floor(frame/60),s=400+frame*.6;
      const state={status:'racing',car:event==='titan-arena'?'titan_monster':'falcone_f42',s,lateral:phase===1?12:0,speedMph:phase===5?-20:90,gear:phase===5?-1:1,headingError:0,slipAngle:phase===3?.18:0,offRoad:phase===1,roughness:phase===1?.7:0,
        input:{brake:phase===2?1:0,throttle:phase===5?.5:1},airborne:phase===4,airHeight:phase===4?2:0,impactTimer:frame===390?1:0,impactStrength:.6,impactSide:1};
      const args={p:course.groundAt(s,state.lateral),state,course,dt:1/60,now:frame/60},before=JSON.stringify(state);
      equal(seededUpdate(actual,args,1000+frame),seededUpdate(legacy,args,1000+frame),'sampling does not change random consumption');
      equal(signature(actual),signature(legacy),`${event} frame ${frame}: every effect buffer and bound remains exact`);
      equal(JSON.stringify(state),before,'effect presentation never changes simulation state');snapshots++;
    }
  }finally{actual.dispose();legacy.dispose();}
}

// Count the actual Course sampler, not a synthetic shortcut path. The zero-
// query case is clean paved driving; dirt, brakes and slides retain contacts.
const course=new Course(COURSE[0],1989),groundAt=course.groundAt.bind(course);let queries=0;
course.groundAt=(...args)=>{queries++;return groundAt(...args);};
const base={status:'racing',car:'falcone_f42',s:600,lateral:0,speedMph:90,gear:1,headingError:0,slipAngle:0,offRoad:false,roughness:0,input:{brake:0,throttle:1},impactTimer:0};
for(const [label,extra,wanted]of [
  ['clean paved',{},0],['forward braking',{input:{brake:.3,throttle:0}},10],['brake threshold',{input:{brake:.2,throttle:0}},0],
  ['reverse acceleration',{speedMph:-20,gear:-1,input:{brake:1,throttle:0}},0],['reverse braking',{speedMph:-20,gear:-1,input:{brake:0,throttle:.5}},10],
  ['sliding',{slipAngle:.076},10],['slip threshold',{slipAngle:.075},0],['explicit drift',{drifting:true},10],['dirt shoulder',{lateral:12,offRoad:true},10],
  ['airborne',{airborne:true,airHeight:3},0],['stationary',{speedMph:0},0],
]){
  const actual=createDrivingEffects(),state={...base,...extra},args={p:course.groundAt(state.s,state.lateral),state,course,dt:1/60,now:0};
  queries=0;seededUpdate(actual,args,88);equal(queries,wanted,`${label}: only useful tire planes are sampled`);actual.dispose();
}
{
  const actual=createDrivingEffects(),legacy=createLegacy(),args={p:course.groundAt(base.s,base.lateral),state:{...base},course,dt:1/60,now:0};
  queries=0;for(let frame=0;frame<100;frame++)actual.update(args);equal(queries,0,'100 clean-driving frames avoid every unused ground query');
  queries=0;for(let frame=0;frame<100;frame++)legacy.update(args);equal(queries,1000,'the reference path confirms ten eliminated queries per clean frame');
  equal(signature(actual),signature(legacy),'clean-driving output remains exact without those queries');
  actual.dispose();legacy.dispose();
}
if(process.argv.includes('--benchmark')){
  const actual=createDrivingEffects(),legacy=createLegacy(),positions=Array.from({length:256},(_,index)=>groundAt(600+index*.6,0));
  const state={...base},args={p:positions[0],state,course,dt:1/60,now:0};
  function time(effects,count){const start=performance.now();for(let index=0;index<count;index++){const point=index%256;state.s=600+point*.6;args.p=positions[point];args.now=index/60;effects.update(args);}return performance.now()-start;}
  time(actual,1000);time(legacy,1000);const before=[],after=[];
  for(let round=0;round<7;round++){if(round%2){after.push(time(actual,5000));before.push(time(legacy,5000));}else{before.push(time(legacy,5000));after.push(time(actual,5000));}}
  const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
  console.log(JSON.stringify({scope:'headless effects.update CPU only; not whole-frame or GPU time',updatesPerRound:5000,beforeMs:before,afterMs:after,medianBeforeMs:median(before),medianAfterMs:median(after),speedup:median(before)/median(after)}));
  actual.dispose();legacy.dispose();
}
console.log(`Effect contact demand: ${checks} checks; ${snapshots} exact effect-buffer snapshots; ten unused ground queries removed per clean paved-driving frame.`);
