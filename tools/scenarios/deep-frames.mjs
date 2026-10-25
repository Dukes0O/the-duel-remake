// FINISH-DEEP: normal game camera in the Kelp Coast forest, full native schools.
// Same delivered RAF sample and limits as frame-pacing; no synthetic draws.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {summarizeNightFrames} from './frame-pacing.mjs';

async function measure(context, quality) {
  await context.navigate(`/tools/menu-check.html?flags=the-deep&deep-frames=${quality}`);
  await context.waitFor(`window.__qaApp?.visualReady &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' &&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value &&
    window.name.startsWith('__duel_qa_tab_v2:')`, 'isolated real menu', 90000);
  await context.evaluate(`(() => {
    const a=window.__qaApp, select=document.querySelector('#graphics-quality');
    select.value=${JSON.stringify(quality)};select.dispatchEvent(new Event('change',{bubbles:true}));
    for(const panel of document.querySelectorAll('details'))panel.hidden=true;
    if(!a.addPlayer('Deep Frames ${quality}').ok)throw Error('Temporary player failed');
    a.profile={...a.profile,deep:{kit:true}};a._saveProfile();a.audio.setMuted(true);
    window.__deepFrames={started:performance.now(),builds:document.querySelector('#view3d').dataset.worldBuilds};
    if(!a.startCampaign({mode:'duel',seed:1990,opponentCount:1,startStage:0}))throw Error('Race failed');
    a.start();
  })()`);
  await context.waitFor(`window.__qaApp.visualReady &&
    document.querySelector('#view3d').dataset.worldBuilds!==window.__deepFrames.builds &&
    document.querySelector('#view3d').dataset.vehicleAsset==='ready' &&
    ['off','ready'].includes(document.querySelector('#view3d').dataset.trackKitAsset)`, 'first Pacific scene', 90000);
  await context.evaluate(`(() => {
    const a=window.__qaApp,d=a.duel,s=d.state,ramp=d.course.deepRamp,q=window.__deepFrames;
    q.firstLoadMs=performance.now()-q.started;
    q.worldBuildMs=Number(document.querySelector('#view3d').dataset.worldBuildMs);
    if(!ramp||!a._switches().enabled('the-deep'))throw Error('Deep ramp missing');
    const p=ramp.shoreline.center.progress-.04;
    let point;for(let i=1;i<ramp.points.length;i++){
      const a=ramp.points[i-1],b=ramp.points[i];if(p>b.progress&&i<ramp.points.length-1)continue;
      const t=(p-a.progress)/(b.progress-a.progress);
      point={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};break;
    }
    const near=d.course.nearest(point.x,point.z);
    Object.assign(s,{status:'racing',countdown:0,s:near.s,prevS:near.s,lateral:near.lateral,prevLateral:near.lateral,
      headingError:Math.atan2(Math.sin(ramp.heading-d.course.at(near.s).heading),Math.cos(ramp.heading-d.course.at(near.s).heading)),
      speedMph:30,groundHeight:point.y,airHeight:0,prevAirHeight:0,airborne:false,impactTimer:0,_jumpY:null});
    // Observe the real underwater scene without changing its draw or quality.
    const renderer=window.__render.renderer,render=renderer.render;
    q.restore=()=>{renderer.render=render;};
    renderer.render=function(scene,...args){
      if(scene.getObjectByName('The Deep: kelp-coast'))q.scene=scene;
      return render.call(this,scene,...args);
    };
  })()`);
  await context.waitFor(`window.__qaApp.duel.state.deepJourney?.phase==='choice'`, 'dive choice', 30000);
  await context.evaluate(`window.__deepFrames.diveStarted=performance.now();window.__qaApp.chooseDeep('dive')`);
  await context.waitFor(`window.__qaApp.duel.state.deepJourney?.phase==='underwater' && !!window.__deepFrames.scene`, 'Kelp Coast dive', 60000);
  await context.evaluate(`(() => {
    const d=window.__qaApp.duel,s=d.state,zone=d.deepRuntime.zone;
    const spot=zone.spots.find(row=>row.creature==='silver-school'),point=zone.trail[spot.trailIndex];
    if(zone.id!=='kelp-coast'||point.kelp!==1||spot.count!==3)throw Error('Full-density forest missing');
    const near=d.course.nearest(point.x,point.z,s.s);
    Object.assign(s,{s:near.s,prevS:near.s,lateral:near.lateral,prevLateral:near.lateral,
      headingError:0,speedMph:0,yawVelocity:0,pushVelocity:0,airborne:false,airHeight:0,prevAirHeight:0,_jumpY:null});
    window.__deepFrames.forest={x:point.x,z:point.z,trailIndex:spot.trailIndex};
  })()`);
  await context.waitFor(`(() => {
    const scene=window.__deepFrames.scene,schools=[];
    scene?.traverse(o=>{if(o.name==='Fish school')schools.push(o);});
    return schools.length===3 && schools.every(o=>o.visible) &&
      schools.reduce((n,o)=>n+o.count,0)===${quality === 'high' ? 480 : 318};
  })()`, 'three full visible sardine schools', 90000);
  // Face the actual animated schools with the normal chase camera, rather
  // than looking down the trail with the fish above or behind the car.
  await context.evaluate(`(() => {
    const d=window.__qaApp.duel,s=d.state,schools=[];
    window.__deepFrames.scene.traverse(o=>{if(o.name==='Fish school')schools.push(o);});
    let x=0,z=0,count=0;
    for(const school of schools)for(let i=0;i<school.count;i++){
      x+=school.instanceMatrix.array[i*16+12];z+=school.instanceMatrix.array[i*16+14];count++;
    }
    x/=count;z/=count;
    const heading=d.course.at(s.s).heading,px=x-Math.sin(heading)*22,pz=z-Math.cos(heading)*22;
    const near=d.course.nearest(px,pz,s.s),delta=heading-d.course.at(near.s).heading;
    Object.assign(s,{s:near.s,prevS:near.s,lateral:near.lateral,prevLateral:near.lateral,
      headingError:Math.atan2(Math.sin(delta),Math.cos(delta)),speedMph:0,yawVelocity:0,pushVelocity:0});
  })()`);
  // Let streamed floor tiles and shaders settle, as the existing driving sample does.
  await new Promise(done=>setTimeout(done,1200));
  const observed=await context.evaluate(`(async () => {
    const a=window.__qaApp,d=a.duel,s=d.state,q=window.__deepFrames;
    q.restore();
    const schools=[];q.scene.traverse(o=>{if(o.name==='Fish school')schools.push(o);});
    const diveLoadMs=performance.now()-q.diveStarted,before=s.deepJourney.elapsedSec,intervals=[];
    await new Promise((done,reject)=>{
      let previous=null;
      const sample=now=>{
        if(document.hidden||document.visibilityState!=='visible'||!a.running||!a.visualReady||s!==d.state||s.paused||
          s.deepJourney?.phase!=='underwater'||d.deepRuntime.zone.id!=='kelp-coast'||a.autopilot||a.inspectionCamera||
          (a.ambientOcclusionEnabled!==false?'high':'performance')!==${JSON.stringify(quality)}||
          schools.length!==3||schools.some(o=>!o.visible)||schools.reduce((n,o)=>n+o.count,0)!==${quality === 'high' ? 480 : 318})
          return reject(Error('Visible native dive, full schools or quality changed during timing'));
        if(previous!==null)intervals.push(now-previous);previous=now;
        if(intervals.length===120)return done();requestAnimationFrame(sample);
      };requestAnimationFrame(sample);
    });
    if(!(s.deepJourney.elapsedSec>before))throw Error('Dive simulation stopped during sample');
    return {intervals,worldBuildMs:q.worldBuildMs,firstLoadMs:q.firstLoadMs,diveLoadMs,
      zone:d.deepRuntime.zone.id,forest:q.forest,schools:schools.map(o=>o.count),
      elapsedBefore:before,elapsedAfter:s.deepJourney.elapsedSec,
      memoryOnlySaves:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value};
  })()`);
  const {intervals,...details}=observed;
  const report={quality:quality==='high'?'High':'Performance',...details,...summarizeNightFrames(intervals)};
  await context.screenshot(`deep-frames-${quality}`);
  console.log(JSON.stringify(report));
  return report;
}

export async function run(context) {
  if(context.headed!==true||context.launchMode!=='headed')throw Error('Deep frames require headed mode');
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  const reports=[];
  try {
    for(const quality of ['high','performance'])reports.push(await measure(context,quality));
  } finally {
    await writeFile(join(context.outputDir,'deep-frames.json'),JSON.stringify({reports},null,2)+'\n');
  }
  for(const row of reports){
    if(row.firstLoadMs>5000)console.log('WARNING '+row.quality+': first load '+row.firstLoadMs+' ms exceeds 5 s');
    if(row.p95>18.5||!Number.isFinite(row.worldBuildMs)||row.worldBuildMs<0||row.worldBuildMs>=1000)
      throw Error(row.quality+': Deep frame/world-build budget failed: '+JSON.stringify(row));
  }
}
