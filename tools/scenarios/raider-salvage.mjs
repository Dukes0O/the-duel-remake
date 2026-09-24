export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor(`!!window.__qaApp && !!window.__render &&
    document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready' &&
    !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`,
  'memory-only salvage scene', 60_000);
  await context.evaluate(`(() => {
    const app = window.__qaApp;
    if (!app.startCampaign({mode: 'wasteland', startStage: 0, seed: 1989}))
      throw Error('Wasteland race did not start');
    app.stop();
    const duel = app.duel, state = duel.state;
    const crate = state.raids?.zones[0]?.salvage;
    if (!crate) throw Error('Ledge salvage missing');
    Object.assign(state, {status: 'racing', countdown: 0, paused: false,
      s: crate.s - 15, prevS: crate.s - 15, speedMph: 0, traffic: []});
    state.combat.aiTimer = Infinity;
    state.combat.pickupTimer = Infinity;
    const road = duel.course.groundAt(crate.s, 0);
    app.inspectionCamera = {position: [road.x + 14, road.y + 7, road.z + 12],
      target: [crate.x, crate.y + 1, crate.z]};
    app.onFrame?.(state);
    window.__render.renderFrame();
  })()`);
  await context.waitFor('window.__qaApp.visualReady === true',
    'salvage renderer ready', 60_000);
  const visible = await context.evaluate(`(() => {
    window.__render.renderFrame();
    const mesh = window.__render.scene.getObjectByName('ledge-salvage-1');
    if (!mesh?.visible || mesh.count !== 3)
      throw Error('Pooled salvage crates are not visible');
    return mesh.count;
  })()`);
  await context.screenshot('ledge-salvage');
  console.log(`Private salvage scene: ${visible} pooled crates visible.`);
}
