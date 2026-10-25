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
  // An Enzo owner on a course the Enzo has not been flown to: START is
  // closed and the note says why (special cars travel only by air).
  await context.evaluate(`(() => { const app = window.__qaApp;
    app.profile = {...app.profile, unlockedCars: [...new Set([...app.profile.unlockedCars, 'ferrari_enzo'])]};
    app._saveProfile(); app.menuCar = 'ferrari_enzo'; })()`);
  await context.waitFor(`document.querySelector('.start-note')?.textContent.includes('travels only by air') && document.querySelector('#start-engine').disabled`,
    'the air-only note on the menu', 30_000);
  await context.screenshot('menu-air-only-note');
  await context.evaluate(`(() => { const app = window.__qaApp;
    app.profile = {...app.profile, unlockedCars: [...new Set([...app.profile.unlockedCars, 'koenigsegg_jesko'])]};
    app._saveProfile(); app.menuCar = 'koenigsegg_jesko'; })()`);
  await context.waitFor(`!document.querySelector('.start-note')?.textContent.includes('travels only by air') && !document.querySelector('#start-engine').disabled`,
    'the note goes with another car', 60_000);
  const button = await context.evaluate(`(() => { const b = document.querySelector('#heli-visit'); return b && !b.hidden; })()`);
  if (!button) throw Error('The HELIPAD button is not shown with the helicopter switch on.');
  await context.evaluate(`(() => { window.__qaApp.audio.setMuted?.(true); document.querySelector('#heli-visit').click(); })()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli' && window.__qaApp.visualReady`, 'helipad scene', 120_000);
  const fuel = await context.evaluate(`window.__qaApp.heliBuyFuel().cost`);
  if (fuel !== 0) throw Error(`The first tank should be free, it cost ${fuel}`);
  await context.screenshot('heli-pad');
  // A new pilot: the instructor's board, then lesson 1 from its button.
  const instructor = await context.evaluate(`(() => { const panel = document.querySelector('.heli-lessons');
    return !!panel && panel.textContent.includes('INSTRUCTOR') && !!document.querySelector('[data-heli-lesson="skip"]'); })()`);
  if (!instructor) throw Error('The instructor board with the skip button should show for a new pilot on the pad.');
  await context.evaluate(`document.querySelector('[data-heli-lesson="start:liftoff"]').click()`);
  await context.waitFor(`window.__qaApp.heliView().lesson?.id === 'liftoff'`, 'lesson 1 running', 10_000);
  await context.evaluate(`(() => { window.__qaApp.keys = {KeyW: true}; })()`);
  await context.waitFor(`(() => { const v = window.__qaApp.heliView(); return v.heli.y - v.heli.groundY > 12; })()`, 'lift-off to 12 m', 30_000);
  await context.evaluate(`(() => { window.__qaApp.keys = {}; })()`);
  await new Promise(resolve => setTimeout(resolve, 600));
  await context.screenshot('heli-lesson');
  const views = ['behind', 'cockpit', 'cable', 'side'];
  for (let index = 0; index < 4; index++) {
    await context.evaluate(`(() => { window.__qaApp.heliCamera = ${index}; })()`);
    await new Promise(resolve => setTimeout(resolve, 600));
    await context.screenshot(`heli-view-${views[index]}`);
  }
  const state = await context.evaluate(`(() => { const v = window.__qaApp.heliView(); return {phase: v.phase, height: v.heli.y - v.heli.groundY, fuel: v.heli.fuelKg, course: v.courseId}; })()`);
  if (state.phase !== 'flying' || state.course !== 'tremblant-woods' || !(state.height > 10)) throw Error(`Unexpected flight ${JSON.stringify(state)}`);
  // The pause screen: back to flying or the menu, no restart.
  await context.evaluate(`window.__qaApp._inputAction('pause')`);
  await new Promise(resolve => setTimeout(resolve, 400));
  const pause = await context.evaluate(`document.body.innerText.includes('BACK TO FLYING') && !document.body.innerText.includes('RESTART RUN')`);
  await context.screenshot('heli-pause');
  if (!pause) throw Error('The helicopter pause screen should offer BACK TO FLYING and no RESTART RUN.');
  await context.evaluate(`window.__qaApp._inputAction('pause')`);
  if (process.env.HELI_FROM_ABOVE !== '0') {
    // Each destination from 150 m: climb at home, then cruise to the others.
    await context.evaluate(`(() => { window.__qaApp.heliCamera = 0; window.__qaApp.keys = {KeyW: true}; })()`);
    await context.waitFor(`(() => { const v = window.__qaApp.heliView(); return v.heli.y - v.zone.y > 150; })()`, 'climb to 150 m', 90_000);
    await context.evaluate(`(() => { window.__qaApp.keys = {}; })()`);
    await new Promise(resolve => setTimeout(resolve, 800));
    await context.screenshot('heli-above-tremblant-woods');
    for (const place of ['tremblant-snow', 'panorama-ridge']) {
      await context.evaluate(`(() => { const app = window.__qaApp; app.heliSetDestination(${JSON.stringify(place)});
        if (!app.heliSession.autopilotOn) app._inputAction('heli-autopilot'); })()`);
      await context.waitFor(`window.__qaApp.heliSession.cruiseOffered`, `out of the area toward ${place}`, 240_000);
      await context.evaluate(`window.__qaApp._inputAction('heli-cruise')`);
      await context.waitFor(`window.__qaApp.heliView().courseId === ${JSON.stringify(place)} && window.__qaApp.visualReady`, `arrive at ${place}`, 120_000);
      await new Promise(resolve => setTimeout(resolve, 1200));
      await context.screenshot(`heli-above-${place}`);
    }
  }
  await context.evaluate(`window.__qaApp.returnToMenu()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='menu' && window.__qaApp.heliSession===null`, 'back to the menu', 30_000);
  console.log(`Helicopter first flight: ${JSON.stringify(state)}`);
}
