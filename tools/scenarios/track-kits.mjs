// Real unchanged circuit kits through production world readiness. Memory-only;
// no art round or frame measurement. Run only in the Director's quiet slot.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {TRACK_KIT_IDS} from '../../src/track-kits.js';

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
  app.inspectionCamera={position:[eye.x,eye.y+150,eye.z],target:[target.x,target.y+4,target.z]};
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
    kits.traverse(n=>{if(!n.isInstancedMesh)return;let active=false;
      for(let i=0;i<n.instanceMatrix.array.length;i+=16)if(n.instanceMatrix.array[i]||n.instanceMatrix.array[i+1]||n.instanceMatrix.array[i+2])active=true;
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

export async function run(context) {
  const report={passed:false,qualities:[],snapshots:[]};
  const persist=()=>writeFile(join(context.outputDir,'track-kits.json'),JSON.stringify(report,null,2)+'\n');
  try {
    for(const quality of ['high','performance']) {
      report.snapshots.push(await snapshotReadiness(context,quality));
      report.snapshots.push(await snapshotReadiness(context,quality,true));
      await persist();
      await context.navigate('/tools/menu-check.html?flags=grand-prix');
      await context.waitFor('window.__qaApp?.visualReady && !!window.__render','native empty-route ready',60000);
      const rows=TRACK_KIT_IDS.map((id,index)=>id==='start-gantry'?{id,s:15,lateral:0}:
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
        const active=mesh=>{const array=mesh.instanceMatrix.array;for(let i=0;i<array.length;i+=16)
          if(array[i]||array[i+1]||array[i+2])return true;return false;};
        if(${JSON.stringify(quality)}==='performance'&&highBatches.some(active))throw Error('Performance submitted High kit instances');
        if(${JSON.stringify(quality)}==='high'&&!highBatches.some(active))throw Error('Near High kit instances missing');
        if(view.renderer.info.programs.some(program=>!program.isReady()))throw Error('Kit world claimed ready before native shader readiness');
        if(JSON.stringify(app.duel.state)!==window.__kitState||JSON.stringify(app.profile)!==window.__kitProfile)
          throw Error('Kit loading or rendering changed race/profile');
        return {batches,skins,textures:textures.size,worldBuilds:document.querySelector('#view3d').dataset.worldBuilds,
          programs:view.renderer.info.programs.length};
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
    report.passed=true;
  } finally {await persist();}
  console.log('Track kits: real textures, both native qualities, genuine countdown, read-only state and visible source failure passed.');
}
