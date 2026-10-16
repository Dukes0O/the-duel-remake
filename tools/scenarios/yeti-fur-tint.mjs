// One explicitly requested colour comparison, using only the existing page modules.
// No helper bundle, audio recording, timing, synthetic sighting or phase sweep.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash32} from '../../src/yeti.js';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const fixture = Object.freeze({runId:'yeti-run-0',seed:1989,yetiSeed:3395618052,mode:'timetrial',car:'falcone_f42',tyre:'winter'});
const furName = 'round-two-yeti-matted-ivory';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

export async function run(context) {
  if (process.env.DUEL_YETI_FUR_TINT_CAPTURE !== '1')
    throw Error('One-shot Yeti photography requires explicit DUEL_YETI_FUR_TINT_CAPTURE=1.');
  const packet = {photographyOnly:true,frameMeasurement:false,audioRecording:false,
    nativeEncounterAcceptance:false,groundingAcceptance:false,colourAccepted:false,
    memoryOnly:false,fixture,views:[],sourceHashes:{},complete:false};
  const persist = () => writeFile(join(context.outputDir,'fur-tint-receipt.json'),JSON.stringify(packet,null,2)+'\n');
  const factors=[];
  for (const name of ['yeti.glb','yeti-lod.glb']) {
    const path='public/assets/models/circuits/kits/'+name,bytes=await readFile(join(root,path));
    if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(16)!==0x4e4f534a)
      throw Error('Accepted GLB JSON is missing: '+name);
    const document=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8').trim());
    const material=document.materials.filter(row=>row.name===furName);
    if(material.length!==1)throw Error('Exact accepted fur material missing: '+name);
    const factor=material[0].pbrMetallicRoughness?.baseColorFactor??[1,1,1,1];
    if(JSON.stringify(factor)!=='[1,1,1,1]')throw Error('Accepted original diffuse factor changed: '+name);
    factors.push(factor);packet.sourceHashes[path]=digest(bytes);
  }
  if(hash32(fixture.seed,fixture.runId)!==fixture.yetiSeed)throw Error('Recorded fixture seed changed');
  for(const path of ['src/yeti.js','src/yeti-view.js','tools/scenarios/yeti-fur-tint.mjs'])
    packet.sourceHashes[path]=digest(await readFile(join(root,path)));
  let started=false;
  try {
    await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
    await context.navigate('/tools/menu-check.html?p4-kits-native=1&flags=summit-run,yeti,snow-world');
    await context.waitFor("!!window.__qaApp&&!!window.__render&&!!window.P4KitsQa&&document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'",'actual private Yeti menu',90000);
    packet.start=await context.evaluate(`(()=>{
      const app=window.__qaApp,draw=window.__render,qa=window.P4KitsQa,fixture=${JSON.stringify(fixture)};
      if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only saves required');
      if(!(draw.camera.position instanceof qa.Vector3))throw Error('Page must use the same Three instance');
      app.stop();app.setGraphicsQuality('high');app.audio.setMuted(true);
      app.addPlayer('Yeti fur comparison');app.profile={...app.profile,credits:5000};
      if(!app._saveProfile()||!app.purchaseCourse('summit-run').ok)throw Error('Actual memory-only course purchase failed');
      const stage=[...document.querySelector('#scene-select').options].map(option=>Number(option.value)).find(index=>app.getMenuCourse(index)?.def.id==='summit-run');
      if(stage==null)throw Error('Actual Summit course missing');
      const previous=Object.getOwnPropertyDescriptor(crypto,'randomUUID');let ok;
      try {Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=>fixture.runId});
        ok=app.startCampaign({startStage:stage,mode:fixture.mode,car:fixture.car,tyre:fixture.tyre,seed:fixture.seed,difficulty:'casual',cpuDifficulty:'medium'});
      } finally {if(previous)Object.defineProperty(crypto,'randomUUID',previous);else delete crypto.randomUUID;}
      const state=app.duel.state;
      if(!ok||app.runId!==fixture.runId||state.yetiSeed!==fixture.yetiSeed||!state.yeti?.appears||
        state.mode!==fixture.mode||state.car!==fixture.car||state.tyre!==fixture.tyre||state.opponents.length||
        app.duel.course.def.id!=='summit-run')throw Error('Actual recorded night encounter fixture differs');
      const lightPath=app.duel.course.def.lightPath,nightStart=lightPath?.keyframes?.at(-1);
      if(lightPath?.axis!=='distance'||nightStart?.look!=='night'||!Number.isFinite(nightStart.at)||nightStart.at<0||
        !Number.isFinite(state.yeti.site.s)||state.yeti.site.s<nightStart.at)
        throw Error('Actual recorded site must be inside the authored terminal-night range');
      const capture=window.__yetiFurCapture={original:app.onFrame,frozen:false,events:[]};
      capture.unsubscribe=app.duel.onChange((s,event)=>{if(event.yetiSighting)capture.events.push({stageTime:s.stageTimeSec,...event.yetiSighting});});
      app.onFrame=(s,dt)=>{capture.original?.(s,dt);const age=s.yeti?.seen?s.stageTimeSec-s.yeti.seenAt:null;
        if(age!==null&&age>=.55&&age<1.7&&app.visualReady){app.stop();capture.frozen=true;capture.age=age;}};
      // Existing production autopilot only; never replace admission or sighting logic.
      app.autopilot=true;app._scriptedCrashDone=true;app.start();
      return {runId:app.runId,seed:state.seed,yetiSeed:state.yetiSeed,site:{...state.yeti.site},memoryOnly:true,
        authoredNightRange:{from:nightStart.at,site:state.yeti.site.s},nightRequiredAtCapture:true};
    })()`);
    started=true;packet.memoryOnly=packet.start.memoryOnly;
    await context.waitFor('window.__yetiFurCapture?.frozen===true','actual naturally reached frozen roar',12*60*1000);
    const result=await context.evaluate(`(()=>{
      const app=window.__qaApp,draw=window.__render,qa=window.P4KitsQa,capture=window.__yetiFurCapture,state=app.duel.state;
      if(app.running||!capture.frozen||!state.yeti?.seen||capture.events.length!==1||capture.events[0].cue!=='yeti.roar')throw Error('Actual once-only roar must be frozen');
      const stateBefore=JSON.stringify(state),profileBefore=JSON.stringify(app.profile);
      const seconds=state.stageTimeSec;draw.renderFrame({presentationSeconds:seconds});
      const requireNativeNight=()=>{
        const host=document.querySelector('#view3d');
        if(host?.dataset.lightPath!=='true'||Number(host.dataset.nightAmount)!==1)
          throw Error('Actual frozen roar must render the full authored night');
        return {lightPath:host.dataset.lightPath,nightAmount:Number(host.dataset.nightAmount)};
      };
      const nativeNight=requireNativeNight();
      const group=draw.scene.getObjectByName('The yeti'),actor=group?.children.find(child=>child.visible);
      if(!group?.visible||!actor||!app.visualReady)throw Error('Actual accepted Yeti actor is not ready');
      const materials=new Set();actor.traverse(node=>{for(const material of Array.isArray(node.material)?node.material:node.material?[node.material]:[])if(material.name===${JSON.stringify(furName)})materials.add(material);});
      if(!materials.size)throw Error('Actual cloned fur materials missing');
      const originals=[...materials].map(material=>[material,material.color.toArray()]);
      if(originals.some(([,colour])=>colour.some(value=>Math.abs(value-1.8)>1e-10)))throw Error('Renderer candidate no longer matches reviewed1.8');
      const camera=draw.camera,savedPosition=camera.position.clone(),savedRotation=camera.quaternion.clone();
      const box=new qa.Box3().setFromObject(actor,true),centre=box.getCenter(new qa.Vector3());
      const geometry=node=>node.geometry?{uuid:node.geometry.uuid,index:node.geometry.index?Array.from(node.geometry.index.array):null,
        attributes:Object.fromEntries(Object.entries(node.geometry.attributes).map(([key,value])=>[key,Array.from(value.array)])),
        morphs:Object.fromEntries(Object.entries(node.geometry.morphAttributes).map(([key,values])=>[key,values.map(value=>Array.from(value.array))]))}:null;
      const snapshot=()=>{const nodes=[];actor.traverse(node=>{const mats=Array.isArray(node.material)?node.material:node.material?[node.material]:[];
        nodes.push({uuid:node.uuid,position:node.position.toArray(),rotation:node.quaternion.toArray(),scale:node.scale.toArray(),morphs:node.morphTargetInfluences,
          bind:node.bindMatrix?.toArray(),inverseBind:node.bindMatrixInverse?.toArray(),geometry:geometry(node),materials:mats.map(material=>{
            const json=material.toJSON();if(materials.has(material))delete json.color;return json;})});});
        return JSON.stringify({nodes,state,profile:app.profile,camera:[camera.position.toArray(),camera.quaternion.toArray()],
          lights:draw.scene.children.filter(node=>node.isLight).map(node=>({uuid:node.uuid,colour:node.color.toArray(),intensity:node.intensity,position:node.position.toArray()}))});};
      const photos=[];let invariant,furRestored=false;
      try {
        camera.position.set(centre.x+7,box.min.y+3,centre.z+8);camera.lookAt(centre);camera.updateMatrixWorld(true);
        invariant=snapshot();
        // All three renders are synchronous: no RAF, App step or pose update can run between them.
        for(const factor of [1,1.4,1.8]){
          for(const material of materials)material.color.setRGB(factor,factor,factor);
          draw.composer.render();
          const night=requireNativeNight();
          if(snapshot()!==invariant)throw Error('Matched colour picture changed pose, state, geometry, nonfur, lighting or camera');
          photos.push({factor,night,jpeg:draw.renderer.domElement.toDataURL('image/jpeg',.9)});
        }
      } finally {
        try {
          for(const [material,colour]of originals)material.color.fromArray(colour);
          furRestored=originals.every(([material,colour])=>JSON.stringify(material.color.toArray())===JSON.stringify(colour));
          if(!furRestored||(invariant&&snapshot()!==invariant))throw Error('Private fur restoration failed');
        } finally {
          camera.position.copy(savedPosition);camera.quaternion.copy(savedRotation);camera.updateMatrixWorld(true);
        }
      }
      if(JSON.stringify(state)!==stateBefore||JSON.stringify(app.profile)!==profileBefore)throw Error('Photography changed real native race/profile state');
      return {photos,nativeNight,age:capture.age,stageTime:state.stageTimeSec,site:{...state.yeti.site},events:capture.events,
        furMaterialCount:materials.size,samePoseCameraGeometryNonfur:true,originalCandidateRestored:furRestored,
        cameraRestored:camera.position.equals(savedPosition)&&camera.quaternion.equals(savedRotation)};
    })()`);
    const photos=result.photos;delete result.photos;Object.assign(packet,result);
    for(const photo of photos){const file='fur-'+String(photo.factor).replace('.','-')+'.jpg';const bytes=Buffer.from(photo.jpeg.split(',')[1],'base64');
      await writeFile(join(context.outputDir,file),bytes,{flag:'wx'});packet.views.push({factor:photo.factor,night:photo.night,file,bytes:bytes.length,sha256:digest(bytes)});}
    const sheet=await context.evaluate(`(async()=>{
      const photos=${JSON.stringify(photos)},canvas=document.createElement('canvas');canvas.width=1280;canvas.height=280;
      const brush=canvas.getContext('2d');brush.fillStyle='#17212a';brush.fillRect(0,0,1280,280);brush.font='18px sans-serif';
      for(let index=0;index<photos.length;index++){const photo=photos[index],image=new Image();image.src=photo.jpeg;await image.decode();
        const x=index*426;brush.fillStyle='white';brush.fillText(photo.factor===1?'ORIGINAL':'FUR '+photo.factor,x+12,25);brush.drawImage(image,x,40,426,240);}
      for(const quality of [.88,.75,.6,.45]){const jpeg=canvas.toDataURL('image/jpeg',quality).split(',')[1];if(Math.floor(jpeg.length*3/4)<=500000)return jpeg;}
      throw Error('Comparison sheet exceeds500KB');
    })()`);
    const bytes=Buffer.from(sheet,'base64');if(bytes.length>500000)throw Error('Comparison sheet exceeds500KB');
    const directory=join(root,'docs/board/looks/yeti');await mkdir(directory,{recursive:true});
    const target=join(directory,'fur-tint-round-1.jpg');await writeFile(target,bytes,{flag:'wx'});
    packet.sheet={file:'docs/board/looks/yeti/fur-tint-round-1.jpg',bytes:bytes.length,sha256:digest(bytes)};
    packet.complete=true;
  } catch(error){packet.error=error.message;throw error;}
  finally {
    if(started)try{await context.evaluate(`(()=>{const app=window.__qaApp,capture=window.__yetiFurCapture;app.stop();app.onFrame=capture.original;capture.unsubscribe();})()`);}
    catch(error){packet.cleanupError=error.message;packet.complete=false;}
    await persist();
  }
  if(!packet.complete)throw Error(packet.cleanupError||'Colour comparison incomplete');
}
