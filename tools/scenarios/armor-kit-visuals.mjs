// Private, memory-only visual check. Both quality modes use the same race pose.
async function qualityPass(context, quality) {
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor(`!!window.__qaApp && !!window.__render &&
    !document.querySelector('#start-engine')?.disabled &&
    !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`,
  `${quality} isolated armor-kit menu`, 60_000);
  await context.evaluate(`(() => {
    const select = document.querySelector('#graphics-quality');
    select.value = ${JSON.stringify(quality)};
    select.dispatchEvent(new Event('change', {bubbles: true}));
  })()`);
  await context.waitFor(`document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready'`,
    `${quality} car model ready`, 60_000);

  const initial = await context.evaluate(`(() => {
    const app = window.__qaApp;
    app.profile = {...app.profile, wasteland: {...app.profile.wasteland,
      kits: {...app.profile.wasteland.kits,
        falcone_f42: {owned: ['scrapper'], equipped: 'scrapper'}}}};
    app._saveProfile();
    if (!app.startCampaign({mode: 'wasteland', startStage: 0,
      opponentCount: 3, seed: 1989})) throw Error('Combat field did not start');
    app.stop();
    const state = app.duel.state;
    Object.assign(state, {status: 'racing', countdown: 0, paused: false,
      s: 500, prevS: 500, lateral: 0, prevLateral: 0,
      speedMph: 0, traffic: [], armor: state.maxArmor});
    state.opponents.forEach((actor, index) => Object.assign(actor, {
      s: 480 + index * 9, prevS: 480 + index * 9,
      lateral: index === 1 ? -4 : 4, prevLateral: index === 1 ? -4 : 4,
      speedMph: 0, armor: actor.maxArmor,
      combatArmorKit: index === 0 ? 'scrapper' :
        index === 1 ? 'raider' : 'warlord',
    }));
    state.combat.aiTimer = Infinity;
    state.combat.pickupTimer = Infinity;
    const point = app.duel.course.groundAt(state.s, state.lateral);
    app.inspectionCamera = {position: [point.x + 16, point.y + 9, point.z + 18],
      target: [point.x, point.y + 2, point.z]};
    app.onFrame?.(state);
    document.querySelectorAll('details').forEach(panel => {
      const title = panel.querySelector('summary')?.textContent || '';
      if (title.includes('TEMPORARY SAVES') ||
          title.startsWith('Performance samples')) panel.hidden = true;
    });
    window.__render.camera.position.fromArray(app.inspectionCamera.position);
    const frame = window.__render.renderFrame();
    const car = window.__render.scene.getObjectByName('armor-kit-0-bull-bar');
    if (!car?.visible || !car.parent?.parent || state.opponents.length !== 3)
      throw Error('Four-car socket kits did not draw');
    return {drawCalls: frame.drawCalls, armor: state.armor,
      memoryOnly: !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value};
  })()`);
  if (!initial.memoryOnly) throw Error('QA saves were not isolated');
  await context.screenshot(`armor-kit-intact-${quality}`);

  await context.evaluate(`(() => {
    const app = window.__qaApp, state = app.duel.state;
    state.stageTimeSec += .2;
    state.armor = state.maxArmor * .08;
    state.opponents[0].armor = state.opponents[0].maxArmor * .25;
    state.opponents[1].armor = state.opponents[1].maxArmor * .08;
    state.opponents[2].armor = state.opponents[2].maxArmor * .42;
    app.onFrame?.(state);
    window.__render.renderFrame();
    const scene = window.__render.scene;
    if (scene.getObjectByName('armor-kit-0-plate-0-0')?.visible ||
        !scene.getObjectByName('combat-vfx-damage-0-fire')?.visible ||
        !scene.getObjectByName('combat-vfx-damage-1-smoke')?.visible)
      throw Error('Damaged plates or low-armor effects did not update');
  })()`);
  await context.screenshot(`armor-kit-critical-${quality}`);

  await context.evaluate(`(() => {
    const app = window.__qaApp, state = app.duel.state;
    state.combatWrecking = true;
    state.combatWreckSite = {s: state.s, lateral: state.lateral};
    state.armor = 0;
    app.onFrame?.(state);
    window.__render.renderFrame();
    const scene = window.__render.scene;
    if (scene.getObjectByName('combat-vfx-damage-0-fire')?.visible ||
        !scene.getObjectByName('combat-vfx-wreck-0-fire')?.visible)
      throw Error('Wreck did not replace critical-health flame');
  })()`);
  await context.screenshot(`armor-kit-wreck-${quality}`);
  console.log(`${quality}: ${initial.drawCalls} intact draw calls; plates, critical smoke/fire and wreck checked`);
}

export async function run(context) {
  for (const quality of ['high', 'performance']) await qualityPass(context, quality);
}
