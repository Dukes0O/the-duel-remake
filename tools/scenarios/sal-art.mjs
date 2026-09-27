// Private, memory-only review of Sawtooth Sal's Banshee saw rig in both
// graphics modes. Raw captures stay ignored; only the bounded sheet ships.
export function salReviewPaths(round) {
  if (!Number.isInteger(round) || round < 1 || round > 3)
    throw Error('Sal review round must be an integer from 1 to 3.');
  return {
    evidence: `.evidence/sal/round-${round}`,
    sheet: `docs/board/looks/sal/round-${round}.jpg`,
  };
}

async function capture(context, quality, phase, label=phase, elapsed=.8) {
  const report = await context.evaluate(`(() => {
    const app=window.__qaApp,state=app.duel.state,render=window.__render;
    state.salSaw={phase:${JSON.stringify(phase)},sinceSec:10};
    state.stageTimeSec=${phase === 'idle' ? 10 : 10 + elapsed};
    app.onFrame?.(state,0);render.renderFrame();
    const sal=render.scene.getObjectByName('kit-sal-saws');
    const left=sal?.getObjectByName('kit-sal-saw-left');
    const right=sal?.getObjectByName('kit-sal-saw-right');
    const sparks=sal?.getObjectByName('kit-sal-sparks');
    let vertices=0;sal?.traverseVisible(node=>{vertices+=node.geometry?.attributes?.position?.count||0;});
    return {quality:${JSON.stringify(quality)},phase:${JSON.stringify(phase)},visible:sal?.visible,
      left:!!left,right:!!right,sparks:!!sparks?.visible,vertices,
      rotation:[left?.rotation.x,right?.rotation.x],drawCalls:render.renderer.info.render.calls,
      memoryOnly:Object.getOwnPropertyDescriptor(window,'localStorage')?.value != null &&
        window.name.startsWith('__duel_qa_tab_v2:')};
  })()`);
  if (!report.memoryOnly || !report.visible || !report.left || !report.right || report.vertices < 50 ||
      report.sparks !== (phase === 'sparking') ||
      (phase === 'idle' && report.rotation.some(value => Math.abs(value) > 1e-8)) ||
      (phase !== 'idle' && report.rotation.some(value => !Number.isFinite(value) || Math.abs(value) < .2)))
    throw Error(`${quality} ${phase} Sal rig failed: ${JSON.stringify(report)}`);
  await context.screenshot(`${quality}-${label}`);
  return report;
}

async function setReviewCamera(context, chase=false) {
  await context.evaluate(`(() => {
    const app=window.__qaApp,render=window.__render;
    const car=render.scene.getObjectByName('armor-kit-0-front')?.parent?.parent;
    if(!car)throw Error('Banshee render root missing');
    car.updateMatrixWorld(true);const size=car.userData.size;
    const eye=car.localToWorld(car.position.clone().set(
      ${chase ? '-size.width*2.55' : 'size.width*2.65'},
      ${chase ? 'size.height*1.25+.35' : 'size.height*1.72+.48'},
      ${chase ? '-size.length*1.24' : '-size.length*.72'}));
    const target=car.localToWorld(car.position.clone().set(0,size.height*.43,-size.length*.03));
    app.inspectionCamera={position:eye.toArray(),target:target.toArray()};render.renderFrame();
  })()`);
}

async function frameCost(context, quality) {
  return context.evaluate(`(async()=>{
    const app=window.__qaApp,state=app.duel.state,render=window.__render;
    const sample=async warlordId=>{state.warlordId=warlordId;
      for(let i=0;i<30;i++)render.renderFrame();const values=[];
      for(let i=0;i<180;i++){await new Promise(requestAnimationFrame);const start=performance.now();
        render.renderFrame();values.push(performance.now()-start)}
      values.sort((a,b)=>a-b);return {p50:+values[90].toFixed(3),p95:+values[171].toFixed(3),
        mean:+(values.reduce((a,b)=>a+b,0)/values.length).toFixed(3)};};
    const off=await sample('dustmonger'),on=await sample('sal');
    return {quality:${JSON.stringify(quality)},off,on,scope:'180 RAF-paced production renderFrame CPU submissions after 30 warm frames; stopped one-car field; same camera and state; GPU work is asynchronous'};
  })()`);
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride',
    {width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await context.navigate('/tools/menu-check.html?flags=scrapdome');
  await context.waitFor("!!window.__qaApp && !!window.__render && document.querySelector('#stage.in-menu') && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value", 'memory-only QA menu', 60000);
  await context.evaluate(`(() => {
    const app=window.__qaApp;app.audio.setMuted(true);
    app.profile={...app.profile,
      unlockedCars:[...new Set([...app.profile.unlockedCars,'banshee_muscle'])],
      wasteland:{...app.profile.wasteland,discoveredGate:true,
        kits:{...(app.profile.wasteland?.kits||{}),banshee_muscle:{owned:['warlord'],equipped:'warlord'}}}};
    if(!app._saveProfile())throw Error('memory-only Sal fixture could not be saved');
    if(!app.startCampaign({mode:'wasteland',car:'banshee_muscle',startStage:0,seed:1989,
      difficulty:'medium',opponentCount:0}))throw Error('Sal Banshee campaign did not start');
    Object.assign(app.duel.state,{status:'racing',paused:false,countdown:0,speedMph:0,
      traffic:[],opponents:[],warlordId:'sal',combatArmorKit:'warlord'});
    document.head.insertAdjacentHTML('beforeend','<style>details,#race-hud,#pause-button,#modal-layer,#sound-toggle,#camera-button{display:none!important}</style>');
    const point=app.duel.course.worldAt(app.duel.state.s,app.duel.state.lateral);
    app.inspectionCamera={position:[point.x+5.8,point.y+2.15,point.z+4.6],
      target:[point.x,point.y+.62,point.z]};
    app.onFrame?.(app.duel.state,0);window.__render.renderFrame();
  })()`);
  await context.waitFor(`(() => {window.__render.renderFrame();
    return document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' &&
      !!window.__render.scene.getObjectByName('kit-sal-saw-left');})()`, 'Banshee Sal renderer', 60000);
  await context.evaluate('window.__qaApp.stop()');
  const loaded=await context.evaluate(`(() => {const s=window.__qaApp.duel.state,r=window.__render.scene;
    const names=[];r.traverse(n=>{if(/armor|authored|kit-sal|banshee/i.test(n.name))names.push(n.name)});
    return {names:names.slice(-80),mode:s.mode,status:s.status,combat:!!s.combat,flag:window.__qaApp.duel.featureFlags.enabled('wasteland2'),car:s.car,warlordId:s.warlordId,kit:s.combatArmorKit};})()`);
  if (!loaded.names.includes('kit-sal-saw-left')) throw Error('Banshee Sal rig did not load: '+JSON.stringify(loaded));
  const reports=[];
  const costs=[];
  for (const quality of ['high','performance']) {
    await context.evaluate(`window.__qaApp.setGraphicsQuality(${JSON.stringify(quality)})`);
    await setReviewCamera(context,false);
    for (const phase of ['idle','spin-up','sparking']) reports.push(await capture(context,quality,phase));
    await setReviewCamera(context,true);
    reports.push(await capture(context,quality,'sparking','sparking-chase',.94));
    costs.push(await frameCost(context,quality));
  }
  console.log('Sal art review: '+reports.map(row=>`${row.quality}/${row.phase} ${row.vertices} vertices ${row.drawCalls} calls`).join('; '));
  console.log('Sal rig render cost: '+JSON.stringify(costs));
}
