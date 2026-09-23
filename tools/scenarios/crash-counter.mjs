// Five moderate rock hits spend all five ordinary-race crash slots even though
// none crosses the separate major-impact threshold.
export async function run(context){
  await context.navigate('/tools/menu-check.html');
  await context.waitFor("window.__qaApp && document.querySelector('#stage.in-menu') && document.querySelector('#view3d').dataset.vehicleAsset==='ready'",'isolated ready menu',60_000);
  const steps=await context.evaluate(`(() => {
    const app=window.__qaApp;
    app.stop();
    app.startCampaign({startStage:0,mode:'duel',car:'falcone_f42',difficulty:'casual'});
    const state=app.duel.state;
    state.status='racing';state.countdown=0;state.traffic=[];
    const snapshot=()=>({lives:state.lives,majorCrashes:state.majorCrashes,status:state.status,
      label:document.querySelector('#damage-label').textContent,
      aria:document.querySelector('#lives-display').getAttribute('aria-label'),
      bars:document.querySelectorAll('#lives-display i').length,
      healthy:document.querySelectorAll('#lives-display i.healthy').length});
    app.onFrame(state);
    const samples=[snapshot()];
    for(let hit=1;hit<=5;hit++){
      state.impactTimer=0;state.invulnerableSec=0;
      app.duel._crash('rock',1,40);
      app.onFrame(state);
      samples.push(snapshot());
    }
    return samples;
  })()`);
  for(let hit=0;hit<=5;hit++){
    const step=steps[hit];
    if(step.lives!==5-hit||step.majorCrashes!==0)throw Error(`Hit ${hit}: simulation fixture changed: ${JSON.stringify(step)}`);
    if(step.label!==`${hit} / 5 CRASHES`||!step.aria?.includes(`${hit} of 5 crashes`))
      throw Error(`Hit ${hit}: HUD does not show spent crash slots: ${JSON.stringify(step)}`);
    if(step.bars!==5||step.healthy!==5-hit)
      throw Error(`Hit ${hit}: visual bars disagree with crash slots: ${JSON.stringify(step)}`);
    if(hit===5&&step.status!=='gameover')throw Error(`Fifth hit did not end the race: ${JSON.stringify(step)}`);
  }
  const result=await context.evaluate("document.querySelector('#overlay').textContent");
  if(result.includes('Five major crashes'))throw Error('Game-over screen still calls every spent slot a major crash.');
  const combat=await context.evaluate(`(() => {
    const app=window.__qaApp;
    app.returnToMenu();
    app.startCampaign({startStage:0,mode:'wasteland',car:'falcone_f42',difficulty:'casual'});
    const state=app.duel.state;
    state.status='racing';state.countdown=0;state.majorCrashes=4;state.crashFlash=.5;
    app.onFrame(state);
    return {label:document.querySelector('#damage-label').textContent,
      callout:document.querySelector('#callout-kicker').textContent};
  })()`);
  if(!combat.label.includes('AUTO RECOVERY')||combat.callout.includes('NEXT CRASH ENDS RACE'))
    throw Error(`Recoverable Wasteland crash was described as fatal: ${JSON.stringify(combat)}`);
  console.log('Crash counter: five 64 km/h rock hits consume five slots; HUD counts every hit through game over.');
}
