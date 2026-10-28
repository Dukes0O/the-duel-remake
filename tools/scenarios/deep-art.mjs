// DEEP-ART-SRC photography only: exact fitted GLBs in the EXISTING look-test
// water, lights and High pipeline. Opt-in via browser-harness, no race, saves,
// timing, page/look/harness edits or gameplay scenario registration.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const ids=['silver-school','reef-fish','turtle','ray','manta','sea-lion','otter','crab',
  'moray','grouper','reef-shark','jellyfish','whale','octopus','wreck-hull','giant-clam','anchor','sunken-boat'];
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

function helpers(){
  return `(()=>{
    const page=window.__deepLook,qa=page?.artQa,d=page?.debug;
    if(!qa||d.camera.position.constructor!==qa.THREE.Vector3||d.scene.constructor!==qa.THREE.Scene)
      throw Error('Photography must use the actual look page Three module');
    qa.installIsolatedStorage();
    window.__deepArtQa={THREE:qa.THREE,GLTFLoader:qa.GLTFLoader,floorHeight:qa.floorHeight};
  })()`;
}

export async function run(context){
  const manifest=JSON.parse(await readFile(join(root,'public/assets/models/deep/manifest.json'),'utf8'));
  if(JSON.stringify(manifest.models.map(m=>m.id))!==JSON.stringify(ids))throw Error('Exact eighteen-role working-art manifest required');
  const report={photographyOnly:true,actualLookTest:true,quality:'high',frameMeasurement:false,
    runtimeSceneInstall:false,storage:'existing isolated in-memory helper',views:[],sourceFiles:{}};
  for(const path of ['tools/scenarios/deep-art.mjs','tools/deep-look.js','tools/blender/deep-art-fit.py','tools/blender/deep-art-sheet.py','public/assets/models/deep/manifest.json'])
    report.sourceFiles[path]=digest(await readFile(join(root,path)));
  const persist=()=>writeFile(join(context.outputDir,'deep-art-native.json'),JSON.stringify(report,null,2)+'\n');
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await context.navigate('/tools/deep-look.html?quality=high&still=1&clean=1&manual=1&art-qa=1');
  await context.waitFor('window.__deepLook?.ready===true&&!!window.__deepLook.debug.look','actual look-test handles',90000);
  await context.evaluate(await helpers());
  report.look=await context.evaluate(`(()=>{
    const q=window.__deepLook.info(),d=window.__deepLook.debug;
    if(q.quality!=='high'||q.pipeline!=='composite')throw Error('Original High look pipeline required');
    if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory storage replacement required');
    window.__deepArtMemory=JSON.stringify(window.name);window.__deepArtMeshes=[];
    d.car.visible=false;d.school.mesh.visible=false;
    window.__deepArtBaseLights=d.scene.children.filter(o=>o.isLight).map(o=>({uuid:o.uuid,type:o.type,intensity:o.intensity,colour:o.color.toArray()}));
    return {...q,exposure:d.renderer.toneMappingExposure,lights:window.__deepArtBaseLights};})()`);
  try{
    const selected=process.env.DUEL_DEEP_ART_ROUND==='3'?manifest.models.filter(row=>['grouper','giant-clam'].includes(row.id)):manifest.models;
    for(const model of selected){
      const path=join(root,'public/assets/models/deep',model.id+'.glb');
      if(digest(await readFile(path))!==model.sha256)throw Error('Changed GLB before photography: '+model.id);
      const view=await context.evaluate(`(async()=>{
        const row=${JSON.stringify(model)},q=window.__deepArtQa,{THREE,GLTFLoader,floorHeight}=q,d=window.__deepLook.debug;
        for(const old of window.__deepArtMeshes){d.scene.remove(old);old.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of [].concat(o.material||[]))m.dispose();}});}
        window.__deepArtMeshes=[];d.school.mesh.visible=false;d.car.visible=false;
        const response=await fetch('/assets/models/deep/'+row.id+'.glb');if(!response.ok)throw Error('Model download failed '+row.id);
        const bytes=await response.arrayBuffer();const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
        if(hash!==row.sha256)throw Error('Browser asset bytes differ '+row.id);
        const gltf=await new GLTFLoader().parseAsync(bytes,location.origin+'/assets/models/deep/');
        if(!(gltf.scene instanceof THREE.Group))throw Error('GLB loader must share the actual look page Three module');
        let object=gltf.scene;const mixer=gltf.animations.length?new THREE.AnimationMixer(object):null;
        if(mixer){for(const clip of gltf.animations)mixer.clipAction(clip).play();mixer.setTime(.67);}
        object.updateMatrixWorld(true);const base=new THREE.Box3().setFromObject(object),baseSize=base.getSize(new THREE.Vector3()),baseCentre=base.getCenter(new THREE.Vector3());
        const deep=['whale','wreck-hull'].includes(row.id),forest=['manta','sea-lion','otter'].includes(row.id);
        d.setView(deep?5:forest?2:4,{time:9.5});d.car.visible=false;d.school.mesh.visible=false;
        const x=forest?35:0,z=row.id==='wreck-hull'?250:row.id==='whale'?230:forest?48:66;
        const floorY=floorHeight(x,z);let rise=['ray','crab','moray','octopus','giant-clam','anchor','sunken-boat','wreck-hull'].includes(row.id)?0:.8;
        if(row.id==='otter')rise=Math.max(.5,-floorY-baseSize.y+.02);
        object.position.add(new THREE.Vector3(x-baseCentre.x,floorY-base.min.y+rise+.015,z-baseCentre.z));
        let instances=1;
        if(row.id==='silver-school'){
          const source=[];object.traverse(o=>{if(o.isMesh)source.push(o);});if(source.length!==1)throw Error('Silver-school must retain one instancing mesh');
          object.updateMatrixWorld(true);const donor=source[0],school=new THREE.InstancedMesh(donor.geometry,donor.material,36),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(1,1,1);
          for(let i=0;i<36;i++){const col=i%6,rowIndex=Math.floor(i/6),position=new THREE.Vector3(x+(col-2.5)*.43,floorY+1.1+.08*Math.sin(i*1.3),z+(rowIndex-2.5)*.42);rotation.setFromAxisAngle(new THREE.Vector3(0,1,0),.18*Math.sin(i));matrix.compose(position,rotation,scale);school.setMatrixAt(i,matrix);}
          school.instanceMatrix.needsUpdate=true;object=school;instances=36;
        }
        object.name='Fitted Deep art / '+row.id;object.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
        d.look.applyTo(object);d.scene.add(object);window.__deepArtMeshes.push(object);
        object.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(object);
        if(instances>1)box=new THREE.Box3(new THREE.Vector3(x-1.4,floorY+.7,z-1.4),new THREE.Vector3(x+1.4,floorY+1.5,z+1.4));
        const size=box.getSize(new THREE.Vector3()),target=box.getCenter(new THREE.Vector3()),span=Math.max(size.x,size.z,size.y);
        const distance=Math.max(.32,span*(row.id==='wreck-hull'?.67:.9));d.camera.fov=row.id==='wreck-hull'?70:48;
        const front=row.id==='grouper'?1.10:row.id==='otter'?1.05:row.id==='wreck-hull'?-.76:-.96,up=row.id==='otter'?-.30:.48;
        d.camera.position.copy(target).add(new THREE.Vector3(distance*.78,distance*up,distance*front));
        // Stay inside the actual water even when framing the biggest vessel.
        d.camera.position.y=Math.min(-.25,Math.max(floorHeight(d.camera.position.x,d.camera.position.z)+.20,d.camera.position.y));d.camera.lookAt(target);d.camera.updateProjectionMatrix();
        for(let i=0;i<6;i++)d.renderFrame(9.5+i/60);
        const lights=d.scene.children.filter(o=>o.isLight).map(o=>({uuid:o.uuid,type:o.type,intensity:o.intensity,colour:o.color.toArray()}));
        if(JSON.stringify(lights)!==JSON.stringify(window.__deepArtBaseLights)||d.renderer.toneMappingExposure!==1.05)throw Error('Photography altered original look lights/exposure');
        if(JSON.stringify(window.name)!==window.__deepArtMemory)throw Error('Photography altered memory storage');
        let meshes=0,materials=0,vertexColourMeshes=0;object.traverse(o=>{if(o.isMesh){meshes++;if(o.geometry.attributes.color)vertexColourMeshes++;materials+=[].concat(o.material).length;}});
        if(!meshes||!materials)throw Error('Empty fitted role '+row.id);
        return {id:row.id,sha256:hash,bytes:bytes.byteLength,instances,photographyInstanceProofOnly:instances>1,
          fileDimensionsMetres:row.dimensionsMetres,posedBounds:{min:box.min.toArray(),max:box.max.toArray()},objectScale:object.scale.toArray(),
          clips:gltf.animations.map(a=>({name:a.name,duration:a.duration})),poseSeconds:.67,
          camera:d.camera.position.toArray(),target:target.toArray(),cameraDepthMetres:Math.max(0,-d.camera.position.y),floorY,
          meshes,materials,vertexColourMeshes,pipeline:window.__deepLook.info().pipeline,waterAppliedThrough:'existing look.applyTo',lightReceipt:lights};
      })()`);
      const shot=await context.command('Page.captureScreenshot',{format:'jpeg',quality:93,clip:{x:0,y:0,width:1280,height:720,scale:1}});
      const photo=model.id+'.jpg';await writeFile(join(context.outputDir,photo),Buffer.from(shot.data,'base64'));context.screenshots.push(join(context.outputDir,photo));
      if(model.id==='wreck-hull'){
        const detail=await context.evaluate(`(()=>{
          const d=window.__deepLook.debug,object=window.__deepArtMeshes[0],{THREE}=window.__deepArtQa;
          const box=new THREE.Box3().setFromObject(object),centre=box.getCenter(new THREE.Vector3());
          const target=new THREE.Vector3(box.max.x-1.6,box.min.y+2.3,centre.z+.5);
          d.camera.position.copy(target).add(new THREE.Vector3(7.2,3.4,-5.0));d.camera.fov=62;d.camera.lookAt(target);d.camera.updateProjectionMatrix();
          for(let i=0;i<6;i++)d.renderFrame(9.5+i/60);
          const lights=d.scene.children.filter(o=>o.isLight).map(o=>({uuid:o.uuid,type:o.type,intensity:o.intensity,colour:o.color.toArray()}));
          if(JSON.stringify(lights)!==JSON.stringify(window.__deepArtBaseLights)||JSON.stringify(window.name)!==window.__deepArtMemory)throw Error('Detail capture changed light/storage');
          return {camera:d.camera.position.toArray(),target:target.toArray(),cameraDepthMetres:Math.max(0,-d.camera.position.y),sha256:${JSON.stringify(model.sha256)},reason:'Near hull breach/open hold; true-scale detail complements whole-vessel water haze'};
        })()`);
        const capture=await context.command('Page.captureScreenshot',{format:'jpeg',quality:93,clip:{x:0,y:0,width:1280,height:720,scale:1}});
        const file='wreck-hull-detail.jpg';await writeFile(join(context.outputDir,file),Buffer.from(capture.data,'base64'));context.screenshots.push(join(context.outputDir,file));view.detail={...detail,photo:file};
      }
      report.views.push({...view,photo});await persist();console.log('Actual-water art '+report.views.length+'/'+selected.length+': '+model.id);
    }
    report.complete=true;
  }finally{await persist();}
}
