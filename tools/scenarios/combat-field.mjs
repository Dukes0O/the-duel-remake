// Show a real three-CPU combat exchange with disposable browser saves.
export async function run(context) {
  await context.navigate('/tools/menu-check.html');
  await context.waitFor(
    "!!window.__qaApp && !!window.__render && !document.querySelector('#start-engine').disabled && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value",
    'isolated combat menu and renderer', 60_000);

  const result = await context.evaluate(`(() => {
    const app = window.__qaApp;
    if (!app.startCampaign({mode: 'wasteland', startStage: 0,
      opponentCount: 3, seed: 1989})) throw Error('Three-opponent Wasteland race did not start');
    app.stop();
    const duel = app.duel;
    const state = duel.state;
    const [first, second, third] = state.opponents;
    Object.assign(state, {status: 'racing', countdown: 0, cpuDifficulty: 'medium',
      s: 170, prevS: 170, lateral: 0, prevLateral: 0, speedMph: 0, traffic: []});
    for (const [actor, s, lateral] of [[first, 240, -3.1],
      [second, 190, 0], [third, 197, 3.1]]) {
      Object.assign(actor, {s, prevS: s, lateral, prevLateral: lateral,
        speedMph: 0, pushVelocity: 0, headingError: 0, impactTimer: 0});
    }
    state.combat.aiTimer = Infinity;
    state.combat.pickupTimer = Infinity;
    third.cpuPickupCharges = {bomb: 0, crossbow: 0, star: 1};
    duel.step(1 / 120);
    if (!(third.combatShield > 0) || third.cpuPickupCharges.star !== 0)
      throw Error('CPU 3 did not activate its own earned star shield');
    if (!duel.fireWeapon('crossbow')) throw Error('Player crossbow did not fire');
    for (let step = 0; step < 120 && !state.combat.hits; step++) duel.step(1 / 120);
    if (state.combat.hits !== 1 || !Object.values(second.damageZones || {}).some(v => v > 0))
      throw Error('Crossbow did not damage and count CPU 2: ' +
        JSON.stringify({hits: state.combat.hits, damage: second.damageZones}));

    const focus = duel.course.groundAt(193, 0);
    app.inspectionCamera = {position: [focus.x + 15, focus.y + 8, focus.z + 18],
      target: [focus.x, focus.y + 2, focus.z]};
    app.onFrame?.(state);
    window.__render.renderFrame();
    const scene = window.__render.scene;
    const shield = scene.getObjectByName('combat-shield-3');
    const bow = scene.getObjectByName('combat-bow-2');
    if (!shield?.visible || !bow?.visible)
      throw Error('Later CPU shield or weapon rig is absent from the rendered scene');
    document.querySelectorAll('details').forEach(panel => {
      if (panel.querySelector('summary')?.textContent.includes('TEMPORARY SAVES') ||
          panel.querySelector('summary')?.textContent.startsWith('Performance samples'))
        panel.hidden = true;
    });
    return {opponents: state.opponents.length, hits: state.combat.hits,
      cpu2Damage: second.damageZones, cpu3Shield: third.combatShield,
      shieldVisible: shield.visible, bowVisible: bow.visible,
      rank: document.querySelector('#race-position')?.textContent,
      total: document.querySelector('#position-total')?.textContent,
      memoryOnlySaves: !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value};
  })()`);
  if (result.opponents !== 3 || result.hits !== 1 || !result.shieldVisible ||
      !result.bowVisible || !result.memoryOnlySaves)
    throw Error(`Three-opponent combat scene failed: ${JSON.stringify(result)}`);
  await context.screenshot('three-opponent-combat');
  console.log(`Three-opponent combat: one player hit on CPU 2, CPU 3 shield and CPU 2 rig visible, rank ${result.rank}${result.total}.`);
}
