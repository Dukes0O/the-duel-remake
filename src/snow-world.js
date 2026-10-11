// Winter presentation reads authored surfaces; it never adds simulation state.
import * as THREE from 'three';
import {makeRng} from './rng.js';
import {winterRanges} from './race-surfaces.js';
import {COMBAT_TUNING} from './wasteland-tuning.js';
import {prepareVehicleGrounding} from './vehicle-grounding.js';
export const SNOW_LIMITS=Object.freeze({high:Object.freeze({flakes:240,marks:512}),
  performance:Object.freeze({flakes:72,marks:128})});
export const SNOW_KIT_IDS=Object.freeze(['snow-pine','snow-rock','snow-ground','plough-bank']);
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const rangeCache=new WeakMap();
function ranges(course){
  if(!rangeCache.has(course))rangeCache.set(course,winterRanges(course.script,course.def.snowWorld));
  return rangeCache.get(course);
}
export function snowWorldEnabled(course,flags){return !!course?.def.snowWorld&&flags?.enabled('snow-world')===true;}
export function winterWeight(course,s){
  const p=course.phase(s);
  for(const range of ranges(course))if(p>=range.from&&p<=range.to){
    const a=range.from===0?1:smooth((p-range.from)/12);
    const b=range.to===course.length?1:smooth((range.to-p)/12);
    return Math.min(a,b);
  }
  return 0;
}
const winterAt=(course,s)=>ranges(course).some(row=>course.phase(s)>=row.from&&course.phase(s)<=row.to);
export function snowPineIds(course){return new Set(course.features.trees.filter(tree=>winterAt(course,tree.s)).map(tree=>tree.id));}
export function snowRockFeatures(course){return new Set(course.features.rocks.filter(rock=>winterAt(course,rock.s)));}
const placementsCache=new WeakMap();
export function snowWorldPlacements(course){
  if(placementsCache.has(course))return placementsCache.get(course);
  if(!course.def.snowWorld)return [];
  const entries=[],rng=makeRng(course.seed^0x51a0a77);
  for(const tree of course.features.trees)if(winterAt(course,tree.s))entries.push({
    id:'snow-pine',s:tree.s,lateral:tree.off,heading:tree.heading-course.at(tree.s).heading,
    scale:tree.scale*.7,scenery:Object.freeze({kind:'tree',id:tree.id})});
  for(const rock of snowRockFeatures(course))entries.push({id:'snow-rock',s:rock.s,lateral:rock.off,
    heading:rock.angle,scale:Object.freeze([rock.scale[0]*2/4.4,rock.scale[1]*2/2.4,rock.scale[2]*2/3.5])});
  for(const range of ranges(course))for(let s=range.from+5;s<range.to-5;s+=18)for(const side of [-1,1])
    entries.push({id:'snow-ground',s,lateral:side*(course.roadHalfWidthAt(s)+4.5),heading:rng.range(-.08,.08),scale:1});
  for(const patch of course.features.surfacePatches.filter(row=>row.snowBank)){
    for(let s=patch.s0+3;s<patch.s1-3;s+=4.8)entries.push({id:'plough-bank',s,
      lateral:(patch.from+patch.to)/2,heading:Math.PI/2,scale:Object.freeze([.94,.8,.7]),physicalPatch:patch});
  }
  const result=Object.freeze(entries.map(Object.freeze));placementsCache.set(course,result);return result;
}
// A genuine attribute on every drawn terrain vertex supplies winter coverage.
export function applySnowTerrain(geometry,course){
  const position=geometry.attributes.position,weights=new Float32Array(position.count);
  for(let i=0;i<position.count;i++)weights[i]=winterWeight(course,course.nearest(position.getX(i),position.getZ(i)).s);
  geometry.setAttribute('winterWeight',new THREE.BufferAttribute(weights,1));return geometry;
}
export function winterTerrainMaterial(material){
  const previous=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=shader=>{
    previous.call(material,shader);
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      attribute float winterWeight;varying float vWinterWeight;varying vec3 vWinterPosition;`)
      .replace('#include <begin_vertex>',`#include <begin_vertex>
      vWinterWeight=winterWeight;vWinterPosition=(modelMatrix*vec4(transformed,1.0)).xyz;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying float vWinterWeight;varying vec3 vWinterPosition;`)
      .replace('#include <color_fragment>',`#include <color_fragment>
      float winterGrain=.96+.025*sin(vWinterPosition.x*29.0)*sin(vWinterPosition.z*31.0);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.85,.89,.93)*winterGrain,clamp(vWinterWeight,0.0,1.0));`);
  };
  material.customProgramCacheKey=()=>key()+'-winter-v1';material.needsUpdate=true;return material;
}
export function winterSurfaceMaterial(material,kind){
  const previous=material.onBeforeCompile;
  material.onBeforeCompile=shader=>{
    previous.call(material,shader);
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWinterRoad;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvWinterRoad=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWinterRoad;')
      .replace('#include <color_fragment>',`#include <color_fragment>
      float grain=.88+.12*sin(vWinterRoad.x*47.0)*sin(vWinterRoad.z*53.0);
      float scrape=smoothstep(.86,.99,sin(vWinterRoad.x*1.7+sin(vWinterRoad.z*.31)));
      diffuseColor.rgb*=grain*(1.0-scrape*${kind==='ice'?'.14':'.08'});`);
  };
  material.customProgramCacheKey=()=>`winter-road-${kind}-v1`;return material;
}
// Match ordinary pine knock/obliterate timing; approved GLBs keep ground pivots.
export function snowSceneryPose(tree,events,now){
  const event=events.find(row=>row.kind==='tree'&&row.id===tree.id),position=new THREE.Vector3(tree.x,tree.y,tree.z),
    rotation=new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP,tree.heading);
  let scale=tree.scale*.7;
  const length=event?Math.hypot(event.directionX,event.directionZ):0;
  if(event&&Number.isFinite(event.atTime)&&length>1e-6){
    const age=now-event.atTime,progress=clamp(age/.72),eased=smooth(progress);
    const fall=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(event.directionZ/length,0,-event.directionX/length),eased*1.38);
    rotation.premultiply(fall);
    if(event.outcome==='knock'){position.x+=event.directionX*COMBAT_TUNING.roadside.sceneryKnockDistance*eased;position.z+=event.directionZ*COMBAT_TUNING.roadside.sceneryKnockDistance*eased;}
    if(event.outcome==='obliterate'&&age>=COMBAT_TUNING.roadside.sceneryVisibleSeconds)scale=0;
  }
  return new THREE.Matrix4().compose(position,rotation,new THREE.Vector3(scale,scale,scale));
}
function addPonds(group,course){
  const ponds=course.def.snowWorld.ponds??[];
  if(!Array.isArray(ponds)||ponds.length>8)throw Error('Winter ponds need at most eight off-road ellipses.');
  for(const pond of ponds){
    const {s,lateral,radiusX:rx,radiusZ:rz}=pond;
    if(![s,lateral,rx,rz].every(Number.isFinite)||s<0||s>course.length||rx<=0||rz<=0||rx>40||rz>40||
      !ranges(course).some(range=>s-rz>=range.from&&s+rz<=range.to)||Math.abs(lateral)-Math.max(rx,rz)<course.roadHalfWidthAt(s)+2)throw Error('A frozen pond must stay in an authored winter range clear of the road.');
    const positions=[],indices=[],segments=48;
    const append=(along,off)=>{const p=course.groundAt(s+along,lateral+off);positions.push(p.x,p.y+.055,p.z);};append(0,0);
    for(let i=0;i<segments;i++)append(Math.sin(i/segments*Math.PI*2)*rz,Math.cos(i/segments*Math.PI*2)*rx);
    for(let i=0;i<segments;i++)indices.push(0,i+1,(i+1)%segments+1);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const material=winterSurfaceMaterial(new THREE.MeshStandardMaterial({color:0x9ab8c5,roughness:.16,metalness:.18,side:THREE.DoubleSide}), 'ice');
    const mesh=new THREE.Mesh(geometry,material);mesh.name='Frozen winter pond';mesh.receiveShadow=true;group.add(mesh);
  }
}
export function createSnowWorld(course,{kits,high=true}={}){
  const exposed=course.def.snowWorld.exposed??[];
  if(!Array.isArray(exposed)||exposed.length>16||exposed.some(row=>!row||
    !Number.isFinite(row.from)||!Number.isFinite(row.to)||row.to<=row.from||
    !ranges(course).some(range=>row.from>=range.from&&row.to<=range.to)))
    throw Error('Exposed ridges must lie within one authored winter range.');
  const group=new THREE.Group();group.name='Authored snow world';addPonds(group,course);
  const rng=makeRng(course.seed^0x5a0f1a),limits=SNOW_LIMITS.high,count=limits.flakes,
    position=new Float32Array(count*3),speed=new Float32Array(count),phase=new Float32Array(count);
  for(let i=0;i<count;i++){position[i*3]=rng.range(-17,17);position[i*3+1]=rng.range(-3,16);position[i*3+2]=rng.range(-18,18);speed[i]=rng.range(.7,1.8);phase[i]=rng.range(0,Math.PI*2);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(position,3).setUsage(THREE.DynamicDrawUsage));
  const flakes=new THREE.Points(geometry,new THREE.ShaderMaterial({transparent:true,depthWrite:false,
    uniforms:{strength:{value:.55}},vertexShader:`varying float vDepth;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vDepth=-p.z;gl_Position=projectionMatrix*p;gl_PointSize=clamp(12.0/max(1.0,-p.z),1.0,3.2);}`,
    fragmentShader:`uniform float strength;varying float vDepth;void main(){float a=(1.0-smoothstep(.1,.5,length(gl_PointCoord-.5)))*strength*smoothstep(0.0,2.0,vDepth);gl_FragColor=vec4(.88,.93,1.0,a);if(a<.01)discard;
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`}));flakes.frustumCulled=false;flakes.name='Camera-local snow and ridge gusts';group.add(flakes);
  const markCount=SNOW_LIMITS.high.marks,alpha=new Float32Array(markCount),life=new Float32Array(markCount),
    markGeometry=new THREE.PlaneGeometry(1,1);markGeometry.setAttribute('snowAlpha',new THREE.InstancedBufferAttribute(alpha,1).setUsage(THREE.DynamicDrawUsage));
  const markMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,
    vertexShader:`attribute float snowAlpha;varying float vAlpha;varying vec2 vUv;void main(){vAlpha=snowAlpha;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
    fragmentShader:`varying float vAlpha;varying vec2 vUv;void main(){float edge=smoothstep(0.,.15,vUv.x)*smoothstep(0.,.15,1.-vUv.x);float tread=.74+.26*sin(vUv.y*55.0);gl_FragColor=vec4(.37,.46,.53,vAlpha*edge*tread);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});markMaterial.forceSinglePass=true;
  const marks=new THREE.InstancedMesh(markGeometry,markMaterial,markCount);marks.frustumCulled=false;marks.name='Actual wheel snow tracks';group.add(marks);
  const zero=new THREE.Matrix4().makeScale(0,0,0);for(let i=0;i<markCount;i++)marks.setMatrixAt(i,zero);
  const trees=new Map(course.features.trees.map(tree=>[tree.id,tree])),entries=[];
  for(const [index,entry] of (kits?.placements??[]).entries())if(entry.id==='snow-pine'&&entry.scenery)entries.push({index,tree:trees.get(entry.scenery.id),key:null});
  const previous=new Map(),point=new THREE.Vector3(),along=new THREE.Vector3(),across=new THREE.Vector3(),normal=new THREE.Vector3(),basis=new THREE.Matrix4();
  let disposed=false,cursor=0,time=0,lastClock=null;
  const stats={flakes:high?SNOW_LIMITS.high.flakes:SNOW_LIMITS.performance.flakes,liveMarks:0};
  function update({state,camera,dt=0,high:quality=high,vehicles=[]}){
    if(disposed||!state)return;dt=Math.max(0,Math.min(.1,dt));time+=dt;
    const cap=quality?SNOW_LIMITS.high:SNOW_LIMITS.performance;stats.flakes=cap.flakes;geometry.setDrawRange(0,cap.flakes);
    const active=winterWeight(course,state.s),gust=exposed.some(row=>course.phase(state.s)>=row.from&&course.phase(state.s)<=row.to);
    flakes.visible=active>0;if(camera)flakes.position.copy(camera.position);
    flakes.material.uniforms.strength.value=active*(gust?.68:.48);
    for(let i=0;i<cap.flakes;i++){
      const n=i*3;position[n]+=dt*((gust?5:1.1)+Math.sin(time*.9+phase[i])*.5);
      position[n+1]-=dt*speed[i];position[n+2]+=dt*Math.sin(time*.4+phase[i])*.3;
      if(position[n]>17)position[n]=-17;if(position[n+1]<-3)position[n+1]=16;
    }geometry.attributes.position.needsUpdate=true;
    if(lastClock!==null&&state.stageTimeSec<lastClock){life.fill(0);alpha.fill(0);previous.clear();}
    lastClock=state.stageTimeSec;
    const breaks=new Map((state.status==='menu'?[]:state.brokenScenery??[]).filter(row=>row.kind==='tree').map(row=>[row.id,row]));
    for(const item of entries)if(item.tree){
      const event=breaks.get(item.tree.id),age=(state.stageTimeSec??0)-(event?.atTime??0);
      const key=event?`${clamp(age/.72)}:${event.outcome}:${age>=COMBAT_TUNING.roadside.sceneryVisibleSeconds}`:null;
      if(key!==item.key){kits.setPlacementPose(item.index,snowSceneryPose(item.tree,event?[event]:[],state.stageTimeSec??0));item.key=key;}
    }
    for(let i=0;i<markCount;i++){life[i]=Math.max(0,life[i]-dt);alpha[i]=i<cap.marks?Math.min(.42,life[i]*.13):0;}
    if(!state.paused&&state.status==='racing')for(const {state:actor,mesh} of vehicles.slice(0,8)){
      if(!actor||!mesh||Math.abs(actor.speedMph)<1||(actor.airHeight??0)>.12)continue;
      mesh.updateMatrixWorld(true);const wheels=prepareVehicleGrounding(mesh).wheels;
      const rear=Math.min(...wheels.map(wheel=>wheel.z)),contacts=wheels.filter(wheel=>wheel.z<rear+.2).slice(0,2).map(wheel=>mesh.localToWorld(new THREE.Vector3(wheel.x,wheel.contactY,wheel.z)));
      const old=previous.get(actor);previous.set(actor,contacts);
      if(!old||old.length!==contacts.length)continue;
      for(let j=0;j<contacts.length;j++){
        const a=old[j],b=contacts[j],length=a.distanceTo(b),near=course.nearest(b.x,b.z),kind=course.gripKindAt(near.s,near.lateral);
        if(length<.55){previous.set(actor,old);continue;}
        if(length>8||!(kind==='snow'||kind==='deep-snow'))continue;
        const i=cursor++%cap.marks;along.subVectors(b,a).normalize();across.set(along.z,0,-along.x).normalize();normal.crossVectors(across,along).normalize();
        basis.makeBasis(across,along,normal);point.addVectors(a,b).multiplyScalar(.5);point.y+=.02;
        const matrix=new THREE.Matrix4().compose(point,new THREE.Quaternion().setFromRotationMatrix(basis),new THREE.Vector3(.2,length,1));marks.setMatrixAt(i,matrix);life[i]=7.5;alpha[i]=.42;
      }
    }
    const liveActors=new Set(vehicles.map(row=>row.state));for(const actor of previous.keys())if(!liveActors.has(actor))previous.delete(actor);
    marks.count=cap.marks;stats.liveMarks=0;for(let i=0;i<cap.marks;i++)if(alpha[i]>0)stats.liveMarks++;marks.visible=stats.liveMarks>0;
    marks.instanceMatrix.needsUpdate=true;markGeometry.attributes.snowAlpha.needsUpdate=true;
  }
  function dispose(){if(disposed)return;disposed=true;previous.clear();group.traverse(mesh=>{mesh.geometry?.dispose();mesh.material?.dispose();});marks.dispose();group.removeFromParent();group.clear();}
  return {group,stats,update,dispose};
}
