import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';

// Small-radius ambient shading adds contact and panel depth. Foliage cutouts,
// glass and particles are excluded from the opaque depth pass so their quads
// cannot create dark rectangular artifacts.
export function createAmbientShading(scene,camera){
  const pass=new GTAOPass(scene,camera,640,360,undefined,{radius:1.5,thickness:.8,distanceFallOff:1,scale:1,samples:16},{radius:6,samples:8});
  pass.blendIntensity=.38;
  const setSize=pass.setSize.bind(pass);pass.setSize=(width,height)=>setSize(Math.max(1,Math.round(width*.6)),Math.max(1,Math.round(height*.6)));
  let excluded=[];
  pass.refresh=()=>{excluded=[];scene.traverse(object=>{if(!object.isMesh)return;const materials=Array.isArray(object.material)?object.material:[object.material];if(materials.some(m=>m?.transparent||m?.alphaTest>0)||object.userData.excludeAmbientOcclusion||object.name==='Atmospheric sky')excluded.push(object);});};
  const renderOverride=pass.renderOverride.bind(pass);
  pass.renderOverride=(...args)=>{const visibility=excluded.map(object=>object.visible);excluded.forEach(object=>object.visible=false);try{renderOverride(...args);}finally{excluded.forEach((object,index)=>object.visible=visibility[index]);}};
  const dispose=pass.dispose.bind(pass);pass.dispose=()=>{dispose();pass.blendMaterial.dispose();};
  return pass;
}
