// Quiet-only authored track cost, using the unchanged DAY sample and limits.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {nativeBundle} from './p4-panorama.mjs';
import {installMeasurement, summarizeFrameTiming} from './p4-daynight.mjs';

function prepare() {
  const app=window.__qaApp, api=window.__render, d=app.duel, state=d.state;
  app.stop();app.audio.setMuted(true);
  if(state.mode!=='grandprix'||state.opponents.length!==7)throw Error('Native eight-car Grand Prix required');
  const definition=d.course.def, fixed=look=>({axis:'race-progress',keyframes:[{at:0,look}]});
  // Presentation-only path copy; the original catalog and all racers stay exact.
  d.course.def={...definition,lightPath:fixed('night')};
  const c=d.course, eye=c.groundAt(-68,-42),target=c.groundAt(-24,0);
  app.inspectionCamera={position:[eye.x,eye.y+20,eye.z],target:[target.x,target.y+1,target.z]};
  // Fix the presentation camera before the sampler records its first witness.
  api.camera.position.fromArray(app.inspectionCamera.position);
  const profile=JSON.stringify(app.profile), race=JSON.stringify(state);
  document.head.insertAdjacentHTML('beforeend','<style>details,#overlay,.rear-view-frame,#race-hud,#modal-layer,.combat-opponent-marker{display:none!important}</style>');
  const review=window.__dayNightReview={};
  review.setLook=look=>{
    d.course.def={...definition,lightPath:fixed(look==='on'?'night':'day')};
    const kits=api.scene.getObjectByName('Approved track kits');
    const landmarks=api.scene.getObjectByName('Authored circuit landmarks');
    if(!kits||!landmarks)throw Error('Actual circuit presentation missing');
    kits.visible=landmarks.visible=look==='on';api.renderFrame();
  };
  review.witness=()=>{
    if(JSON.stringify(state)!==race||JSON.stringify(app.profile)!==profile)throw Error('Frame fixture changed race/profile');
    const cars=api.scene.children.filter(o=>o.visible&&o.userData.vehicleKey);
    if(cars.length!==8)throw Error('Missing actual native car');
    api.camera.updateWorldMatrix(true,false);
    const models=cars.map(car=>{
      car.updateWorldMatrix(true,true);
      const p=car.getWorldPosition(car.position.clone());p.y+=.8;p.project(api.camera);
      if(p.z<-1||p.z>1||Math.abs(p.x)>=.96||Math.abs(p.y)>=.96)throw Error('Native car outside frame view');
      return {key:car.userData.vehicleKey,position:car.position.toArray()};
    });
    return {models,camera:api.camera.position.toArray(),target:app.inspectionCamera.target,
      course:c.def.id,kits:api.scene.getObjectByName('Approved track kits').visible,
      landmarks:api.scene.getObjectByName('Authored circuit landmarks').visible};
  };
  review.setLook('on');return review.witness();
}

export async function run(context) {
  if(process.env.P4_PANORAMA_MEASURE_FRAMES!=='1')throw Error('Director must schedule a quiet frame slot');
  const report={passed:false,scope:'Same complete ground/road and real stationary eight-car grid; kits/landmarks/day off versus kits/landmarks/night on. Native preparation continues. Mirror/HUD hidden for isolated main-view cost; not moving-camera or mirror cost, or old incomplete-ground source.',frames:[],comparisons:[]};
  const persist=()=>writeFile(join(context.outputDir,'p4-panorama-frames.json'),JSON.stringify(report,null,2)+'\n');
  const bundle=await nativeBundle();
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  try {
    for(const quality of ['high','performance']) {
      await context.navigate('/tools/menu-check.html?flags=grand-prix,panorama-ridge');
      await context.waitFor('!!window.__qaApp?.visualReady && !!window.__render','native memory menu',60000);
      await context.evaluate(bundle+';globalThis.__panQa=PanQa;');
      await context.evaluate('(()=>{const a=window.__qaApp;if(!Object.getOwnPropertyDescriptor(window,"localStorage")?.value||!window.name.startsWith("__duel_qa_tab_v2:"))throw Error("Memory QA required");window.__panQa.ownTestCourses(a);a.setGraphicsQuality('+JSON.stringify(quality)+');const i=[...document.querySelector("#scene-select").options].map(o=>Number(o.value)).find(i=>a.getMenuCourse(i)?.def.id==="panorama-ridge");if(!a.startCampaign({mode:"grandprix",startStage:i,car:"stuttgart_959s",seed:1989,fieldSeed:1000,cpuDifficulty:"medium"}))throw Error("Native grid rejected");a.stop();})()');
      await context.waitFor('(()=>{window.__render.renderFrame();return !!window.__qaApp.visualReady && document.querySelector("#view3d").dataset.trackKitAsset==="ready";})()','actual approved kits ready',90000);
      await context.evaluate('('+prepare.toString()+')()');
      for(let pair=0;pair<2;pair++) {
        for(const look of pair===0?['off','on']:['on','off']) {
          await context.evaluate('window.__dayNightReview.setLook('+JSON.stringify(look)+')');
          await context.evaluate('('+installMeasurement.toString()+')('+JSON.stringify(quality)+',true)');
          try {
            await context.waitFor('window.__dayNightFrames.done','complete unchanged frame sample',60000);
            await context.waitFor('(()=>{const r=window.__dayNightFrames;r.poll();return r.pending.length===0||r.disjoint;})()','GPU completion',10000);
            const r=await context.evaluate('(()=>{const r=window.__dayNightFrames;if(r.disjoint||JSON.stringify(r.before)!==JSON.stringify(r.after))throw Error("Invalid frame witness or GPU sample");return {cpu:r.cpu,gpu:r.gpu,frames:r.frames,update:r.rendererUpdate,whole:r.updateAndSubmit,gpuSupported:r.gpuSupported,scales:[...r.scales],ratios:[...r.ratios],witness:r.before};})()');
            const timing={cpu:summarizeFrameTiming(r.cpu),gpu:summarizeFrameTiming(r.gpu),delivered:summarizeFrameTiming(r.frames)};
            if(timing.cpu?.samples!==360||timing.delivered?.samples<359||r.gpuSupported&&(!timing.gpu||timing.gpu.samples<288)||r.scales.length!==1||r.ratios.length!==1)throw Error('Incomplete or changing-resolution samples');
            report.frames.push({quality,pair,look,timing,update:summarizeFrameTiming(r.update),whole:summarizeFrameTiming(r.whole),witness:r.witness,scales:r.scales,ratios:r.ratios});await persist();
          } finally {await context.evaluate('window.__dayNightFrames.cleanup()');}
        }
        const rows=report.frames.filter(r=>r.quality===quality&&r.pair===pair),off=rows.find(r=>r.look==='off'),on=rows.find(r=>r.look==='on');
        const comparisons={quality,pair};
        for(const metric of ['cpu','gpu','delivered']) {
          if(!off.timing[metric]&&!on.timing[metric]&&metric==='gpu'){comparisons.gpu='unsupported';continue;}
          const increase=on.timing[metric].p95/off.timing[metric].p95-1;
          comparisons[metric]={off:off.timing[metric].p95,on:on.timing[metric].p95,increase,passed:increase<=.10};
        }
        report.comparisons.push(comparisons);await persist();
      }
    }
    if(report.comparisons.some(row=>['cpu','gpu','delivered'].some(k=>row[k]?.passed===false)))throw Error('Original 10% presentation frame limit exceeded');
    report.passed=true;
  } finally {await persist();}
  console.log('Panorama quiet native eight-car CPU/GPU/delivered comparisons pass.');
}
