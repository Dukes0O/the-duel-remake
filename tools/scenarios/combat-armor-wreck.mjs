// The QA page installs disposable in-memory saves before loading the game.
// Screenshots are reviewed for the reused explosion effect and car recovery.
async function qualityPass(context, quality) {
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor("!!window.__qaApp && !!window.__render && !document.querySelector('#start-engine').disabled && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value",
    `${quality} memory-only combat menu`, 60_000);
  await context.evaluate(`(() => {
    const select = document.querySelector('#graphics-quality');
    select.value = ${JSON.stringify(quality)};
    select.dispatchEvent(new Event('change', {bubbles: true}));
  })()`);
  await context.waitFor(`document.querySelector('#graphics-quality')?.value===${JSON.stringify(quality)} &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'`,
    `${quality} renderer ready`, 60_000);

  const playerWreck = await context.evaluate(`(async () => {
    const app = window.__qaApp;
    const buildStart = performance.now();
    if (!app.startCampaign({mode: 'wasteland', startStage: 0,
      opponentCount: 3, seed: 1989})) throw Error('Three-opponent race did not start');
    const buildMs = performance.now() - buildStart;
    app.stop();
    window.__presentCombatFrame = async () => {
      for (let attempt = 0; attempt < 400; attempt++) {
        const render = window.__render;
        render.renderer.info.reset();
        const started = performance.now();
        const frame = render.renderFrame();
        const renderMs = performance.now() - started;
        const warmupStatus = document.querySelector('#view3d').dataset.warmupStatus;
        if (['ready', 'fallback', 'off', 'unsupported-fallback'].includes(warmupStatus) &&
            frame.drawCalls > 0) return {renderMs, drawCalls: frame.drawCalls, warmupStatus};
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      throw Error('Wreck inspection never received a presented renderer frame');
    };
    const warmupStart = performance.now();
    const firstRaceFrame = await window.__presentCombatFrame();
    const warmupMs = performance.now() - warmupStart;
    const canvasData = document.querySelector('#view3d').dataset;
    canvasData.combatArmorBuildMs = buildMs.toFixed(2);
    canvasData.combatArmorWarmupMs = warmupMs.toFixed(2);
    const duel = app.duel, state = duel.state;
    if (state.opponents.length !== 3 || !Number.isFinite(state.maxArmor))
      throw Error('Armored three-opponent field is missing');
    Object.assign(state, {status: 'racing', countdown: 0, s: 500, prevS: 500,
      lateral: 0, prevLateral: 0, speedMph: 0, invulnerableSec: 0, traffic: []});
    state.opponents.forEach((actor, index) => Object.assign(actor, {
      s: 100 + index * 80, prevS: 100 + index * 80,
      lateral: 0, prevLateral: 0, speedMph: 0, impactTimer: 0,
    }));
    state.combat.aiTimer = Infinity;
    state.combat.pickupTimer = Infinity;
    const approach = duel.course.groundAt(state.s, state.lateral);
    app.inspectionCamera = {position: [approach.x + 14, approach.y + 7, approach.z + 16],
      target: [approach.x, approach.y + 2, approach.z]};
    window.__render.camera.position.fromArray(app.inspectionCamera.position);
    app.onFrame?.(state);
    state.paused = true;
    const preImpactFrame = await window.__presentCombatFrame();
    state.paused = false;
    state.armor = 12;
    const events = window.__combatWreckEvents = [];
    duel.onChange((_, event) => { if (event.combatWreck) events.push(event); });
    const at = duel.course.groundAt(state.s, state.lateral);
    state.combat.projectiles.push({kind: 'crossbow', enemy: true, level: 0,
      x: at.x, y: at.y + 2, z: at.z, vx: 0, vy: 0, vz: 0, age: 0});
    duel.step(1 / 120);
    if (events.length !== 1 || events[0].victim !== 'player' || state.armor !== 0)
      throw Error('Player did not enter one visible armor wreck');
    const focus = duel.course.groundAt(state.s, state.lateral);
    app.inspectionCamera = {position: [focus.x + 14, focus.y + 7, focus.z + 16],
      target: [focus.x, focus.y + 2, focus.z]};
    app.onFrame?.(state);
    // Both quality passes inspect the same pose despite menu-camera damping.
    window.__render.camera.position.fromArray(app.inspectionCamera.position);
    state.paused = true;
    const playerFrame = await window.__presentCombatFrame();
    const playerWreckRenderMs = playerFrame.renderMs;
    canvasData.combatArmorPlayerWreckRenderMs = playerWreckRenderMs.toFixed(2);
    document.querySelectorAll('details').forEach(panel => {
      const title = panel.querySelector('summary')?.textContent || '';
      if (title.includes('TEMPORARY SAVES') || title.startsWith('Performance samples'))
        panel.hidden = true;
    });
    const render = window.__render;
    const explosions = render.scene.children.filter(group =>
      group.children?.some(child => child.isPoints && child.geometry?.getAttribute('puff')));
    const debug = {
      inspectionCamera: app.inspectionCamera,
      cameraPosition: render.camera.position.toArray(),
      cameraRotation: render.camera.rotation.toArray(),
      statePosition: {s: state.s, lateral: state.lateral},
      canvasCount: document.querySelectorAll('#view3d canvas').length,
      pools: explosions.map(group => ({visible: group.visible,
        ringOpacity: group.children.find(child => child.geometry?.type === 'RingGeometry')?.material.opacity,
        puffVisible: group.children.find(child => child.isPoints)?.visible})),
      poolBuildMs: canvasData.opponentExplosionBuildMs,
      poolWarmupMs: canvasData.opponentExplosionWarmupMs,
      shaderPrograms: render.renderer.info.programs?.length,
      warmupStatus: canvasData.warmupStatus,
      drawCalls: playerFrame.drawCalls,
    };
    return {opponents: state.opponents.length, armor: state.armor,
      status: state.status, wrecks: events.length, buildMs, warmupMs,
      playerWreckRenderMs, preImpactMs: preImpactFrame.renderMs, firstRaceFrame, debug,
      memoryOnlySaves: !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value};
  })()`);
  if (playerWreck.status !== 'racing' || !playerWreck.memoryOnlySaves)
    throw Error(`${quality} player wreck broke combat race: ${JSON.stringify(playerWreck)}`);
  console.log(`${quality} armor setup: build ${playerWreck.buildMs.toFixed(2)} ms, ` +
    `first render ${playerWreck.warmupMs.toFixed(2)} ms, ` +
    `pre-impact scene ${playerWreck.preImpactMs.toFixed(2)} ms; ` +
    `first player-wreck render ${playerWreck.playerWreckRenderMs.toFixed(2)} ms`);
  console.log(`${quality} player wreck debug: ${JSON.stringify(playerWreck.debug)}`);
  await context.screenshot(`armor-player-wreck-${quality}`);

  const cpuWreck = await context.evaluate(`(async () => {
    const app = window.__qaApp, duel = app.duel, state = duel.state;
    state.paused = false;
    for (let index = 0; index < 216; index++) duel.step(1 / 60);
    if (Math.abs(state.armor - state.maxArmor * .6) > 1e-6)
      throw Error('Player did not recover with 60% armor');
    const second = state.opponents[1];
    Object.assign(second, {s: state.s + 35, prevS: state.s + 35,
      lateral: 3.1, prevLateral: 3.1, speedMph: 0, impactTimer: 0, armor: 12});
    const at = duel.course.groundAt(second.s, second.lateral);
    state.combat.projectiles.push({kind: 'crossbow', enemy: false, level: 0,
      x: at.x, y: at.y + 2, z: at.z, vx: 0, vy: 0, vz: 0, age: 0});
    duel.step(1 / 120);
    const wrecks = window.__combatWreckEvents;
    if (wrecks.length !== 2 || wrecks[1].opponentIndex !== 1 || second.armor !== 0)
      throw Error('Second CPU car did not wreck separately');
    const focus = duel.course.groundAt(second.s, second.lateral);
    app.inspectionCamera = {position: [focus.x + 14, focus.y + 7, focus.z + 16],
      target: [focus.x, focus.y + 2, focus.z]};
    app.onFrame?.(state);
    window.__render.camera.position.fromArray(app.inspectionCamera.position);
    state.paused = true;
    const cpuFrame = await window.__presentCombatFrame();
    const cpuWreckRenderMs = cpuFrame.renderMs;
    document.querySelector('#view3d').dataset.combatArmorCpuWreckRenderMs =
      cpuWreckRenderMs.toFixed(2);
    return {opponents: state.opponents.length, playerArmor: state.armor,
      cpuArmor: second.armor, wrecks: wrecks.length, status: state.status,
      cpuWreckRenderMs, cpuDrawCalls: cpuFrame.drawCalls};
  })()`);
  if (cpuWreck.status !== 'racing' || cpuWreck.opponents !== 3)
    throw Error(`${quality} later-CPU wreck broke the field: ${JSON.stringify(cpuWreck)}`);
  console.log(`${quality} first later-CPU-wreck render: ${cpuWreck.cpuWreckRenderMs.toFixed(2)} ms`);
  await context.screenshot(`armor-cpu-wreck-${quality}`);

  const finish = await context.evaluate(`(() => {
    const app = window.__qaApp, duel = app.duel, state = duel.state;
    state.paused = false;
    for (let index = 0; index < 216; index++) duel.step(1 / 60);
    const second = state.opponents[1];
    if (Math.abs(second.armor - second.maxArmor * .6) > 1e-6)
      throw Error('Second CPU car did not recover with 60% armor');
    Object.assign(state, {s: duel.raceLength, completedLaps: state.lapsTotal,
      stageTimeSec: Math.max(120, state.stageTimeSec),
      lapTimes: Array(state.lapsTotal).fill(60)});
    if (!duel._finishStage()) throw Error('Recovered race could not finish');
    app.onFrame?.(state);
    window.__render.renderFrame();
    const modal = document.querySelector('#modal-layer');
    if (modal?.hidden || !modal?.querySelector('.result-panel'))
      throw Error('Recovered race did not render its results view');
    return {status: state.status, position: state.results?.position,
      opponentCount: state.results?.opponentCount,
      wrecks: window.__combatWreckEvents.length};
  })()`);
  if (!Number.isInteger(finish.position) || finish.position < 1 ||
      finish.position > 4 || finish.opponentCount !== 3 || finish.wrecks !== 2)
    throw Error(`${quality} ranked completion failed: ${JSON.stringify(finish)}`);
  await context.screenshot(`armor-recovered-result-${quality}`);
}

export async function run(context) {
  for (const quality of ['high', 'performance']) await qualityPass(context, quality);
}
