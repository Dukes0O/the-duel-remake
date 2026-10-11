// Genuine App loading/driving; only the disposable QA course definition changes.
// No positions, laps, field members or results are injected. Timing is separate.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {measureMainRearFrames} from './track-kits.mjs';

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
      ponds:[{s:180,lateral:32,radiusX:9,radiusZ:12},{s:600,lateral:58,radiusX:12,radiusZ:8}],
      pineClusters:[80,180,350,600].flatMap(s=>[-1,1].map(side=>({s,
        lateral:side*(s===600?38:s===180?36:32),count:8,radius:7})))}});
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
  if(terrain.length!==2 || terrain.some(row=>row.white!==row.vertices||row.dry!==0||!row.key.includes('winter')))
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
  const snowMaterials=new Set();kits.traverse(node=>{
    for(const material of [].concat(node.material??[]))if(material.name?.includes('worn snow'))snowMaterials.add(material);
  });
  if(snowMaterials.size<4||[...snowMaterials].some(material=>material.userData.snowAlbedo!==.8))
    throw Error('Actual approved snow materials do not carry the reviewed albedo.');
  const clusterPines=placements.filter(row=>row.id==='snow-pine'&&!row.scenery).length;
  if(clusterPines!==64)throw Error('The eight authored native pine clusters did not load every approved piece.');
  if(placements.filter(row=>row.id==='plough-bank').some(row=>row.scale[1]<1.3))
    throw Error('Native physical plough banks lack the reviewed raised profile.');
  const winterMountains=[];api.scene.traverse(node=>{
    if(node.isMesh&&node.name.includes('ridge range'))winterMountains.push(node);
  });
  if(!winterMountains.length||winterMountains.some(node=>node.material.customProgramCacheKey()!=='connected-mountain-v2-alpine-snow-caps'||node.material.userData.winterCaps!==true))
    throw Error('The winter world retained desert mountains instead of the actual alpine snow shader.');
  const packed=api.scene.getObjectByName('surface-snow'),bloom=api.composer.passes.find(pass=>pass.name==='Bloom');
  if(!packed||packed.material.color.r>=.4||packed.material.color.b>=.5)
    throw Error('Packed winter road does not remain darker than the snowfields.');
  if(!bloom?.enabled||bloom.strength<=0||!Number.isFinite(api.renderer.toneMappingExposure))
    throw Error('Snow exposure/Bloom tuning disabled a pass or produced a nonfinite value.');
  const winterTreeIds=new Set(placements.filter(row=>row.id==='snow-pine').map(row=>row.scenery?.id));
  api.scene.traverse(node=>{
    if(node.userData.vegetationCell?.entries.some(entry=>winterTreeIds.has(entry.feature.id)))
      throw Error('An ordinary pine duplicates its approved winter replacement.');
  });
  api.scene.traverse(node=>{
    if(node.userData.landscapeCell?.kind==='foliage'&&node.count>0)
      throw Error('Green summer foliage remains in the Snow scene.');
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
  if(!flakes.visible||flakes.material.uniforms.strength.value<=0)throw Error('The full Snow scene lacks light snowfall.');
  if(view==='tracks'&&liveMarks===0)throw Error('Actual driven wheel contacts did not leave snow tracks.');
  if(view==='ridge'&&(!flakes.visible||flakes.material.uniforms.strength.value<=.5))
    throw Error('An authored exposed ridge did not produce the bounded blowing snow.');
  const pond=snow.getObjectByName('Frozen winter pond');
  if(!pond)throw Error('The authored frozen pond is missing.');
  if(pond.material.roughness<=0||pond.material.roughness>.08||pond.material.color.b>=.3||
      !pond.material.isMeshPhysicalMaterial||pond.material.clearcoat<=0||pond.material.envMapIntensity<=0||!api.scene.environment)
    throw Error('Native frozen pond lacks dark glossy reflective ice.');
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
    const ponds=[],rims=[];snow.traverse(node=>{
      if(node.name==='Frozen winter pond')ponds.push(node);
      if(node.name==='Anchored pond snow rim')rims.push(node);
    });
    let count=0,rimCount=0,maxError=0,rimMaxError=0,near=false,far=false,overlap=false,
      rimNear=false,rimFar=false,rimOverlap=false;
    for(const nativePond of [...ponds,...rims]){
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
        const isRim=nativePond.name==='Anchored pond snow rim',lift=isRim?nativePond.userData.groundLift:.055;
        if(isRim&&lift!==.16)throw Error('Actual snow rim lift differs from the reviewed anchor.');
        const error=Math.abs(point.y-upper-lift);
        if(isRim){rimCount++;rimMaxError=Math.max(rimMaxError,error);}else{count++;maxError=Math.max(maxError,error);}
        if(error>1e-4)throw Error('A native pond vertex floats above/below its actual rendered triangle: '+error);
        if(isRim){rimNear ||= hitSurfaces.has(0);rimFar ||= hitSurfaces.has(1);rimOverlap ||= hitSurfaces.size>1;}
        else{near ||= hitSurfaces.has(0);far ||= hitSurfaces.has(1);overlap ||= hitSurfaces.size>1;}
      }
    }
    if(ponds.length!==2||count!==98||!near||!far||!overlap)throw Error('Native curved ponds must exercise near/far terrain and overlaps.');
    if(rims.length!==2||rimCount!==192||!rimNear||!rimFar||!rimOverlap)throw Error('Native snow rims must independently exercise near/far terrain and overlaps.');
    pondGround={ponds:ponds.length,vertices:count,maxError,near,far,overlap,rims:rims.length,rimVertices:rimCount,rimMaxError,rimNear,rimFar,rimOverlap};
  }

  const programs=api.renderer.info.programs;
  if(programs.some(program=>!program.isReady()))throw Error('A submitted Snow shader is not ready.');
  return {view,quality:nativeQuality,field:cars.length,visibleCars,s:state.s,
    terrain,kitIds:ids,placements:placements.length,kitStats:{...kitStats},flakes:limits.flakes,liveMarks,markCap:tracks.count,pondVertices:pond.geometry.attributes.position.count,pondGround,
    look:{clusterPines,bankScale:1.3,snowMaterials:snowMaterials.size,albedo:.8,
      mountains:winterMountains.length,packedColour:packed.material.color.toArray(),
      iceColour:pond.material.color.toArray(),iceRoughness:pond.material.roughness,
      iceClearcoat:pond.material.clearcoat,environmentReflection:!!api.scene.environment,
      exposure:api.renderer.toneMappingExposure,bloom:bloom.strength},programs:programs.length};
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
    frameScope:'Fresh dry/Snow native eight-car worlds with main, rear and HUD active; static flakes/track expiry remain active. Moving Snow update cost is not measured.',
    frameAcceptancePolicy:'claude-1030-absolute: delivered p95<=18.5ms and actual kit construction<1000ms; mixed relative metrics remain information.',
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
  if(app.running)throw Error('Static timing must retain the stopped genuine input-driven race.');
  camera.updateMatrixWorld(true);
  const cars=api.scene.children.filter(node=>node.visible&&node.userData.vehicleKey);
  if(cars.length!==8)throw Error('The static comparison requires eight actual imported cars.');
  const poses=cars.map(car=>{
    const p=car.getWorldPosition(car.position.clone());p.y+=.8;p.project(camera);
    if(p.z< -1||p.z>1||Math.abs(p.x)>=.98||Math.abs(p.y)>=.98)throw Error('A native frame car is outside the view.');
    return {key:car.userData.vehicleKey,position:car.position.toArray(),rotation:car.rotation.toArray()};
  });
  const visible=selector=>{
    const element=document.querySelector(selector),rect=element?.getBoundingClientRect();
    return !!element&&!element.hidden&&getComputedStyle(element).display!=='none'&&
      getComputedStyle(element).visibility!=='hidden'&&rect.width>0&&rect.height>0;
  };
  const host=document.querySelector('#view3d');
  if(!visible('#overlay')||!visible('#race-hud')||!visible('.rear-view-frame')||
      host.dataset.rearView!=='ready'||!(Number(host.dataset.rearViewDrawCalls)>0))
    throw Error('Whole-view timing requires the genuine visible HUD and active rear mirror.');
  const digest=array=>{
    const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);let hash=2166136261;
    for(const value of bytes)hash=Math.imul(hash^value,16777619)>>>0;
    return {bytes:bytes.length,hash};
  };
  const ground=[];api.scene.traverse(node=>{
    if(node.isMesh&&node.geometry?.attributes.biomeWeights)ground.push({
      positions:digest(node.geometry.attributes.position.array),indices:digest(node.geometry.index.array)});
  });
  if(ground.length!==2)throw Error('The paired worlds require actual near/far terrain.');
  const snow=!!api.scene.getObjectByName('Authored snow world');
  const winterWeights=[];api.scene.traverse(node=>{
    if(node.isMesh&&node.geometry?.attributes.winterWeight)winterWeights.push(node.geometry.attributes.winterWeight.count);
  });
  if(snow&&winterWeights.length!==2||!snow&&winterWeights.length)
    throw Error('The dry/Snow baseline must be genuinely constructed with its selected presentation.');
  let kitConstructionMs=null;
  if(snow){
    const kits=api.scene.getObjectByName('Approved track kits');
    kitConstructionMs=kits?.userData.trackKitStats?.presentation?.constructionMs;
    if(host.dataset.trackKitAsset!=='ready'||!kits?.userData.trackKitPlacements?.length||
        !Number.isFinite(kitConstructionMs)||kitConstructionMs<0)
      throw Error('Snow timing requires the actual ready kit owner and finite nonnegative construction witness.');
  }
  return {poses,ground,road:JSON.stringify(app.duel.course.samples),state:JSON.stringify(app.duel.state),
    profile:JSON.stringify(app.profile),storage:JSON.stringify(Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).sort()
      .map(key=>[key,localStorage.getItem(key)])),
    camera:{position:camera.position.toArray(),target:app.inspectionCamera.target},
    quality:app.ambientOcclusionEnabled!==false?'high':'performance',snow,kitConstructionMs,
    views:{hud:true,rear:true,resolution:host.dataset.rearViewResolution}};
}

async function observeWholeView(){
  const api=window.__render,renderer=api.renderer,original=renderer.render;
  let main=0,rear=0;
  renderer.render=function(scene,camera){
    if(scene===api.scene){
      if(camera===api.camera)main++;
      else if(renderer.getRenderTarget())rear++;
    }
    return original.call(this,scene,camera);
  };
  try{
    for(let i=0;i<18&&(!main||!rear);i++){
      await new Promise(requestAnimationFrame);api.renderFrame();
    }
    if(!main||!rear)throw Error('Actual full main and rear scene submissions were not observed.');
    return {main,rear};
  }finally{renderer.render=original;}
}

async function staticLeg(context,quality,snow,pair){
  // A fresh QA URL selects the real flag before constructing each real world.
  await context.evaluate(`(()=>{if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||
    !window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Disposable adapter required');window.name='';})()`);
  await context.navigate('/tools/menu-check.html?flags=grand-prix'+(snow?',snow-world':''));
  await context.waitFor(`window.__qaApp?.visualReady&&!document.querySelector('#start-engine')?.disabled`, 'isolated whole-view comparison menu',60000);
  await context.evaluate('('+prepareNative.toString()+')('+JSON.stringify(quality)+')');
  await context.waitFor(`window.__qaApp.visualReady&&Number(document.querySelector('#view3d').dataset.worldBuilds)>window.__snowBeforeBuilds`, 'fresh authored dry/Snow menu world',60000);
  await context.evaluate('('+startNative.toString()+')()');
  await context.waitFor(`window.__qaApp.visualReady&&window.__qaApp.duel.state.opponents.length===7`, 'actual eight-car static leg',60000);
  await driveTo(context,190);
  await context.evaluate('('+setView.toString()+')("frame")');
  // Close only the disposable QA controls; production HUD and mirror stay active.
  await context.evaluate(`(()=>{const panel=document.querySelector('details');if(panel)panel.open=false;})()`);
  try{
    const submissions=await context.evaluate('('+observeWholeView.toString()+')()');
    const before=await context.evaluate('('+frameWitness.toString()+')()');
    assert.equal(before.quality,quality);assert.equal(before.snow,snow);
    await context.screenshot(`p4-snow-frame-${quality}-${pair}-${snow?'on':'off'}`);
    const row=await measureMainRearFrames(context,quality,'Snow '+snow+' pair'+pair);
    const after=await context.evaluate('('+frameWitness.toString()+')()');
    assert.deepEqual(after,before,'native whole-view state, geometry, poses and camera remain exact throughout sampling');
    assert.equal(row.raceState,before.state,'shared sampler observes the identical genuine race');
    assert.equal(row.actorPoses.length,8,'shared sampler retains all eight native car roots');
    return {...row,snow,pair,witness:before,submissions};
  }finally{
    await context.evaluate(`(()=>{const original=window.__snowOriginal;
      if(original){for(const key of Object.keys(original.def))if(!Object.hasOwn(original.values,key))delete original.def[key];
        Object.assign(original.def,original.values);window.__qaApp._menuCourses.clear();delete window.__snowOriginal;}})()`);
  }
}

export function compareSnowFramePair(off,on){
  assert.equal(on.quality,off.quality,'paired native quality matches');
  assert.equal(on.pair,off.pair,'paired native order matches');
  for(const key of ['scales','ratios','actorPoses','raceState'])
    assert.deepEqual(on[key],off[key],'fresh native dry/Snow '+key+' matches exactly');
  for(const key of ['poses','ground','road','state','profile','storage','camera','quality','views'])
    assert.deepEqual(on.witness[key],off.witness[key],'fresh whole-view '+key+' matches exactly');
  assert.equal(on.witness.snow,true);assert.equal(off.witness.snow,false);
  assert.equal(on.gpuSupported,off.gpuSupported,'paired native GPU support must match');
  const comparisons=[];
  for(const metric of ['cpu','gpu','delivered','combined']){
    if(metric==='gpu'&&!off.gpuSupported)continue;
    const baseline=metric==='combined'?off.combined:off.pacing[metric],
      added=metric==='combined'?on.combined:on.pacing[metric];
    if(!baseline||!added||!Number.isFinite(baseline.p95)||baseline.p95<=0||!Number.isFinite(added.p95))
      throw Error('Missing matched '+metric+' sample');
    comparisons.push({quality:on.quality,pair:on.pair,metric,off:baseline.p95,on:added.p95,
      increasePercent:(added.p95/baseline.p95-1)*100,acceptance:false,pass:added.p95<=baseline.p95*1.1});
  }
  comparisons.push({quality:on.quality,pair:on.pair,metric:'candidate delivered p95',
    on:on.pacing.delivered.p95,limit:18.5,acceptance:true,pass:on.pacing.delivered.p95<=18.5});
  const constructionMs=on.witness.kitConstructionMs;
  assert.ok(Number.isFinite(constructionMs)&&constructionMs>=0,'actual Snow kit construction witness must be finite and nonnegative');
  comparisons.push({quality:on.quality,pair:on.pair,metric:'candidate kit construction',
    on:constructionMs,limit:1000,strictLimit:true,acceptance:true,pass:constructionMs<1000});
  return comparisons;
}

async function frameComparisons(context,report){
  for(const quality of ['high','performance'])for(const pair of [1,2]){
    const order=pair===1?[false,true]:[true,false],rows=[];
    for(const snow of order){
      const leg=await staticLeg(context,quality,snow,pair);rows.push(leg);report.frames.push(leg);
      await writeFile(join(context.outputDir,'p4-snow.json'),JSON.stringify(report,null,2)+'\n');
    }
    report.comparisons.push(...compareSnowFramePair(rows.find(row=>!row.snow),rows.find(row=>row.snow)));
  }
  const accepted=report.comparisons.filter(row=>row.acceptance).every(row=>row.pass);
  report.frameStatus=accepted?'passes delivered18.5ms and kit construction under1s':'fails delivered18.5ms or kit construction under1s';
  report.relativeFrameStatus=report.comparisons.filter(row=>!row.acceptance).every(row=>row.pass)
    ?'within original10% information limits':'exceeds original10% information limits';
  await writeFile(join(context.outputDir,'p4-snow.json'),JSON.stringify(report,null,2)+'\n');
  assert.ok(accepted,report.frameStatus);
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
