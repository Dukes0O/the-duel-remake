export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride',
    {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await context.navigate('/tools/menu-check.html?flags=crew-gear');
  await context.waitFor(`!!window.__qaApp && !!window.__render &&
    document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready' &&
    !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`,
  'memory-only Boarding scene', 60_000);
  const mounted = await context.evaluate(`(() => {
    const app = window.__qaApp, duel = app.duel;
    if (!app._switches().enabled('crew-gear')) throw Error('Crew gear is off');
    app.stop(); app.audio.setMuted(true);
    duel.startCampaign({mode: 'wasteland', car: 'falcone_f42',
      seed: 2903, discoveredGate: true, crewId: 'jax', opponentCount: 1,
      cpuDifficulty: 'easy'});
    const s = duel.state, rival = s.opponents[0];
    Object.assign(s, {status: 'racing', countdown: 0, paused: false,
      s: 500, prevS: 500, lateral: 0, prevLateral: 0,
      speedMph: 0, traffic: [], wastelandGateDiscovered: true});
    s.combat.aiTimer = s.combat.pickupTimer = Infinity;
    Object.assign(rival, {s: 510, prevS: 510, lateral: 0, prevLateral: 0,
      speedMph: 0, headingError: 0, airHeight: 0, prevAirHeight: 0});
    duel.setInput({interact: true});
    for (let i = 0; i < 50 && !s.onFoot; i++) duel.step(1 / 120);
    duel.setInput({interact: false});
    if (!s.onFoot || !s.fighter) throw Error('Native car exit failed');
    Object.assign(rival, {s: s.fighter.s + 6, prevS: s.fighter.s + 6,
      lateral: s.fighter.lateral, prevLateral: s.fighter.lateral,
      speedMph: 0, headingError: 0});
    s.crewGear.grapple = {kind: 'car', targetId: 'cpu:0',
      arrived: true, launchDistance: 6};
    duel.step(1 / 120);
    if (s.boarding?.phase !== 'roof' || s.boarding.targetId !== 'cpu:0')
      throw Error('Actual fixed fighter step did not mount the enemy roof');
    const roof = duel.course.groundAt(rival.s, rival.lateral);
    const roofY = roof.y + duel._vehicleSpec(rival).height;
    if (Math.abs(s.fighter.y - roofY) > .02)
      throw Error('Boarded fighter did not follow the real roof height');
    app.inspectionCamera = {position: [roof.x + 10, roofY + 8, roof.z + 17],
      target: [roof.x, roofY, roof.z]};
    app.onFrame?.(s, 0); window.__render.renderFrame();
    return {phase: s.boarding.phase, targetId: s.boarding.targetId,
      fighterY: s.fighter.y, roofY};
  })()`);
  await context.waitFor(`(() => {
    const app = window.__qaApp, render = window.__render;
    app.onFrame?.(app.duel.state, 0); render.renderFrame();
    const figures = render.scene.getObjectByName('Rigged on-foot fighters');
    return figures?.userData.assetStatus === 'ready' && figures.visible;
  })()`, 'loaded fighter on the enemy roof', 60_000);
  await context.evaluate(`(() => {
    const s = window.__qaApp.duel.state;
    const before = JSON.stringify(s.boarding);
    window.__render.renderFrame();
    if (JSON.stringify(s.boarding) !== before)
      throw Error('Roof rendering changed boarding rules');
    const charge = window.__render.scene.getObjectByName('crew-boarding-charge');
    if (!charge || charge.visible) throw Error('Unplanted charge is visible');
  })()`);
  await context.screenshot('boarding-roof');
  const planted = await context.evaluate(`(() => {
    const app = window.__qaApp, duel = app.duel, s = duel.state;
    const events = [];
    const detach = duel.onChange((_state, event) => {
      if (event.crewBoardingCue) events.push({cue: event.crewBoardingCue,
        reason: event.reason});
    });
    duel.setFighterInput({fire: true});
    for (let i = 0; i < 120 && s.boarding?.phase === 'roof'; i++)
      duel.step(1 / 120);
    if (s.boarding?.phase !== 'charge')
      throw Error('One-second native fire hold did not plant the charge: ' +
        JSON.stringify({boarding: s.boarding, fighterInput: s.fighterInput,
          fighter: s.fighter && {x: s.fighter.x, y: s.fighter.y, z: s.fighter.z,
            knockedDown: s.fighter.knockedDown},
          rival: {s: s.opponents[0].s, speedMph: s.opponents[0].speedMph,
            combatWrecking: s.opponents[0].combatWrecking,
            crushed: s.opponents[0].crushed, finished: s.opponents[0].finished},events}));
    detach();
    duel.setFighterInput({fire: false});
    const before = JSON.stringify(s.boarding);
    app.onFrame?.(s, 0); window.__render.renderFrame();
    const charge = window.__render.scene.getObjectByName('crew-boarding-charge');
    const lamp = charge?.getObjectByName('crew-boarding-charge-lamp');
    if (!charge?.visible || !lamp)
      throw Error('Planted charge is missing from the victim roof');
    if (JSON.stringify(s.boarding) !== before)
      throw Error('Charge rendering changed the fuse');
    return {phase: s.boarding.phase, fuse: s.boarding.fuseSeconds,
      chargeY: charge.position.y, lampVisible: lamp.visible};
  })()`);
  await context.screenshot('boarding-charge');
  console.log('Private Boarding: ' + JSON.stringify({mounted, planted}));
}
