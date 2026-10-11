// Genuine App loading/driving; only the disposable QA course definition changes.
// No positions, laps, field members or results are injected. Timing is separate.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

function prepareNative(quality) {
  const app=window.__qaApp;
  if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value ||
      !window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Snow requires memory-only QA.');
  app.stop();app.audio.setMuted(true);app.setGraphicsQuality(quality);
  const def=app.getMenuCourse(0).def;
  window.__snowOriginal={def,values:{...def}};
  Object.assign(def,{name:'Winter renderer QA',theme:'alpine',closed:true,laps:3,
    hasRadar:false,noTraffic:true,airborne:true,layoutVersion:90,
    scenery:{trees:100,rocks:30,mountains:true},
    script:[['straight',500,{name:'Lodge Straight',width:16,surface:'snow',climb:40,walls:'none'}],
      ['turn','L',180,80,{name:'Exposed Ridge',width:16,walls:'none'}],
      ['straight',500,{name:'Dry Descent',width:16,climb:-40,walls:'none'}],
      ['turn','L',180,80,{name:'Home Bend',width:16,walls:'none'}]],
    surfacePatches:[{id:'shaded-winter-ice',kind:'ice',s0:540,s1:575,shaded:true}],
    snowWorld:{ranges:[{from:0,to:750}],exposed:[{from:500,to:730}],
      ponds:[{s:180,lateral:32,radiusX:9,radiusZ:12}]}});
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
}

function setView(view) {
  const app=window.__qaApp,api=window.__render,course=app.duel.course,state=app.duel.state;
  if(view==='grid'){
    const poses=[state,...state.opponents].map(actor=>course.groundAt(actor.s,actor.lateral));
    const center=poses.reduce((p,a)=>({x:p.x+a.x/poses.length,y:p.y+a.y/poses.length,z:p.z+a.z/poses.length}),{x:0,y:0,z:0});
    const heading=course.at(state.s).heading;
    app.inspectionCamera={position:[center.x-Math.sin(heading)*52,center.y+23,center.z-Math.cos(heading)*52],
      target:[center.x,center.y+1,center.z]};
  }else{
    const p=course.groundAt(state.s,0),h=p.heading;
    app.inspectionCamera={position:[p.x-Math.sin(h)*24+Math.cos(h)*7,p.y+9,p.z-Math.cos(h)*24-Math.sin(h)*7],
      target:[p.x+Math.sin(h)*28,p.y+1,p.z+Math.cos(h)*28]};
    if(view==='pond'){
      const pond=course.groundAt(180,32);
      app.inspectionCamera={position:[pond.x-18,pond.y+14,pond.z-28],target:[pond.x,pond.y,pond.z]};
    }
  }
  api.renderFrame();
}

function witness(view) {
  const app=window.__qaApp,api=window.__render,state=app.duel.state;
  const snow=api.scene.getObjectByName('Authored snow world');
  const flakes=snow?.getObjectByName('Camera-local snow and ridge gusts');
  const tracks=snow?.getObjectByName('Actual wheel snow tracks');
  if(!snow||!flakes||!tracks)throw Error('Native Snow world/effects are missing.');
  const terrain=[];api.scene.traverse(mesh=>{
    if(mesh.isMesh && mesh.geometry?.attributes.winterWeight){
      const weight=mesh.geometry.attributes.winterWeight;
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
  const programs=api.renderer.info.programs;
  if(programs.some(program=>!program.isReady()))throw Error('A submitted Snow shader is not ready.');
  return {view,quality:nativeQuality,field:cars.length,visibleCars,s:state.s,
    terrain,kitIds:ids,placements:placements.length,kitStats:{...kitStats},flakes:limits.flakes,liveMarks,markCap:tracks.count,pondVertices:pond.geometry.attributes.position.count,
    programs:programs.length};
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
  const report={card:'P4-SNOW',captures:[],frameStatus:'not scheduled',passed:false};
  try{
    for(const quality of ['high','performance']){
      await context.navigate('/tools/menu-check.html?flags=grand-prix,snow-world');
      await context.waitFor(`window.__qaApp?.visualReady&&!document.querySelector('#start-engine')?.disabled`, 'native isolated menu',60000);
      await context.evaluate('('+prepareNative.toString()+')('+JSON.stringify(quality)+')');
      await context.waitFor(`window.__qaApp.visualReady&&window.__render?.scene.getObjectByName('Authored snow world')`, 'approved Snow assets in the actual menu world',60000);
      await context.evaluate('('+startNative.toString()+')()');
      await context.waitFor(`window.__qaApp.visualReady&&window.__render?.scene.getObjectByName('Authored snow world')`, 'fresh native full-field winter world',60000);
      await context.evaluate(`document.head.insertAdjacentHTML('beforeend','<style>details,#race-hud,#modal-layer,.combat-opponent-marker{display:none!important}</style>')`);
      report.captures.push(await capture(context,quality,'grid'));
      await driveTo(context,190);report.captures.push(await capture(context,quality,'tracks'));
      report.captures.push(await capture(context,quality,'pond'));
      await driveTo(context,600);report.captures.push(await capture(context,quality,'ridge'));
      await context.evaluate(`(()=>{
        const original=window.__snowOriginal;
        window.__qaApp.returnToMenu();
        for(const key of Object.keys(original.def))if(!Object.hasOwn(original.values,key))delete original.def[key];
        Object.assign(original.def,original.values);window.__qaApp._menuCourses.clear();delete window.__snowOriginal;
        if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||!window.name.startsWith('__duel_qa_tab_v2:'))
          throw Error('Only the established disposable QA tab adapter may reset.');
        window.name='';
      })()`);
    }
    report.passed=true;
    console.log('Snow native High/Performance: full eight-car field, terrain, pond, ridge, actual wheel tracks and read-only rendering pass. Frames remain separately scheduled.');
  }finally{
    await writeFile(join(context.outputDir,'p4-snow.json'),JSON.stringify(report,null,2)+'\n');
    await context.evaluate(`(()=>{const original=window.__snowOriginal;if(!original)return;
      for(const key of Object.keys(original.def))if(!Object.hasOwn(original.values,key))delete original.def[key];
      Object.assign(original.def,original.values);window.__qaApp._menuCourses.clear();delete window.__snowOriginal;})()`);
  }
}
