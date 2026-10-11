// Genuine App loading/driving; only the disposable QA course definition changes.
// No positions, laps, field members or results are injected. Timing is separate.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {installMeasurement,summarizeFrameTiming} from './p4-daynight.mjs';

function prepareNative(quality) {
  const app=window.__qaApp;
  if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value ||
      !window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Snow requires memory-only QA.');
  app.stop();app.audio.setMuted(true);app.setGraphicsQuality(quality);
  const def=app.getMenuCourse(0).def;
  window.__snowOriginal={def,values:{...def}};
  Object.assign(def,{name:'Winter renderer QA',theme:'alpine',closed:true,laps:3,
    hasRadar:false,noTraffic:true,airborne:true,layoutVersion:90,terrainHalfWidth:64,kind:'circuit',
    scenery:{trees:100,rocks:30,mountains:true},
    script:[['straight',500,{name:'Lodge Straight',width:16,surface:'snow',climb:40,walls:'none'}],
      ['turn','L',180,80,{name:'Exposed Ridge',width:16,walls:'none'}],
      ['straight',500,{name:'Dry Descent',width:16,climb:-40,walls:'none'}],
      ['turn','L',180,80,{name:'Home Bend',width:16,walls:'none'}]],
    surfacePatches:[{id:'shaded-winter-ice',kind:'ice',s0:540,s1:575,shaded:true}],
    snowWorld:{ranges:[{from:0,to:750}],exposed:[{from:500,to:730}],
      ponds:[{s:180,lateral:32,radiusX:9,radiusZ:12},{s:600,lateral:58,radiusX:12,radiusZ:8}]}});
  window.__snowBeforeBuilds=Number(document.querySelector('#view3d').dataset.worldBuilds||0);
  app._menuCourses.clear();app.onFrame?.(app.duel.state,0);
}

function startNative(){
  const app=window.__qaApp;
  window.__snowMenuCourse=app.getMenuCourse(0);
  if(!app.startCampaign({startStage:0,mode:'grandprix',qualifying:false,seed:1989,
      fieldSeed:444,car:'falcone_f42',difficulty:'casual',cpuDifficulty:'medium',tyre:'winter'}))
    throw Error('The actual full-field winter race did not start.');
  app.autopilot=true;app._scriptedCrashDone=true;app.stop();
  if(app.duel.state.opponents.length!==7 || app.duel.state.field?.size!==8)
    throw Error('Snow review requires eight native race actors.');
  app.onFrame?.(app.duel.state,0);
}

function setView(view) {
  const app=window.__qaApp,api=window.__render,course=app.duel.course,state=app.duel.state;
  if(view==='grid'||view==='frame'){
    const poses=[state,...state.opponents].map(actor=>course.groundAt(actor.s,actor.lateral));
    const center=poses.reduce((p,a)=>({x:p.x+a.x/poses.length,y:p.y+a.y/poses.length,z:p.z+a.z/poses.length}),{x:0,y:0,z:0});
    const heading=course.at(state.s).heading;
    const radius=Math.max(...poses.map(p=>Math.hypot(p.x-center.x,p.z-center.z)));
    const back=view==='frame'?Math.max(52,radius*2.4):52,height=view==='frame'?Math.max(23,radius*1.5):23;
    app.inspectionCamera={position:[center.x-Math.sin(heading)*back,center.y+height,center.z-Math.cos(heading)*back],
      target:[center.x,center.y+1,center.z]};
  }else{
    const p=course.groundAt(state.s,0),h=p.heading;
    app.inspectionCamera={position:[p.x-Math.sin(h)*24+Math.cos(h)*7,p.y+9,p.z-Math.cos(h)*24-Math.sin(h)*7],
      target:[p.x+Math.sin(h)*28,p.y+1,p.z+Math.cos(h)*28]};
    if(view==='ridge')app.inspectionCamera={
      position:[p.x-Math.sin(h)*42+Math.cos(h)*15,p.y+25,p.z-Math.cos(h)*42-Math.sin(h)*15],
      target:[p.x+Math.sin(h)*28,p.y+1,p.z+Math.cos(h)*28]};
    if(view==='pond'){
      const pond=course.groundAt(180,32);
      app.inspectionCamera={position:[pond.x-18,pond.y+14,pond.z-28],target:[pond.x,pond.y,pond.z]};
    }
  }
  // Freeze only the presentation camera before a static timing witness.
  if(view==='frame')api.camera.position.fromArray(app.inspectionCamera.position);
  api.renderFrame();
}

function witness(view) {
  const app=window.__qaApp,api=window.__render,state=app.duel.state;
  const snow=api.scene.getObjectByName('Authored snow world');
  const flakes=snow?.getObjectByName('Camera-local snow and ridge gusts');
  const tracks=snow?.getObjectByName('Actual wheel snow tracks');
  if(!snow||!flakes||!tracks)throw Error('Native Snow world/effects are missing.');
  const terrain=[],terrainMeshes=[];api.scene.traverse(mesh=>{
    if(mesh.isMesh && mesh.geometry?.attributes.winterWeight){
      terrainMeshes.push(mesh);const weight=mesh.geometry.attributes.winterWeight;
      terrain.push({vertices:weight.count,white:[...weight.array].filter(v=>v>.9).length,
        dry:[...weight.array].filter(v=>v===0).length,key:mesh.material.customProgramCacheKey()});
    }
  });
  if(terrain.length<2 || !terrain.some(row=>row.white>0&&row.dry>0&&row.key.includes('winter')))
    throw Error('Actual near/far ground triangles do not carry winter coverage.');
  const kits=api.scene.getObjectByName('Approved track kits');
  const placements=kits?.userData.trackKitPlacements,kitStats=kits?.userData.trackKitStats;
  if(!placements?.length || !Object.isFrozen(placements) || !kitStats)
    throw Error('The approved native kit owner did not publish its frozen placements.');
  const ids=[...new Set(placements.map(row=>row.id))];
  for(const id of ['snow-pine','snow-rock','snow-ground','plough-bank'])
    if(!ids.includes(id))throw Error('Missing actual approved Snow kit: '+id);
  if(window.__snowMenuCourse===app.duel.course)throw Error('Native menu/live Course control did not create distinct objects.');
  for(const row of placements.filter(row=>row.id==='plough-bank'))
    if(!app.duel.course.features.surfacePatches.includes(row.physicalPatch))
      throw Error('A visible plough bank does not reference its actual headless surface.');
  const winterTreeIds=new Set(placements.filter(row=>row.id==='snow-pine').map(row=>row.scenery?.id));
  api.scene.traverse(node=>{
    if(node.userData.vegetationCell?.entries.some(entry=>winterTreeIds.has(entry.feature.id)))
      throw Error('An ordinary pine duplicates its approved winter replacement.');
  });
  api.scene.traverse(node=>{
    if(node.userData.landscapeCell?.kind!=='foliage')return;
    const matrix=node.matrix.clone();
    for(let i=0;i<node.count;i++){
      node.getMatrixAt(i,matrix);
      const nearest=app.duel.course.nearest(matrix.elements[12],matrix.elements[14]);
      const p=app.duel.course.phase(nearest.s);
      if(app.duel.course.def.snowWorld.ranges.some(range=>p>range.from&&p<range.to))
        throw Error('Green summer foliage remains in the authored winter range.');
    }
  });
  const cars=api.scene.children.filter(node=>node.visible&&node.userData.vehicleKey);
  if(cars.length!==8 || cars.some(car=>!(car.userData.grounding?.wheels.length>=4)))
    throw Error('Eight actual imported, grounded cars are required.');
  api.camera.updateMatrixWorld(true);
  const visibleCars=cars.filter(car=>{
    const p=car.getWorldPosition(car.position.clone());p.y+=.8;p.project(api.camera);
    return p.z>=-1&&p.z<=1&&Math.abs(p.x)<.98&&Math.abs(p.y)<.98;
  }).length;
  if(view==='grid'&&visibleCars!==8)throw Error('The full native field must be in the grid view.');
  const nativeQuality=app.ambientOcclusionEnabled!==false?'high':'performance';
  if(nativeQuality==='performance' && kitStats.high!==0)throw Error('Performance must use approved kit LODs.');
  if(nativeQuality==='high' && kitStats.high===0)throw Error('Nearby approved High kits were not selected.');
  const alpha=tracks.geometry.attributes.snowAlpha.array;
  const liveMarks=[...alpha.slice(0,tracks.count)].filter(value=>value>0).length;
  const limits=nativeQuality==='high'?{flakes:240,marks:512}:{flakes:72,marks:128};
  if(flakes.geometry.drawRange.count!==limits.flakes||tracks.count!==limits.marks||liveMarks>limits.marks)
    throw Error('Native effects exceeded the approved quality caps.');
  if(view==='tracks'&&liveMarks===0)throw Error('Actual driven wheel contacts did not leave snow tracks.');
  if(view==='ridge'&&(!flakes.visible||flakes.material.uniforms.strength.value<=.5))
    throw Error('An authored exposed ridge did not produce the bounded blowing snow.');
  const pond=snow.getObjectByName('Frozen winter pond');
  if(!pond)throw Error('The authored frozen pond is missing.');
  let pondGround=null;
  if(view==='pond'){
    // Read actual Float32 scene triangles, including their world transforms.
    // This checks native anchoring; it never asks the analytical Course height.
    const surfaces=terrainMeshes.map(mesh=>{
      mesh.updateWorldMatrix(true,false);
      const position=mesh.geometry.attributes.position,point=mesh.position.clone(),vertices=[];
      for(let i=0;i<position.count;i++){
        point.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);
        vertices.push(point.x,point.y,point.z);
      }
      return {vertices,index:mesh.geometry.index.array};
    });
    const ponds=[];snow.traverse(node=>{if(node.name==='Frozen winter pond')ponds.push(node);});
    let count=0,maxError=0,near=false,far=false,overlap=false;
    for(const nativePond of ponds){
      nativePond.updateWorldMatrix(true,false);
      const position=nativePond.geometry.attributes.position,point=nativePond.position.clone();
      for(let i=0;i<position.count;i++){
        point.fromBufferAttribute(position,i).applyMatrix4(nativePond.matrixWorld);
        let upper=-Infinity;const hitSurfaces=new Set();
        for(let surface=0;surface<surfaces.length;surface++){
          const {vertices:v,index}=surfaces[surface];
          for(let j=0;j<index.length;j+=3){
            const a=index[j]*3,b=index[j+1]*3,c=index[j+2]*3;
            if(point.x<Math.min(v[a],v[b],v[c])-1e-5||point.x>Math.max(v[a],v[b],v[c])+1e-5||
                point.z<Math.min(v[a+2],v[b+2],v[c+2])-1e-5||point.z>Math.max(v[a+2],v[b+2],v[c+2])+1e-5)continue;
            const denominator=(v[b+2]-v[c+2])*(v[a]-v[c])+(v[c]-v[b])*(v[a+2]-v[c+2]);
            if(Math.abs(denominator)<1e-9)continue;
            const wa=((v[b+2]-v[c+2])*(point.x-v[c])+(v[c]-v[b])*(point.z-v[c+2]))/denominator;
            const wb=((v[c+2]-v[a+2])*(point.x-v[c])+(v[a]-v[c])*(point.z-v[c+2]))/denominator,wc=1-wa-wb;
            if(Math.min(wa,wb,wc)<-1e-5)continue;
            upper=Math.max(upper,wa*v[a+1]+wb*v[b+1]+wc*v[c+1]);hitSurfaces.add(surface);
          }
        }
        if(!Number.isFinite(upper))throw Error('A native pond vertex has no drawn terrain triangle.');
        const error=Math.abs(point.y-upper-.055);maxError=Math.max(maxError,error);
        if(error>1e-4)throw Error('A native pond vertex floats above/below its actual rendered triangle: '+error);
        near ||= hitSurfaces.has(0);far ||= hitSurfaces.has(1);overlap ||= hitSurfaces.size>1;count++;
      }
    }
    if(ponds.length!==2||!near||!far||!overlap)throw Error('Native curved ponds must exercise near/far terrain and overlaps.');
    pondGround={ponds:ponds.length,vertices:count,maxError,near,far,overlap};
  }

  const programs=api.renderer.info.programs;
  if(programs.some(program=>!program.isReady()))throw Error('A submitted Snow shader is not ready.');
  return {view,quality:nativeQuality,field:cars.length,visibleCars,s:state.s,
    terrain,kitIds:ids,placements:placements.length,kitStats:{...kitStats},flakes:limits.flakes,liveMarks,markCap:tracks.count,pondVertices:pond.geometry.attributes.position.count,pondGround,
    programs:programs.length};
}

async function snapshotIdentity(context,quality) {
  await context.evaluate(`(() => {
    const app=window.__qaApp,api=window.__render,host=document.querySelector('#view3d');
    if(app.duel.state.status!=='menu')throw Error('Winter snapshot identity requires the genuine menu.');
    const previous=app.getMenuCourse(0);
    const oldBanks=api.scene.getObjectByName('Approved track kits')?.userData.trackKitPlacements
      .filter(row=>row.id==='plough-bank');
    if(!oldBanks?.length||oldBanks.some(row=>!previous.features.surfacePatches.includes(row.physicalPatch)))
      throw Error('The original winter world lacks genuine previous-Course bank identities.');
    const readOnly=()=>JSON.stringify({state:app.duel.state,profile:app.profile,
      storage:Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).sort().map(k=>[k,localStorage.getItem(k)])});
    const before=readOnly();
    app._menuCourses.clear();
    const current=app.getMenuCourse(0);
    const shape=course=>JSON.stringify({seed:course.seed,length:course.length,samples:course.samples,
      patches:course.features.surfacePatches});
    if(current===previous||current.def!==previous.def||shape(current)!==shape(previous)||
      current.features.surfacePatches.some(patch=>previous.features.surfacePatches.includes(patch)))
      throw Error('The regression needs genuine equivalent Course objects with independent patch identities.');
    const fixture=window.__snowSnapshotFixture={previous,current,oldBanks,readOnly,before,
      builds:Number(host.dataset.worldBuilds),settled:false};
    api.captureTrackSnapshot({course:current,flag:{id:'snow-bank-identity',snapshotS:180,camera:{up:2,ahead:55}}})
      .then(canvas=>{fixture.canvas=canvas;fixture.settled=true;},
        error=>{fixture.error=error.message;fixture.settled=true;});
    api.renderFrame();
    if(readOnly()!==before)throw Error('Pending winter snapshot changes race/profile/storage.');
  })()`);
  await context.waitFor(`(()=>{window.__render.renderFrame();return window.__snowSnapshotFixture.settled;})()`,
    quality+' genuine equivalent-Course winter snapshot',25000);
  return context.evaluate(`(() => {
    const fixture=window.__snowSnapshotFixture,api=window.__render,host=document.querySelector('#view3d');
    try {
      if(fixture.error)throw Error(fixture.error);
      if(fixture.readOnly()!==fixture.before)throw Error('Winter snapshot changes exact race/profile/storage.');
      if(!fixture.canvas||host.dataset.trackKitAsset!=='ready'||host.dataset.trackSnapshot!=='snow-bank-identity')
        throw Error('Winter snapshot bypasses original assets/readiness completion.');
      const banks=api.scene.getObjectByName('Approved track kits')?.userData.trackKitPlacements
        .filter(row=>row.id==='plough-bank');
      if(!banks?.length||banks.length!==fixture.oldBanks.length)throw Error('Winter snapshot dropped generated banks.');
      return {quality:${JSON.stringify(quality)},bankCount:banks.length,
        previousBanks:banks.filter(row=>fixture.previous.features.surfacePatches.includes(row.physicalPatch)).length,
        currentBanks:banks.filter(row=>fixture.current.features.surfacePatches.includes(row.physicalPatch)).length,
        distinctWorldBanks:banks.filter(row=>!fixture.oldBanks.includes(row)).length,
        buildsBefore:fixture.builds,buildsAfter:Number(host.dataset.worldBuilds),readOnly:true,
        actualQuality:window.__qaApp.ambientOcclusionEnabled!==false?'high':'performance'};
    } finally {api.clearTrackSnapshot();delete window.__snowSnapshotFixture;}
  })()`);
}

async function capture(context,quality,view) {
  await context.evaluate('('+setView.toString()+')('+JSON.stringify(view)+')');
  const before=await context.evaluate(`JSON.stringify({state:window.__qaApp.duel.state,profile:window.__qaApp.profile,
    storage:Object.fromEntries(Array.from({length:localStorage.length},(_,i)=>{const k=localStorage.key(i);return [k,localStorage.getItem(k)];}))})`);
  await context.evaluate(`(async()=>{for(let i=0;i<30;i++){await new Promise(requestAnimationFrame);window.__render.renderFrame();}})()`);
  const after=await context.evaluate(`JSON.stringify({state:window.__qaApp.duel.state,profile:window.__qaApp.profile,
    storage:Object.fromEntries(Array.from({length:localStorage.length},(_,i)=>{const k=localStorage.key(i);return [k,localStorage.getItem(k)];}))})`);
  assert.equal(after,before,'Snow rendering preserves native state, profile and memory-only saves');
  const observed=await context.evaluate('('+witness.toString()+')('+JSON.stringify(view)+')');
  assert.equal(observed.quality,quality);
  const file=`p4-snow-${quality}-${view}`;
  await context.screenshot(file);return {...observed,file};
}

async function driveTo(context,s) {
  await context.evaluate(`(async()=>{
    const app=window.__qaApp;let steps=0;
    while((app.duel.state.status==='countdown'||app.duel.state.s<${s})&&steps++<60*180){
      app.advance(1/60,1/60);
      if(steps%10===0){await new Promise(requestAnimationFrame);window.__render.renderFrame();}
    }
    app.stop();
    if(app.duel.state.status!=='racing'||app.duel.state.s<${s})
      throw Error('Native winter controls did not reach the requested stretch.');
  })()`);
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  const frames=process.env.P4_SNOW_MEASURE_FRAMES==='1';
  const report={card:'P4-SNOW',captures:[],snapshots:[],moving:[],frames:[],comparisons:[],
    frameScope:'Static native eight-car snapshots; flakes and track expiry remain active. Moving Snow update cost is not measured.',
    frameStatus:frames?'running':'not scheduled',bloomTargets:[],passed:false};
  try{
    for(const quality of ['high','performance']){
      await context.navigate('/tools/menu-check.html?flags=grand-prix,snow-world');
      await context.waitFor(`window.__qaApp?.visualReady&&!document.querySelector('#start-engine')?.disabled`, 'native isolated menu',60000);
      await context.evaluate('('+prepareNative.toString()+')('+JSON.stringify(quality)+')');
      await context.waitFor(`window.__qaApp.visualReady&&Number(document.querySelector('#view3d').dataset.worldBuilds)>window.__snowBeforeBuilds&&!!window.__render?.scene.getObjectByName('Authored snow world')`, 'approved Snow assets in the actual menu world',60000);
      const snapshot=await snapshotIdentity(context,quality);report.snapshots.push(snapshot);
      assert.equal(snapshot.actualQuality,quality,'winter snapshot retains native quality');
      assert.equal(snapshot.currentBanks,snapshot.bankCount,'all snapshot banks reference the current equivalent Course');
      assert.equal(snapshot.previousBanks,0,'no snapshot bank retains a previous Course patch');
      assert.equal(snapshot.distinctWorldBanks,snapshot.bankCount,'winter snapshot builds fresh bank placements');
      assert.ok(snapshot.buildsAfter>snapshot.buildsBefore,'equivalent winter snapshot rebuilds the actual world');
      await context.evaluate('('+startNative.toString()+')()');
      await context.waitFor(`window.__qaApp.visualReady&&!!window.__render?.scene.getObjectByName('Authored snow world')`, 'fresh native full-field winter world',60000);
      await context.evaluate(`document.head.insertAdjacentHTML('beforeend','<style>details,#overlay,.rear-view-frame{display:none!important}</style>')`);
      report.captures.push(await capture(context,quality,'grid'));
      await driveTo(context,190);report.captures.push(await capture(context,quality,'tracks'));
      report.moving.push(await expireTracks(context,quality));
      report.captures.push(await capture(context,quality,'pond'));
      await driveTo(context,600);report.captures.push(await capture(context,quality,'ridge'));
      if(quality==='high'){
        const before=await context.evaluate('('+nativeSnapshot.toString()+')()');
        const targets=await context.evaluate('('+probeBloomTargets.toString()+')()');
        assert.equal(targets.length,12,'actual scene, bright extraction and all ten blur targets must be read');
        for(const target of targets){
          assert.equal(target.floatRead,true,`${target.label}: real floating-point target required`);
          assert.equal(target.error,undefined,`${target.label}: native read must succeed`);
          assert.equal(target.unsupported,undefined,`${target.label}: actual target must be available`);
          assert.equal(target.nan,0,`${target.label}: no NaN colour components`);
          assert.equal(target.infinite,0,`${target.label}: no infinite colour components`);
        }
        assert.equal(await context.evaluate('('+nativeSnapshot.toString()+')()'),before,'buffer probes preserve race, profile and memory saves');
        report.bloomTargets=targets;
      }
      await context.evaluate(`(()=>{
        const original=window.__snowOriginal;
        window.__qaApp.returnToMenu();
        for(const key of Object.keys(original.def))if(!Object.hasOwn(original.values,key))delete original.def[key];
        Object.assign(original.def,original.values);window.__qaApp._menuCourses.clear();delete window.__snowOriginal;
        if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||!window.name.startsWith('__duel_qa_tab_v2:'))
          throw Error('Only the established disposable QA tab adapter may reset.');
        if (${quality === 'high'}) window.name='';
      })()`);
    }
    if(frames)await frameComparisons(context,report);
    report.passed=true;
    console.log('Snow native High/Performance: full eight-car field, terrain, pond, ridge, actual wheel tracks and read-only rendering pass. Frames remain separately scheduled.');
  }finally{
    await writeFile(join(context.outputDir,'p4-snow.json'),JSON.stringify(report,null,2)+'\n');
    await context.evaluate(`(()=>{const original=window.__snowOriginal;if(!original)return;
      for(const key of Object.keys(original.def))if(!Object.hasOwn(original.values,key))delete original.def[key];
      Object.assign(original.def,original.values);window.__qaApp._menuCourses.clear();delete window.__snowOriginal;})()`);
  }
}

async function expireTracks(context,quality){
  const result=await context.evaluate(`(async()=>{
    const app=window.__qaApp,api=window.__render,tracks=api.scene.getObjectByName('Actual wheel snow tracks');
    const before=JSON.stringify({state:app.duel.state,profile:app.profile});
    const active=()=>[...tracks.geometry.attributes.snowAlpha.array.slice(0,tracks.count)].filter(a=>a>0).length;
    const generated=active();if(!generated)throw Error('Genuine native eight-car driving generated no wheel tracks.');
    const start=performance.now();while(performance.now()-start<8500){await new Promise(requestAnimationFrame);api.renderFrame();}
    if(active()!==0||tracks.visible)throw Error('Native wheel tracks did not expire within their bounded lifetime.');
    if(before!==JSON.stringify({state:app.duel.state,profile:app.profile}))throw Error('Track expiry changed the race/profile.');
    return {generated,expired:active(),field:app.duel.state.opponents.length+1,s:app.duel.state.s};
  })()`);
  assert.equal(result.field,8);return {quality,...result};
}

function frameWitness(){
  const app=window.__qaApp,api=window.__render,camera=api.camera;
  camera.updateMatrixWorld(true);
  const cars=api.scene.children.filter(node=>node.visible&&node.userData.vehicleKey);
  if(cars.length!==8)throw Error('The static comparison requires eight actual imported cars.');
  const poses=cars.map(car=>{
    const p=car.getWorldPosition(car.position.clone());p.y+=.8;p.project(camera);
    if(p.z< -1||p.z>1||Math.abs(p.x)>=.98||Math.abs(p.y)>=.98)throw Error('A native frame car is outside the view.');
    return {key:car.userData.vehicleKey,position:car.position.toArray(),rotation:car.rotation.toArray()};
  });
  return {poses,state:JSON.stringify(app.duel.state),profile:JSON.stringify(app.profile),
    camera:{position:camera.position.toArray(),target:app.inspectionCamera.target},
    quality:app.ambientOcclusionEnabled!==false?'high':'performance',
    snow:!!api.scene.getObjectByName('Authored snow world')};
}

async function staticLeg(context,quality,snow,pair){
  // A fresh QA URL chooses the real immutable feature flag; no runtime override.
  await context.evaluate(`(()=>{if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||
    !window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Disposable adapter required');window.name='';})()`);
  await context.navigate('/tools/menu-check.html?flags=grand-prix'+(snow?',snow-world':''));
  await context.waitFor(`window.__qaApp?.visualReady&&!document.querySelector('#start-engine')?.disabled`, 'isolated static comparison menu',60000);
  await context.evaluate('('+prepareNative.toString()+')('+JSON.stringify(quality)+')');
  await context.waitFor(`window.__qaApp.visualReady&&Number(document.querySelector('#view3d').dataset.worldBuilds)>window.__snowBeforeBuilds`, 'actual authored comparison menu',60000);
  await context.evaluate('('+startNative.toString()+')()');
  await context.waitFor(`window.__qaApp.visualReady&&window.__qaApp.duel.state.opponents.length===7`, 'actual eight-car static leg',60000);
  await driveTo(context,190);
  await context.evaluate('('+setView.toString()+')("frame")');
  await context.evaluate('window.__dayNightReview={witness:('+frameWitness.toString()+')};');
  await context.evaluate('('+installMeasurement.toString()+')('+JSON.stringify(quality)+',false)');
  try{
    await context.waitFor('window.__dayNightFrames.done',quality+' Snow '+snow+' static sample',60000);
    await context.waitFor('(()=>{const r=window.__dayNightFrames;r.poll();return r.pending.length===0||r.disjoint;})()', 'completed unchanged async GPU sample',10000);
    const row=await context.evaluate(`(()=>{
      const r=window.__dayNightFrames;
      if(r.disjoint)throw Error('Disjoint Snow GPU sample');
      if(JSON.stringify(r.before)!==JSON.stringify(r.after))throw Error('Native static state/view witness changed');
      return {cpu:r.cpu,gpu:r.gpu,frames:r.frames,witness:r.before,gpuSupported:r.gpuSupported,
        scales:[...r.scales],ratios:[...r.ratios]};})()`);
    const pacing={cpu:summarizeFrameTiming(row.cpu),gpu:summarizeFrameTiming(row.gpu),delivered:summarizeFrameTiming(row.frames)};
    if(row.scales.length!==1||row.ratios.length!==1||!pacing.cpu||!pacing.delivered||
      pacing.cpu.samples!==360||pacing.delivered.samples<359||
      row.gpuSupported&&(!pacing.gpu||pacing.gpu.samples<288))throw Error('Incomplete or changing-resolution Snow sample');
    assert.equal(row.witness.quality,quality);assert.equal(row.witness.snow,snow);
    return {quality,snow,pair,pacing,witness:row.witness,gpuSupported:row.gpuSupported,scales:row.scales,ratios:row.ratios};
  }finally{
    await context.evaluate('window.__dayNightFrames.cleanup()');
    await context.evaluate(`(()=>{const original=window.__snowOriginal;
      if(original){for(const key of Object.keys(original.def))if(!Object.hasOwn(original.values,key))delete original.def[key];
        Object.assign(original.def,original.values);window.__qaApp._menuCourses.clear();delete window.__snowOriginal;}})()`);
  }
}

async function frameComparisons(context,report){
  for(const quality of ['high','performance'])for(const pair of [1,2]){
    const order=pair===1?[false,true]:[true,false],rows=[];
    for(const snow of order){
      const leg=await staticLeg(context,quality,snow,pair);rows.push(leg);report.frames.push(leg);
      await writeFile(join(context.outputDir,'p4-snow.json'),JSON.stringify(report,null,2)+'\n');
    }
    const off=rows.find(row=>!row.snow),on=rows.find(row=>row.snow);
    assert.deepEqual(on.witness.poses,off.witness.poses,'native seed/inputs and full-field car snapshots match');
    assert.deepEqual(on.witness.camera,off.witness.camera,'same actual camera in both controls');
    for(const metric of ['cpu','gpu','delivered']){
      if(metric==='gpu'&&!off.gpuSupported&&!on.gpuSupported)continue;
      const baseline=off.pacing[metric],added=on.pacing[metric];
      if(!baseline||!added)throw Error('Missing matched '+metric+' sample');
      report.comparisons.push({quality,pair,metric,off:baseline.p95,on:added.p95,
        increasePercent:(added.p95/baseline.p95-1)*100,pass:added.p95<=baseline.p95*1.1});
    }
  }
  report.frameStatus=report.comparisons.every(row=>row.pass)?'passes original 10% limits':'fails original 10% limits';
  await writeFile(join(context.outputDir,'p4-snow.json'),JSON.stringify(report,null,2)+'\n');
  assert.ok(report.comparisons.every(row=>row.pass),report.frameStatus);
}


function nativeSnapshot(){
  const app=window.__qaApp;
  return JSON.stringify({state:app.duel.state,profile:app.profile,
    storage:Object.fromEntries(Array.from({length:localStorage.length},(_,i)=>{const k=localStorage.key(i);return [k,localStorage.getItem(k)];}))});
}

function probeBloomTargets(){
  const api=window.__render,renderer=api.renderer,gl=renderer.getContext(),results=[];
  const bloom=api.composer.passes.find(pass=>pass.name==='Bloom');
  if(!bloom?.enabled)throw Error('Actual default Bloom required.');
  function sample(label,target){
    const framebuffer=renderer.properties.get(target).__webglFramebuffer;
    if(!framebuffer||Array.isArray(framebuffer))return {label,unsupported:'Expected a native two-dimensional target'};
    const previousRead=gl.getParameter(gl.READ_FRAMEBUFFER_BINDING),previousDraw=gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING);
    try{
      gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
      const type=gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE),format=gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT),
        count=target.width*target.height*4,
        pixels=type===gl.FLOAT?new Float32Array(count):type===gl.HALF_FLOAT?new Uint16Array(count):new Uint8Array(count);
      if(format!==gl.RGBA)return {label,width:target.width,height:target.height,unsupported:'Native read format '+format};
      gl.readPixels(0,0,target.width,target.height,format,type,pixels);
      const error=gl.getError();if(error)return {label,width:target.width,height:target.height,error,type};
      let nan=0,infinite=0,negative=0,min=Infinity,max=-Infinity,firstInvalid=null;
      for(let i=0;i<pixels.length;i++){
        let value=pixels[i];
        if(type===gl.HALF_FLOAT){
          const sign=value&32768?-1:1,exponent=value>>10&31,mantissa=value&1023;
          value=exponent===31?(mantissa?NaN:sign*Infinity):exponent===0?sign*mantissa*Math.pow(2,-24):sign*(1+mantissa/1024)*Math.pow(2,exponent-15);
        }
        if(Number.isNaN(value)){nan++;if(!firstInvalid)firstInvalid={x:Math.floor(i/4)%target.width,y:Math.floor(i/4/target.width),channel:i%4};}
        else if(!Number.isFinite(value))infinite++;
        else{min=Math.min(min,value);max=Math.max(max,value);if(value<0)negative++;}
      }
      return {label,width:target.width,height:target.height,type,floatRead:type===gl.FLOAT||type===gl.HALF_FLOAT,nan,infinite,negative,min,max,firstInvalid};
    }finally{
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER,previousRead);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,previousDraw);
    }
  }
  const original=bloom.render;
  bloom.render=function(renderer,writeBuffer,readBuffer,...rest){
    results.push(sample('Actual Bloom input',readBuffer));
    original.call(this,renderer,writeBuffer,readBuffer,...rest);
    results.push(sample('Bright extraction',this.renderTargetBright));
    this.renderTargetsHorizontal.forEach((target,i)=>results.push(sample('Horizontal blur '+i,target)));
    this.renderTargetsVertical.forEach((target,i)=>results.push(sample('Vertical blur '+i,target)));
  };
  try{api.renderFrame();return results;}
  finally{bloom.render=original;}
}
