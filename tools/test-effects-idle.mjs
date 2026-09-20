import assert from 'node:assert/strict';
import {createDrivingEffects} from '../src/effects.js';

let checks=0;const check=(v,label)=>{assert.ok(v,label);checks++;},equal=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const fx=createDrivingEffects(),state={status:'racing',car:'falcone_f42',speedMph:90,input:{throttle:1,brake:0}},args={p:{x:0,y:0,z:0,heading:0},state,dt:1/60,now:0};
const versions=()=>fx.group.children.map(o=>[...Object.values(o.geometry.attributes).map(a=>a.version),o.instanceMatrix?.version]);
const inventory=fx.group.children.map(o=>[o,o.geometry,o.material,o.instanceMatrix]);
const clean=versions();for(let i=0;i<1000;i++)fx.update(args);
equal(versions(),clean,'clean-road frames upload zero particle/mark/debris buffers');check(fx.group.children.every(o=>!o.visible),'empty pools submit zero draws');
state.impactTimer=1;state.impactStrength=.8;fx.update(args);
const particles=fx.group.children[0],chips=fx.group.children[2];check(particles.visible&&chips.visible,'actual impact wakes existing pooled effects');
const staticVersions=['color','particleKind','particleSpin'].map(name=>particles.geometry.attributes[name].version);
state.impactTimer=0;for(let i=0;i<5;i++)fx.update(args);
equal(['color','particleKind','particleSpin'].map(name=>particles.geometry.attributes[name].version),staticVersions,'fading particles do not re-upload immutable color/kind/spin');
equal(fx.group.children.map(o=>[o,o.geometry,o.material,o.instanceMatrix]),inventory,'emissions retain fixed resources');
const paused=versions();fx.update({...args,dt:0});equal(versions(),paused,'pause never uploads or advances pools');
for(let i=0;i<1000;i++)fx.update(args);check(fx.group.children.every(o=>!o.visible),'expired pools leave draw list');
const expired=versions();for(let i=0;i<1000;i++)fx.update(args);equal(versions(),expired,'fully expired pools stay idle');
state.car='titan_monster';state.groundHeight=20;state.terrainPitch=.4;state.terrainRoll=.15;state.offRoad=true;state.s=100;state.lateral=0;for(let i=0;i<3;i++)fx.update(args);
check(particles.visible,'climbing tire throws dust on physical support');
const y=particles.geometry.attributes.position.array;check([...particles.geometry.attributes.particleAlpha.array].some((a,i)=>a>0&&y[i*3+1]>19),'climb particles originate on support, not buried road terrain');
state.tumble={elapsed:.5};state.terrainPitch=Math.PI/2;state.impactTimer=1;fx.update(args);
check(particles.geometry.attributes.position.array.every(Number.isFinite),'full tumble produces finite impact particles even at vertical chassis pitch');
const markVersions=fx.group.children[1].instanceMatrix.version;for(let i=0;i<30;i++)fx.update(args);equal(fx.group.children[1].instanceMatrix.version,markVersions,'tumbling wheels draw no tire tracks');
state.offRoad=false;state.tumble=null;state.groundHeight=null;state.impactTimer=0;args.p={x:500,y:0,z:0,heading:0};fx.update(args);
check(fx.group.children.every(o=>!o.visible),'teleport clears all three active draw pools');
const resources=new Set();for(const o of fx.group.children){resources.add(o.geometry);resources.add(o.material);if(o.isInstancedMesh)resources.add(o);for(const uniform of Object.values(o.material.uniforms||{}))if(uniform.value?.isTexture)resources.add(uniform.value);}
const disposed=new Map();for(const r of resources)r.addEventListener('dispose',()=>disposed.set(r,(disposed.get(r)||0)+1));fx.dispose();
for(const r of resources)equal(disposed.get(r),1,'every pooled GPU resource is disposed exactly once');
check(fx.group.children.length===0,'disposed effects retain no scene children');
if(process.argv.includes('--benchmark')){
  const e=createDrivingEffects(),s={status:'racing',car:'falcone_f42',speedMph:90,input:{throttle:1,brake:0}},a={...args,p:{x:0,y:0,z:0,heading:0},state:s};
  for(let i=0;i<2000;i++)e.update(a);const times=[];for(let round=0;round<7;round++){const start=performance.now();for(let i=0;i<10000;i++)e.update(a);times.push(performance.now()-start);}
  console.log(JSON.stringify({scope:'headless idle effects.update only, not total frame/GPU time',updates:10000,times,medianMs:[...times].sort((a,b)=>a-b)[3],emptyDraws:e.group.children.filter(o=>o.visible).length}));e.dispose();
}
console.log(`Effects idle pools: ${checks} zero-upload/draw, wake/fade, physical support, tumble, pause, reset and disposal checks.`);
