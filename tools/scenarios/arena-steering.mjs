import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {DRIVE, steeringYawAuthority} from '../../src/config.js';

// Production App entry, Duel input and fixed steps on a disposable memory-only
// profile. Discovery, car selection and starting poses are labelled fixtures.
// No imports run in the browser and no simulation or move dispatcher is replaced.
async function ready(context, label) {
  await context.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))))');
  await context.waitFor(`(() => {window.__qaApp?.onFrame?.(window.__qaApp.duel.state,0);
    window.__render?.renderFrame();return !!window.__qaApp?.visualReady&&!!window.__render&&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&
    ['ready','fallback','off','unsupported-fallback'].includes(document.querySelector('#view3d')?.dataset.warmupStatus)&&
    document.querySelector('#renderer-loading')?.hidden;})()`, label, 60000);
}
async function yard(context, quality) {
  await ready(context, quality+' yard approach');
  await context.evaluate('window.__qaApp.advance(8)');
  await context.waitFor('window.__qaApp.isYardHomeActive()', quality+' yard hub');
  await ready(context, quality+' yard');
}
async function capture(context, name) {
  await ready(context, name+' assets');
  await context.evaluate('window.__qaApp.onFrame(window.__qaApp.duel.state,0);window.__render.renderFrame()');
  await context.screenshot(name.replaceAll('_', '-'));
}
async function turningArc(context, quality, car) {
  await context.evaluate(`(() => {const a=window.__qaApp;a.menuCar=${JSON.stringify(car)};
    if(!a.startArenaEvent({opponents:1}))throw Error('Production arena entry failed');
    a.setCamera('chase');a.inspectionCamera=null;
    for(let tick=0;tick<362;tick++)a.duel.step(1/120);
    if(a.duel.state.status!=='racing')throw Error('Arena countdown did not finish');})()`);
  await ready(context, quality+' '+car+' arena');
  const arc=await context.evaluate(`(() => {
    const a=window.__qaApp,d=a.duel,s=d.state,site=d.course.length*.18;
    // A clear central floor pose isolates one second of a real driving arc.
    // Positions are never reset after this initial placement.
    Object.assign(s,{s:site,prevS:site,lateral:0,prevLateral:0,headingError:0,
      speedMph:45,gear:0,steerVisual:0,yawVelocity:0,slipAngle:0,pushVelocity:0,
      knock:null,airborne:false,airHeight:0,impactTimer:0});
    const start=d.course.worldAt(s.s,s.lateral);
    let heading=d.course.at(s.s).heading+s.headingError,turn=0,peakYaw=0;
    d.setInput({steer:1,throttle:0,brake:0,boost:false});
    for(let tick=0;tick<120;tick++){
      d.step(1/120);
      const next=d.course.at(s.s).heading+s.headingError;
      turn+=Math.atan2(Math.sin(next-heading),Math.cos(next-heading));heading=next;
      if(!Number.isFinite(s.yawVelocity)||s.yawVelocity>1e-12||s.knock||s.airborne)
        throw Error('Actual full-lock arc must stay finite and on the floor');
      peakYaw=Math.max(peakYaw,Math.abs(s.yawVelocity));
    }
    const end=d.course.worldAt(s.s,s.lateral);
    return {quality:${JSON.stringify(quality)},car:s.car,speedMph:s.speedMph,
      yawDegreesPerSec:Math.abs(s.yawVelocity)*180/Math.PI,peakYawDegreesPerSec:peakYaw*180/Math.PI,
      turnDegrees:turn*180/Math.PI,movedMetres:Math.hypot(end.x-start.x,end.z-start.z),
      yawVelocity:s.yawVelocity,steerVisual:s.steerVisual,status:s.status,
      course:{id:d.course.def.id,venue:d.course.def.venue,arena:d.course.def.arena},
      memoryOnly:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value&&
        window.name.startsWith('__duel_qa_tab_v2:')};})()`);
  assert.ok(arc.memoryOnly&&arc.course.venue===true&&arc.course.arena===true);
  assert.equal(arc.car,car);assert.equal(arc.status,'racing');
  assert.ok(arc.yawDegreesPerSec>=100&&Math.abs(arc.turnDegrees)>=90&&arc.movedMetres>1,
    'Real45mph full-lock arc must visibly turn at the settled arena rate: '+JSON.stringify(arc));
  await capture(context, quality+'-'+car+'-full-lock');
  const release=await context.evaluate(`(() => {const d=window.__qaApp.duel,s=d.state,
    full=Math.abs(s.yawVelocity),rows=[];let prior=s.yawVelocity;
    d.setInput({steer:0,throttle:0,brake:0,boost:false});
    for(let tick=0;tick<36;tick++){d.step(1/120);
      if(!Number.isFinite(s.yawVelocity)||s.yawVelocity>1e-12||Math.abs(s.yawVelocity)>Math.abs(prior)+1e-12)
        throw Error('Actual released steering must decay without oscillation');
      rows.push(s.yawVelocity);prior=s.yawVelocity;}
    return {elapsedSec:.3,fullYaw:full,remainingYaw:Math.abs(s.yawVelocity),
      fraction:Math.abs(s.yawVelocity)/full,steerVisual:s.steerVisual,status:s.status,rows};})()`);
  assert.equal(release.status,'racing');
  assert.ok(release.fraction<=.015, 'Real stick release must settle in0.3s: '+JSON.stringify(release));
  await capture(context, quality+'-'+car+'-released');
  return {arc,release};
}
async function salWindow(context, quality) {
  await context.evaluate(`(() => {const a=window.__qaApp;
    if(!a.returnToYard())throw Error('Production return to yard failed');})()`);
  await yard(context,quality);
  await context.evaluate(`(() => {const a=window.__qaApp;a.menuCar='falcone_f42';
    if(!a.startWarlordFight('sal')||!a.beginWarlordFight())throw Error('Production Sal entry failed');
    for(let tick=0;tick<362;tick++)a.duel.step(1/120);
    const d=a.duel,s=d.state,b=s.opponents[0],site=s.arena.spawnSlots[0].s;
    Object.assign(s,{s:site,prevS:site,lateral:-4,prevLateral:-4,headingError:0,speedMph:35});
    Object.assign(b,{s:site,prevS:site,lateral:4,prevLateral:4,headingError:0,speedMph:35});
    d.setInput({throttle:.15,brake:0,steer:0,boost:false});
    for(let tick=0;tick<600&&b.salSaw.stage!=='tell';tick++)d.step(1/120);
    if(b.salSaw.stage!=='tell')throw Error('Natural Sal tell did not arrive');
    // Brake and move clear. Move timers and vulnerability still run only in Duel.step.
    d.setInput({throttle:0,brake:1,steer:0,boost:false});s.s-=10;
    for(let tick=0;tick<600&&b.salSaw.stage!=='window';tick++)d.step(1/120);
    if(b.salSaw.stage!=='window')throw Error('Natural Sal counter window did not arrive');
    // Heading perturbation requests a real correction inside the existing window.
    // It leaves steering filters, goal, timers and the FSM intact.
    b.headingError=b.salSaw.runHeading-d.course.at(b.s).heading+.9;b.speedMph=35;
  })()`);
  const probe=await context.evaluate(`(() => {const d=window.__qaApp.duel,s=d.state,b=s.opponents[0],
    beforeYaw=b.yawVelocity||0;d.step(1/120);
    return {stage:b.salSaw.stage,phase:b.salSaw.phase,windowSecondsRemaining:b.salSaw.untilSec-s.stageTimeSec,
      beforeYaw,afterYaw:b.yawVelocity,steerVisual:b.steerVisual,speedMph:b.speedMph,
      spec:b._arenaSpec.value,course:{def:{venue:d.course.def.venue,arena:d.course.def.arena}},
      callout:s.callout,playerStatus:s.status};})()`);
  assert.equal(probe.stage,'window');assert.equal(probe.phase,'sparking');
  assert.ok(probe.windowSecondsRemaining>0);assert.equal(probe.playerStatus,'racing');
  assert.ok(Math.abs(probe.steerVisual)>.05, 'Window heading fixture must request a real turn');
  const response=1-Math.exp(-DRIVE.yawResponse/120);
  const targetYaw=(probe.afterYaw-probe.beforeYaw*(1-response))/response;
  const measured=Math.abs(targetYaw/probe.steerVisual);
  const normal=steeringYawAuthority(Math.abs(probe.speedMph),probe.spec.grip,1,probe.spec,probe.course);
  assert.ok(Math.abs(measured-normal*.5)<1e-8,
    'Built Sal pilot must physically halve the current arena authority');
  assert.equal(probe.callout,'SHE MISSED. HIT HER NOW!');
  await ready(context, quality+' natural Sal window');
  const sparks=await context.evaluate(`(() => {let visible=false;
    window.__render.scene.traverse(n=>{if(n.name==='kit-sal-sparks'&&n.visible)visible=true});return visible})()`);
  assert.ok(sparks,'Natural Sal window must retain its renderer sparks');
  await capture(context, quality+'-sal-window');
  return {...probe,measuredAuthority:measured,normalAuthority:normal,sparks};
}
export async function run(context) {
  const report={factor:DRIVE.arenaSteeringFactor,frames:[],windows:[],
    fixtures:'Memory-only discovery, all-car unlock and Sal hold; initial driving/approach poses and one window heading perturbation. Actual App entry, Duel inputs and fixed steps; production chase camera and HUD.',
    humanReview:'Kyle Preview steering feel and Claude standard-camera Sal feel remain pending.'};
  for(const quality of ['high','performance']){
    await context.navigate('/tools/menu-check.html?flags=warlords&harness=arena-steering-'+quality);
    await context.waitFor('!!window.__qaApp&&!!window.__render',quality+' private menu',60000);
    await ready(context,quality+' menu');
    await context.evaluate(`(() => {const a=window.__qaApp;
      if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||
        !window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only review required');
      a.stop();a.audio.setMuted(true);a.setGraphicsQuality(${JSON.stringify(quality)});
      for(const panel of document.querySelectorAll('details'))
        if(panel.querySelector('summary')?.textContent.startsWith('MENU QA'))panel.open=false;
      a.profile={...a.profile,unlockedCars:[...new Set([...a.profile.unlockedCars,'titan_monster','koenigsegg_jesko'])],
        wasteland:{...a.profile.wasteland,discoveredGate:true,
          territories:{...a.profile.wasteland.territories,sal:{hold:100,claimed:false}}}};
      if(!a._saveProfile()||!a.visitWasteland())throw Error('Memory-only discovery fixture failed');})()`);
    await yard(context,quality);
    for(const car of ['falcone_f42','titan_monster','koenigsegg_jesko'])
      report.frames.push(await turningArc(context,quality,car));
    report.windows.push(await salWindow(context,quality));
  }
  await writeFile(join(context.outputDir,'arena-steering-browser.json'),JSON.stringify(report,null,2)+'\n');
  console.log('Arena steering: High/Performance real turning arcs,0.3s releases and natural Sal half-yaw windows passed. Human Preview feel remains pending.');
}
