// Actual production App, menus, Duel and renderer; all storage is tab-local.
// Earned career balances and parked contact poses below are explicit QA fixtures.
const DT = 1 / 120;
async function ready(context, query = '') {
  await context.navigate('/tools/menu-check.html' + query);
  await context.waitFor(`!!window.__qaApp && !!window.__render &&
    document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready' &&
    !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`,
  'memory-only Arsenal production page', 60_000);
  await context.evaluate(`document.querySelectorAll('details').forEach(panel => {
    const title = panel.querySelector('summary')?.textContent || '';
    if (title.includes('TEMPORARY SAVES') || title.startsWith('Performance samples')) panel.hidden = true;
  })`);
}
async function career(context) {
  return context.evaluate(`(() => {
    const app = window.__qaApp;
    app.addPlayer('Arsenal QA Owner');
    app.profile = {...app.profile, wasteland: {...app.profile.wasteland,
      discoveredGate: true, xp: 3500, scrap: 3000}};
    if (!app._saveProfile()) throw Error('Synthetic earned career did not save');
    return app.player.id;
  })()`);
}
async function start(context) {
  await context.evaluate(`(() => {
    const app = window.__qaApp;
    if (app.duel.state.status !== 'menu') app.returnToMenu();
    if (!app.startCampaign({mode: 'wasteland', startStage: 0,
      opponentCount: 2, seed: 1989, cpuDifficulty: 'easy'})) throw Error('Arsenal race did not start');
    app.stop();
    const state = app.duel.state;
    Object.assign(state, {status: 'racing', countdown: 0, paused: false,
      invulnerableSec: 0, traffic: []});
    state.combat.aiTimer = state.combat.pickupTimer = Infinity;
    // Fixtures only reposition real cars; no simulation method is substituted.
    window.__arsenalPlace = (actor, s, lateral = 0, speedMph = 0) => Object.assign(actor, {
      s, prevS: s, lateral, prevLateral: lateral, speedMph,
      headingError: 0, yawVelocity: 0, pushVelocity: 0, impactTimer: 0,
      airHeight: 0, prevAirHeight: 0, combatShield: 0});
    window.__arsenalPlace(state, 504);
    state.opponents.forEach((actor, i) => window.__arsenalPlace(actor, 600 + i * 80));
    const at = app.duel.course.groundAt(500, 0);
    app.inspectionCamera = {position: [at.x + 12, at.y + 10, at.z + 15],
      target: [at.x, at.y + 1, at.z]};
    window.__arsenalPaint = () => {
      const before = JSON.stringify(state);
      app.onFrame?.(state); window.__render.renderFrame();
      if (JSON.stringify(state) !== before) throw Error('Production presentation mutated race state');
    };
    window.__arsenalPaint();
  })()`);
}
export async function run(context) {
  await ready(context);
  await career(context);
  const disabled = await context.evaluate(`(() => {
    const app = window.__qaApp;
    if (app.purchaseArsenalWeapon('oil').ok) throw Error('Dev-disabled Arsenal purchase succeeded');
    document.querySelector('#armory-open').click();
    if (document.querySelector('[data-arsenal-purchase]')) throw Error('Dev-disabled offers leaked into Armory');
    return [...document.querySelectorAll('[data-loadout-slot]')].map(select => select.value);
  })()`);
  if (disabled.join(',') !== 'ufo,bomb,crossbow,star') throw Error('Four starter slots changed');
  for (const quality of ['high', 'performance']) {
    await ready(context, '?flags=arsenal');
    await context.evaluate(`(() => {
      const select = document.querySelector('#graphics-quality');
      select.value = '${quality}'; select.dispatchEvent(new Event('change', {bubbles: true}));
      const app = window.__qaApp;
      app.addPlayer('Arsenal QA Rank One');
      app.profile = {...app.profile, wasteland: {...app.profile.wasteland, discoveredGate: true, scrap: 3000}};
      app._saveProfile();
      if (app.purchaseArsenalWeapon('oil').ok) throw Error('Rank one bought rank-two Oil');
      app.profile = {...app.profile, wasteland: {...app.profile.wasteland, xp: 400}};
      app._saveProfile();
      if (app.profile.wasteland.rank !== 2 || app.purchaseArsenalWeapon('smoke').ok)
        throw Error('Rank two bought rank-six Smoke');
      app.addPlayer('Arsenal QA Unseen');
      app.profile = {...app.profile, wasteland: {...app.profile.wasteland, xp: 3500, scrap: 3000}};
      app._saveProfile();
      if (app.purchaseArsenalWeapon('oil').ok) throw Error('Undiscovered career bought Oil');
    })()`);
    const ownerId = await career(context);
    await context.evaluate(`(() => {
      const app = window.__qaApp;
      if (app.profile.wasteland.rank !== 6) throw Error('Earned rank fixture was not normalized');
      document.querySelector('#armory-open').click();
      for (const id of ['oil', 'smoke']) {
        const button = document.querySelector('[data-arsenal-purchase="' + id + '"]');
        if (!button || !button.textContent.includes('400 SCRAP')) throw Error('Rank-six offer missing: ' + id);
        button.click();
        if (!app.profile.wasteland.weapons.unlocked.includes(id)) throw Error('Actual Armory purchase did not grant ' + id);
      }
      if (app.profile.wasteland.scrap !== 2200) throw Error('Actual purchases did not charge 400 scrap each');
      for (const [slot, id] of [[0, 'oil'], [1, 'smoke']]) {
        const select = document.querySelector('[data-loadout-slot="' + slot + '"]');
        select.value = id; select.dispatchEvent(new Event('change', {bubbles: true}));
      }
      if (app.profile.wasteland.loadout.slice(0, 2).join(',') !== 'oil,smoke') throw Error('Actual slot selection failed');
    })()`);
    await context.screenshot('arsenal-armory-' + quality);
    await context.evaluate(`(() => {
      const app = window.__qaApp;
      document.querySelector('[data-action="armory-close"]').click();
      app.addPlayer('Arsenal QA Other');
      if (app.profile.wasteland.weapons.unlocked.some(id => ['oil', 'smoke'].includes(id)))
        throw Error('Purchased weapons crossed named owners');
      if (!app.selectPlayer(${JSON.stringify(ownerId)})) throw Error('Owner selection failed');
    })()`);
    await start(context);
    const oil = await context.evaluate(`(() => {
      const duel = window.__qaApp.duel, state = duel.state;
      if (!duel.fireWeapon('oil') || duel.fireWeapon('oil')) throw Error('Oil launch or immediate recharge failed');
      duel.step(${DT});
      if (Math.abs(state.yawVelocity) > .001) throw Error('Oil ignored owner grace');
      window.__arsenalPlace(state, 520);
      window.__arsenalPlace(state.rival, 500, .1, 60);
      duel.step(${DT});
      if (Math.abs(state.rival.yawVelocity) < 1 || state.rival.speedMph > 55)
        throw Error('Actual Oil body contact did not spin and slow the target');
      window.__arsenalPaint();
      const holder = window.__render.scene.getObjectByName('arsenal-hazard-0');
      if (!holder?.visible || !holder.children[0]?.visible) throw Error('Oil sheen did not render');
      return {spin: state.rival.yawVelocity, speedMph: state.rival.speedMph,
        cooldown: state.combat.cooldowns.oil};
    })()`);
    await context.screenshot('arsenal-oil-contact-' + quality);
    // A new real race clears prior contacts. Shield is a declared contact fixture.
    await start(context);
    await context.evaluate(`(() => {
      const duel = window.__qaApp.duel, state = duel.state;
      if (!duel.fireWeapon('oil')) throw Error('Shield control Oil launch failed');
      window.__arsenalPlace(state, 520);
      window.__arsenalPlace(state.rival, 500, .1, 60);
      state.combat.rivalShield = 5;
      duel.step(${DT});
      if (Math.abs(state.rival.yawVelocity) > .001 || state.rival.speedMph < 55)
        throw Error('Actual shield did not counter Oil');
    })()`);
    await start(context);
    const smoke = await context.evaluate(`(() => {
      const duel = window.__qaApp.duel, state = duel.state;
      window.__arsenalPlace(state, 500); window.__arsenalPlace(state.rival, 530);
      if (!duel.fireWeapon('crossbow') || state.combat.projectiles.at(-1)?.targetId == null)
        throw Error('Clear sightline did not acquire the real rival');
      state.combat.projectiles = []; state.combat.cooldowns.crossbow = 0;
      if (!duel.fireWeapon('smoke') || duel.fireWeapon('smoke')) throw Error('Smoke launch or immediate recharge failed');
      if (!duel.fireWeapon('crossbow') || state.combat.projectiles.at(-1)?.targetId != null)
        throw Error('Smoke did not remove guided targeting while retaining straight fire');
      state.combat.projectiles = [];
      window.__arsenalPaint();
      const holder = window.__render.scene.getObjectByName('arsenal-hazard-0');
      if (!holder?.visible || !holder.children[1]?.visible) throw Error('Real Smoke plume did not render');
      return {cooldown: state.combat.cooldowns.smoke, straightShot: true};
    })()`);
    await context.screenshot('arsenal-smoke-occlusion-' + quality);
    await context.command('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true});
    await context.evaluate('window.__arsenalPaint()');
    await context.screenshot('arsenal-smoke-phone-' + quality);
    await context.command('Emulation.clearDeviceMetricsOverride', {});
    await context.evaluate(`(() => {
      const duel = window.__qaApp.duel, state = duel.state;
      for (let i = 0; i < 620; i++) duel.step(${DT});
      window.__arsenalPlace(state, 500); window.__arsenalPlace(state.rival, 530);
      state.combat.cooldowns.crossbow = 0; state.combat.projectiles = [];
      if (!duel.fireWeapon('crossbow') || state.combat.projectiles.at(-1)?.targetId == null)
        throw Error('Guided targeting did not recover after actual Smoke expiry');
      window.__arsenalPaint();
      if (window.__render.scene.getObjectByName('arsenal-hazard-0')?.visible)
        throw Error('Expired Smoke remained visible');
    })()`);
    console.log('Arsenal ' + quality + ': actual purchases, owner isolation, Oil contact/shield/grace, Smoke occlusion/recovery and render purity passed. ' + JSON.stringify({oil, smoke}));
  }
}
