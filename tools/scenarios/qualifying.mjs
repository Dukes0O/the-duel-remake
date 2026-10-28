// Native menu and qualifying lifecycle. QA entry installs memory-only storage.
// No race position, lap counter, finish result or player save is injected.
export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=grand-prix,grand-prix-career');
  await context.waitFor(`window.__qaApp && document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled`,
    'isolated menu and renderer',60000);
  await context.evaluate(`(() => {
    if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value)
      throw Error('Memory-only storage is required.');
    window.__qaApp.audio.setMuted(true);
    document.querySelector('[data-mode="grandprix"]').click();
    document.querySelector('[data-cpu-difficulty="medium"]').click();
    const group=document.querySelector('#qualifying-choice');
    if(group.hidden || document.querySelector('[data-qualifying="skip"]').getAttribute('aria-pressed')!=='true')
      throw Error('Grand Prix qualifying must default to Skip.');
    document.querySelector('[data-qualifying="drive"]').click();
    if(document.querySelector('[data-qualifying="drive"]').getAttribute('aria-pressed')!=='true')
      throw Error('The qualifying choice was not selected.');
    for(const panel of document.querySelectorAll('details'))if(panel.querySelector('summary')?.textContent.includes('TEMPORARY SAVES'))panel.hidden=true;
  })()`);
  await context.screenshot('qualifying-choice');
  await context.evaluate(`(() => {
    window.__qualifyingCredits=window.__qaApp.profile.credits;
    window.__qualifyingEvents=[];
    window.__qaApp.duel.onChange((state,event)=>{
      if(event.qualifyingFlyingStart || event.qualifyingLap || event.qualifyingComplete || event.stageResult)
        window.__qualifyingEvents.push(event);
    });
    document.querySelector('#start-engine').click();
    window.__qaApp.autopilot=true;
    window.__qaApp._scriptedCrashDone=true;
  })()`);
  await context.waitFor(`window.__qaApp.visualReady && window.__qaApp.duel.state.qualifying?.phase==='driving' && document.querySelector('#stage.in-race')`,
    'moving solo qualifying and renderer',30000);
  const first=await context.evaluate(`(() => {
    const s=window.__qaApp.duel.state;
    if(s.opponents.length || s.traffic.length || s.field || s.combat || s.status!=='racing')
      throw Error('Qualifying must drive alone through normal rules.');
    return {speedMph:s.speedMph,lapsTotal:s.lapsTotal};
  })()`);
  if(first.lapsTotal!==2)throw Error('Qualifying must time exactly two laps.');
  await context.screenshot('qualifying-driving');
  const result=await context.evaluate(`(() => {
    const app=window.__qaApp,s=app.duel.state;
    let steps=0;
    while(s.qualifying.phase==='driving' && steps++<60*600)app.advance(1/60,1/60);
    if(s.qualifying.phase!=='complete')throw Error('Native controls did not finish qualifying.');
    const events=window.__qualifyingEvents;
    if(events.filter(e=>e.qualifyingFlyingStart).length!==1 || events.filter(e=>e.qualifyingLap).length!==2 || events.some(e=>e.stageResult))
      throw Error('Approach, timed laps or reward lifecycle is wrong.');
    if(s.status!=='countdown' || s.stageTimeSec!==0 || s.completedLaps!==0 || s.opponents.length!==7 || s.lapsTotal!==3)
      throw Error('Earned grid did not start a fresh Grand Prix.');
    if(app.profile.credits!==window.__qualifyingCredits)throw Error('Qualifying changed credits.');
    window.__qualifyingBestMs=Math.round(Math.min(...s.qualifying.lapTimes)*1000);
    return {lapTimes:[...s.qualifying.lapTimes],gridSlot:s.field.playerSlot,practiceLaps:s.qualifying.practiceLaps,steps};
  })()`);
  // Laps are written to the verified IndexedDB save one after another, so the
  // second lap lands a moment after the last timed line. Wait for the real save.
  await context.waitFor(`window.__qaApp.getLapTelemetry({eventId:'pacific-canyon',route:'route_a'}).lap?.lapMs===window.__qualifyingBestMs &&
    window.__qaApp.getLapTelemetry({eventId:'pacific-canyon',route:'route_a'}).status==='saved'`,
    'verified qualifying telemetry save',15000);
  await context.evaluate(`(() => {
    const app=window.__qaApp;
    const saved=JSON.parse(localStorage.getItem('the-duel-lap-telemetry-v1')||'{"laps":[]}');
    const lap=app.getLapTelemetry({eventId:'pacific-canyon',route:'route_a'});
    if(saved.laps.length!==1 || lap.status!=='saved' || lap.lap.playerId!==app.player.id ||
      lap.lap.lapMs!==window.__qualifyingBestMs)
      throw Error('The best clean qualifying telemetry lap was not saved.');
    window.__qualifyingPriorTelemetry=saved.laps[0];
  })()`);
  await context.waitFor(`window.__qaApp.visualReady && window.__qaApp.duel.state.field?.size===8`, 'actual full-field race renderer',30000);
  await context.screenshot('qualifying-earned-grid');
  await context.evaluate(`(() => {
    window.__qaApp.returnToMenu();
  })()`);
  await context.waitFor(`window.__qaApp.visualReady && document.querySelector('#stage.in-menu') && !document.querySelector('#start-engine')?.disabled`, 'ready menu after qualifying',30000);
  await context.evaluate(`(() => {
    const app=window.__qaApp;
    document.querySelector('[data-mode="grandprix"]').click();
    document.querySelector('[data-cpu-difficulty="medium"]').click();
    document.querySelector('[data-qualifying="skip"]').click();
  })()`);
  await context.waitFor(`window.__qaApp.visualReady && !document.querySelector('#start-engine')?.disabled`, 'ready Skip race choice',30000);
  await context.evaluate(`(() => {
    const app=window.__qaApp;
    document.querySelector('#start-engine').click();
    const s=app.duel.state;
    if(s.qualifying || !s.field || s.field.playerSlot!==5 || s.status!=='countdown')
      throw Error('Skip did not use the normal Medium back-half grid: '+JSON.stringify({phase:s.qualifying?.phase,slot:s.field?.playerSlot,status:s.status,cpu:s.cpuDifficulty,startDisabled:document.querySelector('#start-engine').disabled}));
  })()`);
  console.log(`Qualifying: native laps ${result.lapTimes.join(', ')} s; grid ${result.gridSlot+1}; ${result.practiceLaps} practice laps; Skip unchanged.`);
  await pitExitAcceptance(context);
}

// Replace only the disposable QA course definition before normal loading.
// Real pit geometry, controls, gates and clocks supply every result below.
async function pitExitAcceptance(context) {
  await context.evaluate(`window.__qaApp.returnToMenu()`);
  await context.waitFor(`window.__qaApp.visualReady && document.querySelector('#stage.in-menu') && !document.querySelector('#start-engine')?.disabled`, 'pit fixture menu',30000);
  const pose=await context.evaluate(`(() => {
    if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value || !window.name.startsWith('__duel_qa_tab_v2:'))
      throw Error('Authored fixture requires the disposable QA adapter.');
    const app=window.__qaApp,def=app.getMenuCourse(0).def;
    window.__qualifyingOriginalDef={def,values:{...def}};
    Object.assign(def,{closed:true,script:[
      ['straight',500,{name:'Service Straight',width:16,walls:'both'}],
      ['turn','L',180,80,{name:'Far Bend',width:16}],
      ['straight',500,{name:'Back Straight',width:16}],
      ['turn','L',180,80,{name:'Home Bend',width:16}]],
      pitLane:{straight:'Service Straight',side:'right'}});
    app._menuCourses.clear();window.__qualifyingEvents=[];
    if(!app.startCampaign({startStage:0,seed:1989,fieldSeed:444,mode:'grandprix',qualifying:true,
      car:'falcone_f42',difficulty:'casual',cpuDifficulty:'medium'}))throw Error('Authored pit qualifying did not start.');
    const s=app.duel.state,lane=app.duel.course.pitLane;
    if(!lane || lane.straight!=='Service Straight' || s.s!==lane.exit || s.lateral!==0 || s.speedMph!==80/1.609344)
      throw Error('Real authored pit exit did not supply the moving start.');
    if(s.qualifying.phase!=='driving' || app.grandPrixLapRecorder)
      throw Error('Qualifying prematurely started the GP lap recorder.');
    app.autopilot=true;app._scriptedCrashDone=true;
    return {exit:lane.exit,length:app.duel.course.length,credits:app.profile.credits};
  })()`);
  await context.waitFor(`window.__qaApp.visualReady && window.__qaApp.duel.state.qualifying?.phase==='driving'`, 'actual authored pit exit renderer',30000);
  await context.screenshot('qualifying-authored-pit-exit');
  const result=await context.evaluate(`(() => {
    const app=window.__qaApp,s=app.duel.state;let steps=0;
    while(s.qualifying.phase==='driving' && steps++<60*600)app.advance(1/60,1/60);
    const events=window.__qualifyingEvents;
    if(s.qualifying.phase!=='complete' || events.filter(e=>e.qualifyingFlyingStart).length!==1 ||
      events.filter(e=>e.qualifyingLap).length!==2 || events.some(e=>e.stageResult) || s.qualifying.practiceLaps!==2)
      throw Error('Authored pit approach did not arm two genuine timed laps.');
    if(s.status!=='countdown' || s.stageTimeSec!==0 || s.completedLaps!==0 || s.opponents.length!==7 ||
      s.lapsTotal!==3 || !app.grandPrixLapRecorder || app.profile.credits!==${pose.credits})
      throw Error('Authored pit completion did not initialize the real GP without qualifying pay.');
    if(!s.qualifying.lapTimes.every(t=>Number.isFinite(t)&&t>0))throw Error('Native pit lap clocks are invalid.');
    window.__qualifyingBestMs=Math.round(Math.min(...s.qualifying.lapTimes)*1000);
    return {steps,lapTimes:[...s.qualifying.lapTimes],grid:s.field.playerSlot};
  })()`);
  await context.waitFor(`window.__qaApp.getLapTelemetry({eventId:'pacific-canyon',route:'route_a'}).lap?.lapMs===window.__qualifyingBestMs &&
    window.__qaApp.getLapTelemetry({eventId:'pacific-canyon',route:'route_a'}).status==='saved'`,
    'verified authored pit telemetry save',15000);
  await context.evaluate(`(() => {
    const app=window.__qaApp;
    const saved=JSON.parse(localStorage.getItem('the-duel-lap-telemetry-v1')||'{"laps":[]}');
    const lap=app.getLapTelemetry({eventId:'pacific-canyon',route:'route_a'}),prior=window.__qualifyingPriorTelemetry;
    if(saved.laps.length!==2 || lap.status!=='saved' || lap.lap.playerId!==app.player.id ||
      lap.lap.lapMs!==window.__qualifyingBestMs ||
      JSON.stringify(saved.laps.find(row=>row.key===prior.key))!==JSON.stringify(prior))
      throw Error('Authored pit qualifying lost its best lap or the prior layout record.');
  })()`);
  await context.waitFor(`window.__qaApp.visualReady && window.__qaApp.duel.state.field?.size===8`, 'authored pit earned GP grid',30000);
  await context.screenshot('qualifying-authored-pit-grid');
  await context.evaluate(`(() => {
    const saved=window.__qualifyingOriginalDef;
    for(const key of Object.keys(saved.def))if(!Object.hasOwn(saved.values,key))delete saved.def[key];
    Object.assign(saved.def,saved.values);window.__qaApp._menuCourses.clear();delete window.__qualifyingOriginalDef;
  })()`);
  console.log(`Authored pit: exact exit ${pose.exit} m; native laps ${result.lapTimes.join(', ')} s; ${result.steps} steps; GP recorder initialized.`);
}
