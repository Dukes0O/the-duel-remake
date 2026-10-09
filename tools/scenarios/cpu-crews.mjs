export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride',
    {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  for (const quality of ['high', 'performance']) {
  await context.navigate('/tools/menu-check.html?flags=cpu-crews');
  await context.waitFor(`!!window.__qaApp && !!window.__render &&
    !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`,
  'memory-only computer crew scene', 60_000);
  const stopped = await context.evaluate(`(() => {
    const app = window.__qaApp, duel = app.duel;
    if (!app._switches().enabled('cpu-crews')) throw Error('Computer crews are off');
    app.stop(); app.audio.setMuted(true);
    app.setGraphicsQuality('${quality}');
    duel.startCampaign({mode: 'wasteland', car: 'falcone_f42',
      seed: 3004, discoveredGate: true, opponentCount: 1,
      cpuDifficulty: 'hard'});
    const s = duel.state, rival = s.opponents[0], zone = s.raids.zones[0];
    Object.assign(s, {status: 'racing', countdown: 0, paused: false,
      s: zone.s - 160, prevS: zone.s - 160,
      lateral: 0, prevLateral: 0, speedMph: 0});
    Object.assign(rival, {s: zone.s, prevS: zone.s, lateral: 0,
      prevLateral: 0, speedMph: 0, headingError: 0});
    duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
    for (let tick = 0; tick < 1200 && rival.cpuCrew?.phase !== 'ambush'; tick++)
      duel.step(1 / 120);
    if (rival.cpuCrew?.phase !== 'ambush' || !rival.cpuCrew.fighter || rival.speedMph > 1)
      throw Error('The native Hard rival did not park and get out');
    const fighter = rival.cpuCrew.fighter;
    app.inspectionCamera = {position: [fighter.x + 5, fighter.y + 3, fighter.z + 8],
      target: [fighter.x, fighter.y + .9, fighter.z]};
    app.onFrame?.(s, 0); window.__render.renderFrame();
    window.__cpuCrewScenarioEvents = [];
    window.__cpuCrewScenarioDetach = duel.onChange((_state, event) => {
      if (event.cpuCrewEntered || event.footWeaponFired && event.enemy)
        window.__cpuCrewScenarioEvents.push({entered: !!event.cpuCrewEntered,
          weapon: event.footWeaponFired, actorId: event.actorId,
          time: s.stageTimeSec, enteredS: event.cpuCrewEntered ? event.actor.s : null});
    });
    return {crewId: rival.cpuCrew.crewId, phase: rival.cpuCrew.phase,
      fighterId: fighter.id, parkedSpeed: rival.speedMph};
  })()`);
  await context.waitFor(`(() => {
    const app = window.__qaApp, render = window.__render;
    app.onFrame?.(app.duel.state, 0); render.renderFrame();
    const fighters = render.scene.getObjectByName('Rigged on-foot fighters');
    return fighters?.userData.assetStatus === 'ready' && fighters.visible;
  })()`, 'loaded computer crew fighter', 60_000);
  await context.evaluate(`(() => {
    const app = window.__qaApp;
    const before = JSON.stringify(app.duel.state.opponents.map(actor => actor.cpuCrew));
    window.__render.renderFrame();
    if (before !== JSON.stringify(app.duel.state.opponents.map(actor => actor.cpuCrew)))
      throw Error('Rendering changed the computer crew rules');
  })()`);
  await context.screenshot(`cpu-crew-ambush-${quality}`);
  const completed = await context.evaluate(`(() => {
    const app = window.__qaApp, duel = app.duel, s = duel.state, rival = s.opponents[0];
    app.inspectionCamera = null; app.autopilot = true;
    let pullAway = null;
    for (let tick = 0; tick < 120 * 900 && s.status === 'racing'; tick++) {
      app._driveAutopilot(1 / 120); duel.step(1 / 120);
      const entered = window.__cpuCrewScenarioEvents.find(event => event.entered);
      if (entered && !pullAway && rival.cpuCrew.phase === 'driving' &&
          rival.s >= entered.enteredS + duel._vehicleSpec(rival).halfLength * 2 && rival.speedMph > 1)
        pullAway = {elapsed: s.stageTimeSec - entered.time, speedMph: rival.speedMph};
    }
    window.__cpuCrewScenarioDetach();
    const events = window.__cpuCrewScenarioEvents;
    if (!events.some(event => event.weapon)) throw Error('The real ambusher never attacked');
    if (!events.some(event => event.entered)) throw Error('The ambusher never got back in');
    if (!pullAway) throw Error('The returned native car never physically pulled away');
    if (s.status === 'racing') throw Error('The Hard race did not complete');
    if (s.completedLaps < s.lapsTotal) throw Error('The player did not reach the race finish');
    app.onFrame?.(s, 0); window.__render.renderFrame();
    return {status: s.status, completedLaps: s.completedLaps,
      lapsTotal: s.lapsTotal, pullAway, events};
  })()`);
  await context.screenshot(`cpu-crew-race-finish-${quality}`);
  console.log('Private computer crews: ' + JSON.stringify({stopped, completed}));
  }
}
