import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';

// Small-radius ambient shading adds contact and panel depth. Foliage cutouts,
// glass and particles are excluded from the opaque depth pass so their quads
// cannot create dark rectangular artifacts.
export function createAmbientShading(scene,camera){
  const pass=new GTAOPass(scene,camera,640,360,undefined,{radius:1.5,thickness:.8,distanceFallOff:1,scale:1,samples:16},{radius:6,samples:8});
  pass.blendIntensity=.38;
  const setSize=pass.setSize.bind(pass);pass.setSize=(width,height)=>setSize(Math.max(1,Math.round(width*.6)),Math.max(1,Math.round(height*.6)));
  const excluded=[],visibility=[];
  pass.refresh=()=>{excluded.length=0;scene.traverse(object=>{if(!object.isMesh)return;const materials=Array.isArray(object.material)?object.material:[object.material];if(materials.some(m=>m?.transparent||m?.alphaTest>0)||object.userData.excludeAmbientOcclusion||object.name==='Atmospheric sky')excluded.push(object);});visibility.length=excluded.length;};
  const renderOverride=pass.renderOverride.bind(pass);
  pass.renderOverride=(renderer,material,target,clearColor,clearAlpha)=>{
    // RenderPass already drew the colour scene and its shadows. Normals do not
    // sample lighting; rebuilding shadows here also hides foliage casters.
    // Both flags must be false to suppress Three's shadow render. Preserve a
    // pending manual update for the next colour pass, including on failure.
    const shadows=material===pass.normalMaterial?renderer.shadowMap:null;
    const autoUpdate=shadows?.autoUpdate,needsUpdate=shadows?.needsUpdate;
    for(let i=0;i<excluded.length;i++){visibility[i]=excluded[i].visible;excluded[i].visible=false;}
    if(shadows){shadows.autoUpdate=false;shadows.needsUpdate=false;}
    try{renderOverride(renderer,material,target,clearColor,clearAlpha);}
    finally{
      if(shadows){shadows.autoUpdate=autoUpdate;shadows.needsUpdate=needsUpdate;}
      for(let i=0;i<excluded.length;i++)excluded[i].visible=visibility[i];
    }
  };
  // Three r171 omits these two shader materials from GTAOPass.dispose().
  const dispose=pass.dispose.bind(pass);let disposed=false;
  pass.dispose=()=>{if(disposed)return;disposed=true;dispose();pass.gtaoMaterial.dispose();pass.blendMaterial.dispose();};
  return pass;
}
