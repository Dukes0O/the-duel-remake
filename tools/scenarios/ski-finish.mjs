// SKI-FINISH evidence recipe. No timing measurements, real storage or audio recording.
import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {skiZone, medalLimits} from '../../src/ski/runs/summit-zones.js';
import {SKI_PADS} from '../../src/ski/ski-session.js';
import {GUIDE} from '../../src/ski/ski-guide.js';

// Discrete keyboard proxy, reacting every 150 ms (steady) or 50 ms (practice).
// It knows the intended route, so success alone cannot prove child accessibility.
export function keyboardDriver(zone, {practice = false, explore = false, rotation = 0, closeYeti = false, straight = false} = {}) {
  let keys = {}, next = 0, waypoint = 0;
  const route = straight ? [{x:0,z:0},zone.pickup] : explore ? [{x: 0, z: 0},zone.stashes[0],...(closeYeti?[{x:-84,z:590},{x:-84,z:620}]:[]),...zone.stashes.slice(1),zone.pickup] : [...zone.line, zone.pickup];
  return (view, t) => {
    if (t < next) return keys;
    next = t + (practice ? .05 : .15);
    const s = view.skier;
    while (waypoint < route.length - 1 && (s.z > route[waypoint].z || Math.hypot(s.x-route[waypoint].x,s.z-route[waypoint].z)<5)) waypoint++;
    const a = route[Math.max(0, waypoint-1)], b = route[waypoint];
    const ahead = Math.max(3, s.speed * (practice ? .2 : .3));
    const k = Math.max(0,Math.min(1,(s.z+ahead-a.z)/(b.z-a.z||1)));
    const goal = {x:a.x+(b.x-a.x)*k,z:a.z+(b.z-a.z)*k};
    const end = waypoint === route.length-1 && s.z > route.at(-2).z;
    if (end) Object.assign(goal,zone.pickup);
    const error = Math.atan2(Math.sin(Math.atan2(goal.x-s.x,goal.z-s.z)-s.heading),Math.cos(Math.atan2(goal.x-s.x,goal.z-s.z)-s.heading));
    // Release before the skis finish leaning: keyboard edges take time to return.
    const edge = s.edge*Math.PI/180;
    const predicted = error + Math.sign(edge)*Math.min(1,Math.abs(edge)/.35)*s.speed/(17*Math.cos(edge))*.16;
    const distance = Math.hypot(zone.pickup.x-s.x,zone.pickup.z-s.z);
    const stop = end && (distance<10 || s.speed*s.speed/7>distance-4);
    keys = {KeyA:s.grounded&&!stop&&predicted>.045,KeyD:s.grounded&&!stop&&predicted<-.045||!s.grounded&&s.spin<rotation-9,
      KeyW:s.grounded&&s.speed<4&&!stop,KeyS:stop,
      ShiftLeft:practice&&!end&&Math.abs(error)<.06};
    return keys;
  };
}

const sleep = ms => new Promise(done=>setTimeout(done,ms));
export async function run(context) {
  const photo = process.env.DUEL_SKI_FINISH_PHOTO === '1';
  const detail = process.env.DUEL_SKI_FINISH_DETAIL === '1' || photo;
  const report = {scope:'Discrete keyboard events through App._simulate; 150 ms steady / 50 ms practice. Script knows route; no human child trial. Flight uses existing scripted analog pilot. Memory only; no frames or recording.', runs:[]};
  const save = () => writeFile(join(context.outputDir,'findings.json'),JSON.stringify(report,null,2)+'\n');
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await context.navigate('/tools/menu-check.html?flags=helicopter,forest-fire,rescue,summit-run,heli-skiing,lab');
  await context.waitFor(`!!window.__qaApp?.visualReady&&!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value&&window.name.startsWith('__duel_qa_tab_v2:')`,'memory QA',90000);
  await context.waitFor(`[...document.querySelectorAll('details button')].some(n=>n.textContent==='Create funded temporary player')`,'fixture',90000);
  // Reuse the existing ski-view pilot, unchanged. It reads actual Summit terrain.
  const source = await readFile(new URL('./ski-view.mjs',import.meta.url),'utf8');
  const expression = source.slice(source.indexOf('const HELPERS = ')+16,source.indexOf('\n\nasync function key')).trim().replace(/;$/,'');
  const helper = Function('return ('+expression+')')();
  await context.evaluate(`(()=>{const a=window.__qaApp;[...document.querySelectorAll('details button')].find(n=>n.textContent==='Create funded temporary player').click();
    a.audio.setMuted(true);for(const p of document.querySelectorAll('details'))p.hidden=true;
    a.profile={...a.profile,courses:{version:1,unlocked:['tremblant-woods','summit-run']},lab:{version:1,done:{launch:true},owned:{aerials:true}},
      heli:{version:1,fuelKg:400,lessons:{liftoff:true,hover:true,landing:true,carry:true},refuels:3}};a._saveProfile();
    if(!a.visitHeli())throw Error('no visit');${helper(skiZone('slalom').line,skiZone('slalom').pickup,SKI_PADS,GUIDE)};})()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli'&&window.__qaApp.visualReady`,'home',120000);
  await context.evaluate(`(()=>{const a=window.__qaApp;a.stop();const paint=()=>{a.onFrame?.(a.duel.state);window.__finishPaint=requestAnimationFrame(paint);};paint();if(!a.heliSession.takeSkiDrop().ok)throw Error('no drop');window.__skiQa.toSummit();window.__skiQa.toPad('devils');})()`);
  await context.waitFor(`window.__qaApp.visualReady`,'Summit drawn',300000);
  report.drop = await context.evaluate(`window.__qaApp.heliSession.view().ski`);
  for (const id of photo?['aerials']:detail?['moguls','aerials','powder']:['slalom','gs','moguls','aerials','powder']) {
    const zone = skiZone(id);
    for (const attempt of photo?['tuck']:id==='powder'?['explore']:detail?(id==='moguls'?['straight']:['tuck','spin','tumble']):['steady','practice']) {
      const practice = ['practice','tuck','spin','tumble'].includes(attempt);
      const rotation = attempt==='spin'?360:attempt==='tumble'?180:0;
      await context.evaluate(`(()=>{const a=window.__qaApp,s=a.heliSession;if(s.phase==='skiing')s.leaveSkiRun();
        window.__skiQa.toPad(${JSON.stringify(zone.pad)});const r=s.skiStepOut(${JSON.stringify(id)});if(!r.ok)throw Error(JSON.stringify(r));
        window.__finishDrive=(${keyboardDriver.toString()})(${JSON.stringify(zone)},{practice:${practice},explore:${id==='powder'},rotation:${rotation},closeYeti:${detail},straight:${attempt==='straight'}});
        window.__finishEvents=[];window.__finishAir=false;window.__finishLastKeys={};window.__finishRecovery=[];
        const original=s.step.bind(s);window.__finishOriginal=original;
        s.step=c=>{const before=s.view().ski?.run;const events=original(c);const after=s.view().ski?.run;if(before?.skier.tumbling&&!after?.skier.tumbling)window.__finishRecovery.push({t:after?.t,skier:after?.skier});for(const e of events)if(!['skiCarve','skiSkid'].includes(e.type))window.__finishEvents.push({...e,t:before?.t});return events;};
        if(${photo})a.skiCamera=2;
      })()`);
      await sleep(1800);
      // Stop the normal RAF simulation; advance the same App keyboard path at fixed steps.
      // Drawing stays live on its separate renderer loop. No state is positioned or patched.
      const row = {id,attempt,practice,limits:medalLimits(id), startScreen: await context.evaluate('document.body.innerText')};
      for (let batch=0;batch<300;batch++) {
        const state = await context.evaluate(`(()=>{const a=window.__qaApp,s=a.heliSession;for(let i=0;i<120;i++){
          const v=s.view().ski?.run;if(!v||s.phase!=='skiing'||v.result&&!v.skier.tumbling)break;
          const keys=window.__finishDrive(v,v.t);
          for(const code of ['KeyA','KeyD','KeyW','KeyS','ShiftLeft','Space'])if(!!keys[code]!==!!window.__finishLastKeys[code]){
            window.dispatchEvent(new KeyboardEvent(keys[code]?'keydown':'keyup',{code,key:code.replace('Key','').toLowerCase(),bubbles:true}));}
          window.__finishLastKeys={...keys};a._simulate(1/120);
          if(${id==='aerials'}&&!window.__finishAir&&(s.view().ski?.run?.skier.height??0)>3){window.__finishAir=true;break;}
        }return {phase:s.phase,run:s.view().ski?.run,events:window.__finishEvents,recovery:window.__finishRecovery};})()`);
        if (!practice && id==='slalom' && batch===8) await context.screenshot('slalom-gate');
        if (id==='aerials' && state.run && state.run.skier.height>3 && !row.jump) {await sleep(150);row.jump=await context.screenshot('aerials-jump-'+attempt);}
        if (id==='powder' && state.run && (detail?Math.hypot(state.run.skier.x+92,state.run.skier.z-600)<28:state.run.skier.z>530) && !row.bowl) {await sleep(150);row.bowl=await context.screenshot('powder-yeti');}
        if (id === 'moguls' && state.run?.result && !row.finishPicture) row.finishPicture = await context.screenshot('moguls-finish-'+attempt);
        if (state.run?.result&&!state.run.skier.tumbling || state.phase!=='skiing' || batch===299) {Object.assign(row,state);break;}
      }
      report.runs.push(row);await save();
      await context.evaluate(`(()=>{const a=window.__qaApp;for(const code of Object.keys(window.__finishLastKeys))window.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));a.heliSession.step=window.__finishOriginal;})()`);
    }
  }
  await context.evaluate(`(()=>{const a=window.__qaApp;if(a.heliSession.phase==='skiing')a.heliSession.leaveSkiRun();})()`);
  await sleep(2000);report.pickup=await context.evaluate(`(()=>{const a=window.__qaApp,h=a.heliSession.view().heli,c=a.duel.course,n=c.nearest(h.x,h.z);return {heli:h,theme:c.themeAt(n.s),nearest:n,ground:c.groundAt(n.s,n.lateral).y};})()`);
  await context.screenshot('pickup-snow');await save();
  if(detail)return;
  // Start a fresh disposable visit on a group-offer day. No real progress is used.
  for(let count=1;count<=12;count++) {
    await context.evaluate(`(()=>{const a=window.__qaApp;a.returnToMenu();a.profile={...a.profile,heli:{version:1,fuelKg:400,lessons:{liftoff:true,hover:true,landing:true,carry:true},refuels:3,playDay:{last:new Date().toISOString().slice(0,10),count:${count}}}};a._saveProfile();if(!a.visitHeli())throw Error('no group visit');})()`);
    await context.waitFor(`window.__qaApp.visualReady`,'group home drawn',120000);
    const offered=await context.evaluate(`!!window.__qaApp.heliSession.skiBoard()?.group`);
    if(!offered)continue;
    report.group=await context.evaluate(`(()=>{const a=window.__qaApp,s=a.heliSession,events=a._heliEvents.bind(a);window.__finishRadio=[];
      a._heliEvents=es=>{for(const e of es)if(e.type==='radio')window.__finishRadio.push({event:e,heli:s.view().heli});events(es);};
      const taken=s.takeSkiGroup();if(!taken.ok)throw Error(JSON.stringify(taken));window.__skiQa.toSummit();window.__skiQa.toPad('summit');
      return {taken,view:s.view(),radio:window.__finishRadio};})()`);
    await context.waitFor(`window.__qaApp.visualReady`,'group summit drawn',300000);
    await sleep(500);report.group.screen=await context.evaluate(`document.body.innerText`);
    if (!report.group.radio.some(row => row.event.line === 'ski.radio.thin-air') || !report.group.screen.includes('Lighten up: burn fuel or leave some behind.')) throw Error('Thin-air event must reach the visible radio text');
    await context.screenshot('group-summit');await save();break;
  }
}
