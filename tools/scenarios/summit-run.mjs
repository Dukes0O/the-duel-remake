// P4-SUMMIT actual native art. Existing browser harness, private memory-only
// storage, no frame timing. node tools/browser-harness.mjs scenario summit-run
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {SUMMIT_RUN} from '../../src/circuits/summit-run.js';
import {buildTrackScript} from '../../src/track-script.js';

const entry='/tools/menu-check.html?flags=grand-prix,snow-world,summit-run';
const road=buildTrackScript(SUMMIT_RUN);
const centre=name=>{const piece=road.pieces.find(piece=>piece.name===name);if(!piece)throw Error('Missing actual Summit piece '+name);return (piece.s0+piece.s1)/2;};
const views=[
  ['desert-foothills',centre('Cattle Grid Jump'),12,100],
  ['pine-switchbacks',centre("Engineer's Hairpin"),16,80],
  ['tree-line-pit',centre('Tree Line Pit Straight'),7,90],
  ['upper-snow',centre('Whiteout Crest'),9,75],
  ['gallery-open-road',SUMMIT_RUN.roadBranches[0].start+35,28,180],
  ['devils-staircase',centre("Devil's Elbow"),15,75],
  ['summit-landmarks',road.length-150,13,100],
  ['gallery-fork-approach',SUMMIT_RUN.roadBranches[0].start-80,18,240],
];

export async function run(context){
  if(process.env.DUEL_SUMMIT_SNOW_ART==='1')return runSnowArt(context);
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  const photos=[],facts=[];
  for(const quality of ['high','performance']){
    await context.navigate(entry);
    await context.waitFor(`document.readyState==='complete'&&window.__qaApp&&window.__render&&document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&!document.querySelector('#start-engine')?.disabled`,'native Summit menu',60000);
    await context.evaluate(`(()=>{
      const app=window.__qaApp;
      if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only storage is required');
      app.stop();app.audio.setMuted(true);app.setGraphicsQuality(${JSON.stringify(quality)});
      const index=[...document.querySelector('#scene-select').options].map(option=>Number(option.value)).find(index=>app.getMenuCourse(index)?.def.id==='summit-run');
      if(index==null)throw Error('Actual Summit is missing from the course list');
      app.profile={...app.profile,credits:1e6,courses:{version:1,unlocked:[...new Set([...(app.profile.courses?.unlocked||[]),'summit-run'])]}};
      if(!app._saveProfile())throw Error('Memory fixture save failed');
      window.__summitCourse=app.getMenuCourse(index);
      if(!app.startCampaign({startStage:index,seed:1989,fieldSeed:4242,mode:'grandprix',car:'falcone_f42',difficulty:'casual',cpuDifficulty:'medium',tyre:'summer'}))throw Error('Actual Summit did not start');
      app.stop();app.autopilot=false;app._scriptedCrashDone=true;app.setCamera('chase');
      for(const node of document.querySelectorAll('details'))node.style.display='none';
    })()`);
    await context.waitFor(`(()=>{const app=window.__qaApp;app.onFrame?.(app.duel.state,0);window.__render.renderFrame();return app.visualReady&&document.querySelector('#renderer-loading')?.hidden;})()`,'native Summit grid prepared',90000);
    const grid=await context.evaluate(`(()=>{
      const app=window.__qaApp,s=app.duel.state;
      if(app.duel.course.def.id!=='summit-run'||app.duel.course.closed||s.field?.size!==6||s.opponents.length!==5||s.lapsTotal!==1||s.combat||s.traffic.length)throw Error('Real Summit setup differs from the card');
      return {quality:${JSON.stringify(quality)},id:app.duel.course.def.id,size:s.field.size,laps:s.lapsTotal,positions:[s,...s.opponents].map(actor=>actor.s)};
    })()`);
    facts.push(grid);
    const gridShot=await context.command('Page.captureScreenshot',{format:'jpeg',quality:85,captureBeyondViewport:false});
    photos.push({label:quality+' six-car grid',url:'data:image/jpeg;base64,'+gridShot.data});
    await context.evaluate(`(()=>{
      const app=window.__qaApp;app.returnToMenu();app.stop();
      window.__summitReadOnly=()=>JSON.stringify({state:app.duel.state,profile:app.profile,storage:Array.from({length:localStorage.length},(_,i)=>{const key=localStorage.key(i);return [key,localStorage.getItem(key)];})});
    })()`);
    const capturedViews=quality==='high'?[...views,['night-ledge-town',centre('The Ledge'),90,road.length-centre('The Ledge')+5800]]:views;
    for(const [name,s,up,ahead] of capturedViews){
      await context.evaluate(`(()=>{
        window.__summitSnapshot={before:window.__summitReadOnly(),settled:false};
        window.__render.captureTrackSnapshot({course:window.__summitCourse,flag:{id:${JSON.stringify(name)},snapshotS:${s},camera:{up:${up},ahead:${ahead}}}}).then(canvas=>{window.__summitSnapshot.canvas=canvas;window.__summitSnapshot.settled=true;},error=>{window.__summitSnapshot.error=error.message;window.__summitSnapshot.settled=true;});
        window.__render.renderFrame();
      })()`);
      await context.waitFor(`(()=>{window.__render.renderFrame();return window.__summitSnapshot.settled;})()`,quality+' '+name,25000);
      const photo=await context.evaluate(`(()=>{
        const shot=window.__summitSnapshot;
        if(shot.error)throw Error(shot.error);
        if(shot.before!==window.__summitReadOnly())throw Error('Snapshot changed state/profile/memory saves');
        if(!shot.canvas||document.querySelector('#view3d')?.dataset.trackKitAsset!=='ready')throw Error('Actual approved Summit kits are not ready');
        return shot.canvas.toDataURL('image/jpeg',.88);
      })()`);
      if(name==='gallery-fork-approach')facts.push(await context.evaluate(`(()=>{
        const course=window.__summitCourse,eye=window.__render.camera.position;
        const nearest=course.nearest(eye.x,eye.z),tunnel=course.tunnelAt(nearest.s);
        return {quality:${JSON.stringify(quality)},view:'gallery-fork-approach',requested:{snapshotS:${s},up:${up},ahead:${ahead}},
          eye:{x:eye.x,y:eye.y,z:eye.z,s:nearest.s,lateral:nearest.lateral},
          eyeAboveGround:eye.y-course.groundAt(nearest.s,nearest.lateral).y,
          tunnel:tunnel?{id:tunnel.id,start:tunnel.start,end:tunnel.end,height:tunnel.height}:null};
      })()`));
      if(name==='night-ledge-town')facts.push(await context.evaluate(`(()=>{
        const d=window.__render,course=window.__summitCourse,lights=d.scene.getObjectByName('night-glows');
        return {quality:'high',view:'night-ledge-town',requestedS:${s},eye:d.camera.position.toArray(),groundLights:lights?.userData.groundLightRows??[],lighting:'authored distance-path night'};
      })()`));
      photos.push({label:quality+' '+name,url:photo});
      await context.evaluate('window.__render.clearTrackSnapshot()');
    }
  }
  const sheet=await context.evaluate(`(async()=>{
    const photos=${JSON.stringify(photos)},canvas=document.createElement('canvas'),columns=4,tile=480,h=270,pad=5,label=23;
    canvas.width=columns*(tile+pad)+pad;canvas.height=45+Math.ceil(photos.length/columns)*(h+label+pad)+pad;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#101920';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#f0eee1';ctx.font='22px sans-serif';ctx.fillText('Summit Run - final round three / actual High and Performance views',12,31);
    for(const [i,photo] of photos.entries()){
      const image=new Image();image.src=photo.url;await image.decode();const x=pad+(i%columns)*(tile+pad),y=45+pad+Math.floor(i/columns)*(h+label+pad);
      ctx.drawImage(image,x,y,tile,h);ctx.font='15px sans-serif';ctx.fillText(photo.label,x+4,y+h+17);
    }
    for(const quality of [.85,.75,.65,.55,.45,.35]){const url=canvas.toDataURL('image/jpeg',quality);if(url.length*3/4<=490000)return {url,width:canvas.width,height:canvas.height,quality};}
    throw Error('Actual sheet exceeds 500 KB');
  })()`);
  const sheetPath=join(context.outputDir,'round-3.jpg'),bytes=Buffer.from(sheet.url.split(',')[1],'base64');
  if(bytes.length>500000)throw Error('Actual sheet exceeds 500 KB');
  await writeFile(sheetPath,bytes);context.screenshots.push(sheetPath);
  await writeFile(join(context.outputDir,'summit-run.json'),JSON.stringify({memoryOnly:true,frameMeasurement:false,facts,views:photos.map(photo=>photo.label),sheet:{bytes:bytes.length,width:sheet.width,height:sheet.height,quality:sheet.quality}},null,2)+'\n');
  console.log(`Summit native views: ${photos.length}, ${bytes.length} byte sheet; no frame timing.`);
}

// Explicit daylight ART copies only: the ordinary Summit recipe above stays exact.
async function runSnowArt(context){
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  const packet={artOnly:true,memoryOnly:true,frameMeasurement:false,passed:false,
    lighting:'Same declared daylight ART override on both Course copies; no normal race lighting change',
    requested:{piece:'Whiteout Crest',snapshotS:centre('Whiteout Crest'),up:140,ahead:500,quality:'high'},legs:[]};
  try{
    for(const leg of ['before','after']){
      // Full navigation makes a fresh document/renderer/world for each leg.
      await context.navigate(entry);
      await context.waitFor(`document.readyState==='complete'&&window.__qaApp&&window.__render&&document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&!document.querySelector('#start-engine')?.disabled`,'fresh native snow art menu',60000);
      await context.evaluate(`(()=>{
        const app=window.__qaApp;
        if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only storage is required');
        if(app.duel.state.status!=='menu')throw Error('Snow art must remain in the menu');
        app.stop();app.audio.setMuted(true);app.setGraphicsQuality('high');
        const index=[...document.querySelector('#scene-select').options].map(option=>Number(option.value)).find(index=>app.getMenuCourse(index)?.def.id==='summit-run');
        if(index==null)throw Error('Actual Summit is missing');
        const original=app.getMenuCourse(index),snowWorld=structuredClone(original.def.snowWorld);
        if(original.seed!==1989)throw Error('Actual Summit menu seed differs');
        delete snowWorld.variationStrength;delete snowWorld.variationScale;
        if(${JSON.stringify(leg)}==='after'){snowWorld.variationStrength=.20;snowWorld.variationScale=800;}
        const course=new original.constructor({...original.def,snowWorld,lightPath:undefined,timeOfDay:'day'},1989);
        if(JSON.stringify(course.features)!==JSON.stringify(original.features))throw Error('ART copy changed physical course features');
        const readOnly=()=>JSON.stringify({state:app.duel.state,profile:app.profile,storage:Array.from({length:localStorage.length},(_,i)=>{const key=localStorage.key(i);return [key,localStorage.getItem(key)];})});
        window.__snowArt={course,original,readOnly,before:readOnly(),features:JSON.stringify(course.features),settled:false,
          worldBuildsBefore:Number(document.querySelector('#view3d').dataset.worldBuilds||0)};
        window.__render.captureTrackSnapshot({course,flag:{id:'snow-variation-daylight-art',snapshotS:${centre('Whiteout Crest')},camera:{up:140,ahead:500}}})
          .then(canvas=>{window.__snowArt.canvas=canvas;window.__snowArt.settled=true;},error=>{window.__snowArt.error=error.message;window.__snowArt.settled=true;});
        window.__render.renderFrame();
      })()`);
      await context.waitFor(`(()=>{window.__render.renderFrame();return window.__snowArt.settled;})()`,'daylight open snowfield '+leg,25000);
      const captured=await context.evaluate(`(async()=>{
        const shot=window.__snowArt,api=window.__render,host=document.querySelector('#view3d');
        if(shot.error)throw Error(shot.error);
        if(shot.before!==shot.readOnly()||window.__qaApp.duel.state.status!=='menu')throw Error('ART snapshot changed state/profile/storage');
        if(JSON.stringify(shot.course.features)!==shot.features)throw Error('Snapshot changed actual course features');
        if(!shot.canvas||shot.canvas.width!==960||shot.canvas.height!==540||host.dataset.trackKitAsset!=='ready')throw Error('Actual snapshot canvas/kits not ready');
        const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
        const geometry=[],terrain=[];let snowVertices=0,dryVertices=0;
        api.scene.traverse(node=>{if(node.geometry?.getAttribute('winterWeight'))terrain.push(node);});
        for(const mesh of terrain){
          const positions=mesh.geometry.getAttribute('position'),weights=mesh.geometry.getAttribute('winterWeight');
          let winter=0,dry=0;for(const value of weights.array){if(value>0)winter++;else dry++;}
          snowVertices+=winter;dryVertices+=dry;
          const raw=array=>new Uint8Array(array.buffer,array.byteOffset,array.byteLength);
          geometry.push({name:mesh.name,vertices:positions.count,winterVertices:winter,dryVertices:dry,
            positions:await hash(raw(positions.array)),weights:await hash(raw(weights.array)),
            index:mesh.geometry.index?await hash(raw(mesh.geometry.index.array)):null,
            matrix:mesh.matrixWorld.toArray(),materialKey:mesh.material.customProgramCacheKey()});
        }
        if(!terrain.length||!snowVertices)throw Error('Actual winter terrain coverage is missing');
        if(!(Number(host.dataset.worldBuilds)>shot.worldBuildsBefore))throw Error('ART snapshot reused a prior world');
        const facts={seed:shot.course.seed,status:window.__qaApp.duel.state.status,readOnly:true,
          timeOfDay:shot.course.def.timeOfDay,hasLightPath:shot.course.def.lightPath!==undefined,
          options:{variation:shot.course.def.snowWorld.variation,strength:shot.course.def.snowWorld.variationStrength??null,scale:shot.course.def.snowWorld.variationScale??null},
          dimensions:[shot.canvas.width,shot.canvas.height],featuresHash:await hash(new TextEncoder().encode(shot.features)),
          worldBuildsBefore:shot.worldBuildsBefore,worldBuildsAfter:Number(host.dataset.worldBuilds),
          worldBuildMs:host.dataset.worldBuildMs,snowVertices,dryVertices,geometry,
          pose:{position:api.camera.position.toArray(),quaternion:api.camera.quaternion.toArray(),fov:api.camera.fov,aspect:api.camera.aspect}};
        return {facts,url:shot.canvas.toDataURL('image/png')};
      })()`);
      const path=join(context.outputDir,'snow-'+leg+'.png');
      await writeFile(path,Buffer.from(captured.url.split(',')[1],'base64'),{flag:'wx'});
      context.screenshots.push(path);packet.legs.push({leg,image:path,...captured.facts});
      await context.evaluate('window.__render.clearTrackSnapshot()');
    }
    const [before,after]=packet.legs;
    const geometry=leg=>leg.geometry.map(({materialKey,...actual})=>actual);
    if(before.featuresHash!==after.featuresHash||JSON.stringify(geometry(before))!==JSON.stringify(geometry(after))||JSON.stringify(before.pose)!==JSON.stringify(after.pose))
      throw Error('The two actual static worlds do not share geometry and camera');
    if(before.geometry.some((row,index)=>row.materialKey===after.geometry[index].materialKey))throw Error('The actual opted material key did not change');
    packet.passed=true;
  }catch(error){packet.error=String(error.stack??error);throw error;}
  finally{await writeFile(join(context.outputDir,'snow-art.json'),JSON.stringify(packet,null,2)+'\n');}
  console.log('Snow variation: two actual static daylight ART snapshots, no frame timing or race changes.');
}
