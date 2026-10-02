import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

async function settled(context, label) {
  await context.waitFor(`(()=>{const a=window.__qaApp,r=window.__render;if(!a||!r)return false;
    a.onFrame?.(a.duel.state,0);r.renderFrame();return a.visualReady&&
      document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&
      document.querySelector('#renderer-loading')?.hidden;})()`, label, 60_000);
}

async function start(context, quality, venue) {
  await context.evaluate(`(()=>{const a=window.__qaApp;a.stop();a.audio.setMuted(true);
    if(!window.name.startsWith('__duel_qa_tab_v2:')||!Object.getOwnPropertyDescriptor(window,'localStorage')?.value)
      throw Error('Pit requires memory-only QA storage');
    a.setGraphicsQuality(${JSON.stringify(quality)});
    for(const d of document.querySelectorAll('details'))if(d.querySelector('summary')?.textContent.startsWith('MENU QA'))d.open=false;
    if(!a.duel.startArenaEvent({venueId:${JSON.stringify(venue)},mode:'last-car-rolling',seed:1989,
      car:'falcone_f42',cpuDifficulty:'medium',opponents:[{car:'dusthawk_rally',brain:'rammer'}]}))
      throw Error('Native private arena entry failed');a.duel.state.countdown=0;a.duel.step(1/120);
    a.onFrame?.(a.duel.state,0);})()`);
  await settled(context, quality+' '+venue+' actual world');
}

async function pose(context, mode) {
  await context.evaluate(`(()=>{const a=window.__qaApp,d=a.duel,s=d.state;
    const station=d.course.length*.15;
    for(const [index,actor]of[s,...s.opponents].entries())Object.assign(actor,{s:station+index*16,
      prevS:station+index*16,lateral:index?8:0,prevLateral:index?8:0,headingError:0,
      speedMph:0,pushVelocity:0,yawVelocity:0,knock:null,airborne:false,airHeight:0});
    if(${JSON.stringify(mode)}==='full'){
      const first=d.course.worldAt(0),opposite=d.course.worldAt(d.course.length/2),
        cx=(first.x+opposite.x)/2,cz=(first.z+opposite.z)/2;
      a.inspectionCamera={position:[cx+125,145,cz+170],target:[cx,0,cz]};
    }else a.inspectionCamera=null;
    const before=JSON.stringify({state:s,features:d.course.features});
    a.onFrame?.(s,0);window.__render.renderFrame();
    if(before!==JSON.stringify({state:s,features:d.course.features}))throw Error('Pit presentation changed native rules');
    if(d.course.def.id==='pit'){
      const world=window.__render.scene.getObjectByName('The Pit');
      if(!world?.getObjectByName('Pit physical floor')||
        !world.getObjectByName('Pit hulk wall, centre pile and oval-end scrap')||
        !world.getObjectByName('Stadium spectators'))throw Error('Actual Pit composition missing');
    }
  })()`);
  await settled(context, mode+' camera assets');
}

async function frames(context) {
  return context.evaluate(`(async()=>{const a=window.__qaApp;a.inspectionCamera=null;a.start();
    const times=[];let last=0;for(let i=0;i<150;i++){
      const t=await new Promise(requestAnimationFrame);if(last&&i>30)times.push(t-last);last=t;
    }a.stop();const sorted=[...times].sort((x,y)=>x-y);
    return{meanMs:times.reduce((x,y)=>x+y,0)/times.length,p95Ms:sorted[Math.floor(sorted.length*.95)],
      draws:window.__render.renderer.info.render.calls,triangles:window.__render.renderer.info.render.triangles};})()`);
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width:1280,height:720,deviceScaleFactor:1,mobile:false});
  const report={card:'ARENA-PIT',privateNativeEntry:true,memoryOnly:true,captures:[],frames:[],limits:
    ['Future boss cards own Pit selection. No public picker or boss acceptance is claimed.',
      'Claude comparison and Kyle feel verdicts remain human decisions.']};
  try{
    for(const quality of ['high','performance']){
      await context.navigate('/tools/menu-check.html?harness=arena-pit-'+quality);
      await context.waitFor('!!window.__qaApp&&!!window.__render','Pit QA menu',60_000);
      for(const venue of ['scrapdome','pit']){
        await start(context,quality,venue);
        for(const mode of ['full','racing']){
          await pose(context,mode);const path=await context.screenshot(quality+'-'+venue+'-'+mode);
          report.captures.push({quality,venue,mode,path});
        }
        if(process.env.PIT_MEASURE_FRAMES==='1'){
          await pose(context,'racing');report.frames.push({quality,venue,...await frames(context)});
        }
      }
      if(process.env.PIT_MEASURE_FRAMES==='1'){
        const baseline=report.frames.find(row=>row.quality===quality&&row.venue==='scrapdome');
        const pit=report.frames.find(row=>row.quality===quality&&row.venue==='pit');
        if(pit.p95Ms>baseline.p95Ms*1.1)throw Error(quality+' Pit frame P95 exceeds ring by more than 10%');
      }
    }
    report.passed=true;
  }catch(error){report.passed=false;report.failure=error.stack;throw error;}
  finally{await writeFile(join(context.outputDir,'arena-pit-browser.json'),JSON.stringify(report,null,2)+'\n');}
}
