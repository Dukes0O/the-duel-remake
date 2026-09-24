// The released roadside rule retires oncoming traffic without charging
// player armor, a crash slot, or race time. Inspect the live HUD and scene.
export async function run(context) {
  await context.navigate('/tools/menu-check.html');
  await context.waitFor("!!window.__qaApp && !!window.__render && !document.querySelector('#start-engine').disabled && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value",
    'memory-only roadside menu', 60_000);
  const result = await context.evaluate(`(async () => {
    const app = window.__qaApp;
    if (!app.startCampaign({mode:'wasteland',startStage:0,car:'falcone_f42',seed:1989}))
      throw Error('Wasteland race did not start');
    app.stop();
    const duel = app.duel, player = duel.state, render = window.__render;
    if (!duel.roadsideKnockAwayEnabled()) throw Error('Released roadside rule is unavailable');
    Object.assign(player, {status:'racing',paused:false,invulnerableSec:0,impactTimer:0,
      s:100,prevS:80,lateral:0,prevLateral:0,speedMph:130});
    const traffic = {s:105,prevS:115,lateral:.6,prevLateral:.6,
      speedMph:60,dir:-1,alive:true};
    player.traffic = [traffic];
    app.onFrame?.(player);
    if (!document.querySelector('#menu-screen')?.hidden)
      throw Error('The garage overlay still covers the roadside race');
    document.querySelectorAll('details').forEach(panel => {
      const title = panel.querySelector('summary')?.textContent || '';
      if (title.includes('TEMPORARY SAVES') || title.startsWith('Performance samples'))
        panel.hidden = true;
    });
    const present = async () => {
      for (let attempt = 0; attempt < 400; attempt++) {
        render.renderer.info.reset();
        const drawn = render.renderFrame();
        const warmupStatus = document.querySelector('#view3d').dataset.warmupStatus;
        if (['ready','fallback','off','unsupported-fallback'].includes(warmupStatus) &&
            drawn.drawCalls > 0) return drawn.drawCalls;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      throw Error('Traffic inspection never received a presented renderer frame');
    };
    await present();
    const point = duel.course.groundAt(traffic.s, traffic.lateral);
    const trafficMesh = render.scene.children.find(item => item.visible && item.userData?.size &&
      Math.hypot(item.position.x - point.x, item.position.z - point.z) < 1.5);
    if (!trafficMesh) throw Error('Oncoming traffic has no visible car before contact');
    const armor = player.armor, crashes = player.stageCrashes,
      penalty = player.racePenaltySec;
    const events = [];
    duel.onChange((_, event) => events.push(event));
    if (!duel._vehicleContact(player, traffic, 'head_on'))
      throw Error('Oncoming contact missed');
    app.onFrame?.(player);
    const firstDrawCalls = await present();
    const pool = render.scene.children.find(item => item.name === 'Roadside debris pool');
    const firstDebrisVisible = pool?.children.some(item => item.visible);
    const firstCarVisible = trafficMesh.visible;
    for (let i = 0; i < 36; i++) duel._traffic(1 / 120);
    player.stageTimeSec += .3;
    const laterDrawCalls = await present();
    const impact = events.find(event => event.roadsideImpact)?.roadsideImpact;
    return {outcome: impact?.outcome, actorMatches: impact?.actor === traffic,
      oldWreckEvent: events.some(event => event.trafficWrecked),
      armorUnchanged: Object.is(armor, player.armor),
      crashDelta: player.stageCrashes - crashes,
      penaltyDelta: player.racePenaltySec - penalty,
      calloutVisible: !document.querySelector('#race-callout').hidden,
      message: document.querySelector('#callout-text').textContent,
      firstDebrisVisible, laterDebrisVisible: pool?.children.some(item => item.visible),
      firstCarVisible, carRetired: !trafficMesh.visible,
      firstDrawCalls, laterDrawCalls};
  })()`);
  if (result.outcome !== 'obliterate' || !result.actorMatches || result.oldWreckEvent ||
      !result.armorUnchanged || result.crashDelta !== 0 || result.penaltyDelta !== 0 ||
      !result.calloutVisible || result.message !== 'TRAFFIC OBLITERATED' ||
      !result.firstDebrisVisible || !result.laterDebrisVisible ||
      !result.firstCarVisible || !result.carRetired ||
      result.firstDrawCalls <= 0 || result.laterDrawCalls <= 0)
    throw Error(`Flagged traffic feedback is incomplete: ${JSON.stringify(result)}`);
  await context.screenshot('traffic-obliterated-callout');
  console.log(`Roadside traffic retired with ${result.firstDrawCalls}/${result.laterDrawCalls} live draws; zero player armor, crash, or time loss.`);
}
