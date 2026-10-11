// Actual renderer + fixed-step pit service. Private memory-only QA, no timing.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const definition={id:'pit-test',name:'Pit service QA',stage:97,theme:'alpine',closed:false,
  laps:1,noTraffic:true,hasRadar:false,hasRival:false,airborne:true,speedLimitMph:100,
  sections:[{theme:'alpine',name:'Test',share:1}],pitLane:{straight:'Service Straight',side:'right'},
  script:[['straight',500,{name:'Service Straight'}],['turn','L',90,80,{surface:'snow'}],['straight',800]]};
export async function run(context){
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  const results=[];
  for(const quality of ['high','performance']){
    await context.navigate('/tools/menu-check.html');
    await context.waitFor(`document.readyState==='complete' && !!window.__qaApp && document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`,'memory-only renderer ready',60000);
    await context.evaluate(`(async()=>{
      const app=window.__qaApp;app.stop();app.audio.setMuted(true);
      for(const d of document.querySelectorAll('details'))if(d.querySelector('summary')?.textContent.startsWith('MENU QA'))d.open=false;
      const select=document.querySelector('#graphics-quality');select.value=${JSON.stringify(quality)};select.dispatchEvent(new Event('change',{bubbles:true}));
      app.autopilot=false;
      app.duel.startCampaign({startStage:0,seed:1989,car:'falcone_f42',opponentCount:0});
      app.duel.course=new app.duel.course.constructor(${JSON.stringify(definition)},1989);
      const s=app.duel.state,lane=app.duel.course.pitLane;window.__pitEvents=[];
      app.duel.onChange((_s,e)=>{if(e.pitCue)window.__pitEvents.push(e.pitCue);});
      Object.assign(s,{status:'racing',countdown:0,traffic:[],opponents:[],rival:null,lapsTotal:1,s:lane.entry+80,lateral:lane.offsetAt(lane.entry+80),speedMph:100,paused:false});
      app.duel.setInput({throttle:1,boost:true});app.duel.step(1/120);s.paused=false;

    })()`);
    await context.waitFor(`(()=>{const a=window.__qaApp;a.onFrame?.(a.duel.state,0);window.__render?.renderFrame();return a.visualReady&&document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&document.querySelector('#renderer-loading')?.hidden;})()`,'pit renderer ready',60000);

    const limit=await context.evaluate(`({speed:window.__qaApp.duel.state.speedMph*1.609344,boosting:window.__qaApp.duel.state.boosting,cues:window.__pitEvents.slice()})`);
    if(limit.speed>60.0000000001||limit.boosting||!limit.cues.includes('pit.limiter'))throw Error('Actual limiter failed '+JSON.stringify(limit));
    await context.evaluate(`(()=>{const a=window.__qaApp;for(let i=0;i<24;i++){a.onFrame?.(a.duel.state,1/60);window.__render.renderFrame();}})()`);
    await context.screenshot('pit-limiter-'+quality);
    await context.evaluate(`window.__pitStorage=()=>JSON.stringify(Array.from({length:localStorage.length},(_,i)=>{const k=localStorage.key(i);return [k,localStorage.getItem(k)];}));window.__pitBefore=window.__pitStorage()`);
    await context.evaluate(`(()=>{const d=window.__qaApp.duel,s=d.state,l=d.course.pitLane;Object.assign(s,{s:l.box,lateral:l.offsetAt(l.box),speedMph:0,boost:.1,paused:false});for(let i=0;i<120;i++)d.step(1/120);s.paused=false;})()`);
    await context.evaluate(`(()=>{const a=window.__qaApp;for(let i=0;i<24;i++){a.onFrame?.(a.duel.state,1/60);window.__render.renderFrame();}})()`);
    const working=await context.evaluate(`({phase:window.__qaApp.duel.state.pit?.phase,tyre:window.__qaApp.duel.state.tyre??'summer',speed:window.__qaApp.duel.state.speedMph,text:document.querySelector('#pit-readout')?.textContent})`);
    if(working.phase!=='servicing'||working.tyre!=='summer'||working.speed!==0||!working.text.startsWith('FITTING WINTER'))throw Error('Actual hold failed '+JSON.stringify(working));
    await context.evaluate(`(()=>{const a=window.__qaApp;for(let i=0;i<24;i++){a.onFrame?.(a.duel.state,1/60);window.__render.renderFrame();}})()`);
    await context.screenshot('pit-working-'+quality);
    await context.evaluate(`(()=>{const d=window.__qaApp.duel,s=d.state;s.paused=false;for(let i=0;i<360;i++)d.step(1/120);s.paused=false;})()`);
    await context.evaluate(`(()=>{const a=window.__qaApp;for(let i=0;i<24;i++){a.onFrame?.(a.duel.state,1/60);window.__render.renderFrame();}})()`);
    const ready=await context.evaluate(`({phase:window.__qaApp.duel.state.pit?.phase,tyre:window.__qaApp.duel.state.tyre,boost:window.__qaApp.duel.state.boost,cues:window.__pitEvents.slice(),text:document.querySelector('#pit-readout')?.textContent})`);
    if(ready.phase!=='ready'||ready.tyre!=='winter'||ready.boost!==1||ready.cues.filter(c=>c==='pit.go').length!==1||ready.text!=='GO')throw Error('Actual service failed '+JSON.stringify(ready));
    await context.evaluate(`(()=>{const a=window.__qaApp;for(let i=0;i<24;i++){a.onFrame?.(a.duel.state,1/60);window.__render.renderFrame();}})()`);
    await context.screenshot('pit-go-'+quality);
    await context.evaluate(`(()=>{const d=window.__qaApp.duel,s=d.state;s.paused=false;d.setInput({throttle:1,steer:0,boost:true});for(let i=0;i<120;i++)d.step(1/120);s.paused=false;})()`);
    await context.evaluate(`(()=>{const a=window.__qaApp;for(let i=0;i<24;i++){a.onFrame?.(a.duel.state,1/60);window.__render.renderFrame();}})()`);
    const departure=await context.evaluate(`({speed:window.__qaApp.duel.state.speedMph*1.609344,phase:window.__qaApp.duel.state.pit?.phase,tyre:window.__qaApp.duel.state.tyre,savesUnchanged:window.__pitBefore===window.__pitStorage()})`);
    if(!(departure.speed>0&&departure.speed<=60.0000000001&&departure.tyre==='winter'&&departure.savesUnchanged))throw Error('Actual departure failed '+JSON.stringify(departure));
    await context.evaluate(`(()=>{const a=window.__qaApp;for(let i=0;i<24;i++){a.onFrame?.(a.duel.state,1/60);window.__render.renderFrame();}})()`);
    await context.screenshot('pit-departure-'+quality);
    results.push({quality,limit,working,ready,departure});
  }
  await writeFile(join(context.outputDir,'pit-lane.json'),JSON.stringify({memoryOnly:true,frameMeasurement:false,results},null,2));
}
