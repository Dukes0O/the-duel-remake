const key = (context, type, code, keyName, virtual) => context.command(
  'Input.dispatchKeyEvent', {type, key: keyName, code,
    windowsVirtualKeyCode: virtual});

export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor(`!!window.__qaApp && !!window.__render &&
    document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready' &&
    !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`,
  'memory-only fighter gear scene', 60_000);
  await context.evaluate(`(() => {
    const app = window.__qaApp;
    if (!app.startCampaign({mode: 'wasteland', startStage: 0, seed: 1989}))
      throw Error('Wasteland race did not start');
    app.stop();
    const state = app.duel.state;
    Object.assign(state, {status: 'racing', countdown: 0, paused: false,
      s: 500, prevS: 500, lateral: 0, prevLateral: 0,
      speedMph: 0, traffic: []});
    state.rival.s = state.s + 55;
    state.rival.lateral = 3;
    state.combat.aiTimer = Infinity;
    state.combat.pickupTimer = Infinity;
    app.duel._rival = () => {};
    app.duel._traffic = () => {};
    app.onFrame?.(state);
    window.__render.renderFrame();
    document.querySelectorAll('details').forEach(panel => {
      const title = panel.querySelector('summary')?.textContent || '';
      if (title.includes('TEMPORARY SAVES') ||
          title.startsWith('Performance samples')) panel.hidden = true;
    });
  })()`);
  await context.waitFor('window.__qaApp.visualReady === true',
    'fighter renderer ready', 60_000);

  await key(context, 'keyDown', 'KeyF', 'f', 70);
  await context.evaluate('window.__qaApp.advance(.42)');
  await key(context, 'keyUp', 'KeyF', 'f', 70);
  const point = await context.evaluate(`(() => {
    const app = window.__qaApp, state = app.duel.state, fighter = state.fighter;
    if (!state.onFoot || state.footGear?.ammo !== 3)
      throw Error('Fighter did not exit with three rockets');
    const at = app.duel.course.groundAt(state.rival.s, state.rival.lateral);
    fighter.yaw = Math.atan2(at.x - fighter.x, at.z - fighter.z);
    fighter.pitch = Math.atan2(at.y + 1 - fighter.y - 1.62,
      Math.hypot(at.x - fighter.x, at.z - fighter.z));
    const rect = document.querySelector('#view3d canvas').getBoundingClientRect();
    return {x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2)};
  })()`);
  await context.command('Input.dispatchMouseEvent',
    {type: 'mousePressed', button: 'right', clickCount: 1,
      x: point.x, y: point.y});
  await context.waitFor(`document.pointerLockElement ===
    document.querySelector('#view3d canvas')`, 'fighter aim lock', 10_000);
  await context.evaluate('window.__qaApp.advance(.81)');
  await context.command('Input.dispatchMouseEvent',
    {type: 'mousePressed', button: 'left', clickCount: 1,
      x: point.x, y: point.y});
  const shot = await context.evaluate(`(() => {
    const app = window.__qaApp;
    app.advance(.16);
    app.onFrame?.(app.duel.state);
    window.__render.renderFrame();
    const state = app.duel.state;
    const rocket = state.combat.projectiles.find(item => item.kind === 'rpg');
    if (state.footGear?.ammo !== 2 || !rocket || rocket.targetIndex !== 0)
      throw Error('Aimed RPG shot did not launch from browser input');
    return {ammo: state.footGear.ammo, speed: Math.round(Math.hypot(
      rocket.vx, rocket.vy, rocket.vz)),
      visible: !!window.__render.scene.getObjectByName('combat-rpg-0')?.visible};
  })()`);
  if (!shot.visible) throw Error('Pooled RPG rocket is not visible');
  await context.screenshot('onfoot-rpg-flight');
  await context.command('Input.dispatchMouseEvent',
    {type: 'mouseReleased', button: 'left', clickCount: 1,
      x: point.x, y: point.y});
  await context.command('Input.dispatchMouseEvent',
    {type: 'mouseReleased', button: 'right', clickCount: 1,
      x: point.x, y: point.y});

  await key(context, 'keyDown', 'Digit2', '2', 50);
  await key(context, 'keyUp', 'Digit2', '2', 50);
  await context.evaluate(`(() => {
    const state = window.__qaApp.duel.state;
    if (state.footGear?.name !== 'WRENCH') throw Error('Digit2 did not choose wrench');
    state.armor = 40;
    state.footWeapons.lastArmor = 40;
  })()`);
  await context.command('Input.dispatchMouseEvent',
    {type: 'mousePressed', button: 'left', clickCount: 1,
      x: point.x, y: point.y});
  const repaired = await context.evaluate(`(() => {
    const app = window.__qaApp;
    app.advance(4.02);
    app.onFrame?.(app.duel.state);
    window.__render.renderFrame();
    const state = app.duel.state;
    const label = document.querySelector('.combat-foot-gear')?.textContent || '';
    if (Math.abs(state.armor - 80) > .01 || !label.includes('REPAIR +40'))
      throw Error('Wrench interaction: ' + JSON.stringify({
        armor: state.armor, label, blocked: state.footWeapons.repairBlockedUntilRelease,
        onFoot: state.onFoot, health: state.fighter?.health}));
    return {armor: Math.round(state.armor), time: state.stageTimeSec.toFixed(2)};
  })()`);
  await context.screenshot('onfoot-wrench-repaired');
  console.log(`Private fighter gear: RPG ${shot.ammo} ammo at ${shot.speed} m/s; wrench restored to ${repaired.armor} armor while the race clock reached ${repaired.time}s.`);
}
