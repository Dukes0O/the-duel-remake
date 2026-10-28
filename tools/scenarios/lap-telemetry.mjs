import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {referenceLap} from '../../src/reference-laps.js';
import {compareLapTelemetry,TELEMETRY_KEY} from '../../src/lap-telemetry.js';

// One real route only. The separate strict 27-reference gate is unchanged.
const EVENT='harbor-highlands',ROUTE='route_c',FINGERPRINT='track-v1-6eceb630';
const entry='/tools/preview.html?flags=grand-prix';
const ready=`window.__qaApp && window.__render && document.querySelector('#stage.in-menu') &&
  document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled`;
const time=ms=>`${Math.floor(ms/60000)}:${(ms%60000/1000).toFixed(3).padStart(6,'0')}`;
const delta=ms=>`${ms>0?'+':ms<0?'−':''}${(Math.abs(ms)/1000).toFixed(3)} s`;

async function key(context,key,code,windowsVirtualKeyCode,modifiers=0){
  await context.command('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode,modifiers});
  await context.command('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode,modifiers});
}
async function setup(context,quality){
  await context.navigate(entry);
  await context.waitFor(ready,`${quality} native Preview and renderer`,60_000);
  const admission=await context.evaluate(`(async()=>{
    const app=window.__qaApp;
    if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value ||
      !window.name.startsWith('__duel_qa_tab_v2:') || !window.__duelQaBackupStore)
      throw Error('Memory-only physical and backup stores are required.');
    if(app._switches().enabled('grand-prix')!==true)
      throw Error('The actual FIELD grand-prix entry must be enabled.');
    const held=(await navigator.locks.query()).held.filter(row=>row.name.startsWith('the-duel-career-writer-v1-qa-'));
    if(held.length!==1)throw Error('Exactly one native Preview career writer must be admitted.');
    const player=app.addPlayer('Native '+${JSON.stringify(quality)});
    if(!player.ok)throw Error('Could not create the disposable named player.');
    app.profile.credits=50000;app._saveProfile();
    const purchased=app.purchaseCourse(${JSON.stringify(EVENT)});
    if(!purchased.ok)throw Error('Could not buy the native test circuit: '+purchased.reason);
    // Telemetry is track intel level 3 (P4-INTEL-LEVELS): buy it at the menu, as a player would, so the Team Room shows it.
    const intel=app.buyIntel(${JSON.stringify(EVENT)},3);
    if(!intel.ok)throw Error('Could not buy track intel level 3: '+JSON.stringify(intel));
    app.setRouteVariant(${JSON.stringify(ROUTE)});
    app.audio.setMuted(true);app.setGraphicsQuality(${JSON.stringify(quality)});
    window.__telemetryEvents=[];
    app.duel.onChange((state,event)=>{
      if(event.lapCompleted || event.checkpointReset || event.boundaryReset || event.recovered)
        window.__telemetryEvents.push({lapCompleted:Number.isInteger(event.lapCompleted)&&event.lapCompleted>0,lapTimeSec:event.lapTimeSec,
          assisted:event.assisted===true,reset:!!(event.checkpointReset||event.boundaryReset||event.recovered),
          completedLaps:state.completedLaps});
    });
    const stageIndex=[...document.querySelector('#scene-select').options].map(option=>Number(option.value))
      .find(index=>app.getMenuCourse(index)?.def.id===${JSON.stringify(EVENT)});
    if(!Number.isInteger(stageIndex))throw Error('The native circuit is not offered.');
    if(!app.startCampaign({startStage:stageIndex,seed:17,routeVariant:${JSON.stringify(ROUTE)},
      mode:'timetrial',car:'falcone_f42',difficulty:'casual',cpuDifficulty:'medium'}))
      throw Error('The native Time Trial did not start.');
    app.autopilot=true;
    return {writers:held.length,playerId:app.player.id};
  })()`);
  await context.waitFor(`window.__qaApp.visualReady && document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'`,
    `${quality} race graphics ready`,60_000);
  return admission;
}
async function finishNativeRace(context,quality){
  let progress;
  // App.advance uses the existing input controller and fixed-step simulation.
  // No state distance, elapsed time, lap count, result or record is assigned.
  for(let step=0;step<240;step++){
    progress=await context.evaluate(`(() => {
      const app=window.__qaApp;
      if(app.visualReady && ['countdown','racing','ticket'].includes(app.duel.state.status))app.advance(1);
      const state=app.duel.state;
      return {status:state.status,time:state.stageTimeSec,completedLaps:state.completedLaps,ready:app.visualReady};
    })()`);
    if(['stage_result','complete','gameover'].includes(progress.status))break;
    if(!progress.ready)await context.waitFor('window.__qaApp.visualReady',`${quality} native renderer readiness`,60_000);
  }
  assert.equal(progress.status,'stage_result',`${quality}: native run must finish normally: ${JSON.stringify(progress)}`);
  await context.waitFor(`!!document.querySelector('.result-actions [data-team-room="${EVENT}"]')`,
    `${quality} native analyse-lap results action`,20_000);
  return context.evaluate(`(async()=>{
    const app=window.__qaApp,state=app.duel.state;
    app.stop();
    const view=app.getLapTelemetry({eventId:${JSON.stringify(EVENT)},route:${JSON.stringify(ROUTE)},courseFingerprint:${JSON.stringify(FINGERPRINT)}});
    await localStorage.flush();
    const durable=await window.__duelQaBackupStore.load('origin-primary-v1');
    const action=document.querySelector('.result-actions [data-team-room="${EVENT}"]');
    window.__telemetryWitness=()=>JSON.stringify({state:app.duel.state,profile:app.profile,
      player:app.player.id,stage:app.menuStage,route:app.menuRouteId,settings:app.getRaceChoices(),
      saved:Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).sort().map(key=>[key,localStorage.getItem(key)])});
    return {view,completed:state.results?.completed,lapTimes:state.lapTimes,completedLaps:state.completedLaps,
      assistedLaps:state.assistedLaps,events:window.__telemetryEvents,
      action:action.textContent.trim(),raw:localStorage.getItem(${JSON.stringify(TELEMETRY_KEY)}),
      durableRaw:durable.entries[${JSON.stringify(TELEMETRY_KEY)}],nativeDbOpens:window.__telemetryNativeDbOpens};
  })()`);
}
async function compareInNativeRoom(context,quality,lap,reference){
  await context.evaluate(`(() => {
    const action=document.querySelector('.result-actions [data-team-room="${EVENT}"]');
    window.__telemetryBefore=window.__telemetryWitness();action.focus();action.click();
  })()`);
  await context.waitFor(`!document.querySelector('.team-room-layer')?.hidden && !!document.querySelector('[data-telemetry-speed]')`,
    `${quality} real Team Room comparison`,20_000);
  const panel=await context.evaluate(`(() => {
    if(window.__telemetryWitness()!==window.__telemetryBefore)throw Error('Opening the comparison changed race, profile, settings or saved data.');
    const layer=document.querySelector('.team-room-layer');
    if(!document.activeElement?.hasAttribute('data-team-close'))throw Error('Team Room did not take keyboard focus.');
    const graph=layer.querySelector('[data-telemetry-speed]');
    return {text:layer.querySelector('[data-team-telemetry]').textContent,
      rows:[...layer.querySelectorAll('[data-team-telemetry] tbody tr')].map(row=>[...row.children].map(cell=>cell.textContent)),
      lines:[...graph.querySelectorAll('polyline')].map(line=>line.getAttribute('points')),
      losses:[...layer.querySelectorAll('[data-telemetry-loss]')].map(row=>row.textContent)};
  })()`);
  const expected=compareLapTelemetry(lap,reference);
  assert.equal(expected.status,'ready');assert.match(panel.text,/Reference lap: Stuttgart 959-S/);
  assert.match(panel.text,/Your best lap/);assert.ok(panel.text.includes(time(lap.lapMs)));
  assert.deepEqual(panel.rows,expected.sectors.map(row=>[`Sector ${row.number}`,time(row.lapMs),time(row.referenceMs),delta(row.deltaMs)]));
  const maximum=Math.max(1,...lap.trace.map(row=>row[1]),...reference.trace.map(row=>row[1]));
  const points=trace=>trace.map(([s,kph])=>`${(50+s/lap.courseLength*820).toFixed(1)},${(170-kph/maximum*140).toFixed(1)}`).join(' ');
  assert.deepEqual(panel.lines,[points(reference.trace),points(lap.trace)]);
  assert.equal(panel.losses.length,expected.losses.length);
  expected.losses.forEach((loss,index)=>{
    assert.ok(panel.losses[index].includes(delta(loss.lossMs)));
    assert.ok(panel.losses[index].includes(loss.cause));
  });
  await key(context,'Tab','Tab',9,8);
  await context.evaluate(`(() => {
    const buttons=[...document.querySelectorAll('.team-room-layer button:not(:disabled),.team-room-layer summary')];
    if(document.activeElement!==buttons.at(-1))throw Error('Reverse Tab escaped the native dialog.');
  })()`);
  await key(context,'Tab','Tab',9);
  await context.evaluate(`(() => {
    if(!document.activeElement?.hasAttribute('data-team-close'))throw Error('Forward Tab escaped the native dialog.');
    document.querySelector('[data-team-telemetry]').scrollIntoView({block:'center'});
    if(window.__telemetryWitness()!==window.__telemetryBefore)throw Error('Studying the comparison changed its read-only witnesses.');
  })()`);
  await context.screenshot(`lap-telemetry-${quality}`);
  await key(context,'Escape','Escape',27);
  await context.waitFor(`document.querySelector('.team-room-layer')?.hidden`,`${quality} native dialog closes`,10_000);
  await context.evaluate(`(() => {
    if(document.activeElement?.dataset.teamRoom!==${JSON.stringify(EVENT)})throw Error('Escape did not restore results-action focus.');
    if(document.querySelector('.team-room-layer').childElementCount)throw Error('Closing retained the comparison UI.');
    if(window.__telemetryWitness()!==window.__telemetryBefore)throw Error('Closing changed race, profile, settings or saved data.');
  })()`);
  return {sectorRows:panel.rows.length,losses:panel.losses.length,speedTraces:panel.lines.length,focusAndReadOnly:true};
}
export async function run(context){
  assert.notEqual(new URL(context.baseURL).port,'5174');
  const reference=referenceLap(EVENT,ROUTE);
  assert.equal(reference?.courseFingerprint,FINGERPRINT);
  assert.ok(reference.corners.every(corner=>Number.isFinite(corner.elapsedMs)));
  await context.command('Page.addScriptToEvaluateOnNewDocument',{source:`window.__telemetryNativeDbOpens=0;
    IDBFactory.prototype.open=function(){window.__telemetryNativeDbOpens++;throw Error('Telemetry proof requires memory-only backups');};`});
  await context.command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  const report={card:'P4-INTEL-TELEMETRY',scope:'Harbor C native recording and results entry only; all 27 references still required',
    eventId:EVENT,route:ROUTE,courseFingerprint:FINGERPRINT,qualities:[],passed:false};
  try{
    for(const quality of ['high','performance']){
      const admission=await setup(context,quality),result=await finishNativeRace(context,quality),lap=result.view.lap;
      assert.equal(result.completed,true);assert.equal(result.view.status,'saved');assert.ok(lap);
      assert.equal(result.action,'ANALYSE MY LAP');assert.equal(result.nativeDbOpens,0);
      assert.equal(lap.courseFingerprint,FINGERPRINT);assert.equal(lap.playerId,admission.playerId);
      assert.equal(lap.mode,'timetrial');assert.equal(lap.seed,17);
      assert.equal(lap.lapMs,Math.round(Math.min(...result.lapTimes.filter((_,i)=>!result.assistedLaps[i]))*1000));
      assert.ok(result.events.some(event=>event.lapCompleted));
      assert.ok(result.events.every(event=>!event.reset));
      assert.ok(lap.controls.some(row=>row[1]>0));assert.ok(lap.trace.some(row=>row[1]>0));
      assert.equal(result.raw,result.durableRaw);
      assert.deepEqual(JSON.parse(result.durableRaw).laps.find(row=>row.key===lap.key),lap);
      const comparison=await compareInNativeRoom(context,quality,lap,reference);
      report.qualities.push({quality,...admission,...comparison,completedLaps:result.completedLaps,
        lapMs:lap.lapMs,samples:lap.trace.length,nativeDbOpens:result.nativeDbOpens});
    }
    report.passed=true;
  }finally{await writeFile(join(context.outputDir,'lap-telemetry.json'),JSON.stringify(report,null,2)+String.fromCharCode(10));}
  console.log('Native Harbor C telemetry: both qualities, valid saved lap, actual results entry, exact reference comparison, focus and unchanged read-only witnesses passed. All-27 reference acceptance remains separate.');
}