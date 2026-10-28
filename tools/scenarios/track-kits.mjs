// Real unchanged circuit kits through production world readiness. Memory-only;
// no art round or frame measurement. Run only in the Director's quiet slot.
import {writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'vite';
import {summarizeFrameTiming} from './p4-daynight.mjs';
import {TRACK_KIT_IDS} from '../../src/track-kits.js';

// Claude check-in7: a full city versus an empty track has informative relative
// cost. Kits must meet these absolute targets in both graphics qualities.
export const kitConstructionAccepted = ms => Number.isFinite(ms) && ms >= 0 && ms < 1000;
export const kitDeliveredAccepted = ms => Number.isFinite(ms) && ms >= 0 && ms <= 18.5;


function stage(entries,quality,stageIndex=0) {
  const app=window.__qaApp;
  if (!Object.getOwnPropertyDescriptor(window,'localStorage')?.value ||
      !window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Memory-only QA required');
  app.stop();app.audio.setMuted(true);app.setGraphicsQuality(quality);
  const def=app.getMenuCourse(stageIndex).def;
  const originalDefinition=JSON.stringify(def);
  app.duel.startCampaign({mode:stageIndex===0?'grandprix':'timetrial',startStage:stageIndex,
    car:'falcone_f42',seed:1989,fieldSeed:12,fieldSize:7,cpuDifficulty:'medium'});
  // Circuit catalog definitions are frozen. This run owns a metadata copy;
  // attach it before the first world build without writing the catalog.
  app.duel.course.def={...app.duel.course.def,kitPlacements:entries};
  if(JSON.stringify(def)!==originalDefinition)throw Error('Native catalog changed');
  const course=app.duel.course,target=course.groundAt(230,70),eye=course.groundAt(70,70);
  app.inspectionCamera={position:[eye.x,eye.y+80,eye.z],target:[target.x,target.y+4,target.z]};
  app.onFrame?.(app.duel.state,0);window.__render.renderFrame();
  window.__kitState=JSON.stringify(app.duel.state);window.__kitProfile=JSON.stringify(app.profile);
}

async function snapshotReadiness(context, quality, broken=false) {
  await context.navigate('/tools/menu-check.html?flags=grand-prix,panorama-ridge');
  await context.waitFor('window.__qaApp?.visualReady && !!window.__render','snapshot empty world ready',60000);
  await context.evaluate(`(() => {
    const a=window.__qaApp,v=window.__render;
    if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value || !window.name.startsWith('__duel_qa_tab_v2:'))
      throw Error('Memory-only snapshot QA required');
    a.stop();a.audio.setMuted(true);a.setGraphicsQuality(${JSON.stringify(quality)});
    let index;for(let i=0;i<40;i++)if(a.getMenuCourse(i)?.def.id==='panorama-ridge'){index=i;break;}
    if(index==null)throw Error('Real authored snapshot course missing');
    a.duel.startCampaign({mode:'timetrial',startStage:index,car:'falcone_f42',seed:1989});
    const course=a.duel.course,definition=course.def,original=JSON.stringify(definition);
    course.def={...definition,kitPlacements:${broken ? "[{id:'missing-kit',s:300,lateral:80}]" : "[{id:'shopfront-a',s:300,lateral:45},{id:'shopfront-b',s:300,lateral:70},{id:'gallery',s:300,lateral:0,scale:[1.8,1.3,1]}]"}};
    if(JSON.stringify(definition)!==original)throw Error('Snapshot changed source catalog');
    a.returnToMenu();a.onFrame?.(a.duel.state,0);v.renderFrame();
    window.__snapshotReadOnly=()=>JSON.stringify({state:a.duel.state,profile:a.profile,
      storage:Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).sort().map(k=>[k,localStorage.getItem(k)])});
    window.__snapshotBefore=window.__snapshotReadOnly();window.__snapshotResult={settled:false};window.__snapshotSourceError=null;
    const builds=document.querySelector('#view3d').dataset.worldBuilds;
    v.captureTrackSnapshot({course,flag:{id:'kit-ready',snapshotS:280,camera:{up:1.35,ahead:55}}})
      .then(canvas=>{window.__snapshotCanvas=canvas;window.__snapshotResult={settled:true,ok:true};},
        error=>{window.__snapshotResult={settled:true,ok:false,error:error.message};});
    v.renderFrame();
    if(document.querySelector('#view3d').dataset.worldBuilds!==builds || document.querySelector('#view3d').dataset.trackSnapshot)
      throw Error('Snapshot bypassed pending real kit preparation');
    if(window.__snapshotReadOnly()!==window.__snapshotBefore)throw Error('Pending snapshot changed race/profile/storage');
  })()`);
  await context.waitFor(`(() => {window.__render.renderFrame();const a=window.__qaApp;a.onFrame?.(a.duel.state,0);
    const host=document.querySelector('#view3d');
    if(!window.__snapshotResult.settled&&host.dataset.trackKitAsset==='error') {
      if(host.dataset.trackSnapshot || !host.dataset.trackKitError || document.querySelector('#renderer-error').hidden)
        throw Error('Pending broken snapshot hid its visible source error or drew fallback');
      window.__snapshotSourceError=host.dataset.trackKitError;
    }
    return window.__snapshotResult.settled;})()`,quality+' snapshot completion/error',25000);
  const detail=await context.evaluate(`(() => {
    const result=window.__snapshotResult,v=window.__render,host=document.querySelector('#view3d');
    if(window.__snapshotReadOnly()!==window.__snapshotBefore)throw Error('Snapshot changed complete race/profile/storage');
    if(${broken}) {
      if(result.ok || host.dataset.trackSnapshot || !window.__snapshotSourceError)
        throw Error('Broken snapshot owner drew fallback or hid source error');
      if(!result.error.includes('too long'))throw Error('Existing snapshot timeout/error path changed');
      v.clearTrackSnapshot();return {broken:true,error:result.error};
    }
    if(!result.ok || host.dataset.trackKitAsset!=='ready' || host.dataset.trackSnapshot!=='kit-ready')
      throw Error('Snapshot did not wait for approved assets');
    const kits=v.scene.getObjectByName('Approved track kits');
    if(kits?.userData.trackKitPlacements.length!==3)throw Error('Snapshot lacks actual authored placements');
    let high=0,lod=0,textures=0;
    kits.traverse(n=>{if(!n.isInstancedMesh)return;const active=n.visible&&n.count>0;
      if(n.count!==n.userData.trackKitDrawnPlacementIndices?.length)throw Error('Snapshot packed count mismatch');
      for(let i=0;i<n.count;i++)if(!Math.hypot(...n.instanceMatrix.array.slice(i*16,i*16+3)))
        throw Error('Snapshot submitted a zero-scale instance');
      if(active){if(n.userData.trackKitVersion==='high')high++;else if(n.userData.trackKitVersion==='low')lod++;}
      for(const m of [].concat(n.material||[]))for(const value of Object.values(m))if(value?.isTexture&&value.image?.width)textures++;});
    if(!textures || (${JSON.stringify(quality)}==='high'?!high:high||!lod))throw Error('Snapshot quality versions/textures incomplete');
    const canvas=window.__snapshotCanvas,data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,colours=new Set();
    for(let i=0;i<data.length;i+=64)colours.add([data[i]>>4,data[i+1]>>4,data[i+2]>>4].join(','));
    if(colours.size<20)throw Error('Snapshot pixels blank');
    kits.traverse(n=>{if(n.isMesh&&/^lamp-[1-5]$/.test(n.name)&&n.material.emissiveIntensity)throw Error('Snapshot lit race countdown lamps');});
    return {quality:${JSON.stringify(quality)},high,lod,textures,colours:colours.size,placements:3};
  })()`);
  if(!broken) {
    detail.capture=await context.screenshot('track-kits-snapshot-'+quality);
    await context.evaluate(`(() => {window.__render.clearTrackSnapshot();
      if(window.__snapshotReadOnly()!==window.__snapshotBefore)throw Error('Clearing snapshot changed state');})()`);
  }
  return detail;
}

const HARBOUR_HEAD='e96d52bb4eb1f841b7be477a3e9ec707ff415ba7';

async function denseDriverBundle() {
  const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
  const entry=join(root,'.qa-dist/track-kits-driver.virtual.js').replaceAll('\\','/');
  const result=await build({root,configFile:false,logLevel:'silent',plugins:[{
    name:'track-kits-private-driver',
    resolveId(id){if(id.replaceAll('\\','/')===entry)return '\0track-kits-driver';},
    load(id){if(id==='\0track-kits-driver')return "export {useRacingLine} from "+
      JSON.stringify(join(root,'tools/track-script-drive.mjs').replaceAll('\\','/'))+';';},
  }],build:{write:false,minify:false,lib:{entry,name:'TrackKitsDriverQa',formats:['es']}}});
  return (Array.isArray(result)?result[0]:result).output.find(row=>row.type==='chunk').code;
}

function densePrepare(quality,present=true) {
  const app=window.__qaApp;
  if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value ||
      !window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only dense QA required');
  app.stop();app.audio.setMuted(true);app.setGraphicsQuality(quality);app.cameraMode='chase';
  let stage;
  for(let i=0;i<40;i++)if(app.getMenuCourse(i)?.def.id==='harbour-lights'){stage=i;break;}
  if(stage==null)throw Error('Pinned actual Harbour definition was not admitted');
  const definition=app.getMenuCourse(stage).def;
  if(definition.kitPlacements?.length!==1969)throw Error('Exact dense authored placements missing');
  app.duel.startCampaign({mode:'grandprix',startStage:stage,car:'falcone_f42',difficulty:'casual',
    cpuDifficulty:'medium',seed:1989,fieldSeed:12,fieldSize:7});
  if(app.duel.state.mode!=='grandprix'||app.duel.state.opponents.length!==7||
      app.duel.course.def.kitPlacements!==definition.kitPlacements)
    throw Error('Metadata-only hybrid did not create the genuine eight-car GP');
  if(!present)app.duel.course.def={...app.duel.course.def,kitPlacements:[]};
  app.autopilot=true;app._scriptedCrashDone=true;
  TrackKitsDriverQa.useRacingLine(app,.95);
  app.onFrame?.(app.duel.state,0);window.__render.renderFrame();
}

async function denseWitness() {
  const app=window.__qaApp,view=window.__render,renderer=view.renderer;
  const group=view.scene.getObjectByName('Approved track kits');
  if(group?.userData.trackKitPlacements.length!==1969)throw Error('Dense owner is incomplete');
  const readOnly=()=>JSON.stringify({state:app.duel.state,profile:app.profile,
    storage:Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).sort().map(k=>[k,localStorage.getItem(k)])});
  const stateBefore=readOnly(),original=renderer.render,rears=[];let main=null;
  const witness=()=>({stats:{...group.userData.trackKitStats},visible:group.visible,
    meshes:group.children.map(mesh=>({version:mesh.userData.trackKitVersion,
      chunk:mesh.userData.trackKitChunk,visible:mesh.visible,count:mesh.isInstancedMesh?mesh.count:null,
      indices:mesh.userData.trackKitDrawnPlacementIndices??[mesh.userData.trackKitPlacementIndex],
      matrices:Array.from(mesh.isInstancedMesh?mesh.instanceMatrix.array:mesh.matrix.elements)}))});
  function counts(packet) {
    const high=new Set(),low=new Set(),chunks=new Set();let primitives=0;
    for(const mesh of packet.meshes){
      if(!mesh.visible||mesh.count===0)continue;
      if(mesh.count!==null){
        if(mesh.count!==mesh.indices.length)throw Error('Dense packed count differs from active indices');
        for(let i=0;i<mesh.count;i++)for(const axis of [0,4,8])
          if(!(Math.hypot(...mesh.matrices.slice(i*16+axis,i*16+axis+3))>0))
            throw Error('Dense GPU submitted a zero-scale instance');
      }
      primitives+=mesh.count??1;chunks.add(mesh.chunk);
      for(const index of mesh.indices)(mesh.version==='high'?high:low).add(index);
    }
    if([...high].some(index=>low.has(index)))throw Error('Dense GPU submits both versions of one placement');
    return {high:high.size,low:low.size,chunks:[...chunks],submittedPrimitives:primitives};
  }
  renderer.render=function(scene,camera){
    if(scene===view.scene){
      const packet=witness();
      if(camera===view.camera)main=packet;
      else if(renderer.getRenderTarget()){
        const row=counts(packet);
        if(row.high||row.chunks.length>3)throw Error('Actual dense rear violates distant/nearest chunk contract');
        rears.push(row);
      }
    }
    return original.call(this,scene,camera);
  };
  try{
    for(let i=0;i<18&&!rears.length;i++){
      await new Promise(resolve=>requestAnimationFrame(resolve));view.renderFrame();
      if(main&&JSON.stringify(witness())!==JSON.stringify(main))throw Error('Dense rear did not restore exact main packing');
    }
    if(!main||!rears.length)throw Error('Actual dense main/rear submissions were not observed');
    if(readOnly()!==stateBefore)throw Error('Dense rendering changed race/profile/storage');
    const keys=view.scene.children.filter(node=>node.visible&&node.userData.vehicleKey).map(node=>node.userData.vehicleKey);
    if(keys.length!==8)throw Error('Dense view does not retain all eight genuine cars');
    const timing={...group.userData.trackKitStats.presentation};
    if(!Number.isFinite(timing.constructionMs)||timing.constructionMs<0||
      !Number.isFinite(timing.activeCpuMs)||timing.activeCpuMs<0||timing.activeCpuMs>timing.constructionMs)
      throw Error('Dense actual construction timings are missing or inconsistent');
    const mainCounts=counts(main);
    if(!mainCounts.high&&!mainCounts.low)throw Error('Dense main submits no authored street');
    return {s:app.duel.state.s,stageTimeSec:app.duel.state.stageTimeSec,cars:keys,
      placements:1969,construction:timing,underOneSecond:timing.constructionMs<1000,
      main:mainCounts,rears,clearance:{...group.userData.trackKitStats.clearance}};
  } finally {renderer.render=original;}
}

export function installMainRearMeasurement(quality) {
  const app=window.__qaApp,view=window.__render;
  const gl=view.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const owner=quality==='high'?view.composer:view.composer.passes[0],originalDraw=owner.render;
  const originalDiagnostics=app.frameDiagnostics;
  const stable=()=>JSON.stringify({state:app.duel.state,profile:app.profile,
    storage:Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).sort().map(k=>[k,localStorage.getItem(k)])});
  const run=window.__mainRearFrames={frames:[],cpu:[],gpu:[],update:[],combined:[],pending:[],
    seen:0,active:false,done:false,disjoint:false,previous:null,currentQuery:null,
    gpuSupported:!!ext,scales:new Set(),ratios:new Set(),before:stable(),calls:[],triangles:[]};
  const poll=()=>{
    if(!ext||run.disjoint)return;
    if(gl.getParameter(ext.GPU_DISJOINT_EXT)){run.disjoint=true;return;}
    for(let i=run.pending.length-1;i>=0;i--){const query=run.pending[i];
      if(!gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE))continue;
      run.gpu.push(gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6);gl.deleteQuery(query);run.pending.splice(i,1);
    }
  };
  const endQuery=()=>{if(run.currentQuery){gl.endQuery(ext.TIME_ELAPSED_EXT);
    run.pending.push(run.currentQuery);run.currentQuery=null;}};
  owner.render=function(...args){
    poll();
    if(run.active&&ext&&!run.disjoint&&run.pending.length<32&&!gl.getQuery(ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY)){
      run.currentQuery=gl.createQuery();if(run.currentQuery)gl.beginQuery(ext.TIME_ELAPSED_EXT,run.currentQuery);
    }
    try{return originalDraw.apply(this,args);}
    catch(error){endQuery();throw error;}
    // The query ends after the actual rear draw in recordRendererFrame.
  };
  app.frameDiagnostics={active:true,now:()=>performance.now(),recordAppFrame(){},stop(){},
    recordRendererFrame(now,updateMs,submitMs){
      endQuery();if(run.done)return;
      if(++run.seen<=120)return;
      run.active=true;
      if(run.previous!==null)run.frames.push(now-run.previous);
      run.previous=now;run.cpu.push(submitMs);run.update.push(updateMs);run.combined.push(updateMs+submitMs);
      run.scales.add(document.querySelector('#view3d').dataset.resolutionScale||'1');
      run.ratios.add(view.renderer.getPixelRatio());run.calls.push(view.renderer.info.render.calls);
      run.triangles.push(view.renderer.info.render.triangles);
      if(run.cpu.length>=360){run.active=false;run.done=true;run.after=stable();poll();}
    }};
  run.poll=poll;
  run.cleanup=()=>{endQuery();owner.render=originalDraw;app.frameDiagnostics=originalDiagnostics;
    for(const query of run.pending)gl.deleteQuery(query);run.pending.length=0;};
}

export async function measureMainRearFrames(context,quality,label) {
  await context.evaluate('('+installMainRearMeasurement.toString()+')('+JSON.stringify(quality)+')');
  try{
    await context.waitFor('window.__mainRearFrames.done',quality+' '+label+' main/rear frames',60000);
    await context.waitFor('(()=>{const r=window.__mainRearFrames;r.poll();return !r.pending.length||r.disjoint;})()',
      'dense full main/rear GPU timers',10000);
    const row=await context.evaluate(`(()=>{const r=window.__mainRearFrames;
      if(r.disjoint||r.before!==r.after)throw Error('Dense timing disjoint or changed native state');
      return {frames:r.frames,cpu:r.cpu,gpu:r.gpu,update:r.update,combined:r.combined,
        gpuSupported:r.gpuSupported,scales:[...r.scales],ratios:[...r.ratios],calls:r.calls,triangles:r.triangles,
        raceState:JSON.stringify(window.__qaApp.duel.state),
        actorPoses:window.__render.scene.children.filter(node=>node.visible&&node.userData.vehicleKey)
          .map(node=>({car:node.userData.vehicleKey,position:node.position.toArray(),quaternion:node.quaternion.toArray()}))};})()`);
    const pacing={delivered:summarizeFrameTiming(row.frames),cpu:summarizeFrameTiming(row.cpu),gpu:summarizeFrameTiming(row.gpu)};
    if(row.scales.length!==1||row.ratios.length!==1||pacing.cpu?.samples!==360||pacing.delivered?.samples!==359||
      row.gpuSupported&&(!pacing.gpu||pacing.gpu.samples<288))throw Error('Incomplete or changing dense frame sample');
    return {quality,label,pacing,gpuSupported:row.gpuSupported,scales:row.scales,ratios:row.ratios,
      update:summarizeFrameTiming(row.update),combined:summarizeFrameTiming(row.combined),
      raceState:row.raceState,actorPoses:row.actorPoses,orderedSamples:row};
  }finally{await context.evaluate('window.__mainRearFrames.cleanup()');}
}

async function denseFrameSample(context,quality,place,present,pair) {
  await context.evaluate(`(()=>{const group=window.__render.scene.getObjectByName('Approved track kits');
    if(!!group!==${present})throw Error('Dense baseline must omit only kit metadata before world construction');})()`);
  return {...await measureMainRearFrames(context,quality,place),place,present,pair};
}

async function setupDenseFixture(context,quality,bundle,present,place) {
  await context.navigate('/tools/menu-check.html?flags=grand-prix,harbour-lights&harness=kit-dense');
  await context.waitFor('window.__qaApp?.visualReady&&!!window.__render','dense empty menu ready',60000);
  await context.evaluate(`(async () => {
      const url = URL.createObjectURL(new Blob([${JSON.stringify(bundle)}], {type: 'text/javascript'}));
      try { window.TrackKitsDriverQa = await import(url); }
      finally { URL.revokeObjectURL(url); }
    })()`);
  await context.evaluate('('+densePrepare.toString()+')('+JSON.stringify(quality)+','+present+')');
  await context.waitFor(`(()=>{const a=window.__qaApp;window.__render.renderFrame();a.onFrame?.(a.duel.state,0);
    return a.visualReady&&document.querySelector('#view3d').dataset.trackKitAsset===${JSON.stringify(present?'ready':'off')};})()`,
    quality+' dense actual assets/shaders ready',60000);
  if(place==='old-town')await context.evaluate(`(()=>{const a=window.__qaApp;let ticks=0;
    while(a.duel.state.s<1330&&ticks++<60*420&&!['stage_result','gameover','complete'].includes(a.duel.state.status))a.advance(1/60,1/60);
    if(a.duel.state.status!=='racing'||a.duel.state.s<1330||a.duel.state.opponents.length!==7)
      throw Error('Actual native driver did not reach the old town with its genuine field');
    a.onFrame?.(a.duel.state,0);window.__render.renderFrame();})()`);
}

async function denseHarbour(context,report,persist) {
  if(!process.env.P4_KIT_HARBOUR_SOURCE)throw Error('Dense QA requires the explicit pinned Harbour source environment');
  const frames=process.env.P4_KIT_DENSE_FRAMES==='1',bundle=await denseDriverBundle();
  report.dense={hybrid:{definitionSource:HARBOUR_HEAD,engine:'4527b3f5 integration plus owned loader; additive QA Harbour eligibility only',
    genuineGrid:true,placements:1969},acceptancePolicy:'claude-check-in7-absolute',
    qualities:[],frames:[],comparisons:[],failures:[],frameStatus:frames?'running':'not scheduled'};
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  for(const quality of ['high','performance'])for(const place of ['grid','old-town']){
    await setupDenseFixture(context,quality,bundle,true,place);
    const witness=await context.evaluate('('+denseWitness.toString()+')()');
    witness.quality=quality;witness.place=place;witness.capture=await context.screenshot('track-kits-dense-'+quality+'-'+place);
    if(quality==='performance'&&witness.main.high)throw Error('Dense Performance submitted High placements');
    if(quality==='high'&&!witness.main.high)throw Error('Dense near High placements missing');
    if(place==='old-town'&&!witness.rears.some(row=>row.low>0))throw Error('Actual old-town rear street was not observed');
    if(!kitConstructionAccepted(witness.construction.constructionMs))report.dense.failures.push(quality+' '+place+' total construction '+witness.construction.constructionMs+'ms exceeds1s');
    report.dense.qualities.push(witness);await persist();
    if(frames)for(const pair of [1,2]){
      for(const present of pair===1?[false,true]:[true,false]){
        // Fresh seeded fixtures remove all loader CPU from the genuine off leg.
        // Omit only kitPlacements before world creation; preserve actual rules.
        await setupDenseFixture(context,quality,bundle,present,place);
        report.dense.frames.push(await denseFrameSample(context,quality,place,present,pair));await persist();
      }
      const off=report.dense.frames.find(row=>row.quality===quality&&row.place===place&&row.pair===pair&&!row.present);
      const on=report.dense.frames.find(row=>row.quality===quality&&row.place===place&&row.pair===pair&&row.present);
      for(const key of ['scales','ratios'])if(JSON.stringify(off[key])!==JSON.stringify(on[key]))throw Error('Dense paired resolution differs');
      if(off.raceState!==on.raceState||JSON.stringify(off.actorPoses)!==JSON.stringify(on.actorPoses))
        throw Error('Dense paired native race state or eight-car poses differ');
      const addedPercent={};
      for(const key of ['delivered','cpu','gpu'])addedPercent[key]=off.pacing[key]&&on.pacing[key]?(on.pacing[key].p95/off.pacing[key].p95-1)*100:null;
      addedPercent.combined=(on.combined.p95/off.combined.p95-1)*100;
      const comparison={quality,place,pair,addedPercent,relativeInformational:true,deliveredP95:on.pacing.delivered.p95};
      report.dense.comparisons.push(comparison);
      if(!kitDeliveredAccepted(on.pacing.delivered.p95))
        report.dense.failures.push(quality+' '+place+' pair'+pair+' exceeds delivered18.5ms');
      await persist();
    }
  }
  if(frames)report.dense.frameStatus=report.dense.failures.length?'failed':'passed';
  if(report.dense.failures.length)throw Error(report.dense.failures.join('; '));
}

export async function run(context) {
  const report={passed:false,qualities:[],snapshots:[]};
  const persist=()=>writeFile(join(context.outputDir,'track-kits.json'),JSON.stringify(report,null,2)+'\n');
  try {
    if(process.env.P4_KIT_DENSE_ONLY==='1'){
      await denseHarbour(context,report,persist);report.passed=true;return;
    }
    for(const quality of ['high','performance']) {
      report.snapshots.push(await snapshotReadiness(context,quality));
      report.snapshots.push(await snapshotReadiness(context,quality,true));
      await persist();
      await context.navigate('/tools/menu-check.html?flags=grand-prix');
      await context.waitFor('window.__qaApp?.visualReady && !!window.__render','native empty-route ready',60000);
      // The Ardennes beech binds only to an existing Ardennes tree (src/track-kits.js), so it cannot be placed freely on
      // this route; the real Ardennes course supplies it through its own placements (test-track-kits, ardennes-views).
      const rows=TRACK_KIT_IDS.filter(id=>id!=='ardennes-beech').map((id,index)=>id==='start-gantry'?{id,s:15,lateral:0}:
        id==='gallery'?{id,s:65,lateral:0,scale:[1.8,1.3,1]}:
        {id,s:120+Math.floor(index/4)*35,lateral:40+(index%4)*25});
      await context.evaluate('('+stage.toString()+')('+JSON.stringify(rows)+','+JSON.stringify(quality)+')');
      await context.waitFor(`(() => {const a=window.__qaApp;window.__render.renderFrame();a.onFrame?.(a.duel.state,0);
        return document.querySelector('#view3d').dataset.trackKitAsset==='ready' && a.visualReady;})()`,
        quality+' complete native kit world and shader preparation',60000);
      const detail=await context.evaluate(`(() => {
        const app=window.__qaApp,view=window.__render,group=view.scene.getObjectByName('Approved track kits');
        if(!group?.children.length)throw Error('Production world kit group missing');
        const versions=new Set(),textures=new Set();let batches=0,skins=0;
        group.traverse(node=>{if(node.isInstancedMesh){batches++;versions.add(node.userData.trackKitVersion);}
          if(node.isSkinnedMesh)skins++;
          if(node.isMesh)for(const material of [].concat(node.material||[]))
            for(const value of Object.values(material))if(value?.isTexture)textures.add(value);});
        if(!batches||!skins||versions.size!==2||!textures.size)throw Error('Real native High/LOD kit content incomplete');
        for(const texture of textures){const image=texture.image;if(!image||!image.width||!image.height)
          throw Error('Actual runtime kit texture failed decoding');}
        const highBatches=group.children.filter(node=>node.isInstancedMesh&&node.userData.trackKitVersion==='high');
        const active=mesh=>mesh.visible&&mesh.count>0;
        for(const mesh of group.children.filter(node=>node.isInstancedMesh)){
          if(mesh.count!==mesh.userData.trackKitDrawnPlacementIndices?.length)throw Error('Native packed count mismatch');
          for(let i=0;i<mesh.count;i++)if(!Math.hypot(...mesh.instanceMatrix.array.slice(i*16,i*16+3)))
            throw Error('Native submitted a zero-scale instance');
        }
        if(${JSON.stringify(quality)}==='performance'&&highBatches.some(active))throw Error('Performance submitted High kit instances');
        if(${JSON.stringify(quality)}==='high'&&!highBatches.some(active))throw Error('Near High kit instances missing');
        if(view.renderer.info.programs.some(program=>!program.isReady()))throw Error('Kit world claimed ready before native shader readiness');
        if(JSON.stringify(app.duel.state)!==window.__kitState||JSON.stringify(app.profile)!==window.__kitProfile)
          throw Error('Kit loading or rendering changed race/profile');
        return {batches,skins,textures:textures.size,worldBuilds:document.querySelector('#view3d').dataset.worldBuilds,
          programs:view.renderer.info.programs.length};
      })()`);
      // Observe real main/rear GPU submissions, retaining complete native state.
      detail.packedViews=await context.evaluate(`(async () => {
        const app=window.__qaApp,view=window.__render,renderer=view.renderer;
        const group=view.scene.getObjectByName('Approved track kits');
        const readOnly=()=>JSON.stringify({state:app.duel.state,profile:app.profile,
          storage:Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).sort().map(k=>[k,localStorage.getItem(k)])});
        const stateBefore=readOnly(),original=renderer.render,rears=[];let main=null;
        const witness=()=>({stats:{...group.userData.trackKitStats},meshes:group.children.map(mesh=>({
          name:mesh.name,version:mesh.userData.trackKitVersion,chunk:mesh.userData.trackKitChunk,
          visible:mesh.visible,count:mesh.isInstancedMesh?mesh.count:null,
          indices:mesh.userData.trackKitDrawnPlacementIndices??null,
          matrices:mesh.isInstancedMesh?Array.from(mesh.instanceMatrix.array):Array.from(mesh.matrix.elements)}))});
        renderer.render=function(scene,camera){
          if(scene===view.scene){
            const packet=witness();
            if(camera===view.camera)main=packet;
            else if(renderer.getRenderTarget()){
              const active=packet.meshes.filter(mesh=>mesh.visible&&(mesh.count===null||mesh.count>0));
              if(active.some(mesh=>mesh.version==='high'))throw Error('Actual rear submitted detailed kits');
              if(new Set(active.map(mesh=>mesh.chunk)).size>3)throw Error('Actual rear submitted too many chunks');
              rears.push({chunks:[...new Set(active.map(mesh=>mesh.chunk))],
                instances:active.reduce((sum,mesh)=>sum+(mesh.count??1),0)});
            }
          }
          return original.call(this,scene,camera);
        };
        try{
          for(let i=0;i<12&&!rears.length;i++){
            await new Promise(resolve=>requestAnimationFrame(resolve));view.renderFrame();
            if(main&&JSON.stringify(witness())!==JSON.stringify(main))throw Error('Actual rear did not restore exact main packing');
          }
          if(!main||!rears.length)throw Error('Actual main/rear GPU submissions were not observed');
          if(readOnly()!==stateBefore)throw Error('Native packed-view witness changed race/profile/storage');
          return {mainChunks:main.stats.visibleChunks,mainHigh:main.stats.high,mainLow:main.stats.low,rears};
        }finally{renderer.render=original;}
      })()`);
      // Advance the actual seeded GP countdown without running race physics.
      for(let light=1;light<=5;light++) {
        await context.evaluate(`(() => {const app=window.__qaApp;let steps=0;
          while(app.duel.state.status==='countdown'&&app.duel.state.field.start.lights<${light}&&steps++<30)app.duel.step(.05);
          if(app.duel.state.field.start.lights!==${light})throw Error('Native countdown did not reach expected light');
          const before=JSON.stringify(app.duel.state);window.__render.renderFrame();
          const group=window.__render.scene.getObjectByName('Approved track kits');
          let count=0;group.traverse(node=>{if(node.isMesh&&/^lamp-[1-5]$/.test(node.name)){
            const expected=Number(node.name.slice(-1))<=${light};
            if((node.material.emissiveIntensity>0)!==expected)throw Error('Genuine GP lamp sequence mismatch');count++;}});
          if(count!==10)throw Error('Both native gantry versions need five named lamps');
          if(app.duel.state.field.start.lights!==${light}||JSON.stringify(app.duel.state)!==before)
            throw Error('Presentation changed genuine countdown');})()`);
      }
      await context.evaluate(`(() => {const a=window.__qaApp;let steps=0;while(a.duel.state.status==='countdown'&&steps++<60)a.duel.step(.05);
        if(a.duel.state.status!=='racing')throw Error('Native bounded countdown did not finish');
        const before=JSON.stringify(a.duel.state);window.__render.renderFrame();
        const group=window.__render.scene.getObjectByName('Approved track kits');
        group.traverse(node=>{if(node.isMesh&&/^lamp-[1-5]$/.test(node.name)&&node.material.emissiveIntensity!==0)
          throw Error('Countdown lamps did not go dark');});
        if(JSON.stringify(a.duel.state)!==before)throw Error('Lights-out render changed simulation');})()`);
      const overview=await context.screenshot('track-kits-'+quality);
      report.qualities.push({quality,overview,...detail});await persist();
      // A bad authored source uses the existing visible error and never claims ready.
      await context.evaluate('('+stage.toString()+')('+JSON.stringify([{id:'missing-kit',s:100,lateral:80}])+','+JSON.stringify(quality)+')');
      await context.waitFor(`(() => {const a=window.__qaApp;window.__render.renderFrame();a.onFrame?.(a.duel.state,0);
        return document.querySelector('#view3d').dataset.trackKitAsset==='error' &&
          !document.querySelector('#renderer-error').hidden && !a.visualReady;})()`,quality+' visible source failure',10000);
      await context.evaluate(`(() => {const group=window.__render.scene.getObjectByName('Approved track kits');
        if(document.querySelector('#renderer-error strong').textContent!=="The track scenery couldn't load.")
          throw Error('Kit source error not shown');
        const app=window.__qaApp;app.returnToMenu();app.onFrame?.(app.duel.state,0);window.__render.renderFrame();})()`);
      await context.waitFor(`(() => {window.__render.renderFrame();return window.__qaApp.visualReady &&
        document.querySelector('#view3d').dataset.trackKitAsset==='off';})()`,quality+' empty route recovery',60000);
    }
    await context.navigate('/tools/menu-check.html?flags=grand-prix,panorama-ridge');
    await context.waitFor('window.__qaApp?.visualReady && !!window.__render','authored terrain menu ready',60000);
    const panoramaStage=await context.evaluate(`(() => {const a=window.__qaApp;
      for(let i=0;i<40;i++){const c=a.getMenuCourse(i);if(c?.def.id==='panorama-ridge')return i;}throw Error('Authored Panorama missing');})()`);
    await context.evaluate('('+stage.toString()+')('+JSON.stringify([
      {id:'shopfront-a',s:500,lateral:100},{id:'shopfront-b',s:500,lateral:125},
      {id:'gallery',s:300,lateral:0,scale:[1.8,1.3,1]},
    ])+',"high",'+panoramaStage+')');
    await context.waitFor(`(() => {const a=window.__qaApp;window.__render.renderFrame();a.onFrame?.(a.duel.state,0);
      return a.visualReady&&document.querySelector('#view3d').dataset.trackKitAsset==='ready';})()`,
      'authored near/far ground and real kit world ready',60000);
    report.terrain=await context.evaluate(`(() => {const a=window.__qaApp,c=a.duel.course,v=window.__render;
      const target=c.groundAt(500,84),eye=c.groundAt(400,84);
      a.inspectionCamera={position:[eye.x,eye.y+70,eye.z],target:[target.x,target.y,target.z]};
      const before=JSON.stringify(a.duel.state);v.renderFrame();
      const kits=v.scene.getObjectByName('Approved track kits');
      if(kits?.userData.trackKitPlacements.length!==3)throw Error('Actual authored kit placement witness incomplete');
      if(before!==JSON.stringify(a.duel.state))throw Error('Authored terrain inspection changed race');
      return {course:c.def.id,placements:kits.userData.trackKitPlacements,worldBuilds:document.querySelector('#view3d').dataset.worldBuilds};})()`);
    report.terrain.capture=await context.screenshot('track-kits-authored-terrain-join');
    if(process.env.P4_KIT_HARBOUR_SOURCE)await denseHarbour(context,report,persist);
    report.passed=true;
  } finally {await persist();}
  console.log('Track kits: real textures, both native qualities, genuine countdown, read-only state and visible source failure passed.');
}
