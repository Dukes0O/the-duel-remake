// Winter presentation reads authored surfaces; it never adds simulation state.
import { computeNormalsFast } from './fast-normals.js';
import * as THREE from 'three';
import {makeRng} from './rng.js';
import {winterRanges} from './race-surfaces.js';
import {COMBAT_TUNING} from './wasteland-tuning.js';
import {prepareVehicleGrounding} from './vehicle-grounding.js';
import {renderedGroundHeight} from './rendered-ground.js';
export const SNOW_LIMITS=Object.freeze({high:Object.freeze({flakes:240,marks:512}),
  performance:Object.freeze({flakes:72,marks:128})});
export const SNOW_KIT_IDS=Object.freeze(['snow-pine','snow-rock','snow-ground','plough-bank']);
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const worlds=new WeakMap();
export function bindSnowWorld(world,owner){worlds.set(world,owner);world.add(owner.group);}
export function snowWorldOf(world){return worlds.get(world)??null;}
const rangeCache=new WeakMap();
function ranges(course){
  if(!rangeCache.has(course))rangeCache.set(course,winterRanges(course.script,course.def.snowWorld));
  return rangeCache.get(course);
}
// Optional transform consumed by the existing lighting owner only for Snow.
export function winterLightingSettings(base,{course,distance=0}={}) {
  const weight=course?.def.snowWorld?.mixed?winterWeight(course,distance):1;
  if(weight===0)return base;
  const night=Math.max(0,Math.min(1,base.nightAmount ?? (base.sun<.3?1:0)));
  const day=1-night;
  const colour=(original,winter)=>{
    const value=Array.isArray(original)?new THREE.Color().setRGB(...original):new THREE.Color(original);
    return value.lerp(new THREE.Color(winter),day).toArray();
  };
  const winter={...base,exposure:base.exposure*.82,bloom:base.bloom*.3,env:base.env*.82,
    top:colour(base.top,0x83a6bf),horizon:colour(base.horizon,0xcfdae5),
    fog:colour(base.fog,0xb9cbdc),ground:colour(base.ground,0x7896b0),
    sunColor:colour(base.sunColor,0xe3edff),
    cloudTint:base.cloudTint.map((value,i)=>value*night+[.78,.84,.9][i]*day)};
  // A circuit's authored winter look retains the accepted full-winter defaults.
  const changed=base.winter?{...winter,...base.winter}:winter;
  if(course?.def.snowWorld?.nightExposure!==undefined){
    const exposure=course.def.snowWorld.nightExposure;
    if(!Number.isFinite(exposure)||exposure<=0)throw Error('Authored night snow exposure must be positive.');
    changed.exposure+=(exposure-changed.exposure)*night;
  }
  if(weight===1)return changed;
  for(const key of ['exposure','bloom','env'])changed[key]=base[key]+(changed[key]-base[key])*weight;
  for(const key of ['top','horizon','fog','ground','sunColor']){
    const original=Array.isArray(base[key])?new THREE.Color().setRGB(...base[key]):new THREE.Color(base[key]);
    changed[key]=original.lerp(new THREE.Color().setRGB(...changed[key]),weight).toArray();
  }
  changed.cloudTint=base.cloudTint.map((value,index)=>value+(changed.cloudTint[index]-value)*weight);
  return changed;
}

function shadeSnowKits(kits,course) {
  const materials=new Set();
  kits?.group?.traverse(node=>{
    if(!SNOW_KIT_IDS.includes(node.userData.trackKitId))return;
    for(const material of [].concat(node.material??[])){
      if(materials.has(material))continue;
      if(node.userData.trackKitId==='snow-rock'&&course?.def.snowWorld?.rockTint&&material.name.includes('worn stone')){
        materials.add(material);material.color.set(course.def.snowWorld.rockTint);material.roughness=.96;continue;
      }
      if(!material.name.includes('worn snow'))continue;
      materials.add(material);
      // These decoded materials belong solely to this real kit owner.
      material.color.setRGB(.78,.8,.82);material.roughness=.94;
      material.userData.snowAlbedo=.8;material.needsUpdate=true;
    }
  });
}
// A course whose snowWorld says `always: true` is a winter course whenever it is on the course list;
// any other course with snowWorld needs the shared snow-world switch.
export function snowWorldEnabled(course,flags){return !!course?.def.snowWorld&&(course.def.snowWorld.always===true||flags?.enabled('snow-world')===true);}
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
export function snowPineIds(course){return new Set(course.def.snowWorld?course.features.trees.filter(tree=>!course.def.snowWorld.mixed||winterAt(course,tree.s)).map(tree=>tree.id):[]);}
export function snowRockFeatures(course){return new Set(course.def.snowWorld?course.features.rocks.filter(rock=>!course.def.snowWorld.mixed||winterAt(course,rock.s)):[]);}
const placementsCache=new WeakMap();
export function snowWorldPlacements(course){
  if(placementsCache.has(course))return placementsCache.get(course);
  if(!course.def.snowWorld)return [];
  const entries=[],rng=makeRng(course.seed^0x51a0a77);
  for(const tree of course.features.trees)if(!course.def.snowWorld.mixed||winterAt(course,tree.s))entries.push({
    id:'snow-pine',s:tree.s,lateral:tree.off,heading:tree.heading-course.at(tree.s).heading,
    scale:tree.scale*.7,scenery:Object.freeze({kind:'tree',id:tree.id})});
  const clusters=course.def.snowWorld.pineClusters??[];
  if(!Array.isArray(clusters)||clusters.length>16)throw Error('Winter pine clusters need at most sixteen centres.');
  const clusterRng=makeRng(course.seed^0x6a091ac);
  for(const cluster of clusters){
    const {s,lateral,count=5,radius=5}=cluster;
    if(![s,lateral,radius].every(Number.isFinite)||s<0||s>course.length||radius<=0||radius>12||
        !Number.isInteger(count)||count<2||count>8||!winterAt(course,s))
      throw Error('A winter pine cluster needs a bounded authored winter centre.');
    for(let i=0;i<count;i++){
      const angle=clusterRng.range(0,Math.PI*2),distance=clusterRng.range(.7,radius);
      const along=s+Math.sin(angle)*distance,off=lateral+Math.cos(angle)*distance;
      const scale=clusterRng.range(.8,1.15),heading=clusterRng.range(-Math.PI,Math.PI);
      if(along<0||along>course.length||!winterAt(course,along))continue;
      const point=course.groundAt(along,off),near=course.nearest(point.x,point.z);
      if(near.distance<course.roadHalfWidthAt(near.s)+5)continue;
      entries.push({id:'snow-pine',s:along,lateral:off,heading,scale});
    }
  }
  for(const rock of snowRockFeatures(course))entries.push({id:'snow-rock',s:rock.s,lateral:rock.off,
    heading:rock.angle,scale:Object.freeze([rock.scale[0]*2/4.4,rock.scale[1]*2/2.4,rock.scale[2]*2/3.5])});
  for(const range of ranges(course))for(let s=range.from+5;s<range.to-5;s+=18)for(const side of [-1,1])
    entries.push({id:'snow-ground',s,lateral:side*(course.roadHalfWidthAt(s)+4.5),heading:rng.range(-.08,.08),scale:1});
  // `softBanks` draws the plough banks as continuous rounded heaps (softBankGeometry) instead of kit pieces.
  if(!course.def.snowWorld.softBanks)for(const patch of course.features.surfacePatches.filter(row=>row.snowBank)){
    for(let s=patch.s0+3;s<patch.s1-3;s+=4.8)entries.push({id:'plough-bank',s,
      lateral:(patch.from+patch.to)/2,heading:Math.PI/2,scale:Object.freeze([.94,1.3,.7]),physicalPatch:patch});
  }
  const result=Object.freeze(entries.map(Object.freeze));placementsCache.set(course,result);return result;
}
// A genuine attribute on every drawn terrain vertex supplies winter coverage.
export function applySnowTerrain(geometry,course){
  const position=geometry.attributes.position,weights=new Float32Array(position.count);
  weights.fill(course.def.snowWorld?1:0);
  if(course.def.snowWorld?.mixed)for(let index=0;index<position.count;index++){
    weights[index]=winterWeight(course,course.nearestS(position.getX(index),position.getZ(index)));
  }
  geometry.setAttribute('winterWeight',new THREE.BufferAttribute(weights,1));return geometry;
}
// `drifts` (a course's snowWorld.drifts) adds broad soft drifts and fine wind ripples in slightly bluer
// snow, so open ground has form instead of one flat white.
export function winterTerrainMaterial(material,drifts=false,variation=false,options={}){
  const strength=options?.variationStrength===undefined ? .20 : options.variationStrength,
    scale=options?.variationScale;
  if(variation){
    if(!Number.isFinite(strength)||strength<0||strength>.88)
      throw Error('Winter variation strength needs a finite half-range from 0 to 0.88.');
    if(scale!==undefined&&(!Number.isFinite(scale)||scale<200||scale>800))
      throw Error('Winter variation scale needs a finite wavelength from 200 to 800 metres.');
  }
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
      float winterGrain=.975+.0125*sin(vWinterPosition.x*29.0)*sin(vWinterPosition.z*31.0);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.78,.8,.82)*winterGrain,clamp(vWinterWeight,0.0,1.0));${drifts?`
      float drift=.5+.5*sin(vWinterPosition.x*.043+sin(vWinterPosition.z*.029)*2.1)*sin(vWinterPosition.z*.051+sin(vWinterPosition.x*.025)*1.8);
      float ripple=smoothstep(.55,.95,sin(vWinterPosition.x*.9+sin(vWinterPosition.z*.37)*3.0)*sin(vWinterPosition.z*.6+vWinterPosition.x*.2));
      vec3 cold=vec3(.84,.9,1.0);
      diffuseColor.rgb*=mix(vec3(1.0),mix(cold,vec3(1.0),drift),clamp(vWinterWeight,0.0,1.0))*(1.0-.05*ripple*clamp(vWinterWeight,0.0,1.0));`:''}${variation?`
      float blown=.5+.5*sin(vWinterPosition.x*.071+vWinterPosition.z*.037)*cos(vWinterPosition.z*.061);
      diffuseColor.rgb*=mix(.68,1.08,blown)*clamp(vWinterWeight,0.0,1.0)+(1.0-clamp(vWinterWeight,0.0,1.0));`:''}`);
  };
  material.customProgramCacheKey=()=>key()+(drifts?'-winter-v1-drifts':'-winter-v1')+(variation?'-authored-variation':'');
  // Keep the original callback text and native Three cache path for defaults.
  if(variation&&(strength!==.20||scale!==undefined)){
    const compile=material.onBeforeCompile,legacyKey=material.customProgramCacheKey;
    material.onBeforeCompile=shader=>{
      compile.call(material,shader);
      if(scale!==undefined)shader.fragmentShader=shader.fragmentShader.replace(
        'float blown=.5+.5*sin(vWinterPosition.x*.071+vWinterPosition.z*.037)*cos(vWinterPosition.z*.061);',
        `float blown=.5+.5*sin(dot(vWinterPosition.xz,normalize(vec2(.071,.037)))*${2*Math.PI/scale})*cos(vWinterPosition.z*${2*Math.PI/scale});`);
      if(strength!==.20){
        const number=value=>Number.isInteger(value)?value+'.0':String(value);
        shader.fragmentShader=shader.fragmentShader.replace('mix(.68,1.08,blown)',
          `mix(${number(.88-strength)},${number(.88+strength)},blown)`);
      }
    };
    material.customProgramCacheKey=()=>legacyKey()+`-wind-strength:${strength}-scale:${scale??'legacy'}`;
  }
  material.needsUpdate=true;return material;
}
export function winterSurfaceMaterial(material,kind){
  if(kind==='ice'){material.color.setRGB(.12,.19,.24);material.roughness=.065;material.metalness=.18;material.envMapIntensity=.9;material.emissive?.set(0);}
  else if(kind==='snow'){material.color.setRGB(.34,.38,.42);material.roughness=.94;}
  else if(kind==='deep-snow')material.color.setRGB(.78,.8,.82);
  const previous=material.onBeforeCompile;
  material.onBeforeCompile=shader=>{
    previous.call(material,shader);
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWinterRoad;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvWinterRoad=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWinterRoad;')
      .replace('#include <color_fragment>',`#include <color_fragment>
      float grain=.95+.04*sin(vWinterRoad.x*47.0)*sin(vWinterRoad.z*53.0);
      float scrape=smoothstep(.86,.99,sin(vWinterRoad.x*1.7+sin(vWinterRoad.z*.31)));
      diffuseColor.rgb*=grain*(1.0-scrape*${kind==='ice'?'.035':'.13'});`);
  };
  material.customProgramCacheKey=()=>`winter-road-${kind}-v1`;return material;
}
// Match ordinary pine knock/obliterate timing; approved GLBs keep ground pivots.
export function snowSceneryPose(tree,events,now,upright=null){
  const event=events.find(row=>row.kind==='tree'&&row.id===tree.id);
  if(!event&&upright)return upright.clone();
  const position=new THREE.Vector3(tree.x,tree.y,tree.z),
    rotation=new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP,tree.heading),
    scale=new THREE.Vector3().setScalar(tree.scale*.7);
  if(upright)upright.decompose(position,rotation,scale);
  const length=event?Math.hypot(event.directionX,event.directionZ):0;
  if(event&&Number.isFinite(event.atTime)&&length>1e-6){
    const age=now-event.atTime,progress=clamp(age/.72),eased=smooth(progress);
    const fall=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(event.directionZ/length,0,-event.directionX/length),eased*1.38);
    rotation.premultiply(fall);
    if(event.outcome==='knock'){position.x+=event.directionX*COMBAT_TUNING.roadside.sceneryKnockDistance*eased;position.z+=event.directionZ*COMBAT_TUNING.roadside.sceneryKnockDistance*eased;}
    if(event.outcome==='obliterate'&&age>=COMBAT_TUNING.roadside.sceneryVisibleSeconds)scale.setScalar(0);
  }
  return new THREE.Matrix4().compose(position,rotation,scale);
}
// Ploughed snow along both sides of the road as one continuous, rounded heap: a smooth top, steeper toward the
// road and slightly dirty grey there, white on top and beyond. It follows the road edge and the ground, rises
// and falls a little along its length and tapers where a winter range begins and ends. Drawing only: the
// physical deep-snow band (winterBankPatches) lies inside it.
export function softBankGeometry(course){
  const positions=[],colours=[],indices=[],columns=9,step=1.5;
  const grey=new THREE.Color(.5,.54,.6),white=new THREE.Color(.95,.97,1),mix=new THREE.Color();
  const heaps=course.def.snowWorld?.bankHeaps;
  const spans=heaps?ranges(course).flatMap(range=>{
    const rows=[];for(let s=range.from;s<range.to;s+=28)rows.push({from:s,to:Math.min(range.to,s+17)});return rows;
  }):ranges(course);
  for(const range of spans)for(const side of [-1,1]){
    const first=positions.length/3,count=Math.max(2,Math.ceil((range.to-range.from)/step));
    for(let i=0;i<=count;i++){
      const s=range.from+(range.to-range.from)*i/count,edge=course.roadHalfWidthAt(s)+.1;
      const taper=smooth((s-range.from)/(heaps?3:24))*smooth((range.to-s)/(heaps?3:24));
      const height=taper*(.55+.4*(.5+.5*Math.sin(s*.09+side))+.18*Math.sin(s*.31+side*2))*(heaps?.35:1),width=(2.7+.8*Math.sin(s*.05+side*.7))*(heaps?.7:1),
        speckle=.04*Math.sin(s*1.9)*Math.sin(s*.77+side);
      for(let k=0;k<columns;k++){
        const t=k/(columns-1),off=side*(edge+width*t),ground=course.groundAt(s,off),point=course.worldAt(s,off);
        const bump=k===0||k===columns-1?-.2:Math.pow(Math.sin(Math.PI*Math.pow(t,1.3)),.8);
        positions.push(point.x,ground.y+height*bump,point.z);
        mix.copy(grey).lerp(white,smooth(t/.7)).multiplyScalar(1+speckle);
        colours.push(mix.r,mix.g,mix.b);
      }
    }
    for(let i=0;i<count;i++)for(let k=0;k<columns-1;k++){
      const a=first+i*columns+k,b=a+1,c=a+columns,d=c+1;
      if(side>0)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));
  geometry.setIndex(indices);computeNormalsFast(geometry);geometry.computeBoundingSphere();
  return geometry;
}
function addSoftBanks(group,course){
  const mesh=new THREE.Mesh(softBankGeometry(course),new THREE.MeshStandardMaterial({name:'Ploughed snow heaps',vertexColors:true,roughness:.96,side:THREE.DoubleSide}));
  mesh.name='Ploughed snow heaps';mesh.receiveShadow=true;group.add(mesh);
}
function addSnowPoles(group,course){
  if(course.def.snowWorld.snowPoles!==true)return [];
  const poses=[];
  for(const range of ranges(course))for(let s=Math.ceil(range.from/50)*50;s<range.to;s+=50)for(const side of [-1,1]){
    const off=side*(course.roadHalfWidthAt(s)+1.0),ground=course.groundAt(s,off);
    const y=renderedGroundHeight(course,{...ground,s,off},{requireSurface:true});
    if(!Number.isFinite(y))throw Error('Snow poles require actual rendered ground.');
    poses.push({s,off,x:ground.x,y,z:ground.z});
  }
  const stem=new THREE.InstancedMesh(new THREE.CylinderGeometry(.045,.055,1.25,6),
    new THREE.MeshStandardMaterial({color:0xc7c2b2,roughness:.9}),poses.length);
  const tip=new THREE.InstancedMesh(new THREE.CylinderGeometry(.065,.065,.35,6),
    new THREE.MeshStandardMaterial({color:0xf36c18,emissive:0xf36c18,emissiveIntensity:.6,roughness:.85}),poses.length);
  const matrix=new THREE.Matrix4();
  for(const [i,p] of poses.entries()){
    stem.setMatrixAt(i,matrix.makeTranslation(p.x,p.y+.625,p.z));
    tip.setMatrixAt(i,matrix.makeTranslation(p.x,p.y+1.425,p.z));
  }
  stem.name='Grounded 50 m snow poles';tip.name='Orange snow pole tips';
  stem.userData.groundPoses=poses;tip.userData.groundPoses=poses;
  stem.computeBoundingSphere();tip.computeBoundingSphere();group.add(stem,tip);return [stem,tip];
}
function addPonds(group,course){
  const ponds=course.def.snowWorld.ponds??[];
  if(!Array.isArray(ponds)||ponds.length>8)throw Error('Winter ponds need at most eight off-road ellipses.');
  const rimRng=makeRng(course.seed^0x5a0a11);
  for(const pond of ponds){
    const {s,lateral,radiusX:rx,radiusZ:rz}=pond;
    if(![s,lateral,rx,rz].every(Number.isFinite)||s<0||s>course.length||rx<=0||rz<=0||rx>40||rz>40||
      !ranges(course).some(range=>s-rz>=range.from&&s+rz<=range.to)||Math.abs(lateral)-Math.max(rx,rz)<course.roadHalfWidthAt(s)+2)throw Error('A frozen pond must stay in an authored winter range clear of the road.');
    const positions=[],indices=[],segments=48;
    const append=(along,off)=>{
      const point={...course.groundAt(s+along,lateral+off),s:s+along,off:lateral+off};
      const height=renderedGroundHeight(course,point,{requireSurface:true});
      if(!Number.isFinite(height))throw Error('A frozen pond vertex needs actual rendered terrain.');
      positions.push(point.x,height+.055,point.z);
    };append(0,0);
    for(let i=0;i<segments;i++)append(Math.sin(i/segments*Math.PI*2)*rz,Math.cos(i/segments*Math.PI*2)*rx);
    for(let i=0;i<segments;i++)indices.push(0,i+1,(i+1)%segments+1);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const material=winterSurfaceMaterial(new THREE.MeshPhysicalMaterial({color:0x9ab8c5,
      clearcoat:.55,clearcoatRoughness:.18,ior:1.31,side:THREE.DoubleSide}), 'ice');
    material.metalness=.08;material.envMapIntensity=1.1;
    const mesh=new THREE.Mesh(geometry,material);mesh.name='Frozen winter pond';mesh.receiveShadow=true;group.add(mesh);
    const rimPositions=[],rimIndices=[],lift=.16;
    for(let i=0;i<segments;i++){
      const angle=i/segments*Math.PI*2,sine=Math.sin(angle),cosine=Math.cos(angle),width=rimRng.range(.65,1.1);
      for(const [along,off] of [[sine*rz*.97,cosine*rx*.97],[sine*(rz+width),cosine*(rx+width)]]){
        const point={...course.groundAt(s+along,lateral+off),s:s+along,off:lateral+off},
          height=renderedGroundHeight(course,point,{requireSurface:true});
        if(!Number.isFinite(height))throw Error('A pond snow rim needs actual rendered terrain.');
        rimPositions.push(point.x,height+lift,point.z);
      }
      const a=i*2,b=((i+1)%segments)*2;rimIndices.push(a,a+1,b,a+1,b+1,b);
    }
    const rimGeometry=new THREE.BufferGeometry();rimGeometry.setAttribute('position',new THREE.Float32BufferAttribute(rimPositions,3));
    rimGeometry.setIndex(rimIndices);rimGeometry.computeVertexNormals();
    const rim=new THREE.Mesh(rimGeometry,new THREE.MeshStandardMaterial({color:new THREE.Color().setRGB(.78,.8,.82),roughness:.98,side:THREE.DoubleSide}));
    rim.name='Anchored pond snow rim';rim.userData.groundLift=lift;rim.receiveShadow=true;rim.castShadow=true;group.add(rim);
  }
}
export function createSnowWorld(course,{kits,high=true}={}){
  const exposed=course.def.snowWorld.exposed??[];
  if(!Array.isArray(exposed)||exposed.length>16||exposed.some(row=>!row||
    !Number.isFinite(row.from)||!Number.isFinite(row.to)||row.to<=row.from||
    !ranges(course).some(range=>row.from>=range.from&&row.to<=range.to)))
    throw Error('Exposed ridges must lie within one authored winter range.');
  const group=new THREE.Group();group.name='Authored snow world';addPonds(group,course);if(course.def.snowWorld.softBanks)addSoftBanks(group,course);shadeSnowKits(kits,course);const poles=addSnowPoles(group,course);
  const rng=makeRng(course.seed^0x5a0f1a),limits=SNOW_LIMITS.high,count=limits.flakes,
    position=new Float32Array(count*3),speed=new Float32Array(count),phase=new Float32Array(count);
  for(let i=0;i<count;i++){position[i*3]=rng.range(-17,17);position[i*3+1]=rng.range(-3,16);position[i*3+2]=rng.range(-18,18);speed[i]=rng.range(.7,1.8);phase[i]=rng.range(0,Math.PI*2);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(position,3).setUsage(THREE.DynamicDrawUsage));
  const flakes=new THREE.Points(geometry,new THREE.ShaderMaterial({transparent:true,depthWrite:false,
    uniforms:{strength:{value:.55}},vertexShader:`varying float vDepth;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vDepth=-p.z;gl_Position=projectionMatrix*p;gl_PointSize=clamp(8.0/max(1.0,-p.z),1.0,2.0);}`,
    fragmentShader:`uniform float strength;varying float vDepth;void main(){float a=(1.0-smoothstep(.1,.5,length(gl_PointCoord-.5)))*strength*smoothstep(0.0,2.0,vDepth);gl_FragColor=vec4(.88,.93,1.0,a*.55);if(a<.01)discard;
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
  for(const [index,entry] of (kits?.placements??[]).entries())if(entry.id==='snow-pine'&&entry.scenery)entries.push({index,tree:trees.get(entry.scenery.id),upright:kits.getPlacementPose(index),key:null});
  const previous=new Map(),point=new THREE.Vector3(),along=new THREE.Vector3(),across=new THREE.Vector3(),normal=new THREE.Vector3(),basis=new THREE.Matrix4();
  let disposed=false,cursor=0,time=0,lastClock=null;
  const stats={flakes:high?SNOW_LIMITS.high.flakes:SNOW_LIMITS.performance.flakes,liveMarks:0};
  function update({state,camera,dt=0,high:quality=high,vehicles=[]}){
    if(disposed||!state)return;dt=Math.max(0,Math.min(.1,dt));time+=dt;
    const cap=quality?SNOW_LIMITS.high:SNOW_LIMITS.performance;stats.flakes=cap.flakes;geometry.setDrawRange(0,cap.flakes);
    const active=course.def.snowWorld.mixed?winterWeight(course,state.s):1,gust=exposed.some(row=>course.phase(state.s)>=row.from&&course.phase(state.s)<=row.to);
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
      if(key!==item.key){kits.setPlacementPose(item.index,snowSceneryPose(item.tree,event?[event]:[],state.stageTimeSec??0,item.upright));item.key=key;}
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
  function dispose(){if(disposed)return;disposed=true;previous.clear();group.traverse(mesh=>{mesh.geometry?.dispose();mesh.material?.dispose();});marks.dispose();for(const mesh of poles)mesh.dispose();group.removeFromParent();group.clear();}
  return {group,stats,update,dispose};
}
