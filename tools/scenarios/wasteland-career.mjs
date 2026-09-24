// Production menu and result UI on the harness's private port and memory-only saves.
export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor("!!window.__qaApp && !!window.__render && document.querySelector('#stage.in-menu') && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value", 'isolated Wasteland menu', 60_000);
  const first = await context.evaluate(`(() => {
    const app=window.__qaApp;
    app.addPlayer('Career QA One');
    app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true}};
    app._saveProfile();
    if(!app.startCampaign({mode:'wasteland',startStage:0,seed:1989}))throw Error('Wasteland race did not start');
    app.stop();
    const state=app.duel.state;
    Object.assign(state,{status:'racing',countdown:0,s:app.duel.raceLength,
      completedLaps:state.lapsTotal,stageTimeSec:180,
      lapTimes:Array(state.lapsTotal).fill(90)});
    if(!app.duel._finishStage())throw Error('Wasteland race did not finish');
    app.onFrame?.(state);
    return {earned:state.results.scrapEarned,credits:app.profile.credits,
      scrap:app.profile.wasteland.scrap,hold:app.profile.wasteland.territories.sal.hold,
      results:document.querySelector('#modal-layer')?.textContent||''};
  })()`);
  if(first.earned!==200||first.scrap!==200||first.hold!==25||first.credits!==0||
      !first.results.includes('SCRAP EARNED')||first.results.includes('CREDITS EARNED'))
    throw Error('Post-gate result or settlement wrong: '+JSON.stringify(first));
  const shop = await context.evaluate(`(() => {
    const app=window.__qaApp;
    app.returnToMenu();app.onFrame?.(app.duel.state);
    document.querySelector('[data-action="armory"]').click();
    const before=document.querySelector('#modal-layer')?.textContent||'';
    const buy=document.querySelector('[data-weapon-upgrade="ufo"]');
    if(!buy||!buy.textContent.includes('150 SCRAP'))throw Error('Scrap upgrade button missing');
    buy.click();
    const after=document.querySelector('#modal-layer')?.textContent||'';
    return {before,after,scrap:app.profile.wasteland.scrap,
      level:app.profile.wasteland.weapons.levels.ufo,credits:app.profile.credits};
  })()`);
  if(!shop.before.includes('TERRITORY MAP')||!shop.before.includes('25 / 100 HOLD')||
      shop.scrap!==50||shop.level!==1||shop.credits!==0||
      !shop.after.includes('50 SCRAP'))
    throw Error('Scrap purchase or map wrong: '+JSON.stringify(shop));
  const second = await context.evaluate(`(() => {
    const app=window.__qaApp;
    document.querySelector('[data-action="armory-close"]').click();
    app.addPlayer('Career QA Two');app.onFrame?.(app.duel.state);
    document.querySelector('[data-action="armory"]').click();
    const text=document.querySelector('#modal-layer')?.textContent||'';
    return {scrap:app.profile.wasteland.scrap,hold:app.profile.wasteland.territories.sal.hold,
      gate:app.profile.wasteland.discoveredGate,text};
  })()`);
  if(second.scrap!==0||second.hold!==0||second.gate!==false||
      second.text.includes('TERRITORY MAP')||!second.text.includes('CR'))
    throw Error('Named player isolation failed: '+JSON.stringify(second));
  await context.screenshot('wasteland-career');
  await context.navigate('/tools/menu-check.html');
  await context.waitFor("!!window.__qaApp && document.querySelector('#stage.in-menu') && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value", 'flag-off isolated menu', 60_000);
  const legacy = await context.evaluate(`(() => {
    const app=window.__qaApp;
    if(!app.startCampaign({mode:'wasteland',startStage:0,seed:1989}))throw Error('Legacy combat race did not start');
    app.stop();
    const state=app.duel.state;
    Object.assign(state,{status:'racing',countdown:0,s:app.duel.raceLength,
      completedLaps:state.lapsTotal,stageTimeSec:180,
      lapTimes:Array(state.lapsTotal).fill(90)});
    if(!app.duel._finishStage())throw Error('Legacy combat race did not finish');
    app.onFrame?.(state);
    return {reward:state.results.creditReward,scrap:state.results.scrapEarned,
      results:document.querySelector('#modal-layer')?.textContent||''};
  })()`);
  if(!(legacy.reward>0)||legacy.scrap!==undefined||
      !legacy.results.includes('CREDITS EARNED')||legacy.results.includes('SCRAP EARNED'))
    throw Error('Flag-off credit result changed: '+JSON.stringify(legacy));
}
