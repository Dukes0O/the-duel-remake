import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const ready = `!!window.__qaApp?.visualReady && !!window.__render &&
  !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`;

const OVERVIEW_CAMERA={
  position:[-1996.470066645934,197.67163466026466,249.6102283207227],
  target:[-2027.16194395827,69.6716346602651,46.92078935794765],
};
const OVERVIEW_CAMERA_TOLERANCE=1e-6;

async function startHighCountry(context, discoveredGate) {
  return context.evaluate(`(() => {
    const app=window.__qaApp;
    app.inspectionCamera=null;
    app.profile={...app.profile,
      unlockedCars:[...new Set([...app.profile.unlockedCars,'titan_monster'])],
      courses:{version:1,unlocked:[...new Set([...app.profile.courses.unlocked,'high-country'])]},
      wasteland:{...app.profile.wasteland,discoveredGate:${discoveredGate}}};
    if(!app._saveProfile())throw Error('Memory-only QA profile did not save');
    const started=app.startCampaign({mode:'duel',startStage:1,seed:1989,
      car:'titan_monster',difficulty:'casual'});
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

  await context.navigate('/tools/menu-check.html');
  await context.waitFor(ready,'flag-off memory-only menu',60_000);
  report.isolation.flagOff=await startHighCountry(context,true);
  if(report.isolation.flagOff.hasHollow)throw Error('Flag-off High Country exposed Muddy Hollow');

  await context.navigate('/tools/menu-check.html?flags=muddy-hollow');
  await context.waitFor(ready,'undiscovered flagged memory-only menu',60_000);
  report.isolation.undiscovered=await startHighCountry(context,false);
  if(report.isolation.undiscovered.hasHollow)
    throw Error('Undiscovered High Country exposed Muddy Hollow');
  report.frames.push(await showOrdinaryOverview(context));

  await context.navigate('/tools/menu-check.html?flags=muddy-hollow');
  await context.waitFor(ready,'discovered flagged memory-only menu',60_000);
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
  await writeFile(join(context.outputDir,'muddy-hollow-browser.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`Muddy Hollow browser: ${report.frames.length} memory-only frames; flag, discovery and both qualities passed.`);
}
