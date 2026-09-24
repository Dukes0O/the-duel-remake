// One private browser run covers desktop/mobile and both render quality modes.
async function pass(context, quality, width, height, mobile) {
  await context.command('Emulation.setDeviceMetricsOverride',
    {width, height, deviceScaleFactor: 1, mobile});
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor("!!window.__qaApp && !!window.__render && !document.querySelector('#start-engine')?.disabled && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value",
    'isolated combat HUD menu', 60_000);
  await context.evaluate(`(() => {
    const select = document.querySelector('#graphics-quality');
    select.value = ${JSON.stringify(quality)};
    select.dispatchEvent(new Event('change', {bubbles: true}));
  })()`);
  await context.waitFor(`document.querySelector('#graphics-quality')?.value === ${JSON.stringify(quality)} && document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready'`,
    'combat HUD renderer ready', 60_000);

  const result = await context.evaluate(`(() => {
    const app = window.__qaApp;
    if (!app.startCampaign({mode: 'wasteland', startStage: 0, opponentCount: 3, seed: 1989}))
      throw Error('Combat HUD race did not start');
    app.stop();
    const state = app.duel.state;
    Object.assign(state, {status: 'racing', countdown: 0, paused: false,
      s: 500, prevS: 500, lateral: 0, prevLateral: 0,
      speedMph: 0, traffic: [], stageTimeSec: 5});
    state.combat.aiTimer = Infinity;
    state.combat.pickupTimer = Infinity;
    state.combat.cooldowns.bomb = 4.2;
    state.opponents.forEach((actor, index) => Object.assign(actor, {
      s: 516 + index * 10, prevS: 516 + index * 10,
      lateral: index === 1 ? -4 : 4, prevLateral: index === 1 ? -4 : 4,
      speedMph: 0, armor: actor.maxArmor,
    }));
    window.__render.renderFrame();
    app.onFrame?.(state);
    document.querySelectorAll('details').forEach(panel => {
      const title = panel.querySelector('summary')?.textContent || '';
      if (title.includes('TEMPORARY SAVES') || title.startsWith('Performance samples'))
        panel.hidden = true;
    });
    const markers = [...document.querySelectorAll('.combat-opponent-marker')];
    const visible = markers.find(marker => marker.dataset.placement === 'over-car');
    if (!visible)
      throw Error('Visible opponent does not have a projected over-car marker');
    const slot = document.querySelector('.combat-slot-bar');
    const bounds = slot.getBoundingClientRect();
    if (bounds.left < -1 || bounds.right > innerWidth + 1 || bounds.top < -1 || bounds.bottom > innerHeight + 1)
      throw Error('Weapon slots clip the viewport');
    state.armor -= 12;
    state.opponents[0].armor -= 20;
    state.damageZones.right += .6;
    app.duel.emit({combatHit: true, victim: 'rival', enemy: false});
    app.duel.emit({combatHit: true, victim: 'player', enemy: true});
    app.onFrame?.(state);
    const markerBounds = markers.map(marker => marker.getBoundingClientRect());
    if (markerBounds.some(rect => rect.left < -1 || rect.right > innerWidth + 1))
      throw Error('Opponent marker clips the viewport');
    const textObserver = new MutationObserver(() => { window.__combatHudTextWrites++; });
    window.__combatHudTextWrites = 0;
    textObserver.observe(document.querySelector('.combat-upgraded-hud'),
      {characterData: true, childList: true, subtree: true});
    app.onFrame?.(state);
    textObserver.disconnect();
    const playerArmor = document.querySelector('.combat-player-armor');
    const bomb = document.querySelector('[data-combat-weapon=bomb]');
    return {memoryOnly: !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value,
      slots: document.querySelectorAll('[data-combat-weapon]').length,
      markers: markers.length, visible: markers.filter(marker => marker.dataset.placement === 'over-car').length,
      markerX: parseFloat(visible.style.left) / 100,
      armor: playerArmor.querySelector('strong').textContent,
      bomb: bomb.querySelector('.combat-slot-state').textContent,
      hit: document.querySelector('.combat-hit-marker').classList.contains('is-visible'),
      damage: document.querySelector('.combat-damage-direction').dataset.direction,
      arrow: document.querySelector('.combat-damage-direction').classList.contains('is-visible'),
      oldBarHidden: document.querySelector('.weapon-hud').hidden,
      repeatedTextWrites: window.__combatHudTextWrites,
      slotBounds: {top: bounds.top, bottom: bounds.bottom}};
  })()`);
  if (!result.memoryOnly || result.slots !== 4 || result.markers !== 3 ||
      result.visible < 1 || result.markerX < 0 || result.markerX > 1 ||
      !result.armor.includes(' / ') || result.bomb !== '5s' ||
      !result.hit || !result.arrow || result.damage !== 'right' ||
      !result.oldBarHidden || result.repeatedTextWrites !== 0)
    throw Error(`Combat HUD incomplete: ${JSON.stringify(result)}`);
  await context.screenshot(`combat-hud-${quality}-${mobile ? 'mobile' : 'desktop'}`);
  console.log(`${quality} ${width}x${height} combat HUD: ${JSON.stringify(result)}`);
}

export async function run(context) {
  try {
    for (const quality of ['high', 'performance']) {
      await pass(context, quality, 1280, 720, false);
      await pass(context, quality, 390, 844, true);
    }
    await context.navigate('/tools/menu-check.html');
    await context.waitFor("!!window.__qaApp && !document.querySelector('#start-engine')?.disabled",
      'ordinary combat menu', 60_000);
    const ordinary = await context.evaluate(`(() => {
      const app = window.__qaApp;
      app.startCampaign({mode: 'wasteland', startStage: 0, seed: 1989});
      app.stop();
      const state = app.duel.state;
      state.status = 'racing';
      state.countdown = 0;
      app.onFrame?.(state);
      return {legacy: !document.querySelector('.weapon-hud').hidden,
        upgraded: !document.querySelector('.combat-upgraded-hud').hidden};
    })()`);
    if (!ordinary.legacy || ordinary.upgraded)
      throw Error(`Flag-off combat HUD changed: ${JSON.stringify(ordinary)}`);
  } finally {
    await context.command('Emulation.clearDeviceMetricsOverride');
  }
}
