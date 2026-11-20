// SKIN-WASTE round 2: the eight Wasteland finishes are drawn by code in the car's own paint material.
// Checks the hook, not the picture (tools/scenarios/skin-waste-look.mjs makes the pictures for Claude):
// one material per car, the shader joins the paint once and only for a drawn finish, changing finish never
// recompiles, the pattern space is the car's own metres, every table number reaches the shader, and the
// shader's insertion points exist in the physical material Three draws the paint with.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createUnlockedVehicle} from '../src/unlock-vehicles.js';
import {createKoenigseggVehicle} from '../src/koenigsegg-vehicle.js';
import {applyVehiclePaint} from '../src/vehicle-paint.js';
import {updateVehicleDamage} from '../src/vehicles.js';
import {PAINT_FINISH_LOOK,PAINT_FINISH_IDS,packPaintFinish,paintFinishUniforms,isPaintFinish} from '../src/paint-finish-look.js';
import {paintPresetsFor} from '../src/paint-presets.js';
import {createProfile} from '../src/progression.js';
import {CARS} from '../src/config.js';

let checks=0;
const ok=(value,message)=>{assert.ok(value,message);checks++;};
const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};

// The eight presets name their own drawn finish, and the table covers exactly those eight.
const profile={...createProfile(),unlockedCars:Object.keys(CARS),wasteland:{...createProfile().wasteland,version:1,discoveredGate:true,scrap:5000}};
const wasteland=paintPresetsFor(profile,'titan_monster',{wastelandTownEnabled:true}).filter(preset=>preset.currency==='scrap');
equal(wasteland.map(preset=>preset.id).sort(),[...PAINT_FINISH_IDS].sort(),'every Wasteland preset has a drawn finish and nothing else does');
for(const preset of wasteland){
  equal(preset.appearance.pattern,preset.id,`${preset.id}: the appearance names its drawn finish`);
  equal([preset.price,preset.currency],[250,'scrap'],`${preset.id}: price stays as merged`);
}
ok(paintPresetsFor(profile,'titan_monster',{wastelandTownEnabled:false}).every(preset=>!preset.appearance?.pattern),'no drawn finish without the wasteland-town switch');
ok(!isPaintFinish('ember')&&!isPaintFinish(undefined),'Ember and unknown names are not drawn finishes');

// The look table: every number finite, every colour a colour with roughness, metalness and coat in range.
for(const id of PAINT_FINISH_IDS){
  const look=PAINT_FINISH_LOOK[id],packed=packPaintFinish(id);
  ok(packed.mode>=1&&packed.mode<=8,`${id}: has a shader mode`);
  ok(packed.params.length===16&&packed.params.every(Number.isFinite),`${id}: every packed number is finite`);
  ok(packed.colors.length>=4&&packed.colors.length<=6,`${id}: four to six colours`);
  for(const [hex,...surface] of packed.colors)ok(Number.isSafeInteger(hex)&&hex>=0&&hex<=0xffffff&&surface.length===3&&surface.every(value=>value>=0&&value<=1),`${id}: colour and surface in range`);
  const named=Object.entries(look).filter(([key])=>key!=='colors').flatMap(([,value])=>Array.isArray(value)?value:[value]);
  ok(named.every(Number.isFinite),`${id}: every table number is finite`);
  for(const [key,value] of Object.entries(look))if(key!=='colors'&&!['stripeAngle'].includes(key)){
    const values=Array.isArray(value)?value:[value];
    ok(values.every(item=>packed.params.includes(item)),`${id}: table number ${key} reaches the shader`);
  }
}
const hazard=packPaintFinish('hazard-stripe');
ok(Math.abs(hazard.params[1]-Math.sin(Math.PI/4))<1e-9&&Math.abs(hazard.params[2]-Math.cos(Math.PI/4))<1e-9,'stripe angle reaches the shader as its sine and cosine');
equal(new Set(PAINT_FINISH_IDS.map(id=>packPaintFinish(id).mode)).size,8,'eight distinct modes');

// The insertion points exist in Three's physical material, so no finish silently fails to draw.
const physical=THREE.ShaderLib.physical;
for(const chunk of ['#include <common>','#include <color_fragment>','#include <roughnessmap_fragment>','#include <metalnessmap_fragment>','#include <normal_fragment_maps>','#include <lights_physical_fragment>'])
  ok(physical.fragmentShader.includes(chunk),`physical fragment has ${chunk}`);
ok(physical.vertexShader.includes('#include <begin_vertex>'),'physical vertex has begin_vertex');

const materials=vehicle=>{const set=new Set();vehicle.traverse(object=>{for(const material of [object.material].flat().filter(Boolean))set.add(material);});return set;};
const compile=material=>{
  const shader={uniforms:{},vertexShader:physical.vertexShader,fragmentShader:physical.fragmentShader};
  material.onBeforeCompile.call(material,shader,null);
  return shader;
};

// The three cars the card names: a Titan, the rally car and a supercar.
const cars=[['titan_monster',()=>createUnlockedVehicle({key:'titan_monster'})],['dusthawk_rally',()=>createUnlockedVehicle({key:'dusthawk_rally'})],
  ['koenigsegg_jesko',()=>createKoenigseggVehicle({key:'koenigsegg_jesko'})]];
for(const [label,make] of cars){
  const vehicle=make(),paint=vehicle.userData.paint,before=materials(vehicle);
  const compileBefore=paint.onBeforeCompile,keyBefore=paint.customProgramCacheKey();
  applyVehiclePaint(vehicle,{id:'copper',name:'Copper',color:0xb97046,metalness:.65,roughness:.24,clearcoat:1,clearcoatRoughness:.1});
  equal(paintFinishUniforms(paint),null,`${label}: a plain colour never adds the finish shader`);
  equal(paint.onBeforeCompile,compileBefore,`${label}: plain colour keeps the shader chain`);
  const rust=wasteland.find(preset=>preset.id==='rust-patina').appearance;
  const version=paint.version;
  equal(applyVehiclePaint(vehicle,rust),true,`${label}: Rust Patina applies`);
  const uniforms=paintFinishUniforms(paint);
  ok(uniforms&&uniforms.uFinishMode.value===1,`${label}: Rust Patina draws mode 1`);
  ok(paint.version>version,`${label}: the first drawn finish compiles once`);
  ok(paint.customProgramCacheKey()===`${keyBefore}:paint-finish-v1`,`${label}: own program key after the wear shader`);
  const chain=paint.onBeforeCompile,compiled=compile(paint);
  ok(compiled.fragmentShader.includes('uniform float uFinishMode')&&compiled.fragmentShader.includes('roughnessFactor=finishSurfOut.x'),`${label}: the finish reaches the fragment shader`);
  ok(compiled.fragmentShader.indexOf('finishSurfOut=surf')<compiled.fragmentShader.indexOf('float wear = clamp(vPanelWear'),`${label}: dents and scratches draw over the finish`);
  ok(compiled.vertexShader.includes('vFinishPos=position'),`${label}: the pattern uses the car's own positions, not UVs`);
  for(const name of Object.keys(uniforms))ok(compiled.uniforms[name]===uniforms[name],`${label}: ${name} is a live shader uniform`);
  // Pattern space: the painted body's box in car metres, and axles from the car's own wheels.
  const box=uniforms.uFinishBoxMin.value,size=uniforms.uFinishBoxSize.value,axles=uniforms.uFinishAxles.value,dims=vehicle.userData.size;
  ok(size.x>dims.width*.5&&size.x<=dims.width*1.05&&size.z>dims.length*.6&&size.z<=dims.length*1.05,`${label}: body box matches the car (${size.toArray().map(v=>v.toFixed(2))})`);
  ok(box.y>=-.05&&box.y+size.y<=dims.height*1.02,`${label}: body box sits within the car's height`);
  ok(axles.x>0&&axles.y<0&&axles.z>.3&&axles.w>.2,`${label}: front axle ahead, rear behind, real wheel radius`);
  // Every other finish is a change of numbers: no recompile, no new material.
  const compiledVersion=paint.version;
  for(const preset of wasteland){
    applyVehiclePaint(vehicle,preset.appearance);
    equal(uniforms.uFinishMode.value,packPaintFinish(preset.id).mode,`${label}: ${preset.id} sets its mode`);
    equal(uniforms.uFinishP.value.flatMap(vector=>vector.toArray()),packPaintFinish(preset.id).params,`${label}: ${preset.id} numbers reach the shader`);
    equal(uniforms.uFinishColor.value[0].getHex(),packPaintFinish(preset.id).colors[0][0],`${label}: ${preset.id} colours reach the shader`);
  }
  equal(paint.onBeforeCompile,chain,`${label}: changing finish keeps one shader chain`);
  ok(paint.version===compiledVersion,`${label}: changing finish never recompiles`);
  equal(materials(vehicle),before,`${label}: one finish is still one material, nothing allocated`);
  // Damage still darkens and roughens the base, and a reset brings the finish back.
  updateVehicleDamage(vehicle,5,true,0,{front:2,rear:2,left:1,right:1});
  ok(paint.roughness===.94,`${label}: a wreck still burns the finished paint`);
  updateVehicleDamage(vehicle,0,false);
  // Back to factory: the shader stays, switched off, and the factory numbers come back exactly.
  applyVehiclePaint(vehicle,null);updateVehicleDamage(vehicle,0,false);
  equal(uniforms.uFinishMode.value,0,`${label}: factory switches the drawn finish off`);
  ok(paint.version===compiledVersion,`${label}: factory does not recompile`);
}
console.log(`Paint finish look: ${checks} hook, table, space and no-recompile checks passed`);
