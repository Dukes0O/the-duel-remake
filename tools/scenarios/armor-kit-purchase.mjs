// One private browser pass through the real Armory and an equipped race.
// menu-check installs disposable memory-only storage before importing the game.
export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor(`!!window.__qaApp && !!window.__render &&
    !document.querySelector('#start-engine')?.disabled &&
    !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`,
  'isolated kit Armory', 60_000);
  await context.waitFor(`document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready'`,
    'kit vehicle model', 60_000);

  const purchase = await context.evaluate(`(() => {
    const app = window.__qaApp;
    app.profile = {...app.profile, credits: 5000,
      wasteland: {...app.profile.wasteland, xp: 950}};
    app._saveProfile();
    app.duel.emit({garage: true});
    document.querySelector('#armory-open').click();
    const dialog = document.querySelector('#modal-layer [role="dialog"]');
    if (!dialog || !dialog.textContent.includes('ARMOR KITS · PER CAR') ||
        !dialog.textContent.includes('STOCK ARMOR'))
      throw Error('Stock car or kit Armory is missing');
    const button = dialog.querySelector('[data-kit-tier="scrapper"]');
    if (!button || button.disabled) throw Error('Unlocked Scrapper purchase is unavailable');
    button.click();
    const after = document.querySelector('#modal-layer [role="dialog"]');
    if (!after?.textContent.includes('SCRAPPER EQUIPPED') ||
        app.profile.credits !== 4650 ||
        app.profile.wasteland.kits.falcone_f42.equipped !== 'scrapper')
      throw Error('Armory purchase did not equip or debit once');
    return {credits: app.profile.credits,
      memoryOnly: !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value};
  })()`);
  if (!purchase.memoryOnly) throw Error('QA storage was not isolated');
  await context.evaluate(`document.querySelectorAll('details').forEach(panel => {
    const title = panel.querySelector('summary')?.textContent || '';
    if (title.includes('TEMPORARY SAVES') || title.startsWith('Performance samples'))
      panel.hidden = true;
  })`);
  await context.screenshot('armor-kit-armory-purchased');

  await context.evaluate(`(() => {
    const app = window.__qaApp;
    document.querySelector('[data-action="armory-close"]').click();
    if (!app.startCampaign({mode: 'wasteland', car: 'falcone_f42',
      startStage: 0, seed: 1989})) throw Error('Kit race did not start');
    app.stop();
    const state = app.duel.state;
    Object.assign(state, {status: 'racing', countdown: 0, paused: false,
      s: 500, prevS: 500, lateral: 0, prevLateral: 0,
      speedMph: 0, traffic: []});
    state.combat.aiTimer = Infinity;
    state.combat.pickupTimer = Infinity;
    const point = app.duel.course.groundAt(state.s, state.lateral);
    app.inspectionCamera = {position: [point.x + 16, point.y + 9, point.z + 18],
      target: [point.x, point.y + 2, point.z]};
    app.onFrame?.(state);
    window.__render.camera.position.fromArray(app.inspectionCamera.position);
    if (state.combatArmorKit !== 'scrapper' || state.maxArmor !== 110)
      throw Error('Equipped kit did not reach combat armor');
  })()`);
  await context.waitFor(`(() => {
    window.__render.renderFrame();
    return window.__render.scene.getObjectByName('armor-kit-0-front')?.visible;
  })()`, 'equipped kit rendered after race warmup', 60_000);
  const visual = await context.evaluate(`({kit: window.__qaApp.duel.state.combatArmorKit,
    armor: window.__qaApp.duel.state.maxArmor})`);
  await context.screenshot('armor-kit-equipped-race');
  console.log(`Memory-only kit purchase: ${purchase.credits} credits, ${visual.kit}, ${visual.armor} armor.`);
}
