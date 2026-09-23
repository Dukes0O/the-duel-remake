// A severe oncoming wreck must tell the player about both cars' outcomes.
export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=roadside-destruction');
  await context.waitFor("!!window.__qaApp && !!window.__render && !document.querySelector('#start-engine').disabled", 'isolated menu and renderer', 60_000);
  const result = await context.evaluate(`(() => {
    const app = window.__qaApp;
    if (!app.startCampaign({mode:'wasteland',startStage:0,car:'falcone_f42',seed:1989}))
      throw Error('Wasteland race did not start');
    app.stop();
    const duel = app.duel, player = duel.state;
    if (!duel.destructionEnabled()) throw Error('Private roadside destruction switch did not enable');
    Object.assign(player, {status:'racing',paused:false,invulnerableSec:0,impactTimer:0,
      s:100,prevS:80,lateral:0,prevLateral:0,speedMph:130});
    const traffic = {s:105,prevS:115,lateral:.6,prevLateral:.6,speedMph:60,dir:-1,alive:true};
    player.traffic = [traffic];
    if (!duel._vehicleContact(player, traffic, 'head_on')) throw Error('Oncoming contact missed');
    app.onFrame?.(player);
    window.__render.renderFrame();
    const visible = !document.querySelector('#race-callout').hidden;
    const message = document.querySelector('#callout-text').textContent;
    return {wrecked:traffic.wrecked,crashes:player.stageCrashes,penalty:player.racePenaltySec,visible,message};
  })()`);
  if (!result.wrecked || result.crashes !== 1 || result.penalty !== 2 || !result.visible ||
      !result.message.includes('TRAFFIC WRECKED / IMPACT +2 SECONDS'))
    throw Error(`Severe wreck feedback is incomplete: ${JSON.stringify(result)}`);
  await context.screenshot('traffic-wreck-callout');
  console.log('Severe traffic wreck: both the destroyed car and the player crash penalty appear in the live HUD.');
}
