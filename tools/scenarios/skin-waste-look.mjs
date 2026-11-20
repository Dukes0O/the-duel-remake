// SKIN-WASTE round 2: the eight drawn Wasteland finishes on the Titan, the Dusthawk Rally and the Jesko, in the
// real menu showroom and its garage light, from the front three-quarter and the side. One picture each, plus each
// car's factory paint for comparison, for Claude's comparison sheet. Memory-only saves: the single-profile fixture
// with the three cars, an opened Wasteland gate and the finishes owned. No frame timing. Run:
//   node tools/browser-harness.mjs scenario skin-waste-look
import {readFileSync} from 'node:fs';

const entry = '/tools/menu-check.html?flags=wasteland-town';
const fixture = JSON.parse(readFileSync(new URL('../fixtures/saves/01-single-profile.json', import.meta.url), 'utf8'));
const CARS = ['titan_monster', 'dusthawk_rally', 'koenigsegg_jesko'];
const FINISHES = ['rust-patina', 'salt-bleach', 'desert-sand', 'boneyard-silver', 'scrap-patchwork', 'bowl-flame', 'soot-black', 'hazard-stripe'];
const ready = `document.readyState==='complete' && !!window.__qaApp && !!window.__render &&
  document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled &&
  !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`;
const frames = `new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))))`;

// Owned and selected for one car. The menu reads the paint from the profile on every frame.
const wear = (car, id) => `(() => { const app = window.__qaApp;
  app.profile = {...app.profile, cosmetics: {...(app.profile.cosmetics || {}), ${JSON.stringify(car)}:
    {owned: ['factory', ...${JSON.stringify(FINISHES)}], selected: ${JSON.stringify(id)}}}};
  return app.getPaintPreset(${JSON.stringify(car)}, {menu: true})?.id ?? 'factory'; })()`;

// Stop the menu loop on its next frame, pose the camera around the showroom car in its own space, and draw once.
// The frame already queued still runs once after the swap, so the caller waits before posing.
const pause = `new Promise(resolve => { if (!window.__skinPaused) { window.__skinPaused = true; window.__skinFrame = null;
  window.__skinRaf = window.requestAnimationFrame; window.requestAnimationFrame = callback => { window.__skinFrame = callback; return 0; }; }
  setTimeout(resolve, 250); })`;
const pose = (car, view) => `(() => {
  const r = window.__render, V = r.camera.position.constructor;
  if (!window.__skinPaused) throw Error('Pause the menu loop before posing.');
  const found = []; r.scene.traverse(node => { if (node.userData?.vehicleKey === ${JSON.stringify(car)} && node.visible) found.push(node); });
  if (found.length !== 1) throw Error('Expected one visible ${car}, found ' + found.length);
  const vehicle = found[0], size = vehicle.userData.size; vehicle.updateMatrixWorld(true);
  const reach = Math.max(size.length, size.height * 1.35) * 1.55, aim = new V(0, size.height * .46, 0);
  const offset = ${JSON.stringify(view)} === 'front' ? new V(reach * .62, size.height * .62 + reach * .2, reach * .78) : new V(reach * 1.18, size.height * .5, 0);
  r.camera.position.copy(vehicle.localToWorld(offset)); r.camera.lookAt(vehicle.localToWorld(aim.clone()));
  r.camera.fov = 32; r.camera.updateProjectionMatrix();
  const canvas = r.renderer.domElement;
  for (const node of document.querySelectorAll('body *')) if (node !== canvas && !node.contains(canvas)) node.style.visibility = 'hidden';
  r.composer.render();
  return document.querySelector('#view3d').dataset.paint; })()`;
const resume = `(() => { if (!window.__skinPaused) return; window.__skinPaused = false; window.requestAnimationFrame = window.__skinRaf;
  if (window.__skinFrame) window.requestAnimationFrame(window.__skinFrame); })()`;

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await context.navigate(entry);
  await context.waitFor(ready, 'memory-only menu ready', 90_000);
  await context.evaluate(`(() => { for (const [key, value] of Object.entries(${JSON.stringify(fixture.storage)}))
    localStorage.setItem(key, JSON.stringify(value)); })()`);
  await context.navigate(entry);
  await context.waitFor(ready, 'menu with the fixture save', 90_000);
  const owned = await context.evaluate(`(() => { const app = window.__qaApp; app.audio.setMuted?.(true);
    app.profile = {...app.profile, unlockedCars: [...new Set([...(app.profile.unlockedCars || []), ...${JSON.stringify(CARS)}])],
      wasteland: {...app.profile.wasteland, version: 1, discoveredGate: true}};
    app._saveProfile(); return {cars: app.profile.unlockedCars, gate: app.profile.wasteland.discoveredGate}; })()`);
  if (!CARS.every(car => owned.cars.includes(car)) || owned.gate !== true) throw Error(`The save did not take the three cars and the gate: ${JSON.stringify(owned)}`);
  await context.navigate(entry);
  await context.waitFor(ready, 'menu with the three cars', 90_000);

  const shots = [];
  for (const car of CARS) {
    await context.evaluate(resume);
    await context.evaluate(`(() => { const select = document.querySelector('#car-select'); select.value = ${JSON.stringify(car)};
      select.dispatchEvent(new Event('change', {bubbles: true})); })()`);
    await context.waitFor(`document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready' &&
      (() => { let n = 0; window.__render.scene.traverse(o => { if (o.userData?.vehicleKey === ${JSON.stringify(car)} && o.visible) n++; }); return n === 1; })()`,
      `${car} in the showroom`, 60_000);
    for (const id of ['factory', ...FINISHES]) {
      await context.evaluate(resume);
      const chosen = await context.evaluate(wear(car, id));
      if (chosen !== id) throw Error(`${car}: the menu paint is ${chosen}, not ${id}. Is wasteland-town on?`);
      await context.command('Runtime.evaluate', {expression: frames, awaitPromise: true});
      await context.command('Runtime.evaluate', {expression: pause, awaitPromise: true});
      for (const view of ['front', 'side']) {
        const drawn = await context.evaluate(pose(car, view));
        if (drawn !== id) throw Error(`${car}: the showroom drew ${drawn}, not ${id}.`);
        const name = `${car.replaceAll("_", "-")}-${id}-${view}`;
        await context.screenshot(name);
        shots.push(name);
      }
    }
  }
  await context.evaluate(resume);
  return {shots: shots.length};
}
