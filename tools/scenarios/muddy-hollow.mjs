import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const ready = `!!window.__qaApp?.visualReady && !!window.__render &&
  !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`;

const OVERVIEW_CAMERA={
  position:[-1996.470066645934,197.67163466026466,249.6102283207227],
  target:[-2027.16194395827,69.6716346602651,46.92078935794765],
};
const OVERVIEW_CAMERA_TOLERANCE=1e-6;
let navigationSerial=0;

async function navigateReady(context, path, label) {
  const marker=`muddy-hollow-navigation-${++navigationSerial}`;
  const target=new URL(path,'http://qa.local');
  await context.evaluate(`window.__muddyHollowNavigation=${JSON.stringify(marker)}`);
  await context.navigate(path);
  await context.waitFor(`location.pathname===${JSON.stringify(target.pathname)}&&
    location.search===${JSON.stringify(target.search)}&&
    window.__muddyHollowNavigation!==${JSON.stringify(marker)}&&${ready}`,label,60_000);
}

async function startHighCountry(context, discoveredGate, car = 'titan_monster', mode = 'duel') {
  return context.evaluate(`(() => {
    const app=window.__qaApp;
    app.inspectionCamera=null;
    app.profile={...app.profile,
      unlockedCars:[...new Set([...app.profile.unlockedCars,'titan_monster'])],
      courses:{version:1,unlocked:[...new Set([...app.profile.courses.unlocked,'high-country'])]},
      wasteland:{...app.profile.wasteland,discoveredGate:${discoveredGate}}};
    if(!app._saveProfile())throw Error('Memory-only QA profile did not save');
    const started=app.startCampaign({mode:${JSON.stringify(mode)},startStage:1,seed:1989,
      car:${JSON.stringify(car)},difficulty:'casual',opponentCount:0});
    if(!started||!app.duel.course)throw Error('QA High Country race did not start');
    app.stop();
    Object.assign(app.duel.state,{status:'racing',paused:false,countdown:0,
      traffic:[],opponents:[],rival:null,speedMph:0});
    app.onFrame?.(app.duel.state);
    window.__render.renderFrame();
    return {hasHollow:!!app.duel.course.muddyHollow,
      memoryOnly:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value};
  })()`);
}

async function crossDepartureBoundary(context, {expectDeparture}) {
  const result=await context.evaluate(`(() => {
    const app=window.__qaApp,d=app.duel,zone=d.course.muddyHollow;
    if(!zone?.departureBoundary)throw Error('Muddy Hollow departure boundary is unavailable');
    const boundary=zone.departureBoundary;
    const along=(boundary.alongMin+boundary.alongMax)/2;
    const point=(lateral)=>({
      x:zone.frame.origin.x+Math.sin(zone.frame.heading)*along+Math.cos(zone.frame.heading)*lateral,
      z:zone.frame.origin.z+Math.cos(zone.frame.heading)*along-Math.sin(zone.frame.heading)*lateral,
    });
    const beforePoint=point(boundary.lateral-.5),afterPoint=point(boundary.lateral+.5);
    const before=d.course.nearest(beforePoint.x,beforePoint.z,zone.frame.s);
    const after=d.course.nearest(afterPoint.x,afterPoint.z,zone.frame.s);
    const ground=d.course.groundAt(after.s,after.lateral);
    const desired=zone.frame.heading+Math.PI/2;
    window.__muddyPhase3Unsubscribe?.();window.__muddyPhase3Events=[];
    window.__muddyPhase3Unsubscribe=d.onChange((_,event)=>{
      if(event.muddyHollowDeparted)window.__muddyPhase3Events.push(event.muddyHollowDeparted);
    });
    const historyBefore=app.profile.history.length;
    Object.assign(d.state,{status:'racing',paused:false,countdown:0,
      prevS:before.s,prevLateral:before.lateral,s:after.s,lateral:after.lateral,
      speedMph:35,gear:1,headingError:Math.atan2(Math.sin(desired-d.course.at(after.s).heading),
        Math.cos(desired-d.course.at(after.s).heading)),yawVelocity:0,pushVelocity:0,
      slipAngle:0,groundHeight:ground.y,prevGroundHeight:ground.y,onFoot:false,
      airborne:false,airHeight:0,prevAirHeight:0,_jumpY:null,_verticalSpeed:0,
      traffic:[],opponents:[],rival:null});
    const beforeTime={stageTimeSec:d.state.stageTimeSec,lapTimeSec:d.state.lapTimeSec,
      totalTimeSec:d.state.totalTimeSec};
    d.step(1/120);app.onFrame?.(d.state);window.__render.renderFrame();
    const modal=document.querySelector('#modal-layer');
    const answer={status:d.state.status,historyBefore,
      historyAfter:app.profile.history.length,departureEvents:window.__muddyPhase3Events.length,
      activeRace:app.profile.activeRace,departureId:d.state.muddyHollowDeparture?.id,
      beforeTime,afterTime:{stageTimeSec:d.state.stageTimeSec,lapTimeSec:d.state.lapTimeSec,
        totalTimeSec:d.state.totalTimeSec},hud:{hidden:document.querySelector('#race-hud')?.hidden,
        timeText:document.querySelector('#race-time')?.textContent,
        modalHidden:modal?.hidden,resultVisible:!!modal?.querySelector('.result-panel')},
      historyResult:app.profile.history.at(-1)};
    if(${expectDeparture}&&answer.status!=='exploring')throw Error('Titan ridge crossing did not enter exploration');
    if(!${expectDeparture}&&answer.status!=='racing')throw Error('Non-Titan ridge crossing left the race');
    return answer;
  })()`);
  return result;
}

async function driveBackAndExit(context) {
  return context.evaluate(`(() => {
    const app=window.__qaApp,d=app.duel,zone=d.course.muddyHollow;
    const boundary=zone.departureBoundary,s=d.state;
    const local=()=>{const world=d.course.worldAt(s.s,s.lateral),
      dx=world.x-zone.frame.origin.x,dz=world.z-zone.frame.origin.z;
      return {along:dx*Math.sin(zone.frame.heading)+dz*Math.cos(zone.frame.heading),
        lateral:dx*Math.cos(zone.frame.heading)-dz*Math.sin(zone.frame.heading)};};
    const frozen={stageTimeSec:s.stageTimeSec,lapTimeSec:s.lapTimeSec,
      totalTimeSec:s.totalTimeSec,completedLaps:s.completedLaps,
      nextLapGate:s.nextLapGate,score:s.score,results:structuredClone(s.results)};
    const startWorld=d.course.worldAt(s.s,s.lateral),startLocal=local();
    const desired=zone.frame.heading-Math.PI/2;
    s.headingError=Math.atan2(Math.sin(desired-d.course.at(s.s).heading),
      Math.cos(desired-d.course.at(s.s).heading));
    s.speedMph=24;d.setInput({throttle:.65,brake:0,steer:0,boost:false});
    let ticks=0;
    for(;ticks<960&&local().lateral>=boundary.lateral-.5;ticks++)d.step(1/120);
    d.setInput({throttle:0,brake:0,steer:0,boost:false});
    const endWorld=d.course.worldAt(s.s,s.lateral),endLocal=local();
    app.onFrame?.(s);window.__render.renderFrame();
    const afterDrive={status:s.status,ticks,movedMeters:Math.hypot(endWorld.x-startWorld.x,endWorld.z-startWorld.z),
      startLocal,endLocal,crossedBack:endLocal.lateral<boundary.lateral,
      departureEvents:window.__muddyPhase3Events.length,
      historyCount:app.profile.history.length,
      frozen:JSON.stringify(frozen)===JSON.stringify({stageTimeSec:s.stageTimeSec,
        lapTimeSec:s.lapTimeSec,totalTimeSec:s.totalTimeSec,completedLaps:s.completedLaps,
        nextLapGate:s.nextLapGate,score:s.score,results:s.results}),
      hudTimeText:document.querySelector('#race-time')?.textContent,
      resultVisible:!!document.querySelector('#modal-layer .result-panel')};
    app.togglePause();app.onFrame?.(s);window.__render.renderFrame();
    const paused={status:s.status,paused:s.paused,
      resultTitle:document.querySelector('#result-title')?.textContent?.trim()||null};
    app.returnToMenu();app.onFrame?.(s);window.__render.renderFrame();
    const menu={status:s.status,paused:s.paused,historyCount:app.profile.history.length,
      departureEvents:window.__muddyPhase3Events.length,activeRace:app.profile.activeRace};
    window.__muddyPhase3Unsubscribe?.();window.__muddyPhase3Unsubscribe=null;
    return {afterDrive,paused,menu};
  })()`);
}

async function show(context, quality, label, names) {
  await context.evaluate(`(() => {
    document.querySelectorAll('details').forEach(panel=>{panel.open=false;panel.hidden=true;});
    const select=document.querySelector('#graphics-quality');
    select.value=${JSON.stringify(quality)};
    select.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await context.waitFor(`(() => {
    const app=window.__qaApp,render=window.__render,host=document.querySelector('#view3d');
    const frame=render.renderFrame();app.onFrame?.(app.duel.state);
    return app.visualReady && ['ready','fallback','off','unsupported-fallback'].includes(host.dataset.warmupStatus)
      && frame.drawCalls>0 && document.querySelector('#graphics-quality')?.value===${JSON.stringify(quality)};
  })()`,`${quality}/${label} world ready`,60_000);
  const result=await context.evaluate(`(() => {
    const app=window.__qaApp,d=app.duel,zone=d.course.muddyHollow;
    if(!zone)throw Error('Discovered flagged High Country has no Muddy Hollow');
    const all={ridge:[zone.landforms.ridge],bowl:[zone.landforms.valleyBowl],
      hill:[zone.landforms.hill],pond:[zone.landforms.pondBed],
      pits:zone.landforms.pits,ramps:zone.landforms.ramps};
    const selected=${JSON.stringify(names)}.flatMap(name=>all[name]);
    const centre=selected.reduce((p,item)=>({x:p.x+item.center.x/selected.length,
      z:p.z+item.center.z/selected.length}),{x:0,z:0});
    const heading=zone.frame.heading;
    const overview=${JSON.stringify(label)}.includes('overview');
    const actor=${JSON.stringify(label)}==='ridge'
      ? {x:centre.x+Math.sin(heading)*52,z:centre.z+Math.cos(heading)*52}
      : centre;
    const nearest=overview ? {s:2400,lateral:0} : d.course.nearest(actor.x,actor.z,zone.frame.s);
    const ground=d.course.groundAt(nearest.s,nearest.lateral);
    const back=105;
    const height=58;
    const s=d.state;
    Object.assign(s,{s:nearest.s,prevS:nearest.s,lateral:nearest.lateral,
      prevLateral:nearest.lateral,speedMph:0,headingError:heading-d.course.at(nearest.s).heading,
      yawVelocity:0,steerVisual:0,slipAngle:0,groundHeight:null,terrainPitch:null,
      terrainRoll:null,airHeight:0,airborne:false,impactTimer:0});
    app.onFrame?.(s);
    app.inspectionCamera=overview ? ${JSON.stringify(OVERVIEW_CAMERA)} : ${JSON.stringify(label)}==='ridge'
      ? {position:[centre.x-Math.cos(heading)*back,ground.y+height,
          centre.z+Math.sin(heading)*back],target:[centre.x,zone.heightAt(centre.x,centre.z)+2,centre.z]}
      : {position:[centre.x-Math.sin(heading)*back,ground.y+height,
          centre.z-Math.cos(heading)*back],target:[centre.x,zone.heightAt(centre.x,centre.z)+2,centre.z]};
    window.__render.camera.position.fromArray(app.inspectionCamera.position);
    const frame=window.__render.renderFrame();
    return {quality:${JSON.stringify(quality)},label:${JSON.stringify(label)},
      camera:app.inspectionCamera,drawCalls:frame.drawCalls,triangles:frame.triangles,
      status:s.status,contains:zone.contains(centre.x,centre.z),height:zone.heightAt(centre.x,centre.z)};
  })()`);
  if(!result.contains||result.status!=='racing'||result.drawCalls<=0)
    throw Error(`Muddy Hollow ${quality}/${label} frame failed: ${JSON.stringify(result)}`);
  await context.evaluate(`(async()=>{
    document.querySelectorAll('details').forEach(panel=>{panel.open=false;panel.hidden=true;});
    await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
    window.__render.renderFrame();window.__qaApp.onFrame?.(window.__qaApp.duel.state);
  })()`);
  await context.screenshot(`${quality}-${label}`);
  return result;
}

async function showOrdinaryOverview(context) {
  await context.evaluate(`(() => {
    document.querySelectorAll('details').forEach(panel=>{panel.open=false;panel.hidden=true;});
    const select=document.querySelector('#graphics-quality');select.value='high';
    select.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await context.waitFor(`(() => {
    const app=window.__qaApp,render=window.__render,host=document.querySelector('#view3d');
    const frame=render.renderFrame();app.onFrame?.(app.duel.state);
    return app.visualReady && ['ready','fallback','off','unsupported-fallback'].includes(host.dataset.warmupStatus)
      && frame.drawCalls>0 && document.querySelector('#graphics-quality')?.value==='high';
  })()`,'ordinary High Country world ready',60_000);
  const result=await context.evaluate(`(() => {
    const app=window.__qaApp,d=app.duel;
    Object.assign(d.state,{s:2400,prevS:2400,lateral:0,prevLateral:0,
      speedMph:0,headingError:0,yawVelocity:0,steerVisual:0,slipAngle:0,
      groundHeight:null,terrainPitch:null,terrainRoll:null,airHeight:0,
      airborne:false,impactTimer:0});
    app.onFrame?.(d.state);
    app.inspectionCamera=${JSON.stringify(OVERVIEW_CAMERA)};
    window.__render.camera.position.fromArray(app.inspectionCamera.position);
    const frame=window.__render.renderFrame();
    return {quality:'high',label:'flag-off-overview',camera:app.inspectionCamera,
      drawCalls:frame.drawCalls,triangles:frame.triangles,status:d.state.status};
  })()`);
  await context.evaluate(`(async()=>{await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);window.__render.renderFrame();})()`);
  await context.screenshot('high-flag-off-overview');
  return result;
}

export async function run(context) {
  const report={isolation:{},frames:[]};
  await context.command('Emulation.setDeviceMetricsOverride',
    {width:1280,height:720,deviceScaleFactor:1,mobile:false});

  await navigateReady(context,'/tools/menu-check.html','flag-off memory-only menu');
  report.isolation.flagOff=await startHighCountry(context,true);
  if(report.isolation.flagOff.hasHollow)throw Error('Flag-off High Country exposed Muddy Hollow');

  await navigateReady(context,'/tools/menu-check.html?flags=muddy-hollow',
    'undiscovered flagged memory-only menu');
  report.isolation.undiscovered=await startHighCountry(context,false);
  if(report.isolation.undiscovered.hasHollow)
    throw Error('Undiscovered High Country exposed Muddy Hollow');
  report.frames.push(await showOrdinaryOverview(context));

  await navigateReady(context,'/tools/menu-check.html?flags=muddy-hollow',
    'discovered flagged memory-only menu');
  report.isolation.discovered=await startHighCountry(context,true);
  if(!report.isolation.discovered.hasHollow)
    throw Error('Discovered flagged High Country did not expose Muddy Hollow');
  await context.waitFor(`(() => {
    const app=window.__qaApp,render=window.__render,host=document.querySelector('#view3d');
    const frame=render.renderFrame();app.onFrame?.(app.duel.state);
    return app.visualReady && ['ready','fallback','off','unsupported-fallback'].includes(host.dataset.warmupStatus)
      && frame.drawCalls>0 && !!app.duel.course.muddyHollow;
  })()`,'discovered Muddy Hollow world ready',60_000);

  for(const quality of ['high','performance']) {
    for(const [label,names] of [['ridge',['ridge']],['overview',['bowl','hill','pond']],
      ['pits',['pits']],['ramps',['ramps']]])
      report.frames.push(await show(context,quality,label,names));
  }

  const flagOffOverview=report.frames.find(frame=>frame.label==='flag-off-overview');
  const flaggedOverview=report.frames.find(frame=>frame.quality==='high'&&frame.label==='overview');
  const cameraValues=camera=>[...camera.position,...camera.target];
  const deltas=cameraValues(flagOffOverview.camera).map((value,index)=>
    Math.abs(value-cameraValues(flaggedOverview.camera)[index]));
  report.overviewControl={
    tolerance:OVERVIEW_CAMERA_TOLERANCE,
    maximumDelta:Math.max(...deltas),
    passed:deltas.every(delta=>delta<=OVERVIEW_CAMERA_TOLERANCE),
    flagOffCamera:flagOffOverview.camera,
    flaggedCamera:flaggedOverview.camera,
  };
  if(!report.overviewControl.passed) {
    await writeFile(join(context.outputDir,'muddy-hollow-browser.json'),JSON.stringify(report,null,2)+'\n');
    throw Error(`Flag-off and flagged overview cameras differ by ${report.overviewControl.maximumDelta}`);
  }

  await context.command('Emulation.setDeviceMetricsOverride',
    {width:390,height:844,deviceScaleFactor:1,mobile:true});
  report.frames.push(await show(context,'high','phone-overview',['bowl','hill','pond']));

  await context.command('Emulation.setDeviceMetricsOverride',
    {width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await navigateReady(context,'/tools/menu-check.html?flags=muddy-hollow',
    'phase-3 non-Titan memory-only menu');
  const nonTitanStart=await startHighCountry(context,true,'dusthawk_rally','timetrial');
  report.isolation.nonTitan={...nonTitanStart,
    crossing:await crossDepartureBoundary(context,{expectDeparture:false})};
  if(report.isolation.nonTitan.crossing.departureEvents!==0||
      report.isolation.nonTitan.crossing.historyAfter!==report.isolation.nonTitan.crossing.historyBefore)
    throw Error('Non-Titan crossing emitted or settled a Muddy Hollow departure');

  await navigateReady(context,'/tools/menu-check.html?flags=muddy-hollow',
    'phase-3 Titan memory-only menu');
  const titanStart=await startHighCountry(context,true,'titan_monster','timetrial');
  report.phaseThree={start:titanStart,
    departure:await crossDepartureBoundary(context,{expectDeparture:true})};
  const departure=report.phaseThree.departure;
  if(departure.departureEvents!==1||departure.historyAfter!==departure.historyBefore+1||
      departure.activeRace!==null||departure.historyResult?.abandoned!==true)
    throw Error(`Titan departure did not settle once: ${JSON.stringify(departure)}`);
  await context.evaluate(`(() => {
    document.querySelectorAll('details').forEach(panel=>{panel.open=false;panel.hidden=true;});
    window.__qaApp.onFrame?.(window.__qaApp.duel.state);window.__render.renderFrame();
  })()`);
  await context.screenshot('phase3-exploring');
  report.phaseThree.returnAndExit=await driveBackAndExit(context);
  const returned=report.phaseThree.returnAndExit;
  if(returned.afterDrive.status!=='exploring'||!returned.afterDrive.crossedBack||
      returned.afterDrive.movedMeters<=1||!returned.afterDrive.frozen||
      returned.afterDrive.departureEvents!==1||returned.afterDrive.resultVisible||
      !returned.paused.paused||returned.menu.status!=='menu'||
      returned.menu.historyCount!==departure.historyAfter||returned.menu.departureEvents!==1)
    throw Error(`Muddy Hollow exploration return or exit failed: ${JSON.stringify(returned)}`);
  await writeFile(join(context.outputDir,'muddy-hollow-browser.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`Muddy Hollow browser: ${report.frames.length} visual frames; phase-3 departure, return and menu exit passed.`);
}
