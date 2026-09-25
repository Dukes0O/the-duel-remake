import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {relative, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const FEATURES=['wasteland2','hidden-road'];
const REQUIRED_EVENTS=[
  ['departure','keyboard'],['invitation','production'],['enter-choice','ui'],
  ['arrived-yard','production'],['yard-menu','ui'],['wasteland-start','ui'],
];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

// Pure evidence check shared by the synthetic acceptance test and the browser run.
export function validateBetaJourneyEvidence(report){
  if(report?.storage?.memoryOnly!==true||report.storage.qaTab!==true)throw Error('Private memory-only QA storage was not proved.');
  if(report?.flags?.urlOverride!==false)throw Error('Beta was enabled by a QA URL override.');
  for(const key of ['defaultOff','optedIn','reloadOn']){
    const expected=key==='defaultOff'?FEATURES:FEATURES;
    if(!Array.isArray(report.flags[key])||expected.some(name=>!report.flags[key].includes(name))||report.flags[key].length!==2)
      throw Error(`Experimental ${key} did not cover both beta switches.`);
  }
  const fixtures=report.fixtures;
  if(!Array.isArray(fixtures)||!fixtures.some(item=>item.kind==='pacific-finish-eligibility'&&item.value===10)||
    !['departure','gate'].every(phase=>fixtures.some(item=>item.kind==='route-placement'&&item.phase===phase&&Number.isFinite(item.s))))
    throw Error('Eligibility and both route placements must be separate fixtures.');
  if(!Array.isArray(report.events)||report.events.length!==REQUIRED_EVENTS.length)throw Error('Six ordered journey events are required.');
  const playerId=report.result?.playerId;
  if(typeof playerId!=='string'||!playerId)throw Error('Active player identity is missing.');
  for(let index=0;index<REQUIRED_EVENTS.length;index++){
    const item=report.events[index], [kind,source]=REQUIRED_EVENTS[index];
    if(item?.kind!==kind||item.source!==source||item.playerId!==playerId)
      throw Error(`Journey event ${index} has wrong order, origin or player.`);
  }
  if(!(report.events[0].stepCount>0))throw Error('Departure needs real simulation steps.');
  if(report.result.mode!=='wasteland'||!['countdown','racing'].includes(report.result.status)||
    report.result.discoveredGate!==true||report.result.forcedCompletion!==false||
    report.result.forcedDiscovery!==false)
    throw Error('Wasteland race was not started without forced discovery/completion.');
  return {passed:true,eventCount:report.events.length,playerId};
}

async function click(context,selector){
  const point=await context.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});
    if(!b||b.hidden||b.disabled)throw Error('Missing visible control ${selector}');
    const r=b.getBoundingClientRect();
    if(r.width<1||r.height<1||r.left<0||r.top<0||r.right>innerWidth||r.bottom>innerHeight)
      throw Error('Control ${selector} is outside the viewport: '+JSON.stringify(r.toJSON()));
    const x=r.x+r.width/2,y=r.y+r.height/2,top=document.elementFromPoint(x,y);
    if(!b.contains(top))throw Error('Control ${selector} is covered by '+top?.tagName);
    b.focus({preventScroll:true});if(document.activeElement!==b)throw Error('Control ${selector} cannot take focus');
    return{x,y};})()`);
  for(const type of ['mousePressed','mouseReleased'])await context.command('Input.dispatchMouseEvent',{type,button:'left',clickCount:1,...point});
}
async function capture(context,report,name){
  const path=await context.screenshot(name),bytes=await readFile(path);
  report.captures.push({name,path:relative(ROOT,path).replaceAll('\\','/'),sha256:hash(bytes)});
}
async function sampleFrames(context,report,phase,quality){
  await context.evaluate(`window.__qaApp.setGraphicsQuality(${JSON.stringify(quality)})`);
  await context.waitFor(`window.__qaApp?.visualReady &&
    window.__qaApp.ambientOcclusionEnabled===(${JSON.stringify(quality)}==='high') &&
    !!window.__render?.renderer?.domElement?.isConnected`,'settled '+quality+' renderer',60000);
  const result=await context.evaluate(`(async()=>{
    const a=window.__qaApp,r=window.__render,expected=${JSON.stringify(phase)};
    const state=()=>a.duel.state.hiddenRoadJourney?.phase==='arrived'?'yard':a.duel.state.mode==='wasteland'?'race':'other';
    if(state()!==expected||!a.visualReady||!r?.renderer?.domElement?.isConnected)
      throw Error('Frame sample scene or renderer is unavailable');
    let prior=0;const deltas=[];for(let i=0;i<150;i++){
      const t=await new Promise(requestAnimationFrame);
      if(prior&&i>=30)deltas.push(t-prior);
      prior=t;
    }
    if(state()!==expected||r.renderer.info.render.calls<1||
      a.ambientOcclusionEnabled!==(${JSON.stringify(quality)}==='high'))
      throw Error('Frame sample quality, scene or draw state changed');
    const sorted=[...deltas].sort((x,y)=>x-y);
    return{count:deltas.length,mean:deltas.reduce((x,y)=>x+y,0)/deltas.length,
      p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],
      drawCalls:r.renderer.info.render.calls,triangles:r.renderer.info.render.triangles,
      status:a.duel.state.status,mode:a.duel.state.mode,journeyPhase:a.duel.state.hiddenRoadJourney?.phase,
      requestedQuality:${JSON.stringify(quality)},ambientOcclusionEnabled:a.ambientOcclusionEnabled,
      scope:'static scene, live renderer native RAF; simulation stopped; no GPU or comparison claim'};
  })()`);
  report.frames[`${phase}-${quality}`]=result;
}

export async function run(context){
  const report={scope:'Private memory-only beta journey. Pacific finish eligibility and route positions are fixtures; departure, invitation, choice, yard and race use production UI/App/simulation. No race completion is forced.',
    storage:{},flags:{},fixtures:[],events:[],result:{},frames:{},captures:[]};
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await context.navigate('/tools/menu-check.html');
  await context.waitFor(`!!window.__qaApp?.visualReady&&!!window.__render&&
    document.querySelector('#stage.in-menu')`,'private beta menu',60000);
  const layout=()=>`(()=>{const box=selector=>{const n=document.querySelector(selector),s=n&&getComputedStyle(n);
    return{bounds:n?.getBoundingClientRect().toJSON(),display:s?.display,position:s?.position,
      overflow:s?.overflow,scrollHeight:n?.scrollHeight,clientHeight:n?.clientHeight};};
    return{viewport:[innerWidth,innerHeight],status:window.__qaApp.duel.state.status,
      visualReady:window.__qaApp.visualReady,qaTab:window.name.startsWith('__duel_qa_tab_v2:'),
      memoryOnly:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value,
      loadingHidden:document.querySelector('#renderer-loading')?.hidden,
      menu:box('#menu-screen'),footer:box('.menu-footer'),meta:box('.build-meta'),
      experimental:box('#experimental-open'),start:box('#start-engine')};})()`;
  const initialUi=await context.evaluate(layout());
  if(!initialUi.experimental.bounds?.width||initialUi.experimental.bounds.bottom>720){
    await context.command('Emulation.setDeviceMetricsOverride',{width:1024,height:720,deviceScaleFactor:1,mobile:false});
    const laptopUi=await context.evaluate(layout());
    throw Error('Private beta menu controls outside viewport: '+JSON.stringify({desktop:initialUi,laptop:laptopUi}));
  }
  report.storage=await context.evaluate(`(()=>({memoryOnly:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value,
    qaTab:window.name.startsWith('__duel_qa_tab_v2:')}))()`);
  await context.waitFor(`[...document.querySelectorAll('details summary')].some(node=>
    node.textContent.includes('TEMPORARY SAVES'))`,'mounted private QA controls');
  await context.evaluate(`for(const panel of document.querySelectorAll('details')){
    const title=panel.querySelector('summary')?.textContent||'';
    if(title.includes('TEMPORARY SAVES')||title.startsWith('Performance samples'))panel.style.display='none';
  }`);
  report.flags.urlOverride=false;
  report.flags.defaultOff=await context.evaluate(`['wasteland2','hidden-road'].filter(name=>!window.__qaApp.duel.featureFlags.enabled(name))`);
  if(new URLSearchParams(await context.evaluate('location.search')).has('flags'))throw Error('QA URL flag override is forbidden.');
  await click(context,'#experimental-open');
  await context.waitFor(`document.querySelector('#experimental-toggle')?.getBoundingClientRect().width>0`,'visible Experimental choice');
  await click(context,'#experimental-toggle');
  report.flags.optedIn=await context.evaluate(`['wasteland2','hidden-road'].filter(name=>window.__qaApp.duel.featureFlags.enabled(name))`);
  await capture(context,report,'beta-opted-in');
  await context.navigate('/tools/menu-check.html');
  await context.waitFor(`!!window.__qaApp?.visualReady&&window.__qaApp.duel.featureFlags.enabled('wasteland2')&&window.__qaApp.duel.featureFlags.enabled('hidden-road')`,'saved beta opt-in',60000);
  report.flags.reloadOn=await context.evaluate(`['wasteland2','hidden-road'].filter(name=>window.__qaApp.duel.featureFlags.enabled(name))`);
  await context.waitFor(`[...document.querySelectorAll('details summary')].some(node=>
    node.textContent.includes('TEMPORARY SAVES'))`,'reloaded private QA controls');
  await context.evaluate(`for(const panel of document.querySelectorAll('details')){
    const title=panel.querySelector('summary')?.textContent||'';
    if(title.includes('TEMPORARY SAVES')||title.startsWith('Performance samples'))panel.style.display='none';
  }`);
  await context.command('Emulation.setDeviceMetricsOverride',{width:1024,height:720,deviceScaleFactor:1,mobile:false});
  await context.waitFor(`document.querySelector('#experimental-open')?.getBoundingClientRect().width>0`,'laptop Experimental control');
  await click(context,'#experimental-open');
  await context.waitFor(`document.querySelector('#experimental-toggle')?.checked`,'laptop Experimental panel');
  await click(context,'[data-action="experimental-close"]');
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await context.evaluate(`(()=>{
    const a=window.__qaApp;
    if(!window.name.startsWith('__duel_qa_tab_v2:')||!Object.getOwnPropertyDescriptor(window,'localStorage')?.value)throw Error('Memory-only storage required');
    a.audio.setMuted(true);
    a.profile={...a.profile,wasteland:{...a.profile.wasteland,pacificFinishes:10}};
    if(!a._saveProfile())throw Error('Eligibility fixture could not be saved in temporary storage');
    if(a.getHiddenRoadDiscovery().discoveredGate)throw Error('Fixture may not set discovery');
    document.querySelectorAll('details').forEach(node=>node.style.display='none');
    window.__betaQa={observed:[],steps:0,place(progress,speed){
      const d=a.duel,p=d.course.hiddenRoad.poseAt(progress);
      Object.assign(d.state,{s:p.s,prevS:p.s,lateral:p.lateral,prevLateral:p.lateral,
        headingError:p.heading-d.course.at(p.s).heading,speedMph:speed,groundHeight:p.y,
        airHeight:0,airborne:false,yawVelocity:0,pushVelocity:0});
      d.setInput({throttle:0,brake:0,steer:0});a.onFrame?.(d.state,0);
      return{progress,s:p.s,speed};
    },advance(seconds){const count=Math.ceil(seconds*120);a.advance(seconds,1/120);this.steps+=count;a.onFrame?.(a.duel.state,0);return count;}};
    a.duel.onChange((state,event)=>{if(event.hiddenRoadDeparted||event.hiddenRoadPhase||event.hiddenRoadChoice||event.hiddenRoadArrived)
      window.__betaQa.observed.push({status:state.status,phase:state.hiddenRoadJourney?.phase,
        playerId:state.playerId,departed:!!event.hiddenRoadDeparted,phaseEvent:event.hiddenRoadPhase?.phase,
        choice:event.hiddenRoadChoice?.choice,arrived:!!event.hiddenRoadArrived});});
  })()`);
  report.fixtures.push({kind:'pacific-finish-eligibility',value:10});
  await context.waitFor(`document.querySelector('#start-engine')?.disabled===false`,'ready production Start Engine',60000);
  await click(context,'#start-engine');
  await context.waitFor(`window.__qaApp?.duel.state.status==='countdown'||window.__qaApp?.duel.state.status==='racing'`,'ordinary duel started');
  await context.evaluate('window.__qaApp.stop()');
  const playerId=await context.evaluate('window.__qaApp.player.id');
  await context.evaluate('window.__betaQa.advance(4.5)');
  const departure=await context.evaluate(`window.__betaQa.place(149.9,35)`);
  report.fixtures.push({kind:'route-placement',phase:'departure',...departure});
  await context.command('Input.dispatchKeyEvent',{type:'keyDown',key:'w',code:'KeyW',windowsVirtualKeyCode:87});
  await context.evaluate('window.__betaQa.advance(.5)');
  await context.command('Input.dispatchKeyEvent',{type:'keyUp',key:'w',code:'KeyW',windowsVirtualKeyCode:87});
  const departureCheck=await context.evaluate(`(()=>{const a=window.__qaApp,q=window.__betaQa;
    if(!q.observed.some(e=>e.departed)||!a.duel.state.hiddenRoadJourney?.departed||a.duel.state.status!=='exploring')throw Error('Keyboard driving did not depart Hidden Road');
    return{status:a.duel.state.status,steps:q.steps,discovered:a.getHiddenRoadDiscovery().discoveredGate};})()`);
  if(departureCheck.discovered)throw Error('Departure fixture forced discovery before invitation.');
  report.events.push({kind:'departure',status:'driving',actualStatus:departureCheck.status,playerId,source:'keyboard',stepCount:departureCheck.steps});
  await capture(context,report,'hidden-road-departed');
  const gate=await context.evaluate(`(()=>{const a=window.__qaApp;return window.__betaQa.place(a.duel.course.hiddenRoad.length-59.5,45);})()`);
  report.fixtures.push({kind:'route-placement',phase:'gate',...gate});
  await context.evaluate('window.__betaQa.advance(8)');
  const invitation=await context.evaluate(`(()=>{const a=window.__qaApp,q=window.__betaQa;
    if(!q.observed.some(e=>e.phaseEvent==='choice')||!a.duel.state.hiddenRoadJourney?.choiceReady||
      !a.getHiddenRoadDiscovery().discoveredGate||document.querySelector('.hidden-road-dialog')?.hidden)
      throw Error('Production gate invitation did not appear');
    return{phase:a.duel.state.hiddenRoadJourney.phase,steps:q.steps};})()`);
  report.events.push({kind:'invitation',status:'invited',actualPhase:invitation.phase,playerId,source:'production',stepCount:invitation.steps});
  await capture(context,report,'gate-invitation');
  await click(context,'.hidden-road-enter');
  await context.evaluate('window.__betaQa.advance(.05)');
  const entering=await context.evaluate(`(()=>{const a=window.__qaApp,q=window.__betaQa;
    if(!q.observed.some(e=>e.choice==='enter')||a.duel.state.hiddenRoadJourney?.phase!=='entering')throw Error('Visible enter choice was not accepted');
    return a.duel.state.hiddenRoadJourney.phase;})()`);
  report.events.push({kind:'enter-choice',status:'selected',actualPhase:entering,playerId,source:'ui'});
  await context.evaluate('window.__betaQa.advance(3.5)');
  const arrived=await context.evaluate(`(()=>{const a=window.__qaApp,q=window.__betaQa;
    if(!q.observed.some(e=>e.arrived)||!a.isYardHomeActive()||!document.querySelector('[data-yard-panel="home"]'))
      throw Error('Production yard arrival or home UI missing');
    return{phase:a.duel.state.hiddenRoadJourney.phase,steps:q.steps};})()`);
  report.events.push({kind:'arrived-yard',status:'yard',actualPhase:arrived.phase,playerId,source:'production',stepCount:arrived.steps});
  await capture(context,report,'yard-home');
  for(const quality of ['high','performance'])await sampleFrames(context,report,'yard',quality);
  // Resume the ordinary App loop for the menu and next race. It owns UI loading
  // state and countdown updates; the renderer's separate RAF does not do that.
  await context.evaluate('window.__qaApp.start()');
  await click(context,'[data-action="yard-menu"]');
  await context.waitFor(`window.__qaApp.duel.state.status==='menu'`,'yard return to menu');
  report.events.push({kind:'yard-menu',status:'returned',playerId,source:'ui'});
  await capture(context,report,'discovered-menu');
  await click(context,'[data-mode="wasteland"]');
  await click(context,'#start-engine');
  await context.waitFor(`window.__qaApp.duel.state.mode==='wasteland'&&
    ['countdown','racing'].includes(window.__qaApp.duel.state.status)`,'Wasteland race start');
  try{await context.waitFor(`window.__qaApp.visualReady&&document.querySelector('#renderer-loading')?.hidden`,'Wasteland scene ready',12000);}
  catch(error){const diagnostic=await context.evaluate(`(()=>{const a=window.__qaApp,h=document.querySelector('#view3d');
    return{status:a.duel.state.status,mode:a.duel.state.mode,running:a.running,visualReady:a.visualReady,
      gate:a._visualReadiness&&{ready:a._visualReadiness.ready,sameState:a._visualReadiness.state===a.duel.state,
        sameCourse:a._visualReadiness.course===a.duel.course},loadingHidden:document.querySelector('#renderer-loading')?.hidden,
      errorHidden:document.querySelector('#renderer-error')?.hidden,asset:h?.dataset.vehicleAsset,
      warmup:h?.dataset.warmupStatus,canvasVisible:window.__render?.renderer?.domElement?.style.visibility};})()`);
    throw Error(error.message+': '+JSON.stringify(diagnostic));}
  await context.waitFor(`window.__qaApp.duel.state.status==='racing'`,'active Wasteland race');
  await context.evaluate('window.__qaApp.stop()');
  report.events.push({kind:'wasteland-start',status:'started',playerId,source:'ui'});
  report.result=await context.evaluate(`(()=>{const a=window.__qaApp;
    return{mode:a.duel.state.mode,status:a.duel.state.status,discoveredGate:a.getHiddenRoadDiscovery().discoveredGate,
      forcedCompletion:false,forcedDiscovery:false,playerId:a.duel.state.playerId,
      pacificFinishes:a.profile.wasteland.pacificFinishes,results:a.duel.state.results??null};})()`);
  if(report.result.results)throw Error('Beta scenario unexpectedly completed a race.');
  await capture(context,report,'wasteland-race');
  for(const quality of ['high','performance'])await sampleFrames(context,report,'race',quality);
  validateBetaJourneyEvidence(report);
  const output=join(context.outputDir,'captures.json');
  await mkdir(context.outputDir,{recursive:true});
  await writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(`Beta journey: ${report.events.length} ordered events, ${report.captures.length} captures, private memory-only UI.`);
}
