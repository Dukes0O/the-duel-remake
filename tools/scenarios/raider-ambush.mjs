export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor(`!!window.__qaApp && !!window.__render &&
    document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready' &&
    !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`,
  'memory-only ambush scene', 60_000);
  await context.evaluate(`(() => {
    const app = window.__qaApp;
    if (!app.startCampaign({mode: 'wasteland', startStage: 0, seed: 1989}))
      throw Error('Wasteland race did not start');
    app.stop();
    const duel = app.duel, state = duel.state, zone = state.raids?.zones[0];
    if (!zone || zone.raiders.length !== 3) throw Error('Raiders missing');
    Object.assign(state, {status: 'racing', countdown: 0, paused: false,
      s: zone.s - 110, prevS: zone.s - 110, lateral: 0, prevLateral: 0,
      speedMph: 0, traffic: []});
    state.combat.aiTimer = Infinity;
    state.combat.pickupTimer = Infinity;
    const at = duel.course.groundAt(zone.s, 0);
    app.inspectionCamera = {position: [at.x + 35, at.y + 25, at.z + 35],
      target: [at.x, at.y + 2, at.z]};
    document.querySelectorAll('details').forEach(panel => {
      const title = panel.querySelector('summary')?.textContent || '';
      if (title.includes('TEMPORARY SAVES') ||
          title.startsWith('Performance samples')) panel.hidden = true;
    });
    app.onFrame?.(state);
    window.__render.renderFrame();
  })()`);
  await context.waitFor('window.__qaApp.visualReady === true',
    'ambush renderer ready', 60_000);
  const scene = await context.evaluate(`(() => {
    const app = window.__qaApp, state = app.duel.state;
    app.onFrame?.(state);
    window.__render.renderFrame();
    const warnings = window.__render.scene.getObjectByName('raid-warning-1');
    const figures = window.__render.scene.getObjectByName('fighter-plates');
    if (!warnings?.visible || warnings.count !== 3 ||
        !figures?.visible || figures.count < 108)
      throw Error('Pooled raider and warning visuals are not visible: ' +
        JSON.stringify({warningVisible: warnings?.visible, warningCount: warnings?.count,
          figuresVisible: figures?.visible, figureCount: figures?.count}));
    return {zones: state.raids.zones.length, raiders: state.raids.zones
      .reduce((total, item) => total + item.raiders.length, 0),
      warningDraws: warnings.count, figureInstances: figures.count};
  })()`);
  await context.screenshot('raider-camp');
  await context.evaluate(`(() => {
    const app = window.__qaApp, duel = app.duel;
    const zone = duel.state.raids.zones[0];
    const road = duel.course.groundAt(zone.s - 146, 0);
    const warning = zone.warning;
    app.inspectionCamera = {position: [road.x, road.y + 4, road.z],
      target: [warning.x, warning.y + 2.9, warning.z]};
    window.__render.renderFrame();
  })()`);
  await context.screenshot('raider-warning');
  console.log(`Private ambush scene: ${scene.zones} zones, ${scene.raiders} raiders, ` +
    `${scene.warningDraws} warning instances and ${scene.figureInstances} figure parts.`);
}
