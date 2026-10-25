import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'vite';
import {wavFromPcm} from './audio-race.mjs';
import {measureLoudness} from '../audio/measurements.mjs';

// One fixed recorded-input appearance fixture, not a frequency sample.
const FIXTURE = Object.freeze({runId:'yeti-run-0', baseSeed:1989, yetiSeed:3395618052,
  siteIndex:0, car:'falcone_f42', tyre:'winter', mode:'timetrial', skill:.95});
const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const phases = ['idle','roar','chest-beat','lope','walk-off'];

async function browserHelper() {
  const entry = join(root,'.qa-dist/yeti.virtual.js').replaceAll('\\','/');
  const source = path => JSON.stringify(join(root,path).replaceAll('\\','/'));
  const result = await build({root, configFile:false, logLevel:'silent',
    define:{__DUEL_QA__:'true'}, plugins:[{name:'yeti-native-inspection',
      resolveId(id) { if(id.replaceAll('\\','/')===entry)return '\0yeti'; },
      // The line driver's file also holds a headless-run helper that imports the whole game
      // (its top-level waits then never finish in a second copy); the page already runs the game.
      transform(code,id) {
        if(!id.replaceAll('\\','/').endsWith('/tools/track-script-drive.mjs'))return;
        const marker="import { App } from '../src/app.js';";
        if(!code.includes(marker))throw Error('Line driver no longer imports the game as expected');
        return code.replace(marker,'class App {}');
      },
      load(id) {
        if(id!=='\0yeti')return;
        return 'import {useRacingLine} from '+source('tools/track-script-drive.mjs')+
          ';import {renderedGroundHeight} from '+source('src/rendered-ground.js')+
          ';import {hash32} from '+source('src/yeti.js')+
          ';const THREE=window.P4KitsQa;'+
          'if(!THREE||typeof THREE.Box3!=="function"||THREE.Vector3!==window.__render?.camera.position.constructor)throw Error("Yeti inspection requires the renderer\'s own Three classes");'+
          ';window.__yetiQa={THREE,useRacingLine,renderedGroundHeight,hash32};';
      }}], build:{write:false, emptyOutDir:false, minify:false,
      lib:{entry,formats:['es']}, rolldownOptions:{output:{codeSplitting:false}}}});
  const chunk=(Array.isArray(result)?result[0]:result).output.find(row=>row.type==='chunk');
  if(!chunk)throw Error('Existing native line-driver bundle is missing');
  return '(async()=>{'+chunk.code+'})()';
}

export async function run(context) {
  const packet={fixture:FIXTURE, appearanceFixture:true, naturalFrequencyClaim:false,
    nativeAccepted:false, groundingReviewPending:true, humanListeningPending:true,
    frameMeasurement:false, views:[], rows:[], events:[], sourceHashes:{}};
  const persist=()=>writeFile(join(context.outputDir,'yeti-native.json'),JSON.stringify(packet,null,2)+'\n');
  for(const path of ['tools/scenarios/yeti.mjs','src/yeti.js','src/yeti-view.js',
    'public/assets/models/circuits/kits/yeti.glb','public/assets/models/circuits/kits/yeti-lod.glb'])
    packet.sourceHashes[path]=createHash('sha256').update(await readFile(join(root,path))).digest('hex');
  let started=false;
  try {
    await context.navigate('/tools/menu-check.html?flags=summit-run,yeti,snow-world&p4-kits-native=1');
    await context.waitFor("!!window.__qaApp&&!!window.__render&&document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'",'real memory-only Yeti menu',90000);
    await context.evaluate(await browserHelper());
    packet.start=await context.evaluate(`(async()=>{
      const app=window.__qaApp,fixture=${JSON.stringify(FIXTURE)},qa=window.__yetiQa;
      if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only storage required');
      app.stop();app.setGraphicsQuality('high');app.audio.unlock();app.audio.setMuted(false);
      if(app.audio.context?.state!=='running')throw Error('Actual audio context is not running');
      await app.audio._loadCueBuffers();
      if(!app.audio.cueBuffers['yeti.roar'])throw Error('Existing roar must decode before the encounter');
      app.addPlayer('Yeti native QA');app.profile={...app.profile,credits:5000};
      if(!app._saveProfile()||!app.purchaseCourse('summit-run').ok)throw Error('Actual memory course purchase failed');
      const stage=[...document.querySelector('#scene-select').options].map(option=>Number(option.value)).find(index=>app.getMenuCourse(index)?.def.id==='summit-run');
      if(stage==null)throw Error('Real Summit is absent');
      const previous=Object.getOwnPropertyDescriptor(crypto,'randomUUID');
      let ok;
      try {
        Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=>fixture.runId});
        ok=app.startCampaign({startStage:stage,mode:fixture.mode,car:fixture.car,tyre:fixture.tyre,seed:fixture.baseSeed,difficulty:'casual',cpuDifficulty:'medium'});
      } finally {
        if(previous)Object.defineProperty(crypto,'randomUUID',previous);else delete crypto.randomUUID;
      }
      if(!ok)throw Error('Actual native App start failed');
      const state=app.duel.state;
      if(app.runId!==fixture.runId||state.seed!==fixture.baseSeed||app.duel.course.seed!==fixture.baseSeed||
        state.yetiSeed!==fixture.yetiSeed||state.yetiSeed!==qa.hash32(fixture.baseSeed,app.runId)||!state.yeti?.appears)
        throw Error('Fixed recorded appearance fixture differs from actual start');
      if(state.mode!==fixture.mode||state.car!==fixture.car||state.tyre!==fixture.tyre||state.opponents.length)
        throw Error('Native solo Time Trial configuration differs');
      qa.useRacingLine(app,fixture.skill);app.autopilot=true;
      app._scriptedCrashDone=true; // Existing line-driver convention: no demo shoulder visit.
      const capture=window.__yetiCapture={rows:[],events:[],chunks:[],processor:null,silent:null,
        obstacleJson:JSON.stringify(app.duel.course.features.obstacles),recording:false,startedAt:performance.now()};
      capture.unsubscribe=app.duel.onChange((s,event)=>{
        if(event.yetiSighting)capture.events.push({stageTime:s.stageTimeSec,callout:s.callout,...event.yetiSighting});
      });
      capture.original=app.onFrame;
      app.onFrame=(s,dt)=>{
        capture.original?.(s,dt);
        const age=s.yeti?.seen?s.stageTimeSec-s.yeti.seenAt:null;
        capture.rows.push({stageTime:s.stageTimeSec,status:s.status,s:s.s,lateral:s.lateral,speedMph:s.speedMph,
          seen:s.yeti?.seen===true,seenAt:s.yeti?.seenAt,age,callout:s.callout,paused:s.paused,
          activeRaceSeed:app.profile.activeRace?.yetiSeed});
        if(!capture.recording&&s.status==='racing'&&s.s>=s.yeti.site.s-160){
          capture.recording=true;capture.audioStart=app.audio.context.currentTime;
          const ctx=app.audio.context,processor=ctx.createScriptProcessor(2048,2,2),silent=ctx.createGain();
          silent.gain.value=0;app.audio.output.connect(processor);processor.connect(silent);silent.connect(ctx.destination);
          processor.onaudioprocess=event=>{
            const left=event.inputBuffer.getChannelData(0),right=event.inputBuffer.getChannelData(1),pcm=new Int16Array(left.length*2);
            for(let i=0;i<left.length;i++){pcm[2*i]=Math.round(Math.max(-1,Math.min(1,left[i]))*32767);pcm[2*i+1]=Math.round(Math.max(-1,Math.min(1,right[i]))*32767);}
            capture.chunks.push(pcm);
          };
          capture.processor=processor;capture.silent=silent;
        }
      };
      app.start();
      return {stage,runId:app.runId,yetiSeed:state.yetiSeed,site:{...state.yeti.site},baseSeed:state.seed,
        courseSeed:app.duel.course.seed,mode:state.mode,car:state.car,tyre:state.tyre,memoryOnly:true};
    })()`);
    started=true;
    const deadline=Date.now()+12*60*1000;
    let done=false;
    while(!done&&Date.now()<deadline) {
      const witness=await context.evaluate(`(()=>{
        const app=window.__qaApp,state=app.duel.state,capture=window.__yetiCapture,qa=window.__yetiQa;
        const age=state.yeti?.seen?state.stageTimeSec-state.yeti.seenAt:null;
        const phase=age===null?'idle':age<1.7?'roar':age<3.5?'chest-beat':age<6?'lope':age<12?'walk-off':null;
        const near=state.yeti&&Math.abs(state.s-state.yeti.site.s)<=130;
        const terminal=state.stageTimeSec>600||!['countdown','racing'].includes(state.status);
        if((!state.yeti?.seen&&!near)||!phase)return {phase:null,done:age>=12,terminal,status:state.status,stageTime:state.stageTimeSec};
        const before=JSON.stringify(state);window.__render.renderFrame();
        const group=window.__render.scene.getObjectByName('The yeti'),actor=group?.children.find(child=>child.visible);
        if(!group?.visible||!actor||!app.visualReady)return {phase:null,done:false,terminal,status:state.status,stageTime:state.stageTimeSec};
        const vertex=new qa.THREE.Vector3(),bonePoint=new qa.THREE.Vector3(),feet=[],bones=[];
        actor.traverse(mesh=>{
          if(!mesh.isSkinnedMesh)return;
          bones.push(...mesh.skeleton.bones.map(bone=>({name:bone.name,quaternion:bone.quaternion.toArray()})));
          for(const name of ['FootL','FootR']){
            const joint=mesh.skeleton.bones.findIndex(bone=>bone.name===name);if(joint<0)continue;
            mesh.skeleton.bones[joint].getWorldPosition(bonePoint);
            const nearest=app.duel.course.nearest(bonePoint.x,bonePoint.z,state.yeti.site.s);
            const ground=app.duel.course.groundAt(nearest.s,nearest.lateral);
            const height=qa.renderedGroundHeight(app.duel.course,{x:bonePoint.x,z:bonePoint.z,y:ground.y},{requireSurface:true});
            const weights=mesh.geometry.attributes.skinWeight,indices=mesh.geometry.attributes.skinIndex;
            let low=Infinity,weightedVertices=0;
            for(let i=0;i<weights.count;i++)for(let part=0;part<4;part++)if(indices.getComponent(i,part)===joint&&weights.getComponent(i,part)>.25){
              weightedVertices++;mesh.getVertexPosition(i,vertex).applyMatrix4(mesh.matrixWorld);low=Math.min(low,vertex.y);break;
            }
            if(!weightedVertices)continue;
            feet.push({name,weightedVertices,bone:bonePoint.toArray(),lowestSkinnedVertex:low,renderedGround:height,gap:low-height});
          }
        });
        const bounds=new qa.THREE.Box3().setFromObject(actor,true),centre=bounds.getCenter(new qa.THREE.Vector3());
        const draw=window.__render,camera=draw.camera,position=camera.position.clone(),rotation=camera.quaternion.clone();
        let photo;
        try {
          camera.position.set(centre.x+7,bounds.min.y+3,centre.z+8);camera.lookAt(centre);camera.updateMatrixWorld(true);
          draw.composer.render();photo=draw.renderer.domElement.toDataURL('image/jpeg',.88);
        } finally {camera.position.copy(position);camera.quaternion.copy(rotation);camera.updateMatrixWorld(true);}
        if(JSON.stringify(state)!==before)throw Error('Read-only Yeti inspection changed race state');
        return {phase,phaseFromNativeSeenAge:true,age,stageTime:state.stageTimeSec,s:state.s,lateral:state.lateral,
          callout:state.callout,feet,bones,actorPosition:actor.position.toArray(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},
          obstacleBytesUnchanged:JSON.stringify(app.duel.course.features.obstacles)===capture.obstacleJson,
          photo,done:false,terminal,status:state.status};
      })()`);
      if(witness.phase&&!packet.views.some(view=>view.phase===witness.phase)) {
        const photo=witness.photo;delete witness.photo;
        if(!witness.feet.some(foot=>foot.name==='FootL')||!witness.feet.some(foot=>foot.name==='FootR')||
          witness.feet.some(foot=>!Number.isFinite(foot.gap)||foot.renderedGround===null)||!witness.obstacleBytesUnchanged)
          throw Error('Actual loaded feet, terrain or unchanged collider witness is missing');
        witness.file='yeti-'+witness.phase+'.jpg';
        await writeFile(join(context.outputDir,witness.file),Buffer.from(photo.split(',')[1],'base64'));
        packet.views.push(witness);await persist();
      }
      if(witness.terminal&&!witness.done)throw Error('Native drive ended before all Yeti phases: '+witness.status+' at '+witness.stageTime);
      done=witness.done;
      if(!done)await new Promise(resolve=>setTimeout(resolve,80));
    }
    if(!done)throw Error('Bounded native Yeti drive could not reach the encounter');
    if(phases.some(phase=>!packet.views.some(view=>view.phase===phase)))throw Error('Actual phase pictures are incomplete');
    packet.mechanicalPacketComplete=true;
  } catch(error) {
    packet.mechanicalPacketComplete=false;packet.error=error.message;
  } finally {
    if(started) {
      try {
        const capture=await context.evaluate(`(()=>{
          const app=window.__qaApp,capture=window.__yetiCapture;app.stop();app.onFrame=capture.original;capture.unsubscribe();
          if(capture.processor){app.audio.output.disconnect(capture.processor);capture.processor.disconnect();capture.silent.disconnect();capture.processor.onaudioprocess=null;}
          const pcm=new Int16Array(capture.chunks.reduce((sum,chunk)=>sum+chunk.length,0));let offset=0;
          for(const chunk of capture.chunks){pcm.set(chunk,offset);offset+=chunk.length;}
          const bytes=new Uint8Array(pcm.buffer);let binary='';
          for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
          const result={rows:capture.rows,events:capture.events,rate:app.audio.context.sampleRate,pcm:btoa(binary),
            pcmSamples:pcm.length,pcmFrames:pcm.length/2,
            audioStart:capture.audioStart,recordedInput:app.profile.activeRace?.yetiSeed,
            memoryOnly:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value};
          app.returnToMenu();app.stop();return result;
        })()`);
        const pcm=Buffer.from(capture.pcm,'base64');delete capture.pcm;
        Object.assign(packet,capture);
        if(!capture.pcmSamples||pcm.length!==capture.pcmSamples*2) {
          packet.mechanicalPacketComplete=false;
          packet.error??='Actual roar PCM capture is empty or incomplete';
        } else {
          const wave=wavFromPcm(pcm,capture.rate);
          await writeFile(join(context.outputDir,'yeti-roar-native.wav'),wave);
          packet.loudness=measureLoudness(wave);
        }
        if(packet.mechanicalPacketComplete&&(packet.events.length!==1||packet.events[0].cue!=='yeti.roar'||
          packet.events[0].callout!=='YETI!'||!packet.memoryOnly||!capture.rows.some(row=>row.activeRaceSeed===FIXTURE.yetiSeed))) {
          packet.mechanicalPacketComplete=false;packet.error??='Actual once-only roar/callout or saved recorded input witness is missing';
        }
      } catch(error) {
        packet.mechanicalPacketComplete=false;packet.cleanupError=error.message;
        packet.error??='Native cleanup or audio processing failed: '+error.message;
      }
    }
    await persist();
  }
  if(!packet.mechanicalPacketComplete)throw Error(packet.error||'Native Yeti packet is incomplete');
}
