import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {SMAAPass} from 'three/addons/postprocessing/SMAAPass.js';
import {createAmbientShading} from '../src/ambient-shading.js';
import {compileWarmupPostprocessing,compileWarmupPipeline,compileWarmupScene} from '../src/render-warmup.js';

let checks=0;
const equal=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const check=(value,label)=>{assert.ok(value,label);checks++;};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const oldImage=globalThis.Image;
globalThis.Image=class{set src(value){this._src=value;}};
function fixture(high=true){
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());mesh.visible=false;scene.add(mesh);
  const ao=createAmbientShading(scene,camera),bloom=new UnrealBloomPass(new THREE.Vector2(800,600),.2,.55,1.9),output=new OutputPass(),smaa=new SMAAPass(800,600);
  ao.enabled=smaa.enabled=high;ao.refresh();
  const passes=[new RenderPass(scene,camera),ao,bloom,output,smaa],read=new THREE.WebGLRenderTarget(800,600),write=read.clone();
  const composer={passes,readBuffer:read,writeBuffer:write,renderToScreen:true,isLastEnabledPass(index){return !passes.slice(index+1).some(p=>p.enabled);}};
  const original=new THREE.WebGLRenderTarget(2,2),calls=[];
  let target=original,face=4,level=2;
  const renderer={autoClear:true,autoClearColor:true,autoClearDepth:true,autoClearStencil:true,
    outputColorSpace:THREE.SRGBColorSpace,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.05,
    getRenderTarget:()=>target,getActiveCubeFace:()=>face,getActiveMipmapLevel:()=>level,
    setRenderTarget(next,nextFace=0,nextLevel=0){target=next;face=nextFace;level=nextLevel;},
    clear(){assert.fail('Preparation must not clear a render target');},render(){assert.fail('Preparation must not draw');},
    compileAsync(object,view){calls.push({material:object.material,object,camera:view,target,defines:JSON.stringify(object.material?.defines)});return Promise.resolve(object);},
  };
  function retire(){for(const p of passes)p.dispose?.();for(const t of [read,write,original])t.dispose();mesh.geometry.dispose();mesh.material.dispose();}
  return{scene,camera,mesh,ao,bloom,output,smaa,composer,renderer,calls,original,retire,getTarget:()=>[target,face,level]};
}
function actualPassDispatch(f){
  let target,read=f.composer.readBuffer,write=f.composer.writeBuffer;
  const records=[],clear=new THREE.Color();let alpha=1;
  const renderer={autoClear:true,autoClearColor:true,autoClearDepth:true,autoClearStencil:true,
    outputColorSpace:f.renderer.outputColorSpace,toneMapping:f.renderer.toneMapping,toneMappingExposure:f.renderer.toneMappingExposure,
    shadowMap:{autoUpdate:true,needsUpdate:true,enabled:true},
    getClearColor:c=>c.copy(clear),getClearAlpha:()=>alpha,setClearColor:(color,a)=>{clear.set(color);if(a!==undefined)alpha=a;},setClearAlpha:a=>{alpha=a;},
    clear(){},clearDepth(){},getRenderTarget:()=>target,setRenderTarget:t=>{target=t;},
    render(object,camera){if(object!==f.scene)records.push({material:object.material,object,camera,target,defines:JSON.stringify(object.material.defines)});},
  };
  for(let index=0;index<f.composer.passes.length;index++){
    const pass=f.composer.passes[index];if(!pass.enabled)continue;
    pass.renderToScreen=f.composer.renderToScreen&&f.composer.isLastEnabledPass(index);
    pass.render(renderer,write,read,0,false);
    if(pass.needsSwap)[read,write]=[write,read];
  }
  // Blur X/Y draws use the same material and linear target program. Preserve
  // the first dispatch so its target can be compared exactly with preparation.
  const seen=new Map();return records.filter(record=>{
    const kind=record.target===null?'screen':'linear';
    if(!seen.has(record.material))seen.set(record.material,new Set());
    const variants=seen.get(record.material);if(variants.has(kind))return false;variants.add(kind);return true;
  });
}
try{
  {
    const f=fixture(false),quads=f.composer.passes.map(p=>p.fsQuad?.material),screenFlags=f.composer.passes.map(p=>p.renderToScreen);
    try{
      await compileWarmupScene(f.renderer,f.scene,f.camera,null);
      equal(f.calls.length,1,'Direct Performance preparation submits only the driving scene');
      equal([f.calls[0].object,f.calls[0].camera,f.calls[0].target],[f.scene,f.camera,null],'Direct preparation uses the native canvas tone/colour variant');
      equal(f.getTarget(),[f.original,4,2],'Direct preparation restores previous target, face and mip');
      equal(f.composer.passes.map(p=>p.fsQuad?.material),quads,'Direct preparation never selects fullscreen materials');
      equal(f.composer.passes.map(p=>p.renderToScreen),screenFlags,'Direct preparation never mutates pass routing');
      equal(f.output.material.defines,{},'Direct preparation does not compile the unused Output shader');
      const failure=new Error('direct scene failed');f.renderer.compileAsync=()=>{throw failure;};
      assert.throws(()=>compileWarmupScene(f.renderer,f.scene,f.camera,null),error=>error===failure);checks++;
      equal(f.getTarget(),[f.original,4,2],'Failed direct preparation restores renderer target state');
    }finally{f.retire();}
    const source=readFileSync(new URL('../src/render3d.js',import.meta.url),'utf8');
    check(/compilation=high\?compileWarmupPipeline\(renderer,scene,camera,composer\):compileWarmupScene\(renderer,scene,camera,null\)/.test(source),'Production Performance selects direct preparation instead of the composite pipeline');
  }
  for(const high of [true,false]){
    const f=fixture(high),buffers=[f.composer.readBuffer,f.composer.writeBuffer],quads=f.composer.passes.map(p=>p.fsQuad?.material),screenFlags=f.composer.passes.map(p=>p.renderToScreen);
    try{
      equal(f.output.material.defines,{},'Output shader begins without render-time tone/colour defines');
      const report=await compileWarmupPostprocessing(f.renderer,f.composer);
      equal(report.materials,high?16:9,'Prepare only enabled fullscreen materials');
      equal(f.getTarget(),[f.original,4,2],'Every submission restores the original target, face and mip');
      equal([f.composer.readBuffer,f.composer.writeBuffer],buffers,'Preparation never swaps live composer buffers');
      equal(f.composer.passes.map(p=>p.fsQuad?.material),quads,'Full-screen quad selections are restored');
      equal(f.composer.passes.map(p=>p.renderToScreen),screenFlags,'Live pass screen flags are restored');
      equal([f.scene.overrideMaterial,f.mesh.visible],[null,false],'No scene override or visibility changes during preparation');
      equal(f.output.material.defines,{SRGB_TRANSFER:'',ACES_FILMIC_TONE_MAPPING:''},'Prepare the actual first Output shader variant');
      const expected=actualPassDispatch(f);
      equal(f.calls.length,expected.length,'Preparation has exactly the unique real fullscreen dispatches');
      for(let i=0;i<expected.length;i++){
        equal(f.calls[i].material,expected[i].material,'Prepare the actual pass material, not a clone');
        equal(f.calls[i].camera,expected[i].camera,'Prepare using the actual fullscreen camera');
        equal(f.calls[i].target,expected[i].target,'Prepare the actual first target for each program');
        equal(f.calls[i].defines,expected[i].defines,'Tone, colour and kernel defines match the first draw');
      }
      check(f.calls.every(call=>call.object!==f.scene),'Postprocessing preparation does not traverse the driving world');
    }finally{f.retire();}
  }
  for(const synchronous of [false,true]){
    const f=fixture(false),first=deferred(),failure=new Error('driver compile rejected'),quads=f.composer.passes.map(p=>p.fsQuad?.material);
    let submissions=0,settled=false;
    f.renderer.compileAsync=()=>{submissions++;if(submissions===1)return first.promise;if(submissions===2){if(synchronous)throw failure;return Promise.reject(failure);}return Promise.resolve();};
    try{
      const work=compileWarmupPostprocessing(f.renderer,f.composer),observed=work.then(()=>{settled=true;},error=>{settled=true;equal(error,failure,'Preparation reports the original compile failure');});
      await flush();check(!settled,'One failed submission cannot retire an earlier native compiler poll');
      equal(f.getTarget(),[f.original,4,2],'Compile failure still restores renderer target state');
      equal(f.composer.passes.map(p=>p.fsQuad?.material),quads,'Compile failure still restores quad materials');
      first.resolve();await observed;check(settled,'Failure completes after every submitted native poll settles');
    }finally{f.retire();}
  }
  {
    const f=fixture(false),sceneWork=deferred(),postWork=deferred();let calls=0,settled=false;
    f.renderer.compileAsync=object=>{calls++;return object===f.scene?sceneWork.promise:calls===2?postWork.promise:Promise.resolve();};
    try{
      const error=new Error('scene rejected'),work=compileWarmupPipeline(f.renderer,f.scene,f.camera,f.composer),observed=work.then(()=>{settled=true;},reason=>{settled=true;equal(reason,error);});
      sceneWork.reject(error);await flush();check(!settled,'Pipeline failure retains all submitted fullscreen materials until native work settles');
      postWork.resolve();await observed;equal(calls,10,'Composite pipeline with AO disabled submits one scene and nine fullscreen materials');
      equal(f.getTarget(),[f.original,4,2]);
    }finally{f.retire();}
  }
}finally{if(oldImage===undefined)delete globalThis.Image;else globalThis.Image=oldImage;}
console.log(`Warmup passes: ${checks} real-pass material/target/define parity, no-draw, bounded coverage and async-retirement checks passed.`);
