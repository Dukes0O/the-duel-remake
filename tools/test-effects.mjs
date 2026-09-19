import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import * as THREE from 'three';
import { createDrivingEffects } from '../src/effects.js';

let checks=0;const check=(condition,label)=>{assert.ok(condition,label);checks++;};
function surface({dirt=false}={}){
  return {def:{offroad:dirt},calls:0,at:s=>({heading:0,curvature:0,y:s*.12}),themeAt:()=>dirt?'alpine':'desert',
    groundAt(s,lateral){this.calls++;return{x:lateral,y:s*.12+lateral*.18,z:s};},
    surfaceAt:()=>({road:true,mainRoad:!dirt,roadHalfWidth:10,shortcutId:null}),nearest(){throw new Error('Effects must not search the full road per particle');}};
}
const state=(extra={})=>({status:'racing',car:'stuttgart_959s',s:100,lateral:0,speedMph:90,headingError:0,slipAngle:0,offRoad:false,roughness:1,input:{brake:1},...extra});
const arrays=fx=>({particles:fx.group.children.find(child=>child.isPoints),marks:fx.group.children.find(child=>child.isInstancedMesh)});
{
  const course=surface(),fx=createDrivingEffects(),s=state(),p=course.groundAt(s.s,s.lateral);
  fx.update({p,state:s,dt:.05,course});const {marks}=arrays(fx),matrix=new THREE.Matrix4();marks.getMatrixAt(0,matrix);
  const position=new THREE.Vector3().setFromMatrixPosition(matrix),normal=new THREE.Vector3().setFromMatrixColumn(matrix,2).normalize();
  const expected=new THREE.Vector3(0,1,-.12).normalize();
  check(normal.distanceTo(expected)<1e-5,'asphalt skid planes follow the actual road incline, not roadside relief');
  check(Math.abs(position.y-position.z*.12-.044)<1e-5,'asphalt skids sit above the visible road rather than below it');
  check(marks.geometry.attributes.markAlpha.array[0]>0,'a grounded braking tire produces a visible mark');
  check(marks.geometry.attributes.markDirt.array[0]===0,'road skids retain the rubber pattern');
  const alpha=marks.geometry.attributes.markAlpha.array.slice();fx.update({p,state:s,dt:0,course});
  check(alpha.every((value,i)=>value===marks.geometry.attributes.markAlpha.array[i]),'pause freezes the mark pool');
  fx.dispose();check(fx.group.children.length===0,'disposing driving effects releases every pooled child');
}
{
  const course=surface({dirt:true}),widths=[];
  for(const car of ['dusthawk_rally','titan_monster']){
    const fx=createDrivingEffects(),s=state({car,offRoad:true,input:{brake:0}}),p=course.groundAt(s.s,s.lateral);
    course.calls=0;fx.update({p,state:s,dt:.05,course});const {particles,marks}=arrays(fx),matrix=new THREE.Matrix4();marks.getMatrixAt(0,matrix);
    widths.push(new THREE.Vector3().setFromMatrixColumn(matrix,0).length());
    check(new THREE.Vector3().setFromMatrixColumn(matrix,2).normalize().distanceTo(new THREE.Vector3(-.18,1,-.12).normalize())<1e-5,'dirt tracks retain the true terrain incline and cross slope');
    check(marks.geometry.attributes.markDirt.array[0]===1,'gravel tracks use a dirt tread pattern');
    check(particles.geometry.attributes.particleAlpha.array.some(alpha=>alpha>0),'grounded rally and monster tires throw dirt particles');
    check(course.calls<=12,'ground sampling is limited to the emitter footprints');
    course.calls=0;s.speedMph=0;fx.update({p,state:s,dt:.016,course});
    check(course.calls===0,'existing particles bounce on cached ground planes without new terrain queries');
    check(particles.geometry.attributes.position.array.every(Number.isFinite),'particle motion on a slope remains finite');
    fx.dispose();
  }
  check(Math.abs(widths[0]-.4)<1e-5&&Math.abs(widths[1]-.76)<1e-5,'the monster leaves wider tracks than the rally car');
}
{
  const course=surface({dirt:true}),fx=createDrivingEffects(),s=state({car:'titan_monster',offRoad:true,airborne:true,airHeight:3,input:{brake:1}}),p=course.groundAt(s.s,s.lateral);
  for(let i=0;i<8;i++)fx.update({p,state:s,dt:.05,course});const {particles,marks}=arrays(fx);
  check(particles.geometry.attributes.particleAlpha.array.every(alpha=>alpha===0),'airborne wheels emit no dust or gravel');
  check(marks.geometry.attributes.markAlpha.array.every(alpha=>alpha===0),'airborne wheels leave no floating tire marks');
  s.airborne=false;s.airHeight=0;s.speedMph=0;fx.update({p,state:s,dt:.016,course});
  check(particles.geometry.attributes.particleAlpha.array.filter(alpha=>alpha>0).length>=25,'landing creates one pooled dust ring');
  const live=particles.geometry.attributes.particleAlpha.array.filter(alpha=>alpha>0).length;
  fx.update({p,state:s,dt:.016,course});
  check(particles.geometry.attributes.particleAlpha.array.filter(alpha=>alpha>0).length===live,'resting wheels do not repeat the landing burst');
  s.airborne=true;s.airHeight=3;fx.update({p,state:s,dt:.016,course});
  s.airborne=false;s.airHeight=0;s.s+=100;const reset=course.groundAt(s.s,s.lateral);fx.update({p:reset,state:s,dt:.016,course});
  check(particles.geometry.attributes.particleAlpha.array.every(alpha=>alpha===0),'a safety reset clears particles and cannot fake a landing burst');
  fx.dispose();
}
{
  const course=surface({dirt:true}),fx=createDrivingEffects(),s=state({car:'titan_monster',speedMph:0,input:{brake:0}}),p=course.groundAt(s.s,s.lateral);
  fx.update({p,state:s,dt:.016,course});
  s.crushBurst={serial:1,id:'junk-0',s:102,off:1,x:1,y:12.42,z:102,strength:.8,byPlayer:true};
  course.calls=0;fx.update({p,state:s,dt:.016,course});const {particles}=arrays(fx);
  const live=particles.geometry.attributes.particleAlpha.array.filter(alpha=>alpha>0).length;
  check(live>=55,'crushing emits a visible pooled dust and spark burst');
  check(course.calls===5,'the whole crush burst samples only one ground footprint');
  fx.update({p,state:s,dt:.016,course});
  check(particles.geometry.attributes.particleAlpha.array.filter(alpha=>alpha>0).length===live,'a persistent crush state does not repeat its burst');
  s.crushBurst={...s.crushBurst,serial:2,s:106,z:106,byPlayer:false};fx.update({p,state:s,dt:.016,course});
  check(particles.geometry.attributes.particleAlpha.array.filter(alpha=>alpha>0).length>live,'a nearby rival crush has its own world-space dust');
  const before=particles.geometry.attributes.particleAlpha.array.filter(alpha=>alpha>0).length;
  s.crushBurst={...s.crushBurst,serial:3,s:600,z:600};fx.update({p,state:s,dt:.016,course});
  check(particles.geometry.attributes.particleAlpha.array.filter(alpha=>alpha>0).length===before,'distant crushing does not fill the visible particle pool');
  fx.dispose();
}
// A shortcut approach flattens roadside relief from -6 cm to zero, but the
// main paved mesh stays at worldAt +3.5 cm. Decals must not rise with relief.
{
  const heights=[];
  for(const relief of[-.06,0]){
    const course=surface(),fx=createDrivingEffects(),s=state();
    course.at=()=>({heading:0,curvature:0,y:0});
    course.groundAt=(distance,lateral)=>({x:lateral,y:relief,z:distance});
    fx.update({p:course.groundAt(s.s,0),state:s,dt:.05,course});
    const matrix=new THREE.Matrix4();arrays(fx).marks.getMatrixAt(0,matrix);
    heights.push(matrix.elements[13]);
    check(Math.abs(matrix.elements[13]-.044)<1e-6,'asphalt decal remains 9 mm above the mesh at either roadside relief');fx.dispose();
  }
  check(Math.abs(heights[0]-heights[1])<1e-7,'flattened shortcut approach cannot lift the skid mark into the air');
}
const smokeIndices=fx=>{const a=arrays(fx).particles.geometry.attributes;return Array.from(a.particleKind.array,(_,i)=>i).filter(i=>a.particleKind.array[i]===3&&a.particleAlpha.array[i]>0);};
function withRandom(seed,fn){const original=Math.random;let value=seed>>>0;Math.random=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};try{return fn();}finally{Math.random=original;}}
function driftRun(fps,seconds,{night=false}={}){
  return withRandom(429,()=>{
    const course=surface(),fx=createDrivingEffects(),s=state({slipAngle:.22,drifting:true,input:{brake:0}});
    if(night)course.def.timeOfDay='night';
    let t=0;while(t<seconds-1e-10){const dt=Math.min(1/fps,seconds-t);s.s+=s.speedMph*.44704*dt;fx.update({p:course.groundAt(s.s,0),state:s,dt,now:t,course});t+=dt;}
    return{fx,course,s};
  });
}
{
  const counts=[],alphas=[];
  for(const fps of[30,60,144]){
    const {fx}=driftRun(fps,.75),{particles}=arrays(fx),a=particles.geometry.attributes,indices=smokeIndices(fx);
    counts.push(indices.length);alphas.push(indices.reduce((sum,i)=>sum+a.particleAlpha.array[i],0));
    check(indices.length>=25&&indices.length<=40,`${fps}FPS emits a bounded visible drift plume over equal elapsed time`);
    check(indices.every(i=>{const rgb=a.color.array.slice(i*3,i*3+3);return Math.max(...rgb)-Math.min(...rgb)<.07&&Math.min(...rgb)>.5&&Math.max(...rgb)<.8;}),'tire smoke uses a restrained gray tint instead of dirt brown or impact orange');
    check(indices.every(i=>a.particleSize.array[i]>.6&&Number.isFinite(a.particleSpin.array[i])),'smoke sprites have finite independent rotation and soft expanding sizes');
    check(particles.geometry.boundingSphere.radius>5&&Number.isFinite(particles.geometry.boundingSphere.radius),'plume keeps a finite world-space culling bound');
    fx.dispose();
  }
  check(Math.max(...counts)-Math.min(...counts)<=1,'30,60 and144FPS smoke populations differ by at most one fractional-budget particle');
  check(Math.max(...alphas)/Math.min(...alphas)<1.12,'equal-duration plumes have comparable overall opacity across frame rates');
  console.log(`Tire smoke0.75s at30/60/144FPS: ${counts.join('/')} particles.`);
  const day=driftRun(60,.75),night=driftRun(60,.75,{night:true});
  const sum=fx=>smokeIndices(fx).reduce((n,i)=>n+arrays(fx).particles.geometry.attributes.particleAlpha.array[i],0);
  check(Math.abs(sum(night.fx)/sum(day.fx)-.72)<.001,'night smoke is attenuated without changing its population or adding light');day.fx.dispose();night.fx.dispose();
}
{
  const conditions=[['airborne',{airborne:true,airHeight:3}],['raised wheels',{airHeight:.2}],['off road',{offRoad:true}],['slow speed',{speedMph:40}],['stationary',{speedMph:0}],['straight braking',{slipAngle:0,drifting:false,input:{brake:1}}],['menu',{status:'menu'}],['countdown',{status:'countdown'}],['finished',{status:'stage_result'}]];
  for(const [label,extra]of conditions){
    const course=surface(),fx=createDrivingEffects(),s=state({slipAngle:.3,drifting:true,...extra}),p=course.groundAt(s.s,0);
    for(let i=0;i<24;i++)fx.update({p,state:s,dt:1/60,course});
    check(smokeIndices(fx).length===0,`${label} cannot emit tire smoke`);fx.dispose();
  }
  for(const terrain of['offroad','arena']){
    const course=surface();course.def[terrain]=true;const fx=createDrivingEffects(),s=state({slipAngle:.3,drifting:true}),p=course.groundAt(s.s,0);
    for(let i=0;i<24;i++)fx.update({p,state:s,dt:1/60,course});
    check(smokeIndices(fx).length===0&&arrays(fx).particles.geometry.attributes.particleAlpha.array.some(alpha=>alpha>0),`${terrain} uses dirt particles without asphalt tire smoke`);fx.dispose();
  }
  for(const blocked of[{airborne:true},{offRoad:true},{speedMph:20},{status:'menu'}]){
    const course=surface(),fx=createDrivingEffects(),s=state({slipAngle:.22,drifting:true}),p=course.groundAt(s.s,0);
    fx.update({p,state:s,dt:.02,course});fx.update({p,state:{...s,...blocked},dt:.1,course});fx.update({p,state:s,dt:.02,course});
    check(smokeIndices(fx).length===0,'leaving asphalt drift clears its partial emission budget instead of bursting on re-entry');fx.dispose();
  }
}
{
  const {fx,course,s}=driftRun(60,.75),{particles,marks}=arrays(fx),a=particles.geometry.attributes,p=course.groundAt(s.s,0);
  const values=Object.fromEntries(Object.entries(a).map(([key,attribute])=>[key,attribute.array.slice()])),markCopy=marks.geometry.attributes.markAlpha.array.slice(),before=smokeIndices(fx).length;
  for(let i=0;i<120;i++)fx.update({p,state:{...s,paused:true},dt:0,course});
  check(Object.entries(a).every(([key,attribute])=>attribute.array.every((value,i)=>value===values[key][i]))&&marks.geometry.attributes.markAlpha.array.every((value,i)=>value===markCopy[i]),'pause freezes every smoke/particle attribute and tire mark');
  fx.update({p,state:{...s,slipAngle:0,drifting:false,input:{brake:0}},dt:.05,course});
  check(smokeIndices(fx).length===before,'straightening stops emission while existing smoke remains in world space');
  for(let i=0;i<50;i++)fx.update({p,state:{...s,speedMph:0,drifting:false},dt:.05,course});
  check(smokeIndices(fx).length===0&&a.particleAlpha.array.every(alpha=>alpha===0),'stale tire smoke expires fully after the car stops');
  fx.dispose();
}
{
  const {fx,course,s}=driftRun(60,.5),{particles}=arrays(fx),geometry=particles.geometry,attributes=Object.values(geometry.attributes).map(attribute=>attribute.array),texture=particles.material.uniforms.smokeTexture.value;
  const p=course.groundAt(s.s,0);
  fx.update({p,state:{...s,status:'countdown',speedMph:0},dt:.016,course:surface()});
  check(geometry.attributes.particleAlpha.array.every(alpha=>alpha===0),'new Course identity clears old smoke even at the same player position');
  fx.update({p,state:s,dt:.05,course});check(smokeIndices(fx).length>0,'drifting after reset can emit a fresh plume');
  const teleported=course.groundAt(s.s+100,0);fx.update({p:teleported,state:{...s,s:s.s+100,speedMph:0},dt:.016,course});
  check(geometry.attributes.particleAlpha.array.every(alpha=>alpha===0),'a safety teleport clears all smoke at its old world position');
  for(let i=0;i<1200;i++){s.s+=1;fx.update({p:course.groundAt(s.s,0),state:s,dt:1/30,course});}
  check(geometry===particles.geometry&&Object.values(geometry.attributes).every((attribute,i)=>attribute.array===attributes[i])&&particles.material.uniforms.smokeTexture.value===texture,'long drift and repeated resets reuse fixed pool buffers and one texture');
  check(Object.values(geometry.attributes).every(attribute=>attribute.array.every(Number.isFinite))&&smokeIndices(fx).length<150,'long drift remains finite with a bounded live plume after wrapping the pool');
  const resources=[texture,geometry,particles.material,...fx.group.children.filter(child=>child.isInstancedMesh).flatMap(mesh=>[mesh.geometry,mesh.material])],disposed=resources.map(()=>0);
  resources.forEach((resource,i)=>resource.addEventListener('dispose',()=>disposed[i]++));const parent=new THREE.Group();parent.add(fx.group);fx.dispose();
  check(disposed.every(count=>count===1)&&parent.children.length===0&&fx.group.children.length===0,'disposal releases the sprite, pool geometry and materials once and detaches the effect group');
}

// Decode the actual generated sprite rather than assuming the white headless
// fallback proves its transparency. This supports standard8-bit RGBA PNGs.
{
  const png=readFileSync(new URL('../public/assets/textures/tire-smoke.png',import.meta.url)),chunks=[];
  check(png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'generated smoke asset is a PNG');
  const width=png.readUInt32BE(16),height=png.readUInt32BE(20),stride=width*4;
  check(width>=256&&height>=256&&png[24]===8&&png[25]===6&&png[28]===0,'smoke sprite supplies full-resolution RGBA pixels with an alpha channel');
  for(let offset=8;offset<png.length;){const length=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8);if(type==='IDAT')chunks.push(png.subarray(offset+8,offset+8+length));offset+=length+12;}
  const raw=inflateSync(Buffer.concat(chunks)),pixels=new Uint8Array(stride*height);
  check(raw.length===height*(stride+1),'sprite pixel data is complete');
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++)for(let x=0;x<stride;x++){
    const filter=raw[y*(stride+1)],value=raw[y*(stride+1)+1+x],a=x>=4?pixels[y*stride+x-4]:0,b=y?pixels[(y-1)*stride+x]:0,c=y&&x>=4?pixels[(y-1)*stride+x-4]:0;
    assert(filter<=4,'standard PNG filter');pixels[y*stride+x]=(value+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c)))&255;
  }
  let transparent=0,soft=0,opaque=0,borderMaximum=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const alpha=pixels[(y*width+x)*4+3];if(alpha===0)transparent++;else if(alpha<245)soft++;else opaque++;if(x===0||y===0||x===width-1||y===height-1)borderMaximum=Math.max(borderMaximum,alpha);}
  check(transparent>width*height*.1&&soft>width*height*.1&&opaque>0,'actual smoke sprite has transparent space, soft alpha edges and a visible dense core');
  check(borderMaximum<12,'sprite boundary stays transparent to avoid a rotated square outline');
}
{
  const priorDocument=globalThis.document,load=THREE.TextureLoader.prototype.load;let loads=0,disposals=0;
  globalThis.document={};THREE.TextureLoader.prototype.load=function(url){check(url==='/assets/textures/tire-smoke.png','browser path loads the generated sprite asset');loads++;const texture=new THREE.Texture();texture.addEventListener('dispose',()=>disposals++);return texture;};
  try{const fx=createDrivingEffects(),course=surface(),s=state({slipAngle:.3,drifting:true}),p=course.groundAt(s.s,0);for(let i=0;i<120;i++)fx.update({p,state:s,dt:1/60,course});check(loads===1,'browser effect loads one sprite for the entire particle pool');fx.dispose();check(disposals===1,'browser sprite texture is released on effect disposal');}
  finally{THREE.TextureLoader.prototype.load=load;if(priorDocument===undefined)delete globalThis.document;else globalThis.document=priorDocument;}
}
{
  // Follow actual contact motion on a sloping road while frame durations vary.
  // Adjacent rubber strips must meet, even when a frame exceeds one stamp interval.
  for(const fps of[30,60,144]){
    const course=surface(),fx=createDrivingEffects(),s=state({drifting:true,slipAngle:.17}),{marks}=arrays(fx);
    for(let frame=0;frame<Math.ceil(fps*.7);frame++){
      s.s+=90*.44704/fps;s.lateral=Math.sin(frame/fps*2)*.6;
      fx.update({p:course.groundAt(s.s,s.lateral),state:s,dt:1/fps,course});
    }
    const live=Array.from(marks.geometry.attributes.markAlpha.array).filter(alpha=>alpha>0).length;
    const matrix=new THREE.Matrix4(),endpoints=[];
    for(let i=0;i<live;i++){
      marks.getMatrixAt(i,matrix);
      endpoints.push([-.5,.5].map(y=>new THREE.Vector3(0,y,0).applyMatrix4(matrix)));
    }
    // The first short stationary footprint overlaps more than the joined strips.
    for(let i=4;i<endpoints.length;i++){
      const gap=Math.min(...endpoints[i].flatMap(point=>endpoints[i-2].map(previous=>point.distanceTo(previous))));
      check(gap<.061,`${fps}FPS: consecutive marks join the same tire path without rectangular gaps`);
    }
    s.drifting=false;s.slipAngle=0;s.input.brake=0;s.s+=8;fx.update({p:course.groundAt(s.s,s.lateral),state:s,dt:.05,course});
    s.input.brake=1;s.s+=8;fx.update({p:course.groundAt(s.s,s.lateral),state:s,dt:.05,course});
    marks.getMatrixAt(live,matrix);
    check(new THREE.Vector3().setFromMatrixColumn(matrix,1).length()<.5,'releasing then braking starts a fresh mark instead of bridging the unmarked road');
    fx.dispose();
  }
}
{
  for(const speedMph of [-22,-12,0]){
    const course=surface(),fx=createDrivingEffects(),s=state({gear:-1,speedMph,input:{throttle:0,brake:1}});
    for(let frame=0;frame<30;frame++){s.s+=speedMph*.44704/60;fx.update({p:course.groundAt(s.s,0),state:s,dt:1/60,course});}
    const {particles,marks}=arrays(fx);
    check(particles.geometry.attributes.particleAlpha.array.every(alpha=>alpha===0)&&marks.geometry.attributes.markAlpha.array.every(alpha=>alpha===0),'normal reverse acceleration cannot create false skid marks or tire smoke');
    check(Object.values(particles.geometry.attributes).every(attribute=>attribute.array.every(Number.isFinite)),'low-speed reverse and stopped effects remain finite');fx.dispose();
  }
  for(const direction of [-1,1]){
    const original=Math.random;Math.random=()=>.5;
    try{
      const course=surface({dirt:true}),fx=createDrivingEffects(),s=state({gear:direction<0?-1:0,speedMph:direction*22,offRoad:true,input:direction<0?{throttle:0,brake:1}:{throttle:1,brake:0}});
      fx.update({p:course.groundAt(s.s,0),state:s,dt:.06,course});
      const {particles,marks}=arrays(fx),a=particles.geometry.attributes,live=Array.from(a.particleAlpha.array,(_,i)=>i).filter(i=>a.particleAlpha.array[i]>0);
      check(live.length>0&&live.every(i=>(a.position.array[i*3+2]-(s.s-1.4))*direction<0),'dirt trails opposite actual forward or reverse travel');
      check(marks.geometry.attributes.markAlpha.array.some(alpha=>alpha>0),'reverse dirt tires can leave a grounded tread track');
      for(let frame=0;frame<60;frame++){s.s+=s.speedMph*.44704/60;fx.update({p:course.groundAt(s.s,0),state:s,dt:1/60,course});}
      check(Object.values(a).every(attribute=>attribute.array.every(Number.isFinite))&&marks.instanceMatrix.array.every(Number.isFinite),'moving reverse dirt particles and tracks remain finite');fx.dispose();
    }finally{Math.random=original;}
  }
}
console.log(`Driving effects: ${checks} terrain, connected tracks, smoke frame-rate, reverse, suppression, sprite-alpha, pause, reset and disposal checks passed.`);
