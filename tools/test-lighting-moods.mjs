import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { LIGHTING_MOODS, DEFAULT_SUN_OFFSET, normalizeLightingMood, resolveLightingSettings } from '../src/lighting-moods.js';
import { createAtmosphericSky, SUN_OFFSET } from '../src/atmosphere.js';
import { disposeTree } from '../src/world.js';

let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
const same=(actual,expected,message)=>{assert.equal(actual,expected,message);checks++;};
const clearFixtures={
  desert:{fog:0xdec1a0,top:'#466d86',horizon:'#f6bc82',ground:0x714226,sun:3.3,hemi:1.65,env:.85},
  alpine:{fog:0xb5c6ca,top:'#426e87',horizon:'#c4d4d8',ground:0x526153,sun:3.05,hemi:1.8,env:.8},
  coast:{fog:0xa6c8ce,top:'#326e92',horizon:'#bcd7d8',ground:0x647658,sun:3.6,hemi:1.7,env:.9},
  city:{fog:0x1a2839,top:'#0d1c32',horizon:'#3c4b61',ground:0x202a36,sun:.18,hemi:.65,env:.32},
  arena:{fog:0x8396a8,top:'#254361',horizon:'#d4b5a1',ground:0x705442,sun:2.1,hemi:1.6,env:.85},
};
equal(LIGHTING_MOODS,{clear:{label:'Clear'},golden:{label:'Golden hour'},overcast:{label:'Overcast'}},'public labels stay plain and stable');
check(Object.isFrozen(LIGHTING_MOODS)&&Object.values(LIGHTING_MOODS).every(Object.isFrozen),'catalog and entries cannot be mutated');
same(SUN_OFFSET,DEFAULT_SUN_OFFSET,'sky and renderer share one default sun offset');
equal(SUN_OFFSET,{x:-75,y:90,z:50},'existing clear sun direction is unchanged');
for(const invalid of [undefined,null,'','night','CLEAR','__proto__','constructor',1,{},[],Symbol('golden')]){
  same(normalizeLightingMood(invalid),'clear','invalid or inherited mood names fall back safely');
  same(resolveLightingSettings('coast',{mood:invalid}),resolveLightingSettings('coast'),'invalid lookup reuses the default preset');
}
for(const mood of Object.keys(LIGHTING_MOODS))same(normalizeLightingMood(mood),mood,'valid keys survive normalization');
same(resolveLightingSettings('unknown'),resolveLightingSettings('desert'),'unknown biome uses the original desert fallback');
same(resolveLightingSettings('coast',null),resolveLightingSettings('coast'),'null options use defaults');

for(const [theme,base] of Object.entries(clearFixtures)){
  const night=theme==='city',expected={...base,fogNear:night?160:260,fogFar:night?1250:1650,
    sunColor:night?0xa2bde6:theme==='alpine'?0xf1f0df:0xffddac,
    exposure:night?1.12:1.04,bloom:night?.32:.18,sunOffset:{x:-75,y:90,z:50},
    sunStrength:night?.03:1,cloudCover:1,cloudTint:[.88,.89,.86]};
  equal(resolveLightingSettings(theme),expected,`${theme}: every original clear value is preserved`);
  for(const mood of Object.keys(LIGHTING_MOODS))for(const tunnel of [false,true]){
    const actual=resolveLightingSettings(theme,{mood,tunnel});
    same(actual,resolveLightingSettings(theme,{mood,tunnel}),'per-frame lookup reuses the cached object');
    check(Object.isFrozen(actual)&&Object.isFrozen(actual.sunOffset)&&Object.isFrozen(actual.cloudTint),'all returned settings are deeply immutable');
    for(const [key,value] of Object.entries(actual)){
      if(typeof value==='number')check(Number.isFinite(value),`${theme}/${mood}: finite ${key}`);
    }
    check(actual.fogFar>actual.fogNear&&actual.fogNear>0,'fog interval stays positive and ordered');
    check(actual.cloudTint.every(v=>Number.isFinite(v)&&v>=0&&v<=1),'cloud tint is bounded linear RGB');
    check(Object.values(actual.sunOffset).every(Number.isFinite)&&actual.sunOffset.y>0,'sun direction remains above the horizon');
    check(actual.sun>=0&&actual.hemi>=0&&actual.env>=0&&actual.exposure>0,'nonnegative lighting strengths');
    for(const key of ['top','horizon'])check(/^#[0-9a-f]{6}$/.test(actual[key]),'valid sky palette');
    same(resolveLightingSettings(theme,{mood,night:true,tunnel}),resolveLightingSettings('city',{tunnel}),'night courses ignore the selected daytime mood');
    if(night)same(actual,resolveLightingSettings('city',{tunnel}),'city night is fixed without an explicit night option');
    if(tunnel){
      const outside=resolveLightingSettings(theme,{mood});
      equal(actual,{...outside,hemi:.32,sun:.15,env:.28,exposure:1.3,bloom:.32},'tunnels retain outside colours and the existing exposure override');
    }
  }
  if(night)continue;
  const clear=resolveLightingSettings(theme),golden=resolveLightingSettings(theme,{mood:'golden'}),overcast=resolveLightingSettings(theme,{mood:'overcast'});
  const elevation=Math.atan2(golden.sunOffset.y,Math.hypot(golden.sunOffset.x,golden.sunOffset.z))*180/Math.PI;
  check(elevation>17&&elevation<19,'golden hour uses a low, approximately 18-degree sun');
  check(golden.cloudTint[0]>golden.cloudTint[2]&&golden.cloudCover<clear.cloudCover,'golden clouds are warmer and less extensive');
  check(overcast.sun<clear.sun*.2&&overcast.hemi>clear.hemi,'overcast reduces direct lighting and increases diffuse fill');
  check(overcast.cloudCover>clear.cloudCover&&overcast.sunStrength<clear.sunStrength,'overcast has more cloud coverage and a softer visible sun');
}

const originalLoader=THREE.TextureLoader.prototype.load,loaded=[];
THREE.TextureLoader.prototype.load=function(url){const texture=new THREE.Texture();loaded.push({url,texture});return texture;};
try{
  const atmosphere=createAtmosphericSky(),other=createAtmosphericSky(),{sky}=atmosphere,uniforms=sky.material.uniforms;
  equal(loaded.map(x=>x.url),['/assets/textures/cloud-density.png','/assets/textures/cloud-density.png'],'existing original cloud image is the only loaded asset');
  check(sky.isMesh&&sky.children.length===0,'one existing sky mesh, no added cloud draws');
  same(sky.material.side,THREE.BackSide,'sky faces inward');
  check(!sky.material.depthWrite&&!sky.frustumCulled&&sky.userData.excludeAmbientOcclusion,'original sky render ownership is retained');
  const originalGeometry=new THREE.SphereGeometry(1900,32,20);
  equal(sky.geometry.index.array,originalGeometry.index.array,'same sky triangles');
  for(const [key,value] of Object.entries(originalGeometry.attributes))equal(sky.geometry.attributes[key].array,value.array,`same sky ${key} vertices`);
  originalGeometry.dispose();
  equal(uniforms.sunDir.value.toArray(),new THREE.Vector3(-75,90,50).normalize().toArray(),'initial sky sun direction is unchanged');
  same(uniforms.cloudCover.value,1,'default coverage multiplier is neutral');
  equal(uniforms.cloudTint.value.toArray(),[.88,.89,.86],'default cloud tint is the original shader linear colour');
  equal(uniforms.top.value.toArray(),new THREE.Color('#466d86').toArray(),'default upper-sky colour unchanged');
  same(uniforms.cloudDensity.value.colorSpace,THREE.NoColorSpace,'density map has no albedo colour conversion');
  same(uniforms.cloudDensity.value.wrapS,THREE.RepeatWrapping,'cloud density repeats');
  same(uniforms.cloudDensity.value.wrapT,THREE.RepeatWrapping,'cloud density repeats in both dimensions');
  same(uniforms.cloudDensity.value.anisotropy,4,'cloud filtering budget unchanged');
  check(sky.material.fragmentShader.includes('coverage=clamp(coverage*cloudCover,0.0,1.0);'),'coverage is bounded for transitions and overcast');
  check(sky.material.fragmentShader.includes('mix(mix(top,horizon,.38),cloudTint,day)'),'cloud colour uses the new tint uniform');
  check(sky.material.fragmentShader.includes('#include <tonemapping_fragment>')&&sky.material.fragmentShader.includes('#include <colorspace_fragment>'),'existing display transforms remain');

  // The old shader's coverage never reaches one. With the default multiplier,
  // the new clamp is exactly neutral, including at texture extremes.
  const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
  for(let d=0;d<=40;d++)for(let w=0;w<=40;w++){
    let legacy=smooth(.08,.52,d/40)*.83;legacy+=smooth(.4,.86,w/40)*.12*(1-legacy);
    same(Math.max(0,Math.min(1,legacy*uniforms.cloudCover.value)),legacy,'clear coverage is bit-for-bit unchanged across density samples');
  }
  const geometry=sky.geometry,material=sky.material,uniformObjects=Object.values(uniforms),sunDirection=uniforms.sunDir.value;
  const currentOffset=new THREE.Vector3(...Object.values(DEFAULT_SUN_OFFSET));
  for(let frame=0;frame<240;frame++){
    const settings=resolveLightingSettings('coast',{mood:frame<80?'golden':frame<160?'overcast':'clear'});
    currentOffset.lerp(new THREE.Vector3(settings.sunOffset.x,settings.sunOffset.y,settings.sunOffset.z),.1);
    uniforms.sunDir.value.copy(currentOffset).normalize();
    uniforms.cloudCover.value=THREE.MathUtils.lerp(uniforms.cloudCover.value,settings.cloudCover,.1);
    uniforms.cloudTint.value.lerp(new THREE.Color(...settings.cloudTint),.1);
    atmosphere.update(frame/60);
    check(Math.abs(uniforms.sunDir.value.length()-1)<1e-14,'interpolated visible sun stays normalized');
  }
  same(sky.geometry,geometry,'mood changes retain sky geometry');same(sky.material,material,'mood changes retain the shader material');
  Object.values(uniforms).forEach((value,i)=>same(value,uniformObjects[i],'uniform containers are reused'));
  same(uniforms.sunDir.value,sunDirection,'direction vector is reused');
  same(other.sky.material.uniforms.cloudTime.value,0,'one sky clock cannot change another instance');
  equal(other.sky.material.uniforms.cloudTint.value.toArray(),[.88,.89,.86],'one sky colour cannot change another instance');

  let textureDisposals=0,geometryDisposals=0,materialDisposals=0,otherDisposals=0;
  loaded[0].texture.addEventListener('dispose',()=>textureDisposals++);
  loaded[1].texture.addEventListener('dispose',()=>otherDisposals++);
  geometry.addEventListener('dispose',()=>geometryDisposals++);material.addEventListener('dispose',()=>materialDisposals++);
  atmosphere.dispose();atmosphere.dispose();
  same(textureDisposals,1,'atmosphere owns and disposes its density texture once');
  same(otherDisposals,0,'disposing one sky leaves the other sky usable');
  same(geometryDisposals,0,'renderer keeps responsibility for mesh geometry');
  same(materialDisposals,0,'renderer keeps responsibility for its material');
  const lastTime=uniforms.cloudTime.value;atmosphere.update(100);same(uniforms.cloudTime.value,lastTime,'disposed sky no longer updates');
  disposeTree(sky);same(geometryDisposals,1,'scene cleanup disposes sky geometry once');same(materialDisposals,1,'scene cleanup disposes material once');
  same(textureDisposals,1,'scene cleanup does not dispose the shader-owned texture twice');
  other.dispose();disposeTree(other.sky);same(otherDisposals,1,'the second sky cleans up independently');
}finally{THREE.TextureLoader.prototype.load=originalLoader;}

const source=await readFile(new URL('../src/lighting-moods.js',import.meta.url),'utf8');
check(!/^\s*import\b/m.test(source),'pure mood catalog has no rendering or browser dependencies');
console.log(`Lighting moods: ${checks} checks passed; exact Clear/night defaults, immutable presets, gentle daytime moods, fixed tunnel overrides and unchanged sky geometry/resource ownership.`);
