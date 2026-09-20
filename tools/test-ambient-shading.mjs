import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createAmbientShading } from '../src/ambient-shading.js';

let checks=0;
const equal=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
const check=(condition,label)=>{assert.ok(condition,label);checks++;};

function fixture(shadowMap={enabled:true,autoUpdate:true,needsUpdate:false}){
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
  const geometry=new THREE.BoxGeometry(),opaqueMaterial=new THREE.MeshStandardMaterial();
  const mesh=material=>{const object=new THREE.Mesh(geometry,material);scene.add(object);return object;};
  const opaque=mesh(opaqueMaterial);
  const glass=mesh(new THREE.MeshStandardMaterial({transparent:true,opacity:.5}));
  const foliage=mesh(new THREE.MeshStandardMaterial({alphaTest:.5}));
  const mixed=mesh([opaqueMaterial,glass.material]);
  const optedOut=mesh(opaqueMaterial);optedOut.userData.excludeAmbientOcclusion=true;
  const sky=mesh(opaqueMaterial);sky.name='Atmospheric sky';
  const hidden=mesh(glass.material);hidden.visible=false;
  const points=new THREE.Points(geometry,new THREE.PointsMaterial());scene.add(points);
  const lines=new THREE.Line(geometry,new THREE.LineBasicMaterial());scene.add(lines);
  const excluded=[glass,foliage,mixed,optedOut,sky,hidden];
  const pass=createAmbientShading(scene,camera);pass.refresh();
  const records=[],color=new THREE.Color(0x142638);
  let alpha=.7,target=null,shadowUpdates=0;
  const renderer={
    autoClear:true,shadowMap,
    getClearColor(out){return out.copy(color);},getClearAlpha(){return alpha;},
    setClearColor(value){color.set(value);},setClearAlpha(value){alpha=value;},
    setRenderTarget(value){target=value;},clear(){},
    render(object,view){
      const normal=object===scene&&scene.overrideMaterial===pass.normalMaterial;
      // Same top-level gate as Three r171 WebGLShadowMap.render().
      if(object===scene&&shadowMap?.enabled&&(shadowMap.autoUpdate!==false||shadowMap.needsUpdate!==false)){
        shadowUpdates++;shadowMap.needsUpdate=false;
      }
      records.push({scene:object===scene,normal,view,target,flags:shadowMap?{...shadowMap}:null,
        visibility:excluded.map(item=>item.visible),points:points.visible,lines:lines.visible});
      if(normal){
        equal(excluded.map(item=>item.visible),excluded.map(()=>false),'cutouts, glass and opted-out surfaces stay out of normals');
        equal(opaque.visible,true,'opaque geometry remains in the normal pass');
        renderer.onNormal?.();
      }
    },
  };
  return {scene,camera,pass,renderer,records,opaque,excluded,glass,hidden,points,lines,mesh,
    get shadowUpdates(){return shadowUpdates;},
    dispose(){pass.dispose();geometry.dispose();const materials=new Set();scene.traverse(object=>{for(const material of Array.isArray(object.material)?object.material:[object.material])if(material)materials.add(material);});materials.forEach(material=>material.dispose());},
  };
}

// Exercise the actual GTAOPass sequence, not a replacement rendering method.
{
  const f=fixture(),readBuffer=new THREE.WebGLRenderTarget(1,1),writeBuffer=new THREE.WebGLRenderTarget(1,1);
  const original=f.excluded.map(object=>object.visible);
  for(let frame=0;frame<3;frame++){
    f.renderer.render(f.scene,f.camera); // Composer's preceding colour RenderPass.
    f.pass.render(f.renderer,writeBuffer,readBuffer);
    equal(f.shadowUpdates,frame+1,'one shadow update per colour frame, none for normals');
    equal(f.excluded.map(object=>object.visible),original,'excluded visibility restores after every complete AO pass');
    equal([f.points.visible,f.lines.visible],[true,true],'Three restores points and lines after the normal pass');
    equal(f.renderer.shadowMap,{enabled:true,autoUpdate:true,needsUpdate:false},'normal pass restores automatic shadow updates');
    equal(f.scene.overrideMaterial,null,'normal material does not leak into the colour scene');
  }
  const normals=f.records.filter(record=>record.normal);
  equal(normals.length,3,'one normal render per AO frame');
  for(const record of normals){
    equal(record.flags,{enabled:true,autoUpdate:false,needsUpdate:false},'both shadow update gates are suppressed only during normals');
    equal([record.points,record.lines],[false,false],'Three line and point exclusions remain intact');
  }
  equal(f.records.filter(record=>record.scene&&!record.normal).length,3,'colour render count is unchanged');
  f.dispose();readBuffer.dispose();writeBuffer.dispose();
}

// A pending update, disabled shadows and explicitly manual shadows must retain
// their exact prior state. An AO pass must not consume a requested update.
for(const enabled of [false,true])for(const autoUpdate of [false,true])for(const needsUpdate of [false,true]){
  const initial={enabled,autoUpdate,needsUpdate},f=fixture({...initial});
  f.pass.renderOverride(f.renderer,f.pass.normalMaterial,f.pass.normalRenderTarget,0x7777ff,1);
  equal(f.renderer.shadowMap,initial,'all shadow flag combinations restore exactly');
  equal(f.shadowUpdates,0,'no shadow rendering occurs for any normal-pass flag combination');
  f.renderer.render(f.scene,f.camera);
  equal(f.shadowUpdates,Number(enabled&&(autoUpdate||needsUpdate)),'the next colour render honors the original shadow update request');
  f.dispose();
}

for(const failurePoint of ['normal-render','clear']){
  const initial={enabled:true,autoUpdate:false,needsUpdate:true},f=fixture({...initial});
  const original=f.excluded.map(object=>object.visible),error=new Error(`expected ${failurePoint} failure`);
  if(failurePoint==='normal-render')f.renderer.onNormal=()=>{throw error;};
  else f.renderer.clear=()=>{throw error;};
  assert.throws(()=>f.pass.renderOverride(f.renderer,f.pass.normalMaterial,f.pass.normalRenderTarget,0x7777ff,1),value=>value===error);checks++;
  equal(f.renderer.shadowMap,initial,'a failed normal pass restores both shadow update flags');
  equal(f.excluded.map(object=>object.visible),original,'a failed normal pass restores excluded surface visibility');
  equal(f.shadowUpdates,0,'a failed normal pass still avoids updating shadows');
  f.dispose();
}

{
  const f=fixture();
  // The guard is specific to normals, not any future lit override material.
  f.pass.renderOverride(f.renderer,f.opaque.material,f.pass.normalRenderTarget);
  equal(f.shadowUpdates,1,'a non-normal override retains normal Three shadow behavior');
  f.dispose();
}

{
  const f=fixture(null);
  f.pass.renderOverride(f.renderer,f.pass.normalMaterial,f.pass.normalRenderTarget);
  equal(f.renderer.shadowMap,null,'a renderer adapter without shadow maps remains supported');
  equal(f.glass.visible,true,'visibility restores without a shadow map');
  f.dispose();
}

{
  const f=fixture(),retired=f.glass,newGlass=f.mesh(retired.material);
  f.scene.remove(retired);retired.visible=false;f.pass.refresh();
  f.renderer.onNormal=()=>equal(newGlass.visible,false,'refresh includes a newly attached transparent surface');
  f.pass.renderOverride(f.renderer,f.pass.normalMaterial,f.pass.normalRenderTarget);
  equal(retired.visible,false,'refresh drops retired scene objects');
  equal(newGlass.visible,true,'the refreshed visibility buffer restores new objects');
  // Read current visibility each frame; never restore a cached initial value.
  newGlass.visible=false;f.hidden.visible=true;
  f.pass.renderOverride(f.renderer,f.pass.normalMaterial,f.pass.normalRenderTarget);
  equal([newGlass.visible,f.hidden.visible],[false,true],'between-frame visibility changes are preserved');
  check(!f.scene.children.includes(retired),'fixture removed the retired surface');
  f.dispose();
}

console.log(`Ambient shading: ${checks} shadow gating, render sequence, visibility, refresh and failure checks passed.`);
