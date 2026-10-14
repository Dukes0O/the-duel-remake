// Private browser check for the helicopter (HELI-HOOKS, docs/HELICOPTER.md):
// from the main menu's HELIPAD button to Tremblant Woods, the free first
// tank, a lift-off and the four camera views. Saves are memory-only. Run:
//   node tools/browser-harness.mjs scenario heli-first-flight
const entry = '/tools/menu-check.html?flags=helicopter';

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled`,
  'menu ready', 90_000);
  const button = await context.evaluate(`(() => { const b = document.querySelector('#heli-visit'); return b && !b.hidden; })()`);
  if (!button) throw Error('The HELIPAD button is not shown with the helicopter switch on.');
  await context.evaluate(`(() => { window.__qaApp.audio.setMuted?.(true); document.querySelector('#heli-visit').click(); })()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli' && window.__qaApp.visualReady`, 'helipad scene', 120_000);
  const fuel = await context.evaluate(`window.__qaApp.heliBuyFuel().cost`);
  if (fuel !== 0) throw Error(`The first tank should be free, it cost ${fuel}`);
  await context.screenshot('heli-pad');
  await context.evaluate(`(() => { window.__qaApp.keys = {KeyW: true}; })()`);
  await context.waitFor(`(() => { const v = window.__qaApp.heliView(); return v.heli.y - v.heli.groundY > 12; })()`, 'lift-off to 12 m', 30_000);
  await context.evaluate(`(() => { window.__qaApp.keys = {}; })()`);
  const views = ['behind', 'cockpit', 'cable', 'side'];
  for (let index = 0; index < 4; index++) {
    await context.evaluate(`(() => { window.__qaApp.heliCamera = ${index}; })()`);
    await new Promise(resolve => setTimeout(resolve, 600));
    await context.screenshot(`heli-view-${views[index]}`);
  }
  const state = await context.evaluate(`(() => { const v = window.__qaApp.heliView(); return {phase: v.phase, height: v.heli.y - v.heli.groundY, fuel: v.heli.fuelKg, course: v.courseId}; })()`);
  if (state.phase !== 'flying' || state.course !== 'tremblant-woods' || !(state.height > 10)) throw Error(`Unexpected flight ${JSON.stringify(state)}`);
  await context.evaluate(`window.__qaApp.returnToMenu()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='menu' && window.__qaApp.heliSession===null`, 'back to the menu', 30_000);
  console.log(`Helicopter first flight: ${JSON.stringify(state)}`);
}
