// DEEP-RAMP-2: private memory-only acceptance pictures of the actual installed ramp.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await context.navigate('/tools/menu-check.html?flags=the-deep');
  await context.waitFor(`!!window.__qaApp?.visualReady && !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`,'memory-only game',90000);
  await context.waitFor(`[...document.querySelectorAll('details button')].some(n=>n.textContent==='Create funded temporary player')`,'temporary player fixture',90000);
  await context.evaluate(`(()=>{
    [...document.querySelectorAll('details button')].find(n=>n.textContent==='Create funded temporary player').click();
    const a=window.__qaApp;a.audio.setMuted(true);a.profile={...a.profile,deep:{kit:true}};a._saveProfile();
    for(const panel of document.querySelectorAll('details'))panel.hidden=true;
    a.startCampaign({mode:'duel',seed:1989,opponentCount:1,startStage:0});
    window.__rampPlace=(progress,side=0,angle=0)=>{const d=a.duel,s=d.state,r=d.course.deepRamp,first=r.points[0],last=r.points.at(-1),t=progress/r.length;
      const x=first.x+(last.x-first.x)*t+Math.cos(r.heading)*side,z=first.z+(last.z-first.z)*t-Math.sin(r.heading)*side,n=d.course.nearest(x,z);
      Object.assign(s,{status:'racing',countdown:0,paused:false,s:n.s,prevS:n.s,lateral:n.lateral,prevLateral:n.lateral,
        headingError:Math.atan2(Math.sin(r.heading+angle-d.course.at(n.s).heading),Math.cos(r.heading+angle-d.course.at(n.s).heading)),
        groundHeight:first.y+(last.y-first.y)*t,airHeight:0,prevAirHeight:0,airborne:false,impactTimer:0,speedMph:0,_jumpY:null});
    };
    window.__rampPlace(0);
  })()`);
  await context.waitFor(`window.__qaApp.duel.course.deepRamp && document.querySelector('#view3d').dataset.vehicleAsset==='ready'`,'ramp world ready',90000);
  const captures=[];
  const shot=async(name,setup)=>{
    await context.evaluate(setup);await new Promise(done=>setTimeout(done,1800));
    const error=await context.evaluate(`document.querySelector('#renderer-error').hidden`);
    if(!error)throw Error('Renderer error at '+name);
    captures.push(await context.screenshot(name));
  };
  await shot('turn-off',`(()=>{window.__rampPlace(0);const a=window.__qaApp,r=a.duel.course.deepRamp,f=r.points[0],h=r.heading;
    a.inspectionCamera={position:[f.x+Math.cos(h)*23-Math.sin(h)*6,f.y+5,f.z-Math.sin(h)*23-Math.cos(h)*6],target:[f.x,f.y,f.z]};})()`);
  await shot('ramp-from-road',`(()=>{window.__rampPlace(4);const a=window.__qaApp,r=a.duel.course.deepRamp,f=r.points[0],h=r.heading;
    a.inspectionCamera={position:[f.x-Math.sin(h)*8,f.y+11,f.z-Math.cos(h)*8],target:[f.x+Math.sin(h)*50,f.y-15,f.z+Math.cos(h)*50]};})()`);
  await shot('descent-chase',`(()=>{const a=window.__qaApp;a.inspectionCamera=null;window.__rampPlace(42);})()`);
  const guidance=await context.evaluate(`document.querySelector('#callout-text').textContent`);
  if(guidance!=='BOAT RAMP')throw Error('Ramp guidance missing: '+guidance);
  await shot('water-choice',`(()=>{const a=window.__qaApp;a.inspectionCamera=null;window.__rampPlace(a.duel.course.deepRamp.shoreline.center.progress-.04);
    const d=a.duel;d.state.paused=false;d.state.speedMph=12;d.setInput({throttle:1});})()`);
  await context.waitFor(`window.__qaApp.duel.state.deepJourney?.phase==='choice'`,'actual shoreline choice',30000);
  const result=await context.evaluate(`(()=>{const d=window.__qaApp.duel;return{turnoff:d.deepRuntime.ramp.atDistance,width:d.deepRuntime.ramp.width,phase:d.state.deepJourney.phase,speed:d.state.speedMph};})()`);
  if(result.width!==12||result.turnoff!==2184||result.speed!==0)throw Error('Ramp acceptance failed: '+JSON.stringify(result));
  await writeFile(join(context.outputDir,'ramp-result.json'),JSON.stringify({result,captures},null,2)+'\n');
}
