// The released roadside rule leaves a physical traffic wreck without charging
// player armor, a crash slot, or race time. Hard hits explode after the smash.
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
    const wreckPose = () => {
      const ground = duel.course.groundAt(traffic.s, traffic.lateral);
      const smoke = render.scene.getObjectByName('combat-vfx-traffic-wreck-0-smoke');
      return {dead: traffic.alive === false, physical: traffic.wrecked?.physical === true,
        visible: trafficMesh.visible, attached: trafficMesh.parent === render.scene,
        poseError: Math.hypot(trafficMesh.position.x - ground.x,
          trafficMesh.position.z - ground.z),
        position: {x: trafficMesh.position.x, z: trafficMesh.position.z},
        smoke: smoke?.visible === true, smokeOpacity: smoke?.material.opacity ?? 0,
        exploded: traffic.wrecked?.exploded === true,
        debris: pool?.children.some(item => item.visible) === true};
    };
    const first = wreckPose();
    const impact = events.find(event => event.roadsideImpact)?.roadsideImpact;
    const calloutVisible = !document.querySelector('#race-callout').hidden;
    const message = document.querySelector('#callout-text').textContent;
    // Keep the original .3-second view before the native .6-second blast.
    // The traffic step reads the race clock to dispatch that delayed event.
    const advanceTraffic = steps => {
      for (let i = 0; i < steps; i++) {
        player.stageTimeSec += 1 / 120;
        duel._traffic(1 / 120);
      }
    };
    advanceTraffic(36);
    const laterDrawCalls = await present();
    const later = wreckPose();
    advanceTraffic(48);
    app.onFrame?.(player);
    const explodedDrawCalls = await present();
    const exploded = wreckPose();
    const impacts = events.filter(event => event.roadsideImpact).map(event => event.roadsideImpact);
    const explosions = impacts.filter(event => event.outcome === 'obliterate');
    return {outcome: impact?.outcome, actorMatches: impact?.actor === traffic,
      oldWreckEvent: events.some(event => event.trafficWrecked),
      armorUnchanged: Object.is(armor, player.armor),
      crashDelta: player.stageCrashes - crashes,
      penaltyDelta: player.racePenaltySec - penalty,
      calloutVisible, message, first, later, exploded,
      moved: Math.hypot(later.position.x - first.position.x,
        later.position.z - first.position.z),
      impactCount: impacts.length, explosionCount: explosions.length,
      explosionActorMatches: explosions[0]?.actor === traffic,
      explodedCalloutVisible: !document.querySelector('#race-callout').hidden,
      explodedMessage: document.querySelector('#callout-text').textContent,
      firstDrawCalls, laterDrawCalls, explodedDrawCalls};
  })()`);
  const poses = [result.first, result.later, result.exploded];
  if (result.outcome !== 'smash' || !result.actorMatches || result.oldWreckEvent ||
      !result.armorUnchanged || result.crashDelta !== 0 || result.penaltyDelta !== 0 ||
      !result.calloutVisible || result.message !== 'TRAFFIC SMASHED' ||
      poses.some(pose => !pose.dead || !pose.physical || !pose.visible ||
        !pose.attached || !Number.isFinite(pose.poseError) || pose.poseError > 1e-6) ||
      !(result.moved > 0) || !result.later.smoke || !(result.later.smokeOpacity > 0) ||
      result.first.exploded || result.later.exploded ||
      result.first.debris || result.later.debris ||
      result.impactCount !== 2 || result.explosionCount !== 1 || !result.explosionActorMatches ||
      !result.exploded.exploded || !result.exploded.debris || !result.exploded.smoke ||
      !result.explodedCalloutVisible || result.explodedMessage !== 'TRAFFIC EXPLODED' ||
      result.firstDrawCalls <= 0 || result.laterDrawCalls <= 0 || result.explodedDrawCalls <= 0)
    throw Error(`Traffic smash and delayed explosion feedback is incomplete: ${JSON.stringify(result)}`);
  await context.screenshot('traffic-exploded-persistent-wreck');
  console.log(`Physical traffic wreck stayed visible through smash and delayed explosion with ${result.firstDrawCalls}/${result.laterDrawCalls}/${result.explodedDrawCalls} live draws; zero player armor, crash, or time loss.`);
}
